import React, { useState } from 'react';
import {
  ArrowLeft,
  RefreshCw,
  Zap,
  CheckCircle2,
  AlertTriangle,
  Table,
  Layers,
  Database,
  Server,
  Eye,
  SlidersHorizontal,
  UploadCloud,
  ShieldCheck,
  Activity,
  Filter
} from 'lucide-react';
import MasterDataViewer from './MasterDataViewer';
import PodStatusCardsGrid from './PodStatusCardsGrid';
import PodDataViewer from './PodDataViewer';
import MasterPodColumnMatrix from './MasterPodColumnMatrix';
import MasterPodDataMatrix from './MasterPodDataMatrix';

export default function TableDetailWorkspaceView({
  tableName,
  masterInfo,
  matrixData,
  isComparing,
  onRefresh,
  onBackToCatalog,
  activePodId,
  setActivePodId,
  onQuickSyncPod,
  onSyncPodToMaster,
  onBulkSync,
  onDeleteMasterRow,
  onDeletePodRow,
  onDeleteMultipleRows,
  onDeleteMultiplePodRows,
  onSyncSingleRow,
  onSyncSingleRowToPod,
  onSyncSinglePodRowToMaster,
  onBulkSyncPodRowsToMaster
}) {
  const [viewMode, setViewMode] = useState('per_pod'); // 'per_pod' | 'matrix_overview'
  const [matrixSubTab, setMatrixSubTab] = useState('data'); // 'data' | 'columns'
  const [podStatusFilter, setPodStatusFilter] = useState('all');

  const activePod = (matrixData?.pods || []).find(p => String(p.id) === String(activePodId)) || matrixData?.pods?.[0];

  const isPartitionedTable = tableName === 'pod';
  const isHighVolumeTable = tableName.includes('log') || tableName.includes('answer') || (masterInfo?.rowCount || 0) > 2000;
  const isPodIntakeTable = tableName === 'user' || tableName.includes('terms_and_conditions') || tableName.includes('log');

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-200">
      {/* 1. Top Workspace Banner */}
      <div className="glass-card p-5 sm:p-6 rounded-3xl border border-purple-500/40 bg-slate-900/70 shadow-2xl backdrop-blur-xl">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 pb-4 mb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-gradient-to-br from-cyan-500/20 via-purple-500/20 to-pink-500/20 border border-cyan-500/40 rounded-2xl text-cyan-400">
              <Database size={24} />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-black text-white flex items-center gap-2.5 flex-wrap">
                <span>Detail Pengelolaan Tabel: <strong className="text-cyan-400 font-mono">public.{tableName}</strong></span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
                  Master: {masterInfo?.name}
                </span>
                {isPartitionedTable && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center gap-1">
                    <Filter size={11} />
                    <span>Partisi Khusus per-POD</span>
                  </span>
                )}
                {isPodIntakeTable && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1">
                    <UploadCloud size={11} />
                    <span>Dukungan Tarik POD ➔ Master</span>
                  </span>
                )}
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Total di Master: <strong className="text-white font-mono">{masterInfo?.rowCount || 0} Baris</strong> &bull; Kolom: <strong className="text-purple-300 font-mono">{masterInfo?.columnCount || 0} Kolom</strong>
              </p>
            </div>
          </div>

          {/* Action Buttons: Refresh & Sync All Mismatches */}
          <div className="flex items-center gap-2.5 flex-wrap">
            {matrixData?.summary?.mismatchPods > 0 && (
              <button
                onClick={onBulkSync}
                className="px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-slate-950 font-extrabold rounded-xl text-xs flex items-center gap-1.5 shadow-lg shadow-amber-500/25 transition-all cursor-pointer hover:scale-105"
              >
                <Zap size={14} className="fill-slate-950" />
                <span>Kirim ke POD Selisih ({matrixData.summary.mismatchPods})</span>
              </button>
            )}

            <button
              onClick={onRefresh}
              disabled={isComparing}
              className="p-2 bg-slate-800 hover:bg-slate-700 text-cyan-400 rounded-xl border border-slate-700 cursor-pointer transition-colors disabled:opacity-50"
              title="Muat Ulang Matriks Komparasi"
            >
              <RefreshCw size={15} className={isComparing ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>

        {/* Informational Alert for Partitioned / High-Volume Tables */}
        {isPartitionedTable && (
          <div className="mb-4 p-3 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-center gap-2.5">
            <ShieldCheck size={16} className="text-amber-400 shrink-0" />
            <span>
              <strong>Tabel Partisi Armada:</strong> Master menyimpan semua baris unit POD ({masterInfo?.rowCount || 0} unit), sedangkan masing-masing server POD v3 hanya menyimpan 1 baris identitasnya sendiri. Sinkronisasi otomatis memfilter baris milik POD target.
            </span>
          </div>
        )}

        {isHighVolumeTable && (
          <div className="mb-4 p-3 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-xs flex items-center gap-2.5">
            <Activity size={16} className="text-cyan-400 shrink-0" />
            <span>
              <strong>Tabel Berkapasitas Besar (*High-Volume Data*):</strong> Tabel ini memuat banyak baris telemetri/log. Sistem memproses penarikan data secara bertahap (*batch stream chunking*) untuk mencegah *timeout*.
            </span>
          </div>
        )}

        {/* View Mode Switcher Toolbar */}
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setViewMode('per_pod')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${viewMode === 'per_pod'
                ? 'bg-purple-500/25 text-purple-300 border border-purple-500/40 shadow-sm'
                : 'text-slate-400 hover:text-white bg-slate-950/60 border border-slate-800'
                }`}
            >
              <Server size={14} />
              <span>Workspace Komparasi per-POD</span>
            </button>

            <button
              onClick={() => setViewMode('matrix_overview')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${viewMode === 'matrix_overview'
                ? 'bg-cyan-500/25 text-cyan-300 border border-cyan-500/40 shadow-sm'
                : 'text-slate-400 hover:text-white bg-slate-950/60 border border-slate-800'
                }`}
            >
              <Layers size={14} />
              <span>Matriks Ringkasan Semua POD</span>
            </button>
          </div>

          <div className="text-xs text-slate-400 font-mono">
            Status: <strong className={matrixData?.summary?.isAllSynced ? 'text-emerald-400' : 'text-amber-400'}>
              {matrixData?.summary?.syncedPods || 0} dari {matrixData?.summary?.onlinePods || 0} POD Online 100% Selaras
            </strong>
          </div>
        </div>
      </div>

      {/* 2. SECTION 1: Master Data Viewer (Collapsible with POD-only discovery & multi-select) */}
      <MasterDataViewer
        masterInfo={masterInfo}
        columns={matrixData?.columnsMatrix || []}
        dataMatrix={matrixData?.dataMatrix || []}
        rows={(matrixData?.dataMatrix || []).map(d => d.sampleData)}
        onDeleteRow={onDeleteMasterRow}
        onDeleteMultipleRows={onDeleteMultipleRows}
        onDeletePodRow={onDeletePodRow}
        onDeleteMultiplePodRows={onDeleteMultiplePodRows}
        onSyncSingleRow={onSyncSingleRow}
        onSyncSinglePodRowToMaster={onSyncSinglePodRowToMaster}
        onBulkSyncPodRowsToMaster={onBulkSyncPodRowsToMaster}
      />

      {/* 3. SECTION 2: Data di Masing-Masing POD */}
      {viewMode === 'per_pod' ? (
        <div className="flex flex-col gap-6">
          {/* POD Selection Grid */}
          <PodStatusCardsGrid
            pods={matrixData?.pods || []}
            masterInfo={masterInfo}
            activePodId={activePodId}
            onSelectPod={setActivePodId}
            onQuickSyncPod={onQuickSyncPod}
            filterStatus={podStatusFilter}
            onFilterStatusChange={setPodStatusFilter}
          />

          {/* Active POD Deep Data Viewer */}
          <PodDataViewer
            pod={activePod}
            masterInfo={masterInfo}
            dataMatrix={matrixData?.dataMatrix || []}
            columnsMatrix={matrixData?.columnsMatrix || []}
            onSyncPod={onQuickSyncPod}
            onSyncPodToMaster={onSyncPodToMaster}
            onDeletePodRow={onDeletePodRow}
            onDeleteMultiplePodRows={onDeleteMultiplePodRows}
            onSyncSingleRowToPod={onSyncSingleRowToPod}
            onSyncSinglePodRowToMaster={onSyncSinglePodRowToMaster}
            onBulkSyncPodRowsToMaster={onBulkSyncPodRowsToMaster}
          />
        </div>
      ) : (
        /* Overall Matrix View Mode */
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setMatrixSubTab('data')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${matrixSubTab === 'data'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                : 'text-slate-400 hover:text-slate-200'
                }`}
            >
              Matriks Baris Data ({masterInfo?.rowCount || 0} Baris)
            </button>

            <button
              onClick={() => setMatrixSubTab('columns')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${matrixSubTab === 'columns'
                ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                : 'text-slate-400 hover:text-slate-200'
                }`}
            >
              Matriks Skema Kolom ({masterInfo?.columnCount || 0} Kolom DDL)
            </button>
          </div>

          {matrixSubTab === 'data' ? (
            <MasterPodDataMatrix
              dataMatrix={matrixData?.dataMatrix || []}
              pods={matrixData?.pods || []}
              onInspectPod={(pod) => {
                setActivePodId(pod.id);
                setViewMode('per_pod');
              }}
              onQuickSyncRow={(podId, rowKey) => {
                const targetPod = (matrixData?.pods || []).find(p => p.id === podId);
                if (onSyncSingleRowToPod) {
                  onSyncSingleRowToPod({
                    serverId: podId,
                    serverName: targetPod?.name || 'POD',
                    pkColumn: masterInfo?.pkColumn || 'id',
                    pkValue: rowKey
                  });
                }
              }}
            />
          ) : (
            <MasterPodColumnMatrix
              columnsMatrix={matrixData?.columnsMatrix || []}
              pods={matrixData?.pods || []}
            />
          )}
        </div>
      )}
    </div>
  );
}
