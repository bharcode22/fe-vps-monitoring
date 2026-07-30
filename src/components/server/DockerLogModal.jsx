import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { X, Terminal, RefreshCw, Copy, Check, AlertCircle } from 'lucide-react';
import { fetchDockerLogsApi } from '../../api/vpsApi';

export default function DockerLogModal({ isOpen, onClose, serverId, containerName }) {
  const [logs, setLogs] = useState('');
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (isOpen && serverId && containerName) {
      loadLogs();
    }
  }, [isOpen, serverId, containerName]);

  const loadLogs = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const data = await fetchDockerLogsApi(serverId, containerName);
      setLogs(data.logs || 'Log kosong.');
    } catch (err) {
      setErrorMsg(err.message || 'Gagal memuat log container.');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(logs);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!isOpen) return null;

  return ReactDOM.createPortal(
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 99999, padding: '16px' }}>
      <div
        className="glass-card modal-aos-content"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '96vw',
          maxWidth: '1420px',
          height: '90vh',
          padding: '24px 32px',
          display: 'flex',
          flexDirection: 'column',
          background: '#090d16',
          border: '1px solid rgba(0, 242, 254, 0.3)',
          borderRadius: '20px',
          boxShadow: '0 25px 70px rgba(0, 0, 0, 0.85)'
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px', flexWrap: 'wrap', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              background: 'rgba(0, 242, 254, 0.15)',
              border: '1px solid rgba(0, 242, 254, 0.3)',
              padding: '10px',
              borderRadius: '12px'
            }}>
              <Terminal color="#00f2fe" size={24} />
            </div>
            <div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#fff' }}>
                Console Log Application Container
              </h3>
              <div style={{ fontSize: '0.88rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                Container: <span style={{ color: '#00f2fe', fontWeight: 600 }} className="font-mono">{containerName}</span>
              </div>
            </div>
          </div>

          {/* Action Controls & Prominent Close Button */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button onClick={handleCopy} className="btn-secondary" style={{ padding: '8px 14px', fontSize: '0.85rem' }}>
              {copied ? <Check size={16} color="#10b981" /> : <Copy size={16} />}
              <span>{copied ? 'Tersalin' : 'Salin Log'}</span>
            </button>

            <button onClick={loadLogs} className="btn-secondary" style={{ padding: '8px 14px', fontSize: '0.85rem' }}>
              <RefreshCw size={16} />
              <span>Refresh</span>
            </button>

            {/* High Visibility Close Button */}
            <button
              onClick={onClose}
              className="btn-danger"
              style={{
                padding: '8px 16px',
                fontSize: '0.88rem',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                borderRadius: '10px'
              }}
            >
              <X size={18} />
              <span>Tutup (Close)</span>
            </button>
          </div>
        </div>

        {errorMsg && (
          <div style={{
            background: 'rgba(239, 68, 68, 0.15)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            color: '#fca5a5',
            padding: '10px 14px',
            borderRadius: '8px',
            fontSize: '0.85rem',
            marginBottom: '14px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <AlertCircle size={16} />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Terminal Log Container */}
        <div style={{
          flex: 1,
          background: '#011627',
          border: '1px solid rgba(255, 255, 255, 0.12)',
          borderRadius: '14px',
          padding: '20px',
          overflowY: 'auto',
          color: '#d6deeb',
          fontSize: '0.88rem',
          lineHeight: '1.6',
          fontFamily: 'monospace',
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-all'
        }}>
          {loading ? (
            <div style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '60px 0' }}>
              Memuat log aplikasi container...
            </div>
          ) : logs}
        </div>
      </div>
    </div>,
    document.body
  );
}
