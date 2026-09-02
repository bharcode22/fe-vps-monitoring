import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  Volume2,
  RefreshCw,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  FileAudio,
  Filter,
  Eye,
  EyeOff
} from 'lucide-react';
import { fetchCompareSoundsApi } from '../api/vpsApi';
import SoundsSkeletonTable from '../components/common/SoundsSkeletonTable';
import { useLanguage } from '../context/LanguageContext';

export default function SoundsComparisonPage({ onBack }) {
  const { t } = useLanguage();
  const [podVersion, setPodVersion] = useState('v3'); // Default to v3
  const [isLoading, setIsLoading] = useState(false);
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  const [showOnlyMissing, setShowOnlyMissing] = useState(false);
  const [showHost, setShowHost] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const loadData = async () => {
    setIsLoading(true);
    setError('');
    setData(null);
    try {
      const res = await fetchCompareSoundsApi(podVersion);
      setData(res);
    } catch (err) {
      setError(err.message || 'Gagal memuat perbandingan data sound');
    } finally {
      setIsLoading(false);
    }
  };

  // Initially load data
  useEffect(() => {
    loadData();
  }, [podVersion]);

  // Derived data
  const filesList = data ? Object.keys(data.files).sort() : [];

  const filteredFiles = filesList.filter(filename => {
    const fileInfo = data.files[filename];
    // Filter by missing
    if (showOnlyMissing && !fileInfo.isMissingInSome) {
      return false;
    }
    // Filter by search
    if (searchQuery && !filename.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }
    return true;
  });

  const missingCount = data ? Object.values(data.files).filter(f => f.isMissingInSome).length : 0;
  const completeCount = data ? data.totalFiles - missingCount : 0;

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
                <Volume2 className="text-cyan-400 w-5 h-5" />
              </div>
              <h1 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">
                Perbandingan Sound Antar Pod
              </h1>
            </div>
            <p className="text-slate-400 text-xs mt-1">
              Cek kelengkapan file audio dan video lintas server POD secara real-time.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <select
            value={podVersion}
            onChange={(e) => setPodVersion(e.target.value)}
            className="bg-slate-950 text-cyan-300 border border-slate-800 rounded-xl px-3 py-2 text-xs font-bold outline-none focus:border-cyan-500 cursor-pointer"
          >
            <option value="all">Semua Versi Pod</option>
            <option value="v3">Pod Versi 3 (Flat)</option>
            <option value="v2">Pod Versi 2 (Subfolders)</option>
          </select>

          <button
            onClick={loadData}
            disabled={isLoading}
            className="bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-cyan-400 px-4 py-2 rounded-xl text-xs font-bold border border-cyan-500/30 flex items-center gap-2 cursor-pointer transition-all"
          >
            <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
            <span>{isLoading ? 'Memuat...' : 'Refresh Data'}</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-400 p-4 rounded-xl mb-6 text-sm flex items-start gap-3">
          <AlertTriangle size={18} className="mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {isLoading && <SoundsSkeletonTable />}

      {data && (
        <div className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 text-center">
              <span className="text-slate-400 text-xs block mb-1">Total Pod Dicek</span>
              <span className="text-2xl font-extrabold text-white">
                {data.pods.length}
              </span>
            </div>
            <div className="bg-slate-900/80 border border-cyan-500/30 rounded-2xl p-4 text-center">
              <span className="text-cyan-400 text-xs block mb-1">Total File Unik</span>
              <span className="text-2xl font-extrabold text-cyan-400">
                {data.totalFiles}
              </span>
            </div>
            <div className="bg-slate-900/80 border border-emerald-500/30 rounded-2xl p-4 text-center">
              <span className="text-emerald-400 text-xs block mb-1">File Lengkap di Semua Pod</span>
              <span className="text-2xl font-extrabold text-emerald-400">
                {completeCount}
              </span>
            </div>
            <div className="bg-slate-900/80 border border-amber-500/30 rounded-2xl p-4 text-center">
              <span className="text-amber-400 text-xs block mb-1">File Hilang di Sebagian Pod</span>
              <span className="text-2xl font-extrabold text-amber-400">
                {missingCount}
              </span>
            </div>
          </div>

          {/* Pod Errors if any */}
          {data.pods.some(p => !p.fetchSuccess) && (
            <div className="bg-amber-500/10 border border-amber-500/30 p-4 rounded-xl">
              <h4 className="text-amber-400 font-bold text-sm mb-2 flex items-center gap-2">
                <AlertTriangle size={16} />
                Beberapa Pod Gagal Diakses:
              </h4>
              <ul className="text-xs text-amber-200/80 space-y-1 list-disc pl-5">
                {data.pods.filter(p => !p.fetchSuccess).map(p => (
                  <li key={p.id}>{p.name} {showHost ? `(${p.host})` : ''}: {p.error}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Data Table */}
          <div className="bg-slate-900/90 border border-cyan-500/30 rounded-2xl shadow-xl overflow-hidden">
            {/* Table Toolbar */}
            <div className="p-4 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-950/50">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Cari nama file..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="bg-slate-900 border border-slate-700 text-slate-200 text-xs px-3 py-2 pl-9 rounded-lg outline-none focus:border-cyan-500 w-full sm:w-64"
                />
                <FileAudio size={14} className="absolute left-3 top-2.5 text-slate-500" />
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setShowHost(!showHost)}
                  className="flex items-center gap-2 text-xs font-bold text-slate-300 cursor-pointer hover:text-white transition-colors bg-slate-900 px-3 py-2 rounded-lg border border-slate-700"
                  title={showHost ? "Sembunyikan IP Host" : "Tampilkan IP Host"}
                >
                  {showHost ? <EyeOff size={14} className="text-cyan-400" /> : <Eye size={14} className="text-slate-500" />}
                  <span className={showHost ? 'text-cyan-400' : ''}>
                    {showHost ? 'Sembunyikan IP' : 'Tampilkan IP'}
                  </span>
                </button>

                <label className="flex items-center gap-2 text-xs font-bold text-slate-300 cursor-pointer hover:text-white transition-colors bg-slate-900 px-3 py-2 rounded-lg border border-slate-700">
                  <Filter size={14} className={showOnlyMissing ? 'text-amber-400' : 'text-slate-500'} />
                  <input
                    type="checkbox"
                    checked={showOnlyMissing}
                    onChange={(e) => setShowOnlyMissing(e.target.checked)}
                    className="rounded border-slate-600 text-cyan-500 focus:ring-0 cursor-pointer hidden"
                  />
                  <span className={showOnlyMissing ? 'text-amber-400' : ''}>
                    Hanya Tampilkan File yang Hilang
                  </span>
                </label>
              </div>
            </div>

            {/* Table Container */}
            <div className="overflow-auto max-h-[70vh]">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-950">
                    <th className="p-4 text-xs font-bold text-cyan-400 sticky top-0 left-0 bg-slate-950 z-30 w-[350px] min-w-[280px] max-w-[350px] border-b border-slate-800 shadow-[1px_1px_0_0_#1e293b]">
                      Nama File (Basename)
                    </th>
                    {data.pods.map(pod => (
                      <th key={pod.id} className="p-4 text-xs font-bold text-slate-300 text-center sticky top-0 bg-slate-950 z-20 border-b border-l border-slate-800 shadow-[0_1px_0_0_#1e293b] w-44 min-w-[150px] max-w-[200px] whitespace-normal break-words">
                        <div className="flex flex-col items-center">
                          <span className="text-white">{pod.name}</span>
                          <span className="text-[10px] text-slate-500 font-mono mt-1 break-all">
                            {showHost ? pod.host : '••••.••••'}
                          </span>
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredFiles.length === 0 ? (
                    <tr>
                      <td colSpan={data.pods.length + 1} className="p-8 text-center text-slate-500 text-sm">
                        Tidak ada data file yang cocok.
                      </td>
                    </tr>
                  ) : (
                    filteredFiles.map((filename, idx) => {
                      const fileInfo = data.files[filename];
                      return (
                        <tr key={filename} className={`group border-b border-slate-800 transition-colors ${idx % 2 === 0 ? 'bg-slate-900' : 'bg-slate-950'} hover:bg-slate-800`}>
                          <td className={`p-3 text-xs text-slate-300 sticky left-0 z-10 border-r border-slate-800 w-[350px] min-w-[280px] max-w-[350px] transition-colors ${idx % 2 === 0 ? 'bg-slate-900' : 'bg-slate-950'} group-hover:bg-slate-800`}>
                            <div className="flex items-start gap-2">
                              <FileAudio size={14} className={`shrink-0 mt-0.5 ${fileInfo.isMissingInSome ? 'text-amber-500' : 'text-cyan-600'}`} />
                              <span className="font-mono break-words whitespace-normal leading-relaxed" title={`Contoh Path: ${fileInfo.originalPath}`}>{filename}</span>
                            </div>
                          </td>
                          {data.pods.map(pod => {
                            const exists = fileInfo.podsPresence[pod.id];
                            return (
                              <td key={pod.id} className="p-3 text-center border-l border-slate-800/50 w-44 min-w-[150px] max-w-[200px]">
                                {exists ? (
                                  <div className="flex justify-center" title={`Path di pod ini: ${fileInfo.podsPaths[pod.id]}`}>
                                    <CheckCircle2 size={16} className="text-emerald-500 drop-shadow-[0_0_8px_rgba(16,185,129,0.3)]" />
                                  </div>
                                ) : (
                                  <div className="flex justify-center">
                                    <XCircle size={16} className="text-red-500/80 drop-shadow-[0_0_8px_rgba(239,68,68,0.3)]" />
                                  </div>
                                )}
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
