import React from 'react';
import {
  ArrowLeft,
  RefreshCw,
  Table,
  Activity
} from 'lucide-react';

/**
 * Top header component for Master Multi-POD Sync Matrix Page.
 * Handles view mode tabs, active table badge, and global refresh.
 */
export default function MasterPodSyncHeader({
  viewMode,
  selectedTableName,
  tablesCount = 0,
  discrepantTablesCount = 0,
  isLoading = false,
  onBack,
  onSetViewMode,
  onRefresh
}) {
  const handleBackClick = () => {
    if (viewMode === 'detail' || viewMode === 'audit') {
      onSetViewMode('catalog');
    } else {
      if (typeof onBack === 'function') {
        onBack();
      }
    }
  };

  return (
    <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-cyan-500/20">
      {/* Title & Back Navigation */}
      <div className="flex items-center gap-3">
        <button
          onClick={handleBackClick}
          className="p-2 bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl border border-slate-700 transition-colors cursor-pointer"
          title="Kembali"
        >
          <ArrowLeft size={18} />
        </button>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-extrabold text-white tracking-tight">
              Master Multi-POD Sync Matrix
            </h1>
            <span className="text-xs font-mono font-bold px-2.5 py-0.5 rounded-full bg-purple-500/15 text-purple-300 border border-purple-500/30">
              {viewMode === 'catalog'
                ? 'Katalog Master'
                : viewMode === 'audit'
                  ? '🔍 Audit Disparitas 95 Tabel'
                  : `Tabel: ${selectedTableName}`}
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Audit Keselarasan Skema Kolom &amp; Baris Data dari <strong className="text-cyan-300">Database Master</strong> ke seluruh armada <strong className="text-purple-300">POD V3</strong>
          </p>
        </div>
      </div>

      {/* Global Action: Mode Switcher / Refresh */}
      <div className="flex items-center gap-2.5 flex-wrap">
        {/* View Mode Switcher (Catalog vs Fleet Audit) */}
        {viewMode !== 'detail' && (
          <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 shadow-inner">
            <button
              onClick={() => onSetViewMode('catalog')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${viewMode === 'catalog'
                ? 'bg-purple-500/25 text-purple-300 border border-purple-500/40 shadow-sm'
                : 'text-slate-400 hover:text-white'
                }`}
            >
              <Table size={13} />
              <span>Katalog ({tablesCount})</span>
            </button>

            <button
              onClick={() => onSetViewMode('audit')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${viewMode === 'audit'
                ? 'bg-cyan-500/25 text-cyan-300 border border-cyan-500/40 shadow-sm'
                : 'text-slate-400 hover:text-white'
                }`}
            >
              <Activity size={13} className="text-cyan-400" />
              <span>Audit Tabel</span>
              {discrepantTablesCount > 0 && (
                <span className="px-1.5 py-0.2 rounded-full bg-amber-500/30 text-amber-300 text-[10px] font-mono">
                  {discrepantTablesCount}
                </span>
              )}
            </button>
          </div>
        )}

        {viewMode === 'detail' && (
          <button
            onClick={() => onSetViewMode('catalog')}
            className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors border border-slate-700 cursor-pointer shadow-sm"
          >
            <Table size={14} />
            <span>Semua Tabel Master</span>
          </button>
        )}

        <button
          onClick={onRefresh}
          disabled={isLoading}
          className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-cyan-400 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors border border-slate-700 cursor-pointer shadow-sm disabled:opacity-50"
        >
          <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
          <span>Muat Ulang</span>
        </button>
      </div>
    </div>
  );
}
