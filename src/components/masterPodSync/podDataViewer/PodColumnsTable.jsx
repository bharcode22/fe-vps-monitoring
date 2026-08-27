import React from 'react';
import { CheckCircle2 } from 'lucide-react';

export default function PodColumnsTable({ pod, columnsMatrix = [] }) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-slate-800 max-h-80 overflow-y-auto shadow-inner bg-slate-950/70">
      <table className="w-full text-left text-xs border-collapse font-mono">
        <thead>
          <tr className="bg-slate-900/95 border-b border-slate-800 text-slate-400 sticky top-0 z-10 font-sans">
            <th className="p-3 font-bold">Nama Kolom Master</th>
            <th className="p-3 font-bold">Tipe Data Master</th>
            <th className="p-3 font-semibold text-center w-36">Status di {pod.name}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-800/50 text-[11px]">
          {columnsMatrix.map((col, idx) => {
            const presence = col.presence?.[pod.id];
            const exists = presence?.exists;
            const typeMatch = presence?.typeMatch;

            return (
              <tr key={idx} className="hover:bg-white/[0.02] transition-colors">
                <td className="p-3 font-bold text-cyan-300">{col.columnName}</td>
                <td className="p-3 text-purple-300">{col.dataType}</td>
                <td className="p-3 text-center font-sans">
                  {exists ? (
                    typeMatch ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold">
                        <CheckCircle2 size={12} /> Kolom Cocok
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] font-bold">
                        Tipe Beda: {presence.podType}
                      </span>
                    )
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-500/20 text-red-300 border border-red-500/30 text-[10px] font-bold">
                      Kolom Missing
                    </span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
