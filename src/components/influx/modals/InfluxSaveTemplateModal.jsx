import React from 'react';
import {
  Pencil,
  Save,
  RefreshCw,
  Check
} from 'lucide-react';

/**
 * InfluxSaveTemplateModal Component
 * Handles creating a new query template or editing an existing template,
 * with options to sync the currently active form query parameters.
 */
export default function InfluxSaveTemplateModal({
  isOpen,
  onClose,
  isEditMode,
  templateForm,
  setTemplateForm,
  handleSyncCurrentQueryToTemplate,
  handleSaveTemplate,
  templateSaving,
  selectedBucket,
  selectedMeasurements,
  selectedFields,
  aggregationInterval,
  aggregationFn,
  timeRangePreset
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className={`p-2 rounded-lg border ${isEditMode
              ? 'bg-amber-500/20 text-amber-400 border-amber-500/30'
              : 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30'
              }`}>
              {isEditMode ? <Pencil className="w-5 h-5" /> : <Save className="w-5 h-5" />}
            </div>
            <div>
              <h3 className="font-bold text-slate-100 text-sm">
                {isEditMode ? 'Edit Template Query' : 'Simpan Template Query Influx'}
              </h3>
              <p className="text-xs text-slate-400">
                {isEditMode
                  ? 'Perbarui rincian atau parameter query template ini'
                  : 'Template tersimpan di database dan dapat dipanggil kapan saja'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white cursor-pointer"
          >
            ✕
          </button>
        </div>

        <div className="space-y-3 text-xs">
          {/* Template Name */}
          <div>
            <label className="block font-semibold text-slate-300 mb-1">
              Nama Template: <span className="text-rose-400">*</span>
            </label>
            <input
              type="text"
              placeholder="Contoh: Suhu Kursi & Kelembaban 1 Jam"
              value={templateForm.name}
              onChange={(e) => setTemplateForm({ ...templateForm, name: e.target.value })}
              className="w-full bg-slate-950 text-slate-200 p-2 rounded-lg border border-slate-800 text-xs focus:outline-none focus:border-emerald-500 font-medium"
            />
          </div>

          {/* Category */}
          <div>
            <label className="block font-semibold text-slate-300 mb-1">
              Kategori Template:
            </label>
            <select
              value={templateForm.category}
              onChange={(e) => setTemplateForm({ ...templateForm, category: e.target.value })}
              className="w-full bg-slate-950 text-slate-200 p-2 rounded-lg border border-slate-800 text-xs focus:outline-none focus:border-emerald-500 font-medium cursor-pointer"
            >
              <option value="Sensor Hardware">Sensor Hardware</option>
              <option value="Kelistrikan">Kelistrikan (Power Monitoring)</option>
              <option value="Sistem & Heartbeat">Sistem & Heartbeat</option>
              <option value="Air Conditioning">Air Conditioning (AC)</option>
              <option value="Audio & Soundscape">Audio & Soundscape</option>
              <option value="Kustom Pengguna">Kustom Pengguna</option>
            </select>
          </div>

          {/* Description */}
          <div>
            <label className="block font-semibold text-slate-300 mb-1">
              Deskripsi (Opsional):
            </label>
            <textarea
              rows={2}
              placeholder="Catatan mengenai fungsi atau tujuan query ini..."
              value={templateForm.description}
              onChange={(e) => setTemplateForm({ ...templateForm, description: e.target.value })}
              className="w-full bg-slate-950 text-slate-200 p-2 rounded-lg border border-slate-800 text-xs focus:outline-none focus:border-emerald-500"
            />
          </div>

          {/* Sync query helper in Edit mode */}
          {isEditMode && (
            <div className="p-2.5 bg-slate-950/80 border border-slate-800 rounded-lg flex items-center justify-between gap-2">
              <div className="text-[11px] text-slate-400">
                Perbarui query dengan filter yang sedang aktif saat ini?
              </div>
              <button
                type="button"
                onClick={handleSyncCurrentQueryToTemplate}
                className="px-2.5 py-1 bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 rounded-md text-[11px] font-medium transition flex items-center gap-1 flex-shrink-0 cursor-pointer"
                title="Timpa parameter template dengan filter yang sedang aktif di halaman"
              >
                <RefreshCw className="w-3 h-3" />
                <span>Sinkronkan Query</span>
              </button>
            </div>
          )}

          {/* Query Parameters Preview */}
          <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 space-y-1.5 text-[11px]">
            <span className="font-semibold text-slate-400 block mb-1">
              Parameter Yang Disimpan:
            </span>
            {templateForm.isRawFlux ? (
              <div className="space-y-1.5">
                <span className="text-amber-300 font-mono text-[10px]">
                  Mode: Raw Flux Query
                </span>
                <textarea
                  rows={3}
                  value={templateForm.rawFluxQuery || ''}
                  onChange={(e) => setTemplateForm({ ...templateForm, rawFluxQuery: e.target.value })}
                  placeholder="from(bucket: ...)"
                  className="w-full bg-slate-900 text-emerald-300 font-mono text-[10px] p-2 rounded border border-slate-800 focus:outline-none focus:border-emerald-500"
                />
              </div>
            ) : (
              <div className="space-y-1 font-mono text-slate-300">
                <div>Bucket: <span className="text-emerald-400">{templateForm.config?.bucket || selectedBucket}</span></div>
                <div>Measurement: <span className="text-cyan-400">{templateForm.config?.measurements && Array.isArray(templateForm.config.measurements) ? templateForm.config.measurements.join(', ') : (templateForm.config?.measurement || selectedMeasurements.join(', '))}</span></div>
                <div>Field: <span className="text-teal-300">{templateForm.config?.fields && Array.isArray(templateForm.config.fields) ? templateForm.config.fields.join(', ') : (templateForm.config?.field || selectedFields.join(', '))}</span></div>
                <div>Window: <span>{templateForm.config?.aggregation || aggregationInterval} ({templateForm.config?.aggFn || aggregationFn})</span></div>
                <div>Time Range: <span>{templateForm.config?.timeRange || timeRangePreset}</span></div>
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-medium transition cursor-pointer"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={handleSaveTemplate}
            disabled={templateSaving || !templateForm.name.trim()}
            className={`px-4 py-2 text-white font-semibold text-xs rounded-lg shadow-lg flex items-center gap-1.5 transition cursor-pointer disabled:opacity-50 ${isEditMode
              ? 'bg-gradient-to-r from-amber-600 to-yellow-600 hover:from-amber-500 hover:to-yellow-500 shadow-amber-600/20'
              : 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 shadow-emerald-600/20'
              }`}
          >
            {templateSaving ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>{isEditMode ? 'Menyimpan Perubahan...' : 'Menyimpan...'}</span>
              </>
            ) : (
              <>
                {isEditMode ? <Check className="w-3.5 h-3.5" /> : <Save className="w-3.5 h-3.5" />}
                <span>{isEditMode ? 'Simpan Perubahan' : 'Simpan Template'}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
