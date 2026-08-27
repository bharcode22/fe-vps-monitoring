import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  RefreshCw,
  Zap,
  CheckCircle2,
  Database,
  Users
} from 'lucide-react';
import {
  fetchMasterDatabasesApi,
  fetchMasterTableFastApi,
  fetchSinglePodComparisonApi,
  fetchMasterTableMatrixApi,
  performMasterSyncApi,
  deleteMasterRowApi,
  deletePodRowApi,
  syncSingleMasterRowApi,
  syncPodToMasterApi,
  syncSinglePodRowApi,
  updateMasterRowApi
} from '../api/masterPodSyncApi';
import TableDetailWorkspaceView from '../components/masterPodSync/TableDetailWorkspaceView';
import MasterPodSyncModal from '../components/masterPodSync/MasterPodSyncModal';
import MasterPodSkeleton from '../components/masterPodSync/MasterPodSkeleton';
import DeleteRowConfirmationModal from '../components/masterPodSync/DeleteRowConfirmationModal';
import SingleRowSyncModal from '../components/masterPodSync/SingleRowSyncModal';
import SyncProgressReportModal from '../components/masterPodSync/SyncProgressReportModal';

export default function UserManagerPage({ onBack }) {
  const tableName = 'user';

  // 1. Master Databases state
  const [masterDatabases, setMasterDatabases] = useState([]);
  const [selectedMasterId, setSelectedMasterId] = useState('');
  const [isLoadingDatabases, setIsLoadingDatabases] = useState(true);

  // 2. Table Detail Workspace state (table 'user')
  const [matrixData, setMatrixData] = useState(null);
  const [isComparing, setIsComparing] = useState(false);
  const [loadingPodId, setLoadingPodId] = useState(null);
  const [activePodId, setActivePodId] = useState(null);
  const [isComparingAll, setIsComparingAll] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // 3. Modals states
  const [syncModalOpen, setSyncModalOpen] = useState(false);
  const [targetPodIds, setTargetPodIds] = useState([]);
  const [dryRun, setDryRun] = useState(false);
  const [syncColumns, setSyncColumns] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  const [deleteModal, setDeleteModal] = useState({
    isOpen: false,
    targetType: 'master',
    targetName: '',
    serverHost: '',
    serverId: null,
    serverIds: [],
    tableName: 'user',
    pkColumn: 'user_id',
    pkValue: null,
    pkValues: []
  });
  const [isDeleting, setIsDeleting] = useState(false);

  const [singleRowSyncModal, setSingleRowSyncModal] = useState({
    isOpen: false,
    pkColumn: 'user_id',
    pkValue: null,
    rowData: null,
    targetPodIds: []
  });
  const [isSingleRowSyncing, setIsSingleRowSyncing] = useState(false);

  const [progressModal, setProgressModal] = useState({
    isOpen: false,
    direction: 'master_to_pod',
    isProcessing: false,
    title: '',
    tableName: 'user',
    sourceName: '',
    targetName: '',
    progressPercent: 0,
    currentStatusText: '',
    report: null
  });

  // Step 1: Load Master Databases on Mount
  useEffect(() => {
    setIsLoadingDatabases(true);
    fetchMasterDatabasesApi()
      .then((dbs) => {
        setMasterDatabases(dbs || []);
        if (dbs && dbs.length > 0) {
          setSelectedMasterId(String(dbs[0].id));
        }
      })
      .catch((err) => {
        setError('Gagal memuat Master Database: ' + err.message);
      })
      .finally(() => {
        setIsLoadingDatabases(false);
      });
  }, []);

  // Step 2: When Master DB changes, load table 'user' Fast Matrix
  useEffect(() => {
    if (!selectedMasterId) return;
    loadUserTableWorkspace(selectedMasterId);
  }, [selectedMasterId]);

  const loadUserTableWorkspace = async (masterId) => {
    setIsComparing(true);
    setError('');
    try {
      // Fast fetch table 'user' schema & rows, plus POD list
      const fastData = await fetchMasterTableFastApi(masterId, tableName);
      setMatrixData(fastData);
      setIsComparing(false);

      // Select first ONLINE POD and compare that POD on-demand
      if (fastData?.pods?.length > 0) {
        const firstOnlinePod = fastData.pods.find((p) => p.isOnline) || fastData.pods[0];
        setActivePodId(firstOnlinePod.id);
        if (firstOnlinePod.isOnline) {
          loadSinglePodComparison(masterId, firstOnlinePod.id);
        }
      }
    } catch (err) {
      setError(err.message || 'Gagal memuat data tabel user.');
      setIsComparing(false);
    }
  };

  // Step 3: Load comparison on-demand for a single POD (~200ms)
  const loadSinglePodComparison = async (masterId, podId) => {
    if (!masterId || !podId) return;
    setLoadingPodId(podId);
    try {
      const result = await fetchSinglePodComparisonApi(masterId, tableName, podId);
      if (result?.success && result.podSummary) {
        setMatrixData((prev) => {
          if (!prev) return prev;

          // 1. Update pods array
          const updatedPods = (prev.pods || []).map((p) => {
            if (String(p.id) === String(podId)) {
              return { ...p, ...result.podSummary, hasCompared: true };
            }
            return p;
          });

          // 2. Update columnsMatrix
          const updatedColumns = (prev.columnsMatrix || []).map((col) => {
            const colPresence = result.columnPresenceMap?.[col.columnName] || {
              isOnline: false,
              exists: false,
              typeMatch: false
            };
            return {
              ...col,
              presence: {
                ...(col.presence || {}),
                [podId]: colPresence
              }
            };
          });

          // 3. Update dataMatrix presence
          const updatedDataMatrix = (prev.dataMatrix || []).map((item) => {
            const presence = result.dataPresenceMap?.[item.rowKey] || {
              isOnline: false,
              present: false
            };
            return {
              ...item,
              presence: {
                ...(item.presence || {}),
                [podId]: presence
              }
            };
          });

          // Append any podOnlyRows if not already present
          if (result.podOnlyRows && result.podOnlyRows.length > 0) {
            const existingKeys = new Set(updatedDataMatrix.map((d) => d.rowKey));
            result.podOnlyRows.forEach((por) => {
              if (!existingKeys.has(por.rowKey)) {
                updatedDataMatrix.push(por);
              }
            });
          }

          const onlinePods = updatedPods.filter((p) => p.isOnline).length;
          const syncedPods = updatedPods.filter((p) => p.status === 'SYNCED').length;
          const mismatchPods = updatedPods.filter(
            (p) => p.isOnline && p.status !== 'SYNCED' && p.status !== 'NOT_LOADED'
          ).length;

          return {
            ...prev,
            pods: updatedPods,
            columnsMatrix: updatedColumns,
            dataMatrix: updatedDataMatrix,
            summary: {
              ...(prev.summary || {}),
              onlinePods,
              syncedPods,
              mismatchPods
            }
          };
        });
      }
    } catch (err) {
      console.error('[Single POD Compare Error]:', err);
    } finally {
      setLoadingPodId(null);
    }
  };

  // Step 4: Handle user clicking a POD in PodStatusCardsGrid
  const handleSelectPod = (podId) => {
    setActivePodId(podId);
    const targetPod = (matrixData?.pods || []).find((p) => String(p.id) === String(podId));
    const isAlreadyCompared =
      targetPod &&
      targetPod.tableExists !== null &&
      targetPod.rowCount !== null &&
      targetPod.status !== 'NOT_LOADED';

    if (!isAlreadyCompared) {
      loadSinglePodComparison(selectedMasterId, podId);
    }
  };

  // Step 5: Full fleet comparison across all PODs (opt-in)
  const handleCompareAllPods = async () => {
    if (!selectedMasterId) return;
    setIsComparingAll(true);
    setError('');
    try {
      const fullData = await fetchMasterTableMatrixApi(selectedMasterId, tableName);
      setMatrixData(fullData);
    } catch (err) {
      setError(err.message || 'Gagal membandingkan seluruh armada POD.');
    } finally {
      setIsComparingAll(false);
    }
  };

  // Step 6: Refresh Current Matrix
  const handleRefreshCurrentMatrix = async (isSoft = false) => {
    if (!selectedMasterId) return;
    if (!isSoft && !matrixData) {
      setIsComparing(true);
    }
    setError('');
    try {
      const fastData = await fetchMasterTableFastApi(selectedMasterId, tableName);
      setMatrixData(fastData);
      if (activePodId) {
        loadSinglePodComparison(selectedMasterId, activePodId);
      }
    } catch (err) {
      if (!isSoft) {
        setError(err.message || 'Gagal memuat ulang data.');
      }
    } finally {
      setIsComparing(false);
    }
  };

  // Step 7: Update userLevel on table 'user'
  const handleUpdateMasterRow = async (pkCol, pkVal, updatedFields) => {
    if (!selectedMasterId) return;
    try {
      const res = await updateMasterRowApi(selectedMasterId, tableName, {
        pkColumn: pkCol || 'user_id',
        pkValue: pkVal,
        data: updatedFields
      });
      if (res?.success) {
        // Optimistically update local matrixData state
        setMatrixData((prev) => {
          if (!prev) return prev;
          const updatedDataMatrix = (prev.dataMatrix || []).map((item) => {
            const currentPk =
              item.sampleData?.[pkCol] !== undefined ? item.sampleData[pkCol] : item.rowKey;
            if (String(currentPk) === String(pkVal)) {
              return {
                ...item,
                sampleData: {
                  ...(item.sampleData || {}),
                  ...updatedFields
                }
              };
            }
            return item;
          });
          return {
            ...prev,
            dataMatrix: updatedDataMatrix
          };
        });
        return res.data;
      } else {
        throw new Error(res?.error || 'Gagal memperbarui data baris.');
      }
    } catch (err) {
      console.error('[Update Master Row Error]:', err);
      throw err;
    }
  };

  // Step 8: Bulk Sync Trigger
  const triggerBulkSync = () => {
    const mismatchIds = (matrixData?.pods || [])
      .filter((p) => p.isOnline && p.status !== 'SYNCED')
      .map((p) => p.id);
    setTargetPodIds(mismatchIds);
    setSyncModalOpen(true);
  };

  const triggerSinglePodSync = (podId) => {
    setTargetPodIds([podId]);
    setSyncModalOpen(true);
  };

  // Step 9: Execute Master -> POD Sync
  const handlePerformSync = async () => {
    if (!selectedMasterId || targetPodIds.length === 0) {
      setError('Parameter sinkronisasi belum lengkap.');
      return;
    }

    const masterObj = masterDatabases.find((d) => String(d.id) === String(selectedMasterId));
    setSyncModalOpen(false);
    setIsSyncing(true);
    setError('');

    setProgressModal({
      isOpen: true,
      direction: 'master_to_pod',
      isProcessing: true,
      title: dryRun ? 'Simulasi Sinkronisasi: Master ➔ POD' : 'Sinkronisasi Live: Master ➔ POD',
      tableName,
      sourceName: masterObj?.name || 'Master DB',
      targetName: `${targetPodIds.length} Unit POD`,
      progressPercent: 30,
      currentStatusText: `Menghubungkan ke ${targetPodIds.length} server target...`,
      report: null
    });

    try {
      const result = await performMasterSyncApi({
        masterId: Number(selectedMasterId),
        tableName,
        targetPodIds,
        dryRun,
        syncColumns,
        syncData: true
      });

      const totalSynced = result.results?.reduce((acc, r) => acc + (r.rowsSynced || 0), 0) || 0;

      // Optimistic update
      if (!dryRun) {
        setMatrixData((prev) => {
          if (!prev) return prev;
          const successfulTargetIds = new Set(
            (result?.results || []).filter((r) => r.success).map((r) => Number(r.serverId))
          );
          if (successfulTargetIds.size === 0) return prev;

          const masterRowCount = prev.master?.rowCount || 0;
          const updatedPods = (prev.pods || []).map((p) => {
            if (successfulTargetIds.has(Number(p.id))) {
              return {
                ...p,
                status: 'SYNCED',
                rowCount: masterRowCount
              };
            }
            return p;
          });

          return {
            ...prev,
            pods: updatedPods
          };
        });
      }

      setProgressModal((prev) => ({
        ...prev,
        isProcessing: false,
        progressPercent: 100,
        currentStatusText: 'Sinkronisasi Selesai!',
        report: {
          ...result,
          totalRowsSynced: totalSynced
        }
      }));

      setSuccessMsg(
        dryRun
          ? `Simulasi selesai: Berhasil disimulasikan ke ${targetPodIds.length} target POD.`
          : `Sinkronisasi Live Berhasil! ${result.successfulTargets || 0} POD berhasil diperbarui (${totalSynced} baris data disinkronkan).`
      );
      setTimeout(() => setSuccessMsg(''), 6000);
      handleRefreshCurrentMatrix(true);
    } catch (err) {
      setError(err.message || 'Gagal mengeksekusi sinkronisasi.');
      setProgressModal((prev) => ({
        ...prev,
        isProcessing: false,
        progressPercent: 100,
        currentStatusText: 'Gagal Sinkronisasi',
        report: {
          success: false,
          failedTargets: targetPodIds.length,
          successfulTargets: 0,
          results: targetPodIds.map((id) => ({
            serverId: id,
            serverName: `POD #${id}`,
            success: false,
            error: err.message
          }))
        }
      }));
    } finally {
      setIsSyncing(false);
    }
  };

  // Step 10: Delete Handlers
  const handlePromptDeleteMasterRow = ({ pkColumn, pkValue, pkValues }) => {
    const master = masterDatabases.find((d) => String(d.id) === String(selectedMasterId));
    const values =
      Array.isArray(pkValues) && pkValues.length > 0
        ? pkValues
        : pkValue !== undefined
        ? [pkValue]
        : [];
    setDeleteModal({
      isOpen: true,
      targetType: 'master',
      targetName: master ? master.name : 'Master DB',
      serverHost: master ? `${master.host}:${master.port || 5432}` : '',
      serverId: null,
      tableName,
      pkColumn: pkColumn || 'user_id',
      pkValue: values[0],
      pkValues: values
    });
  };

  const handlePromptDeletePodRow = ({ serverId, serverIds, serverName, pkColumn, pkValue, pkValues }) => {
    const targetIds =
      Array.isArray(serverIds) && serverIds.length > 0 ? serverIds : serverId ? [serverId] : [];
    const podObj = (matrixData?.pods || []).find((p) => p.id === targetIds[0]);
    const values =
      Array.isArray(pkValues) && pkValues.length > 0
        ? pkValues
        : pkValue !== undefined
        ? [pkValue]
        : [];
    setDeleteModal({
      isOpen: true,
      targetType: 'pod',
      targetName:
        serverName ||
        podObj?.name ||
        (targetIds.length > 1 ? `${targetIds.length} Unit POD` : `POD #${targetIds[0]}`),
      serverHost: podObj?.host || podObj?.ip_address || '',
      serverId: targetIds[0],
      serverIds: targetIds,
      tableName,
      pkColumn: pkColumn || 'user_id',
      pkValue: values[0],
      pkValues: values
    });
  };

  const handleExecuteDelete = async ({ cascade = true, pkValues } = {}) => {
    setIsDeleting(true);
    setError('');
    const valuesToDelete =
      Array.isArray(pkValues) && pkValues.length > 0 ? pkValues : deleteModal.pkValues;
    const keysSet = new Set(valuesToDelete.map(String));

    try {
      if (deleteModal.targetType === 'master') {
        const res = await deleteMasterRowApi({
          masterId: Number(selectedMasterId),
          tableName: deleteModal.tableName,
          pkColumn: deleteModal.pkColumn,
          pkValues: valuesToDelete,
          cascade
        });
        setSuccessMsg(
          `Sukses! ${res.deletedCount || valuesToDelete.length} baris user berhasil di-Hard Delete dari Master Database.`
        );

        setMatrixData((prev) => {
          if (!prev) return prev;
          const updatedDataMatrix = (prev.dataMatrix || []).filter((item) => {
            const pkVal =
              item.sampleData?.[deleteModal.pkColumn] !== undefined
                ? item.sampleData[deleteModal.pkColumn]
                : item.rowKey;
            return !keysSet.has(String(pkVal));
          });
          return {
            ...prev,
            dataMatrix: updatedDataMatrix
          };
        });
      } else {
        const res = await deletePodRowApi({
          serverId: Number(deleteModal.serverId),
          serverIds: deleteModal.serverIds || [Number(deleteModal.serverId)],
          tableName: deleteModal.tableName,
          pkColumn: deleteModal.pkColumn,
          pkValues: valuesToDelete,
          cascade
        });
        setSuccessMsg(
          `Sukses! ${res.deletedCount || valuesToDelete.length} baris data berhasil dihapus dari POD.`
        );
      }

      setDeleteModal((prev) => ({ ...prev, isOpen: false }));
      setTimeout(() => setSuccessMsg(''), 6000);
      handleRefreshCurrentMatrix(true);
    } catch (err) {
      setError(err.message || 'Gagal menghapus baris data: ' + err.message);
    } finally {
      setIsDeleting(false);
    }
  };

  // Step 11: Single Row Sync Handlers
  const handlePromptSyncSingleRowMaster = ({ pkColumn, pkValue, rowData }) => {
    const onlineIds = (matrixData?.pods || []).filter((p) => p.isOnline).map((p) => p.id);
    setSingleRowSyncModal({
      isOpen: true,
      pkColumn: pkColumn || 'user_id',
      pkValue,
      rowData,
      targetPodIds: onlineIds
    });
  };

  const handleQuickSyncSingleRowToSpecificPod = async ({ rowData, pkColumn, pkValue, targetPodId }) => {
    if (!selectedMasterId || !targetPodId) return;
    try {
      await syncSingleMasterRowApi({
        masterId: Number(selectedMasterId),
        tableName,
        pkColumn: pkColumn || 'user_id',
        pkValue,
        targetPodIds: [Number(targetPodId)],
        rowData
      });
      setSuccessMsg(`Sukses! Data user berhasil disinkronkan ke POD #${targetPodId}.`);
      setTimeout(() => setSuccessMsg(''), 5000);
      loadSinglePodComparison(selectedMasterId, targetPodId);
    } catch (err) {
      setError(err.message || 'Gagal menyinkronkan user ke POD.');
    }
  };

  const handleExecuteSingleRowSyncModal = async () => {
    if (!selectedMasterId || singleRowSyncModal.targetPodIds.length === 0) {
      setError('Pilih minimal 1 unit target POD online.');
      return;
    }

    setIsSingleRowSyncing(true);
    setError('');
    try {
      const res = await syncSingleMasterRowApi({
        masterId: Number(selectedMasterId),
        tableName,
        pkColumn: singleRowSyncModal.pkColumn,
        pkValue: singleRowSyncModal.pkValue,
        targetPodIds: singleRowSyncModal.targetPodIds
      });

      setSuccessMsg(
        `Sukses! User (${singleRowSyncModal.pkValue}) berhasil disinkronkan ke ${res.successfulTargets} unit POD.`
      );
      setSingleRowSyncModal((prev) => ({ ...prev, isOpen: false }));
      handleRefreshCurrentMatrix(true);
    } catch (err) {
      setError(err.message || 'Gagal menyinkronkan data.');
    } finally {
      setIsSingleRowSyncing(false);
    }
  };

  // Step 12: POD to Master Sync
  const handleSyncPodToMaster = async (podId) => {
    if (!selectedMasterId || !podId) return;
    setIsSyncing(true);
    try {
      const result = await syncPodToMasterApi({
        masterId: Number(selectedMasterId),
        tableName,
        sourcePodId: Number(podId)
      });
      setSuccessMsg(`Sukses! ${result.rowsSynced || 0} baris data berhasil disinkronkan dari POD ke Master DB.`);
      setTimeout(() => setSuccessMsg(''), 6000);
      handleRefreshCurrentMatrix(false);
    } catch (err) {
      setError(err.message || 'Gagal menyinkronkan data POD ke Master.');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleSyncSinglePodRowToMaster = async ({ rowData, pkColumn, pkValue, podId }) => {
    if (!selectedMasterId || !podId) return;
    try {
      await syncSinglePodRowApi({
        masterId: Number(selectedMasterId),
        tableName,
        pkColumn: pkColumn || 'user_id',
        pkValue,
        sourcePodId: Number(podId),
        rowData
      });
      setSuccessMsg(`Sukses! Baris user dari POD #${podId} berhasil disalin ke Master DB.`);
      setTimeout(() => setSuccessMsg(''), 5000);
      handleRefreshCurrentMatrix(true);
    } catch (err) {
      setError(err.message || 'Gagal menyinkronkan baris dari POD ke Master.');
    }
  };

  const handleBulkSyncPodRowsToMaster = async ({ podId, rows }) => {
    if (!selectedMasterId || !podId || !rows || rows.length === 0) return;
    setIsSyncing(true);
    let successCount = 0;
    for (const r of rows) {
      try {
        await syncSinglePodRowApi({
          masterId: Number(selectedMasterId),
          tableName,
          pkColumn: 'user_id',
          pkValue: r.user_id,
          sourcePodId: Number(podId),
          rowData: r
        });
        successCount++;
      } catch (err) {
        console.error('Failed row sync to master:', err);
      }
    }
    setIsSyncing(false);
    setSuccessMsg(`Sukses! ${successCount} dari ${rows.length} baris berhasil disalin ke Master DB.`);
    setTimeout(() => setSuccessMsg(''), 5000);
    handleRefreshCurrentMatrix(false);
  };

  return (
    <div className="flex flex-col gap-6 text-slate-100 w-full animate-in fade-in duration-200">
      {/* 1. Header Toolbar */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 p-6 bg-slate-900/60 border border-slate-800 rounded-3xl backdrop-blur-xl shadow-xl">
        <div className="flex items-center gap-3.5">
          {onBack && (
            <button
              onClick={onBack}
              className="p-2.5 rounded-2xl bg-slate-800/80 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-white transition-all cursor-pointer shadow-sm hover:scale-105"
              title="Kembali ke Dashboard"
            >
              <ArrowLeft size={18} />
            </button>
          )}
          <div className="p-3 rounded-2xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 border border-indigo-500/30 text-indigo-400 shadow-md">
            <Users size={24} />
          </div>
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-xl md:text-2xl font-black text-white tracking-tight">
                Database User Manager
              </h1>
              <span className="px-2.5 py-0.5 rounded-full bg-indigo-500/15 border border-indigo-500/30 text-indigo-300 text-[11px] font-bold font-mono">
                public.user
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Kelola akun, edit <code>userLevel</code> enum, dan pantau komparasi data langsung dengan seluruh unit POD V3.
            </p>
          </div>
        </div>

        {/* Master Database Selector & Refresh Action */}
        <div className="flex items-center gap-2.5 w-full md:w-auto">
          <div className="relative flex-1 md:w-64">
            <Database size={13} className="absolute left-3 top-3 text-slate-500 pointer-events-none" />
            <select
              value={selectedMasterId}
              onChange={(e) => setSelectedMasterId(e.target.value)}
              disabled={isLoadingDatabases || isComparing}
              className="w-full pl-8 pr-8 py-2 bg-slate-950 border border-slate-800 rounded-2xl text-xs font-bold text-slate-200 focus:outline-none focus:border-indigo-500 cursor-pointer appearance-none shadow-sm disabled:opacity-50"
              title="Pilih Master Database"
            >
              {masterDatabases.map((db) => (
                <option key={db.id} value={db.id}>
                  {db.name || `Master #${db.id}`} ({db.host})
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={() => handleRefreshCurrentMatrix(false)}
            disabled={isComparing}
            className="p-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-2xl text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all shadow-sm hover:scale-105 disabled:opacity-50"
            title="Muat Ulang Data User & Status POD"
          >
            <RefreshCw size={15} className={isComparing ? 'animate-spin text-indigo-400' : ''} />
            <span className="hidden sm:inline">Refresh</span>
          </button>
        </div>
      </div>

      {/* Alerts */}
      {error && (
        <div className="p-4 bg-red-500/15 border border-red-500/30 rounded-2xl flex items-center justify-between text-xs text-red-300 shadow-md">
          <span>{error}</span>
          <button onClick={() => setError('')} className="text-red-400 hover:text-white font-bold ml-2 cursor-pointer">
            Tutup
          </button>
        </div>
      )}
      {successMsg && (
        <div className="p-4 bg-emerald-500/15 border border-emerald-500/30 rounded-2xl flex items-center justify-between text-xs text-emerald-300 shadow-md">
          <span className="flex items-center gap-2 font-bold">
            <CheckCircle2 size={16} /> {successMsg}
          </span>
          <button onClick={() => setSuccessMsg('')} className="text-emerald-400 hover:text-white font-bold ml-2 cursor-pointer">
            Tutup
          </button>
        </div>
      )}

      {/* 2. TABLE DETAIL WORKSPACE (Identical flow to Master POD Sync Matrix) */}
      {isComparing && !matrixData ? (
        <MasterPodSkeleton />
      ) : (
        <TableDetailWorkspaceView
          tableName={tableName}
          masterInfo={matrixData?.master}
          matrixData={matrixData}
          isComparing={isComparing}
          loadingPodId={loadingPodId}
          isComparingAll={isComparingAll}
          onCompareAllPods={handleCompareAllPods}
          onRefresh={() => handleRefreshCurrentMatrix(false)}
          onBackToCatalog={null}
          activePodId={activePodId}
          setActivePodId={handleSelectPod}
          onQuickSyncPod={triggerSinglePodSync}
          onBulkSync={triggerBulkSync}
          onUpdateMasterRow={handleUpdateMasterRow}
          onDeleteMasterRow={handlePromptDeleteMasterRow}
          onDeleteMultipleRows={handlePromptDeleteMasterRow}
          onDeletePodRow={handlePromptDeletePodRow}
          onDeleteMultiplePodRows={handlePromptDeletePodRow}
          onSyncSingleRow={handlePromptSyncSingleRowMaster}
          onSyncSingleRowToPod={handleQuickSyncSingleRowToSpecificPod}
          onSyncPodToMaster={handleSyncPodToMaster}
          onSyncSinglePodRowToMaster={handleSyncSinglePodRowToMaster}
          onBulkSyncPodRowsToMaster={handleBulkSyncPodRowsToMaster}
        />
      )}

      {/* ========================================================================= */}
      {/* 3. SYNC CONFIRMATION MODAL (BULK MASTER -> POD)                          */}
      {/* ========================================================================= */}
      {syncModalOpen && (
        <MasterPodSyncModal
          isOpen={syncModalOpen}
          onClose={() => setSyncModalOpen(false)}
          masterId={selectedMasterId}
          tableName={tableName}
          masterInfo={matrixData?.master || masterDatabases.find((d) => String(d.id) === String(selectedMasterId))}
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

      {/* ========================================================================= */}
      {/* 4. SINGLE ROW SYNC MODAL                                                 */}
      {/* ========================================================================= */}
      {singleRowSyncModal.isOpen && (
        <SingleRowSyncModal
          isOpen={singleRowSyncModal.isOpen}
          onClose={() => setSingleRowSyncModal((prev) => ({ ...prev, isOpen: false }))}
          tableName={tableName}
          pkColumn={singleRowSyncModal.pkColumn}
          pkValue={singleRowSyncModal.pkValue}
          rowData={singleRowSyncModal.rowData}
          targetPodIds={singleRowSyncModal.targetPodIds}
          setTargetPodIds={(ids) => setSingleRowSyncModal((prev) => ({ ...prev, targetPodIds: ids }))}
          pods={matrixData?.pods || []}
          isSyncing={isSingleRowSyncing}
          onPerformSync={handleExecuteSingleRowSyncModal}
        />
      )}

      {/* ========================================================================= */}
      {/* 5. DELETE ROW CONFIRMATION MODAL                                         */}
      {/* ========================================================================= */}
      {deleteModal.isOpen && (
        <DeleteRowConfirmationModal
          isOpen={deleteModal.isOpen}
          onClose={() => setDeleteModal((prev) => ({ ...prev, isOpen: false }))}
          targetType={deleteModal.targetType}
          targetName={deleteModal.targetName}
          serverHost={deleteModal.serverHost}
          tableName={deleteModal.tableName}
          pkColumn={deleteModal.pkColumn}
          pkValue={deleteModal.pkValue}
          pkValues={deleteModal.pkValues}
          isDeleting={isDeleting}
          onConfirm={handleExecuteDelete}
        />
      )}

      {/* ========================================================================= */}
      {/* 6. SYNC PROGRESS REPORT MODAL                                            */}
      {/* ========================================================================= */}
      {progressModal.isOpen && (
        <SyncProgressReportModal
          modalState={progressModal}
          onClose={() => setProgressModal((prev) => ({ ...prev, isOpen: false }))}
        />
      )}
    </div>
  );
}
