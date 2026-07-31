import React, { useState, useEffect } from 'react';
import { X, Database, HardDrive, Key, Lock, CheckCircle, AlertCircle, Loader2, Edit3, Globe, Hash, User, Folder, ShieldCheck } from 'lucide-react';
import { testConnectionApi, createServerApi, updateServerApi } from '../api/vpsApi';

export default function AddServiceModal({ isOpen, onClose, onServerAdded, serviceToEdit = null }) {
  const isEditMode = Boolean(serviceToEdit);

  const [formData, setFormData] = useState({
    name: '',
    host: '',
    port: 5432,
    username: 'postgres',
    password: '',
    type: 'postgresql',
    db_name: 'postgres',
    db_user: 'postgres',
    s3_endpoint: '',
    s3_access_key: '',
    s3_secret_key: '',
    s3_region: 'us-east-1',
    s3_bucket: ''
  });

  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (serviceToEdit) {
      setFormData({
        name: serviceToEdit.name || '',
        host: serviceToEdit.host || '',
        port: serviceToEdit.port || (serviceToEdit.type === 'postgresql' ? 5432 : 9000),
        username: serviceToEdit.username || 'postgres',
        password: '',
        type: serviceToEdit.type || 'postgresql',
        db_name: serviceToEdit.db_name || 'postgres',
        db_user: serviceToEdit.db_user || 'postgres',
        s3_endpoint: serviceToEdit.s3_endpoint || '',
        s3_access_key: serviceToEdit.s3_access_key || '',
        s3_secret_key: '',
        s3_region: serviceToEdit.s3_region || 'us-east-1',
        s3_bucket: serviceToEdit.s3_bucket || ''
      });
    } else {
      setFormData({
        name: '',
        host: '',
        port: 5432,
        username: 'postgres',
        password: '',
        type: 'postgresql',
        db_name: 'postgres',
        db_user: 'postgres',
        s3_endpoint: '',
        s3_access_key: '',
        s3_secret_key: '',
        s3_region: 'us-east-1',
        s3_bucket: ''
      });
    }
    setTestResult(null);
    setErrorMsg('');
  }, [serviceToEdit, isOpen]);

  if (!isOpen) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => {
      const updated = { ...prev, [name]: value };
      if (name === 'type') {
        if (value === 'postgresql') {
          updated.port = 5432;
          updated.db_user = updated.db_user || 'postgres';
          updated.db_name = updated.db_name || 'postgres';
          updated.username = updated.db_user || 'postgres';
        } else if (value === 'minio') {
          updated.port = 9000;
          updated.db_user = '';
          updated.db_name = '';
          updated.username = updated.s3_access_key || '';
        } else if (value === 's3') {
          updated.port = 443;
          updated.db_user = '';
          updated.db_name = '';
          updated.username = updated.s3_access_key || '';
        }
      }
      if (name === 's3_access_key' && (prev.type === 'minio' || prev.type === 's3')) {
        updated.username = value;
      }
      if (name === 'db_user' && prev.type === 'postgresql') {
        updated.username = value;
      }
      return updated;
    });
    setTestResult(null);
    setErrorMsg('');
  };

  const handleTestConnection = async () => {
    if (!formData.name || (formData.type === 'postgresql' && !formData.host) || (formData.type === 'minio' && !formData.s3_endpoint)) {
      setErrorMsg('Nama Layanan dan Host / Endpoint wajib diisi.');
      return;
    }

    setTesting(true);
    setTestResult(null);
    setErrorMsg('');

    const payload = {
      ...formData,
      host: formData.host || formData.s3_endpoint || (formData.type === 's3' ? 's3.amazonaws.com' : ''),
      username: (formData.type === 'minio' || formData.type === 's3') ? (formData.s3_access_key || '') : (formData.db_user || 'postgres'),
      db_user: (formData.type === 'minio' || formData.type === 's3') ? '' : (formData.db_user || 'postgres'),
      db_name: (formData.type === 'minio' || formData.type === 's3') ? '' : (formData.db_name || 'postgres')
    };

    try {
      const data = await testConnectionApi(payload);
      setTestResult(data);
    } catch (err) {
      setTestResult({ success: false, message: err.message || 'Gagal terhubung ke layanan.' });
    } finally {
      setTesting(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name) {
      setErrorMsg('Nama Layanan wajib diisi.');
      return;
    }

    const payload = {
      ...formData,
      host: formData.host || formData.s3_endpoint || (formData.type === 's3' ? 's3.amazonaws.com' : ''),
      username: (formData.type === 'minio' || formData.type === 's3') ? (formData.s3_access_key || '') : (formData.db_user || 'postgres'),
      db_user: (formData.type === 'minio' || formData.type === 's3') ? '' : (formData.db_user || 'postgres'),
      db_name: (formData.type === 'minio' || formData.type === 's3') ? '' : (formData.db_name || 'postgres')
    };

    setSubmitting(true);
    setErrorMsg('');

    try {
      if (isEditMode) {
        await updateServerApi(serviceToEdit.id, payload);
      } else {
        await createServerApi(payload);
      }
      onServerAdded();
      onClose();
    } catch (err) {
      setErrorMsg(err.message || 'Terjadi kesalahan saat menyimpan data.');
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
          maxWidth: '840px',
          maxHeight: '92vh',
          overflowY: 'auto',
          padding: '32px 36px',
          background: '#090d16',
          border: '1px solid rgba(56, 189, 248, 0.3)',
          borderRadius: '24px',
          boxShadow: '0 25px 70px rgba(0, 0, 0, 0.85)'
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{
              background: formData.type === 'postgresql'
                ? 'linear-gradient(135deg, rgba(56, 189, 248, 0.2) 0%, rgba(2, 132, 199, 0.2) 100%)'
                : 'linear-gradient(135deg, rgba(245, 158, 11, 0.2) 0%, rgba(217, 119, 6, 0.2) 100%)',
              border: `1px solid ${formData.type === 'postgresql' ? 'rgba(56, 189, 248, 0.4)' : 'rgba(245, 158, 11, 0.4)'}`,
              padding: '12px',
              borderRadius: '16px',
              display: 'flex',
              alignItems: 'center',
              justify: 'center'
            }}>
              {formData.type === 'postgresql' ? <Database color="#38bdf8" size={26} /> : <HardDrive color="#f59e0b" size={26} />}
            </div>
            <div>
              <h3 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#fff', letterSpacing: '-0.3px' }}>
                {isEditMode ? 'Edit Layanan DB / Storage' : 'Tambah Layanan Database & Storage Baru'}
              </h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                Monitoring Status Database PostgreSQL & MinIO / AWS S3 Storage secara Real-time.
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

          {/* Tipe Layanan Cards */}
          <div>
            <label style={{ display: 'block', fontSize: '0.88rem', fontWeight: 700, color: '#e2e8f0', marginBottom: '10px' }}>
              Pilih Jenis Layanan Infrastruktur:
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>

              {/* PostgreSQL Card */}
              <div
                onClick={() => handleChange({ target: { name: 'type', value: 'postgresql' } })}
                style={{
                  padding: '16px',
                  borderRadius: '16px',
                  border: formData.type === 'postgresql' ? '2px solid #38bdf8' : '1px solid rgba(255,255,255,0.1)',
                  background: formData.type === 'postgresql' ? 'linear-gradient(135deg, rgba(56, 189, 248, 0.15) 0%, rgba(56, 189, 248, 0.05) 100%)' : 'rgba(0,0,0,0.3)',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px'
                }}
              >
                <div style={{
                  background: formData.type === 'postgresql' ? 'rgba(56, 189, 248, 0.25)' : 'rgba(255,255,255,0.05)',
                  padding: '10px',
                  borderRadius: '12px'
                }}>
                  <Database size={20} color={formData.type === 'postgresql' ? '#38bdf8' : 'var(--text-muted)'} />
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.92rem', color: formData.type === 'postgresql' ? '#38bdf8' : '#fff' }}>
                    🐘 PostgreSQL DB
                  </div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                    Database relasional PostgreSQL.
                  </div>
                </div>
              </div>

              {/* MinIO Card */}
              <div
                onClick={() => handleChange({ target: { name: 'type', value: 'minio' } })}
                style={{
                  padding: '16px',
                  borderRadius: '16px',
                  border: formData.type === 'minio' ? '2px solid #f59e0b' : '1px solid rgba(255,255,255,0.1)',
                  background: formData.type === 'minio' ? 'linear-gradient(135deg, rgba(245, 158, 11, 0.15) 0%, rgba(245, 158, 11, 0.05) 100%)' : 'rgba(0,0,0,0.3)',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px'
                }}
              >
                <div style={{
                  background: formData.type === 'minio' ? 'rgba(245, 158, 11, 0.25)' : 'rgba(255,255,255,0.05)',
                  padding: '10px',
                  borderRadius: '12px'
                }}>
                  <HardDrive size={20} color={formData.type === 'minio' ? '#f59e0b' : 'var(--text-muted)'} />
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.92rem', color: formData.type === 'minio' ? '#f59e0b' : '#fff' }}>
                    🪣 MinIO Storage
                  </div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                    Object storage mandiri MinIO.
                  </div>
                </div>
              </div>

              {/* AWS S3 Card */}
              <div
                onClick={() => handleChange({ target: { name: 'type', value: 's3' } })}
                style={{
                  padding: '16px',
                  borderRadius: '16px',
                  border: formData.type === 's3' ? '2px solid #ec4899' : '1px solid rgba(255,255,255,0.1)',
                  background: formData.type === 's3' ? 'linear-gradient(135deg, rgba(236, 72, 153, 0.15) 0%, rgba(236, 72, 153, 0.05) 100%)' : 'rgba(0,0,0,0.3)',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px'
                }}
              >
                <div style={{
                  background: formData.type === 's3' ? 'rgba(236, 72, 153, 0.25)' : 'rgba(255,255,255,0.05)',
                  padding: '10px',
                  borderRadius: '12px'
                }}>
                  <HardDrive size={20} color={formData.type === 's3' ? '#ec4899' : 'var(--text-muted)'} />
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.92rem', color: formData.type === 's3' ? '#ec4899' : '#fff' }}>
                    ☁️ AWS S3 Storage
                  </div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                    Storage cloud AWS S3 Bucket.
                  </div>
                </div>
              </div>

            </div>
          </div>

          {/* Form Input Fields Container */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

            {/* Nama Layanan Input */}
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '8px' }}>
                Nama Label Layanan:
              </label>
              <div style={{ position: 'relative' }}>
                {formData.type === 'postgresql' ? (
                  <Database size={18} color="#38bdf8" style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', opacity: 0.8 }} />
                ) : (
                  <HardDrive size={18} color="#f59e0b" style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', opacity: 0.8 }} />
                )}
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="Contoh: PostgreSQL Main Production / MinIO Cluster"
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
                  onFocus={(e) => e.target.style.borderColor = formData.type === 'postgresql' ? '#38bdf8' : '#f59e0b'}
                  onBlur={(e) => e.target.style.borderColor = 'rgba(255, 255, 255, 0.15)'}
                  required
                />
              </div>
            </div>

            {/* PostgreSQL Inputs */}
            {formData.type === 'postgresql' && (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '14px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '8px' }}>
                      Host IP / Domain PostgreSQL:
                    </label>
                    <div style={{ position: 'relative' }}>
                      <Globe size={18} color="#38bdf8" style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', opacity: 0.8 }} />
                      <input
                        type="text"
                        name="host"
                        value={formData.host}
                        onChange={handleChange}
                        placeholder="localhost / 10.10.3.33"
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
                      Port DB:
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

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '8px' }}>
                      Nama Database (`db_name`):
                    </label>
                    <div style={{ position: 'relative' }}>
                      <Database size={18} color="#38bdf8" style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', opacity: 0.8 }} />
                      <input
                        type="text"
                        name="db_name"
                        value={formData.db_name}
                        onChange={handleChange}
                        placeholder="postgres / my_app_db"
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
                      />
                    </div>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '8px' }}>
                      User Database (`db_user`):
                    </label>
                    <div style={{ position: 'relative' }}>
                      <User size={18} color="#38bdf8" style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', opacity: 0.8 }} />
                      <input
                        type="text"
                        name="db_user"
                        value={formData.db_user}
                        onChange={handleChange}
                        placeholder="postgres"
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
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '8px' }}>
                    Password Database:
                  </label>
                  <div style={{ position: 'relative' }}>
                    <Lock size={18} color="#38bdf8" style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', opacity: 0.8 }} />
                    <input
                      type="password"
                      name="password"
                      value={formData.password}
                      onChange={handleChange}
                      placeholder={isEditMode ? '•••••••• (Biarkan kosong jika tidak diubah)' : 'Masukkan password PostgreSQL'}
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
                    />
                  </div>
                </div>
              </>
            )}

            {/* MinIO / S3 Storage Inputs */}
            {(formData.type === 'minio' || formData.type === 's3') && (
              <>
                {formData.type === 'minio' && (
                  <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '14px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '8px' }}>
                        MinIO Host / Endpoint URL:
                      </label>
                      <div style={{ position: 'relative' }}>
                        <Globe size={18} color="#f59e0b" style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', opacity: 0.8 }} />
                        <input
                          type="text"
                          name="s3_endpoint"
                          value={formData.s3_endpoint}
                          onChange={handleChange}
                          placeholder="http://10.10.3.33 / s3.domain.com"
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
                          onFocus={(e) => e.target.style.borderColor = '#f59e0b'}
                          onBlur={(e) => e.target.style.borderColor = 'rgba(255, 255, 255, 0.15)'}
                          required
                        />
                      </div>
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '8px' }}>
                        Port MinIO:
                      </label>
                      <div style={{ position: 'relative' }}>
                        <Hash size={18} color="#f59e0b" style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', opacity: 0.8 }} />
                        <input
                          type="number"
                          name="port"
                          value={formData.port || 9000}
                          onChange={handleChange}
                          placeholder="9000"
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
                          onFocus={(e) => e.target.style.borderColor = '#f59e0b'}
                          onBlur={(e) => e.target.style.borderColor = 'rgba(255, 255, 255, 0.15)'}
                        />
                      </div>
                    </div>
                  </div>
                )}

                {formData.type === 's3' && (
                  <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '8px' }}>
                      AWS Region:
                    </label>
                    <div style={{ position: 'relative' }}>
                      <Globe size={18} color="#ec4899" style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', opacity: 0.8 }} />
                      <input
                        type="text"
                        name="s3_region"
                        value={formData.s3_region}
                        onChange={handleChange}
                        placeholder="us-east-1 / ap-southeast-1"
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
                        onFocus={(e) => e.target.style.borderColor = '#ec4899'}
                        onBlur={(e) => e.target.style.borderColor = 'rgba(255, 255, 255, 0.15)'}
                      />
                    </div>
                  </div>
                )}

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '8px' }}>
                      Access Key ID:
                    </label>
                    <div style={{ position: 'relative' }}>
                      <Key size={18} color="#f59e0b" style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', opacity: 0.8 }} />
                      <input
                        type="text"
                        name="s3_access_key"
                        value={formData.s3_access_key}
                        onChange={handleChange}
                        placeholder="minioadmin / AKIA..."
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
                        onFocus={(e) => e.target.style.borderColor = '#f59e0b'}
                        onBlur={(e) => e.target.style.borderColor = 'rgba(255, 255, 255, 0.15)'}
                        required
                      />
                    </div>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '8px' }}>
                      Secret Access Key:
                    </label>
                    <div style={{ position: 'relative' }}>
                      <Lock size={18} color="#f59e0b" style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', opacity: 0.8 }} />
                      <input
                        type="password"
                        name="s3_secret_key"
                        value={formData.s3_secret_key}
                        onChange={handleChange}
                        placeholder={isEditMode ? '•••••••• (Biarkan kosong jika tidak diubah)' : 'minioadmin / secret'}
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
                        onFocus={(e) => e.target.style.borderColor = '#f59e0b'}
                        onBlur={(e) => e.target.style.borderColor = 'rgba(255, 255, 255, 0.15)'}
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '8px' }}>
                    Target Bucket Name (Opsional):
                  </label>
                  <div style={{ position: 'relative' }}>
                    <Folder size={18} color="#f59e0b" style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', opacity: 0.8 }} />
                    <input
                      type="text"
                      name="s3_bucket"
                      value={formData.s3_bucket}
                      onChange={handleChange}
                      placeholder="my-app-uploads"
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
                      onFocus={(e) => e.target.style.borderColor = '#f59e0b'}
                      onBlur={(e) => e.target.style.borderColor = 'rgba(255, 255, 255, 0.15)'}
                    />
                  </div>
                </div>
              </>
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
              <span>{testing ? 'Uji Koneksi...' : 'Uji Koneksi Layanan'}</span>
            </button>

            <button
              type="submit"
              disabled={submitting}
              className="btn-primary"
              style={{
                padding: '10px 22px',
                fontSize: '0.9rem',
                background: formData.type === 'postgresql'
                  ? 'linear-gradient(135deg, #38bdf8 0%, #0284c7 100%)'
                  : 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)'
              }}
            >
              {submitting ? <Loader2 className="animate-spin" size={16} /> : <CheckCircle size={16} />}
              <span>{submitting ? 'Menyimpan...' : (isEditMode ? 'Simpan Perubahan' : 'Tambah Layanan')}</span>
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}
