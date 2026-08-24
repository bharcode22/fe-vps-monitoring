import React from 'react';
import { AlertTriangle, CheckCircle2, Zap } from 'lucide-react';

export default function MasterPodMatrixSummaryCards({
  summary,
  masterInfo,
  onBulkSync
}) {
  if (!summary) return null;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {/* 1. Master Info */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-3.5">
        <span className="text-xs text-slate-400">Master Template ({masterInfo?.name || 'Master'})</span>
        <div className="font-mono text-lg font-bold text-cyan-400 mt-1 truncate" title={masterInfo?.tableName}>
          {masterInfo?.tableName || '-'}
        </div>
        <div className="text-[11px] text-slate-500 mt-0.5">
          {masterInfo?.rowCount || 0} baris &bull; {masterInfo?.columnCount || 0} kolom
        </div>
      </div>

      {/* 2. Connected PODs Online/Offline */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-3.5">
        <span className="text-xs text-slate-400">Total POD V3 Terdaftar</span>
        <div className="font-mono text-xl font-bold text-white mt-1 flex items-baseline gap-2 flex-wrap">
          <span>{summary.onlinePods || 0} / {summary.totalPods || 0} Online</span>
          {(summary.offlinePods || 0) > 0 && (
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-red-500/20 text-red-400 border border-red-500/30">
              {summary.offlinePods} Offline
            </span>
          )}
        </div>
        <div className="text-[11px] text-slate-500 mt-0.5">
          Armada POD V3 Aktif
        </div>
      </div>

      {/* 3. Synced PODs Count */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-3.5">
        <span className="text-xs text-slate-400">POD 100% Selaras (Synced)</span>
        <div className="font-mono text-xl font-bold text-emerald-400 mt-1 flex items-center gap-1.5">
          <CheckCircle2 size={18} />
          <span>{summary.syncedPods || 0} POD</span>
        </div>
        <div className="text-[11px] text-slate-500 mt-0.5">
          Skema kolom &amp; data identik
        </div>
      </div>

      {/* 4. Mismatch / Missing Data Integrity Card */}
      <div
        className={`border rounded-2xl p-3.5 flex flex-col justify-between ${
          summary.mismatchPods > 0
            ? 'bg-amber-500/10 border-amber-500/30'
            : 'bg-emerald-500/10 border-emerald-500/30'
        }`}
      >
        <div>
          <span className="text-xs text-slate-400">Status Integritas Data</span>
          <div
            className={`font-mono text-sm font-bold mt-1 flex items-center gap-1.5 ${
              summary.mismatchPods > 0 ? 'text-amber-400' : 'text-emerald-400'
            }`}
          >
            {summary.mismatchPods > 0 ? (
              <>
                <AlertTriangle size={16} />
                <span>{summary.mismatchPods} POD Kurang / Drift</span>
              </>
            ) : (
              <>
                <CheckCircle2 size={16} />
                <span>100% Konsisten</span>
              </>
            )}
          </div>
        </div>
        {summary.mismatchPods > 0 && (
          <button
            onClick={onBulkSync}
            className="mt-2 text-[11px] font-extrabold text-amber-300 hover:text-amber-200 flex items-center gap-1 cursor-pointer"
          >
            <Zap size={12} /> Sync ke Semua POD &rarr;
          </button>
        )}
      </div>
    </div>
  );
}
