import React from 'react';
import { Key, RefreshCw, CheckCircle2, XCircle } from 'lucide-react';

export default function PodInfluxTokenModal({
  isOpen,
  onClose,
  activePod,
  podHealth,
  overrideTokenInput,
  onOverrideTokenInputChange,
  tokenRefreshing,
  tokenRefreshResult,
  onRefreshToken
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-lg">
              <Key className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-100 text-sm">
                Kelola Token Influx: {activePod?.name}
              </h3>
              <p className="text-xs text-slate-400">Host: {activePod?.host}:8086</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white"
          >
            ✕
          </button>
        </div>

        <div className="space-y-3 text-xs">
          <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Lokasi Berkas di POD:</span>
              <code className="text-emerald-400 font-mono">/home/pod/influx_token.json</code>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Status Token Saat Ini:</span>
              <span className="text-slate-200 font-medium">{podHealth?.tokenSource || 'Auto'}</span>
            </div>
          </div>

          {/* SSH Auto-Refresh Action */}
          <div className="p-3 bg-emerald-950/30 border border-emerald-800/40 rounded-lg space-y-2">
            <span className="font-semibold text-emerald-300 block">
              1. Muat Ulang Otomatis via SSH:
            </span>
            <p className="text-[11px] text-slate-400">
              Sistem akan menjalankan perintah <code className="text-emerald-300 font-mono">cat /home/pod/influx_token.json</code> melalui koneksi SSH langsung ke unit POD.
            </p>
            <button
              type="button"
              onClick={() => onRefreshToken(null)}
              disabled={tokenRefreshing}
              className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-medium flex items-center justify-center gap-2 transition disabled:opacity-50 cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${tokenRefreshing ? 'animate-spin' : ''}`} />
              <span>{tokenRefreshing ? 'Membaca Token dari POD...' : 'Ambil Token dari /home/pod/influx_token.json'}</span>
            </button>
          </div>

          {/* Manual Override Option */}
          <div className="p-3 bg-slate-950 border border-slate-800 rounded-lg space-y-2">
            <span className="font-semibold text-slate-300 block">
              2. Atur Override Token Manual:
            </span>
            <p className="text-[11px] text-slate-400">
              Jika SSH sedang tidak dapat dijangkau, Anda dapat menempelkan (*paste*) API Token InfluxDB untuk unit ini:
            </p>
            <input
              type="text"
              placeholder="Paste Influx Token di sini..."
              value={overrideTokenInput}
              onChange={(e) => onOverrideTokenInputChange(e.target.value)}
              className="w-full bg-slate-900 text-slate-200 p-2 rounded-lg border border-slate-700 text-xs font-mono focus:outline-none focus:border-emerald-500"
            />
            <button
              type="button"
              onClick={() => onRefreshToken(overrideTokenInput)}
              disabled={tokenRefreshing || !overrideTokenInput.trim()}
              className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg font-medium transition disabled:opacity-40 cursor-pointer"
            >
              Simpan &amp; Uji Token Manual
            </button>
          </div>

          {/* Result Feedback */}
          {tokenRefreshResult && (
            <div
              className={`p-3 rounded-lg border text-xs ${tokenRefreshResult.success
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                }`}
            >
              <div className="flex items-center gap-2 font-bold mb-1">
                {tokenRefreshResult.success ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <XCircle className="w-4 h-4 text-rose-400" />}
                <span>{tokenRefreshResult.message || tokenRefreshResult.error}</span>
              </div>
              {tokenRefreshResult.data?.testResult && (
                <div className="text-[11px] font-mono mt-1 text-slate-300">
                  Otorisasi: {tokenRefreshResult.data.testResult.authorized ? 'BERHASIL ✅' : `GAGAL ❌ (${tokenRefreshResult.data.testResult.error})`}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="pt-3 border-t border-slate-800 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-medium transition cursor-pointer"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
}
