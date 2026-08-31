import React, { useState, useEffect } from 'react';

const CircularLevelControl = ({ topic, data, label, Icon, textColor, bgColor, borderColor, defaultVal = 0 }) => {
  const [localVal, setLocalVal] = useState(data ? data.payload : defaultVal);

  useEffect(() => {
    if (data) setLocalVal(data.payload);
  }, [data]);

  const percentage = Math.max(0, Math.min(100, Number(localVal) || 0));
  const radius = 30;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  return (
    <div className={`flex flex-col p-3 rounded-xl border transition-all duration-300 ${bgColor} ${borderColor} h-full relative`}>
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-1.5 opacity-70">
          <Icon size={12} className={textColor} />
          <span className="text-[9px] font-bold uppercase tracking-wider text-slate-500">Audio</span>
        </div>
      </div>

      <h4 className={`text-xs font-semibold mb-3 text-center ${textColor}`}>
        {label}
      </h4>

      <div className="relative flex flex-col items-center justify-center flex-1 pb-4">
        <div className="relative flex items-center justify-center mb-2">
          <svg width="80" height="80" viewBox="0 0 80 80" className="transform -rotate-90">
            <circle cx="40" cy="40" r="30" stroke="#1e293b" strokeWidth="6" fill="none" />
            <circle
              cx="40"
              cy="40"
              r="30"
              stroke="currentColor"
              strokeWidth="6"
              fill="none"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              className={`transition-all duration-300 ${textColor}`}
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center flex-col pointer-events-none">
            <span className="text-lg font-bold text-white">{percentage}</span>
            <span className="text-[8px] text-slate-400">%</span>
          </div>
        </div>

        <span className="text-[9px] text-slate-500 absolute bottom-0">
          {data ? new Date(data.timestamp).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : 'Menunggu...'}
        </span>
      </div>
    </div>
  );
};

export default CircularLevelControl;
