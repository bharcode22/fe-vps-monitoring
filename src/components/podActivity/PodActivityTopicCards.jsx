import React, { useState, useEffect, useMemo } from 'react';
import {
  X, Activity, Volume2, Sun, DoorOpen, Wind, Filter,
  Palette, Lightbulb, Sparkles, Clock, Sliders, Zap,
  Flame, Radio, Power, Play, Pause, Layers, CheckCircle2,
  Thermometer, Droplets, UserCheck
} from 'lucide-react';
import AudioPlayerControlWidget from './AudioPlayerControlWidget';

const TOPIC_DEFINITIONS = [
  // CHAIR
  { key: 'mod_chair/pob_state', module: 'Chair', label: 'POB State', icon: UserCheck },
  { key: 'mod_chair/set_pemf', module: 'Chair', label: 'PEMF Setting', icon: Zap },
  { key: 'mod_chair/set_schumann', module: 'Chair', label: 'Schumann Resonance', icon: Radio },
  { key: 'mod_chair/set_pob_threshold', module: 'Chair', label: 'POB Threshold', icon: Sliders },
  { key: 'mod_chair/temperature', module: 'Chair', label: 'Temperature', icon: Thermometer },
  { key: 'mod_chair/humidity', module: 'Chair', label: 'Humidity', icon: Droplets },

  // AUDIO
  { key: 'mod_audio/strobo/set_level', module: 'Audio', label: 'Strobo Level', icon: Sun, defaultVal: 76 },
  { key: 'mod_audio/audio/set_level', module: 'Audio', label: 'Audio Level', icon: Volume2, defaultVal: 89 },
  { key: 'mod_audio/vibration/set_level', module: 'Audio', label: 'Vibration Level', icon: Activity, defaultVal: 45 },
  { key: 'mod_audio/track/state', module: 'Audio', label: 'Voice Guide', icon: Volume2 },
  { key: 'mod_audio/track/seek', module: 'Audio', label: 'Track Seek', icon: Volume2 },
  { key: 'mod_audio/track/list', module: 'Audio', label: 'Track List', icon: Volume2 },
  { key: 'mod_audio/track/cmd', module: 'Audio', label: 'Track Command', icon: Volume2 },
  { key: 'mod_audio/track/play_audio', module: 'Audio', label: 'Play Audio', icon: Volume2 },
  { key: 'session-data', module: 'Audio', label: 'Session Data', icon: Volume2 },
  { key: 'mod_olfactory/cmd', module: 'Audio', label: 'Scent / Olfactory', icon: Wind },

  // AMBIENCE
  { key: 'mod_ambience/set_duration', module: 'Ambience', label: 'Duration', icon: Clock },
  { key: 'mod_ambience/set_brightness', module: 'Ambience', label: 'Brightness', icon: Sun },
  { key: 'mod_ambience/pod_state', module: 'Ambience', label: 'Pod State', icon: Activity },
  { key: 'mod_ambience/hex_color', module: 'Ambience', label: 'Hex Color', icon: Palette },

  // LIGHTING
  { key: 'mod_lighting/uvc/set_level', module: 'Lighting', label: 'UVC Level', icon: Zap },
  { key: 'mod_lighting/uvb/set_level', module: 'Lighting', label: 'UVB Level', icon: Zap },
  { key: 'mod_lighting/uva/set_level', module: 'Lighting', label: 'UVA Level', icon: Sun },
  { key: 'mod_lighting/strobo/set_mode', module: 'Lighting', label: 'Strobo Mode', icon: Radio },
  { key: 'mod_lighting/rgb/state', module: 'Lighting', label: 'RGB State', icon: Power },
  { key: 'mod_lighting/rgb/set_level', module: 'Lighting', label: 'RGB Level', icon: Sliders },
  { key: 'mod_lighting/rgb/set_hex', module: 'Lighting', label: 'RGB Hex', icon: Palette },
  { key: 'mod_lighting/rgb/animate', module: 'Lighting', label: 'RGB Animate', icon: Sparkles },
  { key: 'mod_lighting/nir/set_level', module: 'Lighting', label: 'NIR Level', icon: Flame },
  { key: 'mod_lighting/nir/set_frequency', module: 'Lighting', label: 'NIR Frequency', icon: Radio },
  { key: 'mod_lighting/lamp/set_level', module: 'Lighting', label: 'Lamp Level', icon: Lightbulb },
];

