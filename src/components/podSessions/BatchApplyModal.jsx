import React, { useState, useEffect } from 'react';
import {
  X,
  Layers,
  CheckCircle2,
  AlertCircle,
  Clock,
  Play,
  Server,
  Sparkles,
  RefreshCw
} from 'lucide-react';
import { fetchMasterPodsApi, batchApplyTemplateApi } from '../../api/vpsApi';

export default function BatchApplyModal({
  isOpen,
  onClose,
  templateData,
  onSuccess
}) {
  const [pods, setPods] = useState([]);
  const [selectedPodIds, setSelectedPodIds] = useState(new Set());
  const [targetSessionName, setTargetSessionName] = useState('RECHARGE');
  const [isLoadingPods, setIsLoadingPods] = useState(true);
  const [isExecuting, setIsExecuting] = useState(false);
  const [progressState, setProgressState] = useState({ index: 0, total: 0 });
  const [executionLogs, setExecutionLogs] = useState([]);
  const [error, setError] = useState(null);
  const [isCompleted, setIsCompleted] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setError(null);
      setIsCompleted(false);
      setExecutionLogs([]);
      setProgressState({ index: 0, total: 0 });

      if (templateData?.target_session) {
        setTargetSessionName(templateData.target_session);
      }

      setIsLoadingPods(true);
      fetchMasterPodsApi()
        .then(list => {
          setPods(list || []);
          // By default, select all PODs
          setSelectedPodIds(new Set((list || []).map(p => p.id)));
        })
        .catch(err => {
          setError(err.message || 'Gagal mengambil daftar unit POD');
        })
        .finally(() => setIsLoadingPods(false));
    }
  }, [isOpen, templateData]);

  if (!isOpen) return null;

  const detail = templateData?.detail_experience;

  const handleTogglePod = (podId) => {
    if (isExecuting) return;
    const next = new Set(selectedPodIds);
    if (next.has(podId)) {
      next.delete(podId);
    } else {
      next.add(podId);
    }
    setSelectedPodIds(next);
  };

  const handleSelectAll = () => {
    if (isExecuting) return;
    if (selectedPodIds.size === pods.length) {
      setSelectedPodIds(new Set());
    } else {
      setSelectedPodIds(new Set(pods.map(p => p.id)));
    }
  };

  const handleStartBatchApply = async () => {
    if (!detail) {
      setError('Data konfigurasi detail_experience tidak ditemukan');
      return;
    }

    const selectedPods = pods.filter(p => selectedPodIds.has(p.id));
    if (selectedPods.length === 0) {
      setError('Pilih minimal satu unit POD target');
      return;
    }

    setIsExecuting(true);
    setError(null);
    setIsCompleted(false);
    setProgressState({ index: 0, total: selectedPods.length });

    // Initialize execution log entries
    const initialLogs = selectedPods.map(p => ({
      podId: p.id,
      name: p.name || `POD ${p.code}`,
      status: 'pending',
      message: 'Menunggu antrean...'
    }));
    setExecutionLogs(initialLogs);

    try {
      await batchApplyTemplateApi({
        targetPods: selectedPods,
        targetSessionName,
        detailExperience: detail,
        onProgress: (progress) => {
          setProgressState({ index: progress.index + 1, total: progress.total });
          setExecutionLogs(prev => {
            const next = [...prev];
            const idx = next.findIndex(l => l.podId === progress.pod.id);
            if (idx !== -1) {
              next[idx] = {
                ...next[idx],
                status: progress.status,
                message: progress.message
              };
            }
            return next;
          });
        }
      });

      setIsCompleted(true);
      if (onSuccess) onSuccess();
    } catch (err) {
      setError(err.message || 'Terjadi kesalahan saat batch apply');
    } finally {
      setIsExecuting(false);
    }
  };

  const pct = progressState.total > 0 ? Math.round((progressState.index / progressState.total) * 100) : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-3xl bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden my-8 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700/60 bg-slate-800/40">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-purple-500/10 border border-purple-500/30 text-purple-400">
              <Layers size={20} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                Batch Apply Template ke Banyak POD
              </h2>
              <p className="text-xs text-slate-400">
                Distribusikan kalibrasi sesi ini secara serentak ke armada unit POD
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isExecuting}
            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition disabled:opacity-40"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {error && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle size={16} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Template summary pill */}
          <div className="p-4 rounded-xl bg-purple-950/20 border border-purple-500/30 flex items-center justify-between">
            <div>
              <span className="text-[10px] text-purple-300 uppercase font-bold tracking-wider">Template yang Diterapkan</span>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                {templateData?.template_name || detail?.title || 'Detail Experience Template'}
                <span className="text-xs text-cyan-400 font-mono">#{detail?.sound_scape || '-'}</span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Audio: {detail?.song || '-'} | Strobe: {detail?.stroboscopic_light || 0}% | Vibro: {detail?.vibro_acoustics || 0}%
              </p>
            </div>

            <div className="text-right">
              <label className="block text-[11px] text-slate-400 mb-1">Target Sesi Signature</label>
              <select
                value={targetSessionName}
                onChange={(e) => setTargetSessionName(e.target.value)}
                disabled={isExecuting}
                className="px-3 py-1.5 rounded-lg bg-slate-950 border border-purple-500/40 text-xs text-purple-200 font-bold focus:outline-none"
              >
                <option value="RECHARGE">RECHARGE</option>
                <option value="RECONNECT">RECONNECT</option>
                <option value="STRESS">STRESS</option>
                <option value="RELAX">RELAX</option>
                <option value="FOCUS">FOCUS</option>
                <option value="SLEEP">SLEEP</option>
              </select>
            </div>
          </div>

          {/* POD Selection Grid */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                <Server size={14} className="text-cyan-400" />
                Pilih Unit POD V3 Target ({selectedPodIds.size} dari {pods.length} Dipilih)
              </span>
              <button
                type="button"
                onClick={handleSelectAll}
                disabled={isExecuting}
                className="text-xs font-semibold text-cyan-400 hover:text-cyan-300 disabled:opacity-50"
              >
                {selectedPodIds.size === pods.length ? 'Batal Pilih Semua' : 'Pilih Semua'}
              </button>
            </div>

            {isLoadingPods ? (
              <div className="p-8 text-center text-xs text-slate-400">
                <RefreshCw size={20} className="animate-spin mx-auto text-cyan-400 mb-2" />
                Memuat daftar unit POD V3 dari database...
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {pods.map((pod) => {
                  const isSelected = selectedPodIds.has(pod.pod_uuid || pod.id);
                  const effectiveId = pod.pod_uuid || pod.id;
                  return (
                    <div
                      key={effectiveId}
                      onClick={() => handleTogglePod(effectiveId)}
                      className={`p-3 rounded-xl border transition cursor-pointer flex flex-col justify-between ${
                        isSelected
                          ? 'bg-cyan-500/10 border-cyan-500/50 text-white'
                          : 'bg-slate-950/40 border-slate-800 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-bold text-sm text-white flex items-center gap-1.5">
                          {pod.name || `POD ${pod.code}`}
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-cyan-500/20 text-cyan-300">V3</span>
                        </span>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => {}} // Handled by div click
                          className="w-4 h-4 rounded accent-cyan-400"
                        />
                      </div>
                      <span className="text-[11px] font-mono text-slate-400 truncate">{pod.host || pod.ip_address}</span>
                      <span className="text-[10px] font-mono text-indigo-300 mt-1 truncate" title={pod.pod_uuid}>
                        UUID: {String(pod.pod_uuid || pod.id).substring(0, 8)}...
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Progress Bar & Live Execution Log */}
          {(isExecuting || executionLogs.length > 0) && (
            <div className="space-y-3 pt-2 border-t border-slate-800">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-300">
                  {isExecuting ? 'Sedang Menerapkan Template...' : isCompleted ? 'Proses Selesai!' : 'Status Eksekusi'}
                </span>
                <span className="font-mono text-cyan-400 font-bold">
                  {progressState.index} / {progressState.total} ({pct}%)
                </span>
              </div>

              {/* Progress track */}
              <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-cyan-500 to-purple-500 transition-all duration-300 rounded-full"
                  style={{ width: `${pct}%` }}
                />
              </div>

              {/* Execution log entries */}
              <div className="max-h-48 overflow-y-auto space-y-1.5 p-2 rounded-xl bg-slate-950 border border-slate-800">
                {executionLogs.map((log) => (
                  <div
                    key={log.podId}
                    className="p-2 rounded-lg bg-slate-900/60 border border-slate-800/60 flex items-center justify-between text-xs"
                  >
                    <span className="font-semibold text-white">{log.name}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] text-slate-400">{log.message}</span>
                      {log.status === 'processing' && (
                        <div className="w-3.5 h-3.5 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin"></div>
                      )}
                      {log.status === 'success' && (
                        <CheckCircle2 size={15} className="text-emerald-400" />
                      )}
                      {log.status === 'error' && (
                        <AlertCircle size={15} className="text-rose-400" />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-800 bg-slate-950/60">
          <button
            type="button"
            onClick={onClose}
            disabled={isExecuting}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition disabled:opacity-50"
          >
            {isCompleted ? 'Tutup' : 'Batal'}
          </button>

          <button
            type="button"
            onClick={handleStartBatchApply}
            disabled={isExecuting || selectedPodIds.size === 0}
            className="px-6 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs shadow-lg shadow-purple-500/25 transition flex items-center gap-2 disabled:opacity-50"
          >
            {isExecuting ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                <span>Menerapkan ({progressState.index}/{progressState.total})...</span>
              </>
            ) : (
              <>
                <Play size={14} className="fill-current" />
                <span>Terapkan ke {selectedPodIds.size} POD</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
