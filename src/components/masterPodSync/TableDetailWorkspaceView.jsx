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
  DownloadCloud,
  ShieldCheck,
  Activity,
  Filter,
  Eraser
} from 'lucide-react';
import MasterDataViewer from './MasterDataViewer';
import PodStatusCardsGrid from './PodStatusCardsGrid';
import PodDataViewer from './PodDataViewer';
import MasterPodColumnMatrix from './MasterPodColumnMatrix';
import MasterPodDataMatrix from './MasterPodDataMatrix';
import CleanMasterDuplicatesModal from './CleanMasterDuplicatesModal';
import { cleanMasterDuplicatesApi } from '../../api/masterPodSyncApi';

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
  onUpdateMasterRow,
  onDeleteMasterRow,
  onDeletePodRow,
  onDeleteMultipleRows,
  onDeleteMultiplePodRows,
  onSyncSingleRow,
  onSyncSingleRowToPod,
  onSyncSinglePodRowToMaster,
  onBulkSyncPodRowsToMaster,
  loadingPodId = null,
  isComparingAll = false,
  onCompareAllPods = null,
  hideTopBanner = false,
  hideMasterViewer = false,
  direction = 'master_to_pod'
}) {
  const [viewMode, setViewMode] = useState('per_pod'); // 'per_pod' | 'matrix_overview'
  const [matrixSubTab, setMatrixSubTab] = useState('data'); // 'data' | 'columns'
  const [podStatusFilter, setPodStatusFilter] = useState('all');
  const [isCleanModalOpen, setIsCleanModalOpen] = useState(false);
  const [isCleaning, setIsCleaning] = useState(false);

  const activePod = (matrixData?.pods || []).find(p => String(p.id) === String(activePodId)) || matrixData?.pods?.[0];

  const isPartitionedTable = tableName === 'pod';
  const isHighVolumeTable = tableName.includes('log') || tableName.includes('answer') || (masterInfo?.rowCount || 0) > 2000;
  const isPodIntakeTable = tableName === 'user' || tableName.includes('terms_and_conditions') || tableName.includes('log');

  const handleCleanSuccess = () => {
    setIsCleanModalOpen(false);
    onRefresh(); // Refresh UI to update row count
  };

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-200">
      {/* 1. Top Workspace Banner (or Compact Bar if hideTopBanner is true) */}
      {!hideTopBanner ? (
        <div className="glass-card p-5 sm:p-6 rounded-3xl border border-purple-500/40 bg-slate-900/70 shadow-2xl backdrop-blur-xl">
          <div className="flex flex-col xl:flex-row items-start xl:items-center justify-between gap-4 pb-4 mb-4 border-b border-slate-800/80">
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="p-3 bg-gradient-to-br from-cyan-500/20 via-purple-500/20 to-pink-500/20 border border-cyan-500/40 rounded-2xl text-cyan-400 shrink-0">
                <Database size={24} />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2.5 flex-wrap">
                  <h2 className="text-lg sm:text-xl font-black text-white tracking-tight">
                    Detail Pengelolaan Tabel: <strong className="text-cyan-400 font-mono">public.{tableName}</strong>
                  </h2>
                  <span className="text-[10px] font-mono px-2.5 py-0.5 rounded-full bg-purple-500/15 text-purple-300 border border-purple-500/30">
                    Master: {masterInfo?.name}
                  </span>
                  {isPartitionedTable && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30 flex items-center gap-1">
                      <Filter size={11} />
                      <span>Partisi Khusus</span>
                    </span>
                  )}
                  {isPodIntakeTable && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                      <UploadCloud size={11} />
                      <span>Tarik POD ➔ Master</span>
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2.5 text-xs text-slate-400 mt-1">
                  <span>Total di Master: <strong className="text-white font-mono">{masterInfo?.rowCount || 0} Baris</strong></span>
                  <span className="text-slate-600">&bull;</span>
                  <span>Kolom: <strong className="text-purple-300 font-mono">{masterInfo?.columnCount || 0} Kolom</strong></span>
                </div>
              </div>
            </div>

            {/* Action Buttons Toolbar: Unified, Aligned, No Awkward Breaking */}
            <div className="flex items-center gap-2 shrink-0 self-stretch sm:self-auto justify-start xl:justify-end flex-nowrap overflow-x-auto p-1 bg-slate-950/60 rounded-2xl border border-slate-800/80">
              {matrixData?.summary?.mismatchPods > 0 && (
                <button
                  onClick={onBulkSync}
                  className="h-9 px-3.5 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-slate-950 font-extrabold rounded-xl text-xs flex items-center gap-1.5 shadow-md shadow-amber-500/20 transition-all cursor-pointer hover:scale-[1.02] shrink-0"
                  title={`Sinkronkan data Master ke ${matrixData.summary.mismatchPods} POD yang memiliki perbedaan`}
                >
                  <Zap size={13} className="fill-slate-950" />
                  <span>Kirim ke POD Selisih ({matrixData.summary.mismatchPods})</span>
                </button>
              )}

              {onCompareAllPods && (
                <button
                  onClick={onCompareAllPods}
                  disabled={isComparingAll}
                  className="h-9 px-3 bg-purple-500/15 hover:bg-purple-500/25 text-purple-300 border border-purple-500/30 hover:border-purple-500/50 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors disabled:opacity-50 shrink-0"
                  title="Bandingkan data tabel ini ke seluruh armada server POD sekaligus"
                >
                  <Layers size={14} className={isComparingAll ? 'animate-spin' : ''} />
                  <span>{isComparingAll ? 'Memindai Armada...' : 'Bandingkan Semua POD'}</span>
                </button>
              )}

              <button
                onClick={() => setIsCleanModalOpen(true)}
                className="h-9 px-3 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 hover:border-emerald-500/50 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors shrink-0"
                title="Bersihkan duplikasi data dan sampah pada Master Database"
              >
                <Database size={13} />
                <span>Bersihkan Master</span>
              </button>

              <button
                onClick={onRefresh}
                disabled={isComparing}
                className="h-9 w-9 flex items-center justify-center bg-slate-900 hover:bg-slate-800 text-cyan-400 hover:text-cyan-300 rounded-xl border border-slate-700/80 cursor-pointer transition-colors disabled:opacity-50 shrink-0"
                title="Muat Ulang Matriks Komparasi"
              >
                <RefreshCw size={14} className={isComparing ? 'animate-spin' : ''} />
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
      ) : (
        /* Compact Action Bar when hideTopBanner is true */
        <div className="flex items-center justify-between gap-3 flex-wrap bg-slate-950/60 p-3 rounded-2xl border border-slate-800">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setViewMode('per_pod')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${viewMode === 'per_pod'
                ? 'bg-purple-500/25 text-purple-300 border border-purple-500/40 shadow-sm'
                : 'text-slate-400 hover:text-white bg-slate-900 border border-slate-800'
                }`}
            >
              <Server size={14} />
              <span>Workspace Komparasi per-POD</span>
            </button>

            <button
              onClick={() => setViewMode('matrix_overview')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${viewMode === 'matrix_overview'
                ? 'bg-cyan-500/25 text-cyan-300 border border-cyan-500/40 shadow-sm'
                : 'text-slate-400 hover:text-white bg-slate-900 border border-slate-800'
                }`}
            >
              <Layers size={14} />
              <span>Matriks Ringkasan Semua POD</span>
            </button>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-xs text-slate-400 font-mono">
              Status: <strong className={matrixData?.summary?.isAllSynced ? 'text-emerald-400' : 'text-amber-400'}>
                {matrixData?.summary?.syncedPods || 0} dari {matrixData?.summary?.onlinePods || 0} POD Online 100% Selaras
              </strong>
            </div>

            {matrixData?.summary?.mismatchPods > 0 && (
              direction === 'pod_to_master' ? (
                <button
                  onClick={onBulkSync}
                  className="h-8 px-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-extrabold rounded-xl text-xs flex items-center gap-1.5 shadow-md shadow-purple-600/20 transition-all cursor-pointer shrink-0"
                  title="Tarik seluruh baris data dari semua unit POD ke Master Database"
                >
                  <DownloadCloud size={13} className="text-white" />
                  <span>Tarik dari Seluruh POD ({matrixData.summary.mismatchPods})</span>
                </button>
              ) : (
                <button
                  onClick={onBulkSync}
                  className="h-8 px-3 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-slate-950 font-extrabold rounded-xl text-xs flex items-center gap-1.5 shadow-md shadow-amber-500/20 transition-all cursor-pointer shrink-0"
                >
                  <Zap size={13} className="fill-slate-950" />
                  <span>Kirim ke POD Selisih ({matrixData.summary.mismatchPods})</span>
                </button>
              )
            )}

            <button
              onClick={() => setIsCleanModalOpen(true)}
              className="h-8 px-2.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors shadow-sm shrink-0"
              title="Periksa dan bersihkan data ganda / duplikat di Master Database"
            >
              <Eraser size={13} className="text-amber-400" />
              <span>Cek Duplikat</span>
            </button>

            <button
              onClick={onRefresh}
              disabled={isComparing}
              className="h-8 w-8 flex items-center justify-center bg-slate-800 hover:bg-slate-700 text-cyan-400 rounded-xl border border-slate-700 cursor-pointer transition-colors disabled:opacity-50 shrink-0"
              title="Muat Ulang Matriks Komparasi"
            >
              <RefreshCw size={13} className={isComparing ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>
      )}

      {/* 2. SECTION 1: Master Data Viewer (Hidden when hideMasterViewer is true) */}
      {!hideMasterViewer && (
        <MasterDataViewer
          masterInfo={masterInfo}
          columns={matrixData?.columnsMatrix || []}
          dataMatrix={matrixData?.dataMatrix || []}
          rows={(matrixData?.dataMatrix || []).map(d => d.sampleData)}
          onUpdateRow={onUpdateMasterRow}
          onDeleteRow={onDeleteMasterRow}
          onDeleteMultipleRows={onDeleteMultipleRows}
          onDeletePodRow={onDeletePodRow}
          onDeleteMultiplePodRows={onDeleteMultiplePodRows}
          onSyncSingleRow={onSyncSingleRow}
          onSyncSinglePodRowToMaster={onSyncSinglePodRowToMaster}
          onBulkSyncPodRowsToMaster={onBulkSyncPodRowsToMaster}
          onCheckDuplicates={() => setIsCleanModalOpen(true)}
        />
      )}

      {/* 3. SECTION 2: Data di Masing-Masing POD */}
      {viewMode === 'per_pod' ? (
        <div className="flex flex-col gap-6">
          {/* POD Selection Grid */}
          <PodStatusCardsGrid
            pods={matrixData?.pods || []}
            masterInfo={masterInfo}
            activePodId={activePodId}
            loadingPodId={loadingPodId}
            onSelectPod={setActivePodId}
            onQuickSyncPod={onQuickSyncPod}
            filterStatus={podStatusFilter}
            onFilterStatusChange={setPodStatusFilter}
          />

          {/* Active POD Deep Data Viewer */}
          <PodDataViewer
            pod={activePod}
            masterInfo={masterInfo}
            loadingPodId={loadingPodId}
            isLoading={loadingPodId === activePod?.id}
            dataMatrix={matrixData?.dataMatrix || []}
            columnsMatrix={matrixData?.columnsMatrix || []}
            onInspectPod={setActivePodId}
            onSyncPod={onQuickSyncPod}
            onSyncPodToMaster={onSyncPodToMaster}
            onDeletePodRow={onDeletePodRow}
            onDeleteMultiplePodRows={onDeleteMultiplePodRows}
            onSyncSingleRowToPod={onSyncSingleRowToPod}
            onSyncSinglePodRowToMaster={onSyncSinglePodRowToMaster}
            onBulkSyncPodRowsToMaster={onBulkSyncPodRowsToMaster}
          />

          <CleanMasterDuplicatesModal
            isOpen={isCleanModalOpen}
            onClose={() => setIsCleanModalOpen(false)}
            tableName={tableName}
            masterInfo={masterInfo}
            columns={matrixData?.columnsMatrix || []}
            onSuccess={handleCleanSuccess}
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
