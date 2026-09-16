import React from 'react';
import { Sun, Volume2 } from 'lucide-react';
import { WAVE_SHAPES } from './constants';

export default function TabHardwareControls({ formData, handleChange }) {
  return (
    <div className="space-y-6">
      {/* Sliders Cluster 1: Light & Strobe */}
      <div className="p-4 rounded-xl bg-slate-800/40 border border-slate-700/60 space-y-4">
        <div className="flex items-center gap-2 pb-2 border-b border-slate-700/40">
          <Sun size={16} className="text-amber-400" />
          <h3 className="text-xs font-bold text-amber-300 uppercase tracking-wider">
            Fotobiomodulasi & Pencahayaan (Lighting)
          </h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="font-semibold text-slate-300">Stroboscopic Light</span>
              <span className="font-mono font-bold text-amber-400">{formData.stroboscopic_light}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={formData.stroboscopic_light}
              onChange={(e) => handleChange('stroboscopic_light', e.target.value)}
              className="w-full accent-amber-400"
            />
          </div>

          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="font-semibold text-slate-300">LED Intensity</span>
              <span className="font-mono font-bold text-amber-400">{formData.led_intensity}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={formData.led_intensity}
              onChange={(e) => handleChange('led_intensity', e.target.value)}
              className="w-full accent-amber-400"
            />
          </div>

          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="font-semibold text-slate-300">Near Infrared (NIR)</span>
              <span className="font-mono font-bold text-rose-400">{formData.infra_red_nea_ir}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={formData.infra_red_nea_ir}
              onChange={(e) => handleChange('infra_red_nea_ir', e.target.value)}
              className="w-full accent-rose-400"
            />
          </div>

          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="font-semibold text-slate-300">Far Infrared (FIR)</span>
              <span className="font-mono font-bold text-rose-400">{formData.infra_red_far_ir}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={formData.infra_red_far_ir}
              onChange={(e) => handleChange('infra_red_far_ir', e.target.value)}
              className="w-full accent-rose-400"
            />
          </div>
        </div>

        {/* UV Spectrum */}
        <div className="grid grid-cols-3 gap-4 pt-2 border-t border-slate-700/40">
          <div>
            <label className="block text-[10px] text-slate-400 mb-1">UVA Intensity</label>
            <input
              type="number"
              value={formData.uva}
              onChange={(e) => handleChange('uva', e.target.value)}
              className="w-full px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-xs text-white"
            />
          </div>
          <div>
            <label className="block text-[10px] text-slate-400 mb-1">UVB Intensity</label>
            <input
              type="number"
              value={formData.uvb}
              onChange={(e) => handleChange('uvb', e.target.value)}
              className="w-full px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-xs text-white"
            />
          </div>
          <div>
            <label className="block text-[10px] text-slate-400 mb-1">UVC Intensity</label>
            <input
              type="number"
              value={formData.uvc}
              onChange={(e) => handleChange('uvc', e.target.value)}
              className="w-full px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-xs text-white"
            />
          </div>
        </div>
      </div>

      {/* Sliders Cluster 2: Audio & Vibroacoustics */}
      <div className="p-4 rounded-xl bg-slate-800/40 border border-slate-700/60 space-y-4">
        <div className="flex items-center gap-2 pb-2 border-b border-slate-700/40">
          <Volume2 size={16} className="text-cyan-400" />
          <h3 className="text-xs font-bold text-cyan-300 uppercase tracking-wider">
            Akustik & Vibroakustik (Sound & Vibration)
          </h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="font-semibold text-slate-300">Audio Surround Sound</span>
              <span className="font-mono font-bold text-cyan-400">{formData.audio_surround_sound}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={formData.audio_surround_sound}
              onChange={(e) => handleChange('audio_surround_sound', e.target.value)}
              className="w-full accent-cyan-400"
            />
          </div>

          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="font-semibold text-slate-300">Vibro-Acoustics (Body Bass)</span>
              <span className="font-mono font-bold text-cyan-400">{formData.vibro_acoustics}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={formData.vibro_acoustics}
              onChange={(e) => handleChange('vibro_acoustics', e.target.value)}
              className="w-full accent-cyan-400"
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-6 pt-2 border-t border-slate-700/40">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={!!formData.binaural_beats_isochronic_tones}
              onChange={(e) => handleChange('binaural_beats_isochronic_tones', e.target.checked)}
              className="w-4 h-4 rounded accent-cyan-400 bg-slate-950 border-slate-700"
            />
            <span className="text-xs text-slate-300">Binaural Beats / Isochronic Tones</span>
          </label>

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400">Wave Shape:</span>
            <select
              value={formData.wave_shape}
              onChange={(e) => handleChange('wave_shape', e.target.value)}
              className="px-2.5 py-1 rounded bg-slate-950 border border-slate-700 text-xs text-white"
            >
              {WAVE_SHAPES.map((ws) => (
                <option key={ws.value} value={ws.value}>
                  {ws.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>
    </div>
  );
}
