import React from 'react';
import { UserCheck, UserX, Clock, Radio, Activity } from 'lucide-react';

export default function PodActivityCard({
  pod,
  isFlashing,
  formatDuration,
  onSelectPod
}) {
  const isOccupied = pod.stateValue === 1;
  const isVacant = pod.stateValue === 0;
  const isUnknown = pod.stateValue === null;

  return (
    <div
      onClick={() => onSelectPod(pod)}
      className={`bg-slate-900/80 backdrop-blur-md border rounded-2xl p-5 flex flex-col justify-between gap-4 transition-all duration-300 relative overflow-hidden cursor-pointer hover:border-cyan-500/50 hover:shadow-xl hover:shadow-cyan-500/10 group ${isFlashing
        ? 'border-amber-400 ring-2 ring-amber-400/50 shadow-xl shadow-amber-500/20 scale-[1.01]'
        : isOccupied
          ? 'border-emerald-500/40 shadow-lg shadow-emerald-500/10 bg-gradient-to-b from-emerald-950/20 via-slate-900/80 to-slate-900/90'
          : 'border-slate-800/90 hover:border-slate-700'
        }`}
    >
      {/* Subtle Corner Glow */}
      {isOccupied && (
        <div className="absolute -top-10 -right-10 w-28 h-28 bg-emerald-500/15 rounded-full blur-2xl pointer-events-none" />
      )}

      {/* Card Header: Unit Name, Code, Version & Broker Status */}
      <div className="flex items-start justify-between gap-2 z-10">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-base font-black text-white tracking-wide group-hover:text-cyan-300 transition-colors">
              {pod.name}
            </h3>
            <span className="text-[10px] font-mono px-1.5 py-0.5 bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 rounded-md font-bold">
              V3
            </span>
            <span className="text-[10px] font-mono text-slate-400 font-bold">#{pod.code}</span>
          </div>
        </div>

        <div className="flex flex-col items-end gap-1.5">
          {pod.brokerConnected || (pod.lastPayload !== null && pod.lastPayload !== undefined) ? (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> Broker Online
            </span>
          ) : (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-rose-500/15 text-rose-300 border border-rose-500/30">
              Broker Offline
            </span>
          )}

          <button
            onClick={(e) => {
              e.stopPropagation();
              onSelectPod(pod);
            }}
            className="px-2.5 py-1 bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-300 border border-cyan-500/30 rounded-xl text-[10.5px] font-bold inline-flex items-center gap-1.5 transition-all cursor-pointer shadow-sm"
            title="Buka Daftar Topik & Live Sniffer Broker"
          >
            <Radio size={11} className="text-cyan-400" />
            <span>Sniffer Topik</span>
          </button>
        </div>
      </div>

      {/* Center Hero: Live Occupancy Banner */}
      <div
        className={`rounded-2xl p-4 flex flex-col items-center justify-center text-center gap-2 border transition-all z-10 ${isOccupied
          ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300 shadow-inner'
          : isVacant
            ? 'bg-slate-950/70 border-slate-800 text-slate-300'
            : 'bg-amber-500/10 border-amber-500/30 text-amber-300'
          }`}
      >
        <div className="flex items-center gap-2">
          {isOccupied ? (
            <div className="p-2.5 bg-emerald-500/25 rounded-2xl text-emerald-300 border border-emerald-400/40 shadow-lg shadow-emerald-500/20">
              <UserCheck size={26} />
            </div>
          ) : isVacant ? (
            <div className="p-2.5 bg-slate-900 rounded-2xl text-slate-400 border border-slate-800">
              <UserX size={26} />
            </div>
          ) : (
            <div className="p-2.5 bg-amber-500/20 rounded-2xl text-amber-400 border border-amber-500/30">
              <Clock size={26} />
            </div>
          )}
        </div>

        <div>
          <div className="text-lg font-black tracking-wider uppercase">
            {isOccupied ? 'OCCUPIED' : isVacant ? 'AVAILABLE' : 'AWAITING DATA'}
          </div>
          <span className="text-[11px] font-mono text-slate-400">
            {isOccupied
              ? 'POB State: 1 (Session Active)'
              : isVacant
                ? 'POB State: 0 (Unit Standby)'
                : 'Belum menerima payload MQTT'}
          </span>
        </div>

        {/* Live Ticker Counter */}
        <div className="mt-1 px-3 py-1 bg-slate-950/80 border border-slate-800 rounded-xl text-xs font-mono font-bold flex items-center gap-1.5 shadow-inner">
          <Clock size={12} className={isOccupied ? 'text-emerald-400' : 'text-slate-400'} />
          <span className={isOccupied ? 'text-emerald-300' : 'text-slate-300'}>
            {isOccupied
              ? `Durasi Sesi: ${formatDuration(pod.lastChangedAt)}`
              : isVacant
                ? `Durasi Standby: ${formatDuration(pod.lastChangedAt)}`
                : 'Menunggu pesan broker...'}
          </span>
        </div>
      </div>

      {/* Card Bottom: Metadata */}
      <div className="flex flex-col gap-2 pt-2 border-t border-slate-800/80 z-10">
        <div className="flex items-center justify-between text-[11px] font-mono text-slate-500">
          <span>
            Pob State: <code className="text-white font-bold">{pod.lastPayload ?? '-'}</code>
          </span>
        </div>
      </div>
    </div>
  );
}
