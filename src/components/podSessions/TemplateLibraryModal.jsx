import React, { useState, useEffect } from 'react';
import {
  X,
  BookOpen,
  Search,
  Download,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Layers,
  ArrowRight,
  Sparkles,
  Sliders,
  RefreshCw,
  Plus
} from 'lucide-react';
import {
  fetchSavedTemplatesApi,
  deleteTemplateApi,
  addDetailExperienceApi
} from '../../api/vpsApi';

export default function TemplateLibraryModal({
  isOpen,
  onClose,
  currentPod,
  currentExperience,
  onSuccess,
  onOpenBatchApply
}) {
  const [templates, setTemplates] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);
  const [applyingTemplateId, setApplyingTemplateId] = useState(null);

  const loadTemplates = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const list = await fetchSavedTemplatesApi();
      setTemplates(list || []);
    } catch (err) {
      setError(err.message || 'Gagal memuat daftar template');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadTemplates();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleDelete = async (filename) => {
    if (!window.confirm(`Yakin ingin menghapus template ini?`)) return;

    try {
      await deleteTemplateApi(filename);
      setSuccessMsg('Template berhasil dihapus');
      setTemplates(prev => prev.filter(t => t.filename !== filename));
    } catch (err) {
      setError(err.message || 'Gagal menghapus template');
    }
  };

  const handleApplyCurrentPod = async (tpl) => {
    if (!currentPod?.id || !currentExperience?.id) {
      setError('Pilih unit POD dan sesi aktif terlebih dahulu');
      return;
    }

    setApplyingTemplateId(tpl.id || tpl.filename);
    setError(null);
    try {
      const cleanItem = { ...tpl.detail_experience };
      delete cleanItem.id;
      delete cleanItem.experience_id;

      const payload = {
        detail_experience: [cleanItem],
        group_ids: []
      };

      await addDetailExperienceApi(currentPod.id, currentExperience.id, payload);
      setSuccessMsg(`Template "${tpl.template_name}" berhasil diterapkan ke ${currentPod.name || 'POD'}!`);

      setTimeout(() => {
        if (onSuccess) onSuccess();
        onClose();
      }, 900);
    } catch (err) {
      setError(err.message || 'Gagal menerapkan template ke POD');
    } finally {
      setApplyingTemplateId(null);
    }
  };

  const handleDownload = (tpl) => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(tpl, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', tpl.filename || `template_${tpl.target_session?.toLowerCase() || 'custom'}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const filteredTemplates = templates.filter(t => {
    const matchesSearch = !searchQuery ||
      t.template_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      String(t.detail_experience?.sound_scape).includes(searchQuery);

    const matchesCat = selectedCategory === 'ALL' ||
      t.target_session?.toUpperCase() === selectedCategory.toUpperCase();

    return matchesSearch && matchesCat;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-4xl bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden my-8 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700/60 bg-slate-800/40">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-indigo-500/10 border border-indigo-500/30 text-indigo-400">
              <BookOpen size={20} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                Template Library
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  {templates.length} Tersimpan
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Pustaka profil kalibrasi sesi Signature siap pakai antar armada POD
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X size={18} />
          </button>
        </div>

        {/* Filter & Search Bar */}
        <div className="p-4 border-b border-slate-800 bg-slate-950/40 flex flex-wrap items-center justify-between gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              placeholder="Cari nama template, soundscape, deskripsi..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white focus:outline-none focus:border-indigo-400"
            />
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto text-xs">
            {['ALL', 'RECHARGE', 'RECONNECT', 'STRESS', 'RELAX', 'FOCUS', 'SLEEP'].map(cat => (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1 rounded-lg font-semibold transition ${
                  selectedCategory === cat
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                    : 'bg-slate-800/80 text-slate-400 hover:text-slate-200'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Body Cards List */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {error && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle size={16} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}
          {successMsg && (
            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
              <CheckCircle2 size={16} className="shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {isLoading ? (
            <div className="py-12 text-center text-xs text-slate-400">
              <RefreshCw size={24} className="animate-spin mx-auto text-indigo-400 mb-2" />
              Memuat template library...
            </div>
          ) : filteredTemplates.length === 0 ? (
            <div className="py-12 text-center text-slate-400">
              <BookOpen size={36} className="mx-auto text-slate-600 mb-2" />
              <p className="text-sm font-semibold text-slate-300">Belum ada template yang cocok</p>
              <p className="text-xs text-slate-500 mt-1">
                Simpan konfigurasi sesi aktif atau import file JSON untuk menambah koleksi
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredTemplates.map((tpl) => {
                const det = tpl.detail_experience || {};
                const isApplyingThis = applyingTemplateId === (tpl.id || tpl.filename);

                return (
                  <div
                    key={tpl.filename || tpl.id}
                    className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 hover:border-indigo-500/40 transition flex flex-col justify-between space-y-4 shadow-sm"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2 mb-1.5">
                        <h3 className="font-bold text-sm text-white flex items-center gap-2">
                          <Sparkles size={14} className="text-amber-400 shrink-0" />
                          {tpl.template_name || det.title || 'Untitled Template'}
                        </h3>
                        <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 uppercase">
                          {tpl.target_session || 'SESSION'}
                        </span>
                      </div>

                      {tpl.description && (
                        <p className="text-xs text-slate-400 line-clamp-2 mb-3">
                          {tpl.description}
                        </p>
                      )}

                      {/* Mini spec chips */}
                      <div className="flex flex-wrap gap-1.5 text-[11px] mb-3">
                        <span className="px-2 py-0.5 rounded bg-slate-900 text-cyan-300 border border-slate-800 font-mono">
                          SoundScape #{det.sound_scape || '-'}
                        </span>
                        <span className="px-2 py-0.5 rounded bg-slate-900 text-slate-300 border border-slate-800">
                          ⏱ {det.duration || 20}m
                        </span>
                        <span className="px-2 py-0.5 rounded bg-slate-900 text-amber-300 border border-slate-800 font-mono">
                          Strobe: {det.stroboscopic_light || 0}%
                        </span>
                        <span className="px-2 py-0.5 rounded bg-slate-900 text-cyan-300 border border-slate-800 font-mono">
                          Vibro: {det.vibro_acoustics || 0}%
                        </span>
                        {det.burst_time?.length > 0 && (
                          <span className="px-2 py-0.5 rounded bg-emerald-950/60 text-emerald-300 border border-emerald-500/30">
                            💨 {det.burst_time.length} Bursts
                          </span>
                        )}
                      </div>

                      <div className="text-[10px] text-slate-500 flex items-center justify-between">
                        <span>Oleh: {tpl.author || 'System'}</span>
                        <span>{tpl.created_at ? new Date(tpl.created_at).toLocaleDateString() : ''}</span>
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="flex items-center justify-between pt-3 border-t border-slate-800/80">
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleDownload(tpl)}
                          title="Download file .json"
                          className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition"
                        >
                          <Download size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(tpl.filename)}
                          title="Hapus template"
                          className="p-1.5 rounded-lg hover:bg-rose-500/20 text-slate-500 hover:text-rose-400 transition"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            onOpenBatchApply(tpl);
                            onClose();
                          }}
                          className="px-2.5 py-1.5 rounded-lg bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 border border-purple-500/30 text-xs font-semibold flex items-center gap-1 transition"
                        >
                          <Layers size={13} />
                          Batch POD
                        </button>

                        <button
                          type="button"
                          onClick={() => handleApplyCurrentPod(tpl)}
                          disabled={isApplyingThis}
                          className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition flex items-center gap-1 disabled:opacity-50"
                        >
                          {isApplyingThis ? (
                            <span>Menerapkan...</span>
                          ) : (
                            <>
                              <span>Gunakan</span>
                              <ArrowRight size={13} />
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-800 bg-slate-950/60">
          <span className="text-xs text-slate-400">
            Unit POD Aktif: <b className="text-white">{currentPod?.name || 'Belum Dipilih'}</b> (Sesi: <b className="text-cyan-400">{currentExperience?.menu_name || '-'}</b>)
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
}
