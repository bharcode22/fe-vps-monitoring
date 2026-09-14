import React from 'react';
import {
  AlignLeft,
  Braces,
  Check,
  Copy,
  Download
} from 'lucide-react';

/**
 * PodHbJsonViewerTab
 * Renders formatted/raw JSON inspection view with line numbers,
 * multi-line range copying (line X to Y), single line click-to-copy,
 * format toggles (Raw JSONL vs Indented Pretty), scope switcher (Ticks / Incidents / Full / Payload),
 * and direct file download (.json or .jsonl).
 */
export default function PodHbJsonViewerTab({
  jsonFormat,
  setJsonFormat,
  jsonScope,
  setJsonScope,
  displayLines,
  rangeStart,
  setRangeStart,
  rangeEnd,
  setRangeEnd,
  handleCopyLineRange,
  copiedRangeSuccess,
  copiedLineIdx,
  handleCopySingleLine,
  handleCopyJsonTab,
  copiedJsonTab,
  handleDownloadJson,
  filteredTicksCount = 0,
  incidentTicksCount = 0
}) {
  return (
    <div className="space-y-3">
      {/* Top Controls Bar: Format Switcher, Scope Switcher, Copy All, Download */}
      <div className="p-3 rounded-2xl bg-slate-950/80 border border-slate-800 flex flex-wrap items-center justify-between gap-3">
        {/* Left: Format & Scope Switchers */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Format Switcher */}
          <div className="flex items-center bg-slate-900 p-1 rounded-xl border border-slate-800 text-xs font-semibold">
            <button
              onClick={() => setJsonFormat('raw')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg transition cursor-pointer ${jsonFormat === 'raw'
                ? 'bg-cyan-600 text-white shadow-md shadow-cyan-600/30 font-bold'
                : 'text-slate-400 hover:text-white'
                }`}
              title="Raw JSON: 1 baris per objek (format JSONL)"
            >
              <AlignLeft size={12} />
              <span>Raw JSON</span>
            </button>
            <button
              onClick={() => setJsonFormat('pretty')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg transition cursor-pointer ${jsonFormat === 'pretty'
                ? 'bg-cyan-600 text-white shadow-md shadow-cyan-600/30 font-bold'
                : 'text-slate-400 hover:text-white'
                }`}
              title="Format Rapi dengan indentasi bertingkat"
            >
              <Braces size={12} />
              <span>Format Rapi</span>
            </button>
          </div>

          {/* Scope Switcher */}
          <div className="flex items-center bg-slate-900 p-1 rounded-xl border border-slate-800 text-xs font-semibold">
            <button
              onClick={() => setJsonScope('ticks')}
              className={`px-2.5 py-1 rounded-lg transition cursor-pointer ${jsonScope === 'ticks' ? 'bg-slate-800 text-white font-bold' : 'text-slate-400 hover:text-white'}`}
            >
              Ticks ({filteredTicksCount})
            </button>
            <button
              onClick={() => setJsonScope('incidents')}
              className={`px-2.5 py-1 rounded-lg transition cursor-pointer ${jsonScope === 'incidents' ? 'bg-rose-600 text-white font-bold shadow-sm' : 'text-rose-400 hover:text-white'}`}
            >
              Insiden ({incidentTicksCount})
            </button>
            <button
              onClick={() => setJsonScope('full')}
              className={`px-2.5 py-1 rounded-lg transition cursor-pointer ${jsonScope === 'full' ? 'bg-slate-800 text-white font-bold' : 'text-slate-400 hover:text-white'}`}
            >
              Full
            </button>
          </div>
        </div>

        {/* Right: Quick Action Buttons (Copy Tab & Download) */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleCopyJsonTab}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 text-xs font-semibold transition cursor-pointer"
            title="Salin seluruh isi JSON saat ini"
          >
            {copiedJsonTab ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
            <span>{copiedJsonTab ? 'Tersalin' : 'Salin Semua'}</span>
          </button>

          <button
            onClick={handleDownloadJson}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-cyan-300 border border-slate-800 text-xs font-semibold transition cursor-pointer"
            title="Unduh file data"
          >
            <Download size={13} />
            <span>.{jsonFormat === 'raw' && jsonScope !== 'full' ? 'jsonl' : 'json'}</span>
          </button>
        </div>
      </div>

      {/* Metadata & Multi-Line Range Copy Bar */}
      <div className="p-3 rounded-2xl bg-slate-950/80 border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2 flex-wrap text-[11px] text-slate-400">
          <span className="font-mono px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-cyan-300 font-bold">
            {displayLines.length.toLocaleString()} Baris
          </span>
          <span>
            Format: <strong className="text-slate-200">{jsonFormat === 'raw' ? 'Raw JSON (1 Baris per Paket / JSONL)' : 'Pretty JSON (Indented)'}</strong>
          </span>
          <span className="text-slate-500">•</span>
          <span className="text-slate-400">
            Cakupan: <strong className="text-slate-300">{jsonScope === 'full' ? 'Full Analysis Payload' : jsonScope === 'payload' ? 'MQTT Raw Payloads' : jsonScope === 'incidents' ? 'Incident Ticks' : 'Ticks Stream'}</strong>
          </span>
          <span className="text-slate-500">•</span>
          <span className="text-emerald-400 font-medium">
            Tip: Blok teks dengan kursor untuk salin sebagian baris
          </span>
        </div>

        {/* Multi-Line Range Copy Controls */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[11px] font-bold text-slate-400">Salin Rentang:</span>
          <div className="flex items-center gap-1 font-mono text-xs">
            <input
              type="number"
              min="1"
              max={displayLines.length || 1}
              value={rangeStart}
              onChange={(e) => setRangeStart(Math.max(1, parseInt(e.target.value) || 1))}
              className="w-14 px-2 py-1 rounded-lg bg-slate-900 border border-slate-700 text-cyan-300 font-bold text-center focus:outline-none focus:border-cyan-500"
              title="Nomor baris awal"
            />
            <span className="text-slate-500">s/d</span>
            <input
              type="number"
              min="1"
              max={displayLines.length || 1}
              value={rangeEnd}
              onChange={(e) => setRangeEnd(Math.max(1, parseInt(e.target.value) || 1))}
              className="w-14 px-2 py-1 rounded-lg bg-slate-900 border border-slate-700 text-cyan-300 font-bold text-center focus:outline-none focus:border-cyan-500"
              title="Nomor baris akhir"
            />
          </div>

          {/* Range Copy Button */}
          <button
            onClick={() => handleCopyLineRange(rangeStart, rangeEnd)}
            className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-cyan-600/20 hover:bg-cyan-600/30 text-cyan-300 border border-cyan-500/40 text-xs font-bold transition shadow-sm cursor-pointer"
            title={`Salin baris ${rangeStart} sampai ${rangeEnd}`}
          >
            {copiedRangeSuccess ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
            <span>{copiedRangeSuccess ? 'Tersalin!' : `Salin (${rangeStart}-${rangeEnd})`}</span>
          </button>

          {/* Quick Presets */}
          <div className="flex items-center gap-1 border-l border-slate-800 pl-2">
            <button
              onClick={() => {
                setRangeStart(1);
                setRangeEnd(Math.min(5, displayLines.length));
                handleCopyLineRange(1, Math.min(5, displayLines.length));
              }}
              className="px-2 py-1 rounded bg-slate-900 hover:bg-slate-800 text-[10px] font-mono text-slate-300 border border-slate-800 transition cursor-pointer"
              title="Salin 5 baris pertama"
            >
              5 Baris
            </button>
            <button
              onClick={() => {
                setRangeStart(1);
                setRangeEnd(Math.min(10, displayLines.length));
                handleCopyLineRange(1, Math.min(10, displayLines.length));
              }}
              className="px-2 py-1 rounded bg-slate-900 hover:bg-slate-800 text-[10px] font-mono text-slate-300 border border-slate-800 transition cursor-pointer"
              title="Salin 10 baris pertama"
            >
              10 Baris
            </button>
          </div>
        </div>
      </div>

      {/* Line-Numbered Code Viewer (Clean text selection without line numbers in clipboard) */}
      <div className="relative rounded-2xl border border-slate-800/80 overflow-hidden bg-slate-950/90 shadow-inner">
        <div className="overflow-x-auto max-h-[650px] lg:max-h-[750px] overflow-y-auto custom-scrollbar p-3 font-mono text-[11px] leading-relaxed">
          <table className="w-full border-collapse">
            <tbody>
              {displayLines.map((line, idx) => {
                const lineNum = idx + 1;
                const isCopied = copiedLineIdx === lineNum;
                const inRange = lineNum >= rangeStart && lineNum <= rangeEnd;

                return (
                  <tr
                    key={idx}
                    className={`hover:bg-slate-900/80 transition-colors group ${inRange ? 'bg-cyan-950/20' : ''}`}
                  >
                    {/* Line number (select-none) */}
                    <td className="w-12 text-right pr-3 pl-1 text-slate-600 select-none text-[10px] font-mono align-top py-0.5 border-r border-slate-800/60 shrink-0">
                      {lineNum}
                    </td>

                    {/* Quick 1-click line copy button (select-none) */}
                    <td className="w-8 pl-2 pr-1 text-center select-none align-top py-0.5 shrink-0">
                      <button
                        onClick={() => handleCopySingleLine(line, lineNum)}
                        className="opacity-0 group-hover:opacity-100 p-0.5 rounded text-slate-500 hover:text-cyan-300 hover:bg-slate-800 transition cursor-pointer"
                        title={`Salin baris #${lineNum}`}
                      >
                        {isCopied ? <Check size={11} className="text-emerald-400" /> : <Copy size={11} />}
                      </button>
                    </td>

                    {/* Line text (natural select-text, NO select-all) */}
                    <td className="pl-3 text-emerald-400 font-mono whitespace-pre py-0.5 select-text break-all sm:break-normal">
                      {line}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
