import React, { memo } from 'react';
import {
  CheckCircle2,
  Search,
  ArrowDown,
  Flame,
  Clock,
  RotateCcw,
  PlayCircle,
  Radio,
  ArrowRight
} from 'lucide-react';

/**
 * Data Gaps Breakdown Section
 * Displays visual cards for every detected heartbeat dead gap (threshold >= 15s)
 * with counter flow (before vs after), gap duration, and jump action to the table.
 */
const PodHbGapsBreakdownSection = memo(function PodHbGapsBreakdownSection({
  analysisData,
  onJumpToGap,
  onJumpToMaxGap
}) {
  const gaps = analysisData?.gaps || [];
  const deadSec = analysisData?.meta?.thresholds?.deadSec || 15;
  const maxDelta = analysisData?.statistics?.maxDeltaSec || 0;

  if (!analysisData || gaps.length === 0) {
    return (
      <div className="p-4 sm:p-5 rounded-3xl bg-slate-900/40 border border-slate-800/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-slate-400">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <CheckCircle2 size={16} />
          </div>
          <div>
            <span className="font-bold text-white block">Tidak Ada Jeda Mati Terdeteksi (Gaps = 0)</span>
            <span className="text-[11px] text-slate-400">
              Semua paket detak tiba dalam rentang toleransi (&lt; {deadSec}s). Jeda maksimum terdeteksi: <strong className="text-cyan-300 font-mono">{maxDelta}s</strong>.
            </span>
          </div>
        </div>

        {onJumpToMaxGap && analysisData?.ticks?.length > 0 && (
          <button
            onClick={onJumpToMaxGap}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-cyan-600/20 hover:bg-cyan-600/30 text-cyan-300 border border-cyan-500/40 text-xs font-bold transition shadow-sm hover:scale-105 active:scale-95 ml-auto sm:ml-0 cursor-pointer"
            title="Lompat ke baris jeda terbesar di tabel"
          >
            <Search size={13} className="text-cyan-400" />
            <span>Fokus Baris di Tabel</span>
            <ArrowDown size={13} className="text-cyan-400" />
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="p-5 sm:p-6 rounded-3xl bg-slate-900/60 border border-slate-800 shadow-2xl space-y-4" style={{ contentVisibility: 'auto', containIntrinsicSize: 'auto 260px' }}>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400">
            <Flame size={18} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              Informasi & Rincian Gap Data ({gaps.length} Jeda Terdeteksi)
              <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-rose-500/20 text-rose-300 font-semibold border border-rose-500/30">
                DEAD THRESHOLD ≥ {deadSec}s
              </span>
            </h3>
            <p className="text-[11px] text-slate-400">
              Analisa perubahan nilai detak sebelum vs sesudah hening untuk membedakan antara Modul Restart (RESET) vs Jeda Transmisi (BERLANJUT)
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {gaps.map((gap, idx) => {
          const isReset = gap.postDeadType === 'RESET';
          const isResumed = gap.postDeadType === 'BERLANJUT';

          return (
            <div
              key={gap.id || `${gap.startTs}_${gap.endTs}_${idx}`}
              className={`p-4 rounded-2xl border transition hover:border-slate-600 flex flex-col justify-between gap-3 shadow-lg ${isReset
                ? 'bg-rose-950/20 border-rose-500/30 shadow-rose-950/20'
                : isResumed
                  ? 'bg-emerald-950/20 border-emerald-500/30 shadow-emerald-950/20'
                  : 'bg-blue-950/20 border-blue-500/30 shadow-blue-950/20'
                }`}
            >
              {/* Header: Gap Index, Time, & Status Badge */}
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-300 font-bold">
                    GAP #{idx + 1}
                  </span>
                  <span className="text-xs font-semibold text-white flex items-center gap-1.5">
                    <Clock size={12} className="text-slate-400" />
                    {gap.startTime || '—'} → {gap.endTime || '—'} WITA
                  </span>
                </div>

                {/* Status Pasca-Dead Badge */}
                {isReset ? (
                  <span className="inline-flex items-center gap-1.5 text-xs font-black px-2.5 py-1 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/40 shadow-sm">
                    <RotateCcw size={13} className="text-rose-400" />
                    RESET (Mulai Dari 0)
                  </span>
                ) : isResumed ? (
                  <span className="inline-flex items-center gap-1.5 text-xs font-black px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm">
                    <PlayCircle size={13} className="text-emerald-400" />
                    BERLANJUT (Kontinu)
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 text-xs font-black px-2.5 py-1 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/40 shadow-sm">
                    <Radio size={13} className="text-blue-400" />
                    LOMPAT (+{gap.hbDiff} Detak)
                  </span>
                )}
              </div>

              {/* Visual Flow: Before -> Durasi Mati -> After */}
              <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800/80 grid grid-cols-3 items-center text-center gap-2">
                {/* Before */}
                <div className="space-y-0.5 text-left">
                  <span className="block text-[10px] uppercase font-bold text-slate-500">Sebelum Mati</span>
                  <div className="text-sm font-black font-mono text-white">
                    {gap.beforeHb !== null ? `#${gap.beforeHb}` : '—'}
                  </div>
                  <span className="text-[10px] font-mono text-slate-400">{gap.startTime || ''}</span>
                </div>

                {/* Center: Gap duration arrow */}
                <div className="flex flex-col items-center justify-center">
                  <span className="text-[10px] font-mono font-bold text-rose-400 bg-rose-500/15 border border-rose-500/30 px-2 py-0.5 rounded-full mb-1 whitespace-nowrap">
                    Jeda {gap.durationSec}s
                  </span>
                  <div className="w-full flex items-center justify-center text-slate-600">
                    <div className="h-0.5 bg-slate-700 flex-1"></div>
                    <ArrowRight size={14} className="text-slate-400 mx-1 flex-shrink-0" />
                    <div className="h-0.5 bg-slate-700 flex-1"></div>
                  </div>
                  <span className="text-[9px] text-slate-400 font-mono mt-0.5">{gap.port || 'Port serial'}</span>
                </div>

                {/* After */}
                <div className="space-y-0.5 text-right">
                  <span className="block text-[10px] uppercase font-bold text-slate-500">Sesudah Hidup</span>
                  <div className={`text-sm font-black font-mono ${isReset ? 'text-rose-400 font-bold' : 'text-emerald-400'}`}>
                    {gap.afterHb !== null ? `#${gap.afterHb}` : '—'}
                  </div>
                  <span className="text-[10px] font-mono text-slate-400">{gap.endTime || ''}</span>
                </div>
              </div>

              {/* Explanation & Action Footer */}
              <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-800/60 flex-wrap gap-2">
                <div className="text-[11px] text-slate-400">
                  {isReset ? (
                    <span className="text-rose-300 font-medium">
                      ⚠️ Counter mulai ulang dari 0. Modul MCU restart / listrik sempat drop.
                    </span>
                  ) : isResumed ? (
                    <span className="text-emerald-300 font-medium">
                      ✓ Counter tetap berlanjut. Hardware fisik aktif, hanya jeda komunikasi/antrian serial.
                    </span>
                  ) : (
                    <span className="text-blue-300 font-medium">
                      ℹ️ Terjadi lompatan detak ({gap.hbDiff} paket terlewat selama jeda).
                    </span>
                  )}
                </div>

                {onJumpToGap && (
                  <button
                    onClick={() => onJumpToGap(gap)}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-cyan-600/20 hover:bg-cyan-600/30 text-cyan-300 border border-cyan-500/40 text-xs font-bold transition shadow-sm hover:scale-105 active:scale-95 ml-auto cursor-pointer"
                    title={`Lompat ke baris detak waktu ${gap.endTime} di tabel`}
                  >
                    <Search size={13} className="text-cyan-400" />
                    <span>Fokus di Tabel</span>
                    <ArrowDown size={13} className="text-cyan-400" />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
});

export default PodHbGapsBreakdownSection;
