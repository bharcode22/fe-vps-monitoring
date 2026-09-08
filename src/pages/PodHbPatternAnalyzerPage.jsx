import React, { useState, useEffect, useMemo, useRef, useTransition, useDeferredValue, memo } from 'react';
import {
  Activity,
  AlertTriangle,
  AlertCircle,
  CheckCircle2,
  Clock,
  Cpu,
  RefreshCw,
  Search,
  ArrowLeft,
  Download,
  Zap,
  Flame,
  ShieldAlert,
  Server,
  Radio,
  Sparkles,
  ChevronDown,
  Layers,
  FileCode,
  Copy,
  Check,
  RotateCcw,
  PlayCircle,
  ArrowRight,
  ArrowDown,
  Code2,
  Table,
  AlignLeft,
  Braces,
  FileText,
  Printer,
  FileSpreadsheet,
  Share2,
  X
} from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceLine,
  Brush
} from 'recharts';
import { fetchServersApi } from '../api/vpsApi';
import {
  fetchPodHeartbeatAnalysisApi,
  fetchRecentFleetIncidentsApi,
  fetchHeartbeatModulesApi
} from '../api/podActivityApi';

// Fallback module definitions if API is loading
const DEFAULT_MODULES = [
  { id: 501, name: 'Manual Control', port: 'ttyUSB0' },
  { id: 502, name: 'Chair Module', port: 'ttyUSB1' },
  { id: 503, name: 'Lighting Module', port: 'ttyUSB4' },
  { id: 504, name: 'Olfactory Module', port: 'ttyUSB5' },
  { id: 505, name: 'Door Module', port: null },
  { id: 506, name: 'AirCon Module', port: null },
  { id: 507, name: 'Audio Module', port: 'ttyUSB2' },
  { id: 508, name: 'Power Module', port: 'ttyUSB3' }
];

