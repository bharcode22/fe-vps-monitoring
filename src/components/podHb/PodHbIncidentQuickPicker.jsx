import React from 'react';
import { ShieldAlert, ChevronDown, RefreshCw, Clock } from 'lucide-react';

export default function PodHbIncidentQuickPicker({
  recentIncidents = [],
  isLoadingIncidents = false,
  isIncidentsDropdownOpen = false,
  setIsIncidentsDropdownOpen,
  loadRecentIncidents,
  handleSelectIncident,
  incidentsRef
}) {
  return (
    <div className="relative" ref={incidentsRef}>
      <button
        onClick={() => setIsIncidentsDropdownOpen(!isIncidentsDropdownOpen)}
        className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 font-semibold text-xs transition shadow-sm cursor-pointer"
      >
        <ShieldAlert size={15} className="text-rose-400" />
        <span>Pilih dari Alert Terbaru ({recentIncidents.length})</span>
        <ChevronDown size={14} className={`transition-transform duration-200 ${isIncidentsDropdownOpen ? 'rotate-180' : ''}`} />
      </button>

      {isIncidentsDropdownOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl bg-slate-900 border border-slate-700/80 shadow-2xl z-50 overflow-hidden backdrop-blur-xl animate-in fade-in zoom-in-95 duration-150">
          <div className="p-3 border-b border-slate-800 bg-slate-950/50 flex items-center justify-between">
            <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
              <ShieldAlert size={14} className="text-rose-400" />
              Riwayat Alert Dead / Frozen Terakhir
            </span>
            <button
              onClick={loadRecentIncidents}
              className="text-[11px] text-cyan-400 hover:text-cyan-300 flex items-center gap-1 cursor-pointer"
            >
              <RefreshCw size={11} className={isLoadingIncidents ? 'animate-spin' : ''} />
              Muat Ulang
            </button>
          </div>

          <div className="max-h-72 overflow-y-auto divide-y divide-slate-800/60 custom-scrollbar">
            {recentIncidents.length === 0 ? (
              <div className="p-4 text-center text-xs text-slate-500">
                Tidak ada rekaman insiden recent yang tersimpan.
              </div>
            ) : (
              recentIncidents.map((inc) => (
                <button
                  key={inc.id}
                  onClick={() => handleSelectIncident(inc)}
                  className="w-full text-left p-3 hover:bg-slate-800/70 transition flex items-start justify-between gap-2 group cursor-pointer"
                >
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${inc.alertType === 'DEAD'
                        ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                        : 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                        }`}>
                        {inc.alertType}
                      </span>
                      <span className="text-xs font-bold text-white group-hover:text-cyan-300 transition">
                        {inc.serverName}
                      </span>
                      <span className="text-[11px] text-slate-400">
                        Mod {inc.moduleId} ({inc.moduleName})
                      </span>
                      {/* Root Cause Chip */}
                      {inc.rootCauseCategory === 'HOST_NETWORK_OFFLINE' || inc.moduleId === 0 ? (
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                          Jaringan Offline
                        </span>
                      ) : (
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30">
                          Modul USB
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-slate-400 mt-1 flex items-center gap-2 flex-wrap">
                      <Clock size={11} className="text-slate-500" />
                      <span>{inc.timeFormatted}</span>
                      {inc.lastHb !== null && inc.lastHb !== undefined && (
                        <span className="text-cyan-400 font-mono">#{inc.lastHb}</span>
                      )}
                      {inc.pingMs !== null && inc.pingMs !== undefined && (
                        <span className="text-[10px] font-mono text-cyan-400 bg-slate-950/60 px-1 rounded border border-slate-800">
                          RTT {inc.pingMs}ms
                        </span>
                      )}
                    </div>
                    {inc.diagnosticHint && (
                      <div className="text-[10px] text-slate-400 italic mt-0.5 line-clamp-1">
                        {inc.diagnosticHint}
                      </div>
                    )}
                  </div>
                  {inc.downtimeSeconds > 0 && (
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-amber-400 whitespace-nowrap shrink-0">
                      {inc.downtimeSeconds}s
                    </span>
                  )}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
