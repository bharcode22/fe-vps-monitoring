import React, { useState, useRef, useEffect } from 'react';
import {
  X,
  Edit3,
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
  Flame,
  ArrowRight,
  Info
} from 'lucide-react';
import {
  fetchMasterTokenApi,
  updateDirectToMasterApi
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

export default function MultimediaUpdateModal({ isOpen, onClose, onSuccess, track }) {
  // Form Metadata State (pre-populated from track)
  const [metadata, setMetadata] = useState({
    tittle: '',
    artist: '',
    album: '',
    file: '',
    IsShowAtCustom: 'show'
  });

  // Selected replacement files (null if unchanged)
  const [files, setFiles] = useState({
    lamp: null,
    video: null,
    music: null,
    cover_album: null
  });

  // Cover Image Preview URL
  const [coverPreviewUrl, setCoverPreviewUrl] = useState(null);

  // Upload/Update Engine State
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

  // Pre-populate data when track changes or modal opens
  useEffect(() => {
    if (isOpen && track) {
      setMetadata({
        tittle: track.tittle || track.title || '',
        artist: track.artist || 'Regenesis',
        album: track.album || '',
        file: track.file || track.name || track.artist || 'Regenesis',
        IsShowAtCustom: track.isShowAtCustom || track.IsShowAtCustom || 'show'
      });
      setFiles({
        lamp: null,
        video: null,
        music: null,
        cover_album: null
      });

      // Existing cover image preview
      const initialCover = track.coverAlbumUrl
        ? (track.coverAlbumUrl.startsWith('http')
          ? track.coverAlbumUrl
          : `https://developerfile-084897310273.s3.ap-southeast-1.amazonaws.com${track.coverAlbumUrl.startsWith('/') ? '' : '/'}${track.coverAlbumUrl}`)
        : null;
      setCoverPreviewUrl(initialCover);

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

      // Reset file input references
      Object.values(fileInputRefs).forEach(ref => {
        if (ref?.current) {
          ref.current.value = '';
        }
      });
    }
  }, [isOpen, track]);

  // Create preview when a NEW cover album file is selected
  useEffect(() => {
    if (files.cover_album) {
      const url = URL.createObjectURL(files.cover_album);
      setCoverPreviewUrl(url);
      return () => URL.revokeObjectURL(url);
    } else if (track?.coverAlbumUrl) {
      const initialCover = track.coverAlbumUrl.startsWith('http')
        ? track.coverAlbumUrl
        : `https://developerfile-084897310273.s3.ap-southeast-1.amazonaws.com${track.coverAlbumUrl.startsWith('/') ? '' : '/'}${track.coverAlbumUrl}`;
      setCoverPreviewUrl(initialCover);
    } else {
      setCoverPreviewUrl(null);
    }
  }, [files.cover_album, track]);

  const handleCloseModal = () => {
    if (isUploading && uploadPhase !== 'completed') {
      if (!window.confirm('Yakin ingin membatalkan proses pembaruan data yang sedang berlangsung?')) {
        return;
      }
      isCancelledRef.current = true;
      if (activeXhrRef.current) {
        activeXhrRef.current.abort();
      }
    }
    onClose();
  };

  if (!isOpen || !track) return null;

  const handleFileChange = (field, file) => {
    if (isUploading) return;
    setFiles(prev => ({ ...prev, [field]: file }));
  };

  const handleRemoveNewFile = (field, e) => {
    e.stopPropagation();
    if (isUploading) return;
    setFiles(prev => ({ ...prev, [field]: null }));
    if (fileInputRefs[field]?.current) {
      fileInputRefs[field].current.value = '';
    }
  };

  const handleStartUpdate = async () => {
    if (!metadata.tittle.trim()) {
      setErrorMessage('Judul Track/Sesi (tittle) wajib diisi');
      return;
    }

    const targetId = track.id;
    if (!targetId) {
      setErrorMessage('ID multimedia tidak ditemukan pada rekaman ini');
      return;
    }

    setErrorMessage('');
    setIsUploading(true);
    setUploadPhase('auth');
    setStatusMessage('Mengautentikasi ke Master API...');
    isCancelledRef.current = false;

    // Calculate total size of NEW files to upload (if any)
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

    const hasNewFiles = grandTotalBytes > 0;
    setTotalBytesToUpload(grandTotalBytes);
    setFileProgressMap(initialProgressMap);
    setServerS3Progress({
      status: 'idle',
      overallPercent: 0,
      totalSize: grandTotalBytes,
      totalLoaded: 0,
      message: 'Menunggu respon server...',
      files: []
    });

    try {
      // 1. Fetch cached JWT token from backend
      const authData = await fetchMasterTokenApi();
      if (isCancelledRef.current) return;

      // 2. Build FormData with updated metadata and replacement files
      const formData = new FormData();
      if (files.lamp) formData.append('lamp', files.lamp);
      if (files.video) formData.append('video', files.video);
      if (files.music) formData.append('music', files.music);
      if (files.cover_album) formData.append('cover_album', files.cover_album);

      formData.append('tittle', metadata.tittle.trim());
      formData.append('artist', metadata.artist.trim());
      formData.append('album', metadata.album.trim());
      formData.append('file', metadata.file.trim() || metadata.artist.trim() || 'Regenesis');
      formData.append('IsShowAtCustom', metadata.IsShowAtCustom || 'show');

      // 3. Start direct single-hop update directly to Master API & AWS S3 with SSE progress
      setUploadPhase('uploading_server');
      setStatusMessage(
        hasNewFiles
          ? `Mengirim perubahan & ${formatBytes(grandTotalBytes)} berkas ke Master API...`
          : 'Menyimpan pembaruan metadata ke Master API...'
      );

      const uploadStartTime = Date.now();
      let lastRenderTime = 0;

      const result = await updateDirectToMasterApi(
        targetId,
        formData,
        authData.token,
        authData.masterApiBase,
        // Phase 1: Client Upload onProgress (Browser -> Master Server)
        (loaded, total) => {
          if (isCancelledRef.current) return;
          const now = Date.now();
          if (now - lastRenderTime < 80 && loaded < total) return;
          lastRenderTime = now;

          const currentTotal = total || grandTotalBytes || 1;
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

          if (percent < 100 && hasNewFiles) {
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
            setStatusMessage(eventData.message || 'Master Server mulai memperbarui file di AWS S3...');
          } else if (eventData.status === 'uploading') {
            setUploadPhase('uploading_s3');
            setStatusMessage(`Master Server memperbarui S3 (${eventData.overallPercent || 0}%)...`);

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
            setStatusMessage(eventData.message || 'Master Server memproses hash & menyimpan data...');
            setFileProgressMap(prev => {
              const next = { ...prev };
              Object.keys(next).forEach(k => {
                next[k] = { ...next[k], progress: 100, status: 'done' };
              });
              return next;
            });
          } else if (eventData.status === 'completed') {
            setUploadPhase('completed');
            setStatusMessage('Data multimedia berhasil diperbarui di Master AWS S3 & Database!');
            setOverallProgress(100);
          }
        },
        (xhr) => {
          activeXhrRef.current = xhr;
        }
      );

      // 4. Finished successfully
      setUploadPhase('completed');
      setStatusMessage('Data multimedia berhasil diperbarui!');
      setOverallProgress(100);

      if (onSuccess) {
        onSuccess(result?.data || result);
      }
    } catch (err) {
      if (isCancelledRef.current) return;
      console.error('Error during multimedia update with progress:', err);
      setUploadPhase('error');
      setErrorMessage(err.message || 'Terjadi kesalahan saat memperbarui data di Master API');
    } finally {
      setIsUploading(false);
      activeXhrRef.current = null;
    }
  };

  const handleCancelUpdate = () => {
    if (!isUploading) {
      onClose();
      return;
    }

    if (window.confirm('Yakin ingin membatalkan proses pembaruan yang sedang berlangsung?')) {
      isCancelledRef.current = true;
      if (activeXhrRef.current) {
        activeXhrRef.current.abort();
      }
      setIsUploading(false);
      setUploadPhase('idle');
      setStatusMessage('Pembaruan dibatalkan.');
      onClose();
    }
  };

  // Helper render existing file status
  const renderExistingFileStatus = (currentFilename) => {
    if (!currentFilename) {
      return (
        <span className="text-[10px] text-slate-500 italic block mt-0.5">
          (Belum ada berkas pada slot ini)
        </span>
      );
    }
    return (
      <span className="text-[10.5px] font-mono text-purple-300 truncate block mt-0.5" title={currentFilename}>
        Saat ini: <strong className="text-white">{currentFilename}</strong>
      </span>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-950/80 backdrop-blur-md overflow-y-auto animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl bg-slate-900/95 border border-purple-500/40 rounded-3xl shadow-2xl shadow-purple-950/60 overflow-hidden my-8 flex flex-col max-h-[90vh]">

        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-purple-500/25 bg-gradient-to-r from-slate-900 via-purple-950/30 to-slate-900">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-purple-500/15 border border-purple-500/35 text-purple-300">
              <Edit3 size={20} className="animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-black text-white">Edit / Update Multimedia</h3>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-black bg-purple-500/20 text-purple-300 border border-purple-500/40">
                  #{track.sound_scape}
                </span>
                <span className="px-2 py-0.5 rounded-full text-[9.5px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1">
                  <Sparkles size={9} /> PUT with SSE Progress
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Perbarui metadata atau ganti berkas individual. Biarkan slot berkas kosong jika ingin mempertahankan berkas lama.
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
                <p className="font-bold">Gagal Memperbarui Multimedia</p>
                <p className="mt-0.5 text-rose-200">{errorMessage}</p>
              </div>
            </div>
          )}

          {/* Success Banner */}
          {uploadPhase === 'completed' && (
            <div className="p-5 rounded-2xl bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 text-xs flex items-start gap-3.5 animate-in zoom-in-95">
              <CheckCircle2 size={22} className="shrink-0 text-emerald-400" />
              <div className="flex-1">
                <p className="font-black text-sm text-emerald-200">Pembaruan Berhasil & Terintegrasi!</p>
                <p className="mt-1 text-emerald-300/90">{statusMessage}</p>
              </div>
            </div>
          )}

          {/* Section 1: Track Metadata Fields */}
          <div className="space-y-4">
            <h4 className="text-xs font-black uppercase tracking-wider text-purple-300 flex items-center gap-2">
              <Layers size={14} /> 1. Metadata Informasi Konten
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Tittle */}
              <div className="space-y-1 sm:col-span-2">
                <label className="text-[11px] font-bold text-slate-300 flex items-center justify-between">
                  <span>Judul Track (tittle) *</span>
                  <span className="text-[10px] text-slate-500 font-mono">Wajib Diisi</span>
                </label>
                <input
                  type="text"
                  value={metadata.tittle}
                  onChange={e => setMetadata({ ...metadata, tittle: e.target.value })}
                  disabled={isUploading}
                  placeholder="Contoh: Relax 3 (Level1)"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all disabled:opacity-50 font-medium"
                />
              </div>

              {/* Artis */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-300">
                  Artis (artist)
                </label>
                <input
                  type="text"
                  value={metadata.artist}
                  onChange={e => setMetadata({ ...metadata, artist: e.target.value })}
                  disabled={isUploading}
                  placeholder="Contoh: Regenesis"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all disabled:opacity-50 font-medium"
                />
              </div>

              {/* Album */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-300">
                  Album (album)
                </label>
                <input
                  type="text"
                  value={metadata.album}
                  onChange={e => setMetadata({ ...metadata, album: e.target.value })}
                  disabled={isUploading}
                  placeholder="Contoh: Regenesis"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all disabled:opacity-50 font-medium"
                />
              </div>

              {/* File / Tag */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-300">
                  File Tag (file)
                </label>
                <input
                  type="text"
                  value={metadata.file}
                  onChange={e => setMetadata({ ...metadata, file: e.target.value })}
                  disabled={isUploading}
                  placeholder="Contoh: Regenesis"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all disabled:opacity-50 font-medium"
                />
              </div>

              {/* IsShowAtCustom Visibility */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-300">
                  Visibilitas (IsShowAtCustom)
                </label>
                <select
                  value={metadata.IsShowAtCustom}
                  onChange={e => setMetadata({ ...metadata, IsShowAtCustom: e.target.value })}
                  disabled={isUploading}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all disabled:opacity-50 font-medium cursor-pointer"
                >
                  <option value="show">Tampilkan (show)</option>
                  <option value="hide">Sembunyikan (hide)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Section 2: Replacement File Upload Slots */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-black uppercase tracking-wider text-purple-300 flex items-center gap-2">
                <HardDrive size={14} /> 2. Berkas Media (Opsional Penggantian)
              </h4>
              <span className="text-[10px] text-slate-400 font-mono">
                Pilih hanya berkas yang ingin diganti
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

              {/* Slot 1: Audio / Music */}
              <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 hover:border-cyan-500/40 transition-all space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-cyan-500/15 text-cyan-400">
                      <Music size={15} />
                    </div>
                    <div>
                      <span className="text-xs font-bold text-white block">Audio / Musik</span>
                      <span className="text-[10px] text-slate-400 font-mono">Slot: music (.mp3, .wav, .flac)</span>
                    </div>
                  </div>
                  {files.music ? (
                    <button
                      type="button"
                      onClick={(e) => handleRemoveNewFile('music', e)}
                      disabled={isUploading}
                      className="text-slate-400 hover:text-rose-400 p-1 text-xs cursor-pointer"
                      title="Batalkan penggantian file ini"
                    >
                      <Trash2 size={13} />
                    </button>
                  ) : null}
                </div>

                {/* Status Existing vs New */}
                <div className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-800/80">
                  {renderExistingFileStatus(track.music)}
                  {files.music && (
                    <div className="mt-1.5 pt-1.5 border-t border-cyan-500/20 text-[10.5px] text-cyan-300 flex items-center justify-between font-mono">
                      <span className="truncate">Ganti: <strong>{files.music.name}</strong></span>
                      <span className="shrink-0 ml-2">{formatBytes(files.music.size)}</span>
                    </div>
                  )}
                </div>

                <input
                  ref={fileInputRefs.music}
                  type="file"
                  accept="audio/*,.mp3,.wav,.flac,.ogg,.m4a"
                  onChange={e => handleFileChange('music', e.target.files[0])}
                  disabled={isUploading}
                  className="block w-full text-[11px] text-slate-400 file:mr-3 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-[11px] file:font-bold file:bg-cyan-500/20 file:text-cyan-300 hover:file:bg-cyan-500/30 file:cursor-pointer cursor-pointer"
                />
              </div>

              {/* Slot 2: Video */}
              <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 hover:border-blue-500/40 transition-all space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-blue-500/15 text-blue-400">
                      <FileVideo size={15} />
                    </div>
                    <div>
                      <span className="text-xs font-bold text-white block">Video</span>
                      <span className="text-[10px] text-slate-400 font-mono">Slot: video (.mp4, .mkv, .mov)</span>
                    </div>
                  </div>
                  {files.video ? (
                    <button
                      type="button"
                      onClick={(e) => handleRemoveNewFile('video', e)}
                      disabled={isUploading}
                      className="text-slate-400 hover:text-rose-400 p-1 text-xs cursor-pointer"
                      title="Batalkan penggantian file ini"
                    >
                      <Trash2 size={13} />
                    </button>
                  ) : null}
                </div>

                {/* Status Existing vs New */}
                <div className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-800/80">
                  {renderExistingFileStatus(track.video)}
                  {files.video && (
                    <div className="mt-1.5 pt-1.5 border-t border-blue-500/20 text-[10.5px] text-blue-300 flex items-center justify-between font-mono">
                      <span className="truncate">Ganti: <strong>{files.video.name}</strong></span>
                      <span className="shrink-0 ml-2">{formatBytes(files.video.size)}</span>
                    </div>
                  )}
                </div>

                <input
                  ref={fileInputRefs.video}
                  type="file"
                  accept="video/*,.mp4,.mkv,.mov,.webm"
                  onChange={e => handleFileChange('video', e.target.files[0])}
                  disabled={isUploading}
                  className="block w-full text-[11px] text-slate-400 file:mr-3 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-[11px] file:font-bold file:bg-blue-500/20 file:text-blue-300 hover:file:bg-blue-500/30 file:cursor-pointer cursor-pointer"
                />
              </div>

              {/* Slot 3: Strobe Light / Lamp */}
              <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 hover:border-amber-500/40 transition-all space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-amber-500/15 text-amber-400">
                      <Zap size={15} />
                    </div>
                    <div>
                      <span className="text-xs font-bold text-white block">Pola Lampu / Strobo</span>
                      <span className="text-[10px] text-slate-400 font-mono">Slot: lamp (.json, .strobe, .patt)</span>
                    </div>
                  </div>
                  {files.lamp ? (
                    <button
                      type="button"
                      onClick={(e) => handleRemoveNewFile('lamp', e)}
                      disabled={isUploading}
                      className="text-slate-400 hover:text-rose-400 p-1 text-xs cursor-pointer"
                      title="Batalkan penggantian file ini"
                    >
                      <Trash2 size={13} />
                    </button>
                  ) : null}
                </div>

                {/* Status Existing vs New */}
                <div className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-800/80">
                  {renderExistingFileStatus(track.lamp)}
                  {files.lamp && (
                    <div className="mt-1.5 pt-1.5 border-t border-amber-500/20 text-[10.5px] text-amber-300 flex items-center justify-between font-mono">
                      <span className="truncate">Ganti: <strong>{files.lamp.name}</strong></span>
                      <span className="shrink-0 ml-2">{formatBytes(files.lamp.size)}</span>
                    </div>
                  )}
                </div>

                <input
                  ref={fileInputRefs.lamp}
                  type="file"
                  accept=".json,.strobe,.patt,.txt"
                  onChange={e => handleFileChange('lamp', e.target.files[0])}
                  disabled={isUploading}
                  className="block w-full text-[11px] text-slate-400 file:mr-3 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-[11px] file:font-bold file:bg-amber-500/20 file:text-amber-300 hover:file:bg-amber-500/30 file:cursor-pointer cursor-pointer"
                />
              </div>

              {/* Slot 4: Cover Album Image */}
              <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 hover:border-purple-500/40 transition-all space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-purple-500/15 text-purple-400">
                      <ImageIcon size={15} />
                    </div>
                    <div>
                      <span className="text-xs font-bold text-white block">Sampul Album</span>
                      <span className="text-[10px] text-slate-400 font-mono">Slot: cover_album (.jpg, .png)</span>
                    </div>
                  </div>
                  {files.cover_album ? (
                    <button
                      type="button"
                      onClick={(e) => handleRemoveNewFile('cover_album', e)}
                      disabled={isUploading}
                      className="text-slate-400 hover:text-rose-400 p-1 text-xs cursor-pointer"
                      title="Batalkan penggantian file ini"
                    >
                      <Trash2 size={13} />
                    </button>
                  ) : null}
                </div>

                {/* Status Existing vs New + Thumbnail Preview */}
                <div className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-800/80 flex items-center gap-3">
                  {coverPreviewUrl ? (
                    <img
                      src={coverPreviewUrl}
                      alt="Cover Preview"
                      className="w-11 h-11 rounded-lg object-cover border border-purple-500/40 shrink-0 bg-slate-950"
                      onError={(e) => { e.target.style.display = 'none'; }}
                    />
                  ) : (
                    <div className="w-11 h-11 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-500 shrink-0">
                      <ImageIcon size={16} />
                    </div>
                  )}

                  <div className="min-w-0 flex-1">
                    {renderExistingFileStatus(track.cover_album || track.coverAlbumUrl)}
                    {files.cover_album && (
                      <div className="mt-1 text-[10.5px] text-purple-300 font-mono truncate">
                        Ganti: <strong>{files.cover_album.name}</strong> ({formatBytes(files.cover_album.size)})
                      </div>
                    )}
                  </div>
                </div>

                <input
                  ref={fileInputRefs.cover_album}
                  type="file"
                  accept="image/*,.jpg,.jpeg,.png,.webp"
                  onChange={e => handleFileChange('cover_album', e.target.files[0])}
                  disabled={isUploading}
                  className="block w-full text-[11px] text-slate-400 file:mr-3 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-[11px] file:font-bold file:bg-purple-500/20 file:text-purple-300 hover:file:bg-purple-500/30 file:cursor-pointer cursor-pointer"
                />
              </div>

            </div>
          </div>

          {/* Section 3: Live Progress Panel (Shown when uploading / processing) */}
          {isUploading && (
            <div className="p-5 rounded-3xl bg-slate-950 border border-purple-500/40 space-y-4 shadow-xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Loader2 size={16} className="animate-spin text-purple-400" />
                  <span className="text-xs font-black text-white">Status Pembaruan Master API</span>
                </div>
                <div className="flex items-center gap-3 text-xs font-mono">
                  <span className="text-purple-300 font-bold flex items-center gap-1">
                    <Gauge size={13} /> {uploadSpeed}
                  </span>
                  <span className="text-slate-400 flex items-center gap-1">
                    <Clock size={13} /> ETA: {formatDuration(etaSeconds)}
                  </span>
                </div>
              </div>

              {/* Progress Bar Agregat */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-300 font-medium">{statusMessage}</span>
                  <span className="font-mono font-black text-purple-300">{overallProgress}%</span>
                </div>
                <div className="w-full h-2.5 bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-purple-500 via-indigo-500 to-cyan-400 transition-all duration-200"
                    style={{ width: `${overallProgress}%` }}
                  />
                </div>
                <div className="flex justify-between text-[10px] font-mono text-slate-500">
                  <span>{formatBytes(uploadedBytesTotal)} terkirim</span>
                  <span>Total: {formatBytes(totalBytesToUpload)}</span>
                </div>
              </div>

              {/* Server-Sent Events Phase Indicator */}
              {serverS3Progress.status !== 'idle' && (
                <div className="p-3 rounded-2xl bg-purple-950/30 border border-purple-500/30 text-xs space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-purple-200 flex items-center gap-1.5">
                      <Sparkles size={13} className="text-purple-400" />
                      Fase 2: Master Server ➔ AWS S3 Streaming
                    </span>
                    <span className="font-mono text-purple-300 font-bold">
                      {serverS3Progress.overallPercent}%
                    </span>
                  </div>

                  {/* List of files being processed on S3 */}
                  {Array.isArray(serverS3Progress.files) && serverS3Progress.files.length > 0 && (
                    <div className="space-y-1 pt-1">
                      {serverS3Progress.files.map((f, idx) => (
                        <div key={idx} className="flex items-center justify-between text-[10.5px] font-mono">
                          <span className="text-slate-300 truncate max-w-[200px]">{f.name || f.type}</span>
                          <div className="flex items-center gap-2">
                            <span className="text-slate-400">{formatBytes(f.loaded || 0)} / {formatBytes(f.size || 0)}</span>
                            <span className={f.status === 'completed' ? 'text-emerald-400 font-bold' : 'text-purple-300'}>
                              {f.status === 'completed' ? '✓ Selesai' : `${f.percent || 0}%`}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

        </div>

        {/* Modal Footer Actions */}
        <div className="px-6 py-4 border-t border-purple-500/20 bg-slate-900 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <Info size={14} className="text-purple-400 shrink-0" />
            <span>ID Record: <strong className="text-white font-mono text-[11px]">{track.id}</strong></span>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={handleCloseModal}
              disabled={isUploading}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-all cursor-pointer disabled:opacity-50"
            >
              {uploadPhase === 'completed' ? 'Tutup' : 'Batal'}
            </button>

            {uploadPhase === 'completed' ? (
              <button
                type="button"
                onClick={handleCloseModal}
                className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-lg shadow-emerald-500/20"
              >
                <CheckCircle2 size={15} />
                <span>Selesai</span>
              </button>
            ) : isUploading ? (
              <button
                type="button"
                onClick={handleCancelUpdate}
                className="px-4 py-2 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
              >
                <X size={15} />
                <span>Batalkan Upload</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={handleStartUpdate}
                className="px-5 py-2 rounded-xl bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-700 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-bold flex items-center gap-2 cursor-pointer shadow-lg shadow-purple-500/25 active:scale-95 transition-all"
              >
                <Edit3 size={14} />
                <span>Simpan Perubahan</span>
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
