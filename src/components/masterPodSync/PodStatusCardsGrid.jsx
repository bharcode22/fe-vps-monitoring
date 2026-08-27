import React from 'react';
import { Server, CheckCircle2, AlertTriangle, Zap, Eye, Database, Loader2 } from 'lucide-react';

export default function PodStatusCardsGrid({
  pods = [],
  masterInfo,
  activePodId,
  loadingPodId = null,
  onSelectPod,
  onQuickSyncPod,
  filterStatus,
  onFilterStatusChange
}) {
  const onlineCount = pods.filter(p => p.isOnline).length;
  const offlineCount = pods.filter(p => !p.isOnline).length;
  const syncedCount = pods.filter(p => p.status === 'SYNCED').length;
  const mismatchCount = pods.filter(p => p.isOnline && p.status !== 'SYNCED' && p.status !== 'NOT_LOADED').length;

  const filteredPods = pods.filter(pod => {
    if (filterStatus === 'online') return pod.isOnline;
    if (filterStatus === 'offline') return !pod.isOnline;
    if (filterStatus === 'synced') return pod.status === 'SYNCED';
    if (filterStatus === 'mismatch') return pod.isOnline && pod.status !== 'SYNCED' && pod.status !== 'NOT_LOADED';
    return true;
  });

  return (
    <div className="flex flex-col gap-4">
      {/* Filter Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-1 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-white flex items-center gap-1.5">
            <Server size={14} className="text-purple-400" />
            <span>Unit POD v3 Armada:</span>
          </span>
          <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
            {onlineCount} Online
          </span>
          {offlineCount > 0 && (
            <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-red-500/15 text-red-300 border border-red-500/30 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-red-400"></span>
              {offlineCount} Offline
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
          <button
            onClick={() => onFilterStatusChange('all')}
            className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
              filterStatus === 'all'
                ? 'bg-slate-800 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Semua ({pods.length})
          </button>
          <button
            onClick={() => onFilterStatusChange('online')}
            className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
              filterStatus === 'online'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm'
                : 'text-emerald-400/70 hover:text-emerald-300'
            }`}
          >
            Online ({onlineCount})
          </button>
          <button
            onClick={() => onFilterStatusChange('offline')}
            className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
              filterStatus === 'offline'
                ? 'bg-red-500/20 text-red-300 border border-red-500/40 shadow-sm'
                : 'text-red-400/70 hover:text-red-300'
            }`}
          >
            Offline ({offlineCount})
          </button>
          {mismatchCount > 0 && (
            <button
              onClick={() => onFilterStatusChange('mismatch')}
              className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                filterStatus === 'mismatch'
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm'
                  : 'text-amber-400/70 hover:text-amber-300'
              }`}
            >
              Drift ({mismatchCount})
            </button>
          )}
          {syncedCount > 0 && (
            <button
              onClick={() => onFilterStatusChange('synced')}
              className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                filterStatus === 'synced'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm'
                  : 'text-emerald-400/70 hover:text-emerald-300'
              }`}
            >
              Synced ({syncedCount})
            </button>
          )}
        </div>
      </div>

      {/* Grid of POD Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3.5">
        {filteredPods.map(pod => {
          const isSelected = String(activePodId) === String(pod.id);
          const isLoadingThis = String(loadingPodId) === String(pod.id);
          const isOffline = !pod.isOnline;
          const isNotLoaded = pod.status === 'NOT_LOADED';
          const isSynced = pod.status === 'SYNCED';

          return (
            <div
              key={pod.id}
              onClick={() => {
                if (!isLoadingThis) onSelectPod(pod.id);
              }}
              className={`group p-4 rounded-2xl border transition-all duration-200 cursor-pointer flex flex-col justify-between shadow-md ${
                isSelected
                  ? 'bg-purple-950/40 border-purple-500 shadow-purple-500/15 ring-2 ring-purple-500/40 scale-[1.02]'
                  : isOffline
                  ? 'bg-slate-900/40 border-red-500/20 opacity-80 hover:opacity-100 hover:border-red-500/40'
                  : 'bg-slate-900/70 hover:bg-slate-900 border-slate-800 hover:border-slate-700'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2 min-w-0">
                    {isLoadingThis ? (
                      <Loader2 size={12} className="animate-spin text-cyan-400 shrink-0" />
                    ) : (
                      <span
                        className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                          isOffline
                            ? 'bg-red-500 ring-2 ring-red-500/30'
                            : 'bg-emerald-400 animate-pulse ring-2 ring-emerald-500/30'
                        }`}
                        title={isOffline ? 'Server Offline' : 'Server Online'}
                      />
                    )}
                    <div className="truncate">
                      <span className="font-bold text-white text-xs truncate block" title={pod.name}>
                        {pod.name}
                      </span>
                      <span className="text-[10px] text-slate-500 font-mono block truncate">
                        {pod.host || ''}
                      </span>
                    </div>
                  </div>

                  {isLoadingThis ? (
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 flex items-center gap-1 font-mono shrink-0">
                      <Loader2 size={10} className="animate-spin" /> MEMUAT
                    </span>
                  ) : isOffline ? (
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-red-500/20 text-red-400 border border-red-500/30 font-mono shrink-0 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-red-400"></span> OFFLINE
                    </span>
                  ) : isNotLoaded ? (
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 font-mono shrink-0 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span> ONLINE
                    </span>
                  ) : isSynced ? (
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1 font-mono shrink-0">
                      <CheckCircle2 size={10} /> 100% SYNCED
                    </span>
                  ) : (
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1 font-mono shrink-0">
                      <AlertTriangle size={10} /> DRIFT
                    </span>
                  )}
                </div>

                <div className="mt-1 text-xs text-slate-300 font-mono flex items-center justify-between bg-slate-950/70 p-2 rounded-xl border border-slate-800/80">
                  <span className="text-[11px] text-slate-400 font-sans">Data Baris:</span>
                  {isLoadingThis ? (
                    <span className="font-bold text-cyan-400 animate-pulse text-[11px]">Memeriksa...</span>
                  ) : isOffline ? (
                    <span className="font-bold text-red-400 text-[11px]">Tidak Terjangkau</span>
                  ) : isNotLoaded ? (
                    <span className="font-bold text-purple-300 text-[11px] flex items-center gap-1">
                      <Zap size={10} /> Siap Komparasi
                    </span>
                  ) : (
                    <span className={`font-bold ${isSynced ? 'text-emerald-400' : 'text-amber-400'}`}>
                      {pod.rowCount} / {masterInfo?.rowCount || 0}
                    </span>
                  )}
                </div>
              </div>

              {/* Action Buttons: View Details & Instant Sync */}
              <div className="mt-3 pt-2.5 border-t border-slate-800 flex items-center justify-between gap-2">
                <span className={`text-[11px] font-bold flex items-center gap-1 ${
                  isLoadingThis 
                    ? 'text-cyan-400' 
                    : isOffline 
                    ? 'text-red-400/80' 
                    : isNotLoaded 
                    ? 'text-purple-400 group-hover:text-purple-300' 
                    : 'text-purple-400'
                }`}>
                  {isLoadingThis ? (
                    <>
                      <Loader2 size={12} className="animate-spin" />
                      <span>Sedang Memuat...</span>
                    </>
                  ) : isOffline ? (
                    <>
                      <AlertTriangle size={12} />
                      <span>Server Offline</span>
                    </>
                  ) : isNotLoaded ? (
                    <>
                      <Zap size={12} />
                      <span>Klik Komparasi Data</span>
                    </>
                  ) : (
                    <>
                      <Eye size={12} />
                      <span>{isSelected ? 'Sedang Dibuka' : 'Buka Detail'}</span>
                    </>
                  )}
                </span>

                {!isOffline && !isSynced && !isNotLoaded && !isLoadingThis && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onQuickSyncPod(pod.id);
                    }}
                    className="px-2.5 py-1 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-slate-950 font-extrabold rounded-lg text-[10px] flex items-center gap-1 cursor-pointer shadow-sm transition-all hover:scale-105"
                    title={`Sinkronkan data Master ke ${pod.name}`}
                  >
                    <Zap size={11} className="fill-slate-950" />
                    <span>Sync</span>
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
