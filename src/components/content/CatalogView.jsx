import React from 'react';
import {
  Cloud,
  Search,
  SlidersHorizontal,
  Volume2,
  Film,
  Image as ImageIcon,
  Zap,
  Folder,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  AlertTriangle,
  UploadCloud,
  Sparkles,
  Clock,
  Shuffle
} from 'lucide-react';

export default function CatalogView({
  folders,
  allFoldersCount,
  searchQuery,
  onSearchChange,
  categoryFilter,
  onCategoryFilterChange,
  currentPage,
  totalPages,
  onPageChange,
  onSelectFolder,
  isLoading,
  error,
  onOpenUploadModal,
  onNavigateToMultimediaSync
}) {
  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-200">
      {/* Search & Category Filter Toolbar */}
      <div className="glass-card p-5 sm:p-6 rounded-3xl border border-rose-500/30 bg-slate-900/60 shadow-xl">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          <div>
            <h3 className="text-base font-black text-white flex items-center gap-2">
              <Cloud size={18} className="text-rose-400" />
              <span>Katalog Master Konten di AWS S3 ({allFoldersCount} Kode Folder)</span>
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Pilih kode folder konten untuk membuka workspace pengelolaan detail, memeriksa ketersediaan di seluruh unit POD v3, atau melakukan Hard Delete.
            </p>
          </div>

          {/* Action Bar (Search + Upload Button + RabbitMQ Sync Button) */}
          <div className="flex items-center gap-2.5 w-full sm:w-auto flex-wrap sm:flex-nowrap">
            {/* Tombol ke Sinkronisasi Multimedia RabbitMQ */}
            {onNavigateToMultimediaSync && (
              <button
                type="button"
                onClick={onNavigateToMultimediaSync}
                className="px-3.5 py-2 rounded-xl bg-purple-500/15 hover:bg-purple-500/25 text-purple-300 border border-purple-500/40 hover:border-purple-400 text-xs font-bold transition-all cursor-pointer shadow-lg shadow-purple-500/10 flex items-center gap-2 shrink-0 active:scale-95"
                title="Buka Halaman Sinkronisasi Multimedia RabbitMQ & POD Matrix"
              >
                <Shuffle size={14} className="text-purple-400" />
                <span>Sinkronisasi RabbitMQ</span>
              </button>
            )}

            {/* Upload Multimedia Button */}
            {onOpenUploadModal && (
              <button
                onClick={onOpenUploadModal}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-rose-500 via-pink-500 to-purple-600 hover:from-rose-400 hover:to-purple-500 text-white text-xs font-bold transition-all cursor-pointer shadow-lg shadow-rose-500/20 flex items-center gap-2 shrink-0 active:scale-95"
              >
                <UploadCloud size={15} />
                <span>Upload Multimedia</span>
                <span className="px-1.5 py-0.5 rounded-md bg-white/20 text-[10px] font-mono">10GB</span>
              </button>
            )}

            {/* Search Bar */}
            <div className="relative w-full sm:w-64">
              <Search size={14} className="absolute left-3.5 top-3 text-slate-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder="Cari kode (misal: 154363)..."
                className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white focus:outline-none focus:border-rose-500 font-mono"
              />
            </div>
          </div>
        </div>

        {/* Category Filter Pills */}
        <div className="flex items-center gap-2 mt-4 pt-3 border-t border-slate-800/80 flex-wrap">
          <span className="text-[11px] text-slate-400 font-bold mr-1 flex items-center gap-1">
            <SlidersHorizontal size={12} /> Filter Tipe Aset:
          </span>
          {[
            { id: 'all', label: 'Semua Tipe' },
            { id: 'audio', label: 'Audio (Suara)', icon: Volume2 },
            { id: 'video', label: 'Video (MP4)', icon: Film },
            { id: 'image', label: 'Gambar (Cover)', icon: ImageIcon },
            { id: 'strobe', label: 'Strobe (Lighting)', icon: Zap },
            { id: 'orphan', label: 'Yatim Piatu (Orphan)', icon: AlertTriangle },
          ].map(cat => {
            const Icon = cat.icon;
            const isSelected = categoryFilter === cat.id;

            return (
              <button
                key={cat.id}
                onClick={() => onCategoryFilterChange(cat.id)}
                className={`px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 border ${isSelected
                  ? 'bg-rose-500/25 text-rose-300 border-rose-500/40 shadow-sm'
                  : 'bg-slate-950/80 text-slate-400 border-slate-800 hover:text-slate-200 hover:bg-slate-900'
                  }`}
              >
                {Icon && <Icon size={12} />}
                <span>{cat.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Catalog Cards Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(n => (
            <div key={n} className="p-5 rounded-3xl bg-slate-900/40 border border-slate-800 animate-pulse h-40"></div>
          ))}
        </div>
      ) : error ? (
        <div className="p-5 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-3">
          <AlertTriangle size={18} />
          <span>{error}</span>
        </div>
      ) : folders.length === 0 ? (
        <div className="p-12 rounded-3xl bg-slate-900/40 border border-slate-800 text-center text-slate-400 text-xs">
          Tidak ada folder kode yang cocok dengan kriteria pencarian "{searchQuery}".
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
          {folders.map(folder => {
            return (
              <div
                key={folder.code}
                onClick={() => onSelectFolder(folder)}
                className="glass-card p-4 rounded-3xl border border-slate-800/80 bg-slate-900/60 hover:bg-slate-900 hover:border-rose-500/40 hover:shadow-xl hover:shadow-rose-500/5 transition-all cursor-pointer flex flex-col justify-between group"
              >
                <div>
                  {/* Code Badge & Size */}
                  <div className="flex items-center justify-between gap-1 mb-2.5">
                    <div className="flex items-center gap-2">
                      <span className={`font-mono font-black text-base transition-colors ${folder.isOrphan ? 'text-rose-400 group-hover:text-rose-300' : 'text-white group-hover:text-rose-300'}`}>
                        #{folder.code}
                      </span>
                      {folder.isOrphan && (
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40">
                          ORPHAN
                        </span>
                      )}
                    </div>
                    {folder.isOrphan ? (
                      <AlertTriangle size={16} className="text-rose-500 animate-pulse" title="Yatim Piatu: Tidak ada di Master Database" />
                    ) : (
                      <Folder size={16} className="text-slate-500 group-hover:text-rose-400 transition-colors" />
                    )}
                  </div>

                  <div className="flex items-baseline justify-between gap-1 mb-2">
                    <div className="text-xs font-mono font-bold text-sky-300">
                      {folder.totalSizeFormatted}
                      <span className="text-[10px] text-slate-500 font-normal ml-1">({folder.totalFiles} file)</span>
                    </div>
                    {folder.lastModified && (
                      <div className="text-[9.5px] font-mono text-slate-500 flex items-center gap-1 shrink-0" title={`Terakhir diupdate: ${new Date(folder.lastModified).toLocaleString('id-ID')}`}>
                        <Clock size={10} className="text-slate-500" />
                        <span>{new Date(folder.lastModified).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}</span>
                      </div>
                    )}
                  </div>

                  {/* Asset Counts Breakdown */}
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {folder.audioCount > 0 && (
                      <span className="px-1.5 py-0.2 rounded bg-sky-500/15 text-sky-300 border border-sky-500/30 text-[9.5px] font-bold flex items-center gap-1">
                        <Volume2 size={10} /> {folder.audioCount}
                      </span>
                    )}
                    {folder.videoCount > 0 && (
                      <span className="px-1.5 py-0.2 rounded bg-purple-500/15 text-purple-300 border border-purple-500/30 text-[9.5px] font-bold flex items-center gap-1">
                        <Film size={10} /> {folder.videoCount}
                      </span>
                    )}
                    {folder.imageCount > 0 && (
                      <span className="px-1.5 py-0.2 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 text-[9.5px] font-bold flex items-center gap-1">
                        <ImageIcon size={10} /> {folder.imageCount}
                      </span>
                    )}
                    {folder.strobeCount > 0 && (
                      <span className="px-1.5 py-0.2 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30 text-[9.5px] font-bold flex items-center gap-1">
                        <Zap size={10} /> {folder.strobeCount}
                      </span>
                    )}
                  </div>
                </div>

                {/* Action Button */}
                <div className="mt-3.5 pt-2.5 border-t border-slate-800/60 flex items-center justify-between text-[11px] font-bold text-rose-400 group-hover:text-rose-300">
                  <span>Kelola Konten</span>
                  <ChevronRight size={13} className="group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination Controls */}
      {allFoldersCount > 0 && (
        <div className="p-4 bg-slate-950/80 rounded-2xl border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          <div className="text-slate-400">
            Menampilkan <strong className="text-white">{folders.length}</strong> kode folder (Halaman {currentPage} dari {totalPages})
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => onPageChange(1)}
              disabled={currentPage === 1}
              className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
              title="Halaman Pertama"
            >
              <ChevronsLeft size={15} />
            </button>
            <button
              onClick={() => onPageChange(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer font-bold"
            >
              Sebelumnya
            </button>

            <span className="px-3 py-1.5 rounded-xl bg-slate-800 font-mono font-bold text-rose-300">
              {currentPage} / {totalPages}
            </span>

            <button
              onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages}
              className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer font-bold"
            >
              Selanjutnya
            </button>
            <button
              onClick={() => onPageChange(totalPages)}
              disabled={currentPage === totalPages}
              className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
              title="Halaman Terakhir"
            >
              <ChevronsRight size={15} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
