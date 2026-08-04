import React, { useState, useEffect } from 'react';
import { Music, Video, RefreshCw, AlertTriangle, CheckCircle, FileText, Search, Folder, Volume2, Film, XCircle } from 'lucide-react';
import { validateServerSoundsApi } from '../../api/vpsApi';

const SkeletonSoundsTab = () => (
  <div className="flex flex-col gap-5">
    {/* Summary Metric Cards Skeleton */}
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3.5">
      {[1, 2, 3, 4].map(i => (
        <div key={i} className="glass-card p-4 rounded-2xl flex flex-col gap-2 border border-slate-800">
          <div className="skeleton-box w-24 h-3.5 rounded"></div>
          <div className="skeleton-box w-16 h-6 rounded-md"></div>
        </div>
      ))}
    </div>

    {/* Filter & Search Controls Skeleton */}
    <div className="flex items-center justify-between flex-wrap gap-3">
      <div className="skeleton-box w-56 h-9 rounded-xl"></div>
      <div className="skeleton-box w-64 h-9 rounded-xl"></div>
    </div>

    {/* Table Skeleton */}
    <div className="glass-card p-0 rounded-2xl overflow-hidden border border-slate-800">
      <div className="p-4 border-b border-slate-800">
        <div className="skeleton-box w-full h-5 rounded"></div>
      </div>
      {[1, 2, 3, 4, 5].map(i => (
        <div key={i} className="p-3.5 border-b border-white/5 flex justify-between items-center">
          <div className="flex flex-col gap-1.5">
            <div className="skeleton-box w-44 h-4 rounded"></div>
            <div className="skeleton-box w-28 h-3 rounded"></div>
          </div>
          <div className="skeleton-box w-22 h-6 rounded-full"></div>
        </div>
      ))}
    </div>
  </div>
);

