import React, { useState, useEffect, useRef } from 'react';
import {
  Terminal,
  Activity,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Copy,
  Trash2,
  ArrowDownCircle,
  Clock,
  Zap,
  Music,
  KeyRound,
  RotateCcw
} from 'lucide-react';

export default function ExtractorProgressConsole({
  isExtracting,
  progress = {},
  logs = [],
  onClearLogs
}) {
  const [autoScroll, setAutoScroll] = useState(true);
  const [copied, setCopied] = useState(false);
  const consoleBottomRef = useRef(null);

  useEffect(() => {
    if (autoScroll && consoleBottomRef.current) {
      consoleBottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs, autoScroll]);

  const handleCopyLogs = () => {
    const text = logs.map((l) => `[${l.timestamp}] ${l.message}`).join('\n');
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const status = progress?.status || (isExtracting ? 'RUNNING' : 'IDLE');
  const percentage = progress?.percentage ?? 0;
  const processed = progress?.processed ?? 0;
  const totalLogs = progress?.totalLogs ?? 0;
  const createdSessions = progress?.createdSessionCount ?? 0;
  const createdAuth = progress?.createdAuthCount ?? 0;
  const createdExtracted = progress?.createdExtractedCount ?? 0;
  const skipped = progress?.skippedCount ?? 0;
  const speed = progress?.speed ?? 0;

  return (
    <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-5 shadow-xl backdrop-blur-md mb-6">
      {/* Console Header & Live Stats */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 mb-4 border-b border-slate-800/80">
        <div className="flex items-center gap-2.5">
          <div
            className={`p-2 rounded-xl border ${
              isExtracting
                ? 'bg-amber-500/10 border-amber-500/30 text-amber-400 animate-pulse'
                : status === 'DONE'
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                : 'bg-slate-800/50 border-slate-700/50 text-slate-400'
            }`}
          >
            <Activity size={18} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-white tracking-wide">
                Live Execution & Progress Console
              </h3>
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                  isExtracting
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 animate-pulse'
                    : status === 'DONE'
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                    : status === 'ERROR'
                    ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                    : 'bg-slate-800 text-slate-400 border-slate-700'
                }`}
              >
                {isExtracting ? 'SEDANG BERJALAN' : status}
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Pantau jalannya pemrosesan batch, throughput log/detik, dan log konsol
            </p>
          </div>
        </div>

        {/* Console Controls */}
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-1.5 text-xs text-slate-400 cursor-pointer select-none bg-slate-950/50 px-2.5 py-1.5 rounded-lg border border-slate-800">
            <input
              type="checkbox"
              checked={autoScroll}
              onChange={(e) => setAutoScroll(e.target.checked)}
              className="rounded bg-slate-900 border-slate-700 text-cyan-500 focus:ring-0 w-3.5 h-3.5"
            />
            <span>Auto-scroll</span>
          </label>
          <button
            type="button"
            onClick={handleCopyLogs}
            disabled={logs.length === 0}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-850 hover:bg-slate-800 border border-slate-700 text-xs text-slate-300 transition-colors disabled:opacity-40"
            title="Salin Log Konsol"
          >
            <Copy size={13} />
            <span>{copied ? 'Tersalin!' : 'Salin'}</span>
          </button>
          <button
            type="button"
            onClick={onClearLogs}
            disabled={logs.length === 0}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-850 hover:bg-slate-800 border border-slate-700 text-xs text-rose-400 transition-colors disabled:opacity-40"
            title="Bersihkan Log"
          >
            <Trash2 size={13} />
            <span>Hapus</span>
          </button>
        </div>
      </div>

      {/* Progress Bar Section */}
      <div className="mb-4">
        <div className="flex items-center justify-between text-xs font-semibold mb-1.5">
          <div className="flex items-center gap-2">
            <span className="text-slate-300">Kemajuan Ekstraksi:</span>
            <span className="text-white font-mono font-bold">
              {processed.toLocaleString()} / {totalLogs.toLocaleString()} baris
            </span>
          </div>
          <div className="flex items-center gap-2">
            {speed > 0 && (
              <span className="text-emerald-400 font-mono text-[11px] bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                ⚡ {speed} logs/s
              </span>
            )}
            <span className="text-cyan-400 font-mono font-bold text-sm">
              {percentage}%
            </span>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-slate-950 rounded-full h-3 overflow-hidden border border-slate-800 p-0.5">
          <div
            className={`h-full rounded-full transition-all duration-300 ${
              status === 'DONE'
                ? 'bg-emerald-500 shadow-emerald-500/50 shadow-md'
                : 'bg-gradient-to-r from-cyan-500 via-teal-400 to-emerald-400'
            }`}
            style={{ width: `${percentage}%` }}
          />
        </div>
      </div>

      {/* Live Counters Pill Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
        <div className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-950/60 border border-slate-800">
          <CheckCircle2 size={15} className="text-cyan-400 shrink-0" />
          <div className="min-w-0">
            <div className="text-[10px] text-slate-400 uppercase font-semibold truncate">
              Extracted Rows
            </div>
            <div className="text-xs font-bold font-mono text-cyan-300">
              +{createdExtracted.toLocaleString()}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-950/60 border border-slate-800">
          <Music size={15} className="text-purple-400 shrink-0" />
          <div className="min-w-0">
            <div className="text-[10px] text-slate-400 uppercase font-semibold truncate">
              Play Sessions
            </div>
            <div className="text-xs font-bold font-mono text-purple-300">
              +{createdSessions.toLocaleString()}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-950/60 border border-slate-800">
          <KeyRound size={15} className="text-emerald-400 shrink-0" />
          <div className="min-w-0">
            <div className="text-[10px] text-slate-400 uppercase font-semibold truncate">
              Auth Details
            </div>
            <div className="text-xs font-bold font-mono text-emerald-300">
              +{createdAuth.toLocaleString()}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-950/60 border border-slate-800">
          <RotateCcw size={15} className="text-slate-400 shrink-0" />
          <div className="min-w-0">
            <div className="text-[10px] text-slate-400 uppercase font-semibold truncate">
              Skipped / Idem
            </div>
            <div className="text-xs font-bold font-mono text-slate-400">
              {skipped.toLocaleString()}
            </div>
          </div>
        </div>
      </div>

      {/* Terminal Monospace Console Body */}
      <div className="rounded-xl bg-slate-950 border border-slate-800/90 overflow-hidden shadow-inner">
        {/* Terminal Title Bar */}
        <div className="flex items-center justify-between px-3 py-2 bg-slate-900/90 border-b border-slate-800 text-[11px] text-slate-400">
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500/80 inline-block" />
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500/80 inline-block" />
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/80 inline-block" />
            </div>
            <span className="font-mono text-slate-300 text-xs">stdout://pod-logs-extractor</span>
          </div>
          <span className="text-[10px] text-slate-500 font-mono">
            {logs.length} baris pesan
          </span>
        </div>

        {/* Terminal Logs Output */}
        <div className="p-3 font-mono text-[11px] leading-relaxed max-h-72 min-h-36 overflow-y-auto space-y-1 select-text">
          {logs.length === 0 ? (
            <div className="text-slate-600 italic py-6 text-center">
              Menunggu proses ekstraksi... Klik &apos;Mulai Ekstraksi Data&apos; untuk memulai streaming log.
            </div>
          ) : (
            logs.map((log, idx) => {
              let textClass = 'text-slate-300';
              if (log.type === 'SUCCESS') textClass = 'text-emerald-400 font-semibold';
              if (log.type === 'ERROR') textClass = 'text-rose-400 font-semibold';
              if (log.type === 'WARN') textClass = 'text-amber-400';
              if (log.type === 'PROGRESS') textClass = 'text-cyan-300';

              return (
                <div key={idx} className="flex items-start gap-2 hover:bg-slate-900/40 px-1 rounded">
                  <span className="text-slate-600 shrink-0 select-none">
                    [{log.timestamp || new Date().toLocaleTimeString()}]
                  </span>
                  <span className={textClass}>{log.message}</span>
                </div>
              );
            })
          )}
          <div ref={consoleBottomRef} />
        </div>
      </div>
    </div>
  );
}
