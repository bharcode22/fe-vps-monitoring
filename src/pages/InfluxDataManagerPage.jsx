import React, { useState, useEffect, useMemo } from 'react';
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

import {
  toLocalDatetimeInput,
  formatFluxTimeLiteral,
  getDateShortcutRange
} from '../components/influx/influxConstants';

import InfluxHeader from '../components/influx/InfluxHeader';
import InfluxFilterPanel from '../components/influx/InfluxFilterPanel';
import InfluxKpiSummary from '../components/influx/InfluxKpiSummary';
import InfluxChartPanel from '../components/influx/InfluxChartPanel';
import InfluxDataTable from '../components/influx/InfluxDataTable';

import InfluxConfigModal from '../components/influx/modals/InfluxConfigModal';
import InfluxTemplateCatalogModal from '../components/influx/modals/InfluxTemplateCatalogModal';
import InfluxSaveTemplateModal from '../components/influx/modals/InfluxSaveTemplateModal';
import InfluxDeleteTemplateModal from '../components/influx/modals/InfluxDeleteTemplateModal';

/**
 * InfluxDataManagerPage Component
 * Central InfluxDB Data Manager orchestrator:
 * Manages connection health, dynamic schema auto-discovery, multi-parameter Flux query generation,
 * interactive Recharts visualization, real-time data table, template CRUD, and CSV/JSON data exports.
 */