// High-performance memoized row component for tick stream table (eliminates re-renders on pointer events)
const TickTableRow = memo(function TickTableRow({ tick }) {
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

// Memoized Visual Charts section (isolates SVG recalculations from pointer interactions and filter clicks)
const VisualChartsSection = memo(function VisualChartsSection({ analysisData }) {
  const deadSec = analysisData?.meta?.thresholds?.deadSec || 15;
  const frozenSec = analysisData?.meta?.thresholds?.frozenSec || 10;
  const hasTicks = analysisData?.ticks?.length > 0;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6" style={{ contentVisibility: 'auto', containIntrinsicSize: 'auto 340px' }}>
      {/* Chart 1: Inter-Packet Delay Time (Delta Sec) */}
      <div className="p-5 rounded-3xl bg-slate-900/60 border border-slate-800 shadow-xl space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <Clock size={16} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Jeda Antar-Paket (Inter-Packet Delay)</h3>
              <p className="text-[11px] text-slate-400">Lonjakan spike di atas garis merah mengindikasikan kondisi DEAD</p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-[10px] font-mono">
            <span className="flex items-center gap-1 text-rose-400">
              <span className="w-2 h-0.5 bg-rose-500"></span> DEAD ≥ {deadSec}s
            </span>
            <span className="flex items-center gap-1 text-amber-400">
              <span className="w-2 h-0.5 bg-amber-500"></span> FROZEN ≥ {frozenSec}s
            </span>
          </div>
        </div>

        <div className="h-64 w-full pt-2">
          {hasTicks ? (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={analysisData.ticks} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis
                  dataKey="time"
                  stroke="#64748b"
                  fontSize={10}
                  tickFormatter={(val) => val ? val.slice(0, 8) : ''}
                />
                <YAxis stroke="#64748b" fontSize={10} unit="s" />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', fontSize: '11px' }}
                  labelFormatter={(label) => `Waktu: ${label} WITA`}
                  formatter={(val, name, item) => [
                    <span key="val" className="font-mono font-bold">
                      {val} detik (Counter: #{item?.payload?.hb || '—'})
                    </span>,
                    'Jeda Detak'
                  ]}
                />
                <ReferenceLine
                  y={deadSec}
                  stroke="#f43f5e"
                  strokeDasharray="4 4"
                  label={{ value: `DEAD (${deadSec}s)`, fill: '#f43f5e', fontSize: 10, position: 'insideTopRight' }}
                />
                <ReferenceLine
                  y={frozenSec}
                  stroke="#f59e0b"
                  strokeDasharray="4 4"
                  label={{ value: `FROZEN (${frozenSec}s)`, fill: '#f59e0b', fontSize: 10, position: 'insideTopRight' }}
                />
                <Line
                  type="monotone"
                  dataKey="deltaSec"
                  stroke="#06b6d4"
                  strokeWidth={2}
                  isAnimationActive={false}
                  dot={(props) => {
                    const { cx, cy, payload } = props || {};
                    if (!payload) return null;
                    if (payload.status === 'GAP_DEAD') {
                      return <circle key={`dot-${payload.ts}`} cx={cx} cy={cy} r={5} fill="#f43f5e" stroke="#ffffff" strokeWidth={1.5} />;
                    }
                    if (payload.status === 'GAP_LAG') {
                      return <circle key={`dot-${payload.ts}`} cx={cx} cy={cy} r={3.5} fill="#f59e0b" />;
                    }
                    return null;
                  }}
                  activeDot={{ r: 5, fill: '#06b6d4', stroke: '#ffffff' }}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center text-xs text-slate-500">
              Data grafik tidak tersedia pada rentang waktu ini.
            </div>
          )}
        </div>
      </div>

      {/* Chart 2: Heartbeat Counter Continuity Curve (#hb) */}
      <div className="p-5 rounded-3xl bg-slate-900/60 border border-slate-800 shadow-xl space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
              <Activity size={16} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Kontinuitas Counter Heartbeat (#hb)</h3>
              <p className="text-[11px] text-slate-400">Kemiringan garis mengindikasikan laju detak; garis mendatar = macet</p>
            </div>
          </div>
          <div className="text-[11px] font-mono text-cyan-300">
            Rentang: #{analysisData?.ticks?.[0]?.hb || '—'} → #{analysisData?.ticks?.[analysisData.ticks.length - 1]?.hb || '—'}
          </div>
        </div>

        <div className="h-64 w-full pt-2">
          {hasTicks ? (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={analysisData.ticks} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis
                  dataKey="time"
                  stroke="#64748b"
                  fontSize={10}
                  tickFormatter={(val) => val ? val.slice(0, 8) : ''}
                />
                <YAxis
                  stroke="#64748b"
                  fontSize={10}
                  domain={['auto', 'auto']}
                  tickFormatter={(val) => val >= 1000 ? `${(val / 1000).toFixed(1)}k` : val}
                />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', fontSize: '11px' }}
                  labelFormatter={(label) => `Waktu: ${label} WITA`}
                  formatter={(val, name, item) => [
                    <span key="hb-val" className="font-mono font-bold text-purple-300">
                      #{val} {item?.payload?.deltaHb !== null && item?.payload?.deltaHb !== undefined ? `(Δ ${item.payload.deltaHb})` : ''}
                    </span>,
                    'Nilai Counter'
                  ]}
                />
                <Line
                  type="stepAfter"
                  dataKey="hb"
                  stroke="#a855f7"
                  strokeWidth={2}
                  dot={false}
                  isAnimationActive={false}
                  activeDot={{ r: 5, fill: '#a855f7', stroke: '#ffffff' }}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center text-xs text-slate-500">
              Data counter tidak tersedia pada rentang waktu ini.
            </div>
          )}
        </div>
      </div>
    </div>
  );
});

// Memoized Data Gaps Breakdown Section (Displays visual cards for every detected heartbeat dead gap)
const DataGapsBreakdownSection = memo(function DataGapsBreakdownSection({ analysisData, onJumpToGap, onJumpToMaxGap }) {
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
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-cyan-600/20 hover:bg-cyan-600/30 text-cyan-300 border border-cyan-500/40 text-xs font-bold transition shadow-sm hover:scale-105 active:scale-95 ml-auto sm:ml-0"
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

// Memoized Incident Report View (focused strictly on incident rows, root causes, and print/export utilities)
const IncidentReportView = memo(function IncidentReportView({
  analysisData,
  incidentTicks,
  onJumpToTick,
  onPrint,
  onCopyMarkdown,
  onDownloadMarkdown,
  onDownloadCsv,
  copiedReportSuccess
}) {
  const meta = analysisData?.meta || {};
  const diag = analysisData?.diagnosis || {};
  const stats = meta?.stats || {};
  const thresholds = meta?.thresholds || {};

  const reportDateFormatted = useMemo(() => {
    try {
      return new Intl.DateTimeFormat('id-ID', {
        timeZone: 'Asia/Makassar',
        dateStyle: 'full',
        timeStyle: 'medium'
      }).format(new Date());
    } catch (_) {
      return new Date().toLocaleString();
    }
  }, []);

  const severityColor = diag.severity === 'CRITICAL'
    ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
    : diag.severity === 'WARNING'
      ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
      : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40';

  return (
    <div className="space-y-6 pt-1">
      {/* Print Specific Styling */}
      <style>{`
        @media print {
          body {
            background-color: #ffffff !important;
            color: #0f172a !important;
          }
          nav, header, aside, .no-print {
            display: none !important;
          }
          #incident-printable-report {
            background: #ffffff !important;
            color: #0f172a !important;
            border: none !important;
            box-shadow: none !important;
            padding: 0 !important;
            margin: 0 !important;
            width: 100% !important;
          }
          #incident-printable-report * {
            color: #0f172a !important;
            border-color: #cbd5e1 !important;
            text-shadow: none !important;
          }
          #incident-printable-report .bg-slate-900\\/60,
          #incident-printable-report .bg-slate-900\\/80,
          #incident-printable-report .bg-slate-950,
          #incident-printable-report .bg-slate-950\\/60,
          #incident-printable-report .bg-slate-950\\/80 {
            background-color: #f8fafc !important;
            border-color: #e2e8f0 !important;
          }
          #incident-printable-report thead tr {
            background-color: #f1f5f9 !important;
          }
          #incident-printable-report th, 
          #incident-printable-report td {
            border: 1px solid #e2e8f0 !important;
            padding: 6px 8px !important;
          }
          .custom-scrollbar {
            overflow: visible !important;
            max-height: none !important;
          }
          @page {
            margin: 1.5cm;
            size: auto;
          }
        }
      `}</style>

      {/* Top Action Bar (Web Only - hidden during print) */}
      <div className="no-print p-4 rounded-2xl bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 border border-slate-800 flex flex-wrap items-center justify-between gap-3 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-gradient-to-br from-rose-500/20 to-amber-500/20 text-rose-300 border border-rose-500/30">
            <FileText size={20} />
          </div>
          <div>
            <h4 className="text-sm font-bold text-white flex items-center gap-2">
              Laporan Analisa Baris Insiden
              <span className="text-[10px] px-2 py-0.5 rounded-full font-mono bg-rose-500/20 text-rose-300 border border-rose-500/40 font-black">
                {incidentTicks.length} Baris Terdeteksi
              </span>
            </h4>
            <p className="text-[11px] text-slate-400">
              Dokumen komprehensif yang memusatkan perhatian pada anomali transmisi (Dead Gap, Lompat, Reset, Lag Spike)
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={onPrint}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 text-xs font-bold transition shadow-sm cursor-pointer"
            title="Cetak langsung atau simpan sebagai dokumen PDF bersih"
          >
            <Printer size={13} className="text-cyan-400" />
            <span>Cetak / PDF</span>
          </button>
          <button
            onClick={onCopyMarkdown}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-cyan-600/20 hover:bg-cyan-600/30 text-cyan-300 border border-cyan-500/40 text-xs font-bold transition shadow-sm cursor-pointer"
            title="Salin laporan lengkap dalam format Markdown (siap kirim ke chat/tiket)"
          >
            {copiedReportSuccess ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
            <span>{copiedReportSuccess ? 'Tersalin!' : 'Salin Teks (MD)'}</span>
          </button>
          <button
            onClick={onDownloadMarkdown}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold transition shadow-sm cursor-pointer"
            title="Unduh file dokumen laporan Markdown (.md)"
          >
            <Download size={13} className="text-slate-400" />
            <span>Unduh .MD</span>
          </button>
          <button
            onClick={onDownloadCsv}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/40 text-xs font-bold transition shadow-sm cursor-pointer"
            title="Unduh baris data insiden ke format spreadsheet CSV"
          >
            <FileSpreadsheet size={13} className="text-emerald-400" />
            <span>Unduh CSV Insiden</span>
          </button>
        </div>
      </div>

      {/* Printable Report Document Card */}
      <div
        id="incident-printable-report"
        className="p-6 rounded-3xl bg-slate-950/80 border border-slate-800/90 shadow-2xl space-y-6"
      >
        {/* Document Formal Header */}
        <div className="pb-5 border-b border-slate-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-[10px] uppercase tracking-wider font-extrabold px-2.5 py-0.5 rounded bg-rose-600 text-white">
                Sistem Monitoring Server
              </span>
              <span className="text-xs text-slate-400 font-mono">
                Presisi Milidetik (WITA / UTC+8)
              </span>
            </div>
            <h2 className="text-lg md:text-xl font-black text-white tracking-tight">
              LAPORAN ANALISA INSIDEN DETAK MODUL
            </h2>
            <p className="text-xs text-slate-400">
              Dokumen resmi analisis investigasi jeda komunikasi, lonjakan counter, dan kontinuitas detak hardware.
            </p>
          </div>

          <div className="flex flex-col items-start md:items-end text-xs text-slate-400 font-mono space-y-0.5">
            <div>Waktu Cetak: <strong className="text-slate-200">{reportDateFormatted} WITA</strong></div>
            <div>Jendela Pantau: <strong className="text-cyan-400">±{meta.windowMinutes || 5} Menit</strong> ({analysisData.ticks?.length || 0} Total Records)</div>
            <div>Threshold Dead: <strong className="text-rose-300">{thresholds.deadSec || 15}s</strong> • Frozen: <strong className="text-purple-300">{thresholds.frozenSec || 10}s</strong></div>
          </div>
        </div>

        {/* Metadata Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-4 rounded-2xl bg-slate-900/60 border border-slate-800 text-xs">
          <div>
            <span className="block text-[10px] uppercase font-bold text-slate-500">Target Server / Pod</span>
            <span className="font-extrabold text-white text-sm">
              {meta.serverName || `POD ${meta.podId}`}
            </span>
            <span className="block text-[10px] text-slate-400 font-mono">ID: {meta.podId}</span>
          </div>

          <div>
            <span className="block text-[10px] uppercase font-bold text-slate-500">Modul Hardware</span>
            <span className="font-extrabold text-cyan-300 text-sm">
              {meta.moduleName || `Modul ${meta.moduleId}`}
            </span>
            <span className="block text-[10px] text-slate-400 font-mono">ID: {meta.moduleId}</span>
          </div>

          <div>
            <span className="block text-[10px] uppercase font-bold text-slate-500">Waktu Target Insiden</span>
            <span className="font-extrabold text-amber-300 text-sm font-mono">
              {meta.targetTime || '—'} WITA
            </span>
            <span className="block text-[10px] text-slate-400 font-mono">{meta.resolvedDate}</span>
          </div>

          <div>
            <span className="block text-[10px] uppercase font-bold text-slate-500">Diagnosa Utama</span>
            <span className={`inline-flex items-center gap-1 font-extrabold px-2 py-0.5 rounded text-[11px] border mt-0.5 ${severityColor}`}>
              {diag.severity === 'CRITICAL' ? <Flame size={11} /> : diag.severity === 'WARNING' ? <AlertTriangle size={11} /> : <CheckCircle2 size={11} />}
              {diag.patternTitle?.split('(')[0] || 'NORMAL'}
            </span>
          </div>
        </div>

        {/* Executive Summary & Root Cause Callout */}
        <div className="p-4 rounded-2xl bg-gradient-to-br from-slate-900 via-slate-900/80 to-slate-950 border border-slate-800 space-y-3">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-400 border-b border-slate-800 pb-2">
            <Activity size={13} className="text-cyan-400" />
            <span>Ringkasan Investigasi & Rekomendasi Solusi</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div className="space-y-1.5">
              <span className="block font-bold text-slate-300">Ringkasan Kejadian:</span>
              <p className="text-slate-300 leading-relaxed bg-slate-950/60 p-3 rounded-xl border border-slate-800/80">
                {diag.summary || 'Detak beroperasi normal tanpa insiden signifikan.'}
              </p>
              <span className="block font-bold text-slate-300 pt-1">Akar Masalah Teknis (Root Cause):</span>
              <p className="text-slate-400 leading-relaxed bg-slate-950/60 p-3 rounded-xl border border-slate-800/80">
                {diag.rootCauseDetails || 'Tidak ditemukan anomali atau kegagalan perangkat.'}
              </p>
            </div>

            <div className="space-y-1.5">
              <span className="block font-bold text-slate-300">Rekomendasi Tindakan Teknis:</span>
              <div className="text-slate-300 leading-relaxed bg-slate-950/60 p-3 rounded-xl border border-slate-800/80 whitespace-pre-line">
                {diag.recommendedAction || 'Sistem beroperasi normal, tidak ada aksi perbaikan yang dibutuhkan.'}
              </div>
            </div>
          </div>
        </div>

        {/* Incident Metrics Summary */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-0.5">
            <span className="text-[10px] uppercase font-bold text-slate-500">Baris Insiden Terdeteksi</span>
            <div className="text-lg font-black font-mono text-rose-400">
              {incidentTicks.length} Baris
            </div>
            <span className="text-[10px] text-slate-400">Anomali pada rentang waktu</span>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-0.5">
            <span className="text-[10px] uppercase font-bold text-slate-500">Jeda Terlama (Max Delay)</span>
            <div className="text-lg font-black font-mono text-amber-300">
              {stats.maxDeltaSec ? `${stats.maxDeltaSec.toFixed(2)}s` : '0s'}
            </div>
            <span className="text-[10px] text-slate-400">Batas dead: {thresholds.deadSec || 15}s</span>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-0.5">
            <span className="text-[10px] uppercase font-bold text-slate-500">Dead Gap (≥15s)</span>
            <div className="text-lg font-black font-mono text-rose-300">
              {analysisData.gaps?.length || 0} Kali
            </div>
            <span className="text-[10px] text-slate-400">Kejadian modul hening</span>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-0.5">
            <span className="text-[10px] uppercase font-bold text-slate-500">Rata-Rata Interval Detak</span>
            <div className="text-lg font-black font-mono text-cyan-300">
              {stats.avgDeltaSec ? `${stats.avgDeltaSec.toFixed(2)}s` : '—'}
            </div>
            <span className="text-[10px] text-slate-400">Interval normal: 1.0s</span>
          </div>
        </div>

        {/* FOCUSED INCIDENT ROWS TABLE */}
        <div className="space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <span className="p-1 rounded-lg bg-rose-500/20 text-rose-400">
                <AlertTriangle size={14} />
              </span>
              <h3 className="text-sm font-bold text-white">
                Rincian Baris Data Insiden ({incidentTicks.length} Kejadian)
              </h3>
            </div>
            <span className="text-[11px] text-slate-400 font-mono">
              Fokus data: hanya paket dengan selisih waktu atau lonjakan counter anomali
            </span>
          </div>

          {incidentTicks.length === 0 ? (
            <div className="p-8 rounded-2xl bg-emerald-950/20 border border-emerald-500/30 text-center space-y-2">
              <CheckCircle2 size={32} className="text-emerald-400 mx-auto" />
              <h4 className="text-sm font-bold text-emerald-200">Tidak Ada Insiden Terdeteksi</h4>
              <p className="text-xs text-slate-400 max-w-md mx-auto">
                Seluruh data detak dalam rentang waktu ini mengalir normal dan konsisten tanpa jeda mati (&gt;{thresholds.deadSec || 15}s), lag spike (&gt;3s), lonjakan counter, maupun reset ke 0.
              </p>
            </div>
          ) : (
            <div className="rounded-2xl border border-slate-800 overflow-hidden bg-slate-950 shadow-inner">
              <div className="overflow-x-auto max-h-[600px] overflow-y-auto custom-scrollbar">
                <table className="w-full text-left text-xs border-collapse font-sans">
                  <thead>
                    <tr className="border-b border-slate-800 bg-slate-900/90 sticky top-0 z-10 text-[11px] uppercase tracking-wider text-slate-400 font-bold">
                      <th className="py-2.5 px-3">No / Baris</th>
                      <th className="py-2.5 px-3">Waktu (WITA)</th>
                      <th className="py-2.5 px-3">Timestamp</th>
                      <th className="py-2.5 px-3">Alur Counter (#hb)</th>
                      <th className="py-2.5 px-3">ΔHB (Detak)</th>
                      <th className="py-2.5 px-3">Jeda (Δt)</th>
                      <th className="py-2.5 px-3">Klasifikasi Insiden</th>
                      <th className="py-2.5 px-3">Port</th>
                      <th className="py-2.5 px-3 min-w-[200px]">Penjelasan & Implikasi Teknis</th>
                      <th className="py-2.5 px-3 text-center no-print">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-mono text-[11px]">
                    {incidentTicks.map((tick, idx) => {
                      const prevTick = tick.index > 1 ? analysisData.ticks[tick.index - 2] : null;
                      const prevHb = prevTick?.hb !== undefined ? prevTick.hb : null;
                      const isDead = tick.status === 'GAP_DEAD' || (tick.deltaSec !== null && tick.deltaSec >= (thresholds.deadSec || 15));
                      const isJump = tick.postDeadType === 'LOMPAT' || tick.postDeadType === 'LONCAT' || tick.status === 'GAP_JUMP' || (tick.deltaHb !== null && tick.deltaHb > 5);
                      const isReset = tick.postDeadType === 'RESET' || tick.status === 'RESET' || (tick.deltaHb !== null && tick.deltaHb < 0);
                      const isLag = tick.status === 'GAP_LAG' || (tick.deltaSec !== null && tick.deltaSec >= 3.0 && !isDead);
                      const isFrozen = tick.status === 'FROZEN';

                      let rowBg = 'hover:bg-slate-900/80';
                      if (isDead) rowBg = 'bg-rose-950/25 hover:bg-rose-950/40';
                      else if (isJump) rowBg = 'bg-blue-950/25 hover:bg-blue-950/40';
                      else if (isReset) rowBg = 'bg-rose-950/30 hover:bg-rose-950/50';
                      else if (isLag) rowBg = 'bg-amber-950/20 hover:bg-amber-950/35';

                      // Explanation helper
                      let explanation = 'Penyimpangan interval waktu normal transmisi detak.';
                      if (isJump) {
                        explanation = `Counter melonjak dari #${prevHb ?? '—'} ke #${tick.hb} (+${tick.deltaHb} paket hilang di jaringan/transport MQTT). Hardware pod tetap hidup.`;
                      } else if (isReset) {
                        explanation = `Counter mengalami RESET kembali ke #${tick.hb}. Modul microcontroller kehilangan daya / restart proses driver.`;
                      } else if (isDead) {
                        explanation = `Jeda mati hening selama ${tick.deltaSec}s (melebihi batas DEAD ${thresholds.deadSec || 15}s).`;
                      } else if (isLag) {
                        explanation = `Lag spike keterlambatan pengiriman data selama ${tick.deltaSec}s (buffer serial / CPU thread pod sempat tersendat).`;
                      } else if (isFrozen) {
                        explanation = `Nilai counter #${tick.hb} membeku / macet, modul hardware tidak menaikkan counter.`;
                      }

                      return (
                        <tr key={tick.index || idx} className={`transition-colors ${rowBg}`}>
                          <td className="py-2.5 px-3 font-bold text-slate-300">
                            #{idx + 1}
                            <span className="block text-[9px] text-slate-500 font-normal">
                              (Baris {tick.index})
                            </span>
                          </td>

                          <td className="py-2.5 px-3 text-white whitespace-nowrap">
                            <div className="font-bold text-cyan-300">{tick.time || '—'}</div>
                            <span className="text-[10px] text-slate-400">{tick.date || ''}</span>
                          </td>

                          <td className="py-2.5 px-3 text-slate-400 text-[10px]">
                            {tick.ts}
                          </td>

                          <td className="py-2.5 px-3 whitespace-nowrap">
                            <div className="flex items-center gap-1.5 font-bold">
                              <span className="text-slate-400">{prevHb !== null ? `#${prevHb}` : '—'}</span>
                              <ArrowRight size={11} className="text-slate-500" />
                              <span className={isReset ? 'text-rose-400 font-black' : isJump ? 'text-blue-300 font-black' : 'text-emerald-300'}>
                                {tick.hb !== null ? `#${tick.hb}` : '—'}
                              </span>
                            </div>
                          </td>

                          <td className="py-2.5 px-3 font-bold">
                            {tick.deltaHb !== null ? (
                              <span className={
                                isJump
                                  ? 'px-2 py-0.5 rounded bg-blue-500/25 text-blue-300 border border-blue-500/40 font-black shadow-sm'
                                  : isReset
                                    ? 'px-2 py-0.5 rounded bg-rose-500/25 text-rose-300 border border-rose-500/40 font-black shadow-sm'
                                    : tick.deltaHb === 1
                                      ? 'text-slate-400'
                                      : 'text-amber-400'
                              }>
                                {tick.deltaHb > 0 ? `+${tick.deltaHb}` : tick.deltaHb}
                              </span>
                            ) : '—'}
                          </td>

                          <td className="py-2.5 px-3 font-bold">
                            {tick.deltaSec !== null ? (
                              <span className={
                                isDead
                                  ? 'px-2 py-0.5 rounded bg-rose-500/25 text-rose-300 border border-rose-500/40'
                                  : isLag
                                    ? 'px-2 py-0.5 rounded bg-amber-500/25 text-amber-300 border border-amber-500/40'
                                    : 'text-slate-300'
                              }>
                                {tick.deltaSec.toFixed(2)}s
                              </span>
                            ) : '—'}
                          </td>

                          <td className="py-2.5 px-3 font-sans">
                            {isDead ? (
                              <div className="flex flex-col gap-0.5 items-start">
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/40">
                                  <Flame size={11} /> DEAD GAP
                                </span>
                                {tick.postDeadLabel && (
                                  <span className="text-[9px] text-slate-300 font-mono">
                                    {tick.postDeadLabel}
                                  </span>
                                )}
                              </div>
                            ) : isJump ? (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/40 shadow-sm">
                                <Radio size={11} /> LOMPAT (+{tick.deltaHb})
                              </span>
                            ) : isReset ? (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/40 shadow-sm">
                                <RotateCcw size={11} /> RESET (Mulai Dari 0)
                              </span>
                            ) : isLag ? (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40">
                                <AlertTriangle size={11} /> LAG SPIKE
                              </span>
                            ) : isFrozen ? (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/40">
                                <ShieldAlert size={11} /> FROZEN
                              </span>
                            ) : (
                              <span className="text-slate-400">Anomali</span>
                            )}
                          </td>

                          <td className="py-2.5 px-3 text-slate-400">
                            {tick.port ? <span className="px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800 text-[10px]">{tick.port}</span> : '—'}
                          </td>

                          <td className="py-2.5 px-3 font-sans text-slate-300 text-xs leading-snug">
                            {explanation}
                          </td>

                          <td className="py-2.5 px-3 text-center no-print">
                            <button
                              onClick={() => onJumpToTick(tick)}
                              className="px-2.5 py-1 rounded-lg bg-cyan-600/20 hover:bg-cyan-600/30 text-cyan-300 border border-cyan-500/40 text-[10px] font-bold transition shadow-sm hover:scale-105 active:scale-95 cursor-pointer whitespace-nowrap"
                              title="Buka dan sorot baris ini di Tabel Log lengkap"
                            >
                              Fokus Log
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Footer of Printable Document */}
        <div className="pt-4 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-500">
          <span>Server Monitoring System • Antigravity Heartbeat Analyzer</span>
          <span>Halaman Laporan Insiden Detak Modul • {meta.resolvedDate}</span>
        </div>
      </div>
    </div>
  );
});

export default function PodHbPatternAnalyzerPage({
  initialPodId = null,
  initialModuleId = null,
  initialTime = null,
  initialDate = null,
  onBack = null
}) {
  // 1. Pods and Modules State
  const [servers, setServers] = useState([]);
  const [modules, setModules] = useState(DEFAULT_MODULES);
  const [selectedPodId, setSelectedPodId] = useState(() => {
    return initialPodId ? Number(initialPodId) : null;
  });
  const [selectedModuleId, setSelectedModuleId] = useState(() => {
    return initialModuleId ? Number(initialModuleId) : 507;
  });

  // 2. Time Filters State (WITA / UTC+8 Standard)
  const getTodayLocalDate = () => {
    try {
      return new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Asia/Makassar',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      }).format(new Date());
    } catch (_) {
      return new Date().toLocaleDateString('sv-SE');
    }
  };

  const getCurrentWitaTime = () => {
    try {
      return new Intl.DateTimeFormat('en-GB', {
        timeZone: 'Asia/Makassar',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
      }).format(new Date());
    } catch (_) {
      const now = new Date();
      const h = String(now.getHours()).padStart(2, '0');
      const m = String(now.getMinutes()).padStart(2, '0');
      const s = String(now.getSeconds()).padStart(2, '0');
      return `${h}:${m}:${s}`;
    }
  };

  const [selectedDate, setSelectedDate] = useState(() => initialDate || getTodayLocalDate());
  const [targetTimeStr, setTargetTimeStr] = useState(() => {
    if (initialTime) return String(initialTime);
    return getCurrentWitaTime();
  });
  const [windowMinutes, setWindowMinutes] = useState(5);

  // 3. Analysis Data States
  const [analysisData, setAnalysisData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // 4. Recent Incidents (Quick Picker)
  const [recentIncidents, setRecentIncidents] = useState([]);
  const [isIncidentsDropdownOpen, setIsIncidentsDropdownOpen] = useState(false);
  const [isLoadingIncidents, setIsLoadingIncidents] = useState(false);
  const incidentsRef = useRef(null);

  // 5. Table Search / Filter & Transition Handling (for ultra-low INP)
  const [tableSearch, setTableSearch] = useState('');
  const deferredSearch = useDeferredValue(tableSearch);
  const [tableFilter, setTableFilter] = useState('all'); // 'all' | 'incidents' | 'gaps' | 'lag'
  const [tableTab, setTableTab] = useState('table'); // 'table' | 'json' | 'report'
  const [jsonScope, setJsonScope] = useState('ticks'); // 'ticks' | 'incidents' | 'full' | 'payload'
  const [jsonFormat, setJsonFormat] = useState('raw'); // 'raw' | 'pretty'
  const [copiedJsonTab, setCopiedJsonTab] = useState(false);
  const [copiedReportSuccess, setCopiedReportSuccess] = useState(false);
  const [rangeStart, setRangeStart] = useState(1);
  const [rangeEnd, setRangeEnd] = useState(10);
  const [copiedRangeSuccess, setCopiedRangeSuccess] = useState(false);
  const [copiedLineIdx, setCopiedLineIdx] = useState(null);
  const [isTransitionPending, startTransition] = useTransition();
  const [copiedSuccess, setCopiedSuccess] = useState(false);
  const [displayLimit, setDisplayLimit] = useState(250);
  const tableRef = useRef(null);

  // Load Servers and Modules on mount (Strictly POD V3)
  useEffect(() => {
    let mounted = true;
    async function loadMeta() {
      try {
        const [srvs, mods] = await Promise.allSettled([
          fetchServersApi('', 'pod'),
          fetchHeartbeatModulesApi()
        ]);
        if (!mounted) return;
        if (srvs.status === 'fulfilled' && Array.isArray(srvs.value)) {
          // Strictly filter ONLY POD V3 servers: type === 'pod' and LOWER(pod_version) === 'v3'
          const podUnits = srvs.value
            .filter((s) => {
              const ver = String(s.pod_version || '').toLowerCase().trim();
              return s.type === 'pod' && ver === 'v3';
            })
            .sort((a, b) => {
              const numA = parseInt(String(a.code || a.name || '').replace(/\D/g, ''), 10) || 0;
              const numB = parseInt(String(b.code || b.name || '').replace(/\D/g, ''), 10) || 0;
              if (numA && numB && numA !== numB) return numA - numB;
              return String(a.name || '').localeCompare(String(b.name || ''));
            });

          setServers(podUnits);

          // Resolve active selectedPodId to a valid POD v3
          if (podUnits.length > 0) {
            setSelectedPodId((prevId) => {
              const idToMatch = prevId || initialPodId;
              // 1. If prevId or initialPodId matches server code (e.g. 31 -> POD 31), use its DB id
              if (idToMatch) {
                const matchByCode = podUnits.find((p) => String(p.code) === String(idToMatch));
                if (matchByCode) return matchByCode.id;
              }
              // 2. If prevId matches an actual server ID in podUnits, keep it
              if (prevId && podUnits.some((p) => Number(p.id) === Number(prevId))) {
                return prevId;
              }
              // 3. Fallback: try to select POD 31 by default if present
              const defaultPod31 = podUnits.find((p) => String(p.code) === '31' || /31/.test(p.name));
              if (defaultPod31) return defaultPod31.id;

              return podUnits[0].id;
            });
          }
        }
        if (mods.status === 'fulfilled' && Array.isArray(mods.value) && mods.value.length > 0) {
          setModules(mods.value);
        }
      } catch (_) { }
    }
    loadMeta();
    return () => { mounted = false; };
  }, [initialPodId]);

  // Load Recent Incidents for Quick Picker
  const loadRecentIncidents = async () => {
    setIsLoadingIncidents(true);
    try {
      const data = await fetchRecentFleetIncidentsApi(30);
      setRecentIncidents(data);
    } catch (_) {
    } finally {
      setIsLoadingIncidents(false);
    }
  };

  useEffect(() => {
    loadRecentIncidents();
  }, []);

  // Close incident dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e) {
      if (incidentsRef.current && !incidentsRef.current.contains(e.target)) {
        setIsIncidentsDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Execute Analysis Query
  const runAnalysis = async () => {
    if (!selectedPodId) return;
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetchPodHeartbeatAnalysisApi(selectedPodId, {
        moduleId: selectedModuleId,
        targetTime: targetTimeStr,
        date: selectedDate,
        windowMinutes
      });
      if (!res.success) {
        throw new Error(res.error || 'Gagal memuat hasil analisa.');
      }
      setAnalysisData(res);
    } catch (err) {
      setError(err.message);
      setAnalysisData(null);
    } finally {
      setIsLoading(false);
    }
  };

  // Auto trigger analysis on selection change
  useEffect(() => {
    runAnalysis();
  }, [selectedPodId, selectedModuleId, selectedDate, windowMinutes]);

  // Handle selecting an incident from dropdown
  const handleSelectIncident = (inc) => {
    setIsIncidentsDropdownOpen(false);
    if (inc.podId) {
      const match = servers.find(
        (s) => Number(s.id) === Number(inc.podId) || String(s.code) === String(inc.podId)
      );
      setSelectedPodId(match ? match.id : Number(inc.podId));
    }
    if (inc.moduleId) setSelectedModuleId(Number(inc.moduleId));

    if (inc.timestamp) {
      const d = new Date(inc.timestamp);
      try {
        const dStr = new Intl.DateTimeFormat('en-CA', {
          timeZone: 'Asia/Makassar',
          year: 'numeric',
          month: '2-digit',
          day: '2-digit'
        }).format(d);
        setSelectedDate(dStr);
      } catch (_) {
        setSelectedDate(d.toISOString().split('T')[0]);
      }

      try {
        const timeParts = new Intl.DateTimeFormat('en-GB', {
          timeZone: 'Asia/Makassar',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: false
        }).format(d);
        setTargetTimeStr(timeParts);
      } catch (_) {
        const h = String(d.getHours()).padStart(2, '0');
        const m = String(d.getMinutes()).padStart(2, '0');
        const s = String(d.getSeconds()).padStart(2, '0');
        setTargetTimeStr(`${h}:${m}:${s}`);
      }
    }
  };

  // Set time to current clock in WITA (UTC+8)
  const handleSetTimeToNow = () => {
    setSelectedDate(getTodayLocalDate());
    setTargetTimeStr(getCurrentWitaTime());
  };

  // Helper: jump to specific row index in table and ensure visibility
  const jumpToRowIndex = (targetIdx) => {
    if (targetIdx < 0 || !analysisData?.ticks?.length) return;

    // 1. Ensure table tab is active (if in JSON view)
    setTableTab('table');

    // 2. Clear search filter if it might hide the row
    if (tableSearch) {
      setTableSearch('');
    }

    // 3. Reset table filter if the target tick would be excluded
    const targetTick = analysisData.ticks[targetIdx];
    if (tableFilter === 'gaps' && targetTick?.status !== 'GAP_DEAD') {
      setTableFilter('all');
    }

    // 4. Expand displayLimit so target row is rendered by React
    if (targetIdx >= displayLimit) {
      setDisplayLimit(targetIdx + 100);
    }

    // 5. Scroll outer page smoothly down to the table card container
    const tableCard = document.getElementById('tick-table-card');
    if (tableCard) {
      tableCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    // 6. Scroll inner table to target row with retry loop to allow React DOM paint
    const attemptScrollToRow = (retries = 6) => {
      const el = document.getElementById(`tick-row-${targetIdx}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        el.classList.add('ring-4', 'ring-cyan-400', 'bg-cyan-500/30');
        setTimeout(() => {
          el.classList.remove('ring-4', 'ring-cyan-400', 'bg-cyan-500/30');
        }, 3500);
      } else if (retries > 0) {
        setTimeout(() => attemptScrollToRow(retries - 1), 70);
      }
    };

    setTimeout(() => attemptScrollToRow(6), 80);
  };

  // Jump to specific gap in table
  const handleJumpToGap = (gap) => {
    if (!gap || !analysisData?.ticks?.length) return;
    const targetIdx = analysisData.ticks.findIndex(t => t.ts === gap.endTs);
    if (targetIdx !== -1) {
      jumpToRowIndex(targetIdx);
    }
  };

  // Jump to biggest gap or maximum delay spike in table
  const handleJumpToMaxGap = () => {
    if (!analysisData?.ticks?.length) return;
    if (analysisData.gaps?.length > 0) {
      handleJumpToGap(analysisData.gaps[0]);
    } else {
      let maxIdx = 0;
      let maxVal = -1;
      for (let i = 0; i < analysisData.ticks.length; i++) {
        const d = analysisData.ticks[i].deltaSec;
        if (d !== null && d > maxVal) {
          maxVal = d;
          maxIdx = i;
        }
      }
      jumpToRowIndex(maxIdx);
    }
  };

  // Copy raw JSON segment
  const handleCopyAnalysisJson = () => {
    if (!analysisData) return;
    navigator.clipboard.writeText(JSON.stringify(analysisData, null, 2));
    setCopiedSuccess(true);
    setTimeout(() => setCopiedSuccess(false), 2000);
  };

  // Memoized strictly incident ticks (anomaly rows)
  const incidentTicks = useMemo(() => {
    if (!analysisData?.ticks) return [];
    return analysisData.ticks.filter(t => {
      const isDead = t.status === 'GAP_DEAD' || (t.deltaSec !== null && t.deltaSec >= (analysisData?.meta?.thresholds?.deadSec || 15));
      const isJump = t.status === 'GAP_JUMP' || t.postDeadType === 'LOMPAT' || t.postDeadType === 'LONCAT' || (t.deltaHb !== null && t.deltaHb > 5);
      const isReset = t.status === 'RESET' || t.postDeadType === 'RESET' || (t.deltaHb !== null && t.deltaHb < 0);
      const isLag = t.status === 'GAP_LAG' || (t.deltaSec !== null && t.deltaSec >= 3.0 && !isDead);
      const isFrozen = t.status === 'FROZEN';
      return isDead || isJump || isReset || isLag || isFrozen || Boolean(t.postDeadType);
    });
  }, [analysisData]);

  // Filtered ticks for table (uses deferredSearch to prevent blocking pointer/typing events)
  const filteredTicks = useMemo(() => {
    if (!analysisData?.ticks) return [];
    const query = deferredSearch.trim().toLowerCase();
    return analysisData.ticks.filter(t => {
      if (tableFilter === 'incidents') {
        const isDead = t.status === 'GAP_DEAD' || (t.deltaSec !== null && t.deltaSec >= (analysisData?.meta?.thresholds?.deadSec || 15));
        const isJump = t.status === 'GAP_JUMP' || t.postDeadType === 'LOMPAT' || t.postDeadType === 'LONCAT' || (t.deltaHb !== null && t.deltaHb > 5);
        const isReset = t.status === 'RESET' || t.postDeadType === 'RESET' || (t.deltaHb !== null && t.deltaHb < 0);
        const isLag = t.status === 'GAP_LAG' || (t.deltaSec !== null && t.deltaSec >= 3.0 && !isDead);
        const isFrozen = t.status === 'FROZEN';
        const isInc = isDead || isJump || isReset || isLag || isFrozen || Boolean(t.postDeadType);
        if (!isInc) return false;
      }
      if (tableFilter === 'gaps' && t.status !== 'GAP_DEAD') return false;
      if (tableFilter === 'lag' && t.status !== 'GAP_DEAD' && t.status !== 'GAP_LAG') return false;
      if (query) {
        const dateMatch = t.date?.toLowerCase().includes(query);
        const timeMatch = t.time?.toLowerCase().includes(query);
        const hbMatch = String(t.hb || '').includes(query);
        const portMatch = t.port?.toLowerCase().includes(query);
        return dateMatch || timeMatch || hbMatch || portMatch;
      }
      return true;
    });
  }, [analysisData, tableFilter, deferredSearch]);

  // JSON view content memoized for performance (Raw JSONL vs Pretty Indented)
  const jsonFormattedTicks = useMemo(() => {
    if (!analysisData) return '{\n  "data": []\n}';

    // 1. Full analysis payload
    if (jsonScope === 'full') {
      return jsonFormat === 'pretty'
        ? JSON.stringify(analysisData, null, 2)
        : JSON.stringify(analysisData);
    }

    // 2. Incident ticks only
    if (jsonScope === 'incidents') {
      if (jsonFormat === 'pretty') {
        return JSON.stringify(incidentTicks, null, 2);
      }
      return incidentTicks.map(t => JSON.stringify(t)).join('\n');
    }

    // 3. Hardware payload only (raw MQTT payload received from pod)
    if (jsonScope === 'payload') {
      if (jsonFormat === 'pretty') {
        return JSON.stringify(filteredTicks.map(t => t.payload || { index: t.index, hb: t.hb, ts: t.ts }), null, 2);
      }
      return filteredTicks.map(t => JSON.stringify(t.payload || { index: t.index, hb: t.hb, ts: t.ts })).join('\n');
    }

    // 4. Ticks stream (default: Raw JSONL lines vs Pretty Array)
    if (jsonFormat === 'pretty') {
      return JSON.stringify(filteredTicks, null, 2);
    }
    // Raw JSONL: 1 compact valid JSON line per tick object
    return filteredTicks.map(t => JSON.stringify(t)).join('\n');
  }, [analysisData, filteredTicks, incidentTicks, jsonScope, jsonFormat]);

  // Display lines array for line-by-line rendering and selective multi-line copying
  const displayLines = useMemo(() => {
    if (!jsonFormattedTicks) return [];
    return jsonFormattedTicks.split('\n');
  }, [jsonFormattedTicks]);

  // Copy entire JSON from tab
  const handleCopyJsonTab = () => {
    navigator.clipboard.writeText(jsonFormattedTicks);
    setCopiedJsonTab(true);
    setTimeout(() => setCopiedJsonTab(false), 2000);
  };

  // Copy specific range of lines (e.g. line 1 to 10)
  const handleCopyLineRange = (start, end) => {
    if (!displayLines.length) return;
    const s = Math.max(1, Math.min(Number(start) || 1, displayLines.length));
    const e = Math.max(s, Math.min(Number(end) || s, displayLines.length));
    const linesToCopy = displayLines.slice(s - 1, e).join('\n');
    navigator.clipboard.writeText(linesToCopy);
    setCopiedRangeSuccess(true);
    setTimeout(() => setCopiedRangeSuccess(false), 2000);
  };

  // Copy a single line
  const handleCopySingleLine = (line, lineNum) => {
    navigator.clipboard.writeText(line);
    setCopiedLineIdx(lineNum);
    setTimeout(() => setCopiedLineIdx(null), 1500);
  };

  // Download JSON / JSONL file
  const handleDownloadJson = () => {
    if (!analysisData) return;
    const isRawLines = jsonFormat === 'raw' && jsonScope !== 'full';
    const ext = isRawLines ? 'jsonl' : 'json';
    const mime = isRawLines ? 'application/x-ndjson' : 'application/json';
    const blob = new Blob([jsonFormattedTicks], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `hb_analysis_pod${selectedPodId || 'all'}_mod${selectedModuleId}_${selectedDate}_${jsonScope}_${jsonFormat}.${ext}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Generate Markdown report content focusing on incident rows
  const generateMarkdownReport = () => {
    if (!analysisData) return '';
    const meta = analysisData.meta || {};
    const diag = analysisData.diagnosis || {};
    const thresholds = meta.thresholds || {};

    let md = `# LAPORAN ANALISA INSIDEN DETAK MODUL (HEARTBEAT REPORT)\n\n`;
    try {
      const nowFormatted = new Intl.DateTimeFormat('id-ID', { timeZone: 'Asia/Makassar', dateStyle: 'full', timeStyle: 'medium' }).format(new Date());
      md += `**Tanggal Cetak Laporan**: ${nowFormatted} WITA\n`;
    } catch (_) {
      md += `**Tanggal Cetak Laporan**: ${new Date().toLocaleString()} WITA\n`;
    }
    md += `**Target Server / POD**: ${meta.serverName || `POD ${selectedPodId}`} (ID: ${meta.podId || selectedPodId})\n`;
    md += `**Modul Hardware**: ${meta.moduleName || `Modul ${selectedModuleId}`} (ID: ${meta.moduleId || selectedModuleId})\n`;
    md += `**Waktu Target Analisis**: ${meta.targetTime || targetTimeStr} WITA (${meta.resolvedDate || selectedDate})\n`;
    md += `**Jendela Pemantauan**: ±${meta.windowMinutes || windowMinutes} Menit (Total ${analysisData.ticks?.length || 0} Data Ticks)\n`;
    md += `**Ambang Batas**: Dead Gap ≥ ${thresholds.deadSec || 15}s | Frozen ≥ ${thresholds.frozenSec || 10}s | Lag ≥ 3s\n\n`;

    md += `---\n\n`;
    md += `## 1. RINGKASAN EKSEKUTIF & DIAGNOSA ROOT CAUSE\n\n`;
    md += `- **Klasifikasi Pola**: ${diag.patternTitle || 'NORMAL'}\n`;
    md += `- **Tingkat Keparahan (Severity)**: ${diag.severity || 'INFO'}\n`;
    md += `- **Tipe Pasca-Jeda**: ${diag.postDeadLabel || diag.postDeadType || '—'}\n`;
    md += `- **Ringkasan Kejadian**: ${diag.summary || 'Detak beroperasi normal tanpa jeda signifikan.'}\n\n`;
    md += `### Detail Akar Masalah Teknis:\n${diag.rootCauseDetails || 'Tidak ditemukan anomali atau kegagalan perangkat.'}\n\n`;
    md += `### Rekomendasi Tindakan Teknis:\n${diag.recommendedAction || 'Sistem beroperasi normal, tidak ada tindakan perbaikan yang diperlukan.'}\n\n`;

    md += `---\n\n`;
    md += `## 2. STATISTIK ANOMALI & INSIDEN\n\n`;
    md += `- **Total Baris Insiden Terdeteksi**: ${incidentTicks.length} baris\n`;
    md += `- **Jeda Mati Terpanjang (Max Dead Gap)**: ${meta.stats?.maxDeltaSec ? meta.stats.maxDeltaSec.toFixed(2) : 0} detik\n`;
    md += `- **Rata-rata Interval Pengiriman**: ${meta.stats?.avgDeltaSec ? meta.stats.avgDeltaSec.toFixed(2) : 0} detik\n`;
    md += `- **Total Kejadian Dead Gap (≥${thresholds.deadSec || 15}s)**: ${analysisData.gaps?.length || 0} kali\n\n`;

    md += `---\n\n`;
    md += `## 3. TABEL FOKUS BARIS DATA INSIDEN\n\n`;
    if (incidentTicks.length === 0) {
      md += `*Tidak ada baris data yang mengalami anomali pada jendela pemantauan ini. Seluruh detak modul beroperasi stabil dan berkelanjutan.*\n`;
    } else {
      md += `| No | Waktu (WITA) | Timestamp | Counter (#hb) | Selisih (ΔHB) | Jeda (Δt) | Status Insiden | Port | Keterangan Implikasi |\n`;
      md += `|---|---|---|---|---|---|---|---|---|\n`;
      incidentTicks.forEach((t, idx) => {
        const prevTick = t.index > 1 ? analysisData.ticks[t.index - 2] : null;
        const prevHb = prevTick?.hb !== undefined ? prevTick.hb : null;
        const hbFlow = prevHb !== null ? `#${prevHb} -> #${t.hb}` : `#${t.hb}`;
        const deltaHbStr = t.deltaHb !== null ? (t.deltaHb > 0 ? `+${t.deltaHb}` : `${t.deltaHb}`) : '—';
        const deltaSecStr = t.deltaSec !== null ? `${t.deltaSec.toFixed(2)}s` : '—';
        const typeStr = t.postDeadLabel || t.status || 'INSIDEN';

        let desc = 'Anomali transmisi detak.';
        if (t.postDeadType === 'LOMPAT' || t.deltaHb > 5) {
          desc = `Counter melompat (+${t.deltaHb} detak hilang di perjalanan jaringan/broker). Hardware tetap hidup.`;
        } else if (t.postDeadType === 'RESET' || t.status === 'RESET') {
          desc = 'Counter reset kembali ke awal (Modul MCU restart / catu daya drop).';
        } else if (t.status === 'GAP_DEAD') {
          desc = `Jeda mati hening ${deltaSecStr} melebihi ambang batas.`;
        } else if (t.status === 'GAP_LAG') {
          desc = `Lag spike keterlambatan pengiriman (${deltaSecStr}).`;
        } else if (t.status === 'FROZEN') {
          desc = 'Counter membeku / tidak bertambah.';
        }

        md += `| ${idx + 1} | ${t.time || t.date} | ${t.ts} | ${hbFlow} | ${deltaHbStr} | ${deltaSecStr} | ${typeStr} | ${t.port || 'serial'} | ${desc} |\n`;
      });
    }

    md += `\n---\n*Dokumen ini dibuat otomatis oleh Sistem Monitoring Server & Heartbeat Analyzer.*\n`;
    return md;
  };

  // Copy Markdown Report to Clipboard
  const handleCopyMarkdownReport = () => {
    const md = generateMarkdownReport();
    if (!md) return;
    navigator.clipboard.writeText(md);
    setCopiedReportSuccess(true);
    setTimeout(() => setCopiedReportSuccess(false), 2000);
  };

  // Download Markdown Report File
  const handleDownloadIncidentMarkdown = () => {
    const md = generateMarkdownReport();
    if (!md) return;
    const meta = analysisData?.meta || {};
    const blob = new Blob([md], { type: 'text/markdown;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `laporan_insiden_pod${meta.podId || selectedPodId}_mod${meta.moduleId || selectedModuleId}_${meta.resolvedDate || selectedDate}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Download Incident Rows CSV
  const handleDownloadIncidentCsv = () => {
    if (!analysisData || incidentTicks.length === 0) return;
    const meta = analysisData.meta || {};
    const headers = ['No', 'Baris_Log', 'Date_WITA', 'Time_WITA', 'Timestamp_MS', 'Counter_Sebelum', 'Counter_Sesudah', 'Delta_HB', 'Delta_Sec', 'Status', 'Tipe_Pasca_Jeda', 'Port', 'Penjelasan_Implikasi'];
    const rows = incidentTicks.map((t, idx) => {
      const prevTick = t.index > 1 ? analysisData.ticks[t.index - 2] : null;
      const prevHb = prevTick?.hb !== undefined ? prevTick.hb : '';
      const deltaHbStr = t.deltaHb !== null ? String(t.deltaHb) : '';
      const deltaSecStr = t.deltaSec !== null ? t.deltaSec.toFixed(2) : '';

      let desc = 'Anomali transmisi detak';
      if (t.postDeadType === 'LOMPAT' || t.deltaHb > 5) {
        desc = `Counter melompat (+${t.deltaHb} detak hilang di perjalanan)`;
      } else if (t.postDeadType === 'RESET' || t.status === 'RESET') {
        desc = 'Counter reset mulai dari awal (Modul MCU restart)';
      } else if (t.status === 'GAP_DEAD') {
        desc = `Dead gap hening selama ${deltaSecStr}s`;
      } else if (t.status === 'GAP_LAG') {
        desc = `Lag spike keterlambatan pengiriman selama ${deltaSecStr}s`;
      } else if (t.status === 'FROZEN') {
        desc = 'Counter membeku / tidak bertambah';
      }

      return [
        idx + 1,
        t.index,
        `"${t.date || ''}"`,
        `"${t.time || ''}"`,
        t.ts,
        prevHb !== '' ? prevHb : '',
        t.hb !== null ? t.hb : '',
        deltaHbStr,
        deltaSecStr,
        `"${t.status || ''}"`,
        `"${t.postDeadLabel || t.postDeadType || ''}"`,
        `"${t.port || ''}"`,
        `"${desc}"`
      ].join(',');
    });

    const csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `baris_insiden_pod${meta.podId || selectedPodId}_mod${meta.moduleId || selectedModuleId}_${meta.resolvedDate || selectedDate}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Print Report Handler
  const handlePrintReport = () => {
    window.print();
  };

  // Jump from Incident Report to precise row in full Table Log
  const handleJumpToTick = (tick) => {
    if (!tick || !analysisData?.ticks?.length) return;
    const targetIdx = analysisData.ticks.findIndex(t => t.index === tick.index || t.ts === tick.ts);
    if (targetIdx !== -1) {
      setTableTab('table');
      setTableFilter('all');
      jumpToRowIndex(targetIdx);
    }
  };

  // Diagnosis Card Color & Theme Mapping
  const diagnosisTheme = useMemo(() => {
    const pType = analysisData?.diagnosis?.patternType;
    switch (pType) {
      case 'TRANSIENT_IO_LAG':
        return {
          bg: 'bg-amber-950/30 border-amber-500/40 text-amber-200',
          badgeBg: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
          icon: AlertTriangle,
          iconColor: 'text-amber-400',
          gradient: 'from-amber-500/20 to-transparent'
        };
      case 'HARDWARE_REBOOT':
        return {
          bg: 'bg-rose-950/30 border-rose-500/40 text-rose-200',
          badgeBg: 'bg-rose-500/20 text-rose-300 border-rose-500/30',
          icon: Flame,
          iconColor: 'text-rose-400',
          gradient: 'from-rose-500/20 to-transparent'
        };
      case 'PACKET_DROP':
        return {
          bg: 'bg-blue-950/30 border-blue-500/40 text-blue-200',
          badgeBg: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
          icon: Radio,
          iconColor: 'text-blue-400',
          gradient: 'from-blue-500/20 to-transparent'
        };
      case 'FROZEN_STUCK':
        return {
          bg: 'bg-purple-950/30 border-purple-500/40 text-purple-200',
          badgeBg: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
          icon: ShieldAlert,
          iconColor: 'text-purple-400',
          gradient: 'from-purple-500/20 to-transparent'
        };
      case 'BURST_FLUSH':
        return {
          bg: 'bg-cyan-950/30 border-cyan-500/40 text-cyan-200',
          badgeBg: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30',
          icon: Zap,
          iconColor: 'text-cyan-400',
          gradient: 'from-cyan-500/20 to-transparent'
        };
      case 'HEALTHY_NORMAL':
        return {
          bg: 'bg-emerald-950/30 border-emerald-500/40 text-emerald-200',
          badgeBg: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
          icon: CheckCircle2,
          iconColor: 'text-emerald-400',
          gradient: 'from-emerald-500/20 to-transparent'
        };
      default:
        return {
          bg: 'bg-slate-900/60 border-slate-800 text-slate-300',
          badgeBg: 'bg-slate-800 text-slate-300 border-slate-700',
          icon: Activity,
          iconColor: 'text-cyan-400',
          gradient: 'from-slate-800/20 to-transparent'
        };
    }
  }, [analysisData?.diagnosis?.patternType]);

  const DiagnosisIcon = diagnosisTheme.icon;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 sm:p-6 lg:p-8 space-y-6 font-sans">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-4 border-b border-slate-800/80">
        <div className="flex items-center gap-3">
          {onBack && (
            <button
              onClick={onBack}
              className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800 transition shadow-sm"
              title="Kembali"
            >
              <ArrowLeft size={20} />
            </button>
          )}
          <div>
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
                <Activity size={22} className="animate-pulse" />
              </div>
              <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white flex items-center gap-2 flex-wrap">
                Analisa Pola Heartbeat
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-cyan-500/15 text-cyan-300 font-semibold border border-cyan-500/30">
                  Incident Diagnostic
                </span>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 font-semibold border border-emerald-500/30 flex items-center gap-1">
                  <Clock size={12} /> WITA (UTC+8)
                </span>
              </h1>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Investigasi jeda waktu paket detak, kontinuitas counter #hb, dan diagnosa akar penyebab kematian modul
            </p>
          </div>
        </div>

        {/* Right Actions & Incident Quick Picker */}
        <div className="flex flex-wrap items-center gap-2.5 relative" ref={incidentsRef}>
          {/* Quick Incident Dropdown Picker */}
          <div className="relative">
            <button
              onClick={() => setIsIncidentsDropdownOpen(!isIncidentsDropdownOpen)}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 font-semibold text-xs transition shadow-sm"
            >
              <ShieldAlert size={15} className="text-rose-400" />
              <span>Pilih dari Alert Terbaru ({recentIncidents.length})</span>
              <ChevronDown size={14} className={`transition-transform duration-200 ${isIncidentsDropdownOpen ? 'rotate-180' : ''}`} />
            </button>

            {isIncidentsDropdownOpen && (
              <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl bg-slate-900 border border-slate-700/80 shadow-2xl z-50 overflow-hidden backdrop-blur-xl animate-in fade-in zoom-in-95 duration-150">
                <div className="p-3 border-b border-slate-800 bg-slate-950/50 flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                    <ShieldAlert size={14} className="text-rose-400" />
                    Riwayat Alert Dead / Frozen Terakhir
                  </span>
                  <button
                    onClick={loadRecentIncidents}
                    className="text-[11px] text-cyan-400 hover:text-cyan-300 flex items-center gap-1"
                  >
                    <RefreshCw size={11} className={isLoadingIncidents ? 'animate-spin' : ''} />
                    Muat Ulang
                  </button>
                </div>

                <div className="max-h-72 overflow-y-auto divide-y divide-slate-800/60 custom-scrollbar">
                  {recentIncidents.length === 0 ? (
                    <div className="p-4 text-center text-xs text-slate-500">
                      Tidak ada rekaman insiden recent yang tersimpan.
                    </div>
                  ) : (
                    recentIncidents.map((inc) => (
                      <button
                        key={inc.id}
                        onClick={() => handleSelectIncident(inc)}
                        className="w-full text-left p-3 hover:bg-slate-800/70 transition flex items-start justify-between gap-2 group"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${inc.alertType === 'DEAD' ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30' : 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                              }`}>
                              {inc.alertType}
                            </span>
                            <span className="text-xs font-bold text-white group-hover:text-cyan-300 transition">
                              {inc.serverName}
                            </span>
                            <span className="text-[11px] text-slate-400">
                              Mod {inc.moduleId} ({inc.moduleName})
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-400 mt-1 flex items-center gap-2">
                            <Clock size={11} className="text-slate-500" />
                            <span>{inc.timeFormatted}</span>
                            {inc.lastHb !== null && inc.lastHb !== undefined && (
                              <span className="text-cyan-400 font-mono">#{inc.lastHb}</span>
                            )}
                          </div>
                        </div>
                        {inc.downtimeSeconds > 0 && (
                          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-amber-400 whitespace-nowrap">
                            {inc.downtimeSeconds}s
                          </span>
                        )}
                      </button>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Copy Analysis JSON */}
          <button
            onClick={handleCopyAnalysisJson}
            disabled={!analysisData}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 text-xs font-medium transition disabled:opacity-50"
            title="Salin hasil diagnosa JSON"
          >
            {copiedSuccess ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
            <span>{copiedSuccess ? 'Tersalin' : 'Salin Data'}</span>
          </button>

          {/* Refresh Button */}
          <button
            onClick={runAnalysis}
            disabled={isLoading}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-semibold text-xs transition shadow-lg shadow-cyan-600/20 disabled:opacity-50"
          >
            <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
            <span>{isLoading ? 'Menganalisis...' : 'Analisis Ulang'}</span>
          </button>
        </div>
      </div>

      {/* Control Filter Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 p-4 rounded-2xl bg-slate-900/70 border border-slate-800/80 shadow-lg backdrop-blur-md">
        {/* 1. Pod Selector */}
        <div>
          <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
            <Server size={13} className="text-cyan-400" />
            Unit Pod
          </label>
          <select
            value={selectedPodId || ''}
            onChange={(e) => {
              const val = Number(e.target.value);
              startTransition(() => setSelectedPodId(val));
            }}
            className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs font-semibold focus:outline-none focus:border-cyan-500"
          >
            {servers.length === 0 ? (
              <option value="">Memuat unit POD v3...</option>
            ) : (
              servers.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name || `POD ${s.id}`} (ID: {s.id})
                </option>
              ))
            )}
          </select>
        </div>

        {/* 2. Module Selector */}
        <div>
          <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
            <Cpu size={13} className="text-emerald-400" />
            Modul Hardware
          </label>
          <select
            value={selectedModuleId}
            onChange={(e) => {
              const val = Number(e.target.value);
              startTransition(() => setSelectedModuleId(val));
            }}
            className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs font-semibold focus:outline-none focus:border-emerald-500"
          >
            {modules.map((m) => (
              <option key={m.id} value={m.id}>
                ID {m.id} — {m.name} {m.defaultPort ? `(${m.defaultPort})` : ''}
              </option>
            ))}
          </select>
        </div>

        {/* 3. Date Input */}
        <div>
          <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
            <Clock size={13} className="text-blue-400" />
            Tanggal Insiden (WITA)
          </label>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs font-mono focus:outline-none focus:border-blue-500"
          />
        </div>

        {/* 4. Target Time Input */}
        <div>
          <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Clock size={13} className="text-amber-400" />
              Waktu Insiden (WITA)
            </span>
            <button
              onClick={handleSetTimeToNow}
              className="text-[10px] text-cyan-400 hover:text-cyan-300 font-semibold"
            >
              Sekarang (WITA)
            </button>
          </label>
          <input
            type="text"
            value={targetTimeStr}
            onChange={(e) => setTargetTimeStr(e.target.value)}
            placeholder="HH:mm:ss WITA (contoh: 19:01:05)"
            className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs font-mono focus:outline-none focus:border-amber-500"
          />
        </div>

        {/* 5. Window Minutes */}
        <div>
          <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
            <Layers size={13} className="text-purple-400" />
            Jendela Analisa
          </label>
          <div className="grid grid-cols-4 gap-1">
            {[2, 5, 15, 30].map((win) => (
              <button
                key={win}
                onClick={() => setWindowMinutes(win)}
                className={`py-2 text-xs font-bold rounded-xl border transition ${windowMinutes === win
                  ? 'bg-purple-600 border-purple-500 text-white shadow-md shadow-purple-600/30'
                  : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white hover:bg-slate-900'
                  }`}
              >
                ±{win}m
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="p-4 rounded-2xl bg-rose-950/40 border border-rose-500/40 text-rose-300 text-xs flex items-center gap-3">
          <AlertCircle size={18} className="text-rose-400 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Data Gaps Breakdown Section */}
      <DataGapsBreakdownSection
        analysisData={analysisData}
        onJumpToGap={handleJumpToGap}
        onJumpToMaxGap={handleJumpToMaxGap}
      />

      {/* Visual Charts Grid (Isolated Memoized Component) */}
      <VisualChartsSection analysisData={analysisData} />

      {/* Raw Tick High-Precision Timeline Table & JSON Viewer */}
      <div id="tick-table-card" className="p-5 rounded-3xl bg-slate-900/60 border border-slate-800 shadow-2xl space-y-4" style={{ contentVisibility: 'auto', containIntrinsicSize: 'auto 750px' }}>
        {/* Top Header & View Navigation Tabs */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-slate-800">
          <div className="flex items-center gap-3 flex-wrap">
            {/* View Mode Tabs: Tabel vs JSON vs Laporan Insiden */}
            <div className="flex items-center bg-slate-950 p-1 rounded-2xl border border-slate-800/90 text-xs font-semibold shadow-inner">
              <button
                onClick={() => setTableTab('table')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition cursor-pointer ${tableTab === 'table'
                  ? 'bg-cyan-600 text-white shadow-md shadow-cyan-600/30 font-bold'
                  : 'text-slate-400 hover:text-white'
                  }`}
              >
                <Table size={14} />
                <span>Tabel Log</span>
              </button>
              <button
                onClick={() => setTableTab('json')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition cursor-pointer ${tableTab === 'json'
                  ? 'bg-cyan-600 text-white shadow-md shadow-cyan-600/30 font-bold'
                  : 'text-slate-400 hover:text-white'
                  }`}
              >
                <Code2 size={14} />
                <span>JSON</span>
              </button>
              <button
                onClick={() => setTableTab('report')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition cursor-pointer ${tableTab === 'report'
                  ? 'bg-gradient-to-r from-rose-600 to-amber-600 text-white shadow-md shadow-rose-600/30 font-bold'
                  : 'text-slate-400 hover:text-white'
                  }`}
              >
                <FileText size={14} />
                <span>Laporan Insiden</span>
                {incidentTicks.length > 0 && (
                  <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-rose-500 text-white font-black animate-pulse">
                    {incidentTicks.length}
                  </span>
                )}
              </button>
            </div>

            {/* Context Subtitle */}
            <div className="hidden lg:block">
              <span className="text-xs text-slate-400">
                {tableTab === 'table'
                  ? 'Daftar paket data kronologis presisi milidetik'
                  : tableTab === 'json'
                    ? 'Struktur data JSON murni untuk inspeksi mendalam'
                    : 'Dokumen investigasi resmi berfokus pada akar masalah & baris anomali'}
              </span>
            </div>
          </div>

          {/* Right Header Status / JSON Controls */}
          {tableTab === 'table' ? (
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-slate-500 font-mono hidden sm:inline">
                Standar WITA (UTC+8)
              </span>
              <span className="text-xs font-mono font-bold px-2.5 py-1 rounded-xl bg-slate-950 border border-slate-800 text-cyan-300">
                {filteredTicks.length} <span className="text-slate-500 font-normal font-sans text-[11px]">/ {analysisData?.ticks?.length || 0} Detak</span>
              </span>
            </div>
          ) : tableTab === 'report' ? (
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold px-2.5 py-1 rounded-xl bg-rose-500/15 text-rose-300 border border-rose-500/30">
                {incidentTicks.length} Baris Anomali Terdeteksi
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto justify-end">
              {/* Format Switcher */}
              <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs font-semibold">
                <button
                  onClick={() => setJsonFormat('raw')}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-lg transition cursor-pointer ${jsonFormat === 'raw'
                    ? 'bg-cyan-600 text-white shadow-md shadow-cyan-600/30 font-bold'
                    : 'text-slate-400 hover:text-white'
                    }`}
                  title="Raw JSON: 1 baris per objek (format JSONL)"
                >
                  <AlignLeft size={12} />
                  <span>Raw JSON</span>
                </button>
                <button
                  onClick={() => setJsonFormat('pretty')}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-lg transition cursor-pointer ${jsonFormat === 'pretty'
                    ? 'bg-cyan-600 text-white shadow-md shadow-cyan-600/30 font-bold'
                    : 'text-slate-400 hover:text-white'
                    }`}
                  title="Format Rapi dengan indentasi bertingkat"
                >
                  <Braces size={12} />
                  <span>Format Rapi</span>
                </button>
              </div>

              {/* Scope Switcher */}
              <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs font-semibold">
                <button
                  onClick={() => setJsonScope('ticks')}
                  className={`px-2.5 py-1 rounded-lg transition cursor-pointer ${jsonScope === 'ticks' ? 'bg-slate-800 text-white font-bold' : 'text-slate-400 hover:text-white'}`}
                >
                  Ticks ({filteredTicks.length})
                </button>
                <button
                  onClick={() => setJsonScope('incidents')}
                  className={`px-2.5 py-1 rounded-lg transition cursor-pointer ${jsonScope === 'incidents' ? 'bg-rose-600 text-white font-bold shadow-sm' : 'text-rose-400 hover:text-white'}`}
                >
                  Insiden ({incidentTicks.length})
                </button>
                <button
                  onClick={() => setJsonScope('full')}
                  className={`px-2.5 py-1 rounded-lg transition cursor-pointer ${jsonScope === 'full' ? 'bg-slate-800 text-white font-bold' : 'text-slate-400 hover:text-white'}`}
                >
                  Full
                </button>
              </div>

              {/* Copy Button */}
              <button
                onClick={handleCopyJsonTab}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-950 hover:bg-slate-800 text-slate-300 border border-slate-800 text-xs font-semibold transition cursor-pointer"
                title="Salin seluruh isi JSON saat ini"
              >
                {copiedJsonTab ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
                <span>{copiedJsonTab ? 'Tersalin' : 'Salin'}</span>
              </button>

              {/* Download Button */}
              <button
                onClick={handleDownloadJson}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-950 hover:bg-slate-800 text-cyan-300 border border-slate-800 text-xs font-semibold transition cursor-pointer"
                title="Unduh file data"
              >
                <Download size={13} />
                <span>.{jsonFormat === 'raw' && jsonScope !== 'full' ? 'jsonl' : 'json'}</span>
              </button>
            </div>
          )}
        </div>

        {/* Content Body: Report, Table, or JSON */}
        {tableTab === 'report' ? (
          <IncidentReportView
            analysisData={analysisData}
            incidentTicks={incidentTicks}
            onJumpToTick={handleJumpToTick}
            onPrint={handlePrintReport}
            onCopyMarkdown={handleCopyMarkdownReport}
            onDownloadMarkdown={handleDownloadIncidentMarkdown}
            onDownloadCsv={handleDownloadIncidentCsv}
            copiedReportSuccess={copiedReportSuccess}
          />
        ) : tableTab === 'table' ? (
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
                    className="px-3 py-1 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-300 font-semibold transition"
                  >
                    +250 Baris Lagi
                  </button>
                  <button
                    onClick={() => setDisplayLimit(filteredTicks.length)}
                    className="px-3 py-1 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold transition"
                  >
                    Tampilkan Semua ({filteredTicks.length})
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {/* Metadata & Multi-Line Range Copy Bar */}
            <div className="p-3 rounded-2xl bg-slate-950/80 border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2 flex-wrap text-[11px] text-slate-400">
                <span className="font-mono px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-cyan-300 font-bold">
                  {displayLines.length.toLocaleString()} Baris
                </span>
                <span>
                  Format: <strong className="text-slate-200">{jsonFormat === 'raw' ? 'Raw JSON (1 Baris per Paket / JSONL)' : 'Pretty JSON (Indented)'}</strong>
                </span>
                <span className="text-slate-500">•</span>
                <span className="text-slate-400">
                  Cakupan: <strong className="text-slate-300">{jsonScope === 'full' ? 'Full Analysis Payload' : jsonScope === 'payload' ? 'MQTT Raw Payloads' : 'Ticks Stream'}</strong>
                </span>
                <span className="text-slate-500">•</span>
                <span className="text-emerald-400 font-medium">
                  Tip: Blok teks dengan kursor untuk salin sebagian baris
                </span>
              </div>

              {/* Multi-Line Range Copy Controls */}
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[11px] font-bold text-slate-400">Salin Rentang:</span>
                <div className="flex items-center gap-1 font-mono text-xs">
                  <input
                    type="number"
                    min="1"
                    max={displayLines.length || 1}
                    value={rangeStart}
                    onChange={(e) => setRangeStart(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-14 px-2 py-1 rounded-lg bg-slate-900 border border-slate-700 text-cyan-300 font-bold text-center focus:outline-none focus:border-cyan-500"
                    title="Nomor baris awal"
                  />
                  <span className="text-slate-500">s/d</span>
                  <input
                    type="number"
                    min="1"
                    max={displayLines.length || 1}
                    value={rangeEnd}
                    onChange={(e) => setRangeEnd(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-14 px-2 py-1 rounded-lg bg-slate-900 border border-slate-700 text-cyan-300 font-bold text-center focus:outline-none focus:border-cyan-500"
                    title="Nomor baris akhir"
                  />
                </div>

                {/* Range Copy Button */}
                <button
                  onClick={() => handleCopyLineRange(rangeStart, rangeEnd)}
                  className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-cyan-600/20 hover:bg-cyan-600/30 text-cyan-300 border border-cyan-500/40 text-xs font-bold transition shadow-sm cursor-pointer"
                  title={`Salin baris ${rangeStart} sampai ${rangeEnd}`}
                >
                  {copiedRangeSuccess ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                  <span>{copiedRangeSuccess ? 'Tersalin!' : `Salin (${rangeStart}-${rangeEnd})`}</span>
                </button>

                {/* Quick Presets */}
                <div className="flex items-center gap-1 border-l border-slate-800 pl-2">
                  <button
                    onClick={() => {
                      setRangeStart(1);
                      setRangeEnd(Math.min(5, displayLines.length));
                      handleCopyLineRange(1, Math.min(5, displayLines.length));
                    }}
                    className="px-2 py-1 rounded bg-slate-900 hover:bg-slate-800 text-[10px] font-mono text-slate-300 border border-slate-800 transition cursor-pointer"
                    title="Salin 5 baris pertama"
                  >
                    5 Baris
                  </button>
                  <button
                    onClick={() => {
                      setRangeStart(1);
                      setRangeEnd(Math.min(10, displayLines.length));
                      handleCopyLineRange(1, Math.min(10, displayLines.length));
                    }}
                    className="px-2 py-1 rounded bg-slate-900 hover:bg-slate-800 text-[10px] font-mono text-slate-300 border border-slate-800 transition cursor-pointer"
                    title="Salin 10 baris pertama"
                  >
                    10 Baris
                  </button>
                </div>
              </div>
            </div>

            {/* Line-Numbered Code Viewer (Clean text selection without line numbers in clipboard!) */}
            <div className="relative rounded-2xl border border-slate-800/80 overflow-hidden bg-slate-950/90 shadow-inner">
              <div className="overflow-x-auto max-h-[650px] lg:max-h-[750px] overflow-y-auto custom-scrollbar p-3 font-mono text-[11px] leading-relaxed">
                <table className="w-full border-collapse">
                  <tbody>
                    {displayLines.map((line, idx) => {
                      const lineNum = idx + 1;
                      const isCopied = copiedLineIdx === lineNum;
                      const inRange = lineNum >= rangeStart && lineNum <= rangeEnd;

                      return (
                        <tr
                          key={idx}
                          className={`hover:bg-slate-900/80 transition-colors group ${inRange ? 'bg-cyan-950/20' : ''}`}
                        >
                          {/* Line number (select-none) */}
                          <td className="w-12 text-right pr-3 pl-1 text-slate-600 select-none text-[10px] font-mono align-top py-0.5 border-r border-slate-800/60 shrink-0">
                            {lineNum}
                          </td>

                          {/* Quick 1-click line copy button (select-none) */}
                          <td className="w-8 pl-2 pr-1 text-center select-none align-top py-0.5 shrink-0">
                            <button
                              onClick={() => handleCopySingleLine(line, lineNum)}
                              className="opacity-0 group-hover:opacity-100 p-0.5 rounded text-slate-500 hover:text-cyan-300 hover:bg-slate-800 transition cursor-pointer"
                              title={`Salin baris #${lineNum}`}
                            >
                              {isCopied ? <Check size={11} className="text-emerald-400" /> : <Copy size={11} />}
                            </button>
                          </td>

                          {/* Line text (natural select-text, NO select-all!) */}
                          <td className="pl-3 text-emerald-400 font-mono whitespace-pre py-0.5 select-text break-all sm:break-normal">
                            {line}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
