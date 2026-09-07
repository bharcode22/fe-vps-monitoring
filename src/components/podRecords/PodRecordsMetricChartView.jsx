import React, { useState, useMemo } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Brush
} from 'recharts';
import {
  Activity,
  ArrowLeft,
  Calendar,
  Clock,
  Layers,
  Zap,
  Check,
  TrendingUp,
  TrendingDown,
  AlertCircle,
  FileCode,
  RefreshCw,
  Eye,
  EyeOff
} from 'lucide-react';

// Curated distinct color palette for channels
const CHANNEL_COLORS = {
  EE_12V: '#06b6d4',   // Cyan
  EE_5V: '#f59e0b',    // Amber
  VAC_220: '#f43f5e',  // Rose / Red
  JAB5_A: '#10b981',   // Emerald
  JAB5_B: '#8b5cf6',   // Purple
  SUB_12V: '#f97316',  // Orange
  voltage: '#06b6d4',  // Cyan
  current: '#f59e0b',  // Amber
  power: '#10b981',    // Emerald
  pob_raw: '#06b6d4',  // Cyan
  hb: '#3b82f6'        // Blue
};

const FALLBACK_COLORS = [
  '#06b6d4', '#f59e0b', '#f43f5e', '#10b981', '#8b5cf6',
  '#f97316', '#3b82f6', '#ec4899', '#14b8a6', '#eab308'
];

