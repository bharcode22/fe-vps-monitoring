import React, { useState, useRef, useEffect } from 'react';
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
  ArrowRight,
  RefreshCw,
  Eye,
  Trash2,
  Server,
  Cpu
} from 'lucide-react';
import {
  uploadMultimediaChunkApi,
  completeMultimediaUploadApi,
  cancelMultimediaUploadApi,
  fetchMasterTokenApi,
  uploadDirectToMasterApi
} from '../../api/vpsApi';
import io from 'socket.io-client';
import { SOCKET_URL } from '../../config';

const MAX_CHUNK_SIZE = 64 * 1024 * 1024; // 64 MB per chunk (Maximized throughput untuk backend server langsung)
const CONCURRENCY_LIMIT = 4; // 4 worker paralel simultan

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

  // Upload Method: 'chunk_backend' (Maximized 64MB Chunk) | 'direct_master' (Direct Master API)
  const [uploadMethod, setUploadMethod] = useState('chunk_backend');

  // Upload Engine State
  const [isUploading, setIsUploading] = useState(false);
  const [uploadPhase, setUploadPhase] = useState('idle'); // 'idle' | 'auth' | 'uploading_server' | 'assembling' | 'uploading_s3' | 'processing_db' | 'completed' | 'error'
  const [statusMessage, setStatusMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  // Client-to-Server Progress Metrics
  const [overallProgress, setOverallProgress] = useState(0);
  const [uploadedBytesTotal, setUploadedBytesTotal] = useState(0);
  const [totalBytesToUpload, setTotalBytesToUpload] = useState(0);
  const [uploadSpeed, setUploadSpeed] = useState('0 MB/s');
  const [etaSeconds, setEtaSeconds] = useState(0);

  // Server-to-S3 Progress State
  const [serverS3Progress, setServerS3Progress] = useState({
    status: 'idle',
    stage: 'idle',
    stageTitle: '',
    overallPercent: 0,
    totalSize: 0,
    totalLoaded: 0,
    message: '',
    files: []
  });

  // Per-file detailed progress
  const [fileProgressMap, setFileProgressMap] = useState({});

  // Refs for tracking active upload state
  const isCancelledRef = useRef(false);
  const activeSessionIdRef = useRef(null);
  const activeXhrRef = useRef(null);
  const fileInputRefs = {
    lamp: useRef(null),
    video: useRef(null),
    music: useRef(null),
    cover_album: useRef(null)
  };

  // Socket.IO Listener for Backend Progress
  useEffect(() => {
    if (!isOpen) return;

    const socket = io(SOCKET_URL, {
      transports: ['websocket', 'polling']
    });

    socket.on('multimedia_backend_progress', (data) => {
      if (!data) return;
      if (activeSessionIdRef.current && data.uploadSessionId && data.uploadSessionId !== activeSessionIdRef.current) {
        return;
      }

      setServerS3Progress({
        status: data.stage || 'uploading',
        stage: data.stage || '',
        stageTitle: data.stageTitle || '',
        overallPercent: data.progress !== undefined ? data.progress : 0,
        totalSize: 0,
        totalLoaded: 0,
        message: data.message || '',
        files: data.files || []
      });

      if (data.stage === 'merging') {
        setUploadPhase('assembling');
        setStatusMessage(data.message || 'Server sedang menggabungkan potongan file (chunk)...');
      } else if (data.stage === 'dispatching' || data.stage === 's3_streaming') {
        setUploadPhase('uploading_s3');
        setStatusMessage(data.message || 'Server sedang streaming file ke Master AWS S3...');
      } else if (data.stage === 'processing') {
        setUploadPhase('processing_db');
        setStatusMessage(data.message || 'Menghitung hash SHA-256 & mendaftarkan ke Database...');
      } else if (data.stage === 'completed') {
        setUploadPhase('completed');
        setStatusMessage(data.message || 'Multimedia berhasil diunggah dan terdaftar di Master AWS S3 & Database!');
        setOverallProgress(100);
      } else if (data.stage === 'error') {
        setErrorMessage(data.message || 'Terjadi kesalahan saat memproses di backend');
      }
    });

    return () => {
      socket.disconnect();
    };
  }, [isOpen]);

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
        stage: 'idle',
        stageTitle: '',
        overallPercent: 0,
        totalSize: 0,
        totalLoaded: 0,
        message: '',
        files: []
      });
      isCancelledRef.current = false;
      activeSessionIdRef.current = null;
      activeXhrRef.current = null;
    }
  }, [isOpen]);

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
      setErrorMessage('Judul Track/Sesi (tittle) wajib diisi');
      return;
    }
    if (!files.lamp && !files.video && !files.music && !files.cover_album) {
      setErrorMessage('Pilih setidaknya salah satu file multimedia untuk diunggah');
      return;
    }

    setErrorMessage('');
    setIsUploading(true);
    isCancelledRef.current = false;

    // Calculate total size
    let grandTotalBytes = 0;
    const selectedFields = [];
    const initialProgressMap = {};
    const allChunkTasks = [];
    const filesManifest = {};

    ['lamp', 'video', 'music', 'cover_album'].forEach(field => {
      const f = files[field];
      if (f) {
        grandTotalBytes += f.size;
        const totalChunks = Math.ceil(f.size / MAX_CHUNK_SIZE);
        selectedFields.push({ field, file: f, totalChunks });

        filesManifest[field] = {
          filename: f.name,
          totalChunks,
          size: f.size
        };

        initialProgressMap[field] = {
          progress: 0,
          currentChunk: 0,
          totalChunks,
          uploadedBytes: 0,
          totalBytes: f.size,
          status: 'uploading'
        };

        for (let chunkIdx = 0; chunkIdx < totalChunks; chunkIdx++) {
          const start = chunkIdx * MAX_CHUNK_SIZE;
          const end = Math.min(start + MAX_CHUNK_SIZE, f.size);
          const chunkBlob = f.slice(start, end);

          allChunkTasks.push({
            id: `${field}_${chunkIdx}`,
            field,
            file: f,
            chunkIdx,
            totalChunks,
            chunkBlob,
            chunkSize: chunkBlob.size
          });
        }
      }
    });

    setTotalBytesToUpload(grandTotalBytes);
    setFileProgressMap(initialProgressMap);

    const sessionId = `up_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    activeSessionIdRef.current = sessionId;

    // ─────────────────────────────────────────────────────────────
    // BRANCH A: Maximized Chunk Upload Engine (64MB Chunk, 4x Concurrency)
    // ─────────────────────────────────────────────────────────────
    if (uploadMethod === 'chunk_backend') {
      setUploadPhase('uploading_server');
      setStatusMessage(`Menyiapkan antrean ${allChunkTasks.length} chunk (64MB per chunk, 4x paralel)...`);

      const taskBytesMap = {};
      allChunkTasks.forEach(t => { taskBytesMap[t.id] = 0; });

      const uploadStartTime = Date.now();
      let lastRenderTime = 0;

      const updateProgressState = (force = false) => {
        const now = Date.now();
        if (!force && now - lastRenderTime < 100) return;
        lastRenderTime = now;

        let globalUploaded = 0;
        const fieldBytesMap = {};
        selectedFields.forEach(({ field }) => { fieldBytesMap[field] = 0; });

        allChunkTasks.forEach(task => {
          const bytes = taskBytesMap[task.id] || 0;
          globalUploaded += bytes;
          if (fieldBytesMap[task.field] !== undefined) {
            fieldBytesMap[task.field] += bytes;
          }
        });

        const elapsedSec = (now - uploadStartTime) / 1000;
        const speedBytesSec = elapsedSec > 0 ? globalUploaded / elapsedSec : 0;
        const speedFormatted = `${formatBytes(speedBytesSec)}/s`;
        const remainingBytes = grandTotalBytes - globalUploaded;
        const remainingSec = speedBytesSec > 0 ? Math.ceil(remainingBytes / speedBytesSec) : 0;

        setUploadedBytesTotal(globalUploaded);
        setOverallProgress(Math.min(100, Math.round((globalUploaded / grandTotalBytes) * 100)));
        setUploadSpeed(speedFormatted);
        setEtaSeconds(remainingSec);

        setFileProgressMap(prev => {
          const next = { ...prev };
          selectedFields.forEach(({ field, file, totalChunks }) => {
            const uploaded = fieldBytesMap[field] || 0;
            const isDone = uploaded >= file.size;
            next[field] = {
              ...next[field],
              uploadedBytes: uploaded,
              progress: Math.min(100, Math.round((uploaded / file.size) * 100)),
              status: isDone ? 'done' : 'uploading'
            };
          });
          return next;
        });
      };

      try {
        let taskCursor = 0;
        let completedCount = 0;
        const totalTasksCount = allChunkTasks.length;

        async function chunkWorker() {
          while (taskCursor < allChunkTasks.length) {
            if (isCancelledRef.current) throw new Error('Upload dibatalkan oleh pengguna');
            const task = allChunkTasks[taskCursor++];

            let attempts = 0;
            let chunkSuccess = false;
            let lastError = null;

            while (attempts < 3 && !chunkSuccess) {
              if (isCancelledRef.current) throw new Error('Upload dibatalkan oleh pengguna');
              try {
                attempts++;
                setStatusMessage(`Mengunggah [${task.field.toUpperCase()}] chunk ${task.chunkIdx + 1}/${task.totalChunks} (64MB) ke backend...`);

                await uploadMultimediaChunkApi(
                  sessionId,
                  task.field,
                  task.chunkIdx,
                  task.totalChunks,
                  task.file.name,
                  task.chunkBlob,
                  (loaded) => {
                    if (isCancelledRef.current) return;
                    taskBytesMap[task.id] = Math.min(loaded, task.chunkSize);
                    updateProgressState();
                  }
                );

                taskBytesMap[task.id] = task.chunkSize;
                chunkSuccess = true;
              } catch (err) {
                lastError = err;
                console.warn(`Retry chunk ${task.chunkIdx + 1} (${task.field}) attempt ${attempts}/3:`, err.message);
                if (attempts < 3) {
                  await new Promise(r => setTimeout(r, 800 * attempts));
                }
              }
            }

            if (!chunkSuccess) {
              throw new Error(`Gagal mengunggah chunk ${task.chunkIdx + 1} untuk ${task.file.name}: ${lastError?.message}`);
            }

            completedCount++;
            updateProgressState(true);
          }
        }

        // Launch 4 concurrent workers
        const activeWorkers = Math.min(CONCURRENCY_LIMIT, allChunkTasks.length);
        const workerPromises = [];
        for (let w = 0; w < activeWorkers; w++) {
          workerPromises.push(chunkWorker());
        }
        await Promise.all(workerPromises);

        updateProgressState(true);

        // Step 2: Trigger backend complete & reassemble
        setUploadPhase('assembling');
        setStatusMessage('Semua chunk 64MB terkirim. Server sedang menggabungkan file...');

        const completeRes = await completeMultimediaUploadApi(
          sessionId,
          {
            tittle: metadata.tittle.trim(),
            artist: metadata.artist.trim(),
            album: metadata.album.trim(),
            file: '',
            IsShowAtCustom: metadata.IsShowAtCustom
          },
          filesManifest
        );

        setUploadPhase('completed');
        setStatusMessage('Multimedia berhasil diunggah dan terdaftar di Master AWS S3 & Database!');
        setOverallProgress(100);

        if (onSuccess) {
          onSuccess(completeRes.data);
        }
      } catch (err) {
        if (isCancelledRef.current) return;
        console.error('Error during chunk upload process:', err);
        setUploadPhase('error');
        setErrorMessage(err.message || 'Terjadi kesalahan saat mengunggah chunk ke server');
      } finally {
        setIsUploading(false);
      }
      return;
    }

    // ─────────────────────────────────────────────────────────────
    // BRANCH B: Direct Upload to Master API with SSE (/upload-with-progress)
    // ─────────────────────────────────────────────────────────────
    setUploadPhase('auth');
    setStatusMessage('Mengautentikasi ke Master API...');

    try {
      const authData = await fetchMasterTokenApi();
      if (isCancelledRef.current) return;

      const formData = new FormData();
      if (files.lamp) formData.append('lamp', files.lamp);
      if (files.video) formData.append('video', files.video);
      if (files.music) formData.append('music', files.music);
      if (files.cover_album) formData.append('cover_album', files.cover_album);

      formData.append('tittle', metadata.tittle.trim());
      formData.append('artist', metadata.artist.trim());
      formData.append('album', metadata.album.trim());
      formData.append('IsShowAtCustom', metadata.IsShowAtCustom || 'show');

      setUploadPhase('uploading_server');
      setStatusMessage(`Mengirim ${formatBytes(grandTotalBytes)} ke Master API Server...`);

      const uploadStartTime = Date.now();
      let lastRenderTime = 0;

      const result = await uploadDirectToMasterApi(
        formData,
        authData.token,
        authData.masterApiBase,
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
        },
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
            setStatusMessage(eventData.message || 'Master Server mulai mengunggah file ke AWS S3...');
          } else if (eventData.status === 'uploading') {
            setUploadPhase('uploading_s3');
            setStatusMessage(`Master Server streaming ke AWS S3 (${eventData.overallPercent || 0}%)...`);
          } else if (eventData.status === 'processing') {
            setUploadPhase('processing_db');
            setStatusMessage(eventData.message || 'Master Server memproses hash SHA-256 & mendaftarkan ke Database...');
          } else if (eventData.status === 'completed') {
            setUploadPhase('completed');
            setStatusMessage('Multimedia berhasil diunggah dan terdaftar di Master AWS S3 & Database!');
            setOverallProgress(100);
          }
        },
        (xhr) => {
          activeXhrRef.current = xhr;
        }
      );

      setUploadPhase('completed');
      setStatusMessage('Multimedia berhasil diunggah langsung ke Master API & AWS S3!');
      setOverallProgress(100);

      if (onSuccess) {
        onSuccess(result?.data || result);
      }
    } catch (err) {
      if (isCancelledRef.current) return;
      console.error('Error during direct multimedia upload with progress:', err);
      setUploadPhase('error');
      setErrorMessage(err.message || 'Terjadi kesalahan saat mengunggah langsung ke Master API');
    } finally {
      setIsUploading(false);
      activeXhrRef.current = null;
    }
  };

  const handleCancelUpload = async () => {
    if (!isUploading) {
      onClose();
      return;
    }

    if (window.confirm('Yakin ingin membatalkan proses upload yang sedang berlangsung?')) {
      isCancelledRef.current = true;
      if (activeXhrRef.current) {
        activeXhrRef.current.abort();
      }
      setIsUploading(false);
      setUploadPhase('idle');
      setStatusMessage('Upload dibatalkan.');
      if (activeSessionIdRef.current) {
        await cancelMultimediaUploadApi(activeSessionIdRef.current).catch(() => {});
      }
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
                <h3 className="text-lg font-black text-white">Upload Master Multimedia</h3>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 flex items-center gap-1">
                  <Sparkles size={10} /> SSE Live Progress Tracking
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Mengunggah langsung ke Master API (/multimedia/upload-with-progress) dengan pantauan S3 real-time.
              </p>
            </div>
          </div>

          <button
            onClick={handleCancelUpload}
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
                <p className="font-bold">Gagal Mengunggah Multimedia</p>
                <p className="mt-0.5 text-rose-200">{errorMessage}</p>
              </div>
            </div>
          )}

          {/* Success Banner */}
          {uploadPhase === 'completed' && (
            <div className="p-5 rounded-2xl bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 text-xs flex items-start gap-3.5 animate-in zoom-in-95">
              <CheckCircle2 size={22} className="shrink-0 text-emerald-400" />
              <div className="flex-1">
                <p className="font-black text-sm text-emerald-200">Upload Berhasil & Terintegrasi!</p>
                <p className="mt-1 text-emerald-300/90">{statusMessage}</p>
                <p className="mt-2 text-[11px] text-emerald-400">Direktori AWS S3 & Master DB telah diperbarui secara otomatis.</p>
              </div>
            </div>
          )}

          {/* Active Uploading Dashboard Meter */}
          {(isUploading || uploadPhase === 'completed') && (
            <div className="p-5 rounded-2xl bg-slate-950/80 border border-cyan-500/30 space-y-4">

              {/* Stage Flow Indicator */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pb-2">

                {/* Step 1: Browser to Server */}
                <div className={`p-3 rounded-xl border flex items-center gap-3 transition-all ${uploadPhase === 'uploading_server'
                  ? 'bg-cyan-950/40 border-cyan-500/50 shadow-md shadow-cyan-950/40'
                  : overallProgress >= 100 || uploadPhase === 'uploading_s3' || uploadPhase === 'processing_db' || uploadPhase === 'completed'
                    ? 'bg-emerald-950/30 border-emerald-500/40 text-emerald-300'
                    : 'bg-slate-900/40 border-slate-800 text-slate-500'
                  }`}>
                  <div className={`p-2 rounded-lg ${overallProgress >= 100 || uploadPhase === 'uploading_s3' || uploadPhase === 'processing_db' || uploadPhase === 'completed'
                    ? 'bg-emerald-500/20 text-emerald-400'
                    : uploadPhase === 'uploading_server'
                      ? 'bg-cyan-500/20 text-cyan-400 animate-pulse'
                      : 'bg-slate-800 text-slate-400'
                    }`}>
                    {overallProgress >= 100 || uploadPhase === 'uploading_s3' || uploadPhase === 'processing_db' || uploadPhase === 'completed' ? (
                      <CheckCircle2 size={16} />
                    ) : (
                      <UploadCloud size={16} />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[11px] font-bold text-white flex items-center justify-between">
                      <span>Tahap 1: Kirim ke Master API</span>
                      <span className="font-mono text-cyan-400">{overallProgress}%</span>
                    </div>
                    <p className="text-[10px] text-slate-400 truncate mt-0.5">
                      {formatBytes(uploadedBytesTotal)} / {formatBytes(totalBytesToUpload)} ({uploadSpeed})
                    </p>
                  </div>
                </div>

                {/* Step 2: Server to AWS S3 */}
                <div className={`p-3 rounded-xl border flex items-center gap-3 transition-all ${uploadPhase === 'uploading_s3' || uploadPhase === 'processing_db'
                  ? 'bg-indigo-950/40 border-indigo-500/50 shadow-md shadow-indigo-950/40'
                  : uploadPhase === 'completed'
                    ? 'bg-emerald-950/30 border-emerald-500/40 text-emerald-300'
                    : 'bg-slate-900/40 border-slate-800 text-slate-500'
                  }`}>
                  <div className={`p-2 rounded-lg ${uploadPhase === 'completed'
                    ? 'bg-emerald-500/20 text-emerald-400'
                    : uploadPhase === 'uploading_s3' || uploadPhase === 'processing_db'
                      ? 'bg-indigo-500/20 text-indigo-400 animate-spin'
                      : 'bg-slate-800 text-slate-400'
                    }`}>
                    {uploadPhase === 'completed' ? (
                      <CheckCircle2 size={16} />
                    ) : uploadPhase === 'uploading_s3' || uploadPhase === 'processing_db' ? (
                      <Loader2 size={16} />
                    ) : (
                      <Server size={16} />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[11px] font-bold text-white flex items-center justify-between">
                      <span>Tahap 2: Stream AWS S3 & DB</span>
                      <span className="font-mono text-indigo-400">
                        {uploadPhase === 'completed' ? '100%' : `${serverS3Progress.overallPercent}%`}
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-400 truncate mt-0.5">
                      {serverS3Progress.message || (uploadPhase === 'completed' ? 'Tersimpan di S3 & DB' : 'Menunggu data...')}
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
                <span className="text-sm font-black text-cyan-400 font-mono">
                  {uploadPhase === 'uploading_s3' || uploadPhase === 'processing_db'
                    ? `S3 Stream: ${serverS3Progress.overallPercent}%`
                    : `${overallProgress}% (${formatBytes(uploadedBytesTotal)} / ${formatBytes(totalBytesToUpload)})`}
                </span>
              </div>

              {/* Main Progress Bar (Switches smoothly between Client Upload and S3 Stream) */}
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
                    <div className="text-[9px] text-slate-500 uppercase font-sans">Kecepatan Client</div>
                    <div className="font-bold text-cyan-300">{uploadSpeed}</div>
                  </div>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center gap-2 text-slate-300">
                  <Clock size={14} className="text-amber-400 shrink-0" />
                  <div>
                    <div className="text-[9px] text-slate-500 uppercase font-sans">Sisa Waktu (ETA)</div>
                    <div className="font-bold text-amber-300">{formatDuration(etaSeconds)}</div>
                  </div>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center gap-2 text-slate-300">
                  <HardDrive size={14} className="text-purple-400 shrink-0" />
                  <div>
                    <div className="text-[9px] text-slate-500 uppercase font-sans">Endpoint Backend</div>
                    <div className="font-bold text-purple-300 truncate">/upload-with-progress</div>
                  </div>
                </div>
              </div>

              {/* Per-File Progress Items */}
              <div className="space-y-2 pt-2 border-t border-slate-800/80">
                {Object.entries(fileProgressMap).map(([field, p]) => (
                  <div key={field} className="flex items-center justify-between gap-3 text-xs bg-slate-900/40 p-2.5 rounded-xl border border-slate-800/50">
                    <span className="font-bold text-slate-300 uppercase tracking-wider text-[10px] w-24 flex items-center gap-1.5">
                      {field === 'lamp' ? '⚡ STROBE' : field === 'video' ? '🎬 VIDEO' : field === 'music' ? '🎵 MUSIC' : '🖼️ COVER'}
                      {p.status === 'done' && <CheckCircle2 size={12} className="text-emerald-400" />}
                    </span>
                    <div className="flex-1 h-2 bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all duration-200 ${p.status === 'done' ? 'bg-emerald-400' : 'bg-cyan-400'
                          }`}
                        style={{ width: `${p.progress}%` }}
                      />
                    </div>
                    <span className="font-mono text-[10px] text-slate-400 w-32 text-right">
                      {formatBytes(p.uploadedBytes)} / {formatBytes(p.totalBytes)} ({p.progress}%)
                    </span>
                  </div>
                ))}
              </div>

              {/* Processing Notice */}
              {uploadPhase === 'processing_db' && (
                <div className="p-3.5 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 text-indigo-200 text-xs flex items-center gap-2.5 animate-in fade-in">
                  <Loader2 size={16} className="animate-spin text-indigo-400 shrink-0" />
                  <div>
                    <span className="font-bold">Menghitung Hash SHA-256 & Registrasi Master Database...</span>
                    <p className="text-[11px] text-indigo-300/80 mt-0.5">Semua file telah berhasil sampai di AWS S3. Master backend sedang menyelesaikan registrasi katalog.</p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Upload Method Selector */}
          <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-2.5">
            <label className="text-xs font-bold text-slate-300 flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Cpu size={14} className="text-cyan-400" /> Mode & Jalur Upload
              </span>
              <span className="text-[10px] text-cyan-400 font-mono font-bold">Maximized Throughput</span>
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                disabled={isUploading}
                onClick={() => setUploadMethod('chunk_backend')}
                className={`p-3 rounded-xl border text-left transition-all cursor-pointer disabled:opacity-50 ${
                  uploadMethod === 'chunk_backend'
                    ? 'bg-cyan-950/50 border-cyan-500/60 text-white shadow-md shadow-cyan-950/50 ring-1 ring-cyan-500/30'
                    : 'bg-slate-900/40 border-slate-800 text-slate-400 hover:text-white hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold flex items-center gap-1.5">
                    <Sparkles size={13} className="text-cyan-400" /> Max Chunk 64MB (4x Paralel)
                  </span>
                  {uploadMethod === 'chunk_backend' && <CheckCircle2 size={14} className="text-cyan-400" />}
                </div>
                <p className="text-[10px] text-slate-400 mt-1">
                  Kirim chunk 64MB paralel ke server lokal/backend langsung, lalu backend stream ke Master S3.
                </p>
              </button>

              <button
                type="button"
                disabled={isUploading}
                onClick={() => setUploadMethod('direct_master')}
                className={`p-3 rounded-xl border text-left transition-all cursor-pointer disabled:opacity-50 ${
                  uploadMethod === 'direct_master'
                    ? 'bg-indigo-950/50 border-indigo-500/60 text-white shadow-md shadow-indigo-950/50 ring-1 ring-indigo-500/30'
                    : 'bg-slate-900/40 border-slate-800 text-slate-400 hover:text-white hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold flex items-center gap-1.5">
                    <UploadCloud size={13} className="text-indigo-400" /> Direct Master API (SSE Stream)
                  </span>
                  {uploadMethod === 'direct_master' && <CheckCircle2 size={14} className="text-indigo-400" />}
                </div>
                <p className="text-[10px] text-slate-400 mt-1">
                  Upload langsung dari browser ke Master API /upload-with-progress dengan live SSE.
                </p>
              </button>
            </div>
          </div>

          {/* Section 1: Metadata Inputs */}
          <div className="space-y-4">
            <h4 className="text-xs font-black uppercase tracking-wider text-cyan-400 flex items-center gap-2">
              <Layers size={14} /> Metadata Konten Multimedia
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Title (tittle) */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300 flex items-center gap-1">
                  Judul Track/Sesi (tittle) <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  disabled={isUploading}
                  value={metadata.tittle}
                  onChange={e => setMetadata({ ...metadata, tittle: e.target.value })}
                  placeholder="Misal: Deep Relaxation 5.2"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 disabled:opacity-50 font-medium"
                />
              </div>

              {/* Artist */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300">
                  Artis (artist)
                </label>
                <input
                  type="text"
                  disabled={isUploading}
                  value={metadata.artist}
                  onChange={e => setMetadata({ ...metadata, artist: e.target.value })}
                  placeholder="Misal: Regenesis Audio Team"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 disabled:opacity-50 font-medium"
                />
              </div>

              {/* Album */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300">
                  Album / Kategori (album)
                </label>
                <input
                  type="text"
                  disabled={isUploading}
                  value={metadata.album}
                  onChange={e => setMetadata({ ...metadata, album: e.target.value })}
                  placeholder="Misal: Wellness & Biohack"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 disabled:opacity-50 font-medium"
                />
              </div>

              {/* IsShowAtCustom */}
              <div className="space-y-1.5 sm:col-span-2 lg:col-span-3 pt-1">
                <label className="text-xs font-bold text-slate-300">
                  Tampilkan di Menu Custom Pod (IsShowAtCustom)
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
                    <span>Tampilkan (show)</span>
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
                    <span>Sembunyikan (hide)</span>
                  </label>
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: 4 File Dropzones */}
          <div className="space-y-4 pt-2">
            <h4 className="text-xs font-black uppercase tracking-wider text-cyan-400 flex items-center gap-2">
              <UploadCloud size={14} /> Berkas File Multimedia (Maks 10 GB)
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
                        <span>Lamp / Strobe Sync (lamp)</span>
                        {files.lamp && <CheckCircle2 size={13} className="text-emerald-400" />}
                      </div>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        File WAV sinyal lighting/strobe session
                      </p>
                      {files.lamp ? (
                        <div className="mt-2 text-xs font-mono font-bold text-amber-300 flex items-center gap-1.5 bg-amber-500/20 px-2 py-1 rounded-lg">
                          <span className="truncate max-w-[200px]">{files.lamp.name}</span>
                          <span className="text-[10px] text-amber-200">({formatBytes(files.lamp.size)})</span>
                        </div>
                      ) : (
                        <div className="mt-2 text-[11px] text-slate-500 flex items-center gap-1">
                          <UploadCloud size={12} /> Klik untuk pilih file .wav
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
                        <span>Video Footage (video)</span>
                        {files.video && <CheckCircle2 size={13} className="text-emerald-400" />}
                      </div>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        File MP4 footage resolusi tinggi / 4K
                      </p>
                      {files.video ? (
                        <div className="mt-2 text-xs font-mono font-bold text-rose-300 flex items-center gap-1.5 bg-rose-500/20 px-2 py-1 rounded-lg">
                          <span className="truncate max-w-[200px]">{files.video.name}</span>
                          <span className="text-[10px] text-rose-200">({formatBytes(files.video.size)})</span>
                        </div>
                      ) : (
                        <div className="mt-2 text-[11px] text-slate-500 flex items-center gap-1">
                          <UploadCloud size={12} /> Klik untuk pilih file .mp4
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
                        <span>Audio Sesi Musik (music)</span>
                        {files.music && <CheckCircle2 size={13} className="text-emerald-400" />}
                      </div>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        File WAV musik suara master / sesi audio
                      </p>
                      {files.music ? (
                        <div className="mt-2 text-xs font-mono font-bold text-cyan-300 flex items-center gap-1.5 bg-cyan-500/20 px-2 py-1 rounded-lg">
                          <span className="truncate max-w-[200px]">{files.music.name}</span>
                          <span className="text-[10px] text-cyan-200">({formatBytes(files.music.size)})</span>
                        </div>
                      ) : (
                        <div className="mt-2 text-[11px] text-slate-500 flex items-center gap-1">
                          <UploadCloud size={12} /> Klik untuk pilih file .wav
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
                        <span>Cover Album Visual (cover_album)</span>
                        {files.cover_album && <CheckCircle2 size={13} className="text-emerald-400" />}
                      </div>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        File JPG / PNG sampul thumbnail album
                      </p>
                      {files.cover_album ? (
                        <div className="mt-2 text-xs font-mono font-bold text-purple-300 flex items-center gap-1.5 bg-purple-500/20 px-2 py-1 rounded-lg">
                          <span className="truncate max-w-[200px]">{files.cover_album.name}</span>
                          <span className="text-[10px] text-purple-200">({formatBytes(files.cover_album.size)})</span>
                        </div>
                      ) : (
                        <div className="mt-2 text-[11px] text-slate-500 flex items-center gap-1">
                          <UploadCloud size={12} /> Klik untuk pilih cover .jpg / .png
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
            <HardDrive size={13} className="text-cyan-400" />
            <span>Chunking 50MB aktif untuk bypass batas 100MB Cloudflare</span>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleCancelUpload}
              disabled={uploadPhase === 'assembling'}
              className="px-4 py-2 rounded-xl text-xs font-bold text-slate-300 bg-slate-800/80 hover:bg-slate-800 hover:text-white border border-slate-700 transition-all cursor-pointer disabled:opacity-40"
            >
              {uploadPhase === 'completed' ? 'Tutup' : 'Batal'}
            </button>

            {uploadPhase === 'completed' ? (
              <button
                onClick={onClose}
                className="px-5 py-2 rounded-xl text-xs font-bold text-slate-950 bg-emerald-400 hover:bg-emerald-300 transition-all cursor-pointer flex items-center gap-1.5 shadow-lg shadow-emerald-500/20"
              >
                <CheckCircle2 size={15} /> Selesai & Kembali
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
                    <span>Memproses Upload...</span>
                  </>
                ) : (
                  <>
                    <UploadCloud size={15} />
                    <span>Mulai Upload Chunk</span>
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
