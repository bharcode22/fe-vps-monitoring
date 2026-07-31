import React from 'react';
import { ArrowDown, ArrowUp } from 'lucide-react';
import { formatSpeed } from '../../../utils/formatters';

export function DownloadSpeedCard({ speed = 0 }) {
  return (
    <div className="bg-slate-900/60 border border-slate-800/80 hover:border-cyan-500/30 rounded-2xl p-4 flex flex-col justify-between transition-all duration-200">
      <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5 shrink truncate">
        <ArrowDown size={16} className="text-cyan-400 shrink-0" />
        <span className="truncate">Download Speed</span>
      </span>
      <div className="font-mono font-extrabold text-cyan-400 text-lg mt-2">
        {formatSpeed(speed)}
      </div>
    </div>
  );
}

export function UploadSpeedCard({ speed = 0 }) {
  return (
    <div className="bg-slate-900/60 border border-slate-800/80 hover:border-purple-500/30 rounded-2xl p-4 flex flex-col justify-between transition-all duration-200">
      <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5 shrink truncate">
        <ArrowUp size={16} className="text-purple-400 shrink-0" />
        <span className="truncate">Upload Speed</span>
      </span>
      <div className="font-mono font-extrabold text-purple-400 text-lg mt-2">
        {formatSpeed(speed)}
      </div>
    </div>
  );
}
