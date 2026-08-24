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
  performMasterSyncApi
} from '../api/masterPodSyncApi';
import MasterSelectorBar from '../components/masterPodSync/MasterSelectorBar';
import MasterPodMatrixSummaryCards from '../components/masterPodSync/MasterPodMatrixSummaryCards';
import MasterPodColumnMatrix from '../components/masterPodSync/MasterPodColumnMatrix';
import MasterPodDataMatrix from '../components/masterPodSync/MasterPodDataMatrix';
import MasterPodDiffModal from '../components/masterPodSync/MasterPodDiffModal';
import MasterPodSyncModal from '../components/masterPodSync/MasterPodSyncModal';
import MasterPodSkeleton from '../components/masterPodSync/MasterPodSkeleton';

export default function MasterPodSyncMatrixPage({ onBack }) {
  // Master Databases & Tables State
  const [masterDatabases, setMasterDatabases] = useState([]);
  const [selectedMasterId, setSelectedMasterId] = useState('');
  const [tables, setTables] = useState([]);
  const [selectedTable, setSelectedTable] = useState('');
  const [isLoadingTables, setIsLoadingTables] = useState(false);

  // Matrix State
  const [matrixData, setMatrixData] = useState(null);
  const [isComparing, setIsComparing] = useState(false);
  const [activeMatrixTab, setActiveMatrixTab] = useState('data'); // 'data' | 'columns'

  // Modals State
  const [inspectedPod, setInspectedPod] = useState(null);
  const [syncModalOpen, setSyncModalOpen] = useState(false);
  const [targetPodIds, setTargetPodIds] = useState([]);
  const [dryRun, setDryRun] = useState(false);
  const [syncColumns, setSyncColumns] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);

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
  useEffect(() => {
    if (!selectedMasterId) {
      setTables([]);
      setSelectedTable('');
      return;
    }

    setIsLoadingTables(true);
    setError('');
    fetchMasterTablesApi(selectedMasterId)
      .then(res => {
        const tblList = res.tables || [];
        setTables(tblList);
        // Preselect popular table if exists, else first table
        const defaultTable = tblList.find(t => t.tableName === 'pod_topics' || t.tableName === 'settings') || tblList[0];
        if (defaultTable) {
          setSelectedTable(defaultTable.tableName);
        } else {
          setSelectedTable('');
        }
      })
      .catch(err => {
        setError(err.message || 'Gagal memuat daftar tabel master.');
      })
      .finally(() => {
        setIsLoadingTables(false);
      });
  }, [selectedMasterId]);

  // 3. Load Comparison Matrix
  const handleCompare = async () => {
    if (!selectedMasterId || !selectedTable) return;
    setIsComparing(true);
    setError('');
    try {
      const data = await fetchMasterTableMatrixApi(selectedMasterId, selectedTable);
      setMatrixData(data);
    } catch (err) {
      setError(err.message || 'Gagal membandingkan tabel Master vs PODs.');
    } finally {
      setIsComparing(false);
    }
  };

  // Auto compare when table is selected
  useEffect(() => {
    if (selectedMasterId && selectedTable) {
      handleCompare();
    }
  }, [selectedMasterId, selectedTable]);

  // 4. Trigger Bulk Sync (All mismatching online pods)
  const triggerBulkSync = () => {
    if (!matrixData) return;
    const mismatchOnlineIds = matrixData.pods
      .filter(p => p.isOnline && p.status !== 'SYNCED')
      .map(p => p.id);

    if (mismatchOnlineIds.length === 0) {
      // If all synced, pick all online
      const allOnlineIds = matrixData.pods.filter(p => p.isOnline).map(p => p.id);
      setTargetPodIds(allOnlineIds);
    } else {
      setTargetPodIds(mismatchOnlineIds);
    }
    setSyncModalOpen(true);
  };

  // Trigger Sync for Single POD
  const triggerSinglePodSync = (podId) => {
    setTargetPodIds([podId]);
    setSyncModalOpen(true);
  };

  // 5. Execute Sync
  const handlePerformSync = async () => {
    if (!selectedMasterId || !selectedTable || targetPodIds.length === 0) {
      setError('Pilih minimal satu target POD online.');
      return;
    }

    setIsSyncing(true);
    setError('');
    try {
      const res = await performMasterSyncApi({
        masterId: Number(selectedMasterId),
        tableName: selectedTable,
        targetPodIds,
        dryRun,
        syncColumns,
        syncData: true
      });

      setSuccessMsg(
        `Sukses! ${dryRun ? 'Simulasi' : 'Sinkronisasi'} tabel '${selectedTable}' berhasil dijalankan ke ${res.successfulTargets} target POD.`
      );
      setSyncModalOpen(false);
      await handleCompare();
      setTimeout(() => setSuccessMsg(''), 6000);
    } catch (err) {
      setError(err.message || 'Gagal melakukan sinkronisasi ke POD.');
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 text-slate-100 w-full">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-cyan-500/20">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2 bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl border border-slate-700 transition-colors cursor-pointer"
            title="Kembali ke Dashboard"
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-extrabold text-white tracking-tight">
                Master ➡️ Multi-POD Sync Matrix
              </h1>
              <span className="text-xs font-mono font-bold px-2.5 py-0.5 rounded-full bg-purple-500/15 text-purple-300 border border-purple-500/30">
                PostgreSQL
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Audit Keselarasan Skema Kolom &amp; Baris Data dari <strong className="text-cyan-300">Database Master</strong> ke seluruh armada <strong className="text-purple-300">POD V3</strong>
            </p>
          </div>
        </div>

        {/* Action Button: Refresh */}
        <div className="flex items-center gap-3">
          {matrixData && matrixData.summary?.mismatchPods > 0 && (
            <button
              onClick={triggerBulkSync}
              className="px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-slate-950 font-extrabold rounded-xl text-xs flex items-center gap-1.5 shadow-lg shadow-amber-500/25 transition-all cursor-pointer hover:scale-105"
            >
              <Zap size={15} className="fill-slate-950" />
              <span>Sync Semua POD Kurang ({matrixData.summary.mismatchPods})</span>
            </button>
          )}

          <button
            onClick={handleCompare}
            disabled={isComparing || !selectedTable}
            className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-cyan-400 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors border border-slate-700 cursor-pointer shadow-sm disabled:opacity-50"
          >
            <RefreshCw size={14} className={isComparing ? 'animate-spin' : ''} />
            <span>Muat Ulang Matriks</span>
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

      {/* Step 1 & 2: Master Selector Bar */}
      <MasterSelectorBar
        masterDatabases={masterDatabases}
        selectedMasterId={selectedMasterId}
        onSelectMaster={setSelectedMasterId}
        tables={tables}
        selectedTable={selectedTable}
        onSelectTable={setSelectedTable}
        isLoadingTables={isLoadingTables}
        onCompare={handleCompare}
        isComparing={isComparing}
      />

      {/* RENDER SKELETON LOADER OR REAL MATRIX */}
      {isComparing ? (
        <MasterPodSkeleton />
      ) : matrixData ? (
        <div className="flex flex-col gap-5">
          {/* Summary Stat Overview Cards */}
          <MasterPodMatrixSummaryCards
            summary={matrixData.summary}
            masterInfo={matrixData.master}
            onBulkSync={triggerBulkSync}
          />

          {/* Matrix Tab Switcher Toolbar */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-3.5 flex flex-wrap items-center justify-between gap-3 shadow-sm">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setActiveMatrixTab('data')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  activeMatrixTab === 'data'
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                📊 Matriks Baris Data ({matrixData.master?.rowCount || 0} Baris Master)
              </button>

              <button
                onClick={() => setActiveMatrixTab('columns')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  activeMatrixTab === 'columns'
                    ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                📑 Matriks Skema Kolom ({matrixData.master?.columnCount || 0} Kolom DDL)
              </button>
            </div>

            {matrixData.summary?.mismatchPods > 0 && (
              <button
                onClick={triggerBulkSync}
                className="px-3.5 py-1.5 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-slate-950 font-extrabold rounded-xl text-xs flex items-center gap-1.5 shadow-md shadow-amber-500/20 transition-all cursor-pointer"
              >
                <Zap size={14} className="fill-slate-950" />
                <span>Sync Tabel Ini ke {matrixData.summary.mismatchPods} POD</span>
              </button>
            )}
          </div>

          {/* TAB 1: Data Row Matrix */}
          {activeMatrixTab === 'data' && (
            <MasterPodDataMatrix
              dataMatrix={matrixData.dataMatrix}
              pods={matrixData.pods}
              onInspectPod={setInspectedPod}
              onQuickSyncRow={(podId) => triggerSinglePodSync(podId)}
            />
          )}

          {/* TAB 2: Column Schema Matrix */}
          {activeMatrixTab === 'columns' && (
            <MasterPodColumnMatrix
              columnsMatrix={matrixData.columnsMatrix}
              pods={matrixData.pods}
            />
          )}
        </div>
      ) : (
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-12 text-center text-slate-400 font-sans text-xs flex flex-col items-center justify-center gap-3">
          <Database size={32} className="text-cyan-400/60" />
          <p>Pilih Database Master dan Tabel di atas untuk menampilkan Matriks Perbandingan Multi-POD.</p>
        </div>
      )}

      {/* DETAIL DIFF MODAL */}
      {inspectedPod && (
        <MasterPodDiffModal
          pod={inspectedPod}
          masterInfo={matrixData?.master}
          onClose={() => setInspectedPod(null)}
          onSyncThisPod={triggerSinglePodSync}
        />
      )}

      {/* SYNC CONFIRMATION MODAL */}
      {syncModalOpen && (
        <MasterPodSyncModal
          isOpen={syncModalOpen}
          onClose={() => setSyncModalOpen(false)}
          masterInfo={matrixData?.master}
          targetPodIds={targetPodIds}
          setTargetPodIds={setTargetPodIds}
          pods={matrixData?.pods}
          dryRun={dryRun}
          setDryRun={setDryRun}
          syncColumns={syncColumns}
          setSyncColumns={setSyncColumns}
          isSyncing={isSyncing}
          onPerformSync={handlePerformSync}
        />
      )}
    </div>
  );
}
