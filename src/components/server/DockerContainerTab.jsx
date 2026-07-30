import React, { useState, useEffect } from 'react';
import { Box, RefreshCw, RotateCcw, Terminal, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';
import { fetchDockerContainersApi, restartDockerContainerApi } from '../../api/vpsApi';
import DockerLogModal from './DockerLogModal';
import { useLanguage } from '../../context/LanguageContext';

export default function DockerContainerTab({ serverId }) {
  const { t } = useLanguage();
  const [containers, setContainers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [restartingContainer, setRestartingContainer] = useState('');
  const [actionSuccessMsg, setActionSuccessMsg] = useState('');
  
  // Selected container for log modal
  const [selectedLogContainer, setSelectedLogContainer] = useState(null);

  useEffect(() => {
    if (serverId) {
      loadContainers();
    }
  }, [serverId]);

  const loadContainers = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const data = await fetchDockerContainersApi(serverId);
      setContainers(data);
    } catch (err) {
      setErrorMsg(err.message || 'Gagal memuat daftar container Docker.');
    } finally {
      setLoading(false);
    }
  };

  const handleRestart = async (containerName) => {
    setRestartingContainer(containerName);
    setActionSuccessMsg('');
    setErrorMsg('');
    try {
      await restartDockerContainerApi(serverId, containerName);
      setActionSuccessMsg(`Container ${containerName} berhasil dimuat ulang (restart).`);
      loadContainers();
    } catch (err) {
      setErrorMsg(err.message || `Gagal merestart container ${containerName}`);
    } finally {
      setRestartingContainer('');
    }
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)' }}>
        <Loader2 className="animate-spin" size={24} style={{ margin: '0 auto 12px auto', display: 'block', color: '#00f2fe' }} />
        Memuat daftar aplikasi Docker (docker ps -a)...
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      
      {/* Tab Header & Controls */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Box size={20} color="#00f2fe" />
          <h3 style={{ fontSize: '1.05rem', fontWeight: 600, color: '#fff' }}>
            Daftar Aplikasi Docker ({containers.length})
          </h3>
        </div>
        <button onClick={loadContainers} className="btn-secondary" style={{ padding: '6px 12px', fontSize: '0.82rem' }}>
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      {errorMsg && (
        <div style={{
          background: 'rgba(239, 68, 68, 0.15)',
          border: '1px solid rgba(239, 68, 68, 0.3)',
          color: '#fca5a5',
          padding: '10px 14px',
          borderRadius: '8px',
          fontSize: '0.85rem',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <AlertCircle size={16} />
          <span>{errorMsg}</span>
        </div>
      )}

      {actionSuccessMsg && (
        <div style={{
          background: 'rgba(16, 185, 129, 0.15)',
          border: '1px solid rgba(16, 185, 129, 0.3)',
          color: '#6ee7b7',
          padding: '10px 14px',
          borderRadius: '8px',
          fontSize: '0.85rem',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <CheckCircle size={16} />
          <span>{actionSuccessMsg}</span>
        </div>
      )}

      {/* Containers Table */}
      {containers.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '36px', background: 'rgba(0,0,0,0.2)', borderRadius: '12px', color: 'var(--text-muted)' }}>
          Tidak ada container Docker yang berjalan di server ini (atau Docker belum terinstall).
        </div>
      ) : (
        <div style={{ overflowX: 'auto', background: 'rgba(0, 0, 0, 0.25)', border: '1px solid var(--border-color)', borderRadius: '12px' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-color)', textAlign: 'left', color: 'var(--text-muted)' }}>
                <th style={{ padding: '12px 14px' }}>Nama Container</th>
                <th style={{ padding: '12px 14px' }}>Image Tag</th>
                <th style={{ padding: '12px 14px' }}>Status / State</th>
                <th style={{ padding: '12px 14px' }}>Ports</th>
                <th style={{ padding: '12px 14px', textAlign: 'right' }}>Aksi Admin</th>
              </tr>
            </thead>
            <tbody>
              {containers.map((c, index) => {
                const isRunning = (c.state || '').toLowerCase() === 'running';
                const isExited = (c.state || '').toLowerCase() === 'exited';
                const isRestartingThis = restartingContainer === c.name;

                return (
                  <tr key={c.id || index} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    
                    {/* Container Name & ID */}
                    <td style={{ padding: '12px 14px' }}>
                      <div style={{ fontWeight: 600, color: '#fff' }} className="font-mono">{c.name}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }} className="font-mono">ID: {c.id}</div>
                    </td>

                    {/* Image */}
                    <td style={{ padding: '12px 14px', color: 'var(--text-muted)' }} className="font-mono">
                      {c.image}
                    </td>

                    {/* Status / State Badge */}
                    <td style={{ padding: '12px 14px' }}>
                      <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        padding: '3px 10px',
                        borderRadius: '20px',
                        background: isRunning ? 'rgba(16, 185, 129, 0.15)' : (isExited ? 'rgba(239, 68, 68, 0.15)' : 'rgba(245, 158, 11, 0.15)'),
                        color: isRunning ? '#10b981' : (isExited ? '#ef4444' : '#f59e0b'),
                        border: `1px solid ${isRunning ? 'rgba(16, 185, 129, 0.3)' : (isExited ? 'rgba(239, 68, 68, 0.3)' : 'rgba(245, 158, 11, 0.3)')}`
                      }}>
                        <span className={`live-dot ${isRunning ? 'online' : 'offline'}`} style={{ width: '6px', height: '6px' }}></span>
                        {c.status || c.state}
                      </span>
                    </td>

                    {/* Exposed Ports */}
                    <td style={{ padding: '12px 14px', color: 'var(--text-muted)', fontSize: '0.78rem' }} className="font-mono">
                      {c.ports || '-'}
                    </td>

                    {/* Admin Action Buttons */}
                    <td style={{ padding: '12px 14px', textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                        
                        {/* Log Console Button */}
                        <button
                          onClick={() => setSelectedLogContainer(c.name)}
                          className="btn-secondary"
                          style={{ padding: '5px 10px', fontSize: '0.78rem' }}
                          title="Lihat Log Container"
                        >
                          <Terminal size={14} color="#00f2fe" />
                          <span>Logs</span>
                        </button>

                        {/* Restart Button */}
                        <button
                          onClick={() => handleRestart(c.name)}
                          disabled={isRestartingThis}
                          className="btn-secondary"
                          style={{
                            padding: '5px 10px',
                            fontSize: '0.78rem',
                            borderColor: 'rgba(245, 158, 11, 0.4)',
                            color: '#f59e0b',
                            background: 'rgba(245, 158, 11, 0.1)'
                          }}
                          title="Restart Container Ini"
                        >
                          {isRestartingThis ? (
                            <Loader2 className="animate-spin" size={14} />
                          ) : (
                            <RotateCcw size={14} />
                          )}
                          <span>{isRestartingThis ? 'Restarting...' : 'Restart'}</span>
                        </button>

                      </div>
                    </td>

                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Log Console Modal */}
      <DockerLogModal
        isOpen={Boolean(selectedLogContainer)}
        onClose={() => setSelectedLogContainer(null)}
        serverId={serverId}
        containerName={selectedLogContainer}
      />

    </div>
  );
}
