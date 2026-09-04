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
    <div className="p-3.5 sm:p-4 bg-gradient-to-r from-rose-950/90 via-slate-900/95 to-rose-950/90 border border-rose-500/60 rounded-2xl backdrop-blur-md shadow-xl shadow-rose-500/15 flex flex-col lg:flex-row lg:items-center justify-between gap-3.5 ring-1 ring-rose-500/30 animate-in fade-in duration-200">
      {/* Left: Icon & Title Summary */}
      <div className="flex items-center gap-3 shrink-0">
        <div className="p-2.5 bg-rose-500/25 border border-rose-500/40 text-rose-400 rounded-xl shrink-0 animate-pulse">
          <ShieldAlert size={20} />
        </div>
        <div>
          <h3 className="text-xs sm:text-sm font-black text-rose-300 uppercase tracking-wider flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-rose-400 animate-ping" />
            PERINGATAN DINI: {issueList.length} MODUL MATI / TIMEOUT
          </h3>
          <p className="text-[11px] text-rose-200/80 font-medium hidden sm:block">
            Hardware tidak mengirim paket heartbeat dalam batas waktu yang ditentukan.
          </p>
        </div>
      </div>

      {/* Center: Horizontal Scrollable Badges Strip (Single Row, Zero Layout Shift) */}
      <div className="flex items-center gap-2 overflow-x-auto py-1 max-w-full lg:max-w-xl xl:max-w-2xl scrollbar-thin scrollbar-thumb-rose-500/30 scrollbar-track-transparent pr-1">
        {issueList.map(({ mod, reason }) => (
          <span
            key={mod.id}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-mono font-bold bg-rose-500/20 text-rose-200 border border-rose-500/50 shadow-sm shrink-0 whitespace-nowrap select-none"
          >
            <AlertCircle size={12} className="text-rose-400 shrink-0" />
            <span>{mod.name} (ID: {mod.id})</span>
            <span className="text-rose-300 font-normal tabular-nums">[{reason}]</span>
          </span>
        ))}
      </div>

      {/* Right: Action Button */}
      <div className="flex items-center gap-2 shrink-0 self-end lg:self-center">
        <button
          onClick={onPingIssues}
          className="px-3.5 py-2 bg-rose-600 hover:bg-rose-500 active:scale-95 text-white font-extrabold text-xs rounded-xl shadow-md transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
          title="Kirim status check ke seluruh modul bermasalah"
        >
          <RefreshCw size={13} />
          <span>Ping Semua Modul</span>
        </button>
      </div>
    </div>
  );
}
