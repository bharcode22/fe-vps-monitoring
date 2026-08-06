import React, { useState, useEffect } from 'react';
import { Tv, RefreshCw, CheckCircle2, XCircle, Monitor } from 'lucide-react';
import { fetchDockerContainersApi } from '../../api/vpsApi';

export default function ScreenAppsTab({ serverId }) {
  const [apps, setApps] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const loadScreenApps = async () => {
    setIsLoading(true);
    setError('');
    try {
      const data = await fetchDockerContainersApi(serverId);
      const list = Array.isArray(data) ? data : [];

      const screenAppNames = ['small-screen', 'big-screen'];
      const merged = screenAppNames.map(appName => {
        const found = list.find(a => (a.name || '').toLowerCase().includes(appName));
        if (found) return found;
        return {
          id: `sys-${appName}`,
          name: appName,
          image: `Native GUI App (/usr/lib/${appName})`,
          status: 'Exited (0)',
          state: 'exited',
          ports: 'System App',
          isSystemApp: true
        };
      });

      setApps(merged);
    } catch (err) {
      setError(err.message || 'Gagal memuat status Screen Apps');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (serverId) loadScreenApps();
  }, [serverId]);

  return (
    <div className="space-y-4">
      {/* Header Bar */}
      <div className="flex items-center justify-between bg-slate-900/80 p-4 border border-slate-800 rounded-2xl">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 rounded-xl">
            <Tv size={20} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <span>Status Aplikasi Layar (Screen Apps)</span>
              <span className="text-[10px] bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 px-2 py-0.5 rounded-full font-mono font-bold">
                Linux Native GUI
              </span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Pemantauan status real-time aplikasi desktop GUI <code className="text-indigo-300 font-mono">small-screen</code> dan <code className="text-indigo-300 font-mono">big-screen</code>
            </p>
          </div>
        </div>

        <button
          onClick={loadScreenApps}
          disabled={isLoading}
          className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold border border-slate-700 flex items-center gap-1.5 transition-all cursor-pointer"
        >
          <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
          <span>Refresh</span>
        </button>
      </div>

      {error && (
        <div className="p-3 bg-red-500/10 border border-red-500/30 text-red-400 text-xs rounded-xl">
          {error}
        </div>
      )}

      {/* Screen App Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {apps.map(app => {
          const isRunning = (app.state || '').toLowerCase() === 'running' || (app.status || '').toLowerCase().includes('up');

          return (
            <div
              key={app.name}
              className={`p-5 rounded-2xl border transition-all ${isRunning
                ? 'bg-slate-900/90 border-emerald-500/30 shadow-lg shadow-emerald-500/5'
                : 'bg-slate-900/60 border-red-500/30'
                }`}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className={`p-3 rounded-xl border ${isRunning
                    ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400'
                    : 'bg-red-500/15 border-red-500/30 text-red-400'
                    }`}>
                    <Monitor size={22} />
                  </div>
                  <div>
                    <h4 className="text-base font-bold text-white font-mono flex items-center gap-2">
                      <span>{app.name}</span>
                      <span className="text-[10px] bg-slate-800 text-slate-300 border border-slate-700 px-2 py-0.5 rounded font-sans">
                        GUI App
                      </span>
                    </h4>
                    <p className="text-xs text-slate-400 font-mono mt-0.5">
                      /usr/lib/{app.name}/{app.name}
                    </p>
                  </div>
                </div>

                <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${isRunning
                  ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400'
                  : 'bg-red-500/15 border-red-500/30 text-red-400'
                  }`}>
                  {isRunning ? <CheckCircle2 size={14} /> : <XCircle size={14} />}
                  <span>{isRunning ? 'RUNNING' : 'STOPPED'}</span>
                </div>
              </div>

              <div className="bg-slate-955 p-3 rounded-xl border border-slate-800 text-xs font-mono text-slate-400 flex justify-between items-center">
                <span>Status:</span>
                <span className={isRunning ? 'text-emerald-400 font-bold' : 'text-red-400 font-bold'}>
                  {app.status || (isRunning ? 'Up (running)' : 'Exited')}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
