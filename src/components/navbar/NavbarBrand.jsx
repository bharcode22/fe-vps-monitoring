import React from 'react';
import { Activity } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { getActiveBackendInfo } from '../../config';

export default function NavbarBrand({ isConnected, onNavigateHome }) {
  const { t } = useLanguage();
  const backendInfo = getActiveBackendInfo();

  return (
    <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
      {/* Brand Icon Badge */}
      <div
        onClick={onNavigateHome}
        className="bg-gradient-to-br from-cyan-500/20 to-blue-500/20 border border-cyan-500/40 p-1.5 sm:p-2 rounded-xl flex items-center justify-center shadow-md shadow-cyan-500/10 shrink-0 cursor-pointer hover:border-cyan-400 transition-colors"
        title="Ke Dashboard"
      >
        <Activity className="text-cyan-400 w-5 h-5" />
      </div>

      {/* Brand Name & Connection Status */}
      <div className="cursor-pointer" onClick={onNavigateHome}>
        <div className="flex items-center gap-1.5 sm:gap-2">
          <h1 className="gradient-text text-sm sm:text-base lg:text-lg font-extrabold tracking-tight whitespace-nowrap">
            {t('appTitle')}
          </h1>
          <span
            className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-slate-800 text-slate-300 border border-slate-700 font-mono hidden sm:inline-block"
            title={`Terhubung ke: ${backendInfo.url}`}
          >
            {backendInfo.badge}
          </span>
          <span
            className={`w-2 h-2 rounded-full ${
              isConnected
                ? 'bg-emerald-400 animate-pulse shadow-sm shadow-emerald-400/50'
                : 'bg-rose-500 shadow-sm shadow-rose-500/50'
            }`}
            title={isConnected ? `Terhubung ke ${backendInfo.name} (Live)` : 'Koneksi ke server terputus'}
          />
        </div>
      </div>
    </div>
  );
}
