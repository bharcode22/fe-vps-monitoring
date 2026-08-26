import React, { useState } from 'react';
import { Trash2, AlertTriangle, X, Link2, Server, Database, Loader2, Key } from 'lucide-react';

export default function DeleteRowConfirmationModal({
  isOpen,
  onClose,
  targetType, // 'master' | 'pod'
  targetName, // e.g. 'AWS Master Prod' or 'POD 31'
  serverHost, // e.g. '10.20.10.31'
  tableName,
  pkColumn = 'id',
  pkValue,
  pkValues = [],
  isDeleting,
  onConfirmDelete,
  onConfirm
}) {
  const [cascade, setCascade] = useState(true);

  if (!isOpen) return null;

  const valuesList = Array.isArray(pkValues) && pkValues.length > 0 ? pkValues : (pkValue !== undefined ? [pkValue] : []);
  const isBulk = valuesList.length > 1;

  const handleConfirm = () => {
    const confirmFn = onConfirmDelete || onConfirm;
    if (typeof confirmFn === 'function') {
      confirmFn({
        cascade,
        pkValues: valuesList
      });
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-slate-950 border border-red-500/40 rounded-3xl p-6 max-w-lg w-full shadow-2xl flex flex-col gap-4">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <span className="p-2 rounded-xl bg-red-500/15 text-red-400 border border-red-500/30">
              <Trash2 size={16} />
            </span>
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <span>Hard Delete {isBulk ? `${valuesList.length} Baris Data` : 'Baris Data'}</span>
                <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border ${targetType === 'master'
                  ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30'
                  : 'bg-purple-500/20 text-purple-300 border-purple-500/30'
                  }`}>
                  {targetType === 'master' ? 'Master DB' : 'Unit POD'}
                </span>
              </h3>
              <p className="text-[11px] text-slate-400">
                Target: <strong className="text-white font-mono">{targetName}</strong> {serverHost ? `(${serverHost})` : ''}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isDeleting}
            className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white cursor-pointer transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Description & Target Location Info */}
        <div className="bg-slate-900/90 p-4 rounded-2xl border border-slate-800 flex flex-col gap-3 text-xs">
          {/* Location & Table Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 font-mono pb-2 border-b border-slate-800/60">
            <div className="flex items-center gap-2">
              {targetType === 'master' ? (
                <Database size={15} className="text-cyan-400 shrink-0" />
              ) : (
                <Server size={15} className="text-purple-400 shrink-0" />
              )}
              <div>
                <span className="text-[10px] text-slate-400 block font-sans">Lokasi Database:</span>
                <strong className="text-white text-xs">{targetName}</strong>
                {serverHost && <span className="text-[10px] text-slate-500 block font-mono">IP: {serverHost}</span>}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Key size={15} className="text-amber-400 shrink-0" />
              <div>
                <span className="text-[10px] text-slate-400 block font-sans">Tabel & Kunci:</span>
                <strong className="text-cyan-300 text-xs">public.{tableName}</strong>
                <span className="text-[10px] text-slate-400 block font-mono">PK: {pkColumn}</span>
              </div>
            </div>
          </div>

          {/* Batch IDs List (Scrollable Chips) */}
          <div>
            <div className="flex items-center justify-between mb-1.5 font-sans">
              <span className="text-slate-400 font-semibold text-[11px]">
                Daftar ID Baris yang Akan Dihapus ({valuesList.length} Item):
              </span>
              <span className="text-[10px] font-mono text-amber-400 font-bold bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                {valuesList.length} Baris Terpilih
              </span>
            </div>

            <div className="max-h-28 overflow-y-auto p-2 bg-slate-950/80 rounded-xl border border-slate-800/80 flex flex-wrap gap-1.5 shadow-inner">
              {valuesList.map((val, idx) => (
                <span
                  key={idx}
                  className="inline-flex items-center px-2 py-1 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-300 font-mono text-[11px] font-bold transition-colors"
                  title={`ID: ${val}`}
                >
                  {String(val)}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Cascade Option Checkbox */}
        <label className="p-3 bg-purple-500/10 border border-purple-500/30 rounded-2xl flex items-center justify-between gap-3 cursor-pointer hover:bg-purple-500/15 transition-colors">
          <div className="flex items-center gap-2.5">
            <Link2 size={16} className="text-purple-400 shrink-0" />
            <div>
              <div className="text-xs font-bold text-purple-200">Hapus Data Relasi Terkait (Cascade)</div>
              <div className="text-[11px] text-slate-400">Hapus juga baris di tabel anak yang memiliki Foreign Key ke data ini</div>
            </div>
          </div>
          <input
            type="checkbox"
            checked={cascade}
            onChange={(e) => setCascade(e.target.checked)}
            className="w-4 h-4 rounded text-purple-600 focus:ring-purple-500 bg-slate-900 border-slate-700 cursor-pointer"
          />
        </label>

        {/* Master Fleet-Wide Propagation Notice */}
        {targetType === 'master' && (
          <div className="p-3 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-xs flex items-start gap-2.5">
            <Database size={16} className="text-cyan-400 shrink-0 mt-0.5" />
            <span>
              <strong>Sinkronisasi Armada:</strong> Penghapusan dari Master Database otomatis membersihkan baris data ber-ID ini di Master dan di seluruh unit database POD armada secara permanen agar data tidak kembali saat reload.
            </span>
          </div>
        )}

        {/* High Risk Warning */}
        <div className="p-3 bg-red-500/15 border border-red-500/30 rounded-xl text-red-300 text-xs flex items-start gap-2">
          <AlertTriangle size={16} className="shrink-0 mt-0.5 text-red-400" />
          <span>
            <strong>Perhatian:</strong> Data akan dihapus permanen secara fisik dari disk PostgreSQL (Hard Delete) dan tidak dapat di-undo.
          </span>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-800">
          <button
            onClick={onClose}
            disabled={isDeleting}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold cursor-pointer transition-colors"
          >
            Batal
          </button>
          <button
            onClick={handleConfirm}
            disabled={isDeleting}
            className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white font-extrabold rounded-xl text-xs flex items-center gap-1.5 cursor-pointer shadow-lg shadow-red-600/30 disabled:opacity-50 transition-all hover:scale-105"
          >
            {isDeleting ? (
              <>
                <Loader2 size={14} className="animate-spin text-white" />
                <span>Memproses Hard Delete...</span>
              </>
            ) : (
              <>
                <Trash2 size={14} />
                <span>Ya, Hard Delete ({valuesList.length})</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
