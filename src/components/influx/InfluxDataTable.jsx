import React from 'react';
import { Search, ChevronLeft, ChevronRight } from 'lucide-react';
import { formatDateTimeWita } from './influxConstants';

/**
 * InfluxDataTable Component
 * Renders interactive paginated data rows with real-time text searching,
 * dynamic tag column detection, and page size selection.
 */
export default function InfluxDataTable({
  queryResult,
  tableSearch,
  setTableSearch,
  filteredRows = [],
  paginatedRows = [],
  currentPage = 1,
  setCurrentPage,
  pageSize = 25,
  setPageSize,
  totalPages = 1
}) {
  if (!queryResult) return null;

  return (
    <div className="rounded-2xl bg-slate-900/90 border border-slate-800 shadow-xl overflow-hidden">
      {/* Table Search & Header Bar */}
      <div className="p-4 border-b border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="relative w-full sm:w-72">
            <Search size={14} className="absolute left-3 top-2.5 text-slate-500" />
            <input
              type="text"
              value={tableSearch}
              onChange={(e) => {
                setTableSearch(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Cari dalam hasil tabel..."
              className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-slate-950 border border-slate-700/80 text-white text-xs focus:border-cyan-500 focus:outline-none placeholder:text-slate-600"
            />
          </div>
          <span className="text-xs text-slate-400 whitespace-nowrap">
            Menampilkan {filteredRows.length.toLocaleString()} baris
          </span>
        </div>

        {/* Page Size Selector */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400">Baris/hal:</span>
          <select
            value={pageSize}
            onChange={(e) => {
              setPageSize(Number(e.target.value));
              setCurrentPage(1);
            }}
            className="px-2 py-1 rounded-lg bg-slate-950 border border-slate-700 text-xs text-white cursor-pointer"
          >
            <option value={10}>10</option>
            <option value={25}>25</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
          </select>
        </div>
      </div>

      {/* Table Content */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-slate-950/80 text-slate-400 border-b border-slate-800">
              <th className="py-3 px-4 font-semibold uppercase text-[10px]">Waktu (WITA)</th>
              <th className="py-3 px-4 font-semibold uppercase text-[10px]">Measurement</th>
              <th className="py-3 px-4 font-semibold uppercase text-[10px]">Field</th>
              <th className="py-3 px-4 font-semibold uppercase text-[10px]">Value</th>
              {queryResult.tagKeys?.map((tag) => (
                <th key={tag} className="py-3 px-4 font-semibold uppercase text-[10px]">
                  Tag: {tag}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 font-mono">
            {paginatedRows.length === 0 ? (
              <tr>
                <td
                  colSpan={4 + (queryResult.tagKeys?.length || 0)}
                  className="py-8 text-center text-slate-500 text-xs font-sans"
                >
                  Tidak ada baris data yang cocok dengan kriteria filter.
                </td>
              </tr>
            ) : (
              paginatedRows.map((row, idx) => (
                <tr key={idx} className="hover:bg-slate-800/40 transition-colors">
                  <td className="py-2.5 px-4 text-cyan-300 whitespace-nowrap">
                    {formatDateTimeWita(row._time)}
                  </td>
                  <td className="py-2.5 px-4 font-sans font-medium text-slate-200">
                    <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 text-[11px]">
                      {row._measurement || '—'}
                    </span>
                  </td>
                  <td className="py-2.5 px-4 text-purple-300 font-semibold">
                    {row._field || '—'}
                  </td>
                  <td className="py-2.5 px-4 font-bold text-emerald-400">
                    {row._value !== null && row._value !== undefined ? String(row._value) : '—'}
                  </td>
                  {queryResult.tagKeys?.map((tag) => (
                    <td key={tag} className="py-2.5 px-4 text-slate-400 font-sans text-[11px]">
                      {row[tag] !== undefined && row[tag] !== null ? (
                        <span className="text-amber-300">{String(row[tag])}</span>
                      ) : (
                        '—'
                      )}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Controls */}
      <div className="p-4 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
        <span>
          Halaman {currentPage} dari {totalPages}
        </span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
            disabled={currentPage === 1}
            className="px-3 py-1.5 rounded-lg bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-300 disabled:opacity-40 cursor-pointer flex items-center gap-1"
          >
            <ChevronLeft size={14} /> Sebelumnya
          </button>
          <button
            type="button"
            onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
            disabled={currentPage >= totalPages}
            className="px-3 py-1.5 rounded-lg bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-300 disabled:opacity-40 cursor-pointer flex items-center gap-1"
          >
            Berikutnya <ChevronRight size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}
