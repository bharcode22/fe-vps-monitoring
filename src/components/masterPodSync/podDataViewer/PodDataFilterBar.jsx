import React, { useState } from 'react';
import {
  Database,
  CheckCircle2,
  AlertTriangle,
  Search,
  ArrowUpCircle,
  Trash2,
  X
} from 'lucide-react';

export default function PodDataFilterBar({
  pod,
  activeSubTab,
  setActiveSubTab,
  dataMatrix = [],
  columnsMatrix = [],
  dataStatusFilter,
  setDataStatusFilter,
  presentCountInThisPod = 0,
  missingCountInThisPod = 0,
  searchQuery,
  setSearchQuery,
  selectedKeys,
  filteredData = [],
  pkColumn = 'id',
  onBulkSyncPodRowsToMaster,
  handleBulkDeletePod,
  clearSelection
}) {
  const [isPullingToMaster, setIsPullingToMaster] = useState(false);

  return (
    <div className="flex flex-col gap-3 pt-1">
      {/* Toolbar Sub-Tabs & Filters */}
      <div className="flex flex-col xl:flex-row items-start xl:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Main View Tab: Data vs Columns */}
          <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
            <button
              onClick={() => setActiveSubTab('data')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeSubTab === 'data'
                  ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Database size={13} />
              <span>Data Baris ({dataMatrix.length})</span>
            </button>
            <button
              onClick={() => setActiveSubTab('columns')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeSubTab === 'columns'
                  ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <span>Struktur Kolom ({columnsMatrix.length})</span>
            </button>
          </div>

          {/* Filter Status Data di POD: Semua / Sudah Ada / Belum Ada */}
          {activeSubTab === 'data' && (
            <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
              <button
                onClick={() => setDataStatusFilter('all')}
                className={`px-2.5 py-1.5 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  dataStatusFilter === 'all'
                    ? 'bg-slate-800 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <span>Semua ({dataMatrix.length})</span>
              </button>

              <button
                onClick={() => setDataStatusFilter('present')}
                className={`px-2.5 py-1.5 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  dataStatusFilter === 'present'
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm'
                    : 'text-emerald-400/70 hover:text-emerald-300'
                }`}
                title="Tampilkan hanya data yang sudah ada di database unit POD ini"
              >
                <CheckCircle2 size={13} className="text-emerald-400" />
                <span>Sudah Ada di POD ({presentCountInThisPod})</span>
              </button>

              <button
                onClick={() => setDataStatusFilter('missing')}
                className={`px-2.5 py-1.5 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  dataStatusFilter === 'missing'
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm'
                    : 'text-amber-400/70 hover:text-amber-300'
                }`}
                title="Tampilkan data Master yang belum ada di unit POD ini"
              >
                <AlertTriangle size={13} className="text-amber-400" />
                <span>Belum Ada di POD ({missingCountInThisPod})</span>
              </button>
            </div>
          )}
        </div>

        {activeSubTab === 'data' && (
          <div className="relative w-full sm:w-64">
            <Search size={13} className="absolute left-3 top-2.5 text-slate-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari baris data..."
              className="w-full pl-8 pr-3 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 font-mono"
            />
          </div>
        )}
      </div>

      {/* Floating Bulk Action Bar in POD Viewer */}
      {activeSubTab === 'data' && selectedKeys.size > 0 && (
        <div className="p-3 bg-gradient-to-r from-slate-900 to-slate-950 border border-purple-500/40 rounded-2xl flex items-center justify-between gap-3 shadow-2xl animate-in slide-in-from-top-2 duration-200">
          <div className="flex items-center gap-2 text-xs">
            <span className="w-2.5 h-2.5 rounded-full bg-purple-500 animate-ping" />
            <span className="font-bold text-white">
              <strong className="text-purple-400 font-mono text-sm">{selectedKeys.size}</strong> baris di {pod.name} dipilih
            </span>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Upload Selected Rows Button */}
            {onBulkSyncPodRowsToMaster && (
              <button
                disabled={isPullingToMaster}
                onClick={async () => {
                  setIsPullingToMaster(true);
                  try {
                    const selectedItems = filteredData
                      .filter((item) => {
                        const pkVal =
                          item.sampleData?.[pkColumn] !== undefined
                            ? String(item.sampleData[pkColumn])
                            : item.rowKey;
                        return selectedKeys.has(pkVal);
                      })
                      .map((item) => ({
                        ...item.sampleData,
                        __rowKey: item.rowKey,
                        __originPodId: pod.id,
                        __originPodName: pod.name,
                        __podIds: [pod.id],
                        __podSources: [pod.name]
                      }));
                    if (selectedItems.length > 0) {
                      await onBulkSyncPodRowsToMaster(selectedItems, pkColumn);
                      clearSelection();
                    }
                  } finally {
                    setIsPullingToMaster(false);
                  }
                }}
                className="px-3 py-1.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-lg shadow-purple-600/30 transition-all cursor-pointer hover:scale-105 disabled:opacity-50"
              >
                <ArrowUpCircle size={13} />
                <span>Upload ke Master ({selectedKeys.size})</span>
              </button>
            )}

            <button
              onClick={handleBulkDeletePod}
              className="px-3 py-1.5 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-lg shadow-red-600/30 transition-all cursor-pointer hover:scale-105"
            >
              <Trash2 size={13} />
              <span>Hard Delete ({selectedKeys.size})</span>
            </button>

            <button
              onClick={clearSelection}
              className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white rounded-xl text-xs transition-colors cursor-pointer"
              title="Batalkan Pilihan"
            >
              <X size={14} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
