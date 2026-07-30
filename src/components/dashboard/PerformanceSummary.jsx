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
    <section style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
      gap: '16px',
      marginBottom: '28px'
    }}>
      {/* Total Download */}
      <div className="glass-card" style={{ padding: '18px 22px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{t('totalDownloadSpeed')}</span>
          <ArrowDown color="#00f2fe" size={18} />
        </div>
        <div className="font-mono" style={{ fontSize: '1.5rem', fontWeight: 700, color: '#00f2fe', marginTop: '6px' }}>
          {formatSpeed(totalDownloadSpeed)}
        </div>
      </div>

      {/* Total Upload */}
      <div className="glass-card" style={{ padding: '18px 22px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{t('totalUploadSpeed')}</span>
          <ArrowUp color="#8b5cf6" size={18} />
        </div>
        <div className="font-mono" style={{ fontSize: '1.5rem', fontWeight: 700, color: '#c084fc', marginTop: '6px' }}>
          {formatSpeed(totalUploadSpeed)}
        </div>
      </div>

      {/* Avg CPU */}
      <div className="glass-card" style={{ padding: '18px 22px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{t('avgCpuUsage')}</span>
          <Cpu color="#38bdf8" size={18} />
        </div>
        <div className="font-mono" style={{ fontSize: '1.5rem', fontWeight: 700, color: '#fff', marginTop: '6px' }}>
          {avgCpu}%
        </div>
      </div>

      {/* Avg GPU */}
      <div className="glass-card" style={{ padding: '18px 22px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{t('avgGpuUsage')}</span>
          <Zap color="#10b981" size={18} />
        </div>
        <div className="font-mono" style={{ fontSize: '1.5rem', fontWeight: 700, color: '#10b981', marginTop: '6px' }}>
          {avgGpu}%
        </div>
      </div>

      {/* Online Status */}
      <div className="glass-card" style={{ padding: '18px 22px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{t('onlineStatus')}</span>
          <ShieldCheck color="#10b981" size={18} />
        </div>
        <div className="font-mono" style={{ fontSize: '1.5rem', fontWeight: 700, color: '#10b981', marginTop: '6px' }}>
          {onlineCount} / {servers.length} <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 500 }}>Online</span>
        </div>
      </div>
    </section>
  );
}
