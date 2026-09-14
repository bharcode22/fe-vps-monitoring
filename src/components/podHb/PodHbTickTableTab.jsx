import React, { memo, useState, startTransition } from 'react';
import {
  AlertTriangle,
  Flame,
  Clock,
  Search,
  X,
  ArrowDown,
  Check,
  Copy,
  RotateCcw,
  PlayCircle,
  Radio,
  ShieldAlert,
  CheckCircle2
} from 'lucide-react';

/**
 * TickTableRow Component
 * Represents a single row in the chronological heartbeat table.
 * Displays counter, inter-packet delay, status tags, and provides single-row JSON copy.
 */
export const TickTableRow = memo(function TickTableRow({ tick }) {
  const [copiedRow, setCopiedRow] = useState(false);
  const isDeadGap = tick.status === 'GAP_DEAD';
  const isLag = tick.status === 'GAP_LAG';
  const isFrozen = tick.status === 'FROZEN';

  const handleCopyRowJson = (e) => {
    e.stopPropagation();
    navigator.clipboard.writeText(JSON.stringify(tick));
    setCopiedRow(true);
    setTimeout(() => setCopiedRow(false), 1500);
  };

  return (
    <tr
      id={`tick-row-${tick.index - 1}`}
      className={`hover:bg-slate-800/50 transition group ${isDeadGap
        ? 'bg-rose-950/30 border-l-4 border-rose-500'
        : isLag
          ? 'bg-amber-950/20 border-l-4 border-amber-500'
          : isFrozen
            ? 'bg-purple-950/20 border-l-4 border-purple-500'
            : ''
        }`}
    >
      <td className="py-2 px-3 text-slate-500 whitespace-nowrap">
        <div className="flex items-center gap-1.5">
          <span className="w-5 text-right font-mono">{tick.index}</span>
          <button
            onClick={handleCopyRowJson}
            className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-slate-700 text-slate-400 hover:text-cyan-300 transition cursor-pointer"
            title={`Salin Raw JSON paket #${tick.index}`}
          >
            {copiedRow ? <Check size={11} className="text-emerald-400" /> : <Copy size={11} />}
          </button>
        </div>
      </td>
      <td className="py-2 px-3 text-slate-300 font-mono whitespace-nowrap">
        <span className="font-mono text-slate-200 font-semibold text-[11px]">
          {tick.date || (tick.ts ? (
            new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Makassar', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(tick.ts)) +
            ' ' +
            new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Makassar', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }).format(new Date(tick.ts))
          ) : '—')}
        </span>
      </td>
      <td className="py-2 px-3 font-bold text-white">
        {tick.hb !== null ? `#${tick.hb}` : '—'}
      </td>
      <td className="py-2 px-3 font-mono">
        {tick.deltaHb !== null ? (
          <span className={
            tick.deltaHb > 5
              ? 'text-blue-300 font-black bg-blue-500/20 px-1.5 py-0.5 rounded border border-blue-500/40 shadow-sm'
              : tick.deltaHb === 1
                ? 'text-slate-400'
                : tick.deltaHb > 1
                  ? 'text-amber-400 font-bold'
                  : 'text-rose-400 font-bold'
          }>
            {tick.deltaHb > 0 ? `+${tick.deltaHb}` : tick.deltaHb}
          </span>
        ) : '—'}
      </td>
      <td className="py-2 px-3 font-bold">
        {tick.deltaSec !== null ? (
          <span className={
            isDeadGap
              ? 'text-rose-400 px-2 py-0.5 rounded bg-rose-500/20 border border-rose-500/30'
              : isLag
                ? 'text-amber-400 px-2 py-0.5 rounded bg-amber-500/20 border border-amber-500/30'
                : 'text-cyan-400'
          }>
            {tick.deltaSec.toFixed(2)}s
          </span>
        ) : (
          <span className="text-slate-500">First</span>
        )}
      </td>
      <td className="py-2 px-3 font-sans">
        {isDeadGap ? (
          <div className="flex flex-col gap-1 items-start">
            <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30">
              <Flame size={11} /> DEAD GAP ({tick.deltaSec}s)
            </span>
            {tick.postDeadType === 'RESET' ? (
              <span className="inline-flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded bg-rose-600/30 text-rose-200 border border-rose-500/50">
                <RotateCcw size={10} /> RESET (Mulai Dari 0)
              </span>
            ) : tick.postDeadType === 'BERLANJUT' ? (
              <span className="inline-flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-600/30 text-emerald-200 border border-emerald-500/50">
                <PlayCircle size={10} /> BERLANJUT (Kontinu)
              </span>
            ) : (tick.postDeadType === 'LOMPAT' || tick.postDeadType === 'LONCAT') ? (
              <span className="inline-flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded bg-blue-600/30 text-blue-200 border border-blue-500/50">
                <Radio size={10} /> LOMPAT (+{tick.deltaHb})
              </span>
            ) : null}
          </div>
        ) : (tick.status === 'GAP_JUMP' || tick.postDeadType === 'LOMPAT' || tick.postDeadType === 'LONCAT' || (tick.deltaHb !== null && tick.deltaHb > 5)) ? (
          <div className="flex flex-col gap-1 items-start">
            <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30 shadow-sm">
              <Radio size={11} /> LOMPAT (+{tick.deltaHb})
            </span>
            {tick.deltaSec ? (
              <span className="text-[9px] text-slate-400 font-mono">
                Jeda: {tick.deltaSec.toFixed(2)}s
              </span>
            ) : null}
          </div>
        ) : (tick.status === 'RESET' || tick.postDeadType === 'RESET') ? (
          <div className="flex flex-col gap-1 items-start">
            <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30 shadow-sm">
              <RotateCcw size={11} /> RESET (Mulai Dari 0)
            </span>
            {tick.deltaSec ? (
              <span className="text-[9px] text-slate-400 font-mono">
                Jeda: {tick.deltaSec.toFixed(2)}s
              </span>
            ) : null}
          </div>
        ) : isLag ? (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
            <AlertTriangle size={11} /> LAG SPIKE
          </span>
        ) : isFrozen ? (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30">
            <ShieldAlert size={11} /> FROZEN
          </span>
        ) : (
          <span className="text-[10px] text-emerald-400 font-semibold flex items-center gap-1">
            <CheckCircle2 size={11} /> REGULER
          </span>
        )}
      </td>
      <td className="py-2 px-3 text-slate-400">
        {tick.port ? <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 text-[10px]">{tick.port}</span> : '—'}
      </td>
    </tr>
  );
});

/**
 * PodHbTickTableTab
 * Complete Table Log view including filters (All, Incidents, Dead Gaps, Lag Spikes),
 * search input, jump to max gap button, virtual/paginated rendering, and smooth scroll target.
 */
export default function PodHbTickTableTab({
  analysisData,
  filteredTicks,
  incidentTicks,
  tableFilter,
  setTableFilter,
  tableSearch,
  setTableSearch,
  handleJumpToMaxGap,
  tableRef,
  displayLimit,
  setDisplayLimit
}) {
  return (
    <div className="space-y-3">
      {/* Dedicated Table Filter & Search Toolbar */}
      <div className="p-2.5 rounded-2xl bg-slate-950/70 border border-slate-800/80 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Filter Buttons */}
        <div className="flex items-center bg-slate-900/90 p-1 rounded-xl border border-slate-800 text-xs flex-wrap gap-1">
          <button
            onClick={() => startTransition(() => setTableFilter('all'))}
            className={`px-3 py-1.5 rounded-lg font-bold transition cursor-pointer ${tableFilter === 'all'
              ? 'bg-slate-800 text-white shadow-sm'
              : 'text-slate-400 hover:text-white'
              }`}
          >
            Semua ({analysisData?.ticks?.length || 0})
          </button>
          <button
            onClick={() => startTransition(() => setTableFilter('incidents'))}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition cursor-pointer ${tableFilter === 'incidents'
              ? 'bg-rose-600 text-white shadow-md shadow-rose-600/30'
              : 'text-rose-400 hover:text-white hover:bg-rose-950/30'
              }`}
            title="Tampilkan hanya baris yang mengalami anomali / insiden"
          >
            <AlertTriangle size={13} />
            <span>Insiden Saja ({incidentTicks.length})</span>
          </button>
          <button
            onClick={() => startTransition(() => setTableFilter('gaps'))}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition cursor-pointer ${tableFilter === 'gaps'
              ? 'bg-rose-500/25 text-rose-300 border border-rose-500/40 font-bold'
              : 'text-slate-400 hover:text-white'
              }`}
          >
            <Flame size={13} className="text-rose-400" />
            <span>Dead Gaps ({analysisData?.gaps?.length || 0})</span>
          </button>
          <button
            onClick={() => startTransition(() => setTableFilter('lag'))}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition cursor-pointer ${tableFilter === 'lag'
              ? 'bg-amber-500/25 text-amber-300 border border-amber-500/40 font-bold'
              : 'text-slate-400 hover:text-white'
              }`}
          >
            <Clock size={13} className="text-amber-400" />
            <span>Lag Spike (&gt;3s)</span>
          </button>
        </div>

        {/* Right Controls: Search Box & Jump Button */}
        <div className="flex items-center gap-2">
          {/* Search input with clear button */}
          <div className="relative flex-1 sm:w-56">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              placeholder="Cari waktu / #hb..."
              value={tableSearch}
              onChange={(e) => setTableSearch(e.target.value)}
              className="w-full pl-8 pr-7 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/30 transition"
            />
            {tableSearch && (
              <button
                onClick={() => setTableSearch('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white p-0.5 rounded cursor-pointer"
                title="Hapus pencarian"
              >
                <X size={12} />
              </button>
            )}
          </div>

          {/* Jump to max gap / incident button */}
          <button
            onClick={handleJumpToMaxGap}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-cyan-600/20 hover:bg-cyan-600/30 text-cyan-300 border border-cyan-500/40 text-xs font-bold transition shadow-sm hover:scale-105 active:scale-95 whitespace-nowrap cursor-pointer"
            title="Lompat dan sorot titik jeda terbesar / insiden di tabel"
          >
            <Search size={12} className="text-cyan-400" />
            <span>Fokus Baris Insiden</span>
            <ArrowDown size={12} className="text-cyan-400" />
          </button>
        </div>
      </div>

      {/* Table View Container */}
      <div ref={tableRef} className="overflow-x-auto max-h-[650px] lg:max-h-[750px] overflow-y-auto custom-scrollbar rounded-2xl border border-slate-800/80">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-950/90 text-slate-400 font-semibold sticky top-0 z-10 backdrop-blur-md border-b border-slate-800">
            <tr>
              <th className="py-2.5 px-3 w-12">#</th>
              <th className="py-2.5 px-3">Date (WITA)</th>
              <th className="py-2.5 px-3">Counter (#hb)</th>
              <th className="py-2.5 px-3">Δ Counter</th>
              <th className="py-2.5 px-3">Jeda Waktu (Δt)</th>
              <th className="py-2.5 px-3">Status Diagnosa</th>
              <th className="py-2.5 px-3">Port</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/50 font-mono text-[11px]">
            {filteredTicks.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-8 text-center text-slate-500 font-sans">
                  Tidak ada paket yang sesuai dengan filter.
                </td>
              </tr>
            ) : (
              filteredTicks.slice(0, displayLimit).map((tick) => (
                <TickTableRow key={tick.ts + '_' + tick.index} tick={tick} />
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Safe Pagination Footer if ticks exceed displayLimit */}
      {filteredTicks.length > displayLimit && (
        <div className="p-3 bg-slate-950/80 rounded-2xl border border-slate-800 flex items-center justify-between text-xs flex-wrap gap-2">
          <span className="text-slate-400">
            Menampilkan <strong className="text-white">{displayLimit}</strong> dari <strong className="text-white">{filteredTicks.length}</strong> detak log
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setDisplayLimit((prev) => prev + 250)}
              className="px-3 py-1 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-300 font-semibold transition cursor-pointer"
            >
              +250 Baris Lagi
            </button>
            <button
              onClick={() => setDisplayLimit(filteredTicks.length)}
              className="px-3 py-1 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold transition cursor-pointer"
            >
              Tampilkan Semua ({filteredTicks.length})
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
