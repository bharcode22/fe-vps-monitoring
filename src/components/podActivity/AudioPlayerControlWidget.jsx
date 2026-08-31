import React, { useState, useEffect, useRef } from 'react';
import { Volume2, Sun, Activity, Play, Pause, Square, Power, SkipForward, Wind } from 'lucide-react';

const MiniCircle = ({ label, value, icon: Icon, percentage, colorClass, strokeClass }) => {
  const r = 52;
  const strk = 8;
  const nR = r - strk;
  const circ = nR * 2 * Math.PI;
  const offset = circ - (Math.min(100, Math.max(0, percentage)) / 100) * circ;

  return (
    <div className="flex flex-col items-center justify-center relative transition-all hover:scale-105 z-30 group">
      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2.5">{label}</span>
      <div className="relative flex items-center justify-center w-28 h-28 bg-slate-950/80 backdrop-blur-md rounded-full border border-slate-700/50 shadow-xl group-hover:bg-slate-800/80">
        <svg height={r * 2} width={r * 2} className="transform -rotate-90 drop-shadow-md absolute inset-0 m-auto pointer-events-none">
          <circle stroke="rgba(30, 41, 59, 0.4)" fill="transparent" strokeWidth={strk} r={nR} cx={r} cy={r} />
          <circle 
            stroke="currentColor" fill="transparent" strokeWidth={strk} 
            strokeDasharray={`${circ} ${circ}`} style={{ strokeDashoffset: offset, transition: 'stroke-dashoffset 1s ease-in-out' }} 
            strokeLinecap="round" r={nR} cx={r} cy={r} className={strokeClass} 
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none mt-0.5 gap-1">
          <Icon size={20} className={`${colorClass} opacity-90`} />
          <span className="text-sm font-black text-white leading-none">{value}</span>
        </div>
      </div>
    </div>
  );
};

