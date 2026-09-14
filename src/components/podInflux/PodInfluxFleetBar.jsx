import React from 'react';
import { Server, RefreshCw, CheckCircle2, XCircle, AlertTriangle, Key } from 'lucide-react';

export default function PodInfluxFleetBar({
  pods = [],
  selectedPodId,
  setSelectedPodId,
  podsLoading = false,
  activePod,
  podHealth,
  podHealthLoading = false,
  handleRefreshToken,
  tokenRefreshing = false,
  setTokenRefreshResult,
  setOverrideTokenInput,
  setIsTokenModalOpen,
}) {
  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 shadow-xl backdrop-blur">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
            <Server className="w-4 h-4 text-emerald-400" />
            <span>Pilih Unit POD V3 Target</span>
          </div>
          <p className="text-xs text-slate-500">
            Setiap POD menjalankan InfluxDB port 8086 dengan token independen di{' '}
            <code className="text-emerald-400 font-mono">/home/pod/influx_token.json</code>
          </p>
        </div>

        {/* Quick Select Buttons */}
        <div
          className="flex items-center gap-2 overflow-x-auto py-1 scrollbar-none no-scrollbar"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          onWheel={(e) => {
            if (e.deltaY !== 0) {
              e.currentTarget.scrollLeft += e.deltaY;
            }
          }}
        >
          {podsLoading ? (
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <RefreshCw className="w-3.5 h-3.5 animate-spin text-emerald-400" />
              <span>Memindai armada POD V3...</span>
            </div>
          ) : pods.length === 0 ? (
            <span className="text-xs text-rose-400">Tidak ada server POD V3 terdaftar di database.</span>
          ) : (
            pods.map((pod) => {
              const isSelected = pod.id === Number(selectedPodId);
              return (
                <button
                  key={pod.id}
                  onClick={() => setSelectedPodId(pod.id)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition border ${
                    isSelected
                      ? 'bg-emerald-500/20 text-emerald-200 border-emerald-500/50 shadow-md shadow-emerald-500/10'
                      : 'bg-slate-950/70 hover:bg-slate-800/80 text-slate-300 border-slate-800'
                  }`}
                >
                  <span
                    className={`w-2 h-2 rounded-full ${
                      pod.isOnline ? 'bg-emerald-400 animate-pulse' : 'bg-rose-500'
                    }`}
                  />
                  <span className="font-semibold">{pod.name}</span>
                  <span className="text-[10px] text-slate-400">({pod.host})</span>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* Selected POD Details Card */}
      {activePod && (
        <div className="mt-4 pt-3 border-t border-slate-800/70 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
          <div className="flex items-center justify-between p-2.5 bg-slate-950/50 rounded-lg border border-slate-800/60">
            <span className="text-slate-400">Status Port 8086:</span>
            <div className="flex items-center gap-1.5 font-medium">
              {podHealth?.portOpen ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-400">Aktif ({podHealth?.version || 'v2.x'})</span>
                </>
              ) : (
                <>
                  <XCircle className="w-3.5 h-3.5 text-rose-400" />
                  <span className="text-rose-400">Port Tertutup / Offline</span>
                </>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between p-2.5 bg-slate-950/50 rounded-lg border border-slate-800/60">
            <span className="text-slate-400">Otorisasi Token:</span>
            <div className="flex items-center gap-1.5 font-medium">
              {podHealthLoading ? (
                <RefreshCw className="w-3 h-3 animate-spin text-emerald-400" />
              ) : podHealth?.authorized ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-400">Valid ({podHealth.buckets?.length || 0} Buckets)</span>
                </>
              ) : (
                <>
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                  <span className="text-amber-400">Perlu Verifikasi</span>
                </>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between p-2.5 bg-slate-950/50 rounded-lg border border-slate-800/60">
            <span className="text-slate-400">Sumber Token:</span>
            <span className="text-emerald-300 truncate max-w-[150px]" title={podHealth?.tokenSource || 'Auto'}>
              {podHealth?.tokenSource?.includes('influx_token.json')
                ? 'Auto via SSH'
                : podHealth?.tokenSource || 'Auto'}
            </span>
          </div>

          <div className="flex items-center justify-end gap-2">
            <button
              onClick={() => handleRefreshToken?.(null)}
              disabled={tokenRefreshing}
              className="flex items-center gap-1 px-2.5 py-1.5 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/40 rounded-lg text-xs font-medium transition disabled:opacity-50"
              title="Refresh token langsung dari file /home/pod/influx_token.json di POD via SSH"
            >
              <RefreshCw className={`w-3 h-3 ${tokenRefreshing ? 'animate-spin' : ''}`} />
              <span>{tokenRefreshing ? 'Membaca SSH...' : 'Refresh Token SSH'}</span>
            </button>
            <button
              onClick={() => {
                setTokenRefreshResult?.(null);
                setOverrideTokenInput?.('');
                setIsTokenModalOpen?.(true);
              }}
              className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg border border-slate-700 transition"
              title="Kelola / Override Token Manual"
            >
              <Key className="w-3.5 h-3.5 text-emerald-400" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
