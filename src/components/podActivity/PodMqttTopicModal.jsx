import React, { useState, useEffect, useRef, useMemo } from 'react';
import io from 'socket.io-client';
import {
  X,
  Radio,
  RefreshCw,
  Search,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  Send,
  Trash2,
  Zap,
  UserCheck,
  UserX
} from 'lucide-react';
import { SOCKET_URL } from '../../config';
import { fetchPodTopicDetailApi } from '../../api/podTopicApi';
import { simulatePodActivityApi } from '../../api/podActivityApi';

export default function PodMqttTopicModal({ isOpen, onClose, pod, onOccupancyUpdated }) {
  const [activeTab, setActiveTab] = useState('pod_topic'); // 'pod_topic' | 'socket_topic'
  const [topicsData, setTopicsData] = useState(null);
  const [isLoadingTopics, setIsLoadingTopics] = useState(true);
  const [topicsError, setTopicsError] = useState('');

  // Search & Selection
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTopic, setSelectedTopic] = useState('mod_chair/pob_state');
  const [monitorMode, setMonitorMode] = useState('selected'); // 'selected' | 'all'

  // Live MQTT Packets
  const [packets, setPackets] = useState([]);
  const [mqttStatus, setMqttStatus] = useState({ connected: false });
  const [publishPayload, setPublishPayload] = useState('1');
  const [isPublishing, setIsPublishing] = useState(false);
  const [publishSuccess, setPublishSuccess] = useState('');
  const [copiedText, setCopiedText] = useState(null);

  const socketRef = useRef(null);
  const packetsEndRef = useRef(null);

  // Fetch registered topics from POD database
  useEffect(() => {
    if (isOpen && pod?.id) {
      loadPodTopics();
    }
  }, [isOpen, pod?.id]);

  const loadPodTopics = async () => {
    if (!pod?.id) return;
    setIsLoadingTopics(true);
    setTopicsError('');
    try {
      const res = await fetchPodTopicDetailApi(pod.id);
      setTopicsData(res);
      // Auto-select mod_chair/pob_state if present, or first topic
      const podList = res?.podTopics || [];
      const foundChair = podList.find(t => (t.topic || '').includes('pob_state') || (t.topic || '').includes('mod_chair'));
      if (foundChair) {
        setSelectedTopic(foundChair.topic || 'mod_chair/pob_state');
      } else if (podList.length > 0) {
        setSelectedTopic(podList[0].topic || 'mod_chair/pob_state');
      }
    } catch (err) {
      setTopicsError(err.message || 'Gagal memuat daftar topik dari database POD.');
    } finally {
      setIsLoadingTopics(false);
    }
  };

  // Socket.io MQTT Sniffer Lifecycle
  useEffect(() => {
    if (!isOpen || !pod?.id) return;

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
      setIsSniffing(true);
    });

    socket.on('mqtt:status', (status) => {
      setMqttStatus(status);
    });

    socket.on('mqtt:packet', (packet) => {
      setPackets((prev) => [packet, ...prev.slice(0, 199)]);
    });

    socket.on('mqtt:inject-success', () => {
      setIsPublishing(false);
      setPublishSuccess('Pesan berhasil dipublikasikan ke broker!');
      setTimeout(() => setPublishSuccess(''), 3000);
      onOccupancyUpdated?.();
    });

    socket.on('mqtt:inject-error', (err) => {
      setIsPublishing(false);
      alert(`Gagal publish MQTT: ${err.error || err.message}`);
    });

    return () => {
      socket.emit('mqtt:stop-sniff');
      socket.disconnect();
    };
  }, [isOpen, pod?.id, pod?.host]);

  const handleCopy = (text, key) => {
    navigator.clipboard.writeText(text);
    setCopiedText(key);
    setTimeout(() => setCopiedText(null), 2000);
  };

  // Publish message to MQTT broker
  const handlePublish = async (overridePayload = null, overrideTopic = null) => {
    const payloadToSend = overridePayload !== null ? overridePayload : publishPayload;
    const targetTopic = overrideTopic || selectedTopic;

    if (!targetTopic) {
      alert('Topik MQTT harus ditentukan.');
      return;
    }

    setIsPublishing(true);
    const token = localStorage.getItem('vps_monitoring_token');

    // If it's pob_state, also trigger the service simulator to ensure instant occupancy sync
    if (targetTopic.includes('pob_state')) {
      try {
        await simulatePodActivityApi(pod.id, payloadToSend, targetTopic);
        onOccupancyUpdated?.();
      } catch (_) { }
    }

    if (socketRef.current) {
      socketRef.current.emit('mqtt:inject-packet', {
        token,
        serverId: pod.id,
        topic: targetTopic,
        payload: payloadToSend,
        qos: 0,
        retain: false
      });
    }
  };

  // Filter topics
  const podTopics = useMemo(() => {
    const list = topicsData?.podTopics || [];
    return list.filter(t => {
      const key = (t.topic || t.topic_name || t.name || '').toLowerCase();
      const mod = (t.module_name || '').toLowerCase();
      const q = searchQuery.toLowerCase().trim();
      return !q || key.includes(q) || mod.includes(q);
    });
  }, [topicsData?.podTopics, searchQuery]);

  const socketTopics = useMemo(() => {
    const list = topicsData?.socketTopics || [];
    return list.filter(t => {
      const key = (t.topic || t.topic_name || t.event || '').toLowerCase();
      const q = searchQuery.toLowerCase().trim();
      return !q || key.includes(q);
    });
  }, [topicsData?.socketTopics, searchQuery]);

  // Filter live packets based on selected topic or monitor mode
  const displayedPackets = useMemo(() => {
    if (monitorMode === 'all') return packets;
    if (!selectedTopic) return packets;

    return packets.filter(pkt => {
      if (!pkt.topic) return false;
      if (pkt.topic === selectedTopic) return true;
      // Handle prefix or wildcards (e.g. "prefix/mod_chair/pob_state")
      return pkt.topic.endsWith(selectedTopic) || selectedTopic.endsWith(pkt.topic);
    });
  }, [packets, monitorMode, selectedTopic]);

  if (!isOpen || !pod) return null;

  return (
    <div className="fixed inset-0 z-[1200] bg-black/85 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 animate-in fade-in duration-150">
      <div className="bg-slate-950 border border-slate-800 rounded-2xl w-full max-w-6xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header Modal */}
        <div className="bg-slate-900/90 border-b border-slate-800 px-5 py-3.5 flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-gradient-to-br from-cyan-500/20 to-blue-500/20 text-cyan-400 border border-cyan-500/30 rounded-xl shadow-inner">
              <Radio size={20} className={mqttStatus.connected ? 'animate-pulse text-cyan-400' : 'text-slate-400'} />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-sm sm:text-base font-bold text-white tracking-wide">
                  Topik MQTT &amp; Live Sniffer: {pod.name}
                </h3>
                <span className="text-[10px] font-mono px-2 py-0.5 bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 rounded-md font-bold">
                  POD V3
                </span>
                <span className="text-[10px] font-mono text-slate-400">
                  #{pod.code} • {pod.host}:1883
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
                <span className="flex items-center gap-1">
                  <span className={`w-2 h-2 rounded-full ${mqttStatus.connected ? 'bg-emerald-400 animate-ping' : 'bg-rose-400'}`} />
                  <span className={mqttStatus.connected ? 'text-emerald-300 font-semibold' : 'text-rose-400 font-semibold'}>
                    {mqttStatus.connected ? 'Broker Terhubung (Port 1883)' : 'Menghubungkan Broker...'}
                  </span>
                </span>
                <span>•</span>
                <span>Database: <code className="text-indigo-300 font-mono">regenesis</code></span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={loadPodTopics}
              disabled={isLoadingTopics}
              className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs border border-slate-700 transition-colors cursor-pointer"
              title="Refresh Daftar Topik"
            >
              <RefreshCw size={14} className={isLoadingTopics ? 'animate-spin text-cyan-400' : ''} />
            </button>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors cursor-pointer"
              title="Tutup Modal"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Action Success Toast */}
        {publishSuccess && (
          <div className="bg-emerald-500/15 border-b border-emerald-500/40 text-emerald-300 px-5 py-2.5 text-xs flex items-center gap-2 font-semibold">
            <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
            <span>{publishSuccess}</span>
          </div>
        )}

        {/* Body 2-Column Split: Left (Registered Topics) & Right (Live Packet Stream) */}
        <div className="flex-1 overflow-hidden grid grid-cols-1 lg:grid-cols-12">
          {/* ========================================================================= */}
          {/* LEFT COLUMN: Registered Topics in POD Database (5 cols) */}
          {/* ========================================================================= */}
          <div className="lg:col-span-5 border-r border-slate-800/80 flex flex-col bg-slate-950/60 overflow-hidden">
            {/* Search and Sub-tabs */}
            <div className="p-3.5 border-b border-slate-800/80 flex flex-col gap-2.5 bg-slate-900/40">
              <div className="relative">
                <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Cari topik (pob_state, chair, light)..."
                  className="w-full bg-slate-950 border border-slate-800 text-slate-200 text-xs rounded-xl pl-8 pr-3 py-1.5 focus:outline-none focus:border-cyan-500 font-medium placeholder:text-slate-500"
                />
              </div>

              <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
                <button
                  onClick={() => setActiveTab('pod_topic')}
                  className={`flex-1 py-1 px-2 rounded-lg font-bold transition-all cursor-pointer text-center ${
                    activeTab === 'pod_topic'
                      ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  pod_topics ({topicsData?.podTopics?.length || 0})
                </button>
                <button
                  onClick={() => setActiveTab('socket_topic')}
                  className={`flex-1 py-1 px-2 rounded-lg font-bold transition-all cursor-pointer text-center ${
                    activeTab === 'socket_topic'
                      ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/40'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  socket_topics ({topicsData?.socketTopics?.length || 0})
                </button>
              </div>
            </div>

            {/* Topics Scrollable List */}
            <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-2">
              {isLoadingTopics ? (
                <div className="p-8 flex flex-col items-center justify-center text-slate-400 text-xs gap-2">
                  <RefreshCw size={20} className="animate-spin text-cyan-400" />
                  <span>Membaca topik dari database {pod.name}...</span>
                </div>
              ) : topicsError ? (
                <div className="p-4 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs text-rose-300">
                  <AlertCircle size={16} className="text-rose-400 mb-1" />
                  <p>{topicsError}</p>
                </div>
              ) : (activeTab === 'pod_topic' ? podTopics : socketTopics).length === 0 ? (
                <div className="p-6 text-center text-slate-500 text-xs">
                  Tidak ada topik yang cocok dengan pencarian.
                </div>
              ) : (
                (activeTab === 'pod_topic' ? podTopics : socketTopics).map((t) => {
                  const topicKey = t.topic || t.topic_name || t.name || t.event || '';
                  const isSelected = selectedTopic === topicKey;
                  const isChairTopic = topicKey.includes('chair') || topicKey.includes('pob');

                  return (
                    <div
                      key={t.id || topicKey}
                      onClick={() => setSelectedTopic(topicKey)}
                      className={`p-3 rounded-xl border text-xs transition-all cursor-pointer flex flex-col gap-1.5 ${
                        isSelected
                          ? 'bg-cyan-500/15 border-cyan-500/50 shadow-md shadow-cyan-500/10'
                          : isChairTopic
                          ? 'bg-emerald-950/20 border-emerald-500/30 hover:border-emerald-500/50'
                          : 'bg-slate-900/60 border-slate-800/80 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5 truncate">
                          <Radio size={12} className={isSelected ? 'text-cyan-400' : isChairTopic ? 'text-emerald-400' : 'text-slate-500'} />
                          <span className="font-mono font-bold text-white truncate" title={topicKey}>
                            {topicKey}
                          </span>
                        </div>
                        {isChairTopic && (
                          <span className="text-[9px] font-mono px-1.5 py-0.2 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded font-bold">
                            POB / Chair
                          </span>
                        )}
                      </div>

                      {t.module_name && (
                        <span className="text-[11px] text-slate-400 truncate">
                          Modul: <b className="text-slate-300">{t.module_name}</b>
                        </span>
                      )}

                      <div className="flex items-center justify-between pt-1 border-t border-slate-800/50 text-[10.5px]">
                        <span className="text-slate-500 font-mono">
                          Action: <code className="text-slate-400">{t.action || 'publish/sub'}</code>
                        </span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedTopic(topicKey);
                            setMonitorMode('selected');
                          }}
                          className={`px-2 py-0.5 rounded font-semibold transition-colors cursor-pointer text-[10px] ${
                            isSelected
                              ? 'bg-cyan-500 text-slate-950 font-bold'
                              : 'bg-slate-800 hover:bg-cyan-500/20 text-cyan-300 border border-slate-700'
                          }`}
                        >
                          {isSelected ? '✓ Terpilih' : 'Pantau'}
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* ========================================================================= */}
          {/* RIGHT COLUMN: Live MQTT Sniffer & Topic Tester (7 cols) */}
          {/* ========================================================================= */}
          <div className="lg:col-span-7 flex flex-col bg-slate-950 overflow-hidden">
            {/* Right Header: Selected Topic & Mode Switcher */}
            <div className="p-3.5 border-b border-slate-800/80 flex items-center justify-between gap-2 flex-wrap bg-slate-900/50">
              <div className="flex items-center gap-2 min-w-0">
                <Radio size={15} className="text-cyan-400 shrink-0" />
                <div className="min-w-0">
                  <div className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">
                    Topik yang Dipantau:
                  </div>
                  <div className="font-mono text-xs font-bold text-cyan-300 truncate" title={selectedTopic}>
                    {selectedTopic || '(Pilih topik di sebelah kiri)'}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 text-[11px]">
                  <button
                    onClick={() => setMonitorMode('selected')}
                    className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                      monitorMode === 'selected'
                        ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                    title="Hanya tampilkan paket dari topik yang dipilih"
                  >
                    Topik Ini
                  </button>
                  <button
                    onClick={() => setMonitorMode('all')}
                    className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                      monitorMode === 'all'
                        ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/40'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                    title="Tampilkan seluruh paket dari broker (#)"
                  >
                    Semua (#)
                  </button>
                </div>

                <button
                  onClick={() => setPackets([])}
                  className="p-1.5 text-slate-400 hover:text-rose-400 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
                  title="Bersihkan Paket Stream"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>

            {/* Test Publish & Injection Tool */}
            <div className="p-3.5 border-b border-slate-800/80 bg-slate-900/30 flex flex-col gap-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-300 flex items-center gap-1.5">
                  <Send size={13} className="text-amber-400" />
                  Kirim / Uji Coba Payload ke Topik:
                </span>
                <span className="text-[11px] font-mono text-slate-400 truncate max-w-[240px]">
                  {selectedTopic}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={publishPayload}
                  onChange={(e) => setPublishPayload(e.target.value)}
                  placeholder="Contoh: 1, 0, atau JSON payload..."
                  className="flex-1 bg-slate-950 border border-slate-800 text-slate-200 text-xs rounded-xl px-3 py-2 font-mono focus:outline-none focus:border-amber-500 transition-colors"
                />

                <button
                  onClick={() => handlePublish()}
                  disabled={isPublishing || !selectedTopic}
                  className="px-3.5 py-2 bg-gradient-to-r from-amber-600 to-rose-600 hover:from-amber-500 hover:to-rose-500 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 transition-all shadow-md shadow-amber-500/20 cursor-pointer disabled:opacity-40"
                >
                  {isPublishing ? <RefreshCw size={13} className="animate-spin" /> : <Zap size={13} />}
                  <span>{isPublishing ? 'Mengirim...' : 'Publish'}</span>
                </button>
              </div>

              {/* Quick Presets for Chair / POB State */}
              <div className="flex items-center gap-2 pt-1 flex-wrap">
                <span className="text-[10px] text-slate-500 uppercase font-bold">Preset POB:</span>
                <button
                  onClick={() => handlePublish('1')}
                  className="px-2 py-0.5 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 rounded text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                  title="Kirim POB = 1 (Occupied)"
                >
                  <UserCheck size={11} /> POB = 1 (Occupied)
                </button>
                <button
                  onClick={() => handlePublish('0')}
                  className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 rounded text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                  title="Kirim POB = 0 (Available)"
                >
                  <UserX size={11} /> POB = 0 (Available)
                </button>
              </div>
            </div>

            {/* Live Packet Stream Table */}
            <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-2">
              <div className="flex items-center justify-between text-xs text-slate-400 pb-1">
                <span>
                  Paket Diterima ({displayedPackets.length} paket):
                </span>
                <span className="text-[10px] font-mono text-cyan-400">
                  {monitorMode === 'selected' ? `Filter: ${selectedTopic}` : 'Wildcard: Semua Topik (#)'}
                </span>
              </div>

              {displayedPackets.length === 0 ? (
                <div className="p-12 flex flex-col items-center justify-center text-slate-500 text-xs gap-2">
                  <Radio size={28} className="text-slate-600 animate-pulse" />
                  <span className="font-semibold text-slate-400">Menunggu pesan MQTT pada broker {pod.name}...</span>
                  <span className="text-[11px] text-slate-600 text-center max-w-sm">
                    Saat modul/sensor mempublikasikan pesan, paket akan langsung muncul di sini secara real-time.
                  </span>
                </div>
              ) : (
                displayedPackets.map((pkt, idx) => {
                  const isPobTopic = pkt.topic && pkt.topic.includes('pob_state');
                  const isOccupiedValue = pkt.payload === '1' || (pkt.payloadJson?.value === 1);
                  const isVacantValue = pkt.payload === '0' || (pkt.payloadJson?.value === 0);

                  return (
                    <div
                      key={pkt.id || idx}
                      className="bg-slate-900/60 border border-slate-800 rounded-xl p-3 flex flex-col gap-2 font-mono text-xs hover:border-slate-700 transition-all"
                    >
                      <div className="flex items-center justify-between gap-2 flex-wrap text-[11px]">
                        <div className="flex items-center gap-1.5 font-bold text-cyan-300">
                          <Radio size={12} className="text-cyan-400 shrink-0" />
                          <span>{pkt.topic}</span>
                        </div>
                        <div className="flex items-center gap-2 text-slate-500 text-[10px]">
                          <span>QoS {pkt.qos || 0}</span>
                          <span>•</span>
                          <span>{pkt.timestamp ? new Date(pkt.timestamp).toLocaleTimeString('id-ID') : '-'}</span>
                          <button
                            onClick={() => handleCopy(pkt.payload, pkt.id || idx)}
                            className="p-1 text-slate-400 hover:text-white rounded hover:bg-slate-800 transition-colors cursor-pointer"
                            title="Salin Payload"
                          >
                            {copiedText === (pkt.id || idx) ? <Check size={11} className="text-emerald-400" /> : <Copy size={11} />}
                          </button>
                        </div>
                      </div>

                      {/* Payload Display */}
                      <div className="flex items-center gap-2">
                        {isPobTopic && (
                          isOccupiedValue ? (
                            <span className="px-2 py-0.5 rounded text-[10.5px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 inline-flex items-center gap-1">
                              <UserCheck size={11} /> OCCUPIED (1)
                            </span>
                          ) : isVacantValue ? (
                            <span className="px-2 py-0.5 rounded text-[10.5px] font-semibold bg-slate-800 text-slate-300 border border-slate-700 inline-flex items-center gap-1">
                              <UserX size={11} /> AVAILABLE (0)
                            </span>
                          ) : null
                        )}

                        <pre className="flex-1 bg-slate-950 p-2 rounded-lg border border-slate-800 text-emerald-300 text-[11.5px] overflow-x-auto whitespace-pre-wrap">
                          {pkt.payloadJson ? JSON.stringify(pkt.payloadJson, null, 2) : pkt.payload}
                        </pre>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={packetsEndRef} />
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="bg-slate-900/90 border-t border-slate-800 px-5 py-3 flex items-center justify-between gap-3 flex-wrap">
          <span className="text-[11px] font-mono text-slate-500">
            Broker Target: <code className="text-cyan-400">tcp://{pod.host}:1883</code>
          </span>

          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold border border-slate-700 cursor-pointer transition-colors"
          >
            Tutup Inspector
          </button>
        </div>
      </div>
    </div>
  );
}
