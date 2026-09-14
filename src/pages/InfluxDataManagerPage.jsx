import React, { useState, useEffect, useMemo } from 'react';
import {
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
  Settings,
  Key,
  Globe,
  Plus,
  Trash2,
  Layers,
  ChevronLeft,
  ChevronRight,
  Code,
  Copy,
  Check,
  Cpu,
  FolderOpen,
  Save,
  Sparkles,
  Pencil,
  X,
  ChevronDown,
  Calendar,
  Clock,
  CheckSquare,
  Square
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
import {
  fetchInfluxHealthApi,
  fetchInfluxConfigApi,
  saveInfluxConfigApi,
  fetchInfluxBucketsApi,
  fetchInfluxSchemaApi,
  fetchInfluxQueryTemplatesApi,
  saveInfluxQueryTemplateApi,
  updateInfluxQueryTemplateApi,
  deleteInfluxQueryTemplateApi,
  queryInfluxDataApi,
  downloadInfluxExport
} from '../api/influxApi';

const FIELD_COLORS = [
  '#06b6d4', // Cyan
  '#10b981', // Emerald
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

const templateCategories = [
  'Semua',
  'Sensor Hardware',
  'Kelistrikan',
  'Sistem & Heartbeat',
  'Air Conditioning',
  'Audio & Soundscape',
  'Kustom Pengguna'
];

export default function InfluxDataManagerPage({ onBack }) {
  // Connection & Config State
  const [healthData, setHealthData] = useState(null);
  const [healthLoading, setHealthLoading] = useState(true);
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);
  const [configForm, setConfigForm] = useState({
    url: 'http://10.20.10.3:8086',
    token: '',
    org: 'pod',
    bucket: 'pod_monitoring'
  });
  const [configTesting, setConfigTesting] = useState(false);
  const [configTestResult, setConfigTestResult] = useState(null);
  const [configSaving, setConfigSaving] = useState(false);

  // Schema & Auto-Discovery
  const [buckets, setBuckets] = useState([]);
  const [measurements, setMeasurements] = useState([]);
  const [availableFields, setAvailableFields] = useState([]);
  const [availableUnits, setAvailableUnits] = useState([]);
  const [availableTagKeys, setAvailableTagKeys] = useState([]);
  const [availableTagValues, setAvailableTagValues] = useState({});
  const [bucketSearch, setBucketSearch] = useState('');
  const [tagSearches, setTagSearches] = useState({});
  const [customTagKey, setCustomTagKey] = useState('');
  const [customTagVal, setCustomTagVal] = useState('');
  const [schemaLoading, setSchemaLoading] = useState(false);

  // Query Filter State
  const [selectedBucket, setSelectedBucket] = useState('pod_logs_bhar');
  const [timeRangePreset, setTimeRangePreset] = useState('-1h'); // 'variable' | '-15m' | '-1h' | '-6h' | '-24h' | '-7d' | '-30d' | 'custom'
  const [customStart, setCustomStart] = useState('');
  const [customStop, setCustomStop] = useState('');

  // Helper to format Date into local HTML datetime-local format (YYYY-MM-DDTHH:mm)
  function toLocalDatetimeInput(d) {
    if (!d) return '';
    const date = (d instanceof Date) ? d : new Date(d);
    if (isNaN(date.getTime())) return '';
    const pad = (n) => String(n).padStart(2, '0');
    const year = date.getFullYear();
    const month = pad(date.getMonth() + 1);
    const day = pad(date.getDate());
    const hours = pad(date.getHours());
    const minutes = pad(date.getMinutes());
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  }

  // Format date/duration into valid Influx Flux RFC3339 timestamp literal or relative interval
  function formatFluxTimeLiteral(val, isStop = false) {
    if (!val) return null;
    const s = String(val).trim();
    if (!s) return null;
    if (/^-\d+[smhdwmo]$/i.test(s) || s === 'now()') return s;
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
      return new Date(`${s}${isStop ? 'T23:59:59.999Z' : 'T00:00:00.000Z'}`).toISOString();
    }
    const d = new Date(s);
    return !isNaN(d.getTime()) ? d.toISOString() : s;
  }

  // Handle preset selection with auto-init for custom range
  function handleSelectTimeRange(val) {
    setTimeRangePreset(val);
    if (val === 'custom') {
      if (!customStart) {
        const now = new Date();
        const start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);
        setCustomStart(toLocalDatetimeInput(start));
        setCustomStop(toLocalDatetimeInput(now));
      }
    }
  }

  // Quick date shortcut chips
  function applyDateShortcut(type) {
    const now = new Date();
    if (type === 'today') {
      const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
      setCustomStart(toLocalDatetimeInput(start));
      setCustomStop(toLocalDatetimeInput(now));
    } else if (type === 'yesterday') {
      const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 0, 0, 0);
      const stop = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 23, 59, 59);
      setCustomStart(toLocalDatetimeInput(start));
      setCustomStop(toLocalDatetimeInput(stop));
    } else if (type === 'last7d') {
      const start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      start.setHours(0, 0, 0, 0);
      setCustomStart(toLocalDatetimeInput(start));
      setCustomStop(toLocalDatetimeInput(now));
    } else if (type === 'last30d') {
      const start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      start.setHours(0, 0, 0, 0);
      setCustomStart(toLocalDatetimeInput(start));
      setCustomStop(toLocalDatetimeInput(now));
    } else if (type === 'thisMonth') {
      const start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);
      setCustomStart(toLocalDatetimeInput(start));
      setCustomStop(toLocalDatetimeInput(now));
    } else if (type === 'lastMonth') {
      const start = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0);
      const stop = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
      setCustomStart(toLocalDatetimeInput(start));
      setCustomStop(toLocalDatetimeInput(stop));
    }
  }

  // Quick 1 full month selector
  function handleSelectMonth(monthStr) {
    if (!monthStr) return;
    const [y, m] = monthStr.split('-').map(Number);
    const start = new Date(y, m - 1, 1, 0, 0, 0);
    const stop = new Date(y, m, 0, 23, 59, 59);
    setCustomStart(toLocalDatetimeInput(start));
    setCustomStop(toLocalDatetimeInput(stop));
  }

  // Human-readable summary of selected custom range
  const customRangeSummary = useMemo(() => {
    if (timeRangePreset !== 'custom' || !customStart) return null;
    try {
      const dStart = new Date(customStart);
      if (isNaN(dStart.getTime())) return null;
      const startText = dStart.toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
      let stopText = 'Sekarang (now)';
      if (customStop) {
        const dStop = new Date(customStop);
        if (!isNaN(dStop.getTime())) {
          stopText = dStop.toLocaleDateString('id-ID', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          });
        }
      }
      return `${startText}  ➔  ${stopText}`;
    } catch (e) {
      return null;
    }
  }, [timeRangePreset, customStart, customStop]);

  // Multi-select Measurement State
  const [selectedMeasurements, setSelectedMeasurements] = useState(() => {
    try {
      const initialMeas = localStorage.getItem('influx_explorer_initial_measurement');
      if (initialMeas) {
        localStorage.removeItem('influx_explorer_initial_measurement');
        return [initialMeas];
      }
      if (localStorage.getItem('influx_explorer_initial_pod')) {
        return ['pod_heartbeat_logs'];
      }
    } catch (_) {}
    return ['pod_heartbeat_logs'];
  });
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

  // Multi-select Field State
  const [selectedFields, setSelectedFields] = useState(() => {
    try {
      const initialField = localStorage.getItem('influx_explorer_initial_field');
      if (initialField) {
        localStorage.removeItem('influx_explorer_initial_field');
        return [initialField];
      }
    } catch (_) {}
    return ['hb'];
  });
  const [isFieldDropdownOpen, setIsFieldDropdownOpen] = useState(false);
  const [fieldSearchTerm, setFieldSearchTerm] = useState('');
  const selectedField = selectedFields[0] || '';

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

  const [selectedUnit, setSelectedUnit] = useState('all'); // e.g. 'pod_31' | 'all'
  const [tagFilters, setTagFilters] = useState(() => {
    try {
      const initialPod = localStorage.getItem('influx_explorer_initial_pod');
      if (initialPod) {
        localStorage.removeItem('influx_explorer_initial_pod');
        return [{ key: 'pod_name', value: String(initialPod).trim() }];
      }
    } catch (_) {}
    return [];
  }); // [{ key: '', value: '' }]
  const [aggregationInterval, setAggregationInterval] = useState('1m'); // 'none' | '10s' | '1m' | '5m' | '15m' | '1h'
  const [aggregationFn, setAggregationFn] = useState('mean'); // 'mean' | 'max' | 'min' | 'last'
  const [rowLimit, setRowLimit] = useState(1000);

  // Dynamic Tag Explorer Helpers
  const isTagValueActive = (key, value) => {
    return tagFilters.some(tf => tf.key === key && String(tf.value) === String(value));
  };

  const toggleTagValue = (key, value) => {
    setTagFilters(prev => {
      const exists = prev.find(tf => tf.key === key && String(tf.value) === String(value));
      if (exists) {
        return prev.filter(tf => !(tf.key === key && String(tf.value) === String(value)));
      } else {
        return [...prev.filter(tf => tf.key !== key), { key, value: String(value) }];
      }
    });
  };

  const clearTagKey = (key) => {
    setTagFilters(prev => prev.filter(tf => tf.key !== key));
  };

  const handleAddCustomTag = () => {
    if (!customTagKey.trim() || !customTagVal.trim()) return;
    const k = customTagKey.trim();
    const v = customTagVal.trim();
    setTagFilters(prev => [...prev.filter(tf => !(tf.key === k && tf.value === v)), { key: k, value: v }]);
    setCustomTagKey('');
    setCustomTagVal('');
  };

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
  const [tableSearch, setTableSearch] = useState('');
  const [exportingFormat, setExportingFormat] = useState(null); // 'csv' | 'json' | null

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  // Query Templates State
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
  const [deleteTargetTemplate, setDeleteTargetTemplate] = useState(null);
  const [templateDeleting, setTemplateDeleting] = useState(false);

  // Initial Load: Check Connection, Buckets, and Templates
  useEffect(() => {
    loadHealthAndBuckets();
    loadTemplates();
  }, []);

  async function loadTemplates() {
    try {
      setTemplatesLoading(true);
      const res = await fetchInfluxQueryTemplatesApi();
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
      if (tmpl.config.bucket) setSelectedBucket(tmpl.config.bucket);
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
    setTemplateFeedback(`Template "${tmpl.name}" berhasil diterapkan!`);
    setTimeout(() => setTemplateFeedback(null), 4500);

    if (autoRun) {
      setTimeout(() => {
        handleExecuteQuery();
      }, 150);
    }
  }

  function handleOpenCreateTemplate() {
    setIsEditMode(false);
    setTemplateForm({
      id: null,
      name: `${selectedMeasurements.join(', ') || 'Query'} - ${selectedFields.join(', ') || ''}`,
      description: `Template query sensor ${selectedMeasurements.join(', ') || ''} Influx Contabo`,
      category: 'Sensor Hardware',
      isRawFlux: isManualFluxMode,
      rawFluxQuery: isManualFluxMode ? (manualFluxQuery || generatedFluxQuery) : '',
      config: !isManualFluxMode ? {
        bucket: selectedBucket,
        measurement: selectedMeasurements[0] || '',
        measurements: selectedMeasurements,
        field: selectedFields[0] || '',
        fields: selectedFields,
        unit: selectedUnit,
        timeRange: timeRangePreset,
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

  function handleSyncCurrentQueryToTemplate() {
    setTemplateForm(prev => ({
      ...prev,
      isRawFlux: isManualFluxMode,
      rawFluxQuery: isManualFluxMode ? (manualFluxQuery || generatedFluxQuery) : '',
      config: !isManualFluxMode ? {
        bucket: selectedBucket,
        measurement: selectedMeasurements[0] || '',
        measurements: selectedMeasurements,
        field: selectedFields[0] || '',
        fields: selectedFields,
        unit: selectedUnit,
        timeRange: timeRangePreset,
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

  async function handleSaveTemplate() {
    if (!templateForm.name.trim()) {
      alert('Nama template tidak boleh kosong.');
      return;
    }

    setTemplateSaving(true);
    try {
      if (isEditMode && templateForm.id) {
        const payload = {
          name: templateForm.name.trim(),
          description: templateForm.description.trim(),
          category: templateForm.category || 'Sensor Hardware',
          isRawFlux: templateForm.isRawFlux,
          rawFluxQuery: templateForm.isRawFlux ? templateForm.rawFluxQuery : null,
          config: !templateForm.isRawFlux ? templateForm.config : null
        };

        const res = await updateInfluxQueryTemplateApi(templateForm.id, payload);
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
        const payload = {
          name: templateForm.name.trim(),
          description: templateForm.description.trim(),
          category: templateForm.category || 'Sensor Hardware',
          isRawFlux: templateForm.isRawFlux,
          rawFluxQuery: templateForm.isRawFlux ? templateForm.rawFluxQuery : null,
          config: !templateForm.isRawFlux ? templateForm.config : null
        };

        const res = await saveInfluxQueryTemplateApi(payload);
        if (res && res.success) {
          if (res.data) {
            setTemplates(prev => [res.data, ...prev]);
          }
          setIsSaveTemplateModalOpen(false);
          setTemplateFeedback(`Template "${payload.name}" berhasil disimpan!`);
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

  async function handleConfirmDeleteTemplate() {
    if (!deleteTargetTemplate) return;
    const { id, name } = deleteTargetTemplate;
    setTemplateDeleting(true);
    try {
      setTemplates(prev => prev.filter(t => t.id !== id));
      const res = await deleteInfluxQueryTemplateApi(id);
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

  const filteredTemplates = useMemo(() => {
    return templates.filter(tmpl => {
      const matchCat = templateCategoryFilter === 'Semua' || tmpl.category === templateCategoryFilter;
      const matchSearch = !templateSearchTerm.trim() ||
        tmpl.name?.toLowerCase().includes(templateSearchTerm.toLowerCase()) ||
        tmpl.description?.toLowerCase().includes(templateSearchTerm.toLowerCase()) ||
        (tmpl.raw_flux_query && tmpl.raw_flux_query.toLowerCase().includes(templateSearchTerm.toLowerCase()));
      return matchCat && matchSearch;
    });
  }, [templates, templateCategoryFilter, templateSearchTerm]);

  // When selected bucket or measurement changes, reload schema (fields & units)
  const measurementKey = selectedMeasurements.join(',');
  useEffect(() => {
    if (selectedBucket) {
      loadBucketSchema(selectedBucket, selectedMeasurements);
    }
  }, [selectedBucket, measurementKey]);

  const loadHealthAndBuckets = async () => {
    setHealthLoading(true);
    try {
      const [healthRes, configRes] = await Promise.allSettled([
        fetchInfluxHealthApi(),
        fetchInfluxConfigApi()
      ]);

      if (healthRes.status === 'fulfilled' && healthRes.value?.success) {
        setHealthData(healthRes.value.data);
        // Default bucket tetap pod_logs_bhar sesuai konfigurasi telemetri POD
      }

      if (configRes.status === 'fulfilled' && configRes.value?.success) {
        const c = configRes.value.data;
        setConfigForm(prev => ({
          ...prev,
          url: c.url || prev.url,
          org: c.org || prev.org,
          bucket: c.bucket || prev.bucket
        }));
      }

      // Fetch buckets list
      try {
        const bRes = await fetchInfluxBucketsApi();
        if (bRes.success && Array.isArray(bRes.data)) {
          const list = [...bRes.data];
          if (!list.some(b => b.name === 'pod_logs_bhar')) {
            list.unshift({ id: 'pod_logs_bhar', name: 'pod_logs_bhar', description: 'Log Monitoring & Telemetri POD' });
          }
          setBuckets(list);
        }
      } catch (_) { }
    } catch (err) {
      setHealthData({ connected: false, error: err.message });
    } finally {
      setHealthLoading(false);
    }
  };

  const loadBucketSchema = async (bucketName, measList) => {
    setSchemaLoading(true);
    try {
      const res = await fetchInfluxSchemaApi(bucketName, measList);
      if (res && res.success && res.data) {
        if (Array.isArray(res.data.measurements) && res.data.measurements.length > 0) {
          setMeasurements(res.data.measurements);
          setSelectedMeasurements(prev => {
            const valid = prev.filter(m => res.data.measurements.includes(m));
            if (valid.length === prev.length && valid.every((m, idx) => m === prev[idx])) {
              return prev; // Same reference, avoid infinite loop
            }
            return valid.length > 0 ? valid : [res.data.measurements[0]];
          });
        }
        if (Array.isArray(res.data.fields) && res.data.fields.length > 0) {
          setAvailableFields(res.data.fields);
          setSelectedFields(prev => {
            const valid = prev.filter(f => res.data.fields.includes(f));
            if (valid.length === prev.length && valid.every((f, idx) => f === prev[idx])) {
              return prev; // Same reference, avoid infinite loop
            }
            return valid.length > 0 ? valid : [res.data.fields[0]];
          });
        }
        // Extract units from tagValues.unit or units array
        const discoveredUnits = (res.data.tagValues && Array.isArray(res.data.tagValues.unit) && res.data.tagValues.unit.length > 0)
          ? res.data.tagValues.unit
          : (Array.isArray(res.data.units) ? res.data.units : []);
        if (discoveredUnits.length > 0) {
          setAvailableUnits(discoveredUnits);
        }
        if (Array.isArray(res.data.tagKeys)) {
          setAvailableTagKeys(res.data.tagKeys);
        }
        if (res.data.tagValues && typeof res.data.tagValues === 'object') {
          setAvailableTagValues(res.data.tagValues);
        }
      }
    } catch (_) {
    } finally {
      setSchemaLoading(false);
    }
  };

  // Build the live Flux Query matching the multi-parameter syntax
  const generatedFluxQuery = useMemo(() => {
    const lines = [];
    lines.push(`from(bucket: "${selectedBucket || 'pod_logs_bhar'}")`);

    if (timeRangePreset === 'variable') {
      lines.push(`  |> range(start: v.timeRangeStart, stop: v.timeRangeStop)`);
    } else if (timeRangePreset === 'custom' && customStart) {
      const formattedStart = formatFluxTimeLiteral(customStart, false);
      const formattedStop = formatFluxTimeLiteral(customStop, true);
      if (formattedStart) {
        if (formattedStop) {
          lines.push(`  |> range(start: ${formattedStart}, stop: ${formattedStop})`);
        } else {
          lines.push(`  |> range(start: ${formattedStart})`);
        }
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

    tagFilters.forEach(tf => {
      if (tf.key && tf.value) {
        lines.push(`  |> filter(fn: (r) => r["${tf.key.trim()}"] == "${tf.value.trim()}")`);
      }
    });

    if (aggregationInterval && aggregationInterval !== 'none') {
      lines.push(`  |> aggregateWindow(every: ${aggregationInterval}, fn: ${aggregationFn || 'mean'}, createEmpty: false)`);
      lines.push(`  |> yield(name: "${aggregationFn || 'mean'}")`);
    }

    if (rowLimit && Number(rowLimit) > 0) {
      lines.push(`  |> limit(n: ${rowLimit})`);
    }

    return lines.join('\n');
  }, [
    selectedBucket,
    timeRangePreset,
    customStart,
    customStop,
    selectedMeasurements,
    selectedFields,
    tagFilters,
    aggregationInterval,
    aggregationFn,
    rowLimit
  ]);

  // Keep manual query synchronized when not in manual editing mode
  useEffect(() => {
    if (!isManualFluxMode) {
      setManualFluxQuery(generatedFluxQuery);
    }
  }, [generatedFluxQuery, isManualFluxMode]);

  // Handle Query Execution
  // Handle Query Execution - 100% high-fidelity execution of generated or manual Flux query
  const handleExecuteQuery = async () => {
    setQueryLoading(true);
    setQueryError(null);
    setCurrentPage(1);

    try {
      const activeQuery = isManualFluxMode && manualFluxQuery.trim() ? manualFluxQuery.trim() : generatedFluxQuery;
      const res = await queryInfluxDataApi({ rawFluxQuery: activeQuery });
      if (res && res.success) {
        setQueryResult(res);
      } else {
        setQueryError(res?.error || 'Gagal menjalankan query.');
      }
    } catch (err) {
      setQueryError(err.message || 'Terjadi kesalahan saat memanggil InfluxDB.');
    } finally {
      setQueryLoading(false);
    }
  };

  // Keyboard Hotkey: Ctrl+Enter or Cmd+Enter to instantly run query
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        handleExecuteQuery();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isManualFluxMode, manualFluxQuery, generatedFluxQuery]);

  // Handle Export (CSV or JSON) - Preserving all multi-selections & exact query filters
  const handleExport = async (format) => {
    setExportingFormat(format);
    try {
      const activeQuery = isManualFluxMode && manualFluxQuery.trim() ? manualFluxQuery.trim() : generatedFluxQuery;
      await downloadInfluxExport({ rawFluxQuery: activeQuery, limit: 50000 }, format);
    } catch (err) {
      alert(`Export Gagal: ${err.message}`);
    } finally {
      setExportingFormat(null);
    }
  };

  const handleCopyQuery = () => {
    const textToCopy = isManualFluxMode ? manualFluxQuery : generatedFluxQuery;
    navigator.clipboard.writeText(textToCopy);
    setCopiedQuery(true);
    setTimeout(() => setCopiedQuery(false), 2000);
  };

  // Dynamic Tag Filters management
  const handleAddTagFilter = () => {
    setTagFilters(prev => [...prev, { key: '', value: '' }]);
  };

  const handleUpdateTagFilter = (index, field, val) => {
    setTagFilters(prev => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: val };
      return copy;
    });
  };

  const handleRemoveTagFilter = (index) => {
    setTagFilters(prev => prev.filter((_, i) => i !== index));
  };

  // Connection Config Handlers
  const handleTestConfig = async () => {
    setConfigTesting(true);
    setConfigTestResult(null);
    try {
      const res = await fetchInfluxHealthApi(configForm);
      if (res.success) {
        setConfigTestResult(res.data);
      } else {
        setConfigTestResult({ connected: false, error: res.error });
      }
    } catch (err) {
      setConfigTestResult({ connected: false, error: err.message });
    } finally {
      setConfigTesting(false);
    }
  };

  const handleSaveConfig = async (e) => {
    e.preventDefault();
    setConfigSaving(true);
    try {
      const res = await saveInfluxConfigApi(configForm);
      if (res.success) {
        setIsConfigModalOpen(false);
        loadHealthAndBuckets();
      } else {
        alert(res.error || 'Gagal menyimpan konfigurasi.');
      }
    } catch (err) {
      alert(err.message);
    } finally {
      setConfigSaving(false);
    }
  };

  // Filter Table Rows
  const filteredRows = useMemo(() => {
    if (!queryResult?.rows) return [];
    if (!tableSearch.trim()) return queryResult.rows;

    const term = tableSearch.toLowerCase();
    return queryResult.rows.filter(r => {
      const matchMeas = r._measurement?.toLowerCase().includes(term);
      const matchField = r._field?.toLowerCase().includes(term);
      const matchVal = String(r._value).toLowerCase().includes(term);
      const matchTime = r._time?.toLowerCase().includes(term);
      const matchTags = Object.entries(r).some(([k, v]) =>
        !['_time', '_measurement', '_field', '_value', 'table'].includes(k) &&
        String(v).toLowerCase().includes(term)
      );
      return matchMeas || matchField || matchVal || matchTime || matchTags;
    });
  }, [queryResult, tableSearch]);

  // Paginated Rows
  const paginatedRows = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredRows.slice(start, start + pageSize);
  }, [filteredRows, currentPage, pageSize]);

  const totalPages = Math.ceil(filteredRows.length / pageSize) || 1;

  // Chart Data Preparation (Multi-Field Support with Timestamp Pivoting)
  const { chartData, chartFields } = useMemo(() => {
    if (!queryResult?.rows || !Array.isArray(queryResult.rows) || queryResult.rows.length === 0) {
      return { chartData: [], chartFields: [] };
    }

    const detectedFields = new Set();
    const timeMap = new Map();

    for (const r of queryResult.rows) {
      if (r._value === null || r._value === undefined || isNaN(Number(r._value))) continue;
      const fName = r._field || 'value';
      detectedFields.add(fName);

      const timeKey = r._time || 'unknown';
      if (!timeMap.has(timeKey)) {
        let timeLabel = '';
        try {
          const d = new Date(r._time);
          timeLabel = d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        } catch (_) {
          timeLabel = String(r._time).slice(11, 19);
        }
        timeMap.set(timeKey, {
          time: timeLabel,
          fullTime: r._time
        });
      }
      const entry = timeMap.get(timeKey);
      entry[fName] = Number(r._value);
    }

    const sortedData = Array.from(timeMap.values()).sort((a, b) => {
      if (!a.fullTime || !b.fullTime) return 0;
      return new Date(a.fullTime) - new Date(b.fullTime);
    });

    const maxPoints = 100;
    let sampledData = sortedData;
    if (sortedData.length > maxPoints) {
      const step = Math.ceil(sortedData.length / maxPoints);
      sampledData = sortedData.filter((_, idx) => idx % step === 0);
    }

    return {
      chartData: sampledData,
      chartFields: Array.from(detectedFields)
    };
  }, [queryResult]);

  // Format Timestamp Helper (WITA UTC+8)
  const formatDateTimeWita = (isoString) => {
    if (!isoString) return '—';
    try {
      const d = new Date(isoString);
      return new Intl.DateTimeFormat('id-ID', {
        timeZone: 'Asia/Makassar',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
      }).format(d) + ' WITA';
    } catch (_) {
      return isoString;
    }
  };

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto pb-16 px-2 sm:px-4">
      {/* ========================================================================= */}
      {/* 1. Header Banner & Safety Badge */}
      {/* ========================================================================= */}
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

      {/* ========================================================================= */}
      {/* 2. Control Bar & Dynamic Filter Builder */}
      {/* ========================================================================= */}
      <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-xl space-y-4">
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

        {/* Visual Filter Form (Hidden if manual mode) */}
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



                {/* Dynamic Tag Cards for event_type or root_cause if present */}
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

        {/* ========================================================================= */}
        {/* Flux Query Preview & Raw Editor Box */}
        {/* ========================================================================= */}
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

      {/* ========================================================================= */}
      {/* 3. Query Results: KPI Cards, Chart Preview & Interactive Table */}
      {/* ========================================================================= */}
      {queryResult && (
        <div className="space-y-5">
          {/* KPI Summary Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Baris</span>
              <div className="text-xl sm:text-2xl font-black text-cyan-400 mt-1 font-mono">
                {queryResult.totalRows.toLocaleString()}
              </div>
            </div>
            <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Durasi Eksekusi</span>
              <div className="text-xl sm:text-2xl font-black text-emerald-400 mt-1 font-mono">
                {queryResult.queryDurationMs} ms
              </div>
            </div>
            <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Measurement</span>
              <div className="text-xl sm:text-2xl font-black text-purple-400 mt-1 font-mono truncate" title={selectedMeasurements.join(', ')}>
                {selectedMeasurements.join(', ') || queryResult.measurements?.[0] || '—'}
              </div>
            </div>
            <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Tags Terdeteksi</span>
              <div className="text-xl sm:text-2xl font-black text-amber-400 mt-1 font-mono">
                {queryResult.tagKeys?.length || 0}
              </div>
            </div>
          </div>

          {/* Chart Preview Section (Shown if numeric data exists) */}
          {chartData.length > 0 && (
            <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-xl space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 flex-wrap">
                  <BarChart2 size={16} className="text-cyan-400" />
                  <h3 className="text-sm font-bold text-white">
                    Visualisasi Tren: {selectedFields.join(', ') || 'Nilai'} ({tagFilters.find(tf => tf.key === 'pod_name')?.value || 'Semua POD'})
                  </h3>
                  <span className="text-[10px] text-slate-500">
                    ({chartData.length} sampel titik, {chartFields.length} field)
                  </span>
                </div>
                <button
                  onClick={() => setShowChart(!showChart)}
                  className="text-xs text-cyan-400 hover:text-cyan-300 font-bold cursor-pointer"
                >
                  {showChart ? 'Sembunyikan Grafik' : 'Tampilkan Grafik'}
                </button>
              </div>

              {showChart && (
                <div className="h-72 w-full pt-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                      <defs>
                        {chartFields.map((f, idx) => {
                          const color = FIELD_COLORS[idx % FIELD_COLORS.length];
                          return (
                            <linearGradient key={f} id={`influxGrad_${f}`} x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor={color} stopOpacity={0.4} />
                              <stop offset="95%" stopColor={color} stopOpacity={0} />
                            </linearGradient>
                          );
                        })}
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                      <XAxis dataKey="time" stroke="#64748b" tick={{ fontSize: 11 }} />
                      <YAxis stroke="#64748b" tick={{ fontSize: 11 }} domain={['auto', 'auto']} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#0f172a',
                          borderColor: '#334155',
                          borderRadius: '8px',
                          fontSize: '12px',
                          color: '#f8fafc'
                        }}
                        labelFormatter={(label, item) => item?.[0]?.payload?.fullTime ? formatDateTimeWita(item[0].payload.fullTime) : label}
                      />
                      <Legend />
                      {chartFields.map((f, idx) => {
                        const color = FIELD_COLORS[idx % FIELD_COLORS.length];
                        return (
                          <Area
                            key={f}
                            type="monotone"
                            dataKey={f}
                            name={f}
                            stroke={color}
                            strokeWidth={2}
                            fillOpacity={1}
                            fill={`url(#influxGrad_${f})`}
                          />
                        );
                      })}
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          )}

          {/* Interactive Data Table */}
          <div className="rounded-2xl bg-slate-900/90 border border-slate-800 shadow-xl overflow-hidden">
            {/* Table Search & Header Bar */}
            <div className="p-4 border-b border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <div className="relative w-full sm:w-72">
                  <Search size={14} className="absolute left-3 top-2.5 text-slate-500" />
                  <input
                    type="text"
                    value={tableSearch}
                    onChange={(e) => {
                      setTableSearch(e.target.value);
                      setCurrentPage(1);
                    }}
                    placeholder="Cari dalam hasil tabel..."
                    className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-slate-950 border border-slate-700/80 text-white text-xs focus:border-cyan-500 focus:outline-none placeholder:text-slate-600"
                  />
                </div>
                <span className="text-xs text-slate-400 whitespace-nowrap">
                  Menampilkan {filteredRows.length.toLocaleString()} baris
                </span>
              </div>

              {/* Page Size Selector */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400">Baris/hal:</span>
                <select
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="px-2 py-1 rounded-lg bg-slate-950 border border-slate-700 text-xs text-white"
                >
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
              </div>
            </div>

            {/* Table Content */}
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-950/80 text-slate-400 border-b border-slate-800">
                    <th className="py-3 px-4 font-semibold uppercase text-[10px]">Waktu (WITA)</th>
                    <th className="py-3 px-4 font-semibold uppercase text-[10px]">Measurement</th>
                    <th className="py-3 px-4 font-semibold uppercase text-[10px]">Field</th>
                    <th className="py-3 px-4 font-semibold uppercase text-[10px]">Value</th>
                    {queryResult.tagKeys?.map((tag) => (
                      <th key={tag} className="py-3 px-4 font-semibold uppercase text-[10px]">
                        Tag: {tag}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono">
                  {paginatedRows.length === 0 ? (
                    <tr>
                      <td
                        colSpan={4 + (queryResult.tagKeys?.length || 0)}
                        className="py-8 text-center text-slate-500 text-xs font-sans"
                      >
                        Tidak ada baris data yang cocok dengan kriteria filter.
                      </td>
                    </tr>
                  ) : (
                    paginatedRows.map((row, idx) => (
                      <tr key={idx} className="hover:bg-slate-800/40 transition-colors">
                        <td className="py-2.5 px-4 text-cyan-300 whitespace-nowrap">
                          {formatDateTimeWita(row._time)}
                        </td>
                        <td className="py-2.5 px-4 font-sans font-medium text-slate-200">
                          <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 text-[11px]">
                            {row._measurement || '—'}
                          </span>
                        </td>
                        <td className="py-2.5 px-4 text-purple-300 font-semibold">
                          {row._field || '—'}
                        </td>
                        <td className="py-2.5 px-4 font-bold text-emerald-400">
                          {row._value !== null && row._value !== undefined ? String(row._value) : '—'}
                        </td>
                        {queryResult.tagKeys?.map((tag) => (
                          <td key={tag} className="py-2.5 px-4 text-slate-400 font-sans text-[11px]">
                            {row[tag] !== undefined && row[tag] !== null ? (
                              <span className="text-amber-300">{String(row[tag])}</span>
                            ) : (
                              '—'
                            )}
                          </td>
                        ))}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            <div className="p-4 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
              <span>
                Halaman {currentPage} dari {totalPages}
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1.5 rounded-lg bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-300 disabled:opacity-40 cursor-pointer flex items-center gap-1"
                >
                  <ChevronLeft size={14} /> Sebelumnya
                </button>
                <button
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={currentPage >= totalPages}
                  className="px-3 py-1.5 rounded-lg bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-300 disabled:opacity-40 cursor-pointer flex items-center gap-1"
                >
                  Berikutnya <ChevronRight size={14} />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 4. InfluxDB Connection Configuration Modal */}
      {/* ========================================================================= */}
      {isConfigModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl bg-slate-900 border border-slate-700 shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2 text-white font-bold">
                <Database size={18} className="text-cyan-400" />
                <span>Pengaturan Koneksi InfluxDB v2</span>
              </div>
              <button
                onClick={() => setIsConfigModalOpen(false)}
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
                    onClick={() => setIsConfigModalOpen(false)}
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
      )}

      {/* ========================================================================= */}
      {/* 5. Template Catalog Modal */}
      {/* ========================================================================= */}
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
                      INFLUX PUSAT
                    </span>
                  </div>
                  <p className="text-xs text-slate-400">
                    Template query tersimpan dapat diterapkan atau langsung dieksekusi untuk memfilter data.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsTemplateModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
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
                    className={`px-2.5 py-1.5 rounded-md text-[11px] font-semibold whitespace-nowrap transition border cursor-pointer ${templateCategoryFilter === cat
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
                    className="text-emerald-400 hover:underline font-semibold text-xs cursor-pointer"
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
                            className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg text-xs font-medium transition flex items-center gap-1 cursor-pointer"
                            title="Terapkan konfigurasi ke form query"
                          >
                            <Sliders className="w-3 h-3 text-emerald-400" />
                            <span>Terapkan</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleApplyTemplate(tmpl, true)}
                            className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold shadow-md shadow-emerald-600/20 transition flex items-center gap-1 cursor-pointer"
                            title="Terapkan dan langsung eksekusi query"
                          >
                            <Play className="w-3 h-3 fill-white" />
                            <span>Terapkan & Jalankan</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleOpenEditTemplate(tmpl)}
                            className="p-1.5 text-slate-400 hover:text-amber-300 hover:bg-amber-500/10 rounded-lg border border-transparent hover:border-amber-500/30 transition cursor-pointer"
                            title="Edit rincian template ini"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteTargetTemplate({ id: tmpl.id, name: tmpl.name })}
                            className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg border border-transparent hover:border-rose-500/30 transition cursor-pointer"
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
                className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-medium transition cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5 text-emerald-400" />
                <span>Simpan Query Aktif Jadi Template</span>
              </button>
              <button
                type="button"
                onClick={() => setIsTemplateModalOpen(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-medium transition cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 6. Save or Edit Query Template Modal */}
      {/* ========================================================================= */}
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
                    {isEditMode ? 'Edit Template Query' : 'Simpan Template Query Influx'}
                  </h3>
                  <p className="text-xs text-slate-400">
                    {isEditMode
                      ? 'Perbarui rincian atau parameter query template ini'
                      : 'Template tersimpan di database dan dapat dipanggil kapan saja'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsSaveTemplateModalOpen(false)}
                className="text-slate-400 hover:text-white cursor-pointer"
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
                  placeholder="Contoh: Suhu Kursi & Kelembaban 1 Jam"
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
                  className="w-full bg-slate-950 text-slate-200 p-2 rounded-lg border border-slate-800 text-xs focus:outline-none focus:border-emerald-500 font-medium cursor-pointer"
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
                    Perbarui query dengan filter yang sedang aktif saat ini?
                  </div>
                  <button
                    type="button"
                    onClick={handleSyncCurrentQueryToTemplate}
                    className="px-2.5 py-1 bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 rounded-md text-[11px] font-medium transition flex items-center gap-1 flex-shrink-0 cursor-pointer"
                    title="Timpa parameter template dengan filter yang sedang aktif di halaman"
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
                    <div>Bucket: <span className="text-emerald-400">{templateForm.config?.bucket || selectedBucket}</span></div>
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
                className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-medium transition cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleSaveTemplate}
                disabled={templateSaving || !templateForm.name.trim()}
                className={`px-4 py-2 text-white font-semibold text-xs rounded-lg shadow-lg flex items-center gap-1.5 transition cursor-pointer disabled:opacity-50 ${isEditMode
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

      {/* ========================================================================= */}
      {/* 7. Delete Confirmation Modal */}
      {/* ========================================================================= */}
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
                  Apakah Anda yakin ingin menghapus template <strong className="text-rose-300">"{deleteTargetTemplate.name}"</strong>? Template ini tidak akan tersedia lagi.
                </p>
              </div>
            </div>

            <div className="p-3 bg-slate-950 rounded-lg border border-slate-800/80 text-xs text-slate-400">
              <span className="text-amber-400 font-semibold">Catatan:</span> Data di InfluxDB tidak akan terpengaruh sama sekali. Tindakan ini hanya menghapus bookmark template query dari database.
            </div>

            <div className="pt-2 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeleteTargetTemplate(null)}
                disabled={templateDeleting}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-medium transition cursor-pointer disabled:opacity-50"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteTemplate}
                disabled={templateDeleting}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-xs font-semibold shadow-lg shadow-rose-600/20 flex items-center gap-1.5 transition cursor-pointer disabled:opacity-50"
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
    </div>
  );
}

