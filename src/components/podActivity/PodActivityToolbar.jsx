import React from 'react';
import { Search, LayoutGrid, List, Activity, Cpu } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';

export default function PodActivityToolbar({
  searchQuery,
  onSearchChange,
  activeTab,
  onTabChange,
  viewMode,
  onViewModeChange,
  totalPods = 0,
  occupiedCount = 0,
  vacantCount = 0,
  showMqttFeed,
  onToggleMqttFeed
}) {
  const { t } = useLanguage();

  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3.5 bg-slate-900/80 backdrop-blur-md border border-slate-800/90 p-3.5 rounded-2xl shadow-xl">
      {/* Search Input */}
      <div className="relative flex-1 max-w-md">
        <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder={t('podActivity.toolbar.searchPlaceholder', null, 'Cari nama POD V3, kode (#35), atau IP LAN...')}
          className="w-full bg-slate-950/80 border border-slate-800 text-slate-200 text-xs rounded-xl pl-9 pr-3.5 py-2.5 focus:outline-none focus:border-cyan-500/80 focus:ring-1 focus:ring-cyan-500/30 transition-all font-medium placeholder:text-slate-500 shadow-inner"
        />
      </div>

      {/* Filter Tabs & View Mode */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex items-center gap-1 bg-slate-950/80 p-1 rounded-xl border border-slate-800/90 shadow-inner">
          <button
            onClick={() => onTabChange('ALL')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${activeTab === 'ALL'
              ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
              : 'text-slate-400 hover:text-slate-200'
              }`}
          >
            {t('podActivity.toolbar.all', { count: totalPods }, `Semua (${totalPods})`)}
          </button>
          <button
            onClick={() => onTabChange('OCCUPIED')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${activeTab === 'OCCUPIED'
              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm'
              : 'text-slate-400 hover:text-slate-200'
              }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span>{t('podActivity.toolbar.occupiedFilter', { count: occupiedCount }, `Occupied (${occupiedCount})`)}</span>
          </button>
          <button
            onClick={() => onTabChange('VACANT')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${activeTab === 'VACANT'
              ? 'bg-slate-800 text-white border border-slate-700 shadow-sm'
              : 'text-slate-400 hover:text-slate-200'
              }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
            <span>{t('podActivity.toolbar.vacantFilter', { count: vacantCount }, `Vacant (${vacantCount})`)}</span>
          </button>
        </div>

        {/* View Mode Toggle: Cards, Table, Matrix */}
        <div className="flex items-center gap-1 bg-slate-950/80 p-1 rounded-xl border border-slate-800/90 shadow-inner">
          <button
            onClick={() => onViewModeChange('cards')}
            className={`p-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${viewMode === 'cards'
              ? 'bg-slate-800 text-cyan-300 shadow-sm'
              : 'text-slate-400 hover:text-slate-200'
              }`}
            title={t('podActivity.toolbar.viewCards', null, 'Tampilan Kartu')}
          >
            <LayoutGrid size={15} />
            <span className="hidden md:inline">{t('podActivity.toolbar.viewCards', null, 'Kartu')}</span>
          </button>
          <button
            onClick={() => onViewModeChange('table')}
            className={`p-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${viewMode === 'table'
              ? 'bg-slate-800 text-cyan-300 shadow-sm'
              : 'text-slate-400 hover:text-slate-200'
              }`}
            title={t('podActivity.toolbar.viewTable', null, 'Tampilan Tabel')}
          >
            <List size={15} />
            <span className="hidden md:inline">{t('podActivity.toolbar.viewTable', null, 'Tabel')}</span>
          </button>
          <button
            onClick={() => onViewModeChange('matrix')}
            className={`p-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${viewMode === 'matrix'
              ? 'bg-gradient-to-r from-emerald-500/20 to-teal-500/20 text-emerald-300 border border-emerald-500/30 shadow-sm'
              : 'text-slate-400 hover:text-slate-200'
              }`}
            title={t('podActivity.toolbar.viewMatrix', null, 'Matriks Heartbeat Seluruh Modul')}
          >
            <Cpu size={15} className="text-emerald-400" />
            <span className="hidden md:inline">{t('podActivity.toolbar.viewMatrix', null, 'Matriks')}</span>
          </button>
        </div>

        {/* Live MQTT Packet Feed Toggle */}
        {onToggleMqttFeed && (
          <button
            onClick={onToggleMqttFeed}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 border ${showMqttFeed
              ? 'bg-purple-500/20 text-purple-300 border-purple-500/40 shadow-sm'
              : 'bg-slate-950/80 text-slate-400 border-slate-800 hover:text-slate-200'
              }`}
          >
            <Activity size={14} className={showMqttFeed ? 'animate-pulse text-purple-400' : ''} />
            <span>{t('podActivity.toolbar.mqttFeed', null, 'Live Packet Feed')}</span>
          </button>
        )}
      </div>
    </div>
  );
}
