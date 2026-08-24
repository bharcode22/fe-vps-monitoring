import React from 'react';
import { AlertTriangle, ChevronDown, ChevronUp, Info, XCircle, CheckCircle2 } from 'lucide-react';

export default function DbSyncCompareTab({
  schemaResult,
  expandedSection,
  setExpandedSection
}) {
  if (!schemaResult) return null;

  return (
    <div className="space-y-4">
      {/* 1. Different Schema Accordion */}
      {schemaResult.differentSchema?.length > 0 && (
        <div className="bg-slate-900/90 border border-amber-500/30 rounded-2xl p-5 shadow-xl">
          <div
            className="flex items-center justify-between cursor-pointer mb-3"
            onClick={() =>
              setExpandedSection(expandedSection === 'different' ? '' : 'different')
            }
          >
            <div className="flex items-center gap-2 text-amber-400 font-bold text-sm">
              <AlertTriangle size={18} />
              <span>
                Tabel dengan Perbedaan Kolom / Tipe Data ({schemaResult.differentSchema.length})
              </span>
            </div>
            {expandedSection === 'different' ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
          </div>

          {expandedSection === 'different' && (
            <div className="space-y-3 mt-3">
              {schemaResult.differentSchema.map(item => (
                <div
                  key={item.tableName}
                  className="bg-slate-950 p-4 rounded-xl border border-slate-800 text-xs"
                >
                  <div className="flex justify-between font-bold text-slate-200 mb-2">
                    <span>📋 {item.tableName}</span>
                    <span className="text-slate-400 font-normal">
                      Rows: Source ({item.sourceRowCount}) vs Target ({item.targetRowCount})
                    </span>
                  </div>
                  <ul className="space-y-1.5 text-slate-300">
                    {item.differences?.map((diff, idx) => (
                      <li
                        key={idx}
                        className="bg-amber-500/10 text-amber-300 p-2 rounded-lg border border-amber-500/20 flex items-start gap-2"
                      >
                        <Info size={14} className="shrink-0 mt-0.5" />
                        <span>{diff.detail}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 2. Missing In Target Accordion */}
      {schemaResult.missingInTarget?.length > 0 && (
        <div className="bg-slate-900/90 border border-red-500/30 rounded-2xl p-5 shadow-xl">
          <div
            className="flex items-center justify-between cursor-pointer mb-3"
            onClick={() =>
              setExpandedSection(expandedSection === 'missing' ? '' : 'missing')
            }
          >
            <div className="flex items-center gap-2 text-red-400 font-bold text-sm">
              <XCircle size={18} />
              <span>Tabel Hilang di Target ({schemaResult.missingInTarget.length})</span>
            </div>
            {expandedSection === 'missing' ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
          </div>

          {expandedSection === 'missing' && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-3">
              {schemaResult.missingInTarget.map(item => (
                <div
                  key={item.tableName}
                  className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-xs flex justify-between items-center"
                >
                  <span className="font-bold text-red-300">🚫 {item.tableName}</span>
                  <span className="text-slate-500 text-[11px]">{item.sourceRowCount} baris</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 3. Identical Tables Accordion */}
      {schemaResult.identical?.length > 0 && (
        <div className="bg-slate-900/90 border border-emerald-500/30 rounded-2xl p-5 shadow-xl">
          <div
            className="flex items-center justify-between cursor-pointer mb-3"
            onClick={() =>
              setExpandedSection(expandedSection === 'identical' ? '' : 'identical')
            }
          >
            <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
              <CheckCircle2 size={18} />
              <span>Tabel Skema Identik Cocok ({schemaResult.identical.length})</span>
            </div>
            {expandedSection === 'identical' ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
          </div>

          {expandedSection === 'identical' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 mt-3">
              {schemaResult.identical.map(item => (
                <div
                  key={item.tableName}
                  className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-xs flex justify-between items-center"
                >
                  <div>
                    <span className="font-bold text-emerald-300 block">✓ {item.tableName}</span>
                    <span className="text-[10px] text-slate-500">{item.columnsCount} kolom</span>
                  </div>
                  <div className="text-right text-[11px]">
                    <span className="text-cyan-400 font-mono block">{item.sourceRowCount} S</span>
                    <span className="text-blue-400 font-mono block">{item.targetRowCount} T</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
