import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  ArrowLeft,
  Sparkles,
  Save,
  Download,
  AlertCircle,
  CheckCircle2,
  Layers,
  RefreshCw,
  Search,
  X,
  FileVideo,
  Music,
  Wind,
  Code,
  Loader2,
  Zap
} from 'lucide-react';
import {
  saveTemplateApi,
  fetchMultimediaCatalogApi
} from '../api/vpsApi';
import {
  updateDetailExperienceApi,
  addDetailExperienceApi
} from '../api/modules/podSessionApi';
import {
  getAudioContext,
  ensureAudioContextRunning,
  extractHighFreqEnvelope,
  generateSpectrogramCache,
  generateWaveformCache,
  createAcousticFilters,
  fetchAudioBufferFromUrl,
  safeEncodeURI
} from '../components/templateGenerator/audioEngine';
import {
  DEFAULT_SIMULATOR_SESSION,
  parseTimeStrToSeconds,
  convertSimulatorToMasterPayload,
  convertMasterPayloadToSimulator
} from '../components/templateGenerator/templateConverter';

import VirtualPodSimulator from '../components/templateGenerator/VirtualPodSimulator';
import EnclosureVideoMonitor from '../components/templateGenerator/EnclosureVideoMonitor';
import TrackMediaManager from '../components/templateGenerator/TrackMediaManager';
import TimelineVisualizerLanes from '../components/templateGenerator/TimelineVisualizerLanes';
import VisualBuilderEvents from '../components/templateGenerator/VisualBuilderEvents';
import ModeConfigForm from '../components/templateGenerator/ModeConfigForm';
import JsonTemplateEditor from '../components/templateGenerator/JsonTemplateEditor';
import BatchApplyModal from '../components/podSessions/BatchApplyModal';

