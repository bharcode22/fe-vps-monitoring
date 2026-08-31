import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Activity, Server, Radio, Cpu } from 'lucide-react';
import io from 'socket.io-client';
import { SOCKET_URL } from '../../config';
import PodActivityTopicCards from './PodActivityTopicCards';

export default function PodActivityDetailPage({ pod, onBack }) {
  const [mqttActivityFeed, setMqttActivityFeed] = useState([]);
  const [mqttStatus, setMqttStatus] = useState({ connected: false });
  const socketRef = useRef(null);
  const detectedPrefixRef = useRef(null);

  useEffect(() => {
    if (!pod?.id) return;

    const token = localStorage.getItem('vps_monitoring_token');
    const socket = io(SOCKET_URL, {
      transports: ['websocket', 'polling']
    });
    socketRef.current = socket;

    socket.on('connect', () => {
      // Start sniffing on this POD's MQTT broker
      socket.emit('mqtt:start-sniff', {
        token,
        serverId: pod.id,
        brokerHost: pod.host,
        brokerUrl: `tcp://${pod.host}:1883`
      });
    });

    socket.on('mqtt:status', (status) => {
      setMqttStatus(status);
    });

    socket.on('mqtt:packet', (packet) => {
      if (packet.topic) {
        const match = packet.topic.match(/^(pod\/[^/]+\/2\.0\/)/);
        if (match) {
          detectedPrefixRef.current = match[1];
        }
      }

      console.log('Received MQTT Packet:', packet.topic, packet.payload);

      // Format the packet to match what PodActivityTopicCards expects:
      // { topic: string, payload: string, timestamp: number, serverId: number, serverName: string }
      setMqttActivityFeed((prev) => {
        const newLog = {
          topic: packet.topic,
          payload: packet.payload,
          timestamp: packet.timestamp || Date.now(),
          serverId: pod.id,
          serverName: pod.name
        };
        return [newLog, ...prev].slice(0, 500); // Keep last 500 logs
      });
    });

    socket.on('mqtt:inject-success', (res) => {
      console.log('Successfully injected packet:', res);
    });

    socket.on('mqtt:inject-error', (err) => {
      console.error('Failed to inject packet:', err);
    });

    return () => {
      socket.emit('mqtt:stop-sniff');
      socket.disconnect();
    };
  }, [pod]);

  if (!pod) return null;

  return (
    <div className="flex flex-col h-full space-y-4">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900/60 p-4 rounded-2xl border border-slate-800 backdrop-blur-md">
        <div className="flex items-center gap-4">
          <button
            onClick={onBack}
            className="p-2 hover:bg-slate-800 rounded-xl transition-colors text-slate-400 hover:text-white"
            title="Kembali ke Dashboard Activity"
          >
            <ArrowLeft size={20} />
          </button>
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-fuchsia-500/20 text-fuchsia-400 rounded-xl border border-fuchsia-500/30">
              <Activity size={24} />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white flex items-center gap-2">
                Topik MQTT & Live Sniffer: {pod.name}
              </h1>
              <p className="text-sm text-slate-400 flex items-center gap-1.5 mt-0.5">
                <Server size={14} />
                Host: <span className="font-mono text-slate-300">{pod.host}:1883</span>
                <span className="mx-2">•</span>
                Status:
                <span className={`ml-1 font-bold ${mqttStatus.connected ? 'text-green-400' : 'text-rose-400'}`}>
                  {mqttStatus.connected ? 'Connected' : 'Disconnected'}
                </span>
              </p>
            </div>
          </div>
        </div>
        </div>

      {/* Main Content: MQTT Cards */}
      <PodActivityTopicCards
        show={true}
        feed={mqttActivityFeed}
        pods={[pod]}
      />
    </div>
  );
}
