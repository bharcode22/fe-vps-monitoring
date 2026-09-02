import React, { useState, useEffect } from 'react';
import { Network, Database, Activity, AlertTriangle, DownloadCloud, UploadCloud } from 'lucide-react';
import {
  fetchMasterDatabasesApi,
  syncSingleMasterRowApi
} from '../api/masterPodSyncApi';
import SyncProgressReportModal from '../components/masterPodSync/SyncProgressReportModal';
import MasterDataEditor from '../components/masterPodSync/MasterDataEditor';
import TncPodDiffSyncView from '../components/masterPodSync/TncPodDiffSyncView';
import { useLanguage } from '../context/LanguageContext';

const WORKSPACE_PARTS = {
  1: {
    name: 'Part 1: General T&C',
    type: 'editor',
    tables: ['terms_and_conditions', 'terms_and_conditions_version']
  },
  2: {
    name: 'Part 2: Questionnaire T&C & Matrix',
    type: 'editor',
    tables: [
      'terms_and_conditions_questions',
      'terms_and_conditions_question_history',
      'matrix_user_history'
    ]
  },
  3: {
    name: 'Part 3: Sinkronisasi Master ➔ POD',
    type: 'sync',
    direction: 'master_to_pod'
  },
  4: {
    name: 'Part 4: Sinkronisasi POD ➔ Master',
    type: 'sync',
    direction: 'pod_to_master'
  }
};

