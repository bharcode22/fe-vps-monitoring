import React from 'react';
import { Layers, Users, Music, Calendar, Cpu } from 'lucide-react';

export default function PodFleetSummaryCard({ pods = [], isLoading, onSelectPod }) {
  if (isLoading) {
    return (
      <div className="space-y-3 animate-pulse">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-14 bg-slate-950/60 rounded-xl border border-slate-800/80" />
        ))}
      </div>
    );
  }

  const validPods = (pods || []).filter(
    (p) => p && p.pod_id && p.pod_name && !p.pod_name.includes('Unknown') && Number(p.total_sessions) > 0
  );

  if (validPods.length === 0) {
    return (
      <div className="text-center py-10 text-slate-500 text-xs italic">
        Belum ada data aktivitas unit POD pada filter terpilih.
      </div>
    );
  }

  const maxSessions = validPods[0]?.total_sessions || 1;

  return (
    <div className="space-y-2.5">
      {validPods.map((pod, idx) => {
        const pct = Math.round((pod.total_sessions / maxSessions) * 100);
        const isUnknown = pod.pod_name.includes('Unknown') || !pod.pod_id;

        return (
          <div
            key={pod.pod_id || idx}
            onClick={() => onSelectPod && pod.pod_id && onSelectPod(pod.pod_id)}
            className={`p-3 rounded-xl bg-slate-950/50 hover:bg-slate-950/80 border border-slate-800/70 hover:border-cyan-500/40 transition-all duration-200 ${
              onSelectPod && pod.pod_id ? 'cursor-pointer' : ''
            }`}
          >
            <div className="flex items-center justify-between gap-3 mb-2">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="p-1.5 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 shrink-0">
                  <Cpu size={14} />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-white hover:text-cyan-300 transition-colors truncate">
                      {pod.pod_name}
                    </span>
                    {pod.pod_id && (
                      <span className="text-[10px] text-slate-500 font-mono hidden sm:inline">
                        {pod.pod_id.substring(0, 8)}...
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Stats badges */}
              <div className="flex items-center gap-3 text-xs font-mono shrink-0">
                <div className="flex items-center gap-1 text-slate-400" title="Hari Aktif">
                  <Calendar size={12} className="text-amber-400" />
                  <span>{pod.active_days} hr</span>
                </div>
                <div className="flex items-center gap-1 text-slate-300" title="Total Pengguna">
                  <Users size={12} className="text-cyan-400" />
                  <span>{pod.total_users} user</span>
                </div>
                <div className="flex items-center gap-1 text-emerald-300 font-bold" title="Total Sesi">
                  <Music size={12} className="text-emerald-400" />
                  <span>{pod.total_sessions.toLocaleString()}</span>
                </div>
              </div>
            </div>

            {/* Session Share Progress Bar */}
            <div className="w-full bg-slate-900 rounded-full h-1.5 overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-blue-500 transition-all duration-500"
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
