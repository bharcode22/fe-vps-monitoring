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
    <header
      className="glass-card"
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 900,
        borderRadius: '0 0 20px 20px',
        padding: '14px 28px',
        marginBottom: '28px',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        background: 'rgba(11, 15, 25, 0.75)',
        borderBottom: '1px solid rgba(0, 242, 254, 0.2)',
        boxShadow: '0 12px 40px rgba(0, 0, 0, 0.5)',
        transition: 'all 0.3s ease'
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>

        {/* Brand Logo & Title */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{
            background: 'linear-gradient(135deg, rgba(0, 242, 254, 0.2) 0%, rgba(79, 172, 254, 0.2) 100%)',
            border: '1px solid rgba(0, 242, 254, 0.4)',
            padding: '10px',
            borderRadius: '14px',
            display: 'flex',
            alignItems: 'center',
            justify: 'center',
            boxShadow: '0 0 15px rgba(0, 242, 254, 0.2)'
          }}>
            <Activity color="#00f2fe" size={26} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <h1 className="gradient-text" style={{ fontSize: '1.4rem', fontWeight: 800, letterSpacing: '-0.5px' }}>
                {t('appTitle')}
              </h1>
              <span style={{
                fontSize: '0.7rem',
                fontWeight: 700,
                padding: '2px 8px',
                borderRadius: '6px',
                background: 'rgba(0, 242, 254, 0.15)',
                color: '#00f2fe',
                border: '1px solid rgba(0, 242, 254, 0.3)'
              }}>
                v3.5 PRO
              </span>
            </div>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem', marginTop: '2px' }}>
              {t('appSubtitle')}
            </p>
          </div>
        </div>

        {/* Right Toolbar & Action Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>

          {/* Action Group for Approved Admin: + VPS/POD and + DB/Storage */}
          {isAuthenticated && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              background: 'rgba(0, 0, 0, 0.4)',
              padding: '4px 6px',
              borderRadius: '14px',
              border: '1px solid rgba(255, 255, 255, 0.1)'
            }}>
              <button
                onClick={onOpenAddModal}
                style={{
                  background: 'linear-gradient(135deg, #00f2fe 0%, #4facfe 100%)',
                  color: '#0b0f19',
                  border: 'none',
                  padding: '7px 14px',
                  borderRadius: '10px',
                  fontWeight: 700,
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  boxShadow: '0 2px 10px rgba(0, 242, 254, 0.3)',
                  transition: 'all 0.2s ease'
                }}
                title="Tambah Server VPS atau POD (SSH)"
              >
                <Plus size={16} />
                <span>+ VPS / POD</span>
              </button>

              <button
                onClick={onOpenAddServiceModal}
                style={{
                  background: 'linear-gradient(135deg, #38bdf8 0%, #0284c7 100%)',
                  color: '#fff',
                  border: 'none',
                  padding: '7px 14px',
                  borderRadius: '10px',
                  fontWeight: 700,
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  boxShadow: '0 2px 10px rgba(56, 189, 248, 0.3)',
                  transition: 'all 0.2s ease'
                }}
                title="Tambah Database PostgreSQL atau MinIO / S3 Storage"
              >
                <Plus size={16} />
                <span>+ DB & Storage</span>
              </button>
            </div>
          )}

          {/* Icon Utility Tools (TV Mode, Refresh, Language) */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            background: 'rgba(0, 0, 0, 0.35)',
            padding: '4px',
            borderRadius: '12px',
            border: '1px solid var(--border-color)'
          }}>
            {/* TV Mode */}
            <button
              onClick={onToggleTvMode}
              style={{
                background: isTvMode ? 'rgba(0, 242, 254, 0.2)' : 'transparent',
                color: isTvMode ? '#00f2fe' : 'var(--text-muted)',
                border: 'none',
                padding: '6px 10px',
                borderRadius: '8px',
                fontSize: '0.8rem',
                cursor: 'pointer',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                transition: 'all 0.2s ease'
              }}
              title="Toggle TV / NOC Wall View Mode"
            >
              <Tv size={15} color={isTvMode ? '#00f2fe' : 'currentColor'} />
              <span>{isTvMode ? t('normalView') : t('tvMode')}</span>
            </button>

            {/* Refresh */}
            <button
              onClick={onRefresh}
              style={{
                background: 'transparent',
                color: 'var(--text-muted)',
                border: 'none',
                padding: '6px',
                borderRadius: '8px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
              title={t('refresh')}
            >
              <RefreshCw size={15} />
            </button>

            {/* Language Switcher (ID/EN) */}
            <div style={{ display: 'flex', gap: '2px', marginLeft: '4px' }}>
              <button
                onClick={() => changeLanguage('id')}
                style={{
                  background: lang === 'id' ? 'rgba(0, 242, 254, 0.25)' : 'transparent',
                  color: lang === 'id' ? '#00f2fe' : 'var(--text-muted)',
                  border: 'none',
                  padding: '4px 8px',
                  borderRadius: '6px',
                  fontSize: '0.75rem',
                  cursor: 'pointer',
                  fontWeight: 700
                }}
                title="Bahasa Indonesia"
              >
                🇮🇩 ID
              </button>
              <button
                onClick={() => changeLanguage('en')}
                style={{
                  background: lang === 'en' ? 'rgba(0, 242, 254, 0.25)' : 'transparent',
                  color: lang === 'en' ? '#00f2fe' : 'var(--text-muted)',
                  border: 'none',
                  padding: '4px 8px',
                  borderRadius: '6px',
                  fontSize: '0.75rem',
                  cursor: 'pointer',
                  fontWeight: 700
                }}
                title="English"
              >
                🇬🇧 EN
              </button>
            </div>
          </div>

          {/* User Auth Section */}
          {isAuthenticated ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              
              {/* User Profile Badge */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                background: 'rgba(0, 242, 254, 0.08)',
                border: '1px solid rgba(0, 242, 254, 0.25)',
                padding: '5px 12px',
                borderRadius: '12px'
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
                  style={{ padding: '7px 10px', fontSize: '0.82rem' }}
                  title="Kelola Persetujuan User Pending"
                >
                  <Users size={15} color="#00f2fe" />
                </button>
              )}

              {/* Logout Button */}
              <button
                onClick={logout}
                className="btn-danger"
                style={{ padding: '7px 10px' }}
                title="Logout / Keluar"
              >
                <LogOut size={15} />
              </button>

            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{
                background: 'rgba(245, 158, 11, 0.12)',
                border: '1px solid rgba(245, 158, 11, 0.3)',
                padding: '6px 12px',
                borderRadius: '10px',
                fontSize: '0.78rem',
                color: '#f59e0b',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}>
                <Lock size={14} /> Read-Only
              </div>

              {/* Google Sign In Button */}
              <button
                onClick={() => handleGoogleLogin()}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  background: '#ffffff',
                  color: '#1f2937',
                  border: 'none',
                  padding: '7px 14px',
                  borderRadius: '10px',
                  fontWeight: 600,
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                  boxShadow: '0 2px 10px rgba(255, 255, 255, 0.2)',
                  transition: 'all 0.2s ease'
                }}
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
