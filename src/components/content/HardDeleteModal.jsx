import React from 'react';
import { Trash2, AlertTriangle, RefreshCw } from 'lucide-react';

export default function HardDeleteModal({
  isOpen,
  onClose,
  onConfirm,
  isExecuting,
  title,
  description,
  podNameLabel
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[1000] flex items-center justify-center p-4">
      <div className="w-full max-w-lg bg-slate-950 border border-rose-500/40 rounded-3xl p-6 flex flex-col gap-4 shadow-2xl animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-rose-500/20 text-rose-400 border border-rose-500/30 rounded-xl">
              <Trash2 size={18} />
            </div>
            <div>
              <h3 className="text-base font-black text-white">{title}</h3>
              {podNameLabel && (
                <p className="text-xs text-slate-400">
                  Target: <strong className="text-rose-300 font-mono">{podNameLabel}</strong>
                </p>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isExecuting}
            className="text-slate-400 hover:text-white cursor-pointer"
          >
            &times;
          </button>
        </div>

        {/* Warning Alert */}
        <div className="p-4 rounded-2xl bg-rose-950/20 border border-rose-500/30 text-xs text-rose-300 flex items-start gap-2.5">
          <AlertTriangle size={18} className="shrink-0 mt-0.5 text-rose-400" />
          <div>
            <strong>Konfirmasi Hard Delete:</strong> {description}
          </div>
        </div>

        {/* Modal Action Controls */}
        <div className="flex items-center justify-between border-t border-slate-800 pt-3 mt-2">
          <button
            onClick={onClose}
            disabled={isExecuting}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold cursor-pointer"
          >
            Batal
          </button>

          <button
            onClick={onConfirm}
            disabled={isExecuting}
            className="px-5 py-2.5 bg-gradient-to-r from-rose-500 to-red-600 hover:from-rose-400 hover:to-red-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-rose-500/25 flex items-center gap-2 cursor-pointer transition-all disabled:opacity-50"
          >
            {isExecuting ? (
              <>
                <RefreshCw size={14} className="animate-spin" />
                <span>Sedang Menghapus...</span>
              </>
            ) : (
              <>
                <Trash2 size={14} />
                <span>Ya, Lakukan Hard Delete Sekarang</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
