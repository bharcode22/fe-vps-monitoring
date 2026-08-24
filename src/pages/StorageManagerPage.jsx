import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  HardDrive,
  RefreshCw,
  Cloud,
  CheckCircle2,
  Trash2,
  Zap,
  Folder,
  Layers,
  Sparkles
} from 'lucide-react';
import {
  fetchPodsStorageSummaryApi,
  inspectAllPodsDockerApi,
  inspectSinglePodDockerApi,
  cleanupSinglePodDockerApi,
  cleanupBatchPodsDockerApi,
  fetchS3MediaFoldersApi,
  fetchS3FolderFilesApi,
  deleteS3FolderApi,
  checkCodeOnPodsApi,
  deleteCodeOnPodApi,
  batchDeleteCodeApi
} from '../api/vpsApi';

import DockerJunkManagerView from '../components/storage/DockerJunkManagerView';
import DockerCleanupModal from '../components/storage/DockerCleanupModal';
import CatalogView from '../components/content/CatalogView';
import CodeWorkspaceView from '../components/content/CodeWorkspaceView';
import HardDeleteModal from '../components/content/HardDeleteModal';

export default function StorageManagerPage({ onBack }) {
  // Main Tab Navigation: 'docker_storage' | 'media_catalog'
  const [activeTab, setActiveTab] = useState('docker_storage');

  // =========================================================================
  // 1. PODs Storage & Docker Build Junk State
  // =========================================================================
  const [storageData, setStorageData] = useState(null);
  const [isStorageLoading, setIsStorageLoading] = useState(false);
  const [dockerInspections, setDockerInspections] = useState({}); // { [serverId]: inspectionData }
  const [isInspectingAll, setIsInspectingAll] = useState(false);
  const [inspectingSinglePodId, setInspectingSinglePodId] = useState(null);

  // Docker Cleanup Modal State
  const [dockerCleanupModal, setDockerCleanupModal] = useState({
    isOpen: false,
    targetServers: [],
    cleanType: 'safe', // 'safe' | 'deep' | 'logs' | 'all'
    result: null
  });
  const [isExecutingDockerClean, setIsExecutingDockerClean] = useState(false);

  // =========================================================================
  // 2. AWS S3 Master Media Catalog State (Level 1 & Level 2)
  // =========================================================================
  const [s3FoldersData, setS3FoldersData] = useState(null);
  const [isS3Loading, setIsS3Loading] = useState(false);
  const [s3Error, setS3Error] = useState('');
  const [catalogSearch, setCatalogSearch] = useState('');
  const [catalogCategoryFilter, setCatalogCategoryFilter] = useState('all');
  const [catalogPage, setCatalogPage] = useState(1);
  const catalogPageSize = 18;

  // Level 2 Code Workspace State
  const [activeCodeDetail, setActiveCodeDetail] = useState(null);
  const [detailS3Files, setDetailS3Files] = useState(null);
  const [isDetailFilesLoading, setIsDetailFilesLoading] = useState(false);
  const [detailPodsStatus, setDetailPodsStatus] = useState({});
  const [isCheckingAllPods, setIsCheckingAllPods] = useState(false);
  const [checkingSinglePodId, setCheckingSinglePodId] = useState(null);
  const [podStatusFilter, setPodStatusFilter] = useState('all');
  const [loadingActions, setLoadingActions] = useState({});

  // Hard Delete S3/Media Modal
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    title: '',
    description: '',
    s3Code: '',
    filenames: [],
    targetPodIds: [],
    deleteFromS3: false,
    podNameLabel: ''
  });
  const [isExecutingDelete, setIsExecutingDelete] = useState(false);
  const [successToast, setSuccessToast] = useState('');

  // Audio Preview Player
  const [playingAudioUrl, setPlayingAudioUrl] = useState(null);

  // Load initial data on mount
  useEffect(() => {
    loadStorageAndDockerData();
    loadS3Folders();
  }, []);

  const loadStorageAndDockerData = async () => {
    setIsStorageLoading(true);
    try {
      const summary = await fetchPodsStorageSummaryApi('v3');
      setStorageData(summary);
      // Auto trigger docker inspection
      handleInspectAllDocker();
    } catch (err) {
      console.error('Error fetching storage summary:', err.message);
    } finally {
      setIsStorageLoading(false);
    }
  };

  const handleInspectAllDocker = async () => {
    setIsInspectingAll(true);
    try {
      const res = await inspectAllPodsDockerApi();
      if (res && Array.isArray(res)) {
        const map = {};
        res.forEach(item => {
          map[item.serverId] = item;
        });
        setDockerInspections(map);
      }
    } catch (err) {
      console.error('Error inspecting all Docker storage:', err.message);
    } finally {
      setIsInspectingAll(false);
    }
  };

  const handleInspectSingleDocker = async (serverId) => {
    setInspectingSinglePodId(serverId);
    try {
      const res = await inspectSinglePodDockerApi(serverId);
      if (res) {
        setDockerInspections(prev => ({
          ...prev,
          [serverId]: res
        }));
      }
    } catch (err) {
      console.error(`Error inspecting Docker storage for server ${serverId}:`, err.message);
    } finally {
      setInspectingSinglePodId(null);
    }
  };

  // =========================================================================
  // Docker Cleanup Handlers
  // =========================================================================
  const handleOpenDockerCleanupModal = (servers = []) => {
    setDockerCleanupModal({
      isOpen: true,
      targetServers: servers,
      cleanType: 'safe',
      result: null
    });
  };

  const handleExecuteDockerCleanup = async () => {
    const { targetServers, cleanType } = dockerCleanupModal;
    setIsExecutingDockerClean(true);

    try {
      if (targetServers.length === 1) {
        const serverId = targetServers[0].serverId;
        const result = await cleanupSinglePodDockerApi(serverId, cleanType);
        setDockerCleanupModal(prev => ({ ...prev, result }));
        handleInspectSingleDocker(serverId);
        setSuccessToast(`Berhasil membersihkan sampah Docker di ${result.serverName} (+${result.freedFormatted} dibebaskan)`);
      } else {
        const serverIds = targetServers.map(s => s.serverId);
        const result = await cleanupBatchPodsDockerApi(serverIds, cleanType);
        setDockerCleanupModal(prev => ({ ...prev, result }));
        handleInspectAllDocker();
        setSuccessToast(`Berhasil membersihkan sampah Docker di ${result.totalServers} POD (+${result.totalFreedFormatted} dibebaskan)`);
      }
    } catch (err) {
      alert(`Gagal mengeksekusi pembersihan Docker: ${err.message}`);
    } finally {
      setIsExecutingDockerClean(false);
    }
  };

  // =========================================================================
  // Media S3 Catalog Handlers
  // =========================================================================
  const loadS3Folders = async () => {
    setIsS3Loading(true);
    setS3Error('');
    try {
      const data = await fetchS3MediaFoldersApi();
      setS3FoldersData(data);
    } catch (err) {
      setS3Error(err.message || 'Gagal memuat katalog folder AWS S3');
    } finally {
      setIsS3Loading(false);
    }
  };

  const handleOpenCodeDetail = async (folder) => {
    setActiveCodeDetail(folder);
    setDetailS3Files(null);
    setDetailPodsStatus({});
    setIsDetailFilesLoading(true);

    try {
      const filesData = await fetchS3FolderFilesApi(folder.code);
      setDetailS3Files(filesData);
      checkPodsForActiveCode(folder.code, filesData.files?.map(f => f.filename) || []);
    } catch (err) {
      alert(`Gagal memuat file untuk kode #${folder.code}: ${err.message}`);
    } finally {
      setIsDetailFilesLoading(false);
    }
  };

  const handleBackToCatalog = () => {
    setActiveCodeDetail(null);
    setDetailS3Files(null);
    setDetailPodsStatus({});
    setPlayingAudioUrl(null);
  };

  const checkPodsForActiveCode = async (code = activeCodeDetail?.code, filenames = []) => {
    if (!code) return;
    setIsCheckingAllPods(true);
    try {
      const knownFilenames = filenames.length > 0
        ? filenames
        : (detailS3Files?.files?.map(f => f.filename) || []);

      const matrix = await checkCodeOnPodsApi(code, knownFilenames);
      setDetailPodsStatus(matrix || {});
    } catch (err) {
      console.error(`Error checking PODs for code ${code}:`, err.message);
    } finally {
      setIsCheckingAllPods(false);
    }
  };

  const checkSinglePodForActiveCode = async (podServerId) => {
    if (!activeCodeDetail) return;
    setCheckingSinglePodId(podServerId);
    try {
      const knownFilenames = detailS3Files?.files?.map(f => f.filename) || [];
      const matrix = await checkCodeOnPodsApi(activeCodeDetail.code, knownFilenames, [podServerId]);
      if (matrix && matrix[podServerId]) {
        setDetailPodsStatus(prev => ({
          ...prev,
          [podServerId]: matrix[podServerId]
        }));
      }
    } catch (err) {
      console.error(`Error checking single POD ${podServerId}:`, err.message);
    } finally {
      setCheckingSinglePodId(null);
    }
  };

  const handlePromptDeleteOnSinglePod = (pod) => {
    if (!activeCodeDetail) return;
    const s3Code = activeCodeDetail.code;
    const filenames = detailS3Files?.files?.map(f => f.filename) || [];

    setConfirmModal({
      isOpen: true,
      title: `Hard Delete Konten #${s3Code} di ${pod.serverName}`,
      description: `Apakah Anda yakin ingin menghapus semua file fisik untuk kode #${s3Code} di server ${pod.serverName}? File di /home/pod/sounds, /videos, /images akan dihapus permanen dan ruang disk langsung dibebaskan.`,
      s3Code,
      filenames,
      targetPodIds: [pod.serverId],
      deleteFromS3: false,
      podNameLabel: pod.serverName
    });
  };

  const handlePromptDeleteOnS3 = () => {
    if (!activeCodeDetail) return;
    const s3Code = activeCodeDetail.code;
    const totalFiles = detailS3Files?.totalFiles || activeCodeDetail.totalFiles;
    const totalSize = detailS3Files?.totalSizeFormatted || activeCodeDetail.totalSizeFormatted;

    setConfirmModal({
      isOpen: true,
      title: `Hard Delete Master Folder #${s3Code} di AWS S3`,
      description: `PERINGATAN KRUSIAL: Ini akan menghapus seluruh file (${totalFiles} file, ${totalSize}) pada prefix S3 media/${s3Code}/ secara PERMANEN dari AWS S3.`,
      s3Code,
      filenames: [],
      targetPodIds: [],
      deleteFromS3: true,
      podNameLabel: 'Bucket AWS S3'
    });
  };

  const handleExecuteConfirmedDelete = async () => {
    const { s3Code, filenames, targetPodIds, deleteFromS3 } = confirmModal;
    setIsExecutingDelete(true);

    const actionKey = deleteFromS3
      ? `s3_${s3Code}`
      : targetPodIds.length === 1
        ? `pod_${s3Code}_${targetPodIds[0]}`
        : `bulk_${s3Code}`;

    setLoadingActions(prev => ({ ...prev, [actionKey]: true }));

    try {
      if (deleteFromS3 && targetPodIds.length === 0) {
        const result = await deleteS3FolderApi(s3Code);
        setSuccessToast(`Berhasil menghapus folder master S3 #${s3Code} (${result.deletedCount || 0} file terhapus, ${result.freedFormatted || '0 B'})`);
        loadS3Folders();
        handleBackToCatalog();
      } else if (targetPodIds.length === 1 && !deleteFromS3) {
        const result = await deleteCodeOnPodApi(targetPodIds[0], s3Code, filenames);
        setSuccessToast(`Berhasil menghapus file #${s3Code} di ${result.serverName} (${result.deletedCount} file, ${result.freedFormatted} dibebaskan)`);
        checkSinglePodForActiveCode(targetPodIds[0]);
        loadStorageAndDockerData();
      } else {
        const result = await batchDeleteCodeApi(s3Code, filenames, targetPodIds, deleteFromS3);
        setSuccessToast(`Berhasil memproses batch delete untuk kode #${s3Code}`);
        checkPodsForActiveCode(s3Code, filenames);
        loadStorageAndDockerData();
        if (deleteFromS3) {
          loadS3Folders();
          handleBackToCatalog();
        }
      }
      setConfirmModal(prev => ({ ...prev, isOpen: false }));
    } catch (err) {
      alert(`Gagal mengeksekusi penghapusan: ${err.message}`);
    } finally {
      setIsExecutingDelete(false);
      setLoadingActions(prev => ({ ...prev, [actionKey]: false }));
    }
  };

  // Filtered Catalog Folders
  const allFolders = s3FoldersData?.folders || [];
  const filteredFolders = allFolders.filter(folder => {
    const matchesSearch = catalogSearch.trim() === '' || folder.code.toLowerCase().includes(catalogSearch.trim().toLowerCase());
    if (!matchesSearch) return false;

    if (catalogCategoryFilter === 'audio') return folder.audioCount > 0;
    if (catalogCategoryFilter === 'video') return folder.videoCount > 0;
    if (catalogCategoryFilter === 'image') return folder.imageCount > 0;
    if (catalogCategoryFilter === 'strobe') return folder.strobeCount > 0;
    return true;
  });

  const totalCatalogPages = Math.ceil(filteredFolders.length / catalogPageSize) || 1;
  const currentCatalogFolders = filteredFolders.slice(
    (catalogPage - 1) * catalogPageSize,
    catalogPage * catalogPageSize
  );

  const tabs = [
    { id: 'docker_storage', label: 'Sampah Docker & Disk 1 TB', icon: Zap, color: 'cyan', badge: `${storageData?.pods?.length || 0} POD` },
    { id: 'media_catalog', label: 'Direktori Media & S3', icon: Cloud, color: 'rose', badge: `${allFolders.length} Kode S3` }
  ];

  return (
    <div className="min-h-screen text-slate-100 pb-16 animate-in fade-in duration-300">
      {/* 1. Header Navigation & Quick Bar */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-cyan-500/20 pb-5">
        <div className="flex items-center gap-3.5">
          <button
            onClick={activeCodeDetail ? handleBackToCatalog : onBack}
            className="p-2.5 bg-slate-900 hover:bg-slate-800 text-cyan-400 rounded-xl border border-cyan-500/30 transition-all cursor-pointer shadow-lg shadow-cyan-500/5 flex items-center gap-1.5 text-xs font-bold shrink-0"
          >
            <ArrowLeft size={16} />
            <span>{activeCodeDetail ? 'Kembali ke Katalog' : 'Kembali'}</span>
          </button>
          <div>
            <div className="flex items-center gap-2.5">
              <div className="bg-gradient-to-br from-cyan-500/20 to-purple-500/20 p-2.5 rounded-xl border border-cyan-500/40 text-cyan-300">
                <Sparkles size={20} />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2">
                  <span>Storage &amp; Docker Manager</span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">
                    POD v3 Volume Hub
                  </span>
                </h1>
                <p className="text-slate-400 text-xs mt-0.5">
                  {activeCodeDetail
                    ? `Workspace Pengelolaan Konten Kode #${activeCodeDetail.code}`
                    : 'Kelola kapasitas disk 1 TB, bersihkan sampah build Docker, dan pantau direktori media POD v3.'}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => { loadStorageAndDockerData(); loadS3Folders(); }}
            className="p-2 bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white rounded-xl border border-slate-800 text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors"
            title="Refresh Seluruh Data Storage"
          >
            <RefreshCw size={14} className={isStorageLoading || isInspectingAll ? 'animate-spin text-cyan-400' : ''} />
            <span className="hidden sm:inline">Refresh Data</span>
          </button>

          <span className="text-xs text-slate-400 bg-slate-900/90 px-3 py-1.5 rounded-xl border border-slate-800 flex items-center gap-2">
            <HardDrive size={14} className="text-cyan-400" />
            <span>Limit Volume: <strong className="text-white font-mono">1.0 TB per Server</strong></span>
          </span>
        </div>
      </div>

      {/* Success Notification Banner */}
      {successToast && (
        <div className="mb-5 p-4 rounded-2xl bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 text-xs flex items-center justify-between gap-3 shadow-lg animate-in fade-in duration-200">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 size={18} className="shrink-0 text-emerald-400" />
            <span className="font-semibold">{successToast}</span>
          </div>
          <button onClick={() => setSuccessToast('')} className="text-emerald-400 hover:text-white font-bold cursor-pointer">
            &times;
          </button>
        </div>
      )}

      {/* 2. Tab Navigation Switcher */}
      {!activeCodeDetail && (
        <div className="flex flex-wrap items-center bg-slate-950/90 p-1.5 rounded-2xl border border-cyan-500/20 shadow-xl gap-1.5 mb-6">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;

            const colorClasses = {
              cyan: isActive
                ? 'bg-gradient-to-r from-cyan-500/25 to-blue-500/25 text-cyan-300 border-cyan-500/40 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60',
              rose: isActive
                ? 'bg-gradient-to-r from-rose-500/25 to-pink-500/25 text-rose-300 border-rose-500/40 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60',
            }[tab.color];

            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 min-w-[180px] py-2.5 px-3 rounded-xl text-xs font-extrabold flex items-center justify-center gap-2 transition-all cursor-pointer border border-transparent ${colorClasses}`}
              >
                <Icon size={15} />
                <span>{tab.label}</span>
                {tab.badge && (
                  <span className="text-[9px] font-mono px-1.5 py-0.2 rounded-full bg-black/40 text-slate-300 border border-white/10 hidden sm:inline">
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* 3. Modular Views */}

      {/* TAB 1: Docker Build Junk & 1 TB Disk Manager */}
      {activeTab === 'docker_storage' && !activeCodeDetail && (
        <DockerJunkManagerView
          pods={storageData?.pods || []}
          dockerInspections={dockerInspections}
          isLoading={isStorageLoading}
          isInspectingAll={isInspectingAll}
          inspectingSinglePodId={inspectingSinglePodId}
          onInspectAll={handleInspectAllDocker}
          onInspectSingle={handleInspectSingleDocker}
          onOpenCleanupModal={handleOpenDockerCleanupModal}
          onGoToMediaStorage={() => setActiveTab('media_catalog')}
        />
      )}

      {/* TAB 2: Level 1 Media & S3 Catalog */}
      {activeTab === 'media_catalog' && !activeCodeDetail && (
        <CatalogView
          folders={currentCatalogFolders}
          allFoldersCount={filteredFolders.length}
          searchQuery={catalogSearch}
          onSearchChange={setCatalogSearch}
          categoryFilter={catalogCategoryFilter}
          onCategoryFilterChange={setCatalogCategoryFilter}
          currentPage={catalogPage}
          totalPages={totalCatalogPages}
          onPageChange={setCatalogPage}
          onSelectFolder={handleOpenCodeDetail}
          isLoading={isS3Loading}
          error={s3Error}
        />
      )}

      {/* Level 2: Code Detail Workspace */}
      {activeCodeDetail && (
        <CodeWorkspaceView
          activeCodeDetail={activeCodeDetail}
          onBack={handleBackToCatalog}
          detailS3Files={detailS3Files}
          isDetailFilesLoading={isDetailFilesLoading}
          playingAudioUrl={playingAudioUrl}
          onToggleAudioPreview={(url) => setPlayingAudioUrl(playingAudioUrl === url ? null : url)}
          onPromptDeleteS3={handlePromptDeleteOnS3}
          isS3Deleting={!!loadingActions[`s3_${activeCodeDetail.code}`]}
          pods={storageData?.pods || []}
          detailPodsStatus={detailPodsStatus}
          isCheckingAllPods={isCheckingAllPods}
          checkingSinglePodId={checkingSinglePodId}
          podStatusFilter={podStatusFilter}
          onPodStatusFilterChange={setPodStatusFilter}
          onCheckAllPods={checkPodsForActiveCode}
          onCheckSinglePod={checkSinglePodForActiveCode}
          onPromptDeleteSinglePod={handlePromptDeleteOnSinglePod}
          loadingActions={loadingActions}
        />
      )}

      {/* Docker Cleanup Confirmation & Execution Modal */}
      <DockerCleanupModal
        isOpen={dockerCleanupModal.isOpen}
        onClose={() => setDockerCleanupModal(prev => ({ ...prev, isOpen: false, result: null }))}
        onConfirm={handleExecuteDockerCleanup}
        isExecuting={isExecutingDockerClean}
        targetServers={dockerCleanupModal.targetServers}
        cleanType={dockerCleanupModal.cleanType}
        onCleanTypeChange={(cleanType) => setDockerCleanupModal(prev => ({ ...prev, cleanType }))}
        cleanupResult={dockerCleanupModal.result}
      />

      {/* S3 / Media Hard Delete Modal */}
      <HardDeleteModal
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
        onConfirm={handleExecuteConfirmedDelete}
        isExecuting={isExecutingDelete}
        title={confirmModal.title}
        description={confirmModal.description}
        podNameLabel={confirmModal.podNameLabel}
      />

      {/* Hidden Audio Player for Previews */}
      {playingAudioUrl && (
        <audio
          src={playingAudioUrl}
          autoPlay
          onEnded={() => setPlayingAudioUrl(null)}
          onError={() => {
            alert('Gagal memutar audio preview');
            setPlayingAudioUrl(null);
          }}
        />
      )}
    </div>
  );
}
