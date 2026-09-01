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
  Trash2
} from 'lucide-react';
import {
  fetchMasterMultimediaListApi,
  inspectPodsSyncStatusApi,
  inspectSinglePodSyncStatusApi,
  controlPodSyncContainerApi,
  triggerMasterResaveApi,
  deleteMasterMultimediaApi
} from '../api/vpsApi';
import DockerLogModal from '../components/server/DockerLogModal';
import MultimediaUploadModal from '../components/content/MultimediaUploadModal';

export default function MultimediaRabbitMqSyncPage({ onBack, onNavigateView }) {
  // 1. Master Multimedia State
  const [multimediaItems, setMultimediaItems] = useState([]);
  const [pagination, setPagination] = useState({ total: 0, page: 1, limit: 10, totalPages: 1 });
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoadingMaster, setIsLoadingMaster] = useState(false);
  const [masterError, setMasterError] = useState('');

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
                  File at S3 AWS
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30 shrink-0">
                  {pagination.total} Track
                </span>
              </div>

              <div className="flex items-center gap-1.5 shrink-0 ml-auto">
                {selectedItem?.sound_scape && onNavigateView && (
                  <button
                    onClick={() => onNavigateView('storage-manager', { code: String(selectedItem.sound_scape), returnView: 'multimedia-sync' })}
                    className="px-2.5 py-1 rounded-xl bg-purple-500/25 hover:bg-purple-500/35 text-purple-200 border border-purple-500/40 text-[10.5px] font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm active:scale-95 shrink-0"
                    title={`Buka Workspace Pengelolaan Konten Kode #${selectedItem.sound_scape} di Storage Manager`}
                  >
                    <Layers size={12} className="text-purple-400" />
                    <span>Detail #{selectedItem.sound_scape}</span>
                  </button>
                )}

                <button
                  onClick={() => loadMasterMultimedia(pagination.page, searchQuery)}
                  disabled={isLoadingMaster}
                  className="p-1.5 sm:px-2.5 sm:py-1 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700 hover:border-purple-500/40 text-[10.5px] font-bold flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50 active:scale-95 shrink-0"
                  title="Segarkan Data Master API"
                >
                  <RefreshCw size={11} className={isLoadingMaster ? 'animate-spin text-purple-400' : ''} />
                  <span className="hidden sm:inline">Segarkan</span>
                </button>
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
                    onClick={() => setSelectedItem(item)}
                    className={`p-2.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 group select-none ${isSelected
                      ? 'bg-gradient-to-r from-purple-500/25 via-indigo-500/20 to-purple-500/10 border-purple-500/70 shadow-lg shadow-purple-500/15 ring-1 ring-purple-500/40'
                      : 'bg-slate-950/60 border-slate-800/80 hover:border-purple-500/40 hover:bg-slate-900/80'
                      }`}
                  >
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

                    {/* Right Actions: File Indicators & Delete Button */}
                    <div className="flex items-center gap-1 shrink-0">
                      {item.video && (
                        <span className="p-1 rounded-md bg-rose-500/15 text-rose-300 border border-rose-500/30 text-[9px]" title="Video Ready">
                          <FileVideo size={11} />
                        </span>
                      )}
                      {item.music && (
                        <span className="p-1 rounded-md bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 text-[9px]" title="Musik WAV Ready">
                          <Music size={11} />
                        </span>
                      )}
                      {item.lamp && (
                        <span className="p-1 rounded-md bg-amber-500/15 text-amber-300 border border-amber-500/30 text-[9px]" title="Strobe Lamp Ready">
                          <Zap size={11} />
                        </span>
                      )}

                      {/* Workspace Detail Button */}
                      {onNavigateView && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onNavigateView('storage-manager', { code: String(item.sound_scape), returnView: 'multimedia-sync' });
                          }}
                          className="p-1 rounded-md bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 hover:text-purple-300 border border-purple-500/30 transition-all cursor-pointer ml-1"
                          title={`Buka Pengelolaan Konten Kode #${item.sound_scape} di Storage Manager`}
                        >
                          <Layers size={11} />
                        </button>
                      )}

                      {/* Delete from Master API Button */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeleteTargetItem(item);
                        }}
                        className="p-1 rounded-md bg-slate-900/90 hover:bg-rose-500/20 text-slate-500 hover:text-rose-400 border border-slate-800 hover:border-rose-500/40 transition-all cursor-pointer ml-0.5"
                        title={`Hapus #${item.sound_scape} dari Master API`}
                      >
                        <Trash2 size={11} />
                      </button>
                    </div>
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

              {/* Action Buttons: Status Check */}
              <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                <button
                  onClick={() => inspectFleet(selectedItem?.sound_scape || '')}
                  disabled={isLoadingFleet}
                  className="px-3 py-1.5 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50 active:scale-95"
                  title="Periksa status container mobile-synch & direktori disk di seluruh unit POD V3"
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
                const isExited = pod.isOnline && pod.containerState === 'exited';
                const isRunning = pod.isOnline && pod.containerState === 'running';
                const isStartLoading = !!actionLoadingMap[`start_${pod.serverId}`];
                const isRestartLoading = !!actionLoadingMap[`restart_${pod.serverId}`];
                const isStopLoading = !!actionLoadingMap[`stop_${pod.serverId}`];
                const isInspectLoading = !!actionLoadingMap[`inspect_${pod.serverId}`];

                return (
                  <div
                    key={pod.serverId}
                    className={`p-3 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 ${!pod.isOnline
                      ? 'bg-slate-950/40 border-slate-800/60 opacity-60'
                      : isExited
                        ? 'bg-amber-950/15 border-amber-500/40 shadow-sm'
                        : 'bg-slate-950/60 border-slate-800 hover:border-cyan-500/30'
                      }`}
                  >
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

                        {/* Badges: Container Status */}
                        <div className="flex items-center gap-1.5 mt-1 flex-wrap">
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
                        </div>
                      </div>
                    </div>

                    {/* Individual Action Controls per POD */}
                    <div className="flex items-center gap-1.5 self-end sm:self-center shrink-0">
                      {/* Start Container Button (if Exited) */}
                      {isExited && (
                        <button
                          onClick={() => handleControlSinglePod(pod, 'start')}
                          disabled={isStartLoading}
                          className={`px-2.5 py-1.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 text-[10.5px] font-bold flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50 active:scale-95 ${isStartLoading ? 'animate-pulse' : ''
                            }`}
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
                          onClick={() => handleControlSinglePod(pod, 'restart')}
                          disabled={isRestartLoading}
                          className={`p-1.5 rounded-xl bg-slate-900 hover:bg-purple-500/20 text-slate-300 hover:text-purple-300 border border-slate-700 hover:border-purple-500/40 transition-all cursor-pointer disabled:opacity-50 active:scale-95 ${isRestartLoading ? 'border-purple-500/60 bg-purple-500/10' : ''
                            }`}
                          title="Restart container mobile-synch pada POD ini"
                        >
                          {isRestartLoading ? (
                            <Loader2 size={12} className="animate-spin text-purple-400" />
                          ) : (
                            <RotateCw size={12} />
                          )}
                        </button>
                      )}

                      {/* Stop Container Button (if Running) */}
                      {isRunning && (
                        <button
                          onClick={() => handleControlSinglePod(pod, 'stop')}
                          disabled={isStopLoading}
                          className={`p-1.5 rounded-xl bg-slate-900 hover:bg-rose-500/20 text-slate-300 hover:text-rose-300 border border-slate-700 hover:border-rose-500/40 transition-all cursor-pointer disabled:opacity-50 active:scale-95 ${isStopLoading ? 'border-rose-500/60 bg-rose-500/10' : ''
                            }`}
                          title="Stop container mobile-synch pada POD ini"
                        >
                          {isStopLoading ? (
                            <Loader2 size={12} className="animate-spin text-rose-400" />
                          ) : (
                            <Square size={10} className="fill-rose-400 text-rose-400" />
                          )}
                        </button>
                      )}

                      {/* Re-check Single POD Status Button */}
                      {pod.isOnline && (
                        <button
                          onClick={() => handleInspectSinglePod(pod)}
                          disabled={isInspectLoading}
                          className={`p-1.5 rounded-xl bg-slate-900 hover:bg-cyan-500/20 text-slate-400 hover:text-cyan-300 border border-slate-700 hover:border-cyan-500/40 transition-all cursor-pointer disabled:opacity-50 active:scale-95 ${isInspectLoading ? 'border-cyan-500/60 bg-cyan-500/10' : ''
                            }`}
                          title="Periksa status container & file pada POD ini saja"
                        >
                          {isInspectLoading ? (
                            <Loader2 size={12} className="animate-spin text-cyan-400" />
                          ) : (
                            <RefreshCw size={12} />
                          )}
                        </button>
                      )}

                      {/* View Logs Button */}
                      {pod.isOnline && (
                        <button
                          onClick={() => setLogModalPod(pod)}
                          className="p-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-700 transition-all cursor-pointer active:scale-95"
                          title="Buka Console Log Real-time mobile-synch"
                        >
                          <Terminal size={12} />
                        </button>
                      )}
                    </div>
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

    </div>
  );
}
