import React from 'react';
import { AlertTriangle, CheckCircle2, Zap } from 'lucide-react';

export default function PodTopicStatsCards({ summary, overallMissingCount, onBulkSync }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {/* 1. Connected PODs Card */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-3.5">
        <span className="text-xs text-slate-400">Total POD V3 Terhubung</span>
        <div className="font-mono text-xl font-bold text-white mt-1 flex items-baseline gap-2 flex-wrap">
          <span>{summary?.successfulPods || 0} / {summary?.totalPods || 0} Online</span>
          {(summary?.offlinePods || 0) > 0 && (
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-red-500/20 text-red-400 border border-red-500/30">
              {summary.offlinePods} Offline
            </span>
          )}
        </div>
      </div>

      {/* 2. Total pod_topics Card */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-3.5">
        <span className="text-xs text-slate-400">Total pod_topics</span>
        <div className="font-mono text-xl font-bold text-cyan-400 mt-1">
          {summary?.totalPodTopics || 0} Topic
        </div>
      </div>

      {/* 3. Total socket_topics Card */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-3.5">
        <span className="text-xs text-slate-400">Total socket_topics</span>
        <div className="font-mono text-xl font-bold text-purple-400 mt-1">
          {summary?.totalSocketTopics || 0} Topic
        </div>
      </div>

      {/* 4. Integrity Status Card */}
      <div className={`border rounded-2xl p-3.5 flex flex-col justify-between ${
        overallMissingCount > 0 ? 'bg-amber-500/10 border-amber-500/30' : 'bg-emerald-500/10 border-emerald-500/30'
      }`}>
        <div>
          <span className="text-xs text-slate-400">Status Integritas Data</span>
          <div className={`font-mono text-sm font-bold mt-1 flex items-center gap-1.5 ${
            overallMissingCount > 0 ? 'text-amber-400' : 'text-emerald-400'
          }`}>
            {overallMissingCount > 0 ? (
              <>
                <AlertTriangle size={16} />
                <span>{overallMissingCount} Topic Kurang</span>
              </>
            ) : (
              <>
                <CheckCircle2 size={16} />
                <span>100% Selaras (Synced)</span>
              </>
            )}
          </div>
        </div>
        {overallMissingCount > 0 && (
          <button
            onClick={onBulkSync}
            className="mt-2 text-[11px] font-extrabold text-amber-300 hover:text-amber-200 flex items-center gap-1 cursor-pointer"
          >
            <Zap size={12} /> Sync Sekarang &rarr;
          </button>
        )}
      </div>
    </div>
  );
}
