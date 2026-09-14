import React, { useState, useEffect, useMemo } from 'react';
import {
  Server,
  Database,
  Filter,
  Download,
  RefreshCw,
  ArrowLeft,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Search,
  Sliders,
  Play,
  FileCode,
  Tag,
  BarChart2,
  Key,
  Plus,
  Trash2,
  Layers,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  X,
  Code,
  Copy,
  Check,
  Cpu,
  Activity,
  HardDrive,
  Info,
  Bookmark,
  FolderOpen,
  Save,
  Sparkles,
  Pencil,
  Edit3,
  Calendar,
  Clock,
  Terminal,
  FileSpreadsheet,
  FileText
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend
} from 'recharts';

const FIELD_COLORS = [
  '#10b981', // Emerald
  '#06b6d4', // Cyan
  '#f59e0b', // Amber
  '#a855f7', // Purple
  '#ec4899', // Pink
  '#3b82f6', // Blue
  '#f43f5e', // Rose
  '#14b8a6'  // Teal
];

const MEASUREMENT_COLORS = [
  '#06b6d4', // Cyan
  '#3b82f6', // Blue
  '#8b5cf6', // Violet
  '#10b981', // Emerald
  '#f59e0b', // Amber
  '#ec4899', // Pink
  '#14b8a6', // Teal
  '#6366f1'  // Indigo
];

// Helper to compute safe Y-Axis domain and avoid NaN or collapsing when min === max (e.g. constant heartbeat or current)
const getYDomain = (min, max) => {
  if (min === undefined || max === undefined || !isFinite(min) || !isFinite(max)) {
    return ['auto', 'auto'];
  }
  if (min === max) {
    if (min === 0) return [-0.2, 1.0]; // Provide visible bottom space so value 0 is elevated above the X-axis frame border
    return [Math.max(0, Math.floor(min - 1)), Math.ceil(max + 1)];
  }
  const padding = (max - min) * 0.08;
  return [
    min >= 0 && (min - padding) < 0 ? 0 : Math.floor((min - padding) * 10) / 10,
    Math.ceil((max + padding) * 10) / 10
  ];
};
import {
  fetchPodInfluxListApi,
  fetchPodInfluxHealthApi,
  refreshPodTokenApi,
  fetchPodBucketsApi,
  fetchPodSchemaApi,
  queryPodInfluxDataApi,
  downloadPodInfluxExport,
  fetchPodQueryTemplatesApi,
  savePodQueryTemplateApi,
  updatePodQueryTemplateApi,
  deletePodQueryTemplateApi,
  executePodCliExportApi,
  fetchPodExportFilesApi,
  deletePodExportFileApi,
  getPodExportFileDownloadUrl,
  downloadPodChartPdfReport
} from '../api/podInfluxApi';

