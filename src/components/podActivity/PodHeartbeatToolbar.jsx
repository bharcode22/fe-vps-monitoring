import React from 'react';
import {
  Radio,
  Search,
  X,
  AlertTriangle,
  AlertCircle,
  Volume2,
  VolumeX,
  Settings,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  History,
  FileCode,
  ExternalLink,
  HelpCircle
} from 'lucide-react';

export default function PodHeartbeatToolbar({
  totalReceivedPackets = 0,
  modulesHealthAnalysis,
  healthFilter = 'ALL',
  onHealthFilterChange,
  searchQuery = '',
  onSearchChange,
  soundAlertEnabled = true,
  onToggleSoundAlert,
  areAllCollapsed = false,
  onToggleCollapseAll,
  onOpenManageModal,
  onOpenHistoryModal,
  onOpenLegendModal,
  onStatusAll,
  onNavigateView = null,
  pod = null
}) {
  const healthyCount = modulesHealthAnalysis?.healthyList?.length || 0;
  const warningCount = modulesHealthAnalysis?.warningList?.length || 0;
  const deadCount = (modulesHealthAnalysis?.deadList?.length || 0) + (modulesHealthAnalysis?.frozenList?.length || 0);

  return (
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900/80 p-4 rounded-2xl border border-slate-800 shadow-xl backdrop-blur-md">
      {/* Left: Summary Metrics */}
      <div className="flex items-center gap-3 flex-wrap">
        {/* Total Received Packets */}
        <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-950/80 rounded-xl border border-slate-800">
          <Radio size={14} className="text-cyan-400 animate-pulse" />
          <span className="text-xs text-slate-400">Total Paket:</span>
          <span className="text-xs font-bold text-white font-mono">{totalReceivedPackets}</span>
        </div>

        {/* Healthy Count */}
        <button
          onClick={() => onHealthFilterChange(healthFilter === 'HEALTHY' ? 'ALL' : 'HEALTHY')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold cursor-pointer transition ${
            healthFilter === 'HEALTHY'
              ? 'bg-emerald-500/25 text-emerald-300 border-emerald-500/40 shadow-sm'
              : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20'
          }`}
        >
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span>{healthyCount} Live OK</span>
        </button>

        {/* Warning / Delay Count */}
        {warningCount > 0 && (
          <button
            onClick={() => onHealthFilterChange(healthFilter === 'WARNING' ? 'ALL' : 'WARNING')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold cursor-pointer transition ${
              healthFilter === 'WARNING'
                ? 'bg-amber-500/25 text-amber-300 border-amber-500/40 shadow-sm'
                : 'bg-amber-500/10 text-amber-400 border-amber-500/20 hover:bg-amber-500/20'
            }`}
          >
            <AlertTriangle size={13} className="text-amber-400" />
            <span>{warningCount} Delay</span>
          </button>
        )}

        {/* Dead / Frozen Critical Count */}
        {deadCount > 0 && (
          <button
            onClick={() => onHealthFilterChange(healthFilter === 'CRITICAL' ? 'ALL' : 'CRITICAL')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold cursor-pointer transition animate-pulse ${
              healthFilter === 'CRITICAL'
                ? 'bg-rose-500/30 text-rose-200 border-rose-500/50 shadow-sm'
                : 'bg-rose-500/15 text-rose-300 border-rose-500/30 hover:bg-rose-500/25'
            }`}
          >
            <AlertCircle size={13} className="text-rose-400" />
            <span>{deadCount} Mati / Macet</span>
          </button>
        )}
      </div>

      {/* Right: Search, Legend & Actions */}
      <div className="flex items-center gap-2 flex-wrap">
        {/* Search Input */}
        <div className="relative">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Cari modul / port (ttyUSB)..."
            className="bg-slate-950/80 border border-slate-800 text-slate-200 text-xs rounded-xl pl-8 pr-7 py-2 focus:outline-none focus:border-cyan-500/70 w-44 sm:w-56 font-medium placeholder:text-slate-500"
          />
          {searchQuery && (
            <button
              onClick={() => onSearchChange('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white p-1 rounded-md hover:bg-slate-800 transition cursor-pointer"
              title="Hapus pencarian"
            >
              <X size={12} />
            </button>
          )}
        </div>

        {onNavigateView && (
          <button
            onClick={() => onNavigateView('pod-heartbeat-records', { podId: pod?.id })}
            className="p-2 bg-gradient-to-r from-cyan-500/20 to-blue-500/20 hover:from-cyan-500/30 hover:to-blue-500/30 border border-cyan-500/40 text-cyan-300 hover:text-white rounded-xl flex items-center gap-1.5 text-xs font-bold transition cursor-pointer shadow-sm"
            title="Buka Pusat Rekaman JSON & Analisis Detak di Halaman Khusus"
          >
            <FileCode size={14} className="text-cyan-400" />
            <span className="hidden sm:inline">Pusat Rekaman JSON</span>
            <ExternalLink size={12} className="text-cyan-400/80" />
          </button>
        )}

        <button
          onClick={onOpenHistoryModal}
          className="p-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-amber-300 hover:text-white rounded-xl flex items-center gap-1.5 text-xs font-bold transition cursor-pointer"
          title="Lihat Riwayat Insiden & Unduh Log Harian (.jsonl)"
        >
          <History size={14} className="text-amber-400" />
          <span className="hidden sm:inline">Log Insiden (.jsonl)</span>
        </button>

        <button
          onClick={onOpenLegendModal}
          className="p-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-cyan-300 hover:text-white rounded-xl flex items-center gap-1.5 text-xs font-bold transition cursor-pointer"
          title="Buka Panduan Status & Atur Ambang Batas Waktu (JSON Backend)"
        >
          <HelpCircle size={14} className="text-cyan-400" />
          <span className="hidden sm:inline">Panduan & Atur Waktu</span>
        </button>

        <button
          onClick={onToggleSoundAlert}
          className={`p-2 rounded-xl border cursor-pointer transition ${
            soundAlertEnabled
              ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
              : 'bg-slate-800 text-slate-400 border-slate-700'
          }`}
          title="Toggle Alarm"
        >
          {soundAlertEnabled ? (
            <Volume2 size={14} className="text-emerald-400 animate-pulse" />
          ) : (
            <VolumeX size={14} />
          )}
        </button>

        <button
          onClick={onOpenManageModal}
          className="p-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 rounded-xl cursor-pointer transition"
          title="Kelola Modul (JSON)"
        >
          <Settings size={14} />
        </button>

        <button
          onClick={onStatusAll}
          className="p-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 rounded-xl cursor-pointer transition"
          title="Check All Status"
        >
          <RefreshCw size={14} />
        </button>

        <button
          onClick={onToggleCollapseAll}
          className="p-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 rounded-xl cursor-pointer transition"
          title="Toggle All"
        >
          {areAllCollapsed ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
        </button>
      </div>
    </div>
  );
}
