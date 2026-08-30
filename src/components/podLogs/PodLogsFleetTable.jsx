import React from 'react';
import { Server, RefreshCw, AlertCircle, Eye, Zap } from 'lucide-react';

export default function PodLogsFleetTable({
  filteredPods = [],
  totalPodsCount = 0,
  isLoadingAudit,
  auditError,
  isPulling,
  targetScope,
  onOpenDiffModal,
  onStartPull
}) {
  return (
    <div className="bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden shadow-xl flex flex-col">
      <div className="bg-slate-900/80 border-b border-slate-800 px-4 py-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Server size={17} className="text-rose-400" />
          <h3 className="text-sm font-bold text-white">Status Seluruh Unit POD V3</h3>
        </div>
        <span className="text-xs text-slate-400 font-mono">
          {filteredPods.length} dari {totalPodsCount} unit POD V3
        </span>
      </div>

      {isLoadingAudit ? (
        <div className="p-12 flex flex-col items-center justify-center text-slate-400">
          <RefreshCw size={24} className="animate-spin text-rose-400 mb-2" />
          <span className="text-xs">Mengaudit baris pod_logs di seluruh unit POD V3...</span>
        </div>
      ) : auditError ? (
        <div className="p-6 text-center text-rose-400 text-xs">
          <AlertCircle size={24} className="mx-auto mb-2 text-rose-400" />
          <span>{auditError}</span>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-900/50 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
              <tr>
                <th className="px-4 py-3">Unit POD V3</th>
                <th className="px-4 py-3">Alamat IP LAN</th>
                <th className="px-4 py-3">Status Koneksi</th>
                <th className="px-4 py-3 text-right">Total di POD</th>
                <th className="px-4 py-3 text-right">Ada di Master</th>
                <th className="px-4 py-3 text-right">Belum di Master (ID Diff)</th>
                <th className="px-4 py-3 text-center">Progress</th>
                <th className="px-4 py-3 text-center">Aksi Cepat</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredPods.map((pod) => {
                const isTargetThis = isPulling && targetScope === String(pod.id);
                const percentSynced =
                  pod.totalRows > 0
                    ? Math.min(100, Math.round(((pod.masterRows || 0) / pod.totalRows) * 100))
                    : 100;

                return (
                  <tr
                    key={pod.id}
                    className={`transition-colors ${
                      isTargetThis
                        ? 'bg-rose-500/10 border-l-2 border-rose-500'
                        : 'hover:bg-slate-900/40'
                    }`}
                  >
                    <td className="px-4 py-3 font-semibold text-white">
                      <div className="flex items-center gap-2">
                        <span>{pod.name}</span>
                        <span className="text-[10px] px-1.5 py-0.2 bg-cyan-500/20 text-cyan-300 font-mono rounded font-bold border border-cyan-500/30">
                          V3
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 font-mono text-cyan-300">
                      {pod.host}
                    </td>
                    <td className="px-4 py-3">
                      {pod.isOnline ? (
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> Online
                        </span>
                      ) : (
                        <span
                          className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-rose-500/15 text-rose-300 border border-rose-500/30"
                          title={pod.error}
                        >
                          Offline
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right font-mono font-bold text-slate-200">
                      {pod.isOnline ? pod.totalRows.toLocaleString() : '-'}
                    </td>
                    <td className="px-4 py-3 text-right font-mono font-bold text-indigo-300">
                      {pod.isOnline ? (pod.masterRows || 0).toLocaleString() : '-'}
                    </td>
                    <td className="px-4 py-3 text-right font-mono font-bold">
                      {pod.isOnline ? (
                        <span className={pod.unsyncedRows > 0 ? 'text-amber-400' : 'text-emerald-400'}>
                          {pod.unsyncedRows.toLocaleString()}
                        </span>
                      ) : (
                        '-'
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {pod.isOnline ? (
                        <span className="font-mono text-[11px] text-slate-400">
                          {percentSynced}%
                        </span>
                      ) : (
                        '-'
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => onOpenDiffModal(pod)}
                          className="px-2.5 py-1 bg-slate-800 hover:bg-cyan-500/20 text-cyan-300 border border-slate-700 hover:border-cyan-500/30 rounded-lg text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1"
                          title="Buka Komparasi Detail POD vs Master"
                        >
                          <Eye size={12} />
                          <span>Bandingkan</span>
                        </button>
                        <button
                          onClick={() => onStartPull(pod.id)}
                          disabled={isPulling || !pod.isOnline}
                          className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1 ${
                            pod.unsyncedRows > 0
                              ? 'bg-rose-600/30 hover:bg-rose-600/50 text-rose-300 border border-rose-500/40 font-bold'
                              : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700'
                          }`}
                          title={
                            pod.unsyncedRows > 0
                              ? `Tarik ${pod.unsyncedRows.toLocaleString()} log yang belum ada di Master`
                              : 'Sinkronkan ulang unit ini ke Master'
                          }
                        >
                          <Zap size={12} className={pod.unsyncedRows > 0 ? 'text-amber-400' : 'text-slate-400'} />
                          <span>{pod.unsyncedRows > 0 ? `Tarik (${pod.unsyncedRows.toLocaleString()})` : 'Tarik'}</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
