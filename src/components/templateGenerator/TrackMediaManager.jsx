import React, { useState, useRef, useEffect } from 'react';
import {
  Film,
  Music,
  Zap,
  Volume2,
  VolumeX,
  Upload,
  Layers,
  Sparkles
} from 'lucide-react';
import { SPEC_PIXELS_PER_SEC } from './audioEngine';

export default function TrackMediaManager({
  videoFile,
  videoSrc,
  onVideoFileChange,
  videoFit,
  setVideoFit,

  audioFile,
  onAudioFileChange,
  audioVolume,
  setAudioVolume,
  isAudioMuted,
  setIsAudioMuted,
  isAudioAnalyzing,
  audioCacheSpec,
  audioCacheWave,
  currentTime,

  strobeFile,
  onStrobeFileChange,
  isStrobeAnalyzing,
  strobeCacheSpecL,
  strobeCacheSpecR,
  strobeEnvelopeL,
  strobeEnvelopeR,
  strobeThreshold,
  setStrobeThreshold,
  isStrobeActive,

  mediaLoadProgress,
  audioLoadProgress = null,
  strobeLoadProgress = null,
  onOpenCatalogPicker
}) {
  const aProg = audioLoadProgress || (mediaLoadProgress?.type === 'audio' ? mediaLoadProgress : null);
  const sProg = strobeLoadProgress || (mediaLoadProgress?.type === 'strobe' ? mediaLoadProgress : null);

  const [audioViewMode, setAudioViewMode] = useState('waveform'); // 'waveform' | 'spectrogram'
  const canvasAudioSpecRef = useRef(null);
  const canvasAudioWaveRef = useRef(null);
  const canvasStrobeLRef = useRef(null);
  const canvasStrobeRRef = useRef(null);
  const canvasStrobeHeroRef = useRef(null);

  // Render Spectrogram & Waveform at current playhead time
  useEffect(() => {
    // 1. Audio Spectrogram
    const specCanvas = canvasAudioSpecRef.current;
    if (specCanvas) {
      const ctx = specCanvas.getContext('2d');
      const w = specCanvas.width;
      const h = specCanvas.height;
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(0, 0, w, h);

      if (audioCacheSpec) {
        const centerSec = currentTime;
        const windowSec = 10;
        const startSec = Math.max(0, centerSec - windowSec / 2);
        const startPixel = Math.floor(startSec * SPEC_PIXELS_PER_SEC);
        const sourceWidth = Math.floor(windowSec * SPEC_PIXELS_PER_SEC);

        ctx.drawImage(audioCacheSpec, startPixel, 0, sourceWidth, audioCacheSpec.height, 0, 0, w, h);
      }

      // Playhead center marker
      ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
      ctx.fillRect(w / 2, 0, 1, h);
    }

    // 2. Audio Waveform
    const waveCanvas = canvasAudioWaveRef.current;
    if (waveCanvas) {
      const ctx = waveCanvas.getContext('2d');
      const w = waveCanvas.width;
      const h = waveCanvas.height;
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(0, 0, w, h);

      if (audioCacheWave) {
        const centerSec = currentTime;
        const windowSec = 10;
        const startSec = Math.max(0, centerSec - windowSec / 2);
        const startPixel = Math.floor(startSec * SPEC_PIXELS_PER_SEC);
        const sourceWidth = Math.floor(windowSec * SPEC_PIXELS_PER_SEC);

        ctx.drawImage(audioCacheWave, startPixel, 0, sourceWidth, audioCacheWave.height, 0, 0, w, h);
      }

      ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
      ctx.fillRect(w / 2, 0, 1, h);
    }

    // 3. Strobe L
    const strobeLCanvas = canvasStrobeLRef.current;
    if (strobeLCanvas) {
      const ctx = strobeLCanvas.getContext('2d');
      const w = strobeLCanvas.width;
      const h = strobeLCanvas.height;
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(0, 0, w, h);

      if (strobeCacheSpecL) {
        const startSec = Math.max(0, currentTime - 5);
        const startPixel = Math.floor(startSec * SPEC_PIXELS_PER_SEC);
        const sourceWidth = Math.floor(10 * SPEC_PIXELS_PER_SEC);
        ctx.drawImage(strobeCacheSpecL, startPixel, 0, sourceWidth, strobeCacheSpecL.height, 0, 0, w, h);
      }
      ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
      ctx.fillRect(w / 2, 0, 1, h);
    }

    // 4. Strobe R
    const strobeRCanvas = canvasStrobeRRef.current;
    if (strobeRCanvas) {
      const ctx = strobeRCanvas.getContext('2d');
      const w = strobeRCanvas.width;
      const h = strobeRCanvas.height;
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(0, 0, w, h);

      if (strobeCacheSpecR) {
        const startSec = Math.max(0, currentTime - 5);
        const startPixel = Math.floor(startSec * SPEC_PIXELS_PER_SEC);
        const sourceWidth = Math.floor(10 * SPEC_PIXELS_PER_SEC);
        ctx.drawImage(strobeCacheSpecR, startPixel, 0, sourceWidth, strobeCacheSpecR.height, 0, 0, w, h);
      }
      ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
      ctx.fillRect(w / 2, 0, 1, h);
    }

    // 5. Strobe Hero (Logic Output)
    const heroCanvas = canvasStrobeHeroRef.current;
    if (heroCanvas) {
      const ctx = heroCanvas.getContext('2d');
      const w = heroCanvas.width;
      const h = heroCanvas.height;
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, w, h);

      if (strobeEnvelopeL && strobeEnvelopeR) {
        const sampleRate = 500;
        const windowSec = 10;
        const startSec = Math.max(0, currentTime - windowSec / 2);
        const startSample = Math.floor(startSec * sampleRate);
        const sampleCount = Math.floor(windowSec * sampleRate);

        for (let x = 0; x < w; x++) {
          const sampleIdx = startSample + Math.floor((x / w) * sampleCount);
          const valL = strobeEnvelopeL[sampleIdx] || 0;
          const valR = strobeEnvelopeR[sampleIdx] || 0;

          if (valL > strobeThreshold) {
            ctx.fillStyle = '#f59e0b';
            ctx.fillRect(x, 0, 1, h / 2);
          }
          if (valR > strobeThreshold) {
            ctx.fillStyle = '#38bdf8';
            ctx.fillRect(x, h / 2, 1, h / 2);
          }
        }
      }

      // Hero Playhead center line
      ctx.fillStyle = '#facc15';
      ctx.fillRect(w / 2 - 1, 0, 2, h);
    }
  }, [
    currentTime,
    audioCacheSpec,
    audioCacheWave,
    strobeCacheSpecL,
    strobeCacheSpecR,
    strobeEnvelopeL,
    strobeEnvelopeR,
    strobeThreshold
  ]);

  return (
    <div className="space-y-4">
      {/* Catalog Quick Button */}
      {onOpenCatalogPicker && (
        <button
          type="button"
          onClick={onOpenCatalogPicker}
          className="w-full py-2 px-3 rounded-xl bg-gradient-to-r from-purple-900/40 via-indigo-900/40 to-slate-900 border border-purple-500/40 hover:border-purple-400 text-purple-200 text-xs font-bold transition flex items-center justify-center gap-2 shadow-sm"
        >
          <Sparkles size={14} className="text-purple-400" />
          Pilih Media dari Katalog Multimedia S3 Server
        </button>
      )}

      {/* TRACK 1: VIDEO */}
      <div className="bg-slate-950 rounded-xl border border-slate-800 p-3 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-1.5 h-full bg-purple-500 rounded-l"></div>
        <div className="flex justify-between items-center pl-2">
          <div className="flex items-center gap-2 min-w-0 pr-2">
            <Film size={15} className="text-purple-400 shrink-0" />
            <div className="min-w-0">
              <span className="font-bold text-xs text-white block">Video Layar</span>
              <span className="text-[11px] font-mono text-purple-300 truncate block">
                {videoFile?.name ? videoFile.name : 'Belum ada video dipilih'}
              </span>
            </div>
          </div>
          <label className="cursor-pointer bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-[11px] font-semibold px-2.5 py-1 rounded-lg transition border border-slate-700 flex items-center gap-1 shrink-0">
            <Upload size={12} />
            <span>Pilih MP4</span>
            <input
              type="file"
              accept="video/mp4,video/webm"
              onChange={onVideoFileChange}
              className="hidden"
            />
          </label>
        </div>
      </div>

      {/* TRACK 2: AUDIO */}
      <div className="bg-slate-950 rounded-xl border border-slate-800 p-3 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-1.5 h-full bg-emerald-500 rounded-l"></div>
        <div className="flex justify-between items-center mb-2 pl-2">
          <div className="flex items-center gap-2">
            <Music size={15} className="text-emerald-400" />
            <span className="font-bold text-xs text-white">Track 2: Audio Akustik & Vibro</span>
          </div>
          <label className="cursor-pointer bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-[11px] font-semibold px-2.5 py-1 rounded-lg transition border border-slate-700 flex items-center gap-1">
            <Upload size={12} />
            <span>Pilih Audio</span>
            <input
              type="file"
              accept="audio/*"
              onChange={onAudioFileChange}
              className="hidden"
            />
          </label>
        </div>

        <div className="pl-2 space-y-1.5">
          <div className="flex items-center justify-between text-[11px]">
            <span className="font-mono text-emerald-300 truncate max-w-[200px]">
              {audioFile?.name ? audioFile.name : 'Belum ada audio dipilih'}
            </span>
            {/* View Mode Toggle Pills */}
            <div className="flex items-center gap-1 bg-slate-900 p-0.5 rounded-lg border border-slate-800">
              <button
                type="button"
                onClick={() => setAudioViewMode('waveform')}
                className={`px-1.5 py-0.5 rounded text-[9px] font-bold transition ${audioViewMode === 'waveform'
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                    : 'text-slate-400 hover:text-white'
                  }`}
              >
                Waveform
              </button>
              <button
                type="button"
                onClick={() => setAudioViewMode('spectrogram')}
                className={`px-1.5 py-0.5 rounded text-[9px] font-bold transition ${audioViewMode === 'spectrogram'
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                    : 'text-slate-400 hover:text-white'
                  }`}
              >
                FFT Spektrogram
              </button>
            </div>
          </div>

          {/* Unified Compact Canvas Display */}
          <div className="h-11 bg-slate-900 rounded-lg border border-slate-800 relative overflow-hidden">
            <canvas
              ref={canvasAudioWaveRef}
              width={380}
              height={44}
              className={`w-full h-full ${audioViewMode === 'waveform' ? 'block' : 'hidden'}`}
            />
            <canvas
              ref={canvasAudioSpecRef}
              width={380}
              height={44}
              className={`w-full h-full ${audioViewMode === 'spectrogram' ? 'block' : 'hidden'}`}
            />
            {isAudioAnalyzing && (
              <div className="absolute inset-0 bg-slate-950/95 flex flex-col items-center justify-center p-1.5 text-center text-[10px] text-emerald-400 font-mono z-10 space-y-1">
                <div className="flex items-center gap-1.5 font-bold">
                  <div className="w-3 h-3 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
                  <span>
                    {aProg?.stage === 'downloading'
                      ? `Mengunduh: ${aProg.pct != null ? `${aProg.pct}%` : ''}`
                      : aProg?.stage === 'decoding'
                        ? 'Mendekode PCM...'
                        : aProg?.stage === 'analyzing'
                          ? 'Menganalisis Audio (FFT)...'
                          : 'Memproses Audio...'}
                  </span>
                </div>
                {aProg?.mbText && (
                  <span className="text-[9px] text-emerald-300/80">
                    {aProg.mbText}
                  </span>
                )}
                {aProg && (
                  <div className="w-36 max-w-full bg-slate-900 rounded-full h-1 overflow-hidden border border-slate-700">
                    <div
                      className={`bg-emerald-400 h-full transition-all duration-150 ${aProg.pct == null ? 'w-full animate-pulse' : ''}`}
                      style={aProg.pct != null ? { width: `${aProg.pct}%` } : {}}
                    />
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Volume Control */}
          <div className="flex items-center gap-2 pt-0.5">
            <button
              type="button"
              onClick={() => setIsAudioMuted(!isAudioMuted)}
              className="text-slate-400 hover:text-white transition"
              title={isAudioMuted ? 'Unmute' : 'Mute'}
            >
              {isAudioMuted ? <VolumeX size={14} /> : <Volume2 size={14} />}
            </button>
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={isAudioMuted ? 0 : audioVolume}
              onChange={(e) => {
                setAudioVolume(parseFloat(e.target.value));
                if (isAudioMuted) setIsAudioMuted(false);
              }}
              className="flex-1 accent-emerald-400 cursor-pointer h-1.5"
            />
            <span className="text-[10px] font-mono text-emerald-400 w-8 text-right font-bold">
              {isAudioMuted ? '0%' : `${Math.round(audioVolume * 100)}%`}
            </span>
          </div>
        </div>
      </div>

      {/* TRACK 3: STROBE DECODE (19.2kHz) */}
      <div className="bg-slate-950 rounded-xl border border-slate-800 p-3 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-1.5 h-full bg-sky-500 rounded-l"></div>
        <div className="flex justify-between items-center mb-2 pl-2">
          <div className="flex items-center gap-2">
            <Zap size={15} className="text-sky-400" />
            <span className="font-bold text-xs text-white">Track 3: Strobe Signal (19.2kHz Decode)</span>
          </div>
          <label className="cursor-pointer bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-[11px] font-semibold px-2.5 py-1 rounded-lg transition border border-slate-700 flex items-center gap-1">
            <Upload size={12} />
            <span>Pilih Signal</span>
            <input
              type="file"
              accept="audio/*"
              onChange={onStrobeFileChange}
              className="hidden"
            />
          </label>
        </div>

        <div className="pl-2 space-y-1.5">
          <div className="flex items-center justify-between text-[10px] pb-0.5">
            <span className="text-slate-400 font-mono">Status Modulasi 19.2kHz:</span>
            <span className={`px-2 py-0.5 rounded text-[9px] font-bold border transition-all ${isStrobeActive
              ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
              : 'bg-slate-900 text-slate-500 border-slate-800'
              }`}>
              {isStrobeActive ? '✓ Sinyal Strobo Terbaca' : 'Menunggu Berkas'}
            </span>
          </div>

          {strobeFile?.name && (
            <div className="text-[11px] font-mono text-sky-300 truncate">
              File: {strobeFile.name}
            </div>
          )}

          {/* Strobe L & R Channels (Side by Side) */}
          <div className="grid grid-cols-2 gap-1.5">
            {/* Strobe L (Warm) */}
            <div className="h-9 bg-slate-900 rounded-lg border border-slate-800 relative overflow-hidden">
              <canvas ref={canvasStrobeLRef} width={200} height={36} className="w-full h-full block" />
              <span className="absolute top-0.5 left-1.5 text-[8px] font-bold text-amber-300 pointer-events-none opacity-90">
                L (Warm Strobe)
              </span>
            </div>

            {/* Strobe R (Cool) */}
            <div className="h-9 bg-slate-900 rounded-lg border border-slate-800 relative overflow-hidden">
              <canvas ref={canvasStrobeRRef} width={200} height={36} className="w-full h-full block" />
              <span className="absolute top-0.5 left-1.5 text-[8px] font-bold text-sky-300 pointer-events-none opacity-90">
                R (Cool Strobe)
              </span>
            </div>
          </div>

          {/* Logic Output Canvas */}
          <div className="h-8 bg-black border border-slate-700 rounded-lg relative overflow-hidden">
            <canvas ref={canvasStrobeHeroRef} width={380} height={32} className="w-full h-full block" />
            <span className="absolute top-0.5 left-1.5 text-[7.5px] font-bold text-slate-400 pointer-events-none uppercase">
              Logic Output (19.2kHz)
            </span>
            {isStrobeAnalyzing && (
              <div className="absolute inset-0 bg-slate-950/95 flex flex-col items-center justify-center p-1 text-center text-[10px] text-sky-400 font-mono z-10 space-y-0.5">
                <div className="flex items-center gap-1.5 font-bold">
                  <div className="w-3 h-3 border-2 border-sky-400 border-t-transparent rounded-full animate-spin" />
                  <span>
                    {sProg?.stage === 'downloading'
                      ? `Mengunduh: ${sProg.pct != null ? `${sProg.pct}%` : ''}`
                      : sProg?.stage === 'decoding'
                        ? 'Mendekode PCM...'
                        : sProg?.stage === 'analyzing'
                          ? 'Mengekstrak 19.2kHz...'
                          : 'Memproses Sinyal Strobo...'}
                  </span>
                </div>
                {sProg?.mbText && (
                  <span className="text-[8.5px] text-sky-300/80">
                    {sProg.mbText}
                  </span>
                )}
                {sProg && (
                  <div className="w-36 max-w-full bg-slate-900 rounded-full h-1 overflow-hidden border border-slate-700">
                    <div
                      className={`bg-sky-400 h-full transition-all duration-150 ${sProg.pct == null ? 'w-full animate-pulse' : ''}`}
                      style={sProg.pct != null ? { width: `${sProg.pct}%` } : {}}
                    />
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Sensitivity Threshold */}
          <div className="bg-slate-900 p-2 rounded-lg border border-slate-800 mt-2">
            <div className="flex justify-between text-[10px] font-semibold text-slate-400 mb-1">
              <span>Threshold Sensitivitas</span>
              <span className={`font-mono font-bold ${isStrobeActive ? 'text-sky-400' : 'text-slate-500'}`}>
                {isStrobeActive ? 'Sinyal Aktif' : 'Menunggu Sinyal'}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-slate-500 w-16">Ambang:</span>
              <input
                type="range"
                min="1"
                max="100"
                value={strobeThreshold}
                onChange={(e) => setStrobeThreshold(Number(e.target.value))}
                className="flex-1 accent-sky-400 cursor-pointer"
              />
              <span className="text-[10px] font-mono text-white w-6 text-right font-bold">
                {strobeThreshold}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
