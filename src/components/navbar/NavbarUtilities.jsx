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
      <div className="flex items-center bg-slate-900 p-0.5 rounded-lg border border-slate-800 ml-0.5">
        <button
          onClick={() => changeLanguage('id')}
          className={`px-1.5 py-0.5 rounded text-[10px] font-extrabold transition-colors cursor-pointer ${
            lang === 'id' ? 'bg-cyan-500/25 text-cyan-300' : 'text-slate-500 hover:text-slate-300'
          }`}
          title="Bahasa Indonesia"
        >
          ID
        </button>
        <button
          onClick={() => changeLanguage('en')}
          className={`px-1.5 py-0.5 rounded text-[10px] font-extrabold transition-colors cursor-pointer ${
            lang === 'en' ? 'bg-cyan-500/25 text-cyan-300' : 'text-slate-500 hover:text-slate-300'
          }`}
          title="English"
        >
          EN
        </button>
      </div>
    </div>
  );
}
