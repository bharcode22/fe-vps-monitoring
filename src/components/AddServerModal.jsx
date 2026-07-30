import React, { useState, useEffect } from 'react';
import { X, Server, Key, Lock, CheckCircle, AlertCircle, Loader2, Edit3 } from 'lucide-react';
import { BACKEND_URL } from '../config';
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
      setTestResult({ success: false, message: err.message || 'Gagal terhubung ke backend server.' });
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
      setErrorMsg(err.message || 'Gagal menyimpan VPS.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="glass-card modal-aos-content"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '90vw',
          maxWidth: '840px',
          padding: '34px',
          maxHeight: '90vh',
          overflowY: 'auto'
        }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {isEditMode ? <Edit3 color="#00f2fe" size={24} /> : <Server color="#00f2fe" size={24} />}
            <h2 style={{ fontSize: '1.25rem', fontWeight: 600 }}>
              {isEditMode ? t('editServerTitle') : t('addServerTitle')}
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
              {t('infrastructureType')} *
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
                {t('vpsServer')}
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
                {t('podContainer')}
              </button>
            </div>
          </div>

          {/* POD Version Selection (v2 vs v3) */}
          {formData.type === 'pod' && (
            <div style={{ background: 'rgba(192, 132, 252, 0.08)', border: '1px solid rgba(192, 132, 252, 0.2)', padding: '12px', borderRadius: '10px' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', color: '#c084fc', marginBottom: '8px', fontWeight: 600 }}>
                {t('podVersion')} *
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
                  {t('v3Version')}
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
                  {t('v2Version')}
                </button>
              </div>
            </div>
          )}

          {/* Server Name */}
          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '6px' }}>
              {t('serverName')} *
            </label>
            <input
              type="text"
              name="name"
              placeholder={formData.type === 'vps' ? t('vpsNamePlaceholder') : t('podNamePlaceholder')}
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
                {t('ipAddressHost')} *
              </label>
              <input
                type="text"
                name="host"
                placeholder={t('ipAddressPlaceholder')}
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
                {t('sshPort')}
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
                {t('sshUsername')}
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
                {t('authMethod')}
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
                <option value="password">{t('passwordAuth')}</option>
                <option value="key">{t('keyAuth')}</option>
              </select>
            </div>
          </div>

          {/* Password or Private Key Input */}
          {formData.auth_type === 'password' ? (
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '6px' }}>
                {t('sshPassword')}
              </label>
              <input
                type="password"
                name="password"
                placeholder={t('passwordPlaceholder')}
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
                {t('sshPrivateKey')}
              </label>
              <textarea
                name="private_key"
                rows={4}
                placeholder={t('privateKeyPlaceholder')}
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
              <span>{testing ? t('testingSsh') : t('testConnection')}</span>
            </button>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button type="button" onClick={onClose} className="btn-secondary">
                {t('cancel')}
              </button>
              <button type="submit" className="btn-primary" disabled={submitting}>
                {submitting ? t('saving') : (isEditMode ? t('saveChanges') : t('saveVps'))}
              </button>
            </div>
          </div>

        </form>
      </div>
    </div>
  );
}
