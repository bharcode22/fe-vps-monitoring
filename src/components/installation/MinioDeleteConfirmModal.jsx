import React from 'react';
import { AlertTriangle, Trash2, X, RotateCw, HardDrive } from 'lucide-react';

export default function MinioDeleteConfirmModal({
  isOpen,
  onClose,
  targetAppName,
  targetEnv,
  versionsToDelete = [],
  isDeleting,
  onConfirm
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="glass-card w-full max-w-md p-6 rounded-2xl border border-rose-500/40 bg-slate-950/95 shadow-2xl flex flex-col gap-4">
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2.5 text-rose-400">
            <div className="p-2 rounded-xl bg-rose-500/20 border border-rose-500/30">
              <AlertTriangle size={20} />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-white">Konfirmasi Hapus Versi MinIO</h3>
              <p className="text-[11px] text-slate-400">Tindakan ini permanen dan tidak dapat dibatalkan</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Warning Content */}
        <div className="flex flex-col gap-3">
          <p className="text-xs text-slate-300">
            Anda akan menghapus seluruh file bundle artefak dari MinIO bucket <span className="font-mono text-cyan-300 font-bold">deploybox</span> untuk:
          </p>

          <div className="p-3 bg-slate-900 rounded-xl border border-slate-800 flex flex-col gap-2">
            <div className="flex justify-between text-xs">
              <span className="text-slate-400">Aplikasi:</span>
              <span className="font-bold text-white font-mono">{targetAppName}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-slate-400">Environment:</span>
              <span className="font-bold text-cyan-400 uppercase font-mono">{targetEnv}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-slate-400">Total Versi yang Dihapus:</span>
              <span className="font-bold text-rose-400 font-mono">{versionsToDelete.length} Versi</span>
            </div>
          </div>

          {/* List of Version Tags to Delete */}
          <div className="flex flex-col gap-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase">Daftar Versi:</span>
            <div className="max-h-36 overflow-y-auto rounded-lg border border-slate-800 bg-slate-900/60 p-2 space-y-1 scrollbar-thin">
              {versionsToDelete.map(ver => (
                <div key={ver} className="text-xs font-mono text-rose-300 flex items-center gap-1.5">
                  <Trash2 size={11} className="text-rose-400 shrink-0" />
                  <span className="truncate">{ver}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Modal Actions */}
        <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
          <button
            type="button"
            onClick={onClose}
            disabled={isDeleting}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-slate-300 rounded-xl text-xs font-bold transition-colors cursor-pointer"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isDeleting}
            className="px-4 py-2 bg-gradient-to-r from-rose-500 to-red-600 hover:from-rose-600 hover:to-red-700 text-white rounded-xl text-xs font-extrabold flex items-center gap-1.5 shadow-lg shadow-rose-500/25 transition-all cursor-pointer"
          >
            {isDeleting ? (
              <>
                <RotateCw size={14} className="animate-spin" />
                <span>Menghapus...</span>
              </>
            ) : (
              <>
                <Trash2 size={14} />
                <span>Hapus {versionsToDelete.length} Versi Sekarang</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
