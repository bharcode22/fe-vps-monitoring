import React from 'react';
import { Server, Cpu, Clock, Layers } from 'lucide-react';

export default function PodHbFilterToolbar({
  servers = [],
  selectedPodId,
  setSelectedPodId,
  modules = [],
  selectedModuleId,
  setSelectedModuleId,
  selectedDate,
  setSelectedDate,
  targetTimeStr,
  setTargetTimeStr,
  handleSetTimeToNow,
  windowMinutes,
  setWindowMinutes,
  startTransition = (cb) => cb(),
}) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 p-4 rounded-2xl bg-slate-900/70 border border-slate-800/80 shadow-lg backdrop-blur-md">
      {/* 1. Pod Selector */}
      <div>
        <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
          <Server size={13} className="text-cyan-400" />
          Unit Pod
        </label>
        <select
          value={selectedPodId || ''}
          onChange={(e) => {
            const val = Number(e.target.value);
            startTransition(() => setSelectedPodId(val));
          }}
          className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs font-semibold focus:outline-none focus:border-cyan-500 cursor-pointer"
        >
          {servers.length === 0 ? (
            <option value="">Memuat unit POD v3...</option>
          ) : (
            servers.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name || `POD ${s.id}`} (ID: {s.id})
              </option>
            ))
          )}
        </select>
      </div>

      {/* 2. Module Selector */}
      <div>
        <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
          <Cpu size={13} className="text-emerald-400" />
          Modul Hardware
        </label>
        <select
          value={selectedModuleId}
          onChange={(e) => {
            const val = Number(e.target.value);
            startTransition(() => setSelectedModuleId(val));
          }}
          className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs font-semibold focus:outline-none focus:border-emerald-500 cursor-pointer"
        >
          {modules.map((m) => (
            <option key={m.id} value={m.id}>
              ID {m.id} — {m.name} {m.defaultPort ? `(${m.defaultPort})` : ''}
            </option>
          ))}
        </select>
      </div>

      {/* 3. Date Input */}
      <div>
        <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
          <Clock size={13} className="text-blue-400" />
          Tanggal Insiden (WITA)
        </label>
        <input
          type="date"
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
          className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs font-mono focus:outline-none focus:border-blue-500 cursor-pointer [color-scheme:dark]"
        />
      </div>

      {/* 4. Target Time Input */}
      <div>
        <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5 flex items-center justify-between">
          <span className="flex items-center gap-1.5">
            <Clock size={13} className="text-amber-400" />
            Waktu Insiden (WITA)
          </span>
          <button
            type="button"
            onClick={handleSetTimeToNow}
            className="text-[10px] text-cyan-400 hover:text-cyan-300 font-semibold cursor-pointer"
          >
            Sekarang (WITA)
          </button>
        </label>
        <input
          type="text"
          value={targetTimeStr}
          onChange={(e) => setTargetTimeStr(e.target.value)}
          placeholder="HH:mm:ss WITA (contoh: 19:01:05)"
          className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs font-mono focus:outline-none focus:border-amber-500"
        />
      </div>

      {/* 5. Window Minutes */}
      <div>
        <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
          <Layers size={13} className="text-purple-400" />
          Jendela Analisa
        </label>
        <div className="grid grid-cols-4 gap-1">
          {[2, 5, 15, 30].map((win) => (
            <button
              key={win}
              type="button"
              onClick={() => setWindowMinutes(win)}
              className={`py-2 text-xs font-bold rounded-xl border transition cursor-pointer ${windowMinutes === win
                ? 'bg-purple-600 border-purple-500 text-white shadow-md shadow-purple-600/30'
                : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white hover:bg-slate-900'
                }`}
            >
              ±{win}m
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
