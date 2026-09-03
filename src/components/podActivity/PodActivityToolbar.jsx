import React from 'react';
import { Search, LayoutGrid, List, Activity, Cpu } from 'lucide-react';

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
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3.5 bg-slate-900/80 backdrop-blur-md border border-slate-800/90 p-3.5 rounded-2xl shadow-xl">
      {/* Search Input */}
      <div className="relative flex-1 max-w-md">
        <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Cari nama POD V3, kode (#35), atau IP LAN..."
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
            Semua ({totalPods})
          </button>
          <button
            onClick={() => onTabChange('OCCUPIED')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${activeTab === 'OCCUPIED'
              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm'
              : 'text-slate-400 hover:text-slate-200'
              }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span>Occupied ({occupiedCount})</span>
          </button>
          <button
            onClick={() => onTabChange('VACANT')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${activeTab === 'VACANT'
              ? 'bg-slate-800 text-white border border-slate-700 shadow-sm'
              : 'text-slate-400 hover:text-slate-200'
              }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
            <span>Available ({vacantCount})</span>
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
            title="Tampilan Kartu Live"
          >
            <LayoutGrid size={15} />
            <span className="hidden md:inline">Kartu</span>
          </button>
          <button
            onClick={() => onViewModeChange('table')}
            className={`p-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${viewMode === 'table'
              ? 'bg-slate-800 text-cyan-300 shadow-sm'
              : 'text-slate-400 hover:text-slate-200'
              }`}
            title="Tampilan Tabel"
          >
            <List size={15} />
            <span className="hidden md:inline">Tabel</span>
          </button>
          <button
            onClick={() => onViewModeChange('matrix')}
            className={`p-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${viewMode === 'matrix'
              ? 'bg-gradient-to-r from-emerald-500/20 to-teal-500/20 text-emerald-300 border border-emerald-500/30 shadow-sm'
              : 'text-slate-400 hover:text-slate-200'
              }`}
            title="Matriks Heartbeat Seluruh Modul"
          >
            <Cpu size={15} className="text-emerald-400" />
            <span className="hidden md:inline">Matriks</span>
          </button>
        </div>

        {/* Live MQTT Feed Toggle */}
        <button
          onClick={onToggleMqttFeed}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer transition-all border flex items-center gap-1.5 ${showMqttFeed
            ? 'bg-fuchsia-500/20 text-fuchsia-300 border-fuchsia-500/40 shadow-sm shadow-fuchsia-500/20'
            : 'bg-slate-950/80 text-slate-400 border-slate-800 hover:text-slate-200'
            }`}
          title="Tampilkan Live Topic Dashboard"
        >
          <span className={`w-2 h-2 rounded-full ${showMqttFeed ? 'bg-fuchsia-400 animate-pulse' : 'bg-slate-600'}`} />
          Live Dashboards
        </button>
      </div>
    </div>
  );
}
