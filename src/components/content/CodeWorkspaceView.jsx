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
  Eye
} from 'lucide-react';
import MediaPreviewModal from './MediaPreviewModal';
import { getPodFileStreamUrl } from '../../api/vpsApi';

export default function CodeWorkspaceView({
  activeCodeDetail,
  onBack,
  detailS3Files,
  isDetailFilesLoading,
  playingAudioUrl,
  onToggleAudioPreview,
  onPromptDeleteS3,
  isS3Deleting,
  pods,
  detailPodsStatus,
  isCheckingAllPods,
  checkingSinglePodId,
  podStatusFilter,
  onPodStatusFilterChange,
  onCheckAllPods,
  onCheckSinglePod,
  onPromptDeleteSinglePod,
  loadingActions
}) {
  const code = activeCodeDetail?.code;
  const totalFiles = detailS3Files?.totalFiles || activeCodeDetail?.totalFiles || 0;
  const totalSizeFormatted = detailS3Files?.totalSizeFormatted || activeCodeDetail?.totalSizeFormatted || '0 B';

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
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 pb-4 mb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <button
              onClick={onBack}
              className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl border border-slate-700 text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors"
            >
              <ArrowLeft size={14} />
              <span>Katalog</span>
            </button>
            <div>
              <h2 className="text-xl font-black text-white flex items-center gap-2.5">
                <span>Pengelolaan Konten Kode: <strong className="text-rose-400 font-mono">#{code}</strong></span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30">
                  AWS S3 Prefix: media/{code}/
                </span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Total: <strong className="text-white font-mono">{totalFiles} File</strong> &bull; Ukuran Master S3: <strong className="text-sky-300 font-mono">{totalSizeFormatted}</strong>
              </p>
            </div>
          </div>

          {/* Master Actions */}
          <div className="flex items-center gap-2.5 flex-wrap">
            <button
              onClick={() => onCheckAllPods(code)}
              disabled={isCheckingAllPods}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-300 hover:text-white text-xs font-bold flex items-center gap-2 border border-slate-700 transition-colors cursor-pointer disabled:opacity-50"
              title="Periksa ulang ketersediaan file di seluruh POD"
            >
              <RefreshCw size={13} className={isCheckingAllPods ? 'animate-spin text-cyan-400' : ''} />
              <span>{isCheckingAllPods ? 'Sedang Memeriksa Semua POD...' : 'Periksa Ulang Semua POD'}</span>
            </button>

            <button
              onClick={onPromptDeleteS3}
              disabled={isS3Deleting}
              className="px-4 py-2 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 hover:text-white text-xs font-bold flex items-center gap-2 border border-rose-500/40 transition-colors cursor-pointer disabled:opacity-50"
              title="Hapus seluruh folder kode ini dari AWS S3"
            >
              {isS3Deleting ? <RefreshCw size={13} className="animate-spin text-rose-400" /> : <Trash2 size={13} />}
              <span>Hard Delete di AWS S3</span>
            </button>
          </div>
        </div>

        {/* Master S3 Files Breakdown */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
              <FileText size={14} className="text-sky-400" />
              <span>Daftar File Master di AWS S3 ({detailS3Files?.totalFiles || 0} File):</span>
            </span>
            <span className="text-[11px] text-slate-400 font-mono">
              Audio: {detailS3Files?.counts?.audio || 0} &bull; Video: {detailS3Files?.counts?.video || 0} &bull; Gambar: {detailS3Files?.counts?.image || 0} &bull; Strobe: {detailS3Files?.counts?.strobe || 0}
            </span>
          </div>

          {isDetailFilesLoading ? (
            <div className="p-8 text-center text-slate-400">
              <RefreshCw size={24} className="animate-spin text-sky-400 mx-auto mb-2" />
              <span className="text-xs">Memuat detail file dari AWS S3...</span>
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

                return (
                  <div
                    key={file.key}
                    onClick={() => isPreviewable && handleOpenPreview(file)}
                    className={`p-2.5 rounded-2xl bg-slate-950/80 border border-slate-800 flex items-center justify-between gap-2 text-xs transition-all ${
                      isPreviewable ? 'hover:border-cyan-500/40 hover:bg-slate-900/90 cursor-pointer group' : ''
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className={`p-2 rounded-xl border shrink-0 ${
                        category === 'video'
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

                    {isPreviewable && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenPreview(file);
                        }}
                        className="p-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-cyan-400 hover:text-white border border-slate-700 cursor-pointer shrink-0 transition-colors"
                        title="Buka Preview Modal (Seek & Kontrol)"
                      >
                        {category === 'video' ? <Film size={13} /> : category === 'audio' ? <Play size={13} /> : <Eye size={13} />}
                      </button>
                    )}
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
            <h3 className="text-sm font-black text-white flex items-center gap-2">
              <Server size={16} className="text-cyan-400" />
              <span>Ketersediaan &amp; Aksi di Armada POD v3 ({pods?.length || 0} Unit Server)</span>
            </h3>
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
                className={`px-2.5 py-1 rounded-xl text-[11px] font-bold cursor-pointer transition-colors border ${
                  podStatusFilter === tab.id
                    ? 'bg-cyan-500/25 text-cyan-300 border-cyan-500/40'
                    : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* POD Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredPods.map(pod => {
            const podId = pod.serverId;
            const isPodChecking = checkingSinglePodId === podId || isCheckingAllPods;
            const isPodDeleting = !!loadingActions[`pod_${code}_${podId}`];
            const podCheck = detailPodsStatus[podId];
            const isOnline = pod.status === 'online';

            return (
              <div
                key={podId}
                className={`glass-card p-4 sm:p-5 rounded-3xl border transition-all flex flex-col justify-between ${
                  !isOnline
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
                      <div className={`p-1.5 rounded-xl border shrink-0 ${
                        isOnline ? 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30' : 'bg-slate-800 text-slate-500 border-slate-700'
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
                    {isPodChecking ? (
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
                      <span className={`text-[10px] font-black px-2 py-0.5 rounded-full border ${
                        podCheck.fileStatus === 'all'
                          ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                          : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                      }`}>
                        {podCheck.fileStatus === 'all' ? 'Lengkap' : 'Sebagian'} ({podCheck.foundCount}/{podCheck.totalExpected})
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700">
                        Kosong (0/{podCheck.totalExpected})
                      </span>
                    )}
                  </div>

                  {/* File Checklist */}
                  {podCheck && isOnline && (
                    <div className="space-y-1.5 mb-4">
                      <div className="text-[10.5px] font-bold text-slate-400 mb-1 flex items-center justify-between">
                        <span>Status File Fisik di POD:</span>
                        <span className="font-mono text-white font-bold">{podCheck.totalFormatted}</span>
                      </div>

                      {/* Found Files on POD */}
                      {podCheck.files?.map(f => {
                        const fileCategory = f.category || (f.folderType === 'sounds' ? 'audio' : f.folderType === 'videos' ? 'video' : 'image');
                        const streamUrl = getPodFileStreamUrl(pod.serverId, f.fullPath);

                        return (
                          <div
                            key={f.fullPath}
                            onClick={() => handleOpenPreview({
                              filename: f.filename,
                              category: fileCategory,
                              sizeFormatted: f.sizeFormatted,
                              url: streamUrl,
                              sourceLabel: `${pod.serverName} • /${f.folderType}`
                            })}
                            className="p-2 rounded-xl bg-emerald-950/20 hover:bg-emerald-950/40 border border-emerald-500/30 hover:border-emerald-500/60 flex items-center justify-between text-xs gap-2 cursor-pointer transition-all group"
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
                              <button
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
                        );
                      })}


                      {/* Missing Files */}
                      {podCheck.missingFiles?.map(f => (
                        <div
                          key={typeof f === 'string' ? f : f.filename}
                          className="p-2 rounded-xl bg-slate-950/60 border border-slate-800/80 flex items-center justify-between text-xs gap-2 opacity-60"
                        >
                          <div className="flex items-center gap-1.5 min-w-0">
                            <X size={13} className="text-slate-500 shrink-0" />
                            <span className="text-slate-400 truncate text-[11px]">
                              {typeof f === 'string' ? f : f.filename}
                            </span>
                          </div>
                          <span className="text-[9.5px] font-mono text-slate-500 shrink-0">
                            Belum ada
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* POD Action Footer */}
                <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between gap-2">
                  <button
                    onClick={() => onCheckSinglePod(podId)}
                    disabled={isPodChecking}
                    className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-cyan-300 border border-slate-700 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
                    title="Periksa ulang POD ini"
                  >
                    <RefreshCw size={11} className={checkingSinglePodId === podId ? 'animate-spin text-cyan-400' : ''} />
                    <span>Periksa Ulang</span>
                  </button>

                  {podCheck?.foundCount > 0 && (
                    <button
                      onClick={() => onPromptDeleteSinglePod(pod)}
                      disabled={isPodDeleting}
                      className="px-3 py-1.5 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 hover:text-white border border-rose-500/30 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
                      title={`Hapus file #${code} di ${pod.serverName}`}
                    >
                      {isPodDeleting ? (
                        <RefreshCw size={11} className="animate-spin" />
                      ) : (
                        <Trash2 size={11} />
                      )}
                      <span>Hapus di POD Ini</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
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
