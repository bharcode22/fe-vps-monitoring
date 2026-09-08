import { useState, useEffect, useCallback } from 'react';
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

export function useMultimediaSyncData() {
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

  // 3. Action States & Modals
  const [actionLoadingMap, setActionLoadingMap] = useState({}); // { [actionKey]: boolean }
  const [isTriggeringResave, setIsTriggeringResave] = useState(false);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [deleteTargetItem, setDeleteTargetItem] = useState(null);
  const [isDeletingItem, setIsDeletingItem] = useState(false);
  const [successToast, setSuccessToast] = useState('');

  // 4. Modal Trigger States
  const [logModalPod, setLogModalPod] = useState(null);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [trackInfoModalItem, setTrackInfoModalItem] = useState(null);

  // 5. On-Demand POD Physical Files Matrix State
  const [podFilesMatrix, setPodFilesMatrix] = useState({});
  const [podFilesCacheBySoundScape, setPodFilesCacheBySoundScape] = useState({});
  const [expandedPodFiles, setExpandedPodFiles] = useState({});
  const [isCheckingAllFiles, setIsCheckingAllFiles] = useState(false);
  const [s3FolderFilesMap, setS3FolderFilesMap] = useState({});

  // 6. File Integrity Diagnostic State (ffprobe & stat)
  const [integrityMap, setIntegrityMap] = useState({});
  const [integrityModal, setIntegrityModal] = useState({
    isOpen: false,
    data: null,
    isLoading: false,
    targetPod: null,
    targetFilename: ''
  });

  // 7. Media Preview Modal State
  const [previewModal, setPreviewModal] = useState({
    isOpen: false,
    file: null
  });

  const handleOpenMediaPreview = (file) => {
    setPreviewModal({ isOpen: true, file });
  };

  const handleCloseMediaPreview = () => {
    setPreviewModal({ isOpen: false, file: null });
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

  // Load Master Multimedia
  const loadMasterMultimedia = useCallback(async (page = 1, search = '') => {
    setIsLoadingMaster(true);
    setMasterError('');
    try {
      const res = await fetchMasterMultimediaListApi(search, page, 10);
      setMultimediaItems(res.data || []);
      if (res.pagination) {
        setPagination(res.pagination);
      }
      // Auto select first item if none selected
      setSelectedItem(prev => {
        if (!prev && res.data && res.data.length > 0) {
          return res.data[0];
        }
        return prev;
      });
    } catch (err) {
      console.error('Error fetching master multimedia:', err.message);
      setMasterError(err.message || 'Gagal memuat katalog multimedia dari Master API');
    } finally {
      setIsLoadingMaster(false);
    }
  }, []);

  // Inspect Fleet Readiness (Only checks online/ping & mobile-synch container status)
  const inspectFleet = useCallback(async (soundScapeCode = '') => {
    setIsLoadingFleet(true);
    setFleetError('');
    try {
      const res = await inspectPodsSyncStatusApi(soundScapeCode || '');
      setFleetPods(res.data || []);
    } catch (err) {
      console.error('Error inspecting fleet sync status:', err.message);
      setFleetError(err.message || 'Gagal memeriksa kesiapan unit POD V3');
    } finally {
      setIsLoadingFleet(false);
    }
  }, []);

  // Load initial data on mount ONCE (Never re-run when switching tracks!)
  useEffect(() => {
    loadMasterMultimedia(1, '');
    inspectFleet('');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  // Select track instantly without any loading spinner!
  const handleSelectTrack = (item) => {
    if (!item) return;
    setSelectedItem(item);
    const soundScape = item.sound_scape;
    // Restore cached file checks for this soundScape if available, otherwise empty
    setPodFilesMatrix(podFilesCacheBySoundScape[soundScape] || {});
    setExpandedPodFiles({});
    if (soundScape) {
      getOrFetchS3Filenames(soundScape);
    }
  };

  // Check physical files for a single POD on-demand (~300ms) - Only this POD shows loading
  const handleCheckSinglePodFiles = async (pod) => {
    const podId = pod.serverId || pod.id;
    const soundScape = selectedItem?.sound_scape;
    if (!soundScape) return;

    const actionKey = `files_${podId}`;
    setActionLoadingMap(prev => ({ ...prev, [actionKey]: true }));

    try {
      const realFilenames = await getOrFetchS3Filenames(soundScape);
      const matrix = await checkCodeOnPodsApi(soundScape, realFilenames, [podId]);
      if (matrix && matrix[podId]) {
        setPodFilesMatrix(prev => ({ ...prev, [podId]: matrix[podId] }));
        setPodFilesCacheBySoundScape(prev => ({
          ...prev,
          [soundScape]: { ...(prev[soundScape] || {}), [podId]: matrix[podId] }
        }));
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

  // Check physical files across all PODs on-demand
  const handleCheckAllPodsFiles = async () => {
    const soundScape = selectedItem?.sound_scape;
    if (!soundScape) return;

    setIsCheckingAllFiles(true);
    try {
      const realFilenames = await getOrFetchS3Filenames(soundScape);
      const matrix = await checkCodeOnPodsApi(soundScape, realFilenames);
      if (matrix) {
        setPodFilesMatrix(matrix);
        setPodFilesCacheBySoundScape(prev => ({
          ...prev,
          [soundScape]: matrix
        }));
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

    const cleanFn = typeof filename === 'string' ? filename : filename.filename;
    const dlKey = `dl_${podId}_${cleanFn}`;

    // Auto expand accordion so the user sees the download progress immediately
    setExpandedPodFiles(prev => ({ ...prev, [podId]: true }));
    setActionLoadingMap(prev => ({ ...prev, [dlKey]: true }));

    try {
      await downloadCodeFilesToPodApi(podId, soundScape, [cleanFn]);
      setSuccessToast(`Proses download ${cleanFn} ke ${pod.serverName} dimulai di latar belakang...`);
      // Fallback timer in case socket events are interrupted
      setTimeout(() => {
        setActionLoadingMap(prev => {
          if (prev[dlKey]) {
            const next = { ...prev };
            delete next[dlKey];
            return next;
          }
          return prev;
        });
      }, 60000);
    } catch (err) {
      alert(`Gagal memulai download ${cleanFn} ke ${pod.serverName}: ${err.message}`);
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
    const cleanFiles = podCheck.missingFiles.map(f => typeof f === 'string' ? f : f.filename);

    // Auto expand accordion so the user sees all file progress bars immediately
    setExpandedPodFiles(prev => ({ ...prev, [podId]: true }));
    setActionLoadingMap(prev => {
      const next = { ...prev, [dlKey]: true };
      cleanFiles.forEach(fn => {
        next[`dl_${podId}_${fn}`] = true;
      });
      return next;
    });

    try {
      await downloadCodeFilesToPodApi(podId, soundScape, cleanFiles);
      setSuccessToast(`Proses download ${cleanFiles.length} berkas ke ${pod.serverName} dimulai di latar belakang...`);
      // Fallback timer
      setTimeout(() => {
        setActionLoadingMap(prev => {
          const next = { ...prev };
          delete next[dlKey];
          cleanFiles.forEach(fn => {
            delete next[`dl_${podId}_${fn}`];
          });
          return next;
        });
      }, 120000);
    } catch (err) {
      alert(`Gagal memulai download berkas ke ${pod.serverName}: ${err.message}`);
      setActionLoadingMap(prev => {
        const next = { ...prev, [dlKey]: false };
        cleanFiles.forEach(fn => {
          delete next[`dl_${podId}_${fn}`];
        });
        return next;
      });
    }
  };

  // Listen for real-time S3 to POD download progress via WebSocket
  useEffect(() => {
    const socket = io(SOCKET_URL, {
      transports: ['websocket', 'polling']
    });

    socket.on('s3_pod_download_progress', (data) => {
      if (data?.serverId && data?.filename) {
        const key = `${data.serverId}_${data.filename}`;
        setDownloadProgressMap(prev => ({
          ...prev,
          [key]: data
        }));

        // Automatically expand accordion for the target POD so progress is visible
        setExpandedPodFiles(prev => ({
          ...prev,
          [data.serverId]: true
        }));
      }
    });

    socket.on('s3_pod_download_complete', (data) => {
      const serverId = data?.serverId;
      const serverName = data?.serverName || `POD #${serverId}`;

      // Keep progress at 100% for 2.5 seconds to show completion, then clear
      setTimeout(() => {
        setDownloadProgressMap(prev => {
          const next = { ...prev };
          Object.keys(next).forEach(k => {
            if (k.startsWith(`${serverId}_`)) {
              delete next[k];
            }
          });
          return next;
        });
      }, 2500);

      // Clear loading actions for this pod
      setActionLoadingMap(prev => {
        const next = { ...prev };
        Object.keys(next).forEach(k => {
          if (k.startsWith(`dl_${serverId}_`) || k === `dl_all_${serverId}`) {
            delete next[k];
          }
        });
        return next;
      });

      if (data?.success === false) {
        alert(`Gagal mendownload berkas ke ${serverName}: ${data.error || 'Terjadi kesalahan'}`);
      } else {
        const sizeInfo = data?.totalDownloadedFormatted ? ` (${data.totalDownloadedFormatted})` : '';
        setSuccessToast(`Download ke ${serverName} selesai${sizeInfo}! Status berkas diperbarui.`);

        // Automatically re-check physical files on this POD to update file status to 'Ada' / 'Lengkap'
        if (serverId) {
          setFleetPods(currentPods => {
            const podObj = currentPods.find(p => (p.serverId || p.id) === serverId);
            if (podObj) {
              handleCheckSinglePodFiles(podObj);
            }
            return currentPods;
          });
        }
      }
    });

    return () => {
      socket.disconnect();
    };
  }, [handleCheckSinglePodFiles]);

  // Auto-reload master multimedia catalog when an upload is completed anywhere
  useEffect(() => {
    const handleMasterUpdated = () => {
      loadMasterMultimedia(1, '');
    };
    window.addEventListener('multimedia_master_updated', handleMasterUpdated);
    return () => {
      window.removeEventListener('multimedia_master_updated', handleMasterUpdated);
    };
  }, [loadMasterMultimedia]);

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
  const handleControlSinglePod = async (pod, action = 'start') => {
    const podId = pod.serverId || pod.id;
    const actionKey = `${action}_${podId}`;
    setActionLoadingMap(prev => ({ ...prev, [actionKey]: true }));

    const actionLabel = action === 'stop' ? 'dihentikan' : action === 'restart' ? 'dimuat ulang (restart)' : 'dinyalakan';

    try {
      const res = await controlPodSyncContainerApi(podId, action, 'mobile-synch', selectedItem?.sound_scape || '');
      setSuccessToast(`Container mobile-synch di ${pod.serverName} berhasil ${actionLabel}!`);

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

      if (String(selectedItem?.sound_scape) === String(soundScape)) {
        setSelectedItem(null);
      }

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

  return {
    // Master data & search
    multimediaItems,
    pagination,
    searchQuery,
    setSearchQuery,
    isLoadingMaster,
    masterError,
    selectedItem,
    targetCoverUrl,
    loadMasterMultimedia,
    handleSearchSubmit,
    handlePageChange,
    handleSelectTrack,

    // Fleet state & actions
    fleetPods,
    isLoadingFleet,
    fleetError,
    inspectFleet,
    handleInspectSinglePod,
    handleControlSinglePod,

    // Stats
    onlinePodsCount,
    runningContainersCount,
    exitedContainersCount,

    // File Matrix & Downloads
    podFilesMatrix,
    expandedPodFiles,
    isCheckingAllFiles,
    s3FolderFilesMap,
    downloadProgressMap,
    actionLoadingMap,
    handleCheckSinglePodFiles,
    handleToggleExpandPodFiles,
    handleCheckAllPodsFiles,
    handleDownloadSingleMissingFile,
    handleDownloadAllMissingForPod,
    handleDeleteSingleFileOnPod,
    handleDeleteAllFilesOnPod,

    // Integrity Diagnostics
    integrityMap,
    integrityModal,
    setIntegrityModal,
    handleCheckFileIntegrity,

    // Modals
    isConfirmModalOpen,
    setIsConfirmModalOpen,
    isTriggeringResave,
    handleExecuteTrigger,
    deleteTargetItem,
    setDeleteTargetItem,
    isDeletingItem,
    handleConfirmDelete,
    trackInfoModalItem,
    setTrackInfoModalItem,
    logModalPod,
    setLogModalPod,
    isUploadModalOpen,
    setIsUploadModalOpen,
    previewModal,
    handleOpenMediaPreview,
    handleCloseMediaPreview,

    // Toast
    successToast,
    setSuccessToast
  };
}
