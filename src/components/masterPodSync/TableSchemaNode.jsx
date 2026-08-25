import React, { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import { Table, ExternalLink, Link, GitFork, ShieldCheck, Crown } from 'lucide-react';

function TableSchemaNode({ data, selected, isConnectable }) {
  const {
    tableName,
    rowCount = 0,
    columnCount = 0,
    parents = [],
    children = [],
    relationType = 'standalone',
    isSelected,
    onSelectTable
  } = data;

  const isNodeSelected = selected || isSelected;
  const hasParents = parents.length > 0;
  const hasChildren = children.length > 0;

  return (
    <div
      className={`relative w-[340px] rounded-2xl p-4 transition-all duration-150 shadow-xl backdrop-blur-xl border select-none ${
        isNodeSelected
          ? 'bg-slate-900 border-cyan-400 ring-2 ring-cyan-400/50 shadow-cyan-500/25 scale-[1.02] z-30'
          : hasParents && hasChildren
          ? 'bg-slate-950/95 border-purple-500/60 hover:border-purple-400 hover:shadow-purple-500/20'
          : hasChildren && !hasParents
          ? 'bg-slate-950/95 border-emerald-500/60 hover:border-emerald-400 hover:shadow-emerald-500/20 shadow-emerald-500/5'
          : hasParents && !hasChildren
          ? 'bg-slate-950/95 border-indigo-500/50 hover:border-indigo-400 hover:shadow-indigo-500/20'
          : 'bg-slate-950/90 border-slate-800 hover:border-slate-700'
      }`}
    >
      {/* Target Handle (TOP) - for incoming relations from Parents above (Many-to-One / N) */}
      <Handle
        type="target"
        position={Position.Top}
        isConnectable={isConnectable}
        className="!w-3.5 !h-3.5 !bg-purple-400 !border-2 !border-slate-950 shadow-md !-top-1.5"
      />

      {/* Header */}
      <div className="flex items-start justify-between gap-2.5 pb-2.5 border-b border-slate-800/80">
        <div className="flex items-start gap-2.5 overflow-hidden flex-1 min-w-0">
          <div className={`p-2 rounded-xl border shrink-0 mt-0.5 ${
            hasChildren && !hasParents
              ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400'
              : hasParents && hasChildren
              ? 'bg-purple-500/15 border-purple-500/30 text-purple-400'
              : hasParents
              ? 'bg-indigo-500/15 border-indigo-500/30 text-indigo-400'
              : 'bg-cyan-500/15 border-cyan-500/30 text-cyan-400'
          }`}>
            {hasChildren && !hasParents ? <Crown size={15} /> : <Table size={15} />}
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="text-[13px] font-black text-white font-mono leading-snug break-words tracking-tight" title={tableName}>
              {tableName}
            </h4>
            <div className="text-[11px] text-slate-400 font-mono mt-0.5">
              <strong className="text-cyan-300 font-semibold">{rowCount}</strong> baris &bull; <strong className="text-slate-300 font-semibold">{columnCount}</strong> kolom
            </div>
          </div>
        </div>

        {/* Action Button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            if (onSelectTable) onSelectTable(tableName);
          }}
          className="p-1.5 rounded-lg bg-slate-800/90 hover:bg-cyan-500/20 hover:text-cyan-300 text-slate-400 border border-slate-700/80 transition-all cursor-pointer hover:scale-110 shrink-0"
          title="Buka Workspace Tabel Ini"
        >
          <ExternalLink size={13} />
        </button>
      </div>

      {/* Relations & Cardinality Badges */}
      <div className="mt-2.5 flex flex-col gap-1.5 text-[11px] font-sans">
        {/* Outgoing to Children: ONE TO MANY (1:N) */}
        {hasChildren && (
          <div
            className="flex items-center justify-between gap-1.5 text-emerald-300 bg-emerald-950/50 px-2.5 py-1.5 rounded-lg border border-emerald-500/30"
            title={`Tabel Induk: 1 baris di ${tableName} dapat dirujuk banyak (N) baris anak`}
          >
            <div className="flex items-center gap-1.5 truncate">
              <GitFork size={12} className="shrink-0 text-emerald-400" />
              <span className="truncate">Induk ke <strong>{children.length} Tabel Anak</strong></span>
            </div>
            <span className="text-[10px] font-mono font-black px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shrink-0">
              1 : N
            </span>
          </div>
        )}

        {/* Incoming from Parents: MANY TO ONE (N:1) */}
        {hasParents && (
          <div
            className="flex items-center justify-between gap-1.5 text-purple-300 bg-purple-950/50 px-2.5 py-1.5 rounded-lg border border-purple-500/30"
            title={`Tabel Anak: baris di sini memiliki rujukan ke tabel induk: ${parents.map(p => p.foreignTableName).join(', ')}`}
          >
            <div className="flex items-center gap-1.5 truncate">
              <Link size={12} className="shrink-0 text-purple-400" />
              <span className="truncate">Induk: <strong className="font-mono text-purple-200">{parents.map(p => p.foreignTableName).join(', ')}</strong></span>
            </div>
            <span className="text-[10px] font-mono font-black px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/40 shrink-0">
              N : 1
            </span>
          </div>
        )}

        {!hasParents && !hasChildren && (
          <div className="flex items-center gap-1.5 text-slate-400 bg-slate-900/60 px-2.5 py-1 rounded-lg border border-slate-800/60">
            <ShieldCheck size={12} className="text-slate-500" />
            <span>Tabel Mandiri (Standalone)</span>
          </div>
        )}
      </div>

      {/* Source Handle (BOTTOM) - for outgoing relations to Children below (One-to-Many / 1) */}
      <Handle
        type="source"
        position={Position.Bottom}
        isConnectable={isConnectable}
        className="!w-3.5 !h-3.5 !bg-emerald-400 !border-2 !border-slate-950 shadow-md !-bottom-1.5"
      />
    </div>
  );
}

export default memo(TableSchemaNode);
