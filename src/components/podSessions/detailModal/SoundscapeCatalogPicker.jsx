import React from 'react';
import { Search, Music, Zap, Check } from 'lucide-react';
import { getMediaCoverUrl } from './constants';

export default function SoundscapeCatalogPicker({
  catalogItems = [],
  catalogSearch = '',
  setCatalogSearch,
  filteredCatalog = [],
  selectedSoundScapeId,
  onSelectSoundscape
}) {
  return (
    <div className="p-3.5 rounded-xl bg-slate-950 border border-purple-500/30 space-y-3">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            placeholder="Cari berdasarkan ID (#145656), judul lagu, file audio, atau strobe..."
            value={catalogSearch}
            onChange={(e) => setCatalogSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-400"
          />
        </div>
        <span className="text-[11px] text-purple-300 font-mono font-medium shrink-0">
          {filteredCatalog.length} dari {catalogItems.length} Track
        </span>
      </div>

      {/* Cards Grid */}
      <div className="max-h-72 overflow-y-auto pr-1 grid grid-cols-1 sm:grid-cols-2 gap-2.5 scrollbar-thin">
        {filteredCatalog.map((catItem) => {
          const isCardSelected = String(selectedSoundScapeId) === String(catItem.sound_scape);
          const coverUrl = getMediaCoverUrl(catItem);
          const songName = catItem.music || catItem.song || (catItem.musicUrl ? catItem.musicUrl.split('/').pop().split('?')[0] : '-');
          const lampName = catItem.lamp ? catItem.lamp.split('/').pop().split('?')[0] : '-';

          return (
            <div
              key={catItem.sound_scape || catItem.id}
              onClick={() => onSelectSoundscape(catItem)}
              className={`p-3 rounded-xl border transition-all cursor-pointer flex flex-col gap-2 group ${isCardSelected
                ? 'bg-gradient-to-r from-purple-500/25 via-indigo-500/20 to-purple-500/10 border-purple-500/80 shadow-md ring-1 ring-purple-500/40'
                : 'bg-slate-900/80 border-slate-800 hover:border-purple-500/40 hover:bg-slate-850'
                }`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                {coverUrl ? (
                  <img
                    src={coverUrl}
                    alt="Cover"
                    className="w-10 h-10 rounded-lg object-cover border border-slate-700 shrink-0 bg-slate-950"
                    onError={(e) => { e.target.style.display = 'none'; }}
                  />
                ) : (
                  <div className="w-10 h-10 rounded-lg bg-purple-500/15 border border-purple-500/30 text-purple-300 flex items-center justify-center shrink-0">
                    <Music size={16} />
                  </div>
                )}

                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-1">
                    <span className="font-mono text-[11px] font-black text-purple-300">
                      #{catItem.sound_scape}
                    </span>
                    {isCardSelected ? (
                      <span className="px-1.5 py-0.5 rounded text-[8.5px] font-bold bg-purple-500 text-slate-950 flex items-center gap-0.5">
                        <Check size={9} />
                        TERPILIH
                      </span>
                    ) : (
                      <span className="text-[10px] text-cyan-400 group-hover:text-cyan-300 font-semibold opacity-80 group-hover:opacity-100">
                        Pilih ➔
                      </span>
                    )}
                  </div>
                  <h5 className="text-xs font-bold text-white truncate group-hover:text-purple-200">
                    {catItem.title || catItem.tittle || catItem.song || 'Untitled'}
                  </h5>
                  <div className="text-[10px] text-slate-400 truncate flex items-center justify-between gap-1">
                    <span className="truncate">{catItem.artist || 'Regenesis'} • {catItem.album || 'Regenesis'}</span>
                    {(catItem.created_date || catItem.created_at) && (
                      <span className="text-[9px] text-slate-500 font-mono shrink-0">
                        {new Date(catItem.created_date || catItem.created_at).toLocaleDateString('id-ID', { day: '2-digit', month: 'short' })}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Tags in Card */}
              <div className="grid grid-cols-2 gap-1 text-[10px] font-mono bg-slate-950/70 p-1.5 rounded-lg border border-slate-800/80">
                <div className="flex items-center gap-1 text-slate-300 truncate" title={`Audio: ${songName}`}>
                  <Music size={10} className="text-cyan-400 shrink-0" />
                  <span className="truncate">{songName}</span>
                </div>
                <div className="flex items-center gap-1 text-slate-300 truncate" title={`Strobe: ${lampName}`}>
                  <Zap size={10} className="text-amber-400 shrink-0" />
                  <span className="truncate">{lampName}</span>
                </div>
              </div>
            </div>
          );
        })}

        {filteredCatalog.length === 0 && (
          <div className="col-span-2 p-6 text-center text-xs text-slate-500">
            Tidak ada track SoundScape yang cocok dengan pencarian "{catalogSearch}"
          </div>
        )}
      </div>
    </div>
  );
}
