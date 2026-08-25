import React, { useState } from 'react';
import {
  Zap,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Loader2,
  UploadCloud,
  DownloadCloud,
  Database,
  Server,
  ChevronDown,
  ChevronUp,
  Sparkles,
  X,
  Layers,
  FileSpreadsheet
} from 'lucide-react';

export default function SyncProgressReportModal({
  isOpen,
  onClose,
  direction = 'master_to_pod', // 'master_to_pod' | 'pod_to_master'
  isProcessing = false,
  title = 'Proses Sinkronisasi',
  tableName = '',
  sourceName = '',
  targetName = '',
  progressPercent = 0,
  currentStatusText = 'Memproses...',
  report = null // Result object once completed
}) {
  const [expandedLogsIndex, setExpandedLogsIndex] = useState(null);

  if (!isOpen) return null;

  const isMasterToPod = direction === 'master_to_pod';
  const hasFinished = !isProcessing && report !== null;

  // Calculate summary counts
  const totalRows = report?.totalRowsProcessed ?? report?.totalRowsSynced ?? report?.rowsProcessed ?? report?.totalRowsFromPod ?? 0;
  const successCount = report?.successfulTargets ?? (report?.success ? 1 : 0);
  const failCount = report?.failedTargets ?? (report?.success === false ? 1 : 0);
  const isAllSuccess = report?.success !== false && (report?.failedTargets || 0) === 0;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-slate-950 border border-cyan-500/40 rounded-3xl p-6 max-w-xl w-full shadow-2xl flex flex-col gap-5 max-h-[90vh] overflow-y-auto">

        {/* Modal Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-2xl border ${isProcessing
              ? 'bg-amber-500/20 text-amber-400 border-amber-500/40 animate-pulse'
              : isAllSuccess
                ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                : 'bg-red-500/20 text-red-400 border-red-500/40'
              }`}>
              {isProcessing ? (
                <Loader2 size={20} className="animate-spin" />
              ) : isAllSuccess ? (
                <CheckCircle2 size={20} />
              ) : (
                <AlertTriangle size={20} />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white tracking-tight">
                  {title}
                </h3>
                <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border ${isMasterToPod
                  ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30'
                  : 'bg-purple-500/20 text-purple-300 border-purple-500/30'
                  }`}>
                  {isMasterToPod ? 'Master ➔ POD' : 'POD ➔ Master'}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-1.5">
                <span>Tabel:</span>
                <strong className="text-cyan-300 font-mono">public.{tableName}</strong>
                <span>&bull;</span>
                <span className="text-slate-300">{sourceName} ➔ {targetName}</span>
              </p>
            </div>
          </div>

          {!isProcessing && (
            <button
              onClick={onClose}
              className="p-1.5 rounded-xl bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 transition-colors cursor-pointer"
              title="Tutup"
            >
              <X size={16} />
            </button>
          )}
        </div>

        {/* 1. In-Progress State View */}
        {isProcessing && (
          <div className="flex flex-col gap-4 py-4">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-300 flex items-center gap-2">
                <Loader2 size={13} className="animate-spin text-cyan-400" />
                <span>{currentStatusText}</span>
              </span>
              <span className="font-mono text-cyan-400 font-bold">{progressPercent}%</span>
            </div>

            {/* Glowing animated progress bar */}
            <div className="w-full bg-slate-900 rounded-full h-3 overflow-hidden border border-slate-800 p-0.5 shadow-inner">
              <div
                className="h-full rounded-full bg-gradient-to-r from-cyan-500 via-indigo-500 to-purple-500 transition-all duration-300 shadow-md shadow-cyan-500/30"
                style={{ width: `${Math.max(8, progressPercent)}%` }}
              />
            </div>

            <div className="p-3.5 bg-slate-900/60 rounded-2xl border border-slate-800/80 flex items-center gap-3 text-xs text-slate-400">
              <Sparkles size={16} className="text-amber-400 shrink-0" />
              <span>
                Sedang memproses sinkronisasi data antar database secara aman dan terisolasi. Mohon tunggu sejenak...
              </span>
            </div>
          </div>
        )}

        {/* 2. Finished Result Breakdown Report */}
        {hasFinished && (
          <div className="flex flex-col gap-4">
            {/* Summary KPI Cards Grid */}
            <div className="grid grid-cols-3 gap-2.5">
              {/* Total Processed Rows Card */}
              <div className="p-3 bg-slate-900/80 border border-slate-800 rounded-2xl flex flex-col gap-1">
                <div className="flex items-center gap-1.5 text-slate-400 text-[11px]">
                  <FileSpreadsheet size={13} className="text-cyan-400" />
                  <span>Total Baris Data</span>
                </div>
                <div className="text-lg font-bold font-mono text-white">
                  {totalRows} <span className="text-xs text-slate-400 font-normal">baris</span>
                </div>
              </div>

              {/* Success Targets Card */}
              <div className="p-3 bg-emerald-950/30 border border-emerald-500/30 rounded-2xl flex flex-col gap-1">
                <div className="flex items-center gap-1.5 text-emerald-400 text-[11px]">
                  <CheckCircle2 size={13} />
                  <span>Berhasil</span>
                </div>
                <div className="text-lg font-bold font-mono text-emerald-300">
                  {successCount} <span className="text-xs text-emerald-400/80 font-normal">unit</span>
                </div>
              </div>

              {/* Failed Targets Card */}
              <div className={`p-3 rounded-2xl flex flex-col gap-1 border ${failCount > 0
                ? 'bg-red-950/40 border-red-500/40'
                : 'bg-slate-900/50 border-slate-800'
                }`}>
                <div className={`flex items-center gap-1.5 text-[11px] ${failCount > 0 ? 'text-red-400' : 'text-slate-500'}`}>
                  <XCircle size={13} />
                  <span>Gagal</span>
                </div>
                <div className={`text-lg font-bold font-mono ${failCount > 0 ? 'text-red-400' : 'text-slate-500'}`}>
                  {failCount} <span className="text-xs font-normal">unit</span>
                </div>
              </div>
            </div>

            {/* Target Servers Itemized Status List */}
            {Array.isArray(report?.results) && report.results.length > 0 && (
              <div className="flex flex-col gap-2">
                <label className="text-xs font-bold text-slate-300 flex items-center justify-between">
                  <span>Rincian Hasil per Unit Server:</span>
                  <span className="text-[10px] text-slate-500 font-normal">{report.results.length} server target</span>
                </label>

                <div className="max-h-56 overflow-y-auto bg-slate-900/60 rounded-2xl border border-slate-800 p-2 flex flex-col gap-2 text-xs">
                  {report.results.map((res, idx) => {
                    const isExpanded = expandedLogsIndex === idx;
                    return (
                      <div
                        key={idx}
                        className={`p-2.5 rounded-xl border transition-all ${res.success
                          ? 'bg-slate-900/90 border-slate-800 hover:border-emerald-500/30'
                          : 'bg-red-950/30 border-red-500/40'
                          }`}
                      >
                        <div
                          className="flex items-center justify-between cursor-pointer"
                          onClick={() => setExpandedLogsIndex(isExpanded ? null : idx)}
                        >
                          <div className="flex items-center gap-2">
                            <span className={`p-1 rounded-lg ${res.success ? 'bg-emerald-500/15 text-emerald-400' : 'bg-red-500/15 text-red-400'
                              }`}>
                              {res.success ? <CheckCircle2 size={14} /> : <XCircle size={14} />}
                            </span>
                            <div>
                              <div className="font-bold text-white flex items-center gap-1.5">
                                <span>{res.serverName || `Server #${res.serverId}`}</span>
                                {res.serverHost && (
                                  <span className="text-[10px] text-slate-400 font-mono">({res.serverHost})</span>
                                )}
                              </div>
                              <div className="text-[10px] text-slate-400">
                                {res.success ? (
                                  <span className="text-emerald-400 font-semibold">
                                    ✓ {res.rowsSynced || 0} baris data disinkronkan
                                    {Array.isArray(res.columnsAdded) && res.columnsAdded.length > 0 && (
                                      <span> (+{res.columnsAdded.length} kolom baru)</span>
                                    )}
                                  </span>
                                ) : (
                                  <span className="text-red-400 font-medium truncate block max-w-xs" title={res.error}>
                                    ✕ Gagal: {res.error}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          <button className="p-1 text-slate-500 hover:text-slate-300 transition-colors">
                            {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                          </button>
                        </div>

                        {/* Expandable Logs Detail */}
                        {isExpanded && Array.isArray(res.logs) && res.logs.length > 0 && (
                          <div className="mt-2.5 pt-2 border-t border-slate-800 font-mono text-[10px] bg-slate-950/90 p-2 rounded-lg text-slate-400 flex flex-col gap-1">
                            {res.logs.map((log, lIdx) => (
                              <div key={lIdx} className="leading-tight">{log}</div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Single POD report summary (if POD ➔ Master) */}
            {!Array.isArray(report?.results) && (
              <div className="p-3.5 bg-slate-900/80 rounded-2xl border border-slate-800 flex flex-col gap-1.5 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Server Sumber:</span>
                  <span className="font-bold text-white font-mono">{report?.serverName || sourceName}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Tabel Tujuan:</span>
                  <span className="font-bold text-cyan-300 font-mono">public.{tableName} (Master DB)</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Status Sinkronisasi:</span>
                  <span className="font-bold text-emerald-400 flex items-center gap-1">
                    <CheckCircle2 size={13} />
                    <span>Sukses ({report?.rowsProcessed || totalRows} baris masuk ke Master)</span>
                  </span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Modal Footer */}
        <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-800">
          {!isProcessing ? (
            <button
              onClick={onClose}
              className="px-5 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 rounded-xl text-xs font-bold transition-all cursor-pointer hover:scale-105 shadow-md shadow-cyan-500/20"
            >
              Selesai / Tutup
            </button>
          ) : (
            <div className="text-[11px] text-slate-500 italic">
              Sinkronisasi sedang berjalan di background server...
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
