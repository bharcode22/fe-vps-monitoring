import React, { useState, useMemo } from 'react';
import { Search, MessageSquare, ChevronUp, ChevronDown, Users } from 'lucide-react';

export default function QueuesMonitor({ liveStatus }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedQueue, setExpandedQueue] = useState(null);

  const toggleExpandQueue = (queueName) => {
    if (expandedQueue === queueName) {
      setExpandedQueue(null);
    } else {
      setExpandedQueue(queueName);
    }
  };

  const filteredQueues = useMemo(() => {
    if (!liveStatus?.queues) return [];
    if (!searchQuery) return liveStatus.queues;
    return liveStatus.queues.filter(q =>
      q.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [liveStatus, searchQuery]);

  if (!liveStatus) return null;

  return (
    <div className="space-y-6">
      {/* Totals Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 text-center">
            <span className="text-slate-400 text-xs block mb-1">Total Queue</span>
            <span className="text-2xl font-extrabold text-white">
              {liveStatus.queues.length}
            </span>
          </div>
          <div className="bg-slate-900/80 border border-cyan-500/30 rounded-2xl p-4 text-center">
            <span className="text-cyan-400 text-xs block mb-1">Total Pesan</span>
            <span className="text-2xl font-extrabold text-cyan-400">
              {liveStatus.totals.messages}
            </span>
          </div>
          <div className="bg-slate-900/80 border border-emerald-500/30 rounded-2xl p-4 text-center">
            <span className="text-emerald-400 text-xs block mb-1">Pesan Ready (Antrean)</span>
            <span className="text-2xl font-extrabold text-emerald-400">
              {liveStatus.totals.messagesReady}
            </span>
          </div>
          <div className="bg-slate-900/80 border border-amber-500/30 rounded-2xl p-4 text-center">
            <span className="text-amber-400 text-xs block mb-1">Kecepatan Publish</span>
            <span className="text-2xl font-extrabold text-amber-400 font-mono text-xl sm:text-2xl">
              {liveStatus.totals.publishRate.toFixed(1)} <span className="text-xs">msg/s</span>
            </span>
          </div>
        </div>

      {/* Queues Table Container */}
      <div className="bg-slate-900/90 border border-cyan-500/20 rounded-2xl shadow-xl overflow-hidden">
        {/* Toolbar */}
        <div className="p-4 border-b border-slate-800 bg-slate-950/50 flex items-center justify-between">
            <div className="relative">
              <input
                type="text"
                placeholder="Cari antrean (queue)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-slate-900 border border-slate-700 text-slate-200 text-xs px-3 py-2 pl-9 rounded-lg outline-none focus:border-cyan-500 w-full sm:w-64"
              />
              <Search size={14} className="absolute left-3 top-2.5 text-slate-500" />
            </div>
            <span className="text-xs text-slate-400 font-bold">
              Menampilkan {filteredQueues.length} Antrean
            </span>
          </div>

        {/* Table */}
        <div className="overflow-auto max-h-[60vh]">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-950 text-xs font-bold text-slate-400 border-b border-slate-800">
                <th className="p-4 w-1/3">Nama Antrean (Queue)</th>
                <th className="p-4 text-center w-24">Status</th>
                <th className="p-4 text-center w-28">Ready</th>
                <th className="p-4 text-center w-28">Unacked</th>
                <th className="p-4 text-center w-28">Consumers (Pod)</th>
                <th className="p-4 text-right w-32">Publish Rate</th>
              </tr>
            </thead>
            <tbody>
              {filteredQueues.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-500 text-sm">
                    Tidak ada antrean ditemukan.
                  </td>
                </tr>
              ) : (
                filteredQueues.map((q) => {
                  const isExpanded = expandedQueue === q.name;
                  const hasUnacked = q.messagesUnacknowledged > 0;

                  return (
                    <React.Fragment key={q.name}>
                      {/* Queue Row */}
                      <tr
                        onClick={() => toggleExpandQueue(q.name)}
                        className={`border-b border-slate-800/80 hover:bg-slate-800/40 transition-colors cursor-pointer ${isExpanded ? 'bg-cyan-500/5' : ''
                          }`}
                      >
                        <td className="p-4 font-bold text-slate-200 flex items-center gap-2">
                          <MessageSquare size={14} className="text-cyan-500 shrink-0" />
                          <span className="break-all">{q.name}</span>
                          {isExpanded ? <ChevronUp size={14} className="text-slate-500 shrink-0 ml-auto" /> : <ChevronDown size={14} className="text-slate-500 shrink-0 ml-auto" />}
                        </td>
                        <td className="p-4 text-center">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${q.status === 'running' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-slate-800 text-slate-400 border border-slate-700'
                            }`}>
                            {q.status}
                          </span>
                        </td>
                        <td className="p-4 text-center font-mono font-bold text-xs">
                          <span className={q.messagesReady > 0 ? 'text-amber-400' : 'text-slate-400'}>
                            {q.messagesReady}
                          </span>
                        </td>
                        <td className="p-4 text-center font-mono font-bold text-xs">
                          <span className={hasUnacked ? 'text-orange-400' : 'text-slate-400'}>
                            {q.messagesUnacknowledged}
                          </span>
                        </td>
                        <td className="p-4 text-center font-mono text-xs">
                          <span className={`px-2 py-0.5 rounded-lg border font-bold ${q.consumersCount > 0 ? 'bg-cyan-500/10 border-cyan-500/30 text-cyan-300' : 'bg-red-500/10 border-red-500/30 text-red-400'
                            }`}>
                            {q.consumersCount} Consumers
                          </span>
                        </td>
                        <td className="p-4 text-right font-mono text-xs text-slate-300">
                          {q.rates.publish > 0 ? (
                            <span className="text-cyan-400 font-bold">{q.rates.publish.toFixed(1)}/s</span>
                          ) : (
                            <span className="text-slate-500">0.0/s</span>
                          )}
                        </td>
                      </tr>

                      {/* Expanded consumers details list */}
                      {isExpanded && (
                        <tr className="bg-slate-950/40 border-b border-slate-800">
                          <td colSpan={6} className="p-4 pl-8 border-l-2 border-cyan-500">
                            <div className="space-y-3">
                              <h4 className="text-xs font-extrabold text-cyan-400 tracking-wider uppercase flex items-center gap-1.5">
                                <Users size={12} />
                                <span>Pod Subscribers Terkoneksi ({q.consumers.length})</span>
                              </h4>

                              {q.consumers.length === 0 ? (
                                <p className="text-xs text-slate-500 italic">Tidak ada subscriber aktif mendengarkan queue ini saat ini. Aplikasi mungkin terputus dari RabbitMQ.</p>
                              ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                  {q.consumers.map((c, idx) => (
                                    <div key={idx} className="bg-slate-900 border border-slate-800/80 rounded-xl p-3 flex flex-col justify-between">
                                      <div>
                                        <div className="flex items-center justify-between mb-1.5">
                                          <span className="text-xs font-bold text-white font-mono bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                                            IP: {c.peerHost}
                                          </span>
                                          <span className="text-[10px] font-bold text-slate-500 font-mono">Port: {c.peerPort}</span>
                                        </div>
                                        <p className="text-[10px] font-mono text-slate-400 truncate" title={c.connectionName}>
                                          Conn: {c.connectionName}
                                        </p>
                                      </div>

                                      <div className="mt-2.5 pt-2.5 border-t border-slate-800/60 flex items-center justify-between text-[10px]">
                                        <span className="text-slate-500 font-mono">Tag: {c.consumerTag.substring(0, 18)}...</span>
                                        <div className="flex items-center gap-1">
                                          <span className={`w-1.5 h-1.5 rounded-full ${c.active ? 'bg-emerald-500' : 'bg-red-500'}`}></span>
                                          <span className={c.active ? 'text-emerald-400 font-bold' : 'text-red-400'}>
                                            {c.active ? 'Active' : 'Inactive'}
                                          </span>
                                        </div>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
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
      </div>
    </div>
  );
}
