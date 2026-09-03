import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  ChevronUp,
  ChevronDown,
  Check,
  Radio,
  Search,
  Plus,
  RefreshCw,
  Cpu,
  Settings,
  Trash2,
  Save,
  X,
  AlertTriangle,
  Volume2,
  VolumeX,
  ShieldAlert,
  Clock,
  Activity,
  AlertCircle,
  HelpCircle
} from 'lucide-react';
import {
  fetchHeartbeatModulesApi,
  saveHeartbeatModulesApi,
  resetHeartbeatModulesApi,
  fetchHeartbeatThresholdsApi
} from '../../api/podActivityApi';
import PodHeartbeatLegendModal, { InlineStatusLegendStrip } from './PodHeartbeatLegendModal';
import PodHeartbeatModuleConfigModal from './PodHeartbeatModuleConfigModal';
import {
  DEFAULT_HB_THRESHOLDS,
  getStoredHbThresholds,
  setStoredHbThresholds,
  EVENT_HB_THRESHOLDS_UPDATED,
  evaluateModuleHealth
} from '../../utils/heartbeatThresholds';

// Default 9 modules template
const DEFAULT_SERVER_MODULES = [
  {
    id: 501,
    name: 'Manual Control',
    topic: 'mod_server/501/data',
    defaultPort: 'ttyUSB0',
    description: 'Kontrol manual dan override input perangkat'
  },
  {
    id: 502,
    name: 'Chair Module',
    topic: 'mod_server/502/data',
    defaultPort: 'ttyUSB1',
    description: 'Sensor kursi (POB), PEMF, & Schumann'
  },
  {
    id: 503,
    name: 'Lighting Module',
    topic: 'mod_server/503/data',
    defaultPort: 'ttyUSB4',
    description: 'Kontrol RGB, UVC/UVB/UVA, & Strobo'
  },
  {
    id: 504,
    name: 'Olfactory Module',
    topic: 'mod_server/504/data',
    defaultPort: 'ttyUSB5',
    description: 'Modul aroma wewangian & difusi'
  },
  {
    id: 505,
    name: 'Door Module',
    topic: 'mod_server/505/data',
    defaultPort: null,
    description: 'Sensor status pintu & magnetic lock'
  },
  {
    id: 506,
    name: 'AirCon Module',
    topic: 'mod_server/506/data',
    defaultPort: null,
    description: 'Kontrol suhu & ventilasi udara'
  },
  {
    id: 507,
    name: 'Audio Module',
    topic: 'mod_server/507/data',
    defaultPort: 'ttyUSB2',
    description: 'Soundscape, voice guide, & haptic amplifier'
  },
  {
    id: 508,
    name: 'Power Module',
    topic: 'mod_server/508/data',
    defaultPort: 'ttyUSB3',
    description: 'Distribusi daya, relay baterai, & proteksi'
  },
  {
    id: 509,
    name: 'Biofeedback Module',
    topic: 'mod_server/509/data',
    defaultPort: null,
    description: 'Sensor GSR, detak jantung, & biometrik'
  }
];

// Web Audio API Synthesized Alert Sound for Dead / Stalled Modules
function playAlertChime() {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();
    if (ctx.state === 'suspended') ctx.resume();

    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gain = ctx.createGain();

    osc1.type = 'sawtooth';
    osc1.frequency.setValueAtTime(880, ctx.currentTime); // Note A5
    osc1.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.3);

    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(587.33, ctx.currentTime); // Note D5
    osc2.frequency.exponentialRampToValueAtTime(293.66, ctx.currentTime + 0.3);

    gain.gain.setValueAtTime(0.2, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(ctx.destination);

    osc1.start();
    osc2.start();
    osc1.stop(ctx.currentTime + 0.35);
    osc2.stop(ctx.currentTime + 0.35);
  } catch (_) { }
}