export default function PodRecordsMetricChartView({
  metricsData,
  isLoading = false,
  error = null,
  fileName,
  selectedDate,
  interval = '5m',
  onChangeInterval,
  onBackToFiles,
  onViewRawJson,
  onRefresh
}) {
  const [aggMode, setAggMode] = useState('avg'); // 'avg' | 'max'
  const [chartTimeRange, setChartTimeRange] = useState('all'); // 'all' | '1h' | '3h' | '6h' | '12h'
  const [activeChannels, setActiveChannels] = useState({}); // { [ch]: boolean }

  const channels = useMemo(() => {
    return metricsData?.channels || [];
  }, [metricsData]);

  // Initialize all channels as active by default if not set
  const effectiveActiveChannels = useMemo(() => {
    const res = {};
    channels.forEach((ch) => {
      res[ch] = activeChannels[ch] !== undefined ? activeChannels[ch] : true;
    });
    return res;
  }, [channels, activeChannels]);

  // Channel toggle handler
  const handleToggleChannel = (ch) => {
    setActiveChannels((prev) => ({
      ...prev,
      [ch]: prev[ch] !== undefined ? !prev[ch] : false
    }));
  };

  const handleSelectAllChannels = () => {
    const next = {};
    channels.forEach((ch) => { next[ch] = true; });
    setActiveChannels(next);
  };

  const handleDeselectAllChannels = () => {
    const next = {};
    channels.forEach((ch) => { next[ch] = false; });
    setActiveChannels(next);
  };

  // Assign color to channel
  const getChannelColor = (ch, idx) => {
    return CHANNEL_COLORS[ch] || FALLBACK_COLORS[idx % FALLBACK_COLORS.length];
  };

  const rawPoints = useMemo(() => {
    return metricsData?.points || [];
  }, [metricsData]);

  const points = useMemo(() => {
    if (!rawPoints || rawPoints.length === 0 || chartTimeRange === 'all') return rawPoints;

    const lastPoint = rawPoints[rawPoints.length - 1];
    if (!lastPoint || !lastPoint.time) return rawPoints;

    const [lastH, lastM] = lastPoint.time.split(':').map(Number);
    const lastTotalMinutes = (isNaN(lastH) ? 23 : lastH) * 60 + (isNaN(lastM) ? 59 : lastM);

    let windowMinutes = 60;
    if (chartTimeRange === '3h') windowMinutes = 180;
    else if (chartTimeRange === '6h') windowMinutes = 360;
    else if (chartTimeRange === '12h') windowMinutes = 720;

    const cutoffMinutes = lastTotalMinutes - windowMinutes;

    const res = rawPoints.filter((p) => {
      const [h, m] = (p.time || '').split(':').map(Number);
      if (isNaN(h) || isNaN(m)) return true;
      const totalM = h * 60 + m;
      return totalM >= cutoffMinutes;
    });

    return res.length > 0 ? res : rawPoints;
  }, [rawPoints, chartTimeRange]);

  const kpi = metricsData?.kpi || null;
  const unit = metricsData?.unit || 'mA';

  // Custom Recharts Tooltip
  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload || payload.length === 0) return null;

    const currentPoint = points.find((p) => p.time === label) || {};

    return (
      <div className="bg-slate-900/95 backdrop-blur-md border border-slate-700/80 rounded-xl shadow-2xl p-3 min-w-[220px] text-xs font-mono">
        <div className="flex items-center justify-between gap-2 pb-2 mb-2 border-b border-slate-800 text-slate-300">
          <span className="font-bold flex items-center gap-1">
            <Clock size={12} className="text-cyan-400" />
            <span>Pukul {label}</span>
          </span>
          <span className="text-[10px] text-slate-400">
            {currentPoint.ticks ? `${currentPoint.ticks} sampel` : ''}
          </span>
        </div>

        <div className="space-y-1.5 max-h-56 overflow-y-auto custom-scrollbar pr-1">
          {payload.map((entry, idx) => {
            const chName = entry.dataKey.replace('_max', '');
            const rawVal = entry.value;
            const formattedVal = typeof rawVal === 'number' ? rawVal.toLocaleString('id-ID') : rawVal;

            return (
              <div key={idx} className="flex items-center justify-between gap-3 text-[11px]">
                <div className="flex items-center gap-1.5 truncate">
                  <div
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: entry.color }}
                  />
                  <span className="text-slate-200 font-semibold truncate">{chName}</span>
                </div>
                <span className="font-bold text-white shrink-0">
                  {formattedVal} <span className="text-slate-400 font-normal text-[10px]">{unit}</span>
                </span>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="bg-slate-950 rounded-2xl border border-slate-800 shadow-2xl overflow-hidden flex flex-col space-y-0">
      {/* 1. HEADER TOOLBAR */}
      <div className="px-4 py-3 bg-slate-900 border-b border-slate-800 flex items-center justify-between flex-wrap gap-3 shrink-0">
        <div className="flex items-center gap-2.5 flex-wrap">
          {onBackToFiles && (
            <button
              onClick={onBackToFiles}
              className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-cyan-300 hover:text-white border border-slate-700 text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
              title="Kembali ke daftar berkas"
            >
              <ArrowLeft size={13} />
              <span>Daftar Berkas</span>
            </button>
          )}

          <div className="flex items-center gap-2">
            <div className="p-1 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
              <Activity size={16} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-bold text-white">{fileName || 'Metrik POD'}</span>
                <span className="text-[10px] font-mono px-2 py-0.2 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-semibold">
                  {selectedDate}
                </span>
              </div>
              <span className="text-[10px] text-slate-400">
                Visualisasi tren multi-channel berdasar waktu (interval {metricsData?.interval || interval})
              </span>
            </div>
          </div>
        </div>

        {/* View mode toggle & Action controls */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Time Window Selector (1h, 3h, 6h, 12h, 24h) */}
          <div className="flex items-center bg-slate-950 p-0.5 rounded-xl border border-slate-800 text-xs">
            <span className="px-2 text-[10px] text-slate-400 font-bold uppercase hidden sm:inline">
              Rentang:
            </span>
            {[
              { id: '1h', label: '1 Jam' },
              { id: '3h', label: '3 Jam' },
              { id: '6h', label: '6 Jam' },
              { id: '12h', label: '12 Jam' },
              { id: 'all', label: 'Semua (24h)' }
            ].map((rng) => (
              <button
                key={rng.id}
                onClick={() => setChartTimeRange(rng.id)}
                className={`px-2 py-1 rounded-lg text-[11px] font-semibold transition-all cursor-pointer ${chartTimeRange === rng.id
                  ? 'bg-cyan-500/25 text-cyan-300 border border-cyan-500/40 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
                  }`}
              >
                {rng.label}
              </button>
            ))}
          </div>

          {/* Interval Resolution Selector */}
          <div className="flex items-center bg-slate-950 p-0.5 rounded-xl border border-slate-800 text-xs">
            <span className="px-2 text-[10px] text-slate-400 font-bold uppercase hidden sm:inline">
              Resolusi:
            </span>
            {['1m', '5m', '15m', '1h'].map((intVal) => (
              <button
                key={intVal}
                onClick={() => onChangeInterval && onChangeInterval(intVal)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-mono font-bold transition-all cursor-pointer ${interval === intVal
                  ? 'bg-cyan-500/25 text-cyan-300 border border-cyan-500/40 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
                  }`}
              >
                {intVal === '1m' ? '1 Menit' : intVal === '5m' ? '5 Menit' : intVal === '15m' ? '15 Menit' : '1 Jam'}
              </button>
            ))}
          </div>

          {/* Aggregation Mode Selector (Avg vs Max) */}
          <div className="flex items-center bg-slate-950 p-0.5 rounded-xl border border-slate-800 text-xs">
            <button
              onClick={() => setAggMode('avg')}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all cursor-pointer ${aggMode === 'avg'
                ? 'bg-cyan-500/25 text-cyan-300 border border-cyan-500/40 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
                }`}
            >
              Rata-rata (Avg)
            </button>
            <button
              onClick={() => setAggMode('max')}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all cursor-pointer ${aggMode === 'max'
                ? 'bg-cyan-500/25 text-cyan-300 border border-cyan-500/40 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
                }`}
            >
              Puncak (Max)
            </button>
          </div>

          {/* Switch to Raw JSON view */}
          {onViewRawJson && (
            <button
              onClick={onViewRawJson}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
              title="Lihat isi teks JSON mentah"
            >
              <FileCode size={13} className="text-cyan-400" />
              <span>Raw JSON</span>
            </button>
          )}

          {onRefresh && (
            <button
              onClick={onRefresh}
              className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white border border-slate-700 transition-all cursor-pointer"
              title="Muat ulang metrik"
            >
              <RefreshCw size={13} className={isLoading ? 'animate-spin text-cyan-400' : ''} />
            </button>
          )}
        </div>
      </div>

      {/* 2. BODY CONTENT */}
      {isLoading ? (
        <div className="p-20 text-center flex flex-col items-center justify-center gap-3 text-slate-400">
          <div className="w-8 h-8 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
          <span className="text-xs font-mono text-cyan-300">
            Menganalisis dan mengagregasi data {fileName}...
          </span>
        </div>
      ) : error ? (
        <div className="p-12 text-center flex flex-col items-center justify-center gap-3">
          <div className="p-3 rounded-full bg-rose-500/15 text-rose-400 border border-rose-500/30">
            <AlertCircle size={24} />
          </div>
          <span className="text-xs text-rose-300 font-medium max-w-md">{error}</span>
          {onViewRawJson && (
            <button
              onClick={onViewRawJson}
              className="mt-2 px-3 py-1.5 rounded-xl bg-slate-800 text-cyan-300 border border-slate-700 text-xs font-bold"
            >
              Buka Versi Teks Mentah (Raw JSON)
            </button>
          )}
        </div>
      ) : points.length === 0 ? (
        <div className="p-16 text-center text-slate-500 text-xs flex flex-col items-center gap-2">
          <Activity size={24} className="text-slate-600" />
          <span>Tidak ada data numerik metrik yang dapat digambarkan untuk berkas ini.</span>
          {onViewRawJson && (
            <button
              onClick={onViewRawJson}
              className="mt-2 px-3 py-1.5 rounded-xl bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 text-xs font-bold"
            >
              Buka Penampil Kode JSON
            </button>
          )}
        </div>
      ) : (
        <div className="p-4 sm:p-6 space-y-4">
          {/* A. KPI SUMMARY CARDS */}
          {kpi && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {/* Card 1: Peak Value */}
              <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center justify-between shadow-sm">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Nilai Puncak (Peak)
                  </span>
                  <div className="text-lg font-black text-rose-400 font-mono mt-0.5">
                    {kpi.peakValue ? kpi.peakValue.toLocaleString('id-ID') : '0'}{' '}
                    <span className="text-xs text-slate-400 font-normal">{unit}</span>
                  </div>
                  <span className="text-[10px] text-slate-500 block truncate">
                    {kpi.peakChannel ? `${kpi.peakChannel} @ ${kpi.peakTime || '-'}` : '-'}
                  </span>
                </div>
                <div className="p-2.5 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/20 shrink-0">
                  <TrendingUp size={18} />
                </div>
              </div>

              {/* Card 2: Minimum Value */}
              <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center justify-between shadow-sm">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Nilai Terendah (Min)
                  </span>
                  <div className="text-lg font-black text-cyan-400 font-mono mt-0.5">
                    {kpi.minValue ? kpi.minValue.toLocaleString('id-ID') : '0'}{' '}
                    <span className="text-xs text-slate-400 font-normal">{unit}</span>
                  </div>
                  <span className="text-[10px] text-slate-500 block truncate">
                    {kpi.minChannel ? `${kpi.minChannel} @ ${kpi.minTime || '-'}` : '-'}
                  </span>
                </div>
                <div className="p-2.5 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 shrink-0">
                  <TrendingDown size={18} />
                </div>
              </div>

              {/* Card 3: Total Raw Telemetry */}
              <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center justify-between shadow-sm">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Data Telemetri Dianalisis
                  </span>
                  <div className="text-lg font-black text-amber-400 font-mono mt-0.5">
                    {kpi.totalDataPoints ? kpi.totalDataPoints.toLocaleString('id-ID') : '0'}
                  </div>
                  <span className="text-[10px] text-slate-500 block">
                    {metricsData?.bucketsCount || points.length} titik interval ({interval})
                  </span>
                </div>
                <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20 shrink-0">
                  <Layers size={18} />
                </div>
              </div>

              {/* Card 4: Status / Health */}
              <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center justify-between shadow-sm">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Kestabilan Sinyal
                  </span>
                  <div className="text-lg font-black text-emerald-400 font-sans mt-0.5 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    <span>Lancar</span>
                  </div>
                  <span className="text-[10px] text-slate-500 block">
                    {channels.length > 0 ? `${channels.length} jalur aktif terdeteksi` : 'Data terhubung'}
                  </span>
                </div>
                <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shrink-0">
                  <Check size={18} />
                </div>
              </div>
            </div>
          )}

          {/* B. INTERACTIVE CHANNEL FILTER PILLS */}
          {channels.length > 0 && (
            <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-bold text-slate-400 mr-1 flex items-center gap-1">
                  <Zap size={12} className="text-cyan-400" />
                  <span>Jalur / Channel:</span>
                </span>
                {channels.map((ch, idx) => {
                  const isChActive = !!effectiveActiveChannels[ch];
                  const color = getChannelColor(ch, idx);

                  return (
                    <button
                      key={ch}
                      onClick={() => handleToggleChannel(ch)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer flex items-center gap-1.5 border shadow-sm ${isChActive
                        ? 'bg-slate-900 text-white border-slate-700'
                        : 'bg-slate-950 text-slate-500 border-slate-900 opacity-60'
                        }`}
                      style={{
                        borderColor: isChActive ? `${color}60` : undefined,
                        boxShadow: isChActive ? `0 0 10px ${color}15` : undefined
                      }}
                    >
                      <div
                        className="w-2.5 h-2.5 rounded-full transition-all"
                        style={{
                          backgroundColor: isChActive ? color : '#475569'
                        }}
                      />
                      <span>{ch}</span>
                    </button>
                  );
                })}
              </div>

              {/* Quick toggle all */}
              <div className="flex items-center gap-2 shrink-0 text-xs">
                <button
                  onClick={handleSelectAllChannels}
                  className="text-[11px] text-cyan-400 hover:text-cyan-300 font-semibold cursor-pointer underline decoration-dotted"
                >
                  Pilih Semua
                </button>
                <span className="text-slate-600">&bull;</span>
                <button
                  onClick={handleDeselectAllChannels}
                  className="text-[11px] text-slate-500 hover:text-slate-300 font-semibold cursor-pointer underline decoration-dotted"
                >
                  Sembunyikan
                </button>
              </div>
            </div>
          )}

          {/* C. RECHARTS CANVAS */}
          <div className="p-4 bg-slate-900/40 rounded-2xl border border-slate-800/80 shadow-inner">
            <div className="h-[380px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={points} margin={{ top: 10, right: 20, left: 0, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                  <XAxis
                    dataKey="time"
                    stroke="#64748b"
                    tick={{ fontSize: 11, fill: '#94a3b8' }}
                    tickLine={{ stroke: '#334155' }}
                    dy={5}
                  />
                  <YAxis
                    stroke="#64748b"
                    tick={{ fontSize: 11, fill: '#94a3b8' }}
                    tickLine={{ stroke: '#334155' }}
                    unit={` ${unit}`}
                    width={70}
                  />
                  <Tooltip content={<CustomTooltip />} />

                  {/* Draw Lines for each active channel */}
                  {channels.map((ch, idx) => {
                    if (!effectiveActiveChannels[ch]) return null;
                    const color = getChannelColor(ch, idx);
                    const dataKey = aggMode === 'max' ? `${ch}_max` : ch;

                    return (
                      <Line
                        key={ch}
                        type="monotone"
                        dataKey={dataKey}
                        name={ch}
                        stroke={color}
                        strokeWidth={2}
                        dot={false}
                        activeDot={{ r: 5, fill: color, stroke: '#0f172a', strokeWidth: 2 }}
                        isAnimationActive={true}
                      />
                    );
                  })}

                  {/* Brush for time-series zoom/scroll */}
                  {points.length > 10 && (
                    <Brush
                      dataKey="time"
                      height={24}
                      stroke="#06b6d4"
                      fill="#090d16"
                      tickFormatter={() => ''}
                    />
                  )}
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
