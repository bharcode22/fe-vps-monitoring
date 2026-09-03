import React from 'react';
import { Server, UserCheck, UserX, Radio } from 'lucide-react';

export default function PodActivityKpiCards({
  isLoading,
  totalPods = 0,
  occupiedCount = 0,
  vacantCount = 0,
  brokersConnected = 0
}) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* Card 1: Total Armada POD V3 */}
      <div className="bg-slate-900/80 backdrop-blur-md border border-slate-800/90 hover:border-slate-700 rounded-2xl p-5 flex flex-col justify-between shadow-xl relative overflow-hidden group transition-all">
        <div className="flex items-center justify-between">
          <span className="text-xs text-slate-400 font-bold flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
              <Server size={14} />
            </div>
            Armada POD V3
          </span>
          <span className="text-[10px] font-mono px-2 py-0.5 bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 rounded-full font-bold">
            Terdaftar
          </span>
        </div>
        <div className="my-3">
          <div className="text-3xl font-mono font-black text-white tracking-tight">
            {isLoading ? '...' : totalPods} <span className="text-xs font-sans text-slate-400 font-semibold">Unit</span>
          </div>
          <span className="text-[11px] text-slate-400 font-medium">Seluruh armada terintegrasi</span>
        </div>
        <div className="text-[10px] text-slate-500 font-mono flex items-center gap-1.5 pt-2 border-t border-slate-800/60">
          <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
          {brokersConnected} dari {totalPods} Broker Online
        </div>
      </div>

      {/* Card 2: OCCUPIED (POB = 1) */}
      <div className="bg-slate-900/80 backdrop-blur-md border border-emerald-500/30 hover:border-emerald-500/50 rounded-2xl p-5 flex flex-col justify-between shadow-xl relative overflow-hidden group transition-all">
        <div className="absolute top-0 right-0 w-28 h-28 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />
        <div className="flex items-center justify-between z-10">
          <span className="text-xs text-emerald-400 font-bold flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-emerald-500/20 border border-emerald-500/30 text-emerald-400">
              <UserCheck size={14} />
            </div>
            Occupied (In-Use)
          </span>
          <span className="inline-flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 rounded-full font-bold">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> POB = 1
          </span>
        </div>
        <div className="my-3 z-10">
          <div className="text-3xl font-mono font-black text-emerald-300 tracking-tight">
            {isLoading ? '...' : occupiedCount} <span className="text-xs font-sans text-slate-400 font-semibold">Unit</span>
          </div>
          <span className="text-[11px] text-emerald-400/80 font-medium">Sesi pengguna aktif terdeteksi</span>
        </div>
        <div className="text-[10px] text-slate-500 z-10 flex items-center gap-1.5 pt-2 border-t border-slate-800/60 font-mono">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
          Sensor mod_chair aktif
        </div>
      </div>

      {/* Card 3: AVAILABLE / STANDBY (POB = 0) */}
      <div className="bg-slate-900/80 backdrop-blur-md border border-slate-800/90 hover:border-slate-700 rounded-2xl p-5 flex flex-col justify-between shadow-xl relative overflow-hidden group transition-all">
        <div className="flex items-center justify-between">
          <span className="text-xs text-slate-300 font-bold flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-400">
              <UserX size={14} />
            </div>
            Available (Standby)
          </span>
          <span className="text-[10px] font-mono px-2 py-0.5 bg-slate-800 text-slate-300 border border-slate-700 rounded-full font-bold">
            POB = 0
          </span>
        </div>
        <div className="my-3">
          <div className="text-3xl font-mono font-black text-slate-200 tracking-tight">
            {isLoading ? '...' : vacantCount} <span className="text-xs font-sans text-slate-400 font-semibold">Unit</span>
          </div>
          <span className="text-[11px] text-slate-400 font-medium">Unit siaga / siap digunakan</span>
        </div>
        <div className="text-[10px] text-slate-500 font-mono flex items-center gap-1.5 pt-2 border-t border-slate-800/60">
          <span className="w-1.5 h-1.5 rounded-full bg-slate-500" />
          Sensor mod_chair siaga
        </div>
      </div>

      {/* Card 4: Broker MQTT Connectivity */}
      <div className="bg-slate-900/80 backdrop-blur-md border border-slate-800/90 hover:border-slate-700 rounded-2xl p-5 flex flex-col justify-between shadow-xl relative overflow-hidden group transition-all">
        <div className="flex items-center justify-between">
          <span className="text-xs text-slate-400 font-bold flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-indigo-500/15 border border-indigo-500/30 text-indigo-400">
              <Radio size={14} />
            </div>
            Broker MQTT
          </span>
          <span className="text-[10px] font-mono px-2 py-0.5 bg-indigo-500/15 text-indigo-300 border border-indigo-500/30 rounded-full font-bold">
            Port 1883
          </span>
        </div>
        <div className="my-3">
          <div className="text-3xl font-mono font-black text-indigo-300 tracking-tight">
            {isLoading ? '...' : `${brokersConnected}/${totalPods}`}
          </div>
          <span className="text-[11px] text-slate-400 font-medium">Broker POD V3 terhubung</span>
        </div>
        <div className="text-[10px] text-slate-500 font-mono flex items-center gap-1.5 pt-2 border-t border-slate-800/60">
          <span className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
          Auto-subscribe wildcard topics
        </div>
      </div>
    </div>
  );
}
