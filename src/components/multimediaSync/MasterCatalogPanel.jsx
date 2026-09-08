import React from 'react';
import { Layers, Search, ChevronLeft, ChevronRight, RefreshCw } from 'lucide-react';
import TrackCatalogCard from './TrackCatalogCard';

export default function MasterCatalogPanel({
  items = [],
  selectedItem,
  pagination = { total: 0, page: 1, limit: 10, totalPages: 1 },
  searchQuery,
  onSearchChange,
  onSearchSubmit,
  onRefresh,
  isLoading,
  error,
  onSelectTrack,
  onPageChange,
  onOpenTrackInfo,
  onDeleteTrack,
  onToast
}) {
  return (
    <div className="lg:col-span-5 flex flex-col glass-card rounded-3xl border border-purple-500/30 bg-slate-900/70 shadow-xl overflow-hidden h-full min-h-0">
      {/* Catalog Panel Header */}
      <div className="shrink-0 p-3.5 sm:p-4 border-b border-purple-500/20 bg-gradient-to-r from-purple-950/30 to-slate-900/60 space-y-2.5">
        <div className="flex items-center justify-between gap-2 flex-wrap sm:flex-nowrap">
          <div className="flex items-center gap-2 min-w-0">
            <div className="p-1.5 rounded-lg bg-purple-500/20 text-purple-300 shrink-0">
              <Layers size={15} />
            </div>
            <h2 className="text-xs sm:text-sm font-black text-white truncate">
              File at Cloud
            </h2>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30 shrink-0">
              {pagination.total} Track
            </span>
          </div>

          {/* Tombol Reload / Refresh Catalog */}
          <button
            type="button"
            onClick={onRefresh}
            disabled={isLoading}
            className="px-2.5 py-1 rounded-xl bg-purple-500/15 hover:bg-purple-500/30 text-purple-300 hover:text-white border border-purple-500/30 text-[11px] font-bold flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50 active:scale-95 shadow-sm shrink-0"
            title="Muat ulang katalog multimedia dari Master API"
          >
            <RefreshCw size={12} className={isLoading ? 'animate-spin text-purple-400' : 'text-purple-400'} />
            <span>Reload</span>
          </button>
        </div>

        {/* Search Bar */}
        <form onSubmit={onSearchSubmit} className="relative">
          <Search size={13} className="absolute left-3 top-2.5 text-slate-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => onSearchChange(e.target.value)}
            placeholder="Cari judul, artis, folder #sound_scape..."
            className="w-full pl-8 pr-16 py-1.5 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 font-medium"
          />
          <button
            type="submit"
            className="absolute right-1 top-1 px-2.5 py-1 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-[10px] font-bold cursor-pointer transition-all"
          >
            Cari
          </button>
        </form>
      </div>

      {/* Catalog Items List */}
      <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar p-3 space-y-2">
        {isLoading ? (
          <div className="space-y-2 py-3">
            {[1, 2, 3, 4, 5, 6].map(n => (
              <div key={n} className="h-14 rounded-2xl bg-slate-950/40 border border-slate-800 animate-pulse" />
            ))}
          </div>
        ) : error ? (
          <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
            {error}
          </div>
        ) : items.length === 0 ? (
          <div className="p-10 rounded-2xl bg-slate-950/60 border border-slate-800 text-center text-slate-500 text-xs">
            Tidak ada data multimedia yang ditemukan.
          </div>
        ) : (
          items.map(item => (
            <TrackCatalogCard
              key={item.id || item.sound_scape}
              item={item}
              isSelected={String(selectedItem?.sound_scape) === String(item.sound_scape)}
              onSelectTrack={onSelectTrack}
              onOpenTrackInfo={onOpenTrackInfo}
              onDeleteTrack={onDeleteTrack}
              onToast={onToast}
            />
          ))
        )}
      </div>

      {/* Catalog Pagination Footer */}
      {pagination.totalPages > 1 && (
        <div className="shrink-0 p-2.5 border-t border-purple-500/20 bg-slate-950/40 flex items-center justify-between text-xs text-slate-400 mt-auto">
          <span className="text-[10.5px]">Halaman {pagination.page} / {pagination.totalPages}</span>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => onPageChange(pagination.page - 1)}
              disabled={pagination.page <= 1 || isLoading}
              className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 hover:bg-slate-800 text-white disabled:opacity-30 cursor-pointer"
              title="Halaman Sebelumnya"
            >
              <ChevronLeft size={13} />
            </button>
            <button
              onClick={() => onPageChange(pagination.page + 1)}
              disabled={pagination.page >= pagination.totalPages || isLoading}
              className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 hover:bg-slate-800 text-white disabled:opacity-30 cursor-pointer"
              title="Halaman Selanjutnya"
            >
              <ChevronRight size={13} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
