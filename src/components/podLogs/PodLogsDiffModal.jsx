import React, { useState, useEffect } from 'react';
import {
  X,
  RefreshCw,
  Zap,
  CheckCircle2,
  AlertCircle,
  HardDrive,
  Database,
  Eye,
  FileCode,
  Check,
  Copy,
  ArrowDownCircle,
  ShieldAlert
} from 'lucide-react';
import {
  fetchPodLogsComparisonApi,
  syncSinglePodLogRowApi,
  executePullPodLogsApi
} from '../../api/podLogsApi';

export default function PodLogsDiffModal({
  isOpen,
  onClose,
  masterId,
  pod,
  onSyncCompleted
}) {
  const [activeDiffTab, setActiveDiffTab] = useState('missing'); // 'missing' | 'present' | 'master'
  const [isLoading, setIsLoading] = useState(true);
  const [diffData, setDiffData] = useState(null);
  const [error, setError] = useState('');
  const [syncingRowId, setSyncingRowId] = useState(null);
  const [isBulkSyncing, setIsBulkSyncing] = useState(false);
  const [actionSuccess, setActionSuccess] = useState('');

  // Selected row for JSON preview
  const [selectedJsonRow, setSelectedJsonRow] = useState(null);
  const [isCopiedJson, setIsCopiedJson] = useState(false);

  useEffect(() => {
    if (isOpen && pod && masterId) {
      loadComparison();
    }
  }, [isOpen, pod?.id, masterId]);

  const loadComparison = async () => {
    if (!pod || !masterId) return;
    setIsLoading(true);
    setError('');
    try {
      const data = await fetchPodLogsComparisonApi(masterId, pod.id, 80);
      setDiffData(data);
    } catch (err) {
      setError(err.message || 'Gagal memuat komparasi log POD');
    } finally {
      setIsLoading(false);
    }
  };

  // Single row pull by ID
  const handleSyncSingleRow = async (logId, e) => {
    e?.stopPropagation();
    setSyncingRowId(logId);
    try {
      await syncSinglePodLogRowApi(masterId, pod.id, logId);
      setActionSuccess(`Baris log ID ${logId} berhasil diverifikasi & disimpan ke Master DB!`);
      setTimeout(() => setActionSuccess(''), 3500);
      await loadComparison();
      onSyncCompleted?.();
    } catch (err) {
      alert(`Gagal menyinkronkan baris log: ${err.message}`);
    } finally {
      setSyncingRowId(null);
    }
  };

  // Bulk pull for this single POD using ID Diff Mode
  const handleBulkPullThisPod = async () => {
    if (!pod || !masterId) return;

    if (!window.confirm(`Mulai proses komparasi ID dan penarikan data pod_logs yang belum ada di Master RDS dari unit ${pod.name}?\n\nMetode: Verifikasi ID Master + Keyset Batch Upsert`)) {
      return;
    }

    setIsBulkSyncing(true);
    try {
      const res = await executePullPodLogsApi({
        masterId,
        targetPodIds: [pod.id],
        podIds: [pod.id],
        mode: 'id_diff',
        batchSize: 2000,
        markSyncedOnPod: true,
        options: {
          mode: 'id_diff',
          batchSize: 2000,
          markSyncedOnPod: true
        }
      });
      setActionSuccess(`Berhasil memproses sinkronisasi ID: ${res.message || `${res.totalProcessed || 0} baris diperbarui`}`);
      setTimeout(() => setActionSuccess(''), 4500);
      await loadComparison();
      onSyncCompleted?.();
    } catch (err) {
      alert(`Gagal menarik data: ${err.message}`);
    } finally {
      setIsBulkSyncing(false);
    }
  };

  const handleCopyJson = () => {
    if (selectedJsonRow) {
      navigator.clipboard.writeText(JSON.stringify(selectedJsonRow, null, 2));
      setIsCopiedJson(true);
      setTimeout(() => setIsCopiedJson(false), 2000);
    }
  };

  const formatActivityBadge = (type) => {
    const lower = (type || '').toLowerCase();
    if (lower.includes('play') || lower.includes('session')) {
      return 'bg-purple-500/15 border-purple-500/30 text-purple-300';
    }
    if (lower.includes('login') || lower.includes('auth')) {
      return 'bg-cyan-500/15 border-cyan-500/30 text-cyan-300';
    }
    if (lower.includes('http') || lower.includes('api')) {
      return 'bg-blue-500/15 border-blue-500/30 text-blue-300';
    }
    if (lower.includes('error') || lower.includes('fail')) {
      return 'bg-rose-500/15 border-rose-500/30 text-rose-300';
    }
    return 'bg-slate-700/30 border-slate-600 text-slate-300';
  };

  if (!isOpen || !pod) return null;

  const counts = diffData?.counts || {};
  const totalInPod = counts.totalInPod || 0;
  const totalInMaster = counts.totalInMasterForPod || 0;
  const missingRows = diffData?.missingInMasterRows || [];
  const presentRows = diffData?.presentInMasterRows || [];
  const falseSyncedCount = counts.falseSyncedCount || 0;
  const actualMissingCount = counts.actualMissingCount !== undefined ? counts.actualMissingCount : missingRows.length;

  return (
    <div className="fixed inset-0 z-[1150] bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5">
      <div className="bg-slate-950 border border-slate-800 rounded-2xl w-full max-w-5xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header Modal */}
        <div className="bg-slate-900/90 border-b border-slate-800 px-5 py-3.5 flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-rose-500/20 to-cyan-500/20 text-rose-400 border border-rose-500/30 rounded-xl">
              <HardDrive size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-sm font-bold text-white tracking-wide">
                  Komparasi Berbasis ID: {pod.name}
                </h3>
                <span className="text-[10px] font-mono px-2 py-0.5 bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 rounded-md font-bold">
                  POD V3
                </span>
                <span className="text-[10px] font-mono text-slate-400">
                  #{pod.code} • IP: {pod.host}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-2">
                <span>Database POD: <code className="text-cyan-300 font-mono">regenesis</code></span>
                <span>➔</span>
                <span>Master DB: <code className="text-indigo-300 font-mono">{diffData?.master?.name || 'RDS AWS'}</code></span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={loadComparison}
              disabled={isLoading || isBulkSyncing}
              className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs border border-slate-700 transition-colors cursor-pointer"
              title="Refresh Komparasi ID"
            >
              <RefreshCw size={14} className={isLoading ? 'animate-spin text-rose-400' : ''} />
            </button>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors cursor-pointer"
              title="Tutup Pratinjau"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Action Success Alert */}
        {actionSuccess && (
          <div className="bg-emerald-500/15 border-b border-emerald-500/40 text-emerald-300 px-5 py-2.5 text-xs flex items-center gap-2">
            <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
            <span>{actionSuccess}</span>
          </div>
        )}

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-4">
          {/* Top 3-Pillar Comparison Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
            {/* Pillar 1: Total in POD */}
            <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-3.5 flex flex-col justify-between">
              <span className="text-xs text-slate-400 flex items-center gap-1.5">
                <HardDrive size={14} className="text-cyan-400" /> Total Log di POD {pod.name}
              </span>
              <div className="my-1.5">
                <div className="text-xl font-mono font-bold text-cyan-300">
                  {isLoading ? '...' : totalInPod.toLocaleString()}
                </div>
                <span className="text-[10px] text-slate-500">baris di database lokal unit POD</span>
              </div>
            </div>

            {/* Pillar 2: Missing by ID in Master */}
            <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-3.5 flex flex-col justify-between">
              <span className="text-xs text-slate-400 flex items-center gap-1.5">
                <ArrowDownCircle size={14} className="text-amber-400" /> Belum Ada di Master RDS
              </span>
              <div className="my-1.5">
                <div className="text-xl font-mono font-bold text-amber-400">
                  {isLoading ? '...' : actualMissingCount.toLocaleString()}
                </div>
                <span className="text-[10px] text-amber-300/80 font-medium">
                  {actualMissingCount > 0
                    ? `${actualMissingCount} baris fisik belum masuk ke Master RDS`
                    : 'Seluruh baris log sudah sinkron di Master'}
                </span>
              </div>
              {falseSyncedCount > 0 && (
                <div className="text-[10px] text-rose-300 font-semibold bg-rose-500/20 px-2 py-0.5 rounded border border-rose-500/30 inline-flex items-center gap-1 mt-1">
                  <ShieldAlert size={12} className="text-rose-400 shrink-0" />
                  <span>{falseSyncedCount} baris is_synced=true tapi fisik belum di Master!</span>
                </div>
              )}
            </div>

            {/* Pillar 3: Already in Master from this POD */}
            <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-3.5 flex flex-col justify-between">
              <span className="text-xs text-slate-400 flex items-center gap-1.5">
                <Database size={14} className="text-indigo-400" /> Sudah Ada di Master RDS
              </span>
              <div className="my-1.5">
                <div className="text-xl font-mono font-bold text-indigo-300">
                  {isLoading ? '...' : totalInMaster.toLocaleString()}
                </div>
                <span className="text-[10px] text-slate-500">baris tercatat dengan pod_id unit ini</span>
              </div>
            </div>
          </div>

          {/* Quick Bulk Pull Action Bar */}
          <div className="bg-gradient-to-r from-rose-500/10 via-amber-500/10 to-indigo-500/10 border border-rose-500/30 rounded-xl p-3.5 flex items-center justify-between gap-3 flex-wrap">
            <div className="text-xs text-slate-300 flex items-center gap-2">
              <Zap size={16} className="text-amber-400 shrink-0" />
              <span>
                {missingRows.length > 0 ? (
                  <>
                    Ditemukan baris data di <b className="text-white">{pod.name}</b> yang ID-nya belum ada di Master RDS. Jalankan sinkronisasi ID untuk menariknya.
                  </>
                ) : (
                  <>
                    Seluruh sampel ID terverifikasi sinkron antara <b className="text-white">{pod.name}</b> dan Master RDS.
                  </>
                )}
              </span>
            </div>

            <button
              onClick={handleBulkPullThisPod}
              disabled={isBulkSyncing || isLoading}
              className="px-4 py-2 bg-gradient-to-r from-rose-600 to-indigo-600 hover:from-rose-500 hover:to-indigo-500 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-md shadow-rose-500/20 transition-all cursor-pointer disabled:opacity-50"
            >
              {isBulkSyncing ? (
                <RefreshCw size={13} className="animate-spin" />
              ) : (
                <Zap size={13} className="fill-current" />
              )}
              <span>
                {isBulkSyncing ? 'Sedang Menarik...' : `⚡ Sinkronkan ID yang Belum Ada di Master`}
              </span>
            </button>
          </div>

          {/* Tab View Switcher (Missing by ID vs Verified in Master) */}
          <div className="flex items-center gap-2 border-b border-slate-800 pt-1 pb-2 flex-wrap">
            <button
              onClick={() => setActiveDiffTab('missing')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer border ${activeDiffTab === 'missing'
                  ? 'bg-amber-500/20 border-amber-500/40 text-amber-300 shadow-sm'
                  : 'bg-white/5 border-transparent text-slate-400 hover:text-slate-200'
                }`}
            >
              <ArrowDownCircle size={14} />
              <span>Belum Ada di Master RDS ({actualMissingCount})</span>
            </button>

            <button
              onClick={() => setActiveDiffTab('present')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer border ${activeDiffTab === 'present'
                  ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300 shadow-sm'
                  : 'bg-white/5 border-transparent text-slate-400 hover:text-slate-200'
                }`}
            >
              <CheckCircle2 size={14} />
              <span>Terverifikasi Ada di Master ({presentRows.length})</span>
            </button>

            <button
              onClick={() => setActiveDiffTab('master')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer border ${activeDiffTab === 'master'
                  ? 'bg-indigo-500/20 border-indigo-500/40 text-indigo-300 shadow-sm'
                  : 'bg-white/5 border-transparent text-slate-400 hover:text-slate-200'
                }`}
            >
              <Database size={14} />
              <span>Sampel Log di Master RDS ({diffData?.masterRows?.length || 0})</span>
            </button>
          </div>

          {/* TAB 1: MISSING IN MASTER BY ID */}
          {activeDiffTab === 'missing' && (
            <div className="bg-slate-950 border border-slate-800 rounded-xl overflow-hidden flex flex-col">
              <div className="bg-slate-900/70 border-b border-slate-800 px-4 py-2.5 flex items-center justify-between text-xs text-slate-400">
                <span>
                  Daftar <b className="text-white">{actualMissingCount} baris log di POD</b> yang <b className="text-rose-400">ID-nya tidak ditemukan</b> di Master RDS:
                </span>
              </div>

              {isLoading ? (
                <div className="p-12 flex flex-col items-center justify-center text-slate-400">
                  <RefreshCw size={22} className="animate-spin text-rose-400 mb-2" />
                  <span className="text-xs">Memverifikasi ID ke Master RDS...</span>
                </div>
              ) : error ? (
                <div className="p-6 text-center text-rose-400 text-xs">
                  <AlertCircle size={22} className="mx-auto mb-2 text-rose-400" />
                  <span>{error}</span>
                </div>
              ) : actualMissingCount === 0 ? (
                <div className="p-12 text-center text-slate-500 text-xs flex flex-col items-center gap-1">
                  <CheckCircle2 size={24} className="text-emerald-400 opacity-60 mb-1" />
                  <span className="font-bold text-slate-300">Semua baris terverifikasi sudah ada di Master RDS!</span>
                  <span className="text-[11px] text-slate-500">Tidak ada ID yang tertinggal pada database unit {pod.name}.</span>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-slate-300">
                    <thead className="bg-slate-900/50 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
                      <tr>
                        <th className="px-3.5 py-2.5">Waktu Event</th>
                        <th className="px-3.5 py-2.5">Status di POD</th>
                        <th className="px-3.5 py-2.5">Activity Type</th>
                        <th className="px-3.5 py-2.5">Value</th>
                        <th className="px-3.5 py-2.5">Code</th>
                        <th className="px-3.5 py-2.5 text-center">Payload Data</th>
                        <th className="px-3.5 py-2.5 text-right">Aksi Tarik ID</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 font-mono">
                      {missingRows.map((row) => {
                        const isSyncingThis = syncingRowId === row.id;
                        return (
                          <tr key={row.id} className="hover:bg-slate-900/40 transition-colors">
                            <td className="px-3.5 py-2.5 text-slate-300 whitespace-nowrap">
                              {row.created_at ? new Date(row.created_at).toLocaleString('id-ID') : '-'}
                            </td>
                            <td className="px-3.5 py-2.5 font-sans">
                              {row.isFalseSynced ? (
                                <span
                                  className="px-2 py-0.5 rounded text-[10.5px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 inline-flex items-center gap-1"
                                  title="Flag is_synced di POD bernilai true, namun baris fisik dengan ID ini belum ada di Master RDS!"
                                >
                                  <AlertCircle size={11} className="text-amber-400 shrink-0" />
                                  Flag True (Belum di Master)
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 rounded text-[10.5px] font-semibold bg-rose-500/20 text-rose-300 border border-rose-500/40">
                                  Belum Sinkron (false)
                                </span>
                              )}
                            </td>
                            <td className="px-3.5 py-2.5 font-sans">
                              <span className={`px-2 py-0.5 rounded border text-[10.5px] font-semibold ${formatActivityBadge(row.activity_type)}`}>
                                {row.activity_type || '-'}
                              </span>
                            </td>
                            <td className="px-3.5 py-2.5 font-bold text-white">
                              {row.value || '-'}
                            </td>
                            <td className="px-3.5 py-2.5 text-cyan-300">
                              {row.code || '-'}
                            </td>
                            <td className="px-3.5 py-2.5 text-center">
                              <button
                                onClick={() => setSelectedJsonRow(row)}
                                className="px-2 py-0.5 bg-slate-800 hover:bg-indigo-500/20 text-indigo-300 border border-slate-700 hover:border-indigo-500/40 rounded text-xs font-sans transition-colors cursor-pointer inline-flex items-center gap-1"
                              >
                                <Eye size={11} />
                                <span>Lihat JSON</span>
                              </button>
                            </td>
                            <td className="px-3.5 py-2.5 text-right font-sans">
                              <button
                                onClick={(e) => handleSyncSingleRow(row.id, e)}
                                disabled={isSyncingThis || isBulkSyncing}
                                className="px-2.5 py-1 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 rounded-lg text-xs font-semibold inline-flex items-center gap-1 transition-colors cursor-pointer disabled:opacity-40"
                              >
                                <Zap size={11} className={isSyncingThis ? 'animate-bounce' : ''} />
                                <span>{isSyncingThis ? 'Menyimpan...' : 'Tarik ID Ini'}</span>
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: PRESENT IN MASTER BY ID */}
          {activeDiffTab === 'present' && (
            <div className="bg-slate-950 border border-slate-800 rounded-xl overflow-hidden flex flex-col">
              <div className="bg-slate-900/70 border-b border-slate-800 px-4 py-2.5 flex items-center justify-between text-xs text-slate-400">
                <span>
                  Baris log pada sampel POD yang <b className="text-emerald-400">ID-nya sudah terverifikasi ada</b> di Master RDS ({presentRows.length} baris):
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="bg-slate-900/50 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
                    <tr>
                      <th className="px-3.5 py-2.5">Waktu Event</th>
                      <th className="px-3.5 py-2.5">Status ID Master</th>
                      <th className="px-3.5 py-2.5">Activity Type</th>
                      <th className="px-3.5 py-2.5">Value</th>
                      <th className="px-3.5 py-2.5">Code</th>
                      <th className="px-3.5 py-2.5 text-center">Payload Data</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-mono">
                    {presentRows.map((row) => (
                      <tr key={row.id} className="hover:bg-slate-900/40 transition-colors">
                        <td className="px-3.5 py-2.5 text-slate-300 whitespace-nowrap">
                          {row.created_at ? new Date(row.created_at).toLocaleString('id-ID') : '-'}
                        </td>
                        <td className="px-3.5 py-2.5 font-sans">
                          <span className="px-2 py-0.5 bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 rounded text-[10.5px] font-bold inline-flex items-center gap-1">
                            <CheckCircle2 size={11} /> ID Ada di Master
                          </span>
                        </td>
                        <td className="px-3.5 py-2.5 font-sans">
                          <span className={`px-2 py-0.5 rounded border text-[10.5px] font-semibold ${formatActivityBadge(row.activity_type)}`}>
                            {row.activity_type || '-'}
                          </span>
                        </td>
                        <td className="px-3.5 py-2.5 font-bold text-white">
                          {row.value || '-'}
                        </td>
                        <td className="px-3.5 py-2.5 text-cyan-300">
                          {row.code || '-'}
                        </td>
                        <td className="px-3.5 py-2.5 text-center">
                          <button
                            onClick={() => setSelectedJsonRow(row)}
                            className="px-2 py-0.5 bg-slate-800 hover:bg-indigo-500/20 text-indigo-300 border border-slate-700 hover:border-indigo-500/40 rounded text-xs font-sans transition-colors cursor-pointer inline-flex items-center gap-1"
                          >
                            <Eye size={11} />
                            <span>Lihat JSON</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 3: MASTER ROWS FROM THIS POD */}
          {activeDiffTab === 'master' && (
            <div className="bg-slate-950 border border-slate-800 rounded-xl overflow-hidden flex flex-col">
              <div className="bg-slate-900/70 border-b border-slate-800 px-4 py-2.5 flex items-center justify-between text-xs text-slate-400">
                <span>
                  Pratinjau <b className="text-white">{diffData?.masterRows?.length || 0} baris terbaru</b> yang tercatat di Master RDS untuk unit ini:
                </span>
              </div>

              {isLoading ? (
                <div className="p-12 flex flex-col items-center justify-center text-slate-400">
                  <RefreshCw size={22} className="animate-spin text-indigo-400 mb-2" />
                  <span className="text-xs">Mengambil baris log dari Master DB...</span>
                </div>
              ) : (diffData?.masterRows || []).length === 0 ? (
                <div className="p-12 text-center text-slate-500 text-xs">
                  Belum ada baris log di Master RDS yang tercatat dari POD ini.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-slate-300">
                    <thead className="bg-slate-900/50 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
                      <tr>
                        <th className="px-3.5 py-2.5">Waktu Event</th>
                        <th className="px-3.5 py-2.5">Activity Type</th>
                        <th className="px-3.5 py-2.5">Value</th>
                        <th className="px-3.5 py-2.5">Code</th>
                        <th className="px-3.5 py-2.5 text-center">Status Sync</th>
                        <th className="px-3.5 py-2.5 text-center">Payload Data</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 font-mono">
                      {diffData.masterRows.map((row) => (
                        <tr key={row.id} className="hover:bg-slate-900/40 transition-colors">
                          <td className="px-3.5 py-2.5 text-slate-300 whitespace-nowrap">
                            {row.created_at ? new Date(row.created_at).toLocaleString('id-ID') : '-'}
                          </td>
                          <td className="px-3.5 py-2.5 font-sans">
                            <span className={`px-2 py-0.5 rounded border text-[10.5px] font-semibold ${formatActivityBadge(row.activity_type)}`}>
                              {row.activity_type || '-'}
                            </span>
                          </td>
                          <td className="px-3.5 py-2.5 font-bold text-white">
                            {row.value || '-'}
                          </td>
                          <td className="px-3.5 py-2.5 text-cyan-300">
                            {row.code || '-'}
                          </td>
                          <td className="px-3.5 py-2.5 text-center font-sans">
                            <span className="px-2 py-0.5 bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 rounded text-[10.5px] font-bold inline-flex items-center gap-1">
                              <CheckCircle2 size={11} /> Tersimpan di Master
                            </span>
                          </td>
                          <td className="px-3.5 py-2.5 text-center">
                            <button
                              onClick={() => setSelectedJsonRow(row)}
                              className="px-2 py-0.5 bg-slate-800 hover:bg-indigo-500/20 text-indigo-300 border border-slate-700 hover:border-indigo-500/40 rounded text-xs font-sans transition-colors cursor-pointer inline-flex items-center gap-1"
                            >
                              <Eye size={11} />
                              <span>Lihat JSON</span>
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="bg-slate-900/90 border-t border-slate-800 px-5 py-3 flex items-center justify-between gap-3 flex-wrap">
          <span className="text-[11px] font-mono text-slate-500">
            UUID POD: <code className="text-slate-400">{pod.pod_uuid || '(Belum diset di DB)'}</code>
          </span>

          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold border border-slate-700 cursor-pointer transition-colors"
          >
            Tutup Pratinjau
          </button>
        </div>

        {/* Nested JSON Viewer Modal */}
        {selectedJsonRow && (
          <div className="fixed inset-0 z-[1250] bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
            <div className="bg-slate-950 border border-slate-800 rounded-2xl w-full max-w-xl max-h-[80vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
              <div className="bg-slate-900/90 border-b border-slate-800 px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-2 min-w-0">
                  <FileCode size={16} className="text-indigo-400 shrink-0" />
                  <h4 className="text-xs font-mono font-bold text-white truncate">
                    Payload: {selectedJsonRow.id}
                  </h4>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleCopyJson}
                    className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-semibold flex items-center gap-1 border border-slate-700 cursor-pointer"
                  >
                    {isCopiedJson ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
                    <span>{isCopiedJson ? 'Tersalin' : 'Copy'}</span>
                  </button>
                  <button
                    onClick={() => setSelectedJsonRow(null)}
                    className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 cursor-pointer"
                  >
                    <X size={15} />
                  </button>
                </div>
              </div>

              <div className="p-4 overflow-y-auto font-mono text-xs flex flex-col gap-2">
                <pre className="p-3 bg-[#090d16] border border-slate-800 rounded-xl text-emerald-300 text-[11.5px] leading-relaxed overflow-x-auto whitespace-pre-wrap select-text">
                  {(() => {
                    try {
                      const parsed = JSON.parse(selectedJsonRow.data);
                      return JSON.stringify(parsed, null, 2);
                    } catch (_) {
                      return selectedJsonRow.data || '(Kosong)';
                    }
                  })()}
                </pre>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
