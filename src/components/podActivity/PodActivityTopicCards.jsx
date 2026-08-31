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
  // { key: 'mod_audio/bt/state', module: 'Audio', label: 'Bluetooth State', icon: Volume2 },
  // { key: 'mod_audio/bt/cmd', module: 'Audio', label: 'Bluetooth Command', icon: Volume2 },
  { key: 'session-data', module: 'Audio', label: 'Session Data', icon: Volume2 },
  // OLFACTORY
  { key: 'mod_olfactory/cmd', module: 'Audio', label: 'Scent / Olfactory', icon: Wind },

  // AMBIENCE
  { key: 'mod_ambience/set_duration', module: 'Ambience', label: 'Duration', icon: Activity },
  { key: 'mod_ambience/set_brightness', module: 'Ambience', label: 'Brightness', icon: Activity },
  { key: 'mod_ambience/pod_state', module: 'Ambience', label: 'Pod State', icon: Activity },
  { key: 'mod_ambience/hex_color', module: 'Ambience', label: 'Hex Color', icon: Activity },

  // DOOR
  // { key: 'mod_door/state', module: 'Door', label: 'State', icon: DoorOpen },
  // { key: 'mod_door/door_proxy', module: 'Door', label: 'Proxy', icon: DoorOpen },
  // { key: 'mod_door/command', module: 'Door', label: 'Command', icon: DoorOpen },

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
  'mod_audio/track/play_audio',
  'session-data'
];

import CircularLevelControl from './CircularLevelControl';
import OlfactoryCardRenderer from './OlfactoryCardRenderer';
import AudioPlayerControlWidget from './AudioPlayerControlWidget';

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
                                  onClick={() => onPublish('mod_audio/track/cmd', '0')}
                                  className="px-1.5 py-0.5 bg-sky-500/20 text-sky-400 border border-sky-500/30 rounded text-[9px] font-bold hover:bg-sky-500/40 transition-colors"
                                  title="Publish Cmd 0 (Play/Stop Toggle)"
                                >
                                  ▶/⏹ Play/Stop (0)
                                </button>
                                <button
                                  onClick={() => onPublish('mod_audio/track/cmd', '2')}
                                  className="px-1.5 py-0.5 bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded text-[9px] font-bold hover:bg-amber-500/40 transition-colors"
                                  title="Publish Cmd 2 (Pause)"
                                >
                                  ⏸ Pause (2)
                                </button>
                                <button
                                  onClick={() => onPublish('mod_audio/track/cmd', '3')}
                                  className="px-1.5 py-0.5 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded text-[9px] font-bold hover:bg-emerald-500/40 transition-colors"
                                  title="Publish Cmd 3 (Resume)"
                                >
                                  ▶ Resume (3)
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
