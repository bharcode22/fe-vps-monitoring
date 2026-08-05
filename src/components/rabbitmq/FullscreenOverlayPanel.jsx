import React, { useState, useEffect, useRef } from 'react';
import {
  Terminal,
  MessageSquare,
  Play,
  Square,
  Search,
  Users,
  ChevronDown,
  ChevronUp,
  X,
  Box
} from 'lucide-react';
import io from 'socket.io-client';
import { BACKEND_URL } from '../../config';
import PodV3DockerMatrix from './PodV3DockerMatrix';

export default function FullscreenOverlayPanel({ selectedServerId, liveStatus, vpsServers, onOpenServerDetail }) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [activeTab, setActiveTab] = useState('trace'); // 'trace' | 'queues' | 'pod_v3'

  // --- Trace Logs State ---
  const [isTracing, setIsTracing] = useState(false);
  const [traceLogs, setTraceLogs] = useState([]);
  const socketRef = useRef(null);
  const terminalRef = useRef(null);

  // Auto scroll terminal log to bottom
  useEffect(() => {
    if (terminalRef.current && activeTab === 'trace' && !isCollapsed) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [traceLogs, activeTab, isCollapsed]);

  // Clean socket disconnect on unmount
  useEffect(() => {
    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, []);

  const startTracing = () => {
    if (!selectedServerId) return;
    if (socketRef.current) socketRef.current.disconnect();

    const token = localStorage.getItem('vps_monitoring_token') || localStorage.getItem('token') || '';
    const socket = io(BACKEND_URL);
    socketRef.current = socket;

    socket.on('connect', () => {
      setTraceLogs((prev) => [
        ...prev,
        {
          timestamp: new Date().toLocaleTimeString(),
          serverName: 'SYSTEM',
          text: 'Terhubung ke socket. Memulai AMQP trace...',
          type: 'info',
        },
      ]);

      socket.emit('rabbitmq:start-trace', {
        serverId: selectedServerId,
        token,
        vhost: '/',
      });
    });

    socket.on('rabbitmq:trace-connected', () => {
      setIsTracing(true);
      setTraceLogs((prev) => [
        ...prev,
        {
          timestamp: new Date().toLocaleTimeString(),
          serverName: 'SYSTEM',
          text: '✅ Sukses terhubung ke Broker AMQP. Menunggu traffic...',
          type: 'info',
        },
      ]);
    });

    socket.on('rabbitmq:trace-data', (data) => {
      let formattedText = '';
      if (data.action === 'publish') {
        formattedText = `[PUBLISH] Exchange: ${data.exchange || '(direct)'} | RoutingKey: ${data.properties?.headers?.['x-original-routing-key'] || ''} | Body: ${data.body}`;
      } else {
        formattedText = `[DELIVER] Queue: ${data.queue} | RoutingKey: ${data.properties?.headers?.['x-original-routing-key'] || ''} | Body: ${data.body}`;
      }

      setTraceLogs((prev) => [
        ...prev.slice(-300),
        {
          timestamp: data.timestamp,
          serverName: data.action.toUpperCase(),
          text: formattedText,
          type: data.action,
        },
      ]);
    });

    socket.on('rabbitmq:webhook-trace', (data) => {
      const bodyString = data.payload ? (typeof data.payload === 'object' ? JSON.stringify(data.payload) : data.payload) : '';
      let formattedText = data.action === 'publish'
        ? `[PUBLISH-WEBHOOK] Dari: ${data.serverName} | TraceID: ${data.traceId} | Body: ${bodyString}`
        : `[SUBSCRIBE-WEBHOOK] Diterima: ${data.serverName} | TraceID: ${data.traceId}`;

      setTraceLogs((prev) => [
        ...prev.slice(-300),
        {
          timestamp: data.timestamp,
          serverName: data.action === 'publish' ? 'PUBLISH-WEBHOOK' : 'SUBSCRIBE-WEBHOOK',
          text: formattedText,
          type: data.action === 'publish' ? 'publish-webhook' : 'subscribe-webhook',
        },
      ]);
    });

    socket.on('rabbitmq:trace-error', (err) => {
      setTraceLogs((prev) => [
        ...prev,
        {
          timestamp: new Date().toLocaleTimeString(),
          serverName: 'SYSTEM',
          text: `❌ ERROR: ${err.error || 'Terputus dari broker'}`,
          type: 'error',
        },
      ]);
      setIsTracing(false);
    });

    socket.on('rabbitmq:trace-stopped', () => {
      setIsTracing(false);
    });

    socket.on('disconnect', () => {
      setIsTracing(false);
    });
  };

  const stopTracing = () => {
    if (socketRef.current) {
      socketRef.current.emit('rabbitmq:stop-trace', { serverId: selectedServerId });
      socketRef.current.disconnect();
      socketRef.current = null;
    }
    setIsTracing(false);
  };

  // --- Queue Monitor State ---
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedQueue, setExpandedQueue] = useState(null);

  const filteredQueues = (liveStatus?.queues || []).filter((q) =>
    q.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="w-[calc(100vw-2rem)] max-w-5xl bg-slate-950/95 border border-slate-800 rounded-t-2xl shadow-2xl overflow-hidden flex flex-col transition-all duration-300 pointer-events-auto">
      {/* TERMINAL DOCK HEADER */}
      <div className="bg-slate-900 border-b border-slate-800 px-4 py-2 flex items-center justify-between select-none">
        {/* Left: Dock Tabs */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setActiveTab('trace');
              if (isCollapsed) setIsCollapsed(false);
            }}
            className={`px-3 py-1 rounded-lg text-xs font-bold flex items-center gap-2 transition-colors cursor-pointer ${activeTab === 'trace'
              ? 'bg-cyan-500/15 text-cyan-400 border border-cyan-500/30'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
          >
            <Terminal size={14} />
            <span>AMQP Trace Log</span>
            {isTracing && (
              <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)] animate-pulse"></span>
            )}
          </button>

          <button
            onClick={() => {
              setActiveTab('queues');
              if (isCollapsed) setIsCollapsed(false);
            }}
            className={`px-3 py-1 rounded-lg text-xs font-bold flex items-center gap-2 transition-colors cursor-pointer ${activeTab === 'queues'
              ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
          >
            <MessageSquare size={14} />
            <span>Queue List ({filteredQueues.length})</span>
          </button>

          <button
            onClick={() => {
              setActiveTab('pod_v3');
              if (isCollapsed) setIsCollapsed(false);
            }}
            className={`px-3 py-1 rounded-lg text-xs font-bold flex items-center gap-2 transition-colors cursor-pointer ${activeTab === 'pod_v3'
              ? 'bg-purple-500/15 text-purple-400 border border-purple-500/30'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
          >
            <Box size={14} />
            <span>Status Pod V3 Docker</span>
          </button>
        </div>

        {/* Right: Actions & Collapse Button */}
        <div className="flex items-center gap-3">
          {activeTab === 'trace' && !isCollapsed && (
            <div className="flex items-center gap-2">
              {isTracing ? (
                <button
                  onClick={stopTracing}
                  className="bg-red-500/20 hover:bg-red-500/30 text-red-400 px-2 py-0.5 rounded text-[10px] font-bold border border-red-500/30 flex items-center gap-1 transition-colors cursor-pointer"
                >
                  <Square size={10} fill="currentColor" /> Stop Trace
                </button>
              ) : (
                <button
                  onClick={startTracing}
                  className="bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 px-2 py-0.5 rounded text-[10px] font-bold border border-emerald-500/30 flex items-center gap-1 transition-colors cursor-pointer"
                >
                  <Play size={10} fill="currentColor" /> Start Trace
                </button>
              )}
              <button
                onClick={() => setTraceLogs([])}
                className="text-slate-500 hover:text-slate-300 text-[10px] font-bold uppercase transition-colors cursor-pointer px-1"
              >
                Clear
              </button>
            </div>
          )}

          {activeTab === 'queues' && !isCollapsed && (
            <div className="relative">
              <input
                type="text"
                placeholder="Cari queue..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-slate-950 border border-slate-800 text-slate-200 text-[10px] px-2 py-0.5 pl-6 rounded outline-none focus:border-cyan-500 w-36"
              />
              <Search size={10} className="absolute left-2 top-1.5 text-slate-500" />
            </div>
          )}

          {/* Toggle Expand/Collapse */}
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="text-slate-400 hover:text-white p-1 rounded-md hover:bg-slate-800 transition-colors cursor-pointer"
            title={isCollapsed ? 'Buka Dock' : 'Tutup Dock'}
          >
            {isCollapsed ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
        </div>
      </div>

      {/* DOCK BODY CONTENT (Only when expanded) */}
      {!isCollapsed && (
        <div className="h-64 flex flex-col overflow-hidden">
          {/* TAB 1: TRACE LOGS TERMINAL */}
          {activeTab === 'trace' && (
            <div
              ref={terminalRef}
              onWheel={(e) => e.stopPropagation()}
              onMouseDown={(e) => e.stopPropagation()}
              className="nowheel nopan nodrag bg-black/95 p-3 flex-1 overflow-y-auto font-mono text-[11px] leading-relaxed select-text space-y-1.5 custom-scrollbar"
            >
              {traceLogs.length === 0 ? (
                <div className="text-slate-600 text-center py-16 italic">
                  Klik "Start Trace" pada toolbar di atas untuk memantau traffic event bus real-time...
                </div>
              ) : (
                traceLogs.map((log, index) => {
                  const isPublish = log.type === 'publish' || log.type === 'publish-webhook';
                  const isDeliver = log.type === 'deliver' || log.type === 'subscribe-webhook';
                  const isError = log.type === 'error';

                  return (
                    <div key={index} className="border-b border-slate-900/60 pb-1 flex items-start gap-2">
                      <span className="text-slate-500 shrink-0">[{log.timestamp}]</span>
                      <span
                        className={`font-bold uppercase px-1 rounded text-[9px] shrink-0 mt-0.5 ${isPublish
                          ? 'bg-amber-500/20 text-amber-400'
                          : isDeliver
                            ? 'bg-emerald-500/20 text-emerald-400'
                            : isError
                              ? 'bg-red-500/20 text-red-400'
                              : 'bg-cyan-500/20 text-cyan-400'
                          }`}
                      >
                        {log.serverName || log.type}
                      </span>
                      <span className="text-slate-300 break-all font-mono text-[10.5px]">
                        {log.text}
                      </span>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* TAB 2: QUEUE MONITOR LIST */}
          {activeTab === 'queues' && (
            <div 
              onWheel={(e) => e.stopPropagation()}
              onMouseDown={(e) => e.stopPropagation()}
              className="nowheel nopan nodrag flex-1 overflow-auto custom-scrollbar bg-slate-950/90"
            >
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-900/90 text-[10px] font-bold text-slate-400 border-b border-slate-800 sticky top-0 z-10">
                    <th className="p-2.5">Nama Queue</th>
                    <th className="p-2.5 text-center">Status</th>
                    <th className="p-2.5 text-center">Ready (Antrean)</th>
                    <th className="p-2.5 text-center">Unacked</th>
                    <th className="p-2.5 text-center">Consumers</th>
                  </tr>
                </thead>
                <tbody className="text-[11px]">
                  {filteredQueues.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-8 text-center text-slate-500 text-xs">
                        Tidak ada queue ditemukan.
                      </td>
                    </tr>
                  ) : (
                    filteredQueues.map((q) => {
                      const isExpanded = expandedQueue === q.name;
                      return (
                        <React.Fragment key={q.name}>
                          <tr
                            onClick={() => setExpandedQueue(isExpanded ? null : q.name)}
                            className={`border-b border-slate-800/60 hover:bg-slate-800/40 cursor-pointer transition-colors ${isExpanded ? 'bg-cyan-500/10' : ''
                              }`}
                          >
                            <td className="p-2.5 font-bold text-slate-200 flex items-center gap-2">
                              <MessageSquare size={12} className="text-cyan-500 shrink-0" />
                              <span className="break-all">{q.name}</span>
                            </td>
                            <td className="p-2.5 text-center">
                              <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                {q.status}
                              </span>
                            </td>
                            <td className="p-2.5 text-center font-mono font-bold text-amber-400">
                              {q.messagesReady}
                            </td>
                            <td className="p-2.5 text-center font-mono font-bold text-orange-400">
                              {q.messagesUnacknowledged}
                            </td>
                            <td className="p-2.5 text-center font-mono text-[10px]">
                              <span
                                className={`px-2 py-0.5 rounded border font-bold ${q.consumersCount > 0
                                  ? 'bg-cyan-500/10 border-cyan-500/30 text-cyan-300'
                                  : 'bg-red-500/10 border-red-500/30 text-red-400'
                                  }`}
                              >
                                {q.consumersCount} Consumers
                              </span>
                            </td>
                          </tr>
                          {isExpanded && (
                            <tr className="bg-slate-900/60 border-b border-slate-800">
                              <td colSpan={5} className="p-3 pl-8 text-[10px] space-y-1.5">
                                <div className="font-bold text-cyan-400 flex items-center gap-1.5">
                                  <Users size={12} /> Consumers Terkoneksi ({q.consumers.length}):
                                </div>
                                {q.consumers.length === 0 ? (
                                  <div className="text-slate-500 italic">Belum ada consumer aktif mendengarkan queue ini saat ini.</div>
                                ) : (
                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                    {q.consumers.map((c, i) => (
                                      <div
                                        key={i}
                                        className="text-slate-300 font-mono flex items-center justify-between bg-slate-950 px-2.5 py-1.5 rounded border border-slate-800"
                                      >
                                        <span>IP: {c.peerHost}</span>
                                        <span className={c.active ? 'text-emerald-400 font-bold' : 'text-red-400'}>
                                          {c.active ? 'Active' : 'Inactive'}
                                        </span>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* TAB 3: POD V3 DOCKER MATRIX */}
          {activeTab === 'pod_v3' && (
            <div 
              onWheel={(e) => e.stopPropagation()}
              onMouseDown={(e) => e.stopPropagation()}
              className="nowheel nopan nodrag flex-1 overflow-auto custom-scrollbar p-3 bg-slate-955/90"
            >
              <PodV3DockerMatrix vpsServers={vpsServers} onOpenServerDetail={onOpenServerDetail} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
