import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Activity,
  Cpu,
  ShieldAlert,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  Search,
  RefreshCw,
  Sliders,
  Radio,
  ExternalLink,
  Volume2,
  VolumeX,
  Server,
  Filter,
  Clock,
  Layers,
  Sparkles,
  ArrowRight,
  HelpCircle
} from 'lucide-react';
import { fetchHeartbeatModulesApi, fetchHeartbeatThresholdsApi } from '../../api/podActivityApi';
import PodHeartbeatLegendModal, { InlineStatusLegendStrip } from './PodHeartbeatLegendModal';
import PodHeartbeatModuleConfigModal from './PodHeartbeatModuleConfigModal';
import PodTelegramAlertToggle from './PodTelegramAlertToggle';
import {
  DEFAULT_HB_THRESHOLDS,
  getStoredHbThresholds,
  setStoredHbThresholds,
  EVENT_HB_THRESHOLDS_UPDATED,
  evaluateModuleHealth
} from '../../utils/heartbeatThresholds';
import {
  getStoredHbModules,
  setStoredHbModules,
  EVENT_HB_MODULES_UPDATED
} from '../../utils/heartbeatModules';

// Helper to get clean, short concise names for table headers
const getModuleShortName = (mod) => {
  if (!mod) return '';
  if (mod.shortName) return mod.shortName;
  const name = String(mod.name || '');
  if (/manual/i.test(name)) return 'Manual C';
  if (/chair/i.test(name)) return 'Chair';
  if (/light/i.test(name)) return 'Lighting';
  if (/olfact|aroma/i.test(name)) return 'Olfactory';
  if (/door/i.test(name)) return 'Door';
  if (/aircon|ac\b/i.test(name)) return 'AC';
  if (/audio/i.test(name)) return 'Audio';
  if (/power/i.test(name)) return 'Power';
  if (/bio/i.test(name)) return 'Bio';
  return name.replace(/\s*Module\s*/i, '').trim() || `Mod ${mod.id}`;
};

// Helper to format large HB numbers
const formatHbCount = (hb) => {
  if (hb === null || hb === undefined) return '—';
  if (typeof hb === 'number' && hb >= 1000000) return (hb / 1000000).toFixed(1) + 'M';
  return String(hb);
};

