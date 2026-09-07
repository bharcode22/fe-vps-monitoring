import React from 'react';
import {
  HardDrive,
  Zap,
  Activity,
  FileText,
  Radio
} from 'lucide-react';

export default function PodRecordsSubHeader({
  serverDisplayName,
  safeFolderName,
  activeCategory,
  onSelectCategory,
  selectedDate,
  recordsCount,
  activeFileName = null,
  viewMode = 'files',
  onToggleLiveStream
}) {
  const displayFolder = selectedDate === 'ALL' ? 'semua_folder' : (selectedDate || 'today');
  const pathSuffix = activeFileName
    ? activeFileName
    : activeCategory === 'state'
    ? 'state.json'
    : activeCategory === 'events'
    ? `events_${displayFolder}.jsonl`
    : activeCategory === 'current'
    ? `current_*_${displayFolder}.jsonl`
    : activeCategory === 'heartbeats'
    ? `hb_*_${displayFolder}.jsonl`
    : `*_${displayFolder}.jsonl`;

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
              pods/{safeFolderName}/{displayFolder}/{pathSuffix}
            </span>
          </span>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700">
            Retensi 14 Hari
          </span>
        </div>
        <p className="text-xs text-slate-400 mt-1">
          {viewMode === 'live' ? (
            <span className="text-emerald-400 font-mono font-bold flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
              Mode Live Stream Telemetri Aktif &bull; Aliran data sensor langsung detik-per-detik
            </span>
          ) : activeFileName ? (
            <>
              Berkas aktif: <span className="text-cyan-300 font-bold font-mono">{activeFileName}</span> &bull; Data dimuat:{' '}
              <span className="text-white font-bold font-mono">{recordsCount} baris</span>
            </>
          ) : (
            <>
              Folder: <span className="text-cyan-300 font-bold font-mono">{selectedDate}</span> &bull; Total berkas di folder:{' '}
              <span className="text-white font-bold font-mono">{recordsCount} berkas</span>
            </>
          )}
        </p>
      </div>

      {/* Right Controls: Live Telemetry Toggle & Category Tabs */}
      <div className="flex items-center gap-2.5 flex-wrap shrink-0">
        {/* Live Stream Telemetry Toggle Button */}
        {onToggleLiveStream && (
          <button
            onClick={onToggleLiveStream}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 shadow-sm ${
              viewMode === 'live'
                ? 'bg-rose-500/25 text-rose-300 border border-rose-500/50 shadow-rose-500/10 hover:bg-rose-500/35'
                : 'bg-slate-900 hover:bg-slate-800 text-slate-200 hover:text-white border border-slate-700/80 shadow-sm'
            }`}
            title={viewMode === 'live' ? 'Kembali ke penjelajah berkas' : 'Buka grafik streaming telemetri real-time'}
          >
            <span className="relative flex h-2 w-2">
              <span
                className={`animate-ping absolute inline-flex h-full w-full rounded-full ${
                  viewMode === 'live' ? 'bg-rose-400 opacity-75' : 'bg-emerald-400 opacity-75'
                }`}
              />
              <span
                className={`relative inline-flex rounded-full h-2 w-2 ${
                  viewMode === 'live' ? 'bg-rose-500' : 'bg-emerald-500'
                }`}
              />
            </span>
            <span>{viewMode === 'live' ? 'Keluar Live Stream' : '🔴 Live Telemetri'}</span>
          </button>
        )}

        {/* Category Switcher Tabs */}
        {viewMode !== 'live' && (
          <div className="flex items-center p-1 bg-slate-950/80 rounded-xl border border-slate-800 flex-wrap gap-0.5">
            <button
              onClick={() => onSelectCategory('all')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeCategory === 'all' || !activeCategory
                  ? 'bg-gradient-to-r from-cyan-500/25 to-blue-500/25 text-cyan-300 border border-cyan-500/40 shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Semua
            </button>
            <button
              onClick={() => onSelectCategory('current')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                activeCategory === 'current'
                  ? 'bg-gradient-to-r from-amber-500/25 to-cyan-500/25 text-amber-300 border border-amber-500/40 shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="Berkas yang berisi telemetri arus modul (current)"
            >
              <Zap size={12} className={activeCategory === 'current' ? 'text-amber-400 fill-amber-400' : 'text-amber-500'} />
              <span>Arus (Current)</span>
            </button>
            <button
              onClick={() => onSelectCategory('heartbeats')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                activeCategory === 'heartbeats'
                  ? 'bg-gradient-to-r from-cyan-500/25 to-blue-500/25 text-cyan-300 border border-cyan-500/40 shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Radio size={12} className={activeCategory === 'heartbeats' ? 'text-cyan-400' : 'text-slate-500'} />
              <span>Detak (Heartbeat)</span>
            </button>
            <button
              onClick={() => onSelectCategory('events')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                activeCategory === 'events'
                  ? 'bg-gradient-to-r from-cyan-500/25 to-blue-500/25 text-cyan-300 border border-cyan-500/40 shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Activity size={12} className={activeCategory === 'events' ? 'text-cyan-400' : 'text-slate-500'} />
              <span>Insiden</span>
            </button>
            <button
              onClick={() => onSelectCategory('state')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                activeCategory === 'state'
                  ? 'bg-gradient-to-r from-cyan-500/25 to-blue-500/25 text-cyan-300 border border-cyan-500/40 shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <FileText size={12} className={activeCategory === 'state' ? 'text-cyan-400' : 'text-slate-500'} />
              <span>Snapshot</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
