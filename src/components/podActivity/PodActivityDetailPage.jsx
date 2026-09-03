import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Activity, Server, Radio, Cpu, Clock, ShieldAlert } from 'lucide-react';
import io from 'socket.io-client';
import { SOCKET_URL } from '../../config';
import PodActivityTopicCards from './PodActivityTopicCards';
import PodHeartbeatDetailTab from './PodHeartbeatDetailTab';
import { fetchHeartbeatThresholdsApi } from '../../api/podActivityApi';
import {
  DEFAULT_HB_THRESHOLDS,
  getStoredHbThresholds,
  setStoredHbThresholds,
  EVENT_HB_THRESHOLDS_UPDATED,
  evaluateModuleHealth
} from '../../utils/heartbeatThresholds';

function parseOccupancy(payload) {
  if (payload === null || payload === undefined) return null;
  const str = String(payload).trim();
  if (str === '1' || str.toLowerCase() === 'true' || str.toLowerCase() === 'occupied' || str.toLowerCase() === 'active' || str.toLowerCase() === 'on' || str.toLowerCase() === 'pob') return 1;
  if (str === '0' || str.toLowerCase() === 'false' || str.toLowerCase() === 'vacant' || str.toLowerCase() === 'empty' || str.toLowerCase() === 'off') return 0;
  try {
    const json = typeof payload === 'object' ? payload : JSON.parse(str);
    if (json.pob_state !== undefined) return parseOccupancy(json.pob_state);
    if (json.pod_state !== undefined) return parseOccupancy(json.pod_state);
    if (json.pob !== undefined) return parseOccupancy(json.pob);
    if (json.state !== undefined) return parseOccupancy(json.state);
    if (json.value !== undefined) return parseOccupancy(json.value);
    if (json.status !== undefined) return parseOccupancy(json.status);
    if (json.occupied !== undefined) return parseOccupancy(json.occupied);
  } catch (_) { }
  const num = Number(str);
  if (!isNaN(num)) return num >= 1 ? 1 : 0;
  return null;
}

