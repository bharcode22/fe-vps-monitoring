import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  RefreshCw,
  Zap,
  CheckCircle2,
  Table,
  Layers,
  Database,
  Activity,
  Sparkles
} from 'lucide-react';
import {
  fetchMasterDatabasesApi,
  fetchMasterTablesApi,
  fetchMasterTableFastApi,
  fetchSinglePodComparisonApi,
  fetchMasterTableMatrixApi,
  fetchFleetAuditApi,
  performMasterSyncApi,
  deleteMasterRowApi,
  deletePodRowApi,
  syncSingleMasterRowApi,
  syncPodToMasterApi,
  syncSinglePodRowApi
} from '../api/masterPodSyncApi';
import MasterTablesCatalogView from '../components/masterPodSync/MasterTablesCatalogView';
import FleetSyncAuditView from '../components/masterPodSync/FleetSyncAuditView';
import TableDetailWorkspaceView from '../components/masterPodSync/TableDetailWorkspaceView';
import MasterPodSyncModal from '../components/masterPodSync/MasterPodSyncModal';
import MasterPodSkeleton from '../components/masterPodSync/MasterPodSkeleton';
import DeleteRowConfirmationModal from '../components/masterPodSync/DeleteRowConfirmationModal';
import SingleRowSyncModal from '../components/masterPodSync/SingleRowSyncModal';
import SyncProgressReportModal from '../components/masterPodSync/SyncProgressReportModal';

