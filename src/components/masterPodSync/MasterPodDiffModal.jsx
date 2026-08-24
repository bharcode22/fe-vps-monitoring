import React from 'react';
import { X, AlertTriangle, CheckCircle2, Zap } from 'lucide-react';

export default function MasterPodDiffModal({
  pod,
  masterInfo,
  onClose,
  onSyncThisPod
}) {
  if (!pod) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-950 border border-cyan-500/30 rounded-3xl p-6 max-w-lg w-full shadow-2xl flex flex-col gap-4 max-h-[85vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <AlertTriangle size={18} className="text-amber-400" />
            <h3 className="text-sm font-bold text-white">
              Rincian Perbedaan: {pod.name}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        {/* Pod Status Pill */}
        <div className="flex items-center justify-between bg-slate-900/60 p-3 rounded-xl border border-slate-800 text-xs">
          <div>
            <span className="text-slate-400 block text-[10px]">Status Integritas Data</span>
            <span className="font-bold text-white text-xs">
              {pod.status === 'SYNCED' ? '100% Selaras dengan Master' : 'Memiliki Perbedaan Data / Kolom'}
            </span>
          </div>
          <div className="text-right">
            <span className="text-slate-400 block text-[10px]">Jumlah Baris</span>
            <span className="font-mono font-bold text-cyan-400">
              {pod.rowCount} / {masterInfo?.rowCount || 0} Baris
            </span>
          </div>
        </div>

        {/* Missing Columns Section */}
        {pod.missingColumnsCount > 0 && (
          <div className="flex flex-col gap-1.5 bg-red-500/10 border border-red-500/30 p-3 rounded-xl text-xs">
            <span className="font-bold text-red-300">
              🚫 Kolom yang Belum Ada di {pod.name} ({pod.missingColumnsCount}):
            </span>
            <div className="flex flex-wrap gap-1.5 mt-1">
              {(pod.missingColumns || []).map((col, i) => (
                <span key={i} className="px-2 py-0.5 rounded bg-red-500/20 text-red-300 font-mono text-[11px]">
                  {col}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Missing Rows Sample Section */}
        {pod.missingRowsCount > 0 && (
          <div className="flex flex-col gap-1.5 bg-amber-500/10 border border-amber-500/30 p-3 rounded-xl text-xs">
            <span className="font-bold text-amber-300">
              ⚠️ Contoh Baris Master yang Belum Ada di {pod.name} ({pod.missingRowsCount} baris total):
            </span>
            <div className="max-h-36 overflow-y-auto flex flex-col gap-1 mt-1 font-mono text-[11px] text-slate-300">
              {(pod.missingRowsSample || []).map((key, i) => (
                <div key={i} className="bg-slate-900/80 px-2 py-1 rounded border border-slate-800 truncate">
                  &bull; {key}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-800">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold cursor-pointer"
          >
            Tutup
          </button>
          <button
            onClick={() => {
              onSyncThisPod(pod.id);
              onClose();
            }}
            className="px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-slate-950 font-extrabold rounded-xl text-xs flex items-center gap-1.5 cursor-pointer shadow-md shadow-amber-500/20"
          >
            <Zap size={14} className="fill-slate-950" />
            <span>Sinkronkan {pod.name} Sekarang</span>
          </button>
        </div>
      </div>
    </div>
  );
}
