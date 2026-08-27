import { useState, useEffect, useCallback } from 'react';
import {
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

/**
 * Custom hook to manage the lifecycle, state, comparison, and sync actions
 * for a specific database table against the armada of POD V3 instances.
 */
export function useTableSyncWorkspace({ tableName, selectedMasterId, masterDatabases = [] }) {
  // Table matrix & comparison states
  const [matrixData, setMatrixData] = useState(null);
  const [isComparing, setIsComparing] = useState(false);
  const [loadingPodId, setLoadingPodId] = useState(null);
  const [activePodId, setActivePodId] = useState(null);
  const [isComparingAll, setIsComparingAll] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Bulk Master -> POD Sync Modal state
  const [syncModalOpen, setSyncModalOpen] = useState(false);
  const [targetPodIds, setTargetPodIds] = useState([]);
  const [dryRun, setDryRun] = useState(false);
  const [syncColumns, setSyncColumns] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  // Delete Row Confirmation Modal state
  const [deleteModal, setDeleteModal] = useState({
    isOpen: false,
    targetType: 'master',
    targetName: '',
    serverHost: '',
    serverId: null,
    serverIds: [],
    tableName: tableName || 'user',
    pkColumn: 'user_id',
    pkValue: null,
    pkValues: []
  });
  const [isDeleting, setIsDeleting] = useState(false);

  // Single Row Sync Modal state
  const [singleRowSyncModal, setSingleRowSyncModal] = useState({
    isOpen: false,
    pkColumn: 'user_id',
    pkValue: null,
    rowData: null,
    targetPodIds: []
  });
  const [isSingleRowSyncing, setIsSingleRowSyncing] = useState(false);

  // Live Progress Report Modal state
  const [progressModal, setProgressModal] = useState({
    isOpen: false,
    direction: 'master_to_pod',
    isProcessing: false,
    title: '',
    tableName: tableName || 'user',
    sourceName: '',
    targetName: '',
    progressPercent: 0,
    currentStatusText: '',
    report: null
  });

  // 1. Single POD comparison on-demand (~200ms)
  const loadSinglePodComparison = useCallback(
    async (masterId, podId) => {
      if (!masterId || !podId || !tableName) return;
      setLoadingPodId(podId);
      try {
        const result = await fetchSinglePodComparisonApi(masterId, tableName, podId);
        if (result?.success && result.podSummary) {
          setMatrixData((prev) => {
            if (!prev) return prev;

            // Update pods array
            const updatedPods = (prev.pods || []).map((p) => {
              if (String(p.id) === String(podId)) {
                return { ...p, ...result.podSummary, hasCompared: true };
              }
              return p;
            });

            // Update columnsMatrix
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

            // Update dataMatrix presence
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

            // Append podOnlyRows if not already present
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
    },
    [tableName]
  );

  // 2. Initial Fast load when Master DB is selected
  const loadTableWorkspace = useCallback(
    async (masterId) => {
      if (!masterId || !tableName) return;
      setIsComparing(true);
      setError('');
      try {
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
        setError(err.message || `Gagal memuat data tabel ${tableName}.`);
        setIsComparing(false);
      }
    },
    [tableName, loadSinglePodComparison]
  );

  useEffect(() => {
    if (selectedMasterId) {
      loadTableWorkspace(selectedMasterId);
    }
  }, [selectedMasterId, loadTableWorkspace]);

  // 3. User selects a POD from grid
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

  // 4. Full fleet comparison across all PODs (opt-in)
  const handleCompareAllPods = async () => {
    if (!selectedMasterId || !tableName) return;
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

  // 5. Refresh current matrix
  const handleRefreshCurrentMatrix = async (isSoft = false) => {
    if (!selectedMasterId || !tableName) return;
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

  // 6. Update master row (e.g. userLevel)
  const handleUpdateMasterRow = async (pkCol, pkVal, updatedFields) => {
    if (!selectedMasterId || !tableName) return;
    try {
      const res = await updateMasterRowApi(selectedMasterId, tableName, {
        pkColumn: pkCol || 'user_id',
        pkValue: pkVal,
        data: updatedFields
      });
      if (res?.success) {
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

  // 7. Bulk sync triggers
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

  // 8. Execute Master -> POD Sync
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

  // 9. Delete Handlers
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
          `Sukses! ${res.deletedCount || valuesToDelete.length} baris data berhasil di-Hard Delete dari Master Database.`
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

  // 10. Single Row Sync Handlers
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

  const handleQuickSyncSingleRowToSpecificPod = async ({
    rowData,
    pkColumn: propPkCol,
    pkValue,
    targetPodId,
    serverId,
    serverName
  }) => {
    const finalTargetId = targetPodId || serverId;
    const finalPkCol =
      propPkCol ||
      matrixData?.master?.pkColumn ||
      (matrixData?.columnsMatrix || []).find((c) => c.isPk)?.columnName ||
      'user_id';

    if (!selectedMasterId || !finalTargetId || pkValue === undefined) {
      console.warn('handleQuickSyncSingleRowToSpecificPod missing required args:', {
        selectedMasterId,
        finalTargetId,
        pkValue
      });
      return;
    }

    setError('');
    try {
      const res = await syncSingleMasterRowApi({
        masterId: Number(selectedMasterId),
        tableName,
        pkColumn: finalPkCol,
        pkValue,
        targetPodIds: [Number(finalTargetId)],
        rowData
      });

      // Check if backend returned an individual failure in the data array
      const podRes = Array.isArray(res) ? res[0] : res?.data ? res.data[0] : null;
      if (podRes && podRes.success === false) {
        throw new Error(podRes.error || `Gagal menyinkronkan baris data ke ${serverName || 'POD'}`);
      }

      const podLabel = serverName ? `POD "${serverName}"` : `POD #${finalTargetId}`;
      setSuccessMsg(`Sukses! 1 baris data (${finalPkCol} = ${pkValue}) berhasil diunduh dan disinkronkan ke ${podLabel}.`);
      setTimeout(() => setSuccessMsg(''), 6000);

      // 🚀 Instant Soft UI Update (0ms) - Updates presence so "Download" button immediately turns into "Ada di POD"
      setMatrixData((prev) => {
        if (!prev) return prev;
        const targetNum = Number(finalTargetId);
        const strKey = String(pkValue);

        const updatedDataMatrix = (prev.dataMatrix || []).map((item) => {
          const itemPk =
            item.sampleData?.[finalPkCol] !== undefined
              ? item.sampleData[finalPkCol]
              : item.rowKey;
          if (String(itemPk) === strKey) {
            const updatedPresence = { ...(item.presence || {}) };
            let count = item.presentCount || 0;
            if (!updatedPresence[targetNum] || !updatedPresence[targetNum].present) {
              updatedPresence[targetNum] = { isOnline: true, present: true };
              count++;
            }
            return {
              ...item,
              presence: updatedPresence,
              presentCount: Math.min(count, prev.pods?.length || count)
            };
          }
          return item;
        });

        return {
          ...prev,
          dataMatrix: updatedDataMatrix
        };
      });

      // Also reload in background to ensure comparison hashes match
      if (activePodId && String(activePodId) === String(finalTargetId)) {
        loadSinglePodComparison(selectedMasterId, finalTargetId);
      }
      return res;
    } catch (err) {
      console.error('Error syncing single row to POD:', err);
      setError(err.message || 'Gagal menyinkronkan data ke POD: ' + err.message);
      throw err;
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
        `Sukses! Baris (${singleRowSyncModal.pkValue}) berhasil disinkronkan ke ${res.successfulTargets} unit POD.`
      );
      setSingleRowSyncModal((prev) => ({ ...prev, isOpen: false }));
      handleRefreshCurrentMatrix(true);
    } catch (err) {
      setError(err.message || 'Gagal menyinkronkan data.');
    } finally {
      setIsSingleRowSyncing(false);
    }
  };

  // 11. POD to Master Sync Handlers
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
      setSuccessMsg(`Sukses! Baris data dari POD #${podId} berhasil disalin ke Master DB.`);
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

  return {
    // State
    matrixData,
    isComparing,
    loadingPodId,
    activePodId,
    isComparingAll,
    error,
    setError,
    successMsg,
    setSuccessMsg,

    // Props bundle for TableDetailWorkspaceView
    workspaceProps: {
      isComparing,
      loadingPodId,
      isComparingAll,
      activePodId,
      setActivePodId: handleSelectPod,
      onCompareAllPods: handleCompareAllPods,
      onRefresh: () => handleRefreshCurrentMatrix(false),
      onBackToCatalog: null,
      onQuickSyncPod: triggerSinglePodSync,
      onBulkSync: triggerBulkSync,
      onUpdateMasterRow: handleUpdateMasterRow,
      onDeleteMasterRow: handlePromptDeleteMasterRow,
      onDeleteMultipleRows: handlePromptDeleteMasterRow,
      onDeletePodRow: handlePromptDeletePodRow,
      onDeleteMultiplePodRows: handlePromptDeletePodRow,
      onSyncSingleRow: handlePromptSyncSingleRowMaster,
      onSyncSingleRowToPod: handleQuickSyncSingleRowToSpecificPod,
      onSyncPodToMaster: handleSyncPodToMaster,
      onSyncSinglePodRowToMaster: handleSyncSinglePodRowToMaster,
      onBulkSyncPodRowsToMaster: handleBulkSyncPodRowsToMaster
    },

    // Props bundle for Modals
    modals: {
      sync: {
        isOpen: syncModalOpen,
        onClose: () => setSyncModalOpen(false),
        targetPodIds,
        setTargetPodIds,
        dryRun,
        setDryRun,
        syncColumns,
        setSyncColumns,
        isSyncing,
        onPerformSync: handlePerformSync
      },
      deleteRow: {
        ...deleteModal,
        isDeleting,
        onClose: () => setDeleteModal((prev) => ({ ...prev, isOpen: false })),
        onConfirm: handleExecuteDelete
      },
      singleRowSync: {
        ...singleRowSyncModal,
        isSyncing: isSingleRowSyncing,
        onClose: () => setSingleRowSyncModal((prev) => ({ ...prev, isOpen: false })),
        setTargetPodIds: (ids) => setSingleRowSyncModal((prev) => ({ ...prev, targetPodIds: ids })),
        onPerformSync: handleExecuteSingleRowSyncModal
      },
      progress: {
        modalState: progressModal,
        onClose: () => setProgressModal((prev) => ({ ...prev, isOpen: false }))
      }
    },

    handleRefreshCurrentMatrix
  };
}
