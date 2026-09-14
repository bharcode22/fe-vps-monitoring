import React from 'react';
import { Trash2, RefreshCw } from 'lucide-react';

/**
 * InfluxDeleteTemplateModal Component
 * Confirmation modal when deleting a query template.
 */
export default function InfluxDeleteTemplateModal({
  deleteTargetTemplate,
  onClose,
  handleConfirmDeleteTemplate,
  templateDeleting
}) {
  if (!deleteTargetTemplate) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-start gap-3">
          <div className="p-3 bg-rose-500/20 text-rose-400 rounded-xl border border-rose-500/30 flex-shrink-0">
            <Trash2 className="w-6 h-6" />
          </div>
          <div className="space-y-1 flex-1">
            <h3 className="font-bold text-slate-100 text-base">
              Hapus Template Query?
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Apakah Anda yakin ingin menghapus template <strong className="text-rose-300">"{deleteTargetTemplate.name}"</strong>? Template ini tidak akan tersedia lagi.
            </p>
          </div>
        </div>

        <div className="p-3 bg-slate-950 rounded-lg border border-slate-800/80 text-xs text-slate-400">
          <span className="text-amber-400 font-semibold">Catatan:</span> Data di InfluxDB tidak akan terpengaruh sama sekali. Tindakan ini hanya menghapus bookmark template query dari database.
        </div>

        <div className="pt-2 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={templateDeleting}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-medium transition cursor-pointer disabled:opacity-50"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={handleConfirmDeleteTemplate}
            disabled={templateDeleting}
            className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-xs font-semibold shadow-lg shadow-rose-600/20 flex items-center gap-1.5 transition cursor-pointer disabled:opacity-50"
          >
            {templateDeleting ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>Menghapus...</span>
              </>
            ) : (
              <>
                <Trash2 className="w-3.5 h-3.5" />
                <span>Hapus Template</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
