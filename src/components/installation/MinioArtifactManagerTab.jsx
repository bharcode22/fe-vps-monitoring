import React, { useState, useEffect } from 'react';
import {
  HardDrive,
  Trash2,
  RotateCw,
  Search,
  CheckCircle2,
  AlertTriangle,
  Layers,
  FileArchive,
  FileCode,
  Package,
  Calendar,
  Sparkles,
  Filter,
  Check,
  Cpu,
  Tv
} from 'lucide-react';
import {
  fetchMinioArtifactDetailsApi,
  deleteMinioArtifactVersionApi,
  deleteMinioBatchArtifactVersionsApi,
  cleanupMinioOlderArtifactVersionsApi
} from '../../api/vpsApi';
import { POD_APPS, FRONTEND_APPS } from './constants';
import MinioDeleteConfirmModal from './MinioDeleteConfirmModal';

export default function MinioArtifactManagerTab() {
  const [selectedApp, setSelectedApp] = useState('mobile-api');
  const [selectedEnv, setSelectedEnv] = useState('dev');
  const [artifactData, setArtifactData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedVersions, setSelectedVersions] = useState([]);
  const [toastMessage, setToastMessage] = useState(null);

  // Modal Delete state
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [versionsPendingDelete, setVersionsPendingDelete] = useState([]);
  const [isDeleting, setIsDeleting] = useState(false);

  // Auto cleanup keep limit
  const [cleanupKeepCount, setCleanupKeepCount] = useState(3);
  const [isCleaningUp, setIsCleaningUp] = useState(false);

  const allAppsList = [
    ...POD_APPS.map(a => ({ ...a, type: 'backend' })),
    ...FRONTEND_APPS.map(a => ({ ...a, type: 'frontend' }))
  ];

  // Fetch versions on app / env change
  useEffect(() => {
    loadArtifactDetails();
  }, [selectedApp, selectedEnv]);

  const loadArtifactDetails = async () => {
    setIsLoading(true);
    setError(null);
    setSelectedVersions([]);
    try {
      const data = await fetchMinioArtifactDetailsApi(selectedApp, selectedEnv);
      setArtifactData(data);
    } catch (err) {
      setError(err.message || 'Gagal memuat rincian artefak MinIO');
    } finally {
      setIsLoading(false);
    }
  };

  const showToast = (message, type = 'success') => {
    setToastMessage({ message, type });
    setTimeout(() => setToastMessage(null), 3500);
  };

  const formatBytes = (bytes = 0) => {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    try {
      const d = new Date(dateStr);
      return d.toLocaleString('id-ID', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (e) {
      return dateStr;
    }
  };

  // Toggle selection for bulk delete
  const toggleSelectVersion = (verStr) => {
    setSelectedVersions(prev =>
      prev.includes(verStr) ? prev.filter(v => v !== verStr) : [...prev, verStr]
    );
  };

  const handleSelectAll = () => {
    if (filteredVersions.length === 0) return;
    if (selectedVersions.length === filteredVersions.length) {
      setSelectedVersions([]);
    } else {
      setSelectedVersions(filteredVersions.map(v => v.version));
    }
  };

  // Trigger single delete modal
  const handlePromptSingleDelete = (verStr) => {
    setVersionsPendingDelete([verStr]);
    setIsDeleteModalOpen(true);
  };

  // Trigger batch delete modal
  const handlePromptBatchDelete = () => {
    if (selectedVersions.length === 0) return;
    setVersionsPendingDelete(selectedVersions);
    setIsDeleteModalOpen(true);
  };

  // Execute deletion confirmed in modal
  const handleExecuteDelete = async () => {
    setIsDeleting(true);
    try {
      if (versionsPendingDelete.length === 1) {
        await deleteMinioArtifactVersionApi(selectedApp, selectedEnv, versionsPendingDelete[0]);
        showToast(`Versi ${versionsPendingDelete[0]} berhasil dihapus dari MinIO!`, 'success');
      } else {
        const res = await deleteMinioBatchArtifactVersionsApi(selectedApp, selectedEnv, versionsPendingDelete);
        showToast(`${res.totalDeletedVersions} versi (${res.totalDeletedFiles} file) berhasil dihapus!`, 'success');
      }
      setIsDeleteModalOpen(false);
      setVersionsPendingDelete([]);
      await loadArtifactDetails();
    } catch (err) {
      showToast(`Gagal menghapus: ${err.message}`, 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  // Execute quick auto cleanup (keep N newest)
  const handleExecuteCleanup = async () => {
    const totalVers = artifactData?.versions?.length || 0;
    if (totalVers <= cleanupKeepCount) {
      alert(`Jumlah versi (${totalVers}) sudah sama atau kurang dari target simpan (${cleanupKeepCount}).`);
      return;
    }

    if (!window.confirm(`Yakin ingin membersihkan MinIO? Hanya ${cleanupKeepCount} versi terbaru yang akan dipertahankan, sisanya akan dihapus permanen.`)) {
      return;
    }

    setIsCleaningUp(true);
    try {
      const res = await cleanupMinioOlderArtifactVersionsApi(selectedApp, selectedEnv, cleanupKeepCount);
      showToast(res.message || 'Pembersihan versi lama berhasil!', 'success');
      await loadArtifactDetails();
    } catch (err) {
      showToast(`Gagal melakukan cleanup: ${err.message}`, 'error');
    } finally {
      setIsCleaningUp(false);
    }
  };

  const filteredVersions = (artifactData?.versions || []).filter(v =>
    v.version.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (v.files && v.files.some(f => f.filename.toLowerCase().includes(searchQuery.toLowerCase())))
  );

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-200">
      {/* Toast Notification */}
      {toastMessage && (
        <div className={`fixed bottom-6 right-6 z-50 px-4 py-3 rounded-2xl shadow-2xl text-xs font-bold flex items-center gap-2 transition-all backdrop-blur-xl ${
          toastMessage.type === 'error'
            ? 'bg-rose-500/90 text-white border border-rose-400/50 shadow-rose-500/20'
            : 'bg-emerald-500/90 text-slate-950 border border-emerald-400/50 shadow-emerald-500/20'
        }`}>
          <span>{toastMessage.message}</span>
        </div>
      )}

      {/* Top Application & Environment Filter Panel */}
      <div className="glass-card p-5 rounded-2xl border border-emerald-500/30 bg-slate-950/80 backdrop-blur-md shadow-2xl flex flex-col gap-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                <HardDrive size={18} />
              </div>
              <h2 className="text-sm font-extrabold text-white">
                MinIO Bucket Artifact & Storage Explorer
              </h2>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Pilih aplikasi dan environment untuk melihat daftar bundle artefak di MinIO, mengecek ukuran file, dan membersihkan versi lama.
            </p>
          </div>

          {/* Environment Selector Toggle */}
          <div className="flex items-center bg-slate-900 p-1 rounded-xl border border-slate-800 self-start lg:self-auto">
            <button
              onClick={() => setSelectedEnv('dev')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                selectedEnv === 'dev'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Development (dev)
            </button>
            <button
              onClick={() => setSelectedEnv('release')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                selectedEnv === 'release' || selectedEnv === 'prod'
                  ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Release / Production
            </button>
          </div>
        </div>

        {/* Application Selection Chips */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-800">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mr-1">
            Target Aplikasi:
          </span>
          {allAppsList.map(app => {
            const isSelected = selectedApp === app.id;
            const isBackend = app.type === 'backend';

            return (
              <button
                key={app.id}
                onClick={() => setSelectedApp(app.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer border ${
                  isSelected
                    ? isBackend
                      ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/50 shadow-md shadow-cyan-500/10'
                      : 'bg-purple-500/20 text-purple-300 border-purple-500/50 shadow-md shadow-purple-500/10'
                    : 'bg-slate-900/80 text-slate-400 border-slate-800 hover:text-white hover:border-slate-700'
                }`}
              >
                {isBackend ? <Cpu size={13} className={isSelected ? 'text-cyan-400' : 'text-slate-500'} /> : <Tv size={13} className={isSelected ? 'text-purple-400' : 'text-slate-500'} />}
                <span>{app.label}</span>
                {isSelected && <Check size={12} className="ml-0.5" />}
              </button>
            );
          })}
        </div>
      </div>

      {/* Storage Metrics & Auto-Cleanup Action Bar */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Metric 1: Total Versions */}
        <div className="glass-card p-4 rounded-2xl border border-cyan-500/20 bg-slate-950/80 text-center flex flex-col justify-center">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Versi Terdeteksi</span>
          <div className="text-2xl font-extrabold text-cyan-300 mt-1">
            {isLoading ? '...' : artifactData?.totalVersions || 0}
          </div>
          <span className="text-[10px] text-slate-500 font-mono mt-0.5">{selectedApp} ({selectedEnv})</span>
        </div>

        {/* Metric 2: Total Storage Size */}
        <div className="glass-card p-4 rounded-2xl border border-emerald-500/20 bg-slate-950/80 text-center flex flex-col justify-center">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Ruang MinIO</span>
          <div className="text-2xl font-extrabold text-emerald-400 mt-1 font-mono">
            {isLoading ? '...' : formatBytes(artifactData?.grandTotalBytes)}
          </div>
          <span className="text-[10px] text-slate-500 font-mono mt-0.5">Bucket: {artifactData?.bucket || 'deploybox'}</span>
        </div>

        {/* Metric 3: Quick Auto-Cleanup (Keep N Newest) */}
        <div className="md:col-span-2 glass-card p-4 rounded-2xl border border-purple-500/25 bg-slate-950/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-1.5 text-purple-300 text-xs font-bold">
              <Sparkles size={14} className="text-purple-400" />
              <span>Smart Storage Cleanup</span>
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Hapus semua versi lama dan pertahankan versi paling baru.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <select
              value={cleanupKeepCount}
              onChange={(e) => setCleanupKeepCount(Number(e.target.value))}
              className="bg-slate-900 border border-purple-500/40 rounded-xl px-2.5 py-1.5 text-xs font-bold text-white focus:outline-none focus:border-purple-400 cursor-pointer"
            >
              <option value={1}>Simpan 1 Terbaru</option>
              <option value={2}>Simpan 2 Terbaru</option>
              <option value={3}>Simpan 3 Terbaru</option>
              <option value={5}>Simpan 5 Terbaru</option>
              <option value={10}>Simpan 10 Terbaru</option>
            </select>

            <button
              onClick={handleExecuteCleanup}
              disabled={isCleaningUp || isLoading || (artifactData?.versions?.length || 0) <= cleanupKeepCount}
              className={`px-3 py-1.5 rounded-xl text-xs font-extrabold flex items-center gap-1.5 transition-all cursor-pointer ${
                (artifactData?.versions?.length || 0) > cleanupKeepCount
                  ? 'bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-400 hover:to-indigo-400 text-white shadow-md shadow-purple-500/20'
                  : 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed'
              }`}
            >
              <Trash2 size={13} />
              <span>{isCleaningUp ? 'Membersihkan...' : 'Bersihkan Versi Lama'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Version List Table & Bulk Action Toolbar */}
      <div className="glass-card p-5 rounded-2xl border border-cyan-500/20 bg-slate-950/90 shadow-2xl flex flex-col gap-4">
        {/* Toolbar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <button
              onClick={handleSelectAll}
              className="px-2.5 py-1 bg-slate-900 hover:bg-slate-800 text-slate-300 rounded-lg border border-slate-800 text-xs font-bold transition-colors cursor-pointer"
            >
              {selectedVersions.length === filteredVersions.length && filteredVersions.length > 0
                ? 'Batal Pilih Semua'
                : 'Pilih Semua'}
            </button>

            {selectedVersions.length > 0 && (
              <button
                onClick={handlePromptBatchDelete}
                className="px-3 py-1 bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 rounded-lg text-xs font-extrabold flex items-center gap-1.5 transition-all cursor-pointer animate-in fade-in"
              >
                <Trash2 size={13} />
                <span>Hapus {selectedVersions.length} Versi Terpilih</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <div className="relative min-w-[220px]">
              <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari versi / nama file..."
                className="w-full bg-slate-900 border border-slate-800 rounded-lg pl-8 pr-2.5 py-1 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/50"
              />
            </div>

            <button
              onClick={loadArtifactDetails}
              className="p-1.5 bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white rounded-lg border border-slate-800 transition-colors cursor-pointer"
              title="Refresh daftar versi"
            >
              <RotateCw size={14} className={isLoading ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>

        {error && (
          <div className="p-4 bg-rose-500/15 border border-rose-500/30 rounded-xl text-xs text-rose-400 flex items-center gap-2">
            <AlertTriangle size={16} />
            <span>{error}</span>
          </div>
        )}

        {/* Version Items List */}
        <div className="flex flex-col gap-3">
          {isLoading ? (
            <div className="text-center py-16 text-slate-400 text-xs flex flex-col items-center gap-2">
              <RotateCw size={24} className="animate-spin text-cyan-400" />
              <span>Memuat rincian objek MinIO bucket...</span>
            </div>
          ) : filteredVersions.length === 0 ? (
            <div className="text-center py-16 text-slate-500 text-xs italic">
              Tidak ada versi artefak ditemukan untuk aplikasi <span className="font-mono text-slate-400">{selectedApp}</span> di environment <span className="font-mono text-slate-400">{selectedEnv}</span>.
            </div>
          ) : (
            filteredVersions.map((v, index) => {
              const isSelected = selectedVersions.includes(v.version);

              return (
                <div
                  key={v.version}
                  className={`p-4 rounded-xl border transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                    isSelected
                      ? 'bg-rose-500/10 border-rose-500/40 shadow-sm'
                      : 'bg-slate-900/60 hover:bg-slate-900/90 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-start gap-3 flex-1 overflow-hidden">
                    {/* Checkbox */}
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleSelectVersion(v.version)}
                      className="mt-1 w-4 h-4 rounded border-slate-700 bg-slate-950 text-cyan-500 focus:ring-0 cursor-pointer"
                    />

                    <div className="flex flex-col gap-1.5 flex-1 min-w-0">
                      {/* Version Header Tag */}
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono font-extrabold text-sm text-cyan-300 truncate">
                          {v.version}
                        </span>

                        {index === 0 && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-mono">
                            LATEST RELEASE
                          </span>
                        )}

                        <span className="text-[10px] font-mono text-slate-400 flex items-center gap-1">
                          <Calendar size={11} />
                          <span>{formatDate(v.lastModified)}</span>
                        </span>
                      </div>

                      {/* File Items in Version */}
                      <div className="flex flex-wrap items-center gap-1.5 pt-1">
                        {v.files.map(f => (
                          <span
                            key={f.key}
                            className="text-[11px] font-mono px-2 py-0.5 rounded-md bg-slate-950/80 text-slate-300 border border-slate-800 flex items-center gap-1.5"
                          >
                            {f.filename.endsWith('.zip') ? (
                              <FileArchive size={11} className="text-amber-400" />
                            ) : f.filename.endsWith('.deb') ? (
                              <Package size={11} className="text-purple-400" />
                            ) : f.filename.endsWith('.yaml') || f.filename.endsWith('.yml') ? (
                              <FileCode size={11} className="text-cyan-400" />
                            ) : (
                              <Layers size={11} className="text-slate-400" />
                            )}
                            <span className="truncate max-w-[200px]">{f.filename}</span>
                            <span className="text-slate-500 text-[10px]">({formatBytes(f.size)})</span>
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Size and Delete Action */}
                  <div className="flex items-center justify-between md:justify-end gap-3 shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-slate-800">
                    <div className="text-right">
                      <div className="text-xs font-mono font-extrabold text-white">
                        {formatBytes(v.totalSizeBytes)}
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono">
                        {v.fileCount} File Objek
                      </div>
                    </div>

                    <button
                      onClick={() => handlePromptSingleDelete(v.version)}
                      className="p-2 bg-slate-800 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 rounded-xl border border-slate-700 hover:border-rose-500/30 transition-colors cursor-pointer"
                      title="Hapus versi ini dari MinIO"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      <MinioDeleteConfirmModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        targetAppName={selectedApp}
        targetEnv={selectedEnv}
        versionsToDelete={versionsPendingDelete}
        isDeleting={isDeleting}
        onConfirm={handleExecuteDelete}
      />
    </div>
  );
}
