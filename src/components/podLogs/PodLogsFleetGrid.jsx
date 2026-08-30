import React from 'react';
import { RefreshCw, Eye, Zap } from 'lucide-react';

export default function PodLogsFleetGrid({
  filteredPods = [],
  isLoadingAudit,
  isPulling,
  targetScope,
  onOpenDiffModal,
  onStartPull
}) {
  if (isLoadingAudit) {
    return (
      <div className="col-span-full p-12 flex flex-col items-center justify-center text-slate-400">
        <RefreshCw size={24} className="animate-spin text-rose-400 mb-2" />
        <span className="text-xs">Mengaudit baris pod_logs di seluruh unit POD V3...</span>
      </div>
    );
  }

  if (filteredPods.length === 0) {
    return (
      <div className="col-span-full p-12 text-center text-slate-500 text-xs bg-slate-950 border border-slate-800 rounded-2xl">
        Tidak ada unit POD V3 yang cocok dengan filter pencarian.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3.5">
      {filteredPods.map((pod) => {
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
                onClick={() => onOpenDiffModal(pod)}
                className="flex-1 py-2 bg-slate-800 hover:bg-cyan-500/20 text-cyan-300 border border-slate-700 hover:border-cyan-500/40 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                title="Buka Komparasi Detail POD vs Master"
              >
                <Eye size={13} />
                <span>Bandingkan</span>
              </button>
              <button
                onClick={() => onStartPull(pod.id)}
                disabled={isPulling || !pod.isOnline}
                className={`py-2 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  pod.unsyncedRows > 0
                    ? 'bg-gradient-to-r from-rose-600 to-amber-600 hover:from-rose-500 hover:to-amber-500 text-white shadow-md shadow-rose-500/20'
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700'
                }`}
                title={
                  pod.unsyncedRows > 0
                    ? `Tarik ${pod.unsyncedRows.toLocaleString()} log yang belum ada di Master`
                    : 'Sinkronkan ulang unit ini ke Master'
                }
              >
                <Zap
                  size={13}
                  className={pod.unsyncedRows > 0 ? 'text-amber-200 fill-current' : 'text-rose-400'}
                />
                <span>{pod.unsyncedRows > 0 ? `Tarik (${pod.unsyncedRows.toLocaleString()})` : 'Tarik'}</span>
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
