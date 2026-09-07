import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';

import { fetchServersApi } from '../api/vpsApi';
import {
  fetchPodLogDatesApi,
  fetchPodStorageFilesApi,
  fetchPodFileContentApi,
  fetchPodFileMetricsApi,
  getPodHeartbeatsDownloadUrl
} from '../api/podActivityApi';

import PodRecordsTopHeader from '../components/podRecords/PodRecordsTopHeader';
import PodRecordsSidebar from '../components/podRecords/PodRecordsSidebar';
import PodRecordsSubHeader from '../components/podRecords/PodRecordsSubHeader';
import PodRecordsFilterToolbar from '../components/podRecords/PodRecordsFilterToolbar';
import PodRecordsFilesView from '../components/podRecords/PodRecordsFilesView';
import PodRecordsJsonView from '../components/podRecords/PodRecordsJsonView';
import PodRecordsMetricChartView from '../components/podRecords/PodRecordsMetricChartView';

export default function PodHeartbeatRecordsPage({ initialPodId = null, onBack }) {
  // 1. Server / POD Selection States
  const [podServers, setPodServers] = useState([]);
  const [selectedPodId, setSelectedPodId] = useState(initialPodId ? Number(initialPodId) : null);
  const [serverSearch, setServerSearch] = useState('');
  const [isServerLoading, setIsServerLoading] = useState(true);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  // Helper for current local calendar date YYYY-MM-DD
  const getTodayLocalDate = () => {
    try {
      return new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Asia/Makassar',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      }).format(new Date());
    } catch (_) {
      return new Date().toLocaleDateString('sv-SE');
    }
  };

  // 2. Dates & Categories States
  const [availableDates, setAvailableDates] = useState([]);
  const [selectedDate, setSelectedDate] = useState(getTodayLocalDate);
  const [activeCategory, setActiveCategory] = useState('heartbeats'); // 'heartbeats' | 'events' | 'state'
  const [viewMode, setViewMode] = useState('files'); // 'files' | 'chart' | 'json'
  const [activeFileName, setActiveFileName] = useState(null);
  const [activeFileMeta, setActiveFileMeta] = useState(null);
  const [storageFilesData, setStorageFilesData] = useState(null);
  const [isLoadingFiles, setIsLoadingFiles] = useState(false);

  // Chart Metric States
  const [chartInterval, setChartInterval] = useState('5m'); // '1m' | '5m' | '15m' | '1h'
  const [metricsData, setMetricsData] = useState(null);
  const [isLoadingMetrics, setIsLoadingMetrics] = useState(false);
  const [metricsError, setMetricsError] = useState(null);

  // 3. Filter States
  const [selectedModuleFilter, setSelectedModuleFilter] = useState('ALL');
  const [timePreset, setTimePreset] = useState('all'); // 'all' | '1h' | 'morning' | 'afternoon' | 'work' | 'custom'
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [sourceMode, setSourceMode] = useState('auto'); // 'auto' | 'file' | 'live'
  const [fetchLimit, setFetchLimit] = useState(500);

  // 4. Data States
  const [rawJsonString, setRawJsonString] = useState('');
  const [jsonFilterQuery, setJsonFilterQuery] = useState('');

  // 5. Status & Loading States
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingFile, setIsLoadingFile] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLivePolling, setIsLivePolling] = useState(false);
  const [error, setError] = useState(null);

  const pollTimerRef = useRef(null);

  // Fetch list of POD servers on mount (Strictly POD V3)
  useEffect(() => {
    async function loadPods() {
      setIsServerLoading(true);
      try {
        const data = await fetchServersApi('', 'pod');
        if (Array.isArray(data)) {
          // Strict Filter ONLY POD V3 servers: type === 'pod' and LOWER(pod_version) === 'v3'
          const pods = data.filter((s) => {
            const ver = String(s.pod_version || '').toLowerCase().trim();
            return s.type === 'pod' && ver === 'v3';
          });
          setPodServers(pods);

          // If initialPodId provided and in V3 pods, select it, otherwise pick first V3 pod
          if (initialPodId && pods.some((p) => Number(p.id) === Number(initialPodId))) {
            setSelectedPodId(Number(initialPodId));
          } else if (pods.length > 0) {
            setSelectedPodId((prevId) =>
              pods.some((p) => Number(p.id) === Number(prevId)) ? prevId : Number(pods[0].id)
            );
          }
        }
      } catch (err) {
        console.warn('Failed to load POD servers:', err.message);
      } finally {
        setIsServerLoading(false);
      }
    }
    loadPods();
  }, [initialPodId]);

  // 1. Fetch available log dates when selectedPodId changes
  useEffect(() => {
    if (!selectedPodId) return;

    let isMounted = true;
    async function loadDates() {
      try {
        const dates = await fetchPodLogDatesApi(selectedPodId);
        if (isMounted && Array.isArray(dates) && dates.length > 0) {
          setAvailableDates(dates);
          // If current selectedDate is not among the available dates, pick the latest recorded date
          setSelectedDate((prevDate) => (dates.includes(prevDate) ? prevDate : dates[0]));
        }
      } catch (err) {
        console.warn('Failed to load log dates:', err.message);
      }
    }

    loadDates();
    return () => {
      isMounted = false;
    };
  }, [selectedPodId]);

  // 2. Fetch physical storage files list filtered by date whenever selectedPodId or selectedDate changes
  const loadStorageFiles = useCallback(
    async (isBackground = false) => {
      if (!selectedPodId) return;

      if (!isBackground) setIsLoadingFiles(true);
      try {
        const filesRes = await fetchPodStorageFilesApi(selectedPodId, selectedDate);
        if (filesRes && filesRes.success) {
          setStorageFilesData(filesRes);
          if (Array.isArray(filesRes.dateFolders) && filesRes.dateFolders.length > 0) {
            const validDates = filesRes.dateFolders
              .map((df) => df.date)
              .filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d));
            if (validDates.length > 0) {
              setAvailableDates((prev) => (prev.length > 0 ? prev : validDates));
            }
          }
        }
      } catch (err) {
        console.warn('Failed to load storage files:', err.message);
      } finally {
        if (!isBackground) setIsLoadingFiles(false);
      }
    },
    [selectedPodId, selectedDate]
  );

  useEffect(() => {
    loadStorageFiles(false);
  }, [loadStorageFiles]);

  // 3. On-Demand file content loader: ONLY loads when a file is clicked or refreshed
  const loadFileContent = useCallback(
    async (fileName, customLimit = null, isBackground = false) => {
      if (!selectedPodId || !fileName) return;

      if (!isBackground) {
        setIsLoadingFile(true);
        setError(null);
      }

      try {
        const limitToUse = customLimit || fetchLimit;
        const res = await fetchPodFileContentApi(selectedPodId, fileName, selectedDate, limitToUse);
        if (res && res.success) {
          let contentStr = res.content || '';
          if (fileName.endsWith('.json')) {
            try {
              const parsed = JSON.parse(contentStr);
              contentStr = JSON.stringify(parsed, null, 2);
            } catch (_) { }
          }
          setRawJsonString(contentStr);
          setActiveFileMeta(res);
        } else {
          if (!isBackground) {
            setError(res?.error || `Gagal membaca berkas ${fileName}`);
            setRawJsonString('');
            setActiveFileMeta(null);
          }
        }
      } catch (err) {
        if (!isBackground) {
          setError(err.message || `Gagal membaca berkas ${fileName}`);
          setRawJsonString('');
          setActiveFileMeta(null);
        }
      } finally {
        if (!isBackground) setIsLoadingFile(false);
      }
    },
    [selectedPodId, selectedDate, fetchLimit]
  );

  // 4. Time-series chart metric loader (downsampled buckets)
  const loadChartMetrics = useCallback(
    async (fileName, customInterval = null, isBackground = false) => {
      if (!selectedPodId || !fileName) return;

      const intervalToUse = customInterval || chartInterval;
      if (!isBackground) {
        setIsLoadingMetrics(true);
        setMetricsError(null);
      }

      try {
        const res = await fetchPodFileMetricsApi(selectedPodId, fileName, selectedDate, intervalToUse);
        if (res && res.success) {
          setMetricsData(res);
        } else {
          if (!isBackground) {
            setMetricsError(res?.error || 'Gagal memuat metrik grafik');
            setMetricsData(null);
          }
        }
      } catch (err) {
        if (!isBackground) {
          setMetricsError(err.message || 'Gagal memuat metrik grafik');
          setMetricsData(null);
        }
      } finally {
        if (!isBackground) setIsLoadingMetrics(false);
      }
    },
    [selectedPodId, selectedDate, chartInterval]
  );

  // 5. Handle clicking a file in the files view
  const handleOpenFile = useCallback(
    async (file, preferredMode = null) => {
      if (!selectedPodId || !file?.name) return;

      setActiveFileName(file.name);
      if (file.type) setActiveCategory(file.type);
      if (file.moduleId !== undefined && file.moduleId !== null) {
        setSelectedModuleFilter(file.moduleId);
      }

      const targetMode = preferredMode || (file.name.endsWith('.jsonl') ? 'chart' : 'json');

      if (targetMode === 'chart' && file.name.endsWith('.jsonl')) {
        setViewMode('chart');
        loadChartMetrics(file.name, chartInterval, false);
        // Pre-fetch raw JSON in background so switching to JSON view is instant
        loadFileContent(file.name, fetchLimit, true);
      } else {
        setViewMode('json');
        loadFileContent(file.name, fetchLimit, false);
      }
    },
    [selectedPodId, chartInterval, fetchLimit, loadChartMetrics, loadFileContent]
  );

  // 6. Live Auto-Polling Effect (every 4 seconds)
  useEffect(() => {
    if (isLivePolling) {
      pollTimerRef.current = setInterval(() => {
        if (viewMode === 'chart' && activeFileName) {
          loadChartMetrics(activeFileName, chartInterval, true);
        } else if (viewMode === 'json' && activeFileName) {
          loadFileContent(activeFileName, fetchLimit, true);
        } else if (viewMode === 'files') {
          loadStorageFiles(true);
        }
      }, 4000);
    } else if (pollTimerRef.current) {
      clearInterval(pollTimerRef.current);
    }
    return () => {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    };
  }, [isLivePolling, viewMode, activeFileName, chartInterval, fetchLimit, loadChartMetrics, loadFileContent, loadStorageFiles]);

  // Selected server metadata & filtered list
  const currentPod = useMemo(() => {
    return podServers.find((p) => Number(p.id) === Number(selectedPodId)) || null;
  }, [podServers, selectedPodId]);

  const serverDisplayName = useMemo(() => {
    if (!currentPod) return `POD ${selectedPodId || ''}`;
    return currentPod.name || `POD ${currentPod.id}`;
  }, [currentPod, selectedPodId]);

  const safeFolderName = useMemo(() => {
    return serverDisplayName.trim().replace(/[\\/:*?"<>|]/g, '').replace(/\s+/g, '_');
  }, [serverDisplayName]);

  const filteredPods = useMemo(() => {
    return podServers.filter((p) => {
      const matchSearch =
        !serverSearch ||
        p.name?.toLowerCase().includes(serverSearch.toLowerCase()) ||
        p.host?.toLowerCase().includes(serverSearch.toLowerCase()) ||
        p.code?.toLowerCase().includes(serverSearch.toLowerCase());
      return matchSearch;
    });
  }, [podServers, serverSearch]);



  // Quick Preset Helper
  const handleApplyPreset = (preset) => {
    setTimePreset(preset);
    if (preset === 'all') {
      setStartTime('');
      setEndTime('');
    } else if (preset === '1h') {
      const now = new Date();
      const oneHourAgo = new Date(now.getTime() - 1 * 60 * 60 * 1000);
      setStartTime(oneHourAgo.toTimeString().slice(0, 5));
      setEndTime(now.toTimeString().slice(0, 5));
    } else if (preset === '3h') {
      const now = new Date();
      const threeHoursAgo = new Date(now.getTime() - 3 * 60 * 60 * 1000);
      setStartTime(threeHoursAgo.toTimeString().slice(0, 5));
      setEndTime(now.toTimeString().slice(0, 5));
    } else if (preset === '6h') {
      const now = new Date();
      const sixHoursAgo = new Date(now.getTime() - 6 * 60 * 60 * 1000);
      setStartTime(sixHoursAgo.toTimeString().slice(0, 5));
      setEndTime(now.toTimeString().slice(0, 5));
    } else if (preset === '12h') {
      const now = new Date();
      const twelveHoursAgo = new Date(now.getTime() - 12 * 60 * 60 * 1000);
      setStartTime(twelveHoursAgo.toTimeString().slice(0, 5));
      setEndTime(now.toTimeString().slice(0, 5));
    } else if (preset === 'morning') {
      setStartTime('06:00');
      setEndTime('12:00');
    } else if (preset === 'afternoon') {
      setStartTime('12:00');
      setEndTime('18:00');
    } else if (preset === 'work') {
      setStartTime('08:00');
      setEndTime('17:00');
    }
  };



  // Refresh handler for toolbar / header button
  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      if (viewMode === 'chart' && activeFileName) {
        await loadChartMetrics(activeFileName, chartInterval, false);
      } else if (viewMode === 'json' && activeFileName) {
        await loadFileContent(activeFileName, fetchLimit, false);
      } else {
        await loadStorageFiles(false);
      }
    } finally {
      setIsRefreshing(false);
    }
  };

  // Trigger file download
  const handleTriggerDownload = (format = 'json', customModuleId = undefined) => {
    if (!selectedPodId) return;
    const effectiveModuleId =
      customModuleId !== undefined
        ? customModuleId !== 'ALL'
          ? customModuleId
          : undefined
        : selectedModuleFilter !== 'ALL'
          ? selectedModuleFilter
          : undefined;

    const downloadUrl = getPodHeartbeatsDownloadUrl(selectedPodId, {
      date: selectedDate,
      moduleId: effectiveModuleId,
      startTime: startTime || undefined,
      endTime: endTime || undefined,
      format
    });
    window.open(downloadUrl, '_blank');
  };

  // Handle Category click from SubHeader
  const handleSelectCategory = (cat) => {
    setActiveCategory(cat);
    if (cat === 'state') {
      handleOpenFile({ name: 'state.json', type: 'state' });
    } else if (viewMode === 'json') {
      setActiveFileName(null);
      setViewMode('files');
    }
  };

  // Header display records count
  const displayRecordsCount = useMemo(() => {
    if (viewMode === 'chart' && metricsData?.totalLines) {
      return metricsData.totalLines;
    }
    if (viewMode === 'json' && rawJsonString) {
      return rawJsonString.split('\n').filter(Boolean).length;
    }
    return storageFilesData?.filteredFilesCount || storageFilesData?.files?.length || 0;
  }, [viewMode, metricsData, rawJsonString, storageFilesData]);

  return (
    <div className="h-[calc(100vh-5.4rem)] max-h-[calc(100vh-5.4rem)] w-full flex flex-col bg-slate-950 text-slate-100 overflow-hidden select-text">
      {/* 1. TOP HEADER & GLOBAL ACTIONS */}
      <PodRecordsTopHeader
        onBack={onBack}
        serverDisplayName={serverDisplayName}
        isLivePolling={isLivePolling}
        onToggleLivePolling={() => setIsLivePolling(!isLivePolling)}
        onRefresh={handleRefresh}
        isLoading={isLoading || isLoadingFiles || isLoadingFile}
        isRefreshing={isRefreshing}
        onTriggerDownload={handleTriggerDownload}
      />

      {/* 2. MASTER-DETAIL BODY: SIDEBAR + MAIN VIEWER */}
      <div className="flex-1 flex flex-col lg:flex-row gap-0 max-w-full min-h-0 overflow-hidden">
        {/* A. LEFT SIDEBAR: SERVER / POD PICKER */}
        <PodRecordsSidebar
          podServers={filteredPods}
          selectedPodId={selectedPodId}
          onSelectPod={(id) => {
            setSelectedPodId(id);
            setActiveFileName(null);
            setRawJsonString('');
            setMetricsData(null);
            setViewMode('files');
          }}
          serverSearch={serverSearch}
          onSearchChange={setServerSearch}
          isServerLoading={isServerLoading}
          isCollapsed={isSidebarCollapsed}
          onToggleCollapse={setIsSidebarCollapsed}
        />

        {/* B. MAIN VIEWER: INDEPENDENT SCROLLING PANE */}
        <main className="flex-1 bg-slate-950 flex flex-col h-full min-h-0 overflow-hidden">
          {/* Sub-Header: Path breadcrumb, Retention badge & Category Tabs */}
          <PodRecordsSubHeader
            serverDisplayName={serverDisplayName}
            safeFolderName={safeFolderName}
            activeCategory={activeCategory}
            onSelectCategory={handleSelectCategory}
            selectedDate={selectedDate}
            recordsCount={displayRecordsCount}
            activeFileName={activeFileName}
          />

          {/* Filter Toolbar & View Mode Switcher */}
          <PodRecordsFilterToolbar
            availableDates={availableDates}
            selectedDate={selectedDate}
            onSelectDate={(d) => {
              setActiveFileName(null);
              setRawJsonString('');
              setMetricsData(null);
              setSelectedDate(d);
              setViewMode('files');
            }}
            dateFolders={storageFilesData?.dateFolders || []}
            activeCategory={activeCategory}
            selectedModuleFilter={selectedModuleFilter}
            onSelectModuleFilter={setSelectedModuleFilter}
            timePreset={timePreset}
            onApplyPreset={handleApplyPreset}
            startTime={startTime}
            onStartTimeChange={setStartTime}
            endTime={endTime}
            onEndTimeChange={setEndTime}
            sourceMode={sourceMode}
            onSourceModeChange={setSourceMode}
            fetchLimit={fetchLimit}
            onFetchLimitChange={(newLimit) => {
              setFetchLimit(newLimit);
              if (viewMode === 'json' && activeFileName) {
                loadFileContent(activeFileName, newLimit, false);
              }
            }}
          />

          {/* Main Content Area - Independently Scrollable */}
          <div className="flex-1 overflow-y-auto overflow-x-auto p-4 sm:p-6 space-y-4 custom-scrollbar min-h-0 overscroll-contain">
            {error && (
              <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <AlertCircle size={18} className="shrink-0 text-rose-400" />
                  <span className="text-xs">{error}</span>
                </div>
                <button
                  onClick={() => setError(null)}
                  className="text-xs text-slate-400 hover:text-white px-2 py-0.5 rounded bg-slate-900 border border-slate-800"
                >
                  Tutup
                </button>
              </div>
            )}

            {/* MODE 0: BERKAS FISIK (DEFAULT: HANYA MENAMPILKAN DAFTAR BERKAS DALAM FOLDER) */}
            {viewMode === 'files' && (
              <PodRecordsFilesView
                storageFilesData={storageFilesData}
                isLoadingFiles={isLoadingFiles}
                selectedDate={selectedDate}
                availableDates={availableDates}
                onSelectCategory={setActiveCategory}
                onSelectDate={(d) => {
                  setActiveFileName(null);
                  setSelectedDate(d);
                }}
                onSelectModule={setSelectedModuleFilter}
                onViewModeChange={(mode, fileName = null) => {
                  if (fileName) setActiveFileName(fileName);
                  setViewMode(mode);
                }}
                onTriggerDownload={handleTriggerDownload}
                onOpenFile={handleOpenFile}
              />
            )}

            {/* MODE 1: VISUALISASI GRAFIK METRIK TIME-SERIES */}
            {viewMode === 'chart' && (
              <PodRecordsMetricChartView
                metricsData={metricsData}
                isLoading={isLoadingMetrics}
                error={metricsError}
                fileName={activeFileName}
                selectedDate={selectedDate}
                interval={chartInterval}
                onChangeInterval={(newInterval) => {
                  setChartInterval(newInterval);
                  if (activeFileName) {
                    loadChartMetrics(activeFileName, newInterval, false);
                  }
                }}
                onBackToFiles={() => {
                  setActiveFileName(null);
                  setViewMode('files');
                }}
                onViewRawJson={() => {
                  if (activeFileName && !rawJsonString) {
                    loadFileContent(activeFileName, fetchLimit, false);
                  }
                  setViewMode('json');
                }}
                onRefresh={() => {
                  if (activeFileName) {
                    loadChartMetrics(activeFileName, chartInterval, false);
                  }
                }}
              />
            )}

            {/* MODE 2: PENAMPIL KODE RAW JSON */}
            {viewMode === 'json' && (
              <PodRecordsJsonView
                rawJsonString={rawJsonString}
                jsonFilterQuery={jsonFilterQuery}
                onJsonFilterChange={setJsonFilterQuery}
                fileName={activeFileName}
                fileMeta={activeFileMeta}
                isLoading={isLoadingFile}
                onBackToFiles={() => {
                  setActiveFileName(null);
                  setViewMode('files');
                }}
                onDownloadFile={() => handleTriggerDownload('json')}
                onViewChart={
                  activeFileName && activeFileName.endsWith('.jsonl')
                    ? () => {
                      setViewMode('chart');
                      if (!metricsData && activeFileName) {
                        loadChartMetrics(activeFileName, chartInterval, false);
                      }
                    }
                    : undefined
                }
              />
            )}
          </div>
        </main>
      </div>
    </div>
  );
}

