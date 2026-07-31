import React from 'react';
import { Zap } from 'lucide-react';

export default function GpuMetricCard({ gpuUsage = 0, gpuName = '', gpuTemp = 0 }) {
  const hasGpu = Boolean(gpuName && gpuName !== 'N/A' && gpuName !== 'No GPU / N/A' && gpuName.trim() !== '');
  const usage = hasGpu ? Math.min(100, Math.max(0, Number(gpuUsage) || 0)) : 0;

  return (
    <div className={`border rounded-2xl p-3.5 flex flex-col justify-between transition-all duration-200 ${
      hasGpu ? 'bg-emerald-500/5 border-emerald-500/20 hover:border-emerald-500/40' : 'bg-slate-900/40 border-slate-800/80 opacity-70'
    }`}>
      <div className="flex items-center justify-between gap-1 mb-1.5">
        <div className="flex items-center gap-1.5 min-w-0">
          <Zap size={16} className={hasGpu ? 'text-emerald-400 shrink-0' : 'text-slate-500 shrink-0'} />
          <span className="text-xs font-semibold text-slate-300 truncate">GPU Load</span>
        </div>
        <span className={`font-mono font-extrabold text-base shrink-0 ${hasGpu ? 'text-white' : 'text-slate-400'}`}>
          {usage}%
        </span>
      </div>

      <div className="progress-bar-bg my-1.5">
        <div
          className="progress-bar-fill"
          style={{
            width: `${usage}%`,
            background: hasGpu ? 'linear-gradient(90deg, #059669, #10b981)' : '#334155'
          }}
        ></div>
      </div>

      <div className="flex items-center justify-between text-[11px] font-mono gap-1 text-slate-400 mt-1">
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
