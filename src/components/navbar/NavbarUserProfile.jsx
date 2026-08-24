import React, { useRef, useEffect } from 'react';
import { ChevronDown, Users, LogOut, Lock } from 'lucide-react';
import { useGoogleLogin } from '@react-oauth/google';
import { useAuth } from '../../context/AuthContext';

export default function NavbarUserProfile({
  isOpen,
  onToggle,
  onClose,
  onOpenUserModal,
  onNavigateHome
}) {
  const userMenuRef = useRef(null);
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

  useEffect(() => {
    function handleClickOutside(event) {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
        onClose();
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, onClose]);

  if (!isAuthenticated) {
    return (
      <div className="flex items-center gap-1.5">
        <div className="bg-amber-500/15 border border-amber-500/30 px-2 py-1 rounded-xl text-[10px] text-amber-400 flex items-center gap-1 font-semibold">
          <Lock size={12} />
          <span className="hidden lg:inline">Read-Only</span>
        </div>

        <button
          onClick={() => handleGoogleLogin()}
          className="flex items-center gap-1.5 bg-white hover:bg-slate-100 text-slate-900 px-2.5 py-1 rounded-xl font-bold text-xs shadow-md transition-colors cursor-pointer"
        >
          <svg width="14" height="14" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
          </svg>
          <span>Login</span>
        </button>
      </div>
    );
  }

  // First name or short handle
  const displayName = user?.name ? user.name.split(' ')[0] : (user?.email ? user.email.split('@')[0] : 'Admin');

  return (
    <div className="relative" ref={userMenuRef}>
      {/* User Header Pill */}
      <button
        onClick={onToggle}
        className="flex items-center gap-1.5 bg-slate-950/80 hover:bg-slate-900 border border-cyan-500/30 hover:border-cyan-500/60 pl-1 pr-2 py-1 rounded-xl transition-all cursor-pointer shadow-sm group"
      >
        {user?.picture ? (
          <img
            src={user.picture}
            alt={user.name}
            className="w-5 h-5 rounded-full border border-cyan-500/40 shrink-0"
          />
        ) : (
          <div className="w-5 h-5 rounded-full bg-gradient-to-br from-cyan-400 to-blue-500 text-slate-950 font-extrabold text-[10px] flex items-center justify-center shrink-0">
            {displayName[0].toUpperCase()}
          </div>
        )}
        <div className="text-left hidden xl:block max-w-[80px]">
          <div className="text-xs font-bold text-white truncate leading-tight">
            {displayName}
          </div>
        </div>
        <ChevronDown
          size={12}
          className={`text-slate-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-64 bg-slate-900/95 border border-cyan-500/30 rounded-2xl shadow-2xl p-2 z-50 animate-in fade-in zoom-in-95 duration-150 backdrop-blur-xl">
          {/* User Profile Header Card */}
          <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800 mb-1.5 flex items-center gap-3">
            {user?.picture ? (
              <img
                src={user.picture}
                alt={user.name}
                className="w-9 h-9 rounded-full border border-cyan-500/40 shrink-0"
              />
            ) : (
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-cyan-400 to-blue-500 text-slate-950 font-extrabold text-sm flex items-center justify-center shrink-0">
                {displayName[0].toUpperCase()}
              </div>
            )}
            <div className="overflow-hidden">
              <div className="text-xs font-extrabold text-white truncate">
                {user?.name || 'Admin User'}
              </div>
              <div className="text-[10px] text-slate-400 truncate">{user?.email}</div>
              <div className="mt-1">
                <span
                  className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${
                    isSuperAdmin
                      ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30'
                      : 'bg-purple-500/20 text-purple-300 border-purple-500/30'
                  }`}
                >
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
                onClose();
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
              if (onNavigateHome) onNavigateHome();
              onClose();
            }}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-left text-xs font-bold text-rose-400 hover:bg-rose-500/15 transition-colors cursor-pointer"
          >
            <LogOut size={15} />
            <span>Keluar / Logout</span>
          </button>
        </div>
      )}
    </div>
  );
}
