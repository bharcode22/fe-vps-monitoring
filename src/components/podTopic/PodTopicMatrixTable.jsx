import React from 'react';
import { Check, Copy, CheckCircle2, Zap } from 'lucide-react';

export default function PodTopicMatrixTable({
  activeMatrixList,
  pods,
  topicTypeFilter,
  copiedKey,
  onCopy,
  onQuickSyncTopic
}) {
  return (
    <div className="bg-slate-900/60 border border-slate-800 rounded-2xl overflow-x-auto shadow-xl">
      <table className="w-full text-left text-xs border-collapse">
        <thead>
          <tr className="bg-slate-950/80 border-b border-slate-800 text-slate-400">
            <th className="p-3.5 font-bold sticky left-0 bg-slate-950 z-10 min-w-[280px] lg:min-w-[340px]">
              Nama Topic / Event
            </th>
            <th className="p-3.5 font-semibold w-28">Tipe / Action</th>
            <th className="p-3.5 font-semibold text-center w-24">Kelengkapan</th>
            {pods?.map(pod => (
              <th key={pod.id} className="p-3.5 font-bold text-center min-w-[130px]">
                <div className="text-white font-bold truncate max-w-[130px]" title={pod.name}>{pod.name}</div>
                <div className="mt-1">
                  {pod.isOnline !== false ? (
                    <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 font-mono">
                      ONLINE
                    </span>
                  ) : (
                    <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-red-500/20 text-red-400 border border-red-500/30 font-mono animate-pulse" title="Server ini sedang offline">
                      OFFLINE
                    </span>
                  )}
                </div>
              </th>
            ))}
            <th className="p-3.5 text-right font-semibold min-w-[120px]">Aksi Cepat</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-800/60 font-mono text-xs">
          {activeMatrixList.length === 0 ? (
            <tr>
              <td colSpan={(pods?.length || 0) + 4} className="p-8 text-center text-slate-500 font-sans">
                Tidak ada data topic yang sesuai dengan filter.
              </td>
            </tr>
          ) : (
            activeMatrixList.map((item, idx) => {
              const keyName = item.topicKey || item.socketKey;
              const sample = item.sampleRow || {};

              // Collect missing pod IDs for this row (online pods only)
              const missingOnlinePodIds = [];
              pods?.forEach(pod => {
                if (pod.isOnline !== false && !item.presence?.[pod.id]?.present) {
                  missingOnlinePodIds.push(pod.id);
                }
              });

              const isMissing = missingOnlinePodIds.length > 0;

              return (
                <tr key={idx} className={`hover:bg-white/[0.02] transition-colors ${
                  isMissing ? 'bg-amber-500/[0.04]' : ''
                }`}>
                  {/* Topic Name */}
                  <td className="p-3.5 sticky left-0 bg-slate-900/95 z-10">
                    <div className="flex items-center gap-1.5">
                      <span className={`font-bold truncate max-w-[260px] lg:max-w-[340px] ${
                        topicTypeFilter === 'socket_topic' ? 'text-purple-300' : 'text-cyan-300'
                      }`} title={keyName}>
                        {keyName}
                      </span>
                      <button
                        onClick={() => onCopy(keyName, `t_${idx}`)}
                        className="text-slate-500 hover:text-cyan-400 p-0.5 cursor-pointer"
                        title="Salin Nama Topic"
                      >
                        {copiedKey === `t_${idx}` ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                      </button>
                    </div>
                    {sample.description && (
                      <div className="text-[10px] text-slate-500 truncate max-w-[260px] lg:max-w-[340px] font-sans mt-0.5">
                        {sample.description}
                      </div>
                    )}
                  </td>

                  {/* Type / Action */}
                  <td className="p-3.5 text-slate-400 font-sans text-[11px]">
                    {sample.type || sample.action || '-'}
                  </td>

                  {/* Status Count Pill */}
                  <td className="p-3.5 text-center">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      isMissing
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                        : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    }`}>
                      {item.presentCount}/{item.totalPods}
                    </span>
                  </td>

                  {/* Presence Checkmarks per POD with Click-to-Sync on Missing */}
                  {pods?.map(pod => {
                    const presenceInfo = item.presence?.[pod.id];
                    const isOffline = pod.isOnline === false || presenceInfo?.isOffline;
                    const isPresent = presenceInfo?.present;

                    return (
                      <td key={pod.id} className="p-3.5 text-center">
                        {isOffline ? (
                          <span
                            className="inline-flex items-center justify-center px-2 py-0.5 rounded-md bg-slate-800/80 text-slate-500 border border-slate-700/60 text-[10px] font-bold font-sans cursor-not-allowed select-none"
                            title={`${pod.name} sedang OFFLINE. Database tidak dapat diakses.`}
                          >
                            Offline
                          </span>
                        ) : isPresent ? (
                          <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-emerald-500/10 text-emerald-400" title={`Ada di database ${pod.name}`}>
                            <CheckCircle2 size={16} />
                          </span>
                        ) : (
                          <button
                            onClick={() => onQuickSyncTopic(keyName, [pod.id])}
                            className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-red-500/20 hover:bg-red-500/35 text-red-300 border border-red-500/40 text-[10px] font-bold transition-all cursor-pointer hover:scale-105 shadow-sm"
                            title={`Topic ini belum ada di ${pod.name}. Klik untuk sinkronkan sekarang.`}
                          >
                            <Zap size={11} className="text-amber-400 fill-amber-400" />
                            <span>Sync</span>
                          </button>
                        )}
                      </td>
                    );
                  })}

                  {/* Quick Action Button */}
                  <td className="p-3.5 text-right font-sans">
                    {isMissing ? (
                      <button
                        onClick={() => onQuickSyncTopic(keyName, missingOnlinePodIds)}
                        className="px-3 py-1 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-slate-950 font-extrabold rounded-lg text-xs flex items-center justify-end gap-1 ml-auto shadow-md shadow-amber-500/20 cursor-pointer transition-all hover:scale-105"
                        title={`Sinkronkan topic ini ke ${missingOnlinePodIds.length} POD yang belum memiliki data`}
                      >
                        <Zap size={12} className="fill-slate-950" />
                        <span>Sync ({missingOnlinePodIds.length})</span>
                      </button>
                    ) : (
                      <span className="text-[10px] text-emerald-400/80 font-mono font-bold flex items-center justify-end gap-1">
                        <Check size={12} /> Synced
                      </span>
                    )}
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}
