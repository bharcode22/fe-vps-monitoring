import React from 'react';
import { ArrowLeft, Zap, RefreshCw, Layers } from 'lucide-react';

export default function DbSyncHeader({
  onBack,
  onTestConnection,
  testingConnection,
  onCompareSchema,
  comparingSchema,
  canTestOrCompare
}) {
  return (
    <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-cyan-500/20 pb-5">
      <div className="flex items-center gap-3.5">
        <button
          onClick={onBack}
          className="p-2.5 bg-slate-900 hover:bg-slate-800 text-cyan-400 rounded-xl border border-cyan-500/30 transition-all cursor-pointer shadow-lg shadow-cyan-500/5 flex items-center gap-1.5 text-xs font-bold"
        >
          <ArrowLeft size={16} />
          <span>Kembali</span>
        </button>
        <div>
          <div className="flex items-center gap-2.5">
            <div className="bg-cyan-500/20 p-2 rounded-xl border border-cyan-500/40">
              <Zap className="text-cyan-400 w-5 h-5" />
            </div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">
              Database Sync &amp; Schema Analyzer
            </h1>
          </div>
          <p className="text-slate-400 text-xs mt-1">
            Analisis struktur skema dan sinkronisasi data antardatabase PostgreSQL secara aman.
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={onTestConnection}
          disabled={testingConnection || !canTestOrCompare}
          className="bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-cyan-400 px-4 py-2 rounded-xl text-xs font-bold border border-cyan-500/30 flex items-center gap-2 cursor-pointer transition-all"
        >
          <RefreshCw size={14} className={testingConnection ? 'animate-spin' : ''} />
          <span>{testingConnection ? 'Menguji...' : 'Uji Koneksi'}</span>
        </button>

        <button
          onClick={onCompareSchema}
          disabled={comparingSchema || !canTestOrCompare}
          className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 disabled:opacity-50 text-slate-950 px-4 py-2 rounded-xl text-xs font-extrabold flex items-center gap-2 cursor-pointer shadow-lg shadow-cyan-500/25 transition-all"
        >
          <Layers size={15} />
          <span>{comparingSchema ? 'Menganalisis...' : 'Bandingkan Skema'}</span>
        </button>
      </div>
    </div>
  );
}