export default function TncManagerPage() {
  const { t } = useLanguage();
  const [masterDatabases, setMasterDatabases] = useState([]);
  const [selectedMasterId, setSelectedMasterId] = useState('');
  const [error, setError] = useState('');

  // Editor Workspace State
  const [activePart, setActivePart] = useState(1);
  const [activeTable, setActiveTable] = useState('terms_and_conditions');

  // Single Row Sync Progress Modal State
  const [progressModal, setProgressModal] = useState({
    isOpen: false,
    isProcessing: false,
    title: '',
    tableName: '',
    results: []
  });

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

  const handleSyncSingleRow = async (tableName, pkColumn, pkValue) => {
    if (!selectedMasterId) return;
    const confirm = window.confirm(`Kirim baris data ini (${pkColumn}=${pkValue}) dari Master ke seluruh POD?`);
    if (!confirm) return;

    setProgressModal({
      isOpen: true,
      isProcessing: true,
      title: `Sinkronisasi Baris: ${tableName}`,
      tableName,
      results: []
    });

    try {
      const res = await syncSingleMasterRowApi({
        masterId: selectedMasterId,
        targetPodIds: [], // All connected pods
        tableName,
        pkColumn,
        pkValue,
        dryRun: false
      });

      setProgressModal(prev => ({
        ...prev,
        isProcessing: false,
        results: res.results || []
      }));
    } catch (err) {
      alert(`Terjadi kesalahan: ${err.message}`);
      setProgressModal(prev => ({ ...prev, isOpen: false }));
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-[1600px] mx-auto min-h-screen text-slate-300 font-sans">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl sm:text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-cyan-400 to-blue-500 flex items-center gap-3">
            <Network className="text-emerald-400" size={32} />
            Sinkronisasi Terms & Conditions
          </h1>
          <p className="text-slate-400 text-sm">
            Modul khusus untuk mengorkestrasi sinkronisasi definisi T&C dan Matrix Pod secara berurutan dan terstruktur di seluruh ekosistem Master-POD.
          </p>
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/30 flex items-center gap-3 text-red-400">
          <AlertTriangle size={20} />
          <span className="text-sm font-medium">{error}</span>
        </div>
      )}

      {/* Master DB Selector */}
      <div className="glass-card p-6 rounded-3xl border border-slate-700/50 bg-slate-900/50 backdrop-blur-xl mb-8 flex items-center justify-between shadow-lg">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-gradient-to-br from-indigo-500/20 to-purple-500/20 border border-indigo-500/40 rounded-2xl text-indigo-400">
            <Database size={24} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white mb-1">Pilih Master Database</h3>
            <p className="text-xs text-slate-400">Pusat konfigurasi definisi T&C dan tujuan agregasi data.</p>
          </div>
        </div>

        <select
          value={selectedMasterId}
          onChange={(e) => setSelectedMasterId(e.target.value)}
          className="bg-slate-950 border border-slate-700 text-sm font-bold text-white px-4 py-2.5 rounded-xl outline-none focus:border-emerald-500 transition-colors w-64 shadow-inner cursor-pointer"
        >
          {masterDatabases.length === 0 && <option value="">Memuat...</option>}
          {masterDatabases.map(db => (
            <option key={db.id} value={db.id}>
              {db.name} ({db.host})
            </option>
          ))}
        </select>
      </div>

      {/* Workspace Area */}
      <div className="mt-8 mb-8">
        <div className="flex flex-col gap-6">
          {/* Top Horizontal Tabs (Parts) */}
          <div className="flex flex-wrap bg-slate-900 border border-slate-800 rounded-2xl p-1.5 gap-1 shadow-md">
            {Object.entries(WORKSPACE_PARTS).map(([key, part]) => {
              const numKey = Number(key);
              const isActive = activePart === numKey;
              const isSyncMaster = part.direction === 'master_to_pod';
              const isSyncPod = part.direction === 'pod_to_master';
              return (
                <button
                  key={key}
                  onClick={() => {
                    setActivePart(numKey);
                    if (part.tables && part.tables.length > 0) {
                      setActiveTable(part.tables[0]);
                    }
                  }}
                  className={`flex-1 min-w-[200px] px-5 py-3 text-center font-bold text-sm rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer
                    ${isActive
                      ? isSyncPod
                        ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-lg shadow-emerald-900/30 border border-emerald-500/40'
                        : isSyncMaster
                          ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-lg shadow-cyan-900/30 border border-cyan-500/40'
                          : 'bg-slate-800 text-white shadow-md border border-slate-700'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                    }`}
                >
                  {isSyncPod ? (
                    <UploadCloud size={16} className={isActive ? 'text-emerald-200' : 'text-emerald-400'} />
                  ) : isSyncMaster ? (
                    <DownloadCloud size={16} className={isActive ? 'text-cyan-200' : 'text-cyan-400'} />
                  ) : (
                    <Database size={16} className={isActive ? 'text-blue-200' : 'text-slate-500'} />
                  )}
                  <span>{part.name}</span>
                </button>
              );
            })}
          </div>

          {/* Conditional Rendering: Editor vs Sync View */}
          {WORKSPACE_PARTS[activePart]?.type === 'sync' ? (
            <TncPodDiffSyncView
              key={`sync-part-${activePart}`}
              masterId={selectedMasterId}
              direction={WORKSPACE_PARTS[activePart]?.direction || 'master_to_pod'}
            />
          ) : (
            <div className="flex flex-col gap-4 h-[720px]">
              {/* Sub-tabs (Tables) */}
              {WORKSPACE_PARTS[activePart]?.tables && (
                <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                  <div className="flex flex-wrap gap-2 p-1 bg-slate-900 rounded-2xl w-fit">
                    {WORKSPACE_PARTS[activePart].tables.map(table => (
                      <button
                        key={table}
                        onClick={() => setActiveTable(table)}
                        className={`px-5 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center gap-2 cursor-pointer
                          ${activeTable === table
                            ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20'
                            : 'text-slate-400 hover:text-white hover:bg-slate-800'
                          }`}
                      >
                        <Database size={16} className={activeTable === table ? 'text-blue-200' : 'text-slate-500'} />
                        {table}
                      </button>
                    ))}
                  </div>

                  <button
                    onClick={() => { setActivePart(3); }}
                    className="px-4 py-2.5 bg-slate-900 border border-cyan-500/30 hover:bg-cyan-500/10 text-cyan-300 text-xs font-bold rounded-2xl transition-all flex items-center gap-2 shadow-sm cursor-pointer"
                  >
                    <Activity size={14} className="text-cyan-400" />
                    <span>Buka Inspeksi Sinkronisasi POD ➔</span>
                  </button>
                </div>
              )}

              {/* Editor Area */}
              <div className="flex-1 min-h-0">
                <MasterDataEditor
                  masterId={selectedMasterId}
                  tableName={activeTable}
                  onSyncRowRequest={handleSyncSingleRow}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Row Sync Progress Modal */}
      {progressModal.isOpen && (
        <SyncProgressReportModal
          isOpen={progressModal.isOpen}
          onClose={() => setProgressModal(prev => ({ ...prev, isOpen: false }))}
          isProcessing={progressModal.isProcessing}
          title={progressModal.title}
          tableName={progressModal.tableName}
          direction="master_to_pod"
          syncResults={progressModal.results}
          dryRun={false}
          syncColumns={true}
        />
      )}

    </div>
  );
}
