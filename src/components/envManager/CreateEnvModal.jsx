import React, { useState } from 'react';
import { X, Plus, FileCode, Copy, AlertTriangle, RotateCw } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';

export default function CreateEnvModal({
  isOpen,
  onClose,
  existingFiles = [],
  initialCloneFile = null,
  onCreate
}) {
  const { t } = useLanguage();
  const [filename, setFilename] = useState('');
  const [templateSource, setTemplateSource] = useState(initialCloneFile ? initialCloneFile.name : 'empty');
  const [initialContent, setInitialContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);

  // Sync when modal opens or initialCloneFile changes
  React.useEffect(() => {
    if (initialCloneFile) {
      setFilename(`${initialCloneFile.name.replace('.env', '')}-copy.env`);
      setTemplateSource(initialCloneFile.name);
      setInitialContent(initialCloneFile.content || '');
    } else {
      setFilename('');
      setTemplateSource('empty');
      setInitialContent('');
    }
    setError(null);
  }, [initialCloneFile, isOpen]);

  const handleTemplateChange = (val) => {
    setTemplateSource(val);
    if (val === 'empty') {
      setInitialContent('');
    } else {
      const found = existingFiles.find(f => f.name === val);
      if (found) {
        setInitialContent(found.content || '');
        if (!filename) {
          setFilename(`${found.name.replace('.env', '')}-new.env`);
        }
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    let finalName = filename.trim();
    if (!finalName) {
      setError('Nama file .env wajib diisi');
      return;
    }
    if (!finalName.endsWith('.env') && !finalName.endsWith('.env.example')) {
      finalName += '.env';
    }

    setIsSubmitting(true);
    setError(null);
    try {
      await onCreate(finalName, initialContent);
      onClose();
    } catch (err) {
      setError(err.message || 'Gagal membuat file .env');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="glass-card w-full max-w-lg p-6 rounded-2xl border border-cyan-500/30 bg-slate-950/95 shadow-2xl flex flex-col gap-4">
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
              <Plus size={18} />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-white">
                {initialCloneFile ? t('envManager.modal.cloneTitle', null, 'Kloning File Konfigurasi .env') : t('envManager.modal.createTitle', null, 'Buat File .env Baru')}
              </h3>
              <p className="text-[11px] text-slate-400">
                {t('envManager.modal.savedLocation', null, 'File akan disimpan di folder')} <span className="font-mono text-cyan-300">backend/envoirment/</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {error && (
          <div className="p-3 bg-rose-500/15 border border-rose-500/30 rounded-xl text-xs text-rose-400 flex items-center gap-2">
            <AlertTriangle size={15} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {/* File Name Input */}
          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1">
              {t('envManager.modal.filenameLabel', null, 'Nama File')} <span className="text-rose-400">*</span>
            </label>
            <div className="relative">
              <input
                type="text"
                value={filename}
                onChange={(e) => setFilename(e.target.value)}
                placeholder={t('envManager.modal.filenamePlaceholder', null, 'misal: mobile-consume-dev.env')}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs font-mono text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/60"
                required
              />
            </div>
            <p className="text-[10px] text-slate-500 mt-1">
              Nama harus berakhiran <span className="font-mono text-cyan-400">.env</span> (contoh: <span className="font-mono text-slate-400">service-name-dev.env</span>)
            </p>
          </div>

          {/* Template Selection */}
          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1">
              {t('envManager.modal.templateLabel', null, 'Salin dari Template (Opsional)')}
            </label>
            <select
              value={templateSource}
              onChange={(e) => handleTemplateChange(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500/60 cursor-pointer"
            >
              <option value="empty">{t('envManager.modal.emptyTemplate', null, '-- File Kosong (Tanpa Variabel) --')}</option>
              {existingFiles.map(f => (
                <option key={f.name} value={f.name}>Salin dari {f.name} ({f.variableCount} variabel)</option>
              ))}
            </select>
          </div>

          {/* Initial Content Preview / Edit */}
          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1">
              Konten Awal Variabel (Format KEY=VALUE)
            </label>
            <textarea
              value={initialContent}
              onChange={(e) => setInitialContent(e.target.value)}
              rows={6}
              className="w-full bg-slate-900 border border-slate-800 rounded-xl p-3 font-mono text-[11px] text-slate-200 focus:outline-none focus:border-cyan-500/60 resize-none scrollbar-thin"
              placeholder={`DATABASE_URL="postgresql://..."\nPORT=3000\nENVIRONMENT="development"`}
            />
          </div>

          {/* Modal Actions */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-slate-300 rounded-xl text-xs font-bold transition-colors cursor-pointer"
            >
              {t('envManager.modal.cancel', null, 'Batal')}
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-slate-950 rounded-xl text-xs font-extrabold flex items-center gap-1.5 shadow-md shadow-cyan-500/20 transition-all cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <RotateCw size={14} className="animate-spin" />
                  <span>{t('envManager.modal.creating', null, 'Membuat...')}</span>
                </>
              ) : (
                <>
                  <Plus size={14} />
                  <span>{initialCloneFile ? t('envManager.modal.cloneBtn', null, 'Kloning File Sekarang') : t('envManager.modal.createBtn', null, 'Buat File .env')}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
