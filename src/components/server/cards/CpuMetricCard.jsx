import React from 'react';
import { Cpu } from 'lucide-react';
import { getProgressColor } from '../../../utils/formatters';

export default function CpuMetricCard({ cpuUsage = 0, cpuCores = 1 }) {
  const usage = Math.min(100, Math.max(0, Number(cpuUsage) || 0));

  return (
    <div className="bg-slate-900/60 border border-slate-800/80 hover:border-sky-500/30 rounded-2xl p-3.5 flex flex-col justify-between transition-all duration-200">
      <div className="flex items-center justify-between gap-1 mb-1.5">
        <div className="flex items-center gap-1.5 min-w-0">
          <Cpu size={16} className="text-sky-400 shrink-0" />
          <span className="text-xs font-semibold text-slate-300 truncate">CPU Load</span>
        </div>
        <span className="font-mono font-extrabold text-white text-base shrink-0">
          {usage}%
        </span>
      </div>

      <div className="flex items-center justify-between text-[10px] font-mono mb-1.5">
        <span className="text-sky-400/90 font-bold bg-sky-500/15 border border-sky-500/30 px-1.5 py-0.5 rounded-md">
          {cpuCores} Cores
        </span>
      </div>

      <div className="progress-bar-bg my-0.5">
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
