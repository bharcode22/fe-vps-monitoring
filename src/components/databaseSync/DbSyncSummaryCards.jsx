import React from 'react';

export default function DbSyncSummaryCards({ summary }) {
  if (!summary) return null;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
      {/* 1. Identical */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 text-center">
        <span className="text-slate-400 text-xs block mb-1">Tabel Identik</span>
        <span className="text-2xl font-extrabold text-emerald-400">
          {summary.identicalCount || 0}
        </span>
      </div>

      {/* 2. Different Schema */}
      <div className="bg-slate-900/80 border border-amber-500/30 rounded-2xl p-4 text-center">
        <span className="text-amber-400 text-xs block mb-1">Perbedaan Skema</span>
        <span className="text-2xl font-extrabold text-amber-400">
          {summary.differentSchemaCount || 0}
        </span>
      </div>

      {/* 3. Missing in Target */}
      <div className="bg-slate-900/80 border border-red-500/30 rounded-2xl p-4 text-center">
        <span className="text-red-400 text-xs block mb-1">Hilang di Target</span>
        <span className="text-2xl font-extrabold text-red-400">
          {summary.missingInTargetCount || 0}
        </span>
      </div>

      {/* 4. Extra in Target */}
      <div className="bg-slate-900/80 border border-purple-500/30 rounded-2xl p-4 text-center">
        <span className="text-purple-400 text-xs block mb-1">Ekstra di Target</span>
        <span className="text-2xl font-extrabold text-purple-400">
          {summary.extraInTargetCount || 0}
        </span>
      </div>
    </div>
  );
}
