import React, { useState, useEffect } from 'react';
import {
  GitCompare,
  CheckCircle2,
  AlertTriangle,
  MinusCircle,
  PlusCircle,
  ArrowRightLeft,
  RotateCw,
  Search,
  Copy,
  Check,
  Filter
} from 'lucide-react';
import { compareEnvFilesApi } from '../../api/vpsApi';

export default function EnvComparator({ files = [] }) {
  const [sourceA, setSourceA] = useState('');
  const [sourceB, setSourceB] = useState('');
  const [diffResult, setDiffResult] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [filterMode, setFilterMode] = useState('ALL'); // 'ALL', 'DIFF_ONLY', 'ONLY_A', 'ONLY_B'
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedKey, setCopiedKey] = useState(null);

  // Set default sources if available
  useEffect(() => {
    if (files.length > 0) {
      if (!sourceA) {
        const devFile = files.find(f => f.name.includes('dev')) || files[0];
        setSourceA(devFile.name);
      }
      if (!sourceB) {
        const prodFile = files.find(f => f.name.includes('prod') || f.name.includes('release')) || (files[1] || files[0]);
        setSourceB(prodFile.name);
      }
    }
  }, [files]);

  // Trigger comparison when sources change
  useEffect(() => {
    if (sourceA && sourceB) {
      handleRunComparison();
    }
  }, [sourceA, sourceB]);

  const handleRunComparison = async () => {
    if (!sourceA || !sourceB) return;
    setIsLoading(true);
    setError(null);
    try {
      const res = await compareEnvFilesApi(sourceA, sourceB);
      setDiffResult(res);
    } catch (err) {
      setError(err.message || 'Gagal membandingkan file environment');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSwapSources = () => {
    const temp = sourceA;
    setSourceA(sourceB);
    setSourceB(temp);
  };

  const handleCopy = (text, keyId) => {
    navigator.clipboard.writeText(text || '');
    setCopiedKey(keyId);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const filteredMatrix = (diffResult?.diffMatrix || []).filter(item => {
    // Filter by mode
    if (filterMode === 'DIFF_ONLY' && item.status === 'identical') return false;
    if (filterMode === 'MISMATCH' && item.status !== 'mismatch') return false;
    if (filterMode === 'ONLY_A' && item.status !== 'only_a') return false;
    if (filterMode === 'ONLY_B' && item.status !== 'only_b') return false;

    // Filter by search query
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchKey = item.key.toLowerCase().includes(q);
      const matchValA = (item.valA || '').toLowerCase().includes(q);
      const matchValB = (item.valB || '').toLowerCase().includes(q);
      return matchKey || matchValA || matchValB;
    }
    return true;
  });

  return (
    <div className="glass-card p-5 sm:p-6 rounded-2xl border border-purple-500/30 bg-slate-950/80 backdrop-blur-md shadow-2xl flex flex-col gap-5">
      {/* Source Selection & Control Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-4 rounded-xl bg-slate-900/80 border border-slate-800">
        <div className="flex flex-wrap items-center gap-3 flex-1">
          {/* Source File A */}
          <div className="flex-1 min-w-[200px]">
            <label className="block text-[10px] font-bold text-cyan-400 uppercase tracking-wider mb-1">
              Source File A (Kiri)
            </label>
            <select
              value={sourceA}
              onChange={(e) => setSourceA(e.target.value)}
              className="w-full bg-slate-950 border border-cyan-500/40 rounded-xl px-3 py-2 text-xs font-bold text-white focus:outline-none focus:border-cyan-400 cursor-pointer"
            >
              {files.map(f => (
                <option key={f.name} value={f.name}>{f.name}</option>
              ))}
            </select>
          </div>

          {/* Swap Button */}
          <button
            onClick={handleSwapSources}
            className="p-2.5 mt-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition-colors cursor-pointer"
            title="Tukar Posisi File"
          >
            <ArrowRightLeft size={16} />
          </button>

          {/* Source File B */}
          <div className="flex-1 min-w-[200px]">
            <label className="block text-[10px] font-bold text-purple-400 uppercase tracking-wider mb-1">
              Source File B (Kanan)
            </label>
            <select
              value={sourceB}
              onChange={(e) => setSourceB(e.target.value)}
              className="w-full bg-slate-950 border border-purple-500/40 rounded-xl px-3 py-2 text-xs font-bold text-white focus:outline-none focus:border-purple-400 cursor-pointer"
            >
              {files.map(f => (
                <option key={f.name} value={f.name}>{f.name}</option>
              ))}
            </select>
          </div>
        </div>

        <button
          onClick={handleRunComparison}
          disabled={isLoading}
          className="px-4 py-2 bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-400 hover:to-indigo-400 text-white rounded-xl text-xs font-extrabold flex items-center gap-2 shadow-md shadow-purple-500/20 cursor-pointer shrink-0"
        >
          <RotateCw size={14} className={isLoading ? 'animate-spin' : ''} />
          <span>Bandingkan Ulang</span>
        </button>
      </div>

      {error && (
        <div className="p-4 bg-rose-500/15 border border-rose-500/30 rounded-xl text-xs text-rose-400 flex items-center gap-2 font-semibold">
          <AlertTriangle size={16} />
          <span>{error}</span>
        </div>
      )}

      {/* Diff Summary Cards */}
      {diffResult?.stats && (
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {/* Total Keys */}
          <div className="p-3 bg-slate-900/60 rounded-xl border border-slate-800 text-center">
            <div className="text-[10px] font-bold text-slate-400 uppercase">Total Variabel</div>
            <div className="text-xl font-extrabold text-white mt-0.5">{diffResult.stats.totalKeys}</div>
          </div>

          {/* Identical */}
          <div
            onClick={() => setFilterMode(filterMode === 'IDENTICAL' ? 'ALL' : 'IDENTICAL')}
            className={`p-3 rounded-xl border text-center cursor-pointer transition-all ${
              filterMode === 'IDENTICAL' ? 'bg-emerald-500/20 border-emerald-500' : 'bg-slate-900/60 border-slate-800 hover:border-emerald-500/40'
            }`}
          >
            <div className="text-[10px] font-bold text-emerald-400 uppercase flex items-center justify-center gap-1">
              <CheckCircle2 size={12} />
              <span>Nilai Sama</span>
            </div>
            <div className="text-xl font-extrabold text-emerald-300 mt-0.5">{diffResult.stats.identicalCount}</div>
          </div>

          {/* Value Mismatch */}
          <div
            onClick={() => setFilterMode(filterMode === 'MISMATCH' ? 'ALL' : 'MISMATCH')}
            className={`p-3 rounded-xl border text-center cursor-pointer transition-all ${
              filterMode === 'MISMATCH' ? 'bg-amber-500/20 border-amber-500' : 'bg-slate-900/60 border-slate-800 hover:border-amber-500/40'
            }`}
          >
            <div className="text-[10px] font-bold text-amber-400 uppercase flex items-center justify-center gap-1">
              <AlertTriangle size={12} />
              <span>Nilai Berbeda</span>
            </div>
            <div className="text-xl font-extrabold text-amber-300 mt-0.5">{diffResult.stats.mismatchCount}</div>
          </div>

          {/* Only in A */}
          <div
            onClick={() => setFilterMode(filterMode === 'ONLY_A' ? 'ALL' : 'ONLY_A')}
            className={`p-3 rounded-xl border text-center cursor-pointer transition-all ${
              filterMode === 'ONLY_A' ? 'bg-cyan-500/20 border-cyan-500' : 'bg-slate-900/60 border-slate-800 hover:border-cyan-500/40'
            }`}
          >
            <div className="text-[10px] font-bold text-cyan-400 uppercase flex items-center justify-center gap-1">
              <MinusCircle size={12} />
              <span>Hanya di File A</span>
            </div>
            <div className="text-xl font-extrabold text-cyan-300 mt-0.5">{diffResult.stats.onlyACount}</div>
          </div>

          {/* Only in B */}
          <div
            onClick={() => setFilterMode(filterMode === 'ONLY_B' ? 'ALL' : 'ONLY_B')}
            className={`p-3 rounded-xl border text-center cursor-pointer transition-all ${
              filterMode === 'ONLY_B' ? 'bg-purple-500/20 border-purple-500' : 'bg-slate-900/60 border-slate-800 hover:border-purple-500/40'
            }`}
          >
            <div className="text-[10px] font-bold text-purple-400 uppercase flex items-center justify-center gap-1">
              <PlusCircle size={12} />
              <span>Hanya di File B</span>
            </div>
            <div className="text-xl font-extrabold text-purple-300 mt-0.5">{diffResult.stats.onlyBCount}</div>
          </div>
        </div>
      )}

      {/* Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          <button
            onClick={() => setFilterMode('ALL')}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              filterMode === 'ALL'
                ? 'bg-purple-500/25 text-purple-300 border border-purple-500/40'
                : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            Semua ({diffResult?.diffMatrix?.length || 0})
          </button>
          <button
            onClick={() => setFilterMode('DIFF_ONLY')}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              filterMode === 'DIFF_ONLY'
                ? 'bg-amber-500/25 text-amber-300 border border-amber-500/40'
                : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            Hanya Perbedaan ({((diffResult?.stats?.mismatchCount || 0) + (diffResult?.stats?.onlyACount || 0) + (diffResult?.stats?.onlyBCount || 0))})
          </button>
          <button
            onClick={() => setFilterMode('MISMATCH')}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              filterMode === 'MISMATCH'
                ? 'bg-amber-500/25 text-amber-300 border border-amber-500/40'
                : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            Nilai Mismatch ({diffResult?.stats?.mismatchCount || 0})
          </button>
        </div>

        <div className="relative min-w-[200px]">
          <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari variabel / nilai..."
            className="w-full bg-slate-900 border border-slate-800 rounded-lg pl-8 pr-2.5 py-1 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500/50"
          />
        </div>
      </div>

      {/* Side-by-Side Diff Table */}
      <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-900/60 scrollbar-thin">
        <table className="w-full text-left text-xs font-mono">
          <thead className="bg-slate-950/80 sticky top-0 border-b border-slate-800 text-slate-400 text-[11px] uppercase tracking-wider">
            <tr>
              <th className="py-3 px-3 w-1/4">Variable Name</th>
              <th className="py-3 px-3 w-1/3 border-l border-slate-800">
                <span className="text-cyan-400">File A: {sourceA}</span>
              </th>
              <th className="py-3 px-3 w-1/3 border-l border-slate-800">
                <span className="text-purple-400">File B: {sourceB}</span>
              </th>
              <th className="py-3 px-3 w-28 text-center border-l border-slate-800">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {filteredMatrix.length === 0 ? (
              <tr>
                <td colSpan={4} className="py-12 text-center text-slate-500 italic">
                  {isLoading ? 'Memuat komparasi environment...' : 'Tidak ada perbedaan yang ditemukan pada filter ini.'}
                </td>
              </tr>
            ) : (
              filteredMatrix.map((item) => {
                const isIdentical = item.status === 'identical';
                const isMismatch = item.status === 'mismatch';
                const isOnlyA = item.status === 'only_a';
                const isOnlyB = item.status === 'only_b';

                return (
                  <tr
                    key={item.key}
                    className={`transition-colors ${
                      isMismatch
                        ? 'bg-amber-500/10 hover:bg-amber-500/15'
                        : isOnlyA
                        ? 'bg-cyan-500/10 hover:bg-cyan-500/15'
                        : isOnlyB
                        ? 'bg-purple-500/10 hover:bg-purple-500/15'
                        : 'hover:bg-slate-800/30'
                    }`}
                  >
                    {/* Variable Key */}
                    <td className="py-2.5 px-3 font-bold text-white">
                      <div className="flex items-center gap-1.5">
                        <span className="text-cyan-300">{item.key}</span>
                      </div>
                    </td>

                    {/* Value in File A */}
                    <td className="py-2.5 px-3 border-l border-slate-800 text-slate-300">
                      {item.inA ? (
                        <div className="flex items-center justify-between gap-1 group">
                          <span className={`break-all ${isMismatch ? 'text-amber-200 font-semibold' : ''}`}>
                            {item.valA || <span className="text-slate-500 italic">(kosong)</span>}
                          </span>
                          <button
                            onClick={() => handleCopy(item.valA, `${item.key}-A`)}
                            className="p-1 text-slate-500 hover:text-slate-300 rounded opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer shrink-0"
                            title="Salin nilai A"
                          >
                            {copiedKey === `${item.key}-A` ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                          </button>
                        </div>
                      ) : (
                        <span className="text-rose-400/70 italic text-[11px] flex items-center gap-1">
                          <MinusCircle size={12} /> (Tidak ada di File A)
                        </span>
                      )}
                    </td>

                    {/* Value in File B */}
                    <td className="py-2.5 px-3 border-l border-slate-800 text-slate-300">
                      {item.inB ? (
                        <div className="flex items-center justify-between gap-1 group">
                          <span className={`break-all ${isMismatch ? 'text-amber-200 font-semibold' : ''}`}>
                            {item.valB || <span className="text-slate-500 italic">(kosong)</span>}
                          </span>
                          <button
                            onClick={() => handleCopy(item.valB, `${item.key}-B`)}
                            className="p-1 text-slate-500 hover:text-slate-300 rounded opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer shrink-0"
                            title="Salin nilai B"
                          >
                            {copiedKey === `${item.key}-B` ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                          </button>
                        </div>
                      ) : (
                        <span className="text-rose-400/70 italic text-[11px] flex items-center gap-1">
                          <MinusCircle size={12} /> (Tidak ada di File B)
                        </span>
                      )}
                    </td>

                    {/* Status Badge */}
                    <td className="py-2.5 px-3 text-center border-l border-slate-800">
                      {isIdentical && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                          MATCH
                        </span>
                      )}
                      {isMismatch && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                          DIFF VALUE
                        </span>
                      )}
                      {isOnlyA && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                          ONLY IN A
                        </span>
                      )}
                      {isOnlyB && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30">
                          ONLY IN B
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
