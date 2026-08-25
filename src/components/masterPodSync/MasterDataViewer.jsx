import React, { useState, useMemo } from 'react';
import {
  Database,
  Search,
  ChevronDown,
  ChevronUp,
  Key,
  Layers,
  Table,
  Trash2,
  Zap,
  ArrowUpCircle,
  Sparkles,
  Server,
  UploadCloud,
  CheckSquare,
  Square,
  MinusSquare,
  X
} from 'lucide-react';

export default function MasterDataViewer({
  masterInfo,
  columns = [],
  dataMatrix = [],
  rows = [],
  onDeleteRow,
  onDeleteMultipleRows,
  onDeletePodRow,
  onDeleteMultiplePodRows,
  onSyncSingleRow,
  onSyncSinglePodRowToMaster
}) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('rows'); // 'rows' | 'columns'
  const [rowSourceFilter, setRowSourceFilter] = useState('all'); // 'all' | 'master_only' | 'pod_only'
  const [selectedKeys, setSelectedKeys] = useState(new Set());

  const pkColumn = masterInfo?.pkColumn || columns.find(c => c.isPk)?.columnName || columns[0]?.columnName || 'id';

  // Combine rows from dataMatrix if available, otherwise fallback to rows
  const combinedRows = useMemo(() => {
    if (dataMatrix && dataMatrix.length > 0) {
      return dataMatrix.map(item => ({
        ...item.sampleData,
        __inMaster: item.inMaster,
        __isPodOnly: item.isPodOnly,
        __originPodId: item.originPodId,
        __originPodName: item.originPodName,
        __podSources: item.podSources || [],
        __rowKey: item.rowKey
      }));
    }
    return rows.map(r => ({ ...r, __inMaster: true, __isPodOnly: false }));
  }, [dataMatrix, rows]);

  const masterRowsCount = useMemo(() => combinedRows.filter(r => r.__inMaster).length, [combinedRows]);
  const podOnlyRowsCount = useMemo(() => combinedRows.filter(r => r.__isPodOnly).length, [combinedRows]);

  // Filter rows by search and source filter
  const filteredRows = useMemo(() => {
    return combinedRows.filter(r => {
      if (rowSourceFilter === 'master_only' && !r.__inMaster) return false;
      if (rowSourceFilter === 'pod_only' && !r.__isPodOnly) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        return Object.values(r).some(val =>
          String(val || '').toLowerCase().includes(q)
        );
      }

      return true;
    });
  }, [combinedRows, rowSourceFilter, searchQuery]);

  // Automatically prune selectedKeys if rows are deleted / removed from dataMatrix
  React.useEffect(() => {
    setSelectedKeys(prev => {
      if (!prev || prev.size === 0) return prev;
      const existingKeys = new Set(
        combinedRows.map(r => String(r[pkColumn] !== undefined ? r[pkColumn] : r.__rowKey))
      );
      const next = new Set();
      for (const key of prev) {
        if (existingKeys.has(key)) {
          next.add(key);
        }
      }
      return next.size === prev.size ? prev : next;
    });
  }, [combinedRows, pkColumn]);

  // Reset selectedKeys when table changes
  React.useEffect(() => {
    setSelectedKeys(new Set());
  }, [masterInfo?.tableName, masterInfo?.id]);

  // Selected rows metadata
  const selectedRowsList = useMemo(() => {
    if (selectedKeys.size === 0) return [];
    return combinedRows.filter(r => {
      const key = r[pkColumn] !== undefined ? String(r[pkColumn]) : r.__rowKey;
      return selectedKeys.has(key);
    });
  }, [combinedRows, selectedKeys, pkColumn]);

  const allSelectedArePodOnly = selectedRowsList.length > 0 && selectedRowsList.every(r => r.__isPodOnly);
  const firstPodSource = selectedRowsList.find(r => r.__originPodId);
  const targetPodId = firstPodSource?.__originPodId;
  const targetPodName = firstPodSource?.__originPodName || firstPodSource?.__podSources?.[0] || 'POD';

  // Selection handlers
  const toggleSelectRow = (key) => {
    const next = new Set(selectedKeys);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    setSelectedKeys(next);
  };

  const isAllFilteredSelected = filteredRows.length > 0 && filteredRows.every(r => {
    const key = r[pkColumn] !== undefined ? String(r[pkColumn]) : r.__rowKey;
    return selectedKeys.has(key);
  });

  const isSomeFilteredSelected = filteredRows.some(r => {
    const key = r[pkColumn] !== undefined ? String(r[pkColumn]) : r.__rowKey;
    return selectedKeys.has(key);
  });

  const toggleSelectAllFiltered = () => {
    if (isAllFilteredSelected) {
      const next = new Set(selectedKeys);
      filteredRows.forEach(r => {
        const key = r[pkColumn] !== undefined ? String(r[pkColumn]) : r.__rowKey;
        next.delete(key);
      });
      setSelectedKeys(next);
    } else {
      const next = new Set(selectedKeys);
      filteredRows.forEach(r => {
        const key = r[pkColumn] !== undefined ? String(r[pkColumn]) : r.__rowKey;
        next.add(key);
      });
      setSelectedKeys(next);
    }
  };

  const clearSelection = () => setSelectedKeys(new Set());

  // Handle Bulk Delete for selected rows
  const handleBulkDelete = () => {
    if (selectedKeys.size === 0) return;
    const pkValues = Array.from(selectedKeys);

    if (allSelectedArePodOnly || rowSourceFilter === 'pod_only') {
      // 🚀 TARGET IS POD!
      if (onDeleteMultiplePodRows) {
        onDeleteMultiplePodRows({
          serverId: targetPodId,
          serverName: targetPodName,
          pkColumn,
          pkValues
        });
      } else if (onDeletePodRow) {
        onDeletePodRow({
          serverId: targetPodId,
          serverName: targetPodName,
          pkColumn,
          pkValues
        });
      }
    } else {
      // 🚀 TARGET IS MASTER!
      if (onDeleteMultipleRows) {
        onDeleteMultipleRows({
          targetType: 'master',
          targetName: masterInfo?.name || 'Master DB',
          pkColumn,
          pkValues
        });
      } else if (onDeleteRow) {
        onDeleteRow({
          pkColumn,
          pkValues
        });
      }
    }
    // Optimistically clear selection so floating bar disappears immediately upon initiating delete
    clearSelection();
  };

  return (
    <div className="bg-slate-900/80 border border-cyan-500/30 rounded-3xl p-5 sm:p-6 shadow-xl backdrop-blur-xl transition-all">
      {/* Header Bar */}
      <div
        className="flex items-center justify-between cursor-pointer pb-3 border-b border-slate-800"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-cyan-500/15 border border-cyan-500/30 text-cyan-400">
            <Database size={16} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2 flex-wrap">
              <span>Data di Database Master:</span>
              <span className="font-mono text-cyan-300">public.{masterInfo?.tableName}</span>
              {podOnlyRowsCount > 0 && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/40 flex items-center gap-1">
                  <Sparkles size={11} className="text-purple-400" />
                  <span>{podOnlyRowsCount} Baris Baru di POD (Siap Ditarik)</span>
                </span>
              )}
            </h3>
            <p className="text-[11px] text-slate-400">
              {masterInfo?.rowCount || 0} baris data di Master &bull; {masterInfo?.columnCount || 0} kolom skema
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400 font-semibold hidden sm:inline">
            {isExpanded ? 'Sembunyikan' : 'Tampilkan Data Master'}
          </span>
          <button className="p-1 rounded-lg bg-slate-800 text-slate-400 hover:text-white transition-colors">
            {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
        </div>
      </div>

      {isExpanded && (
        <div className="mt-4 flex flex-col gap-4 animate-in fade-in duration-200">
          {/* Controls: Search & Source Tabs */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 flex-wrap">
              {/* Sub-Tab: Data Rows vs Schema Columns */}
              <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
                <button
                  onClick={() => setActiveTab('rows')}
                  className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${activeTab === 'rows'
                      ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                      : 'text-slate-400 hover:text-white'
                    }`}
                >
                  Data Baris ({combinedRows.length})
                </button>

                <button
                  onClick={() => setActiveTab('columns')}
                  className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${activeTab === 'columns'
                      ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                      : 'text-slate-400 hover:text-white'
                    }`}
                >
                  Skema Kolom DDL ({columns.length})
                </button>
              </div>

              {/* Row Source Filter Pills (Semua, Ada di Master, Belum Ada di Master) */}
              {activeTab === 'rows' && (
                <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
                  <button
                    onClick={() => setRowSourceFilter('all')}
                    className={`px-2.5 py-1 rounded-lg font-semibold transition-all cursor-pointer ${rowSourceFilter === 'all'
                        ? 'bg-slate-800 text-white'
                        : 'text-slate-400 hover:text-slate-200'
                      }`}
                  >
                    Semua ({combinedRows.length})
                  </button>
                  <button
                    onClick={() => setRowSourceFilter('master_only')}
                    className={`px-2.5 py-1 rounded-lg font-semibold transition-all cursor-pointer ${rowSourceFilter === 'master_only'
                        ? 'bg-cyan-500/25 text-cyan-300 border border-cyan-500/40'
                        : 'text-slate-400 hover:text-cyan-300'
                      }`}
                  >
                    Ada di Master ({masterRowsCount})
                  </button>
                  {podOnlyRowsCount > 0 && (
                    <button
                      onClick={() => setRowSourceFilter('pod_only')}
                      className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1 ${rowSourceFilter === 'pod_only'
                          ? 'bg-purple-500/30 text-purple-200 border border-purple-500/50 shadow-sm'
                          : 'text-purple-300 hover:text-white'
                        }`}
                    >
                      <Sparkles size={12} className="text-purple-400" />
                      <span>Belum di Master ({podOnlyRowsCount})</span>
                    </button>
                  )}
                </div>
              )}
            </div>

            {activeTab === 'rows' && (
              <div className="relative w-full sm:w-64">
                <Search size={13} className="absolute left-3 top-2.5 text-slate-500" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Cari dalam data master..."
                  className="w-full pl-8 pr-3 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-cyan-500"
                />
              </div>
            )}
          </div>

          {/* Floating Bulk Action Bar for Selected Rows */}
          {activeTab === 'rows' && selectedKeys.size > 0 && (
            <div className={`p-3 bg-gradient-to-r from-slate-900 to-slate-950 border rounded-2xl flex items-center justify-between gap-3 shadow-2xl animate-in slide-in-from-top-2 duration-200 ${allSelectedArePodOnly ? 'border-purple-500/50' : 'border-red-500/40'
              }`}>
              <div className="flex items-center gap-2 text-xs">
                <span className={`w-2.5 h-2.5 rounded-full animate-ping ${allSelectedArePodOnly ? 'bg-purple-500' : 'bg-red-500'}`} />
                <span className="font-bold text-white">
                  <strong className={`${allSelectedArePodOnly ? 'text-purple-400' : 'text-red-400'} font-mono text-sm`}>{selectedKeys.size}</strong> baris data {allSelectedArePodOnly ? `di unit ${targetPodName}` : 'di Master'} dipilih
                </span>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                {/* Pull to Master for POD-only selected rows */}
                {allSelectedArePodOnly && onSyncSinglePodRowToMaster && (
                  <button
                    onClick={() => {
                      selectedRowsList.forEach(r => {
                        const pkVal = r[pkColumn] !== undefined ? r[pkColumn] : r.__rowKey;
                        onSyncSinglePodRowToMaster({
                          serverId: r.__originPodId || targetPodId,
                          serverName: r.__originPodName || targetPodName,
                          pkColumn,
                          pkValue: pkVal
                        });
                      });
                      clearSelection();
                    }}
                    className="px-3 py-1.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-lg shadow-purple-600/30 transition-all cursor-pointer hover:scale-105"
                  >
                    <ArrowUpCircle size={13} />
                    <span>Tarik Terpilih ke Master ({selectedKeys.size})</span>
                  </button>
                )}

                <button
                  onClick={handleBulkDelete}
                  className="px-3 py-1.5 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-lg shadow-red-600/30 transition-all cursor-pointer hover:scale-105"
                >
                  <Trash2 size={13} />
                  <span>Hard Delete di {allSelectedArePodOnly ? targetPodName : 'Master'} ({selectedKeys.size})</span>
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

          {/* TAB 1: Data Rows Table */}
          {activeTab === 'rows' && (
            <div className="overflow-x-auto rounded-2xl border border-slate-800 max-h-80 overflow-y-auto shadow-inner bg-slate-950/70">
              <table className="w-full text-left text-xs border-collapse font-mono">
                <thead>
                  <tr className="bg-slate-900/95 border-b border-slate-800 text-slate-400 sticky top-0 z-10 font-sans">
                    {/* Select All Checkbox */}
                    <th className="p-2.5 text-center w-10">
                      <button
                        onClick={toggleSelectAllFiltered}
                        className="text-slate-400 hover:text-white cursor-pointer"
                        title={isAllFilteredSelected ? "Batalkan Semua" : "Pilih Semua"}
                      >
                        {isAllFilteredSelected ? (
                          <CheckSquare size={15} className="text-cyan-400" />
                        ) : isSomeFilteredSelected ? (
                          <MinusSquare size={15} className="text-cyan-400" />
                        ) : (
                          <Square size={15} />
                        )}
                      </button>
                    </th>
                    <th className="p-2.5 font-bold w-28 text-center">Aksi</th>
                    <th className="p-2.5 font-bold text-center w-28">Status Keberadaan</th>
                    {columns.map((col) => (
                      <th key={col.columnName} className="p-2.5 font-bold whitespace-nowrap font-mono">
                        <div className="flex items-center gap-1">
                          {col.isPk && <Key size={12} className="text-amber-400" title="Primary Key" />}
                          <span className={col.isPk ? 'text-cyan-300' : 'text-slate-300'}>{col.columnName}</span>
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50 text-[11px]">
                  {filteredRows.length === 0 ? (
                    <tr>
                      <td colSpan={(columns.length || 1) + 3} className="p-6 text-center text-slate-500 font-sans">
                        Tidak ada data yang cocok dengan filter atau pencarian.
                      </td>
                    </tr>
                  ) : (
                    filteredRows.map((row, idx) => {
                      const pkVal = row[pkColumn] !== undefined ? row[pkColumn] : row.__rowKey || Object.values(row)[0];
                      const rowKeyStr = String(pkVal);
                      const isPodOnly = row.__isPodOnly;
                      const isSelected = selectedKeys.has(rowKeyStr);

                      return (
                        <tr
                          key={idx}
                          className={`hover:bg-white/[0.02] transition-colors ${isSelected
                              ? 'bg-cyan-500/10 border-l-2 border-cyan-400'
                              : isPodOnly
                                ? 'bg-purple-950/20 border-l-2 border-purple-500'
                                : ''
                            }`}
                        >
                          {/* Row Checkbox */}
                          <td className="p-2.5 text-center">
                            <button
                              onClick={() => toggleSelectRow(rowKeyStr)}
                              className="text-slate-400 hover:text-white cursor-pointer"
                            >
                              {isSelected ? (
                                <CheckSquare size={14} className="text-cyan-400" />
                              ) : (
                                <Square size={14} />
                              )}
                            </button>
                          </td>

                          {/* Action Column */}
                          <td className="p-2.5 text-center whitespace-nowrap">
                            <div className="flex items-center justify-center gap-1">
                              {isPodOnly ? (
                                <div className="flex items-center gap-1">
                                  {/* Button to Pull POD row into Master */}
                                  <button
                                    onClick={() => onSyncSinglePodRowToMaster && onSyncSinglePodRowToMaster({
                                      serverId: row.__originPodId,
                                      serverName: row.__originPodName,
                                      pkColumn,
                                      pkValue: pkVal
                                    })}
                                    className="px-2 py-1 rounded-lg bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-[10px] font-bold flex items-center gap-1 shadow-sm transition-all cursor-pointer hover:scale-105"
                                    title={`Tarik baris ini dari ${row.__originPodName || 'POD'} dan simpan ke Master DB`}
                                  >
                                    <ArrowUpCircle size={12} />
                                    <span>Tarik ke Master</span>
                                  </button>

                                  {/* Button to Delete this row from POD */}
                                  <button
                                    onClick={() => onDeletePodRow && onDeletePodRow({
                                      serverId: row.__originPodId,
                                      serverName: row.__originPodName,
                                      pkColumn,
                                      pkValue: pkVal
                                    })}
                                    className="p-1 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/15 transition-colors cursor-pointer"
                                    title={`Hapus baris data ini dari unit ${row.__originPodName || 'POD'}`}
                                  >
                                    <Trash2 size={13} />
                                  </button>
                                </div>
                              ) : (
                                <>
                                  {/* Button to Push Master row into POD */}
                                  <button
                                    onClick={() => onSyncSingleRow && onSyncSingleRow({
                                      pkColumn,
                                      pkValue: pkVal,
                                      rowData: row
                                    })}
                                    className="p-1 rounded-lg text-amber-400 hover:text-amber-300 hover:bg-amber-500/20 transition-colors cursor-pointer"
                                    title="Kirim/Sinkronkan baris ini ke POD"
                                  >
                                    <Zap size={13} className="fill-amber-400" />
                                  </button>
                                  <button
                                    onClick={() => onDeleteRow && onDeleteRow({
                                      pkColumn,
                                      pkValue: pkVal
                                    })}
                                    className="p-1 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/15 transition-colors cursor-pointer"
                                    title="Hapus baris ini dari Database Master (Cascade)"
                                  >
                                    <Trash2 size={13} />
                                  </button>
                                </>
                              )}
                            </div>
                          </td>

                          {/* Status Badge Column */}
                          <td className="p-2.5 text-center whitespace-nowrap font-sans">
                            {isPodOnly ? (
                              <span
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/40 text-[9px] font-bold"
                                title={`Ditemukan di: ${row.__podSources?.join(', ')}`}
                              >
                                <Sparkles size={10} className="text-purple-400" />
                                <span>Hanya di POD</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 text-[9px] font-bold">
                                <span>Master</span>
                              </span>
                            )}
                          </td>

                          {/* Data Columns */}
                          {columns.map((col) => (
                            <td key={col.columnName} className="p-2.5 whitespace-nowrap text-slate-300 font-mono">
                              {row[col.columnName] !== null && row[col.columnName] !== undefined
                                ? String(row[col.columnName])
                                : <span className="text-slate-600 italic">null</span>}
                            </td>
                          ))}
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* TAB 2: Columns DDL Schema */}
          {activeTab === 'columns' && (
            <div className="overflow-x-auto rounded-2xl border border-slate-800 max-h-72 overflow-y-auto shadow-inner bg-slate-950/70">
              <table className="w-full text-left text-xs border-collapse font-mono">
                <thead>
                  <tr className="bg-slate-900/95 border-b border-slate-800 text-slate-400 sticky top-0 z-10 font-sans">
                    <th className="p-2.5 font-bold">Nama Kolom</th>
                    <th className="p-2.5 font-bold">Tipe Data</th>
                    <th className="p-2.5 font-bold">Nullable</th>
                    <th className="p-2.5 font-bold">Atribut</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50 text-[11px]">
                  {columns.map((col) => (
                    <tr key={col.columnName} className="hover:bg-white/[0.02] transition-colors">
                      <td className="p-2.5 font-bold text-cyan-300">
                        {col.columnName}
                      </td>
                      <td className="p-2.5 text-purple-300">
                        {col.dataType}
                      </td>
                      <td className="p-2.5 text-slate-400 font-sans">
                        {col.isNullable === 'YES' ? 'Nullable' : 'NOT NULL'}
                      </td>
                      <td className="p-2.5 font-sans">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {col.isPk && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                              PRIMARY KEY
                            </span>
                          )}
                          {col.foreignTable && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30 font-mono" title={`Merujuk ke public.${col.foreignTable}.${col.foreignColumn}`}>
                              🔗 FK ➔ {col.foreignTable}.{col.foreignColumn}
                            </span>
                          )}
                          {!col.isPk && !col.foreignTable && '-'}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
