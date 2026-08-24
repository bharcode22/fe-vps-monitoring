import React from 'react';
import { Play } from 'lucide-react';

export default function DbSyncExecuteTab({
  dryRun,
  setDryRun,
  batchSize,
  setBatchSize,
  selectedTables,
  onToggleTableSelection,
  totalSourceTables,
  identicalTables = [],
  differentSchemaTables = [],
  syncing,
  onPerformSync,
  syncResult
}) {
  return (
    <div className="bg-slate-900/90 border border-cyan-500/30 rounded-2xl p-6 shadow-xl space-y-6">
      {/* Sync Options Panel */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 bg-slate-950 p-4 rounded-xl border border-slate-800">
        {/* Dry Run Switch */}
        <div className="flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-white block">Dry-Run Mode (Simulasi)</span>
            <span className="text-[11px] text-slate-400 block">Uji coba tanpa mengubah data target</span>
          </div>
          <button
            onClick={() => setDryRun(!dryRun)}
            className={`w-12 h-6 rounded-full p-1 transition-colors cursor-pointer ${
              dryRun ? 'bg-cyan-500' : 'bg-slate-700'
            }`}
          >
            <div
              className={`w-4 h-4 rounded-full bg-slate-950 transition-transform ${
                dryRun ? 'translate-x-6' : 'translate-x-0'
              }`}
            />
          </button>
        </div>

        {/* Batch Size Input */}
        <div>
          <label className="text-xs font-bold text-white block mb-1">
            Ukuran Batch (Rows / Batch)
          </label>
          <input
            type="number"
            value={batchSize}
            onChange={(e) => setBatchSize(e.target.value)}
            className="w-full bg-slate-900 border border-slate-800 text-cyan-300 text-xs px-3 py-1.5 rounded-lg outline-none"
          />
        </div>

        {/* Table Filter Summary */}
        <div>
          <span className="text-xs font-bold text-white block mb-1">Tabel Terpilih</span>
          <span className="text-xs text-cyan-400 font-bold bg-cyan-500/10 px-2.5 py-1 rounded-md border border-cyan-500/30 inline-block">
            {selectedTables.length} dari {totalSourceTables || 0} Tabel
          </span>
        </div>
      </div>

      {/* Table Selection Picker */}
      <div>
        <span className="text-xs font-bold text-slate-300 mb-2 block">
          Pilih Tabel untuk Disinkronkan:
        </span>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 max-h-48 overflow-y-auto p-3 bg-slate-950 rounded-xl border border-slate-800">
          {identicalTables.map(t => (
            <label
              key={t.tableName}
              className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer hover:text-white"
            >
              <input
                type="checkbox"
                checked={selectedTables.includes(t.tableName)}
                onChange={() => onToggleTableSelection(t.tableName)}
                className="rounded border-slate-700 text-cyan-500 focus:ring-0 cursor-pointer"
              />
              <span className="truncate">{t.tableName}</span>
            </label>
          ))}
          {differentSchemaTables.map(t => (
            <label
              key={t.tableName}
              className="flex items-center gap-2 text-xs text-amber-300 cursor-pointer hover:text-white"
            >
              <input
                type="checkbox"
                checked={selectedTables.includes(t.tableName)}
                onChange={() => onToggleTableSelection(t.tableName)}
                className="rounded border-slate-700 text-cyan-500 focus:ring-0 cursor-pointer"
              />
              <span className="truncate">{t.tableName} ⚠️</span>
            </label>
          ))}
        </div>
      </div>

      {/* Submit Sync Button */}
      <div className="flex items-center justify-between pt-3 border-t border-slate-800">
        <div className="text-xs text-slate-400">
          {dryRun ? (
            <span className="text-cyan-400 font-semibold">
              ℹ️ Mode Simulasi Aktif: Data target aman.
            </span>
          ) : (
            <span className="text-red-400 font-semibold">
              ⚠️ Mode Live Active: Data target akan ditimpa!
            </span>
          )}
        </div>

        <button
          onClick={onPerformSync}
          disabled={syncing || selectedTables.length === 0}
          className={`px-6 py-3 rounded-xl font-extrabold text-xs flex items-center gap-2 shadow-xl cursor-pointer transition-all ${
            dryRun
              ? 'bg-gradient-to-r from-cyan-400 to-blue-500 text-slate-950 hover:from-cyan-300 hover:to-blue-400 shadow-cyan-500/20'
              : 'bg-gradient-to-r from-red-500 to-amber-500 text-white hover:from-red-400 hover:to-amber-400 shadow-red-500/20'
          }`}
        >
          <Play size={16} className={syncing ? 'animate-bounce' : ''} />
          <span>
            {syncing
              ? 'Memproses Sync...'
              : dryRun
              ? 'Jalankan Simulasi Sync'
              : 'Mulai Sinkronisasi NYATA'}
          </span>
        </button>
      </div>

      {/* Sync Execution Output Terminal Log */}
      {syncResult && (
        <div className="mt-6 bg-slate-950 p-4 rounded-2xl border border-cyan-500/30 text-xs font-mono">
          <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-800">
            <span className="text-cyan-400 font-bold">📜 Log Output Sinkronisasi</span>
            {syncResult.durationMs !== undefined && (
              <span className="text-emerald-400 font-semibold">
                Selesai dalam {syncResult.durationMs} ms ({syncResult.totalRowsSynced} baris)
              </span>
            )}
          </div>

          <div className="space-y-1 max-h-60 overflow-y-auto">
            {(syncResult.logs || []).map((logLine, i) => (
              <div key={i} className="text-slate-300 leading-relaxed">
                {logLine}
              </div>
            ))}
          </div>

          {syncResult.details && (
            <div className="mt-4 pt-3 border-t border-slate-800 space-y-1.5">
              <span className="text-slate-400 text-[11px] uppercase font-bold block mb-1">
                Rincian per Tabel:
              </span>
              {syncResult.details.map((d, idx) => (
                <div key={idx} className="flex justify-between text-[11px] bg-slate-900/60 p-2 rounded-lg">
                  <span className="text-slate-300 font-bold">{d.tableName}</span>
                  <span className={d.status === 'success' ? 'text-emerald-400' : 'text-amber-400'}>
                    {d.status?.toUpperCase()} ({d.rowsSynced || 0} rows)
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
