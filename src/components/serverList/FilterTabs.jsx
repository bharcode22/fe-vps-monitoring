import React from 'react';
import { LayoutGrid, Search, X, Server, Box, Database, HardDrive } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';

export default function FilterTabs({
  filterType,
  setFilterType,
  searchQuery,
  setSearchQuery,
  totalCount,
  vpsCount,
  podV3Count,
  podV2Count,
  postgresCount,
  storageCount
}) {
  const { t } = useLanguage();

  return (
    <div className="flex items-center justify-between flex-wrap gap-4">

      {/* Title & Search Bar */}
      <div className="flex items-center gap-4 flex-wrap">
        <h2 className="text-xl font-bold text-white flex items-center gap-2.5">
          <LayoutGrid className="text-cyan-400 w-5 h-5" />
          <span>{t('connectedInfrastructure')}</span>
        </h2>

        {/* Real-time Search Input Bar */}
        <div className="relative flex items-center min-w-[240px]">
          <Search size={16} className="absolute left-3 text-slate-500 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t('searchPlaceholder')}
            className="w-full pl-9 pr-8 py-1.5 bg-black/40 border border-slate-800 focus:border-cyan-400 rounded-xl text-white text-xs outline-none transition-all duration-200"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 text-slate-400 hover:text-slate-200 p-0.5 cursor-pointer"
            >
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      {/* Category Filter Buttons */}
      <div className="flex gap-1.5 bg-black/40 p-1 rounded-xl border border-slate-800 flex-wrap">

        {/* Semua (All) */}
        <button
          onClick={() => setFilterType('all')}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all duration-200 cursor-pointer ${filterType === 'all'
              ? 'bg-gradient-to-r from-cyan-400 to-blue-500 text-slate-950 shadow-sm shadow-cyan-500/20'
              : 'text-slate-400 hover:text-slate-200'
            }`}
        >
          {t('all')} ({totalCount})
        </button>

        {/* VPS */}
        <button
          onClick={() => setFilterType('vps')}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all duration-200 flex items-center gap-1.5 cursor-pointer ${filterType === 'vps'
              ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/40'
              : 'text-slate-400 hover:text-slate-200 border border-transparent'
            }`}
        >
          <Server size={14} />
          <span>VPS ({vpsCount || 0})</span>
        </button>

        {/* POD V3 */}
        <button
          onClick={() => setFilterType('pod_v3')}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all duration-200 flex items-center gap-1.5 cursor-pointer ${filterType === 'pod_v3'
              ? 'bg-purple-500/25 text-purple-400 border border-purple-400'
              : 'text-slate-400 hover:text-slate-200 border border-transparent'
            }`}
        >
          <Box size={14} />
          <span>POD V3 ({podV3Count || 0})</span>
        </button>

        {/* POD V2 */}
        <button
          onClick={() => setFilterType('pod_v2')}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all duration-200 flex items-center gap-1.5 cursor-pointer ${filterType === 'pod_v2'
              ? 'bg-amber-500/25 text-amber-400 border border-amber-400'
              : 'text-slate-400 hover:text-slate-200 border border-transparent'
            }`}
        >
          <Box size={14} />
          <span>POD V2 ({podV2Count || 0})</span>
        </button>

        {/* Database (PostgreSQL) */}
        <button
          onClick={() => setFilterType('postgresql')}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all duration-200 flex items-center gap-1.5 cursor-pointer ${filterType === 'postgresql'
              ? 'bg-sky-500/25 text-sky-400 border border-sky-400'
              : 'text-slate-400 hover:text-slate-200 border border-transparent'
            }`}
        >
          <Database size={14} />
          <span>Database ({postgresCount || 0})</span>
        </button>

        {/* Storage (MinIO & S3) */}
        <button
          onClick={() => setFilterType('storage')}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all duration-200 flex items-center gap-1.5 cursor-pointer ${filterType === 'storage'
              ? 'bg-pink-500/25 text-pink-400 border border-pink-400'
              : 'text-slate-400 hover:text-slate-200 border border-transparent'
            }`}
        >
          <HardDrive size={14} />
          <span>Storage ({storageCount || 0})</span>
        </button>

      </div>
    </div>
  );
}
