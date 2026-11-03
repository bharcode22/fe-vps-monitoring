import React from 'react';
import { Clock, TrendingUp, Sun, Moon } from 'lucide-react';

export default function PeakHoursCard({ hourly = [], isLoading }) {
  if (isLoading) {
    return (
      <div className="h-44 bg-slate-950/60 rounded-xl border border-slate-800/80 animate-pulse flex items-center justify-center">
        <span className="text-xs text-slate-500">Memuat distribusi jam terapi...</span>
      </div>
    );
  }

  if (hourly.length === 0) {
    return (
      <div className="text-center py-10 text-slate-500 text-xs italic">
        Belum ada data distribusi jam pemutaran.
      </div>
    );
  }

  const maxCount = Math.max(...hourly.map((h) => h.count), 1);
  const busiestHour = [...hourly].sort((a, b) => b.count - a.count)[0];

  return (
    <div className="flex flex-col gap-4">
      {/* Busiest Peak Hour Banner */}
      <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 text-xs">
        <div className="flex items-center gap-2 text-slate-300">
          <Sun size={14} className="text-amber-400 shrink-0" />
          <span>Jam Terpadat (Peak Therapy):</span>
          <span className="font-bold text-amber-300 font-mono">
            {busiestHour?.label} - {String(busiestHour?.hour + 1).padStart(2, '0')}:00 WIB
          </span>
        </div>
        <span className="font-mono text-xs font-bold text-purple-300 bg-purple-500/15 px-2 py-0.5 rounded border border-purple-500/30">
          {busiestHour?.count.toLocaleString()} sesi
        </span>
      </div>

      {/* 24-hour Vertical Histogram Bar Chart */}
      <div className="flex items-end justify-between gap-1 h-36 pt-4 pb-1 px-1 bg-slate-950/40 rounded-xl border border-slate-800/60">
        {hourly.map((item) => {
          const heightPct = Math.max(4, Math.round((item.count / maxCount) * 100));
          const isPeak = item.hour >= 8 && item.hour <= 16;
          const isBusiest = item.hour === busiestHour?.hour;

          return (
            <div
              key={item.hour}
              className="flex-1 flex flex-col items-center justify-end h-full group relative"
            >
              {/* Tooltip on hover */}
              <div className="absolute -top-7 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-900 border border-slate-700 text-white text-[10px] px-1.5 py-0.5 rounded shadow-lg pointer-events-none z-10 whitespace-nowrap font-mono">
                {item.label}: {item.count}
              </div>

              {/* Bar */}
              <div
                className={`w-full rounded-t transition-all duration-300 ${
                  isBusiest
                    ? 'bg-amber-400 shadow-amber-400/40 shadow-sm'
                    : isPeak
                    ? 'bg-gradient-to-t from-purple-600 to-cyan-400 hover:from-purple-500 hover:to-cyan-300'
                    : 'bg-slate-800 hover:bg-slate-700'
                }`}
                style={{ height: `${heightPct}%` }}
              />

              {/* Hour label for key hours */}
              {item.hour % 3 === 0 && (
                <span className="text-[9px] text-slate-500 font-mono mt-1 select-none">
                  {item.hour}
                </span>
              )}
            </div>
          );
        })}
      </div>

      <div className="flex items-center justify-between text-[11px] text-slate-500 px-1">
        <span>00:00 (Malam)</span>
        <span className="text-cyan-400 font-medium">12:00 (Siang - Jam Sibuk)</span>
        <span>23:00 (Malam)</span>
      </div>
    </div>
  );
}
