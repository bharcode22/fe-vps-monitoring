import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  RefreshCw,
  Zap,
  CheckCircle2,
  AlertTriangle,
  Play,
  Layers,
  Search,
  Server,
  Shuffle,
  Terminal,
  ChevronLeft,
  ChevronRight,
  HardDrive,
  X,
  Loader2,
  FileVideo,
  Music,
  RotateCw,
  Square,
  UploadCloud,
  Check,
  Trash2,
  FileText,
  ChevronDown,
  ChevronUp,
  Download,
  CloudDownload,
  FolderOpen,
  Stethoscope,
  ShieldCheck,
  ShieldAlert,
  Info,
  Copy,
  Eye,
  Film
} from 'lucide-react';
import io from 'socket.io-client';
import { SOCKET_URL } from '../config';
import { deleteCodeOnPodApi } from '../api/modules/storageApi';
import {
  fetchMasterMultimediaListApi,
  inspectPodsSyncStatusApi,
  inspectSinglePodSyncStatusApi,
  controlPodSyncContainerApi,
  triggerMasterResaveApi,
  deleteMasterMultimediaApi,
  checkCodeOnPodsApi,
  downloadCodeFilesToPodApi,
  fetchS3FolderFilesApi,
  checkPodFileIntegrityApi
} from '../api/vpsApi';
import DockerLogModal from '../components/server/DockerLogModal';
import MultimediaUploadModal from '../components/content/MultimediaUploadModal';
import FileIntegrityModal from '../components/content/FileIntegrityModal';
import MediaPreviewModal from '../components/content/MediaPreviewModal';

