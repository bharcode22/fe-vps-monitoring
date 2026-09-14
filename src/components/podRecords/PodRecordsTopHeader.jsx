import React, { useState, useEffect, useRef } from 'react';
import {
  ArrowLeft,
  FileCode,
  Play,
  Pause,
  RefreshCw,
  Download,
  Code,
  BarChart2,
  ExternalLink,
  Clock,
  Check,
  Copy,
  ChevronDown,
  Radio,
  FileText
} from 'lucide-react';
import PodRecordsQueryBuilderModal from './PodRecordsQueryBuilderModal';

export default function PodRecordsTopHeader({
  onBack,
  serverDisplayName,
  isLivePolling,
  onToggleLivePolling,
  onRefresh,
  isLoading,
  isRefreshing,
  onTriggerDownload,
  onNavigateView,
  lastRefreshedAt = Date.now(),
  selectedModuleFilter = 'ALL',
  activeCategory = 'all'
}) {
  const [isQueryModalOpen, setIsQueryModalOpen] = useState(false);
  const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);
  const [copiedFlux, setCopiedFlux] = useState(false);
  const [elapsedSec, setElapsedSec] = useState(0);
  const exportMenuRef = useRef(null);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (exportMenuRef.current && !exportMenuRef.current.contains(event.target)) {
        setIsExportMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Update freshness counter every second
  useEffect(() => {
    const updateElapsed = () => {
      const now = Date.now();
      const diff = Math.max(0, Math.floor((now - (lastRefreshedAt || now)) / 1000));
      setElapsedSec(diff);
    };
    updateElapsed();
    const timer = setInterval(updateElapsed, 1000);
    return () => clearInterval(timer);
  }, [lastRefreshedAt]);

  const formatElapsed = (sec) => {
    if (sec < 4) return 'Baru saja';
    if (sec < 60) return `${sec} dtk lalu`;
    const min = Math.floor(sec / 60);
    if (min < 60) return `${min} mnt lalu`;
    const hrs = Math.floor(min / 60);
    return `${hrs} jam lalu`;
  };

  // Deep-link to Influx Data Explorer with current POD pre-configured
  const handleOpenInfluxExplorer = () => {
    try {
      const podName = serverDisplayName || 'POD RIG 30';
      localStorage.setItem('influx_explorer_initial_pod', podName);
      localStorage.setItem('influx_explorer_initial_measurement', 'pod_heartbeat_logs');
      localStorage.setItem('influx_explorer_initial_field', 'hb');
    } catch (_) {}

    if (onNavigateView) {
      onNavigateView('influx-manager');
    } else {
      window.location.search = '?view=influx-manager';
    }
  };

  // Copy Flux query configured for this POD
  const handleCopyFluxQuery = () => {
    const podName = serverDisplayName || 'POD RIG 30';
    const modLine =
      selectedModuleFilter && selectedModuleFilter !== 'ALL'
        ? `\n  |> filter(fn: (r) => r["module_id"] == "${selectedModuleFilter}")`
        : '';
    const fluxQuery = `from(bucket: "pod_logs_bhar")
  |> range(start: v.timeRangeStart, stop: v.timeRangeStop)
  |> filter(fn: (r) => r["_measurement"] == "pod_heartbeat_logs")
  |> filter(fn: (r) => r["_field"] == "hb")
  |> filter(fn: (r) => r["pod_name"] == "${podName}")${modLine}`;

    navigator.clipboard.writeText(fluxQuery);
    setCopiedFlux(true);
    setTimeout(() => setCopiedFlux(false), 2500);
  };

  return (
    <>
      <div className="shrink-0 z-30 bg-slate-900/95 backdrop-blur-xl border-b border-slate-800 px-4 sm:px-6 py-3 shadow-md flex items-center justify-between gap-4 flex-wrap">
        {/* Left Section: Breadcrumb / Identity & Freshness Info */}
        <div className="flex items-center gap-3">
          {onBack && (
            <button
              onClick={onBack}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition-all cursor-pointer flex items-center gap-1.5 text-xs font-semibold shrink-0"
              title="Kembali ke Dashboard"
            >
              <ArrowLeft size={16} />
              <span className="hidden sm:inline">Kembali</span>
            </button>
          )}

          <div className="p-2.5 rounded-2xl bg-gradient-to-br from-cyan-500/20 to-blue-500/20 text-cyan-400 border border-cyan-500/30 shadow-lg shadow-cyan-500/10 shrink-0">
            <FileCode size={22} />
          </div>

          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-base sm:text-lg font-black text-white tracking-wide">
                Pusat Rekaman Heartbeat &amp; Log Telemetri
              </h1>
              <span className="px-2.5 py-0.5 rounded-full bg-cyan-500/15 border border-cyan-500/30 text-cyan-300 font-mono text-[11px] font-bold">
                {serverDisplayName}
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 font-mono text-[10px] font-semibold flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                InfluxDB Engine
              </span>
            </div>

            {/* Subtitle & Real-time Freshness Status Bar */}
            <div className="flex items-center gap-2.5 text-[11px] text-slate-400 mt-1 flex-wrap">
              <span className="hidden md:inline text-slate-400">
                Aliran telemetri real-time (<code className="text-cyan-400 font-mono">pod_logs_bhar</code>)
              </span>

              {/* Freshness Badge */}
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-800/80 border border-slate-700/70 text-[10px] font-mono text-slate-300">
                <Clock size={11} className={isLivePolling ? 'text-emerald-400' : 'text-cyan-400'} />
                <span>Update:</span>
                <strong className="text-white">{formatElapsed(elapsedSec)}</strong>
              </span>

              {/* Live Streaming Indicator */}
              {isLivePolling && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-[10px] font-mono text-emerald-300 font-bold animate-pulse">
                  <Radio size={10} className="text-emerald-400" />
                  <span>Live Sync (4s)</span>
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Right Section: Enhanced Toolbar Actions */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* 1. Deep Link to Influx Data Explorer */}
          <button
            onClick={handleOpenInfluxExplorer}
            className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-blue-600/20 to-cyan-600/20 hover:from-blue-600/30 hover:to-cyan-600/30 text-cyan-300 hover:text-cyan-200 border border-cyan-500/40 text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm shadow-cyan-500/15 cursor-pointer group"
            title={`Buka Influx Data Explorer dengan filter POD (${serverDisplayName || 'POD RIG 30'}) terpasang otomatis`}
          >
            <BarChart2 size={14} className="text-cyan-400 group-hover:scale-110 transition-transform" />
            <span>Influx Explorer</span>
            <ExternalLink size={11} className="text-cyan-400/70 ml-0.5" />
          </button>

          {/* 2. Dynamic Flux Query Builder Modal Trigger */}
          <button
            onClick={() => setIsQueryModalOpen(true)}
            className="px-3 py-1.5 rounded-xl bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 hover:text-purple-200 border border-purple-500/40 text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm shadow-purple-500/15 cursor-pointer"
            title="Bangun &amp; Uji Kueri Flux Dinamis Cepat"
          >
            <Code size={14} className="text-purple-400" />
            <span>Query Builder</span>
          </button>

          {/* 3. Live Auto-Poll Toggle */}
          <button
            onClick={onToggleLivePolling}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer flex items-center gap-1.5 ${
              isLivePolling
                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 shadow-lg shadow-emerald-500/15'
                : 'bg-slate-800 text-slate-400 hover:text-white border-slate-700 hover:bg-slate-700'
            }`}
            title={isLivePolling ? 'Hentikan Live Auto-Refresh' : 'Aktifkan Live Auto-Refresh (setiap 4 detik)'}
          >
            {isLivePolling ? <Pause size={13} /> : <Play size={13} />}
            <span>Live Sync</span>
            {isLivePolling && (
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping ml-0.5" />
            )}
          </button>

          {/* 4. Refresh Button */}
          <button
            onClick={onRefresh}
            disabled={isLoading || isRefreshing}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition-all cursor-pointer disabled:opacity-50"
            title="Muat Ulang Data (Refresh)"
          >
            <RefreshCw size={15} className={isRefreshing ? 'animate-spin text-cyan-400' : ''} />
          </button>

          {/* 5. Unified Export Dropdown Menu */}
          <div className="relative" ref={exportMenuRef}>
            <button
              onClick={() => setIsExportMenuOpen((prev) => !prev)}
              className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold text-xs shadow-lg shadow-cyan-600/20 transition-all flex items-center gap-1.5 cursor-pointer"
              title="Menu Ekspor Data &amp; Salin Kueri"
            >
              <Download size={14} />
              <span>Ekspor Data</span>
              <ChevronDown
                size={13}
                className={`transition-transform duration-200 ${isExportMenuOpen ? 'rotate-180' : ''}`}
              />
            </button>

            {/* Dropdown Popover */}
            {isExportMenuOpen && (
              <div className="absolute right-0 mt-2 w-56 bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl z-50 p-1.5 flex flex-col gap-1 backdrop-blur-2xl animate-in fade-in zoom-in-95 duration-150">
                <div className="px-2.5 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-800/80">
                  Opsi Unduh &amp; Ekspor
                </div>

                {/* Option: Download JSON */}
                <button
                  onClick={() => {
                    setIsExportMenuOpen(false);
                    onTriggerDownload('json');
                  }}
                  className="w-full px-2.5 py-2 rounded-xl text-left text-xs font-semibold text-slate-200 hover:text-white hover:bg-slate-800/90 flex items-center gap-2.5 transition-all cursor-pointer group"
                >
                  <div className="p-1 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 group-hover:bg-cyan-500/20">
                    <FileCode size={14} />
                  </div>
                  <div className="flex flex-col">
                    <span className="font-bold">Unduh .json</span>
                    <span className="text-[10px] text-slate-400">Array objek JSON terstruktur</span>
                  </div>
                </button>

                {/* Option: Download JSONL */}
                <button
                  onClick={() => {
                    setIsExportMenuOpen(false);
                    onTriggerDownload('jsonl');
                  }}
                  className="w-full px-2.5 py-2 rounded-xl text-left text-xs font-semibold text-slate-200 hover:text-white hover:bg-slate-800/90 flex items-center gap-2.5 transition-all cursor-pointer group"
                >
                  <div className="p-1 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20 group-hover:bg-blue-500/20">
                    <FileText size={14} />
                  </div>
                  <div className="flex flex-col">
                    <span className="font-bold">Unduh .jsonl</span>
                    <span className="text-[10px] text-slate-400">Stream data mentah baris per baris</span>
                  </div>
                </button>

                <div className="h-px bg-slate-800 my-0.5" />

                {/* Option: Copy Flux Query */}
                <button
                  onClick={handleCopyFluxQuery}
                  className="w-full px-2.5 py-2 rounded-xl text-left text-xs font-semibold text-purple-200 hover:text-white hover:bg-purple-500/10 flex items-center gap-2.5 transition-all cursor-pointer group"
                  title="Salin sintaks kueri Flux aktif untuk POD ini"
                >
                  <div className="p-1 rounded-lg bg-purple-500/20 text-purple-400 border border-purple-500/30 group-hover:bg-purple-500/30">
                    {copiedFlux ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                  </div>
                  <div className="flex flex-col">
                    <span className="font-bold flex items-center gap-1.5">
                      {copiedFlux ? (
                        <span className="text-emerald-400 font-bold">Kueri Disalin!</span>
                      ) : (
                        <span>Salin Kueri Flux</span>
                      )}
                    </span>
                    <span className="text-[10px] text-slate-400">Sintaks Flux pod_logs_bhar</span>
                  </div>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Dynamic Query Builder Modal */}
      <PodRecordsQueryBuilderModal
        isOpen={isQueryModalOpen}
        onClose={() => setIsQueryModalOpen(false)}
        serverDisplayName={serverDisplayName}
      />
    </>
  );
}
