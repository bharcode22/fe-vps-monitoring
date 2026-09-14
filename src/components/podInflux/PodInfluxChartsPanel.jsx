import React from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from 'recharts';
import { BarChart2, FileText, Clock } from 'lucide-react';
import { FIELD_COLORS, getYDomain, formatPointDateTime } from './podInfluxConstants';

export default function PodInfluxChartsPanel({
  stats,
  chartData = [],
  chartFields = [],
  chartViewMode = 'split',
  setChartViewMode,
  fieldStats = {},
  fieldSeries = {},
  selectedFields = [],
  handleDownloadChartPdfReport,
  exportingFormat,
  selectedPodId,
  isDataTruncatedByLimit = null,
  rowLimit = 1000,
}) {
  if (!stats?.numeric || chartData.length === 0) return null;

  return (
    <div className="space-y-3">
      {/* Header with View Toggle */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-1">
        <div className="flex items-center gap-2">
          <BarChart2 className="w-4 h-4 text-emerald-400" />
          <span className="text-xs font-bold uppercase tracking-wider text-slate-200">
            Visualisasi Tren Waktu
          </span>
          {chartFields.length > 1 && (
            <span className="px-1.5 py-0.5 rounded bg-emerald-950 border border-emerald-800 text-[10px] text-emerald-400 font-mono font-medium">
              {chartFields.length} metrik terpisah
            </span>
          )}
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleDownloadChartPdfReport}
            disabled={exportingFormat === 'pdf' || !selectedPodId}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-purple-950/80 hover:bg-purple-900/90 text-purple-300 border border-purple-800/80 text-[11px] font-medium transition disabled:opacity-50"
            title="Cetak/Unduh Laporan Grafik PDF (Landscape 3 Halaman seperti report.pdf)"
          >
            <FileText className="w-3 h-3 text-purple-400" />
            <span>{exportingFormat === 'pdf' ? 'Membuat PDF...' : 'Cetak Report PDF'}</span>
          </button>

          {chartFields.length > 1 && (
            <div className="flex items-center bg-slate-950 p-0.5 rounded-lg border border-slate-800 text-[11px]">
              <button
                type="button"
                onClick={() => setChartViewMode('split')}
                className={`px-2.5 py-1 rounded-md font-medium transition-all ${
                  chartViewMode === 'split'
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title="Tampilkan grafik terpisah untuk setiap metrik agar skala tidak tabrakan"
              >
                Terpisah ({chartFields.length} Grafik)
              </button>
              <button
                type="button"
                onClick={() => setChartViewMode('combined')}
                className={`px-2.5 py-1 rounded-md font-medium transition-all ${
                  chartViewMode === 'combined'
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title="Tampilkan semua metrik dalam 1 grafik gabungan"
              >
                Gabungan
              </button>
            </div>
          )}
          <span className="text-[10px] font-mono text-slate-400">
            {chartData.length} data points
          </span>
        </div>
      </div>

      {/* Mode 1: Split Charts (Individual Chart Per Field with Dedicated Y-Axis & Stats) */}
      {chartViewMode === 'split' && chartFields.length > 1 ? (
        <div className="space-y-4">
          {chartFields.map((fName, idx) => {
            const color = FIELD_COLORS[idx % FIELD_COLORS.length];
            const fStat = fieldStats[fName] || {};
            const sData = fieldSeries[fName] || [];
            const isConstant = fStat && fStat.min !== undefined && fStat.min === fStat.max;
            const isSparse = sData.length < 60;
            const yDomain = getYDomain(fStat.min, fStat.max);

            return (
              <div
                key={`split-chart-${fName}`}
                className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 shadow-xl"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3 pb-2.5 border-b border-slate-800/80">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span
                      className="w-2.5 h-2.5 rounded-full ring-2 ring-slate-800"
                      style={{ backgroundColor: color }}
                    />
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-200">
                      Grafik Metrik: <span style={{ color }}>{fName}</span>
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">
                      ({sData.length.toLocaleString()} titik)
                    </span>
                    {isConstant && (
                      <span className="px-2 py-0.5 rounded bg-emerald-950/80 border border-emerald-700/60 text-[10px] text-emerald-300 font-medium">
                        {fStat.min === 0 ? 'Status Standby / Nilai 0' : `Nilai Konstan: ${fStat.min}`}
                      </span>
                    )}
                  </div>

                  {/* Individual Field Statistics Pill */}
                  {fStat && (
                    <div className="flex flex-wrap items-center gap-2 text-[10px] font-mono">
                      <div className="px-2 py-0.5 rounded bg-slate-950/80 border border-slate-800 text-slate-300">
                        <span className="text-slate-500 mr-1">Latest:</span>
                        <span className="font-semibold text-emerald-400">{fStat.latest ?? '-'}</span>
                      </div>
                      <div className="px-2 py-0.5 rounded bg-slate-950/80 border border-slate-800 text-slate-300">
                        <span className="text-slate-500 mr-1">Avg:</span>
                        <span className="font-semibold text-teal-300">{fStat.avg ?? '-'}</span>
                      </div>
                      <div className="px-2 py-0.5 rounded bg-slate-950/80 border border-slate-800 text-slate-300">
                        <span className="text-slate-500 mr-1">Min:</span>
                        <span className="font-semibold text-cyan-400">{fStat.min ?? '-'}</span>
                      </div>
                      <div className="px-2 py-0.5 rounded bg-slate-950/80 border border-slate-800 text-slate-300">
                        <span className="text-slate-500 mr-1">Max:</span>
                        <span className="font-semibold text-rose-400">{fStat.max ?? '-'}</span>
                      </div>
                    </div>
                  )}
                </div>

                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={sData} margin={{ top: 10, right: 15, left: -10, bottom: 25 }}>
                      <defs>
                        <linearGradient id={`podGradient-split-${fName}`} x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={color} stopOpacity={0.35} />
                          <stop offset="95%" stopColor={color} stopOpacity={0.0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                      <XAxis
                        dataKey="time"
                        stroke="#64748b"
                        fontSize={10}
                        tickLine={{ stroke: '#334155' }}
                        dy={6}
                        minTickGap={45}
                      />
                      <YAxis
                        stroke="#64748b"
                        fontSize={10}
                        tickLine={false}
                        domain={yDomain}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#020617',
                          borderColor: '#334155',
                          borderRadius: '0.5rem',
                          fontSize: '11px',
                        }}
                        labelStyle={{ color: '#94a3b8' }}
                        labelFormatter={(label, payload) => {
                          const p = payload && payload[0]?.payload;
                          return p?.fullTime ? formatPointDateTime(p) : label;
                        }}
                        formatter={(value) => [value, fName]}
                      />
                      <Area
                        type="monotone"
                        dataKey="value"
                        stroke={color}
                        strokeWidth={2.5}
                        fillOpacity={1}
                        fill={`url(#podGradient-split-${fName})`}
                        name={fName}
                        connectNulls={true}
                        dot={isConstant ? { r: 2, fill: color } : (isSparse ? { r: 3, fill: color } : false)}
                        activeDot={{ r: 5 }}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>

                {/* Bottom Time Bar */}
                <div className="flex items-center justify-between text-[10px] text-slate-400 pt-2 px-1 border-t border-slate-800/80 font-mono">
                  <div className="flex items-center gap-1.5">
                    <span className="text-slate-500">Mulai:</span>
                    <span className="text-slate-200 font-semibold">{formatPointDateTime(sData[0])}</span>
                  </div>
                  <div className="flex items-center gap-1 text-slate-300 font-sans text-[11px] font-medium">
                    <Clock className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Waktu Asli Influx</span>
                  </div>
                  <div className="flex items-center gap-1.5 flex-wrap justify-end">
                    <span className="text-slate-500">Selesai:</span>
                    <span className="text-slate-200 font-semibold">
                      {formatPointDateTime(sData[sData.length - 1])}
                    </span>
                    {isDataTruncatedByLimit && (
                      <span
                        className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[9px] font-sans font-medium"
                        title={`Data terpotong batas limit ${rowLimit?.toLocaleString() || 1000} baris`}
                      >
                        Terpotong Limit ({rowLimit?.toLocaleString() || 1000})
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Mode 2: Single / Combined Chart */
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 shadow-xl">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-200">
                {chartFields.length === 1
                  ? `Grafik Metrik: ${chartFields[0]}`
                  : `Grafik Gabungan (${chartFields.join(', ') || selectedFields.join(', ') || 'Metrik'})`}
              </span>
              {chartFields.length > 1 && (
                <span className="px-1.5 py-0.5 rounded bg-emerald-950 border border-emerald-800 text-[10px] text-emerald-400 font-mono font-medium">
                  {chartFields.length} series
                </span>
              )}
            </div>
            {chartFields.length === 1 && fieldStats[chartFields[0]] && (
              <div className="flex flex-wrap items-center gap-2 text-[10px] font-mono">
                <div className="px-2 py-0.5 rounded bg-slate-950/80 border border-slate-800 text-slate-300">
                  <span className="text-slate-500 mr-1">Latest:</span>
                  <span className="font-semibold text-emerald-400">{fieldStats[chartFields[0]].latest}</span>
                </div>
                <div className="px-2 py-0.5 rounded bg-slate-950/80 border border-slate-800 text-slate-300">
                  <span className="text-slate-500 mr-1">Avg:</span>
                  <span className="font-semibold text-teal-300">{fieldStats[chartFields[0]].avg}</span>
                </div>
                <div className="px-2 py-0.5 rounded bg-slate-950/80 border border-slate-800 text-slate-300">
                  <span className="text-slate-500 mr-1">Min:</span>
                  <span className="font-semibold text-cyan-400">{fieldStats[chartFields[0]].min}</span>
                </div>
                <div className="px-2 py-0.5 rounded bg-slate-950/80 border border-slate-800 text-slate-300">
                  <span className="text-slate-500 mr-1">Max:</span>
                  <span className="font-semibold text-rose-400">{fieldStats[chartFields[0]].max}</span>
                </div>
              </div>
            )}
          </div>

          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={
                  chartFields.length === 1 && fieldSeries[chartFields[0]]
                    ? fieldSeries[chartFields[0]]
                    : chartData
                }
                margin={{ top: 10, right: 15, left: -10, bottom: 25 }}
              >
                <defs>
                  {chartFields.map((fName, idx) => {
                    const color = FIELD_COLORS[idx % FIELD_COLORS.length];
                    return (
                      <linearGradient
                        key={`podGradient-${fName}`}
                        id={`podGradient-${fName}`}
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop offset="5%" stopColor={color} stopOpacity={0.4} />
                        <stop offset="95%" stopColor={color} stopOpacity={0.0} />
                      </linearGradient>
                    );
                  })}
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis
                  dataKey="time"
                  stroke="#64748b"
                  fontSize={10}
                  tickLine={{ stroke: '#334155' }}
                  dy={6}
                  minTickGap={45}
                />
                <YAxis
                  stroke="#64748b"
                  fontSize={10}
                  tickLine={false}
                  domain={
                    chartFields.length === 1 && fieldStats[chartFields[0]]
                      ? getYDomain(fieldStats[chartFields[0]].min, fieldStats[chartFields[0]].max)
                      : ['auto', 'auto']
                  }
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#020617',
                    borderColor: '#334155',
                    borderRadius: '0.5rem',
                    fontSize: '11px',
                  }}
                  labelStyle={{ color: '#94a3b8' }}
                  labelFormatter={(label, payload) => {
                    const p = payload && payload[0]?.payload;
                    return p?.fullTime ? formatPointDateTime(p) : label;
                  }}
                />
                {chartFields.length > 1 && (
                  <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                )}
                {chartFields.map((fName, idx) => {
                  const color = FIELD_COLORS[idx % FIELD_COLORS.length];
                  const fStat = fieldStats[fName];
                  const isConstant = fStat && fStat.min !== undefined && fStat.min === fStat.max;
                  const isSparse = (fStat?.count || 0) < 60;
                  return (
                    <Area
                      key={fName}
                      type="monotone"
                      dataKey={chartFields.length === 1 ? 'value' : fName}
                      stroke={color}
                      strokeWidth={2.5}
                      fillOpacity={1}
                      fill={`url(#podGradient-${fName})`}
                      name={fName}
                      connectNulls={true}
                      dot={isConstant ? { r: 2, fill: color } : (isSparse ? { r: 3, fill: color } : false)}
                      activeDot={{ r: 5 }}
                    />
                  );
                })}
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Bottom Time Bar */}
          <div className="flex items-center justify-between text-[10px] text-slate-400 pt-2 px-1 border-t border-slate-800/80 font-mono">
            <div className="flex items-center gap-1.5">
              <span className="text-slate-500">Mulai:</span>
              <span className="text-slate-200 font-semibold">{formatPointDateTime(chartData[0])}</span>
            </div>
            <div className="flex items-center gap-1 text-slate-300 font-sans text-[11px] font-medium">
              <Clock className="w-3.5 h-3.5 text-emerald-400" />
              <span>Waktu Asli Influx</span>
            </div>
            <div className="flex items-center gap-1.5 flex-wrap justify-end">
              <span className="text-slate-500">Selesai:</span>
              <span className="text-slate-200 font-semibold">
                {formatPointDateTime(chartData[chartData.length - 1])}
              </span>
              {isDataTruncatedByLimit && (
                <span
                  className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[9px] font-sans font-medium"
                  title={`Data terpotong batas limit ${rowLimit?.toLocaleString() || 1000} baris`}
                >
                  Terpotong Limit ({rowLimit?.toLocaleString() || 1000})
                </span>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