export default function MultimediaRabbitMqSyncPage({ onBack, onNavigateView }) {
  // 1. Master Multimedia State
  const [multimediaItems, setMultimediaItems] = useState([]);
  const [pagination, setPagination] = useState({ total: 0, page: 1, limit: 10, totalPages: 1 });
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoadingMaster, setIsLoadingMaster] = useState(false);
  const [masterError, setMasterError] = useState('');
  const [downloadProgressMap, setDownloadProgressMap] = useState({}); // { [`${serverId}_${filename}`]: progressData }

  // Selected SoundScape for Sync
  const [selectedItem, setSelectedItem] = useState(null);

  // 2. PODs Fleet Readiness State
  const [fleetPods, setFleetPods] = useState([]);
  const [isLoadingFleet, setIsLoadingFleet] = useState(false);
  const [fleetError, setFleetError] = useState('');

  // 3. Action States
  const [actionLoadingMap, setActionLoadingMap] = useState({}); // { [actionKey]: boolean }
  const [isTriggeringResave, setIsTriggeringResave] = useState(false);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [deleteTargetItem, setDeleteTargetItem] = useState(null);
  const [isDeletingItem, setIsDeletingItem] = useState(false);
  const [successToast, setSuccessToast] = useState('');

  // 4. Log Modal & Upload Modal State
  const [logModalPod, setLogModalPod] = useState(null);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);

  // 5. On-Demand POD Physical Files Matrix State
  const [podFilesMatrix, setPodFilesMatrix] = useState({}); // { [serverId]: { fileStatus, foundCount, totalExpected, totalBytes, totalFormatted, files, missingFiles } }
  const [expandedPodFiles, setExpandedPodFiles] = useState({}); // { [serverId]: boolean }
  const [isCheckingAllFiles, setIsCheckingAllFiles] = useState(false);
  const [s3FolderFilesMap, setS3FolderFilesMap] = useState({}); // { [soundScape]: { files: [...] } }

  // 6. File Integrity Diagnostic State (ffprobe & stat)
  const [integrityMap, setIntegrityMap] = useState({}); // { [`${podId}_${filePath}`]: data }
  const [integrityModal, setIntegrityModal] = useState({
    isOpen: false,
    data: null,
    isLoading: false,
    targetPod: null,
    targetFilename: ''
  });

  // 7. Track Master Metadata Detail Modal State
  const [trackInfoModalItem, setTrackInfoModalItem] = useState(null);
  const [copiedJson, setCopiedJson] = useState(false);

  // 8. Media Preview Modal State (AWS S3 & POD Stream Player)
  const [previewModal, setPreviewModal] = useState({
    isOpen: false,
    file: null
  });

  const handleOpenMediaPreview = (file) => {
    setPreviewModal({
      isOpen: true,
      file
    });
  };

  const handleCloseMediaPreview = () => {
    setPreviewModal({
      isOpen: false,
      file: null
    });
  };

  const handleCopyTrackJson = (item) => {
    if (!item) return;
    const payload = {
      music: item.music || '',
      video: item.video || '',
      lamp: item.lamp || '',
      album: item.album || ''
    };
    navigator.clipboard.writeText(JSON.stringify(payload, null, 2));
    setCopiedJson(true);
    setTimeout(() => setCopiedJson(false), 2000);
  };

  // Fetch or retrieve cached actual filenames for this sound scape from AWS S3
  const getOrFetchS3Filenames = async (soundScape) => {
    if (s3FolderFilesMap[soundScape]?.files) {
      return s3FolderFilesMap[soundScape].files.map(f => f.filename);
    }
    try {
      const filesData = await fetchS3FolderFilesApi(soundScape);
      if (filesData) {
        setS3FolderFilesMap(prev => ({ ...prev, [soundScape]: filesData }));
        return (filesData.files || []).map(f => f.filename);
      }
      return [];
    } catch (err) {
      console.warn(`Gagal mengambil rincian file S3 #${soundScape}:`, err.message);
      return [];
    }
  };

  // Load initial Master Multimedia & Fleet ONCE on mount
  useEffect(() => {
    loadMasterMultimedia(1, searchQuery);
    inspectFleet(''); // Initial fleet scan
  }, []);

  const loadMasterMultimedia = async (page = 1, search = '') => {
    setIsLoadingMaster(true);
    setMasterError('');
    try {
      const res = await fetchMasterMultimediaListApi(search, page, 10);
      setMultimediaItems(res.data || []);
      if (res.pagination) {
        setPagination(res.pagination);
      }
      // Auto select first item if none selected
      if (!selectedItem && res.data && res.data.length > 0) {
        setSelectedItem(res.data[0]);
      }
    } catch (err) {
      console.error('Error fetching master multimedia:', err.message);
      setMasterError(err.message || 'Gagal memuat katalog multimedia dari Master API');
    } finally {
      setIsLoadingMaster(false);
    }
  };

  // Dedicated function to inspect all PODs on demand
  const inspectFleet = async (soundScapeCode = '') => {
    const targetCode = soundScapeCode || selectedItem?.sound_scape || '';
    setIsLoadingFleet(true);
    setFleetError('');
    try {
      const res = await inspectPodsSyncStatusApi(targetCode);
      setFleetPods(res.data || []);
    } catch (err) {
      console.error('Error inspecting fleet sync status:', err.message);
      setFleetError(err.message || 'Gagal memeriksa kesiapan unit POD V3');
    } finally {
      setIsLoadingFleet(false);
    }
  };

  // Inspect ONLY a single POD without reloading other PODs
  const handleInspectSinglePod = async (pod) => {
    const podId = pod.serverId || pod.id;
    const actionKey = `inspect_${podId}`;
    setActionLoadingMap(prev => ({ ...prev, [actionKey]: true }));

    try {
      const freshData = await inspectSinglePodSyncStatusApi(podId, selectedItem?.sound_scape || '');
      setFleetPods(prev => prev.map(p => (p.serverId === podId ? { ...p, ...freshData } : p)));
    } catch (err) {
      console.warn(`Gagal memeriksa status POD ${pod.serverName}:`, err.message);
    } finally {
      setActionLoadingMap(prev => ({ ...prev, [actionKey]: false }));
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    loadMasterMultimedia(1, searchQuery);
  };

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= pagination.totalPages) {
      loadMasterMultimedia(newPage, searchQuery);
    }
  };

  // Select track and reset old file checks so new track is clean
  const handleSelectTrack = (item) => {
    setSelectedItem(item);
    setPodFilesMatrix({});
    setExpandedPodFiles({});
    if (item?.sound_scape) {
      getOrFetchS3Filenames(item.sound_scape);
    }
  };

  // Check physical files for a single POD on-demand (~300ms)
  const handleCheckSinglePodFiles = async (pod) => {
    const podId = pod.serverId || pod.id;
    const soundScape = selectedItem?.sound_scape;
    if (!soundScape) return;

    const actionKey = `files_${podId}`;
    setActionLoadingMap(prev => ({ ...prev, [actionKey]: true }));

    try {
      // 1. Resolve EXACT real filenames from AWS S3 (just like Storage Manager)
      const realFilenames = await getOrFetchS3Filenames(soundScape);

      // 2. Query the POD for these exact filenames
      const matrix = await checkCodeOnPodsApi(soundScape, realFilenames, [podId]);
      if (matrix && matrix[podId]) {
        setPodFilesMatrix(prev => ({ ...prev, [podId]: matrix[podId] }));
        setExpandedPodFiles(prev => ({ ...prev, [podId]: true }));
      }
    } catch (err) {
      console.warn(`Gagal memeriksa berkas di POD ${pod.serverName}:`, err.message);
    } finally {
      setActionLoadingMap(prev => ({ ...prev, [actionKey]: false }));
    }
  };

  // Toggle open/close accordion for single POD file details
  const handleToggleExpandPodFiles = (podId) => {
    setExpandedPodFiles(prev => ({
      ...prev,
      [podId]: !prev[podId]
    }));
  };

  // Optional: Check physical files across all PODs on-demand
  const handleCheckAllPodsFiles = async () => {
    const soundScape = selectedItem?.sound_scape;
    if (!soundScape) return;

    setIsCheckingAllFiles(true);
    try {
      // 1. Resolve EXACT real filenames from AWS S3
      const realFilenames = await getOrFetchS3Filenames(soundScape);

      // 2. Query all PODs for these exact filenames
      const matrix = await checkCodeOnPodsApi(soundScape, realFilenames);
      if (matrix) {
        setPodFilesMatrix(matrix);
      }
    } catch (err) {
      console.warn('Gagal memeriksa berkas seluruh POD:', err.message);
    } finally {
      setIsCheckingAllFiles(false);
    }
  };

  // Download a single missing file to a specific POD
  const handleDownloadSingleMissingFile = async (pod, filename) => {
    const podId = pod.serverId || pod.id;
    const soundScape = selectedItem?.sound_scape;
    if (!soundScape || !filename) return;

    const dlKey = `dl_${podId}_${filename}`;
    setActionLoadingMap(prev => ({ ...prev, [dlKey]: true }));
    try {
      await downloadCodeFilesToPodApi(podId, soundScape, [filename]);
      setSuccessToast(`Download ${filename} ke ${pod.serverName} selesai! Memperbarui status...`);
      await handleCheckSinglePodFiles(pod);
    } catch (err) {
      alert(`Gagal mendownload ${filename} ke ${pod.serverName}: ${err.message}`);
    } finally {
      setActionLoadingMap(prev => ({ ...prev, [dlKey]: false }));
    }
  };

  // Download all missing files for a specific POD
  const handleDownloadAllMissingForPod = async (pod) => {
    const podId = pod.serverId || pod.id;
    const soundScape = selectedItem?.sound_scape;
    const podCheck = podFilesMatrix[podId];
    if (!soundScape || !podCheck?.missingFiles || podCheck.missingFiles.length === 0) return;

    const dlKey = `dl_all_${podId}`;
    setActionLoadingMap(prev => ({ ...prev, [dlKey]: true }));
    try {
      await downloadCodeFilesToPodApi(podId, soundScape, podCheck.missingFiles);
      setSuccessToast(`Download ${podCheck.missingFiles.length} berkas ke ${pod.serverName} berhasil!`);
      await handleCheckSinglePodFiles(pod);
    } catch (err) {
      alert(`Gagal mendownload berkas missing ke ${pod.serverName}: ${err.message}`);
    } finally {
      setActionLoadingMap(prev => ({ ...prev, [dlKey]: false }));
    }
  };

  // Listen for real-time S3 to POD download progress via WebSocket
  useEffect(() => {
    const socket = io(SOCKET_URL, {
      transports: ['websocket', 'polling']
    });

    socket.on('s3_pod_download_progress', (data) => {
      const key = `${data.serverId}_${data.filename}`;
      if (data.status === 'downloading' || data.status === 'starting') {
        setDownloadProgressMap(prev => ({
          ...prev,
          [key]: data
        }));
      } else if (data.status === 'completed' || data.status === 'failed') {
        // Clear progress badge after 2.5 seconds to show completion
        setTimeout(() => {
          setDownloadProgressMap(prev => {
            const next = { ...prev };
            delete next[key];
            return next;
          });
        }, 2500);
      }
    });

    socket.on('s3_pod_download_complete', (data) => {
      const key = `${data.serverId}_${data.filename}`;
      setTimeout(() => {
        setDownloadProgressMap(prev => {
          const next = { ...prev };
          delete next[key];
          return next;
        });
      }, 2500);
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  // Delete single file on a specific POD
  const handleDeleteSingleFileOnPod = async (pod, filename) => {
    const podId = pod.serverId || pod.id;
    const soundScape = selectedItem?.sound_scape;
    if (!soundScape || !filename) return;

    if (!window.confirm(`Hapus file ${filename} di server ${pod.serverName}?`)) return;

    const actionKey = `del_file_${podId}_${filename}`;
    setActionLoadingMap(prev => ({ ...prev, [actionKey]: true }));
    try {
      await deleteCodeOnPodApi(podId, soundScape, [filename]);
      setSuccessToast(`File ${filename} berhasil dihapus dari ${pod.serverName}`);
      await handleCheckSinglePodFiles(pod);
    } catch (err) {
      alert(`Gagal menghapus file ${filename} di ${pod.serverName}: ${err.message}`);
    } finally {
      setActionLoadingMap(prev => ({ ...prev, [actionKey]: false }));
    }
  };

  // Delete all files for this code on a specific POD
  const handleDeleteAllFilesOnPod = async (pod) => {
    const podId = pod.serverId || pod.id;
    const soundScape = selectedItem?.sound_scape;
    if (!soundScape) return;

    if (!window.confirm(`Hapus SEMUA file untuk kode #${soundScape} di server ${pod.serverName}? File fisik akan dibersihkan dari direktori media POD.`)) return;

    const actionKey = `del_pod_${podId}`;
    setActionLoadingMap(prev => ({ ...prev, [actionKey]: true }));
    try {
      await deleteCodeOnPodApi(podId, soundScape, []);
      setSuccessToast(`Semua file kode #${soundScape} berhasil dihapus dari ${pod.serverName}`);
      await handleCheckSinglePodFiles(pod);
    } catch (err) {
      alert(`Gagal menghapus file di ${pod.serverName}: ${err.message}`);
    } finally {
      setActionLoadingMap(prev => ({ ...prev, [actionKey]: false }));
    }
  };

  // Check file health & integrity using ffprobe directly on the POD
  const handleCheckFileIntegrity = async (pod, filePath, filename) => {
    const podId = pod.serverId || pod.id;
    const key = `${podId}_${filePath}`;
    const actionKey = `integrity_${podId}_${filePath}`;

    setActionLoadingMap(prev => ({ ...prev, [actionKey]: true }));
    setIntegrityModal({
      isOpen: true,
      data: null,
      isLoading: true,
      targetPod: pod,
      targetFilename: filename
    });

    try {
      const data = await checkPodFileIntegrityApi(podId, filePath);
      setIntegrityMap(prev => ({
        ...prev,
        [key]: data
      }));
      setIntegrityModal(prev => ({
        ...prev,
        isOpen: true,
        data,
        isLoading: false
      }));
    } catch (err) {
      console.error(`Error checking integrity of ${filename}:`, err.message);
      alert(`Gagal memeriksa integritas file ${filename}: ${err.message}`);
      setIntegrityModal(prev => ({ ...prev, isOpen: false, isLoading: false }));
    } finally {
      setActionLoadingMap(prev => ({ ...prev, [actionKey]: false }));
    }
  };

  // Control a single POD's mobile-synch container (Start / Restart / Stop)
  // Updates ONLY that single POD row without reloading the whole matrix
  const handleControlSinglePod = async (pod, action = 'start') => {
    const podId = pod.serverId || pod.id;
    const actionKey = `${action}_${podId}`;
    setActionLoadingMap(prev => ({ ...prev, [actionKey]: true }));

    const actionLabel = action === 'stop' ? 'dihentikan' : action === 'restart' ? 'dimuat ulang (restart)' : 'dinyalakan';

    try {
      const res = await controlPodSyncContainerApi(podId, action, 'mobile-synch', selectedItem?.sound_scape || '');
      setSuccessToast(`Container mobile-synch di ${pod.serverName} berhasil ${actionLabel}!`);

      // Update ONLY this single POD's state locally in fleetPods
      if (res.data?.podStatus) {
        setFleetPods(prev => prev.map(p => (p.serverId === podId ? { ...p, ...res.data.podStatus } : p)));
      } else {
        const nextState = action === 'stop' ? 'exited' : 'running';
        const nextStatus = action === 'stop' ? 'Exited (manual stop)' : 'Running';
        setFleetPods(prev => prev.map(p => (p.serverId === podId ? { ...p, containerState: nextState, containerStatus: nextStatus } : p)));
      }
    } catch (err) {
      alert(`Gagal mengeksekusi aksi '${action}' di ${pod.serverName}: ${err.message}`);
    } finally {
      setActionLoadingMap(prev => ({ ...prev, [actionKey]: false }));
    }
  };

  // Open Tailwind confirmation modal
  const handleOpenConfirmModal = () => {
    if (!selectedItem?.sound_scape) {
      alert('Silakan pilih salah satu konten multimedia terlebih dahulu.');
      return;
    }
    setIsConfirmModalOpen(true);
  };

  // Execute Re-Save RabbitMQ from modal
  const handleExecuteTrigger = async () => {
    if (!selectedItem?.sound_scape) return;

    const soundScape = selectedItem.sound_scape;
    setIsTriggeringResave(true);
    try {
      await triggerMasterResaveApi(soundScape);
      setIsConfirmModalOpen(false);
      setSuccessToast(`Pesan RabbitMQ untuk #${soundScape} berhasil dikirim ke Master API! POD yang aktif sedang memproses unduhan.`);
    } catch (err) {
      alert(`Gagal mentrigger re-save: ${err.message}`);
    } finally {
      setIsTriggeringResave(false);
    }
  };

  // Execute Delete Multimedia from Master API
  const handleConfirmDelete = async () => {
    if (!deleteTargetItem?.sound_scape) return;

    const soundScape = deleteTargetItem.sound_scape;
    const trackTitle = deleteTargetItem.tittle || deleteTargetItem.title || `#${soundScape}`;
    setIsDeletingItem(true);
    try {
      await deleteMasterMultimediaApi(soundScape);
      setSuccessToast(`Multimedia #${soundScape} (${trackTitle}) berhasil dihapus dari Master API!`);
      setDeleteTargetItem(null);

      // If the deleted item was currently selected, unselect it
      if (String(selectedItem?.sound_scape) === String(soundScape)) {
        setSelectedItem(null);
      }

      // Refresh master list
      loadMasterMultimedia(pagination.page, searchQuery);
    } catch (err) {
      alert(`Gagal menghapus multimedia #${soundScape}: ${err.message}`);
    } finally {
      setIsDeletingItem(false);
    }
  };

  // Fleet Stats
  const onlinePodsCount = fleetPods.filter(p => p.isOnline).length;
  const runningContainersCount = fleetPods.filter(p => p.isOnline && p.containerState === 'running').length;
  const exitedContainersCount = fleetPods.filter(p => p.isOnline && p.containerState === 'exited').length;

  const targetCoverUrl = selectedItem?.coverAlbumUrl
    ? (selectedItem.coverAlbumUrl.startsWith('http')
      ? selectedItem.coverAlbumUrl
      : `https://developerfile-084897310273.s3.ap-southeast-1.amazonaws.com${selectedItem.coverAlbumUrl}`)
    : null;

  return (
    <div className="flex flex-col h-[calc(100vh-5.4rem)] max-h-[calc(100vh-5.4rem)] text-slate-100 animate-in fade-in duration-300 overflow-hidden">

      {/* Toast Notification */}
      {successToast && (
        <div className="fixed bottom-6 right-6 z-50 p-4 rounded-2xl bg-emerald-500/95 text-slate-950 font-bold text-xs shadow-2xl shadow-emerald-500/30 flex items-center gap-3 animate-in slide-in-from-bottom-5">
          <CheckCircle2 size={18} />
          <span>{successToast}</span>
          <button onClick={() => setSuccessToast('')} className="ml-2 text-slate-900 hover:text-black">
            <X size={14} />
          </button>
        </div>
      )}

      {/* 1. Header Navigation Bar */}
      <div className="shrink-0 mb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-purple-500/20 pb-3">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2 bg-slate-900 hover:bg-slate-800 text-purple-400 rounded-xl border border-purple-500/30 transition-all cursor-pointer shadow-lg shadow-purple-500/5 flex items-center gap-1.5 text-xs font-bold shrink-0"
          >
            <ArrowLeft size={15} />
            <span>Kembali</span>
          </button>
          <div>
            <div className="flex items-center gap-2.5">
              <div className="bg-gradient-to-br from-purple-500/20 to-indigo-500/20 p-2 rounded-xl border border-purple-500/40 text-purple-300">
                <Shuffle size={18} className="animate-pulse" />
              </div>
              <div>
                <h1 className="text-lg font-black text-white tracking-tight flex items-center gap-2">
                  Content Management
                  <span className="px-2 py-0.5 rounded-full text-[9.5px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/40 uppercase">
                    Master API ➔ RabbitMQ ➔ POD V3
                  </span>
                </h1>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Pilih konten multimedia di panel kiri, pantau container <code className="text-purple-300 font-mono">mobile-synch</code> di panel kanan, lalu kirim trigger sinkronisasi.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Global Toolbar */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => setIsUploadModalOpen(true)}
            className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white border border-purple-400/30 transition-all text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-lg shadow-purple-500/20 active:scale-95 shrink-0"
            title="Unggah Konten Multimedia Master Baru ke AWS S3 & Master DB"
          >
            <UploadCloud size={14} />
            <span>Upload Multimedia</span>
          </button>
        </div>
      </div>

      {/* 2. Main 2-Column Workspace Grid (Left: Catalog, Right: Fleet Matrix) */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-3.5 items-stretch min-h-0">

        {/* ========================================================================= */}
        {/* LEFT COLUMN: Master Multimedia Catalog (5 Cols) */}
        {/* ========================================================================= */}
        <div className="lg:col-span-5 flex flex-col glass-card rounded-3xl border border-purple-500/30 bg-slate-900/70 shadow-xl overflow-hidden h-full min-h-0">

          {/* Catalog Panel Header */}
          <div className="shrink-0 p-3.5 sm:p-4 border-b border-purple-500/20 bg-gradient-to-r from-purple-950/30 to-slate-900/60 space-y-2.5">
            <div className="flex items-center justify-between gap-2 flex-wrap sm:flex-nowrap">
              <div className="flex items-center gap-2 min-w-0">
                <div className="p-1.5 rounded-lg bg-purple-500/20 text-purple-300 shrink-0">
                  <Layers size={15} />
                </div>
                <h2 className="text-xs sm:text-sm font-black text-white truncate">
                  File at Cloud
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30 shrink-0">
                  {pagination.total} Track
                </span>
              </div>
            </div>

            {/* Search Bar */}
            <form onSubmit={handleSearchSubmit} className="relative">
              <Search size={13} className="absolute left-3 top-2.5 text-slate-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Cari judul, artis, folder #sound_scape..."
                className="w-full pl-8 pr-16 py-1.5 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 font-medium"
              />
              <button
                type="submit"
                className="absolute right-1 top-1 px-2.5 py-1 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-[10px] font-bold cursor-pointer transition-all"
              >
                Cari
              </button>
            </form>
          </div>

          {/* Catalog Items List (Scrolls cleanly inside card without scrolling the page) */}
          <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar p-3 space-y-2">
            {isLoadingMaster ? (
              <div className="space-y-2 py-3">
                {[1, 2, 3, 4, 5, 6].map(n => (
                  <div key={n} className="h-14 rounded-2xl bg-slate-950/40 border border-slate-800 animate-pulse" />
                ))}
              </div>
            ) : masterError ? (
              <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
                {masterError}
              </div>
            ) : multimediaItems.length === 0 ? (
              <div className="p-10 rounded-2xl bg-slate-950/60 border border-slate-800 text-center text-slate-500 text-xs">
                Tidak ada data multimedia yang ditemukan.
              </div>
            ) : (
              multimediaItems.map(item => {
                const isSelected = String(selectedItem?.sound_scape) === String(item.sound_scape);
                const title = item.tittle || item.title || `SoundScape #${item.sound_scape}`;
                const artist = item.artist || 'Regenesis';
                const coverUrl = item.coverAlbumUrl
                  ? (item.coverAlbumUrl.startsWith('http')
                    ? item.coverAlbumUrl
                    : `https://developerfile-084897310273.s3.ap-southeast-1.amazonaws.com${item.coverAlbumUrl}`)
                  : null;

                return (
                  <div
                    key={item.id || item.sound_scape}
                    onClick={() => handleSelectTrack(item)}
                    className={`p-2.5 rounded-2xl border transition-all cursor-pointer flex flex-col gap-2 group select-none ${isSelected
                      ? 'bg-gradient-to-r from-purple-500/25 via-indigo-500/20 to-purple-500/10 border-purple-500/70 shadow-lg shadow-purple-500/15 ring-1 ring-purple-500/40'
                      : 'bg-slate-950/60 border-slate-800/80 hover:border-purple-500/40 hover:bg-slate-900/80'
                      }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5 min-w-0">
                        {coverUrl ? (
                          <img
                            src={coverUrl}
                            alt="Cover"
                            className="w-10 h-10 rounded-xl object-cover border border-slate-700 shrink-0 bg-slate-900"
                            onError={(e) => { e.target.style.display = 'none'; }}
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/30 text-purple-400 flex items-center justify-center shrink-0">
                            <Music size={16} />
                          </div>
                        )}

                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono text-[11px] font-black text-purple-300">
                              #{item.sound_scape}
                            </span>
                            {isSelected && (
                              <span className="px-1.5 py-0.2 rounded text-[8.5px] font-bold bg-purple-500 text-slate-950 flex items-center gap-0.5">
                                <Check size={9} />
                                TERPILIH
                              </span>
                            )}
                          </div>
                          <h3 className="text-xs font-bold text-white truncate group-hover:text-purple-200 mt-0.5">
                            {title}
                          </h3>
                          <p className="text-[10px] text-slate-400 truncate">
                            {artist} • {item.album || 'Master Session'}
                          </p>
                        </div>
                      </div>

                      {/* Right Actions: Clear Labeled Detail & Delete Buttons */}
                      <div className="flex items-center gap-1.5 shrink-0">
                        {/* Info Payload Modal Button */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setTrackInfoModalItem(item);
                          }}
                          className="px-2 py-1 rounded-xl bg-purple-500/15 hover:bg-purple-500/30 text-purple-200 border border-purple-500/40 text-[10.5px] font-bold flex items-center gap-1 transition-all cursor-pointer shadow-sm active:scale-95"
                          title="Lihat Struktur Data Berkas Master API (music, video, lamp, album)"
                        >
                          <Info size={12} className="text-purple-400" />
                          <span>Detail</span>
                        </button>

                        {/* Delete from Master API Button */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeleteTargetItem(item);
                          }}
                          className="px-2 py-1 rounded-xl bg-rose-500/10 hover:bg-rose-500/25 text-rose-300 hover:text-rose-100 border border-rose-500/30 hover:border-rose-500/50 text-[10.5px] font-bold flex items-center gap-1 transition-all cursor-pointer shadow-sm active:scale-95"
                          title={`Hapus #${item.sound_scape} dari Master API`}
                        >
                          <Trash2 size={12} className="text-rose-400" />
                          <span>Hapus</span>
                        </button>
                      </div>
                    </div>

                    {/* Expandable File Details for Selected Track */}
                    {isSelected && (
                      <div className="pt-2 border-t border-purple-500/20 grid grid-cols-1 gap-1 text-[9.5px] font-mono animate-in fade-in duration-150">
                        {item.music && (
                          <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-slate-950/60 border border-slate-800/80 text-cyan-300 min-w-0">
                            <Music size={10} className="text-cyan-400 shrink-0" />
                            <span className="text-slate-400 font-sans shrink-0 font-semibold">music:</span>
                            <span className="truncate" title={item.music}>{item.music}</span>
                          </div>
                        )}
                        {item.video && (
                          <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-slate-950/60 border border-slate-800/80 text-rose-300 min-w-0">
                            <FileVideo size={10} className="text-rose-400 shrink-0" />
                            <span className="text-slate-400 font-sans shrink-0 font-semibold">video:</span>
                            <span className="truncate" title={item.video}>{item.video}</span>
                          </div>
                        )}
                        {item.lamp && (
                          <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-slate-950/60 border border-slate-800/80 text-amber-300 min-w-0">
                            <Zap size={10} className="text-amber-400 shrink-0" />
                            <span className="text-slate-400 font-sans shrink-0 font-semibold">lamp:</span>
                            <span className="truncate" title={item.lamp}>{item.lamp}</span>
                          </div>
                        )}
                        {item.album && (
                          <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-slate-950/60 border border-slate-800/80 text-purple-300 min-w-0">
                            <Layers size={10} className="text-purple-400 shrink-0" />
                            <span className="text-slate-400 font-sans shrink-0 font-semibold">album:</span>
                            <span className="truncate" title={item.album}>{item.album}</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* Catalog Pagination Footer */}
          {pagination.totalPages > 1 && (
            <div className="shrink-0 p-2.5 border-t border-purple-500/20 bg-slate-950/40 flex items-center justify-between text-xs text-slate-400 mt-auto">
              <span className="text-[10.5px]">Halaman {pagination.page} / {pagination.totalPages}</span>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => handlePageChange(pagination.page - 1)}
                  disabled={pagination.page <= 1 || isLoadingMaster}
                  className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 hover:bg-slate-800 text-white disabled:opacity-30 cursor-pointer"
                  title="Halaman Sebelumnya"
                >
                  <ChevronLeft size={13} />
                </button>
                <button
                  onClick={() => handlePageChange(pagination.page + 1)}
                  disabled={pagination.page >= pagination.totalPages || isLoadingMaster}
                  className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 hover:bg-slate-800 text-white disabled:opacity-30 cursor-pointer"
                  title="Halaman Selanjutnya"
                >
                  <ChevronRight size={13} />
                </button>
              </div>
            </div>
          )}

        </div>

        {/* ========================================================================= */}
        {/* RIGHT COLUMN: POD V3 Readiness Matrix & Controls (7 Cols) */}
        {/* ========================================================================= */}
        <div className="lg:col-span-7 flex flex-col glass-card rounded-3xl border border-cyan-500/30 bg-slate-900/70 shadow-xl overflow-hidden h-full min-h-0">

          {/* Target Track Banner on Top of Matrix */}
          <div className="shrink-0 p-3 sm:p-3.5 border-b border-cyan-500/20 bg-gradient-to-r from-slate-950/80 via-cyan-950/20 to-slate-900/60">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">

              <div className="flex items-center gap-2.5 min-w-0">
                {targetCoverUrl ? (
                  <img
                    src={targetCoverUrl}
                    alt="Cover"
                    className="w-10 h-10 rounded-xl object-cover border border-purple-500/40 shrink-0 bg-slate-950 shadow-md"
                    onError={(e) => { e.target.style.display = 'none'; }}
                  />
                ) : (
                  <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/30 text-purple-400 flex items-center justify-center shrink-0">
                    <Music size={18} />
                  </div>
                )}
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] font-mono font-black text-purple-300">
                      Folder #{selectedItem?.sound_scape || '---'}
                    </span>
                    <span className="px-1.5 py-0.5 rounded text-[8.5px] font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                      TARGET SINKRONISASI
                    </span>
                  </div>
                  <h3 className="text-xs sm:text-sm font-bold text-white truncate mt-0.5">
                    {selectedItem?.tittle || selectedItem?.title || 'Pilih track di panel kiri'}
                  </h3>
                  <p className="text-[10px] text-slate-400 truncate">
                    {selectedItem?.artist || 'Regenesis'} • {selectedItem?.album || 'Master Session'}
                  </p>
                </div>
              </div>

              {/* Action Buttons: Status Check & All File Check */}
              <div className="flex items-center gap-2 shrink-0 self-end sm:self-center flex-wrap">
                {selectedItem?.sound_scape && (
                  <button
                    onClick={handleCheckAllPodsFiles}
                    disabled={isCheckingAllFiles || !onlinePodsCount}
                    className={`px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50 active:scale-95 group ${isCheckingAllFiles
                      ? 'bg-purple-500/30 border-purple-400/60 text-purple-200 shadow-lg shadow-purple-500/20 animate-pulse'
                      : 'bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 border-purple-500/40 hover:border-purple-400/60'
                      }`}
                    title="Periksa ketersediaan berkas multimedia fisik di seluruh unit POD secara serentak"
                  >
                    {isCheckingAllFiles ? (
                      <Loader2 size={13} className="animate-spin text-purple-300 shrink-0" />
                    ) : (
                      <HardDrive size={13} className="text-purple-400 shrink-0 group-hover:scale-110 transition-transform" />
                    )}
                    <span>{isCheckingAllFiles ? 'Memindai Berkas POD...' : 'Cek Berkas Semua POD'}</span>
                  </button>
                )}

                <button
                  onClick={() => inspectFleet(selectedItem?.sound_scape || '')}
                  disabled={isLoadingFleet}
                  className="px-3 py-1.5 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50 active:scale-95"
                  title="Periksa status container mobile-synch di seluruh unit POD V3"
                >
                  <RefreshCw size={13} className={isLoadingFleet ? 'animate-spin text-cyan-400' : ''} />
                  <span>Cek Status Matriks POD</span>
                </button>
              </div>

            </div>
          </div>

          {/* Matrix Header & Summary Strip */}
          <div className="shrink-0 px-3.5 py-2 bg-slate-950/40 border-b border-slate-800/80 flex items-center justify-between text-xs text-slate-400 flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <Server size={13} className="text-cyan-400" />
              <span className="font-bold text-white text-xs">Matriks Unit POD V3</span>
              <span className="font-mono text-[10.5px]">({fleetPods.length} Server)</span>
            </div>

            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded-md bg-slate-900 border border-slate-800 text-[10px] font-mono">
                <span className="text-emerald-400 font-bold">{runningContainersCount}</span>/{onlinePodsCount} Ready
              </span>
              {exitedContainersCount > 0 && (
                <span className="px-2 py-0.5 rounded-md bg-amber-500/15 border border-amber-500/30 text-[10px] font-mono text-amber-300 font-bold">
                  {exitedContainersCount} Exited
                </span>
              )}
            </div>
          </div>

          {/* Error Banner */}
          {fleetError && (
            <div className="shrink-0 m-3 p-2.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
              <AlertTriangle size={14} />
              <span>{fleetError}</span>
            </div>
          )}

          {/* POD Fleet Units List (Scrolls cleanly inside card without scrolling the page) */}
          <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar p-3 space-y-2">
            {isLoadingFleet ? (
              <div className="py-20 flex flex-col items-center justify-center text-slate-500 gap-2.5">
                <Loader2 size={22} className="animate-spin text-cyan-400" />
                <span className="text-xs">Memeriksa status container mobile-synch & disk di seluruh POD V3...</span>
              </div>
            ) : fleetPods.length === 0 ? (
              <div className="p-10 rounded-2xl bg-slate-950/60 border border-slate-800 text-center text-slate-500 text-xs">
                Tidak ada server POD V3 yang terdaftar.
              </div>
            ) : (
              fleetPods.map(pod => {
                const podId = pod.serverId || pod.id;
                const isExited = pod.isOnline && pod.containerState === 'exited';
                const isRunning = pod.isOnline && pod.containerState === 'running';
                const isStartLoading = !!actionLoadingMap[`start_${podId}`];
                const isRestartLoading = !!actionLoadingMap[`restart_${podId}`];
                const isStopLoading = !!actionLoadingMap[`stop_${podId}`];
                const isInspectLoading = !!actionLoadingMap[`inspect_${podId}`];
                const isCheckingThisPodFiles = !!actionLoadingMap[`files_${podId}`];
                const podCheck = podFilesMatrix[podId];
                const isExpanded = !!expandedPodFiles[podId];

                return (
                  <div
                    key={podId}
                    className={`p-3 rounded-2xl border transition-all flex flex-col gap-2.5 ${!pod.isOnline
                      ? 'bg-slate-950/40 border-slate-800/60 opacity-60'
                      : isExited
                        ? 'bg-amber-950/15 border-amber-500/40 shadow-sm'
                        : 'bg-slate-950/60 border-slate-800 hover:border-cyan-500/30'
                      }`}
                  >
                    {/* Top Row: POD Info & Controls */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                      {/* POD Info & IP */}
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className={`p-2 rounded-xl border shrink-0 ${!pod.isOnline
                          ? 'bg-slate-900 border-slate-800 text-slate-500'
                          : isRunning
                            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                            : 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                          }`}>
                          <Server size={15} />
                        </div>

                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="font-black text-xs text-white">
                              {pod.serverName}
                            </span>
                            <span className="font-mono text-[10px] text-slate-400">
                              ({pod.host})
                            </span>
                            {pod.pingMs && (
                              <span className="text-[9px] font-mono text-slate-500">
                                {pod.pingMs}ms
                              </span>
                            )}
                          </div>

                          {/* Badges: Container Status & On-demand File Status */}
                          <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                            {/* Container Status */}
                            <span className={`px-1.5 py-0.5 rounded-md text-[9.5px] font-bold flex items-center gap-1 border ${!pod.isOnline
                              ? 'bg-slate-800 text-slate-400 border-slate-700'
                              : isRunning
                                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                                : isExited
                                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                                  : 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                              }`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${isRunning ? 'bg-emerald-400 animate-pulse' : isExited ? 'bg-amber-400' : 'bg-rose-400'
                                }`} />
                              <span>{pod.containerStatus || pod.containerState}</span>
                            </span>

                            {/* Physical File Check Status (On-demand - Shown once checked) */}
                            {selectedItem?.sound_scape && (
                              <>
                                {isCheckingThisPodFiles ? (
                                  <span className="px-2 py-0.5 rounded-md text-[9.5px] font-mono font-bold bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 flex items-center gap-1 shadow-sm">
                                    <Loader2 size={10} className="animate-spin text-cyan-400" />
                                    <span>Memeriksa Berkas...</span>
                                  </span>
                                ) : podCheck && (
                                  <button
                                    type="button"
                                    onClick={() => handleToggleExpandPodFiles(podId)}
                                    className={`px-2 py-0.5 rounded-md text-[9.5px] font-mono font-bold flex items-center gap-1 border transition-all cursor-pointer shadow-sm active:scale-95 ${podCheck.fileStatus === 'all'
                                      ? 'bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border-emerald-500/40'
                                      : podCheck.foundCount > 0
                                        ? 'bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border-amber-500/40'
                                        : 'bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border-rose-500/40'
                                      }`}
                                    title="Klik untuk melihat/menutup rincian berkas"
                                  >
                                    <HardDrive size={10} />
                                    <span>
                                      {podCheck.fileStatus === 'all'
                                        ? `Lengkap (${podCheck.foundCount}/${podCheck.totalExpected} Berkas • ${podCheck.totalFormatted})`
                                        : podCheck.foundCount > 0
                                          ? `Sebagian (${podCheck.foundCount}/${podCheck.totalExpected} Berkas)`
                                          : `Kosong (0/${podCheck.totalExpected || 0})`}
                                    </span>
                                    {isExpanded ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
                                  </button>
                                )}
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Individual Action Controls per POD (Clean Labeled Buttons) */}
                      <div className="flex items-center gap-1.5 self-end sm:self-center shrink-0 flex-wrap">
                        {/* Start Container Button (if Exited) */}
                        {isExited && (
                          <button
                            type="button"
                            onClick={() => handleControlSinglePod(pod, 'start')}
                            disabled={isStartLoading}
                            className="px-2.5 py-1 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50 active:scale-95 shadow-sm"
                            title="Nyalakan container mobile-synch pada POD ini"
                          >
                            {isStartLoading ? (
                              <Loader2 size={11} className="animate-spin text-emerald-300" />
                            ) : (
                              <Play size={10} className="fill-emerald-400 text-emerald-400" />
                            )}
                            <span>{isStartLoading ? 'Memulai...' : 'Start'}</span>
                          </button>
                        )}

                        {/* Restart Container Button (if Online) */}
                        {pod.isOnline && (
                          <button
                            type="button"
                            onClick={() => handleControlSinglePod(pod, 'restart')}
                            disabled={isRestartLoading}
                            className="px-2.5 py-1 rounded-xl bg-purple-500/15 hover:bg-purple-500/25 text-purple-300 border border-purple-500/30 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50 active:scale-95 shadow-sm"
                            title="Restart container mobile-synch pada POD ini"
                          >
                            <RotateCw size={11} className={isRestartLoading ? 'animate-spin text-purple-400' : 'text-purple-400'} />
                            <span>{isRestartLoading ? 'Restarting...' : 'Restart'}</span>
                          </button>
                        )}

                        {/* Stop Container Button (if Running) */}
                        {isRunning && (
                          <button
                            type="button"
                            onClick={() => handleControlSinglePod(pod, 'stop')}
                            disabled={isStopLoading}
                            className="px-2.5 py-1 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border border-rose-500/30 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50 active:scale-95 shadow-sm"
                            title="Stop container mobile-synch pada POD ini"
                          >
                            {isStopLoading ? (
                              <Loader2 size={11} className="animate-spin text-rose-400" />
                            ) : (
                              <Square size={9} className="fill-rose-400 text-rose-400" />
                            )}
                            <span>{isStopLoading ? 'Menghentikan...' : 'Stop'}</span>
                          </button>
                        )}

                        {/* Cek Berkas / Refresh Status Button on the Right */}
                        {pod.isOnline && (
                          <button
                            type="button"
                            onClick={() => {
                              handleInspectSinglePod(pod);
                              handleCheckSinglePodFiles(pod);
                            }}
                            disabled={isInspectLoading || isCheckingThisPodFiles}
                            className="px-2.5 py-1 rounded-xl bg-slate-900 hover:bg-cyan-500/20 text-slate-300 hover:text-cyan-300 border border-slate-700 hover:border-cyan-500/40 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50 active:scale-95 shadow-sm"
                            title="Periksa status container dan ketersediaan berkas fisik pada POD ini"
                          >
                            <RefreshCw
                              size={11}
                              className={isInspectLoading || isCheckingThisPodFiles ? 'animate-spin text-cyan-400' : 'text-slate-400'}
                            />
                            <span>{isInspectLoading || isCheckingThisPodFiles ? 'Memeriksa...' : 'Cek Berkas'}</span>
                          </button>
                        )}

                        {/* View Logs Button */}
                        {pod.isOnline && (
                          <button
                            type="button"
                            onClick={() => setLogModalPod(pod)}
                            className="px-2 py-1 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700 text-xs font-bold flex items-center gap-1 transition-all cursor-pointer active:scale-95 shadow-sm"
                            title="Buka Console Log Real-time mobile-synch"
                          >
                            <Terminal size={11} className="text-slate-400" />
                            <span>Logs</span>
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Expandable Physical Files Checklist Sub-Panel */}
                    {isExpanded && podCheck && (
                      <div className="pt-2.5 border-t border-slate-800/80 bg-slate-950/40 rounded-xl p-2.5 space-y-2 animate-in fade-in duration-200">
                        <div className="flex items-center justify-between text-[10.5px] font-mono text-slate-400">
                          <span className="flex items-center gap-1.5 font-bold text-slate-300">
                            <FolderOpen size={12} className="text-cyan-400 shrink-0" />
                            <span>Berkas Media POD:</span>
                          </span>
                          <span className="font-bold text-white">{podCheck.foundCount}/{podCheck.totalExpected} Berkas</span>
                        </div>

                        {/* Grid of Files */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                          {/* Found Files on POD */}
                          {podCheck.files?.map(f => {
                            const integrityKey = `${podId}_${f.fullPath}`;
                            const isIntegrityChecking = !!actionLoadingMap[`integrity_${podId}_${f.fullPath}`];
                            const integrityData = integrityMap[integrityKey];
                            const progKey = `${podId}_${f.filename}`;
                            const progress = downloadProgressMap[progKey];
                            const isFileDownloading = !!actionLoadingMap[`dl_${podId}_${f.filename}`];

                            return (
                              <div
                                key={f.filename || f.fullPath}
                                className={`p-2 rounded-xl border flex flex-col gap-1 text-[10.5px] transition-all ${integrityData?.isCorrupt
                                  ? 'bg-rose-950/30 border-rose-500/50 shadow-sm'
                                  : integrityData?.status === 'healthy'
                                    ? 'bg-emerald-950/30 border-emerald-500/40 shadow-sm'
                                    : 'bg-emerald-950/20 border-emerald-500/30'
                                  }`}
                              >
                                <div className="flex items-center justify-between gap-1.5">
                                  <div className="flex items-center gap-1.5 min-w-0">
                                    <CheckCircle2 size={12} className="text-emerald-400 shrink-0" />
                                    <span className="font-bold text-white truncate font-mono text-[11px]" title={f.fullPath || f.filename}>
                                      {f.filename}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-1.5 shrink-0">
                                    <span className="text-[9.5px] font-mono text-emerald-300 font-semibold shrink-0">
                                      {f.sizeFormatted || 'Ada'}
                                    </span>

                                    {/* Tombol Cek Kesehatan / Integritas (ffprobe) */}
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleCheckFileIntegrity(pod, f.fullPath, f.filename);
                                      }}
                                      disabled={isIntegrityChecking}
                                      className={`p-1 rounded-lg border transition-all cursor-pointer ${integrityData?.isCorrupt
                                        ? 'bg-rose-500/25 text-rose-300 border-rose-500/40 hover:bg-rose-500/35'
                                        : integrityData?.status === 'healthy'
                                          ? 'bg-emerald-500/25 text-emerald-300 border-emerald-500/40 hover:bg-emerald-500/35'
                                          : 'bg-slate-900 hover:bg-slate-800 text-cyan-400 hover:text-white border-slate-700'
                                        }`}
                                      title="Cek Kesehatan & Validitas Berkas (ffprobe: durasi, bitrate, codec, korup/sehat)"
                                    >
                                      {isIntegrityChecking ? (
                                        <Loader2 size={11} className="animate-spin text-cyan-400" />
                                      ) : integrityData?.isCorrupt ? (
                                        <ShieldAlert size={11} className="text-rose-400" />
                                      ) : integrityData?.status === 'healthy' ? (
                                        <ShieldCheck size={11} className="text-emerald-400" />
                                      ) : (
                                        <Stethoscope size={11} />
                                      )}
                                    </button>
                                  </div>
                                </div>

                                {/* Badge Hasil Diagnosa Integritas ffprobe */}
                                {integrityData && (
                                  <div
                                    onClick={() => setIntegrityModal({ isOpen: true, data: integrityData, isLoading: false, targetPod: pod, targetFilename: f.filename })}
                                    className={`mt-0.5 px-2 py-1.5 rounded-lg text-[9.5px] font-mono flex flex-col gap-1 border cursor-pointer transition-all ${integrityData.isCorrupt
                                      ? 'bg-rose-950/60 text-rose-300 border-rose-500/40 hover:bg-rose-950/80'
                                      : 'bg-emerald-950/50 text-emerald-300 border-emerald-500/40 hover:bg-emerald-950/70'
                                      }`}
                                    title="Klik untuk melihat laporan diagnostik ffprobe lengkap"
                                  >
                                    <div className="flex items-center justify-between gap-1 w-full">
                                      <span className="flex items-center gap-1.5 truncate">
                                        {integrityData.isCorrupt ? (
                                          <>
                                            <AlertTriangle size={10} className="text-rose-400 shrink-0" />
                                            <b className="text-rose-400">KORUP:</b> {integrityData.message}
                                          </>
                                        ) : (
                                          <>
                                            <CheckCircle2 size={10} className="text-emerald-400 shrink-0" />
                                            <span>
                                              <b>Sehat &amp; Utuh</b>
                                              {integrityData.durationFormatted ? ` • ${integrityData.durationFormatted}` : ''}
                                              {integrityData.bitrateFormatted ? ` • ${integrityData.bitrateFormatted}` : ''}
                                            </span>
                                          </>
                                        )}
                                      </span>
                                      <span className="text-[8.5px] text-cyan-300 underline shrink-0 font-sans font-bold">Rincian &rsaquo;</span>
                                    </div>

                                    {/* Action Buttons inside Corrupt File Box */}
                                    {integrityData.isCorrupt && (
                                      <div className="flex items-center gap-1.5 mt-1 pt-1.5 border-t border-rose-500/30">
                                        <button
                                          type="button"
                                          disabled={isFileDownloading}
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleDownloadSingleMissingFile(pod, f.filename);
                                          }}
                                          className="flex items-center gap-1 px-2 py-0.5 bg-rose-500/20 hover:bg-rose-500/40 border border-rose-500/40 rounded text-[9px] text-rose-200 font-bold transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                                        >
                                          {isFileDownloading ? <RefreshCw size={10} className="animate-spin" /> : <Download size={10} />}
                                          <span>{isFileDownloading ? 'Mendownload...' : 'Download Ulang'}</span>
                                        </button>
                                        <button
                                          type="button"
                                          disabled={isFileDownloading}
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleDeleteSingleFileOnPod(pod, f.filename);
                                          }}
                                          className="flex items-center gap-1 px-2 py-0.5 bg-rose-950/80 hover:bg-rose-900 border border-rose-500/40 rounded text-[9px] text-rose-400 font-bold transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                                        >
                                          <Trash2 size={10} />
                                          <span>Hapus</span>
                                        </button>
                                      </div>
                                    )}
                                  </div>
                                )}

                                {/* Live Progress Bar for Download / Re-download */}
                                {(progress || isFileDownloading) && (
                                  <div className="mt-1 pt-1.5 border-t border-sky-500/20 animate-in fade-in duration-200">
                                    {progress ? (
                                      <>
                                        <div className="w-full bg-slate-900/90 rounded-full h-1.5 overflow-hidden border border-slate-800">
                                          <div
                                            className="bg-gradient-to-r from-sky-500 via-cyan-400 to-emerald-400 h-1.5 rounded-full transition-all duration-300 ease-out shadow-sm shadow-cyan-400/50"
                                            style={{ width: `${Math.min(100, Math.max(0, progress.percent || 0))}%` }}
                                          />
                                        </div>
                                        <div className="flex items-center justify-between text-[9.5px] text-slate-400 font-mono mt-1">
                                          <span>{progress.downloadedFormatted || '0 B'} / {progress.totalFormatted || '...'}</span>
                                          <span className="text-cyan-300 font-semibold">{progress.speed || '0 KB/s'}</span>
                                        </div>
                                      </>
                                    ) : (
                                      <div className="flex items-center gap-1.5 text-[10px] text-sky-400 font-mono animate-pulse">
                                        <RefreshCw size={10} className="animate-spin" /> Menyiapkan download...
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            );
                          })}

                          {/* Missing Files on POD */}
                          {podCheck.missingFiles?.map(f => {
                            const filename = typeof f === 'string' ? f : f.filename;
                            const progKey = `${podId}_${filename}`;
                            const progress = downloadProgressMap[progKey];
                            const isDownloading = !!actionLoadingMap[`dl_${podId}_${filename}`];
                            return (
                              <div
                                key={filename}
                                className="p-2 rounded-xl bg-rose-950/20 border border-rose-500/30 flex flex-col gap-1 text-[10.5px]"
                              >
                                <div className="flex items-center justify-between gap-1.5">
                                  <div className="flex items-center gap-1.5 min-w-0">
                                    <AlertTriangle size={12} className="text-rose-400 shrink-0" />
                                    <span className="font-semibold text-rose-300 truncate font-mono" title={filename}>
                                      {filename}
                                    </span>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => handleDownloadSingleMissingFile(pod, filename)}
                                    disabled={isDownloading}
                                    className="px-2 py-0.5 rounded bg-rose-500/20 hover:bg-rose-500/40 border border-rose-500/40 text-[9.5px] font-bold text-rose-200 flex items-center gap-1 transition-all cursor-pointer disabled:opacity-50 shadow-sm shrink-0"
                                    title={`Download ${filename} langsung ke POD ${pod.serverName}`}
                                  >
                                    {isDownloading ? <Loader2 size={10} className="animate-spin" /> : <Download size={10} />}
                                    <span>{isDownloading ? 'Mendownload...' : 'Unduh'}</span>
                                  </button>
                                </div>

                                {/* Live Progress Bar for Missing File Download */}
                                {(progress || isDownloading) && (
                                  <div className="mt-1 pt-1.5 border-t border-sky-500/20 animate-in fade-in duration-200">
                                    {progress ? (
                                      <>
                                        <div className="w-full bg-slate-900/90 rounded-full h-1.5 overflow-hidden border border-slate-800">
                                          <div
                                            className="bg-gradient-to-r from-sky-500 via-cyan-400 to-emerald-400 h-1.5 rounded-full transition-all duration-300 ease-out shadow-sm shadow-cyan-400/50"
                                            style={{ width: `${Math.min(100, Math.max(0, progress.percent || 0))}%` }}
                                          />
                                        </div>
                                        <div className="flex items-center justify-between text-[9.5px] text-slate-400 font-mono mt-1">
                                          <span>{progress.downloadedFormatted || '0 B'} / {progress.totalFormatted || '...'}</span>
                                          <span className="text-cyan-300 font-semibold">{progress.speed || '0 KB/s'}</span>
                                        </div>
                                      </>
                                    ) : (
                                      <div className="flex items-center gap-1.5 text-[10px] text-sky-400 font-mono animate-pulse">
                                        <RefreshCw size={10} className="animate-spin" /> Menyiapkan download...
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>

                        {/* Download All Missing button if multiple missing */}
                        {podCheck.missingFiles?.length > 1 && (
                          <div className="pt-1 flex justify-end">
                            <button
                              type="button"
                              onClick={() => handleDownloadAllMissingForPod(pod)}
                              disabled={!!actionLoadingMap[`dl_all_${podId}`]}
                              className="px-2.5 py-1 rounded-lg bg-sky-500/20 hover:bg-sky-500/30 text-sky-300 border border-sky-500/40 text-[10px] font-bold flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50 active:scale-95 shadow-sm"
                            >
                              {actionLoadingMap[`dl_all_${podId}`] ? (
                                <Loader2 size={11} className="animate-spin text-sky-400" />
                              ) : (
                                <CloudDownload size={11} />
                              )}
                              <span>Unduh Semua Berkas yang Kurang ({podCheck.missingFiles.length})</span>
                            </button>
                          </div>
                        )}

                        {/* Bottom Action Bar for this POD (Periksa Ulang & Hapus di POD Ini) */}
                        <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between gap-2 flex-wrap">
                          <button
                            type="button"
                            onClick={() => handleCheckSinglePodFiles(pod)}
                            disabled={!!actionLoadingMap[`files_${podId}`]}
                            className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50 active:scale-95 shadow-sm"
                            title="Periksa ulang berkas fisik di POD ini"
                          >
                            <RefreshCw size={12} className={actionLoadingMap[`files_${podId}`] ? 'animate-spin text-cyan-400' : 'text-slate-400'} />
                            <span>Periksa Ulang</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDeleteAllFilesOnPod(pod)}
                            disabled={!!actionLoadingMap[`del_pod_${podId}`]}
                            className="px-3 py-1.5 rounded-xl bg-rose-950/40 hover:bg-rose-950/70 text-rose-300 hover:text-rose-200 border border-rose-500/30 hover:border-rose-500/50 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50 active:scale-95 shadow-sm"
                            title={`Hapus semua berkas kode #${selectedItem?.sound_scape} di ${pod.serverName}`}
                          >
                            {actionLoadingMap[`del_pod_${podId}`] ? <Loader2 size={12} className="animate-spin text-rose-400" /> : <Trash2 size={12} className="text-rose-400" />}
                            <span>Hapus di POD Ini</span>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>

        </div>

      </div>

      {/* 3. Bottom Inline Trigger Bar (Fits cleanly within viewport without scroll/overlay!) */}
      {selectedItem && (
        <div className="shrink-0 mt-3 p-2.5 sm:px-4 sm:py-2.5 bg-slate-950/90 backdrop-blur-xl border border-purple-500/30 rounded-2xl shadow-xl">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">

            {/* Selected Item Info */}
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="p-2 rounded-xl bg-purple-500/20 text-purple-400 border border-purple-500/40 shrink-0">
                <Shuffle size={16} className="animate-pulse" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-black text-purple-300 font-mono">
                    #{selectedItem.sound_scape}
                  </span>
                  <span className="text-xs font-bold text-white truncate">
                    {selectedItem.tittle || selectedItem.title || 'Master Track'}
                  </span>
                </div>
                <div className="text-[10.5px] text-slate-400 flex items-center gap-2 mt-0.5">
                  <span>{runningContainersCount}/{onlinePodsCount} POD Siap</span>
                  {exitedContainersCount > 0 && (
                    <span className="text-amber-400 font-bold">
                      ({exitedContainersCount} container mati)
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Trigger Button */}
            <div className="flex items-center gap-3 w-full sm:w-auto justify-end shrink-0">
              <button
                onClick={handleOpenConfirmModal}
                disabled={isTriggeringResave || isLoadingFleet}
                className="px-5 py-2 rounded-xl bg-gradient-to-r from-purple-500 via-indigo-500 to-cyan-500 hover:from-purple-400 hover:to-cyan-400 text-slate-950 font-black text-xs transition-all cursor-pointer flex items-center gap-2 shadow-xl shadow-purple-500/20 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
              >
                <Shuffle size={14} />
                <span>Trigger Sinkronisasi RabbitMQ</span>
              </button>
            </div>

          </div>
        </div>
      )}

      {/* 4. Tailwind Confirmation Modal for RabbitMQ Sync */}
      {isConfirmModalOpen && selectedItem && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200"
          onClick={() => !isTriggeringResave && setIsConfirmModalOpen(false)}
        >
          <div
            className="w-full max-w-lg rounded-3xl bg-slate-900 border border-purple-500/30 p-6 shadow-2xl shadow-purple-500/15 space-y-5 animate-in zoom-in-95 duration-200"
            onClick={e => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-2xl bg-gradient-to-br from-purple-500/20 to-cyan-500/20 border border-purple-500/40 text-purple-300">
                  <Shuffle size={22} className="animate-pulse" />
                </div>
                <div>
                  <h3 className="text-base font-black text-white">
                    Konfirmasi Sinkronisasi RabbitMQ
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Trigger unduhan multimedia ke seluruh armada unit POD V3
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsConfirmModalOpen(false)}
                disabled={isTriggeringResave}
                className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-all cursor-pointer disabled:opacity-50"
              >
                <X size={16} />
              </button>
            </div>

            {/* Target Track Information Card */}
            <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-purple-500/20 flex items-center gap-3.5">
              {targetCoverUrl ? (
                <img
                  src={targetCoverUrl}
                  alt="Cover"
                  className="w-14 h-14 rounded-xl object-cover border border-slate-700 shrink-0 bg-slate-900"
                  onError={e => { e.target.style.display = 'none'; }}
                />
              ) : (
                <div className="w-14 h-14 rounded-xl bg-purple-500/10 border border-purple-500/30 text-purple-400 flex items-center justify-center shrink-0">
                  <Music size={22} />
                </div>
              )}
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-black text-purple-300">
                    #{selectedItem.sound_scape}
                  </span>
                  <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30">
                    Target Sinkronisasi
                  </span>
                </div>
                <h4 className="text-sm font-bold text-white truncate mt-0.5">
                  {selectedItem.tittle || selectedItem.title || `SoundScape #${selectedItem.sound_scape}`}
                </h4>
                <p className="text-xs text-slate-400 truncate">
                  {selectedItem.artist || 'Regenesis'} • {selectedItem.album || 'Master Session'}
                </p>
              </div>
            </div>

            {/* Fleet Status Summary Cards */}
            <div className="grid grid-cols-2 gap-2.5 text-xs">
              <div className="p-3 rounded-2xl bg-slate-950/60 border border-slate-800 flex items-center justify-between">
                <span className="text-slate-400">Total POD Online:</span>
                <span className="font-bold text-white font-mono">{onlinePodsCount} / {fleetPods.length} Unit</span>
              </div>
              <div className="p-3 rounded-2xl bg-slate-950/60 border border-slate-800 flex items-center justify-between">
                <span className="text-slate-400">Container Aktif:</span>
                <span className="font-bold text-emerald-400 font-mono">{runningContainersCount} Ready</span>
              </div>
            </div>

            {/* Warning Alert if Exited Containers exist */}
            {exitedContainersCount > 0 && (
              <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-3">
                <AlertTriangle size={18} className="text-amber-400 shrink-0 mt-0.5" />
                <div className="text-xs text-amber-200">
                  <p className="font-bold text-amber-300 mb-0.5">
                    Perhatian: {exitedContainersCount} POD memiliki container mobile-synch mati (Exited)
                  </p>
                  <p className="text-[11px] text-amber-300/80 leading-relaxed">
                    POD dengan container mati tidak akan menerima event unduhan RabbitMQ. Anda dapat menyalakan container terlebih dahulu pada tabel matriks atau tetap melanjutkan pengiriman ke unit yang aktif.
                  </p>
                </div>
              </div>
            )}

            {/* Description Text */}
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Sistem akan mengirim perintah <code className="text-purple-300 font-mono font-bold">re-save/{selectedItem.sound_scape}</code> ke Master API, memicu antrean pesan RabbitMQ ke seluruh unit POD yang aktif untuk mengunduh berkas multimedia.
            </p>

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIsConfirmModalOpen(false)}
                disabled={isTriggeringResave}
                className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-all cursor-pointer disabled:opacity-50"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleExecuteTrigger}
                disabled={isTriggeringResave}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-purple-500 via-indigo-500 to-cyan-500 hover:from-purple-400 hover:to-cyan-400 text-slate-950 text-xs font-black transition-all cursor-pointer flex items-center gap-2 shadow-lg shadow-purple-500/20 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isTriggeringResave ? (
                  <>
                    <Loader2 size={15} className="animate-spin text-slate-950" />
                    <span>Mengirim Trigger...</span>
                  </>
                ) : (
                  <>
                    <Shuffle size={15} />
                    <span>Ya, Kirim Trigger RabbitMQ</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5. Real-time Docker Live Log Modal */}
      {logModalPod && (
        <DockerLogModal
          isOpen={!!logModalPod}
          onClose={() => setLogModalPod(null)}
          serverId={logModalPod.serverId || logModalPod.id}
          containerName={logModalPod.containerName || 'mobile-synch'}
          autoStream={true}
        />
      )}

      {/* 6. Multimedia Batch Chunk Upload Modal */}
      <MultimediaUploadModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        onSuccess={() => {
          setSuccessToast('Berhasil mengunggah multimedia master baru ke AWS S3 & Master DB!');
          loadMasterMultimedia(1, '');
        }}
      />

      {/* 7. Tailwind Confirmation Modal for Delete Master Multimedia */}
      {deleteTargetItem && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200"
          onClick={() => !isDeletingItem && setDeleteTargetItem(null)}
        >
          <div
            className="w-full max-w-md rounded-3xl bg-slate-900 border border-rose-500/30 p-6 shadow-2xl shadow-rose-500/15 space-y-5 animate-in zoom-in-95 duration-200"
            onClick={e => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-2xl bg-rose-500/20 border border-rose-500/40 text-rose-300">
                  <Trash2 size={22} />
                </div>
                <div>
                  <h3 className="text-base font-black text-white">
                    Hapus Konten Multimedia
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Hapus data katalog dari Master API
                  </p>
                </div>
              </div>
              <button
                onClick={() => setDeleteTargetItem(null)}
                disabled={isDeletingItem}
                className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-all cursor-pointer disabled:opacity-50"
              >
                <X size={16} />
              </button>
            </div>

            {/* Target Track Information */}
            <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-rose-500/20 flex items-center gap-3.5">
              {deleteTargetItem.coverAlbumUrl ? (
                <img
                  src={deleteTargetItem.coverAlbumUrl.startsWith('http') ? deleteTargetItem.coverAlbumUrl : `https://developerfile-084897310273.s3.ap-southeast-1.amazonaws.com${deleteTargetItem.coverAlbumUrl}`}
                  alt="Cover"
                  className="w-12 h-12 rounded-xl object-cover border border-slate-700 shrink-0 bg-slate-900"
                  onError={e => { e.target.style.display = 'none'; }}
                />
              ) : (
                <div className="w-12 h-12 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 flex items-center justify-center shrink-0">
                  <Music size={20} />
                </div>
              )}
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-black text-rose-300">
                    #{deleteTargetItem.sound_scape}
                  </span>
                  <span className="px-2 py-0.2 rounded text-[9px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30">
                    Master API
                  </span>
                </div>
                <h4 className="text-sm font-bold text-white truncate mt-0.5">
                  {deleteTargetItem.tittle || deleteTargetItem.title || `SoundScape #${deleteTargetItem.sound_scape}`}
                </h4>
                <p className="text-xs text-slate-400 truncate">
                  {deleteTargetItem.artist || 'Regenesis'} • {deleteTargetItem.album || 'Master Session'}
                </p>
              </div>
            </div>

            {/* Warning Notice */}
            <div className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-start gap-2.5 text-xs text-rose-200">
              <AlertTriangle size={16} className="text-rose-400 shrink-0 mt-0.5" />
              <div className="leading-relaxed">
                Tindakan ini akan memanggil endpoint <code className="text-rose-300 font-mono font-bold">DELETE /admin-api/multimedia/delete/{deleteTargetItem.sound_scape}</code>. Data yang telah dihapus dari Master API tidak dapat dipulihkan.
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDeleteTargetItem(null)}
                disabled={isDeletingItem}
                className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-all cursor-pointer disabled:opacity-50"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={isDeletingItem}
                className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition-all cursor-pointer flex items-center gap-2 shadow-lg shadow-rose-600/30 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isDeletingItem ? (
                  <>
                    <Loader2 size={14} className="animate-spin text-white" />
                    <span>Menghapus...</span>
                  </>
                ) : (
                  <>
                    <Trash2 size={14} />
                    <span>Ya, Hapus Multimedia</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Media File Integrity & ffprobe Diagnostic Modal */}
      <FileIntegrityModal
        isOpen={integrityModal.isOpen}
        onClose={() => setIntegrityModal(prev => ({ ...prev, isOpen: false }))}
        data={integrityModal.data}
        isLoading={integrityModal.isLoading}
        onRedownload={integrityModal.targetPod && integrityModal.targetFilename ? () => {
          const { targetPod, targetFilename } = integrityModal;
          setIntegrityModal(prev => ({ ...prev, isOpen: false }));
          handleDownloadSingleMissingFile(targetPod, targetFilename);
        } : null}
        onOpenPreview={integrityModal.data?.status === 'healthy' && integrityModal.data?.filePath ? () => {
          const { data, targetPod, targetFilename } = integrityModal;
          const ext = (targetFilename || data.filePath || '').split('.').pop().toLowerCase();
          const category = ['mp4', 'mkv', 'avi', 'mov'].includes(ext) ? 'video' : ['wav', 'mp3', 'aac', 'flac', 'ogg'].includes(ext) ? 'audio' : 'image';
          const streamUrl = `/api/vps/content/pods/stream-media?serverId=${targetPod?.id}&filePath=${encodeURIComponent(data.filePath)}`;
          setIntegrityModal(prev => ({ ...prev, isOpen: false }));
          handleOpenMediaPreview({
            filename: targetFilename || 'Media File',
            category,
            url: streamUrl,
            sourceLabel: `POD ${targetPod?.name || targetPod?.host} • ${data.filePath}`
          });
        } : null}
      />

      {/* 4. Track Master Metadata Detail Modal */}
      {trackInfoModalItem && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200"
          onClick={() => setTrackInfoModalItem(null)}
        >
          <div
            className="w-full max-w-lg rounded-3xl bg-slate-900 border border-purple-500/30 p-6 shadow-2xl shadow-purple-500/15 space-y-5 animate-in zoom-in-95 duration-200"
            onClick={e => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="p-3 rounded-2xl bg-purple-500/20 border border-purple-500/40 text-purple-300 shrink-0">
                  <Layers size={22} />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-black text-purple-300">
                      Folder #{trackInfoModalItem.sound_scape}
                    </span>
                    <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30">
                      Master API Payload
                    </span>
                  </div>
                  <h3 className="text-base font-black text-white truncate mt-0.5">
                    {trackInfoModalItem.tittle || trackInfoModalItem.title || `Track #${trackInfoModalItem.sound_scape}`}
                  </h3>
                  <p className="text-xs text-slate-400 truncate">
                    {trackInfoModalItem.artist || 'Regenesis'} • {trackInfoModalItem.album || 'Master Session'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setTrackInfoModalItem(null)}
                className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-all cursor-pointer shrink-0"
              >
                <X size={16} />
              </button>
            </div>

            {/* Key-Value File Cards */}
            <div className="space-y-2">
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Daftar Berkas Di Cloud:
              </div>

              {/* Music Audio */}
              <div className="p-2.5 rounded-2xl bg-slate-950/80 border border-cyan-500/25 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400 shrink-0">
                    <Music size={15} />
                  </div>
                  <div className="min-w-0 font-mono">
                    <span className="text-[9.5px] text-slate-400 uppercase font-sans font-bold block">music</span>
                    <span className="text-xs text-cyan-200 font-semibold truncate block" title={trackInfoModalItem.music}>
                      {trackInfoModalItem.music || '<kosong / tidak ada>'}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  {trackInfoModalItem.music && (
                    <button
                      type="button"
                      onClick={() => handleOpenMediaPreview({
                        filename: trackInfoModalItem.music,
                        category: 'audio',
                        url: `https://developerfile-084897310273.s3.ap-southeast-1.amazonaws.com/media/${trackInfoModalItem.sound_scape}/${trackInfoModalItem.music}`,
                        sourceLabel: `AWS S3 • media/${trackInfoModalItem.sound_scape}/`
                      })}
                      className="px-2.5 py-1 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 text-[10.5px] font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm active:scale-95"
                      title="Putar / Preview Audio dari AWS S3"
                    >
                      <Play size={10} className="fill-cyan-400 text-cyan-400" />
                      <span>Preview</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Video MP4 */}
              <div className="p-2.5 rounded-2xl bg-slate-950/80 border border-rose-500/25 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="p-2 rounded-xl bg-rose-500/10 text-rose-400 shrink-0">
                    <FileVideo size={15} />
                  </div>
                  <div className="min-w-0 font-mono">
                    <span className="text-[9.5px] text-slate-400 uppercase font-sans font-bold block">video</span>
                    <span className="text-xs text-rose-200 font-semibold truncate block" title={trackInfoModalItem.video}>
                      {trackInfoModalItem.video || '<kosong / tidak ada>'}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  {trackInfoModalItem.video && (
                    <button
                      type="button"
                      onClick={() => handleOpenMediaPreview({
                        filename: trackInfoModalItem.video,
                        category: 'video',
                        url: `https://developerfile-084897310273.s3.ap-southeast-1.amazonaws.com/media/${trackInfoModalItem.sound_scape}/${trackInfoModalItem.video}`,
                        sourceLabel: `AWS S3 • media/${trackInfoModalItem.sound_scape}/`
                      })}
                      className="px-2.5 py-1 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 text-[10.5px] font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm active:scale-95"
                      title="Putar / Preview Video dari AWS S3"
                    >
                      <Film size={10} className="text-rose-400" />
                      <span>Preview</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Lamp Strobe WAV */}
              <div className="p-2.5 rounded-2xl bg-slate-950/80 border border-amber-500/25 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 shrink-0">
                    <Zap size={15} />
                  </div>
                  <div className="min-w-0 font-mono">
                    <span className="text-[9.5px] text-slate-400 uppercase font-sans font-bold block">lamp</span>
                    <span className="text-xs text-amber-200 font-semibold truncate block" title={trackInfoModalItem.lamp}>
                      {trackInfoModalItem.lamp || '<kosong / tidak ada>'}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  {trackInfoModalItem.lamp && (
                    <button
                      type="button"
                      onClick={() => handleOpenMediaPreview({
                        filename: trackInfoModalItem.lamp,
                        category: 'lamp',
                        isStrobe: true,
                        url: `https://developerfile-084897310273.s3.ap-southeast-1.amazonaws.com/media/${trackInfoModalItem.sound_scape}/${trackInfoModalItem.lamp}`,
                        sourceLabel: `AWS S3 • media/${trackInfoModalItem.sound_scape}/`
                      })}
                      className="px-2.5 py-1 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-[10.5px] font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm active:scale-95"
                      title="Putar & Simulasi Lampu Strobe dari AWS S3"
                    >
                      <Zap size={10} className="fill-amber-400 text-amber-400" />
                      <span>Preview</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Album String */}
              <div className="p-2.5 rounded-2xl bg-slate-950/80 border border-purple-500/25 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400 shrink-0">
                    <Layers size={15} />
                  </div>
                  <div className="min-w-0 font-mono">
                    <span className="text-[9.5px] text-slate-400 uppercase font-sans font-bold block">album</span>
                    <span className="text-xs text-purple-200 font-semibold truncate block" title={trackInfoModalItem.album}>
                      {trackInfoModalItem.album || '<kosong / tidak ada>'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Cover Album (if present) */}
              {trackInfoModalItem.coverAlbumUrl && (
                <div className="p-2.5 rounded-2xl bg-slate-950/80 border border-emerald-500/25 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 shrink-0">
                      <Eye size={15} />
                    </div>
                    <div className="min-w-0 font-mono">
                      <span className="text-[9.5px] text-slate-400 uppercase font-sans font-bold block">cover_album</span>
                      <span className="text-xs text-emerald-200 font-semibold truncate block" title={trackInfoModalItem.coverAlbumUrl}>
                        {trackInfoModalItem.cover_album || 'Cover Album Artwork'}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleOpenMediaPreview({
                        filename: trackInfoModalItem.cover_album || 'cover.jpg',
                        category: 'image',
                        url: trackInfoModalItem.coverAlbumUrl.startsWith('http')
                          ? trackInfoModalItem.coverAlbumUrl
                          : `https://developerfile-084897310273.s3.ap-southeast-1.amazonaws.com${trackInfoModalItem.coverAlbumUrl}`,
                        sourceLabel: `AWS S3 • media/${trackInfoModalItem.sound_scape}/`
                      })}
                      className="px-2.5 py-1 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 text-[10.5px] font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm active:scale-95"
                      title="Lihat Preview Gambar Cover dari AWS S3"
                    >
                      <Eye size={10} className="text-emerald-400" />
                      <span>Preview</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Raw JSON Code Block Preview */}
            {/* <div className="space-y-1.5">
              <div className="flex items-center justify-between text-[11px] font-bold text-slate-400">
                <span>Respon JSON:</span>
                <button
                  type="button"
                  onClick={() => handleCopyTrackJson(trackInfoModalItem)}
                  className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-purple-300 text-[10.5px] font-bold flex items-center gap-1 transition-all cursor-pointer"
                >
                  {copiedJson ? <Check size={11} className="text-emerald-400" /> : <Copy size={11} />}
                  <span>{copiedJson ? 'Tersalin!' : 'Salin JSON'}</span>
                </button>
              </div>
              <pre className="p-3 rounded-2xl bg-slate-950 border border-slate-800 text-[11px] font-mono text-purple-300 overflow-x-auto custom-scrollbar">
                {JSON.stringify({
                  music: trackInfoModalItem.music || null,
                  video: trackInfoModalItem.video || null,
                  lamp: trackInfoModalItem.lamp || null,
                  album: trackInfoModalItem.album || null
                }, null, 2)}
              </pre>
            </div> */}

            {/* Modal Footer Actions */}
            <div className="flex items-center justify-between gap-3 pt-1">
              {onNavigateView && (
                <button
                  type="button"
                  onClick={() => {
                    const code = String(trackInfoModalItem.sound_scape);
                    setTrackInfoModalItem(null);
                    onNavigateView('storage-manager', { code, returnView: 'multimedia-sync' });
                  }}
                  className="px-4 py-2 rounded-xl bg-purple-600/30 hover:bg-purple-600/40 text-purple-200 border border-purple-500/40 text-xs font-bold flex items-center gap-2 transition-all cursor-pointer"
                >
                  <Layers size={13} />
                  <span>Buka di Storage Manager</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => setTrackInfoModalItem(null)}
                className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold transition-all cursor-pointer ml-auto"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5. AWS S3 & POD Media Preview Modal (Audio, Video, Image Player) */}
      <MediaPreviewModal
        isOpen={previewModal.isOpen}
        file={previewModal.file}
        onClose={handleCloseMediaPreview}
      />

    </div>
  );
}
