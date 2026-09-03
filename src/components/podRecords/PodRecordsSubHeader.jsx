import React from 'react';
import {
  HardDrive,
  Zap,
  Activity,
  FileText
} from 'lucide-react';

export default function PodRecordsSubHeader({
  serverDisplayName,
  safeFolderName,
  activeCategory,
  onSelectCategory,
  selectedDate,
  recordsCount
}) {
  return (
    <div className="p-3 sm:p-4 bg-slate-900/40 border-b border-slate-800/80 flex flex-col md:flex-row md:items-center justify-between gap-3 shrink-0">
      <div>
        <div className="flex items-center gap-2.5 flex-wrap">
          <h2 className="text-lg sm:text-xl font-black text-white tracking-tight">
            {serverDisplayName}
          </h2>
          <span className="text-[11px] font-mono px-2.5 py-0.5 rounded-md bg-slate-800 text-cyan-300 border border-slate-700 flex items-center gap-1">
            <HardDrive size={12} className="text-cyan-400" />
            <span>
              pods/{safeFolderName}/{activeCategory === 'heartbeats' ? 'heartbeats' : activeCategory === 'events' ? 'events' : 'state'}/{selectedDate}.jsonl
            </span>
          </span>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700">
            Retensi 14 Hari
          </span>
        </div>
        <p className="text-xs text-slate-400 mt-1">
          Menampilkan rekaman tanggal <span className="text-cyan-300 font-bold font-mono">{selectedDate}</span> &bull; Total data:{' '}
          <span className="text-white font-bold font-mono">{recordsCount} baris</span>
        </p>
      </div>

      {/* Category Switcher Tabs */}
      <div className="flex items-center p-1 bg-slate-950/80 rounded-xl border border-slate-800 shrink-0">
        <button
          onClick={() => onSelectCategory('heartbeats')}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
            activeCategory === 'heartbeats'
              ? 'bg-gradient-to-r from-cyan-500/25 to-blue-500/25 text-cyan-300 border border-cyan-500/40 shadow-sm'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Zap size={13} className={activeCategory === 'heartbeats' ? 'text-cyan-400' : 'text-slate-500'} />
          <span>Detak (Heartbeats)</span>
        </button>
        <button
          onClick={() => onSelectCategory('events')}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
            activeCategory === 'events'
              ? 'bg-gradient-to-r from-cyan-500/25 to-blue-500/25 text-cyan-300 border border-cyan-500/40 shadow-sm'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Activity size={13} className={activeCategory === 'events' ? 'text-cyan-400' : 'text-slate-500'} />
          <span>Insiden &amp; Peristiwa</span>
        </button>
        <button
          onClick={() => onSelectCategory('state')}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
            activeCategory === 'state'
              ? 'bg-gradient-to-r from-cyan-500/25 to-blue-500/25 text-cyan-300 border border-cyan-500/40 shadow-sm'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <FileText size={13} className={activeCategory === 'state' ? 'text-cyan-400' : 'text-slate-500'} />
          <span>Snapshot (state.json)</span>
        </button>
      </div>
    </div>
  );
}
