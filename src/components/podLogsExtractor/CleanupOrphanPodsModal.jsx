import React, { useState, useEffect, useCallback } from 'react';
import {
  Trash2,
  AlertTriangle,
  CheckCircle2,
  X,
  RefreshCw,
  Database,
  Layers,
  Music,
  UserCheck,
  FileText,
  ShieldAlert,
  Search,
  Eye,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import {
  fetchOrphanCleanupPreviewApi,
  fetchOrphanCleanupRecordsApi,
  executeOrphanCleanupApi
} from '../../api/podLogsExtractorApi';

export default function CleanupOrphanPodsModal({
  isOpen,
  onClose,
  masterId,
  masterName,
  onCleanupSuccess
}) {
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);
  const [previewData, setPreviewData] = useState(null);
  const [error, setError] = useState('');
  const [successResult, setSuccessResult] = useState(null);

  // Scope state
  const [cleanExtracted, setCleanExtracted] = useState(true);
  const [cleanRawLogs, setCleanRawLogs] = useState(false);
  const [showPodList, setShowPodList] = useState(false);

  // Inspection Table state
  const [activeInspectTable, setActiveInspectTable] = useState('play_sesion_detail');
  const [recordsPage, setRecordsPage] = useState(1);
  const [recordsSearch, setRecordsSearch] = useState('');
  const [recordsData, setRecordsData] = useState({ totalRows: 0, page: 1, limit: 10, totalPages: 1, rows: [] });
  const [isLoadingRecords, setIsLoadingRecords] = useState(false);

  // Load preview data whenever modal opens
  const loadPreview = useCallback(async () => {
    if (!masterId) return;
    setIsLoadingPreview(true);
    setError('');
    setSuccessResult(null);

    try {
      const data = await fetchOrphanCleanupPreviewApi(masterId);
      setPreviewData(data);
    } catch (err) {
      setError(err.message || 'Gagal memuat pratinjau data orphan');
    } finally {
      setIsLoadingPreview(false);
    }
  }, [masterId]);

  useEffect(() => {
    if (isOpen && masterId) {
      loadPreview();
    }
  }, [isOpen, masterId, loadPreview]);

  // Load detailed records for the active inspect table
  const loadRecords = useCallback(async (table, page = 1, search = '') => {
    if (!masterId) return;
    setIsLoadingRecords(true);
    try {
      const res = await fetchOrphanCleanupRecordsApi({
        masterId,
        table,
        page,
        limit: 10,
        search
      });
      setRecordsData(res || { totalRows: 0, page: 1, limit: 10, totalPages: 1, rows: [] });
    } catch (err) {
      console.error('Error fetching orphan records:', err);
    } finally {
      setIsLoadingRecords(false);
    }
  }, [masterId]);

  // Trigger load records when inspect table or page changes
  useEffect(() => {
    if (isOpen && masterId && !successResult) {
      loadRecords(activeInspectTable, recordsPage, recordsSearch);
    }
  }, [isOpen, masterId, activeInspectTable, recordsPage, loadRecords, successResult]);

  // Handle Search submit
  const handleSearchRecords = (e) => {
    e.preventDefault();
    setRecordsPage(1);
    loadRecords(activeInspectTable, 1, recordsSearch);
  };

  const handleSwitchInspectTable = (tbl) => {
    setActiveInspectTable(tbl);
    setRecordsPage(1);
    setRecordsSearch('');
  };

  if (!isOpen) return null;

  const summary = previewData?.summary || {};
  const orphanPodsList = previewData?.orphanPodsList || [];

  const handleExecute = async () => {
    if (!cleanExtracted && !cleanRawLogs) {
      setError('Silakan pilih minimal satu opsi data yang ingin dibersihkan.');
      return;
    }

    setIsExecuting(true);
    setError('');
    try {
      const res = await executeOrphanCleanupApi({
        masterId,
        cleanExtracted,
        cleanRawLogs
      });
      setSuccessResult(res);
      if (onCleanupSuccess) {
        onCleanupSuccess(res);
      }
    } catch (err) {
      setError(err.message || 'Gagal membersihkan data orphan');
    } finally {
      setIsExecuting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl bg-slate-900/95 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/50">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400">
              <Trash2 size={20} />
            </div>
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <span>Bersihkan Data Orphan POD</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30">
                  DATABASE CLEANUP & PREVIEW
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                Pratinjau baris data sebelum dieksekusi pembersihan dari Master Database
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isExecuting}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-5 flex-1 custom-scrollbar">
          {/* Master DB indicator */}
          <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 rounded-xl bg-slate-950/60 border border-slate-800 text-xs text-slate-300">
            <div className="flex items-center gap-2">
              <Database size={14} className="text-cyan-400" />
              <span>Target Master Database:</span>
              <strong className="text-white font-mono">{masterName || `Master #${masterId}`}</strong>
            </div>
            <div className="text-[11px] text-slate-400">
              Armada POD Terdaftar: <strong className="text-emerald-400">{previewData?.registeredServersCount || 6} Unit</strong>
            </div>
          </div>

          {/* Success Banner */}
          {successResult && (
            <div className="p-4 rounded-2xl bg-emerald-950/40 border border-emerald-500/30 text-emerald-300 flex items-start gap-3 animate-in fade-in">
              <CheckCircle2 size={20} className="text-emerald-400 shrink-0 mt-0.5" />
              <div className="text-xs space-y-1">
                <div className="font-bold text-sm text-white">Data Orphan Berhasil Dibersihkan!</div>
                <p className="text-slate-300">
                  Total baris yang berhasil dihapus secara permanen dari Master Database:
                </p>
                <div className="flex flex-wrap gap-2 pt-1 font-mono text-[11px]">
                  <span className="px-2 py-0.5 rounded bg-emerald-500/20 border border-emerald-500/30 text-emerald-200">
                    Sesi Lagu: {successResult.deleted?.playSessions || 0}
                  </span>
                  <span className="px-2 py-0.5 rounded bg-emerald-500/20 border border-emerald-500/30 text-emerald-200">
                    Autentikasi: {successResult.deleted?.auth || 0}
                  </span>
                  {successResult.deleted?.rawLogs > 0 && (
                    <span className="px-2 py-0.5 rounded bg-amber-500/20 border border-amber-500/30 text-amber-200">
                      Log Mentah: {successResult.deleted.rawLogs}
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Error Banner */}
          {error && (
            <div className="p-3.5 rounded-xl bg-rose-950/40 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2.5">
              <AlertTriangle size={16} className="text-rose-400 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Preview Loading State */}
          {isLoadingPreview && (
            <div className="py-12 flex flex-col items-center justify-center gap-3 text-slate-400">
              <RefreshCw size={24} className="animate-spin text-rose-400" />
              <span className="text-xs">Memeriksa ketersediaan data orphan pada database...</span>
            </div>
          )}

          {/* Preview Statistics Grid & Data Inspection Table */}
          {!isLoadingPreview && !successResult && previewData && (
            <>
              {/* 1. Summary Cards Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* Play Sessions */}
                <button
                  type="button"
                  onClick={() => handleSwitchInspectTable('play_sesion_detail')}
                  className={`p-4 rounded-2xl text-left border transition-all ${
                    activeInspectTable === 'play_sesion_detail'
                      ? 'bg-purple-950/30 border-purple-500/60 shadow-md shadow-purple-950/40 ring-1 ring-purple-500/40'
                      : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 text-purple-400 text-xs font-semibold mb-1">
                    <span className="flex items-center gap-1.5">
                      <Music size={14} />
                      play_sesion_detail
                    </span>
                    {activeInspectTable === 'play_sesion_detail' && (
                      <span className="text-[9px] px-1.5 py-0.2 rounded bg-purple-500/20 text-purple-300 uppercase font-bold">
                        AKTIF
                      </span>
                    )}
                  </div>
                  <div className="text-2xl font-black text-white font-mono">
                    {(summary.playSessionsOrphanTotal || 0).toLocaleString()}
                  </div>
                  <div className="text-[10px] text-slate-400 mt-1 flex flex-col gap-0.5">
                    <span>• {summary.playSessionsNull || 0} pod_id NULL</span>
                    <span>• {summary.playSessionsUnregistered || 0} UUID tak terdaftar</span>
                  </div>
                </button>

                {/* Auth Details */}
                <button
                  type="button"
                  onClick={() => handleSwitchInspectTable('auth_detail')}
                  className={`p-4 rounded-2xl text-left border transition-all ${
                    activeInspectTable === 'auth_detail'
                      ? 'bg-cyan-950/30 border-cyan-500/60 shadow-md shadow-cyan-950/40 ring-1 ring-cyan-500/40'
                      : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 text-cyan-400 text-xs font-semibold mb-1">
                    <span className="flex items-center gap-1.5">
                      <UserCheck size={14} />
                      auth_detail
                    </span>
                    {activeInspectTable === 'auth_detail' && (
                      <span className="text-[9px] px-1.5 py-0.2 rounded bg-cyan-500/20 text-cyan-300 uppercase font-bold">
                        AKTIF
                      </span>
                    )}
                  </div>
                  <div className="text-2xl font-black text-white font-mono">
                    {(summary.authOrphanTotal || 0).toLocaleString()}
                  </div>
                  <div className="text-[10px] text-slate-400 mt-1 flex flex-col gap-0.5">
                    <span>• {summary.authNull || 0} pod_id NULL</span>
                    <span>• {summary.authUnregistered || 0} UUID tak terdaftar</span>
                  </div>
                </button>

                {/* Raw Logs */}
                <button
                  type="button"
                  onClick={() => handleSwitchInspectTable('pod_logs')}
                  className={`p-4 rounded-2xl text-left border transition-all ${
                    activeInspectTable === 'pod_logs'
                      ? 'bg-amber-950/30 border-amber-500/60 shadow-md shadow-amber-950/40 ring-1 ring-amber-500/40'
                      : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 text-amber-400 text-xs font-semibold mb-1">
                    <span className="flex items-center gap-1.5">
                      <FileText size={14} />
                      pod_logs (Mentah)
                    </span>
                    {activeInspectTable === 'pod_logs' && (
                      <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 uppercase font-bold">
                        AKTIF
                      </span>
                    )}
                  </div>
                  <div className="text-2xl font-black text-white font-mono">
                    {(summary.rawLogsOrphanTotal || 0).toLocaleString()}
                  </div>
                  <div className="text-[10px] text-slate-400 mt-1 flex flex-col gap-0.5">
                    <span>• {summary.rawLogsNull || 0} pod_id NULL</span>
                    <span>• {summary.rawLogsUnregistered || 0} UUID tak terdaftar</span>
                  </div>
                </button>
              </div>

              {/* 2. TABEL PRATINJAU BARIS DATA YANG AKAN DIHAPUS */}
              <div className="rounded-2xl bg-slate-950/70 border border-slate-800 overflow-hidden">
                {/* Sub-header Controls */}
                <div className="p-3.5 border-b border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-950/40">
                  <div className="flex items-center gap-2">
                    <Eye size={15} className="text-cyan-400" />
                    <span className="text-xs font-bold text-white tracking-wide">
                      Pratinjau Baris Data: <code className="text-purple-300 font-mono">{activeInspectTable}</code>
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-mono">
                      {recordsData.totalRows.toLocaleString()} baris
                    </span>
                  </div>

                  {/* Filter Search within orphan records */}
                  <form onSubmit={handleSearchRecords} className="flex items-center gap-1.5">
                    <div className="relative">
                      <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
                      <input
                        type="text"
                        placeholder="Cari kata kunci..."
                        value={recordsSearch}
                        onChange={(e) => setRecordsSearch(e.target.value)}
                        className="w-40 sm:w-52 pl-7 pr-2.5 py-1 bg-slate-900 border border-slate-800 text-white text-xs rounded-xl focus:outline-none focus:border-cyan-500"
                      />
                    </div>
                    <button
                      type="submit"
                      className="px-2.5 py-1 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold hover:bg-slate-700 transition-colors"
                    >
                      Cari
                    </button>
                  </form>
                </div>

                {/* Table Content */}
                <div className="overflow-x-auto min-h-[200px]">
                  {isLoadingRecords ? (
                    <div className="py-16 flex flex-col items-center justify-center gap-2 text-slate-500 text-xs">
                      <RefreshCw size={18} className="animate-spin text-cyan-400" />
                      <span>Memuat baris data orphan...</span>
                    </div>
                  ) : recordsData.rows.length === 0 ? (
                    <div className="py-12 text-center text-slate-500 text-xs italic">
                      Tidak ada baris data orphan ditemukan pada tabel ini.
                    </div>
                  ) : (
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-900/60 border-b border-slate-800 text-[10px] uppercase font-bold text-slate-400">
                        <tr>
                          <th className="py-2.5 px-3">Waktu</th>
                          <th className="py-2.5 px-3">Alasan Pembersihan</th>
                          <th className="py-2.5 px-3">POD ID (UUID)</th>
                          {activeInspectTable === 'play_sesion_detail' && (
                            <>
                              <th className="py-2.5 px-3">Judul Lagu / Sesi</th>
                              <th className="py-2.5 px-3">Durasi</th>
                              <th className="py-2.5 px-3">User ID</th>
                            </>
                          )}
                          {activeInspectTable === 'auth_detail' && (
                            <>
                              <th className="py-2.5 px-3">Akun / User</th>
                              <th className="py-2.5 px-3">Aksi</th>
                              <th className="py-2.5 px-3">User ID</th>
                            </>
                          )}
                          {activeInspectTable === 'pod_logs' && (
                            <>
                              <th className="py-2.5 px-3">Aktivitas</th>
                              <th className="py-2.5 px-3">Value</th>
                              <th className="py-2.5 px-3">Code</th>
                            </>
                          )}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/50 font-mono text-[11px]">
                        {recordsData.rows.map((r) => (
                          <tr key={r.id} className="hover:bg-slate-900/50 transition-colors">
                            <td className="py-2 px-3 text-slate-400 whitespace-nowrap">
                              {r.created_at ? new Date(r.created_at).toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'medium' }) : '-'}
                            </td>
                            <td className="py-2 px-3 whitespace-nowrap">
                              <span
                                className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                                  !r.pod_id
                                    ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                                    : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                                }`}
                              >
                                {r.orphan_reason}
                              </span>
                            </td>
                            <td className="py-2 px-3 text-slate-300 whitespace-nowrap">
                              {r.pod_id ? (
                                <span title={r.pod_id}>{r.pod_id.substring(0, 13)}...</span>
                              ) : (
                                <span className="text-slate-500 italic">null</span>
                              )}
                            </td>

                            {/* play_sesion_detail columns */}
                            {activeInspectTable === 'play_sesion_detail' && (
                              <>
                                <td className="py-2 px-3 text-white max-w-[200px] truncate font-sans">
                                  {r.song_title || r.session_name || '-'}
                                </td>
                                <td className="py-2 px-3 text-slate-400 whitespace-nowrap">
                                  {r.duration && r.duration !== 'undefined' ? `${r.duration}m` : '-'}
                                </td>
                                <td className="py-2 px-3 text-slate-500 whitespace-nowrap" title={r.user_id}>
                                  {r.user_id ? `${r.user_id.substring(0, 8)}...` : '-'}
                                </td>
                              </>
                            )}

                            {/* auth_detail columns */}
                            {activeInspectTable === 'auth_detail' && (
                              <>
                                <td className="py-2 px-3 text-cyan-300 font-sans font-semibold">
                                  {r.user || '-'}
                                </td>
                                <td className="py-2 px-3 text-slate-300 uppercase text-[10px]">
                                  {r.activity_type || '-'}
                                </td>
                                <td className="py-2 px-3 text-slate-500 whitespace-nowrap" title={r.user_id}>
                                  {r.user_id ? `${r.user_id.substring(0, 8)}...` : '-'}
                                </td>
                              </>
                            )}

                            {/* pod_logs columns */}
                            {activeInspectTable === 'pod_logs' && (
                              <>
                                <td className="py-2 px-3 text-amber-300 text-[10px]">
                                  {r.activity_type || '-'}
                                </td>
                                <td className="py-2 px-3 text-white max-w-[180px] truncate font-sans">
                                  {r.value || '-'}
                                </td>
                                <td className="py-2 px-3 text-slate-400 whitespace-nowrap">
                                  {r.code || '-'}
                                </td>
                              </>
                            )}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>

                {/* Pagination Controls */}
                {recordsData.totalPages > 1 && (
                  <div className="p-3 border-t border-slate-800 bg-slate-950/50 flex items-center justify-between text-xs text-slate-400">
                    <span className="font-mono text-[11px]">
                      Halaman {recordsData.page} dari {recordsData.totalPages} ({recordsData.totalRows} baris)
                    </span>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => setRecordsPage(Math.max(1, recordsPage - 1))}
                        disabled={recordsPage <= 1 || isLoadingRecords}
                        className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 disabled:opacity-40 transition-colors"
                      >
                        <ChevronLeft size={13} />
                        <span>Sebelumnya</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setRecordsPage(Math.min(recordsData.totalPages, recordsPage + 1))}
                        disabled={recordsPage >= recordsData.totalPages || isLoadingRecords}
                        className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 disabled:opacity-40 transition-colors"
                      >
                        <span>Selanjutnya</span>
                        <ChevronRight size={13} />
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* 3. Collapsible detected orphan UUIDs list */}
              {orphanPodsList.length > 0 && (
                <div className="rounded-2xl bg-slate-950/40 border border-slate-800 overflow-hidden text-xs">
                  <button
                    type="button"
                    onClick={() => setShowPodList(!showPodList)}
                    className="w-full px-4 py-2.5 flex items-center justify-between text-slate-300 hover:text-white transition-colors"
                  >
                    <span className="font-semibold flex items-center gap-2">
                      <ShieldAlert size={14} className="text-amber-400" />
                      Daftar POD UUID Orphan Terdeteksi ({orphanPodsList.length} unit/entri)
                    </span>
                    <span className="text-[11px] text-slate-500 font-mono">
                      {showPodList ? 'Sembunyikan' : 'Lihat Rincian'}
                    </span>
                  </button>

                  {showPodList && (
                    <div className="px-4 pb-3 pt-1 border-t border-slate-800/80 space-y-1.5 max-h-40 overflow-y-auto">
                      {orphanPodsList.map((pod, idx) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between py-1 px-2 rounded-lg bg-slate-900/60 font-mono text-[11px]"
                        >
                          <span className={pod.pod_id ? 'text-slate-300' : 'text-rose-400 font-semibold'}>
                            {pod.pod_id ? pod.pod_id : '[NULL / Kosong]'}
                          </span>
                          <div className="flex items-center gap-2 text-slate-400 text-[10px]">
                            {pod.play_count > 0 && <span>Sesi: {pod.play_count}</span>}
                            {pod.auth_count > 0 && <span>Auth: {pod.auth_count}</span>}
                            {pod.log_count > 0 && <span>Log: {pod.log_count}</span>}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* 4. Cleanup Scope Checkboxes */}
              <div className="space-y-3 p-4 rounded-2xl bg-slate-950/80 border border-slate-800">
                <div className="text-xs font-bold text-white uppercase tracking-wider mb-2 flex items-center gap-2">
                  <span>Pilihan Lingkup Data yang Ingin Dibersihkan:</span>
                </div>

                {/* Option 1: Extracted tables */}
                <label className="flex items-start gap-3 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={cleanExtracted}
                    onChange={(e) => setCleanExtracted(e.target.checked)}
                    className="mt-1 rounded bg-slate-900 border-slate-700 text-rose-500 focus:ring-rose-500"
                  />
                  <div>
                    <span className="text-xs font-bold text-slate-200 group-hover:text-white transition-colors block">
                      Hapus Data Hasil Ekstraksi (play_sesion_detail & auth_detail)
                    </span>
                    <span className="text-[11px] text-slate-400 block">
                      Membersihkan {(summary.totalExtractedOrphans || 0).toLocaleString()} baris hasil ekstraksi yang tidak berelasi dengan armada POD terdaftar.
                    </span>
                  </div>
                </label>

                {/* Option 2: Raw logs */}
                <label className="flex items-start gap-3 cursor-pointer group pt-2 border-t border-slate-800/80">
                  <input
                    type="checkbox"
                    checked={cleanRawLogs}
                    onChange={(e) => setCleanRawLogs(e.target.checked)}
                    className="mt-1 rounded bg-slate-900 border-slate-700 text-rose-500 focus:ring-rose-500"
                  />
                  <div>
                    <span className="text-xs font-bold text-amber-300 group-hover:text-amber-200 transition-colors block flex items-center gap-1.5">
                      <span>Sertakan juga Pembersihan Log Mentah (pod_logs)</span>
                      <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                        OPSIONAL
                      </span>
                    </span>
                    <span className="text-[11px] text-slate-400 block">
                      Menghapus {(summary.rawLogsOrphanTotal || 0).toLocaleString()} baris pada tabel log mentah utama yang tidak memiliki pod_uuid valid.
                    </span>
                  </div>
                </label>
              </div>

              {/* Caution Alert */}
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-[11px] flex items-center gap-2">
                <AlertTriangle size={15} className="shrink-0 text-amber-400" />
                <span>
                  Penghapusan dilakukan secara permanen pada Master Database. Tindakan ini aman dan tidak akan memengaruhi armada unit POD yang terdaftar resmi.
                </span>
              </div>
            </>
          )}

          {/* When no orphan records found */}
          {!isLoadingPreview && !successResult && previewData && summary.totalExtractedOrphans === 0 && summary.rawLogsOrphanTotal === 0 && (
            <div className="py-8 text-center text-slate-400 space-y-2">
              <CheckCircle2 size={32} className="text-emerald-400 mx-auto" />
              <div className="text-sm font-bold text-white">Database Sudah Bersih!</div>
              <p className="text-xs text-slate-400 max-w-md mx-auto">
                Tidak ditemukan data dengan pod_uuid orphan atau null. Seluruh data pada database ini terhubung dengan unit armada POD yang valid.
              </p>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-slate-800 bg-slate-950/50 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            disabled={isExecuting}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white bg-slate-900 hover:bg-slate-800 border border-slate-700 transition-colors"
          >
            {successResult ? 'Tutup' : 'Batal'}
          </button>

          {!successResult && (
            <button
              type="button"
              onClick={handleExecute}
              disabled={
                isExecuting ||
                isLoadingPreview ||
                (!cleanExtracted && !cleanRawLogs) ||
                ((summary.totalExtractedOrphans || 0) === 0 && (!cleanRawLogs || (summary.rawLogsOrphanTotal || 0) === 0))
              }
              className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 shadow-lg shadow-rose-950/50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-all"
            >
              {isExecuting ? (
                <>
                  <RefreshCw size={14} className="animate-spin" />
                  <span>Membersihkan...</span>
                </>
              ) : (
                <>
                  <Trash2 size={14} />
                  <span>Bersihkan Data Orphan Sekarang</span>
                </>
              )}
            </button>
          )}

          {successResult && (
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 shadow-lg shadow-emerald-950/50 flex items-center gap-1.5 transition-all"
            >
              <span>Selesai & Muat Ulang</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
