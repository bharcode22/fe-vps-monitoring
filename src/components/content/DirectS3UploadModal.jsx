import React, { useRef } from 'react';
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
  Trash2,
  ShieldCheck,
  ArrowRight,
  Database,
  Hash,
  RefreshCw,
  Minus,
  Maximize2
} from 'lucide-react';
import { useDirectS3Upload, generateRandomSoundScapeCode } from '../../context/DirectS3UploadContext';

function formatBytes(bytes, decimals = 2) {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

export default function DirectS3UploadModal({ onSuccess }) {
  const {
    isOpen,
    isMinimized,
    metadata,
    setMetadata,
    files,
    isUploading,
    uploadPhase,
    errorMessage,
    uploadStats,
    grandProgress,
    closeDirectS3Modal,
    minimizeDirectS3Modal,
    restoreDirectS3Modal,
    handleFileChange,
    handleRemoveFile,
    startUpload,
    abortUpload,
    resetForm
  } = useDirectS3Upload();

  // If closed and not uploading, render nothing
  if (!isOpen && !isUploading && uploadPhase !== 'completed') return null;

  // =========================================================================
  // 1. FLOATING WIDGET (Rendered when minimized or closed during active upload)
  // =========================================================================
  if (isMinimized || (!isOpen && isUploading)) {
    return (
      <div className="fixed bottom-6 right-6 z-50 p-4 rounded-3xl bg-slate-900/95 border border-amber-500/50 shadow-2xl shadow-amber-500/20 backdrop-blur-xl flex flex-col gap-3 w-80 sm:w-96 animate-in slide-in-from-bottom-5 duration-300">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="p-2 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30 shrink-0 shadow-md">
              <Zap size={16} className="animate-pulse text-amber-400" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <h4 className="text-xs font-black text-white truncate">
                  Direct S3 #{metadata.sound_scape}
                </h4>
                <span className="px-1.5 py-0.2 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[9px] font-mono font-bold">
                  Background
                </span>
              </div>
              <p className="text-[10.5px] font-mono text-slate-300 truncate mt-0.5">
                {metadata.title || 'Mengunggah Berkas...'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={restoreDirectS3Modal}
              className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 hover:text-white transition-all cursor-pointer border border-slate-700 shadow-sm"
              title="Buka / Maksimalkan Modal"
            >
              <Maximize2 size={14} />
            </button>
            <button
              type="button"
              onClick={abortUpload}
              className="p-1.5 rounded-xl bg-slate-800 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 transition-all cursor-pointer border border-slate-700"
              title="Batalkan Upload"
            >
              <X size={14} />
            </button>
          </div>
        </div>

        {/* Mini Progress Bar & Bandwidth Metrics */}
        <div className="space-y-1.5">
          <div className="w-full bg-slate-950 rounded-full h-2 overflow-hidden border border-slate-800">
            <div
              className="bg-gradient-to-r from-amber-500 via-orange-500 to-emerald-400 h-2 rounded-full transition-all duration-150 ease-out shadow-sm"
              style={{ width: `${grandProgress}%` }}
            />
          </div>
          <div className="flex items-center justify-between text-[10px] font-mono text-slate-400">
            <span className="text-amber-300 font-bold">{uploadStats.bandwidthMbps} • {uploadStats.speedMBs}</span>
            <span className="font-extrabold text-white">{grandProgress}% ({uploadStats.eta})</span>
          </div>
        </div>
      </div>
    );
  }

  // =========================================================================
  // 2. FULL MODAL DIALOG
  // =========================================================================
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-4xl bg-slate-900 border border-slate-700/80 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] border-amber-500/30">

        {/* Modal Header */}
        <div className="p-4 sm:p-5 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-amber-500/20 text-amber-300 border border-amber-500/30 shadow-lg shadow-amber-500/10">
              <Zap size={20} className="animate-pulse text-amber-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-black text-white">Direct S3 Upload &amp; Media Forensik</h3>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-mono font-bold flex items-center gap-1">
                  <ShieldCheck size={11} /> SHA-256 Engine
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Upload berkecepatan tinggi langsung ke AWS S3 &amp; pencatatan otomatis ke tabel <code className="text-amber-300">multimedia</code> + <code className="text-cyan-300">media_forensik</code>
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            {isUploading && (
              <button
                type="button"
                onClick={minimizeDirectS3Modal}
                className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-amber-300 transition-colors cursor-pointer border border-slate-700"
                title="Minimize / Jalankan di Background"
              >
                <Minus size={18} />
              </button>
            )}
            <button
              type="button"
              onClick={closeDirectS3Modal}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors cursor-pointer border border-slate-700"
              title="Tutup Modal"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-6 flex-1 overflow-y-auto space-y-5 bg-slate-950/40">

          {errorMessage && (
            <div className="p-3.5 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle size={16} className="shrink-0 text-rose-400" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Success State Screen */}
          {uploadPhase === 'completed' ? (
            <div className="py-8 px-4 flex flex-col items-center justify-center text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center justify-center shadow-xl shadow-emerald-500/20 animate-bounce">
                <CheckCircle2 size={32} />
              </div>
              <div className="space-y-1 max-w-md">
                <h4 className="text-lg font-black text-white">Upload &amp; Pencatatan Berhasil!</h4>
                <p className="text-xs text-slate-400">
                  Seluruh berkas kode <span className="text-amber-300 font-bold font-mono">#{metadata.sound_scape}</span> telah diunggah ke AWS S3, metadata dicatat ke tabel <code className="text-amber-300">multimedia</code>, dan tanda tangan hash terdaftar di tabel <code className="text-cyan-300">media_forensik</code>.
                </p>
              </div>
              <div className="pt-2 flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => {
                    resetForm();
                    closeDirectS3Modal();
                    if (onSuccess) onSuccess(metadata.sound_scape);
                  }}
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 font-bold text-xs shadow-lg shadow-emerald-500/20 hover:from-emerald-400 hover:to-teal-400 transition-all cursor-pointer"
                >
                  Selesai &amp; Tutup
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Form Input Metadata */}
              <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-3">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-300">
                  <Database size={14} className="text-amber-400" />
                  <span>Informasi Metadata Master</span>
                </div>

                {/* Row 1: SoundScape Code & Track Title */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <div className="h-5 flex items-center justify-between mb-1.5">
                      <label className="text-[11px] font-mono text-slate-400 font-semibold">
                        SoundScape Code (#) <span className="text-rose-400">*</span>
                      </label>
                      <button
                        type="button"
                        disabled={isUploading}
                        onClick={() => setMetadata(prev => ({ ...prev, sound_scape: generateRandomSoundScapeCode() }))}
                        className="text-[10px] font-mono text-amber-400 hover:text-amber-300 font-bold flex items-center gap-1 cursor-pointer transition-colors"
                        title="Acak / Generate kode baru otomatis"
                      >
                        <RefreshCw size={10} />
                        <span>Acak</span>
                      </button>
                    </div>
                    <div className="relative">
                      <input
                        type="number"
                        disabled={isUploading}
                        value={metadata.sound_scape}
                        onChange={(e) => setMetadata(prev => ({ ...prev, sound_scape: e.target.value }))}
                        placeholder="contoh: 966155"
                        className="w-full h-10 px-3.5 pr-9 rounded-xl bg-slate-950 border border-slate-700 text-amber-300 font-bold text-xs font-mono focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500 disabled:opacity-50"
                      />
                      <button
                        type="button"
                        disabled={isUploading}
                        onClick={() => setMetadata(prev => ({ ...prev, sound_scape: generateRandomSoundScapeCode() }))}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-amber-400 transition-colors cursor-pointer"
                        title="Generate ulang 6-digit kode acak"
                      >
                        <RefreshCw size={13} />
                      </button>
                    </div>
                  </div>

                  <div className="sm:col-span-2">
                    <div className="h-5 flex items-center mb-1.5">
                      <label className="text-[11px] font-mono text-slate-400 font-semibold">
                        Judul Lagu / Track (Title)
                      </label>
                    </div>
                    <input
                      type="text"
                      disabled={isUploading}
                      value={metadata.title}
                      onChange={(e) => setMetadata(prev => ({ ...prev, title: e.target.value }))}
                      placeholder="contoh: Relax Max 21m Deep Healing"
                      className="w-full h-10 px-3.5 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500 disabled:opacity-50"
                    />
                  </div>
                </div>

                {/* Row 2: Artis, Album, Durasi, Visibilitas Kustom */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-1">
                  <div>
                    <div className="h-5 flex items-center mb-1.5">
                      <label className="text-[11px] font-mono text-slate-400 font-semibold">
                        Artis
                      </label>
                    </div>
                    <input
                      type="text"
                      disabled={isUploading}
                      value={metadata.artist}
                      onChange={(e) => setMetadata(prev => ({ ...prev, artist: e.target.value }))}
                      placeholder="contoh: Regenesis"
                      className="w-full h-10 px-3.5 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500 disabled:opacity-50"
                    />
                  </div>

                  <div>
                    <div className="h-5 flex items-center mb-1.5">
                      <label className="text-[11px] font-mono text-slate-400 font-semibold">
                        Album
                      </label>
                    </div>
                    <input
                      type="text"
                      disabled={isUploading}
                      value={metadata.album}
                      onChange={(e) => setMetadata(prev => ({ ...prev, album: e.target.value }))}
                      placeholder="contoh: SoundScape Therapy"
                      className="w-full h-10 px-3.5 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500 disabled:opacity-50"
                    />
                  </div>

                  <div>
                    <div className="h-5 flex items-center mb-1.5">
                      <label className="text-[11px] font-mono text-slate-400 font-semibold">
                        Durasi (Opsional)
                      </label>
                    </div>
                    <input
                      type="text"
                      disabled={isUploading}
                      value={metadata.duration}
                      onChange={(e) => setMetadata(prev => ({ ...prev, duration: e.target.value }))}
                      placeholder="contoh: 21m"
                      className="w-full h-10 px-3.5 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500 disabled:opacity-50"
                    />
                  </div>

                  <div>
                    <div className="h-5 flex items-center justify-between mb-1.5">
                      <label className="text-[11px] font-mono text-slate-400 font-semibold">
                        Visibilitas Kustom
                      </label>
                    </div>
                    <div className="w-full h-10 grid grid-cols-2 gap-1.5 p-1 rounded-xl bg-slate-950 border border-slate-700">
                      <label
                        className={`h-full flex items-center justify-center gap-1.5 px-2 rounded-lg text-xs font-mono font-bold cursor-pointer transition-all select-none ${metadata.isShowAtCustom === 'show'
                          ? 'bg-amber-500/25 text-amber-300 border border-amber-500/50 shadow-sm shadow-amber-500/10'
                          : 'text-slate-400 hover:text-slate-200 border border-transparent'
                          } ${isUploading ? 'opacity-50 cursor-not-allowed' : ''}`}
                      >
                        <input
                          type="radio"
                          name="isShowAtCustom"
                          value="show"
                          disabled={isUploading}
                          checked={metadata.isShowAtCustom === 'show'}
                          onChange={() => setMetadata(prev => ({ ...prev, isShowAtCustom: 'show' }))}
                          className="hidden"
                        />
                        <span className={`w-2 h-2 rounded-full transition-all ${metadata.isShowAtCustom === 'show' ? 'bg-amber-400 shadow-sm shadow-amber-400' : 'bg-slate-600'}`} />
                        <span>show</span>
                      </label>

                      <label
                        className={`h-full flex items-center justify-center gap-1.5 px-2 rounded-lg text-xs font-mono font-bold cursor-pointer transition-all select-none ${metadata.isShowAtCustom === 'hide'
                          ? 'bg-purple-500/25 text-purple-300 border border-purple-500/50 shadow-sm shadow-purple-500/10'
                          : 'text-slate-400 hover:text-slate-200 border border-transparent'
                          } ${isUploading ? 'opacity-50 cursor-not-allowed' : ''}`}
                      >
                        <input
                          type="radio"
                          name="isShowAtCustom"
                          value="hide"
                          disabled={isUploading}
                          checked={metadata.isShowAtCustom === 'hide'}
                          onChange={() => setMetadata(prev => ({ ...prev, isShowAtCustom: 'hide' }))}
                          className="hidden"
                        />
                        <span className={`w-2 h-2 rounded-full transition-all ${metadata.isShowAtCustom === 'hide' ? 'bg-purple-400 shadow-sm shadow-purple-400' : 'bg-slate-600'}`} />
                        <span>hide</span>
                      </label>
                    </div>
                  </div>
                </div>
              </div>

              {/* Upload Progress Bar & Realtime Bandwidth HUD (Placed Above Media Files Selection) */}
              {isUploading && (
                <div className="p-4 rounded-2xl bg-slate-900 border border-amber-500/40 shadow-xl shadow-amber-500/5 space-y-3 animate-in fade-in slide-in-from-top-3 duration-300">
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="font-bold text-amber-300 flex items-center gap-2">
                      <Loader2 size={14} className="animate-spin text-amber-400" />
                      <span>
                        {uploadPhase === 'presigning' && 'Membuat Tiket Upload S3...'}
                        {uploadPhase === 'uploading_s3' && 'Mengunggah Berkas Langsung ke AWS S3...'}
                        {uploadPhase === 'saving_db' && 'Menyimpan Metadata & Forensik ke Database Master...'}
                      </span>
                    </span>
                    <span className="text-white font-black text-sm">{grandProgress}%</span>
                  </div>

                  <div className="w-full bg-slate-950 rounded-full h-2.5 overflow-hidden border border-slate-800">
                    <div
                      className="bg-gradient-to-r from-amber-500 via-orange-500 to-emerald-400 h-2.5 rounded-full transition-all duration-150 ease-out shadow-sm"
                      style={{ width: `${grandProgress}%` }}
                    />
                  </div>

                  {/* Realtime Bandwidth & Network Metrics HUD */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-0.5">
                    <div className="p-2 rounded-xl bg-slate-950/70 border border-slate-800/80 flex flex-col">
                      <span className="text-[10px] text-slate-400 font-mono flex items-center gap-1">
                        <Zap size={11} className="text-amber-400" />
                        <span>Bandwidth Klien</span>
                      </span>
                      <span className="text-xs font-mono font-black text-amber-300 truncate mt-0.5">
                        {uploadStats.bandwidthMbps || '0.0 Mbps'}
                      </span>
                    </div>

                    <div className="p-2 rounded-xl bg-slate-950/70 border border-slate-800/80 flex flex-col">
                      <span className="text-[10px] text-slate-400 font-mono flex items-center gap-1">
                        <UploadCloud size={11} className="text-cyan-400" />
                        <span>Kecepatan Upload</span>
                      </span>
                      <span className="text-xs font-mono font-bold text-cyan-300 truncate mt-0.5">
                        {uploadStats.speedMBs || '0 B/s'}
                      </span>
                    </div>

                    <div className="p-2 rounded-xl bg-slate-950/70 border border-slate-800/80 flex flex-col">
                      <span className="text-[10px] text-slate-400 font-mono flex items-center gap-1">
                        <HardDrive size={11} className="text-purple-400" />
                        <span>Terkirim</span>
                      </span>
                      <span className="text-xs font-mono font-bold text-slate-200 truncate mt-0.5">
                        {formatBytes(uploadStats.loadedBytes)} / {formatBytes(uploadStats.totalBytes)}
                      </span>
                    </div>

                    <div className="p-2 rounded-xl bg-slate-950/70 border border-slate-800/80 flex flex-col">
                      <span className="text-[10px] text-slate-400 font-mono flex items-center gap-1">
                        <Clock size={11} className="text-emerald-400" />
                        <span>Estimasi Sisa (ETA)</span>
                      </span>
                      <span className="text-xs font-mono font-bold text-emerald-400 truncate mt-0.5">
                        {uploadStats.eta || 'Menghitung...'}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* 4 File Slots with Auto SHA-256 Detection */}
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs text-slate-300 font-bold">
                  <span className="flex items-center gap-1.5">
                    <HardDrive size={14} className="text-cyan-400" />
                    <span>Pilih Berkas Media (Direct AWS S3)</span>
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">

                  {/* 1. Audio File Slot */}
                  <SlotCard
                    title="Audio Utama (Music)"
                    icon={<Music size={16} className="text-sky-400" />}
                    slotKey="music"
                    accept="audio/*,.wav,.mp3,.flac,.ogg,.m4a"
                    slotState={files.music}
                    disabled={isUploading}
                    onFileSelect={(f) => handleFileChange('music', f)}
                    onRemove={() => handleRemoveFile('music')}
                  />

                  {/* 2. Video File Slot */}
                  <SlotCard
                    title="Video Visual (Video)"
                    icon={<FileVideo size={16} className="text-purple-400" />}
                    slotKey="video"
                    accept="video/*,.mp4,.webm,.mov"
                    slotState={files.video}
                    disabled={isUploading}
                    onFileSelect={(f) => handleFileChange('video', f)}
                    onRemove={() => handleRemoveFile('video')}
                  />

                  {/* 3. Strobe Light File Slot */}
                  <SlotCard
                    title="Sinyal Lampu Strobe (Lamp)"
                    icon={<Zap size={16} className="text-amber-400" />}
                    slotKey="lamp"
                    accept="audio/*,.wav,.flac,.mp3"
                    slotState={files.lamp}
                    disabled={isUploading}
                    onFileSelect={(f) => handleFileChange('lamp', f)}
                    onRemove={() => handleRemoveFile('lamp')}
                  />

                  {/* 4. Cover Album Slot */}
                  <SlotCard
                    title="Sampul Album (Cover Album)"
                    icon={<ImageIcon size={16} className="text-emerald-400" />}
                    slotKey="coverAlbum"
                    accept="image/*,.jpg,.jpeg,.png,.webp"
                    slotState={files.coverAlbum}
                    disabled={isUploading}
                    onFileSelect={(f) => handleFileChange('coverAlbum', f)}
                    onRemove={() => handleRemoveFile('coverAlbum')}
                  />
                </div>
              </div>
            </>
          )}
        </div>

        {/* Modal Footer */}
        {uploadPhase !== 'completed' && (
          <div className="p-4 bg-slate-900/90 border-t border-slate-800 flex items-center justify-between gap-3 shrink-0">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={closeDirectS3Modal}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
              >
                {isUploading && <Minus size={13} />}
                <span>{isUploading ? 'Minimize ke Background' : 'Tutup'}</span>
              </button>

              {isUploading && (
                <button
                  type="button"
                  onClick={abortUpload}
                  className="px-3 py-2 rounded-xl hover:bg-rose-500/20 text-rose-400 text-xs font-bold transition-all cursor-pointer border border-rose-500/30"
                  title="Batalkan proses upload langsung ke S3"
                >
                  Batalkan Upload
                </button>
              )}
            </div>

            <button
              type="button"
              disabled={isUploading || !metadata.sound_scape}
              onClick={() => startUpload(onSuccess)}
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-black text-xs flex items-center gap-2 shadow-lg shadow-amber-500/20 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed active:scale-95"
            >
              {isUploading ? (
                <>
                  <Loader2 size={14} className="animate-spin text-slate-950" />
                  <span>Mengunggah ke S3...</span>
                </>
              ) : (
                <>
                  <UploadCloud size={15} />
                  <span>Mulai Upload Direct ke S3</span>
                  <ArrowRight size={14} />
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// Sub-Component: File Slot Dropzone Card with SHA-256 Badge & Individual Progress
function SlotCard({ title, icon, slotKey, accept, slotState, disabled, onFileSelect, onRemove }) {
  const inputRef = useRef(null);
  const file = slotState?.file;
  const sha256 = slotState?.sha256;
  const isHashing = slotState?.isHashing;
  const progress = slotState?.progress || 0;
  const status = slotState?.status || 'idle';

  return (
    <div className={`p-3.5 rounded-2xl border transition-all ${file
      ? 'bg-slate-900/80 border-slate-700'
      : 'bg-slate-950/40 border-slate-800/80 hover:border-slate-700'
      }`}>
      <div className="flex items-center justify-between gap-2 mb-2">
        <span className="flex items-center gap-1.5 text-xs font-bold text-white">
          {icon}
          <span>{title}</span>
        </span>
        {file && (
          <button
            type="button"
            disabled={disabled}
            onClick={onRemove}
            className="p-1 rounded-lg hover:bg-rose-500/20 text-slate-500 hover:text-rose-400 transition-colors cursor-pointer disabled:opacity-50"
            title="Hapus berkas"
          >
            <Trash2 size={13} />
          </button>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept={accept}
        disabled={disabled}
        className="hidden"
        onChange={(e) => {
          if (e.target.files && e.target.files[0]) {
            onFileSelect(e.target.files[0]);
          }
        }}
      />

      {!file ? (
        <button
          type="button"
          disabled={disabled}
          onClick={() => inputRef.current?.click()}
          className="w-full py-4 px-3 rounded-xl border border-dashed border-slate-700 hover:border-amber-500/60 bg-slate-900/30 hover:bg-slate-900/60 text-slate-400 hover:text-slate-200 flex flex-col items-center justify-center gap-1.5 transition-all cursor-pointer text-xs"
        >
          <UploadCloud size={20} className="text-slate-500" />
          <span className="font-semibold text-[11px]">Pilih berkas {title.split(' ')[0]}</span>
          <span className="text-[9.5px] text-slate-500 font-mono">{accept.replace(/\*/g, '')}</span>
        </button>
      ) : (
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2 text-xs">
            <span className="font-mono font-bold text-white truncate text-[11.5px]" title={file.name}>
              {file.name}
            </span>
            <span className="font-mono text-[10.5px] text-slate-400 shrink-0">
              {formatBytes(file.size)}
            </span>
          </div>

          {/* SHA-256 Hash Status Badge */}
          <div className="p-1.5 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-between gap-1.5 text-[9.5px] font-mono">
            <span className="flex items-center gap-1 text-slate-400">
              <Hash size={11} className="text-cyan-400 shrink-0" />
              <span>SHA-256:</span>
            </span>
            {isHashing ? (
              <span className="text-amber-400 flex items-center gap-1 animate-pulse">
                <RefreshCw size={10} className="animate-spin" /> Menghitung hash...
              </span>
            ) : sha256 ? (
              <span className="text-emerald-400 font-semibold truncate" title={sha256}>
                {sha256.substring(0, 10)}...{sha256.substring(sha256.length - 8)}
              </span>
            ) : (
              <span className="text-rose-400">Gagal hash</span>
            )}
          </div>

          {/* Individual Upload Progress */}
          {status === 'uploading' && (
            <div className="space-y-1 pt-1">
              <div className="w-full bg-slate-950 rounded-full h-1.5 overflow-hidden border border-slate-800">
                <div
                  className="bg-gradient-to-r from-amber-500 to-emerald-400 h-1.5 rounded-full transition-all duration-150"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <div className="flex justify-between text-[9px] font-mono text-slate-400">
                <span>Mengunggah...</span>
                <span>{progress}%</span>
              </div>
            </div>
          )}

          {status === 'completed' && (
            <div className="flex items-center gap-1 text-[10px] text-emerald-400 font-mono">
              <CheckCircle2 size={11} />
              <span>Selesai diunggah ke S3</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
