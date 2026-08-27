import React, { useState } from 'react';
import {
  Server,
  AlertTriangle,
  Zap,
  Loader2,
  RefreshCw,
  UploadCloud,
  DownloadCloud
} from 'lucide-react';

export default function PodDataHeader({
  pod,
  masterInfo,
  isLoading = false,
  loadingPodId = null,
  onInspectPod,
  onSyncPod,
  onSyncPodToMaster
}) {
  const [isPullingToMaster, setIsPullingToMaster] = useState(false);

  if (!pod) {
    return (
      <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-10 text-center text-slate-500 font-sans text-xs flex flex-col items-center gap-2">
        <Server size={28} className="text-slate-600" />
        <span>Pilih salah satu unit POD v3 di atas untuk melihat data yang ada di database POD tersebut.</span>
      </div>
    );
  }

  const hasBeenCompared = Boolean(
    pod && pod.tableExists !== null && pod.rowCount !== null && pod.status !== 'NOT_LOADED'
  );

  if (isLoading || (loadingPodId && String(loadingPodId) === String(pod.id))) {
    return (
      <div className="bg-slate-900/60 border border-purple-500/30 rounded-3xl p-12 text-center text-slate-400 font-sans text-xs flex flex-col items-center justify-center gap-3 animate-in fade-in duration-200">
        <Loader2 size={32} className="animate-spin text-purple-400" />
        <span className="text-sm font-bold text-white">Memuat & Membandingkan Data {pod.name}...</span>
        <span className="text-slate-500 text-[11px]">
          Menghubungkan ke server {pod.host || ''} dan membandingkan baris data dengan Master Database.
        </span>
      </div>
    );
  }

  if (!hasBeenCompared) {
    return (
      <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-12 text-center text-slate-400 font-sans text-xs flex flex-col items-center justify-center gap-3.5 animate-in fade-in duration-200">
        <div className="p-3.5 bg-slate-800/80 rounded-2xl text-purple-400 border border-slate-700">
          <Server size={28} />
        </div>
        <div>
          <h4 className="text-sm font-bold text-white">Data {pod.name} Belum Dimuat</h4>
          <p className="text-slate-400 text-xs mt-1 max-w-md">
            Data Master telah siap. Klik tombol di bawah untuk memeriksa isi database {pod.name} dan membandingkannya secara langsung.
          </p>
        </div>
        <button
          onClick={() => onInspectPod?.(pod.id)}
          className="mt-1 px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold rounded-xl text-xs flex items-center gap-2 cursor-pointer shadow-lg shadow-purple-500/25 transition-all hover:scale-105"
        >
          <Zap size={14} />
          <span>Buka & Bandingkan Data {pod.name}</span>
        </button>
      </div>
    );
  }

  if (!pod.isOnline) {
    return (
      <div className="bg-red-500/10 border border-red-500/30 rounded-3xl p-8 text-center text-red-300 text-xs flex flex-col items-center gap-3">
        <AlertTriangle size={32} className="text-red-400" />
        <div>
          <h4 className="font-bold text-sm text-white">Unit {pod.name} Sedang OFFLINE</h4>
          <p className="text-slate-400 mt-1">
            Database PostgreSQL pada server ini tidak dapat dihubungi. Pastikan server POD menyala dan terhubung ke jaringan.
          </p>
        </div>
        <button
          onClick={() => onInspectPod?.(pod.id)}
          className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors"
        >
          <RefreshCw size={13} />
          <span>Coba Hubungkan Kembali</span>
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
      <div>
        <div className="flex items-center gap-2">
          <span className="p-2 rounded-xl bg-purple-500/15 border border-purple-500/30 text-purple-400">
            <Server size={16} />
          </span>
          <div>
            <h3 className="text-base font-black text-white flex items-center gap-2">
              <span>
                Data di Unit POD: <strong className="text-purple-400 font-mono">{pod.name}</strong>
              </span>
              <span
                className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${
                  pod.status === 'SYNCED'
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                    : 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                }`}
              >
                {pod.status === 'SYNCED' ? '100% SYNCED' : 'DRIFT / KURANG DATA'}
              </span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Jumlah Data: <strong className="text-white font-mono">{pod.rowCount} baris</strong> &bull; Master:{' '}
              <strong className="text-cyan-300 font-mono">{masterInfo?.rowCount || 0} baris</strong>
            </p>
          </div>
        </div>
      </div>

      {/* Action Buttons: Push Master ➔ POD & Pull POD ➔ Master */}
      <div className="flex items-center gap-2 flex-wrap">
        {/* Pull POD ➔ Master Button */}
        {onSyncPodToMaster && (
          <button
            disabled={isPullingToMaster}
            onClick={async () => {
              setIsPullingToMaster(true);
              try {
                await onSyncPodToMaster(pod);
              } finally {
                setIsPullingToMaster(false);
              }
            }}
            className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-lg shadow-purple-500/20 transition-all cursor-pointer hover:scale-105 disabled:opacity-50"
            title={`Tarik seluruh baris dari ${pod.name} dan simpan/gabungkan ke Master Database`}
          >
            {isPullingToMaster ? (
              <>
                <Loader2 size={14} className="animate-spin text-white" />
                <span>Menarik Data Pod {pod.name} ➔ Master...</span>
              </>
            ) : (
              <>
                <UploadCloud size={14} />
                <span>{pod.name} ➔ Master</span>
              </>
            )}
          </button>
        )}

        {/* Push Master ➔ POD Button */}
        {onSyncPod && (
          <button
            onClick={() => onSyncPod(pod.id)}
            className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-lg shadow-cyan-500/20 transition-all cursor-pointer hover:scale-105"
            title={`Kirim seluruh baris dari Master Database ke ${pod.name}`}
          >
            <DownloadCloud size={14} />
            <span>Master ➔ {pod.name}</span>
          </button>
        )}

        {/* Re-compare / Refresh comparison for this POD */}
        {onInspectPod && (
          <button
            disabled={isLoading || (loadingPodId && String(loadingPodId) === String(pod.id))}
            onClick={() => onInspectPod(pod.id)}
            className="p-2 bg-slate-800 hover:bg-slate-700 text-purple-300 rounded-xl border border-slate-700 cursor-pointer transition-colors disabled:opacity-50"
            title={`Bandingkan ulang data ${pod.name} dengan Master`}
          >
            <RefreshCw size={14} className={loadingPodId === pod.id ? 'animate-spin' : ''} />
          </button>
        )}
      </div>
    </div>
  );
}
