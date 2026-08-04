import React from 'react';
import { Server, Activity, ShieldCheck, Cpu } from 'lucide-react';

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="w-full mt-12 border-t border-slate-800/80 bg-slate-950/60 backdrop-blur-md py-6 px-4 md:px-8">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-400">

        {/* Left Side: Brand & Status Indicator */}
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
            <Server size={18} />
          </div>
          <div>
            <div className="flex items-center gap-2 font-bold text-slate-200 text-sm">
              <span>VPS Server Monitoring</span>
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-1.5">
              <span className="live-dot online w-1.5 h-1.5"></span>
              <span>Real-time Telemetry & Infrastructure Management</span>
            </div>
          </div>
        </div>

        {/* Center / Right Side: Copyright & Info */}
        <div className="flex items-center gap-4 text-slate-400 font-medium">
          <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
            <ShieldCheck size={14} className="text-emerald-400" />
            <span>Secure Enterprise Monitoring</span>
          </div>
          <span className="hidden sm:inline text-slate-700">•</span>
          <div className="text-[11px]">
            &copy; {currentYear} Infrastructure Dashboard. All rights reserved.
          </div>
        </div>

      </div>
    </footer>
  );
}
