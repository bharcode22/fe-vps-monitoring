import React from 'react';
import { HardDrive } from 'lucide-react';
import { useLanguage } from '../../../context/LanguageContext';

export default function DiskMetricCard({ diskUsage = 0, diskUsedGb = 0, diskFreeGb = 0 }) {
  const { t } = useLanguage();
  const usage = Math.min(100, Math.max(0, Number(diskUsage) || 0));

  return (
    <div className="bg-slate-900/60 border border-slate-800/80 hover:border-emerald-500/30 rounded-2xl p-3.5 flex flex-col justify-between transition-all duration-200">
      <div className="flex items-center justify-between gap-1 mb-1.5">
        <div className="flex items-center gap-1.5 min-w-0">
          <HardDrive size={16} className="text-emerald-400 shrink-0" />
          <span className="text-xs font-semibold text-slate-300 truncate">{t('diskStorage')}</span>
        </div>
        <span className="font-mono font-extrabold text-white text-base shrink-0">
          {usage}%
        </span>
      </div>

      <div className="progress-bar-bg my-1.5">
        <div
          className="progress-bar-fill"
          style={{
            width: `${usage}%`,
            background: 'linear-gradient(90deg, #10b981, #34d399)'
          }}
        ></div>
      </div>

      <div className="flex flex-col gap-0.5 text-[11px] font-mono text-slate-400 mt-1">
        <div className="flex justify-between items-center">
          <span>{t('used')}:</span>
          <span className="text-slate-200 font-semibold">{diskUsedGb} GB</span>
        </div>
        <div className="flex justify-between items-center">
          <span>{t('free')}:</span>
          <span className="text-emerald-400 font-semibold">{diskFreeGb} GB</span>
        </div>
      </div>
    </div>
  );
}
