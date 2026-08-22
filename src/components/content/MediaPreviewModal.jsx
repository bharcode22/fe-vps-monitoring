import React, { useState, useRef, useEffect } from 'react';
import {
  X,
  Play,
  Pause,
  RotateCcw,
  RotateCw,
  Volume2,
  VolumeX,
  Film,
  Volume2 as AudioIcon,
  Image as ImageIcon,
  FileCode,
  Download,
  Loader2
} from 'lucide-react';

function formatDuration(seconds) {
  if (isNaN(seconds) || seconds === null || seconds === undefined) return '00:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  const hrs = Math.floor(mins / 60);
  const remMins = mins % 60;

  if (hrs > 0) {
    return `${String(hrs).padStart(2, '0')}:${String(remMins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }
  return `${String(remMins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

export default function MediaPreviewModal({
  isOpen,
  file,
  onClose
}) {
  const mediaRef = useRef(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [dragTime, setDragTime] = useState(null); // Non-null when user is actively dragging the seekbar
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isBuffering, setIsBuffering] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Reset state when file changes or modal opens
  useEffect(() => {
    if (isOpen && file) {
      setIsPlaying(false);
      setCurrentTime(0);
      setDragTime(null);
      setDuration(0);
      setIsBuffering(false);
      setErrorMsg('');
    }
  }, [isOpen, file]);

  if (!isOpen || !file) return null;

  const category = file.category || 'other';
  const isAudio = category === 'audio';
  const isVideo = category === 'video';
  const isImage = category === 'image';
  const isPlayable = isAudio || isVideo;

  const togglePlay = () => {
    if (!mediaRef.current) return;
    if (isPlaying) {
      mediaRef.current.pause();
      setIsPlaying(false);
    } else {
      mediaRef.current.play().then(() => {
        setIsPlaying(true);
      }).catch(err => {
        setErrorMsg(`Gagal memutar media: ${err.message}`);
      });
    }
  };

  const handleTimeUpdate = () => {
    // Only update currentTime if user is not currently dragging the slider
    if (mediaRef.current && dragTime === null) {
      setCurrentTime(mediaRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (mediaRef.current) {
      setDuration(mediaRef.current.duration || 0);
      setIsBuffering(false);
    }
  };

  // 1. When user moves slider: update visual dragTime (instant 60 FPS, no network request)
  const handleSeekInput = (e) => {
    const val = parseFloat(e.target.value);
    setDragTime(val);
  };

  // 2. When user releases slider: perform single byte-range seek to destination
  const handleSeekCommit = (e) => {
    const val = parseFloat(e.target.value);
    setDragTime(null);
    setCurrentTime(val);
    if (mediaRef.current) {
      mediaRef.current.currentTime = val;
    }
  };

  // Fast skip +/- 10 seconds
  const handleSkip = (seconds) => {
    if (!mediaRef.current) return;
    const targetTime = Math.max(0, Math.min(duration || mediaRef.current.duration || 0, mediaRef.current.currentTime + seconds));
    mediaRef.current.currentTime = targetTime;
    setCurrentTime(targetTime);
  };

  const handleVolumeChange = (e) => {
    const val = parseFloat(e.target.value);
    setVolume(val);
    if (mediaRef.current) {
      mediaRef.current.volume = val;
      mediaRef.current.muted = val === 0;
      setIsMuted(val === 0);
    }
  };

  const toggleMute = () => {
    if (!mediaRef.current) return;
    const newMuted = !isMuted;
    setIsMuted(newMuted);
    mediaRef.current.muted = newMuted;
  };

  const displayTime = dragTime !== null ? dragTime : currentTime;

  return (
    <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-[1000] flex items-center justify-center p-3 sm:p-5 animate-in fade-in duration-150">
      <div className="w-full max-w-3xl bg-slate-950 border border-cyan-500/40 rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="p-4 sm:p-5 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className={`p-2.5 rounded-2xl border shrink-0 ${isVideo
              ? 'bg-purple-500/15 text-purple-400 border-purple-500/30'
              : isAudio
                ? 'bg-sky-500/15 text-sky-400 border-sky-500/30'
                : isImage
                  ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                  : 'bg-slate-800 text-slate-400 border-slate-700'
              }`}>
              {isVideo ? <Film size={18} /> : isAudio ? <AudioIcon size={18} /> : isImage ? <ImageIcon size={18} /> : <FileCode size={18} />}
            </div>
            <div className="min-w-0">
              <h3 className="text-sm sm:text-base font-extrabold text-white truncate" title={file.filename}>
                {file.filename}
              </h3>
              <div className="flex items-center gap-2 text-xs text-slate-400 font-mono mt-0.5 flex-wrap">
                <span className="text-cyan-300 font-bold">{file.sizeFormatted}</span>
                <span>&bull;</span>
                <span className="capitalize">{category}</span>
                {file.sourceLabel && (
                  <>
                    <span>&bull;</span>
                    <span className="text-[10px] px-2 py-0.2 rounded bg-slate-800 text-purple-300 border border-slate-700">
                      {file.sourceLabel}
                    </span>
                  </>
                )}
              </div>

            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {file.url && (
              <a
                href={file.url}
                target="_blank"
                rel="noreferrer"
                download={file.filename}
                className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer border border-slate-700"
                title="Buka / Download file asli"
              >
                <Download size={15} />
              </a>
            )}
            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors cursor-pointer border border-slate-700"
              title="Tutup preview"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Modal Body: Media Screen & Viewer */}
        <div className="p-4 sm:p-6 flex flex-col items-center justify-center bg-slate-950/60 overflow-y-auto min-h-[220px]">
          {errorMsg && (
            <div className="mb-4 p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs w-full text-center">
              {errorMsg}
            </div>
          )}

          {/* 1. IMAGE PREVIEW */}
          {isImage && (
            <div className="flex items-center justify-center w-full max-h-[60vh] overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/40 p-2">
              <img
                src={file.url}
                alt={file.filename}
                className="max-h-[56vh] max-w-full object-contain rounded-xl shadow-lg"
                onError={() => setErrorMsg('Gagal memuat gambar dari URL S3.')}
              />
            </div>
          )}

          {/* 2. VIDEO PREVIEW (High-Performance Streaming) */}
          {isVideo && (
            <div className="w-full flex flex-col items-center">
              <div className="w-full max-h-[52vh] bg-black rounded-2xl overflow-hidden border border-slate-800 flex items-center justify-center relative shadow-2xl group">
                <video
                  ref={mediaRef}
                  src={file.url}
                  preload="metadata"
                  playsInline
                  className="w-full max-h-[50vh] object-contain cursor-pointer"
                  onClick={togglePlay}
                  onTimeUpdate={handleTimeUpdate}
                  onLoadedMetadata={handleLoadedMetadata}
                  onWaiting={() => setIsBuffering(true)}
                  onCanPlay={() => setIsBuffering(false)}
                  onSeeking={() => setIsBuffering(true)}
                  onSeeked={() => setIsBuffering(false)}
                  onEnded={() => setIsPlaying(false)}
                  onError={() => setErrorMsg('Gagal memutar video dari S3 (format codec mungkin tidak didukung browser atau izin dibatasi).')}
                />

                {/* Buffering Spinner Overlay */}
                {isBuffering && (
                  <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px] flex items-center justify-center pointer-events-none">
                    <div className="p-3 bg-slate-900/90 rounded-2xl border border-slate-700 flex items-center gap-2 text-cyan-300 text-xs font-bold shadow-xl">
                      <Loader2 size={16} className="animate-spin text-cyan-400" />
                      <span>Memuat Stream...</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 3. AUDIO PREVIEW */}
          {isAudio && (
            <div className="w-full py-6 flex flex-col items-center">
              <audio
                ref={mediaRef}
                src={file.url}
                preload="metadata"
                onTimeUpdate={handleTimeUpdate}
                onLoadedMetadata={handleLoadedMetadata}
                onWaiting={() => setIsBuffering(true)}
                onCanPlay={() => setIsBuffering(false)}
                onSeeking={() => setIsBuffering(true)}
                onSeeked={() => setIsBuffering(false)}
                onEnded={() => setIsPlaying(false)}
                onError={() => setErrorMsg('Gagal memuat audio dari S3.')}
              />

              {/* Audio Visualizer Wave / Icon Graphic */}
              <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full bg-gradient-to-br from-sky-500/20 via-cyan-500/10 to-purple-500/20 border border-sky-500/30 flex items-center justify-center text-sky-400 mb-4 shadow-xl shadow-sky-500/5 relative">
                {isBuffering ? (
                  <Loader2 size={36} className="animate-spin text-cyan-300" />
                ) : (
                  <AudioIcon size={44} className={isPlaying ? 'animate-pulse text-sky-300' : ''} />
                )}
                {isPlaying && !isBuffering && (
                  <div className="absolute inset-0 rounded-full border-2 border-sky-400/40 animate-ping pointer-events-none" />
                )}
              </div>
              <p className="text-xs text-slate-400 font-mono mb-2">{file.filename}</p>
            </div>
          )}

          {/* 4. OTHER / NON-PLAYABLE PREVIEW */}
          {!isPlayable && !isImage && (
            <div className="p-8 text-center text-slate-400 text-xs">
              <FileCode size={40} className="mx-auto mb-2 text-slate-500" />
              <p>File ini tidak dapat diputar langsung di browser.</p>
              {file.url && (
                <a
                  href={file.url}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-3 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-800 text-cyan-300 hover:text-white font-bold text-xs border border-slate-700"
                >
                  <Download size={13} />
                  <span>Download / Buka File</span>
                </a>
              )}
            </div>
          )}
        </div>

        {/* Modal Controls (Ultra-Smooth Seeking Timeline & Playback Controls) */}
        {isPlayable && (
          <div className="p-4 sm:p-5 bg-slate-900/90 border-t border-slate-800 flex flex-col gap-3 shrink-0">
            {/* Timeline Seek Bar with Smooth Drag & Single Committed Seek */}
            <div className="flex items-center gap-3 w-full">
              <span className="text-[11px] font-mono text-cyan-300 font-bold shrink-0 min-w-[45px]">
                {formatDuration(displayTime)}
              </span>

              <div className="relative flex-1 flex items-center">
                <input
                  type="range"
                  min="0"
                  max={duration || 100}
                  step="0.1"
                  value={displayTime}
                  onInput={handleSeekInput}
                  onChange={handleSeekCommit}
                  onPointerUp={handleSeekCommit}
                  className="w-full h-2 rounded-lg bg-slate-800 accent-cyan-400 cursor-pointer appearance-none focus:outline-none"
                />
              </div>

              <span className="text-[11px] font-mono text-slate-400 font-bold shrink-0 min-w-[45px] text-right">
                {formatDuration(duration)}
              </span>
            </div>

            {/* Playback Controls & Fast Forward / Rewind */}
            <div className="flex items-center justify-between gap-3 pt-1">
              {/* Play / Skip Buttons */}
              <div className="flex items-center gap-2.5 sm:gap-3">
                {/* Skip -10s */}
                <button
                  onClick={() => handleSkip(-10)}
                  className="p-2 sm:px-3 sm:py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer border border-slate-700 flex items-center gap-1 text-xs font-bold"
                  title="Mundur 10 detik"
                >
                  <RotateCcw size={14} />
                  <span>-10s</span>
                </button>

                {/* Main Play / Pause Button */}
                <button
                  onClick={togglePlay}
                  className="p-3 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white shadow-lg shadow-cyan-500/25 transition-all cursor-pointer flex items-center justify-center shrink-0"
                  title={isPlaying ? 'Pause' : 'Play'}
                >
                  {isPlaying ? <Pause size={18} /> : <Play size={18} className="translate-x-0.5" />}
                </button>

                {/* Skip +10s */}
                <button
                  onClick={() => handleSkip(10)}
                  className="p-2 sm:px-3 sm:py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer border border-slate-700 flex items-center gap-1 text-xs font-bold"
                  title="Maju 10 detik"
                >
                  <RotateCw size={14} />
                  <span>+10s</span>
                </button>
              </div>

              {/* Volume Slider */}
              <div className="flex items-center gap-2 bg-slate-950/80 px-3 py-2 rounded-xl border border-slate-800">
                <button onClick={toggleMute} className="text-slate-400 hover:text-white cursor-pointer" title={isMuted ? 'Unmute' : 'Mute'}>
                  {isMuted || volume === 0 ? <VolumeX size={15} /> : <Volume2 size={15} />}
                </button>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={isMuted ? 0 : volume}
                  onChange={handleVolumeChange}
                  className="w-16 sm:w-20 h-1.5 rounded-lg bg-slate-800 accent-cyan-400 cursor-pointer appearance-none"
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
