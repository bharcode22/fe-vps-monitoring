import React, { useState, useEffect, useMemo, useRef } from 'react';
import { AlertTriangle } from 'lucide-react';
import {
  fetchPodInfluxListApi,
  fetchPodInfluxHealthApi,
  refreshPodTokenApi,
  fetchPodBucketsApi,
  fetchPodSchemaApi,
  queryPodInfluxDataApi,
  downloadPodInfluxExport,
  downloadPodInfluxExportStreaming,
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

import {
  toOriginalDatetimeInput,
  formatFluxTimeLiteral,
  formatPointDateTime,
} from '../components/podInflux/podInfluxConstants';

import PodInfluxHeader from '../components/podInflux/PodInfluxHeader';
import PodInfluxFleetBar from '../components/podInflux/PodInfluxFleetBar';
import PodInfluxFilterPanel from '../components/podInflux/PodInfluxFilterPanel';
import PodInfluxKpiStatsBar from '../components/podInflux/PodInfluxKpiStatsBar';
import PodInfluxChartsPanel from '../components/podInflux/PodInfluxChartsPanel';
import PodInfluxDataTablePanel from '../components/podInflux/PodInfluxDataTablePanel';
import PodInfluxTokenModal from '../components/podInflux/modals/PodInfluxTokenModal';
import PodInfluxTemplateExplorerModal from '../components/podInflux/modals/PodInfluxTemplateExplorerModal';
import PodInfluxSaveTemplateModal from '../components/podInflux/modals/PodInfluxSaveTemplateModal';
import PodInfluxDeleteTemplateModal from '../components/podInflux/modals/PodInfluxDeleteTemplateModal';
import PodInfluxCliExportModal from '../components/podInflux/modals/PodInfluxCliExportModal';
import PodInfluxExportProgressModal from '../components/podInflux/modals/PodInfluxExportProgressModal';

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

  // Realtime Streaming Export Progress State
  const [isExportProgressOpen, setIsExportProgressOpen] = useState(false);
  const [exportProgressState, setExportProgressState] = useState({
    format: 'csv',
    stage: 'connecting',
    percent: 10,
    receivedMb: '0.00',
    rowCount: 0,
    elapsedSeconds: 0,
    filename: '',
    error: null
  });
  const exportAbortControllerRef = useRef(null);
  const exportTimerRef = useRef(null);

  // Cleanup abort controller and timer on unmount
  useEffect(() => {
    return () => {
      if (exportAbortControllerRef.current) {
        exportAbortControllerRef.current.abort();
      }
      if (exportTimerRef.current) {
        clearInterval(exportTimerRef.current);
      }
    };
  }, []);

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
      if (aggregationInterval === 'none') setAggregationInterval('15m');
    } else if (type === 'last30d') {
      const start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      setCustomStart(toOriginalDatetimeInput(start));
      setCustomStop(toOriginalDatetimeInput(now));
      if (aggregationInterval === 'none') setAggregationInterval('1h');
    } else if (type === 'thisMonth') {
      const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0));
      setCustomStart(toOriginalDatetimeInput(start));
      setCustomStop(toOriginalDatetimeInput(now));
      if (aggregationInterval === 'none') setAggregationInterval('1h');
    } else if (type === 'lastMonth') {
      const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1, 0, 0, 0));
      const stop = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 0, 23, 59, 59));
      setCustomStart(toOriginalDatetimeInput(start));
      setCustomStop(toOriginalDatetimeInput(stop));
      if (aggregationInterval === 'none') setAggregationInterval('1h');
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
    if (aggregationInterval === 'none') setAggregationInterval('1h');
  }

  // Check if custom start is after custom stop
  const isCustomRangeInvalid = useMemo(() => {
    if (timeRangePreset !== 'custom' || !customStart || !customStop) return false;
    return customStart > customStop;
  }, [timeRangePreset, customStart, customStop]);

  // Check if custom range spans more than 24 hours
  const isMultiDayCustomRange = useMemo(() => {
    if (timeRangePreset !== 'custom' || !customStart || !customStop) return false;
    try {
      const s = new Date(customStart).getTime();
      const e = new Date(customStop).getTime();
      return (e - s) > 24 * 60 * 60 * 1000;
    } catch {
      return false;
    }
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
    let appliedPayload = null;

    if (tmpl.is_raw_flux && tmpl.raw_flux_query) {
      setIsManualFluxMode(true);
      setManualFluxQuery(tmpl.raw_flux_query);
      appliedPayload = {
        bucket: selectedBuckets[0] || 'pod_monitoring',
        rawFluxQuery: tmpl.raw_flux_query
      };
    } else if (tmpl.config) {
      setIsManualFluxMode(false);
      const b = (tmpl.config.buckets && Array.isArray(tmpl.config.buckets) && tmpl.config.buckets.length > 0)
        ? tmpl.config.buckets
        : (tmpl.config.bucket ? (tmpl.config.bucket.includes(',') ? tmpl.config.bucket.split(',') : [tmpl.config.bucket]) : selectedBuckets);
      setSelectedBuckets(b);

      const m = (tmpl.config.measurements && Array.isArray(tmpl.config.measurements) && tmpl.config.measurements.length > 0)
        ? tmpl.config.measurements
        : (tmpl.config.measurement ? [tmpl.config.measurement] : selectedMeasurements);
      setSelectedMeasurements(m);

      const f = (tmpl.config.fields && Array.isArray(tmpl.config.fields) && tmpl.config.fields.length > 0)
        ? tmpl.config.fields
        : (tmpl.config.field ? [tmpl.config.field] : selectedFields);
      setSelectedFields(f);

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

      const tRange = tmpl.config.timeRange || timeRangePreset;
      const cStart = tmpl.config.customStart || customStart;
      const cStop = tmpl.config.customStop || customStop;

      appliedPayload = {
        bucket: b[0] || 'pod_monitoring',
        buckets: b,
        timeRange: tRange === 'custom' ? undefined : tRange,
        customStart: tRange === 'custom' ? formatFluxTimeLiteral(cStart, false) : undefined,
        customStop: tRange === 'custom' ? formatFluxTimeLiteral(cStop, true) : undefined,
        measurement: m[0] || null,
        measurements: m,
        field: f[0] || null,
        fields: f,
        unit: (tmpl.config.unit && tmpl.config.unit !== 'all') ? tmpl.config.unit : (selectedUnit !== 'all' ? selectedUnit : undefined),
        chair_section: selectedChairSection !== 'all' ? selectedChairSection : undefined,
        tags: tmpl.config.tags && typeof tmpl.config.tags === 'object'
          ? tmpl.config.tags
          : tagFilters.reduce((acc, curr) => {
            if (curr.key && curr.value) acc[curr.key.trim()] = curr.value.trim();
            return acc;
          }, {}),
        aggregation: tmpl.config.aggregation !== undefined ? tmpl.config.aggregation : aggregationInterval,
        aggFn: tmpl.config.aggFn || aggregationFn,
        limit: (tmpl.config.limit !== undefined ? Number(tmpl.config.limit) : Number(rowLimit)) > 0
          ? (tmpl.config.limit !== undefined ? Number(tmpl.config.limit) : Number(rowLimit))
          : null
      };
    }

    setIsTemplateModalOpen(false);
    setTemplateFeedback(`Template "${tmpl.name}" berhasil diterapkan ke ${activePod?.name || 'POD'}!`);
    setTimeout(() => setTemplateFeedback(null), 4500);

    if (autoRun) {
      handleExecuteQuery(appliedPayload);
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
  async function handleExecuteQuery(overridePayload = null) {
    if (!selectedPodId) {
      setQueryError('Silakan pilih unit POD terlebih dahulu.');
      return;
    }

    setQueryLoading(true);
    setQueryError(null);
    setCurrentPage(1);

    try {
      const hasOverride = overridePayload &&
        typeof overridePayload === 'object' &&
        !('nativeEvent' in overridePayload) &&
        !('target' in overridePayload) &&
        !('preventDefault' in overridePayload);

      const isCustomPayload = hasOverride &&
        ('bucket' in overridePayload || 'rawFluxQuery' in overridePayload || 'customStart' in overridePayload);

      let effectiveCustomStart = (hasOverride && overridePayload.customStart !== undefined) ? overridePayload.customStart : customStart;
      let effectiveCustomStop = (hasOverride && overridePayload.customStop !== undefined) ? overridePayload.customStop : customStop;
      const effectiveAggregation = (hasOverride && overridePayload.aggregation !== undefined) ? overridePayload.aggregation : aggregationInterval;
      const effectiveLimit = (hasOverride && overridePayload.limit !== undefined)
        ? (Number(overridePayload.limit) > 0 ? Number(overridePayload.limit) : null)
        : (rowLimit > 0 ? Number(rowLimit) : null);

      // When in custom mode, ensure effectiveCustomStart is set (default to last 24 hours if empty)
      if (timeRangePreset === 'custom' && !effectiveCustomStart) {
        const now = new Date();
        const start = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        effectiveCustomStart = toOriginalDatetimeInput(start);
        effectiveCustomStop = toOriginalDatetimeInput(now);
        setCustomStart(effectiveCustomStart);
        setCustomStop(effectiveCustomStop);
      }

      const payload = isCustomPayload ? overridePayload : {
        bucket: selectedBuckets[0] || 'pod_monitoring',
        buckets: selectedBuckets,
        timeRange: timeRangePreset === 'custom' ? undefined : timeRangePreset,
        customStart: timeRangePreset === 'custom' ? formatFluxTimeLiteral(effectiveCustomStart, false) : undefined,
        customStop: timeRangePreset === 'custom' ? formatFluxTimeLiteral(effectiveCustomStop, true) : undefined,
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
        aggregation: effectiveAggregation,
        aggFn: aggregationFn,
        limit: effectiveLimit,
        rawFluxQuery: isManualFluxMode ? manualFluxQuery : undefined
      };

      const res = await queryPodInfluxDataApi(selectedPodId, payload);
      if (res && res.success) {
        setQueryResult(res);
        const count = res.totalRecords ?? res.data?.length ?? 0;
        setTemplateFeedback(`Query berhasil dieksekusi (${count} baris data ditemukan)`);
        setTimeout(() => setTemplateFeedback(null), 4000);
      } else {
        setQueryError(res?.error || 'Gagal mengeksekusi query di Influx POD.');
      }
    } catch (err) {
      setQueryError(err.message || 'Terjadi kesalahan jaringan saat memanggil Influx POD.');
    } finally {
      setQueryLoading(false);
    }
  }

  // Handle cancelling export
  function handleCancelExport() {
    if (exportAbortControllerRef.current) {
      exportAbortControllerRef.current.abort();
    }
    if (exportTimerRef.current) {
      clearInterval(exportTimerRef.current);
      exportTimerRef.current = null;
    }
    setExportProgressState(prev => ({
      ...prev,
      stage: 'cancelled',
      percent: 100
    }));
    setExportingFormat(null);
  }

  // Handle closing export modal
  function handleCloseExportModal() {
    if (exportTimerRef.current) {
      clearInterval(exportTimerRef.current);
      exportTimerRef.current = null;
    }
    setIsExportProgressOpen(false);
    setExportingFormat(null);
  }

  // Export Data (Full Dump: Mengunduh semua baris tanpa batas limit dengan realtime streaming progress)
  async function handleExport(format = 'csv') {
    if (!selectedPodId) return;

    // Reset previous controller & timer
    if (exportAbortControllerRef.current) {
      exportAbortControllerRef.current.abort();
    }
    if (exportTimerRef.current) {
      clearInterval(exportTimerRef.current);
      exportTimerRef.current = null;
    }

    const abortController = new AbortController();
    exportAbortControllerRef.current = abortController;

    setExportingFormat(format);
    setIsExportProgressOpen(true);
    setExportProgressState({
      format,
      stage: 'connecting',
      percent: 15,
      receivedMb: '0.00',
      rowCount: 0,
      elapsedSeconds: 0,
      filename: '',
      error: null
    });

    const startTime = Date.now();
    exportTimerRef.current = setInterval(() => {
      setExportProgressState(prev => {
        if (prev.stage === 'done' || prev.stage === 'error' || prev.stage === 'cancelled') {
          return prev;
        }
        const elapsed = Math.floor((Date.now() - startTime) / 1000);
        return {
          ...prev,
          elapsedSeconds: elapsed,
          percent: prev.stage === 'connecting'
            ? Math.min(38, 15 + Math.floor(elapsed * 4))
            : prev.percent
        };
      });
    }, 500);

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

      const result = await downloadPodInfluxExportStreaming(selectedPodId, payload, format, {
        signal: abortController.signal,
        podName: activePod?.name || `POD ${selectedPodId}`,
        onProgress: (prog) => {
          setExportProgressState(prev => ({
            ...prev,
            ...prog,
            stage: prog.stage || prev.stage,
            percent: prog.percent !== undefined ? prog.percent : prev.percent
          }));
        }
      });

      if (exportTimerRef.current) {
        clearInterval(exportTimerRef.current);
        exportTimerRef.current = null;
      }

      setExportProgressState(prev => ({
        ...prev,
        stage: 'done',
        percent: 100,
        filename: result.filename,
        rowCount: result.rowCount || prev.rowCount,
        receivedMb: result.receivedBytes ? (result.receivedBytes / (1024 * 1024)).toFixed(2) : prev.receivedMb
      }));

    } catch (err) {
      if (exportTimerRef.current) {
        clearInterval(exportTimerRef.current);
        exportTimerRef.current = null;
      }

      if (err.name === 'AbortError' || err.message?.includes('dibatalkan')) {
        setExportProgressState(prev => ({
          ...prev,
          stage: 'cancelled',
          percent: 100
        }));
      } else {
        setExportProgressState(prev => ({
          ...prev,
          stage: 'error',
          error: err.message
        }));
      }
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

  // Detect if query returned data that hit row limit and stopped prematurely
  const isDataTruncatedByLimit = useMemo(() => {
    if (!queryResult || !Array.isArray(queryResult.data) || queryResult.data.length === 0) return null;
    if (!rowLimit || Number(rowLimit) <= 0) return null;
    const count = queryResult.data.length;
    const reachedLimit = count >= Number(rowLimit) || (queryResult.totalRecords && queryResult.totalRecords >= Number(rowLimit));
    if (!reachedLimit) return null;

    if (timeRangePreset === 'custom' && customStop && chartData.length > 0) {
      const lastPoint = chartData[chartData.length - 1];
      if (lastPoint && lastPoint.fullTime) {
        const lastTime = new Date(lastPoint.fullTime).getTime();
        const intendedStopStr = customStop.includes('Z') ? customStop : (customStop.length === 16 ? `${customStop}:00Z` : `${customStop}Z`);
        const intendedStopTime = new Date(intendedStopStr).getTime();
        // If last record is > 5 minutes before intended stop time
        if (intendedStopTime - lastTime > 5 * 60 * 1000) {
          return {
            lastPointTime: formatPointDateTime(lastPoint),
            intendedStop: customStop.replace('T', ' ')
          };
        }
      }
    } else if (aggregationInterval === 'none' && ['-24h', '-7d', '-30d', 'custom'].includes(timeRangePreset)) {
      const lastPoint = chartData[chartData.length - 1];
      return {
        lastPointTime: lastPoint ? formatPointDateTime(lastPoint) : 'awal waktu',
        intendedStop: 'akhir rentang'
      };
    }
    return null;
  }, [queryResult, rowLimit, timeRangePreset, customStop, chartData, aggregationInterval]);

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
      <PodInfluxHeader
        onBack={onBack}
        onRefresh={() => {
          loadPodList();
          if (selectedPodId) {
            loadPodHealth(selectedPodId);
            loadPodBuckets(selectedPodId);
          }
        }}
        isLoading={podsLoading || podHealthLoading}
      />

      {/* 2. POD Selection Fleet Bar */}
      <PodInfluxFleetBar
        pods={pods}
        selectedPodId={selectedPodId}
        setSelectedPodId={setSelectedPodId}
        podsLoading={podsLoading}
        activePod={activePod}
        podHealth={podHealth}
        podHealthLoading={podHealthLoading}
        handleRefreshToken={handleRefreshToken}
        tokenRefreshing={tokenRefreshing}
        setTokenRefreshResult={setTokenRefreshResult}
        setOverrideTokenInput={setOverrideTokenInput}
        setIsTokenModalOpen={setIsTokenModalOpen}
      />

      {/* 3. Main Query Builder & Visualization Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Visual Filter Panel */}
        <PodInfluxFilterPanel
          isManualFluxMode={isManualFluxMode}
          setIsManualFluxMode={setIsManualFluxMode}
          manualFluxQuery={manualFluxQuery}
          setManualFluxQuery={setManualFluxQuery}
          generatedFluxQuery={generatedFluxQuery}
          templateFeedback={templateFeedback}
          setTemplateFeedback={setTemplateFeedback}
          templates={templates}
          setIsTemplateModalOpen={setIsTemplateModalOpen}
          handleOpenCreateTemplate={handleOpenCreateTemplate}
          handleApplyTemplate={handleApplyTemplate}
          selectedBuckets={selectedBuckets}
          setSelectedBuckets={setSelectedBuckets}
          buckets={buckets}
          schemaLoading={schemaLoading}
          handleSelectOnlyBucket={handleSelectOnlyBucket}
          handleToggleBucket={handleToggleBucket}
          timeRangePreset={timeRangePreset}
          handleSelectTimeRange={handleSelectTimeRange}
          activeDateShortcut={activeDateShortcut}
          applyDateShortcut={applyDateShortcut}
          customStart={customStart}
          setCustomStart={setCustomStart}
          customStop={customStop}
          setCustomStop={setCustomStop}
          setActiveDateShortcut={setActiveDateShortcut}
          isCustomRangeInvalid={isCustomRangeInvalid}
          isMultiDayCustomRange={isMultiDayCustomRange}
          handleSelectSingleDate={handleSelectSingleDate}
          handleSelectMonth={handleSelectMonth}
          showHeartbeatMeasurementHint={showHeartbeatMeasurementHint}
          customRangeSummary={customRangeSummary}
          measurements={measurements}
          selectedMeasurements={selectedMeasurements}
          setSelectedMeasurements={setSelectedMeasurements}
          selectAllMeasurements={selectAllMeasurements}
          resetMeasurements={resetMeasurements}
          isMeasurementDropdownOpen={isMeasurementDropdownOpen}
          setIsMeasurementDropdownOpen={setIsMeasurementDropdownOpen}
          measurementSearchTerm={measurementSearchTerm}
          setMeasurementSearchTerm={setMeasurementSearchTerm}
          toggleMeasurement={toggleMeasurement}
          availableFields={availableFields}
          selectedFields={selectedFields}
          selectAllFields={selectAllFields}
          resetFields={resetFields}
          isFieldDropdownOpen={isFieldDropdownOpen}
          setIsFieldDropdownOpen={setIsFieldDropdownOpen}
          fieldSearchTerm={fieldSearchTerm}
          setFieldSearchTerm={setFieldSearchTerm}
          toggleField={toggleField}
          selectedUnit={selectedUnit}
          setSelectedUnit={setSelectedUnit}
          availableUnits={availableUnits}
          selectedChairSection={selectedChairSection}
          setSelectedChairSection={setSelectedChairSection}
          availableChairSections={availableChairSections}
          aggregationInterval={aggregationInterval}
          setAggregationInterval={setAggregationInterval}
          aggregationFn={aggregationFn}
          setAggregationFn={setAggregationFn}
          rowLimit={rowLimit}
          setRowLimit={setRowLimit}
          tagFilters={tagFilters}
          addTagFilter={addTagFilter}
          updateTagFilter={updateTagFilter}
          removeTagFilter={removeTagFilter}
          handleExecuteQuery={handleExecuteQuery}
          queryLoading={queryLoading}
          selectedPodId={selectedPodId}
          handleExport={handleExport}
          exportingFormat={exportingFormat}
          handleDownloadChartPdfReport={handleDownloadChartPdfReport}
          setIsCliModalOpen={setIsCliModalOpen}
          setCliExecutionResult={setCliExecutionResult}
          handleCopyQuery={handleCopyQuery}
          copiedQuery={copiedQuery}
        />

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
          <PodInfluxKpiStatsBar
            stats={stats}
            selectedFields={selectedFields}
            activePod={activePod}
          />

          {/* Data Truncation Warning Banner */}
          {isDataTruncatedByLimit && (
            <div className="p-3.5 bg-amber-500/10 border border-amber-500/40 rounded-xl text-xs text-amber-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-md">
              <div className="flex items-start gap-2.5">
                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-amber-300">Data Pratinjau Terpotong oleh Limit ({rowLimit.toLocaleString()} Baris)</span>
                    <span className="px-1.5 py-0.5 text-[9px] bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded font-semibold uppercase">
                      Batas Tercapai
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-300 mt-1 leading-relaxed">
                    Data sensor tercatat setiap detik sehingga limit {rowLimit.toLocaleString()} baris habis pada waktu{' '}
                    <strong className="text-amber-300 font-mono">{isDataTruncatedByLimit.lastPointTime}</strong>, sebelum mencapai waktu selesai yang Anda pilih (
                    <span className="text-slate-400 font-mono">{isDataTruncatedByLimit.intendedStop}</span>).
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                <button
                  type="button"
                  onClick={() => {
                    setAggregationInterval('15m');
                    handleExecuteQuery({ aggregation: '15m' });
                  }}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs rounded-lg transition shadow-sm cursor-pointer"
                  title="Aktifkan agregasi 15 menit agar grafik mencakup seluruh hari tanpa batas baris habis"
                >
                  ⚡ Aktifkan Agregasi 15 Menit
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setRowLimit(10000);
                    handleExecuteQuery({ limit: 10000 });
                  }}
                  className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium text-xs rounded-lg border border-slate-700 transition cursor-pointer"
                  title="Muat 10.000 baris data mentah"
                >
                  Limit 10.000
                </button>
              </div>
            </div>
          )}

          {/* Time Series Chart Section */}
          <PodInfluxChartsPanel
            stats={stats}
            chartData={chartData}
            chartFields={chartFields}
            chartViewMode={chartViewMode}
            setChartViewMode={setChartViewMode}
            fieldStats={fieldStats}
            fieldSeries={fieldSeries}
            selectedFields={selectedFields}
            handleDownloadChartPdfReport={handleDownloadChartPdfReport}
            exportingFormat={exportingFormat}
            selectedPodId={selectedPodId}
            isDataTruncatedByLimit={isDataTruncatedByLimit}
            rowLimit={rowLimit}
          />

          {/* Data Table Panel */}
          <PodInfluxDataTablePanel
            filteredRows={filteredRows}
            tableSearch={tableSearch}
            setTableSearch={setTableSearch}
            setCurrentPage={setCurrentPage}
            hasChairSectionInRows={hasChairSectionInRows}
            pagedRows={pagedRows}
            queryLoading={queryLoading}
            totalPages={totalPages}
            currentPage={currentPage}
          />
        </div>
      </div>

      {/* Modals */}
      <PodInfluxTokenModal
        isOpen={isTokenModalOpen}
        onClose={() => setIsTokenModalOpen(false)}
        activePod={activePod}
        podHealth={podHealth}
        overrideTokenInput={overrideTokenInput}
        setOverrideTokenInput={setOverrideTokenInput}
        handleRefreshToken={handleRefreshToken}
        tokenRefreshing={tokenRefreshing}
        tokenRefreshResult={tokenRefreshResult}
      />

      <PodInfluxTemplateExplorerModal
        isOpen={isTemplateModalOpen}
        onClose={() => setIsTemplateModalOpen(false)}
        templates={templates}
        filteredTemplates={filteredTemplates}
        templateCategoryFilter={templateCategoryFilter}
        setTemplateCategoryFilter={setTemplateCategoryFilter}
        onTemplateCategoryFilterChange={setTemplateCategoryFilter}
        templateCategories={templateCategories}
        templateSearchTerm={templateSearchTerm}
        setTemplateSearchTerm={setTemplateSearchTerm}
        onTemplateSearchTermChange={setTemplateSearchTerm}
        templatesLoading={templatesLoading}
        activePod={activePod}
        handleApplyTemplate={handleApplyTemplate}
        onApplyTemplate={handleApplyTemplate}
        handleOpenCreateTemplate={handleOpenCreateTemplate}
        onOpenCreateTemplate={handleOpenCreateTemplate}
        handleOpenEditTemplate={handleOpenEditTemplate}
        onOpenEditTemplate={handleOpenEditTemplate}
        setDeleteTargetTemplate={setDeleteTargetTemplate}
        onSetDeleteTargetTemplate={setDeleteTargetTemplate}
      />

      <PodInfluxSaveTemplateModal
        isOpen={isSaveTemplateModalOpen}
        onClose={() => setIsSaveTemplateModalOpen(false)}
        isEditMode={isEditMode}
        templateForm={templateForm}
        setTemplateForm={setTemplateForm}
        handleSyncCurrentQueryToTemplate={handleSyncCurrentQueryToTemplate}
        handleSaveTemplate={handleSaveTemplate}
        templateSaving={templateSaving}
        selectedBuckets={selectedBuckets}
        selectedMeasurements={selectedMeasurements}
        selectedFields={selectedFields}
        aggregationInterval={aggregationInterval}
        aggregationFn={aggregationFn}
        timeRangePreset={timeRangePreset}
      />

      <PodInfluxDeleteTemplateModal
        deleteTargetTemplate={deleteTargetTemplate}
        onClose={() => setDeleteTargetTemplate(null)}
        handleConfirmDeleteTemplate={handleConfirmDeleteTemplate}
        templateDeleting={templateDeleting}
      />

      <PodInfluxCliExportModal
        isOpen={isCliModalOpen}
        onClose={() => setIsCliModalOpen(false)}
        activePod={activePod}
        selectedPodId={selectedPodId}
        selectedBuckets={selectedBuckets}
        selectedMeasurements={selectedMeasurements}
        cliTab={cliTab}
        setCliTab={setCliTab}
        exportFiles={exportFiles}
        exportFilesLoading={exportFilesLoading}
        loadPodExportFiles={loadPodExportFiles}
        handleDirectDownload={handleDirectDownload}
        handleCopyScpCommand={handleCopyScpCommand}
        copiedScpFilename={copiedScpFilename}
        handleDeleteExportFile={handleDeleteExportFile}
        deletingFilename={deletingFilename}
        cliCustomFilename={cliCustomFilename}
        setCliCustomFilename={setCliCustomFilename}
        defaultCliFilename={defaultCliFilename}
        activeCliFilename={activeCliFilename}
        cliEditQueryMode={cliEditQueryMode}
        setCliEditQueryMode={setCliEditQueryMode}
        cliManualFluxOverride={cliManualFluxOverride}
        setCliManualFluxOverride={setCliManualFluxOverride}
        cliFluxQuery={cliFluxQuery}
        cliIncludeLimit={cliIncludeLimit}
        setCliIncludeLimit={setCliIncludeLimit}
        rowLimit={rowLimit}
        handleCopyCliCommand={handleCopyCliCommand}
        copiedCliCmd={copiedCliCmd}
        activeCliCommand={activeCliCommand}
        handleRunCliExportOnPod={handleRunCliExportOnPod}
        cliExecuting={cliExecuting}
        cliExecutionResult={cliExecutionResult}
      />

      <PodInfluxExportProgressModal
        isOpen={isExportProgressOpen}
        onClose={handleCloseExportModal}
        onCancel={handleCancelExport}
        podName={activePod?.name || `POD ${selectedPodId}`}
        format={exportProgressState.format}
        progress={exportProgressState}
      />
    </div>
  );
}
