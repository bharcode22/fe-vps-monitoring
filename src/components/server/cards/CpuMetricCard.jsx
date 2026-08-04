import React from 'react';
import { Cpu } from 'lucide-react';
import { getProgressColor } from '../../../utils/formatters';

export default function CpuMetricCard({ cpuUsage = 0, cpuCores = 1 }) {
  const usage = Math.min(100, Math.max(0, Number(cpuUsage) || 0));

  return (
    <div className="bg-slate-900/60 border border-slate-800/80 hover:border-sky-500/30 rounded-2xl p-3.5 flex flex-col justify-between transition-all duration-200">
      <div className="flex flex-col gap-1.5 mb-2">
        <div className="flex items-center gap-1.5 text-slate-400">
          <Cpu size={14} className="text-sky-400 shrink-0" />
          <span className="text-[10px] font-bold uppercase tracking-wider truncate">CPU Load</span>
        </div>
        <div className="font-mono font-extrabold text-white text-xl tracking-tight">
          {usage}%
        </div>
      </div>

      <div className="flex items-center justify-between text-[10px] font-mono mb-2">
        <span className="text-sky-400/90 font-bold bg-sky-500/10 border border-sky-500/20 px-2 py-0.5 rounded-md">
          {cpuCores} Cores
        </span>
      </div>

      <div className="progress-bar-bg mt-auto">
        <div
          className="progress-bar-fill"
          style={{
            width: `${usage}%`,
            background: getProgressColor(usage)
          }}
        ></div>
      </div>
    </div>
  );
}
