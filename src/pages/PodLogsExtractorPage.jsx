import React, { useState, useEffect, useCallback } from 'react';
import {
  Layers,
  ArrowLeft,
  Activity,
  Play,
  RotateCw,
  AlertCircle,
  Database,
  LineChart,
  BarChart3,
  Sparkles
} from 'lucide-react';
import {
  fetchExtractorMastersApi,
  fetchExtractorStatsApi,
  executeExtractionApi
} from '../api/podLogsExtractorApi';
import { useSocket } from '../hooks/useSocket';

// Child Components
import ExtractorStatsCards from '../components/podLogsExtractor/ExtractorStatsCards';
import ExtractorConfigCard from '../components/podLogsExtractor/ExtractorConfigCard';
import ExtractorProgressConsole from '../components/podLogsExtractor/ExtractorProgressConsole';
import SessionMonitoringTab from '../components/podLogsExtractor/SessionMonitoringTab';

export default function PodLogsExtractorPage({ onBack, onNavigateView }) {
  // Tabs: 'execution' (Eksekusi Ekstraksi Data) | 'monitoring' (Menampilkan Data Monitoring)
  const [activeTab, setActiveTab] = useState('execution');

  // Master databases & stats state
  const [masters, setMasters] = useState([]);
  const [selectedMasterId, setSelectedMasterId] = useState(null);
  const [stats, setStats] = useState(null);
  const [isLoadingInitial, setIsLoadingInitial] = useState(true);
  const [isLoadingStats, setIsLoadingStats] = useState(false);
  const [error, setError] = useState('');

  // Extractor form config state
  const [scope, setScope] = useState('UNEXTRACTED_ONLY');
  const [batchSize, setBatchSize] = useState(500);
  const [podCode, setPodCode] = useState('ALL');
  const [activityType, setActivityType] = useState('ALL');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [maxLogs, setMaxLogs] = useState('');

  // Execution & Progress state
  const [isExtracting, setIsExtracting] = useState(false);
  const [progress, setProgress] = useState({
    status: 'IDLE',
    percentage: 0,
    processed: 0,
    totalLogs: 0,
    speed: 0,
    createdExtractedCount: 0,
    createdSessionCount: 0,
    createdAuthCount: 0,
    skippedCount: 0,
    message: ''
  });
  const [logs, setLogs] = useState([]);

  // Socket.IO for real-time progress broadcast
  const { socket } = useSocket();

  // Initial load: Fetch master databases
  useEffect(() => {
    let isMounted = true;

    async function init() {
      setIsLoadingInitial(true);
      setError('');
      try {
        const mastersList = await fetchExtractorMastersApi();
        if (!isMounted) return;

        setMasters(mastersList);
        if (mastersList.length > 0) {
          // Select AWS Master Prod or first master by default
          const defaultMaster = mastersList.find((m) =>
            m.name.toLowerCase().includes('aws') || m.name.toLowerCase().includes('prod')
          ) || mastersList[0];

          setSelectedMasterId(defaultMaster.id);
        }
      } catch (err) {
        if (isMounted) setError(err.message || 'Gagal memuat daftar master database');
      } finally {
        if (isMounted) setIsLoadingInitial(false);
      }
    }

    init();
    return () => {
      isMounted = false;
    };
  }, []);

  // Fetch stats when selectedMasterId changes
  const loadStats = useCallback(async (masterId) => {
    if (!masterId) return;
    setIsLoadingStats(true);
    try {
      const data = await fetchExtractorStatsApi(masterId);
      setStats(data);
    } catch (err) {
      console.error('Error fetching stats:', err);
      // keep prior stats if available
    } finally {
      setIsLoadingStats(false);
    }
  }, []);

  useEffect(() => {
    if (selectedMasterId) {
      loadStats(selectedMasterId);
    }
  }, [selectedMasterId, loadStats]);

  // Socket.IO event handler for live progress
  useEffect(() => {
    if (!socket) return;

    const handleSocketProgress = (data) => {
      if (!isExtracting) return;
      setProgress((prev) => ({
        ...prev,
        ...data
      }));

      if (data.message) {
        setLogs((prev) => [
          ...prev,
          {
            timestamp: new Date().toLocaleTimeString(),
            type: data.status === 'ERROR' ? 'ERROR' : data.status === 'DONE' ? 'SUCCESS' : 'PROGRESS',
            message: data.message
          }
        ]);
      }
    };

    socket.on('podLogsExtractor:progress', handleSocketProgress);

    return () => {
      socket.off('podLogsExtractor:progress', handleSocketProgress);
    };
  }, [socket, isExtracting]);

  // Execute extraction handler
  const handleExecute = async () => {
    if (!selectedMasterId) {
      alert('Pilih Master Database terlebih dahulu');
      return;
    }

    setIsExtracting(true);
    setProgress({
      status: 'STARTING',
      percentage: 0,
      processed: 0,
      totalLogs: stats?.unextractedCount || 0,
      speed: 0,
      createdExtractedCount: 0,
      createdSessionCount: 0,
      createdAuthCount: 0,
      skippedCount: 0,
      message: 'Mempersiapkan ekstraksi...'
    });

    const startTime = new Date().toLocaleTimeString();
    setLogs((prev) => [
      ...prev,
      {
        timestamp: startTime,
        type: 'INFO',
        message: `Memulai ekstraksi [Scope: ${scope}, Batch: ${batchSize}, POD: ${podCode}, Activity: ${activityType}]`
      }
    ]);

    try {
      const payload = {
        masterId: selectedMasterId,
        scope,
        batchSize,
        podCode: podCode === 'ALL' ? null : podCode,
        activityType: activityType === 'ALL' ? null : activityType,
        dateFrom: dateFrom || null,
        dateTo: dateTo || null,
        maxLogs: maxLogs ? Number(maxLogs) : null
      };

      const result = await executeExtractionApi(payload, (streamData) => {
        setProgress((prev) => ({
          ...prev,
          ...streamData
        }));

        if (streamData.message) {
          setLogs((prevLogs) => [
            ...prevLogs,
            {
              timestamp: new Date().toLocaleTimeString(),
              type: streamData.status === 'ERROR' ? 'ERROR' : streamData.status === 'DONE' ? 'SUCCESS' : 'PROGRESS',
              message: streamData.message
            }
          ]);
        }
      });

      // Complete
      setProgress((prev) => ({
        ...prev,
        status: 'DONE',
        percentage: 100,
        message: `Selesai! Berhasil memproses ${result?.processed || 0} log (${result?.durationSeconds || 0} detik)`
      }));

      setLogs((prev) => [
        ...prev,
        {
          timestamp: new Date().toLocaleTimeString(),
          type: 'SUCCESS',
          message: `Ekstraksi sukses selesai! +${result?.createdSessionCount || 0} sesi, +${result?.createdAuthCount || 0} auth, +${result?.createdExtractedCount || 0} extracted baris.`
        }
      ]);

      // Automatically refresh stats after extraction finishes
      await loadStats(selectedMasterId);
    } catch (err) {
      console.error('Extraction error:', err);
      setProgress((prev) => ({
        ...prev,
        status: 'ERROR',
        message: err.message || 'Gagal mengeksekusi ekstraksi'
      }));

      setLogs((prev) => [
        ...prev,
        {
          timestamp: new Date().toLocaleTimeString(),
          type: 'ERROR',
          message: `ERROR: ${err.message || 'Ekstraksi gagal'}`
        }
      ]);
    } finally {
      setIsExtracting(false);
    }
  };

  const handleClearLogs = () => {
    setLogs([]);
  };

  if (isLoadingInitial) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-slate-400">
        <div className="p-4 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 mb-4 animate-bounce">
          <Layers size={32} />
        </div>
        <p className="text-sm font-semibold text-slate-300">Memuat modul POD Logs Extractor...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 pb-12 w-full">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-slate-850">
        <div className="flex items-center gap-3">
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-850 transition-colors"
              title="Kembali ke Dashboard"
            >
              <ArrowLeft size={18} />
            </button>
          )}
          <div className="p-2.5 rounded-xl bg-gradient-to-br from-cyan-500/20 to-blue-600/20 border border-cyan-500/30 text-cyan-400">
            <Layers size={22} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                POD Logs Extractor & Analyzer
              </h1>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                PROD
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Ekstraksi JSON dari <code className="text-cyan-300">pod_logs</code> ke tabel analitik{' '}
              <code className="text-purple-300">play_sesion_detail</code> dan{' '}
              <code className="text-emerald-300">auth_detail</code>
            </p>
          </div>
        </div>

        {/* Tab Switcher Pills */}
        <div className="flex items-center p-1 rounded-xl bg-slate-900 border border-slate-800">
          <button
            type="button"
            onClick={() => setActiveTab('execution')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${activeTab === 'execution'
              ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20'
              : 'text-slate-400 hover:text-white'
              }`}
          >
            <Activity size={14} />
            <span>Eksekusi Ekstraksi</span>
            {stats?.unextractedCount > 0 && (
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${activeTab === 'execution'
                  ? 'bg-slate-950 text-cyan-300'
                  : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                  }`}
              >
                {stats.unextractedCount > 999 ? '999+' : stats.unextractedCount}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('monitoring')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${activeTab === 'monitoring'
              ? 'bg-purple-600 text-white shadow-md shadow-purple-600/20'
              : 'text-slate-400 hover:text-white'
              }`}
          >
            <BarChart3 size={14} />
            <span>Data Monitoring</span>
          </button>
        </div>
      </div>

      {/* Global Error Banner */}
      {error && (
        <div className="flex items-center gap-3 p-4 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs mb-6">
          <AlertCircle size={18} className="shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* TAB 1: EKSEKUSI EKSTRAKSI DATA (PRIMARY FOCUS) */}
      {activeTab === 'execution' && (
        <>
          {/* Top Live Statistics Cards */}
          <ExtractorStatsCards
            stats={stats}
            isLoading={isLoadingStats}
            onRefresh={() => loadStats(selectedMasterId)}
          />

          {/* Configuration Form Card */}
          <ExtractorConfigCard
            masters={masters}
            selectedMasterId={selectedMasterId}
            onSelectMaster={setSelectedMasterId}
            scope={scope}
            setScope={setScope}
            batchSize={batchSize}
            setBatchSize={setBatchSize}
            podCode={podCode}
            setPodCode={setPodCode}
            activityType={activityType}
            setActivityType={setActivityType}
            dateFrom={dateFrom}
            setDateFrom={setDateFrom}
            dateTo={dateTo}
            setDateTo={setDateTo}
            maxLogs={maxLogs}
            setMaxLogs={setMaxLogs}
            registeredPods={stats?.registeredPods || []}
            activityTypeBreakdown={stats?.activityTypeBreakdown || []}
            isExtracting={isExtracting}
            onExecute={handleExecute}
            onRefreshStats={() => loadStats(selectedMasterId)}
            isLoadingStats={isLoadingStats}
          />

          {/* Progress Bar & Live Monospace Console */}
          <ExtractorProgressConsole
            isExtracting={isExtracting}
            progress={progress}
            logs={logs}
            onClearLogs={handleClearLogs}
          />
        </>
      )}

      {/* TAB 2: DATA MONITORING (USER & SESSION PER DATE & POD) */}
      {activeTab === 'monitoring' && (
        <SessionMonitoringTab
          masters={masters}
          selectedMasterId={selectedMasterId}
          onSelectMaster={setSelectedMasterId}
          registeredPods={stats?.registeredPods || []}
          onDataCleaned={() => {
            if (selectedMasterId) loadStats(selectedMasterId);
          }}
        />
      )}
    </div>
  );
}