export default function PodHeartbeatDetailTab({
  pod,
  feed = [],
  mqttStatus = { connected: false },
  thresholds: propThresholds,
  onThresholdsUpdated,
  onPublish
}) {
  // Modules list loaded dynamically from backend JSON file
  const [serverModules, setServerModules] = useState(DEFAULT_SERVER_MODULES);
  const [isLoadingModules, setIsLoadingModules] = useState(false);

  // Sound alert toggle (persisted in localStorage)
  const [soundAlertEnabled, setSoundAlertEnabled] = useState(() => {
    return localStorage.getItem('vps_hb_sound_alert') !== 'false';
  });

  const toggleSoundAlert = () => {
    setSoundAlertEnabled((prev) => {
      const next = !prev;
      localStorage.setItem('vps_hb_sound_alert', String(next));
      if (next) playAlertChime(); // Preview chime
      return next;
    });
  };

  // Manage Modules Modal State
  const [isManageModalOpen, setIsManageModalOpen] = useState(false);
  const [editModulesList, setEditModulesList] = useState(DEFAULT_SERVER_MODULES);
  const [isSavingConfig, setIsSavingConfig] = useState(false);

  // Legend Guide Modal State
  const [isLegendModalOpen, setIsLegendModalOpen] = useState(false);

  // Collapsed state map for each module card
  const [collapsedMap, setCollapsedMap] = useState({});

  // Search / Filter query
  const [searchQuery, setSearchQuery] = useState('');

  // Status Filter: 'ALL' | 'CRITICAL' | 'WARNING' | 'HEALTHY'
  const [healthFilter, setHealthFilter] = useState('ALL');

  // Toast / feedback message
  const [actionFeedback, setActionFeedback] = useState(null);

  // Button loading states: { [moduleId_action]: boolean }
  const [buttonLoadingMap, setButtonLoadingMap] = useState({});

  // Flashing animation state for cards when receiving fresh data
  const [flashingCards, setFlashingCards] = useState({});

  // Keep track of dead modules count for trigger alarm sound
  const previousDeadCountRef = useRef(0);

  // Local state to store the latest parsed heartbeat and history for each module ID
  const [moduleDataMap, setModuleDataMap] = useState(() => {
    const initial = {};
    DEFAULT_SERVER_MODULES.forEach((mod) => {
      initial[mod.id] = {
        id: mod.id,
        name: mod.name,
        topic: mod.topic,
        hb: null,
        version: 'v2.1',
        date: null,
        port: mod.defaultPort,
        lastSeenAt: null,
        previousHb: null,
        lastHbChangeAt: null,
        isFrozen: false,
        rawPayload: null,
        isOnline: false,
        totalPackets: 0,
        history: []
      };
    });
    return initial;
  });

  // Heartbeat status thresholds config state
  const [thresholds, setThresholds] = useState(() => {
    return propThresholds || getStoredHbThresholds();
  });

  useEffect(() => {
    if (propThresholds) {
      setThresholds(propThresholds);
    }
  }, [propThresholds]);

  // Load modules & thresholds from backend JSON file on mount
  useEffect(() => {
    loadModulesConfig();
    loadThresholdsConfig();

    const handleThresholdsChanged = (e) => {
      if (e.detail) setThresholds(e.detail);
    };
    window.addEventListener(EVENT_HB_THRESHOLDS_UPDATED, handleThresholdsChanged);
    return () => window.removeEventListener(EVENT_HB_THRESHOLDS_UPDATED, handleThresholdsChanged);
  }, []);

  const loadThresholdsConfig = async () => {
    try {
      const data = await fetchHeartbeatThresholdsApi();
      if (data && typeof data === 'object') {
        setThresholds(data);
        setStoredHbThresholds(data);
      }
    } catch (err) {
      console.warn('Gagal memuat ambang batas heartbeat dari backend:', err.message);
    }
  };

  const loadModulesConfig = async () => {
    setIsLoadingModules(true);
    try {
      const data = await fetchHeartbeatModulesApi();
      if (Array.isArray(data) && data.length > 0) {
        setServerModules(data);
        setEditModulesList(data);

        setModuleDataMap((prev) => {
          const updated = { ...prev };
          data.forEach((mod) => {
            if (!updated[mod.id]) {
              updated[mod.id] = {
                id: mod.id,
                name: mod.name,
                topic: mod.topic,
                hb: null,
                version: 'v2.1',
                date: null,
                port: mod.defaultPort,
                lastSeenAt: null,
                previousHb: null,
                lastHbChangeAt: null,
                isFrozen: false,
                rawPayload: null,
                isOnline: false,
                totalPackets: 0,
                history: []
              };
            }
          });
          return updated;
        });
      }
    } catch (err) {
      console.warn('Gagal memuat konfigurasi modul dari backend, menggunakan default lokal:', err.message);
    } finally {
      setIsLoadingModules(false);
    }
  };

  // Open Manage Modal
  const handleOpenManageModal = () => {
    setEditModulesList(JSON.parse(JSON.stringify(serverModules)));
    setIsManageModalOpen(true);
  };

  // Save changes to backend JSON file
  const handleSaveModulesConfig = async () => {
    setIsSavingConfig(true);
    try {
      const res = await saveHeartbeatModulesApi(editModulesList);
      const updated = res.data || editModulesList;
      setServerModules(updated);
      setIsManageModalOpen(false);

      setActionFeedback({
        type: 'save',
        message: 'Konfigurasi modul berhasil disimpan ke backend JSON file!'
      });
      setTimeout(() => setActionFeedback(null), 3500);
    } catch (err) {
      alert(`Gagal menyimpan modul: ${err.message}`);
    } finally {
      setIsSavingConfig(false);
    }
  };

  // Reset to default 9 modules in backend JSON file
  const handleResetToDefaultConfig = async () => {
    if (!confirm('Apakah Anda yakin ingin mereset konfigurasi ke 9 modul default bawaan?')) return;
    setIsSavingConfig(true);
    try {
      const res = await resetHeartbeatModulesApi();
      const updated = res.data || DEFAULT_SERVER_MODULES;
      setServerModules(updated);
      setEditModulesList(updated);
      setIsManageModalOpen(false);

      setActionFeedback({
        type: 'reset',
        message: 'Konfigurasi berhasil direset ke 9 modul default!'
      });
      setTimeout(() => setActionFeedback(null), 3500);
    } catch (err) {
      alert(`Gagal mereset modul: ${err.message}`);
    } finally {
      setIsSavingConfig(false);
    }
  };

  // Keep now timestamp updated every 1s for early-warning evaluation
  const [nowTimestamp, setNowTimestamp] = useState(Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNowTimestamp(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Parse incoming MQTT feed specifically for mod_server/<id>/data and hb values
  useEffect(() => {
    if (!feed || feed.length === 0) return;

    const latestFeed = feed[0];
    if (!latestFeed || !latestFeed.topic) return;

    const topicStr = String(latestFeed.topic);
    const payloadStr = String(latestFeed.payload ?? '').trim();

    let parsedJson = null;
    if (payloadStr.startsWith('{') || payloadStr.startsWith('[')) {
      try {
        parsedJson = JSON.parse(payloadStr);
      } catch (_) { }
    }

    // Check if topic matches mod_server/<id> or if parsed payload has id & hb
    let matchedModuleId = null;
    const match = topicStr.match(/mod_server\/(\d+)/);
    if (match) {
      matchedModuleId = parseInt(match[1], 10);
    } else if (parsedJson && parsedJson.id !== undefined) {
      matchedModuleId = parseInt(parsedJson.id, 10);
    }

    if (matchedModuleId && (parsedJson?.hb !== undefined || topicStr.includes('mod_server'))) {
      const rawHb = parsedJson?.hb !== undefined
        ? parsedJson.hb
        : !isNaN(Number(payloadStr))
          ? Number(payloadStr)
          : null;
      const hbVal = (rawHb !== null && rawHb !== undefined && !isNaN(Number(rawHb))) ? Number(rawHb) : null;
      const verVal = parsedJson?.version || parsedJson?.ver || null;
      const portVal = parsedJson?.port || null;
      const timestamp = latestFeed.timestamp ? new Date(latestFeed.timestamp) : new Date();
      const nowTime = timestamp.getTime();

      let didIncrement = false;

      setModuleDataMap((prev) => {
        const currentMod = prev[matchedModuleId] || {
          id: matchedModuleId,
          name: `Module ${matchedModuleId}`,
          topic: `mod_server/${matchedModuleId}/data`,
          port: null,
          history: [],
          totalPackets: 0,
          previousHb: null,
          lastHbChangeAt: nowTime,
          isFrozen: false
        };

        const currentHbNum = (currentMod.hb !== null && currentMod.hb !== undefined && !isNaN(Number(currentMod.hb))) ? Number(currentMod.hb) : null;
        const hasHbChanged = currentHbNum !== null && hbVal !== null && currentHbNum !== hbVal;
        if (hasHbChanged) {
          didIncrement = true;
        }
        const lastHbChangeAt = hasHbChanged ? nowTime : (currentMod.lastHbChangeAt || nowTime);
        const isFrozen = !hasHbChanged && (nowTime - lastHbChangeAt > 3000);

        const newHistory = hbVal !== null
          ? [Number(hbVal), ...(currentMod.history || []).slice(0, 7)]
          : currentMod.history;

        return {
          ...prev,
          [matchedModuleId]: {
            ...currentMod,
            hb: hbVal !== null ? hbVal : currentMod.hb,
            previousHb: currentMod.hb,
            lastHbChangeAt,
            isFrozen,
            version: verVal || currentMod.version || 'v2.1',
            port: portVal || currentMod.port,
            date: timestamp.toLocaleTimeString('id-ID', { hour12: false }),
            lastSeenAt: nowTime,
            rawPayload: payloadStr,
            isOnline: true,
            totalPackets: (currentMod.totalPackets || 0) + 1,
            history: newHistory
          }
        };
      });

      // Trigger flash animation ONLY when the HB counter actually changed/incremented
      if (didIncrement) {
        setFlashingCards((prev) => ({ ...prev, [matchedModuleId]: true }));
        setTimeout(() => {
          setFlashingCards((prev) => ({ ...prev, [matchedModuleId]: false }));
        }, 600);
      }
    }
  }, [feed]);

  // Handle toggling card collapse
  const toggleCollapse = (id) => {
    setCollapsedMap((prev) => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  // Collapse / Expand All
  const areAllCollapsed = useMemo(() => {
    return serverModules.every((m) => collapsedMap[m.id]);
  }, [serverModules, collapsedMap]);

  const toggleCollapseAll = () => {
    const nextState = !areAllCollapsed;
    const newMap = {};
    serverModules.forEach((m) => {
      newMap[m.id] = nextState;
    });
    setCollapsedMap(newMap);
  };

  // Trigger STATUS command for module
  const handleStatusClick = (mod) => {
    const key = `${mod.id}_status`;
    setButtonLoadingMap((prev) => ({ ...prev, [key]: true }));

    const payload = JSON.stringify({ cmd: 'status', id: mod.id });
    if (onPublish) {
      onPublish(`mod_server/${mod.id}/cmd`, payload);
    }

    setTimeout(() => {
      setButtonLoadingMap((prev) => ({ ...prev, [key]: false }));
      setActionFeedback({
        type: 'status',
        message: `Status check dikirim ke ${mod.name} (ID: ${mod.id})`
      });
      setTimeout(() => setActionFeedback(null), 3000);
    }, 400);
  };

  // Trigger RESET command for module
  const handleResetClick = (mod) => {
    const key = `${mod.id}_reset`;
    setButtonLoadingMap((prev) => ({ ...prev, [key]: true }));

    const payload = JSON.stringify({ cmd: 'reset', id: mod.id });
    if (onPublish) {
      onPublish(`mod_server/${mod.id}/cmd`, payload);
    }

    setTimeout(() => {
      setButtonLoadingMap((prev) => ({ ...prev, [key]: false }));
      setModuleDataMap((prev) => ({
        ...prev,
        [mod.id]: {
          ...prev[mod.id],
          hb: 0,
          date: new Date().toLocaleTimeString('id-ID', { hour12: false }),
          lastSeenAt: Date.now(),
          isFrozen: false
        }
      }));

      setActionFeedback({
        type: 'reset',
        message: `Reset command dikirim ke ${mod.name} (ID: ${mod.id})`
      });
      setTimeout(() => setActionFeedback(null), 3000);
    }, 400);
  };

  // Broadcast STATUS to all modules
  const handleStatusAll = () => {
    serverModules.forEach((mod) => {
      if (onPublish) {
        onPublish(`mod_server/${mod.id}/cmd`, JSON.stringify({ cmd: 'status', id: mod.id }));
      }
    });
    setActionFeedback({
      type: 'status',
      message: `Status check disiarkan ke seluruh ${serverModules.length} modul!`
    });
    setTimeout(() => setActionFeedback(null), 3000);
  };

  // Health evaluation for all modules
  const modulesHealthAnalysis = useMemo(() => {
    const deadList = [];
    const warningList = [];
    const healthyList = [];
    const frozenList = [];

    const { delaySec = 2, frozenSec = 10, deadSec = 30 } = thresholds;

    serverModules.forEach((mod) => {
      const data = moduleDataMap[mod.id];
      const health = evaluateModuleHealth(data, thresholds, nowTimestamp);
      const { status, reason, packetElapsedSec, hbElapsedSec, elapsedSec } = health;

      if (status === 'DEAD') {
        deadList.push({
          mod,
          data,
          elapsedSec,
          reason
        });
      } else if (status === 'FROZEN') {
        frozenList.push({
          mod,
          data,
          elapsedSec,
          reason
        });
      } else if (status === 'DELAY') {
        warningList.push({
          mod,
          data,
          elapsedSec,
          reason
        });
      } else {
        healthyList.push({
          mod,
          data,
          elapsedSec
        });
      }
    });

    return {
      deadList,
      warningList,
      healthyList,
      frozenList,
      hasCriticalIssue: deadList.length > 0 || frozenList.length > 0,
      hasWarningIssue: warningList.length > 0
    };
  }, [serverModules, moduleDataMap, nowTimestamp]);

  // Trigger sound alarm ONLY if newly DEAD modules are detected (Hanya status DEAD)
  useEffect(() => {
    const currentDeadCount = modulesHealthAnalysis.deadList.length;
    if (currentDeadCount > previousDeadCountRef.current && soundAlertEnabled) {
      playAlertChime();
    }
    previousDeadCountRef.current = currentDeadCount;
  }, [modulesHealthAnalysis.deadList.length, soundAlertEnabled]);

  // Total Heartbeat packets count across all modules
  const totalReceivedPackets = useMemo(() => {
    return Object.values(moduleDataMap).reduce((acc, curr) => acc + (curr.totalPackets || 0), 0);
  }, [moduleDataMap]);

  // Filtered modules
  const filteredModules = useMemo(() => {
    const { delaySec = 2, frozenSec = 10, deadSec = 30 } = thresholds;

    return serverModules.filter((m) => {
      const data = moduleDataMap[m.id];
      const health = evaluateModuleHealth(data, thresholds, nowTimestamp);
      const isDead = health.status === 'DEAD';
      const isFrozen = health.status === 'FROZEN';
      const isWarning = health.status === 'DELAY';
      const isHealthy = health.status === 'LIVE';

      if (healthFilter === 'CRITICAL' && !(isDead || isFrozen)) return false;
      if (healthFilter === 'WARNING' && !isWarning) return false;
      if (healthFilter === 'HEALTHY' && !isHealthy) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchName = m.name.toLowerCase().includes(q);
        const matchId = String(m.id).includes(q);
        const matchTopic = m.topic.toLowerCase().includes(q);
        const matchPort = m.defaultPort && m.defaultPort.toLowerCase().includes(q);
        if (!matchName && !matchId && !matchTopic && !matchPort) return false;
      }

      return true;
    });
  }, [serverModules, moduleDataMap, nowTimestamp, healthFilter, searchQuery]);

  return (
    <div className="flex flex-col gap-6 w-full animate-in fade-in duration-200">
      {/* 1. CRITICAL EARLY-WARNING INCIDENT BANNER (IF ANY MODULE IS DEAD / FROZEN) */}
      {modulesHealthAnalysis.hasCriticalIssue && (
        <div className="p-4 sm:p-5 bg-gradient-to-r from-rose-950/80 via-slate-900/90 to-rose-950/80 border-2 border-rose-500 rounded-2xl backdrop-blur-md shadow-2xl shadow-rose-500/20 flex flex-col md:flex-row md:items-center justify-between gap-4 animate-in slide-in-from-top-3 duration-200 ring-2 ring-rose-500/30">
          <div className="flex items-start gap-3.5">
            <div className="p-2.5 bg-rose-500/25 border border-rose-500/40 text-rose-400 rounded-xl shrink-0 animate-pulse">
              <ShieldAlert size={24} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-black text-rose-300 uppercase tracking-wider flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-400 animate-ping" />
                  PERINGATAN DINI: {modulesHealthAnalysis.deadList.length + modulesHealthAnalysis.frozenList.length} MODUL MATI / TIMEOUT!
                </h3>
              </div>
              <p className="text-xs text-rose-200/90 mt-1 font-medium">
                Hardware tidak mengirim paket heartbeat dalam batas waktu yang ditentukan. Segera periksa koneksi USB / power modul berikut:
              </p>
              {/* Badges of Dead Modules */}
              <div className="flex flex-wrap gap-2 mt-2.5">
                {[...modulesHealthAnalysis.deadList, ...modulesHealthAnalysis.frozenList].map(({ mod, elapsedSec, reason }) => (
                  <span
                    key={mod.id}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-mono font-black bg-rose-500/20 text-rose-200 border border-rose-500/50 shadow-sm"
                  >
                    <AlertCircle size={13} className="text-rose-400" />
                    <span>{mod.name} (ID: {mod.id})</span>
                    <span className="text-rose-300 font-normal">[{reason}]</span>
                  </span>
                ))}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2.5 shrink-0 self-end md:self-center">
            <button
              onClick={() => {
                [...modulesHealthAnalysis.deadList, ...modulesHealthAnalysis.frozenList].forEach(({ mod }) => {
                  handleStatusClick(mod);
                });
              }}
              className="px-4 py-2 bg-rose-600 hover:bg-rose-500 active:scale-95 text-white font-extrabold text-xs rounded-xl shadow-lg transition flex items-center gap-2 cursor-pointer"
              title="Kirim status check ke seluruh modul bermasalah"
            >
              <RefreshCw size={14} />
              <span>Ping Semua Modul Bermasalah</span>
            </button>
          </div>
        </div>
      )}

      {/* 2. TOOLBAR & STATS BAR */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900/80 p-4 rounded-2xl border border-slate-800 shadow-xl backdrop-blur-md">
        {/* Left: Summary Metrics */}
        <div className="flex items-center gap-3 flex-wrap">
          {/* Total Received Packets */}
          <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-950/80 rounded-xl border border-slate-800">
            <Radio size={14} className="text-cyan-400 animate-pulse" />
            <span className="text-xs text-slate-400">Total Paket:</span>
            <span className="text-xs font-bold text-white font-mono">{totalReceivedPackets}</span>
          </div>

          {/* Healthy Count */}
          <button
            onClick={() => setHealthFilter((prev) => (prev === 'HEALTHY' ? 'ALL' : 'HEALTHY'))}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold cursor-pointer transition ${healthFilter === 'HEALTHY'
              ? 'bg-emerald-500/25 text-emerald-300 border-emerald-500/40 shadow-sm'
              : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20'
              }`}
          >
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>{modulesHealthAnalysis.healthyList.length} Live OK</span>
          </button>

          {/* Warning / Delay Count */}
          {modulesHealthAnalysis.warningList.length > 0 && (
            <button
              onClick={() => setHealthFilter((prev) => (prev === 'WARNING' ? 'ALL' : 'WARNING'))}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold cursor-pointer transition ${healthFilter === 'WARNING'
                ? 'bg-amber-500/25 text-amber-300 border-amber-500/40 shadow-sm'
                : 'bg-amber-500/10 text-amber-400 border-amber-500/20 hover:bg-amber-500/20'
                }`}
            >
              <AlertTriangle size={13} className="text-amber-400" />
              <span>{modulesHealthAnalysis.warningList.length} Delay</span>
            </button>
          )}

          {/* Dead / Frozen Critical Count */}
          {(modulesHealthAnalysis.deadList.length > 0 || modulesHealthAnalysis.frozenList.length > 0) && (
            <button
              onClick={() => setHealthFilter((prev) => (prev === 'CRITICAL' ? 'ALL' : 'CRITICAL'))}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold cursor-pointer transition animate-pulse ${healthFilter === 'CRITICAL'
                ? 'bg-rose-500/30 text-rose-200 border-rose-500/50 shadow-sm'
                : 'bg-rose-500/15 text-rose-300 border-rose-500/30 hover:bg-rose-500/25'
                }`}
            >
              <AlertCircle size={13} className="text-rose-400" />
              <span>{modulesHealthAnalysis.deadList.length + modulesHealthAnalysis.frozenList.length} Mati / Macet</span>
            </button>
          )}
        </div>

        {/* Right: Search, Legend & Actions */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Search Input */}
          <div className="relative">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari modul / port (ttyUSB)..."
              className="bg-slate-950/80 border border-slate-800 text-slate-200 text-xs rounded-xl pl-8 pr-7 py-2 focus:outline-none focus:border-cyan-500/70 w-44 sm:w-56 font-medium placeholder:text-slate-500"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white p-1 rounded-md hover:bg-slate-800 transition cursor-pointer"
                title="Hapus pencarian"
              >
                <X size={12} />
              </button>
            )}
          </div>

          <button
            onClick={() => setIsLegendModalOpen(true)}
            className="p-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-cyan-300 hover:text-white rounded-xl flex items-center gap-1.5 text-xs font-bold transition cursor-pointer"
            title="Buka Panduan Status & Atur Ambang Batas Waktu (JSON Backend)"
          >
            <HelpCircle size={14} className="text-cyan-400" />
            <span className="hidden sm:inline">Panduan & Atur Waktu</span>
          </button>
          <button onClick={toggleSoundAlert} className={`p-2 rounded-xl border cursor-pointer transition ${soundAlertEnabled ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' : 'bg-slate-800 text-slate-400 border-slate-700'}`} title="Toggle Alarm">
             {soundAlertEnabled ? <Volume2 size={14} className="text-emerald-400 animate-pulse" /> : <VolumeX size={14} />}
          </button>
          <button onClick={handleOpenManageModal} className="p-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 rounded-xl cursor-pointer transition" title="Kelola Modul (JSON)">
             <Settings size={14} />
          </button>
          <button onClick={handleStatusAll} className="p-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 rounded-xl cursor-pointer transition" title="Check All Status">
             <RefreshCw size={14} />
          </button>
          <button onClick={toggleCollapseAll} className="p-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 rounded-xl cursor-pointer transition" title="Toggle All">
             {areAllCollapsed ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
          </button>
        </div>
      </div>

      {/* 4. 2-COLUMN GRID OF HEARTBEAT MODULE CARDS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {filteredModules.map((mod) => {
          const data = moduleDataMap[mod.id] || {};
          const isCollapsed = Boolean(collapsedMap[mod.id]);
          const isFlashing = Boolean(flashingCards[mod.id]);
          const hasPort = Boolean(data.port || mod.defaultPort);
          const portName = data.port || mod.defaultPort;

          const health = evaluateModuleHealth(data, thresholds, nowTimestamp);
          const isDead = health.status === 'DEAD';
          const isFrozen = health.status === 'FROZEN';
          const isDelay = health.status === 'DELAY';
          const isHealthy = health.status === 'LIVE';
          const packetElapsedSec = health.packetElapsedSec;
          const hbElapsedSec = health.hbElapsedSec;
          const elapsedSec = health.elapsedSec;

          const isStatusLoading = buttonLoadingMap[`${mod.id}_status`];
          const isResetLoading = buttonLoadingMap[`${mod.id}_reset`];

          return (
            <div
              key={mod.id}
              className={`flex flex-col justify-between rounded-2xl bg-slate-900/85 backdrop-blur-md border transition-all duration-500 ease-out shadow-lg relative overflow-hidden group ${isFlashing
                ? 'border-cyan-400/60 shadow-[0_0_18px_rgba(6,182,212,0.15)] scale-[1.004]'
                : isDead || isFrozen
                  ? 'border-rose-500/40 shadow-[0_0_15px_rgba(244,63,94,0.10)] bg-gradient-to-b from-rose-950/15 via-slate-900/85 to-slate-900/90 hover:border-rose-500/60'
                  : isDelay
                    ? 'border-amber-500/30 shadow-[0_0_12px_rgba(245,158,11,0.08)] bg-gradient-to-b from-amber-950/15 via-slate-900/85 to-slate-900/90 hover:border-amber-500/50'
                    : 'border-slate-800/90 hover:border-slate-700/60 hover:bg-slate-900/95 hover:shadow-xl hover:shadow-black/20'
                }`}
            >
              {/* Subtle Discreet Ambient Corner Aura */}
              <div
                className={`absolute -top-8 -right-8 w-24 h-24 rounded-full blur-2xl pointer-events-none transition-opacity duration-700 ease-out ${isFlashing
                  ? 'bg-cyan-400/25 scale-110 opacity-100'
                  : isDead
                    ? 'bg-rose-500/15 opacity-70 animate-pulse'
                    : isFrozen
                      ? 'bg-purple-500/20 opacity-70 animate-pulse'
                      : isDelay
                        ? 'bg-amber-500/10 opacity-50'
                        : 'bg-emerald-500/10 opacity-25 group-hover:opacity-45'
                  }`}
              />

              {/* Discreet Flash Bloom on Packet Receive */}
              <div
                className={`absolute inset-0 bg-gradient-to-r from-transparent via-cyan-400/5 to-transparent pointer-events-none transition-opacity duration-500 ease-out ${isFlashing ? 'opacity-100' : 'opacity-0'
                  }`}
              />

              {/* Card Header: Title + Topic Tag + Status Badge + Arrow Collapse */}
              <div className={`flex items-center justify-between px-5 py-3.5 border-b select-none rounded-t-2xl cursor-pointer relative z-10 transition-colors duration-500 ${isDead || isFrozen
                ? 'border-rose-500/30 bg-rose-950/30'
                : isDelay
                  ? 'border-amber-500/30 bg-amber-950/20'
                  : 'border-slate-800/80 bg-slate-950/40 group-hover:bg-slate-950/60'
                }`}>
                <div
                  onClick={() => toggleCollapse(mod.id)}
                  className="flex items-center gap-2.5 flex-1"
                >
                  <h3 className={`text-sm font-bold tracking-wide transition-colors duration-300 ease-out ${isDead || isFrozen ? 'text-rose-300' : isDelay ? 'text-amber-300' : 'text-cyan-400 group-hover:text-cyan-300'
                    }`}>
                    {mod.name}
                  </h3>
                  <span className="text-[11px] font-mono text-slate-400 bg-slate-950/60 px-2 py-0.5 rounded-lg border border-slate-800 transition-colors duration-300 group-hover:border-slate-700">
                    {mod.topic}
                  </span>

                  {/* Health State Badge with Breathing Glow */}
                  {isDead ? (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-rose-500/20 text-rose-300 border border-rose-500/40 shadow-[0_0_10px_rgba(244,63,94,0.2)]">
                      <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500" />
                      </span>
                      <span>DEAD ({packetElapsedSec ? `${packetElapsedSec}s` : 'NO DATA'})</span>
                    </span>
                  ) : isFrozen ? (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-purple-500/20 text-purple-300 border border-purple-500/40 shadow-[0_0_10px_rgba(192,132,252,0.2)]">
                      <span className="w-2 h-2 rounded-full bg-purple-400 animate-pulse" />
                      <span>FROZEN ({hbElapsedSec}s)</span>
                    </span>
                  ) : isDelay ? (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-[0_0_8px_rgba(251,191,36,0.15)]">
                      <span className="w-2 h-2 rounded-full bg-amber-400" />
                      <span>DELAY ({Math.max(packetElapsedSec || 0, hbElapsedSec || 0)}s)</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 shadow-[0_0_10px_rgba(52,211,153,0.15)]">
                      <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60" />
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,1)]" />
                      </span>
                      <span>LIVE</span>
                    </span>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => toggleCollapse(mod.id)}
                  className="p-1.5 bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg border border-slate-700/60 transition cursor-pointer"
                  title={isCollapsed ? 'Buka Card' : 'Tutup Card'}
                >
                  {isCollapsed ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
                </button>
              </div>

              {/* Card Body */}
              {!isCollapsed && (
                <div className="p-5 flex flex-col gap-4 relative z-10">
                  {/* Row 1: 3 Metrics Columns (HB, DATE, ID Module) */}
                  <div className="grid grid-cols-3 gap-2 items-center">
                    {/* HB Column */}
                    <div className="flex items-baseline gap-2">
                      <span className="text-xs font-bold text-slate-400 tracking-wider">
                        HB
                      </span>
                      <span className={`text-base font-black font-mono tracking-tight transition-all duration-300 ${isFlashing
                        ? 'text-cyan-300 font-extrabold scale-105 drop-shadow-[0_0_8px_rgba(6,182,212,0.8)]'
                        : isDead
                          ? 'text-rose-400'
                          : isDelay
                            ? 'text-amber-300'
                            : data.hb !== null
                              ? 'text-white'
                              : 'text-slate-600'
                        }`}>
                        {data.hb !== null && data.hb !== undefined ? data.hb : '—'}
                      </span>
                    </div>

                    {/* DATE Column */}
                    <div className="flex flex-col justify-center">
                      <div className="flex items-baseline gap-2">
                        <span className="text-xs font-bold text-slate-400 tracking-wider">
                          DATE
                        </span>
                        <span className="text-xs font-mono text-slate-300">
                          {data.date || '—'}
                        </span>
                      </div>
                      {packetElapsedSec !== null && (
                        <span className={`text-[10px] font-mono mt-0.5 ${isDead ? 'text-rose-400 font-bold' : isFrozen ? 'text-purple-400 font-bold' : isDelay ? 'text-amber-400' : isHealthy ? 'text-emerald-400 font-bold' : 'text-slate-500'
                          }`}>
                          {isDead ? (packetElapsedSec ? `${packetElapsedSec}s lalu` : 'mati') : isFrozen ? `macet di #${data.hb}` : isDelay ? `delay ${Math.max(packetElapsedSec || 0, hbElapsedSec || 0)}s` : isHealthy ? '● live' : `${packetElapsedSec}s lalu`}
                        </span>
                      )}
                    </div>

                    {/* ID Module Column */}
                    <div className="flex items-baseline justify-end gap-2 text-right">
                      <span className="text-xs font-bold text-slate-400 tracking-wider">
                        ID Module
                      </span>
                      <span className="text-base font-black font-mono text-white">
                        {mod.id}
                      </span>
                    </div>
                  </div>

                  {/* Row 2: Port Status Indicator & Action Buttons (STATUS, RESET) */}
                  <div className="flex items-center justify-between pt-1">
                    {/* Port & Glowing Dot */}
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-slate-400">port</span>
                      {hasPort ? (
                        <div className="flex items-center gap-2 bg-slate-950/60 px-2.5 py-1 rounded-lg border border-slate-800 shadow-inner">
                          <span className="text-xs font-bold font-mono text-white">
                            {portName}
                          </span>
                          <span className="relative flex h-2 w-2">
                            {isHealthy && (
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60" />
                            )}
                            <span
                              className={`relative inline-flex rounded-full h-2 w-2 transition-all ${isHealthy
                                ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,1)]'
                                : isDelay
                                  ? 'bg-amber-400 shadow-[0_0_6px_rgba(251,191,36,0.8)]'
                                  : isFrozen
                                    ? 'bg-purple-400 shadow-[0_0_6px_rgba(192,132,252,0.8)]'
                                    : 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,1)]'
                                }`}
                              title={`Port ${portName} (${isHealthy ? 'Aktif' : isDelay ? 'Delay' : isFrozen ? 'Counter Macet' : 'Mati / Timeout'})`}
                            />
                          </span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 bg-slate-950/60 px-2.5 py-1 rounded-lg border border-slate-800">
                          <span
                            className="w-2 h-2 rounded-full bg-rose-500/80"
                            title="Port Belum Terdeteksi"
                          />
                        </div>
                      )}
                    </div>

                    {/* Action Buttons (STATUS & RESET) */}
                    <div className="flex items-center gap-2.5">
                      <button
                        type="button"
                        disabled={isStatusLoading}
                        onClick={() => handleStatusClick(mod)}
                        className="px-5 py-1.5 bg-slate-800/80 hover:bg-slate-700/90 text-slate-300 hover:text-white rounded-xl border border-slate-700/60 hover:border-slate-600/80 font-extrabold text-xs tracking-wider uppercase transition-all duration-300 ease-out shadow-sm hover:shadow active:scale-98 cursor-pointer select-none flex items-center justify-center min-w-[78px] disabled:opacity-50"
                      >
                        {isStatusLoading ? (
                          <RefreshCw size={12} className="animate-spin text-cyan-400" />
                        ) : (
                          'STATUS'
                        )}
                      </button>
                      <button
                        type="button"
                        disabled={isResetLoading}
                        onClick={() => handleResetClick(mod)}
                        className="px-5 py-1.5 bg-slate-800/80 hover:bg-slate-700/90 text-slate-300 hover:text-white rounded-xl border border-slate-700/60 hover:border-slate-600/80 font-extrabold text-xs tracking-wider uppercase transition-all duration-300 ease-out shadow-sm hover:shadow active:scale-98 cursor-pointer select-none flex items-center justify-center min-w-[78px] disabled:opacity-50"
                      >
                        {isResetLoading ? (
                          <RefreshCw size={12} className="animate-spin text-rose-400" />
                        ) : (
                          'RESET'
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* 5. MANAGE MODULES MODAL (JSON CONFIG EDITOR) */}
      <PodHeartbeatModuleConfigModal
        isOpen={isManageModalOpen}
        onClose={() => setIsManageModalOpen(false)}
        currentModules={serverModules}
        onSaveSuccess={(updated) => {
          setServerModules(updated);
          setActionFeedback({
            type: 'save',
            message: 'Konfigurasi modul berhasil diperbarui dari JSON backend!'
          });
          setTimeout(() => setActionFeedback(null), 3500);
        }}
      />

      {/* 6. STATUS GUIDE & THRESHOLDS CONFIG MODAL */}
      <PodHeartbeatLegendModal
        isOpen={isLegendModalOpen}
        onClose={() => setIsLegendModalOpen(false)}
        thresholds={thresholds}
        onThresholdsUpdated={(updated) => {
          setThresholds(updated);
          if (onThresholdsUpdated) onThresholdsUpdated(updated);
          setActionFeedback({
            type: 'save',
            message: 'Ambang batas status berhasil diperbarui dari JSON backend!'
          });
          setTimeout(() => setActionFeedback(null), 3500);
        }}
      />
    </div>
  );
}
