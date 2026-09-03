import React, { useState, useEffect } from 'react';
import { CheckCircle2 } from 'lucide-react';
import { fetchMasterDatabasesApi } from '../api/masterPodSyncApi';
import { useTableSyncWorkspace } from '../hooks/useTableSyncWorkspace';
import UserManagerHeader from '../components/userManager/UserManagerHeader';
import TableDetailWorkspaceView from '../components/masterPodSync/TableDetailWorkspaceView';
import MasterPodSyncModals from '../components/masterPodSync/MasterPodSyncModals';
import UserManagerSkeleton from '../components/userManager/UserManagerSkeleton';

export default function UserManagerPage({ onBack }) {
  const tableName = 'user';

  // 1. Master Databases state
  const [masterDatabases, setMasterDatabases] = useState([]);
  const [selectedMasterId, setSelectedMasterId] = useState('');
  const [isLoadingDatabases, setIsLoadingDatabases] = useState(true);

  // 2. Load Master Databases on Mount
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
        console.error('Gagal memuat Master Database:', err);
      })
      .finally(() => {
        setIsLoadingDatabases(false);
      });
  }, []);

  // 3. Encapsulated Table Sync Workspace Logic (Hook)
  const {
    matrixData,
    isComparing,
    error,
    setError,
    successMsg,
    setSuccessMsg,
    workspaceProps,
    modals,
    handleRefreshCurrentMatrix
  } = useTableSyncWorkspace({
    tableName,
    selectedMasterId,
    masterDatabases
  });

  return (
    <div className="flex flex-col gap-6 text-slate-100 w-full animate-in fade-in duration-200">
      {/* 1. Modular Header Toolbar */}
      <UserManagerHeader
        onBack={onBack}
        masterDatabases={masterDatabases}
        selectedMasterId={selectedMasterId}
        onSelectMasterId={setSelectedMasterId}
        isLoadingDatabases={isLoadingDatabases}
        isComparing={isComparing}
        onRefresh={() => handleRefreshCurrentMatrix(false)}
      />

      {/* 2. Feedback & Error Alerts */}
      {error && (
        <div className="p-4 bg-red-500/15 border border-red-500/30 rounded-2xl flex items-center justify-between text-xs text-red-300 shadow-md">
          <span>{error}</span>
          <button
            onClick={() => setError('')}
            className="text-red-400 hover:text-white font-bold ml-2 cursor-pointer"
          >
            Tutup
          </button>
        </div>
      )}
      {successMsg && (
        <div className="p-4 bg-emerald-500/15 border border-emerald-500/30 rounded-2xl flex items-center justify-between text-xs text-emerald-300 shadow-md">
          <span className="flex items-center gap-2 font-bold">
            <CheckCircle2 size={16} /> {successMsg}
          </span>
          <button
            onClick={() => setSuccessMsg('')}
            className="text-emerald-400 hover:text-white font-bold ml-2 cursor-pointer"
          >
            Tutup
          </button>
        </div>
      )}

      {/* 3. Table Detail Workspace (MasterDataViewer + PodStatusCardsGrid + PodDataViewer) */}
      {isLoadingDatabases || (isComparing && !matrixData) || !matrixData ? (
        <UserManagerSkeleton />
      ) : (
        <TableDetailWorkspaceView
          tableName={tableName}
          masterInfo={matrixData?.master}
          matrixData={matrixData}
          {...workspaceProps}
        />
      )}

      {/* 4. Modular Modals Bundle (Sync, Delete, Progress) */}
      <MasterPodSyncModals
        tableName={tableName}
        selectedMasterId={selectedMasterId}
        masterInfo={matrixData?.master}
        pods={matrixData?.pods || []}
        modals={modals}
      />
    </div>
  );
}
