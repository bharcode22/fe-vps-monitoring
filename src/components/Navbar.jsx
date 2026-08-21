import React, { useState, useRef, useEffect } from 'react';
import {
  Activity,
  LayoutDashboard,
  Download,
  Zap,
  Volume2,
  Database,
  Shuffle,
  Plus,
  Tv,
  RefreshCw,
  Users,
  LogOut,
  Lock,
  ChevronDown,
  Menu,
  X,
  Server,
  Layers,
  Check,
  ShieldCheck,
  Globe,
  FileCode
} from 'lucide-react';
import { useGoogleLogin } from '@react-oauth/google';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';

export default function Navbar({
  onOpenAddModal,
  onOpenAddServiceModal,
  totalServers,
  isConnected,
  onRefresh,
  isTvMode,
  onToggleTvMode,
  onOpenUserModal,
  currentView = 'dashboard',
  onNavigateView
}) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isAddMenuOpen, setIsAddMenuOpen] = useState(false);
  const [isToolsMenuOpen, setIsToolsMenuOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

  const addMenuRef = useRef(null);
  const toolsMenuRef = useRef(null);
  const userMenuRef = useRef(null);

  const { lang, changeLanguage, t } = useLanguage();
  const { user, isAuthenticated, isSuperAdmin, loginWithGoogle, logout } = useAuth();

  // Close dropdowns on click outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (addMenuRef.current && !addMenuRef.current.contains(event.target)) {
        setIsAddMenuOpen(false);
      }
      if (toolsMenuRef.current && !toolsMenuRef.current.contains(event.target)) {
        setIsToolsMenuOpen(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
        setIsUserMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleGoogleLogin = useGoogleLogin({
    onSuccess: (tokenResponse) => {
      if (tokenResponse.access_token) {
        loginWithGoogle({ access_token: tokenResponse.access_token });
      }
    },
    onError: (error) => {
      console.error('Login Google Gagal:', error);
    }
  });

  const isToolsActive = ['sync', 'sounds-comparison', 'metadata-comparison', 'rabbitmq', 'env-manager'].includes(currentView);

  const getToolsLabel = () => {
    if (currentView === 'sync') return 'Database Sync';
    if (currentView === 'env-manager') return 'Environment Manager';
    if (currentView === 'sounds-comparison') return 'Compare Sounds';
    if (currentView === 'metadata-comparison') return 'Compare Metadata';
    if (currentView === 'rabbitmq') return 'RabbitMQ Monitor';
    return 'Lainnya / Tools';
  };

  return (
    <header className="sticky top-0 z-50 rounded-b-2xl px-3 sm:px-5 lg:px-6 py-3 mb-6 backdrop-blur-xl bg-slate-900/90 border-b border-cyan-500/20 shadow-2xl transition-all duration-300">
      <div className="flex items-center justify-between gap-2 md:gap-4">

        {/* ========================================================================= */}
        {/* LEFT: Brand Logo & Title */}
        {/* ========================================================================= */}
        <div className="flex items-center gap-2.5 sm:gap-3 shrink-0">
          <div
            onClick={() => onNavigateView && onNavigateView('dashboard')}
            className="bg-gradient-to-br from-cyan-500/20 to-blue-500/20 border border-cyan-500/40 p-2 sm:p-2.5 rounded-xl flex items-center justify-center shadow-lg shadow-cyan-500/10 shrink-0 cursor-pointer hover:border-cyan-400 transition-colors"
            title="Ke Dashboard"
          >
            <Activity className="text-cyan-400 w-5 h-5 sm:w-6 sm:h-6" />
          </div>

          <div className="cursor-pointer" onClick={() => onNavigateView && onNavigateView('dashboard')}>
            <div className="flex items-center gap-1.5 sm:gap-2">
              <h1 className="gradient-text text-base sm:text-lg lg:text-xl font-extrabold tracking-tight whitespace-nowrap">
                {t('appTitle')}
              </h1>
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-cyan-500/15 text-cyan-400 border border-cyan-500/30 font-mono">
                PRO
              </span>
              <span
                className={`w-2 h-2 rounded-full ${isConnected ? 'bg-emerald-400 animate-pulse shadow-sm shadow-emerald-400/50' : 'bg-rose-500'}`}
                title={isConnected ? 'Terhubung ke server monitoring' : 'Koneksi terputus'}
              />
            </div>
            <p className="text-slate-400 text-[10px] sm:text-[11px] leading-tight hidden lg:block">
              {t('appSubtitle')}
            </p>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* CENTER: Navigation Tabs (Desktop & Laptop) */}
        {/* ========================================================================= */}
        {onNavigateView && (
          <div className="hidden lg:flex items-center gap-1 bg-slate-950/70 p-1 rounded-xl border border-slate-800 shadow-inner">
            {/* 1. Dashboard */}
            <button
              onClick={() => onNavigateView('dashboard')}
              className={`px-3 py-1.5 rounded-lg text-xs font-extrabold flex items-center gap-1.5 transition-all cursor-pointer ${currentView === 'dashboard'
                ? 'bg-gradient-to-r from-cyan-500/25 to-blue-500/25 text-cyan-300 border border-cyan-500/40 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
                }`}
            >
              <LayoutDashboard size={14} className={currentView === 'dashboard' ? 'text-cyan-400' : 'text-slate-500'} />
              <span>Dashboard</span>
            </button>

            {/* 2. Server List (Only for Authenticated Admins) */}
            {isAuthenticated && (
              <button
                onClick={() => onNavigateView('server-list')}
                className={`px-3 py-1.5 rounded-lg text-xs font-extrabold flex items-center gap-1.5 transition-all cursor-pointer ${currentView === 'server-list'
                  ? 'bg-gradient-to-r from-cyan-500/25 to-blue-500/25 text-cyan-300 border border-cyan-500/40 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
                  }`}
              >
                <Server size={14} className={currentView === 'server-list' ? 'text-cyan-400' : 'text-slate-500'} />
                <span>Server List</span>
              </button>
            )}

            {isAuthenticated && (
              <>
                {/* 3. Installation */}
                <button
                  onClick={() => onNavigateView('installation')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-extrabold flex items-center gap-1.5 transition-all cursor-pointer ${currentView === 'installation' || currentView === 'instalation'
                    ? 'bg-gradient-to-r from-cyan-500/25 to-blue-500/25 text-cyan-300 border border-cyan-500/40 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
                    }`}
                >
                  <Download size={14} className={currentView === 'installation' || currentView === 'instalation' ? 'text-cyan-400' : 'text-slate-500'} />
                  <span>Installation</span>
                </button>

                {/* 3. Tools / Secondary Views Dropdown */}
                <div className="relative" ref={toolsMenuRef}>
                  <button
                    onClick={() => setIsToolsMenuOpen(!isToolsMenuOpen)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-extrabold flex items-center gap-1.5 transition-all cursor-pointer ${isToolsActive
                      ? 'bg-gradient-to-r from-purple-500/25 to-indigo-500/25 text-purple-300 border border-purple-500/40 shadow-sm'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
                      }`}
                  >
                    <Layers size={14} className={isToolsActive ? 'text-purple-400' : 'text-slate-500'} />
                    <span>{getToolsLabel()}</span>
                    <ChevronDown size={12} className={`transition-transform duration-200 ${isToolsMenuOpen ? 'rotate-180' : ''}`} />
                  </button>

                  {isToolsMenuOpen && (
                    <div className="absolute left-0 mt-2 w-56 bg-slate-900/95 border border-purple-500/30 rounded-2xl shadow-2xl p-1.5 z-50 animate-in fade-in zoom-in-95 duration-150 backdrop-blur-xl">
                      <div className="px-2.5 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        Tools & Utilitas Database
                      </div>

                      {/* Database Sync */}
                      <button
                        onClick={() => {
                          onNavigateView('sync');
                          setIsToolsMenuOpen(false);
                        }}
                        className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-left transition-colors cursor-pointer text-xs font-bold ${currentView === 'sync'
                          ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                          : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
                          }`}
                      >
                        <Zap size={15} className="text-amber-400 shrink-0" />
                        <div className="flex-1">
                          <div>Database Sync</div>
                          <div className="text-[10px] text-slate-400 font-normal">Sinkronisasi Tabel & Data DB</div>
                        </div>
                      </button>

                      {/* Compare Sounds */}
                      <button
                        onClick={() => {
                          onNavigateView('sounds-comparison');
                          setIsToolsMenuOpen(false);
                        }}
                        className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-left transition-colors cursor-pointer text-xs font-bold ${currentView === 'sounds-comparison'
                          ? 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/30'
                          : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
                          }`}
                      >
                        <Volume2 size={15} className="text-cyan-400 shrink-0" />
                        <div className="flex-1">
                          <div>Compare Sounds</div>
                          <div className="text-[10px] text-slate-400 font-normal">Sinkronisasi & Cek Audio</div>
                        </div>
                      </button>

                      {/* Compare Metadata */}
                      <button
                        onClick={() => {
                          onNavigateView('metadata-comparison');
                          setIsToolsMenuOpen(false);
                        }}
                        className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-left transition-colors cursor-pointer text-xs font-bold ${currentView === 'metadata-comparison'
                          ? 'bg-purple-500/15 text-purple-300 border border-purple-500/30'
                          : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
                          }`}
                      >
                        <Database size={15} className="text-purple-400 shrink-0" />
                        <div className="flex-1">
                          <div>Compare Metadata</div>
                          <div className="text-[10px] text-slate-400 font-normal">Perbandingan Skema & Data</div>
                        </div>
                      </button>

                      {/* RabbitMQ Monitor */}
                      <button
                        onClick={() => {
                          onNavigateView('rabbitmq');
                          setIsToolsMenuOpen(false);
                        }}
                        className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-left transition-colors cursor-pointer text-xs font-bold ${currentView === 'rabbitmq'
                          ? 'bg-sky-500/15 text-sky-300 border border-sky-500/30'
                          : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
                          }`}
                      >
                        <Shuffle size={15} className="text-sky-400 shrink-0" />
                        <div className="flex-1">
                          <div>RabbitMQ Monitor</div>
                          <div className="text-[10px] text-slate-400 font-normal">Pantau Antrean Queue & Consumer</div>
                        </div>
                      </button>

                      {/* Environment Manager & Diff */}
                      <button
                        onClick={() => {
                          onNavigateView('env-manager');
                          setIsToolsMenuOpen(false);
                        }}
                        className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-left transition-colors cursor-pointer text-xs font-bold ${currentView === 'env-manager'
                          ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                          : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
                          }`}
                      >
                        <FileCode size={15} className="text-emerald-400 shrink-0" />
                        <div className="flex-1">
                          <div>Environment Manager</div>
                          <div className="text-[10px] text-slate-400 font-normal">Kelola & Bandingkan File .env</div>
                        </div>
                      </button>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* RIGHT: Actions, Utilities & User Profile Menu */}
        {/* ========================================================================= */}
        <div className="hidden md:flex items-center gap-2 lg:gap-2.5 shrink-0">

          {/* "+ Tambah" Dropdown Button */}
          {isAuthenticated && (
            <div className="relative" ref={addMenuRef}>
              <button
                onClick={() => setIsAddMenuOpen(!isAddMenuOpen)}
                className="bg-gradient-to-r from-cyan-400 to-blue-500 hover:from-cyan-300 hover:to-blue-400 text-slate-950 px-3 py-1.5 rounded-xl font-extrabold text-xs flex items-center gap-1.5 shadow-md shadow-cyan-500/20 transition-all duration-200 cursor-pointer"
                title="Tambah VPS / Service Baru"
              >
                <Plus size={14} />
                <span>Tambah</span>
                <ChevronDown size={12} className={`transition-transform duration-200 ${isAddMenuOpen ? 'rotate-180' : ''}`} />
              </button>

              {isAddMenuOpen && (
                <div className="absolute right-0 mt-2 w-52 bg-slate-900/95 border border-cyan-500/30 rounded-2xl shadow-2xl p-1.5 z-50 animate-in fade-in zoom-in-95 duration-150 backdrop-blur-xl">
                  <button
                    onClick={() => {
                      onOpenAddModal();
                      setIsAddMenuOpen(false);
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-slate-800/90 text-left transition-colors cursor-pointer group"
                  >
                    <div className="p-1.5 rounded-lg bg-cyan-500/15 border border-cyan-500/30 text-cyan-400 group-hover:bg-cyan-500/25 shrink-0">
                      <Server size={15} />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-white group-hover:text-cyan-400 transition-colors">VPS / POD</div>
                      <div className="text-[10px] text-slate-400">Server Linux via SSH</div>
                    </div>
                  </button>

                  <button
                    onClick={() => {
                      onOpenAddServiceModal();
                      setIsAddMenuOpen(false);
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-slate-800/90 text-left transition-colors cursor-pointer group"
                  >
                    <div className="p-1.5 rounded-lg bg-sky-500/15 border border-sky-500/30 text-sky-400 group-hover:bg-sky-500/25 shrink-0">
                      <Database size={15} />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-white group-hover:text-sky-400 transition-colors">DB & Storage</div>
                      <div className="text-[10px] text-slate-400">PostgreSQL, MinIO, S3</div>
                    </div>
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Utilities: TV Mode, Refresh & Language */}
          <div className="flex items-center gap-1 bg-slate-950/70 p-1 rounded-xl border border-slate-800 shadow-inner">
            <button
              onClick={onToggleTvMode}
              className={`px-2 py-1 rounded-lg text-xs font-bold flex items-center gap-1 transition-all duration-200 cursor-pointer ${isTvMode
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
                }`}
              title="Toggle TV Wall / NOC View Mode"
            >
              <Tv size={14} className={isTvMode ? 'text-cyan-400' : 'text-slate-400'} />
              <span className="hidden xl:inline">{isTvMode ? t('normalView') : t('tvMode')}</span>
            </button>

            {isAuthenticated && (
              <button
                onClick={onRefresh}
                className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-900/60 rounded-lg transition-colors cursor-pointer"
                title={t('refresh')}
              >
                <RefreshCw size={14} />
              </button>
            )}

            {/* Language Switcher Pill */}
            <div className="flex items-center bg-slate-900 p-0.5 rounded-lg border border-slate-800 ml-0.5">
              <button
                onClick={() => changeLanguage('id')}
                className={`px-1.5 py-0.5 rounded text-[10px] font-extrabold transition-colors cursor-pointer ${lang === 'id' ? 'bg-cyan-500/25 text-cyan-300' : 'text-slate-500 hover:text-slate-300'
                  }`}
                title="Bahasa Indonesia"
              >
                ID
              </button>
              <button
                onClick={() => changeLanguage('en')}
                className={`px-1.5 py-0.5 rounded text-[10px] font-extrabold transition-colors cursor-pointer ${lang === 'en' ? 'bg-cyan-500/25 text-cyan-300' : 'text-slate-500 hover:text-slate-300'
                  }`}
                title="English"
              >
                EN
              </button>
            </div>
          </div>

          {/* User Account / Profile Dropdown */}
          {isAuthenticated ? (
            <div className="relative" ref={userMenuRef}>
              <button
                onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                className="flex items-center gap-2 bg-gradient-to-r from-slate-950/80 to-slate-900/80 hover:bg-slate-800/90 border border-cyan-500/30 hover:border-cyan-500/60 pl-1.5 pr-2.5 py-1 rounded-xl transition-all cursor-pointer shadow-sm group"
              >
                {user.picture ? (
                  <img src={user.picture} alt={user.name} className="w-6 h-6 rounded-full border border-cyan-500/40 shrink-0" />
                ) : (
                  <div className="w-6 h-6 rounded-full bg-gradient-to-br from-cyan-400 to-blue-500 text-slate-950 font-extrabold text-xs flex items-center justify-center shrink-0">
                    {user.name ? user.name[0].toUpperCase() : 'A'}
                  </div>
                )}
                <div className="text-left hidden sm:block max-w-[90px] xl:max-w-[120px]">
                  <div className="text-xs font-bold text-white truncate leading-tight">
                    {user.name || user.email.split('@')[0]}
                  </div>
                  <div className={`text-[9px] font-extrabold leading-none ${isSuperAdmin ? 'text-cyan-400' : 'text-purple-400'}`}>
                    {isSuperAdmin ? 'Super Admin' : 'Admin'}
                  </div>
                </div>
                <ChevronDown size={12} className={`text-slate-400 transition-transform duration-200 ${isUserMenuOpen ? 'rotate-180' : ''}`} />
              </button>

              {/* User Dropdown Menu */}
              {isUserMenuOpen && (
                <div className="absolute right-0 mt-2 w-64 bg-slate-900/95 border border-cyan-500/30 rounded-2xl shadow-2xl p-2 z-50 animate-in fade-in zoom-in-95 duration-150 backdrop-blur-xl">
                  {/* User Profile Header Card */}
                  <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800 mb-1.5 flex items-center gap-3">
                    {user.picture ? (
                      <img src={user.picture} alt={user.name} className="w-9 h-9 rounded-full border border-cyan-500/40 shrink-0" />
                    ) : (
                      <div className="w-9 h-9 rounded-full bg-gradient-to-br from-cyan-400 to-blue-500 text-slate-950 font-extrabold text-sm flex items-center justify-center shrink-0">
                        {user.name ? user.name[0].toUpperCase() : 'A'}
                      </div>
                    )}
                    <div className="overflow-hidden">
                      <div className="text-xs font-extrabold text-white truncate">{user.name || 'Admin User'}</div>
                      <div className="text-[10px] text-slate-400 truncate">{user.email}</div>
                      <div className="mt-1">
                        <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${isSuperAdmin
                          ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30'
                          : 'bg-purple-500/20 text-purple-300 border-purple-500/30'
                          }`}>
                          {isSuperAdmin ? 'SUPER ADMIN' : 'ADMINISTRATOR'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Super Admin Control: Manage Users */}
                  {isSuperAdmin && (
                    <button
                      onClick={() => {
                        onOpenUserModal();
                        setIsUserMenuOpen(false);
                      }}
                      className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-left text-xs font-bold text-slate-200 hover:bg-slate-800 hover:text-cyan-300 transition-colors cursor-pointer mb-1"
                    >
                      <div className="flex items-center gap-2.5">
                        <Users size={15} className="text-cyan-400" />
                        <span>Kelola Persetujuan User</span>
                      </div>
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300">
                        Approval
                      </span>
                    </button>
                  )}

                  <div className="h-px bg-slate-800 my-1" />

                  {/* Logout Button */}
                  <button
                    onClick={() => {
                      logout();
                      if (onNavigateView) onNavigateView('dashboard');
                      setIsUserMenuOpen(false);
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-left text-xs font-bold text-rose-400 hover:bg-rose-500/15 transition-colors cursor-pointer"
                  >
                    <LogOut size={15} />
                    <span>Keluar / Logout</span>
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <div className="bg-amber-500/15 border border-amber-500/30 px-2.5 py-1 rounded-xl text-[11px] text-amber-400 flex items-center gap-1 font-semibold">
                <Lock size={13} />
                <span className="hidden xl:inline">Read-Only</span>
              </div>

              <button
                onClick={() => handleGoogleLogin()}
                className="flex items-center gap-1.5 bg-white hover:bg-slate-100 text-slate-900 px-3 py-1.5 rounded-xl font-bold text-xs shadow-md transition-colors cursor-pointer"
              >
                <svg width="15" height="15" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                </svg>
                <span>Login</span>
              </button>
            </div>
          )}

        </div>

        {/* ========================================================================= */}
        {/* MOBILE MENU TOGGLE BUTTON (Screens < lg) */}
        {/* ========================================================================= */}
        <div className="flex lg:hidden items-center gap-1.5">
          {isAuthenticated && (
            <button
              onClick={onRefresh}
              className="p-2 bg-slate-800 text-slate-300 hover:text-white rounded-xl border border-slate-700 cursor-pointer"
              title={t('refresh')}
            >
              <RefreshCw size={15} />
            </button>
          )}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="p-2 bg-gradient-to-r from-cyan-500/20 to-blue-500/20 text-cyan-400 rounded-xl border border-cyan-500/40 cursor-pointer hover:bg-cyan-500/30 transition-all"
            aria-label="Toggle Navigation Menu"
          >
            {isMobileMenuOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>

      </div>

      {/* ========================================================================= */}
      {/* MOBILE DRAWER: View Switcher & Action List */}
      {/* ========================================================================= */}
      {isMobileMenuOpen && (
        <div className="lg:hidden mt-3 pt-3 border-t border-slate-800 flex flex-col gap-3 animate-in fade-in slide-in-from-top-2 duration-200">

          {/* Navigation Views */}
          {onNavigateView && (
            <div className={`grid ${isAuthenticated ? 'grid-cols-2' : 'grid-cols-1'} gap-2 bg-slate-950/70 p-2 rounded-2xl border border-slate-800`}>
              <button
                onClick={() => {
                  onNavigateView('dashboard');
                  setIsMobileMenuOpen(false);
                }}
                className={`py-2 px-3 rounded-xl text-xs font-extrabold flex items-center justify-center gap-2 transition-all cursor-pointer ${currentView === 'dashboard'
                  ? 'bg-gradient-to-r from-cyan-500/30 to-blue-500/30 text-cyan-300 border border-cyan-500/40 shadow-sm'
                  : 'text-slate-400 hover:text-white'
                  }`}
              >
                <LayoutDashboard size={15} />
                <span>Dashboard</span>
              </button>

              {isAuthenticated && (
                <button
                  onClick={() => {
                    onNavigateView('server-list');
                    setIsMobileMenuOpen(false);
                  }}
                  className={`py-2 px-3 rounded-xl text-xs font-extrabold flex items-center justify-center gap-2 transition-all cursor-pointer ${currentView === 'server-list'
                    ? 'bg-gradient-to-r from-cyan-500/30 to-blue-500/30 text-cyan-300 border border-cyan-500/40 shadow-sm'
                    : 'text-slate-400 hover:text-white'
                    }`}
                >
                  <Server size={15} />
                  <span>Server List</span>
                </button>
              )}

              {isAuthenticated && (
                <>
                  <button
                    onClick={() => {
                      onNavigateView('installation');
                      setIsMobileMenuOpen(false);
                    }}
                    className={`py-2 px-3 rounded-xl text-xs font-extrabold flex items-center justify-center gap-2 transition-all cursor-pointer ${currentView === 'installation' || currentView === 'instalation'
                      ? 'bg-gradient-to-r from-cyan-500/30 to-blue-500/30 text-cyan-300 border border-cyan-500/40 shadow-sm'
                      : 'text-slate-400 hover:text-white'
                      }`}
                  >
                    <Download size={15} />
                    <span>Installation</span>
                  </button>

                  <button
                    onClick={() => {
                      onNavigateView('sync');
                      setIsMobileMenuOpen(false);
                    }}
                    className={`py-2 px-3 rounded-xl text-xs font-extrabold flex items-center justify-center gap-2 transition-all cursor-pointer ${currentView === 'sync'
                      ? 'bg-gradient-to-r from-cyan-500/30 to-blue-500/30 text-cyan-300 border border-cyan-500/40 shadow-sm'
                      : 'text-slate-400 hover:text-white'
                      }`}
                  >
                    <Zap size={15} />
                    <span>Database Sync</span>
                  </button>

                  <button
                    onClick={() => {
                      onNavigateView('sounds-comparison');
                      setIsMobileMenuOpen(false);
                    }}
                    className={`py-2 px-3 rounded-xl text-xs font-extrabold flex items-center justify-center gap-2 transition-all cursor-pointer ${currentView === 'sounds-comparison'
                      ? 'bg-gradient-to-r from-cyan-500/30 to-blue-500/30 text-cyan-300 border border-cyan-500/40 shadow-sm'
                      : 'text-slate-400 hover:text-white'
                      }`}
                  >
                    <Volume2 size={15} />
                    <span>Compare Sounds</span>
                  </button>

                  <button
                    onClick={() => {
                      onNavigateView('metadata-comparison');
                      setIsMobileMenuOpen(false);
                    }}
                    className={`py-2 px-3 rounded-xl text-xs font-extrabold flex items-center justify-center gap-2 transition-all cursor-pointer ${currentView === 'metadata-comparison'
                      ? 'bg-gradient-to-r from-purple-500/30 to-pink-500/30 text-purple-300 border border-purple-500/40 shadow-sm'
                      : 'text-slate-400 hover:text-white'
                      }`}
                  >
                    <Database size={15} />
                    <span>Compare Metadata</span>
                  </button>

                  <button
                    onClick={() => {
                      onNavigateView('rabbitmq');
                      setIsMobileMenuOpen(false);
                    }}
                    className={`py-2 px-3 rounded-xl text-xs font-extrabold flex items-center justify-center gap-2 transition-all cursor-pointer ${currentView === 'rabbitmq'
                      ? 'bg-gradient-to-r from-cyan-500/30 to-blue-500/30 text-cyan-300 border border-cyan-500/40 shadow-sm'
                      : 'text-slate-400 hover:text-white'
                      }`}
                  >
                    <Shuffle size={15} />
                    <span>RabbitMQ</span>
                  </button>

                  <button
                    onClick={() => {
                      onNavigateView('env-manager');
                      setIsMobileMenuOpen(false);
                    }}
                    className={`col-span-2 py-2 px-3 rounded-xl text-xs font-extrabold flex items-center justify-center gap-2 transition-all cursor-pointer ${currentView === 'env-manager'
                      ? 'bg-gradient-to-r from-emerald-500/30 to-cyan-500/30 text-emerald-300 border border-emerald-500/40 shadow-sm'
                      : 'text-slate-400 hover:text-white'
                      }`}
                  >
                    <FileCode size={15} />
                    <span>Environment Manager (.env)</span>
                  </button>
                </>
              )}
            </div>
          )}

          {/* Quick Actions (Add Server / DB) */}
          {isAuthenticated && (
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => {
                  onOpenAddModal();
                  setIsMobileMenuOpen(false);
                }}
                className="bg-gradient-to-r from-cyan-400 to-blue-500 text-slate-950 px-3 py-2.5 rounded-xl font-extrabold text-xs flex items-center justify-center gap-1.5 shadow-md shadow-cyan-500/20 cursor-pointer"
              >
                <Plus size={15} />
                <span>+ VPS / POD</span>
              </button>

              <button
                onClick={() => {
                  onOpenAddServiceModal();
                  setIsMobileMenuOpen(false);
                }}
                className="bg-gradient-to-r from-sky-400 to-sky-600 text-white px-3 py-2.5 rounded-xl font-extrabold text-xs flex items-center justify-center gap-1.5 shadow-md shadow-sky-500/20 cursor-pointer"
              >
                <Plus size={15} />
                <span>+ DB & Storage</span>
              </button>
            </div>
          )}

          {/* User Account / Login Section */}
          <div className="bg-slate-950/70 p-3 rounded-2xl border border-slate-800">
            {isAuthenticated ? (
              <div className="flex flex-col gap-2.5">
                <div className="flex items-center justify-between bg-cyan-500/10 border border-cyan-500/30 p-2.5 rounded-xl">
                  <div className="flex items-center gap-2.5">
                    {user.picture ? (
                      <img src={user.picture} alt={user.name} className="w-8 h-8 rounded-full border border-cyan-500/40 shrink-0" />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-cyan-400 text-slate-950 font-extrabold text-xs flex items-center justify-center shrink-0">
                        {user.name ? user.name[0].toUpperCase() : 'A'}
                      </div>
                    )}
                    <div>
                      <div className="text-xs font-extrabold text-white">{user.name || user.email}</div>
                      <div className={`text-[10px] font-bold ${isSuperAdmin ? 'text-cyan-400' : 'text-purple-400'}`}>
                        {isSuperAdmin ? 'Super Admin' : 'Admin'}
                      </div>
                    </div>
                  </div>

                  {isSuperAdmin && (
                    <button
                      onClick={() => {
                        onOpenUserModal();
                        setIsMobileMenuOpen(false);
                      }}
                      className="px-2.5 py-1.5 bg-slate-800 text-cyan-400 rounded-lg border border-slate-700 flex items-center gap-1 text-[11px] font-bold cursor-pointer"
                    >
                      <Users size={13} />
                      <span>Users</span>
                    </button>
                  )}
                </div>

                <button
                  onClick={() => {
                    logout();
                    if (onNavigateView) onNavigateView('dashboard');
                    setIsMobileMenuOpen(false);
                  }}
                  className="w-full py-2 bg-rose-500/15 hover:bg-rose-500/25 text-rose-400 rounded-xl border border-rose-500/30 font-bold text-xs flex items-center justify-center gap-2 cursor-pointer"
                >
                  <LogOut size={14} />
                  <span>Keluar / Logout</span>
                </button>
              </div>
            ) : (
              <button
                onClick={() => {
                  handleGoogleLogin();
                  setIsMobileMenuOpen(false);
                }}
                className="w-full flex items-center justify-center gap-2 bg-white hover:bg-slate-100 text-slate-900 py-2.5 rounded-xl font-bold text-xs shadow-md transition-colors cursor-pointer"
              >
                <svg width="16" height="16" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                </svg>
                <span>Login Google Admin</span>
              </button>
            )}
          </div>

          {/* Utility Tools (TV Mode & Language Switcher) */}
          <div className="flex items-center justify-between bg-slate-950/70 p-2.5 rounded-2xl border border-slate-800">
            <button
              onClick={() => {
                onToggleTvMode();
                setIsMobileMenuOpen(false);
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${isTvMode ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30' : 'bg-slate-900 text-slate-300 border border-slate-800'
                }`}
            >
              <Tv size={14} className={isTvMode ? 'text-cyan-400' : 'text-slate-400'} />
              <span>{isTvMode ? t('normalView') : t('tvMode')}</span>
            </button>

            <div className="flex items-center gap-1 bg-slate-900 p-0.5 rounded-xl border border-slate-800">
              <button
                onClick={() => changeLanguage('id')}
                className={`px-2.5 py-1 rounded-lg text-xs font-extrabold transition-colors cursor-pointer ${lang === 'id' ? 'bg-cyan-500/25 text-cyan-300' : 'text-slate-400'
                  }`}
              >
                🇮🇩 ID
              </button>
              <button
                onClick={() => changeLanguage('en')}
                className={`px-2.5 py-1 rounded-lg text-xs font-extrabold transition-colors cursor-pointer ${lang === 'en' ? 'bg-cyan-500/25 text-cyan-300' : 'text-slate-400'
                  }`}
              >
                🇬🇧 EN
              </button>
            </div>
          </div>

        </div>
      )}
    </header>
  );
}
