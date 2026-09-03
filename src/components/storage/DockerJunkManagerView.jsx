import React, { useState } from 'react';
import {
  HardDrive,
  Trash2,
  RefreshCw,
  Server,
  Zap,
  Layers,
  FileText,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Search,
  Filter,
  Film,
  Volume2,
  Image as ImageIcon,
  Sparkles,
  Info
} from 'lucide-react';

export default function DockerJunkManagerView({
  pods = [],
  dockerInspections = {}, // { [serverId]: inspectionData }
  isLoading = false,
  isInspectingAll = false,
  inspectingSinglePodId = null,
  onInspectAll,
  onInspectSingle,
  onOpenCleanupModal,
  onGoToMediaStorage
}) {
  const [filterTab, setFilterTab] = useState('all'); // 'all' | 'has_junk' | 'critical' | 'offline'
  const [searchQuery, setSearchQuery] = useState('');

  // Skeleton Loading Screen when data is loading
  if (isLoading || (pods.length === 0 && !dockerInspections)) {
    return (
      <div className="flex flex-col gap-6 animate-pulse">
        {/* Skeleton Top Banner */}
        <div className="p-6 rounded-3xl border border-slate-800 bg-slate-900/40">
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 pb-4 mb-4 border-b border-slate-800/80">
            <div className="space-y-2">
              <div className="h-5 w-72 bg-slate-800 rounded-xl"></div>
              <div className="h-3 w-96 bg-slate-800/60 rounded-lg"></div>
            </div>
            <div className="flex gap-2.5">
              <div className="h-9 w-48 bg-slate-800 rounded-xl"></div>
              <div className="h-9 w-52 bg-slate-800 rounded-xl"></div>
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[1, 2, 3, 4].map(n => (
              <div key={n} className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-2">
                <div className="h-3 w-24 bg-slate-800/80 rounded"></div>
                <div className="h-6 w-32 bg-slate-800 rounded-lg"></div>
              </div>
            ))}
          </div>
        </div>

        {/* Skeleton Toolbar */}
        <div className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800">
          <div className="flex gap-2">
            {[1, 2, 3, 4].map(n => (
              <div key={n} className="h-7 w-28 bg-slate-800 rounded-xl"></div>
            ))}
          </div>
          <div className="h-7 w-48 bg-slate-800 rounded-xl"></div>
        </div>

        {/* Skeleton POD Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {[1, 2, 3, 4, 5, 6].map(n => (
            <div key={n} className="p-6 rounded-3xl border border-slate-800 bg-slate-900/40 space-y-4">
              {/* Header */}
              <div className="flex items-center justify-between pb-3 border-b border-slate-800/80">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-slate-800"></div>
                  <div className="space-y-1">
                    <div className="h-4 w-24 bg-slate-800 rounded"></div>
                    <div className="h-2.5 w-16 bg-slate-800/60 rounded"></div>
                  </div>
                </div>
                <div className="h-5 w-20 bg-slate-800 rounded-full"></div>
              </div>

              {/* Disk Meter */}
              <div className="space-y-2">
                <div className="flex justify-between">
                  <div className="h-3 w-28 bg-slate-800 rounded"></div>
                  <div className="h-3 w-20 bg-slate-800 rounded"></div>
                </div>
                <div className="h-3 w-full bg-slate-950 rounded-full border border-slate-800"></div>
              </div>

              {/* Media folders */}
              <div className="p-3 rounded-2xl bg-slate-950/60 border border-slate-800/80 space-y-2">
                <div className="h-3 w-32 bg-slate-800 rounded"></div>
                <div className="grid grid-cols-3 gap-1.5">
                  <div className="h-12 bg-slate-900 rounded-xl border border-slate-800"></div>
                  <div className="h-12 bg-slate-900 rounded-xl border border-slate-800"></div>
                  <div className="h-12 bg-slate-900 rounded-xl border border-slate-800"></div>
                </div>
              </div>

              {/* Docker junk box */}
              <div className="p-3 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-2">
                <div className="h-3 w-36 bg-slate-800 rounded"></div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="h-12 bg-slate-900 rounded-xl border border-slate-800"></div>
                  <div className="h-12 bg-slate-900 rounded-xl border border-slate-800"></div>
                  <div className="h-12 bg-slate-900 rounded-xl border border-slate-800"></div>
                  <div className="h-12 bg-slate-900 rounded-xl border border-slate-800"></div>
                </div>
              </div>

              {/* Footer */}
              <div className="pt-3 border-t border-slate-800/80 flex justify-between">
                <div className="h-8 w-24 bg-slate-800 rounded-xl"></div>
                <div className="h-8 w-32 bg-slate-800 rounded-xl"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }


  // Calculate fleet-wide aggregated metrics
  const totalPods = pods.length;
  const onlinePods = pods.filter(p => p.status === 'online').length;
  const offlinePods = pods.filter(p => p.status === 'offline').length;

  let totalDiskUsedBytes = 0;
  let totalBuildCacheBytes = 0;
  let totalDanglingImagesCount = 0;
  let totalLogsBytes = 0;

  pods.forEach(pod => {
    const inspection = dockerInspections[pod.serverId];
    if (inspection && inspection.status === 'online') {
      totalDiskUsedBytes += inspection.disk?.usedBytes || 0;
      totalLogsBytes += inspection.docker?.logsBytes || 0;
      totalDanglingImagesCount += inspection.docker?.danglingImagesCount || 0;
    } else if (pod.disk?.usedBytes) {
      totalDiskUsedBytes += pod.disk.usedBytes;
    }
  });

  const totalDiskUsedGB = (totalDiskUsedBytes / (1024 * 1024 * 1024)).toFixed(1);
  const totalLogsGB = (totalLogsBytes / (1024 * 1024 * 1024)).toFixed(1);

  // Filter PODs list
  const filteredPods = pods.filter(pod => {
    const inspection = dockerInspections[pod.serverId];
    const isOnline = pod.status === 'online';
    const percent = inspection?.disk?.percentUsed || pod.disk?.percentUsed || 0;

    // Search filter
    const matchesSearch = searchQuery.trim() === '' ||
      pod.serverName.toLowerCase().includes(searchQuery.trim().toLowerCase()) ||
      (pod.code && pod.code.toLowerCase().includes(searchQuery.trim().toLowerCase()));

    if (!matchesSearch) return false;

    if (filterTab === 'critical') return percent >= 80;
    if (filterTab === 'offline') return !isOnline;
    if (filterTab === 'has_junk') {
      const buildCache = inspection?.docker?.buildCache?.size || '0B';
      const dangling = inspection?.docker?.danglingImagesCount || 0;
      const logs = inspection?.docker?.logsBytes || 0;
      return buildCache !== '0B' || dangling > 0 || logs > 50 * 1024 * 1024; // >50MB
    }

    return true;
  });

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-200">
      {/* 1. Fleet Overview Metrics Banner */}
      <div className="glass-card p-5 sm:p-6 rounded-3xl border border-cyan-500/30 bg-slate-900/60 shadow-xl">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 pb-4 mb-4 border-b border-slate-800">
          <div>
            <h3 className="text-base font-black text-white flex items-center gap-2">
              <HardDrive size={18} className="text-cyan-400" />
              <span>Pusat Pengelola Storage &amp; Sampah Build Docker (POD v3)</span>
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Pantau kapasitas volume disk 1 TB dan bersihkan sisa build Docker (*BuildKit cache, dangling images, container logs*) secara aman.
            </p>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            <button
              onClick={onInspectAll}
              disabled={isInspectingAll}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-300 hover:text-white text-xs font-bold flex items-center gap-2 border border-slate-700 transition-all cursor-pointer disabled:opacity-50"
              title="Scan rincian sampah Docker di seluruh 31 POD via SSH"
            >
              <RefreshCw size={13} className={isInspectingAll ? 'animate-spin text-cyan-400' : ''} />
              <span>{isInspectingAll ? 'Sedang Memindai Seluruh POD...' : 'Scan Sampah Docker Seluruh POD'}</span>
            </button>

            <button
              onClick={() => onOpenCleanupModal(pods.filter(p => p.status === 'online'))}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-rose-500 to-red-600 hover:from-rose-400 hover:to-red-500 text-white text-xs font-bold flex items-center gap-2 shadow-lg shadow-rose-500/25 transition-all cursor-pointer"
              title="Bersihkan sampah build Docker di seluruh server POD"
            >
              <Trash2 size={13} />
              <span>Bersihkan Sampah Seluruh POD v3</span>
            </button>
          </div>
        </div>

        {/* Aggregate Metrics Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-3 rounded-2xl bg-slate-950/80 border border-slate-800 flex flex-col justify-between">
            <span className="text-[11px] text-slate-400 font-semibold">Total Unit Server:</span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-base font-mono font-black text-white">{totalPods} POD</span>
              <span className="text-[10px] text-emerald-400 font-mono">({onlinePods} Online)</span>
            </div>
          </div>

          <div className="p-3 rounded-2xl bg-slate-950/80 border border-slate-800 flex flex-col justify-between">
            <span className="text-[11px] text-slate-400 font-semibold">Total Disk Terpakai:</span>
            <span className="text-base font-mono font-black text-cyan-300 mt-1">
              {totalDiskUsedGB} GB
            </span>
          </div>

          <div className="p-3 rounded-2xl bg-purple-950/30 border border-purple-500/30 flex flex-col justify-between">
            <span className="text-[11px] text-purple-300 font-semibold">Dangling Images:</span>
            <span className="text-base font-mono font-black text-purple-200 mt-1">
              {totalDanglingImagesCount} Image
            </span>
          </div>

          <div className="p-3 rounded-2xl bg-emerald-950/30 border border-emerald-500/30 flex flex-col justify-between">
            <span className="text-[11px] text-emerald-300 font-semibold">Log Docker Terkumpul:</span>
            <span className="text-base font-mono font-black text-emerald-300 mt-1">
              {totalLogsGB} GB
            </span>
          </div>
        </div>
      </div>

      {/* 2. Filter Tabs & Search Toolbar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-slate-950/80 p-3.5 rounded-2xl border border-slate-800">
        <div className="flex items-center gap-1.5 flex-wrap">
          {[
            { id: 'all', label: 'Semua POD', count: totalPods },
            { id: 'has_junk', label: 'Ada Sampah Build', count: null },
            { id: 'critical', label: 'Disk Kritis (≥80%)', count: null },
            { id: 'offline', label: 'Offline', count: offlinePods }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setFilterTab(tab.id)}
              className={`px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer border ${filterTab === tab.id
                ? 'bg-cyan-500/25 text-cyan-300 border-cyan-500/40 shadow-sm'
                : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'
                }`}
            >
              <span>{tab.label}</span>
              {tab.count !== null && <span className="ml-1 text-[10px] opacity-70">({tab.count})</span>}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-56">
          <Search size={13} className="absolute left-3 top-2.5 text-slate-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari nama POD..."
            className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white focus:outline-none focus:border-cyan-500 font-mono"
          />
        </div>
      </div>

      {/* 3. POD Storage Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredPods.map(pod => {
          const podId = pod.serverId;
          const isOnline = pod.status === 'online';
          const inspection = dockerInspections[podId];
          const isInspectingThis = inspectingSinglePodId === podId || isInspectingAll;

          const diskInfo = inspection?.disk || pod.disk || {};
          const percent = diskInfo.percentUsed || 0;
          const isHigh = percent >= 85;
          const isMedium = percent >= 70 && percent < 85;

          const docker = inspection?.docker || {};
          const buildCacheSize = docker.buildCache?.size || '0 B';
          const buildCacheReclaimable = docker.buildCache?.reclaimable || '0 B';
          const danglingCount = docker.danglingImagesCount || 0;
          const imagesReclaimable = docker.images?.reclaimable || '0 B';
          const logsFormatted = docker.logsFormatted || '0 B';

          return (
            <div
              key={podId}
              className={`glass-card p-5 sm:p-6 rounded-3xl border transition-all flex flex-col justify-between ${!isOnline
                ? 'border-slate-800/80 bg-slate-950/40 opacity-75'
                : isHigh
                  ? 'border-rose-500/40 bg-gradient-to-b from-rose-950/20 via-slate-900/80 to-slate-950 shadow-rose-950/20'
                  : 'border-slate-800 hover:border-cyan-500/40 bg-slate-900/60 shadow-xl'
                }`}
            >
              <div>
                {/* POD Header */}
                <div className="flex items-center justify-between gap-2 pb-3 mb-3 border-b border-slate-800/80">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className={`p-2 rounded-xl border shrink-0 ${isOnline ? 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30' : 'bg-slate-800 text-slate-500 border-slate-700'
                      }`}>
                      <Server size={16} />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <h4 className="font-extrabold text-sm text-white truncate">{pod.serverName}</h4>
                        {pod.code && (
                          <span className="text-[9.5px] font-mono font-bold px-1.5 py-0.2 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                            {pod.code}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {isOnline ? (
                    <span className={`text-[10px] font-black px-2 py-0.5 rounded-full border shrink-0 ${isHigh
                      ? 'bg-rose-500/20 text-rose-300 border-rose-500/40 animate-pulse'
                      : isMedium
                        ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                        : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                      }`}>
                      {percent}% Terpakai
                    </span>
                  ) : (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700 shrink-0">
                      Offline
                    </span>
                  )}
                </div>

                {/* 1 TB Disk Progress Bar */}
                {isOnline ? (
                  <div className="mb-4">
                    <div className="flex items-center justify-between text-xs mb-1.5">
                      <span className="text-slate-400 font-semibold">Volume Disk (Limit 1.0 TB):</span>
                      <span className="font-mono font-bold text-white">
                        {diskInfo.usedFormatted} / {diskInfo.totalFormatted || '1.0 TB'}
                      </span>
                    </div>
                    <div className="w-full h-3 rounded-full bg-slate-950 border border-slate-800 overflow-hidden p-0.5">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${isHigh
                          ? 'bg-gradient-to-r from-rose-500 to-red-600'
                          : isMedium
                            ? 'bg-gradient-to-r from-amber-500 to-orange-500'
                            : 'bg-gradient-to-r from-cyan-400 to-blue-500'
                          }`}
                        style={{ width: `${Math.min(percent, 100)}%` }}
                      />
                    </div>
                    <div className="flex items-center justify-between text-[10px] text-slate-500 font-mono mt-1">
                      <span>Sisa Kosong: <strong className="text-emerald-400 font-bold">{diskInfo.freeFormatted}</strong></span>
                      <span>Sistem Root /</span>
                    </div>
                  </div>
                ) : (
                  <div className="p-3 rounded-2xl bg-slate-950/70 border border-slate-800/80 text-xs text-slate-400 mb-4 flex items-center gap-2">
                    <Info size={14} className="text-slate-500 shrink-0" />
                    <span className="text-[11px]">Server tidak terhubung via SSH.</span>
                  </div>
                )}

                {/* Media Directories Breakdown (/videos, /sounds, /images) */}
                {isOnline && (
                  <div className="space-y-1.5 mb-3 bg-slate-950/60 p-3 rounded-2xl border border-slate-800/80">
                    <div className="flex items-center justify-between text-[11px] font-bold text-slate-300 mb-1">
                      <span className="flex items-center gap-1.5">
                        <Film size={13} className="text-purple-400" />
                        <span>Direktori Media (/home/pod):</span>
                      </span>
                      <span className="font-mono text-white text-[10.5px]">
                        Total: {inspection?.totalMediaFormatted || pod.totalMediaFormatted || '0 B'}
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-1.5 text-xs font-mono">
                      {/* /videos */}
                      <div className="p-2 rounded-xl bg-slate-900/90 border border-slate-800 flex flex-col justify-between">
                        <span className="text-[10px] text-purple-300 flex items-center gap-1 font-sans">
                          <Film size={11} /> /videos:
                        </span>
                        <span className="font-bold text-purple-200 mt-0.5 text-[11px]">
                          {inspection?.folders?.videos?.formatted || pod.folders?.videos?.formatted || '0 B'}
                        </span>
                        <span className="text-[9px] text-slate-500 font-sans">
                          ({inspection?.folders?.videos?.count ?? pod.folders?.videos?.count ?? 0} file)
                        </span>
                      </div>

                      {/* /sounds */}
                      <div className="p-2 rounded-xl bg-slate-900/90 border border-slate-800 flex flex-col justify-between">
                        <span className="text-[10px] text-sky-300 flex items-center gap-1 font-sans">
                          <Volume2 size={11} /> /sounds:
                        </span>
                        <span className="font-bold text-sky-200 mt-0.5 text-[11px]">
                          {inspection?.folders?.sounds?.formatted || pod.folders?.sounds?.formatted || '0 B'}
                        </span>
                        <span className="text-[9px] text-slate-500 font-sans">
                          ({inspection?.folders?.sounds?.count ?? pod.folders?.sounds?.count ?? 0} file)
                        </span>
                      </div>

                      {/* /images */}
                      <div className="p-2 rounded-xl bg-slate-900/90 border border-slate-800 flex flex-col justify-between">
                        <span className="text-[10px] text-emerald-300 flex items-center gap-1 font-sans">
                          <ImageIcon size={11} /> /images:
                        </span>
                        <span className="font-bold text-emerald-200 mt-0.5 text-[11px]">
                          {inspection?.folders?.images?.formatted || pod.folders?.images?.formatted || '0 B'}
                        </span>
                        <span className="text-[9px] text-slate-500 font-sans">
                          ({inspection?.folders?.images?.count ?? pod.folders?.images?.count ?? 0} file)
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Docker Build Junk Breakdown */}
                {isOnline && (
                  <div className="space-y-2 mb-4 bg-slate-950/80 p-3 rounded-2xl border border-slate-800/90">
                    <div className="flex items-center justify-between text-[11px] font-bold text-slate-300">
                      <span className="flex items-center gap-1.5">
                        <Zap size={13} className="text-cyan-400" />
                        <span>Sampah Build Docker:</span>
                      </span>
                      {isInspectingThis ? (
                        <span className="text-[10px] text-cyan-300 flex items-center gap-1">
                          <RefreshCw size={10} className="animate-spin" /> Memindai...
                        </span>
                      ) : inspection ? (
                        <span className="text-[10px] text-slate-500 font-mono">docker system df</span>
                      ) : (
                        <button
                          onClick={() => onInspectSingle(podId)}
                          className="text-[10px] text-cyan-400 hover:text-cyan-300 font-bold cursor-pointer"
                        >
                          Cek Sekarang
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs">
                      {/* BuildKit Cache */}
                      <div className="p-2 rounded-xl bg-slate-900 border border-slate-800 flex flex-col justify-between">
                        <span className="text-[10px] text-slate-400 flex items-center gap-1">
                          <Zap size={11} className="text-amber-400" /> BuildKit Cache:
                        </span>
                        <span className="font-mono font-bold text-amber-300 mt-1">
                          {buildCacheSize}
                        </span>
                      </div>

                      {/* Dangling Images */}
                      <div className="p-2 rounded-xl bg-slate-900 border border-slate-800 flex flex-col justify-between">
                        <span className="text-[10px] text-slate-400 flex items-center gap-1">
                          <Layers size={11} className="text-purple-400" /> Dangling Images:
                        </span>
                        <span className="font-mono font-bold text-purple-300 mt-1">
                          {danglingCount} Image ({imagesReclaimable})
                        </span>
                      </div>

                      {/* Container Logs */}
                      <div className="p-2 rounded-xl bg-slate-900 border border-slate-800 flex flex-col justify-between">
                        <span className="text-[10px] text-slate-400 flex items-center gap-1">
                          <FileText size={11} className="text-sky-400" /> Log Container:
                        </span>
                        <span className="font-mono font-bold text-sky-300 mt-1">
                          {logsFormatted}
                        </span>
                      </div>

                      {/* Containers State */}
                      <div className="p-2 rounded-xl bg-slate-900 border border-slate-800 flex flex-col justify-between">
                        <span className="text-[10px] text-slate-400 flex items-center gap-1">
                          <Server size={11} className="text-emerald-400" /> Containers:
                        </span>
                        <span className="font-mono font-bold text-slate-200 mt-1">
                          {docker.containers?.active || 0} Aktif / {docker.containers?.total || 0}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Card Footer Actions */}
              <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => onInspectSingle(podId)}
                    disabled={isInspectingThis || !isOnline}
                    className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-cyan-300 border border-slate-700 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-40"
                    title="Scan ulang status Docker di POD ini"
                  >
                    <RefreshCw size={11} className={inspectingSinglePodId === podId ? 'animate-spin text-cyan-400' : ''} />
                    <span>Scan Ulang</span>
                  </button>

                  <button
                    onClick={onGoToMediaStorage}
                    className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-purple-300 hover:text-white border border-slate-700 text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer"
                    title="Buka Direktori & Katalog Media S3"
                  >
                    <Film size={11} />
                    <span>Media S3</span>
                  </button>
                </div>

                {isOnline && (
                  <button
                    onClick={() => onOpenCleanupModal([pod])}
                    className="px-3 py-1.5 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 hover:text-white border border-rose-500/30 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                    title="Pilih dan bersihkan sampah Docker di POD ini"
                  >
                    <Trash2 size={11} />
                    <span>Bersihkan Sampah</span>
                  </button>
                )}
              </div>

            </div>
          );
        })}
      </div>
    </div>
  );
}
