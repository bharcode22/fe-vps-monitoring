import React, { useState, useEffect } from 'react';

const OlfactoryCardRenderer = ({ data, def, Icon, textColor, bgColor, borderColor }) => {
  const [remaining, setRemaining] = useState(0);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (!data?.payload || !data?.timestamp) return;
    try {
      const parsed = JSON.parse(data.payload);
      const widthMs = Number(parsed.width || 0);
      if (widthMs > 0) {
        const interval = setInterval(() => {
          const elapsed = Date.now() - data.timestamp;
          const left = Math.max(0, widthMs - elapsed);
          setRemaining(left);
          setProgress(Math.max(0, Math.min(100, (left / widthMs) * 100)));
          if (left === 0) clearInterval(interval);
        }, 100);
        return () => clearInterval(interval);
      } else {
        setRemaining(0);
        setProgress(0);
      }
    } catch (_) { }
  }, [data]);

  let scentLabel = 'Unknown';
  let widthLabel = '0ms';
  try {
    if (data?.payload && typeof data.payload === 'string') {
      const p = JSON.parse(data.payload);
      scentLabel = p.scent !== undefined ? String(p.scent) : 'Unknown';
      widthLabel = p.width !== undefined ? `${p.width}ms` : '0ms';
    }
  } catch (_) { }

  return (
    <div className={`flex flex-col p-3 rounded-xl border transition-all duration-300 ${bgColor} ${borderColor} h-full relative overflow-hidden`}>
      <div className="flex items-center justify-between mb-2 relative z-10">
        <div className="flex items-center gap-1.5 opacity-70">
          <Icon size={12} className={textColor} />
          <span className="text-[9px] font-bold uppercase tracking-wider text-slate-500">{def.module}</span>
        </div>
      </div>
      <h4 className={`text-xs font-semibold mb-2 truncate ${textColor} relative z-10`} title={def.key}>
        {def.label}
      </h4>
      <div className="flex flex-col gap-1 relative z-10">
        <span className="font-mono text-xs font-bold text-white">
          Scent ID: <span className="text-cyan-300">{scentLabel}</span>
        </span>
        <span className="text-[10px] text-slate-400">Durasi: {widthLabel}</span>
      </div>

      {remaining > 0 && (
        <div className="mt-auto pt-3 relative z-10">
          <div className="flex justify-between items-center text-[9px] font-mono mb-1.5">
            <span className="text-emerald-400 font-bold animate-pulse">Menyemprot...</span>
            <span className="text-amber-400 font-bold">{(remaining / 1000).toFixed(1)}s</span>
          </div>
          <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden shadow-inner">
            <div
              className="h-full bg-gradient-to-r from-emerald-500 via-teal-400 to-cyan-400 transition-all duration-100 ease-linear shadow-[0_0_8px_rgba(52,211,153,0.5)]"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {remaining === 0 && data?.payload && (
        <div className="mt-auto pt-3 text-[9px] text-slate-500 italic relative z-10">
          Selesai / Standby
        </div>
      )}

      {!data?.payload && (
        <div className="mt-auto pt-3 text-[10px] text-slate-600 italic">
          Menunggu data...
        </div>
      )}
    </div>
  );
};

export default OlfactoryCardRenderer;