export default function PodActivityDetailPage({ pod, onBack }) {
  const [activeTab, setActiveTab] = useState(() => {
    try {
      const saved = localStorage.getItem('vps_pod_detail_active_tab');
      if (saved && ['activity', 'heartbeat'].includes(saved)) return saved;
    } catch (e) { }
    return 'heartbeat';
  });

  useEffect(() => {
    try {
      localStorage.setItem('vps_pod_detail_active_tab', activeTab);
    } catch (e) { }
  }, [activeTab]);

  // Load Heartbeat Thresholds dynamically from backend JSON
  const [thresholds, setThresholds] = useState(getStoredHbThresholds);

  useEffect(() => {
    loadThresholds();

    const handleThresholdsUpdated = (e) => {
      if (e.detail) setThresholds(e.detail);
    };
    window.addEventListener(EVENT_HB_THRESHOLDS_UPDATED, handleThresholdsUpdated);
    return () => window.removeEventListener(EVENT_HB_THRESHOLDS_UPDATED, handleThresholdsUpdated);
  }, []);

  const loadThresholds = async () => {
    try {
      const data = await fetchHeartbeatThresholdsApi();
      if (data && typeof data === 'object') {
        setThresholds(data);
        setStoredHbThresholds(data);
      }
    } catch (err) {
      console.warn('Gagal memuat ambang batas heartbeat:', err.message);
    }
  };

  const [mqttActivityFeed, setMqttActivityFeed] = useState([]);
  const [mqttStatus, setMqttStatus] = useState({ connected: false });
  const [occupancyState, setOccupancyState] = useState(pod?.stateValue ?? null);
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
        const match = packet.topic.match(/^(pod\/[^/]+\/(?:2\.0\/)?)/);
        if (match) {
          detectedPrefixRef.current = match[1];
        }

        // Track occupancy specifically from mod_chair/pob_state
        if (packet.topic.includes('pob_state')) {
          const occ = parseOccupancy(packet.payload);
          if (occ !== null) setOccupancyState(occ);
        }
      }

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

    // Listen to background pod activity state change events
    socket.on('pod-activity:state-changed', (eventPayload) => {
      const { pod: updatedPod } = eventPayload || {};
      if (updatedPod && updatedPod.id === pod.id) {
        if (updatedPod.stateValue !== undefined && updatedPod.stateValue !== null) {
          setOccupancyState(updatedPod.stateValue);
        }
        if (updatedPod.lastTopic && updatedPod.lastPayload !== undefined) {
          setMqttActivityFeed((prev) => {
            const newLog = {
              topic: updatedPod.lastTopic,
              payload: updatedPod.lastPayload,
              timestamp: Date.now(),
              serverId: pod.id,
              serverName: pod.name
            };
            return [newLog, ...prev].slice(0, 500);
          });
        }
      }
    });

    // Listen to raw background MQTT log events for this pod
    socket.on('pod-activity:mqtt-log', (logEntry) => {
      if (logEntry && logEntry.serverId === pod.id) {
        if (logEntry.topic && logEntry.topic.includes('pob_state')) {
          const occ = parseOccupancy(logEntry.payload);
          if (occ !== null) setOccupancyState(occ);
        }
        setMqttActivityFeed((prev) => {
          const newLog = {
            topic: logEntry.topic,
            payload: logEntry.payload,
            timestamp: logEntry.timestamp ? new Date(logEntry.timestamp).getTime() : Date.now(),
            serverId: pod.id,
            serverName: pod.name
          };
          return [newLog, ...prev].slice(0, 500);
        });
      }
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

  const handlePublish = (subTopic, payload) => {
    if (!socketRef.current || !pod?.id) return;
    const token = localStorage.getItem('vps_monitoring_token');
    const prefix = detectedPrefixRef.current || `pod/${pod.mac || pod.id}/2.0/`;
    const fullTopic = subTopic.startsWith('pod/') ? subTopic : `${prefix}${subTopic}`;

    socketRef.current.emit('mqtt:inject-packet', {
      token,
      serverId: pod.id,
      brokerHost: pod.host,
      brokerUrl: `tcp://${pod.host}:1883`,
      topic: fullTopic,
      payload: String(payload)
    });
  };

  if (!pod) return null;

  return (
    <div className="flex flex-col h-full space-y-6 pb-12">
      {/* Page Header & Tab Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900/80 p-5 rounded-2xl border border-slate-800 backdrop-blur-md shadow-xl">
        <div className="flex items-center gap-4">
          <button
            onClick={onBack}
            className="p-2.5 bg-slate-800/80 hover:bg-slate-700 rounded-xl transition-all text-slate-300 hover:text-white border border-slate-700/60 shadow cursor-pointer"
            title="Kembali ke Dashboard Activity"
          >
            <ArrowLeft size={18} />
          </button>
          <div className="flex items-center gap-3.5">
            <div className="p-3 bg-gradient-to-br from-cyan-500/20 to-blue-500/20 text-cyan-400 rounded-2xl border border-cyan-500/30 shadow-lg shadow-cyan-500/10">
              <Activity size={24} />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-xl font-black text-white tracking-wide">
                  {pod.name}
                </h1>
                <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">
                  MQTT 2.0
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400 mt-1 font-medium">
                <span className="flex items-center gap-1.5">
                  <span className={`w-2 h-2 rounded-full ${mqttStatus.connected ? 'bg-emerald-400 animate-pulse' : 'bg-rose-500'}`} />
                  Status:
                  <span className={`font-bold ${mqttStatus.connected ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {mqttStatus.connected ? 'Connected' : 'Disconnected'}
                  </span>
                </span>
                {occupancyState !== null && (
                  <>
                    <span className="text-slate-600">•</span>
                    <span className={`inline-flex items-center gap-1.5 text-[11px] font-mono font-bold px-2.5 py-0.5 rounded-md border ${occupancyState === 1
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                      : 'bg-slate-800/90 text-slate-300 border-slate-700'
                      }`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${occupancyState === 1 ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'}`} />
                      {occupancyState === 1 ? 'OCCUPIED (1)' : 'AVAILABLE (0)'}
                    </span>
                  </>
                )}
                <span className="text-slate-600">•</span>
                <span className="flex items-center gap-1.5 font-mono text-[11px] text-slate-400 bg-slate-950/60 px-2 py-0.5 rounded-lg border border-slate-800">
                  <Radio size={11} className="text-cyan-400 animate-pulse" />
                  {mqttActivityFeed.length} Paket Diterima
                </span>
                <span className="text-slate-600">•</span>
                <span
                  className="flex items-center gap-1 font-mono text-[11px] text-amber-300 bg-amber-500/10 px-2 py-0.5 rounded-lg border border-amber-500/20 shadow-sm"
                  title={`Ambang Batas Status (backend JSON):\n• Live: ≤ ${thresholds.delaySec}s\n• Delay: ${thresholds.delaySec} - ${thresholds.frozenSec}s\n• Frozen: ${thresholds.frozenSec} - ${thresholds.deadSec}s\n• Dead: ≥ ${thresholds.deadSec}s`}
                >
                  <Clock size={11} className="text-amber-400" />
                  <span>Ambang Batas HB: {thresholds.delaySec}s / {thresholds.frozenSec}s / {thresholds.deadSec}s</span>
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Tab Switcher Controls */}
        <div className="flex items-center gap-1.5 bg-slate-950/90 p-1.5 rounded-2xl border border-slate-800 shadow-inner">
          <button
            onClick={() => setActiveTab('activity')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${activeTab === 'activity'
              ? 'bg-gradient-to-r from-cyan-500/20 to-blue-500/20 text-cyan-300 border border-cyan-500/40 shadow-lg shadow-cyan-500/10'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
              }`}
          >
            <Activity size={15} className={activeTab === 'activity' ? 'text-cyan-400' : ''} />
            <span>Activity Detail</span>
          </button>
          <button
            onClick={() => setActiveTab('heartbeat')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${activeTab === 'heartbeat'
              ? 'bg-gradient-to-r from-indigo-500/25 to-purple-500/25 text-indigo-300 border border-indigo-500/40 shadow-lg shadow-indigo-500/10'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
              }`}
          >
            <Cpu size={15} className={activeTab === 'heartbeat' ? 'text-indigo-400 animate-pulse' : ''} />
            <span>Heartbeat Detail</span>
          </button>
        </div>
      </div>

      {/* Main Content Area based on Active Tab */}
      {activeTab === 'activity' ? (
        <PodActivityTopicCards
          show={true}
          feed={mqttActivityFeed}
          pods={[pod]}
          onPublish={handlePublish}
        />
      ) : (
        <PodHeartbeatDetailTab
          pod={pod}
          feed={mqttActivityFeed}
          mqttStatus={mqttStatus}
          thresholds={thresholds}
          onThresholdsUpdated={setThresholds}
          onPublish={handlePublish}
        />
      )}
    </div>
  );
}
