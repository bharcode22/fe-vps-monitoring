import React from 'react';
import {
  Filter,
  FolderOpen,
  Save,
  Code,
  Clock,
  Calendar,
  Sliders,
  Database,
  Search,
  Check,
  Layers,
  CheckSquare,
  Square,
  Cpu,
  Tag,
  Plus,
  Trash2,
  Play,
  RefreshCw,
  Download,
  FileCode,
  XCircle,
  Copy
} from 'lucide-react';
import { MEASUREMENT_COLORS, FIELD_COLORS } from './influxConstants';

/**
 * InfluxFilterPanel Component
 * Comprehensive query builder including:
 * 1. Mode switcher (Visual Pipeline Builder vs Manual Flux Editor)
 * 2. Time Range presets and Custom Date Pickers
 * 3. Horizontal Multi-Card Pipeline (Bucket, Measurement, Field, module_id, pod_name, dynamic tags, custom tags, window/aggregation)
 * 4. Flux Code Editor / Preview
 * 5. Execution action bar (Submit with Ctrl+Enter, Download CSV, Download JSON)
 * 6. Query error alerts
 */
export default function InfluxFilterPanel({
  setIsTemplateModalOpen,
  handleOpenCreateTemplate,
  templates = [],
  isManualFluxMode,
  setIsManualFluxMode,
  timeRangePreset,
  handleSelectTimeRange,
  schemaLoading,
  customStart,
  setCustomStart,
  customStop,
  setCustomStop,
  applyDateShortcut,
  handleSelectMonth,
  customRangeSummary,
  buckets = [],
  selectedBucket,
  setSelectedBucket,
  bucketSearch,
  setBucketSearch,
  measurements = [],
  selectedMeasurements = [],
  toggleMeasurement,
  selectAllMeasurements,
  resetMeasurements,
  measurementSearchTerm,
  setMeasurementSearchTerm,
  availableFields = [],
  selectedFields = [],
  toggleField,
  selectAllFields,
  resetFields,
  fieldSearchTerm,
  setFieldSearchTerm,
  availableTagValues = {},
  tagFilters = [],
  tagSearches = {},
  setTagSearches,
  isTagValueActive,
  toggleTagValue,
  clearTagKey,
  customTagKey,
  setCustomTagKey,
  customTagVal,
  setCustomTagVal,
  handleAddCustomTag,
  setTagFilters,
  aggregationInterval,
  setAggregationInterval,
  aggregationFn,
  setAggregationFn,
  rowLimit,
  setRowLimit,
  isFluxEditorOpen,
  setIsFluxEditorOpen,
  manualFluxQuery,
  setManualFluxQuery,
  generatedFluxQuery,
  handleCopyQuery,
  copiedQuery,
  handleExecuteQuery,
  queryLoading,
  handleExport,
  exportingFormat,
  queryError
}) {
  return (
    <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-xl space-y-4">
      {/* Top Filter Bar Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-800/80 pb-3 gap-3">
        <div className="flex items-center gap-2 text-slate-200 font-bold text-sm">
          <Filter size={16} className="text-cyan-400" />
          <span>Parameter Query & Pemfilteran Data</span>
        </div>

        {/* Action Bar: Template Query, Simpan Template, Mode Switcher */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => setIsTemplateModalOpen(true)}
            className="px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700"
            title="Buka katalog template query"
          >
            <FolderOpen size={13} className="text-emerald-400" />
            <span>Template Query</span>
            {templates.length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-emerald-500/20 text-emerald-300 font-mono">
                {templates.length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={handleOpenCreateTemplate}
            className="px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/40"
            title="Simpan query aktif sebagai template baru"
          >
            <Save size={13} />
            <span>Simpan Template</span>
          </button>

          <button
            type="button"
            onClick={() => setIsManualFluxMode(!isManualFluxMode)}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${isManualFluxMode
              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
              : 'bg-slate-800 text-slate-400 hover:text-slate-200'
              }`}
          >
            <Code size={13} />
            <span>{isManualFluxMode ? 'Mode: Manual Flux Editor' : 'Mode: Visual Builder'}</span>
          </button>
        </div>
      </div>

      {/* Visual Filter Form (Hidden in manual Flux mode) */}
      {!isManualFluxMode && (
        <>
          {/* Time Range Bar & Date Shortcuts */}
          <div className="space-y-2 pt-1">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1 mr-1">
                  <Clock size={13} className="text-cyan-400" />
                  Rentang Waktu:
                </span>
                {[
                  { id: 'variable', label: 'v.timeRange (Var)' },
                  { id: '-15m', label: '15 Menit' },
                  { id: '-1h', label: '1 Jam' },
                  { id: '-6h', label: '6 Jam' },
                  { id: '-24h', label: '24 Jam' },
                  { id: '-7d', label: '7 Hari' },
                  { id: '-30d', label: '30 Hari' },
                  { id: 'custom', label: 'Kustom Tanggal' }
                ].map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => handleSelectTimeRange(p.id)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${timeRangePreset === p.id
                      ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-md shadow-cyan-500/20'
                      : 'bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800'
                      }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>

              {/* Loading indicator */}
              <div className="text-[11px] text-slate-400 flex items-center gap-2">
                {schemaLoading && (
                  <span className="flex items-center gap-1 text-cyan-400 animate-pulse">
                    <RefreshCw size={12} className="animate-spin" /> Memindai skema Influx...
                  </span>
                )}
              </div>
            </div>

            {/* Custom Date Picker (when 'custom' preset is selected) */}
            {timeRangePreset === 'custom' && (
              <div className="p-3.5 rounded-xl bg-slate-950 border border-cyan-500/30 space-y-3 shadow-lg shadow-black/40">
                <div>
                  <div className="flex items-center justify-between gap-1 mb-2">
                    <span className="text-[11px] font-semibold text-cyan-400 flex items-center gap-1.5">
                      <Calendar size={13} className="text-cyan-400" />
                      <span>Pintasan Tanggal Cepat:</span>
                    </span>
                  </div>
                  <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5">
                    {[
                      { label: 'Hari Ini', id: 'today' },
                      { label: 'Kemarin', id: 'yesterday' },
                      { label: '7 Hari', id: 'last7d' },
                      { label: '30 Hari', id: 'last30d' },
                      { label: 'Bulan Ini', id: 'thisMonth' },
                      { label: 'Bulan Lalu', id: 'lastMonth' },
                    ].map(chip => (
                      <button
                        key={chip.id}
                        type="button"
                        onClick={() => applyDateShortcut(chip.id)}
                        className="text-[10px] py-1 px-1 rounded-md bg-slate-900/90 hover:bg-cyan-500/20 text-slate-300 hover:text-cyan-300 border border-slate-800 hover:border-cyan-500/40 transition font-medium text-center truncate cursor-pointer"
                      >
                        {chip.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1 border-t border-slate-800/80">
                  <div className="space-y-1">
                    <label className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-300">
                      <Clock size={12} className="text-cyan-400 shrink-0" />
                      <span>Mulai (Start):</span>
                    </label>
                    <input
                      type="datetime-local"
                      value={customStart}
                      onChange={(e) => setCustomStart(e.target.value)}
                      className="w-full bg-slate-900 text-slate-100 px-2.5 py-1.5 rounded-lg border border-slate-700/80 focus:border-cyan-500 focus:outline-none font-mono text-xs shadow-inner [color-scheme:dark] transition"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-300">
                      <Clock size={12} className="text-cyan-400 shrink-0" />
                      <span>Selesai (End):</span>
                    </label>
                    <input
                      type="datetime-local"
                      value={customStop}
                      onChange={(e) => setCustomStop(e.target.value)}
                      className="w-full bg-slate-900 text-slate-100 px-2.5 py-1.5 rounded-lg border border-slate-700/80 focus:border-cyan-500 focus:outline-none font-mono text-xs shadow-inner [color-scheme:dark] transition"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1.5 border-t border-slate-800/80 text-[11px]">
                  <span className="text-slate-300 font-medium flex items-center gap-1.5">
                    <Calendar size={12} className="text-cyan-400 shrink-0" />
                    <span>Pilih 1 Bulan Penuh:</span>
                  </span>
                  <input
                    type="month"
                    value={customStart ? customStart.substring(0, 7) : ''}
                    onChange={(e) => handleSelectMonth(e.target.value)}
                    className="bg-slate-900 text-slate-200 px-2.5 py-1 rounded-lg border border-slate-700 text-xs font-mono focus:border-cyan-500 focus:outline-none cursor-pointer [color-scheme:dark] transition"
                  />
                </div>

                {customRangeSummary && (
                  <div className="p-2 rounded-lg bg-cyan-950/40 border border-cyan-500/30 text-xs text-cyan-300 font-mono flex items-center gap-2 shadow-sm">
                    <Calendar size={13} className="text-cyan-400 shrink-0" />
                    <div className="truncate">
                      <span className="text-cyan-400 font-semibold mr-1.5">Rentang:</span>
                      <span className="text-cyan-200">{customRangeSummary}</span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* InfluxDB Data Explorer Horizontal Multi-Card Pipeline */}
          <div className="space-y-2 pt-1 border-t border-slate-800/60">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-300">
                <Sliders size={14} className="text-cyan-400" />
                <span>Pipeline Builder InfluxDB (Pilih & Filter Real-Time)</span>
              </div>
              <span className="text-[10px] text-slate-500 hidden sm:inline">
                Geser horizontal &rarr; untuk melihat seluruh kolom tag & fungsi
              </span>
            </div>

            <div className="flex items-stretch gap-3 overflow-x-auto pb-3 pt-1 custom-scrollbar">
              {/* CARD 1: FROM (Bucket) */}
              <div className="w-64 min-w-[250px] max-w-[270px] h-[350px] flex flex-col bg-slate-950/90 border border-slate-800 rounded-xl overflow-hidden shadow-lg hover:border-slate-700/80 transition">
                <div className="p-2.5 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Database size={13} className="text-cyan-400" />
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-200">FROM (Bucket)</span>
                  </div>
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">
                    {buckets.length}
                  </span>
                </div>
                <div className="p-2 border-b border-slate-800/60 bg-slate-950">
                  <div className="relative">
                    <Search size={12} className="absolute left-2.5 top-2.5 text-slate-500" />
                    <input
                      type="text"
                      placeholder="Cari bucket..."
                      value={bucketSearch}
                      onChange={(e) => setBucketSearch(e.target.value)}
                      className="w-full bg-slate-900 text-slate-200 pl-7 pr-2 py-1 rounded-lg text-xs border border-slate-800 focus:outline-none focus:border-cyan-500 font-mono"
                    />
                  </div>
                </div>
                <div className="flex-1 overflow-y-auto custom-scrollbar p-1.5 space-y-1">
                  {buckets
                    .filter(b => b.name?.toLowerCase().includes(bucketSearch.toLowerCase()))
                    .map(b => {
                      const isSelected = selectedBucket === b.name;
                      const isPodLogs = b.name === 'pod_logs_bhar';
                      const isPusat = b.name === 'pod_monitoring';
                      return (
                        <button
                          key={b.id || b.name}
                          type="button"
                          onClick={() => setSelectedBucket(b.name)}
                          className={`w-full text-left p-2 rounded-lg text-xs font-mono transition flex flex-col gap-0.5 cursor-pointer ${isSelected
                            ? 'bg-cyan-500/20 text-cyan-200 border border-cyan-500/50 shadow-sm'
                            : 'hover:bg-slate-900 text-slate-300 border border-transparent'
                            }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-semibold truncate">{b.name}</span>
                            {isSelected && <Check size={13} className="text-cyan-400 shrink-0" />}
                          </div>
                          {isPodLogs && (
                            <span className="text-[9px] text-emerald-400 font-sans">★ Default POD Telemetri</span>
                          )}
                          {isPusat && (
                            <span className="text-[9px] text-amber-400 font-sans">Pusat Contabo</span>
                          )}
                        </button>
                      );
                    })}
                </div>
                <div className="p-2 border-t border-slate-800/80 bg-slate-900/60 text-[10px] text-slate-400 flex items-center justify-between">
                  <span>Aktif:</span>
                  <span className="font-mono text-cyan-300 truncate max-w-[140px]">{selectedBucket}</span>
                </div>
              </div>

              {/* CARD 2: _measurement */}
              <div className="w-64 min-w-[250px] max-w-[270px] h-[350px] flex flex-col bg-slate-950/90 border border-slate-800 rounded-xl overflow-hidden shadow-lg hover:border-slate-700/80 transition">
                <div className="p-2.5 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Layers size={13} className="text-cyan-400" />
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-200">_measurement</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-[10px]">
                    <button
                      type="button"
                      onClick={selectAllMeasurements}
                      className="text-cyan-400 hover:underline cursor-pointer"
                    >
                      Semua
                    </button>
                    <span className="text-slate-600">|</span>
                    <button
                      type="button"
                      onClick={resetMeasurements}
                      className="text-slate-400 hover:underline cursor-pointer"
                    >
                      Reset
                    </button>
                  </div>
                </div>
                <div className="p-2 border-b border-slate-800/60 bg-slate-950">
                  <div className="relative">
                    <Search size={12} className="absolute left-2.5 top-2.5 text-slate-500" />
                    <input
                      type="text"
                      placeholder="Cari measurement..."
                      value={measurementSearchTerm}
                      onChange={(e) => setMeasurementSearchTerm(e.target.value)}
                      className="w-full bg-slate-900 text-slate-200 pl-7 pr-2 py-1 rounded-lg text-xs border border-slate-800 focus:outline-none focus:border-cyan-500 font-mono"
                    />
                  </div>
                </div>
                <div className="flex-1 overflow-y-auto custom-scrollbar p-1.5 space-y-1">
                  {measurements
                    .filter(m => m.toLowerCase().includes(measurementSearchTerm.toLowerCase()))
                    .map((m, idx) => {
                      const isSelected = selectedMeasurements.includes(m);
                      const color = MEASUREMENT_COLORS[idx % MEASUREMENT_COLORS.length];
                      return (
                        <label
                          key={m}
                          onClick={() => toggleMeasurement(m)}
                          className={`w-full text-left p-2 rounded-lg text-xs font-mono transition flex items-center justify-between cursor-pointer ${isSelected
                            ? 'bg-cyan-500/15 text-cyan-200 border border-cyan-500/40'
                            : 'hover:bg-slate-900 text-slate-300 border border-transparent'
                            }`}
                        >
                          <div className="flex items-center gap-2 truncate">
                            {isSelected ? (
                              <CheckSquare size={14} className="text-cyan-400 shrink-0" />
                            ) : (
                              <Square size={14} className="text-slate-600 shrink-0" />
                            )}
                            <span className="truncate">{m}</span>
                          </div>
                          <span
                            className="w-2.5 h-2.5 rounded-full shrink-0"
                            style={{ backgroundColor: color }}
                          />
                        </label>
                      );
                    })}
                </div>
                <div className="p-2 border-t border-slate-800/80 bg-slate-900/60 text-[10px] text-slate-400 flex items-center justify-between">
                  <span>{selectedMeasurements.length} dipilih</span>
                  <span className="text-slate-500 font-mono">total {measurements.length}</span>
                </div>
              </div>

              {/* CARD 3: _field */}
              <div className="w-64 min-w-[250px] max-w-[270px] h-[350px] flex flex-col bg-slate-950/90 border border-slate-800 rounded-xl overflow-hidden shadow-lg hover:border-slate-700/80 transition">
                <div className="p-2.5 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Filter size={13} className="text-emerald-400" />
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-200">_field</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-[10px]">
                    <button
                      type="button"
                      onClick={selectAllFields}
                      className="text-emerald-400 hover:underline cursor-pointer"
                    >
                      Semua
                    </button>
                    <span className="text-slate-600">|</span>
                    <button
                      type="button"
                      onClick={resetFields}
                      className="text-slate-400 hover:underline cursor-pointer"
                    >
                      Reset
                    </button>
                  </div>
                </div>
                <div className="p-2 border-b border-slate-800/60 bg-slate-950">
                  <div className="relative">
                    <Search size={12} className="absolute left-2.5 top-2.5 text-slate-500" />
                    <input
                      type="text"
                      placeholder="Cari field kolom..."
                      value={fieldSearchTerm}
                      onChange={(e) => setFieldSearchTerm(e.target.value)}
                      className="w-full bg-slate-900 text-slate-200 pl-7 pr-2 py-1 rounded-lg text-xs border border-slate-800 focus:outline-none focus:border-emerald-500 font-mono"
                    />
                  </div>
                </div>
                <div className="flex-1 overflow-y-auto custom-scrollbar p-1.5 space-y-1">
                  {availableFields
                    .filter(f => f.toLowerCase().includes(fieldSearchTerm.toLowerCase()))
                    .map((f, idx) => {
                      const isSelected = selectedFields.includes(f);
                      const color = FIELD_COLORS[idx % FIELD_COLORS.length];
                      return (
                        <label
                          key={f}
                          onClick={() => toggleField(f)}
                          className={`w-full text-left p-2 rounded-lg text-xs font-mono transition flex items-center justify-between cursor-pointer ${isSelected
                            ? 'bg-emerald-500/15 text-emerald-200 border border-emerald-500/40'
                            : 'hover:bg-slate-900 text-slate-300 border border-transparent'
                            }`}
                        >
                          <div className="flex items-center gap-2 truncate">
                            {isSelected ? (
                              <CheckSquare size={14} className="text-emerald-400 shrink-0" />
                            ) : (
                              <Square size={14} className="text-slate-600 shrink-0" />
                            )}
                            <span className="truncate">{f}</span>
                          </div>
                          <span
                            className="w-2.5 h-2.5 rounded-full shrink-0"
                            style={{ backgroundColor: color }}
                          />
                        </label>
                      );
                    })}
                </div>
                <div className="p-2 border-t border-slate-800/80 bg-slate-900/60 text-[10px] text-slate-400 flex items-center justify-between">
                  <span>{selectedFields.length} dipilih</span>
                  <span className="text-slate-500 font-mono">total {availableFields.length}</span>
                </div>
              </div>

              {/* CARD 4: module_id (Tag) */}
              <div className="w-64 min-w-[250px] max-w-[270px] h-[350px] flex flex-col bg-slate-950/90 border border-slate-800 rounded-xl overflow-hidden shadow-lg hover:border-slate-700/80 transition">
                <div className="p-2.5 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Cpu size={13} className="text-purple-400" />
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-200">module_id</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => clearTagKey('module_id')}
                    className="text-[10px] text-purple-400 hover:underline cursor-pointer"
                  >
                    Reset
                  </button>
                </div>
                <div className="p-2 border-b border-slate-800/60 bg-slate-950">
                  <div className="relative">
                    <Search size={12} className="absolute left-2.5 top-2.5 text-slate-500" />
                    <input
                      type="text"
                      placeholder="Cari modul..."
                      value={tagSearches['module_id'] || ''}
                      onChange={(e) => setTagSearches(prev => ({ ...prev, module_id: e.target.value }))}
                      className="w-full bg-slate-900 text-slate-200 pl-7 pr-2 py-1 rounded-lg text-xs border border-slate-800 focus:outline-none focus:border-purple-500 font-mono"
                    />
                  </div>
                </div>
                <div className="flex-1 overflow-y-auto custom-scrollbar p-1.5 space-y-1">
                  {((availableTagValues?.module_id?.length ? availableTagValues.module_id : ['500', '501', '502', '503', '504', '505', '506', '507', '508', '812']))
                    .filter(v => !tagSearches['module_id'] || String(v).toLowerCase().includes(tagSearches['module_id'].toLowerCase()))
                    .map(v => {
                      const isSelected = isTagValueActive('module_id', v);
                      return (
                        <button
                          key={v}
                          type="button"
                          onClick={() => toggleTagValue('module_id', v)}
                          className={`w-full text-left p-2 rounded-lg text-xs font-mono transition flex items-center justify-between cursor-pointer ${isSelected
                            ? 'bg-purple-500/20 text-purple-200 border border-purple-500/50 shadow-sm'
                            : 'hover:bg-slate-900 text-slate-300 border border-transparent'
                            }`}
                        >
                          <div className="flex items-center gap-2 truncate">
                            <span className={`w-2 h-2 rounded-full ${isSelected ? 'bg-purple-400' : 'bg-slate-700'}`} />
                            <span className="font-semibold">{v}</span>
                          </div>
                          {isSelected && <Check size={13} className="text-purple-400 shrink-0" />}
                        </button>
                      );
                    })}
                </div>
                <div className="p-2 border-t border-slate-800/80 bg-slate-900/60 text-[10px] text-slate-400 flex items-center justify-between">
                  <span>Filter aktif:</span>
                  <span className="font-mono text-purple-300 truncate">
                    {tagFilters.find(tf => tf.key === 'module_id')?.value || 'Semua'}
                  </span>
                </div>
              </div>

              {/* CARD 5: pod_name (Tag) */}
              <div className="w-64 min-w-[250px] max-w-[270px] h-[350px] flex flex-col bg-slate-950/90 border border-slate-800 rounded-xl overflow-hidden shadow-lg hover:border-slate-700/80 transition">
                <div className="p-2.5 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Tag size={13} className="text-amber-400" />
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-200">pod_name</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => clearTagKey('pod_name')}
                    className="text-[10px] text-amber-400 hover:underline cursor-pointer"
                  >
                    Reset
                  </button>
                </div>
                <div className="p-2 border-b border-slate-800/60 bg-slate-950">
                  <div className="relative">
                    <Search size={12} className="absolute left-2.5 top-2.5 text-slate-500" />
                    <input
                      type="text"
                      placeholder="Cari POD..."
                      value={tagSearches['pod_name'] || ''}
                      onChange={(e) => setTagSearches(prev => ({ ...prev, pod_name: e.target.value }))}
                      className="w-full bg-slate-900 text-slate-200 pl-7 pr-2 py-1 rounded-lg text-xs border border-slate-800 focus:outline-none focus:border-amber-500 font-mono"
                    />
                  </div>
                </div>
                <div className="flex-1 overflow-y-auto custom-scrollbar p-1.5 space-y-1">
                  {((availableTagValues?.pod_name?.length ? availableTagValues.pod_name : ['POD RIG 30', 'POD 31', 'POD 35', 'POD 36', 'Pod 9']))
                    .filter(v => !tagSearches['pod_name'] || String(v).toLowerCase().includes(tagSearches['pod_name'].toLowerCase()))
                    .map(v => {
                      const isSelected = isTagValueActive('pod_name', v);
                      return (
                        <button
                          key={v}
                          type="button"
                          onClick={() => toggleTagValue('pod_name', v)}
                          className={`w-full text-left p-2 rounded-lg text-xs font-mono transition flex items-center justify-between cursor-pointer ${isSelected
                            ? 'bg-amber-500/20 text-amber-200 border border-amber-500/50 shadow-sm'
                            : 'hover:bg-slate-900 text-slate-300 border border-transparent'
                            }`}
                        >
                          <div className="flex items-center gap-2 truncate">
                            <span className={`w-2 h-2 rounded-full ${isSelected ? 'bg-amber-400' : 'bg-slate-700'}`} />
                            <span className="font-semibold truncate">{v}</span>
                          </div>
                          {isSelected && <Check size={13} className="text-amber-400 shrink-0" />}
                        </button>
                      );
                    })}
                </div>
                <div className="p-2 border-t border-slate-800/80 bg-slate-900/60 text-[10px] text-slate-400 flex items-center justify-between">
                  <span>Filter aktif:</span>
                  <span className="font-mono text-amber-300 truncate">
                    {tagFilters.find(tf => tf.key === 'pod_name')?.value || 'Semua'}
                  </span>
                </div>
              </div>

              {/* Dynamic Tag Cards for event_type or root_cause */}
              {['event_type', 'root_cause'].map(tagKey => {
                const vals = availableTagValues?.[tagKey];
                if (!vals || vals.length === 0) return null;
                return (
                  <div key={tagKey} className="w-64 min-w-[250px] max-w-[270px] h-[350px] flex flex-col bg-slate-950/90 border border-slate-800 rounded-xl overflow-hidden shadow-lg hover:border-slate-700/80 transition">
                    <div className="p-2.5 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <Tag size={13} className="text-rose-400" />
                        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-200">{tagKey}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => clearTagKey(tagKey)}
                        className="text-[10px] text-rose-400 hover:underline cursor-pointer"
                      >
                        Reset
                      </button>
                    </div>
                    <div className="p-2 border-b border-slate-800/60 bg-slate-950">
                      <div className="relative">
                        <Search size={12} className="absolute left-2.5 top-2.5 text-slate-500" />
                        <input
                          type="text"
                          placeholder={`Cari ${tagKey}...`}
                          value={tagSearches[tagKey] || ''}
                          onChange={(e) => setTagSearches(prev => ({ ...prev, [tagKey]: e.target.value }))}
                          className="w-full bg-slate-900 text-slate-200 pl-7 pr-2 py-1 rounded-lg text-xs border border-slate-800 focus:outline-none focus:border-rose-500 font-mono"
                        />
                      </div>
                    </div>
                    <div className="flex-1 overflow-y-auto custom-scrollbar p-1.5 space-y-1">
                      {vals
                        .filter(v => !tagSearches[tagKey] || String(v).toLowerCase().includes(tagSearches[tagKey].toLowerCase()))
                        .map(v => {
                          const isSelected = isTagValueActive(tagKey, v);
                          return (
                            <button
                              key={v}
                              type="button"
                              onClick={() => toggleTagValue(tagKey, v)}
                              className={`w-full text-left p-2 rounded-lg text-xs font-mono transition flex items-center justify-between cursor-pointer ${isSelected
                                ? 'bg-rose-500/20 text-rose-200 border border-rose-500/50 shadow-sm'
                                : 'hover:bg-slate-900 text-slate-300 border border-transparent'
                                }`}
                            >
                              <span className="truncate font-semibold">{v}</span>
                              {isSelected && <Check size={13} className="text-rose-400 shrink-0" />}
                            </button>
                          );
                        })}
                    </div>
                    <div className="p-2 border-t border-slate-800/80 bg-slate-900/60 text-[10px] text-slate-400 flex items-center justify-between">
                      <span>Filter:</span>
                      <span className="font-mono text-rose-300 truncate">
                        {tagFilters.find(tf => tf.key === tagKey)?.value || 'Semua'}
                      </span>
                    </div>
                  </div>
                );
              })}

              {/* CARD 6: Tambah Tag Kustom */}
              <div className="w-64 min-w-[250px] max-w-[270px] h-[350px] flex flex-col bg-slate-950/90 border border-slate-800 rounded-xl overflow-hidden shadow-lg hover:border-slate-700/80 transition">
                <div className="p-2.5 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Plus size={13} className="text-cyan-400" />
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-200">Tag Kustom</span>
                  </div>
                  <span className="text-[10px] text-slate-500 font-mono">
                    {tagFilters.filter(tf => !['module_id', 'pod_name', 'event_type', 'root_cause'].includes(tf.key)).length} aktif
                  </span>
                </div>
                <div className="p-2.5 space-y-2 border-b border-slate-800/60 bg-slate-900/40">
                  <input
                    type="text"
                    placeholder="Tag Key (cth: host, port)"
                    value={customTagKey}
                    onChange={(e) => setCustomTagKey(e.target.value)}
                    className="w-full bg-slate-950 text-slate-200 px-2.5 py-1.5 rounded-lg text-xs border border-slate-800 focus:outline-none focus:border-cyan-500 font-mono"
                  />
                  <input
                    type="text"
                    placeholder="Tag Value (cth: 5002)"
                    value={customTagVal}
                    onChange={(e) => setCustomTagVal(e.target.value)}
                    className="w-full bg-slate-950 text-slate-200 px-2.5 py-1.5 rounded-lg text-xs border border-slate-800 focus:outline-none focus:border-cyan-500 font-mono"
                  />
                  <button
                    type="button"
                    onClick={handleAddCustomTag}
                    disabled={!customTagKey.trim() || !customTagVal.trim()}
                    className="w-full py-1.5 rounded-lg bg-cyan-600/20 hover:bg-cyan-600/30 text-cyan-300 border border-cyan-500/40 text-xs font-bold transition disabled:opacity-40 cursor-pointer flex items-center justify-center gap-1"
                  >
                    <Plus size={12} /> Tambahkan Tag
                  </button>
                </div>
                <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-1.5">
                  {tagFilters
                    .filter(tf => !['module_id', 'pod_name', 'event_type', 'root_cause'].includes(tf.key))
                    .map((tf, idx) => (
                      <div key={idx} className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-between text-xs font-mono">
                        <div className="truncate">
                          <span className="text-amber-300 font-semibold">{tf.key}</span>
                          <span className="text-slate-500"> = </span>
                          <span className="text-cyan-300">{tf.value}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setTagFilters(prev => prev.filter((_, i) => i !== idx))}
                          className="p-1 text-rose-400 hover:text-rose-300 cursor-pointer"
                          title="Hapus"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    ))}
                  {tagFilters.filter(tf => !['module_id', 'pod_name', 'event_type', 'root_cause'].includes(tf.key)).length === 0 && (
                    <div className="h-full flex items-center justify-center text-center p-3 text-slate-600 text-xs italic">
                      Belum ada tag kustom tambahan.
                    </div>
                  )}
                </div>
              </div>

              {/* CARD 7: Window & Agregasi */}
              <div className="w-64 min-w-[250px] max-w-[270px] h-[350px] flex flex-col bg-slate-950/90 border border-slate-800 rounded-xl overflow-hidden shadow-lg hover:border-slate-700/80 transition">
                <div className="p-2.5 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Sliders size={13} className="text-amber-400" />
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-200">Window & Fungsi</span>
                  </div>
                </div>
                <div className="flex-1 overflow-y-auto custom-scrollbar p-2.5 space-y-3">
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                      Window Period:
                    </label>
                    <select
                      value={aggregationInterval}
                      onChange={(e) => setAggregationInterval(e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-200 font-mono focus:border-cyan-500 focus:outline-none cursor-pointer"
                    >
                      <option value="none">Raw Data (Tanpa Agregasi)</option>
                      <option value="10s">10 Detik</option>
                      <option value="30s">30 Detik</option>
                      <option value="1m">1 Menit (Standar)</option>
                      <option value="5m">5 Menit</option>
                      <option value="15m">15 Menit</option>
                      <option value="1h">1 Jam</option>
                    </select>
                  </div>

                  {aggregationInterval !== 'none' && (
                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                        Fungsi Agregasi:
                      </label>
                      <div className="grid grid-cols-2 gap-1 font-mono text-xs">
                        {['mean', 'max', 'min', 'last', 'count', 'sum'].map(fn => (
                          <button
                            key={fn}
                            type="button"
                            onClick={() => setAggregationFn(fn)}
                            className={`py-1 px-2 rounded-lg border text-center font-semibold transition cursor-pointer ${aggregationFn === fn
                              ? 'bg-amber-500/20 text-amber-200 border-amber-500/50 shadow-sm'
                              : 'bg-slate-900/80 text-slate-400 hover:text-slate-200 border-slate-800'
                              }`}
                          >
                            {fn}()
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                      Batas Baris (limit):
                    </label>
                    <select
                      value={rowLimit}
                      onChange={(e) => setRowLimit(Number(e.target.value))}
                      className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-200 font-mono focus:border-cyan-500 focus:outline-none cursor-pointer"
                    >
                      <option value={100}>100 Baris</option>
                      <option value={500}>500 Baris</option>
                      <option value={1000}>1.000 Baris</option>
                      <option value={5000}>5.000 Baris</option>
                      <option value={10000}>10.000 Baris</option>
                    </select>
                  </div>
                </div>
                <div className="p-2 border-t border-slate-800/80 bg-slate-900/60 text-[10px] text-slate-400 flex items-center justify-between">
                  <span>Agregasi:</span>
                  <span className="font-mono text-amber-300">{aggregationInterval === 'none' ? 'Raw' : `${aggregationFn}(${aggregationInterval})`}</span>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Flux Query Preview & Raw Editor Box */}
      <div className="border-t border-slate-800/80 pt-3">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Code size={14} className="text-cyan-400" />
            <span className="text-xs font-bold text-slate-300">
              {isManualFluxMode ? 'Editor Query Flux Kustom' : 'Pratinjau Query Flux Otomatis'}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleOpenCreateTemplate}
              className="text-[11px] font-bold text-emerald-300 hover:text-emerald-200 flex items-center gap-1 cursor-pointer bg-emerald-950/60 px-2.5 py-1 rounded border border-emerald-800/60 transition"
              title="Simpan query Flux ini ke template"
            >
              <Save size={12} />
              <span>Simpan Template</span>
            </button>

            <button
              type="button"
              onClick={handleCopyQuery}
              className="text-[11px] font-bold text-slate-400 hover:text-white flex items-center gap-1 cursor-pointer bg-slate-950 px-2 py-1 rounded border border-slate-800"
            >
              {copiedQuery ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
              <span>{copiedQuery ? 'Tersalin!' : 'Salin Query'}</span>
            </button>

            <button
              type="button"
              onClick={() => setIsFluxEditorOpen(!isFluxEditorOpen)}
              className="text-[11px] text-cyan-400 hover:text-cyan-300 font-semibold cursor-pointer"
            >
              {isFluxEditorOpen ? 'Sembunyikan Kode' : 'Tampilkan Kode'}
            </button>
          </div>
        </div>

        {isFluxEditorOpen && (
          <div>
            {isManualFluxMode ? (
              <textarea
                value={manualFluxQuery}
                onChange={(e) => setManualFluxQuery(e.target.value)}
                rows={8}
                className="w-full p-3 rounded-xl bg-slate-950 border border-amber-500/40 text-amber-200 font-mono text-xs focus:outline-none focus:border-amber-400 leading-relaxed shadow-inner"
                placeholder="Ketik atau tempel query Flux di sini..."
              />
            ) : (
              <pre className="p-3.5 rounded-xl bg-slate-950/90 border border-slate-800 text-cyan-300 font-mono text-xs overflow-x-auto leading-relaxed select-all">
                {generatedFluxQuery}
              </pre>
            )}
          </div>
        )}
      </div>

      {/* Action Buttons: Run Query, Export CSV, Export JSON */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-800/80">
        <button
          onClick={handleExecuteQuery}
          disabled={queryLoading}
          className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 via-blue-600 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white font-bold text-xs flex items-center gap-2 transition-all shadow-lg shadow-cyan-500/25 hover:shadow-cyan-500/40 cursor-pointer disabled:opacity-50 active:scale-95"
          title="Eksekusi query (Shortcut: Ctrl+Enter atau Cmd+Enter)"
        >
          {queryLoading ? (
            <RefreshCw size={15} className="animate-spin" />
          ) : (
            <Play size={15} fill="currentColor" />
          )}
          <span>{queryLoading ? 'Mengeksekusi Query...' : 'SUBMIT (Jalankan Query)'}</span>
          <span className="hidden sm:inline-block text-[10px] font-mono px-1.5 py-0.5 rounded bg-black/25 text-cyan-200 ml-1">
            Ctrl+↵
          </span>
        </button>

        <div className="flex items-center gap-2">
          <button
            onClick={() => handleExport('csv')}
            disabled={exportingFormat !== null}
            className="px-3.5 py-2 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/40 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm disabled:opacity-50"
          >
            <Download size={14} className={exportingFormat === 'csv' ? 'animate-bounce' : ''} />
            <span>{exportingFormat === 'csv' ? 'Mengunduh...' : 'Download CSV'}</span>
          </button>

          <button
            onClick={() => handleExport('json')}
            disabled={exportingFormat !== null}
            className="px-3.5 py-2 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/40 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm disabled:opacity-50"
          >
            <FileCode size={14} className={exportingFormat === 'json' ? 'animate-bounce' : ''} />
            <span>{exportingFormat === 'json' ? 'Mengunduh...' : 'Download JSON'}</span>
          </button>
        </div>
      </div>

      {/* Query Error Alert */}
      {queryError && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-200 text-xs flex items-start gap-3">
          <XCircle size={18} className="text-rose-400 shrink-0 mt-0.5" />
          <div>
            <p className="font-bold text-rose-300">Gagal Mengeksekusi Query</p>
            <p className="text-slate-300 mt-0.5">{queryError}</p>
          </div>
        </div>
      )}
    </div>
  );
}
