import React from 'react';
import {
  Activity,
  Clock,
  AlertTriangle,
  Cpu
} from 'lucide-react';
import { MODULE_CONFIG } from './podRecordsConfig';

export default function PodRecordsAnalyticsView({ recordsWithDelta = [] }) {
  // Compute KPI metrics
  const validDeltas = recordsWithDelta.filter((r) => r.deltaSec !== null);
  const avgDelta =
    validDeltas.length > 0
      ? (validDeltas.reduce((acc, r) => acc + r.deltaSec, 0) / validDeltas.length).toFixed(2)
      : '0.00';

  const delayCount = validDeltas.filter((r) => r.deltaSec > 3.0).length;
  const delayPercent =
    validDeltas.length > 0 ? ((delayCount / validDeltas.length) * 100).toFixed(1) : '0.0';

  const activeModuleIds = new Set(recordsWithDelta.map((r) => r.modId));

  // Compute distribution per module
  const modDistribution = {};
  recordsWithDelta.forEach((r) => {
    modDistribution[r.modId] = (modDistribution[r.modId] || 0) + 1;
  });

  return (
    <div className="space-y-6">
      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Total Packets */}
        <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-lg">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Detak Terbaca</span>
            <Activity size={16} className="text-cyan-400" />
          </div>
          <div className="text-2xl font-black font-mono text-white">
            {recordsWithDelta.length.toLocaleString()}
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Paket detak modul tersimpan</p>
        </div>

        {/* KPI 2: Avg Interval */}
        <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-lg">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Rata-rata Interval</span>
            <Clock size={16} className="text-blue-400" />
          </div>
          <div className="text-2xl font-black font-mono text-cyan-300">
            {avgDelta} <span className="text-sm font-sans font-normal text-slate-400">detik</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Jeda waktu antar-detak reguler</p>
        </div>

        {/* KPI 3: Delay Ratio */}
        <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-lg">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Rasio Jeda Tinggi (&gt;3s)</span>
            <AlertTriangle size={16} className="text-amber-400" />
          </div>
          <div className="text-2xl font-black font-mono text-amber-300">
            {delayPercent}%
          </div>
          <p className="text-[11px] text-slate-500 mt-1">{delayCount} baris mengalami latency</p>
        </div>

        {/* KPI 4: Active Modules */}
        <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-lg">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Modul Terdeteksi</span>
            <Cpu size={16} className="text-emerald-400" />
          </div>
          <div className="text-2xl font-black font-mono text-emerald-300">
            {activeModuleIds.size} <span className="text-sm font-sans font-normal text-slate-400">/ 9 modul</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Unit hardware yang mengirim data</p>
        </div>
      </div>

      {/* Module Distribution Progress Bars */}
      <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800/80 shadow-2xl">
        <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
          <Cpu size={16} className="text-cyan-400" />
          <span>Distribusi Paket Detak per Modul Hardware</span>
        </h3>
        <div className="space-y-3">
          {MODULE_CONFIG.map((mod) => {
            const count = modDistribution[mod.id] || 0;
            const percent =
              recordsWithDelta.length > 0
                ? ((count / recordsWithDelta.length) * 100).toFixed(1)
                : '0.0';

            return (
              <div key={mod.id} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-300 flex items-center gap-1.5">
                    <span className="font-mono text-cyan-400 font-bold">{mod.id}</span>
                    <span>{mod.fullName}</span>
                  </span>
                  <span className="font-mono text-slate-400 font-semibold">
                    {count.toLocaleString()} detak ({percent}%)
                  </span>
                </div>
                <div className="w-full h-2.5 rounded-full bg-slate-950 overflow-hidden border border-slate-800/80">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-blue-500 transition-all duration-500"
                    style={{ width: `${percent}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
