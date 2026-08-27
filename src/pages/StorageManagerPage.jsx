import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  HardDrive,
  RefreshCw,
  Cloud,
  CheckCircle2,
  AlertTriangle,
  Trash2,
  Zap,
  Folder,
  Layers,
  Sparkles,
  Search
} from 'lucide-react';
import {
  fetchPodsStorageSummaryApi,
  fetchSinglePodStorageSummaryApi,
  inspectAllPodsDockerApi,
  inspectSinglePodDockerApi,
  cleanupSinglePodDockerApi,
  cleanupBatchPodsDockerApi,
  fetchS3MediaFoldersApi,
  fetchS3FolderFilesApi,
  deleteS3FolderApi,
  deleteS3FileApi,
  checkCodeOnPodsApi,
  deleteCodeOnPodApi,
  batchDeleteCodeApi,
  downloadCodeFilesToPodApi,
  downloadCodeFilesToBatchPodsApi
} from '../api/vpsApi';

import DockerJunkManagerView from '../components/storage/DockerJunkManagerView';
import RogueMediaScannerView from '../components/storage/RogueMediaScannerView';
import DockerCleanupModal from '../components/storage/DockerCleanupModal';
import CatalogView from '../components/content/CatalogView';
import CodeWorkspaceView from '../components/content/CodeWorkspaceView';
import HardDeleteModal from '../components/content/HardDeleteModal';
import io from 'socket.io-client';
import { SOCKET_URL } from '../config';

