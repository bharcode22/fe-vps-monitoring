import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  fetchHeartbeatModulesApi,
  saveHeartbeatModulesApi,
  resetHeartbeatModulesApi,
  fetchHeartbeatThresholdsApi,
  fetchPodStorageFilesApi
} from '../../api/podActivityApi';
import PodHeartbeatIncidentBanner from './PodHeartbeatIncidentBanner';
import PodHeartbeatToolbar from './PodHeartbeatToolbar';
import PodHeartbeatStorageSummary from './PodHeartbeatStorageSummary';
import PodHeartbeatModuleCard from './PodHeartbeatModuleCard';
import PodHeartbeatLegendModal from './PodHeartbeatLegendModal';
import PodHeartbeatModuleConfigModal from './PodHeartbeatModuleConfigModal';
import PodIncidentHistoryModal from './PodIncidentHistoryModal';
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

// Helper to initialize module data map with instant snapshot / cache fallback
function buildInitialModuleDataMap(podId, heartbeatSnapshot = {}) {
  const initial = {};

  // 1. Try to read snapshot from props or sessionStorage
  let snapshotPodData = heartbeatSnapshot?.[podId] || null;
  if (!snapshotPodData) {
    try {
      const fleetCache = sessionStorage.getItem('vps_fleet_heartbeat_snapshot');
      if (fleetCache) {
        const parsed = JSON.parse(fleetCache);
        if (parsed?.[podId]) {
          snapshotPodData = parsed[podId];
        }
      }
    } catch (_) { }
  }

  // Also check local pod cache
  let podLocalCache = null;
  try {
    const podCacheStr = sessionStorage.getItem(`vps_pod_hb_${podId}`);
    if (podCacheStr) {
      podLocalCache = JSON.parse(podCacheStr);
    }
  } catch (_) { }

  DEFAULT_SERVER_MODULES.forEach((mod) => {
    const snapMod = snapshotPodData?.[mod.id] || snapshotPodData?.[String(mod.id)];
    const localMod = podLocalCache?.[mod.id] || podLocalCache?.[String(mod.id)];
    const source = snapMod || localMod || {};

    const hbVal = source.hb !== undefined && source.hb !== null ? Number(source.hb) : null;
    const lastSeenAt = source.lastSeenAt || null;
    const isFrozen = Boolean(source.isFrozen);

    initial[mod.id] = {
      id: mod.id,
      name: mod.name,
      topic: mod.topic,
      hb: hbVal,
      version: source.version || 'v2.1',
      date: lastSeenAt ? new Date(lastSeenAt).toLocaleTimeString('id-ID', { hour12: false }) : null,
      port: source.port || mod.defaultPort,
      lastSeenAt,
      previousHb: source.previousHb || null,
      lastHbChangeAt: source.lastHbChangeAt || lastSeenAt,
      isFrozen,
      rawPayload: source.rawPayload || null,
      isOnline: Boolean(source.isOnline || lastSeenAt),
      totalPackets: source.totalPackets || (hbVal !== null ? 1 : 0),
      history: Array.isArray(source.history) ? source.history : (hbVal !== null ? [hbVal] : [])
    };
  });

  return initial;
}

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
    osc1.frequency.setValueAtTime(880, ctx.currentTime);
    osc1.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.3);

    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(587.33, ctx.currentTime);
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
  heartbeatSnapshot = {},
  mqttStatus = { connected: false },
  thresholds: propThresholds,
  onThresholdsUpdated,
  onPublish,
  onNavigateView = null
}) {
  // Modules list initialized immediately from defaults without blocking
  const [serverModules, setServerModules] = useState(DEFAULT_SERVER_MODULES);

  // Sound alert toggle (persisted in localStorage)
  const [soundAlertEnabled, setSoundAlertEnabled] = useState(() => {
    return localStorage.getItem('vps_hb_sound_alert') !== 'false';
  });

  const toggleSoundAlert = () => {
    setSoundAlertEnabled((prev) => {
      const next = !prev;
      localStorage.setItem('vps_hb_sound_alert', String(next));
      if (next) playAlertChime();
      return next;
    });
  };

  // Modals State
  const [isManageModalOpen, setIsManageModalOpen] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [isLegendModalOpen, setIsLegendModalOpen] = useState(false);

  // Physical Storage Files State (backend/src/data/pod_storage)
  const [storageFilesInfo, setStorageFilesInfo] = useState(null);
  const [isStorageFilesExpanded, setIsStorageFilesExpanded] = useState(false);

  useEffect(() => {
    if (!pod?.id) return;
    fetchPodStorageFilesApi(pod.id)
      .then((res) => {
        if (res && res.success) {
          setStorageFilesInfo(res);
        }
      })
      .catch(() => { });
  }, [pod?.id]);

  // Collapsed state map for module cards
  const [collapsedMap, setCollapsedMap] = useState({});

  // Search & Filter query
  const [searchQuery, setSearchQuery] = useState('');
  const [healthFilter, setHealthFilter] = useState('ALL'); // 'ALL' | 'CRITICAL' | 'WARNING' | 'HEALTHY'

  // Toast / feedback message
  const [actionFeedback, setActionFeedback] = useState(null);

  // Button loading states: { [moduleId_action]: boolean }
  const [buttonLoadingMap, setButtonLoadingMap] = useState({});

  // Flashing animation state for cards on data tick
  const [flashingCards, setFlashingCards] = useState({});

  // Keep track of dead modules count for alarm sound
  const previousDeadCountRef = useRef(0);

  // Local state to store latest parsed heartbeat and history for each module ID (instantly hydrated)
  const [moduleDataMap, setModuleDataMap] = useState(() => {
    return buildInitialModuleDataMap(pod?.id, heartbeatSnapshot);
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

  // Sync incoming instant snapshot from props if available
  useEffect(() => {
    if (!pod?.id || !heartbeatSnapshot) return;
    const podSnap = heartbeatSnapshot[pod.id] || heartbeatSnapshot[String(pod.id)];
    if (!podSnap || typeof podSnap !== 'object' || Object.keys(podSnap).length === 0) return;

    setModuleDataMap((prev) => {
      const updated = { ...prev };
      let changed = false;

      for (const [modIdStr, snapMod] of Object.entries(podSnap)) {
        const modId = Number(modIdStr);
        const existing = updated[modId] || {};
        const snapHb = snapMod.hb !== undefined && snapMod.hb !== null ? Number(snapMod.hb) : null;

        // If snapshot is newer or existing has no data
        if (snapMod.lastSeenAt && (!existing.lastSeenAt || snapMod.lastSeenAt >= existing.lastSeenAt)) {
          changed = true;
          updated[modId] = {
            ...existing,
            id: modId,
            name: snapMod.name || existing.name || `Module ${modId}`,
            topic: snapMod.topic || existing.topic || `mod_server/${modId}/data`,
            hb: snapHb !== null ? snapHb : existing.hb,
            port: snapMod.port || existing.port,
            lastSeenAt: snapMod.lastSeenAt,
            lastHbChangeAt: snapMod.lastHbChangeAt || snapMod.lastSeenAt,
            isFrozen: Boolean(snapMod.isFrozen),
            totalPackets: Math.max(existing.totalPackets || 0, snapMod.totalPackets || 0),
            date: snapMod.lastSeenAt
              ? new Date(snapMod.lastSeenAt).toLocaleTimeString('id-ID', { hour12: false })
              : existing.date,
            isOnline: true
          };
        }
      }

      if (changed) {
        try {
          sessionStorage.setItem(`vps_pod_hb_${pod.id}`, JSON.stringify(updated));
        } catch (_) { }
        return updated;
      }
      return prev;
    });
  }, [pod?.id, heartbeatSnapshot]);

  // Load modules & thresholds from backend in background
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
      console.warn('Gagal memuat ambang batas heartbeat:', err.message);
    }
  };

  const loadModulesConfig = async () => {
    try {
      const data = await fetchHeartbeatModulesApi();
      if (Array.isArray(data) && data.length > 0) {
        setServerModules(data);

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
      console.warn('Gagal memuat modul:', err.message);
    }
  };

  // Real-time ticking timestamp updated every 1s
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
      const rawHb =
        parsedJson?.hb !== undefined
          ? parsedJson.hb
          : !isNaN(Number(payloadStr))
            ? Number(payloadStr)
            : null;
      const hbVal = rawHb !== null && rawHb !== undefined && !isNaN(Number(rawHb)) ? Number(rawHb) : null;
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

        const currentHbNum =
          currentMod.hb !== null && currentMod.hb !== undefined && !isNaN(Number(currentMod.hb))
            ? Number(currentMod.hb)
            : null;
        const hasHbChanged = currentHbNum !== null && hbVal !== null && currentHbNum !== hbVal;
        if (hasHbChanged) {
          didIncrement = true;
        }
        const lastHbChangeAt = hasHbChanged ? nowTime : currentMod.lastHbChangeAt || nowTime;
        const isFrozen = !hasHbChanged && nowTime - lastHbChangeAt > 3000;

        const newHistory =
          hbVal !== null
            ? [Number(hbVal), ...(currentMod.history || []).slice(0, 7)]
            : currentMod.history;

        const updated = {
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

        if (pod?.id) {
          try {
            sessionStorage.setItem(`vps_pod_hb_${pod.id}`, JSON.stringify(updated));
          } catch (_) { }
        }

        return updated;
      });

      // Trigger flash animation ONLY when the HB counter actually changed/incremented
      if (didIncrement) {
        setFlashingCards((prev) => ({ ...prev, [matchedModuleId]: true }));
        setTimeout(() => {
          setFlashingCards((prev) => ({ ...prev, [matchedModuleId]: false }));
        }, 600);
      }
    }
  }, [feed, pod?.id]);

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
      const health = evaluateModuleHealth(data, thresholds, nowTimestamp);
      const { status, reason, elapsedSec } = health;

      if (status === 'DEAD') {
        deadList.push({ mod, data, elapsedSec, reason });
      } else if (status === 'FROZEN') {
        frozenList.push({ mod, data, elapsedSec, reason });
      } else if (status === 'DELAY') {
        warningList.push({ mod, data, elapsedSec, reason });
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
  }, [serverModules, moduleDataMap, thresholds, nowTimestamp]);

  // Trigger sound alarm ONLY if newly DEAD modules are detected
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

  // Filtered modules based on search and healthFilter
  const filteredModules = useMemo(() => {
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
  }, [serverModules, moduleDataMap, thresholds, nowTimestamp, healthFilter, searchQuery]);

  // Ping all dead/frozen issues
  const handlePingIssues = () => {
    [...modulesHealthAnalysis.deadList, ...modulesHealthAnalysis.frozenList].forEach(({ mod }) => {
      handleStatusClick(mod);
    });
  };

  return (
    <div className="flex flex-col gap-6 w-full animate-in fade-in duration-200">
      {/* 1. CRITICAL EARLY-WARNING INCIDENT BANNER */}
      <PodHeartbeatIncidentBanner
        analysis={modulesHealthAnalysis}
        onPingIssues={handlePingIssues}
      />

      {/* 2. TOOLBAR & STATS BAR */}
      <PodHeartbeatToolbar
        totalReceivedPackets={totalReceivedPackets}
        modulesHealthAnalysis={modulesHealthAnalysis}
        healthFilter={healthFilter}
        onHealthFilterChange={setHealthFilter}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        soundAlertEnabled={soundAlertEnabled}
        onToggleSoundAlert={toggleSoundAlert}
        areAllCollapsed={areAllCollapsed}
        onToggleCollapseAll={toggleCollapseAll}
        onOpenManageModal={() => setIsManageModalOpen(true)}
        onOpenHistoryModal={() => setIsHistoryModalOpen(true)}
        onOpenLegendModal={() => setIsLegendModalOpen(true)}
        onStatusAll={handleStatusAll}
        onNavigateView={onNavigateView}
        pod={pod}
      />

      {/* 3. PHYSICAL STORAGE FILES SUMMARY (pod_storage) */}
      <PodHeartbeatStorageSummary
        storageFilesInfo={storageFilesInfo}
        isExpanded={isStorageFilesExpanded}
        onToggleExpand={() => setIsStorageFilesExpanded((prev) => !prev)}
        onNavigateView={onNavigateView}
        pod={pod}
      />

      {/* 4. 2-COLUMN GRID OF HEARTBEAT MODULE CARDS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {filteredModules.map((mod) => {
          const data = moduleDataMap[mod.id] || {};
          const isCollapsed = Boolean(collapsedMap[mod.id]);
          const isFlashing = Boolean(flashingCards[mod.id]);
          const isStatusLoading = Boolean(buttonLoadingMap[`${mod.id}_status`]);
          const isResetLoading = Boolean(buttonLoadingMap[`${mod.id}_reset`]);

          return (
            <PodHeartbeatModuleCard
              key={mod.id}
              mod={mod}
              data={data}
              thresholds={thresholds}
              nowTimestamp={nowTimestamp}
              isCollapsed={isCollapsed}
              onToggleCollapse={() => toggleCollapse(mod.id)}
              isFlashing={isFlashing}
              isStatusLoading={isStatusLoading}
              isResetLoading={isResetLoading}
              onStatusClick={() => handleStatusClick(mod)}
              onResetClick={() => handleResetClick(mod)}
            />
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

      {/* 7. INCIDENT HISTORY & JSONL LOGS MODAL */}
      <PodIncidentHistoryModal
        isOpen={isHistoryModalOpen}
        onClose={() => setIsHistoryModalOpen(false)}
        podId={pod?.id}
        podName={pod?.name}
        pod={pod}
        onNavigateView={onNavigateView}
      />
    </div>
  );
}
