import React, { useState, useMemo } from 'react';
import {
  Database,
  Search,
  Table,
  RefreshCw,
  Layers,
  ChevronRight,
  Sparkles,
  CheckCircle2,
  HardDrive,
  Link,
  ShieldCheck,
  GitFork,
  SlidersHorizontal,
  LayoutGrid,
  Network
} from 'lucide-react';
import DatabaseSchemaGraphView from './DatabaseSchemaGraphView';

export default function MasterTablesCatalogView({
  masterDatabases = [],
  selectedMasterId,
  onSelectMaster,
  tables = [],
  isLoadingTables,
  onRefreshTables,
  onSelectTableForDetail
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [relationFilter, setRelationFilter] = useState('all'); // 'all' | 'standalone' | 'parent' | 'child'
  const [displayMode, setDisplayMode] = useState(() => {
    try {
      return localStorage.getItem('masterPodSync_displayMode') || 'cards';
    } catch (e) {
      return 'cards';
    }
  });

  const handleSetDisplayMode = (mode) => {
    setDisplayMode(mode);
    try {
      localStorage.setItem('masterPodSync_displayMode', mode);
    } catch (e) { }
  };

  // Filter tables by search query and relation type
  const filteredTables = useMemo(() => {
    return tables.filter(t => {
      // 1. Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesName = t.tableName.toLowerCase().includes(q);
        const matchesParent = (t.parents || []).some(p => p.foreignTableName.toLowerCase().includes(q));
        const matchesChild = (t.children || []).some(c => c.tableName.toLowerCase().includes(q));
        if (!matchesName && !matchesParent && !matchesChild) return false;
      }

      // 2. Relation Filter
      if (relationFilter === 'standalone') return t.relationType === 'standalone';
      if (relationFilter === 'parent') return (t.children || []).length > 0;
      if (relationFilter === 'child') return (t.parents || []).length > 0;

      return true;
    });
  }, [tables, searchQuery, relationFilter]);

  const standaloneCount = tables.filter(t => t.relationType === 'standalone').length;
  const parentCount = tables.filter(t => (t.children || []).length > 0).length;
  const childCount = tables.filter(t => (t.parents || []).length > 0).length;
  const connectedCount = tables.filter(t => (t.parents || []).length > 0 || (t.children || []).length > 0).length;

  const selectedMaster = masterDatabases.find(d => String(d.id) === String(selectedMasterId));

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-200">
      {/* 1. Header Toolbar: Master DB Selector, Display Mode, Search Bar & Relation Filter */}
      <div className="glass-card p-5 sm:p-6 rounded-3xl border border-cyan-500/30 bg-slate-900/70 shadow-2xl backdrop-blur-xl">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          <div className="flex-1 min-w-0 max-w-2xl">
            <h2 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
              <Database size={18} className="text-cyan-400 shrink-0" />
              <span>Katalog Tabel Master ({tables.length} Tabel Terdaftar)</span>
            </h2>
            <p className="text-xs text-slate-400 mt-1 leading-relaxed">
              Pilih tabel dari database master di bawah untuk membuka workspace komparasi data, atau aktifkan <strong className="text-purple-300">Diagram Garis Relasi (ER Graph)</strong> untuk melihat hubungan Foreign Key secara visual.
            </p>
          </div>

          {/* Master DB Selector, Mode Switcher & Refresh */}
          <div className="flex items-center justify-start sm:justify-end gap-2.5 w-full lg:w-auto flex-wrap lg:ml-auto shrink-0">
            {/* View Mode Switcher: Cards vs Graph */}
            <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 shadow-inner">
              <button
                onClick={() => handleSetDisplayMode('cards')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${displayMode === 'cards'
                  ? 'bg-cyan-500/25 text-cyan-300 border border-cyan-500/40 shadow-sm'
                  : 'text-slate-400 hover:text-white'
                  }`}
                title="Tampilan Katalog Kartu"
              >
                <LayoutGrid size={13} />
                <span>Kartu</span>
              </button>

              <button
                onClick={() => handleSetDisplayMode('graph')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${displayMode === 'graph'
                  ? 'bg-purple-500/25 text-purple-300 border border-purple-500/40 shadow-sm'
                  : 'text-slate-400 hover:text-white'
                  }`}
                title="Tampilan Diagram Garis Relasi ER"
              >
                <Network size={13} className="text-purple-400" />
                <span>Diagram Relasi ({connectedCount})</span>
              </button>
            </div>

            {/* Master DB Selector */}
            <div className="flex items-center gap-2 bg-slate-950 px-3 py-1.5 rounded-xl border border-cyan-500/30 shadow-inner">
              <span className="text-[11px] font-bold text-cyan-400 uppercase">Master:</span>
              <select
                value={selectedMasterId || ''}
                onChange={(e) => onSelectMaster(e.target.value)}
                className="bg-transparent text-white text-xs font-bold outline-none cursor-pointer"
              >
                {masterDatabases.map((db) => (
                  <option key={db.id} value={db.id} className="bg-slate-900 text-white">
                    {db.name} ({db.db_name})
                  </option>
                ))}
              </select>
            </div>

            <button
              onClick={onRefreshTables}
              disabled={isLoadingTables}
              className="p-2 bg-slate-800 hover:bg-slate-700 text-cyan-400 rounded-xl border border-slate-700 cursor-pointer transition-colors disabled:opacity-50 shadow-md hover:scale-105"
              title="Muat Ulang Tabel Master"
            >
              <RefreshCw size={15} className={isLoadingTables ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>

        {/* Search Bar & Filter (Visible in Cards Mode) */}
        {displayMode === 'cards' && (
          <>
            <div className="mt-4 pt-4 border-t border-slate-800/80 flex items-center justify-between gap-4 flex-wrap">
              <div className="relative flex-1 max-w-md">
                <Search size={14} className="absolute left-3.5 top-3 text-slate-500" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Cari nama tabel atau tabel relasi (misal: pod_topics, users)..."
                  className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-cyan-500 font-mono"
                />
              </div>

              <div className="text-xs text-slate-400 flex items-center gap-2">
                <span className="bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-800 font-mono text-[11px] text-cyan-300">
                  {filteredTables.length} dari {tables.length} tabel cocok
                </span>
              </div>
            </div>

            {/* Relation Filter Pills */}
            <div className="flex items-center gap-2 mt-3 pt-3 border-t border-slate-800/60 flex-wrap">
              <span className="text-[11px] text-slate-400 font-bold mr-1 flex items-center gap-1">
                <SlidersHorizontal size={12} /> Filter Relasi:
              </span>
              {[
                { id: 'all', label: `Semua Tabel (${tables.length})`, icon: Table },
                { id: 'standalone', label: `🛡️ Mandiri / Standalone (${standaloneCount})`, icon: ShieldCheck },
                { id: 'parent', label: `👑 Tabel Induk / Dirujuk (${parentCount})`, icon: GitFork },
                { id: 'child', label: `🔗 Tabel Anak / Memiliki FK (${childCount})`, icon: Link }
              ].map(filter => {
                const isSelected = relationFilter === filter.id;
                return (
                  <button
                    key={filter.id}
                    onClick={() => setRelationFilter(filter.id)}
                    className={`px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 border ${isSelected
                      ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40 shadow-sm'
                      : 'bg-slate-950/80 text-slate-400 border-slate-800 hover:text-slate-200 hover:bg-slate-900'
                      }`}
                  >
                    <span>{filter.label}</span>
                  </button>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* 2. MAIN DISPLAY CONTENT: Cards Grid or Interactive Schema Graph */}
      {displayMode === 'graph' ? (
        <DatabaseSchemaGraphView
          tables={tables}
          masterInfo={selectedMaster}
          onSelectTableForDetail={onSelectTableForDetail}
        />
      ) : (
        /* Cards Grid View */
        isLoadingTables ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
              <div
                key={n}
                className="p-5 rounded-3xl bg-slate-900/40 border border-slate-800 animate-pulse h-44 flex flex-col justify-between"
              >
                <div className="h-4 w-32 bg-slate-800 rounded"></div>
                <div className="h-3 w-20 bg-slate-800/60 rounded"></div>
              </div>
            ))}
          </div>
        ) : filteredTables.length === 0 ? (
          <div className="p-12 text-center bg-slate-900/60 border border-slate-800 rounded-3xl text-slate-500 text-xs flex flex-col items-center gap-2">
            <Table size={32} className="text-slate-600" />
            <span>Tidak ada tabel master yang cocok dengan filter atau kata kunci "{searchQuery}".</span>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {filteredTables.map((tbl) => {
              const hasParents = (tbl.parents || []).length > 0;
              const hasChildren = (tbl.children || []).length > 0;

              return (
                <div
                  key={tbl.tableName}
                  onClick={() => onSelectTableForDetail(tbl.tableName)}
                  className="group p-5 rounded-3xl bg-slate-900/70 hover:bg-slate-900/95 border border-slate-800 hover:border-cyan-500/50 transition-all duration-200 cursor-pointer shadow-lg hover:shadow-cyan-500/10 flex flex-col justify-between hover:scale-[1.02]"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <span className="p-2 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 group-hover:bg-cyan-500/25 group-hover:border-cyan-500/40 transition-colors">
                        <Table size={16} />
                      </span>
                      <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-slate-950 text-slate-400 border border-slate-800">
                        {tbl.columnCount} Kolom
                      </span>
                    </div>

                    <h3 className="text-sm font-bold text-white group-hover:text-cyan-300 transition-colors truncate font-mono" title={tbl.tableName}>
                      {tbl.tableName}
                    </h3>
                    <p className="text-[11px] text-slate-400 mt-1 flex items-center gap-1.5">
                      <span className="font-mono font-bold text-cyan-400">{tbl.rowCount}</span> baris data di Master
                    </p>

                    {/* Relasi Badges & Information */}
                    <div className="mt-3 flex flex-col gap-1 text-[10px] font-sans">
                      {hasParents && (
                        <div className="bg-purple-950/40 border border-purple-500/30 text-purple-300 px-2 py-1 rounded-xl truncate" title={`Induk: ${tbl.parents.map(p => p.foreignTableName).join(', ')}`}>
                          <span className="font-bold flex items-center gap-1">
                            <Link size={10} className="shrink-0" />
                            <span>Induk ({tbl.parents.length}):</span>
                            <span className="font-mono text-purple-200">{tbl.parents.map(p => p.foreignTableName).join(', ')}</span>
                          </span>
                        </div>
                      )}

                      {hasChildren && (
                        <div className="bg-emerald-950/40 border border-emerald-500/30 text-emerald-300 px-2 py-1 rounded-xl truncate" title={`Dirujuk oleh: ${tbl.children.map(c => c.tableName).join(', ')}`}>
                          <span className="font-bold flex items-center gap-1">
                            <GitFork size={10} className="shrink-0" />
                            <span>Dirujuk {tbl.children.length} Tabel Anak</span>
                          </span>
                        </div>
                      )}

                      {!hasParents && !hasChildren && (
                        <div className="bg-slate-950 text-slate-400 border border-slate-800/80 px-2 py-0.5 rounded-lg w-fit">
                          <span>🛡️ Mandiri (Standalone)</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px] font-bold text-cyan-400/80 group-hover:text-cyan-300 transition-colors">
                    <span>Buka Detail &amp; Cek di POD</span>
                    <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              );
            })}
          </div>
        )
      )}
    </div>
  );
}
