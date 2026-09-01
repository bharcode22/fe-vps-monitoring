import React, { useState, useEffect } from 'react';
import {
  X,
  Terminal,
  RefreshCw,
  Copy,
  Check,
  Server,
  Loader2,
  AlertCircle,
  FileText
} from 'lucide-react';
import { fetchPodSyncLogsApi } from '../../api/vpsApi';

export default function PodSyncLogModal({ isOpen, onClose, pod, containerName = 'mobile-synch' }) {
  const [logs, setLogs] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [isCopied, setIsCopied] = useState(false);
  const [lineLimit, setLineLimit] = useState(100);

  const loadLogs = async () => {
    if (!pod) return;
    setIsLoading(true);
    setError('');
    try {
      const data = await fetchPodSyncLogsApi(pod.serverId || pod.id, containerName, lineLimit);
      setLogs(data.logs || 'Tidak ada log yang tercatat.');
    } catch (err) {
      setError(err.message || 'Gagal mengambil log container');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && pod) {
      loadLogs();
    } else {
      setLogs('');
      setError('');
    }
  }, [isOpen, pod, lineLimit]);

  const handleCopy = () => {
    if (!logs) return;
    navigator.clipboard.writeText(logs);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  if (!isOpen || !pod) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-950/80 backdrop-blur-md overflow-y-auto animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl bg-slate-900 border border-purple-500/30 rounded-3xl shadow-2xl shadow-purple-950/60 overflow-hidden my-8 flex flex-col max-h-[85vh]">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-purple-500/20 bg-slate-950/90">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-purple-500/10 border border-purple-500/30 text-purple-400">
              <Terminal size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-black text-white">Log Aktivitas: {pod.serverName || `POD #${pod.serverId}`}</h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-purple-500/20 text-purple-300 border border-purple-500/40">
                  {containerName}
                </span>
              </div>
              <p className="text-xs text-slate-400 font-mono mt-0.5">
                Host: {pod.host || '-'} — Memantau aktivitas unduhan RabbitMQ di POD
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Line Limit Selector */}
            <select
              value={lineLimit}
              onChange={(e) => setLineLimit(Number(e.target.value))}
              disabled={isLoading}
              className="bg-slate-900 border border-slate-700 text-slate-300 text-xs rounded-xl px-2.5 py-1.5 focus:outline-none focus:border-purple-500 font-mono"
            >
              <option value={50}>50 Baris</option>
              <option value={100}>100 Baris</option>
              <option value={200}>200 Baris</option>
            </select>

            {/* Refresh Button */}
            <button
              onClick={loadLogs}
              disabled={isLoading}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-all cursor-pointer disabled:opacity-50"
              title="Segarkan Log"
            >
              <RefreshCw size={16} className={isLoading ? 'animate-spin text-purple-400' : ''} />
            </button>

            {/* Copy Button */}
            <button
              onClick={handleCopy}
              disabled={!logs || isLoading}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-all cursor-pointer disabled:opacity-50"
              title="Salin Log"
            >
              {isCopied ? <Check size={16} className="text-emerald-400" /> : <Copy size={16} />}
            </button>

            {/* Close Button */}
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-all cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Modal Body / Terminal Window */}
        <div className="p-6 overflow-y-auto flex-1 bg-slate-950 font-mono text-xs text-slate-300 space-y-3 custom-scrollbar">
          {error && (
            <div className="p-4 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2.5">
              <AlertCircle size={16} className="shrink-0 mt-0.5 text-rose-400" />
              <div>
                <p className="font-bold">Gagal Mengambil Log Container</p>
                <p className="mt-0.5 text-rose-200">{error}</p>
              </div>
            </div>
          )}

          {isLoading ? (
            <div className="py-20 flex flex-col items-center justify-center text-slate-500 gap-3">
              <Loader2 size={24} className="animate-spin text-purple-400" />
              <span>Mengambil log terbaru dari {pod.serverName}...</span>
            </div>
          ) : (
            <pre className="whitespace-pre-wrap break-all leading-relaxed select-text p-4 rounded-2xl bg-slate-900/90 border border-slate-800 text-slate-200">
              {logs}
            </pre>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3.5 border-t border-purple-500/20 bg-slate-950 flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>Docker Engine output</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl text-xs font-bold text-slate-300 bg-slate-800 hover:bg-slate-700 hover:text-white transition-all cursor-pointer"
          >
            Tutup
          </button>
        </div>

      </div>
    </div>
  );
}
