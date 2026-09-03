import React, { useState, useEffect } from 'react';
import {
  testSyncConnectionApi,
  testSingleConnectionApi,
  compareSchemaApi,
  performSyncApi,
  fetchSyncInfoApi
} from '../api/syncApi';
import DbSyncHeader from '../components/databaseSync/DbSyncHeader';
import DbSyncConnectionCard from '../components/databaseSync/DbSyncConnectionCard';
import DbSyncSummaryCards from '../components/databaseSync/DbSyncSummaryCards';
import DbSyncCompareTab from '../components/databaseSync/DbSyncCompareTab';
import DbSyncExecuteTab from '../components/databaseSync/DbSyncExecuteTab';

export default function DatabaseSyncPage({ servers = [], onBack }) {
  // Filter registered PostgreSQL database servers from monitoring list
  const pgServers = servers.filter(s => s.type === 'postgresql');

  const [sourceUrl, setSourceUrl] = useState('');
  const [targetUrl, setTargetUrl] = useState('');

  const [selectedSourceId, setSelectedSourceId] = useState('');
  const [selectedTargetId, setSelectedTargetId] = useState('');

  // Auto fill connection string when picking from dropdown
  const getDbConnectionString = (srv) => {
    if (!srv) return '';
    if (srv.connString) return srv.connString;
    const user = srv.username || srv.db_user || 'postgres';
    const rawPass = srv.password && srv.password !== '******' ? srv.password : '';
    if (!rawPass) return '';
    const auth = `${user}:${rawPass}`;
    const host = srv.host || 'localhost';
    const port = srv.port || 5432;
    const dbName = srv.db_name || srv.name || 'postgres';
    return `postgresql://${auth}@${host}:${port}/${dbName}`;
  };

  const handleSourceSelect = (e) => {
    const id = e.target.value;
    setSelectedSourceId(id);
    if (id === 'custom') return;
    const found = pgServers.find(s => String(s.id) === String(id));
    if (found) {
      setSourceUrl(getDbConnectionString(found));
    }
  };

  const handleTargetSelect = (e) => {
    const id = e.target.value;
    setSelectedTargetId(id);
    if (id === 'custom') return;
    const found = pgServers.find(s => String(s.id) === String(id));
    if (found) {
      setTargetUrl(getDbConnectionString(found));
    }
  };

  // Connection Test States
  const [testingConnection, setTestingConnection] = useState(false);
  const [testingSource, setTestingSource] = useState(false);
  const [sourceTestResult, setSourceTestResult] = useState(null);

  const [testingTarget, setTestingTarget] = useState(false);
  const [targetTestResult, setTargetTestResult] = useState(null);

  // Schema Comparison States
  const [comparingSchema, setComparingSchema] = useState(false);
  const [schemaResult, setSchemaResult] = useState(null);

  // Sync Execution States
  const [dryRun, setDryRun] = useState(true);
  const [batchSize, setBatchSize] = useState(500);
  const [selectedTables, setSelectedTables] = useState([]);
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState(null);

  const [activeTab, setActiveTab] = useState('compare'); // 'compare' | 'sync'
  const [expandedSchemaSection, setExpandedSchemaSection] = useState('different'); // 'different' | 'missing' | 'identical'

  // Fetch default URLs on mount if available
  useEffect(() => {
    fetchSyncInfoApi().then(defaults => {
      if (defaults.sourceUrl && !sourceUrl) setSourceUrl(defaults.sourceUrl);
      if (defaults.targetUrl && !targetUrl) setTargetUrl(defaults.targetUrl);
    }).catch(() => { });
  }, []);

  const handleTestSourceConnection = async () => {
    if (!sourceUrl) return;
    setTestingSource(true);
    setSourceTestResult(null);
    try {
      const res = await testSingleConnectionApi(sourceUrl);
      setSourceTestResult(res);
    } catch (err) {
      setSourceTestResult({
        success: false,
        error: err.message || 'Gagal terhubung ke Source DB'
      });
    } finally {
      setTestingSource(false);
    }
  };

  const handleTestTargetConnection = async () => {
    if (!targetUrl) return;
    setTestingTarget(true);
    setTargetTestResult(null);
    try {
      const res = await testSingleConnectionApi(targetUrl);
      setTargetTestResult(res);
    } catch (err) {
      setTargetTestResult({
        success: false,
        error: err.message || 'Gagal terhubung ke Target DB'
      });
    } finally {
      setTestingTarget(false);
    }
  };

  const handleTestConnection = async () => {
    if (!sourceUrl || !targetUrl) return;
    setTestingConnection(true);
    setSourceTestResult(null);
    setTargetTestResult(null);
    try {
      const res = await testSyncConnectionApi(sourceUrl, targetUrl);
      if (res.source) setSourceTestResult(res.source);
      if (res.target) setTargetTestResult(res.target);
    } catch (err) {
      setSourceTestResult({ success: false, error: err.message });
      setTargetTestResult({ success: false, error: err.message });
    } finally {
      setTestingConnection(false);
    }
  };

  const handleCompareSchema = async () => {
    if (!sourceUrl || !targetUrl) return;
    setComparingSchema(true);
    setSchemaResult(null);
    try {
      const res = await compareSchemaApi(sourceUrl, targetUrl);
      setSchemaResult(res);
      // Pre-select all source tables for sync selection
      if (res && res.identical) {
        const allTables = [
          ...res.identical.map(t => t.tableName),
          ...(res.differentSchema || []).map(t => t.tableName)
        ];
        setSelectedTables(allTables);
      }
    } catch (err) {
      alert(err.message || 'Gagal membandingkan skema');
    } finally {
      setComparingSchema(false);
    }
  };

  const handlePerformSync = async () => {
    if (!sourceUrl || !targetUrl) return;
    if (!dryRun && !window.confirm(`Apakah Anda yakin ingin mengeksekusi SINKRONISASI NYATA ke target database?\n\nSemua data di tabel target akan di-truncate dan diganti dengan data dari source.`)) {
      return;
    }

    setSyncing(true);
    setSyncResult(null);
    try {
      const res = await performSyncApi({
        sourceUrl,
        targetUrl,
        dryRun,
        tables: selectedTables.length > 0 ? selectedTables : null,
        batchSize
      });
      setSyncResult(res);
    } catch (err) {
      setSyncResult({
        success: false,
        logs: [`[${new Date().toISOString()}] ERROR: ${err.message}`],
        error: err.message
      });
    } finally {
      setSyncing(false);
    }
  };

  const toggleTableSelection = (tableName) => {
    if (selectedTables.includes(tableName)) {
      setSelectedTables(selectedTables.filter(t => t !== tableName));
    } else {
      setSelectedTables([...selectedTables, tableName]);
    }
  };

  const canTestOrCompare = Boolean(sourceUrl && targetUrl);

  return (
    <div className="min-h-screen text-slate-100 pb-16">
      {/* 1. Header Bar */}
      <DbSyncHeader
        onBack={onBack}
        onTestConnection={handleTestConnection}
        testingConnection={testingConnection}
        onCompareSchema={handleCompareSchema}
        comparingSchema={comparingSchema}
        canTestOrCompare={canTestOrCompare}
      />

      {/* 2. Connection Input Cards (Source & Target) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-6">
        <DbSyncConnectionCard
          type="source"
          url={sourceUrl}
          setUrl={setSourceUrl}
          selectedId={selectedSourceId}
          onSelectServer={handleSourceSelect}
          pgServers={pgServers}
          isTesting={testingSource}
          onTestConnection={handleTestSourceConnection}
          testResult={sourceTestResult}
        />

        <DbSyncConnectionCard
          type="target"
          url={targetUrl}
          setUrl={setTargetUrl}
          selectedId={selectedTargetId}
          onSelectServer={handleTargetSelect}
          pgServers={pgServers}
          isTesting={testingTarget}
          onTestConnection={handleTestTargetConnection}
          testResult={targetTestResult}
        />
      </div>

      {/* 3. Main Schema Analysis & Execution Section */}
      {schemaResult && (
        <div className="space-y-6">
          {/* Summary Stat Overview Cards */}
          <DbSyncSummaryCards summary={schemaResult.summary} />

          {/* Tab Selector */}
          <div className="flex border-b border-slate-800 gap-4">
            <button
              onClick={() => setActiveTab('compare')}
              className={`pb-3 text-sm font-bold border-b-2 transition-all cursor-pointer ${activeTab === 'compare'
                ? 'border-cyan-400 text-cyan-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
            >
              📊 Detail Perbandingan Skema ({schemaResult.summary?.totalSourceTables || 0} Tabel Source)
            </button>
            <button
              onClick={() => setActiveTab('sync')}
              className={`pb-3 text-sm font-bold border-b-2 transition-all cursor-pointer ${activeTab === 'sync'
                ? 'border-cyan-400 text-cyan-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
            >
              🚀 Konfigurasi &amp; Eksekusi Sync
            </button>
          </div>

          {/* TAB 1: COMPARE SCHEMA DETAIL */}
          {activeTab === 'compare' && (
            <DbSyncCompareTab
              schemaResult={schemaResult}
              expandedSection={expandedSchemaSection}
              setExpandedSection={setExpandedSchemaSection}
            />
          )}

          {/* TAB 2: EXECUTE SYNC CONTROL */}
          {activeTab === 'sync' && (
            <DbSyncExecuteTab
              dryRun={dryRun}
              setDryRun={setDryRun}
              batchSize={batchSize}
              setBatchSize={setBatchSize}
              selectedTables={selectedTables}
              onToggleTableSelection={toggleTableSelection}
              totalSourceTables={schemaResult.summary?.totalSourceTables}
              identicalTables={schemaResult.identical || []}
              differentSchemaTables={schemaResult.differentSchema || []}
              syncing={syncing}
              onPerformSync={handlePerformSync}
              syncResult={syncResult}
            />
          )}
        </div>
      )}
    </div>
  );
}