const AudioPlayerControlWidget = ({ seekData, playAudioData, stateData, trackListData, ambienceDurData, trackCmdData, mediaInfo, sessionData, stroboData, audioLevelData, vibrationData, olfactoryData, onPublish }) => {
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

  // Removed Idle return block to show empty dashboard

  // Helpers for SVG Circle
  const radius = 120;
  const stroke = 12;
  const normalizedRadius = radius - stroke * 2;
  const circumference = normalizedRadius * 2 * Math.PI;
  const strokeDashoffset = circumference - (progressPercent / 100) * circumference;

  const stroboVal = stroboData?.payload || '0';
  const audioVal = audioLevelData?.payload || '0';
  const vibrationVal = vibrationData?.payload || '0';

  const [scentProgress, setScentProgress] = useState(0);
  let scentLabel = '-';
  let scentWidthMs = 0;
  try {
    if (olfactoryData?.payload && typeof olfactoryData.payload === 'string') {
      const p = JSON.parse(olfactoryData.payload);
      if (p.scent !== undefined) scentLabel = String(p.scent);
      if (p.width !== undefined) scentWidthMs = Number(p.width);
    }
  } catch (_) {}

  useEffect(() => {
    if (scentWidthMs > 0 && olfactoryData?.timestamp) {
      const interval = setInterval(() => {
        const elapsed = Date.now() - olfactoryData.timestamp;
        const left = Math.max(0, scentWidthMs - elapsed);
        setScentProgress(Math.max(0, Math.min(100, (left / scentWidthMs) * 100)));
        if (left === 0) clearInterval(interval);
      }, 100);
      return () => clearInterval(interval);
    } else {
      setScentProgress(0);
    }
  }, [olfactoryData?.timestamp, scentWidthMs]);

  return (
    <div className="col-span-full bg-slate-900/85 backdrop-blur-xl border border-slate-800/90 rounded-3xl p-6 md:p-8 flex flex-col gap-6 shadow-2xl ring-1 ring-cyan-500/20 relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[650px] h-[650px] bg-cyan-500/5 rounded-full blur-3xl pointer-events-none"></div>

      {/* Top Header Row inside the Card: Track Info & Controls */}
      <div className="flex flex-wrap items-center justify-between gap-4 z-10 border-b border-slate-800/60 pb-4">
        {/* Left: Active Track Info */}
        <div className="flex items-center gap-3.5">
          <div className="p-2.5 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
            <Volume2 size={20} />
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400">
              Active Track
            </span>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="text-sm md:text-base font-bold text-white font-mono break-all">
                <span className="text-slate-400 font-sans text-xs font-semibold mr-1.5">Song:</span>
                {mediaInfo?.lamp || mediaInfo?.song || mediaInfo?.song_name || mediaInfo?.title || title}
              </span>
            </div>
          </div>
        </div>

        {/* Right: Audio State Pill */}
        <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-slate-950/70 border border-slate-800 text-xs font-mono text-slate-300 shadow-sm">
          <span className={`w-2 h-2 rounded-full ${isPlaying ? 'bg-cyan-400 animate-pulse' : 'bg-slate-500'}`}></span>
          <span className="font-bold tracking-wider">{stateText.toUpperCase()}</span>
        </div>
      </div>

      {/* Main Center Area: Symmetrical 5-Dial Cockpit Cluster */}
      <div className="flex flex-wrap items-center justify-center gap-6 sm:gap-10 md:gap-14 py-2 z-10">
        
        {/* Left Side Dials */}
        <div className="flex flex-col gap-6 sm:gap-8">
          <MiniCircle label="Strobo" value={stroboVal+"%"} percentage={Number(stroboVal)||0} icon={Sun} colorClass="text-amber-400" strokeClass="text-amber-500" />
          <MiniCircle label="Audio" value={audioVal+"%"} percentage={Number(audioVal)||0} icon={Volume2} colorClass="text-cyan-400" strokeClass="text-cyan-500" />
        </div>

        {/* Central Circular Progress */}
        <div className="relative flex items-center justify-center w-64 h-64 md:w-72 md:h-72 z-20 pointer-events-none drop-shadow-2xl mx-2">
          <svg
            height={radius * 2}
            width={radius * 2}
            className="transform -rotate-90 drop-shadow-2xl scale-100 md:scale-105 transition-transform"
          >
            {/* Background track */}
            <circle
              stroke="rgba(30, 41, 59, 0.4)"
              fill="transparent"
              strokeWidth={stroke}
              r={normalizedRadius}
              cx={radius}
              cy={radius}
            />
            {/* Progress track */}
            <circle
              stroke="currentColor"
              fill="transparent"
              strokeWidth={stroke}
              strokeDasharray={circumference + ' ' + circumference}
              style={{ strokeDashoffset, transition: 'stroke-dashoffset 1s linear' }}
              strokeLinecap="round"
              r={normalizedRadius}
              cx={radius}
              cy={radius}
              className={isPlaying ? "text-cyan-400" : "text-slate-500"}
            />
          </svg>

          {/* Center Content */}
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-4">
            <span className={`px-3 py-0.5 rounded-full text-[10px] font-extrabold tracking-widest mb-2 ${
              isPlaying ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30' : 'bg-slate-800/90 text-slate-400 border border-slate-700'
            }`}>
              {stateText.toUpperCase()}
            </span>
            <span className="font-mono text-4xl md:text-5xl font-black text-white tracking-tight drop-shadow-md">
              {formatMinSec(localPos)}
            </span>
            <span className="text-xs font-mono text-slate-500 mt-1 font-semibold">
              / {formatMinSec(effectiveDur)}
            </span>
          </div>
        </div>

        {/* Right Side Dials */}
        <div className="flex flex-col gap-6 sm:gap-8">
          <MiniCircle label="Vibration" value={vibrationVal+"%"} percentage={Number(vibrationVal)||0} icon={Activity} colorClass="text-rose-400" strokeClass="text-rose-500" />
          <MiniCircle label="Scent" value={scentLabel} percentage={scentProgress} icon={Wind} colorClass="text-emerald-400" strokeClass="text-emerald-500" />
        </div>
      </div>
    </div>
  );
};

export default AudioPlayerControlWidget;