const INTEGRATED_TOPICS = [
  'mod_audio/track/state',
  'mod_audio/track/seek',
  'mod_audio/track/list',
  'mod_audio/track/play_audio',
  'session-data',
  'mod_audio/strobo/set_level',
  'mod_audio/audio/set_level',
  'mod_audio/vibration/set_level',
  'mod_audio/track/cmd',
  'mod_olfactory/cmd'
];

const MODULE_THEMES = {
  Chair: {
    accentColor: 'text-indigo-400',
    bgColor: 'bg-indigo-500/10',
    borderColor: 'border-indigo-500/30',
    gradient: 'from-indigo-500 to-purple-500',
    badge: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30'
  },
  Audio: {
    accentColor: 'text-cyan-400',
    bgColor: 'bg-cyan-500/10',
    borderColor: 'border-cyan-500/30',
    gradient: 'from-cyan-500 to-blue-500',
    badge: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30'
  },
  Ambience: {
    accentColor: 'text-emerald-400',
    bgColor: 'bg-emerald-500/10',
    borderColor: 'border-emerald-500/30',
    gradient: 'from-emerald-500 to-teal-500',
    badge: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
  },
  Lighting: {
    accentColor: 'text-amber-400',
    bgColor: 'bg-amber-500/10',
    borderColor: 'border-amber-500/30',
    gradient: 'from-amber-500 to-orange-500',
    badge: 'bg-amber-500/20 text-amber-300 border-amber-500/30'
  }
};

function parseOccupancy(payload) {
  if (payload === null || payload === undefined) return null;
  const str = String(payload).trim();
  if (str === '1' || str.toLowerCase() === 'true' || str.toLowerCase() === 'occupied' || str.toLowerCase() === 'active' || str.toLowerCase() === 'on' || str.toLowerCase() === 'pob') return 1;
  if (str === '0' || str.toLowerCase() === 'false' || str.toLowerCase() === 'vacant' || str.toLowerCase() === 'empty' || str.toLowerCase() === 'off') return 0;
  try {
    const json = typeof payload === 'object' ? payload : JSON.parse(str);
    if (json.pob_state !== undefined) return parseOccupancy(json.pob_state);
    if (json.pod_state !== undefined) return parseOccupancy(json.pod_state);
    if (json.pob !== undefined) return parseOccupancy(json.pob);
    if (json.state !== undefined) return parseOccupancy(json.state);
    if (json.value !== undefined) return parseOccupancy(json.value);
    if (json.status !== undefined) return parseOccupancy(json.status);
    if (json.occupied !== undefined) return parseOccupancy(json.occupied);
  } catch (_) { }
  const num = Number(str);
  if (!isNaN(num)) return num >= 1 ? 1 : 0;
  return null;
}

