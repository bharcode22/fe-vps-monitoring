import React from 'react';

/**
 * InfluxKpiSummary Component
 * Displays key performance indicators for executed InfluxDB query:
 * Total Rows, Execution Duration, Measurement name, and Detected Tag Count.
 */
export default function InfluxKpiSummary({ queryResult, selectedMeasurements = [] }) {
  if (!queryResult) return null;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800">
        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Baris</span>
        <div className="text-xl sm:text-2xl font-black text-cyan-400 mt-1 font-mono">
          {queryResult.totalRows?.toLocaleString() || 0}
        </div>
      </div>
      <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800">
        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Durasi Eksekusi</span>
        <div className="text-xl sm:text-2xl font-black text-emerald-400 mt-1 font-mono">
          {queryResult.queryDurationMs || 0} ms
        </div>
      </div>
      <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800">
        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Measurement</span>
        <div className="text-xl sm:text-2xl font-black text-purple-400 mt-1 font-mono truncate" title={selectedMeasurements.join(', ')}>
          {selectedMeasurements.join(', ') || queryResult.measurements?.[0] || '—'}
        </div>
      </div>
      <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800">
        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Tags Terdeteksi</span>
        <div className="text-xl sm:text-2xl font-black text-amber-400 mt-1 font-mono">
          {queryResult.tagKeys?.length || 0}
        </div>
      </div>
    </div>
  );
}
