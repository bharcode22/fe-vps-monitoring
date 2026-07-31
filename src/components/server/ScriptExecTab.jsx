import React, { useState, useEffect } from 'react';
import { Play, Square, Loader2, FileCode, AlertTriangle, Zap, CheckCircle2 } from 'lucide-react';
import { runVpsScriptApi } from '../../api/vpsApi';
import ScriptOutputModal from './ScriptOutputModal';

// Animated Skeleton Loader for Script Exec Tab
const SkeletonScriptExecTab = () => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
    {/* Header Skeleton */}
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
      <div className="skeleton-box" style={{ width: '28px', height: '28px', borderRadius: '6px' }}></div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        <div className="skeleton-box" style={{ width: '240px', height: '20px', borderRadius: '6px' }}></div>
        <div className="skeleton-box" style={{ width: '340px', height: '14px', borderRadius: '4px' }}></div>
      </div>
    </div>

    {/* Combo Banner Skeleton */}
    <div className="glass-card" style={{ padding: '20px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderRadius: '16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <div className="skeleton-box" style={{ width: '48px', height: '48px', borderRadius: '12px' }}></div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <div className="skeleton-box" style={{ width: '220px', height: '18px', borderRadius: '4px' }}></div>
          <div className="skeleton-box" style={{ width: '300px', height: '14px', borderRadius: '4px' }}></div>
        </div>
      </div>
      <div className="skeleton-box" style={{ width: '240px', height: '42px', borderRadius: '12px' }}></div>
    </div>

    {/* Cards Skeleton Grid */}
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '18px' }}>
      {[1, 2].map((i) => (
        <div key={i} className="glass-card" style={{ padding: '24px', borderRadius: '16px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '16px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div className="skeleton-box" style={{ width: '36px', height: '36px', borderRadius: '10px' }}></div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <div className="skeleton-box" style={{ width: '100px', height: '12px', borderRadius: '4px' }}></div>
                <div className="skeleton-box" style={{ width: '140px', height: '18px', borderRadius: '4px' }}></div>
              </div>
            </div>
            <div className="skeleton-box" style={{ width: '220px', height: '14px', borderRadius: '4px' }}></div>
            <div className="skeleton-box" style={{ width: '100%', height: '32px', borderRadius: '6px' }}></div>
          </div>
          <div className="skeleton-box" style={{ width: '100%', height: '42px', borderRadius: '10px' }}></div>
        </div>
      ))}
    </div>
  </div>
);

export default function ScriptExecTab({ serverId }) {
  const [tabLoading, setTabLoading] = useState(true);
  const [runningScript, setRunningScript] = useState('');
  const [execResult, setExecResult] = useState(null);
  const [activeScriptName, setActiveScriptName] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [comboStep, setComboStep] = useState(''); // 'killing' | 'autoscripting' | ''

  useEffect(() => {
    setTabLoading(true);
    const timer = setTimeout(() => setTabLoading(false), 250);
    return () => clearTimeout(timer);
  }, [serverId]);

  const handleRunScript = async (scriptName) => {
    setRunningScript(scriptName);
    setErrorMsg('');
    try {
      const data = await runVpsScriptApi(serverId, scriptName);
      setActiveScriptName(scriptName);
      setExecResult(data);
    } catch (err) {
      setActiveScriptName(scriptName);
      setExecResult({
        script: scriptName,
        path: `/home/pod/scripts/exec/${scriptName}`,
        exitCode: 1,
        output: '',
        stderr: err.message || `Gagal mengeksekusi ${scriptName}`
      });
    } finally {
      setRunningScript('');
    }
  };

  const handleRunSequentialCombo = async () => {
    setRunningScript('combo');
    setComboStep('killing');
    setErrorMsg('');

    let killData = { output: '', stderr: '', exitCode: 0 };
    let autoData = { output: '', stderr: '', exitCode: 0 };

    try {
      // Step 1: Kill Process
      try {
        killData = await runVpsScriptApi(serverId, 'kill-process.sh');
      } catch (e1) {
        killData = { output: '', stderr: e1.message || 'Gagal mengeksekusi kill-process.sh', exitCode: 1 };
      }

      // Step 2: Auto Script
      setComboStep('autoscripting');
      try {
        autoData = await runVpsScriptApi(serverId, 'auto-script.sh');
      } catch (e2) {
        autoData = { output: '', stderr: e2.message || 'Gagal mengeksekusi auto-script.sh', exitCode: 1 };
      }

      // Combine Outputs into modal
      setActiveScriptName('kill-process.sh ➡️ auto-script.sh');

      const combinedOutput = `=== [STEP 1: kill-process.sh] ===\n${killData.output || '(Tidak ada stdout)'}\n${killData.stderr ? '\n[STDERR 1]:\n' + killData.stderr : ''}\n\n========================================\n\n=== [STEP 2: auto-script.sh] ===\n${autoData.output || '(Tidak ada stdout)'}\n${autoData.stderr ? '\n[STDERR 2]:\n' + autoData.stderr : ''}`;
      const combinedStderr = [killData.stderr, autoData.stderr].filter(Boolean).join('\n') || '';

      setExecResult({
        script: 'kill-process.sh & auto-script.sh',
        path: '/home/pod/scripts/exec/',
        exitCode: (killData.exitCode || 0) + (autoData.exitCode || 0),
        output: combinedOutput,
        stderr: combinedStderr
      });
    } catch (err) {
      setErrorMsg(err.message || 'Terjadi kesalahan sistem saat mengeksekusi alur berurutan.');
    } finally {
      setRunningScript('');
      setComboStep('');
    }
  };

  if (tabLoading) {
    return <SkeletonScriptExecTab />;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <FileCode color="#f59e0b" size={24} />
          <div>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#fff' }}>
              Eksekusi Script VPS (`/home/pod/scripts/exec/`)
            </h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '2px' }}>
              Jalankan skrip <strong>kill-process.sh</strong> terlebih dahulu, lalu dilanjutkan dengan <strong>auto-script.sh</strong>.
            </p>
          </div>
        </div>
      </div>

      {errorMsg && (
        <div style={{
          background: 'rgba(239, 68, 68, 0.15)',
          border: '1px solid rgba(239, 68, 68, 0.3)',
          color: '#fca5a5',
          padding: '12px 16px',
          borderRadius: '10px',
          fontSize: '0.88rem',
          display: 'flex',
          alignItems: 'center',
          gap: '10px'
        }}>
          <AlertTriangle size={18} />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Active Script Execution Loading Overlay Banner */}
      {Boolean(runningScript) && (
        <div 
          className="animated-executing-card"
          style={{
            borderRadius: '16px',
            padding: '22px 26px',
            display: 'flex',
            alignItems: 'center',
            gap: '18px',
            transition: 'all 0.3s ease'
          }}
        >
          <div style={{
            background: 'rgba(0, 242, 254, 0.2)',
            padding: '14px',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <Loader2 className="animate-spin" size={32} color="#00f2fe" />
          </div>
          <div style={{ flex: 1 }}>
            <h4 style={{ fontSize: '1.08rem', fontWeight: 700, color: '#fff', display: 'flex', alignItems: 'center', gap: '8px' }}>
              ⚡ Sedang Mengeksekusi Skrip pada Server VPS...
            </h4>
            <div style={{ fontSize: '0.88rem', color: '#00f2fe', fontWeight: 600, marginTop: '3px' }}>
              {runningScript === 'combo' ? (
                comboStep === 'killing' 
                  ? '🔄 [Langkah 1/2]: Mengeksekusi kill-process.sh (Mematikan service lama)...' 
                  : '🚀 [Langkah 2/2]: Mengeksekusi auto-script.sh (Menyalakan service baru)...'
              ) : (
                `🚀 Mengeksekusi ${runningScript} via SSH...`
              )}
            </div>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '4px' }}>
              Mohon tunggu, proses SSH sedang memproses perintah di server (`/home/pod/scripts/exec/`).
            </p>
          </div>
        </div>
      )}

      {/* Sequential Combo Banner (Kill Process -> Auto Script) with Moving Animation on Executing */}
      <div 
        className={runningScript === 'combo' ? 'animated-executing-card' : ''}
        style={{
          background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.1) 0%, rgba(239, 68, 68, 0.1) 100%)',
          border: '1px solid rgba(245, 158, 11, 0.3)',
          borderRadius: '16px',
          padding: '20px 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '16px',
          transition: 'all 0.3s ease'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            background: 'rgba(245, 158, 11, 0.2)',
            padding: '12px',
            borderRadius: '12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            {runningScript === 'combo' ? (
              <Loader2 className="animate-spin" color="#f59e0b" size={24} />
            ) : (
              <Zap color="#f59e0b" size={24} />
            )}
          </div>
          <div>
            <h4 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#fff' }}>
              ⚡ Eksekusi Otomatis Berurutan (Combo)
            </h4>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: '2px' }}>
              Jalankan <strong>1. kill-process.sh</strong> lalu otomatis dilanjutkan <strong>2. auto-script.sh</strong> secara berurutan.
            </p>
          </div>
        </div>

        <button
          onClick={handleRunSequentialCombo}
          disabled={Boolean(runningScript)}
          style={{
            background: runningScript === 'combo'
              ? 'linear-gradient(135deg, #ef4444 0%, #f59e0b 100%)'
              : 'linear-gradient(135deg, #f59e0b 0%, #ef4444 100%)',
            color: '#fff',
            border: 'none',
            padding: '10px 20px',
            fontSize: '0.9rem',
            fontWeight: 700,
            borderRadius: '12px',
            cursor: Boolean(runningScript) ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            boxShadow: runningScript === 'combo' ? '0 0 20px rgba(239, 68, 68, 0.7)' : '0 4px 15px rgba(245, 158, 11, 0.3)',
            transition: 'all 0.2s ease',
            opacity: Boolean(runningScript) && runningScript !== 'combo' ? 0.6 : 1
          }}
        >
          {runningScript === 'combo' ? (
            <>
              <Loader2 className="animate-spin" size={18} />
              <span>{comboStep === 'killing' ? '1/2: Mematikan Proses (kill-process)...' : '2/2: Menjalankan Auto Script...'}</span>
            </>
          ) : (
            <>
              <Zap size={18} />
              <span>Jalankan Kill Process + Auto Script</span>
            </>
          )}
        </button>
      </div>

      {/* Individual Script Cards (Order: 1. Kill Process -> 2. Auto Script) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '18px' }}>

        {/* Card 1: kill-process.sh (FIRST) */}
        <div 
          className={runningScript === 'kill-process.sh' || (runningScript === 'combo' && comboStep === 'killing') ? 'animated-executing-danger' : ''}
          style={{
            background: 'rgba(239, 68, 68, 0.03)',
            border: '1px solid rgba(239, 68, 68, 0.25)',
            borderRadius: '16px',
            padding: '24px',
            display: 'flex',
            flexDirection: 'column',
            justify: 'space-between',
            gap: '16px',
            transition: 'all 0.3s ease'
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
              <div style={{
                background: 'rgba(239, 68, 68, 0.15)',
                padding: '8px',
                borderRadius: '10px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                {runningScript === 'kill-process.sh' || (runningScript === 'combo' && comboStep === 'killing') ? (
                  <Loader2 className="animate-spin" color="#ef4444" size={20} />
                ) : (
                  <Square color="#ef4444" size={20} />
                )}
              </div>
              <div>
                <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#ef4444', textTransform: 'uppercase' }}>
                  Langkah Pertama (1)
                </div>
                <h4 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#fff' }} className="font-mono">
                  kill-process.sh
                </h4>
              </div>
            </div>
            <div style={{ fontSize: '0.75rem', color: '#ef4444', marginBottom: '8px' }} className="font-mono">
              /home/pod/scripts/exec/kill-process.sh
            </div>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: '1.5' }}>
              Menghentikan small & big screen, consume, synch, pod-api di POD.
            </p>
          </div>

          <button
            onClick={() => handleRunScript('kill-process.sh')}
            disabled={Boolean(runningScript)}
            className="btn-danger"
            style={{
              padding: '11px 18px',
              fontSize: '0.88rem',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              width: '100%',
              borderRadius: '10px',
              boxShadow: runningScript === 'kill-process.sh' ? '0 0 15px rgba(239, 68, 68, 0.6)' : 'none',
              opacity: Boolean(runningScript) && runningScript !== 'kill-process.sh' ? 0.6 : 1
            }}
          >
            {runningScript === 'kill-process.sh' || (runningScript === 'combo' && comboStep === 'killing') ? (
              <>
                <Loader2 className="animate-spin" size={16} />
                <span>Mengeksekusi kill-process.sh...</span>
              </>
            ) : (
              <>
                <Square size={16} />
                <span>1. Jalankan kill-process.sh</span>
              </>
            )}
          </button>
        </div>

        {/* Card 2: auto-script.sh (SECOND) */}
        <div 
          className={runningScript === 'auto-script.sh' || (runningScript === 'combo' && comboStep === 'autoscripting') ? 'animated-executing-primary' : ''}
          style={{
            background: 'rgba(0, 242, 254, 0.03)',
            border: '1px solid rgba(0, 242, 254, 0.25)',
            borderRadius: '16px',
            padding: '24px',
            display: 'flex',
            flexDirection: 'column',
            justify: 'space-between',
            gap: '16px',
            transition: 'all 0.3s ease'
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
              <div style={{
                background: 'rgba(0, 242, 254, 0.15)',
                padding: '8px',
                borderRadius: '10px',
                display: 'flex',
                alignItems: 'center',
                justify: 'center'
              }}>
                {runningScript === 'auto-script.sh' ? (
                  <Loader2 className="animate-spin" color="#00f2fe" size={20} />
                ) : (
                  <Play color="#00f2fe" size={20} />
                )}
              </div>
              <div>
                <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#00f2fe', textTransform: 'uppercase' }}>
                  Langkah Kedua (2)
                </div>
                <h4 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#fff' }} className="font-mono">
                  auto-script.sh
                </h4>
              </div>
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--primary-cyan)', marginBottom: '8px' }} className="font-mono">
              /home/pod/scripts/exec/auto-script.sh
            </div>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: '1.5' }}>
              Menjalankan small & big screen, POD-API di POD.
            </p>
          </div>

          <button
            onClick={() => handleRunScript('auto-script.sh')}
            disabled={Boolean(runningScript)}
            className="btn-primary"
            style={{
              padding: '11px 18px',
              fontSize: '0.88rem',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              justify: 'center',
              gap: '8px',
              width: '100%',
              borderRadius: '10px',
              boxShadow: runningScript === 'auto-script.sh' ? '0 0 15px rgba(0, 242, 254, 0.6)' : 'none',
              opacity: Boolean(runningScript) && runningScript !== 'auto-script.sh' ? 0.6 : 1
            }}
          >
            {runningScript === 'auto-script.sh' ? (
              <>
                <Loader2 className="animate-spin" size={16} />
                <span>Mengeksekusi auto-script.sh...</span>
              </>
            ) : (
              <>
                <Play size={16} />
                <span>2. Jalankan auto-script.sh</span>
              </>
            )}
          </button>
        </div>

      </div>

      {/* Execution Terminal Result Modal */}
      <ScriptOutputModal
        isOpen={Boolean(execResult)}
        onClose={() => setExecResult(null)}
        result={execResult}
        scriptName={activeScriptName}
      />

    </div>
  );
}
