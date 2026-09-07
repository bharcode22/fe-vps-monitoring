import React, { useState, useMemo } from 'react';
import {
  FileCode,
  FolderOpen,
  ArrowLeft,
  Download,
  AlignLeft,
  Braces
} from 'lucide-react';

export default function PodRecordsJsonView({
  rawJsonString,
  jsonFilterQuery,
  fileName,
  fileMeta = null,
  isLoading = false,
  onBackToFiles,
  onDownloadFile
}) {
  const [viewFormat, setViewFormat] = useState('raw'); // 'raw' | 'pretty'

  // Compute lines based on viewFormat
  const displayLines = useMemo(() => {
    if (!rawJsonString) return [];

    if (viewFormat === 'pretty') {
      try {
        // 1. Try parsing as single JSON object/array
        const parsed = JSON.parse(rawJsonString);
        return JSON.stringify(parsed, null, 2).split('\n');
      } catch (_) {
        // 2. Try parsing as JSONL (line-by-line JSON)
        const rawLines = rawJsonString.split('\n');
        const parsedArray = [];
        let isJsonl = true;

        for (const l of rawLines) {
          const trimmed = l.trim();
          if (!trimmed) continue;
          try {
            parsedArray.push(JSON.parse(trimmed));
          } catch (_) {
            isJsonl = false;
            break;
          }
        }

        if (isJsonl && parsedArray.length > 0) {
          return JSON.stringify(parsedArray, null, 2).split('\n');
        }
      }
    }

    return rawJsonString.split('\n');
  }, [rawJsonString, viewFormat]);

  return (
    <div className="bg-slate-950 rounded-2xl border border-slate-800 shadow-2xl overflow-hidden flex flex-col min-h-[480px]">
      {/* Code Editor Header */}
      <div className="px-4 py-2.5 bg-slate-900 border-b border-slate-800 flex items-center justify-between flex-wrap gap-2.5 shrink-0">
        <div className="flex items-center gap-3 flex-wrap">
          {onBackToFiles && (
            <button
              onClick={onBackToFiles}
              className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-cyan-300 hover:text-white border border-slate-700 text-[11px] font-semibold transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
              title="Kembali ke daftar berkas di folder"
            >
              <ArrowLeft size={13} />
              <span>Daftar Berkas</span>
            </button>
          )}

          {/* Traffic light indicator */}
          <div className="flex items-center gap-1.5 mr-0.5">
            <div className="w-2.5 h-2.5 rounded-full bg-rose-500/80" />
            <div className="w-2.5 h-2.5 rounded-full bg-amber-500/80" />
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/80" />
          </div>

          {/* Active File Name & Badges */}
          <span className="text-xs font-mono text-slate-300 font-bold flex items-center gap-2 flex-wrap">
            <FileCode size={15} className="text-cyan-400" />
            <span className="text-cyan-200">{fileName || 'Pilih Berkas'}</span>
            {displayLines.length > 0 && (
              <span className="text-slate-400 font-normal font-sans text-[11px] bg-slate-800 px-2 py-0.5 rounded-md border border-slate-700/60">
                {displayLines.length} baris {viewFormat === 'pretty' ? '(terformat)' : '(asli)'}
              </span>
            )}
            {fileMeta?.sizeFormatted && (
              <span className="text-slate-400 font-normal font-sans text-[11px] bg-slate-800 px-2 py-0.5 rounded-md border border-slate-700/60">
                {fileMeta.sizeFormatted}
              </span>
            )}
          </span>
        </div>

        {/* Action Controls: Format toggle, Download, Copy */}
        <div className="flex items-center gap-2 flex-wrap">
          {rawJsonString && (
            <>
              {/* Format Toggle (Raw vs Pretty) */}
              <div className="flex items-center bg-slate-950 p-0.5 rounded-lg border border-slate-800">
                <button
                  onClick={() => setViewFormat('raw')}
                  className={`px-2 py-0.5 rounded text-[10px] font-semibold transition-all cursor-pointer flex items-center gap-1 ${
                    viewFormat === 'raw'
                      ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                  title="Tampilan baris file asli (Raw JSONL)"
                >
                  <AlignLeft size={11} />
                  <span>Raw Baris</span>
                </button>
                <button
                  onClick={() => setViewFormat('pretty')}
                  className={`px-2 py-0.5 rounded text-[10px] font-semibold transition-all cursor-pointer flex items-center gap-1 ${
                    viewFormat === 'pretty'
                      ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                  title="Format indentasi JSON terstruktur"
                >
                  <Braces size={11} />
                  <span>Format Rapi</span>
                </button>
              </div>

              {/* Download Active File */}
              {onDownloadFile && (
                <button
                  onClick={onDownloadFile}
                  className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 text-[11px] font-semibold transition-all flex items-center gap-1 cursor-pointer"
                  title="Unduh berkas ini"
                >
                  <Download size={12} />
                  <span>Unduh</span>
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {/* Code Viewer Body */}
      {isLoading ? (
        <div className="flex-1 min-h-[380px] p-16 text-center flex flex-col items-center justify-center gap-3 text-slate-400">
          <div className="w-7 h-7 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
          <span className="text-xs font-mono text-cyan-300">Membaca isi berkas {fileName}...</span>
        </div>
      ) : !rawJsonString ? (
        <div className="flex-1 min-h-[380px] p-16 text-center flex flex-col items-center justify-center gap-3">
          <div className="p-3.5 rounded-2xl bg-slate-900 text-cyan-400 border border-slate-800 shadow-inner">
            <FileCode size={32} />
          </div>
          <div className="space-y-1">
            <h4 className="text-sm font-bold text-white">Belum Ada Berkas yang Dipilih</h4>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              Silakan klik salah satu berkas di daftar folder untuk membaca isinya di sini.
            </p>
          </div>
          {onBackToFiles && (
            <button
              onClick={onBackToFiles}
              className="mt-2 px-3.5 py-1.5 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-sm"
            >
              <FolderOpen size={14} />
              <span>Buka Daftar Berkas</span>
            </button>
          )}
        </div>
      ) : (
        <div className="p-4 max-h-[640px] overflow-y-auto overflow-x-auto custom-scrollbar font-mono text-xs leading-relaxed">
          <table className="w-full border-collapse">
            <tbody>
              {displayLines.map((line, idx) => {
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
      )}
    </div>
  );
}

