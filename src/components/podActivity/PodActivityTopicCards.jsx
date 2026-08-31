import React, { useState, useEffect, useMemo, useRef } from 'react';
import { X, Activity, Volume2, Sun, DoorOpen, Wind, Filter } from 'lucide-react';

const TOPIC_DEFINITIONS = [
  // AUDIO
  { key: 'mod_audio/strobo/set_level', module: 'Audio', label: 'Strobo Level', icon: Sun, defaultVal: 76 },
  { key: 'mod_audio/audio/set_level', module: 'Audio', label: 'Audio Level', icon: Volume2, defaultVal: 89 },
  { key: 'mod_audio/vibration/set_level', module: 'Audio', label: 'Vibration Level', icon: Activity, defaultVal: 45 },
  { key: 'mod_audio/track/state', module: 'Audio', label: 'Voice Guide', icon: Volume2 },
  { key: 'mod_audio/track/seek', module: 'Audio', label: 'Track Seek', icon: Volume2 },
  { key: 'mod_audio/track/list', module: 'Audio', label: 'Track List', icon: Volume2 },
  { key: 'mod_audio/track/cmd', module: 'Audio', label: 'Track Command', icon: Volume2 },
  { key: 'mod_audio/track/play_audio', module: 'Audio', label: 'Play Audio', icon: Volume2 },
  { key: 'mod_audio/bt/state', module: 'Audio', label: 'Bluetooth State', icon: Volume2 },
  { key: 'mod_audio/bt/cmd', module: 'Audio', label: 'Bluetooth Command', icon: Volume2 },
  { key: 'session-data', module: 'Audio', label: 'Session Data', icon: Volume2 },
  // OLFACTORY
  { key: 'mod_olfactory/cmd', module: 'Audio', label: 'Scent / Olfactory', icon: Wind },

  // AMBIENCE
  { key: 'mod_ambience/set_duration', module: 'Ambience', label: 'Duration', icon: Activity },
  { key: 'mod_ambience/set_brightness', module: 'Ambience', label: 'Brightness', icon: Activity },
  { key: 'mod_ambience/pod_state', module: 'Ambience', label: 'Pod State', icon: Activity },
  { key: 'mod_ambience/hex_color', module: 'Ambience', label: 'Hex Color', icon: Activity },

  // DOOR
  { key: 'mod_door/state', module: 'Door', label: 'State', icon: DoorOpen },
  { key: 'mod_door/door_proxy', module: 'Door', label: 'Proxy', icon: DoorOpen },
  { key: 'mod_door/command', module: 'Door', label: 'Command', icon: DoorOpen },

  // LIGHTING
  { key: 'mod_lighting/uvc/set_level', module: 'Lighting', label: 'UVC Level', icon: Sun },
  { key: 'mod_lighting/uvb/set_level', module: 'Lighting', label: 'UVB Level', icon: Sun },
  { key: 'mod_lighting/uva/set_level', module: 'Lighting', label: 'UVA Level', icon: Sun },
  { key: 'mod_lighting/strobo/set_mode', module: 'Lighting', label: 'Strobo Mode', icon: Sun },
  { key: 'mod_lighting/rgb/state', module: 'Lighting', label: 'RGB State', icon: Sun },
  { key: 'mod_lighting/rgb/set_level', module: 'Lighting', label: 'RGB Level', icon: Sun },
  { key: 'mod_lighting/rgb/set_hex', module: 'Lighting', label: 'RGB Hex', icon: Sun },
  { key: 'mod_lighting/rgb/animate', module: 'Lighting', label: 'RGB Animate', icon: Sun },
  { key: 'mod_lighting/nir/set_level', module: 'Lighting', label: 'NIR Level', icon: Sun },
  { key: 'mod_lighting/nir/set_frequency', module: 'Lighting', label: 'NIR Frequency', icon: Sun },
  { key: 'mod_lighting/lamp/set_level', module: 'Lighting', label: 'Lamp Level', icon: Sun },
];

