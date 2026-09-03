import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  FileJson,
  RefreshCw,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Filter,
  Search,
  Eye,
  EyeOff
} from 'lucide-react';
import { fetchCompareMetadataApi } from '../api/vpsApi';
import MetadataSkeletonTable from '../components/common/MetadataSkeletonTable';

export default function MetadataComparisonPage({ onBack }) {
  const [podVersion, setPodVersion] = useState('v3'); // Default to v3
  const [isLoading, setIsLoading] = useState(false);
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  const [showOnlyMismatch, setShowOnlyMismatch] = useState(false);
  const [hideSessionAny, setHideSessionAny] = useState(false);
  const [showHost, setShowHost] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const loadData = async () => {
    setIsLoading(true);
    setError('');
    setData(null);
    try {
      const res = await fetchCompareMetadataApi(podVersion);
      setData(res);
    } catch (err) {
      setError(err.message || 'Gagal memuat perbandingan data metadata');
    } finally {
      setIsLoading(false);
    }
  };

  // Initially load data
  useEffect(() => {
    loadData();
  }, [podVersion]);

  // Derived data
  const keysList = data ? Object.keys(data.metadataMatrix).sort() : [];

  const filteredKeys = keysList.filter(key => {
    const itemInfo = data.metadataMatrix[key];
    // Filter by mismatch
    if (showOnlyMismatch && !itemInfo.isMismatch && !itemInfo.isMissingInSome) {
      return false;
    }
    // Filter out session 'Any'
    if (hideSessionAny && itemInfo.session.toLowerCase() === 'any') {
      return false;
    }
    // Filter by search
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      if (!itemInfo.session.toLowerCase().includes(query) && !String(itemInfo.id).toLowerCase().includes(query)) {
        return false;
      }
    }
    return true;
  });

  const mismatchCount = data ? Object.values(data.metadataMatrix).filter(f => f.isMismatch || f.isMissingInSome).length : 0;
  const consistentCount = data ? data.totalItems - mismatchCount : 0;

  return (
    <div className="min-h-screen text-slate-100 pb-16">
      {/* Top Page Header */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-purple-500/20 pb-5">
        <div className="flex items-center gap-3.5">
          <button
            onClick={onBack}
            className="p-2.5 bg-slate-900 hover:bg-slate-800 text-purple-400 rounded-xl border border-purple-500/30 transition-all cursor-pointer shadow-lg shadow-purple-500/5 flex items-center gap-1.5 text-xs font-bold"
          >
            <ArrowLeft size={16} />
            <span>Kembali</span>
          </button>
          <div>
            <div className="flex items-center gap-2.5">
              <div className="bg-purple-500/20 p-2 rounded-xl border border-purple-500/40">
                <FileJson className="text-purple-400 w-5 h-5" />
              </div>
              <h1 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">
                Perbandingan Metadata JSON
              </h1>
            </div>
            <p className="text-slate-400 text-xs mt-1">
              Cek konsistensi filepath dalam metadata.json berdasarkan Session & ID lintas POD.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <select
            value={podVersion}
            onChange={(e) => setPodVersion(e.target.value)}
            className="bg-slate-950 text-purple-300 border border-slate-800 rounded-xl px-3 py-2 text-xs font-bold outline-none focus:border-purple-500 cursor-pointer"
          >
            <option value="all">Semua Versi Pod</option>
            <option value="v3">Pod Versi 3 (Flat)</option>
            <option value="v2">Pod Versi 2 (Subfolders)</option>
          </select>

          <button
            onClick={loadData}
            disabled={isLoading}
            className="bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-purple-400 px-4 py-2 rounded-xl text-xs font-bold border border-purple-500/30 flex items-center gap-2 cursor-pointer transition-all"
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

      {isLoading && <MetadataSkeletonTable />}

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
            <div className="bg-slate-900/80 border border-purple-500/30 rounded-2xl p-4 text-center">
              <span className="text-purple-400 text-xs block mb-1">Total Session + ID Unik</span>
              <span className="text-2xl font-extrabold text-purple-400">
                {data.totalItems}
              </span>
            </div>
            <div className="bg-slate-900/80 border border-emerald-500/30 rounded-2xl p-4 text-center">
              <span className="text-emerald-400 text-xs block mb-1">Konsisten di Semua Pod</span>
              <span className="text-2xl font-extrabold text-emerald-400">
                {consistentCount}
              </span>
            </div>
            <div className="bg-slate-900/80 border border-amber-500/30 rounded-2xl p-4 text-center">
              <span className="text-amber-400 text-xs block mb-1">Filepath Berbeda / Hilang</span>
              <span className="text-2xl font-extrabold text-amber-400">
                {mismatchCount}
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
          <div className="bg-slate-900/90 border border-purple-500/30 rounded-2xl shadow-xl overflow-hidden">
            {/* Table Toolbar */}
            <div className="p-4 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-950/50">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Cari session atau id..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="bg-slate-900 border border-slate-700 text-slate-200 text-xs px-3 py-2 pl-9 rounded-lg outline-none focus:border-purple-500 w-full sm:w-64"
                />
                <Search size={14} className="absolute left-3 top-2.5 text-slate-500" />
              </div>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setShowHost(!showHost)}
                  className="flex items-center gap-2 text-xs font-bold text-slate-300 cursor-pointer hover:text-white transition-colors bg-slate-900 px-3 py-2 rounded-lg border border-slate-700"
                  title={showHost ? "Sembunyikan IP Host" : "Tampilkan IP Host"}
                >
                  {showHost ? <EyeOff size={14} className="text-purple-400" /> : <Eye size={14} className="text-slate-500" />}
                  <span className={showHost ? 'text-purple-400' : ''}>
                    {showHost ? 'Sembunyikan IP' : 'Tampilkan IP'}
                  </span>
                </button>

                <label className="flex items-center gap-2 text-xs font-bold text-slate-300 cursor-pointer hover:text-white transition-colors bg-slate-900 px-3 py-2 rounded-lg border border-slate-700">
                  <Filter size={14} className={hideSessionAny ? 'text-purple-400' : 'text-slate-500'} />
                  <input
                    type="checkbox"
                    checked={hideSessionAny}
                    onChange={(e) => setHideSessionAny(e.target.checked)}
                    className="rounded border-slate-600 text-purple-500 focus:ring-0 cursor-pointer hidden"
                  />
                  <span className={hideSessionAny ? 'text-purple-400' : ''}>
                    Sembunyikan Session "Any"
                  </span>
                </label>
                <label className="flex items-center gap-2 text-xs font-bold text-slate-300 cursor-pointer hover:text-white transition-colors bg-slate-900 px-3 py-2 rounded-lg border border-slate-700">
                  <Filter size={14} className={showOnlyMismatch ? 'text-amber-400' : 'text-slate-500'} />
                  <input
                    type="checkbox"
                    checked={showOnlyMismatch}
                    onChange={(e) => setShowOnlyMismatch(e.target.checked)}
                    className="rounded border-slate-600 text-purple-500 focus:ring-0 cursor-pointer hidden"
                  />
                  <span className={showOnlyMismatch ? 'text-amber-400' : ''}>
                    Hanya Tampilkan Yang Berbeda/Hilang
                  </span>
                </label>
              </div>
            </div>

            {/* Table Container */}
            <div className="overflow-auto max-h-[70vh]">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-950">
                    <th className="p-4 text-xs font-bold text-purple-400 sticky top-0 left-0 bg-slate-950 z-30 w-[220px] min-w-[220px] max-w-[220px] whitespace-nowrap border-b border-slate-800 shadow-[1px_1px_0_0_#1e293b]">
                      Session & ID
                    </th>
                    {data.pods.map(pod => (
                      <th key={pod.id} className="p-4 text-xs font-bold text-slate-300 sticky top-0 bg-slate-950 z-20 border-b border-l border-slate-800 shadow-[0_1px_0_0_#1e293b] w-[350px] min-w-[280px] whitespace-normal break-words">
                        <div className="flex flex-col items-start">
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
                  {filteredKeys.length === 0 ? (
                    <tr>
                      <td colSpan={data.pods.length + 1} className="p-8 text-center text-slate-500 text-sm">
                        Tidak ada data metadata yang cocok.
                      </td>
                    </tr>
                  ) : (
                    filteredKeys.map((key, idx) => {
                      const itemInfo = data.metadataMatrix[key];
                      const isWarning = itemInfo.isMismatch || itemInfo.isMissingInSome;

                      return (
                        <tr key={key} className={`group border-b border-slate-800 transition-colors ${idx % 2 === 0 ? 'bg-slate-900' : 'bg-slate-950'} hover:bg-slate-800`}>
                          <td className={`p-3 text-xs text-slate-300 sticky left-0 z-10 border-r border-slate-800 align-top w-[220px] min-w-[220px] max-w-[220px] transition-colors ${idx % 2 === 0 ? 'bg-slate-900' : 'bg-slate-950'} group-hover:bg-slate-800`}>
                            <div className="flex flex-col gap-1">
                              <div className="flex items-center gap-1.5">
                                <FileJson size={14} className={isWarning ? 'text-amber-500' : 'text-purple-500'} />
                                <span className="font-bold text-white">{itemInfo.session}</span>
                              </div>
                              <span className="text-[10px] text-slate-400 font-mono bg-black/40 px-1.5 py-0.5 rounded border border-slate-700 w-max">
                                ID: {itemInfo.id}
                              </span>
                            </div>
                          </td>
                          {data.pods.map(pod => {
                            const exists = itemInfo.podsPresence[pod.id];
                            const filepath = itemInfo.podsFilepaths[pod.id];

                            return (
                              <td key={pod.id} className="p-3 border-l border-slate-800/50 align-top text-[11px] font-mono break-all w-[350px] min-w-[280px]">
                                {exists ? (
                                  <div className={`p-1.5 rounded border ${isWarning ? 'bg-amber-500/10 border-amber-500/30 text-amber-300' : 'bg-slate-950 border-slate-800 text-slate-300'}`}>
                                    {filepath ? filepath : <span className="text-slate-500 italic">No Filepath</span>}
                                  </div>
                                ) : (
                                  <div className="flex items-center gap-1 text-red-400/80 p-1.5">
                                    <XCircle size={14} />
                                    <span>Missing / Not Found</span>
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