// Web Audio API Alert Chime
function playFleetAlertChime() {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();
    if (ctx.state === 'suspended') ctx.resume();

    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gain = ctx.createGain();

    osc1.type = 'sawtooth';
    osc1.frequency.setValueAtTime(900, ctx.currentTime);
    osc1.frequency.exponentialRampToValueAtTime(450, ctx.currentTime + 0.3);

    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(600, ctx.currentTime);
    osc2.frequency.exponentialRampToValueAtTime(300, ctx.currentTime + 0.3);

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

export default function PodFleetHeartbeatMatrix({
  pods = [],
  mqttFeed = [],
  heartbeatSnapshot = {},
  onSelectPod,
  onPublish
}) {
  // Configured server modules (dynamically synchronized)
  const [serverModules, setServerModules] = useState(getStoredHbModules);
  const [isLoadingModules, setIsLoadingModules] = useState(false);

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [fleetFilter, setFleetFilter] = useState('ALL'); // 'ALL' | 'ISSUES_ONLY' | 'HEALTHY_ONLY'

  // Legend / Guide Modal State
  const [isLegendModalOpen, setIsLegendModalOpen] = useState(false);

  // Manage Modules Config Modal State
  const [isManageModalOpen, setIsManageModalOpen] = useState(false);

  // Audio Alarm state
  const [soundAlarmEnabled, setSoundAlarmEnabled] = useState(() => {
    return localStorage.getItem('vps_hb_sound_alert') !== 'false';
  });

  const toggleSoundAlarm = () => {
    setSoundAlarmEnabled((prev) => {
      const next = !prev;
      localStorage.setItem('vps_hb_sound_alert', String(next));
      if (next) playFleetAlertChime();
      return next;
    });
  };

  // Keep track of dead count for triggering alarm
  const prevDeadCountRef = useRef(0);

  // Real-time ticking timestamp (updated every 1s for relative time)
  const [nowTimestamp, setNowTimestamp] = useState(Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNowTimestamp(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Fleet Heartbeat State Registry: { [podId]: { [moduleId]: { hb, lastSeenAt, port, isFrozen, lastHbChangeAt, totalPackets } } }
  const [fleetModuleMap, setFleetModuleMap] = useState(() => {
    try {
      const cached = sessionStorage.getItem('vps_fleet_heartbeat_snapshot');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed && typeof parsed === 'object' && Object.keys(parsed).length > 0) {
          return parsed;
        }
      }
    } catch (_) { }
    return heartbeatSnapshot || {};
  });

  // Sync incoming instant snapshot from backend on connect / load
  useEffect(() => {
    if (heartbeatSnapshot && Object.keys(heartbeatSnapshot).length > 0) {
      setFleetModuleMap((prev) => {
        const merged = { ...prev };
        for (const [podId, podModules] of Object.entries(heartbeatSnapshot)) {
          merged[podId] = { ...(merged[podId] || {}) };
          for (const [modId, modData] of Object.entries(podModules || {})) {
            // Only update if not already more recently updated locally
            const existing = merged[podId][modId];
            if (!existing || (modData.lastSeenAt && modData.lastSeenAt >= (existing.lastSeenAt || 0))) {
              merged[podId][modId] = { ...existing, ...modData };
            }
          }
        }
        try {
          sessionStorage.setItem('vps_fleet_heartbeat_snapshot', JSON.stringify(merged));
        } catch (_) { }
        return merged;
      });
    }
  }, [heartbeatSnapshot]);

  // Flashing cells map: { [`${podId}_${moduleId}`]: boolean }
  const [flashingCells, setFlashingCells] = useState({});

  // Button action loading: { [`${podId}_${moduleId}`]: boolean }
  const [pingLoading, setPingLoading] = useState(false);
  const [feedbackToast, setFeedbackToast] = useState(null);

  // Load modules & thresholds config from backend JSON
  const [thresholds, setThresholds] = useState(getStoredHbThresholds);

  useEffect(() => {
    loadModulesConfig();
    loadThresholdsConfig();

    const handleModulesChanged = (e) => {
      if (e.detail && Array.isArray(e.detail) && e.detail.length > 0) {
        setServerModules(e.detail);
      }
    };

    const handleThresholdsChanged = (e) => {
      if (e.detail) setThresholds(e.detail);
    };

    window.addEventListener(EVENT_HB_MODULES_UPDATED, handleModulesChanged);
    window.addEventListener(EVENT_HB_THRESHOLDS_UPDATED, handleThresholdsChanged);

    return () => {
      window.removeEventListener(EVENT_HB_MODULES_UPDATED, handleModulesChanged);
      window.removeEventListener(EVENT_HB_THRESHOLDS_UPDATED, handleThresholdsChanged);
    };
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
        setStoredHbModules(data);
      }
    } catch (err) {
      console.warn('Gagal memuat modul:', err.message);
    } finally {
      setIsLoadingModules(false);
    }
  };

  // Ingest incoming MQTT feed across all pods
  useEffect(() => {
    if (!mqttFeed || mqttFeed.length === 0) return;

    const latest = mqttFeed[0];
    if (!latest || !latest.topic || !latest.serverId) return;

    const topicStr = String(latest.topic);
    const payloadStr = String(latest.payload ?? '').trim();
    const serverId = latest.serverId;

    let parsedJson = null;
    if (payloadStr.startsWith('{') || payloadStr.startsWith('[')) {
      try {
        parsedJson = JSON.parse(payloadStr);
      } catch (_) { }
    }

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
      const portVal = parsedJson?.port || null;
      const timestamp = latest.timestamp ? new Date(latest.timestamp).getTime() : Date.now();
      const cellKey = `${serverId}_${matchedModuleId}`;
      let didIncrement = false;

      setFleetModuleMap((prev) => {
        const podData = prev[serverId] || {};
        const modData = podData[matchedModuleId] || {
          hb: null,
          lastSeenAt: null,
          lastHbChangeAt: timestamp,
          isFrozen: false,
          port: null,
          totalPackets: 0
        };

        const currentHbNum = (modData.hb !== null && modData.hb !== undefined && !isNaN(Number(modData.hb))) ? Number(modData.hb) : null;
        const hasHbChanged = currentHbNum !== null && hbVal !== null && currentHbNum !== hbVal;
        if (hasHbChanged) {
          didIncrement = true;
        }
        const lastHbChangeAt = hasHbChanged ? timestamp : (modData.lastHbChangeAt || timestamp);
        const isFrozen = !hasHbChanged && (timestamp - lastHbChangeAt > 3000);

        return {
          ...prev,
          [serverId]: {
            ...podData,
            [matchedModuleId]: {
              hb: hbVal !== null ? hbVal : modData.hb,
              lastSeenAt: timestamp,
              lastHbChangeAt,
              isFrozen,
              port: portVal || modData.port,
              totalPackets: (modData.totalPackets || 0) + 1
            }
          }
        };

        try {
          sessionStorage.setItem('vps_fleet_heartbeat_snapshot', JSON.stringify(nextState));
        } catch (_) { }

        return nextState;
      });

      // Trigger cell flash ONLY if the HB counter actually incremented / changed
      if (didIncrement) {
        setFlashingCells((prev) => ({ ...prev, [cellKey]: true }));
        setTimeout(() => {
          setFlashingCells((prev) => ({ ...prev, [cellKey]: false }));
        }, 600);
      }
    }
  }, [mqttFeed]);

  // Compute fleet-wide health matrix & stats
  const fleetAnalysis = useMemo(() => {
    let totalMonitoredModules = 0;
    let totalHealthyModules = 0;
    let totalDelayedModules = 0;
    let totalDeadModules = 0;
    let totalFrozenModules = 0;
    let totalPacketsCount = 0;

    const podsHealthList = [];
    const deadModulesGlobalList = [];

    pods.forEach((pod) => {
      const isEntirePodOffline = Boolean(pod.brokerConnected === false);
      const podModulesData = fleetModuleMap[pod.id] || {};
      let podHealthyCount = 0;
      let podDeadCount = 0;
      let podDelayCount = 0;
      let podFrozenCount = 0;

      const moduleStatusMap = {};

      serverModules.forEach((mod) => {
        const modData = podModulesData[mod.id];
        const health = evaluateModuleHealth(modData, thresholds, nowTimestamp);
        const { status, reason, packetElapsedSec, hbElapsedSec, elapsedSec } = health;

        // Hanya hitung modul termonitor jika Pod dalam keadaan online
        if (!isEntirePodOffline) {
          totalMonitoredModules++;
        }

        if (status === 'DEAD') {
          podDeadCount++;
          // Pod offline TIDAK dimasukkan ke banner insiden dan alarm modular
          if (!isEntirePodOffline && reason !== 'Belum ada data') {
            totalDeadModules++;
            deadModulesGlobalList.push({
              pod,
              mod,
              elapsedSec,
              reason
            });
          }
        } else if (status === 'FROZEN') {
          podFrozenCount++;
          if (!isEntirePodOffline) {
            totalFrozenModules++;
            deadModulesGlobalList.push({
              pod,
              mod,
              elapsedSec,
              reason
            });
          }
        } else if (status === 'DELAY') {
          podDelayCount++;
          if (!isEntirePodOffline) {
            totalDelayedModules++;
          }
        } else {
          podHealthyCount++;
          if (!isEntirePodOffline) {
            totalHealthyModules++;
          }
        }

        moduleStatusMap[mod.id] = {
          data: modData,
          status,
          elapsedSec,
          packetElapsedSec,
          hbElapsedSec,
          reason
        };
      });

      // Pod offline tidak dihitung sebagai critical issue modul individual
      const hasCriticalIssue = !isEntirePodOffline && (
        Object.values(moduleStatusMap).some(m => (m.status === 'DEAD' && m.reason !== 'Belum ada data') || m.status === 'FROZEN')
      );
      const hasWarningIssue = !isEntirePodOffline && podDelayCount > 0;
      const is100PercentHealthy = !isEntirePodOffline && podHealthyCount === serverModules.length;

      podsHealthList.push({
        pod,
        isEntirePodOffline,
        moduleStatusMap,
        podHealthyCount,
        podDeadCount,
        podDelayCount,
        podFrozenCount,
        hasCriticalIssue,
        hasWarningIssue,
        is100PercentHealthy,
        totalModules: serverModules.length
      });
    });

    return {
      totalMonitoredModules,
      totalHealthyModules,
      totalDelayedModules,
      totalDeadModules,
      totalFrozenModules,
      totalPacketsCount,
      podsHealthList,
      deadModulesGlobalList,
      hasCriticalFleetIssue: deadModulesGlobalList.length > 0
    };
  }, [pods, serverModules, fleetModuleMap, nowTimestamp]);

  // Trigger sound alarm ONLY if new DEAD modules are detected anywhere across the fleet (Hanya status DEAD)
  useEffect(() => {
    const currentDeadCount = fleetAnalysis.totalDeadModules;
    if (currentDeadCount > prevDeadCountRef.current && soundAlarmEnabled) {
      playFleetAlertChime();
    }
    prevDeadCountRef.current = currentDeadCount;
  }, [fleetAnalysis.totalDeadModules, soundAlarmEnabled]);

  // Ping all dead modules across the entire fleet
  const handlePingAllDeadModules = () => {
    setPingLoading(true);
    let pingedCount = 0;

    fleetAnalysis.deadModulesGlobalList.forEach(({ pod, mod }) => {
      if (onPublish) {
        onPublish(`mod_server/${mod.id}/cmd`, JSON.stringify({ cmd: 'status', id: mod.id }));
        pingedCount++;
      }
    });

    setTimeout(() => {
      setPingLoading(false);
      setFeedbackToast(`Ping status dikirim ke ${pingedCount} modul bermasalah di seluruh Pod!`);
      setTimeout(() => setFeedbackToast(null), 3500);
    }, 500);
  };

  // Filtered Pod list for matrix display
  const filteredPodsHealthList = useMemo(() => {
    return fleetAnalysis.podsHealthList.filter(({ pod, isEntirePodOffline, hasCriticalIssue, is100PercentHealthy }) => {
      if (fleetFilter === 'ISSUES_ONLY' && !hasCriticalIssue) return false;
      if (fleetFilter === 'HEALTHY_ONLY' && !is100PercentHealthy) return false;
      if (fleetFilter === 'ONLINE_ONLY' && isEntirePodOffline) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchName = pod.name && pod.name.toLowerCase().includes(q);
        const matchHost = pod.host && pod.host.toLowerCase().includes(q);
        const matchCode = pod.code && String(pod.code).toLowerCase().includes(q);
        if (!matchName && !matchHost && !matchCode) return false;
      }

      return true;
    });
  }, [fleetAnalysis.podsHealthList, fleetFilter, searchQuery]);


  return (
    <div className="flex flex-col gap-6 w-full animate-in fade-in duration-200">
      {/* 1. CRITICAL INCIDENT BANNER (FLEET-WIDE) */}
      {fleetAnalysis.hasCriticalFleetIssue && (
        <div className="p-4 sm:p-5 2xl:p-6 min-[1920px]:p-7 bg-gradient-to-r from-rose-950/90 via-slate-900/95 to-rose-950/90 border border-rose-500/60 rounded-2xl 2xl:rounded-3xl backdrop-blur-md shadow-xl shadow-rose-500/15 flex flex-col lg:flex-row lg:items-center justify-between gap-4 2xl:gap-6 ring-1 ring-rose-500/30 animate-in fade-in duration-200 w-full">
          <div className="flex items-center gap-3.5 2xl:gap-4 shrink-0">
            <div className="p-2.5 2xl:p-3.5 min-[1920px]:p-4 bg-rose-500/25 border border-rose-500/40 text-rose-400 rounded-xl 2xl:rounded-2xl shrink-0 animate-pulse">
              <ShieldAlert className="w-5 h-5 2xl:w-7 2xl:h-7 min-[1920px]:w-8 min-[1920px]:h-8" />
            </div>
            <div>
              <h3 className="text-xs sm:text-sm md:text-base 2xl:text-lg min-[1920px]:text-xl font-black text-rose-300 uppercase tracking-wider flex items-center gap-2 2xl:gap-3">
                <span className="w-2 h-2 2xl:w-3 2xl:h-3 min-[1920px]:w-3.5 min-[1920px]:h-3.5 rounded-full bg-rose-400 animate-ping shrink-0" />
                PERINGATAN DINI: {fleetAnalysis.deadModulesGlobalList.length} MODUL MATI PADA FLEET
              </h3>
              <p className="text-[11px] sm:text-xs md:text-sm 2xl:text-base text-rose-200/80 font-medium hidden sm:block mt-0.5 2xl:mt-1">
                Kehilangan detak heartbeat (&gt;12s). Periksa koneksi kabel USB & daya hardware unit:
              </p>
            </div>
          </div>

          {/* Badges of Dead Modules with Pod Names (Expansive & Flexible on Large/TV screens) */}
          <div className="flex-1 min-w-0 flex items-center gap-2 2xl:gap-3 overflow-x-auto 2xl:flex-wrap py-1.5 scrollbar-thin scrollbar-thumb-rose-500/30 scrollbar-track-transparent pr-1">
            {fleetAnalysis.deadModulesGlobalList.map(({ pod, mod, elapsedSec, reason }, idx) => (
              <span
                key={idx}
                onClick={() => onSelectPod && onSelectPod(pod)}
                className="inline-flex items-center gap-1.5 2xl:gap-2 px-3 py-1.5 2xl:px-4 2xl:py-2.5 rounded-lg 2xl:rounded-xl text-xs 2xl:text-sm min-[1920px]:text-base font-mono font-bold bg-rose-500/20 text-rose-200 border border-rose-500/50 hover:bg-rose-500/35 cursor-pointer shadow-sm transition shrink-0 whitespace-nowrap select-none"
                title={`Klik untuk buka detail ${pod.name}`}
              >
                <AlertCircle className="w-3.5 h-3.5 2xl:w-4 2xl:h-4 text-rose-400 shrink-0" />
                <span>{pod.name} → {mod.name} (ID: {mod.id})</span>
                <span className="text-rose-300 font-normal tabular-nums">[{reason}]</span>
              </span>
            ))}
          </div>

          <div className="flex items-center gap-2 shrink-0 self-end lg:self-center">
            <button
              onClick={handlePingAllDeadModules}
              disabled={pingLoading}
              className="px-4 py-2.5 2xl:px-6 2xl:py-3.5 bg-rose-600 hover:bg-rose-500 active:scale-95 text-white font-black text-xs sm:text-sm 2xl:text-base rounded-xl 2xl:rounded-2xl shadow-lg transition flex items-center gap-2 2xl:gap-2.5 cursor-pointer disabled:opacity-50 whitespace-nowrap"
            >
              <RefreshCw className={`w-3.5 h-3.5 2xl:w-5 2xl:h-5 ${pingLoading ? 'animate-spin' : ''}`} />
              <span>Ping Semua Modul Mati</span>
            </button>
          </div>
        </div>
      )}

      {/* 2. FLEET KPI METRIC CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Pod Units */}
        <div className="bg-slate-900/80 backdrop-blur-md border border-slate-800 p-5 rounded-2xl shadow-xl flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Pod Unit</span>
            <div className="text-2xl font-black text-white mt-1 font-mono">{pods.length} Unit</div>
            <span className="text-[11px] text-slate-500 font-medium">Terdaftar dalam jaringan</span>
          </div>
          <div className="p-3 bg-gradient-to-br from-cyan-500/20 to-blue-500/20 text-cyan-400 rounded-2xl border border-cyan-500/30 shadow-lg shadow-cyan-500/10">
            <Server size={24} />
          </div>
        </div>

        {/* Total Active Modules */}
        <div className="bg-slate-900/80 backdrop-blur-md border border-slate-800 p-5 rounded-2xl shadow-xl flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Modul Berdetak Sehat</span>
            <div className="text-2xl font-black text-emerald-400 mt-1 font-mono">
              {fleetAnalysis.totalHealthyModules} / {fleetAnalysis.totalMonitoredModules}
            </div>
            <span className="text-[11px] text-emerald-400/80 font-medium">
              {fleetAnalysis.totalMonitoredModules > 0
                ? `${Math.round((fleetAnalysis.totalHealthyModules / fleetAnalysis.totalMonitoredModules) * 100)}% Fleet Health`
                : '0%'}
            </span>
          </div>
          <div className="p-3 bg-emerald-500/20 text-emerald-400 rounded-2xl border border-emerald-500/30 shadow-lg shadow-emerald-500/10">
            <CheckCircle2 size={24} />
          </div>
        </div>

        {/* Problematic Pods Count */}
        <div className="bg-slate-900/80 backdrop-blur-md border border-slate-800 p-5 rounded-2xl shadow-xl flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Modul Mati / Timeout</span>
            <div className={`text-2xl font-black mt-1 font-mono ${fleetAnalysis.totalDeadModules > 0 ? 'text-rose-400 animate-pulse' : 'text-slate-300'}`}>
              {fleetAnalysis.totalDeadModules} Modul
            </div>
            <span className={`text-[11px] font-medium ${fleetAnalysis.totalDeadModules > 0 ? 'text-rose-400 font-bold' : 'text-slate-500'}`}>
              {fleetAnalysis.totalDeadModules > 0 ? '⚠️ Butuh perbaikan' : 'Semua hardware aktif'}
            </span>
          </div>
          <div className={`p-3 rounded-2xl border shadow-lg ${fleetAnalysis.totalDeadModules > 0
            ? 'bg-rose-500/20 text-rose-400 border-rose-500/40 shadow-rose-500/20 animate-pulse'
            : 'bg-slate-800 text-slate-400 border-slate-700'
            }`}>
            <AlertTriangle size={24} />
          </div>
        </div>

        {/* Total Ingested MQTT Packets */}
        <div className="bg-slate-900/80 backdrop-blur-md border border-slate-800 p-5 rounded-2xl shadow-xl flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Paket Diterima</span>
            <div className="text-2xl font-black text-cyan-300 mt-1 font-mono">
              {mqttFeed.length} Paket
            </div>
            <span className="text-[11px] text-cyan-400/80 font-medium">Real-time throughput feed</span>
          </div>
          <div className="p-3 bg-gradient-to-br from-indigo-500/20 to-purple-500/20 text-indigo-400 rounded-2xl border border-indigo-500/30 shadow-lg shadow-indigo-500/10">
            <Radio size={24} className="animate-pulse" />
          </div>
        </div>
      </div>

      {/* 3. TOOLBAR: SEARCH, HEALTH FILTER PILLS, ALARM TOGGLE */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-slate-900/80 p-4 rounded-2xl border border-slate-800 backdrop-blur-md shadow-xl">
        {/* Left: Search Box */}
        <div className="relative w-full sm:w-80 md:w-96">
          <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari nama Pod, IP LAN, kode..."
            className="w-full pl-9 pr-4 py-2 bg-slate-950/90 border border-slate-800 focus:border-cyan-400 rounded-xl text-white text-xs outline-none transition-all placeholder:text-slate-500 shadow-inner"
          />
        </div>

        {/* Center & Right: Filter Pills & Sound Alarm Button */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <div className="flex items-center gap-1 bg-slate-950/90 p-1 rounded-xl border border-slate-800 shadow-inner">
            <button
              onClick={() => setFleetFilter('ALL')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${fleetFilter === 'ALL'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
                }`}
            >
              Semua Pod ({pods.length})
            </button>
            <button
              onClick={() => setFleetFilter('ONLINE_ONLY')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${fleetFilter === 'ONLINE_ONLY'
                ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
                }`}
            >
              Pod Online ({fleetAnalysis.podsHealthList.filter((p) => !p.isEntirePodOffline).length})
            </button>
            <button
              onClick={() => setFleetFilter('ISSUES_ONLY')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${fleetFilter === 'ISSUES_ONLY'
                ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
                }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-pulse" />
              <span>Ada Modul Mati ({fleetAnalysis.podsHealthList.filter((p) => p.hasCriticalIssue).length})</span>
            </button>
            <button
              onClick={() => setFleetFilter('HEALTHY_ONLY')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${fleetFilter === 'HEALTHY_ONLY'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
                }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              <span>100% Sehat ({fleetAnalysis.podsHealthList.filter((p) => p.is100PercentHealthy).length})</span>
            </button>
          </div>

          {/* Manage Modules Button */}
          <button
            onClick={() => setIsManageModalOpen(true)}
            className="p-2.5 bg-slate-800/80 hover:bg-slate-700 text-cyan-300 hover:text-white rounded-xl border border-slate-700/60 transition-all flex items-center gap-1.5 text-xs font-bold cursor-pointer shadow"
            title="Kelola Daftar Modul (Edit / Tambah / Hapus file JSON)"
          >
            <Sliders size={14} className="text-cyan-400" />
            <span>Kelola Modul (JSON)</span>
          </button>

          {/* Legend / Guide Button */}
          <button
            onClick={() => setIsLegendModalOpen(true)}
            className="p-2.5 bg-slate-800/80 hover:bg-slate-700 text-cyan-300 hover:text-white rounded-xl border border-slate-700/60 transition-all flex items-center gap-1.5 text-xs font-bold cursor-pointer shadow"
            title="Buka Panduan Arti Warna & Keterangan Status Modul"
          >
            <HelpCircle size={14} className="text-cyan-400" />
            <span>Panduan Status</span>
          </button>

          {/* Sound Alarm Toggle */}
          <button
            onClick={toggleSoundAlarm}
            className={`p-2.5 rounded-xl border transition-all flex items-center gap-1.5 text-xs font-bold cursor-pointer ${soundAlarmEnabled
              ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/25'
              : 'bg-slate-800/80 text-slate-400 border-slate-700/60 hover:text-slate-200'
              }`}
            title={soundAlarmEnabled ? 'Alarm Suara Aktif (Klik untuk Mute)' : 'Alarm Suara Mati (Klik untuk Aktifkan)'}
          >
            {soundAlarmEnabled ? <Volume2 size={14} className="text-emerald-400 animate-pulse" /> : <VolumeX size={14} />}
            <span className="hidden sm:inline">{soundAlarmEnabled ? 'Alarm ON' : 'Alarm OFF'}</span>
          </button>

          {/* Telegram DEAD Alert Toggle */}
          <PodTelegramAlertToggle />
        </div>
      </div>

      {/* Quick Inline Color Legend Strip */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <InlineStatusLegendStrip
          onOpenFullGuide={() => setIsLegendModalOpen(true)}
          thresholds={thresholds}
        />
      </div>

      {/* Toast Notification */}
      {feedbackToast && (
        <div className="p-3.5 bg-emerald-500/90 text-white text-xs font-bold rounded-xl shadow-xl flex items-center gap-2 animate-in fade-in duration-150 backdrop-blur-md">
          <CheckCircle2 size={16} />
          <span>{feedbackToast}</span>
        </div>
      )}

      {/* 4. FLEET-WIDE CROSS-TABULAR MATRIX TABLE (PODS × MODULES) */}
      <div className="bg-slate-900/80 backdrop-blur-md border border-slate-800/90 rounded-2xl shadow-xl overflow-hidden w-full">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[840px] lg:min-w-full">
            {/* Table Header: Pod Column + 9 Module Columns */}
            <thead>
              <tr className="bg-slate-950/95 border-b border-slate-800/90 text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                {/* Sticky Left Pod Column Header */}
                <th className="py-3.5 px-3.5 sticky left-0 z-20 bg-slate-950/95 border-r border-slate-800/90 min-w-[145px] max-w-[165px] shadow-md">
                  <div className="flex items-center gap-1.5">
                    <Server size={13} className="text-cyan-400" />
                    <span className="tracking-wide">Unit Pod</span>
                  </div>
                </th>

                {/* Dynamic Server Module Columns */}
                {serverModules.map((mod) => (
                  <th key={mod.id} className="py-3 px-1.5 text-center border-r border-slate-800/80 min-w-[70px] sm:min-w-[78px]">
                    <div className="flex flex-col items-center leading-tight">
                      <span className="text-cyan-400 font-extrabold text-[10.5px] tracking-wide" title={mod.name}>
                        {getModuleShortName(mod)}
                      </span>
                      <span className="text-[9px] font-mono text-slate-500 bg-slate-950/60 px-1.5 py-0.5 rounded border border-slate-800/80 mt-0.5">
                        #{mod.id}
                      </span>
                    </div>
                  </th>
                ))}

                {/* Overall Health Column */}
                <th className="py-3.5 px-2 text-center min-w-[88px] max-w-[105px]">
                  <span className="tracking-wide">Status Health</span>
                </th>
              </tr>
            </thead>

            {/* Table Body: 1 Row per Pod */}
            <tbody className="divide-y divide-slate-800/60 text-xs">
              {filteredPodsHealthList.length === 0 ? (
                <tr>
                  <td colSpan={serverModules.length + 2} className="py-12 text-center text-slate-500 font-medium text-xs">
                    Tidak ada unit Pod yang cocok dengan pencarian atau filter ini.
                  </td>
                </tr>
              ) : (
                filteredPodsHealthList.map(({ pod, moduleStatusMap, podHealthyCount, podDeadCount, podDelayCount, podFrozenCount, hasCriticalIssue, hasWarningIssue, is100PercentHealthy, totalModules }) => {
                  const isEntirePodOffline = !pod.brokerConnected;

                  return (
                    <tr
                      key={pod.id}
                      className={`transition-colors duration-200 ${isEntirePodOffline
                        ? 'bg-slate-950/40 opacity-70'
                        : hasCriticalIssue
                          ? 'bg-rose-950/10'
                          : ''
                        }`}
                    >
                      {/* Sticky Left Column: Pod Identity & Jump to Detail */}
                      <td
                        onClick={() => onSelectPod && onSelectPod(pod)}
                        className={`py-3.5 px-3.5 sticky left-0 z-10 border-r border-slate-800/90 transition-colors shadow-md min-w-[145px] max-w-[165px] cursor-pointer ${isEntirePodOffline ? 'bg-slate-950/95' : 'bg-slate-900/95'
                          }`}
                        title="Klik untuk membuka Halaman Detail Pod"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="min-w-0 flex-1 flex items-center gap-2 truncate">
                            <span className="relative flex h-2 w-2 shrink-0">
                              {is100PercentHealthy && (
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60" />
                              )}
                              {hasCriticalIssue && (
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
                              )}
                              <span
                                className={`relative inline-flex rounded-full h-2 w-2 ${is100PercentHealthy
                                  ? 'bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,1)]'
                                  : isEntirePodOffline
                                    ? 'bg-slate-600'
                                    : hasCriticalIssue
                                      ? 'bg-rose-500 shadow-[0_0_6px_rgba(244,63,94,1)]'
                                      : 'bg-amber-400 shadow-[0_0_6px_rgba(251,191,36,0.8)]'
                                  }`}
                              />
                            </span>

                            <span
                              className={`font-black text-xs transition-colors truncate ${isEntirePodOffline
                                ? 'text-slate-400'
                                : is100PercentHealthy
                                  ? 'text-cyan-400 hover:text-cyan-300'
                                  : 'text-slate-200 hover:text-white'
                                }`}
                              title={pod.name}
                            >
                              {pod.name}
                            </span>

                            <span className="text-[9px] font-mono text-slate-400 bg-slate-950/60 px-1.5 py-0.5 rounded-lg border border-slate-800 shrink-0">
                              #{pod.code}
                            </span>
                          </div>

                          {/* Quick Jump to Detail Button */}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (onSelectPod) onSelectPod(pod);
                            }}
                            className="p-1.5 bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg border border-slate-700/60 transition cursor-pointer shadow-sm shrink-0"
                            title="Buka Detail Pod"
                          >
                            <ExternalLink size={11} />
                          </button>
                        </div>
                      </td>

                      {/* Dynamic Module Cells in Matrix */}
                      {serverModules.map((mod) => {
                        const modStatus = moduleStatusMap[mod.id] || { status: 'DEAD', reason: 'No Data' };
                        const data = modStatus.data || {};
                        const cellKey = `${pod.id}_${mod.id}`;
                        const isFlashing = Boolean(flashingCells[cellKey]);

                        const isLive = modStatus.status === 'LIVE';
                        const isDelay = modStatus.status === 'DELAY';
                        const isDead = modStatus.status === 'DEAD';
                        const isFrozen = modStatus.status === 'FROZEN';

                        return (
                          <td
                            key={mod.id}
                            className={`py-2.5 px-1.5 text-center border-r border-slate-800/60 transition-colors duration-200 ${isFlashing ? 'bg-cyan-500/10' : ''
                              }`}
                          >
                            <div
                              title={`${pod.name} • ${mod.name} (#${mod.id})\nTopik: ${mod.topic}\nPort: ${data.port || mod.defaultPort || 'N/A'}\nHeartbeat: ${data.hb ?? 'N/A'}\nStatus: ${modStatus.status}${modStatus.elapsedSec !== null ? ` (${modStatus.elapsedSec}s lalu)` : ''}`}
                              className={`py-2 px-1.5 rounded-xl border flex flex-col items-center justify-center gap-1 transition-all duration-300 relative overflow-hidden select-none shadow-sm min-h-[48px] ${isFlashing
                                ? 'border-cyan-400/70 shadow-[0_0_18px_rgba(6,182,212,0.20)] scale-[1.01] bg-slate-900/90'
                                : isLive
                                  ? 'bg-slate-900/85 border-slate-800/90 hover:border-slate-700/60'
                                  : isDelay
                                    ? 'border-amber-500/30 bg-gradient-to-b from-amber-950/20 via-slate-900/85 to-slate-900/90 shadow-[0_0_12px_rgba(245,158,11,0.08)]'
                                    : isFrozen
                                      ? 'border-purple-500/40 bg-gradient-to-b from-purple-950/20 via-slate-900/85 to-slate-900/90 shadow-[0_0_15px_rgba(192,132,252,0.12)]'
                                      : isEntirePodOffline
                                        ? 'bg-slate-950/50 border-slate-800/40 text-slate-500'
                                        : 'border-rose-500/40 bg-gradient-to-b from-rose-950/20 via-slate-900/85 to-slate-900/90 shadow-[0_0_15px_rgba(244,63,94,0.12)]'
                                }`}
                            >
                              {/* Discreet Ambient Corner Light Orb */}
                              <div
                                className={`absolute -top-4 -right-4 w-12 h-12 rounded-full blur-xl pointer-events-none transition-opacity duration-700 ease-out ${isFlashing
                                  ? 'bg-cyan-400/25 scale-110 opacity-100'
                                  : isDead && !isEntirePodOffline
                                    ? 'bg-rose-500/20 opacity-70 animate-pulse'
                                    : isFrozen
                                      ? 'bg-purple-500/20 opacity-70 animate-pulse'
                                      : isDelay
                                        ? 'bg-amber-500/15 opacity-50'
                                        : isLive
                                          ? 'bg-emerald-500/10 opacity-25'
                                          : 'opacity-0'
                                  }`}
                              />

                              {/* Flash Bloom Overlay on Packet Receive */}
                              <div
                                className={`absolute inset-0 bg-gradient-to-r from-transparent via-cyan-400/5 to-transparent pointer-events-none transition-opacity duration-500 ease-out ${isFlashing ? 'opacity-100' : 'opacity-0'
                                  }`}
                              />

                              {/* Row 1: Indicator Dot & HB Counter */}
                              <div className="flex items-center gap-1.5 relative z-10">
                                <span className="relative flex h-2 w-2 shrink-0">
                                  {isLive && (
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60" />
                                  )}
                                  {isDead && !isEntirePodOffline && (
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
                                  )}
                                  <span
                                    className={`relative inline-flex rounded-full h-2 w-2 transition-all ${isLive
                                      ? 'bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,1)]'
                                      : isDelay
                                        ? 'bg-amber-400 shadow-[0_0_6px_rgba(251,191,36,0.8)]'
                                        : isFrozen
                                          ? 'bg-purple-400 shadow-[0_0_6px_rgba(192,132,252,0.8)]'
                                          : isEntirePodOffline
                                            ? 'bg-slate-600'
                                            : 'bg-rose-500 shadow-[0_0_6px_rgba(244,63,94,1)]'
                                      }`}
                                  />
                                </span>

                                <span
                                  className={`font-mono font-black text-xs tracking-tight transition-colors ${isFlashing
                                    ? 'text-cyan-300 drop-shadow-[0_0_6px_rgba(6,182,212,0.8)]'
                                    : isDead && !isEntirePodOffline
                                      ? 'text-rose-400'
                                      : isDelay
                                        ? 'text-amber-300'
                                        : isFrozen
                                          ? 'text-purple-300'
                                          : isEntirePodOffline
                                            ? 'text-slate-500'
                                            : data.hb !== null
                                              ? 'text-white'
                                              : 'text-slate-500'
                                    }`}
                                >
                                  {formatHbCount(data.hb)}
                                </span>
                              </div>

                              {/* Row 2: Status Tag / Elapsed Time */}
                              <span
                                className={`text-[9px] font-mono leading-none relative z-10 ${isLive
                                  ? 'text-slate-400 font-medium'
                                  : isDelay
                                    ? 'text-amber-300 font-bold'
                                    : isFrozen
                                      ? 'text-purple-300 font-black'
                                      : isEntirePodOffline
                                        ? 'text-slate-500'
                                        : 'text-rose-400 font-bold'
                                  }`}
                              >
                                {isLive
                                  ? (modStatus.elapsedSec < 3 ? '● live' : `${modStatus.elapsedSec}s lalu`)
                                  : isDelay
                                    ? `DELAY (${Math.max(modStatus.elapsedSec || 0, modStatus.hbElapsedSec || 0)}s)`
                                    : isFrozen
                                      ? `FROZEN (${modStatus.hbElapsedSec}s)`
                                      : isEntirePodOffline
                                        ? 'offline'
                                        : (modStatus.elapsedSec ? `DEAD (${modStatus.elapsedSec}s)` : 'DEAD')}
                              </span>
                            </div>
                          </td>
                        );
                      })}

                      {/* Right Health Pill Column (Matching Detail Tab Badges) */}
                      <td className="py-3.5 px-2 text-center min-w-[88px] max-w-[105px]">
                        <div className="flex flex-col items-center gap-0.5">
                          {is100PercentHealthy ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[9.5px] font-bold uppercase bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 shadow-[0_0_10px_rgba(52,211,153,0.15)]">
                              <span className="relative flex h-1.5 w-1.5">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60" />
                                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-400 shadow-[0_0_4px_rgba(52,211,153,1)]" />
                              </span>
                              <span>{podHealthyCount}/{totalModules} LIVE</span>
                            </span>
                          ) : isEntirePodOffline ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-mono font-medium bg-slate-800/50 text-slate-400 border border-slate-700/50">
                              <span className="w-1.5 h-1.5 rounded-full bg-slate-600" />
                              <span>OFFLINE</span>
                            </span>
                          ) : hasCriticalIssue ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[9.5px] font-black uppercase bg-rose-500/20 text-rose-300 border border-rose-500/40 shadow-[0_0_10px_rgba(244,63,94,0.2)] animate-pulse">
                              <span className="relative flex h-1.5 w-1.5">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
                                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-rose-500" />
                              </span>
                              <span>{podDeadCount + podFrozenCount} MASALAH</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[9.5px] font-bold uppercase bg-amber-500/20 text-amber-300 border border-amber-500/40">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                              <span>{podDelayCount} DELAY</span>
                            </span>
                          )}

                          <span className="text-[8.5px] font-mono text-slate-500 mt-0.5">
                            {is100PercentHealthy
                              ? 'Normal'
                              : isEntirePodOffline
                                ? 'Pod Mati'
                                : `${podHealthyCount}/${totalModules} Aktif`}
                          </span>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 5. STATUS GUIDE & THRESHOLDS CONFIG MODAL */}
      <PodHeartbeatLegendModal
        isOpen={isLegendModalOpen}
        onClose={() => setIsLegendModalOpen(false)}
        thresholds={thresholds}
        onThresholdsUpdated={(updated) => {
          setThresholds(updated);
          setFeedbackToast('Ambang batas status berhasil diperbarui dari JSON backend!');
          setTimeout(() => setFeedbackToast(null), 3500);
        }}
      />

      {/* 6. MANAGE HEARTBEAT MODULES CONFIG MODAL (JSON EDITOR) */}
      <PodHeartbeatModuleConfigModal
        isOpen={isManageModalOpen}
        onClose={() => setIsManageModalOpen(false)}
        currentModules={serverModules}
        onSaveSuccess={(updated) => {
          setServerModules(updated);
          setFeedbackToast('Konfigurasi modul berhasil diperbarui dari JSON backend!');
          setTimeout(() => setFeedbackToast(null), 3500);
        }}
      />
    </div>
  );
}