const CIRCULAR_TOPICS = [
  'mod_audio/audio/set_level',
  'mod_audio/vibration/set_level',
  'mod_audio/strobo/set_level'
];

const INTEGRATED_TOPICS = [
  'mod_audio/track/state',
  'mod_audio/track/seek',
  'mod_audio/track/list',
  'mod_audio/track/cmd',
  'mod_audio/track/play_audio',
  'session-data'
];

const CircularLevelControl = ({ topic, data, label, Icon, textColor, bgColor, borderColor, defaultVal = 0 }) => {
  const [localVal, setLocalVal] = useState(data ? data.payload : defaultVal);

  useEffect(() => {
    if (data) setLocalVal(data.payload);
  }, [data]);

  const percentage = Math.max(0, Math.min(100, Number(localVal) || 0));
  const radius = 30;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  return (
    <div className={`flex flex-col p-3 rounded-xl border transition-all duration-300 ${bgColor} ${borderColor} h-full relative`}>
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-1.5 opacity-70">
          <Icon size={12} className={textColor} />
          <span className="text-[9px] font-bold uppercase tracking-wider text-slate-500">Audio</span>
        </div>
      </div>

      <h4 className={`text-xs font-semibold mb-3 text-center ${textColor}`}>
        {label}
      </h4>

      <div className="relative flex flex-col items-center justify-center flex-1 pb-4">
        <div className="relative flex items-center justify-center mb-2">
          <svg width="80" height="80" viewBox="0 0 80 80" className="transform -rotate-90">
            <circle cx="40" cy="40" r="30" stroke="#1e293b" strokeWidth="6" fill="none" />
            <circle
              cx="40"
              cy="40"
              r="30"
              stroke="currentColor"
              strokeWidth="6"
              fill="none"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              className={`transition-all duration-300 ${textColor}`}
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center flex-col pointer-events-none">
            <span className="text-lg font-bold text-white">{percentage}</span>
            <span className="text-[8px] text-slate-400">%</span>
          </div>
        </div>

        <span className="text-[9px] text-slate-500 absolute bottom-0">
          {data ? new Date(data.timestamp).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : 'Menunggu...'}
        </span>
      </div>
    </div>
  );
};

