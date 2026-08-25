import React from 'react';
import { Trash2, AlertTriangle, X } from 'lucide-react';

export default function DeleteRowConfirmationModal({
  isOpen,
  onClose,
  targetType, // 'master' | 'pod'
  targetName, // e.g. 'AWS Master Prod' or 'POD 31'
  tableName,
  pkColumn,
  pkValue,
  isDeleting,
  onConfirmDelete
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-950 border border-red-500/40 rounded-3xl p-6 max-w-md w-full shadow-2xl flex flex-col gap-4">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-red-500/15 text-red-400 border border-red-500/30">
              <Trash2 size={16} />
            </span>
            <h3 className="text-sm font-bold text-white">
              Hapus Data {targetType === 'master' ? 'Master' : 'POD'} Secara Manual
            </h3>
          </div>
          <button
            onClick={onClose}
            disabled={isDeleting}
            className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        {/* Description & Target Info */}
        <p className="text-xs text-slate-300">
          Apakah Anda yakin ingin menghapus baris data ini dari database <strong>{targetName}</strong>?
        </p>

        <div className="bg-slate-900/80 p-3.5 rounded-2xl border border-slate-800 flex flex-col gap-2 text-xs font-mono">
          <div className="flex items-center justify-between">
            <span className="text-slate-400 font-sans">Target Database:</span>
            <span className="font-bold text-white">{targetName}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-400 font-sans">Tabel:</span>
            <span className="text-cyan-300">public.{tableName}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-400 font-sans">Kunci Identifikasi ({pkColumn}):</span>
            <span className="text-amber-400 font-bold bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
              {String(pkValue)}
            </span>
          </div>
        </div>

        {/* High Risk Warning */}
        <div className="p-3 bg-red-500/15 border border-red-500/30 rounded-xl text-red-300 text-xs flex items-start gap-2">
          <AlertTriangle size={16} className="shrink-0 mt-0.5" />
          <span>
            {targetType === 'master'
              ? 'Perhatian: Menghapus data acuan di Master dapat mempengaruhi konsistensi saat sinkronisasi ke seluruh POD!'
              : 'Tindakan ini akan menghapus baris data secara permanen pada database unit POD ini.'}
          </span>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-800">
          <button
            onClick={onClose}
            disabled={isDeleting}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold cursor-pointer"
          >
            Batal
          </button>
          <button
            onClick={onConfirmDelete}
            disabled={isDeleting}
            className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white font-extrabold rounded-xl text-xs flex items-center gap-1.5 cursor-pointer shadow-lg shadow-red-600/30 disabled:opacity-50 transition-all hover:scale-105"
          >
            <Trash2 size={14} className={isDeleting ? 'animate-spin' : ''} />
            <span>{isDeleting ? 'Menghapus...' : 'Ya, Hapus Data Ini'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
