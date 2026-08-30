import React, { useState, useEffect, useMemo } from 'react';
import {
  RefreshCw,
  Search,
  Download,
  CheckCircle2,
  AlertTriangle,
  Server,
  HardDrive,
  Eye,
  Trash2,
  Sparkles,
  Layers,
  Image as ImageIcon,
  Film,
  Cloud,
  Check,
  X,
  Stethoscope,
  ChevronDown,
  ChevronRight,
  Filter,
  ExternalLink,
  ShieldCheck,
  AlertCircle
} from 'lucide-react';
import {
  getFlowEditorFilesApi,
  checkFlowEditorPodsApi,
  downloadFlowFilesToPodApi,
  downloadFlowFilesToBatchPodsApi,
  deleteFlowFileFromPodApi,
  getPodFileStreamUrl
} from '../../api/vpsApi';
import MediaPreviewModal from '../content/MediaPreviewModal';
import FileIntegrityModal from '../content/FileIntegrityModal';

export default function FlowEditorStorageView({
  pods = [],
  downloadProgressMap = {},
  onCheckIntegrity,
  viewMode: propViewMode,
  onSwitchViewMode
}) {
  // Data state
  const [isLoading, setIsLoading] = useState(true);
  const [flowData, setFlowData] = useState({ summary: {}, files: [] });
  const [podsStatus, setPodsStatus] = useState({});
  const [isCheckingPods, setIsCheckingPods] = useState(false);
  const [checkingPodId, setCheckingPodId] = useState(null);

  // Internal view mode fallback if not controlled by parent
  const [internalViewMode, setInternalViewMode] = useState('pods');
  const viewMode = propViewMode || internalViewMode;

  const handleSetViewMode = (mode) => {
    if (onSwitchViewMode) {
      onSwitchViewMode(mode);
    } else {
      setInternalViewMode(mode);
    }
  };

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('all'); // 'all' | 'image' | 'video'
  const [placementFilter, setPlacementFilter] = useState('all'); // 'all' | 'logo' | 'background' | 'video'
  const [podStatusFilter, setPodStatusFilter] = useState('all'); // 'all' | 'missing' | 'complete'

  // Expanded POD cards in 'pods' view
  const [expandedPods, setExpandedPods] = useState({});

  // Local actions loading state
  const [actionLoading, setActionLoading] = useState({});

  // Modals state
  const [previewModal, setPreviewModal] = useState({ isOpen: false, file: null });
  const [integrityModal, setIntegrityModal] = useState({ isOpen: false, data: null, isLoading: false });

  // 1. Fetch initial files & cross-check PODs
  const loadData = async () => {
    setIsLoading(true);
    try {
      const data = await getFlowEditorFilesApi();
      setFlowData(data || { summary: {}, files: [] });
      await checkPods(data?.files || []);
    } catch (err) {
      console.error('Error loading flow editor files:', err.message);
      alert(`Gagal memuat data Flow Editor: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const checkPods = async (filesToCheck = null) => {
    setIsCheckingPods(true);
    try {
      const results = await checkFlowEditorPodsApi();
      setPodsStatus(results || {});
    } catch (err) {
      console.error('Error checking pods for flow files:', err.message);
    } finally {
      setIsCheckingPods(false);
    }
  };

  const checkSinglePod = async (serverId) => {
    setCheckingPodId(serverId);
    try {
      const results = await checkFlowEditorPodsApi([serverId]);
      if (results && results[serverId]) {
        setPodsStatus(prev => ({
          ...prev,
          [serverId]: results[serverId]
        }));
      }
    } catch (err) {
      alert(`Gagal memeriksa POD #${serverId}: ${err.message}`);
    } finally {
      setCheckingPodId(null);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // 2. Download handlers
  const handleDownloadSingleFile = async (pod, filename) => {
    const serverId = pod.serverId || pod.id;
    const actionKey = `dl_${serverId}_${filename}`;
    setActionLoading(prev => ({ ...prev, [actionKey]: true }));

    try {
      await downloadFlowFilesToPodApi(serverId, [filename]);
    } catch (err) {
      alert(`Gagal memulai download file: ${err.message}`);
      setActionLoading(prev => ({ ...prev, [actionKey]: false }));
    }
  };

  const handleDownloadAllMissingForPod = async (pod, missingList) => {
    const serverId = pod.serverId || pod.id;
    if (!missingList || missingList.length === 0) return;
    const filenames = missingList.map(f => f.filename);
    const actionKey = `dl_all_${serverId}`;
    setActionLoading(prev => ({ ...prev, [actionKey]: true }));

    try {
      await downloadFlowFilesToPodApi(serverId, filenames);
    } catch (err) {
      alert(`Gagal mendownload file yang hilang ke ${pod.serverName}: ${err.message}`);
      setActionLoading(prev => ({ ...prev, [actionKey]: false }));
    }
  };

  const handleDownloadMissingToAllPods = async () => {
    const onlinePods = pods.filter(p => podsStatus[p.serverId]?.missingCount > 0);
    if (onlinePods.length === 0) {
      alert('Semua POD online sudah memiliki seluruh file Flow Editor!');
      return;
    }

    const serverIds = onlinePods.map(p => p.serverId);
    const allMissingNames = new Set();
    onlinePods.forEach(p => {
      const check = podsStatus[p.serverId];
      check?.missingFiles?.forEach(m => allMissingNames.add(m.filename));
    });

    const filenames = Array.from(allMissingNames);
    if (filenames.length === 0) return;

    setActionLoading(prev => ({ ...prev, dl_fleet: true }));
    try {
      await downloadFlowFilesToBatchPodsApi(serverIds, filenames);
    } catch (err) {
      alert(`Gagal memulai download massal: ${err.message}`);
      setActionLoading(prev => ({ ...prev, dl_fleet: false }));
    }
  };

  // 3. Delete from POD
  const handleDeleteFromPod = async (pod, filename, folderType) => {
    const serverId = pod.serverId || pod.id;
    if (!confirm(`Yakin ingin menghapus fisik "${filename}" dari ${pod.serverName}?`)) return;

    const actionKey = `del_${serverId}_${filename}`;
    setActionLoading(prev => ({ ...prev, [actionKey]: true }));
    try {
      await deleteFlowFileFromPodApi(serverId, filename, folderType);
      await checkSinglePod(serverId);
    } catch (err) {
      alert(`Gagal menghapus file dari POD: ${err.message}`);
    } finally {
      setActionLoading(prev => ({ ...prev, [actionKey]: false }));
    }
  };

  // 4. Toggle POD accordion
  const togglePodExpanded = (serverId) => {
    setExpandedPods(prev => ({
      ...prev,
      [serverId]: !prev[serverId]
    }));
  };

  // Fast lookup map from flowData.files by lowercase filename
  const fileMetaMap = useMemo(() => {
    const map = new Map();
    (flowData.files || []).forEach(f => {
      if (f.filename) map.set(f.filename.toLowerCase(), f);
    });
    return map;
  }, [flowData.files]);

  // Helper to check if a file item matches current search and filters
  const matchesFileItem = (item) => {
    if (!item) return false;
    const fn = (item.filename || '').trim();
    const meta = fileMetaMap.get(fn.toLowerCase()) || {};
    const cat = meta.category || (item.folderType === 'videos' ? 'video' : 'image');
    const plc = meta.placement || item.placement || 'general';

    if (typeFilter !== 'all' && cat !== typeFilter) return false;
    if (placementFilter !== 'all' && plc !== placementFilter) return false;

    const q = searchQuery.trim().toLowerCase();
    if (q) {
      const matchName = fn.toLowerCase().includes(q);
      const matchPlc = plc.toLowerCase().includes(q);
      return matchName || matchPlc;
    }
    return true;
  };

  // 5. Filter files for Catalog view
  const filteredFiles = (flowData.files || []).filter(matchesFileItem);

  const summary = flowData.summary || {};
  const placementList = Object.keys(summary.placementCounts || {});

  // Compute fleet readiness
  const podCount = pods.length;
  let completePodsCount = 0;
  let partialPodsCount = 0;
  let totalMissingAcrossFleet = 0;

  pods.forEach(p => {
    const status = podsStatus[p.serverId];
    if (status?.fileStatus === 'all') completePodsCount++;
    else if (status?.fileStatus === 'partial') {
      partialPodsCount++;
      totalMissingAcrossFleet += status.missingCount || 0;
    }
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* 1. Header & Summary Hero */}
      <div className={`border rounded-3xl p-5 sm:p-6 shadow-xl relative overflow-hidden ${
        viewMode === 'pods'
          ? 'bg-slate-950/80 border-indigo-500/20'
          : 'bg-slate-950/80 border-purple-500/20'
      }`}>
        <div className={`absolute top-0 right-0 w-96 h-96 rounded-full blur-3xl pointer-events-none ${
          viewMode === 'pods' ? 'bg-indigo-500/5' : 'bg-purple-500/5'
        }`} />

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5 relative z-10">
          <div className="flex items-start gap-4">
            <div className={`p-3 border rounded-2xl shadow-md ${
              viewMode === 'pods'
                ? 'bg-gradient-to-br from-indigo-500/20 to-blue-500/20 border-indigo-500/40 text-indigo-300'
                : 'bg-gradient-to-br from-purple-500/20 to-pink-500/20 border-purple-500/40 text-purple-300'
            }`}>
              {viewMode === 'pods' ? <Server size={26} /> : <Layers size={26} />}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-xl font-black text-white tracking-tight">
                  {viewMode === 'pods' ? 'Unit POD Flow Editor' : 'Katalog File Flow Editor'}
                </h2>
                <span className="text-[10px] font-mono px-2.5 py-0.5 rounded-full bg-purple-500/15 text-purple-300 border border-purple-500/30 font-bold">
                  Master RDS: fileFlowEditor
                </span>
                <span className="text-[10px] font-mono px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                  S3: images/
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1 max-w-2xl leading-relaxed">
                {viewMode === 'pods'
                  ? 'Pantau kesiapan file Logo, Background, & Video pada armada POD V3, unduh file yang hilang, dan jalankan uji integritas ffprobe.'
                  : 'Kelola dan pratinjau 49 file Flow Editor yang terdaftar di database Master RDS dan tersimpan di AWS S3 images/.'}
              </p>
            </div>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex items-center gap-2.5 flex-wrap">
            {/* View Switcher Button */}
            {viewMode === 'pods' ? (
              <button
                onClick={() => handleSetViewMode('files')}
                className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-purple-300 hover:text-white rounded-xl border border-purple-500/30 text-xs font-bold flex items-center gap-2 cursor-pointer transition-colors shadow-sm"
                title="Beralih ke Katalog Seluruh File S3"
              >
                <Layers size={14} />
                <span>Lihat Katalog File ({flowData.files?.length || 0}) &rarr;</span>
              </button>
            ) : (
              <button
                onClick={() => handleSetViewMode('pods')}
                className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-indigo-300 hover:text-white rounded-xl border border-indigo-500/30 text-xs font-bold flex items-center gap-2 cursor-pointer transition-colors shadow-sm"
                title="Beralih ke Status Armada Unit POD"
              >
                <Server size={14} />
                <span>&larr; Kelola di Unit POD ({pods.length})</span>
              </button>
            )}

            <button
              onClick={() => checkPods()}
              disabled={isCheckingPods}
              className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white rounded-xl border border-slate-800 text-xs font-bold flex items-center gap-2 cursor-pointer transition-colors shadow-sm"
              title="Pindai Ulang Seluruh POD"
            >
              <RefreshCw size={14} className={isCheckingPods ? 'animate-spin text-purple-400' : ''} />
              <span>{isCheckingPods ? 'Memindai...' : 'Pindai Ulang POD'}</span>
            </button>

            {totalMissingAcrossFleet > 0 && viewMode === 'pods' && (
              <button
                onClick={handleDownloadMissingToAllPods}
                disabled={actionLoading.dl_fleet}
                className="px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-xl text-xs font-bold flex items-center gap-2 cursor-pointer transition-all shadow-md shadow-purple-950/50"
                title="Download semua file yang masih belum ada ke seluruh POD"
              >
                {actionLoading.dl_fleet ? (
                  <RefreshCw size={14} className="animate-spin" />
                ) : (
                  <Download size={14} />
                )}
                <span>Download Semua ({totalMissingAcrossFleet} File)</span>
              </button>
            )}
          </div>
        </div>

        {/* 4 Summary Metric Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5 pt-5 border-t border-slate-800/80">
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-3.5 flex flex-col justify-between">
            <span className="text-[11px] text-slate-400 flex items-center gap-1.5">
              <Layers size={13} className="text-purple-400" /> Total di Master DB
            </span>
            <div className="mt-1">
              <div className="text-xl font-mono font-black text-white">
                {summary.totalFiles || 0} <span className="text-xs font-normal text-slate-400">File</span>
              </div>
              <span className="text-[10px] text-slate-400 mt-0.5 block">
                {summary.imageCount || 0} Gambar &bull; {summary.videoCount || 0} Video
              </span>
            </div>
          </div>

          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-3.5 flex flex-col justify-between">
            <span className="text-[11px] text-slate-400 flex items-center gap-1.5">
              <Cloud size={13} className="text-rose-400" /> Tersimpan di S3
            </span>
            <div className="mt-1">
              <div className="text-xl font-mono font-black text-white">
                {summary.s3ExistsCount || 0} / {summary.totalFiles || 0}
              </div>
              <span className="text-[10px] text-emerald-400 font-mono mt-0.5 block">
                {summary.totalS3Formatted || '0 B'} di images/
              </span>
            </div>
          </div>

          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-3.5 flex flex-col justify-between">
            <span className="text-[11px] text-slate-400 flex items-center gap-1.5">
              <Server size={13} className="text-cyan-400" /> Kesiapan Armada POD
            </span>
            <div className="mt-1">
              <div className="text-xl font-mono font-black text-white">
                {completePodsCount} <span className="text-xs font-normal text-slate-400">/ {podCount} Lengkap</span>
              </div>
              <span className="text-[10px] text-amber-300/90 font-mono mt-0.5 block">
                {partialPodsCount} Unit Perlu Disinkronkan
              </span>
            </div>
          </div>

          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-3.5 flex flex-col justify-between">
            <span className="text-[11px] text-slate-400 flex items-center gap-1.5">
              <HardDrive size={13} className="text-emerald-400" /> Path Target di POD
            </span>
            <div className="mt-1">
              <div className="text-xs font-mono font-bold text-white">/home/pod/images</div>
              <div className="text-xs font-mono font-bold text-slate-400 mt-0.5">/home/pod/videos</div>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Controls & Filter Bar */}
      <div className="bg-slate-950/90 border border-slate-800 rounded-2xl p-3.5 shadow-md flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Left: Indicator of active view */}
        <div className="flex items-center gap-2">
          <span className={`text-xs font-black uppercase tracking-wider px-3 py-1.5 rounded-xl border flex items-center gap-1.5 ${
            viewMode === 'pods'
              ? 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30'
              : 'bg-purple-500/15 text-purple-300 border-purple-500/30'
          }`}>
            {viewMode === 'pods' ? <Server size={13} /> : <Layers size={13} />}
            <span>{viewMode === 'pods' ? `Daftar Armada POD (${pods.length})` : `Katalog Seluruh File (${flowData.files?.length || 0})`}</span>
          </span>
        </div>

        {/* Center: Search Input */}
        <div className="relative flex-1 max-w-md">
          <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={
              viewMode === 'pods'
                ? "Cari file di POD (misal: sleep, logo) atau nama POD (misal: POD 40)..."
                : "Cari nama file atau placement (misal: logo, background, sleep)..."
            }
            className="w-full bg-slate-900/90 border border-slate-800 rounded-xl pl-9 pr-8 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500/50 transition-colors"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"
            >
              <X size={12} />
            </button>
          )}
        </div>

        {/* Right: Quick Filter Pills */}
        <div className="flex items-center gap-1.5 flex-wrap shrink-0">
          <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-xl border border-slate-800 text-[11px]">
            <span className="text-slate-500 text-[10px] px-1 font-bold">TIPE:</span>
            {['all', 'image', 'video'].map(t => (
              <button
                key={t}
                onClick={() => setTypeFilter(t)}
                className={`px-2 py-0.5 rounded-md font-semibold capitalize cursor-pointer transition-colors ${
                  typeFilter === t
                    ? 'bg-purple-500/20 text-purple-300 font-bold border border-purple-500/30'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {t === 'all' ? 'Semua' : t === 'image' ? 'Gambar' : 'Video'}
              </button>
            ))}
          </div>

          {placementList.length > 0 && (
            <select
              value={placementFilter}
              onChange={(e) => setPlacementFilter(e.target.value)}
              className="bg-slate-900 border border-slate-800 text-xs text-slate-300 rounded-xl px-2.5 py-1.5 font-semibold focus:outline-none cursor-pointer"
            >
              <option value="all">Semua Placement</option>
              {placementList.map(p => (
                <option key={p} value={p}>Placement: {p}</option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* 3. Main Content: VIEW MODE 1 - UNIT PODS */}
      {viewMode === 'pods' && (() => {
        const q = searchQuery.trim().toLowerCase();
        const isFilterActive = !!q || typeFilter !== 'all' || placementFilter !== 'all';

        const filteredPodItems = pods.map(pod => {
          const podId = pod.serverId || pod.id;
          const podCheck = podsStatus[podId];
          const podNameMatches = q ? (
            pod.serverName?.toLowerCase().includes(q) ||
            (pod.host && pod.host.toLowerCase().includes(q))
          ) : false;

          const rawMissing = podCheck?.missingFiles || [];
          const rawFound = podCheck?.foundFiles || [];

          const filteredMissing = isFilterActive && !podNameMatches
            ? rawMissing.filter(matchesFileItem)
            : isFilterActive ? rawMissing.filter(matchesFileItem)
            : rawMissing;

          const filteredFound = isFilterActive && !podNameMatches
            ? rawFound.filter(matchesFileItem)
            : isFilterActive ? rawFound.filter(matchesFileItem)
            : rawFound;

          const hasMatchingFiles = filteredMissing.length > 0 || filteredFound.length > 0;
          const isVisible = !isFilterActive || podNameMatches || hasMatchingFiles;

          return {
            pod,
            podId,
            podCheck,
            podNameMatches,
            filteredMissing,
            filteredFound,
            hasMatchingFiles,
            isVisible
          };
        }).filter(item => item.isVisible);

        if (filteredPodItems.length === 0) {
          return (
            <div className="p-10 rounded-2xl bg-slate-950/80 border border-slate-800 text-center text-slate-400">
              <Search size={32} className="mx-auto text-slate-600 mb-3" />
              <p className="font-bold text-sm text-white">Tidak ada unit POD atau file yang cocok</p>
              <p className="text-xs text-slate-500 mt-1">Kata kunci: &ldquo;{searchQuery}&rdquo;</p>
              <button
                onClick={() => { setSearchQuery(''); setTypeFilter('all'); setPlacementFilter('all'); }}
                className="mt-3 px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-purple-300 rounded-xl border border-purple-500/30 text-xs font-bold transition-colors cursor-pointer"
              >
                Reset Filter Pencarian
              </button>
            </div>
          );
        }

        return (
          <div className="space-y-4">
            {filteredPodItems.map(({ pod, podId, podCheck, podNameMatches, filteredMissing, filteredFound, hasMatchingFiles }) => {
              const isExpanded = isFilterActive ? (hasMatchingFiles || podNameMatches) : !!expandedPods[podId];
              const isChecking = checkingPodId === podId;
              const isComplete = podCheck?.fileStatus === 'all';
              const isPartial = podCheck?.fileStatus === 'partial';
              const hasMissing = podCheck?.missingCount > 0;
              const isDownloadingAll = !!actionLoading[`dl_all_${podId}`];

              return (
                <div
                  key={podId}
                  className="bg-slate-950/80 border border-slate-800/80 rounded-2xl overflow-hidden shadow-lg transition-all"
                >
                  {/* POD Card Header */}
                  <div
                    onClick={() => togglePodExpanded(podId)}
                    className="p-4 sm:p-4.5 bg-slate-900/60 hover:bg-slate-900/90 flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer select-none transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <button
                        type="button"
                        className="p-1 rounded-lg text-slate-400 hover:text-white"
                      >
                        {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                      </button>

                      <div className="p-2 rounded-xl bg-slate-800/80 border border-slate-700/80 text-cyan-400 shrink-0">
                        <Server size={18} />
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-black text-sm text-white">{pod.serverName}</span>
                          <span className="text-[10px] font-mono text-slate-400">({pod.host})</span>
                          {isComplete && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                              <CheckCircle2 size={11} /> Lengkap ({podCheck.foundCount}/{podCheck.totalCount})
                            </span>
                          )}
                          {isPartial && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30 flex items-center gap-1">
                              <AlertCircle size={11} /> Parsial: {podCheck.foundCount} Ada, {podCheck.missingCount} Belum Ada
                            </span>
                          )}
                          {podCheck?.fileStatus === 'none' && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/15 text-rose-300 border border-rose-500/30 flex items-center gap-1">
                              <AlertTriangle size={11} /> 0 File di POD
                            </span>
                          )}
                          {isFilterActive && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30 flex items-center gap-1">
                              <Search size={10} /> Filter: {filteredFound.length} Ada &bull; {filteredMissing.length} Belum Ada
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          Total Ukuran Fisik Terpakai: <strong className="font-mono text-slate-200">{podCheck?.totalFormatted || '0 B'}</strong>
                        </p>
                      </div>
                    </div>

                    {/* Right Header Actions */}
                    <div
                      onClick={(e) => e.stopPropagation()}
                      className="flex items-center gap-2 self-end sm:self-auto shrink-0"
                    >
                      {hasMissing && (
                        <button
                          onClick={() => handleDownloadAllMissingForPod(pod, podCheck.missingFiles)}
                          disabled={isDownloadingAll}
                          className="px-3 py-1.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all shadow-md shadow-purple-950/40"
                          title={`Download ${podCheck.missingCount} file yang belum ada ke ${pod.serverName}`}
                        >
                          {isDownloadingAll ? (
                            <RefreshCw size={12} className="animate-spin" />
                          ) : (
                            <Download size={12} />
                          )}
                          <span>Download {podCheck.missingCount} File Hilang</span>
                        </button>
                      )}

                      <button
                        onClick={() => checkSinglePod(podId)}
                        disabled={isChecking}
                        className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white border border-slate-700 transition-colors cursor-pointer"
                        title="Periksa Ulang POD Ini"
                      >
                        <RefreshCw size={13} className={isChecking ? 'animate-spin text-cyan-400' : ''} />
                      </button>
                    </div>
                  </div>

                  {/* POD Card Body (Expanded File List) */}
                  {isExpanded && (
                    <div className="p-4 border-t border-slate-800/80 space-y-4">
                      {/* Live Download Progress Banner for this POD */}
                      {Object.keys(downloadProgressMap).some(k => k.startsWith(`${podId}_`)) && (
                        <div className="p-3 rounded-xl bg-purple-950/40 border border-purple-500/30 text-xs space-y-1.5">
                          <span className="font-bold text-purple-300 flex items-center gap-1.5">
                            <RefreshCw size={12} className="animate-spin" /> Sedang Mengunduh ke {pod.serverName}...
                          </span>
                          {Object.entries(downloadProgressMap)
                            .filter(([k]) => k.startsWith(`${podId}_`))
                            .map(([key, prog]) => (
                              <div key={key} className="space-y-1 font-mono text-[11px]">
                                <div className="flex justify-between text-slate-300">
                                  <span className="truncate max-w-xs">{prog.filename}</span>
                                  <span>{prog.percent}% ({prog.downloadedFormatted} / {prog.totalFormatted}) &bull; {prog.speed}</span>
                                </div>
                                <div className="w-full bg-slate-900 rounded-full h-1.5 overflow-hidden">
                                  <div
                                    className="bg-purple-500 h-full transition-all duration-200"
                                    style={{ width: `${prog.percent}%` }}
                                  />
                                </div>
                              </div>
                            ))}
                        </div>
                      )}

                      {/* Notice if no files match active search in this pod */}
                      {isFilterActive && filteredMissing.length === 0 && filteredFound.length === 0 ? (
                        <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800 text-center text-xs text-slate-400">
                          Tidak ada file yang cocok dengan kriteria pencarian &ldquo;{searchQuery}&rdquo; di {pod.serverName}.
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                          {/* 1. Missing Files first if any */}
                          {filteredMissing.map(m => {
                            const isDownloading = !!actionLoading[`dl_${podId}_${m.filename}`];
                            const prog = downloadProgressMap[`${podId}_${m.filename}`];

                            return (
                              <div
                                key={m.filename}
                                className="p-2.5 rounded-xl bg-rose-950/20 border border-rose-500/30 flex items-center justify-between gap-2 text-xs"
                              >
                                <div className="flex items-center gap-2 min-w-0">
                                  <AlertCircle size={14} className="text-rose-400 shrink-0" />
                                  <div className="min-w-0">
                                    <span className="font-bold text-white truncate block text-[11px]" title={m.filename}>
                                      {m.filename}
                                    </span>
                                    <span className="text-[10px] font-mono text-rose-300">
                                      Belum Ada di /{m.folderType} &bull; Est. {m.expectedFormatted}
                                    </span>
                                  </div>
                                </div>

                                <button
                                  onClick={() => handleDownloadSingleFile(pod, m.filename)}
                                  disabled={isDownloading}
                                  className="px-2.5 py-1 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-[10px] font-bold flex items-center gap-1 shrink-0 transition-colors cursor-pointer shadow-sm"
                                >
                                  {isDownloading ? (
                                    <RefreshCw size={11} className="animate-spin" />
                                  ) : (
                                    <Download size={11} />
                                  )}
                                  <span>{prog ? `${prog.percent}%` : 'Download'}</span>
                                </button>
                              </div>
                            );
                          })}

                          {/* 2. Found Files on POD */}
                          {filteredFound.map(f => {
                            const isDeleting = !!actionLoading[`del_${podId}_${f.filename}`];
                            const isVideo = f.folderType === 'videos';
                            const streamUrl = getPodFileStreamUrl(podId, f.fullPath);

                            return (
                              <div
                                key={f.filename}
                                className="p-2.5 rounded-xl bg-slate-900/80 hover:bg-slate-900 border border-slate-800 flex items-center justify-between gap-2 text-xs transition-colors"
                              >
                                <div className="flex items-center gap-2 min-w-0">
                                  <Check size={14} className="text-emerald-400 shrink-0" />
                                  <div className="min-w-0">
                                    <span className="font-bold text-white truncate block text-[11px]" title={f.filename}>
                                      {f.filename}
                                    </span>
                                    <span className="text-[10px] font-mono text-emerald-300">
                                      {f.sizeFormatted} &bull; /{f.folderType}
                                    </span>
                                  </div>
                                </div>

                                <div className="flex items-center gap-1.5 shrink-0">
                                  {/* Preview Button */}
                                  <button
                                    onClick={() => setPreviewModal({
                                      isOpen: true,
                                      file: {
                                        filename: f.filename,
                                        category: isVideo ? 'video' : 'image',
                                        sizeFormatted: f.sizeFormatted,
                                        url: streamUrl,
                                        sourceLabel: `${pod.serverName} • /${f.folderType}`
                                      }
                                    })}
                                    className="p-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition-colors cursor-pointer"
                                    title="Buka Pratinjau Media"
                                  >
                                    <Eye size={11} />
                                  </button>

                                  {/* Integrity Check Button */}
                                  <button
                                    onClick={() => onCheckIntegrity?.(pod, f.fullPath, f.filename)}
                                    className="p-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-cyan-400 hover:text-white border border-slate-700 transition-colors cursor-pointer"
                                    title="Cek Integritas (ffprobe)"
                                  >
                                    <Stethoscope size={11} />
                                  </button>

                                  {/* Delete Physical File */}
                                  <button
                                    onClick={() => handleDeleteFromPod(pod, f.filename, f.folderType)}
                                    disabled={isDeleting}
                                    className="p-1 rounded-lg bg-slate-800 hover:bg-rose-900/60 text-slate-400 hover:text-rose-300 border border-slate-700 hover:border-rose-500/40 transition-colors cursor-pointer"
                                    title="Hapus File dari POD"
                                  >
                                    {isDeleting ? <RefreshCw size={11} className="animate-spin text-rose-400" /> : <Trash2 size={11} />}
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        );
      })()}

      {/* 4. Main Content: VIEW MODE 2 - FILE CATALOG */}
      {viewMode === 'files' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {filteredFiles.map(file => {
            const isVideo = file.category === 'video';

            // Check how many PODs have this file
            let presentCount = 0;
            const missingPodList = [];

            pods.forEach(p => {
              const check = podsStatus[p.serverId];
              const hasFile = check?.foundFiles?.some(f => f.filename.toLowerCase() === file.filename.toLowerCase());
              if (hasFile) presentCount++;
              else missingPodList.push(p);
            });

            return (
              <div
                key={file.id || file.filename}
                className="bg-slate-950/80 border border-slate-800/80 hover:border-purple-500/30 rounded-2xl p-4 flex flex-col justify-between gap-3 shadow-md transition-all group"
              >
                <div>
                  {/* Card Header: Placement & Type Badge */}
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-md uppercase tracking-wider ${
                      file.placement === 'logo'
                        ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                        : file.placement === 'background'
                          ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                          : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                    }`}>
                      {file.placement}
                    </span>

                    <span className="text-[10px] font-mono text-slate-400 flex items-center gap-1">
                      {isVideo ? <Film size={11} className="text-amber-400" /> : <ImageIcon size={11} className="text-purple-400" />}
                      <span>/{file.folderType}</span>
                    </span>
                  </div>

                  {/* Thumbnail / Visual Area */}
                  {file.url && (
                    <div
                      onClick={() => setPreviewModal({
                        isOpen: true,
                        file: {
                          filename: file.filename,
                          category: file.category,
                          sizeFormatted: file.sizeFormatted,
                          url: file.url,
                          sourceLabel: `AWS S3 • images/${file.filename}`
                        }
                      })}
                      className="h-28 rounded-xl bg-slate-900/90 border border-slate-800/80 overflow-hidden flex items-center justify-center relative cursor-pointer group-hover:border-purple-500/40 transition-colors mb-2.5"
                    >
                      {!isVideo ? (
                        <img
                          src={file.url}
                          alt={file.filename}
                          className="h-full w-full object-contain p-2"
                          onError={(e) => { e.target.style.display = 'none'; }}
                        />
                      ) : (
                        <div className="flex flex-col items-center gap-1 text-slate-400 group-hover:text-purple-300 transition-colors">
                          <Film size={28} />
                          <span className="text-[10px] font-mono">Pratinjau Video</span>
                        </div>
                      )}
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                        <Eye size={20} className="text-white drop-shadow-md" />
                      </div>
                    </div>
                  )}

                  {/* File Name & S3 Metadata */}
                  <h4 className="text-xs font-bold text-white truncate" title={file.filename}>
                    {file.filename}
                  </h4>
                  <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 mt-1">
                    <span>S3: <strong className="text-slate-200">{file.sizeFormatted}</strong></span>
                    <span className={file.existsInS3 ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>
                      {file.existsInS3 ? '🟢 Ada di S3' : '🔴 Hilang di S3'}
                    </span>
                  </div>
                </div>

                {/* Footer: Fleet Availability & Actions */}
                <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between gap-2">
                  <div className="text-[10px] font-mono">
                    <span className="text-slate-400">Armada POD: </span>
                    <strong className={presentCount === podCount ? 'text-emerald-400' : 'text-amber-300'}>
                      {presentCount}/{podCount} Unit
                    </strong>
                  </div>

                  {missingPodList.length > 0 && (
                    <button
                      onClick={() => {
                        const targetIds = missingPodList.map(p => p.serverId);
                        downloadFlowFilesToBatchPodsApi(targetIds, [file.filename])
                          .then(() => alert(`Mulai mendownload "${file.filename}" ke ${missingPodList.length} POD...`))
                          .catch(e => alert(e.message));
                      }}
                      className="px-2.5 py-1 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-[10px] font-bold flex items-center gap-1 cursor-pointer transition-colors"
                      title={`Download file ini ke ${missingPodList.length} POD yang belum ada`}
                    >
                      <Download size={11} />
                      <span>Download ke {missingPodList.length} POD</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Media Preview Modal */}
      <MediaPreviewModal
        isOpen={previewModal.isOpen}
        onClose={() => setPreviewModal({ isOpen: false, file: null })}
        file={previewModal.file}
      />
    </div>
  );
}
