import React from 'react';
import {
  Activity,
  ArrowLeft,
  Clock,
  Copy,
  Check,
  RefreshCw,
} from 'lucide-react';
import PodHbIncidentQuickPicker from './PodHbIncidentQuickPicker';

export default function PodHbHeader({
  onBack,
  recentIncidents = [],
  isLoadingIncidents = false,
  isIncidentsDropdownOpen = false,
  setIsIncidentsDropdownOpen,
  loadRecentIncidents,
  handleSelectIncident,
  incidentsRef,
  handleCopyAnalysisJson,
  copiedSuccess = false,
  analysisData,
  runAnalysis,
  isLoading = false,
}) {
  return (
    <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-4 border-b border-slate-800/80">
      <div className="flex items-center gap-3">
        {onBack && (
          <button
            onClick={onBack}
            className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800 transition shadow-sm cursor-pointer"
            title="Kembali"
          >
            <ArrowLeft size={20} />
          </button>
        )}
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
              <Activity size={22} className="animate-pulse" />
            </div>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white flex items-center gap-2 flex-wrap">
              Analisa Pola Heartbeat
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-cyan-500/15 text-cyan-300 font-semibold border border-cyan-500/30">
                Incident Diagnostic
              </span>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 font-semibold border border-emerald-500/30 flex items-center gap-1">
                <Clock size={12} /> WITA (UTC+8)
              </span>
            </h1>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Investigasi jeda waktu paket detak, kontinuitas counter #hb, dan diagnosa akar penyebab kematian modul
          </p>
        </div>
      </div>

      {/* Right Actions & Incident Quick Picker */}
      <div className="flex flex-wrap items-center gap-2.5 relative">
        <PodHbIncidentQuickPicker
          recentIncidents={recentIncidents}
          isLoadingIncidents={isLoadingIncidents}
          isIncidentsDropdownOpen={isIncidentsDropdownOpen}
          setIsIncidentsDropdownOpen={setIsIncidentsDropdownOpen}
          loadRecentIncidents={loadRecentIncidents}
          handleSelectIncident={handleSelectIncident}
          incidentsRef={incidentsRef}
        />

        {/* Copy Analysis JSON */}
        <button
          onClick={handleCopyAnalysisJson}
          disabled={!analysisData}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 text-xs font-medium transition disabled:opacity-50 cursor-pointer"
          title="Salin hasil diagnosa JSON"
        >
          {copiedSuccess ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
          <span>{copiedSuccess ? 'Tersalin' : 'Salin Data'}</span>
        </button>

        {/* Refresh Button */}
        <button
          onClick={runAnalysis}
          disabled={isLoading}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-semibold text-xs transition shadow-lg shadow-cyan-600/20 disabled:opacity-50 cursor-pointer"
        >
          <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
          <span>{isLoading ? 'Menganalisis...' : 'Analisis Ulang'}</span>
        </button>
      </div>
    </div>
  );
}
