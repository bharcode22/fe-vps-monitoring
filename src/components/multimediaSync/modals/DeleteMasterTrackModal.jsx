import React from 'react';
import { Trash2, X, Music, AlertTriangle, Loader2 } from 'lucide-react';

export default function DeleteMasterTrackModal({
  item,
  isDeleting,
  onClose,
  onConfirm
}) {
  if (!item) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200"
      onClick={() => !isDeleting && onClose()}
    >
      <div
        className="w-full max-w-md rounded-3xl bg-slate-900 border border-rose-500/30 p-6 shadow-2xl shadow-rose-500/15 space-y-5 animate-in zoom-in-95 duration-200"
        onClick={e => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-rose-500/20 border border-rose-500/40 text-rose-300">
              <Trash2 size={22} />
            </div>
            <div>
              <h3 className="text-base font-black text-white">
                Hapus Konten Multimedia
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Hapus data katalog dari Master API
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isDeleting}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-all cursor-pointer disabled:opacity-50"
          >
            <X size={16} />
          </button>
        </div>

        {/* Target Track Information */}
        <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-rose-500/20 flex items-center gap-3.5">
          {item.coverAlbumUrl ? (
            <img
              src={item.coverAlbumUrl.startsWith('http') ? item.coverAlbumUrl : `https://developerfile-084897310273.s3.ap-southeast-1.amazonaws.com${item.coverAlbumUrl}`}
              alt="Cover"
              className="w-12 h-12 rounded-xl object-cover border border-slate-700 shrink-0 bg-slate-900"
              onError={e => { e.target.style.display = 'none'; }}
            />
          ) : (
            <div className="w-12 h-12 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 flex items-center justify-center shrink-0">
              <Music size={20} />
            </div>
          )}
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-black text-rose-300">
                #{item.sound_scape}
              </span>
              <span className="px-2 py-0.2 rounded text-[9px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30">
                Master API
              </span>
            </div>
            <h4 className="text-sm font-bold text-white truncate mt-0.5">
              {item.tittle || item.title || `SoundScape #${item.sound_scape}`}
            </h4>
            <p className="text-xs text-slate-400 truncate">
              {item.artist || 'Regenesis'} • {item.album || 'Master Session'}
            </p>
          </div>
        </div>

        {/* Warning Notice */}
        <div className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-start gap-2.5 text-xs text-rose-200">
          <AlertTriangle size={16} className="text-rose-400 shrink-0 mt-0.5" />
          <div className="leading-relaxed">
            Tindakan ini akan memanggil endpoint <code className="text-rose-300 font-mono font-bold">DELETE /admin-api/multimedia/delete/{item.sound_scape}</code>. Data yang telah dihapus dari Master API tidak dapat dipulihkan.
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            disabled={isDeleting}
            className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-all cursor-pointer disabled:opacity-50"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isDeleting}
            className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition-all cursor-pointer flex items-center gap-2 shadow-lg shadow-rose-600/30 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isDeleting ? (
              <>
                <Loader2 size={14} className="animate-spin text-white" />
                <span>Menghapus...</span>
              </>
            ) : (
              <>
                <Trash2 size={14} />
                <span>Ya, Hapus Multimedia</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
