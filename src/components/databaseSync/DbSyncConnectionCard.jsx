import React from 'react';
import { RefreshCw, CheckCircle2, XCircle } from 'lucide-react';

export default function DbSyncConnectionCard({
  type, // 'source' | 'target'
  url,
  setUrl,
  selectedId,
  onSelectServer,
  pgServers = [],
  isTesting,
  onTestConnection,
  testResult
}) {
  const isSource = type === 'source';
  const themeColor = isSource ? 'cyan' : 'blue';

  const cardBorder = isSource ? 'border-cyan-500/30' : 'border-blue-500/30';
  const titleColor = isSource ? 'text-cyan-400' : 'text-blue-400';
  const dotBg = isSource ? 'bg-cyan-400' : 'bg-blue-400';
  const inputBorder = isSource ? 'focus:border-cyan-500 text-cyan-300' : 'focus:border-blue-500 text-blue-300';
  const testBtnClass = isSource
    ? 'bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-400 border-cyan-500/30'
    : 'bg-blue-500/15 hover:bg-blue-500/25 text-blue-400 border-blue-500/30';

  const titleText = isSource ? 'Source Database (Sumber)' : 'Target Database (Tujuan)';
  const testBtnText = isSource ? 'Cek Koneksi Source' : 'Cek Koneksi Target';
  const placeholderText = isSource
    ? 'postgres://username:password@localhost:5432/dbname'
    : 'postgres://username:password@remote-host:5432/dbname';

  return (
    <div className={`bg-slate-900/90 border ${cardBorder} rounded-2xl p-5 shadow-xl backdrop-blur-xl`}>
      {/* Card Header & Server Dropdown */}
      <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <span className={`w-3 h-3 rounded-full ${dotBg} animate-pulse`}></span>
          <h3 className={`text-sm font-bold ${titleColor} uppercase tracking-wider`}>
            {titleText}
          </h3>
        </div>
        {pgServers.length > 0 && (
          <select
            onChange={onSelectServer}
            value={selectedId}
            className="bg-slate-950 text-slate-300 border border-slate-800 rounded-lg px-2.5 py-1 text-xs outline-none focus:border-cyan-500"
          >
            <option value="">-- Pilih DB Terdaftar --</option>
            {pgServers.map(s => (
              <option key={s.id} value={s.id}>
                {s.name} ({s.host}:{s.port})
              </option>
            ))}
            <option value="custom">-- Input Connection String Manual --</option>
          </select>
        )}
      </div>

      {/* Input Label & Test Button */}
      <div className="flex items-center justify-between mb-1.5">
        <label className="text-[11px] font-semibold text-slate-400">
          PostgreSQL Connection String:
        </label>
        <button
          type="button"
          onClick={onTestConnection}
          disabled={isTesting || !url}
          className={`disabled:opacity-50 border px-2.5 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1.5 transition-all cursor-pointer ${testBtnClass}`}
        >
          <RefreshCw size={12} className={isTesting ? 'animate-spin' : ''} />
          <span>{isTesting ? 'Menguji...' : testBtnText}</span>
        </button>
      </div>

      {/* Connection String Input */}
      <input
        type="text"
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        placeholder={placeholderText}
        className={`w-full bg-slate-950 border border-slate-800 text-xs px-3 py-2.5 rounded-xl outline-none transition-all font-mono ${inputBorder}`}
      />

      {/* Test Status Indicator */}
      {testResult && (
        <div
          className={`mt-3 p-3 rounded-xl border text-xs flex items-center justify-between ${
            testResult.success
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
              : 'bg-red-500/10 border-red-500/30 text-red-400'
          }`}
        >
          <div className="flex items-center gap-2">
            {testResult.success ? <CheckCircle2 size={16} /> : <XCircle size={16} />}
            <div>
              <span className="font-bold">
                {testResult.database || (testResult.success ? 'Database Terhubung' : 'Gagal Terhubung')}
              </span>
              <span className="text-[11px] opacity-80 block">
                {testResult.user || ''} {testResult.host ? `@ ${testResult.host}` : ''} {testResult.error || ''}
              </span>
            </div>
          </div>
          {testResult.latencyMs !== undefined && (
            <span className="text-[11px] font-mono bg-black/40 px-2 py-0.5 rounded-md border border-current">
              {testResult.latencyMs} ms
            </span>
          )}
        </div>
      )}
    </div>
  );
}
