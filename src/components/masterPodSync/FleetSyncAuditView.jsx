import React, { useState, useMemo } from 'react';
import {
  Database,
  Search,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Activity,
  ArrowRight,
  Filter,
  Layers,
  Server,
  ShieldCheck,
  ChevronRight,
  ChevronDown,
  TrendingUp,
  DownloadCloud,
  CheckSquare,
  Square,
  Sparkles,
  ExternalLink,
  Loader2,
  GitFork,
  Link,
  HelpCircle,
  Zap,
  Info
} from 'lucide-react';

import { FleetAuditSkeleton } from './MasterPodSkeleton';

export default function FleetSyncAuditView({
  masterInfo,
  auditData,
  isLoading,
  onRefreshAudit,
  onOpenTableWorkspace
}) {
  const [filterType, setFilterType] = useState('all'); // 'all' | 'discrepant' | 'missing' | 'synced'
  const [relationFilter, setRelationFilter] = useState('all'); // 'all' | 'need_parent_first' | 'ready_to_sync' | 'parent' | 'child' | 'standalone'
  const [selectedPodFilter, setSelectedPodFilter] = useState('all'); // 'all' | podId
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('delta_desc'); // 'delta_desc' | 'name_asc' | 'sync_asc'
  const [expandedTable, setExpandedTable] = useState(null); // tableName for expandable relational tree

  const summary = auditData?.summary || {
    totalTables: 0,
    syncedTables: 0,
    discrepantTables: 0,
    missingTables: 0,
    totalDeltaRows: 0,
    fleetSyncPercentage: 0,
    onlinePodsCount: 0,
    totalPodsCount: 0
  };

  const tables = auditData?.tables || [];

  // Table lookup map for fast relational status resolution
  const tableMap = useMemo(() => {
    const map = new Map();
    tables.forEach(t => map.set(t.tableName, t));
    return map;
  }, [tables]);

  // Enrich tables with relational hierarchy intelligence
  const enrichedTables = useMemo(() => {
    return tables.map(tbl => {
      // 1. Resolve Parents
      const parentsWithStatus = (tbl.parents || []).map(p => {
        const parentTbl = tableMap.get(p.foreignTableName);
        return {
          tableName: p.foreignTableName,
          columnName: p.columnName,
          foreignColumnName: p.foreignColumnName,
          isAllSynced: parentTbl ? parentTbl.isAllSynced : true,
          tableExists: parentTbl ? !parentTbl.hasMissingTables : true,
          syncPercentage: parentTbl?.syncPercentage || 100,
          tableDeltaRows: parentTbl?.tableDeltaRows || 0,
          masterRowCount: parentTbl?.masterRowCount || 0
        };
      });

      // 2. Resolve Children
      const childrenWithStatus = (tbl.children || []).map(c => {
        const childTbl = tableMap.get(c.tableName);
        return {
          tableName: c.tableName,
          columnName: c.columnName,
          foreignColumnName: c.foreignColumnName,
          isAllSynced: childTbl ? childTbl.isAllSynced : true,
          tableExists: childTbl ? !childTbl.hasMissingTables : true,
          syncPercentage: childTbl?.syncPercentage || 100,
          tableDeltaRows: childTbl?.tableDeltaRows || 0,
          masterRowCount: childTbl?.masterRowCount || 0
        };
      });

      const unsyncedParents = parentsWithStatus.filter(p => !p.isAllSynced || !p.tableExists);
      const unsyncedChildren = childrenWithStatus.filter(c => !c.isAllSynced || !c.tableExists);

      // Relational sync readiness determination
      let fkReadiness = 'standalone'; // 'standalone' | 'ready_to_sync' | 'need_parent_first' | 'synced_with_child_discrepancy'
      if (tbl.relationType === 'standalone') {
        fkReadiness = 'standalone';
      } else if (!tbl.isAllSynced) {
        if (unsyncedParents.length > 0) {
          fkReadiness = 'need_parent_first';
        } else {
          fkReadiness = 'ready_to_sync';
        }
      } else {
        if (unsyncedChildren.length > 0) {
          fkReadiness = 'synced_with_child_discrepancy';
        } else {
          fkReadiness = 'fully_synced';
        }
      }

      return {
        ...tbl,
        parentsWithStatus,
        childrenWithStatus,
        unsyncedParents,
        unsyncedChildren,
        fkReadiness
      };
    });
  }, [tables, tableMap]);

  // Extract unique POD list from first table breakdown
  const availablePods = useMemo(() => {
    if (tables.length === 0) return [];
    return tables[0]?.podBreakdown || [];
  }, [tables]);

  // Relational summary counts
  const relationalStats = useMemo(() => {
    let needParentFirstCount = 0;
    let readyToSyncCount = 0;
    let parentRolesCount = 0;
    let childRolesCount = 0;

    enrichedTables.forEach(t => {
      if (t.fkReadiness === 'need_parent_first') needParentFirstCount++;
      if (t.fkReadiness === 'ready_to_sync') readyToSyncCount++;
      if (t.parentsWithStatus.length === 0 && t.childrenWithStatus.length > 0) parentRolesCount++;
      if (t.parentsWithStatus.length > 0) childRolesCount++;
    });

    return { needParentFirstCount, readyToSyncCount, parentRolesCount, childRolesCount };
  }, [enrichedTables]);

  // Filter and sort tables
  const filteredTables = useMemo(() => {
    return enrichedTables
      .filter(t => {
        // Status filter
        if (filterType === 'discrepant' && (t.isAllSynced || t.hasMissingTables)) return false;
        if (filterType === 'missing' && !t.hasMissingTables) return false;
        if (filterType === 'synced' && !t.isAllSynced) return false;

        // Relational hierarchy filter
        if (relationFilter === 'need_parent_first' && t.fkReadiness !== 'need_parent_first') return false;
        if (relationFilter === 'ready_to_sync' && t.fkReadiness !== 'ready_to_sync') return false;
        if (relationFilter === 'parent' && (t.parentsWithStatus.length > 0 || t.childrenWithStatus.length === 0)) return false;
        if (relationFilter === 'child' && t.parentsWithStatus.length === 0) return false;
        if (relationFilter === 'standalone' && (t.parentsWithStatus.length > 0 || t.childrenWithStatus.length > 0)) return false;

        // Specific POD filter
        if (selectedPodFilter !== 'all') {
          const podIdNum = Number(selectedPodFilter);
          const podInfo = t.podBreakdown?.find(p => p.podId === podIdNum);
          if (!podInfo) return false;
          if (filterType === 'discrepant' && podInfo.isSynced) return false;
          if (filterType === 'missing' && podInfo.tableExists) return false;
          if (filterType === 'synced' && !podInfo.isSynced) return false;
        }

        // Search query
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase().trim();
          const nameMatch = t.tableName.toLowerCase().includes(q);
          const parentMatch = t.parentsWithStatus.some(p => p.tableName.toLowerCase().includes(q));
          const childMatch = t.childrenWithStatus.some(c => c.tableName.toLowerCase().includes(q));
          const podMatch = t.podBreakdown?.some(p =>
            !p.isSynced && p.podName.toLowerCase().includes(q)
          );
          if (!nameMatch && !parentMatch && !childMatch && !podMatch) return false;
        }

        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'delta_desc') return b.tableDeltaRows - a.tableDeltaRows;
        if (sortBy === 'sync_asc') return a.syncPercentage - b.syncPercentage;
        if (sortBy === 'name_asc') return a.tableName.localeCompare(b.tableName);
        return 0;
      });
  }, [enrichedTables, filterType, relationFilter, selectedPodFilter, searchQuery, sortBy]);

  // Show animated shimmer skeleton on scan / reload (MUST BE AFTER ALL HOOKS)
  if (isLoading) {
    return <FleetAuditSkeleton />;
  }

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-300">
      {/* 1. Top KPI Summary Dashboard with Relational Guidance */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
        {/* KPI 1: Total Tables */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between shadow-lg relative overflow-hidden backdrop-blur-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">Total Tabel Dipantau</span>
            <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              <Database size={16} />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-2xl font-black text-white font-mono tracking-tight">{summary.totalTables}</span>
            <span className="text-[11px] font-bold text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded-full border border-cyan-500/20">
              {summary.fleetSyncPercentage}% Armada Selaras
            </span>
          </div>
        </div>

        {/* KPI 2: FK Need Parent First Warning */}
        <div
          onClick={() => {
            setRelationFilter('need_parent_first');
            setFilterType('all');
          }}
          className={`bg-slate-900/80 border rounded-2xl p-4 flex flex-col justify-between shadow-lg relative overflow-hidden backdrop-blur-md cursor-pointer transition-all hover:scale-[1.02] ${relationFilter === 'need_parent_first'
            ? 'border-red-500/60 ring-2 ring-red-500/20 bg-red-950/20'
            : 'border-slate-800 hover:border-red-500/40'
            }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">Tunda: Induk Belum Sinkron</span>
            <div className="p-2 rounded-xl bg-red-500/10 text-red-400 border border-red-500/20">
              <GitFork size={16} />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-2xl font-black text-red-400 font-mono tracking-tight">{relationalStats.needParentFirstCount}</span>
            <span className="text-[10px] font-bold text-red-300 bg-red-500/20 px-2 py-0.5 rounded-full border border-red-500/30">
              Sinkron Induk Dulu!
            </span>
          </div>
        </div>

        {/* KPI 3: FK Ready to Sync */}
        <div
          onClick={() => {
            setRelationFilter('ready_to_sync');
            setFilterType('all');
          }}
          className={`bg-slate-900/80 border rounded-2xl p-4 flex flex-col justify-between shadow-lg relative overflow-hidden backdrop-blur-md cursor-pointer transition-all hover:scale-[1.02] ${relationFilter === 'ready_to_sync'
            ? 'border-amber-500/60 ring-2 ring-amber-500/20 bg-amber-950/20'
            : 'border-slate-800 hover:border-amber-500/40'
            }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">Siap Sinkron (Induk Aman)</span>
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <Zap size={16} />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-2xl font-black text-amber-400 font-mono tracking-tight">{relationalStats.readyToSyncCount}</span>
            <span className="text-[10px] font-bold text-amber-300 bg-amber-500/20 px-2 py-0.5 rounded-full border border-amber-500/30">
              Bisa Langsung Sinkron
            </span>
          </div>
        </div>

        {/* KPI 4: 100% Fully Synced Tables */}
        <div
          onClick={() => {
            setFilterType('synced');
            setRelationFilter('all');
          }}
          className={`bg-slate-900/80 border rounded-2xl p-4 flex flex-col justify-between shadow-lg relative overflow-hidden backdrop-blur-md cursor-pointer transition-all hover:scale-[1.02] ${filterType === 'synced' && relationFilter === 'all'
            ? 'border-emerald-500/60 ring-2 ring-emerald-500/20 bg-emerald-950/20'
            : 'border-slate-800 hover:border-emerald-500/40'
            }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">100% Selaras (Semua POD)</span>
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <CheckCircle2 size={16} />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-2xl font-black text-emerald-400 font-mono tracking-tight">{summary.syncedTables}</span>
            <span className="text-[10px] text-slate-400">Tabel Sempurna</span>
          </div>
        </div>

        {/* KPI 5: Total Row Delta */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between shadow-lg relative overflow-hidden backdrop-blur-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">Total Akumulasi Selisih</span>
            <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
              <Activity size={16} />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-2xl font-black text-purple-300 font-mono tracking-tight">
              {summary.totalDeltaRows.toLocaleString()}
            </span>
            <span className="text-[10px] text-slate-400">Baris Data</span>
          </div>
        </div>
      </div>

      {/* 2. Controls, Filter Pills & Scan Button */}
      <div className="p-4 bg-slate-900/90 border border-slate-800 rounded-2xl shadow-xl flex flex-col gap-3.5">
        {/* Row A: Status & Relational Filter Pills */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Relational Hierarchy Filters */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-xs font-bold text-slate-400 mr-1 flex items-center gap-1">
              <Layers size={13} className="text-cyan-400" /> Hirarki FK:
            </span>

            <button
              onClick={() => setRelationFilter('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${relationFilter === 'all'
                ? 'bg-slate-800 text-white border border-slate-700 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 bg-slate-950/60'
                }`}
            >
              Semua Hirarki ({summary.totalTables})
            </button>

            <button
              onClick={() => setRelationFilter('need_parent_first')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${relationFilter === 'need_parent_first'
                ? 'bg-red-500/25 text-red-300 border border-red-500/40 shadow-sm'
                : 'text-slate-400 hover:text-red-300 bg-slate-950/60'
                }`}
              title="Tabel yang ada selisih, tetapi tabel Induknya juga belum selaras (Jangan sinkron tabel ini sebelum Induknya beres!)"
            >
              <GitFork size={13} className="text-red-400" />
              <span>⚠️ Butuh Sinkron Induk Dulu ({relationalStats.needParentFirstCount})</span>
            </button>

            <button
              onClick={() => setRelationFilter('ready_to_sync')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${relationFilter === 'ready_to_sync'
                ? 'bg-amber-500/25 text-amber-300 border border-amber-500/40 shadow-sm'
                : 'text-slate-400 hover:text-amber-300 bg-slate-950/60'
                }`}
              title="Tabel yang ada selisih, dan semua tabel induknya sudah 100% selaras (Aman untuk langsung disinkronkan)"
            >
              <Zap size={13} className="text-amber-400" />
              <span>⚡ Siap Sinkron Sekarang ({relationalStats.readyToSyncCount})</span>
            </button>

            <button
              onClick={() => setRelationFilter('parent')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${relationFilter === 'parent'
                ? 'bg-purple-500/25 text-purple-300 border border-purple-500/40 shadow-sm'
                : 'text-slate-400 hover:text-purple-300 bg-slate-950/60'
                }`}
              title="Tabel Master / Induk Utama yang menjadi rujukan tabel-tabel anak"
            >
              <span>👑 Tabel Induk Master ({relationalStats.parentRolesCount})</span>
            </button>

            <button
              onClick={() => setRelationFilter('child')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${relationFilter === 'child'
                ? 'bg-cyan-500/25 text-cyan-300 border border-cyan-500/40 shadow-sm'
                : 'text-slate-400 hover:text-cyan-300 bg-slate-950/60'
                }`}
              title="Tabel Transaksi / Anak yang merujuk ke tabel induk"
            >
              <span>🔗 Tabel Anak / Turunan ({relationalStats.childRolesCount})</span>
            </button>
          </div>

          {/* Scan Ulang Armada Button */}
          <button
            disabled={isLoading}
            onClick={onRefreshAudit}
            className="px-4 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-lg shadow-cyan-600/20 transition-all cursor-pointer hover:scale-105 disabled:opacity-50"
            title="Scan ulang seluruh 95 tabel di semua POD menggunakan metadata paralel super cepat (< 1.5 detik)"
          >
            <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
            <span>{isLoading ? 'Memindai Armada...' : 'Scan Ulang Seluruh 95 Tabel'}</span>
          </button>
        </div>

        {/* Row B: Secondary Filter Bar: POD Selector, Search, Sort & Status */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-800/80">
          <div className="flex items-center gap-2 flex-wrap text-xs">
            {/* Status Pills */}
            <div className="flex items-center gap-1 mr-2">
              <span className="text-slate-400 font-semibold mr-1">Status:</span>
              <button
                onClick={() => setFilterType('all')}
                className={`px-2 py-1 rounded-lg text-xs font-medium transition-colors ${filterType === 'all' ? 'bg-slate-800 text-white font-bold' : 'text-slate-400'}`}
              >
                Semua
              </button>
              <button
                onClick={() => setFilterType('discrepant')}
                className={`px-2 py-1 rounded-lg text-xs font-medium transition-colors ${filterType === 'discrepant' ? 'bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30' : 'text-slate-400'}`}
              >
                Ada Selisih ({summary.discrepantTables})
              </button>
              <button
                onClick={() => setFilterType('synced')}
                className={`px-2 py-1 rounded-lg text-xs font-medium transition-colors ${filterType === 'synced' ? 'bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30' : 'text-slate-400'}`}
              >
                100% Selaras ({summary.syncedTables})
              </button>
            </div>

            <span className="text-slate-400 font-semibold flex items-center gap-1">
              <Filter size={13} className="text-slate-400" /> POD:
            </span>
            <select
              value={selectedPodFilter}
              onChange={(e) => setSelectedPodFilter(e.target.value)}
              className="bg-slate-950 border border-slate-800 text-slate-200 text-xs rounded-xl px-2.5 py-1.5 focus:outline-none focus:border-cyan-500 font-mono"
            >
              <option value="all">Semua Unit POD ({summary.onlinePodsCount} Online)</option>
              {availablePods.map(pod => (
                <option key={pod.podId} value={pod.podId}>
                  {pod.podName} {pod.isOnline ? '(Online)' : '(Offline)'}
                </option>
              ))}
            </select>

            <span className="text-slate-400 font-semibold ml-2">Urutan:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="bg-slate-950 border border-slate-800 text-slate-200 text-xs rounded-xl px-2.5 py-1.5 focus:outline-none focus:border-cyan-500"
            >
              <option value="delta_desc">Selisih Terbanyak (Delta Terbesar)</option>
              <option value="sync_asc">Persentase Terendah</option>
              <option value="name_asc">Nama Tabel (A - Z)</option>
            </select>
          </div>

          <div className="relative flex-1 sm:max-w-xs">
            <Search size={14} className="absolute left-3 top-2.5 text-slate-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari tabel atau tabel relasi..."
              className="w-full pl-8 pr-3 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 font-mono"
            />
          </div>
        </div>
      </div>

      {/* 3. Discrepancy Table Matrix with Relational Intelligence */}
      <div className="overflow-x-auto rounded-2xl border border-slate-800 shadow-2xl bg-slate-950/80">
        <table className="w-full text-left text-xs border-collapse font-sans">
          <thead>
            <tr className="bg-slate-900/95 border-b border-slate-800 text-slate-400 sticky top-0 z-10 text-[11px] uppercase tracking-wider font-semibold">
              <th className="p-3.5 w-12 text-center">No</th>
              <th className="p-3.5 font-bold">Nama Tabel &amp; Relasi FK</th>
              <th className="p-3.5 text-center w-32">Status Relasi &amp; Panduan</th>
              <th className="p-3.5 text-center w-28">Baris Master</th>
              <th className="p-3.5 text-center w-40">Status Armada</th>
              <th className="p-3.5">Rincian Selisih di POD</th>
              <th className="p-3.5 text-center w-36">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 font-mono text-xs">
            {filteredTables.length === 0 ? (
              <tr>
                <td colSpan={7} className="p-12 text-center text-slate-400">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <CheckCircle2 size={32} className="text-emerald-400 animate-pulse" />
                    <span className="text-sm font-bold text-slate-200">Tidak ada tabel dengan kriteria ini.</span>
                    <span className="text-xs text-slate-500">Semua tabel terpilih sudah 100% selaras atau sesuai filter hirarki.</span>
                  </div>
                </td>
              </tr>
            ) : (
              filteredTables.map((tbl, idx) => {
                const discrepantPods = tbl.podBreakdown?.filter(p => !p.isSynced && p.isOnline) || [];
                const isExpanded = expandedTable === tbl.tableName;
                const hasFkChain = tbl.parentsWithStatus.length > 0 || tbl.childrenWithStatus.length > 0;

                return (
                  <React.Fragment key={tbl.tableName}>
                    <tr
                      className={`hover:bg-slate-800/40 transition-colors ${!tbl.isAllSynced ? 'bg-amber-500/[0.02]' : ''
                        } ${isExpanded ? 'bg-slate-800/60' : ''}`}
                    >
                      {/* Number */}
                      <td className="p-3.5 text-center text-slate-500 font-sans text-xs">
                        {idx + 1}
                      </td>

                      {/* Table Name & FK Relational badges */}
                      <td className="p-3.5">
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-2">
                            <span
                              className="font-bold text-cyan-300 text-sm hover:underline cursor-pointer flex items-center gap-1.5"
                              onClick={() => onOpenTableWorkspace(tbl.tableName)}
                            >
                              <span>{tbl.tableName}</span>
                            </span>
                            <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-400 border border-slate-700 font-mono">
                              {tbl.columnCount} Kolom
                            </span>

                            {hasFkChain && (
                              <button
                                type="button"
                                onClick={() => setExpandedTable(isExpanded ? null : tbl.tableName)}
                                className={`text-[10px] px-2 py-0.5 rounded-lg border font-bold flex items-center gap-1 transition-all cursor-pointer ${isExpanded
                                  ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
                                  : 'bg-slate-900 text-slate-400 hover:text-white border-slate-700'
                                  }`}
                                title="Lihat rincian relasi Foreign Key tabel Induk & Anak"
                              >
                                <Layers size={11} className={isExpanded ? 'text-cyan-400' : 'text-slate-500'} />
                                <span>Relasi FK ({tbl.parentsWithStatus.length} Induk, {tbl.childrenWithStatus.length} Anak)</span>
                                {isExpanded ? <ChevronDown size={11} /> : <ChevronRight size={11} />}
                              </button>
                            )}
                          </div>

                          {/* Role Tag */}
                          <div className="flex items-center gap-1.5 text-[10px] font-sans">
                            {tbl.parentsWithStatus.length === 0 && tbl.childrenWithStatus.length > 0 && (
                              <span className="text-purple-300 font-bold px-1.5 py-0.2 rounded bg-purple-500/15 border border-purple-500/30">
                                👑 Tabel Induk Master
                              </span>
                            )}
                            {tbl.parentsWithStatus.length > 0 && (
                              <span className="text-cyan-300 font-bold px-1.5 py-0.2 rounded bg-cyan-500/15 border border-cyan-500/30">
                                🔗 Tabel Anak / Transaksi
                              </span>
                            )}
                            {!hasFkChain && (
                              <span className="text-slate-500 px-1.5 py-0.2 rounded bg-slate-800/50">
                                Tabel Mandiri
                              </span>
                            )}
                            {tbl.isPartitioned && (
                              <span className="px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 font-bold">
                                Partisi Armada
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* FK Smart Status & Sync Order Guidance */}
                      <td className="p-3.5 text-center font-sans">
                        {tbl.fkReadiness === 'need_parent_first' && (
                          <div className="inline-flex flex-col items-center gap-1 p-2 rounded-xl bg-red-500/15 border border-red-500/30 text-red-300 text-left">
                            <span className="text-[11px] font-bold flex items-center gap-1 text-red-400">
                              <GitFork size={12} className="shrink-0" />
                              Tunda Sinkronisasi
                            </span>
                            <span className="text-[10px] text-red-300 leading-tight">
                              Sinkronkan Induk dulu: <strong className="text-amber-300 underline cursor-pointer" onClick={() => onOpenTableWorkspace(tbl.unsyncedParents[0]?.tableName)}>
                                {tbl.unsyncedParents.map(p => p.tableName).join(', ')}
                              </strong>
                            </span>
                          </div>
                        )}

                        {tbl.fkReadiness === 'ready_to_sync' && (
                          <div className="inline-flex flex-col items-center gap-0.5 p-1.5 px-2.5 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-300">
                            <span className="text-[11px] font-bold flex items-center gap-1 text-amber-400">
                              <Zap size={12} className="fill-amber-400" />
                              Siap Sinkron
                            </span>
                            <span className="text-[10px] text-slate-400">
                              {tbl.parentsWithStatus.length > 0 ? 'Induk 100% Selaras' : 'Tabel Induk Utama'}
                            </span>
                          </div>
                        )}

                        {tbl.fkReadiness === 'synced_with_child_discrepancy' && (
                          <div className="inline-flex flex-col items-center gap-0.5 p-1.5 px-2.5 rounded-xl bg-purple-500/15 border border-purple-500/30 text-purple-300">
                            <span className="text-[11px] font-bold flex items-center gap-1 text-emerald-400">
                              <CheckCircle2 size={12} />
                              Induk Selaras
                            </span>
                            <span className="text-[10px] text-purple-300">
                              {tbl.unsyncedChildren.length} Tabel Anak Selisih
                            </span>
                          </div>
                        )}

                        {(tbl.fkReadiness === 'fully_synced' || (tbl.fkReadiness === 'standalone' && tbl.isAllSynced)) && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[11px] font-bold">
                            <CheckCircle2 size={12} />
                            100% Selaras
                          </span>
                        )}

                        {tbl.fkReadiness === 'standalone' && !tbl.isAllSynced && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[11px] font-bold">
                            <AlertTriangle size={12} />
                            Ada Selisih
                          </span>
                        )}
                      </td>

                      {/* Master Row Count */}
                      <td className="p-3.5 text-center font-bold text-slate-200">
                        {tbl.masterRowCount.toLocaleString()}
                      </td>

                      {/* Fleet Sync Status & Progress */}
                      <td className="p-3.5 text-center font-sans">
                        <div className="flex flex-col gap-1.5 items-center">
                          <div className="flex items-center justify-between w-full text-[11px] font-bold">
                            <span className={tbl.isAllSynced ? 'text-emerald-400' : 'text-amber-400'}>
                              {tbl.syncedPodsCount} / {tbl.onlinePodsCount} POD
                            </span>
                            <span className="font-mono text-slate-400">{tbl.syncPercentage}%</span>
                          </div>

                          {/* Visual Progress Bar */}
                          <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all duration-500 ${tbl.isAllSynced
                                ? 'bg-emerald-400 shadow-sm shadow-emerald-400/50'
                                : tbl.syncPercentage > 50
                                  ? 'bg-amber-400'
                                  : 'bg-red-400'
                                }`}
                              style={{ width: `${tbl.syncPercentage}%` }}
                            />
                          </div>
                        </div>
                      </td>

                      {/* Discrepant PODs Breakdown List */}
                      <td className="p-3.5 font-sans">
                        {tbl.isAllSynced ? (
                          <div className="flex items-center gap-1.5 text-emerald-400 font-semibold text-xs">
                            <CheckCircle2 size={14} />
                            <span>Seluruh {tbl.onlinePodsCount} POD 100% Selaras ({tbl.masterRowCount.toLocaleString()} baris)</span>
                          </div>
                        ) : (
                          <div className="flex flex-wrap items-center gap-1.5 max-w-xl">
                            {discrepantPods.map(pod => {
                              if (pod.status === 'missing_table') {
                                return (
                                  <span
                                    key={pod.podId}
                                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-red-500/20 text-red-300 border border-red-500/40 text-[11px] font-bold font-mono"
                                    title={`Tabel belum dibuat pada database ${pod.podName}`}
                                  >
                                    <XCircle size={11} className="text-red-400" />
                                    <span>{pod.podName}: Missing DDL</span>
                                  </span>
                                );
                              }

                              if (pod.delta < 0) {
                                return (
                                  <span
                                    key={pod.podId}
                                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[11px] font-bold font-mono"
                                    title={`${pod.podName} memiliki ${pod.podRowCount} baris (kurang ${Math.abs(pod.delta)} baris dari Master)`}
                                  >
                                    <AlertTriangle size={11} className="text-amber-400" />
                                    <span>{pod.podName}: {pod.delta} baris</span>
                                  </span>
                                );
                              }

                              return (
                                <span
                                  key={pod.podId}
                                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-purple-500/20 text-purple-300 border border-purple-500/40 text-[11px] font-bold font-mono"
                                  title={`${pod.podName} memiliki ${pod.podRowCount} baris (ada ${pod.delta} baris baru yang belum di-upload ke Master)`}
                                >
                                  <Sparkles size={11} className="text-purple-400" />
                                  <span>{pod.podName}: +{pod.delta} baru</span>
                                </span>
                              );
                            })}
                          </div>
                        )}
                      </td>

                      {/* Action Column */}
                      <td className="p-3.5 text-center font-sans">
                        <div className="flex items-center justify-center">
                          <button
                            onClick={() => onOpenTableWorkspace(tbl.tableName)}
                            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-cyan-300 hover:text-white rounded-xl text-xs font-bold flex items-center gap-1.5 border border-slate-700 transition-all cursor-pointer hover:scale-105 shadow-sm"
                            title={`Buka Workspace detail komparasi baris data tabel '${tbl.tableName}'`}
                          >
                            <ExternalLink size={13} />
                            <span>Buka Workspace</span>
                          </button>
                        </div>
                      </td>
                    </tr>

                    {/* Expandable Relational Tree Drawer */}
                    {isExpanded && (
                      <tr className="bg-slate-900/90 border-b border-cyan-500/30">
                        <td colSpan={7} className="p-4">
                          <div className="bg-slate-950 p-4 rounded-2xl border border-cyan-500/20 flex flex-col gap-4 font-sans text-xs">
                            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                              <span className="font-bold text-white flex items-center gap-2 text-sm">
                                <GitFork size={15} className="text-cyan-400" />
                                <span>Peta Relasi Foreign Key &amp; Urutan Aman untuk: <strong className="text-cyan-300 font-mono">public.{tbl.tableName}</strong></span>
                              </span>
                              <span className="text-[11px] text-slate-400">
                                Total {tbl.parentsWithStatus.length} Tabel Induk &bull; {tbl.childrenWithStatus.length} Tabel Anak
                              </span>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
                              {/* 1. Parent Dependencies Column (Many-to-One) */}
                              <div className="p-3.5 rounded-2xl bg-amber-500/[0.04] border border-amber-500/30 flex flex-col gap-2">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className="px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 font-extrabold text-[9px] border border-amber-500/40">
                                    MANY-TO-ONE (N : 1)
                                  </span>
                                  <span className="font-bold text-amber-400 text-xs">
                                    👑 Tabel Induk ({tbl.parentsWithStatus.length})
                                  </span>
                                </div>
                                <span className="text-[10px] text-slate-400">
                                  Banyak baris di <strong>{tbl.tableName}</strong> (N) merujuk ke 1 baris induk (1). Data induk HARUS ada terlebih dahulu:
                                </span>

                                {tbl.parentsWithStatus.length === 0 ? (
                                  <span className="text-slate-500 text-[11px] italic mt-1">Tidak memiliki relasi ke tabel induk.</span>
                                ) : (
                                  <div className="flex flex-col gap-2 mt-1">
                                    {tbl.parentsWithStatus.map(p => (
                                      <div
                                        key={p.tableName}
                                        className={`p-2.5 rounded-xl border flex items-center justify-between transition-colors ${p.isAllSynced
                                          ? 'bg-emerald-950/20 border-emerald-500/30 text-emerald-200'
                                          : 'bg-red-950/30 border-red-500/40 text-red-200'
                                          }`}
                                      >
                                        <div className="flex flex-col gap-0.5">
                                          <div className="flex items-center gap-1.5">
                                            <span className="font-bold font-mono text-white text-xs">{p.tableName}</span>
                                            <span className="text-[9px] px-1 rounded bg-slate-800 text-slate-400 font-mono">
                                              {p.masterRowCount?.toLocaleString() || 0} baris
                                            </span>
                                          </div>
                                          <div className="flex items-center gap-1 text-[9px] text-slate-400 font-mono">
                                            <span className="text-cyan-300">{tbl.tableName}.{p.columnName}</span>
                                            <span className="text-amber-400 font-sans font-bold">──(N:1)──►</span>
                                            <span className="text-amber-300">{p.tableName}.{p.foreignColumnName}</span>
                                          </div>
                                        </div>

                                        <div className="flex items-center gap-1.5">
                                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${p.isAllSynced ? 'bg-emerald-500/20 text-emerald-300' : 'bg-red-500/20 text-red-300'}`}>
                                            {p.isAllSynced ? '✓ 100% Selaras' : `⚠️ ${p.tableDeltaRows} Selisih`}
                                          </span>
                                          <button
                                            onClick={() => onOpenTableWorkspace(p.tableName)}
                                            className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-cyan-300 cursor-pointer"
                                            title={`Buka workspace tabel induk ${p.tableName}`}
                                          >
                                            <ExternalLink size={11} />
                                          </button>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>

                              {/* 2. Current Primary Table Column */}
                              <div className="p-3.5 rounded-2xl bg-cyan-500/10 border-2 border-cyan-500/40 flex flex-col gap-2 shadow-lg shadow-cyan-500/10">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className="px-1.5 py-0.2 rounded bg-cyan-500/20 text-cyan-300 font-extrabold text-[9px] border border-cyan-500/40">
                                    TARGET UTAMA
                                  </span>
                                  <span className="font-bold text-cyan-300 text-xs">
                                    🎯 Tabel Terpilih
                                  </span>
                                </div>
                                <span className="text-[10px] text-slate-400">
                                  Status sinkronisasi tabel yang sedang diinspeksi:
                                </span>

                                <div className="p-3 rounded-xl bg-slate-950/80 border border-cyan-500/30 flex flex-col gap-1.5 mt-1">
                                  <div className="flex items-center justify-between">
                                    <span className="font-bold font-mono text-cyan-300 text-sm">{tbl.tableName}</span>
                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${tbl.isAllSynced ? 'bg-emerald-500/20 text-emerald-300' : 'bg-amber-500/20 text-amber-300'}`}>
                                      {tbl.isAllSynced ? '✓ 100% Selaras' : `${tbl.tableDeltaRows} Selisih`}
                                    </span>
                                  </div>
                                  <span className="text-[11px] text-slate-400">
                                    Master: <strong className="text-white font-mono">{tbl.masterRowCount.toLocaleString()}</strong> baris &bull; {tbl.columnCount} kolom
                                  </span>
                                  <span className="text-[10px] text-cyan-400/90 font-mono">
                                    Armada: {tbl.syncedPodsCount} dari {tbl.onlinePodsCount} POD selaras ({tbl.syncPercentage}%)
                                  </span>
                                </div>
                              </div>

                              {/* 3. Child Dependents Column (One-to-Many) */}
                              <div className="p-3.5 rounded-2xl bg-purple-500/[0.04] border border-purple-500/30 flex flex-col gap-2">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className="px-1.5 py-0.2 rounded bg-purple-500/20 text-purple-300 font-extrabold text-[9px] border border-purple-500/40">
                                    ONE-TO-MANY (1 : N)
                                  </span>
                                  <span className="font-bold text-purple-400 text-xs">
                                    🔗 Tabel Anak ({tbl.childrenWithStatus.length})
                                  </span>
                                </div>
                                <span className="text-[10px] text-slate-400">
                                  Satu baris di <strong>{tbl.tableName}</strong> (1) memiliki banyak data anak (N). Sinkronkan setelah tabel ini:
                                </span>

                                {tbl.childrenWithStatus.length === 0 ? (
                                  <span className="text-slate-500 text-[11px] italic mt-1">Tidak memiliki tabel anak / turunan.</span>
                                ) : (
                                  <div className="flex flex-col gap-2 mt-1">
                                    {tbl.childrenWithStatus.map(c => (
                                      <div
                                        key={c.tableName}
                                        className={`p-2.5 rounded-xl border flex items-center justify-between transition-colors ${c.isAllSynced
                                          ? 'bg-emerald-950/20 border-emerald-500/30 text-emerald-200'
                                          : 'bg-purple-950/30 border-purple-500/40 text-purple-200'
                                          }`}
                                      >
                                        <div className="flex flex-col gap-0.5">
                                          <div className="flex items-center gap-1.5">
                                            <span className="font-bold font-mono text-white text-xs">{c.tableName}</span>
                                            <span className="text-[9px] px-1 rounded bg-slate-800 text-slate-400 font-mono">
                                              {c.masterRowCount?.toLocaleString() || 0} baris
                                            </span>
                                          </div>
                                          <div className="flex items-center gap-1 text-[9px] text-slate-400 font-mono">
                                            <span className="text-cyan-300">{tbl.tableName}.{c.foreignColumnName}</span>
                                            <span className="text-purple-400 font-sans font-bold">──(1:N)──►</span>
                                            <span className="text-purple-300">{c.tableName}.{c.columnName}</span>
                                          </div>
                                        </div>

                                        <div className="flex items-center gap-1.5">
                                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${c.isAllSynced ? 'bg-emerald-500/20 text-emerald-300' : 'bg-purple-500/20 text-purple-300'}`}>
                                            {c.isAllSynced ? '✓ 100% Selaras' : `⚡ ${c.tableDeltaRows} Selisih`}
                                          </span>
                                          <button
                                            onClick={() => onOpenTableWorkspace(c.tableName)}
                                            className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-cyan-300 cursor-pointer"
                                            title={`Buka workspace tabel anak ${c.tableName}`}
                                          >
                                            <ExternalLink size={11} />
                                          </button>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
