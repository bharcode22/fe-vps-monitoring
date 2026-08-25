import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  RefreshCw,
  Zap,
  CheckCircle2,
  Table,
  Layers,
  Database
} from 'lucide-react';
import {
  fetchMasterDatabasesApi,
  fetchMasterTablesApi,
  fetchMasterTableMatrixApi,
  performMasterSyncApi,
  deleteMasterRowApi,
  deletePodRowApi,
  syncSingleMasterRowApi
} from '../api/masterPodSyncApi';
import MasterTablesCatalogView from '../components/masterPodSync/MasterTablesCatalogView';
import TableDetailWorkspaceView from '../components/masterPodSync/TableDetailWorkspaceView';
import MasterPodSyncModal from '../components/masterPodSync/MasterPodSyncModal';
import MasterPodSkeleton from '../components/masterPodSync/MasterPodSkeleton';
import DeleteRowConfirmationModal from '../components/masterPodSync/DeleteRowConfirmationModal';
import SingleRowSyncModal from '../components/masterPodSync/SingleRowSyncModal';

export default function MasterPodSyncMatrixPage({ onBack }) {
  // View mode: 'catalog' (Level 1: Tables Grid) | 'detail' (Level 2: Detail Workspace)
  const [viewMode, setViewMode] = useState('catalog');

  // Master Databases & Tables State
  const [masterDatabases, setMasterDatabases] = useState([]);
  const [selectedMasterId, setSelectedMasterId] = useState('');
  const [tables, setTables] = useState([]);
  const [selectedTableName, setSelectedTableName] = useState('');
  const [isLoadingTables, setIsLoadingTables] = useState(false);

  // Active POD for Level 2 inspection
  const [activePodId, setActivePodId] = useState(null);

  // Matrix Comparison State
  const [matrixData, setMatrixData] = useState(null);
  const [isComparing, setIsComparing] = useState(false);

  // Sync Modal State (Bulk/Table Sync)
  const [syncModalOpen, setSyncModalOpen] = useState(false);
  const [targetPodIds, setTargetPodIds] = useState([]);
  const [dryRun, setDryRun] = useState(false);
  const [syncColumns, setSyncColumns] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);

  // Single Row Sync Modal State
  const [singleRowSyncModal, setSingleRowSyncModal] = useState({
    isOpen: false,
    pkColumn: 'id',
    pkValue: null,
    rowData: null,
    targetPodIds: []
  });
  const [isSingleRowSyncing, setIsSingleRowSyncing] = useState(false);

  // Delete Modal State
  const [deleteModal, setDeleteModal] = useState({
    isOpen: false,
    targetType: 'master', // 'master' | 'pod'
    targetName: '',
    serverId: null,
    tableName: '',
    pkColumn: 'id',
    pkValue: null
  });
  const [isDeleting, setIsDeleting] = useState(false);

  // Alerts
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // 1. Fetch Master Databases on Mount
  useEffect(() => {
    fetchMasterDatabasesApi()
      .then(dbs => {
        setMasterDatabases(dbs);
        if (dbs.length > 0) {
          setSelectedMasterId(String(dbs[0].id));
        }
      })
      .catch(err => {
        setError(err.message || 'Gagal memuat Database Master.');
      });
  }, []);

  // 2. Fetch Tables when Master DB changes
  const loadMasterTables = async (masterId) => {
    if (!masterId) {
      setTables([]);
      return;
    }

    setIsLoadingTables(true);
    setError('');
    try {
      const res = await fetchMasterTablesApi(masterId);
      setTables(res.tables || []);
    } catch (err) {
      setError(err.message || 'Gagal memuat daftar tabel master.');
    } finally {
      setIsLoadingTables(false);
    }
  };

  useEffect(() => {
    if (selectedMasterId) {
      loadMasterTables(selectedMasterId);
    }
  }, [selectedMasterId]);

  // 3. Open Detail Workspace for a specific Table
  const handleOpenTableDetail = async (tableName) => {
    setSelectedTableName(tableName);
    setViewMode('detail');
    setIsComparing(true);
    setError('');
    setMatrixData(null);

    try {
      const data = await fetchMasterTableMatrixApi(selectedMasterId, tableName);
      setMatrixData(data);
      if (data?.pods?.length > 0) {
        // Default to first online pod or first pod
        const firstOnline = data.pods.find(p => p.isOnline);
        setActivePodId(firstOnline ? firstOnline.id : data.pods[0].id);
      }
    } catch (err) {
      setError(err.message || `Gagal memuat data komparasi tabel '${tableName}'.`);
    } finally {
      setIsComparing(false);
    }
  };

  // Reload current matrix comparison
  const handleRefreshCurrentMatrix = async () => {
    if (!selectedMasterId || !selectedTableName) return;
    setIsComparing(true);
    setError('');
    try {
      const data = await fetchMasterTableMatrixApi(selectedMasterId, selectedTableName);
      setMatrixData(data);
    } catch (err) {
      setError(err.message || 'Gagal memuat ulang data matriks.');
    } finally {
      setIsComparing(false);
    }
  };

  // 4. Trigger Sync Modals
  const triggerBulkSync = () => {
    if (!matrixData) return;
    const mismatchOnlineIds = matrixData.pods
      .filter(p => p.isOnline && p.status !== 'SYNCED')
      .map(p => p.id);

    if (mismatchOnlineIds.length === 0) {
      const allOnlineIds = matrixData.pods.filter(p => p.isOnline).map(p => p.id);
      setTargetPodIds(allOnlineIds);
    } else {
      setTargetPodIds(mismatchOnlineIds);
    }
    setSyncModalOpen(true);
  };

  const triggerSinglePodSync = (podId) => {
    setTargetPodIds([podId]);
    setSyncModalOpen(true);
  };

  // 5. Execute Sync
  const handlePerformSync = async () => {
    if (!selectedMasterId || !selectedTableName || targetPodIds.length === 0) {
      setError('Pilih minimal satu target POD online.');
      return;
    }

    setIsSyncing(true);
    setError('');
    try {
      const res = await performMasterSyncApi({
        masterId: Number(selectedMasterId),
        tableName: selectedTableName,
        targetPodIds,
        dryRun,
        syncColumns,
        syncData: true
      });

      setSuccessMsg(
        `Sukses! ${dryRun ? 'Simulasi' : 'Sinkronisasi'} tabel '${selectedTableName}' berhasil dijalankan ke ${res.successfulTargets} target POD.`
      );
      setSyncModalOpen(false);
      await handleRefreshCurrentMatrix();
      setTimeout(() => setSuccessMsg(''), 6000);
    } catch (err) {
      setError(err.message || 'Gagal melakukan sinkronisasi ke POD.');
    } finally {
      setIsSyncing(false);
    }
  };

  // 6. Delete Row Handlers
  const handlePromptDeleteMasterRow = ({ pkColumn, pkValue }) => {
    const master = masterDatabases.find(d => String(d.id) === String(selectedMasterId));
    setDeleteModal({
      isOpen: true,
      targetType: 'master',
      targetName: master ? master.name : 'Master DB',
      serverId: null,
      tableName: selectedTableName,
      pkColumn: pkColumn || 'id',
      pkValue
    });
  };

  const handlePromptDeletePodRow = ({ serverId, serverName, pkColumn, pkValue }) => {
    setDeleteModal({
      isOpen: true,
      targetType: 'pod',
      targetName: serverName || `POD #${serverId}`,
      serverId,
      tableName: selectedTableName,
      pkColumn: pkColumn || 'id',
      pkValue
    });
  };

  const handleExecuteDelete = async () => {
    setIsDeleting(true);
    setError('');
    try {
      if (deleteModal.targetType === 'master') {
        await deleteMasterRowApi({
          masterId: Number(selectedMasterId),
          tableName: deleteModal.tableName,
          pkColumn: deleteModal.pkColumn,
          pkValue: deleteModal.pkValue
        });
        setSuccessMsg(`Baris (${deleteModal.pkColumn} = ${deleteModal.pkValue}) berhasil dihapus dari Master Database.`);
      } else {
        await deletePodRowApi({
          serverId: Number(deleteModal.serverId),
          tableName: deleteModal.tableName,
          pkColumn: deleteModal.pkColumn,
          pkValue: deleteModal.pkValue
        });
        setSuccessMsg(`Baris (${deleteModal.pkColumn} = ${deleteModal.pkValue}) berhasil dihapus dari ${deleteModal.targetName}.`);
      }

      setDeleteModal(prev => ({ ...prev, isOpen: false }));
      await handleRefreshCurrentMatrix();
      setTimeout(() => setSuccessMsg(''), 6000);
    } catch (err) {
      setError(err.message || 'Gagal menghapus baris data.');
    } finally {
      setIsDeleting(false);
    }
  };

  // 7. Single Row Sync Handlers
  // A. Trigger from Master Data Viewer -> Open Modal
  const handlePromptSyncSingleRowMaster = ({ pkColumn, pkValue, rowData }) => {
    const onlineIds = (matrixData?.pods || []).filter(p => p.isOnline).map(p => p.id);
    setSingleRowSyncModal({
      isOpen: true,
      pkColumn: pkColumn || 'id',
      pkValue,
      rowData,
      targetPodIds: onlineIds
    });
  };

  // B. Execute Single Row Sync from Modal
  const handleExecuteSingleRowSyncModal = async () => {
    if (!selectedMasterId || !selectedTableName || singleRowSyncModal.targetPodIds.length === 0) {
      setError('Pilih minimal 1 unit target POD online.');
      return;
    }

    setIsSingleRowSyncing(true);
    setError('');
    try {
      const res = await syncSingleMasterRowApi({
        masterId: Number(selectedMasterId),
        tableName: selectedTableName,
        pkColumn: singleRowSyncModal.pkColumn,
        pkValue: singleRowSyncModal.pkValue,
        targetPodIds: singleRowSyncModal.targetPodIds
      });

      setSuccessMsg(`Sukses! Baris (${singleRowSyncModal.pkColumn} = ${singleRowSyncModal.pkValue}) berhasil disinkronkan ke ${res.successfulTargets} unit POD.`);
      setSingleRowSyncModal(prev => ({ ...prev, isOpen: false }));
      await handleRefreshCurrentMatrix();
      setTimeout(() => setSuccessMsg(''), 6000);
    } catch (err) {
      setError(err.message || 'Gagal menyinkronkan 1 baris data ke POD.');
    } finally {
      setIsSingleRowSyncing(false);
    }
  };

  // C. Instant Quick Sync 1 Row from PodDataViewer (Specific target POD)
  const handleQuickSyncSingleRowToSpecificPod = async ({ serverId, serverName, pkColumn, pkValue }) => {
    setError('');
    try {
      await syncSingleMasterRowApi({
        masterId: Number(selectedMasterId),
        tableName: selectedTableName,
        pkColumn: pkColumn || 'id',
        pkValue,
        targetPodIds: [serverId]
      });

      setSuccessMsg(`Sukses! 1 baris data (${pkColumn} = ${pkValue}) berhasil disinkronkan ke ${serverName || 'POD'}.`);
      await handleRefreshCurrentMatrix();
      setTimeout(() => setSuccessMsg(''), 6000);
    } catch (err) {
      setError(err.message || `Gagal menyinkronkan baris ke ${serverName}: ${err.message}`);
    }
  };

  return (
    <div className="flex flex-col gap-6 text-slate-100 w-full">
      {/* Top Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-cyan-500/20">
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              if (viewMode === 'detail') {
                setViewMode('catalog');
              } else {
                onBack();
              }
            }}
            className="p-2 bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl border border-slate-700 transition-colors cursor-pointer"
            title="Kembali"
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-extrabold text-white tracking-tight">
                Master Multi-POD Sync Matrix
              </h1>
              <span className="text-xs font-mono font-bold px-2.5 py-0.5 rounded-full bg-purple-500/15 text-purple-300 border border-purple-500/30">
                {viewMode === 'catalog' ? 'Katalog Master' : `Tabel: ${selectedTableName}`}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Audit Keselarasan Skema Kolom &amp; Baris Data dari <strong className="text-cyan-300">Database Master</strong> ke seluruh armada <strong className="text-purple-300">POD V3</strong>
            </p>
          </div>
        </div>

        {/* Global Action: Back / Refresh */}
        <div className="flex items-center gap-3">
          {viewMode === 'detail' && (
            <button
              onClick={() => setViewMode('catalog')}
              className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors border border-slate-700 cursor-pointer shadow-sm"
            >
              <Table size={14} />
              <span>Semua Tabel Master</span>
            </button>
          )}

          <button
            onClick={() => {
              if (viewMode === 'detail') handleRefreshCurrentMatrix();
              else loadMasterTables(selectedMasterId);
            }}
            disabled={isLoadingTables || isComparing}
            className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-cyan-400 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors border border-slate-700 cursor-pointer shadow-sm disabled:opacity-50"
          >
            <RefreshCw size={14} className={isLoadingTables || isComparing ? 'animate-spin' : ''} />
            <span>Muat Ulang</span>
          </button>
        </div>
      </div>

      {/* Alerts */}
      {error && (
        <div className="p-3.5 bg-red-500/15 border border-red-500/30 text-red-300 rounded-2xl text-xs flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError('')} className="text-red-400 hover:text-white font-bold ml-2">
            Tutup
          </button>
        </div>
      )}
      {successMsg && (
        <div className="p-3.5 bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 rounded-2xl text-xs flex items-center justify-between">
          <span className="flex items-center gap-1.5">
            <CheckCircle2 size={16} /> {successMsg}
          </span>
          <button onClick={() => setSuccessMsg('')} className="text-emerald-400 hover:text-white font-bold ml-2">
            Tutup
          </button>
        </div>
      )}

      {/* VIEW LEVEL 1: MASTER TABLES CATALOG */}
      {viewMode === 'catalog' && (
        <MasterTablesCatalogView
          masterDatabases={masterDatabases}
          selectedMasterId={selectedMasterId}
          onSelectMaster={setSelectedMasterId}
          tables={tables}
          isLoadingTables={isLoadingTables}
          onRefreshTables={() => loadMasterTables(selectedMasterId)}
          onSelectTableForDetail={handleOpenTableDetail}
        />
      )}

      {/* VIEW LEVEL 2: TABLE DETAIL WORKSPACE */}
      {viewMode === 'detail' && (
        isComparing ? (
          <MasterPodSkeleton />
        ) : (
          <TableDetailWorkspaceView
            tableName={selectedTableName}
            masterInfo={matrixData?.master}
            matrixData={matrixData}
            isComparing={isComparing}
            onRefresh={handleRefreshCurrentMatrix}
            onBackToCatalog={() => setViewMode('catalog')}
            activePodId={activePodId}
            setActivePodId={setActivePodId}
            onQuickSyncPod={triggerSinglePodSync}
            onBulkSync={triggerBulkSync}
            onDeleteMasterRow={handlePromptDeleteMasterRow}
            onDeletePodRow={handlePromptDeletePodRow}
            onSyncSingleRow={handlePromptSyncSingleRowMaster}
            onSyncSingleRowToPod={handleQuickSyncSingleRowToSpecificPod}
          />
        )
      )}

      {/* SYNC CONFIRMATION MODAL (BULK / TABLE) */}
      {syncModalOpen && (
        <MasterPodSyncModal
          isOpen={syncModalOpen}
          onClose={() => setSyncModalOpen(false)}
          masterInfo={matrixData?.master}
          targetPodIds={targetPodIds}
          setTargetPodIds={setTargetPodIds}
          pods={matrixData?.pods || []}
          dryRun={dryRun}
          setDryRun={setDryRun}
          syncColumns={syncColumns}
          setSyncColumns={setSyncColumns}
          isSyncing={isSyncing}
          onPerformSync={handlePerformSync}
        />
      )}

      {/* SINGLE ROW SYNC MODAL */}
      {singleRowSyncModal.isOpen && (
        <SingleRowSyncModal
          isOpen={singleRowSyncModal.isOpen}
          onClose={() => setSingleRowSyncModal(prev => ({ ...prev, isOpen: false }))}
          masterInfo={matrixData?.master}
          pkColumn={singleRowSyncModal.pkColumn}
          pkValue={singleRowSyncModal.pkValue}
          rowData={singleRowSyncModal.rowData}
          targetPodIds={singleRowSyncModal.targetPodIds}
          setTargetPodIds={(ids) => setSingleRowSyncModal(prev => ({
            ...prev,
            targetPodIds: typeof ids === 'function' ? ids(prev.targetPodIds) : ids
          }))}
          pods={matrixData?.pods || []}
          isSyncing={isSingleRowSyncing}
          onConfirmSync={handleExecuteSingleRowSyncModal}
        />
      )}

      {/* MANUAL DELETE CONFIRMATION MODAL */}
      {deleteModal.isOpen && (
        <DeleteRowConfirmationModal
          isOpen={deleteModal.isOpen}
          onClose={() => setDeleteModal(prev => ({ ...prev, isOpen: false }))}
          targetType={deleteModal.targetType}
          targetName={deleteModal.targetName}
          tableName={deleteModal.tableName}
          pkColumn={deleteModal.pkColumn}
          pkValue={deleteModal.pkValue}
          isDeleting={isDeleting}
          onConfirmDelete={handleExecuteDelete}
        />
      )}
    </div>
  );
}
