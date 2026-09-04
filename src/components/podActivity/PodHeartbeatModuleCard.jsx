import React from 'react';
import { ChevronDown, ChevronUp, RefreshCw } from 'lucide-react';
import { evaluateModuleHealth } from '../../utils/heartbeatThresholds';

export default function PodHeartbeatModuleCard({
  mod,
  data = {},
  thresholds,
  nowTimestamp,
  isCollapsed = false,
  onToggleCollapse,
  isFlashing = false,
  isStatusLoading = false,
  isResetLoading = false,
  onStatusClick,
  onResetClick
}) {
  const hasPort = Boolean(data.port || mod.defaultPort);
  const portName = data.port || mod.defaultPort;

  const health = evaluateModuleHealth(data, thresholds, nowTimestamp);
  const isDead = health.status === 'DEAD';
  const isFrozen = health.status === 'FROZEN';
  const isDelay = health.status === 'DELAY';
  const isHealthy = health.status === 'LIVE';
  const packetElapsedSec = health.packetElapsedSec;
  const hbElapsedSec = health.hbElapsedSec;

  return (
    <div
      className={`flex flex-col justify-between rounded-2xl bg-slate-900/85 backdrop-blur-md border transition-all duration-500 ease-out shadow-lg relative overflow-hidden group ${
        isFlashing
          ? 'border-cyan-400/60 shadow-[0_0_18px_rgba(6,182,212,0.15)] scale-[1.004]'
          : isDead || isFrozen
          ? 'border-rose-500/40 shadow-[0_0_15px_rgba(244,63,94,0.10)] bg-gradient-to-b from-rose-950/15 via-slate-900/85 to-slate-900/90 hover:border-rose-500/60'
          : isDelay
          ? 'border-amber-500/30 shadow-[0_0_12px_rgba(245,158,11,0.08)] bg-gradient-to-b from-amber-950/15 via-slate-900/85 to-slate-900/90 hover:border-amber-500/50'
          : 'border-slate-800/90 hover:border-slate-700/60 hover:bg-slate-900/95 hover:shadow-xl hover:shadow-black/20'
      }`}
    >
      {/* Discreet Ambient Corner Aura */}
      <div
        className={`absolute -top-8 -right-8 w-24 h-24 rounded-full blur-2xl pointer-events-none transition-opacity duration-700 ease-out ${
          isFlashing
            ? 'bg-cyan-400/25 scale-110 opacity-100'
            : isDead
            ? 'bg-rose-500/15 opacity-70 animate-pulse'
            : isFrozen
            ? 'bg-purple-500/20 opacity-70 animate-pulse'
            : isDelay
            ? 'bg-amber-500/10 opacity-50'
            : 'bg-emerald-500/10 opacity-25 group-hover:opacity-45'
        }`}
      />

      {/* Flash Bloom on Packet Receive */}
      <div
        className={`absolute inset-0 bg-gradient-to-r from-transparent via-cyan-400/5 to-transparent pointer-events-none transition-opacity duration-500 ease-out ${
          isFlashing ? 'opacity-100' : 'opacity-0'
        }`}
      />

      {/* Card Header: Title + Topic Tag + Status Badge + Collapse Toggle */}
      <div
        className={`flex items-center justify-between px-5 py-3.5 border-b select-none rounded-t-2xl cursor-pointer relative z-10 transition-colors duration-500 ${
          isDead || isFrozen
            ? 'border-rose-500/30 bg-rose-950/30'
            : isDelay
            ? 'border-amber-500/30 bg-amber-950/20'
            : 'border-slate-800/80 bg-slate-950/40 group-hover:bg-slate-950/60'
        }`}
      >
        <div
          onClick={onToggleCollapse}
          className="flex items-center gap-2.5 flex-1 min-w-0"
        >
          <h3
            className={`text-sm font-bold tracking-wide transition-colors duration-300 ease-out truncate ${
              isDead || isFrozen
                ? 'text-rose-300'
                : isDelay
                ? 'text-amber-300'
                : 'text-cyan-400 group-hover:text-cyan-300'
            }`}
          >
            {mod.name}
          </h3>
          <span className="text-[11px] font-mono text-slate-400 bg-slate-950/60 px-2 py-0.5 rounded-lg border border-slate-800 transition-colors duration-300 group-hover:border-slate-700 truncate shrink-0">
            {mod.topic}
          </span>

          {/* Health State Badge */}
          {isDead ? (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-rose-500/20 text-rose-300 border border-rose-500/40 shadow-[0_0_10px_rgba(244,63,94,0.2)] shrink-0">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500" />
              </span>
              <span>DEAD ({packetElapsedSec ? `${packetElapsedSec}s` : 'NO DATA'})</span>
            </span>
          ) : isFrozen ? (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-purple-500/20 text-purple-300 border border-purple-500/40 shadow-[0_0_10px_rgba(192,132,252,0.2)] shrink-0">
              <span className="w-2 h-2 rounded-full bg-purple-400 animate-pulse" />
              <span>FROZEN ({hbElapsedSec}s)</span>
            </span>
          ) : isDelay ? (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-[0_0_8px_rgba(251,191,36,0.15)] shrink-0">
              <span className="w-2 h-2 rounded-full bg-amber-400" />
              <span>DELAY ({Math.max(packetElapsedSec || 0, hbElapsedSec || 0)}s)</span>
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 shadow-[0_0_10px_rgba(52,211,153,0.15)] shrink-0">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,1)]" />
              </span>
              <span>LIVE</span>
            </span>
          )}
        </div>

        <button
          type="button"
          onClick={onToggleCollapse}
          className="p-1.5 bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg border border-slate-700/60 transition cursor-pointer shrink-0 ml-2"
          title={isCollapsed ? 'Buka Card' : 'Tutup Card'}
        >
          {isCollapsed ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
        </button>
      </div>

      {/* Card Body */}
      {!isCollapsed && (
        <div className="p-5 flex flex-col gap-4 relative z-10">
          {/* Row 1: 3 Metrics Columns (HB, DATE, ID Module) */}
          <div className="grid grid-cols-3 gap-2 items-center">
            {/* HB Column */}
            <div className="flex items-baseline gap-2">
              <span className="text-xs font-bold text-slate-400 tracking-wider">HB</span>
              <span
                className={`text-base font-black font-mono tracking-tight transition-all duration-300 ${
                  isFlashing
                    ? 'text-cyan-300 font-extrabold scale-105 drop-shadow-[0_0_8px_rgba(6,182,212,0.8)]'
                    : isDead
                    ? 'text-rose-400'
                    : isDelay
                    ? 'text-amber-300'
                    : data.hb !== null && data.hb !== undefined
                    ? 'text-white'
                    : 'text-slate-600'
                }`}
              >
                {data.hb !== null && data.hb !== undefined ? data.hb : '—'}
              </span>
            </div>

            {/* DATE Column */}
            <div className="flex flex-col justify-center">
              <div className="flex items-baseline gap-2">
                <span className="text-xs font-bold text-slate-400 tracking-wider">DATE</span>
                <span className="text-xs font-mono text-slate-300 truncate">
                  {data.date || '—'}
                </span>
              </div>
              {packetElapsedSec !== null && (
                <span
                  className={`text-[10px] font-mono mt-0.5 truncate ${
                    isDead
                      ? 'text-rose-400 font-bold'
                      : isFrozen
                      ? 'text-purple-400 font-bold'
                      : isDelay
                      ? 'text-amber-400'
                      : isHealthy
                      ? 'text-emerald-400 font-bold'
                      : 'text-slate-500'
                  }`}
                >
                  {isDead
                    ? packetElapsedSec
                      ? `${packetElapsedSec}s lalu`
                      : 'mati'
                    : isFrozen
                    ? `macet di #${data.hb}`
                    : isDelay
                    ? `delay ${Math.max(packetElapsedSec || 0, hbElapsedSec || 0)}s`
                    : isHealthy
                    ? '● live'
                    : `${packetElapsedSec}s lalu`}
                </span>
              )}
            </div>

            {/* ID Module Column */}
            <div className="flex items-baseline justify-end gap-2 text-right">
              <span className="text-xs font-bold text-slate-400 tracking-wider">ID Module</span>
              <span className="text-base font-black font-mono text-white">{mod.id}</span>
            </div>
          </div>

          {/* Row 2: Port Status Indicator & Action Buttons (STATUS, RESET) */}
          <div className="flex items-center justify-between pt-1">
            {/* Port & Glowing Dot */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-slate-400">port</span>
              {hasPort ? (
                <div className="flex items-center gap-2 bg-slate-950/60 px-2.5 py-1 rounded-lg border border-slate-800 shadow-inner">
                  <span className="text-xs font-bold font-mono text-white">{portName}</span>
                  <span className="relative flex h-2 w-2">
                    {isHealthy && (
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60" />
                    )}
                    <span
                      className={`relative inline-flex rounded-full h-2 w-2 transition-all ${
                        isHealthy
                          ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,1)]'
                          : isDelay
                          ? 'bg-amber-400 shadow-[0_0_6px_rgba(251,191,36,0.8)]'
                          : isFrozen
                          ? 'bg-purple-400 shadow-[0_0_6px_rgba(192,132,252,0.8)]'
                          : 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,1)]'
                      }`}
                      title={`Port ${portName} (${
                        isHealthy
                          ? 'Aktif'
                          : isDelay
                          ? 'Delay'
                          : isFrozen
                          ? 'Counter Macet'
                          : 'Mati / Timeout'
                      })`}
                    />
                  </span>
                </div>
              ) : (
                <div className="flex items-center gap-2 bg-slate-950/60 px-2.5 py-1 rounded-lg border border-slate-800">
                  <span className="w-2 h-2 rounded-full bg-rose-500/80" title="Port Belum Terdeteksi" />
                </div>
              )}
            </div>

            {/* Action Buttons (STATUS & RESET) */}
            <div className="flex items-center gap-2.5">
              <button
                type="button"
                disabled={isStatusLoading}
                onClick={onStatusClick}
                className="px-5 py-1.5 bg-slate-800/80 hover:bg-slate-700/90 text-slate-300 hover:text-white rounded-xl border border-slate-700/60 hover:border-slate-600/80 font-extrabold text-xs tracking-wider uppercase transition-all duration-300 ease-out shadow-sm hover:shadow active:scale-98 cursor-pointer select-none flex items-center justify-center min-w-[78px] disabled:opacity-50"
              >
                {isStatusLoading ? (
                  <RefreshCw size={12} className="animate-spin text-cyan-400" />
                ) : (
                  'STATUS'
                )}
              </button>
              <button
                type="button"
                disabled={isResetLoading}
                onClick={onResetClick}
                className="px-5 py-1.5 bg-slate-800/80 hover:bg-slate-700/90 text-slate-300 hover:text-white rounded-xl border border-slate-700/60 hover:border-slate-600/80 font-extrabold text-xs tracking-wider uppercase transition-all duration-300 ease-out shadow-sm hover:shadow active:scale-98 cursor-pointer select-none flex items-center justify-center min-w-[78px] disabled:opacity-50"
              >
                {isResetLoading ? (
                  <RefreshCw size={12} className="animate-spin text-rose-400" />
                ) : (
                  'RESET'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
