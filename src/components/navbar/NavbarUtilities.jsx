import React from 'react';
import { Tv, RefreshCw } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';

export default function NavbarUtilities({
  isTvMode,
  onToggleTvMode,
  onRefresh,
  isAuthenticated
}) {
  const { lang, changeLanguage, t } = useLanguage();

  return (
    <div className="flex items-center gap-1 bg-slate-950/70 p-1 rounded-xl border border-slate-800 shadow-inner">
      {/* TV Mode Switch */}
      <button
        onClick={onToggleTvMode}
        className={`px-2 py-1 rounded-lg text-xs font-bold flex items-center gap-1 transition-all duration-200 cursor-pointer ${
          isTvMode
            ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
            : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
        }`}
        title="Toggle TV Wall / NOC View Mode"
      >
        <Tv size={14} className={isTvMode ? 'text-cyan-400' : 'text-slate-400'} />
        <span className="hidden xl:inline">{isTvMode ? t('normalView') : t('tvMode')}</span>
      </button>

      {/* Refresh Button */}
      {isAuthenticated && (
        <button
          onClick={onRefresh}
          className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-900/60 rounded-lg transition-colors cursor-pointer"
          title={t('refresh')}
        >
          <RefreshCw size={14} />
        </button>
      )}

      {/* Language Switcher Pill */}
      <div className="flex items-center bg-slate-900/90 p-0.5 rounded-lg border border-slate-700/60 ml-1 shadow-inner">
        <button
          onClick={() => changeLanguage('id')}
          className={`px-2 py-1 rounded-md text-[11px] font-extrabold transition-all cursor-pointer flex items-center gap-1 ${
            lang === 'id'
              ? 'bg-gradient-to-r from-cyan-500/30 to-blue-500/30 text-cyan-300 border border-cyan-500/50 shadow-sm'
              : 'text-slate-400 hover:text-slate-200'
          }`}
          title="Beralih ke Bahasa Indonesia"
        >
          <span>🇮🇩</span>
          <span>ID</span>
        </button>
        <button
          onClick={() => changeLanguage('en')}
          className={`px-2 py-1 rounded-md text-[11px] font-extrabold transition-all cursor-pointer flex items-center gap-1 ${
            lang === 'en'
              ? 'bg-gradient-to-r from-cyan-500/30 to-blue-500/30 text-cyan-300 border border-cyan-500/50 shadow-sm'
              : 'text-slate-400 hover:text-slate-200'
          }`}
          title="Switch to English"
        >
          <span>🇬🇧</span>
          <span>EN</span>
        </button>
      </div>
    </div>
  );
}
