import React from 'react';
import {
  Database,
  Globe,
  Key,
  CheckCircle2,
  AlertTriangle
} from 'lucide-react';

/**
 * InfluxConfigModal Component
 * Modal for editing InfluxDB host URL, read-only token, organization,
 * and default bucket, with real-time connectivity testing.
 */
export default function InfluxConfigModal({
  isOpen,
  onClose,
  configForm,
  setConfigForm,
  handleSaveConfig,
  handleTestConfig,
  configTesting,
  configSaving,
  configTestResult
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-2xl bg-slate-900 border border-slate-700 shadow-2xl p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2 text-white font-bold">
            <Database size={18} className="text-cyan-400" />
            <span>Pengaturan Koneksi InfluxDB v2</span>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white cursor-pointer"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSaveConfig} className="space-y-3.5">
          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1">
              InfluxDB URL Host
            </label>
            <div className="relative">
              <Globe size={14} className="absolute left-3 top-3 text-slate-500" />
              <input
                type="text"
                value={configForm.url}
                onChange={(e) => setConfigForm({ ...configForm, url: e.target.value })}
                placeholder="http://10.20.10.3:8086"
                className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs font-mono"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1">
              API Token (Read-Only)
            </label>
            <div className="relative">
              <Key size={14} className="absolute left-3 top-3 text-slate-500" />
              <input
                type="password"
                value={configForm.token}
                onChange={(e) => setConfigForm({ ...configForm, token: e.target.value })}
                placeholder="Masukkan InfluxDB Token..."
                className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs font-mono"
              />
            </div>
            <p className="text-[10px] text-slate-500 mt-1">
              Disarankan membuat token read-only via web console InfluxDB agar aman.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">
                Organization (Org)
              </label>
              <input
                type="text"
                value={configForm.org}
                onChange={(e) => setConfigForm({ ...configForm, org: e.target.value })}
                placeholder="pod"
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">
                Default Bucket
              </label>
              <input
                type="text"
                value={configForm.bucket}
                onChange={(e) => setConfigForm({ ...configForm, bucket: e.target.value })}
                placeholder="pod_monitoring"
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs"
              />
            </div>
          </div>

          {/* Test Result Indicator inside Modal */}
          {configTestResult && (
            <div
              className={`p-3 rounded-xl text-xs flex items-start gap-2 ${configTestResult.authorized
                ? 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-300'
                : configTestResult.connected
                  ? 'bg-amber-500/15 border border-amber-500/30 text-amber-300'
                  : 'bg-rose-500/15 border border-rose-500/30 text-rose-300'
                }`}
            >
              {configTestResult.authorized ? (
                <CheckCircle2 size={16} className="shrink-0 mt-0.5" />
              ) : (
                <AlertTriangle size={16} className="shrink-0 mt-0.5" />
              )}
              <div>
                <p className="font-bold">
                  {configTestResult.authorized
                    ? `Koneksi Berhasil! Terhubung ke InfluxDB (${configTestResult.latencyMs}ms)`
                    : 'Hasil Uji Koneksi'}
                </p>
                {configTestResult.error && (
                  <p className="mt-0.5 text-[11px] opacity-90">{configTestResult.error}</p>
                )}
              </div>
            </div>
          )}

          <div className="flex items-center justify-between pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={handleTestConfig}
              disabled={configTesting}
              className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-all cursor-pointer disabled:opacity-50"
            >
              {configTesting ? 'Menguji...' : 'Uji Koneksi'}
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 text-xs cursor-pointer"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={configSaving}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white text-xs font-bold cursor-pointer shadow-md disabled:opacity-50"
              >
                {configSaving ? 'Menyimpan...' : 'Simpan Konfigurasi'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
