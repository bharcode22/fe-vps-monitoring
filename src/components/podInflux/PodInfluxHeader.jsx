import React from 'react';
import { ArrowLeft, Activity, ShieldCheck, RefreshCw } from 'lucide-react';

export default function PodInfluxHeader({
  onBack,
  onRefresh,
  isLoading = false,
}) {
  return (
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800/80">
      <div className="flex items-center gap-3">
        {onBack && (
          <button
            onClick={onBack}
            className="p-2 bg-slate-900/80 hover:bg-slate-800 text-slate-300 hover:text-white rounded-lg border border-slate-700/60 transition"
            title="Kembali ke Dashboard"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
        )}
        <div>
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-emerald-500/20 text-emerald-400 rounded-lg border border-emerald-500/30">
              <Activity className="w-5 h-5" />
            </div>
            <h1 className="text-xl md:text-2xl font-bold bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400 bg-clip-text text-transparent">
              InfluxDB POD V3 Edge Manager
            </h1>
            <span className="px-2 py-0.5 text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 rounded-full">
              EDGE NODES
            </span>
          </div>
          <p className="text-xs md:text-sm text-slate-400 mt-1">
            Eksplorasi, filter, dan download metrik sensor langsung dari InfluxDB lokal di setiap unit POD V3
          </p>
        </div>
      </div>

      {/* Global Action Badges */}
      <div className="flex items-center gap-2.5 flex-wrap">
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-emerald-950/40 text-emerald-300 border border-emerald-800/40">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span>Murni Read-Only (Aman)</span>
        </div>

        <button
          onClick={onRefresh}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white rounded-lg border border-slate-700/70 text-xs font-medium transition"
          title="Refresh Status Armada"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-emerald-400' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>
    </div>
  );
}
