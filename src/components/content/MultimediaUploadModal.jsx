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
  Server
} from 'lucide-react';
import {
  uploadMultimediaChunkApi,
  completeMultimediaUploadApi,
  cancelMultimediaUploadApi
} from '../../api/vpsApi';
import io from 'socket.io-client';
import { SOCKET_URL } from '../../config';

const CHUNK_SIZE = 50 * 1024 * 1024; // 50 MB per chunk (Bypass 100MB Cloudflare limit)

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

  // Upload Engine State
  const [isUploading, setIsUploading] = useState(false);
  const [uploadPhase, setUploadPhase] = useState('idle'); // 'idle' | 'chunking' | 'assembling' | 'completed' | 'error'
  const [statusMessage, setStatusMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  // Progress Metrics
  const [overallProgress, setOverallProgress] = useState(0);
  const [uploadedBytesTotal, setUploadedBytesTotal] = useState(0);
  const [totalBytesToUpload, setTotalBytesToUpload] = useState(0);
  const [uploadSpeed, setUploadSpeed] = useState('0 MB/s');
  const [etaSeconds, setEtaSeconds] = useState(0);

  // Per-file detailed progress: { [field]: { progress: 0-100, currentChunk: 0, totalChunks: 0, status: 'idle'|'uploading'|'done'|'error' } }
  const [fileProgressMap, setFileProgressMap] = useState({});

  // Backend Processing & Dispatch Progress State (via WebSocket)
  const [backendProgress, setBackendProgress] = useState({
    stage: 'idle', // 'merging' | 'auth' | 'dispatching' | 'processing' | 'completed' | 'error'
    stageTitle: '',
    message: '',
    progress: 0,
    bytesSentFormatted: '',
    totalBytesFormatted: '',
    speedFormatted: '',
    etaFormatted: '',
    currentFile: ''
  });

  // Refs for tracking active upload state
  const isCancelledRef = useRef(false);
  const activeSessionIdRef = useRef(null);
  const fileInputRefs = {
    lamp: useRef(null),
    video: useRef(null),
    music: useRef(null),
    cover_album: useRef(null)
  };

  // Listen for real-time backend progress updates from Socket.IO
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

      setBackendProgress({
        stage: data.stage || 'idle',
        stageTitle: data.stageTitle || '',
        message: data.message || '',
        progress: data.progress !== undefined ? data.progress : 0,
        bytesSentFormatted: data.bytesSentFormatted || '',
        totalBytesFormatted: data.totalBytesFormatted || '',
        speedFormatted: data.speedFormatted || '',
        etaFormatted: data.etaFormatted || '',
        currentFile: data.currentFile || ''
      });

      if (data.stage === 'error') {
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
      setBackendProgress({
        stage: 'idle',
        stageTitle: '',
        message: '',
        progress: 0,
        bytesSentFormatted: '',
        totalBytesFormatted: '',
        speedFormatted: '',
        etaFormatted: '',
        currentFile: ''
      });
      isCancelledRef.current = false;
      activeSessionIdRef.current = null;
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
    setUploadPhase('chunking');
    setStatusMessage('Menyiapkan batch chunk upload...');
    isCancelledRef.current = false;

    // Calculate total size
    let grandTotalBytes = 0;
    const selectedFields = [];
    const initialProgressMap = {};

    ['lamp', 'video', 'music', 'cover_album'].forEach(field => {
      const f = files[field];
      if (f) {
        grandTotalBytes += f.size;
        const totalChunks = Math.ceil(f.size / CHUNK_SIZE);
        selectedFields.push({ field, file: f, totalChunks });
        initialProgressMap[field] = {
          progress: 0,
          currentChunk: 0,
          totalChunks,
          uploadedBytes: 0,
          totalBytes: f.size,
          status: 'pending'
        };
      }
    });

    setTotalBytesToUpload(grandTotalBytes);
    setFileProgressMap(initialProgressMap);

    const sessionId = `up_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    activeSessionIdRef.current = sessionId;

    const filesManifest = {};
    let globalUploadedBytes = 0;
    let uploadStartTime = Date.now();
    let speedSamples = [];

    try {
      // 1. Process each file chunk by chunk
      for (const item of selectedFields) {
        if (isCancelledRef.current) throw new Error('Upload dibatalkan oleh pengguna');

        const { field, file, totalChunks } = item;
        filesManifest[field] = {
          filename: file.name,
          totalChunks,
          size: file.size
        };

        setFileProgressMap(prev => ({
          ...prev,
          [field]: { ...prev[field], status: 'uploading' }
        }));

        let fileUploadedBytes = 0;

        for (let chunkIdx = 0; chunkIdx < totalChunks; chunkIdx++) {
          if (isCancelledRef.current) throw new Error('Upload dibatalkan oleh pengguna');

          const start = chunkIdx * CHUNK_SIZE;
          const end = Math.min(start + CHUNK_SIZE, file.size);
          const chunkBlob = file.slice(start, end);
          const chunkSize = chunkBlob.size;

          const chunkStartTime = Date.now();
          setStatusMessage(`Mengunggah [${field.toUpperCase()}] chunk ${chunkIdx + 1} dari ${totalChunks}...`);

          // Upload chunk with retry support (up to 3 attempts)
          let attempts = 0;
          let chunkSuccess = false;
          let lastChunkError = null;

          while (attempts < 3 && !chunkSuccess) {
            try {
              attempts++;
              await uploadMultimediaChunkApi(
                sessionId,
                field,
                chunkIdx,
                totalChunks,
                file.name,
                chunkBlob
              );
              chunkSuccess = true;
            } catch (chunkErr) {
              lastChunkError = chunkErr;
              console.warn(`Retry chunk ${chunkIdx + 1} for ${field} (Percobaan ${attempts}/3):`, chunkErr.message);
              if (attempts < 3) {
                await new Promise(r => setTimeout(r, 1500));
              }
            }
          }

          if (!chunkSuccess) {
            throw new Error(`Gagal mengunggah chunk ${chunkIdx + 1} untuk ${file.name}: ${lastChunkError?.message}`);
          }

          fileUploadedBytes += chunkSize;
          globalUploadedBytes += chunkSize;

          // Speed & ETA calculation
          const elapsedSec = (Date.now() - uploadStartTime) / 1000;
          const currentSpeedBytesSec = elapsedSec > 0 ? globalUploadedBytes / elapsedSec : 0;
          const currentSpeedFormatted = `${formatBytes(currentSpeedBytesSec)}/s`;
          const remainingBytes = grandTotalBytes - globalUploadedBytes;
          const remainingSec = currentSpeedBytesSec > 0 ? Math.ceil(remainingBytes / currentSpeedBytesSec) : 0;

          setUploadedBytesTotal(globalUploadedBytes);
          setOverallProgress(Math.min(100, Math.round((globalUploadedBytes / grandTotalBytes) * 100)));
          setUploadSpeed(currentSpeedFormatted);
          setEtaSeconds(remainingSec);

          setFileProgressMap(prev => ({
            ...prev,
            [field]: {
              ...prev[field],
              currentChunk: chunkIdx + 1,
              uploadedBytes: fileUploadedBytes,
              progress: Math.min(100, Math.round((fileUploadedBytes / file.size) * 100))
            }
          }));
        }

        // Mark this file as finished
        setFileProgressMap(prev => ({
          ...prev,
          [field]: {
            ...prev[field],
            status: 'done',
            progress: 100,
            uploadedBytes: file.size
          }
        }));
      }

      // 2. All chunks uploaded successfully, trigger backend reassembly & dispatch
      setUploadPhase('assembling');
      setStatusMessage('Menggabungkan chunk di server & mengirim ke Master API...');
      setOverallProgress(100);

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

      if (onSuccess) {
        onSuccess(completeRes.data);
      }
    } catch (err) {
      console.error('Error during multimedia upload process:', err);
      setUploadPhase('error');
      setErrorMessage(err.message || 'Terjadi kesalahan saat mengunggah multimedia');
    } finally {
      setIsUploading(false);
    }
  };

  const handleCancelUpload = async () => {
    if (!isUploading) {
      onClose();
      return;
    }

    if (window.confirm('Yakin ingin membatalkan proses upload yang sedang berlangsung?')) {
      isCancelledRef.current = true;
      setIsUploading(false);
      setUploadPhase('idle');
      setStatusMessage('Upload dibatalkan.');
      if (activeSessionIdRef.current) {
        await cancelMultimediaUploadApi(activeSessionIdRef.current);
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
                  <Sparkles size={10} /> Batch Chunk 50MB
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Bypass batas Cloudflare 100MB — Mendukung file besar hingga 10 GB dengan autentikasi otomatis.
              </p>
            </div>
          </div>

          <button
            onClick={handleCancelUpload}
            disabled={uploadPhase === 'assembling'}
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
          {(isUploading || uploadPhase === 'assembling' || uploadPhase === 'completed') && (
            <div className="p-5 rounded-2xl bg-slate-950/80 border border-cyan-500/30 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  {uploadPhase === 'assembling' ? (
                    <Loader2 size={18} className="animate-spin text-amber-400" />
                  ) : uploadPhase === 'completed' ? (
                    <CheckCircle2 size={18} className="text-emerald-400" />
                  ) : (
                    <Loader2 size={18} className="animate-spin text-cyan-400" />
                  )}
                  <span className="text-xs font-bold text-slate-200">{statusMessage}</span>
                </div>
                <span className="text-sm font-black text-cyan-400 font-mono">
                  {overallProgress}% ({formatBytes(uploadedBytesTotal)} / {formatBytes(totalBytesToUpload)})
                </span>
              </div>

              {/* Main Progress Bar */}
              <div className="w-full h-3 bg-slate-900 rounded-full overflow-hidden border border-slate-800 relative">
                <div
                  className={`h-full transition-all duration-300 ${
                    uploadPhase === 'completed'
                      ? 'bg-gradient-to-r from-emerald-500 to-teal-400'
                      : uploadPhase === 'assembling'
                      ? 'bg-gradient-to-r from-amber-500 to-yellow-400 animate-pulse'
                      : 'bg-gradient-to-r from-cyan-500 via-sky-400 to-indigo-500'
                  }`}
                  style={{ width: `${overallProgress}%` }}
                />
              </div>

              {/* Metrics Bar */}
              <div className="grid grid-cols-3 gap-3 pt-1 text-[11px] font-mono">
                <div className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center gap-2 text-slate-300">
                  <Gauge size={14} className="text-cyan-400 shrink-0" />
                  <div>
                    <div className="text-[9px] text-slate-500 uppercase font-sans">Kecepatan</div>
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
                    <div className="text-[9px] text-slate-500 uppercase font-sans">Ukuran Chunk</div>
                    <div className="font-bold text-purple-300">50 MB / Piece</div>
                  </div>
                </div>
              </div>

              {/* Per-File Progress Items */}
              <div className="space-y-2 pt-2 border-t border-slate-800/80">
                {Object.entries(fileProgressMap).map(([field, p]) => (
                  <div key={field} className="flex items-center justify-between gap-3 text-xs bg-slate-900/40 p-2 rounded-xl border border-slate-800/50">
                    <span className="font-bold text-slate-300 uppercase tracking-wider text-[10px] w-24">
                      {field === 'lamp' ? '⚡ STROBE' : field === 'video' ? '🎬 VIDEO' : field === 'music' ? '🎵 MUSIC' : '🖼️ COVER'}
                    </span>
                    <div className="flex-1 h-2 bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all duration-200 ${
                          p.status === 'done' ? 'bg-emerald-400' : 'bg-cyan-400'
                        }`}
                        style={{ width: `${p.progress}%` }}
                      />
                    </div>
                    <span className="font-mono text-[10px] text-slate-400 w-28 text-right">
                      {p.currentChunk}/{p.totalChunks} Chk ({p.progress}%)
                    </span>
                  </div>
                ))}
              </div>

              {/* Backend Processing & Upstream Stream Progress */}
              {(uploadPhase === 'assembling' || backendProgress.stage !== 'idle') && (
                <div className="p-4 rounded-2xl bg-indigo-950/40 border border-indigo-500/30 space-y-3 pt-3 animate-in fade-in">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Server size={15} className="text-indigo-400 animate-pulse" />
                      <span className="text-xs font-black text-white">
                        Status Server Backend ➔ Master S3
                      </span>
                    </div>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 uppercase tracking-wider">
                      {backendProgress.stageTitle || (backendProgress.stage === 'merging' ? 'Menggabungkan Chunks' : 'Memproses')}
                    </span>
                  </div>

                  {/* Backend Stream Progress Bar (Active when dispatching to Master S3) */}
                  {backendProgress.stage === 'dispatching' && (
                    <div className="space-y-1.5 pt-1">
                      <div className="flex items-center justify-between text-xs font-mono">
                        <span className="text-indigo-200 text-[11px] flex items-center gap-1.5">
                          <UploadCloud size={13} className="text-cyan-400 animate-bounce" />
                          <span>Streaming ke Master S3 ({backendProgress.bytesSentFormatted} / {backendProgress.totalBytesFormatted})</span>
                        </span>
                        <span className="font-bold text-cyan-300">
                          {backendProgress.progress}% ({backendProgress.speedFormatted})
                        </span>
                      </div>
                      <div className="w-full h-2.5 bg-slate-900 rounded-full overflow-hidden border border-indigo-900/60">
                        <div
                          className="h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-cyan-400 transition-all duration-200"
                          style={{ width: `${backendProgress.progress}%` }}
                        />
                      </div>
                      {backendProgress.etaFormatted && (
                        <div className="text-[10px] text-right font-mono text-indigo-300">
                          Estimasi Sisa Waktu Upstream: {backendProgress.etaFormatted}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Live Status Log Message */}
                  <div className="text-xs text-indigo-200/90 flex items-center gap-2 bg-slate-950/60 px-3 py-2 rounded-xl border border-indigo-800/40 font-mono">
                    {backendProgress.stage === 'completed' ? (
                      <CheckCircle2 size={14} className="text-emerald-400 shrink-0" />
                    ) : (
                      <Loader2 size={13} className="animate-spin text-indigo-400 shrink-0" />
                    )}
                    <span className="truncate">{backendProgress.message || 'Server sedang memproses data di latar belakang...'}</span>
                  </div>
                </div>
              )}
            </div>
          )}

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
                className={`p-4 rounded-2xl border transition-all cursor-pointer relative ${
                  files.lamp
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
                className={`p-4 rounded-2xl border transition-all cursor-pointer relative ${
                  files.video
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
                className={`p-4 rounded-2xl border transition-all cursor-pointer relative ${
                  files.music
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
                className={`p-4 rounded-2xl border transition-all cursor-pointer relative ${
                  files.cover_album
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
