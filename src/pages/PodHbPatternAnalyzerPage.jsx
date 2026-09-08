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
  Code2,
  Table
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
  const isDeadGap = tick.status === 'GAP_DEAD';
  const isLag = tick.status === 'GAP_LAG';
  const isFrozen = tick.status === 'FROZEN';

  return (
    <tr
      id={`tick-row-${tick.index - 1}`}
      className={`hover:bg-slate-800/50 transition ${isDeadGap
        ? 'bg-rose-950/30 border-l-4 border-rose-500'
        : isLag
          ? 'bg-amber-950/20 border-l-4 border-amber-500'
          : isFrozen
            ? 'bg-purple-950/20 border-l-4 border-purple-500'
            : ''
        }`}
    >
      <td className="py-2 px-3 text-slate-500">{tick.index}</td>
      <td className="py-2 px-3 text-slate-300">
        <span className="font-sans text-slate-200 font-medium">{tick.date}</span>
      </td>
      <td className="py-2 px-3 font-bold text-white">
        {tick.hb !== null ? `#${tick.hb}` : '—'}
      </td>
      <td className="py-2 px-3">
        {tick.deltaHb !== null ? (
          <span className={tick.deltaHb === 1 ? 'text-slate-400' : tick.deltaHb > 1 ? 'text-amber-400 font-bold' : 'text-rose-400 font-bold'}>
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
            ) : tick.postDeadType === 'LONCAT' ? (
              <span className="inline-flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded bg-blue-600/30 text-blue-200 border border-blue-500/50">
                <Radio size={10} /> LONCAT (+{tick.deltaHb})
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
                  labelFormatter={(label) => `Waktu: ${label}`}
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
                  labelFormatter={(label) => `Waktu: ${label}`}
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
const DataGapsBreakdownSection = memo(function DataGapsBreakdownSection({ analysisData, onJumpToGap }) {
  const gaps = analysisData?.gaps || [];
  const deadSec = analysisData?.meta?.thresholds?.deadSec || 15;

  if (!analysisData || gaps.length === 0) {
    return (
      <div className="p-4 sm:p-5 rounded-3xl bg-slate-900/40 border border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <CheckCircle2 size={16} />
          </div>
          <div>
            <span className="font-bold text-white block">Tidak Ada Jeda Mati Terdeteksi (Gaps = 0)</span>
            <span className="text-[11px] text-slate-400">Semua paket detak modul tiba dalam rentang waktu toleransi (&lt; {deadSec}s). Aliran sinyal normal.</span>
          </div>
        </div>
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
                    {gap.startTime || '—'} → {gap.endTime || '—'}
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
                    LONCAT (+{gap.hbDiff})
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
                    className="flex items-center gap-1 text-[11px] font-bold text-cyan-400 hover:text-cyan-300 underline whitespace-nowrap ml-auto"
                  >
                    Fokus di Tabel ↓
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

  // 2. Time Filters State
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

  const [selectedDate, setSelectedDate] = useState(() => initialDate || getTodayLocalDate());
  const [targetTimeStr, setTargetTimeStr] = useState(() => {
    if (initialTime) return String(initialTime);
    return '15:21:27';
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
  const [tableFilter, setTableFilter] = useState('all'); // 'all' | 'gaps' | 'lag'
  const [tableTab, setTableTab] = useState('table'); // 'table' | 'json'
  const [jsonScope, setJsonScope] = useState('ticks'); // 'ticks' | 'full'
  const [copiedJsonTab, setCopiedJsonTab] = useState(false);
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
              // 1. If prevId matches an actual server ID in podUnits, keep it
              if (prevId && podUnits.some((p) => Number(p.id) === Number(prevId))) {
                return prevId;
              }
              // 2. If prevId or initialPodId matches server code (e.g. 31 -> POD 31)
              const idToMatch = prevId || initialPodId;
              if (idToMatch) {
                const matchByCode = podUnits.find((p) => String(p.code) === String(idToMatch));
                if (matchByCode) return matchByCode.id;
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

  // Set time to current clock
  const handleSetTimeToNow = () => {
    const now = new Date();
    setSelectedDate(getTodayLocalDate());
    const h = String(now.getHours()).padStart(2, '0');
    const m = String(now.getMinutes()).padStart(2, '0');
    const s = String(now.getSeconds()).padStart(2, '0');
    setTargetTimeStr(`${h}:${m}:${s}`);
  };

  // Jump to specific gap in table
  const handleJumpToGap = (gap) => {
    if (!gap || !analysisData?.ticks?.length) return;
    const targetIdx = analysisData.ticks.findIndex(t => t.ts === gap.endTs);
    if (targetIdx !== -1) {
      if (targetIdx >= displayLimit) {
        setDisplayLimit(targetIdx + 50);
      }
      setTimeout(() => {
        if (tableRef.current) {
          const el = document.getElementById(`tick-row-${targetIdx}`);
          if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            el.classList.add('ring-2', 'ring-rose-500', 'bg-rose-500/30');
            setTimeout(() => {
              el.classList.remove('ring-2', 'ring-rose-500', 'bg-rose-500/30');
            }, 3000);
          }
        }
      }, 50);
    }
  };

  // Jump to biggest gap in table
  const handleJumpToMaxGap = () => {
    if (!analysisData?.gaps?.length) return;
    handleJumpToGap(analysisData.gaps[0]);
  };

  // Copy raw JSON segment
  const handleCopyAnalysisJson = () => {
    if (!analysisData) return;
    navigator.clipboard.writeText(JSON.stringify(analysisData, null, 2));
    setCopiedSuccess(true);
    setTimeout(() => setCopiedSuccess(false), 2000);
  };

  // Filtered ticks for table (uses deferredSearch to prevent blocking pointer/typing events)
  const filteredTicks = useMemo(() => {
    if (!analysisData?.ticks) return [];
    const query = deferredSearch.trim().toLowerCase();
    return analysisData.ticks.filter(t => {
      if (tableFilter === 'gaps' && t.status !== 'GAP_DEAD') return false;
      if (tableFilter === 'lag' && t.status !== 'GAP_DEAD' && t.status !== 'GAP_LAG') return false;
      if (query) {
        const timeMatch = t.time?.toLowerCase().includes(query);
        const hbMatch = String(t.hb || '').includes(query);
        const portMatch = t.port?.toLowerCase().includes(query);
        return timeMatch || hbMatch || portMatch;
      }
      return true;
    });
  }, [analysisData, tableFilter, deferredSearch]);

  // JSON view content memoized for performance
  const jsonFormattedTicks = useMemo(() => {
    if (!analysisData) return '{\n  "data": []\n}';
    if (jsonScope === 'full') {
      return JSON.stringify(analysisData, null, 2);
    }
    return JSON.stringify(filteredTicks, null, 2);
  }, [analysisData, filteredTicks, jsonScope]);

  // Copy JSON from tab
  const handleCopyJsonTab = () => {
    navigator.clipboard.writeText(jsonFormattedTicks);
    setCopiedJsonTab(true);
    setTimeout(() => setCopiedJsonTab(false), 2000);
  };

  // Download JSON file
  const handleDownloadJson = () => {
    if (!analysisData) return;
    const blob = new Blob([jsonFormattedTicks], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `hb_analysis_pod${selectedPodId || 'all'}_mod${selectedModuleId}_${selectedDate}_${jsonScope}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
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
              <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white flex items-center gap-2">
                Analisa Pola Heartbeat
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-cyan-500/15 text-cyan-300 font-semibold border border-cyan-500/30">
                  Incident Diagnostic
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
            Tanggal Insiden
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
              Waktu Insiden
            </span>
            <button
              onClick={handleSetTimeToNow}
              className="text-[10px] text-cyan-400 hover:text-cyan-300 font-semibold"
            >
              Sekarang
            </button>
          </label>
          <input
            type="text"
            value={targetTimeStr}
            onChange={(e) => setTargetTimeStr(e.target.value)}
            placeholder="HH:mm:ss (contoh: 15:21:27)"
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
      />

      {/* Visual Charts Grid (Isolated Memoized Component) */}
      <VisualChartsSection analysisData={analysisData} />

      {/* Raw Tick High-Precision Timeline Table & JSON Viewer */}
      <div className="p-5 rounded-3xl bg-slate-900/60 border border-slate-800 shadow-2xl space-y-4" style={{ contentVisibility: 'auto', containIntrinsicSize: 'auto 400px' }}>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
          <div className="flex items-center gap-3">
            {/* View Mode Tabs: Tabel vs JSON */}
            <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs font-semibold">
              <button
                onClick={() => setTableTab('table')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition ${
                  tableTab === 'table'
                    ? 'bg-cyan-600 text-white shadow-md shadow-cyan-600/30 font-bold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Table size={14} />
                <span>Tabel Log</span>
              </button>
              <button
                onClick={() => setTableTab('json')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition ${
                  tableTab === 'json'
                    ? 'bg-cyan-600 text-white shadow-md shadow-cyan-600/30 font-bold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Code2 size={14} />
                <span>JSON</span>
              </button>
            </div>

            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                {tableTab === 'table' ? 'Log Detak Presisi Milidetik' : 'Viewer Data JSON'}
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-normal">
                  {filteredTicks.length} Records
                </span>
              </h3>
              <p className="text-[11px] text-slate-400">
                {tableTab === 'table'
                  ? 'Daftar paket data berurutan kronologis di sekitar insiden'
                  : 'Struktur data JSON murni untuk inspeksi mendalam / salin ke sistem lain'}
              </p>
            </div>
          </div>

          {/* Right Controls: Filters for Table vs Export Controls for JSON */}
          {tableTab === 'table' ? (
            <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto">
              {/* Filter Buttons */}
              <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
                <button
                  onClick={() => startTransition(() => setTableFilter('all'))}
                  className={`px-2.5 py-1 rounded-lg font-semibold transition ${tableFilter === 'all' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-white'}`}
                >
                  Semua ({analysisData?.ticks?.length || 0})
                </button>
                <button
                  onClick={() => startTransition(() => setTableFilter('gaps'))}
                  className={`px-2.5 py-1 rounded-lg font-semibold transition ${tableFilter === 'gaps' ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30' : 'text-slate-400 hover:text-white'}`}
                >
                  Dead Gaps ({analysisData?.gaps?.length || 0})
                </button>
                <button
                  onClick={() => startTransition(() => setTableFilter('lag'))}
                  className={`px-2.5 py-1 rounded-lg font-semibold transition ${tableFilter === 'lag' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' : 'text-slate-400 hover:text-white'}`}
                >
                  Lag Spike (&gt;3s)
                </button>
              </div>

              {/* Search input */}
              <div className="relative">
                <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="text"
                  placeholder="Cari waktu / #hb..."
                  value={tableSearch}
                  onChange={(e) => setTableSearch(e.target.value)}
                  className="pl-8 pr-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 w-36 sm:w-48"
                />
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto">
              {/* Scope Switch: Ticks Array vs Full Analysis */}
              <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
                <button
                  onClick={() => setJsonScope('ticks')}
                  className={`px-2.5 py-1 rounded-lg font-semibold transition ${
                    jsonScope === 'ticks' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Ticks Stream ({filteredTicks.length})
                </button>
                <button
                  onClick={() => setJsonScope('full')}
                  className={`px-2.5 py-1 rounded-lg font-semibold transition ${
                    jsonScope === 'full' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Full Analysis Respon
                </button>
              </div>

              {/* Copy Button */}
              <button
                onClick={handleCopyJsonTab}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-950 hover:bg-slate-800 text-slate-300 border border-slate-800 text-xs font-semibold transition"
              >
                {copiedJsonTab ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
                <span>{copiedJsonTab ? 'Tersalin' : 'Salin JSON'}</span>
              </button>

              {/* Download Button */}
              <button
                onClick={handleDownloadJson}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-950 hover:bg-slate-800 text-cyan-300 border border-slate-800 text-xs font-semibold transition"
                title="Unduh file JSON"
              >
                <Download size={13} />
                <span>Unduh .json</span>
              </button>
            </div>
          )}
        </div>

        {/* Content Body: Table or JSON */}
        {tableTab === 'table' ? (
          <>
            {/* Table View Container */}
            <div ref={tableRef} className="overflow-x-auto max-h-96 overflow-y-auto custom-scrollbar rounded-2xl border border-slate-800/80">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950/90 text-slate-400 font-semibold sticky top-0 z-10 backdrop-blur-md border-b border-slate-800">
                  <tr>
                    <th className="py-2.5 px-3 w-12">#</th>
                    <th className="py-2.5 px-3">Waktu Tiba (Local)</th>
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
          </>
        ) : (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-[11px] text-slate-400 px-1">
              <span>
                Cakupan: <strong className="text-slate-200">{jsonScope === 'full' ? 'Full Analysis Payload (Meta, Stats, Gaps, Ticks)' : 'Ticks Stream Array (Detak Log)'}</strong>
                {' '}• <span className="font-mono text-cyan-300">{jsonFormattedTicks.length.toLocaleString()} karakter</span>
              </span>
              <span className="font-mono text-[10px] text-slate-500">
                JSON • Read Only
              </span>
            </div>

            <div className="relative rounded-2xl border border-slate-800/80 overflow-hidden bg-slate-950/90 shadow-inner">
              <pre className="p-4 max-h-[500px] overflow-auto custom-scrollbar font-mono text-[11px] text-emerald-400 leading-relaxed select-all">
                {jsonFormattedTicks}
              </pre>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
