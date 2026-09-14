import React from 'react';
import { Database, Search, RefreshCw, ChevronLeft, ChevronRight } from 'lucide-react';

export default function PodInfluxDataTablePanel({
  filteredRows = [],
  tableSearch = '',
  setTableSearch,
  setCurrentPage,
  hasChairSectionInRows = false,
  pagedRows = [],
  queryLoading = false,
  totalPages = 1,
  currentPage = 1,
}) {
  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 shadow-xl space-y-3">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <Database className="w-4 h-4 text-emerald-400" />
          <span className="text-xs font-bold uppercase tracking-wider text-slate-200">
            Tabel Data Influx ({filteredRows.length} Baris)
          </span>
        </div>

        {/* Search in Table */}
        <div className="relative w-full sm:w-64">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-500" />
          <input
            type="text"
            placeholder="Cari baris data..."
            value={tableSearch}
            onChange={(e) => {
              setTableSearch(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full bg-slate-950 text-slate-200 pl-8 pr-3 py-1.5 rounded-lg border border-slate-800 text-xs focus:outline-none focus:border-emerald-500 font-medium"
          />
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-slate-950/80 text-slate-400 border-b border-slate-800">
              <th className="py-2.5 px-3 font-semibold">Waktu (_time)</th>
              <th className="py-2.5 px-3 font-semibold">Measurement</th>
              <th className="py-2.5 px-3 font-semibold">Field</th>
              <th className="py-2.5 px-3 font-semibold">Nilai (_value)</th>
              <th className="py-2.5 px-3 font-semibold">Unit Tag</th>
              {hasChairSectionInRows && (
                <th className="py-2.5 px-3 font-semibold text-amber-300">Chair Section</th>
              )}
              <th className="py-2.5 px-3 font-semibold">Tag Lainnya</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 font-mono text-[11px]">
            {pagedRows.length === 0 ? (
              <tr>
                <td
                  colSpan={hasChairSectionInRows ? 7 : 6}
                  className="py-8 text-center text-slate-500 font-sans"
                >
                  {queryLoading ? (
                    <div className="flex items-center justify-center gap-2">
                      <RefreshCw className="w-4 h-4 animate-spin text-emerald-400" />
                      <span>Mengekstrak data dari Influx POD...</span>
                    </div>
                  ) : (
                    'Tidak ada data ditemukan. Tentukan filter lalu klik "Jalankan Query".'
                  )}
                </td>
              </tr>
            ) : (
              pagedRows.map((row, idx) => {
                // Extract extra tags
                const extraTags = Object.entries(row)
                  .filter(
                    ([k]) =>
                      !['_time', '_measurement', '_field', '_value', 'table', 'unit', 'chair_section'].includes(k)
                  )
                  .map(([k, v]) => `${k}=${v}`)
                  .join(', ');

                return (
                  <tr key={idx} className="hover:bg-slate-800/40 transition">
                    <td className="py-2 px-3 font-mono text-[11px] text-slate-300 whitespace-nowrap">
                      {row._time || '-'}
                    </td>
                    <td className="py-2 px-3 text-emerald-300 font-medium">
                      {row._measurement}
                    </td>
                    <td className="py-2 px-3 text-teal-300">
                      {row._field}
                    </td>
                    <td className="py-2 px-3 text-white font-bold">
                      <span className="px-1.5 py-0.5 bg-emerald-500/10 text-emerald-300 rounded border border-emerald-500/20">
                        {row._value !== null && row._value !== undefined ? String(row._value) : 'null'}
                      </span>
                    </td>
                    <td className="py-2 px-3 text-slate-400">
                      {row.unit || '-'}
                    </td>
                    {hasChairSectionInRows && (
                      <td className="py-2 px-3 text-amber-300 font-semibold whitespace-nowrap">
                        {row.chair_section ? (
                          <span className="px-1.5 py-0.5 bg-amber-500/15 text-amber-300 rounded border border-amber-500/30">
                            {row.chair_section}
                          </span>
                        ) : (
                          '-'
                        )}
                      </td>
                    )}
                    <td
                      className="py-2 px-3 text-slate-500 truncate max-w-[180px]"
                      title={extraTags}
                    >
                      {extraTags || '-'}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-3 border-t border-slate-800 text-xs text-slate-400">
          <span>
            Halaman {currentPage} dari {totalPages} ({filteredRows.length} total baris)
          </span>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
              disabled={currentPage === 1}
              className="p-1.5 rounded bg-slate-950 border border-slate-800 hover:bg-slate-800 disabled:opacity-40"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <span className="px-2 font-mono text-emerald-400">{currentPage}</span>
            <button
              onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
              disabled={currentPage === totalPages}
              className="p-1.5 rounded bg-slate-950 border border-slate-800 hover:bg-slate-800 disabled:opacity-40"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
