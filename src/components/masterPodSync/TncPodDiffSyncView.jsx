import React, { useState, useEffect } from 'react';
import { Database, CheckCircle2, AlertTriangle, DownloadCloud, UploadCloud } from 'lucide-react';
import {
  fetchMasterTableMatrixApi,
  performMasterSyncApi,
  deleteMasterRowApi,
  deletePodRowApi,
  syncSingleMasterRowApi,
  syncPodToMasterApi,
  syncSinglePodRowApi
} from '../../api/masterPodSyncApi';
import TableDetailWorkspaceView from './TableDetailWorkspaceView';
import { TncPodSyncSkeleton } from './MasterPodSkeleton';
import MasterPodSyncModal from './MasterPodSyncModal';
import DeleteRowConfirmationModal from './DeleteRowConfirmationModal';
import SingleRowSyncModal from './SingleRowSyncModal';
import SyncProgressReportModal from './SyncProgressReportModal';

export const TNC_TOP_DOWN_TABLES = [
  { name: 'terms_and_conditions', label: 'terms_and_conditions' },
  { name: 'terms_and_conditions_version', label: 'terms_and_conditions_version' },
  { name: 'terms_and_conditions_questions', label: 'terms_and_conditions_questions' },
  { name: 'terms_and_conditions_question_history', label: 'terms_and_conditions_question_history' },
  { name: 'matrix_user', label: 'matrix_user' },
  { name: 'matrix_user_history', label: 'matrix_user_history' }
];

export const TNC_BOTTOM_UP_TABLES = [
  { name: 'terms_and_conditions_accepted', label: 'terms_and_conditions_accepted' },
  { name: 'terms_and_conditions_accepted_history', label: 'terms_and_conditions_accepted_history' },
  { name: 'terms_and_conditions_answers', label: 'terms_and_conditions_answers' },
  { name: 'terms_and_conditions_answers_history', label: 'terms_and_conditions_answers_history' }
];

