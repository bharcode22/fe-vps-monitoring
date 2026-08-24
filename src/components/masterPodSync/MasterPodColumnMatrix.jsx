import React from 'react';
import { CheckCircle2, AlertTriangle, Key } from 'lucide-react';

export default function MasterPodColumnMatrix({
  columnsMatrix = [],
  pods = []
}) {
  if (!columnsMatrix || columnsMatrix.length === 0) return null;

  return (
    <div className="bg-slate-900/60 border border-slate-800 rounded-2xl overflow-x-auto shadow-xl">
      <table className="w-full text-left text-xs border-collapse font-mono">
        <thead>
          <tr className="bg-slate-950/80 border-b border-slate-800 text-slate-400 font-sans">
            <th className="p-3.5 font-bold sticky left-0 bg-slate-950 z-10 min-w-[220px]">
              Nama Kolom Master
            </th>
            <th className="p-3.5 font-semibold w-28">Tipe Data</th>
            <th className="p-3.5 font-semibold text-center w-24">Kelengkapan</th>
            {pods.map(pod => (
              <th key={pod.id} className="p-3.5 font-bold text-center min-w-[120px]">
                <div className="text-white font-bold truncate max-w-[120px]" title={pod.name}>
                  {pod.name}
                </div>
                <div className="mt-1">
                  {pod.isOnline ? (
                    <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 font-mono">
                      ONLINE
                    </span>
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
          {columnsMatrix.map((col, idx) => (
            <tr key={idx} className="hover:bg-white/[0.02] transition-colors">
              {/* Column Name */}
              <td className="p-3.5 sticky left-0 bg-slate-900/95 z-10">
                <div className="flex items-center gap-1.5 font-bold text-cyan-300">
                  {col.isPk && <Key size={13} className="text-amber-400 shrink-0" title="Primary Key" />}
                  <span>{col.columnName}</span>
                </div>
                <div className="text-[10px] text-slate-500 font-sans mt-0.5">
                  {col.isNullable === 'YES' ? 'Nullable' : 'NOT NULL'}
                </div>
              </td>

              {/* Data Type */}
              <td className="p-3.5 text-slate-400 font-sans text-[11px]">
                <span className="bg-slate-950 px-2 py-0.5 rounded border border-slate-800 text-purple-300 font-mono">
                  {col.dataType}
                </span>
              </td>

              {/* Kelengkapan Count */}
              <td className="p-3.5 text-center">
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    col.presentCount < col.totalPods
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                      : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                  }`}
                >
                  {col.presentCount}/{col.totalPods}
                </span>
              </td>

              {/* Presence per POD */}
              {pods.map(pod => {
                const presence = col.presence?.[pod.id];
                const isOffline = !pod.isOnline || presence?.isOnline === false;
                const exists = presence?.exists;
                const typeMatch = presence?.typeMatch;

                return (
                  <td key={pod.id} className="p-3.5 text-center">
                    {isOffline ? (
                      <span className="text-[10px] text-slate-500 font-sans font-bold">Offline</span>
                    ) : exists ? (
                      typeMatch ? (
                        <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-emerald-500/10 text-emerald-400" title={`Kolom ada & tipe data cocok (${col.dataType})`}>
                          <CheckCircle2 size={16} />
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px]" title={`Tipe data berbeda: ${presence.podType}`}>
                          <AlertTriangle size={12} />
                          <span>{presence.podType}</span>
                        </span>
                      )
                    ) : (
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-red-500/20 text-red-300 border border-red-500/30 text-[10px] font-bold font-sans">
                        Missing
                      </span>
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
