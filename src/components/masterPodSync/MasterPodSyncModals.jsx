import React from 'react';
import MasterPodSyncModal from './MasterPodSyncModal';
import SingleRowSyncModal from './SingleRowSyncModal';
import DeleteRowConfirmationModal from './DeleteRowConfirmationModal';
import SyncProgressReportModal from './SyncProgressReportModal';

/**
 * Unified container component bundling all 4 Master-to-POD sync and delete dialogs.
 */
export default function MasterPodSyncModals({
  tableName,
  selectedMasterId,
  masterInfo,
  pods = [],
  bulkSync,
  singleRowSync,
  deleteRow,
  progress
}) {
  return (
    <>
      {/* 1. Bulk Sync Confirmation Modal */}
      {bulkSync?.isOpen && (
        <MasterPodSyncModal
          isOpen={bulkSync.isOpen}
          onClose={bulkSync.onClose}
          masterId={selectedMasterId}
          tableName={tableName}
          masterInfo={masterInfo}
          targetPodIds={bulkSync.targetPodIds}
          setTargetPodIds={bulkSync.setTargetPodIds}
          pods={pods}
          dryRun={bulkSync.dryRun}
          setDryRun={bulkSync.setDryRun}
          syncColumns={bulkSync.syncColumns}
          setSyncColumns={bulkSync.setSyncColumns}
          isSyncing={bulkSync.isSyncing}
          onPerformSync={bulkSync.onPerformSync}
        />
      )}

      {/* 2. Single Row Sync Modal */}
      {singleRowSync?.isOpen && (
        <SingleRowSyncModal
          isOpen={singleRowSync.isOpen}
          onClose={singleRowSync.onClose}
          masterInfo={masterInfo}
          pkColumn={singleRowSync.pkColumn}
          pkValue={singleRowSync.pkValue}
          rowData={singleRowSync.rowData}
          targetPodIds={singleRowSync.targetPodIds}
          setTargetPodIds={singleRowSync.setTargetPodIds}
          pods={pods}
          isSyncing={singleRowSync.isSyncing}
          onConfirmSync={singleRowSync.onConfirmSync}
        />
      )}

      {/* 3. Delete Row Confirmation Modal */}
      {deleteRow?.isOpen && (
        <DeleteRowConfirmationModal
          isOpen={deleteRow.isOpen}
          onClose={deleteRow.onClose}
          targetType={deleteRow.targetType}
          targetName={deleteRow.targetName}
          serverHost={deleteRow.serverHost}
          tableName={deleteRow.tableName || tableName}
          pkColumn={deleteRow.pkColumn}
          pkValue={deleteRow.pkValue}
          pkValues={deleteRow.pkValues}
          isDeleting={deleteRow.isDeleting}
          onConfirmDelete={deleteRow.onConfirmDelete}
        />
      )}

      {/* 4. Sync Progress Report Modal */}
      {progress?.isOpen && (
        <SyncProgressReportModal
          isOpen={progress.isOpen}
          onClose={progress.onClose}
          direction={progress.direction}
          isProcessing={progress.isProcessing}
          title={progress.title}
          tableName={progress.tableName || tableName}
          sourceName={progress.sourceName}
          targetName={progress.targetName}
          progressPercent={progress.progressPercent}
          currentStatusText={progress.currentStatusText}
          report={progress.report}
        />
      )}
    </>
  );
}
