import React from 'react';
import { FileCode, Copy, Check, X } from 'lucide-react';

export default function PodLogsJsonPreviewModal({
  selectedJsonRow,
  onClose,
  isCopiedJson,
  onCopyJson
}) {
  if (!selectedJsonRow) return null;

  return (
    <div className="fixed inset-0 z-[1200] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-950 border border-slate-800 rounded-2xl w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Modal Header */}
        <div className="bg-slate-900/90 border-b border-slate-800 px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <FileCode size={16} className="text-indigo-400 shrink-0" />
            <h3 className="text-xs font-mono font-bold text-white truncate">
              Log ID: {selectedJsonRow.id}
            </h3>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onCopyJson}
              className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-semibold flex items-center gap-1 border border-slate-700 cursor-pointer"
            >
              {isCopiedJson ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
              <span>{isCopiedJson ? 'Tersalin' : 'Copy JSON'}</span>
            </button>
            <button
              onClick={onClose}
              className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 cursor-pointer"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Modal Content */}
        <div className="p-4 overflow-y-auto flex flex-col gap-3 font-mono text-xs">
          <div className="grid grid-cols-2 gap-2 text-[11px] bg-slate-900/60 p-2.5 rounded-xl border border-slate-800">
            <div>
              <span className="text-slate-500">Activity Type:</span>{' '}
              <span className="text-purple-300 font-bold">{selectedJsonRow.activity_type}</span>
            </div>
            <div>
              <span className="text-slate-500">Value:</span>{' '}
              <span className="text-white font-bold">{selectedJsonRow.value}</span>
            </div>
            <div>
              <span className="text-slate-500">Code:</span>{' '}
              <span className="text-cyan-300">{selectedJsonRow.code}</span>
            </div>
            <div>
              <span className="text-slate-500">Waktu:</span>{' '}
              <span className="text-slate-300">{new Date(selectedJsonRow.created_at).toLocaleString('id-ID')}</span>
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <span className="text-[11px] text-slate-400 font-semibold">Isi Kolom `data` (JSON Payload):</span>
            <pre className="p-3 bg-[#090d16] border border-slate-800 rounded-xl text-emerald-300 text-[11.5px] leading-relaxed overflow-x-auto whitespace-pre-wrap select-text">
              {(() => {
                try {
                  const parsed = JSON.parse(selectedJsonRow.data);
                  return JSON.stringify(parsed, null, 2);
                } catch (_) {
                  return selectedJsonRow.data || '(Kosong)';
                }
              })()}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
}
