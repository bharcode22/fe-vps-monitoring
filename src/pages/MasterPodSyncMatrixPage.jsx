import React, { useState, useCallback } from 'react';
import {
  fetchMasterTableFastApi,
  fetchSinglePodComparisonApi,
  fetchMasterTableMatrixApi
} from '../api/masterPodSyncApi';
import { mergeSinglePodComparison } from '../components/masterPodSync/masterPodMatrixUpdaters';
import MasterPodSyncHeader from '../components/masterPodSync/MasterPodSyncHeader';
import MasterPodAlerts from '../components/masterPodSync/MasterPodAlerts';
import MasterTablesCatalogView from '../components/masterPodSync/MasterTablesCatalogView';
import FleetSyncAuditView from '../components/masterPodSync/FleetSyncAuditView';
import TableDetailWorkspaceView from '../components/masterPodSync/TableDetailWorkspaceView';
import MasterPodSkeleton from '../components/masterPodSync/MasterPodSkeleton';
import MasterPodSyncModals from '../components/masterPodSync/MasterPodSyncModals';
import { useMasterPodCatalog } from '../components/masterPodSync/hooks/useMasterPodCatalog';
import { useMasterPodSyncOperations } from '../components/masterPodSync/hooks/useMasterPodSyncOperations';

/**
 * Master Multi-POD Sync Matrix Page (Orchestrator).
 * Coordinates Level 1 (Catalog & Disparity Audit) and Level 2 (Table Detail Workspace) views.
 */
