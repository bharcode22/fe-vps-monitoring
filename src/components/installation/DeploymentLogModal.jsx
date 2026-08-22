import React, { useState } from 'react';
import {
  X,
  Terminal,
  Copy,
  Check,
  Download,
  Clock,
  Server,
  Package,
  Layers,
  CheckCircle2,
  AlertCircle,
  User
} from 'lucide-react';

export default function DeploymentLogModal({
  isOpen,
  onClose,
  historyItem
}) {
  const [copied, setCopied] = useState(false);

  if (!isOpen || !historyItem) return null;

  const isSuccess = historyItem.status === 'success';

  const handleCopyLogs = () => {
    navigator.clipboard.writeText(historyItem.logs || 'Tidak ada log yang tercatat.');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadLog = () => {
    const filename = `deploy-log-${historyItem.app_name}-${historyItem.pod_code || historyItem.server_name}-${historyItem.version}.log`;
    const blob = new Blob([historyItem.logs || ''], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div
      className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="glass-card w-full max-w-4xl max-h-[90vh] p-6 rounded-3xl border border-cyan-500/30 bg-slate-950/95 shadow-2xl flex flex-col gap-4 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-start justify-between pb-4 border-b border-slate-800 gap-4">
          <div className="flex items-center gap-3">
            <div className={`p-3 rounded-2xl border ${
              isSuccess
                ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400'
                : 'bg-rose-500/15 border-rose-500/30 text-rose-400'
            }`}>
              <Terminal size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-black text-white">
                  Log Terminal Deployment
                </h3>
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-black uppercase border ${
                  isSuccess
                    ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                    : 'bg-rose-500/15 text-rose-400 border-rose-500/30'
                }`}>
                  {historyItem.status}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                {new Date(historyItem.created_at).toLocaleString('id-ID', { dateStyle: 'full', timeStyle: 'medium' })}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyLogs}
              className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
              title="Salin Log ke Clipboard"
            >
              {copied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
              <span>{copied ? 'Tersalin!' : 'Salin'}</span>
            </button>
            <button
              onClick={handleDownloadLog}
              className="px-3 py-1.5 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/30 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
              title="Unduh File Log (.log)"
            >
              <Download size={14} />
              <span>Unduh .log</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Metadata Summary Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-3 rounded-2xl bg-slate-900/60 border border-slate-800/80 text-xs">
          <div className="flex items-center gap-2">
            <Server size={15} className="text-cyan-400 shrink-0" />
            <div className="truncate">
              <span className="text-slate-500 block text-[10px]">Target POD</span>
              <span className="font-bold text-slate-200">
                {historyItem.server_name} {historyItem.pod_code ? `(#${historyItem.pod_code})` : ''}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Package size={15} className="text-indigo-400 shrink-0" />
            <div className="truncate">
              <span className="text-slate-500 block text-[10px]">Aplikasi & Versi</span>
              <span className="font-bold text-slate-200">
                {historyItem.app_name} ({historyItem.version})
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Layers size={15} className="text-amber-400 shrink-0" />
            <div className="truncate">
              <span className="text-slate-500 block text-[10px]">Environment</span>
              <span className="font-bold uppercase text-amber-300">
                {historyItem.environment || 'dev'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Clock size={15} className="text-emerald-400 shrink-0" />
            <div className="truncate">
              <span className="text-slate-500 block text-[10px]">Durasi Eksekusi</span>
              <span className="font-bold text-slate-200">
                {historyItem.duration_seconds || 0} detik
              </span>
            </div>
          </div>
        </div>

        {/* Terminal Log Console */}
        <div className="flex-1 min-h-[300px] max-h-[500px] rounded-2xl bg-slate-950 border border-slate-800/80 p-4 font-mono text-xs overflow-y-auto shadow-inner">
          <pre className="text-slate-300 whitespace-pre-wrap break-all leading-relaxed select-text">
            {historyItem.logs || 'Tidak ada log keluaran terminal yang tercatat untuk deployment ini.'}
          </pre>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-800">
          <div className="flex items-center gap-1.5">
            <User size={13} className="text-slate-400" />
            <span>Dideploy oleh: <strong className="text-slate-300">{historyItem.deployed_by || 'Admin'}</strong></span>
            {historyItem.batch_id && (
              <span className="ml-2 px-2 py-0.5 rounded-md bg-slate-900 border border-slate-800 text-[10px] text-slate-400">
                Batch: {historyItem.batch_id}
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-bold cursor-pointer transition-all"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
}
