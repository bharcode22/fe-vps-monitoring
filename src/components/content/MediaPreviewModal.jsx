import React, { useState, useRef, useEffect, useCallback } from 'react';
import { BACKEND_URL } from '../../config';
import { getAuthHeaders } from '../../api/vpsApi';
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
  Loader2,
  Zap,
  Activity,
  Lightbulb,
  ShieldAlert,
  Sliders,
  Sparkles,
  SlidersHorizontal
} from 'lucide-react';

const LOGIC_SAMPLE_RATE = 500; // 500 Hz sampling logic from Regenesis Engine

function formatDuration(seconds) {
  if (isNaN(seconds) || seconds === null || seconds === undefined || !isFinite(seconds)) return '00:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  const hrs = Math.floor(mins / 60);
  const remMins = mins % 60;

  if (hrs > 0) {
    return `${String(hrs).padStart(2, '0')}:${String(remMins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }
  return `${String(remMins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

// Extract frequency hint from filename (e.g. "[8Hz]" or "8Hz")
function extractFrequencyHint(filename) {
  if (!filename) return null;
  const match = filename.match(/\[?(\d+(?:\.\d+)?)\s*Hz\]?/i);
  if (match && match[1]) {
    const hz = parseFloat(match[1]);
    let band = 'Entrainment Band';
    if (hz >= 0.5 && hz < 4) band = 'Delta (Deep Sleep / Healing)';
    else if (hz >= 4 && hz < 8) band = 'Theta (Meditation / Hypnogogic)';
    else if (hz >= 8 && hz <= 12) band = 'Alpha (Relaxation / Flow State)';
    else if (hz > 12 && hz < 30) band = 'Beta (Focus / Alertness)';
    else if (hz >= 30) band = 'Gamma (Cognition / Peak Clarity)';
    return { hz, band, label: `${hz} Hz • ${band}` };
  }
  return null;
}

// Regenesis Demodulation Algorithm: High-Frequency Difference Envelope (500Hz)
function extractHighFreqEnvelope(buffer, channelIdx) {
  if (!buffer) return null;
  if (channelIdx >= buffer.numberOfChannels) channelIdx = 0;
  const data = buffer.getChannelData(channelIdx);
  const step = Math.floor(buffer.sampleRate / LOGIC_SAMPLE_RATE);
  const resultLength = Math.ceil(data.length / step);
  const result = new Float32Array(resultLength);
  for (let i = 0; i < resultLength; i++) {
    const start = i * step;
    let sum = 0;
    for (let j = 0; j < step - 1; j++) {
      if (start + j + 1 < data.length) {
        sum += Math.abs(data[start + j] - data[start + j + 1]);
      }
    }
    result[i] = Math.min(255, (sum / step) * 1000);
  }
  return result;
}

// Find timestamp (in seconds) of the first active strobe pulse in envelopes
function findFirstPulseTime(envL, envR, thresh = 100) {
  if (!envL && !envR) return null;
  const len = Math.max(envL?.length || 0, envR?.length || 0);
  for (let i = 0; i < len; i++) {
    const l = envL && i < envL.length ? envL[i] : 0;
    const r = envR && i < envR.length ? envR[i] : 0;
    if (l > thresh || r > thresh) {
      return i / LOGIC_SAMPLE_RATE; // seconds
    }
  }
  return null;
}

export default function MediaPreviewModal({
  isOpen,
  file,
  onClose
}) {
  const mediaRef = useRef(null);
  const canvasHeroRef = useRef(null);
  const animationFrameRef = useRef(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [dragTime, setDragTime] = useState(null);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isBuffering, setIsBuffering] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Strobe Simulator Engine State (Regenesis Standard)
  const [strobeThreshold, setStrobeThreshold] = useState(40); // 1 - 100 (default 40)
  const [isWarmActive, setIsWarmActive] = useState(false);
  const [isCoolActive, setIsCoolActive] = useState(false);
  const [isDecodingStrobe, setIsDecodingStrobe] = useState(false);
  const [firstPulseTime, setFirstPulseTime] = useState(null);
  const envelopesRef = useRef({ envL: null, envR: null });

  const category = file?.category || 'other';
  const isStrobe = category === 'lamp' || file?.isStrobe || /strobe|lamp|encoded|hz/i.test(file?.filename || '');
  const isAudio = category === 'audio' || isStrobe;
  const isVideo = category === 'video';
  const isImage = category === 'image';
  const isPlayable = isAudio || isVideo;
  const freqHint = extractFrequencyHint(file?.filename);
  const targetHz = freqHint?.hz || 8.0;

  // 1. Decode Strobe Audio Buffer (Fetch Real WAV from Backend S3 Proxy, Demodulate with 500Hz Difference Engine)
  useEffect(() => {
    if (isOpen && file && isStrobe) {
      setIsDecodingStrobe(true);
      setFirstPulseTime(null);
      envelopesRef.current = { envL: null, envR: null };

      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      const ctx = AudioCtx ? new AudioCtx() : null;

      // Use backend proxy endpoint to bypass S3 CORS and retrieve 100% genuine raw WAV bytes
      const proxyUrl = `${BACKEND_URL}/api/vps/content/s3/proxy-file?url=${encodeURIComponent(file.url)}`;

      fetch(proxyUrl, { headers: getAuthHeaders() })
        .then(res => {
          if (!res.ok) throw new Error(`HTTP error ${res.status}`);
          return res.arrayBuffer();
        })
        .catch(() => {
          // Direct fallback if proxy unavailable
          return fetch(file.url).then(res => res.arrayBuffer());
        })
        .then(ab => {
          if (ctx) {
            return ctx.decodeAudioData(ab);
          }
          throw new Error('AudioContext unavailable');
        })
        .then(audioBuffer => {
          // Extract genuine 500Hz Dual Envelopes (Left = Warm, Right = Cool)
          const envL = extractHighFreqEnvelope(audioBuffer, 0);
          const envR = extractHighFreqEnvelope(audioBuffer, 1);
          envelopesRef.current = { envL, envR };

          // Automatically detect the exact first active pulse timestamp
          const first = findFirstPulseTime(envL, envR, (strobeThreshold / 100) * 255);
          setFirstPulseTime(first);
          setIsDecodingStrobe(false);
        })
        .catch(err => {
          console.warn('Real strobe decoding failed or cancelled:', err.message);
          setIsDecodingStrobe(false);
        });
    }
  }, [isOpen, file, isStrobe, strobeThreshold]);

  // Reset state when file changes or modal opens
  useEffect(() => {
    if (isOpen && file) {
      setIsPlaying(false);
      setCurrentTime(0);
      setDragTime(null);
      setDuration(0);
      setIsBuffering(false);
      setErrorMsg('');
      setIsWarmActive(false);
      setIsCoolActive(false);

      const initialVol = isStrobe ? 0.15 : 1;
      setVolume(initialVol);
      if (mediaRef.current) {
        mediaRef.current.volume = initialVol;
        mediaRef.current.muted = false;
        mediaRef.current.currentTime = 0;
      }
    }
  }, [isOpen, file, isStrobe]);

  // Synchronize audio volume state to audio element
  useEffect(() => {
    if (mediaRef.current) {
      mediaRef.current.volume = isMuted ? 0 : volume;
      mediaRef.current.muted = isMuted;
    }
  }, [volume, isMuted]);

  // 2. Real-Time Strobe Tick & Logic Track Canvas Renderer (Regenesis 500Hz Engine)
  const renderStrobeTick = useCallback(() => {
    const time = dragTime !== null ? dragTime : (mediaRef.current?.currentTime || currentTime);
    const thresh = (strobeThreshold / 100) * 255;
    const idx = Math.floor(time * LOGIC_SAMPLE_RATE);

    const { envL, envR } = envelopesRef.current;

    // A. Update Left (Warm) & Right (Cool) Strobe Light States strictly from real decoded audio data
    if (isPlaying && envL && envR) {
      const valL = (idx >= 0 && idx < envL.length) ? envL[idx] : 0;
      const valR = (idx >= 0 && idx < envR.length) ? envR[idx] : 0;
      setIsWarmActive(valL > thresh);
      setIsCoolActive(valR > thresh);
    } else {
      setIsWarmActive(false);
      setIsCoolActive(false);
    }

    // B. Draw Logic Track Hero Canvas (Dual Lane: Warm Top, Cool Bottom, Yellow Playhead)
    const canvas = canvasHeroRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        const w = canvas.width;
        const h = canvas.height;
        const laneH = h / 2;
        const winSize = 10; // 10 seconds window around playhead
        const startTime = time - (winSize / 2);
        const endTime = time + (winSize / 2);

        ctx.clearRect(0, 0, w, h);
        ctx.fillStyle = '#020617';
        ctx.fillRect(0, 0, w, h);

        // Grid lines
        ctx.strokeStyle = '#1e293b';
        ctx.lineWidth = 1;
        for (let i = 0; i < w; i += w / 10) {
          ctx.beginPath();
          ctx.moveTo(i, 0);
          ctx.lineTo(i, h);
          ctx.stroke();
        }

        // Lane divider
        ctx.strokeStyle = '#334155';
        ctx.beginPath();
        ctx.moveTo(0, laneH);
        ctx.lineTo(w, laneH);
        ctx.stroke();

        const startIdx = Math.floor(startTime * LOGIC_SAMPLE_RATE);
        const endIdx = Math.floor(endTime * LOGIC_SAMPLE_RATE);
        const pxPerIdx = w / (endIdx - startIdx);

        // Draw Warm (Left) Logic Output (Top Lane)
        if (envL) {
          ctx.fillStyle = '#fdba74';
          for (let i = startIdx; i < endIdx; i++) {
            if (i >= 0 && i < envL.length && envL[i] > thresh) {
              ctx.fillRect((i - startIdx) * pxPerIdx, 2, Math.max(1, pxPerIdx + 1), laneH - 4);
            }
          }
        }

        // Draw Cool (Right) Logic Output (Bottom Lane)
        if (envR) {
          ctx.fillStyle = '#7dd3fc';
          for (let i = startIdx; i < endIdx; i++) {
            if (i >= 0 && i < envR.length && envR[i] > thresh) {
              ctx.fillRect((i - startIdx) * pxPerIdx, laneH + 2, Math.max(1, pxPerIdx + 1), laneH - 4);
            }
          }
        }

        // Center Yellow Playhead with Glow
        ctx.strokeStyle = '#facc15';
        ctx.lineWidth = 2;
        ctx.shadowBlur = 8;
        ctx.shadowColor = '#facc15';
        ctx.beginPath();
        ctx.moveTo(w / 2, 0);
        ctx.lineTo(w / 2, h);
        ctx.stroke();
        ctx.shadowBlur = 0;
      }
    }

    if (isPlaying) {
      animationFrameRef.current = requestAnimationFrame(renderStrobeTick);
    }
  }, [isPlaying, currentTime, dragTime, strobeThreshold]);

  useEffect(() => {
    if (isPlaying) {
      animationFrameRef.current = requestAnimationFrame(renderStrobeTick);
    } else {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      renderStrobeTick(); // Render stationary frame on pause/seek
    }
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isPlaying, renderStrobeTick]);

  const togglePlay = () => {
    if (!mediaRef.current) return;
    if (isPlaying) {
      mediaRef.current.pause();
      setIsPlaying(false);
    } else {
      setErrorMsg('');
      const playPromise = mediaRef.current.play();
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            setIsPlaying(true);
          })
          .catch(err => {
            // Ignore benign AbortError when play was quickly followed by pause/seek
            if (err.name !== 'AbortError') {
              setErrorMsg(`Gagal memutar media: ${err.message}`);
            }
          });
      }
    }
  };

  const handleTimeUpdate = () => {
    if (mediaRef.current && dragTime === null) {
      setCurrentTime(mediaRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (mediaRef.current) {
      setDuration(mediaRef.current.duration || 0);
      setIsBuffering(false);
      if (isStrobe) {
        mediaRef.current.volume = volume;
      }
    }
  };

  const handleSeekInput = (e) => {
    const val = parseFloat(e.target.value);
    setDragTime(val);
  };

  const handleSeekChange = (e) => {
    const val = parseFloat(e.target.value);
    setDragTime(null);
    setCurrentTime(val);
    if (mediaRef.current && Number.isFinite(val)) {
      mediaRef.current.currentTime = val;
    }
  };

  const handleSkip = (seconds) => {
    if (!mediaRef.current) return;
    const current = mediaRef.current.currentTime || 0;
    const maxDur = duration || mediaRef.current.duration || 100;
    const targetTime = Math.max(0, Math.min(maxDur, current + seconds));
    mediaRef.current.currentTime = targetTime;
    setCurrentTime(targetTime);
  };

  const jumpToFirstPulse = () => {
    if (firstPulseTime !== null && mediaRef.current) {
      // Seek slightly before first pulse (0.3s before) so user sees the exact onset
      const target = Math.max(0, firstPulseTime - 0.3);
      mediaRef.current.currentTime = target;
      setCurrentTime(target);
      if (!isPlaying) {
        togglePlay();
      }
    }
  };

  const handleVolumeChange = (e) => {
    const val = parseFloat(e.target.value);
    setVolume(val);
    if (mediaRef.current) {
      mediaRef.current.volume = val;
      mediaRef.current.muted = (val === 0);
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

  if (!isOpen || !file) return null;

  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-[1000] flex items-center justify-center p-3 sm:p-5 animate-in fade-in duration-150">
      
      {/* Strobe Bar Glow Styles */}
      <style>{`
        .strobe-warm-glow {
          background-color: #ffedd5 !important;
          border-color: #fdba74 !important;
          color: #7c2d12 !important;
          box-shadow: 0 0 35px 12px rgba(251, 146, 60, 0.9), inset 0 0 15px #fff !important;
        }
        .strobe-cool-glow {
          background-color: #e0f2fe !important;
          border-color: #7dd3fc !important;
          color: #0c4a6e !important;
          box-shadow: 0 0 35px 12px rgba(56, 189, 248, 0.9), inset 0 0 15px #fff !important;
        }
        .vertical-text-pod {
          writing-mode: vertical-rl;
          transform: rotate(180deg);
          white-space: nowrap;
        }
      `}</style>

      <div className={`w-full ${isStrobe ? 'max-w-4xl' : 'max-w-3xl'} bg-slate-950 border ${isStrobe ? 'border-amber-500/40 shadow-amber-500/10' : 'border-cyan-500/40 shadow-cyan-500/10'} rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-200`}>
        
        {/* Modal Header */}
        <div className="p-4 sm:p-5 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className={`p-2.5 rounded-2xl border shrink-0 ${isStrobe
              ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 shadow-lg shadow-amber-500/20'
              : isVideo
                ? 'bg-purple-500/15 text-purple-400 border-purple-500/30'
                : isAudio
                  ? 'bg-sky-500/15 text-sky-400 border-sky-500/30'
                  : isImage
                    ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                    : 'bg-slate-800 text-slate-400 border-slate-700'
              }`}>
              {isStrobe ? <Zap size={18} className="animate-pulse" /> : isVideo ? <Film size={18} /> : isAudio ? <AudioIcon size={18} /> : isImage ? <ImageIcon size={18} /> : <FileCode size={18} />}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-sm sm:text-base font-extrabold text-white truncate" title={file.filename}>
                  {file.filename}
                </h3>
                {isStrobe && (
                  <span className="px-2 py-0.5 rounded-md bg-amber-500/25 text-amber-300 border border-amber-500/40 text-[9.5px] font-bold font-mono uppercase tracking-wider flex items-center gap-1">
                    <Sparkles size={10} />
                    <span>Regenesis Strobe Simulator v2.4</span>
                  </span>
                )}
              </div>
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

        {/* Modal Body */}
        <div className="p-4 sm:p-6 flex flex-col items-center justify-center bg-slate-950/60 overflow-y-auto min-h-[220px]">
          {errorMsg && (
            <div className="mb-4 p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs w-full text-center">
              {errorMsg}
            </div>
          )}

          {/* Unified Audio Element */}
          {isAudio && (
            <audio
              ref={mediaRef}
              src={file.url}
              preload="auto"
              onPlay={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)}
              onEnded={() => { setIsPlaying(false); setCurrentTime(0); }}
              onTimeUpdate={handleTimeUpdate}
              onLoadedMetadata={handleLoadedMetadata}
              onDurationChange={(e) => setDuration(e.target.duration || 0)}
              onWaiting={() => setIsBuffering(true)}
              onPlaying={() => setIsBuffering(false)}
              onCanPlay={() => setIsBuffering(false)}
              onError={() => setErrorMsg('Gagal memutar audio dari S3.')}
            />
          )}

          {/* 1. REGENESIS DUAL STROBE LIGHT BAR SIMULATION & 500Hz LOGIC TRACK */}
          {isStrobe && (
            <div className="w-full flex flex-col gap-4">
              
              {/* Entrainment & Decoder Status Banner */}
              <div className="p-3 rounded-2xl bg-amber-950/30 border border-amber-500/30 flex items-center justify-between gap-3 flex-wrap sm:flex-nowrap">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400 shrink-0">
                    <ShieldAlert size={16} />
                  </div>
                  <div className="min-w-0 text-xs">
                    <div className="text-amber-200 font-bold flex items-center gap-1.5 flex-wrap">
                      <span>Demodulator Sinyal Strobe 19.2kHz (500Hz Logic Engine)</span>
                      {freqHint && (
                        <span className="px-2 py-0.2 rounded-full bg-amber-400 text-slate-950 font-mono text-[10px] font-black">
                          {freqHint.label}
                        </span>
                      )}
                    </div>
                    <p className="text-[10.5px] text-amber-300/70 mt-0.5">
                      Kanal Kiri (L) mengontrol Lampu Warm (Solar), Kanal Kanan (R) mengontrol Lampu Cool (Cyan).
                    </p>
                  </div>
                </div>

                {/* Strobe Status Badge & Jump to First Pulse Button with Rich Loading UX */}
                <div className="flex items-center gap-2 shrink-0 flex-wrap">
                  {isDecodingStrobe ? (
                    <div className="px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-[11px] font-mono flex items-center gap-2 animate-pulse">
                      <Loader2 size={13} className="animate-spin text-amber-400" />
                      <span>Mendekode Sinyal Audio (500Hz)...</span>
                    </div>
                  ) : (
                    <>
                      {firstPulseTime !== null && firstPulseTime > 0.5 ? (
                        <button
                          type="button"
                          onClick={jumpToFirstPulse}
                          className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-black text-[11px] flex items-center gap-1.5 shadow-lg shadow-amber-500/25 transition-all cursor-pointer active:scale-95 animate-pulse"
                          title={`Lompat langsung ke detik ${formatDuration(firstPulseTime)} saat lampu strobe mulai berkedip aktif`}
                        >
                          <Zap size={13} className="fill-slate-950 text-slate-950" />
                          <span>Lompat ke Pulsa ({formatDuration(firstPulseTime)})</span>
                        </button>
                      ) : firstPulseTime !== null ? (
                        <span className="px-2.5 py-1 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 text-[10.5px] font-mono">
                          ⚡ Pulsa aktif dari 00:00
                        </span>
                      ) : (
                        <span className="px-2.5 py-1 rounded-xl bg-slate-900 border border-slate-800 text-slate-500 text-[10.5px] font-mono">
                          Tidak ada pulsa terdeteksi
                        </span>
                      )}

                      <span className={`px-2.5 py-1.5 rounded-xl text-[10.5px] font-mono font-bold flex items-center gap-1.5 border transition-all ${isPlaying
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 shadow-md shadow-emerald-500/10'
                        : 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30'
                        }`}>
                        <span className={`w-2 h-2 rounded-full ${isPlaying ? 'bg-emerald-400 animate-ping' : 'bg-cyan-400'}`} />
                        <span>{isPlaying ? 'PULSA AKTIF' : 'DECODE SIAP (500Hz)'}</span>
                      </span>
                    </>
                  )}
                </div>
              </div>

              {/* Central Dual Light Bar Pod Simulation Area */}
              <div className="flex items-stretch justify-center gap-3 sm:gap-5 py-4 bg-slate-900/60 p-4 rounded-3xl border border-slate-800 min-h-[220px]">
                
                {/* 1. Left Light Bar (WARM L) */}
                <div className="w-12 sm:w-16 flex flex-col items-center justify-center">
                  <div
                    className={`w-full h-44 sm:h-52 rounded-2xl border flex flex-col items-center justify-between p-2 transition-all duration-75 ${isWarmActive
                      ? 'strobe-warm-glow'
                      : 'bg-slate-950 border-slate-800 text-slate-600'
                      }`}
                  >
                    <span className="text-[9px] font-mono font-black uppercase">WARM</span>
                    <Zap size={22} className={isWarmActive ? 'text-amber-950' : 'text-slate-700'} />
                    <span className="vertical-text-pod text-[9.5px] font-mono font-bold tracking-widest">
                      LEFT (L)
                    </span>
                  </div>
                </div>

                {/* 2. Center Pod Core Screen (Audio Wave & Entrainment Indicator) */}
                <div className="flex-1 max-w-sm flex flex-col items-center justify-center bg-slate-950/90 rounded-2xl border border-slate-800/90 p-4 text-center relative overflow-hidden">
                  <div className="text-[11px] font-mono text-slate-400 font-bold mb-1">
                    POD v3 LIGHTING SIMULATOR
                  </div>

                  {isDecodingStrobe ? (
                    <div className="flex flex-col items-center justify-center py-2 my-2">
                      <Loader2 size={24} className="animate-spin text-amber-400 mb-1.5" />
                      <span className="text-[11px] font-mono font-bold text-amber-300">Menganalisis Driver Lampu...</span>
                      <span className="text-[9.5px] font-mono text-slate-500 mt-0.5">Memetakan kanal Warm (L) & Cool (R)</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3 my-3">
                      <div className={`px-3 py-1.5 rounded-xl border text-[11px] font-mono font-bold transition-all ${isWarmActive
                        ? 'bg-amber-400 text-slate-950 border-amber-300 shadow-lg shadow-amber-400/40 scale-105'
                        : 'bg-slate-900 text-slate-500 border-slate-800'
                        }`}>
                        WARM {isWarmActive ? 'ON' : 'OFF'}
                      </div>
                      <span className="text-slate-600 font-bold">&bull;</span>
                      <div className={`px-3 py-1.5 rounded-xl border text-[11px] font-mono font-bold transition-all ${isCoolActive
                        ? 'bg-cyan-400 text-slate-950 border-cyan-300 shadow-lg shadow-cyan-400/40 scale-105'
                        : 'bg-slate-900 text-slate-500 border-slate-800'
                        }`}>
                        COOL {isCoolActive ? 'ON' : 'OFF'}
                      </div>
                    </div>
                  )}

                  <div className="text-[10px] font-mono text-slate-500">
                    Carrier: 19.2 kHz &bull; Logic Rate: 500 Hz
                  </div>
                </div>

                {/* 3. Right Light Bar (COOL R) */}
                <div className="w-12 sm:w-16 flex flex-col items-center justify-center">
                  <div
                    className={`w-full h-44 sm:h-52 rounded-2xl border flex flex-col items-center justify-between p-2 transition-all duration-75 ${isCoolActive
                      ? 'strobe-cool-glow'
                      : 'bg-slate-950 border-slate-800 text-slate-600'
                      }`}
                  >
                    <span className="text-[9px] font-mono font-black uppercase">COOL</span>
                    <Zap size={22} className={isCoolActive ? 'text-sky-950' : 'text-slate-700'} />
                    <span className="vertical-text-pod text-[9.5px] font-mono font-bold tracking-widest">
                      RIGHT (R)
                    </span>
                  </div>
                </div>

              </div>

              {/* 3. Logic Track Hero Canvas (Dual Lane 500Hz Timeline) */}
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between text-xs text-slate-400 font-mono px-1">
                  <div className="flex items-center gap-1.5 text-cyan-300 font-bold">
                    <Activity size={13} />
                    <span>Logic Output Track (Top: L / Warm, Bottom: R / Cool)</span>
                  </div>
                  <span className="text-[10.5px] text-amber-400 font-bold">
                    Threshold: {strobeThreshold}%
                  </span>
                </div>

                <div className="w-full h-24 bg-black rounded-2xl border border-slate-800 p-1 relative shadow-inner overflow-hidden flex items-center justify-center">
                  <canvas
                    ref={canvasHeroRef}
                    width={520}
                    height={90}
                    className="w-full h-full object-contain"
                  />
                  {isDecodingStrobe && (
                    <div className="absolute inset-0 bg-slate-950/85 backdrop-blur-[2px] flex flex-col items-center justify-center text-xs text-amber-300 font-mono gap-1.5 z-20">
                      <div className="flex items-center gap-2 font-bold">
                        <Loader2 size={16} className="animate-spin text-amber-400" />
                        <span>Mengekstrak Matriks Pulsa 500Hz dari File S3...</span>
                      </div>
                      <span className="text-[10px] text-slate-400">Menyusun visualisasi logika kanal Kiri & Kanan</span>
                    </div>
                  )}
                </div>
              </div>

              {/* 4. Sensitivity Threshold & Signal Settings */}
              <div className="flex items-center justify-between gap-4 p-3 bg-slate-900/60 rounded-2xl border border-slate-800/80 flex-wrap text-xs">
                <div className="flex items-center gap-2">
                  <SlidersHorizontal size={14} className="text-amber-400" />
                  <span className="text-slate-300 font-bold text-[11px]">Ambang Sensitivitas (Signal Threshold):</span>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-slate-500 font-mono text-[10px]">1</span>
                  <input
                    type="range"
                    min="1"
                    max="100"
                    step="1"
                    value={strobeThreshold}
                    onChange={e => setStrobeThreshold(parseInt(e.target.value))}
                    className="w-32 sm:w-48 h-1.5 rounded-lg bg-slate-800 accent-amber-400 cursor-pointer appearance-none"
                    title={`Threshold: ${strobeThreshold}%`}
                  />
                  <span className="font-mono text-[11px] text-amber-300 font-bold min-w-[32px]">{strobeThreshold}%</span>
                </div>
              </div>

            </div>
          )}

          {/* 2. REGULAR AUDIO PREVIEW (MUSIC) */}
          {isAudio && !isStrobe && (
            <div className="w-full py-6 flex flex-col items-center">
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

          {/* 3. IMAGE PREVIEW */}
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

          {/* 4. VIDEO PREVIEW */}
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
                  onPlay={() => setIsPlaying(true)}
                  onPause={() => setIsPlaying(false)}
                  onTimeUpdate={handleTimeUpdate}
                  onLoadedMetadata={handleLoadedMetadata}
                  onDurationChange={(e) => setDuration(e.target.duration || 0)}
                  onWaiting={() => setIsBuffering(true)}
                  onPlaying={() => setIsBuffering(false)}
                  onCanPlay={() => setIsBuffering(false)}
                  onError={() => setErrorMsg('Gagal memutar video dari S3.')}
                />

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

          {/* 5. OTHER NON-PLAYABLE */}
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

        {/* Modal Playback Controls */}
        {isPlayable && (
          <div className="p-4 sm:p-5 bg-slate-900/90 border-t border-slate-800 flex flex-col gap-3 shrink-0">
            {/* Timeline Seek Bar */}
            <div className="flex items-center gap-3 w-full">
              <span className="text-[11px] font-mono text-cyan-300 font-bold shrink-0 min-w-[45px]">
                {formatDuration(displayTime)}
              </span>

              <div className="relative flex-1 flex items-center">
                <input
                  type="range"
                  min="0"
                  max={duration > 0 ? duration : 100}
                  step="0.1"
                  value={displayTime}
                  onInput={handleSeekInput}
                  onChange={handleSeekChange}
                  className={`w-full h-2 rounded-lg bg-slate-800 ${isStrobe ? 'accent-amber-400' : 'accent-cyan-400'} cursor-pointer appearance-none focus:outline-none`}
                />

                {/* Strobe First Pulse Cue Marker */}
                {isStrobe && firstPulseTime !== null && duration > 0 && (
                  <div
                    className="absolute top-1/2 -translate-y-1/2 w-1.5 h-3.5 bg-amber-400 rounded-sm pointer-events-none shadow-[0_0_8px_#f59e0b] z-10 opacity-90 border border-amber-200"
                    style={{ left: `${Math.min(99, Math.max(1, (firstPulseTime / duration) * 100))}%` }}
                    title={`Pulsa pertama dimulai pada ${formatDuration(firstPulseTime)}`}
                  />
                )}
              </div>

              <span className="text-[11px] font-mono text-slate-400 font-bold shrink-0 min-w-[45px] text-right">
                {formatDuration(duration)}
              </span>
            </div>

            {/* Playback Controls & Skip Buttons */}
            <div className="flex items-center justify-between gap-3 pt-1">
              <div className="flex items-center gap-2.5 sm:gap-3">
                <button
                  onClick={() => handleSkip(-10)}
                  className="p-2 sm:px-3 sm:py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer border border-slate-700 flex items-center gap-1 text-xs font-bold"
                  title="Mundur 10 detik"
                >
                  <RotateCcw size={14} />
                  <span>-10s</span>
                </button>

                <button
                  onClick={togglePlay}
                  className={`p-3 rounded-2xl ${isStrobe
                    ? 'bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 shadow-amber-500/25'
                    : 'bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 shadow-cyan-500/25'
                    } text-white shadow-lg transition-all cursor-pointer flex items-center justify-center shrink-0 active:scale-95`}
                  title={isBuffering ? 'Memuat stream audio...' : isPlaying ? 'Pause' : 'Play'}
                >
                  {isBuffering ? (
                    <Loader2 size={18} className="animate-spin text-white" />
                  ) : isPlaying ? (
                    <Pause size={18} />
                  ) : (
                    <Play size={18} className="translate-x-0.5" />
                  )}
                </button>

                <button
                  onClick={() => handleSkip(10)}
                  className="p-2 sm:px-3 sm:py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer border border-slate-700 flex items-center gap-1 text-xs font-bold"
                  title="Maju 10 detik"
                >
                  <RotateCw size={14} />
                  <span>+10s</span>
                </button>
              </div>

              {/* Volume Slider & Safe Audio Indicator */}
              <div className="flex items-center gap-2 bg-slate-950/80 px-3 py-2 rounded-xl border border-slate-800">
                <button onClick={toggleMute} className="text-slate-400 hover:text-white cursor-pointer" title={isMuted ? 'Unmute' : 'Mute'}>
                  {isMuted || volume === 0 ? <VolumeX size={15} /> : <Volume2 size={15} />}
                </button>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.02"
                  value={isMuted ? 0 : volume}
                  onChange={handleVolumeChange}
                  className={`w-16 sm:w-20 h-1.5 rounded-lg bg-slate-800 ${isStrobe ? 'accent-amber-400' : 'accent-cyan-400'} cursor-pointer appearance-none`}
                  title={`Volume: ${Math.round(volume * 100)}%`}
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
