import React from 'react';
import { Zap, AlertTriangle, ShieldCheck, Loader2, Database } from 'lucide-react';

export default function MasterPodSyncModal({
  isOpen,
  onClose,
  masterInfo,
  tableName,
  targetPodIds,
  setTargetPodIds,
  pods = [],
  dryRun,
  setDryRun,
  syncColumns,
  setSyncColumns,
  isSyncing,
  onPerformSync
}) {
  if (!isOpen) return null;

  const currentTableName = tableName || masterInfo?.tableName;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-950 border border-cyan-500/30 rounded-3xl p-6 max-w-lg w-full shadow-2xl flex flex-col gap-4 font-sans text-xs">
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <Zap size={18} className="text-amber-400 fill-amber-400" />
            <span>Konfirmasi Sinkronisasi: Master ➔ POD</span>
          </h3>
        </div>

        <p className="text-xs text-slate-400">
          Sistem akan menyinkronkan data tabel <strong className="text-cyan-300 font-mono">public.{currentTableName}</strong> ({masterInfo?.rowCount?.toLocaleString() || 0} baris) dari Database Master <strong className="text-purple-300">{masterInfo?.name || 'Master DB'}</strong> ke target POD V3 yang dipilih.
        </p>

        {/* Options: Dry Run & Sync Columns */}
        <div className="flex flex-col gap-2.5 bg-slate-900/60 p-3.5 rounded-2xl border border-slate-800 text-xs">
          <label className="flex items-center justify-between cursor-pointer">
            <div>
              <span className="font-bold text-white block">Mode Simulasi (Dry-Run)</span>
              <span className="text-[11px] text-slate-400 block">Uji coba tanpa menulis data nyata ke database target</span>
            </div>
            <input
              type="checkbox"
              checked={dryRun}
              onChange={(e) => setDryRun(e.target.checked)}
              className="rounded border-slate-700 text-cyan-500 focus:ring-0 cursor-pointer w-4 h-4"
            />
          </label>

          <div className="h-px bg-slate-800" />

          <label className="flex items-center justify-between cursor-pointer">
            <div>
              <span className="font-bold text-white block">Sinkronkan Skema Kolom (DDL)</span>
              <span className="text-[11px] text-slate-400 block">Otomatis tambahkan kolom master yang belum ada di target POD</span>
            </div>
            <input
              type="checkbox"
              checked={syncColumns}
              onChange={(e) => setSyncColumns(e.target.checked)}
              className="rounded border-slate-700 text-cyan-500 focus:ring-0 cursor-pointer w-4 h-4"
            />
          </label>
        </div>

        {/* Target PODs Selector */}
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
              className="text-[11px] text-cyan-400 hover:text-cyan-300 font-bold cursor-pointer"
            >
              {targetPodIds.length === pods.filter(p => p.isOnline).length ? 'Hapus Semua' : 'Pilih Semua Online'}
            </button>
          </div>

          <div className="max-h-40 overflow-y-auto bg-slate-900/60 p-2.5 rounded-xl border border-slate-800 flex flex-col gap-1.5 text-xs">
            {pods.map(p => {
              const isOffline = !p.isOnline;
              return (
                <label
                  key={p.id}
                  className={`flex items-center justify-between ${isOffline ? 'text-slate-600 cursor-not-allowed' : 'text-slate-300 cursor-pointer'
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
                      className="rounded border-slate-700 text-cyan-500 focus:ring-0 disabled:opacity-40"
                    />
                    <span>{p.name} {isOffline ? '(OFFLINE)' : `(${p.rowCount?.toLocaleString() || 0} baris)`}</span>
                  </div>
                  <span className={`text-[10px] font-mono font-bold ${p.status === 'SYNCED' ? 'text-emerald-400' : isOffline ? 'text-slate-600' : 'text-amber-400'
                    }`}>
                    {p.status}
                  </span>
                </label>
              );
            })}
          </div>
        </div>

        {/* Warning Indicator for Live Mode */}
        {!dryRun && (
          <div className="p-2.5 bg-red-500/15 border border-red-500/30 text-red-300 rounded-xl text-xs flex items-center gap-2">
            <AlertTriangle size={15} className="shrink-0" />
            <span>Mode Live Aktif: Data Master akan disinkronkan langsung ke database PostgreSQL target POD!</span>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-800">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold cursor-pointer"
          >
            Batal
          </button>
          <button
            onClick={onPerformSync}
            disabled={isSyncing || targetPodIds.length === 0}
            className={`px-5 py-2.5 rounded-xl text-xs font-extrabold flex items-center gap-1.5 cursor-pointer disabled:opacity-50 transition-all ${dryRun
              ? 'bg-gradient-to-r from-cyan-400 to-blue-500 text-slate-950 shadow-lg shadow-cyan-500/20'
              : 'bg-gradient-to-r from-amber-500 to-orange-600 text-slate-950 shadow-lg shadow-amber-500/20'
              }`}
          >
            {isSyncing ? (
              <Loader2 size={14} className="animate-spin text-slate-950" />
            ) : (
              <Zap size={14} className={dryRun ? 'text-slate-950' : 'fill-slate-950 text-slate-950'} />
            )}
            <span>{isSyncing ? 'Memproses Sinkronisasi...' : dryRun ? 'Jalankan Simulasi Sync' : 'Mulai Sinkronisasi Nyata'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
