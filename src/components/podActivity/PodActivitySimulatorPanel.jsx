import React from 'react';
import { Play, UserCheck, UserX } from 'lucide-react';

export default function PodActivitySimulatorPanel({
  showSimulator,
  pods = [],
  onSimulate
}) {
  if (!showSimulator) return null;

  return (
    <div className="bg-gradient-to-r from-amber-500/10 via-slate-900 to-indigo-500/10 border border-amber-500/30 rounded-2xl p-4 shadow-xl flex flex-col gap-3 animate-in fade-in slide-in-from-top-2">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Play size={16} className="text-amber-400" />
          <h3 className="text-xs font-bold text-white uppercase tracking-wider">
            Panel Simulator Injeksi Nilai MQTT (Testing &amp; Verifikasi)
          </h3>
        </div>
        <span className="text-[11px] text-slate-400">
          Uji coba responsivitas tampilan secara instan tanpa harus duduk di kursi fisik.
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 pt-1">
        {pods.map((pod) => (
          <div
            key={pod.id}
            className="bg-slate-950/80 border border-slate-800 rounded-xl p-3 flex items-center justify-between gap-2"
          >
            <div>
              <h5 className="text-xs font-bold text-white">{pod.name}</h5>
              <span className="text-[10px] font-mono text-slate-400">{pod.host}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => onSimulate(pod.id, 1)}
                className="px-2.5 py-1 bg-emerald-600/25 hover:bg-emerald-600/40 text-emerald-300 border border-emerald-500/40 rounded-lg text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer"
                title="Simulasikan Status POB = 1 (Occupied)"
              >
                <UserCheck size={12} />
                <span>Set 1 (Occupied)</span>
              </button>
              <button
                onClick={() => onSimulate(pod.id, 0)}
                className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 rounded-lg text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer"
                title="Simulasikan Status POB = 0 (Available)"
              >
                <UserX size={12} />
                <span>Set 0 (Available)</span>
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
