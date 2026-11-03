import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Users,
  Music,
  Calendar,
  Layers,
  Search,
  RefreshCw,
  Download,
  Filter,
  Eye,
  X,
  Database,
  Clock,
  LayoutGrid,
  Columns2,
  Square,
  Sparkles,
  TrendingUp,
  Award,
  Cpu,
  BarChart3,
  RotateCcw,
  Trash2
} from 'lucide-react';
import {
  fetchSessionMonitoringSummaryApi,
  fetchSessionMonitoringDetailsApi,
  fetchExperienceInsightsApi
} from '../../api/podLogsExtractorApi';

// Modular Child Cards & Modals
import ExperienceCardWrapper from './ExperienceCardWrapper';
import MostPlayedSongsCard from './cards/MostPlayedSongsCard';
import PodFleetSummaryCard from './cards/PodFleetSummaryCard';
import PeakHoursCard from './cards/PeakHoursCard';
import SessionCompletionCard from './cards/SessionCompletionCard';
import CleanupOrphanPodsModal from './CleanupOrphanPodsModal';

export default function SessionMonitoringTab({
  masters = [],
  selectedMasterId,
  onSelectMaster,
  registeredPods = [],
  onDataCleaned
}) {
  // Filters state
  const [selectedPodId, setSelectedPodId] = useState('ALL');
  const [groupByPod, setGroupByPod] = useState(false); // false = Konsolidasi per Tanggal, true = Rinci per POD
  const [datePreset, setDatePreset] = useState('30_DAYS'); // '7_DAYS' | '30_DAYS' | 'THIS_MONTH' | 'ALL'
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [searchFilter, setSearchFilter] = useState('');

  // Card Size & Layout Customization (Adjustable Cards)
  const defaultSizes = {
    topSongs: 'half',
    podFleet: 'half',
    peakHours: 'half',
    sessionCompletion: 'half',
    dailyTable: 'full'
  };

  const [cardSizes, setCardSizes] = useState(() => {
    try {
      const saved = localStorage.getItem('vps_experience_cards_sizes');
      return saved ? JSON.parse(saved) : defaultSizes;
    } catch (_) {
      return defaultSizes;
    }
  });

  const [collapsedCards, setCollapsedCards] = useState(() => {
    try {
      const saved = localStorage.getItem('vps_experience_cards_collapsed');
      return saved ? JSON.parse(saved) : {};
    } catch (_) {
      return {};
    }
  });

  // Save layout configurations to localStorage
  const handleToggleCardSize = (cardId) => {
    setCardSizes((prev) => {
      const updated = {
        ...prev,
        [cardId]: prev[cardId] === 'full' ? 'half' : 'full'
      };
      localStorage.setItem('vps_experience_cards_sizes', JSON.stringify(updated));
      return updated;
    });
  };

  const handleToggleCardCollapse = (cardId) => {
    setCollapsedCards((prev) => {
      const updated = {
        ...prev,
        [cardId]: !prev[cardId]
      };
      localStorage.setItem('vps_experience_cards_collapsed', JSON.stringify(updated));
      return updated;
    });
  };

  const handleSetAllCardSizes = (size) => {
    const updated = {
      topSongs: size,
      podFleet: size,
      peakHours: size,
      sessionCompletion: size,
      dailyTable: 'full'
    };
    setCardSizes(updated);
    localStorage.setItem('vps_experience_cards_sizes', JSON.stringify(updated));
  };

  const handleResetCardLayout = () => {
    setCardSizes(defaultSizes);
    setCollapsedCards({});
    localStorage.removeItem('vps_experience_cards_sizes');
    localStorage.removeItem('vps_experience_cards_collapsed');
  };

  // Data state
  const [summaryRows, setSummaryRows] = useState([]);
  const [insights, setInsights] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // Drilldown Modal state
  const [drilldownTarget, setDrilldownTarget] = useState(null);
  const [drilldownSessions, setDrilldownSessions] = useState([]);
  const [isLoadingDrilldown, setIsLoadingDrilldown] = useState(false);
  const [drilldownPage, setDrilldownPage] = useState(1);
  const [drilldownTotalPages, setDrilldownTotalPages] = useState(1);
  const [drilldownTotalRows, setDrilldownTotalRows] = useState(0);
  const [drilldownSearch, setDrilldownSearch] = useState('');

  // Cleanup Orphan Pods Modal state
  const [isCleanupModalOpen, setIsCleanupModalOpen] = useState(false);

  // Calculate Date Presets
  const applyDatePreset = (preset) => {
    setDatePreset(preset);
    const now = new Date();
    if (preset === '7_DAYS') {
      const start = new Date();
      start.setDate(now.getDate() - 7);
      setDateFrom(start.toISOString().split('T')[0]);
      setDateTo(now.toISOString().split('T')[0]);
    } else if (preset === '30_DAYS') {
      const start = new Date();
      start.setDate(now.getDate() - 30);
      setDateFrom(start.toISOString().split('T')[0]);
      setDateTo(now.toISOString().split('T')[0]);
    } else if (preset === 'THIS_MONTH') {
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      setDateFrom(start.toISOString().split('T')[0]);
      setDateTo(now.toISOString().split('T')[0]);
    } else if (preset === 'ALL') {
      setDateFrom('');
      setDateTo('');
    }
  };

  // Set initial preset
  useEffect(() => {
    applyDatePreset('30_DAYS');
  }, []);

  // Fetch both summary and experience insights
  const loadAllData = useCallback(async () => {
    if (!selectedMasterId) return;
    setIsLoading(true);
    setError('');
    try {
      const [sumRes, insRes] = await Promise.all([
        fetchSessionMonitoringSummaryApi({
          masterId: selectedMasterId,
          podId: selectedPodId,
          dateFrom: dateFrom || undefined,
          dateTo: dateTo || undefined,
          groupByPod
        }),
        fetchExperienceInsightsApi({
          masterId: selectedMasterId,
          podId: selectedPodId,
          dateFrom: dateFrom || undefined,
          dateTo: dateTo || undefined
        })
      ]);

      setSummaryRows(sumRes.rows || []);
      setInsights(insRes);
    } catch (err) {
      console.error('Error loading monitoring & experience data:', err);
      setError(err.message || 'Gagal memuat data monitoring');
    } finally {
      setIsLoading(false);
    }
  }, [selectedMasterId, selectedPodId, dateFrom, dateTo, groupByPod]);

  useEffect(() => {
    loadAllData();
  }, [loadAllData]);

  // Drilldown data loader
  const loadDrilldownData = useCallback(
    async (target, page = 1, search = '') => {
      if (!target || !selectedMasterId) return;
      setIsLoadingDrilldown(true);
      try {
        const rawDateStr = target.raw_date
          ? new Date(target.raw_date).toISOString().split('T')[0]
          : undefined;
        const res = await fetchSessionMonitoringDetailsApi({
          masterId: selectedMasterId,
          podId: target.pod_id || undefined,
          date: rawDateStr,
          page,
          limit: 25,
          search
        });
        setDrilldownSessions(res.rows || []);
        setDrilldownTotalRows(res.totalRows || 0);
        setDrilldownTotalPages(res.totalPages || 1);
        setDrilldownPage(res.page || 1);
      } catch (err) {
        console.error('Error loading drilldown sessions:', err);
      } finally {
        setIsLoadingDrilldown(false);
      }
    },
    [selectedMasterId]
  );

  const handleOpenDrilldown = (row) => {
    setDrilldownTarget(row);
    setDrilldownSearch('');
    loadDrilldownData(row, 1, '');
  };

  const handleCloseDrilldown = () => {
    setDrilldownTarget(null);
    setDrilldownSessions([]);
  };

  // In-memory filtered summary rows (excluding empty records or unregistered pods)
  const filteredRows = useMemo(() => {
    const base = (summaryRows || []).filter((r) => {
      if (!r) return false;
      if (Number(r.total_user) <= 0 || Number(r.total_session) <= 0) return false;
      if (groupByPod && (!r.pod_id || r.pod_name?.includes('Unknown'))) return false;
      return true;
    });

    if (!searchFilter.trim()) return base;
    const q = searchFilter.toLowerCase();
    return base.filter(
      (r) =>
        r.timestamp_session?.toLowerCase().includes(q) ||
        r.pod_name?.toLowerCase().includes(q) ||
        r.pod_id?.toLowerCase().includes(q)
    );
  }, [summaryRows, searchFilter, groupByPod]);

  // Export to CSV
  const handleExportCsv = () => {
    if (filteredRows.length === 0) return;
    let headers = ['timestamp_session', 'total_user', 'total_session'];
    if (groupByPod) headers.splice(1, 0, 'pod_name', 'pod_id');

    const csvLines = [headers.join(',')];
    filteredRows.forEach((r) => {
      const rowData = [
        `"${r.timestamp_session || ''}"`,
        ...(groupByPod ? [`"${r.pod_name || ''}"`, `"${r.pod_id || ''}"`] : []),
        r.total_user || 0,
        r.total_session || 0
      ];
      csvLines.push(rowData.join(','));
    });

    const blob = new Blob([csvLines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `session_monitoring_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="flex flex-col gap-6">
      {/* 1. Header Filter & Layout Controls */}
      <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-5 shadow-xl backdrop-blur-md">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 mb-4 border-b border-slate-800/80">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400">
              <Sparkles size={20} />
            </div>
            <div>
              <h3 className="text-base font-bold text-white tracking-wide flex items-center gap-2">
                <span>Experience & Therapy Analytics Dashboard</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
                  MODULAR WIDGETS
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                Analitik lagu terpopuler, jam sibuk terapi, performa armada POD, dan tabel harian
              </p>
            </div>
          </div>

          {/* Master DB & Action Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-2 bg-slate-950/70 border border-slate-800 rounded-xl px-3 py-1.5">
              <Database size={14} className="text-cyan-400" />
              <span className="text-xs text-slate-400">Master:</span>
              <select
                value={selectedMasterId || ''}
                onChange={(e) => onSelectMaster(Number(e.target.value))}
                className="bg-transparent text-white text-xs font-semibold focus:outline-none cursor-pointer"
              >
                {masters.map((m) => (
                  <option key={m.id} value={m.id} className="bg-slate-900 text-white">
                    {m.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Layout Preset Switchers (Grid vs Stacked) */}
            <div className="hidden sm:flex items-center gap-1 bg-slate-950/70 p-1 rounded-xl border border-slate-800">
              <button
                type="button"
                onClick={() => handleSetAllCardSizes('half')}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-900 transition-colors"
                title="Tampilan Grid Seimbang (2 Kolom)"
              >
                <Columns2 size={13} className="text-cyan-400" />
                <span>2 Kolom</span>
              </button>
              <button
                type="button"
                onClick={() => handleSetAllCardSizes('full')}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-900 transition-colors"
                title="Tampilan Lebar Penuh (Stacked 1 Kolom)"
              >
                <Square size={13} className="text-purple-400" />
                <span>Lebar Penuh</span>
              </button>
              <button
                type="button"
                onClick={handleResetCardLayout}
                className="p-1 rounded-lg text-slate-500 hover:text-slate-300 transition-colors"
                title="Reset Tata Letak Ukuran"
              >
                <RotateCcw size={12} />
              </button>
            </div>

            <button
              type="button"
              onClick={() => setIsCleanupModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-xs font-semibold text-rose-300 hover:text-rose-200 transition-colors"
              title="Bersihkan data orphan / UUID tidak terdaftar pada Master DB"
            >
              <Trash2 size={13} className="text-rose-400" />
              <span>Bersihkan Orphan POD</span>
            </button>

            <button
              type="button"
              onClick={loadAllData}
              disabled={isLoading}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-750 border border-slate-700 text-xs font-semibold text-slate-200 transition-colors disabled:opacity-50"
              title="Segarkan Data"
            >
              <RefreshCw size={13} className={isLoading ? 'animate-spin text-cyan-400' : ''} />
              <span>Refresh</span>
            </button>
          </div>
        </div>

        {/* Global Filters Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Unit POD Filter */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5 flex items-center gap-1">
              <Cpu size={12} className="text-amber-400" />
              Filter Unit POD
            </label>
            <select
              value={selectedPodId}
              onChange={(e) => setSelectedPodId(e.target.value)}
              className="w-full bg-slate-950/80 border border-slate-800 text-white text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-purple-500"
            >
              <option value="ALL">Semua Unit POD</option>
              {registeredPods.map((pod) => (
                <option key={pod.id} value={pod.pod_uuid}>
                  {pod.name || pod.code} ({pod.code})
                </option>
              ))}
            </select>
          </div>

          {/* Date Presets */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5 flex items-center gap-1">
              <Calendar size={12} className="text-purple-400" />
              Rentang Waktu
            </label>
            <div className="grid grid-cols-4 gap-1">
              {[
                { id: '7_DAYS', label: '7 Hari' },
                { id: '30_DAYS', label: '30 Hari' },
                { id: 'THIS_MONTH', label: 'Bulan Ini' },
                { id: 'ALL', label: 'Semua' }
              ].map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => applyDatePreset(p.id)}
                  className={`py-1.5 rounded-xl text-xs font-semibold border transition-all ${datePreset === p.id
                      ? 'bg-purple-500/20 text-purple-300 border-purple-500/50'
                      : 'bg-slate-950/60 text-slate-400 border-slate-800 hover:bg-slate-900'
                    }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Date From & Date To inputs */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[11px] text-slate-400 mb-1">Dari:</label>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => {
                  setDateFrom(e.target.value);
                  setDatePreset('CUSTOM');
                }}
                className="w-full bg-slate-950/80 border border-slate-800 text-white text-xs rounded-xl px-2.5 py-1.5 focus:outline-none focus:border-purple-500"
              />
            </div>
            <div>
              <label className="block text-[11px] text-slate-400 mb-1">Sampai:</label>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => {
                  setDateTo(e.target.value);
                  setDatePreset('CUSTOM');
                }}
                className="w-full bg-slate-950/80 border border-slate-800 text-white text-xs rounded-xl px-2.5 py-1.5 focus:outline-none focus:border-purple-500"
              />
            </div>
          </div>

          {/* Top KPI Badge Box */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-purple-950/20 border border-purple-500/30">
            <div>
              <span className="text-[10px] text-purple-300 uppercase font-semibold block">
                Total Sesi Terapi
              </span>
              <span className="text-xl font-black text-white font-mono">
                {(insights?.kpi?.startedSessions || 0).toLocaleString()}
              </span>
            </div>
            <div className="text-right">
              <span className="text-[10px] text-emerald-300 uppercase font-semibold block">
                Tuntas ({insights?.kpi?.completionRate || 100}%)
              </span>
              <span className="text-sm font-bold text-emerald-300 font-mono">
                {(insights?.kpi?.completedSessions || 0).toLocaleString()}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Global Error Banner */}
      {error && (
        <div className="p-4 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-center justify-between">
          <span>{error}</span>
          <button type="button" onClick={loadAllData} className="underline text-rose-200">
            Coba Lagi
          </button>
        </div>
      )}

      {/* 2. Modular Grid Container (Each card is adjustable) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* CARD 1: Most Played Sessions & Songs */}
        <ExperienceCardWrapper
          id="topSongs"
          title="Most Played Sessions & Songs"
          subtitle="Ranking konten terapi dan pemutaran lagu terpopuler"
          icon={Music}
          badge="TOP KONTEN"
          badgeColor="bg-amber-500/20 text-amber-300 border-amber-500/30"
          size={cardSizes.topSongs}
          onToggleSize={handleToggleCardSize}
          isCollapsed={collapsedCards.topSongs}
          onToggleCollapse={handleToggleCardCollapse}
        >
          <MostPlayedSongsCard songs={insights?.topSongs || []} isLoading={isLoading} />
        </ExperienceCardWrapper>

        {/* CARD 2: POD Fleet Activity & User Total */}
        <ExperienceCardWrapper
          id="podFleet"
          title="POD Fleet User & Session Total"
          subtitle="Distribusi sesi dan pengguna per masing-masing unit POD"
          icon={Cpu}
          badge="ARMADA POD"
          badgeColor="bg-cyan-500/20 text-cyan-300 border-cyan-500/30"
          size={cardSizes.podFleet}
          onToggleSize={handleToggleCardSize}
          isCollapsed={collapsedCards.podFleet}
          onToggleCollapse={handleToggleCardCollapse}
        >
          <PodFleetSummaryCard
            pods={insights?.podBreakdown || []}
            isLoading={isLoading}
            onSelectPod={(pId) => setSelectedPodId(pId)}
          />
        </ExperienceCardWrapper>

        {/* CARD 3: Peak Therapy Hours (Hourly Distribution) */}
        <ExperienceCardWrapper
          id="peakHours"
          title="Jam Sibuk Terapi (Hourly Peak Times)"
          subtitle="Distribusi waktu pemutaran terapi 24 jam dalam zona WIB"
          icon={Clock}
          badge="JAM SIBUK"
          badgeColor="bg-purple-500/20 text-purple-300 border-purple-500/30"
          size={cardSizes.peakHours}
          onToggleSize={handleToggleCardSize}
          isCollapsed={collapsedCards.peakHours}
          onToggleCollapse={handleToggleCardCollapse}
        >
          <PeakHoursCard hourly={insights?.hourlyDistribution || []} isLoading={isLoading} />
        </ExperienceCardWrapper>

        {/* CARD 4: Session Completion Ratio */}
        <ExperienceCardWrapper
          id="sessionCompletion"
          title="Rasio Penyelesaian Sesi"
          subtitle="Perbandingan sesi selesai tuntas vs dihentikan prematur"
          icon={TrendingUp}
          badge="COMPLETION"
          badgeColor="bg-emerald-500/20 text-emerald-300 border-emerald-500/30"
          size={cardSizes.sessionCompletion}
          onToggleSize={handleToggleCardSize}
          isCollapsed={collapsedCards.sessionCompletion}
          onToggleCollapse={handleToggleCardCollapse}
        >
          <SessionCompletionCard
            kpi={insights?.kpi || {}}
            sessionTypes={insights?.sessionTypes || []}
            isLoading={isLoading}
          />
        </ExperienceCardWrapper>

        {/* CARD 5: Daily User & Session Monitoring Table (The Main Table Card) */}
        <ExperienceCardWrapper
          id="dailyTable"
          title="Monitoring User & Session Harian"
          subtitle="Tabel agregasi total user dan sesi per tanggal dengan pemetaan nama POD"
          icon={Users}
          badge={`${filteredRows.length} Tanggal`}
          badgeColor="bg-blue-500/20 text-blue-300 border-blue-500/30"
          size={cardSizes.dailyTable}
          onToggleSize={handleToggleCardSize}
          isCollapsed={collapsedCards.dailyTable}
          onToggleCollapse={handleToggleCardCollapse}
          headerActions={
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleExportCsv}
                disabled={filteredRows.length === 0}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-purple-600/80 hover:bg-purple-600 border border-purple-500/40 text-[11px] font-semibold text-white transition-colors disabled:opacity-50"
                title="Unduh CSV"
              >
                <Download size={12} />
                <span className="hidden sm:inline">Export CSV</span>
              </button>
            </div>
          }
        >
          <div className="space-y-4">
            {/* Table Filter Sub-bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-xl bg-slate-950/60 border border-slate-800">
              {/* Grouping Mode Toggle */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400 font-medium">Mode:</span>
                <div className="grid grid-cols-2 gap-1 bg-slate-900 p-0.5 rounded-lg border border-slate-800">
                  <button
                    type="button"
                    onClick={() => setGroupByPod(false)}
                    className={`px-3 py-1 rounded-md text-xs font-bold transition-all ${!groupByPod ? 'bg-purple-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
                      }`}
                  >
                    Konsolidasi
                  </button>
                  <button
                    type="button"
                    onClick={() => setGroupByPod(true)}
                    className={`px-3 py-1 rounded-md text-xs font-bold transition-all ${groupByPod ? 'bg-purple-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
                      }`}
                  >
                    Per Unit POD
                  </button>
                </div>
              </div>

              {/* Table Search Input */}
              <div className="relative w-full sm:w-64">
                <Search size={13} className="absolute left-3 top-2.5 text-slate-500" />
                <input
                  type="text"
                  value={searchFilter}
                  onChange={(e) => setSearchFilter(e.target.value)}
                  placeholder="Cari September, POD..."
                  className="w-full bg-slate-900 border border-slate-800 text-white text-xs rounded-xl pl-8 pr-3 py-1.5 focus:outline-none focus:border-purple-500"
                />
              </div>
            </div>

            {/* Table */}
            <div className="rounded-xl border border-slate-800/80 overflow-hidden bg-slate-950/50">
              <div className="overflow-x-auto max-h-[500px]">
                <table className="w-full text-left border-collapse text-xs">
                  <thead className="sticky top-0 z-10">
                    <tr className="border-b border-slate-800 bg-slate-950 text-slate-300 font-semibold tracking-wider uppercase text-[11px]">
                      <th className="py-3 px-4">
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-cyan-500/10 text-cyan-300 border border-cyan-500/30">
                          <Users size={12} /> total_user
                        </span>
                      </th>
                      <th className="py-3 px-4">
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-purple-500/10 text-purple-300 border border-purple-500/30">
                          <Music size={12} /> total_session
                        </span>
                      </th>
                      <th className="py-3 px-4">
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-blue-500/10 text-blue-300 border border-blue-500/30">
                          <Calendar size={12} /> timestamp_session
                        </span>
                      </th>
                      {groupByPod && (
                        <th className="py-3 px-4">
                          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-amber-500/10 text-amber-300 border border-amber-500/30">
                            <Layers size={12} /> pod_name
                          </span>
                        </th>
                      )}
                      <th className="py-3 px-4 text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-mono">
                    {isLoading ? (
                      <tr>
                        <td colSpan={groupByPod ? 5 : 4} className="py-12 text-center text-slate-400">
                          <div className="flex flex-col items-center justify-center gap-2">
                            <RefreshCw size={24} className="animate-spin text-purple-400" />
                            <span className="text-xs font-sans">Mengambil data sesi dari Master RDS...</span>
                          </div>
                        </td>
                      </tr>
                    ) : filteredRows.length === 0 ? (
                      <tr>
                        <td colSpan={groupByPod ? 5 : 4} className="py-12 text-center text-slate-500 font-sans">
                          Tidak ada rekaman sesi ditemukan pada filter terpilih.
                        </td>
                      </tr>
                    ) : (
                      filteredRows.map((row, idx) => (
                        <tr
                          key={idx}
                          className="hover:bg-slate-800/40 transition-colors group cursor-pointer"
                          onClick={() => handleOpenDrilldown(row)}
                        >
                          <td className="py-3 px-4 font-bold text-white">
                            <span className="text-base font-black text-cyan-400">
                              {row.total_user}
                            </span>
                          </td>
                          <td className="py-3 px-4 font-bold text-white">
                            <span className="text-base font-black text-purple-300">
                              {row.total_session}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-slate-200 font-medium font-sans">
                            <div className="flex items-center gap-2">
                              <Calendar size={14} className="text-slate-500 shrink-0" />
                              <span className="font-semibold text-sm tracking-wide">
                                {row.timestamp_session}
                              </span>
                            </div>
                          </td>
                          {groupByPod && (
                            <td className="py-3 px-4 font-sans">
                              <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-amber-500/10 text-amber-300 border border-amber-500/30 text-xs font-bold">
                                <span>{row.pod_name}</span>
                              </div>
                            </td>
                          )}
                          <td className="py-3 px-4 text-right font-sans" onClick={(e) => e.stopPropagation()}>
                            <button
                              type="button"
                              onClick={() => handleOpenDrilldown(row)}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-purple-600 text-slate-300 hover:text-white border border-slate-700 hover:border-purple-500 text-xs transition-colors"
                              title="Lihat Rincian Sesi Lagu"
                            >
                              <Eye size={13} />
                              <span>Rincian</span>
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </ExperienceCardWrapper>
      </div>

      {/* 3. Drilldown Modal / Drawer */}
      {drilldownTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-4xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-950/60">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
                  <Music size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <span>Rincian Sesi: {drilldownTarget.timestamp_session}</span>
                    {drilldownTarget.pod_name && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                        {drilldownTarget.pod_name}
                      </span>
                    )}
                  </h3>
                  <p className="text-xs text-slate-400">
                    Daftar pemutaran sesi, lagu, tipe, dan durasi pada tanggal tersebut
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleCloseDrilldown}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Filter / Search */}
            <div className="p-3 border-b border-slate-800/80 bg-slate-950/40 flex items-center gap-2">
              <div className="relative flex-1">
                <Search size={13} className="absolute left-3 top-2.5 text-slate-500" />
                <input
                  type="text"
                  value={drilldownSearch}
                  onChange={(e) => {
                    setDrilldownSearch(e.target.value);
                    loadDrilldownData(drilldownTarget, 1, e.target.value);
                  }}
                  placeholder="Cari lagu, nama sesi, atau tipe..."
                  className="w-full bg-slate-900 border border-slate-800 text-white text-xs rounded-xl pl-8 pr-3 py-1.5 focus:outline-none focus:border-purple-500"
                />
              </div>
              <span className="text-xs text-slate-400 font-mono shrink-0">
                {drilldownTotalRows} sesi
              </span>
            </div>

            {/* Modal Table Content */}
            <div className="flex-1 overflow-y-auto p-4">
              {isLoadingDrilldown ? (
                <div className="flex flex-col items-center justify-center py-12 text-slate-400 gap-2">
                  <RefreshCw size={24} className="animate-spin text-purple-400" />
                  <span className="text-xs">Memuat daftar sesi...</span>
                </div>
              ) : drilldownSessions.length === 0 ? (
                <div className="text-center py-12 text-slate-500 text-xs">
                  Tidak ada rekaman sesi ditemukan.
                </div>
              ) : (
                <div className="space-y-2 font-mono">
                  {drilldownSessions.map((session) => (
                    <div
                      key={session.id}
                      className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 hover:border-slate-700 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                    >
                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-bold font-sans text-white truncate">
                            {session.session_name || 'Tanpa Nama'}
                          </span>
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30">
                            {session.session_type}
                          </span>
                          {session.pod_name && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">
                              {session.pod_name}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-cyan-300 truncate font-sans">
                          🎵 {session.song_title || 'Tidak ada info lagu'}
                        </p>
                      </div>

                      <div className="flex items-center gap-4 text-xs text-slate-400 shrink-0 font-sans">
                        {session.duration && session.duration !== 'undefined' && (
                          <span className="text-slate-300 bg-slate-900 px-2 py-1 rounded border border-slate-800">
                            ⏱️ {session.duration}s
                          </span>
                        )}
                        <span className="text-[11px] text-slate-500">
                          {new Date(session.created_at).toLocaleTimeString()}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Modal Pagination */}
            {drilldownTotalPages > 1 && (
              <div className="p-3 border-t border-slate-800 bg-slate-950/60 flex items-center justify-between text-xs text-slate-400">
                <span>
                  Halaman {drilldownPage} dari {drilldownTotalPages}
                </span>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() =>
                      loadDrilldownData(
                        drilldownTarget,
                        Math.max(1, drilldownPage - 1),
                        drilldownSearch
                      )
                    }
                    disabled={drilldownPage <= 1}
                    className="px-2.5 py-1 rounded-lg bg-slate-800 text-slate-300 disabled:opacity-40"
                  >
                    Sebelumnya
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      loadDrilldownData(
                        drilldownTarget,
                        Math.min(drilldownTotalPages, drilldownPage + 1),
                        drilldownSearch
                      )
                    }
                    disabled={drilldownPage >= drilldownTotalPages}
                    className="px-2.5 py-1 rounded-lg bg-slate-800 text-slate-300 disabled:opacity-40"
                  >
                    Selanjutnya
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Cleanup Orphan Pods Modal */}
      <CleanupOrphanPodsModal
        isOpen={isCleanupModalOpen}
        onClose={() => setIsCleanupModalOpen(false)}
        masterId={selectedMasterId}
        masterName={masters.find((m) => m.id === selectedMasterId)?.name}
        onCleanupSuccess={() => {
          loadAllData();
          if (onDataCleaned) onDataCleaned();
        }}
      />
    </div>
  );
}