export default function TncPodDiffSyncView({
  masterId,
  direction = 'master_to_pod', // 'master_to_pod' | 'pod_to_master'
  tables,
  initialTable,
  onSyncCompleted
}) {
  const activeTables = tables || (direction === 'pod_to_master' ? TNC_BOTTOM_UP_TABLES : TNC_TOP_DOWN_TABLES);
  const defaultTable = initialTable || activeTables[0]?.name || 'terms_and_conditions';
  const [selectedTableName, setSelectedTableName] = useState(defaultTable);
  const [matrixData, setMatrixData] = useState(null);
  const [isComparing, setIsComparing] = useState(false);
  const [activePodId, setActivePodId] = useState(null);

  useEffect(() => {
    if (activeTables.length > 0 && !activeTables.some(t => t.name === selectedTableName)) {
      setSelectedTableName(activeTables[0].name);
      setMatrixData(null);
    }
  }, [direction, activeTables]);

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
    serverIds: [],
    tableName: '',
    pkColumn: 'id',
    pkValue: null,
    pkValues: []
  });
  const [isDeleting, setIsDeleting] = useState(false);

  // Alerts
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    if (masterId) {
      loadComparison(selectedTableName);
    }
  }, [masterId, selectedTableName]);

  const loadComparison = async (tableName, isSoft = false) => {
    if (!isSoft && !matrixData) {
      setIsComparing(true);
    }
    setError('');
    try {
      const data = await fetchMasterTableMatrixApi(masterId, tableName);
      setMatrixData(data);
      if (data?.pods?.length > 0 && !activePodId) {
        setActivePodId(data.pods[0].id);
      }
    } catch (err) {
      console.error('Gagal membandingkan Master dengan POD:', err);
      if (!isSoft) {
        setError(err.message || 'Gagal memuat matriks perbandingan.');
        setMatrixData(null);
      }
    } finally {
      setIsComparing(false);
    }
  };

  // 1. Bulk Sync (Master ➔ Selected PODs)
  const triggerBulkSync = ({ targetPodIds: ids = [], dryRun: isDry = false, syncColumns: syncCols = true } = {}) => {
    const selectedIds = ids.length > 0 ? ids : (matrixData?.pods || []).filter(p => p.isOnline).map(p => p.id);
    setTargetPodIds(selectedIds);
    setDryRun(isDry);
    setSyncColumns(syncCols);
    setSyncModalOpen(true);
  };

  const triggerSinglePodSync = (podId) => {
    setTargetPodIds([podId]);
    setDryRun(false);
    setSyncColumns(true);
    setSyncModalOpen(true);
  };

  const handleExecuteSyncModal = async () => {
    if (!masterId || !selectedTableName || targetPodIds.length === 0) {
      setError('Pilih minimal 1 unit target POD.');
      return;
    }

    setIsSyncing(true);
    setSyncModalOpen(false);

    setProgressModal({
      isOpen: true,
      direction: 'master_to_pod',
      isProcessing: true,
      title: dryRun ? `Simulasi Sinkronisasi: public.${selectedTableName}` : `Sinkronisasi Live: public.${selectedTableName}`,
      tableName: selectedTableName,
      sourceName: matrixData?.master?.name || 'Master DB',
      targetName: `${targetPodIds.length} Unit POD V3`,
      progressPercent: 20,
      currentStatusText: 'Menginisialisasi koneksi database & mengecek skema DDL...',
      report: null
    });

    try {
      const result = await performMasterSyncApi({
        masterId: Number(masterId),
        tableName: selectedTableName,
        targetPodIds,
        dryRun,
        syncColumns,
        syncData: true
      });

      const totalSynced = result.totalRowsSynced || (result.results || []).reduce((acc, r) => acc + (r.rowsSynced || 0), 0);

      // 🚀 Instant Soft UI Update (0ms)
      if (!dryRun) {
        setMatrixData(prev => {
          if (!prev) return prev;
          const targetIdsSet = new Set(targetPodIds.map(Number));

          const updatedPods = (prev.pods || []).map(p => {
            if (targetIdsSet.has(Number(p.id)) && p.isOnline) {
              return {
                ...p,
                rowCount: prev.master?.rowCount || p.rowCount,
                status: 'SYNCED',
                missingRowsCount: 0,
                missingColumnsCount: 0,
                tableExists: true
              };
            }
            return p;
          });

          const updatedDataMatrix = (prev.dataMatrix || []).map(item => {
            const updatedPresence = { ...(item.presence || {}) };
            let presentCount = item.presentCount || 0;
            for (const pId of targetIdsSet) {
              if (item.inMaster) {
                if (!updatedPresence[pId] || !updatedPresence[pId].present) {
                  presentCount++;
                }
                updatedPresence[pId] = { isOnline: true, present: true };
              }
            }
            return {
              ...item,
              presence: updatedPresence,
              presentCount: Math.min(presentCount, prev.pods?.length || presentCount)
            };
          });

          return {
            ...prev,
            pods: updatedPods,
            dataMatrix: updatedDataMatrix
          };
        });
      }

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

      // Silent background soft refresh (no skeleton flashing)
      loadComparison(selectedTableName, true);
      if (onSyncCompleted) onSyncCompleted();
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

  // 2. Delete Row Handlers
  const handlePromptDeleteMasterRow = ({ pkColumn, pkValue, pkValues }) => {
    const values = Array.isArray(pkValues) && pkValues.length > 0 ? pkValues : (pkValue !== undefined ? [pkValue] : []);
    setDeleteModal({
      isOpen: true,
      targetType: 'master',
      targetName: matrixData?.master?.name || 'Master DB',
      serverId: null,
      tableName: selectedTableName,
      pkColumn: pkColumn || matrixData?.master?.pkColumn || 'id',
      pkValue: values[0],
      pkValues: values
    });
  };

  const handlePromptDeletePodRow = ({ serverId, serverIds, serverName, pkColumn, pkValue, pkValues }) => {
    const values = Array.isArray(pkValues) && pkValues.length > 0 ? pkValues : (pkValue !== undefined ? [pkValue] : []);
    const targetIds = Array.isArray(serverIds) && serverIds.length > 0 ? serverIds : [serverId];
    setDeleteModal({
      isOpen: true,
      targetType: 'pod',
      targetName: serverName || `POD #${serverId}`,
      serverId,
      serverIds: targetIds,
      tableName: selectedTableName,
      pkColumn: pkColumn || matrixData?.master?.pkColumn || 'id',
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
          masterId: Number(masterId),
          tableName: deleteModal.tableName,
          pkColumn: deleteModal.pkColumn,
          pkValues: valuesToDelete,
          cascade
        });
        setSuccessMsg(`Sukses! ${res.deletedCount || valuesToDelete.length} baris data berhasil di-Hard Delete dari Master Database.`);

        // 🚀 Instant Soft UI Update (0ms)
        setMatrixData(prev => {
          if (!prev) return prev;
          const updatedDataMatrix = (prev.dataMatrix || []).filter(item => {
            const pkVal = item.sampleData?.[deleteModal.pkColumn] !== undefined ? item.sampleData[deleteModal.pkColumn] : item.rowKey;
            return !keysSet.has(String(pkVal));
          });

          return {
            ...prev,
            master: {
              ...prev.master,
              rowCount: Math.max(0, (prev.master?.rowCount || 0) - (res.deletedCount || valuesToDelete.length))
            },
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
        setSuccessMsg(`Sukses! ${res.deletedCount || valuesToDelete.length} baris data berhasil di-Hard Delete dari ${deleteModal.targetName}.`);

        // 🚀 Instant Soft UI Update (0ms)
        setMatrixData(prev => {
          if (!prev) return prev;
          const targetIdsSet = new Set((deleteModal.serverIds || [Number(deleteModal.serverId)]).map(Number));

          const updatedDataMatrix = (prev.dataMatrix || []).filter(item => {
            const pkVal = item.sampleData?.[deleteModal.pkColumn] !== undefined ? item.sampleData[deleteModal.pkColumn] : item.rowKey;
            const key = String(pkVal);
            if (keysSet.has(key)) {
              if (item.isPodOnly || !item.inMaster) return false;
              if (item.presence) {
                for (const sId of targetIdsSet) {
                  if (item.presence[sId]?.present) {
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

      // Silent background soft refresh (no skeleton flashing)
      loadComparison(selectedTableName, true);
      if (onSyncCompleted) onSyncCompleted();
    } catch (err) {
      setError(err.message || 'Gagal menghapus baris data.');
    } finally {
      setIsDeleting(false);
    }
  };

  // 3. Single Row Sync
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

  const handleExecuteSingleRowSyncModal = async () => {
    if (!masterId || !selectedTableName || singleRowSyncModal.targetPodIds.length === 0) {
      setError('Pilih minimal 1 unit target POD online.');
      return;
    }

    setIsSingleRowSyncing(true);
    setError('');
    try {
      const res = await syncSingleMasterRowApi({
        masterId: Number(masterId),
        tableName: selectedTableName,
        pkColumn: singleRowSyncModal.pkColumn,
        pkValue: singleRowSyncModal.pkValue,
        targetPodIds: singleRowSyncModal.targetPodIds
      });

      setSuccessMsg(`Sukses! Baris (${singleRowSyncModal.pkColumn} = ${singleRowSyncModal.pkValue}) berhasil disinkronkan ke ${res.successfulTargets} unit POD.`);
      setSingleRowSyncModal(prev => ({ ...prev, isOpen: false }));
      setTimeout(() => setSuccessMsg(''), 6000);

      // 🚀 Instant Soft UI Update (0ms)
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
            return { ...p, rowCount: (p.rowCount || 0) + 1 };
          }
          return p;
        });

        return {
          ...prev,
          pods: updatedPods,
          dataMatrix: updatedDataMatrix
        };
      });

      // Silent background soft refresh (no skeleton flashing)
      loadComparison(selectedTableName, true);
      if (onSyncCompleted) onSyncCompleted();
    } catch (err) {
      setError(err.message || 'Gagal menyinkronkan 1 baris data ke POD.');
    } finally {
      setIsSingleRowSyncing(false);
    }
  };

  const handleSyncSingleRowToPod = async ({ serverId, serverName, pkColumn, pkValue }) => {
    setError('');
    try {
      await syncSingleMasterRowApi({
        masterId: Number(masterId),
        tableName: selectedTableName,
        pkColumn: pkColumn || 'id',
        pkValue,
        targetPodIds: [serverId]
      });

      setSuccessMsg(`Sukses! 1 baris data (${pkColumn} = ${pkValue}) berhasil disinkronkan ke ${serverName || 'POD'}.`);
      setTimeout(() => setSuccessMsg(''), 6000);

      // 🚀 Instant Soft UI Update (0ms)
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
            return { ...p, rowCount: (p.rowCount || 0) + 1 };
          }
          return p;
        });

        return {
          ...prev,
          pods: updatedPods,
          dataMatrix: updatedDataMatrix
        };
      });

      // Silent background soft refresh (no skeleton flashing)
      loadComparison(selectedTableName, true);
      if (onSyncCompleted) onSyncCompleted();
    } catch (err) {
      setError(err.message || `Gagal menyinkronkan baris ke ${serverName}: ${err.message}`);
    }
  };

  // 4. Pull Data from POD to Master
  const triggerPodToMasterSync = async (pod) => {
    setError('');

    setProgressModal({
      isOpen: true,
      direction: 'pod_to_master',
      isProcessing: true,
      title: `Penarikan Data: ${pod.name} ➔ Master DB`,
      tableName: selectedTableName,
      sourceName: pod.name,
      targetName: matrixData?.master?.name || 'Master DB',
      progressPercent: 35,
      currentStatusText: `Menghubungkan & mengambil seluruh data dari ${pod.name}...`,
      report: null
    });

    try {
      const res = await syncPodToMasterApi({
        masterId: Number(masterId),
        serverId: Number(pod.id),
        tableName: selectedTableName,
        dryRun: false
      });

      // 🚀 Instant Soft UI Update (0ms)
      setMatrixData(prev => {
        if (!prev) return prev;
        const targetPodId = Number(pod.id);
        let addedToMasterCount = 0;

        const updatedDataMatrix = (prev.dataMatrix || []).map(item => {
          if (item.presence?.[targetPodId]?.present) {
            if (!item.inMaster) addedToMasterCount++;
            return { ...item, inMaster: true, isPodOnly: false };
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

      // Silent background soft refresh (no skeleton flashing)
      loadComparison(selectedTableName, true);
      if (onSyncCompleted) onSyncCompleted();
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

  const handleSyncSinglePodRowToMaster = async ({ serverId, serverIds, serverName, pkColumn, pkValue, rowData }) => {
    setError('');
    const targetIds = Array.isArray(serverIds) && serverIds.length > 0
      ? serverIds.map(Number)
      : (serverId ? [Number(serverId)] : (matrixData?.pods || []).map(p => Number(p.id)));

    try {
      const res = await syncSinglePodRowApi({
        masterId: Number(masterId),
        serverId: targetIds[0],
        serverIds: targetIds,
        tableName: selectedTableName,
        pkColumn: pkColumn || 'id',
        pkValue,
        rowData
      });

      setSuccessMsg(`Sukses! Baris (${pkColumn || 'id'} = ${pkValue}) dari ${serverName || res?.serverName || 'POD'} berhasil di-upload ke Master DB.`);
      setTimeout(() => setSuccessMsg(''), 6000);

      // 🚀 Instant Soft UI Update (0ms)
      setMatrixData(prev => {
        if (!prev) return prev;
        const strKey = String(pkValue);
        const updatedDataMatrix = (prev.dataMatrix || []).map(item => {
          const itemKey = String(item.rowKey || '');
          const samplePk = item.sampleData && pkColumn && item.sampleData[pkColumn] !== undefined ? String(item.sampleData[pkColumn]) : '';
          const isMatch = itemKey === strKey || samplePk === strKey;

          if (isMatch) {
            return { ...item, inMaster: true, isPodOnly: false };
          }
          return item;
        });

        return {
          ...prev,
          master: {
            ...prev.master,
            rowCount: (prev.master?.rowCount || 0) + 1
          },
          dataMatrix: updatedDataMatrix
        };
      });

      // Silent background soft refresh (no skeleton flashing)
      loadComparison(selectedTableName, true);
      if (onSyncCompleted) onSyncCompleted();
    } catch (err) {
      setError(err.message || 'Gagal mengupload baris POD ke Master DB.');
    }
  };

  const handleBulkSyncPodRowsToMaster = async ({ serverId, serverIds, serverName, pkColumn, pkValues }) => {
    if (!Array.isArray(pkValues) || pkValues.length === 0) return;
    setError('');

    const targetIds = Array.isArray(serverIds) && serverIds.length > 0
      ? serverIds.map(Number)
      : (serverId ? [Number(serverId)] : (matrixData?.pods || []).map(p => Number(p.id)));

    try {
      let successCount = 0;
      for (const val of pkValues) {
        const item = (matrixData?.dataMatrix || []).find(r => {
          const k = r.sampleData?.[pkColumn || 'id'] !== undefined ? String(r.sampleData[pkColumn || 'id']) : String(r.rowKey);
          return k === String(val);
        });

        await syncSinglePodRowApi({
          masterId: Number(masterId),
          serverId: targetIds[0],
          serverIds: targetIds,
          tableName: selectedTableName,
          pkColumn: pkColumn || 'id',
          pkValue: val,
          rowData: item?.sampleData
        });
        successCount++;
      }

      setSuccessMsg(`Sukses! ${successCount} baris data dari ${serverName || 'POD'} berhasil disalin ke Master DB.`);
      setTimeout(() => setSuccessMsg(''), 6000);

      // 🚀 Instant Soft UI Update (0ms)
      setMatrixData(prev => {
        if (!prev) return prev;
        const valSet = new Set(pkValues.map(String));
        const updatedDataMatrix = (prev.dataMatrix || []).map(item => {
          const pkVal = item.sampleData?.[pkColumn || 'id'] !== undefined ? String(item.sampleData[pkColumn || 'id']) : String(item.rowKey);
          if (valSet.has(pkVal)) {
            return { ...item, inMaster: true, isPodOnly: false };
          }
          return item;
        });

        return {
          ...prev,
          master: {
            ...prev.master,
            rowCount: (prev.master?.rowCount || 0) + successCount
          },
          dataMatrix: updatedDataMatrix
        };
      });

      // Silent background soft refresh (no skeleton flashing)
      loadComparison(selectedTableName, true);
      if (onSyncCompleted) onSyncCompleted();
    } catch (err) {
      setError(err.message || 'Gagal melakukan bulk pull dari POD.');
    }
  };

  const handleTableChange = (tableName) => {
    if (tableName === selectedTableName) return;
    setSelectedTableName(tableName);
    setMatrixData(null); // Immediately shows skeleton for the new table!
  };

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-200">

      {/* Table Selector Sub-tabs & Direction Header */}
      <div className="glass-card p-4 rounded-2xl border border-slate-800 bg-slate-900/60 shadow-lg flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2 overflow-x-auto">
          <div className="flex flex-wrap gap-2">
            {activeTables.map(t => (
              <button
                key={t.name}
                onClick={() => handleTableChange(t.name)}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-2 cursor-pointer
                  ${selectedTableName === t.name
                    ? direction === 'pod_to_master'
                      ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-900/30 border border-emerald-500'
                      : 'bg-blue-600 text-white shadow-lg shadow-blue-900/30 border border-blue-500'
                    : 'bg-slate-950 border border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                  }`}
              >
                <Database size={13} className={selectedTableName === t.name ? (direction === 'pod_to_master' ? 'text-emerald-200' : 'text-blue-200') : 'text-slate-500'} />
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Direction Badge */}
        <div className="flex items-center gap-2">
          {direction === 'pod_to_master' ? (
            <div className="px-3.5 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-bold flex items-center gap-2 shadow-sm">
              <DownloadCloud size={14} className="text-emerald-400" />
              <span>Aliran Data: Ingest / Tarik dari POD ➔ Master DB</span>
            </div>
          ) : (
            <div className="px-3.5 py-1.5 rounded-xl bg-blue-500/10 border border-blue-500/30 text-blue-300 text-xs font-bold flex items-center gap-2 shadow-sm">
              <UploadCloud size={14} className="text-blue-400" />
              <span>Aliran Data: Distribusi dari Master ➔ Seluruh POD</span>
            </div>
          )}
        </div>
      </div>

      {/* Alerts */}
      {successMsg && (
        <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 flex items-center gap-2 text-xs animate-fadeIn">
          <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {error && (
        <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-300 flex items-center gap-2 text-xs animate-fadeIn">
          <AlertTriangle size={16} className="text-red-400 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Main Workspace (TableDetailWorkspaceView) - Shows tailored Skeleton when switching tables or loading */}
      {!matrixData ? (
        <TncPodSyncSkeleton showMaster={direction === 'pod_to_master'} />
      ) : (
        <TableDetailWorkspaceView
          tableName={selectedTableName}
          masterInfo={matrixData?.master}
          matrixData={matrixData}
          isComparing={isComparing}
          onRefresh={() => loadComparison(selectedTableName, false)}
          onBackToCatalog={() => { }}
          activePodId={activePodId}
          setActivePodId={setActivePodId}
          onQuickSyncPod={triggerSinglePodSync}
          onBulkSync={triggerBulkSync}
          onSyncPodToMaster={triggerPodToMasterSync}
          onDeleteMasterRow={handlePromptDeleteMasterRow}
          onDeleteMultipleRows={handlePromptDeleteMasterRow}
          onDeletePodRow={handlePromptDeletePodRow}
          onDeleteMultiplePodRows={handlePromptDeletePodRow}
          onSyncSingleRow={handlePromptSyncSingleRowMaster}
          onSyncSingleRowToPod={handleSyncSingleRowToPod}
          onSyncSinglePodRowToMaster={handleSyncSinglePodRowToMaster}
          onBulkSyncPodRowsToMaster={handleBulkSyncPodRowsToMaster}
          hideTopBanner={true}
          hideMasterViewer={direction === 'master_to_pod'}
        />
      )}

      {/* 1. Modal Bulk/Table Sync */}
      <MasterPodSyncModal
        isOpen={syncModalOpen}
        onClose={() => setSyncModalOpen(false)}
        masterInfo={matrixData?.master}
        tableName={selectedTableName}
        targetPodIds={targetPodIds}
        setTargetPodIds={setTargetPodIds}
        pods={matrixData?.pods || []}
        dryRun={dryRun}
        setDryRun={setDryRun}
        syncColumns={syncColumns}
        setSyncColumns={setSyncColumns}
        isSyncing={isSyncing}
        onPerformSync={handleExecuteSyncModal}
      />

      {/* 2. Modal Single Row Sync */}
      <SingleRowSyncModal
        isOpen={singleRowSyncModal.isOpen}
        onClose={() => setSingleRowSyncModal(prev => ({ ...prev, isOpen: false }))}
        tableName={selectedTableName}
        masterName={matrixData?.master?.name}
        pkColumn={singleRowSyncModal.pkColumn}
        pkValue={singleRowSyncModal.pkValue}
        rowData={singleRowSyncModal.rowData}
        pods={matrixData?.pods || []}
        selectedPodIds={singleRowSyncModal.targetPodIds}
        setSelectedPodIds={(ids) => setSingleRowSyncModal(prev => ({ ...prev, targetPodIds: ids }))}
        isSyncing={isSingleRowSyncing}
        onExecuteSync={handleExecuteSingleRowSyncModal}
      />

      {/* 3. Modal Delete Confirmation */}
      <DeleteRowConfirmationModal
        isOpen={deleteModal.isOpen}
        onClose={() => setDeleteModal(prev => ({ ...prev, isOpen: false }))}
        targetType={deleteModal.targetType}
        targetName={deleteModal.targetName}
        tableName={deleteModal.tableName}
        pkColumn={deleteModal.pkColumn}
        pkValue={deleteModal.pkValue}
        pkValues={deleteModal.pkValues}
        isDeleting={isDeleting}
        onConfirmDelete={handleExecuteDelete}
      />

      {/* 4. Modal Progress & Result Report */}
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
        syncResults={progressModal.report?.results || []}
        report={progressModal.report}
        dryRun={dryRun}
        syncColumns={syncColumns}
      />

    </div>
  );
}
