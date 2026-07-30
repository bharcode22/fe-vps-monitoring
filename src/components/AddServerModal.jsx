import React, { useState, useEffect } from 'react';
import { X, Server, Key, Lock, CheckCircle, AlertCircle, Loader2, Edit3 } from 'lucide-react';
import { BACKEND_URL } from '../config';

export default function AddServerModal({ isOpen, onClose, onServerAdded, serverToEdit = null }) {
  const isEditMode = Boolean(serverToEdit);

  const [formData, setFormData] = useState({
    name: '',
    host: '',
    port: 22,
    username: 'root',
    auth_type: 'password',
    password: '',
    private_key: '',
    type: 'vps',
    pod_version: 'v3'
  });

  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (serverToEdit) {
      setFormData({
        name: serverToEdit.name || '',
        host: serverToEdit.host || '',
        port: serverToEdit.port || 22,
        username: serverToEdit.username || 'root',
        auth_type: serverToEdit.auth_type || 'password',
        password: '', // Leave blank unless changing
        private_key: '',
        type: serverToEdit.type || 'vps',
        pod_version: serverToEdit.pod_version || 'v3'
      });
    } else {
      setFormData({
        name: '',
        host: '',
        port: 22,
        username: 'root',
        auth_type: 'password',
        password: '',
        private_key: '',
        type: 'vps',
        pod_version: 'v3'
      });
    }
    setTestResult(null);
    setErrorMsg('');
  }, [serverToEdit, isOpen]);

  if (!isOpen) return null;

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setTestResult(null);
    setErrorMsg('');
  };

  const handleTestConnection = async () => {
    if (!formData.host || !formData.name) {
      setErrorMsg('Nama Server dan Host IP wajib diisi.');
      return;
    }

    setTesting(true);
    setTestResult(null);
    setErrorMsg('');

    try {
      const res = await fetch(`${BACKEND_URL}/api/vps/test-connection`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      const data = await res.json();
      setTestResult(data);
    } catch (err) {
      setTestResult({ success: false, message: 'Gagal terhubung ke backend server.' });
    } finally {
      setTesting(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.host) {
      setErrorMsg('Nama Server dan Host IP wajib diisi.');
      return;
    }

    setSubmitting(true);
    setErrorMsg('');

    try {
      const url = isEditMode
        ? `${BACKEND_URL}/api/vps/${serverToEdit.id}`
        : `${BACKEND_URL}/api/vps`;
      
      const method = isEditMode ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      const data = await res.json();
      if (data.success) {
        onServerAdded();
        onClose();
      } else {
        setErrorMsg(data.error || 'Gagal menyimpan VPS.');
      }
    } catch (err) {
      setErrorMsg('Terjadi kesalahan saat menyimpan data.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="glass-card" style={{
        width: '100%',
        maxWidth: '540px',
        padding: '28px',
        maxHeight: '90vh',
        overflowY: 'auto'
      }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {isEditMode ? <Edit3 color="#00f2fe" size={24} /> : <Server color="#00f2fe" size={24} />}
            <h2 style={{ fontSize: '1.25rem', fontWeight: 600 }}>
              {isEditMode ? 'Edit Konfigurasi Server' : 'Tambah VPS Target'}
            </h2>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
            <X size={20} />
          </button>
        </div>

        {errorMsg && (
          <div style={{
            background: 'rgba(239, 68, 68, 0.15)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            color: '#fca5a5',
            padding: '10px 14px',
            borderRadius: '8px',
            fontSize: '0.85rem',
            marginBottom: '16px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <AlertCircle size={16} />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

          {/* Server Type Selection (VPS vs POD) */}
          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '6px' }}>
              Tipe Infrastruktur *
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <button
                type="button"
                onClick={() => setFormData({ ...formData, type: 'vps' })}
                style={{
                  padding: '10px',
                  borderRadius: '8px',
                  border: `1px solid ${formData.type === 'vps' ? 'var(--primary-cyan)' : 'var(--border-color)'}`,
                  background: formData.type === 'vps' ? 'rgba(0, 242, 254, 0.15)' : 'rgba(0,0,0,0.3)',
                  color: formData.type === 'vps' ? '#00f2fe' : 'var(--text-muted)',
                  cursor: 'pointer',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px'
                }}
              >
                🖥️ VPS Server
              </button>
              <button
                type="button"
                onClick={() => setFormData({ ...formData, type: 'pod' })}
                style={{
                  padding: '10px',
                  borderRadius: '8px',
                  border: `1px solid ${formData.type === 'pod' ? '#c084fc' : 'var(--border-color)'}`,
                  background: formData.type === 'pod' ? 'rgba(192, 132, 252, 0.15)' : 'rgba(0,0,0,0.3)',
                  color: formData.type === 'pod' ? '#c084fc' : 'var(--text-muted)',
                  cursor: 'pointer',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px'
                }}
              >
                📦 POD Container
              </button>
            </div>
          </div>

          {/* POD Version Selection (v2 vs v3) */}
          {formData.type === 'pod' && (
            <div style={{ background: 'rgba(192, 132, 252, 0.08)', border: '1px solid rgba(192, 132, 252, 0.2)', padding: '12px', borderRadius: '10px' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', color: '#c084fc', marginBottom: '8px', fontWeight: 600 }}>
                Versi POD *
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, pod_version: 'v3' })}
                  style={{
                    padding: '8px',
                    borderRadius: '6px',
                    border: `1px solid ${formData.pod_version === 'v3' ? '#c084fc' : 'var(--border-color)'}`,
                    background: formData.pod_version === 'v3' ? 'rgba(192, 132, 252, 0.25)' : 'rgba(0,0,0,0.4)',
                    color: formData.pod_version === 'v3' ? '#fff' : 'var(--text-muted)',
                    cursor: 'pointer',
                    fontWeight: 600,
                    fontSize: '0.85rem'
                  }}
                >
                  ⚡ Versi 3 (v3 - Terbaru)
                </button>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, pod_version: 'v2' })}
                  style={{
                    padding: '8px',
                    borderRadius: '6px',
                    border: `1px solid ${formData.pod_version === 'v2' ? '#f59e0b' : 'var(--border-color)'}`,
                    background: formData.pod_version === 'v2' ? 'rgba(245, 158, 11, 0.25)' : 'rgba(0,0,0,0.4)',
                    color: formData.pod_version === 'v2' ? '#fff' : 'var(--text-muted)',
                    cursor: 'pointer',
                    fontWeight: 600,
                    fontSize: '0.85rem'
                  }}
                >
                  🐢 Versi 2 (v2 - Legacy)
                </button>
              </div>
            </div>
          )}

          {/* Server Name */}
          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '6px' }}>
              Nama Server / Label *
            </label>
            <input
              type="text"
              name="name"
              placeholder={formData.type === 'vps' ? "Contoh: VPS Singapore - Web Server" : "Contoh: POD Node 08 - API Container"}
              value={formData.name}
              onChange={handleChange}
              style={{
                width: '100%',
                background: 'rgba(0, 0, 0, 0.4)',
                border: '1px solid var(--border-color)',
                borderRadius: '8px',
                padding: '10px 14px',
                color: '#fff',
                outline: 'none'
              }}
              required
            />
          </div>

          {/* Host IP & Port */}
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '6px' }}>
                IP Address / Hostname *
              </label>
              <input
                type="text"
                name="host"
                placeholder="192.168.1.100 atau vps.myhost.com"
                value={formData.host}
                onChange={handleChange}
                className="font-mono"
                style={{
                  width: '100%',
                  background: 'rgba(0, 0, 0, 0.4)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '8px',
                  padding: '10px 14px',
                  color: '#fff',
                  outline: 'none'
                }}
                required
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '6px' }}>
                SSH Port
              </label>
              <input
                type="number"
                name="port"
                value={formData.port}
                onChange={handleChange}
                className="font-mono"
                style={{
                  width: '100%',
                  background: 'rgba(0, 0, 0, 0.4)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '8px',
                  padding: '10px 14px',
                  color: '#fff',
                  outline: 'none'
                }}
              />
            </div>
          </div>

          {/* Username & Auth Type */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '6px' }}>
                SSH Username
              </label>
              <input
                type="text"
                name="username"
                value={formData.username}
                onChange={handleChange}
                className="font-mono"
                style={{
                  width: '100%',
                  background: 'rgba(0, 0, 0, 0.4)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '8px',
                  padding: '10px 14px',
                  color: '#fff',
                  outline: 'none'
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '6px' }}>
                Metode Autentikasi
              </label>
              <select
                name="auth_type"
                value={formData.auth_type}
                onChange={handleChange}
                style={{
                  width: '100%',
                  background: 'rgba(0, 0, 0, 0.4)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '8px',
                  padding: '10px 14px',
                  color: '#fff',
                  outline: 'none'
                }}
              >
                <option value="password">Password SSH</option>
                <option value="key">Private Key (.pem/rsa)</option>
              </select>
            </div>
          </div>

          {/* Password or Private Key Input */}
          {formData.auth_type === 'password' ? (
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '6px' }}>
                Password SSH
              </label>
              <input
                type="password"
                name="password"
                placeholder="Masukkan password SSH server"
                value={formData.password}
                onChange={handleChange}
                style={{
                  width: '100%',
                  background: 'rgba(0, 0, 0, 0.4)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '8px',
                  padding: '10px 14px',
                  color: '#fff',
                  outline: 'none'
                }}
              />
            </div>
          ) : (
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '6px' }}>
                SSH Private Key (OpenSSH Format)
              </label>
              <textarea
                name="private_key"
                rows={4}
                placeholder="-----BEGIN RSA PRIVATE KEY-----..."
                value={formData.private_key}
                onChange={handleChange}
                className="font-mono"
                style={{
                  width: '100%',
                  background: 'rgba(0, 0, 0, 0.4)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '8px',
                  padding: '10px 14px',
                  color: '#fff',
                  outline: 'none',
                  fontSize: '0.8rem'
                }}
              ></textarea>
            </div>
          )}

          {/* Test Result Message */}
          {testResult && (
            <div style={{
              background: testResult.success ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
              border: `1px solid ${testResult.success ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
              color: testResult.success ? '#6ee7b7' : '#fca5a5',
              padding: '10px 14px',
              borderRadius: '8px',
              fontSize: '0.85rem',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              {testResult.success ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
              <span>{testResult.message}</span>
            </div>
          )}

          {/* Actions */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '10px' }}>
            <button
              type="button"
              onClick={handleTestConnection}
              className="btn-secondary"
              disabled={testing}
            >
              {testing ? <Loader2 className="animate-spin" size={16} /> : <Server size={16} />}
              <span>{testing ? 'Menguji SSH...' : 'Uji Koneksi'}</span>
            </button>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button type="button" onClick={onClose} className="btn-secondary">
                Batal
              </button>
              <button type="submit" className="btn-primary" disabled={submitting}>
                {submitting ? 'Menyimpan...' : (isEditMode ? 'Simpan Perubahan' : 'Simpan VPS')}
              </button>
            </div>
          </div>

        </form>
      </div>
    </div>
  );
}