export default function MasterPodSyncMatrixPage({ onBack }) {
  // View mode: 'catalog' (Level 1: Tables Grid) | 'audit' (Level 1B: Fleet Audit) | 'detail' (Level 2: Detail Workspace)
  const [viewMode, setViewMode] = useState('catalog');

  // Master Databases & Tables State
  const [masterDatabases, setMasterDatabases] = useState([]);
  const [selectedMasterId, setSelectedMasterId] = useState('');
  const [tables, setTables] = useState([]);
  const [selectedTableName, setSelectedTableName] = useState('');
  const [isLoadingTables, setIsLoadingTables] = useState(false);

  // Fleet Audit State
  const [auditData, setAuditData] = useState(null);
  const [isLoadingAudit, setIsLoadingAudit] = useState(false);

  // Active POD for Level 2 inspection
  const [activePodId, setActivePodId] = useState(null);
  const [loadingPodId, setLoadingPodId] = useState(null);

  // Matrix Comparison State
  const [matrixData, setMatrixData] = useState(null);
  const [isComparing, setIsComparing] = useState(false);
  const [isComparingAll, setIsComparingAll] = useState(false);

  // Sync Modal State (Bulk/Table Sync)
  const [syncModalOpen, setSyncModalOpen] = useState(false);
  const [targetPodIds, setTargetPodIds] = useState([]);
  const [dryRun, setDryRun] = useState(false);
  const [syncColumns, setSyncColumns] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);

  // Progress & Result Breakdown Modal State
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
    pkValue: null,
    pkValues: []
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

  // 2B. Fetch Fleet Audit Data across all 95 tables & all PODs
  const loadFleetAudit = async (masterId) => {
    if (!masterId) return;
    setIsLoadingAudit(true);
    setError('');
    try {
      const data = await fetchFleetAuditApi(masterId);
      setAuditData(data);
    } catch (err) {
      setError(err.message || 'Gagal memindai disparitas armada.');
    } finally {
      setIsLoadingAudit(false);
    }
  };

  useEffect(() => {
    if (selectedMasterId) {
      loadMasterTables(selectedMasterId);
      if (viewMode === 'audit') {
        loadFleetAudit(selectedMasterId);
      }
    }
  }, [selectedMasterId, viewMode]);

  // 3. Open Detail Workspace for a specific Table (Fast Load < 50ms + 1 POD Option A)
  const handleOpenTableDetail = async (tableName) => {
    setSelectedTableName(tableName);
    setViewMode('detail');
    setMatrixData(null);
    setIsComparing(true);
    setError('');

    try {
      // 1. Fast Load Master Table & POD List (<50ms)
      const fastData = await fetchMasterTableFastApi(selectedMasterId, tableName);
      setMatrixData(fastData);
      setIsComparing(false);

      // 2. Select 1st ONLINE POD (Option A) and compare ONLY that POD
      if (fastData?.pods?.length > 0) {
        const firstOnlinePod = fastData.pods.find(p => p.isOnline) || fastData.pods[0];
        setActivePodId(firstOnlinePod.id);
        if (firstOnlinePod.isOnline) {
          loadSinglePodComparison(tableName, firstOnlinePod.id);
        }
      }
    } catch (err) {
      setError(err.message || 'Gagal memuat data tabel master.');
      setIsComparing(false);
    }
  };

  // 3B. Load comparison on-demand for a single POD (~200ms)
  const loadSinglePodComparison = async (tableName, podId) => {
    const tbl = tableName || selectedTableName || matrixData?.master?.tableName;
    if (!selectedMasterId || !tbl || !podId) return;
    setLoadingPodId(podId);
    try {
      const result = await fetchSinglePodComparisonApi(selectedMasterId, tbl, podId);
      if (result?.success && result.podSummary) {
        setMatrixData(prev => {
          if (!prev) return prev;

          // Update pods array
          const updatedPods = (prev.pods || []).map(p => {
            if (String(p.id) === String(podId)) {
              return { ...p, ...result.podSummary, hasCompared: true };
            }
            return p;
          });

          // Update columnsMatrix
          const updatedColumns = (prev.columnsMatrix || []).map(col => {
            const colPresence = result.columnPresenceMap?.[col.columnName] || { isOnline: false, exists: false, typeMatch: false };
            return {
              ...col,
              presence: {
                ...(col.presence || {}),
                [podId]: colPresence
              }
            };
          });

          // Update dataMatrix presence
          const updatedDataMatrix = (prev.dataMatrix || []).map(item => {
            const presence = result.dataPresenceMap?.[item.rowKey] || { isOnline: false, present: false };
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
            const existingKeys = new Set(updatedDataMatrix.map(d => d.rowKey));
            result.podOnlyRows.forEach(por => {
              if (!existingKeys.has(por.rowKey)) {
                updatedDataMatrix.push(por);
              }
            });
          }

          // Recalculate quick summary for loaded pods
          const onlinePods = updatedPods.filter(p => p.isOnline).length;
          const syncedPods = updatedPods.filter(p => p.status === 'SYNCED').length;
          const mismatchPods = updatedPods.filter(p => p.isOnline && p.status !== 'SYNCED' && p.status !== 'NOT_LOADED').length;

          return {
            ...prev,
            pods: updatedPods,
            columnsMatrix: updatedColumns,
            dataMatrix: updatedDataMatrix,
            summary: {
              ...prev.summary,
              onlinePods,
              syncedPods,
              mismatchPods
            }
          };
        });
      }
    } catch (err) {
      console.error(`[Single POD Compare Error]:`, err);
    } finally {
      setLoadingPodId(null);
    }
  };

  // 3C. Select POD handler (triggers on-demand load if not yet compared)
  const handleSelectPod = (podId) => {
    setActivePodId(podId);
    const tbl = selectedTableName || matrixData?.master?.tableName;
    const targetPod = (matrixData?.pods || []).find(p => String(p.id) === String(podId));
    
    // Check if this POD has already been compared (tableExists is non-null and rowCount is non-null and status is not NOT_LOADED)
    const isAlreadyCompared = targetPod && targetPod.tableExists !== null && targetPod.rowCount !== null && targetPod.status !== 'NOT_LOADED';
    
    if (!isAlreadyCompared && tbl) {
      loadSinglePodComparison(tbl, podId);
    }
  };

  // 3D. Full fleet comparison across all PODs (opt-in)
  const handleCompareAllPods = async () => {
    if (!selectedMasterId || !selectedTableName) return;
    setIsComparingAll(true);
    setError('');
    try {
      const fullData = await fetchMasterTableMatrixApi(selectedMasterId, selectedTableName);
      setMatrixData(fullData);
    } catch (err) {
      setError(err.message || 'Gagal membandingkan seluruh armada POD.');
    } finally {
      setIsComparingAll(false);
    }
  };

  // 4. Refresh Current Matrix (reloads Master + active POD)
  const handleRefreshCurrentMatrix = async (isSoft = false) => {
    if (!selectedMasterId || !selectedTableName) return;
    if (!isSoft && !matrixData) {
      setIsComparing(true);
    }
    setError('');
    try {
      const fastData = await fetchMasterTableFastApi(selectedMasterId, selectedTableName);
      setMatrixData(fastData);
      if (activePodId) {
        loadSinglePodComparison(selectedTableName, activePodId);
      }
    } catch (err) {
      if (!isSoft) {
        setError(err.message || 'Gagal memuat ulang data.');
      }
    } finally {
      setIsComparing(false);
    }
  };

  // 5. Bulk Sync Modal Handlers
  const triggerBulkSync = () => {
    const mismatchIds = (matrixData?.pods || [])
      .filter(p => p.isOnline && p.status !== 'SYNCED')
      .map(p => p.id);

    setTargetPodIds(mismatchIds);
    setSyncModalOpen(true);
  };

  const triggerSinglePodSync = (podId) => {
    setTargetPodIds([podId]);
    setSyncModalOpen(true);
  };

  const handlePerformSync = async () => {
    if (!selectedMasterId || !selectedTableName || targetPodIds.length === 0) {
      setError('Parameter sinkronisasi belum lengkap.');
      return;
    }

    const masterObj = masterDatabases.find(d => String(d.id) === String(selectedMasterId));
    setSyncModalOpen(false);
    setIsSyncing(true);
    setError('');

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

      // 🚀 Optimistic Instant UI Update (Zero reload, no delay!)
      if (!dryRun) {
        setMatrixData(prev => {
          if (!prev) return prev;
          const successfulTargetIds = new Set(
            (result?.results || [])
              .filter(r => r.success)
              .map(r => Number(r.serverId))
          );
          if (successfulTargetIds.size === 0) return prev;

          // 1. Update POD status & row count
          const masterRowCount = prev.master?.rowCount || 0;
          const updatedPods = (prev.pods || []).map(p => {
            if (successfulTargetIds.has(Number(p.id))) {
              return {
                ...p,
                status: 'SYNCED',
                rowCount: masterRowCount
              };
            }
            return p;
          });

          // 2. Update presence for Master rows in dataMatrix
          const updatedDataMatrix = (prev.dataMatrix || []).map(item => {
            if (item.inMaster) {
              const updatedPresence = { ...(item.presence || {}) };
              let newPresentCount = item.presentCount || 0;
              for (const pId of successfulTargetIds) {
                if (!updatedPresence[pId] || !updatedPresence[pId].present) {
                  updatedPresence[pId] = { isOnline: true, present: true };
                  newPresentCount++;
                }
              }
              return {
                ...item,
                presence: updatedPresence,
                presentCount: Math.min(newPresentCount, prev.pods?.length || newPresentCount)
              };
            }
            return item;
          });

          // 3. Update columns presence if syncColumns was enabled
          const updatedColumns = (prev.columns || []).map(col => {
            const updatedColPresence = { ...(col.presence || {}) };
            let colPresentCount = col.presentCount || 0;
            for (const pId of successfulTargetIds) {
              if (!updatedColPresence[pId] || !updatedColPresence[pId].exists) {
                updatedColPresence[pId] = {
                  isOnline: true,
                  exists: true,
                  typeMatch: true,
                  podType: col.dataType
                };
                colPresentCount++;
              }
            }
            return {
              ...col,
              presence: updatedColPresence,
              presentCount: Math.min(colPresentCount, prev.pods?.length || colPresentCount)
            };
          });

          return {
            ...prev,
            pods: updatedPods,
            dataMatrix: updatedDataMatrix,
            columns: updatedColumns
          };
        });
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

      setSuccessMsg(
        dryRun
          ? `Simulasi selesai: Berhasil disimulasikan ke ${targetPodIds.length} target POD.`
          : `Sinkronisasi Live Berhasil! ${result.successfulTargets || 0} POD berhasil diperbarui (${totalSynced} baris data disinkronkan).`
      );
      setTimeout(() => setSuccessMsg(''), 6000);
      handleRefreshCurrentMatrix(true);
    } catch (err) {
      setError(err.message || 'Gagal mengeksekusi sinkronisasi.');
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
  };

  // 6. Delete Row Handlers (Single & Bulk with Cascade)
  const handlePromptDeleteMasterRow = ({ pkColumn, pkValue, pkValues }) => {
    const master = masterDatabases.find(d => String(d.id) === String(selectedMasterId));
    const values = Array.isArray(pkValues) && pkValues.length > 0 ? pkValues : (pkValue !== undefined ? [pkValue] : []);
    setDeleteModal({
      isOpen: true,
      targetType: 'master',
      targetName: master ? master.name : 'Master DB',
      serverHost: master ? `${master.host}:${master.port || 5432}` : '',
      serverId: null,
      tableName: selectedTableName,
      pkColumn: pkColumn || matrixData?.master?.pkColumn || 'id',
      pkValue: values[0],
      pkValues: values
    });
  };

  const handlePromptDeletePodRow = ({ serverId, serverIds, serverName, pkColumn, pkValue, pkValues }) => {
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
  };

  const handleExecuteDelete = async ({ cascade = true, pkValues } = {}) => {
    setIsDeleting(true);
    setError('');
    const valuesToDelete = (Array.isArray(pkValues) && pkValues.length > 0) ? pkValues : deleteModal.pkValues;
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
        setSuccessMsg(`Sukses! ${res.deletedCount || valuesToDelete.length} baris data berhasil di-Hard Delete dari Master Database${cascade && res.cascadeCount > 0 ? ` (+${res.cascadeCount} data relasi)` : ''}.`);

        // 🚀 Optimistic Instant State Update (Purged from Master & All PODs!)
        setMatrixData(prev => {
          if (!prev) return prev;
          const updatedDataMatrix = (prev.dataMatrix || []).filter(item => {
            const pkVal = item.sampleData?.[deleteModal.pkColumn] !== undefined ? item.sampleData[deleteModal.pkColumn] : item.rowKey;
            const key = String(pkVal);
            if (keysSet.has(key)) {
              return false; // Purged from Master and all PODs
            }
            return true;
          });

          const updatedPods = (prev.pods || []).map(p => {
            return {
              ...p,
              rowCount: Math.max(0, (p.rowCount || 0) - (res.deletedCount || valuesToDelete.length))
            };
          });

          return {
            ...prev,
            master: {
              ...prev.master,
              rowCount: Math.max(0, (prev.master?.rowCount || 0) - (res.deletedCount || valuesToDelete.length))
            },
            pods: updatedPods,
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
        setSuccessMsg(`Sukses! ${res.deletedCount || valuesToDelete.length} baris data berhasil di-Hard Delete dari ${deleteModal.targetName}${cascade && res.cascadeCount > 0 ? ` (+${res.cascadeCount} data relasi)` : ''}.`);

        // 🚀 Optimistic Instant State Update (No full matrix reload!)
        setMatrixData(prev => {
          if (!prev) return prev;
          const targetIdsSet = new Set((deleteModal.serverIds || [Number(deleteModal.serverId)]).map(Number));

          const updatedDataMatrix = (prev.dataMatrix || []).filter(item => {
            const pkVal = item.sampleData?.[deleteModal.pkColumn] !== undefined ? item.sampleData[deleteModal.pkColumn] : item.rowKey;
            const key = String(pkVal);
            if (keysSet.has(key)) {
              if (item.isPodOnly || !item.inMaster) {
                return false;
              }
              if (item.presence) {
                for (const sId of targetIdsSet) {
                  if (item.presence[sId] && item.presence[sId].present) {
                    item.presence[sId] = { isOnline: true, present: false };
                    item.presentCount = Math.max(0, item.presentCount - 1);
                  }
                }
              }
            }
            return true;
          });

          const updatedPods = (prev.pods || []).map(p => {
            if (targetIdsSet.has(Number(p.id))) {
              return {
                ...p,
                rowCount: Math.max(0, (p.rowCount || 0) - (res.deletedCount || valuesToDelete.length))
              };
            }
            return p;
          });

          return {
            ...prev,
            pods: updatedPods,
            dataMatrix: updatedDataMatrix
          };
        });
      }

      setDeleteModal(prev => ({ ...prev, isOpen: false }));
      setTimeout(() => setSuccessMsg(''), 6000);
      handleRefreshCurrentMatrix(true);
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

      // 🚀 Optimistic Instant State Update (No full matrix reload!)
      setMatrixData(prev => {
        if (!prev) return prev;
        const targetSet = new Set(singleRowSyncModal.targetPodIds.map(Number));
        const strKey = String(singleRowSyncModal.pkValue);

        const updatedDataMatrix = (prev.dataMatrix || []).map(item => {
          const pkVal = item.sampleData?.[singleRowSyncModal.pkColumn] !== undefined ? item.sampleData[singleRowSyncModal.pkColumn] : item.rowKey;
          if (String(pkVal) === strKey) {
            const updatedPresence = { ...(item.presence || {}) };
            let count = item.presentCount || 0;
            for (const pId of targetSet) {
              if (!updatedPresence[pId] || !updatedPresence[pId].present) {
                updatedPresence[pId] = { isOnline: true, present: true };
                count++;
              }
            }
            return {
              ...item,
              presence: updatedPresence,
              presentCount: Math.min(count, prev.pods?.length || count)
            };
          }
          return item;
        });

        const updatedPods = (prev.pods || []).map(p => {
          if (targetSet.has(Number(p.id))) {
            return {
              ...p,
              rowCount: (p.rowCount || 0) + 1
            };
          }
          return p;
        });

        return {
          ...prev,
          pods: updatedPods,
          dataMatrix: updatedDataMatrix
        };
      });

      setTimeout(() => setSuccessMsg(''), 6000);
      handleRefreshCurrentMatrix(true);
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

      // 🚀 Optimistic Instant State Update (No full matrix reload!)
      setMatrixData(prev => {
        if (!prev) return prev;
        const targetId = Number(serverId);
        const strKey = String(pkValue);

        const updatedDataMatrix = (prev.dataMatrix || []).map(item => {
          const pkVal = item.sampleData?.[pkColumn || 'id'] !== undefined ? item.sampleData[pkColumn || 'id'] : item.rowKey;
          if (String(pkVal) === strKey) {
            const updatedPresence = { ...(item.presence || {}) };
            let count = item.presentCount || 0;
            if (!updatedPresence[targetId] || !updatedPresence[targetId].present) {
              updatedPresence[targetId] = { isOnline: true, present: true };
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

        const updatedPods = (prev.pods || []).map(p => {
          if (Number(p.id) === targetId) {
            return {
              ...p,
              rowCount: (p.rowCount || 0) + 1
            };
          }
          return p;
        });

        return {
          ...prev,
          pods: updatedPods,
          dataMatrix: updatedDataMatrix
        };
      });

      setTimeout(() => setSuccessMsg(''), 6000);
      handleRefreshCurrentMatrix(true);
    } catch (err) {
      setError(err.message || `Gagal menyinkronkan baris ke ${serverName}: ${err.message}`);
    }
  };

  // D. Pull all data from POD to Master (POD ➔ Master)
  const handleSyncPodToMaster = async (pod) => {
    setError('');
    const masterObj = masterDatabases.find(d => String(d.id) === String(selectedMasterId));

    // Open Live Progress Modal
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

      // 🚀 Optimistic Instant State Update (Zero reload, instant update!)
      setMatrixData(prev => {
        if (!prev) return prev;
        const targetPodId = Number(pod.id);

        let addedToMasterCount = 0;
        const updatedDataMatrix = (prev.dataMatrix || []).map(item => {
          if (item.presence?.[targetPodId]?.present) {
            if (!item.inMaster) {
              addedToMasterCount++;
            }
            return {
              ...item,
              inMaster: true,
              isPodOnly: false
            };
          }
          return item;
        });

        return {
          ...prev,
          master: {
            ...prev.master,
            rowCount: (prev.master?.rowCount || 0) + addedToMasterCount
          },
          dataMatrix: updatedDataMatrix
        };
      });

      // Update Finished Report Modal
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

      setSuccessMsg(`Sukses! ${res.rowsProcessed || 0} baris dari ${pod.name} berhasil ditarik dan disinkronkan ke Master Database.`);
      setTimeout(() => setSuccessMsg(''), 6000);
      handleRefreshCurrentMatrix(true);
      return res;
    } catch (err) {
      setError(err.message || `Gagal menarik data dari ${pod.name}: ${err.message}`);
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
  };

  // E. Pull 1 single row from POD to Master (POD ➔ Master)
  const handleSyncSinglePodRowToMaster = async ({ serverId, serverIds, serverName, pkColumn, pkValue, rowData }) => {
    setError('');
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

      setSuccessMsg(`Sukses! Baris (${pkColumn || 'id'} = ${pkValue}) dari ${serverName || res?.serverName || 'POD'} berhasil di-upload ke Master DB.`);
      setTimeout(() => setSuccessMsg(''), 6000);
      handleRefreshCurrentMatrix(true);

      // 🚀 Optimistic Instant Update (Converts POD-only row to Master row instantly!)
      setMatrixData(prev => {
        if (!prev) return prev;
        const strKey = String(pkValue);
        const updatedDataMatrix = (prev.dataMatrix || []).map(item => {
          const itemKey = String(item.rowKey || '');
          const samplePk = item.sampleData && pkColumn && item.sampleData[pkColumn] !== undefined ? String(item.sampleData[pkColumn]) : '';
          const sampleId = item.sampleData && item.sampleData.id !== undefined ? String(item.sampleData.id) : '';
          const sampleKey = item.sampleData && item.sampleData.key !== undefined ? String(item.sampleData.key) : '';
          const sampleTopic = item.sampleData && item.sampleData.topic !== undefined ? String(item.sampleData.topic) : '';
          const sampleCode = item.sampleData && item.sampleData.code !== undefined ? String(item.sampleData.code) : '';

          const isMatch =
            itemKey === strKey ||
            samplePk === strKey ||
            sampleId === strKey ||
            sampleKey === strKey ||
            sampleTopic === strKey ||
            sampleCode === strKey;

          if (isMatch) {
            return {
              ...item,
              inMaster: true,
              isPodOnly: false
            };
          }
          return item;
        });

        const remainingPodOnly = updatedDataMatrix.filter(d => !d.inMaster).length;

        return {
          ...prev,
          master: {
            ...prev.master,
            rowCount: (prev.master?.rowCount || 0) + 1
          },
          dataMatrix: updatedDataMatrix,
          summary: {
            ...prev.summary,
            podOnlyRowsCount: remainingPodOnly
          }
        };
      });

      setTimeout(() => setSuccessMsg(''), 6000);

      return res;
    } catch (err) {
      setError(err.message || `Gagal mengupload baris dari ${serverName || 'POD'}: ${err.message}`);
      throw err;
    }
  };

  // F. Bulk Upload Multiple Selected Rows from POD to Master (POD ➔ Master)
  const handleBulkSyncPodRowsToMaster = async (selectedRowsList, pkColumn) => {
    if (!Array.isArray(selectedRowsList) || selectedRowsList.length === 0) return;
    setError('');

    const masterObj = masterDatabases.find(d => String(d.id) === String(selectedMasterId));
    const totalCount = selectedRowsList.length;

    // Open Live Progress Modal
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

    // 🚀 Optimistic Instant UI Update (Zero reload, no delay!)
    if (syncedKeys.length > 0) {
      const syncedSet = new Set(syncedKeys.map(String));
      setMatrixData(prev => {
        if (!prev) return prev;
        const updatedDataMatrix = (prev.dataMatrix || []).map(item => {
          const itemKey = String(item.rowKey || '');
          const samplePk = item.sampleData && pkColumn && item.sampleData[pkColumn] !== undefined ? String(item.sampleData[pkColumn]) : '';
          const sampleId = item.sampleData && item.sampleData.id !== undefined ? String(item.sampleData.id) : '';
          const sampleKey = item.sampleData && item.sampleData.key !== undefined ? String(item.sampleData.key) : '';
          const sampleTopic = item.sampleData && item.sampleData.topic !== undefined ? String(item.sampleData.topic) : '';
          const sampleCode = item.sampleData && item.sampleData.code !== undefined ? String(item.sampleData.code) : '';

          const isMatch =
            (itemKey && syncedSet.has(itemKey)) ||
            (samplePk && syncedSet.has(samplePk)) ||
            (sampleId && syncedSet.has(sampleId)) ||
            (sampleKey && syncedSet.has(sampleKey)) ||
            (sampleTopic && syncedSet.has(sampleTopic)) ||
            (sampleCode && syncedSet.has(sampleCode));

          if (isMatch) {
            return {
              ...item,
              inMaster: true,
              isPodOnly: false
            };
          }
          return item;
        });

        const remainingPodOnly = updatedDataMatrix.filter(d => !d.inMaster).length;

        return {
          ...prev,
          master: {
            ...prev.master,
            rowCount: (prev.master?.rowCount || 0) + successCount
          },
          dataMatrix: updatedDataMatrix,
          summary: {
            ...prev.summary,
            podOnlyRowsCount: remainingPodOnly
          }
        };
      });
    }

    // Update Finished Report Modal
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

    setSuccessMsg(`Sukses! ${successCount} baris data berhasil di-upload ke Master DB${failCount > 0 ? ` (${failCount} gagal)` : ''}.`);
    setTimeout(() => setSuccessMsg(''), 6000);
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
              } else if (viewMode === 'audit') {
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
                {viewMode === 'catalog'
                  ? 'Katalog Master'
                  : viewMode === 'audit'
                    ? '🔍 Audit Disparitas 95 Tabel'
                    : `Tabel: ${selectedTableName}`}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Audit Keselarasan Skema Kolom &amp; Baris Data dari <strong className="text-cyan-300">Database Master</strong> ke seluruh armada <strong className="text-purple-300">POD V3</strong>
            </p>
          </div>
        </div>

        {/* Global Action: Mode Switcher / Refresh */}
        <div className="flex items-center gap-2.5 flex-wrap">
          {/* View Mode Switcher (Catalog vs Fleet Audit) */}
          {viewMode !== 'detail' && (
            <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 shadow-inner">
              <button
                onClick={() => setViewMode('catalog')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${viewMode === 'catalog'
                  ? 'bg-purple-500/25 text-purple-300 border border-purple-500/40 shadow-sm'
                  : 'text-slate-400 hover:text-white'
                  }`}
              >
                <Table size={13} />
                <span>Katalog ({tables.length})</span>
              </button>

              <button
                onClick={() => {
                  setViewMode('audit');
                  if (!auditData) loadFleetAudit(selectedMasterId);
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${viewMode === 'audit'
                  ? 'bg-cyan-500/25 text-cyan-300 border border-cyan-500/40 shadow-sm'
                  : 'text-slate-400 hover:text-white'
                  }`}
              >
                <Activity size={13} className="text-cyan-400" />
                <span>Audit Tabel</span>
                {auditData?.summary?.discrepantTables > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full bg-amber-500/30 text-amber-300 text-[10px] font-mono">
                    {auditData.summary.discrepantTables}
                  </span>
                )}
              </button>
            </div>
          )}

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
              else if (viewMode === 'audit') loadFleetAudit(selectedMasterId);
              else loadMasterTables(selectedMasterId);
            }}
            disabled={isLoadingTables || isComparing || isLoadingAudit}
            className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-cyan-400 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors border border-slate-700 cursor-pointer shadow-sm disabled:opacity-50"
          >
            <RefreshCw size={14} className={isLoadingTables || isComparing || isLoadingAudit ? 'animate-spin' : ''} />
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

      {/* VIEW LEVEL 1A: MASTER TABLES CATALOG */}
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

      {/* VIEW LEVEL 1B: FLEET SYNC AUDIT & DISCREPANCY ANALYZER */}
      {viewMode === 'audit' && (
        <FleetSyncAuditView
          masterInfo={masterDatabases.find(d => String(d.id) === String(selectedMasterId))}
          auditData={auditData}
          isLoading={isLoadingAudit}
          onRefreshAudit={() => loadFleetAudit(selectedMasterId)}
          onOpenTableWorkspace={handleOpenTableDetail}
        />
      )}

      {/* VIEW LEVEL 2: TABLE DETAIL WORKSPACE */}
      {viewMode === 'detail' && (
        isComparing && !matrixData ? (
          <MasterPodSkeleton />
        ) : (
          <TableDetailWorkspaceView
            tableName={selectedTableName}
            masterInfo={matrixData?.master}
            matrixData={matrixData}
            isComparing={isComparing}
            loadingPodId={loadingPodId}
            isComparingAll={isComparingAll}
            onCompareAllPods={handleCompareAllPods}
            onRefresh={() => handleRefreshCurrentMatrix(false)}
            onBackToCatalog={() => setViewMode('catalog')}
            activePodId={activePodId}
            setActivePodId={handleSelectPod}
            onQuickSyncPod={triggerSinglePodSync}
            onBulkSync={triggerBulkSync}
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
        )
      )}

      {/* SYNC CONFIRMATION MODAL (BULK / RELATIONAL TABLE SYNC) */}
      {syncModalOpen && (
        <MasterPodSyncModal
          isOpen={syncModalOpen}
          onClose={() => setSyncModalOpen(false)}
          masterId={selectedMasterId}
          tableName={selectedTableName}
          masterInfo={matrixData?.master || masterDatabases.find(d => String(d.id) === String(selectedMasterId))}
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

      {/* MANUAL / BULK DELETE CONFIRMATION MODAL */}
      {deleteModal.isOpen && (
        <DeleteRowConfirmationModal
          isOpen={deleteModal.isOpen}
          onClose={() => setDeleteModal(prev => ({ ...prev, isOpen: false }))}
          targetType={deleteModal.targetType}
          targetName={deleteModal.targetName}
          serverHost={deleteModal.serverHost}
          tableName={deleteModal.tableName}
          pkColumn={deleteModal.pkColumn}
          pkValue={deleteModal.pkValue}
          pkValues={deleteModal.pkValues}
          isDeleting={isDeleting}
          onConfirmDelete={handleExecuteDelete}
        />
      )}

      {/* SYNC PROGRESS & RESULT BREAKDOWN MODAL */}
      {progressModal.isOpen && (
        <SyncProgressReportModal
          isOpen={progressModal.isOpen}
          onClose={() => setProgressModal(prev => ({ ...prev, isOpen: false }))}
          direction={progressModal.direction}
          isProcessing={progressModal.isProcessing}
          title={progressModal.title}
          tableName={progressModal.tableName}
          sourceName={progressModal.sourceName}
          targetName={progressModal.targetName}
          progressPercent={progressModal.progressPercent}
          currentStatusText={progressModal.currentStatusText}
          report={progressModal.report}
        />
      )}
    </div>
  );
}
