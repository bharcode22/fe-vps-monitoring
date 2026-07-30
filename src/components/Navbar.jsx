import React from 'react';
import { Server, Plus, Activity, RefreshCw, Tv, Users, LogOut, Lock } from 'lucide-react';
import { useGoogleLogin } from '@react-oauth/google';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';

export default function Navbar({
  onOpenAddModal,
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
    <header
      className="glass-card"
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 900,
        borderRadius: '0 0 20px 20px',
        padding: '16px 28px',
        marginBottom: '28px',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        boxShadow: '0 10px 30px rgba(0, 0, 0, 0.4)',
        transition: 'all 0.3s ease'
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>

        {/* Logo & Title */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{
            background: 'linear-gradient(135deg, rgba(0, 242, 254, 0.2) 0%, rgba(79, 172, 254, 0.2) 100%)',
            border: '1px solid rgba(0, 242, 254, 0.4)',
            padding: '10px',
            borderRadius: '12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <Activity color="#00f2fe" size={26} />
          </div>
          <div>
            <h1 className="gradient-text" style={{ fontSize: '1.5rem', fontWeight: 700, letterSpacing: '-0.5px' }}>
              {t('appTitle')}
            </h1>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
              {t('appSubtitle')}
            </p>
          </div>
        </div>

        {/* Live Status Indicators & Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>

          {/* Language Switcher Toggle */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            background: 'rgba(0, 0, 0, 0.4)',
            padding: '3px',
            borderRadius: '10px',
            border: '1px solid var(--border-color)'
          }}>
            <button
              onClick={() => changeLanguage('id')}
              style={{
                background: lang === 'id' ? 'linear-gradient(135deg, #00f2fe 0%, #4facfe 100%)' : 'transparent',
                color: lang === 'id' ? '#0b0f19' : 'var(--text-muted)',
                border: 'none',
                padding: '5px 10px',
                borderRadius: '7px',
                fontSize: '0.8rem',
                cursor: 'pointer',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                transition: 'all 0.2s ease'
              }}
              title="Bahasa Indonesia"
            >
              🇮🇩 ID
            </button>
            <button
              onClick={() => changeLanguage('en')}
              style={{
                background: lang === 'en' ? 'linear-gradient(135deg, #00f2fe 0%, #4facfe 100%)' : 'transparent',
                color: lang === 'en' ? '#0b0f19' : 'var(--text-muted)',
                border: 'none',
                padding: '5px 10px',
                borderRadius: '7px',
                fontSize: '0.8rem',
                cursor: 'pointer',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                transition: 'all 0.2s ease'
              }}
              title="English Language"
            >
              🇬🇧 EN
            </button>
          </div>

          {/* TV / NOC Wall Display Mode Toggle */}
          <button
            onClick={onToggleTvMode}
            className="btn-secondary"
            style={{
              borderColor: isTvMode ? '#00f2fe' : 'var(--border-color)',
              background: isTvMode ? 'rgba(0, 242, 254, 0.15)' : 'rgba(255, 255, 255, 0.06)',
              color: isTvMode ? '#00f2fe' : 'var(--text-main)'
            }}
            title="Toggle TV / Wall Monitor Full View"
          >
            <Tv size={16} />
            <span>{isTvMode ? t('normalView') : t('tvMode')}</span>
          </button>

          {/* Refresh Button */}
          <button onClick={onRefresh} className="btn-secondary" title={t('refresh')}>
            <RefreshCw size={16} />
          </button>

          {/* User Auth Section */}
          {isAuthenticated ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              
              {/* User Profile Badge */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                background: 'rgba(0, 242, 254, 0.08)',
                border: '1px solid rgba(0, 242, 254, 0.25)',
                padding: '5px 12px',
                borderRadius: '10px'
              }}>
                {user.picture ? (
                  <img src={user.picture} alt={user.name} style={{ width: '24px', height: '24px', borderRadius: '50%' }} />
                ) : (
                  <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: '#00f2fe', color: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '0.75rem' }}>
                    {user.name ? user.name[0] : 'A'}
                  </div>
                )}
                <div>
                  <div style={{ fontSize: '0.82rem', fontWeight: 600, color: '#fff', lineHeight: 1.1 }}>{user.name || user.email}</div>
                  <div style={{ fontSize: '0.7rem', color: isSuperAdmin ? '#00f2fe' : '#c084fc', fontWeight: 700 }}>
                    {isSuperAdmin ? '⭐ Super Admin' : 'Admin'}
                  </div>
                </div>
              </div>

              {/* Super Admin User Management Button */}
              {isSuperAdmin && (
                <button
                  onClick={onOpenUserModal}
                  className="btn-secondary"
                  style={{ padding: '8px 12px', fontSize: '0.85rem' }}
                  title="Kelola Persetujuan User Pending"
                >
                  <Users size={16} color="#00f2fe" />
                  <span>Kelola User</span>
                </button>
              )}

              {/* Add VPS Button (Only Available for Approved Admin) */}
              <button onClick={onOpenAddModal} className="btn-primary">
                <Plus size={18} />
                <span>{t('addServer')}</span>
              </button>

              {/* Logout Button */}
              <button
                onClick={logout}
                className="btn-danger"
                style={{ padding: '8px 12px' }}
                title="Logout / Keluar"
              >
                <LogOut size={16} />
              </button>

            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{
                background: 'rgba(245, 158, 11, 0.12)',
                border: '1px solid rgba(245, 158, 11, 0.3)',
                padding: '6px 12px',
                borderRadius: '8px',
                fontSize: '0.78rem',
                color: '#f59e0b',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}>
                <Lock size={14} /> Mode Read-Only (Tamu)
              </div>

              {/* Google Sign In Button */}
              <button
                onClick={() => handleGoogleLogin()}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  background: '#ffffff',
                  color: '#3c4043',
                  border: '1px solid #dadce0',
                  padding: '7px 16px',
                  borderRadius: '20px',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                  transition: 'all 0.2s ease'
                }}
              >
                <svg width="18" height="18" viewBox="0 0 18 18">
                  <path fill="#4285F4" d="M17.64 9.2c0-.74-.06-1.28-.19-1.84H9v3.34h4.96c-.1.83-.64 2.08-1.84 2.92l2.84 2.2c1.7-1.57 2.68-3.88 2.68-6.62z"/>
                  <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.84-2.2c-.76.53-1.78.9-3.12.9-2.38 0-4.41-1.57-5.13-3.74L.97 13.04C2.45 15.98 5.48 18 9 18z"/>
                  <path fill="#FBBC05" d="M3.87 10.78c-.18-.53-.28-1.09-.28-1.78s.1-1.25.28-1.78L.97 4.96C.35 6.19 0 7.56 0 9s.35 2.81.97 4.04l2.9-2.26z"/>
                  <path fill="#EA4335" d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58C13.46.89 11.43 0 9 0 5.48 0 2.45 2.02.97 4.96l2.9 2.26C4.59 5.05 6.62 3.58 9 3.58z"/>
                </svg>
                Sign in with Google
              </button>
            </div>
          )}

        </div>

      </div>

      {authError && (
        <div style={{
          marginTop: '12px',
          background: 'rgba(239, 68, 68, 0.15)',
          border: '1px solid rgba(239, 68, 68, 0.3)',
          color: '#fca5a5',
          padding: '8px 14px',
          borderRadius: '8px',
          fontSize: '0.85rem'
        }}>
          ⚠️ {authError}
        </div>
      )}
    </header>
  );
}
