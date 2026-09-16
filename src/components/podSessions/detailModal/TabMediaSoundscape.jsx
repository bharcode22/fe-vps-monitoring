import React from 'react';
import {
  Sparkles,
  Search,
  ChevronDown,
  ChevronUp,
  Music,
  CheckCircle2,
  Layers,
  Zap,
  FileVideo,
  Image as ImageIcon,
  FileText
} from 'lucide-react';
import { getMediaCoverUrl } from './constants';
import SoundscapeCatalogPicker from './SoundscapeCatalogPicker';

export default function TabMediaSoundscape({
  formData,
  handleChange,
  catalogItems = [],
  catalogSearch = '',
  setCatalogSearch,
  isCatalogOpen,
  setIsCatalogOpen,
  filteredCatalog = [],
  selectedSoundscapeItem,
  onSelectSoundscape
}) {
  return (
    <div className="space-y-6">
      {/* SoundScape Multimedia Selector & Active Card Preview */}
      <div className="p-4 rounded-2xl bg-gradient-to-br from-cyan-950/25 via-purple-950/20 to-slate-900/60 border border-purple-500/30 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles size={16} className="text-purple-400" />
            <span className="text-xs font-bold text-purple-300 uppercase tracking-wider">
              SoundScape & Integrasi Multimedia
            </span>
          </div>
          <button
            type="button"
            onClick={() => setIsCatalogOpen(!isCatalogOpen)}
            className="px-3 py-1.5 rounded-xl bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 border border-purple-500/40 text-xs font-semibold transition flex items-center gap-1.5 shadow-sm"
          >
            <Search size={13} />
            <span>{isCatalogOpen ? 'Tutup Pilihan Card' : 'Buka Katalog Card Multimedia'}</span>
            {isCatalogOpen ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
          </button>
        </div>

        {/* 1. Selected Multimedia Card Preview (if chosen) */}
        {formData.sound_scape ? (
          <div className="p-4 rounded-xl bg-slate-950/80 border border-purple-500/40 shadow-md">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                {getMediaCoverUrl(selectedSoundscapeItem?.coverAlbumUrl || formData.cover_album) ? (
                  <img
                    src={getMediaCoverUrl(selectedSoundscapeItem?.coverAlbumUrl || formData.cover_album)}
                    alt="Cover"
                    className="w-14 h-14 rounded-xl object-cover border border-purple-500/40 bg-slate-900 shrink-0 shadow"
                    onError={(e) => { e.target.style.display = 'none'; }}
                  />
                ) : (
                  <div className="w-14 h-14 rounded-xl bg-purple-600/20 border border-purple-500/40 text-purple-300 flex items-center justify-center shrink-0">
                    <Music size={24} />
                  </div>
                )}

                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-xs font-black text-purple-300 px-2 py-0.5 rounded-md bg-purple-500/20 border border-purple-500/30">
                      #{formData.sound_scape}
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                      <CheckCircle2 size={11} />
                      Data Media Tersinkron
                    </span>
                  </div>
                  <h4 className="text-sm font-extrabold text-white truncate mt-1">
                    {formData.title || selectedSoundscapeItem?.title || selectedSoundscapeItem?.tittle || `Track #${formData.sound_scape}`}
                  </h4>
                  <p className="text-xs text-slate-400 truncate">
                    {formData.artist || 'Regenesis'} • {formData.album || 'Regenesis'}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsCatalogOpen(!isCatalogOpen)}
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-medium transition flex items-center gap-1.5 self-start sm:self-center shrink-0"
              >
                <Layers size={13} className="text-cyan-400" />
                <span>Ganti SoundScape</span>
              </button>
            </div>

            {/* Preview Media Pills */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-3 mt-3 border-t border-slate-800/80 text-[11px]">
              <div className="bg-slate-900/90 p-2 rounded-lg border border-slate-800">
                <span className="text-[10px] text-cyan-400 font-semibold flex items-center gap-1">
                  <Music size={11} /> Audio (Song)
                </span>
                <span className="font-mono text-slate-200 truncate block mt-0.5" title={formData.song}>
                  {formData.song || '-'}
                </span>
              </div>

              <div className="bg-slate-900/90 p-2 rounded-lg border border-slate-800">
                <span className="text-[10px] text-amber-400 font-semibold flex items-center gap-1">
                  <Zap size={11} /> Strobe (Lamp)
                </span>
                <span className="font-mono text-slate-200 truncate block mt-0.5" title={formData.lamp}>
                  {formData.lamp || '-'}
                </span>
              </div>

              <div className="bg-slate-900/90 p-2 rounded-lg border border-slate-800">
                <span className="text-[10px] text-indigo-400 font-semibold flex items-center gap-1">
                  <FileVideo size={11} /> Video
                </span>
                <span className="font-mono text-slate-200 truncate block mt-0.5" title={formData.video}>
                  {formData.video || '(Tanpa Video)'}
                </span>
              </div>

              <div className="bg-slate-900/90 p-2 rounded-lg border border-slate-800">
                <span className="text-[10px] text-emerald-400 font-semibold flex items-center gap-1">
                  <ImageIcon size={11} /> Cover Album
                </span>
                <span className="font-mono text-slate-200 truncate block mt-0.5" title={formData.cover_album}>
                  {formData.cover_album || '-'}
                </span>
              </div>
            </div>
          </div>
        ) : (
          <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 text-center flex flex-col items-center justify-center space-y-2">
            <Music size={28} className="text-purple-400/60" />
            <p className="text-xs font-medium text-slate-300">
              Belum ada SoundScape yang dipilih untuk track ini.
            </p>
            <button
              type="button"
              onClick={() => setIsCatalogOpen(true)}
              className="px-3.5 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold transition flex items-center gap-1.5 shadow"
            >
              <Search size={13} />
              Pilih dari Katalog Card Multimedia
            </button>
          </div>
        )}

        {/* 2. Interactive Card Multimedia Picker Grid */}
        {isCatalogOpen && (
          <SoundscapeCatalogPicker
            catalogItems={catalogItems}
            catalogSearch={catalogSearch}
            setCatalogSearch={setCatalogSearch}
            filteredCatalog={filteredCatalog}
            selectedSoundScapeId={formData.sound_scape}
            onSelectSoundscape={onSelectSoundscape}
          />
        )}

        {/* 3. Core Inputs Row: Title & Duration */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-purple-500/20">
          <div>
            <label className="block text-[11px] font-semibold text-slate-300 mb-1">
              Judul Track (Title) *
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => handleChange('title', e.target.value)}
              placeholder="e.g. Full Recharge"
              className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-xs text-white focus:outline-none focus:border-cyan-400"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-300 mb-1">
              Durasi (Menit / Float) *
            </label>
            <input
              type="number"
              step="0.01"
              value={formData.duration}
              onChange={(e) => handleChange('duration', e.target.value)}
              placeholder="e.g. 21.13"
              className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-xs text-white focus:outline-none focus:border-cyan-400 font-mono"
            />
          </div>
        </div>
      </div>

      {/* Physical Media Files on Disk */}
      <div className="p-4 rounded-xl bg-slate-800/40 border border-slate-700/60 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
            <FileText size={14} className="text-indigo-400" />
            Nama Berkas Media Fisik di POD (FLAC / WAV / MP4)
          </h3>
          <span className="text-[10px] text-slate-400 bg-slate-900/90 px-2 py-0.5 rounded-full border border-slate-700/60 font-mono">
            Read-only (Otomatis dari SoundScape)
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="flex items-center justify-between text-[11px] font-medium text-slate-400 mb-1">
              <span>File Lagu Audio (song)</span>
              <span className="text-[9px] text-slate-500 uppercase tracking-wider">Read-only</span>
            </label>
            <input
              type="text"
              readOnly
              value={formData.song}
              placeholder="e.g. 00_RECHARGE_Im_free_LUFS14.flac"
              className="w-full px-3 py-2 rounded-lg bg-slate-950/70 border border-slate-800 text-xs text-slate-300 font-mono cursor-not-allowed select-all focus:outline-none"
            />
          </div>
          <div>
            <label className="flex items-center justify-between text-[11px] font-medium text-slate-400 mb-1">
              <span>File Kode Lampu / Strobe (lamp)</span>
              <span className="text-[9px] text-slate-500 uppercase tracking-wider">Read-only</span>
            </label>
            <input
              type="text"
              readOnly
              value={formData.lamp}
              placeholder="e.g. 00_Im_free_encoded.flac"
              className="w-full px-3 py-2 rounded-lg bg-slate-950/70 border border-slate-800 text-xs text-slate-300 font-mono cursor-not-allowed select-all focus:outline-none"
            />
          </div>
          <div>
            <label className="flex items-center justify-between text-[11px] font-medium text-slate-400 mb-1">
              <span>File Video Visual (video)</span>
              <span className="text-[9px] text-slate-500 uppercase tracking-wider">Read-only</span>
            </label>
            <input
              type="text"
              readOnly
              value={formData.video}
              placeholder="e.g. Full_Recharge_15_VIDEO.mp4"
              className="w-full px-3 py-2 rounded-lg bg-slate-950/70 border border-slate-800 text-xs text-slate-300 font-mono cursor-not-allowed select-all focus:outline-none"
            />
          </div>
          <div>
            <label className="flex items-center justify-between text-[11px] font-medium text-slate-400 mb-1">
              <span>Cover Album</span>
              <span className="text-[9px] text-slate-500 uppercase tracking-wider">Read-only</span>
            </label>
            <input
              type="text"
              readOnly
              value={formData.cover_album}
              placeholder="cover_album.png"
              className="w-full px-3 py-2 rounded-lg bg-slate-950/70 border border-slate-800 text-xs text-slate-300 cursor-not-allowed select-all focus:outline-none"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
          <div>
            <label className="block text-[11px] font-medium text-slate-400 mb-1">Artist</label>
            <input
              type="text"
              value={formData.artist}
              onChange={(e) => handleChange('artist', e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-xs text-white focus:outline-none focus:border-cyan-400"
            />
          </div>
          <div>
            <label className="block text-[11px] font-medium text-slate-400 mb-1">Album</label>
            <input
              type="text"
              value={formData.album}
              onChange={(e) => handleChange('album', e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-xs text-white focus:outline-none focus:border-cyan-400"
            />
          </div>
          <div>
            <label className="block text-[11px] font-medium text-slate-400 mb-1">Urutan Track (Order)</label>
            <input
              type="number"
              value={formData.order}
              onChange={(e) => handleChange('order', e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-xs text-white focus:outline-none focus:border-cyan-400 font-mono"
            />
          </div>
        </div>

        <div>
          <label className="block text-[11px] font-medium text-slate-400 mb-1">Deskripsi / Catatan Sesi</label>
          <textarea
            rows={2}
            value={formData.description}
            onChange={(e) => handleChange('description', e.target.value)}
            placeholder="Deskripsi terapi..."
            className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-xs text-white focus:outline-none focus:border-cyan-400"
          />
        </div>
      </div>
    </div>
  );
}
