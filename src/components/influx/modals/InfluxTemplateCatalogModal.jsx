import React from 'react';
import {
  FolderOpen,
  Search,
  RefreshCw,
  Sliders,
  Play,
  Pencil,
  Trash2,
  Plus
} from 'lucide-react';
import { templateCategories } from '../influxConstants';

/**
 * InfluxTemplateCatalogModal Component
 * Displays the catalog of saved InfluxDB query templates with category filtering,
 * search, quick application, direct run, editing, and deletion.
 */
export default function InfluxTemplateCatalogModal({
  isOpen,
  onClose,
  templatesLoading,
  filteredTemplates,
  templateCategoryFilter,
  setTemplateCategoryFilter,
  templateSearchTerm,
  setTemplateSearchTerm,
  handleApplyTemplate,
  handleOpenEditTemplate,
  setDeleteTargetTemplate,
  handleOpenCreateTemplate
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-3xl w-full p-6 shadow-2xl space-y-4 max-h-[90vh] flex flex-col">
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800 flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-lg border border-emerald-500/30">
              <FolderOpen className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-slate-100 text-sm md:text-base">
                  Katalog Template Query Influx
                </h3>
                <span className="px-2 py-0.5 text-[10px] font-semibold bg-emerald-500/15 text-emerald-300 rounded-full border border-emerald-500/30">
                  INFLUX PUSAT
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Template query tersimpan dapat diterapkan atau langsung dieksekusi untuk memfilter data.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Search & Category Filter Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 flex-shrink-0">
          <div className="relative flex-1">
            <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-slate-500" />
            <input
              type="text"
              placeholder="Cari template query..."
              value={templateSearchTerm}
              onChange={(e) => setTemplateSearchTerm(e.target.value)}
              className="w-full bg-slate-950 text-slate-200 pl-9 pr-3 py-2 rounded-lg border border-slate-800 text-xs focus:outline-none focus:border-emerald-500 font-medium"
            />
          </div>

          {/* Category Filter Chips */}
          <div
            className="flex items-center gap-1.5 overflow-x-auto py-1 scrollbar-none no-scrollbar"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
            onWheel={(e) => {
              if (e.deltaY !== 0) {
                e.currentTarget.scrollLeft += e.deltaY;
              }
            }}
          >
            {templateCategories.map(cat => (
              <button
                key={cat}
                type="button"
                onClick={() => setTemplateCategoryFilter(cat)}
                className={`px-2.5 py-1.5 rounded-md text-[11px] font-semibold whitespace-nowrap transition border cursor-pointer ${templateCategoryFilter === cat
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                  : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-slate-200'
                  }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Template Cards List */}
        <div className="overflow-y-auto space-y-3 flex-1 pr-1 scrollbar-thin">
          {templatesLoading ? (
            <div className="py-12 text-center text-xs text-slate-500 flex items-center justify-center gap-2">
              <RefreshCw className="w-4 h-4 animate-spin text-emerald-400" />
              <span>Memuat daftar template...</span>
            </div>
          ) : filteredTemplates.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-500 space-y-2">
              <p>Tidak ada template ditemukan untuk filter ini.</p>
              <button
                onClick={() => {
                  onClose();
                  handleOpenCreateTemplate();
                }}
                className="text-emerald-400 hover:underline font-semibold text-xs cursor-pointer"
              >
                + Simpan query aktif Anda sebagai template baru
              </button>
            </div>
          ) : (
            filteredTemplates.map(tmpl => {
              const cfg = tmpl.config || {};
              return (
                <div
                  key={tmpl.id}
                  className="p-4 bg-slate-950/80 border border-slate-800/90 hover:border-emerald-500/40 rounded-xl transition space-y-2.5 group"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-slate-100 text-xs md:text-sm group-hover:text-emerald-300 transition">
                        {tmpl.name}
                      </span>
                      <span className="px-2 py-0.5 text-[10px] font-medium rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                        {tmpl.category || 'General'}
                      </span>
                      {tmpl.is_raw_flux ? (
                        <span className="px-2 py-0.5 text-[10px] font-medium rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30">
                          Raw Flux
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 text-[10px] font-medium rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                          Visual Filter
                        </span>
                      )}
                    </div>

                    {/* Action Buttons: Apply, Apply&Run, Edit, Delete */}
                    <div className="flex items-center gap-1.5 self-end sm:self-auto">
                      <button
                        type="button"
                        onClick={() => handleApplyTemplate(tmpl, false)}
                        className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg text-xs font-medium transition flex items-center gap-1 cursor-pointer"
                        title="Terapkan konfigurasi ke form query"
                      >
                        <Sliders className="w-3 h-3 text-emerald-400" />
                        <span>Terapkan</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleApplyTemplate(tmpl, true)}
                        className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold shadow-md shadow-emerald-600/20 transition flex items-center gap-1 cursor-pointer"
                        title="Terapkan dan langsung eksekusi query"
                      >
                        <Play className="w-3 h-3 fill-white" />
                        <span>Terapkan & Jalankan</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleOpenEditTemplate(tmpl)}
                        className="p-1.5 text-slate-400 hover:text-amber-300 hover:bg-amber-500/10 rounded-lg border border-transparent hover:border-amber-500/30 transition cursor-pointer"
                        title="Edit rincian template ini"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleteTargetTemplate({ id: tmpl.id, name: tmpl.name })}
                        className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg border border-transparent hover:border-rose-500/30 transition cursor-pointer"
                        title="Hapus template ini dari database"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {tmpl.description && (
                    <p className="text-xs text-slate-400 leading-relaxed">
                      {tmpl.description}
                    </p>
                  )}

                  {/* Config summary pills */}
                  {!tmpl.is_raw_flux && (
                    <div className="flex items-center gap-2 flex-wrap text-[11px] font-mono text-slate-400 pt-1">
                      <span className="px-2 py-0.5 bg-slate-900 rounded border border-slate-800 text-slate-300">
                        Bucket: <strong className="text-emerald-400 font-normal">{cfg.bucket || 'pod_monitoring'}</strong>
                      </span>
                      <span className="px-2 py-0.5 bg-slate-900 rounded border border-slate-800 text-slate-300">
                        Measurement: <strong className="text-cyan-400 font-normal">{cfg.measurements && Array.isArray(cfg.measurements) ? cfg.measurements.join(', ') : (cfg.measurement || '-')}</strong>
                      </span>
                      <span className="px-2 py-0.5 bg-slate-900 rounded border border-slate-800 text-slate-300">
                        Field: <strong className="text-teal-300 font-normal">{cfg.fields && Array.isArray(cfg.fields) ? cfg.fields.join(', ') : (cfg.field || '-')}</strong>
                      </span>
                      <span className="px-2 py-0.5 bg-slate-900 rounded border border-slate-800 text-slate-400">
                        Window: {cfg.aggregation !== 'none' ? `${cfg.aggregation} (${cfg.aggFn || 'mean'})` : 'Raw'}
                      </span>
                      <span className="px-2 py-0.5 bg-slate-900 rounded border border-slate-800 text-slate-400">
                        Range: {cfg.timeRange || '-1h'}
                      </span>
                    </div>
                  )}

                  {tmpl.is_raw_flux && tmpl.raw_flux_query && (
                    <pre className="p-2 bg-slate-900 text-emerald-300 rounded font-mono text-[10px] overflow-x-auto border border-slate-800 max-h-16">
                      {tmpl.raw_flux_query}
                    </pre>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Modal Footer */}
        <div className="pt-3 border-t border-slate-800 flex items-center justify-between flex-shrink-0">
          <button
            type="button"
            onClick={() => {
              onClose();
              handleOpenCreateTemplate();
            }}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-medium transition cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5 text-emerald-400" />
            <span>Simpan Query Aktif Jadi Template</span>
          </button>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-medium transition cursor-pointer"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
}
