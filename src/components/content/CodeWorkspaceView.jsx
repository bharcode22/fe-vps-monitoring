import React, { useState } from 'react';
import {
  ArrowLeft,
  FileText,
  Trash2,
  RefreshCw,
  Server,
  Film,
  Volume2,
  Image as ImageIcon,
  Zap,
  Play,
  Pause,
  Check,
  X,
  Eye,
  Download,
  CloudDownload,
  Stethoscope,
  ShieldCheck,
  ShieldAlert,
  CheckCircle2,
  AlertTriangle
} from 'lucide-react';
import MediaPreviewModal from './MediaPreviewModal';
import { getPodFileStreamUrl } from '../../api/vpsApi';

export default function CodeWorkspaceView({
  activeCodeDetail,
  onBack,
  returnViewTitle = 'Katalog',
  detailS3Files,
  isDetailFilesLoading,
  playingAudioUrl,
  onToggleAudioPreview,
  onPromptDeleteS3,
  onPromptDeleteS3File,
  deletingS3FileKey,
  isS3Deleting,
  isStorageLoading = false,
  pods,
  detailPodsStatus,
  isCheckingAllPods,
  checkingSinglePodId,
  podStatusFilter,
  onPodStatusFilterChange,
  onCheckAllPods,
  onCheckSinglePod,
  onPromptDeleteSinglePod,
  onDeleteSingleFileOnPod,
  onDownloadSingleFile,
  onDownloadAllMissingForPod,
  onDownloadMissingToAllPods,
  isDownloadingAllPods,
  downloadProgressMap = {},
  loadingActions,
  integrityMap = {},
  onCheckFileIntegrity,
  onViewIntegrityDetail
}) {
  const code = activeCodeDetail?.code;
  const totalFiles = detailS3Files?.totalFiles ?? activeCodeDetail?.totalFiles ?? 0;
  const totalSizeFormatted = detailS3Files?.totalSizeFormatted ?? activeCodeDetail?.totalSizeFormatted ?? '0 B';
  const counts = detailS3Files?.counts || {
    audio: activeCodeDetail?.audioCount || 0,
    video: activeCodeDetail?.videoCount || 0,
    image: activeCodeDetail?.imageCount || 0,
    strobe: activeCodeDetail?.strobeCount || 0
  };

  // Preview Modal State for Audio, Video, Image
  const [previewModal, setPreviewModal] = useState({
    isOpen: false,
    file: null
  });

  const filteredPods = (pods || []).filter(pod => {
    const podCheck = detailPodsStatus[pod.serverId];
    if (podStatusFilter === 'has_files') return podCheck?.foundCount > 0;
    if (podStatusFilter === 'complete') return podCheck?.fileStatus === 'all';
    if (podStatusFilter === 'partial') return podCheck?.fileStatus === 'partial';
    if (podStatusFilter === 'empty') return podCheck && podCheck.foundCount === 0 && podCheck.status === 'online';
    return true;
  });

  const handleOpenPreview = (file) => {
    setPreviewModal({
      isOpen: true,
      file
    });
  };

  const handleClosePreview = () => {
    setPreviewModal({
      isOpen: false,
      file: null
    });
  };

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-200">
      {/* Top Banner: Master S3 Overview & Files */}
      <div className="glass-card p-5 sm:p-6 rounded-3xl border border-rose-500/40 bg-slate-900/70 shadow-2xl">
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 pb-4 mb-4 border-b border-slate-800/80">
          <div className="flex items-start sm:items-center gap-3 min-w-0 flex-1">
            <button
              onClick={onBack}
              className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl border border-slate-700 text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors shrink-0"
              title={`Kembali ke ${returnViewTitle || 'Katalog'}`}
            >
              <ArrowLeft size={14} />
              <span>{returnViewTitle ? `Kembali ke ${returnViewTitle}` : 'Katalog'}</span>
            </button>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg sm:text-xl font-black text-white truncate">
                  Pengelolaan Konten Kode: <span className="text-rose-400 font-mono">#{code}</span>
                </h2>
                <span className="text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full bg-rose-500/15 text-rose-300 border border-rose-500/30 shrink-0">
                  media/{code}/
                </span>
                {isDetailFilesLoading && (
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-sky-500/15 text-sky-300 border border-sky-500/30 flex items-center gap-1.5 shrink-0">
                    <RefreshCw size={10} className="animate-spin text-sky-400" /> Memuat File...
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 mt-1 flex items-center gap-2 flex-wrap font-medium">
                <span>Total: <strong className="text-white font-mono">{totalFiles} File</strong></span>
                <span>&bull;</span>
                <span>Ukuran Master S3: <strong className="text-sky-300 font-mono">{totalSizeFormatted}</strong></span>
              </p>
            </div>
          </div>

          {/* Master Actions */}
          <div className="flex items-center gap-2 flex-wrap shrink-0">
            <button
              onClick={() => onCheckAllPods(code)}
              disabled={isCheckingAllPods}
              className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-300 hover:text-white text-xs font-bold flex items-center gap-2 border border-slate-700 transition-all cursor-pointer disabled:opacity-50 whitespace-nowrap shadow-sm"
              title="Periksa ulang ketersediaan file di seluruh POD"
            >
              <RefreshCw size={13} className={isCheckingAllPods ? 'animate-spin text-cyan-400' : ''} />
              <span>{isCheckingAllPods ? 'Memeriksa POD...' : 'Periksa Semua POD'}</span>
            </button>

            {onDownloadMissingToAllPods && (
              <button
                onClick={onDownloadMissingToAllPods}
                disabled={isDownloadingAllPods}
                className="px-3.5 py-2 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 hover:text-white text-xs font-bold flex items-center gap-2 border border-emerald-500/40 transition-all cursor-pointer disabled:opacity-50 whitespace-nowrap shadow-sm"
                title="Unduh seluruh file master S3 yang masih kurang ke seluruh armada POD"
              >
                {isDownloadingAllPods ? <RefreshCw size={13} className="animate-spin text-emerald-400" /> : <CloudDownload size={13} />}
                <span>{isDownloadingAllPods ? 'Menyinkronkan...' : 'Sync Missing ke Semua POD'}</span>
              </button>
            )}

            <button
              onClick={onPromptDeleteS3}
              disabled={isS3Deleting}
              className="px-3.5 py-2 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 hover:text-white text-xs font-bold flex items-center gap-2 border border-rose-500/40 transition-all cursor-pointer disabled:opacity-50 whitespace-nowrap shadow-sm"
              title="Hapus seluruh folder kode ini dari AWS S3"
            >
              {isS3Deleting ? <RefreshCw size={13} className="animate-spin text-rose-400" /> : <Trash2 size={13} />}
              <span>Hapus Folder S3</span>
            </button>
          </div>
        </div>

        {/* Master S3 Files Breakdown */}
        <div>
          <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
            <span className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
              <FileText size={14} className="text-sky-400" />
              <span>Daftar File Master di AWS S3 ({totalFiles} File):</span>
            </span>
            <span className="text-[11px] text-slate-400 font-mono">
              Audio: {counts.audio} &bull; Video: {counts.video} &bull; Gambar: {counts.image} &bull; Strobe: {counts.strobe}
            </span>
          </div>

          {isDetailFilesLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5">
              {[...Array(Math.min(totalFiles || 4, 8))].map((_, idx) => (
                <div key={idx} className="p-2.5 rounded-2xl bg-slate-950/70 border border-slate-800/80 flex items-center gap-2.5 animate-pulse">
                  <div className="w-8 h-8 rounded-xl bg-slate-800/60 shrink-0" />
                  <div className="flex-1 space-y-1.5 min-w-0">
                    <div className="h-3 bg-slate-800/80 rounded w-3/4" />
                    <div className="h-2 bg-slate-800/50 rounded w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          ) : detailS3Files?.files?.length === 0 ? (
            <div className="p-4 text-xs text-slate-400 bg-slate-950/60 rounded-2xl border border-slate-800">
              Tidak ada file di folder S3 ini.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5">
              {detailS3Files?.files?.map(file => {
                const category = file.category || 'other';
                const isPreviewable = ['audio', 'video', 'image'].includes(category);
                const isFileDeleting = deletingS3FileKey === file.key;

                return (
                  <div
                    key={file.key}
                    onClick={() => isPreviewable && handleOpenPreview(file)}
                    className={`p-2.5 rounded-2xl bg-slate-950/80 border border-slate-800 flex items-center justify-between gap-2 text-xs transition-all ${isPreviewable ? 'hover:border-cyan-500/40 hover:bg-slate-900/90 cursor-pointer group' : ''
                      }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className={`p-2 rounded-xl border shrink-0 ${category === 'video'
                        ? 'bg-purple-500/15 text-purple-400 border-purple-500/30'
                        : category === 'audio'
                          ? 'bg-sky-500/15 text-sky-400 border-sky-500/30'
                          : category === 'image'
                            ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                            : 'bg-amber-500/15 text-amber-400 border-amber-500/30'
                        }`}>
                        {category === 'video' ? <Film size={13} /> : category === 'audio' ? <Volume2 size={13} /> : category === 'image' ? <ImageIcon size={13} /> : <Zap size={13} />}
                      </div>
                      <div className="min-w-0">
                        <div className="font-bold text-white truncate text-[11.5px] group-hover:text-cyan-300 transition-colors" title={file.filename}>
                          {file.filename}
                        </div>
                        <div className="text-[10px] text-slate-500 font-mono">
                          {file.sizeFormatted} &bull; <span className="capitalize">{category}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      {isPreviewable && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenPreview(file);
                          }}
                          className="p-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-cyan-400 hover:text-white border border-slate-700 cursor-pointer transition-colors"
                          title="Buka Preview Modal (Seek & Kontrol)"
                        >
                          {category === 'video' ? <Film size={13} /> : category === 'audio' ? <Play size={13} /> : <Eye size={13} />}
                        </button>
                      )}

                      {onPromptDeleteS3File && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onPromptDeleteS3File(file);
                          }}
                          disabled={isFileDeleting}
                          className="p-1.5 rounded-xl bg-slate-900 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 border border-slate-700 hover:border-rose-500/40 cursor-pointer transition-colors disabled:opacity-50"
                          title={`Hapus file ${file.filename} dari AWS S3`}
                        >
                          {isFileDeleting ? (
                            <RefreshCw size={13} className="animate-spin text-rose-400" />
                          ) : (
                            <Trash2 size={13} />
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Section: Status & Pengelolaan Armada POD v3 */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-slate-950/80 p-4 rounded-2xl border border-slate-800">
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h3 className="text-sm font-black text-white flex items-center gap-2">
                <Server size={16} className="text-cyan-400" />
                <span>Ketersediaan &amp; Aksi di Armada POD v3 ({pods?.length || 0} Unit Server)</span>
              </h3>
              {(isCheckingAllPods || isStorageLoading) && (
                <span className="text-[10px] font-mono px-2.5 py-0.5 rounded-full bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 flex items-center gap-1.5 shrink-0 animate-pulse">
                  <RefreshCw size={10} className="animate-spin text-cyan-400" />
                  <span>{isStorageLoading ? 'Memuat Armada POD...' : 'Memindai Matriks Disk POD...'}</span>
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Setiap kartu menampilkan status kelengkapan file kode <strong className="text-rose-400 font-mono">#{code}</strong> di direktori fisik server POD.
            </p>
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1.5 flex-wrap">
            {[
              { id: 'all', label: 'Semua POD' },
              { id: 'has_files', label: 'Ada File' },
              { id: 'complete', label: 'Lengkap' },
              { id: 'partial', label: 'Sebagian' },
              { id: 'empty', label: 'Kosong' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => onPodStatusFilterChange(tab.id)}
                className={`px-2.5 py-1 rounded-xl text-[11px] font-bold cursor-pointer transition-colors border ${podStatusFilter === tab.id
                  ? 'bg-cyan-500/25 text-cyan-300 border-cyan-500/40'
                  : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'
                  }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* POD Loading Skeletons when initial storage summary is loading */}
        {isStorageLoading && (!pods || pods.length === 0) ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((_, i) => (
              <div key={i} className="glass-card p-5 rounded-3xl border border-slate-800 bg-slate-900/40 animate-pulse space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-slate-800" />
                    <div className="space-y-1.5">
                      <div className="w-24 h-3.5 bg-slate-800 rounded" />
                      <div className="w-16 h-2 bg-slate-800/60 rounded" />
                    </div>
                  </div>
                  <div className="w-16 h-5 bg-slate-800 rounded-full" />
                </div>
                <div className="space-y-2">
                  <div className="w-full h-8 bg-slate-800/50 rounded-xl" />
                  <div className="w-full h-8 bg-slate-800/50 rounded-xl" />
                </div>
                <div className="pt-2 border-t border-slate-800 flex justify-between">
                  <div className="w-20 h-7 bg-slate-800/60 rounded-xl" />
                  <div className="w-20 h-7 bg-slate-800/60 rounded-xl" />
                </div>
              </div>
            ))}
          </div>
        ) : !isStorageLoading && (!pods || pods.length === 0) ? (
          <div className="p-8 text-center bg-slate-950/60 rounded-3xl border border-slate-800 text-slate-400 text-xs">
            Belum ada unit server POD v3 yang terdaftar atau aktif.
          </div>
        ) : (
          /* POD Cards Grid */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredPods.map(pod => {
              const podId = pod.serverId;
              const podCheck = detailPodsStatus[podId];
              const isPodDeleting = !!loadingActions[`pod_${code}_${podId}`] || !!podCheck?.isDeleting;
              const isPodChecking = checkingSinglePodId === podId || isCheckingAllPods;
              const isOnline = pod.status === 'online';

              return (
                <div
                  key={podId}
                  className={`glass-card p-4 sm:p-5 rounded-3xl border transition-all flex flex-col justify-between ${isPodDeleting
                    ? 'border-rose-500/50 bg-rose-950/15 shadow-xl shadow-rose-950/30 ring-1 ring-rose-500/30'
                    : !isOnline
                      ? 'border-slate-800/80 bg-slate-950/40 opacity-75'
                      : podCheck?.fileStatus === 'all'
                        ? 'border-emerald-500/30 bg-slate-900/70 shadow-lg shadow-emerald-500/5'
                        : podCheck?.foundCount > 0
                          ? 'border-amber-500/30 bg-slate-900/70 shadow-lg shadow-amber-500/5'
                          : 'border-slate-800 bg-slate-900/50'
                    }`}
                >
                  <div>
                    {/* POD Header */}
                    <div className="flex items-center justify-between gap-2 pb-3 mb-3 border-b border-slate-800/80">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className={`p-1.5 rounded-xl border shrink-0 ${isOnline ? 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30' : 'bg-slate-800 text-slate-500 border-slate-700'
                          }`}>
                          <Server size={14} />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <h4 className="font-extrabold text-sm text-white truncate">{pod.serverName}</h4>
                            {pod.code && (
                              <span className="text-[9px] font-mono font-bold px-1.5 py-0.2 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                                {pod.code}
                              </span>
                            )}
                          </div>
                        </div>

                      </div>

                      {/* Status Badge */}
                      {isPodDeleting ? (
                        <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/40 flex items-center gap-1.5 animate-pulse shadow-sm shadow-rose-950">
                          <RefreshCw size={10} className="animate-spin text-rose-400" /> Menghapus...
                        </span>
                      ) : isPodChecking ? (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 flex items-center gap-1">
                          <RefreshCw size={10} className="animate-spin" /> Memeriksa...
                        </span>
                      ) : !podCheck ? (
                        <button
                          onClick={() => onCheckSinglePod(podId)}
                          className="px-2.5 py-1 rounded-xl bg-cyan-500/15 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/30 text-[10px] font-bold cursor-pointer transition-colors"
                        >
                          Periksa
                        </button>
                      ) : podCheck.status === 'offline' ? (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-500/15 text-rose-300 border border-rose-500/30">
                          Offline
                        </span>
                      ) : podCheck.foundCount > 0 ? (
                        <span className={`text-[10px] font-black px-2 py-0.5 rounded-full border ${podCheck.fileStatus === 'all'
                          ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                          : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                          }`}>
                          {podCheck.fileStatus === 'all' ? 'Lengkap' : 'Sebagian'} ({podCheck.foundCount}/{podCheck.totalExpected})
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700">
                          Kosong (0/{podCheck?.totalExpected || totalFiles || 0})
                        </span>
                      )}
                    </div>

                    {/* Deleting In Progress Banner */}
                    {isPodDeleting && (
                      <div className="p-2.5 mb-3 rounded-2xl bg-rose-950/40 border border-rose-500/40 text-[11px] text-rose-300 flex items-center gap-2 animate-pulse shadow-sm shadow-rose-950/50">
                        <RefreshCw size={13} className="animate-spin text-rose-400 shrink-0" />
                        <span className="font-semibold">Sedang menghapus file fisik di {pod.serverName}... Mohon tunggu sebentar.</span>
                      </div>
                    )}

                    {/* Scanning / Loading Placeholder inside POD Card */}
                    {!podCheck && isOnline && (
                      <div className="space-y-2 mb-4 p-3 rounded-2xl bg-slate-950/60 border border-slate-800/80 animate-pulse">
                        <div className="flex items-center justify-between text-[10.5px] font-bold text-cyan-400 mb-1">
                          <span className="flex items-center gap-1.5">
                            <RefreshCw size={11} className="animate-spin text-cyan-400" />
                            <span>{isPodChecking ? 'Memindai direktori disk POD...' : 'Menunggu pemeriksaan...'}</span>
                          </span>
                        </div>
                        <div className="space-y-1.5">
                          <div className="h-6 bg-slate-900/90 rounded-xl border border-slate-800/60 w-full" />
                          <div className="h-6 bg-slate-900/90 rounded-xl border border-slate-800/60 w-full" />
                        </div>
                      </div>
                    )}

                    {/* File Checklist */}
                    {podCheck && isOnline && (
                      <div className={`space-y-1.5 mb-4 transition-opacity ${isPodDeleting ? 'opacity-40 pointer-events-none' : ''}`}>
                        <div className="text-[10.5px] font-bold text-slate-400 mb-1 flex items-center justify-between">
                          <span>Status File Fisik di POD:</span>
                          <span className="font-mono text-white font-bold">{podCheck.totalFormatted}</span>
                        </div>

                        {/* Found Files on POD */}
                        {podCheck.files?.map(f => {
                          const fileCategory = f.category || (f.folderType === 'sounds' ? 'audio' : f.folderType === 'videos' ? 'video' : 'image');
                          const streamUrl = getPodFileStreamUrl(pod.serverId, f.fullPath);
                          const integrityKey = `${pod.serverId}_${f.fullPath}`;
                          const isIntegrityChecking = !!loadingActions[`integrity_${pod.serverId}_${f.fullPath}`];
                          const integrityData = integrityMap[integrityKey];
                          const isFileDownloading = !!loadingActions[`dl_${podId}_${f.filename}`];
                          const progKey = `${podId}_${f.filename}`;
                          const progress = downloadProgressMap[progKey];

                          return (
                            <div
                              key={f.fullPath}
                              className={`p-2 rounded-xl border flex flex-col gap-1 text-xs transition-all group ${progress || isFileDownloading
                                ? 'border-sky-500/60 bg-sky-950/30 shadow-lg shadow-sky-950/50'
                                : 'bg-emerald-950/20 hover:bg-emerald-950/30 border-emerald-500/30 hover:border-emerald-500/50'
                                }`}
                            >
                              <div
                                onClick={() => handleOpenPreview({
                                  filename: f.filename,
                                  category: fileCategory,
                                  sizeFormatted: f.sizeFormatted,
                                  url: streamUrl,
                                  sourceLabel: `${pod.serverName} • /${f.folderType}`
                                })}
                                className="flex items-center justify-between gap-2 cursor-pointer"
                                title="Klik untuk Preview Media langsung dari Server POD via Stream"
                              >
                                <div className="flex items-center gap-1.5 min-w-0">
                                  <Check size={13} className="text-emerald-400 shrink-0" />
                                  <span className="font-bold text-white truncate text-[11px] group-hover:text-emerald-300 transition-colors" title={f.filename}>
                                    {f.filename}
                                  </span>
                                </div>
                                <div className="flex items-center gap-1.5 shrink-0">
                                  <span className="text-[9.5px] font-mono text-emerald-300">
                                    {f.sizeFormatted} &bull; /{f.folderType}
                                  </span>

                                  {/* Tombol Cek Integritas (ffprobe) */}
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      onCheckFileIntegrity?.(pod, f.fullPath, f.filename);
                                    }}
                                    disabled={isIntegrityChecking}
                                    className={`p-1 rounded-lg border transition-all cursor-pointer ${integrityData?.isCorrupt
                                      ? 'bg-rose-500/25 text-rose-300 border-rose-500/40 hover:bg-rose-500/35'
                                      : integrityData?.status === 'healthy'
                                        ? 'bg-emerald-500/25 text-emerald-300 border-emerald-500/40 hover:bg-emerald-500/35'
                                        : 'bg-slate-900 hover:bg-slate-800 text-cyan-400 hover:text-white border-slate-700'
                                      }`}
                                    title="Cek Integritas &amp; Validitas Media (ffprobe: codec, durasi, bitrate, kesehatan file)"
                                  >
                                    {isIntegrityChecking ? (
                                      <RefreshCw size={11} className="animate-spin text-cyan-400" />
                                    ) : integrityData?.isCorrupt ? (
                                      <ShieldAlert size={11} className="text-rose-400" />
                                    ) : integrityData?.status === 'healthy' ? (
                                      <ShieldCheck size={11} className="text-emerald-400" />
                                    ) : (
                                      <Stethoscope size={11} />
                                    )}
                                  </button>

                                  {/* Tombol Buka Preview */}
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleOpenPreview({
                                        filename: f.filename,
                                        category: fileCategory,
                                        sizeFormatted: f.sizeFormatted,
                                        url: streamUrl,
                                        sourceLabel: `${pod.serverName} • /${f.folderType}`
                                      });
                                    }}
                                    className="p-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-emerald-400 hover:text-white border border-slate-700 transition-colors cursor-pointer"
                                    title="Buka Preview Modal dari POD"
                                  >
                                    <Eye size={11} />
                                  </button>
                                </div>
                              </div>

                              {/* Badge Diagnosa Integritas (Hasil ffprobe) */}
                              {integrityData && (
                                <div
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onViewIntegrityDetail?.(integrityData);
                                  }}
                                  className={`mt-0.5 px-2 py-1.5 rounded-lg text-[10px] font-mono flex flex-col gap-1 border cursor-pointer transition-all ${integrityData.isCorrupt
                                    ? 'bg-rose-950/50 text-rose-300 border-rose-500/40 hover:bg-rose-950/70'
                                    : 'bg-emerald-950/40 text-emerald-300 border-emerald-500/40 hover:bg-emerald-950/60'
                                    }`}
                                  title="Klik untuk melihat laporan diagnostik ffprobe lengkap"
                                >
                                  <div className="flex items-center justify-between gap-1 w-full">
                                    <span className="flex items-center gap-1.5 truncate">
                                      {integrityData.isCorrupt ? (
                                        <>
                                          <AlertTriangle size={11} className="text-rose-400 shrink-0" />
                                          <b className="text-rose-400">KORUP:</b> {integrityData.message}
                                        </>
                                      ) : (
                                        <>
                                          <CheckCircle2 size={11} className="text-emerald-400 shrink-0" />
                                          <span>
                                            <b>Sehat &amp; Utuh</b>
                                            {integrityData.durationFormatted ? ` • ${integrityData.durationFormatted}` : ''}
                                            {integrityData.bitrateFormatted ? ` • ${integrityData.bitrateFormatted}` : ''}
                                          </span>
                                        </>
                                      )}
                                    </span>
                                    <span className="text-[9px] underline text-cyan-300 shrink-0 font-sans font-bold">
                                      Rincian &rsaquo;
                                    </span>
                                  </div>

                                  {integrityData.isCorrupt && (
                                    <div className="flex items-center gap-1.5 mt-1 pt-1.5 border-t border-rose-500/30">
                                      <button
                                        type="button"
                                        disabled={isFileDownloading}
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          onDownloadSingleFile?.(pod, f.filename);
                                        }}
                                        className="flex items-center gap-1 px-1.5 py-0.5 bg-rose-500/20 hover:bg-rose-500/40 border border-rose-500/40 rounded text-[9px] text-rose-200 font-bold transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                                      >
                                        {isFileDownloading ? <RefreshCw size={10} className="animate-spin" /> : <Download size={10} />}
                                        {isFileDownloading ? 'Mendownload...' : 'Download Ulang'}
                                      </button>
                                      <button
                                        type="button"
                                        disabled={isFileDownloading}
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          onDeleteSingleFileOnPod?.(pod, f.filename);
                                        }}
                                        className="flex items-center gap-1 px-1.5 py-0.5 bg-rose-950/80 hover:bg-rose-900 border border-rose-500/40 rounded text-[9px] text-rose-400 font-bold transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                                      >
                                        <Trash2 size={10} />
                                        Hapus
                                      </button>
                                    </div>
                                  )}
                                </div>
                              )}

                              {/* Live Progress Bar for Re-download */}
                              {(progress || isFileDownloading) && (
                                <div className="mt-1 pt-1.5 border-t border-sky-500/20 animate-in fade-in duration-200">
                                  {progress ? (
                                    <>
                                      <div className="w-full bg-slate-900/90 rounded-full h-1.5 overflow-hidden border border-slate-800">
                                        <div
                                          className="bg-gradient-to-r from-sky-500 via-cyan-400 to-emerald-400 h-1.5 rounded-full transition-all duration-300 ease-out shadow-sm shadow-cyan-400/50"
                                          style={{ width: `${Math.min(100, Math.max(0, progress.percent))}%` }}
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


                        {/* Missing Files */}
                        {podCheck.missingFiles?.map(f => {
                          const filename = typeof f === 'string' ? f : f.filename;
                          const isFileDownloading = !!loadingActions[`dl_${podId}_${filename}`];
                          const progKey = `${podId}_${filename}`;
                          const progress = downloadProgressMap[progKey];

                          return (
                            <div
                              key={filename}
                              className={`p-2.5 rounded-xl border text-xs transition-all ${progress || isFileDownloading
                                ? 'border-sky-500/60 bg-sky-950/30 shadow-lg shadow-sky-950/50'
                                : 'border-slate-800/80 bg-slate-950/60 group hover:border-slate-700'
                                }`}
                            >
                              <div className="flex items-center justify-between gap-2">
                                <div className="flex items-center gap-1.5 min-w-0">
                                  {progress || isFileDownloading ? (
                                    <RefreshCw size={13} className="animate-spin text-sky-400 shrink-0" />
                                  ) : (
                                    <X size={13} className="text-slate-500 shrink-0" />
                                  )}
                                  <span className={`truncate text-[11px] font-medium ${progress || isFileDownloading ? 'text-sky-200 font-bold' : 'text-slate-400'}`} title={filename}>
                                    {filename}
                                  </span>
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                  {progress ? (
                                    <span className="text-[10px] font-mono font-bold text-cyan-300 bg-cyan-950/60 px-1.5 py-0.5 rounded border border-cyan-500/30">
                                      {progress.percent}% &bull; {progress.speed}
                                    </span>
                                  ) : isFileDownloading ? (
                                    <span className="text-[10px] font-mono text-sky-400 animate-pulse">
                                      Menghubungkan...
                                    </span>
                                  ) : (
                                    <span className="text-[9.5px] font-mono text-amber-400/80">
                                      Belum ada
                                    </span>
                                  )}

                                  {onDownloadSingleFile && !progress && (
                                    <button
                                      type="button"
                                      onClick={() => onDownloadSingleFile(pod, filename)}
                                      disabled={isFileDownloading}
                                      className="p-1 rounded-lg bg-sky-500/15 hover:bg-sky-500/25 text-sky-400 hover:text-white border border-sky-500/30 transition-colors cursor-pointer disabled:opacity-50"
                                      title={`Download ${filename} langsung ke folder tujuan di ${pod.serverName}`}
                                    >
                                      {isFileDownloading ? (
                                        <RefreshCw size={11} className="animate-spin text-sky-400" />
                                      ) : (
                                        <Download size={11} />
                                      )}
                                    </button>
                                  )}
                                </div>
                              </div>

                              {/* Live Progress Bar for this large file */}
                              {progress && (
                                <div className="mt-2 pt-2 border-t border-sky-500/20 animate-in fade-in duration-200">
                                  <div className="w-full bg-slate-900/90 rounded-full h-1.5 overflow-hidden border border-slate-800">
                                    <div
                                      className="bg-gradient-to-r from-sky-500 via-cyan-400 to-emerald-400 h-1.5 rounded-full transition-all duration-300 ease-out shadow-sm shadow-cyan-400/50"
                                      style={{ width: `${Math.min(100, Math.max(0, progress.percent))}%` }}
                                    />
                                  </div>
                                  <div className="flex items-center justify-between text-[9.5px] text-slate-400 font-mono mt-1">
                                    <span>{progress.downloadedFormatted || '0 B'} / {progress.totalFormatted || '...'}</span>
                                    <span className="text-cyan-300 font-semibold">{progress.speed || '0 KB/s'}</span>
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* POD Action Footer */}
                  <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => onCheckSinglePod(podId)}
                        disabled={isPodChecking || isPodDeleting}
                        className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-cyan-300 border border-slate-700 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
                        title="Periksa ulang POD ini"
                      >
                        <RefreshCw size={11} className={checkingSinglePodId === podId ? 'animate-spin text-cyan-400' : ''} />
                        <span>Periksa Ulang</span>
                      </button>

                      {podCheck?.missingFiles?.length > 0 && onDownloadAllMissingForPod && (
                        <button
                          onClick={() => onDownloadAllMissingForPod(pod)}
                          disabled={!!loadingActions[`dl_all_${podId}`] || isPodDeleting}
                          className="px-2.5 py-1.5 rounded-xl bg-sky-500/20 hover:bg-sky-500/30 text-sky-300 hover:text-white border border-sky-500/40 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
                          title={`Download seluruh ${podCheck.missingFiles.length} file yang belum ada ke ${pod.serverName}`}
                        >
                          {loadingActions[`dl_all_${podId}`] ? (
                            <RefreshCw size={11} className="animate-spin text-sky-400" />
                          ) : (
                            <CloudDownload size={11} />
                          )}
                          <span>Download Missing ({podCheck.missingFiles.length})</span>
                        </button>
                      )}
                    </div>

                    {(podCheck?.foundCount > 0 || isPodDeleting) && (
                      <button
                        onClick={() => onPromptDeleteSinglePod(pod)}
                        disabled={isPodDeleting}
                        className={`px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-all disabled:opacity-70 ${isPodDeleting
                          ? 'bg-rose-950/60 text-rose-300 border-rose-500/50 cursor-wait shadow-sm shadow-rose-950/80'
                          : 'bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 hover:text-white border-rose-500/30 cursor-pointer'
                          }`}
                        title={isPodDeleting ? 'Sedang memproses penghapusan di backend...' : `Hapus file #${code} di ${pod.serverName}`}
                      >
                        {isPodDeleting ? (
                          <>
                            <RefreshCw size={11} className="animate-spin text-rose-400" />
                            <span>Sedang Menghapus...</span>
                          </>
                        ) : (
                          <>
                            <Trash2 size={11} />
                            <span>Hapus di POD Ini</span>
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal Media Preview (Audio, Video, Image) with Interactive Seek & Timeline */}
      <MediaPreviewModal
        isOpen={previewModal.isOpen}
        file={previewModal.file}
        onClose={handleClosePreview}
      />
    </div>
  );
}
