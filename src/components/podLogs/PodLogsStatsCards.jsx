import React from 'react';
import { Database, ArrowDownCircle, HardDrive, Clock } from 'lucide-react';

export default function PodLogsStatsCards({
  auditData,
  v3Stats
}) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
      {/* Card 1: Master Total Rows */}
      <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between">
        <span className="text-xs text-slate-400 flex items-center gap-1.5">
          <Database size={15} className="text-indigo-400" /> Total di Master RDS
        </span>
        <div className="my-2">
          <div className="text-2xl font-mono font-bold text-white">
            {auditData?.master?.totalRows?.toLocaleString() || 0}
          </div>
          <span className="text-[11px] text-slate-400">baris log tersimpan</span>
        </div>
        <div className="text-[10px] text-slate-500 font-mono truncate">
          DB: {auditData?.master?.name}
        </div>
      </div>

      {/* Card 2: Total Unsynced Logs in POD V3 */}
      <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between">
        <span className="text-xs text-slate-400 flex items-center gap-1.5">
          <ArrowDownCircle size={15} className="text-amber-400" /> Belum Ditarik (POD V3)
        </span>
        <div className="my-2">
          <div className="text-2xl font-mono font-bold text-amber-400">
            {v3Stats.totalUnsynced.toLocaleString()}
          </div>
          <span className="text-[11px] text-slate-400">
            baris dari {v3Stats.podsWithUnsynced} unit POD V3
          </span>
        </div>
        <div className="text-[10px] text-amber-300/80 font-medium">
          Siap ditarik ke Master DB
        </div>
      </div>

      {/* Card 3: Total Logs on All POD V3s */}
      <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between">
        <span className="text-xs text-slate-400 flex items-center gap-1.5">
          <HardDrive size={15} className="text-cyan-400" /> Total Log di POD V3
        </span>
        <div className="my-2">
          <div className="text-2xl font-mono font-bold text-cyan-400">
            {v3Stats.totalRows.toLocaleString()}
          </div>
          <span className="text-[11px] text-slate-400">baris di database POD</span>
        </div>
        <div className="text-[10px] text-slate-500 font-mono">
          {v3Stats.onlineUnits} dari {v3Stats.totalUnits} POD V3 online
        </div>
      </div>

      {/* Card 4: Latest Master Log Date */}
      <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between">
        <span className="text-xs text-slate-400 flex items-center gap-1.5">
          <Clock size={15} className="text-emerald-400" /> Log Terakhir di Master
        </span>
        <div className="my-2">
          <div className="text-xs font-mono font-bold text-emerald-400 truncate">
            {auditData?.master?.latestCreated
              ? new Date(auditData.master.latestCreated).toLocaleString('id-ID')
              : 'Belum ada log'}
          </div>
          <span className="text-[11px] text-slate-400 mt-1 block">Waktu event terbaru</span>
        </div>
        <div className="text-[10px] text-slate-500 font-mono">
          Sinkronisasi berkala
        </div>
      </div>
    </div>
  );
}
