import React from 'react';
import { Layers, X, Music, Play, FileVideo, Film, Zap, Eye } from 'lucide-react';
import DownloadUrlCopyButton from '../../content/DownloadUrlCopyButton';

export default function TrackInfoModal({
  track,
  onClose,
  onNavigateView,
  onToast,
  onOpenMediaPreview
}) {
  if (!track) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-3xl bg-slate-900 border border-purple-500/30 p-6 shadow-2xl shadow-purple-500/15 space-y-5 animate-in zoom-in-95 duration-200"
        onClick={e => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-3 rounded-2xl bg-purple-500/20 border border-purple-500/40 text-purple-300 shrink-0">
              <Layers size={22} />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-black text-purple-300">
                  Folder #{track.sound_scape}
                </span>
                <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30">
                  Master API Payload
                </span>
              </div>
              <h3 className="text-base font-black text-white truncate mt-0.5">
                {track.tittle || track.title || `Track #${track.sound_scape}`}
              </h3>
              <p className="text-xs text-slate-400 truncate">
                {track.artist || 'Regenesis'} • {track.album || 'Master Session'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-all cursor-pointer shrink-0"
          >
            <X size={16} />
          </button>
        </div>

        {/* Key-Value File Cards */}
        <div className="space-y-2">
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
            Daftar Berkas Di Cloud:
          </div>

          {/* Music Audio */}
          <div className="p-2.5 rounded-2xl bg-slate-950/80 border border-cyan-500/25 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400 shrink-0">
                <Music size={15} />
              </div>
              <div className="min-w-0 font-mono">
                <span className="text-[9.5px] text-slate-400 uppercase font-sans font-bold block">music</span>
                <span className="text-xs text-cyan-200 font-semibold truncate block" title={track.music}>
                  {track.music || '<kosong / tidak ada>'}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              {track.music && (
                <>
                  <DownloadUrlCopyButton
                    soundScape={track.sound_scape}
                    filename={track.music}
                    category="audio"
                    variant="detail"
                    onToast={onToast}
                  />
                  <button
                    type="button"
                    onClick={() => onOpenMediaPreview({
                      filename: track.music,
                      category: 'audio',
                      url: `https://developerfile-084897310273.s3.ap-southeast-1.amazonaws.com/media/${track.sound_scape}/${track.music}`,
                      sourceLabel: `AWS S3 • media/${track.sound_scape}/`
                    })}
                    className="px-2.5 py-1 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 text-[10.5px] font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm active:scale-95"
                    title="Putar / Preview Audio dari AWS S3"
                  >
                    <Play size={10} className="fill-cyan-400 text-cyan-400" />
                    <span>Preview</span>
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Video MP4 */}
          <div className="p-2.5 rounded-2xl bg-slate-950/80 border border-rose-500/25 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="p-2 rounded-xl bg-rose-500/10 text-rose-400 shrink-0">
                <FileVideo size={15} />
              </div>
              <div className="min-w-0 font-mono">
                <span className="text-[9.5px] text-slate-400 uppercase font-sans font-bold block">video</span>
                <span className="text-xs text-rose-200 font-semibold truncate block" title={track.video}>
                  {track.video || '<kosong / tidak ada>'}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              {track.video && (
                <>
                  <DownloadUrlCopyButton
                    soundScape={track.sound_scape}
                    filename={track.video}
                    category="video"
                    variant="detail"
                    onToast={onToast}
                  />
                  <button
                    type="button"
                    onClick={() => onOpenMediaPreview({
                      filename: track.video,
                      category: 'video',
                      url: `https://developerfile-084897310273.s3.ap-southeast-1.amazonaws.com/media/${track.sound_scape}/${track.video}`,
                      sourceLabel: `AWS S3 • media/${track.sound_scape}/`
                    })}
                    className="px-2.5 py-1 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 text-[10.5px] font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm active:scale-95"
                    title="Putar / Preview Video dari AWS S3"
                  >
                    <Film size={10} className="text-rose-400" />
                    <span>Preview</span>
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Lamp Strobe WAV */}
          <div className="p-2.5 rounded-2xl bg-slate-950/80 border border-amber-500/25 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 shrink-0">
                <Zap size={15} />
              </div>
              <div className="min-w-0 font-mono">
                <span className="text-[9.5px] text-slate-400 uppercase font-sans font-bold block">lamp</span>
                <span className="text-xs text-amber-200 font-semibold truncate block" title={track.lamp}>
                  {track.lamp || '<kosong / tidak ada>'}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              {track.lamp && (
                <>
                  <DownloadUrlCopyButton
                    soundScape={track.sound_scape}
                    filename={track.lamp}
                    category="strobe"
                    variant="detail"
                    onToast={onToast}
                  />
                  <button
                    type="button"
                    onClick={() => onOpenMediaPreview({
                      filename: track.lamp,
                      category: 'lamp',
                      isStrobe: true,
                      url: `https://developerfile-084897310273.s3.ap-southeast-1.amazonaws.com/media/${track.sound_scape}/${track.lamp}`,
                      sourceLabel: `AWS S3 • media/${track.sound_scape}/`
                    })}
                    className="px-2.5 py-1 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-[10.5px] font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm active:scale-95"
                    title="Putar & Simulasi Lampu Strobe dari AWS S3"
                  >
                    <Zap size={10} className="fill-amber-400 text-amber-400" />
                    <span>Preview</span>
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Album String */}
          <div className="p-2.5 rounded-2xl bg-slate-950/80 border border-purple-500/25 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400 shrink-0">
                <Layers size={15} />
              </div>
              <div className="min-w-0 font-mono">
                <span className="text-[9.5px] text-slate-400 uppercase font-sans font-bold block">album</span>
                <span className="text-xs text-purple-200 font-semibold truncate block" title={track.album}>
                  {track.album || '<kosong / tidak ada>'}
                </span>
              </div>
            </div>
          </div>

          {/* Cover Album (if present) */}
          {track.coverAlbumUrl && (
            <div className="p-2.5 rounded-2xl bg-slate-950/80 border border-emerald-500/25 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 shrink-0">
                  <Eye size={15} />
                </div>
                <div className="min-w-0 font-mono">
                  <span className="text-[9.5px] text-slate-400 uppercase font-sans font-bold block">cover_album</span>
                  <span className="text-xs text-emerald-200 font-semibold truncate block" title={track.coverAlbumUrl}>
                    {track.cover_album || 'Cover Album Artwork'}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <DownloadUrlCopyButton
                  soundScape={track.sound_scape}
                  filename={track.cover_album || track.coverAlbumUrl}
                  category="image"
                  variant="detail"
                  onToast={onToast}
                />
                <button
                  type="button"
                  onClick={() => onOpenMediaPreview({
                    filename: track.cover_album || 'cover.jpg',
                    category: 'image',
                    url: track.coverAlbumUrl.startsWith('http')
                      ? track.coverAlbumUrl
                      : `https://developerfile-084897310273.s3.ap-southeast-1.amazonaws.com${track.coverAlbumUrl}`,
                    sourceLabel: `AWS S3 • media/${track.sound_scape}/`
                  })}
                  className="px-2.5 py-1 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 text-[10.5px] font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm active:scale-95"
                  title="Lihat Preview Gambar Cover dari AWS S3"
                >
                  <Eye size={10} className="text-emerald-400" />
                  <span>Preview</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer Actions */}
        <div className="flex items-center justify-between gap-3 pt-1">
          {onNavigateView && (
            <button
              type="button"
              onClick={() => {
                const code = String(track.sound_scape);
                onClose();
                onNavigateView('storage-manager', { code, returnView: 'multimedia-sync' });
              }}
              className="px-4 py-2 rounded-xl bg-purple-600/30 hover:bg-purple-600/40 text-purple-200 border border-purple-500/40 text-xs font-bold flex items-center gap-2 transition-all cursor-pointer"
            >
              <Layers size={13} />
              <span>Buka di Storage Manager</span>
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold transition-all cursor-pointer ml-auto"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
}