export default function TemplateGeneratorPage({
  onBack,
  onNavigateView,
  initialContext = null,
  initialTemplateData = null
}) {
  // 1. Session Model Data
  const [sessionData, setSessionData] = useState(() => {
    if (initialContext?.detailItem) {
      return convertMasterPayloadToSimulator({
        template_name: initialContext.detailItem.title || initialContext.detailItem.song || 'Signature Experience',
        target_session: initialContext.signatureName || 'RECHARGE',
        detail_experience: initialContext.detailItem
      });
    }
    if (initialTemplateData) {
      return initialTemplateData;
    }
    return DEFAULT_SIMULATOR_SESSION;
  });

  // Deck Tabs: 'media' | 'events' | 'modes' | 'json'
  const [activeDeckTab, setActiveDeckTab] = useState('media');

  // 2. Transport & Playback State
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(() => {
    const vDur = Number(initialTemplateData?.videoFile?.duration || 0);
    const aDur = Number(initialTemplateData?.audioFile?.duration || 0);
    const sDur = Number(initialTemplateData?.strobeFile?.duration || 0);
    const maxDur = Math.max(vDur, aDur, sDur);
    if (maxDur > 10000) return maxDur / 1000;
    if (maxDur > 0) return maxDur;
    return 1200; // 20 minutes default for standard Regenesis pod session (never 60s / 1 min)
  });

  // Track media durations so duration strictly adapts to loaded files
  const mediaDurationsRef = useRef({
    video: Number(initialTemplateData?.videoFile?.duration || 0) > 10000
      ? Number(initialTemplateData?.videoFile?.duration) / 1000
      : Number(initialTemplateData?.videoFile?.duration || 0),
    audio: Number(initialTemplateData?.audioFile?.duration || 0) > 10000
      ? Number(initialTemplateData?.audioFile?.duration) / 1000
      : Number(initialTemplateData?.audioFile?.duration || 0),
    strobe: Number(initialTemplateData?.strobeFile?.duration || 0) > 10000
      ? Number(initialTemplateData?.strobeFile?.duration) / 1000
      : Number(initialTemplateData?.strobeFile?.duration || 0)
  });

  const syncMediaDuration = useCallback((type, dur) => {
    if (!dur || isNaN(dur) || dur <= 0) return;
    mediaDurationsRef.current[type] = dur;

    // Determine the actual session duration from currently active media
    const activeDurations = Object.entries(mediaDurationsRef.current)
      .map(([, v]) => v)
      .filter((v) => v > 0);

    if (activeDurations.length > 0) {
      const maxDur = Math.max(...activeDurations);
      setDuration(maxDur);

      // Keep sessionData in sync with real file duration in milliseconds
      setSessionData((prev) => {
        const fileKey = type === 'video' ? 'videoFile' : type === 'audio' ? 'audioFile' : 'strobeFile';
        const currObj = prev[fileKey] || {};
        return {
          ...prev,
          [fileKey]: {
            ...currObj,
            duration: String(Math.round(dur * 1000))
          }
        };
      });
    }
  }, []);

  const [isPlaying, setIsPlaying] = useState(false);
  const [isRepeat, setIsRepeat] = useState(false);
  const [systemStatus, setSystemStatus] = useState('Ready');
  const [audioCtxState, setAudioCtxState] = useState('Suspended');

  // 3. Media Files & Streams
  const videoRef = useRef(null);
  const [videoFile, setVideoFile] = useState(null);
  const [videoSrc, setVideoSrc] = useState(null);
  const [videoFit, setVideoFit] = useState('width'); // 'width' | 'height'

  const [audioFile, setAudioFile] = useState(null);
  const audioBufferRef = useRef(null);
  const audioSourceRef = useRef(null);
  const audioGainRef = useRef(null);
  const [audioVolume, setAudioVolume] = useState(0.7);
  const [isAudioMuted, setIsAudioMuted] = useState(false);
  const [isAudioAnalyzing, setIsAudioAnalyzing] = useState(false);
  const [audioCacheSpec, setAudioCacheSpec] = useState(null);
  const [audioCacheWave, setAudioCacheWave] = useState(null);
  const [mediaLoadProgress, setMediaLoadProgress] = useState(null); // legacy fallback
  const [audioLoadProgress, setAudioLoadProgress] = useState(null); // { filename, stage, pct, mbText }
  const [strobeLoadProgress, setStrobeLoadProgress] = useState(null); // { filename, stage, pct, mbText }
  const catalogLoadIdRef = useRef(0);
  const activeLoadAbortControllerRef = useRef(null);
  const isMountedRef = useRef(true);

  const [strobeFile, setStrobeFile] = useState(null);
  const strobeBufferRef = useRef(null);
  const [isStrobeAnalyzing, setIsStrobeAnalyzing] = useState(false);
  const [strobeCacheSpecL, setStrobeCacheSpecL] = useState(null);
  const [strobeCacheSpecR, setStrobeCacheSpecR] = useState(null);
  const [strobeEnvelopeL, setStrobeEnvelopeL] = useState(null);
  const [strobeEnvelopeR, setStrobeEnvelopeR] = useState(null);
  const [strobeThreshold, setStrobeThreshold] = useState(40);
  const [isStrobeActive, setIsStrobeActive] = useState(false);

  // 4. Live Simulation Output States
  const [isStrobeWarmOn, setIsStrobeWarmOn] = useState(false);
  const [isStrobeCoolOn, setIsStrobeCoolOn] = useState(false);
  const [olfActive, setOlfActive] = useState(false);
  const [olfLabel, setOlfLabel] = useState('idle');
  const [pemfActive, setPemfActive] = useState(false);
  const [pemfLabel, setPemfLabel] = useState('idle');
  const [nirActive, setNirActive] = useState(false);
  const [nirLabel, setNirLabel] = useState('idle');
  const [speakerActivity, setSpeakerActivity] = useState(0);
  const [transducerActivity, setTransducerActivity] = useState(0);
  const [subwooferActivity, setSubwooferActivity] = useState(0);

  // 5. System Log & Overlays
  const [systemLogs, setSystemLogs] = useState([]);
  const [isLogOpen, setIsLogOpen] = useState(false);
  const [isScreenOverlayOpen, setIsScreenOverlayOpen] = useState(false);

  // 6. S3 Multimedia Catalog Picker Modal
  const [isCatalogOpen, setIsCatalogOpen] = useState(false);
  const [catalogItems, setCatalogItems] = useState([]);
  const [catalogSearch, setCatalogSearch] = useState('');

  // 7. Modals & Alerts
  const [isBatchApplyOpen, setIsBatchApplyOpen] = useState(false);
  const [batchData, setBatchData] = useState(null);
  const [error, setError] = useState(null);
  const [notification, setNotification] = useState(null);

  // 8. Vertical Timeline Resizing
  const [timelineHeight, setTimelineHeight] = useState(() => {
    try {
      const saved = localStorage.getItem('regenesis_timeline_height');
      const num = saved ? Number(saved) : 285;
      return !isNaN(num) && num >= 175 && num <= 560 ? num : 285;
    } catch {
      return 285;
    }
  });
  const [isTimelineDragging, setIsTimelineDragging] = useState(false);
  const dragStartYRef = useRef(0);
  const startHeightRef = useRef(285);

  const handleSplitterMouseDown = (e) => {
    e.preventDefault();
    setIsTimelineDragging(true);
    dragStartYRef.current = e.clientY;
    startHeightRef.current = timelineHeight;

    const handleMouseMove = (moveEvent) => {
      const delta = dragStartYRef.current - moveEvent.clientY;
      const maxAllowed = Math.max(220, Math.min(560, window.innerHeight - 260));
      const newHeight = Math.min(maxAllowed, Math.max(160, startHeightRef.current + delta));
      setTimelineHeight(newHeight);
      try {
        localStorage.setItem('regenesis_timeline_height', String(newHeight));
      } catch {}
    };

    const handleMouseUp = () => {
      setIsTimelineDragging(false);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  const playStartTimeRef = useRef(0);
  const pauseTimeRef = useRef(0);
  const animFrameRef = useRef(null);

  const logMessage = useCallback((msg) => {
    const timeStr = new Date().toLocaleTimeString();
    setSystemLogs((prev) => [{ time: timeStr, message: msg }, ...prev.slice(0, 40)]);
  }, []);

  // Update AudioContext state indicator
  const checkAudioContext = useCallback(() => {
    try {
      const ctx = getAudioContext();
      setAudioCtxState(ctx.state === 'running' ? 'Running' : 'Suspended');
    } catch (e) { }
  }, []);

  useEffect(() => {
    const timer = setInterval(checkAudioContext, 1000);
    return () => clearInterval(timer);
  }, [checkAudioContext]);

  // Handle Playback Loop
  const stopAudioBuffer = () => {
    if (audioSourceRef.current) {
      try {
        audioSourceRef.current.stop();
        audioSourceRef.current.disconnect();
      } catch (e) { }
      audioSourceRef.current = null;
    }
    if (audioGainRef.current) {
      try {
        audioGainRef.current.gain.value = 0;
        audioGainRef.current.disconnect();
      } catch (e) { }
      audioGainRef.current = null;
    }
  };

  // Ensure all playback and background tasks are immediately stopped when leaving the page
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      stopAudioBuffer();
      if (videoRef.current) {
        try {
          videoRef.current.pause();
        } catch (e) { }
      }
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, []);

  const startAudioBufferAt = (offsetSec) => {
    stopAudioBuffer();
    if (!audioBufferRef.current) return;

    try {
      const ctx = getAudioContext();
      const src = ctx.createBufferSource();
      src.buffer = audioBufferRef.current;

      const gain = ctx.createGain();
      gain.gain.value = isAudioMuted ? 0 : audioVolume;
      audioGainRef.current = gain;

      src.connect(gain);
      gain.connect(ctx.destination);

      createAcousticFilters(ctx, src);

      src.start(0, Math.max(0, offsetSec));
      audioSourceRef.current = src;
    } catch (err) {
      console.error('Failed to start audio buffer:', err);
    }
  };

  // Play / Pause
  const handlePlayPause = async () => {
    await ensureAudioContextRunning();
    checkAudioContext();

    if (isPlaying) {
      // Pause
      setIsPlaying(false);
      setSystemStatus('Paused');
      pauseTimeRef.current = currentTime;
      stopAudioBuffer();
      if (videoRef.current) videoRef.current.pause();
      logMessage(`Paused at ${currentTime.toFixed(2)}s`);
    } else {
      // Play
      setIsPlaying(true);
      setSystemStatus('Playing');
      const startAt = currentTime >= duration ? 0 : currentTime;
      playStartTimeRef.current = performance.now() - startAt * 1000;

      if (videoRef.current) {
        videoRef.current.currentTime = startAt;
        videoRef.current.play().catch(() => { });
      }
      startAudioBufferAt(startAt);
      logMessage(`Started playing at ${startAt.toFixed(2)}s`);
    }
  };

  // Stop
  const handleStop = () => {
    setIsPlaying(false);
    setSystemStatus('Ready');
    setCurrentTime(0);
    pauseTimeRef.current = 0;
    stopAudioBuffer();
    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.currentTime = 0;
    }
    // Turn off live signals
    setIsStrobeWarmOn(false);
    setIsStrobeCoolOn(false);
    setOlfActive(false);
    setOlfLabel('idle');
    setPemfActive(false);
    setPemfLabel('idle');
    setNirActive(false);
    setNirLabel('idle');
    setSpeakerActivity(0);
    setTransducerActivity(0);
    setSubwooferActivity(0);
    logMessage('Stopped & reset to 00:00');
  };

  const handleBack = () => {
    handleStop();
    if (onBack) onBack();
  };

  // Seek
  const handleSeek = (newTime) => {
    const clamped = Math.max(0, Math.min(duration, newTime));
    setCurrentTime(clamped);
    pauseTimeRef.current = clamped;

    if (videoRef.current) {
      videoRef.current.currentTime = clamped;
    }

    if (isPlaying) {
      playStartTimeRef.current = performance.now() - clamped * 1000;
      startAudioBufferAt(clamped);
    }
  };

  // Toggle Repeat
  const handleToggleRepeat = () => {
    setIsRepeat((prev) => !prev);
    logMessage(`Repeat mode ${!isRepeat ? 'enabled' : 'disabled'}`);
  };

  // Real-time animation ticker
  useEffect(() => {
    const tick = () => {
      if (isPlaying) {
        const elapsedSec = (performance.now() - playStartTimeRef.current) / 1000;
        if (elapsedSec >= duration) {
          if (isRepeat) {
            handleSeek(0);
          } else {
            handleStop();
            return;
          }
        } else {
          setCurrentTime(elapsedSec);
        }
      }

      // 1. Evaluate Strobe Lights from Envelopes
      if (strobeEnvelopeL && strobeEnvelopeR) {
        const sampleRate = 500;
        const sampleIdx = Math.floor(currentTime * sampleRate);
        const valL = strobeEnvelopeL[sampleIdx] || 0;
        const valR = strobeEnvelopeR[sampleIdx] || 0;

        const warmOn = valL > strobeThreshold;
        const coolOn = valR > strobeThreshold;
        setIsStrobeWarmOn(warmOn);
        setIsStrobeCoolOn(coolOn);
      }

      // 2. Evaluate Modalities (OLF, PEMF, NIR)
      // OLF
      const activeOlf = (sessionData.olfactoryEvents || []).find((ev) => {
        const start = parseTimeStrToSeconds(ev[0]);
        const durSec = (Number(ev[2]) || 3000) / 1000;
        return currentTime >= start && currentTime <= start + durSec;
      });
      if (activeOlf) {
        setOlfActive(true);
        setOlfLabel(`BURST: ${activeOlf[1]} (${activeOlf[2] || 3000}ms)`);
      } else {
        setOlfActive(false);
        setOlfLabel('idle');
      }

      // PEMF
      const activePemf = (sessionData.pemfEvents || []).find((ev) => {
        const start = parseTimeStrToSeconds(ev[0]);
        const mode = parseInt(ev[1]) || 1;
        const durSec = mode === 2 ? 30 : (mode === 3 ? 3 : 10);
        return currentTime >= start && currentTime <= start + durSec;
      });
      if (activePemf) {
        setPemfActive(true);
        setPemfLabel(`MODE ${activePemf[1]}: ACTIVE`);
      } else {
        setPemfActive(false);
        setPemfLabel('idle');
      }

      // NIR
      const activeNir = (sessionData.nirEvents || []).find((ev) => {
        const start = parseTimeStrToSeconds(ev[0]);
        const mode = parseInt(ev[1]) || 1;
        const durSec = mode === 2 ? 30 : (mode === 3 ? 3 : 10);
        return currentTime >= start && currentTime <= start + durSec;
      });
      if (activeNir) {
        setNirActive(true);
        setNirLabel(`MODE ${activeNir[1]}: ACTIVE`);
      } else {
        setNirActive(false);
        setNirLabel('idle');
      }

      // Acoustic Activity
      if (isPlaying && audioBufferRef.current) {
        const bassActivity = Math.abs(Math.sin(currentTime * 8)) * 0.7;
        setSpeakerActivity(Math.abs(Math.sin(currentTime * 14)) * 0.6);
        setTransducerActivity(bassActivity);
        setSubwooferActivity(bassActivity * 0.9);
      } else {
        setSpeakerActivity(0);
        setTransducerActivity(0);
        setSubwooferActivity(0);
      }

      animFrameRef.current = requestAnimationFrame(tick);
    };

    animFrameRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animFrameRef.current);
  }, [
    isPlaying,
    currentTime,
    duration,
    isRepeat,
    strobeEnvelopeL,
    strobeEnvelopeR,
    strobeThreshold,
    sessionData
  ]);

  // Update volume live
  useEffect(() => {
    if (audioGainRef.current) {
      audioGainRef.current.gain.value = isAudioMuted ? 0 : audioVolume;
    }
  }, [audioVolume, isAudioMuted]);

  // Update strobe lights when paused or scrubbing
  useEffect(() => {
    if (!isPlaying && strobeEnvelopeL && strobeEnvelopeR) {
      const sampleRate = 500;
      const sampleIdx = Math.floor(currentTime * sampleRate);
      const valL = strobeEnvelopeL[sampleIdx] || 0;
      const valR = strobeEnvelopeR[sampleIdx] || 0;
      setIsStrobeWarmOn(valL > strobeThreshold);
      setIsStrobeCoolOn(valR > strobeThreshold);
    }
  }, [isPlaying, currentTime, strobeEnvelopeL, strobeEnvelopeR, strobeThreshold]);

  // Video loader
  const handleVideoFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setVideoFile(file);
    const url = URL.createObjectURL(file);
    setVideoSrc(url);

    // Reset video duration ref to avoid old file duration bias
    mediaDurationsRef.current.video = 0;

    if (videoRef.current) {
      videoRef.current.src = url;
      videoRef.current.load();
      videoRef.current.onloadedmetadata = () => {
        const dur = videoRef.current.duration;
        if (dur && isFinite(dur) && dur > 0) {
          syncMediaDuration('video', dur);
          logMessage(`Video terpasang: ${file.name} (${dur.toFixed(1)}s)`);
        }
      };
    }
  };

  // Audio loader
  const handleAudioFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setAudioFile(file);
    setIsAudioAnalyzing(true);
    const initialProg = {
      filename: file.name,
      stage: 'decoding',
      pct: 50,
      mbText: `${(file.size / (1024 * 1024)).toFixed(1)} MB`
    };
    setAudioLoadProgress(initialProg);
    setMediaLoadProgress({ type: 'audio', ...initialProg });
    logMessage(`Analyzing audio: ${file.name}...`);
    mediaDurationsRef.current.audio = 0;

    try {
      const arrayBuffer = await file.arrayBuffer();
      const ctx = getAudioContext();
      ctx.decodeAudioData(arrayBuffer, async (buffer) => {
        audioBufferRef.current = buffer;
        syncMediaDuration('audio', buffer.duration);

        const analyzingProg = {
          filename: file.name,
          stage: 'analyzing',
          pct: 85,
          mbText: 'Menghitung Waveform...'
        };
        setAudioLoadProgress(analyzingProg);
        setMediaLoadProgress({ type: 'audio', ...analyzingProg });

        const specCanvas = await generateSpectrogramCache(buffer, 0);
        const waveCanvas = await generateWaveformCache(buffer, 0);
        setAudioCacheSpec(specCanvas);
        setAudioCacheWave(waveCanvas);
        setIsAudioAnalyzing(false);
        setAudioLoadProgress(null);
        setMediaLoadProgress(null);
        logMessage(`Audio loaded & FFT cached (${buffer.duration.toFixed(1)}s)`);
      });
    } catch (err) {
      setIsAudioAnalyzing(false);
      setAudioLoadProgress(null);
      setMediaLoadProgress(null);
      setError(`Gagal menganalisis audio: ${err.message}`);
    }
  };

  // Strobe signal loader
  const handleStrobeFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setStrobeFile(file);
    setIsStrobeAnalyzing(true);
    const initialProg = {
      filename: file.name,
      stage: 'decoding',
      pct: 40,
      mbText: `${(file.size / (1024 * 1024)).toFixed(1)} MB`
    };
    setStrobeLoadProgress(initialProg);
    setMediaLoadProgress({ type: 'strobe', ...initialProg });
    logMessage(`Analyzing strobe signal: ${file.name}...`);
    mediaDurationsRef.current.strobe = 0;

    try {
      const arrayBuffer = await file.arrayBuffer();
      const ctx = getAudioContext();
      ctx.decodeAudioData(arrayBuffer, async (buffer) => {
        strobeBufferRef.current = buffer;
        syncMediaDuration('strobe', buffer.duration);

        const analyzingProg = {
          filename: file.name,
          stage: 'analyzing',
          pct: 80,
          mbText: 'Mengekstrak 19.2kHz...'
        };
        setStrobeLoadProgress(analyzingProg);
        setMediaLoadProgress({ type: 'strobe', ...analyzingProg });

        const specL = await generateSpectrogramCache(buffer, 0);
        const specR = await generateSpectrogramCache(buffer, 1);
        const envL = extractHighFreqEnvelope(buffer, 0);
        const envR = extractHighFreqEnvelope(buffer, 1);

        setStrobeCacheSpecL(specL);
        setStrobeCacheSpecR(specR);
        setStrobeEnvelopeL(envL);
        setStrobeEnvelopeR(envR);
        setIsStrobeAnalyzing(false);
        setIsStrobeActive(true);
        setStrobeLoadProgress(null);
        setMediaLoadProgress(null);
        logMessage(`Strobe 19.2kHz envelopes decoded successfully! (${buffer.duration.toFixed(1)}s)`);
      });
    } catch (err) {
      setIsStrobeAnalyzing(false);
      setStrobeLoadProgress(null);
      setMediaLoadProgress(null);
      setError(`Gagal menganalisis strobe: ${err.message}`);
    }
  };

  // Helper to parse duration from catalog metadata (never default to 60s)
  const parseCatalogDuration = (raw) => {
    if (!raw) return 1200;
    if (typeof raw === 'string' && raw.includes(':')) {
      const s = parseTimeStrToSeconds(raw);
      if (s > 0) return s;
    }
    const num = Number(raw);
    if (isNaN(num) || num <= 0) return 1200;
    if (num > 10000) return num / 1000; // ms to seconds (e.g. 1200000 -> 1200s)
    if (num <= 120) return num * 60;   // minutes to seconds (e.g. 20 -> 1200s)
    return num; // already in seconds
  };

  // Load catalog items for S3 picker
  const handleOpenCatalog = () => {
    setIsCatalogOpen(true);
    fetchMultimediaCatalogApi()
      .then((items) => setCatalogItems(items || []))
      .catch((err) => console.error(err));
  };

  // Helper to accurately resolve AWS S3 URLs for catalog items
  const S3_BASE = 'https://developerfile-084897310273.s3.ap-southeast-1.amazonaws.com';
  const resolveMediaUrl = (soundScape, raw) => {
    if (!raw) return '';
    const s = String(raw).trim();
    if (!s || s === '0' || s === 'null' || s === 'undefined') return '';
    if (s.startsWith('http://') || s.startsWith('https://')) return safeEncodeURI(s);
    if (s.startsWith('/media/') || s.startsWith('media/')) {
      const p = s.startsWith('/') ? s : '/' + s;
      return safeEncodeURI(`${S3_BASE}${p}`);
    }
    if (s.startsWith('/')) {
      return safeEncodeURI(`${S3_BASE}${s}`);
    }
    const cleanCode = String(soundScape || '').trim().replace(/^\/+|\/+$/g, '');
    if (cleanCode && cleanCode !== '0' && cleanCode !== 'null' && cleanCode !== 'undefined') {
      const cleanS = s.startsWith(`${cleanCode}/`) ? s.substring(cleanCode.length + 1) : s;
      return safeEncodeURI(`${S3_BASE}/media/${cleanCode}/${cleanS}`);
    }
    return safeEncodeURI(`${S3_BASE}/${s}`);
  };

  const handleSelectCatalogItem = async (item) => {
    if (!item) return;

    // Immediately close modal so user sees the studio & smooth sequential loading
    setIsCatalogOpen(false);

    let soundScape = item.sound_scape;
    if ((!soundScape || soundScape === '0' || soundScape === 'null') && catalogItems && catalogItems.length > 0) {
      const matched = catalogItems.find(c =>
        (item.song && (c.song === item.song || c.music === item.song)) ||
        (item.music && (c.music === item.music || c.song === item.music))
      );
      if (matched?.sound_scape) {
        soundScape = matched.sound_scape;
      }
    }

    const title = item.title || item.tittle || `SoundScape #${soundScape || item.id || ''}`;
    const musicFilename = item.music || item.song || (item.musicUrl ? item.musicUrl.split('/').pop().split('?')[0] : '');
    const videoFilename = item.video || (item.videoUrl ? item.videoUrl.split('/').pop().split('?')[0] : '');
    const lampFilename = item.lamp ? item.lamp.split('/').pop().split('?')[0] : '';

    const directMusicUrl = resolveMediaUrl(soundScape, item.musicUrl || item.music || item.song);
    const directVideoUrl = resolveMediaUrl(soundScape, item.videoUrl || item.video);
    const directLampUrl = resolveMediaUrl(soundScape, item.lampUrl || item.lamp);

    // Stop current audio & issue new load ID and abort controller to cancel previous loads
    stopAudioBuffer();
    if (activeLoadAbortControllerRef.current) {
      try {
        activeLoadAbortControllerRef.current.abort();
      } catch (e) { }
    }
    const abortController = new AbortController();
    activeLoadAbortControllerRef.current = abortController;
    const currentLoadId = ++catalogLoadIdRef.current;

    // Reset media duration refs for new catalog item
    mediaDurationsRef.current = { video: 0, audio: 0, strobe: 0 };
    const parsedDurationSec = parseCatalogDuration(item.duration);
    setDuration(parsedDurationSec);

    // Reset old media caches
    setAudioCacheSpec(null);
    setAudioCacheWave(null);
    setStrobeCacheSpecL(null);
    setStrobeCacheSpecR(null);
    setStrobeEnvelopeL(null);
    setStrobeEnvelopeR(null);
    setIsStrobeActive(false);

    // Convert Master API detail item into Simulator Session format (including burst_time olfactory, generator_frequency pemf, nir)
    const convertedFromDetail = convertMasterPayloadToSimulator({
      template_name: title,
      detail_experience: item
    });

    // Update Session Model JSON
    setSessionData((prev) => ({
      ...prev,
      ...convertedFromDetail,
      name: title,
      detail_experience: item,
      audioFile: { path: musicFilename || directMusicUrl || 'audio.mp3', duration: String(Math.round(parsedDurationSec * 1000)) },
      videoFile: { path: videoFilename || directVideoUrl || 'video.mp4', duration: String(Math.round(parsedDurationSec * 1000)) },
      strobeFile: { path: lampFilename || directLampUrl || 'lamp.wav', duration: String(Math.round(parsedDurationSec * 1000)) }
    }));

    // 1. Load Video (Track 1, Virtual Screen & Timeline)
    if (directVideoUrl) {
      setVideoFile({ name: videoFilename || 'catalog_video.mp4', url: directVideoUrl });
      setVideoSrc(directVideoUrl);
      if (videoRef.current) {
        videoRef.current.src = directVideoUrl;
        videoRef.current.load();
        videoRef.current.onloadedmetadata = () => {
          const vd = videoRef.current.duration;
          if (vd && isFinite(vd) && vd > 0) {
            syncMediaDuration('video', vd);
            logMessage(`Video terpasang: ${videoFilename || 'catalog_video.mp4'} (${vd.toFixed(1)}s)`);
          }
          try {
            videoRef.current.currentTime = 0.001;
          } catch (e) { }
        };
      }
    } else {
      setVideoFile(null);
      setVideoSrc('');
    }

    // 2. Sequential Step 1: Load Audio Track FIRST
    if (directMusicUrl) {
      setAudioFile({ name: musicFilename || 'catalog_audio.mp3', url: directMusicUrl });
      setIsAudioAnalyzing(true);
      setAudioLoadProgress({
        filename: musicFilename || 'catalog_audio.mp3',
        stage: 'downloading',
        pct: 0,
        mbText: 'Menghubungkan S3...'
      });
      logMessage(`[1/2] Mengunduh & memproses audio: ${musicFilename || 'audio.mp3'}...`);

      try {
        const buffer = await fetchAudioBufferFromUrl(
          directMusicUrl,
          (prog) => {
            if (!isMountedRef.current || catalogLoadIdRef.current !== currentLoadId) return;
            setAudioLoadProgress({
              filename: musicFilename || 'catalog_audio.mp3',
              stage: prog.stage,
              pct: prog.pct,
              mbText: prog.mbText
            });
          },
          abortController.signal
        );

        if (!isMountedRef.current || catalogLoadIdRef.current !== currentLoadId) return;

        if (buffer) {
          audioBufferRef.current = buffer;
          syncMediaDuration('audio', buffer.duration);

          setAudioLoadProgress({
            filename: musicFilename || 'catalog_audio.mp3',
            stage: 'analyzing',
            pct: 90,
            mbText: 'Menghitung Waveform & FFT...'
          });

          const spec = await generateSpectrogramCache(buffer, 0);
          const wave = await generateWaveformCache(buffer, 0);

          if (!isMountedRef.current || catalogLoadIdRef.current !== currentLoadId) return;

          setAudioCacheSpec(spec);
          setAudioCacheWave(wave);
          setIsAudioAnalyzing(false);
          setAudioLoadProgress({
            filename: musicFilename || 'catalog_audio.mp3',
            stage: 'ready',
            pct: 100,
            mbText: `${buffer.duration.toFixed(1)}s Siap`
          });
          logMessage(`[1/2] Audio berhasil dimuat & FFT di-cache (${buffer.duration.toFixed(1)}s)`);

          // If no separate lamp file, scan 19.2kHz strobe tone from audio channels
          if (!directLampUrl) {
            const envL = extractHighFreqEnvelope(buffer, 0);
            const envR = extractHighFreqEnvelope(buffer, buffer.numberOfChannels > 1 ? 1 : 0);
            setStrobeEnvelopeL(envL);
            setStrobeEnvelopeR(envR);
            setIsStrobeActive(true);
            logMessage(`Sinyal strobo 19.2kHz berhasil dipindai dari trek audio utama.`);
          }
        }
      } catch (err) {
        if (!isMountedRef.current || catalogLoadIdRef.current !== currentLoadId) return;
        setIsAudioAnalyzing(false);
        setAudioLoadProgress(null);
        console.warn('Audio catalog load error:', err.message);
        logMessage(`Peringatan audio: ${err.message}`);
      }
    } else {
      setAudioFile(null);
      setIsAudioAnalyzing(false);
      setAudioLoadProgress(null);
    }

    // 3. Sequential Step 2: Load Strobe / Lamp Track SECOND (Only after Audio is completed!)
    if (directLampUrl) {
      if (!isMountedRef.current || catalogLoadIdRef.current !== currentLoadId) return;

      setStrobeFile({ name: lampFilename || 'catalog_strobe.wav', url: directLampUrl });
      setIsStrobeAnalyzing(true);
      setStrobeLoadProgress({
        filename: lampFilename || 'catalog_strobe.wav',
        stage: 'downloading',
        pct: 0,
        mbText: 'Menghubungkan S3...'
      });
      logMessage(`[2/2] Mengunduh & memproses berkas strobo: ${lampFilename}...`);

      try {
        const buffer = await fetchAudioBufferFromUrl(
          directLampUrl,
          (prog) => {
            if (!isMountedRef.current || catalogLoadIdRef.current !== currentLoadId) return;
            setStrobeLoadProgress({
              filename: lampFilename || 'catalog_strobe.wav',
              stage: prog.stage,
              pct: prog.pct,
              mbText: prog.mbText
            });
          },
          abortController.signal
        );

        if (!isMountedRef.current || catalogLoadIdRef.current !== currentLoadId) return;

        if (buffer) {
          strobeBufferRef.current = buffer;
          syncMediaDuration('strobe', buffer.duration);

          setStrobeLoadProgress({
            filename: lampFilename || 'catalog_strobe.wav',
            stage: 'analyzing',
            pct: 90,
            mbText: 'Mengekstrak 19.2kHz...'
          });

          const specL = await generateSpectrogramCache(buffer, 0);
          const specR = await generateSpectrogramCache(buffer, buffer.numberOfChannels > 1 ? 1 : 0);
          const envL = extractHighFreqEnvelope(buffer, 0);
          const envR = extractHighFreqEnvelope(buffer, buffer.numberOfChannels > 1 ? 1 : 0);

          if (!isMountedRef.current || catalogLoadIdRef.current !== currentLoadId) return;

          setStrobeCacheSpecL(specL);
          setStrobeCacheSpecR(specR);
          setStrobeEnvelopeL(envL);
          setStrobeEnvelopeR(envR);
          setIsStrobeAnalyzing(false);
          setIsStrobeActive(true);
          setStrobeLoadProgress({
            filename: lampFilename || 'catalog_strobe.wav',
            stage: 'ready',
            pct: 100,
            mbText: '19.2kHz Aktif'
          });
          logMessage(`[2/2] Berkas strobo berhasil didekode (19.2kHz aktif, ${buffer.duration.toFixed(1)}s).`);
        }
      } catch (err) {
        if (!isMountedRef.current || catalogLoadIdRef.current !== currentLoadId) return;
        setIsStrobeAnalyzing(false);
        setStrobeLoadProgress(null);
        console.warn('Strobe catalog load error:', err.message);
        logMessage(`Peringatan strobo: ${err.message}`);
      }
    } else {
      setStrobeFile(null);
      setIsStrobeAnalyzing(false);
      setStrobeLoadProgress(null);
    }

    logMessage(`Pemuatan seluruh aset SoundScape selesai: ${title}`);

    // Clean up completed HUD progress badges smoothly after 2.5 seconds
    setTimeout(() => {
      if (isMountedRef.current && catalogLoadIdRef.current === currentLoadId) {
        setAudioLoadProgress(null);
        setStrobeLoadProgress(null);
        setMediaLoadProgress(null);
      }
    }, 2500);
  };

  // Save to Template Library
  const handleSaveToTemplateLibrary = async (masterPayload) => {
    try {
      const tplPayload = {
        template_name: masterPayload.template_name || sessionData.name || 'Studio Session',
        target_session: masterPayload.target_session || 'RECHARGE',
        description: `Dibuat melalui Template Generator Studio (${sessionData.olfactoryEvents?.length || 0} OLF, ${sessionData.pemfEvents?.length || 0} PEMF, ${sessionData.nirEvents?.length || 0} NIR)`,
        detail_experience: masterPayload.detail_experience,
        author: 'Studio Operator'
      };
      await saveTemplateApi(tplPayload);
      setNotification(`Template "${tplPayload.template_name}" berhasil disimpan ke Template Library!`);
    } catch (err) {
      setError(`Gagal menyimpan template: ${err.message}`);
    }
  };

  // Batch Apply to PODs
  const handleOpenBatchApply = (masterPayload) => {
    setBatchData(masterPayload);
    setIsBatchApplyOpen(true);
  };

  // Direct Save to POD Signature in Master API
  const [isSavingToPod, setIsSavingToPod] = useState(false);

  const handleSaveToPodSignature = async () => {
    if (!initialContext?.podSettingId || !initialContext?.signatureId) {
      setError('Konteks POD Setting ID atau Signature ID tidak ditemukan.');
      return;
    }

    try {
      setIsSavingToPod(true);
      setError(null);

      const converted = convertSimulatorToMasterPayload(sessionData, initialContext.signatureName || 'RECHARGE');
      const cleanDetail = converted.detail_experience;

      const orig = sessionData.detail_experience || initialContext.detailItem || {};
      cleanDetail.id = orig.id;
      cleanDetail.order = orig.order || 1;
      cleanDetail.sound_scape = orig.sound_scape || '';
      cleanDetail.artist = orig.artist || 'Regenesis';
      cleanDetail.album = orig.album || 'Regenesis';
      cleanDetail.cover_album = orig.cover_album || 'cover_album.png';
      cleanDetail.label = orig.label || '';
      cleanDetail.label_tag = orig.label_tag || '';
      cleanDetail.caption = orig.caption || '';
      cleanDetail.description = orig.description || '';
      cleanDetail.stroboscopic_light = orig.stroboscopic_light ?? 50;
      cleanDetail.led_intensity = orig.led_intensity ?? 30;
      cleanDetail.audio_surround_sound = orig.audio_surround_sound ?? 50;
      cleanDetail.vibro_acoustics = orig.vibro_acoustics ?? 50;
      cleanDetail.infra_red_nea_ir = orig.infra_red_nea_ir ?? 30;
      cleanDetail.infra_red_far_ir = orig.infra_red_far_ir ?? 30;
      cleanDetail.group_ids = orig.group_ids || [];

      if (audioFile?.name) cleanDetail.song = audioFile.name;
      if (strobeFile?.name) cleanDetail.lamp = strobeFile.name;
      if (videoFile?.name) cleanDetail.video = videoFile.name;

      const payload = {
        group_ids: orig.group_ids || [],
        detail_experience: [cleanDetail]
      };

      if (orig.id) {
        await updateDetailExperienceApi(initialContext.podSettingId, initialContext.signatureId, payload);
        setNotification(`Track "${cleanDetail.title}" berhasil disimpan ke Master API POD (${initialContext.podName || 'POD'})!`);
        logMessage(`Berhasil memperbarui track "${cleanDetail.title}" pada POD #${initialContext.podSettingId}`);
      } else {
        delete cleanDetail.id;
        await addDetailExperienceApi(initialContext.podSettingId, initialContext.signatureId, payload);
        setNotification(`Track "${cleanDetail.title}" baru berhasil ditambahkan ke POD (${initialContext.podName || 'POD'})!`);
        logMessage(`Berhasil menambahkan track baru ke POD #${initialContext.podSettingId}`);
      }
    } catch (err) {
      console.error('Error saving to POD Signature:', err);
      setError(`Gagal menyimpan ke Master API: ${err.message}`);
      logMessage(`Error simpan POD: ${err.message}`);
    } finally {
      setIsSavingToPod(false);
    }
  };

  // Auto-load media files from S3 if opening a specific POD Signature detail item
  const initialTrackId = initialContext?.detailItem?.id;
  const initialSoundScape = initialContext?.detailItem?.sound_scape;
  const initialSong = initialContext?.detailItem?.song;
  const initialLamp = initialContext?.detailItem?.lamp;
  const initialVideo = initialContext?.detailItem?.video;
  const initialPodId = initialContext?.podSettingId;
  const initialSigId = initialContext?.signatureId;

  useEffect(() => {
    if (!initialContext?.detailItem) return;
    const item = initialContext.detailItem;

    if (item.sound_scape || item.song || item.lamp || item.video) {
      logMessage(`Memuat media otomatis dari S3 untuk sesi POD ${initialContext.podName || ''}: ${item.title || item.song || 'Track'}...`);
      handleSelectCatalogItem(item);
    }

    return () => {
      catalogLoadIdRef.current++;
      if (activeLoadAbortControllerRef.current) {
        try {
          activeLoadAbortControllerRef.current.abort();
        } catch (e) { }
      }
    };
  }, [initialTrackId, initialSoundScape, initialSong, initialLamp, initialVideo, initialPodId, initialSigId]);

  const totalEvents =
    (sessionData?.olfactoryEvents?.length || 0) +
    (sessionData?.pemfEvents?.length || 0) +
    (sessionData?.nirEvents?.length || 0);

  return (
    <div className="h-full max-h-full flex-1 min-h-0 bg-slate-950 text-slate-100 flex flex-col overflow-hidden font-sans rounded-xl border border-slate-800/80 shadow-2xl">
      {/* Top Slim Studio Header Bar */}
      <header className="h-12 bg-slate-900 border-b border-slate-800 flex items-center justify-between px-3 sm:px-4 shrink-0 z-30 shadow-md">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          {onBack && (
            <button
              type="button"
              onClick={handleBack}
              className="px-2.5 py-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition flex items-center gap-1.5 text-xs font-bold shrink-0"
              title="Kembali ke POD Sessions"
            >
              <ArrowLeft size={15} />
              <span className="hidden sm:inline">Kembali</span>
            </button>
          )}

          <div className="h-4 w-[1px] bg-slate-800 hidden sm:block" />

          {/* Session Title Input */}
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-[10px] font-black uppercase text-amber-400 tracking-wider hidden md:inline shrink-0">
              STUDIO SESSION
            </span>
            <input
              type="text"
              value={sessionData.name || ''}
              onChange={(e) => setSessionData({ ...sessionData, name: e.target.value })}
              placeholder="Nama Sesi Template..."
              className="px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-700 text-xs text-white font-bold focus:border-amber-400 focus:outline-none w-44 sm:w-56 truncate"
            />
          </div>

          {/* Duration Badge */}
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-amber-300 border border-slate-700 shrink-0">
            {Math.floor(duration / 60)}m {Math.round(duration % 60)}s
          </span>

          {/* POD Signature Context Badge */}
          {initialContext?.podSettingId && (
            <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-300 text-[11px] font-mono shrink-0">
              <span className="font-bold text-white">{initialContext.podName || `POD #${initialContext.podSettingId}`}</span>
              <span className="text-amber-500">•</span>
              <span className="font-bold text-amber-400">{initialContext.signatureName || 'Signature'}</span>
              {initialContext?.tracks?.length > 1 ? (
                <>
                  <span className="text-amber-500">•</span>
                  <select
                    value={sessionData.detail_experience?.id || initialContext.detailItem?.id || ''}
                    onChange={(e) => {
                      const selectedTrack = initialContext.tracks.find((t) => String(t.id) === e.target.value);
                      if (selectedTrack) {
                        logMessage(`Beralih ke track #${selectedTrack.order || ''}: ${selectedTrack.title || selectedTrack.song}`);
                        handleSelectCatalogItem(selectedTrack);
                      }
                    }}
                    className="bg-slate-900 border border-amber-500/40 rounded px-1.5 py-0.5 text-cyan-300 text-[11px] font-bold focus:outline-none cursor-pointer"
                  >
                    {initialContext.tracks.map((t, idx) => (
                      <option key={t.id || idx} value={t.id} className="bg-slate-900 text-white">
                        #{t.order || idx + 1} {t.title || t.song || `Track ${idx + 1}`}
                      </option>
                    ))}
                  </select>
                </>
              ) : (sessionData.detail_experience?.title || initialContext.detailItem?.title) ? (
                <>
                  <span className="text-amber-500">•</span>
                  <span className="text-cyan-300 max-w-[140px] truncate">
                    #{(sessionData.detail_experience || initialContext.detailItem).order || 1} {(sessionData.detail_experience || initialContext.detailItem).title}
                  </span>
                </>
              ) : null}
            </div>
          )}
        </div>

        {/* Top Right Quick Actions */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          <button
            type="button"
            onClick={handleOpenCatalog}
            className="px-2.5 py-1.5 rounded-lg bg-purple-900/40 hover:bg-purple-900/60 border border-purple-500/40 text-purple-200 text-xs font-semibold transition flex items-center gap-1.5 shadow-sm cursor-pointer"
          >
            <Sparkles size={13} className="text-purple-400" />
            <span className="hidden md:inline">Katalog S3</span>
          </button>

          {/* Direct Save to POD Button when in POD Signature context */}
          {initialContext?.podSettingId && (
            <button
              type="button"
              disabled={isSavingToPod}
              onClick={handleSaveToPodSignature}
              className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 text-xs font-bold transition flex items-center gap-1.5 shadow-md shadow-amber-500/20 disabled:opacity-50 cursor-pointer"
              title="Simpan perubahan langsung ke Master API untuk POD ini"
            >
              {isSavingToPod ? (
                <Loader2 size={13} className="animate-spin text-slate-950" />
              ) : (
                <Save size={13} className="text-slate-950" />
              )}
              <span>Simpan ke POD</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => {
              const payload = convertSimulatorToMasterPayload(sessionData, duration);
              handleSaveToTemplateLibrary(payload);
            }}
            className="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-sm cursor-pointer"
          >
            <Save size={13} />
            <span className="hidden sm:inline">Simpan Template</span>
          </button>

          <button
            type="button"
            onClick={() => {
              const payload = convertSimulatorToMasterPayload(sessionData, duration);
              handleOpenBatchApply(payload);
            }}
            className="px-2.5 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-sm cursor-pointer"
          >
            <Layers size={13} />
            <span className="hidden lg:inline">Batch Apply</span>
          </button>
        </div>
      </header>

      {/* Alert Banners */}
      {error && (
        <div className="p-2 bg-rose-500/10 border-b border-rose-500/30 text-rose-300 text-xs flex items-center justify-between px-4 shrink-0">
          <div className="flex items-center gap-2">
            <AlertCircle size={14} />
            <span>{error}</span>
          </div>
          <button onClick={() => setError(null)} className="text-rose-400 hover:text-rose-200 text-sm">
            &times;
          </button>
        </div>
      )}

      {notification && (
        <div className="p-2 bg-emerald-500/10 border-b border-emerald-500/30 text-emerald-300 text-xs flex items-center justify-between px-4 shrink-0">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={14} />
            <span>{notification}</span>
          </div>
          <button onClick={() => setNotification(null)} className="text-emerald-400 hover:text-emerald-200 text-sm">
            &times;
          </button>
        </div>
      )}

      {/* Main Workspace: Left Full-Height Video + Right Area (Cockpit & Timeline) */}
      <div className="flex-1 flex min-h-0 overflow-hidden">
        {/* FAR LEFT: Enclosure Video Monitor (995:3840) spanning full-height down to the bottom of the timeline! */}
        <EnclosureVideoMonitor
          videoRef={videoRef}
          videoSrc={videoSrc}
          videoFit={videoFit}
          onVideoLoadedMetadata={(dur) => syncMediaDuration('video', dur)}
          isScreenOverlayOpen={isScreenOverlayOpen}
          setIsScreenOverlayOpen={setIsScreenOverlayOpen}
        />

        {/* RIGHT WORKSPACE: Top Cockpit/Inspector + Bottom Timeline */}
        <div className="flex-1 flex flex-col min-h-0 min-w-0 overflow-hidden">
          {/* Top Half: Strobe & Hardware Cockpit + Tabbed Inspector Deck */}
          <main className="flex-1 flex flex-col lg:flex-row min-h-0 overflow-hidden border-b border-slate-800">
            {/* Center: Strobe & Hardware Telemetry Simulator */}
            <div className="flex-1 flex flex-col min-h-0 min-w-0 overflow-hidden bg-slate-950/60 border-r border-slate-800">
              <VirtualPodSimulator
                isStrobeWarmOn={isStrobeWarmOn}
                isStrobeCoolOn={isStrobeCoolOn}
                strobeEnvelopeL={strobeEnvelopeL}
                strobeEnvelopeR={strobeEnvelopeR}
                strobeThreshold={strobeThreshold}
                setStrobeThreshold={setStrobeThreshold}
                currentTime={currentTime}
                isPlaying={isPlaying}
                isStrobeAnalyzing={isStrobeAnalyzing}
                isStrobeActive={isStrobeActive}
                strobeFile={strobeFile}
                mediaLoadProgress={mediaLoadProgress}
                audioLoadProgress={audioLoadProgress}
                strobeLoadProgress={strobeLoadProgress}
                onSeek={handleSeek}
                olfActive={olfActive}
                olfLabel={olfLabel}
                pemfActive={pemfActive}
                pemfLabel={pemfLabel}
                nirActive={nirActive}
                nirLabel={nirLabel}
                speakerActivity={speakerActivity}
                transducerActivity={transducerActivity}
                subwooferActivity={subwooferActivity}
                systemLogs={systemLogs}
                isLogOpen={isLogOpen}
                setIsLogOpen={setIsLogOpen}
              />
            </div>

            {/* Right Side: Tabbed Interactive Session Builder & Inspector Deck */}
            <section className="w-full lg:w-[460px] xl:w-[500px] bg-slate-900 flex flex-col shrink-0 z-10 shadow-xl min-h-0 overflow-hidden">
              {/* Deck Tab Header Navigation */}
              <div className="border-b border-slate-800 bg-slate-950/80 px-2 pt-2 flex items-center gap-1 shrink-0 overflow-x-auto scrollbar-none">
                <button
                  type="button"
                  onClick={() => setActiveDeckTab('media')}
                  className={`px-3 py-1.5 rounded-t-lg text-xs font-bold transition flex items-center gap-1.5 border-t border-x shrink-0 ${
                    activeDeckTab === 'media'
                      ? 'bg-slate-900 text-white border-slate-700 -mb-[1px] border-b-transparent shadow-sm'
                      : 'bg-transparent text-slate-400 hover:text-slate-200 border-transparent hover:bg-slate-800/40'
                  }`}
                >
                  <FileVideo size={13} className={activeDeckTab === 'media' ? 'text-purple-400' : 'text-slate-400'} />
                  <span>Media & S3</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveDeckTab('events')}
                  className={`px-3 py-1.5 rounded-t-lg text-xs font-bold transition flex items-center gap-1.5 border-t border-x shrink-0 ${
                    activeDeckTab === 'events'
                      ? 'bg-slate-900 text-white border-slate-700 -mb-[1px] border-b-transparent shadow-sm'
                      : 'bg-transparent text-slate-400 hover:text-slate-200 border-transparent hover:bg-slate-800/40'
                  }`}
                >
                  <Sparkles size={13} className={activeDeckTab === 'events' ? 'text-amber-400' : 'text-slate-400'} />
                  <span>Event List</span>
                  {totalEvents > 0 && (
                    <span className="text-[9px] font-mono px-1.5 py-0.2 rounded-full bg-amber-500/20 text-amber-300 font-bold ml-0.5">
                      {totalEvents}
                    </span>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => setActiveDeckTab('modes')}
                  className={`px-3 py-1.5 rounded-t-lg text-xs font-bold transition flex items-center gap-1.5 border-t border-x shrink-0 ${
                    activeDeckTab === 'modes'
                      ? 'bg-slate-900 text-white border-slate-700 -mb-[1px] border-b-transparent shadow-sm'
                      : 'bg-transparent text-slate-400 hover:text-slate-200 border-transparent hover:bg-slate-800/40'
                  }`}
                >
                  <Wind size={13} className={activeDeckTab === 'modes' ? 'text-cyan-400' : 'text-slate-400'} />
                  <span>Modes</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveDeckTab('json')}
                  className={`px-3 py-1.5 rounded-t-lg text-xs font-bold transition flex items-center gap-1.5 border-t border-x shrink-0 ${
                    activeDeckTab === 'json'
                      ? 'bg-slate-900 text-white border-slate-700 -mb-[1px] border-b-transparent shadow-sm'
                      : 'bg-transparent text-slate-400 hover:text-slate-200 border-transparent hover:bg-slate-800/40'
                  }`}
                >
                  <Code size={13} className={activeDeckTab === 'json' ? 'text-emerald-400' : 'text-slate-400'} />
                  <span>JSON & Apply</span>
                </button>
              </div>

              {/* Deck Tab Content Body */}
              <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-4 scrollbar-thin">
                {activeDeckTab === 'media' && (
                  <TrackMediaManager
                    videoFile={videoFile}
                    videoSrc={videoSrc}
                    onVideoFileChange={handleVideoFileChange}
                    videoFit={videoFit}
                    setVideoFit={setVideoFit}
                    audioFile={audioFile}
                    onAudioFileChange={handleAudioFileChange}
                    audioVolume={audioVolume}
                    setAudioVolume={setAudioVolume}
                    isAudioMuted={isAudioMuted}
                    setIsAudioMuted={setIsAudioMuted}
                    isAudioAnalyzing={isAudioAnalyzing}
                    audioCacheSpec={audioCacheSpec}
                    audioCacheWave={audioCacheWave}
                    currentTime={currentTime}
                    strobeFile={strobeFile}
                    onStrobeFileChange={handleStrobeFileChange}
                    isStrobeAnalyzing={isStrobeAnalyzing}
                    strobeCacheSpecL={strobeCacheSpecL}
                    strobeCacheSpecR={strobeCacheSpecR}
                    strobeEnvelopeL={strobeEnvelopeL}
                    strobeEnvelopeR={strobeEnvelopeR}
                    strobeThreshold={strobeThreshold}
                    setStrobeThreshold={setStrobeThreshold}
                    isStrobeActive={isStrobeActive}
                    mediaLoadProgress={mediaLoadProgress}
                    audioLoadProgress={audioLoadProgress}
                    strobeLoadProgress={strobeLoadProgress}
                    onOpenCatalogPicker={handleOpenCatalog}
                  />
                )}

                {activeDeckTab === 'events' && (
                  <VisualBuilderEvents
                    sessionData={sessionData}
                    onUpdateSessionData={setSessionData}
                  />
                )}

                {activeDeckTab === 'modes' && (
                  <ModeConfigForm
                    sessionData={sessionData}
                    onUpdateSessionData={setSessionData}
                  />
                )}

                {activeDeckTab === 'json' && (
                  <JsonTemplateEditor
                    sessionData={sessionData}
                    onUpdateSessionData={setSessionData}
                    onSaveToTemplateLibrary={handleSaveToTemplateLibrary}
                    onOpenBatchApply={handleOpenBatchApply}
                    initialContext={initialContext}
                    onSaveToPod={initialContext?.podSettingId ? handleSaveToPodSignature : null}
                    isSavingToPod={isSavingToPod}
                  />
                )}
              </div>

              {/* Deck Footer */}
              <div className="p-1.5 text-center text-[9px] text-slate-500 border-t border-slate-800 bg-slate-950/60 font-mono">
                REGENESIS Simulation Engine & Template Studio &bull; 2026
              </div>
            </section>
          </main>

          {/* Timeline Vertical Resizer Splitter Bar */}
          <div
            onMouseDown={handleSplitterMouseDown}
            className={`h-2 w-full bg-slate-950 hover:bg-amber-500/80 cursor-row-resize flex items-center justify-center transition-colors relative z-30 group select-none border-t border-slate-800 shrink-0 ${
              isTimelineDragging ? 'bg-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.8)]' : ''
            }`}
            title="Tarik untuk mengatur tinggi timeline (175px - 560px)"
          >
            <div className="w-14 h-1 rounded-full bg-slate-700 group-hover:bg-slate-900 transition-colors flex items-center justify-center gap-1">
              <span className="w-1 h-1 rounded-full bg-slate-400" />
              <span className="w-1 h-1 rounded-full bg-slate-400" />
              <span className="w-1 h-1 rounded-full bg-slate-400" />
            </div>
          </div>

          {/* Bottom Area: Full-Width Video Editor Sequence Timeline */}
          <footer
            style={{ height: `${timelineHeight}px` }}
            className="w-full bg-slate-900 flex flex-col shrink-0 z-20 shadow-2xl overflow-hidden"
          >
            <TimelineVisualizerLanes
              currentTime={currentTime}
              duration={duration}
              sessionData={sessionData}
              videoSrc={videoSrc}
              videoFile={videoFile}
              audioFile={audioFile}
              audioCacheWave={audioCacheWave}
              strobeFile={strobeFile}
              strobeEnvelopeL={strobeEnvelopeL}
              strobeEnvelopeR={strobeEnvelopeR}
              strobeThreshold={strobeThreshold}
              onSeek={handleSeek}
              isPlaying={isPlaying}
              onPlayPause={handlePlayPause}
              onStop={handleStop}
              onToggleRepeat={handleToggleRepeat}
              isRepeat={isRepeat}
              onUpdateSessionData={setSessionData}
              timelineHeight={timelineHeight}
              setTimelineHeight={setTimelineHeight}
            />
          </footer>
        </div>
      </div>

      {/* S3 Multimedia Catalog Picker Modal */}
      {isCatalogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-700 rounded-2xl p-5 shadow-2xl space-y-4 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Sparkles size={18} className="text-purple-400" />
                <h3 className="text-sm font-bold text-white">
                  Pilih SoundScape dari Katalog Multimedia Server
                </h3>
              </div>
              <button
                onClick={() => setIsCatalogOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white"
              >
                <X size={16} />
              </button>
            </div>

            <div className="relative">
              <input
                type="text"
                placeholder="Cari judul, artis, lagu, atau kode soundscape..."
                value={catalogSearch}
                onChange={(e) => setCatalogSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-400"
              />
              <Search size={14} className="absolute left-3 top-2.5 text-slate-500" />
            </div>

            <div className="flex-1 overflow-y-auto space-y-2 pr-1 scrollbar-thin">
              {catalogItems
                .filter((item) => {
                  if (!catalogSearch) return true;
                  const q = catalogSearch.toLowerCase();
                  return (
                    String(item.sound_scape).includes(q) ||
                    (item.title && item.title.toLowerCase().includes(q)) ||
                    (item.artist && item.artist.toLowerCase().includes(q)) ||
                    (item.song && item.song.toLowerCase().includes(q))
                  );
                })
                .map((item) => (
                  <div
                    key={item.id}
                    onClick={() => handleSelectCatalogItem(item)}
                    className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 hover:border-purple-500/50 cursor-pointer transition flex items-center justify-between gap-3 group"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-lg bg-purple-600/20 border border-purple-500/30 flex items-center justify-center text-purple-300 shrink-0">
                        <Music size={18} />
                      </div>
                      <div className="min-w-0 space-y-1">
                        <div className="font-bold text-xs text-white group-hover:text-purple-300 transition truncate">
                          {item.title || item.tittle || 'Untitled'}
                        </div>
                        <div className="text-[10px] text-slate-400 truncate">
                          {item.artist || 'Regenesis'} • #{item.sound_scape}
                        </div>
                        {/* Media Availability Badges */}
                        <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                          {(item.video || item.videoUrl) && (
                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30 flex items-center gap-0.5">
                              🎬 Video
                            </span>
                          )}
                          {(item.music || item.song || item.musicUrl) && (
                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-0.5">
                              🎵 Audio
                            </span>
                          )}
                          {item.lamp && (
                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-sky-500/20 text-sky-300 border border-sky-500/30 flex items-center gap-0.5">
                              ⚡ Strobe/Lamp
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <button
                      type="button"
                      className="px-3.5 py-1.5 rounded-lg bg-purple-600/30 group-hover:bg-purple-600 group-hover:text-white text-purple-300 text-xs font-bold transition shrink-0 border border-purple-500/40"
                    >
                      Pilih Semua File
                    </button>
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}

      {/* Floating Multi-Track Streaming Audio & Strobe Progress HUD */}
      {(audioLoadProgress || strobeLoadProgress || mediaLoadProgress) && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900/95 border border-slate-700/80 rounded-2xl p-4 shadow-2xl backdrop-blur-md max-w-sm w-full animate-in slide-in-from-bottom-5 duration-200 space-y-3">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <div className="flex items-center gap-2">
              <Sparkles size={14} className="text-amber-400" />
              <span className="text-xs font-bold text-white tracking-wide">
                Pemuatan Media Streaming S3
              </span>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-amber-300 border border-slate-700 font-bold">
              Antrean Sekuensial
            </span>
          </div>

          {/* 1. Track Audio Item */}
          {audioLoadProgress && (
            <div className="space-y-1.5 bg-slate-950/70 p-2.5 rounded-xl border border-emerald-500/30 shadow-inner">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="text-[9.5px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 shrink-0 border border-emerald-500/30">
                    [1/2] Audio
                  </span>
                  <span className="text-[11px] font-medium text-white truncate" title={audioLoadProgress.filename}>
                    {audioLoadProgress.filename}
                  </span>
                </div>
                <span className="text-[11px] font-mono font-bold text-emerald-400 shrink-0">
                  {audioLoadProgress.pct !== null ? `${audioLoadProgress.pct}%` : ''}
                </span>
              </div>

              {/* Progress Bar */}
              <div className="w-full bg-slate-900 rounded-full h-1.5 overflow-hidden border border-slate-800">
                <div
                  className={`h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-150 ease-out ${
                    audioLoadProgress.pct === null ? 'animate-pulse w-full' : ''
                  }`}
                  style={{ width: audioLoadProgress.pct !== null ? `${Math.max(4, audioLoadProgress.pct || 0)}%` : '100%' }}
                />
              </div>

              <div className="flex items-center justify-between text-[9px] font-mono text-slate-400 pt-0.5">
                <span className="text-emerald-300 truncate">
                  {audioLoadProgress.stage === 'downloading'
                    ? 'Mengunduh stream S3...'
                    : audioLoadProgress.stage === 'decoding'
                      ? 'Mendekode PCM Audio...'
                      : audioLoadProgress.stage === 'analyzing'
                        ? 'Menghitung Waveform & FFT...'
                        : 'Audio Siap'}
                </span>
                <span className="text-slate-500 shrink-0">{audioLoadProgress.mbText || ''}</span>
              </div>
            </div>
          )}

          {/* 2. Track Strobe / Lamp Item */}
          {strobeLoadProgress && (
            <div className="space-y-1.5 bg-slate-950/70 p-2.5 rounded-xl border border-sky-500/30 shadow-inner">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="text-[9.5px] font-bold px-1.5 py-0.5 rounded bg-sky-500/20 text-sky-300 shrink-0 border border-sky-500/30">
                    [2/2] Strobo
                  </span>
                  <span className="text-[11px] font-medium text-white truncate" title={strobeLoadProgress.filename}>
                    {strobeLoadProgress.filename}
                  </span>
                </div>
                <span className="text-[11px] font-mono font-bold text-sky-400 shrink-0">
                  {strobeLoadProgress.pct !== null ? `${strobeLoadProgress.pct}%` : ''}
                </span>
              </div>

              {/* Progress Bar */}
              <div className="w-full bg-slate-900 rounded-full h-1.5 overflow-hidden border border-slate-800">
                <div
                  className={`h-full rounded-full bg-gradient-to-r from-sky-500 via-cyan-400 to-amber-400 transition-all duration-150 ease-out ${
                    strobeLoadProgress.pct === null ? 'animate-pulse w-full' : ''
                  }`}
                  style={{ width: strobeLoadProgress.pct !== null ? `${Math.max(4, strobeLoadProgress.pct || 0)}%` : '100%' }}
                />
              </div>

              <div className="flex items-center justify-between text-[9px] font-mono text-slate-400 pt-0.5">
                <span className="text-sky-300 truncate">
                  {strobeLoadProgress.stage === 'downloading'
                    ? 'Mengunduh stream lampu S3...'
                    : strobeLoadProgress.stage === 'decoding'
                      ? 'Mendekode PCM Strobo...'
                      : strobeLoadProgress.stage === 'analyzing'
                        ? 'Mengekstrak Sinyal 19.2kHz...'
                        : '19.2kHz Siap'}
                </span>
                <span className="text-slate-500 shrink-0">{strobeLoadProgress.mbText || ''}</span>
              </div>
            </div>
          )}

          {/* Legacy single item fallback */}
          {!audioLoadProgress && !strobeLoadProgress && mediaLoadProgress && (
            <div className="space-y-1.5 bg-slate-950/70 p-2.5 rounded-xl border border-amber-500/30">
              <div className="flex items-start justify-between gap-2">
                <span className="text-[11px] font-medium text-white truncate">
                  {mediaLoadProgress.filename}
                </span>
                <span className="text-[11px] font-mono font-bold text-amber-400 shrink-0">
                  {mediaLoadProgress.pct}%
                </span>
              </div>
              <div className="w-full bg-slate-900 rounded-full h-1.5 overflow-hidden border border-slate-800">
                <div
                  className="h-full rounded-full bg-amber-400 transition-all duration-150"
                  style={{ width: `${mediaLoadProgress.pct || 0}%` }}
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* Batch Apply Modal */}
      {isBatchApplyOpen && (
        <BatchApplyModal
          isOpen={isBatchApplyOpen}
          onClose={() => setIsBatchApplyOpen(false)}
          templateData={batchData}
          onSuccess={() => {
            setIsBatchApplyOpen(false);
            setNotification('Konfigurasi berhasil diterapkan ke armada unit POD!');
          }}
        />
      )}
    </div>
  );
}
