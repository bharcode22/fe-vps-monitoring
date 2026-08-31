import React, { useState, useEffect, useRef } from 'react';
import { Volume2, Play, Pause, Square, Activity, Sun, Zap } from 'lucide-react';

const AudioSocketControlWidget = ({ eventStates, onEmit, socketTopics = [], mqttFeed = [], podId }) => {
  const [soundScapeList, setSoundScapeList] = useState([]);
  const [selectedSoundScape, setSelectedSoundScape] = useState('');

  // Local optimistic state for sliders to make them draggable smoothly
  const [localVolume, setLocalVolume] = useState(0);
  const [localVibration, setLocalVibration] = useState(0);
  const [localStrobe, setLocalStrobe] = useState(0);

  // Fetch Soundscape list
  useEffect(() => {
    const fetchList = async () => {
      try {
        const token = localStorage.getItem('vps_monitoring_token');
        const res = await fetch('/api/vps/content/multimedia-list', {
          headers: { Authorization: `Bearer ${token}` }
        });
        const json = await res.json();
        if (json.success && json.data) {
          setSoundScapeList(json.data);
          if (json.data.length > 0) {
            setSelectedSoundScape(json.data[0].sound_scape);
          }
        }
      } catch (err) {
        console.error('Failed to load multimedia list', err);
      }
    };
    fetchList();
  }, []);

  // Safe JSON parse helper
  const safeParse = (payload) => {
    if (typeof payload === 'object') return payload;
    try {
      return JSON.parse(payload);
    } catch (_) {
      return payload;
    }
  };

  const getTopic = (keyword) => {
    const match = socketTopics.find(t => t.keyword === keyword);
    return match ? (match.topic || match.name || match.event || keyword) : keyword;
  };

  const getLatestMqtt = (topicName) => {
    return mqttFeed.find(t => t.topic.includes(topicName) && t.serverId === podId);
  };

  // Extract states from Socket.io live events (Listen) or fallback to MQTT
  const parseLevel = (keyword, mqttFallbackTopic, defaultVal = 0) => {
    const eventKey = getTopic(keyword);
    let payloadStr = eventStates[eventKey]?.payload;

    // Fallback to MQTT retained message if socket hasn't emitted yet
    if (!payloadStr) {
      const mqttData = getLatestMqtt(mqttFallbackTopic);
      if (mqttData && mqttData.payload) {
        payloadStr = mqttData.payload;
      }
    }

    if (!payloadStr) return defaultVal;

    const parsed = safeParse(payloadStr);
    if (typeof parsed === 'object' && parsed !== null) {
      return Number(parsed.value || parsed.level || parsed.position || defaultVal);
    }
    return Number(parsed) || defaultVal;
  };

  const currentVolume = parseLevel('audio-volume', 'mod_audio/audio/set_level', 89);
  const currentStrobe = parseLevel('light-intensity', 'mod_audio/strobo/set_level', 76);
  const currentVibration = parseLevel('vibration-intensity', 'mod_audio/vibration/set_level', 45);

  // --- HOISTED TITLE & TIMESTAMPS ---
  const aiCmdKey = getTopic('aicommand');
  const aiCmdData = eventStates[aiCmdKey];
  let title = 'Idle';
  let isPlaying = false;
  let trackStartTs = 0;

  if (aiCmdData && aiCmdData.payload) {
    const parsed = safeParse(aiCmdData.payload);
    if (typeof parsed === 'object' && parsed.command) {
      if (parsed.command.includes('playsignature') || parsed.command.includes('playexplore')) {
        title = parsed.command;
        isPlaying = true;
      }
    } else if (typeof parsed === 'string' && parsed.includes('play')) {
      title = parsed;
      isPlaying = true;
    }
    trackStartTs = Math.max(trackStartTs, aiCmdData.timestamp || 0);
  }

  const sessionDataKey = getTopic('session-data');
  const sessionData = eventStates[sessionDataKey];
  if (sessionData && sessionData.payload) {
    const parsed = safeParse(sessionData.payload);
    if (parsed.session_id) {
      const match = soundScapeList.find(s => s.sound_scape === parsed.session_id);
      title = match ? (match.title || match.name || parsed.session_id) : parsed.session_id;
    }
    trackStartTs = Math.max(trackStartTs, sessionData.timestamp || 0);
  } else {
    const mqttPlay = getLatestMqtt('mod_audio/track/play_audio');
    if (mqttPlay && mqttPlay.payload) {
      title = mqttPlay.payload;
      const match = soundScapeList.find(s => s.sound_scape === title);
      if (match) title = match.title || match.name || title;
      trackStartTs = Math.max(trackStartTs, mqttPlay.timestamp || 0);
    }
  }

  // Determine isPlaying primarily from track/state
  const mqttState = getLatestMqtt('mod_audio/track/state');
  if (mqttState && mqttState.payload) {
    const parsed = safeParse(mqttState.payload);
    isPlaying = (parsed.state === "1" || parsed.state === 1) && !String(parsed.state).includes('0');

    // Fallback title to track/state only if still idle (so Voice Guide doesn't overwrite Session)
    if (title === 'Idle' && parsed.track && parsed.track !== 'undefined' && parsed.track !== 'null') {
      title = parsed.track;
    }
  }

  // --- SEEK STATE & DURATION ---
  const durationEventKey = getTopic('durationVideo');
  const durSocketEvent = eventStates[durationEventKey];
  let durationVideoPayload = safeParse(durSocketEvent?.payload || "{}");
  let posTimestamp = durSocketEvent?.timestamp || 0;

  const mqttSeek = getLatestMqtt('mod_audio/track/seek');
  let rawPosVal = Number(durationVideoPayload.position) || 0;
  let rawDurVal = Number(durationVideoPayload.duration) || 0;

  if (mqttSeek && mqttSeek.payload) {
    const parsedSeek = safeParse(mqttSeek.payload);

    // STALE SEEK PREVENTION: If the cached track/seek is OLDER than the track start command, ignore the stale position!
    const seekTs = mqttSeek.timestamp || 0;
    const isStale = seekTs < trackStartTs && trackStartTs > 0;

    if (rawPosVal === 0) {
      if (isStale) {
        rawPosVal = 0;
      } else {
        rawPosVal = parsedSeek.position !== undefined ? Number(parsedSeek.position) : Number(mqttSeek.payload || 0);
      }
    }
    if (rawDurVal === 0 && parsedSeek.duration !== undefined && !isStale) {
      rawDurVal = Number(parsedSeek.duration);
    }

    if (!posTimestamp) {
      // If stale, our 'packet' timestamp is effectively when the track started
      posTimestamp = isStale ? trackStartTs : seekTs;
    }
  }

  // Detect explicit STOP command
  const mqttCmd = getLatestMqtt('mod_audio/track/cmd');
  let isStopped = false;
  if (mqttState && mqttState.payload) {
     const parsed = safeParse(mqttState.payload);
     if (parsed.track === 'null' || parsed.track === 'undefined' || parsed.track === 'Idle' || parsed.track === '') {
        isStopped = true;
     }
  }
  if (!isPlaying && mqttCmd && mqttCmd.payload) {
    const cmdTs = mqttCmd.timestamp || 0;
    // Only accept STOP command if it was issued AFTER the track started
    if (cmdTs >= trackStartTs) {
      const cmdStr = String(mqttCmd.payload).toLowerCase();
      if (cmdStr.includes('stop') || cmdStr.includes('end')) {
        isStopped = true;
      }
    }
  }

  // If explicitly stopped, clear ghost metadata!
  if (isStopped) {
    title = 'Idle';
    rawDurVal = 0;
    rawPosVal = 0;
  }

  const lowerTitle = String(title).toLowerCase();
  const isInvalid = lowerTitle.includes('voice') || lowerTitle.includes('undefined');
  
  if (isInvalid || title === 'Idle') {
    title = 'Idle';
  }

  // Fallback to track/list for duration
  if (rawDurVal === 0 && title !== 'Idle') {
    const mqttTrackList = getLatestMqtt('mod_audio/track/list');
    if (mqttTrackList && mqttTrackList.payload) {
      const parsedList = safeParse(mqttTrackList.payload);
      if (Array.isArray(parsedList)) {
        const track = parsedList.find(t =>
          t.display === title ||
          String(t.id) === String(title) ||
          t.details?.title === title ||
          String(t.scent) === title
        );
        if (track && track.duration) {
          const tDur = Number(track.duration);
          rawDurVal = tDur > 20000 ? Math.floor(tDur / 1000) : tDur;
        }
      }
    }
  }

  // LAST RESORT: Check mediaInfo or sessionData for duration
  if (rawDurVal === 0) {
    if (mediaInfo?.duration) {
      const mDur = Number(mediaInfo.duration);
      if (!isNaN(mDur) && mDur > 0) rawDurVal = mDur > 20000 ? Math.floor(mDur / 1000) : mDur;
    } else if (mediaInfo?.length) {
      const mDur = Number(mediaInfo.length);
      if (!isNaN(mDur) && mDur > 0) rawDurVal = mDur > 20000 ? Math.floor(mDur / 1000) : mDur;
    } else if (sessionData && sessionData.payload) {
      try {
        const parsedSess = safeParse(sessionData.payload);
        if (parsedSess.duration) {
          const sDur = Number(parsedSess.duration);
          if (!isNaN(sDur) && sDur > 0) rawDurVal = sDur > 20000 ? Math.floor(sDur / 1000) : sDur;
        }
      } catch (_) {}
    }
  }

  // ULTRA LAST RESORT: Check LocalStorage for previously saved duration for this title
  if (rawDurVal === 0 && title !== 'Idle') {
    try {
      const cachedDur = localStorage.getItem(`pod_duration_${title}`);
      if (cachedDur) {
        const parsed = Number(cachedDur);
        // If parsed duration is ridiculously large (e.g. 5000000ms for a voice guide), ignore it (corrupted from old bug)
        if (!isNaN(parsed) && parsed > 0 && parsed < 100000) rawDurVal = parsed;
      }
    } catch (_) { }
  }

  const currentPos = rawPosVal;
  let currentDur = rawDurVal;

  const [localPos, setLocalPos] = useState(currentPos);

  // Save successful duration to LocalStorage to remember it across page reloads
  useEffect(() => {
    if (rawDurVal > 0 && title && title !== 'Idle') {
      try {
        localStorage.setItem(`pod_duration_${title}`, rawDurVal.toString());
      } catch (_) { }
    }
  }, [rawDurVal, title]);



  // Clean title display
  if (title === 'undefined' || title === 'null' || !title) {
    title = 'Idle';
  }

  // Effective duration
  const effectiveDur = currentDur > 0 ? currentDur : 0;

  const lastSyncTs = useRef(0);

  // Sync local pos ONLY if packet is new
  useEffect(() => {
    if (isStopped && !isPlaying) {
      setLocalPos(0);
      lastSyncTs.current = posTimestamp; // consume it so it stays 0
      return;
    }

    if (posTimestamp > lastSyncTs.current) {
      let compensatedPos = currentPos;
      if (isPlaying) {
        const elapsedSincePacket = Math.floor((Date.now() - posTimestamp) / 1000);
        // Only compensate if the packet is older than 2 seconds, to avoid slight clock skews
        const compensation = elapsedSincePacket > 2 ? elapsedSincePacket : 0;
        compensatedPos += compensation;
      }

      setLocalPos(effectiveDur > 0 ? Math.min(effectiveDur, compensatedPos) : compensatedPos);
      lastSyncTs.current = posTimestamp;
    }
  }, [currentPos, isPlaying, posTimestamp, effectiveDur]);

  // Real-time 1-second countdown ticker ONLY when playing
  useEffect(() => {
    if (!isPlaying) return;
    const interval = setInterval(() => {
      setLocalPos(prev => {
        if (effectiveDur > 0) {
          return prev < effectiveDur ? prev + 1 : prev;
        }
        // If we don't know duration, just keep counting up!
        return prev + 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [isPlaying, effectiveDur]);

  const remainingSec = isPlaying && effectiveDur > 0 ? Math.max(0, effectiveDur - localPos) : 0;
  const progressPercent = effectiveDur > 0 ? Math.min(100, (localPos / effectiveDur) * 100) : 0;

  if (title === 'Idle') {
    return (
      <div className="bg-slate-900/90 border border-slate-700/80 rounded-2xl p-5 flex flex-col items-center justify-center gap-2 shadow-xl ring-1 ring-slate-500/20 mb-6 min-h-[140px]">
        <Volume2 size={32} className="text-slate-600 opacity-50 mb-1" />
        <span className="text-sm font-semibold text-slate-500 italic">Menunggu sesi aktif...</span>
      </div>
    );
  }

  return (
    <div className="bg-slate-900/90 border border-slate-700/80 rounded-2xl p-5 flex flex-col gap-5 shadow-xl ring-1 ring-cyan-500/20 mb-6 relative overflow-hidden">

      {/* Background Decor */}
      <div className="absolute -top-24 -right-24 w-48 h-48 bg-cyan-500/10 blur-3xl rounded-full pointer-events-none"></div>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-5 relative z-10">

        {/* Left: Info */}
        <div className="flex items-center gap-4">
          <div className={`p-4 rounded-2xl border flex items-center justify-center shrink-0 transition-all duration-500 ${isPlaying ? 'bg-cyan-500/20 text-cyan-400 border-cyan-500/50 shadow-[0_0_15px_rgba(34,211,238,0.2)]' : 'bg-slate-800 text-slate-400 border-slate-700'}`}>
            <Volume2 size={28} className={isPlaying ? 'animate-pulse' : ''} />
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-widest">Active Track Stream</span>
            <h3 className="text-base sm:text-lg font-bold text-white leading-tight mt-1 truncate max-w-[200px] sm:max-w-[300px]">
              {title}
            </h3>
            <span className="text-[11px] text-cyan-400 font-medium mt-1 flex items-center gap-1.5">
              <span className={`w-1.5 h-1.5 rounded-full ${isPlaying ? 'bg-emerald-400 animate-pulse' : 'bg-rose-400'}`}></span>
              {isPlaying ? 'Active Stream' : 'Idle'}
            </span>
          </div>
        </div>

        {/* Right: Elapsed Timer Digital Badge */}
        <div className="flex items-center gap-3 bg-slate-950/90 px-4 py-2.5 rounded-2xl border border-cyan-500/30 ring-1 ring-cyan-500/20 shrink-0">
          <div className="flex flex-col items-end">
            <span className="text-[9px] uppercase font-bold text-slate-400 tracking-wider">Durasi Berjalan (Posisi)</span>
            <span className="font-mono text-xl sm:text-2xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-teal-300 to-emerald-400">
              {formatMinSec(localPos)}
            </span>
          </div>
          <div className="p-2 bg-cyan-500/20 text-cyan-400 rounded-xl border border-cyan-500/30">
            <Activity size={20} className={isPlaying ? 'animate-spin' : ''} />
          </div>
        </div>
      </div>

      {/* Passive Seek & Progress Bar */}
      {effectiveDur > 0 && (
        <div className="flex flex-col gap-1.5 mt-1 bg-slate-950/80 p-3 rounded-xl border border-slate-800">
          <div className="flex items-center justify-between text-xs font-mono text-slate-300">
            <span className="font-bold text-cyan-400">Posisi: {formatMinSec(localPos)}</span>
            <span className="text-slate-500">Total: {formatMinSec(effectiveDur)}</span>
          </div>
          <div className="relative w-full h-3 bg-slate-900 rounded-full overflow-hidden border border-slate-800">
            <div
              className={`absolute top-0 left-0 h-full transition-all duration-1000 ease-linear ${
                isPlaying ? 'bg-gradient-to-r from-cyan-500 to-teal-400' : 'bg-slate-600'
              }`}
              style={{ width: `${progressPercent}%` }}
            ></div>
          </div>
          <div className="flex items-center justify-between text-[9px] font-mono text-slate-600 mt-0.5">
            <span>Position: {localPos}s</span>
            <span>Total: {effectiveDur}s</span>
          </div>
        </div>
      )}

      {/* Level Gauges Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t border-slate-800/80 relative z-10">

        {/* Strobe Gauge */}
        <div className="flex flex-col gap-2 bg-slate-950/50 p-3 rounded-xl border border-slate-800/50">
          <div className="flex justify-between items-center text-xs font-semibold">
            <span className="text-slate-300 flex items-center gap-1.5"><Sun size={12} className="text-amber-400" /> Strobe</span>
            <span className="text-amber-400 font-mono">{currentStrobe}%</span>
          </div>
          <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
            <div className="h-full bg-amber-400 transition-all duration-300 rounded-full" style={{ width: `${Math.min(100, currentStrobe)}%` }} />
          </div>
        </div>

        {/* Volume Gauge */}
        <div className="flex flex-col gap-2 bg-slate-950/50 p-3 rounded-xl border border-slate-800/50">
          <div className="flex justify-between items-center text-xs font-semibold">
            <span className="text-slate-300 flex items-center gap-1.5"><Volume2 size={12} className="text-cyan-400" /> Volume</span>
            <span className="text-cyan-400 font-mono">{currentVolume}%</span>
          </div>
          <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
            <div className="h-full bg-cyan-400 transition-all duration-300 rounded-full" style={{ width: `${Math.min(100, currentVolume)}%` }} />
          </div>
        </div>

        {/* Vibration Gauge */}
        <div className="flex flex-col gap-2 bg-slate-950/50 p-3 rounded-xl border border-slate-800/50">
          <div className="flex justify-between items-center text-xs font-semibold">
            <span className="text-slate-300 flex items-center gap-1.5"><Activity size={12} className="text-purple-400" /> Vibration</span>
            <span className="text-purple-400 font-mono">{currentVibration}%</span>
          </div>
          <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
            <div className="h-full bg-purple-400 transition-all duration-300 rounded-full" style={{ width: `${Math.min(100, currentVibration)}%` }} />
          </div>
        </div>
      </div>

    </div>
  );
};

export default AudioSocketControlWidget;
