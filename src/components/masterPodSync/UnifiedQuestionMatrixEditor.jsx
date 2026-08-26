import React, { useState, useEffect } from 'react';
import { Edit2, Plus, Save, X, Activity } from 'lucide-react';
import { fetchMatrixByQuestionApi, saveUnifiedQuestionMatrixApi } from '../../api/masterPodSyncApi';

const MATRIX_BOOLEAN_FIELDS = [
  'stroboscopic_light',
  'audio_surround_sound',
  'vibro_acoustics',
  'led_intensity',
  'led_color',
  'infra_red_nea_ir',
  'infra_red_far_ir',
  'pemf_therapy',
  'olfactory_engagement',
  'binaural_beats_isochronic_tones',
  'direct_neutral_stimulation'
];

export default function UnifiedQuestionMatrixEditor({ isOpen, onClose, onSuccess, masterId, initialData, isEdit }) {
  const [questionData, setQuestionData] = useState({});
  const [matrixData, setMatrixData] = useState({});
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    const loadMatrix = async () => {
      setQuestionData(initialData || { active: true });
      
      let defaultMatrix = {};
      MATRIX_BOOLEAN_FIELDS.forEach(f => defaultMatrix[f] = false);

      if (isEdit && initialData?.id) {
        setIsLoading(true);
        try {
          const mData = await fetchMatrixByQuestionApi(masterId, initialData.id);
          if (mData) {
            setMatrixData(mData);
          } else {
            setMatrixData(defaultMatrix);
          }
        } catch (err) {
          console.error("Gagal memuat matrix:", err);
          setMatrixData(defaultMatrix);
        } finally {
          setIsLoading(false);
        }
      } else {
        setMatrixData(defaultMatrix);
      }
    };

    loadMatrix();
  }, [isOpen, initialData, masterId, isEdit]);

  if (!isOpen) return null;

  const handleQuestionChange = (field, value) => {
    setQuestionData(prev => ({ ...prev, [field]: value }));
  };

  const handleMatrixChange = (field, value) => {
    setMatrixData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await saveUnifiedQuestionMatrixApi(masterId, {
        questionData,
        matrixData,
        isEdit,
        questionId: initialData?.id
      });
      onSuccess();
    } catch (err) {
      alert(`Gagal menyimpan data unified: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-700 rounded-3xl w-full max-w-4xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex justify-between items-center bg-slate-950/50">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            {isEdit ? <Edit2 className="text-blue-400" size={20} /> : <Plus className="text-emerald-400" size={20} />}
            {isEdit ? 'Edit Pertanyaan & Matrix' : 'Tambah Pertanyaan & Matrix'}
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-800 rounded-full transition-colors text-slate-400 hover:text-white">
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto flex-1 custom-scrollbar">
          {isLoading && isEdit && Object.keys(matrixData).length === 0 ? (
            <div className="flex justify-center items-center h-40 text-slate-400">Memuat konfigurasi...</div>
          ) : (
            <form id="unified-form" onSubmit={handleSubmit} className="flex flex-col md:flex-row gap-8">
              
              {/* Left Column: Question Details */}
              <div className="flex-1 space-y-4">
                <h3 className="text-lg font-bold text-slate-200 border-b border-slate-800 pb-2 mb-4">Data Pertanyaan</h3>
                
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-slate-400">Status Aktif</label>
                  <label className="flex items-center gap-2 cursor-pointer bg-slate-950 border border-slate-800 p-3 rounded-xl w-fit">
                    <input 
                      type="checkbox" 
                      checked={!!questionData.active}
                      onChange={(e) => handleQuestionChange('active', e.target.checked)}
                      className="w-5 h-5 accent-blue-500"
                    />
                    <span className="text-sm font-bold text-white">{questionData.active ? 'Aktif' : 'Tidak Aktif'}</span>
                  </label>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-slate-400">Pertanyaan (question)</label>
                  <textarea
                    required
                    rows={3}
                    value={questionData.question || ''}
                    onChange={(e) => handleQuestionChange('question', e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:border-blue-500 outline-none resize-none"
                    placeholder="Tulis pertanyaan disini..."
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-slate-400">Informasi Tambahan (information)</label>
                  <textarea
                    rows={2}
                    value={questionData.information || ''}
                    onChange={(e) => handleQuestionChange('information', e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:border-blue-500 outline-none resize-none"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-slate-400">Tooltip</label>
                  <input
                    type="text"
                    value={questionData.tooltip || ''}
                    onChange={(e) => handleQuestionChange('tooltip', e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:border-blue-500 outline-none"
                  />
                </div>
              </div>

              {/* Right Column: Matrix Toggles */}
              <div className="flex-1 bg-slate-950/50 p-5 rounded-2xl border border-slate-800">
                <h3 className="text-lg font-bold text-cyan-400 border-b border-slate-800 pb-2 mb-4 flex items-center gap-2">
                  <Activity size={18} />
                  Konfigurasi Efek Matrix Pod
                </h3>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {MATRIX_BOOLEAN_FIELDS.map(field => (
                    <label key={field} className="flex items-center justify-between p-3 bg-slate-900 border border-slate-800 rounded-xl cursor-pointer hover:border-cyan-500/50 transition-colors">
                      <span className="text-xs font-bold text-slate-300 capitalize truncate w-32" title={field.replace(/_/g, ' ')}>
                        {field.replace(/_/g, ' ')}
                      </span>
                      <div className={`relative w-10 h-6 rounded-full transition-colors ${matrixData[field] ? 'bg-cyan-500' : 'bg-slate-700'}`}>
                        <div className={`absolute top-1 left-1 bg-white w-4 h-4 rounded-full transition-transform ${matrixData[field] ? 'translate-x-4' : 'translate-x-0'}`}></div>
                        <input
                          type="checkbox"
                          className="sr-only"
                          checked={!!matrixData[field]}
                          onChange={(e) => handleMatrixChange(field, e.target.checked)}
                        />
                      </div>
                    </label>
                  ))}
                </div>

                <div className="mt-4 flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-slate-400">FK Task (Opsional)</label>
                  <input
                    type="text"
                    value={matrixData.fk_task || ''}
                    onChange={(e) => handleMatrixChange('fk_task', e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:border-cyan-500 outline-none"
                    placeholder="Task UUID..."
                  />
                </div>
              </div>

            </form>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-800 flex justify-end gap-3 bg-slate-950/50">
          <button 
            type="button" 
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl text-sm font-bold text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            Batal
          </button>
          <button 
            type="submit" 
            form="unified-form"
            disabled={isLoading}
            className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold rounded-xl flex items-center gap-2 transition-colors shadow-lg shadow-blue-900/20 disabled:opacity-50"
          >
            <Save size={16} />
            {isLoading ? 'Menyimpan...' : 'Simpan Perubahan'}
          </button>
        </div>
      </div>
    </div>
  );
}
