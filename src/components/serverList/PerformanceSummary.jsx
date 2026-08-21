import React from 'react';
import { ArrowDown, ArrowUp, Cpu, Zap, ShieldCheck } from 'lucide-react';
import { formatSpeed } from '../../utils/formatters';
import { useLanguage } from '../../context/LanguageContext';

export default function PerformanceSummary({ servers = [] }) {
  const { t } = useLanguage();

  const totalDownloadSpeed = servers.reduce((acc, s) => acc + (s.currentMetrics?.bandwidth_rx_speed || s.currentMetrics?.bandwidthRxSpeed || 0), 0);
  const totalUploadSpeed = servers.reduce((acc, s) => acc + (s.currentMetrics?.bandwidth_tx_speed || s.currentMetrics?.bandwidthTxSpeed || 0), 0);
  const onlineCount = servers.filter(s => (s.currentMetrics?.status || 'online') === 'online').length;

  const avgCpu = servers.length > 0
    ? Math.round(servers.reduce((acc, s) => acc + (s.currentMetrics?.cpu_usage || s.currentMetrics?.cpuUsage || 0), 0) / servers.length * 10) / 10
    : 0;

  const gpuServers = servers.filter(s => s.currentMetrics?.gpu_name && s.currentMetrics.gpu_name !== 'N/A' && s.currentMetrics.gpu_name !== 'No GPU / N/A');
  const avgGpu = gpuServers.length > 0
    ? Math.round(gpuServers.reduce((acc, s) => acc + (s.currentMetrics?.gpu_usage || s.currentMetrics?.gpuUsage || 0), 0) / gpuServers.length * 10) / 10
    : 0;

  return (
    <section className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-6">

      {/* Total Download */}
      <div className="glass-card p-4 rounded-2xl border border-slate-800/80 bg-slate-900/60 backdrop-blur-md hover:border-cyan-500/30 transition-all duration-200">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-400">{t('totalDownloadSpeed')}</span>
          <div className="p-1.5 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
            <ArrowDown size={16} />
          </div>
        </div>
        <div className="font-mono text-2xl font-black text-cyan-400 mt-2 tracking-tight">
          {formatSpeed(totalDownloadSpeed)}
        </div>
      </div>

      {/* Total Upload */}
      <div className="glass-card p-4 rounded-2xl border border-slate-800/80 bg-slate-900/60 backdrop-blur-md hover:border-purple-500/30 transition-all duration-200">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-400">{t('totalUploadSpeed')}</span>
          <div className="p-1.5 rounded-lg bg-purple-500/10 border border-purple-500/20 text-purple-400">
            <ArrowUp size={16} />
          </div>
        </div>
        <div className="font-mono text-2xl font-black text-purple-400 mt-2 tracking-tight">
          {formatSpeed(totalUploadSpeed)}
        </div>
      </div>

      {/* Avg CPU */}
      <div className="glass-card p-4 rounded-2xl border border-slate-800/80 bg-slate-900/60 backdrop-blur-md hover:border-sky-500/30 transition-all duration-200">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-400">{t('avgCpuUsage')}</span>
          <div className="p-1.5 rounded-lg bg-sky-500/10 border border-sky-500/20 text-sky-400">
            <Cpu size={16} />
          </div>
        </div>
        <div className="font-mono text-2xl font-black text-white mt-2 tracking-tight">
          {avgCpu}%
        </div>
      </div>

      {/* Avg GPU */}
      <div className="glass-card p-4 rounded-2xl border border-slate-800/80 bg-slate-900/60 backdrop-blur-md hover:border-emerald-500/30 transition-all duration-200">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-400">{t('avgGpuUsage')}</span>
          <div className="p-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
            <Zap size={16} />
          </div>
        </div>
        <div className="font-mono text-2xl font-black text-emerald-400 mt-2 tracking-tight">
          {avgGpu}%
        </div>
      </div>

      {/* Online Status */}
      <div className="glass-card p-4 rounded-2xl border border-slate-800/80 bg-slate-900/60 backdrop-blur-md hover:border-emerald-500/30 transition-all duration-200">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-400">{t('onlineStatus')}</span>
          <div className="p-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
            <ShieldCheck size={16} />
          </div>
        </div>
        <div className="font-mono text-2xl font-black text-emerald-400 mt-2 tracking-tight">
          {onlineCount} <span className="text-sm font-semibold text-slate-400">/ {servers.length}</span>
        </div>
      </div>

    </section>
  );
}
