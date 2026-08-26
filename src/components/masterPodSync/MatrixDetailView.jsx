import React, { useState, useEffect } from 'react';
import { fetchMatrixByQuestionApi } from '../../api/masterPodSyncApi';
import { CheckCircle2, XCircle, Activity } from 'lucide-react';

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

export default function MatrixDetailView({ masterId, questionId }) {
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    const loadData = async () => {
      try {
        const res = await fetchMatrixByQuestionApi(masterId, questionId);
        if (isMounted) setData(res || {});
      } catch (err) {
        console.error("Gagal memuat matrix untuk baris ini:", err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };
    loadData();
    return () => { isMounted = false; };
  }, [masterId, questionId]);

  if (isLoading) {
    return (
      <div className="p-4 text-center text-slate-400 text-sm animate-pulse flex items-center justify-center gap-2">
        <Activity size={16} className="animate-spin text-cyan-500" /> Memuat rincian efek Matrix...
      </div>
    );
  }

  if (!data || Object.keys(data).length === 0) {
    return (
      <div className="p-4 text-center text-slate-500 text-sm italic">
        Belum ada konfigurasi Matrix Pod untuk pertanyaan ini.
      </div>
    );
  }

  return (
    <div className="bg-slate-950/80 p-5 rounded-2xl border border-slate-800 m-3 shadow-inner">
      <h4 className="text-sm font-bold text-cyan-400 mb-4 flex items-center gap-2">
        <Activity size={16} />
        Konfigurasi Efek Matrix Pod
      </h4>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
        {MATRIX_BOOLEAN_FIELDS.map(field => {
          const isActive = !!data[field];
          return (
            <div 
              key={field} 
              className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-xs font-bold transition-all
                ${isActive 
                  ? 'bg-cyan-500/10 border-cyan-500/30 text-cyan-300' 
                  : 'bg-slate-900 border-slate-800 text-slate-500'}`}
            >
              {isActive ? <CheckCircle2 size={14} className="text-cyan-400" /> : <XCircle size={14} className="text-slate-600" />}
              <span className="capitalize truncate" title={field.replace(/_/g, ' ')}>
                {field.replace(/_/g, ' ')}
              </span>
            </div>
          );
        })}
      </div>
      {data.fk_task && (
        <div className="mt-4 pt-3 border-t border-slate-800 flex items-center gap-2 text-xs">
          <span className="text-slate-500 font-bold">FK Task:</span>
          <span className="text-slate-300 font-mono bg-slate-900 px-2 py-1 rounded">{data.fk_task}</span>
        </div>
      )}
    </div>
  );
}
