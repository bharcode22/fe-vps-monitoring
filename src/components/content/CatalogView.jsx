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
import { useLanguage } from '../../context/LanguageContext';

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
  const { t } = useLanguage();

  const assetCategories = [
    { id: 'all', label: t('storage.catalog.types.all', null, 'Semua Tipe') },
    { id: 'audio', label: t('storage.catalog.types.audio', null, 'Audio (Suara)'), icon: Volume2 },
    { id: 'video', label: t('storage.catalog.types.video', null, 'Video (MP4)'), icon: Film },
    { id: 'image', label: t('storage.catalog.types.image', null, 'Gambar (Cover)'), icon: ImageIcon },
    { id: 'strobe', label: t('storage.catalog.types.strobe', null, 'Strobe (Lighting)'), icon: Zap },
    { id: 'orphan', label: t('storage.catalog.types.orphan', null, 'Yatim Piatu (Orphan)'), icon: AlertTriangle },
  ];

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-200">
      {/* Search & Category Filter Toolbar */}
      <div className="glass-card p-5 sm:p-6 rounded-3xl border border-rose-500/30 bg-slate-900/60 shadow-xl">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          <div>
            <h3 className="text-base font-black text-white flex items-center gap-2">
              <Cloud size={18} className="text-rose-400" />
              <span>{t('storage.catalog.title', { count: allFoldersCount }, `Katalog Master Konten di AWS S3 (${allFoldersCount} Kode Folder)`)}</span>
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              {t('storage.catalog.subtitle', null, 'Pilih kode folder konten untuk membuka workspace pengelolaan detail, memeriksa ketersediaan di seluruh unit POD v3, atau melakukan Hard Delete.')}
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
                <span>{t('storage.catalog.syncRabbitMq', null, 'Sinkronisasi RabbitMQ')}</span>
              </button>
            )}

            {/* Upload Multimedia Button */}
            {onOpenUploadModal && (
              <button
                onClick={onOpenUploadModal}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-rose-500 via-pink-500 to-purple-600 hover:from-rose-400 hover:to-purple-500 text-white text-xs font-bold transition-all cursor-pointer shadow-lg shadow-rose-500/20 flex items-center gap-2 shrink-0 active:scale-95"
              >
                <UploadCloud size={15} />
                <span>{t('storage.catalog.uploadMedia', null, 'Upload Multimedia')}</span>
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
                placeholder={t('storage.catalog.searchPlaceholder', null, 'Cari kode (misal: 154363)...')}
                className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white focus:outline-none focus:border-rose-500 font-mono"
              />
            </div>
          </div>
        </div>

        {/* Category Filter Pills */}
        <div className="flex items-center gap-2 mt-4 pt-3 border-t border-slate-800/80 flex-wrap">
          <span className="text-[11px] text-slate-400 font-bold mr-1 flex items-center gap-1">
            <SlidersHorizontal size={12} /> {t('storage.catalog.filterAssetType', null, 'Filter Tipe Aset:')}
          </span>
          {assetCategories.map(cat => {
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
        <div className="p-8 rounded-3xl bg-rose-500/10 border border-rose-500/30 text-rose-400 flex items-center gap-3">
          <AlertTriangle size={24} />
          <div>
            <div className="font-bold text-sm">Gagal memuat katalog media AWS S3</div>
            <div className="text-xs text-rose-300/80">{error}</div>
          </div>
        </div>
      ) : folders.length === 0 ? (
        <div className="p-12 rounded-3xl bg-slate-900/40 border border-slate-800 text-center flex flex-col items-center justify-center">
          <Folder size={48} className="text-slate-700 mb-3" />
          <div className="text-slate-300 font-bold text-sm">Tidak ada folder konten yang ditemukan</div>
          <div className="text-slate-500 text-xs mt-1">Coba gunakan kata kunci pencarian atau ubah filter tipe aset.</div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
          {folders.map(folder => {
            const fileCount = folder.files?.length || folder.fileCount || 0;
            const sizeFormatted = folder.sizeFormatted || folder.totalSizeFormatted || '0 B';

            return (
              <div
                key={folder.code}
                onClick={() => onSelectFolder(folder)}
                className="group p-4.5 rounded-3xl bg-slate-900/80 hover:bg-slate-800/90 border border-slate-800 hover:border-rose-500/50 transition-all duration-200 cursor-pointer shadow-lg hover:shadow-rose-500/10 flex flex-col justify-between relative overflow-hidden"
              >
                <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-rose-500/10 to-transparent rounded-bl-full pointer-events-none group-hover:from-rose-500/20 transition-all duration-300"></div>

                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="p-2.5 rounded-2xl bg-rose-500/15 text-rose-400 border border-rose-500/30 group-hover:scale-110 group-hover:bg-rose-500/25 transition-all duration-300">
                      <Folder size={18} />
                    </div>
                    <span className="text-[10px] font-mono text-slate-400 bg-slate-950/80 px-2 py-0.5 rounded-lg border border-slate-800">
                      {sizeFormatted}
                    </span>
                  </div>

                  <div className="font-mono font-black text-white text-base tracking-wide group-hover:text-rose-300 transition-colors">
                    #{folder.code}
                  </div>

                  <div className="text-[11px] text-slate-400 font-medium line-clamp-1 mt-0.5" title={folder.title || folder.name}>
                    {folder.title || folder.name || 'Soundscape Audio Asset'}
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-[10px] text-slate-500 font-mono">
                  <span>{fileCount} File Asset</span>
                  <div className="flex items-center gap-1 text-rose-400 opacity-0 group-hover:opacity-100 transition-opacity font-bold">
                    <span>Buka</span>
                    <ChevronRight size={12} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination Footer */}
      {!isLoading && totalPages > 1 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-2xl bg-slate-950/60 border border-slate-800 text-xs">
          <span className="text-slate-400">
            {t('storage.catalog.pagination.showing', { from: ((currentPage - 1) * 24) + 1, to: Math.min(currentPage * 24, allFoldersCount), total: allFoldersCount }, `Menampilkan ${((currentPage - 1) * 24) + 1} - ${Math.min(currentPage * 24, allFoldersCount)} dari ${allFoldersCount} folder`)}
          </span>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => onPageChange(1)}
              disabled={currentPage === 1}
              className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
              title={t('storage.catalog.pagination.first', null, 'Halaman Pertama')}
            >
              <ChevronsLeft size={15} />
            </button>
            <button
              onClick={() => onPageChange(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer font-bold"
            >
              {t('storage.catalog.pagination.prev', null, 'Sebelumnya')}
            </button>

            <span className="px-3 py-1.5 rounded-xl bg-slate-800 font-mono font-bold text-rose-300">
              {currentPage} / {totalPages}
            </span>

            <button
              onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages}
              className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer font-bold"
            >
              {t('storage.catalog.pagination.next', null, 'Selanjutnya')}
            </button>
            <button
              onClick={() => onPageChange(totalPages)}
              disabled={currentPage === totalPages}
              className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
              title={t('storage.catalog.pagination.last', null, 'Halaman Terakhir')}
            >
              <ChevronsRight size={15} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