const OlfactoryCardRenderer = ({ data, def, Icon, textColor, bgColor, borderColor }) => {
  const [remaining, setRemaining] = useState(0);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (!data?.payload || !data?.timestamp) return;
    try {
      const parsed = JSON.parse(data.payload);
      const widthMs = Number(parsed.width || 0);
      if (widthMs > 0) {
        const interval = setInterval(() => {
          const elapsed = Date.now() - data.timestamp;
          const left = Math.max(0, widthMs - elapsed);
          setRemaining(left);
          setProgress(Math.max(0, Math.min(100, (left / widthMs) * 100)));
          if (left === 0) clearInterval(interval);
        }, 100);
        return () => clearInterval(interval);
      } else {
        setRemaining(0);
        setProgress(0);
      }
    } catch (_) { }
  }, [data]);

  let scentLabel = 'Unknown';
  let widthLabel = '0ms';
  try {
    if (data?.payload && typeof data.payload === 'string') {
      const p = JSON.parse(data.payload);
      scentLabel = p.scent !== undefined ? String(p.scent) : 'Unknown';
      widthLabel = p.width !== undefined ? `${p.width}ms` : '0ms';
    }
  } catch (_) { }

  return (
    <div className={`flex flex-col p-3 rounded-xl border transition-all duration-300 ${bgColor} ${borderColor} h-full relative overflow-hidden`}>
      <div className="flex items-center justify-between mb-2 relative z-10">
        <div className="flex items-center gap-1.5 opacity-70">
          <Icon size={12} className={textColor} />
          <span className="text-[9px] font-bold uppercase tracking-wider text-slate-500">{def.module}</span>
        </div>
      </div>
      <h4 className={`text-xs font-semibold mb-2 truncate ${textColor} relative z-10`} title={def.key}>
        {def.label}
      </h4>
      <div className="flex flex-col gap-1 relative z-10">
        <span className="font-mono text-xs font-bold text-white">
          Scent ID: <span className="text-cyan-300">{scentLabel}</span>
        </span>
        <span className="text-[10px] text-slate-400">Durasi: {widthLabel}</span>
      </div>

      {remaining > 0 && (
        <div className="mt-auto pt-3 relative z-10">
          <div className="flex justify-between items-center text-[9px] font-mono mb-1.5">
            <span className="text-emerald-400 font-bold animate-pulse">Menyemprot...</span>
            <span className="text-amber-400 font-bold">{(remaining / 1000).toFixed(1)}s</span>
          </div>
          <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden shadow-inner">
            <div
              className="h-full bg-gradient-to-r from-emerald-500 via-teal-400 to-cyan-400 transition-all duration-100 ease-linear shadow-[0_0_8px_rgba(52,211,153,0.5)]"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {remaining === 0 && data?.payload && (
        <div className="mt-auto pt-3 text-[9px] text-slate-500 italic relative z-10">
          Selesai / Standby
        </div>
      )}

      {!data?.payload && (
        <div className="mt-auto pt-3 text-[10px] text-slate-600 italic">
          Menunggu data...
        </div>
      )}
    </div>
  );
};


const AudioPlayerControlWidget = ({ seekData, playAudioData, stateData, trackListData, ambienceDurData, trackCmdData, mediaInfo, sessionData }) => {
  let durVal = 0;
  let posVal = 0;

  const seekDataState = seekData;
  let posTimestamp = seekDataState?.timestamp || 0;
  if (seekDataState?.payload) {
    try {
      const trackStartTs = playAudioData?.timestamp || 0;
      const seekTs = seekDataState?.timestamp || 0;

      // Stale seek prevention: if seek is older than track start, ignore its position
      const isStale = seekTs < trackStartTs && trackStartTs > 0;

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
  if (!isPlaying && trackCmdData?.payload) {
    const cmdTs = trackCmdData.timestamp || 0;
    const trackTs = playAudioData?.timestamp || 0;
    // Only accept STOP command if it was issued AFTER the track started
    if (cmdTs >= trackTs) {
      const cmdStr = String(trackCmdData.payload).toLowerCase();
      if (cmdStr.includes('stop') || cmdStr.includes('end')) {
        isStopped = true;
        stateText = 'Stopped';
      }
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
      } catch (_) {}
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

export default function PodActivityTopicCards({ show, onClose, feed = [], pods = [], onPublish }) {
  // We keep a state map of { topicKey: { payload, timestamp, isFlashing } }
  const [topicStates, setTopicStates] = useState({});
  const [selectedServerId, setSelectedServerId] = useState('ALL');
  const [multimediaMap, setMultimediaMap] = useState({});

  const fetchMultimediaInfo = async (payloadVal) => {
    const soundScapeId = String(payloadVal).trim();
    if (!soundScapeId || multimediaMap[soundScapeId] !== undefined) return;

    try {
      const token = localStorage.getItem('vps_monitoring_token');
      const res = await fetch(`/api/vps/content/multimedia/${encodeURIComponent(soundScapeId)}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const json = await res.json();
      if (json.success && json.data) {
        setMultimediaMap((prev) => ({ ...prev, [soundScapeId]: json.data }));
      } else {
        setMultimediaMap((prev) => ({ ...prev, [soundScapeId]: null }));
      }
    } catch (_) {
      setMultimediaMap((prev) => ({ ...prev, [soundScapeId]: null }));
    }
  };

  // Listen to feed changes
  useEffect(() => {
    if (feed.length === 0) return;

    const updatedStates = {};
    // Process from oldest to newest so newer logs overwrite older ones
    for (let i = feed.length - 1; i >= 0; i--) {
      const logItem = feed[i];
      if (selectedServerId !== 'ALL' && logItem.serverId !== selectedServerId) {
        continue;
      }

      // Extract the topic key (strip out pod/MAC/2.0/ if present)
      let topicKey = logItem.topic;
      const match = logItem.topic.match(/pod\/[^/]+\/2\.0\/(.*)/);
      if (match && match[1]) {
        topicKey = match[1];
      }

      if (topicKey.includes('track') || topicKey.includes('audio') || topicKey.includes('play')) {
        fetchMultimediaInfo(logItem.payload);
      }

      updatedStates[topicKey] = {
        payload: logItem.payload,
        timestamp: logItem.timestamp,
        serverName: logItem.serverName,
        isFlashing: i === 0 // trigger animation only for newest packet
      };
    }

    setTopicStates(prev => ({
      ...prev,
      ...updatedStates
    }));

    // Turn off flashing after 800ms for newest packet
    const latestTopic = feed[0]?.topic;
    if (latestTopic) {
      let key = latestTopic;
      const m = latestTopic.match(/pod\/[^/]+\/2\.0\/(.*)/);
      if (m && m[1]) key = m[1];

      setTimeout(() => {
        setTopicStates(prev => {
          if (!prev[key]) return prev;
          return {
            ...prev,
            [key]: {
              ...prev[key],
              isFlashing: false
            }
          };
        });
      }, 800);
    }
  }, [feed, selectedServerId]); // Only depend on feed array reference change, which happens on every new log

  if (!show) return null;

  return (
    <div className="flex flex-col w-full gap-6 animate-in fade-in duration-200">
      {/* Grid of Cards Grouped By Module */}
      <div className="flex flex-col gap-6">
        {Object.entries(TOPIC_DEFINITIONS.reduce((acc, def) => {
          if (!acc[def.module]) acc[def.module] = [];
          acc[def.module].push(def);
          return acc;
        }, {})).map(([moduleName, moduleDefs]) => (
          <div key={moduleName} className="flex flex-col gap-3">
            <div className="flex items-center gap-2 mb-1">
              <div className="h-4 w-1 bg-cyan-500 rounded-full"></div>
              <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider">{moduleName}</h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
              {moduleName === 'Audio' && (
                <AudioPlayerControlWidget
                  seekData={topicStates['mod_audio/track/seek']}
                  playAudioData={topicStates['mod_audio/track/play_audio']}
                  stateData={topicStates['mod_audio/track/state']}
                  trackListData={topicStates['mod_audio/track/list']}
                  ambienceDurData={topicStates['mod_ambience/set_duration']}
                  trackCmdData={topicStates['mod_audio/track/cmd']}
                  sessionData={topicStates['session-data']}
                  mediaInfo={topicStates['mod_audio/track/play_audio'] ? multimediaMap[topicStates['mod_audio/track/play_audio'].payload] : null}
                  onPublish={onPublish}
                />
              )}
              {moduleDefs.map(def => {
                if (INTEGRATED_TOPICS.includes(def.key)) {
                  return null;
                }

                const data = topicStates[def.key];
                const Icon = def.icon;
                const isFlashing = data?.isFlashing;

                let bgColor = "bg-slate-900/50";
                let borderColor = "border-slate-800";
                let textColor = "text-slate-400";

                if (isFlashing) {
                  bgColor = "bg-cyan-500/20";
                  borderColor = "border-cyan-400";
                  textColor = "text-cyan-300";
                } else if (data) {
                  borderColor = "border-slate-600";
                  textColor = "text-slate-200";
                }

                if (CIRCULAR_TOPICS.includes(def.key)) {
                  return (
                    <CircularLevelControl
                      key={def.key}
                      topic={def.key}
                      data={data}
                      label={def.label}
                      Icon={Icon}
                      textColor={textColor}
                      bgColor={bgColor}
                      borderColor={borderColor}
                      onPublish={onPublish}
                      defaultVal={def.defaultVal}
                    />
                  );
                }

                if (def.key === 'mod_olfactory/cmd') {
                  return (
                    <OlfactoryCardRenderer
                      key={def.key}
                      data={data}
                      def={def}
                      Icon={Icon}
                      textColor={textColor}
                      bgColor={bgColor}
                      borderColor={borderColor}
                    />
                  );
                }

                const mediaInfo = data ? multimediaMap[data.payload] : null;

                return (
                  <div
                    key={def.key}
                    className={`flex flex-col p-3 rounded-xl border transition-all duration-300 ${bgColor} ${borderColor}`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-1.5 opacity-70">
                        <Icon size={12} className={textColor} />
                        <span className="text-[9px] font-bold uppercase tracking-wider text-slate-500">{def.module}</span>
                      </div>
                      {(data?.serverName || pods[0]?.name) && (
                        <span className="text-[8px] font-bold bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded">
                          {data?.serverName || pods[0]?.name}
                        </span>
                      )}
                    </div>

                    <h4 className={`text-xs font-semibold mb-1 truncate ${textColor}`} title={def.key}>
                      {def.label}
                    </h4>

                    <div className="mt-auto pt-2">
                      {(() => {
                        if (!data) return <span className="text-[10px] text-slate-600 italic">Menunggu data...</span>;

                        let displayValue = data.payload;
                        let subtitle = null;

                        if (def.key === 'mod_audio/track/seek') {
                          let parsedJson = null;
                          try {
                            if (typeof data.payload === 'string' && data.payload.trim().startsWith('{')) {
                              parsedJson = JSON.parse(data.payload);
                            }
                          } catch (_) { }

                          if (parsedJson && (parsedJson.position !== undefined || parsedJson.duration !== undefined)) {
                            const posSec = Number(parsedJson.position || 0);
                            const durSec = Number(parsedJson.duration || 0);

                            const formatMinSec = (sec) => {
                              const total = sec > 10000 ? Math.floor(sec / 1000) : sec;
                              const m = Math.floor(total / 60);
                              const s = Math.floor(total % 60);
                              return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
                            };

                            const posStr = formatMinSec(posSec);
                            const durStr = formatMinSec(durSec);

                            displayValue = `${posStr} / ${durStr}`;
                            subtitle = `Posisi: ${posSec}s • Total: ${durSec}s`;
                          } else {
                            const num = Number(data.payload);
                            if (!isNaN(num) && data.payload.trim() !== '') {
                              const totalSeconds = num > 10000 ? Math.floor(num / 1000) : num;
                              const mins = Math.floor(totalSeconds / 60);
                              const secs = totalSeconds % 60;
                              const timeStr = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
                              displayValue = timeStr;
                              subtitle = `Durasi/Posisi: ${num} dtk`;
                            }
                          }
                        } else if (def.key === 'mod_audio/track/state') {
                          let parsedState = null;
                          try {
                            if (typeof data.payload === 'string' && data.payload.trim().startsWith('{')) {
                              parsedState = JSON.parse(data.payload);
                            }
                          } catch (_) { }

                          if (parsedState && parsedState.track) {
                            displayValue = parsedState.track;
                            const isActive = String(parsedState.state) === '1' || String(parsedState.state).toLowerCase() === 'active';
                            subtitle = `Status: ${isActive ? 'Aktif (State 1)' : `Non-aktif (${parsedState.state})`}`;
                          }
                        } else if (def.key === 'mod_audio/track/cmd') {
                          let cmdVal = data.payload ? String(data.payload).trim() : '';
                          try {
                            if (cmdVal.startsWith('{')) {
                              const parsed = JSON.parse(cmdVal);
                              if (parsed.cmd !== undefined) cmdVal = String(parsed.cmd).trim();
                            }
                          } catch (_) { }

                          const cmdMap = {
                            '1': 'PLAY',
                            '0': 'STOP',
                            '2': 'PAUSE'
                          };

                          const actionLabel = cmdMap[cmdVal] || (cmdVal ? cmdVal.toUpperCase() : 'UNKNOWN');
                          displayValue = actionLabel;
                          subtitle = `Kode: ${cmdVal} (${actionLabel})`;
                        } else if (mediaInfo) {
                          displayValue = mediaInfo.title || mediaInfo.name || mediaInfo.sound_scape || data.payload;
                          subtitle = `ID: ${data.payload}${mediaInfo.lamp ? ` • Lamp: ${mediaInfo.lamp}` : ''}`;
                        }

                        let isJsonArray = false;
                        let parsedArray = [];
                        try {
                          if (typeof displayValue === 'string' && displayValue.trim().startsWith('[') && displayValue.trim().endsWith(']')) {
                            parsedArray = JSON.parse(displayValue);
                            if (Array.isArray(parsedArray)) {
                              isJsonArray = true;
                            }
                          }
                        } catch (_) { }

                        return (
                          <div className="flex flex-col h-full">
                            {isJsonArray ? (
                              <div className="flex flex-col gap-1 max-h-[140px] overflow-y-auto custom-scrollbar pr-1 mb-1">
                                {parsedArray.slice(0, 5).map((item, idx) => (
                                  <div key={idx} className="bg-slate-950/60 p-1.5 rounded-lg border border-slate-800/80 flex flex-col">
                                    <span className="text-[10px] font-bold text-cyan-300 truncate">
                                      {idx + 1}. {item.display || item.title || item.id || `Item ${idx + 1}`}
                                    </span>
                                    {item.duration && (
                                      <span className="text-[9px] text-slate-400">
                                        Durasi: {Math.floor(item.duration > 10000 ? item.duration / 1000 : item.duration)}s
                                      </span>
                                    )}
                                  </div>
                                ))}
                                {parsedArray.length > 5 && (
                                  <span className="text-[9px] text-slate-500 italic text-center py-1 bg-slate-950/30 rounded-lg">
                                    + {parsedArray.length - 5} item lainnya...
                                  </span>
                                )}
                              </div>
                            ) : (
                              <span className="font-mono text-xs font-bold text-white break-words line-clamp-4" title={data.payload}>
                                {displayValue}
                              </span>
                            )}
                            {subtitle && (
                              <span className="text-[9px] text-cyan-400 font-semibold mt-0.5 break-all">
                                {subtitle}
                              </span>
                            )}
                            <span className="text-[9px] text-slate-500 mt-1">
                              {new Date(data.timestamp).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                            </span>

                            {def.key === 'mod_audio/track/cmd' && onPublish && (
                              <div className="flex items-center gap-1 mt-2 pt-1 border-t border-slate-800">
                                <button
                                  onClick={() => onPublish('mod_audio/track/cmd', '1')}
                                  className="px-1.5 py-0.5 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded text-[9px] font-bold hover:bg-emerald-500/40 transition-colors"
                                  title="Publish Cmd 1 (Play)"
                                >
                                  ▶ Play (1)
                                </button>
                                <button
                                  onClick={() => onPublish('mod_audio/track/cmd', '2')}
                                  className="px-1.5 py-0.5 bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded text-[9px] font-bold hover:bg-amber-500/40 transition-colors"
                                  title="Publish Cmd 2 (Pause)"
                                >
                                  ⏸ Pause (2)
                                </button>
                                <button
                                  onClick={() => onPublish('mod_audio/track/cmd', '0')}
                                  className="px-1.5 py-0.5 bg-rose-500/20 text-rose-400 border border-rose-500/30 rounded text-[9px] font-bold hover:bg-rose-500/40 transition-colors"
                                  title="Publish Cmd 0 (Stop)"
                                >
                                  ⏹ Stop (0)
                                </button>
                              </div>
                            )}
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
