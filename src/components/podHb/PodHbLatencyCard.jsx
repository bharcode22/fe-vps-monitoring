import React from 'react';
import { Wifi, WifiOff, Zap } from 'lucide-react';

export default function PodHbLatencyCard({
  latencyStats,
  servers = [],
  selectedPodId,
  autoPingEnabled,
  isTogglingAutoPing,
  handleToggleAutoPing,
  isPingingNow,
  handlePingNow,
}) {
  return (
    <div className="p-4 rounded-2xl bg-gradient-to-r from-slate-900/90 via-slate-900/70 to-slate-950/80 border border-slate-800/90 shadow-xl backdrop-blur-md">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        {/* Left: Info & Target */}
        <div className="flex items-start sm:items-center gap-3">
          <div className={`p-2.5 rounded-xl border flex items-center justify-center shrink-0 ${latencyStats?.isOnline !== false && latencyStats?.currentPingMs !== null
            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 shadow-lg shadow-emerald-500/10'
            : 'bg-rose-500/10 border-rose-500/30 text-rose-400 shadow-lg shadow-rose-500/10'
            }`}>
            {latencyStats?.isOnline !== false && latencyStats?.currentPingMs !== null ? (
              <Wifi size={20} className="animate-pulse" />
            ) : (
              <WifiOff size={20} />
            )}
          </div>

          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-bold text-white tracking-wide">
                Latensi Jaringan Riil (Backend ➔ POD v3)
              </span>
              {latencyStats?.quality && (
                <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full border ${latencyStats.quality === 'EXCELLENT'
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                  : latencyStats.quality === 'GOOD'
                    ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
                    : latencyStats.quality === 'FAIR'
                      ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                      : latencyStats.quality === 'POOR'
                        ? 'bg-orange-500/20 text-orange-300 border-orange-500/40'
                        : 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                  }`}>
                  {latencyStats.quality}
                </span>
              )}
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-2 flex-wrap">
              <span className="font-mono text-slate-300">
                Target: {latencyStats?.host || servers.find(s => Number(s.id) === Number(selectedPodId))?.ip_address || '182.161.0.31'}:{latencyStats?.port || 1883}
              </span>
              <span className="text-slate-600">•</span>
              <span className="text-slate-400">Probing TCP Socket RTT presisi tinggi</span>
            </div>
          </div>
        </div>

        {/* Center: Live Metric Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 flex-1 max-w-xl">
          {/* 1. RTT Saat Ini */}
          <div className="px-3 py-2 rounded-xl bg-slate-950/70 border border-slate-800/80">
            <span className="block text-[10px] uppercase font-bold text-slate-400">RTT Saat Ini</span>
            <span className="text-sm font-black font-mono text-white">
              {latencyStats?.currentPingMs !== null && latencyStats?.currentPingMs !== undefined
                ? `${latencyStats.currentPingMs} ms`
                : '—'}
            </span>
          </div>

          {/* 2. Rata-rata */}
          <div className="px-3 py-2 rounded-xl bg-slate-950/70 border border-slate-800/80">
            <span className="block text-[10px] uppercase font-bold text-slate-400">Rata-rata</span>
            <span className="text-sm font-black font-mono text-cyan-400">
              {latencyStats?.avgPingMs !== null && latencyStats?.avgPingMs !== undefined
                ? `${latencyStats.avgPingMs} ms`
                : '—'}
            </span>
          </div>

          {/* 3. Jitter */}
          <div className="px-3 py-2 rounded-xl bg-slate-950/70 border border-slate-800/80">
            <span className="block text-[10px] uppercase font-bold text-slate-400">Jitter (Variasi)</span>
            <span className="text-sm font-black font-mono text-amber-400">
              {latencyStats?.jitterMs !== null && latencyStats?.jitterMs !== undefined
                ? `±${latencyStats.jitterMs} ms`
                : '—'}
            </span>
          </div>

          {/* 4. Packet Loss */}
          <div className="px-3 py-2 rounded-xl bg-slate-950/70 border border-slate-800/80">
            <span className="block text-[10px] uppercase font-bold text-slate-400">Loss Paket</span>
            <span className={`text-sm font-black font-mono ${(latencyStats?.packetLossPct || 0) > 0 ? 'text-rose-400' : 'text-emerald-400'
              }`}>
              {latencyStats?.packetLossPct !== null && latencyStats?.packetLossPct !== undefined
                ? `${latencyStats.packetLossPct}%`
                : '0%'}
            </span>
          </div>
        </div>

        {/* Right: Auto Ping Toggle & Manual Ping Button */}
        <div className="flex flex-col items-end shrink-0 gap-1.5">
          <div className="flex items-center gap-2">
            <button
              onClick={handleToggleAutoPing}
              disabled={isTogglingAutoPing}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border transition active:scale-95 cursor-pointer disabled:opacity-50 ${autoPingEnabled
                ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40 hover:bg-cyan-500/30 shadow-sm shadow-cyan-500/10'
                : 'bg-slate-800/90 text-slate-400 border-slate-700/60 hover:text-slate-200'
                }`}
              title={autoPingEnabled ? 'Auto Ping POD v3 Aktif (Tiap 5 Detik) - Klik untuk Matikan' : 'Auto Ping POD v3 Mati - Klik untuk Aktifkan'}
            >
              {autoPingEnabled ? (
                <Wifi size={13} className="text-cyan-400 animate-pulse" />
              ) : (
                <WifiOff size={13} className="text-slate-500" />
              )}
              <span>{autoPingEnabled ? 'Auto Ping ON' : 'Auto Ping OFF'}</span>
            </button>

            <button
              onClick={handlePingNow}
              disabled={isPingingNow || !selectedPodId}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white text-xs font-bold transition shadow-lg shadow-cyan-600/20 disabled:opacity-50 cursor-pointer active:scale-95"
              title="Kirim probe TCP sekarang untuk menguji respons RTT instan"
            >
              <Zap size={14} className={isPingingNow ? 'animate-bounce text-yellow-300' : 'text-cyan-200'} />
              <span>{isPingingNow ? 'Memeriksa...' : 'Ping Sekarang'}</span>
            </button>
          </div>
          <span className="text-[10px] text-slate-400">
            {autoPingEnabled ? 'Auto-probe tiap 5s via Socket.IO' : 'Auto-probe sedang dijeda (Mati)'}
          </span>
        </div>
      </div>
    </div>
  );
}
