import React, { useState } from 'react';
import { CheckCircle2, Zap, Copy, Check, Info } from 'lucide-react';

export default function MasterPodDataMatrix({
  dataMatrix = [],
  pods = [],
  onInspectPod,
  onQuickSyncRow
}) {
  const [copiedKey, setCopiedKey] = useState(null);

  const handleCopy = (text, key) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  if (!dataMatrix || dataMatrix.length === 0) {
    return (
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-8 text-center text-slate-500 font-sans text-xs">
        Tabel master tidak memiliki data baris atau belum ada perbandingan data.
      </div>
    );
  }

  return (
    <div className="bg-slate-900/60 border border-slate-800 rounded-2xl overflow-x-auto shadow-xl">
      <table className="w-full text-left text-xs border-collapse font-mono">
        <thead>
          <tr className="bg-slate-950/80 border-b border-slate-800 text-slate-400 font-sans">
            <th className="p-3.5 font-bold sticky left-0 bg-slate-950 z-10 min-w-[240px] lg:min-w-[300px]">
              Baris / Identifier Master
            </th>
            <th className="p-3.5 font-semibold text-center w-24">Kelengkapan</th>
            {pods.map(pod => (
              <th key={pod.id} className="p-3.5 font-bold text-center min-w-[120px]">
                <div className="text-white font-bold truncate max-w-[120px]" title={pod.name}>
                  {pod.name}
                </div>
                <div className="mt-0.5 text-[10px] text-slate-400 font-normal">
                  {pod.rowCount || 0} baris
                </div>
                <div className="mt-1">
                  {pod.isOnline ? (
                    <button
                      onClick={() => onInspectPod(pod)}
                      className={`text-[9px] font-bold px-2 py-0.5 rounded-full border cursor-pointer transition-all hover:scale-105 ${
                        pod.status === 'SYNCED'
                          ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                          : 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                      }`}
                      title="Klik untuk rincian perbedaan baris data"
                    >
                      {pod.status === 'SYNCED' ? 'SYNCED' : 'DRIFT / KURANG'}
                    </button>
                  ) : (
                    <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-red-500/20 text-red-400 border border-red-500/30 font-mono animate-pulse">
                      OFFLINE
                    </span>
                  )}
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-800/60 text-xs">
          {dataMatrix.map((item, idx) => {
            const isMissingInSome = item.presentCount < item.totalPods;

            return (
              <tr
                key={idx}
                className={`hover:bg-white/[0.02] transition-colors ${
                  isMissingInSome ? 'bg-amber-500/[0.03]' : ''
                }`}
              >
                {/* Row Key */}
                <td className="p-3.5 sticky left-0 bg-slate-900/95 z-10">
                  <div className="flex items-center gap-1.5 font-bold text-cyan-300">
                    <span className="truncate max-w-[240px] lg:max-w-[300px]" title={item.rowKey}>
                      {item.rowKey}
                    </span>
                    <button
                      onClick={() => handleCopy(item.rowKey, `r_${idx}`)}
                      className="text-slate-500 hover:text-cyan-400 p-0.5 cursor-pointer"
                      title="Salin Key"
                    >
                      {copiedKey === `r_${idx}` ? (
                        <Check size={12} className="text-emerald-400" />
                      ) : (
                        <Copy size={12} />
                      )}
                    </button>
                  </div>
                  {item.sampleData && (
                    <div className="text-[10px] text-slate-500 truncate max-w-[240px] lg:max-w-[300px] font-sans mt-0.5">
                      {item.sampleData.name || item.sampleData.title || item.sampleData.description || item.sampleData.value || ''}
                    </div>
                  )}
                </td>

                {/* Status Count Pill */}
                <td className="p-3.5 text-center">
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      isMissingInSome
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                        : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    }`}
                  >
                    {item.presentCount}/{item.totalPods}
                  </span>
                </td>

                {/* Presence Checkmarks per POD */}
                {pods.map(pod => {
                  const presence = item.presence?.[pod.id];
                  const isOffline = !pod.isOnline || presence?.isOnline === false;
                  const isPresent = presence?.present;

                  return (
                    <td key={pod.id} className="p-3.5 text-center">
                      {isOffline ? (
                        <span className="text-[10px] text-slate-500 font-sans font-bold">Offline</span>
                      ) : isPresent ? (
                        <span
                          className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-emerald-500/10 text-emerald-400"
                          title={`Baris ini ada di ${pod.name}`}
                        >
                          <CheckCircle2 size={16} />
                        </span>
                      ) : (
                        <button
                          onClick={() => onQuickSyncRow(pod.id, item.rowKey)}
                          className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-red-500/20 hover:bg-red-500/35 text-red-300 border border-red-500/40 text-[10px] font-bold transition-all cursor-pointer hover:scale-105 shadow-sm font-sans"
                          title={`Baris data ini belum ada di ${pod.name}. Klik untuk sinkronkan.`}
                        >
                          <Zap size={11} className="text-amber-400 fill-amber-400" />
                          <span>Sync</span>
                        </button>
                      )}
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
