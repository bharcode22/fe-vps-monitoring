import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  Database,
  RefreshCw,
  Zap,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Play,
  Copy,
  Layers,
  FileCode,
  ShieldAlert,
  Server,
  Activity,
  Sliders,
  ChevronDown,
  ChevronUp,
  Info
} from 'lucide-react';
import { testSyncConnectionApi, testSingleConnectionApi, compareSchemaApi, performSyncApi, fetchSyncInfoApi } from '../api/syncApi';

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
    // If the server object already includes a full connection string, use it directly
    if (srv.connString) return srv.connString;
    const user = srv.username || srv.db_user || 'postgres';
    const rawPass = srv.password && srv.password !== '******' ? srv.password : '';
    // If password is not available, we cannot construct a usable connection string; return empty
    if (!rawPass) return '';
    // Use raw password (no URL‑encoding required as it is already encoded in stored connection string)
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

  // Individual Connection Test States
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
  const [expandedSchemaSection, setExpandedSchemaSection] = useState('different'); // 'different' | 'missing' | 'identical' | 'extra'

  // Fetch default URLs on mount if available
  useEffect(() => {
    fetchSyncInfoApi().then(defaults => {
      if (defaults.sourceUrl && !sourceUrl) setSourceUrl(defaults.sourceUrl);
      if (defaults.targetUrl && !targetUrl) setTargetUrl(defaults.targetUrl);
    }).catch(() => {});
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
    const actionDesc = dryRun ? 'Simulasi Sync (Dry-Run)' : 'PERINGATAN: SINKRONISASI NYATA AKAN MENGHAPUS & MENIMPA DATA TARGET!';
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

  return (
    <div className="min-h-screen text-slate-100 pb-16">
      
      {/* Top Page Header */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-cyan-500/20 pb-5">
        <div className="flex items-center gap-3.5">
          <button
            onClick={onBack}
            className="p-2.5 bg-slate-900 hover:bg-slate-800 text-cyan-400 rounded-xl border border-cyan-500/30 transition-all cursor-pointer shadow-lg shadow-cyan-500/5 flex items-center gap-1.5 text-xs font-bold"
          >
            <ArrowLeft size={16} />
            <span>Kembali</span>
          </button>
          <div>
            <div className="flex items-center gap-2.5">
              <div className="bg-cyan-500/20 p-2 rounded-xl border border-cyan-500/40">
                <Zap className="text-cyan-400 w-5 h-5" />
              </div>
              <h1 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">
                Database Sync & Schema Analyzer
              </h1>
            </div>
            <p className="text-slate-400 text-xs mt-1">
              Analisis struktur skema dan sinkronisasi data antardatabase PostgreSQL secara aman.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleTestConnection}
            disabled={testingConnection || !sourceUrl || !targetUrl}
            className="bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-cyan-400 px-4 py-2 rounded-xl text-xs font-bold border border-cyan-500/30 flex items-center gap-2 cursor-pointer transition-all"
          >
            <RefreshCw size={14} className={testingConnection ? 'animate-spin' : ''} />
            <span>{testingConnection ? 'Menguji...' : 'Uji Koneksi'}</span>
          </button>

          <button
            onClick={handleCompareSchema}
            disabled={comparingSchema || !sourceUrl || !targetUrl}
            className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 disabled:opacity-50 text-slate-950 px-4 py-2 rounded-xl text-xs font-extrabold flex items-center gap-2 cursor-pointer shadow-lg shadow-cyan-500/25 transition-all"
          >
            <Layers size={15} />
            <span>{comparingSchema ? 'Menganalisis...' : 'Bandingkan Skema'}</span>
          </button>
        </div>
      </div>

      {/* Database Connection Input Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-6">
        
        {/* Source Database Card */}
        <div className="bg-slate-900/90 border border-cyan-500/30 rounded-2xl p-5 shadow-xl backdrop-blur-xl">
          <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-cyan-400 animate-pulse"></span>
              <h3 className="text-sm font-bold text-cyan-400 uppercase tracking-wider">
                Source Database (Sumber)
              </h3>
            </div>
            {pgServers.length > 0 && (
              <select
                onChange={handleSourceSelect}
                value={selectedSourceId}
                className="bg-slate-950 text-slate-300 border border-slate-800 rounded-lg px-2.5 py-1 text-xs outline-none focus:border-cyan-500"
              >
                <option value="">-- Pilih DB Terdaftar --</option>
                {pgServers.map(s => (
                  <option key={s.id} value={s.id}>{s.name} ({s.host}:{s.port})</option>
                ))}
                <option value="custom">-- Input Connection String Manual --</option>
              </select>
            )}
          </div>

          <div className="flex items-center justify-between mb-1.5">
            <label className="text-[11px] font-semibold text-slate-400">
              PostgreSQL Connection String:
            </label>
            <button
              type="button"
              onClick={handleTestSourceConnection}
              disabled={testingSource || !sourceUrl}
              className="bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-400 disabled:opacity-50 border border-cyan-500/30 px-2.5 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <RefreshCw size={12} className={testingSource ? 'animate-spin' : ''} />
              <span>{testingSource ? 'Menguji...' : 'Cek Koneksi Source'}</span>
            </button>
          </div>
          <input
            type="text"
            value={sourceUrl}
            onChange={(e) => setSourceUrl(e.target.value)}
            placeholder="postgres://username:password@localhost:5432/dbname"
            className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-500 text-cyan-300 text-xs px-3 py-2.5 rounded-xl outline-none transition-all font-mono"
          />

          {/* Test Status Indicator Source */}
          {sourceTestResult && (
            <div className={`mt-3 p-3 rounded-xl border text-xs flex items-center justify-between ${
              sourceTestResult.success ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-red-500/10 border-red-500/30 text-red-400'
            }`}>
              <div className="flex items-center gap-2">
                {sourceTestResult.success ? <CheckCircle2 size={16} /> : <XCircle size={16} />}
                <div>
                  <span className="font-bold">{sourceTestResult.database || (sourceTestResult.success ? 'Database Terhubung' : 'Gagal Terhubung')}</span>
                  <span className="text-[11px] opacity-80 block">{sourceTestResult.user || ''} {sourceTestResult.host ? `@ ${sourceTestResult.host}` : ''} {sourceTestResult.error || ''}</span>
                </div>
              </div>
              {sourceTestResult.latencyMs !== undefined && (
                <span className="text-[11px] font-mono bg-black/40 px-2 py-0.5 rounded-md border border-current">
                  {sourceTestResult.latencyMs} ms
                </span>
              )}
            </div>
          )}
        </div>

        {/* Target Database Card */}
        <div className="bg-slate-900/90 border border-blue-500/30 rounded-2xl p-5 shadow-xl backdrop-blur-xl">
          <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-blue-400 animate-pulse"></span>
              <h3 className="text-sm font-bold text-blue-400 uppercase tracking-wider">
                Target Database (Tujuan)
              </h3>
            </div>
            {pgServers.length > 0 && (
              <select
                onChange={handleTargetSelect}
                value={selectedTargetId}
                className="bg-slate-950 text-slate-300 border border-slate-800 rounded-lg px-2.5 py-1 text-xs outline-none focus:border-blue-500"
              >
                <option value="">-- Pilih DB Terdaftar --</option>
                {pgServers.map(s => (
                  <option key={s.id} value={s.id}>{s.name} ({s.host}:{s.port})</option>
                ))}
                <option value="custom">-- Input Connection String Manual --</option>
              </select>
            )}
          </div>

          <div className="flex items-center justify-between mb-1.5">
            <label className="text-[11px] font-semibold text-slate-400">
              PostgreSQL Connection String:
            </label>
            <button
              type="button"
              onClick={handleTestTargetConnection}
              disabled={testingTarget || !targetUrl}
              className="bg-blue-500/15 hover:bg-blue-500/25 text-blue-400 disabled:opacity-50 border border-blue-500/30 px-2.5 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <RefreshCw size={12} className={testingTarget ? 'animate-spin' : ''} />
              <span>{testingTarget ? 'Menguji...' : 'Cek Koneksi Target'}</span>
            </button>
          </div>
          <input
            type="text"
            value={targetUrl}
            onChange={(e) => setTargetUrl(e.target.value)}
            placeholder="postgres://username:password@remote-host:5432/dbname"
            className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500 text-blue-300 text-xs px-3 py-2.5 rounded-xl outline-none transition-all font-mono"
          />

          {/* Test Status Indicator Target */}
          {targetTestResult && (
            <div className={`mt-3 p-3 rounded-xl border text-xs flex items-center justify-between ${
              targetTestResult.success ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-red-500/10 border-red-500/30 text-red-400'
            }`}>
              <div className="flex items-center gap-2">
                {targetTestResult.success ? <CheckCircle2 size={16} /> : <XCircle size={16} />}
                <div>
                  <span className="font-bold">{targetTestResult.database || (targetTestResult.success ? 'Database Terhubung' : 'Gagal Terhubung')}</span>
                  <span className="text-[11px] opacity-80 block">{targetTestResult.user || ''} {targetTestResult.host ? `@ ${targetTestResult.host}` : ''} {targetTestResult.error || ''}</span>
                </div>
              </div>
              {targetTestResult.latencyMs !== undefined && (
                <span className="text-[11px] font-mono bg-black/40 px-2 py-0.5 rounded-md border border-current">
                  {targetTestResult.latencyMs} ms
                </span>
              )}
            </div>
          )}
        </div>

      </div>

      {/* Main Analysis & Sync Controls */}
      {schemaResult && (
        <div className="space-y-6">

          {/* Summary Overview Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 text-center">
              <span className="text-slate-400 text-xs block mb-1">Tabel Identik</span>
              <span className="text-2xl font-extrabold text-emerald-400">
                {schemaResult.summary.identicalCount}
              </span>
            </div>
            <div className="bg-slate-900/80 border border-amber-500/30 rounded-2xl p-4 text-center">
              <span className="text-amber-400 text-xs block mb-1">Perbedaan Skema</span>
              <span className="text-2xl font-extrabold text-amber-400">
                {schemaResult.summary.differentSchemaCount}
              </span>
            </div>
            <div className="bg-slate-900/80 border border-red-500/30 rounded-2xl p-4 text-center">
              <span className="text-red-400 text-xs block mb-1">Hilang di Target</span>
              <span className="text-2xl font-extrabold text-red-400">
                {schemaResult.summary.missingInTargetCount}
              </span>
            </div>
            <div className="bg-slate-900/80 border border-purple-500/30 rounded-2xl p-4 text-center">
              <span className="text-purple-400 text-xs block mb-1">Ekstra di Target</span>
              <span className="text-2xl font-extrabold text-purple-400">
                {schemaResult.summary.extraInTargetCount}
              </span>
            </div>
          </div>

          {/* Tab Selection */}
          <div className="flex border-b border-slate-800 gap-4">
            <button
              onClick={() => setActiveTab('compare')}
              className={`pb-3 text-sm font-bold border-b-2 transition-all cursor-pointer ${
                activeTab === 'compare' ? 'border-cyan-400 text-cyan-400' : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              📊 Detail Perbandingan Skema ({schemaResult.summary.totalSourceTables} Tabel Source)
            </button>
            <button
              onClick={() => setActiveTab('sync')}
              className={`pb-3 text-sm font-bold border-b-2 transition-all cursor-pointer ${
                activeTab === 'sync' ? 'border-cyan-400 text-cyan-400' : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              🚀 Konfigurasi & Eksekusi Sync
            </button>
          </div>

          {/* TAB 1: COMPARE SCHEMA DETAIL */}
          {activeTab === 'compare' && (
            <div className="space-y-4">
              
              {/* Different Schema Accordion */}
              {schemaResult.differentSchema.length > 0 && (
                <div className="bg-slate-900/90 border border-amber-500/30 rounded-2xl p-5 shadow-xl">
                  <div className="flex items-center justify-between cursor-pointer mb-3" onClick={() => setExpandedSchemaSection(expandedSchemaSection === 'different' ? '' : 'different')}>
                    <div className="flex items-center gap-2 text-amber-400 font-bold text-sm">
                      <AlertTriangle size={18} />
                      <span>Tabel dengan Perbedaan Kolom / Tipe Data ({schemaResult.differentSchema.length})</span>
                    </div>
                    {expandedSchemaSection === 'different' ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                  </div>

                  {expandedSchemaSection === 'different' && (
                    <div className="space-y-3 mt-3">
                      {schemaResult.differentSchema.map(item => (
                        <div key={item.tableName} className="bg-slate-950 p-4 rounded-xl border border-slate-800 text-xs">
                          <div className="flex justify-between font-bold text-slate-200 mb-2">
                            <span>📋 {item.tableName}</span>
                            <span className="text-slate-400 font-normal">Rows: Source ({item.sourceRowCount}) vs Target ({item.targetRowCount})</span>
                          </div>
                          <ul className="space-y-1.5 text-slate-300">
                            {item.differences.map((diff, idx) => (
                              <li key={idx} className="bg-amber-500/10 text-amber-300 p-2 rounded-lg border border-amber-500/20 flex items-start gap-2">
                                <Info size={14} className="shrink-0 mt-0.5" />
                                <span>{diff.detail}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Missing In Target Accordion */}
              {schemaResult.missingInTarget.length > 0 && (
                <div className="bg-slate-900/90 border border-red-500/30 rounded-2xl p-5 shadow-xl">
                  <div className="flex items-center justify-between cursor-pointer mb-3" onClick={() => setExpandedSchemaSection(expandedSchemaSection === 'missing' ? '' : 'missing')}>
                    <div className="flex items-center gap-2 text-red-400 font-bold text-sm">
                      <XCircle size={18} />
                      <span>Tabel Hilang di Target ({schemaResult.missingInTarget.length})</span>
                    </div>
                    {expandedSchemaSection === 'missing' ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                  </div>

                  {expandedSchemaSection === 'missing' && (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-3">
                      {schemaResult.missingInTarget.map(item => (
                        <div key={item.tableName} className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-xs flex justify-between items-center">
                          <span className="font-bold text-red-300">🚫 {item.tableName}</span>
                          <span className="text-slate-500 text-[11px]">{item.sourceRowCount} baris</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Identical Tables Accordion */}
              {schemaResult.identical.length > 0 && (
                <div className="bg-slate-900/90 border border-emerald-500/30 rounded-2xl p-5 shadow-xl">
                  <div className="flex items-center justify-between cursor-pointer mb-3" onClick={() => setExpandedSchemaSection(expandedSchemaSection === 'identical' ? '' : 'identical')}>
                    <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
                      <CheckCircle2 size={18} />
                      <span>Tabel Skema Identik Cocok ({schemaResult.identical.length})</span>
                    </div>
                    {expandedSchemaSection === 'identical' ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                  </div>

                  {expandedSchemaSection === 'identical' && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 mt-3">
                      {schemaResult.identical.map(item => (
                        <div key={item.tableName} className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-xs flex justify-between items-center">
                          <div>
                            <span className="font-bold text-emerald-300 block">✓ {item.tableName}</span>
                            <span className="text-[10px] text-slate-500">{item.columnsCount} kolom</span>
                          </div>
                          <div className="text-right text-[11px]">
                            <span className="text-cyan-400 font-mono block">{item.sourceRowCount} S</span>
                            <span className="text-blue-400 font-mono block">{item.targetRowCount} T</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

            </div>
          )}

          {/* TAB 2: EXECUTE SYNC CONTROL */}
          {activeTab === 'sync' && (
            <div className="bg-slate-900/90 border border-cyan-500/30 rounded-2xl p-6 shadow-xl space-y-6">
              
              {/* Sync Options Panel */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5 bg-slate-950 p-4 rounded-xl border border-slate-800">
                
                {/* Dry Run Switch */}
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-white block">Dry-Run Mode (Simulasi)</span>
                    <span className="text-[11px] text-slate-400 block">Uji coba tanpa mengubah data target</span>
                  </div>
                  <button
                    onClick={() => setDryRun(!dryRun)}
                    className={`w-12 h-6 rounded-full p-1 transition-colors cursor-pointer ${
                      dryRun ? 'bg-cyan-500' : 'bg-slate-700'
                    }`}
                  >
                    <div className={`w-4 h-4 rounded-full bg-slate-950 transition-transform ${
                      dryRun ? 'translate-x-6' : 'translate-x-0'
                    }`} />
                  </button>
                </div>

                {/* Batch Size Input */}
                <div>
                  <label className="text-xs font-bold text-white block mb-1">Ukuran Batch (Rows / Batch)</label>
                  <input
                    type="number"
                    value={batchSize}
                    onChange={(e) => setBatchSize(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 text-cyan-300 text-xs px-3 py-1.5 rounded-lg outline-none"
                  />
                </div>

                {/* Table Filter Summary */}
                <div>
                  <span className="text-xs font-bold text-white block mb-1">Tabel Terpilih</span>
                  <span className="text-xs text-cyan-400 font-bold bg-cyan-500/10 px-2.5 py-1 rounded-md border border-cyan-500/30 inline-block">
                    {selectedTables.length} dari {schemaResult.summary.totalSourceTables} Tabel
                  </span>
                </div>

              </div>

              {/* Table Selection Picker */}
              <div>
                <span className="text-xs font-bold text-slate-300 mb-2 block">Pilih Tabel untuk Disinkronkan:</span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 max-h-48 overflow-y-auto p-3 bg-slate-950 rounded-xl border border-slate-800">
                  {schemaResult.identical.map(t => (
                    <label key={t.tableName} className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer hover:text-white">
                      <input
                        type="checkbox"
                        checked={selectedTables.includes(t.tableName)}
                        onChange={() => toggleTableSelection(t.tableName)}
                        className="rounded border-slate-700 text-cyan-500 focus:ring-0 cursor-pointer"
                      />
                      <span className="truncate">{t.tableName}</span>
                    </label>
                  ))}
                  {schemaResult.differentSchema.map(t => (
                    <label key={t.tableName} className="flex items-center gap-2 text-xs text-amber-300 cursor-pointer hover:text-white">
                      <input
                        type="checkbox"
                        checked={selectedTables.includes(t.tableName)}
                        onChange={() => toggleTableSelection(t.tableName)}
                        className="rounded border-slate-700 text-cyan-500 focus:ring-0 cursor-pointer"
                      />
                      <span className="truncate">{t.tableName} ⚠️</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Submit Sync Button */}
              <div className="flex items-center justify-between pt-3 border-t border-slate-800">
                <div className="text-xs text-slate-400">
                  {dryRun ? (
                    <span className="text-cyan-400 font-semibold">ℹ️ Mode Simulasi Aktif: Data target aman.</span>
                  ) : (
                    <span className="text-red-400 font-semibold">⚠️ Mode Live Active: Data target akan ditimpa!</span>
                  )}
                </div>

                <button
                  onClick={handlePerformSync}
                  disabled={syncing || selectedTables.length === 0}
                  className={`px-6 py-3 rounded-xl font-extrabold text-xs flex items-center gap-2 shadow-xl cursor-pointer transition-all ${
                    dryRun
                      ? 'bg-gradient-to-r from-cyan-400 to-blue-500 text-slate-950 hover:from-cyan-300 hover:to-blue-400 shadow-cyan-500/20'
                      : 'bg-gradient-to-r from-red-500 to-amber-500 text-white hover:from-red-400 hover:to-amber-400 shadow-red-500/20'
                  }`}
                >
                  <Play size={16} className={syncing ? 'animate-bounce' : ''} />
                  <span>{syncing ? 'Memproses Sync...' : dryRun ? 'Jalankan Simulasi Sync' : 'Mulai Sinkronisasi NYATA'}</span>
                </button>
              </div>

              {/* Sync Execution Output Terminal Log */}
              {syncResult && (
                <div className="mt-6 bg-slate-950 p-4 rounded-2xl border border-cyan-500/30 text-xs font-mono">
                  <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-800">
                    <span className="text-cyan-400 font-bold">📜 Log Output Sinkronisasi</span>
                    {syncResult.durationMs && (
                      <span className="text-emerald-400 font-semibold">Selesai dalam {syncResult.durationMs} ms ({syncResult.totalRowsSynced} baris)</span>
                    )}
                  </div>

                  <div className="space-y-1 max-h-60 overflow-y-auto">
                    {(syncResult.logs || []).map((logLine, i) => (
                      <div key={i} className="text-slate-300 leading-relaxed">{logLine}</div>
                    ))}
                  </div>

                  {syncResult.details && (
                    <div className="mt-4 pt-3 border-t border-slate-800 space-y-1.5">
                      <span className="text-slate-400 text-[11px] uppercase font-bold block mb-1">Rincian per Tabel:</span>
                      {syncResult.details.map((d, idx) => (
                        <div key={idx} className="flex justify-between text-[11px] bg-slate-900/60 p-2 rounded-lg">
                          <span className="text-slate-300 font-bold">{d.tableName}</span>
                          <span className={d.status === 'success' ? 'text-emerald-400' : 'text-amber-400'}>
                            {d.status.toUpperCase()} ({d.rowsSynced || 0} rows)
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

            </div>
          )}

        </div>
      )}

    </div>
  );
}
