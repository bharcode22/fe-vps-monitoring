import React, { useState, useEffect } from 'react';
import { Network, Database, UploadCloud, DownloadCloud, Activity, AlertTriangle, CheckCircle2, Loader2 } from 'lucide-react';
import { 
  fetchMasterDatabasesApi, 
  publishTncDefinitionsApi, 
  pullConsentsAndDistributeApi,
  syncSingleMasterRowApi
} from '../api/masterPodSyncApi';
import SyncProgressReportModal from '../components/masterPodSync/SyncProgressReportModal';
import MasterDataEditor from '../components/masterPodSync/MasterDataEditor';

export default function TncManagerPage() {
  const [masterDatabases, setMasterDatabases] = useState([]);
  const [selectedMasterId, setSelectedMasterId] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // Editor Workspace State
  const [activePart, setActivePart] = useState(1);
  const [activeTable, setActiveTable] = useState('');

  const WORKSPACE_PARTS = {
    1: {
      name: 'Part 1: General T&C',
      tables: ['terms_and_conditions', 'terms_and_conditions_version'] // Reduced as per user feedback (no accepted/history CRUD)
    },
    2: {
      name: 'Part 2: Questionnaire T&C',
      tables: ['terms_and_conditions_questions', 'terms_and_conditions_question_bundle', 'terms_and_conditions_question_history', 'terms_and_conditions_version_question'] // Reduced answers/history
    },
    3: {
      name: 'Part 3: Matrix User',
      tables: ['matrix_user', 'matrix_user_history'] // Assuming these are definition matrices. If user-generated, maybe no CRUD either, but I'll leave them.
    }
  };

  // Progress Modal State
  const [progressModal, setProgressModal] = useState({
    isOpen: false,
    isProcessing: false,
    title: '',
    results: [],
    direction: 'master_to_pod'
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

  const handlePublishDefinitions = async () => {
    if (!selectedMasterId) return;
    const confirm = window.confirm('Anda yakin ingin menyebarkan (publish) semua definisi T&C terbaru ke seluruh POD? Tindakan ini akan menimpa definisi di POD.');
    if (!confirm) return;

    setProgressModal({
      isOpen: true,
      isProcessing: true,
      title: 'Menyebarkan Definisi T&C: Master ➔ POD',
      results: [],
      direction: 'master_to_pod'
    });

    try {
      const res = await publishTncDefinitionsApi({
        masterId: selectedMasterId,
        targetPodIds: [] // empty means ALL connected pods
      });
      
      if (res.success) {
        setProgressModal(prev => ({ ...prev, isProcessing: false, results: res.data.results }));
      } else {
        alert(`Gagal: ${res.error}`);
        setProgressModal(prev => ({ ...prev, isOpen: false }));
      }
    } catch (err) {
      alert(`Terjadi kesalahan jaringan: ${err.message}`);
      setProgressModal(prev => ({ ...prev, isOpen: false }));
    }
  };

  const handlePullConsents = async () => {
    if (!selectedMasterId) return;
    const confirm = window.confirm('Anda yakin ingin menarik (pull) konsolidasi data User dan Jawaban T&C dari semua POD ke Master? Ini juga akan mendistribusikannya kembali agar seragam.');
    if (!confirm) return;

    setProgressModal({
      isOpen: true,
      isProcessing: true,
      title: 'Konsolidasi Data User: POD ➔ Master ➔ POD',
      results: [],
      direction: 'pod_to_master'
    });

    try {
      const res = await pullConsentsAndDistributeApi({
        masterId: selectedMasterId,
        sourcePodIds: [] // empty means ALL connected pods
      });
      
      if (res.success) {
        setProgressModal(prev => ({ ...prev, isProcessing: false, results: res.data.results }));
      } else {
        alert(`Gagal: ${res.error}`);
        setProgressModal(prev => ({ ...prev, isOpen: false }));
      }
    } catch (err) {
      alert(`Terjadi kesalahan jaringan: ${err.message}`);
      setProgressModal(prev => ({ ...prev, isOpen: false }));
    }
  };

  const handleSyncSingleRow = async (tableName, pkColumn, pkValue) => {
    if (!selectedMasterId) return;
    const confirm = window.confirm(`Kirim baris data ini (${pkColumn}=${pkValue}) dari Master ke seluruh POD?`);
    if (!confirm) return;

    setProgressModal({
      isOpen: true,
      isProcessing: true,
      title: `Sinkronisasi Baris: ${tableName}`,
      results: [],
      direction: 'master_to_pod'
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
      
      setProgressModal(prev => ({ ...prev, isProcessing: false, results: res.results || [] }));
    } catch (err) {
      alert(`Terjadi kesalahan: ${err.message}`);
      setProgressModal(prev => ({ ...prev, isOpen: false }));
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-[1600px] mx-auto min-h-screen text-slate-300 font-sans">
      
      {/* Header */}
      <div className="flex flex-col gap-2 mb-8">
        <h1 className="text-2xl sm:text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-cyan-400 to-blue-500 flex items-center gap-3">
          <Network className="text-emerald-400" size={32} />
          Sinkronisasi Terms & Conditions
        </h1>
        <p className="text-slate-400 text-sm">
          Modul khusus untuk mengorkestrasi sinkronisasi 13 tabel T&C secara berurutan dan terstruktur di seluruh ekosistem Master-POD.
        </p>
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
          className="bg-slate-950 border border-slate-700 text-sm font-bold text-white px-4 py-2.5 rounded-xl outline-none focus:border-emerald-500 transition-colors w-64 shadow-inner"
        >
          {masterDatabases.length === 0 && <option value="">Memuat...</option>}
          {masterDatabases.map(db => (
            <option key={db.id} value={db.id}>
              {db.name} ({db.host})
            </option>
          ))}
        </select>
      </div>

      {/* Action Pipelines have been temporarily hidden as requested */}

      {/* Editor Workspace */}
      <div className="mt-12 mb-8">
        <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
          <Database className="text-blue-400" size={24} />
          Master Database Editor Workspace
        </h2>

        <div className="flex flex-col gap-4 h-[700px]">
          {/* Top Horizontal Tabs (Parts) */}
          <div className="flex bg-slate-900 border border-slate-800 rounded-2xl p-1">
            {Object.entries(WORKSPACE_PARTS).map(([key, part]) => (
              <button
                key={key}
                onClick={() => { setActivePart(Number(key)); setActiveTable(''); }}
                className={`flex-1 px-4 py-2.5 text-center font-bold text-sm rounded-xl transition-all ${activePart === Number(key) ? 'bg-slate-800 text-white shadow-md' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/30'}`}
              >
                {part.name}
              </button>
            ))}
          </div>

          {/* Sub-tabs (Tables) */}
          {activePart && (
            <div className="flex flex-wrap gap-2">
              {WORKSPACE_PARTS[activePart].tables.map(tbl => (
                <button
                  key={tbl}
                  onClick={() => setActiveTable(tbl)}
                  className={`px-4 py-2 rounded-xl text-xs transition-all ${activeTable === tbl ? 'bg-blue-600 text-white font-bold shadow-lg shadow-blue-900/30 border border-blue-500' : 'bg-slate-900 border border-slate-800 text-slate-400 hover:bg-slate-800 hover:text-slate-200'}`}
                >
                  {tbl}
                </button>
              ))}
            </div>
          )}

          {/* Editor Area */}
          <div className="flex-1 min-h-0 mt-2">
            <MasterDataEditor 
              masterId={selectedMasterId} 
              tableName={activeTable} 
              onSyncRowRequest={handleSyncSingleRow}
            />
          </div>
        </div>
      </div>

      {/* Reusing existing Sync Progress Modal */}
      {progressModal.isOpen && (
        <SyncProgressReportModal
          isOpen={progressModal.isOpen}
          onClose={() => setProgressModal(prev => ({ ...prev, isOpen: false }))}
          isProcessing={progressModal.isProcessing}
          title={progressModal.title}
          direction={progressModal.direction}
          syncResults={progressModal.results}
          dryRun={false}
          syncColumns={true}
        />
      )}

    </div>
  );
}
