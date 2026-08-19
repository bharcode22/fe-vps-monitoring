import React, { useState, useEffect } from 'react';
import {
  Table,
  Code,
  Plus,
  Trash2,
  Eye,
  EyeOff,
  Search,
  RotateCcw,
  Sparkles,
  Info,
  Copy,
  Check
} from 'lucide-react';

export default function EnvEditor({
  file,
  rawContent,
  setRawContent,
  isDirty,
  onReset
}) {
  const [editorMode, setEditorMode] = useState('grid'); // 'grid' or 'raw'
  const [showSecrets, setShowSecrets] = useState(false);
  const [filterQuery, setFilterQuery] = useState('');
  const [copiedKey, setCopiedKey] = useState(null);

  // Parsed structured items from rawContent
  const [parsedRows, setParsedRows] = useState([]);

  // Re-parse when rawContent changes
  useEffect(() => {
    const lines = (rawContent || '').split(/\r?\n/);
    const rows = [];

    lines.forEach((line, idx) => {
      const trimmed = line.trim();
      if (!trimmed) {
        rows.push({ id: idx, type: 'empty', raw: line });
        return;
      }
      if (trimmed.startsWith('#')) {
        rows.push({ id: idx, type: 'comment', value: trimmed.replace(/^#\s*/, ''), raw: line });
        return;
      }
      const match = line.match(/^\s*([A-Za-z0-9_]+)\s*=\s*(.*)$/);
      if (match) {
        const key = match[1];
        let value = match[2] || '';
        if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
          value = value.substring(1, value.length - 1);
        }
        rows.push({
          id: idx,
          type: 'variable',
          key,
          value,
          raw: line
        });
      } else {
        rows.push({ id: idx, type: 'raw', raw: line });
      }
    });

    setParsedRows(rows);
  }, [rawContent]);

  // Sync grid edits back to rawContent
  const handleUpdateRow = (id, newKey, newValue) => {
    const updated = parsedRows.map(row => {
      if (row.id === id) {
        return {
          ...row,
          key: newKey,
          value: newValue
        };
      }
      return row;
    });
    setParsedRows(updated);

    // Reconstruct raw text
    const text = updated
      .map(r => {
        if (r.type === 'comment') return `# ${r.value}`;
        if (r.type === 'empty') return '';
        if (r.type === 'variable') {
          const val = r.value || '';
          if (val.includes(' ') || val.includes('#') || val.includes('$') || val.includes('"') || val.includes("'")) {
            return `${r.key}="${val.replace(/"/g, '\\"')}"`;
          }
          return `${r.key}=${val}`;
        }
        return r.raw || '';
      })
      .join('\n');

    setRawContent(text);
  };

  // Add new variable
  const handleAddNewVariable = () => {
    const newId = Date.now();
    const newRow = { id: newId, type: 'variable', key: 'NEW_VARIABLE', value: '' };
    const updated = [...parsedRows, newRow];
    setParsedRows(updated);

    const text = (rawContent ? rawContent + '\n' : '') + 'NEW_VARIABLE=';
    setRawContent(text);
  };

  // Delete variable row
  const handleDeleteRow = (id) => {
    const updated = parsedRows.filter(r => r.id !== id);
    setParsedRows(updated);

    const text = updated
      .map(r => {
        if (r.type === 'comment') return `# ${r.value}`;
        if (r.type === 'empty') return '';
        if (r.type === 'variable') {
          const val = r.value || '';
          if (val.includes(' ') || val.includes('#') || val.includes('$') || val.includes('"') || val.includes("'")) {
            return `${r.key}="${val.replace(/"/g, '\\"')}"`;
          }
          return `${r.key}=${val}`;
        }
        return r.raw || '';
      })
      .join('\n');

    setRawContent(text);
  };

  const handleCopyValue = (key, value) => {
    navigator.clipboard.writeText(value || '');
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const isSecretKey = (keyName = '') => {
    const k = keyName.toLowerCase();
    return k.includes('secret') || k.includes('password') || k.includes('token') || k.includes('key') || k.includes('auth') || k.includes('pwd');
  };

  const filteredRows = parsedRows.filter(r => {
    if (r.type !== 'variable') return !filterQuery;
    if (!filterQuery) return true;
    return (
      (r.key && r.key.toLowerCase().includes(filterQuery.toLowerCase())) ||
      (r.value && r.value.toLowerCase().includes(filterQuery.toLowerCase()))
    );
  });

  const variableRowsCount = parsedRows.filter(r => r.type === 'variable').length;

  if (!file) {
    return (
      <div className="glass-card p-12 rounded-2xl border border-cyan-500/20 bg-slate-950/90 shadow-xl flex flex-col items-center justify-center text-center h-full min-h-[500px]">
        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 text-slate-500 mb-4">
          <Table size={32} />
        </div>
        <h3 className="text-base font-bold text-white mb-1">Pilih File Konfigurasi .env</h3>
        <p className="text-slate-400 text-xs max-w-sm">
          Pilih salah satu file dari panel sebelah kiri untuk melihat, mengedit variabel, atau beralih ke tab Diff Comparator.
        </p>
      </div>
    );
  }

  return (
    <div className="glass-card p-5 rounded-2xl border border-cyan-500/20 bg-slate-950/90 shadow-xl flex flex-col gap-4 h-full">
      {/* Editor Control Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-white">{file.name}</span>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-slate-800 text-slate-400 border border-slate-700">
            {variableRowsCount} Variabel
          </span>
          {isDirty && (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/30 animate-pulse">
              Ada perubahan belum disimpan
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Mode Switcher */}
          <div className="flex items-center bg-slate-900 p-0.5 rounded-xl border border-slate-800">
            <button
              onClick={() => setEditorMode('grid')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                editorMode === 'grid'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Table size={13} />
              <span>Grid Form</span>
            </button>
            <button
              onClick={() => setEditorMode('raw')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                editorMode === 'raw'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Code size={13} />
              <span>Raw Text</span>
            </button>
          </div>

          {/* Mask / Unmask Secrets */}
          {editorMode === 'grid' && (
            <button
              onClick={() => setShowSecrets(!showSecrets)}
              className="p-1.5 bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white rounded-lg border border-slate-800 transition-colors cursor-pointer text-xs flex items-center gap-1"
              title={showSecrets ? 'Sensor nilai rahasia' : 'Tampilkan nilai rahasia'}
            >
              {showSecrets ? <EyeOff size={14} /> : <Eye size={14} />}
            </button>
          )}

          {/* Reset Changes */}
          {isDirty && (
            <button
              onClick={onReset}
              className="p-1.5 bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white rounded-lg border border-slate-800 transition-colors cursor-pointer text-xs flex items-center gap-1"
              title="Batalkan perubahan"
            >
              <RotateCcw size={14} />
            </button>
          )}
        </div>
      </div>

      {/* Editor Body */}
      {editorMode === 'grid' ? (
        <div className="flex flex-col gap-3 flex-1">
          {/* Quick Search & Add Bar */}
          <div className="flex items-center justify-between gap-2">
            <div className="relative flex-1 max-w-xs">
              <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                value={filterQuery}
                onChange={(e) => setFilterQuery(e.target.value)}
                placeholder="Filter variabel..."
                className="w-full bg-slate-900 border border-slate-800 rounded-lg pl-8 pr-2.5 py-1 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/50"
              />
            </div>

            <button
              onClick={handleAddNewVariable}
              className="px-3 py-1 bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-300 border border-cyan-500/30 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Plus size={13} />
              <span>Tambah Variabel</span>
            </button>
          </div>

          {/* Table of Key-Value Items */}
          <div className="overflow-x-auto overflow-y-auto max-h-[550px] rounded-xl border border-slate-800 bg-slate-900/60 scrollbar-thin">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/80 sticky top-0 border-b border-slate-800 text-slate-400 text-[11px] uppercase tracking-wider font-mono">
                <tr>
                  <th className="py-2.5 px-3 w-12 text-center">#</th>
                  <th className="py-2.5 px-3 w-1/3">Variable Key</th>
                  <th className="py-2.5 px-3">Variable Value</th>
                  <th className="py-2.5 px-3 w-16 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono">
                {filteredRows.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-8 text-center text-slate-500 italic">
                      Tidak ada variabel yang sesuai.
                    </td>
                  </tr>
                ) : (
                  filteredRows.map((row, index) => {
                    if (row.type === 'comment') {
                      return (
                        <tr key={row.id} className="bg-slate-950/40 text-slate-500 italic text-[11px]">
                          <td className="py-1.5 px-3 text-center">{index + 1}</td>
                          <td colSpan={3} className="py-1.5 px-3">
                            # {row.value}
                          </td>
                        </tr>
                      );
                    }

                    if (row.type !== 'variable') return null;

                    const isSecret = isSecretKey(row.key);

                    return (
                      <tr key={row.id} className="hover:bg-slate-800/40 group transition-colors">
                        <td className="py-2 px-3 text-center text-slate-500 text-[10px]">
                          {index + 1}
                        </td>
                        <td className="py-2 px-3">
                          <input
                            type="text"
                            value={row.key || ''}
                            onChange={(e) => handleUpdateRow(row.id, e.target.value, row.value)}
                            className="w-full bg-transparent border-b border-transparent focus:border-cyan-500 focus:bg-slate-950/60 px-1 py-0.5 text-xs font-bold text-cyan-300 focus:outline-none transition-colors"
                            placeholder="VARIABLE_NAME"
                          />
                        </td>
                        <td className="py-2 px-3">
                          <div className="flex items-center gap-1.5">
                            <input
                              type={isSecret && !showSecrets ? 'password' : 'text'}
                              value={row.value || ''}
                              onChange={(e) => handleUpdateRow(row.id, row.key, e.target.value)}
                              className="w-full bg-slate-950/50 border border-slate-800 focus:border-cyan-500/60 rounded-lg px-2.5 py-1 text-xs text-slate-200 focus:outline-none transition-colors"
                              placeholder="value"
                            />
                            <button
                              onClick={() => handleCopyValue(row.key, row.value)}
                              className="p-1 text-slate-500 hover:text-slate-300 rounded transition-colors cursor-pointer"
                              title="Salin nilai"
                            >
                              {copiedKey === row.key ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
                            </button>
                          </div>
                        </td>
                        <td className="py-2 px-3 text-center">
                          <button
                            onClick={() => handleDeleteRow(row.id)}
                            className="p-1 text-slate-600 hover:text-rose-400 rounded transition-colors cursor-pointer opacity-0 group-hover:opacity-100"
                            title="Hapus variabel ini"
                          >
                            <Trash2 size={13} />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* Raw Text / Code Editor */
        <div className="flex flex-col gap-2 flex-1">
          <textarea
            value={rawContent || ''}
            onChange={(e) => setRawContent(e.target.value)}
            rows={22}
            className="w-full bg-slate-900 border border-slate-800 rounded-xl p-4 font-mono text-xs text-slate-200 focus:outline-none focus:border-cyan-500/60 leading-relaxed scrollbar-thin resize-y"
            placeholder="KEY=VALUE"
            spellCheck={false}
          />
          <div className="flex items-center justify-between text-[11px] text-slate-500 px-1">
            <span>Gunakan format baris KEY="VALUE"</span>
            <span>{(rawContent || '').split(/\r?\n/).length} Baris total</span>
          </div>
        </div>
      )}
    </div>
  );
}
