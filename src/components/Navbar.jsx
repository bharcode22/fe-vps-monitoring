import React, { useState } from 'react';
import { Server, Plus, Activity, RefreshCw, Tv, Users, LogOut, Lock, Database, HardDrive, Menu, X, Zap } from 'lucide-react';
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
  const { lang, changeLanguage, t } = useLanguage();
  const { user, isAuthenticated, isSuperAdmin, loginWithGoogle, logout, authError } = useAuth();

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

  return (
    <header className="sticky top-0 z-50 rounded-b-2xl px-4 sm:px-6 py-3.5 mb-7 backdrop-blur-xl bg-slate-900/90 border-b border-cyan-500/20 shadow-2xl transition-all duration-300">
      <div className="flex items-center justify-between">

        {/* Brand Logo & Title */}
        <div className="flex items-center gap-3">
          <div className="bg-gradient-to-br from-cyan-500/20 to-blue-500/20 border border-cyan-500/40 p-2 sm:p-2.5 rounded-xl flex items-center justify-center shadow-lg shadow-cyan-500/10 shrink-0">
            <Activity className="text-cyan-400 w-5 h-5 sm:w-6.5 sm:h-6.5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="gradient-text text-lg sm:text-xl font-extrabold tracking-tight">
                {t('appTitle')}
              </h1>
              <span className="text-[10px] sm:text-[11px] font-bold px-2 py-0.5 rounded-md bg-cyan-500/15 text-cyan-400 border border-cyan-500/30">
                v3.5 PRO
              </span>
            </div>
            <p className="text-slate-400 text-[11px] sm:text-xs mt-0.5 hidden xs:block sm:block">
              {t('appSubtitle')}
            </p>
          </div>
        </div>

        {/* Desktop View Toolbar */}
        <div className="hidden md:flex items-center gap-3">

          {/* View Switcher (Dashboard vs Sync DB) */}
          {onNavigateView && (
            <div className="flex items-center gap-1 bg-black/40 p-1 rounded-xl border border-white/10 mr-1">
              <button
                onClick={() => onNavigateView('dashboard')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                  currentView === 'dashboard'
                    ? 'bg-gradient-to-r from-cyan-500/30 to-blue-500/30 text-cyan-400 border border-cyan-500/40 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Activity size={14} />
                <span>Dashboard</span>
              </button>
              <button
                onClick={() => onNavigateView('sync')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                  currentView === 'sync'
                    ? 'bg-gradient-to-r from-cyan-500/30 to-blue-500/30 text-cyan-400 border border-cyan-500/40 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Zap size={14} />
                <span>Database Sync</span>
              </button>
            </div>
          )}

          {/* Action Group for Approved Admin */}
          {isAuthenticated && (
            <div className="flex items-center gap-2 bg-black/40 p-1 rounded-xl border border-white/10">
              <button
                onClick={onOpenAddModal}
                className="bg-gradient-to-r from-cyan-400 to-blue-500 hover:from-cyan-300 hover:to-blue-400 text-slate-950 px-3.5 py-1.5 rounded-lg font-bold text-xs flex items-center gap-1.5 shadow-md shadow-cyan-500/25 transition-all duration-200 cursor-pointer"
                title="Tambah Server VPS atau POD (SSH)"
              >
                <Plus size={15} />
                <span>+ VPS / POD</span>
              </button>

              <button
                onClick={onOpenAddServiceModal}
                className="bg-gradient-to-r from-sky-400 to-sky-600 hover:from-sky-300 hover:to-sky-500 text-white px-3.5 py-1.5 rounded-lg font-bold text-xs flex items-center gap-1.5 shadow-md shadow-sky-500/25 transition-all duration-200 cursor-pointer"
                title="Tambah Database PostgreSQL atau MinIO / S3 Storage"
              >
                <Plus size={15} />
                <span>+ DB & Storage</span>
              </button>
            </div>
          )}

          {/* Icon Utility Tools */}
          <div className="flex items-center gap-1 bg-black/35 p-1 rounded-xl border border-slate-800">
            <button
              onClick={onToggleTvMode}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all duration-200 cursor-pointer ${isTvMode ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30' : 'text-slate-400 hover:text-slate-200'
                }`}
              title="Toggle TV / NOC Wall View Mode"
            >
              <Tv size={15} className={isTvMode ? 'text-cyan-400' : 'text-slate-400'} />
              <span>{isTvMode ? t('normalView') : t('tvMode')}</span>
            </button>

            <button
              onClick={onRefresh}
              className="p-1.5 text-slate-400 hover:text-slate-200 rounded-lg transition-colors cursor-pointer"
              title={t('refresh')}
            >
              <RefreshCw size={15} />
            </button>

            <div className="flex gap-0.5 ml-1">
              <button
                onClick={() => changeLanguage('id')}
                className={`px-2 py-1 rounded-md text-[11px] font-bold transition-colors cursor-pointer ${lang === 'id' ? 'bg-cyan-500/25 text-cyan-400' : 'text-slate-400 hover:text-slate-200'
                  }`}
              >
                🇮🇩 ID
              </button>
              <button
                onClick={() => changeLanguage('en')}
                className={`px-2 py-1 rounded-md text-[11px] font-bold transition-colors cursor-pointer ${lang === 'en' ? 'bg-cyan-500/25 text-cyan-400' : 'text-slate-400 hover:text-slate-200'
                  }`}
              >
                🇬🇧 EN
              </button>
            </div>
          </div>

          {/* User Auth Section */}
          {isAuthenticated ? (
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2 bg-cyan-500/10 border border-cyan-500/30 px-3 py-1 rounded-xl">
                {user.picture ? (
                  <img src={user.picture} alt={user.name} className="w-6 h-6 rounded-full" />
                ) : (
                  <div className="w-6 h-6 rounded-full bg-cyan-400 text-slate-950 font-bold text-xs flex items-center justify-center">
                    {user.name ? user.name[0] : 'A'}
                  </div>
                )}
                <div>
                  <div className="text-xs font-semibold text-white leading-tight">{user.name || user.email}</div>
                  <div className={`text-[10px] font-bold ${isSuperAdmin ? 'text-cyan-400' : 'text-purple-400'}`}>
                    {isSuperAdmin ? '⭐ Super Admin' : 'Admin'}
                  </div>
                </div>
              </div>

              {isSuperAdmin && (
                <button
                  onClick={onOpenUserModal}
                  className="p-2 bg-slate-800 hover:bg-slate-700 text-cyan-400 rounded-lg border border-slate-700 transition-colors cursor-pointer"
                  title="Kelola Persetujuan User Pending"
                >
                  <Users size={15} />
                </button>
              )}

              <button
                onClick={logout}
                className="p-2 bg-red-500/15 hover:bg-red-500/25 text-red-400 rounded-lg border border-red-500/30 transition-colors cursor-pointer"
                title="Logout / Keluar"
              >
                <LogOut size={15} />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <div className="bg-amber-500/15 border border-amber-500/30 px-3 py-1.5 rounded-xl text-xs text-amber-400 flex items-center gap-1.5 font-medium">
                <Lock size={14} /> Read-Only
              </div>

              <button
                onClick={() => handleGoogleLogin()}
                className="flex items-center gap-2 bg-white hover:bg-slate-100 text-slate-900 px-3.5 py-1.5 rounded-xl font-semibold text-xs shadow-md transition-colors cursor-pointer"
              >
                <svg width="18" height="18" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                </svg>
                <span>Login Google</span>
              </button>
            </div>
          )}

        </div>

        {/* Mobile Hamburger Menu Toggle Button */}
        <div className="flex md:hidden items-center gap-2">
          <button
            onClick={onRefresh}
            className="p-2 bg-slate-800 text-slate-300 hover:text-white rounded-xl border border-slate-700 cursor-pointer"
            title={t('refresh')}
          >
            <RefreshCw size={16} />
          </button>
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="p-2 bg-gradient-to-r from-cyan-500/20 to-blue-500/20 text-cyan-400 rounded-xl border border-cyan-500/40 cursor-pointer hover:bg-cyan-500/30 transition-all"
            aria-label="Toggle Navigation Menu"
          >
            {isMobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>

      </div>

      {/* Mobile Menu Dropdown Drawer */}
      {isMobileMenuOpen && (
        <div className="md:hidden mt-4 pt-4 border-t border-slate-800 flex flex-col gap-3.5 animate-in fade-in slide-in-from-top-2 duration-200">

          {/* View Navigation Switcher Mobile */}
          {onNavigateView && (
            <div className="grid grid-cols-2 gap-2 bg-slate-950/60 p-2 rounded-2xl border border-white/10">
              <button
                onClick={() => {
                  onNavigateView('dashboard');
                  setIsMobileMenuOpen(false);
                }}
                className={`py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                  currentView === 'dashboard'
                    ? 'bg-gradient-to-r from-cyan-500/30 to-blue-500/30 text-cyan-400 border border-cyan-500/40'
                    : 'text-slate-400'
                }`}
              >
                <Activity size={15} />
                <span>Dashboard</span>
              </button>
              <button
                onClick={() => {
                  onNavigateView('sync');
                  setIsMobileMenuOpen(false);
                }}
                className={`py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                  currentView === 'sync'
                    ? 'bg-gradient-to-r from-cyan-500/30 to-blue-500/30 text-cyan-400 border border-cyan-500/40'
                    : 'text-slate-400'
                }`}
              >
                <Zap size={15} />
                <span>Database Sync</span>
              </button>
            </div>
          )}

          {/* Action Buttons for Authenticated User */}
          {isAuthenticated && (
            <div className="flex flex-col gap-2 bg-slate-950/60 p-3 rounded-2xl border border-cyan-500/20">
              <span className="text-[11px] font-bold text-slate-400 tracking-wider uppercase">Tindakan Cepat</span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <button
                  onClick={() => {
                    onOpenAddModal();
                    setIsMobileMenuOpen(false);
                  }}
                  className="w-full bg-gradient-to-r from-cyan-400 to-blue-500 text-slate-950 px-4 py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-2 shadow-md shadow-cyan-500/20 cursor-pointer"
                >
                  <Plus size={16} />
                  <span>+ VPS / POD</span>
                </button>

                <button
                  onClick={() => {
                    onOpenAddServiceModal();
                    setIsMobileMenuOpen(false);
                  }}
                  className="w-full bg-gradient-to-r from-sky-400 to-sky-600 text-white px-4 py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-2 shadow-md shadow-sky-500/20 cursor-pointer"
                >
                  <Plus size={16} />
                  <span>+ DB & Storage</span>
                </button>
              </div>
            </div>
          )}

          {/* User Account / Login Section */}
          <div className="bg-slate-950/60 p-3 rounded-2xl border border-slate-800">
            <span className="text-[11px] font-bold text-slate-400 tracking-wider uppercase mb-2 block">Akun & Sesi</span>
            {isAuthenticated ? (
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between bg-cyan-500/10 border border-cyan-500/30 p-2.5 rounded-xl">
                  <div className="flex items-center gap-2.5">
                    {user.picture ? (
                      <img src={user.picture} alt={user.name} className="w-8 h-8 rounded-full" />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-cyan-400 text-slate-950 font-bold text-sm flex items-center justify-center">
                        {user.name ? user.name[0] : 'A'}
                      </div>
                    )}
                    <div>
                      <div className="text-xs font-bold text-white">{user.name || user.email}</div>
                      <div className={`text-[10px] font-bold ${isSuperAdmin ? 'text-cyan-400' : 'text-purple-400'}`}>
                        {isSuperAdmin ? '⭐ Super Admin' : 'Admin'}
                      </div>
                    </div>
                  </div>

                  {isSuperAdmin && (
                    <button
                      onClick={() => {
                        onOpenUserModal();
                        setIsMobileMenuOpen(false);
                      }}
                      className="p-2 bg-slate-800 text-cyan-400 rounded-lg border border-slate-700 flex items-center gap-1.5 text-xs font-semibold cursor-pointer"
                    >
                      <Users size={14} />
                      <span>Users</span>
                    </button>
                  )}
                </div>

                <button
                  onClick={() => {
                    logout();
                    setIsMobileMenuOpen(false);
                  }}
                  className="w-full py-2 bg-red-500/15 hover:bg-red-500/25 text-red-400 rounded-xl border border-red-500/30 font-bold text-xs flex items-center justify-center gap-2 cursor-pointer"
                >
                  <LogOut size={15} />
                  <span>Keluar / Logout</span>
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-2.5">
                <div className="bg-amber-500/15 border border-amber-500/30 px-3 py-1.5 rounded-xl text-xs text-amber-400 flex items-center gap-1.5 font-medium justify-center">
                  <Lock size={14} /> Mode Read-Only
                </div>
                <button
                  onClick={() => {
                    handleGoogleLogin();
                    setIsMobileMenuOpen(false);
                  }}
                  className="w-full flex items-center justify-center gap-2 bg-white hover:bg-slate-100 text-slate-900 py-2.5 rounded-xl font-bold text-xs shadow-md transition-colors cursor-pointer"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                  </svg>
                  <span>Login Google Admin</span>
                </button>
              </div>
            )}
          </div>

          {/* Utility Tools (TV Mode & Language Switcher) */}
          <div className="flex items-center justify-between bg-slate-950/60 p-3 rounded-2xl border border-slate-800">
            <button
              onClick={() => {
                onToggleTvMode();
                setIsMobileMenuOpen(false);
              }}
              className={`px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer ${isTvMode ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30' : 'bg-slate-900 text-slate-300 border border-slate-800'
                }`}
            >
              <Tv size={15} className={isTvMode ? 'text-cyan-400' : 'text-slate-400'} />
              <span>{isTvMode ? t('normalView') : t('tvMode')}</span>
            </button>

            <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-xl border border-slate-800">
              <button
                onClick={() => changeLanguage('id')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${lang === 'id' ? 'bg-cyan-500/25 text-cyan-400' : 'text-slate-400'
                  }`}
              >
                🇮🇩 ID
              </button>
              <button
                onClick={() => changeLanguage('en')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${lang === 'en' ? 'bg-cyan-500/25 text-cyan-400' : 'text-slate-400'
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
