import React, { useState } from 'react';
import ReactDOM from 'react-dom';
import { X, Play, Copy, Check, Terminal, CheckCircle, AlertTriangle } from 'lucide-react';

export default function ScriptOutputModal({ isOpen, onClose, result, scriptName }) {
  const [copied, setCopied] = useState(false);

  if (!isOpen || !result) return null;

  const fullText = `=== EXECUTION RESULT: ${scriptName} ===\nPath: ${result.path || '/home/pod/scripts/exec/' + scriptName}\nExit Code: ${result.exitCode ?? 0}\n\n--- STDOUT ---\n${result.output || '(Kosong / Tidak ada output)'}\n\n--- STDERR ---\n${result.stderr || '(Tidak ada error)'}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(fullText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const isSuccess = (result.exitCode === 0 || !result.exitCode) && !result.stderr;

  return ReactDOM.createPortal(
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 99999, padding: '16px' }}>
      <div
        className="glass-card modal-aos-content"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '96vw',
          maxWidth: '1300px',
          height: '88vh',
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
              background: isSuccess ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
              border: `1px solid ${isSuccess ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
              padding: '10px',
              borderRadius: '12px'
            }}>
              <Terminal color={isSuccess ? '#10b981' : '#ef4444'} size={24} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#fff' }}>
                  Hasil Eksekusi Skrip Terminal
                </h3>
                <span style={{
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  padding: '2px 8px',
                  borderRadius: '6px',
                  background: isSuccess ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                  color: isSuccess ? '#10b981' : '#ef4444'
                }}>
                  {isSuccess ? 'SUKSES' : `EXIT CODE: ${result.exitCode}`}
                </span>
              </div>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '2px' }} className="font-mono">
                /home/pod/scripts/exec/{scriptName}
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button onClick={handleCopy} className="btn-secondary" style={{ padding: '8px 14px', fontSize: '0.85rem' }}>
              {copied ? <Check size={16} color="#10b981" /> : <Copy size={16} />}
              <span>{copied ? 'Tersalin' : 'Salin Output'}</span>
            </button>

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

        {/* Terminal Output Viewer */}
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
          {fullText}
        </div>
      </div>
    </div>,
    document.body
  );
}
