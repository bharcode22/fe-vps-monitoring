import React from 'react';
import {
  HardDrive,
  Cloud,
  Server,
  Film,
  Volume2,
  Image as ImageIcon,
  AlertTriangle,
  Info
} from 'lucide-react';

export default function StorageMonitorView({
  storageData,
  isLoading,
  error,
  onGoToCatalog
}) {
  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-200">
      {/* Top Banner with Metrics Counters */}
      <div className="glass-card p-5 sm:p-6 rounded-3xl border border-cyan-500/30 bg-slate-900/60 shadow-xl">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 pb-4 mb-4 border-b border-slate-800">
          <div>
            <h3 className="text-base font-black text-white flex items-center gap-2">
              <HardDrive size={18} className="text-cyan-400" />
              <span>Status Storage Seluruh POD v3 (Limit 1 TB per Server)</span>
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Pantau kapasitas volume disk 1 TB dan pemakaian direktori <code className="text-purple-300 font-mono">/home/pod/videos</code>, <code className="text-sky-300 font-mono">/home/pod/sounds</code>, dan <code className="text-emerald-300 font-mono">/home/pod/images</code>.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onGoToCatalog}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-rose-500 to-pink-600 hover:from-rose-400 hover:to-pink-500 text-white text-xs font-bold flex items-center gap-2 shadow-lg shadow-rose-500/20 transition-all cursor-pointer"
            >
              <Cloud size={14} />
              <span>Buka Katalog Master &amp; Pengelolaan Konten</span>
            </button>
          </div>
        </div>

        {/* Metric Summary Counters */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-3 rounded-2xl bg-slate-950/80 border border-slate-800 flex flex-col justify-between">
            <span className="text-[11px] text-slate-400 font-semibold">Total Unit POD v3:</span>
            <span className="text-base font-mono font-black text-white mt-1">
              {storageData?.totalPods || storageData?.pods?.length || 0} POD
            </span>
          </div>

          <div className="p-3 rounded-2xl bg-emerald-950/30 border border-emerald-500/30 flex flex-col justify-between">
            <span className="text-[11px] text-emerald-400 font-semibold">Online / Terhubung:</span>
            <span className="text-base font-mono font-black text-emerald-300 mt-1">
              {storageData?.pods?.filter(p => p.status === 'online').length || 0} POD
            </span>
          </div>

          <div className="p-3 rounded-2xl bg-slate-950/80 border border-slate-800 flex flex-col justify-between">
            <span className="text-[11px] text-slate-400 font-semibold">Offline / Timeout:</span>
            <span className="text-base font-mono font-black text-slate-400 mt-1">
              {storageData?.pods?.filter(p => p.status === 'offline').length || 0} POD
            </span>
          </div>

          <div className="p-3 rounded-2xl bg-purple-950/30 border border-purple-500/30 flex flex-col justify-between">
            <span className="text-[11px] text-purple-300 font-semibold">Total Disk Terpakai:</span>
            <span className="text-base font-mono font-black text-purple-300 mt-1">
              {storageData?.pods ? (
                (storageData.pods.reduce((acc, p) => acc + (p.disk?.usedBytes || 0), 0) / (1024 * 1024 * 1024)).toFixed(1) + ' GB'
              ) : '0 GB'}
            </span>
          </div>
        </div>
      </div>

      {/* Storage Cards Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {[1, 2, 3, 4, 5, 6].map(n => (
            <div key={n} className="p-6 rounded-3xl bg-slate-900/40 border border-slate-800 animate-pulse h-64"></div>
          ))}
        </div>
      ) : error ? (
        <div className="p-5 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-3">
          <AlertTriangle size={18} />
          <span>{error}</span>
        </div>
      ) : !storageData?.pods || storageData.pods.length === 0 ? (
        <div className="p-8 rounded-3xl bg-slate-900/40 border border-slate-800 text-center text-slate-400 text-xs">
          Tidak ada unit POD v3 yang terdaftar di sistem.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {storageData.pods.map(pod => {
            const isOnline = pod.status === 'online';
            const percent = pod.disk?.percentUsed || 0;
            const isHigh = percent >= 85;
            const isMedium = percent >= 70 && percent < 85;

            return (
              <div
                key={pod.serverId}
                className={`glass-card p-5 sm:p-6 rounded-3xl border transition-all flex flex-col justify-between ${
                  !isOnline
                    ? 'border-slate-800/80 bg-slate-950/40 opacity-75'
                    : isHigh
                      ? 'border-rose-500/40 bg-gradient-to-b from-rose-950/20 via-slate-900/80 to-slate-950 shadow-rose-950/20'
                      : 'border-slate-800 hover:border-cyan-500/40 bg-slate-900/60 shadow-xl'
                }`}
              >
                <div>
                  {/* POD Header */}
                  <div className="flex items-center justify-between gap-2 pb-3 mb-3 border-b border-slate-800/80">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className={`p-2 rounded-xl border shrink-0 ${
                        isOnline ? 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30' : 'bg-slate-800 text-slate-500 border-slate-700'
                      }`}>
                        <Server size={16} />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <h4 className="font-extrabold text-sm text-white truncate">{pod.serverName}</h4>
                          {pod.code && (
                            <span className="text-[9.5px] font-mono font-bold px-1.5 py-0.2 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                              {pod.code}
                            </span>
                          )}
                        </div>
                      </div>

                    </div>

                    {isOnline ? (
                      <span className={`text-[10px] font-black px-2 py-0.5 rounded-full border shrink-0 ${
                        isHigh
                          ? 'bg-rose-500/20 text-rose-300 border-rose-500/40 animate-pulse'
                          : isMedium
                            ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                            : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                      }`}>
                        {percent}% Terpakai
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700 shrink-0">
                        Offline / Unreachable
                      </span>
                    )}
                  </div>

                  {/* 1 TB Disk Progress Bar */}
                  {isOnline ? (
                    <div className="mb-4">
                      <div className="flex items-center justify-between text-xs mb-1.5">
                        <span className="text-slate-400 font-semibold">Total Disk Volume:</span>
                        <span className="font-mono font-bold text-white">
                          {pod.disk?.usedFormatted} / {pod.disk?.totalFormatted}
                        </span>
                      </div>
                      <div className="w-full h-3 rounded-full bg-slate-950 border border-slate-800 overflow-hidden p-0.5">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            isHigh
                              ? 'bg-gradient-to-r from-rose-500 to-red-600'
                              : isMedium
                                ? 'bg-gradient-to-r from-amber-500 to-orange-500'
                                : 'bg-gradient-to-r from-cyan-400 to-blue-500'
                          }`}
                          style={{ width: `${Math.min(percent, 100)}%` }}
                        />
                      </div>
                      <div className="flex items-center justify-between text-[10px] text-slate-500 font-mono mt-1">
                        <span>Sisa Tersedia: <strong className="text-emerald-400 font-bold">{pod.disk?.freeFormatted}</strong></span>
                        <span>Limit 1.0 TB</span>
                      </div>
                    </div>
                  ) : (
                    <div className="p-3 rounded-2xl bg-slate-950/70 border border-slate-800/80 text-xs text-slate-400 mb-4 flex items-center gap-2">
                      <Info size={14} className="text-slate-500 shrink-0" />
                      <span className="text-[11px]">SSH timeout atau server sedang offline. Tidak dapat membaca disk.</span>
                    </div>
                  )}

                  {/* Folder Usage Breakdown */}
                  {isOnline && (
                    <div className="space-y-2 mb-4">
                      <div className="text-[11px] font-bold text-slate-300 uppercase tracking-wider">
                        Direktori Media:
                      </div>

                      <div className="p-2.5 rounded-xl bg-slate-950/70 border border-slate-800/80 flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <Film size={14} className="text-purple-400 shrink-0" />
                          <span className="text-slate-300 font-mono">/videos</span>
                          <span className="text-[10px] text-slate-500">({pod.folders?.videos?.count || 0} file)</span>
                        </div>
                        <span className="font-mono font-extrabold text-purple-300">
                          {pod.folders?.videos?.formatted || '0 B'}
                        </span>
                      </div>

                      <div className="p-2.5 rounded-xl bg-slate-950/70 border border-slate-800/80 flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <Volume2 size={14} className="text-sky-400 shrink-0" />
                          <span className="text-slate-300 font-mono">/sounds</span>
                          <span className="text-[10px] text-slate-500">({pod.folders?.sounds?.count || 0} file)</span>
                        </div>
                        <span className="font-mono font-extrabold text-sky-300">
                          {pod.folders?.sounds?.formatted || '0 B'}
                        </span>
                      </div>

                      <div className="p-2.5 rounded-xl bg-slate-950/70 border border-slate-800/80 flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <ImageIcon size={14} className="text-emerald-400 shrink-0" />
                          <span className="text-slate-300 font-mono">/images</span>
                          <span className="text-[10px] text-slate-500">({pod.folders?.images?.count || 0} file)</span>
                        </div>
                        <span className="font-mono font-extrabold text-emerald-300">
                          {pod.folders?.images?.formatted || '0 B'}
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between gap-2">
                  <span className="text-[10.5px] text-slate-400 font-mono">
                    {isOnline ? (
                      <>Total Media: <strong className="text-white">{pod.totalMediaFormatted}</strong></>
                    ) : (
                      <span className="text-slate-500">Status: Tidak Terhubung</span>
                    )}
                  </span>

                  {isOnline && (
                    <button
                      onClick={onGoToCatalog}
                      className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-rose-300 hover:text-white text-xs font-bold flex items-center gap-1.5 border border-slate-700 transition-colors cursor-pointer"
                    >
                      <Cloud size={12} />
                      <span>Kelola Konten</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
