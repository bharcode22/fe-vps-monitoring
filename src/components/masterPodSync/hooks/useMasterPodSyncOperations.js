import { useState, useCallback } from 'react';
import {
  performMasterSyncApi,
  deleteMasterRowApi,
  deletePodRowApi,
  syncSingleMasterRowApi,
  syncPodToMasterApi,
  syncSinglePodRowApi,
  updateMasterRowApi
} from '../../../api/masterPodSyncApi';
import {
  applyOptimisticBulkSync,
  applyOptimisticMasterRowUpdate,
  applyOptimisticMasterDelete,
  applyOptimisticPodDelete,
  applyOptimisticSingleRowMasterToPod,
  applyOptimisticPodToMasterSync,
  applyOptimisticSinglePodRowToMaster,
  applyOptimisticBulkPodRowsToMaster
} from '../masterPodMatrixUpdaters';

/**
 * Custom hook to manage all Master Multi-POD sync operations, row updates,
 * deletions, progress tracking, and modal states.
 */
export function useMasterPodSyncOperations({
  selectedMasterId,
  selectedTableName,
  masterDatabases = [],
  matrixData,
  setMatrixData,
  onError,
  onSuccess,
  onRefreshCurrentMatrix
}) {
  // 1. Bulk Sync Modal State
  const [syncModalOpen, setSyncModalOpen] = useState(false);
  const [targetPodIds, setTargetPodIds] = useState([]);
  const [dryRun, setDryRun] = useState(false);
  const [syncColumns, setSyncColumns] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);

  // 2. Progress & Result Breakdown Modal State
  const [progressModal, setProgressModal] = useState({
    isOpen: false,
    direction: 'master_to_pod',
    isProcessing: false,
    title: '',
    tableName: '',
    sourceName: '',
    targetName: '',
    progressPercent: 0,
    currentStatusText: '',
    report: null
  });

  // 3. Single Row Sync Modal State
  const [singleRowSyncModal, setSingleRowSyncModal] = useState({
    isOpen: false,
    pkColumn: 'id',
    pkValue: null,
    rowData: null,
    targetPodIds: []
  });
  const [isSingleRowSyncing, setIsSingleRowSyncing] = useState(false);

  // 4. Delete Modal State
  const [deleteModal, setDeleteModal] = useState({
    isOpen: false,
    targetType: 'master', // 'master' | 'pod'
    targetName: '',
    serverHost: '',
    serverId: null,
    serverIds: [],
    tableName: '',
    pkColumn: 'id',
    pkValue: null,
    pkValues: []
  });
  const [isDeleting, setIsDeleting] = useState(false);

  // --- Handlers ---

  // Bulk Sync Triggers
  const triggerBulkSync = useCallback(() => {
    const mismatchIds = (matrixData?.pods || [])
      .filter(p => p.isOnline && p.status !== 'SYNCED')
      .map(p => p.id);

    setTargetPodIds(mismatchIds);
    setSyncModalOpen(true);
  }, [matrixData]);

  const triggerSinglePodSync = useCallback((podId) => {
    setTargetPodIds([podId]);
    setSyncModalOpen(true);
  }, []);

  // Perform Bulk Sync
  const handlePerformSync = useCallback(async () => {
    if (!selectedMasterId || !selectedTableName || targetPodIds.length === 0) {
      if (typeof onError === 'function') onError('Parameter sinkronisasi belum lengkap.');
      return;
    }

    const masterObj = masterDatabases.find(d => String(d.id) === String(selectedMasterId));
    setSyncModalOpen(false);
    setIsSyncing(true);

    // Open Live Progress Modal
    setProgressModal({
      isOpen: true,
      direction: 'master_to_pod',
      isProcessing: true,
      title: dryRun ? 'Simulasi Sinkronisasi: Master ➔ POD' : 'Sinkronisasi Live: Master ➔ POD',
      tableName: selectedTableName,
      sourceName: masterObj?.name || 'Master DB',
      targetName: `${targetPodIds.length} Unit POD`,
      progressPercent: 30,
      currentStatusText: `Menghubungkan ke ${targetPodIds.length} server target...`,
      report: null
    });

    try {
      const result = await performMasterSyncApi({
        masterId: Number(selectedMasterId),
        tableName: selectedTableName,
        targetPodIds,
        dryRun,
        syncColumns,
        syncData: true
      });

      const totalSynced = result.results?.reduce((acc, r) => acc + (r.rowsSynced || 0), 0) || 0;

      // Optimistic Instant UI Update
      if (!dryRun) {
        const successfulIds = (result?.results || []).filter(r => r.success).map(r => Number(r.serverId));
        setMatrixData(prev => applyOptimisticBulkSync(prev, successfulIds, syncColumns));
      }

      // Update Finished Report Modal
      setProgressModal(prev => ({
        ...prev,
        isProcessing: false,
        progressPercent: 100,
        currentStatusText: 'Sinkronisasi Selesai!',
        report: {
          ...result,
          totalRowsSynced: totalSynced
        }
      }));

      if (typeof onSuccess === 'function') {
        onSuccess(
          dryRun
            ? `Simulasi selesai: Berhasil disimulasikan ke ${targetPodIds.length} target POD.`
            : `Sinkronisasi Live Berhasil! ${result.successfulTargets || 0} POD berhasil diperbarui (${totalSynced} baris data disinkronkan).`
        );
      }
      if (typeof onRefreshCurrentMatrix === 'function') {
        onRefreshCurrentMatrix(true);
      }
    } catch (err) {
      if (typeof onError === 'function') onError(err.message || 'Gagal mengeksekusi sinkronisasi.');
      setProgressModal(prev => ({
        ...prev,
        isProcessing: false,
        progressPercent: 100,
        currentStatusText: 'Gagal Sinkronisasi',
        report: {
          success: false,
          failedTargets: targetPodIds.length,
          successfulTargets: 0,
          totalRowsSynced: 0,
          results: targetPodIds.map(id => {
            const pod = (matrixData?.pods || []).find(p => p.id === id);
            return { serverId: id, serverName: pod?.name || `POD #${id}`, success: false, error: err.message };
          })
        }
      }));
    } finally {
      setIsSyncing(false);
    }
  }, [selectedMasterId, selectedTableName, targetPodIds, masterDatabases, dryRun, syncColumns, matrixData, onError, onSuccess, onRefreshCurrentMatrix, setMatrixData]);

  // Update a Master row
  const handleUpdateMasterRow = useCallback(async (pkColumn, pkValue, updatedFields) => {
    if (!selectedMasterId || !selectedTableName) return;
    try {
      const res = await updateMasterRowApi(selectedMasterId, selectedTableName, {
        pkColumn,
        pkValue,
        data: updatedFields
      });
      if (res?.success) {
        setMatrixData(prev => applyOptimisticMasterRowUpdate(prev, pkColumn, pkValue, updatedFields));
        return res.data;
      } else {
        throw new Error(res?.error || 'Gagal memperbarui data baris.');
      }
    } catch (err) {
      console.error('[Update Master Row Error]:', err);
      throw err;
    }
  }, [selectedMasterId, selectedTableName, setMatrixData]);

  // Prompt Delete Handlers
  const handlePromptDeleteMasterRow = useCallback(({ pkColumn, pkValue, pkValues }) => {
    const master = masterDatabases.find(d => String(d.id) === String(selectedMasterId));
    const values = Array.isArray(pkValues) && pkValues.length > 0 ? pkValues : (pkValue !== undefined ? [pkValue] : []);
    setDeleteModal({
      isOpen: true,
      targetType: 'master',
      targetName: master ? master.name : 'Master DB',
      serverHost: master ? `${master.host}:${master.port || 5432}` : '',
      serverId: null,
      serverIds: [],
      tableName: selectedTableName,
      pkColumn: pkColumn || matrixData?.master?.pkColumn || 'id',
      pkValue: values[0],
      pkValues: values
    });
  }, [masterDatabases, selectedMasterId, selectedTableName, matrixData]);

  const handlePromptDeletePodRow = useCallback(({ serverId, serverIds, serverName, pkColumn, pkValue, pkValues }) => {
    const targetIds = Array.isArray(serverIds) && serverIds.length > 0 ? serverIds : (serverId ? [serverId] : []);
    const podObj = (matrixData?.pods || []).find(p => p.id === targetIds[0]);
    const values = Array.isArray(pkValues) && pkValues.length > 0 ? pkValues : (pkValue !== undefined ? [pkValue] : []);
    setDeleteModal({
      isOpen: true,
      targetType: 'pod',
      targetName: serverName || podObj?.name || (targetIds.length > 1 ? `${targetIds.length} Unit POD` : `POD #${targetIds[0]}`),
      serverHost: podObj?.host || podObj?.ip_address || '',
      serverId: targetIds[0],
      serverIds: targetIds,
      tableName: selectedTableName,
      pkColumn: pkColumn || 'id',
      pkValue: values[0],
      pkValues: values
    });
  }, [matrixData, selectedTableName]);

  // Execute Delete
  const handleExecuteDelete = useCallback(async ({ cascade = true, pkValues } = {}) => {
    setIsDeleting(true);
    const valuesToDelete = (Array.isArray(pkValues) && pkValues.length > 0) ? pkValues : deleteModal.pkValues;

    try {
      if (deleteModal.targetType === 'master') {
        const res = await deleteMasterRowApi({
          masterId: Number(selectedMasterId),
          tableName: deleteModal.tableName,
          pkColumn: deleteModal.pkColumn,
          pkValues: valuesToDelete,
          cascade
        });
        if (typeof onSuccess === 'function') {
          onSuccess(`Sukses! ${res.deletedCount || valuesToDelete.length} baris data berhasil di-Hard Delete dari Master Database${cascade && res.cascadeCount > 0 ? ` (+${res.cascadeCount} data relasi)` : ''}.`);
        }
        setMatrixData(prev => applyOptimisticMasterDelete(prev, deleteModal.pkColumn, valuesToDelete, res.deletedCount));
      } else {
        const res = await deletePodRowApi({
          serverId: Number(deleteModal.serverId),
          serverIds: deleteModal.serverIds || [Number(deleteModal.serverId)],
          tableName: deleteModal.tableName,
          pkColumn: deleteModal.pkColumn,
          pkValues: valuesToDelete,
          cascade
        });
        if (typeof onSuccess === 'function') {
          onSuccess(`Sukses! ${res.deletedCount || valuesToDelete.length} baris data berhasil di-Hard Delete dari ${deleteModal.targetName}${cascade && res.cascadeCount > 0 ? ` (+${res.cascadeCount} data relasi)` : ''}.`);
        }
        setMatrixData(prev => applyOptimisticPodDelete(prev, deleteModal.pkColumn, valuesToDelete, deleteModal.serverIds || [Number(deleteModal.serverId)], res.deletedCount));
      }

      setDeleteModal(prev => ({ ...prev, isOpen: false }));
      if (typeof onRefreshCurrentMatrix === 'function') {
        onRefreshCurrentMatrix(true);
      }
    } catch (err) {
      if (typeof onError === 'function') onError(err.message || 'Gagal menghapus baris data.');
    } finally {
      setIsDeleting(false);
    }
  }, [deleteModal, selectedMasterId, onSuccess, setMatrixData, onRefreshCurrentMatrix, onError]);

  // Single Row Sync Handlers (Master ➔ POD)
  const handlePromptSyncSingleRowMaster = useCallback(({ pkColumn, pkValue, rowData }) => {
    const onlineIds = (matrixData?.pods || []).filter(p => p.isOnline).map(p => p.id);
    setSingleRowSyncModal({
      isOpen: true,
      pkColumn: pkColumn || 'id',
      pkValue,
      rowData,
      targetPodIds: onlineIds
    });
  }, [matrixData]);

  const handleExecuteSingleRowSyncModal = useCallback(async () => {
    if (!selectedMasterId || !selectedTableName || singleRowSyncModal.targetPodIds.length === 0) {
      if (typeof onError === 'function') onError('Pilih minimal 1 unit target POD online.');
      return;
    }

    setIsSingleRowSyncing(true);
    try {
      const res = await syncSingleMasterRowApi({
        masterId: Number(selectedMasterId),
        tableName: selectedTableName,
        pkColumn: singleRowSyncModal.pkColumn,
        pkValue: singleRowSyncModal.pkValue,
        targetPodIds: singleRowSyncModal.targetPodIds
      });

      if (typeof onSuccess === 'function') {
        onSuccess(`Sukses! Baris (${singleRowSyncModal.pkColumn} = ${singleRowSyncModal.pkValue}) berhasil disinkronkan ke ${res.successfulTargets} unit POD.`);
      }
      setSingleRowSyncModal(prev => ({ ...prev, isOpen: false }));
      setMatrixData(prev => applyOptimisticSingleRowMasterToPod(prev, singleRowSyncModal.pkColumn, singleRowSyncModal.pkValue, singleRowSyncModal.targetPodIds));
      if (typeof onRefreshCurrentMatrix === 'function') {
        onRefreshCurrentMatrix(true);
      }
    } catch (err) {
      if (typeof onError === 'function') onError(err.message || 'Gagal menyinkronkan 1 baris data ke POD.');
    } finally {
      setIsSingleRowSyncing(false);
    }
  }, [selectedMasterId, selectedTableName, singleRowSyncModal, onSuccess, setMatrixData, onRefreshCurrentMatrix, onError]);

  const handleQuickSyncSingleRowToSpecificPod = useCallback(async ({ serverId, serverName, pkColumn, pkValue }) => {
    try {
      await syncSingleMasterRowApi({
        masterId: Number(selectedMasterId),
        tableName: selectedTableName,
        pkColumn: pkColumn || 'id',
        pkValue,
        targetPodIds: [serverId]
      });

      if (typeof onSuccess === 'function') {
        onSuccess(`Sukses! 1 baris data (${pkColumn} = ${pkValue}) berhasil disinkronkan ke ${serverName || 'POD'}.`);
      }
      setMatrixData(prev => applyOptimisticSingleRowMasterToPod(prev, pkColumn || 'id', pkValue, [serverId]));
      if (typeof onRefreshCurrentMatrix === 'function') {
        onRefreshCurrentMatrix(true);
      }
    } catch (err) {
      if (typeof onError === 'function') onError(err.message || `Gagal menyinkronkan baris ke ${serverName}: ${err.message}`);
    }
  }, [selectedMasterId, selectedTableName, onSuccess, setMatrixData, onRefreshCurrentMatrix, onError]);

  // Pull all data from POD to Master (POD ➔ Master)
  const handleSyncPodToMaster = useCallback(async (pod) => {
    const masterObj = masterDatabases.find(d => String(d.id) === String(selectedMasterId));

    setProgressModal({
      isOpen: true,
      direction: 'pod_to_master',
      isProcessing: true,
      title: `Penarikan Data: ${pod.name} ➔ Master DB`,
      tableName: selectedTableName,
      sourceName: pod.name,
      targetName: masterObj?.name || 'Master DB',
      progressPercent: 35,
      currentStatusText: `Menghubungkan & mengambil seluruh data dari ${pod.name}...`,
      report: null
    });

    try {
      const res = await syncPodToMasterApi({
        masterId: Number(selectedMasterId),
        serverId: Number(pod.id),
        tableName: selectedTableName,
        dryRun: false
      });

      setMatrixData(prev => applyOptimisticPodToMasterSync(prev, pod.id));

      setProgressModal(prev => ({
        ...prev,
        isProcessing: false,
        progressPercent: 100,
        currentStatusText: 'Data Berhasil Disinkronkan ke Master DB!',
        report: {
          ...res,
          success: true,
          totalRowsProcessed: res.rowsProcessed || 0
        }
      }));

      if (typeof onSuccess === 'function') {
        onSuccess(`Sukses! ${res.rowsProcessed || 0} baris dari ${pod.name} berhasil ditarik dan disinkronkan ke Master Database.`);
      }
      if (typeof onRefreshCurrentMatrix === 'function') {
        onRefreshCurrentMatrix(true);
      }
      return res;
    } catch (err) {
      if (typeof onError === 'function') onError(err.message || `Gagal menarik data dari ${pod.name}: ${err.message}`);
      setProgressModal(prev => ({
        ...prev,
        isProcessing: false,
        progressPercent: 100,
        currentStatusText: 'Gagal Menarik Data',
        report: {
          success: false,
          serverName: pod.name,
          error: err.message,
          totalRowsProcessed: 0
        }
      }));
      throw err;
    }
  }, [masterDatabases, selectedMasterId, selectedTableName, setMatrixData, onSuccess, onRefreshCurrentMatrix, onError]);

  // Pull single row from POD to Master (POD ➔ Master)
  const handleSyncSinglePodRowToMaster = useCallback(async ({ serverId, serverIds, serverName, pkColumn, pkValue, rowData }) => {
    const targetIds = Array.isArray(serverIds) && serverIds.length > 0
      ? serverIds.map(Number)
      : (serverId ? [Number(serverId)] : (matrixData?.pods || []).map(p => Number(p.id)));

    try {
      const res = await syncSinglePodRowApi({
        masterId: Number(selectedMasterId),
        serverId: targetIds[0],
        serverIds: targetIds,
        tableName: selectedTableName,
        pkColumn: pkColumn || 'id',
        pkValue,
        rowData
      });

      if (typeof onSuccess === 'function') {
        onSuccess(`Sukses! Baris (${pkColumn || 'id'} = ${pkValue}) dari ${serverName || res?.serverName || 'POD'} berhasil di-upload ke Master DB.`);
      }
      setMatrixData(prev => applyOptimisticSinglePodRowToMaster(prev, pkColumn, pkValue));
      if (typeof onRefreshCurrentMatrix === 'function') {
        onRefreshCurrentMatrix(true);
      }
      return res;
    } catch (err) {
      if (typeof onError === 'function') onError(err.message || `Gagal mengupload baris dari ${serverName || 'POD'}: ${err.message}`);
      throw err;
    }
  }, [selectedMasterId, selectedTableName, matrixData, onSuccess, setMatrixData, onRefreshCurrentMatrix, onError]);

  // Bulk Upload Multiple Selected Rows from POD to Master (POD ➔ Master)
  const handleBulkSyncPodRowsToMaster = useCallback(async (selectedRowsList, pkColumn) => {
    if (!Array.isArray(selectedRowsList) || selectedRowsList.length === 0) return;

    const masterObj = masterDatabases.find(d => String(d.id) === String(selectedMasterId));
    const totalCount = selectedRowsList.length;

    setProgressModal({
      isOpen: true,
      direction: 'pod_to_master',
      isProcessing: true,
      title: `Upload ${totalCount} Baris Data: POD ➔ Master`,
      tableName: selectedTableName,
      sourceName: `${totalCount} Baris Terpilih`,
      targetName: masterObj?.name || 'Master DB',
      progressPercent: 5,
      currentStatusText: `Menyiapkan proses upload ${totalCount} baris data ke Master DB...`,
      report: null
    });

    const results = [];
    let successCount = 0;
    let failCount = 0;
    const syncedKeys = [];

    for (let i = 0; i < totalCount; i++) {
      const r = selectedRowsList[i];
      const pkVal = r[pkColumn] !== undefined ? r[pkColumn] : r.__rowKey;
      const sId = r.__podIds?.[0] || r.__originPodId;
      const sIds = r.__podIds || (r.__originPodId ? [r.__originPodId] : (matrixData?.pods || []).map(p => Number(p.id)));
      const sName = r.__podSources?.join(', ') || r.__originPodName || 'POD';

      const pct = Math.round(((i + 1) / totalCount) * 100);
      setProgressModal(prev => ({
        ...prev,
        progressPercent: pct,
        currentStatusText: `[${i + 1}/${totalCount}] Mengupload ID: ${pkVal} dari ${sName}...`
      }));

      try {
        await syncSinglePodRowApi({
          masterId: Number(selectedMasterId),
          serverId: sId || sIds[0],
          serverIds: sIds,
          tableName: selectedTableName,
          pkColumn: pkColumn || 'id',
          pkValue: pkVal,
          rowData: r
        });
        successCount++;
        if (pkVal !== undefined) syncedKeys.push(String(pkVal));
        if (r.__rowKey !== undefined) syncedKeys.push(String(r.__rowKey));
        if (pkColumn && r[pkColumn] !== undefined) syncedKeys.push(String(r[pkColumn]));
        if (r.id !== undefined) syncedKeys.push(String(r.id));
        if (r.key !== undefined) syncedKeys.push(String(r.key));
        if (r.topic !== undefined) syncedKeys.push(String(r.topic));
        if (r.code !== undefined) syncedKeys.push(String(r.code));

        results.push({
          serverName: `${sName} (ID: ${pkVal})`,
          success: true,
          rowsSynced: 1,
          logs: [`Baris ${pkVal} berhasil di-upload dari ${sName} ke Master DB.`]
        });
      } catch (err) {
        failCount++;
        results.push({
          serverName: `${sName} (ID: ${pkVal})`,
          success: false,
          rowsSynced: 0,
          error: err.message,
          logs: [`Gagal mengupload baris ${pkVal}: ${err.message}`]
        });
      }
    }

    // Optimistic Instant UI Update
    if (syncedKeys.length > 0) {
      setMatrixData(prev => applyOptimisticBulkPodRowsToMaster(prev, syncedKeys, pkColumn, successCount));
    }

    setProgressModal(prev => ({
      ...prev,
      isProcessing: false,
      progressPercent: 100,
      currentStatusText: `Selesai! ${successCount} baris berhasil di-upload${failCount > 0 ? `, ${failCount} gagal` : ''}.`,
      report: {
        success: failCount === 0,
        totalRowsProcessed: totalCount,
        successfulTargets: successCount,
        failedTargets: failCount,
        results
      }
    }));

    if (typeof onSuccess === 'function') {
      onSuccess(`Sukses! ${successCount} baris data berhasil di-upload ke Master DB${failCount > 0 ? ` (${failCount} gagal)` : ''}.`);
    }
  }, [masterDatabases, selectedMasterId, selectedTableName, matrixData, setMatrixData, onSuccess]);

  return {
    // Modal states
    syncModalOpen,
    setSyncModalOpen,
    targetPodIds,
    setTargetPodIds,
    dryRun,
    setDryRun,
    syncColumns,
    setSyncColumns,
    isSyncing,
    progressModal,
    setProgressModal,
    singleRowSyncModal,
    setSingleRowSyncModal,
    isSingleRowSyncing,
    deleteModal,
    setDeleteModal,
    isDeleting,

    // Handlers
    triggerBulkSync,
    triggerSinglePodSync,
    handlePerformSync,
    handleUpdateMasterRow,
    handlePromptDeleteMasterRow,
    handlePromptDeletePodRow,
    handleExecuteDelete,
    handlePromptSyncSingleRowMaster,
    handleExecuteSingleRowSyncModal,
    handleQuickSyncSingleRowToSpecificPod,
    handleSyncPodToMaster,
    handleSyncSinglePodRowToMaster,
    handleBulkSyncPodRowsToMaster
  };
}
