import React, { useState, useEffect, useCallback } from 'react';
import {
  ArrowLeft,
  Sparkles,
  Sliders,
  Music,
  Plus,
  RefreshCw,
  Server,
  Upload,
  BookOpen,
  Layers,
  Edit,
  Download,
  AlertCircle,
  CheckCircle2,
  Clock,
  Sun,
  Volume2,
  Wind,
  Zap,
  Radio,
  FileText,
  ChevronDown,
  Globe,
  Trash2
} from 'lucide-react';
import {
  fetchMasterPodsApi,
  fetchPodSignatureListApi,
  deleteDetailExperienceApi
} from '../api/vpsApi';

import DetailExperienceModal from '../components/podSessions/DetailExperienceModal';
import TemplateImportModal from '../components/podSessions/TemplateImportModal';
import BatchApplyModal from '../components/podSessions/BatchApplyModal';
import TemplateLibraryModal from '../components/podSessions/TemplateLibraryModal';

export default function PodSessionsPage({ onBack, onNavigateView }) {
  // POD Units State
  const [pods, setPods] = useState([]);
  const [selectedPodId, setSelectedPodId] = useState(null);
  const [isLoadingPods, setIsLoadingPods] = useState(true);

  // Active POD Data State
  const [podDetailData, setPodDetailData] = useState(null);
  const [experiences, setExperiences] = useState([]);
  const [selectedExperienceId, setSelectedExperienceId] = useState(null);
  const [isLoadingExperiences, setIsLoadingExperiences] = useState(false);

  // Modal Control States
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [editingDetailItem, setEditingDetailItem] = useState(null);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isBatchApplyModalOpen, setIsBatchApplyModalOpen] = useState(false);
  const [batchTemplateData, setBatchTemplateData] = useState(null);
  const [isLibraryModalOpen, setIsLibraryModalOpen] = useState(false);

  // Status Alerts
  const [error, setError] = useState(null);
  const [notification, setNotification] = useState(null);

  const showNotification = (msg) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 4000);
  };

  // 1. Load All PODs from Master DB
  const loadPods = useCallback(async () => {
    setIsLoadingPods(true);
    setError(null);
    try {
      const list = await fetchMasterPodsApi();
      setPods(list || []);
      if (list && list.length > 0 && !selectedPodId) {
        // Default to first POD (or POD 33 if available)
        const pod33 = list.find(p => String(p.code) === '33');
        setSelectedPodId(pod33 ? pod33.id : list[0].id);
      }
    } catch (err) {
      console.error('Failed to load pods:', err);
      setError(err.message || 'Gagal memuat daftar unit POD');
    } finally {
      setIsLoadingPods(false);
    }
  }, [selectedPodId]);

  useEffect(() => {
    loadPods();
  }, [loadPods]);

  // 2. Load Experiences for Selected POD from Master API
  const loadPodExperiences = useCallback(async (podId) => {
    if (!podId) return;
    setIsLoadingExperiences(true);
    setError(null);
    try {
      const res = await fetchPodSignatureListApi(podId);
      setPodDetailData(res?.data?.pod || null);

      const expList = res?.data?.pod?.experiences || [];
      setExperiences(expList);

      if (expList.length > 0) {
        // Otomatis pilih sesi RECHARGE jika ada, atau sesi pertama pada unit POD target
        const recharge = expList.find(e => (e.menu_name || '').toUpperCase() === 'RECHARGE');
        setSelectedExperienceId(recharge ? recharge.id : expList[0].id);
      } else {
        setSelectedExperienceId(null);
      }
    } catch (err) {
      console.error('Failed to load pod experiences:', err);
      setError(err.message || 'Gagal memuat sesi Signature untuk unit POD ini');
    } finally {
      setIsLoadingExperiences(false);
    }
  }, []);

  useEffect(() => {
    if (selectedPodId) {
      loadPodExperiences(selectedPodId);
    }
  }, [selectedPodId, loadPodExperiences]);

  // Active POD & Experience objects
  const activePod = pods.find(p => (p.pod_uuid === selectedPodId || p.id === selectedPodId)) || podDetailData;
  const activeExperience = experiences.find(e => e.id === selectedExperienceId) || experiences[0] || null;

  // Detail experiences list diambil langsung dari objek activeExperience yang sudah dimuat oleh Master API
  const detailExperiencesList = React.useMemo(() => {
    const rawDetails = activeExperience?.detail_experience || [];
    return [...rawDetails].sort((a, b) => (Number(a.order) || 0) - (Number(b.order) || 0));
  }, [activeExperience]);

  // Total session duration calculation
  const totalDurationMinutes = detailExperiencesList.reduce((acc, curr) => {
    return acc + (Number(curr.duration) || 0);
  }, 0).toFixed(1);

  // Deleting State
  const [deletingDetailId, setDeletingDetailId] = useState(null);

  // Delete Detail Experience Track directly from Master API
  const handleDeleteDetail = async (item) => {
    if (!item?.id) {
      setError('ID track detail experience tidak ditemukan');
      return;
    }

    const trackName = item.title || item.song || `Track #${item.order || item.sound_scape || ''}`;
    const confirmed = window.confirm(`Apakah Anda yakin ingin menghapus "${trackName}" dari Master API?`);
    if (!confirmed) return;

    setDeletingDetailId(item.id);
    setError(null);
    try {
      await deleteDetailExperienceApi(item.id);
      showNotification(`Track "${trackName}" berhasil dihapus dari POD!`);
      if (selectedPodId) {
        await loadPodExperiences(selectedPodId);
      }
    } catch (err) {
      console.error('Failed to delete detail experience:', err);
      setError(`Gagal menghapus detail experience: ${err.message}`);
    } finally {
      setDeletingDetailId(null);
    }
  };

  const handleOpenInTemplateStudio = (item = null) => {
    if (!onNavigateView) return;
    const targetItem = item || (detailExperiencesList.length > 0 ? detailExperiencesList[0] : null);
    onNavigateView('template-generator', {
      mode: targetItem ? 'edit-signature' : 'new-signature',
      podSettingId: selectedPodId,
      signatureId: activeExperience?.id || selectedExperienceId,
      signatureName: activeExperience?.menu_name || 'RECHARGE',
      podName: activePod?.name || activePod?.code || `POD #${selectedPodId}`,
      podCode: activePod?.code || '',
      detailItem: targetItem,
      tracks: detailExperiencesList,
      returnView: 'pod-sessions'
    });
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 sm:p-6 lg:p-8 space-y-6">
      {/* Top Header & Navigation */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div className="flex items-center gap-3">
          {onBack && (
            <button
              onClick={onBack}
              className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800 transition"
            >
              <ArrowLeft size={18} />
            </button>
          )}
          <div className="p-2.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400 shadow-lg shadow-amber-500/10">
            <Sparkles size={24} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-black text-white tracking-tight">
                POD Sessions & Signature Management
              </h1>
              <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 uppercase tracking-wide">
                OPERATIONAL
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Kelola kalibrasi modulasi perangkat keras POD, integrasi SoundScape, dan template JSON portable
            </p>
          </div>
        </div>

        {/* Action Buttons Toolbar */}
        <div className="flex flex-wrap items-center gap-2">
          {onNavigateView && (
            <button
              onClick={() => {
                if (selectedExperienceId || (detailExperiencesList && detailExperiencesList.length > 0)) {
                  handleOpenInTemplateStudio(null);
                } else {
                  onNavigateView('template-generator');
                }
              }}
              className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-fuchsia-600 via-purple-600 to-indigo-600 hover:from-fuchsia-500 hover:to-indigo-500 text-white font-bold text-xs shadow-md shadow-fuchsia-500/20 flex items-center gap-1.5 transition active:scale-95"
              title="Buka Template Generator & Simulator Virtual POD V3"
            >
              <Sliders size={14} className="text-fuchsia-200" />
              Template Studio & Simulator
            </button>
          )}

          <button
            onClick={() => setIsImportModalOpen(true)}
            className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 text-xs font-semibold flex items-center gap-1.5 transition"
          >
            <Upload size={14} className="text-cyan-400" />
            Import Template JSON
          </button>

          <button
            onClick={() => setIsLibraryModalOpen(true)}
            className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 text-xs font-semibold flex items-center gap-1.5 transition"
          >
            <BookOpen size={14} className="text-indigo-400" />
            Template Library
          </button>

          {onNavigateView && (
            <button
              onClick={() => handleOpenInTemplateStudio(null)}
              disabled={!selectedExperienceId}
              className="px-3 py-1.5 rounded-xl bg-purple-950/70 hover:bg-purple-900 text-purple-300 hover:text-white border border-purple-800/80 text-xs font-bold flex items-center gap-1.5 transition disabled:opacity-50 shadow-sm"
              title="Buat track pengalaman baru langsung di Template Studio Visual Sequencer"
            >
              <Sparkles size={14} className="text-purple-400" />
              <span>Studio Visual</span>
            </button>
          )}

          <button
            onClick={() => {
              setEditingDetailItem(null);
              setIsDetailModalOpen(true);
            }}
            disabled={!selectedExperienceId}
            className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs shadow-md shadow-amber-500/20 flex items-center gap-1.5 transition disabled:opacity-50"
          >
            <Plus size={15} />
            Tambah Experience
          </button>

          <button
            onClick={() => {
              if (selectedPodId) loadPodExperiences(selectedPodId);
            }}
            disabled={isLoadingExperiences}
            className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800 transition"
            title="Refresh data"
          >
            <RefreshCw size={16} className={isLoadingExperiences ? 'animate-spin text-cyan-400' : ''} />
          </button>
        </div>
      </div>

      {/* Notifications / Alerts */}
      {error && (
        <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle size={16} className="shrink-0" />
            <span>{error}</span>
          </div>
          <button onClick={() => setError(null)} className="text-rose-400 hover:text-rose-200">
            &times;
          </button>
        </div>
      )}
      {notification && (
        <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
          <CheckCircle2 size={16} className="shrink-0" />
          <span>{notification}</span>
        </div>
      )}

      {/* POD Unit Selector & Fleet Ribbon */}
      <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-lg flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        {/* Left Side: Unit Selector */}
        <div className="flex items-center gap-3.5 min-w-0">
          <div className="relative shrink-0">
            <div className="p-2.5 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 shadow-sm">
              <Server size={20} />
            </div>
            <span className="absolute -top-1 -right-1 flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500 border-2 border-slate-900"></span>
            </span>
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">
                Target Unit POD
              </span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 font-semibold border border-slate-700/60">
                {pods.length} Unit
              </span>
            </div>

            <div className="relative mt-1 max-w-md sm:max-w-none">
              <select
                value={selectedPodId || ''}
                onChange={(e) => setSelectedPodId(e.target.value)}
                disabled={isLoadingPods}
                className="w-full sm:w-auto appearance-none pl-3.5 pr-9 py-2 rounded-xl bg-slate-950 border border-slate-700 hover:border-slate-600 focus:border-cyan-400 text-sm font-bold text-white focus:outline-none cursor-pointer transition shadow-inner"
              >
                {pods.map((p) => (
                  <option key={p.pod_uuid || p.id} value={p.pod_uuid || p.id}>
                    {p.name || `POD ${p.code}`} — {p.host || p.ip_address} (Code: {p.code})
                  </option>
                ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400">
                <ChevronDown size={15} />
              </div>
            </div>
          </div>
        </div>

        {/* Right Side: Active POD Telemetry & Hardware Badges */}
        {activePod && (
          <div className="flex items-center flex-wrap gap-2 pt-2 lg:pt-0 border-t lg:border-t-0 border-slate-800/80">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-cyan-500/10 border border-cyan-500/25 text-cyan-300 text-xs font-bold shadow-sm">
              <span className="w-2 h-2 rounded-full bg-cyan-400"></span>
              <span>POD V3 Hardware</span>
            </div>

            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-950/80 border border-slate-800 text-slate-300 text-xs font-mono shadow-sm">
              <Globe size={13} className="text-slate-400" />
              <span className="text-slate-400 font-sans font-medium text-[11px]">IP:</span>
              <span className="font-bold text-slate-200">{activePod.host || activePod.ip_address || '-'}</span>
            </div>

            <div
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-500/10 border border-indigo-500/25 text-indigo-300 text-xs font-mono shadow-sm select-all"
              title={activePod.pod_uuid || activePod.id}
            >
              <span className="text-indigo-400 font-sans font-medium text-[11px]">UUID:</span>
              <span className="font-semibold">{activePod.pod_uuid || activePod.id}</span>
            </div>

            {activePod.code && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800/80 border border-slate-700/60 text-slate-300 text-xs font-mono">
                <span className="text-[11px] text-slate-400 font-sans">Kode:</span>
                <span className="font-bold text-amber-300">{activePod.code}</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Signature Sessions Tab Bar */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin">
          {experiences.map((exp) => {
            const isSelected = exp.id === selectedExperienceId;
            return (
              <button
                key={exp.id}
                onClick={() => setSelectedExperienceId(exp.id)}
                className={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl font-bold text-xs transition whitespace-nowrap border ${isSelected
                  ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-lg shadow-amber-500/20'
                  : 'bg-slate-900/90 text-slate-300 border-slate-800 hover:border-slate-700 hover:text-white'
                  }`}
              >
                <span>{exp.menu_name || exp.name || 'SESSION'}</span>
                <span
                  className={`text-[10px] font-mono px-1.5 py-0.5 rounded-full ${isSelected ? 'bg-slate-950/20 text-slate-950 font-extrabold' : 'bg-slate-800 text-slate-400'
                    }`}
                >
                  {exp.detail_experience?.length || (isSelected ? detailExperiencesList.length : 0)} Track
                </span>
              </button>
            );
          })}

          {experiences.length === 0 && !isLoadingExperiences && (
            <div className="p-3 text-xs text-slate-500 italic">
              Tidak ada sesi Signature yang ditemukan pada unit POD ini
            </div>
          )}
        </div>
      </div>

      {/* Active Session Overview Banner */}
      {activeExperience && (
        <div className="p-5 rounded-2xl bg-gradient-to-r from-slate-900 to-slate-900/60 border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-extrabold text-white">
                Sesi: {activeExperience.menu_name}
              </h2>
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                {activeExperience.active ? 'Aktif' : 'Non-Aktif'}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              {activeExperience.information || 'Sesi terapi wellness terintegrasi'}
            </p>
          </div>

          <div className="flex items-center gap-4 text-xs font-semibold">
            <div className="px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-center">
              <span className="text-[10px] text-slate-500 block uppercase">Total Track</span>
              <span className="font-bold text-amber-400 text-sm">{detailExperiencesList.length}</span>
            </div>
            <div className="px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-center">
              <span className="text-[10px] text-slate-500 block uppercase">Estimasi Durasi</span>
              <span className="font-bold text-cyan-400 text-sm">~{totalDurationMinutes} m</span>
            </div>
          </div>
        </div>
      )}

      {/* Sequence Timeline of Detail Experiences */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
            <Sliders size={15} className="text-amber-400" />
            Urutan Pengalaman Terapi (Detail Experience Sequence)
          </h3>
          <span className="text-xs text-slate-500">
            Tersusun berdasarkan parameter <code className="text-cyan-400">order</code>
          </span>
        </div>

        {isLoadingExperiences ? (
          <div className="p-12 text-center text-xs text-slate-400">
            <RefreshCw size={24} className="animate-spin mx-auto text-amber-400 mb-2" />
            Memuat urutan detail experience...
          </div>
        ) : detailExperiencesList.length === 0 ? (
          <div className="p-12 rounded-2xl bg-slate-900/60 border border-slate-800 text-center flex flex-col items-center justify-center space-y-3">
            <Music size={36} className="text-slate-600" />
            <h4 className="text-sm font-bold text-white">Belum Ada Detail Experience pada Sesi Ini</h4>
            <p className="text-xs text-slate-400 max-w-md">
              Tambahkan track pertama dari katalog multimedia SoundScape atau import konfigurasi dari template JSON.
            </p>
            <div className="flex items-center gap-2 pt-2">
              {onNavigateView && (
                <button
                  onClick={() => handleOpenInTemplateStudio(null)}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs shadow-md shadow-amber-500/20 transition flex items-center gap-1.5"
                >
                  <Sparkles size={14} />
                  Buka di Template Studio
                </button>
              )}
              <button
                onClick={() => {
                  setEditingDetailItem(null);
                  setIsDetailModalOpen(true);
                }}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition flex items-center gap-1.5"
              >
                <Plus size={14} />
                Tambah Manual
              </button>
              <button
                onClick={() => setIsImportModalOpen(true)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition flex items-center gap-1.5"
              >
                <Upload size={14} className="text-cyan-400" />
                Import Template JSON
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {detailExperiencesList.map((item, index) => (
              <div
                key={item.id || index}
                className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 hover:border-slate-700/80 shadow-md transition space-y-4"
              >
                {/* Track Header & Identity */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800/80">
                  <div className="flex items-center gap-3">
                    <span className="px-2.5 py-1 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-400 font-mono font-bold text-xs">
                      #{item.order || index + 1}
                    </span>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-bold text-white text-sm">
                          {item.title || item.song || 'Untitled Experience'}
                        </h4>
                        <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-cyan-950/60 border border-cyan-500/30 text-cyan-300 font-bold">
                          SoundScape #{item.sound_scape || '-'}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {item.artist || 'Regenesis'} • {item.album || 'Regenesis'} • Durasi: <span className="text-amber-300 font-mono">{item.duration || 20}m</span>
                      </p>
                    </div>
                  </div>

                  {/* Actions for this Track */}
                  <div className="flex items-center gap-1.5 self-end sm:self-auto">
                    {onNavigateView && (
                      <button
                        onClick={() => handleOpenInTemplateStudio(item)}
                        className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-amber-500/25 to-amber-600/25 hover:from-amber-500/40 hover:to-amber-600/40 text-amber-300 border border-amber-500/50 hover:border-amber-400 text-xs font-bold flex items-center gap-1.5 transition shadow-sm"
                        title="Buka dan aransemen di Template Studio (DAW Multi-Track Sequencer)"
                      >
                        <Sparkles size={13} className="text-amber-400" />
                        <span>Edit di Studio</span>
                      </button>
                    )}

                    <button
                      onClick={() => {
                        setEditingDetailItem(item);
                        setIsDetailModalOpen(true);
                      }}
                      className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 text-xs font-medium flex items-center gap-1 transition"
                      title="Buka form modal ringkas"
                    >
                      <Edit size={12} className="text-cyan-400" />
                      <span className="hidden sm:inline">Form</span>
                    </button>

                    <button
                      onClick={() => handleDeleteDetail(item)}
                      disabled={deletingDetailId === item.id}
                      className="px-2.5 py-1.5 rounded-lg bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border border-rose-500/30 hover:border-rose-500/50 text-xs font-bold flex items-center gap-1 transition disabled:opacity-50"
                      title="Hapus track ini dari Master API"
                    >
                      {deletingDetailId === item.id ? (
                        <div className="w-3 h-3 border-2 border-rose-400 border-t-transparent rounded-full animate-spin"></div>
                      ) : (
                        <Trash2 size={13} />
                      )}
                      <span className="hidden sm:inline">Hapus</span>
                    </button>
                  </div>
                </div>

                {/* Media Files Row */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs bg-slate-950/60 p-3 rounded-xl border border-slate-800/80">
                  <div className="flex items-center gap-2 truncate">
                    <Music size={14} className="text-cyan-400 shrink-0" />
                    <span className="text-slate-400 text-[11px]">Audio:</span>
                    <span className="font-mono text-slate-200 truncate">{item.song || '-'}</span>
                  </div>
                  <div className="flex items-center gap-2 truncate">
                    <Sun size={14} className="text-amber-400 shrink-0" />
                    <span className="text-slate-400 text-[11px]">Strobe:</span>
                    <span className="font-mono text-amber-200 truncate">{item.lamp || '-'}</span>
                  </div>
                  <div className="flex items-center gap-2 truncate">
                    <FileText size={14} className="text-purple-400 shrink-0" />
                    <span className="text-slate-400 text-[11px]">Video:</span>
                    <span className="font-mono text-purple-200 truncate">{item.video || '(None)'}</span>
                  </div>
                </div>

                {/* Hardware Modulation Visual Gauges */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  {/* Strobe Light Gauge */}
                  <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800/80 space-y-1">
                    <div className="flex justify-between text-[11px]">
                      <span className="text-slate-400">Stroboscopic</span>
                      <span className="font-mono font-bold text-amber-400">{item.stroboscopic_light || 0}%</span>
                    </div>
                    <div className="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden">
                      <div
                        className="h-full bg-amber-400 rounded-full"
                        style={{ width: `${Math.min(100, item.stroboscopic_light || 0)}%` }}
                      />
                    </div>
                  </div>

                  {/* Vibroacoustics Gauge */}
                  <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800/80 space-y-1">
                    <div className="flex justify-between text-[11px]">
                      <span className="text-slate-400">Vibro-Acoustics</span>
                      <span className="font-mono font-bold text-cyan-400">{item.vibro_acoustics || 0}%</span>
                    </div>
                    <div className="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden">
                      <div
                        className="h-full bg-cyan-400 rounded-full"
                        style={{ width: `${Math.min(100, item.vibro_acoustics || 0)}%` }}
                      />
                    </div>
                  </div>

                  {/* Audio Surround Gauge */}
                  <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800/80 space-y-1">
                    <div className="flex justify-between text-[11px]">
                      <span className="text-slate-400">Audio Surround</span>
                      <span className="font-mono font-bold text-cyan-400">{item.audio_surround_sound || 0}%</span>
                    </div>
                    <div className="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden">
                      <div
                        className="h-full bg-cyan-400 rounded-full"
                        style={{ width: `${Math.min(100, item.audio_surround_sound || 0)}%` }}
                      />
                    </div>
                  </div>

                  {/* NIR & FIR Gauge */}
                  <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800/80 space-y-1">
                    <div className="flex justify-between text-[11px]">
                      <span className="text-slate-400">NIR / FIR</span>
                      <span className="font-mono font-bold text-rose-400">
                        {item.infra_red_nea_ir || 0}% / {item.infra_red_far_ir || 0}%
                      </span>
                    </div>
                    <div className="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden">
                      <div
                        className="h-full bg-rose-500 rounded-full"
                        style={{ width: `${Math.min(100, item.infra_red_nea_ir || 0)}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* Status Badges & Dynamic Schedules Summary */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-1 border-t border-slate-800/60 text-xs">
                  {/* Switches Badges */}
                  <div className="flex flex-wrap items-center gap-2">
                    {item.pemf_therapy ? (
                      <span className="px-2 py-0.5 rounded-full bg-purple-500/15 border border-purple-500/30 text-purple-300 font-semibold text-[11px] flex items-center gap-1">
                        <Zap size={11} />
                        PEMF On ({item.pemf_value || 0})
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full bg-slate-800 text-slate-500 text-[11px]">
                        PEMF Off
                      </span>
                    )}

                    {item.olfactory_engagement ? (
                      <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 font-semibold text-[11px] flex items-center gap-1">
                        <Wind size={11} />
                        Aroma: {item.scent || 'Active'}
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full bg-slate-800 text-slate-500 text-[11px]">
                        Aroma Off
                      </span>
                    )}

                    {item.binaural_beats_isochronic_tones && (
                      <span className="px-2 py-0.5 rounded-full bg-cyan-500/15 border border-cyan-500/30 text-cyan-300 text-[11px]">
                        Binaural Beats
                      </span>
                    )}
                  </div>

                  {/* Schedules Pill counts */}
                  <div className="flex items-center gap-3 text-[11px] text-slate-400">
                    <span className="flex items-center gap-1">
                      <Wind size={12} className="text-emerald-400" />
                      <b className="text-white">{item.burst_time?.length || 0}</b> Aroma Bursts
                    </span>
                    <span className="flex items-center gap-1">
                      <Radio size={12} className="text-cyan-400" />
                      <b className="text-white">{item.generator_frequency?.length || 0}</b> Frequencies
                    </span>
                    <span className="flex items-center gap-1">
                      <Sun size={12} className="text-rose-400" />
                      <b className="text-white">{item.nir_value?.length || 0}</b> NIR Intervals
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modals */}
      {isDetailModalOpen && (
        <DetailExperienceModal
          isOpen={isDetailModalOpen}
          onClose={() => setIsDetailModalOpen(false)}
          podSettingId={selectedPodId}
          signatureId={activeExperience?.id || selectedExperienceId}
          targetSessionName={activeExperience?.menu_name || 'RECHARGE'}
          initialData={editingDetailItem}
          onSuccess={() => {
            showNotification(editingDetailItem ? 'Detail experience berhasil diperbarui!' : 'Detail experience baru berhasil ditambahkan!');
            loadPodExperiences(selectedPodId);
          }}
        />
      )}

      {isImportModalOpen && (
        <TemplateImportModal
          isOpen={isImportModalOpen}
          onClose={() => setIsImportModalOpen(false)}
          currentPod={activePod}
          currentExperience={activeExperience}
          onSuccess={() => {
            showNotification('Template berhasil diterapkan ke POD!');
            loadPodExperiences(selectedPodId);
          }}
          onOpenBatchApply={(tpl) => {
            setBatchTemplateData(tpl);
            setIsBatchApplyModalOpen(true);
          }}
        />
      )}

      {isBatchApplyModalOpen && (
        <BatchApplyModal
          isOpen={isBatchApplyModalOpen}
          onClose={() => setIsBatchApplyModalOpen(false)}
          templateData={batchTemplateData}
          onSuccess={() => {
            showNotification('Proses Batch Apply berhasil diselesaikan!');
            loadPodExperiences(selectedPodId);
          }}
        />
      )}

      {isLibraryModalOpen && (
        <TemplateLibraryModal
          isOpen={isLibraryModalOpen}
          onClose={() => setIsLibraryModalOpen(false)}
          currentPod={activePod}
          currentExperience={activeExperience}
          onSuccess={() => {
            showNotification('Template dari library berhasil diterapkan!');
            loadPodExperiences(selectedPodId);
          }}
          onOpenBatchApply={(tpl) => {
            setBatchTemplateData(tpl);
            setIsBatchApplyModalOpen(true);
          }}
        />
      )}
    </div>
  );
}
