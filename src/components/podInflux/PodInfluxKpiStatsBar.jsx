import React from 'react';

export default function PodInfluxKpiStatsBar({ stats, selectedFields = [], activePod }) {
  if (!stats) return null;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
      <div className="p-3 bg-slate-900/90 border border-slate-800 rounded-xl shadow">
        <span className="text-[10px] uppercase font-bold text-slate-400">Total Rekor</span>
        <div className="text-lg font-bold text-slate-100 mt-0.5">{stats.total.toLocaleString()}</div>
        <span className="text-[10px] text-slate-500">{stats.durationMs} ms</span>
      </div>

      {stats.numeric ? (
        <>
          <div className="p-3 bg-slate-900/90 border border-slate-800 rounded-xl shadow">
            <span className="text-[10px] uppercase font-bold text-slate-400">Nilai Terakhir</span>
            <div className="text-lg font-bold text-emerald-400 mt-0.5">{stats.latest}</div>
            <span className="text-[10px] text-slate-500 truncate block" title={selectedFields.join(', ')}>
              {selectedFields.join(', ')}
            </span>
          </div>

          <div className="p-3 bg-slate-900/90 border border-slate-800 rounded-xl shadow">
            <span className="text-[10px] uppercase font-bold text-slate-400">Rata-Rata</span>
            <div className="text-lg font-bold text-teal-300 mt-0.5">{stats.avg}</div>
            <span className="text-[10px] text-slate-500">Mean Value</span>
          </div>

          <div className="p-3 bg-slate-900/90 border border-slate-800 rounded-xl shadow">
            <span className="text-[10px] uppercase font-bold text-slate-400">Min / Max</span>
            <div className="text-sm font-bold text-slate-200 mt-1">
              <span className="text-cyan-400">{stats.min}</span> / <span className="text-rose-400">{stats.max}</span>
            </div>
            <span className="text-[10px] text-slate-500">Range Nilai</span>
          </div>

          <div className="p-3 bg-slate-900/90 border border-slate-800 rounded-xl shadow">
            <span className="text-[10px] uppercase font-bold text-slate-400">POD Host</span>
            <div className="text-sm font-bold text-slate-200 mt-1 truncate">
              {activePod?.name || 'POD'}
            </div>
            <span className="text-[10px] text-emerald-400">{activePod?.host}</span>
          </div>
        </>
      ) : (
        <div className="col-span-4 p-3 bg-slate-900/90 border border-slate-800 rounded-xl flex items-center justify-between text-xs text-slate-400">
          <span>Data bertipe non-numerik atau string. Visualisasi grafik tidak aktif.</span>
        </div>
      )}
    </div>
  );
}
