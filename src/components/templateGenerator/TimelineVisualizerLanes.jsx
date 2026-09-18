import React, { useRef, useEffect, useState, useCallback } from 'react';
import {
  Film,
  Music,
  Zap,
  Wind,
  Sun,
  Play,
  Pause,
  Square,
  Repeat,
  Clock,
  Layers,
  Plus,
  Trash2,
  X,
  MoveHorizontal,
  Check,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Magnet,
  Lock,
  Unlock,
  Eye,
  EyeOff
} from 'lucide-react';
import { parseTimeStrToSeconds } from './templateConverter';
import olfactoryList from '../podSessions/olfactory.json';

// Helper to format seconds into "MM:SS"
function formatSecondsToTimeStr(sec) {
  const s = Math.max(0, Math.round(sec));
  const m = Math.floor(s / 60);
  const rem = s % 60;
  return `${String(m).padStart(2, '0')}:${String(rem).padStart(2, '0')}`;
}

export default function TimelineVisualizerLanes({
  currentTime = 0,
  duration = 1200,
  sessionData,
  videoSrc,
  videoFile,
  audioFile,
  audioCacheWave,
  strobeFile,
  strobeEnvelopeL,
  strobeEnvelopeR,
  strobeThreshold = 40,
  onSeek,
  isPlaying = false,
  onPlayPause,
  onStop,
  onToggleRepeat,
  isRepeat = false,
  onUpdateSessionData,
  timelineHeight = 285,
  setTimelineHeight = null
}) {
  const lanesScrollRef = useRef(null);
  const lanesContainerRef = useRef(null);
  const canvasVideoRef = useRef(null);
  const canvasAudioRef = useRef(null);
  const canvasStrobeRef = useRef(null);
  const canvasOlfRef = useRef(null);
  const canvasPemfRef = useRef(null);
  const canvasNirRef = useRef(null);

  const [hoverTime, setHoverTime] = useState(null);
  const [viewportWidth, setViewportWidth] = useState(1200);

  // Horizontal Time Zoom: 1x (fit) to 16x
  const [zoomLevel, setZoomLevel] = useState(1);

  // Magnetic Snapping
  const [isSnapping, setIsSnapping] = useState(true);
  const [activeSnapTime, setActiveSnapTime] = useState(null);

  // Track Mute & Lock states
  const [trackMutes, setTrackMutes] = useState({ v1: false, a1: false, l1: false, olf: false, pemf: false, nir: false });
  const [trackLocks, setTrackLocks] = useState({ v1: false, a1: false, l1: false, olf: false, pemf: false, nir: false });

  // Dragging event clip state: { type: 'olf'|'pemf'|'nir', index, startX, originalSec, currentSec, durSec }
  const [dragState, setDragState] = useState(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  // Trimming event clip duration state (e.g. edge drag): { type: 'olf', index, startX, originalDurMs, currentDurMs }
  const [trimState, setTrimState] = useState(null);

  // Selected clip for floating popover: { type: 'olf'|'pemf'|'nir', index }
  const [selectedClip, setSelectedClip] = useState(null);

  const winSize = Math.max(10, duration);
  const effectiveWidth = Math.round(viewportWidth * zoomLevel);

  // Measure viewport container width
  useEffect(() => {
    if (!lanesContainerRef.current) return;
    const updateSize = () => {
      if (lanesContainerRef.current) {
        const measured = lanesContainerRef.current.clientWidth;
        if (measured > 100) {
          setViewportWidth(measured);
        }
      }
    };
    updateSize();
    const observer = new ResizeObserver(updateSize);
    observer.observe(lanesContainerRef.current);
    return () => observer.disconnect();
  }, []);

  // Format seconds to mm:ss.ss (accurate)
  const formatAccurateTime = (sec) => {
    const total = Math.max(0, sec || 0);
    const m = Math.floor(total / 60);
    const s = Math.floor(total % 60);
    const hundredths = Math.floor((total % 1) * 100);
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}.${String(hundredths).padStart(2, '0')}`;
  };

  // Format seconds to mm:ss
  const formatSimpleTime = (sec) => {
    const total = Math.max(0, sec || 0);
    const m = Math.floor(total / 60);
    const s = Math.floor(total % 60);
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  // Coordinate helper: Get content X taking horizontal scroll into account
  const getContentX = (e) => {
    if (!lanesScrollRef.current) return 0;
    const rect = lanesScrollRef.current.getBoundingClientRect();
    const scrollLeft = lanesScrollRef.current.scrollLeft;
    return e.clientX - rect.left + scrollLeft;
  };

  // Click on background lane to seek
  const handleLaneClick = (e) => {
    if (dragState || trimState) return;
    if (!lanesScrollRef.current || !onSeek) return;
    const clickX = getContentX(e);
    const pct = Math.max(0, Math.min(1, clickX / effectiveWidth));
    onSeek(pct * winSize);
    setSelectedClip(null);
  };

  const handleMouseMove = (e) => {
    if (!lanesScrollRef.current) return;
    if (dragState || trimState) {
      if (hoverTime !== null) setHoverTime(null);
      return;
    }
    const clickX = getContentX(e);
    const pct = Math.max(0, Math.min(1, clickX / effectiveWidth));
    setHoverTime(pct * winSize);
  };

  const handleMouseLeave = () => {
    setHoverTime(null);
  };

  // Mouse wheel zoom when holding Ctrl / Cmd / Alt
  const handleWheel = (e) => {
    if (e.ctrlKey || e.metaKey || e.altKey) {
      e.preventDefault();
      if (e.deltaY < 0) {
        setZoomLevel((prev) => Math.min(16, Number((prev * 1.3).toFixed(2))));
      } else {
        setZoomLevel((prev) => Math.max(1, Number((prev / 1.3).toFixed(2))));
      }
    }
  };

  // Auto-scroll timeline to follow playhead during playback
  useEffect(() => {
    if (isPlaying && lanesScrollRef.current && zoomLevel > 1) {
      const scrollEl = lanesScrollRef.current;
      const playheadPx = (currentTime / winSize) * effectiveWidth;
      const viewLeft = scrollEl.scrollLeft;
      const viewWidth = scrollEl.clientWidth;

      if (playheadPx > viewLeft + viewWidth * 0.85 || playheadPx < viewLeft) {
        scrollEl.scrollLeft = Math.max(0, playheadPx - viewWidth * 0.2);
      }
    }
  }, [isPlaying, currentTime, winSize, effectiveWidth, zoomLevel]);

  // --------------------------------------------------------------------------
  // INTERACTIVE EVENT MANAGEMENT: ADD, MOVE, EDIT, DELETE, TRIM
  // --------------------------------------------------------------------------

  // Add event at a specific timestamp
  const handleAddEventAt = (type, timeSec) => {
    if (!onUpdateSessionData) return;
    if (trackLocks[type]) return; // Locked track guard

    const clampedSec = Math.max(0, Math.min(winSize - 3, timeSec));
    const timeStr = formatSecondsToTimeStr(clampedSec);

    if (type === 'olf') {
      const defaultScent = olfactoryList?.[0]?.scent || 'Lavender';
      const current = sessionData?.olfactoryEvents || [];
      const updated = [...current, [timeStr, defaultScent, '3000']];
      updated.sort((a, b) => parseTimeStrToSeconds(a[0]) - parseTimeStrToSeconds(b[0]));
      onUpdateSessionData({ ...sessionData, olfactoryEvents: updated });
      const newIdx = updated.findIndex((ev) => ev[0] === timeStr && ev[1] === defaultScent);
      if (newIdx !== -1) setSelectedClip({ type: 'olf', index: newIdx });
    } else if (type === 'pemf') {
      const current = sessionData?.pemfEvents || [];
      const updated = [...current, [timeStr, '1']];
      updated.sort((a, b) => parseTimeStrToSeconds(a[0]) - parseTimeStrToSeconds(b[0]));
      onUpdateSessionData({ ...sessionData, pemfEvents: updated });
      const newIdx = updated.findIndex((ev) => ev[0] === timeStr);
      if (newIdx !== -1) setSelectedClip({ type: 'pemf', index: newIdx });
    } else if (type === 'nir') {
      const current = sessionData?.nirEvents || [];
      const updated = [...current, [timeStr, '1']];
      updated.sort((a, b) => parseTimeStrToSeconds(a[0]) - parseTimeStrToSeconds(b[0]));
      onUpdateSessionData({ ...sessionData, nirEvents: updated });
      const newIdx = updated.findIndex((ev) => ev[0] === timeStr);
      if (newIdx !== -1) setSelectedClip({ type: 'nir', index: newIdx });
    }
  };

  // Double click on an empty lane area to spawn an event
  const handleLaneDoubleClick = (type, e) => {
    e.stopPropagation();
    if (trackLocks[type]) return;
    const clickX = getContentX(e);
    const clickSec = Math.max(0, Math.min(winSize, (clickX / effectiveWidth) * winSize));
    handleAddEventAt(type, clickSec);
  };

  // Drag start (moving event clip)
  const handleClipMouseDown = (type, index, e, durSec) => {
    e.stopPropagation();
    if (e.button !== 0) return; // Left-click only
    if (trackLocks[type]) return; // Locked track guard

    const listKey = type === 'olf' ? 'olfactoryEvents' : type === 'pemf' ? 'pemfEvents' : 'nirEvents';
    const ev = sessionData?.[listKey]?.[index];
    if (!ev) return;

    const originalSec = parseTimeStrToSeconds(ev[0]);
    setDragState({
      type,
      index,
      startX: e.clientX,
      originalSec,
      currentSec: originalSec,
      durSec
    });
    setMousePos({ x: e.clientX, y: e.clientY });
    setSelectedClip({ type, index });
  };

  // Edge Trim start (resizing clip duration directly)
  const handleTrimMouseDown = (type, index, e, originalDurMs) => {
    e.stopPropagation();
    if (e.button !== 0) return;
    if (trackLocks[type]) return;

    setTrimState({
      type,
      index,
      startX: e.clientX,
      originalDurMs,
      currentDurMs: originalDurMs
    });
    setMousePos({ x: e.clientX, y: e.clientY });
    setSelectedClip({ type, index });
  };

  // Collect candidate snap times across all modalities
  const getSnapCandidates = useCallback(() => {
    const candidates = [currentTime, 0, winSize];

    // Other events
    (sessionData?.olfactoryEvents || []).forEach((ev) => {
      const s = parseTimeStrToSeconds(ev[0]);
      const dur = (Number(ev[2]) || 3000) / 1000;
      candidates.push(s, s + dur);
    });
    (sessionData?.pemfEvents || []).forEach((ev) => {
      const s = parseTimeStrToSeconds(ev[0]);
      candidates.push(s);
    });
    (sessionData?.nirEvents || []).forEach((ev) => {
      const s = parseTimeStrToSeconds(ev[0]);
      candidates.push(s);
    });

    return candidates;
  }, [currentTime, winSize, sessionData]);

  // Window listeners for moving & trimming clips
  useEffect(() => {
    if (!dragState && !trimState) return;

    const handleWindowMouseMove = (e) => {
      setMousePos({ x: e.clientX, y: e.clientY });

      // A. Moving Clip
      if (dragState) {
        const deltaX = e.clientX - dragState.startX;
        const deltaSec = (deltaX / effectiveWidth) * winSize;
        let targetSec = dragState.originalSec + deltaSec;
        targetSec = Math.max(0, Math.min(winSize - (dragState.durSec || 1), targetSec));

        // Magnetic Snapping
        if (isSnapping) {
          const snapThresholdSec = (10 / effectiveWidth) * winSize;
          const candidates = getSnapCandidates();
          let closestDist = Infinity;
          let bestSnap = null;

          for (const cand of candidates) {
            const dist = Math.abs(targetSec - cand);
            if (dist < snapThresholdSec && dist < closestDist) {
              closestDist = dist;
              bestSnap = cand;
            }
          }

          // Also snap to integer second
          const roundedSec = Math.round(targetSec);
          if (Math.abs(targetSec - roundedSec) < snapThresholdSec && Math.abs(targetSec - roundedSec) < closestDist) {
            bestSnap = roundedSec;
          }

          if (bestSnap !== null) {
            targetSec = bestSnap;
            setActiveSnapTime(bestSnap);
          } else {
            setActiveSnapTime(null);
          }
        } else {
          setActiveSnapTime(null);
        }

        setDragState((prev) => (prev ? { ...prev, currentSec: targetSec } : null));
      }

      // B. Trimming Clip Duration
      if (trimState) {
        const deltaX = e.clientX - trimState.startX;
        const deltaSec = (deltaX / effectiveWidth) * winSize;
        const newDurMs = Math.max(500, Math.min(30000, Math.round(trimState.originalDurMs + deltaSec * 1000)));
        setTrimState((prev) => (prev ? { ...prev, currentDurMs: newDurMs } : null));
      }
    };

    const handleWindowMouseUp = () => {
      // Finalize Move
      if (dragState && onUpdateSessionData) {
        const { type, index, currentSec, originalSec } = dragState;
        if (Math.abs(currentSec - originalSec) > 0.05) {
          const finalTimeStr = formatSecondsToTimeStr(currentSec);
          const listKey = type === 'olf' ? 'olfactoryEvents' : type === 'pemf' ? 'pemfEvents' : 'nirEvents';
          const current = sessionData?.[listKey] || [];
          if (current[index]) {
            const updated = [...current];
            const oldEv = updated[index];
            if (type === 'olf') {
              updated[index] = [finalTimeStr, oldEv[1], oldEv[2] || '3000'];
            } else {
              updated[index] = [finalTimeStr, oldEv[1]];
            }
            updated.sort((a, b) => parseTimeStrToSeconds(a[0]) - parseTimeStrToSeconds(b[0]));
            onUpdateSessionData({ ...sessionData, [listKey]: updated });
          }
        }
      }

      // Finalize Trim
      if (trimState && onUpdateSessionData) {
        const { type, index, currentDurMs, originalDurMs } = trimState;
        if (Math.abs(currentDurMs - originalDurMs) > 100 && type === 'olf') {
          const current = sessionData?.olfactoryEvents || [];
          if (current[index]) {
            const updated = [...current];
            updated[index] = [updated[index][0], updated[index][1], String(currentDurMs)];
            onUpdateSessionData({ ...sessionData, olfactoryEvents: updated });
          }
        }
      }

      setDragState(null);
      setTrimState(null);
      setActiveSnapTime(null);
    };

    window.addEventListener('mousemove', handleWindowMouseMove);
    window.addEventListener('mouseup', handleWindowMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleWindowMouseMove);
      window.removeEventListener('mouseup', handleWindowMouseUp);
    };
  }, [dragState, trimState, effectiveWidth, winSize, isSnapping, getSnapCandidates, onUpdateSessionData, sessionData]);

  // Global Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Ignore when user is typing inside text inputs / forms
      const tag = document.activeElement?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || document.activeElement?.isContentEditable) {
        return;
      }

      if (e.code === 'Space') {
        e.preventDefault();
        onPlayPause?.();
      } else if (e.code === 'ArrowLeft') {
        e.preventDefault();
        const step = e.shiftKey ? 5 : 1;
        onSeek?.(Math.max(0, currentTime - step));
      } else if (e.code === 'ArrowRight') {
        e.preventDefault();
        const step = e.shiftKey ? 5 : 1;
        onSeek?.(Math.min(winSize, currentTime + step));
      } else if (e.code === 'Home') {
        e.preventDefault();
        onSeek?.(0);
      } else if (e.code === 'End') {
        e.preventDefault();
        onSeek?.(winSize);
      } else if (e.code === 'KeyS' && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        setIsSnapping((prev) => !prev);
      } else if ((e.code === 'Delete' || e.code === 'Backspace') && selectedClip) {
        e.preventDefault();
        handleDeleteSelectedClip();
      } else if (e.code === 'Escape') {
        setSelectedClip(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentTime, winSize, selectedClip, onPlayPause, onSeek, sessionData, isSnapping]);

  // Update clip field inside popover
  const handleUpdateClipField = (type, index, fieldIdx, value) => {
    if (!onUpdateSessionData || trackLocks[type]) return;
    const listKey = type === 'olf' ? 'olfactoryEvents' : type === 'pemf' ? 'pemfEvents' : 'nirEvents';
    const current = sessionData?.[listKey] || [];
    if (!current[index]) return;

    const updated = [...current];
    const item = [...updated[index]];
    item[fieldIdx] = value;
    updated[index] = item;
    if (fieldIdx === 0) {
      updated.sort((a, b) => parseTimeStrToSeconds(a[0]) - parseTimeStrToSeconds(b[0]));
    }
    onUpdateSessionData({ ...sessionData, [listKey]: updated });
  };

  // Delete clip
  const handleDeleteSelectedClip = () => {
    if (!selectedClip || !onUpdateSessionData) return;
    const { type, index } = selectedClip;
    if (trackLocks[type]) return;

    const listKey = type === 'olf' ? 'olfactoryEvents' : type === 'pemf' ? 'pemfEvents' : 'nirEvents';
    const current = sessionData?.[listKey] || [];
    const updated = current.filter((_, idx) => idx !== index);
    onUpdateSessionData({ ...sessionData, [listKey]: updated });
    setSelectedClip(null);
  };

  // Nudge clip time forward or backward by 1 second
  const handleNudgeTime = (deltaSec) => {
    if (!selectedClip || !onUpdateSessionData) return;
    const { type, index } = selectedClip;
    if (trackLocks[type]) return;

    const listKey = type === 'olf' ? 'olfactoryEvents' : type === 'pemf' ? 'pemfEvents' : 'nirEvents';
    const current = sessionData?.[listKey] || [];
    const ev = current[index];
    if (!ev) return;

    const curSec = parseTimeStrToSeconds(ev[0]);
    const nextSec = Math.max(0, Math.min(winSize - 1, curSec + deltaSec));
    handleUpdateClipField(type, index, 0, formatSecondsToTimeStr(nextSec));
  };

  // --------------------------------------------------------------------------
  // CANVAS DRAWING FOR MEDIA TRACKS
  // --------------------------------------------------------------------------

  // 1. Draw Video Track
  const drawVideoTrack = (canvas) => {
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const w = effectiveWidth;
    const h = canvas.height;

    ctx.fillStyle = '#090d16';
    ctx.fillRect(0, 0, w, h);

    if (trackMutes.v1) {
      ctx.fillStyle = 'rgba(148, 163, 184, 0.2)';
      ctx.font = 'italic 9px sans-serif';
      ctx.fillText('Track V1 di-mute', 16, h / 2 + 3);
      return;
    }

    const hasVideo = Boolean(videoSrc || videoFile?.name || sessionData?.videoFile?.path);
    const videoDuration = sessionData?.videoFile?.duration ? Number(sessionData.videoFile.duration) / 1000 : winSize;

    if (hasVideo) {
      const clipWidth = Math.min(w, (videoDuration / winSize) * w);

      const gradient = ctx.createLinearGradient(0, 0, clipWidth, 0);
      gradient.addColorStop(0, 'rgba(126, 34, 206, 0.85)');
      gradient.addColorStop(1, 'rgba(79, 70, 229, 0.85)');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 2, clipWidth, h - 4);

      // Filmstrip perforations
      ctx.fillStyle = 'rgba(0, 0, 0, 0.65)';
      for (let x = 6; x < clipWidth - 10; x += 18) {
        ctx.fillRect(x, 3, 6, 3);
        ctx.fillRect(x, h - 6, 6, 3);
      }

      ctx.strokeStyle = 'rgba(192, 132, 252, 0.9)';
      ctx.lineWidth = 1;
      ctx.strokeRect(0, 2, clipWidth, h - 4);

      const clipName = videoFile?.name || sessionData?.videoFile?.path || 'Master Video';
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 9px sans-serif';
      ctx.fillText(`🎬 ${clipName} (${videoDuration.toFixed(1)}s)`, 16, h / 2 + 3);
    } else {
      ctx.fillStyle = 'rgba(148, 163, 184, 0.35)';
      ctx.font = 'italic 8px sans-serif';
      ctx.fillText('Track Kosong: Unggah video MP4 atau pilih SoundScape dari Media Katalog', 12, h / 2 + 3);
    }

    // Playhead Line
    const playheadX = (currentTime / winSize) * w;
    ctx.fillStyle = '#facc15';
    ctx.fillRect(playheadX - 1, 0, 2, h);
  };

  // 2. Draw Audio Track
  const drawAudioTrack = (canvas) => {
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const w = effectiveWidth;
    const h = canvas.height;

    ctx.fillStyle = '#090d16';
    ctx.fillRect(0, 0, w, h);

    if (trackMutes.a1) {
      ctx.fillStyle = 'rgba(148, 163, 184, 0.2)';
      ctx.font = 'italic 9px sans-serif';
      ctx.fillText('Track A1 di-mute', 16, h / 2 + 3);
      return;
    }

    const hasAudio = Boolean(audioFile?.name || sessionData?.audioFile?.path || audioCacheWave);
    const audioDuration = sessionData?.audioFile?.duration ? Number(sessionData.audioFile.duration) / 1000 : winSize;

    if (hasAudio) {
      const clipWidth = Math.min(w, (audioDuration / winSize) * w);

      ctx.fillStyle = 'rgba(6, 78, 59, 0.7)';
      ctx.fillRect(0, 2, clipWidth, h - 4);

      if (audioCacheWave) {
        ctx.save();
        ctx.globalAlpha = 0.85;
        ctx.drawImage(audioCacheWave, 0, 0, audioCacheWave.width, audioCacheWave.height, 0, 2, clipWidth, h - 4);
        ctx.restore();
      }

      ctx.strokeStyle = 'rgba(52, 211, 153, 0.9)';
      ctx.lineWidth = 1;
      ctx.strokeRect(0, 2, clipWidth, h - 4);

      const audioName = audioFile?.name || sessionData?.audioFile?.path || 'SoundScape Audio';
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 9px sans-serif';
      ctx.fillText(`🎵 ${audioName}`, 12, h / 2 + 3);
    } else {
      ctx.fillStyle = 'rgba(148, 163, 184, 0.35)';
      ctx.font = 'italic 8px sans-serif';
      ctx.fillText('Track Kosong: Pilih SoundScape dari Media Katalog untuk memuat audio & gelombang FFT', 12, h / 2 + 3);
    }

    // Playhead Line
    const playheadX = (currentTime / winSize) * w;
    ctx.fillStyle = '#facc15';
    ctx.fillRect(playheadX - 1, 0, 2, h);
  };

  // 3. Draw Strobe 19.2kHz
  const drawStrobeTrack = (canvas) => {
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const w = effectiveWidth;
    const h = canvas.height;

    ctx.fillStyle = '#090d16';
    ctx.fillRect(0, 0, w, h);

    if (trackMutes.l1) {
      ctx.fillStyle = 'rgba(148, 163, 184, 0.2)';
      ctx.font = 'italic 9px sans-serif';
      ctx.fillText('Track L1 di-mute', 16, h / 2 + 3);
      return;
    }

    if (strobeEnvelopeL && strobeEnvelopeR) {
      const sampleRate = 500;
      const totalSamples = Math.floor(winSize * sampleRate);
      const step = Math.max(1, Math.floor(totalSamples / w));

      for (let x = 0; x < w; x++) {
        const sIdx = x * step;
        const valL = strobeEnvelopeL[sIdx] || 0;
        const valR = strobeEnvelopeR[sIdx] || 0;

        if (valL > strobeThreshold) {
          ctx.fillStyle = '#fb923c'; // Warm
          ctx.fillRect(x, 2, 1, h / 2 - 2);
        }
        if (valR > strobeThreshold) {
          ctx.fillStyle = '#38bdf8'; // Cool
          ctx.fillRect(x, h / 2, 1, h / 2 - 2);
        }
      }
    } else {
      ctx.fillStyle = 'rgba(148, 163, 184, 0.35)';
      ctx.font = 'italic 8px sans-serif';
      ctx.fillText('Strobe 19.2kHz: Siap memindai sinyal modulasi strobo lampu', 12, h / 2 + 3);
    }

    // Playhead Line
    const playheadX = (currentTime / winSize) * w;
    ctx.fillStyle = '#facc15';
    ctx.fillRect(playheadX - 1, 0, 2, h);
  };

  // 4. Draw Clean Modality Background Lane
  const drawLaneBackground = (canvas, isMuted) => {
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const w = effectiveWidth;
    const h = canvas.height;

    ctx.fillStyle = '#090d16';
    ctx.fillRect(0, 0, w, h);

    if (isMuted) {
      ctx.fillStyle = 'rgba(15, 23, 42, 0.8)';
      ctx.fillRect(0, 0, w, h);
      return;
    }

    // Subtle grid guide
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
    ctx.lineWidth = 1;
    const step = w / 20;
    for (let x = 0; x < w; x += step) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
    }

    // Playhead line
    const playheadX = (currentTime / winSize) * w;
    ctx.fillStyle = '#facc15';
    ctx.fillRect(playheadX - 1, 0, 2, h);
  };

  useEffect(() => {
    drawVideoTrack(canvasVideoRef.current);
    drawAudioTrack(canvasAudioRef.current);
    drawStrobeTrack(canvasStrobeRef.current);
    drawLaneBackground(canvasOlfRef.current, trackMutes.olf);
    drawLaneBackground(canvasPemfRef.current, trackMutes.pemf);
    drawLaneBackground(canvasNirRef.current, trackMutes.nir);
  }, [
    currentTime,
    duration,
    sessionData,
    videoSrc,
    videoFile,
    audioFile,
    audioCacheWave,
    strobeFile,
    strobeEnvelopeL,
    strobeEnvelopeR,
    strobeThreshold,
    effectiveWidth,
    trackMutes
  ]);

  // Dynamic Ruler Ticks: adapts granularity based on zoom
  const pxPerSec = effectiveWidth / winSize;
  let majorStepSec = 60;
  if (pxPerSec >= 50) majorStepSec = 1;
  else if (pxPerSec >= 20) majorStepSec = 2;
  else if (pxPerSec >= 8) majorStepSec = 5;
  else if (pxPerSec >= 3) majorStepSec = 15;
  else if (pxPerSec >= 1.2) majorStepSec = 30;

  const rulerTicks = [];
  for (let t = 0; t <= winSize; t += majorStepSec) {
    rulerTicks.push(t);
  }

  // Playhead needle position in pixels
  const playheadPx = (currentTime / winSize) * effectiveWidth;

  // Selected clip data
  let selectedClipData = null;
  if (selectedClip) {
    const listKey = selectedClip.type === 'olf' ? 'olfactoryEvents' : selectedClip.type === 'pemf' ? 'pemfEvents' : 'nirEvents';
    selectedClipData = sessionData?.[listKey]?.[selectedClip.index] || null;
  }

  return (
    <div className="h-full flex flex-col bg-slate-950 select-none overflow-hidden relative">
      {/* 1. TOP TRANSPORT & TIMELINE CONTROLLER BAR */}
      <div className="h-10 px-3 bg-slate-900 border-b border-slate-800 flex items-center justify-between shrink-0 gap-2 overflow-x-auto scrollbar-none">
        {/* Left: Transport Cluster & Timecode */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="flex items-center gap-1 bg-slate-950 p-0.5 rounded-lg border border-slate-800">
            {onPlayPause && (
              <button
                type="button"
                onClick={onPlayPause}
                className={`w-6 h-6 flex items-center justify-center rounded transition cursor-pointer ${isPlaying
                  ? 'bg-amber-500 text-slate-950 hover:bg-amber-400 shadow-sm shadow-amber-500/30'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-200'
                  }`}
                title={isPlaying ? 'Pause (Space)' : 'Play (Space)'}
              >
                {isPlaying ? <Pause size={12} /> : <Play size={12} className="ml-0.5" />}
              </button>
            )}

            {onStop && (
              <button
                type="button"
                onClick={onStop}
                className="w-6 h-6 flex items-center justify-center rounded bg-slate-800 hover:bg-slate-700 text-rose-400 transition cursor-pointer"
                title="Stop & Reset (Home)"
              >
                <Square size={11} />
              </button>
            )}

            {onToggleRepeat && (
              <button
                type="button"
                onClick={onToggleRepeat}
                className={`w-6 h-6 flex items-center justify-center rounded transition cursor-pointer ${isRepeat
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-400'
                  }`}
                title="Toggle Repeat"
              >
                <Repeat size={11} />
              </button>
            )}
          </div>

          {/* Digital Timecode */}
          <div className="flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-slate-950 border border-slate-800">
            <Clock size={12} className="text-amber-400 shrink-0" />
            <span className="font-mono text-xs font-black text-amber-400 tracking-wide">
              {formatAccurateTime(currentTime)}
            </span>
            <span className="font-mono text-[9.5px] text-slate-500">
              / {formatSimpleTime(winSize)}
            </span>
          </div>

          {/* Magnetic Snapping Button */}
          <button
            type="button"
            onClick={() => setIsSnapping(!isSnapping)}
            className={`px-2 py-0.5 rounded-lg border text-[10px] font-bold flex items-center gap-1 transition cursor-pointer ${isSnapping
              ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 shadow-sm shadow-amber-500/20'
              : 'bg-slate-800 text-slate-400 border-slate-700'
              }`}
            title="Toggle Magnetic Snapping (Shortcut: S)"
          >
            <Magnet size={11} className={isSnapping ? 'text-amber-400' : 'text-slate-500'} />
            <span className="hidden sm:inline">Snap</span>
          </button>
        </div>

        {/* Center: Sequence Info */}
        <div className="hidden lg:flex items-center gap-2 text-xs font-bold text-slate-300 shrink-0">
          <Layers size={13} className="text-indigo-400" />
          <span className="text-[11px]">Timeline Sequencer</span>
          <span className="text-[9.5px] font-mono px-2 py-0.2 rounded bg-slate-800/80 text-amber-300 border border-amber-500/30">
            Ctrl+Wheel Zoom &bull; Drag Ujung Klip Durasi &bull; Del Hapus
          </span>
        </div>

        {/* Right: Zoom Controls & Timeline Height Presets */}
        <div className="flex items-center gap-2 shrink-0">
          {hoverTime !== null && (
            <span className="hidden xl:inline text-cyan-300 bg-cyan-950/60 px-2 py-0.5 rounded border border-cyan-800 font-mono text-[9.5px]">
              Hover: {formatAccurateTime(hoverTime)}
            </span>
          )}

          {/* Horizontal Time Zoom Cluster */}
          <div className="flex items-center gap-1 bg-slate-950 p-0.5 rounded-lg border border-slate-800">
            <button
              type="button"
              onClick={() => setZoomLevel((z) => Math.max(1, Number((z / 1.5).toFixed(2))))}
              disabled={zoomLevel <= 1}
              className="w-5 h-5 flex items-center justify-center rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-30 text-slate-300 transition cursor-pointer"
              title="Zoom Out Timeline"
            >
              <ZoomOut size={11} />
            </button>
            <span className="font-mono text-[10px] font-bold text-slate-300 px-1 min-w-[28px] text-center">
              {zoomLevel}x
            </span>
            <button
              type="button"
              onClick={() => setZoomLevel((z) => Math.min(16, Number((z * 1.5).toFixed(2))))}
              disabled={zoomLevel >= 16}
              className="w-5 h-5 flex items-center justify-center rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-30 text-slate-300 transition cursor-pointer"
              title="Zoom In Timeline"
            >
              <ZoomIn size={11} />
            </button>
            <button
              type="button"
              onClick={() => setZoomLevel(1)}
              className="px-1.5 h-5 rounded bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white text-[9px] font-mono font-bold transition flex items-center gap-0.5 cursor-pointer"
              title="Fit to Screen (1x)"
            >
              <Maximize2 size={9} />
              <span>Fit</span>
            </button>
          </div>

          {/* Vertical Height Preset Buttons */}
          {setTimelineHeight && (
            <div className="hidden sm:flex items-center gap-0.5 bg-slate-950 p-0.5 rounded-lg border border-slate-800">
              <button
                type="button"
                onClick={() => setTimelineHeight(185)}
                className={`px-1.5 py-0.5 rounded text-[9px] font-mono font-bold transition cursor-pointer ${timelineHeight <= 200
                  ? 'bg-purple-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
                  }`}
                title="Tinggi Compact (185px)"
              >
                Compact
              </button>
              <button
                type="button"
                onClick={() => setTimelineHeight(285)}
                className={`px-1.5 py-0.5 rounded text-[9px] font-mono font-bold transition cursor-pointer ${timelineHeight > 200 && timelineHeight <= 350
                  ? 'bg-purple-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
                  }`}
                title="Tinggi Normal (285px)"
              >
                Normal
              </button>
              <button
                type="button"
                onClick={() => setTimelineHeight(440)}
                className={`px-1.5 py-0.5 rounded text-[9px] font-mono font-bold transition cursor-pointer ${timelineHeight > 350
                  ? 'bg-purple-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
                  }`}
                title="Tinggi Expanded (440px)"
              >
                Expand
              </button>
            </div>
          )}
        </div>
      </div>

      {/* 2. TIMELINE TRACKS AREA (STICKY HEADERS + HORIZONTAL ZOOMABLE LANES) */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Left Column: Track Headers with Mute, Lock & Quick Add (+) Buttons */}
        <div className="w-36 sm:w-44 bg-slate-900 border-r border-slate-800 flex flex-col shrink-0 text-slate-300 z-20 shadow-md">
          {/* Ruler Corner */}
          <div className="h-6 bg-slate-950/90 border-b border-slate-800/80 px-2 flex items-center justify-between text-[9px] font-mono font-bold text-slate-500 uppercase tracking-wider">
            <span>TRACK</span>
            <span className="text-[8px] text-slate-600 font-normal">MODAL</span>
          </div>

          {/* V1: Video Track Header */}
          <div className="h-8 border-b border-slate-800/80 px-2 flex items-center justify-between gap-1 bg-slate-900/60">
            <div className="flex items-center gap-1.5 min-w-0">
              <Film size={11} className="text-purple-400 shrink-0" />
              <span className="text-[11px] font-bold text-white truncate">V1 Video</span>
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setTrackMutes((m) => ({ ...m, v1: !m.v1 }))}
                className={`p-0.5 rounded transition ${trackMutes.v1 ? 'text-rose-400 bg-rose-950/40' : 'text-slate-500 hover:text-slate-300'}`}
                title={trackMutes.v1 ? 'Unmute Video' : 'Mute Video'}
              >
                {trackMutes.v1 ? <EyeOff size={10} /> : <Eye size={10} />}
              </button>
              <span className="text-[8px] font-mono px-1 py-0.2 rounded bg-purple-950/60 text-purple-300 border border-purple-800 shrink-0">
                MP4
              </span>
            </div>
          </div>

          {/* A1: Audio Track Header */}
          <div className="h-8 border-b border-slate-800/80 px-2 flex items-center justify-between gap-1 bg-slate-900/60">
            <div className="flex items-center gap-1.5 min-w-0">
              <Music size={11} className="text-emerald-400 shrink-0" />
              <span className="text-[11px] font-bold text-white truncate">A1 Audio</span>
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setTrackMutes((m) => ({ ...m, a1: !m.a1 }))}
                className={`p-0.5 rounded transition ${trackMutes.a1 ? 'text-rose-400 bg-rose-950/40' : 'text-slate-500 hover:text-slate-300'}`}
                title={trackMutes.a1 ? 'Unmute Audio' : 'Mute Audio'}
              >
                {trackMutes.a1 ? <EyeOff size={10} /> : <Eye size={10} />}
              </button>
              <span className="text-[8px] font-mono px-1 py-0.2 rounded bg-emerald-950/60 text-emerald-300 border border-emerald-800 shrink-0">
                WAV
              </span>
            </div>
          </div>

          {/* L1: Strobe Track Header */}
          <div className="h-7 border-b border-slate-800/80 px-2 flex items-center justify-between gap-1 bg-slate-900/60">
            <div className="flex items-center gap-1.5 min-w-0">
              <Zap size={11} className="text-sky-400 shrink-0" />
              <span className="text-[10px] font-bold text-white truncate">L1 Strobe</span>
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setTrackMutes((m) => ({ ...m, l1: !m.l1 }))}
                className={`p-0.5 rounded transition ${trackMutes.l1 ? 'text-rose-400 bg-rose-950/40' : 'text-slate-500 hover:text-slate-300'}`}
                title={trackMutes.l1 ? 'Unmute Strobe' : 'Mute Strobe'}
              >
                {trackMutes.l1 ? <EyeOff size={10} /> : <Eye size={10} />}
              </button>
              <span className="text-[8px] font-mono px-1 py-0.2 rounded bg-sky-950/60 text-sky-300 border border-sky-800 shrink-0">
                19.2k
              </span>
            </div>
          </div>

          {/* O1: Olfactory Header with Lock & Add (+) */}
          <div className="h-8 border-b border-slate-800/80 px-2 flex items-center justify-between gap-1 bg-slate-900/60 group">
            <div className="flex items-center gap-1.5 min-w-0">
              <Wind size={11} className="text-purple-400 shrink-0" />
              <span className="text-[10px] font-bold text-white truncate">O1 Aroma</span>
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setTrackLocks((l) => ({ ...l, olf: !l.olf }))}
                className={`p-0.5 rounded transition ${trackLocks.olf ? 'text-amber-400 bg-amber-950/40' : 'text-slate-500 hover:text-slate-300'}`}
                title={trackLocks.olf ? 'Buka Kunci Track Aroma' : 'Kunci Track Aroma'}
              >
                {trackLocks.olf ? <Lock size={10} /> : <Unlock size={10} />}
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleAddEventAt('olf', currentTime);
                }}
                disabled={trackLocks.olf}
                className="w-4 h-4 rounded bg-purple-600/40 hover:bg-purple-600 text-purple-200 hover:text-white flex items-center justify-center transition border border-purple-500/40 disabled:opacity-30"
                title="Tambah Aroma pada posisi playhead saat ini"
              >
                <Plus size={9} />
              </button>
            </div>
          </div>

          {/* P1: PEMF Header with Lock & Add (+) */}
          <div className="h-8 border-b border-slate-800/80 px-2 flex items-center justify-between gap-1 bg-slate-900/60 group">
            <div className="flex items-center gap-1.5 min-w-0">
              <Zap size={11} className="text-sky-400 shrink-0" />
              <span className="text-[10px] font-bold text-white truncate">P1 PEMF</span>
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setTrackLocks((l) => ({ ...l, pemf: !l.pemf }))}
                className={`p-0.5 rounded transition ${trackLocks.pemf ? 'text-amber-400 bg-amber-950/40' : 'text-slate-500 hover:text-slate-300'}`}
                title={trackLocks.pemf ? 'Buka Kunci Track PEMF' : 'Kunci Track PEMF'}
              >
                {trackLocks.pemf ? <Lock size={10} /> : <Unlock size={10} />}
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleAddEventAt('pemf', currentTime);
                }}
                disabled={trackLocks.pemf}
                className="w-4 h-4 rounded bg-sky-600/40 hover:bg-sky-600 text-sky-200 hover:text-white flex items-center justify-center transition border border-sky-500/40 disabled:opacity-30"
                title="Tambah PEMF pada posisi playhead saat ini"
              >
                <Plus size={9} />
              </button>
            </div>
          </div>

          {/* N1: NIR Header with Lock & Add (+) */}
          <div className="h-8 border-b border-slate-800/80 px-2 flex items-center justify-between gap-1 bg-slate-900/60 group">
            <div className="flex items-center gap-1.5 min-w-0">
              <Sun size={11} className="text-rose-400 shrink-0" />
              <span className="text-[10px] font-bold text-white truncate">N1 NIR</span>
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setTrackLocks((l) => ({ ...l, nir: !l.nir }))}
                className={`p-0.5 rounded transition ${trackLocks.nir ? 'text-amber-400 bg-amber-950/40' : 'text-slate-500 hover:text-slate-300'}`}
                title={trackLocks.nir ? 'Buka Kunci Track NIR' : 'Kunci Track NIR'}
              >
                {trackLocks.nir ? <Lock size={10} /> : <Unlock size={10} />}
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleAddEventAt('nir', currentTime);
                }}
                disabled={trackLocks.nir}
                className="w-4 h-4 rounded bg-rose-600/40 hover:bg-rose-600 text-rose-200 hover:text-white flex items-center justify-center transition border border-rose-500/40 disabled:opacity-30"
                title="Tambah NIR pada posisi playhead saat ini"
              >
                <Plus size={9} />
              </button>
            </div>
          </div>
        </div>

        {/* Right Scrollable Area: Horizontal Zoomed Lanes & Time Ruler */}
        <div
          ref={lanesContainerRef}
          className="flex-1 flex flex-col bg-slate-950 overflow-hidden relative"
        >
          <div
            ref={lanesScrollRef}
            onWheel={handleWheel}
            onClick={handleLaneClick}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            className="flex-1 flex flex-col bg-slate-950 cursor-crosshair overflow-x-auto overflow-y-hidden select-none scrollbar-thin relative"
          >
            <div
              style={{ width: `${effectiveWidth}px` }}
              className="relative flex flex-col h-full shrink-0"
            >
              {/* Full-Height Playhead Needle with Glowing Head */}
              <div
                className="absolute top-0 bottom-0 w-0.5 bg-amber-400 z-30 pointer-events-none shadow-[0_0_8px_rgba(251,191,36,0.9)]"
                style={{ left: `${playheadPx}px` }}
              >
                <div className="w-3 h-3 bg-amber-400 rotate-45 -translate-x-1.5 -translate-y-1.5 shadow" />
              </div>

              {/* Interactive Hover Guide Line (Shows prospective seek position on click) */}
              {hoverTime !== null && !dragState && !trimState && (
                <div
                  className="absolute top-0 bottom-0 w-px z-25 pointer-events-none transition-opacity duration-75"
                  style={{ left: `${(hoverTime / winSize) * effectiveWidth}px` }}
                >
                  {/* Glowing Vertical Line */}
                  <div className="w-full h-full bg-cyan-400/80 shadow-[0_0_8px_rgba(34,211,238,0.8)] border-r border-dashed border-cyan-300/90" />

                  {/* Top Diamond Indicator Cap */}
                  <div className="w-2.5 h-2.5 bg-cyan-400 rotate-45 -translate-x-[4.5px] -translate-y-1 shadow-[0_0_6px_rgba(34,211,238,0.9)]" />

                  {/* Floating Time Badge with Ping dot and helpful guide text */}
                  <div
                    className="absolute top-0.5 px-2 py-0.5 rounded-md bg-slate-950/95 border border-cyan-400/80 text-cyan-300 font-mono text-[9px] font-black shadow-xl shadow-black/80 whitespace-nowrap flex items-center gap-1.5 backdrop-blur-md"
                    style={{
                      left: (hoverTime / winSize) * effectiveWidth > effectiveWidth - 110 ? 'auto' : '6px',
                      right: (hoverTime / winSize) * effectiveWidth > effectiveWidth - 110 ? '6px' : 'auto'
                    }}
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping shrink-0" />
                    <span>{formatAccurateTime(hoverTime)}</span>
                    <span className="text-[8px] font-sans font-semibold text-slate-400 border-l border-slate-700 pl-1.5">
                      Klik untuk pindah
                    </span>
                  </div>
                </div>
              )}

              {/* Magnetic Snap Guide Line (Visible when snapped) */}
              {activeSnapTime !== null && (
                <div
                  className="absolute top-0 bottom-0 w-px bg-cyan-400 z-25 pointer-events-none shadow-[0_0_6px_#38bdf8] border-r border-dashed border-cyan-300"
                  style={{ left: `${(activeSnapTime / winSize) * effectiveWidth}px` }}
                >
                  <span className="absolute top-1 left-1 px-1 py-0.2 rounded bg-cyan-950 text-cyan-300 font-mono text-[8px] font-bold border border-cyan-600">
                    Snap: {formatSecondsToTimeStr(activeSnapTime)}
                  </span>
                </div>
              )}

              {/* Dynamic Ruler Row */}
              <div className="h-6 w-full bg-slate-950/90 border-b border-slate-800/80 relative text-[9px] font-mono text-slate-500 overflow-hidden">
                {rulerTicks.map((t) => {
                  const leftPx = (t / winSize) * effectiveWidth;
                  return (
                    <div
                      key={t}
                      className="absolute -translate-x-1/2 flex flex-col items-center top-0.5 pointer-events-none"
                      style={{ left: `${leftPx}px` }}
                    >
                      <span className="leading-none">{formatSimpleTime(t)}</span>
                      <div className="w-px h-1.5 bg-slate-700 mt-0.5" />
                    </div>
                  );
                })}
              </div>

              {/* V1 Video Lane Canvas */}
              <div className="h-8 border-b border-slate-800/80 relative overflow-hidden bg-slate-950/40">
                <canvas ref={canvasVideoRef} width={effectiveWidth} height={32} className="w-full h-full block" />
              </div>

              {/* A1 Audio Lane Canvas */}
              <div className="h-8 border-b border-slate-800/80 relative overflow-hidden bg-slate-950/40">
                <canvas ref={canvasAudioRef} width={effectiveWidth} height={32} className="w-full h-full block" />
              </div>

              {/* L1 Strobe Lane Canvas */}
              <div className="h-7 border-b border-slate-800/80 relative overflow-hidden bg-slate-950/40">
                <canvas ref={canvasStrobeRef} width={effectiveWidth} height={28} className="w-full h-full block" />
              </div>

              {/* O1 Olfactory Lane (Interactive Draggable & Edge-Trimmable Clips) */}
              <div
                className={`h-8 border-b border-slate-800/80 relative overflow-hidden bg-slate-950/40 select-none group ${trackLocks.olf ? 'opacity-70 bg-[radial-gradient(#1e293b_1px,transparent_1px)]' : ''
                  }`}
                onDoubleClick={(e) => handleLaneDoubleClick('olf', e)}
                title="Klik ganda di area kosong untuk menambah aroma"
              >
                <canvas ref={canvasOlfRef} width={effectiveWidth} height={32} className="w-full h-full block absolute inset-0 pointer-events-none" />
                <div className="absolute inset-0 pointer-events-auto">
                  {(sessionData?.olfactoryEvents || []).map((ev, idx) => {
                    const isDragging = dragState?.type === 'olf' && dragState?.index === idx;
                    const isTrimming = trimState?.type === 'olf' && trimState?.index === idx;
                    const startSec = isDragging ? dragState.currentSec : parseTimeStrToSeconds(ev[0]);
                    const durMs = isTrimming ? trimState.currentDurMs : Number(ev[2]) || 3000;
                    const durSec = durMs / 1000;
                    const leftPx = (startSec / winSize) * effectiveWidth;
                    const widthPx = Math.max(38, (durSec / winSize) * effectiveWidth);
                    const isSelected = selectedClip?.type === 'olf' && selectedClip?.index === idx;

                    return (
                      <div
                        key={`olf-${idx}`}
                        onMouseDown={(e) => handleClipMouseDown('olf', idx, e, durSec)}
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedClip({ type: 'olf', index: idx });
                        }}
                        className={`absolute top-1 bottom-1 rounded-md flex items-center px-1.5 gap-1 select-none transition-all group/clip ${trackLocks.olf ? 'cursor-not-allowed' : 'cursor-grab active:cursor-grabbing'
                          } border shadow-sm ${isSelected
                            ? 'bg-purple-600 border-white ring-2 ring-purple-300 shadow-lg shadow-purple-500/50 z-20 scale-[1.02]'
                            : isDragging
                              ? 'bg-purple-500 border-white shadow-xl z-30 opacity-90'
                              : isTrimming
                                ? 'bg-purple-600 border-amber-300 shadow-lg z-30'
                                : 'bg-gradient-to-r from-purple-700 to-purple-800 hover:from-purple-600 hover:to-purple-700 border-purple-500/80 text-white z-10'
                          }`}
                        style={{
                          left: `${leftPx}px`,
                          width: `${widthPx}px`
                        }}
                        title={`${ev[1] || 'Scent'} (${formatSecondsToTimeStr(startSec)}, ${(durMs / 1000).toFixed(1)}s) - Geser klip, atau tarik ujung kanan untuk durasi`}
                      >
                        <Wind size={10} className="shrink-0 text-purple-200 pointer-events-none" />
                        <span className="text-[9px] font-bold truncate text-white pointer-events-none">
                          {ev[1] || 'Scent'}
                        </span>
                        <span className="text-[8px] font-mono text-purple-200 shrink-0 pointer-events-none opacity-80">
                          {(durMs / 1000).toFixed(1)}s
                        </span>

                        {/* Edge Trim Handle on Right */}
                        {!trackLocks.olf && (
                          <div
                            onMouseDown={(e) => handleTrimMouseDown('olf', idx, e, durMs)}
                            className="absolute top-0 right-0 bottom-0 w-2.5 hover:w-3 cursor-col-resize flex items-center justify-center hover:bg-white/20 transition-all z-20 rounded-r"
                            title="Tarik ujung untuk memperpanjang/memperpendek durasi semprotan"
                          >
                            <div className="w-0.5 h-3 bg-white/50 rounded-full" />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* P1 PEMF Lane (Interactive Draggable Clips) */}
              <div
                className={`h-8 border-b border-slate-800/80 relative overflow-hidden bg-slate-950/40 select-none group ${trackLocks.pemf ? 'opacity-70 bg-[radial-gradient(#1e293b_1px,transparent_1px)]' : ''
                  }`}
                onDoubleClick={(e) => handleLaneDoubleClick('pemf', e)}
                title="Klik ganda di area kosong untuk menambah PEMF"
              >
                <canvas ref={canvasPemfRef} width={effectiveWidth} height={32} className="w-full h-full block absolute inset-0 pointer-events-none" />
                <div className="absolute inset-0 pointer-events-auto">
                  {(sessionData?.pemfEvents || []).map((ev, idx) => {
                    const isDragging = dragState?.type === 'pemf' && dragState?.index === idx;
                    const startSec = isDragging ? dragState.currentSec : parseTimeStrToSeconds(ev[0]);
                    const mode = parseInt(ev[1]) || 1;
                    const durSec = mode === 2 ? 30 : mode === 3 ? 3 : 10;
                    const leftPx = (startSec / winSize) * effectiveWidth;
                    const widthPx = Math.max(38, (durSec / winSize) * effectiveWidth);
                    const isSelected = selectedClip?.type === 'pemf' && selectedClip?.index === idx;

                    return (
                      <div
                        key={`pemf-${idx}`}
                        onMouseDown={(e) => handleClipMouseDown('pemf', idx, e, durSec)}
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedClip({ type: 'pemf', index: idx });
                        }}
                        className={`absolute top-1 bottom-1 rounded-md flex items-center px-1.5 gap-1 select-none transition-all ${trackLocks.pemf ? 'cursor-not-allowed' : 'cursor-grab active:cursor-grabbing'
                          } border shadow-sm ${isSelected
                            ? 'bg-sky-600 border-white ring-2 ring-sky-300 shadow-lg shadow-sky-500/50 z-20 scale-[1.02]'
                            : isDragging
                              ? 'bg-sky-500 border-white shadow-xl z-30 opacity-90'
                              : 'bg-gradient-to-r from-sky-700 to-sky-800 hover:from-sky-600 hover:to-sky-700 border-sky-500/80 text-white z-10'
                          }`}
                        style={{
                          left: `${leftPx}px`,
                          width: `${widthPx}px`
                        }}
                        title={`PEMF Mode ${ev[1] || '1'} (${formatSecondsToTimeStr(startSec)}, ${durSec}s) - Drag untuk geser, Klik untuk edit`}
                      >
                        <Zap size={10} className="shrink-0 text-sky-200 pointer-events-none" />
                        <span className="text-[9px] font-bold truncate text-white pointer-events-none">
                          Mode {ev[1] || '1'}
                        </span>
                        <span className="text-[8px] font-mono text-sky-200 shrink-0 pointer-events-none opacity-80">
                          {durSec}s
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* N1 NIR Lane (Interactive Draggable Clips) */}
              <div
                className={`h-8 border-b border-slate-800/80 relative overflow-hidden bg-slate-950/40 select-none group ${trackLocks.nir ? 'opacity-70 bg-[radial-gradient(#1e293b_1px,transparent_1px)]' : ''
                  }`}
                onDoubleClick={(e) => handleLaneDoubleClick('nir', e)}
                title="Klik ganda di area kosong untuk menambah NIR"
              >
                <canvas ref={canvasNirRef} width={effectiveWidth} height={32} className="w-full h-full block absolute inset-0 pointer-events-none" />
                <div className="absolute inset-0 pointer-events-auto">
                  {(sessionData?.nirEvents || []).map((ev, idx) => {
                    const isDragging = dragState?.type === 'nir' && dragState?.index === idx;
                    const startSec = isDragging ? dragState.currentSec : parseTimeStrToSeconds(ev[0]);
                    const mode = parseInt(ev[1]) || 1;
                    const durSec = mode === 2 ? 30 : mode === 3 ? 3 : 10;
                    const leftPx = (startSec / winSize) * effectiveWidth;
                    const widthPx = Math.max(38, (durSec / winSize) * effectiveWidth);
                    const isSelected = selectedClip?.type === 'nir' && selectedClip?.index === idx;

                    return (
                      <div
                        key={`nir-${idx}`}
                        onMouseDown={(e) => handleClipMouseDown('nir', idx, e, durSec)}
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedClip({ type: 'nir', index: idx });
                        }}
                        className={`absolute top-1 bottom-1 rounded-md flex items-center px-1.5 gap-1 select-none transition-all ${trackLocks.nir ? 'cursor-not-allowed' : 'cursor-grab active:cursor-grabbing'
                          } border shadow-sm ${isSelected
                            ? 'bg-rose-600 border-white ring-2 ring-rose-300 shadow-lg shadow-rose-500/50 z-20 scale-[1.02]'
                            : isDragging
                              ? 'bg-rose-500 border-white shadow-xl z-30 opacity-90'
                              : 'bg-gradient-to-r from-rose-700 to-rose-800 hover:from-rose-600 hover:to-rose-700 border-rose-500/80 text-white z-10'
                          }`}
                        style={{
                          left: `${leftPx}px`,
                          width: `${widthPx}px`
                        }}
                        title={`NIR Mode ${ev[1] || '1'} (${formatSecondsToTimeStr(startSec)}, ${durSec}s) - Drag untuk geser, Klik untuk edit`}
                      >
                        <Sun size={10} className="shrink-0 text-rose-200 pointer-events-none" />
                        <span className="text-[9px] font-bold truncate text-white pointer-events-none">
                          Mode {ev[1] || '1'}
                        </span>
                        <span className="text-[8px] font-mono text-rose-200 shrink-0 pointer-events-none opacity-80">
                          {durSec}s
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 3. FLOATING CLIP INSPECTOR POPOVER */}
      {selectedClip && selectedClipData && (
        <div
          className="absolute top-11 right-4 z-40 bg-slate-900/95 backdrop-blur-md border border-slate-700 rounded-xl p-2.5 shadow-2xl w-72 max-h-[220px] overflow-y-auto text-xs text-slate-200 select-none scrollbar-thin animate-in fade-in zoom-in-95 duration-150"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Popover Header */}
          <div className="flex items-center justify-between pb-2 border-b border-slate-800 mb-2.5">
            <div className="flex items-center gap-1.5 font-bold">
              {selectedClip.type === 'olf' ? (
                <>
                  <Wind size={14} className="text-purple-400" />
                  <span className="text-purple-200">Edit Aroma #{selectedClip.index + 1}</span>
                </>
              ) : selectedClip.type === 'pemf' ? (
                <>
                  <Zap size={14} className="text-sky-400" />
                  <span className="text-sky-200">Edit PEMF #{selectedClip.index + 1}</span>
                </>
              ) : (
                <>
                  <Sun size={14} className="text-rose-400" />
                  <span className="text-rose-200">Edit NIR #{selectedClip.index + 1}</span>
                </>
              )}
            </div>
            <button
              type="button"
              onClick={() => setSelectedClip(null)}
              className="text-slate-400 hover:text-white transition p-0.5 rounded hover:bg-slate-800 cursor-pointer"
            >
              <X size={14} />
            </button>
          </div>

          {/* Timecode adjustment */}
          <div className="flex items-center justify-between gap-2 mb-2.5 bg-slate-950 p-2 rounded-lg border border-slate-800">
            <span className="text-[11px] text-slate-400">Waktu Mulai:</span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => handleNudgeTime(-1)}
                className="px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 font-mono text-[10px] cursor-pointer"
                title="Mundur 1 detik"
              >
                -1s
              </button>
              <input
                type="text"
                value={selectedClipData[0] || '00:00'}
                onChange={(e) => handleUpdateClipField(selectedClip.type, selectedClip.index, 0, e.target.value)}
                className="w-16 px-1.5 py-0.5 text-center bg-slate-900 border border-slate-700 rounded font-mono font-bold text-amber-300 text-xs focus:outline-none focus:border-amber-400"
              />
              <button
                type="button"
                onClick={() => handleNudgeTime(1)}
                className="px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 font-mono text-[10px] cursor-pointer"
                title="Maju 1 detik"
              >
                +1s
              </button>
            </div>
          </div>

          {/* Olfactory Scent & Duration Options */}
          {selectedClip.type === 'olf' && (
            <div className="space-y-2 mb-3">
              <div>
                <span className="text-[10px] text-slate-400 font-semibold block mb-1">Pilih Aroma (Scent):</span>
                <div className="grid grid-cols-3 gap-1">
                  {(olfactoryList || []).map((item) => {
                    const scent = item.scent;
                    return (
                      <button
                        key={scent}
                        type="button"
                        onClick={() => handleUpdateClipField('olf', selectedClip.index, 1, scent)}
                        className={`px-1.5 py-1 rounded text-[10px] font-bold truncate transition border cursor-pointer ${selectedClipData[1] === scent
                          ? 'bg-purple-600 text-white border-purple-400 shadow-sm'
                          : 'bg-slate-800/80 hover:bg-slate-800 text-slate-300 border-slate-700'
                          }`}
                      >
                        {scent}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <span className="text-[10px] text-slate-400 font-semibold block mb-1">Durasi Semprotan:</span>
                <div className="flex gap-1">
                  {[
                    { label: '1s', val: '1000' },
                    { label: '2s', val: '2000' },
                    { label: '3s', val: '3000' },
                    { label: '5s', val: '5000' }
                  ].map(({ label, val }) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => handleUpdateClipField('olf', selectedClip.index, 2, val)}
                      className={`flex-1 py-1 rounded text-[10px] font-mono font-bold transition border cursor-pointer ${String(selectedClipData[2] || '3000') === val
                        ? 'bg-purple-600 text-white border-purple-400'
                        : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white'
                        }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* PEMF Mode Options */}
          {selectedClip.type === 'pemf' && (
            <div className="space-y-1.5 mb-3">
              <span className="text-[10px] text-slate-400 font-semibold block mb-1">Pilih Mode PEMF:</span>
              <div className="grid grid-cols-3 gap-1">
                {[
                  { mode: '1', label: 'Mode 1 (10s)', desc: 'Standard' },
                  { mode: '2', label: 'Mode 2 (30s)', desc: 'Deep' },
                  { mode: '3', label: 'Mode 3 (3s)', desc: 'Burst' }
                ].map((item) => (
                  <button
                    key={item.mode}
                    type="button"
                    onClick={() => handleUpdateClipField('pemf', selectedClip.index, 1, item.mode)}
                    className={`p-1.5 rounded text-center transition border cursor-pointer ${String(selectedClipData[1] || '1') === item.mode
                      ? 'bg-sky-600 text-white border-sky-400 shadow-sm'
                      : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
                      }`}
                  >
                    <div className="font-bold text-[10px]">{item.label}</div>
                    <div className="text-[8px] opacity-70">{item.desc}</div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* NIR Mode Options */}
          {selectedClip.type === 'nir' && (
            <div className="space-y-1.5 mb-3">
              <span className="text-[10px] text-slate-400 font-semibold block mb-1">Pilih Mode NIR:</span>
              <div className="grid grid-cols-3 gap-1">
                {[
                  { mode: '1', label: 'Mode 1 (10s)', desc: 'PBM Light' },
                  { mode: '2', label: 'Mode 2 (30s)', desc: 'Extended' },
                  { mode: '3', label: 'Mode 3 (3s)', desc: 'Strobe Flash' }
                ].map((item) => (
                  <button
                    key={item.mode}
                    type="button"
                    onClick={() => handleUpdateClipField('nir', selectedClip.index, 1, item.mode)}
                    className={`p-1.5 rounded text-center transition border cursor-pointer ${String(selectedClipData[1] || '1') === item.mode
                      ? 'bg-rose-600 text-white border-rose-400 shadow-sm'
                      : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
                      }`}
                  >
                    <div className="font-bold text-[10px]">{item.label}</div>
                    <div className="text-[8px] opacity-70">{item.desc}</div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Actions: Delete & Close */}
          <div className="flex items-center justify-between pt-2 border-t border-slate-800">
            <span className="text-[9px] text-slate-500">
              Tekan <kbd className="px-1 py-0.5 rounded bg-slate-800 text-slate-400 font-mono">Del</kbd> untuk hapus
            </span>
            <button
              type="button"
              onClick={handleDeleteSelectedClip}
              className="px-2.5 py-1 rounded bg-rose-600/20 hover:bg-rose-600 text-rose-300 hover:text-white text-[10.5px] font-bold transition flex items-center gap-1 border border-rose-500/40 shadow-sm cursor-pointer"
            >
              <Trash2 size={11} />
              <span>Hapus Klip</span>
            </button>
          </div>
        </div>
      )}

      {/* 4. LIVE DRAGGING / TRIMMING TOOLTIP */}
      {dragState && (
        <div
          className="fixed z-50 pointer-events-none -translate-x-1/2 -translate-y-9 px-2.5 py-1 rounded-lg bg-amber-400 text-slate-950 font-mono font-black text-[11px] shadow-2xl flex items-center gap-1.5 border border-amber-300"
          style={{ left: `${mousePos.x}px`, top: `${mousePos.y}px` }}
        >
          <MoveHorizontal size={12} />
          <span>{formatAccurateTime(dragState.currentSec)}</span>
        </div>
      )}

      {trimState && (
        <div
          className="fixed z-50 pointer-events-none -translate-x-1/2 -translate-y-9 px-2.5 py-1 rounded-lg bg-purple-500 text-white font-mono font-black text-[11px] shadow-2xl flex items-center gap-1.5 border border-purple-300"
          style={{ left: `${mousePos.x}px`, top: `${mousePos.y}px` }}
        >
          <span>Durasi: {(trimState.currentDurMs / 1000).toFixed(1)}s</span>
        </div>
      )}
    </div>
  );
}
