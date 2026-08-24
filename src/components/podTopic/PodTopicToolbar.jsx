import React from 'react';
import { Search, Zap } from 'lucide-react';

export default function PodTopicToolbar({
  topicTypeFilter,
  setTopicTypeFilter,
  onlyMissingFilter,
  setOnlyMissingFilter,
  searchQuery,
  setSearchQuery,
  currentMissingCount,
  totalPodTopics,
  totalSocketTopics,
  onBulkSync
}) {
  return (
    <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-3.5 flex flex-wrap items-center justify-between gap-3 shadow-sm">
      {/* Table Type Selector */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => setTopicTypeFilter('pod_topic')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            topicTypeFilter === 'pod_topic'
              ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          pod_topics ({totalPodTopics || 0})
        </button>

        <button
          onClick={() => setTopicTypeFilter('socket_topic')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            topicTypeFilter === 'socket_topic'
              ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          socket_topics ({totalSocketTopics || 0})
        </button>
      </div>

      {/* Filter Missing Toggle, Search & Bulk Sync */}
      <div className="flex items-center gap-3 flex-wrap">
        <label className="flex items-center gap-2 text-xs font-semibold text-slate-300 cursor-pointer bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800">
          <input
            type="checkbox"
            checked={onlyMissingFilter}
            onChange={(e) => setOnlyMissingFilter(e.target.checked)}
            className="rounded border-slate-700 text-cyan-500 focus:ring-0"
          />
          <span>Hanya yang Kurang ({currentMissingCount})</span>
        </label>

        <div className="relative">
          <Search size={14} className="absolute left-2.5 top-2.5 text-slate-500" />
          <input
            type="text"
            placeholder="Cari topic, type, desc..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8 pr-3 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500/40 w-52"
          />
        </div>

        {/* 1-Click Sync Missing Button for Current View */}
        {currentMissingCount > 0 && (
          <button
            onClick={onBulkSync}
            className="px-3.5 py-1.5 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-slate-950 font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-md shadow-amber-500/20 transition-all cursor-pointer"
          >
            <Zap size={14} />
            <span>Sync Semua Topic Kurang ({currentMissingCount})</span>
          </button>
        )}
      </div>
    </div>
  );
}
