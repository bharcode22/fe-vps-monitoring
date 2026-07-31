import React from 'react';
import { Server, Plus, Activity, RefreshCw, Tv, Users, LogOut, Lock, Database, HardDrive } from 'lucide-react';
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
  onOpenUserModal
}) {
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
    <header className="sticky top-0 z-50 rounded-b-2xl px-6 py-3.5 mb-7 backdrop-blur-xl bg-slate-900/80 border-b border-cyan-500/20 shadow-2xl transition-all duration-300">
      <div className="flex items-center justify-between flex-wrap gap-4">

        {/* Brand Logo & Title */}
        <div className="flex items-center gap-3.5">
          <div className="bg-gradient-to-br from-cyan-500/20 to-blue-500/20 border border-cyan-500/40 p-2.5 rounded-xl flex items-center justify-center shadow-lg shadow-cyan-500/10">
            <Activity className="text-cyan-400 w-6.5 h-6.5" />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="gradient-text text-xl font-extrabold tracking-tight">
                {t('appTitle')}
              </h1>
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-cyan-500/15 text-cyan-400 border border-cyan-500/30">
                v3.5 PRO
              </span>
            </div>
            <p className="text-slate-400 text-xs mt-0.5">
              {t('appSubtitle')}
            </p>
          </div>
        </div>

        {/* Right Toolbar & Action Buttons */}
        <div className="flex items-center gap-3 flex-wrap">

          {/* Action Group for Approved Admin: + VPS/POD and + DB/Storage */}
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

          {/* Icon Utility Tools (TV Mode, Refresh, Language) */}
          <div className="flex items-center gap-1 bg-black/35 p-1 rounded-xl border border-slate-800">
            {/* TV Mode */}
            <button
              onClick={onToggleTvMode}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all duration-200 cursor-pointer ${
                isTvMode ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30' : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Toggle TV / NOC Wall View Mode"
            >
              <Tv size={15} className={isTvMode ? 'text-cyan-400' : 'text-slate-400'} />
              <span>{isTvMode ? t('normalView') : t('tvMode')}</span>
            </button>

            {/* Refresh */}
            <button
              onClick={onRefresh}
              className="p-1.5 text-slate-400 hover:text-slate-200 rounded-lg transition-colors cursor-pointer"
              title={t('refresh')}
            >
              <RefreshCw size={15} />
            </button>

            {/* Language Switcher (ID/EN) */}
            <div className="flex gap-0.5 ml-1">
              <button
                onClick={() => changeLanguage('id')}
                className={`px-2 py-1 rounded-md text-[11px] font-bold transition-colors cursor-pointer ${
                  lang === 'id' ? 'bg-cyan-500/25 text-cyan-400' : 'text-slate-400 hover:text-slate-200'
                }`}
                title="Bahasa Indonesia"
              >
                🇮🇩 ID
              </button>
              <button
                onClick={() => changeLanguage('en')}
                className={`px-2 py-1 rounded-md text-[11px] font-bold transition-colors cursor-pointer ${
                  lang === 'en' ? 'bg-cyan-500/25 text-cyan-400' : 'text-slate-400 hover:text-slate-200'
                }`}
                title="English"
              >
                🇬🇧 EN
              </button>
            </div>
          </div>

          {/* User Auth Section */}
          {isAuthenticated ? (
            <div className="flex items-center gap-2">
              
              {/* User Profile Badge */}
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

              {/* Super Admin User Management Button */}
              {isSuperAdmin && (
                <button
                  onClick={onOpenUserModal}
                  className="p-2 bg-slate-800 hover:bg-slate-700 text-cyan-400 rounded-lg border border-slate-700 transition-colors cursor-pointer"
                  title="Kelola Persetujuan User Pending"
                >
                  <Users size={15} />
                </button>
              )}

              {/* Logout Button */}
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

              {/* Google Sign In Button */}
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

      </div>
    </header>
  );
}
