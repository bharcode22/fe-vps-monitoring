import React from 'react';
import { Server, CheckCircle2, AlertTriangle, Zap, Eye, Database } from 'lucide-react';

export default function PodStatusCardsGrid({
  pods = [],
  masterInfo,
  activePodId,
  onSelectPod,
  onQuickSyncPod,
  filterStatus,
  onFilterStatusChange
}) {
  const filteredPods = pods.filter(pod => {
    if (filterStatus === 'synced') return pod.status === 'SYNCED';
    if (filterStatus === 'mismatch') return pod.isOnline && pod.status !== 'SYNCED';
    if (filterStatus === 'offline') return !pod.isOnline;
    return true;
  });

  const syncedCount = pods.filter(p => p.status === 'SYNCED').length;
  const mismatchCount = pods.filter(p => p.isOnline && p.status !== 'SYNCED').length;
  const offlineCount = pods.filter(p => !p.isOnline).length;

  return (
    <div className="flex flex-col gap-4">
      {/* Filter Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-1 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-white flex items-center gap-1.5">
            <Server size={14} className="text-purple-400" />
            <span>Pilih Unit POD v3 untuk Membuka Data Detail:</span>
          </span>
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
            onClick={() => onFilterStatusChange('mismatch')}
            className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
              filterStatus === 'mismatch'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm'
                : 'text-amber-400/70 hover:text-amber-300'
            }`}
          >
            Kurang / Drift ({mismatchCount})
          </button>
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
        </div>
      </div>

      {/* Grid of POD Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3.5">
        {filteredPods.map(pod => {
          const isSelected = String(activePodId) === String(pod.id);
          const isSynced = pod.status === 'SYNCED';
          const isOffline = !pod.isOnline;

          return (
            <div
              key={pod.id}
              onClick={() => onSelectPod(pod.id)}
              className={`p-4 rounded-2xl border transition-all duration-200 cursor-pointer flex flex-col justify-between shadow-md ${
                isSelected
                  ? 'bg-purple-950/40 border-purple-500 shadow-purple-500/15 ring-2 ring-purple-500/40 scale-[1.02]'
                  : 'bg-slate-900/70 hover:bg-slate-900 border-slate-800 hover:border-slate-700'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span
                      className={`w-2.5 h-2.5 rounded-full ${
                        isOffline
                          ? 'bg-red-500'
                          : isSynced
                          ? 'bg-emerald-400 animate-pulse'
                          : 'bg-amber-400 animate-pulse'
                      }`}
                    />
                    <span className="font-bold text-white text-xs truncate max-w-[130px]" title={pod.name}>
                      {pod.name}
                    </span>
                  </div>

                  {isOffline ? (
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-red-500/20 text-red-400 border border-red-500/30 font-mono">
                      OFFLINE
                    </span>
                  ) : isSynced ? (
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1 font-mono">
                      <CheckCircle2 size={10} /> 100% SYNCED
                    </span>
                  ) : (
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1 font-mono">
                      <AlertTriangle size={10} /> DRIFT
                    </span>
                  )}
                </div>

                <div className="mt-1 text-xs text-slate-300 font-mono flex items-center justify-between bg-slate-950/70 p-2 rounded-xl border border-slate-800/80">
                  <span className="text-[11px] text-slate-400 font-sans">Jumlah Baris:</span>
                  <span className={`font-bold ${isSynced ? 'text-emerald-400' : 'text-amber-400'}`}>
                    {pod.rowCount} / {masterInfo?.rowCount || 0}
                  </span>
                </div>
              </div>

              {/* Action Buttons: View Details & Instant Sync */}
              <div className="mt-3 pt-2.5 border-t border-slate-800 flex items-center justify-between gap-2">
                <span className="text-[11px] text-purple-400 font-bold flex items-center gap-1">
                  <Eye size={12} />
                  <span>{isSelected ? 'Sedang Dibuka' : 'Klik Buka Data'}</span>
                </span>

                {!isOffline && !isSynced && (
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
