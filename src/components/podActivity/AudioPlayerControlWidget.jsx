import React, { useState, useEffect, useRef } from 'react';
import { Volume2, Sun, Activity, Wind } from 'lucide-react';

const MiniCircle = ({ label, value, icon: Icon, percentage, colorClass, strokeClass }) => {
  const r = 52;
  const strk = 8;
  const nR = r - strk;
  const circ = nR * 2 * Math.PI;
  const offset = circ - (Math.min(100, Math.max(0, percentage)) / 100) * circ;

  return (
    <div className="flex flex-col items-center justify-center relative transition-all hover:scale-105 z-30 group">
      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">{label}</span>
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

      const isResume = (cmdStr === '1' || cmdStr === '3' || cmdStr.includes('resume') || cmdStr.includes('play')) && Math.abs(trackStartTs - cmdTs) < 5000;
      const isStale = seekTs < trackStartTs && trackStartTs > 0 && !isResume;

      let parsedPayload = null;
      try {
        parsedPayload = typeof seekDataState.payload === 'string' ? JSON.parse(seekDataState.payload) : seekDataState.payload;
      } catch (_) { }

      if (parsedPayload && typeof parsedPayload === 'object' && !isStale) {
        if (parsedPayload.position !== undefined) posVal = Number(parsedPayload.position);
        if (parsedPayload.duration !== undefined) durVal = Number(parsedPayload.duration);
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

  const isVoiceGuideTrack = (trackName) => {
    if (!trackName) return false;
    const s = String(trackName).toLowerCase();
    return s.includes('voice') || s.includes('guide') || s.includes('prompt') || s.includes('intro') || s.includes('outro') || s.includes('announcement');
  };

  let title = 'Idle';

  // 1. Prioritize real session data from session-data topic
  if (sessionData?.payload) {
    try {
      const sObj = typeof sessionData.payload === 'string' ? JSON.parse(sessionData.payload) : sessionData.payload;
      if (sObj.title && !isVoiceGuideTrack(sObj.title)) title = sObj.title;
      else if (sObj.name && !isVoiceGuideTrack(sObj.name)) title = sObj.name;
      else if (sObj.soundscape && !isVoiceGuideTrack(sObj.soundscape)) title = sObj.soundscape;
      else if (sObj.session_id && !isVoiceGuideTrack(sObj.session_id)) title = sObj.session_id;
    } catch (_) { }
  }

  // 2. Next check playAudioData (soundscape ID or audio payload)
  if (title === 'Idle' && playAudioData?.payload) {
    try {
      const p = typeof playAudioData.payload === 'string' ? JSON.parse(playAudioData.payload) : playAudioData.payload;
      const rawTitle = p.title || p.name || p.id || (typeof p === 'string' || typeof p === 'number' ? String(p) : '');
      if (rawTitle && !isVoiceGuideTrack(rawTitle)) {
        title = rawTitle;
      }
    } catch (_) {
      const rawStr = String(playAudioData.payload);
      if (!isVoiceGuideTrack(rawStr)) {
        title = rawStr;
      }
    }
  }

  // 3. Check mediaInfo database resolution (only if not a voice guide)
  if (mediaInfo) {
    const resolved = mediaInfo.lamp || mediaInfo.song || mediaInfo.song_name || mediaInfo.title || mediaInfo.sound_scape;
    if (resolved && !isVoiceGuideTrack(resolved)) {
      title = resolved;
    }
  }

  // Check stateData for Voice Guide vs Session play state
  let voiceGuideTrack = null;
  let isVoicePlaying = false;
  let stateParsedState = null;

  if (stateData?.payload) {
    try {
      const parsed = typeof stateData.payload === 'string' && (stateData.payload.startsWith('{') || stateData.payload.startsWith('['))
        ? JSON.parse(stateData.payload)
        : stateData.payload;

      const rawStateStr = typeof parsed === 'object' && parsed !== null ? String(parsed.state ?? '') : String(parsed);
      stateParsedState = rawStateStr;

      if (parsed && typeof parsed === 'object' && parsed.track && isVoiceGuideTrack(parsed.track)) {
        voiceGuideTrack = parsed.track;
        isVoicePlaying = rawStateStr === '1' || rawStateStr === '0';
      } else if (parsed && typeof parsed === 'object' && parsed.track && parsed.track !== 'null' && parsed.track !== 'undefined' && parsed.track !== 'Idle' && parsed.track !== '') {
        if (title === 'Idle') {
          title = parsed.track;
        }
      }
    } catch (_) { }
  }

  // Determine active track
  const hasActiveTrack = (title !== 'Idle' && title !== 'null' && title !== 'undefined' && !isVoiceGuideTrack(title)) || Boolean(playAudioData?.payload && !isVoiceGuideTrack(playAudioData.payload)) || Boolean(seekDataState?.payload);

  let isPlaying = hasActiveTrack;
  let isPaused = false;
  let isStopped = !hasActiveTrack;
  let stateText = isPlaying ? 'Playing' : 'Stopped';

  if (stateParsedState === '2' || (stateParsedState && stateParsedState.includes('pause'))) {
    isPaused = true;
    isPlaying = false;
    stateText = 'Paused';
  } else if (stateParsedState === '3' || (stateParsedState && stateParsedState.includes('resume'))) {
    isPaused = false;
    isPlaying = true;
    stateText = 'Playing';
  }

  // Check trackCmdData (pause = 2, resume = 3, play/stop = 0)
  if (trackCmdData?.timestamp) {
    const timeDiff = Date.now() - trackCmdData.timestamp;
    if (timeDiff < 60000) {
      const cmd = String(trackCmdData.payload).trim().toLowerCase();

      if (cmd === '2' || cmd.includes('pause')) {
        isPaused = true;
        isPlaying = false;
        stateText = 'Paused';
      } else if (cmd === '3' || cmd === '1' || cmd.includes('resume')) {
        isPaused = false;
        isPlaying = true;
        stateText = 'Playing';
      }
    }
  }

  if (isPaused) {
    isPlaying = false;
    stateText = 'Paused';
  }

  if (durVal <= 0 && ambienceDurData?.payload) {
    const rawAmb = Number(ambienceDurData.payload);
    if (!isNaN(rawAmb) && rawAmb > 0) {
      durVal = rawAmb > 10000 ? Math.floor(rawAmb / 1000) : rawAmb;
    }
  }

  if (durVal <= 0 && sessionData?.payload) {
    try {
      const sObj = typeof sessionData.payload === 'string' ? JSON.parse(sessionData.payload) : sessionData.payload;
      if (sObj.total_duration) durVal = Math.floor(Number(sObj.total_duration) / 1000);
      else if (sObj.duration) durVal = Math.floor(Number(sObj.duration) / 1000);
    } catch (_) { }
  }

  if (mediaInfo && mediaInfo.duration) {
    const parsedMediaDur = Number(mediaInfo.duration);
    if (!isNaN(parsedMediaDur) && parsedMediaDur > 0) {
      durVal = parsedMediaDur > 10000 ? Math.floor(parsedMediaDur / 1000) : parsedMediaDur;
    }
  }

  if (durVal <= 0 && trackListData?.payload) {
    try {
      let tList = typeof trackListData.payload === 'string' ? JSON.parse(trackListData.payload) : trackListData.payload;
      if (Array.isArray(tList)) {
        const found = tList.find(t => {
          const tId = String(t.id || t.track || '').toLowerCase();
          const pPayload = String(playAudioData?.payload || '').toLowerCase();
          const curTitle = String(title).toLowerCase();
          return (pPayload && tId.includes(pPayload) && !isVoiceGuideTrack(tId)) || (curTitle && tId.includes(curTitle) && !isVoiceGuideTrack(tId)) || (t.title && curTitle.includes(String(t.title).toLowerCase()));
        });
        if (found) {
          if (found.duration) {
            const d = Number(found.duration);
            durVal = d > 10000 ? Math.floor(d / 1000) : d;
          }
          if (title === 'Idle' || !title) {
            title = found.display || found.title || found.name || title;
          }
        }
      }
    } catch (_) { }
  }

  const formatMinSec = (totalSeconds) => {
    if (!totalSeconds || isNaN(totalSeconds) || totalSeconds <= 0) return '00:00';
    const m = Math.floor(totalSeconds / 60);
    const s = Math.floor(totalSeconds % 60);
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const rawPos = posVal;
  const rawDur = durVal;

  const [localPos, setLocalPos] = useState(rawPos);
  const effectiveDur = rawDur > 0 ? rawDur : 0;
  const lastSyncTs = useRef(0);
  const activeTrackKeyRef = useRef(playAudioData?.payload || title);

  // Reset to 0 only when a brand new track is played
  useEffect(() => {
    const currentTrack = playAudioData?.payload || (title !== 'Idle' ? title : null);
    if (currentTrack && currentTrack !== activeTrackKeyRef.current && !isVoiceGuideTrack(currentTrack)) {
      activeTrackKeyRef.current = currentTrack;
      setLocalPos(0);
      lastSyncTs.current = Date.now();
    }
  }, [playAudioData?.payload, title]);

  useEffect(() => {
    // Only reset to 0 if explicitly stopped (not paused)
    if (isStopped && !isPaused && !isPlaying) {
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
        setLocalPos(effectiveDur > 0 ? Math.min(effectiveDur, compensatedPos) : compensatedPos);
      } else if (rawPos > 0) {
        // If paused, update localPos only if rawPos is valid and positive
        setLocalPos(rawPos);
      }
      lastSyncTs.current = posTimestamp;
    }
  }, [rawPos, isPlaying, isPaused, isStopped, posTimestamp, effectiveDur]);

  useEffect(() => {
    if (!isPlaying) return;
    const interval = setInterval(() => {
      setLocalPos(prev => {
        if (effectiveDur > 0) return prev < effectiveDur ? prev + 1 : prev;
        return prev + 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [isPlaying, effectiveDur]);

  const progressPercent = effectiveDur > 0 ? Math.min(100, (localPos / effectiveDur) * 100) : 0;

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
  } catch (_) { }

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
    <div className="col-span-full bg-slate-900/85 backdrop-blur-xl border border-slate-800/90 rounded-3xl md:px-8 md:py-5 flex flex-col gap-4 shadow-2xl ring-1 ring-cyan-500/20 relative overflow-hidden">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[650px] h-[650px] bg-cyan-500/5 rounded-full blur-3xl pointer-events-none"></div>

      <div className="flex flex-wrap items-center justify-between gap-3 z-10 border-b border-slate-800/60 pb-3">
        <div className="flex items-center gap-3.5">
          <div className="p-2.5 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
            <Volume2 size={20} />
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400">
              Active Track
            </span>
            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
              <span className="text-sm md:text-base font-bold text-white font-mono break-all">
                <span className="text-slate-400 font-sans text-xs font-semibold mr-1.5">Song:</span>
                {title !== 'Idle' ? (mediaInfo?.lamp || mediaInfo?.song || mediaInfo?.song_name || mediaInfo?.title || title) : 'Idle (Standby)'}
              </span>
              {voiceGuideTrack && isVoicePlaying && (
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/30 font-bold inline-flex items-center gap-1">
                  Voice Guide: {voiceGuideTrack}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-slate-950/70 border border-slate-800 text-xs font-mono text-slate-300 shadow-sm">
          <span className={`w-2 h-2 rounded-full ${isPlaying ? 'bg-cyan-400 animate-pulse' : 'bg-slate-500'}`}></span>
          <span className="font-bold tracking-wider">{stateText.toUpperCase()}</span>
        </div>
      </div>

      <div className="flex items-center justify-center md:justify-around xl:justify-center gap-4 sm:gap-6 md:gap-8 lg:gap-10 xl:gap-12 flex-wrap py-2 z-10 w-full">
        <MiniCircle
          label="Strobo"
          value={stroboVal + "%"}
          percentage={Number(stroboVal) || 0}
          icon={Sun}
          colorClass="text-amber-400"
          strokeClass="text-amber-500"
        />

        <MiniCircle
          label="Audio"
          value={audioVal + "%"}
          percentage={Number(audioVal) || 0}
          icon={Volume2}
          colorClass="text-cyan-400"
          strokeClass="text-cyan-500"
        />

        <div className="relative flex items-center justify-center w-64 h-64 md:w-72 md:h-72 z-20 pointer-events-none drop-shadow-2xl mx-2">
          <svg
            height={radius * 2}
            width={radius * 2}
            className="transform -rotate-90 drop-shadow-2xl scale-100 md:scale-105 transition-transform"
          >
            <circle
              stroke="rgba(30, 41, 59, 0.4)"
              fill="transparent"
              strokeWidth={stroke}
              r={normalizedRadius}
              cx={radius}
              cy={radius}
            />
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

          <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-4">
            <span className={`px-3 py-0.5 rounded-full text-[10px] font-extrabold tracking-widest mb-2 ${isPlaying ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30' : 'bg-slate-800/90 text-slate-400 border border-slate-700'
              }`}>
              {stateText.toUpperCase()}
            </span>
            <span className="font-mono text-4xl md:text-5xl font-black text-white tracking-tight drop-shadow-md">
              {formatMinSec(localPos)}
            </span>
          </div>
        </div>

        <MiniCircle
          label="Vibration"
          value={vibrationVal + "%"}
          percentage={Number(vibrationVal) || 0}
          icon={Activity}
          colorClass="text-rose-400"
          strokeClass="text-rose-500"
        />

        <MiniCircle
          label="Scent"
          value={scentLabel}
          percentage={scentProgress}
          icon={Wind}
          colorClass="text-emerald-400"
          strokeClass="text-emerald-500"
        />
      </div>
    </div>
  );
};

export default AudioPlayerControlWidget;
