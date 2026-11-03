import React from 'react';
import { CheckCircle2, AlertTriangle, Play, Percent } from 'lucide-react';

export default function SessionCompletionCard({ kpi = {}, sessionTypes = [], isLoading }) {
  if (isLoading) {
    return (
      <div className="h-44 bg-slate-950/60 rounded-xl border border-slate-800/80 animate-pulse flex items-center justify-center">
        <span className="text-xs text-slate-500">Memuat rasio penyelesaian sesi...</span>
      </div>
    );
  }

  const completionRate = kpi.completionRate ?? 100;
  const completed = kpi.completedSessions ?? 0;
  const stopped = kpi.stoppedSessions ?? 0;
  const started = kpi.startedSessions ?? 0;

  return (
    <div className="flex flex-col gap-4">
      {/* Big Ratio Badge */}
      <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800/80 flex items-center justify-between">
        <div>
          <span className="text-xs text-slate-400 block mb-1">Rasio Selesai Tuntas</span>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black text-emerald-400 font-mono">
              {completionRate}%
            </span>
            <span className="text-xs text-slate-400 font-sans">sesi selesai</span>
          </div>
        </div>

        <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
          <CheckCircle2 size={28} />
        </div>
      </div>

      {/* Progress Bar of Sesi Selesai vs Stop */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-xs font-mono">
          <span className="text-emerald-400 flex items-center gap-1">
            <CheckCircle2 size={12} /> Selesai ({completed.toLocaleString()})
          </span>
          <span className="text-rose-400 flex items-center gap-1">
            <AlertTriangle size={12} /> Dihentikan ({stopped.toLocaleString()})
          </span>
        </div>
        <div className="w-full bg-slate-900 rounded-full h-2.5 overflow-hidden flex">
          <div
            className="bg-emerald-500 h-full transition-all duration-500"
            style={{ width: `${completionRate}%` }}
          />
          <div
            className="bg-rose-500 h-full transition-all duration-500"
            style={{ width: `${100 - completionRate}%` }}
          />
        </div>
      </div>

      {/* Breakdown per Tipe Sesi */}
      <div className="space-y-2 pt-1 border-t border-slate-800/80">
        <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
          Distribusi Tipe Sesi
        </span>
        <div className="grid grid-cols-2 gap-2 text-xs font-mono">
          {sessionTypes.map((t) => (
            <div
              key={t.session_type}
              className="p-2 rounded-lg bg-slate-950/50 border border-slate-800/60 flex items-center justify-between"
            >
              <span className="text-slate-300 truncate text-[11px]">
                {t.session_type}
              </span>
              <span className="font-bold text-slate-100 shrink-0 ml-1">
                {t.count.toLocaleString()}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
