import React from 'react';
import {
  Sliders,
  Code,
  Sparkles,
  FolderOpen,
  Save,
  Bookmark,
  ShieldCheck,
  Layers,
  Calendar,
  Clock,
  AlertTriangle,
  Info,
  Play,
  RefreshCw,
  X,
  ChevronDown,
  Search,
  Plus,
  Trash2,
  Download,
  FileText,
  Terminal,
  FileCode,
  Check,
  Copy,
} from 'lucide-react';
import {
  MEASUREMENT_COLORS,
  FIELD_COLORS,
  toOriginalDatetimeInput,
} from './podInfluxConstants';

export default function PodInfluxFilterPanel({
  // Mode
  isManualFluxMode,
  setIsManualFluxMode,
  manualFluxQuery,
  setManualFluxQuery,
  generatedFluxQuery,

  // Templates
  templateFeedback,
  setTemplateFeedback,
  templates = [],
  setIsTemplateModalOpen,
  handleOpenCreateTemplate,
  handleApplyTemplate,

  // Buckets
  selectedBuckets = [],
  setSelectedBuckets,
  buckets = [],
  schemaLoading = false,
  handleSelectOnlyBucket,
  handleToggleBucket,

  // Time Range
  timeRangePreset,
  handleSelectTimeRange,
  activeDateShortcut,
  applyDateShortcut,
  customStart,
  setCustomStart,
  customStop,
  setCustomStop,
  setActiveDateShortcut,
  isCustomRangeInvalid,
  isMultiDayCustomRange = false,
  handleSelectSingleDate,
  handleSelectMonth,
  showHeartbeatMeasurementHint,
  customRangeSummary,

  // Measurements
  measurements = [],
  selectedMeasurements = [],
  setSelectedMeasurements,
  selectAllMeasurements,
  resetMeasurements,
  isMeasurementDropdownOpen,
  setIsMeasurementDropdownOpen,
  measurementSearchTerm,
  setMeasurementSearchTerm,
  toggleMeasurement,

  // Fields
  availableFields = [],
  selectedFields = [],
  selectAllFields,
  resetFields,
  isFieldDropdownOpen,
  setIsFieldDropdownOpen,
  fieldSearchTerm,
  setFieldSearchTerm,
  toggleField,

  // Unit & Chair Section
  selectedUnit,
  setSelectedUnit,
  availableUnits = [],
  selectedChairSection,
  setSelectedChairSection,
  availableChairSections = [],

  // Aggregation & Limits
  aggregationInterval,
  setAggregationInterval,
  aggregationFn,
  setAggregationFn,
  rowLimit,
  setRowLimit,

  // Dynamic Tags
  tagFilters = [],
  addTagFilter,
  updateTagFilter,
  removeTagFilter,

  // Actions
  handleExecuteQuery,
  queryLoading = false,
  selectedPodId,
  handleExport,
  exportingFormat,
  handleDownloadChartPdfReport,
  setIsCliModalOpen,
  setCliExecutionResult,
  handleCopyQuery,
  copiedQuery,
}) {
  return (
    <div className="lg:col-span-1 space-y-4">
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 shadow-xl space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Sliders className="w-4 h-4 text-emerald-400" />
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-200">
              Filter Query POD
            </h2>
          </div>

          {/* Interactive Mode Toggle (Visual vs Raw Flux) */}
          <div className="flex items-center p-0.5 bg-slate-950 rounded-lg border border-slate-800/90 shadow-inner">
            <button
              type="button"
              onClick={() => setIsManualFluxMode(false)}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold transition-all duration-200 ${!isManualFluxMode
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm shadow-emerald-500/10'
                : 'text-slate-400 hover:text-slate-200 border border-transparent'
                }`}
              title="Gunakan antarmuka pemilihan filter visual"
            >
              <Sliders className="w-3 h-3 text-emerald-400" />
              <span>Visual</span>
            </button>
            <button
              type="button"
              onClick={() => setIsManualFluxMode(true)}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold transition-all duration-200 ${isManualFluxMode
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm shadow-amber-500/10'
                : 'text-slate-400 hover:text-slate-200 border border-transparent'
                }`}
              title="Tulis atau edit query Flux secara langsung"
            >
              <Code className="w-3 h-3 text-amber-400" />
              <span>Raw Flux</span>
            </button>
          </div>
        </div>

        {/* Template Notification Toast */}
        {templateFeedback && (
          <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/30 rounded-lg text-xs text-emerald-300 flex items-center justify-between gap-2 shadow-sm">
            <div className="flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
              <span className="font-medium">{templateFeedback}</span>
            </div>
            <button
              type="button"
              onClick={() => setTemplateFeedback(null)}
              className="text-slate-400 hover:text-white text-xs px-1"
            >
              ✕
            </button>
          </div>
        )}

        {/* Template Management Bar */}
        <div className="flex items-center justify-between gap-2 pt-1 pb-2 border-b border-slate-800/80">
          <button
            type="button"
            onClick={() => setIsTemplateModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-lg text-xs font-semibold transition"
            title="Buka daftar template query cross-POD"
          >
            <FolderOpen className="w-3.5 h-3.5 text-emerald-400" />
            <span>Template Query</span>
            <span className="ml-0.5 px-1.5 py-0.5 bg-emerald-500/20 text-emerald-300 rounded-full text-[10px]">
              {templates.length}
            </span>
          </button>

          <button
            type="button"
            onClick={handleOpenCreateTemplate}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg text-xs font-semibold transition"
            title="Simpan konfigurasi query saat ini sebagai template cross-POD"
          >
            <Save className="w-3.5 h-3.5 text-cyan-400" />
            <span>Simpan Template</span>
          </button>
        </div>

        {/* Quick Template Chips (1-Click apply to current POD) */}
        {templates.length > 0 && (
          <div className="space-y-1.5 pb-2 border-b border-slate-800/60">
            <div className="flex items-center justify-between text-[11px] text-slate-400">
              <span className="flex items-center gap-1 font-medium">
                <Bookmark className="w-3 h-3 text-emerald-400" />
                Template Cepat:
              </span>
              <button
                type="button"
                onClick={() => setIsTemplateModalOpen(true)}
                className="text-emerald-400 hover:underline text-[10px]"
              >
                Semua ({templates.length})
              </button>
            </div>
            <div
              className="flex items-center gap-1.5 overflow-x-auto py-1 scrollbar-none no-scrollbar"
              style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
              onWheel={(e) => {
                if (e.deltaY !== 0) {
                  e.currentTarget.scrollLeft += e.deltaY;
                }
              }}
            >
              {templates.slice(0, 4).map((tmpl) => (
                <button
                  key={tmpl.id}
                  type="button"
                  onClick={() => handleApplyTemplate(tmpl, false)}
                  className="px-2.5 py-1 bg-slate-950 hover:bg-slate-800 border border-slate-800/90 hover:border-emerald-500/40 rounded-md text-[11px] font-medium text-slate-300 hover:text-emerald-200 whitespace-nowrap transition flex items-center gap-1 group"
                  title={`Terapkan: ${tmpl.description || tmpl.name}`}
                >
                  <Sparkles className="w-2.5 h-2.5 text-emerald-400 opacity-60 group-hover:opacity-100" />
                  <span>{tmpl.name}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {isManualFluxMode ? (
          /* Manual Flux Input Mode */
          <div className="space-y-3">
            <div className="p-2.5 bg-amber-500/10 border border-amber-500/30 rounded-lg text-xs text-amber-300 flex items-start gap-2">
              <ShieldCheck className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
              <span>
                Anda sedang dalam mode Raw Flux. Query harus mematuhi aturan <strong>READ-ONLY</strong>. Mutasi data
                otomatis diblokir server.
              </span>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Flux Query Langsung:
              </label>
              <textarea
                value={manualFluxQuery || generatedFluxQuery}
                onChange={(e) => setManualFluxQuery(e.target.value)}
                rows={12}
                className="w-full bg-slate-950 font-mono text-xs text-emerald-300 p-3 rounded-lg border border-slate-800 focus:outline-none focus:border-emerald-500 transition"
                placeholder="from(bucket: ...) |> range(...) |> filter(...)"
              />
            </div>
          </div>
        ) : (
          /* Visual Filter Form */
          <div className="space-y-4 text-xs">
            {/* Bucket Selection (Multi-Bucket Union Support) */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="font-semibold text-slate-300 flex items-center gap-1.5">
                  <span>Bucket Influx POD:</span>
                  <span className="text-[10px] font-normal text-slate-400">
                    ({selectedBuckets.length} dipilih)
                  </span>
                </label>
                {schemaLoading && (
                  <span className="text-[10px] text-emerald-400 flex items-center gap-1">
                    <RefreshCw className="w-2.5 h-2.5 animate-spin" /> Memuat...
                  </span>
                )}
              </div>

              {/* Quick Preset Buttons */}
              <div className="flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={() => handleSelectOnlyBucket('pod_monitoring')}
                  className={`text-[11px] px-2 py-0.5 rounded border transition ${selectedBuckets.length === 1 && selectedBuckets.includes('pod_monitoring')
                    ? 'bg-emerald-950/70 border-emerald-500 text-emerald-300 font-semibold shadow-sm'
                    : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                    }`}
                >
                  pod_monitoring saja
                </button>
                <button
                  type="button"
                  onClick={() => handleSelectOnlyBucket('power_monitoring')}
                  className={`text-[11px] px-2 py-0.5 rounded border transition ${selectedBuckets.length === 1 && selectedBuckets.includes('power_monitoring')
                    ? 'bg-amber-950/70 border-amber-500 text-amber-300 font-semibold shadow-sm'
                    : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                    }`}
                >
                  power_monitoring saja
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const both = ['pod_monitoring', 'power_monitoring'].filter((name) =>
                      buckets.some((b) => b.name === name)
                    );
                    setSelectedBuckets(both.length > 0 ? both : ['pod_monitoring', 'power_monitoring']);
                  }}
                  className={`text-[11px] px-2 py-0.5 rounded border transition flex items-center gap-1 ${selectedBuckets.includes('pod_monitoring') && selectedBuckets.includes('power_monitoring')
                    ? 'bg-cyan-950/80 border-cyan-500 text-cyan-300 font-semibold shadow-sm ring-1 ring-cyan-500/30'
                    : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                    }`}
                  title="Gabungkan data pod_monitoring dan power_monitoring sekaligus"
                >
                  <Layers className="w-3 h-3 text-cyan-400" />
                  <span>Gabungkan Keduanya</span>
                </button>
              </div>

              {/* Multi-Select Bucket Checkboxes */}
              <div className="bg-slate-950 p-2 rounded-lg border border-slate-800 space-y-1 max-h-40 overflow-y-auto">
                {buckets.map((b) => {
                  const isSelected = selectedBuckets.includes(b.name);
                  const isPower = b.name === 'power_monitoring';
                  return (
                    <label
                      key={b.id || b.name}
                      className={`flex items-center justify-between p-1.5 rounded cursor-pointer transition select-none ${isSelected
                        ? isPower
                          ? 'bg-amber-950/40 border border-amber-800/60 text-amber-200'
                          : 'bg-emerald-950/40 border border-emerald-800/60 text-emerald-200'
                        : 'hover:bg-slate-900/70 border border-transparent text-slate-400'
                        }`}
                    >
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleBucket(b.name)}
                          className="rounded border-slate-700 text-emerald-500 focus:ring-0 cursor-pointer w-3.5 h-3.5"
                        />
                        <span className="font-mono text-xs font-medium">{b.name}</span>
                        {b.type === 'system' && (
                          <span className="text-[10px] text-slate-500 font-mono">(System)</span>
                        )}
                      </div>
                      {isSelected && (
                        <span
                          className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${isPower ? 'bg-amber-900/50 text-amber-300' : 'bg-emerald-900/50 text-emerald-300'
                            }`}
                        >
                          Aktif
                        </span>
                      )}
                    </label>
                  );
                })}
              </div>

              {selectedBuckets.length > 1 && (
                <div className="flex items-center gap-1.5 text-[11px] text-cyan-400 bg-cyan-950/30 border border-cyan-800/40 px-2 py-1.5 rounded">
                  <Layers className="w-3.5 h-3.5 flex-shrink-0" />
                  <span>
                    Multi-bucket Aktif: Flux <code>union()</code> menggabungkan{' '}
                    <strong>{selectedBuckets.length} bucket</strong> ({selectedBuckets.join(', ')}).
                  </span>
                </div>
              )}
            </div>

            {/* Time Range Preset */}
            <div>
              <label className="block font-semibold text-slate-300 mb-1">
                Rentang Waktu (Time Range):
              </label>
              <div className="grid grid-cols-3 gap-1.5">
                {[
                  { label: '15 Menit', val: '-15m' },
                  { label: '1 Jam', val: '-1h' },
                  { label: '6 Jam', val: '-6h' },
                  { label: '24 Jam', val: '-24h' },
                  { label: '7 Hari', val: '-7d' },
                  { label: 'Kustom', val: 'custom' },
                ].map((p) => (
                  <button
                    key={p.val}
                    type="button"
                    onClick={() => handleSelectTimeRange(p.val)}
                    className={`py-1.5 px-2 rounded font-medium border text-center transition ${timeRangePreset === p.val
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50'
                      : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-slate-200'
                      }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>

              {timeRangePreset === 'custom' && (
                <div className="mt-3 p-3.5 rounded-xl bg-slate-950 border border-emerald-500/30 space-y-3 shadow-lg shadow-black/40">
                  {/* Header & Quick Chips */}
                  <div>
                    <div className="flex items-center justify-between gap-1 mb-2">
                      <span className="text-xs font-semibold text-emerald-400 flex items-center gap-1.5">
                        <Calendar size={13} className="text-emerald-400" />
                        <span>Rentang Tanggal & Bulan:</span>
                      </span>
                      <span className="text-[10px] text-slate-400">Pintasan cepat</span>
                    </div>
                    <div className="grid grid-cols-4 gap-1.5">
                      {[
                        { label: '24 Jam', id: 'last24h' },
                        { label: 'Hari Ini', id: 'today' },
                        { label: 'Kemarin', id: 'yesterday' },
                        { label: '7 Hari', id: 'last7d' },
                        { label: '30 Hari', id: 'last30d' },
                        { label: 'Bulan Ini', id: 'thisMonth' },
                        { label: 'Bulan Lalu', id: 'lastMonth' },
                      ].map((chip) => {
                        const isActive = activeDateShortcut === chip.id;
                        return (
                          <button
                            key={chip.id}
                            type="button"
                            onClick={() => applyDateShortcut(chip.id)}
                            className={`text-[11px] py-1 px-1.5 rounded-md border transition font-medium text-center truncate ${isActive
                              ? 'bg-emerald-500/25 text-emerald-300 border-emerald-500/60 shadow-sm shadow-emerald-950 font-semibold'
                              : 'bg-slate-900/90 hover:bg-emerald-500/20 text-slate-300 hover:text-emerald-300 border-slate-800 hover:border-emerald-500/40'
                              }`}
                            title={`Pilih ${chip.label}`}
                          >
                            {chip.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Inputs: Start & Stop Datetime */}
                  <div className="space-y-2.5 pt-2 border-t border-slate-800/80">
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-300">
                          <Clock size={12} className="text-emerald-400 shrink-0" />
                          <span>Mulai (Start):</span>
                        </label>
                        <div className="flex items-center gap-1.5 text-[10px]">
                          <button
                            type="button"
                            onClick={() => {
                              if (customStart) {
                                const datePart = customStart.substring(0, 10);
                                setCustomStart(`${datePart}T00:00`);
                                setActiveDateShortcut(null);
                              }
                            }}
                            className="px-1.5 py-0.5 rounded bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-emerald-300 border border-slate-800 transition"
                            title="Set jam mulai ke 00:00"
                          >
                            00:00
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              if (customStart) {
                                const datePart = customStart.substring(0, 10);
                                setCustomStart(`${datePart}T12:00`);
                                setActiveDateShortcut(null);
                              }
                            }}
                            className="px-1.5 py-0.5 rounded bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-emerald-300 border border-slate-800 transition"
                            title="Set jam mulai ke 12:00"
                          >
                            12:00
                          </button>
                        </div>
                      </div>
                      <input
                        type="datetime-local"
                        value={customStart}
                        onChange={(e) => {
                          setCustomStart(e.target.value);
                          setActiveDateShortcut(null);
                        }}
                        className="w-full bg-slate-900 text-slate-100 px-3 py-1.5 rounded-lg border border-slate-700/80 focus:border-emerald-500 focus:outline-none font-mono text-xs shadow-inner [color-scheme:dark] transition"
                      />
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-300">
                          <Clock size={12} className="text-emerald-400 shrink-0" />
                          <span>Selesai (End):</span>
                        </label>
                        <div className="flex items-center gap-1.5 text-[10px]">
                          <button
                            type="button"
                            onClick={() => {
                              if (customStop) {
                                const datePart = customStop.substring(0, 10);
                                setCustomStop(`${datePart}T23:59`);
                                setActiveDateShortcut(null);
                              }
                            }}
                            className="px-1.5 py-0.5 rounded bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-emerald-300 border border-slate-800 transition"
                            title="Set jam selesai ke 23:59"
                          >
                            23:59
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setCustomStop(toOriginalDatetimeInput(new Date()));
                              setActiveDateShortcut(null);
                            }}
                            className="px-1.5 py-0.5 rounded bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-emerald-300 border border-slate-800 transition"
                            title="Set jam selesai ke waktu sekarang"
                          >
                            Sekarang
                          </button>
                        </div>
                      </div>
                      <input
                        type="datetime-local"
                        value={customStop}
                        onChange={(e) => {
                          setCustomStop(e.target.value);
                          setActiveDateShortcut(null);
                        }}
                        className="w-full bg-slate-900 text-slate-100 px-3 py-1.5 rounded-lg border border-slate-700/80 focus:border-emerald-500 focus:outline-none font-mono text-xs shadow-inner [color-scheme:dark] transition"
                      />
                    </div>
                  </div>

                  {/* Validation Warning if Start > Stop */}
                  {isCustomRangeInvalid && (
                    <div className="p-2.5 rounded-lg bg-amber-950/50 border border-amber-500/50 text-xs text-amber-300 flex items-center gap-2">
                      <AlertTriangle size={14} className="text-amber-400 shrink-0" />
                      <span>Waktu Mulai (Start) harus lebih awal daripada Waktu Selesai (End).</span>
                    </div>
                  )}

                  {/* Smart Multi-Day Aggregation Recommendation */}
                  {isMultiDayCustomRange && aggregationInterval === 'none' && (
                    <div className="p-2.5 rounded-lg bg-cyan-950/40 border border-cyan-500/30 text-xs text-cyan-200 flex items-start justify-between gap-2 shadow-sm">
                      <div className="flex items-start gap-1.5">
                        <Info size={14} className="text-cyan-400 shrink-0 mt-0.5" />
                        <span className="text-[11px] leading-relaxed">
                          Rentang &gt; 24 jam memiliki banyak data per-detik. Disarankan memakai <strong>Jendela Agregasi (15m/1h)</strong> agar data tidak terpotong oleh limit baris.
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setAggregationInterval('15m')}
                        className="px-2 py-0.5 rounded bg-cyan-600 hover:bg-cyan-500 text-white font-semibold text-[10px] shrink-0 transition cursor-pointer"
                      >
                        Set 15m
                      </button>
                    </div>
                  )}

                  {/* Quick 1 Day & 1 Month Pickers */}
                  <div className="space-y-1.5 pt-2 border-t border-slate-800/80">
                    <div className="flex items-center justify-between gap-3 bg-slate-900/70 hover:bg-slate-900 px-3 py-2 rounded-lg border border-slate-800/90 transition">
                      <span className="text-slate-300 font-medium flex items-center gap-2 text-xs shrink-0">
                        <Calendar size={13} className="text-emerald-400 shrink-0" />
                        <span>Pilih 1 Tanggal Penuh:</span>
                      </span>
                      <input
                        type="date"
                        value={customStart ? customStart.substring(0, 10) : ''}
                        onChange={(e) => handleSelectSingleDate(e.target.value)}
                        className="bg-slate-950 text-slate-200 px-2.5 py-1 rounded-md border border-slate-700 text-xs font-mono focus:border-emerald-500 focus:outline-none cursor-pointer [color-scheme:dark] transition shrink-0"
                        title="Pilih 1 tanggal untuk rentang otomatis 00:00:00 s/d 23:59:59"
                      />
                    </div>

                    <div className="flex items-center justify-between gap-3 bg-slate-900/70 hover:bg-slate-900 px-3 py-2 rounded-lg border border-slate-800/90 transition">
                      <span className="text-slate-300 font-medium flex items-center gap-2 text-xs shrink-0">
                        <Calendar size={13} className="text-cyan-400 shrink-0" />
                        <span>Pilih 1 Bulan Penuh:</span>
                      </span>
                      <input
                        type="month"
                        value={customStart ? customStart.substring(0, 7) : ''}
                        onChange={(e) => handleSelectMonth(e.target.value)}
                        className="bg-slate-950 text-slate-200 px-2.5 py-1 rounded-md border border-slate-700 text-xs font-mono focus:border-cyan-500 focus:outline-none cursor-pointer [color-scheme:dark] transition shrink-0"
                        title="Pilih bulan untuk mengatur tanggal 1 s/d akhir bulan otomatis"
                      />
                    </div>
                  </div>

                  {/* Smart Hint: Historical Heartbeat Measurement if date < 2026-09-09 */}
                  {showHeartbeatMeasurementHint && (
                    <div className="p-2.5 rounded-lg bg-cyan-950/60 border border-cyan-500/40 text-xs text-cyan-200 space-y-2 shadow-inner">
                      <div className="flex items-start gap-2">
                        <Info size={15} className="text-cyan-400 shrink-0 mt-0.5" />
                        <div className="text-[11px] leading-relaxed">
                          <span className="font-semibold text-cyan-300">Catatan Data Historis: </span>
                          <span>
                            Pada tanggal sebelum 09 Sep 2026, metrik heartbeat (
                            <code className="bg-cyan-900/70 px-1 py-0.5 rounded text-[10px] font-mono text-cyan-200">
                              hb500-hb508
                            </code>
                            ) tersimpan di measurement{' '}
                            <code className="bg-cyan-900/70 px-1 py-0.5 rounded text-[10px] font-mono text-cyan-100 font-semibold">
                              "heartbeat"
                            </code>{' '}
                            (bukan{' '}
                            <code className="bg-cyan-900/70 px-1 py-0.5 rounded text-[10px] font-mono text-cyan-300">
                              "hb_module"
                            </code>
                            ).
                          </span>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          if (!selectedMeasurements.includes('heartbeat')) {
                            setSelectedMeasurements((prev) => [...prev, 'heartbeat']);
                          }
                        }}
                        className="w-full py-1.5 px-2.5 rounded-md bg-cyan-600 hover:bg-cyan-500 text-white font-medium text-xs transition flex items-center justify-center gap-1 shadow-sm"
                      >
                        + Sertakan measurement "heartbeat" ke Filter
                      </button>
                    </div>
                  )}

                  {/* Live Human-readable Summary Badge */}
                  {customRangeSummary && (
                    <div className="p-2.5 rounded-lg bg-emerald-950/40 border border-emerald-500/30 text-xs text-emerald-300 space-y-1.5 shadow-sm">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <Calendar size={13} className="text-emerald-400 shrink-0" />
                          <span className="text-emerald-400 font-semibold text-[11px] shrink-0">Rentang:</span>
                          <span className="text-emerald-200 font-medium text-xs truncate">
                            {customRangeSummary.label || customRangeSummary}
                          </span>
                        </div>
                        <span className="text-[10px] text-emerald-400/70 shrink-0">(Original _time)</span>
                      </div>
                      {customRangeSummary.fluxRange && (
                        <div className="text-[10.5px] bg-slate-900/90 px-2.5 py-1 rounded border border-emerald-500/25 text-emerald-300/90 font-mono break-all select-all leading-relaxed">
                          {customRangeSummary.fluxRange}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Quick Query Action Inside Custom Box */}
                  <div className="flex items-center justify-between pt-2 border-t border-slate-800/80 gap-2 flex-wrap">
                    <div className="flex items-center gap-2 text-[11px]">
                      <button
                        type="button"
                        onClick={() => applyDateShortcut('last24h')}
                        className="text-slate-400 hover:text-slate-200 underline transition"
                      >
                        Reset 24 Jam
                      </button>
                      <span className="text-slate-600">|</span>
                      <button
                        type="button"
                        onClick={() => applyDateShortcut('today')}
                        className="text-slate-400 hover:text-slate-200 underline transition"
                      >
                        Hari Ini
                      </button>
                      <span className="text-slate-600">|</span>
                      <button
                        type="button"
                        onClick={() => applyDateShortcut('yesterday')}
                        className="text-slate-400 hover:text-slate-200 underline transition"
                      >
                        Kemarin
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleExecuteQuery()}
                      disabled={queryLoading || isCustomRangeInvalid || !selectedPodId}
                      className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs flex items-center gap-1.5 shadow-sm transition disabled:opacity-50 disabled:cursor-not-allowed shrink-0 cursor-pointer"
                      title={
                        !selectedPodId
                          ? 'Pilih POD terlebih dahulu'
                          : isCustomRangeInvalid
                            ? 'Waktu mulai harus lebih awal dari waktu selesai'
                            : 'Jalankan query dengan filter dan rentang kustom aktif'
                      }
                    >
                      {queryLoading ? (
                        <RefreshCw size={12} className="animate-spin" />
                      ) : (
                        <Play size={12} className="fill-current" />
                      )}
                      <span>Jalankan Query Kustom</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Measurement (Multi-Select) */}
            <div className="relative">
              <div className="flex items-center justify-between mb-1">
                <label className="block font-semibold text-slate-300 text-xs">
                  Measurement / Topik ({selectedMeasurements.length} dipilih):
                </label>
                <div className="flex items-center gap-2 text-[11px]">
                  <button
                    type="button"
                    onClick={selectAllMeasurements}
                    className="text-cyan-400 hover:text-cyan-300 underline font-medium transition"
                  >
                    Pilih Semua
                  </button>
                  <span className="text-slate-600">|</span>
                  <button
                    type="button"
                    onClick={resetMeasurements}
                    className="text-slate-400 hover:text-slate-300 underline font-medium transition"
                  >
                    Reset
                  </button>
                </div>
              </div>

              {/* Dropdown Trigger Box with Selected Measurement Pills */}
              <div
                onClick={() => setIsMeasurementDropdownOpen(!isMeasurementDropdownOpen)}
                className="w-full min-h-[42px] bg-slate-950 text-slate-200 p-2 rounded-lg border border-slate-800 hover:border-slate-700 cursor-pointer flex items-center justify-between gap-2 transition"
              >
                <div className="flex flex-wrap items-center gap-1.5 flex-1 max-h-24 overflow-y-auto">
                  {selectedMeasurements.length === 0 ? (
                    <span className="text-slate-500 text-xs italic">Pilih minimal 1 measurement...</span>
                  ) : (
                    selectedMeasurements.map((m, idx) => {
                      const color = MEASUREMENT_COLORS[idx % MEASUREMENT_COLORS.length];
                      return (
                        <span
                          key={m}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-mono border"
                          style={{
                            backgroundColor: `${color}15`,
                            borderColor: `${color}40`,
                            color: color,
                          }}
                        >
                          <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: color }} />
                          {m}
                          {selectedMeasurements.length > 1 && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleMeasurement(m);
                              }}
                              className="hover:opacity-75 p-0.5 rounded hover:bg-white/10 ml-0.5"
                              title={`Hapus ${m}`}
                            >
                              <X className="w-3 h-3" />
                            </button>
                          )}
                        </span>
                      );
                    })
                  )}
                </div>
                <ChevronDown
                  className={`w-4 h-4 text-slate-400 flex-shrink-0 transition-transform duration-200 ${isMeasurementDropdownOpen ? 'transform rotate-180 text-cyan-400' : ''
                    }`}
                />
              </div>

              {/* Dropdown Popover List */}
              {isMeasurementDropdownOpen && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setIsMeasurementDropdownOpen(false)}
                  />

                  <div className="absolute top-full left-0 right-0 mt-1 bg-slate-950 border border-slate-700 rounded-lg shadow-2xl p-2 z-50 space-y-2">
                    {/* Search Input */}
                    <div className="relative">
                      <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
                      <input
                        type="text"
                        placeholder="Cari measurement / sensor..."
                        value={measurementSearchTerm}
                        onChange={(e) => setMeasurementSearchTerm(e.target.value)}
                        onClick={(e) => e.stopPropagation()}
                        className="w-full bg-slate-900 text-slate-200 pl-8 pr-2 py-1.5 rounded text-xs border border-slate-800 focus:outline-none focus:border-cyan-500 font-mono"
                      />
                    </div>

                    {/* List of Measurements */}
                    <div className="max-h-48 overflow-y-auto space-y-1 pr-1 custom-scrollbar">
                      {measurements.filter((m) =>
                        m.toLowerCase().includes(measurementSearchTerm.toLowerCase())
                      ).length === 0 ? (
                        <div className="p-2 text-center text-xs text-slate-500">
                          Tidak ada measurement yang cocok
                        </div>
                      ) : (
                        measurements
                          .filter((m) => m.toLowerCase().includes(measurementSearchTerm.toLowerCase()))
                          .map((m) => {
                            const isSelected = selectedMeasurements.includes(m);
                            const selectedIndex = selectedMeasurements.indexOf(m);
                            const color =
                              selectedIndex !== -1
                                ? MEASUREMENT_COLORS[selectedIndex % MEASUREMENT_COLORS.length]
                                : null;

                            return (
                              <label
                                key={m}
                                onClick={(e) => e.stopPropagation()}
                                className={`flex items-center justify-between p-1.5 rounded cursor-pointer text-xs font-mono transition ${isSelected
                                  ? 'bg-cyan-950/40 text-cyan-200 border border-cyan-900/50'
                                  : 'hover:bg-slate-900 text-slate-300'
                                  }`}
                              >
                                <div className="flex items-center gap-2">
                                  <input
                                    type="checkbox"
                                    checked={isSelected}
                                    onChange={() => toggleMeasurement(m)}
                                    className="rounded border-slate-700 text-cyan-600 focus:ring-0 focus:ring-offset-0 bg-slate-900"
                                  />
                                  <span>{m}</span>
                                </div>
                                {isSelected && color && (
                                  <span
                                    className="w-2.5 h-2.5 rounded-full"
                                    style={{ backgroundColor: color }}
                                  />
                                )}
                              </label>
                            );
                          })
                      )}
                    </div>

                    {/* Footer Helper */}
                    <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-[10px] text-slate-400">
                      <span>
                        {selectedMeasurements.length} dari {measurements.length} dipilih
                      </span>
                      <button
                        type="button"
                        onClick={() => setIsMeasurementDropdownOpen(false)}
                        className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded transition font-medium"
                      >
                        Tutup
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Field (Multi-Select) */}
            <div className="relative">
              <div className="flex items-center justify-between mb-1">
                <label className="block font-semibold text-slate-300 text-xs">
                  Field / Metrik ({selectedFields.length} dipilih):
                </label>
                <div className="flex items-center gap-2 text-[11px]">
                  <button
                    type="button"
                    onClick={selectAllFields}
                    className="text-emerald-400 hover:text-emerald-300 underline font-medium transition"
                  >
                    Pilih Semua
                  </button>
                  <span className="text-slate-600">|</span>
                  <button
                    type="button"
                    onClick={resetFields}
                    className="text-slate-400 hover:text-slate-300 underline font-medium transition"
                  >
                    Reset
                  </button>
                </div>
              </div>

              {/* Dropdown Trigger Box with Selected Field Pills */}
              <div
                onClick={() => setIsFieldDropdownOpen(!isFieldDropdownOpen)}
                className="w-full min-h-[42px] bg-slate-950 text-slate-200 p-2 rounded-lg border border-slate-800 hover:border-slate-700 cursor-pointer flex items-center justify-between gap-2 transition"
              >
                <div className="flex flex-wrap items-center gap-1.5 flex-1 max-h-24 overflow-y-auto">
                  {selectedFields.length === 0 ? (
                    <span className="text-slate-500 text-xs italic">Pilih minimal 1 field...</span>
                  ) : (
                    selectedFields.map((f, idx) => {
                      const color = FIELD_COLORS[idx % FIELD_COLORS.length];
                      return (
                        <span
                          key={f}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-mono border"
                          style={{
                            backgroundColor: `${color}15`,
                            borderColor: `${color}40`,
                            color: color,
                          }}
                        >
                          <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: color }} />
                          {f}
                          {selectedFields.length > 1 && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleField(f);
                              }}
                              className="hover:opacity-75 p-0.5 rounded hover:bg-white/10 ml-0.5"
                              title={`Hapus ${f}`}
                            >
                              <X className="w-3 h-3" />
                            </button>
                          )}
                        </span>
                      );
                    })
                  )}
                </div>
                <ChevronDown
                  className={`w-4 h-4 text-slate-400 flex-shrink-0 transition-transform duration-200 ${isFieldDropdownOpen ? 'transform rotate-180 text-emerald-400' : ''
                    }`}
                />
              </div>

              {/* Dropdown Popover List */}
              {isFieldDropdownOpen && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setIsFieldDropdownOpen(false)}
                  />

                  <div className="absolute top-full left-0 right-0 mt-1 bg-slate-950 border border-slate-700 rounded-lg shadow-2xl p-2 z-50 space-y-2">
                    {/* Search Input */}
                    <div className="relative">
                      <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
                      <input
                        type="text"
                        placeholder="Cari field metrik..."
                        value={fieldSearchTerm}
                        onChange={(e) => setFieldSearchTerm(e.target.value)}
                        onClick={(e) => e.stopPropagation()}
                        className="w-full bg-slate-900 text-slate-200 pl-8 pr-2 py-1.5 rounded text-xs border border-slate-800 focus:outline-none focus:border-emerald-500 font-mono"
                      />
                    </div>

                    {/* List of Fields */}
                    <div className="max-h-48 overflow-y-auto space-y-1 pr-1 custom-scrollbar">
                      {availableFields.filter((f) =>
                        f.toLowerCase().includes(fieldSearchTerm.toLowerCase())
                      ).length === 0 ? (
                        <div className="p-2 text-center text-xs text-slate-500">
                          Tidak ada field yang cocok
                        </div>
                      ) : (
                        availableFields
                          .filter((f) => f.toLowerCase().includes(fieldSearchTerm.toLowerCase()))
                          .map((f) => {
                            const isSelected = selectedFields.includes(f);
                            const selectedIndex = selectedFields.indexOf(f);
                            const color =
                              selectedIndex !== -1 ? FIELD_COLORS[selectedIndex % FIELD_COLORS.length] : null;

                            return (
                              <label
                                key={f}
                                onClick={(e) => e.stopPropagation()}
                                className={`flex items-center justify-between p-1.5 rounded cursor-pointer text-xs font-mono transition ${isSelected
                                  ? 'bg-emerald-950/40 text-emerald-200 border border-emerald-900/50'
                                  : 'hover:bg-slate-900 text-slate-300'
                                  }`}
                              >
                                <div className="flex items-center gap-2">
                                  <input
                                    type="checkbox"
                                    checked={isSelected}
                                    onChange={() => toggleField(f)}
                                    className="rounded border-slate-700 text-emerald-600 focus:ring-0 focus:ring-offset-0 bg-slate-900"
                                  />
                                  <span>{f}</span>
                                </div>
                                {isSelected && color && (
                                  <span
                                    className="w-2.5 h-2.5 rounded-full"
                                    style={{ backgroundColor: color }}
                                    title="Warna pada grafik"
                                  />
                                )}
                              </label>
                            );
                          })
                      )}
                    </div>

                    {/* Footer Helper */}
                    <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-[10px] text-slate-400">
                      <span>
                        {selectedFields.length} dari {availableFields.length} dipilih
                      </span>
                      <button
                        type="button"
                        onClick={() => setIsFieldDropdownOpen(false)}
                        className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded transition font-medium"
                      >
                        Tutup
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Unit Tag (Optional) */}
            <div>
              <label className="block font-semibold text-slate-300 mb-1">
                Filter Tag Unit (Opsional):
              </label>
              <select
                value={selectedUnit}
                onChange={(e) => setSelectedUnit(e.target.value)}
                className="w-full bg-slate-950 text-slate-200 p-2 rounded-lg border border-slate-800 focus:border-emerald-500 focus:outline-none font-medium"
              >
                <option value="all">Semua Unit</option>
                {availableUnits.map((u) => (
                  <option key={u} value={u}>
                    {u}
                  </option>
                ))}
              </select>
            </div>

            {/* Chair Section Tag (mod_chair / power_monitoring) */}
            {(selectedBuckets.includes('power_monitoring') ||
              selectedMeasurements.includes('mod_chair') ||
              availableChairSections.length > 0) && (
                <div>
                  <label className="block font-semibold text-slate-300 mb-1 flex items-center justify-between">
                    <span>Filter Chair Section:</span>
                    <span className="text-[10px] text-amber-400 font-mono">tag: chair_section</span>
                  </label>
                  <select
                    value={selectedChairSection}
                    onChange={(e) => setSelectedChairSection(e.target.value)}
                    className="w-full bg-slate-950 text-amber-300 p-2 rounded-lg border border-slate-800 focus:border-amber-500 focus:outline-none font-medium text-xs"
                  >
                    <option value="all">Semua Section (HM_CUR, PEMF_CUR, all)</option>
                    {(availableChairSections.length > 0
                      ? availableChairSections
                      : ['HM_CUR', 'PEMF_CUR', 'all']
                    ).map((sec) => (
                      <option key={sec} value={sec}>
                        {sec === 'HM_CUR'
                          ? 'HM_CUR (Heating & Massage Current)'
                          : sec === 'PEMF_CUR'
                            ? 'PEMF_CUR (PEMF Coil Current)'
                            : sec}
                      </option>
                    ))}
                  </select>
                </div>
              )}

            {/* Aggregation Window */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block font-semibold text-slate-300 mb-1">
                  Window Period:
                </label>
                <select
                  value={aggregationInterval}
                  onChange={(e) => setAggregationInterval(e.target.value)}
                  className="w-full bg-slate-950 text-slate-200 p-2 rounded-lg border border-slate-800 focus:border-emerald-500 focus:outline-none font-medium"
                >
                  <option value="none">Raw (Tanpa Window)</option>
                  <option value="10s">10 Detik</option>
                  <option value="30s">30 Detik</option>
                  <option value="1m">1 Menit</option>
                  <option value="5m">5 Menit</option>
                  <option value="15m">15 Menit</option>
                  <option value="1h">1 Jam</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">
                  Fungsi Agregasi:
                </label>
                <select
                  value={aggregationFn}
                  disabled={aggregationInterval === 'none'}
                  onChange={(e) => setAggregationFn(e.target.value)}
                  className="w-full bg-slate-950 text-slate-200 p-2 rounded-lg border border-slate-800 focus:border-emerald-500 focus:outline-none font-medium disabled:opacity-40"
                >
                  <option value="mean">Mean (Rata-rata)</option>
                  <option value="max">Max (Maksimal)</option>
                  <option value="min">Min (Minimal)</option>
                  <option value="last">Last (Terakhir)</option>
                  <option value="count">Count (Jumlah)</option>
                  <option value="sum">Sum (Total)</option>
                </select>
              </div>
            </div>

            {/* Row Limit */}
            <div>
              <label className="block font-semibold text-slate-300 mb-1 flex items-center justify-between">
                <span>Limit Pratinjau Baris:</span>
                <span className="text-[10px] text-emerald-400 font-normal">
                  CSV = Full Dump (Semua Baris)
                </span>
              </label>
              <select
                value={rowLimit}
                onChange={(e) => setRowLimit(Number(e.target.value))}
                className="w-full bg-slate-950 text-slate-200 p-2 rounded-lg border border-slate-800 focus:border-emerald-500 focus:outline-none font-medium"
              >
                <option value={100}>100 Baris</option>
                <option value={500}>500 Baris</option>
                <option value={1000}>1.000 Baris (Standar)</option>
                <option value={5000}>5.000 Baris</option>
                <option value={10000}>10.000 Baris</option>
                <option value={0}>Semua Baris (Tanpa Limit / Full Dump)</option>
              </select>
              <p className="text-[10px] text-slate-400 mt-1">
                💡 Tombol <strong>Download CSV</strong> akan selalu mengunduh seluruh baris data historis (Full Dump)
                tanpa terpotong limit pratinjau browser.
              </p>
            </div>

            {/* Additional Dynamic Tags */}
            <div className="pt-2 border-t border-slate-800">
              <div className="flex items-center justify-between mb-2">
                <span className="font-semibold text-slate-300">Filter Tag Tambahan:</span>
                <button
                  type="button"
                  onClick={addTagFilter}
                  className="text-[11px] text-emerald-400 hover:text-emerald-300 flex items-center gap-1"
                >
                  <Plus className="w-3 h-3" /> Tambah Tag
                </button>
              </div>
              {tagFilters.map((t, idx) => (
                <div key={idx} className="flex items-center gap-2 mb-2">
                  <input
                    type="text"
                    placeholder="Tag Key"
                    value={t.key}
                    onChange={(e) => updateTagFilter(idx, 'key', e.target.value)}
                    className="w-1/2 bg-slate-950 p-1.5 rounded border border-slate-800 text-[11px] focus:outline-none focus:border-emerald-500 font-mono"
                  />
                  <input
                    type="text"
                    placeholder="Tag Value"
                    value={t.value}
                    onChange={(e) => updateTagFilter(idx, 'value', e.target.value)}
                    className="w-1/2 bg-slate-950 p-1.5 rounded border border-slate-800 text-[11px] focus:outline-none focus:border-emerald-500 font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => removeTagFilter(idx)}
                    className="p-1 text-slate-500 hover:text-rose-400"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="pt-3 border-t border-slate-800 flex flex-col gap-2">
          <button
            type="button"
            onClick={() => handleExecuteQuery()}
            disabled={queryLoading || !selectedPodId}
            className="w-full py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-semibold text-xs rounded-lg shadow-lg shadow-emerald-600/20 flex items-center justify-center gap-2 transition disabled:opacity-50 cursor-pointer"
          >
            {queryLoading ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Mengeksekusi Query di POD...</span>
              </>
            ) : (
              <>
                <Play className="w-4 h-4 fill-white" />
                <span>Jalankan Query (Tampilkan Data)</span>
              </>
            )}
          </button>

          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={() => handleExport('csv')}
              disabled={exportingFormat !== null || !selectedPodId}
              className="py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-medium border border-slate-700 flex items-center justify-center gap-1.5 transition disabled:opacity-50"
              title="Unduh data mentah ke file CSV (Full Dump)"
            >
              <Download className="w-3.5 h-3.5 text-emerald-400" />
              <span>{exportingFormat === 'csv' ? 'Unduh...' : 'CSV'}</span>
            </button>
            <button
              onClick={() => handleExport('json')}
              disabled={exportingFormat !== null || !selectedPodId}
              className="py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-medium border border-slate-700 flex items-center justify-center gap-1.5 transition disabled:opacity-50"
              title="Unduh data ke format JSON"
            >
              <Download className="w-3.5 h-3.5 text-teal-400" />
              <span>{exportingFormat === 'json' ? 'Unduh...' : 'JSON'}</span>
            </button>
            <button
              onClick={handleDownloadChartPdfReport}
              disabled={exportingFormat !== null || !selectedPodId}
              className="py-2 bg-gradient-to-r from-purple-900/40 to-indigo-900/40 hover:from-purple-900/70 hover:to-indigo-900/70 text-purple-200 rounded-lg text-xs font-medium border border-purple-500/40 hover:border-purple-500/70 flex items-center justify-center gap-1.5 transition disabled:opacity-50 shadow-sm"
              title="Unduh Laporan Grafik PDF Landscape 3 Halaman (PEMF, Temp & Hum, Heartbeat)"
            >
              <FileText className="w-3.5 h-3.5 text-purple-400" />
              <span>{exportingFormat === 'pdf' ? 'Rendering...' : 'Report PDF'}</span>
            </button>
          </div>

          {/* Influx CLI Export Action */}
          <button
            type="button"
            onClick={() => {
              setCliExecutionResult?.(null);
              setIsCliModalOpen?.(true);
            }}
            disabled={!selectedPodId}
            className="w-full mt-2 py-2 px-3 bg-gradient-to-r from-amber-500/15 via-slate-800 to-amber-500/15 hover:from-amber-500/25 hover:to-amber-500/25 text-amber-300 hover:text-amber-200 rounded-lg text-xs font-semibold border border-amber-500/40 hover:border-amber-500/70 flex items-center justify-center gap-2 shadow-sm transition group disabled:opacity-50"
            title="Buka generator perintah Influx CLI (--raw) untuk ekspor skala masif langsung dari terminal atau di POD"
          >
            <Terminal className="w-4 h-4 text-amber-400 group-hover:scale-110 transition-transform" />
            <span>Export via Influx CLI (--raw)</span>
          </button>
        </div>
      </div>

      {/* Live Flux Query Preview */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 shadow-xl">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-300">
            <FileCode className="w-3.5 h-3.5 text-emerald-400" />
            <span>Pratinjau Query Flux</span>
          </div>
          <button
            onClick={handleCopyQuery}
            className="text-[11px] text-slate-400 hover:text-emerald-300 flex items-center gap-1 transition"
          >
            {copiedQuery ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
            <span>{copiedQuery ? 'Tersalin' : 'Salin'}</span>
          </button>
        </div>
        <pre className="p-3 bg-slate-950 text-emerald-300 rounded-lg font-mono text-[11px] overflow-x-auto border border-slate-800/80 leading-relaxed max-h-48">
          {isManualFluxMode ? manualFluxQuery : generatedFluxQuery}
        </pre>
      </div>
    </div>
  );
}
