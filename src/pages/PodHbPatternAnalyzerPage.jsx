import React, { useState, useEffect, useMemo, useRef, useTransition, useDeferredValue } from 'react';
import {
  AlertCircle,
  Table,
  Code2,
  FileText
} from 'lucide-react';
import { fetchServersApi } from '../api/vpsApi';
import {
  fetchPodHeartbeatAnalysisApi,
  fetchRecentFleetIncidentsApi,
  fetchHeartbeatModulesApi,
  fetchPodLatencyApi,
  pingPodNowApi,
  fetchAutoPingStatusApi,
  toggleAutoPingApi
} from '../api/podActivityApi';
import { getSharedSocket } from '../utils/socketService';

import {
  DEFAULT_MODULES,
  getTodayLocalDate,
  getCurrentWitaTime,
  generateMarkdownReport,
  generateIncidentCsv
} from '../components/podHb/podHbConstants';

import PodHbHeader from '../components/podHb/PodHbHeader';
import PodHbFilterToolbar from '../components/podHb/PodHbFilterToolbar';
import PodHbLatencyCard from '../components/podHb/PodHbLatencyCard';
import PodHbGapsBreakdownSection from '../components/podHb/PodHbGapsBreakdownSection';
import PodHbVisualChartsSection from '../components/podHb/PodHbVisualChartsSection';
import PodHbIncidentReportView from '../components/podHb/PodHbIncidentReportView';
import PodHbTickTableTab from '../components/podHb/PodHbTickTableTab';
import PodHbJsonViewerTab from '../components/podHb/PodHbJsonViewerTab';

/**
 * PodHbPatternAnalyzerPage
 * High-precision heartbeat timeline pattern analyzer for POD hardware modules.
 * Modular orchestrator handling data fetching, realtime socket probing, jump-to-row scrolling,
 * and coordinating views between Timeline Table, Raw JSON, and Formal Incident Reports.
 */
