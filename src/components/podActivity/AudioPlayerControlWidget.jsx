import React, { useState, useEffect, useRef } from 'react';
import { Volume2 } from 'lucide-react';

const AudioPlayerControlWidget = ({ seekData, playAudioData, stateData, trackListData, ambienceDurData, trackCmdData, mediaInfo, sessionData }) => {
  let durVal = 0;
  let posVal = 0;

  const seekDataState = seekData;
  let posTimestamp = seekDataState?.timestamp || 0;
  if (seekDataState?.payload) {
    try {
      const trackStartTs = playAudioData?.timestamp || 0;
      const seekTs = seekDataState?.timestamp || 0;

      const cmdTs = trackCmdData?.timestamp || 0;
      const cmdStr = trackCmdData?.payload ? String(trackCmdData.payload).trim().toLowerCase() : '';
      
      // Code 3 is Resume. 
      const isResume = (cmdStr === '3' || cmdStr.includes('resume')) && Math.abs(trackStartTs - cmdTs) < 5000;

      // Stale seek prevention: if seek is older than track start, ignore its position
      // EXCEPTION: if we just issued a RESUME command (3), keep the old seek data!
      const isStale = seekTs < trackStartTs && trackStartTs > 0 && !isResume;

      let parsedPayload = null;
      try {
        parsedPayload = typeof seekDataState.payload === 'string' ? JSON.parse(seekDataState.payload) : seekDataState.payload;
      } catch (_) { }

      if (parsedPayload && typeof parsedPayload === 'object' && !isStale) {
        if (parsedPayload.position !== undefined) {
          posVal = Number(parsedPayload.position);
        }
        if (parsedPayload.duration !== undefined) {
          durVal = Number(parsedPayload.duration);
        }
        posTimestamp = seekTs;
      } else if (seekDataState && seekDataState.payload && !isStale && typeof parsedPayload !== 'object') {
        posVal = Number(seekDataState.payload);
        posTimestamp = seekTs;
      }

      if (isStale) {
        posVal = 0;
        posTimestamp = trackStartTs;
      }
    } catch (_) { }
  }

  let isPlaying = false;
  let stateText = 'Idle';

  // State is accurately provided by mod_audio/track/state
  if (stateData?.payload) {
    try {
      const parsed = typeof stateData.payload === 'string' ? JSON.parse(stateData.payload) : stateData.payload;
      isPlaying = (parsed.state === "1" || parsed.state === 1) && !String(parsed.state).includes('0');
      stateText = isPlaying ? 'Playing' : 'Paused';

      // If the track explicitly says it's empty, it's STOPPED!
      if (parsed.track === 'null' || parsed.track === 'undefined' || parsed.track === 'Idle' || parsed.track === '') {
        stateText = 'Stopped';
      }
    } catch (_) {
      // Fallback
    }
  } else if (seekDataState?.timestamp) {
    const elapsedSinceSeek = Date.now() - seekDataState.timestamp;
    isPlaying = elapsedSinceSeek < 10000;
    stateText = isPlaying ? 'Playing' : 'Paused';
  } else if (playAudioData?.payload) {
    isPlaying = true;
    stateText = 'Playing';
  }

  const rawPayload = playAudioData?.payload || '927773';
  let title = mediaInfo
    ? (mediaInfo.title || mediaInfo.name || mediaInfo.sound_scape || rawPayload)
    : rawPayload;

  // If session-data is newer than play_audio, prioritize session-data!
  const playTs = playAudioData?.timestamp || 0;
  const sessionTs = sessionData?.timestamp || 0;
  if (sessionData && sessionData.payload && sessionTs >= playTs) {
    try {
      const parsedSess = typeof sessionData.payload === 'string' ? JSON.parse(sessionData.payload) : sessionData.payload;
      if (parsedSess.session_id) {
        title = parsedSess.session_id;
      }
    } catch (_) { }
  }

  // Fallback title to track/state only if still idle (so Voice Guide doesn't overwrite Session)
  if ((title === 'Idle' || title === '927773' || !playAudioData) && stateData?.payload) {
    try {
      const parsed = typeof stateData.payload === 'string' ? JSON.parse(stateData.payload) : stateData.payload;
      if (parsed.track && parsed.track !== 'undefined' && parsed.track !== 'null' && parsed.track !== 'Idle' && parsed.track !== '') {
        title = parsed.track;
      }
    } catch (_) { }
  }

  let isStopped = stateText.toLowerCase().includes('stop') || stateText.toLowerCase().includes('idle');
  if (trackCmdData?.payload) {
    const cmdTs = trackCmdData.timestamp || 0;
    const trackTs = playAudioData?.timestamp || 0;
    const stateTs = stateData?.timestamp || 0;
    
    if (cmdTs >= trackTs) {
      const cmdStr = String(trackCmdData.payload).trim().toLowerCase();
      
      // If command was PAUSE ('2')
      if (cmdStr === '2' || cmdStr.includes('pause')) {
        // Ensure it doesn't get marked as stopped if we recently paused it
        if (cmdTs >= stateTs - 5000) {
          isStopped = false;
          stateText = 'Paused';
          isPlaying = false;
        }
      }
      // If command was RESUME ('3')
      else if (cmdStr === '3' || cmdStr.includes('resume')) {
        if (cmdTs >= stateTs - 5000) {
          isStopped = false;
          stateText = 'Playing';
          isPlaying = true;
        }
      }
      // If command was PLAY/STOP Toggle ('0')
      // We do not force isStopped = true here because it could be PLAY. 
      // We will let the stateData dictate the true state for command '0'.
    }
  }

  // If explicitly stopped, clear ghost metadata!
  if (isStopped) {
    title = 'Idle';
    durVal = 0;
    posVal = 0;
  }

  const lowerTitle = String(title).toLowerCase();
  const lowerRaw = String(rawPayload).toLowerCase();
  const isInvalid = lowerTitle.includes('voice') || lowerRaw.includes('voice') ||
    lowerTitle.includes('undefined') || lowerRaw.includes('undefined');

  if (isInvalid || title === 'Idle') {
    title = 'Idle';
    isPlaying = false;
    stateText = 'Stopped';
  }

  // Attempt to override duration from track/list if missing
  if (trackListData && trackListData.payload && title && title !== 'Idle' && durVal === 0) {
    try {
      const parsedList = typeof trackListData.payload === 'string' ? JSON.parse(trackListData.payload) : trackListData.payload;
      if (Array.isArray(parsedList)) {
        const track = parsedList.find(t =>
          t.display === title ||
          String(t.id) === String(title) ||
          t.details?.title === title ||
          String(t.scent) === title
        );
        if (track && track.duration) {
          const tDur = Number(track.duration);
          durVal = tDur > 20000 ? Math.floor(tDur / 1000) : tDur;
        }
      }
    } catch (_) { }
  }

  // LAST RESORT: Check mediaInfo or sessionData for duration
  if (durVal === 0) {
    if (mediaInfo?.duration) {
      const mDur = Number(mediaInfo.duration);
      if (!isNaN(mDur) && mDur > 0) durVal = mDur > 20000 ? Math.floor(mDur / 1000) : mDur;
    } else if (mediaInfo?.length) {
      const mDur = Number(mediaInfo.length);
      if (!isNaN(mDur) && mDur > 0) durVal = mDur > 20000 ? Math.floor(mDur / 1000) : mDur;
    } else if (sessionData?.payload) {
      try {
        const parsedSess = typeof sessionData.payload === 'string' ? JSON.parse(sessionData.payload) : sessionData.payload;
        if (parsedSess.duration) {
          const sDur = Number(parsedSess.duration);
          if (!isNaN(sDur) && sDur > 0) durVal = sDur > 20000 ? Math.floor(sDur / 1000) : sDur;
        }
      } catch (_) { }
    }
  }

  // ULTRA LAST RESORT: Check LocalStorage for previously saved duration
  if (durVal === 0 && title && title !== 'Idle') {
    try {
      const cachedDur = localStorage.getItem(`pod_duration_${title}`);
      if (cachedDur) {
        const parsed = Number(cachedDur);
        // If parsed duration is ridiculously large (e.g. 5000000ms for a voice guide), ignore it (corrupted from old bug)
        if (!isNaN(parsed) && parsed > 0 && parsed < 100000) durVal = parsed;
      }
    } catch (_) { }
  }

  // Save successful duration to LocalStorage to remember it across page reloads
  useEffect(() => {
    if (durVal > 0 && title && title !== 'Idle') {
      try {
        localStorage.setItem(`pod_duration_${title}`, durVal.toString());
      } catch (_) { }
    }
  }, [durVal, title]);

  const formatMinSec = (sec) => {
    const total = sec > 10000 ? Math.floor(sec / 1000) : sec;
    const m = Math.floor(total / 60);
    const s = Math.floor(total % 60);
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };


  const lampStr = mediaInfo?.lamp ? ` • Lamp: ${mediaInfo.lamp}` : '';
  const timestampStr = playAudioData?.timestamp
    ? new Date(playAudioData.timestamp).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    : '16.26.58';

  const rawPos = posVal;
  const rawDur = durVal;

  const [localPos, setLocalPos] = useState(rawPos);

  const effectiveDur = rawDur > 0 ? rawDur : 0;
  const lastSyncTs = useRef(0);

  useEffect(() => {
    if (isStopped && !isPlaying) {
      setLocalPos(0);
      lastSyncTs.current = posTimestamp;
      return;
    }

    if (posTimestamp > lastSyncTs.current) {
      let compensatedPos = rawPos;
      if (isPlaying) {
        const elapsedSincePacket = Math.floor((Date.now() - posTimestamp) / 1000);
        const compensation = elapsedSincePacket > 2 ? elapsedSincePacket : 0;
        compensatedPos += compensation;
      }

      setLocalPos(effectiveDur > 0 ? Math.min(effectiveDur, compensatedPos) : compensatedPos);
      lastSyncTs.current = posTimestamp;
    }
  }, [rawPos, isPlaying, posTimestamp, effectiveDur]);

  useEffect(() => {
    if (!isPlaying) return;
    const interval = setInterval(() => {
      setLocalPos(prev => {
        if (effectiveDur > 0) {
          return prev < effectiveDur ? prev + 1 : prev;
        }
        return prev + 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [isPlaying, effectiveDur]);

  const remainingSec = isPlaying && effectiveDur > 0 ? Math.max(0, effectiveDur - localPos) : 0;
  const progressPercent = effectiveDur > 0 ? Math.min(100, (localPos / effectiveDur) * 100) : 0;

  if (title === 'Idle') {
    return (
      <div className="col-span-full bg-slate-900/90 border border-slate-700/80 rounded-2xl p-4 flex flex-col items-center justify-center gap-2 shadow-xl ring-1 ring-slate-500/20 min-h-[120px]">
        <Volume2 size={28} className="text-slate-600 opacity-50" />
        <span className="text-xs font-semibold text-slate-500 italic">Menunggu sesi aktif...</span>
      </div>
    );
  }

  return (
    <div className="col-span-full bg-slate-900/90 border border-slate-700/80 rounded-2xl p-4 flex flex-col gap-3 shadow-xl ring-1 ring-cyan-500/20">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-cyan-500/20 text-cyan-400 rounded-xl border border-cyan-500/30 shrink-0">
            <Volume2 size={24} />
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Active Audio Track</span>
            <h3 className="text-sm sm:text-base font-bold text-white leading-tight mt-0.5">{title}</h3>
            <span className="text-[10px] text-cyan-400 font-semibold mt-0.5 block">
              ID: {rawPayload}{lampStr}
            </span>
            <span className="text-[10px] font-mono text-slate-400 mt-0.5 block">{timestampStr}</span>
          </div>
        </div>

        {/* Digital Elapsed Timer Badge */}
        <div className="flex items-center gap-3 bg-slate-950/90 px-3.5 py-2 rounded-xl border border-cyan-500/30 shrink-0">
          <div className="flex flex-col items-end">
            <span className="text-[9px] uppercase font-bold text-slate-400">Durasi Berjalan (Posisi)</span>
            <span className="font-mono text-lg font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-teal-300 to-emerald-400">
              {formatMinSec(localPos)}
            </span>
          </div>
          <span className={`px-2.5 py-1 rounded-full text-xs font-bold shrink-0 ${isPlaying
            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
            : 'bg-slate-800 text-slate-400'
            }`}>
            {stateText}
          </span>
        </div>
      </div>

      <div className="flex flex-col gap-1.5 mt-1 bg-slate-950/80 p-3 rounded-xl border border-slate-800">
        <div className="flex items-center justify-between text-xs font-mono text-slate-300">
          <span className="font-bold text-cyan-400">Posisi: {formatMinSec(localPos)}</span>
          <span className="text-slate-500">Total: {formatMinSec(effectiveDur)}</span>
        </div>
        <div className="relative w-full h-3 bg-slate-900 rounded-full overflow-hidden border border-slate-800">
          <div
            className={`absolute top-0 left-0 h-full transition-all duration-1000 ease-linear ${isPlaying ? 'bg-gradient-to-r from-cyan-500 to-teal-400' : 'bg-slate-600'
              }`}
            style={{ width: `${progressPercent}%` }}
          ></div>
        </div>
        <div className="flex items-center justify-between text-[9px] font-mono text-slate-600 mt-0.5">
          <span>Position: {localPos}s</span>
          <span>Total: {effectiveDur}s</span>
        </div>
      </div>
    </div>
  );
};

export default AudioPlayerControlWidget;
