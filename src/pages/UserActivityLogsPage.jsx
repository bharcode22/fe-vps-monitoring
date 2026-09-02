import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  ShieldAlert,
  ShieldCheck,
  Activity,
  Users,
  Radio,
  RefreshCw,
  Download,
  Search,
  Filter,
  Clock,
  Globe,
  Layers,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Eye,
  X,
  FileText,
  Calendar,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Laptop
} from 'lucide-react';
import io from 'socket.io-client';
import { SOCKET_URL } from '../config';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import {
  fetchActiveUsersApi,
  fetchActivityLogsApi,
  fetchActivityStatsApi,
  exportActivityLogsApi
} from '../api/activityLogsApi';

export default function UserActivityLogsPage({ onBack }) {
  const { user } = useAuth();
  const { t } = useLanguage();
  const isSuperAdmin = user?.role === 'super_admin';

  // Real-time Active Users
  const [activeUsers, setActiveUsers] = useState([]);
  const [totalActiveUsers, setTotalActiveUsers] = useState(0);
  const [isLoadingActiveUsers, setIsLoadingActiveUsers] = useState(true);

  // Activity Logs & Stats
  const [logs, setLogs] = useState([]);
  const [pagination, setPagination] = useState({ total: 0, page: 1, limit: 25, totalPages: 1 });
  const [stats, setStats] = useState({
    todayActions: 0,
    totalActions: 0,
    failedActions: 0,
    topUsers: [],
    categoryStats: []
  });
  const [isLoadingLogs, setIsLoadingLogs] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSocketConnected, setIsSocketConnected] = useState(false);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [selectedStatus, setSelectedStatus] = useState('ALL');
  const [datePreset, setDatePreset] = useState('ALL'); // 'ALL' | 'TODAY' | '7DAYS' | '30DAYS'
  const [liveStreamEnabled, setLiveStreamEnabled] = useState(true);

  // Detail Modal
  const [selectedLogDetail, setSelectedLogDetail] = useState(null);
  const [isExporting, setIsExporting] = useState(false);

  // Live timer tick for relative time
  const [nowTime, setNowTime] = useState(Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNowTime(Date.now()), 2000);
    return () => clearInterval(timer);
  }, []);

  // 1. Initial Data Fetch
  useEffect(() => {
    if (!isSuperAdmin) return;
    loadAllData();
  }, [isSuperAdmin]);

  // 2. Filter Change Effect
  useEffect(() => {
    if (!isSuperAdmin) return;
    loadLogsData(1);
  }, [selectedCategory, selectedStatus, datePreset, searchQuery]);

  // 3. Socket.IO Real-Time Connection
  useEffect(() => {
    if (!isSuperAdmin) return;

    const socket = io(SOCKET_URL, {
      transports: ['websocket', 'polling']
    });

    socket.on('connect', () => {
      setIsSocketConnected(true);
      socket.emit('presence:request-snapshot');
    });

    socket.on('disconnect', () => {
      setIsSocketConnected(false);
    });

    // Real-time active users presence update
    socket.on('presence:users-update', (data) => {
      if (data) {
        setActiveUsers(data.activeUsers || []);
        setTotalActiveUsers(data.totalActiveUsers || 0);
        setIsLoadingActiveUsers(false);
      }
    });

    // Real-time new activity stream
    socket.on('user-activity:new', (newLog) => {
      if (!newLog) return;
      if (liveStreamEnabled) {
        setLogs((prev) => [newLog, ...prev.slice(0, 99)]);
        setPagination((prev) => ({ ...prev, total: prev.total + 1 }));
        setStats((prev) => ({
          ...prev,
          todayActions: prev.todayActions + 1,
          totalActions: prev.totalActions + 1,
          failedActions: newLog.status !== 'SUCCESS' ? prev.failedActions + 1 : prev.failedActions
        }));
      }
    });

    return () => {
      socket.disconnect();
    };
  }, [isSuperAdmin, liveStreamEnabled]);

  const loadAllData = async () => {
    setIsRefreshing(true);
    await Promise.all([
      loadActiveUsers(),
      loadStats(),
      loadLogsData(pagination.page)
    ]);
    setIsRefreshing(false);
  };

  const loadActiveUsers = async () => {
    try {
      setIsLoadingActiveUsers(true);
      const res = await fetchActiveUsersApi();
      if (res.success) {
        setActiveUsers(res.activeUsers || []);
        setTotalActiveUsers(res.totalActiveUsers || 0);
      }
    } catch (err) {
      console.error('Failed to load active users:', err);
    } finally {
      setIsLoadingActiveUsers(false);
    }
  };

  const loadStats = async () => {
    try {
      const res = await fetchActivityStatsApi();
      if (res.success && res.stats) {
        setStats(res.stats);
      }
    } catch (err) {
      console.error('Failed to load activity stats:', err);
    }
  };

  const calculateDateRange = () => {
    const now = new Date();
    if (datePreset === 'TODAY') {
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      return { dateFrom: startOfDay.toISOString(), dateTo: now.toISOString() };
    }
    if (datePreset === '7DAYS') {
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      return { dateFrom: sevenDaysAgo.toISOString(), dateTo: now.toISOString() };
    }
    if (datePreset === '30DAYS') {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      return { dateFrom: thirtyDaysAgo.toISOString(), dateTo: now.toISOString() };
    }
    return { dateFrom: null, dateTo: null };
  };

  const loadLogsData = async (page = 1) => {
    try {
      setIsLogsLoading(true);
      const { dateFrom, dateTo } = calculateDateRange();
      const res = await fetchActivityLogsApi({
        page,
        limit: pagination.limit,
        category: selectedCategory !== 'ALL' ? selectedCategory : undefined,
        status: selectedStatus !== 'ALL' ? selectedStatus : undefined,
        search: searchQuery.trim() || undefined,
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined
      });

      if (res.success) {
        setLogs(res.logs || []);
        setPagination(res.pagination || { total: 0, page: 1, limit: 25, totalPages: 1 });
      }
    } catch (err) {
      console.error('Failed to load activity logs:', err);
    } finally {
      setIsLogsLoading(false);
    }
  };

  const setIsLogsLoading = (val) => setIsLoadingLogs(val);

  const handleExport = async (format = 'csv') => {
    try {
      setIsExporting(true);
      const { dateFrom, dateTo } = calculateDateRange();
      const data = await exportActivityLogsApi({
        format,
        category: selectedCategory !== 'ALL' ? selectedCategory : undefined,
        status: selectedStatus !== 'ALL' ? selectedStatus : undefined,
        search: searchQuery.trim() || undefined,
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined
      });

      if (format === 'csv') {
        const url = window.URL.createObjectURL(new Blob([data]));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `audit_logs_${new Date().toISOString().slice(0, 10)}.csv`);
        document.body.appendChild(link);
        link.click();
        link.remove();
      } else {
        const jsonStr = JSON.stringify(data, null, 2);
        const blob = new Blob([jsonStr], { type: 'application/json' });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `audit_logs_${new Date().toISOString().slice(0, 10)}.json`);
        document.body.appendChild(link);
        link.click();
        link.remove();
      }
    } catch (err) {
      alert(`Gagal mengekspor log: ${err.message}`);
    } finally {
      setIsExporting(false);
    }
  };

  const formatRelativeTime = (timestamp) => {
    if (!timestamp) return '—';
    const diffSec = Math.max(0, Math.floor((nowTime - new Date(timestamp).getTime()) / 1000));
    if (diffSec < 5) return t('common.justNow', null, 'Baru saja');
    if (diffSec < 60) return t('common.secondsAgo', { count: diffSec }, `${diffSec} detik lalu`);
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return t('common.minutesAgo', { count: diffMin }, `${diffMin} menit lalu`);
    const diffHour = Math.floor(diffMin / 60);
    if (diffHour < 24) return t('common.hoursAgo', { count: diffHour }, `${diffHour} jam lalu`);
    const diffDays = Math.floor(diffHour / 24);
    return t('common.daysAgo', { count: diffDays }, `${diffDays} hari lalu`);
  };

  const getCategoryColor = (cat) => {
    switch (String(cat).toUpperCase()) {
      case 'AUTH':
        return 'bg-purple-500/20 text-purple-300 border-purple-500/40';
      case 'MULTIMEDIA':
        return 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40';
      case 'STORAGE':
        return 'bg-sky-500/20 text-sky-300 border-sky-500/40';
      case 'POD_ACTIVITY':
        return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40';
      case 'DEPLOYMENT':
        return 'bg-blue-500/20 text-blue-300 border-blue-500/40';
      case 'SERVER':
        return 'bg-amber-500/20 text-amber-300 border-amber-500/40';
      case 'SYNC':
        return 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40';
      case 'USERS':
        return 'bg-rose-500/20 text-rose-300 border-rose-500/40';
      default:
        return 'bg-slate-700/50 text-slate-300 border-slate-600/50';
    }
  };

  // RESTRICT ACCESS IF NOT SUPER ADMIN
  if (!isSuperAdmin) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[500px] p-8 text-center animate-in fade-in duration-200">
        <div className="p-4 bg-rose-500/10 border border-rose-500/30 rounded-3xl mb-4 shadow-xl">
          <ShieldAlert size={48} className="text-rose-400" />
        </div>
        <h2 className="text-xl font-black text-white">{t('common.restrictedAccess', null, 'Akses Ditolak (Super Admin Only)')}</h2>
        <p className="text-sm text-slate-400 max-w-md mt-2">
          {t('common.restrictedDesc', null, 'Halaman Pemantauan Aktivitas Pengguna & Audit Logs hanya dapat diakses oleh akun Super Admin berwenang.')}
        </p>
        <button
          onClick={onBack}
          className="mt-6 px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold transition-all cursor-pointer border border-slate-700 shadow"
        >
          {t('common.backToDashboard', null, 'Kembali ke Dashboard')}
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 w-full animate-in fade-in duration-200 text-slate-100">
      {/* 1. TOP HEADER & CONTROLS */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 bg-slate-900/80 border border-slate-800/90 p-5 rounded-2xl backdrop-blur-xl shadow-xl">
        <div className="flex items-start sm:items-center gap-3.5">
          <div className="p-3 bg-gradient-to-br from-amber-500/20 via-cyan-500/20 to-blue-500/20 text-amber-300 border border-amber-500/30 rounded-2xl shadow-inner">
            <ShieldCheck size={26} />
          </div>
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                {t('userActivity.title', null, 'User Activity & Audit Logs')}
              </h1>
              <span className="text-xs font-mono px-2.5 py-0.5 bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded-full font-bold inline-flex items-center gap-1.5 shadow-sm">
                <Sparkles size={12} className="text-amber-400" />
                {t('userActivity.exclusiveBadge', null, 'Super Admin Exclusive')}
              </span>
              <span className="text-xs font-mono px-2 py-0.5 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-md font-bold inline-flex items-center gap-1">
                <Radio size={11} className={isSocketConnected ? 'animate-pulse text-emerald-400' : 'text-slate-400'} />
                {isSocketConnected ? t('userActivity.liveSocketActive', null, 'Live Socket Active') : t('common.connecting', null, 'Connecting...')}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              {t('userActivity.subtitle', null, 'Pantau siapa saja pengguna yang sedang online secara real-time dan rekam jejak audit interaksi sistem.')}
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2.5 flex-wrap self-end lg:self-center">
          <button
            type="button"
            onClick={loadAllData}
            disabled={isRefreshing}
            className="px-3.5 py-2 bg-slate-800/80 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold border border-slate-700/60 transition flex items-center gap-2 cursor-pointer shadow-sm disabled:opacity-50"
            title={t('common.refresh', null, 'Segarkan')}
          >
            <RefreshCw size={14} className={isRefreshing ? 'animate-spin text-cyan-400' : ''} />
            <span>{t('common.refresh', null, 'Segarkan')}</span>
          </button>

          {/* Export Dropdown / Buttons */}
          <div className="flex items-center gap-1 bg-slate-950/80 p-1 rounded-xl border border-slate-800/90 shadow-inner">
            <button
              type="button"
              onClick={() => handleExport('csv')}
              disabled={isExporting}
              className="px-3 py-1.5 bg-slate-800/80 hover:bg-cyan-500/20 text-slate-300 hover:text-cyan-300 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <Download size={13} />
              <span>CSV</span>
            </button>
            <button
              type="button"
              onClick={() => handleExport('json')}
              disabled={isExporting}
              className="px-3 py-1.5 bg-slate-800/80 hover:bg-purple-500/20 text-slate-300 hover:text-purple-300 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <FileText size={13} />
              <span>JSON</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. 🟢 REAL-TIME ACTIVE / ONLINE USERS PANEL */}
      <div className="bg-slate-900/80 border border-slate-800/90 rounded-2xl p-5 backdrop-blur-xl shadow-xl">
        <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
          <div className="flex items-center gap-2.5">
            <div className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500 shadow-[0_0_8px_rgba(52,211,153,1)]" />
            </div>
            <h2 className="text-base font-black text-white tracking-wide">
              {t('userActivity.activeUsers.title', null, 'Pengguna Sedang Online Saat Ini')}
            </h2>
            <span className="px-2.5 py-0.5 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-full font-mono text-xs font-bold">
              {t('userActivity.activeUsers.badge', { count: totalActiveUsers }, `${totalActiveUsers} User Aktif`)}
            </span>
          </div>

          <span className="text-[11px] font-mono text-slate-400">
            {t('userActivity.activeUsers.sub', null, 'Terhubung via WebSocket presence stream')}
          </span>
        </div>

        {isLoadingActiveUsers ? (
          <div className="py-8 text-center text-slate-400 text-xs font-medium flex items-center justify-center gap-2">
            <RefreshCw size={16} className="animate-spin text-cyan-400" />
            <span>{t('common.loading', null, 'Memeriksa pengguna yang sedang online...')}</span>
          </div>
        ) : activeUsers.length === 0 ? (
          <div className="py-8 text-center text-slate-500 text-xs font-medium bg-slate-950/40 rounded-xl border border-slate-800/60">
            {t('userActivity.activeUsers.noOtherUsers', null, 'Tidak ada pengguna lain yang sedang aktif selain sesi Anda.')}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3.5">
            {activeUsers.map((u) => {
              const isCurrentUser = u.email?.toLowerCase() === user?.email?.toLowerCase();
              return (
                <div
                  key={u.email}
                  className={`p-4 rounded-xl border transition-all duration-300 relative overflow-hidden flex items-start gap-3.5 shadow-md ${
                    isCurrentUser
                      ? 'bg-gradient-to-br from-cyan-950/30 via-slate-900/90 to-slate-900/90 border-cyan-500/40 shadow-cyan-500/5'
                      : 'bg-slate-950/60 border-slate-800/90 hover:border-slate-700/80 hover:bg-slate-900/80'
                  }`}
                >
                  {/* Glowing Corner Accent */}
                  <div className="absolute -top-6 -right-6 w-16 h-16 rounded-full blur-xl bg-emerald-500/10 pointer-events-none" />

                  {/* User Avatar */}
                  <div className="relative shrink-0">
                    {u.picture ? (
                      <img
                        src={u.picture}
                        alt={u.name}
                        className="w-10 h-10 rounded-full border border-slate-700 object-cover shadow"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-slate-700 to-slate-800 border border-slate-600 flex items-center justify-center text-white font-bold text-sm shadow">
                        {u.name?.charAt(0) || u.email?.charAt(0) || 'U'}
                      </div>
                    )}
                    <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-emerald-500 border-2 border-slate-900 shadow-[0_0_6px_rgba(52,211,153,1)]" />
                  </div>

                  {/* User Info & Current Page */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-1.5">
                      <div className="flex items-center gap-1.5 truncate">
                        <span className="font-bold text-xs text-white truncate" title={u.name}>
                          {u.name}
                        </span>
                        {isCurrentUser && (
                          <span className="text-[9px] font-mono px-1.5 py-0.2 bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 rounded font-bold shrink-0">
                            {t('userActivity.activeUsers.you', null, 'Anda')}
                          </span>
                        )}
                      </div>
                      <span className={`text-[9px] font-mono font-bold px-2 py-0.5 rounded-full border uppercase shrink-0 ${
                        u.role === 'super_admin'
                          ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                          : 'bg-blue-500/20 text-blue-300 border-blue-500/40'
                      }`}>
                        {u.role}
                      </span>
                    </div>

                    <div className="text-[10px] font-mono text-slate-400 truncate mt-0.5">
                      {u.email}
                    </div>

                    {/* Active Viewing Page */}
                    <div className="mt-2 flex items-center gap-1.5 text-[10.5px] bg-slate-900/90 px-2.5 py-1 rounded-lg border border-slate-800 text-cyan-300 font-medium truncate">
                      <Laptop size={11} className="text-cyan-400 shrink-0" />
                      <span className="truncate" title={u.currentViewLabel}>
                        {u.currentView === 'dashboard' ? t('navbar.items.dashboard', null, 'Dashboard Monitoring') :
                         u.currentView === 'server-list' ? t('navbar.items.serverList', null, 'Server List') :
                         u.currentView === 'pod-activity' || u.currentView === 'pod-occupancy' ? t('navbar.items.podActivity', null, 'POD Activity Real-Time') :
                         u.currentView === 'multimedia-sync' || u.currentView === 'content-manager' ? t('navbar.items.multimediaSync', null, 'Content Management') :
                         u.currentView === 'storage-manager' || u.currentView === 'storage' ? t('navbar.items.storageManager', null, 'Storage Manager') :
                         u.currentView === 'pod-logs-sync' || u.currentView === 'pod-logs' ? t('navbar.items.podLogsSync', null, 'POD Logs Sync') :
                         u.currentView === 'master-pod-sync' || u.currentView === 'master-sync' ? t('navbar.items.masterPodSync', null, 'Master POD Sync Matrix') :
                         u.currentView === 'tnc-sync-manager' ? t('navbar.items.tncSync', null, 'T&C Sync Manager') :
                         u.currentView === 'sync' ? t('navbar.items.databaseSync', null, 'Database Sync') :
                         u.currentView === 'user-activity' ? t('navbar.items.userActivity', null, 'User Activity & Audit Logs') :
                         u.currentView === 'settings' ? t('navbar.items.settings', null, 'Settings & Preferences') :
                         (u.currentViewLabel || 'Dashboard Monitoring')}
                      </span>
                    </div>

                    {/* Duration & IP */}
                    <div className="mt-2 flex items-center justify-between text-[9.5px] font-mono text-slate-500">
                      <span className="flex items-center gap-1">
                        <Clock size={10} />
                        <span>{formatRelativeTime(u.lastSeenAt)}</span>
                      </span>
                      <span className="flex items-center gap-1" title={u.ipAddress}>
                        <Globe size={10} />
                        <span className="truncate max-w-[90px]">{u.ipAddress || 'LAN'}</span>
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 3. KPI METRIC CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Aksi Hari Ini */}
        <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800/90 backdrop-blur-md shadow-lg relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">{t('userActivity.kpi.todayActions', null, 'Aksi Hari Ini')}</span>
            <div className="p-2 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-xl">
              <Activity size={18} />
            </div>
          </div>
          <div className="text-2xl font-black font-mono text-white mt-2">
            {stats.todayActions.toLocaleString()}
          </div>
          <span className="text-[10px] font-mono text-emerald-400/90 mt-1 block">
            ● {t('userActivity.kpi.todaySubtitle', null, 'Tercatat sejak 00:00 WIB')}
          </span>
        </div>

        {/* Card 2: Total Keseluruhan Log */}
        <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800/90 backdrop-blur-md shadow-lg relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">{t('userActivity.kpi.totalAudit', null, 'Total Audit Trail')}</span>
            <div className="p-2 bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 rounded-xl">
              <Layers size={18} />
            </div>
          </div>
          <div className="text-2xl font-black font-mono text-white mt-2">
            {stats.totalActions.toLocaleString()}
          </div>
          <span className="text-[10px] font-mono text-slate-400 mt-1 block">
            {t('userActivity.kpi.totalSubtitle', null, 'Tersimpan di PostgreSQL RDS')}
          </span>
        </div>

        {/* Card 3: Aksi Gagal / Ditolak */}
        <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800/90 backdrop-blur-md shadow-lg relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">{t('userActivity.kpi.failedActions', null, 'Aksi Gagal / Ditolak')}</span>
            <div className="p-2 bg-rose-500/10 text-rose-400 border border-rose-500/20 rounded-xl">
              <AlertTriangle size={18} />
            </div>
          </div>
          <div className={`text-2xl font-black font-mono mt-2 ${stats.failedActions > 0 ? 'text-rose-400' : 'text-slate-300'}`}>
            {stats.failedActions.toLocaleString()}
          </div>
          <span className="text-[10px] font-mono text-slate-400 mt-1 block">
            {stats.failedActions > 0 ? t('userActivity.kpi.failedAlert', null, 'Perlu peninjauan audit') : t('userActivity.kpi.failedNormal', null, 'Semua eksekusi normal')}
          </span>
        </div>

        {/* Card 4: Pengguna Teraktif (7 Hari) */}
        <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800/90 backdrop-blur-md shadow-lg relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">{t('userActivity.kpi.topUser', null, 'Top User Teraktif')}</span>
            <div className="p-2 bg-purple-500/10 text-purple-400 border border-purple-500/20 rounded-xl">
              <Users size={18} />
            </div>
          </div>
          <div className="text-sm font-black text-white mt-2 truncate">
            {stats.topUsers[0]?.user_name || stats.topUsers[0]?.user_email || '—'}
          </div>
          <span className="text-[10px] font-mono text-purple-300 mt-1 block">
            {stats.topUsers[0] ? `${stats.topUsers[0].count} actions (7d)` : '—'}
          </span>
        </div>
      </div>

      {/* 4. FILTER & SEARCH TOOLBAR */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 bg-slate-900/80 border border-slate-800/90 p-4 rounded-2xl backdrop-blur-xl shadow-xl">
        {/* Search Input */}
        <div className="relative flex-1 max-w-md">
          <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari user, email, aksi, target, atau IP..."
            className="w-full bg-slate-950/80 border border-slate-800 text-slate-200 text-xs rounded-xl pl-9 pr-3.5 py-2 focus:outline-none focus:border-cyan-500/80 focus:ring-1 focus:ring-cyan-500/30 transition-all font-medium placeholder:text-slate-500 shadow-inner"
          />
        </div>

        {/* Category & Status Filters */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Category Dropdown */}
          <div className="flex items-center gap-1.5 bg-slate-950/80 px-2.5 py-1.5 rounded-xl border border-slate-800">
            <Filter size={12} className="text-slate-400" />
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="bg-transparent text-xs font-bold text-slate-300 focus:outline-none cursor-pointer"
            >
              <option value="ALL" className="bg-slate-900">Semua Kategori</option>
              <option value="MULTIMEDIA" className="bg-slate-900">🎬 Multimedia</option>
              <option value="STORAGE" className="bg-slate-900">💾 Storage</option>
              <option value="POD_ACTIVITY" className="bg-slate-900">🕹️ POD Activity</option>
              <option value="AUTH" className="bg-slate-900">🔐 Autentikasi</option>
              <option value="DEPLOYMENT" className="bg-slate-900">🚀 Deployment</option>
              <option value="SERVER" className="bg-slate-900">🖥️ Server</option>
              <option value="SYNC" className="bg-slate-900">🔄 Database Sync</option>
              <option value="USERS" className="bg-slate-900">👥 User Management</option>
            </select>
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-1 bg-slate-950/80 p-1 rounded-xl border border-slate-800">
            {['ALL', 'SUCCESS', 'FAILED', 'DENIED'].map((st) => (
              <button
                key={st}
                onClick={() => setSelectedStatus(st)}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  selectedStatus === st
                    ? st === 'SUCCESS'
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                      : st === 'FAILED'
                      ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                      : st === 'DENIED'
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                      : 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {st === 'ALL' ? 'Semua Status' : st}
              </button>
            ))}
          </div>

          {/* Date Preset */}
          <div className="flex items-center gap-1 bg-slate-950/80 p-1 rounded-xl border border-slate-800">
            {[
              { id: 'ALL', label: 'Semua Waktu' },
              { id: 'TODAY', label: 'Hari Ini' },
              { id: '7DAYS', label: '7 Hari' },
              { id: '30DAYS', label: '30 Hari' }
            ].map((d) => (
              <button
                key={d.id}
                onClick={() => setDatePreset(d.id)}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  datePreset === d.id
                    ? 'bg-slate-800 text-white border border-slate-700 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {d.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 5. AUDIT LOGS TABLE */}
      <div className="bg-slate-900/80 border border-slate-800/90 rounded-2xl shadow-xl overflow-hidden w-full">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[920px]">
            <thead>
              <tr className="bg-slate-950/95 border-b border-slate-800 text-[10.5px] font-extrabold uppercase tracking-wider text-slate-400">
                <th className="py-3 px-4">{t('userActivity.table.time', null, 'Waktu')}</th>
                <th className="py-3 px-4">{t('userActivity.table.user', null, 'Pengguna')}</th>
                <th className="py-3 px-3">{t('userActivity.table.category', null, 'Kategori')}</th>
                <th className="py-3 px-4">{t('userActivity.table.actionTarget', null, 'Aksi & Target')}</th>
                <th className="py-3 px-4">{t('userActivity.table.description', null, 'Deskripsi')}</th>
                <th className="py-3 px-3">{t('userActivity.table.ipClient', null, 'IP & Klien')}</th>
                <th className="py-3 px-3 text-center">{t('userActivity.table.status', null, 'Status')}</th>
                <th className="py-3 px-3 text-center">{t('userActivity.table.detail', null, 'Detail')}</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-800/60 text-xs">
              {isLoadingLogs ? (
                <tr>
                  <td colSpan={8} className="py-16 text-center text-slate-400">
                    <RefreshCw size={24} className="animate-spin mx-auto mb-2 text-cyan-400" />
                    <span>{t('common.loading', null, 'Memuat catatan audit log...')}</span>
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-16 text-center text-slate-500 font-medium">
                    {t('userActivity.table.noLogs', null, 'Tidak ada catatan aktivitas yang cocok dengan filter ini.')}
                  </td>
                </tr>
              ) : (
                logs.map((log) => {
                  const isSuccess = log.status === 'SUCCESS';
                  const isDenied = log.status === 'DENIED';

                  return (
                    <tr
                      key={log.id}
                      className="hover:bg-slate-800/20 transition-colors duration-150"
                    >
                      {/* Waktu */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="flex flex-col">
                          <span className="font-bold text-slate-200 text-xs">
                            {formatRelativeTime(log.created_at)}
                          </span>
                          <span className="text-[10px] font-mono text-slate-500">
                            {new Date(log.created_at).toLocaleTimeString('id-ID', { hour12: false })} • {new Date(log.created_at).toLocaleDateString('id-ID')}
                          </span>
                        </div>
                      </td>

                      {/* Pengguna */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-cyan-300 font-bold text-xs shrink-0">
                            {log.user_name?.charAt(0) || log.user_email?.charAt(0) || 'U'}
                          </div>
                          <div className="min-w-0 flex flex-col">
                            <span className="font-bold text-white text-xs truncate max-w-[130px]" title={log.user_name}>
                              {log.user_name || 'System'}
                            </span>
                            <span className="text-[10px] font-mono text-slate-400 truncate max-w-[140px]" title={log.user_email}>
                              {log.user_email}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Kategori */}
                      <td className="py-3 px-3">
                        <span className={`inline-block px-2.5 py-0.5 rounded-full text-[9.5px] font-mono font-bold border uppercase ${getCategoryColor(log.category)}`}>
                          {log.category}
                        </span>
                      </td>

                      {/* Aksi & Target */}
                      <td className="py-3 px-4">
                        <div className="flex flex-col">
                          <span className="font-mono font-black text-xs text-white">
                            {log.action}
                          </span>
                          {log.target && (
                            <span className="text-[10px] font-mono text-cyan-300 bg-slate-950/60 px-1.5 py-0.2 rounded border border-slate-800 mt-0.5 inline-block truncate max-w-[150px]" title={log.target}>
                              {log.target}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Deskripsi */}
                      <td className="py-3 px-4">
                        <p className="text-xs text-slate-300 line-clamp-2 max-w-[260px]" title={log.description}>
                          {log.description || '—'}
                        </p>
                      </td>

                      {/* IP & Klien */}
                      <td className="py-3 px-3">
                        <div className="flex flex-col font-mono text-[10px] text-slate-400">
                          <span className="text-slate-300 font-bold">{log.ip_address || 'LAN'}</span>
                          <span className="text-slate-500 truncate max-w-[100px]" title={log.user_agent}>
                            {log.user_agent?.includes('Mac') ? 'Mac OS' : log.user_agent?.includes('Windows') ? 'Windows' : log.user_agent?.includes('Linux') ? 'Linux' : 'Client'}
                          </span>
                        </div>
                      </td>

                      {/* Status */}
                      <td className="py-3 px-3 text-center">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-black border uppercase ${
                          isSuccess
                            ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                            : isDenied
                            ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                            : 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                        }`}>
                          {isSuccess ? <CheckCircle2 size={11} /> : isDenied ? <AlertTriangle size={11} /> : <XCircle size={11} />}
                          <span>{log.status}</span>
                        </span>
                      </td>

                      {/* Detail Button */}
                      <td className="py-3 px-3 text-center">
                        <button
                          type="button"
                          onClick={() => setSelectedLogDetail(log)}
                          className="p-1.5 bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg border border-slate-700/60 transition cursor-pointer shadow-sm"
                          title="Lihat detail payload JSON"
                        >
                          <Eye size={13} />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="flex items-center justify-between px-5 py-3.5 bg-slate-950/80 border-t border-slate-800 text-xs text-slate-400 flex-wrap gap-3">
          <div className="font-mono text-xs">
            Menampilkan <span className="text-white font-bold">{logs.length}</span> dari <span className="text-white font-bold">{pagination.total}</span> log total
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={pagination.page <= 1 || isLoadingLogs}
              onClick={() => loadLogsData(pagination.page - 1)}
              className="px-3 py-1.5 bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg border border-slate-700/60 transition flex items-center gap-1 cursor-pointer disabled:opacity-40"
            >
              <ChevronLeft size={14} />
              <span>Sebelumnya</span>
            </button>

            <span className="font-mono text-xs px-2 text-slate-300 font-bold">
              Hal {pagination.page} / {pagination.totalPages || 1}
            </span>

            <button
              type="button"
              disabled={pagination.page >= pagination.totalPages || isLoadingLogs}
              onClick={() => loadLogsData(pagination.page + 1)}
              className="px-3 py-1.5 bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg border border-slate-700/60 transition flex items-center gap-1 cursor-pointer disabled:opacity-40"
            >
              <span>Berikutnya</span>
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* 6. DETAIL PAYLOAD MODAL */}
      {selectedLogDetail && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-5 border-b border-slate-800 bg-slate-950/60">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-cyan-500/10 text-cyan-400 rounded-xl border border-cyan-500/20">
                  <FileText size={18} />
                </div>
                <div>
                  <h3 className="text-base font-black text-white">Detail Audit Log #{selectedLogDetail.id}</h3>
                  <p className="text-[11px] font-mono text-slate-400">
                    {new Date(selectedLogDetail.created_at).toLocaleString('id-ID')}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setSelectedLogDetail(null)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 space-y-4 overflow-y-auto custom-scrollbar text-xs">
              {/* Summary Badges */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <div className="bg-slate-950/60 p-2.5 rounded-xl border border-slate-800">
                  <span className="text-[10px] text-slate-500 font-bold block">PENGGUNA</span>
                  <span className="font-bold text-white truncate block">{selectedLogDetail.user_name}</span>
                  <span className="text-[9.5px] font-mono text-slate-400 truncate block">{selectedLogDetail.user_email}</span>
                </div>
                <div className="bg-slate-950/60 p-2.5 rounded-xl border border-slate-800">
                  <span className="text-[10px] text-slate-500 font-bold block">AKSI</span>
                  <span className="font-mono font-black text-cyan-300 block">{selectedLogDetail.action}</span>
                  <span className="text-[9.5px] font-mono text-slate-400 block">{selectedLogDetail.category}</span>
                </div>
                <div className="bg-slate-950/60 p-2.5 rounded-xl border border-slate-800">
                  <span className="text-[10px] text-slate-500 font-bold block">STATUS</span>
                  <span className={`font-mono font-black block ${selectedLogDetail.status === 'SUCCESS' ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {selectedLogDetail.status}
                  </span>
                </div>
                <div className="bg-slate-950/60 p-2.5 rounded-xl border border-slate-800">
                  <span className="text-[10px] text-slate-500 font-bold block">IP CLIENT</span>
                  <span className="font-mono font-bold text-white block">{selectedLogDetail.ip_address || '127.0.0.1'}</span>
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                  Deskripsi Lengkap
                </label>
                <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800 text-slate-200">
                  {selectedLogDetail.description || 'Tidak ada deskripsi tambahan.'}
                </div>
              </div>

              {/* Target & User Agent */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                    Target Objek
                  </label>
                  <div className="p-2.5 bg-slate-950/60 rounded-xl border border-slate-800 font-mono text-cyan-300">
                    {selectedLogDetail.target || '—'}
                  </div>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                    User Agent
                  </label>
                  <div className="p-2.5 bg-slate-950/60 rounded-xl border border-slate-800 font-mono text-slate-400 truncate" title={selectedLogDetail.user_agent}>
                    {selectedLogDetail.user_agent || '—'}
                  </div>
                </div>
              </div>

              {/* Raw JSON Details */}
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                  Payload Metadata (JSON)
                </label>
                <pre className="p-3 bg-slate-950 rounded-xl border border-slate-800/90 font-mono text-[11px] text-emerald-300 overflow-x-auto max-h-48">
                  {selectedLogDetail.details
                    ? (() => {
                        try {
                          return JSON.stringify(JSON.parse(selectedLogDetail.details), null, 2);
                        } catch (e) {
                          return selectedLogDetail.details;
                        }
                      })()
                    : '// Tidak ada payload metadata'}
                </pre>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-800 bg-slate-950/60 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedLogDetail(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold transition cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
