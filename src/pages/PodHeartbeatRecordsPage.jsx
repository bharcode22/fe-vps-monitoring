import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';

import { fetchServersApi } from '../api/vpsApi';
import {
  fetchPodHeartbeatsApi,
  fetchPodEventsApi,
  fetchPodLogDatesApi,
  fetchPodStateApi,
  fetchPodStorageFilesApi,
  getPodHeartbeatsDownloadUrl
} from '../api/podActivityApi';

import { computeHeartbeatDeltas } from '../components/podRecords/podRecordsConfig';
import PodRecordsTopHeader from '../components/podRecords/PodRecordsTopHeader';
import PodRecordsSidebar from '../components/podRecords/PodRecordsSidebar';
import PodRecordsSubHeader from '../components/podRecords/PodRecordsSubHeader';
import PodRecordsFilterToolbar from '../components/podRecords/PodRecordsFilterToolbar';
import PodRecordsFilesView from '../components/podRecords/PodRecordsFilesView';
import PodRecordsTableView from '../components/podRecords/PodRecordsTableView';
import PodRecordsJsonView from '../components/podRecords/PodRecordsJsonView';
import PodRecordsAnalyticsView from '../components/podRecords/PodRecordsAnalyticsView';

export default function PodHeartbeatRecordsPage({ initialPodId = null, onBack }) {
  // 1. Server / POD Selection States
  const [podServers, setPodServers] = useState([]);
  const [selectedPodId, setSelectedPodId] = useState(initialPodId ? Number(initialPodId) : null);
  const [serverSearch, setServerSearch] = useState('');
  const [isServerLoading, setIsServerLoading] = useState(true);

  // 2. Dates & Categories States
  const [availableDates, setAvailableDates] = useState([]);
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [activeCategory, setActiveCategory] = useState('heartbeats'); // 'heartbeats' | 'events' | 'state'
  const [viewMode, setViewMode] = useState('files'); // 'files' | 'table' | 'json' | 'analytics'
  const [storageFilesData, setStorageFilesData] = useState(null);
  const [isLoadingFiles, setIsLoadingFiles] = useState(false);

  // 3. Filter States
  const [selectedModuleFilter, setSelectedModuleFilter] = useState('ALL');
  const [timePreset, setTimePreset] = useState('all'); // 'all' | '1h' | 'morning' | 'afternoon' | 'work' | 'custom'
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [sourceMode, setSourceMode] = useState('auto'); // 'auto' | 'file' | 'live'
  const [fetchLimit, setFetchLimit] = useState(500);

  // 4. Data States
  const [records, setRecords] = useState([]);
  const [rawJsonString, setRawJsonString] = useState('');
  const [jsonFilterQuery, setJsonFilterQuery] = useState('');
  const [podStateData, setPodStateData] = useState(null);

  // 5. Status & Loading States
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLivePolling, setIsLivePolling] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);
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

  // Load available dates and physical storage files when selectedPodId changes
  useEffect(() => {
    if (!selectedPodId) return;

    let isMounted = true;
    async function loadDatesAndFiles() {
      setIsLoadingFiles(true);
      try {
        // Fetch recorded log dates
        const dates = await fetchPodLogDatesApi(selectedPodId);
        if (isMounted && Array.isArray(dates) && dates.length > 0) {
          setAvailableDates(dates);
          if (!dates.includes(selectedDate)) {
            setSelectedDate(dates[0]);
          }
        }

        // Fetch physical files list in pod_storage
        const filesRes = await fetchPodStorageFilesApi(selectedPodId);
        if (isMounted && filesRes && filesRes.success) {
          setStorageFilesData(filesRes);
        }
      } catch (err) {
        console.warn('Failed to load storage files/dates:', err.message);
      } finally {
        if (isMounted) setIsLoadingFiles(false);
      }
    }

    loadDatesAndFiles();
    return () => {
      isMounted = false;
    };
  }, [selectedPodId]);

  // Primary data loader based on activeCategory, selectedDate, and filters
  const loadData = useCallback(
    async (isBackground = false) => {
      if (!selectedPodId) return;

      if (!isBackground) {
        setIsLoading(true);
        setError(null);
      } else {
        setIsRefreshing(true);
      }

      try {
        if (activeCategory === 'heartbeats') {
          const filterParams = {
            date: selectedDate,
            moduleId: selectedModuleFilter !== 'ALL' ? selectedModuleFilter : undefined,
            startTime: startTime || undefined,
            endTime: endTime || undefined,
            source: sourceMode,
            limit: fetchLimit
          };

          const data = await fetchPodHeartbeatsApi(selectedPodId, filterParams);
          const hbList = Array.isArray(data) ? data : [];
          setRecords(hbList);
          setRawJsonString(JSON.stringify(hbList, null, 2));
        } else if (activeCategory === 'events') {
          const data = await fetchPodEventsApi(selectedPodId, { date: selectedDate, limit: fetchLimit });
          const evtList = Array.isArray(data) ? data : [];
          setRecords(evtList);
          setRawJsonString(JSON.stringify(evtList, null, 2));
        } else if (activeCategory === 'state') {
          const stateData = await fetchPodStateApi(selectedPodId);
          setPodStateData(stateData);
          setRecords(stateData ? [stateData] : []);
          setRawJsonString(JSON.stringify(stateData || {}, null, 2));
        }
      } catch (err) {
        console.error('Error fetching POD log data:', err.message);
        if (!isBackground) {
          setError(err.message || 'Gagal memuat berkas log POD');
        }
      } finally {
        if (!isBackground) setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [
      selectedPodId,
      activeCategory,
      selectedDate,
      selectedModuleFilter,
      startTime,
      endTime,
      sourceMode,
      fetchLimit
    ]
  );

  // Trigger data load on filter change
  useEffect(() => {
    loadData(false);
  }, [loadData]);

  // Live Auto-Polling Effect (every 4 seconds)
  useEffect(() => {
    if (isLivePolling) {
      pollTimerRef.current = setInterval(() => {
        loadData(true);
      }, 4000);
    } else if (pollTimerRef.current) {
      clearInterval(pollTimerRef.current);
    }
    return () => {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    };
  }, [isLivePolling, loadData]);

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

  // Compute delta intervals for heartbeats
  const recordsWithDelta = useMemo(() => {
    if (activeCategory !== 'heartbeats') return records;
    return computeHeartbeatDeltas(records);
  }, [records, activeCategory]);

  // Quick Preset Helper
  const handleApplyPreset = (preset) => {
    setTimePreset(preset);
    if (preset === 'all') {
      setStartTime('');
      setEndTime('');
    } else if (preset === '1h') {
      const now = new Date();
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
      setStartTime(oneHourAgo.toTimeString().slice(0, 5));
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

  // Copy JSON to clipboard
  const handleCopyJson = () => {
    if (!rawJsonString) return;
    navigator.clipboard.writeText(rawJsonString);
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 2000);
  };

  // Trigger file download
  const handleTriggerDownload = (format = 'json', customModuleId = undefined) => {
    if (!selectedPodId) return;
    const effectiveModuleId = customModuleId !== undefined
      ? (customModuleId !== 'ALL' ? customModuleId : undefined)
      : (selectedModuleFilter !== 'ALL' ? selectedModuleFilter : undefined);

    const downloadUrl = getPodHeartbeatsDownloadUrl(selectedPodId, {
      date: selectedDate,
      moduleId: effectiveModuleId,
      startTime: startTime || undefined,
      endTime: endTime || undefined,
      format
    });
    window.open(downloadUrl, '_blank');
  };

  return (
    <div className="h-[calc(100vh-5.4rem)] max-h-[calc(100vh-5.4rem)] w-full flex flex-col bg-slate-950 text-slate-100 overflow-hidden select-text">
      {/* 1. TOP HEADER & GLOBAL ACTIONS */}
      <PodRecordsTopHeader
        onBack={onBack}
        serverDisplayName={serverDisplayName}
        isLivePolling={isLivePolling}
        onToggleLivePolling={() => setIsLivePolling(!isLivePolling)}
        onRefresh={() => loadData(false)}
        isLoading={isLoading}
        isRefreshing={isRefreshing}
        onTriggerDownload={handleTriggerDownload}
      />

      {/* 2. MASTER-DETAIL BODY: SIDEBAR + MAIN VIEWER */}
      <div className="flex-1 flex flex-col lg:flex-row gap-0 max-w-full min-h-0 overflow-hidden">
        {/* A. LEFT SIDEBAR: SERVER / POD PICKER */}
        <PodRecordsSidebar
          podServers={filteredPods}
          selectedPodId={selectedPodId}
          onSelectPod={setSelectedPodId}
          serverSearch={serverSearch}
          onSearchChange={setServerSearch}
          isServerLoading={isServerLoading}
        />

        {/* B. MAIN VIEWER: INDEPENDENT SCROLLING PANE */}
        <main className="flex-1 bg-slate-950 flex flex-col h-full min-h-0 overflow-hidden">
          {/* Sub-Header: Path breadcrumb, Retention badge & Category Tabs */}
          <PodRecordsSubHeader
            serverDisplayName={serverDisplayName}
            safeFolderName={safeFolderName}
            activeCategory={activeCategory}
            onSelectCategory={setActiveCategory}
            selectedDate={selectedDate}
            recordsCount={records.length}
          />

          {/* Filter Toolbar & View Mode Switcher */}
          <PodRecordsFilterToolbar
            availableDates={availableDates}
            selectedDate={selectedDate}
            onSelectDate={setSelectedDate}
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
            onFetchLimitChange={setFetchLimit}
            viewMode={viewMode}
            onViewModeChange={setViewMode}
            totalFilesCount={storageFilesData?.totalFiles || 0}
            jsonFilterQuery={jsonFilterQuery}
            onJsonFilterChange={setJsonFilterQuery}
            onCopyJson={handleCopyJson}
            copySuccess={copySuccess}
          />

          {/* Main Content Area - Independently Scrollable */}
          <div className="flex-1 overflow-y-auto overflow-x-auto p-4 sm:p-6 space-y-4 custom-scrollbar min-h-0 overscroll-contain">
            {error ? (
              <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 flex items-center gap-3">
                <AlertCircle size={18} className="shrink-0" />
                <div className="text-xs">{error}</div>
              </div>
            ) : isLoading ? (
              <div className="h-64 flex flex-col items-center justify-center gap-3 text-slate-500">
                <RefreshCw size={24} className="animate-spin text-cyan-400" />
                <span className="text-xs font-semibold">Membaca berkas rekaman log...</span>
              </div>
            ) : (
              <>
                {/* MODE 0: BERKAS FISIK (POD_STORAGE FILE EXPLORER) */}
                {viewMode === 'files' && (
                  <PodRecordsFilesView
                    storageFilesData={storageFilesData}
                    isLoadingFiles={isLoadingFiles}
                    onSelectCategory={setActiveCategory}
                    onSelectDate={setSelectedDate}
                    onSelectModule={setSelectedModuleFilter}
                    onViewModeChange={setViewMode}
                    onTriggerDownload={handleTriggerDownload}
                  />
                )}

                {/* MODE 1: TABEL INTERAKTIF */}
                {viewMode === 'table' && (
                  <PodRecordsTableView
                    activeCategory={activeCategory}
                    recordsWithDelta={recordsWithDelta}
                    podStateData={podStateData}
                  />
                )}

                {/* MODE 2: PENAMPIL KODE JSON */}
                {viewMode === 'json' && (
                  <PodRecordsJsonView
                    rawJsonString={rawJsonString}
                    jsonFilterQuery={jsonFilterQuery}
                    onCopyJson={handleCopyJson}
                    copySuccess={copySuccess}
                  />
                )}

                {/* MODE 3: ANALISIS & STATISTIK */}
                {viewMode === 'analytics' && activeCategory === 'heartbeats' && (
                  <PodRecordsAnalyticsView recordsWithDelta={recordsWithDelta} />
                )}
              </>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
