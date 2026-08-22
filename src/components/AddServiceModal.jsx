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
    connString: '',
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
      if (name === 'connString' && value.trim()) {
        try {
          const url = new URL(value.trim());
          const username = decodeURIComponent(url.username);
          const password = decodeURIComponent(url.password);
          const host = url.hostname;
          const port = Number(url.port) || 5432;
          const db_name = url.pathname.replace(/^\/+/, '').split('?')[0];

          updated.host = host;
          updated.port = port;
          updated.username = username || 'postgres';
          updated.password = password;
          updated.db_user = username || 'postgres';
          updated.db_name = db_name || 'postgres';
          if (!updated.name && db_name) {
            updated.name = db_name;
          }
        } catch (err) {
          // ignore invalid url during manual typing
        }
      }
      return updated;
    });
    setTestResult(null);
    setErrorMsg('');
  };

  const handleTestConnection = async () => {
    const connStr = formData.connString ? formData.connString.trim() : '';
    if ((formData.type === 'postgresql' && !connStr) || ((formData.type === 'minio' || formData.type === 's3') && !formData.s3_endpoint)) {
      setErrorMsg('Connection String / Endpoint wajib diisi.');
      return;
    }

    setTesting(true);
    setTestResult(null);
    setErrorMsg('');

    const payload = (() => {
      if (formData.type === 'postgresql' && formData.connString) {
        try {
          const url = new URL(formData.connString);
          const username = decodeURIComponent(url.username);
          const password = decodeURIComponent(url.password);
          const host = url.hostname;
          const port = Number(url.port) || 5432;
          const db_name = url.pathname.replace(/^\/+/, '').split('?')[0];
          return {
            ...formData,
            host,
            port,
            username,
            password,
            db_user: username,
            db_name
          };
        } catch (e) {
          console.error('Invalid connection string', e);
          return { ...formData };
        }
      }
      // fallback for other types
      return {
        ...formData,
        host: formData.host || formData.s3_endpoint || (formData.type === 's3' ? 's3.amazonaws.com' : ''),
        username: (formData.type === 'minio' || formData.type === 's3') ? (formData.s3_access_key || '') : (formData.db_user || 'postgres'),
        db_user: (formData.type === 'minio' || formData.type === 's3') ? '' : (formData.db_user || 'postgres'),
        db_name: (formData.type === 'minio' || formData.type === 's3') ? '' : (formData.db_name || 'postgres')
      };
    })();

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

    const payload = (() => {
      if (formData.type === 'postgresql' && formData.connString) {
        try {
          const url = new URL(formData.connString);
          const username = decodeURIComponent(url.username);
          const password = decodeURIComponent(url.password);
          const host = url.hostname;
          const port = Number(url.port) || 5432;
          const db_name = url.pathname.replace(/^\/+/, '').split('?')[0];
          return {
            ...formData,
            name: formData.name || db_name || 'PostgreSQL DB',
            username,
            password,
            db_user: username,
            db_name
          };
        } catch (e) {
          console.error('Invalid connection string', e);
          return { ...formData };
        }
      }
      // fallback for other types
      return {
        ...formData,
        host: formData.host || formData.s3_endpoint || (formData.type === 's3' ? 's3.amazonaws.com' : ''),
        username: (formData.type === 'minio' || formData.type === 's3') ? (formData.s3_access_key || '') : (formData.db_user || 'postgres'),
        db_user: (formData.type === 'minio' || formData.type === 's3') ? '' : (formData.db_user || 'postgres'),
        db_name: (formData.type === 'minio' || formData.type === 's3') ? '' : (formData.db_name || 'postgres')
      };
    })();

    if (!payload.name) {
      setErrorMsg('Nama Layanan wajib diisi.');
      return;
    }

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
    <div className="fixed inset-0 bg-black/75 backdrop-blur-md z-[999] flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="w-[92vw] max-w-3xl max-h-[92vh] overflow-y-auto p-6 md:p-8 bg-slate-950 border border-sky-500/30 rounded-3xl shadow-2xl shadow-black/90"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3.5">
            <div className={`p-3 rounded-2xl border flex items-center justify-center ${formData.type === 'postgresql'
              ? 'bg-sky-500/20 border-sky-500/40 text-sky-400'
              : 'bg-amber-500/20 border-amber-500/40 text-amber-400'
              }`}>
              {formData.type === 'postgresql' ? <Database size={24} /> : <HardDrive size={24} />}
            </div>
            <div>
              <h3 className="text-xl font-extrabold text-white tracking-tight">
                {isEditMode ? 'Edit Layanan DB / Storage' : 'Tambah Layanan Database & Storage Baru'}
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Monitor koneksi PostgreSQL, MinIO Object Storage, atau AWS S3 secara tersentralisasi.
              </p>
            </div>
          </div>

          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors cursor-pointer p-1">
            <X size={22} />
          </button>
        </div>

        {errorMsg && (
          <div className="bg-red-500/15 border border-red-500/30 text-red-300 p-3.5 rounded-xl text-xs mb-5 flex items-center gap-2.5">
            <AlertCircle size={18} className="text-red-400 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-5">

          {/* Tipe Service Selector */}
          <div>
            <label className="block text-xs font-bold text-slate-300 mb-2.5">
              Pilih Jenis Layanan:
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">

              {/* PostgreSQL */}
              <div
                onClick={() => handleChange({ target: { name: 'type', value: 'postgresql' } })}
                className={`p-3.5 rounded-2xl border cursor-pointer transition-all duration-200 flex items-center gap-3 ${formData.type === 'postgresql'
                  ? 'border-sky-400 bg-sky-500/15 text-sky-400 shadow-md shadow-sky-500/10'
                  : 'border-slate-800 bg-black/30 hover:border-slate-700 text-slate-300'
                  }`}
              >
                <Database size={20} className={formData.type === 'postgresql' ? 'text-sky-400' : 'text-slate-400'} />
                <div>
                  <div className="font-bold text-xs">PostgreSQL</div>
                  <div className="text-[10px] text-slate-400">Database SQL</div>
                </div>
              </div>

              {/* MinIO Storage */}
              <div
                onClick={() => handleChange({ target: { name: 'type', value: 'minio' } })}
                className={`p-3.5 rounded-2xl border cursor-pointer transition-all duration-200 flex items-center gap-3 ${formData.type === 'minio'
                  ? 'border-amber-400 bg-amber-500/15 text-amber-400 shadow-md shadow-amber-500/10'
                  : 'border-slate-800 bg-black/30 hover:border-slate-700 text-slate-300'
                  }`}
              >
                <HardDrive size={20} className={formData.type === 'minio' ? 'text-amber-400' : 'text-slate-400'} />
                <div>
                  <div className="font-bold text-xs">MinIO Storage</div>
                  <div className="text-[10px] text-slate-400">Self-hosted S3</div>
                </div>
              </div>

              {/* AWS S3 */}
              <div
                onClick={() => handleChange({ target: { name: 'type', value: 's3' } })}
                className={`p-3.5 rounded-2xl border cursor-pointer transition-all duration-200 flex items-center gap-3 ${formData.type === 's3'
                  ? 'border-pink-400 bg-pink-500/15 text-pink-400 shadow-md shadow-pink-500/10'
                  : 'border-slate-800 bg-black/30 hover:border-slate-700 text-slate-300'
                  }`}
              >
                <HardDrive size={20} className={formData.type === 's3' ? 'text-pink-400' : 'text-slate-400'} />
                <div>
                  <div className="font-bold text-xs">AWS S3</div>
                  <div className="text-[10px] text-slate-400">Cloud Storage</div>
                </div>
              </div>

            </div>
          </div>

          {/* Form Fields: Common Name */}
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1.5">
              Nama Label Layanan:
            </label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="Contoh: DB Utama / MinIO Storage POD / AWS Assets"
              className="w-full px-4 py-2.5 bg-black/45 border border-slate-800 focus:border-sky-400 rounded-xl text-white text-sm outline-none transition-colors"
              required
            />
          </div>

          {/* Dynamic Fields for PostgreSQL */}
          {formData.type === 'postgresql' && (
            <div className="flex flex-col gap-4 bg-sky-500/5 border border-sky-500/20 p-4 rounded-2xl">
              <div className="col-span-2">
                <label className="block text-xs font-semibold text-slate-400 mb-1.5">Connection String:</label>
                <input
                  type="text"
                  name="connString"
                  value={formData.connString}
                  onChange={handleChange}
                  placeholder="postgresql://postgres:password@host:5432/dbname?schema=public"
                  className="w-full px-4 py-2.5 bg-black/45 border border-slate-800 focus:border-sky-400 rounded-xl text-white text-sm font-mono outline-none"
                  required
                />
              </div>
            </div>
          )}

          {/* Dynamic Fields for MinIO or AWS S3 */}
          {(formData.type === 'minio' || formData.type === 's3') && (
            <div className="flex flex-col gap-4 bg-amber-500/5 border border-amber-500/20 p-4 rounded-2xl">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5">Endpoint Storage URL:</label>
                <input
                  type="text"
                  name="s3_endpoint"
                  value={formData.s3_endpoint}
                  onChange={handleChange}
                  placeholder={formData.type === 'minio' ? 'http://10.10.3.33:9000' : 'https://s3.us-east-1.amazonaws.com'}
                  className="w-full px-4 py-2.5 bg-black/45 border border-slate-800 focus:border-amber-400 rounded-xl text-white text-sm font-mono outline-none"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1.5">Access Key ID:</label>
                  <input
                    type="text"
                    name="s3_access_key"
                    value={formData.s3_access_key}
                    onChange={handleChange}
                    placeholder="AKIAIOSFODNN7EXAMPLE"
                    className="w-full px-4 py-2.5 bg-black/45 border border-slate-800 focus:border-amber-400 rounded-xl text-white text-sm font-mono outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1.5">Secret Access Key:</label>
                  <input
                    type="password"
                    name="s3_secret_key"
                    value={formData.s3_secret_key}
                    onChange={handleChange}
                    placeholder={isEditMode ? '•••••••• (Biarkan kosong jika tidak diubah)' : 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY'}
                    className="w-full px-4 py-2.5 bg-black/45 border border-slate-800 focus:border-amber-400 rounded-xl text-white text-sm font-mono outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1.5">Bucket Name (Opsional):</label>
                  <input
                    type="text"
                    name="s3_bucket"
                    value={formData.s3_bucket}
                    onChange={handleChange}
                    placeholder="my-assets-bucket"
                    className="w-full px-4 py-2.5 bg-black/45 border border-slate-800 focus:border-amber-400 rounded-xl text-white text-sm font-mono outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1.5">Region (Opsional):</label>
                  <input
                    type="text"
                    name="s3_region"
                    value={formData.s3_region}
                    onChange={handleChange}
                    placeholder="us-east-1"
                    className="w-full px-4 py-2.5 bg-black/45 border border-slate-800 focus:border-amber-400 rounded-xl text-white text-sm font-mono outline-none"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Test Connection Result Box */}
          {testResult && (
            <div className={`p-3.5 rounded-xl text-xs flex items-center gap-2.5 border ${testResult.success
              ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300'
              : 'bg-red-500/15 border-red-500/30 text-red-300'
              }`}>
              {testResult.success ? <CheckCircle size={20} className="text-emerald-400 shrink-0" /> : <AlertCircle size={20} className="text-red-400 shrink-0" />}
              <span>{testResult.message}</span>
            </div>
          )}

          {/* Modal Actions */}
          <div className="flex gap-3 justify-end mt-2">
            <button
              type="button"
              onClick={handleTestConnection}
              disabled={testing}
              className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold flex items-center gap-2 border border-slate-700 transition-colors cursor-pointer"
            >
              {testing ? <Loader2 className="animate-spin" size={16} /> : <Key size={16} />}
              <span>{testing ? 'Uji Koneksi...' : 'Uji Koneksi Layanan'}</span>
            </button>

            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2.5 bg-gradient-to-r from-sky-400 to-sky-600 hover:from-sky-300 hover:to-sky-500 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-lg shadow-sky-500/25 transition-all cursor-pointer"
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
