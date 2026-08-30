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
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
      {/* Card 1: Total Armada POD V3 */}
      <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between shadow-lg">
        <div className="flex items-center justify-between">
          <span className="text-xs text-slate-400 font-semibold flex items-center gap-1.5">
            <Server size={15} className="text-cyan-400" /> Armada POD V3
          </span>
          <span className="text-[10px] font-mono px-2 py-0.5 bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 rounded-md font-bold">
            Terdaftar
          </span>
        </div>
        <div className="my-2.5">
          <div className="text-2xl sm:text-3xl font-mono font-black text-white">
            {isLoading ? '...' : totalPods} <span className="text-xs font-sans text-slate-400 font-normal">Unit</span>
          </div>
          <span className="text-[11px] text-slate-400">Seluruh unit POD versi 3</span>
        </div>
        <div className="text-[10px] text-slate-500 font-mono">
          {brokersConnected} dari {totalPods} Broker MQTT Online
        </div>
      </div>

      {/* Card 2: OCCUPIED (POB = 1) */}
      <div className="bg-slate-900/70 border border-emerald-500/30 rounded-2xl p-4 flex flex-col justify-between shadow-lg relative overflow-hidden">
        <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />
        <div className="flex items-center justify-between">
          <span className="text-xs text-emerald-400 font-semibold flex items-center gap-1.5">
            <UserCheck size={15} className="text-emerald-400" /> OCCUPIED (In-Use)
          </span>
          <span className="inline-flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 rounded-full font-bold">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> POB = 1
          </span>
        </div>
        <div className="my-2.5">
          <div className="text-2xl sm:text-3xl font-mono font-black text-emerald-300">
            {isLoading ? '...' : occupiedCount} <span className="text-xs font-sans text-slate-400 font-normal">Unit</span>
          </div>
          <span className="text-[11px] text-emerald-400/80 font-medium">Sesi pengguna aktif terdeteksi</span>
        </div>
        <div className="text-[10px] text-slate-500">
          Sensor mod_chair mendeteksi beban (Active)
        </div>
      </div>

      {/* Card 3: AVAILABLE / STANDBY (POB = 0) */}
      <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between shadow-lg">
        <div className="flex items-center justify-between">
          <span className="text-xs text-slate-300 font-semibold flex items-center gap-1.5">
            <UserX size={15} className="text-slate-400" /> AVAILABLE (Standby)
          </span>
          <span className="text-[10px] font-mono px-2 py-0.5 bg-slate-800 text-slate-300 border border-slate-700 rounded-full font-bold">
            POB = 0
          </span>
        </div>
        <div className="my-2.5">
          <div className="text-2xl sm:text-3xl font-mono font-black text-slate-200">
            {isLoading ? '...' : vacantCount} <span className="text-xs font-sans text-slate-400 font-normal">Unit</span>
          </div>
          <span className="text-[11px] text-slate-400">Unit siaga / siap digunakan</span>
        </div>
        <div className="text-[10px] text-slate-500">
          Sensor mod_chair siaga (Standby / Idle)
        </div>
      </div>

      {/* Card 4: Broker MQTT Connectivity */}
      <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between shadow-lg">
        <div className="flex items-center justify-between">
          <span className="text-xs text-slate-400 font-semibold flex items-center gap-1.5">
            <Radio size={15} className="text-indigo-400" /> Broker MQTT
          </span>
          <span className="text-[10px] font-mono px-2 py-0.5 bg-indigo-500/15 text-indigo-300 border border-indigo-500/30 rounded-md font-bold">
            Port 1883
          </span>
        </div>
        <div className="my-2.5">
          <div className="text-2xl sm:text-3xl font-mono font-black text-indigo-300">
            {isLoading ? '...' : `${brokersConnected}/${totalPods}`}
          </div>
          <span className="text-[11px] text-slate-400">Broker POD V3 terhubung</span>
        </div>
        <div className="text-[10px] text-slate-500 font-mono">
          Auto-subscribe wildcard pob_state
        </div>
      </div>
    </div>
  );
}
