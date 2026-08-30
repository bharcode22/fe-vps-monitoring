import React from 'react';
import { Search, RefreshCw, AlertCircle, Eye, Server, ChevronLeft, ChevronRight } from 'lucide-react';

function formatActivityBadge(type) {
  const lower = (type || '').toLowerCase();
  if (lower.includes('play') || lower.includes('session')) {
    return 'bg-purple-500/15 border-purple-500/30 text-purple-300';
  }
  if (lower.includes('login') || lower.includes('auth')) {
    return 'bg-cyan-500/15 border-cyan-500/30 text-cyan-300';
  }
  if (lower.includes('http') || lower.includes('api')) {
    return 'bg-blue-500/15 border-blue-500/30 text-blue-300';
  }
  if (lower.includes('error') || lower.includes('fail')) {
    return 'bg-rose-500/15 border-rose-500/30 text-rose-300';
  }
  return 'bg-slate-700/30 border-slate-600 text-slate-300';
}

export default function PodLogsExplorerTab({
  filterSearch,
  onFilterSearchChange,
  filterPodId,
  onFilterPodIdChange,
  filterActivityType,
  onFilterActivityTypeChange,
  v3Pods = [],
  activityTypes = [],
  podUuidMap = {},
  onApplySearch,
  onRefreshExplorer,
  isLoadingExplorer,
  explorerError,
  explorerRows = [],
  explorerTotalRows = 0,
  explorerLimit = 25,
  onExplorerLimitChange,
  explorerPage = 1,
  explorerTotalPages = 1,
  onExplorerPageChange,
  onSelectJsonRow
}) {
  return (
    <div className="flex flex-col gap-4">
      {/* Explorer Filter Bar */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 shadow-xl flex items-center justify-between gap-3 flex-wrap">
        <form onSubmit={onApplySearch} className="flex items-center gap-3 flex-wrap flex-1">
          {/* Search Bar */}
          <div className="relative min-w-[240px] flex-1">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={filterSearch}
              onChange={(e) => onFilterSearchChange(e.target.value)}
              placeholder="Cari kata kunci di code, value, payload data..."
              className="w-full pl-8 pr-3 py-1.5 bg-slate-950 border border-slate-700 text-xs text-slate-200 rounded-xl focus:outline-none focus:border-indigo-500"
            />
          </div>

          {/* POD V3 Unit Dropdown Selector */}
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-slate-400">Unit POD:</span>
            <select
              value={filterPodId}
              onChange={(e) => onFilterPodIdChange(e.target.value)}
              className="bg-slate-950 border border-slate-700 text-slate-200 text-xs rounded-xl px-3 py-1.5 focus:outline-none focus:border-indigo-500 cursor-pointer"
            >
              <option value="">Semua Unit POD V3</option>
              {v3Pods.map((p) => (
                <option key={p.id} value={p.pod_uuid || ''}>
                  {p.name} (#{p.code})
                </option>
              ))}
            </select>
          </div>

          {/* Activity Type Dropdown */}
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-slate-400">Aktivitas:</span>
            <select
              value={filterActivityType}
              onChange={(e) => onFilterActivityTypeChange(e.target.value)}
              className="bg-slate-950 border border-slate-700 text-slate-200 text-xs rounded-xl px-3 py-1.5 focus:outline-none focus:border-indigo-500 cursor-pointer"
            >
              <option value="ALL">Semua Aktivitas</option>
              {activityTypes.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </div>

          <button
            type="submit"
            className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold cursor-pointer transition-colors"
          >
            Terapkan
          </button>
        </form>

        <button
          onClick={onRefreshExplorer}
          disabled={isLoadingExplorer}
          className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs border border-slate-700 cursor-pointer disabled:opacity-40"
          title="Refresh Data"
        >
          <RefreshCw size={14} className={isLoadingExplorer ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* Master Explorer Data Table */}
      <div className="bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl flex flex-col">
        <div className="bg-slate-900/90 border-b border-slate-800 px-4 py-3 flex items-center justify-between gap-3 flex-wrap">
          <span className="text-xs font-semibold text-slate-300">
            Menampilkan <b className="text-white">{explorerRows.length}</b> dari{' '}
            <b className="text-indigo-400">{explorerTotalRows.toLocaleString()}</b> total baris di Master DB
          </span>

          {/* Rows Per Page */}
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <span>Per Halaman:</span>
            <select
              value={explorerLimit}
              onChange={(e) => onExplorerLimitChange(parseInt(e.target.value, 10))}
              className="bg-slate-900 border border-slate-700 text-slate-200 rounded-lg px-2 py-1 text-xs cursor-pointer"
            >
              <option value="10">10</option>
              <option value="25">25</option>
              <option value="50">50</option>
              <option value="100">100</option>
            </select>
          </div>
        </div>

        {isLoadingExplorer ? (
          <div className="p-16 flex flex-col items-center justify-center text-slate-400">
            <RefreshCw size={24} className="animate-spin text-indigo-400 mb-2" />
            <span className="text-xs">Mengambil baris data dari Master Database...</span>
          </div>
        ) : explorerError ? (
          <div className="p-8 text-center text-rose-400 text-xs">
            <AlertCircle size={24} className="mx-auto mb-2 text-rose-400" />
            <span>{explorerError}</span>
          </div>
        ) : explorerRows.length === 0 ? (
          <div className="p-16 text-center text-slate-500 text-xs">
            Tidak ada baris data yang cocok dengan kriteria pencarian.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-900/50 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
                <tr>
                  <th className="px-4 py-3">Waktu (Created At)</th>
                  <th className="px-4 py-3">Tipe Aktivitas</th>
                  <th className="px-4 py-3">Value</th>
                  <th className="px-4 py-3">Code</th>
                  <th className="px-4 py-3">POD ID</th>
                  <th className="px-4 py-3">User ID</th>
                  <th className="px-4 py-3 text-center">Payload Data</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono">
                {explorerRows.map((row) => (
                  <tr key={row.id} className="hover:bg-slate-900/40 transition-colors">
                    <td className="px-4 py-3 text-slate-300 whitespace-nowrap">
                      {row.created_at ? new Date(row.created_at).toLocaleString('id-ID') : '-'}
                    </td>
                    <td className="px-4 py-3 font-sans">
                      <span className={`px-2 py-0.5 rounded border text-[11px] font-semibold ${formatActivityBadge(row.activity_type)}`}>
                        {row.activity_type || '-'}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-bold text-white">
                      {row.value || '-'}
                    </td>
                    <td className="px-4 py-3 text-cyan-300">
                      {row.code || '-'}
                    </td>
                    <td className="px-4 py-3 font-sans">
                      {(() => {
                        const podInfo = podUuidMap[row.pod_id];
                        if (podInfo) {
                          return (
                            <span
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 whitespace-nowrap shadow-sm"
                              title={`IP: ${podInfo.host} • Code: #${podInfo.code} • UUID: ${row.pod_id}`}
                            >
                              <Server size={11} className="text-cyan-400 shrink-0" />
                              <span>{podInfo.name}</span>
                              <span className="text-[10px] text-cyan-400 font-mono font-normal">#{podInfo.code}</span>
                            </span>
                          );
                        }
                        return (
                          <span className="text-slate-400 font-mono text-[11px] truncate max-w-[120px] block" title={row.pod_id}>
                            {row.pod_id || '-'}
                          </span>
                        );
                      })()}
                    </td>
                    <td className="px-4 py-3 text-slate-400 truncate max-w-[120px]" title={row.user_id}>
                      {row.user_id || '-'}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => onSelectJsonRow(row)}
                        className="px-2 py-1 bg-slate-800 hover:bg-indigo-500/20 text-indigo-300 border border-slate-700 hover:border-indigo-500/40 rounded-lg text-xs font-sans font-semibold transition-colors cursor-pointer inline-flex items-center gap-1"
                      >
                        <Eye size={12} />
                        <span>Lihat JSON</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Controls */}
        {explorerTotalPages > 1 && (
          <div className="bg-slate-900/80 border-t border-slate-800 px-4 py-3 flex items-center justify-between text-xs">
            <span className="text-slate-400">
              Halaman <b className="text-white">{explorerPage}</b> dari <b className="text-white">{explorerTotalPages}</b>
            </span>

            <div className="flex items-center gap-2">
              <button
                onClick={() => onExplorerPageChange(Math.max(explorerPage - 1, 1))}
                disabled={explorerPage <= 1}
                className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg border border-slate-700 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
              >
                <ChevronLeft size={15} />
              </button>
              <button
                onClick={() => onExplorerPageChange(Math.min(explorerPage + 1, explorerTotalPages))}
                disabled={explorerPage >= explorerTotalPages}
                className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg border border-slate-700 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
              >
                <ChevronRight size={15} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
