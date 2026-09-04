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
    <div className="p-4 sm:p-5 2xl:p-6 min-[1920px]:p-7 bg-gradient-to-r from-rose-950/90 via-slate-900/95 to-rose-950/90 border border-rose-500/60 rounded-2xl 2xl:rounded-3xl backdrop-blur-md shadow-xl shadow-rose-500/15 flex flex-col lg:flex-row lg:items-center justify-between gap-4 2xl:gap-6 ring-1 ring-rose-500/30 animate-in fade-in duration-200 w-full">
      {/* Left: Icon & Title Summary */}
      <div className="flex items-center gap-3.5 2xl:gap-4 shrink-0">
        <div className="p-2.5 2xl:p-3.5 min-[1920px]:p-4 bg-rose-500/25 border border-rose-500/40 text-rose-400 rounded-xl 2xl:rounded-2xl shrink-0 animate-pulse">
          <ShieldAlert className="w-5 h-5 2xl:w-7 2xl:h-7 min-[1920px]:w-8 min-[1920px]:h-8" />
        </div>
        <div>
          <h3 className="text-xs sm:text-sm md:text-base 2xl:text-lg min-[1920px]:text-xl font-black text-rose-300 uppercase tracking-wider flex items-center gap-2 2xl:gap-3">
            <span className="w-2 h-2 2xl:w-3 2xl:h-3 min-[1920px]:w-3.5 min-[1920px]:h-3.5 rounded-full bg-rose-400 animate-ping shrink-0" />
            PERINGATAN DINI: {issueList.length} MODUL MATI / TIMEOUT
          </h3>
          <p className="text-[11px] sm:text-xs md:text-sm 2xl:text-base text-rose-200/80 font-medium hidden sm:block mt-0.5 2xl:mt-1">
            Hardware tidak mengirim paket heartbeat dalam batas waktu yang ditentukan.
          </p>
        </div>
      </div>

      {/* Center: Flexible Badges Strip (Expansive & unconstrained on Large/TV screens) */}
      <div className="flex-1 min-w-0 flex items-center gap-2 2xl:gap-3 overflow-x-auto 2xl:flex-wrap py-1.5 scrollbar-thin scrollbar-thumb-rose-500/30 scrollbar-track-transparent pr-1">
        {issueList.map(({ mod, reason }) => (
          <span
            key={mod.id}
            className="inline-flex items-center gap-1.5 2xl:gap-2 px-3 py-1.5 2xl:px-4 2xl:py-2.5 rounded-lg 2xl:rounded-xl text-xs 2xl:text-sm min-[1920px]:text-base font-mono font-bold bg-rose-500/20 text-rose-200 border border-rose-500/50 shadow-sm shrink-0 whitespace-nowrap select-none"
          >
            <AlertCircle className="w-3.5 h-3.5 2xl:w-4 2xl:h-4 text-rose-400 shrink-0" />
            <span>{mod.name} (ID: {mod.id})</span>
            <span className="text-rose-300 font-normal tabular-nums">[{reason}]</span>
          </span>
        ))}
      </div>

      {/* Right: Action Button */}
      <div className="flex items-center gap-2 shrink-0 self-end lg:self-center">
        <button
          onClick={onPingIssues}
          className="px-4 py-2.5 2xl:px-6 2xl:py-3.5 bg-rose-600 hover:bg-rose-500 active:scale-95 text-white font-extrabold text-xs sm:text-sm 2xl:text-base rounded-xl 2xl:rounded-2xl shadow-lg transition flex items-center gap-2 2xl:gap-2.5 cursor-pointer whitespace-nowrap"
          title="Kirim status check ke seluruh modul bermasalah"
        >
          <RefreshCw className="w-3.5 h-3.5 2xl:w-5 2xl:h-5" />
          <span>Ping Semua Modul</span>
        </button>
      </div>
    </div>
  );
}
