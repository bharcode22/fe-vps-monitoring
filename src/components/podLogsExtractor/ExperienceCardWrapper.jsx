import React, { useState } from 'react';
import {
  ChevronDown,
  ChevronUp,
  Maximize2,
  Minimize2,
  Columns2,
  Square,
  X
} from 'lucide-react';

export default function ExperienceCardWrapper({
  id,
  title,
  subtitle,
  icon: Icon,
  badge,
  badgeColor = 'bg-purple-500/20 text-purple-300 border-purple-500/30',
  size = 'half', // 'half' | 'full'
  onToggleSize,
  isCollapsed = false,
  onToggleCollapse,
  headerActions,
  children,
  className = ''
}) {
  const [isMaximized, setIsMaximized] = useState(false);

  // Column span classes
  const spanClass = size === 'full' ? 'col-span-1 md:col-span-2' : 'col-span-1';

  return (
    <>
      <div
        className={`bg-slate-900/60 border border-slate-800/80 rounded-2xl shadow-xl backdrop-blur-md transition-all duration-300 flex flex-col ${spanClass} ${className}`}
      >
        {/* Card Header */}
        <div className="flex items-center justify-between gap-3 p-4 sm:p-5 border-b border-slate-800/80">
          <div className="flex items-center gap-2.5 min-w-0">
            {Icon && (
              <div className="p-2 rounded-xl bg-slate-950/60 border border-slate-800 text-purple-400 shrink-0">
                <Icon size={18} />
              </div>
            )}
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-sm sm:text-base font-bold text-white tracking-wide truncate">
                  {title}
                </h3>
                {badge && (
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border shrink-0 ${badgeColor}`}>
                    {badge}
                  </span>
                )}
              </div>
              {subtitle && (
                <p className="text-xs text-slate-400 truncate mt-0.5">{subtitle}</p>
              )}
            </div>
          </div>

          {/* Header Controls (Adjust Size, Maximize, Collapse) */}
          <div className="flex items-center gap-1.5 shrink-0">
            {headerActions}

            {/* Width Toggle (Half <-> Full) */}
            {onToggleSize && (
              <button
                type="button"
                onClick={() => onToggleSize(id)}
                className="hidden sm:flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-950/60 hover:bg-slate-800 border border-slate-800 text-[11px] font-semibold text-slate-300 hover:text-white transition-colors"
                title={size === 'full' ? 'Ubah ke Setengah Lebar (1/2)' : 'Ubah ke Lebar Penuh (100%)'}
              >
                {size === 'full' ? (
                  <>
                    <Columns2 size={13} className="text-cyan-400" />
                    <span>1/2</span>
                  </>
                ) : (
                  <>
                    <Square size={13} className="text-purple-400" />
                    <span>Full</span>
                  </>
                )}
              </button>
            )}

            {/* Maximize Popout Button */}
            <button
              type="button"
              onClick={() => setIsMaximized(true)}
              className="p-1.5 rounded-lg bg-slate-950/60 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-white transition-colors"
              title="Perbesar ke Layar Penuh"
            >
              <Maximize2 size={13} />
            </button>

            {/* Minimize / Collapse Button */}
            {onToggleCollapse && (
              <button
                type="button"
                onClick={() => onToggleCollapse(id)}
                className="p-1.5 rounded-lg bg-slate-950/60 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-white transition-colors"
                title={isCollapsed ? 'Buka Card' : 'Tutup Card'}
              >
                {isCollapsed ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
              </button>
            )}
          </div>
        </div>

        {/* Card Body */}
        {!isCollapsed && (
          <div className="p-4 sm:p-5 flex-1 flex flex-col">{children}</div>
        )}
      </div>

      {/* Fullscreen Modal Dialog when Maximized */}
      {isMaximized && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-950/85 backdrop-blur-md animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-6xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-800 bg-slate-950/80">
              <div className="flex items-center gap-2.5">
                {Icon && (
                  <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
                    <Icon size={20} />
                  </div>
                )}
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <span>{title}</span>
                    {badge && (
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${badgeColor}`}>
                        {badge}
                      </span>
                    )}
                  </h3>
                  {subtitle && <p className="text-xs text-slate-400">{subtitle}</p>}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsMaximized(false)}
                  className="p-2 rounded-xl bg-slate-800 hover:bg-slate-750 border border-slate-700 text-slate-300 hover:text-white transition-colors"
                  title="Kembalikan Tampilan Normal"
                >
                  <Minimize2 size={16} />
                </button>
                <button
                  type="button"
                  onClick={() => setIsMaximized(false)}
                  className="p-2 rounded-xl bg-slate-800 hover:bg-rose-500/20 border border-slate-700 hover:border-rose-500/30 text-slate-400 hover:text-rose-300 transition-colors"
                  title="Tutup"
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-5 sm:p-6 overflow-y-auto flex-1">{children}</div>
          </div>
        </div>
      )}
    </>
  );
}
