import React from 'react';
import { Download, FileSpreadsheet, HardDrive, Clock, CheckCircle2, AlertCircle, X, StopCircle, RefreshCw } from 'lucide-react';

/**
 * PodInfluxExportProgressModal
 * Real-time streaming download progress modal for Influx POD V3
 */
export default function PodInfluxExportProgressModal({
  isOpen,
  onClose,
  onCancel,
  podName = 'POD Unit',
  format = 'csv',
  progress = {
    stage: 'connecting', // 'connecting' | 'querying' | 'streaming' | 'saving' | 'done' | 'error' | 'cancelled'
    percent: 10,
    receivedMb: '0.00',
    rowCount: 0,
    elapsedSeconds: 0,
    filename: '',
    error: null
  }
}) {
  if (!isOpen) return null;

  const {
    stage = 'connecting',
    percent = 10,
    receivedMb = '0.00',
    rowCount = 0,
    elapsedSeconds = 0,
    filename = '',
    error = null
  } = progress;

  const isDone = stage === 'done';
  const isError = stage === 'error';
  const isCancelled = stage === 'cancelled';
  const isRunning = !isDone && !isError && !isCancelled;

  // Format elapsed seconds as MM:SS
  const formatTime = (secs) => {
    const m = Math.floor(secs / 60).toString().padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  // Steps definition
  const steps = [
    {
      id: 'step-1',
      label: 'Kirim Parameter',
      desc: 'Inisialisasi koneksi',
      isComplete: stage === 'streaming' || stage === 'saving' || isDone,
      isActive: stage === 'connecting'
    },
    {
      id: 'step-2',
      label: 'Eksekusi di POD',
      desc: 'Flux query engine',
      isComplete: stage === 'streaming' || stage === 'saving' || isDone,
      isActive: stage === 'connecting' && elapsedSeconds > 1
    },
    {
      id: 'step-3',
      label: 'Streaming Data',
      desc: 'Aliran chunk CSV',
      isComplete: isDone,
      isActive: stage === 'streaming' || stage === 'saving'
    },
    {
      id: 'step-4',
      label: 'Selesai & Simpan',
      desc: 'Tersimpan di PC',
      isComplete: isDone,
      isActive: isDone
    }
  ];

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div
              className={`p-2.5 rounded-xl border transition-colors ${
                isDone
                  ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                  : isError
                  ? 'bg-rose-500/20 text-rose-400 border-rose-500/30'
                  : isCancelled
                  ? 'bg-amber-500/20 text-amber-400 border-amber-500/30'
                  : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 ring-4 ring-emerald-500/10'
              }`}
            >
              {isDone ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
              ) : isError ? (
                <AlertCircle className="w-5 h-5 text-rose-400" />
              ) : (
                <Download className="w-5 h-5 animate-bounce" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-slate-100 text-sm">
                  {isDone
                    ? 'Ekspor Data Berhasil'
                    : isError
                    ? 'Ekspor Gagal'
                    : isCancelled
                    ? 'Ekspor Dibatalkan'
                    : `Mengunduh Data ${format.toUpperCase()} (Edge)`}
                </h3>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold tracking-wider uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  {format.toUpperCase()}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Target: <span className="font-medium text-slate-300">{podName}</span>
              </p>
            </div>
          </div>

          {!isRunning && (
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
              title="Tutup Modal"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Stepper Progress Bar */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-medium text-slate-300 flex items-center gap-1.5">
              {isRunning && <RefreshCw className="w-3.5 h-3.5 animate-spin text-emerald-400" />}
              {stage === 'connecting'
                ? 'Menghubungkan ke Edge POD...'
                : stage === 'streaming'
                ? 'Sedang mengalirkan data ke browser...'
                : stage === 'saving'
                ? 'Menyimpan berkas unduhan...'
                : isDone
                ? 'Unduhan selesai 100%'
                : isCancelled
                ? 'Dibatalkan oleh pengguna'
                : 'Terjadi kegagalan proses'}
            </span>
            <span className="font-bold font-mono text-emerald-400">
              {isDone ? '100%' : isError ? 'Error' : `${percent}%`}
            </span>
          </div>

          {/* Bar track */}
          <div className="w-full bg-slate-800/80 rounded-full h-2.5 overflow-hidden border border-slate-700/50 p-0.5">
            <div
              className={`h-full rounded-full transition-all duration-300 ${
                isDone
                  ? 'bg-gradient-to-r from-emerald-500 to-teal-400'
                  : isError
                  ? 'bg-rose-500'
                  : isCancelled
                  ? 'bg-amber-500'
                  : 'bg-gradient-to-r from-emerald-500 via-teal-400 to-cyan-400 animate-pulse'
              }`}
              style={{ width: `${Math.max(5, Math.min(100, percent))}%` }}
            />
          </div>

          {/* Stepper Chips */}
          <div className="grid grid-cols-4 gap-1.5 pt-1">
            {steps.map((step, idx) => (
              <div
                key={step.id}
                className={`p-1.5 rounded-lg border text-center transition ${
                  step.isComplete
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                    : step.isActive
                    ? 'bg-cyan-500/10 border-cyan-500/40 text-cyan-300 ring-1 ring-cyan-500/20'
                    : 'bg-slate-800/40 border-slate-800 text-slate-500'
                }`}
              >
                <div className="text-[10px] font-bold leading-tight truncate">
                  {idx + 1}. {step.label}
                </div>
                <div className="text-[9px] opacity-75 truncate">{step.desc}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Real-time Metrics Dashboard */}
        <div className="grid grid-cols-3 gap-2 text-xs">
          {/* Data Transferred */}
          <div className="bg-slate-800/50 border border-slate-800 rounded-xl p-2.5 space-y-1">
            <div className="flex items-center gap-1.5 text-slate-400 text-[11px]">
              <HardDrive className="w-3.5 h-3.5 text-teal-400" />
              <span>Data Diterima</span>
            </div>
            <div className="font-mono font-bold text-slate-100 text-sm truncate">
              {receivedMb} <span className="text-[11px] font-normal text-slate-400">MB</span>
            </div>
          </div>

          {/* Rows Count */}
          <div className="bg-slate-800/50 border border-slate-800 rounded-xl p-2.5 space-y-1">
            <div className="flex items-center gap-1.5 text-slate-400 text-[11px]">
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
              <span>Baris Data</span>
            </div>
            <div className="font-mono font-bold text-slate-100 text-sm truncate">
              {Number(rowCount).toLocaleString('id-ID')}
            </div>
          </div>

          {/* Time Elapsed */}
          <div className="bg-slate-800/50 border border-slate-800 rounded-xl p-2.5 space-y-1">
            <div className="flex items-center gap-1.5 text-slate-400 text-[11px]">
              <Clock className="w-3.5 h-3.5 text-cyan-400" />
              <span>Durasi Waktu</span>
            </div>
            <div className="font-mono font-bold text-slate-100 text-sm">
              {formatTime(elapsedSeconds)}
            </div>
          </div>
        </div>

        {/* Dynamic Context Status Note / Error Message */}
        {error ? (
          <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs text-rose-300 space-y-1">
            <div className="font-bold flex items-center gap-1.5">
              <AlertCircle className="w-4 h-4 text-rose-400" />
              <span>Gagal Mengekspor Data:</span>
            </div>
            <p className="text-[11px] text-rose-200/90 break-words">{error}</p>
          </div>
        ) : isDone ? (
          <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-xs text-emerald-300 space-y-1">
            <div className="font-bold flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>Berkas berhasil disimpan ke folder Unduhan Anda!</span>
            </div>
            {filename && (
              <p className="text-[11px] font-mono text-emerald-200/90 truncate">
                File: {filename}
              </p>
            )}
          </div>
        ) : isCancelled ? (
          <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-xs text-amber-300 space-y-1">
            <div className="font-bold flex items-center gap-1.5">
              <StopCircle className="w-4 h-4 text-amber-400" />
              <span>Unduhan telah dibatalkan.</span>
            </div>
            <p className="text-[11px] text-amber-200/80">
              Koneksi stream dihentikan dan tidak ada berkas tersimpan.
            </p>
          </div>
        ) : (
          <div className="p-2.5 bg-slate-800/30 border border-slate-800/80 rounded-xl text-[11px] text-slate-400 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              Aliran data aktif (Full Dump / Tanpa batasan limit)
            </span>
            <span className="text-slate-500">Live Stream Engine</span>
          </div>
        )}

        {/* Footer Actions */}
        <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-800">
          {isRunning ? (
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border border-rose-500/30 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition"
            >
              <StopCircle className="w-4 h-4 text-rose-400" />
              <span>Batalkan Unduhan</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold shadow-lg shadow-emerald-900/30 transition flex items-center gap-1.5"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Tutup</span>
            </button>
          )}
        </div>

      </div>
    </div>
  );
}