export default function PodActivityTopicCards({ show, onClose, feed = [], pods = [], onPublish }) {
  const [topicStates, setTopicStates] = useState(() => {
    const init = {};
    if (pods && pods[0]) {
      const p = pods[0];
      if (p.stateValue !== null && p.stateValue !== undefined) {
        const valStr = String(p.stateValue);
        const entry = {
          payload: p.lastPayload !== undefined && p.lastPayload !== null ? String(p.lastPayload) : valStr,
          timestamp: p.lastSeenAt ? new Date(p.lastSeenAt).getTime() : Date.now(),
          serverName: p.name,
          isFlashing: false
        };
        init['mod_chair/pob_state'] = entry;
      }
    }
    return init;
  });
  const [selectedServerId, setSelectedServerId] = useState('ALL');
  const [multimediaMap, setMultimediaMap] = useState({});

  const fetchMultimediaInfo = async (payloadVal) => {
    if (!payloadVal) return;
    const soundScapeId = String(payloadVal).trim();
    if (!soundScapeId || soundScapeId === '0' || soundScapeId === '1' || soundScapeId === '2' || soundScapeId === '3' || soundScapeId === 'Idle' || soundScapeId === 'null' || soundScapeId === 'undefined' || soundScapeId === 'stop' || soundScapeId.length < 2) return;
    if (multimediaMap[soundScapeId] !== undefined) return;

    try {
      const token = localStorage.getItem('vps_monitoring_token');
      const res = await fetch(`/api/vps/content/multimedia/${encodeURIComponent(soundScapeId)}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) {
        setMultimediaMap((prev) => ({ ...prev, [soundScapeId]: null }));
        return;
      }
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

  useEffect(() => {
    if (feed.length === 0) return;

    const updatedStates = {};
    for (let i = feed.length - 1; i >= 0; i--) {
      const logItem = feed[i];
      if (selectedServerId !== 'ALL' && logItem.serverId !== selectedServerId) continue;

      let topicKey = logItem.topic;
      const cleanKey = topicKey.replace(/^pod\/[^/]+\/(?:2\.0\/)?/, '').replace(/^\//, '');
      if (cleanKey) topicKey = cleanKey;

      if (topicKey === 'mod_audio/track/play_audio') {
        fetchMultimediaInfo(logItem.payload);
      }

      const stateEntry = {
        payload: logItem.payload,
        timestamp: logItem.timestamp,
        serverName: logItem.serverName,
        isFlashing: i === 0
      };

      updatedStates[topicKey] = stateEntry;
    }

    setTopicStates(prev => ({ ...prev, ...updatedStates }));

    const latestTopic = feed[0]?.topic;
    if (latestTopic) {
      let key = latestTopic.replace(/^pod\/[^/]+\/(?:2\.0\/)?/, '').replace(/^\//, '');
      setTimeout(() => {
        setTopicStates(prev => ({ ...prev, [key]: { ...prev[key], isFlashing: false } }));
      }, 800);
    }
  }, [feed, selectedServerId]);

  if (!show) return null;

  const groupedModules = TOPIC_DEFINITIONS.reduce((acc, def) => {
    if (!acc[def.module]) acc[def.module] = [];
    acc[def.module].push(def);
    return acc;
  }, {});

  return (
    <div className="flex flex-col w-full gap-8 animate-in fade-in duration-200">
      {Object.entries(groupedModules).map(([moduleName, moduleDefs]) => {
        const theme = MODULE_THEMES[moduleName] || MODULE_THEMES.Audio;
        const isAudio = moduleName === 'Audio';
        const isAmbience = moduleName === 'Ambience';
        const visibleCount = isAudio ? 1 : moduleDefs.filter(d => !INTEGRATED_TOPICS.includes(d.key)).length;

        return (
          <div key={moduleName} className="flex flex-col gap-4 w-full">
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-2.5">
                <div className={`h-4 w-1.5 rounded-full bg-gradient-to-b ${theme.gradient}`}></div>
                <h3 className="text-sm font-extrabold text-slate-100 uppercase tracking-wider">{moduleName}</h3>
              </div>
              <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${theme.badge}`}>
                {visibleCount} Topik
              </span>
            </div>
            {isAudio ? (
              <AudioPlayerControlWidget
                seekData={topicStates['mod_audio/track/seek']}
                playAudioData={topicStates['mod_audio/track/play_audio']}
                stateData={topicStates['mod_audio/track/state']}
                trackListData={topicStates['mod_audio/track/list']}
                ambienceDurData={topicStates['mod_ambience/set_duration']}
                trackCmdData={topicStates['mod_audio/track/cmd']}
                sessionData={topicStates['session-data']}
                mediaInfo={topicStates['mod_audio/track/play_audio'] ? multimediaMap[topicStates['mod_audio/track/play_audio'].payload] : null}
                stroboData={topicStates['mod_audio/strobo/set_level']}
                audioLevelData={topicStates['mod_audio/audio/set_level']}
                vibrationData={topicStates['mod_audio/vibration/set_level']}
                olfactoryData={topicStates['mod_olfactory/cmd']}
                serverId={pods[0]?.id || selectedServerId}
                serverName={pods[0]?.name}
                onPublish={onPublish}
              />
            ) : (
              <div className={`grid gap-3.5 ${isAmbience
                ? 'grid-cols-2 sm:grid-cols-2 md:grid-cols-4'
                : moduleName === 'Chair'
                  ? 'grid-cols-2 sm:grid-cols-3 md:grid-cols-6'
                  : 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6'
                }`}>
                {moduleDefs.map(def => {
                  if (INTEGRATED_TOPICS.includes(def.key)) return null;

                  const isPobChair = def.key === 'mod_chair/pob_state';
                  const data = topicStates[def.key] || (isPobChair ? (topicStates['mod_chair/pob_state'] || topicStates[`pod/${pods[0]?.mac || pods[0]?.id}/2.0/mod_chair/pob_state`]) : null);

                  // Always show known pod occupancy state as baseline for mod_chair/pob_state
                  const fallbackData = (!data && isPobChair && pods[0] && pods[0].stateValue !== null && pods[0].stateValue !== undefined)
                    ? {
                      payload: pods[0].lastPayload !== undefined && pods[0].lastPayload !== null ? String(pods[0].lastPayload) : String(pods[0].stateValue),
                      timestamp: pods[0].lastSeenAt ? new Date(pods[0].lastSeenAt).getTime() : Date.now(),
                      serverName: pods[0].name,
                      isFlashing: false
                    }
                    : null;

                  const cardData = data || fallbackData;

                  return (
                    <GenericTopicCard
                      key={def.key}
                      def={def}
                      data={cardData}
                      Icon={def.icon}
                      theme={theme}
                      isFlashing={cardData?.isFlashing}
                      serverName={cardData?.serverName || pods[0]?.name}
                      mediaInfo={cardData ? multimediaMap[cardData.payload] : null}
                      onPublish={onPublish}
                    />
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function GenericTopicCard({ def, data, Icon, theme, isFlashing, serverName, mediaInfo, onPublish }) {
  const isOccupancyState = def.key.includes('pob_state') || def.key.includes('pod_state') || def.key === 'mod_chair/pob_state';
  const isLevel = def.key.includes('level') || def.key.includes('brightness');
  const isThreshold = def.key.includes('threshold');
  const isHex = def.key.includes('hex');
  const isDuration = def.key.includes('duration');
  const isState = def.key.includes('state') && !isOccupancyState;
  const isFrequency = def.key.includes('frequency') || def.key.includes('schumann');
  const isTemp = def.key.includes('temperature') || def.key.includes('temp');
  const isHumidity = def.key.includes('humidity');
  const rawPayload = data ? String(data.payload).trim() : null;
  const numVal = rawPayload !== null && !isNaN(Number(rawPayload)) && rawPayload !== '' ? Number(rawPayload) : null;
  const occVal = isOccupancyState && rawPayload !== null ? parseOccupancy(rawPayload) : null;

  let jsonObj = null;
  if (rawPayload && (rawPayload.startsWith('{') || rawPayload.startsWith('['))) {
    try {
      jsonObj = JSON.parse(rawPayload);
    } catch (_) { }
  }

  let tempVal = isTemp && numVal !== null ? numVal : null;
  if (isTemp && tempVal === null && jsonObj && typeof jsonObj === 'object') {
    if (jsonObj.temperature !== undefined && !isNaN(Number(jsonObj.temperature))) tempVal = Number(jsonObj.temperature);
    else if (jsonObj.temp !== undefined && !isNaN(Number(jsonObj.temp))) tempVal = Number(jsonObj.temp);
    else if (jsonObj.value !== undefined && !isNaN(Number(jsonObj.value))) tempVal = Number(jsonObj.value);
  }

  let humVal = isHumidity && numVal !== null ? numVal : null;
  if (isHumidity && humVal === null && jsonObj && typeof jsonObj === 'object') {
    if (jsonObj.humidity !== undefined && !isNaN(Number(jsonObj.humidity))) humVal = Number(jsonObj.humidity);
    else if (jsonObj.value !== undefined && !isNaN(Number(jsonObj.value))) humVal = Number(jsonObj.value);
  }

  return (
    <div className={`flex flex-col justify-between p-3.5 rounded-2xl border transition-all duration-300 min-h-[145px] relative overflow-hidden group ${isFlashing ? 'bg-cyan-500/15 border-cyan-400 ring-2 ring-cyan-400/50 shadow-lg shadow-cyan-500/20' : data ? 'bg-slate-900/85 backdrop-blur-md border-slate-800/90 hover:border-slate-700 shadow-lg hover:shadow-cyan-500/5' : 'bg-slate-900/50 backdrop-blur-sm border-slate-800/60 opacity-80'}`}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5">
          <div className={`p-1.5 rounded-lg border ${theme.badge}`}>
            <Icon size={12} className={theme.accentColor} />
          </div>
          <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400">{def.module}</span>
        </div>
        {serverName && <span className="text-[8px] font-bold bg-slate-950/80 text-slate-400 px-1.5 py-0.5 rounded border border-slate-800">{serverName}</span>}
      </div>
      <h4 className="text-xs font-bold text-slate-200 group-hover:text-white truncate mb-2" title={def.key}>{def.label}</h4>
      <div className="my-auto flex flex-col justify-center">
        {data ? (
          <>
            {isOccupancyState && occVal !== null ? (
              <div className="flex items-center gap-1.5">
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-extrabold uppercase border ${occVal === 1
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                  : 'bg-slate-800/80 text-slate-300 border-slate-700'
                  }`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${occVal === 1
                    ? 'bg-emerald-400 animate-pulse'
                    : 'bg-slate-500'
                    }`} />
                  {occVal === 1 ? 'OCCUPIED (1)' : 'AVAILABLE (0)'}
                </span>
              </div>
            ) : isTemp && tempVal !== null ? (
              <div className="flex items-baseline gap-1">
                <span className="text-xl font-black text-white font-mono leading-none">{tempVal}</span>
                <span className="text-xs font-bold text-rose-400">°C</span>
              </div>
            ) : isHumidity && humVal !== null ? (
              <div className="flex items-baseline gap-1">
                <span className="text-xl font-black text-white font-mono leading-none">{humVal}</span>
                <span className="text-xs font-bold text-cyan-400">% RH</span>
              </div>
            ) : jsonObj && typeof jsonObj === 'object' ? (
              <div className="flex flex-col gap-1 bg-slate-950/60 p-2 rounded-xl border border-slate-800">
                {jsonObj.frequency !== undefined && (
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-400 font-medium">Freq:</span>
                    <span className="font-mono font-black text-indigo-300">{jsonObj.frequency} Hz</span>
                  </div>
                )}
                {jsonObj.duration !== undefined && (
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-400 font-medium">Dur:</span>
                    <span className="font-mono font-bold text-white">
                      {jsonObj.duration >= 1000 ? `${Math.floor(jsonObj.duration / 1000)}s` : `${jsonObj.duration}ms`}
                    </span>
                  </div>
                )}
                {jsonObj.state !== undefined && (
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-400 font-medium">State:</span>
                    <span className="font-mono font-bold text-emerald-300">{String(jsonObj.state)}</span>
                  </div>
                )}
              </div>
            ) : isThreshold && numVal !== null ? (
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-black text-white font-mono leading-none">{numVal}</span>
              </div>
            ) : isLevel && numVal !== null ? (
              <div className="flex flex-col gap-1.5">
                <div className="flex items-baseline justify-between"><span className="text-lg font-black text-white leading-none font-mono">{numVal}<span className="text-xs text-slate-400 font-bold ml-0.5">%</span></span><span className="text-[9px] font-semibold text-slate-400">Level</span></div>
                <div className="w-full h-2 bg-slate-950/80 rounded-full overflow-hidden border border-slate-800/80"><div className={`h-full bg-gradient-to-r ${theme.gradient} transition-all duration-500 rounded-full`} style={{ width: `${Math.min(100, Math.max(0, numVal))}%` }} /></div>
              </div>
            ) : isHex && rawPayload ? (
              <div className="flex items-center gap-2.5 bg-slate-950/60 p-2 rounded-xl border border-slate-800">
                <div className="w-6 h-6 rounded-lg border border-white/20 shadow-md shrink-0" style={{ backgroundColor: rawPayload.startsWith('#') ? rawPayload : `#${rawPayload}` }} />
                <div className="flex flex-col min-w-0"><span className="text-xs font-mono font-bold text-white uppercase tracking-wider truncate">{rawPayload.startsWith('#') ? rawPayload : `#${rawPayload}`}</span><span className="text-[8px] text-slate-500 uppercase font-semibold">Hex Code</span></div>
              </div>
            ) : isDuration && numVal !== null ? (
              <div className="flex flex-col"><span className="text-base font-black text-white font-mono leading-none">{(() => { const totalSec = numVal > 10000 ? Math.floor(numVal / 1000) : numVal; const mins = Math.floor(totalSec / 60); const secs = totalSec % 60; return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`; })()}</span><span className="text-[9px] text-slate-400 font-medium mt-1">Total: {numVal > 10000 ? Math.floor(numVal / 1000) : numVal} dtk</span></div>
            ) : isState && rawPayload ? (
              <div className="flex items-center gap-1.5">
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-extrabold uppercase border ${rawPayload === '1' || rawPayload.toLowerCase() === 'active' || rawPayload.toLowerCase() === 'on' || rawPayload.toLowerCase() === 'occupied'
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                  : 'bg-slate-800/80 text-slate-300 border-slate-700'
                  }`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${rawPayload === '1' || rawPayload.toLowerCase() === 'active' || rawPayload.toLowerCase() === 'on' || rawPayload.toLowerCase() === 'occupied'
                    ? 'bg-emerald-400 animate-pulse'
                    : 'bg-slate-500'
                    }`} />
                  {rawPayload === '1' ? 'OCCUPIED (1)' : rawPayload === '0' ? 'AVAILABLE (0)' : rawPayload}
                </span>
              </div>
            ) : isFrequency && rawPayload ? (
              <div className="flex items-baseline gap-1"><span className="text-base font-black text-white font-mono">{rawPayload}</span><span className="text-xs font-bold text-amber-400">Hz</span></div>
            ) : (
              <div className="flex flex-col"><span className="font-mono text-xs font-bold text-white break-words line-clamp-2" title={rawPayload}>{mediaInfo ? (mediaInfo.title || mediaInfo.name || rawPayload) : rawPayload}</span>{mediaInfo?.lamp && <span className="text-[9px] text-cyan-400 font-semibold mt-0.5 truncate">Lamp: {mediaInfo.lamp}</span>}</div>
            )}
          </>
        ) : <span className="text-[10px] text-slate-500 italic font-medium">Menunggu data...</span>}
      </div>
      <div className="mt-2 pt-2 border-t border-slate-800/70 flex items-center justify-between text-[9px] text-slate-500"><span className="flex items-center gap-1 font-mono"><Clock size={10} className="opacity-70" />{data ? new Date(data.timestamp).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '--:--:--'}</span></div>
    </div>
  );
}
