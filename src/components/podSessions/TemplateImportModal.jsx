import React, { useState } from 'react';
import {
  X,
  Upload,
  FileCode,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Sliders,
  Music,
  Wind,
  Layers,
  Save,
  ArrowRight
} from 'lucide-react';
import { addDetailExperienceApi, saveTemplateApi } from '../../api/vpsApi';

export default function TemplateImportModal({
  isOpen,
  onClose,
  currentPod,
  currentExperience,
  onSuccess,
  onOpenBatchApply
}) {
  const [dragActive, setDragActive] = useState(false);
  const [parsedData, setParsedData] = useState(null);
  const [rawText, setRawText] = useState('');
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);
  const [isApplying, setIsApplying] = useState(false);
  const [isSavingToLibrary, setIsSavingToLibrary] = useState(false);

  if (!isOpen) return null;

  const handleProcessJson = (text) => {
    setError(null);
    setSuccessMsg(null);
    try {
      const data = JSON.parse(text);
      // Support both structured template ({ detail_experience: { ... } }) or raw detail_experience
      let detail = null;
      let meta = {
        template_name: 'Custom Imported Template',
        target_session: currentExperience?.menu_name || 'RECHARGE',
        description: ''
      };

      if (data.detail_experience) {
        detail = data.detail_experience;
        meta.template_name = data.template_name || meta.template_name;
        meta.target_session = data.target_session || meta.target_session;
        meta.description = data.description || '';
      } else if (data.sound_scape || data.title || data.stroboscopic_light !== undefined) {
        detail = data;
      } else {
        throw new Error('Format JSON tidak sesuai: Properti detail_experience tidak ditemukan.');
      }

      setParsedData({
        ...meta,
        detail_experience: detail
      });
    } catch (e) {
      setError(`Gagal memproses JSON: ${e.message}`);
      setParsedData(null);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result;
      setRawText(text);
      handleProcessJson(text);
    };
    reader.readAsText(file);
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result;
        setRawText(text);
        handleProcessJson(text);
      };
      reader.readAsText(file);
    }
  };

  // Apply to currently open POD
  const handleApplyCurrentPod = async () => {
    if (!parsedData?.detail_experience || !currentPod?.id || !currentExperience?.id) {
      setError('Pilih POD dan Sesi yang aktif terlebih dahulu');
      return;
    }

    setIsApplying(true);
    setError(null);
    try {
      const cleanItem = { ...parsedData.detail_experience };
      delete cleanItem.id;
      delete cleanItem.experience_id;

      const payload = {
        detail_experience: [cleanItem],
        group_ids: []
      };

      await addDetailExperienceApi(currentPod.id, currentExperience.id, payload);
      setSuccessMsg(`Template berhasil diterapkan ke ${currentPod.name || 'POD'} pada sesi ${currentExperience.menu_name}!`);

      setTimeout(() => {
        if (onSuccess) onSuccess();
        onClose();
      }, 1000);
    } catch (err) {
      setError(err.message || 'Gagal menerapkan template ke POD');
    } finally {
      setIsApplying(false);
    }
  };

  // Save to App Template Library
  const handleSaveToLibrary = async () => {
    if (!parsedData) return;
    setIsSavingToLibrary(true);
    setError(null);
    try {
      await saveTemplateApi(parsedData);
      setSuccessMsg('Template berhasil disimpan ke Template Library sistem!');
    } catch (err) {
      setError(err.message || 'Gagal menyimpan template ke library');
    } finally {
      setIsSavingToLibrary(false);
    }
  };

  const detail = parsedData?.detail_experience;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden my-8 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700/60 bg-slate-800/40">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
              <Upload size={20} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                Import Template JSON
              </h2>
              <p className="text-xs text-slate-400">
                Terapkan profil konfigurasi detail_experience dari file .json ke POD
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

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
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

          {/* Drag & Drop File Zone */}
          <div
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            className={`p-8 border-2 border-dashed rounded-2xl text-center transition flex flex-col items-center justify-center cursor-pointer ${
              dragActive
                ? 'border-cyan-400 bg-cyan-500/10'
                : 'border-slate-700 hover:border-slate-600 bg-slate-950/40'
            }`}
          >
            <FileCode size={36} className="text-cyan-400 mb-3" />
            <p className="text-sm font-semibold text-white mb-1">
              Drag & drop file <span className="text-cyan-400 font-mono">.json</span> template di sini
            </p>
            <p className="text-xs text-slate-400 mb-4">
              atau pilih berkas dari komputer Anda
            </p>
            <label className="px-4 py-2 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 text-xs font-bold cursor-pointer transition">
              <span>Pilih File JSON</span>
              <input
                type="file"
                accept=".json,application/json"
                onChange={handleFileChange}
                className="hidden"
              />
            </label>
          </div>

          {/* Textarea Fallback for Raw JSON Paste */}
          <details className="text-xs text-slate-400">
            <summary className="cursor-pointer hover:text-slate-200 select-none pb-2">
              Atau paste teks JSON secara manual...
            </summary>
            <textarea
              rows={4}
              value={rawText}
              onChange={(e) => {
                setRawText(e.target.value);
                handleProcessJson(e.target.value);
              }}
              placeholder='Paste JSON { "detail_experience": { ... } } di sini...'
              className="w-full p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs text-cyan-300 font-mono focus:outline-none focus:border-cyan-400"
            />
          </details>

          {/* Preview Card */}
          {detail && (
            <div className="p-4 rounded-xl bg-slate-800/40 border border-cyan-500/30 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-700/50">
                <div className="flex items-center gap-2">
                  <Sparkles size={16} className="text-amber-400" />
                  <span className="text-xs font-bold text-white">
                    {parsedData.template_name || 'Template Preview'}
                  </span>
                </div>
                <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                  Target: {parsedData.target_session}
                </span>
              </div>

              {parsedData.description && (
                <p className="text-xs text-slate-400 italic">
                  "{parsedData.description}"
                </p>
              )}

              {/* Media preview */}
              <div className="grid grid-cols-2 gap-3 text-xs bg-slate-950/60 p-3 rounded-lg border border-slate-800">
                <div>
                  <span className="text-slate-500 block text-[10px]">Track Title:</span>
                  <span className="font-semibold text-white">{detail.title || 'Untitled'}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">SoundScape Code:</span>
                  <span className="font-mono text-cyan-300 font-bold">#{detail.sound_scape || '-'}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">Audio Song:</span>
                  <span className="font-mono text-slate-300 truncate block">{detail.song || '-'}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">Strobe Lamp Code:</span>
                  <span className="font-mono text-amber-300 truncate block">{detail.lamp || '-'}</span>
                </div>
              </div>

              {/* Hardware gauges pills */}
              <div className="flex flex-wrap gap-2 text-[11px]">
                <span className="px-2 py-1 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30 font-mono">
                  Strobe: {detail.stroboscopic_light || 0}%
                </span>
                <span className="px-2 py-1 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30 font-mono">
                  LED: {detail.led_intensity || 0}%
                </span>
                <span className="px-2 py-1 rounded bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 font-mono">
                  Vibro: {detail.vibro_acoustics || 0}%
                </span>
                <span className="px-2 py-1 rounded bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 font-mono">
                  Audio: {detail.audio_surround_sound || 0}%
                </span>
                <span className="px-2 py-1 rounded bg-rose-500/15 text-rose-300 border border-rose-500/30 font-mono">
                  NIR: {detail.infra_red_nea_ir || 0}%
                </span>
                {detail.pemf_therapy && (
                  <span className="px-2 py-1 rounded bg-purple-500/15 text-purple-300 border border-purple-500/30 font-semibold">
                    PEMF: On ({detail.pemf_value || 0})
                  </span>
                )}
                {detail.olfactory_engagement && (
                  <span className="px-2 py-1 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 font-semibold">
                    Aroma: {detail.scent || 'Active'}
                  </span>
                )}
              </div>

              {/* Dynamic Schedules counts */}
              <div className="text-xs text-slate-400 flex items-center gap-4 pt-1">
                <span>💨 Aroma Bursts: <b className="text-white">{detail.burst_time?.length || 0}</b></span>
                <span>📻 Frequencies: <b className="text-white">{detail.generator_frequency?.length || 0}</b></span>
                <span>☀️ NIR Intervals: <b className="text-white">{detail.nir_value?.length || 0}</b></span>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-800 bg-slate-950/60">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition"
          >
            Tutup
          </button>

          <div className="flex items-center gap-2">
            {parsedData && (
              <>
                <button
                  type="button"
                  onClick={handleSaveToLibrary}
                  disabled={isSavingToLibrary}
                  className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold transition flex items-center gap-1.5"
                >
                  <Save size={14} className="text-indigo-400" />
                  Simpan ke Library
                </button>

                <button
                  type="button"
                  onClick={() => {
                    onOpenBatchApply(parsedData);
                    onClose();
                  }}
                  className="px-4 py-2 rounded-xl bg-purple-600/30 hover:bg-purple-600/40 text-purple-300 border border-purple-500/50 text-xs font-bold transition flex items-center gap-1.5"
                >
                  <Layers size={14} />
                  Batch Apply (Banyak POD)
                </button>

                <button
                  type="button"
                  onClick={handleApplyCurrentPod}
                  disabled={isApplying}
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-cyan-600 hover:from-cyan-400 hover:to-cyan-500 text-slate-950 font-bold text-xs shadow-lg shadow-cyan-500/20 transition flex items-center gap-2 disabled:opacity-50"
                >
                  {isApplying ? (
                    <span>Menerapkan...</span>
                  ) : (
                    <>
                      <span>Terapkan ke POD Ini</span>
                      <ArrowRight size={14} />
                    </>
                  )}
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
