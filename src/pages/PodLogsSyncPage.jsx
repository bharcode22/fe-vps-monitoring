import React, { useState, useEffect, useMemo } from 'react';
import {
  RefreshCw,
  AlertCircle,
  Zap,
  Layers,
  LayoutGrid,
  List,
  Server,
  Search,
  X
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

// Modular Components
import PodLogsHeader from '../components/podLogs/PodLogsHeader';
import PodLogsStatsCards from '../components/podLogs/PodLogsStatsCards';
import PodLogsConfigCard from '../components/podLogs/PodLogsConfigCard';
import PodLogsFleetGrid from '../components/podLogs/PodLogsFleetGrid';
import PodLogsFleetTable from '../components/podLogs/PodLogsFleetTable';
import PodLogsExplorerTab from '../components/podLogs/PodLogsExplorerTab';
import PodLogsJsonPreviewModal from '../components/podLogs/PodLogsJsonPreviewModal';
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

  const runAudit = async (masterId = selectedMasterId) => {
    if (!masterId) return;
    setIsLoadingAudit(true);
    setAuditError('');
    try {
      const audit = await fetchPodLogsAuditApi(masterId);
      setAuditData(audit);
    } catch (err) {
      setAuditError(err.message || 'Gagal melakukan audit baris pod_logs.');
    } finally {
      setIsLoadingAudit(false);
    }
  };

  // V3 Stats Summary Calculation
  const v3Pods = auditData?.pods || [];
  const v3Stats = useMemo(() => {
    const totalUnits = v3Pods.length;
    const onlineUnits = v3Pods.filter((p) => p.isOnline).length;
    const totalRows = v3Pods.reduce((sum, p) => sum + (p.totalRows || 0), 0);
    const totalMasterRows = v3Pods.reduce((sum, p) => sum + (p.masterRows || 0), 0);
    const totalUnsynced = v3Pods.reduce((sum, p) => sum + (p.unsyncedRows || 0), 0);
    const podsWithUnsynced = v3Pods.filter((p) => (p.unsyncedRows || 0) > 0).length;

    return {
      totalUnits,
      onlineUnits,
      totalRows,
      totalMasterRows,
      totalUnsynced,
      podsWithUnsynced
    };
  }, [v3Pods]);

  // Filtered POD V3 for Fleet View
  const filteredPods = useMemo(() => {
    return v3Pods.filter((pod) => {
      if (podFilterTab === 'UNSYNCED_ONLY' && (pod.unsyncedRows || 0) === 0) return false;
      if (podFilterTab === 'ONLINE_ONLY' && !pod.isOnline) return false;

      if (podSearchQuery) {
        const q = podSearchQuery.toLowerCase();
        const matchName = (pod.name || '').toLowerCase().includes(q);
        const matchHost = (pod.host || '').toLowerCase().includes(q);
        const matchCode = (pod.code || '').toLowerCase().includes(q);
        if (!matchName && !matchHost && !matchCode) return false;
      }
      return true;
    });
  }, [v3Pods, podFilterTab, podSearchQuery]);

  // Handle Tab Switch & load explorer data if needed
  useEffect(() => {
    if (activeTab === 'explorer') {
      loadMasterActivityTypes();
      loadExplorerData();
    }
  }, [activeTab, selectedMasterId, explorerPage, explorerLimit]);

  const loadMasterActivityTypes = async () => {
    if (!selectedMasterId) return;
    try {
      const types = await fetchMasterActivityTypesApi(selectedMasterId);
      setActivityTypes(types || []);
    } catch (_) { }
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
        activityType: filterActivityType,
        podId: filterPodId,
        search: filterSearch
      });
      setExplorerRows(res.rows || []);
      setExplorerTotalRows(res.totalRows || 0);
      setExplorerTotalPages(res.totalPages || 1);
    } catch (err) {
      setExplorerError(err.message || 'Gagal memuat data dari Master RDS.');
    } finally {
      setIsLoadingExplorer(false);
    }
  };

  const handleApplyExplorerSearch = (e) => {
    e?.preventDefault();
    setExplorerPage(1);
    loadExplorerData();
  };

  // Handle Pull Sync Execution
  const handleStartPull = async (forcedPodId = null) => {
    const activeTarget = forcedPodId || targetScope;
    const targetPodIds =
      activeTarget === 'ALL'
        ? v3Pods.filter((p) => p.isOnline).map((p) => p.id)
        : [parseInt(activeTarget, 10)];

    if (targetPodIds.length === 0) {
      alert('Tidak ada POD V3 yang online untuk ditarik datanya.');
      return;
    }

    const podNames =
      activeTarget === 'ALL'
        ? 'Semua POD V3 yang Online'
        : v3Pods.find((p) => p.id === targetPodIds[0])?.name || `POD #${targetPodIds[0]}`;

    const confirmMsg =
      `Mulai penarikan data pod_logs dari [${targetPodIds.length} Unit POD V3: ${podNames}] ke Master Database RDS?\n\n` +
      `• Target: Hanya Unit POD V3 (Non-V3 otomatis dikecualikan)\n` +
      `• Mode: ${pullMode === 'id_diff'
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
    setPullResult(null);
    setConsoleLogs([
      `[${new Date().toLocaleTimeString()}] Memulai pipeline penarikan pod_logs...`,
      `[${new Date().toLocaleTimeString()}] Master RDS Target: ${auditData?.master?.name} (${auditData?.master?.host})`,
      `[${new Date().toLocaleTimeString()}] Target Armada: ${targetPodIds.length} unit POD V3 (Mode: ${pullMode})`,
      `[${new Date().toLocaleTimeString()}] Eksekusi batching sedang berjalan...`
    ]);

    try {
      const payload = {
        masterId: selectedMasterId,
        podIds: targetPodIds,
        mode: pullMode,
        batchSize,
        markSyncedOnPod,
        datePreset,
        customDateFrom: pullMode === 'date_range' ? customDateFrom : undefined,
        customDateTo: pullMode === 'date_range' ? customDateTo : undefined
      };

      const result = await executePullPodLogsApi(payload);
      setPullResult(result);

      // Append log output
      const newLogs = [...consoleLogs];
      newLogs.push(`[${new Date().toLocaleTimeString()}] SELESAI! ${result.message || 'Penarikan berhasil'}`);
      if (result.results && result.results.length > 0) {
        result.results.forEach((r) => {
          if (r.success) {
            newLogs.push(
              `  ✓ [${r.podName} V3] Sukses menyimpan ${r.pulledCount.toLocaleString()} baris log ke Master.`
            );
          } else {
            newLogs.push(`  ✗ [${r.podName} V3] GAGAL: ${r.error}`);
          }
        });
      }
      setConsoleLogs(newLogs);

      // Re-run audit to show fresh metrics
      await runAudit(selectedMasterId);
      if (activeTab === 'explorer') loadExplorerData();
    } catch (err) {
      setConsoleLogs((prev) => [
        ...prev,
        `[${new Date().toLocaleTimeString()}] ERROR: ${err.message || 'Gagal mengeksekusi pipeline penarikan'}`
      ]);
      alert(`Gagal menarik data: ${err.message}`);
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
          className="mt-4 px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-semibold cursor-pointer transition-colors"
        >
          Coba Lagi
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5 pb-12">
      {/* 1. Top Banner & Master DB Selector */}
      <PodLogsHeader
        masters={masters}
        selectedMasterId={selectedMasterId}
        onSelectMaster={(id) => {
          setSelectedMasterId(id);
          runAudit(id);
        }}
        onRefreshAudit={() => runAudit(selectedMasterId)}
        isLoadingAudit={isLoadingAudit}
        isPulling={isPulling}
      />

      {/* 2. Navigation View Switcher (Audit & Pull vs Master Explorer) */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-2 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('sync')}
            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer border ${activeTab === 'sync'
              ? 'bg-rose-500/20 border-rose-500/40 text-rose-300 shadow-md shadow-rose-500/10'
              : 'bg-white/5 border-transparent text-slate-400 hover:text-slate-200 hover:bg-white/10'
              }`}
          >
            <Zap size={15} />
            <span>1. Sinkronisasi &amp; Armada POD V3 ({v3Stats.totalUnits} Unit)</span>
          </button>

          <button
            onClick={() => setActiveTab('explorer')}
            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer border ${activeTab === 'explorer'
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
                className={`p-1.5 rounded-md transition-colors ${fleetViewMode === 'cards' ? 'bg-slate-800 text-white font-bold' : 'text-slate-400 hover:text-slate-200'
                  }`}
                title="Tampilan Kartu Grid"
              >
                <LayoutGrid size={14} />
              </button>
              <button
                onClick={() => setFleetViewMode('table')}
                className={`p-1.5 rounded-md transition-colors ${fleetViewMode === 'table' ? 'bg-slate-800 text-white font-bold' : 'text-slate-400 hover:text-slate-200'
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
          <PodLogsStatsCards auditData={auditData} v3Stats={v3Stats} />

          {/* Control Panel: Configuration & Pull Trigger */}
          <PodLogsConfigCard
            v3Stats={v3Stats}
            v3Pods={v3Pods}
            targetScope={targetScope}
            onTargetScopeChange={setTargetScope}
            pullMode={pullMode}
            onPullModeChange={setPullMode}
            batchSize={batchSize}
            onBatchSizeChange={setBatchSize}
            markSyncedOnPod={markSyncedOnPod}
            onMarkSyncedOnPodChange={setMarkSyncedOnPod}
            datePreset={datePreset}
            onDatePresetChange={setDatePreset}
            customDateFrom={customDateFrom}
            onCustomDateFromChange={setCustomDateFrom}
            customDateTo={customDateTo}
            onCustomDateToChange={setCustomDateTo}
            isPulling={isPulling}
            isLoadingAudit={isLoadingAudit}
            onStartPull={handleStartPull}
            consoleLogs={consoleLogs}
            pullResult={pullResult}
          />

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
                    className={`px-3 py-1 rounded-xl text-xs font-medium flex items-center gap-1.5 transition-all cursor-pointer border ${isActive
                      ? 'bg-rose-500/20 border-rose-500/40 text-rose-300 shadow-sm'
                      : 'bg-white/5 border-transparent text-slate-400 hover:text-slate-200'
                      }`}
                  >
                    <span>{tab.label}</span>
                    <span
                      className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold ${isActive ? 'bg-rose-500/30 text-rose-200' : 'bg-slate-800 text-slate-400'
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
            <PodLogsFleetGrid
              filteredPods={filteredPods}
              isLoadingAudit={isLoadingAudit}
              isPulling={isPulling}
              targetScope={targetScope}
              onOpenDiffModal={setDiffModalPod}
              onStartPull={handleStartPull}
            />
          )}

          {/* FLEET VIEW: TABLE MODE */}
          {fleetViewMode === 'table' && (
            <PodLogsFleetTable
              filteredPods={filteredPods}
              totalPodsCount={v3Pods.length}
              isLoadingAudit={isLoadingAudit}
              auditError={auditError}
              isPulling={isPulling}
              targetScope={targetScope}
              onOpenDiffModal={setDiffModalPod}
              onStartPull={handleStartPull}
            />
          )}
        </div>
      )}

      {/* TAB 2: MASTER DATA EXPLORER */}
      {activeTab === 'explorer' && (
        <PodLogsExplorerTab
          filterSearch={filterSearch}
          onFilterSearchChange={setFilterSearch}
          filterPodId={filterPodId}
          onFilterPodIdChange={setFilterPodId}
          filterActivityType={filterActivityType}
          onFilterActivityTypeChange={setFilterActivityType}
          v3Pods={v3Pods}
          activityTypes={activityTypes}
          podUuidMap={podUuidMap}
          onApplySearch={handleApplyExplorerSearch}
          onRefreshExplorer={loadExplorerData}
          isLoadingExplorer={isLoadingExplorer}
          explorerError={explorerError}
          explorerRows={explorerRows}
          explorerTotalRows={explorerTotalRows}
          explorerLimit={explorerLimit}
          onExplorerLimitChange={setExplorerLimit}
          explorerPage={explorerPage}
          explorerTotalPages={explorerTotalPages}
          onExplorerPageChange={setExplorerPage}
          onSelectJsonRow={setSelectedJsonRow}
        />
      )}

      {/* JSON Viewer Modal */}
      <PodLogsJsonPreviewModal
        selectedJsonRow={selectedJsonRow}
        onClose={() => setSelectedJsonRow(null)}
        isCopiedJson={isCopiedJson}
        onCopyJson={handleCopyJson}
      />

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
