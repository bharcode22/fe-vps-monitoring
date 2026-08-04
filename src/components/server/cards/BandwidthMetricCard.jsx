import React from 'react';
import { ArrowDown, ArrowUp } from 'lucide-react';
import { formatSpeed } from '../../../utils/formatters';

export function DownloadSpeedCard({ speed = 0 }) {
  return (
    <div className="bg-slate-900/60 border border-slate-800/80 hover:border-cyan-500/30 rounded-2xl p-3.5 flex flex-col justify-between transition-all duration-200">
      <div className="flex flex-col gap-1.5 mb-2">
        <div className="flex items-center gap-1.5 text-slate-400">
          <ArrowDown size={14} className="text-cyan-400 shrink-0" />
          <span className="text-[10px] font-bold uppercase tracking-wider truncate">Download</span>
        </div>
        <div className="font-mono font-extrabold text-cyan-400 text-xl tracking-tight mt-1">
          {formatSpeed(speed)}
        </div>
      </div>
    </div>
  );
}

export function UploadSpeedCard({ speed = 0 }) {
  return (
    <div className="bg-slate-900/60 border border-slate-800/80 hover:border-purple-500/30 rounded-2xl p-3.5 flex flex-col justify-between transition-all duration-200">
      <div className="flex flex-col gap-1.5 mb-2">
        <div className="flex items-center gap-1.5 text-slate-400">
          <ArrowUp size={14} className="text-purple-400 shrink-0" />
          <span className="text-[10px] font-bold uppercase tracking-wider truncate">Upload</span>
        </div>
        <div className="font-mono font-extrabold text-purple-400 text-xl tracking-tight mt-1">
          {formatSpeed(speed)}
        </div>
      </div>
    </div>
  );
}
