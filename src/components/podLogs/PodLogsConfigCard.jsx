import React from 'react';
import { SlidersHorizontal, Calendar, CheckCircle2, RefreshCw, Zap } from 'lucide-react';

export default function PodLogsConfigCard({
  v3Stats,
  v3Pods = [],
  targetScope,
  onTargetScopeChange,
  pullMode,
  onPullModeChange,
  batchSize,
  onBatchSizeChange,
  markSyncedOnPod,
  onMarkSyncedOnPodChange,
  datePreset,
  onDatePresetChange,
  customDateFrom,
  onCustomDateFromChange,
  customDateTo,
  onCustomDateToChange,
  isPulling,
  isLoadingAudit,
  onStartPull,
  consoleLogs = [],
  pullResult
}) {
  return (
    <div className="flex flex-col gap-4">
      {/* Control Panel: Configuration & Pull Trigger */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-xl flex flex-col gap-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800 flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <SlidersHorizontal size={18} className="text-rose-400" />
            <h3 className="text-sm font-bold text-white">Konfigurasi Penarikan POD V3 (Batch Tuning)</h3>
          </div>
          <span className="text-xs text-slate-400">
            Hanya menargetkan unit POD V3 yang aktif di jaringan lokal
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Option 1: Target Scope */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-slate-300">Target Unit POD V3:</label>
            <select
              value={targetScope}
              onChange={(e) => onTargetScopeChange(e.target.value)}
              className="bg-slate-950 border border-slate-700 text-slate-200 text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-rose-500 cursor-pointer font-medium"
            >
              <option value="ALL">⭐ Seluruh Armada POD V3 ({v3Stats.onlineUnits} Online)</option>
              {v3Pods.map((p) => (
                <option key={p.id} value={p.id} disabled={!p.isOnline}>
                  {p.name} [V3] ({p.host}) {!p.isOnline ? '(Offline)' : `— ${p.unsyncedRows.toLocaleString()} baris`}
                </option>
              ))}
            </select>
            <span className="text-[11px] text-slate-500">Hanya menampilkan server dengan pod_version = v3.</span>
          </div>

          {/* Option 2: Pull Mode */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-slate-300">Mode Penarikan Data:</label>
            <select
              value={pullMode}
              onChange={(e) => onPullModeChange(e.target.value)}
              className="bg-slate-950 border border-slate-700 text-slate-200 text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-rose-500 cursor-pointer font-medium"
            >
              <option value="id_diff">🔍 Komparasi ID (Cek &amp; Tarik yang Belum Ada di Master - Rekomendasi)</option>
              <option value="unsynced">⚡ Cepat (Hanya is_synced = false)</option>
              <option value="date_range">📅 Berdasarkan Rentang Tanggal</option>
              <option value="all">🔁 Tarik Semua Data (Full Idempoten)</option>
            </select>
            <span className="text-[11px] text-slate-500">
              {pullMode === 'id_diff'
                ? 'Memeriksa ID ke Master RDS: hanya menarik baris yang belum ada di Master (mengatasi anomali flag is_synced=true di POD).'
                : pullMode === 'unsynced'
                ? 'Hanya menarik baris dengan is_synced = false di POD.'
                : pullMode === 'date_range'
                ? 'Menarik baris dalam jendela waktu tertentu.'
                : 'Menarik seluruh baris secara idempoten via ON CONFLICT (id).'}
            </span>
          </div>

          {/* Option 3: Batch Chunk Size */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-slate-300">Ukuran Chunk Batch:</label>
            <select
              value={batchSize}
              onChange={(e) => onBatchSizeChange(parseInt(e.target.value, 10))}
              className="bg-slate-950 border border-slate-700 text-slate-200 text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-rose-500 cursor-pointer font-medium font-mono"
            >
              <option value="1000">1.000 baris / batch</option>
              <option value="2000">2.000 baris / batch (Optimal)</option>
              <option value="5000">5.000 baris / batch (Cepat)</option>
            </select>
            <span className="text-[11px] text-slate-500">Keyset cursor seek super cepat (&lt;5ms).</span>
          </div>

          {/* Option 4: Mark Synced Checkbox */}
          <div className="flex flex-col justify-between p-3 bg-slate-950/60 border border-slate-800 rounded-xl">
            <label className="flex items-start gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={markSyncedOnPod}
                onChange={(e) => onMarkSyncedOnPodChange(e.target.checked)}
                className="mt-0.5 rounded border-slate-700 text-rose-500 focus:ring-rose-500"
              />
              <div className="text-xs">
                <span className="font-bold text-white block">Tandai is_synced = true di POD</span>
                <span className="text-[10px] text-slate-400">
                  Otomatis update status di database lokal POD setelah berhasil disimpan di Master.
                </span>
              </div>
            </label>
          </div>
        </div>

        {/* Sub-section: Date Range Picker (if mode === 'date_range') */}
        {pullMode === 'date_range' && (
          <div className="p-3 bg-slate-950/80 border border-slate-800 rounded-xl flex items-center gap-3 flex-wrap text-xs">
            <span className="font-semibold text-slate-300 flex items-center gap-1.5">
              <Calendar size={14} className="text-cyan-400" /> Preset Waktu:
            </span>
            <div className="flex items-center gap-1.5 flex-wrap">
              {[
                { id: 'TODAY', label: 'Hari Ini' },
                { id: '3_DAYS', label: '3 Hari Terakhir' },
                { id: '7_DAYS', label: '7 Hari Terakhir' },
                { id: '30_DAYS', label: '30 Hari Terakhir' },
                { id: 'CUSTOM', label: 'Rentang Kustom' }
              ].map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => onDatePresetChange(p.id)}
                  className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer border ${
                    datePreset === p.id
                      ? 'bg-cyan-500/20 border-cyan-500/40 text-cyan-300 font-bold'
                      : 'bg-white/5 border-transparent text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>

            {datePreset === 'CUSTOM' && (
              <div className="flex items-center gap-2 ml-auto flex-wrap">
                <input
                  type="datetime-local"
                  value={customDateFrom}
                  onChange={(e) => onCustomDateFromChange(e.target.value)}
                  className="bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-slate-200"
                />
                <span className="text-slate-500">s/d</span>
                <input
                  type="datetime-local"
                  value={customDateTo}
                  onChange={(e) => onCustomDateToChange(e.target.value)}
                  className="bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-slate-200"
                />
              </div>
            )}
          </div>
        )}

        {/* Execution Trigger Button */}
        <div className="pt-2 flex items-center justify-between gap-4 flex-wrap">
          <div className="text-xs text-slate-400 flex items-center gap-2">
            <CheckCircle2 size={15} className="text-emerald-400" />
            <span>
              Menggunakan metode <code className="text-white font-mono">ON CONFLICT (id) DO UPDATE</code> yang dijamin aman dan idempoten.
            </span>
          </div>

          <button
            onClick={() => onStartPull()}
            disabled={isPulling || isLoadingAudit}
            className="px-6 py-2.5 bg-gradient-to-r from-rose-600 via-rose-500 to-indigo-600 hover:from-rose-500 hover:to-indigo-500 text-white font-bold rounded-xl text-xs flex items-center gap-2 shadow-lg shadow-rose-500/25 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isPulling ? (
              <RefreshCw size={15} className="animate-spin" />
            ) : (
              <Zap size={15} className="fill-current" />
            )}
            <span>
              {isPulling
                ? 'Sedang Menarik Data...'
                : `⚡ Mulai Tarik Data (${targetScope === 'ALL' ? 'Semua POD V3' : '1 POD Terpilih'})`}
            </span>
          </button>
        </div>
      </div>

      {/* Live Progress Bar & Console Log Container */}
      {(isPulling || consoleLogs.length > 0) && (
        <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 shadow-2xl flex flex-col gap-3">
          <div className="flex items-center justify-between border-b border-slate-800/80 pb-2.5">
            <div className="flex items-center gap-2">
              <div className={`w-2.5 h-2.5 rounded-full ${isPulling ? 'bg-amber-400 animate-ping' : 'bg-emerald-400'}`} />
              <h4 className="text-xs font-bold text-white tracking-wide">Live Execution Console &amp; Kecepatan Batch</h4>
            </div>
            {pullResult && (
              <span className="text-xs font-mono text-emerald-400 font-bold">
                Total Selesai: {pullResult.totalProcessed?.toLocaleString()} baris
              </span>
            )}
          </div>

          {/* Progress Terminal Viewport */}
          <div className="bg-[#090d16] p-3 rounded-xl border border-slate-800/80 max-h-52 overflow-y-auto font-mono text-[11.5px] leading-relaxed text-slate-300 flex flex-col gap-1 select-text">
            {consoleLogs.map((line, idx) => (
              <div
                key={idx}
                className={
                  line.includes('ERROR')
                    ? 'text-rose-400 font-bold'
                    : line.includes('SELESAI')
                    ? 'text-emerald-300 font-bold'
                    : line.includes('Memulai')
                    ? 'text-cyan-300 font-semibold'
                    : 'text-slate-300'
                }
              >
                {line}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
