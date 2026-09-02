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
  resetHeartbeatModulesApi
} from '../../api/podActivityApi';
import PodHeartbeatLegendModal, { InlineStatusLegendStrip } from './PodHeartbeatLegendModal';

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

  // Load modules from backend JSON file on mount
  useEffect(() => {
    loadModulesConfig();
  }, []);

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
      const hbVal = parsedJson?.hb !== undefined
        ? parsedJson.hb
        : !isNaN(Number(payloadStr))
          ? Number(payloadStr)
          : null;
      const verVal = parsedJson?.version || parsedJson?.ver || null;
      const portVal = parsedJson?.port || null;
      const timestamp = latestFeed.timestamp ? new Date(latestFeed.timestamp) : new Date();
      const nowTime = timestamp.getTime();

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

        const hasHbChanged = currentMod.hb !== hbVal;
        const lastHbChangeAt = hasHbChanged ? nowTime : (currentMod.lastHbChangeAt || nowTime);
        const isFrozen = !hasHbChanged && (nowTime - lastHbChangeAt > 15000);

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

      // Trigger flash animation
      setFlashingCards((prev) => ({ ...prev, [matchedModuleId]: true }));
      setTimeout(() => {
        setFlashingCards((prev) => ({ ...prev, [matchedModuleId]: false }));
      }, 700);
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

    serverModules.forEach((mod) => {
      const data = moduleDataMap[mod.id];
      const elapsedSec = data?.lastSeenAt ? Math.floor((nowTimestamp - data.lastSeenAt) / 1000) : null;

      if (!data?.lastSeenAt || elapsedSec > 12) {
        deadList.push({ mod, data, elapsedSec, reason: !data?.lastSeenAt ? 'Belum pernah berdetak' : `Mati ${elapsedSec}s lalu` });
      } else if (data?.isFrozen) {
        frozenList.push({ mod, data, elapsedSec, reason: 'Nilai HB macet (Frozen)' });
      } else if (elapsedSec > 4) {
        warningList.push({ mod, data, elapsedSec, reason: `Delay ${elapsedSec}s` });
      } else {
        healthyList.push({ mod, data, elapsedSec });
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

  // Trigger sound alarm if newly dead modules are detected
  useEffect(() => {
    const currentDeadCount = modulesHealthAnalysis.deadList.length + modulesHealthAnalysis.frozenList.length;
    if (currentDeadCount > previousDeadCountRef.current && soundAlertEnabled) {
      playAlertChime();
    }
    previousDeadCountRef.current = currentDeadCount;
  }, [modulesHealthAnalysis.deadList.length, modulesHealthAnalysis.frozenList.length, soundAlertEnabled]);

  // Total Heartbeat packets count across all modules
  const totalReceivedPackets = useMemo(() => {
    return Object.values(moduleDataMap).reduce((acc, curr) => acc + (curr.totalPackets || 0), 0);
  }, [moduleDataMap]);

  // Filtered modules
  const filteredModules = useMemo(() => {
    return serverModules.filter((m) => {
      const data = moduleDataMap[m.id];
      const elapsedSec = data?.lastSeenAt ? Math.floor((nowTimestamp - data.lastSeenAt) / 1000) : null;
      const isDead = !data?.lastSeenAt || elapsedSec > 12 || data?.isFrozen;
      const isWarning = elapsedSec !== null && elapsedSec > 4 && elapsedSec <= 12;
      const isHealthy = elapsedSec !== null && elapsedSec <= 4 && !data?.isFrozen;

      if (healthFilter === 'CRITICAL' && !isDead) return false;
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
              title="Kirim request status serentak ke modul yang bermasalah"
            >
              <RefreshCw size={13} />
              <span>Ping Modul Bermasalah</span>
            </button>
          </div>
        </div>
      )}

      {/* 2. TOP STATS BAR & QUICK FLEET CONTROLS */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-slate-900/80 p-5 rounded-2xl border border-slate-800 backdrop-blur-md shadow-xl">
        {/* Left: Icon, Title, & Realtime Health Badges */}
        <div className="flex items-center gap-4">
          <div className={`p-3 rounded-2xl border shadow-lg transition-all ${modulesHealthAnalysis.hasCriticalIssue
            ? 'bg-rose-500/20 text-rose-400 border-rose-500/40 shadow-rose-500/20 animate-pulse'
            : 'bg-gradient-to-br from-indigo-500/20 to-purple-500/20 text-indigo-400 border-indigo-500/30 shadow-indigo-500/10'
            }`}>
            <Cpu size={24} className="animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h2 className="text-xl font-black text-white tracking-wide">
                Heartbeat Modules
              </h2>
              <span className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full border ${modulesHealthAnalysis.hasCriticalIssue
                ? 'bg-rose-500/20 text-rose-300 border-rose-500/40 animate-pulse'
                : 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30'
                }`}>
                {serverModules.length} Modul
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400 mt-1 font-medium">
              {/* Healthy Badge */}
              <span className="flex items-center gap-1.5 font-mono text-[11px] text-emerald-400 font-bold bg-slate-950/60 px-2.5 py-0.5 rounded-lg border border-slate-800">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                {modulesHealthAnalysis.healthyList.length} Active
              </span>

              {/* Warning Badge (if any) */}
              {modulesHealthAnalysis.warningList.length > 0 && (
                <span className="flex items-center gap-1.5 font-mono text-[11px] text-amber-400 font-bold bg-amber-500/15 px-2.5 py-0.5 rounded-lg border border-amber-500/30">
                  <Clock size={11} />
                  {modulesHealthAnalysis.warningList.length} Delayed (&gt;4s)
                </span>
              )}

              {/* Dead Badge (if any) */}
              {modulesHealthAnalysis.deadList.length > 0 && (
                <span className="flex items-center gap-1.5 font-mono text-[11px] text-rose-400 font-bold bg-rose-500/20 px-2.5 py-0.5 rounded-lg border border-rose-500/40 animate-pulse">
                  <AlertTriangle size={11} />
                  {modulesHealthAnalysis.deadList.length} DEAD (&gt;12s)
                </span>
              )}

              <span className="text-slate-600">•</span>
              <span className="flex items-center gap-1.5 font-mono text-[11px] text-slate-400 bg-slate-950/60 px-2 py-0.5 rounded-lg border border-slate-800">
                <Radio size={11} className="text-cyan-400 animate-pulse" />
                {totalReceivedPackets} Paket Diterima
              </span>
            </div>
          </div>
        </div>

        {/* Right: Search Box, Health Filter Pills, Alarm Toggle, & Actions */}
        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Quick Search */}
          <div className="relative w-full sm:w-64 md:w-72 lg:w-80">
            <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari ID, Modul, Port, Topik..."
              className="w-full pl-9 pr-8 py-2 bg-slate-950/90 border border-slate-800 focus:border-cyan-400 rounded-xl text-white text-xs outline-none transition-all placeholder:text-slate-500 shadow-inner"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white p-1 rounded-md hover:bg-slate-800 transition cursor-pointer"
                title="Hapus pencarian"
              >
                <X size={12} />
              </button>
            )}
          </div>

          {/* Sound Alarm Toggle Button */}
          <button
            onClick={toggleSoundAlert}
            className={`p-2.5 rounded-xl border transition-all flex items-center gap-1.5 text-xs font-bold cursor-pointer ${soundAlertEnabled
              ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/25'
              : 'bg-slate-800/80 text-slate-400 border-slate-700/60 hover:text-slate-200'
              }`}
            title={soundAlertEnabled ? 'Alarm Suara Aktif (Klik untuk Mute)' : 'Alarm Suara Mati (Klik untuk Aktifkan)'}
          >
            {soundAlertEnabled ? <Volume2 size={14} className="text-emerald-400 animate-pulse" /> : <VolumeX size={14} />}
            <span className="hidden sm:inline">{soundAlertEnabled ? 'Alarm ON' : 'Alarm OFF'}</span>
          </button>

          {/* Panduan Status / Legend Button */}
          <button
            onClick={() => setIsLegendModalOpen(true)}
            className="p-2.5 bg-slate-800/80 hover:bg-slate-700 text-cyan-300 hover:text-white rounded-xl border border-slate-700/60 shadow flex items-center gap-1.5 text-xs font-bold cursor-pointer transition"
            title="Buka Panduan Arti Warna & Status Modul"
          >
            <HelpCircle size={14} className="text-cyan-400" />
            <span>Panduan Status</span>
          </button>

          {/* Manage Modules Button (Opens JSON Config Editor Modal) */}
          <button
            onClick={handleOpenManageModal}
            className="p-2.5 bg-slate-800/80 hover:bg-slate-700 rounded-xl transition-all text-cyan-300 hover:text-white border border-slate-700/60 shadow flex items-center gap-1.5 text-xs font-bold cursor-pointer"
            title="Kelola & Simpan Konfigurasi Modul ke JSON Backend"
          >
            <Settings size={14} className="text-cyan-400" />
            <span>Manage</span>
          </button>

          {/* Check All Status Button */}
          <button
            onClick={handleStatusAll}
            className="p-2.5 bg-slate-800/80 hover:bg-slate-700 rounded-xl transition-all text-slate-300 hover:text-white border border-slate-700/60 shadow text-xs font-bold flex items-center gap-1.5 cursor-pointer"
            title="Kirim request status ke seluruh modul"
          >
            <RefreshCw size={13} />
            <span className="hidden sm:inline">Check All</span>
          </button>

          {/* Collapse / Expand All */}
          <button
            onClick={toggleCollapseAll}
            className="p-2.5 bg-slate-800/80 hover:bg-slate-700 rounded-xl transition-all text-slate-300 hover:text-white border border-slate-700/60 shadow text-xs font-bold flex items-center gap-1 cursor-pointer"
            title={areAllCollapsed ? 'Buka Semua Card' : 'Tutup Semua Card'}
          >
            {areAllCollapsed ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
            <span className="hidden sm:inline">{areAllCollapsed ? 'Expand' : 'Collapse'}</span>
          </button>
        </div>
      </div>

      {/* Quick Inline Color Legend Strip */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <InlineStatusLegendStrip onOpenFullGuide={() => setIsLegendModalOpen(true)} />
      </div>

      {/* 3. TOAST FEEDBACK NOTIFICATION */}
      {actionFeedback && (
        <div className="p-3.5 bg-emerald-500/90 text-white text-xs font-bold rounded-xl shadow-xl flex items-center justify-between animate-in fade-in duration-150 backdrop-blur-md">
          <div className="flex items-center gap-2">
            <Check size={15} />
            <span>{actionFeedback.message}</span>
          </div>
        </div>
      )}

      {/* 4. 2-COLUMN GRID OF HEARTBEAT MODULE CARDS (WITH HIGH-PRECISION HEALTH STATUS) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {filteredModules.map((mod) => {
          const data = moduleDataMap[mod.id] || {};
          const isCollapsed = Boolean(collapsedMap[mod.id]);
          const isFlashing = Boolean(flashingCards[mod.id]);
          const hasPort = Boolean(data.port || mod.defaultPort);
          const portName = data.port || mod.defaultPort;
          const elapsedSec = data.lastSeenAt ? Math.floor((nowTimestamp - data.lastSeenAt) / 1000) : null;

          // Health classification
          const isDead = !data.lastSeenAt || elapsedSec > 12;
          const isFrozen = data.isFrozen;
          const isDelay = elapsedSec !== null && elapsedSec > 4 && elapsedSec <= 12;
          const isHealthy = elapsedSec !== null && elapsedSec <= 4 && !isFrozen;

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
                      <span>DEAD ({elapsedSec ? `${elapsedSec}s` : 'NO DATA'})</span>
                    </span>
                  ) : isFrozen ? (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-purple-500/20 text-purple-300 border border-purple-500/40 shadow-[0_0_10px_rgba(192,132,252,0.2)]">
                      <span className="w-2 h-2 rounded-full bg-purple-400 animate-pulse" />
                      <span>FROZEN</span>
                    </span>
                  ) : isDelay ? (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-[0_0_8px_rgba(251,191,36,0.15)]">
                      <span className="w-2 h-2 rounded-full bg-amber-400" />
                      <span>DELAY ({elapsedSec}s)</span>
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
                      {elapsedSec !== null && (
                        <span className={`text-[10px] font-mono mt-0.5 ${isDead ? 'text-rose-400 font-bold' : isDelay ? 'text-amber-400' : 'text-slate-500'
                          }`}>
                          {elapsedSec < 3 ? '● live' : `${elapsedSec}s lalu`}
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
                                  : 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,1)]'
                                }`}
                              title={`Port ${portName} (${isHealthy ? 'Aktif' : isDelay ? 'Delay' : 'Mati / Timeout'})`}
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
      {isManageModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-slate-800 bg-slate-950/80">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-gradient-to-br from-cyan-500/20 to-blue-500/20 text-cyan-400 rounded-2xl border border-cyan-500/30 shadow-lg shadow-cyan-500/10">
                  <Settings size={20} />
                </div>
                <div>
                  <h3 className="text-base font-black text-white tracking-wide">
                    Kelola Konfigurasi Modul Server Heartbeat
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Disimpan langsung ke file JSON di backend (<code>backend/src/data/heartbeat_modules_config.json</code>)
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsManageModalOpen(false)}
                className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body: Editable Module List */}
            <div className="p-6 overflow-y-auto flex flex-col gap-4 max-h-[calc(90vh-150px)]">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-300">
                  Daftar Modul ({editModulesList.length} Item)
                </span>
                <button
                  type="button"
                  onClick={() => {
                    const nextId = (editModulesList.reduce((max, m) => Math.max(max, m.id || 0), 500) + 1);
                    setEditModulesList((prev) => [
                      ...prev,
                      {
                        id: nextId,
                        name: `New Module ${nextId}`,
                        topic: `mod_server/${nextId}/data`,
                        defaultPort: 'ttyUSB0',
                        description: ''
                      }
                    ]);
                  }}
                  className="px-3.5 py-1.5 bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-300 font-bold text-xs rounded-xl border border-cyan-500/30 transition flex items-center gap-1.5 cursor-pointer shadow"
                >
                  <Plus size={14} />
                  <span>Tambah Modul Baru</span>
                </button>
              </div>

              <div className="flex flex-col gap-3">
                {editModulesList.map((m, idx) => (
                  <div
                    key={idx}
                    className="p-4 bg-slate-950/60 border border-slate-800 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center gap-3 justify-between"
                  >
                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 flex-1 w-full">
                      {/* ID Module Input */}
                      <div className="flex flex-col gap-1">
                        <label className="text-[10px] font-bold text-slate-400">ID Module</label>
                        <input
                          type="number"
                          value={m.id}
                          onChange={(e) => {
                            const val = Number(e.target.value);
                            const updated = [...editModulesList];
                            updated[idx].id = val;
                            if (updated[idx].topic.startsWith('mod_server/')) {
                              updated[idx].topic = `mod_server/${val}/data`;
                            }
                            setEditModulesList(updated);
                          }}
                          className="bg-slate-900 border border-slate-800 focus:border-cyan-400 rounded-xl px-3 py-2 text-xs text-cyan-300 font-mono font-bold outline-none shadow-inner"
                        />
                      </div>

                      {/* Name Input */}
                      <div className="flex flex-col gap-1 sm:col-span-1">
                        <label className="text-[10px] font-bold text-slate-400">Nama Modul</label>
                        <input
                          type="text"
                          value={m.name}
                          onChange={(e) => {
                            const updated = [...editModulesList];
                            updated[idx].name = e.target.value;
                            setEditModulesList(updated);
                          }}
                          className="bg-slate-900 border border-slate-800 focus:border-cyan-400 rounded-xl px-3 py-2 text-xs text-white font-bold outline-none shadow-inner"
                        />
                      </div>

                      {/* Topic Input */}
                      <div className="flex flex-col gap-1">
                        <label className="text-[10px] font-bold text-slate-400">Topik MQTT</label>
                        <input
                          type="text"
                          value={m.topic}
                          onChange={(e) => {
                            const updated = [...editModulesList];
                            updated[idx].topic = e.target.value;
                            setEditModulesList(updated);
                          }}
                          className="bg-slate-900 border border-slate-800 focus:border-cyan-400 rounded-xl px-3 py-2 text-xs text-indigo-300 font-mono outline-none shadow-inner"
                        />
                      </div>

                      {/* Port Input */}
                      <div className="flex flex-col gap-1">
                        <label className="text-[10px] font-bold text-slate-400">Port (e.g. ttyUSB0)</label>
                        <input
                          type="text"
                          value={m.defaultPort || ''}
                          placeholder="(opsional / null)"
                          onChange={(e) => {
                            const updated = [...editModulesList];
                            updated[idx].defaultPort = e.target.value.trim() || null;
                            setEditModulesList(updated);
                          }}
                          className="bg-slate-900 border border-slate-800 focus:border-cyan-400 rounded-xl px-3 py-2 text-xs text-emerald-300 font-mono outline-none shadow-inner placeholder:text-slate-600"
                        />
                      </div>
                    </div>

                    {/* Delete Module Button */}
                    <button
                      type="button"
                      onClick={() => {
                        if (editModulesList.length <= 1) {
                          alert('Minimal harus ada 1 modul.');
                          return;
                        }
                        setEditModulesList(editModulesList.filter((_, i) => i !== idx));
                      }}
                      className="p-2 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-xl transition cursor-pointer mt-2 sm:mt-4"
                      title="Hapus Modul"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-6 py-4 border-t border-slate-800 bg-slate-950/80">
              <button
                type="button"
                onClick={handleResetToDefaultConfig}
                disabled={isSavingConfig}
                className="px-4 py-2 text-xs font-bold text-slate-400 hover:text-amber-300 hover:bg-amber-500/10 rounded-xl border border-transparent hover:border-amber-500/30 transition cursor-pointer"
              >
                ↺ Reset ke 9 Modul Default
              </button>

              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsManageModalOpen(false)}
                  disabled={isSavingConfig}
                  className="px-4 py-2 text-xs font-bold text-slate-300 hover:bg-slate-800 rounded-xl border border-slate-700 transition cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleSaveModulesConfig}
                  disabled={isSavingConfig}
                  className="px-5 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-black text-xs rounded-xl shadow-lg shadow-cyan-500/20 transition flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {isSavingConfig ? (
                    <RefreshCw size={14} className="animate-spin" />
                  ) : (
                    <Save size={14} />
                  )}
                  <span>Simpan Konfigurasi (POST JSON)</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 6. STATUS GUIDE & LEGEND MODAL */}
      <PodHeartbeatLegendModal
        isOpen={isLegendModalOpen}
        onClose={() => setIsLegendModalOpen(false)}
      />
    </div>
  );
}
