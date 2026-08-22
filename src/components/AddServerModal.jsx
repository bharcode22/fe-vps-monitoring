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
      setErrorMsg(err.message || 'Gagal menyimpan konfigurasi server.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-md z-[999] flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="w-[92vw] max-w-3xl max-h-[92vh] overflow-y-auto p-6 md:p-8 bg-slate-950 border border-cyan-500/30 rounded-3xl shadow-2xl shadow-black/90"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3.5">
            <div className="bg-gradient-to-br from-cyan-500/20 to-blue-500/20 border border-cyan-500/40 p-3 rounded-2xl flex items-center justify-center">
              {isEditMode ? <Edit3 className="text-cyan-400 w-6 h-6" /> : <Server className="text-cyan-400 w-6 h-6" />}
            </div>
            <div>
              <h3 className="text-xl font-extrabold text-white tracking-tight">
                {isEditMode ? 'Edit Konfigurasi Server VPS / POD' : 'Tambah Server VPS / POD (SSH)'}
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Monitoring Metrik Sistem Real-time, CPU/RAM/Disk, GPU, & Docker Apps via SSH.
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

          {/* Tipe Server Cards */}
          <div>
            <label className="block text-xs font-bold text-slate-300 mb-2.5">
              Tipe Infrastruktur Server:
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">

              {/* Standar VPS */}
              <div
                onClick={() => handleChange({ target: { name: 'type', value: 'vps' } })}
                className={`p-4 rounded-2xl border cursor-pointer transition-all duration-200 flex items-center gap-3.5 ${formData.type === 'vps'
                  ? 'border-cyan-400 bg-gradient-to-br from-cyan-500/15 to-cyan-500/5 shadow-md shadow-cyan-500/10'
                  : 'border-slate-800 bg-black/30 hover:border-slate-700'
                  }`}
              >
                <div className={`p-2.5 rounded-xl ${formData.type === 'vps' ? 'bg-cyan-500/25' : 'bg-white/5'}`}>
                  <Server size={22} className={formData.type === 'vps' ? 'text-cyan-400' : 'text-slate-400'} />
                </div>
                <div>
                  <div className={`font-bold text-sm ${formData.type === 'vps' ? 'text-cyan-400' : 'text-white'}`}>
                    Standar VPS
                  </div>
                  <div className="text-xs text-slate-400 mt-0.5">
                    Server Linux fisik atau VM independen.
                  </div>
                </div>
              </div>

              {/* POD Container */}
              <div
                onClick={() => handleChange({ target: { name: 'type', value: 'pod' } })}
                className={`p-4 rounded-2xl border cursor-pointer transition-all duration-200 flex items-center gap-3.5 ${formData.type === 'pod'
                  ? 'border-purple-400 bg-gradient-to-br from-purple-500/15 to-purple-500/5 shadow-md shadow-purple-500/10'
                  : 'border-slate-800 bg-black/30 hover:border-slate-700'
                  }`}
              >
                <div className={`p-2.5 rounded-xl ${formData.type === 'pod' ? 'bg-purple-500/25' : 'bg-white/5'}`}>
                  <Box size={22} className={formData.type === 'pod' ? 'text-purple-400' : 'text-slate-400'} />
                </div>
                <div>
                  <div className={`font-bold text-sm ${formData.type === 'pod' ? 'text-purple-400' : 'text-white'}`}>
                    POD Container
                  </div>
                  <div className="text-xs text-slate-400 mt-0.5">
                    Lingkungan terisolasi RunPod / Server POD.
                  </div>
                </div>
              </div>

            </div>
          </div>

          {/* Versi POD Selector (V3 vs V2) */}
          {formData.type === 'pod' && (
            <div className="bg-purple-500/5 border border-purple-500/20 rounded-2xl p-4.5">
              <label className="block text-xs font-bold text-purple-400 mb-2.5 uppercase tracking-wider">
                Pilih Versi POD Server:
              </label>
              <div className="flex gap-3">

                {/* Versi 3 */}
                <button
                  type="button"
                  onClick={() => handleChange({ target: { name: 'pod_version', value: 'v3' } })}
                  className={`flex-1 p-3 rounded-xl border font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer ${(formData.pod_version || 'v3') === 'v3'
                    ? 'border-purple-400 bg-purple-500/25 text-purple-300'
                    : 'border-slate-800 bg-black/30 text-slate-400 hover:text-slate-200'
                    }`}
                >
                  <Box size={16} /> POD Versi 3 (V3)
                </button>

                {/* Versi 2 */}
                <button
                  type="button"
                  onClick={() => handleChange({ target: { name: 'pod_version', value: 'v2' } })}
                  className={`flex-1 p-3 rounded-xl border font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer ${formData.pod_version === 'v2'
                    ? 'border-amber-400 bg-amber-500/25 text-amber-300'
                    : 'border-slate-800 bg-black/30 text-slate-400 hover:text-slate-200'
                    }`}
                >
                  <Box size={16} /> POD Versi 2 (V2)
                </button>

              </div>
            </div>
          )}

          {/* Form Input Fields Container */}
          <div className="flex flex-col gap-4">

            {/* Nama Server */}
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5">
                Nama Label Server:
              </label>
              <div className="relative">
                <Server size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-cyan-400 opacity-80" />
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="Contoh: Production Server / POD 33 Main"
                  className="w-full pl-12 pr-4 py-2.5 bg-black/45 border border-slate-800 focus:border-cyan-400 rounded-xl text-white text-sm outline-none transition-colors"
                  required
                />
              </div>
            </div>

            {/* Host IP & SSH Port */}
            <div className="grid grid-cols-3 gap-3.5">
              <div className="col-span-2">
                <label className="block text-xs font-semibold text-slate-400 mb-1.5">
                  Host IP / Domain SSH:
                </label>
                <div className="relative">
                  <Globe size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-sky-400 opacity-80" />
                  <input
                    type="text"
                    name="host"
                    value={formData.host}
                    onChange={handleChange}
                    placeholder="10.10.3.33"
                    className="w-full pl-12 pr-4 py-2.5 bg-black/45 border border-slate-800 focus:border-sky-400 rounded-xl text-white text-sm font-mono outline-none transition-colors"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5">
                  Port SSH:
                </label>
                <div className="relative">
                  <Hash size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sky-400 opacity-80" />
                  <input
                    type="number"
                    name="port"
                    value={formData.port}
                    onChange={handleChange}
                    className="w-full pl-10 pr-3 py-2.5 bg-black/45 border border-slate-800 focus:border-sky-400 rounded-xl text-white text-sm font-mono outline-none transition-colors"
                  />
                </div>
              </div>
            </div>

            {/* SSH Username */}
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5">
                SSH Username:
              </label>
              <div className="relative">
                <User size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-purple-400 opacity-80" />
                <input
                  type="text"
                  name="username"
                  value={formData.username}
                  onChange={handleChange}
                  placeholder="pod / root"
                  className="w-full pl-12 pr-4 py-2.5 bg-black/45 border border-slate-800 focus:border-purple-400 rounded-xl text-white text-sm font-mono outline-none transition-colors"
                />
              </div>
            </div>

            {/* Authentication Type */}
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5">
                Tipe Otentikasi SSH:
              </label>
              <div className="flex gap-3">
                <label className={`flex-1 flex items-center gap-2.5 p-3 rounded-xl border cursor-pointer text-xs font-semibold transition-colors ${formData.auth_type === 'password'
                  ? 'bg-cyan-500/12 border-cyan-400 text-cyan-400'
                  : 'bg-black/30 border-slate-800 text-white'
                  }`}>
                  <input
                    type="radio"
                    name="auth_type"
                    value="password"
                    checked={formData.auth_type === 'password'}
                    onChange={handleChange}
                  />
                  <Lock size={16} /> Password SSH
                </label>

                <label className={`flex-1 flex items-center gap-2.5 p-3 rounded-xl border cursor-pointer text-xs font-semibold transition-colors ${formData.auth_type === 'key'
                  ? 'bg-cyan-500/12 border-cyan-400 text-cyan-400'
                  : 'bg-black/30 border-slate-800 text-white'
                  }`}>
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
                <label className="block text-xs font-semibold text-slate-400 mb-1.5">
                  Password SSH:
                </label>
                <div className="relative">
                  <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-cyan-400 opacity-80" />
                  <input
                    type="password"
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    placeholder={isEditMode ? '•••••••• (Biarkan kosong jika tidak diubah)' : 'Masukkan password SSH'}
                    className="w-full pl-12 pr-4 py-2.5 bg-black/45 border border-slate-800 focus:border-cyan-400 rounded-xl text-white text-sm font-mono outline-none transition-colors"
                  />
                </div>
              </div>
            ) : (
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5">
                  SSH Private Key (PEM/RSA):
                </label>
                <textarea
                  name="private_key"
                  value={formData.private_key}
                  onChange={handleChange}
                  placeholder={isEditMode ? '•••••••• (Biarkan kosong jika tidak diubah)' : '-----BEGIN OPENSSH PRIVATE KEY-----'}
                  rows={4}
                  className="w-full p-3 bg-black/45 border border-slate-800 focus:border-cyan-400 rounded-xl text-white text-xs font-mono outline-none transition-colors resize-y"
                />
              </div>
            )}

          </div>

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
              <span>{testing ? 'Uji Koneksi...' : 'Uji Koneksi SSH'}</span>
            </button>

            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2.5 bg-gradient-to-r from-cyan-400 to-blue-500 hover:from-cyan-300 hover:to-blue-400 text-slate-950 rounded-xl text-xs font-bold flex items-center gap-2 shadow-lg shadow-cyan-500/25 transition-all cursor-pointer"
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
