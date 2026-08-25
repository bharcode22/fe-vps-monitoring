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
  TrendingUp,
  DownloadCloud,
  CheckSquare,
  Square,
  Sparkles,
  ExternalLink,
  Loader2
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
  const [selectedPodFilter, setSelectedPodFilter] = useState('all'); // 'all' | podId
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('delta_desc'); // 'delta_desc' | 'name_asc' | 'sync_asc'

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

  // Extract unique POD list from first table breakdown
  const availablePods = useMemo(() => {
    if (tables.length === 0) return [];
    return tables[0]?.podBreakdown || [];
  }, [tables]);

  // Filter and sort tables
  const filteredTables = useMemo(() => {
    return tables
      .filter(t => {
        // Status filter
        if (filterType === 'discrepant' && (t.isAllSynced || t.hasMissingTables)) return false;
        if (filterType === 'missing' && !t.hasMissingTables) return false;
        if (filterType === 'synced' && !t.isAllSynced) return false;

        // Specific POD filter
        if (selectedPodFilter !== 'all') {
          const podIdNum = Number(selectedPodFilter);
          const podInfo = t.podBreakdown?.find(p => p.podId === podIdNum);
          if (!podInfo) return false;
          // If we are filtering by a specific POD, check if that POD has discrepancy
          if (filterType === 'discrepant' && podInfo.isSynced) return false;
          if (filterType === 'missing' && podInfo.tableExists) return false;
          if (filterType === 'synced' && !podInfo.isSynced) return false;
        }

        // Search query
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase().trim();
          const nameMatch = t.tableName.toLowerCase().includes(q);
          const podMatch = t.podBreakdown?.some(p =>
            !p.isSynced && p.podName.toLowerCase().includes(q)
          );
          if (!nameMatch && !podMatch) return false;
        }

        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'delta_desc') return b.tableDeltaRows - a.tableDeltaRows;
        if (sortBy === 'sync_asc') return a.syncPercentage - b.syncPercentage;
        if (sortBy === 'name_asc') return a.tableName.localeCompare(b.tableName);
        return 0;
      });
  }, [tables, filterType, selectedPodFilter, searchQuery, sortBy]);

  // Show animated shimmer skeleton on scan / reload (MUST BE AFTER ALL HOOKS)
  if (isLoading) {
    return <FleetAuditSkeleton />;
  }

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-300">
      {/* 1. Top KPI Summary Dashboard */}
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

        {/* KPI 2: Fully Synced Tables */}
        <div
          onClick={() => setFilterType('synced')}
          className={`bg-slate-900/80 border rounded-2xl p-4 flex flex-col justify-between shadow-lg relative overflow-hidden backdrop-blur-md cursor-pointer transition-all hover:scale-[1.02] ${filterType === 'synced' ? 'border-emerald-500/60 ring-2 ring-emerald-500/20 bg-emerald-950/20' : 'border-slate-800 hover:border-emerald-500/40'
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

        {/* KPI 3: Out-of-Sync Tables (Row Delta) */}
        <div
          onClick={() => setFilterType('discrepant')}
          className={`bg-slate-900/80 border rounded-2xl p-4 flex flex-col justify-between shadow-lg relative overflow-hidden backdrop-blur-md cursor-pointer transition-all hover:scale-[1.02] ${filterType === 'discrepant' ? 'border-amber-500/60 ring-2 ring-amber-500/20 bg-amber-950/20' : 'border-slate-800 hover:border-amber-500/40'
            }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">Ada Selisih Baris Data</span>
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <AlertTriangle size={16} />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-2xl font-black text-amber-400 font-mono tracking-tight">{summary.discrepantTables}</span>
            <span className="text-[10px] font-bold text-amber-400/90 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
              Perlu Sinkron
            </span>
          </div>
        </div>

        {/* KPI 4: Missing DDL on PODs */}
        <div
          onClick={() => setFilterType('missing')}
          className={`bg-slate-900/80 border rounded-2xl p-4 flex flex-col justify-between shadow-lg relative overflow-hidden backdrop-blur-md cursor-pointer transition-all hover:scale-[1.02] ${filterType === 'missing' ? 'border-red-500/60 ring-2 ring-red-500/20 bg-red-950/20' : 'border-slate-800 hover:border-red-500/40'
            }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">Tabel Belum Ada di POD</span>
            <div className="p-2 rounded-xl bg-red-500/10 text-red-400 border border-red-500/20">
              <XCircle size={16} />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-2xl font-black text-red-400 font-mono tracking-tight">{summary.missingTables}</span>
            <span className="text-[10px] font-bold text-red-400/90 bg-red-500/10 px-2 py-0.5 rounded-full border border-red-500/20">
              Skema Missing
            </span>
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
      <div className="p-4 bg-slate-900/90 border border-slate-800 rounded-2xl shadow-xl flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Status Filter Pills */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              onClick={() => setFilterType('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${filterType === 'all'
                ? 'bg-slate-800 text-white border border-slate-700 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 bg-slate-950/60'
                }`}
            >
              Semua Tabel ({summary.totalTables})
            </button>

            <button
              onClick={() => setFilterType('discrepant')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${filterType === 'discrepant'
                ? 'bg-amber-500/25 text-amber-300 border border-amber-500/40 shadow-sm'
                : 'text-slate-400 hover:text-amber-300 bg-slate-950/60'
                }`}
            >
              <AlertTriangle size={13} className="text-amber-400" />
              <span>Ada Selisih ({summary.discrepantTables})</span>
            </button>

            <button
              onClick={() => setFilterType('missing')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${filterType === 'missing'
                ? 'bg-red-500/25 text-red-300 border border-red-500/40 shadow-sm'
                : 'text-slate-400 hover:text-red-300 bg-slate-950/60'
                }`}
            >
              <XCircle size={13} className="text-red-400" />
              <span>Missing di POD ({summary.missingTables})</span>
            </button>

            <button
              onClick={() => setFilterType('synced')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${filterType === 'synced'
                ? 'bg-emerald-500/25 text-emerald-300 border border-emerald-500/40 shadow-sm'
                : 'text-slate-400 hover:text-emerald-300 bg-slate-950/60'
                }`}
            >
              <CheckCircle2 size={13} className="text-emerald-400" />
              <span>100% Selaras ({summary.syncedTables})</span>
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

        {/* Secondary Filter Bar: Specific POD Selector & Search */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-800/80">
          <div className="flex items-center gap-2 flex-wrap text-xs">
            <span className="text-slate-400 font-semibold flex items-center gap-1">
              <Filter size={13} className="text-slate-400" /> Filter POD:
            </span>
            <select
              value={selectedPodFilter}
              onChange={(e) => setSelectedPodFilter(e.target.value)}
              className="bg-slate-950 border border-slate-800 text-slate-200 text-xs rounded-xl px-3 py-1.5 focus:outline-none focus:border-cyan-500 font-mono"
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
              className="bg-slate-950 border border-slate-800 text-slate-200 text-xs rounded-xl px-3 py-1.5 focus:outline-none focus:border-cyan-500"
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
              placeholder="Cari tabel atau unit POD..."
              className="w-full pl-8 pr-3 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 font-mono"
            />
          </div>
        </div>
      </div>

      {/* 3. Discrepancy Table Matrix */}
      <div className="overflow-x-auto rounded-2xl border border-slate-800 shadow-2xl bg-slate-950/80">
        <table className="w-full text-left text-xs border-collapse font-sans">
          <thead>
            <tr className="bg-slate-900/95 border-b border-slate-800 text-slate-400 sticky top-0 z-10 text-[11px] uppercase tracking-wider font-semibold">
              <th className="p-3.5 w-12 text-center">No</th>
              <th className="p-3.5 font-bold">Nama Tabel & Relasi</th>
              <th className="p-3.5 text-center w-28">Baris Master</th>
              <th className="p-3.5 text-center w-48">Status Armada</th>
              <th className="p-3.5">Rincian POD yang Mengalami Selisih</th>
              <th className="p-3.5 text-center w-48">Aksi Cepat</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 font-mono text-xs">
            {filteredTables.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-12 text-center text-slate-400">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <CheckCircle2 size={32} className="text-emerald-400 animate-pulse" />
                    <span className="text-sm font-bold text-slate-200">Tidak ada tabel dengan kriteria ini.</span>
                    <span className="text-xs text-slate-500">Semua tabel terpilih sudah 100% selaras atau sesuai filter.</span>
                  </div>
                </td>
              </tr>
            ) : (
              filteredTables.map((tbl, idx) => {
                const discrepantPods = tbl.podBreakdown?.filter(p => !p.isSynced && p.isOnline) || [];

                return (
                  <tr
                    key={tbl.tableName}
                    className={`hover:bg-slate-800/40 transition-colors ${!tbl.isAllSynced ? 'bg-amber-500/[0.02]' : ''
                      }`}
                  >
                    {/* Number */}
                    <td className="p-3.5 text-center text-slate-500 font-sans text-xs">
                      {idx + 1}
                    </td>

                    {/* Table Name & Column count */}
                    <td className="p-3.5">
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-cyan-300 text-sm hover:underline cursor-pointer" onClick={() => onOpenTableWorkspace(tbl.tableName)}>
                            {tbl.tableName}
                          </span>
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-400 border border-slate-700 font-mono">
                            {tbl.columnCount} Kolom
                          </span>
                        </div>
                        <div className="flex items-center gap-1 text-[10px] font-sans">
                          {tbl.relationType === 'parent' && (
                            <span className="text-purple-400 font-bold">Induk Relasi</span>
                          )}
                          {tbl.relationType === 'child' && (
                            <span className="text-amber-400 font-bold">Anak Relasi</span>
                          )}
                          {tbl.relationType === 'complex' && (
                            <span className="text-cyan-400 font-bold">Relasi Kompleks</span>
                          )}
                          {tbl.relationType === 'standalone' && (
                            <span className="text-slate-500">Tabel Mandiri</span>
                          )}
                          {tbl.isPartitioned && (
                            <span className="ml-1 px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 font-bold">
                              Partisi Armada
                            </span>
                          )}
                        </div>
                      </div>
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
                        {/* Open Detail Workspace Button */}
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
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
