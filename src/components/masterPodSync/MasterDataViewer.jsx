import React, { useState, useMemo } from 'react';
import { Database, Search, ChevronDown, ChevronUp, Key, Layers, Table, Trash2, Zap } from 'lucide-react';

export default function MasterDataViewer({
  masterInfo,
  columns = [],
  rows = [],
  onDeleteRow,
  onSyncSingleRow
}) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('rows'); // 'rows' | 'columns'

  const pkColumn = masterInfo?.pkColumn || columns.find(c => c.isPk)?.columnName || columns[0]?.columnName || 'id';

  // Filter rows by search
  const filteredRows = useMemo(() => {
    if (!searchQuery.trim()) return rows;
    const q = searchQuery.toLowerCase().trim();
    return rows.filter(r => {
      return Object.values(r).some(val =>
        String(val || '').toLowerCase().includes(q)
      );
    });
  }, [rows, searchQuery]);

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
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <span>Data di Database Master:</span>
              <span className="font-mono text-cyan-300">public.{masterInfo?.tableName}</span>
            </h3>
            <p className="text-[11px] text-slate-400">
              {masterInfo?.rowCount || 0} baris data acuan &bull; {masterInfo?.columnCount || 0} kolom skema
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
          {/* Controls: Search & Sub-tabs */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setActiveTab('rows')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  activeTab === 'rows'
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                    : 'text-slate-400 hover:text-white bg-slate-950/60 border border-slate-800'
                }`}
              >
                Data Baris Master ({rows.length})
              </button>

              <button
                onClick={() => setActiveTab('columns')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  activeTab === 'columns'
                    ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                    : 'text-slate-400 hover:text-white bg-slate-950/60 border border-slate-800'
                }`}
              >
                Skema Kolom DDL ({columns.length})
              </button>
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

          {/* TAB 1: Data Rows Table */}
          {activeTab === 'rows' && (
            <div className="overflow-x-auto rounded-2xl border border-slate-800 max-h-72 overflow-y-auto shadow-inner bg-slate-950/70">
              <table className="w-full text-left text-xs border-collapse font-mono">
                <thead>
                  <tr className="bg-slate-900/95 border-b border-slate-800 text-slate-400 sticky top-0 z-10 font-sans">
                    <th className="p-2.5 font-bold w-20 text-center">Aksi</th>
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
                      <td colSpan={(columns.length || 1) + 1} className="p-6 text-center text-slate-500 font-sans">
                        Tidak ada data yang cocok dengan pencarian.
                      </td>
                    </tr>
                  ) : (
                    filteredRows.map((row, idx) => {
                      const pkVal = row[pkColumn] !== undefined ? row[pkColumn] : Object.values(row)[0];
                      return (
                        <tr key={idx} className="hover:bg-white/[0.02] transition-colors">
                          <td className="p-2.5 text-center whitespace-nowrap">
                            <div className="flex items-center justify-center gap-1">
                              <button
                                onClick={() => onSyncSingleRow && onSyncSingleRow({
                                  pkColumn,
                                  pkValue: pkVal,
                                  rowData: row
                                })}
                                className="p-1 rounded-lg text-amber-400 hover:text-amber-300 hover:bg-amber-500/20 transition-colors cursor-pointer"
                                title="Sinkronkan baris ini ke POD"
                              >
                                <Zap size={13} className="fill-amber-400" />
                              </button>
                              <button
                                onClick={() => onDeleteRow && onDeleteRow({
                                  pkColumn,
                                  pkValue: pkVal
                                })}
                                className="p-1 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/15 transition-colors cursor-pointer"
                                title="Hapus baris ini dari Database Master"
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
                          </td>
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
