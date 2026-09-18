import React from 'react';
import {
  Play,
  Pause,
  Square,
  Repeat,
  Volume2,
  Clock,
  Activity
} from 'lucide-react';

export default function PlaybackController({
  currentTime = 0,
  duration = 1200,
  isPlaying = false,
  isRepeat = false,
  audioCtxState = 'Suspended',
  systemStatus = 'Ready',
  onPlayPause,
  onStop,
  onToggleRepeat,
  onSeek
}) {
  // Format MM:SS.SS
  const formatAccurateTime = (sec) => {
    const total = Math.max(0, sec || 0);
    const m = Math.floor(total / 60);
    const s = Math.floor(total % 60);
    const hundredths = Math.floor((total % 1) * 100);
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}.${String(hundredths).padStart(2, '0')}`;
  };

  return (
    <header className="h-16 bg-slate-900 border-b border-slate-800 flex items-center justify-between px-4 sm:px-6 shrink-0 z-30 shadow-md">
      {/* Title & Brand */}
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-xl bg-gradient-to-br from-amber-500/20 to-orange-500/10 border border-amber-500/30 text-amber-400 shadow-sm">
          <Activity size={18} />
        </div>
        <div>
          <h1 className="font-extrabold text-sm sm:text-base tracking-wider text-slate-100 flex items-center gap-1.5">
            RE<span className="text-amber-400">GENESIS</span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 uppercase tracking-widest ml-1">
              Studio & Simulator
            </span>
          </h1>
          <p className="text-[10px] text-slate-400 hidden sm:block">
            Universal Time-Series Modality & Hardware Signal Engine
          </p>
        </div>
      </div>

      {/* Center Playback Console */}
      <div className="flex items-center gap-2 sm:gap-4 bg-slate-950/80 border border-slate-800 rounded-xl px-3 py-1.5 shadow-inner">
        {/* Time Display */}
        <span className="font-mono text-amber-400 font-bold text-xs sm:text-sm w-20 sm:w-24 text-center">
          {formatAccurateTime(currentTime)}
        </span>

        {/* Play/Pause */}
        <button
          type="button"
          onClick={onPlayPause}
          className={`w-8 h-8 flex items-center justify-center rounded-lg transition ${
            isPlaying
              ? 'bg-amber-500 text-slate-950 hover:bg-amber-400 shadow-md shadow-amber-500/20'
              : 'bg-slate-800 hover:bg-slate-700 text-slate-200'
          }`}
          title={isPlaying ? 'Pause' : 'Play'}
        >
          {isPlaying ? <Pause size={15} /> : <Play size={15} className="ml-0.5" />}
        </button>

        {/* Stop */}
        <button
          type="button"
          onClick={onStop}
          className="w-8 h-8 flex items-center justify-center rounded-lg bg-slate-800 hover:bg-slate-700 text-rose-400 transition"
          title="Stop & Reset"
        >
          <Square size={13} />
        </button>

        {/* Repeat */}
        <button
          type="button"
          onClick={onToggleRepeat}
          className={`w-8 h-8 flex items-center justify-center rounded-lg transition ${
            isRepeat
              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
              : 'bg-slate-800 hover:bg-slate-700 text-slate-400'
          }`}
          title="Toggle Repeat Loop"
        >
          <Repeat size={14} />
        </button>

        {/* Seek Bar */}
        <div className="flex items-center gap-2">
          <input
            type="range"
            min="0"
            max={duration > 0 ? duration : 1200}
            step="0.1"
            value={currentTime}
            onChange={(e) => onSeek(parseFloat(e.target.value))}
            className="w-24 sm:w-48 accent-amber-400 cursor-pointer"
          />
          <span className="text-[10px] text-slate-500 font-mono hidden md:inline">
            /{formatAccurateTime(duration)}
          </span>
        </div>
      </div>

      {/* Right Telemetry Health */}
      <div className="hidden lg:flex items-center gap-4 text-[11px] text-right font-mono">
        <div>
          <span className="text-slate-500">Status: </span>
          <span
            className={`font-bold ${
              systemStatus === 'Playing'
                ? 'text-amber-400'
                : systemStatus === 'Ready'
                ? 'text-emerald-400'
                : 'text-slate-300'
            }`}
          >
            {systemStatus}
          </span>
        </div>
        <div>
          <span className="text-slate-500">AudioCtx: </span>
          <span
            className={`font-bold ${
              audioCtxState === 'Running' ? 'text-cyan-400' : 'text-slate-400'
            }`}
          >
            {audioCtxState}
          </span>
        </div>
      </div>
    </header>
  );
}
