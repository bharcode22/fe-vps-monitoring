import React from 'react';
import {
  ArrowLeft,
  Radio,
  WifiOff,
  RefreshCw,
  Database,
  Play,
  Pause,
  RotateCcw,
  Cpu
} from 'lucide-react';
import { MODULE_CONFIG } from '../podRecordsConfig';
import { formatWindowLabel, formatWindowDesc } from './liveStreamConfig';
import LiveWindowSelector from './LiveWindowSelector';

export default function LiveStreamToolbar({
  onBackToFiles,
  isConnected,
  isPaused,
  onTogglePause,
  isLoadingBackfill,
  backfillInfo,
  podName,
  lastTickTime,
  selectedModule,
  onModuleChange,
  windowSeconds,
  onWindowChange,
  onResetBuffer
}) {
  return (
    <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800/80 shadow-lg backdrop-blur-sm space-y-3.5">
      {/* Tier 1: Title, Status Badges & Stream Actions (Play/Pause, Reset) */}
      <div className="flex items-center justify-between gap-4 flex-wrap pb-3 border-b border-slate-800/60">
        {/* Left: Back Button, Radio Icon, Title & Live Badges */}
        <div className="flex items-center gap-3 min-w-0">
          {onBackToFiles && (
            <button
              onClick={onBackToFiles}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition-all cursor-pointer shadow-sm shrink-0"
              title="Kembali ke Daftar Berkas"
            >
              <ArrowLeft size={16} />
            </button>
          )}

          <div className="p-2 rounded-xl bg-rose-500/15 text-rose-400 border border-rose-500/30 shrink-0">
            <Radio size={18} className={isConnected && !isPaused ? 'animate-pulse' : ''} />
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-sm font-black text-white tracking-wide">
                Live Telemetri Stream
              </h3>
              {isConnected ? (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                  LIVE 1s
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-rose-500/15 text-rose-400 border border-rose-500/30">
                  <WifiOff size={10} /> TERPUTUS
                </span>
              )}
              {isPaused && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                  STREAM DIJEDA
                </span>
              )}
              {isLoadingBackfill ? (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                  <RefreshCw size={10} className="animate-spin text-cyan-400" />
                  Memuat Riwayat...
                </span>
              ) : backfillInfo && backfillInfo.count > 0 ? (
                <span
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30"
                  title={`Riwayat terhubung: ${backfillInfo.count} titik waktu dari berkas JSONL tersimpan (${formatWindowDesc(backfillInfo.windowSeconds)})`}
                >
                  <Database size={10} className="text-emerald-400" />
                  Riwayat JSON ({backfillInfo.count} titik &bull; {formatWindowLabel(backfillInfo.windowSeconds)})
                </span>
              ) : null}
            </div>
            <span className="text-[11px] text-slate-400 block mt-0.5">
              {podName} &bull; Terkini: {lastTickTime || 'Menunggu data...'}
            </span>
          </div>
        </div>

        {/* Right: Play/Pause & Reset Buffer Controls */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Pause / Resume Button */}
          <button
            onClick={onTogglePause}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-sm ${
              isPaused
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500/30'
                : 'bg-amber-500/20 text-amber-300 border border-amber-500/40 hover:bg-amber-500/30'
            }`}
            title={isPaused ? 'Lanjutkan aliran grafik live' : 'Jeda grafik untuk inspeksi data'}
          >
            {isPaused ? <Play size={13} className="fill-current" /> : <Pause size={13} className="fill-current" />}
            <span>{isPaused ? 'Lanjutkan' : 'Jeda'}</span>
          </button>

          {/* Reset Buffer Button */}
          <button
            onClick={onResetBuffer}
            className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition-all cursor-pointer shadow-sm flex items-center gap-1.5 text-xs font-medium"
            title="Bersihkan buffer & muat ulang grafik live"
          >
            <RotateCcw size={13} />
            <span className="hidden sm:inline">Reset</span>
          </button>
        </div>
      </div>

      {/* Tier 2: Configuration Bar (Module Selector on Left, Window Selector on Right) */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        {/* Left: Module Selector */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs shadow-inner">
            <Cpu size={14} className="text-cyan-400 shrink-0" />
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Modul:</span>
            <select
              value={selectedModule}
              onChange={(e) => onModuleChange(Number(e.target.value))}
              className="bg-transparent text-xs font-bold text-cyan-300 focus:outline-none cursor-pointer pr-1"
            >
              {MODULE_CONFIG.map((m) => (
                <option key={m.id} value={m.id} className="bg-slate-900 text-slate-200 py-1">
                  {m.id} - {m.fullName}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Right: Sliding Window Size Selector */}
        <LiveWindowSelector
          windowSeconds={windowSeconds}
          onWindowChange={onWindowChange}
        />
      </div>
    </div>
  );
}
