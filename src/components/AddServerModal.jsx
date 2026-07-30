import React, { useState, useEffect } from 'react';
import { X, Server, Box, Key, Lock, CheckCircle, AlertCircle, Loader2, Edit3, Globe, Hash, User, ShieldCheck } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { testConnectionApi, createServerApi, updateServerApi } from '../api/vpsApi';

export default function AddServerModal({ isOpen, onClose, onServerAdded, serverToEdit = null }) {
  const { t } = useLanguage();
  const isEditMode = Boolean(serverToEdit);

  const [formData, setFormData] = useState({
    name: '',
    host: '',
    port: 22,
    username: 'pod',
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
        username: serverToEdit.username || 'pod',
        auth_type: serverToEdit.auth_type || 'password',
        password: '',
        private_key: '',
        type: serverToEdit.type || 'vps',
        pod_version: serverToEdit.pod_version || 'v3'
      });
    } else {
      setFormData({
        name: '',
        host: '',
        port: 22,
        username: 'pod',
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
      const data = await testConnectionApi(formData);
      setTestResult(data);
    } catch (err) {
      setTestResult({ success: false, message: err.message || 'Gagal terhubung ke VPS via SSH.' });
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
      if (isEditMode) {
        await updateServerApi(serverToEdit.id, formData);
      } else {
        await createServerApi(formData);
      }
      onServerAdded();
      onClose();
    } catch (err) {
      setErrorMsg(err.message || 'Terjadi kesalahan saat menyimpan server.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 9999, padding: '16px' }}>
      <div
        className="glass-card modal-aos-content"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '92vw',
          maxWidth: '820px',
          maxHeight: '92vh',
          overflowY: 'auto',
          padding: '32px 36px',
          background: '#090d16',
          border: '1px solid rgba(0, 242, 254, 0.3)',
          borderRadius: '24px',
          boxShadow: '0 25px 70px rgba(0, 0, 0, 0.85)'
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{
              background: 'linear-gradient(135deg, rgba(0, 242, 254, 0.2) 0%, rgba(79, 172, 254, 0.2) 100%)',
              border: '1px solid rgba(0, 242, 254, 0.4)',
              padding: '12px',
              borderRadius: '16px',
              display: 'flex',
              alignItems: 'center',
              justify: 'center'
            }}>
              {isEditMode ? <Edit3 color="#00f2fe" size={24} /> : <Server color="#00f2fe" size={24} />}
            </div>
            <div>
              <h3 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#fff', letterSpacing: '-0.3px' }}>
                {isEditMode ? 'Edit Konfigurasi Server VPS / POD' : 'Tambah Server VPS / POD (SSH)'}
              </h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                Monitoring Metrik Sistem Real-time, CPU/RAM/Disk, GPU, & Docker Apps via SSH.
              </p>
            </div>
          </div>

          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px' }}>
            <X size={24} />
          </button>
        </div>

        {errorMsg && (
          <div style={{
            background: 'rgba(239, 68, 68, 0.15)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            color: '#fca5a5',
            padding: '12px 18px',
            borderRadius: '12px',
            fontSize: '0.88rem',
            marginBottom: '20px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px'
          }}>
            <AlertCircle size={18} />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
          
          {/* Tipe Server Cards */}
          <div>
            <label style={{ display: 'block', fontSize: '0.88rem', fontWeight: 700, color: '#e2e8f0', marginBottom: '10px' }}>
              Tipe Infrastruktur Server:
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
              
              {/* Standar VPS */}
              <div
                onClick={() => handleChange({ target: { name: 'type', value: 'vps' } })}
                style={{
                  padding: '16px',
                  borderRadius: '16px',
                  border: formData.type === 'vps' ? '2px solid #00f2fe' : '1px solid rgba(255,255,255,0.1)',
                  background: formData.type === 'vps' ? 'linear-gradient(135deg, rgba(0, 242, 254, 0.15) 0%, rgba(0, 242, 254, 0.05) 100%)' : 'rgba(0,0,0,0.3)',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '14px'
                }}
              >
                <div style={{
                  background: formData.type === 'vps' ? 'rgba(0, 242, 254, 0.25)' : 'rgba(255,255,255,0.05)',
                  padding: '10px',
                  borderRadius: '12px'
                }}>
                  <Server size={22} color={formData.type === 'vps' ? '#00f2fe' : 'var(--text-muted)'} />
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.95rem', color: formData.type === 'vps' ? '#00f2fe' : '#fff' }}>
                    🖥️ Standar VPS
                  </div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                    Server Linux fisik atau VM independen.
                  </div>
                </div>
              </div>

              {/* POD Container */}
              <div
                onClick={() => handleChange({ target: { name: 'type', value: 'pod' } })}
                style={{
                  padding: '16px',
                  borderRadius: '16px',
                  border: formData.type === 'pod' ? '2px solid #c084fc' : '1px solid rgba(255,255,255,0.1)',
                  background: formData.type === 'pod' ? 'linear-gradient(135deg, rgba(192, 132, 252, 0.15) 0%, rgba(192, 132, 252, 0.05) 100%)' : 'rgba(0,0,0,0.3)',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '14px'
                }}
              >
                <div style={{
                  background: formData.type === 'pod' ? 'rgba(192, 132, 252, 0.25)' : 'rgba(255,255,255,0.05)',
                  padding: '10px',
                  borderRadius: '12px'
                }}>
                  <Box size={22} color={formData.type === 'pod' ? '#c084fc' : 'var(--text-muted)'} />
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.95rem', color: formData.type === 'pod' ? '#c084fc' : '#fff' }}>
                    📦 POD Container
                  </div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                    Lingkungan terisolasi RunPod / Server POD.
                  </div>
                </div>
              </div>

            </div>
          </div>

          {/* Versi POD Selector (V3 vs V2) */}
          {formData.type === 'pod' && (
            <div style={{
              background: 'rgba(192, 132, 252, 0.05)',
              border: '1px solid rgba(192, 132, 252, 0.2)',
              borderRadius: '16px',
              padding: '18px 20px'
            }}>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#c084fc', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Pilih Versi POD Server:
              </label>
              <div style={{ display: 'flex', gap: '12px' }}>
                
                {/* Versi 3 */}
                <button
                  type="button"
                  onClick={() => handleChange({ target: { name: 'pod_version', value: 'v3' } })}
                  style={{
                    flex: 1,
                    padding: '12px 16px',
                    borderRadius: '12px',
                    border: (formData.pod_version || 'v3') === 'v3' ? '2px solid #c084fc' : '1px solid rgba(255,255,255,0.1)',
                    background: (formData.pod_version || 'v3') === 'v3' ? 'rgba(192, 132, 252, 0.25)' : 'rgba(0,0,0,0.3)',
                    color: (formData.pod_version || 'v3') === 'v3' ? '#c084fc' : 'var(--text-muted)',
                    fontWeight: 700,
                    fontSize: '0.9rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justify: 'center',
                    gap: '8px',
                    transition: 'all 0.2s ease'
                  }}
                >
                  <Box size={16} /> 📦 POD Versi 3 (V3)
                </button>

                {/* Versi 2 */}
                <button
                  type="button"
                  onClick={() => handleChange({ target: { name: 'pod_version', value: 'v2' } })}
                  style={{
                    flex: 1,
                    padding: '12px 16px',
                    borderRadius: '12px',
                    border: formData.pod_version === 'v2' ? '2px solid #f59e0b' : '1px solid rgba(255,255,255,0.1)',
                    background: formData.pod_version === 'v2' ? 'rgba(245, 158, 11, 0.25)' : 'rgba(0,0,0,0.3)',
                    color: formData.pod_version === 'v2' ? '#f59e0b' : 'var(--text-muted)',
                    fontWeight: 700,
                    fontSize: '0.9rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justify: 'center',
                    gap: '8px',
                    transition: 'all 0.2s ease'
                  }}
                >
                  <Box size={16} /> 📦 POD Versi 2 (V2)
                </button>

              </div>
            </div>
          )}

          {/* Form Input Fields Container */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

            {/* Nama Server */}
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '8px' }}>
                Nama Label Server:
              </label>
              <div style={{ position: 'relative' }}>
                <Server size={18} color="var(--primary-cyan)" style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', opacity: 0.8 }} />
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="Contoh: Production Server / POD 33 Main"
                  style={{
                    width: '100%',
                    padding: '12px 16px 12px 48px',
                    background: 'rgba(0, 0, 0, 0.45)',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    borderRadius: '12px',
                    color: '#fff',
                    fontSize: '0.92rem',
                    outline: 'none',
                    transition: 'all 0.2s ease'
                  }}
                  onFocus={(e) => e.target.style.borderColor = '#00f2fe'}
                  onBlur={(e) => e.target.style.borderColor = 'rgba(255, 255, 255, 0.15)'}
                  required
                />
              </div>
            </div>

            {/* Host IP & SSH Port */}
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '8px' }}>
                  Host IP / Domain SSH:
                </label>
                <div style={{ position: 'relative' }}>
                  <Globe size={18} color="#38bdf8" style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', opacity: 0.8 }} />
                  <input
                    type="text"
                    name="host"
                    value={formData.host}
                    onChange={handleChange}
                    placeholder="10.10.3.33"
                    className="font-mono"
                    style={{
                      width: '100%',
                      padding: '12px 16px 12px 48px',
                      background: 'rgba(0, 0, 0, 0.45)',
                      border: '1px solid rgba(255, 255, 255, 0.15)',
                      borderRadius: '12px',
                      color: '#fff',
                      fontSize: '0.92rem',
                      outline: 'none',
                      transition: 'all 0.2s ease'
                    }}
                    onFocus={(e) => e.target.style.borderColor = '#38bdf8'}
                    onBlur={(e) => e.target.style.borderColor = 'rgba(255, 255, 255, 0.15)'}
                    required
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '8px' }}>
                  Port SSH:
                </label>
                <div style={{ position: 'relative' }}>
                  <Hash size={18} color="#38bdf8" style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', opacity: 0.8 }} />
                  <input
                    type="number"
                    name="port"
                    value={formData.port}
                    onChange={handleChange}
                    className="font-mono"
                    style={{
                      width: '100%',
                      padding: '12px 16px 12px 42px',
                      background: 'rgba(0, 0, 0, 0.45)',
                      border: '1px solid rgba(255, 255, 255, 0.15)',
                      borderRadius: '12px',
                      color: '#fff',
                      fontSize: '0.92rem',
                      outline: 'none',
                      transition: 'all 0.2s ease'
                    }}
                    onFocus={(e) => e.target.style.borderColor = '#38bdf8'}
                    onBlur={(e) => e.target.style.borderColor = 'rgba(255, 255, 255, 0.15)'}
                  />
                </div>
              </div>
            </div>

            {/* SSH Username */}
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '8px' }}>
                SSH Username:
              </label>
              <div style={{ position: 'relative' }}>
                <User size={18} color="#c084fc" style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', opacity: 0.8 }} />
                <input
                  type="text"
                  name="username"
                  value={formData.username}
                  onChange={handleChange}
                  placeholder="pod / root"
                  className="font-mono"
                  style={{
                    width: '100%',
                    padding: '12px 16px 12px 48px',
                    background: 'rgba(0, 0, 0, 0.45)',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    borderRadius: '12px',
                    color: '#fff',
                    fontSize: '0.92rem',
                    outline: 'none',
                    transition: 'all 0.2s ease'
                  }}
                  onFocus={(e) => e.target.style.borderColor = '#c084fc'}
                  onBlur={(e) => e.target.style.borderColor = 'rgba(255, 255, 255, 0.15)'}
                />
              </div>
            </div>

            {/* Authentication Type */}
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '8px' }}>
                Tipe Otentikasi SSH:
              </label>
              <div style={{ display: 'flex', gap: '12px' }}>
                <label style={{
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '12px 16px',
                  background: formData.auth_type === 'password' ? 'rgba(0, 242, 254, 0.12)' : 'rgba(0,0,0,0.3)',
                  border: `1px solid ${formData.auth_type === 'password' ? '#00f2fe' : 'rgba(255,255,255,0.12)'}`,
                  borderRadius: '12px',
                  cursor: 'pointer',
                  fontSize: '0.88rem',
                  fontWeight: 600,
                  color: formData.auth_type === 'password' ? '#00f2fe' : '#fff'
                }}>
                  <input
                    type="radio"
                    name="auth_type"
                    value="password"
                    checked={formData.auth_type === 'password'}
                    onChange={handleChange}
                  />
                  <Lock size={16} /> Password SSH
                </label>

                <label style={{
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '12px 16px',
                  background: formData.auth_type === 'key' ? 'rgba(0, 242, 254, 0.12)' : 'rgba(0,0,0,0.3)',
                  border: `1px solid ${formData.auth_type === 'key' ? '#00f2fe' : 'rgba(255,255,255,0.12)'}`,
                  borderRadius: '12px',
                  cursor: 'pointer',
                  fontSize: '0.88rem',
                  fontWeight: 600,
                  color: formData.auth_type === 'key' ? '#00f2fe' : '#fff'
                }}>
                  <input
                    type="radio"
                    name="auth_type"
                    value="key"
                    checked={formData.auth_type === 'key'}
                    onChange={handleChange}
                  />
                  <Key size={16} /> SSH Private Key
                </label>
              </div>
            </div>

            {/* Password Input */}
            {formData.auth_type === 'password' ? (
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '8px' }}>
                  Password SSH:
                </label>
                <div style={{ position: 'relative' }}>
                  <Lock size={18} color="#00f2fe" style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', opacity: 0.8 }} />
                  <input
                    type="password"
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    placeholder={isEditMode ? '•••••••• (Biarkan kosong jika tidak diubah)' : 'Masukkan password SSH'}
                    className="font-mono"
                    style={{
                      width: '100%',
                      padding: '12px 16px 12px 48px',
                      background: 'rgba(0, 0, 0, 0.45)',
                      border: '1px solid rgba(255, 255, 255, 0.15)',
                      borderRadius: '12px',
                      color: '#fff',
                      fontSize: '0.92rem',
                      outline: 'none',
                      transition: 'all 0.2s ease'
                    }}
                    onFocus={(e) => e.target.style.borderColor = '#00f2fe'}
                    onBlur={(e) => e.target.style.borderColor = 'rgba(255, 255, 255, 0.15)'}
                  />
                </div>
              </div>
            ) : (
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '8px' }}>
                  SSH Private Key (PEM/RSA):
                </label>
                <textarea
                  name="private_key"
                  value={formData.private_key}
                  onChange={handleChange}
                  placeholder={isEditMode ? '•••••••• (Biarkan kosong jika tidak diubah)' : '-----BEGIN OPENSSH PRIVATE KEY-----'}
                  rows={4}
                  className="font-mono"
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    background: 'rgba(0, 0, 0, 0.45)',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    borderRadius: '12px',
                    color: '#fff',
                    fontSize: '0.85rem',
                    outline: 'none',
                    resize: 'vertical',
                    transition: 'all 0.2s ease'
                  }}
                  onFocus={(e) => e.target.style.borderColor = '#00f2fe'}
                  onBlur={(e) => e.target.style.borderColor = 'rgba(255, 255, 255, 0.15)'}
                />
              </div>
            )}

          </div>

          {/* Test Connection Result Box */}
          {testResult && (
            <div style={{
              background: testResult.success ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
              border: `1px solid ${testResult.success ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
              color: testResult.success ? '#6ee7b7' : '#fca5a5',
              padding: '14px 18px',
              borderRadius: '12px',
              fontSize: '0.88rem',
              display: 'flex',
              alignItems: 'center',
              gap: '10px'
            }}>
              {testResult.success ? <CheckCircle size={20} /> : <AlertCircle size={20} />}
              <span>{testResult.message}</span>
            </div>
          )}

          {/* Modal Actions */}
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '10px' }}>
            <button
              type="button"
              onClick={handleTestConnection}
              disabled={testing}
              className="btn-secondary"
              style={{ padding: '10px 18px', fontSize: '0.9rem' }}
            >
              {testing ? <Loader2 className="animate-spin" size={16} /> : <Key size={16} />}
              <span>{testing ? 'Uji Koneksi...' : 'Uji Koneksi SSH'}</span>
            </button>

            <button
              type="submit"
              disabled={submitting}
              className="btn-primary"
              style={{ padding: '10px 22px', fontSize: '0.9rem' }}
            >
              {submitting ? <Loader2 className="animate-spin" size={16} /> : <CheckCircle size={16} />}
              <span>{submitting ? 'Menyimpan...' : (isEditMode ? 'Simpan Perubahan' : 'Tambah Server')}</span>
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}