export default function StorageManagerPage({ onBack }) {
  // Main Tab Navigation: 'docker_storage' | 'media_catalog' | 'rogue_scanner'
  const [activeTab, setActiveTab] = useState(() => {
    return localStorage.getItem('storageManagerActiveTab') || 'docker_storage';
  });

  useEffect(() => {
    localStorage.setItem('storageManagerActiveTab', activeTab);
  }, [activeTab]);

  // =========================================================================
  // 1. PODs Storage & Docker Build Junk State
  // =========================================================================
  const [storageData, setStorageData] = useState(null);
  const [isStorageLoading, setIsStorageLoading] = useState(false);
  const [storageError, setStorageError] = useState('');
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
  const [isDownloadingAllPods, setIsDownloadingAllPods] = useState(false);
  const [downloadProgressMap, setDownloadProgressMap] = useState({}); // { [`${serverId}_${filename}`]: progressData }

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
      }
    });

    socket.on('s3_pod_download_complete', (data) => {
      // Clear progress badge after 2.5 seconds to show completion
      setTimeout(() => {
        setDownloadProgressMap(prev => {
          const next = { ...prev };
          Object.keys(next).forEach(k => {
            if (k.startsWith(`${data.serverId}_`)) {
              delete next[k];
            }
          });
          return next;
        });
      }, 2500);
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  // Hard Delete S3/Media Modal
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    title: '',
    description: '',
    s3Code: '',
    filenames: [],
    targetPodIds: [],
    deleteFromS3: false,
    singleS3FileKey: null,
    singleS3Filename: '',
    podNameLabel: ''
  });
  const [isExecutingDelete, setIsExecutingDelete] = useState(false);
  const [deletingS3FileKey, setDeletingS3FileKey] = useState(null);
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
    setStorageError('');
    try {
      const summary = await fetchPodsStorageSummaryApi('v3');
      setStorageData(summary);
      // Auto trigger docker inspection
      handleInspectAllDocker();
    } catch (err) {
      console.error('Error fetching storage summary:', err.message);
      setStorageError(err.message || 'Gagal memuat status storage POD. Pastikan Anda sudah login.');
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

  const refreshSinglePodStorage = async (podServerId) => {
    if (!podServerId) return;
    try {
      const updatedPodStorage = await fetchSinglePodStorageSummaryApi(podServerId);
      if (updatedPodStorage) {
        setStorageData(prev => {
          if (!prev || !Array.isArray(prev.pods)) return prev;
          const nextPods = prev.pods.map(p => (p.serverId === podServerId || p.id === podServerId) ? { ...p, ...updatedPodStorage } : p);
          return {
            ...prev,
            pods: nextPods
          };
        });
      }
    } catch (err) {
      console.warn(`Gagal memperbarui storage POD ${podServerId}:`, err.message);
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

  // 1. Download a single missing file to a specific POD
  const handleDownloadSingleFileToPod = async (pod, filename) => {
    if (!activeCodeDetail) return;
    const s3Code = activeCodeDetail.code;
    const podId = pod.serverId || pod.id;
    const actionKey = `dl_${podId}_${filename}`;

    setLoadingActions(prev => ({ ...prev, [actionKey]: true }));
    try {
      await downloadCodeFilesToPodApi(podId, s3Code, [filename]);
      // Re-check this POD to immediately update UI to 'Ada'
      await checkSinglePodForActiveCode(podId);
    } catch (err) {
      console.error(`Error downloading ${filename} to ${pod.serverName}:`, err.message);
      alert(`Gagal mendownload ${filename} ke ${pod.serverName}: ${err.message}`);
    } finally {
      setLoadingActions(prev => ({ ...prev, [actionKey]: false }));
    }
  };

  // 2. Download all missing files for a specific POD
  const handleDownloadAllMissingForPod = async (pod) => {
    if (!activeCodeDetail) return;
    const s3Code = activeCodeDetail.code;
    const podId = pod.serverId || pod.id;
    const actionKey = `dl_all_${podId}`;

    setLoadingActions(prev => ({ ...prev, [actionKey]: true }));
    try {
      const podStatus = detailPodsStatus[podId];
      const missingFiles = (podStatus?.missingFiles || []).map(f => typeof f === 'string' ? f : f.filename);
      await downloadCodeFilesToPodApi(podId, s3Code, missingFiles);
      // Re-check this POD
      await checkSinglePodForActiveCode(podId);
    } catch (err) {
      console.error(`Error downloading missing files to ${pod.serverName}:`, err.message);
      alert(`Gagal mendownload file missing ke ${pod.serverName}: ${err.message}`);
    } finally {
      setLoadingActions(prev => ({ ...prev, [actionKey]: false }));
    }
  };

  // 3. Download missing files to all PODs in batch
  const handleDownloadMissingToAllPods = async () => {
    if (!activeCodeDetail || !storageData?.pods) return;
    const s3Code = activeCodeDetail.code;
    const targetPods = storageData.pods.filter(p => p.isOnline !== false);
    if (targetPods.length === 0) {
      alert('Tidak ada POD online yang tersedia.');
      return;
    }

    setIsDownloadingAllPods(true);
    try {
      const serverIds = targetPods.map(p => p.serverId);
      await downloadCodeFilesToBatchPodsApi(serverIds, s3Code, []);
      // Re-check all PODs
      await checkPodsForActiveCode(s3Code);
    } catch (err) {
      console.error('Error batch downloading to all PODs:', err.message);
      alert(`Gagal sync ke semua POD: ${err.message}`);
    } finally {
      setIsDownloadingAllPods(false);
    }
  };

  const handlePromptDeleteOnSinglePod = (pod) => {
    if (!activeCodeDetail || !pod) return;
    const s3Code = activeCodeDetail.code;
    const podId = pod.serverId || pod.id;

    // Guard against duplicate prompt if already deleting
    if (loadingActions[`pod_${s3Code}_${podId}`] || isExecutingDelete) {
      return;
    }

    const filenames = detailS3Files?.files?.map(f => f.filename) || [];

    setConfirmModal({
      isOpen: true,
      title: `Hard Delete Konten #${s3Code} di ${pod.serverName}`,
      description: `Apakah Anda yakin ingin menghapus semua file fisik untuk kode #${s3Code} di server ${pod.serverName}? File di /home/pod/sounds, /videos, /images akan dihapus permanen dan ruang disk langsung dibebaskan.`,
      s3Code,
      filenames,
      targetPodIds: [podId],
      deleteFromS3: false,
      podNameLabel: pod.serverName
    });
  };

  const handlePromptDeleteOnS3 = () => {
    if (!activeCodeDetail || isExecutingDelete) return;
    const s3Code = activeCodeDetail.code;
    const totalFiles = detailS3Files?.totalFiles || activeCodeDetail.totalFiles;
    const totalSize = detailS3Files?.totalSizeFormatted || activeCodeDetail.totalSizeFormatted;

    setConfirmModal({
      isOpen: true,
      title: `Hard Delete Seluruh Folder #${s3Code} di AWS S3`,
      description: `PERINGATAN KRUSIAL: Ini akan menghapus seluruh file (${totalFiles} file, ${totalSize}) pada prefix S3 media/${s3Code}/ secara PERMANEN dari AWS S3. Data tidak dapat dipulihkan.`,
      s3Code,
      filenames: [],
      targetPodIds: [],
      deleteFromS3: true,
      singleS3FileKey: null,
      singleS3Filename: '',
      podNameLabel: 'Bucket AWS S3'
    });
  };

  const handlePromptDeleteOnS3File = (file) => {
    if (!activeCodeDetail || !file || isExecutingDelete) return;
    setConfirmModal({
      isOpen: true,
      title: `Hard Delete File S3: ${file.filename}`,
      description: `PERINGATAN: File "${file.filename}" (${file.sizeFormatted || '0 B'}) akan DIHAPUS PERMANEN dari AWS S3 pada prefix "${file.key}". File ini tidak dapat dipulihkan.`,
      s3Code: activeCodeDetail.code,
      filenames: [file.filename],
      targetPodIds: [],
      deleteFromS3: true,
      singleS3FileKey: file.key,
      singleS3Filename: file.filename,
      podNameLabel: 'Bucket AWS S3'
    });
  };

  const handleExecuteConfirmedDelete = async () => {
    if (isExecutingDelete) return; // Prevent duplicate trigger
    const { s3Code, filenames, targetPodIds, deleteFromS3, singleS3FileKey, singleS3Filename } = confirmModal;
    setIsExecutingDelete(true);

    const actionKey = singleS3FileKey
      ? `s3_file_${singleS3FileKey}`
      : deleteFromS3
        ? `s3_${s3Code}`
        : targetPodIds.length === 1
          ? `pod_${s3Code}_${targetPodIds[0]}`
          : `bulk_${s3Code}`;

    if (singleS3FileKey) setDeletingS3FileKey(singleS3FileKey);
    setLoadingActions(prev => ({ ...prev, [actionKey]: true }));

    // Optimistic UI: If single POD delete, immediately mark POD as isDeleting and close modal
    if (!deleteFromS3 && targetPodIds.length === 1) {
      const targetId = targetPodIds[0];
      setDetailPodsStatus(prev => {
        if (!prev || !prev[targetId]) return prev;
        return {
          ...prev,
          [targetId]: {
            ...prev[targetId],
            isDeleting: true
          }
        };
      });
      setConfirmModal(prev => ({ ...prev, isOpen: false }));
    } else if (!deleteFromS3 && targetPodIds.length > 1) {
      setDetailPodsStatus(prev => {
        if (!prev) return prev;
        const next = { ...prev };
        targetPodIds.forEach(id => {
          if (next[id]) next[id] = { ...next[id], isDeleting: true };
        });
        return next;
      });
      setConfirmModal(prev => ({ ...prev, isOpen: false }));
    }

    try {
      // 1. Single File deletion from AWS S3
      if (deleteFromS3 && singleS3FileKey) {
        await deleteS3FileApi(singleS3FileKey);
        setSuccessToast(`Berhasil menghapus file "${singleS3Filename}" dari AWS S3`);

        // Optimistically update file list in active workspace
        setDetailS3Files(prev => {
          if (!prev || !Array.isArray(prev.files)) return prev;
          const updatedFiles = prev.files.filter(f => f.key !== singleS3FileKey);
          return {
            ...prev,
            totalFiles: updatedFiles.length,
            files: updatedFiles
          };
        });

        // Re-check PODs for updated filenames
        if (detailS3Files?.files) {
          const remainingFilenames = detailS3Files.files
            .filter(f => f.key !== singleS3FileKey)
            .map(f => f.filename);
          await checkPodsForActiveCode(s3Code, remainingFilenames);
        }
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
      }
      // 2. Entire S3 Folder Hard Delete
      else if (deleteFromS3 && targetPodIds.length === 0) {
        const result = await deleteS3FolderApi(s3Code);
        if (result.deletedCount === 0) {
          alert(`Peringatan S3: Tidak ada file yang ditemukan pada prefix #${s3Code} (${result.message || '0 file'}).`);
        } else {
          setSuccessToast(`Berhasil menghapus folder master S3 #${s3Code} (${result.deletedCount || 0} file terhapus, ${result.freedFormatted || '0 B'})`);
        }

        // Optimistically remove folder from catalog immediately
        setS3FoldersData(prev => {
          if (!prev || !Array.isArray(prev.folders)) return prev;
          const cleanCode = String(s3Code).replace(/^media\/?/i, '').replace(/\/+$/, '');
          const nextFolders = prev.folders.filter(f => f.code !== s3Code && f.code !== cleanCode);
          return {
            ...prev,
            totalFolders: nextFolders.length,
            folders: nextFolders
          };
        });

        loadS3Folders();
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
        handleBackToCatalog();
      }
      // 3. Single POD Delete
      else if (targetPodIds.length === 1 && !deleteFromS3) {
        const podId = targetPodIds[0];
        const result = await deleteCodeOnPodApi(podId, s3Code, filenames);
        setSuccessToast(`Berhasil menghapus file #${s3Code} di ${result.serverName} (${result.deletedCount} file, ${result.freedFormatted} dibebaskan)`);
        
        // Await re-check and storage refresh so the loading indicator persists until data is fully synced
        await checkSinglePodForActiveCode(podId);
        await refreshSinglePodStorage(podId);
      }
      // 4. Batch Delete
      else {
        const result = await batchDeleteCodeApi(s3Code, filenames, targetPodIds, deleteFromS3);
        setSuccessToast(`Berhasil memproses batch delete untuk kode #${s3Code}`);
        
        await checkPodsForActiveCode(s3Code, filenames);
        await Promise.all(targetPodIds.map(id => refreshSinglePodStorage(id)));
        if (deleteFromS3) {
          setS3FoldersData(prev => {
            if (!prev || !Array.isArray(prev.folders)) return prev;
            const cleanCode = String(s3Code).replace(/^media\/?/i, '').replace(/\/+$/, '');
            const nextFolders = prev.folders.filter(f => f.code !== s3Code && f.code !== cleanCode);
            return {
              ...prev,
              totalFolders: nextFolders.length,
              folders: nextFolders
            };
          });
          loadS3Folders();
          handleBackToCatalog();
        }
      }
    } catch (err) {
      alert(`Gagal mengeksekusi penghapusan: ${err.message}`);
    } finally {
      setIsExecutingDelete(false);
      setDeletingS3FileKey(null);
      setLoadingActions(prev => ({ ...prev, [actionKey]: false }));
      // Clear optimistic isDeleting flag on pods
      setDetailPodsStatus(prev => {
        if (!prev) return prev;
        const next = { ...prev };
        targetPodIds.forEach(id => {
          if (next[id]?.isDeleting) {
            next[id] = { ...next[id], isDeleting: false };
          }
        });
        return next;
      });
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
    if (catalogCategoryFilter === 'orphan') return folder.isOrphan === true;
    return true;
  });

  const totalCatalogPages = Math.ceil(filteredFolders.length / catalogPageSize) || 1;
  const currentCatalogFolders = filteredFolders.slice((catalogPage - 1) * catalogPageSize, catalogPage * catalogPageSize);

  const tabs = [
    { id: 'docker_storage', label: 'Sampah Docker & Disk 1 TB', icon: Zap, color: 'cyan', badge: `${storageData?.pods?.length || 0} POD` },
    { id: 'media_catalog', label: 'Direktori Media & S3', icon: Cloud, color: 'rose', badge: `${allFolders.length} Kode S3` },
    { id: 'rogue_scanner', label: 'Rogue Media Scanner', icon: Search, color: 'emerald' }
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

      {/* Storage Error Alert Banner */}
      {storageError && (
        <div className="mb-5 p-4 rounded-2xl bg-rose-500/15 border border-rose-500/40 text-rose-300 text-xs flex items-center justify-between gap-3 shadow-lg animate-in fade-in duration-200">
          <div className="flex items-center gap-2.5">
            <AlertTriangle size={18} className="shrink-0 text-rose-400" />
            <span className="font-semibold">{storageError}</span>
          </div>
          <button
            onClick={() => loadStorageAndDockerData()}
            className="px-3 py-1 bg-rose-500/20 hover:bg-rose-500/30 text-rose-200 font-bold rounded-xl border border-rose-500/40 cursor-pointer transition-colors"
          >
            Coba Lagi
          </button>
        </div>
      )}

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
              emerald: isActive
                ? 'bg-gradient-to-r from-emerald-500/25 to-teal-500/25 text-emerald-300 border-emerald-500/40 shadow-sm'
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

      {/* TAB 3: Rogue Media Scanner */}
      {activeTab === 'rogue_scanner' && !activeCodeDetail && (
        <RogueMediaScannerView />
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
          onPromptDeleteS3File={handlePromptDeleteOnS3File}
          deletingS3FileKey={deletingS3FileKey}
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
          onDownloadSingleFile={handleDownloadSingleFileToPod}
          onDownloadAllMissingForPod={handleDownloadAllMissingForPod}
          onDownloadMissingToAllPods={handleDownloadMissingToAllPods}
          isDownloadingAllPods={isDownloadingAllPods}
          downloadProgressMap={downloadProgressMap}
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
