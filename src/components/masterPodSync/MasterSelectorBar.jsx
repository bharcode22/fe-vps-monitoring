import React from 'react';
import { Database, Table, RefreshCw, Layers } from 'lucide-react';

export default function MasterSelectorBar({
  masterDatabases = [],
  selectedMasterId,
  onSelectMaster,
  tables = [],
  selectedTable,
  onSelectTable,
  isLoadingTables,
  onCompare,
  isComparing
}) {
  return (
    <div className="bg-slate-900/90 border border-cyan-500/30 rounded-2xl p-4 shadow-xl backdrop-blur-xl flex flex-wrap items-center justify-between gap-4">
      <div className="flex flex-wrap items-center gap-4 flex-1">
        {/* 1. Master DB Dropdown */}
        <div className="flex flex-col gap-1 min-w-[240px]">
          <label className="text-[11px] font-bold text-cyan-400 uppercase tracking-wider flex items-center gap-1.5">
            <Database size={13} />
            <span>1. Database Master (Template Source):</span>
          </label>
          <select
            value={selectedMasterId || ''}
            onChange={(e) => onSelectMaster(e.target.value)}
            className="bg-slate-950 border border-cyan-500/40 text-white text-xs rounded-xl px-3 py-2 outline-none focus:border-cyan-400 font-semibold cursor-pointer shadow-inner"
          >
            <option value="">-- Pilih Database Master --</option>
            {masterDatabases.map((db) => (
              <option key={db.id} value={db.id}>
                {db.name} ({db.db_name})
              </option>
            ))}
          </select>
        </div>

        {/* 2. Table Dropdown from Master DB */}
        <div className="flex flex-col gap-1 min-w-[280px]">
          <label className="text-[11px] font-bold text-purple-400 uppercase tracking-wider flex items-center gap-1.5">
            <Table size={13} />
            <span>2. Tabel Master yang Ingin Diaudit:</span>
          </label>
          <select
            disabled={!selectedMasterId || isLoadingTables || tables.length === 0}
            value={selectedTable || ''}
            onChange={(e) => onSelectTable(e.target.value)}
            className="bg-slate-950 border border-purple-500/40 text-purple-300 text-xs rounded-xl px-3 py-2 outline-none focus:border-purple-400 font-semibold cursor-pointer shadow-inner disabled:opacity-50"
          >
            <option value="">
              {isLoadingTables
                ? 'Memuat tabel master...'
                : tables.length === 0
                ? '-- Pilih Master DB Dulu --'
                : '-- Pilih Tabel Master --'}
            </option>
            {tables.map((t) => (
              <option key={t.tableName} value={t.tableName}>
                {t.tableName} ({t.rowCount} baris, {t.columnCount} kolom)
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* 3. Action Compare Button */}
      <div className="flex items-center gap-2.5">
        <button
          onClick={onCompare}
          disabled={!selectedMasterId || !selectedTable || isComparing}
          className="bg-gradient-to-r from-cyan-400 to-blue-500 hover:from-cyan-300 hover:to-blue-400 disabled:opacity-50 text-slate-950 px-5 py-2.5 rounded-xl font-extrabold text-xs flex items-center gap-2 shadow-lg shadow-cyan-500/20 cursor-pointer transition-all hover:scale-105"
        >
          <Layers size={15} className={isComparing ? 'animate-spin' : ''} />
          <span>{isComparing ? 'Menganalisis Matriks...' : 'Bandingkan Matriks POD'}</span>
        </button>
      </div>
    </div>
  );
}
