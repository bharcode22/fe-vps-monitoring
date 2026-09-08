import React from 'react';
import { Music, Check, Info, Trash2, FileVideo, Zap, Image as ImageIcon, Layers } from 'lucide-react';
import DownloadUrlCopyButton from '../content/DownloadUrlCopyButton';

export default function TrackCatalogCard({
  item,
  isSelected,
  onSelectTrack,
  onOpenTrackInfo,
  onDeleteTrack,
  onToast
}) {
  const title = item.tittle || item.title || `SoundScape #${item.sound_scape}`;
  const artist = item.artist || 'Regenesis';
  const coverUrl = item.coverAlbumUrl
    ? (item.coverAlbumUrl.startsWith('http')
      ? item.coverAlbumUrl
      : `https://developerfile-084897310273.s3.ap-southeast-1.amazonaws.com${item.coverAlbumUrl}`)
    : null;

  return (
    <div
      onClick={() => onSelectTrack(item)}
      className={`p-2.5 rounded-2xl border transition-all cursor-pointer flex flex-col gap-2 group select-none ${
        isSelected
          ? 'bg-gradient-to-r from-purple-500/25 via-indigo-500/20 to-purple-500/10 border-purple-500/70 shadow-lg shadow-purple-500/15 ring-1 ring-purple-500/40'
          : 'bg-slate-950/60 border-slate-800/80 hover:border-purple-500/40 hover:bg-slate-900/80'
      }`}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          {coverUrl ? (
            <img
              src={coverUrl}
              alt="Cover"
              className="w-10 h-10 rounded-xl object-cover border border-slate-700 shrink-0 bg-slate-900"
              onError={(e) => { e.target.style.display = 'none'; }}
            />
          ) : (
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/30 text-purple-400 flex items-center justify-center shrink-0">
              <Music size={16} />
            </div>
          )}

          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="font-mono text-[11px] font-black text-purple-300">
                #{item.sound_scape}
              </span>
              {isSelected && (
                <span className="px-1.5 py-0.2 rounded text-[8.5px] font-bold bg-purple-500 text-slate-950 flex items-center gap-0.5">
                  <Check size={9} />
                  TERPILIH
                </span>
              )}
            </div>
            <h3 className="text-xs font-bold text-white truncate group-hover:text-purple-200 mt-0.5">
              {title}
            </h3>
            <p className="text-[10px] text-slate-400 truncate">
              {artist} • {item.album || 'Master Session'}
            </p>
          </div>
        </div>

        {/* Right Actions: Clear Labeled Detail & Delete Buttons */}
        <div className="flex items-center gap-1.5 shrink-0">
          {/* Info Payload Modal Button */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onOpenTrackInfo(item);
            }}
            className="px-2 py-1 rounded-xl bg-purple-500/15 hover:bg-purple-500/30 text-purple-200 border border-purple-500/40 text-[10.5px] font-bold flex items-center gap-1 transition-all cursor-pointer shadow-sm active:scale-95"
            title="Lihat Struktur Data Berkas Master API (music, video, lamp, album)"
          >
            <Info size={12} className="text-purple-400" />
            <span>Detail</span>
          </button>

          {/* Delete from Master API Button */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onDeleteTrack(item);
            }}
            className="px-2 py-1 rounded-xl bg-rose-500/10 hover:bg-rose-500/25 text-rose-300 hover:text-rose-100 border border-rose-500/30 hover:border-rose-500/50 text-[10.5px] font-bold flex items-center gap-1 transition-all cursor-pointer shadow-sm active:scale-95"
            title={`Hapus #${item.sound_scape} dari Master API`}
          >
            <Trash2 size={12} className="text-rose-400" />
            <span>Hapus</span>
          </button>
        </div>
      </div>

      {/* Expandable File Details for Selected Track */}
      {isSelected && (
        <div className="pt-2 border-t border-purple-500/20 grid grid-cols-1 gap-1 text-[9.5px] font-mono animate-in fade-in duration-150">
          {item.music && (
            <div className="flex items-center justify-between gap-1.5 px-2 py-1 rounded-lg bg-slate-950/60 border border-slate-800/80 text-cyan-300 min-w-0">
              <div className="flex items-center gap-1.5 min-w-0">
                <Music size={10} className="text-cyan-400 shrink-0" />
                <span className="text-slate-400 font-sans shrink-0 font-semibold">music:</span>
                <span className="truncate" title={item.music}>{item.music}</span>
              </div>
              <DownloadUrlCopyButton
                soundScape={item.sound_scape}
                filename={item.music}
                category="audio"
                onToast={onToast}
              />
            </div>
          )}
          {item.video && (
            <div className="flex items-center justify-between gap-1.5 px-2 py-1 rounded-lg bg-slate-950/60 border border-slate-800/80 text-rose-300 min-w-0">
              <div className="flex items-center gap-1.5 min-w-0">
                <FileVideo size={10} className="text-rose-400 shrink-0" />
                <span className="text-slate-400 font-sans shrink-0 font-semibold">video:</span>
                <span className="truncate" title={item.video}>{item.video}</span>
              </div>
              <DownloadUrlCopyButton
                soundScape={item.sound_scape}
                filename={item.video}
                category="video"
                onToast={onToast}
              />
            </div>
          )}
          {item.lamp && (
            <div className="flex items-center justify-between gap-1.5 px-2 py-1 rounded-lg bg-slate-950/60 border border-slate-800/80 text-amber-300 min-w-0">
              <div className="flex items-center gap-1.5 min-w-0">
                <Zap size={10} className="text-amber-400 shrink-0" />
                <span className="text-slate-400 font-sans shrink-0 font-semibold">lamp:</span>
                <span className="truncate" title={item.lamp}>{item.lamp}</span>
              </div>
              <DownloadUrlCopyButton
                soundScape={item.sound_scape}
                filename={item.lamp}
                onToast={onToast}
              />
            </div>
          )}
          {(item.cover_album || item.coverAlbumUrl) && (
            <div className="flex items-center justify-between gap-1.5 px-2 py-1 rounded-lg bg-slate-950/60 border border-slate-800/80 text-emerald-300 min-w-0">
              <div className="flex items-center gap-1.5 min-w-0">
                <ImageIcon size={10} className="text-emerald-400 shrink-0" />
                <span className="text-slate-400 font-sans shrink-0 font-semibold">image:</span>
                <span className="truncate" title={item.cover_album || item.coverAlbumUrl}>
                  {item.cover_album || (item.coverAlbumUrl ? item.coverAlbumUrl.split('/').pop().split('?')[0] : 'cover.jpg')}
                </span>
              </div>
              <DownloadUrlCopyButton
                soundScape={item.sound_scape}
                filename={item.coverAlbumUrl || item.cover_album}
                onToast={onToast}
              />
            </div>
          )}
          {item.album && (
            <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-slate-950/60 border border-slate-800/80 text-purple-300 min-w-0">
              <Layers size={10} className="text-purple-400 shrink-0" />
              <span className="text-slate-400 font-sans shrink-0 font-semibold">album:</span>
              <span className="truncate" title={item.album}>{item.album}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
