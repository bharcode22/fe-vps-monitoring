import React, { useRef, useEffect } from 'react';
import { Plus, ChevronDown, Server, Database } from 'lucide-react';

export default function NavbarAddMenu({
  isOpen,
  onToggle,
  onClose,
  onOpenAddServer,
  onOpenAddService
}) {
  const addMenuRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (addMenuRef.current && !addMenuRef.current.contains(event.target)) {
        onClose();
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, onClose]);

  return (
    <div className="relative" ref={addMenuRef}>
      <button
        onClick={onToggle}
        className="bg-gradient-to-r from-cyan-400 to-blue-500 hover:from-cyan-300 hover:to-blue-400 text-slate-950 px-3 py-1.5 rounded-xl font-extrabold text-xs flex items-center gap-1.5 shadow-md shadow-cyan-500/20 transition-all duration-200 cursor-pointer"
        title="Tambah VPS / Service Baru"
      >
        <Plus size={14} />
        <span>Tambah</span>
        <ChevronDown
          size={12}
          className={`transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-52 bg-slate-900/95 border border-cyan-500/30 rounded-2xl shadow-2xl p-1.5 z-50 animate-in fade-in zoom-in-95 duration-150 backdrop-blur-xl">
          <button
            onClick={() => {
              onOpenAddServer();
              onClose();
            }}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-slate-800/90 text-left transition-colors cursor-pointer group"
          >
            <div className="p-1.5 rounded-lg bg-cyan-500/15 border border-cyan-500/30 text-cyan-400 group-hover:bg-cyan-500/25 shrink-0">
              <Server size={15} />
            </div>
            <div>
              <div className="text-xs font-bold text-white group-hover:text-cyan-400 transition-colors">
                VPS / POD
              </div>
              <div className="text-[10px] text-slate-400">Server Linux via SSH</div>
            </div>
          </button>

          <button
            onClick={() => {
              onOpenAddService();
              onClose();
            }}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-slate-800/90 text-left transition-colors cursor-pointer group"
          >
            <div className="p-1.5 rounded-lg bg-sky-500/15 border border-sky-500/30 text-sky-400 group-hover:bg-sky-500/25 shrink-0">
              <Database size={15} />
            </div>
            <div>
              <div className="text-xs font-bold text-white group-hover:text-sky-400 transition-colors">
                DB &amp; Storage
              </div>
              <div className="text-[10px] text-slate-400">PostgreSQL, MinIO, S3</div>
            </div>
          </button>
        </div>
      )}
    </div>
  );
}
