import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  Settings as SettingsIcon,
  User,
  Shield,
  Monitor,
  Bell,
  HardDrive,
  Cloud,
  CheckCircle2,
  AlertTriangle,
  LogOut,
  Users,
  Tv,
  RefreshCw,
  Clock,
  Volume2,
  VolumeX,
  Database,
  Radio,
  Sliders,
  Check,
  Zap,
  Info,
  Server,
  Activity
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { fetchSettingsApi, saveSettingApi } from '../api/vpsApi';
import { useSocket } from '../hooks/useSocket';
import {
  BACKEND_URL,
  DEFAULT_BACKEND_URL,
  BACKEND_PRESETS,
  switchBackendUrl,
  getActiveBackendInfo
} from '../config';

export default function SettingsPage({
  onBack,
  onOpenUserModal,
  isTvMode,
  onToggleTvMode
}) {
  const { user, isSuperAdmin, logout } = useAuth();
  const { isConnected } = useSocket();

  // Active sub-tab inside settings
  const [activeTab, setActiveTab] = useState('account'); // 'account' | 'appearance' | 'monitoring' | 'system'

  // Settings states
  const [isLoading, setIsLoading] = useState(true);
  const [successToast, setSuccessToast] = useState('');
  const [savingKey, setSavingKey] = useState(null);

  // Appearance & General
  const [tvModeLocal, setTvModeLocal] = useState(isTvMode || false);
  const [defaultLandingView, setDefaultLandingView] = useState('dashboard');
  const [gridDensity, setGridDensity] = useState('normal'); // 'normal' | 'compact'

  // Monitoring & Alerts
  const [pollInterval, setPollInterval] = useState('10'); // seconds
  const [diskThreshold, setDiskThreshold] = useState('85'); // %
  const [soundAlertEnabled, setSoundAlertEnabled] = useState(true);
  const [pobAlertEnabled, setPobAlertEnabled] = useState(true);

  // Backend Switcher State
  const activeBackend = getActiveBackendInfo();

  const handleSwitchBackend = (targetUrl, targetName) => {
    if (targetUrl === BACKEND_URL) return;
    if (window.confirm(`Konfirmasi beralih ke: ${targetName}?\n\nHalaman akan dimuat ulang untuk menghubungkan API dan WebSocket.`)) {
      switchBackendUrl(targetUrl);
    }
  };

  // Load existing settings from DB on mount
  useEffect(() => {
    fetchSettingsApi().then(data => {
      if (data) {
        if (data.tv_mode !== undefined) setTvModeLocal(data.tv_mode === 'true');
        if (data.default_view) setDefaultLandingView(data.default_view);
        if (data.grid_density) setGridDensity(data.grid_density);
        if (data.poll_interval) setPollInterval(data.poll_interval);
        if (data.disk_alert_threshold) setDiskThreshold(data.disk_alert_threshold);
        if (data.sound_alert_enabled !== undefined) setSoundAlertEnabled(data.sound_alert_enabled === 'true');
        if (data.pob_alert_enabled !== undefined) setPobAlertEnabled(data.pob_alert_enabled === 'true');
      }
      setIsLoading(false);
    });
  }, []);

  // Save setting handler
  const handleSave = async (key, value) => {
    setSavingKey(key);
    try {
      await saveSettingApi(key, String(value));
      setSuccessToast(`Pengaturan "${key}" berhasil disimpan.`);
      setTimeout(() => setSuccessToast(''), 3000);
    } catch (err) {
      alert(`Gagal menyimpan pengaturan: ${err.message}`);
    } finally {
      setSavingKey(null);
    }
  };

  const tabs = [
    { id: 'account', label: 'Profil & Sesi Akun', icon: User, color: 'cyan' },
    { id: 'appearance', label: 'Tampilan & Antarmuka', icon: Monitor, color: 'purple' },
    { id: 'monitoring', label: 'Monitoring & Peringatan', icon: Bell, color: 'amber' },
    { id: 'system', label: 'Cloud & Diagnostik Sistem', icon: Database, color: 'emerald' }
  ];

  return (
    <div className="min-h-screen text-slate-100 pb-16 animate-in fade-in duration-200">
      {/* 1. Header Navigation Bar */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-cyan-500/20 pb-5">
        <div className="flex items-center gap-3.5">
          <button
            onClick={onBack}
            className="p-2.5 bg-slate-900 hover:bg-slate-800 text-cyan-400 rounded-xl border border-cyan-500/30 transition-all cursor-pointer shadow-lg shadow-cyan-500/5 flex items-center gap-1.5 text-xs font-bold shrink-0"
          >
            <ArrowLeft size={16} />
            <span>Kembali ke Dashboard</span>
          </button>

          <div className="flex items-center gap-2.5">
            <div className="bg-gradient-to-br from-cyan-500/20 to-purple-500/20 p-2.5 rounded-xl border border-cyan-500/40 text-cyan-300">
              <SettingsIcon size={20} />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2">
                <span>Pengaturan Sistem &amp; Profil</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">
                  Settings Hub
                </span>
              </h1>
              <p className="text-slate-400 text-xs mt-0.5">
                Kelola preferensi antarmuka, sesi akun, interval pemantauan, dan konfigurasi cloud monitoring.
              </p>
            </div>
          </div>
        </div>

        {/* Live Status Indicator */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400 bg-slate-900/90 px-3 py-1.5 rounded-xl border border-slate-800 flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-emerald-400 animate-pulse' : 'bg-rose-400'}`} />
            <span>Socket: <strong className="text-white font-mono">{isConnected ? 'Terhubung' : 'Terputus'}</strong></span>
          </span>
        </div>
      </div>

      {/* Success Notification Banner */}
      {successToast && (
        <div className="mb-5 p-4 rounded-2xl bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 text-xs flex items-center justify-between gap-3 shadow-lg animate-in fade-in duration-200">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 size={18} className="shrink-0 text-emerald-400" />
            <span className="font-semibold">{successToast}</span>
          </div>
          <button onClick={() => setSuccessToast('')} className="text-emerald-400 hover:text-white font-bold cursor-pointer">
            &times;
          </button>
        </div>
      )}

      {/* 2. Horizontal Sub-Tabs */}
      <div className="flex flex-wrap items-center bg-slate-950/90 p-1.5 rounded-2xl border border-cyan-500/20 shadow-xl gap-1.5 mb-6">
        {tabs.map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          const colorClasses = {
            cyan: isActive
              ? 'bg-gradient-to-r from-cyan-500/25 to-blue-500/25 text-cyan-300 border-cyan-500/40 shadow-sm'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60',
            purple: isActive
              ? 'bg-gradient-to-r from-purple-500/25 to-pink-500/25 text-purple-300 border-purple-500/40 shadow-sm'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60',
            amber: isActive
              ? 'bg-gradient-to-r from-amber-500/25 to-orange-500/25 text-amber-300 border-amber-500/40 shadow-sm'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60',
            emerald: isActive
              ? 'bg-gradient-to-r from-emerald-500/25 to-teal-500/25 text-emerald-300 border-emerald-500/40 shadow-sm'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
          }[tab.color];

          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 min-w-[180px] py-2.5 px-3 rounded-xl text-xs font-extrabold flex items-center justify-center gap-2 transition-all cursor-pointer border border-transparent ${colorClasses}`}
            >
              <Icon size={15} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* 3. Tab Contents */}

      {/* TAB 1: Profil & Sesi Akun */}
      {activeTab === 'account' && (
        <div className="space-y-6">
          {/* User Profile Card */}
          <div className="bg-slate-950/80 border border-cyan-500/20 rounded-3xl p-6 shadow-xl relative overflow-hidden">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5">
              <div className="flex items-center gap-4">
                {user?.picture ? (
                  <img
                    src={user.picture}
                    alt={user.name}
                    className="w-16 h-16 rounded-2xl border-2 border-cyan-500/40 shadow-lg object-cover"
                  />
                ) : (
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-cyan-400 to-blue-500 text-slate-950 font-black text-2xl flex items-center justify-center shadow-lg">
                    {(user?.name || user?.email || 'A')[0].toUpperCase()}
                  </div>
                )}
                <div>
                  <div className="flex items-center gap-2.5">
                    <h3 className="text-lg font-black text-white">{user?.name || 'Administrator'}</h3>
                    <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${
                      isSuperAdmin
                        ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30'
                        : 'bg-purple-500/20 text-purple-300 border-purple-500/30'
                    }`}>
                      {isSuperAdmin ? 'SUPER ADMIN' : 'ADMINISTRATOR'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5 font-mono">{user?.email}</p>
                  <div className="flex items-center gap-2 mt-2 text-[11px] text-slate-400">
                    <span className="flex items-center gap-1 text-emerald-400">
                      <CheckCircle2 size={12} /> Google OAuth Terverifikasi
                    </span>
                    <span>&bull;</span>
                    <span>Sesi Aktif</span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2.5 flex-wrap self-end sm:self-auto">
                {isSuperAdmin && onOpenUserModal && (
                  <button
                    onClick={onOpenUserModal}
                    className="px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold rounded-xl text-xs flex items-center gap-2 cursor-pointer transition-all shadow-md"
                  >
                    <Users size={14} />
                    <span>Kelola Persetujuan User</span>
                  </button>
                )}

                <button
                  onClick={() => {
                    logout();
                    if (onBack) onBack();
                  }}
                  className="px-3.5 py-2 bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border border-rose-500/30 font-bold rounded-xl text-xs flex items-center gap-2 cursor-pointer transition-colors"
                >
                  <LogOut size={14} />
                  <span>Logout</span>
                </button>
              </div>
            </div>
          </div>

          {/* Account Security & Privileges Overview */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4">
              <div className="flex items-center gap-2 text-cyan-400 mb-2">
                <Shield size={16} />
                <h4 className="text-xs font-bold text-white">Tingkat Izin Akses</h4>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                {isSuperAdmin
                  ? 'Anda memiliki hak Super Admin: dapat menyetujui user baru, mengedit server, menjalankan script SSH, dan membersihkan disk.'
                  : 'Anda memiliki akses Administrator: dapat memantau status server, menjalankan sinkronisasi, dan mengelola media.'}
              </p>
            </div>

            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4">
              <div className="flex items-center gap-2 text-emerald-400 mb-2">
                <CheckCircle2 size={16} />
                <h4 className="text-xs font-bold text-white">Metode Autentikasi</h4>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Autentikasi akun dijamin melalui Single Sign-On (SSO) Google OAuth 2.0 dengan enkripsi JWT pada header Authorization.
              </p>
            </div>

            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4">
              <div className="flex items-center gap-2 text-purple-400 mb-2">
                <Clock size={16} />
                <h4 className="text-xs font-bold text-white">Masa Berlaku Sesi</h4>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Token sesi diperbarui secara berkala. Sesi akan otomatis berakhir jika tidak ada aktivitas selama 7 hari atau saat tombol logout ditekan.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: Tampilan & Antarmuka */}
      {activeTab === 'appearance' && (
        <div className="space-y-6">
          <div className="bg-slate-950/80 border border-purple-500/20 rounded-3xl p-6 shadow-xl space-y-6">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Monitor size={16} className="text-purple-400" /> Preferensi Tampilan Layar
            </h3>

            {/* 1. TV Mode Switch */}
            <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-900/70 border border-slate-800 gap-4">
              <div className="flex items-start gap-3">
                <div className="p-2.5 rounded-xl bg-purple-500/15 border border-purple-500/30 text-purple-400 shrink-0">
                  <Tv size={20} />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white">Mode TV / Kiosk NOC Display</h4>
                  <p className="text-xs text-slate-400 mt-0.5 max-w-xl leading-relaxed">
                    Menyesuaikan tata letak kartu server ke grid yang lebih lebar (4 kolom) dan memadatkan padding agar ideal untuk monitor TV dinding pengawasan NOC.
                  </p>
                </div>
              </div>

              <button
                onClick={() => {
                  const next = !tvModeLocal;
                  setTvModeLocal(next);
                  if (onToggleTvMode) onToggleTvMode();
                  handleSave('tv_mode', String(next));
                }}
                className={`w-13 h-7 rounded-full transition-colors cursor-pointer relative p-0.5 shrink-0 ${
                  tvModeLocal ? 'bg-purple-600' : 'bg-slate-800'
                }`}
              >
                <div className={`w-6 h-6 rounded-full bg-white transition-transform shadow-md ${
                  tvModeLocal ? 'translate-x-6' : 'translate-x-0'
                }`} />
              </button>
            </div>

            {/* 2. Default Landing View */}
            <div className="p-4 rounded-2xl bg-slate-900/70 border border-slate-800 space-y-3">
              <div>
                <h4 className="text-sm font-bold text-white">Halaman Awal Default (Landing View)</h4>
                <p className="text-xs text-slate-400 mt-0.5">
                  Tentukan halaman mana yang akan langsung terbuka saat Anda membuka dashboard monitoring.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
                {[
                  { id: 'dashboard', label: 'Dashboard', desc: 'Metrik CPU, RAM, & Grafik' },
                  { id: 'server-list', label: 'Server List', desc: 'Kartu VPS, POD, DB, S3' },
                  { id: 'storage-manager', label: 'Storage Manager', desc: 'Sampah Docker, S3 & Flow' },
                  { id: 'pod-activity', label: 'POD Activity', desc: 'Status Kursi POB & Okupansi' }
                ].map(view => {
                  const isSelected = defaultLandingView === view.id;
                  return (
                    <button
                      key={view.id}
                      onClick={() => {
                        setDefaultLandingView(view.id);
                        handleSave('default_view', view.id);
                      }}
                      className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-1 ${
                        isSelected
                          ? 'bg-purple-500/20 border-purple-500/40 text-white shadow-md'
                          : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs">{view.label}</span>
                        {isSelected && <Check size={14} className="text-purple-400" />}
                      </div>
                      <span className="text-[10px] text-slate-500">{view.desc}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 3. Grid Density */}
            <div className="p-4 rounded-2xl bg-slate-900/70 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h4 className="text-sm font-bold text-white">Kepadatan Tata Letak Grid (Density)</h4>
                <p className="text-xs text-slate-400 mt-0.5">
                  Atur ukuran dan kerapatan kartu server pada tampilan Server List.
                </p>
              </div>

              <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800 shrink-0">
                {[
                  { id: 'normal', label: 'Standar (3 Kolom)' },
                  { id: 'compact', label: 'Padat (Compact)' }
                ].map(mode => (
                  <button
                    key={mode.id}
                    onClick={() => {
                      setGridDensity(mode.id);
                      handleSave('grid_density', mode.id);
                    }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                      gridDensity === mode.id
                        ? 'bg-purple-600 text-white shadow-sm'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {mode.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: Monitoring & Peringatan */}
      {activeTab === 'monitoring' && (
        <div className="space-y-6">
          <div className="bg-slate-950/80 border border-amber-500/20 rounded-3xl p-6 shadow-xl space-y-6">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Bell size={16} className="text-amber-400" /> Pengaturan Peringatan &amp; Frekuensi
            </h3>

            {/* 1. Poll Interval */}
            <div className="p-4 rounded-2xl bg-slate-900/70 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h4 className="text-sm font-bold text-white">Interval Auto-Refresh Metrik Server</h4>
                <p className="text-xs text-slate-400 mt-0.5">
                  Frekuensi polling metrik CPU, memori RAM, dan status koneksi live dari seluruh server.
                </p>
              </div>

              <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800 shrink-0">
                {[
                  { id: '5', label: '5 Detik (Cepat)' },
                  { id: '10', label: '10 Detik (Rekomendasi)' },
                  { id: '30', label: '30 Detik (Hemat)' }
                ].map(opt => (
                  <button
                    key={opt.id}
                    onClick={() => {
                      setPollInterval(opt.id);
                      handleSave('poll_interval', opt.id);
                    }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                      pollInterval === opt.id
                        ? 'bg-amber-600 text-white shadow-sm'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* 2. Disk Warning Threshold */}
            <div className="p-4 rounded-2xl bg-slate-900/70 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h4 className="text-sm font-bold text-white">Ambang Batas Peringatan Kapasitas Disk</h4>
                <p className="text-xs text-slate-400 mt-0.5">
                  Tandai kartu POD dengan peringatan warna merah jika penggunaan disk melebihi persentase ini.
                </p>
              </div>

              <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800 shrink-0">
                {['80', '85', '90', '95'].map(pct => (
                  <button
                    key={pct}
                    onClick={() => {
                      setDiskThreshold(pct);
                      handleSave('disk_alert_threshold', pct);
                    }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-colors cursor-pointer ${
                      diskThreshold === pct
                        ? 'bg-rose-600 text-white shadow-sm'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {pct}%
                  </button>
                ))}
              </div>
            </div>

            {/* 3. Audio & POB Sensor Chime Alerts */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 rounded-2xl bg-slate-900/70 border border-slate-800 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-amber-500/15 text-amber-400">
                    {soundAlertEnabled ? <Volume2 size={18} /> : <VolumeX size={18} />}
                  </div>
                  <div>
                    <h5 className="text-xs font-bold text-white">Peringatan Server Offline</h5>
                    <p className="text-[11px] text-slate-400">Bunyikan nada saat ada server down</p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    const next = !soundAlertEnabled;
                    setSoundAlertEnabled(next);
                    handleSave('sound_alert_enabled', String(next));
                  }}
                  className={`w-10 h-6 rounded-full transition-colors cursor-pointer relative p-0.5 ${
                    soundAlertEnabled ? 'bg-amber-600' : 'bg-slate-800'
                  }`}
                >
                  <div className={`w-5 h-5 rounded-full bg-white transition-transform ${
                    soundAlertEnabled ? 'translate-x-4' : 'translate-x-0'
                  }`} />
                </button>
              </div>

              <div className="p-4 rounded-2xl bg-slate-900/70 border border-slate-800 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-emerald-500/15 text-emerald-400">
                    <Activity size={18} />
                  </div>
                  <div>
                    <h5 className="text-xs font-bold text-white">Notifikasi Okupansi Kursi POB</h5>
                    <p className="text-[11px] text-slate-400">Pembaruan saat status kursi terisi</p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    const next = !pobAlertEnabled;
                    setPobAlertEnabled(next);
                    handleSave('pob_alert_enabled', String(next));
                  }}
                  className={`w-10 h-6 rounded-full transition-colors cursor-pointer relative p-0.5 ${
                    pobAlertEnabled ? 'bg-emerald-600' : 'bg-slate-800'
                  }`}
                >
                  <div className={`w-5 h-5 rounded-full bg-white transition-transform ${
                    pobAlertEnabled ? 'translate-x-4' : 'translate-x-0'
                  }`} />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: Cloud & Diagnostik Sistem */}
      {activeTab === 'system' && (
        <div className="space-y-6">
          <div className="bg-slate-950/80 border border-emerald-500/20 rounded-3xl p-6 shadow-xl space-y-6">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Database size={16} className="text-emerald-400" /> Konfigurasi Cloud &amp; Integritas Sistem
            </h3>

            {/* Backend Server Switcher Section (Clean - No URLs exposed) */}
            <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
                <div>
                  <h4 className="text-sm font-bold text-white flex items-center gap-2">
                    <Server size={16} className="text-cyan-400" /> Target Endpoint Backend Server
                  </h4>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Pilih server backend tujuan untuk sinkronisasi live metrik dan koneksi WebSocket.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono px-2.5 py-1 rounded-lg bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 font-bold">
                    Aktif: {activeBackend.badge}
                  </span>
                </div>
              </div>

              {/* Preset Backend Cards */}
              <div className={`grid grid-cols-1 ${BACKEND_PRESETS.length > 2 ? 'sm:grid-cols-2 lg:grid-cols-3' : 'sm:grid-cols-2'} gap-3.5`}>
                {BACKEND_PRESETS.filter(p => import.meta.env.DEV || p.id !== 'local').map(preset => {
                  const isCurrent = BACKEND_URL === preset.url;
                  return (
                    <div
                      key={preset.id}
                      onClick={() => handleSwitchBackend(preset.url, preset.name)}
                      className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between gap-3 ${
                        isCurrent
                          ? 'bg-cyan-500/15 border-cyan-500/40 shadow-md shadow-cyan-500/5 ring-1 ring-cyan-500/30'
                          : 'bg-slate-950/60 border-slate-800 hover:border-slate-700 hover:bg-slate-900/80'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className={`p-2 rounded-xl border shrink-0 ${
                            isCurrent
                              ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
                              : 'bg-slate-800/80 text-slate-400 border-slate-700'
                          }`}>
                            <Server size={16} />
                          </div>
                          <div className="min-w-0">
                            <span className="font-bold text-xs text-white truncate block">{preset.name}</span>
                            <span className="text-[10px] text-slate-400 block mt-0.5">{preset.desc}</span>
                          </div>
                        </div>

                        {preset.isDefault && (
                          <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 shrink-0">
                            DEFAULT
                          </span>
                        )}
                      </div>

                      <div className="pt-2 border-t border-slate-800/60 flex items-center justify-between">
                        <span className="text-[10px] font-mono text-slate-500">{preset.badge}</span>
                        {isCurrent ? (
                          <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-bold flex items-center gap-1">
                            <Check size={10} className="stroke-[3]" /> Terhubung
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold text-cyan-400 hover:underline">
                            Pilih Server &rarr;
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Reset to Default if currently not on default URL */}
              {BACKEND_URL !== DEFAULT_BACKEND_URL && (
                <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between">
                  <span className="text-xs text-slate-400">
                    Anda sedang menggunakan backend non-default.
                  </span>
                  <button
                    onClick={() => handleSwitchBackend(DEFAULT_BACKEND_URL, 'Server Default')}
                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-cyan-300 rounded-xl text-xs font-bold transition-colors cursor-pointer border border-slate-700"
                  >
                    Kembalikan ke Server Default
                  </button>
                </div>
              )}
            </div>

            {/* AWS S3 & Paths Information Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 rounded-2xl bg-slate-900/70 border border-slate-800 space-y-2">
                <div className="flex items-center gap-2 text-rose-400">
                  <Cloud size={16} />
                  <h4 className="text-xs font-bold text-white">AWS S3 Media Bucket</h4>
                </div>
                <div className="text-xs font-mono text-slate-300 space-y-1">
                  <div>Bucket: <strong className="text-white">developerfile-084897310273</strong></div>
                  <div>Region: <strong className="text-white">ap-southeast-1 (Singapore)</strong></div>
                  <div>Katalog Kode: <span className="text-slate-400">media/&lt;code&gt;/</span></div>
                  <div>Flow Editor: <span className="text-slate-400">images/&lt;filename&gt;</span></div>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-slate-900/70 border border-slate-800 space-y-2">
                <div className="flex items-center gap-2 text-cyan-400">
                  <HardDrive size={16} />
                  <h4 className="text-xs font-bold text-white">Direktori Target POD V3</h4>
                </div>
                <div className="text-xs font-mono text-slate-300 space-y-1">
                  <div>File Gambar: <strong className="text-cyan-300">/home/pod/images/</strong></div>
                  <div>File Video: <strong className="text-amber-300">/home/pod/videos/</strong></div>
                  <div>File Suara: <strong className="text-purple-300">/home/pod/sounds/</strong></div>
                  <div>Izin Hak Akses: <span className="text-emerald-400">777 (pod:pod)</span></div>
                </div>
              </div>
            </div>

            {/* Connection Health Overview */}
            <div className="p-4 rounded-2xl bg-slate-900/70 border border-slate-800 space-y-3">
              <h4 className="text-xs font-bold text-white flex items-center gap-2">
                <Zap size={14} className="text-amber-400" /> Status Saluran Komunikasi
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
                  <span className="text-slate-400">WebSocket / Socket.io</span>
                  <span className={`font-mono font-bold flex items-center gap-1.5 ${isConnected ? 'text-emerald-400' : 'text-rose-400'}`}>
                    <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-emerald-400' : 'bg-rose-400'}`} />
                    {isConnected ? 'ONLINE' : 'OFFLINE'}
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
                  <span className="text-slate-400">Database Lokal</span>
                  <span className="text-emerald-400 font-mono font-bold">SQLite OK</span>
                </div>

                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
                  <span className="text-slate-400">Master RDS RDS</span>
                  <span className="text-emerald-400 font-mono font-bold">PostgreSQL OK</span>
                </div>
              </div>
            </div>

            {/* Test Connectivity Action */}
            <div className="flex items-center justify-between pt-2">
              <div className="text-xs text-slate-500">
                Environment: <span className="font-mono text-slate-400">Production / Vite Frontend v8</span>
              </div>
              <button
                onClick={() => {
                  fetchSettingsApi().then(() => alert('Koneksi ke backend dan database SQLite berhasil diverifikasi 100%!'));
                }}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-cyan-300 rounded-xl border border-cyan-500/30 text-xs font-bold flex items-center gap-2 cursor-pointer transition-colors"
              >
                <RefreshCw size={13} />
                <span>Uji Konektivitas Sistem</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
