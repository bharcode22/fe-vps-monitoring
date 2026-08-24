import React from 'react';
import {
  LayoutDashboard,
  Server,
  Download,
  Plus,
  Tv,
  LogOut,
  Users
} from 'lucide-react';
import { useGoogleLogin } from '@react-oauth/google';
import { useLanguage } from '../../context/LanguageContext';
import { useAuth } from '../../context/AuthContext';
import { PRIMARY_NAV_ITEMS, NAV_DROPDOWN_GROUPS } from './navConfig';

export default function NavbarMobileDrawer({
  isOpen,
  onClose,
  currentView,
  onNavigateView,
  onOpenAddModal,
  onOpenAddServiceModal,
  onOpenUserModal,
  isTvMode,
  onToggleTvMode
}) {
  const { lang, changeLanguage, t } = useLanguage();
  const { user, isAuthenticated, isSuperAdmin, loginWithGoogle, logout } = useAuth();

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

  if (!isOpen) return null;

  return (
    <div className="lg:hidden mt-3 pt-3 border-t border-slate-800 flex flex-col gap-3.5 animate-in fade-in slide-in-from-top-2 duration-200">
      {/* 1. Primary Navigation Views */}
      <div className="grid grid-cols-2 gap-2 bg-slate-950/70 p-2 rounded-2xl border border-slate-800">
        {PRIMARY_NAV_ITEMS.map((item) => {
          if (item.authRequired && !isAuthenticated) return null;
          const ItemIcon = item.icon;
          const isActive =
            currentView === item.id ||
            (item.aliases && item.aliases.includes(currentView));

          return (
            <button
              key={item.id}
              onClick={() => {
                onNavigateView(item.id);
                onClose();
              }}
              className={`py-2 px-3 rounded-xl text-xs font-extrabold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                isActive
                  ? 'bg-gradient-to-r from-cyan-500/30 to-blue-500/30 text-cyan-300 border border-cyan-500/40 shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <ItemIcon size={15} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>

      {/* 2. Grouped Sub-Views (Tools & Management) */}
      {isAuthenticated && (
        <div className="flex flex-col gap-3 bg-slate-950/70 p-2.5 rounded-2xl border border-slate-800">
          {NAV_DROPDOWN_GROUPS.map((group) => {
            return (
              <div key={group.groupId} className="flex flex-col gap-1">
                <div className="px-2 py-0.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
                  <span>{group.label}</span>
                  {group.badge && (
                    <span className="text-[9px] font-mono font-bold px-1.5 py-0.2 rounded bg-slate-800 text-slate-400">
                      {group.badge}
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                  {group.items.map((item) => {
                    const ItemIcon = item.icon;
                    const isItemActive =
                      currentView === item.id ||
                      (item.aliases && item.aliases.includes(currentView));

                    return (
                      <button
                        key={item.id}
                        onClick={() => {
                          onNavigateView(item.id);
                          onClose();
                        }}
                        className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-left transition-colors cursor-pointer text-xs font-bold border ${
                          isItemActive
                            ? item.bgActiveClass
                            : 'text-slate-300 hover:bg-slate-900 hover:text-white border-transparent'
                        }`}
                      >
                        <ItemIcon size={15} className={`${item.colorClass} shrink-0`} />
                        <div className="flex-1 overflow-hidden">
                          <div className="truncate">{item.label}</div>
                          {item.desc && (
                            <div className="text-[10px] text-slate-400 font-normal truncate">
                              {item.desc}
                            </div>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 3. Quick Actions (+ VPS / POD, + DB & Storage) */}
      {isAuthenticated && (
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => {
              onOpenAddModal();
              onClose();
            }}
            className="bg-gradient-to-r from-cyan-400 to-blue-500 text-slate-950 px-3 py-2.5 rounded-xl font-extrabold text-xs flex items-center justify-center gap-1.5 shadow-md shadow-cyan-500/20 cursor-pointer"
          >
            <Plus size={15} />
            <span>+ VPS / POD</span>
          </button>

          <button
            onClick={() => {
              onOpenAddServiceModal();
              onClose();
            }}
            className="bg-gradient-to-r from-sky-400 to-sky-600 text-white px-3 py-2.5 rounded-xl font-extrabold text-xs flex items-center justify-center gap-1.5 shadow-md shadow-sky-500/20 cursor-pointer"
          >
            <Plus size={15} />
            <span>+ DB &amp; Storage</span>
          </button>
        </div>
      )}

      {/* 4. User Account / Login Section */}
      <div className="bg-slate-950/70 p-3 rounded-2xl border border-slate-800">
        {isAuthenticated ? (
          <div className="flex flex-col gap-2.5">
            <div className="flex items-center justify-between bg-cyan-500/10 border border-cyan-500/30 p-2.5 rounded-xl">
              <div className="flex items-center gap-2.5">
                {user?.picture ? (
                  <img
                    src={user.picture}
                    alt={user.name}
                    className="w-8 h-8 rounded-full border border-cyan-500/40 shrink-0"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-cyan-400 text-slate-950 font-extrabold text-xs flex items-center justify-center shrink-0">
                    {user?.name ? user.name[0].toUpperCase() : 'A'}
                  </div>
                )}
                <div>
                  <div className="text-xs font-extrabold text-white">{user?.name || user?.email}</div>
                  <div className={`text-[10px] font-bold ${isSuperAdmin ? 'text-cyan-400' : 'text-purple-400'}`}>
                    {isSuperAdmin ? 'Super Admin' : 'Admin'}
                  </div>
                </div>
              </div>

              {isSuperAdmin && (
                <button
                  onClick={() => {
                    onOpenUserModal();
                    onClose();
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
                onClose();
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
              onClose();
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

      {/* 5. Mobile Utilities (TV Mode & Language Switcher) */}
      <div className="flex items-center justify-between bg-slate-950/70 p-2.5 rounded-2xl border border-slate-800">
        <button
          onClick={() => {
            onToggleTvMode();
            onClose();
          }}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
            isTvMode
              ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
              : 'bg-slate-900 text-slate-300 border border-slate-800'
          }`}
        >
          <Tv size={14} className={isTvMode ? 'text-cyan-400' : 'text-slate-400'} />
          <span>{isTvMode ? t('normalView') : t('tvMode')}</span>
        </button>

        <div className="flex items-center gap-1 bg-slate-900 p-0.5 rounded-xl border border-slate-800">
          <button
            onClick={() => changeLanguage('id')}
            className={`px-2.5 py-1 rounded-lg text-xs font-extrabold transition-colors cursor-pointer ${
              lang === 'id' ? 'bg-cyan-500/25 text-cyan-300' : 'text-slate-400'
            }`}
          >
            🇮🇩 ID
          </button>
          <button
            onClick={() => changeLanguage('en')}
            className={`px-2.5 py-1 rounded-lg text-xs font-extrabold transition-colors cursor-pointer ${
              lang === 'en' ? 'bg-cyan-500/25 text-cyan-300' : 'text-slate-400'
            }`}
          >
            🇬🇧 EN
          </button>
        </div>
      </div>
    </div>
  );
}
