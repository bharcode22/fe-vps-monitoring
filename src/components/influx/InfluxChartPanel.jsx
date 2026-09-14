import React, { memo } from 'react';
import { BarChart2 } from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend
} from 'recharts';
import { FIELD_COLORS, formatDateTimeWita } from './influxConstants';

/**
 * InfluxChartPanel Component
 * Renders time-series Recharts Area Chart with linear gradient fills,
 * custom tooltips formatted in WITA time, and show/hide visibility toggle.
 * Memoized to prevent expensive SVG recalculations.
 */
const InfluxChartPanel = memo(function InfluxChartPanel({
  chartData = [],
  chartFields = [],
  selectedFields = [],
  tagFilters = [],
  showChart = true,
  setShowChart
}) {
  if (!chartData || chartData.length === 0) return null;

  const activePodFilter = tagFilters.find(tf => tf.key === 'pod_name')?.value || 'Semua POD';

  return (
    <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-xl space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 flex-wrap">
          <BarChart2 size={16} className="text-cyan-400" />
          <h3 className="text-sm font-bold text-white">
            Visualisasi Tren: {selectedFields.join(', ') || 'Nilai'} ({activePodFilter})
          </h3>
          <span className="text-[10px] text-slate-500">
            ({chartData.length} sampel titik, {chartFields.length} field)
          </span>
        </div>
        <button
          type="button"
          onClick={() => setShowChart(!showChart)}
          className="text-xs text-cyan-400 hover:text-cyan-300 font-bold cursor-pointer"
        >
          {showChart ? 'Sembunyikan Grafik' : 'Tampilkan Grafik'}
        </button>
      </div>

      {showChart && (
        <div className="h-72 w-full pt-2">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
              <defs>
                {chartFields.map((f, idx) => {
                  const color = FIELD_COLORS[idx % FIELD_COLORS.length];
                  return (
                    <linearGradient key={f} id={`influxGrad_${f}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={color} stopOpacity={0.4} />
                      <stop offset="95%" stopColor={color} stopOpacity={0} />
                    </linearGradient>
                  );
                })}
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="time" stroke="#64748b" tick={{ fontSize: 11 }} />
              <YAxis stroke="#64748b" tick={{ fontSize: 11 }} domain={['auto', 'auto']} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#0f172a',
                  borderColor: '#334155',
                  borderRadius: '8px',
                  fontSize: '12px',
                  color: '#f8fafc'
                }}
                labelFormatter={(label, item) => item?.[0]?.payload?.fullTime ? formatDateTimeWita(item[0].payload.fullTime) : label}
              />
              <Legend />
              {chartFields.map((f, idx) => {
                const color = FIELD_COLORS[idx % FIELD_COLORS.length];
                return (
                  <Area
                    key={f}
                    type="monotone"
                    dataKey={f}
                    name={f}
                    stroke={color}
                    strokeWidth={2}
                    fillOpacity={1}
                    fill={`url(#influxGrad_${f})`}
                  />
                );
              })}
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
});

export default InfluxChartPanel;
