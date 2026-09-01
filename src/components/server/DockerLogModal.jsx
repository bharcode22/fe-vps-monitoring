import React, { useState, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom';
import { X, Terminal, RefreshCw, Copy, Check, AlertCircle, Radio, Play, Square } from 'lucide-react';
import { io } from 'socket.io-client';
import { SOCKET_URL } from '../../config';
import { fetchDockerLogsApi } from '../../api/vpsApi';

export default function DockerLogModal({ isOpen, onClose, serverId, containerName, autoStream = false }) {
  const [logs, setLogs] = useState('');
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [copied, setCopied] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);

  const socketRef = useRef(null);
  const terminalRef = useRef(null);

  // Auto scroll terminal to bottom when logs update in streaming mode
  useEffect(() => {
    if (isStreaming && terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [logs, isStreaming]);

  // Initial load on mount or container change
  useEffect(() => {
    if (isOpen && serverId && containerName) {
      if (autoStream) {
        startStreaming();
      } else {
        setIsStreaming(false);
        loadStaticLogs();
      }
    }
    return () => {
      stopStreaming();
    };
  }, [isOpen, serverId, containerName, autoStream]);

  const loadStaticLogs = async () => {
    stopStreaming();
    setLoading(true);
    setErrorMsg('');
    try {
      const data = await fetchDockerLogsApi(serverId, containerName);
      const text = typeof data === 'string' ? data : (data?.logs || JSON.stringify(data, null, 2));
      setLogs(text || 'Log kosong.');
    } catch (err) {
      setErrorMsg(err.message || 'Gagal memuat log container.');
    } finally {
      setLoading(false);
    }
  };

  const startStreaming = () => {
    stopStreaming();
    setLoading(true);
    setErrorMsg('');
    setLogs(`=== LIVE STREAMING STARTED: docker logs -f --tail 100 ${containerName} ===\n`);

    const token = localStorage.getItem('vps_monitoring_token') || '';
    const socket = io(SOCKET_URL);
    socketRef.current = socket;

    socket.on('connect', () => {
      socket.emit('docker:start-stream', { serverId, containerName, token });
      setLoading(false);
      setIsStreaming(true);
    });

    socket.on('docker:stream-data', (data) => {
      if (data && data.chunk) {
        setLogs((prev) => prev + data.chunk);
      }
    });

    socket.on('docker:stream-error', (errData) => {
      setErrorMsg(errData.error || 'Gagal melakukan streaming docker logs.');
      setIsStreaming(false);
      setLoading(false);
    });

    socket.on('docker:stream-ended', () => {
      setIsStreaming(false);
    });

    socket.on('disconnect', () => {
      setIsStreaming(false);
    });
  };

  const stopStreaming = () => {
    if (socketRef.current) {
      socketRef.current.emit('docker:stop-stream');
      socketRef.current.disconnect();
      socketRef.current = null;
    }
    setIsStreaming(false);
  };

  const toggleStreamingMode = () => {
    if (isStreaming) {
      stopStreaming();
      loadStaticLogs();
    } else {
      startStreaming();
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(logs);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleModalClose = () => {
    stopStreaming();
    onClose();
  };

  if (!isOpen) return null;

  return ReactDOM.createPortal(
    <div className="modal-overlay" onClick={handleModalClose} style={{ zIndex: 99999, padding: '16px' }}>
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
              background: isStreaming ? 'rgba(239, 68, 68, 0.15)' : 'rgba(0, 242, 254, 0.15)',
              border: `1px solid ${isStreaming ? 'rgba(239, 68, 68, 0.3)' : 'rgba(0, 242, 254, 0.3)'}`,
              padding: '10px',
              borderRadius: '12px'
            }}>
              <Terminal color={isStreaming ? '#ef4444' : '#00f2fe'} size={24} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#fff' }}>
                  Console Log Container
                </h3>
                {isStreaming && (
                  <span style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    fontSize: '0.75rem',
                    fontWeight: 800,
                    padding: '3px 10px',
                    borderRadius: '20px',
                    background: 'rgba(239, 68, 68, 0.2)',
                    color: '#ef4444',
                    border: '1px solid rgba(239, 68, 68, 0.4)'
                  }}>
                    <span className="live-dot offline" style={{ width: '8px', height: '8px', background: '#ef4444' }}></span>
                    🔴 LIVE STREAM (docker logs -f)
                  </span>
                )}
              </div>
              <div style={{ fontSize: '0.88rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                Container: <span style={{ color: '#00f2fe', fontWeight: 600 }} className="font-mono">{containerName}</span>
              </div>
            </div>
          </div>

          {/* Action Controls & Mode Switcher */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>

            {/* Live Stream Toggle Button */}
            <button
              onClick={toggleStreamingMode}
              style={{
                background: isStreaming
                  ? 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)'
                  : 'linear-gradient(135deg, rgba(239, 68, 68, 0.15) 0%, rgba(220, 38, 38, 0.15) 100%)',
                color: isStreaming ? '#fff' : '#ef4444',
                border: '1px solid rgba(239, 68, 68, 0.4)',
                padding: '8px 14px',
                fontSize: '0.85rem',
                fontWeight: 700,
                borderRadius: '10px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                transition: 'all 0.2s ease'
              }}
              title="Aktifkan Streaming Real-time docker logs -f"
            >
              <Radio size={16} className={isStreaming ? 'animate-pulse' : ''} />
              <span>{isStreaming ? '⏹️ Stop Live Stream' : '🔴 Real-time Stream (docker logs -f)'}</span>
            </button>

            {/* Static Snapshot Refresh Button */}
            {!isStreaming && (
              <button onClick={loadStaticLogs} className="btn-secondary" style={{ padding: '8px 14px', fontSize: '0.85rem' }}>
                <RefreshCw size={16} />
                <span>Refresh 100 Baris</span>
              </button>
            )}

            {/* Copy Logs Button */}
            <button onClick={handleCopy} className="btn-secondary" style={{ padding: '8px 14px', fontSize: '0.85rem' }}>
              {copied ? <Check size={16} color="#10b981" /> : <Copy size={16} />}
              <span>{copied ? 'Tersalin' : 'Salin Log'}</span>
            </button>

            {/* High Visibility Close Button */}
            <button
              onClick={handleModalClose}
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

        {/* Terminal Log View Container */}
        <div
          ref={terminalRef}
          style={{
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
          }}
        >
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