export default function PodInfluxDataManagerPage({ onBack }) {
  // POD List & Active Selection
  const [pods, setPods] = useState([]);
  const [podsLoading, setPodsLoading] = useState(true);
  const [selectedPodId, setSelectedPodId] = useState(null);

  // Active POD Health & Token state
  const [podHealth, setPodHealth] = useState(null);
  const [podHealthLoading, setPodHealthLoading] = useState(false);
  const [isTokenModalOpen, setIsTokenModalOpen] = useState(false);
  const [overrideTokenInput, setOverrideTokenInput] = useState('');
  const [tokenRefreshing, setTokenRefreshing] = useState(false);
  const [tokenRefreshResult, setTokenRefreshResult] = useState(null);

  // Schema & Auto-Discovery for selected POD
  const [buckets, setBuckets] = useState([]);
  const [measurements, setMeasurements] = useState([]);
  const [availableFields, setAvailableFields] = useState([]);
  const [availableUnits, setAvailableUnits] = useState([]);
  const [availableChairSections, setAvailableChairSections] = useState([]);
  const [schemaLoading, setSchemaLoading] = useState(false);

  // Query Filter State (Supports multiple buckets via Flux union)
  const [selectedBuckets, setSelectedBuckets] = useState(['pod_monitoring']);
  const selectedBucket = selectedBuckets[0] || 'pod_monitoring'; // backward-compatible accessor

  function handleToggleBucket(bucketName) {
    setSelectedBuckets(prev => {
      if (prev.includes(bucketName)) {
        if (prev.length === 1) return prev; // Keep at least 1 bucket selected
        return prev.filter(b => b !== bucketName);
      } else {
        return [...prev, bucketName];
      }
    });
  }

  function handleSelectOnlyBucket(bucketName) {
    setSelectedBuckets([bucketName]);
  }

  const [timeRangePreset, setTimeRangePreset] = useState('-1h'); // '-15m' | '-1h' | '-6h' | '-24h' | '-7d' | '-30d' | 'custom'
  const [customStart, setCustomStart] = useState('');
  const [customStop, setCustomStop] = useState('');
  const [activeDateShortcut, setActiveDateShortcut] = useState(null);

  // Helper to format Date into HTML datetime-local format (YYYY-MM-DDTHH:mm) using original Influx timestamp
  function toOriginalDatetimeInput(d) {
    if (!d) return '';
    const date = (d instanceof Date) ? d : new Date(d);
    if (isNaN(date.getTime())) return '';
    const pad = (n) => String(n).padStart(2, '0');
    // Using UTC components directly matches the original unshifted timestamp in InfluxDB
    const year = date.getUTCFullYear();
    const month = pad(date.getUTCMonth() + 1);
    const day = pad(date.getUTCDate());
    const hours = pad(date.getUTCHours());
    const minutes = pad(date.getUTCMinutes());
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  }

  // Format date/duration into valid Influx Flux RFC3339 timestamp literal without shifting timezone (pure original time)
  function formatFluxTimeLiteral(val, isStop = false) {
    if (!val) return null;
    const s = String(val).trim();
    if (!s) return null;
    if (/^-\d+[smhdwmo]$/i.test(s) || s === 'now()') return s;
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
      return `${s}${isStop ? 'T23:59:59Z' : 'T00:00:00Z'}`;
    }
    if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(s)) {
      if (isStop && s.endsWith(':59')) {
        return `${s}:59Z`;
      }
      return `${s}:00Z`;
    }
    if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/.test(s)) {
      return `${s}Z`;
    }
    if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d+Z?$/i.test(s)) {
      return s.endsWith('Z') ? s : `${s}Z`;
    }
    return s;
  }

  // Helper to format a data point's original timestamp into readable date & time (YYYY-MM-DD HH:MM:SS)
  function formatPointDateTime(point) {
    if (!point) return '-';
    if (point.fullTime && typeof point.fullTime === 'string' && point.fullTime.includes('T')) {
      const [datePart, timePart] = point.fullTime.split('T');
      const cleanTime = timePart ? timePart.slice(0, 8) : (point.time || '');
      return `${datePart} ${cleanTime}`.trim();
    }
    return point.time || '-';
  }

  // Handle preset selection with auto-init for custom range
  function handleSelectTimeRange(val) {
    setTimeRangePreset(val);
    if (val === 'custom') {
      if (!customStart) {
        const now = new Date();
        const start = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        setCustomStart(toOriginalDatetimeInput(start));
        setCustomStop(toOriginalDatetimeInput(now));
        setActiveDateShortcut('last24h');
      }
    } else {
      setActiveDateShortcut(null);
    }
  }

  // Quick date shortcut chips using original Influx timestamps
  function applyDateShortcut(type) {
    const now = new Date();
    setTimeRangePreset('custom');
    setActiveDateShortcut(type);
    if (type === 'last24h') {
      const start = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      setCustomStart(toOriginalDatetimeInput(start));
      setCustomStop(toOriginalDatetimeInput(now));
    } else if (type === 'today') {
      const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0));
      setCustomStart(toOriginalDatetimeInput(start));
      setCustomStop(toOriginalDatetimeInput(now));
    } else if (type === 'yesterday') {
      const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - 1, 0, 0, 0));
      const stop = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - 1, 23, 59, 59));
      setCustomStart(toOriginalDatetimeInput(start));
      setCustomStop(toOriginalDatetimeInput(stop));
    } else if (type === 'last7d') {
      const start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      setCustomStart(toOriginalDatetimeInput(start));
      setCustomStop(toOriginalDatetimeInput(now));
    } else if (type === 'last30d') {
      const start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      setCustomStart(toOriginalDatetimeInput(start));
      setCustomStop(toOriginalDatetimeInput(now));
    } else if (type === 'thisMonth') {
      const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0));
      setCustomStart(toOriginalDatetimeInput(start));
      setCustomStop(toOriginalDatetimeInput(now));
    } else if (type === 'lastMonth') {
      const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1, 0, 0, 0));
      const stop = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 0, 23, 59, 59));
      setCustomStart(toOriginalDatetimeInput(start));
      setCustomStop(toOriginalDatetimeInput(stop));
    }
  }

  // Quick 1 full date selector (e.g. 2026-09-07)
  function handleSelectSingleDate(dateStr) {
    if (!dateStr) return;
    setTimeRangePreset('custom');
    setActiveDateShortcut(null);
    setCustomStart(`${dateStr}T00:00`);
    setCustomStop(`${dateStr}T23:59`);
  }

  // Quick 1 full month selector
  function handleSelectMonth(monthStr) {
    if (!monthStr) return;
    setTimeRangePreset('custom');
    setActiveDateShortcut(null);
    const [y, m] = monthStr.split('-').map(Number);
    const start = new Date(Date.UTC(y, m - 1, 1, 0, 0, 0));
    const stop = new Date(Date.UTC(y, m, 0, 23, 59, 59));
    setCustomStart(toOriginalDatetimeInput(start));
    setCustomStop(toOriginalDatetimeInput(stop));
  }

  // Check if custom start is after custom stop
  const isCustomRangeInvalid = useMemo(() => {
    if (timeRangePreset !== 'custom' || !customStart || !customStop) return false;
    return customStart > customStop;
  }, [timeRangePreset, customStart, customStop]);

  // Human-readable summary of selected custom range (Original Influx timestamp)
  const customRangeSummary = useMemo(() => {
    if (timeRangePreset !== 'custom' || !customStart) return null;
    try {
      const startText = customStart.replace('T', ' ');
      const stopText = customStop ? customStop.replace('T', ' ') : 'Sekarang (now)';
      const isFullSingleDay = customStart.endsWith('T00:00') && customStop && customStop.endsWith('T23:59') && customStart.substring(0, 10) === customStop.substring(0, 10);
      const formattedStart = formatFluxTimeLiteral(customStart, false);
      const formattedStop = customStop ? formatFluxTimeLiteral(customStop, true) : null;
      return {
        label: isFullSingleDay ? `${customStart.substring(0, 10)} (1 Hari Penuh UTC)` : `${startText}  ➔  ${stopText} (UTC)`,
        fluxRange: formattedStop ? `range(start: ${formattedStart}, stop: ${formattedStop})` : `range(start: ${formattedStart})`
      };
    } catch (e) {
      return null;
    }
  }, [timeRangePreset, customStart, customStop]);
  const [selectedMeasurements, setSelectedMeasurements] = useState(['mod_chair']);
  const [isMeasurementDropdownOpen, setIsMeasurementDropdownOpen] = useState(false);
  const [measurementSearchTerm, setMeasurementSearchTerm] = useState('');
  const selectedMeasurement = selectedMeasurements[0] || '';

  function toggleMeasurement(measurement) {
    if (selectedMeasurements.includes(measurement)) {
      if (selectedMeasurements.length > 1) {
        setSelectedMeasurements(selectedMeasurements.filter(m => m !== measurement));
      }
    } else {
      setSelectedMeasurements([...selectedMeasurements, measurement]);
    }
  }

  function selectAllMeasurements() {
    if (measurements.length > 0) {
      setSelectedMeasurements([...measurements]);
    }
  }

  function resetMeasurements() {
    if (measurements.length > 0) {
      setSelectedMeasurements([measurements[0]]);
    }
  }

  const [selectedFields, setSelectedFields] = useState(['chair_temp']);
  const [isFieldDropdownOpen, setIsFieldDropdownOpen] = useState(false);
  const [fieldSearchTerm, setFieldSearchTerm] = useState('');
  const selectedField = selectedFields[0] || '';
  const [selectedUnit, setSelectedUnit] = useState('all');
  const [selectedChairSection, setSelectedChairSection] = useState('all');
  const [tagFilters, setTagFilters] = useState([]); // [{ key: '', value: '' }]

  function toggleField(field) {
    if (selectedFields.includes(field)) {
      if (selectedFields.length > 1) {
        setSelectedFields(selectedFields.filter(f => f !== field));
      }
    } else {
      setSelectedFields([...selectedFields, field]);
    }
  }

  function selectAllFields() {
    if (availableFields.length > 0) {
      setSelectedFields([...availableFields]);
    }
  }

  function resetFields() {
    if (availableFields.length > 0) {
      setSelectedFields([availableFields[0]]);
    }
  }

  // Detect historical heartbeat data prior to 2026-09-09 (placed after selectedMeasurements and selectedFields)
  const showHeartbeatMeasurementHint = useMemo(() => {
    if (!customStart) return false;
    const startDatePart = customStart.substring(0, 10);
    if (startDatePart && startDatePart < '2026-09-09') {
      const hasHbField = selectedFields.some(f => f.startsWith('hb'));
      const hasHbModule = selectedMeasurements.includes('hb_module');
      const hasHeartbeat = selectedMeasurements.includes('heartbeat');
      return (hasHbModule || hasHbField) && !hasHeartbeat;
    }
    return false;
  }, [customStart, selectedMeasurements, selectedFields]);

  const [aggregationInterval, setAggregationInterval] = useState('none'); // 'none' | '10s' | '1m' | '5m' | '15m' | '1h'
  const [aggregationFn, setAggregationFn] = useState('mean'); // 'mean' | 'max' | 'min' | 'last'
  const [rowLimit, setRowLimit] = useState(1000);

  // Flux Editor / Manual Mode State
  const [isFluxEditorOpen, setIsFluxEditorOpen] = useState(true);
  const [isManualFluxMode, setIsManualFluxMode] = useState(false);
  const [manualFluxQuery, setManualFluxQuery] = useState('');
  const [copiedQuery, setCopiedQuery] = useState(false);

  // Query Result State
  const [queryLoading, setQueryLoading] = useState(false);
  const [queryError, setQueryError] = useState(null);
  const [queryResult, setQueryResult] = useState(null);
  const [showChart, setShowChart] = useState(true);
  const [chartViewMode, setChartViewMode] = useState('split'); // 'split' | 'combined'
  const [tableSearch, setTableSearch] = useState('');
  const [exportingFormat, setExportingFormat] = useState(null); // 'csv' | 'json' | null

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 20;

  // 1. Initial Load: Fetch POD V3 Fleet
  useEffect(() => {
    loadPodList();
  }, []);

  async function loadPodList() {
    try {
      setPodsLoading(true);
      const res = await fetchPodInfluxListApi();
      if (res && res.success && Array.isArray(res.data)) {
        setPods(res.data);
        // Default select first online POD, or first POD
        const onlinePod = res.data.find(p => p.isOnline) || res.data[0];
        if (onlinePod && !selectedPodId) {
          setSelectedPodId(onlinePod.id);
        }
      }
    } catch (err) {
      console.error('Failed to load POD list:', err);
    } finally {
      setPodsLoading(false);
    }
  }

  // Currently active selected POD object
  const activePod = useMemo(() => {
    return pods.find(p => p.id === Number(selectedPodId)) || null;
  }, [pods, selectedPodId]);

  // 1.1 Cross-POD Query Templates State
  const [templates, setTemplates] = useState([]);
  const [templatesLoading, setTemplatesLoading] = useState(false);
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
  const [isSaveTemplateModalOpen, setIsSaveTemplateModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [templateForm, setTemplateForm] = useState({
    id: null,
    name: '',
    description: '',
    category: 'Sensor Hardware',
    isRawFlux: false,
    rawFluxQuery: '',
    config: null
  });
  const [templateSaving, setTemplateSaving] = useState(false);
  const [templateFeedback, setTemplateFeedback] = useState(null);
  const [templateCategoryFilter, setTemplateCategoryFilter] = useState('Semua');
  const [templateSearchTerm, setTemplateSearchTerm] = useState('');

  // Delete Confirmation State (In-app modal, avoids window.confirm issues)
  const [deleteTargetTemplate, setDeleteTargetTemplate] = useState(null);
  const [templateDeleting, setTemplateDeleting] = useState(false);

  useEffect(() => {
    loadTemplates();
  }, []);

  async function loadTemplates() {
    try {
      setTemplatesLoading(true);
      const res = await fetchPodQueryTemplatesApi();
      if (res && res.success && Array.isArray(res.data)) {
        setTemplates(res.data);
      }
    } catch (err) {
      console.warn('Gagal memuat template query:', err.message);
    } finally {
      setTemplatesLoading(false);
    }
  }

  function handleApplyTemplate(tmpl, autoRun = false) {
    if (tmpl.is_raw_flux && tmpl.raw_flux_query) {
      setIsManualFluxMode(true);
      setManualFluxQuery(tmpl.raw_flux_query);
    } else if (tmpl.config) {
      setIsManualFluxMode(false);
      if (tmpl.config.buckets && Array.isArray(tmpl.config.buckets) && tmpl.config.buckets.length > 0) {
        setSelectedBuckets(tmpl.config.buckets);
      } else if (tmpl.config.bucket) {
        setSelectedBuckets(tmpl.config.bucket.includes(',') ? tmpl.config.bucket.split(',') : [tmpl.config.bucket]);
      }
      if (tmpl.config.measurements && Array.isArray(tmpl.config.measurements) && tmpl.config.measurements.length > 0) {
        setSelectedMeasurements(tmpl.config.measurements);
      } else if (tmpl.config.measurement) {
        setSelectedMeasurements([tmpl.config.measurement]);
      }
      if (tmpl.config.fields && Array.isArray(tmpl.config.fields) && tmpl.config.fields.length > 0) {
        setSelectedFields(tmpl.config.fields);
      } else if (tmpl.config.field) {
        setSelectedFields([tmpl.config.field]);
      }
      if (tmpl.config.unit) setSelectedUnit(tmpl.config.unit);
      if (tmpl.config.timeRange) setTimeRangePreset(tmpl.config.timeRange);
      if (tmpl.config.customStart) setCustomStart(tmpl.config.customStart);
      if (tmpl.config.customStop) setCustomStop(tmpl.config.customStop);
      if (tmpl.config.aggregation) setAggregationInterval(tmpl.config.aggregation);
      if (tmpl.config.aggFn) setAggregationFn(tmpl.config.aggFn);
      if (tmpl.config.limit) setRowLimit(tmpl.config.limit);
      if (tmpl.config.tags && typeof tmpl.config.tags === 'object') {
        setTagFilters(Object.entries(tmpl.config.tags).map(([key, value]) => ({ key, value })));
      } else {
        setTagFilters([]);
      }
    }

    setIsTemplateModalOpen(false);
    setTemplateFeedback(`Template "${tmpl.name}" berhasil diterapkan ke ${activePod?.name || 'POD'}!`);
    setTimeout(() => setTemplateFeedback(null), 4500);

    if (autoRun) {
      setTimeout(() => {
        handleExecuteQuery();
      }, 150);
    }
  }

  // Open modal in Create mode pre-filled with current query
  function handleOpenCreateTemplate() {
    setIsEditMode(false);
    setTemplateForm({
      id: null,
      name: `${selectedMeasurements.join(', ') || 'Query'} - ${selectedFields.join(', ') || ''}`,
      description: `Template query sensor ${selectedMeasurements.join(', ') || ''} untuk armada POD`,
      category: 'Sensor Hardware',
      isRawFlux: isManualFluxMode,
      rawFluxQuery: isManualFluxMode ? (manualFluxQuery || generatedFluxQuery) : '',
      config: !isManualFluxMode ? {
        bucket: selectedBuckets[0] || 'pod_monitoring',
        buckets: selectedBuckets,
        measurement: selectedMeasurements[0] || '',
        measurements: selectedMeasurements,
        field: selectedFields[0] || '',
        fields: selectedFields,
        unit: selectedUnit,
        timeRange: timeRangePreset,
        customStart: timeRangePreset === 'custom' ? customStart : undefined,
        customStop: timeRangePreset === 'custom' ? customStop : undefined,
        aggregation: aggregationInterval,
        aggFn: aggregationFn,
        limit: rowLimit,
        tags: tagFilters.reduce((acc, curr) => {
          if (curr.key && curr.value) acc[curr.key.trim()] = curr.value.trim();
          return acc;
        }, {})
      } : null
    });
    setIsSaveTemplateModalOpen(true);
  }

  // Open modal in Edit mode for a specific template
  function handleOpenEditTemplate(tmpl) {
    setIsEditMode(true);
    setTemplateForm({
      id: tmpl.id,
      name: tmpl.name,
      description: tmpl.description || '',
      category: tmpl.category || 'Sensor Hardware',
      isRawFlux: Boolean(tmpl.is_raw_flux),
      rawFluxQuery: tmpl.raw_flux_query || '',
      config: tmpl.config || {}
    });
    setIsSaveTemplateModalOpen(true);
  }

  // Sync current query filters into the template form (when editing)
  function handleSyncCurrentQueryToTemplate() {
    setTemplateForm(prev => ({
      ...prev,
      isRawFlux: isManualFluxMode,
      rawFluxQuery: isManualFluxMode ? (manualFluxQuery || generatedFluxQuery) : '',
      config: !isManualFluxMode ? {
        bucket: selectedBuckets[0] || 'pod_monitoring',
        buckets: selectedBuckets,
        measurement: selectedMeasurements[0] || '',
        measurements: selectedMeasurements,
        field: selectedFields[0] || '',
        fields: selectedFields,
        unit: selectedUnit,
        timeRange: timeRangePreset,
        customStart: timeRangePreset === 'custom' ? customStart : undefined,
        customStop: timeRangePreset === 'custom' ? customStop : undefined,
        aggregation: aggregationInterval,
        aggFn: aggregationFn,
        limit: rowLimit,
        tags: tagFilters.reduce((acc, curr) => {
          if (curr.key && curr.value) acc[curr.key.trim()] = curr.value.trim();
          return acc;
        }, {})
      } : null
    }));
  }

  // Save (Create or Update) handler
  async function handleSaveTemplate() {
    if (!templateForm.name.trim()) {
      alert('Nama template tidak boleh kosong.');
      return;
    }

    setTemplateSaving(true);
    try {
      if (isEditMode && templateForm.id) {
        // UPDATE Existing
        const payload = {
          name: templateForm.name.trim(),
          description: templateForm.description.trim(),
          category: templateForm.category || 'Sensor Hardware',
          isRawFlux: templateForm.isRawFlux,
          rawFluxQuery: templateForm.isRawFlux ? templateForm.rawFluxQuery : null,
          config: !templateForm.isRawFlux ? templateForm.config : null
        };

        const res = await updatePodQueryTemplateApi(templateForm.id, payload);
        if (res && res.success) {
          setTemplates(prev => prev.map(t => (t.id === templateForm.id ? { ...t, ...payload, id: templateForm.id } : t)));
          setIsSaveTemplateModalOpen(false);
          setTemplateFeedback(`Template "${payload.name}" berhasil diperbarui!`);
          setTimeout(() => setTemplateFeedback(null), 4500);
          await loadTemplates();
        } else {
          alert(res?.error || 'Gagal memperbarui template.');
        }
      } else {
        // CREATE New
        const payload = {
          name: templateForm.name.trim(),
          description: templateForm.description.trim(),
          category: templateForm.category || 'Sensor Hardware',
          isRawFlux: templateForm.isRawFlux,
          rawFluxQuery: templateForm.isRawFlux ? templateForm.rawFluxQuery : null,
          config: !templateForm.isRawFlux ? templateForm.config : null
        };

        const res = await savePodQueryTemplateApi(payload);
        if (res && res.success) {
          if (res.data) {
            setTemplates(prev => [res.data, ...prev]);
          }
          setIsSaveTemplateModalOpen(false);
          setTemplateFeedback(`Template "${payload.name}" berhasil disimpan! Dapat dipanggil di semua POD.`);
          setTimeout(() => setTemplateFeedback(null), 4500);
          await loadTemplates();
        } else {
          alert(res?.error || 'Gagal menyimpan template.');
        }
      }
    } catch (err) {
      alert('Gagal menyimpan template: ' + err.message);
    } finally {
      setTemplateSaving(false);
    }
  }

  // Delete Template with direct in-app confirmation
  async function handleConfirmDeleteTemplate() {
    if (!deleteTargetTemplate) return;
    const { id, name } = deleteTargetTemplate;
    setTemplateDeleting(true);
    try {
      // Optimistic delete
      setTemplates(prev => prev.filter(t => t.id !== id));
      const res = await deletePodQueryTemplateApi(id);
      if (res && res.success) {
        setTemplateFeedback(`Template "${name}" berhasil dihapus.`);
        setTimeout(() => setTemplateFeedback(null), 4000);
      } else {
        await loadTemplates();
        alert(res?.error || 'Gagal menghapus template.');
      }
    } catch (err) {
      await loadTemplates();
      alert('Gagal menghapus template: ' + err.message);
    } finally {
      setTemplateDeleting(false);
      setDeleteTargetTemplate(null);
    }
  }

  // 2. When selected POD changes, check health and load buckets
  useEffect(() => {
    if (!selectedPodId) return;

    loadPodHealth(selectedPodId);
    loadPodBuckets(selectedPodId);
  }, [selectedPodId]);

  async function loadPodHealth(podId) {
    try {
      setPodHealthLoading(true);
      const res = await fetchPodInfluxHealthApi(podId);
      if (res && res.success) {
        setPodHealth(res.data);
      }
    } catch (err) {
      console.error('Failed to load pod health:', err);
    } finally {
      setPodHealthLoading(false);
    }
  }

  async function loadPodBuckets(podId) {
    try {
      setSchemaLoading(true);
      const res = await fetchPodBucketsApi(podId);
      if (res && res.success && Array.isArray(res.data)) {
        setBuckets(res.data);
        // Ensure selectedBuckets have valid buckets
        setSelectedBuckets(prev => {
          const valid = prev.filter(bName => res.data.some(b => b.name === bName));
          if (valid.length > 0) return valid;
          const hasMonitoring = res.data.some(b => b.name === 'pod_monitoring');
          if (hasMonitoring) return ['pod_monitoring'];
          return res.data.length > 0 ? [res.data[0].name] : ['pod_monitoring'];
        });
      }
    } catch (err) {
      console.error('Failed to load pod buckets:', err);
    } finally {
      setSchemaLoading(false);
    }
  }

  // 3. When bucket(s) or measurement changes, load schema
  const bucketKey = selectedBuckets.join(',');
  const measurementKey = selectedMeasurements.join(',');

  useEffect(() => {
    if (!selectedPodId || selectedBuckets.length === 0) return;
    loadPodSchema(selectedPodId, selectedBuckets, selectedMeasurements);
  }, [selectedPodId, bucketKey, measurementKey]);

  async function loadPodSchema(podId, bucketsParam, currentSelectedM) {
    try {
      setSchemaLoading(true);
      const res = await fetchPodSchemaApi(podId, bucketsParam, currentSelectedM);
      if (res && res.success && res.data) {
        if (Array.isArray(res.data.measurements) && res.data.measurements.length > 0) {
          setMeasurements(res.data.measurements);
          // Only update selectedMeasurements if any of current selections are invalid in new bucket
          setSelectedMeasurements(prev => {
            const valid = prev.filter(m => res.data.measurements.includes(m));
            if (valid.length === prev.length && valid.every((m, idx) => m === prev[idx])) {
              return prev; // Same reference, avoids triggering effects
            }
            return valid.length > 0 ? valid : [res.data.measurements[0]];
          });
        }
        if (Array.isArray(res.data.fields) && res.data.fields.length > 0) {
          setAvailableFields(res.data.fields);
          // Only update selectedFields if any of current selections are invalid in new schema
          setSelectedFields(prev => {
            const valid = prev.filter(f => res.data.fields.includes(f));
            if (valid.length === prev.length && valid.every((f, idx) => f === prev[idx])) {
              return prev; // Same reference, avoids triggering effects
            }
            return valid.length > 0 ? valid : [res.data.fields[0]];
          });
        }
        if (Array.isArray(res.data.units)) {
          setAvailableUnits(res.data.units);
        }
        if (Array.isArray(res.data.chairSections)) {
          setAvailableChairSections(res.data.chairSections);
        }
      }
    } catch (err) {
      console.error('Failed to load pod schema:', err);
    } finally {
      setSchemaLoading(false);
    }
  }

  // Helper to build single bucket Flux pipeline branch
  function buildClientFluxBranch(bucketName, isSingleBucket = true) {
    const lines = [];
    lines.push(`from(bucket: "${bucketName || 'pod_monitoring'}")`);

    if (timeRangePreset === 'custom') {
      const formattedStart = customStart ? formatFluxTimeLiteral(customStart, false) : null;
      const formattedStop = customStop ? formatFluxTimeLiteral(customStop, true) : null;
      if (formattedStart) {
        if (formattedStop) {
          lines.push(`  |> range(start: ${formattedStart}, stop: ${formattedStop})`);
        } else {
          lines.push(`  |> range(start: ${formattedStart})`);
        }
      } else {
        lines.push(`  |> range(start: -24h)`);
      }
    } else {
      lines.push(`  |> range(start: ${timeRangePreset || '-1h'})`);
    }

    if (selectedMeasurements.length === 1) {
      lines.push(`  |> filter(fn: (r) => r["_measurement"] == "${selectedMeasurements[0].trim()}")`);
    } else if (selectedMeasurements.length > 1) {
      const mConditions = selectedMeasurements.map(m => `r["_measurement"] == "${m.trim()}"`).join(' or ');
      lines.push(`  |> filter(fn: (r) => ${mConditions})`);
    }

    if (selectedFields.length === 1) {
      lines.push(`  |> filter(fn: (r) => r["_field"] == "${selectedFields[0].trim()}")`);
    } else if (selectedFields.length > 1) {
      const fieldConditions = selectedFields.map(f => `r["_field"] == "${f.trim()}"`).join(' or ');
      lines.push(`  |> filter(fn: (r) => ${fieldConditions})`);
    }

    if (selectedUnit && selectedUnit !== 'all' && selectedUnit.trim() !== '') {
      lines.push(`  |> filter(fn: (r) => r["unit"] == "${selectedUnit.trim()}")`);
    }

    if (selectedChairSection && selectedChairSection !== 'all' && selectedChairSection.trim() !== '') {
      lines.push(`  |> filter(fn: (r) => r["chair_section"] == "${selectedChairSection.trim()}")`);
    }

    tagFilters.forEach(t => {
      if (t.key && t.value) {
        lines.push(`  |> filter(fn: (r) => r["${t.key.trim()}"] == "${t.value.trim()}")`);
      }
    });

    if (aggregationInterval && aggregationInterval !== 'none') {
      if (['mean', 'sum'].includes(aggregationFn || 'mean')) {
        lines.push(`  |> toFloat()`);
      }
      lines.push(`  |> aggregateWindow(every: ${aggregationInterval}, fn: ${aggregationFn || 'mean'}, createEmpty: false)`);
      if (isSingleBucket) {
        lines.push(`  |> yield(name: "${aggregationFn || 'mean'}")`);
      }
    }

    // When multi-bucket union is active, explicitly inject bucket column so CSV and data preview identify the origin bucket
    if (!isSingleBucket) {
      lines.push(`  |> set(key: "bucket", value: "${bucketName}")`);
    }

    if (isSingleBucket && rowLimit && Number(rowLimit) > 0) {
      lines.push(`  |> limit(n: ${Number(rowLimit)})`);
    }

    return lines.join('\n');
  }

  // Construct live Flux Query (supports single bucket or multi-bucket union)
  const generatedFluxQuery = useMemo(() => {
    const activeBuckets = selectedBuckets.length > 0 ? selectedBuckets : ['pod_monitoring'];
    if (activeBuckets.length <= 1) {
      return buildClientFluxBranch(activeBuckets[0], true);
    }

    // Multi-bucket union
    const branchLines = [];
    const tableVars = [];

    activeBuckets.forEach((bName, idx) => {
      const varName = `b${idx}`;
      tableVars.push(varName);
      const branchStr = buildClientFluxBranch(bName, false);
      branchLines.push(`${varName} = ${branchStr}`);
    });

    branchLines.push(`union(tables: [${tableVars.join(', ')}])`);

    if (aggregationInterval && aggregationInterval !== 'none') {
      branchLines.push(`  |> yield(name: "${aggregationFn || 'mean'}")`);
    }

    if (rowLimit && Number(rowLimit) > 0) {
      branchLines.push(`  |> limit(n: ${Number(rowLimit)})`);
    }

    return branchLines.join('\n');
  }, [
    selectedBuckets,
    timeRangePreset,
    customStart,
    customStop,
    selectedMeasurements,
    selectedFields,
    selectedUnit,
    selectedChairSection,
    tagFilters,
    aggregationInterval,
    aggregationFn,
    rowLimit
  ]);

  // Execute Query
  async function handleExecuteQuery() {
    if (!selectedPodId) return;

    setQueryLoading(true);
    setQueryError(null);
    setCurrentPage(1);

    try {
      const payload = {
        bucket: selectedBuckets[0] || 'pod_monitoring',
        buckets: selectedBuckets,
        timeRange: timeRangePreset === 'custom' ? undefined : timeRangePreset,
        customStart: timeRangePreset === 'custom' ? formatFluxTimeLiteral(customStart, false) : undefined,
        customStop: timeRangePreset === 'custom' ? formatFluxTimeLiteral(customStop, true) : undefined,
        measurement: selectedMeasurements[0] || null,
        measurements: selectedMeasurements,
        field: selectedFields[0] || null,
        fields: selectedFields,
        unit: selectedUnit !== 'all' ? selectedUnit : undefined,
        chair_section: selectedChairSection !== 'all' ? selectedChairSection : undefined,
        tags: tagFilters.reduce((acc, curr) => {
          if (curr.key && curr.value) acc[curr.key.trim()] = curr.value.trim();
          return acc;
        }, {}),
        aggregation: aggregationInterval,
        aggFn: aggregationFn,
        limit: rowLimit > 0 ? Number(rowLimit) : null,
        rawFluxQuery: isManualFluxMode ? manualFluxQuery : undefined
      };

      const res = await queryPodInfluxDataApi(selectedPodId, payload);
      if (res && res.success) {
        setQueryResult(res);
      } else {
        setQueryError(res?.error || 'Gagal mengeksekusi query di Influx POD.');
      }
    } catch (err) {
      setQueryError(err.message || 'Terjadi kesalahan jaringan saat memanggil Influx POD.');
    } finally {
      setQueryLoading(false);
    }
  }

  // Export Data (Full Dump: Mengunduh semua baris tanpa batas limit)
  async function handleExport(format = 'csv') {
    if (!selectedPodId) return;
    setExportingFormat(format);
    try {
      const payload = {
        bucket: selectedBuckets[0] || 'pod_monitoring',
        buckets: selectedBuckets,
        timeRange: timeRangePreset === 'custom' ? undefined : timeRangePreset,
        customStart: timeRangePreset === 'custom' ? formatFluxTimeLiteral(customStart, false) : undefined,
        customStop: timeRangePreset === 'custom' ? formatFluxTimeLiteral(customStop, true) : undefined,
        measurement: selectedMeasurements[0] || null,
        measurements: selectedMeasurements,
        field: selectedFields[0] || null,
        fields: selectedFields,
        unit: selectedUnit !== 'all' ? selectedUnit : undefined,
        chair_section: selectedChairSection !== 'all' ? selectedChairSection : undefined,
        tags: tagFilters.reduce((acc, curr) => {
          if (curr.key && curr.value) acc[curr.key.trim()] = curr.value.trim();
          return acc;
        }, {}),
        aggregation: aggregationInterval,
        aggFn: aggregationFn,
        limit: null, // Full Dump: Unduh semua baris tanpa batasan
        rawFluxQuery: isManualFluxMode ? manualFluxQuery : undefined
      };

      await downloadPodInfluxExport(selectedPodId, payload, format);
    } catch (err) {
      alert(`Gagal download ${format.toUpperCase()}: ${err.message}`);
    } finally {
      setExportingFormat(null);
    }
  }

  // Download 3-Page Sensor Chart PDF Report (Landscape matching report.pdf)
  async function handleDownloadChartPdfReport() {
    if (!selectedPodId) return;
    setExportingFormat('pdf');
    try {
      let targetDate = new Date().toISOString().slice(0, 10);
      if (customStart) {
        targetDate = customStart.slice(0, 10);
      } else if (queryResult?.data?.[0]?._time) {
        targetDate = queryResult.data[0]._time.slice(0, 10);
      }

      const effectiveFluxQuery = isManualFluxMode ? (manualFluxQuery || generatedFluxQuery) : generatedFluxQuery;
      // Strip preview limit so the report queries the full time range
      let reportFluxQuery = effectiveFluxQuery;
      if (reportFluxQuery) {
        reportFluxQuery = reportFluxQuery
          .split('\n')
          .filter(line => !line.trim().startsWith('|> limit('))
          .join('\n');
      }

      await downloadPodChartPdfReport(selectedPodId, {
        date: targetDate,
        startTime: timeRangePreset === 'custom' && customStart ? formatFluxTimeLiteral(customStart, false) : undefined,
        stopTime: timeRangePreset === 'custom' && customStop ? formatFluxTimeLiteral(customStop, true) : undefined,
        range: timeRangePreset !== 'custom' ? timeRangePreset : undefined,
        moduleName: activePod?.name || 'Chair',
        moduleId: String(selectedPodId || 502),
        bucket: selectedBuckets.length > 0 ? selectedBuckets.join(',') : 'pod_monitoring',
        rawFluxQuery: reportFluxQuery,
        timeZone: 'Original'
      });
    } catch (err) {
      alert(`Gagal download Laporan PDF Grafik: ${err.message}`);
    } finally {
      setExportingFormat(null);
    }
  }

  // Refresh Token Handler
  async function handleRefreshToken(overrideToken = null) {
    if (!selectedPodId) return;
    setTokenRefreshing(true);
    setTokenRefreshResult(null);
    try {
      const res = await refreshPodTokenApi(selectedPodId, overrideToken);
      setTokenRefreshResult(res);
      // Reload health & pod list
      await loadPodHealth(selectedPodId);
      await loadPodList();
      await loadPodBuckets(selectedPodId);
    } catch (err) {
      setTokenRefreshResult({ success: false, error: err.message });
    } finally {
      setTokenRefreshing(false);
    }
  }

  // Influx CLI Export States
  const [isCliModalOpen, setIsCliModalOpen] = useState(false);
  const [cliTab, setCliTab] = useState('pod_ssh'); // 'pod_ssh' | 'remote' | 'script'
  const [cliIncludeLimit, setCliIncludeLimit] = useState(false); // default false: Full data tanpa limit (seperti 502_mod_chair.csv)
  const [copiedCliCmd, setCopiedCliCmd] = useState(false);
  const [cliExecuting, setCliExecuting] = useState(false);
  const [cliExecutionResult, setCliExecutionResult] = useState(null);

  // Target filename for CLI export
  const defaultCliFilename = useMemo(() => {
    const meas = selectedMeasurements[0] || 'measurement';
    const d = new Date();
    const pad = n => String(n).padStart(2, '0');
    const timeStr = `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}_${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
    return `pod_${selectedPodId || 'x'}_${meas}_${timeStr}.csv`;
  }, [selectedMeasurements, selectedPodId]);

  const [cliCustomFilename, setCliCustomFilename] = useState('');
  const activeCliFilename = useMemo(() => {
    if (cliCustomFilename && cliCustomFilename.trim()) {
      return cliCustomFilename.trim();
    }
    return defaultCliFilename;
  }, [cliCustomFilename, defaultCliFilename]);

  // Direct Flux Query Editing inside CLI modal
  const [cliEditQueryMode, setCliEditQueryMode] = useState(false);
  const [cliManualFluxOverride, setCliManualFluxOverride] = useState('');

  // Clean Flux Query for CLI (with or without limit)
  const cliFluxQuery = useMemo(() => {
    if (cliEditQueryMode && cliManualFluxOverride.trim()) {
      return cliManualFluxOverride.trim();
    }
    const baseQuery = isManualFluxMode ? manualFluxQuery : generatedFluxQuery;
    if (!baseQuery) return '';
    if (cliIncludeLimit) {
      return baseQuery;
    }
    // Strip |> limit(...) if user unchecks limit (to enable Full Dump like 502_mod_chair.csv)
    return baseQuery
      .split('\n')
      .filter(line => !line.trim().startsWith('|> limit('))
      .join('\n');
  }, [cliEditQueryMode, cliManualFluxOverride, isManualFluxMode, manualFluxQuery, generatedFluxQuery, cliIncludeLimit]);

  // Command for Local POD (Terminal SSH / Shell)
  const podSshCliCommand = useMemo(() => {
    const escapedQuery = (cliFluxQuery || '').replace(/'/g, "'\\''");
    return `influx query '${escapedQuery}' --org "pod" --raw > /home/pod/exports/${activeCliFilename}`;
  }, [cliFluxQuery, activeCliFilename]);

  // Active CLI command for local SSH execution
  const activeCliCommand = useMemo(() => {
    return podSshCliCommand;
  }, [podSshCliCommand]);

  function handleCopyCliCommand() {
    navigator.clipboard.writeText(activeCliCommand);
    setCopiedCliCmd(true);
    setTimeout(() => setCopiedCliCmd(false), 2500);
  }

  async function handleRunCliExportOnPod() {
    if (!selectedPodId) return;
    setCliExecuting(true);
    setCliExecutionResult(null);
    try {
      const res = await executePodCliExportApi(selectedPodId, {
        rawFluxQuery: cliFluxQuery,
        customFilename: activeCliFilename,
        bucket: selectedBuckets.join(','),
        buckets: selectedBuckets
      });
      setCliExecutionResult({ success: true, data: res.data });
      await loadPodExportFiles(selectedPodId);
    } catch (err) {
      setCliExecutionResult({ success: false, error: err.message });
    } finally {
      setCliExecuting(false);
    }
  }

  // Pod Export Files Manager States
  const [exportFiles, setExportFiles] = useState([]);
  const [exportFilesLoading, setExportFilesLoading] = useState(false);
  const [exportFilesError, setExportFilesError] = useState(null);
  const [copiedScpFilename, setCopiedScpFilename] = useState(null);
  const [deletingFilename, setDeletingFilename] = useState(null);

  async function loadPodExportFiles(podId = selectedPodId) {
    if (!podId) return;
    setExportFilesLoading(true);
    setExportFilesError(null);
    try {
      const res = await fetchPodExportFilesApi(podId);
      if (res && res.success) {
        setExportFiles(res.data || []);
      }
    } catch (err) {
      console.warn('Gagal memuat daftar berkas ekspor di POD:', err.message);
      setExportFilesError(err.message);
    } finally {
      setExportFilesLoading(false);
    }
  }

  // Load export files when modal opens or pod changes
  useEffect(() => {
    if (isCliModalOpen && selectedPodId) {
      loadPodExportFiles(selectedPodId);
    }
  }, [isCliModalOpen, selectedPodId]);

  function handleCopyScpCommand(file) {
    if (!file?.scpCommand) return;
    navigator.clipboard.writeText(file.scpCommand);
    setCopiedScpFilename(file.fileName);
    setTimeout(() => setCopiedScpFilename(null), 2500);
  }

  function handleDirectDownload(file) {
    if (!file?.fileName || !selectedPodId) return;
    const downloadUrl = getPodExportFileDownloadUrl(selectedPodId, file.fileName);
    const a = document.createElement('a');
    a.href = downloadUrl;
    a.download = file.fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }

  async function handleDeleteExportFile(filename) {
    if (!window.confirm(`Hapus berkas "${filename}" dari POD? Data yang dihapus tidak dapat dikembalikan.`)) {
      return;
    }
    setDeletingFilename(filename);
    try {
      await deletePodExportFileApi(selectedPodId, filename);
      await loadPodExportFiles(selectedPodId);
    } catch (err) {
      alert(`Gagal menghapus berkas: ${err.message}`);
    } finally {
      setDeletingFilename(null);
    }
  }

  // Copy Query
  function handleCopyQuery() {
    const textToCopy = isManualFluxMode ? manualFluxQuery : generatedFluxQuery;
    navigator.clipboard.writeText(textToCopy);
    setCopiedQuery(true);
    setTimeout(() => setCopiedQuery(false), 2000);
  }

  // Tag filter helpers
  function addTagFilter() {
    setTagFilters([...tagFilters, { key: '', value: '' }]);
  }

  function updateTagFilter(index, field, val) {
    const updated = [...tagFilters];
    updated[index][field] = val;
    setTagFilters(updated);
  }

  function removeTagFilter(index) {
    setTagFilters(tagFilters.filter((_, i) => i !== index));
  }

  // Prepare chart data (Multi-Field Support with Timestamp Pivoting & Per-Field Statistics)
  const { chartData, chartFields, fieldStats, fieldSeries } = useMemo(() => {
    if (!queryResult || !Array.isArray(queryResult.data) || queryResult.data.length === 0) {
      return { chartData: [], chartFields: [], fieldStats: {}, fieldSeries: {} };
    }

    const detectedFields = new Set();
    const timeMap = new Map();
    const fieldValues = {}; // fName -> number[]
    const fieldSeries = {}; // fName -> array of { time, fullTime, value, [fName]: value }

    for (const r of queryResult.data) {
      if (r._value === null || r._value === undefined || isNaN(Number(r._value))) continue;
      const fName = r._field || 'value';
      detectedFields.add(fName);

      const numVal = Number(r._value);

      if (!fieldValues[fName]) fieldValues[fName] = [];
      fieldValues[fName].push(numVal);

      let displayTime = '';
      if (r._time && typeof r._time === 'string') {
        displayTime = r._time.includes('T') ? r._time.split('T')[1].slice(0, 8) : r._time;
      }

      // Dedicated single-field series (100% clean, no null holes for split charts)
      if (!fieldSeries[fName]) fieldSeries[fName] = [];
      fieldSeries[fName].push({
        time: displayTime,
        fullTime: r._time,
        value: numVal,
        [fName]: numVal
      });

      // Unified multi-field series (for combined chart)
      const timeKey = r._time || 'unknown';
      if (!timeMap.has(timeKey)) {
        timeMap.set(timeKey, {
          time: displayTime,
          fullTime: r._time
        });
      }
      const entry = timeMap.get(timeKey);
      entry[fName] = numVal;
    }

    // Sort combined data chronologically
    const sortedData = Array.from(timeMap.values()).sort((a, b) => {
      if (!a.fullTime || !b.fullTime) return 0;
      return new Date(a.fullTime) - new Date(b.fullTime);
    });

    // Sort each individual field series chronologically
    for (const fName of Object.keys(fieldSeries)) {
      fieldSeries[fName].sort((a, b) => {
        if (!a.fullTime || !b.fullTime) return 0;
        return new Date(a.fullTime) - new Date(b.fullTime);
      });
    }

    const fieldStats = {};
    for (const [fName, vals] of Object.entries(fieldValues)) {
      if (vals.length > 0) {
        const min = Math.min(...vals);
        const max = Math.max(...vals);
        const sum = vals.reduce((a, b) => a + b, 0);
        const avg = (sum / vals.length).toFixed(2);
        const latest = vals[vals.length - 1];
        fieldStats[fName] = {
          min: Number.isInteger(min) ? min : Number(min.toFixed(2)),
          max: Number.isInteger(max) ? max : Number(max.toFixed(2)),
          avg: Number(avg),
          latest: Number.isInteger(latest) ? latest : Number(latest.toFixed(2)),
          count: vals.length
        };
      }
    }

    return {
      chartData: sortedData,
      chartFields: Array.from(detectedFields),
      fieldStats,
      fieldSeries
    };
  }, [queryResult]);

  // Metric KPIs
  const stats = useMemo(() => {
    if (!queryResult || !Array.isArray(queryResult.data) || queryResult.data.length === 0) {
      return null;
    }
    const numericValues = queryResult.data
      .map(r => r._value)
      .filter(v => v !== null && !isNaN(Number(v)))
      .map(Number);

    if (numericValues.length === 0) {
      return { total: queryResult.data.length, numeric: false };
    }

    const min = Math.min(...numericValues);
    const max = Math.max(...numericValues);
    const sum = numericValues.reduce((a, b) => a + b, 0);
    const avg = sum / numericValues.length;
    const latest = numericValues[numericValues.length - 1];

    return {
      total: queryResult.data.length,
      numeric: true,
      min: min.toFixed(2),
      max: max.toFixed(2),
      avg: avg.toFixed(2),
      latest: latest.toFixed(2),
      durationMs: queryResult.queryDurationMs || 0
    };
  }, [queryResult]);

  // Filtered table rows
  const filteredRows = useMemo(() => {
    if (!queryResult || !Array.isArray(queryResult.data)) return [];
    if (!tableSearch.trim()) return queryResult.data;

    const term = tableSearch.toLowerCase();
    return queryResult.data.filter(r => {
      return (
        String(r._time || '').toLowerCase().includes(term) ||
        String(r._measurement || '').toLowerCase().includes(term) ||
        String(r._field || '').toLowerCase().includes(term) ||
        String(r._value || '').toLowerCase().includes(term) ||
        String(r.unit || '').toLowerCase().includes(term) ||
        String(r.chair_section || '').toLowerCase().includes(term)
      );
    });
  }, [queryResult, tableSearch]);

  const hasChairSectionInRows = useMemo(() => {
    if (!queryResult || !Array.isArray(queryResult.data)) return false;
    return queryResult.data.some(r => r && (r.chair_section !== undefined && r.chair_section !== null));
  }, [queryResult]);

  const totalPages = Math.ceil(filteredRows.length / rowsPerPage);
  const pagedRows = useMemo(() => {
    const start = (currentPage - 1) * rowsPerPage;
    return filteredRows.slice(start, start + rowsPerPage);
  }, [filteredRows, currentPage]);

  // Filtered Templates for Modal
  const filteredTemplates = useMemo(() => {
    let list = templates;
    if (templateCategoryFilter !== 'Semua') {
      list = list.filter(t => t.category === templateCategoryFilter);
    }
    if (templateSearchTerm.trim()) {
      const term = templateSearchTerm.toLowerCase();
      list = list.filter(t =>
        (t.name || '').toLowerCase().includes(term) ||
        (t.description || '').toLowerCase().includes(term) ||
        (t.category || '').toLowerCase().includes(term)
      );
    }
    return list;
  }, [templates, templateCategoryFilter, templateSearchTerm]);

  const templateCategories = useMemo(() => {
    const cats = new Set(['Semua']);
    templates.forEach(t => {
      if (t.category) cats.add(t.category);
    });
    return Array.from(cats);
  }, [templates]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 md:p-6 space-y-6">
      {/* 1. Header & Navigation */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800/80">
        <div className="flex items-center gap-3">
          {onBack && (
            <button
              onClick={onBack}
              className="p-2 bg-slate-900/80 hover:bg-slate-800 text-slate-300 hover:text-white rounded-lg border border-slate-700/60 transition"
              title="Kembali ke Dashboard"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}
          <div>
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-emerald-500/20 text-emerald-400 rounded-lg border border-emerald-500/30">
                <Activity className="w-5 h-5" />
              </div>
              <h1 className="text-xl md:text-2xl font-bold bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400 bg-clip-text text-transparent">
                InfluxDB POD V3 Edge Manager
              </h1>
              <span className="px-2 py-0.5 text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 rounded-full">
                EDGE NODES
              </span>
            </div>
            <p className="text-xs md:text-sm text-slate-400 mt-1">
              Eksplorasi, filter, dan download metrik sensor langsung dari InfluxDB lokal di setiap unit POD V3
            </p>
          </div>
        </div>

        {/* Global Action Badges */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-emerald-950/40 text-emerald-300 border border-emerald-800/40">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Murni Read-Only (Aman)</span>
          </div>

          <button
            onClick={() => {
              loadPodList();
              if (selectedPodId) {
                loadPodHealth(selectedPodId);
                loadPodBuckets(selectedPodId);
              }
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white rounded-lg border border-slate-700/70 text-xs font-medium transition"
            title="Refresh Status Armada"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${podsLoading || podHealthLoading ? 'animate-spin text-emerald-400' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* 2. POD Selection Fleet Bar */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 shadow-xl backdrop-blur">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
              <Server className="w-4 h-4 text-emerald-400" />
              <span>Pilih Unit POD V3 Target</span>
            </div>
            <p className="text-xs text-slate-500">
              Setiap POD menjalankan InfluxDB port 8086 dengan token independen di <code className="text-emerald-400 font-mono">/home/pod/influx_token.json</code>
            </p>
          </div>

          {/* Quick Select Buttons */}
          <div
            className="flex items-center gap-2 overflow-x-auto py-1 scrollbar-none no-scrollbar"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
            onWheel={(e) => {
              if (e.deltaY !== 0) {
                e.currentTarget.scrollLeft += e.deltaY;
              }
            }}
          >
            {podsLoading ? (
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-emerald-400" />
                <span>Memindai armada POD V3...</span>
              </div>
            ) : pods.length === 0 ? (
              <span className="text-xs text-rose-400">Tidak ada server POD V3 terdaftar di database.</span>
            ) : (
              pods.map(pod => {
                const isSelected = pod.id === Number(selectedPodId);
                return (
                  <button
                    key={pod.id}
                    onClick={() => setSelectedPodId(pod.id)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition border ${isSelected
                      ? 'bg-emerald-500/20 text-emerald-200 border-emerald-500/50 shadow-md shadow-emerald-500/10'
                      : 'bg-slate-950/70 hover:bg-slate-800/80 text-slate-300 border-slate-800'
                      }`}
                  >
                    <span
                      className={`w-2 h-2 rounded-full ${pod.isOnline ? 'bg-emerald-400 animate-pulse' : 'bg-rose-500'
                        }`}
                    />
                    <span className="font-semibold">{pod.name}</span>
                    <span className="text-[10px] text-slate-400">({pod.host})</span>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Selected POD Details Card */}
        {activePod && (
          <div className="mt-4 pt-3 border-t border-slate-800/70 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
            <div className="flex items-center justify-between p-2.5 bg-slate-950/50 rounded-lg border border-slate-800/60">
              <span className="text-slate-400">Status Port 8086:</span>
              <div className="flex items-center gap-1.5 font-medium">
                {podHealth?.portOpen ? (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-emerald-400">Aktif ({podHealth?.version || 'v2.x'})</span>
                  </>
                ) : (
                  <>
                    <XCircle className="w-3.5 h-3.5 text-rose-400" />
                    <span className="text-rose-400">Port Tertutup / Offline</span>
                  </>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between p-2.5 bg-slate-950/50 rounded-lg border border-slate-800/60">
              <span className="text-slate-400">Otorisasi Token:</span>
              <div className="flex items-center gap-1.5 font-medium">
                {podHealthLoading ? (
                  <RefreshCw className="w-3 h-3 animate-spin text-emerald-400" />
                ) : podHealth?.authorized ? (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-emerald-400">Valid ({podHealth.buckets?.length || 0} Buckets)</span>
                  </>
                ) : (
                  <>
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                    <span className="text-amber-400">Perlu Verifikasi</span>
                  </>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between p-2.5 bg-slate-950/50 rounded-lg border border-slate-800/60">
              <span className="text-slate-400">Sumber Token:</span>
              <span className="text-emerald-300 truncate max-w-[150px]" title={podHealth?.tokenSource || 'Auto'}>
                {podHealth?.tokenSource?.includes('influx_token.json') ? 'Auto via SSH' : podHealth?.tokenSource || 'Auto'}
              </span>
            </div>

            <div className="flex items-center justify-end gap-2">
              <button
                onClick={() => handleRefreshToken(null)}
                disabled={tokenRefreshing}
                className="flex items-center gap-1 px-2.5 py-1.5 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/40 rounded-lg text-xs font-medium transition disabled:opacity-50"
                title="Refresh token langsung dari file /home/pod/influx_token.json di POD via SSH"
              >
                <RefreshCw className={`w-3 h-3 ${tokenRefreshing ? 'animate-spin' : ''}`} />
                <span>{tokenRefreshing ? 'Membaca SSH...' : 'Refresh Token SSH'}</span>
              </button>
              <button
                onClick={() => {
                  setTokenRefreshResult(null);
                  setOverrideTokenInput('');
                  setIsTokenModalOpen(true);
                }}
                className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg border border-slate-700 transition"
                title="Kelola / Override Token Manual"
              >
                <Key className="w-3.5 h-3.5 text-emerald-400" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 3. Main Query Builder & Visualization Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Visual Filter Panel */}
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
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 shadow-sm shadow-amber-500/10'
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
                  {templates.slice(0, 4).map(tmpl => (
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
                    Anda sedang dalam mode Raw Flux. Query harus mematuhi aturan <strong>READ-ONLY</strong>. Mutasi data otomatis diblokir server.
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
                        const both = ['pod_monitoring', 'power_monitoring'].filter(name => buckets.some(b => b.name === name));
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
                    {buckets.map(b => {
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
                            <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${isPower ? 'bg-amber-900/50 text-amber-300' : 'bg-emerald-900/50 text-emerald-300'
                              }`}>
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
                        Multi-bucket Aktif: Flux <code>union()</code> menggabungkan <strong>{selectedBuckets.length} bucket</strong> ({selectedBuckets.join(', ')}).
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
                      { label: 'Kustom', val: 'custom' }
                    ].map(p => (
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
                          <span className="text-[10px] text-slate-400">
                            Pintasan cepat
                          </span>
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
                          ].map(chip => {
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

                      {/* Quick 1 Day & 1 Month Pickers (Stacked cleanly without collision) */}
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
                              <span>Pada tanggal sebelum 09 Sep 2026, metrik heartbeat (<code className="bg-cyan-900/70 px-1 py-0.5 rounded text-[10px] font-mono text-cyan-200">hb500-hb508</code>) tersimpan di measurement <code className="bg-cyan-900/70 px-1 py-0.5 rounded text-[10px] font-mono text-cyan-100 font-semibold">"heartbeat"</code> (bukan <code className="bg-cyan-900/70 px-1 py-0.5 rounded text-[10px] font-mono text-cyan-300">"hb_module"</code>).</span>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              if (!selectedMeasurements.includes('heartbeat')) {
                                setSelectedMeasurements(prev => [...prev, 'heartbeat']);
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
                            <span className="text-[10px] text-emerald-400/70 shrink-0">
                              (Original _time)
                            </span>
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
                          onClick={handleExecuteQuery}
                          disabled={queryLoading || isCustomRangeInvalid}
                          className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs flex items-center gap-1.5 shadow-sm transition disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
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
                                color: color
                              }}
                            >
                              <span
                                className="w-1.5 h-1.5 rounded-full"
                                style={{ backgroundColor: color }}
                              />
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
                      {/* Backdrop to dismiss when clicked outside */}
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
                          {measurements.filter(m => m.toLowerCase().includes(measurementSearchTerm.toLowerCase())).length === 0 ? (
                            <div className="p-2 text-center text-xs text-slate-500">
                              Tidak ada measurement yang cocok
                            </div>
                          ) : (
                            measurements
                              .filter(m => m.toLowerCase().includes(measurementSearchTerm.toLowerCase()))
                              .map(m => {
                                const isSelected = selectedMeasurements.includes(m);
                                const selectedIndex = selectedMeasurements.indexOf(m);
                                const color = selectedIndex !== -1 ? MEASUREMENT_COLORS[selectedIndex % MEASUREMENT_COLORS.length] : null;

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
                          <span>{selectedMeasurements.length} dari {measurements.length} dipilih</span>
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
                                color: color
                              }}
                            >
                              <span
                                className="w-1.5 h-1.5 rounded-full"
                                style={{ backgroundColor: color }}
                              />
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
                      {/* Backdrop to dismiss when clicked outside */}
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
                          {availableFields.filter(f => f.toLowerCase().includes(fieldSearchTerm.toLowerCase())).length === 0 ? (
                            <div className="p-2 text-center text-xs text-slate-500">
                              Tidak ada field yang cocok
                            </div>
                          ) : (
                            availableFields
                              .filter(f => f.toLowerCase().includes(fieldSearchTerm.toLowerCase()))
                              .map(f => {
                                const isSelected = selectedFields.includes(f);
                                const selectedIndex = selectedFields.indexOf(f);
                                const color = selectedIndex !== -1 ? FIELD_COLORS[selectedIndex % FIELD_COLORS.length] : null;

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
                          <span>{selectedFields.length} dari {availableFields.length} dipilih</span>
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
                    {availableUnits.map(u => (
                      <option key={u} value={u}>{u}</option>
                    ))}
                  </select>
                </div>

                {/* Chair Section Tag (mod_chair / power_monitoring) */}
                {(selectedBuckets.includes('power_monitoring') || selectedMeasurements.includes('mod_chair') || availableChairSections.length > 0) && (
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
                      ).map(sec => (
                        <option key={sec} value={sec}>
                          {sec === 'HM_CUR' ? 'HM_CUR (Heating & Massage Current)' : sec === 'PEMF_CUR' ? 'PEMF_CUR (PEMF Coil Current)' : sec}
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
                    💡 Tombol <strong>Download CSV</strong> akan selalu mengunduh seluruh baris data historis (Full Dump) tanpa terpotong limit pratinjau browser.
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
                onClick={handleExecuteQuery}
                disabled={queryLoading || !selectedPodId}
                className="w-full py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-semibold text-xs rounded-lg shadow-lg shadow-emerald-600/20 flex items-center justify-center gap-2 transition disabled:opacity-50"
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
                  setCliExecutionResult(null);
                  setIsCliModalOpen(true);
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

        {/* Right Column: Visualization & Results */}
        <div className="lg:col-span-2 space-y-4">
          {/* Error Banner */}
          {queryError && (
            <div className="p-4 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs text-rose-300 flex items-start gap-3 shadow-lg">
              <AlertTriangle className="w-5 h-5 text-rose-400 flex-shrink-0 mt-0.5" />
              <div className="space-y-1">
                <span className="font-bold block">Gagal Membaca Data Influx POD:</span>
                <p className="font-mono text-[11px] break-all">{queryError}</p>
              </div>
            </div>
          )}

          {/* KPI Statistics Bar */}
          {stats && (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
              <div className="p-3 bg-slate-900/90 border border-slate-800 rounded-xl shadow">
                <span className="text-[10px] uppercase font-bold text-slate-400">Total Rekor</span>
                <div className="text-lg font-bold text-slate-100 mt-0.5">{stats.total.toLocaleString()}</div>
                <span className="text-[10px] text-slate-500">{stats.durationMs} ms</span>
              </div>

              {stats.numeric ? (
                <>
                  <div className="p-3 bg-slate-900/90 border border-slate-800 rounded-xl shadow">
                    <span className="text-[10px] uppercase font-bold text-slate-400">Nilai Terakhir</span>
                    <div className="text-lg font-bold text-emerald-400 mt-0.5">{stats.latest}</div>
                    <span className="text-[10px] text-slate-500 truncate block" title={selectedFields.join(', ')}>
                      {selectedFields.join(', ')}
                    </span>
                  </div>

                  <div className="p-3 bg-slate-900/90 border border-slate-800 rounded-xl shadow">
                    <span className="text-[10px] uppercase font-bold text-slate-400">Rata-Rata</span>
                    <div className="text-lg font-bold text-teal-300 mt-0.5">{stats.avg}</div>
                    <span className="text-[10px] text-slate-500">Mean Value</span>
                  </div>

                  <div className="p-3 bg-slate-900/90 border border-slate-800 rounded-xl shadow">
                    <span className="text-[10px] uppercase font-bold text-slate-400">Min / Max</span>
                    <div className="text-sm font-bold text-slate-200 mt-1">
                      <span className="text-cyan-400">{stats.min}</span> / <span className="text-rose-400">{stats.max}</span>
                    </div>
                    <span className="text-[10px] text-slate-500">Range Nilai</span>
                  </div>

                  <div className="p-3 bg-slate-900/90 border border-slate-800 rounded-xl shadow">
                    <span className="text-[10px] uppercase font-bold text-slate-400">POD Host</span>
                    <div className="text-sm font-bold text-slate-200 mt-1 truncate">
                      {activePod?.name || 'POD'}
                    </div>
                    <span className="text-[10px] text-emerald-400">{activePod?.host}</span>
                  </div>
                </>
              ) : (
                <div className="col-span-4 p-3 bg-slate-900/90 border border-slate-800 rounded-xl flex items-center justify-between text-xs text-slate-400">
                  <span>Data bertipe non-numerik atau string. Visualisasi grafik tidak aktif.</span>
                </div>
              )}
            </div>
          )}

          {/* Time Series Chart Section */}
          {stats?.numeric && chartData.length > 0 && (
            <div className="space-y-3">
              {/* Header with View Toggle */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-1">
                <div className="flex items-center gap-2">
                  <BarChart2 className="w-4 h-4 text-emerald-400" />
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-200">
                    Visualisasi Tren Waktu
                  </span>
                  {chartFields.length > 1 && (
                    <span className="px-1.5 py-0.5 rounded bg-emerald-950 border border-emerald-800 text-[10px] text-emerald-400 font-mono font-medium">
                      {chartFields.length} metrik terpisah
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={handleDownloadChartPdfReport}
                    disabled={exportingFormat === 'pdf' || !selectedPodId}
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-purple-950/80 hover:bg-purple-900/90 text-purple-300 border border-purple-800/80 text-[11px] font-medium transition disabled:opacity-50"
                    title="Cetak/Unduh Laporan Grafik PDF (Landscape 3 Halaman seperti report.pdf)"
                  >
                    <FileText className="w-3 h-3 text-purple-400" />
                    <span>{exportingFormat === 'pdf' ? 'Membuat PDF...' : 'Cetak Report PDF'}</span>
                  </button>

                  {chartFields.length > 1 && (
                    <div className="flex items-center bg-slate-950 p-0.5 rounded-lg border border-slate-800 text-[11px]">
                      <button
                        type="button"
                        onClick={() => setChartViewMode('split')}
                        className={`px-2.5 py-1 rounded-md font-medium transition-all ${chartViewMode === 'split'
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                          : 'text-slate-400 hover:text-slate-200'
                          }`}
                        title="Tampilkan grafik terpisah untuk setiap metrik agar skala tidak tabrakan"
                      >
                        Terpisah ({chartFields.length} Grafik)
                      </button>
                      <button
                        type="button"
                        onClick={() => setChartViewMode('combined')}
                        className={`px-2.5 py-1 rounded-md font-medium transition-all ${chartViewMode === 'combined'
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                          : 'text-slate-400 hover:text-slate-200'
                          }`}
                        title="Tampilkan semua metrik dalam 1 grafik gabungan"
                      >
                        Gabungan
                      </button>
                    </div>
                  )}
                  <span className="text-[10px] font-mono text-slate-400">
                    {chartData.length} data points
                  </span>
                </div>
              </div>

              {/* Mode 1: Split Charts (Individual Chart Per Field with Dedicated Y-Axis & Stats) */}
              {chartViewMode === 'split' && chartFields.length > 1 ? (
                <div className="space-y-4">
                  {chartFields.map((fName, idx) => {
                    const color = FIELD_COLORS[idx % FIELD_COLORS.length];
                    const fStat = fieldStats[fName] || {};
                    const sData = fieldSeries[fName] || [];
                    const isConstant = fStat && fStat.min !== undefined && fStat.min === fStat.max;
                    const isSparse = sData.length < 60;
                    const yDomain = getYDomain(fStat.min, fStat.max);

                    return (
                      <div key={`split-chart-${fName}`} className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 shadow-xl">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3 pb-2.5 border-b border-slate-800/80">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="w-2.5 h-2.5 rounded-full ring-2 ring-slate-800" style={{ backgroundColor: color }} />
                            <span className="text-xs font-bold uppercase tracking-wider text-slate-200">
                              Grafik Metrik: <span style={{ color }}>{fName}</span>
                            </span>
                            <span className="text-[10px] text-slate-400 font-mono">
                              ({sData.length.toLocaleString()} titik)
                            </span>
                            {isConstant && (
                              <span className="px-2 py-0.5 rounded bg-emerald-950/80 border border-emerald-700/60 text-[10px] text-emerald-300 font-medium">
                                {fStat.min === 0 ? 'Status Standby / Nilai 0' : `Nilai Konstan: ${fStat.min}`}
                              </span>
                            )}
                          </div>

                          {/* Individual Field Statistics Pill */}
                          {fStat && (
                            <div className="flex flex-wrap items-center gap-2 text-[10px] font-mono">
                              <div className="px-2 py-0.5 rounded bg-slate-950/80 border border-slate-800 text-slate-300">
                                <span className="text-slate-500 mr-1">Latest:</span>
                                <span className="font-semibold text-emerald-400">{fStat.latest ?? '-'}</span>
                              </div>
                              <div className="px-2 py-0.5 rounded bg-slate-950/80 border border-slate-800 text-slate-300">
                                <span className="text-slate-500 mr-1">Avg:</span>
                                <span className="font-semibold text-teal-300">{fStat.avg ?? '-'}</span>
                              </div>
                              <div className="px-2 py-0.5 rounded bg-slate-950/80 border border-slate-800 text-slate-300">
                                <span className="text-slate-500 mr-1">Min:</span>
                                <span className="font-semibold text-cyan-400">{fStat.min ?? '-'}</span>
                              </div>
                              <div className="px-2 py-0.5 rounded bg-slate-950/80 border border-slate-800 text-slate-300">
                                <span className="text-slate-500 mr-1">Max:</span>
                                <span className="font-semibold text-rose-400">{fStat.max ?? '-'}</span>
                              </div>
                            </div>
                          )}
                        </div>

                        <div className="h-64 w-full">
                          <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={sData} margin={{ top: 10, right: 15, left: -10, bottom: 25 }}>
                              <defs>
                                <linearGradient id={`podGradient-split-${fName}`} x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="5%" stopColor={color} stopOpacity={0.35} />
                                  <stop offset="95%" stopColor={color} stopOpacity={0.0} />
                                </linearGradient>
                              </defs>
                              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                              <XAxis
                                dataKey="time"
                                stroke="#64748b"
                                fontSize={10}
                                tickLine={{ stroke: '#334155' }}
                                dy={6}
                                minTickGap={45}
                              />
                              <YAxis
                                stroke="#64748b"
                                fontSize={10}
                                tickLine={false}
                                domain={yDomain}
                              />
                              <Tooltip
                                contentStyle={{
                                  backgroundColor: '#020617',
                                  borderColor: '#334155',
                                  borderRadius: '0.5rem',
                                  fontSize: '11px'
                                }}
                                labelStyle={{ color: '#94a3b8' }}
                                labelFormatter={(label, payload) => {
                                  const p = payload && payload[0]?.payload;
                                  return p?.fullTime ? formatPointDateTime(p) : label;
                                }}
                                formatter={(value) => [value, fName]}
                              />
                              <Area
                                type="monotone"
                                dataKey="value"
                                stroke={color}
                                strokeWidth={2.5}
                                fillOpacity={1}
                                fill={`url(#podGradient-split-${fName})`}
                                name={fName}
                                connectNulls={true}
                                dot={isConstant ? { r: 2, fill: color } : (isSparse ? { r: 3, fill: color } : false)}
                                activeDot={{ r: 5 }}
                              />
                            </AreaChart>
                          </ResponsiveContainer>
                        </div>

                        {/* Bottom Time Bar */}
                        <div className="flex items-center justify-between text-[10px] text-slate-400 pt-2 px-1 border-t border-slate-800/80 font-mono">
                          <div className="flex items-center gap-1.5">
                            <span className="text-slate-500">Mulai:</span>
                            <span className="text-slate-200 font-semibold">{formatPointDateTime(sData[0])}</span>
                          </div>
                          <div className="flex items-center gap-1 text-slate-300 font-sans text-[11px] font-medium">
                            <Clock className="w-3.5 h-3.5 text-emerald-400" />
                            <span>Waktu Asli Influx</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-slate-500">Selesai:</span>
                            <span className="text-slate-200 font-semibold">{formatPointDateTime(sData[sData.length - 1])}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                /* Mode 2: Single / Combined Chart */
                <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 shadow-xl">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-200">
                        {chartFields.length === 1
                          ? `Grafik Metrik: ${chartFields[0]}`
                          : `Grafik Gabungan (${chartFields.join(', ') || selectedFields.join(', ') || 'Metrik'})`}
                      </span>
                      {chartFields.length > 1 && (
                        <span className="px-1.5 py-0.5 rounded bg-emerald-950 border border-emerald-800 text-[10px] text-emerald-400 font-mono font-medium">
                          {chartFields.length} series
                        </span>
                      )}
                    </div>
                    {chartFields.length === 1 && fieldStats[chartFields[0]] && (
                      <div className="flex flex-wrap items-center gap-2 text-[10px] font-mono">
                        <div className="px-2 py-0.5 rounded bg-slate-950/80 border border-slate-800 text-slate-300">
                          <span className="text-slate-500 mr-1">Latest:</span>
                          <span className="font-semibold text-emerald-400">{fieldStats[chartFields[0]].latest}</span>
                        </div>
                        <div className="px-2 py-0.5 rounded bg-slate-950/80 border border-slate-800 text-slate-300">
                          <span className="text-slate-500 mr-1">Avg:</span>
                          <span className="font-semibold text-teal-300">{fieldStats[chartFields[0]].avg}</span>
                        </div>
                        <div className="px-2 py-0.5 rounded bg-slate-950/80 border border-slate-800 text-slate-300">
                          <span className="text-slate-500 mr-1">Min:</span>
                          <span className="font-semibold text-cyan-400">{fieldStats[chartFields[0]].min}</span>
                        </div>
                        <div className="px-2 py-0.5 rounded bg-slate-950/80 border border-slate-800 text-slate-300">
                          <span className="text-slate-500 mr-1">Max:</span>
                          <span className="font-semibold text-rose-400">{fieldStats[chartFields[0]].max}</span>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="h-72 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={chartFields.length === 1 && fieldSeries[chartFields[0]] ? fieldSeries[chartFields[0]] : chartData} margin={{ top: 10, right: 15, left: -10, bottom: 25 }}>
                        <defs>
                          {chartFields.map((fName, idx) => {
                            const color = FIELD_COLORS[idx % FIELD_COLORS.length];
                            return (
                              <linearGradient key={`podGradient-${fName}`} id={`podGradient-${fName}`} x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor={color} stopOpacity={0.4} />
                                <stop offset="95%" stopColor={color} stopOpacity={0.0} />
                              </linearGradient>
                            );
                          })}
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                        <XAxis
                          dataKey="time"
                          stroke="#64748b"
                          fontSize={10}
                          tickLine={{ stroke: '#334155' }}
                          dy={6}
                          minTickGap={45}
                        />
                        <YAxis
                          stroke="#64748b"
                          fontSize={10}
                          tickLine={false}
                          domain={chartFields.length === 1 && fieldStats[chartFields[0]] ? getYDomain(fieldStats[chartFields[0]].min, fieldStats[chartFields[0]].max) : ['auto', 'auto']}
                        />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: '#020617',
                            borderColor: '#334155',
                            borderRadius: '0.5rem',
                            fontSize: '11px'
                          }}
                          labelStyle={{ color: '#94a3b8' }}
                          labelFormatter={(label, payload) => {
                            const p = payload && payload[0]?.payload;
                            return p?.fullTime ? formatPointDateTime(p) : label;
                          }}
                        />
                        {chartFields.length > 1 && (
                          <Legend
                            wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }}
                          />
                        )}
                        {chartFields.map((fName, idx) => {
                          const color = FIELD_COLORS[idx % FIELD_COLORS.length];
                          const fStat = fieldStats[fName];
                          const isConstant = fStat && fStat.min !== undefined && fStat.min === fStat.max;
                          const isSparse = (fStat?.count || 0) < 60;
                          return (
                            <Area
                              key={fName}
                              type="monotone"
                              dataKey={chartFields.length === 1 ? 'value' : fName}
                              stroke={color}
                              strokeWidth={2.5}
                              fillOpacity={1}
                              fill={`url(#podGradient-${fName})`}
                              name={fName}
                              connectNulls={true}
                              dot={isConstant ? { r: 2, fill: color } : (isSparse ? { r: 3, fill: color } : false)}
                              activeDot={{ r: 5 }}
                            />
                          );
                        })}
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Bottom Time Bar */}
                  <div className="flex items-center justify-between text-[10px] text-slate-400 pt-2 px-1 border-t border-slate-800/80 font-mono">
                    <div className="flex items-center gap-1.5">
                      <span className="text-slate-500">Mulai:</span>
                      <span className="text-slate-200 font-semibold">{formatPointDateTime(chartData[0])}</span>
                    </div>
                    <div className="flex items-center gap-1 text-slate-300 font-sans text-[11px] font-medium">
                      <Clock className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Waktu Asli Influx</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-slate-500">Selesai:</span>
                      <span className="text-slate-200 font-semibold">{formatPointDateTime(chartData[chartData.length - 1])}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Data Table Panel */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 shadow-xl space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Database className="w-4 h-4 text-emerald-400" />
                <span className="text-xs font-bold uppercase tracking-wider text-slate-200">
                  Tabel Data Influx ({filteredRows.length} Baris)
                </span>
              </div>

              {/* Search in Table */}
              <div className="relative w-full sm:w-64">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-500" />
                <input
                  type="text"
                  placeholder="Cari baris data..."
                  value={tableSearch}
                  onChange={(e) => {
                    setTableSearch(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full bg-slate-950 text-slate-200 pl-8 pr-3 py-1.5 rounded-lg border border-slate-800 text-xs focus:outline-none focus:border-emerald-500 font-medium"
                />
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-950/80 text-slate-400 border-b border-slate-800">
                    <th className="py-2.5 px-3 font-semibold">Waktu (_time)</th>
                    <th className="py-2.5 px-3 font-semibold">Measurement</th>
                    <th className="py-2.5 px-3 font-semibold">Field</th>
                    <th className="py-2.5 px-3 font-semibold">Nilai (_value)</th>
                    <th className="py-2.5 px-3 font-semibold">Unit Tag</th>
                    {hasChairSectionInRows && (
                      <th className="py-2.5 px-3 font-semibold text-amber-300">Chair Section</th>
                    )}
                    <th className="py-2.5 px-3 font-semibold">Tag Lainnya</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono text-[11px]">
                  {pagedRows.length === 0 ? (
                    <tr>
                      <td colSpan={hasChairSectionInRows ? 7 : 6} className="py-8 text-center text-slate-500 font-sans">
                        {queryLoading ? (
                          <div className="flex items-center justify-center gap-2">
                            <RefreshCw className="w-4 h-4 animate-spin text-emerald-400" />
                            <span>Mengekstrak data dari Influx POD...</span>
                          </div>
                        ) : (
                          'Tidak ada data ditemukan. Tentukan filter lalu klik "Jalankan Query".'
                        )}
                      </td>
                    </tr>
                  ) : (
                    pagedRows.map((row, idx) => {
                      // Extract extra tags
                      const extraTags = Object.entries(row)
                        .filter(([k]) => !['_time', '_measurement', '_field', '_value', 'table', 'unit', 'chair_section'].includes(k))
                        .map(([k, v]) => `${k}=${v}`)
                        .join(', ');

                      return (
                        <tr key={idx} className="hover:bg-slate-800/40 transition">
                          <td className="py-2 px-3 font-mono text-[11px] text-slate-300 whitespace-nowrap">
                            {row._time || '-'}
                          </td>
                          <td className="py-2 px-3 text-emerald-300 font-medium">
                            {row._measurement}
                          </td>
                          <td className="py-2 px-3 text-teal-300">
                            {row._field}
                          </td>
                          <td className="py-2 px-3 text-white font-bold">
                            <span className="px-1.5 py-0.5 bg-emerald-500/10 text-emerald-300 rounded border border-emerald-500/20">
                              {row._value !== null && row._value !== undefined ? String(row._value) : 'null'}
                            </span>
                          </td>
                          <td className="py-2 px-3 text-slate-400">
                            {row.unit || '-'}
                          </td>
                          {hasChairSectionInRows && (
                            <td className="py-2 px-3 text-amber-300 font-semibold whitespace-nowrap">
                              {row.chair_section ? (
                                <span className="px-1.5 py-0.5 bg-amber-500/15 text-amber-300 rounded border border-amber-500/30">
                                  {row.chair_section}
                                </span>
                              ) : '-'}
                            </td>
                          )}
                          <td className="py-2 px-3 text-slate-500 truncate max-w-[180px]" title={extraTags}>
                            {extraTags || '-'}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between pt-3 border-t border-slate-800 text-xs text-slate-400">
                <span>
                  Halaman {currentPage} dari {totalPages} ({filteredRows.length} total baris)
                </span>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => setCurrentPage(p => Math.max(p - 1, 1))}
                    disabled={currentPage === 1}
                    className="p-1.5 rounded bg-slate-950 border border-slate-800 hover:bg-slate-800 disabled:opacity-40"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                  </button>
                  <span className="px-2 font-mono text-emerald-400">{currentPage}</span>
                  <button
                    onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))}
                    disabled={currentPage === totalPages}
                    className="p-1.5 rounded bg-slate-950 border border-slate-800 hover:bg-slate-800 disabled:opacity-40"
                  >
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 4. Token Management Modal */}
      {isTokenModalOpen && (
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
                onClick={() => setIsTokenModalOpen(false)}
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
                  onClick={() => handleRefreshToken(null)}
                  disabled={tokenRefreshing}
                  className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-medium flex items-center justify-center gap-2 transition disabled:opacity-50"
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
                  onChange={(e) => setOverrideTokenInput(e.target.value)}
                  className="w-full bg-slate-900 text-slate-200 p-2 rounded-lg border border-slate-700 text-xs font-mono focus:outline-none focus:border-emerald-500"
                />
                <button
                  onClick={() => handleRefreshToken(overrideTokenInput)}
                  disabled={tokenRefreshing || !overrideTokenInput.trim()}
                  className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg font-medium transition disabled:opacity-40"
                >
                  Simpan & Uji Token Manual
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
                onClick={() => setIsTokenModalOpen(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-medium transition"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5. Template Explorer Modal (Cross-POD) */}
      {isTemplateModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-3xl w-full p-6 shadow-2xl space-y-4 max-h-[90vh] flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 flex-shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-lg border border-emerald-500/30">
                  <FolderOpen className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-slate-100 text-sm md:text-base">
                      Katalog Template Query Influx
                    </h3>
                    <span className="px-2 py-0.5 text-[10px] font-semibold bg-emerald-500/15 text-emerald-300 rounded-full border border-emerald-500/30">
                      CROSS-POD
                    </span>
                  </div>
                  <p className="text-xs text-slate-400">
                    Template ini dapat dipanggil dan diterapkan langsung pada unit POD manapun ({activePod?.name || 'POD Terpilih'})
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsTemplateModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
              >
                ✕
              </button>
            </div>

            {/* Search & Category Filter Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 flex-shrink-0">
              <div className="relative flex-1">
                <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-slate-500" />
                <input
                  type="text"
                  placeholder="Cari template query..."
                  value={templateSearchTerm}
                  onChange={(e) => setTemplateSearchTerm(e.target.value)}
                  className="w-full bg-slate-950 text-slate-200 pl-9 pr-3 py-2 rounded-lg border border-slate-800 text-xs focus:outline-none focus:border-emerald-500 font-medium"
                />
              </div>

              {/* Category Filter Chips */}
              <div
                className="flex items-center gap-1.5 overflow-x-auto py-1 scrollbar-none no-scrollbar"
                style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                onWheel={(e) => {
                  if (e.deltaY !== 0) {
                    e.currentTarget.scrollLeft += e.deltaY;
                  }
                }}
              >
                {templateCategories.map(cat => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setTemplateCategoryFilter(cat)}
                    className={`px-2.5 py-1.5 rounded-md text-[11px] font-semibold whitespace-nowrap transition border ${templateCategoryFilter === cat
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                      : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-slate-200'
                      }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Template Cards List */}
            <div className="overflow-y-auto space-y-3 flex-1 pr-1 scrollbar-thin">
              {templatesLoading ? (
                <div className="py-12 text-center text-xs text-slate-500 flex items-center justify-center gap-2">
                  <RefreshCw className="w-4 h-4 animate-spin text-emerald-400" />
                  <span>Memuat daftar template...</span>
                </div>
              ) : filteredTemplates.length === 0 ? (
                <div className="py-12 text-center text-xs text-slate-500 space-y-2">
                  <p>Tidak ada template ditemukan untuk filter ini.</p>
                  <button
                    onClick={() => {
                      setIsTemplateModalOpen(false);
                      handleOpenCreateTemplate();
                    }}
                    className="text-emerald-400 hover:underline font-semibold text-xs"
                  >
                    + Simpan query aktif Anda sebagai template baru
                  </button>
                </div>
              ) : (
                filteredTemplates.map(tmpl => {
                  const cfg = tmpl.config || {};
                  return (
                    <div
                      key={tmpl.id}
                      className="p-4 bg-slate-950/80 border border-slate-800/90 hover:border-emerald-500/40 rounded-xl transition space-y-2.5 group"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-slate-100 text-xs md:text-sm group-hover:text-emerald-300 transition">
                            {tmpl.name}
                          </span>
                          <span className="px-2 py-0.5 text-[10px] font-medium rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                            {tmpl.category || 'General'}
                          </span>
                          {tmpl.is_raw_flux ? (
                            <span className="px-2 py-0.5 text-[10px] font-medium rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30">
                              Raw Flux
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 text-[10px] font-medium rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                              Visual Filter
                            </span>
                          )}
                        </div>

                        {/* Action Buttons: Apply, Apply&Run, Edit, Delete */}
                        <div className="flex items-center gap-1.5 self-end sm:self-auto">
                          <button
                            type="button"
                            onClick={() => handleApplyTemplate(tmpl, false)}
                            className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg text-xs font-medium transition flex items-center gap-1"
                            title={`Terapkan konfigurasi ke ${activePod?.name || 'POD aktif'}`}
                          >
                            <Sliders className="w-3 h-3 text-emerald-400" />
                            <span>Terapkan</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleApplyTemplate(tmpl, true)}
                            className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold shadow-md shadow-emerald-600/20 transition flex items-center gap-1"
                            title={`Terapkan dan langsung eksekusi query pada ${activePod?.name || 'POD aktif'}`}
                          >
                            <Play className="w-3 h-3 fill-white" />
                            <span>Terapkan & Jalankan</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleOpenEditTemplate(tmpl)}
                            className="p-1.5 text-slate-400 hover:text-amber-300 hover:bg-amber-500/10 rounded-lg border border-transparent hover:border-amber-500/30 transition"
                            title="Edit rincian dan konfigurasi template ini"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteTargetTemplate({ id: tmpl.id, name: tmpl.name })}
                            className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg border border-transparent hover:border-rose-500/30 transition"
                            title="Hapus template ini dari database"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {tmpl.description && (
                        <p className="text-xs text-slate-400 leading-relaxed">
                          {tmpl.description}
                        </p>
                      )}

                      {/* Config summary pills */}
                      {!tmpl.is_raw_flux && (
                        <div className="flex items-center gap-2 flex-wrap text-[11px] font-mono text-slate-400 pt-1">
                          <span className="px-2 py-0.5 bg-slate-900 rounded border border-slate-800 text-slate-300">
                            Bucket: <strong className="text-emerald-400 font-normal">{cfg.bucket || 'pod_monitoring'}</strong>
                          </span>
                          <span className="px-2 py-0.5 bg-slate-900 rounded border border-slate-800 text-slate-300">
                            Measurement: <strong className="text-cyan-400 font-normal">{cfg.measurements && Array.isArray(cfg.measurements) ? cfg.measurements.join(', ') : (cfg.measurement || '-')}</strong>
                          </span>
                          <span className="px-2 py-0.5 bg-slate-900 rounded border border-slate-800 text-slate-300">
                            Field: <strong className="text-teal-300 font-normal">{cfg.fields && Array.isArray(cfg.fields) ? cfg.fields.join(', ') : (cfg.field || '-')}</strong>
                          </span>
                          <span className="px-2 py-0.5 bg-slate-900 rounded border border-slate-800 text-slate-400">
                            Window: {cfg.aggregation !== 'none' ? `${cfg.aggregation} (${cfg.aggFn || 'mean'})` : 'Raw'}
                          </span>
                          <span className="px-2 py-0.5 bg-slate-900 rounded border border-slate-800 text-slate-400">
                            Range: {cfg.timeRange || '-1h'}
                          </span>
                        </div>
                      )}

                      {tmpl.is_raw_flux && tmpl.raw_flux_query && (
                        <pre className="p-2 bg-slate-900 text-emerald-300 rounded font-mono text-[10px] overflow-x-auto border border-slate-800 max-h-16">
                          {tmpl.raw_flux_query}
                        </pre>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            {/* Modal Footer */}
            <div className="pt-3 border-t border-slate-800 flex items-center justify-between flex-shrink-0">
              <button
                type="button"
                onClick={() => {
                  setIsTemplateModalOpen(false);
                  handleOpenCreateTemplate();
                }}
                className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-medium transition"
              >
                <Plus className="w-3.5 h-3.5 text-emerald-400" />
                <span>Simpan Query Aktif Jadi Template</span>
              </button>
              <button
                type="button"
                onClick={() => setIsTemplateModalOpen(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-medium transition"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 6. Save or Edit Query Template Modal */}
      {isSaveTemplateModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className={`p-2 rounded-lg border ${isEditMode
                  ? 'bg-amber-500/20 text-amber-400 border-amber-500/30'
                  : 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30'
                  }`}>
                  {isEditMode ? <Pencil className="w-5 h-5" /> : <Save className="w-5 h-5" />}
                </div>
                <div>
                  <h3 className="font-bold text-slate-100 text-sm">
                    {isEditMode ? 'Edit Template Query' : 'Simpan Template Query Cross-POD'}
                  </h3>
                  <p className="text-xs text-slate-400">
                    {isEditMode
                      ? 'Perbarui rincian atau parameter query template ini'
                      : 'Template tersimpan di database dan dapat digunakan di semua unit POD'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsSaveTemplateModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              {/* Template Name */}
              <div>
                <label className="block font-semibold text-slate-300 mb-1">
                  Nama Template: <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  placeholder="Contoh: Suhu Kursi POD 15 Menit"
                  value={templateForm.name}
                  onChange={(e) => setTemplateForm({ ...templateForm, name: e.target.value })}
                  className="w-full bg-slate-950 text-slate-200 p-2 rounded-lg border border-slate-800 text-xs focus:outline-none focus:border-emerald-500 font-medium"
                />
              </div>

              {/* Category */}
              <div>
                <label className="block font-semibold text-slate-300 mb-1">
                  Kategori Template:
                </label>
                <select
                  value={templateForm.category}
                  onChange={(e) => setTemplateForm({ ...templateForm, category: e.target.value })}
                  className="w-full bg-slate-950 text-slate-200 p-2 rounded-lg border border-slate-800 text-xs focus:outline-none focus:border-emerald-500 font-medium"
                >
                  <option value="Sensor Hardware">Sensor Hardware</option>
                  <option value="Kelistrikan">Kelistrikan (Power Monitoring)</option>
                  <option value="Sistem & Heartbeat">Sistem & Heartbeat</option>
                  <option value="Air Conditioning">Air Conditioning (AC)</option>
                  <option value="Audio & Soundscape">Audio & Soundscape</option>
                  <option value="Kustom Pengguna">Kustom Pengguna</option>
                </select>
              </div>

              {/* Description */}
              <div>
                <label className="block font-semibold text-slate-300 mb-1">
                  Deskripsi (Opsional):
                </label>
                <textarea
                  rows={2}
                  placeholder="Catatan mengenai fungsi atau tujuan query ini..."
                  value={templateForm.description}
                  onChange={(e) => setTemplateForm({ ...templateForm, description: e.target.value })}
                  className="w-full bg-slate-950 text-slate-200 p-2 rounded-lg border border-slate-800 text-xs focus:outline-none focus:border-emerald-500"
                />
              </div>

              {/* Sync query helper in Edit mode */}
              {isEditMode && (
                <div className="p-2.5 bg-slate-950/80 border border-slate-800 rounded-lg flex items-center justify-between gap-2">
                  <div className="text-[11px] text-slate-400">
                    Perbarui query dengan filter POD aktif saat ini?
                  </div>
                  <button
                    type="button"
                    onClick={handleSyncCurrentQueryToTemplate}
                    className="px-2.5 py-1 bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 rounded-md text-[11px] font-medium transition flex items-center gap-1 flex-shrink-0"
                    title="Timpa query template dengan filter yang sedang aktif di halaman saat ini"
                  >
                    <RefreshCw className="w-3 h-3" />
                    <span>Sinkronkan Query</span>
                  </button>
                </div>
              )}

              {/* Query Parameters Preview */}
              <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 space-y-1.5 text-[11px]">
                <span className="font-semibold text-slate-400 block mb-1">
                  Parameter Yang Disimpan:
                </span>
                {templateForm.isRawFlux ? (
                  <div className="space-y-1.5">
                    <span className="text-amber-300 font-mono text-[10px]">
                      Mode: Raw Flux Query
                    </span>
                    <textarea
                      rows={3}
                      value={templateForm.rawFluxQuery || ''}
                      onChange={(e) => setTemplateForm({ ...templateForm, rawFluxQuery: e.target.value })}
                      placeholder="from(bucket: ...)"
                      className="w-full bg-slate-900 text-emerald-300 font-mono text-[10px] p-2 rounded border border-slate-800 focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                ) : (
                  <div className="space-y-1 font-mono text-slate-300">
                    <div>Bucket: <span className="text-emerald-400">{templateForm.config?.buckets && Array.isArray(templateForm.config.buckets) ? templateForm.config.buckets.join(', ') : (templateForm.config?.bucket || selectedBuckets.join(', '))}</span></div>
                    <div>Measurement: <span className="text-cyan-400">{templateForm.config?.measurements && Array.isArray(templateForm.config.measurements) ? templateForm.config.measurements.join(', ') : (templateForm.config?.measurement || selectedMeasurements.join(', '))}</span></div>
                    <div>Field: <span className="text-teal-300">{templateForm.config?.fields && Array.isArray(templateForm.config.fields) ? templateForm.config.fields.join(', ') : (templateForm.config?.field || selectedFields.join(', '))}</span></div>
                    <div>Window: <span>{templateForm.config?.aggregation || aggregationInterval} ({templateForm.config?.aggFn || aggregationFn})</span></div>
                    <div>Time Range: <span>{templateForm.config?.timeRange || timeRangePreset}</span></div>
                  </div>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsSaveTemplateModalOpen(false)}
                className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-medium transition"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleSaveTemplate}
                disabled={templateSaving || !templateForm.name.trim()}
                className={`px-4 py-2 text-white font-semibold text-xs rounded-lg shadow-lg flex items-center gap-1.5 transition disabled:opacity-50 ${isEditMode
                  ? 'bg-gradient-to-r from-amber-600 to-yellow-600 hover:from-amber-500 hover:to-yellow-500 shadow-amber-600/20'
                  : 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 shadow-emerald-600/20'
                  }`}
              >
                {templateSaving ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>{isEditMode ? 'Menyimpan Perubahan...' : 'Menyimpan...'}</span>
                  </>
                ) : (
                  <>
                    {isEditMode ? <Check className="w-3.5 h-3.5" /> : <Save className="w-3.5 h-3.5" />}
                    <span>{isEditMode ? 'Simpan Perubahan' : 'Simpan Template'}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 7. Delete Confirmation Modal (Cross-POD Template) */}
      {deleteTargetTemplate && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-start gap-3">
              <div className="p-3 bg-rose-500/20 text-rose-400 rounded-xl border border-rose-500/30 flex-shrink-0">
                <Trash2 className="w-6 h-6" />
              </div>
              <div className="space-y-1 flex-1">
                <h3 className="font-bold text-slate-100 text-base">
                  Hapus Template Query?
                </h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Apakah Anda yakin ingin menghapus template <strong className="text-rose-300">"{deleteTargetTemplate.name}"</strong>? Template ini tidak akan tersedia lagi untuk unit POD manapun.
                </p>
              </div>
            </div>

            <div className="p-3 bg-slate-950 rounded-lg border border-slate-800/80 text-xs text-slate-400">
              <span className="text-amber-400 font-semibold">Catatan:</span> Data di InfluxDB POD tidak akan terpengaruh sama sekali. Tindakan ini hanya menghapus bookmark konfigurasi query dari database.
            </div>

            <div className="pt-2 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeleteTargetTemplate(null)}
                disabled={templateDeleting}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-medium transition disabled:opacity-50"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteTemplate}
                disabled={templateDeleting}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-xs font-semibold shadow-lg shadow-rose-600/20 flex items-center gap-1.5 transition disabled:opacity-50"
              >
                {templateDeleting ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Menghapus...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Hapus Template</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 8. Influx CLI Export Modal */}
      {isCliModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-amber-500/40 rounded-2xl max-w-2xl w-full p-6 shadow-2xl shadow-amber-950/20 space-y-4 max-h-[90vh] flex flex-col animate-in fade-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 flex-shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-amber-500/20 text-amber-400 rounded-xl border border-amber-500/30">
                  <Terminal className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-100 text-sm flex items-center gap-2">
                    <span>Export Data via Influx CLI (--raw)</span>
                    <span className="px-2 py-0.5 bg-amber-500/20 text-amber-300 rounded text-[10px] font-mono border border-amber-500/30">
                      Native Annotated CSV
                    </span>
                  </h3>
                  <p className="text-xs text-slate-400">
                    POD Terpilih: <strong className="text-slate-200">{activePod?.name || 'POD'}</strong> ({activePod?.host})
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsCliModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="space-y-4 overflow-y-auto pr-1 flex-1 text-xs">
              {/* Tab Selector: Only Tab 1 (SSH) and Tab 4 (Files) */}
              <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800 gap-1 flex-shrink-0">
                <button
                  type="button"
                  onClick={() => setCliTab('pod_ssh')}
                  className={`flex-1 py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition ${cliTab === 'pod_ssh'
                    ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                    }`}
                >
                  <Server className="w-3.5 h-3.5" />
                  <span>1. Terminal SSH di POD</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setCliTab('files');
                    loadPodExportFiles(selectedPodId);
                  }}
                  className={`flex-1 py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition ${cliTab === 'files'
                    ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                    }`}
                >
                  <FolderOpen className="w-3.5 h-3.5" />
                  <span>2. Berkas di POD ({exportFiles.length})</span>
                </button>
              </div>

              {/* Tab 2 Content: Riwayat Berkas di POD */}
              {cliTab === 'files' ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-slate-950 rounded-xl border border-slate-800">
                    <div className="space-y-0.5">
                      <div className="text-slate-200 font-semibold flex items-center gap-2">
                        <FolderOpen className="w-4 h-4 text-amber-400" />
                        <span>Berkas Hasil Ekspor di POD: <code className="text-amber-300 font-mono text-[11px]">/home/pod/exports/</code></span>
                      </div>
                      <p className="text-[11px] text-slate-400">
                        Total {exportFiles.length} berkas CSV tersimpan di hard drive unit {activePod?.name || 'POD'}.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => loadPodExportFiles(selectedPodId)}
                      disabled={exportFilesLoading}
                      className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-medium flex items-center gap-1.5 transition border border-slate-700"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${exportFilesLoading ? 'animate-spin text-amber-400' : ''}`} />
                      <span>Segarkan</span>
                    </button>
                  </div>

                  {exportFilesLoading && exportFiles.length === 0 ? (
                    <div className="p-8 text-center bg-slate-950 rounded-xl border border-slate-800 space-y-2">
                      <RefreshCw className="w-6 h-6 animate-spin text-amber-400 mx-auto" />
                      <p className="text-slate-400 text-xs">Memeriksa berkas ekspor di POD via SSH...</p>
                    </div>
                  ) : exportFiles.length === 0 ? (
                    <div className="p-8 text-center bg-slate-950 rounded-xl border border-slate-800 space-y-2">
                      <FolderOpen className="w-8 h-8 text-slate-600 mx-auto" />
                      <h4 className="font-semibold text-slate-300 text-sm">Belum Ada Berkas Hasil Ekspor</h4>
                      <p className="text-slate-500 text-xs max-w-sm mx-auto">
                        Jalankan ekspor CLI untuk membuat berkas CSV di POD.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                      {exportFiles.map((file) => (
                        <div
                          key={file.fileName}
                          className="p-3 bg-slate-950 hover:bg-slate-900/80 rounded-xl border border-slate-800/80 transition space-y-2.5"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-start gap-2.5 min-w-0">
                              <div className="p-2 bg-amber-500/10 text-amber-400 rounded-lg border border-amber-500/20 flex-shrink-0 mt-0.5">
                                <FileCode className="w-4 h-4" />
                              </div>
                              <div className="min-w-0">
                                <div className="font-mono text-xs font-bold text-slate-200 truncate select-all" title={file.fileName}>
                                  {file.fileName}
                                </div>
                                <div className="flex items-center gap-3 text-[11px] text-slate-400 mt-0.5">
                                  <span className="px-1.5 py-0.2 bg-slate-800 text-amber-300 rounded font-semibold text-[10px]">
                                    {file.sizeHuman}
                                  </span>
                                  <span>{file.modifiedAt}</span>
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Quick Action Buttons for file */}
                          <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-800/60 flex-wrap">
                            <div className="flex items-center gap-2 flex-wrap">
                              <button
                                type="button"
                                onClick={() => handleDirectDownload(file)}
                                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-lg text-xs flex items-center gap-1.5 shadow-sm transition"
                                title="Download berkas ini langsung ke komputer/klien Anda melalui browser"
                              >
                                <Download className="w-3.5 h-3.5" />
                                <span>Download ke Laptop Ini</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => handleCopyScpCommand(file)}
                                className="px-3 py-1.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition"
                                title="Salin perintah terminal SCP untuk download via command line"
                              >
                                {copiedScpFilename === file.fileName ? (
                                  <>
                                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                                    <span className="text-emerald-400">SCP Tersalin!</span>
                                  </>
                                ) : (
                                  <>
                                    <Terminal className="w-3.5 h-3.5 text-amber-400" />
                                    <span>Salin Perintah SCP</span>
                                  </>
                                )}
                              </button>
                            </div>

                            <button
                              type="button"
                              onClick={() => handleDeleteExportFile(file.fileName)}
                              disabled={deletingFilename === file.fileName}
                              className="px-2.5 py-1.5 bg-slate-800 hover:bg-rose-950/40 hover:text-rose-400 text-slate-400 border border-slate-700/60 rounded-lg text-xs transition flex items-center gap-1 disabled:opacity-50"
                              title="Hapus berkas ini dari POD"
                            >
                              {deletingFilename === file.fileName ? (
                                <RefreshCw className="w-3.5 h-3.5 animate-spin text-rose-400" />
                              ) : (
                                <Trash2 className="w-3.5 h-3.5" />
                              )}
                              <span>Hapus</span>
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <>
                  {/* Target Filename Input */}
                  <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-2">
                    <div className="flex items-center justify-between flex-wrap gap-1">
                      <label className="text-slate-200 font-semibold text-xs flex items-center gap-1.5">
                        <FileSpreadsheet className="w-3.5 h-3.5 text-amber-400" />
                        <span>Nama Berkas Target (.csv):</span>
                      </label>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => setCliCustomFilename('chair.csv')}
                          className={`px-2 py-0.5 rounded text-[11px] font-mono transition border ${activeCliFilename === 'chair.csv'
                            ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 font-bold'
                            : 'bg-slate-900 hover:bg-slate-800 text-slate-400 border-slate-800'
                            }`}
                        >
                          chair.csv
                        </button>
                        <button
                          type="button"
                          onClick={() => setCliCustomFilename(`${selectedMeasurements[0] || 'export'}.csv`)}
                          className="px-2 py-0.5 bg-slate-900 hover:bg-slate-800 text-slate-400 rounded text-[11px] font-mono transition border border-slate-800"
                        >
                          {selectedMeasurements[0] || 'measurement'}.csv
                        </button>
                        <button
                          type="button"
                          onClick={() => setCliCustomFilename('')}
                          className="px-2 py-0.5 bg-slate-900 hover:bg-slate-800 text-slate-400 rounded text-[11px] transition border border-slate-800"
                        >
                          Reset Default
                        </button>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={cliCustomFilename}
                        onChange={(e) => setCliCustomFilename(e.target.value)}
                        placeholder={defaultCliFilename}
                        className="flex-1 bg-slate-900 border border-slate-700/80 rounded-lg px-3 py-1.5 text-amber-300 font-mono text-xs focus:outline-none focus:border-amber-500/50"
                      />
                    </div>
                    <div className="text-[10px] text-slate-400 flex items-center justify-between">
                      <span>
                        Target path di POD: <code className="text-amber-300 font-mono">/home/pod/exports/{activeCliFilename}</code>
                      </span>
                      {cliCustomFilename && (
                        <span className="text-emerald-400 flex items-center gap-1 font-medium">
                          <Check className="w-3 h-3" /> Nama Kustom Aktif
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Flux Query Customizer / Viewer */}
                  <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-2">
                    <div className="flex items-center justify-between flex-wrap gap-1">
                      <div className="flex items-center gap-2">
                        <span className="text-slate-200 font-semibold text-xs flex items-center gap-1.5">
                          <Code className="w-3.5 h-3.5 text-cyan-400" />
                          <span>Query Flux yang Digunakan:</span>
                        </span>
                        <span className="text-[10px] px-1.5 py-0.5 bg-slate-800 text-cyan-300 rounded font-mono border border-slate-700">
                          bucket: {selectedBuckets.join(', ') || 'pod_monitoring'}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            if (!cliEditQueryMode) {
                              setCliManualFluxOverride(cliFluxQuery);
                            }
                            setCliEditQueryMode(!cliEditQueryMode);
                          }}
                          className={`px-2.5 py-1 rounded text-xs font-semibold flex items-center gap-1 transition ${cliEditQueryMode
                            ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                            : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700'
                            }`}
                        >
                          <Edit3 className="w-3 h-3" />
                          <span>{cliEditQueryMode ? 'Kustomisasi Aktif' : 'Edit Query Manual'}</span>
                        </button>
                        {cliEditQueryMode && (
                          <button
                            type="button"
                            onClick={() => {
                              const sample = `from(bucket: "power_monitoring")\n  |> range(start: 2026-08-31T00:00:00Z, stop: 2026-09-03T00:00:00Z)\n  |> filter(fn: (r) => r._measurement == "mod_chair")`;
                              setCliManualFluxOverride(sample);
                              setCliCustomFilename('chair.csv');
                            }}
                            className="px-2 py-1 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 rounded text-xs border border-amber-500/30 transition font-mono"
                            title="Muat contoh query power_monitoring chair.csv"
                          >
                            Contoh: chair.csv
                          </button>
                        )}
                      </div>
                    </div>

                    {cliEditQueryMode ? (
                      <div className="space-y-1.5">
                        <textarea
                          value={cliManualFluxOverride}
                          onChange={(e) => setCliManualFluxOverride(e.target.value)}
                          rows={4}
                          className="w-full bg-slate-900 border border-cyan-500/40 rounded-lg p-2.5 text-cyan-300 font-mono text-xs focus:outline-none focus:border-cyan-400"
                          placeholder="from(bucket: ...)..."
                        />
                        <div className="flex items-center justify-end text-[10px]">
                          <button
                            type="button"
                            onClick={() => {
                              setCliEditQueryMode(false);
                              setCliManualFluxOverride('');
                            }}
                            className="text-amber-400 hover:underline"
                          >
                            Reset ke Filter UI
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="relative group">
                        <pre className="p-2.5 bg-slate-900/80 text-cyan-300/90 font-mono text-[10px] rounded-lg border border-slate-800/80 overflow-x-auto whitespace-pre-wrap max-h-24 select-all">
                          {cliFluxQuery}
                        </pre>
                      </div>
                    )}
                  </div>

                  {/* Options: Full Dump vs Limit */}
                  <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                    <div className="flex items-center justify-between">
                      <label className="flex items-center gap-2 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={cliIncludeLimit}
                          onChange={(e) => setCliIncludeLimit(e.target.checked)}
                          className="w-4 h-4 rounded border-slate-700 text-amber-500 focus:ring-amber-500/20 bg-slate-900"
                        />
                        <span className="font-semibold text-slate-200 text-xs">
                          Batasi jumlah baris ({rowLimit || 1000} baris)
                        </span>
                      </label>
                      <span className={`text-[11px] font-medium px-2 py-0.5 rounded ${!cliIncludeLimit
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                        : 'bg-slate-800 text-slate-400'
                        }`}>
                        {!cliIncludeLimit ? 'Mode Full Dump (Semua Data Historis)' : `Limit: ${rowLimit || 1000}`}
                      </span>
                    </div>
                  </div>

                  {/* Command Display Box */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                        <Terminal className="w-3.5 h-3.5 text-amber-400" />
                        <span>Perintah Influx CLI (Terminal SSH di POD)</span>
                      </span>
                      <button
                        type="button"
                        onClick={handleCopyCliCommand}
                        className="px-2.5 py-1 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition"
                      >
                        {copiedCliCmd ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                            <span className="text-emerald-400 font-bold">Tersalin ke Clipboard!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            <span>Salin Perintah</span>
                          </>
                        )}
                      </button>
                    </div>

                    <div className="relative group">
                      <pre className="p-3.5 bg-slate-950 text-amber-300 font-mono text-[11px] rounded-xl border border-slate-800 overflow-x-auto whitespace-pre-wrap leading-relaxed max-h-56 select-all">
                        {activeCliCommand}
                      </pre>
                    </div>
                  </div>

                  {/* Direct Server Execution Button */}
                  <div className="p-3 bg-gradient-to-r from-amber-500/10 via-slate-950 to-amber-500/10 rounded-xl border border-amber-500/30 flex items-center justify-between gap-3">
                    <div className="space-y-0.5">
                      <span className="font-semibold text-slate-200 text-xs flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                        Jalankan Ekspor Otomatis di POD
                      </span>
                      <p className="text-[11px] text-slate-400">
                        Eksekusi via SSH dan simpan langsung ke <code className="text-amber-300 font-mono">/home/pod/exports/</code>
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={handleRunCliExportOnPod}
                      disabled={cliExecuting || !selectedPodId}
                      className="px-3 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-lg text-xs font-bold shadow-lg shadow-amber-500/20 flex items-center gap-1.5 transition whitespace-nowrap disabled:opacity-50"
                    >
                      {cliExecuting ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          <span>Mengekspor di POD...</span>
                        </>
                      ) : (
                        <>
                          <Play className="w-3.5 h-3.5 fill-slate-950" />
                          <span>Jalankan di POD</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* Execution Result Banner */}
                  {cliExecutionResult && (
                    <div className={`p-3.5 rounded-xl border text-xs space-y-2.5 ${cliExecutionResult.success
                      ? 'bg-emerald-950/40 border-emerald-800 text-emerald-200'
                      : 'bg-rose-950/40 border-rose-800 text-rose-200'
                      }`}>
                      <div className="flex items-center gap-2 font-semibold">
                        {cliExecutionResult.success ? (
                          <>
                            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                            <span>Ekspor Influx CLI di POD Berhasil!</span>
                          </>
                        ) : (
                          <>
                            <XCircle className="w-4 h-4 text-rose-400" />
                            <span>Gagal Menjalankan Ekspor di POD</span>
                          </>
                        )}
                      </div>

                      {cliExecutionResult.success && cliExecutionResult.data && (
                        <div className="space-y-2 text-[11px] text-slate-300 bg-slate-950/80 p-2.5 rounded-lg border border-slate-800">
                          <div className="font-mono">
                            <div><strong className="text-emerald-400">Lokasi File di POD:</strong> {cliExecutionResult.data.filePath}</div>
                            <div><strong className="text-emerald-400">Rincian Ukuran:</strong> {cliExecutionResult.data.outputSummary}</div>
                          </div>

                          {/* Instant Action Buttons in Result Banner */}
                          <div className="flex items-center gap-2 pt-2 border-t border-slate-800/80 flex-wrap">
                            <button
                              type="button"
                              onClick={() => handleDirectDownload({ fileName: cliExecutionResult.data.fileName })}
                              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg text-xs flex items-center gap-1.5 shadow-md shadow-emerald-600/20 transition"
                            >
                              <Download className="w-3.5 h-3.5" />
                              <span>Download ke Laptop Ini</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => handleCopyScpCommand({
                                fileName: cliExecutionResult.data.fileName,
                                scpCommand: `scp ${activePod?.username || 'pod'}@${activePod?.host}:${cliExecutionResult.data.filePath} ~/Downloads/`
                              })}
                              className="px-3 py-1.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 font-semibold rounded-lg text-xs flex items-center gap-1.5 transition"
                            >
                              {copiedScpFilename === cliExecutionResult.data.fileName ? (
                                <>
                                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                                  <span className="text-emerald-400 font-bold">SCP Tersalin!</span>
                                </>
                              ) : (
                                <>
                                  <Terminal className="w-3.5 h-3.5 text-amber-400" />
                                  <span>Salin Perintah SCP</span>
                                </>
                              )}
                            </button>

                            <button
                              type="button"
                              onClick={() => setCliTab('files')}
                              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-medium flex items-center gap-1.5 transition ml-auto"
                            >
                              <FolderOpen className="w-3.5 h-3.5 text-cyan-400" />
                              <span>Lihat Riwayat Berkas ({exportFiles.length})</span>
                            </button>
                          </div>
                        </div>
                      )}

                      {!cliExecutionResult.success && (
                        <p className="text-rose-300">{cliExecutionResult.error}</p>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Modal Footer */}
            <div className="pt-3 border-t border-slate-800 flex items-center justify-between flex-shrink-0">
              <div className="flex items-center gap-2">
                {cliTab !== 'files' && (
                  <button
                    type="button"
                    onClick={handleCopyCliCommand}
                    className="flex items-center gap-1.5 px-4 py-2 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 rounded-lg text-xs font-semibold transition"
                  >
                    {copiedCliCmd ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedCliCmd ? 'Tersalin!' : 'Salin Perintah CLI'}</span>
                  </button>
                )}
                {cliTab === 'files' && (
                  <button
                    type="button"
                    onClick={() => loadPodExportFiles(selectedPodId)}
                    className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-medium transition"
                  >
                    <RefreshCw className="w-3.5 h-3.5 text-amber-400" />
                    <span>Segarkan Daftar Berkas</span>
                  </button>
                )}
              </div>
              <button
                type="button"
                onClick={() => setIsCliModalOpen(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-medium transition"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