export default function PodHbPatternAnalyzerPage({
  initialPodId = null,
  initialModuleId = null,
  initialTime = null,
  initialDate = null,
  onBack = null
}) {
  // 1. Pods and Modules State
  const [servers, setServers] = useState([]);
  const [modules, setModules] = useState(DEFAULT_MODULES);
  const [selectedPodId, setSelectedPodId] = useState(() => {
    return initialPodId ? Number(initialPodId) : null;
  });
  const [selectedModuleId, setSelectedModuleId] = useState(() => {
    return initialModuleId ? Number(initialModuleId) : 507;
  });

  // 2. Time Filters State (WITA / UTC+8 Standard)
  const [selectedDate, setSelectedDate] = useState(() => initialDate || getTodayLocalDate());
  const [targetTimeStr, setTargetTimeStr] = useState(() => {
    if (initialTime) return String(initialTime);
    return getCurrentWitaTime();
  });
  const [windowMinutes, setWindowMinutes] = useState(5);

  // 3. Analysis Data States
  const [analysisData, setAnalysisData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // 4. Recent Incidents (Quick Picker)
  const [recentIncidents, setRecentIncidents] = useState([]);
  const [isIncidentsDropdownOpen, setIsIncidentsDropdownOpen] = useState(false);
  const [isLoadingIncidents, setIsLoadingIncidents] = useState(false);
  const incidentsRef = useRef(null);

  // 5. Table Search / Filter & Transition Handling (for ultra-low INP)
  const [tableSearch, setTableSearch] = useState('');
  const deferredSearch = useDeferredValue(tableSearch);
  const [tableFilter, setTableFilter] = useState('all'); // 'all' | 'incidents' | 'gaps' | 'lag'
  const [tableTab, setTableTab] = useState('table'); // 'table' | 'json' | 'report'
  const [jsonScope, setJsonScope] = useState('ticks'); // 'ticks' | 'incidents' | 'full' | 'payload'
  const [jsonFormat, setJsonFormat] = useState('raw'); // 'raw' | 'pretty'
  const [copiedJsonTab, setCopiedJsonTab] = useState(false);
  const [copiedReportSuccess, setCopiedReportSuccess] = useState(false);
  const [rangeStart, setRangeStart] = useState(1);
  const [rangeEnd, setRangeEnd] = useState(10);
  const [copiedRangeSuccess, setCopiedRangeSuccess] = useState(false);
  const [copiedLineIdx, setCopiedLineIdx] = useState(null);
  const [, startTransition] = useTransition();
  const [copiedSuccess, setCopiedSuccess] = useState(false);
  const [displayLimit, setDisplayLimit] = useState(250);
  const tableRef = useRef(null);

  // 6. Realtime Pod v3 Latency & Ping States
  const [latencyStats, setLatencyStats] = useState(null);
  const [isPingingNow, setIsPingingNow] = useState(false);
  const [autoPingEnabled, setAutoPingEnabled] = useState(true);
  const [isTogglingAutoPing, setIsTogglingAutoPing] = useState(false);

  // Load & Listen to Realtime Latency for Selected POD v3
  useEffect(() => {
    let isSubscribed = true;

    fetchAutoPingStatusApi()
      .then((res) => {
        if (isSubscribed && res?.autoPingEnabled !== undefined) {
          setAutoPingEnabled(Boolean(res.autoPingEnabled));
        }
      })
      .catch(() => { });

    if (!selectedPodId) return;

    async function loadLatency() {
      try {
        const data = await fetchPodLatencyApi(selectedPodId);
        if (isSubscribed && data?.stats) {
          setLatencyStats({
            ...data.stats,
            host: data.host,
            podName: data.podName,
            podCode: data.podCode
          });
        }
      } catch (_) { }
    }

    loadLatency();

    const socket = getSharedSocket();
    const handleLatencyUpdate = (payload) => {
      if (!isSubscribed) return;
      if (payload?.autoPingEnabled !== undefined) {
        setAutoPingEnabled(Boolean(payload.autoPingEnabled));
      }
      if (payload?.fleetLatency) {
        const match = payload.fleetLatency.find(
          (p) => Number(p.podId) === Number(selectedPodId) || String(p.podCode) === String(selectedPodId)
        );
        if (match) {
          setLatencyStats((prev) => ({
            ...prev,
            ...match
          }));
        }
      }
    };

    const handleSingleLatency = (payload) => {
      if (!isSubscribed || !payload) return;
      if (Number(payload.podId) === Number(selectedPodId) || String(payload.podCode) === String(selectedPodId)) {
        setLatencyStats((prev) => ({
          ...prev,
          ...payload
        }));
      }
    };

    const handleAutoPingStatus = (payload) => {
      if (!isSubscribed || payload?.autoPingEnabled === undefined) return;
      setAutoPingEnabled(Boolean(payload.autoPingEnabled));
    };

    socket.on('pod_latency_update', handleLatencyUpdate);
    socket.on('pod_latency_single', handleSingleLatency);
    socket.on('pod_latency_auto_ping_status', handleAutoPingStatus);

    return () => {
      isSubscribed = false;
      socket.off('pod_latency_update', handleLatencyUpdate);
      socket.off('pod_latency_single', handleSingleLatency);
      socket.off('pod_latency_auto_ping_status', handleAutoPingStatus);
    };
  }, [selectedPodId]);

  const handleToggleAutoPing = async () => {
    if (isTogglingAutoPing) return;
    setIsTogglingAutoPing(true);
    const nextState = !autoPingEnabled;
    try {
      const res = await toggleAutoPingApi(nextState);
      if (res && res.success) {
        setAutoPingEnabled(Boolean(res.autoPingEnabled));
      }
    } catch (err) {
      console.warn('Gagal mengubah status auto ping:', err.message);
    } finally {
      setIsTogglingAutoPing(false);
    }
  };

  const handlePingNow = async () => {
    if (!selectedPodId || isPingingNow) return;
    setIsPingingNow(true);
    try {
      const res = await pingPodNowApi(selectedPodId);
      if (res) {
        setLatencyStats({
          currentPingMs: res.currentPingMs,
          avgPingMs: res.avgPingMs,
          minPingMs: res.minPingMs,
          maxPingMs: res.maxPingMs,
          jitterMs: res.jitterMs,
          packetLossPct: res.packetLossPct,
          quality: res.quality,
          isOnline: res.isOnline,
          port: res.port,
          host: res.host,
          podName: res.podName,
          podCode: res.podCode
        });
      }
    } catch (err) {
      console.warn('Gagal melakukan ping on-demand:', err.message);
    } finally {
      setIsPingingNow(false);
    }
  };

  // Load Servers and Modules on mount (Strictly POD V3)
  useEffect(() => {
    let mounted = true;
    async function loadMeta() {
      try {
        const [srvs, mods] = await Promise.allSettled([
          fetchServersApi('', 'pod'),
          fetchHeartbeatModulesApi()
        ]);
        if (!mounted) return;
        if (srvs.status === 'fulfilled' && Array.isArray(srvs.value)) {
          // Strictly filter ONLY POD V3 servers: type === 'pod' and LOWER(pod_version) === 'v3'
          const podUnits = srvs.value
            .filter((s) => {
              const ver = String(s.pod_version || '').toLowerCase().trim();
              return s.type === 'pod' && ver === 'v3';
            })
            .sort((a, b) => {
              const numA = parseInt(String(a.code || a.name || '').replace(/\D/g, ''), 10) || 0;
              const numB = parseInt(String(b.code || b.name || '').replace(/\D/g, ''), 10) || 0;
              if (numA && numB && numA !== numB) return numA - numB;
              return String(a.name || '').localeCompare(String(b.name || ''));
            });

          setServers(podUnits);

          // Resolve active selectedPodId to a valid POD v3
          if (podUnits.length > 0) {
            setSelectedPodId((prevId) => {
              const idToMatch = prevId || initialPodId;
              if (idToMatch) {
                const matchByCode = podUnits.find((p) => String(p.code) === String(idToMatch));
                if (matchByCode) return matchByCode.id;
              }
              if (prevId && podUnits.some((p) => Number(p.id) === Number(prevId))) {
                return prevId;
              }
              const defaultPod31 = podUnits.find((p) => String(p.code) === '31' || /31/.test(p.name));
              if (defaultPod31) return defaultPod31.id;

              return podUnits[0].id;
            });
          }
        }
        if (mods.status === 'fulfilled' && Array.isArray(mods.value) && mods.value.length > 0) {
          setModules(mods.value);
        }
      } catch (_) { }
    }
    loadMeta();
    return () => { mounted = false; };
  }, [initialPodId]);

  // Load Recent Incidents for Quick Picker
  const loadRecentIncidents = async () => {
    setIsLoadingIncidents(true);
    try {
      const data = await fetchRecentFleetIncidentsApi(30);
      setRecentIncidents(data);
    } catch (_) {
    } finally {
      setIsLoadingIncidents(false);
    }
  };

  useEffect(() => {
    loadRecentIncidents();
  }, []);

  // Close incident dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e) {
      if (incidentsRef.current && !incidentsRef.current.contains(e.target)) {
        setIsIncidentsDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Execute Analysis Query
  const runAnalysis = async () => {
    if (!selectedPodId) return;
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetchPodHeartbeatAnalysisApi(selectedPodId, {
        moduleId: selectedModuleId,
        targetTime: targetTimeStr,
        date: selectedDate,
        windowMinutes
      });
      if (!res.success) {
        throw new Error(res.error || 'Gagal memuat hasil analisa.');
      }
      setAnalysisData(res);
    } catch (err) {
      setError(err.message);
      setAnalysisData(null);
    } finally {
      setIsLoading(false);
    }
  };

  // Auto trigger analysis on selection change
  useEffect(() => {
    runAnalysis();
  }, [selectedPodId, selectedModuleId, selectedDate, windowMinutes]);

  // Handle selecting an incident from dropdown
  const handleSelectIncident = (inc) => {
    setIsIncidentsDropdownOpen(false);
    if (inc.podId) {
      const match = servers.find(
        (s) => Number(s.id) === Number(inc.podId) || String(s.code) === String(inc.podId)
      );
      setSelectedPodId(match ? match.id : Number(inc.podId));
    }
    if (inc.moduleId) setSelectedModuleId(Number(inc.moduleId));

    if (inc.timestamp) {
      const d = new Date(inc.timestamp);
      try {
        const dStr = new Intl.DateTimeFormat('en-CA', {
          timeZone: 'Asia/Makassar',
          year: 'numeric',
          month: '2-digit',
          day: '2-digit'
        }).format(d);
        setSelectedDate(dStr);
      } catch (_) {
        setSelectedDate(d.toISOString().split('T')[0]);
      }

      try {
        const timeParts = new Intl.DateTimeFormat('en-GB', {
          timeZone: 'Asia/Makassar',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: false
        }).format(d);
        setTargetTimeStr(timeParts);
      } catch (_) {
        const h = String(d.getHours()).padStart(2, '0');
        const m = String(d.getMinutes()).padStart(2, '0');
        const s = String(d.getSeconds()).padStart(2, '0');
        setTargetTimeStr(`${h}:${m}:${s}`);
      }
    }
  };

  // Set time to current clock in WITA (UTC+8)
  const handleSetTimeToNow = () => {
    setSelectedDate(getTodayLocalDate());
    setTargetTimeStr(getCurrentWitaTime());
  };

  // Helper: jump to specific row index in table and ensure visibility
  const jumpToRowIndex = (targetIdx) => {
    if (targetIdx < 0 || !analysisData?.ticks?.length) return;

    // 1. Ensure table tab is active
    setTableTab('table');

    // 2. Clear search filter if it might hide the row
    if (tableSearch) {
      setTableSearch('');
    }

    // 3. Reset table filter if target tick would be excluded
    const targetTick = analysisData.ticks[targetIdx];
    if (tableFilter === 'gaps' && targetTick?.status !== 'GAP_DEAD') {
      setTableFilter('all');
    }

    // 4. Expand displayLimit so target row is rendered by React
    if (targetIdx >= displayLimit) {
      setDisplayLimit(targetIdx + 100);
    }

    // 5. Scroll outer page smoothly down to the table card container
    const tableCard = document.getElementById('tick-table-card');
    if (tableCard) {
      tableCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    // 6. Scroll inner table to target row with retry loop to allow React DOM paint
    const attemptScrollToRow = (retries = 6) => {
      const el = document.getElementById(`tick-row-${targetIdx}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        el.classList.add('ring-4', 'ring-cyan-400', 'bg-cyan-500/30');
        setTimeout(() => {
          el.classList.remove('ring-4', 'ring-cyan-400', 'bg-cyan-500/30');
        }, 3500);
      } else if (retries > 0) {
        setTimeout(() => attemptScrollToRow(retries - 1), 70);
      }
    };

    setTimeout(() => attemptScrollToRow(6), 80);
  };

  // Jump to specific gap in table
  const handleJumpToGap = (gap) => {
    if (!gap || !analysisData?.ticks?.length) return;
    const targetIdx = analysisData.ticks.findIndex(t => t.ts === gap.endTs);
    if (targetIdx !== -1) {
      jumpToRowIndex(targetIdx);
    }
  };

  // Jump to biggest gap or maximum delay spike in table
  const handleJumpToMaxGap = () => {
    if (!analysisData?.ticks?.length) return;
    if (analysisData.gaps?.length > 0) {
      handleJumpToGap(analysisData.gaps[0]);
    } else {
      let maxIdx = 0;
      let maxVal = -1;
      for (let i = 0; i < analysisData.ticks.length; i++) {
        const d = analysisData.ticks[i].deltaSec;
        if (d !== null && d > maxVal) {
          maxVal = d;
          maxIdx = i;
        }
      }
      jumpToRowIndex(maxIdx);
    }
  };

  // Copy raw JSON segment
  const handleCopyAnalysisJson = () => {
    if (!analysisData) return;
    navigator.clipboard.writeText(JSON.stringify(analysisData, null, 2));
    setCopiedSuccess(true);
    setTimeout(() => setCopiedSuccess(false), 2000);
  };

  // Memoized strictly incident ticks (anomaly rows)
  const incidentTicks = useMemo(() => {
    if (!analysisData?.ticks) return [];
    return analysisData.ticks.filter(t => {
      const isDead = t.status === 'GAP_DEAD' || (t.deltaSec !== null && t.deltaSec >= (analysisData?.meta?.thresholds?.deadSec || 15));
      const isJump = t.status === 'GAP_JUMP' || t.postDeadType === 'LOMPAT' || t.postDeadType === 'LONCAT' || (t.deltaHb !== null && t.deltaHb > 5);
      const isReset = t.status === 'RESET' || t.postDeadType === 'RESET' || (t.deltaHb !== null && t.deltaHb < 0);
      const isLag = t.status === 'GAP_LAG' || (t.deltaSec !== null && t.deltaSec >= 3.0 && !isDead);
      const isFrozen = t.status === 'FROZEN';
      return isDead || isJump || isReset || isLag || isFrozen || Boolean(t.postDeadType);
    });
  }, [analysisData]);

  // Filtered ticks for table (uses deferredSearch to prevent blocking pointer/typing events)
  const filteredTicks = useMemo(() => {
    if (!analysisData?.ticks) return [];
    const query = deferredSearch.trim().toLowerCase();
    return analysisData.ticks.filter(t => {
      if (tableFilter === 'incidents') {
        const isDead = t.status === 'GAP_DEAD' || (t.deltaSec !== null && t.deltaSec >= (analysisData?.meta?.thresholds?.deadSec || 15));
        const isJump = t.status === 'GAP_JUMP' || t.postDeadType === 'LOMPAT' || t.postDeadType === 'LONCAT' || (t.deltaHb !== null && t.deltaHb > 5);
        const isReset = t.status === 'RESET' || t.postDeadType === 'RESET' || (t.deltaHb !== null && t.deltaHb < 0);
        const isLag = t.status === 'GAP_LAG' || (t.deltaSec !== null && t.deltaSec >= 3.0 && !isDead);
        const isFrozen = t.status === 'FROZEN';
        const isInc = isDead || isJump || isReset || isLag || isFrozen || Boolean(t.postDeadType);
        if (!isInc) return false;
      }
      if (tableFilter === 'gaps' && t.status !== 'GAP_DEAD') return false;
      if (tableFilter === 'lag' && t.status !== 'GAP_DEAD' && t.status !== 'GAP_LAG') return false;
      if (query) {
        const dateMatch = t.date?.toLowerCase().includes(query);
        const timeMatch = t.time?.toLowerCase().includes(query);
        const hbMatch = String(t.hb || '').includes(query);
        const portMatch = t.port?.toLowerCase().includes(query);
        return dateMatch || timeMatch || hbMatch || portMatch;
      }
      return true;
    });
  }, [analysisData, tableFilter, deferredSearch]);

  // JSON view content memoized for performance (Raw JSONL vs Pretty Indented)
  const jsonFormattedTicks = useMemo(() => {
    if (!analysisData) return '{\n  "data": []\n}';

    // 1. Full analysis payload
    if (jsonScope === 'full') {
      return jsonFormat === 'pretty'
        ? JSON.stringify(analysisData, null, 2)
        : JSON.stringify(analysisData);
    }

    // 2. Incident ticks only
    if (jsonScope === 'incidents') {
      if (jsonFormat === 'pretty') {
        return JSON.stringify(incidentTicks, null, 2);
      }
      return incidentTicks.map(t => JSON.stringify(t)).join('\n');
    }

    // 3. Hardware payload only (raw MQTT payload received from pod)
    if (jsonScope === 'payload') {
      if (jsonFormat === 'pretty') {
        return JSON.stringify(filteredTicks.map(t => t.payload || { index: t.index, hb: t.hb, ts: t.ts }), null, 2);
      }
      return filteredTicks.map(t => JSON.stringify(t.payload || { index: t.index, hb: t.hb, ts: t.ts })).join('\n');
    }

    // 4. Ticks stream (default: Raw JSONL lines vs Pretty Array)
    if (jsonFormat === 'pretty') {
      return JSON.stringify(filteredTicks, null, 2);
    }
    return filteredTicks.map(t => JSON.stringify(t)).join('\n');
  }, [analysisData, filteredTicks, incidentTicks, jsonScope, jsonFormat]);

  // Display lines array for line-by-line rendering and selective multi-line copying
  const displayLines = useMemo(() => {
    if (!jsonFormattedTicks) return [];
    return jsonFormattedTicks.split('\n');
  }, [jsonFormattedTicks]);

  // Copy entire JSON from tab
  const handleCopyJsonTab = () => {
    navigator.clipboard.writeText(jsonFormattedTicks);
    setCopiedJsonTab(true);
    setTimeout(() => setCopiedJsonTab(false), 2000);
  };

  // Copy specific range of lines (e.g. line 1 to 10)
  const handleCopyLineRange = (start, end) => {
    if (!displayLines.length) return;
    const s = Math.max(1, Math.min(Number(start) || 1, displayLines.length));
    const e = Math.max(s, Math.min(Number(end) || s, displayLines.length));
    const linesToCopy = displayLines.slice(s - 1, e).join('\n');
    navigator.clipboard.writeText(linesToCopy);
    setCopiedRangeSuccess(true);
    setTimeout(() => setCopiedRangeSuccess(false), 2000);
  };

  // Copy a single line
  const handleCopySingleLine = (line, lineNum) => {
    navigator.clipboard.writeText(line);
    setCopiedLineIdx(lineNum);
    setTimeout(() => setCopiedLineIdx(null), 1500);
  };

  // Download JSON / JSONL file
  const handleDownloadJson = () => {
    if (!analysisData) return;
    const isRawLines = jsonFormat === 'raw' && jsonScope !== 'full';
    const ext = isRawLines ? 'jsonl' : 'json';
    const mime = isRawLines ? 'application/x-ndjson' : 'application/json';
    const blob = new Blob([jsonFormattedTicks], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `hb_analysis_pod${selectedPodId || 'all'}_mod${selectedModuleId}_${selectedDate}_${jsonScope}_${jsonFormat}.${ext}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Print Report Handler
  const handlePrintReport = () => {
    window.print();
  };

  // Copy Markdown Report
  const handleCopyMarkdownReport = () => {
    const md = generateMarkdownReport(
      analysisData,
      incidentTicks,
      targetTimeStr,
      selectedDate,
      windowMinutes,
      selectedPodId,
      selectedModuleId
    );
    if (!md) return;
    navigator.clipboard.writeText(md);
    setCopiedReportSuccess(true);
    setTimeout(() => setCopiedReportSuccess(false), 2000);
  };

  // Download Markdown Report (.md)
  const handleDownloadIncidentMarkdown = () => {
    const md = generateMarkdownReport(
      analysisData,
      incidentTicks,
      targetTimeStr,
      selectedDate,
      windowMinutes,
      selectedPodId,
      selectedModuleId
    );
    if (!md) return;
    const meta = analysisData?.meta || {};
    const blob = new Blob([md], { type: 'text/markdown;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `laporan_insiden_pod${meta.podId || selectedPodId}_mod${meta.moduleId || selectedModuleId}_${meta.resolvedDate || selectedDate}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Download Incident CSV (.csv)
  const handleDownloadIncidentCsv = () => {
    const csvContent = generateIncidentCsv(
      analysisData,
      incidentTicks,
      selectedPodId,
      selectedModuleId,
      selectedDate
    );
    if (!csvContent) return;
    const meta = analysisData?.meta || {};
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `baris_insiden_pod${meta.podId || selectedPodId}_mod${meta.moduleId || selectedModuleId}_${meta.resolvedDate || selectedDate}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Jump from Incident Report to precise row in full Table Log
  const handleJumpToTick = (tick) => {
    if (!tick || !analysisData?.ticks?.length) return;
    const targetIdx = analysisData.ticks.findIndex(t => t.index === tick.index || t.ts === tick.ts);
    if (targetIdx !== -1) {
      setTableTab('table');
      setTableFilter('all');
      jumpToRowIndex(targetIdx);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 sm:p-6 lg:p-8 space-y-6 font-sans">
      {/* 1. Top Header */}
      <PodHbHeader
        onBack={onBack}
        recentIncidents={recentIncidents}
        isIncidentsDropdownOpen={isIncidentsDropdownOpen}
        setIsIncidentsDropdownOpen={setIsIncidentsDropdownOpen}
        isLoadingIncidents={isLoadingIncidents}
        loadRecentIncidents={loadRecentIncidents}
        handleSelectIncident={handleSelectIncident}
        incidentsRef={incidentsRef}
        handleCopyAnalysisJson={handleCopyAnalysisJson}
        analysisData={analysisData}
        copiedSuccess={copiedSuccess}
        runAnalysis={runAnalysis}
        isLoading={isLoading}
      />

      {/* 2. Control Filter Toolbar */}
      <PodHbFilterToolbar
        servers={servers}
        modules={modules}
        selectedPodId={selectedPodId}
        setSelectedPodId={setSelectedPodId}
        selectedModuleId={selectedModuleId}
        setSelectedModuleId={setSelectedModuleId}
        selectedDate={selectedDate}
        setSelectedDate={setSelectedDate}
        targetTimeStr={targetTimeStr}
        setTargetTimeStr={setTargetTimeStr}
        windowMinutes={windowMinutes}
        setWindowMinutes={setWindowMinutes}
        handleSetTimeToNow={handleSetTimeToNow}
        startTransition={startTransition}
      />

      {/* 3. Realtime Network Health & Latency Card */}
      <PodHbLatencyCard
        latencyStats={latencyStats}
        servers={servers}
        selectedPodId={selectedPodId}
        autoPingEnabled={autoPingEnabled}
        handleToggleAutoPing={handleToggleAutoPing}
        isTogglingAutoPing={isTogglingAutoPing}
        handlePingNow={handlePingNow}
        isPingingNow={isPingingNow}
      />

      {/* Error Alert */}
      {error && (
        <div className="p-4 rounded-2xl bg-rose-950/40 border border-rose-500/40 text-rose-300 text-xs flex items-center gap-3">
          <AlertCircle size={18} className="text-rose-400 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* 4. Data Gaps Breakdown Section */}
      <PodHbGapsBreakdownSection
        analysisData={analysisData}
        onJumpToGap={handleJumpToGap}
        onJumpToMaxGap={handleJumpToMaxGap}
      />

      {/* 5. Visual Charts Grid (Isolated Memoized Component) */}
      <PodHbVisualChartsSection analysisData={analysisData} />

      {/* 6. Raw Tick High-Precision Timeline Table, JSON Viewer & Incident Report View */}
      <div id="tick-table-card" className="p-5 rounded-3xl bg-slate-900/60 border border-slate-800 shadow-2xl space-y-4" style={{ contentVisibility: 'auto', containIntrinsicSize: 'auto 750px' }}>
        {/* Top Header & View Navigation Tabs */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-slate-800">
          <div className="flex items-center gap-3 flex-wrap">
            {/* View Mode Tabs: Tabel vs JSON vs Laporan Insiden */}
            <div className="flex items-center bg-slate-950 p-1 rounded-2xl border border-slate-800/90 text-xs font-semibold shadow-inner">
              <button
                onClick={() => setTableTab('table')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition cursor-pointer ${tableTab === 'table'
                  ? 'bg-cyan-600 text-white shadow-md shadow-cyan-600/30 font-bold'
                  : 'text-slate-400 hover:text-white'
                  }`}
              >
                <Table size={14} />
                <span>Tabel Log</span>
              </button>
              <button
                onClick={() => setTableTab('json')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition cursor-pointer ${tableTab === 'json'
                  ? 'bg-cyan-600 text-white shadow-md shadow-cyan-600/30 font-bold'
                  : 'text-slate-400 hover:text-white'
                  }`}
              >
                <Code2 size={14} />
                <span>JSON</span>
              </button>
              <button
                onClick={() => setTableTab('report')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition cursor-pointer ${tableTab === 'report'
                  ? 'bg-gradient-to-r from-rose-600 to-amber-600 text-white shadow-md shadow-rose-600/30 font-bold'
                  : 'text-slate-400 hover:text-white'
                  }`}
              >
                <FileText size={14} />
                <span>Laporan Insiden</span>
                {incidentTicks.length > 0 && (
                  <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-rose-500 text-white font-black animate-pulse">
                    {incidentTicks.length}
                  </span>
                )}
              </button>
            </div>

            {/* Context Subtitle */}
            <div className="hidden lg:block">
              <span className="text-xs text-slate-400">
                {tableTab === 'table'
                  ? 'Daftar paket data kronologis presisi milidetik'
                  : tableTab === 'json'
                    ? 'Struktur data JSON murni untuk inspeksi mendalam'
                    : 'Dokumen investigasi resmi berfokus pada akar masalah & baris anomali'}
              </span>
            </div>
          </div>

          {/* Right Header Status / Badge */}
          {tableTab === 'table' ? (
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-slate-500 font-mono hidden sm:inline">
                Standar WITA (UTC+8)
              </span>
              <span className="text-xs font-mono font-bold px-2.5 py-1 rounded-xl bg-slate-950 border border-slate-800 text-cyan-300">
                {filteredTicks.length} <span className="text-slate-500 font-normal font-sans text-[11px]">/ {analysisData?.ticks?.length || 0} Detak</span>
              </span>
            </div>
          ) : tableTab === 'report' ? (
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold px-2.5 py-1 rounded-xl bg-rose-500/15 text-rose-300 border border-rose-500/30">
                {incidentTicks.length} Baris Anomali Terdeteksi
              </span>
            </div>
          ) : null}
        </div>

        {/* Content Body: Report, Table, or JSON */}
        {tableTab === 'report' ? (
          <PodHbIncidentReportView
            analysisData={analysisData}
            incidentTicks={incidentTicks}
            onJumpToTick={handleJumpToTick}
            onPrint={handlePrintReport}
            onCopyMarkdown={handleCopyMarkdownReport}
            onDownloadMarkdown={handleDownloadIncidentMarkdown}
            onDownloadCsv={handleDownloadIncidentCsv}
            copiedReportSuccess={copiedReportSuccess}
          />
        ) : tableTab === 'table' ? (
          <PodHbTickTableTab
            analysisData={analysisData}
            filteredTicks={filteredTicks}
            incidentTicks={incidentTicks}
            tableFilter={tableFilter}
            setTableFilter={setTableFilter}
            tableSearch={tableSearch}
            setTableSearch={setTableSearch}
            handleJumpToMaxGap={handleJumpToMaxGap}
            tableRef={tableRef}
            displayLimit={displayLimit}
            setDisplayLimit={setDisplayLimit}
          />
        ) : (
          <PodHbJsonViewerTab
            jsonFormat={jsonFormat}
            setJsonFormat={setJsonFormat}
            jsonScope={jsonScope}
            setJsonScope={setJsonScope}
            displayLines={displayLines}
            rangeStart={rangeStart}
            setRangeStart={setRangeStart}
            rangeEnd={rangeEnd}
            setRangeEnd={setRangeEnd}
            handleCopyLineRange={handleCopyLineRange}
            copiedRangeSuccess={copiedRangeSuccess}
            copiedLineIdx={copiedLineIdx}
            handleCopySingleLine={handleCopySingleLine}
            handleCopyJsonTab={handleCopyJsonTab}
            copiedJsonTab={copiedJsonTab}
            handleDownloadJson={handleDownloadJson}
            filteredTicksCount={filteredTicks.length}
            incidentTicksCount={incidentTicks.length}
          />
        )}
      </div>
    </div>
  );
}
