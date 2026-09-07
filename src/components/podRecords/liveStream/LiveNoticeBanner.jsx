import React from 'react';
import { AlertCircle, Zap } from 'lucide-react';

export default function LiveNoticeBanner({
  hasSensors,
  latestHb,
  selectedModule,
  podName,
  onSelectPod
}) {
  if (hasSensors || latestHb === undefined) return null;

  return (
    <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/25 text-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs animate-in fade-in">
      <div className="flex items-start sm:items-center gap-2.5 min-w-0">
        <AlertCircle size={18} className="text-amber-400 shrink-0 mt-0.5 sm:mt-0" />
        <div className="min-w-0">
          <span className="font-bold text-white block">
            Modul {selectedModule} pada {podName} beroperasi dalam mode Heartbeat Counter murni
          </span>
          <span className="text-amber-300/80 text-[11px] block">
            Unit POD ini tidak memiliki sensor arus/daya fisik pada Modul {selectedModule}. Grafik di bawah menampilkan pergerakan pulsa detak Heartbeat.
          </span>
        </div>
      </div>
      {onSelectPod && (
        <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
          <span className="text-[11px] text-slate-400 hidden md:inline">Sensor daya aktif di:</span>
          <button
            onClick={() => onSelectPod(9)} // POD 31
            className="px-2.5 py-1 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/40 text-cyan-300 text-xs font-bold transition-all flex items-center gap-1 cursor-pointer shadow-sm"
            title="Beralih ke POD 31 untuk melihat telemetri arus 6 kanal aktif"
          >
            <Zap size={12} className="text-amber-400 fill-amber-400" /> Buka POD 31 (6 Kanal)
          </button>
        </div>
      )}
    </div>
  );
}
