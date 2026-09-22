import React from 'react';
import {
  Settings2,
  Database,
  Calendar,
  Layers,
  Zap,
  RefreshCw,
  Sliders,
  Filter,
  Info,
  CheckCircle2,
  Cpu
} from 'lucide-react';

export default function ExtractorConfigCard({
  masters = [],
  selectedMasterId,
  onSelectMaster,
  scope,
  setScope,
  batchSize,
  setBatchSize,
  podCode,
  setPodCode,
  activityType,
  setActivityType,
  dateFrom,
  setDateFrom,
  dateTo,
  setDateTo,
  maxLogs,
  setMaxLogs,
  registeredPods = [],
  activityTypeBreakdown = [],
  isExtracting,
  onExecute,
  onRefreshStats,
  isLoadingStats
}) {
  const scopeOptions = [
    {
      id: 'UNEXTRACTED_ONLY',
      label: 'Log Belum Di-ekstrak',
      desc: 'Hanya baris yang belum ada di pod_logs_extracted',
      badge: 'Direkomendasikan',
      badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
    },
    {
      id: 'ALL',
      label: 'Semua Log',
      desc: 'Proses ulang seluruh log (idempoten & aman)',
      badge: 'Lengkap',
      badgeColor: 'bg-blue-500/20 text-blue-300 border-blue-500/30'
    },
    {
      id: 'DATE_RANGE',
      label: 'Rentang Tanggal',
      desc: 'Filter log berdasarkan rentang waktu spesifik',
      badge: 'Custom',
      badgeColor: 'bg-purple-500/20 text-purple-300 border-purple-500/30'
    },
    {
      id: 'POD',
      label: 'Unit POD Tertentu',
      desc: 'Fokus ekstraksi pada satu unit POD tertentu',
      badge: 'Unit',
      badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/30'
    }
  ];

  const batchSizes = [100, 500, 1000, 2000];

  const setDatePreset = (days) => {
    const end = new Date();
    const start = new Date();
    start.setDate(end.getDate() - days);
    setDateFrom(start.toISOString().split('T')[0]);
    setDateTo(end.toISOString().split('T')[0]);
  };

  return (
    <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-5 shadow-xl backdrop-blur-md mb-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 mb-5 border-b border-slate-800/80">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
            <Settings2 size={18} />
          </div>
          <div>
            <h3 className="text-base font-bold text-white tracking-wide">
              Konfigurasi Ekstraksi Log
            </h3>
            <p className="text-xs text-slate-400">
              Pilih database target, cakupan data, dan parameter batch ekstraksi
            </p>
          </div>
        </div>

        {/* Master Database Selector */}
        <div className="flex items-center gap-2">
          <Database size={15} className="text-cyan-400 shrink-0" />
          <span className="text-xs font-medium text-slate-300 shrink-0">Master DB:</span>
          <select
            value={selectedMasterId || ''}
            onChange={(e) => onSelectMaster(Number(e.target.value))}
            disabled={isExtracting || masters.length === 0}
            className="bg-slate-950/80 border border-slate-700/80 text-white text-xs rounded-xl px-3 py-1.5 focus:outline-none focus:border-cyan-500 disabled:opacity-50"
          >
            {masters.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name} ({m.host}:{m.database})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Scope Selector Cards */}
      <div className="mb-5">
        <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2.5">
          Cakupan Ekstraksi (Scope)
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
          {scopeOptions.map((opt) => {
            const isSelected = scope === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => setScope(opt.id)}
                disabled={isExtracting}
                className={`relative flex flex-col p-3 rounded-xl border text-left transition-all duration-150 ${
                  isSelected
                    ? 'bg-cyan-500/10 border-cyan-500/60 ring-1 ring-cyan-500/30'
                    : 'bg-slate-950/40 border-slate-800 hover:border-slate-700 hover:bg-slate-950/60'
                } disabled:opacity-50`}
              >
                <div className="flex items-center justify-between gap-1 mb-1.5">
                  <span className={`text-xs font-bold ${isSelected ? 'text-cyan-300' : 'text-white'}`}>
                    {opt.label}
                  </span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full border font-semibold ${opt.badgeColor}`}>
                    {opt.badge}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed">
                  {opt.desc}
                </p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Dynamic Filters Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-5 p-3.5 rounded-xl bg-slate-950/40 border border-slate-800/60">
        {/* POD Unit Filter (Active if POD scope or for filtering) */}
        <div>
          <label className="block text-[11px] font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
            <Cpu size={13} className="text-amber-400" />
            Filter Unit POD
          </label>
          <select
            value={podCode}
            onChange={(e) => setPodCode(e.target.value)}
            disabled={isExtracting}
            className="w-full bg-slate-900 border border-slate-700/80 text-white text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-cyan-500 disabled:opacity-50"
          >
            <option value="ALL">Semua Unit POD</option>
            {registeredPods.map((pod) => (
              <option key={pod.id} value={pod.pod_uuid || pod.code || pod.name}>
                {pod.name || pod.code} ({pod.code || (pod.pod_uuid ? pod.pod_uuid.substring(0, 8) + '...' : '')})
              </option>
            ))}
          </select>
        </div>

        {/* Activity Type Filter */}
        <div>
          <label className="block text-[11px] font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
            <Filter size={13} className="text-purple-400" />
            Filter Activity Type
          </label>
          <select
            value={activityType}
            onChange={(e) => setActivityType(e.target.value)}
            disabled={isExtracting}
            className="w-full bg-slate-900 border border-slate-700/80 text-white text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-cyan-500 disabled:opacity-50"
          >
            <option value="ALL">Semua Tipe Aktivitas (All)</option>
            <option value="play-session-experience">play-session-experience</option>
            <option value="play-session-explore">play-session-explore</option>
            <option value="end-session">end-session</option>
            <option value="stop-session-experience">stop-session-experience</option>
            <option value="stop-session-explore">stop-session-explore</option>
            <option value="login">login</option>
            <option value="logout">logout</option>
            {activityTypeBreakdown
              .filter(
                (a) =>
                  ![
                    'play-session-experience',
                    'play-session-explore',
                    'end-session',
                    'stop-session-experience',
                    'stop-session-explore',
                    'login',
                    'logout'
                  ].includes(a.activityType)
              )
              .map((a) => (
                <option key={a.activityType} value={a.activityType}>
                  {a.activityType} ({a.count})
                </option>
              ))}
          </select>
        </div>

        {/* Batch Size Selector */}
        <div>
          <label className="block text-[11px] font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
            <Sliders size={13} className="text-emerald-400" />
            Ukuran Batch (Per Query)
          </label>
          <div className="grid grid-cols-4 gap-1.5">
            {batchSizes.map((size) => (
              <button
                key={size}
                type="button"
                onClick={() => setBatchSize(size)}
                disabled={isExtracting}
                className={`py-1.5 rounded-lg text-xs font-bold transition-colors ${
                  batchSize === size
                    ? 'bg-cyan-500 text-slate-950 font-black'
                    : 'bg-slate-900 text-slate-300 hover:bg-slate-800'
                } disabled:opacity-50`}
              >
                {size}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Date Range Inputs (when scope is DATE_RANGE) */}
      {scope === 'DATE_RANGE' && (
        <div className="mb-5 p-3.5 rounded-xl bg-purple-950/20 border border-purple-500/30">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
            <span className="text-xs font-bold text-purple-300 flex items-center gap-1.5">
              <Calendar size={14} />
              Filter Rentang Tanggal Ekstraksi
            </span>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setDatePreset(1)}
                className="px-2 py-0.5 text-[11px] font-medium rounded bg-purple-900/40 text-purple-200 hover:bg-purple-800/60 border border-purple-700/50"
              >
                Hari Ini
              </button>
              <button
                type="button"
                onClick={() => setDatePreset(7)}
                className="px-2 py-0.5 text-[11px] font-medium rounded bg-purple-900/40 text-purple-200 hover:bg-purple-800/60 border border-purple-700/50"
              >
                7 Hari Terakhir
              </button>
              <button
                type="button"
                onClick={() => setDatePreset(30)}
                className="px-2 py-0.5 text-[11px] font-medium rounded bg-purple-900/40 text-purple-200 hover:bg-purple-800/60 border border-purple-700/50"
              >
                30 Hari Terakhir
              </button>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] text-slate-400 mb-1">Dari Tanggal:</label>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                disabled={isExtracting}
                className="w-full bg-slate-900 border border-slate-700 text-white text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-purple-500"
              />
            </div>
            <div>
              <label className="block text-[11px] text-slate-400 mb-1">Sampai Tanggal:</label>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                disabled={isExtracting}
                className="w-full bg-slate-900 border border-slate-700 text-white text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-purple-500"
              />
            </div>
          </div>
        </div>
      )}

      {/* Info Notice */}
      <div className="flex items-start gap-2.5 p-3 rounded-xl bg-slate-950/60 border border-slate-800/70 text-slate-400 text-xs mb-5">
        <Info size={15} className="text-cyan-400 shrink-0 mt-0.5" />
        <div className="leading-relaxed">
          <span className="font-semibold text-slate-200">Logika Ekstraktor Idempoten:</span> Sistem akan
          mengurai JSON data pada setiap log di tabel <code className="text-cyan-300">pod_logs</code>, membuat
          relasi unik di <code className="text-cyan-300">pod_logs_extracted</code>, serta memetakan sesi ke{' '}
          <code className="text-purple-300">play_sesion_detail</code> dan login/logout ke{' '}
          <code className="text-blue-300">auth_detail</code> tanpa duplikasi data.
        </div>
      </div>

      {/* Action Footer */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-slate-800/80">
        <button
          type="button"
          onClick={onRefreshStats}
          disabled={isLoadingStats || isExtracting}
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700/80 border border-slate-700 text-xs font-semibold text-slate-200 transition-all disabled:opacity-50"
        >
          <RefreshCw size={14} className={isLoadingStats ? 'animate-spin text-cyan-400' : ''} />
          <span>Refresh Data Statistik</span>
        </button>

        <button
          type="button"
          onClick={onExecute}
          disabled={isExtracting}
          className={`w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl text-xs font-bold text-slate-950 transition-all shadow-lg ${
            isExtracting
              ? 'bg-slate-700 text-slate-400 cursor-not-allowed'
              : 'bg-gradient-to-r from-cyan-400 via-teal-400 to-emerald-400 hover:from-cyan-300 hover:to-emerald-300 shadow-cyan-500/20 active:scale-95'
          }`}
        >
          {isExtracting ? (
            <>
              <RefreshCw size={14} className="animate-spin" />
              <span>Sedang Mengekstrak Data...</span>
            </>
          ) : (
            <>
              <Zap size={14} className="fill-slate-950" />
              <span>Mulai Ekstraksi Data</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
