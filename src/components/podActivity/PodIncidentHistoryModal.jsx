import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import {
  History,
  X,
  Download,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  Clock,
  FileText,
  Calendar,
  Layers,
  Activity,
  Flame,
  UserCheck,
  Zap,
  Cpu,
  Filter,
  FileCode,
  HardDrive,
  SlidersHorizontal,
  RotateCcw,
  Timer,
  ExternalLink
} from 'lucide-react';
import {
  fetchPodEventsApi,
  fetchPodHeartbeatsApi,
  fetchPodLogDatesApi,
  getPodHeartbeatsDownloadUrl
} from '../../api/podActivityApi';
import { fetchServersApi } from '../../api/modules/serverApi';

export default function PodIncidentHistoryModal({
  isOpen,
  onClose,
  podId,
  podName = '',
  pod = null,
  onNavigateView = null
}) {
  // Server name from servers table (prioritizes pod.name / podName from DB, or fetches from servers table)
  const [serverName, setServerName] = useState(() => pod?.name || podName || '');

  const [activeTab, setActiveTab] = useState('raw_hb'); // 'raw_hb' or 'incidents'
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [availableDates, setAvailableDates] = useState([]);
  const [events, setEvents] = useState([]);
  const [heartbeats, setHeartbeats] = useState([]);
  const [selectedModuleFilter, setSelectedModuleFilter] = useState('ALL');

  // Resolve server name from servers table if missing or updated
  useEffect(() => {
    if (pod?.name) {
      setServerName(pod.name);
    } else if (podName && !podName.startsWith('POD ') && podName !== `pod-${podId}`) {
      setServerName(podName);
    } else if (isOpen && podId) {
      fetchServersApi('', 'all')
        .then((servers) => {
          if (Array.isArray(servers)) {
            const found = servers.find((s) => Number(s.id) === Number(podId));
            if (found && found.name) {
              setServerName(found.name);
            }
          }
        })
        .catch(() => {});
    }
  }, [isOpen, podId, podName, pod]);

  const displayName = serverName || pod?.name || podName || (podId ? `Server ${podId}` : 'Server');

  // Time range filters
  const [timePreset, setTimePreset] = useState('all'); // 'all' | '1h' | 'morning' | 'afternoon' | 'work' | 'custom'
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');

  // Source mode & limit
  const [sourceMode, setSourceMode] = useState('auto'); // 'auto' | 'file' | 'live'
  const [fetchLimit, setFetchLimit] = useState(500);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Load available log dates when modal opens
  useEffect(() => {
    if (isOpen && podId) {
      loadLogDates();
    }
  }, [isOpen, podId]);

  async function loadLogDates() {
    try {
      const dates = await fetchPodLogDatesApi(podId);
      if (Array.isArray(dates)) {
        setAvailableDates(dates);
      }
    } catch (err) {
      console.warn('Gagal memuat tanggal log:', err.message);
    }
  }

  // Load data whenever filters change
  useEffect(() => {
    if (isOpen && podId) {
      loadData();
    }
  }, [isOpen, podId, selectedDate, activeTab, selectedModuleFilter, startTime, endTime, sourceMode, fetchLimit]);

  async function loadData() {
    setIsLoading(true);
    setError(null);
    try {
      if (activeTab === 'raw_hb') {
        const data = await fetchPodHeartbeatsApi(podId, {
          date: selectedDate,
          moduleId: selectedModuleFilter,
          startTime: startTime || null,
          endTime: endTime || null,
          limit: fetchLimit,
          source: sourceMode
        });
        setHeartbeats(data || []);
      } else {
        const data = await fetchPodEventsApi(podId, selectedDate);
        setEvents(data || []);
      }
    } catch (err) {
      setError(err.message || 'Gagal memuat data log POD');
    } finally {
      setIsLoading(false);
    }
  }

  // Handle Preset Time Selection
  function handlePresetChange(preset) {
    setTimePreset(preset);
    const now = new Date();

    if (preset === 'all') {
      setStartTime('');
      setEndTime('');
    } else if (preset === '1h') {
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
      const startStr = `${String(oneHourAgo.getHours()).padStart(2, '0')}:${String(oneHourAgo.getMinutes()).padStart(2, '0')}`;
      const endStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
      setStartTime(startStr);
      setEndTime(endStr);
    } else if (preset === 'morning') {
      setStartTime('06:00');
      setEndTime('12:00');
    } else if (preset === 'afternoon') {
      setStartTime('12:00');
      setEndTime('18:00');
    } else if (preset === 'work') {
      setStartTime('08:00');
      setEndTime('17:00');
    } else if (preset === 'custom') {
      // Keep existing custom or initialize with current hour
      if (!startTime) setStartTime('08:00');
      if (!endTime) setEndTime('17:00');
    }
  }

  // Direct server stream download
  function triggerServerDownload(format = 'json') {
    if (!podId) return;
    const url = getPodHeartbeatsDownloadUrl(podId, {
      date: selectedDate,
      format,
      moduleId: selectedModuleFilter,
      startTime: startTime || null,
      endTime: endTime || null
    });

    const safeFileName = (displayName || 'server').replace(/[^a-zA-Z0-9_-]/g, '_').toLowerCase();
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${safeFileName}_heartbeats_${selectedDate}.${format}`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  function handleDownloadIncidentsJsonl() {
    if (!events || events.length === 0) return;
    const jsonlContent = events.map(e => JSON.stringify(e)).join('\n');
    const blob = new Blob([jsonlContent], { type: 'application/x-ndjson;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const safeFileName = (displayName || 'server').replace(/[^a-zA-Z0-9_-]/g, '_').toLowerCase();
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${safeFileName}_events_${selectedDate}.jsonl`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  // Reset all raw HB filters
  function resetHbFilters() {
    setSelectedModuleFilter('ALL');
    setTimePreset('all');
    setStartTime('');
    setEndTime('');
    setSourceMode('auto');
    setFetchLimit(500);
  }

  // Calculate statistics from returned heartbeats
  const stats = useMemo(() => {
    if (!heartbeats || heartbeats.length === 0) {
      return { total: 0, firstTime: null, lastTime: null, avgIntervalMs: null };
    }
    const total = heartbeats.length;
    const newest = heartbeats[0];
    const oldest = heartbeats[heartbeats.length - 1];

    let avgInterval = null;
    if (heartbeats.length > 1) {
      const spanMs = Math.abs(newest.ts - oldest.ts);
      avgInterval = Math.round(spanMs / (heartbeats.length - 1));
    }

    return {
      total,
      firstTime: new Date(oldest.ts).toLocaleTimeString(),
      lastTime: new Date(newest.ts).toLocaleTimeString(),
      avgIntervalMs: avgInterval
    };
  }, [heartbeats]);

  const hasActiveFilters = selectedModuleFilter !== 'ALL' || startTime || endTime || sourceMode !== 'auto';

  if (!isOpen || typeof document === 'undefined') return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[99999] flex items-center justify-center p-2 sm:p-4 bg-slate-950/85 backdrop-blur-md overflow-y-auto animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-5xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] my-auto animate-in fade-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 1. Header */}
        <div className="flex items-center justify-between gap-3 p-4 sm:p-5 border-b border-slate-800 bg-slate-900/95 backdrop-blur-md shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-gradient-to-br from-cyan-500/20 to-blue-500/20 text-cyan-400 rounded-2xl border border-cyan-500/30 shadow-lg shadow-cyan-500/10 shrink-0">
              <Zap size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base sm:text-lg font-black text-white tracking-wide leading-tight">
                  Perekam Data Heartbeat &amp; Insiden
                </h3>
                <span className="px-2.5 py-0.5 rounded-full bg-cyan-500/15 border border-cyan-500/30 text-cyan-300 font-mono text-[11px] font-bold">
                  {displayName}
                </span>
                <span className="px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 font-mono text-[10px] border border-slate-700">
                  Retensi 14 Hari
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Penyimpanan berkas lokal: <code className="text-cyan-300 font-mono text-[10px]">pods/{(displayName || `pod_${podId}`).replace(/[\\/:*?"<>|]/g, '').trim().replace(/\s+/g, '_')}/{activeTab === 'raw_hb' ? 'heartbeats' : 'events'}/{selectedDate}.jsonl</code>
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            {onNavigateView && (
              <button
                onClick={() => {
                  onClose();
                  onNavigateView('pod-heartbeat-records', { podId });
                }}
                className="p-2 bg-slate-800/80 hover:bg-cyan-500/20 text-slate-400 hover:text-cyan-300 rounded-xl border border-slate-700/60 hover:border-cyan-500/40 transition-all cursor-pointer flex items-center gap-1 text-xs font-semibold"
                title="Buka Pusat Rekaman JSON di Halaman Penuh"
              >
                <ExternalLink size={15} />
                <span className="hidden sm:inline">Halaman Penuh</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="p-2 bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white rounded-xl border border-slate-700/60 transition-all cursor-pointer"
              title="Tutup Modal"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* 2. Tab Switcher: Raw HB vs Incidents */}
        <div className="px-4 sm:px-6 pt-3 pb-0 bg-slate-950/40 border-b border-slate-800/80 flex items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('raw_hb')}
              className={`px-4 py-2.5 text-xs font-bold rounded-t-xl border-t border-x transition flex items-center gap-2 cursor-pointer ${
                activeTab === 'raw_hb'
                  ? 'bg-slate-900 text-cyan-300 border-slate-700 shadow-sm'
                  : 'bg-transparent text-slate-400 hover:text-slate-200 border-transparent'
              }`}
            >
              <Zap size={14} className={activeTab === 'raw_hb' ? 'text-cyan-400' : ''} />
              <span>Semua Detak Mentah (Raw HB Stream)</span>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 font-bold">
                {heartbeats.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('incidents')}
              className={`px-4 py-2.5 text-xs font-bold rounded-t-xl border-t border-x transition flex items-center gap-2 cursor-pointer ${
                activeTab === 'incidents'
                  ? 'bg-slate-900 text-amber-300 border-slate-700 shadow-sm'
                  : 'bg-transparent text-slate-400 hover:text-slate-200 border-transparent'
              }`}
            >
              <History size={14} className={activeTab === 'incidents' ? 'text-amber-400' : ''} />
              <span>Riwayat Insiden &amp; Transisi</span>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-bold">
                {events.length}
              </span>
            </button>
          </div>

          {/* Quick Date Pills if available */}
          {availableDates.length > 0 && (
            <div className="hidden md:flex items-center gap-1 text-[11px] text-slate-400 pb-1">
              <span className="text-[10px] text-slate-500">Tersedia di disk:</span>
              {availableDates.slice(0, 3).map((d) => (
                <button
                  key={d}
                  onClick={() => setSelectedDate(d)}
                  className={`px-2 py-0.5 rounded-lg font-mono text-[10px] transition cursor-pointer border ${
                    selectedDate === d
                      ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40 font-bold'
                      : 'bg-slate-800/60 text-slate-400 hover:text-white border-slate-700/60'
                  }`}
                >
                  {d === new Date().toISOString().split('T')[0] ? 'Hari Ini' : d}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* 3. Action & Filter Toolbar */}
        <div className="p-3 sm:p-4 bg-slate-950/60 border-b border-slate-800 space-y-2.5 shrink-0">
          {/* Row 1: Date, Module, Preset, Refresh & Downloads */}
          <div className="flex flex-wrap items-center justify-between gap-2.5">
            <div className="flex items-center gap-2 flex-wrap">
              {/* Date Picker */}
              <div className="flex items-center gap-1.5 bg-slate-900 px-3 py-1.5 rounded-xl border border-slate-800 text-xs text-slate-300 shadow-inner">
                <Calendar size={14} className="text-cyan-400" />
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="bg-transparent text-white focus:outline-none cursor-pointer font-mono text-xs"
                />
              </div>

              {/* Module Filter (Raw HB Only) */}
              {activeTab === 'raw_hb' && (
                <div className="flex items-center gap-1.5 bg-slate-900 px-2.5 py-1.5 rounded-xl border border-slate-800 text-xs text-slate-300 shadow-inner">
                  <Filter size={13} className="text-slate-400" />
                  <select
                    value={selectedModuleFilter}
                    onChange={(e) => setSelectedModuleFilter(e.target.value)}
                    className="bg-transparent text-white text-xs font-mono focus:outline-none cursor-pointer"
                  >
                    <option value="ALL" className="bg-slate-900 text-white">Semua Modul (501 - 509)</option>
                    <option value="501" className="bg-slate-900 text-white">Modul 501 (Manual Control)</option>
                    <option value="502" className="bg-slate-900 text-white">Modul 502 (Chair Module)</option>
                    <option value="503" className="bg-slate-900 text-white">Modul 503 (Lighting Module)</option>
                    <option value="504" className="bg-slate-900 text-white">Modul 504 (Olfactory Module)</option>
                    <option value="505" className="bg-slate-900 text-white">Modul 505 (Door Module)</option>
                    <option value="506" className="bg-slate-900 text-white">Modul 506 (AirCon Module)</option>
                    <option value="507" className="bg-slate-900 text-white">Modul 507 (Audio Module)</option>
                    <option value="508" className="bg-slate-900 text-white">Modul 508 (Power Module)</option>
                    <option value="509" className="bg-slate-900 text-white">Modul 509 (Biofeedback)</option>
                  </select>
                </div>
              )}

              {/* Source Mode Toggle (Raw HB Only) */}
              {activeTab === 'raw_hb' && (
                <div className="hidden lg:flex items-center gap-1 bg-slate-900 p-1 rounded-xl border border-slate-800 text-xs">
                  <button
                    onClick={() => setSourceMode('auto')}
                    className={`px-2 py-1 rounded-lg text-[11px] font-medium transition cursor-pointer ${
                      sourceMode === 'auto' ? 'bg-cyan-500/20 text-cyan-300 font-bold' : 'text-slate-400 hover:text-slate-200'
                    }`}
                    title="Auto: Detak real-time live atau berkas hari lalu"
                  >
                    Auto
                  </button>
                  <button
                    onClick={() => setSourceMode('file')}
                    className={`px-2 py-1 rounded-lg text-[11px] font-medium transition cursor-pointer flex items-center gap-1 ${
                      sourceMode === 'file' ? 'bg-indigo-500/20 text-indigo-300 font-bold' : 'text-slate-400 hover:text-slate-200'
                    }`}
                    title="Paksa baca dari Berkas Fisik Disk (.jsonl)"
                  >
                    <HardDrive size={11} />
                    <span>Disk File</span>
                  </button>
                </div>
              )}

              {/* Refresh Button */}
              <button
                onClick={loadData}
                disabled={isLoading}
                className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl border border-slate-700 transition cursor-pointer disabled:opacity-50"
                title="Muat Ulang Data"
              >
                <RefreshCw size={14} className={isLoading ? 'animate-spin text-cyan-400' : ''} />
              </button>

              {/* Reset Filter Button if active */}
              {hasActiveFilters && activeTab === 'raw_hb' && (
                <button
                  onClick={resetHbFilters}
                  className="px-2.5 py-1.5 bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white rounded-xl border border-slate-700 text-xs flex items-center gap-1 transition cursor-pointer"
                  title="Reset Semua Filter"
                >
                  <RotateCcw size={12} />
                  <span>Reset</span>
                </button>
              )}
            </div>

            {/* Download Buttons Section */}
            <div className="flex items-center gap-2 flex-wrap">
              {activeTab === 'raw_hb' ? (
                <>
                  {/* JSON Download Button (Requested Primary Format) */}
                  <button
                    onClick={() => triggerServerDownload('json')}
                    className="px-3.5 py-1.5 bg-gradient-to-r from-emerald-500/20 to-teal-500/20 hover:from-emerald-500/30 hover:to-teal-500/30 border border-emerald-500/40 text-emerald-300 hover:text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer shadow-md"
                    title="Unduh Berkas Lengkap Format JSON Array"
                  >
                    <FileCode size={13} />
                    <span>Unduh .json</span>
                  </button>

                  {/* JSONL Download Button (Raw Stream) */}
                  <button
                    onClick={() => triggerServerDownload('jsonl')}
                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
                    title="Unduh Berkas Mentah .jsonl Asli Server"
                  >
                    <Download size={13} />
                    <span>.jsonl</span>
                  </button>
                </>
              ) : (
                <button
                  onClick={handleDownloadIncidentsJsonl}
                  disabled={events.length === 0}
                  className="px-3.5 py-1.5 bg-gradient-to-r from-amber-500/20 to-orange-500/20 hover:from-amber-500/30 hover:to-orange-500/30 border border-amber-500/40 text-amber-300 hover:text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer disabled:opacity-40 shadow-md"
                  title="Unduh Log Insiden (.jsonl)"
                >
                  <Download size={13} />
                  <span>Unduh .jsonl</span>
                </button>
              )}
            </div>
          </div>

          {/* Row 2: Time Range Filter Strip (Raw HB Only) */}
          {activeTab === 'raw_hb' && (
            <div className="pt-2 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[11px] font-semibold text-slate-400 flex items-center gap-1 mr-1">
                  <Clock size={12} className="text-cyan-400" />
                  <span>Rentang Jam:</span>
                </span>

                {/* Quick Presets */}
                {[
                  { id: 'all', label: '24 Jam Penuh' },
                  { id: '1h', label: '1 Jam Terakhir' },
                  { id: 'work', label: 'Jam Kerja (08-17)' },
                  { id: 'custom', label: 'Kustom Jam' }
                ].map((preset) => (
                  <button
                    key={preset.id}
                    onClick={() => handlePresetChange(preset.id)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-medium transition cursor-pointer border ${
                      timePreset === preset.id
                        ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40 font-bold'
                        : 'bg-slate-900/80 text-slate-400 hover:text-slate-200 border-slate-800'
                    }`}
                  >
                    {preset.label}
                  </button>
                ))}

                {/* Custom Time Range Inputs */}
                {(timePreset === 'custom' || startTime || endTime) && (
                  <div className="flex items-center gap-1 bg-slate-900 px-2 py-1 rounded-xl border border-cyan-500/30 text-xs ml-1 animate-in fade-in duration-150">
                    <input
                      type="time"
                      value={startTime}
                      onChange={(e) => {
                        setStartTime(e.target.value);
                        setTimePreset('custom');
                      }}
                      className="bg-transparent text-white font-mono text-xs focus:outline-none cursor-pointer"
                      title="Jam Mulai"
                    />
                    <span className="text-slate-500 font-bold">-</span>
                    <input
                      type="time"
                      value={endTime}
                      onChange={(e) => {
                        setEndTime(e.target.value);
                        setTimePreset('custom');
                      }}
                      className="bg-transparent text-white font-mono text-xs focus:outline-none cursor-pointer"
                      title="Jam Selesai"
                    />
                    {(startTime || endTime) && (
                      <button
                        onClick={() => {
                          setStartTime('');
                          setEndTime('');
                          setTimePreset('all');
                        }}
                        className="ml-1 text-slate-400 hover:text-rose-400 cursor-pointer p-0.5"
                        title="Hapus Filter Jam"
                      >
                        <X size={12} />
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Limit Selector */}
              <div className="flex items-center gap-1.5 text-xs text-slate-400">
                <span>Tampilkan:</span>
                <select
                  value={fetchLimit}
                  onChange={(e) => setFetchLimit(Number(e.target.value))}
                  className="bg-slate-900 text-white text-xs font-mono px-2 py-1 rounded-lg border border-slate-800 focus:outline-none cursor-pointer"
                >
                  <option value={200}>200 data</option>
                  <option value={500}>500 data</option>
                  <option value={1000}>1.000 data</option>
                  <option value={2000}>2.000 data</option>
                </select>
              </div>
            </div>
          )}
        </div>

        {/* 4. Statistics & Status Ribbon (Raw HB Only) */}
        {activeTab === 'raw_hb' && heartbeats.length > 0 && !isLoading && (
          <div className="px-4 sm:px-6 py-2 bg-slate-950/90 border-b border-slate-800/80 flex flex-wrap items-center justify-between text-xs text-slate-400 gap-2 shrink-0">
            <div className="flex items-center gap-4 flex-wrap">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>Total Ditampilkan: <strong className="text-white font-mono font-bold">{stats.total}</strong> detak</span>
              </span>
              {stats.firstTime && stats.lastTime && (
                <span className="flex items-center gap-1.5 text-slate-400">
                  <Clock size={12} className="text-slate-500" />
                  <span>Rentang: <strong className="text-cyan-300 font-mono">{stats.firstTime}</strong> s/d <strong className="text-cyan-300 font-mono">{stats.lastTime}</strong></span>
                </span>
              )}
              {stats.avgIntervalMs !== null && (
                <span className="flex items-center gap-1 text-slate-400">
                  <Timer size={12} className="text-slate-500" />
                  <span>Avg Detak: <strong className="text-emerald-300 font-mono">{(stats.avgIntervalMs / 1000).toFixed(2)}s</strong></span>
                </span>
              )}
            </div>

            {hasActiveFilters && (
              <span className="text-[10px] text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded border border-cyan-500/20 font-mono">
                Filter Aktif: {selectedModuleFilter !== 'ALL' ? `Modul ${selectedModuleFilter}` : 'Semua Modul'}
                {startTime || endTime ? ` | ${startTime || '00:00'} - ${endTime || '23:59'}` : ''}
              </span>
            )}
          </div>
        )}

        {/* 5. Scrollable Content Area */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-2.5 max-h-[calc(92vh-270px)]">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-16 text-slate-400 space-y-3">
              <RefreshCw size={32} className="animate-spin text-cyan-400" />
              <p className="text-xs font-medium">Membaca dan memfilter berkas log detak dari penyimpanan server...</p>
            </div>
          ) : error ? (
            <div className="p-4 bg-rose-500/10 border border-rose-500/30 rounded-2xl text-rose-300 text-xs text-center">
              {error}
            </div>
          ) : activeTab === 'raw_hb' ? (
            /* TAB 1: RAW HEARTBEATS STREAM TABLE */
            heartbeats.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-slate-500 space-y-2 text-center">
                <Zap size={40} className="text-slate-600" />
                <p className="text-xs font-bold text-slate-400">Tidak ada rekaman detak heartbeat yang cocok dengan filter</p>
                <p className="text-[11px] text-slate-500 max-w-md">
                  Coba ubah filter rentang jam atau modul, atau pilih tanggal yang memiliki berkas rekaman log.
                </p>
                {hasActiveFilters && (
                  <button
                    onClick={resetHbFilters}
                    className="mt-2 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-cyan-300 rounded-xl text-xs font-bold transition cursor-pointer border border-slate-700"
                  >
                    Reset Filter
                  </button>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-950/60 shadow-xl">
                <table className="w-full text-left text-xs font-mono">
                  <thead className="bg-slate-900/90 text-slate-400 text-[10px] uppercase tracking-wider border-b border-slate-800 sticky top-0 backdrop-blur-sm z-10">
                    <tr>
                      <th className="py-2.5 px-3">Waktu (Timestamp)</th>
                      <th className="py-2.5 px-3">Modul ID</th>
                      <th className="py-2.5 px-3">Detak Value (#hb)</th>
                      <th className="py-2.5 px-3">Delta Interval</th>
                      <th className="py-2.5 px-3">Port Hardware</th>
                      <th className="py-2.5 px-3 text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {heartbeats.map((tick, idx) => {
                      const nextTick = heartbeats[idx + 1];
                      let intervalLabel = '-';
                      let isDelayed = false;

                      if (nextTick && tick.modId === nextTick.modId) {
                        const delta = Math.abs(tick.ts - nextTick.ts);
                        intervalLabel = `+${(delta / 1000).toFixed(2)}s`;
                        if (delta > 3000) isDelayed = true;
                      }

                      return (
                        <tr key={idx} className="hover:bg-slate-800/40 transition group">
                          <td className="py-2 px-3 text-slate-300 whitespace-nowrap font-mono">
                            {new Date(tick.ts).toLocaleTimeString()}.<span className="text-[10px] text-slate-500">{String(tick.ts).slice(-3)}</span>
                          </td>
                          <td className="py-2 px-3">
                            <span className="px-2 py-0.5 rounded bg-slate-800 text-cyan-300 font-bold border border-slate-700">
                              Modul {tick.modId}
                            </span>
                          </td>
                          <td className="py-2 px-3 font-black text-emerald-400">
                            #{tick.hb !== null ? tick.hb : '--'}
                          </td>
                          <td className="py-2 px-3">
                            {intervalLabel !== '-' ? (
                              <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                                isDelayed ? 'text-amber-300 bg-amber-500/10 border border-amber-500/20' : 'text-slate-400'
                              }`}>
                                {intervalLabel}
                              </span>
                            ) : (
                              <span className="text-slate-600 text-[10px]">-</span>
                            )}
                          </td>
                          <td className="py-2 px-3 text-slate-400">
                            {tick.port ? (
                              <span className="text-[10px] text-indigo-300 bg-indigo-500/10 px-1.5 py-0.5 rounded border border-indigo-500/30">
                                {tick.port}
                              </span>
                            ) : (
                              <span className="text-slate-600 text-[10px]">-</span>
                            )}
                          </td>
                          <td className="py-2 px-3 text-right">
                            <span className="inline-flex items-center gap-1 text-[10px] text-emerald-400 font-bold">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                              OK
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )
          ) : (
            /* TAB 2: INCIDENTS & TRANSITIONS LIST */
            events.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-slate-500 space-y-2 text-center">
                <FileText size={40} className="text-slate-600" />
                <p className="text-xs font-bold text-slate-400">Belum ada catatan insiden pada tanggal ini</p>
                <p className="text-[11px] text-slate-500 max-w-sm">
                  Sistem mencatat transisi status penting seperti modul mati (DEAD), macet (FROZEN), pulih (RECOVERED), dan pergantian kursi.
                </p>
              </div>
            ) : (
              events.map((evt, idx) => {
                const isDead = evt.eventType === 'DEAD';
                const isFrozen = evt.eventType === 'FROZEN';
                const isRecovered = evt.eventType === 'RECOVERED';
                const isOccupancy = evt.eventType === 'OCCUPIED_CHANGE';

                let badgeStyle = 'bg-slate-800 text-slate-300 border-slate-700';
                let Icon = Activity;

                if (isDead) {
                  badgeStyle = 'bg-rose-500/15 text-rose-400 border-rose-500/40';
                  Icon = AlertTriangle;
                } else if (isFrozen) {
                  badgeStyle = 'bg-purple-500/15 text-purple-300 border-purple-500/40';
                  Icon = Flame;
                } else if (isRecovered) {
                  badgeStyle = 'bg-emerald-500/15 text-emerald-400 border-emerald-500/40';
                  Icon = CheckCircle2;
                } else if (isOccupancy) {
                  badgeStyle = 'bg-cyan-500/15 text-cyan-300 border-cyan-500/40';
                  Icon = UserCheck;
                }

                const timeDisplay = new Date(evt.timestamp).toLocaleTimeString();

                return (
                  <div
                    key={evt.id || idx}
                    className="p-3.5 bg-slate-950/70 border border-slate-800 hover:border-slate-700/80 rounded-2xl transition flex flex-col sm:flex-row sm:items-center justify-between gap-3 group"
                  >
                    <div className="flex items-start gap-3">
                      <div className={`p-2 rounded-xl border ${badgeStyle} shrink-0 mt-0.5`}>
                        <Icon size={16} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`px-2 py-0.5 rounded-md font-mono text-[10px] font-black uppercase border ${badgeStyle}`}>
                            {evt.eventType}
                          </span>
                          {evt.moduleId && (
                            <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 font-mono text-[10px] font-bold">
                              Modul ID: {evt.moduleId}
                            </span>
                          )}
                          <span className="text-xs font-bold text-white">
                            {evt.message || evt.moduleName || 'Peristiwa Sistem'}
                          </span>
                        </div>
                        {evt.downtimeSeconds > 0 && (
                          <p className="text-[11px] text-slate-400 mt-1 flex items-center gap-1">
                            <Clock size={11} className="text-amber-400" />
                            <span>Durasi downtime: <strong className="text-amber-300 font-mono">{evt.downtimeSeconds}s</strong></span>
                            {evt.lastHb !== null && (
                              <span className="text-slate-500 text-[10px] ml-1">
                                (Last HB: #{evt.lastHb})
                              </span>
                            )}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex sm:flex-col items-center sm:items-end justify-between text-right shrink-0 border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-800/80">
                      <span className="font-mono text-xs font-bold text-slate-300">{timeDisplay}</span>
                      <span className="text-[10px] text-slate-500 font-mono">{evt.isoTime ? evt.isoTime.split('T')[0] : selectedDate}</span>
                    </div>
                  </div>
                );
              })
            )
          )}
        </div>

        {/* 6. Sticky Footer */}
        <div className="p-3.5 sm:p-4 border-t border-slate-800 bg-slate-950/80 shrink-0 flex items-center justify-between">
          <div className="text-[11px] text-slate-500 hidden sm:flex items-center gap-2">
            <Layers size={13} className="text-cyan-400" />
            <span>Penyimpanan stream append-only berbasis JSON-Lines (Non-blocking I/O)</span>
          </div>
          <div className="flex items-center gap-2 ml-auto">
            <button
              onClick={onClose}
              className="px-5 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-black text-xs uppercase tracking-wider rounded-xl shadow-lg shadow-cyan-500/20 transition-all cursor-pointer"
            >
              Tutup
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
