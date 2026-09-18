import React, { useState, useEffect } from 'react';
import {
  FileCode,
  Download,
  Upload,
  RefreshCw,
  Copy,
  Check,
  BookOpen,
  Send,
  AlertCircle
} from 'lucide-react';
import {
  convertSimulatorToMasterPayload,
  convertMasterPayloadToSimulator
} from './templateConverter';

export default function JsonTemplateEditor({
  sessionData,
  onUpdateSessionData,
  onSaveToTemplateLibrary,
  onOpenBatchApply,
  onSaveToPod,
  isSavingToPod = false,
  initialContext = null
}) {
  const [jsonText, setJsonText] = useState('');
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);

  // Sync internal text when sessionData changes from visual builder
  useEffect(() => {
    if (sessionData) {
      setJsonText(JSON.stringify([sessionData], null, 4));
      setError(null);
    }
  }, [sessionData]);

  // Handle Manual Textarea Edit & Apply
  const handleApplyJsonText = () => {
    try {
      const parsed = JSON.parse(jsonText);
      let target = null;
      if (Array.isArray(parsed) && parsed.length > 0) {
        target = parsed[0];
      } else if (parsed && parsed.detail_experience) {
        // Automatically convert Master API format if pasted!
        target = convertMasterPayloadToSimulator(parsed);
      } else if (parsed && typeof parsed === 'object') {
        target = parsed;
      } else {
        throw new Error('Format JSON harus berupa objek atau array.');
      }

      setError(null);
      onUpdateSessionData(target);
    } catch (err) {
      setError(`Gagal mem-parse JSON: ${err.message}`);
    }
  };

  // Load JSON File
  const handleLoadJsonFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result;
      setJsonText(text);
      try {
        const parsed = JSON.parse(text);
        let target = null;
        if (Array.isArray(parsed) && parsed.length > 0) {
          target = parsed[0];
        } else if (parsed && parsed.detail_experience) {
          target = convertMasterPayloadToSimulator(parsed);
        } else if (parsed && typeof parsed === 'object') {
          target = parsed;
        }
        if (target) {
          onUpdateSessionData(target);
          setError(null);
        }
      } catch (err) {
        setError(`Format JSON tidak valid: ${err.message}`);
      }
    };
    reader.readAsText(file);
  };

  // Download Simulator JSON file
  const handleDownloadSimulatorJson = () => {
    const blob = new Blob([jsonText], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${(sessionData?.name || 'simulator_session').toLowerCase().replace(/\s+/g, '_')}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  // Download Master API compatible JSON file
  const handleDownloadMasterApiJson = () => {
    const masterPayload = convertSimulatorToMasterPayload(sessionData);
    const blob = new Blob([JSON.stringify(masterPayload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `template_pod_${(sessionData?.name || 'session').toLowerCase().replace(/\s+/g, '_')}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  // Copy to clipboard
  const handleCopy = () => {
    navigator.clipboard.writeText(jsonText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5 space-y-3">
      {/* Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <FileCode size={16} className="text-amber-400" />
          <div>
            <span className="font-bold text-xs text-white block">
              2-Way Synchronized JSON Editor
            </span>
            <span className="text-[10px] text-slate-400">
              Sinkronisasi otomatis dengan timeline visualizer & konverter Master API
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1.5 flex-wrap">
          <label className="cursor-pointer bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-[11px] font-semibold px-2.5 py-1 rounded-lg transition border border-slate-700 flex items-center gap-1">
            <Upload size={12} />
            <span>Load JSON</span>
            <input
              type="file"
              accept=".json"
              onChange={handleLoadJsonFile}
              className="hidden"
            />
          </label>

          <button
            type="button"
            onClick={handleDownloadSimulatorJson}
            className="bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-[11px] font-semibold px-2.5 py-1 rounded-lg transition border border-slate-700 flex items-center gap-1"
            title="Download file JSON format Simulator"
          >
            <Download size={12} className="text-amber-400" />
            <span>Save JSON</span>
          </button>

          <button
            type="button"
            onClick={handleDownloadMasterApiJson}
            className="bg-purple-950/60 hover:bg-purple-900/60 text-purple-300 border border-purple-500/40 text-[11px] font-semibold px-2.5 py-1 rounded-lg transition flex items-center gap-1"
            title="Download format JSON Master API POD Sessions"
          >
            <Download size={12} className="text-purple-400" />
            <span>Export Master JSON</span>
          </button>

          <button
            type="button"
            onClick={handleCopy}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition"
            title="Copy JSON text"
          >
            {copied ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
          </button>
        </div>
      </div>

      {/* Error alert */}
      {error && (
        <div className="p-2 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-[11px] flex items-center gap-1.5">
          <AlertCircle size={14} className="shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Textarea */}
      <div className="relative">
        <textarea
          rows={10}
          value={jsonText}
          onChange={(e) => setJsonText(e.target.value)}
          spellCheck={false}
          className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-[11px] font-mono text-amber-200/90 focus:border-amber-400 focus:outline-none transition leading-relaxed"
        />
      </div>

      {/* Bottom Action Strip */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1">
        <button
          type="button"
          onClick={handleApplyJsonText}
          className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-400 hover:text-amber-300 border border-slate-700 text-xs font-bold transition flex items-center justify-center gap-1.5"
        >
          <RefreshCw size={13} />
          <span>Update Events dari JSON ke Visualizer</span>
        </button>

        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
          {onSaveToPod && (
            <button
              type="button"
              disabled={isSavingToPod}
              onClick={onSaveToPod}
              className="px-3 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold shadow-md transition flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
            >
              {isSavingToPod ? <RefreshCw size={13} className="animate-spin" /> : <Send size={13} />}
              <span>Simpan ke Master API POD</span>
            </button>
          )}

          {onSaveToTemplateLibrary && (
            <button
              type="button"
              onClick={() => {
                const master = convertSimulatorToMasterPayload(sessionData);
                onSaveToTemplateLibrary(master);
              }}
              className="px-3 py-2 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/40 text-xs font-bold transition flex items-center gap-1.5"
            >
              <BookOpen size={13} />
              <span>Simpan ke Template Library</span>
            </button>
          )}

          {onOpenBatchApply && (
            <button
              type="button"
              onClick={() => {
                const master = convertSimulatorToMasterPayload(sessionData);
                onOpenBatchApply(master);
              }}
              className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 text-xs font-bold shadow-md transition flex items-center gap-1.5"
            >
              <Send size={13} />
              <span>Terapkan ke POD</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
