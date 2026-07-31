import React, { useState, useEffect } from 'react';
import { Play, Square, Loader2, FileCode, AlertTriangle, Zap, CheckCircle2 } from 'lucide-react';
import { runVpsScriptApi } from '../../api/vpsApi';
import ScriptOutputModal from './ScriptOutputModal';

// Animated Skeleton Loader for Script Exec Tab
const SkeletonScriptExecTab = () => (
  <div className="flex flex-col gap-5">
    {/* Header Skeleton */}
    <div className="flex items-center gap-2.5">
      <div className="skeleton-box w-7 h-7 rounded-md"></div>
      <div className="flex flex-col gap-1.5">
        <div className="skeleton-box w-60 h-5 rounded-md"></div>
        <div className="skeleton-box w-80 h-3.5 rounded"></div>
      </div>
    </div>

    {/* Combo Banner Skeleton */}
    <div className="glass-card p-5.5 flex items-center justify-between rounded-2xl border border-slate-800">
      <div className="flex items-center gap-3">
        <div className="skeleton-box w-12 h-12 rounded-xl"></div>
        <div className="flex flex-col gap-1.5">
          <div className="skeleton-box w-56 h-4.5 rounded"></div>
          <div className="skeleton-box w-72 h-3.5 rounded"></div>
        </div>
      </div>
      <div className="skeleton-box w-60 h-10.5 rounded-xl"></div>
    </div>

    {/* Cards Skeleton Grid */}
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4.5">
      {[1, 2].map((i) => (
        <div key={i} className="glass-card p-6 rounded-2xl flex flex-col justify-between gap-4 border border-slate-800">
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2.5">
              <div className="skeleton-box w-9 h-9 rounded-lg"></div>
              <div className="flex flex-col gap-1.5">
                <div className="skeleton-box w-24 h-3 rounded"></div>
                <div className="skeleton-box w-36 h-4.5 rounded"></div>
              </div>
            </div>
            <div className="skeleton-box w-56 h-3.5 rounded"></div>
            <div className="skeleton-box w-full h-8 rounded-md"></div>
          </div>
          <div className="skeleton-box w-full h-10.5 rounded-xl"></div>
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

      setComboStep('autoscripting');

      // Step 2: Auto Script
      try {
        autoData = await runVpsScriptApi(serverId, 'auto-script.sh');
      } catch (e2) {
        autoData = { output: '', stderr: e2.message || 'Gagal mengeksekusi auto-script.sh', exitCode: 1 };
      }

      const combinedOutput = `=== LANGKAH 1: kill-process.sh ===\nExit Code: ${killData.exitCode}\nSTDOUT:\n${killData.output || '(Kosong)'}\nSTDERR:\n${killData.stderr || '(Kosong)'}\n\n=========================================\n\n=== LANGKAH 2: auto-script.sh ===\nExit Code: ${autoData.exitCode}\nSTDOUT:\n${autoData.output || '(Kosong)'}\nSTDERR:\n${autoData.stderr || '(Kosong)'}`;

      setActiveScriptName('COMBO (kill-process ➔ auto-script)');
      setExecResult({
        script: 'kill-process.sh ➔ auto-script.sh',
        path: '/home/pod/scripts/exec/',
        exitCode: (killData.exitCode === 0 && autoData.exitCode === 0) ? 0 : 1,
        output: combinedOutput,
        stderr: (killData.stderr || autoData.stderr) ? `Kill STDERR:\n${killData.stderr || 'N/A'}\n\nAuto STDERR:\n${autoData.stderr || 'N/A'}` : ''
      });
    } catch (err) {
      setErrorMsg(err.message || 'Gagal mengeksekusi kombinasi skrip.');
    } finally {
      setRunningScript('');
      setComboStep('');
    }
  };

  if (tabLoading) {
    return <SkeletonScriptExecTab />;
  }

  return (
    <div className="flex flex-col gap-5">

      {/* Tab Header Description */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2.5">
          <FileCode className="text-amber-400" size={24} />
          <div>
            <h3 className="text-lg font-bold text-white">
              Eksekusi Script VPS (`/home/pod/scripts/exec/`)
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Jalankan skrip <strong>kill-process.sh</strong> terlebih dahulu, lalu dilanjutkan dengan <strong>auto-script.sh</strong>.
            </p>
          </div>
        </div>
      </div>

      {errorMsg && (
        <div className="bg-red-500/15 border border-red-500/30 text-red-300 p-3.5 rounded-xl text-xs flex items-center gap-2.5">
          <AlertTriangle size={18} className="text-red-400 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Active Script Execution Loading Overlay Banner */}
      {Boolean(runningScript) && (
        <div className="animated-executing-card rounded-2xl p-5.5 flex items-center gap-4.5 transition-all">
          <div className="bg-cyan-500/20 p-3.5 rounded-full flex items-center justify-center">
            <Loader2 className="animate-spin text-cyan-400" size={32} />
          </div>
          <div className="flex-1">
            <h4 className="text-base font-bold text-white flex items-center gap-2">
              ⚡ Sedang Mengeksekusi Skrip pada Server VPS...
            </h4>
            <div className="text-xs text-cyan-400 font-semibold mt-1">
              {runningScript === 'combo' ? (
                comboStep === 'killing' 
                  ? '🔄 [Langkah 1/2]: Mengeksekusi kill-process.sh (Mematikan service lama)...' 
                  : '🚀 [Langkah 2/2]: Mengeksekusi auto-script.sh (Menyalakan service baru)...'
              ) : (
                `🚀 Mengeksekusi ${runningScript} via SSH...`
              )}
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              Mohon tunggu, proses SSH sedang memproses perintah di server (`/home/pod/scripts/exec/`).
            </p>
          </div>
        </div>
      )}

      {/* Sequential Combo Banner (Kill Process -> Auto Script) */}
      <div className={`p-5 rounded-2xl border flex items-center justify-between flex-wrap gap-4 transition-all ${
        runningScript === 'combo'
          ? 'animated-executing-card'
          : 'bg-gradient-to-r from-amber-500/10 to-red-500/10 border-amber-500/30'
      }`}>
        <div className="flex items-center gap-3">
          <div className="bg-amber-500/20 p-3 rounded-xl flex items-center justify-center">
            {runningScript === 'combo' ? (
              <Loader2 className="animate-spin text-amber-400" size={24} />
            ) : (
              <Zap className="text-amber-400" size={24} />
            )}
          </div>
          <div>
            <h4 className="text-base font-bold text-white">
              ⚡ Eksekusi Otomatis Berurutan (Combo)
            </h4>
            <p className="text-xs text-slate-400 mt-0.5">
              Jalankan <strong>1. kill-process.sh</strong> lalu otomatis dilanjutkan <strong>2. auto-script.sh</strong> secara berurutan.
            </p>
          </div>
        </div>

        <button
          onClick={handleRunSequentialCombo}
          disabled={Boolean(runningScript)}
          className={`px-5 py-2.5 rounded-xl font-extrabold text-xs flex items-center gap-2 shadow-lg transition-all cursor-pointer ${
            runningScript === 'combo'
              ? 'bg-gradient-to-r from-red-500 to-amber-500 text-white shadow-red-500/20'
              : 'bg-gradient-to-r from-amber-400 to-amber-600 hover:from-amber-300 hover:to-amber-500 text-slate-950 shadow-amber-500/25'
          } ${runningScript ? 'opacity-60 cursor-not-allowed' : ''}`}
        >
          {runningScript === 'combo' ? (
            <>
              <Loader2 className="animate-spin" size={18} />
              <span>Memproses Combo...</span>
            </>
          ) : (
            <>
              <Zap size={18} />
              <span>JALANKAN COMBO (Kill ➔ AutoScript)</span>
            </>
          )}
        </button>
      </div>

      {/* Script Execution Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4.5">

        {/* Card 1: kill-process.sh */}
        <div className={`glass-card p-6 rounded-2xl flex flex-col justify-between border transition-all ${
          runningScript === 'kill-process.sh'
            ? 'animated-executing-danger'
            : 'border-red-500/20 bg-red-500/5 hover:border-red-500/30'
        }`}>
          <div>
            <div className="flex items-center gap-3 mb-3">
              <div className="bg-red-500/20 p-2.5 rounded-xl">
                {runningScript === 'kill-process.sh' ? (
                  <Loader2 className="animate-spin text-red-400" size={22} />
                ) : (
                  <Square className="text-red-400" size={22} />
                )}
              </div>
              <div>
                <span className="text-[10px] font-bold text-red-400 uppercase tracking-wider">
                  Langkah 1: Terminate Services
                </span>
                <h4 className="text-lg font-bold text-white font-mono">
                  kill-process.sh
                </h4>
              </div>
            </div>

            <p className="text-xs text-slate-400 mb-3">
              Mematikan seluruh proses atau service lama yang sedang berjalan di server POD.
            </p>

            <div className="bg-black/40 border border-slate-800 p-2.5 rounded-lg text-xs font-mono text-slate-400 mb-4">
              Path: <span className="text-red-300">/home/pod/scripts/exec/kill-process.sh</span>
            </div>
          </div>

          <button
            onClick={() => handleRunScript('kill-process.sh')}
            disabled={Boolean(runningScript)}
            className={`w-full py-2.5 px-4 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
              runningScript === 'kill-process.sh'
                ? 'bg-red-500/30 text-red-300 border border-red-500/40'
                : 'bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/30'
            } ${runningScript ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {runningScript === 'kill-process.sh' ? (
              <>
                <Loader2 className="animate-spin" size={16} />
                <span>Mengeksekusi Kill Process...</span>
              </>
            ) : (
              <>
                <Square size={16} />
                <span>Jalankan kill-process.sh</span>
              </>
            )}
          </button>
        </div>

        {/* Card 2: auto-script.sh */}
        <div className={`glass-card p-6 rounded-2xl flex flex-col justify-between border transition-all ${
          runningScript === 'auto-script.sh'
            ? 'animated-executing-primary'
            : 'border-cyan-500/20 bg-cyan-500/5 hover:border-cyan-500/30'
        }`}>
          <div>
            <div className="flex items-center gap-3 mb-3">
              <div className="bg-cyan-500/20 p-2.5 rounded-xl">
                {runningScript === 'auto-script.sh' ? (
                  <Loader2 className="animate-spin text-cyan-400" size={22} />
                ) : (
                  <Play className="text-cyan-400" size={22} />
                )}
              </div>
              <div>
                <span className="text-[10px] font-bold text-cyan-400 uppercase tracking-wider">
                  Langkah 2: Auto Start Services
                </span>
                <h4 className="text-lg font-bold text-white font-mono">
                  auto-script.sh
                </h4>
              </div>
            </div>

            <p className="text-xs text-slate-400 mb-3">
              Mulai ulang dan aktifkan otomatis seluruh service & aplikasi POD di server.
            </p>

            <div className="bg-black/40 border border-slate-800 p-2.5 rounded-lg text-xs font-mono text-slate-400 mb-4">
              Path: <span className="text-cyan-300">/home/pod/scripts/exec/auto-script.sh</span>
            </div>
          </div>

          <button
            onClick={() => handleRunScript('auto-script.sh')}
            disabled={Boolean(runningScript)}
            className={`w-full py-2.5 px-4 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
              runningScript === 'auto-script.sh'
                ? 'bg-cyan-500/30 text-cyan-300 border border-cyan-500/40'
                : 'bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-400 border border-cyan-500/30'
            } ${runningScript ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {runningScript === 'auto-script.sh' ? (
              <>
                <Loader2 className="animate-spin" size={16} />
                <span>Mengeksekusi Auto Script...</span>
              </>
            ) : (
              <>
                <Play size={16} />
                <span>Jalankan auto-script.sh</span>
              </>
            )}
          </button>
        </div>

      </div>

      {/* Script Execution Console Modal Output */}
      <ScriptOutputModal
        isOpen={Boolean(execResult)}
        onClose={() => setExecResult(null)}
        scriptName={activeScriptName}
        execResult={execResult}
      />

    </div>
  );
}
