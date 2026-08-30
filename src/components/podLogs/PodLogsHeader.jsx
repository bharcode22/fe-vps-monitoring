import React from 'react';
import { Database, ShieldCheck, RefreshCw } from 'lucide-react';

export default function PodLogsHeader({
  masters = [],
  selectedMasterId,
  onSelectMaster,
  onRefreshAudit,
  isLoadingAudit,
  isPulling
}) {
  return (
    <div className="bg-slate-900/90 border border-slate-800/80 rounded-2xl p-4 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
      <div className="flex items-center gap-3">
        <div className="p-3 bg-gradient-to-br from-rose-500/20 via-pink-500/20 to-indigo-500/20 text-rose-400 border border-rose-500/30 rounded-2xl shadow-inner">
          <Database size={24} />
        </div>
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-base font-bold text-white tracking-wide">POD Logs Sync Manager</h1>
            <span className="text-[10px] font-mono px-2 py-0.5 bg-rose-500/20 text-rose-300 border border-rose-500/30 rounded-md font-extrabold flex items-center gap-1">
              <ShieldCheck size={12} className="text-rose-400" />
              KHUSUS POD V3
            </span>
            <span className="text-[10px] font-mono px-2 py-0.5 bg-slate-800 text-slate-400 border border-slate-700 rounded-md">
              V2 &amp; Non-POD Dikecualikan
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Pipeline penarikan data tabel <code className="text-cyan-300 font-mono">pod_logs</code> skala besar dari armada <b className="text-white">POD V3</b> ke Master Database RDS AWS.
          </p>
        </div>
      </div>

      {/* Master Selector & Action Buttons */}
      <div className="flex items-center gap-3 w-full md:w-auto flex-wrap justify-between md:justify-end">
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400 font-semibold">Master DB:</span>
          <select
            value={selectedMasterId || ''}
            onChange={(e) => onSelectMaster(parseInt(e.target.value, 10))}
            className="bg-slate-950 border border-slate-700 text-slate-200 text-xs rounded-xl px-3 py-1.5 focus:outline-none focus:border-rose-500 cursor-pointer font-medium"
          >
            {masters.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name} ({m.host})
              </option>
            ))}
          </select>
        </div>

        <button
          onClick={onRefreshAudit}
          disabled={isLoadingAudit || isPulling}
          className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold flex items-center gap-1.5 border border-slate-700 transition-colors cursor-pointer disabled:opacity-40"
          title="Periksa Ulang Jumlah Baris"
        >
          <RefreshCw size={14} className={isLoadingAudit ? 'animate-spin text-rose-400' : ''} />
          <span>Audit</span>
        </button>
      </div>
    </div>
  );
}
