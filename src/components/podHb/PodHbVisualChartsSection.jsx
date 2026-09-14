import React, { memo } from 'react';
import { Clock, Activity } from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceLine,
  Line
} from 'recharts';

/**
 * Visual Charts Section
 * Displays two synchronised line charts:
 * 1. Inter-Packet Delay Time (Delta Sec) with DEAD and FROZEN thresholds
 * 2. Heartbeat Counter Continuity Curve (#hb step chart)
 * Memoized to isolate SVG rendering from page interactions.
 */
const PodHbVisualChartsSection = memo(function PodHbVisualChartsSection({ analysisData }) {
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

export default PodHbVisualChartsSection;
