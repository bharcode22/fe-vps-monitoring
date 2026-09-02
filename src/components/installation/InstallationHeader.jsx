import React from 'react';
import { ArrowLeft, Layers, Clock, RefreshCw } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';

export default function InstallationHeader({
  onBack,
  elapsedSeconds = 0,
  formatTimer,
  activeTab,
  onRefreshVersions
}) {
  const { t } = useLanguage();
  const displayTimer = typeof formatTimer === 'function'
    ? formatTimer(elapsedSeconds)
    : `${String(Math.floor((elapsedSeconds || 0) / 60)).padStart(2, '0')}:${String((elapsedSeconds || 0) % 60).padStart(2, '0')}`;

  return (
    <div className="flex flex-col md:flex-row md:items-center justify-between bg-slate-900/80 backdrop-blur-xl p-4 sm:p-5 rounded-2xl border border-cyan-500/20 shadow-xl gap-4">
      <div className="flex items-center gap-3.5">
        <button
          onClick={onBack}
          className="p-2.5 bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl border border-slate-700/60 transition-all cursor-pointer shadow-md"
          title={t('common.back', null, 'Kembali')}
        >
          <ArrowLeft size={18} />
        </button>

        <div className="flex items-center gap-3">
          <div className="bg-gradient-to-br from-cyan-500/20 to-blue-500/20 border border-cyan-500/40 p-2.5 rounded-xl text-cyan-400">
            <Layers size={22} />
          </div>
          <div>
            <h1 className="text-xl font-extrabold text-white tracking-tight flex items-center gap-2">
              {t('installation.title', null, 'Jenkins CI/CD Pipeline Dashboard')}
              <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-md bg-cyan-500/15 text-cyan-400 border border-cyan-500/30 font-mono">
                #BUILD-105
              </span>
            </h1>
            <p className="text-xs text-slate-400">
              {t('installation.subtitle', null, 'Visualisasi Karboe Pipeline Stage Matrix, download paralel & streaming log WebSockets real-time')}
            </p>
          </div>
        </div>
      </div>

      {/* Build Status Indicator & Timer */}
      <div className="flex items-center gap-3 self-end md:self-auto">
        <div className="flex items-center gap-2 bg-slate-950/80 px-3.5 py-2 rounded-xl border border-slate-800 font-mono text-xs text-slate-300">
          <Clock size={15} className="text-cyan-400 animate-pulse" />
          <span>{t('installation.elapsed', null, 'Elapsed')}: <strong className="text-cyan-300">{displayTimer}</strong></span>
        </div>

        {onRefreshVersions && (
          <button
            onClick={onRefreshVersions}
            className="hidden sm:flex items-center gap-2 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl border border-slate-700 font-semibold text-xs transition-all cursor-pointer"
          >
            <RefreshCw size={14} className="text-cyan-400" />
            <span>{t('installation.refreshMinio', null, 'Refresh Versi MinIO')}</span>
          </button>
        )}
      </div>
    </div>
  );
}
