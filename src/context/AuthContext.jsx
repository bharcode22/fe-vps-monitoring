import React, { createContext, useContext, useState, useEffect } from 'react';
import { BACKEND_URL } from '../config';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => {
    try {
      return localStorage.getItem('vps_monitoring_token') || '';
    } catch (e) {
      return '';
    }
  });

  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState('');

  // Validate stored token on mount
  useEffect(() => {
    if (token) {
      fetchMe(token);
    } else {
      setLoading(false);
    }
  }, []);

  const fetchMe = async (authToken) => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/auth/me`, {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      });
      const data = await res.json();
      if (data.success && data.user) {
        setUser(data.user);
      } else {
        logout();
      }
    } catch (err) {
      console.error('Failed to fetch user profile:', err);
      logout();
    } finally {
      setLoading(false);
    }
  };

  const loginWithGoogle = async (authPayload) => {
    setAuthError('');
    try {
      const bodyPayload = typeof authPayload === 'string'
        ? { credential: authPayload }
        : authPayload;

      const res = await fetch(`${BACKEND_URL}/api/auth/google`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bodyPayload)
      });

      const data = await res.json();

      if (data.success && data.token) {
        setToken(data.token);
        setUser(data.user);
        localStorage.setItem('vps_monitoring_token', data.token);
        return { success: true, user: data.user };
      } else if (data.status === 'pending') {
        setAuthError(data.error || 'Akun Anda sedang menunggu persetujuan Super Admin (zaqqwer758@gmail.com).');
        return { success: false, pending: true, message: data.error };
      } else {
        setAuthError(data.error || 'Gagal login dengan akun Google.');
        return { success: false, error: data.error };
      }
    } catch (err) {
      const msg = 'Terjadi kesalahan koneksi saat login Google.';
      setAuthError(msg);
      return { success: false, error: msg };
    }
  };

  const logout = () => {
    setToken('');
    setUser(null);
    setAuthError('');
    localStorage.removeItem('vps_monitoring_token');
  };

  const isAuthenticated = Boolean(user && token && user.status === 'approved');
  const isSuperAdmin = Boolean(isAuthenticated && (user.role === 'super_admin' || user.email === 'zaqqwer758@gmail.com'));

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        authError,
        isAuthenticated,
        isSuperAdmin,
        loginWithGoogle,
        logout,
        setAuthError
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
