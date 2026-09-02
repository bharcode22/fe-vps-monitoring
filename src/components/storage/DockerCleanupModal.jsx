import React from 'react';
import {
  Trash2,
  AlertTriangle,
  RefreshCw,
  CheckCircle2,
  ShieldCheck,
  Zap,
  FileText,
  Layers,
  Server
} from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';

export default function DockerCleanupModal({
  isOpen,
  onClose,
  onConfirm,
  isExecuting,
  targetServers = [], // array of server objects
  cleanType,
  onCleanTypeChange,
  cleanupResult
}) {
  const { t } = useLanguage();

  if (!isOpen) return null;

  const isBatch = targetServers.length > 1;
  const singleServer = targetServers.length === 1 ? targetServers[0] : null;

  const cleanOptions = [
    {
      id: 'safe',
      title: t('storage.cleanupModal.safeTitle', null, 'Safe Prune (Sangat Direkomendasikan)'),
      desc: t('storage.cleanupModal.safeDesc', null, 'Membersihkan BuildKit cache, dangling images (<none>), dan container mati. Tidak menyentuh image/container aktif sama sekali.'),
      badge: t('storage.cleanupModal.safeBadge', null, '100% Aman'),
      badgeColor: 'emerald',
      icon: ShieldCheck
    },
    {
      id: 'deep',
      title: t('storage.cleanupModal.deepTitle', null, 'Deep Image Clean (Pembersihan Menyeluruh)'),
      desc: t('storage.cleanupModal.deepDesc', null, 'Menghapus semua image versi lama yang tidak sedang digunakan oleh container aktif di server.'),
      badge: t('storage.cleanupModal.deepBadge', null, 'Bebaskan Maksimal'),
      badgeColor: 'purple',
      icon: Layers
    },
    {
      id: 'logs',
      title: t('storage.cleanupModal.logsTitle', null, 'Truncate Container Logs'),
      desc: t('storage.cleanupModal.logsDesc', null, 'Mengosongkan file log container yang membengkak di /var/lib/docker/containers/ tanpa restart container.'),
      badge: t('storage.cleanupModal.logsBadge', null, 'Log Rotation'),
      badgeColor: 'sky',
      icon: FileText
    },
    {
      id: 'all',
      title: t('storage.cleanupModal.allTitle', null, 'Bersihkan Semua (Safe + Deep + Logs)'),
      desc: t('storage.cleanupModal.allDesc', null, 'Menjalankan pembersihan menyeluruh pada BuildKit cache, seluruh image lama, dan mengosongkan log container.'),
      badge: t('storage.cleanupModal.allBadge', null, 'Semua Sampah'),
      badgeColor: 'rose',
      icon: Zap
    }
  ];

  return (
    <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-[1000] flex items-center justify-center p-3 sm:p-5 animate-in fade-in duration-150">
      <div className="w-full max-w-xl bg-slate-950 border border-cyan-500/40 rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-5 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2.5 rounded-2xl bg-cyan-500/15 text-cyan-400 border border-cyan-500/30 shrink-0">
              <Trash2 size={18} />
            </div>
            <div className="min-w-0">
              <h3 className="text-base font-extrabold text-white truncate">
                {isBatch
                  ? t('storage.cleanupModal.batchTitle', { count: targetServers.length }, `Bersihkan Sampah Docker di ${targetServers.length} Server POD`)
                  : t('storage.cleanupModal.singleTitle', { server: singleServer?.serverName || 'POD' }, `Bersihkan Sampah Docker: ${singleServer?.serverName || 'POD'}`)}
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                {isBatch ? t('storage.cleanupModal.batchSubtitle', null, 'Eksekusi pembersihan massal ke armada server POD v3') : t('storage.cleanupModal.singleSubtitle', { server: singleServer?.serverName }, `Target: ${singleServer?.serverName}`)}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isExecuting}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors cursor-pointer border border-slate-700 disabled:opacity-50"
          >
            &times;
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 overflow-y-auto flex flex-col gap-4">
          {/* Result View if completed */}
          {cleanupResult ? (
            <div className="flex flex-col gap-4 animate-in zoom-in-95 duration-150">
              <div className="p-5 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 flex items-start gap-3">
                <CheckCircle2 size={24} className="text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-extrabold text-sm text-white mb-1">
                    {t('storage.cleanupModal.successTitle', null, 'Pembersihan Selesai Berhasil!')}
                  </h4>
                  <p className="text-xs text-emerald-300">
                    {t('storage.cleanupModal.totalFreed', null, 'Total ruang disk yang berhasil dibebaskan:')}{' '}
                    <strong className="text-white text-sm font-mono">{cleanupResult.totalFreedFormatted || cleanupResult.freedFormatted || '0 B'}</strong>
                  </p>
                </div>
              </div>

              {/* Breakdown details */}
              {cleanupResult.data && Array.isArray(cleanupResult.data) && (
                <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                    {t('storage.cleanupModal.perServer', null, 'Hasil per Server:')}
                  </span>
                  {cleanupResult.data.map(item => (
                    <div
                      key={item.serverId}
                      className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between text-xs font-mono"
                    >
                      <span className="font-bold text-white">{item.serverName}</span>
                      <span className="text-emerald-400 font-bold">+{item.freedFormatted || '0 B'}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <>
              {/* Option Selector */}
              <div className="space-y-2.5">
                <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                  {t('storage.cleanupModal.selectMode', null, 'Pilih Mode Pembersihan:')}
                </span>

                {cleanOptions.map(opt => {
                  const Icon = opt.icon;
                  const isSelected = cleanType === opt.id;

                  return (
                    <div
                      key={opt.id}
                      onClick={() => !isExecuting && onCleanTypeChange(opt.id)}
                      className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-start gap-3 ${isSelected
                        ? 'bg-cyan-500/15 border-cyan-500/50 shadow-lg shadow-cyan-500/5'
                        : 'bg-slate-900/60 border-slate-800 hover:border-slate-700 hover:bg-slate-900'
                        }`}
                    >
                      <div className={`p-2 rounded-xl border mt-0.5 shrink-0 ${isSelected ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30' : 'bg-slate-800 text-slate-400 border-slate-700'
                        }`}>
                        <Icon size={16} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <h4 className={`text-xs font-bold ${isSelected ? 'text-cyan-200' : 'text-white'}`}>
                            {opt.title}
                          </h4>
                          <span className={`text-[9.5px] font-bold px-2 py-0.2 rounded-full border ${opt.badgeColor === 'emerald'
                            ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                            : opt.badgeColor === 'purple'
                              ? 'bg-purple-500/15 text-purple-300 border-purple-500/30'
                              : opt.badgeColor === 'sky'
                                ? 'bg-sky-500/15 text-sky-300 border-sky-500/30'
                                : 'bg-rose-500/15 text-rose-300 border-rose-500/30'
                            }`}>
                            {opt.badge}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 leading-relaxed">
                          {opt.desc}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Target Servers List summary */}
              {isBatch && (
                <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-400 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Server size={14} className="text-cyan-400" />
                    <span>{t('storage.cleanupModal.executeTarget', null, 'Target Eksekusi:')} <strong className="text-white">{t('storage.cleanupModal.targetUnits', { count: targetServers.length }, `${targetServers.length} Unit POD v3`)}</strong></span>
                  </div>
                  <span className="text-[10.5px] font-mono text-cyan-300 font-bold">{t('storage.cleanupModal.parallelSsh', null, 'Paralel SSH')}</span>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 sm:p-5 bg-slate-900/90 border-t border-slate-800 flex items-center justify-between gap-3 shrink-0">
          <button
            onClick={onClose}
            disabled={isExecuting}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold cursor-pointer disabled:opacity-50"
          >
            {cleanupResult ? t('storage.cleanupModal.close', null, 'Tutup') : t('storage.cleanupModal.cancel', null, 'Batal')}
          </button>

          {!cleanupResult && (
            <button
              onClick={onConfirm}
              disabled={isExecuting}
              className="px-5 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-cyan-500/25 flex items-center gap-2 cursor-pointer transition-all disabled:opacity-50"
            >
              {isExecuting ? (
                <>
                  <RefreshCw size={14} className="animate-spin" />
                  <span>{t('storage.cleanupModal.cleaning', { target: isBatch ? t('storage.cleanupModal.allPodsTarget', null, 'Semua POD') : t('storage.cleanupModal.serverTarget', null, 'Server') }, `Sedang Membersihkan (${isBatch ? 'Semua POD' : 'Server'})...`)}</span>
                </>
              ) : (
                <>
                  <Trash2 size={14} />
                  <span>{t('storage.cleanupModal.cleanNow', null, 'Jalankan Pembersihan Sekarang')}</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
