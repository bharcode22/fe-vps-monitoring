import React from 'react';
import { CHANNEL_COLORS, FALLBACK_COLORS, getChannelUnit } from './liveStreamConfig';

export default function LiveTickerCards({
  hasSensors,
  activeChannelKeys = [],
  effectiveActiveChannels = {},
  onToggleChannel,
  latestValues = {},
  latestPort,
  isConnected,
  totalTicksReceived = 0
}) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
      {hasSensors && activeChannelKeys.length > 0 && activeChannelKeys[0] !== 'hb' ? (
        // SENSOR TELEMETRY CARDS (e.g. EE_12V, EE_5V, HM_CUR, PEMF_CUR, etc.)
        activeChannelKeys.map((ch, idx) => {
          const color = CHANNEL_COLORS[ch] || FALLBACK_COLORS[idx % FALLBACK_COLORS.length];
          const val = latestValues[ch];
          const isChActive = effectiveActiveChannels[ch];
          const chUnit = getChannelUnit(ch);
          const formattedVal =
            val !== undefined && val !== null
              ? typeof val === 'number'
                ? val.toLocaleString('id-ID', { maximumFractionDigits: 2 })
                : String(val)
              : '-';

          return (
            <div
              key={ch}
              onClick={() => onToggleChannel && onToggleChannel(ch)}
              className={`p-3 rounded-xl border transition-all cursor-pointer select-none relative overflow-hidden shadow-sm ${
                isChActive
                  ? 'bg-slate-900/90 hover:bg-slate-800/80 border-slate-800'
                  : 'bg-slate-950/60 border-slate-900/60 opacity-50'
              }`}
              style={{
                borderLeftWidth: '3px',
                borderLeftColor: color
              }}
            >
              <div className="flex items-center justify-between gap-1 mb-1">
                <span className="text-[10px] font-mono font-bold text-slate-400 truncate">
                  {ch}
                </span>
                <div
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ backgroundColor: color }}
                />
              </div>
              <div className="text-sm sm:text-base font-mono font-black text-white truncate">
                {formattedVal}{' '}
                <span className="text-[10px] font-normal text-slate-400">{chUnit}</span>
              </div>
            </div>
          );
        })
      ) : (
        // DIAGNOSTIC CARDS FOR PURE HEARTBEAT MODULES (e.g. POD 36)
        <>
          <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800 shadow-sm border-l-4 border-l-cyan-500">
            <div className="text-[10px] font-mono font-bold text-slate-400 mb-1">
              Detak Heartbeat
            </div>
            <div className="text-base font-mono font-black text-cyan-300 truncate">
              #{latestValues.hb !== undefined ? Number(latestValues.hb).toLocaleString('id-ID') : '-'}
            </div>
          </div>

          <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800 shadow-sm border-l-4 border-l-emerald-500">
            <div className="text-[10px] font-mono font-bold text-slate-400 mb-1">
              Frekuensi Aliran
            </div>
            <div className="text-base font-mono font-black text-emerald-400 truncate flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              1.0 detik / tick
            </div>
          </div>

          <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800 shadow-sm border-l-4 border-l-indigo-500">
            <div className="text-[10px] font-mono font-bold text-slate-400 mb-1">
              Port Serial
            </div>
            <div className="text-base font-mono font-black text-indigo-300 truncate">
              {latestPort || 'ttyUSB0'}
            </div>
          </div>

          <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800 shadow-sm border-l-4 border-l-amber-500">
            <div className="text-[10px] font-mono font-bold text-slate-400 mb-1">
              Status Modul
            </div>
            <div className="text-base font-mono font-black text-amber-300 truncate">
              {isConnected ? 'Aktif (Normal)' : 'Terputus'}
            </div>
          </div>

          <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800 shadow-sm border-l-4 border-l-purple-500">
            <div className="text-[10px] font-mono font-bold text-slate-400 mb-1">
              Total Paket
            </div>
            <div className="text-base font-mono font-black text-purple-300 truncate">
              {totalTicksReceived.toLocaleString('id-ID')}
            </div>
          </div>

          <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800 shadow-sm border-l-4 border-l-rose-500">
            <div className="text-[10px] font-mono font-bold text-slate-400 mb-1">
              Tipe Sinyal
            </div>
            <div className="text-base font-mono font-black text-rose-300 truncate">
              Pulse Counter
            </div>
          </div>
        </>
      )}
    </div>
  );
}
