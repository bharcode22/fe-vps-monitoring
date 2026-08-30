import React, { useState, useEffect, useMemo } from 'react';
import {
  Database,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Clock,
  HardDrive,
  Calendar,
  Layers,
  Search,
  Copy,
  ChevronLeft,
  ChevronRight,
  Eye,
  X,
  Server,
  Zap,
  ArrowDownCircle,
  FileCode,
  SlidersHorizontal,
  ShieldCheck,
  LayoutGrid,
  List,
  Check
} from 'lucide-react';
import {
  fetchPodLogsMastersApi,
  fetchPodLogsV3ListApi,
  fetchPodLogsAuditApi,
  executePullPodLogsApi,
  fetchMasterPodLogsDataApi,
  fetchMasterActivityTypesApi,
  fetchPodUuidMapApi
} from '../api/podLogsApi';
import PodLogsDiffModal from '../components/podLogs/PodLogsDiffModal';

export default function PodLogsSyncPage() {
  // Navigation View Tab: 'sync' (Audit & Pull) | 'explorer' (Master Data Explorer)
  const [activeTab, setActiveTab] = useState('sync');

  // Master databases & POD V3 lists
  const [masters, setMasters] = useState([]);
  const [selectedMasterId, setSelectedMasterId] = useState(null);
  const [isLoadingInitial, setIsLoadingInitial] = useState(true);
  const [initialError, setInitialError] = useState('');

  // Audit state
  const [auditData, setAuditData] = useState(null);
  const [isLoadingAudit, setIsLoadingAudit] = useState(false);
  const [auditError, setAuditError] = useState('');

  // POD V3 Filtering in Sync Tab
  const [podSearchQuery, setPodSearchQuery] = useState('');
  const [podFilterTab, setPodFilterTab] = useState('ALL'); // 'ALL' | 'UNSYNCED_ONLY' | 'ONLINE_ONLY'
  const [fleetViewMode, setFleetViewMode] = useState('cards'); // 'cards' | 'table'

  // Single POD Diff Modal state
  const [diffModalPod, setDiffModalPod] = useState(null);
  const [podUuidMap, setPodUuidMap] = useState({});

  // Pull Sync Configuration states
  const [targetScope, setTargetScope] = useState('ALL'); // 'ALL' | specific podId
  const [pullMode, setPullMode] = useState('id_diff'); // 'id_diff' | 'unsynced' | 'date_range' | 'all'
  const [batchSize, setBatchSize] = useState(2000);
  const [markSyncedOnPod, setMarkSyncedOnPod] = useState(true);
  const [datePreset, setDatePreset] = useState('7_DAYS');
  const [customDateFrom, setCustomDateFrom] = useState('');
  const [customDateTo, setCustomDateTo] = useState('');

  // Execution & Progress states
  const [isPulling, setIsPulling] = useState(false);
  const [pullResult, setPullResult] = useState(null);
  const [pullError, setPullError] = useState('');
  const [consoleLogs, setConsoleLogs] = useState([]);

  // Explorer Tab states
  const [explorerRows, setExplorerRows] = useState([]);
  const [explorerTotalRows, setExplorerTotalRows] = useState(0);
  const [explorerPage, setExplorerPage] = useState(1);
  const [explorerLimit, setExplorerLimit] = useState(25);
  const [explorerTotalPages, setExplorerTotalPages] = useState(1);
  const [isLoadingExplorer, setIsLoadingExplorer] = useState(false);
  const [explorerError, setExplorerError] = useState('');
  const [filterActivityType, setFilterActivityType] = useState('ALL');
  const [filterPodId, setFilterPodId] = useState('');
  const [filterSearch, setFilterSearch] = useState('');
  const [activityTypes, setActivityTypes] = useState([]);

  // JSON Preview Modal state
  const [selectedJsonRow, setSelectedJsonRow] = useState(null);
  const [isCopiedJson, setIsCopiedJson] = useState(false);

  // Initial load
  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    setIsLoadingInitial(true);
    setInitialError('');
    try {
      const [mastersData, , uuidMap] = await Promise.all([
        fetchPodLogsMastersApi(),
        fetchPodLogsV3ListApi(),
        fetchPodUuidMapApi()
      ]);
      setMasters(mastersData);
      setPodUuidMap(uuidMap || {});

      if (mastersData.length > 0) {
        const defaultMasterId = mastersData[0].id;
        setSelectedMasterId(defaultMasterId);
        await runAudit(defaultMasterId);
      }
    } catch (err) {
      setInitialError(err.message || 'Gagal memuat konfigurasi awal database.');
    } finally {
      setIsLoadingInitial(false);
    }
  };

  // Run Audit
  const runAudit = async (masterId) => {
    const mId = masterId || selectedMasterId;
    if (!mId) return;
    setIsLoadingAudit(true);
    setAuditError('');
    try {
      const data = await fetchPodLogsAuditApi(mId);
      setAuditData(data);
    } catch (err) {
      setAuditError(err.message || 'Gagal melakukan audit pod_logs');
    } finally {
      setIsLoadingAudit(false);
    }
  };

  // STRICT FILTER: Only POD V3
  const v3Pods = useMemo(() => {
    return (auditData?.pods || []).filter((p) => (p.podVersion || 'v3').toLowerCase() === 'v3');
  }, [auditData?.pods]);

  // Filtered POD V3 for display
  const filteredPods = useMemo(() => {
    return v3Pods.filter((p) => {
      const matchesSearch =
        !podSearchQuery.trim() ||
        p.name.toLowerCase().includes(podSearchQuery.toLowerCase()) ||
        p.host.includes(podSearchQuery) ||
        (p.code && String(p.code).includes(podSearchQuery));

      if (!matchesSearch) return false;

      if (podFilterTab === 'UNSYNCED_ONLY') {
        return p.isOnline && p.unsyncedRows > 0;
      }
      if (podFilterTab === 'ONLINE_ONLY') {
        return p.isOnline;
      }
      return true;
    });
  }, [v3Pods, podSearchQuery, podFilterTab]);

  // Aggregated V3 Stats
  const v3Stats = useMemo(() => {
    const totalUnits = v3Pods.length;
    const onlineUnits = v3Pods.filter((p) => p.isOnline).length;
    const totalRows = v3Pods.reduce((acc, p) => acc + (p.totalRows || 0), 0);
    const totalUnsynced = v3Pods.reduce((acc, p) => acc + (p.unsyncedRows || 0), 0);
    const podsWithUnsynced = v3Pods.filter((p) => p.isOnline && p.unsyncedRows > 0).length;

    return {
      totalUnits,
      onlineUnits,
      totalRows,
      totalUnsynced,
      podsWithUnsynced
    };
  }, [v3Pods]);

  // Load Explorer Data when tab changes to 'explorer' or filters change
  useEffect(() => {
    if (activeTab === 'explorer' && selectedMasterId) {
      loadExplorerData();
      loadActivityTypes();
    }
  }, [activeTab, selectedMasterId, explorerPage, explorerLimit, filterActivityType]);

  const loadActivityTypes = async () => {
    if (!selectedMasterId) return;
    try {
      const types = await fetchMasterActivityTypesApi(selectedMasterId);
      setActivityTypes(types || []);
    } catch (_) {}
  };

  const loadExplorerData = async () => {
    if (!selectedMasterId) return;
    setIsLoadingExplorer(true);
    setExplorerError('');
    try {
      const res = await fetchMasterPodLogsDataApi({
        masterId: selectedMasterId,
        page: explorerPage,
        limit: explorerLimit,
        podId: filterPodId || null,
        activityType: filterActivityType === 'ALL' ? null : filterActivityType,
        search: filterSearch || null
      });
      setExplorerRows(res.rows || []);
      setExplorerTotalRows(res.totalRows || 0);
      setExplorerTotalPages(res.totalPages || 1);
      if (res.podUuidMap) {
        setPodUuidMap(prev => ({ ...prev, ...res.podUuidMap }));
      }
    } catch (err) {
      setExplorerError(err.message || 'Gagal memuat data log dari Master DB.');
    } finally {
      setIsLoadingExplorer(false);
    }
  };

  const handleApplyExplorerSearch = (e) => {
    e?.preventDefault();
    setExplorerPage(1);
    loadExplorerData();
  };

  // Calculate Date Filters
  const computedDateRange = useMemo(() => {
    if (pullMode !== 'date_range') return { dateFrom: null, dateTo: null };

    const now = new Date();
    if (datePreset === 'TODAY') {
      const start = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
      return { dateFrom: start, dateTo: now.toISOString() };
    }
    if (datePreset === '3_DAYS') {
      const start = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString();
      return { dateFrom: start, dateTo: now.toISOString() };
    }
    if (datePreset === '7_DAYS') {
      const start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
      return { dateFrom: start, dateTo: now.toISOString() };
    }
    if (datePreset === '30_DAYS') {
      const start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
      return { dateFrom: start, dateTo: now.toISOString() };
    }
    if (datePreset === 'CUSTOM') {
      return {
        dateFrom: customDateFrom ? new Date(customDateFrom).toISOString() : null,
        dateTo: customDateTo ? new Date(customDateTo).toISOString() : null
      };
    }
    return { dateFrom: null, dateTo: null };
  }, [pullMode, datePreset, customDateFrom, customDateTo]);

  // Execute Pull Sync (strictly V3)
  const handleStartPull = async (singlePodId = null) => {
    const effectiveScope = singlePodId || targetScope;
    let targetPodIds = [];

    if (effectiveScope === 'ALL') {
      targetPodIds = v3Pods.filter((p) => p.isOnline).map((p) => p.id);
      if (targetPodIds.length === 0) {
        alert('Tidak ada unit POD V3 yang berstatus online untuk ditarik datanya.');
        return;
      }
    } else {
      targetPodIds = [parseInt(effectiveScope, 10)];
    }

    const podNames = v3Pods
      .filter((p) => targetPodIds.includes(p.id))
      .map((p) => `${p.name} (V3)`)
      .join(', ');

    const confirmMsg =
      `Mulai penarikan data pod_logs dari [${targetPodIds.length} Unit POD V3: ${podNames}] ke Master Database RDS?\n\n` +
      `• Target: Hanya Unit POD V3 (Non-V3 otomatis dikecualikan)\n` +
      `• Mode: ${
        pullMode === 'id_diff'
          ? 'Komparasi ID (Cek & Tarik ID yang Belum Ada di Master - Rekomendasi)'
          : pullMode === 'unsynced'
          ? 'Hanya Belum Sinkron (is_synced = false)'
          : pullMode === 'date_range'
          ? 'Rentang Tanggal'
          : 'Semua Data (Full Idempoten)'
      }\n` +
      `• Batch Chunk: ${batchSize.toLocaleString()} baris/batch\n` +
      `• Tandai is_synced = true di POD: ${markSyncedOnPod ? 'YA (Otomatis)' : 'TIDAK'}`;

    if (!window.confirm(confirmMsg)) return;

    setIsPulling(true);
    setPullError('');
    setPullResult(null);
    setConsoleLogs([
      `[${new Date().toLocaleTimeString()}] Mempersiapkan penarikan data pod_logs skala besar...`,
      `[${new Date().toLocaleTimeString()}] Filter aktif: KHUSUS UNIT POD V3`,
      `[${new Date().toLocaleTimeString()}] Target Unit: ${podNames}`,
      `[${new Date().toLocaleTimeString()}] Membuka koneksi Keyset Cursor batching ke Master DB dan POD V3...`
    ]);

    try {
      const payload = {
        masterId: selectedMasterId,
        targetPodIds,
        options: {
          mode: pullMode,
          batchSize,
          markSyncedOnPod,
          dateFrom: computedDateRange.dateFrom,
          dateTo: computedDateRange.dateTo
        }
      };

      const res = await executePullPodLogsApi(payload);
      setPullResult(res);

      const logsFromRes = (res.progressHistory || []).map((p) => {
        const time = new Date(p.timestamp).toLocaleTimeString();
        if (p.stage === 'STARTING_POD') {
          return `[${time}] Memulai sinkronisasi unit: ${p.podName} (POD V3 ${p.podIndex}/${p.totalPods})`;
        }
        return `[${time}] [${p.podName} - V3] Batch ${p.batchIndex}/${p.estimatedBatches} • ${p.rowsProcessed.toLocaleString()}/${p.totalMatchingRows.toLocaleString()} baris (${p.percent}%) • ${p.speedRowsPerSec} baris/dtk`;
      });

      setConsoleLogs((prev) => [
        ...prev,
        ...logsFromRes,
        `[${new Date().toLocaleTimeString()}] SELESAI: ${res.message}`
      ]);

      // Re-run audit to reflect updated counts
      await runAudit(selectedMasterId);
    } catch (err) {
      setPullError(err.message || 'Terjadi kesalahan saat mengeksekusi penarikan data.');
      setConsoleLogs((prev) => [
        ...prev,
        `[${new Date().toLocaleTimeString()}] ERROR: ${err.message}`
      ]);
    } finally {
      setIsPulling(false);
    }
  };

  const handleCopyJson = () => {
    if (selectedJsonRow) {
      navigator.clipboard.writeText(JSON.stringify(selectedJsonRow, null, 2));
      setIsCopiedJson(true);
      setTimeout(() => setIsCopiedJson(false), 2000);
    }
  };

  const formatActivityBadge = (type) => {
    const lower = (type || '').toLowerCase();
    if (lower.includes('play') || lower.includes('session')) {
      return 'bg-purple-500/15 border-purple-500/30 text-purple-300';
    }
    if (lower.includes('login') || lower.includes('auth')) {
      return 'bg-cyan-500/15 border-cyan-500/30 text-cyan-300';
    }
    if (lower.includes('http') || lower.includes('api')) {
      return 'bg-blue-500/15 border-blue-500/30 text-blue-300';
    }
    if (lower.includes('error') || lower.includes('fail')) {
      return 'bg-rose-500/15 border-rose-500/30 text-rose-300';
    }
    return 'bg-slate-700/30 border-slate-600 text-slate-300';
  };

  if (isLoadingInitial) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-slate-400">
        <RefreshCw size={28} className="animate-spin text-rose-400 mb-3" />
        <span className="text-sm font-semibold">Memuat Konfigurasi POD Logs Sync...</span>
      </div>
    );
  }

  if (initialError) {
    return (
      <div className="p-6 bg-rose-500/10 border border-rose-500/30 rounded-2xl text-rose-300 text-center my-6">
        <AlertCircle size={32} className="mx-auto mb-2 text-rose-400" />
        <h3 className="text-base font-bold">Gagal Menginisialisasi Halaman</h3>
        <p className="text-xs text-rose-200 mt-1">{initialError}</p>
        <button
          onClick={loadInitialData}
          className="mt-4 px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold rounded-xl cursor-pointer"
        >
          Coba Lagi
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5 pb-12">
      {/* Top Banner & Master DB Selector */}
      <div className="bg-slate-900/90 border border-slate-800/80 rounded-2xl p-4 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-gradient-to-br from-rose-500/20 via-pink-500/20 to-indigo-500/20 text-rose-400 border border-rose-500/30 rounded-2xl shadow-inner">
            <Database size={24} />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-base font-bold text-white tracking-wide">POD Logs Sync Manager</h1>
              <span className="text-[10px] font-mono px-2 py-0.5 bg-rose-500/20 text-rose-300 border border-rose-500/30 rounded-md font-extrabold flex items-center gap-1">
                <ShieldCheck size={12} className="text-rose-400" />
                KHUSUS POD V3
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 bg-slate-800 text-slate-400 border border-slate-700 rounded-md">
                V2 & Non-POD Dikecualikan
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Pipeline penarikan data tabel <code className="text-cyan-300 font-mono">pod_logs</code> skala besar dari armada <b className="text-white">POD V3</b> ke Master Database RDS AWS.
            </p>
          </div>
        </div>

        {/* Master Selector & Action Buttons */}
        <div className="flex items-center gap-3 w-full md:w-auto flex-wrap justify-between md:justify-end">
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400 font-semibold">Master DB:</span>
            <select
              value={selectedMasterId || ''}
              onChange={(e) => {
                const id = parseInt(e.target.value, 10);
                setSelectedMasterId(id);
                runAudit(id);
              }}
              className="bg-slate-950 border border-slate-700 text-slate-200 text-xs rounded-xl px-3 py-1.5 focus:outline-none focus:border-rose-500 cursor-pointer font-medium"
            >
              {masters.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name} ({m.host})
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={() => runAudit(selectedMasterId)}
            disabled={isLoadingAudit || isPulling}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold flex items-center gap-1.5 border border-slate-700 transition-colors cursor-pointer"
            title="Periksa Ulang Jumlah Baris"
          >
            <RefreshCw size={14} className={isLoadingAudit ? 'animate-spin text-rose-400' : ''} />
            <span>Audit</span>
          </button>
        </div>
      </div>

      {/* Navigation View Switcher (Audit & Pull vs Master Explorer) */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-2 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('sync')}
            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer border ${
              activeTab === 'sync'
                ? 'bg-rose-500/20 border-rose-500/40 text-rose-300 shadow-md shadow-rose-500/10'
                : 'bg-white/5 border-transparent text-slate-400 hover:text-slate-200 hover:bg-white/10'
            }`}
          >
            <Zap size={15} />
            <span>1. Sinkronisasi & Armada POD V3 ({v3Stats.totalUnits} Unit)</span>
          </button>

          <button
            onClick={() => setActiveTab('explorer')}
            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer border ${
              activeTab === 'explorer'
                ? 'bg-indigo-500/20 border-indigo-500/40 text-indigo-300 shadow-md shadow-indigo-500/10'
                : 'bg-white/5 border-transparent text-slate-400 hover:text-slate-200 hover:bg-white/10'
            }`}
          >
            <Layers size={15} />
            <span>2. Penjelajah Data Master ({auditData?.master?.totalRows?.toLocaleString() || 0})</span>
          </button>
        </div>

        {activeTab === 'sync' && (
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <span className="font-semibold">Tampilan Armada:</span>
            <div className="flex items-center bg-slate-900 border border-slate-800 rounded-lg p-0.5">
              <button
                onClick={() => setFleetViewMode('cards')}
                className={`p-1.5 rounded-md transition-colors ${
                  fleetViewMode === 'cards' ? 'bg-slate-800 text-white font-bold' : 'text-slate-400 hover:text-slate-200'
                }`}
                title="Tampilan Kartu Grid"
              >
                <LayoutGrid size={14} />
              </button>
              <button
                onClick={() => setFleetViewMode('table')}
                className={`p-1.5 rounded-md transition-colors ${
                  fleetViewMode === 'table' ? 'bg-slate-800 text-white font-bold' : 'text-slate-400 hover:text-slate-200'
                }`}
                title="Tampilan Tabel Komparasi"
              >
                <List size={14} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* TAB 1: SINKRONISASI & AUDIT ARMADA POD V3 */}
      {activeTab === 'sync' && (
        <div className="flex flex-col gap-5">
          {/* Summary Stat Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
            {/* Card 1: Master Total Rows */}
            <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between">
              <span className="text-xs text-slate-400 flex items-center gap-1.5">
                <Database size={15} className="text-indigo-400" /> Total di Master RDS
              </span>
              <div className="my-2">
                <div className="text-2xl font-mono font-bold text-white">
                  {auditData?.master?.totalRows?.toLocaleString() || 0}
                </div>
                <span className="text-[11px] text-slate-400">baris log tersimpan</span>
              </div>
              <div className="text-[10px] text-slate-500 font-mono truncate">
                DB: {auditData?.master?.name}
              </div>
            </div>

            {/* Card 2: Total Unsynced Logs in POD V3 */}
            <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between">
              <span className="text-xs text-slate-400 flex items-center gap-1.5">
                <ArrowDownCircle size={15} className="text-amber-400" /> Belum Ditarik (POD V3)
              </span>
              <div className="my-2">
                <div className="text-2xl font-mono font-bold text-amber-400">
                  {v3Stats.totalUnsynced.toLocaleString()}
                </div>
                <span className="text-[11px] text-slate-400">
                  baris dari {v3Stats.podsWithUnsynced} unit POD V3
                </span>
              </div>
              <div className="text-[10px] text-amber-300/80 font-medium">
                Siap ditarik ke Master DB
              </div>
            </div>

            {/* Card 3: Total Logs on All POD V3s */}
            <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between">
              <span className="text-xs text-slate-400 flex items-center gap-1.5">
                <HardDrive size={15} className="text-cyan-400" /> Total Log di POD V3
              </span>
              <div className="my-2">
                <div className="text-2xl font-mono font-bold text-cyan-400">
                  {v3Stats.totalRows.toLocaleString()}
                </div>
                <span className="text-[11px] text-slate-400">baris di database POD</span>
              </div>
              <div className="text-[10px] text-slate-500 font-mono">
                {v3Stats.onlineUnits} dari {v3Stats.totalUnits} POD V3 online
              </div>
            </div>

            {/* Card 4: Latest Master Log Date */}
            <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between">
              <span className="text-xs text-slate-400 flex items-center gap-1.5">
                <Clock size={15} className="text-emerald-400" /> Log Terakhir di Master
              </span>
              <div className="my-2">
                <div className="text-xs font-mono font-bold text-emerald-400 truncate">
                  {auditData?.master?.latestCreated
                    ? new Date(auditData.master.latestCreated).toLocaleString('id-ID')
                    : 'Belum ada log'}
                </div>
                <span className="text-[11px] text-slate-400 mt-1 block">Waktu event terbaru</span>
              </div>
              <div className="text-[10px] text-slate-500">
                Terverifikasi terpusat
              </div>
            </div>
          </div>

          {/* Control Panel: Configuration & Pull Trigger */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-xl flex flex-col gap-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <SlidersHorizontal size={18} className="text-rose-400" />
                <h3 className="text-sm font-bold text-white">Konfigurasi Penarikan POD V3 (Batch Tuning)</h3>
              </div>
              <span className="text-xs text-slate-400">
                Hanya menargetkan unit POD V3 yang aktif di jaringan lokal
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Option 1: Target Scope */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-300">Target Unit POD V3:</label>
                <select
                  value={targetScope}
                  onChange={(e) => setTargetScope(e.target.value)}
                  className="bg-slate-950 border border-slate-700 text-slate-200 text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-rose-500 cursor-pointer font-medium"
                >
                  <option value="ALL">⭐ Seluruh Armada POD V3 ({v3Stats.onlineUnits} Online)</option>
                  {v3Pods.map((p) => (
                    <option key={p.id} value={p.id} disabled={!p.isOnline}>
                      {p.name} [V3] ({p.host}) {!p.isOnline ? '(Offline)' : `— ${p.unsyncedRows.toLocaleString()} baris`}
                    </option>
                  ))}
                </select>
                <span className="text-[11px] text-slate-500">Hanya menampilkan server dengan pod_version = v3.</span>
              </div>

              {/* Option 2: Pull Mode */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-300">Mode Penarikan Data:</label>
                <select
                  value={pullMode}
                  onChange={(e) => setPullMode(e.target.value)}
                  className="bg-slate-950 border border-slate-700 text-slate-200 text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-rose-500 cursor-pointer font-medium"
                >
                  <option value="id_diff">🔍 Komparasi ID (Cek & Tarik yang Belum Ada di Master - Rekomendasi)</option>
                  <option value="unsynced">⚡ Cepat (Hanya is_synced = false)</option>
                  <option value="date_range">📅 Berdasarkan Rentang Tanggal</option>
                  <option value="all">🔁 Tarik Semua Data (Full Idempoten)</option>
                </select>
                <span className="text-[11px] text-slate-500">
                  {pullMode === 'id_diff'
                    ? 'Memeriksa ID ke Master RDS: hanya menarik baris yang belum ada di Master (mengatasi anomali flag is_synced=true di POD).'
                    : pullMode === 'unsynced'
                    ? 'Hanya menarik baris dengan is_synced = false di POD.'
                    : pullMode === 'date_range'
                    ? 'Menarik baris dalam jendela waktu tertentu.'
                    : 'Menarik seluruh baris secara idempoten via ON CONFLICT (id).'}
                </span>
              </div>

              {/* Option 3: Batch Chunk Size */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-300">Ukuran Chunk Batch:</label>
                <select
                  value={batchSize}
                  onChange={(e) => setBatchSize(parseInt(e.target.value, 10))}
                  className="bg-slate-950 border border-slate-700 text-slate-200 text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-rose-500 cursor-pointer font-medium font-mono"
                >
                  <option value="1000">1.000 baris / batch</option>
                  <option value="2000">2.000 baris / batch (Optimal)</option>
                  <option value="5000">5.000 baris / batch (Cepat)</option>
                </select>
                <span className="text-[11px] text-slate-500">Keyset cursor seek super cepat (&lt;5ms).</span>
              </div>

              {/* Option 4: Mark Synced Checkbox */}
              <div className="flex flex-col justify-between p-3 bg-slate-950/60 border border-slate-800 rounded-xl">
                <label className="flex items-start gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={markSyncedOnPod}
                    onChange={(e) => setMarkSyncedOnPod(e.target.checked)}
                    className="mt-0.5 rounded border-slate-700 text-rose-500 focus:ring-rose-500"
                  />
                  <div className="text-xs">
                    <span className="font-bold text-white block">Tandai is_synced = true di POD</span>
                    <span className="text-[10px] text-slate-400">
                      Otomatis update status di database lokal POD setelah berhasil disimpan di Master.
                    </span>
                  </div>
                </label>
              </div>
            </div>

            {/* Sub-section: Date Range Picker (if mode === 'date_range') */}
            {pullMode === 'date_range' && (
              <div className="p-3 bg-slate-950/80 border border-slate-800 rounded-xl flex items-center gap-3 flex-wrap text-xs">
                <span className="font-semibold text-slate-300 flex items-center gap-1.5">
                  <Calendar size={14} className="text-cyan-400" /> Preset Waktu:
                </span>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {[
                    { id: 'TODAY', label: 'Hari Ini' },
                    { id: '3_DAYS', label: '3 Hari Terakhir' },
                    { id: '7_DAYS', label: '7 Hari Terakhir' },
                    { id: '30_DAYS', label: '30 Hari Terakhir' },
                    { id: 'CUSTOM', label: 'Rentang Kustom' }
                  ].map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setDatePreset(p.id)}
                      className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer border ${
                        datePreset === p.id
                          ? 'bg-cyan-500/20 border-cyan-500/40 text-cyan-300 font-bold'
                          : 'bg-white/5 border-transparent text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>

                {datePreset === 'CUSTOM' && (
                  <div className="flex items-center gap-2 ml-auto flex-wrap">
                    <input
                      type="datetime-local"
                      value={customDateFrom}
                      onChange={(e) => setCustomDateFrom(e.target.value)}
                      className="bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-slate-200"
                    />
                    <span className="text-slate-500">s/d</span>
                    <input
                      type="datetime-local"
                      value={customDateTo}
                      onChange={(e) => setCustomDateTo(e.target.value)}
                      className="bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-slate-200"
                    />
                  </div>
                )}
              </div>
            )}

            {/* Execution Trigger Button */}
            <div className="pt-2 flex items-center justify-between gap-4 flex-wrap">
              <div className="text-xs text-slate-400 flex items-center gap-2">
                <CheckCircle2 size={15} className="text-emerald-400" />
                <span>
                  Menggunakan metode <code className="text-white font-mono">ON CONFLICT (id) DO UPDATE</code> yang dijamin aman dan idempoten.
                </span>
              </div>

              <button
                onClick={() => handleStartPull()}
                disabled={isPulling || isLoadingAudit}
                className="px-6 py-2.5 bg-gradient-to-r from-rose-600 via-rose-500 to-indigo-600 hover:from-rose-500 hover:to-indigo-500 text-white font-bold rounded-xl text-xs flex items-center gap-2 shadow-lg shadow-rose-500/25 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isPulling ? (
                  <RefreshCw size={15} className="animate-spin" />
                ) : (
                  <Zap size={15} className="fill-current" />
                )}
                <span>
                  {isPulling
                    ? 'Sedang Menarik Data...'
                    : `⚡ Mulai Tarik Data (${targetScope === 'ALL' ? 'Semua POD V3' : '1 POD Terpilih'})`}
                </span>
              </button>
            </div>
          </div>

          {/* Live Progress Bar & Console Log Container */}
          {(isPulling || consoleLogs.length > 0) && (
            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 shadow-2xl flex flex-col gap-3">
              <div className="flex items-center justify-between border-b border-slate-800/80 pb-2.5">
                <div className="flex items-center gap-2">
                  <div className={`w-2.5 h-2.5 rounded-full ${isPulling ? 'bg-amber-400 animate-ping' : 'bg-emerald-400'}`} />
                  <h4 className="text-xs font-bold text-white tracking-wide">Live Execution Console & Kecepatan Batch</h4>
                </div>
                {pullResult && (
                  <span className="text-xs font-mono text-emerald-400 font-bold">
                    Total Selesai: {pullResult.totalProcessed?.toLocaleString()} baris
                  </span>
                )}
              </div>

              {/* Progress Terminal Viewport */}
              <div className="bg-[#090d16] p-3 rounded-xl border border-slate-800/80 max-h-52 overflow-y-auto font-mono text-[11.5px] leading-relaxed text-slate-300 flex flex-col gap-1 select-text">
                {consoleLogs.map((line, idx) => (
                  <div
                    key={idx}
                    className={
                      line.includes('ERROR')
                        ? 'text-rose-400 font-bold'
                        : line.includes('SELESAI')
                        ? 'text-emerald-300 font-bold'
                        : line.includes('Memulai')
                        ? 'text-cyan-300 font-semibold'
                        : 'text-slate-300'
                    }
                  >
                    {line}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Fleet Filter Bar for POD V3 */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl px-4 py-3 flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-bold text-white flex items-center gap-1.5 mr-1">
                <Server size={15} className="text-rose-400" /> Armada POD V3:
              </span>

              {[
                { id: 'ALL', label: 'Semua POD V3', count: v3Pods.length },
                { id: 'UNSYNCED_ONLY', label: 'Ada Log Belum Sinkron', count: v3Stats.podsWithUnsynced },
                { id: 'ONLINE_ONLY', label: 'Online Saja', count: v3Stats.onlineUnits }
              ].map((tab) => {
                const isActive = podFilterTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setPodFilterTab(tab.id)}
                    className={`px-3 py-1 rounded-xl text-xs font-medium flex items-center gap-1.5 transition-all cursor-pointer border ${
                      isActive
                        ? 'bg-rose-500/20 border-rose-500/40 text-rose-300 shadow-sm'
                        : 'bg-white/5 border-transparent text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <span>{tab.label}</span>
                    <span
                      className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold ${
                        isActive ? 'bg-rose-500/30 text-rose-200' : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      {tab.count}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* POD Search Input */}
            <div className="relative min-w-[200px] sm:w-64">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={podSearchQuery}
                onChange={(e) => setPodSearchQuery(e.target.value)}
                placeholder="Cari nama POD atau IP..."
                className="w-full pl-8 pr-3 py-1.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-rose-500"
              />
              {podSearchQuery && (
                <button
                  onClick={() => setPodSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
                >
                  <X size={12} />
                </button>
              )}
            </div>
          </div>

          {/* FLEET VIEW: CARD GRID MODE */}
          {fleetViewMode === 'cards' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3.5">
              {isLoadingAudit ? (
                <div className="col-span-full p-12 flex flex-col items-center justify-center text-slate-400">
                  <RefreshCw size={24} className="animate-spin text-rose-400 mb-2" />
                  <span className="text-xs">Mengaudit baris pod_logs di seluruh unit POD V3...</span>
                </div>
              ) : filteredPods.length === 0 ? (
                <div className="col-span-full p-12 text-center text-slate-500 text-xs bg-slate-950 border border-slate-800 rounded-2xl">
                  Tidak ada unit POD V3 yang cocok dengan filter pencarian.
                </div>
              ) : (
                filteredPods.map((pod) => {
                  const percentSynced =
                    pod.totalRows > 0
                      ? Math.min(100, Math.round(((pod.masterRows || 0) / pod.totalRows) * 100))
                      : 100;
                  const isCurrentlyTarget = isPulling && targetScope === String(pod.id);

                  return (
                    <div
                      key={pod.id}
                      className={`bg-slate-950 border rounded-2xl p-4 flex flex-col justify-between gap-3 transition-all ${
                        isCurrentlyTarget
                          ? 'border-rose-500 shadow-lg shadow-rose-500/20 bg-rose-500/5'
                          : 'border-slate-800/80 hover:border-slate-700'
                      }`}
                    >
                      {/* Card Top: Name, Code & Online Badge */}
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="text-sm font-bold text-white">{pod.name}</h4>
                            <span className="text-[10px] font-mono px-1.5 py-0.2 bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 rounded font-bold">
                              V3
                            </span>
                          </div>
                          <span className="text-[11px] font-mono text-slate-400">{pod.host}</span>
                        </div>

                        {pod.isOnline ? (
                          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> Online
                          </span>
                        ) : (
                          <span
                            className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-rose-500/15 text-rose-300 border border-rose-500/30"
                            title={pod.error || 'Tidak dapat dihubungi'}
                          >
                            Offline
                          </span>
                        )}
                      </div>

                      {/* Card Middle: Row Metrics (POD vs Master vs Selisih ID) */}
                      <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-3 flex flex-col gap-2">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-slate-400">Total di POD:</span>
                          <span className="font-mono font-bold text-white">
                            {pod.isOnline ? pod.totalRows.toLocaleString() : '-'}
                          </span>
                        </div>

                        <div className="flex items-center justify-between text-xs">
                          <span className="text-slate-400">Ada di Master:</span>
                          <span className="font-mono font-bold text-indigo-300">
                            {pod.isOnline ? (pod.masterRows || 0).toLocaleString() : '-'}
                          </span>
                        </div>

                        <div className="flex items-center justify-between text-xs">
                          <span className="text-slate-400">Belum di Master:</span>
                          <span
                            className={`font-mono font-bold ${
                              pod.unsyncedRows > 0 ? 'text-amber-400' : 'text-emerald-400'
                            }`}
                          >
                            {pod.isOnline ? pod.unsyncedRows.toLocaleString() : '-'}
                          </span>
                        </div>

                        {/* Mini Progress Bar of Sync */}
                        {pod.isOnline && pod.totalRows > 0 && (
                          <div className="flex flex-col gap-1 mt-1">
                            <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-gradient-to-r from-amber-500 via-cyan-500 to-emerald-500 rounded-full transition-all duration-300"
                                style={{ width: `${percentSynced}%` }}
                              />
                            </div>
                            <span className="text-[10px] text-right font-mono text-slate-500">
                              {percentSynced}% tersimpan di Master
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Card Bottom: Quick Actions (Bandingkan & Tarik) */}
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setDiffModalPod(pod)}
                          className="flex-1 py-2 bg-slate-800 hover:bg-cyan-500/20 text-cyan-300 border border-slate-700 hover:border-cyan-500/40 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                          title="Buka Komparasi Detail POD vs Master"
                        >
                          <Eye size={13} />
                          <span>Bandingkan</span>
                        </button>
                        <button
                          onClick={() => handleStartPull(pod.id)}
                          disabled={isPulling || !pod.isOnline}
                          className={`py-2 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                            pod.unsyncedRows > 0
                              ? 'bg-gradient-to-r from-rose-600 to-amber-600 hover:from-rose-500 hover:to-amber-500 text-white shadow-md shadow-rose-500/20'
                              : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700'
                          }`}
                          title={pod.unsyncedRows > 0 ? `Tarik ${pod.unsyncedRows.toLocaleString()} log yang belum ada di Master` : 'Sinkronkan ulang unit ini ke Master'}
                        >
                          <Zap size={13} className={pod.unsyncedRows > 0 ? 'text-amber-200 fill-current' : 'text-rose-400'} />
                          <span>{pod.unsyncedRows > 0 ? `Tarik (${pod.unsyncedRows.toLocaleString()})` : 'Tarik'}</span>
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* FLEET VIEW: TABLE MODE */}
          {fleetViewMode === 'table' && (
            <div className="bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden shadow-xl flex flex-col">
              <div className="bg-slate-900/80 border-b border-slate-800 px-4 py-3 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Server size={17} className="text-rose-400" />
                  <h3 className="text-sm font-bold text-white">Status Seluruh Unit POD V3</h3>
                </div>
                <span className="text-xs text-slate-400 font-mono">
                  {filteredPods.length} dari {v3Pods.length} unit POD V3
                </span>
              </div>

              {isLoadingAudit ? (
                <div className="p-12 flex flex-col items-center justify-center text-slate-400">
                  <RefreshCw size={24} className="animate-spin text-rose-400 mb-2" />
                  <span className="text-xs">Mengaudit baris pod_logs di seluruh unit POD V3...</span>
                </div>
              ) : auditError ? (
                <div className="p-6 text-center text-rose-400 text-xs">
                  <AlertCircle size={24} className="mx-auto mb-2 text-rose-400" />
                  <span>{auditError}</span>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-slate-300">
                    <thead className="bg-slate-900/50 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
                      <tr>
                        <th className="px-4 py-3">Unit POD V3</th>
                        <th className="px-4 py-3">Alamat IP LAN</th>
                        <th className="px-4 py-3">Status Koneksi</th>
                        <th className="px-4 py-3 text-right">Total di POD</th>
                        <th className="px-4 py-3 text-right">Ada di Master</th>
                        <th className="px-4 py-3 text-right">Belum di Master (ID Diff)</th>
                        <th className="px-4 py-3 text-center">Progress</th>
                        <th className="px-4 py-3 text-center">Aksi Cepat</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {filteredPods.map((pod) => {
                        const isTargetThis = isPulling && targetScope === String(pod.id);
                        const percentSynced =
                          pod.totalRows > 0
                            ? Math.min(100, Math.round(((pod.masterRows || 0) / pod.totalRows) * 100))
                            : 100;

                        return (
                          <tr
                            key={pod.id}
                            className={`transition-colors ${
                              isTargetThis
                                ? 'bg-rose-500/10 border-l-2 border-rose-500'
                                : 'hover:bg-slate-900/40'
                            }`}
                          >
                            <td className="px-4 py-3 font-semibold text-white">
                              <div className="flex items-center gap-2">
                                <span>{pod.name}</span>
                                <span className="text-[10px] px-1.5 py-0.2 bg-cyan-500/20 text-cyan-300 font-mono rounded font-bold border border-cyan-500/30">
                                  V3
                                </span>
                              </div>
                            </td>
                            <td className="px-4 py-3 font-mono text-cyan-300">
                              {pod.host}
                            </td>
                            <td className="px-4 py-3">
                              {pod.isOnline ? (
                                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> Online
                                </span>
                              ) : (
                                <span
                                  className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-rose-500/15 text-rose-300 border border-rose-500/30"
                                  title={pod.error}
                                >
                                  Offline
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-right font-mono font-bold text-slate-200">
                              {pod.isOnline ? pod.totalRows.toLocaleString() : '-'}
                            </td>
                            <td className="px-4 py-3 text-right font-mono font-bold text-indigo-300">
                              {pod.isOnline ? (pod.masterRows || 0).toLocaleString() : '-'}
                            </td>
                            <td className="px-4 py-3 text-right font-mono font-bold">
                              {pod.isOnline ? (
                                <span className={pod.unsyncedRows > 0 ? 'text-amber-400' : 'text-emerald-400'}>
                                  {pod.unsyncedRows.toLocaleString()}
                                </span>
                              ) : (
                                '-'
                              )}
                            </td>
                            <td className="px-4 py-3 text-center">
                              {pod.isOnline ? (
                                <span className="font-mono text-[11px] text-slate-400">
                                  {percentSynced}%
                                </span>
                              ) : '-'}
                            </td>
                            <td className="px-4 py-3 text-center">
                              <div className="flex items-center justify-center gap-1.5">
                                <button
                                  onClick={() => setDiffModalPod(pod)}
                                  className="px-2.5 py-1 bg-slate-800 hover:bg-cyan-500/20 text-cyan-300 border border-slate-700 hover:border-cyan-500/30 rounded-lg text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1"
                                  title="Buka Komparasi Detail POD vs Master"
                                >
                                  <Eye size={12} />
                                  <span>Bandingkan</span>
                                </button>
                                <button
                                  onClick={() => handleStartPull(pod.id)}
                                  disabled={isPulling || !pod.isOnline}
                                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1 ${
                                    pod.unsyncedRows > 0
                                      ? 'bg-rose-600/30 hover:bg-rose-600/50 text-rose-300 border border-rose-500/40 font-bold'
                                      : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700'
                                  }`}
                                  title={pod.unsyncedRows > 0 ? `Tarik ${pod.unsyncedRows.toLocaleString()} log yang belum ada di Master` : 'Sinkronkan ulang unit ini ke Master'}
                                >
                                  <Zap size={12} className={pod.unsyncedRows > 0 ? 'text-amber-400' : 'text-slate-400'} />
                                  <span>{pod.unsyncedRows > 0 ? `Tarik (${pod.unsyncedRows.toLocaleString()})` : 'Tarik'}</span>
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: MASTER DATA EXPLORER */}
      {activeTab === 'explorer' && (
        <div className="flex flex-col gap-4">
          {/* Explorer Filter Bar */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 shadow-xl flex items-center justify-between gap-3 flex-wrap">
            <form onSubmit={handleApplyExplorerSearch} className="flex items-center gap-3 flex-wrap flex-1">
              {/* Search Bar */}
              <div className="relative min-w-[240px] flex-1">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={filterSearch}
                  onChange={(e) => setFilterSearch(e.target.value)}
                  placeholder="Cari kata kunci di code, value, payload data..."
                  className="w-full pl-8 pr-3 py-1.5 bg-slate-950 border border-slate-700 text-xs text-slate-200 rounded-xl focus:outline-none focus:border-indigo-500"
                />
              </div>

              {/* POD V3 Unit Dropdown Selector */}
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-slate-400">Unit POD:</span>
                <select
                  value={filterPodId}
                  onChange={(e) => {
                    setFilterPodId(e.target.value);
                    setExplorerPage(1);
                  }}
                  className="bg-slate-950 border border-slate-700 text-slate-200 text-xs rounded-xl px-3 py-1.5 focus:outline-none focus:border-indigo-500 cursor-pointer"
                >
                  <option value="">Semua Unit POD V3</option>
                  {v3Pods.map((p) => (
                    <option key={p.id} value={p.pod_uuid || ''}>
                      {p.name} (#{p.code})
                    </option>
                  ))}
                </select>
              </div>

              {/* Activity Type Dropdown */}
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-slate-400">Aktivitas:</span>
                <select
                  value={filterActivityType}
                  onChange={(e) => {
                    setFilterActivityType(e.target.value);
                    setExplorerPage(1);
                  }}
                  className="bg-slate-950 border border-slate-700 text-slate-200 text-xs rounded-xl px-3 py-1.5 focus:outline-none focus:border-indigo-500 cursor-pointer"
                >
                  <option value="ALL">Semua Aktivitas</option>
                  {activityTypes.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </div>

              <button
                type="submit"
                className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold cursor-pointer transition-colors"
              >
                Terapkan
              </button>
            </form>

            <button
              onClick={loadExplorerData}
              disabled={isLoadingExplorer}
              className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs border border-slate-700 cursor-pointer"
              title="Refresh Data"
            >
              <RefreshCw size={14} className={isLoadingExplorer ? 'animate-spin' : ''} />
            </button>
          </div>

          {/* Master Explorer Data Table */}
          <div className="bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl flex flex-col">
            <div className="bg-slate-900/90 border-b border-slate-800 px-4 py-3 flex items-center justify-between gap-3 flex-wrap">
              <span className="text-xs font-semibold text-slate-300">
                Menampilkan <b className="text-white">{explorerRows.length}</b> dari{' '}
                <b className="text-indigo-400">{explorerTotalRows.toLocaleString()}</b> total baris di Master DB
              </span>

              {/* Rows Per Page */}
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <span>Per Halaman:</span>
                <select
                  value={explorerLimit}
                  onChange={(e) => {
                    setExplorerLimit(parseInt(e.target.value, 10));
                    setExplorerPage(1);
                  }}
                  className="bg-slate-900 border border-slate-700 text-slate-200 rounded-lg px-2 py-1 text-xs"
                >
                  <option value="10">10</option>
                  <option value="25">25</option>
                  <option value="50">50</option>
                  <option value="100">100</option>
                </select>
              </div>
            </div>

            {isLoadingExplorer ? (
              <div className="p-16 flex flex-col items-center justify-center text-slate-400">
                <RefreshCw size={24} className="animate-spin text-indigo-400 mb-2" />
                <span className="text-xs">Mengambil baris data dari Master Database...</span>
              </div>
            ) : explorerError ? (
              <div className="p-8 text-center text-rose-400 text-xs">
                <AlertCircle size={24} className="mx-auto mb-2 text-rose-400" />
                <span>{explorerError}</span>
              </div>
            ) : explorerRows.length === 0 ? (
              <div className="p-16 text-center text-slate-500 text-xs">
                Tidak ada baris data yang cocok dengan kriteria pencarian.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="bg-slate-900/50 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
                    <tr>
                      <th className="px-4 py-3">Waktu (Created At)</th>
                      <th className="px-4 py-3">Tipe Aktivitas</th>
                      <th className="px-4 py-3">Value</th>
                      <th className="px-4 py-3">Code</th>
                      <th className="px-4 py-3">POD ID</th>
                      <th className="px-4 py-3">User ID</th>
                      <th className="px-4 py-3 text-center">Payload Data</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-mono">
                    {explorerRows.map((row) => (
                      <tr key={row.id} className="hover:bg-slate-900/40 transition-colors">
                        <td className="px-4 py-3 text-slate-300 whitespace-nowrap">
                          {row.created_at ? new Date(row.created_at).toLocaleString('id-ID') : '-'}
                        </td>
                        <td className="px-4 py-3 font-sans">
                          <span className={`px-2 py-0.5 rounded border text-[11px] font-semibold ${formatActivityBadge(row.activity_type)}`}>
                            {row.activity_type || '-'}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-bold text-white">
                          {row.value || '-'}
                        </td>
                        <td className="px-4 py-3 text-cyan-300">
                          {row.code || '-'}
                        </td>
                        <td className="px-4 py-3 font-sans">
                          {(() => {
                            const podInfo = podUuidMap[row.pod_id];
                            if (podInfo) {
                              return (
                                <span
                                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 whitespace-nowrap shadow-sm"
                                  title={`IP: ${podInfo.host} • Code: #${podInfo.code} • UUID: ${row.pod_id}`}
                                >
                                  <Server size={11} className="text-cyan-400 shrink-0" />
                                  <span>{podInfo.name}</span>
                                  <span className="text-[10px] text-cyan-400 font-mono font-normal">#{podInfo.code}</span>
                                </span>
                              );
                            }
                            return (
                              <span className="text-slate-400 font-mono text-[11px] truncate max-w-[120px] block" title={row.pod_id}>
                                {row.pod_id || '-'}
                              </span>
                            );
                          })()}
                        </td>
                        <td className="px-4 py-3 text-slate-400 truncate max-w-[120px]" title={row.user_id}>
                          {row.user_id || '-'}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <button
                            onClick={() => setSelectedJsonRow(row)}
                            className="px-2 py-1 bg-slate-800 hover:bg-indigo-500/20 text-indigo-300 border border-slate-700 hover:border-indigo-500/40 rounded-lg text-xs font-sans font-semibold transition-colors cursor-pointer inline-flex items-center gap-1"
                          >
                            <Eye size={12} />
                            <span>Lihat JSON</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Pagination Controls */}
            {explorerTotalPages > 1 && (
              <div className="bg-slate-900/80 border-t border-slate-800 px-4 py-3 flex items-center justify-between text-xs">
                <span className="text-slate-400">
                  Halaman <b className="text-white">{explorerPage}</b> dari <b className="text-white">{explorerTotalPages}</b>
                </span>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setExplorerPage((p) => Math.max(p - 1, 1))}
                    disabled={explorerPage <= 1}
                    className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg border border-slate-700 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                  >
                    <ChevronLeft size={15} />
                  </button>
                  <button
                    onClick={() => setExplorerPage((p) => Math.min(p + 1, explorerTotalPages))}
                    disabled={explorerPage >= explorerTotalPages}
                    className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg border border-slate-700 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                  >
                    <ChevronRight size={15} />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* JSON Viewer Modal */}
      {selectedJsonRow && (
        <div className="fixed inset-0 z-[1200] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-950 border border-slate-800 rounded-2xl w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="bg-slate-900/90 border-b border-slate-800 px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-2 min-w-0">
                <FileCode size={16} className="text-indigo-400 shrink-0" />
                <h3 className="text-xs font-mono font-bold text-white truncate">
                  Log ID: {selectedJsonRow.id}
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleCopyJson}
                  className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-semibold flex items-center gap-1 border border-slate-700 cursor-pointer"
                >
                  {isCopiedJson ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
                  <span>{isCopiedJson ? 'Tersalin' : 'Copy JSON'}</span>
                </button>
                <button
                  onClick={() => setSelectedJsonRow(null)}
                  className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            {/* Modal Content */}
            <div className="p-4 overflow-y-auto flex flex-col gap-3 font-mono text-xs">
              <div className="grid grid-cols-2 gap-2 text-[11px] bg-slate-900/60 p-2.5 rounded-xl border border-slate-800">
                <div>
                  <span className="text-slate-500">Activity Type:</span>{' '}
                  <span className="text-purple-300 font-bold">{selectedJsonRow.activity_type}</span>
                </div>
                <div>
                  <span className="text-slate-500">Value:</span>{' '}
                  <span className="text-white font-bold">{selectedJsonRow.value}</span>
                </div>
                <div>
                  <span className="text-slate-500">Code:</span>{' '}
                  <span className="text-cyan-300">{selectedJsonRow.code}</span>
                </div>
                <div>
                  <span className="text-slate-500">Waktu:</span>{' '}
                  <span className="text-slate-300">{new Date(selectedJsonRow.created_at).toLocaleString('id-ID')}</span>
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <span className="text-[11px] text-slate-400 font-semibold">Isi Kolom `data` (JSON Payload):</span>
                <pre className="p-3 bg-[#090d16] border border-slate-800 rounded-xl text-emerald-300 text-[11.5px] leading-relaxed overflow-x-auto whitespace-pre-wrap select-text">
                  {(() => {
                    try {
                      const parsed = JSON.parse(selectedJsonRow.data);
                      return JSON.stringify(parsed, null, 2);
                    } catch (_) {
                      return selectedJsonRow.data || '(Kosong)';
                    }
                  })()}
                </pre>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Single POD Diff & Comparison Modal */}
      {diffModalPod && (
        <PodLogsDiffModal
          isOpen={!!diffModalPod}
          onClose={() => setDiffModalPod(null)}
          masterId={selectedMasterId}
          pod={diffModalPod}
          onSyncCompleted={() => {
            runAudit(selectedMasterId);
            if (activeTab === 'explorer') loadExplorerData();
          }}
        />
      )}
    </div>
  );
}
