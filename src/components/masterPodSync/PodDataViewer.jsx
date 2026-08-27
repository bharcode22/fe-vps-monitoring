import React, { useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  Server,
  CheckCircle2,
  AlertTriangle,
  Zap,
  Copy,
  Check,
  Search,
  Database,
  Trash2,
  ArrowUpCircle,
  ArrowDownCircle,
  UploadCloud,
  DownloadCloud,
  CheckSquare,
  Square,
  MinusSquare,
  X,
  Loader2,
  RefreshCw,
  Eye,
  Code,
  Table
} from 'lucide-react';

export default function PodDataViewer({
  pod,
  masterInfo,
  loadingPodId = null,
  isLoading = false,
  onInspectPod = null,
  dataMatrix = [],
  columnsMatrix = [],
  onSyncPod,
  onSyncPodToMaster,
  onDeletePodRow,
  onDeleteMultiplePodRows,
  onSyncSingleRowToPod,
  onSyncSinglePodRowToMaster,
  onBulkSyncPodRowsToMaster,
  onQuickSyncSingleRow
}) {
  const [activeSubTab, setActiveSubTab] = useState('data'); // 'data' | 'columns'
  const [dataStatusFilter, setDataStatusFilter] = useState('all'); // 'all' | 'present' | 'missing'
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedKey, setCopiedKey] = useState(null);
  const [selectedKeys, setSelectedKeys] = useState(new Set());
  const [isPullingToMaster, setIsPullingToMaster] = useState(false);
  const [syncingRowKey, setSyncingRowKey] = useState(null);
  const [deletingRowKey, setDeletingRowKey] = useState(null);
  const [downloadingRowKey, setDownloadingRowKey] = useState(null);
  const [justUploadedKeys, setJustUploadedKeys] = useState(new Set());

  // Row Inspection Modal States
  const [inspectingRow, setInspectingRow] = useState(null);
  const [modalTab, setModalTab] = useState('table'); // 'table' | 'json'
  const [modalSearch, setModalSearch] = useState('');
  const [copiedModalJson, setCopiedModalJson] = useState(false);

  const pkColumn = masterInfo?.pkColumn || 'id';

  const handleCopy = (text, key) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  // Present count in this POD
  const presentCountInThisPod = useMemo(() => {
    return dataMatrix.filter(item => Boolean(item.presence?.[pod?.id]?.present)).length;
  }, [dataMatrix, pod]);

  // Missing count in this POD
  const missingCountInThisPod = useMemo(() => {
    return dataMatrix.filter(item => !item.presence?.[pod?.id]?.present).length;
  }, [dataMatrix, pod]);

  // Filter rows for this specific POD
  const filteredData = useMemo(() => {
    return dataMatrix.filter(item => {
      const presence = item.presence?.[pod?.id];
      const isPresent = Boolean(presence?.present);

      if (dataStatusFilter === 'present' && !isPresent) return false;
      if (dataStatusFilter === 'missing' && isPresent) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const keyMatch = item.rowKey.toLowerCase().includes(q);
        const sampleMatch = Object.values(item.sampleData || {}).some(val =>
          String(val || '').toLowerCase().includes(q)
        );
        if (!keyMatch && !sampleMatch) return false;
      }

      return true;
    });
  }, [dataMatrix, pod, dataStatusFilter, searchQuery]);

  // Automatically prune selectedKeys if rows are deleted / removed from dataMatrix
  React.useEffect(() => {
    setSelectedKeys(prev => {
      if (!prev || prev.size === 0) return prev;
      const existingKeys = new Set(
        filteredData.map(item => {
          const pkVal = item.sampleData?.[pkColumn] !== undefined ? item.sampleData[pkColumn] : item.rowKey;
          return String(pkVal);
        })
      );
      const next = new Set();
      for (const key of prev) {
        if (existingKeys.has(key)) {
          next.add(key);
        }
      }
      return next.size === prev.size ? prev : next;
    });
  }, [filteredData, pkColumn]);

  // Reset selectedKeys and justUploadedKeys when pod or table changes
  useEffect(() => {
    setSelectedKeys(new Set());
    setJustUploadedKeys(new Set());
  }, [pod?.id, masterInfo?.tableName]);

  // Prevent background scrolling when inspection modal is open
  useEffect(() => {
    if (inspectingRow) {
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = '';
      };
    }
  }, [inspectingRow]);

  // Selection handlers
  const toggleSelectRow = (key) => {
    const next = new Set(selectedKeys);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    setSelectedKeys(next);
  };

  const isAllFilteredSelected = filteredData.length > 0 && filteredData.every(item => {
    const pkVal = item.sampleData?.[pkColumn] !== undefined ? String(item.sampleData[pkColumn]) : item.rowKey;
    return selectedKeys.has(pkVal);
  });

  const isSomeFilteredSelected = filteredData.some(item => {
    const pkVal = item.sampleData?.[pkColumn] !== undefined ? String(item.sampleData[pkColumn]) : item.rowKey;
    return selectedKeys.has(pkVal);
  });

  const toggleSelectAllFiltered = () => {
    if (isAllFilteredSelected) {
      const next = new Set(selectedKeys);
      filteredData.forEach(item => {
        const pkVal = item.sampleData?.[pkColumn] !== undefined ? String(item.sampleData[pkColumn]) : item.rowKey;
        next.delete(pkVal);
      });
      setSelectedKeys(next);
    } else {
      const next = new Set(selectedKeys);
      filteredData.forEach(item => {
        const pkVal = item.sampleData?.[pkColumn] !== undefined ? String(item.sampleData[pkColumn]) : item.rowKey;
        next.add(pkVal);
      });
      setSelectedKeys(next);
    }
  };

  const clearSelection = () => setSelectedKeys(new Set());

  // Handle Bulk Delete in POD
  const handleBulkDeletePod = () => {
    if (selectedKeys.size === 0) return;
    const pkValues = Array.from(selectedKeys);
    if (onDeleteMultiplePodRows) {
      onDeleteMultiplePodRows({
        targetType: 'pod',
        serverId: pod.id,
        serverName: pod.name,
        tableName: masterInfo?.tableName,
        pkColumn,
        pkValues
      });
    } else if (onDeletePodRow) {
      onDeletePodRow({
        serverId: pod.id,
        serverName: pod.name,
        pkColumn,
        pkValues
      });
    }
    // Optimistically clear selection so floating bar disappears immediately upon initiating delete
    clearSelection();
  };

  if (!pod) {
    return (
      <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-10 text-center text-slate-500 font-sans text-xs flex flex-col items-center gap-2">
        <Server size={28} className="text-slate-600" />
        <span>Pilih salah satu unit POD v3 di atas untuk melihat data yang ada di database POD tersebut.</span>
      </div>
    );
  }

  const hasBeenCompared = Boolean(pod && pod.tableExists !== null && pod.rowCount !== null && pod.status !== 'NOT_LOADED');

  if (isLoading || (loadingPodId && String(loadingPodId) === String(pod.id))) {
    return (
      <div className="bg-slate-900/60 border border-purple-500/30 rounded-3xl p-12 text-center text-slate-400 font-sans text-xs flex flex-col items-center justify-center gap-3 animate-in fade-in duration-200">
        <Loader2 size={32} className="animate-spin text-purple-400" />
        <span className="text-sm font-bold text-white">Memuat & Membandingkan Data {pod.name}...</span>
        <span className="text-slate-500 text-[11px]">Menghubungkan ke server {pod.host || ''} dan membandingkan baris data dengan Master Database.</span>
      </div>
    );
  }

  if (!hasBeenCompared) {
    return (
      <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-12 text-center text-slate-400 font-sans text-xs flex flex-col items-center justify-center gap-3.5 animate-in fade-in duration-200">
        <div className="p-3.5 bg-slate-800/80 rounded-2xl text-purple-400 border border-slate-700">
          <Server size={28} />
        </div>
        <div>
          <h4 className="text-sm font-bold text-white">Data {pod.name} Belum Dimuat</h4>
          <p className="text-slate-400 text-xs mt-1 max-w-md">
            Data Master telah siap. Klik tombol di bawah untuk memeriksa isi database {pod.name} dan membandingkannya secara langsung.
          </p>
        </div>
        <button
          onClick={() => onInspectPod?.(pod.id)}
          className="mt-1 px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold rounded-xl text-xs flex items-center gap-2 cursor-pointer shadow-lg shadow-purple-500/25 transition-all hover:scale-105"
        >
          <Zap size={14} />
          <span>Buka & Bandingkan Data {pod.name}</span>
        </button>
      </div>
    );
  }

  if (!pod.isOnline) {
    return (
      <div className="bg-red-500/10 border border-red-500/30 rounded-3xl p-8 text-center text-red-300 text-xs flex flex-col items-center gap-3">
        <AlertTriangle size={32} className="text-red-400" />
        <div>
          <h4 className="font-bold text-sm text-white">Unit {pod.name} Sedang OFFLINE</h4>
          <p className="text-slate-400 mt-1">Database PostgreSQL pada server ini tidak dapat dihubungi. Pastikan server POD menyala dan terhubung ke jaringan.</p>
        </div>
        <button
          onClick={() => onInspectPod?.(pod.id)}
          className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors"
        >
          <RefreshCw size={13} />
          <span>Coba Hubungkan Kembali</span>
        </button>
      </div>
    );
  }

  return (
    <div className="bg-slate-900/80 border border-purple-500/40 rounded-3xl p-5 sm:p-6 shadow-2xl backdrop-blur-xl flex flex-col gap-4">
      {/* Header Bar for Active POD */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-purple-500/15 border border-purple-500/30 text-purple-400">
              <Server size={16} />
            </span>
            <div>
              <h3 className="text-base font-black text-white flex items-center gap-2">
                <span>Data di Unit POD: <strong className="text-purple-400 font-mono">{pod.name}</strong></span>
                <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${pod.status === 'SYNCED'
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                  : 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                  }`}>
                  {pod.status === 'SYNCED' ? '100% SYNCED' : 'DRIFT / KURANG DATA'}
                </span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Jumlah Data: <strong className="text-white font-mono">{pod.rowCount} baris</strong> &bull; Master: <strong className="text-cyan-300 font-mono">{masterInfo?.rowCount || 0} baris</strong>
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons: Push Master ➔ POD & Pull POD ➔ Master */}
        <div className="flex items-center gap-2 flex-wrap">

          {/* Pull POD ➔ Master Button */}
          {onSyncPodToMaster && (
            <button
              disabled={isPullingToMaster}
              onClick={async () => {
                setIsPullingToMaster(true);
                try {
                  await onSyncPodToMaster(pod);
                } finally {
                  setIsPullingToMaster(false);
                }
              }}
              className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-lg shadow-purple-500/20 transition-all cursor-pointer hover:scale-105 disabled:opacity-50"
              title={`Tarik seluruh baris dari ${pod.name} dan simpan/gabungkan ke Master Database`}
            >
              {isPullingToMaster ? (
                <>
                  <Loader2 size={14} className="animate-spin text-white" />
                  <span>Menarik Data Pod {pod.name} ➔ Master...</span>
                </>
              ) : (
                <>
                  <UploadCloud size={14} />
                  <span>{pod.name} ➔ Master</span>
                </>
              )}
            </button>
          )}

          {/* Push Master ➔ POD Button */}
          <button
            onClick={() => onSyncPod(pod.id)}
            className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-lg shadow-cyan-500/20 transition-all cursor-pointer hover:scale-105"
            title={`Kirim seluruh baris dari Master Database ke ${pod.name}`}
          >
            <DownloadCloud size={14} />
            <span>Master ➔ {pod.name}</span>
          </button>

          {/* Re-compare / Refresh comparison for this POD */}
          {onInspectPod && (
            <button
              disabled={isLoading || (loadingPodId && String(loadingPodId) === String(pod.id))}
              onClick={() => onInspectPod(pod.id)}
              className="p-2 bg-slate-800 hover:bg-slate-700 text-purple-300 rounded-xl border border-slate-700 cursor-pointer transition-colors disabled:opacity-50"
              title={`Bandingkan ulang data ${pod.name} dengan Master`}
            >
              <RefreshCw size={14} className={loadingPodId === pod.id ? 'animate-spin' : ''} />
            </button>
          )}
        </div>
      </div>

      {/* Toolbar Sub-Tabs & Filters */}
      <div className="flex flex-col xl:flex-row items-start xl:items-center justify-between gap-3 pt-1">
        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Main View Tab: Data vs Columns */}
          <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
            <button
              onClick={() => setActiveSubTab('data')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1.5 ${activeSubTab === 'data'
                ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                : 'text-slate-400 hover:text-white'
                }`}
            >
              <Database size={13} />
              <span>Data Baris ({dataMatrix.length})</span>
            </button>
            <button
              onClick={() => setActiveSubTab('columns')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1.5 ${activeSubTab === 'columns'
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
                className={`px-2.5 py-1.5 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1.5 ${dataStatusFilter === 'all'
                  ? 'bg-slate-800 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
                  }`}
              >
                <span>Semua ({dataMatrix.length})</span>
              </button>

              <button
                onClick={() => setDataStatusFilter('present')}
                className={`px-2.5 py-1.5 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1.5 ${dataStatusFilter === 'present'
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
                className={`px-2.5 py-1.5 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1.5 ${dataStatusFilter === 'missing'
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
                  const selectedItems = filteredData.filter(item => {
                    const pkVal = item.sampleData?.[pkColumn] !== undefined ? String(item.sampleData[pkColumn]) : item.rowKey;
                    return selectedKeys.has(pkVal);
                  }).map(item => ({
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

      {/* SUB-TAB 1: Data Rows List */}
      {activeSubTab === 'data' && (
        <div className="overflow-x-auto rounded-2xl border border-slate-800 max-h-96 overflow-y-auto shadow-inner bg-slate-950/70">
          <table className="w-full text-left text-xs border-collapse font-mono">
            <thead>
              <tr className="bg-slate-900/95 border-b border-slate-800 text-slate-400 sticky top-0 z-10 font-sans">
                {/* Select All Checkbox */}
                <th className="p-3 text-center w-10">
                  <button
                    onClick={toggleSelectAllFiltered}
                    className="text-slate-400 hover:text-white cursor-pointer"
                    title={isAllFilteredSelected ? "Batalkan Semua" : "Pilih Semua"}
                  >
                    {isAllFilteredSelected ? (
                      <CheckSquare size={15} className="text-purple-400" />
                    ) : isSomeFilteredSelected ? (
                      <MinusSquare size={15} className="text-purple-400" />
                    ) : (
                      <Square size={15} />
                    )}
                  </button>
                </th>
                <th className="p-3 font-semibold text-center w-28 whitespace-nowrap">Aksi</th>
                <th className="p-3 font-bold">Key / ID Baris</th>
                <th className="p-3 font-semibold text-center w-36">Status di {pod.name}</th>
                <th className="p-3 font-bold">Nilai Data Preview</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50 text-[11px]">
              {filteredData.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-10 text-center text-slate-400 font-sans">
                    {dataStatusFilter === 'missing' ? (
                      <div className="flex flex-col items-center gap-2">
                        <CheckCircle2 size={26} className="text-emerald-400" />
                        <span className="font-bold text-white text-xs">Semua Data Sudah Ada di {pod.name}</span>
                        <span className="text-[11px] text-slate-500">Seluruh data Master sudah 100% tersimpan pada database unit POD ini.</span>
                      </div>
                    ) : dataStatusFilter === 'present' ? (
                      <div className="flex flex-col items-center gap-2">
                        <AlertTriangle size={26} className="text-amber-400" />
                        <span className="font-bold text-white text-xs">Belum Ada Data di {pod.name}</span>
                        <span className="text-[11px] text-slate-500">Semua baris Master belum tersinkronisasi ke database unit POD ini.</span>
                      </div>
                    ) : (
                      <span>Tidak ada baris data yang cocok dengan filter atau pencarian.</span>
                    )}
                  </td>
                </tr>
              ) : (
                filteredData.map((item, idx) => {
                  const presence = item.presence?.[pod.id];
                  const isPresent = presence?.present;
                  const pkVal = item.sampleData?.[pkColumn] !== undefined ? item.sampleData[pkColumn] : item.rowKey;
                  const rowKeyStr = String(pkVal);
                  const isSelected = selectedKeys.has(rowKeyStr);

                  return (
                    <tr
                      key={idx}
                      onClick={() => toggleSelectRow(rowKeyStr)}
                      className={`cursor-pointer select-none transition-all ${isSelected
                        ? 'bg-purple-500/20 hover:bg-purple-500/25 border-l-4 border-purple-400 font-medium'
                        : !isPresent
                          ? 'bg-red-500/[0.04] hover:bg-slate-800/60'
                          : 'hover:bg-slate-800/60'
                        }`}
                    >
                      {/* Row Checkbox */}
                      <td className="p-3 text-center" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => toggleSelectRow(rowKeyStr)}
                          className="text-slate-400 hover:text-white cursor-pointer"
                        >
                          {isSelected ? (
                            <CheckSquare size={14} className="text-purple-400" />
                          ) : (
                            <Square size={14} />
                          )}
                        </button>
                      </td>

                      {/* Action column (Upload to Master & Delete in POD) */}
                      <td className="p-3 text-center whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-center gap-1.5">
                          {isPresent ? (
                            <>
                              {/* Upload / Tarik baris ini ke Master */}
                              {onSyncSinglePodRowToMaster && !justUploadedKeys.has(rowKeyStr) && (
                                <button
                                  disabled={syncingRowKey === rowKeyStr}
                                  onClick={async (e) => {
                                    e.stopPropagation();
                                    setSyncingRowKey(rowKeyStr);
                                    try {
                                      await onSyncSinglePodRowToMaster({
                                        serverId: pod.id,
                                        serverName: pod.name,
                                        pkColumn,
                                        pkValue: pkVal
                                      });
                                      setJustUploadedKeys(prev => new Set(prev).add(rowKeyStr));
                                    } finally {
                                      setSyncingRowKey(null);
                                    }
                                  }}
                                  className="px-2.5 py-1 rounded-lg bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-[10px] font-bold flex items-center gap-1 shadow-sm transition-all cursor-pointer hover:scale-105 disabled:opacity-50"
                                  title={`Upload / Tarik 1 baris ini dari ${pod.name} ke Master Database`}
                                >
                                  {syncingRowKey === rowKeyStr ? (
                                    <>
                                      <Loader2 size={12} className="animate-spin text-white" />
                                      <span>Uploading...</span>
                                    </>
                                  ) : (
                                    <>
                                      <ArrowUpCircle size={12} />
                                      <span>Upload</span>
                                    </>
                                  )}
                                </button>
                              )}
                              {justUploadedKeys.has(rowKeyStr) && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold">
                                  <CheckCircle2 size={11} className="text-emerald-400" />
                                  <span>Terupload</span>
                                </span>
                              )}

                              {/* Hapus baris di POD */}
                              <button
                                disabled={deletingRowKey === rowKeyStr}
                                onClick={async (e) => {
                                  e.stopPropagation();
                                  setDeletingRowKey(rowKeyStr);
                                  try {
                                    onDeletePodRow && await onDeletePodRow({
                                      serverId: pod.id,
                                      serverName: pod.name,
                                      pkColumn,
                                      pkValue: pkVal
                                    });
                                  } finally {
                                    setDeletingRowKey(null);
                                  }
                                }}
                                className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/15 transition-colors cursor-pointer disabled:opacity-50"
                                title={`Hapus permanen baris data ini dari database ${pod.name}`}
                              >
                                {deletingRowKey === rowKeyStr ? (
                                  <Loader2 size={13} className="animate-spin text-red-400" />
                                ) : (
                                  <Trash2 size={13} />
                                )}
                              </button>
                            </>
                          ) : (
                            <span className="text-slate-600 text-xs">-</span>
                          )}
                        </div>
                      </td>

                      {/* Key */}
                      <td className="p-3 font-bold text-cyan-300">
                        <div className="flex items-center gap-1.5">
                          <span className="truncate max-w-[240px]" title={item.rowKey}>{item.rowKey}</span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleCopy(item.rowKey, `pod_r_${idx}`);
                            }}
                            className="text-slate-500 hover:text-cyan-400 p-0.5 cursor-pointer"
                          >
                            {copiedKey === `pod_r_${idx}` ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                          </button>
                        </div>
                      </td>

                      {/* Status */}
                      <td className="p-3 text-center" onClick={(e) => e.stopPropagation()}>
                        {isPresent ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold font-sans">
                            <CheckCircle2 size={12} /> Ada di {pod.name}
                          </span>
                        ) : (
                          <button
                            disabled={downloadingRowKey === rowKeyStr}
                            onClick={async (e) => {
                              e.stopPropagation();
                              setDownloadingRowKey(rowKeyStr);
                              try {
                                onSyncSingleRowToPod && await onSyncSingleRowToPod({
                                  serverId: pod.id,
                                  serverName: pod.name,
                                  pkColumn,
                                  pkValue: pkVal
                                });
                              } finally {
                                setDownloadingRowKey(null);
                              }
                            }}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-500/20 hover:bg-amber-500/30 text-red-300 hover:text-amber-300 border border-red-500/30 hover:border-amber-500/40 text-[10px] font-bold font-sans transition-all cursor-pointer hover:scale-105 disabled:opacity-50"
                            title={`Klik untuk mengunduh 1 baris ini dari Master ke ${pod.name}`}
                          >
                            {downloadingRowKey === rowKeyStr ? (
                              <>
                                <Loader2 size={11} className="animate-spin text-amber-400" />
                                <span>Mengunduh...</span>
                              </>
                            ) : (
                              <>
                                <Zap size={11} className="fill-amber-400 text-amber-400" />
                                <span>Download</span>
                              </>
                            )}
                          </button>
                        )}
                      </td>

                      {/* Data Value Preview */}
                      <td
                        className="p-3 text-slate-300 font-sans cursor-pointer group hover:bg-purple-950/20 transition-colors"
                        onClick={(e) => {
                          e.stopPropagation();
                          setInspectingRow({
                            rowKey: item.rowKey,
                            sampleData: item.sampleData,
                            isPresent,
                            pkVal,
                            rowKeyStr
                          });
                        }}
                        title="Klik untuk melihat keseluruhan data baris ini secara lengkap"
                      >
                        <div className="flex items-center justify-between gap-2 max-w-[420px]">
                          <span className="truncate font-mono text-[11px] text-slate-400 group-hover:text-cyan-300 transition-colors">
                            {item.sampleData ? JSON.stringify(item.sampleData) : '-'}
                          </span>
                          <button
                            type="button"
                            className="shrink-0 px-2 py-0.5 rounded-lg bg-slate-800/80 group-hover:bg-purple-600/30 text-slate-400 group-hover:text-purple-300 border border-slate-700/60 group-hover:border-purple-500/40 transition-all flex items-center gap-1 text-[10px] font-sans font-semibold cursor-pointer"
                          >
                            <Eye size={11} />
                            <span className="hidden sm:inline">Detail</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* SUB-TAB 2: Columns DDL Status in This POD */}
      {activeSubTab === 'columns' && (
        <div className="overflow-x-auto rounded-2xl border border-slate-800 max-h-80 overflow-y-auto shadow-inner bg-slate-950/70">
          <table className="w-full text-left text-xs border-collapse font-mono">
            <thead>
              <tr className="bg-slate-900/95 border-b border-slate-800 text-slate-400 sticky top-0 z-10 font-sans">
                <th className="p-3 font-bold">Nama Kolom Master</th>
                <th className="p-3 font-bold">Tipe Data Master</th>
                <th className="p-3 font-semibold text-center w-36">Status di {pod.name}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50 text-[11px]">
              {columnsMatrix.map((col, idx) => {
                const presence = col.presence?.[pod.id];
                const exists = presence?.exists;
                const typeMatch = presence?.typeMatch;

                return (
                  <tr key={idx} className="hover:bg-white/[0.02] transition-colors">
                    <td className="p-3 font-bold text-cyan-300">{col.columnName}</td>
                    <td className="p-3 text-purple-300">{col.dataType}</td>
                    <td className="p-3 text-center font-sans">
                      {exists ? (
                        typeMatch ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold">
                            <CheckCircle2 size={12} /> Kolom Cocok
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] font-bold">
                            Tipe Beda: {presence.podType}
                          </span>
                        )
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-500/20 text-red-300 border border-red-500/30 text-[10px] font-bold">
                          Kolom Missing
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Full Row Data Inspection Modal with Portal to avoid any stacking context or footer overlap */}
      {inspectingRow && typeof document !== 'undefined' && createPortal(
        <div
          className="fixed inset-0 z-[99999] bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-150"
          onClick={() => setInspectingRow(null)}
        >
          <div
            className="bg-slate-900 border border-slate-800 rounded-3xl max-w-3xl w-full max-h-[85vh] flex flex-col shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between p-5 border-b border-slate-800 bg-slate-950/50 shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-purple-500/15 border border-purple-500/30 text-purple-400">
                  <Database size={18} />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="text-base font-bold text-white">Detail Lengkap Data Baris</h4>
                    {inspectingRow.isPresent ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold">
                        <CheckCircle2 size={11} /> Ada di {pod.name}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30 text-[10px] font-bold">
                        <AlertTriangle size={11} /> Belum Ada di {pod.name}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-1.5 font-mono">
                    <span>Key:</span>
                    <strong className="text-cyan-300">{inspectingRow.rowKey}</strong>
                    <span className="text-slate-600">&bull;</span>
                    <span>Tabel:</span>
                    <strong className="text-white">{masterInfo?.tableName}</strong>
                  </p>
                </div>
              </div>

              <button
                onClick={() => setInspectingRow(null)}
                className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
                title="Tutup"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Sub-header Toolbar */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 border-b border-slate-800 bg-slate-900/50 shrink-0">
              <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
                <button
                  onClick={() => setModalTab('table')}
                  className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1.5 ${modalTab === 'table'
                      ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                      : 'text-slate-400 hover:text-white'
                    }`}
                >
                  <Table size={13} />
                  <span>Tabel Kolom ({Object.keys(inspectingRow.sampleData || {}).length})</span>
                </button>
                <button
                  onClick={() => setModalTab('json')}
                  className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1.5 ${modalTab === 'json'
                      ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                      : 'text-slate-400 hover:text-white'
                    }`}
                >
                  <Code size={13} />
                  <span>Format JSON</span>
                </button>
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                {modalTab === 'table' && (
                  <div className="relative flex-1 sm:w-56">
                    <Search size={12} className="absolute left-2.5 top-2.5 text-slate-500" />
                    <input
                      type="text"
                      value={modalSearch}
                      onChange={(e) => setModalSearch(e.target.value)}
                      placeholder="Cari kolom / nilai..."
                      className="w-full pl-7 pr-3 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 font-mono"
                    />
                  </div>
                )}
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(JSON.stringify(inspectingRow.sampleData || {}, null, 2));
                    setCopiedModalJson(true);
                    setTimeout(() => setCopiedModalJson(false), 2000);
                  }}
                  className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all"
                  title="Salin seluruh data JSON ke clipboard"
                >
                  {copiedModalJson ? (
                    <>
                      <Check size={13} className="text-emerald-400" />
                      <span className="text-emerald-400">Tersalin!</span>
                    </>
                  ) : (
                    <>
                      <Copy size={13} />
                      <span>Salin JSON</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-5 overflow-y-auto flex-1 min-h-0">
              {modalTab === 'table' ? (
                <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-950/70">
                  <table className="w-full text-left text-xs border-collapse font-mono">
                    <thead>
                      <tr className="bg-slate-900/90 border-b border-slate-800 text-slate-400 font-sans sticky top-0 z-10">
                        <th className="p-3 font-bold w-48">Nama Kolom</th>
                        <th className="p-3 font-bold">Nilai Data</th>
                        <th className="p-3 text-center w-16">Salin</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/50 text-[11px]">
                      {Object.entries(inspectingRow.sampleData || {})
                        .filter(([colKey, colVal]) => {
                          if (!modalSearch.trim()) return true;
                          const q = modalSearch.toLowerCase().trim();
                          return colKey.toLowerCase().includes(q) || String(colVal || '').toLowerCase().includes(q);
                        })
                        .map(([colKey, colVal], fIdx) => (
                          <tr key={fIdx} className="hover:bg-slate-800/30 transition-colors">
                            <td className="p-3 font-bold text-cyan-300 align-top whitespace-nowrap">
                              {colKey}
                            </td>
                            <td className="p-3 text-slate-200 break-all select-text font-mono">
                              {colVal === null ? (
                                <span className="text-slate-500 italic">null</span>
                              ) : colVal === undefined ? (
                                <span className="text-slate-600 italic">undefined</span>
                              ) : typeof colVal === 'object' ? (
                                <pre className="text-purple-300 bg-slate-900/80 p-2 rounded-lg border border-slate-800 overflow-x-auto whitespace-pre-wrap">
                                  {JSON.stringify(colVal, null, 2)}
                                </pre>
                              ) : (
                                String(colVal)
                              )}
                            </td>
                            <td className="p-3 text-center align-top">
                              <button
                                onClick={() => handleCopy(String(colVal ?? ''), `modal_col_${fIdx}`)}
                                className="p-1 rounded-lg text-slate-500 hover:text-cyan-300 hover:bg-slate-800 transition-colors cursor-pointer"
                                title="Salin nilai kolom ini"
                              >
                                {copiedKey === `modal_col_${fIdx}` ? (
                                  <Check size={12} className="text-emerald-400" />
                                ) : (
                                  <Copy size={12} />
                                )}
                              </button>
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="relative">
                  <pre className="p-4 bg-slate-950 rounded-2xl border border-slate-800 font-mono text-xs text-purple-300 overflow-auto whitespace-pre-wrap leading-relaxed select-text shadow-inner max-h-[420px]">
                    {JSON.stringify(inspectingRow.sampleData || {}, null, 2)}
                  </pre>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-between p-4 border-t border-slate-800 bg-slate-950/50 shrink-0">
              <div>
                {!inspectingRow.isPresent && onSyncSingleRowToPod && (
                  <button
                    disabled={downloadingRowKey === inspectingRow.rowKeyStr}
                    onClick={async () => {
                      setDownloadingRowKey(inspectingRow.rowKeyStr);
                      try {
                        await onSyncSingleRowToPod({
                          serverId: pod.id,
                          serverName: pod.name,
                          pkColumn,
                          pkValue: inspectingRow.pkVal
                        });
                        setInspectingRow(prev => prev ? { ...prev, isPresent: true } : null);
                      } finally {
                        setDownloadingRowKey(null);
                      }
                    }}
                    className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-md shadow-amber-500/20 transition-all hover:scale-105 disabled:opacity-50"
                  >
                    {downloadingRowKey === inspectingRow.rowKeyStr ? (
                      <>
                        <Loader2 size={13} className="animate-spin text-white" />
                        <span>Mengirim ke {pod.name}...</span>
                      </>
                    ) : (
                      <>
                        <Zap size={13} className="fill-white" />
                        <span>Kirim Baris Ini ke {pod.name}</span>
                      </>
                    )}
                  </button>
                )}
              </div>

              <button
                onClick={() => setInspectingRow(null)}
                className="px-4 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold cursor-pointer transition-colors"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
