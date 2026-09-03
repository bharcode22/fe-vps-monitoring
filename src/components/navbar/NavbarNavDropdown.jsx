import React, { useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';
import { isGroupActive, getActiveGroupItemLabel } from './navConfig';

export default function NavbarNavDropdown({
  group,
  currentView,
  onNavigateView,
  isOpen,
  onToggle,
  onClose
}) {
  const dropdownRef = useRef(null);
  const GroupIcon = group.icon;
  const active = isGroupActive(group, currentView);
  const activeLabel = getActiveGroupItemLabel(group, currentView);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        onClose();
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, onClose]);

  // Dynamic theme colors
  const activeStyles = {
    amber: 'bg-gradient-to-r from-amber-500/25 to-orange-500/25 text-amber-300 border-amber-500/40',
    cyan: 'bg-gradient-to-r from-cyan-500/25 to-blue-500/25 text-cyan-300 border-cyan-500/40',
    purple: 'bg-gradient-to-r from-purple-500/25 to-indigo-500/25 text-purple-300 border-purple-500/40'
  }[group.color] || 'bg-slate-800 text-cyan-300 border-cyan-500/40';

  const iconColor = {
    amber: 'text-amber-400',
    cyan: 'text-cyan-400',
    purple: 'text-purple-400'
  }[group.color] || 'text-cyan-400';

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Dropdown Button */}
      <button
        onClick={onToggle}
        className={`px-2.5 xl:px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer border ${active
          ? `${activeStyles} shadow-sm`
          : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60 border-transparent'
          }`}
      >
        <GroupIcon size={14} className={active ? iconColor : 'text-slate-500'} />
        <span>{active ? activeLabel : group.label}</span>
        <ChevronDown
          size={12}
          className={`transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {/* Dropdown Menu Content */}
      {isOpen && (
        <div className="absolute left-0 mt-2 w-64 bg-slate-900/95 border border-slate-700/60 rounded-2xl shadow-2xl p-1.5 z-50 animate-in fade-in zoom-in-95 duration-150 backdrop-blur-xl">
          {/* Section Header */}
          <div className="px-2.5 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
            <span>{group.label}</span>
            {group.badge && (
              <span className="text-[9px] font-mono font-bold px-1.5 py-0.2 rounded bg-slate-800 text-slate-400">
                {group.badge}
              </span>
            )}
          </div>

          {/* Group Items */}
          <div className="flex flex-col gap-0.5 mt-0.5">
            {group.items.map((item) => {
              const ItemIcon = item.icon;
              const isItemActive =
                currentView === item.id ||
                (item.aliases && item.aliases.includes(currentView));

              return (
                <button
                  key={item.id}
                  onClick={() => {
                    onNavigateView(item.id);
                    onClose();
                  }}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-left transition-colors cursor-pointer text-xs font-bold border ${isItemActive
                    ? item.bgActiveClass
                    : 'text-slate-300 hover:bg-slate-800/80 hover:text-white border-transparent'
                    }`}
                >
                  <ItemIcon size={15} className={`${item.colorClass} shrink-0`} />
                  <div className="flex-1 overflow-hidden">
                    <div className="flex items-center gap-1.5 truncate">
                      <span className="truncate">{item.label}</span>
                      {item.badge && (
                        <span className="text-[9px] font-mono font-bold px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 uppercase tracking-wider shrink-0">
                          {item.badge}
                        </span>
                      )}
                    </div>
                    {item.desc && (
                      <div className="text-[10px] text-slate-400 font-normal truncate">
                        {item.desc}
                      </div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
