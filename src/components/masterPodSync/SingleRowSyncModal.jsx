import React from 'react';
import { Zap, AlertTriangle, X, CheckCircle2 } from 'lucide-react';

export default function SingleRowSyncModal({
  isOpen,
  onClose,
  masterInfo,
  pkColumn,
  pkValue,
  rowData,
  targetPodIds,
  setTargetPodIds,
  pods = [],
  isSyncing,
  onConfirmSync
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-950 border border-amber-500/40 rounded-3xl p-6 max-w-md w-full shadow-2xl flex flex-col gap-4">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-amber-500/15 text-amber-400 border border-amber-500/30">
              <Zap size={16} className="fill-amber-400" />
            </span>
            <h3 className="text-sm font-bold text-white">
              Sync 1 Baris Data ke Unit POD
            </h3>
          </div>
          <button
            onClick={onClose}
            disabled={isSyncing}
            className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        {/* Row Detail Preview */}
        <p className="text-xs text-slate-300">
          Menyalin 1 baris data ini dari Database Master <strong>{masterInfo?.name}</strong> ke unit POD terpilih:
        </p>

        <div className="bg-slate-900/80 p-3.5 rounded-2xl border border-slate-800 flex flex-col gap-1.5 text-xs font-mono">
          <div className="flex items-center justify-between">
            <span className="text-slate-400 font-sans">Tabel:</span>
            <span className="text-cyan-300 font-bold">public.{masterInfo?.tableName}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-400 font-sans">Kunci Baris ({pkColumn}):</span>
            <span className="text-amber-400 font-bold bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
              {String(pkValue)}
            </span>
          </div>
        </div>

        {/* Target POD Selector */}
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-slate-300">
              Pilih Target POD ({targetPodIds.length} dipilih):
            </label>
            <button
              type="button"
              onClick={() => {
                const onlineIds = pods.filter(p => p.isOnline).map(p => p.id);
                if (targetPodIds.length === onlineIds.length) setTargetPodIds([]);
                else setTargetPodIds(onlineIds);
              }}
              className="text-[11px] text-amber-400 hover:text-amber-300 font-bold cursor-pointer"
            >
              {targetPodIds.length === pods.filter(p => p.isOnline).length ? 'Hapus Semua' : 'Pilih Semua Online'}
            </button>
          </div>

          <div className="max-h-36 overflow-y-auto bg-slate-900/60 p-2.5 rounded-xl border border-slate-800 flex flex-col gap-1.5 text-xs">
            {pods.map(p => {
              const isOffline = !p.isOnline;
              return (
                <label
                  key={p.id}
                  className={`flex items-center justify-between ${
                    isOffline ? 'text-slate-600 cursor-not-allowed' : 'text-slate-300 cursor-pointer'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      disabled={isOffline}
                      checked={targetPodIds.includes(p.id)}
                      onChange={(e) => {
                        if (e.target.checked) setTargetPodIds(prev => [...prev, p.id]);
                        else setTargetPodIds(prev => prev.filter(id => id !== p.id));
                      }}
                      className="rounded border-slate-700 text-amber-500 focus:ring-0 disabled:opacity-40"
                    />
                    <span>{p.name} {isOffline ? '(OFFLINE)' : `(${p.rowCount} baris)`}</span>
                  </div>
                  <span className={`text-[10px] font-mono font-bold ${
                    p.status === 'SYNCED' ? 'text-emerald-400' : isOffline ? 'text-slate-600' : 'text-amber-400'
                  }`}>
                    {p.status}
                  </span>
                </label>
              );
            })}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-800">
          <button
            onClick={onClose}
            disabled={isSyncing}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold cursor-pointer"
          >
            Batal
          </button>
          <button
            onClick={onConfirmSync}
            disabled={isSyncing || targetPodIds.length === 0}
            className="px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-slate-950 font-extrabold rounded-xl text-xs flex items-center gap-1.5 cursor-pointer shadow-lg shadow-amber-500/30 disabled:opacity-50 transition-all hover:scale-105"
          >
            <Zap size={14} className={isSyncing ? 'animate-spin' : 'fill-slate-950'} />
            <span>{isSyncing ? 'Menyinkronkan...' : `Sync 1 Baris Ini ke ${targetPodIds.length} POD`}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
