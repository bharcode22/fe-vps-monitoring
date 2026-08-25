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
  syncSingleMasterRowApi,
  syncPodToMasterApi,
  syncSinglePodRowApi
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

  useEffect(() => {
    if (selectedMasterId) {
      loadMasterTables(selectedMasterId);
    }
  }, [selectedMasterId]);

  // 3. Open Detail Workspace for a specific Table
  const handleOpenTableDetail = async (tableName) => {
    setSelectedTableName(tableName);
    setViewMode('detail');
    setMatrixData(null);
    setIsComparing(true);
    setError('');

    try {
      const data = await fetchMasterTableMatrixApi(selectedMasterId, tableName);
      setMatrixData(data);
      if (data?.pods?.length > 0) {
        setActivePodId(data.pods[0].id);
      }
    } catch (err) {
      setError(err.message || 'Gagal membandingkan tabel across PODs.');
    } finally {
      setIsComparing(false);
    }
  };

  // 4. Refresh Current Matrix
  const handleRefreshCurrentMatrix = async () => {
    if (!selectedMasterId || !selectedTableName) return;
    setIsComparing(true);
    setError('');
    try {
      const data = await fetchMasterTableMatrixApi(selectedMasterId, selectedTableName);
      setMatrixData(data);
    } catch (err) {
      setError(err.message || 'Gagal memuat ulang matriks.');
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

    setIsSyncing(true);
    setError('');
    try {
      const result = await performMasterSyncApi({
        masterId: Number(selectedMasterId),
        tableName: selectedTableName,
        targetPodIds,
        dryRun,
        syncColumns,
        syncData: true
      });

      setSuccessMsg(
        dryRun
          ? `Simulasi selesai: Berhasil simulasi ke ${result.successfulTargets || 0} POD.`
          : `Sinkronisasi Live Berhasil! ${result.successfulTargets || 0} POD berhasil diperbarui.`
      );

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

      setSyncModalOpen(false);
      setTimeout(() => setSuccessMsg(''), 6000);
    } catch (err) {
      setError(err.message || 'Gagal mengeksekusi sinkronisasi.');
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

  // D. Pull all data from POD to Master (POD ➔ Master)
  const handleSyncPodToMaster = async (pod) => {
    setError('');
    try {
      const res = await syncPodToMasterApi({
        masterId: Number(selectedMasterId),
        serverId: Number(pod.id),
        tableName: selectedTableName,
        dryRun: false
      });
      setSuccessMsg(`Sukses! ${res.rowsProcessed || 0} baris dari ${pod.name} berhasil ditarik dan disinkronkan ke Master Database.`);
      await handleRefreshCurrentMatrix();
      setTimeout(() => setSuccessMsg(''), 6000);
    } catch (err) {
      setError(err.message || `Gagal menarik data dari ${pod.name}: ${err.message}`);
    }
  };

  // E. Pull 1 single row from POD to Master (POD ➔ Master)
  const handleSyncSinglePodRowToMaster = async ({ serverId, serverIds, serverName, pkColumn, pkValue }) => {
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
        pkValue
      });

      setSuccessMsg(`Sukses! Baris (${pkColumn || 'id'} = ${pkValue}) dari ${serverName || res?.serverName || 'POD'} berhasil di-upload ke Master DB.`);

      // 🚀 Optimistic Instant Update (Converts POD-only row to Master row instantly!)
      setMatrixData(prev => {
        if (!prev) return prev;
        const strKey = String(pkValue);
        const updatedDataMatrix = (prev.dataMatrix || []).map(item => {
          const pkVal = item.sampleData?.[pkColumn || 'id'] !== undefined ? item.sampleData[pkColumn || 'id'] : item.rowKey;
          if (String(pkVal) === strKey) {
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
            rowCount: (prev.master?.rowCount || 0) + 1
          },
          dataMatrix: updatedDataMatrix
        };
      });

      setTimeout(() => setSuccessMsg(''), 6000);
      return res;
    } catch (err) {
      setError(err.message || `Gagal mengupload baris dari ${serverName || 'POD'}: ${err.message}`);
      throw err;
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
            onDeleteMultipleRows={handlePromptDeleteMasterRow}
            onDeletePodRow={handlePromptDeletePodRow}
            onDeleteMultiplePodRows={handlePromptDeletePodRow}
            onSyncSingleRow={handlePromptSyncSingleRowMaster}
            onSyncSingleRowToPod={handleQuickSyncSingleRowToSpecificPod}
            onSyncPodToMaster={handleSyncPodToMaster}
            onSyncSinglePodRowToMaster={handleSyncSinglePodRowToMaster}
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
    </div>
  );
}
