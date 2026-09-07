import React from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid
} from 'recharts';
import { Clock } from 'lucide-react';
import {
  CHANNEL_COLORS,
  FALLBACK_COLORS,
  getChannelUnit,
  formatWindowDesc
} from './liveStreamConfig';

// Custom Dark Tooltip
const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload || payload.length === 0) return null;

  return (
    <div className="bg-slate-900/95 backdrop-blur-md border border-slate-700/80 rounded-xl shadow-2xl p-3 min-w-[200px] text-xs font-mono">
      <div className="flex items-center justify-between gap-2 pb-2 mb-2 border-b border-slate-800 text-slate-300">
        <span className="font-bold flex items-center gap-1">
          <Clock size={12} className="text-cyan-400" />
          <span>{label}</span>
        </span>
        <span className="text-[10px] text-cyan-400 font-sans font-semibold">Live Tick</span>
      </div>
      <div className="space-y-1.5">
        {payload.map((entry, idx) => {
          const rawVal = entry.value;
          const formattedVal =
            typeof rawVal === 'number'
              ? rawVal.toLocaleString('id-ID', { maximumFractionDigits: 2 })
              : rawVal;
          const chUnit = getChannelUnit(entry.dataKey);
          return (
            <div key={idx} className="flex items-center justify-between gap-3 text-[11px]">
              <div className="flex items-center gap-1.5 truncate">
                <div
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: entry.color }}
                />
                <span className="text-slate-200 font-semibold truncate">{entry.dataKey}</span>
              </div>
              <span className="font-bold text-white shrink-0">
                {formattedVal} <span className="text-slate-400 font-normal text-[10px]">{chUnit}</span>
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default function LiveTelemetryChart({
  chartData = [],
  streamBufferLength = 0,
  selectedModule,
  windowSeconds,
  liveDataType,
  activeChannelKeys = [],
  effectiveActiveChannels = {},
  onToggleChannel,
  onSelectAllChannels,
  onDeselectAllChannels,
  backfillInfo,
  totalTicksReceived = 0
}) {
  return (
    <div className="p-4 sm:p-6 rounded-2xl bg-slate-900/60 border border-slate-800/80 shadow-xl space-y-4">
      {/* Channel Toggles Bar */}
      <div className="flex items-center justify-between gap-2 flex-wrap pb-3 border-b border-slate-800/60">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mr-1 flex items-center gap-1">
            {liveDataType === 'current' ? (
              <span>Kanal Arus Aktif (mA):</span>
            ) : liveDataType === 'env' ? (
              <span>Kanal Sensor Lingkungan:</span>
            ) : (
              <span>Kanal Aktif:</span>
            )}
          </span>
          {activeChannelKeys.map((ch, idx) => {
            const color = CHANNEL_COLORS[ch] || FALLBACK_COLORS[idx % FALLBACK_COLORS.length];
            const isChActive = effectiveActiveChannels[ch];
            const label = ch === 'hb' ? 'Detak Heartbeat' : ch;

            return (
              <button
                key={ch}
                onClick={() => onToggleChannel && onToggleChannel(ch)}
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
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ backgroundColor: color }}
                />
                <span>{label}</span>
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={onSelectAllChannels}
            className="px-2 py-0.5 rounded text-[10px] font-semibold text-cyan-400 hover:bg-cyan-500/10 transition-all cursor-pointer"
          >
            Semua
          </button>
          <span className="text-slate-600">&bull;</span>
          <button
            onClick={onDeselectAllChannels}
            className="px-2 py-0.5 rounded text-[10px] font-semibold text-slate-400 hover:bg-slate-800 transition-all cursor-pointer"
          >
            Sembunyikan
          </button>
        </div>
      </div>

      {/* Live Recharts Chart */}
      {streamBufferLength === 0 ? (
        <div className="h-[360px] flex flex-col items-center justify-center gap-3 text-slate-500 text-xs">
          <div className="w-8 h-8 rounded-full border-2 border-cyan-400 border-t-transparent animate-spin" />
          <div className="space-y-1 text-center font-mono">
            <span className="text-cyan-300 font-bold block">
              Menunggu aliran data live untuk Modul {selectedModule}...
            </span>
            <span className="text-[11px] text-slate-400 block">
              Data akan otomatis mengalir setiap kali modul mengirimkan heartbeat / telemetri.
            </span>
          </div>
        </div>
      ) : (
        <div className="h-[360px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={chartData}
              margin={{ top: 10, right: 20, left: 10, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
              <XAxis
                dataKey="time"
                stroke="#64748b"
                fontSize={10}
                tickLine={false}
                axisLine={{ stroke: '#334155' }}
                tickMargin={8}
              />
              <YAxis
                stroke="#64748b"
                fontSize={10}
                tickLine={false}
                axisLine={{ stroke: '#334155' }}
                domain={['auto', 'auto']}
                tickFormatter={(v) => (typeof v === 'number' ? v.toLocaleString('id-ID') : v)}
                width={65}
              />
              <Tooltip content={<CustomTooltip />} />
              {activeChannelKeys.map((ch, idx) => {
                if (!effectiveActiveChannels[ch]) return null;
                const color = CHANNEL_COLORS[ch] || FALLBACK_COLORS[idx % FALLBACK_COLORS.length];

                return (
                  <Line
                    key={ch}
                    type="monotone"
                    dataKey={ch}
                    stroke={color}
                    strokeWidth={2}
                    dot={false}
                    isAnimationActive={false} // Ultra-fast, zero-jank real-time sliding updates
                  />
                );
              })}
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Footer info */}
      <div className="flex items-center justify-between text-[11px] text-slate-400 pt-2 border-t border-slate-800/50 font-mono flex-wrap gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          <span>Buffer: {streamBufferLength} titik ({formatWindowDesc(windowSeconds)} terakhir)</span>
          {chartData.length !== streamBufferLength && (
            <span className="text-[10px] text-slate-500">
              &bull; Tampilan: {chartData.length} titik
            </span>
          )}
          {backfillInfo?.stepSec > 1 && (
            <span className="text-[10px] text-cyan-400/90 font-semibold">
              &bull; Step: {backfillInfo.stepSec}s
            </span>
          )}
        </div>
        <span>Total Diterima: {totalTicksReceived.toLocaleString('id-ID')} paket</span>
      </div>
    </div>
  );
}
