import React from 'react';
import MasterPodSyncModal from './MasterPodSyncModal';
import SingleRowSyncModal from './SingleRowSyncModal';
import DeleteRowConfirmationModal from './DeleteRowConfirmationModal';
import SyncProgressReportModal from './SyncProgressReportModal';

/**
 * Modular wrapper bundling the 4 standard Master-to-POD sync and delete modals.
 */
export default function MasterPodSyncModals({
  tableName,
  selectedMasterId,
  masterInfo,
  pods = [],
  modals
}) {
  if (!modals) return null;

  const { sync, deleteRow, singleRowSync, progress } = modals;

  return (
    <>
      {/* 1. Bulk Sync Confirmation Modal */}
      {sync?.isOpen && (
        <MasterPodSyncModal
          isOpen={sync.isOpen}
          onClose={sync.onClose}
          masterId={selectedMasterId}
          tableName={tableName}
          masterInfo={masterInfo}
          targetPodIds={sync.targetPodIds}
          setTargetPodIds={sync.setTargetPodIds}
          pods={pods}
          dryRun={sync.dryRun}
          setDryRun={sync.setDryRun}
          syncColumns={sync.syncColumns}
          setSyncColumns={sync.setSyncColumns}
          isSyncing={sync.isSyncing}
          onPerformSync={sync.onPerformSync}
        />
      )}

      {/* 2. Single Row Sync Modal */}
      {singleRowSync?.isOpen && (
        <SingleRowSyncModal
          isOpen={singleRowSync.isOpen}
          onClose={singleRowSync.onClose}
          tableName={tableName}
          pkColumn={singleRowSync.pkColumn}
          pkValue={singleRowSync.pkValue}
          rowData={singleRowSync.rowData}
          targetPodIds={singleRowSync.targetPodIds}
          setTargetPodIds={singleRowSync.setTargetPodIds}
          pods={pods}
          isSyncing={singleRowSync.isSyncing}
          onPerformSync={singleRowSync.onPerformSync}
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
          tableName={deleteRow.tableName}
          pkColumn={deleteRow.pkColumn}
          pkValue={deleteRow.pkValue}
          pkValues={deleteRow.pkValues}
          isDeleting={deleteRow.isDeleting}
          onConfirm={deleteRow.onConfirm}
        />
      )}

      {/* 4. Sync Progress Report Modal */}
      {progress?.modalState?.isOpen && (
        <SyncProgressReportModal
          modalState={progress.modalState}
          onClose={progress.onClose}
        />
      )}
    </>
  );
}
