import React from 'react';
import { HardDrive } from 'lucide-react';
import { formatMbToGb } from '../../../utils/formatters';
import { useLanguage } from '../../../context/LanguageContext';

export default function RamMetricCard({ ramUsage = 0, ramUsedMb = 0, ramFreeMb = 0 }) {
  const { t } = useLanguage();
  const usage = Math.min(100, Math.max(0, Number(ramUsage) || 0));

  return (
    <div className="bg-slate-900/60 border border-slate-800/80 hover:border-purple-500/30 rounded-2xl p-3.5 flex flex-col justify-between transition-all duration-200">
      <div className="flex flex-col gap-1.5 mb-2">
        <div className="flex items-center gap-1.5 text-slate-400">
          <HardDrive size={14} className="text-purple-400 shrink-0" />
          <span className="text-[10px] font-bold uppercase tracking-wider truncate">{t('ramMemory')}</span>
        </div>
        <div className="font-mono font-extrabold text-white text-xl tracking-tight">
          {usage}%
        </div>
      </div>

      <div className="progress-bar-bg mb-2">
        <div
          className="progress-bar-fill"
          style={{
            width: `${usage}%`,
            background: 'linear-gradient(90deg, #a855f7, #c084fc)'
          }}
        ></div>
      </div>

      <div className="flex flex-col gap-0.5 text-[10px] font-mono text-slate-400 mt-auto">
        <div className="flex justify-between items-center">
          <span>{t('used')}:</span>
          <span className="text-slate-200 font-semibold">{formatMbToGb(ramUsedMb)}</span>
        </div>
        <div className="flex justify-between items-center">
          <span>{t('free')}:</span>
          <span className="text-purple-400 font-semibold">{formatMbToGb(ramFreeMb)}</span>
        </div>
      </div>
    </div>
  );
}