export default function InfluxDataManagerPage({ onBack }) {
  // 1. Connection & Config State
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

  // 2. Schema & Auto-Discovery
  const [buckets, setBuckets] = useState([]);
  const [measurements, setMeasurements] = useState([]);
  const [availableFields, setAvailableFields] = useState([]);
  const [, setAvailableUnits] = useState([]);
  const [, setAvailableTagKeys] = useState([]);
  const [availableTagValues, setAvailableTagValues] = useState({});
  const [bucketSearch, setBucketSearch] = useState('');
  const [tagSearches, setTagSearches] = useState({});
  const [customTagKey, setCustomTagKey] = useState('');
  const [customTagVal, setCustomTagVal] = useState('');
  const [schemaLoading, setSchemaLoading] = useState(false);

  // 3. Query Filter State
  const [selectedBucket, setSelectedBucket] = useState('pod_logs_bhar');
  const [timeRangePreset, setTimeRangePreset] = useState('-1h');
  const [customStart, setCustomStart] = useState('');
  const [customStop, setCustomStop] = useState('');

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
    } catch { }
    return ['pod_heartbeat_logs'];
  });
  const [measurementSearchTerm, setMeasurementSearchTerm] = useState('');

  // Multi-select Field State
  const [selectedFields, setSelectedFields] = useState(() => {
    try {
      const initialField = localStorage.getItem('influx_explorer_initial_field');
      if (initialField) {
        localStorage.removeItem('influx_explorer_initial_field');
        return [initialField];
      }
    } catch { }
    return ['hb'];
  });
  const [fieldSearchTerm, setFieldSearchTerm] = useState('');

  const [selectedUnit, setSelectedUnit] = useState('all');
  const [tagFilters, setTagFilters] = useState(() => {
    try {
      const initialPod = localStorage.getItem('influx_explorer_initial_pod');
      if (initialPod) {
        localStorage.removeItem('influx_explorer_initial_pod');
        return [{ key: 'pod_name', value: String(initialPod).trim() }];
      }
    } catch { }
    return [];
  });
  const [aggregationInterval, setAggregationInterval] = useState('1m');
  const [aggregationFn, setAggregationFn] = useState('mean');
  const [rowLimit, setRowLimit] = useState(1000);

  // 4. Flux Editor / Manual Mode State
  const [isFluxEditorOpen, setIsFluxEditorOpen] = useState(true);
  const [isManualFluxMode, setIsManualFluxMode] = useState(false);
  const [manualFluxQuery, setManualFluxQuery] = useState('');
  const [copiedQuery, setCopiedQuery] = useState(false);

  // 5. Query Result State
  const [queryLoading, setQueryLoading] = useState(false);
  const [queryError, setQueryError] = useState(null);
  const [queryResult, setQueryResult] = useState(null);
  const [showChart, setShowChart] = useState(true);
  const [tableSearch, setTableSearch] = useState('');
  const [exportingFormat, setExportingFormat] = useState(null);

  // 6. Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  // 7. Query Templates State
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

  // Handle preset selection with auto-init for custom range
  function handleSelectTimeRange(val) {
    setTimeRangePreset(val);
    if (val === 'custom' && !customStart) {
      const now = new Date();
      const start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);
      setCustomStart(toLocalDatetimeInput(start));
      setCustomStop(toLocalDatetimeInput(now));
    }
  }

  // Quick date shortcut chips
  function applyDateShortcut(type) {
    const range = getDateShortcutRange(type);
    if (range) {
      setCustomStart(range.start);
      setCustomStop(range.stop);
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
    } catch {
      return null;
    }
  }, [timeRangePreset, customStart, customStop]);

  // Measurement toggling
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

  // Field toggling
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

  // Tag helper functions
  const isTagValueActive = (key, value) => {
    return tagFilters.some(tf => tf.key === key && String(tf.value) === String(value));
  };

  const toggleTagValue = (key, value) => {
    setTagFilters(prev => {
      const exists = prev.find(tf => tf.key === key && String(tf.value) === String(value));
      if (exists) {
        return prev.filter(tf => !(tf.key === key && String(tf.value) === String(value)));
      }
      return [...prev.filter(tf => tf.key !== key), { key, value: String(value) }];
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

  // Initial Load: Health, Buckets, and Templates
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
      const payload = {
        name: templateForm.name.trim(),
        description: templateForm.description.trim(),
        category: templateForm.category || 'Sensor Hardware',
        isRawFlux: templateForm.isRawFlux,
        rawFluxQuery: templateForm.isRawFlux ? templateForm.rawFluxQuery : null,
        config: !templateForm.isRawFlux ? templateForm.config : null
      };

      if (isEditMode && templateForm.id) {
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

  // Reload schema when selected bucket or measurement changes
  const measurementKey = selectedMeasurements.join(',');
  useEffect(() => {
    if (selectedBucket) {
      loadBucketSchema(selectedBucket, selectedMeasurements);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

      try {
        const bRes = await fetchInfluxBucketsApi();
        if (bRes.success && Array.isArray(bRes.data)) {
          const list = [...bRes.data];
          if (!list.some(b => b.name === 'pod_logs_bhar')) {
            list.unshift({ id: 'pod_logs_bhar', name: 'pod_logs_bhar', description: 'Log Monitoring & Telemetri POD' });
          }
          setBuckets(list);
        }
      } catch { }
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
              return prev;
            }
            return valid.length > 0 ? valid : [res.data.measurements[0]];
          });
        }
        if (Array.isArray(res.data.fields) && res.data.fields.length > 0) {
          setAvailableFields(res.data.fields);
          setSelectedFields(prev => {
            const valid = prev.filter(f => res.data.fields.includes(f));
            if (valid.length === prev.length && valid.every((f, idx) => f === prev[idx])) {
              return prev;
            }
            return valid.length > 0 ? valid : [res.data.fields[0]];
          });
        }
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
    } catch {
    } finally {
      setSchemaLoading(false);
    }
  };

  // Build live Flux Query
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

  // Keep manual query synchronized when not in manual mode
  useEffect(() => {
    if (!isManualFluxMode) {
      setManualFluxQuery(generatedFluxQuery);
    }
  }, [generatedFluxQuery, isManualFluxMode]);

  // Execute Query
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

  // Keyboard Hotkey: Ctrl+Enter or Cmd+Enter
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        handleExecuteQuery();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isManualFluxMode, manualFluxQuery, generatedFluxQuery]);

  // Export CSV / JSON
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
        } catch {
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

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto pb-16 px-2 sm:px-4">
      {/* 1. Header Banner, Connection Status & Feedback */}
      <InfluxHeader
        onBack={onBack}
        healthLoading={healthLoading}
        healthData={healthData}
        loadHealthAndBuckets={loadHealthAndBuckets}
        setIsConfigModalOpen={setIsConfigModalOpen}
        setConfigTestResult={setConfigTestResult}
        templateFeedback={templateFeedback}
        setTemplateFeedback={setTemplateFeedback}
      />

      {/* 2. Control Bar & Dynamic Filter Builder */}
      <InfluxFilterPanel
        setIsTemplateModalOpen={setIsTemplateModalOpen}
        handleOpenCreateTemplate={handleOpenCreateTemplate}
        templates={templates}
        isManualFluxMode={isManualFluxMode}
        setIsManualFluxMode={setIsManualFluxMode}
        timeRangePreset={timeRangePreset}
        handleSelectTimeRange={handleSelectTimeRange}
        schemaLoading={schemaLoading}
        customStart={customStart}
        setCustomStart={setCustomStart}
        customStop={customStop}
        setCustomStop={setCustomStop}
        applyDateShortcut={applyDateShortcut}
        handleSelectMonth={handleSelectMonth}
        customRangeSummary={customRangeSummary}
        buckets={buckets}
        selectedBucket={selectedBucket}
        setSelectedBucket={setSelectedBucket}
        bucketSearch={bucketSearch}
        setBucketSearch={setBucketSearch}
        measurements={measurements}
        selectedMeasurements={selectedMeasurements}
        toggleMeasurement={toggleMeasurement}
        selectAllMeasurements={selectAllMeasurements}
        resetMeasurements={resetMeasurements}
        measurementSearchTerm={measurementSearchTerm}
        setMeasurementSearchTerm={setMeasurementSearchTerm}
        availableFields={availableFields}
        selectedFields={selectedFields}
        toggleField={toggleField}
        selectAllFields={selectAllFields}
        resetFields={resetFields}
        fieldSearchTerm={fieldSearchTerm}
        setFieldSearchTerm={setFieldSearchTerm}
        availableTagValues={availableTagValues}
        tagFilters={tagFilters}
        tagSearches={tagSearches}
        setTagSearches={setTagSearches}
        isTagValueActive={isTagValueActive}
        toggleTagValue={toggleTagValue}
        clearTagKey={clearTagKey}
        customTagKey={customTagKey}
        setCustomTagKey={setCustomTagKey}
        customTagVal={customTagVal}
        setCustomTagVal={setCustomTagVal}
        handleAddCustomTag={handleAddCustomTag}
        setTagFilters={setTagFilters}
        aggregationInterval={aggregationInterval}
        setAggregationInterval={setAggregationInterval}
        aggregationFn={aggregationFn}
        setAggregationFn={setAggregationFn}
        rowLimit={rowLimit}
        setRowLimit={setRowLimit}
        isFluxEditorOpen={isFluxEditorOpen}
        setIsFluxEditorOpen={setIsFluxEditorOpen}
        manualFluxQuery={manualFluxQuery}
        setManualFluxQuery={setManualFluxQuery}
        generatedFluxQuery={generatedFluxQuery}
        handleCopyQuery={handleCopyQuery}
        copiedQuery={copiedQuery}
        handleExecuteQuery={handleExecuteQuery}
        queryLoading={queryLoading}
        handleExport={handleExport}
        exportingFormat={exportingFormat}
        queryError={queryError}
      />

      {/* 3. Query Results: KPI Cards, Chart Preview & Interactive Table */}
      {queryResult && (
        <div className="space-y-5">
          <InfluxKpiSummary
            queryResult={queryResult}
            selectedMeasurements={selectedMeasurements}
          />

          <InfluxChartPanel
            chartData={chartData}
            chartFields={chartFields}
            selectedFields={selectedFields}
            tagFilters={tagFilters}
            showChart={showChart}
            setShowChart={setShowChart}
          />

          <InfluxDataTable
            queryResult={queryResult}
            tableSearch={tableSearch}
            setTableSearch={setTableSearch}
            filteredRows={filteredRows}
            paginatedRows={paginatedRows}
            currentPage={currentPage}
            setCurrentPage={setCurrentPage}
            pageSize={pageSize}
            setPageSize={setPageSize}
            totalPages={totalPages}
          />
        </div>
      )}

      {/* 4. Connection Configuration Modal */}
      <InfluxConfigModal
        isOpen={isConfigModalOpen}
        onClose={() => setIsConfigModalOpen(false)}
        configForm={configForm}
        setConfigForm={setConfigForm}
        handleSaveConfig={handleSaveConfig}
        handleTestConfig={handleTestConfig}
        configTesting={configTesting}
        configSaving={configSaving}
        configTestResult={configTestResult}
      />

      {/* 5. Template Catalog Modal */}
      <InfluxTemplateCatalogModal
        isOpen={isTemplateModalOpen}
        onClose={() => setIsTemplateModalOpen(false)}
        templatesLoading={templatesLoading}
        filteredTemplates={filteredTemplates}
        templateCategoryFilter={templateCategoryFilter}
        setTemplateCategoryFilter={setTemplateCategoryFilter}
        templateSearchTerm={templateSearchTerm}
        setTemplateSearchTerm={setTemplateSearchTerm}
        handleApplyTemplate={handleApplyTemplate}
        handleOpenEditTemplate={handleOpenEditTemplate}
        setDeleteTargetTemplate={setDeleteTargetTemplate}
        handleOpenCreateTemplate={handleOpenCreateTemplate}
      />

      {/* 6. Save or Edit Query Template Modal */}
      <InfluxSaveTemplateModal
        isOpen={isSaveTemplateModalOpen}
        onClose={() => setIsSaveTemplateModalOpen(false)}
        isEditMode={isEditMode}
        templateForm={templateForm}
        setTemplateForm={setTemplateForm}
        handleSyncCurrentQueryToTemplate={handleSyncCurrentQueryToTemplate}
        handleSaveTemplate={handleSaveTemplate}
        templateSaving={templateSaving}
        selectedBucket={selectedBucket}
        selectedMeasurements={selectedMeasurements}
        selectedFields={selectedFields}
        aggregationInterval={aggregationInterval}
        aggregationFn={aggregationFn}
        timeRangePreset={timeRangePreset}
      />

      {/* 7. Delete Confirmation Modal */}
      <InfluxDeleteTemplateModal
        deleteTargetTemplate={deleteTargetTemplate}
        onClose={() => setDeleteTargetTemplate(null)}
        handleConfirmDeleteTemplate={handleConfirmDeleteTemplate}
        templateDeleting={templateDeleting}
      />
    </div>
  );
}
