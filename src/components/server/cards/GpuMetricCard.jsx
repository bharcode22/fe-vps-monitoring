import React from 'react';
import { Zap } from 'lucide-react';

export default function GpuMetricCard({ gpuUsage = 0, gpuName = '', gpuTemp = 0 }) {
  const hasGpu = Boolean(gpuName && gpuName !== 'N/A' && gpuName !== 'No GPU / N/A' && gpuName.trim() !== '');
  const usage = hasGpu ? Math.min(100, Math.max(0, Number(gpuUsage) || 0)) : 0;

  return (
    <div className={`rounded-2xl p-3.5 flex flex-col justify-between transition-all duration-200 ${
      hasGpu ? 'bg-emerald-500/10 border border-emerald-500/20 hover:border-emerald-500/40' : 'bg-slate-900/40 border border-slate-800/80 opacity-70'
    }`}>
      <div className="flex flex-col gap-1.5 mb-2">
        <div className="flex items-center gap-1.5 text-slate-400">
          <Zap size={14} className={hasGpu ? 'text-emerald-400 shrink-0' : 'text-slate-500 shrink-0'} />
          <span className="text-[10px] font-bold uppercase tracking-wider truncate">GPU Load</span>
        </div>
        <div className={`font-mono font-extrabold text-xl tracking-tight ${hasGpu ? 'text-white' : 'text-slate-400'}`}>
          {usage}%
        </div>
      </div>

      <div className="progress-bar-bg mb-2">
        <div
          className="progress-bar-fill"
          style={{
            width: `${usage}%`,
            background: hasGpu ? 'linear-gradient(90deg, #059669, #10b981)' : '#334155'
          }}
        ></div>
      </div>

      <div className="flex items-center justify-between text-[10px] font-mono gap-1 text-slate-400 mt-auto">
        <span className="truncate max-w-[65%]" title={hasGpu ? gpuName : 'N/A'}>
          {hasGpu ? gpuName : 'Tidak Ada GPU'}
        </span>
        {hasGpu && gpuTemp ? (
          <span className="text-emerald-400 font-bold shrink-0">{gpuTemp}°C</span>
        ) : null}
      </div>
    </div>
  );
}
