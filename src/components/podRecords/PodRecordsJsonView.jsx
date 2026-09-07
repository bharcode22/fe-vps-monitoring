import React from 'react';
import {
  FileCode,
  Copy,
  Check,
  FolderOpen,
  ArrowLeft
} from 'lucide-react';

export default function PodRecordsJsonView({
  rawJsonString,
  jsonFilterQuery,
  onCopyJson,
  copySuccess,
  fileName,
  onBackToFiles
}) {
  const lines = rawJsonString ? rawJsonString.split('\n') : [];

  return (
    <div className="bg-slate-950 rounded-2xl border border-slate-800 shadow-2xl overflow-hidden">
      {/* Code Editor Header */}
      <div className="px-4 py-2.5 bg-slate-900 border-b border-slate-800 flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-3">
          {onBackToFiles && (
            <button
              onClick={onBackToFiles}
              className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-cyan-300 hover:text-white border border-slate-700 text-[11px] font-semibold transition-all flex items-center gap-1 cursor-pointer"
              title="Kembali ke daftar berkas fisik"
            >
              <ArrowLeft size={12} />
              <span>Daftar Berkas</span>
            </button>
          )}
          <div className="flex items-center gap-1.5 mr-1">
            <div className="w-3 h-3 rounded-full bg-rose-500/80" />
            <div className="w-3 h-3 rounded-full bg-amber-500/80" />
            <div className="w-3 h-3 rounded-full bg-emerald-500/80" />
          </div>
          <span className="text-xs font-mono text-slate-300 font-bold flex items-center gap-1.5">
            <FileCode size={14} className="text-cyan-400" />
            <span>{fileName || 'payload.json'}</span>
            <span className="text-slate-500 font-normal font-sans">({lines.length} baris)</span>
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onCopyJson}
            className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 text-[11px] font-semibold transition-all flex items-center gap-1 cursor-pointer"
          >
            {copySuccess ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
            <span>{copySuccess ? 'Tersalin' : 'Salin Kode'}</span>
          </button>
        </div>
      </div>

      {/* Code Viewer Body */}
      <div className="p-4 max-h-[600px] overflow-y-auto overflow-x-auto custom-scrollbar font-mono text-xs leading-relaxed">
        <table className="w-full border-collapse">
          <tbody>
            {lines.map((line, idx) => {
              const lineNum = idx + 1;
              const matchesSearch =
                jsonFilterQuery && line.toLowerCase().includes(jsonFilterQuery.toLowerCase());

              return (
                <tr
                  key={idx}
                  className={`hover:bg-slate-900/60 transition-colors ${
                    matchesSearch ? 'bg-cyan-500/15 text-cyan-200' : ''
                  }`}
                >
                  <td className="w-12 text-right pr-4 text-slate-600 select-none text-[11px] font-mono align-top py-0.5">
                    {lineNum}
                  </td>
                  <td className="text-slate-300 font-mono whitespace-pre py-0.5">
                    {line}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
