import React, { useState, useRef, useEffect } from 'react';
import { Sliders, Square, Play, ShieldCheck } from 'lucide-react';
import io from 'socket.io-client';
import { BACKEND_URL } from '../../config';

export default function LiveActivityTracer({ selectedServerId }) {
  const [isTracing, setIsTracing] = useState(false);
  const [traceLogs, setTraceLogs] = useState([]);
  const [traceVhost, setTraceVhost] = useState('/');
  const [messageFilter, setMessageFilter] = useState('');
  const [queueFilter, setQueueFilter] = useState('');
  const [exchangeFilter, setExchangeFilter] = useState('');

  const socketRef = useRef(null);
  const terminalRef = useRef(null);

  const startTracing = () => {
    stopTracing();
    setTraceLogs([
      {
        timestamp: new Date().toLocaleTimeString(),
        serverName: 'SYSTEM',
        text: '=== TRACING STARTED: Menghubungkan ke RabbitMQ Firehose...',
        type: 'info'
      }
    ]);
    setIsTracing(true);

    const token = localStorage.getItem('vps_monitoring_token') || '';
    const socket = io(BACKEND_URL);
    socketRef.current = socket;

    socket.on('connect', () => {
      setTraceLogs(prev => [
        ...prev,
        {
          timestamp: new Date().toLocaleTimeString(),
          serverName: 'SYSTEM',
          text: `Terhubung ke monitoring socket. Memulai AMQP trace untuk Vhost "${traceVhost}"...`,
          type: 'info'
        }
      ]);

      socket.emit('rabbitmq:start-trace', {
        serverId: selectedServerId,
        token,
        vhost: traceVhost
      });
    });

    socket.on('rabbitmq:trace-connected', () => {
      setTraceLogs(prev => [
        ...prev,
        {
          timestamp: new Date().toLocaleTimeString(),
          serverName: 'SYSTEM',
          text: `✅ Sukses terhubung ke Broker AMQP. Menunggu pesan masuk/keluar...`,
          type: 'info'
        }
      ]);
    });

    socket.on('rabbitmq:trace-data', (data) => {
      // data contains: timestamp, action ('publish'|'deliver'), exchange, queue, properties, body
      let formattedText = '';
      if (data.action === 'publish') {
        formattedText = `[PUBLISH] Exchange: ${data.exchange || '(direct)'} | RoutingKey: ${data.properties?.headers?.['x-original-routing-key'] || ''} | Body: ${data.body}`;
      } else {
        formattedText = `[DELIVER] Queue: ${data.queue} | RoutingKey: ${data.properties?.headers?.['x-original-routing-key'] || ''} | Body: ${data.body}`;
      }

      setTraceLogs(prev => [
        ...prev,
        {
          timestamp: data.timestamp,
          serverName: data.action.toUpperCase(), // 'PUBLISH' | 'DELIVER'
          text: formattedText,
          type: data.action, // 'publish' | 'deliver'
          rawExchange: data.exchange || '',
          rawQueue: data.queue || '',
          rawBody: data.body || ''
        }
      ].slice(-1000));
    });

    socket.on('rabbitmq:webhook-trace', (data) => {
      const bodyString = data.payload ? (typeof data.payload === 'object' ? JSON.stringify(data.payload) : data.payload) : '';
      let formattedText = '';
      if (data.action === 'publish') {
        formattedText = `[PUBLISH-WEBHOOK] Dari: ${data.serverName} | TraceID: ${data.traceId} | Body: ${bodyString}`;
      } else {
        formattedText = `[SUBSCRIBE-WEBHOOK] Diterima: ${data.serverName} | TraceID: ${data.traceId}`;
      }

      setTraceLogs(prev => [
        ...prev,
        {
          timestamp: data.timestamp,
          serverName: data.action === 'publish' ? 'PUBLISH-WEBHOOK' : 'SUBSCRIBE-WEBHOOK',
          text: formattedText,
          type: data.action === 'publish' ? 'publish-webhook' : 'subscribe-webhook',
          rawExchange: '',
          rawQueue: '',
          rawBody: `${data.traceId} ${data.serverName} ${bodyString}`
        }
      ].slice(-1000));
    });

    socket.on('rabbitmq:trace-error', (err) => {
      setTraceLogs(prev => [
        ...prev,
        {
          timestamp: new Date().toLocaleTimeString(),
          serverName: 'SYSTEM',
          text: `❌ ERROR: ${err.error || 'Terputus dari broker'}`,
          type: 'error'
        }
      ]);
      setIsTracing(false);
    });

    socket.on('rabbitmq:trace-stopped', () => {
      setIsTracing(false);
    });

    socket.on('disconnect', () => {
      setTraceLogs(prev => [
        ...prev,
        {
          timestamp: new Date().toLocaleTimeString(),
          serverName: 'SYSTEM',
          text: `Koneksi WebSocket terputus.`,
          type: 'info'
        }
      ]);
      setIsTracing(false);
    });
  };

  const stopTracing = () => {
    if (socketRef.current) {
      socketRef.current.emit('rabbitmq:stop-trace');
      socketRef.current.disconnect();
      socketRef.current = null;
    }
    setIsTracing(false);
    setTraceLogs(prev => [
      ...prev,
      {
        timestamp: new Date().toLocaleTimeString(),
        serverName: 'SYSTEM',
        text: '=== TRACING STOPPED ===',
        type: 'info'
      }
    ]);
  };


  // Cleanup on unmount or server change
  useEffect(() => {
    return () => {
      stopTracing();
    };
  }, [selectedServerId]);

  // Auto-scroll terminal
  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [traceLogs]);

  return (
    <div className="space-y-6">
      {/* Configuration panel */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-800 pb-4">
          <div>
            <h3 className="text-sm font-extrabold text-white flex items-center gap-1.5">
              <Sliders size={16} className="text-cyan-400" />
              <span>Konfigurasi RabbitMQ Firehose Tracer</span>
            </h3>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Pantau langsung aktivitas pengiriman (Publish) dan penerimaan (Deliver) pesan pada broker RabbitMQ secara real-time.
            </p>
          </div>

          <div className="flex items-center gap-2">
            {isTracing ? (
              <button
                onClick={stopTracing}
                className="bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600 text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 shadow-lg shadow-red-500/20 cursor-pointer transition-all"
              >
                <Square size={13} fill="white" />
                <span>Stop Tracing</span>
              </button>
            ) : (
              <button
                onClick={startTracing}
                className="bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 shadow-lg shadow-emerald-500/20 cursor-pointer transition-all"
              >
                <Play size={13} fill="white" />
                <span>Start Tracing</span>
              </button>
            )}

            <button
              onClick={() => setTraceLogs([])}
              className="bg-slate-800 hover:bg-slate-700 text-slate-400 px-3 py-2 rounded-xl text-xs font-bold border border-slate-700 transition-all cursor-pointer"
            >
              Clear Console
            </button>
          </div>
        </div>

        {/* Info banner */}
        <div className="bg-cyan-500/5 border border-cyan-500/20 rounded-xl p-3.5 flex items-start gap-3">
          <ShieldCheck size={18} className="text-cyan-400 shrink-0 mt-0.5" />
          <div>
            <h4 className="text-xs font-bold text-cyan-400">RabbitMQ Firehose Active Tracer</h4>
            <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
              Metode pelacakan ini mendeteksi pesan langsung dari broker RabbitMQ (di level exchange <code>amq.rabbitmq.trace</code>).
              Anda tidak perlu memasang SSH atau mengubah baris kode apa pun di Publisher/Subscriber. Pastikan Anda sudah mengaktifkan perintah <code>rabbitmqctl trace_on</code> pada container Docker RabbitMQ Anda.
            </p>
          </div>
        </div>

        {/* Dynamic Filters Configuration */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-400 mb-1.5 uppercase tracking-wider">
              Virtual Host (vhost)
            </label>
            <input
              disabled={isTracing}
              type="text"
              placeholder="Contoh: /"
              value={traceVhost}
              onChange={(e) => setTraceVhost(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-cyan-500 font-mono"
            />
            <p className="text-[10px] text-slate-500 mt-1">
              Vhost target pelacakan broker.
            </p>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-400 mb-1.5 uppercase tracking-wider flex items-center justify-between">
              <span>Filter Konten / ID (AND)</span>
              <span className="text-[9px] bg-cyan-500/10 text-cyan-400 px-1.5 py-0.2 rounded font-bold font-mono">LIVE</span>
            </label>
            <input
              type="text"
              placeholder="Contoh: sound_id: 482 atau key"
              value={messageFilter}
              onChange={(e) => setMessageFilter(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-cyan-500"
            />
            <p className="text-[10px] text-slate-500 mt-1">
              Saring payload pesan yang lewat.
            </p>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-400 mb-1.5 uppercase tracking-wider flex items-center justify-between">
              <span>Filter Queue (AND)</span>
              <span className="text-[9px] bg-cyan-500/10 text-cyan-400 px-1.5 py-0.2 rounded font-bold font-mono">LIVE</span>
            </label>
            <input
              type="text"
              placeholder="Contoh: mobile-synch"
              value={queueFilter}
              onChange={(e) => setQueueFilter(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-cyan-500 font-mono"
            />
            <p className="text-[10px] text-slate-500 mt-1">
              Hanya tampilkan untuk queue ini.
            </p>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-400 mb-1.5 uppercase tracking-wider flex items-center justify-between">
              <span>Filter Exchange (AND)</span>
              <span className="text-[9px] bg-cyan-500/10 text-cyan-400 px-1.5 py-0.2 rounded font-bold font-mono">LIVE</span>
            </label>
            <input
              type="text"
              placeholder="Contoh: SPREAD_DISCLAIMER"
              value={exchangeFilter}
              onChange={(e) => setExchangeFilter(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-cyan-500 font-mono"
            />
            <p className="text-[10px] text-slate-500 mt-1">
              Hanya tampilkan untuk exchange ini.
            </p>
          </div>
        </div>
      </div>
      {/* Unified Terminal Console */}
      <div className="bg-slate-900/95 border border-cyan-500/20 rounded-2xl shadow-2xl overflow-hidden">
        <div className="bg-slate-950 px-4 py-2 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500"></span>
            <span className="w-2.5 h-2.5 rounded-full bg-yellow-500"></span>
            <span className="w-2.5 h-2.5 rounded-full bg-green-500"></span>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono ml-2">
              RabbitMQ Firehose Console Timeline
            </span>
          </div>

          {isTracing && (
            <span className="flex items-center gap-1 text-[10px] text-cyan-400 font-bold font-mono animate-pulse">
              <span className="w-1.5 h-1.5 bg-cyan-400 rounded-full"></span>
              <span>FIREHOSE ACTIVE</span>
            </span>
          )}
        </div>

        <div
          ref={terminalRef}
          className="bg-black p-4 h-[55vh] overflow-y-auto font-mono text-[11px] leading-relaxed select-text space-y-1.5"
        >
          {traceLogs.length === 0 ? (
            <div className="text-slate-600 text-center py-16">
              Konfigurasi parameter di atas, lalu klik "Start Tracing" untuk memantau traffic real-time dari broker.
            </div>
          ) : (
            traceLogs
              .filter(log => {
                if (log.serverName === 'SYSTEM') return true;

                if (messageFilter && !log.rawBody.toLowerCase().includes(messageFilter.toLowerCase())) {
                  return false;
                }
                if (queueFilter && !log.rawQueue.toLowerCase().includes(queueFilter.toLowerCase())) {
                  return false;
                }
                if (exchangeFilter && !log.rawExchange.toLowerCase().includes(exchangeFilter.toLowerCase())) {
                  return false;
                }

                return true;
              })
              .map((log, i) => {
                return (
                  <div key={i} className="hover:bg-slate-900/40 px-1 rounded transition-colors flex items-start gap-1 font-mono">
                    <span className="text-slate-600 shrink-0 select-none">[{log.timestamp}]</span>
                    <span
                      className="font-extrabold shrink-0 select-none"
                      style={{
                        color: (log.type === 'publish' || log.type === 'publish-webhook')
                          ? '#fbbf24'
                          : (log.type === 'deliver' || log.type === 'subscribe-webhook')
                            ? '#34d399'
                            : '#94a3b8'
                      }}
                    >
                      [{log.serverName}]
                    </span>
                    <span
                      className={`break-all ${(log.type === 'publish' || log.type === 'publish-webhook')
                        ? 'text-amber-400 font-bold'
                        : (log.type === 'deliver' || log.type === 'subscribe-webhook')
                          ? 'text-emerald-400 font-bold'
                          : log.type === 'error'
                            ? 'text-red-400 font-bold'
                            : 'text-slate-400 italic'
                        }`}
                    >
                      {log.text}
                    </span>
                  </div>
                );
              })
          )}
        </div>
      </div>
    </div>
  );
}
