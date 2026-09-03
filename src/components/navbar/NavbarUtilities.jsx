import React, { useState, useEffect } from 'react';
import { Tv, RefreshCw, Maximize, Minimize } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';

export default function NavbarUtilities({
  isTvMode,
  onToggleTvMode,
  onRefresh,
  isAuthenticated
}) {
  const { t } = useLanguage();
  const [isFullscreen, setIsFullscreen] = useState(Boolean(document.fullscreenElement));

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const handleToggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
      }
    }
  };

  return (
    <div className="flex items-center gap-1 bg-slate-950/70 p-1 rounded-xl border border-slate-800 shadow-inner">
      {/* TV Mode Switch (Full Width UI) */}
      <button
        onClick={onToggleTvMode}
        className={`px-2 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all duration-200 cursor-pointer ${
          isTvMode
            ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
            : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
        }`}
        title={isTvMode ? 'Keluar dari TV Mode (Kembali ke Tampilan Normal)' : 'Aktifkan TV Mode (Tampilan Full Width Layar Besar / NOC Wall)'}
      >
        <Tv size={14} className={isTvMode ? 'text-cyan-400' : 'text-slate-400'} />
        <span className="hidden 2xl:inline">{isTvMode ? t('normalView') : t('tvMode')}</span>
      </button>

      {/* Browser Native Fullscreen (F11) Toggle */}
      <button
        onClick={handleToggleFullscreen}
        className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
          isFullscreen
            ? 'text-cyan-400 bg-cyan-500/10'
            : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
        }`}
        title={isFullscreen ? 'Keluar dari Fullscreen Browser' : 'Layar Penuh / Fullscreen Browser (F11)'}
      >
        {isFullscreen ? <Minimize size={14} /> : <Maximize size={14} />}
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
    </div>
  );
}
