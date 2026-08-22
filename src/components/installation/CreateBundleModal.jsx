import React, { useState, useEffect } from 'react';
import {
  X,
  Package,
  Layers,
  Save,
  CheckCircle2,
  AlertCircle,
  Tag,
  Cpu,
  Tv,
  RefreshCw,
  HelpCircle,
  Sparkles,
  FileCode
} from 'lucide-react';
import {
  createBundleDefinitionApi,
  updateBundleDefinitionApi,
  fetchInstallationVersionsApi,
  fetchInstallationEnvFilesApi
} from '../../api/vpsApi';
import { ALL_POD_APPS, POD_APPS } from './constants';

export default function CreateBundleModal({
  isOpen,
  onClose,
  onSaved,
  editBundle = null
}) {
  const [formData, setFormData] = useState({
    bundle_name: '',
    bundle_version: '',
    environment: 'dev',
    description: '',
    // 5 Backend Versions
    mobile_api_version: '',
    mobile_synch_version: '',
    mobile_consume_version: '',
    mobile_downloader_version: '',
    assist_api_version: '',
    // 5 Backend .env files
    mobile_api_env: 'assist-api-dev.env',
    mobile_synch_env: 'assist-api-dev.env',
    mobile_consume_env: 'assist-api-dev.env',
    mobile_downloader_env: 'assist-api-dev.env',
    assist_api_env: 'assist-api-dev.env',
    // 5 Backend Prisma Migrate toggles
    mobile_api_prisma: true,
    mobile_synch_prisma: false,
    mobile_consume_prisma: false,
    mobile_downloader_prisma: false,
    assist_api_prisma: false,
    // 2 Frontend Screens
    small_screen_version: '',
    big_screen_version: ''
  });

  const [availableVersions, setAvailableVersions] = useState({});
  const [envFiles, setEnvFiles] = useState([]);
  const [isLoadingVersions, setIsLoadingVersions] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Load MinIO versions and env files when modal opens
  useEffect(() => {
    if (!isOpen) return;

    loadEnvFiles();

    if (editBundle) {
      setFormData({
        bundle_name: editBundle.bundle_name || '',
        bundle_version: editBundle.bundle_version || '',
        environment: editBundle.environment || 'dev',
        description: editBundle.description || '',
        mobile_api_version: editBundle.mobile_api_version || '',
        mobile_synch_version: editBundle.mobile_synch_version || '',
        mobile_consume_version: editBundle.mobile_consume_version || '',
        mobile_downloader_version: editBundle.mobile_downloader_version || '',
        assist_api_version: editBundle.assist_api_version || '',
        mobile_api_env: editBundle.mobile_api_env || 'assist-api-dev.env',
        mobile_synch_env: editBundle.mobile_synch_env || 'assist-api-dev.env',
        mobile_consume_env: editBundle.mobile_consume_env || 'assist-api-dev.env',
        mobile_downloader_env: editBundle.mobile_downloader_env || 'assist-api-dev.env',
        assist_api_env: editBundle.assist_api_env || 'assist-api-dev.env',
        mobile_api_prisma: Boolean(editBundle.mobile_api_prisma),
        mobile_synch_prisma: Boolean(editBundle.mobile_synch_prisma),
        mobile_consume_prisma: Boolean(editBundle.mobile_consume_prisma),
        mobile_downloader_prisma: Boolean(editBundle.mobile_downloader_prisma),
        assist_api_prisma: Boolean(editBundle.assist_api_prisma),
        small_screen_version: editBundle.small_screen_version || '',
        big_screen_version: editBundle.big_screen_version || ''
      });
      // For existing bundle, fetch MinIO versions without auto-overwriting
      loadAppVersions(editBundle.environment || 'dev', false);
    } else {
      setFormData({
        bundle_name: '',
        bundle_version: '',
        environment: 'dev',
        description: '',
        mobile_api_version: '',
        mobile_synch_version: '',
        mobile_consume_version: '',
        mobile_downloader_version: '',
        assist_api_version: '',
        mobile_api_env: 'assist-api-dev.env',
        mobile_synch_env: 'assist-api-dev.env',
        mobile_consume_env: 'assist-api-dev.env',
        mobile_downloader_env: 'assist-api-dev.env',
        assist_api_env: 'assist-api-dev.env',
        mobile_api_prisma: true,
        mobile_synch_prisma: false,
        mobile_consume_prisma: false,
        mobile_downloader_prisma: false,
        assist_api_prisma: false,
        small_screen_version: '',
        big_screen_version: ''
      });
      // For new bundle, fetch MinIO versions and auto-fill latest
      loadAppVersions('dev', true);
    }

    setErrorMessage('');
  }, [isOpen, editBundle]);

  const loadEnvFiles = async () => {
    try {
      const res = await fetchInstallationEnvFilesApi();
      const raw = res.files || [];
      const list = raw.map(f => typeof f === 'string' ? f : (f.name || f.filename || ''));
      setEnvFiles(list.filter(Boolean));
    } catch (err) {
      console.warn('Error loading env files in bundle modal:', err);
    }
  };

  const loadAppVersions = async (env, isAutoSelect = false) => {
    setIsLoadingVersions(true);
    const versionResults = {};

    await Promise.all(
      ALL_POD_APPS.map(async (app) => {
        try {
          const res = await fetchInstallationVersionsApi(app.id, env);
          versionResults[app.id] = res.versions || [];
        } catch (err) {
          versionResults[app.id] = [];
        }
      })
    );

    setAvailableVersions(versionResults);
    setIsLoadingVersions(false);

    // Auto-fill / update with latest MinIO versions and matching env files
    if (isAutoSelect) {
      const isRelease = env === 'release';
      const defaultEnvFile = isRelease ? 'assist-api-prod.env' : 'assist-api-dev.env';

      setFormData(prev => ({
        ...prev,
        mobile_api_version: versionResults['mobile-api']?.[0] || '',
        mobile_synch_version: versionResults['mobile-synch']?.[0] || '',
        mobile_consume_version: versionResults['mobile-consume']?.[0] || '',
        mobile_downloader_version: versionResults['mobile-downloader']?.[0] || '',
        assist_api_version: versionResults['assist-api']?.[0] || '',
        small_screen_version: versionResults['small-screen']?.[0] || '',
        big_screen_version: versionResults['big-screen']?.[0] || '',
        // Auto select appropriate .env default
        mobile_api_env: prev.mobile_api_env?.includes(isRelease ? 'dev' : 'prod') ? defaultEnvFile : (prev.mobile_api_env || defaultEnvFile),
        mobile_synch_env: prev.mobile_synch_env?.includes(isRelease ? 'dev' : 'prod') ? defaultEnvFile : (prev.mobile_synch_env || defaultEnvFile),
        mobile_consume_env: prev.mobile_consume_env?.includes(isRelease ? 'dev' : 'prod') ? defaultEnvFile : (prev.mobile_consume_env || defaultEnvFile),
        mobile_downloader_env: prev.mobile_downloader_env?.includes(isRelease ? 'dev' : 'prod') ? defaultEnvFile : (prev.mobile_downloader_env || defaultEnvFile),
        assist_api_env: prev.assist_api_env?.includes(isRelease ? 'dev' : 'prod') ? defaultEnvFile : (prev.assist_api_env || defaultEnvFile)
      }));
    }
  };

  const handleEnvChange = (newEnv) => {
    setFormData(prev => ({ ...prev, environment: newEnv }));
    loadAppVersions(newEnv, true);
  };

  const handleManualRefresh = () => {
    loadAppVersions(formData.environment, true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.bundle_name.trim()) {
      setErrorMessage('Nama bundle wajib diisi (contoh: Bundle v3.2.0-dev)');
      return;
    }
    if (!formData.bundle_version.trim()) {
      setErrorMessage('Nomor versi bundle wajib diisi (contoh: 3.2.0)');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage('');

    try {
      if (editBundle?.id) {
        await updateBundleDefinitionApi(editBundle.id, formData);
      } else {
        await createBundleDefinitionApi(formData);
      }
      onSaved?.();
      onClose();
    } catch (err) {
      console.error('Error saving bundle:', err);
      setErrorMessage(err.message || 'Gagal menyimpan resep bundle');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl glass-card rounded-3xl border border-cyan-500/30 bg-slate-950 p-6 shadow-2xl overflow-hidden max-h-[92vh] flex flex-col">
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-cyan-500/15 text-cyan-400 border border-cyan-500/30">
              <Package size={22} />
            </div>
            <div>
              <h3 className="text-base font-black text-white flex items-center gap-2">
                <span>{editBundle ? 'Edit Resep Bundle Version' : 'Buat Resep Bundle Version Baru'}</span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Tentukan versi resmi 7 aplikasi beserta konfigurasi file .env dan Prisma Migrate untuk backend
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto py-4 space-y-4 pr-1">
          {errorMessage && (
            <div className="p-3 rounded-xl bg-rose-950/80 border border-rose-500/40 text-rose-300 text-xs flex items-center gap-2 font-bold">
              <AlertCircle size={16} className="shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Bundle Metadata */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 rounded-2xl bg-slate-900/60 border border-slate-800">
            <div className="sm:col-span-2">
              <label className="block text-[11px] font-bold text-slate-300 uppercase mb-1">
                Nama Bundle Resmi <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="Contoh: Bundle v3.2.0-dev (Standard)"
                value={formData.bundle_name}
                onChange={(e) => setFormData({ ...formData, bundle_name: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/50"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-300 uppercase mb-1">
                Versi Bundle <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="Contoh: 3.2.0"
                value={formData.bundle_version}
                onChange={(e) => setFormData({ ...formData, bundle_version: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/50 font-mono"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-300 uppercase mb-1">
                Environment
              </label>
              <div className="flex rounded-xl bg-slate-900 p-1 border border-slate-700">
                <button
                  type="button"
                  onClick={() => handleEnvChange('dev')}
                  className={`flex-1 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                    formData.environment === 'dev'
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  DEV
                </button>
                <button
                  type="button"
                  onClick={() => handleEnvChange('release')}
                  className={`flex-1 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                    formData.environment === 'release'
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  RELEASE
                </button>
              </div>
            </div>

            <div className="sm:col-span-2">
              <label className="block text-[11px] font-bold text-slate-300 uppercase mb-1">
                Deskripsi / Catatan Rilis
              </label>
              <input
                type="text"
                placeholder="Catatan perubahan bundle..."
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/50"
              />
            </div>
          </div>

          {/* 5 Backend Services Version & .env Config */}
          <div className="p-4 rounded-2xl bg-slate-900/60 border border-sky-500/20 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <div className="flex items-center gap-2 text-xs font-black text-sky-300 uppercase">
                <Cpu size={14} />
                <span>5 Microservices Backend (Versi MinIO, File .env & Prisma)</span>
              </div>

              <div className="flex items-center gap-2">
                {isLoadingVersions ? (
                  <span className="text-[10px] text-cyan-400 flex items-center gap-1.5 font-medium animate-pulse">
                    <RefreshCw size={11} className="animate-spin" /> Memuat versi MinIO...
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={handleManualRefresh}
                    className="px-2 py-0.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-[10px] font-bold text-cyan-400 border border-slate-700 flex items-center gap-1 transition-all cursor-pointer"
                    title="Muat ulang versi terbaru dari MinIO"
                  >
                    <RefreshCw size={10} />
                    <span>Auto-Pilih Terbaru</span>
                  </button>
                )}
              </div>
            </div>

            {/* Backend Services Rows */}
            <div className="space-y-3 pt-1">
              {[
                { id: 'mobile-api', label: '1. Mobile API', verKey: 'mobile_api_version', envKey: 'mobile_api_env', prismaKey: 'mobile_api_prisma' },
                { id: 'mobile-synch', label: '2. Mobile Sync', verKey: 'mobile_synch_version', envKey: 'mobile_synch_env', prismaKey: 'mobile_synch_prisma' },
                { id: 'mobile-consume', label: '3. Mobile Consume', verKey: 'mobile_consume_version', envKey: 'mobile_consume_env', prismaKey: 'mobile_consume_prisma' },
                { id: 'mobile-downloader', label: '4. Mobile Downloader', verKey: 'mobile_downloader_version', envKey: 'mobile_downloader_env', prismaKey: 'mobile_downloader_prisma' },
                { id: 'assist-api', label: '5. Assist API', verKey: 'assist_api_version', envKey: 'assist_api_env', prismaKey: 'assist_api_prisma' }
              ].map(app => {
                return (
                  <div key={app.id} className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
                    <div className="min-w-[170px]">
                      <div className="font-bold text-xs text-white flex items-center gap-1.5">
                        <span>{app.label}</span>
                        <span className="font-mono text-[9px] text-cyan-400 bg-cyan-500/10 px-1 py-0.2 rounded">
                          {app.id}
                        </span>
                      </div>
                      {availableVersions[app.id]?.[0] && (
                        <span className="text-[8.5px] text-emerald-400 font-mono font-bold flex items-center gap-0.5 mt-0.5">
                          <Sparkles size={9} /> MinIO: {availableVersions[app.id][0]}
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
                      {/* Version Picker */}
                      <div className="flex-1 sm:w-48">
                        <select
                          value={formData[app.verKey]}
                          onChange={(e) => setFormData({ ...formData, [app.verKey]: e.target.value })}
                          className="w-full px-2.5 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white font-mono focus:outline-none focus:border-cyan-500/50 cursor-pointer"
                        >
                          <option value="">-- Pilih Versi MinIO --</option>
                          {(availableVersions[app.id] || []).map((v, idx) => (
                            <option key={v} value={v}>
                              {v} {idx === 0 ? '(Terbaru)' : ''}
                            </option>
                          ))}
                          {formData[app.verKey] && !(availableVersions[app.id] || []).includes(formData[app.verKey]) && (
                            <option value={formData[app.verKey]}>{formData[app.verKey]}</option>
                          )}
                        </select>
                      </div>

                      {/* .env File Picker */}
                      <div className="flex items-center gap-1">
                        <span className="text-[10px] text-slate-400 font-mono">.env:</span>
                        <select
                          value={formData[app.envKey] || ''}
                          onChange={(e) => setFormData({ ...formData, [app.envKey]: e.target.value })}
                          className="px-2 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-[11px] text-cyan-300 font-mono focus:outline-none focus:border-cyan-500/50 cursor-pointer max-w-[170px]"
                        >
                          <option value="">(Gunakan Server .env)</option>
                          {envFiles.map(f => (
                            <option key={f} value={f}>{f}</option>
                          ))}
                        </select>
                      </div>

                      {/* Prisma Migrate Checkbox */}
                      <label className="flex items-center gap-1.5 px-2 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-[10px] font-bold text-slate-300 cursor-pointer hover:bg-slate-800 transition-colors">
                        <input
                          type="checkbox"
                          checked={Boolean(formData[app.prismaKey])}
                          onChange={(e) => setFormData({ ...formData, [app.prismaKey]: e.target.checked })}
                          className="w-3.5 h-3.5 rounded text-cyan-500 bg-slate-900 border-slate-700 cursor-pointer accent-cyan-500"
                        />
                        <span>Prisma</span>
                      </label>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 2 Frontend Screens Version Config */}
          <div className="p-4 rounded-2xl bg-slate-900/60 border border-purple-500/20 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <div className="flex items-center gap-2 text-xs font-black text-purple-300 uppercase">
                <Tv size={14} />
                <span>2 Aplikasi Layar Frontend (MinIO Screen-Apps Debian - Tanpa .env)</span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              {/* Small Screen */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-[10px] font-bold text-slate-300">
                    6. Small Screen App (<span className="font-mono text-purple-400">small-screen</span>)
                  </label>
                  {availableVersions['small-screen']?.[0] && (
                    <span className="text-[9px] text-purple-400 font-mono font-bold flex items-center gap-0.5">
                      <Sparkles size={10} /> MinIO Terbaru
                    </span>
                  )}
                </div>
                <select
                  value={formData.small_screen_version}
                  onChange={(e) => setFormData({ ...formData, small_screen_version: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white font-mono focus:outline-none focus:border-cyan-500/50 cursor-pointer"
                >
                  <option value="">-- Pilih Versi MinIO Screen-Apps --</option>
                  {(availableVersions['small-screen'] || []).map((v, idx) => (
                    <option key={v} value={v}>
                      {v} {idx === 0 ? '(Terbaru)' : ''}
                    </option>
                  ))}
                  {formData.small_screen_version && !(availableVersions['small-screen'] || []).includes(formData.small_screen_version) && (
                    <option value={formData.small_screen_version}>{formData.small_screen_version}</option>
                  )}
                </select>
              </div>

              {/* Big Screen */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-[10px] font-bold text-slate-300">
                    7. Big Screen App (<span className="font-mono text-purple-400">big-screen</span>)
                  </label>
                  {availableVersions['big-screen']?.[0] && (
                    <span className="text-[9px] text-purple-400 font-mono font-bold flex items-center gap-0.5">
                      <Sparkles size={10} /> MinIO Terbaru
                    </span>
                  )}
                </div>
                <select
                  value={formData.big_screen_version}
                  onChange={(e) => setFormData({ ...formData, big_screen_version: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white font-mono focus:outline-none focus:border-cyan-500/50 cursor-pointer"
                >
                  <option value="">-- Pilih Versi MinIO Screen-Apps --</option>
                  {(availableVersions['big-screen'] || []).map((v, idx) => (
                    <option key={v} value={v}>
                      {v} {idx === 0 ? '(Terbaru)' : ''}
                    </option>
                  ))}
                  {formData.big_screen_version && !(availableVersions['big-screen'] || []).includes(formData.big_screen_version) && (
                    <option value={formData.big_screen_version}>{formData.big_screen_version}</option>
                  )}
                </select>
              </div>
            </div>
          </div>

          {/* Modal Footer */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 font-bold text-xs transition-colors cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold text-xs flex items-center gap-2 transition-all cursor-pointer shadow-lg shadow-cyan-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Save size={14} />
              <span>{isSubmitting ? 'Menyimpan...' : (editBundle ? 'Simpan Perubahan' : 'Simpan Resep Bundle')}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