export default function MasterPodSyncMatrixPage({ onBack }) {
  // View mode: 'catalog' (Level 1: Tables Grid) | 'audit' (Level 1B: Fleet Audit) | 'detail' (Level 2: Detail Workspace)
  const [viewMode, setViewMode] = useState('catalog');
  const [selectedTableName, setSelectedTableName] = useState('');

  // Active POD & Comparison Matrix State
  const [activePodId, setActivePodId] = useState(null);
  const [loadingPodId, setLoadingPodId] = useState(null);
  const [matrixData, setMatrixData] = useState(null);
  const [isComparing, setIsComparing] = useState(false);
  const [isComparingAll, setIsComparingAll] = useState(false);

  // Global Alerts
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const handleSetSuccessMsg = useCallback((msg) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(''), 6000);
  }, []);

  // 1. Catalog & Fleet Audit Data Hook
  const {
    masterDatabases,
    selectedMasterId,
    setSelectedMasterId,
    tables,
    isLoadingTables,
    loadMasterTables,
    auditData,
    isLoadingAudit,
    loadFleetAudit
  } = useMasterPodCatalog({
    viewMode,
    onError: setError
  });

  // 2. Single POD Comparison (On-Demand ~200ms)
  const loadSinglePodComparison = useCallback(async (tableName, podId) => {
    const tbl = tableName || selectedTableName || matrixData?.master?.tableName;
    if (!selectedMasterId || !tbl || !podId) return;

    setLoadingPodId(podId);
    try {
      const result = await fetchSinglePodComparisonApi(selectedMasterId, tbl, podId);
      if (result?.success && result.podSummary) {
        setMatrixData(prev => mergeSinglePodComparison(prev, podId, result));
      }
    } catch (err) {
      console.error('[Single POD Compare Error]:', err);
    } finally {
      setLoadingPodId(null);
    }
  }, [selectedMasterId, selectedTableName, matrixData]);

  // 3. Open Detail Workspace for a specific Table (Fast Load < 50ms + 1 POD Option A)
  const handleOpenTableDetail = useCallback(async (tableName) => {
    setSelectedTableName(tableName);
    setViewMode('detail');
    setMatrixData(null);
    setIsComparing(true);
    setError('');

    try {
      // Fast Load Master Table & POD List (<50ms)
      const fastData = await fetchMasterTableFastApi(selectedMasterId, tableName);
      setMatrixData(fastData);
      setIsComparing(false);

      // Select 1st ONLINE POD and compare ONLY that POD
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
  }, [selectedMasterId, loadSinglePodComparison]);

  // 4. Select POD Handler (Triggers on-demand comparison if not yet compared)
  const handleSelectPod = useCallback((podId) => {
    setActivePodId(podId);
    const tbl = selectedTableName || matrixData?.master?.tableName;
    const targetPod = (matrixData?.pods || []).find(p => String(p.id) === String(podId));

    const isAlreadyCompared = targetPod && targetPod.tableExists !== null && targetPod.rowCount !== null && targetPod.status !== 'NOT_LOADED';

    if (!isAlreadyCompared && tbl) {
      loadSinglePodComparison(tbl, podId);
    }
  }, [selectedTableName, matrixData, loadSinglePodComparison]);

  // 5. Full Fleet Comparison across all PODs (Opt-In)
  const handleCompareAllPods = useCallback(async () => {
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
  }, [selectedMasterId, selectedTableName]);

  // 6. Refresh Current Matrix (Reloads Master + active POD)
  const handleRefreshCurrentMatrix = useCallback(async (isSoft = false) => {
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
  }, [selectedMasterId, selectedTableName, matrixData, activePodId, loadSinglePodComparison]);

  // 7. Operations Hook (Sync, Delete, Update, and Modals)
  const operations = useMasterPodSyncOperations({
    selectedMasterId,
    selectedTableName,
    masterDatabases,
    matrixData,
    setMatrixData,
    onError: setError,
    onSuccess: handleSetSuccessMsg,
    onRefreshCurrentMatrix: handleRefreshCurrentMatrix
  });

  return (
    <div className="flex flex-col gap-6 text-slate-100 w-full">
      {/* Top Header Bar */}
      <MasterPodSyncHeader
        viewMode={viewMode}
        selectedTableName={selectedTableName}
        tablesCount={tables.length}
        discrepantTablesCount={auditData?.summary?.discrepantTables || 0}
        isLoading={isLoadingTables || isComparing || isLoadingAudit}
        onBack={onBack}
        onSetViewMode={(mode) => {
          setViewMode(mode);
          if (mode === 'audit' && !auditData) {
            loadFleetAudit(selectedMasterId);
          }
        }}
        onRefresh={() => {
          if (viewMode === 'detail') handleRefreshCurrentMatrix();
          else if (viewMode === 'audit') loadFleetAudit(selectedMasterId);
          else loadMasterTables(selectedMasterId);
        }}
      />

      {/* Dismissable Alerts */}
      <MasterPodAlerts
        error={error}
        successMsg={successMsg}
        onClearError={() => setError('')}
        onClearSuccess={() => setSuccessMsg('')}
      />

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
            onQuickSyncPod={operations.triggerSinglePodSync}
            onBulkSync={operations.triggerBulkSync}
            onUpdateMasterRow={operations.handleUpdateMasterRow}
            onDeleteMasterRow={operations.handlePromptDeleteMasterRow}
            onDeleteMultipleRows={operations.handlePromptDeleteMasterRow}
            onDeletePodRow={operations.handlePromptDeletePodRow}
            onDeleteMultiplePodRows={operations.handlePromptDeletePodRow}
            onSyncSingleRow={operations.handlePromptSyncSingleRowMaster}
            onSyncSingleRowToPod={operations.handleQuickSyncSingleRowToSpecificPod}
            onSyncPodToMaster={operations.handleSyncPodToMaster}
            onSyncSinglePodRowToMaster={operations.handleSyncSinglePodRowToMaster}
            onBulkSyncPodRowsToMaster={operations.handleBulkSyncPodRowsToMaster}
          />
        )
      )}

      {/* UNIFIED SYNC & CONFIRMATION MODALS */}
      <MasterPodSyncModals
        tableName={selectedTableName}
        selectedMasterId={selectedMasterId}
        masterInfo={matrixData?.master || masterDatabases.find(d => String(d.id) === String(selectedMasterId))}
        pods={matrixData?.pods || []}
        bulkSync={{
          isOpen: operations.syncModalOpen,
          onClose: () => operations.setSyncModalOpen(false),
          targetPodIds: operations.targetPodIds,
          setTargetPodIds: operations.setTargetPodIds,
          dryRun: operations.dryRun,
          setDryRun: operations.setDryRun,
          syncColumns: operations.syncColumns,
          setSyncColumns: operations.setSyncColumns,
          isSyncing: operations.isSyncing,
          onPerformSync: operations.handlePerformSync
        }}
        singleRowSync={{
          isOpen: operations.singleRowSyncModal.isOpen,
          onClose: () => operations.setSingleRowSyncModal(prev => ({ ...prev, isOpen: false })),
          pkColumn: operations.singleRowSyncModal.pkColumn,
          pkValue: operations.singleRowSyncModal.pkValue,
          rowData: operations.singleRowSyncModal.rowData,
          targetPodIds: operations.singleRowSyncModal.targetPodIds,
          setTargetPodIds: (ids) => operations.setSingleRowSyncModal(prev => ({
            ...prev,
            targetPodIds: typeof ids === 'function' ? ids(prev.targetPodIds) : ids
          })),
          isSyncing: operations.isSingleRowSyncing,
          onConfirmSync: operations.handleExecuteSingleRowSyncModal
        }}
        deleteRow={{
          isOpen: operations.deleteModal.isOpen,
          onClose: () => operations.setDeleteModal(prev => ({ ...prev, isOpen: false })),
          targetType: operations.deleteModal.targetType,
          targetName: operations.deleteModal.targetName,
          serverHost: operations.deleteModal.serverHost,
          tableName: operations.deleteModal.tableName,
          pkColumn: operations.deleteModal.pkColumn,
          pkValue: operations.deleteModal.pkValue,
          pkValues: operations.deleteModal.pkValues,
          isDeleting: operations.isDeleting,
          onConfirmDelete: operations.handleExecuteDelete
        }}
        progress={{
          isOpen: operations.progressModal.isOpen,
          onClose: () => operations.setProgressModal(prev => ({ ...prev, isOpen: false })),
          direction: operations.progressModal.direction,
          isProcessing: operations.progressModal.isProcessing,
          title: operations.progressModal.title,
          tableName: operations.progressModal.tableName,
          sourceName: operations.progressModal.sourceName,
          targetName: operations.progressModal.targetName,
          progressPercent: operations.progressModal.progressPercent,
          currentStatusText: operations.progressModal.currentStatusText,
          report: operations.progressModal.report
        }}
      />
    </div>
  );
}