export default function SoundsTab({ serverId }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [activeFilter, setActiveFilter] = useState('all'); // 'all' | 'missing' | 'valid' | 'extra'
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (serverId) {
      loadValidationData();
    }
  }, [serverId]);

  const loadValidationData = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const res = await validateServerSoundsApi(serverId);
      setData(res);
    } catch (err) {
      setErrorMsg(err.message || 'Gagal memvalidasi data metadata sounds & videos.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <SkeletonSoundsTab />;
  }

  if (errorMsg) {
    return (
      <div className="bg-red-500/15 border border-red-500/30 text-red-300 p-5 rounded-2xl flex flex-col gap-3">
        <div className="flex items-center gap-2.5 text-base font-bold">
          <AlertTriangle className="text-red-400" size={22} />
          <span>Gagal Memvalidasi Sound Metadata</span>
        </div>
        <p className="text-xs text-slate-400">{errorMsg}</p>
        <button
          onClick={loadValidationData}
          className="w-fit px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer mt-1"
        >
          <RefreshCw size={14} /> Coba Lagi
        </button>
      </div>
    );
  }

  const summary = data?.summary || {
    totalMetadataItems: 0,
    totalExpectedFiles: 0,
    totalMissingFiles: 0,
    totalValidFiles: 0,
    totalUnreferencedSounds: 0,
    totalUnreferencedVideos: 0,
    physicalSoundsCount: 0,
    physicalVideosCount: 0
  };

  const items = data?.items || [];
  const missingFiles = data?.missingFiles || [];
  const unreferencedSounds = data?.unreferencedSounds || [];
  const unreferencedVideos = data?.unreferencedVideos || [];

  // Filter items based on activeFilter & searchQuery
  const filteredItems = items.filter(item => {
    // Search query filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const titleMatch = (item.display || item.description || '').toLowerCase().includes(q);
      const idMatch = String(item.id || '').toLowerCase().includes(q);
      const typeMatch = (item.type || '').toLowerCase().includes(q);
      const sessionMatch = (item.session || '').toLowerCase().includes(q);
      const fileMatch = (item.__files || []).some(f => f.filename.toLowerCase().includes(q));

      if (!titleMatch && !idMatch && !typeMatch && !sessionMatch && !fileMatch) {
        return false;
      }
    }

    if (activeFilter === 'missing') return item.__hasMissing;
    if (activeFilter === 'valid') return !item.__hasMissing && item.__files.length > 0;
    return true; // 'all'
  });

  return (
    <div className="flex flex-col gap-5">

      {/* Top Controls Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2.5">
          <Music className="text-cyan-400" size={24} />
          <div>
            <h3 className="text-lg font-bold text-white">
              Sound & Video Metadata Validator
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Memvalidasi keberadaan file audio (<code>/home/pod/sounds/</code>) & video (<code>/home/pod/videos/</code>) dari <code>metadata.json</code>
            </p>
          </div>
        </div>

        <button
          onClick={loadValidationData}
          className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-semibold flex items-center gap-2 transition-colors cursor-pointer"
          title="Muat Ulang Validasi Metadata"
        >
          <RefreshCw size={15} />
          <span>Refresh Metadata</span>
        </button>
      </div>

      {/* Summary Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3.5">

        {/* Card 1: Total Items in JSON */}
        <div className="glass-card p-4 rounded-2xl border border-slate-800 bg-slate-900/60">
          <span className="text-xs text-slate-400 flex items-center gap-1.5">
            <FileText size={15} className="text-cyan-400" /> Total Item Metadata
          </span>
          <div className="font-mono text-2xl font-bold text-white mt-1.5">
            {summary.totalMetadataItems} <span className="text-xs text-slate-500 font-normal">Item</span>
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            {summary.totalExpectedFiles} berkas terdaftar
          </div>
        </div>

        {/* Card 2: Missing Files (Red Alert) */}
        <div
          onClick={() => setActiveFilter('missing')}
          className={`glass-card p-4 rounded-2xl border cursor-pointer transition-all ${summary.totalMissingFiles > 0
            ? 'bg-red-500/10 border-red-500/40 shadow-md shadow-red-500/10'
            : 'bg-slate-900/60 border-slate-800'
            }`}
        >
          <span className={`text-xs font-semibold flex items-center gap-1.5 ${summary.totalMissingFiles > 0 ? 'text-red-400' : 'text-slate-400'}`}>
            <XCircle size={15} className={summary.totalMissingFiles > 0 ? 'text-red-400' : 'text-slate-400'} /> Missing Files (Hilang)
          </span>
          <div className={`font-mono text-2xl font-bold mt-1.5 ${summary.totalMissingFiles > 0 ? 'text-red-400' : 'text-white'}`}>
            {summary.totalMissingFiles} <span className="text-xs font-normal">Berkas</span>
          </div>
          <div className={`text-[11px] mt-1 ${summary.totalMissingFiles > 0 ? 'text-red-300' : 'text-slate-400'}`}>
            {summary.totalMissingFiles > 0 ? 'Memerlukan Upload File' : 'Semua file fisik lengkap'}
          </div>
        </div>

        {/* Card 3: Valid Files (Green) */}
        <div
          onClick={() => setActiveFilter('valid')}
          className="glass-card p-4 rounded-2xl border border-emerald-500/30 bg-emerald-500/5 cursor-pointer transition-all"
        >
          <span className="text-xs font-semibold text-emerald-400 flex items-center gap-1.5">
            <CheckCircle size={15} className="text-emerald-400" /> Valid Files (Tersedia)
          </span>
          <div className="font-mono text-2xl font-bold text-emerald-400 mt-1.5">
            {summary.totalValidFiles} <span className="text-xs font-normal">Berkas</span>
          </div>
          <div className="text-[11px] text-emerald-300 mt-1">
            Siap diputar di server POD
          </div>
        </div>

        {/* Card 4: Folder Extra Files */}
        <div
          onClick={() => setActiveFilter('extra')}
          className="glass-card p-4 rounded-2xl border border-slate-800 bg-slate-900/60 cursor-pointer transition-all"
        >
          <span className="text-xs font-medium text-slate-400 flex items-center gap-1.5">
            <Folder size={15} className="text-amber-400" /> Extra Files (Di Server)
          </span>
          <div className="font-mono text-2xl font-bold text-amber-400 mt-1.5">
            {summary.totalUnreferencedSounds + summary.totalUnreferencedVideos} <span className="text-xs font-normal">Berkas</span>
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            {summary.physicalSoundsCount} Sounds | {summary.physicalVideosCount} Videos
          </div>
        </div>

      </div>

      {/* Filter Tabs & Search Bar */}
      <div className="flex items-center justify-between flex-wrap gap-3">

        {/* Filter Buttons */}
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setActiveFilter('all')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${activeFilter === 'all'
              ? 'bg-cyan-500/15 border-cyan-400 text-cyan-400'
              : 'bg-white/5 border-slate-800 text-slate-400 hover:text-slate-200'
              }`}
          >
            Semua Metadata ({items.length})
          </button>

          <button
            onClick={() => setActiveFilter('missing')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${activeFilter === 'missing'
              ? 'bg-red-500/20 border-red-500 text-red-300'
              : 'bg-white/5 border-slate-800 text-slate-400 hover:text-slate-200'
              }`}
          >
            Missing Files ({summary.totalMissingFiles})
          </button>

          <button
            onClick={() => setActiveFilter('valid')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${activeFilter === 'valid'
              ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300'
              : 'bg-white/5 border-slate-800 text-slate-400 hover:text-slate-200'
              }`}
          >
            Valid Files ({summary.totalValidFiles})
          </button>

          <button
            onClick={() => setActiveFilter('extra')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${activeFilter === 'extra'
              ? 'bg-amber-500/20 border-amber-500 text-amber-300'
              : 'bg-white/5 border-slate-800 text-slate-400 hover:text-slate-200'
              }`}
          >
            Physical Files di Server
          </button>
        </div>

        {/* Search Input Box */}
        {activeFilter !== 'extra' && (
          <div className="relative w-64">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              placeholder="Cari judul, ID, atau nama file..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-black/40 border border-slate-800 focus:border-cyan-400 rounded-xl text-white text-xs outline-none transition-colors"
            />
          </div>
        )}

      </div>

      {/* Content Display Mode 1: Physical Files Mode */}
      {activeFilter === 'extra' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

          {/* Sounds Folder List */}
          <div className="glass-card p-5 rounded-2xl border border-slate-800">
            <div className="flex items-center gap-2 mb-3">
              <Volume2 className="text-cyan-400" size={18} />
              <h4 className="text-sm font-bold text-white">
                Folder Audio (<code>/home/pod/sounds/</code>)
              </h4>
            </div>
            <div className="text-xs text-slate-400 mb-3">
              Daftar file di folder sounds yang <strong>tidak terdaftar</strong> di <code>metadata.json</code>:
            </div>
            <div className="max-h-72 overflow-y-auto flex flex-col gap-1.5 pr-1">
              {unreferencedSounds.length === 0 ? (
                <div className="text-xs text-slate-500 italic">
                  Tidak ada file audio ekstra (semua file audio terdaftar di JSON).
                </div>
              ) : (
                unreferencedSounds.map((file, idx) => (
                  <div key={idx} className="font-mono text-xs px-2.5 py-1.5 bg-white/5 rounded-lg border border-white/5 text-amber-400">
                    {file}
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Videos Folder List */}
          <div className="glass-card p-5 rounded-2xl border border-slate-800">
            <div className="flex items-center gap-2 mb-3">
              <Film className="text-purple-400" size={18} />
              <h4 className="text-sm font-bold text-white">
                Folder Video (<code>/home/pod/videos/</code>)
              </h4>
            </div>
            <div className="text-xs text-slate-400 mb-3">
              Daftar file di folder videos yang <strong>tidak terdaftar</strong> di <code>metadata.json</code>:
            </div>
            <div className="max-h-72 overflow-y-auto flex flex-col gap-1.5 pr-1">
              {unreferencedVideos.length === 0 ? (
                <div className="text-xs text-slate-500 italic">
                  Tidak ada file video ekstra (semua file video terdaftar di JSON).
                </div>
              ) : (
                unreferencedVideos.map((file, idx) => (
                  <div key={idx} className="font-mono text-xs px-2.5 py-1.5 bg-white/5 rounded-lg border border-white/5 text-purple-400">
                    {file}
                  </div>
                ))
              )}
            </div>
          </div>

        </div>
      ) : (
        /* Content Display Mode 2: Metadata Items Table Mode */
        <div className="glass-card p-0 rounded-2xl overflow-hidden border border-slate-800">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-xs">
              <thead>
                <tr className="bg-black/40 border-b border-slate-800 text-left text-slate-400">
                  <th className="p-3">Item Metadata</th>
                  <th className="p-3">Kategori / Session</th>
                  <th className="p-3">File Terdaftar & Status Keberadaan</th>
                  <th className="p-3 text-right">Status Item</th>
                </tr>
              </thead>
              <tbody>
                {filteredItems.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="p-8 text-center text-slate-400 text-xs">
                      Tidak ditemukan data metadata yang sesuai dengan filter/pencarian.
                    </td>
                  </tr>
                ) : (
                  filteredItems.map((item, idx) => {
                    const itemTitle = item.display || item.description || item.id || `Item #${idx + 1}`;
                    const files = item.__files || [];
                    const hasMissing = item.__hasMissing;

                    return (
                      <tr key={idx} className={`border-b border-white/5 hover:bg-white/[0.02] ${hasMissing ? 'bg-red-500/[0.03]' : ''}`}>

                        {/* Title & ID */}
                        <td className="p-3.5">
                          <div className="font-bold text-white">{itemTitle}</div>
                          <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                            ID: {item.id} {item.duration ? `| Duration: ${item.duration}ms` : ''}
                          </div>
                        </td>

                        {/* Type & Session */}
                        <td className="p-3.5">
                          <div className="text-xs text-cyan-400 font-semibold">
                            {item.type || 'Standard'}
                          </div>
                          <div className="text-[11px] text-slate-400 mt-0.5">
                            {item.session || '-'}
                          </div>
                        </td>

                        {/* Listed File Statuses */}
                        <td className="p-3.5">
                          <div className="flex flex-col gap-1.5">
                            {files.length === 0 ? (
                              <span className="text-[11px] text-slate-500 italic">
                                (Tidak ada nama file pada item ini)
                              </span>
                            ) : (
                              files.map((fileObj, fIdx) => (
                                <div key={fIdx} className="flex items-center gap-2 flex-wrap">
                                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${fileObj.category === 'video' ? 'bg-purple-500/20 text-purple-300' : 'bg-cyan-500/20 text-cyan-300'
                                    }`}>
                                    {fileObj.category === 'video' ? 'VIDEO' : 'AUDIO'}
                                  </span>

                                  <span className={`font-mono text-xs ${fileObj.exists ? 'text-slate-100' : 'text-red-300'}`}>
                                    {fileObj.filename}
                                  </span>

                                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${fileObj.exists
                                    ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                                    : 'bg-red-500/20 text-red-400 border-red-500/40'
                                    }`}>
                                    {fileObj.exists ? `ADA (${fileObj.foundPath})` : `MISSING in ${fileObj.targetFolder}`}
                                  </span>
                                </div>
                              ))
                            )}
                          </div>
                        </td>

                        {/* Overall Item Status */}
                        <td className="p-3.5 text-right">
                          <span className={`inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1 rounded-full border ${hasMissing
                            ? 'bg-red-500/15 text-red-400 border-red-500/30'
                            : 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                            }`}>
                            {hasMissing ? 'File Incomplete' : 'Complete'}
                          </span>
                        </td>

                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

    </div>
  );
}
