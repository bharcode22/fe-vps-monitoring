import React from 'react';
import { Shuffle, X, Music, AlertTriangle, Loader2 } from 'lucide-react';

export default function ConfirmResaveModal({
  isOpen,
  onClose,
  selectedItem,
  targetCoverUrl,
  onlinePodsCount,
  totalPodsCount,
  runningContainersCount,
  exitedContainersCount,
  isTriggeringResave,
  onConfirm
}) {
  if (!isOpen || !selectedItem) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200"
      onClick={() => !isTriggeringResave && onClose()}
    >
      <div
        className="w-full max-w-lg rounded-3xl bg-slate-900 border border-purple-500/30 p-6 shadow-2xl shadow-purple-500/15 space-y-5 animate-in zoom-in-95 duration-200"
        onClick={e => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-gradient-to-br from-purple-500/20 to-cyan-500/20 border border-purple-500/40 text-purple-300">
              <Shuffle size={22} className="animate-pulse" />
            </div>
            <div>
              <h3 className="text-base font-black text-white">
                Konfirmasi Sinkronisasi RabbitMQ
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Trigger unduhan multimedia ke seluruh armada unit POD V3
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isTriggeringResave}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-all cursor-pointer disabled:opacity-50"
          >
            <X size={16} />
          </button>
        </div>

        {/* Target Track Information Card */}
        <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-purple-500/20 flex items-center gap-3.5">
          {targetCoverUrl ? (
            <img
              src={targetCoverUrl}
              alt="Cover"
              className="w-14 h-14 rounded-xl object-cover border border-slate-700 shrink-0 bg-slate-900"
              onError={e => { e.target.style.display = 'none'; }}
            />
          ) : (
            <div className="w-14 h-14 rounded-xl bg-purple-500/10 border border-purple-500/30 text-purple-400 flex items-center justify-center shrink-0">
              <Music size={22} />
            </div>
          )}
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-black text-purple-300">
                #{selectedItem.sound_scape}
              </span>
              <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30">
                Target Sinkronisasi
              </span>
            </div>
            <h4 className="text-sm font-bold text-white truncate mt-0.5">
              {selectedItem.tittle || selectedItem.title || `SoundScape #${selectedItem.sound_scape}`}
            </h4>
            <p className="text-xs text-slate-400 truncate">
              {selectedItem.artist || 'Regenesis'} • {selectedItem.album || 'Master Session'}
            </p>
          </div>
        </div>

        {/* Fleet Status Summary Cards */}
        <div className="grid grid-cols-2 gap-2.5 text-xs">
          <div className="p-3 rounded-2xl bg-slate-950/60 border border-slate-800 flex items-center justify-between">
            <span className="text-slate-400">Total POD Online:</span>
            <span className="font-bold text-white font-mono">{onlinePodsCount} / {totalPodsCount} Unit</span>
          </div>
          <div className="p-3 rounded-2xl bg-slate-950/60 border border-slate-800 flex items-center justify-between">
            <span className="text-slate-400">Container Aktif:</span>
            <span className="font-bold text-emerald-400 font-mono">{runningContainersCount} Ready</span>
          </div>
        </div>

        {/* Warning Alert if Exited Containers exist */}
        {exitedContainersCount > 0 && (
          <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-3">
            <AlertTriangle size={18} className="text-amber-400 shrink-0 mt-0.5" />
            <div className="text-xs text-amber-200">
              <p className="font-bold text-amber-300 mb-0.5">
                Perhatian: {exitedContainersCount} POD memiliki container mobile-synch mati (Exited)
              </p>
              <p className="text-[11px] text-amber-300/80 leading-relaxed">
                POD dengan container mati tidak akan menerima event unduhan RabbitMQ. Anda dapat menyalakan container terlebih dahulu pada tabel matriks atau tetap melanjutkan pengiriman ke unit yang aktif.
              </p>
            </div>
          </div>
        )}

        {/* Description Text */}
        <p className="text-[11px] text-slate-400 leading-relaxed">
          Sistem akan mengirim perintah <code className="text-purple-300 font-mono font-bold">re-save/{selectedItem.sound_scape}</code> ke Master API, memicu antrean pesan RabbitMQ ke seluruh unit POD yang aktif untuk mengunduh berkas multimedia.
        </p>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            disabled={isTriggeringResave}
            className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-all cursor-pointer disabled:opacity-50"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isTriggeringResave}
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-purple-500 via-indigo-500 to-cyan-500 hover:from-purple-400 hover:to-cyan-400 text-slate-950 text-xs font-black transition-all cursor-pointer flex items-center gap-2 shadow-lg shadow-purple-500/20 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isTriggeringResave ? (
              <>
                <Loader2 size={15} className="animate-spin text-slate-950" />
                <span>Mengirim Trigger...</span>
              </>
            ) : (
              <>
                <Shuffle size={15} />
                <span>Ya, Kirim Trigger RabbitMQ</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
