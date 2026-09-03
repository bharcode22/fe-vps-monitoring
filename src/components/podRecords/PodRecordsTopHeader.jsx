import React from 'react';
import {
  ArrowLeft,
  FileCode,
  Play,
  Pause,
  RefreshCw,
  Download
} from 'lucide-react';

export default function PodRecordsTopHeader({
  onBack,
  serverDisplayName,
  isLivePolling,
  onToggleLivePolling,
  onRefresh,
  isLoading,
  isRefreshing,
  onTriggerDownload
}) {
  return (
    <div className="shrink-0 z-30 bg-slate-900/95 backdrop-blur-xl border-b border-slate-800 px-4 sm:px-6 py-3 shadow-md flex items-center justify-between gap-4 flex-wrap">
      <div className="flex items-center gap-3">
        {onBack && (
          <button
            onClick={onBack}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition-all cursor-pointer flex items-center gap-1.5 text-xs font-semibold"
            title="Kembali ke Dashboard"
          >
            <ArrowLeft size={16} />
            <span className="hidden sm:inline">Kembali</span>
          </button>
        )}
        <div className="p-2.5 rounded-2xl bg-gradient-to-br from-cyan-500/20 to-blue-500/20 text-cyan-400 border border-cyan-500/30 shadow-lg shadow-cyan-500/10">
          <FileCode size={22} />
        </div>
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-base sm:text-lg font-black text-white tracking-wide">
              Pusat Rekaman Heartbeat &amp; Log JSON
            </h1>
            <span className="px-2.5 py-0.5 rounded-full bg-cyan-500/15 border border-cyan-500/30 text-cyan-300 font-mono text-[11px] font-bold">
              {serverDisplayName}
            </span>
          </div>
          <p className="text-[11px] text-slate-400 mt-0.5">
            Penjelajah berkas fisik harian per server POD, visualisasi rekaman detak, inspeksi JSON mentah, dan ekspor data.
          </p>
        </div>
      </div>

      {/* Global Toolbar Actions */}
      <div className="flex items-center gap-2">
        {/* Live Auto-Poll Toggle */}
        <button
          onClick={onToggleLivePolling}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer flex items-center gap-1.5 ${
            isLivePolling
              ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 shadow-lg shadow-emerald-500/15'
              : 'bg-slate-800 text-slate-400 hover:text-white border-slate-700 hover:bg-slate-700'
          }`}
          title={isLivePolling ? 'Hentikan Live Auto-Refresh' : 'Aktifkan Live Auto-Refresh (setiap 4 detik)'}
        >
          {isLivePolling ? <Pause size={13} /> : <Play size={13} />}
          <span>Live Sync</span>
          {isLivePolling && (
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping ml-0.5" />
          )}
        </button>

        {/* Refresh Button */}
        <button
          onClick={onRefresh}
          disabled={isLoading || isRefreshing}
          className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition-all cursor-pointer disabled:opacity-50"
          title="Muat Ulang Data"
        >
          <RefreshCw size={15} className={isRefreshing ? 'animate-spin text-cyan-400' : ''} />
        </button>

        {/* Download JSON Button */}
        <button
          onClick={() => onTriggerDownload('json')}
          className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold text-xs shadow-lg shadow-cyan-600/20 transition-all flex items-center gap-1.5 cursor-pointer"
          title="Unduh array JSON resmi langsung dari server"
        >
          <Download size={14} />
          <span>Unduh .json</span>
        </button>

        {/* Download JSONL Button */}
        <button
          onClick={() => onTriggerDownload('jsonl')}
          className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer hidden md:flex"
          title="Unduh stream baris per baris (.jsonl mentah)"
        >
          <Download size={13} className="text-slate-400" />
          <span>.jsonl</span>
        </button>
      </div>
    </div>
  );
}
