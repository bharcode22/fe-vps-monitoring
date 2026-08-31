import React, { useState, useEffect, useMemo } from 'react';
import { X, Activity, Volume2, Sun, DoorOpen, Wind, Filter } from 'lucide-react';

const TOPIC_DEFINITIONS = [
  // AUDIO
  { key: 'mod_audio/vibration/set_level', module: 'Audio', label: 'Vibration Level', icon: Volume2 },
  { key: 'mod_audio/track/state', module: 'Audio', label: 'Track State', icon: Volume2 },
  { key: 'mod_audio/track/seek', module: 'Audio', label: 'Track Seek', icon: Volume2 },
  { key: 'mod_audio/track/list', module: 'Audio', label: 'Track List', icon: Volume2 },
  { key: 'mod_audio/track/cmd', module: 'Audio', label: 'Track Command', icon: Volume2 },
  { key: 'mod_audio/track/play_audio', module: 'Audio', label: 'Play Audio', icon: Volume2 },
  { key: 'mod_audio/strobo/set_level', module: 'Audio', label: 'Strobo Level', icon: Volume2 },
  { key: 'mod_audio/bt/state', module: 'Audio', label: 'Bluetooth State', icon: Volume2 },
  { key: 'mod_audio/bt/cmd', module: 'Audio', label: 'Bluetooth Command', icon: Volume2 },
  { key: 'mod_audio/audio/set_level', module: 'Audio', label: 'Audio Level', icon: Volume2 },
  // OLFACTORY
  { key: 'mod_olfactory/cmd', module: 'Olfactory', label: 'Command', icon: Wind },

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

export default function PodActivityTopicCards({ show, onClose, feed = [], pods = [] }) {
  // We keep a state map of { topicKey: { payload, timestamp, isFlashing } }
  const [topicStates, setTopicStates] = useState({});
  const [selectedServerId, setSelectedServerId] = useState('ALL');

  // Listen to feed changes
  useEffect(() => {
    if (feed.length === 0) return;

    // The feed array prepends newest logs to the front. 
    // We only process the most recent log (feed[0]) to avoid re-processing the whole array.
    const latestLog = feed[0];

    // Filter by selected server if not ALL
    if (selectedServerId !== 'ALL' && latestLog.serverId !== selectedServerId) {
      return;
    }

    // Extract the topic key (strip out pod/MAC/2.0/)
    const match = latestLog.topic.match(/pod\/[^/]+\/2\.0\/(.*)/);
    if (match && match[1]) {
      const topicKey = match[1];

      // Update state for this topic
      setTopicStates(prev => ({
        ...prev,
        [topicKey]: {
          payload: latestLog.payload,
          timestamp: latestLog.timestamp,
          serverName: latestLog.serverName,
          isFlashing: true // Trigger animation
        }
      }));

      // Turn off flashing after 800ms
      setTimeout(() => {
        setTopicStates(prev => {
          if (!prev[topicKey]) return prev;
          return {
            ...prev,
            [topicKey]: {
              ...prev[topicKey],
              isFlashing: false
            }
          };
        });
      }, 800);
    }
  }, [feed, selectedServerId]); // Only depend on feed array reference change, which happens on every new log

  if (!show) return null;

  return (
    <div className="bg-[#0a0c10]/95 rounded-2xl border border-slate-700/50 overflow-hidden flex flex-col w-full shadow-2xl ring-1 ring-white/10 flex-1">
      {/* Grid of Cards Grouped By Module */}
      <div className="p-4 bg-[#0a0c10] overflow-y-auto max-h-[500px] custom-scrollbar flex flex-col gap-6">
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
              {moduleDefs.map(def => {
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
                      {data && data.serverName && selectedServerId === 'ALL' && (
                        <span className="text-[8px] font-bold bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded">
                          {data.serverName}
                        </span>
                      )}
                    </div>

                    <h4 className={`text-xs font-semibold mb-1 truncate ${textColor}`} title={def.key}>
                      {def.label}
                    </h4>

                    <div className="mt-auto pt-2">
                      {data ? (
                        <div className="flex flex-col">
                          <span className="font-mono text-xs font-bold text-white truncate" title={data.payload}>
                            {data.payload}
                          </span>
                          <span className="text-[9px] text-slate-500 mt-1">
                            {new Date(data.timestamp).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                          </span>
                        </div>
                      ) : (
                        <span className="text-[10px] text-slate-600 italic">Menunggu data...</span>
                      )}
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
