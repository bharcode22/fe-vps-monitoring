import React, { useState, useMemo, useEffect } from 'react';
import {
  X,
  Code,
  Play,
  Copy,
  Check,
  RefreshCw,
  Database,
  Tag,
  Clock,
  Layers,
  FileCode,
  Download,
  AlertCircle,
  Sparkles,
  Sliders
} from 'lucide-react';
import { queryInfluxDataApi } from '../../api/influxApi';

export default function PodRecordsQueryBuilderModal({
  isOpen,
  onClose,
  serverDisplayName = 'POD RIG 30',
  currentPodId = null
}) {
  // Query Filter States
  const [bucket, setBucket] = useState('pod_logs_bhar');
  const [rangeMode, setRangeMode] = useState('variable'); // 'variable' | '-15m' | '-1h' | '-6h' | '-24h' | '-7d' | 'custom'
  const [customStart, setCustomStart] = useState('');
  const [customStop, setCustomStop] = useState('');
  
  const [measurement, setMeasurement] = useState('pod_heartbeat_logs');
  const [field, setField] = useState('hb');
  const [moduleId, setModuleId] = useState('508');
  const [podName, setPodName] = useState(serverDisplayName || 'POD RIG 30');
  const [limit, setLimit] = useState(50);

  // Manual Editor Mode
  const [isManualMode, setIsManualMode] = useState(false);
  const [manualQuery, setManualQuery] = useState('');
  const [copied, setCopied] = useState(false);

  // Query Execution State
  const [executing, setExecuting] = useState(false);
  const [queryResult, setQueryResult] = useState(null);
  const [queryError, setQueryError] = useState(null);
  const [resultTab, setResultTab] = useState('table'); // 'table' | 'json'

  // Synchronize podName when serverDisplayName changes
  useEffect(() => {
    if (serverDisplayName) {
      setPodName(serverDisplayName);
    }
  }, [serverDisplayName]);

  // Dynamically build the exact multi-line Flux query
  const generatedFluxQuery = useMemo(() => {
    const lines = [];
    lines.push(`from(bucket: "${bucket || 'pod_logs_bhar'}")`);

    // Range line
    if (rangeMode === 'variable') {
      lines.push(`  |> range(start: v.timeRangeStart, stop: v.timeRangeStop)`);
    } else if (rangeMode === 'custom' && customStart) {
      if (customStop) {
        lines.push(`  |> range(start: ${customStart}, stop: ${customStop})`);
      } else {
        lines.push(`  |> range(start: ${customStart})`);
      }
    } else {
      lines.push(`  |> range(start: ${rangeMode || '-1h'})`);
    }

    // Measurement filter
    if (measurement && measurement.trim()) {
      lines.push(`  |> filter(fn: (r) => r["_measurement"] == "${measurement.trim()}")`);
    }

    // Field filter
    if (field && field.trim()) {
      lines.push(`  |> filter(fn: (r) => r["_field"] == "${field.trim()}")`);
    }

    // Module ID filter
    if (moduleId && moduleId.trim() && moduleId !== 'ALL') {
      lines.push(`  |> filter(fn: (r) => r["module_id"] == "${moduleId.trim()}")`);
    }

    // POD Name filter
    if (podName && podName.trim() && podName !== 'ALL') {
      lines.push(`  |> filter(fn: (r) => r["pod_name"] == "${podName.trim()}")`);
    }

    // Row Limit
    if (limit && Number(limit) > 0) {
      lines.push(`  |> limit(n: ${limit})`);
    }

    return lines.join('\n');
  }, [bucket, rangeMode, customStart, customStop, measurement, field, moduleId, podName, limit]);

  // Sync manual query when generated changes (if not in manual edit mode)
  useEffect(() => {
    if (!isManualMode) {
      setManualQuery(generatedFluxQuery);
    }
  }, [generatedFluxQuery, isManualMode]);

  // Quick Preset Handlers
  const applyPreset = (preset) => {
    setIsManualMode(false);
    if (preset === 'exact_user') {
      setBucket('pod_logs_bhar');
      setRangeMode('variable');
      setMeasurement('pod_heartbeat_logs');
      setField('hb');
      setModuleId('508');
      setPodName('POD RIG 30');
      setLimit(50);
    } else if (preset === 'current_mod') {
      setBucket('pod_logs_bhar');
      setRangeMode('-1h');
      setMeasurement('pod_heartbeat_logs');
      setField('current');
      setModuleId('508');
      setPodName(serverDisplayName || 'POD RIG 30');
      setLimit(50);
    } else if (preset === 'events_fleet') {
      setBucket('pod_logs_bhar');
      setRangeMode('-24h');
      setMeasurement('pod_events');
      setField('');
      setModuleId('');
      setPodName('');
      setLimit(50);
    } else if (preset === 'state_pod') {
      setBucket('pod_logs_bhar');
      setRangeMode('-7d');
      setMeasurement('pod_state');
      setField('status');
      setModuleId('');
      setPodName(serverDisplayName || 'POD RIG 30');
      setLimit(10);
    }
  };

  // Copy Flux Query to Clipboard
  const handleCopyQuery = () => {
    const q = isManualMode ? manualQuery : generatedFluxQuery;
    navigator.clipboard.writeText(q);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Execute Query via Influx API
  const handleExecute = async () => {
    const activeQuery = isManualMode ? manualQuery : generatedFluxQuery;
    if (!activeQuery.trim()) return;

    setExecuting(true);
    setQueryError(null);
    setQueryResult(null);

    try {
      const res = await queryInfluxDataApi({ rawFluxQuery: activeQuery.trim() });
      if (res && res.success) {
        setQueryResult(res);
      } else {
        setQueryError(res?.error || 'Kueri tidak mengembalikan hasil yang valid.');
      }
    } catch (err) {
      setQueryError(err.message || 'Gagal menghubungi server InfluxDB.');
    } finally {
      setExecuting(false);
    }
  };

  // Download Result as CSV
  const handleDownloadCsv = () => {
    if (!queryResult || !queryResult.rows || queryResult.rows.length === 0) return;
    const rows = queryResult.rows;
    const headers = Object.keys(rows[0]);
    const csvLines = [headers.join(',')];

    for (const r of rows) {
      const vals = headers.map(h => {
        const val = r[h] !== undefined ? String(r[h]) : '';
        return `"${val.replace(/"/g, '""')}"`;
      });
      csvLines.push(vals.join(','));
    }

    const blob = new Blob([csvLines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `influx_query_${measurement || 'records'}_${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 md:p-6 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden text-slate-200">
        
        {/* Modal Top Header */}
        <div className="px-5 py-3.5 bg-slate-950/80 border-b border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-gradient-to-br from-purple-500/20 to-cyan-500/20 text-purple-300 border border-purple-500/30">
              <Code size={18} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-black text-white tracking-wide">
                  Dynamic Flux Query Builder
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-purple-500/20 text-purple-300 border border-purple-500/40">
                  pod_logs_bhar
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                  Unit: {podName}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Konstruksi kueri Flux dinamis bertingkat untuk ekstraksi data langsung dari InfluxDB.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-white transition cursor-pointer"
            title="Tutup Modal"
          >
            <X size={18} />
          </button>
        </div>

        {/* Quick Template Preset Chips */}
        <div className="px-5 py-2.5 bg-slate-950/40 border-b border-slate-800/80 flex items-center gap-2 overflow-x-auto shrink-0">
          <span className="text-[11px] font-bold text-slate-400 flex items-center gap-1 shrink-0">
            <Sparkles size={12} className="text-amber-400" />
            Preset Kueri Cepat:
          </span>
          <button
            onClick={() => applyPreset('exact_user')}
            className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-purple-500/20 hover:bg-purple-500/30 text-purple-200 border border-purple-500/40 transition shrink-0 cursor-pointer"
            title="Preset: Detak hb modul 508 POD RIG 30 (Sesuai Contoh)"
          >
            ⚡ Detak hb (Mod 508 - POD RIG 30)
          </button>
          <button
            onClick={() => applyPreset('current_mod')}
            className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-300 border border-cyan-500/30 transition shrink-0 cursor-pointer"
            title="Preset: Telemetri Arus & Kursi Mod 508"
          >
            ⚡ Arus Modul (current - 508)
          </button>
          <button
            onClick={() => applyPreset('events_fleet')}
            className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border border-rose-500/30 transition shrink-0 cursor-pointer"
            title="Preset: Insiden & Downtime Armada 24 Jam"
          >
            ⚡ Insiden Armada (pod_events)
          </button>
          <button
            onClick={() => applyPreset('state_pod')}
            className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 transition shrink-0 cursor-pointer"
            title="Preset: Snapshot Status Terkini POD"
          >
            ⚡ Snapshot Status (pod_state)
          </button>
        </div>

        {/* Main Body: Builder Controls + Live Flux + Live Result Table */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          
          {/* Builder Filter Stages (2-column layout) */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            
            {/* Column 1: Bucket & Range */}
            <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-3">
              <div>
                <label className="block text-[11px] font-bold uppercase text-slate-400 mb-1 flex items-center gap-1.5">
                  <Database size={13} className="text-purple-400" />
                  Target Bucket
                </label>
                <select
                  value={bucket}
                  onChange={(e) => setBucket(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white font-mono font-bold focus:border-purple-500 focus:outline-none"
                >
                  <option value="pod_logs_bhar">pod_logs_bhar (Utama)</option>
                  <option value="pod_monitoring">pod_monitoring (Pusat)</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase text-slate-400 mb-1 flex items-center gap-1.5">
                  <Clock size={13} className="text-cyan-400" />
                  Rentang Waktu (Range)
                </label>
                <select
                  value={rangeMode}
                  onChange={(e) => setRangeMode(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white font-medium focus:border-cyan-500 focus:outline-none"
                >
                  <option value="variable">v.timeRangeStart, stop: v.timeRangeStop</option>
                  <option value="-15m">15 Menit Terakhir (-15m)</option>
                  <option value="-1h">1 Jam Terakhir (-1h)</option>
                  <option value="-6h">6 Jam Terakhir (-6h)</option>
                  <option value="-24h">24 Jam Terakhir (-24h)</option>
                  <option value="-7d">7 Hari Terakhir (-7d)</option>
                  <option value="-30d">30 Hari Terakhir (-30d)</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase text-slate-400 mb-1">
                  Batas Baris (Limit)
                </label>
                <select
                  value={limit}
                  onChange={(e) => setLimit(Number(e.target.value))}
                  className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white font-medium focus:border-cyan-500 focus:outline-none"
                >
                  <option value={20}>20 Baris</option>
                  <option value={50}>50 Baris</option>
                  <option value={100}>100 Baris</option>
                  <option value={500}>500 Baris</option>
                  <option value={1000}>1.000 Baris</option>
                </select>
              </div>
            </div>

            {/* Column 2: Measurement & Field Filter */}
            <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-3">
              <div>
                <label className="block text-[11px] font-bold uppercase text-slate-400 mb-1 flex items-center gap-1.5">
                  <Layers size={13} className="text-emerald-400" />
                  Filter _measurement
                </label>
                <select
                  value={measurement}
                  onChange={(e) => setMeasurement(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white font-mono font-bold focus:border-emerald-500 focus:outline-none"
                >
                  <option value="pod_heartbeat_logs">pod_heartbeat_logs (Detak &amp; Telemetri)</option>
                  <option value="pod_events">pod_events (Insiden Armada)</option>
                  <option value="pod_state">pod_state (Snapshot Status)</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase text-slate-400 mb-1 flex items-center gap-1.5">
                  <Sliders size={13} className="text-amber-400" />
                  Filter _field
                </label>
                <div className="flex items-center gap-1.5 mb-1.5 flex-wrap">
                  {['hb', 'current', 'temp', 'humi', 'pob_state'].map(f => (
                    <button
                      key={f}
                      type="button"
                      onClick={() => setField(f)}
                      className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold transition cursor-pointer border ${
                        field === f
                          ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 shadow-sm'
                          : 'bg-slate-900 text-slate-400 hover:text-white border-slate-800'
                      }`}
                    >
                      {f}
                    </button>
                  ))}
                </div>
                <input
                  type="text"
                  value={field}
                  onChange={(e) => setField(e.target.value)}
                  placeholder="Nama field (contoh: hb, current)..."
                  className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white font-mono focus:border-amber-500 focus:outline-none"
                />
              </div>
            </div>

            {/* Column 3: Tag Filters (module_id & pod_name) */}
            <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-3">
              <div>
                <label className="block text-[11px] font-bold uppercase text-slate-400 mb-1 flex items-center gap-1.5">
                  <Tag size={13} className="text-blue-400" />
                  Filter Tag module_id
                </label>
                <div className="flex items-center gap-1 mb-1.5 flex-wrap">
                  {['501', '502', '503', '504', '505', '506', '507', '508', '812'].map(m => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setModuleId(m)}
                      className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold transition cursor-pointer border ${
                        moduleId === m
                          ? 'bg-blue-500/25 text-blue-300 border-blue-500/40 shadow-sm'
                          : 'bg-slate-900 text-slate-400 hover:text-white border-slate-800'
                      }`}
                    >
                      {m}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => setModuleId('')}
                    className={`px-1.5 py-0.5 rounded text-[10px] transition cursor-pointer border ${
                      !moduleId ? 'bg-slate-700 text-white border-slate-600' : 'bg-slate-900 text-slate-500 border-slate-800'
                    }`}
                  >
                    Semua
                  </button>
                </div>
                <input
                  type="text"
                  value={moduleId}
                  onChange={(e) => setModuleId(e.target.value)}
                  placeholder="ID modul (contoh: 508)..."
                  className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white font-mono focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase text-slate-400 mb-1 flex items-center gap-1.5">
                  <Tag size={13} className="text-cyan-400" />
                  Filter Tag pod_name
                </label>
                <div className="flex items-center gap-1.5 mb-1.5 flex-wrap">
                  {serverDisplayName && (
                    <button
                      type="button"
                      onClick={() => setPodName(serverDisplayName)}
                      className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold transition cursor-pointer border ${
                        podName === serverDisplayName
                          ? 'bg-cyan-500/25 text-cyan-300 border-cyan-500/40 shadow-sm'
                          : 'bg-slate-900 text-slate-400 hover:text-white border-slate-800'
                      }`}
                    >
                      {serverDisplayName}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setPodName('POD RIG 30')}
                    className={`px-2 py-0.5 rounded text-[10px] font-mono transition cursor-pointer border ${
                      podName === 'POD RIG 30'
                        ? 'bg-cyan-500/25 text-cyan-300 border-cyan-500/40 shadow-sm'
                        : 'bg-slate-900 text-slate-400 hover:text-white border-slate-800'
                    }`}
                  >
                    POD RIG 30
                  </button>
                  <button
                    type="button"
                    onClick={() => setPodName('')}
                    className={`px-1.5 py-0.5 rounded text-[10px] transition cursor-pointer border ${
                      !podName ? 'bg-slate-700 text-white border-slate-600' : 'bg-slate-900 text-slate-500 border-slate-800'
                    }`}
                  >
                    Semua
                  </button>
                </div>
                <input
                  type="text"
                  value={podName}
                  onChange={(e) => setPodName(e.target.value)}
                  placeholder="Nama POD (contoh: POD RIG 30)..."
                  className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white font-mono focus:border-cyan-500 focus:outline-none"
                />
              </div>
            </div>

          </div>

          {/* Live Flux Query Code Editor & Action Bar */}
          <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 flex flex-col gap-2">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <FileCode size={15} className="text-cyan-400" />
                <span className="text-xs font-bold text-white tracking-wide">
                  Pratinjau Kode Flux Query (Dinamis)
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                  {isManualMode ? 'Mode Edit Manual' : 'Otomatis Tersinkron'}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsManualMode(!isManualMode)}
                  className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition cursor-pointer"
                >
                  {isManualMode ? 'Kunci Otomatis' : 'Edit Bebas'}
                </button>

                <button
                  type="button"
                  onClick={handleCopyQuery}
                  className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition cursor-pointer flex items-center gap-1"
                >
                  {copied ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
                  <span>{copied ? 'Tersalin' : 'Salin Flux'}</span>
                </button>

                <button
                  type="button"
                  onClick={handleExecute}
                  disabled={executing}
                  className="px-4 py-1.5 rounded-xl text-xs font-bold bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white shadow-lg shadow-cyan-500/20 transition cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                >
                  {executing ? <RefreshCw size={13} className="animate-spin" /> : <Play size={13} />}
                  <span>Jalankan Kueri</span>
                </button>
              </div>
            </div>

            {/* Code Textarea / Display */}
            <div className="relative">
              <textarea
                readOnly={!isManualMode}
                value={isManualMode ? manualQuery : generatedFluxQuery}
                onChange={(e) => setManualQuery(e.target.value)}
                rows={7}
                className="w-full p-3 rounded-lg bg-slate-900/90 border border-slate-800 font-mono text-xs text-cyan-200 focus:border-cyan-500 focus:outline-none leading-relaxed resize-y"
              />
            </div>
          </div>

          {/* Results Section */}
          {queryError && (
            <div className="p-3.5 rounded-xl bg-rose-500/15 border border-rose-500/40 text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle size={16} className="shrink-0 text-rose-400" />
              <div className="flex-1">
                <strong>Eksekusi Kueri Gagal:</strong> {queryError}
              </div>
            </div>
          )}

          {queryResult && (
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-3">
                  <h4 className="text-xs font-bold text-white">
                    Hasil Kueri Data ({queryResult.totalRows || queryResult.rows?.length || 0} Baris)
                  </h4>
                  {queryResult.queryDurationMs !== undefined && (
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                      ⏱ {queryResult.queryDurationMs} ms
                    </span>
                  )}
                  {queryResult.measurements?.length > 0 && (
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                      {queryResult.measurements.join(', ')}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <div className="flex items-center bg-slate-900 rounded-lg p-0.5 border border-slate-800">
                    <button
                      onClick={() => setResultTab('table')}
                      className={`px-2 py-0.5 rounded text-[11px] font-semibold transition cursor-pointer ${
                        resultTab === 'table' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      Tabel
                    </button>
                    <button
                      onClick={() => setResultTab('json')}
                      className={`px-2 py-0.5 rounded text-[11px] font-semibold transition cursor-pointer ${
                        resultTab === 'json' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      JSON
                    </button>
                  </div>

                  <button
                    onClick={handleDownloadCsv}
                    className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition cursor-pointer flex items-center gap-1"
                    title="Unduh hasil sebagai CSV"
                  >
                    <Download size={12} />
                    <span>CSV</span>
                  </button>
                </div>
              </div>

              {/* View 1: Data Table */}
              {resultTab === 'table' && (
                <div className="max-h-72 overflow-auto rounded-lg border border-slate-800/80 bg-slate-900/60">
                  {queryResult.rows && queryResult.rows.length > 0 ? (
                    <table className="w-full text-left text-xs border-collapse font-sans">
                      <thead className="sticky top-0 bg-slate-950/90 backdrop-blur-md border-b border-slate-800 text-slate-400 font-mono text-[11px]">
                        <tr>
                          <th className="py-2 px-3 whitespace-nowrap">Waktu (_time)</th>
                          <th className="py-2 px-3 whitespace-nowrap">Module ID</th>
                          <th className="py-2 px-3 whitespace-nowrap">POD Name</th>
                          <th className="py-2 px-3 whitespace-nowrap">Unit</th>
                          <th className="py-2 px-3 whitespace-nowrap">Field</th>
                          <th className="py-2 px-3 whitespace-nowrap text-right">Nilai (_value)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60 font-mono text-[11px]">
                        {queryResult.rows.map((row, idx) => (
                          <tr key={idx} className="hover:bg-slate-800/40 transition">
                            <td className="py-2 px-3 whitespace-nowrap text-slate-300">
                              {row._time || '-'}
                            </td>
                            <td className="py-2 px-3 whitespace-nowrap text-blue-300 font-bold">
                              {row.module_id ? `Mod ${row.module_id}` : '-'}
                            </td>
                            <td className="py-2 px-3 whitespace-nowrap text-cyan-300 font-semibold">
                              {row.pod_name || row.pod_id || '-'}
                            </td>
                            <td className="py-2 px-3 whitespace-nowrap text-slate-400">
                              {row.unit || '-'}
                            </td>
                            <td className="py-2 px-3 whitespace-nowrap text-amber-300">
                              {row._field || '-'}
                            </td>
                            <td className="py-2 px-3 whitespace-nowrap text-right font-bold text-emerald-400">
                              {row._value !== undefined ? String(row._value) : '-'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <div className="p-6 text-center text-xs text-slate-500">
                      Tidak ada data yang cocok dengan kueri ini.
                    </div>
                  )}
                </div>
              )}

              {/* View 2: JSON View */}
              {resultTab === 'json' && (
                <pre className="p-3 rounded-lg bg-slate-900/90 border border-slate-800 font-mono text-[11px] text-cyan-200 max-h-72 overflow-auto leading-relaxed">
                  {JSON.stringify(queryResult.rows, null, 2)}
                </pre>
              )}
            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3 bg-slate-950/80 border-t border-slate-800 flex items-center justify-between shrink-0">
          <span className="text-xs text-slate-400 font-mono">
            Sistem InfluxDB v2 REST API &bull; Mode Read-Only &bull; Bucket: pod_logs_bhar
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-bold transition cursor-pointer border border-slate-700"
          >
            Tutup
          </button>
        </div>

      </div>
    </div>
  );
}
