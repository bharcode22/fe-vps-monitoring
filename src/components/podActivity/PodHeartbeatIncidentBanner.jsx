import React from 'react';
import { ShieldAlert, AlertCircle, RefreshCw } from 'lucide-react';

export default function PodHeartbeatIncidentBanner({ analysis, onPingIssues, isPodOffline = false }) {
  if (isPodOffline) return null;
  if (!analysis?.hasCriticalIssue) return null;

  const rawList = [...(analysis.deadList || []), ...(analysis.frozenList || [])];
  // Modul dari pod offline atau yang belum pernah mengirim data sama sekali tidak ditampilkan di banner insiden
  const issueList = rawList.filter((item) => {
    if (item.isPodOffline) return false;
    if (item.reason === 'Belum ada data') return false;
    return true;
  });

  if (issueList.length === 0) return null;

  return (
    <div className="p-4 sm:p-5 2xl:p-5 min-[1920px]:p-6 bg-gradient-to-r from-rose-950/90 via-slate-900/95 to-rose-950/90 border border-rose-500/60 rounded-2xl 2xl:rounded-3xl backdrop-blur-md shadow-xl shadow-rose-500/15 flex flex-col gap-3.5 ring-1 ring-rose-500/30 animate-in fade-in duration-200 w-full">
      {/* Top Row: Title Summary and Action Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-rose-500/20 pb-3">
        <div className="flex items-center gap-3 shrink-0">
          <div className="p-2.5 bg-rose-500/25 border border-rose-500/40 text-rose-400 rounded-xl shrink-0 animate-pulse">
            <ShieldAlert className="w-5 h-5 2xl:w-6 2xl:h-6" />
          </div>
          <div>
            <h3 className="text-xs sm:text-sm md:text-base 2xl:text-lg font-black text-rose-300 uppercase tracking-wider flex items-center gap-2">
              <span className="w-2 h-2 2xl:w-2.5 2xl:h-2.5 rounded-full bg-rose-400 animate-ping shrink-0" />
              PERINGATAN DINI: {issueList.length} MODUL MATI / TIMEOUT
            </h3>
            <p className="text-[11px] sm:text-xs 2xl:text-sm text-rose-200/80 font-medium hidden sm:block mt-0.5">
              Hardware tidak mengirim paket heartbeat dalam batas waktu yang ditentukan.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
          <button
            onClick={onPingIssues}
            className="px-4 py-2 bg-rose-600 hover:bg-rose-500 active:scale-95 text-white font-extrabold text-xs sm:text-sm 2xl:text-base rounded-xl shadow-lg transition flex items-center gap-2 cursor-pointer whitespace-nowrap"
            title="Kirim status check ke seluruh modul bermasalah"
          >
            <RefreshCw className="w-3.5 h-3.5 2xl:w-4 2xl:h-4" />
            <span>Ping Semua Modul</span>
          </button>
        </div>
      </div>

      {/* Bottom Row: Full-width Horizontal Scroll Ribbon for Module Badges */}
      <div className="w-full flex items-center gap-2.5 overflow-x-auto flex-nowrap py-1 scrollbar-thin scrollbar-thumb-rose-500/30 scrollbar-track-transparent">
        {issueList.map(({ mod, reason }) => (
          <span
            key={mod.id}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs 2xl:text-sm font-mono font-bold bg-rose-500/20 text-rose-200 border border-rose-500/50 shadow-sm shrink-0 whitespace-nowrap select-none"
          >
            <AlertCircle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
            <span>{mod.name} (ID: {mod.id})</span>
            <span className="text-rose-300 font-normal tabular-nums">[{reason}]</span>
          </span>
        ))}
      </div>
    </div>
  );
}
