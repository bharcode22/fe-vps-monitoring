import React from 'react';
import {
  ArrowLeft,
  Database,
  ShieldCheck,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Settings
} from 'lucide-react';

/**
 * InfluxHeader Component
 * Displays top navigation bar, InfluxDB connection health status pill,
 * connection configuration modal trigger, unauthorized alert banner,
 * and template action feedback notifications.
 */
export default function InfluxHeader({
  onBack,
  healthLoading,
  healthData,
  loadHealthAndBuckets,
  setIsConfigModalOpen,
  setConfigTestResult,
  templateFeedback,
  setTemplateFeedback
}) {
  return (
    <div className="space-y-4">
      {/* Top Header Card */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 p-5 rounded-2xl bg-gradient-to-br from-slate-900 via-slate-900/90 to-slate-950 border border-slate-800/80 shadow-2xl backdrop-blur-xl">
        <div className="flex items-center gap-4">
          {onBack && (
            <button
              onClick={onBack}
              className="p-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white transition-all cursor-pointer border border-slate-700/60 shadow-md"
              title="Kembali ke Dashboard"
            >
              <ArrowLeft size={18} />
            </button>
          )}
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <div className="p-2 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
                <Database size={22} />
              </div>
              <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white">
                InfluxDB Data Manager
              </h1>
              <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                <ShieldCheck size={13} />
                READ-ONLY MODE
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Eksplorasi Flux query pipeline, filter multi-parameter (measurement, field, unit), downsampling, dan unduh CSV / JSON.
            </p>
          </div>
        </div>

        {/* Right Status Pill & Controls */}
        <div className="flex items-center gap-2.5 flex-wrap w-full lg:w-auto justify-end">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-950/80 border border-slate-800 text-xs">
            {healthLoading ? (
              <RefreshCw size={14} className="animate-spin text-cyan-400" />
            ) : healthData?.authorized ? (
              <span className="flex items-center gap-1.5 text-emerald-400 font-semibold">
                <CheckCircle2 size={14} /> Terhubung ({healthData?.version || 'v2.x'})
              </span>
            ) : healthData?.connected ? (
              <span className="flex items-center gap-1.5 text-amber-400 font-semibold">
                <AlertTriangle size={14} /> Butuh Token/Org
              </span>
            ) : (
              <span className="flex items-center gap-1.5 text-rose-400 font-semibold">
                <XCircle size={14} /> Terputus
              </span>
            )}
            <span className="text-slate-600 font-mono">|</span>
            <span className="text-slate-400 font-mono text-[11px]">
              {healthData?.url?.replace('http://', '') || '10.20.10.3:8086'}
            </span>
          </div>

          <button
            onClick={loadHealthAndBuckets}
            disabled={healthLoading}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-all cursor-pointer border border-slate-700/60"
            title="Refresh Status Koneksi"
          >
            <RefreshCw size={15} className={healthLoading ? 'animate-spin text-cyan-400' : ''} />
          </button>

          <button
            onClick={() => {
              setIsConfigModalOpen(true);
              setConfigTestResult(null);
            }}
            className="px-3 py-1.5 rounded-xl bg-cyan-600/20 hover:bg-cyan-600/30 text-cyan-300 border border-cyan-500/40 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm"
          >
            <Settings size={14} />
            <span>Koneksi Influx</span>
          </button>
        </div>
      </div>

      {/* Warning banner if unauthorized */}
      {!healthLoading && healthData && !healthData.authorized && (
        <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs flex items-start gap-3">
          <AlertTriangle size={18} className="text-amber-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-bold text-amber-300">Otentikasi InfluxDB Diperlukan</p>
            <p className="text-slate-300">
              {healthData.error || 'Token API InfluxDB belum dimasukkan atau tidak memiliki akses ke organisasi/bucket.'}
            </p>
            <button
              onClick={() => setIsConfigModalOpen(true)}
              className="mt-2 text-cyan-400 hover:text-cyan-300 font-bold underline flex items-center gap-1 cursor-pointer"
            >
              Buka Form Pengaturan Token & Organisasi &rarr;
            </button>
          </div>
        </div>
      )}

      {/* Template Action Feedback Banner */}
      {templateFeedback && (
        <div className="p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 text-xs flex items-center justify-between shadow-lg animate-in fade-in duration-200">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
            <span>{templateFeedback}</span>
          </div>
          <button
            type="button"
            onClick={() => setTemplateFeedback(null)}
            className="text-emerald-400 hover:text-white cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}
    </div>
  );
}
