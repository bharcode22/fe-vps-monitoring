import React, { useState, useRef, useEffect } from 'react';
import { useLanguage } from '../../context/LanguageContext';
import {
  X,
  UploadCloud,
  FileVideo,
  Music,
  Zap,
  Image as ImageIcon,
  CheckCircle2,
  AlertCircle,
  Loader2,
  HardDrive,
  Clock,
  Gauge,
  Sparkles,
  Layers,
  Trash2,
  Server,
  Flame
} from 'lucide-react';
import {
  fetchMasterTokenApi,
  uploadDirectToMasterApi
} from '../../api/vpsApi';

function formatBytes(bytes, decimals = 2) {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

function formatDuration(seconds) {
  if (!seconds || seconds <= 0 || !isFinite(seconds)) return '0s';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

export default function MultimediaUploadModal({ isOpen, onClose, onSuccess }) {
  const { t } = useLanguage();

  // Form Metadata State
  const [metadata, setMetadata] = useState({
    tittle: '',
    artist: '',
    album: '',
    IsShowAtCustom: 'show'
  });

  // Selected Files State
  const [files, setFiles] = useState({
    lamp: null,
    video: null,
    music: null,
    cover_album: null
  });

  // Cover Image Preview URL
  const [coverPreviewUrl, setCoverPreviewUrl] = useState(null);

  // Upload Engine State
  const [isUploading, setIsUploading] = useState(false);
  const [uploadPhase, setUploadPhase] = useState('idle'); // 'idle' | 'auth' | 'uploading_server' | 'uploading_s3' | 'processing_db' | 'completed' | 'error'
  const [statusMessage, setStatusMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  // Client-to-Server Progress Metrics
  const [overallProgress, setOverallProgress] = useState(0);
  const [uploadedBytesTotal, setUploadedBytesTotal] = useState(0);
  const [totalBytesToUpload, setTotalBytesToUpload] = useState(0);
  const [uploadSpeed, setUploadSpeed] = useState('0 MB/s');
  const [etaSeconds, setEtaSeconds] = useState(0);

  // Server-to-S3 Progress State (Received via SSE directly from Master API)
  const [serverS3Progress, setServerS3Progress] = useState({
    status: 'idle',
    overallPercent: 0,
    totalSize: 0,
    totalLoaded: 0,
    message: '',
    files: [] // [{ name, type, size, loaded, percent, status }]
  });

  // Per-file detailed progress
  const [fileProgressMap, setFileProgressMap] = useState({});

  // Refs for tracking active upload state
  const isCancelledRef = useRef(false);
  const activeXhrRef = useRef(null);
  const fileInputRefs = {
    lamp: useRef(null),
    video: useRef(null),
    music: useRef(null),
    cover_album: useRef(null)
  };

  const resetForm = () => {
    setMetadata({
      tittle: '',
      artist: '',
      album: '',
      IsShowAtCustom: 'show'
    });
    setFiles({
      lamp: null,
      video: null,
      music: null,
      cover_album: null
    });
    setCoverPreviewUrl(null);
    setIsUploading(false);
    setUploadPhase('idle');
    setStatusMessage('');
    setErrorMessage('');
    setOverallProgress(0);
    setUploadedBytesTotal(0);
    setTotalBytesToUpload(0);
    setUploadSpeed('0 MB/s');
    setEtaSeconds(0);
    setFileProgressMap({});
    setServerS3Progress({
      status: 'idle',
      overallPercent: 0,
      totalSize: 0,
      totalLoaded: 0,
      message: '',
      files: []
    });
    isCancelledRef.current = false;
    activeXhrRef.current = null;

    // Reset input elements
    Object.values(fileInputRefs).forEach(ref => {
      if (ref?.current) {
        ref.current.value = '';
      }
    });
  };

  // Create preview when cover album is chosen
  useEffect(() => {
    if (files.cover_album) {
      const url = URL.createObjectURL(files.cover_album);
      setCoverPreviewUrl(url);
      return () => URL.revokeObjectURL(url);
    } else {
      setCoverPreviewUrl(null);
    }
  }, [files.cover_album]);

  // Reset state when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      resetForm();
    }
  }, [isOpen]);

  const handleCloseModal = () => {
    if (isUploading && uploadPhase !== 'completed') {
      if (!window.confirm(t('multimedia.regularUploadModal.confirmCancel', null, 'Yakin ingin membatalkan proses upload langsung yang sedang berlangsung?'))) {
        return;
      }
      isCancelledRef.current = true;
      if (activeXhrRef.current) {
        activeXhrRef.current.abort();
      }
    }
    resetForm();
    onClose();
  };

  if (!isOpen) return null;

  const handleFileChange = (field, file) => {
    if (isUploading) return;
    setFiles(prev => ({ ...prev, [field]: file }));
  };

  const handleRemoveFile = (field, e) => {
    e.stopPropagation();
    if (isUploading) return;
    setFiles(prev => ({ ...prev, [field]: null }));
    if (fileInputRefs[field]?.current) {
      fileInputRefs[field].current.value = '';
    }
  };

  const handleStartUpload = async () => {
    // Validation
    if (!metadata.tittle.trim()) {
      setErrorMessage(t('multimedia.regularUploadModal.validationTitle', null, 'Judul Track/Sesi (tittle) wajib diisi'));
      return;
    }
    if (!files.lamp && !files.video && !files.music && !files.cover_album) {
      setErrorMessage(t('multimedia.regularUploadModal.validationFile', null, 'Pilih setidaknya salah satu file multimedia untuk diunggah'));
      return;
    }

    setErrorMessage('');
    setIsUploading(true);
    setUploadPhase('auth');
    setStatusMessage(t('multimedia.regularUploadModal.authStatus', null, 'Mengautentikasi ke Master API...'));
    isCancelledRef.current = false;

    // Calculate total size
    let grandTotalBytes = 0;
    const selectedFields = [];
    const initialProgressMap = {};

    ['lamp', 'video', 'music', 'cover_album'].forEach(field => {
      const f = files[field];
      if (f) {
        grandTotalBytes += f.size;
        selectedFields.push({ field, file: f });
        initialProgressMap[field] = {
          progress: 0,
          uploadedBytes: 0,
          totalBytes: f.size,
          status: 'uploading'
        };
      }
    });

    setTotalBytesToUpload(grandTotalBytes);
    setFileProgressMap(initialProgressMap);
    setServerS3Progress({
      status: 'idle',
      overallPercent: 0,
      totalSize: grandTotalBytes,
      totalLoaded: 0,
      message: t('multimedia.regularUploadModal.waitingServer', null, 'Menunggu respon server...'),
      files: []
    });

    try {
      // 1. Fetch cached JWT token from backend (super fast ~100ms)
      const authData = await fetchMasterTokenApi();
      if (isCancelledRef.current) return;

      // 2. Build FormData with files and metadata
      const formData = new FormData();
      if (files.lamp) formData.append('lamp', files.lamp);
      if (files.video) formData.append('video', files.video);
      if (files.music) formData.append('music', files.music);
      if (files.cover_album) formData.append('cover_album', files.cover_album);

      formData.append('tittle', metadata.tittle.trim());
      formData.append('artist', metadata.artist.trim());
      formData.append('album', metadata.album.trim());
      formData.append('IsShowAtCustom', metadata.IsShowAtCustom || 'show');

      // 3. Start direct single-hop upload directly to Master API & AWS S3 with SSE progress
      setUploadPhase('uploading_server');
      setStatusMessage(t('multimedia.regularUploadModal.uploadingToServer', { size: formatBytes(grandTotalBytes) }, `Mengirim ${formatBytes(grandTotalBytes)} langsung ke Master API...`));

      const uploadStartTime = Date.now();
      let lastRenderTime = 0;

      const result = await uploadDirectToMasterApi(
        formData,
        authData.token,
        authData.masterApiBase,
        // Phase 1: Client Upload onProgress (Browser -> Master Server)
        (loaded, total) => {
          if (isCancelledRef.current) return;
          const now = Date.now();
          if (now - lastRenderTime < 80 && loaded < total) return;
          lastRenderTime = now;

          const currentTotal = total || grandTotalBytes;
          const percent = Math.min(100, Math.round((loaded / currentTotal) * 100));
          const elapsedSec = (now - uploadStartTime) / 1000;
          const speedBytes = elapsedSec > 0 ? loaded / elapsedSec : 0;
          const remainingBytes = currentTotal - loaded;
          const etaSec = speedBytes > 0 ? Math.ceil(remainingBytes / speedBytes) : 0;

          setUploadedBytesTotal(loaded);
          setTotalBytesToUpload(currentTotal);
          setOverallProgress(percent);
          setUploadSpeed(`${formatBytes(speedBytes)}/s`);
          setEtaSeconds(etaSec);

          if (percent < 100) {
            setFileProgressMap(prev => {
              const next = { ...prev };
              selectedFields.forEach(({ field, file }) => {
                const ratio = file.size / grandTotalBytes;
                const approxLoaded = Math.min(file.size, Math.round(loaded * ratio));
                next[field] = {
                  ...next[field],
                  uploadedBytes: approxLoaded,
                  progress: percent,
                  status: 'uploading'
                };
              });
              return next;
            });
          }
        },
        // Phase 2: Master Server SSE onServerProgress (Master Server -> AWS S3)
        (eventData) => {
          if (isCancelledRef.current || !eventData) return;

          setServerS3Progress({
            status: eventData.status || 'uploading',
            overallPercent: eventData.overallPercent !== undefined ? eventData.overallPercent : (eventData.progress || 0),
            totalSize: eventData.totalSize || grandTotalBytes,
            totalLoaded: eventData.totalLoaded || 0,
            message: eventData.message || '',
            files: eventData.files || []
          });

          if (eventData.status === 'starting') {
            setUploadPhase('uploading_s3');
            setStatusMessage(eventData.message || t('multimedia.regularUploadModal.startingS3', null, 'Master Server mulai mengunggah file ke AWS S3...'));
          } else if (eventData.status === 'uploading') {
            setUploadPhase('uploading_s3');
            setStatusMessage(t('multimedia.regularUploadModal.streamingS3', { pct: eventData.overallPercent || 0 }, `Master Server streaming ke AWS S3 (${eventData.overallPercent || 0}%)...`));

            // Update fileProgressMap with actual S3 progress per file
            if (Array.isArray(eventData.files)) {
              setFileProgressMap(prev => {
                const next = { ...prev };
                eventData.files.forEach(f => {
                  if (next[f.type]) {
                    next[f.type] = {
                      ...next[f.type],
                      uploadedBytes: f.loaded || 0,
                      totalBytes: f.size || next[f.type].totalBytes,
                      progress: f.percent || 0,
                      status: f.status === 'completed' ? 'done' : f.status || 'uploading'
                    };
                  }
                });
                return next;
              });
            }
          } else if (eventData.status === 'processing') {
            setUploadPhase('processing_db');
            setStatusMessage(eventData.message || t('multimedia.regularUploadModal.processingDb', null, 'Master Server memproses hash SHA-256 & mendaftarkan ke Database...'));
            setFileProgressMap(prev => {
              const next = { ...prev };
              Object.keys(next).forEach(k => {
                next[k] = { ...next[k], progress: 100, status: 'done' };
              });
              return next;
            });
          } else if (eventData.status === 'completed') {
            setUploadPhase('completed');
            setStatusMessage(t('multimedia.regularUploadModal.completedMsg', null, 'Multimedia berhasil diunggah dan terdaftar di Master AWS S3 & Database!'));
            setOverallProgress(100);
          }
        },
        (xhr) => {
          activeXhrRef.current = xhr;
        }
      );

      // 4. Finished successfully
      setUploadPhase('completed');
      setStatusMessage(t('multimedia.regularUploadModal.completedDirectMsg', null, 'Multimedia berhasil diunggah langsung ke Master API & AWS S3!'));
      setOverallProgress(100);

      if (onSuccess) {
        onSuccess(result?.data || result);
      }
    } catch (err) {
      if (isCancelledRef.current) return;
      console.error('Error during direct multimedia upload with progress:', err);
      setUploadPhase('error');
      setErrorMessage(err.message || t('multimedia.regularUploadModal.uploadErrorFallback', null, 'Terjadi kesalahan saat mengunggah langsung ke Master API'));
    } finally {
      setIsUploading(false);
      activeXhrRef.current = null;
    }
  };

  const handleCancelUpload = () => {
    if (!isUploading) {
      onClose();
      return;
    }

    if (window.confirm(t('multimedia.regularUploadModal.confirmCancel', null, 'Yakin ingin membatalkan proses upload langsung yang sedang berlangsung?'))) {
      isCancelledRef.current = true;
      if (activeXhrRef.current) {
        activeXhrRef.current.abort();
      }
      setIsUploading(false);
      setUploadPhase('idle');
      setStatusMessage(t('multimedia.regularUploadModal.uploadCancelled', null, 'Upload dibatalkan.'));
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-950/80 backdrop-blur-md overflow-y-auto animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl bg-slate-900/95 border border-cyan-500/30 rounded-3xl shadow-2xl shadow-cyan-950/60 overflow-hidden my-8 flex flex-col max-h-[90vh]">

        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-cyan-500/20 bg-gradient-to-r from-slate-900 via-slate-900 to-cyan-950/30">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
              <UploadCloud size={22} className="animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-black text-white">{t('multimedia.regularUploadModal.title', null, 'Upload Master Multimedia')}</h3>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 flex items-center gap-1">
                  <Sparkles size={10} /> {t('multimedia.regularUploadModal.subtitle', null, 'Direct Master API (Single-Hop)')}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                {t('multimedia.regularUploadModal.desc', null, 'Mengunggah langsung dari browser ke Master API (/multimedia/upload-with-progress) dengan pantauan SSE real-time.')}
              </p>
            </div>
          </div>

          <button
            onClick={handleCloseModal}
            disabled={uploadPhase === 'processing_db'}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/80 transition-all cursor-pointer disabled:opacity-40"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Content Scroll Area */}
        <div className="p-6 overflow-y-auto space-y-6 custom-scrollbar flex-1">

          {/* Error Banner */}
          {errorMessage && (
            <div className="p-4 rounded-2xl bg-rose-500/15 border border-rose-500/40 text-rose-300 text-xs flex items-start gap-3 animate-in shake">
              <AlertCircle size={18} className="shrink-0 mt-0.5 text-rose-400" />
              <div className="flex-1">
                <p className="font-bold">{t('multimedia.regularUploadModal.errTitle', null, 'Gagal Mengunggah Multimedia')}</p>
                <p className="mt-0.5 text-rose-200">{errorMessage}</p>
              </div>
            </div>
          )}

          {/* Success Banner */}
          {uploadPhase === 'completed' && (
            <div className="p-5 rounded-2xl bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 text-xs flex items-start gap-3.5 animate-in zoom-in-95">
              <CheckCircle2 size={22} className="shrink-0 text-emerald-400" />
              <div className="flex-1">
                <p className="font-black text-sm text-emerald-200">{t('multimedia.regularUploadModal.successTitle', null, 'Upload Berhasil & Terintegrasi!')}</p>
                <p className="mt-1 text-emerald-300/90">{statusMessage}</p>
                <p className="mt-2 text-[11px] text-emerald-400">{t('multimedia.regularUploadModal.successNotice', null, 'Direktori AWS S3 & Master DB telah diperbarui secara otomatis.')}</p>
              </div>
            </div>
          )}

          {/* Active Uploading Dashboard Meter */}
          {(isUploading || uploadPhase === 'completed') && (
            <div className="p-5 rounded-2xl bg-slate-950/80 border border-cyan-500/30 space-y-4">
              <style>{`
                @keyframes snailCrawl {
                  0% { transform: translateX(-4px) translateY(0px) scaleX(1); }
                  25% { transform: translateX(0px) translateY(-2px) scaleX(1.05); }
                  50% { transform: translateX(4px) translateY(0px) scaleX(1); }
                  75% { transform: translateX(1px) translateY(-1px) scaleX(0.98); }
                  100% { transform: translateX(-4px) translateY(0px) scaleX(1); }
                }
                @keyframes flameFlicker {
                  0%, 100% { transform: scale(1) rotate(-2deg); filter: drop-shadow(0 0 6px #f97316); }
                  25% { transform: scale(1.22) rotate(4deg); filter: drop-shadow(0 0 14px #ef4444); }
                  50% { transform: scale(0.92) rotate(-3deg); filter: drop-shadow(0 0 8px #eab308); }
                  75% { transform: scale(1.18) rotate(3deg); filter: drop-shadow(0 0 16px #ff5722); }
                }
                .animate-snail-crawl {
                  display: inline-block;
                  animation: snailCrawl 2.2s ease-in-out infinite;
                }
                .animate-flame-flicker {
                  display: inline-block;
                  animation: flameFlicker 0.85s ease-in-out infinite;
                }
              `}</style>

              {/* Stage Flow Indicator */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pb-2">

                {/* Step 1: Browser to Master Server */}
                <div className={`p-3 rounded-xl border flex items-center gap-3 transition-all ${uploadPhase === 'uploading_server'
                  ? 'bg-amber-950/30 border-amber-500/50 shadow-md shadow-amber-950/40 ring-1 ring-amber-500/30'
                  : overallProgress >= 100 || uploadPhase === 'uploading_s3' || uploadPhase === 'processing_db' || uploadPhase === 'completed'
                    ? 'bg-emerald-950/30 border-emerald-500/40 text-emerald-300'
                    : 'bg-slate-900/40 border-slate-800 text-slate-500'
                  }`}>
                  <div className={`p-2 rounded-lg flex items-center justify-center min-w-[34px] min-h-[34px] ${overallProgress >= 100 || uploadPhase === 'uploading_s3' || uploadPhase === 'processing_db' || uploadPhase === 'completed'
                    ? 'bg-emerald-500/20 text-emerald-400'
                    : uploadPhase === 'uploading_server'
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                      : 'bg-slate-800 text-slate-400'
                    }`}>
                    {overallProgress >= 100 || uploadPhase === 'uploading_s3' || uploadPhase === 'processing_db' || uploadPhase === 'completed' ? (
                      <CheckCircle2 size={18} className="text-emerald-400" />
                    ) : uploadPhase === 'uploading_server' ? (
                      <span className="animate-snail-crawl text-lg select-none" role="img" aria-label="Siput">🐌</span>
                    ) : (
                      <UploadCloud size={18} />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[11px] font-bold text-white flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        {t('multimedia.regularUploadModal.stage1Title', null, 'Tahap 1: Upload ke Master Server')}
                      </span>
                      <span className="font-mono text-cyan-400">{overallProgress}%</span>
                    </div>
                    <p className="text-[10px] text-slate-400 truncate mt-0.5">
                      {formatBytes(uploadedBytesTotal)} / {formatBytes(totalBytesToUpload)} ({uploadSpeed})
                    </p>
                  </div>
                </div>

                {/* Step 2: Master Server to AWS S3 & DB */}
                <div className={`p-3 rounded-xl border flex items-center gap-3 transition-all ${uploadPhase === 'uploading_s3' || uploadPhase === 'processing_db'
                  ? 'bg-orange-950/40 border-orange-500/60 shadow-lg shadow-orange-950/50 ring-1 ring-orange-500/40'
                  : uploadPhase === 'completed'
                    ? 'bg-emerald-950/30 border-emerald-500/40 text-emerald-300'
                    : 'bg-slate-900/40 border-slate-800 text-slate-500'
                  }`}>
                  <div className={`p-2 rounded-lg flex items-center justify-center min-w-[34px] min-h-[34px] ${uploadPhase === 'completed'
                    ? 'bg-emerald-500/20 text-emerald-400'
                    : uploadPhase === 'uploading_s3' || uploadPhase === 'processing_db'
                      ? 'bg-orange-500/20 text-orange-400 border border-orange-500/40 shadow-inner'
                      : 'bg-slate-800 text-slate-400'
                    }`}>
                    {uploadPhase === 'completed' ? (
                      <CheckCircle2 size={18} className="text-emerald-400" />
                    ) : uploadPhase === 'uploading_s3' || uploadPhase === 'processing_db' ? (
                      <span className="animate-flame-flicker text-lg select-none" role="img" aria-label="Api">🔥</span>
                    ) : (
                      <Server size={18} />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[11px] font-bold text-white flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        {t('multimedia.regularUploadModal.stage2Title', null, 'Tahap 2: Stream AWS S3 & DB')}
                      </span>
                      <span className="font-mono text-orange-400">
                        {uploadPhase === 'completed' ? '100%' : `${serverS3Progress.overallPercent}%`}
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-400 truncate mt-0.5">
                      {serverS3Progress.message || (uploadPhase === 'completed' ? t('multimedia.regularUploadModal.savedS3Db', null, 'Tersimpan di S3 & DB') : t('multimedia.regularUploadModal.waitingData', null, 'Menunggu data...'))}
                    </p>
                  </div>
                </div>

              </div>

              {/* Status Message Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  {uploadPhase === 'completed' ? (
                    <CheckCircle2 size={18} className="text-emerald-400" />
                  ) : (
                    <Loader2 size={18} className="animate-spin text-cyan-400" />
                  )}
                  <span className="text-xs font-bold text-slate-200">{statusMessage}</span>
                </div>
                <span className="text-sm font-black text-cyan-400 font-mono shrink-0 whitespace-nowrap">
                  {uploadPhase === 'uploading_s3' || uploadPhase === 'processing_db'
                    ? t('multimedia.regularUploadModal.s3StreamLabel', { pct: serverS3Progress.overallPercent }, `S3 Stream: ${serverS3Progress.overallPercent}%`)
                    : `${overallProgress}% (${formatBytes(uploadedBytesTotal)} / ${formatBytes(totalBytesToUpload)})`}
                </span>
              </div>

              {/* Main Progress Bar */}
              <div className="w-full h-3 bg-slate-900 rounded-full overflow-hidden border border-slate-800 relative">
                <div
                  className={`h-full transition-all duration-300 ${uploadPhase === 'completed'
                    ? 'bg-gradient-to-r from-emerald-500 to-teal-400'
                    : uploadPhase === 'uploading_s3' || uploadPhase === 'processing_db'
                      ? 'bg-gradient-to-r from-indigo-500 via-purple-500 to-cyan-400'
                      : 'bg-gradient-to-r from-cyan-500 via-sky-400 to-indigo-500'
                    }`}
                  style={{
                    width: `${uploadPhase === 'uploading_s3' || uploadPhase === 'processing_db'
                      ? serverS3Progress.overallPercent
                      : overallProgress
                      }%`
                  }}
                />
              </div>

              {/* Metrics Bar */}
              <div className="grid grid-cols-3 gap-3 pt-1 text-[11px] font-mono">
                <div className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center gap-2 text-slate-300">
                  <Gauge size={14} className="text-cyan-400 shrink-0" />
                  <div>
                    <div className="text-[9px] text-slate-500 uppercase font-sans">{t('multimedia.regularUploadModal.clientSpeed', null, 'Kecepatan Client')}</div>
                    <div className="font-bold text-cyan-300">{uploadSpeed}</div>
                  </div>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center gap-2 text-slate-300">
                  <Clock size={14} className="text-amber-400 shrink-0" />
                  <div>
                    <div className="text-[9px] text-slate-500 uppercase font-sans">{t('multimedia.regularUploadModal.eta', null, 'Sisa Waktu (ETA)')}</div>
                    <div className="font-bold text-amber-300">{formatDuration(etaSeconds)}</div>
                  </div>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center gap-2 text-slate-300">
                  <HardDrive size={14} className="text-purple-400 shrink-0" />
                  <div>
                    <div className="text-[9px] text-slate-500 uppercase font-sans">{t('multimedia.regularUploadModal.uploadPath', null, 'Jalur Upload')}</div>
                    <div className="font-bold text-purple-300 truncate">{t('multimedia.regularUploadModal.directMasterS3', null, 'Direct Master S3')}</div>
                  </div>
                </div>
              </div>

              {/* Per-File Progress Items */}
              <div className="space-y-2 pt-2 border-t border-slate-800/80">
                {Object.entries(fileProgressMap).map(([field, p]) => (
                  <div key={field} className="flex items-center justify-between gap-3 text-xs bg-slate-900/40 p-2.5 rounded-xl border border-slate-800/50">
                    <span className="font-bold text-slate-300 uppercase tracking-wider text-[10px] w-10 shrink-0 flex items-center gap-1.5">
                      {field === 'lamp' ? 'STROBE' : field === 'video' ? 'VIDEO' : field === 'music' ? 'MUSIC' : 'COVER'}
                      {p.status === 'done' && <CheckCircle2 size={12} className="text-emerald-400" />}
                    </span>
                    <div className="flex-1 h-2 bg-slate-800 rounded-full overflow-hidden min-w-[60px]">
                      <div
                        className={`h-full transition-all duration-200 ${p.status === 'done' ? 'bg-emerald-400' : 'bg-cyan-400'
                          }`}
                        style={{ width: `${p.progress}%` }}
                      />
                    </div>
                    <div className="flex items-center gap-2 shrink-0 font-mono text-[10px] text-right whitespace-nowrap">
                      <span className="text-slate-400">
                        {formatBytes(p.uploadedBytes)} / {formatBytes(p.totalBytes)}
                      </span>
                      <span className={`font-bold min-w-[42px] text-right ${p.status === 'done' ? 'text-emerald-400' : 'text-cyan-300'}`}>
                        ({p.progress}%)
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Processing Notice */}
              {uploadPhase === 'processing_db' && (
                <div className="p-3.5 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 text-indigo-200 text-xs flex items-center gap-2.5 animate-in fade-in">
                  <Loader2 size={16} className="animate-spin text-indigo-400 shrink-0" />
                  <div>
                    <span className="font-bold">{t('multimedia.regularUploadModal.hashingNoticeTitle', null, 'Menghitung Hash SHA-256 & Registrasi Master Database...')}</span>
                    <p className="text-[11px] text-indigo-300/80 mt-0.5">{t('multimedia.regularUploadModal.hashingNoticeDesc', null, 'Semua file telah berhasil sampai di AWS S3. Master backend sedang menyelesaikan registrasi katalog.')}</p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Section 1: Metadata Inputs */}
          <div className="space-y-4">
            <h4 className="text-xs font-black uppercase tracking-wider text-cyan-400 flex items-center gap-2">
              <Layers size={14} /> {t('multimedia.regularUploadModal.metadataSection', null, 'Metadata Konten Multimedia')}
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Title (tittle) */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300 flex items-center gap-1">
                  {t('multimedia.regularUploadModal.trackTitleLabel', null, 'Judul Track/Sesi (tittle)')} <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  disabled={isUploading}
                  value={metadata.tittle}
                  onChange={e => setMetadata({ ...metadata, tittle: e.target.value })}
                  placeholder={t('multimedia.regularUploadModal.trackTitlePlaceholder', null, 'Misal: Deep Relaxation 5.2')}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 disabled:opacity-50 font-medium"
                />
              </div>

              {/* Artist */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300">
                  {t('multimedia.regularUploadModal.artistLabel', null, 'Artis (artist)')}
                </label>
                <input
                  type="text"
                  disabled={isUploading}
                  value={metadata.artist}
                  onChange={e => setMetadata({ ...metadata, artist: e.target.value })}
                  placeholder={t('multimedia.regularUploadModal.artistPlaceholder', null, 'Misal: Regenesis Audio Team')}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 disabled:opacity-50 font-medium"
                />
              </div>

              {/* Album */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300">
                  {t('multimedia.regularUploadModal.albumLabel', null, 'Album / Kategori (album)')}
                </label>
                <input
                  type="text"
                  disabled={isUploading}
                  value={metadata.album}
                  onChange={e => setMetadata({ ...metadata, album: e.target.value })}
                  placeholder={t('multimedia.regularUploadModal.albumPlaceholder', null, 'Misal: Wellness & Biohack')}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 disabled:opacity-50 font-medium"
                />
              </div>

              {/* IsShowAtCustom */}
              <div className="space-y-1.5 sm:col-span-2 lg:col-span-3 pt-1">
                <label className="text-xs font-bold text-slate-300">
                  {t('multimedia.regularUploadModal.customMenuLabel', null, 'Tampilkan di Menu Custom Pod (IsShowAtCustom)')}
                </label>
                <div className="flex items-center gap-4 pt-1">
                  <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-300 hover:text-white">
                    <input
                      type="radio"
                      name="IsShowAtCustom"
                      disabled={isUploading}
                      value="show"
                      checked={metadata.IsShowAtCustom === 'show'}
                      onChange={e => setMetadata({ ...metadata, IsShowAtCustom: e.target.value })}
                      className="accent-cyan-500 cursor-pointer"
                    />
                    <span>{t('multimedia.regularUploadModal.showOption', null, 'Tampilkan (show)')}</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-300 hover:text-white">
                    <input
                      type="radio"
                      name="IsShowAtCustom"
                      disabled={isUploading}
                      value="hide"
                      checked={metadata.IsShowAtCustom === 'hide'}
                      onChange={e => setMetadata({ ...metadata, IsShowAtCustom: e.target.value })}
                      className="accent-cyan-500 cursor-pointer"
                    />
                    <span>{t('multimedia.regularUploadModal.hideOption', null, 'Sembunyikan (hide)')}</span>
                  </label>
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: 4 File Dropzones */}
          <div className="space-y-4 pt-2">
            <h4 className="text-xs font-black uppercase tracking-wider text-cyan-400 flex items-center gap-2">
              <UploadCloud size={14} /> {t('multimedia.regularUploadModal.filesSection', null, 'Berkas File Multimedia (Maks 10 GB)')}
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

              {/* 1. Lamp (Strobe WAV) */}
              <div
                onClick={() => !isUploading && fileInputRefs.lamp.current?.click()}
                className={`p-4 rounded-2xl border transition-all cursor-pointer relative ${files.lamp
                  ? 'bg-amber-500/10 border-amber-500/40 text-amber-300 shadow-md'
                  : 'bg-slate-950/60 border-slate-800 hover:border-amber-500/30 hover:bg-slate-900/60'
                  }`}
              >
                <input
                  type="file"
                  ref={fileInputRefs.lamp}
                  disabled={isUploading}
                  onChange={e => handleFileChange('lamp', e.target.files?.[0])}
                  className="hidden"
                  accept=".wav,.bin,.hex,audio/*"
                />
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className="p-2.5 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 mt-0.5">
                      <Zap size={18} />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-white flex items-center gap-1.5">
                        <span>{t('multimedia.regularUploadModal.strobeTitle', null, 'Lamp / Strobe Sync (lamp)')}</span>
                        {files.lamp && <CheckCircle2 size={13} className="text-emerald-400" />}
                      </div>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        {t('multimedia.regularUploadModal.strobeDesc', null, 'File WAV sinyal lighting/strobe session')}
                      </p>
                      {files.lamp ? (
                        <div className="mt-2 text-xs font-mono font-bold text-amber-300 flex items-center gap-1.5 bg-amber-500/20 px-2 py-1 rounded-lg">
                          <span className="truncate max-w-[200px]">{files.lamp.name}</span>
                          <span className="text-[10px] text-amber-200">({formatBytes(files.lamp.size)})</span>
                        </div>
                      ) : (
                        <div className="mt-2 text-[11px] text-slate-500 flex items-center gap-1">
                          <UploadCloud size={12} /> {t('multimedia.regularUploadModal.strobePrompt', null, 'Klik untuk pilih file .wav')}
                        </div>
                      )}
                    </div>
                  </div>

                  {files.lamp && !isUploading && (
                    <button
                      onClick={e => handleRemoveFile('lamp', e)}
                      className="p-1 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-all"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              </div>

              {/* 2. Video (Footage MP4) */}
              <div
                onClick={() => !isUploading && fileInputRefs.video.current?.click()}
                className={`p-4 rounded-2xl border transition-all cursor-pointer relative ${files.video
                  ? 'bg-rose-500/10 border-rose-500/40 text-rose-300 shadow-md'
                  : 'bg-slate-950/60 border-slate-800 hover:border-rose-500/30 hover:bg-slate-900/60'
                  }`}
              >
                <input
                  type="file"
                  ref={fileInputRefs.video}
                  disabled={isUploading}
                  onChange={e => handleFileChange('video', e.target.files?.[0])}
                  className="hidden"
                  accept="video/*,.mp4,.mov,.mkv"
                />
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className="p-2.5 rounded-xl bg-rose-500/20 text-rose-400 border border-rose-500/30 mt-0.5">
                      <FileVideo size={18} />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-white flex items-center gap-1.5">
                        <span>{t('multimedia.regularUploadModal.videoTitle', null, 'Video Footage (video)')}</span>
                        {files.video && <CheckCircle2 size={13} className="text-emerald-400" />}
                      </div>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        {t('multimedia.regularUploadModal.videoDesc', null, 'File MP4 footage resolusi tinggi / 4K')}
                      </p>
                      {files.video ? (
                        <div className="mt-2 text-xs font-mono font-bold text-rose-300 flex items-center gap-1.5 bg-rose-500/20 px-2 py-1 rounded-lg">
                          <span className="truncate max-w-[200px]">{files.video.name}</span>
                          <span className="text-[10px] text-rose-200">({formatBytes(files.video.size)})</span>
                        </div>
                      ) : (
                        <div className="mt-2 text-[11px] text-slate-500 flex items-center gap-1">
                          <UploadCloud size={12} /> {t('multimedia.regularUploadModal.videoPrompt', null, 'Klik untuk pilih file .mp4')}
                        </div>
                      )}
                    </div>
                  </div>

                  {files.video && !isUploading && (
                    <button
                      onClick={e => handleRemoveFile('video', e)}
                      className="p-1 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-all"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              </div>

              {/* 3. Music (Audio WAV) */}
              <div
                onClick={() => !isUploading && fileInputRefs.music.current?.click()}
                className={`p-4 rounded-2xl border transition-all cursor-pointer relative ${files.music
                  ? 'bg-cyan-500/10 border-cyan-500/40 text-cyan-300 shadow-md'
                  : 'bg-slate-950/60 border-slate-800 hover:border-cyan-500/30 hover:bg-slate-900/60'
                  }`}
              >
                <input
                  type="file"
                  ref={fileInputRefs.music}
                  disabled={isUploading}
                  onChange={e => handleFileChange('music', e.target.files?.[0])}
                  className="hidden"
                  accept="audio/*,.wav,.mp3,.flac"
                />
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className="p-2.5 rounded-xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 mt-0.5">
                      <Music size={18} />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-white flex items-center gap-1.5">
                        <span>{t('multimedia.regularUploadModal.musicTitle', null, 'Audio Sesi Musik (music)')}</span>
                        {files.music && <CheckCircle2 size={13} className="text-emerald-400" />}
                      </div>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        {t('multimedia.regularUploadModal.musicDesc', null, 'File WAV musik suara master / sesi audio')}
                      </p>
                      {files.music ? (
                        <div className="mt-2 text-xs font-mono font-bold text-cyan-300 flex items-center gap-1.5 bg-cyan-500/20 px-2 py-1 rounded-lg">
                          <span className="truncate max-w-[200px]">{files.music.name}</span>
                          <span className="text-[10px] text-cyan-200">({formatBytes(files.music.size)})</span>
                        </div>
                      ) : (
                        <div className="mt-2 text-[11px] text-slate-500 flex items-center gap-1">
                          <UploadCloud size={12} /> {t('multimedia.regularUploadModal.musicPrompt', null, 'Klik untuk pilih file .wav')}
                        </div>
                      )}
                    </div>
                  </div>

                  {files.music && !isUploading && (
                    <button
                      onClick={e => handleRemoveFile('music', e)}
                      className="p-1 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-all"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              </div>

              {/* 4. Cover Album (Image) */}
              <div
                onClick={() => !isUploading && fileInputRefs.cover_album.current?.click()}
                className={`p-4 rounded-2xl border transition-all cursor-pointer relative ${files.cover_album
                  ? 'bg-purple-500/10 border-purple-500/40 text-purple-300 shadow-md'
                  : 'bg-slate-950/60 border-slate-800 hover:border-purple-500/30 hover:bg-slate-900/60'
                  }`}
              >
                <input
                  type="file"
                  ref={fileInputRefs.cover_album}
                  disabled={isUploading}
                  onChange={e => handleFileChange('cover_album', e.target.files?.[0])}
                  className="hidden"
                  accept="image/*,.jpg,.jpeg,.png,.webp"
                />
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    {coverPreviewUrl ? (
                      <img
                        src={coverPreviewUrl}
                        alt="Cover Preview"
                        className="w-11 h-11 rounded-xl object-cover border border-purple-500/40 shadow-sm mt-0.5"
                      />
                    ) : (
                      <div className="p-2.5 rounded-xl bg-purple-500/20 text-purple-400 border border-purple-500/30 mt-0.5">
                        <ImageIcon size={18} />
                      </div>
                    )}
                    <div>
                      <div className="text-xs font-bold text-white flex items-center gap-1.5">
                        <span>{t('multimedia.regularUploadModal.coverTitle', null, 'Cover Album Visual (cover_album)')}</span>
                        {files.cover_album && <CheckCircle2 size={13} className="text-emerald-400" />}
                      </div>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        {t('multimedia.regularUploadModal.coverDesc', null, 'File JPG / PNG sampul thumbnail album')}
                      </p>
                      {files.cover_album ? (
                        <div className="mt-2 text-xs font-mono font-bold text-purple-300 flex items-center gap-1.5 bg-purple-500/20 px-2 py-1 rounded-lg">
                          <span className="truncate max-w-[200px]">{files.cover_album.name}</span>
                          <span className="text-[10px] text-purple-200">({formatBytes(files.cover_album.size)})</span>
                        </div>
                      ) : (
                        <div className="mt-2 text-[11px] text-slate-500 flex items-center gap-1">
                          <UploadCloud size={12} /> {t('multimedia.regularUploadModal.coverPrompt', null, 'Klik untuk pilih cover .jpg / .png')}
                        </div>
                      )}
                    </div>
                  </div>

                  {files.cover_album && !isUploading && (
                    <button
                      onClick={e => handleRemoveFile('cover_album', e)}
                      className="p-1 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-all"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              </div>

            </div>
          </div>

        </div>

        {/* Modal Footer Controls */}
        <div className="px-6 py-4 border-t border-cyan-500/20 bg-slate-950/80 flex items-center justify-between gap-4">
          <div className="text-[11px] text-slate-400 flex items-center gap-2">
            <Sparkles size={13} className="text-cyan-400" />
            <span>{t('multimedia.regularUploadModal.footerNotice', null, 'Direct Upload Single-Hop aktif — Tanpa antrean disk backend lokal')}</span>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleCloseModal}
              disabled={uploadPhase === 'processing_db'}
              className="px-4 py-2 rounded-xl text-xs font-bold text-slate-300 bg-slate-800/80 hover:bg-slate-800 hover:text-white border border-slate-700 transition-all cursor-pointer disabled:opacity-40"
            >
              {uploadPhase === 'completed' ? t('multimedia.regularUploadModal.close', null, 'Tutup') : t('multimedia.regularUploadModal.cancel', null, 'Batal')}
            </button>

            {uploadPhase === 'completed' ? (
              <button
                onClick={handleCloseModal}
                className="px-5 py-2 rounded-xl text-xs font-bold text-slate-950 bg-emerald-400 hover:bg-emerald-300 transition-all cursor-pointer flex items-center gap-1.5 shadow-lg shadow-emerald-500/20"
              >
                <CheckCircle2 size={15} /> {t('multimedia.regularUploadModal.finishAndReturn', null, 'Selesai & Kembali')}
              </button>
            ) : (
              <button
                onClick={handleStartUpload}
                disabled={isUploading}
                className="px-5 py-2 rounded-xl text-xs font-bold text-slate-950 bg-gradient-to-r from-cyan-400 via-teal-300 to-emerald-400 hover:from-cyan-300 hover:to-emerald-300 transition-all cursor-pointer flex items-center gap-2 shadow-lg shadow-cyan-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isUploading ? (
                  <>
                    <Loader2 size={15} className="animate-spin text-slate-950" />
                    <span>{t('multimedia.regularUploadModal.uploadingBtn', null, 'Mengunggah Berkas...')}</span>
                  </>
                ) : (
                  <>
                    <UploadCloud size={15} />
                    <span>{t('multimedia.regularUploadModal.startUploadBtn', null, 'Mulai Upload Multimedia')}</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
