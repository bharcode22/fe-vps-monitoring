import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  Music,
  Sliders,
  Clock,
  Save,
  Download,
  CheckCircle2,
  AlertCircle,
  Sparkles
} from 'lucide-react';
import {
  addDetailExperienceApi,
  updateDetailExperienceApi,
  fetchMultimediaCatalogApi
} from '../../api/vpsApi';
import olfactoryList from './olfactory.json';
import { DEFAULT_DETAIL } from './detailModal/constants';
import TabMediaSoundscape from './detailModal/TabMediaSoundscape';
import TabHardwareControls from './detailModal/TabHardwareControls';
import TabDynamicSchedules from './detailModal/TabDynamicSchedules';

export default function DetailExperienceModal({
  isOpen,
  onClose,
  podSettingId,
  signatureId,
  targetSessionName = 'RECHARGE',
  initialData = null,
  onSuccess
}) {
  const isEdit = !!initialData?.id;

  const [activeTab, setActiveTab] = useState('media'); // 'media' | 'hardware' | 'schedules'
  const [formData, setFormData] = useState(DEFAULT_DETAIL);
  const [catalogItems, setCatalogItems] = useState([]);
  const [catalogSearch, setCatalogSearch] = useState('');
  const [isCatalogOpen, setIsCatalogOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  // Dynamic schedule ON/OFF toggles
  const [enableBurstSchedule, setEnableBurstSchedule] = useState(false);
  const [enableGenFreqSchedule, setEnableGenFreqSchedule] = useState(false);
  const [enableNirSchedule, setEnableNirSchedule] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setError(null);
      setSuccessMsg(null);
      if (initialData) {
        const rawNir = Array.isArray(initialData.nir_value) && initialData.nir_value.length > 0
          ? initialData.nir_value
          : (Array.isArray(initialData.nir_detail_exp) ? initialData.nir_detail_exp : []);

        const merged = {
          ...DEFAULT_DETAIL,
          ...initialData,
          burst_time: Array.isArray(initialData.burst_time) ? initialData.burst_time : [],
          generator_frequency: Array.isArray(initialData.generator_frequency) ? initialData.generator_frequency : [],
          nir_value: rawNir
        };
        delete merged.nir_detail_exp;
        delete merged.group_ids;
        delete merged.created_at;
        delete merged.updated_at;
        delete merged.deleted_at;
        delete merged.experience_id;
        delete merged.fk_experience_id;
        delete merged.experiences;
        delete merged.order_experience;

        setFormData(merged);
        setEnableBurstSchedule(Array.isArray(initialData.burst_time) && initialData.burst_time.length > 0);
        setEnableGenFreqSchedule(Array.isArray(initialData.generator_frequency) && initialData.generator_frequency.length > 0);
        setEnableNirSchedule(Array.isArray(rawNir) && rawNir.length > 0);
      } else {
        const fresh = {
          ...DEFAULT_DETAIL,
          label: targetSessionName,
          label_tag: targetSessionName
        };
        setFormData(fresh);
        setEnableBurstSchedule(false);
        setEnableGenFreqSchedule(false);
        setEnableNirSchedule(false);
      }

      // Load multimedia catalog for SoundScape picker
      fetchMultimediaCatalogApi()
        .then(items => setCatalogItems(items || []))
        .catch(() => { });
    }
  }, [isOpen, initialData, targetSessionName]);

  // Handle general field change
  const handleChange = (key, value) => {
    setFormData(prev => ({ ...prev, [key]: value }));
  };

  // Select soundscape from catalog and auto-fill media fields
  const handleSelectSoundscape = (item) => {
    if (!item) return;
    const soundScapeId = Number(item.sound_scape) || item.sound_scape || item.id;
    const songFile = item.music || item.song || (item.musicUrl ? item.musicUrl.split('/').pop().split('?')[0] : '');
    const lampFile = item.lamp ? item.lamp.split('/').pop().split('?')[0] : '';
    const videoFile = item.video || (item.videoUrl ? item.videoUrl.split('/').pop().split('?')[0] : '');
    const coverFile = item.cover_album || (item.coverAlbumUrl ? item.coverAlbumUrl.split('/').pop().split('?')[0] : 'cover_album.png');
    const trackTitle = item.title || item.tittle || item.name || formData.title || `Track ${soundScapeId}`;

    const updated = {
      ...formData,
      sound_scape: soundScapeId,
      title: trackTitle,
      caption: item.caption || trackTitle || formData.caption,
      description: item.description || trackTitle || formData.description,
      artist: item.artist || formData.artist || 'Regenesis',
      album: item.album || formData.album || 'Regenesis',
      song: songFile,
      lamp: lampFile,
      video: videoFile,
      cover_album: coverFile,
      filepath: songFile
    };

    setFormData(updated);
    setIsCatalogOpen(false);
  };

  // Toggle handlers for dynamic schedules
  const handleToggleBurstSchedule = (checked) => {
    setEnableBurstSchedule(checked);
    const defaultScent = (olfactoryList && olfactoryList.length > 0) ? olfactoryList[0].scent : 'Lavender';
    setFormData(prev => ({
      ...prev,
      olfactory_engagement: checked,
      ...(checked && prev.burst_time.length === 0 ? {
        burst_time: [{ start_time: '1.0', duration: '5000', scent: defaultScent }]
      } : {})
    }));
  };

  const handleToggleGenFreqSchedule = (checked) => {
    setEnableGenFreqSchedule(checked);
    if (checked && formData.generator_frequency.length === 0) {
      setFormData(prev => ({
        ...prev,
        generator_frequency: [{ frequency: 40, start_time: '1.0', duration: '5000', wave_shape: 'wave' }]
      }));
    }
  };

  const handleToggleNirSchedule = (checked) => {
    setEnableNirSchedule(checked);
    if (checked && formData.nir_value.length === 0) {
      setFormData(prev => ({
        ...prev,
        nir_value: [{ start_time: '00:10', end_time: '00:20', duration: '00:10', nir_value: 2.5, frequency: '40Hz' }]
      }));
    }
  };

  // Add / Remove dynamic schedules
  const handleAddBurstTime = () => {
    const defaultScent = (olfactoryList && olfactoryList.length > 0) ? olfactoryList[0].scent : 'Lavender';
    const updated = {
      ...formData,
      burst_time: [
        ...formData.burst_time,
        { start_time: '1.0', duration: '5000', scent: defaultScent }
      ]
    };
    setFormData(updated);
  };

  const handleRemoveBurstTime = (idx) => {
    const updated = {
      ...formData,
      burst_time: formData.burst_time.filter((_, i) => i !== idx)
    };
    setFormData(updated);
  };

  const handleUpdateBurstTime = (idx, key, val) => {
    const copy = [...formData.burst_time];
    copy[idx] = { ...copy[idx], [key]: val };
    const updated = { ...formData, burst_time: copy };
    setFormData(updated);
  };

  const handleAddGenFreq = () => {
    const updated = {
      ...formData,
      generator_frequency: [
        ...formData.generator_frequency,
        { frequency: 40, start_time: '1.0', duration: '5000', wave_shape: 'wave' }
      ]
    };
    setFormData(updated);
  };

  const handleRemoveGenFreq = (idx) => {
    const updated = {
      ...formData,
      generator_frequency: formData.generator_frequency.filter((_, i) => i !== idx)
    };
    setFormData(updated);
  };

  const handleUpdateGenFreq = (idx, key, val) => {
    const copy = [...formData.generator_frequency];
    copy[idx] = { ...copy[idx], [key]: val };
    const updated = { ...formData, generator_frequency: copy };
    setFormData(updated);
  };

  const handleAddNirValue = () => {
    const updated = {
      ...formData,
      nir_value: [
        ...formData.nir_value,
        { start_time: '00:10', end_time: '00:20', duration: '00:10', nir_value: 2.5, frequency: '40Hz' }
      ]
    };
    setFormData(updated);
  };

  const handleRemoveNirValue = (idx) => {
    const updated = {
      ...formData,
      nir_value: formData.nir_value.filter((_, i) => i !== idx)
    };
    setFormData(updated);
  };

  const handleUpdateNirValue = (idx, key, val) => {
    const copy = [...formData.nir_value];
    copy[idx] = { ...copy[idx], [key]: val };
    const updated = { ...formData, nir_value: copy };
    setFormData(updated);
  };

  // Export as local JSON
  const handleExportJson = () => {
    const exportPayload = {
      template_version: '1.0',
      template_name: formData.title || `Experience-${formData.sound_scape || 'Track'}`,
      target_session: targetSessionName,
      created_at: new Date().toISOString(),
      detail_experience: {
        ...formData,
        scent: formData.scent || (formData.burst_time && formData.burst_time[0]?.scent) || 'lavender',
        burst_time: enableBurstSchedule ? formData.burst_time : [],
        generator_frequency: enableGenFreqSchedule ? formData.generator_frequency : [],
        nir_value: enableNirSchedule ? formData.nir_value : []
      }
    };
    delete exportPayload.detail_experience.id;
    delete exportPayload.detail_experience.experience_id;

    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(exportPayload, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `template_${targetSessionName.toLowerCase()}_${formData.sound_scape || 'detail'}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  // Save to Master API
  const handleSave = async () => {
    setIsSaving(true);
    setError(null);
    setSuccessMsg(null);

    try {
      const cleanItem = {
        ...formData,
        sound_scape: Number(formData.sound_scape) || formData.sound_scape,
        stroboscopic_light: Number(formData.stroboscopic_light) || 0,
        audio_surround_sound: Number(formData.audio_surround_sound) || 0,
        vibro_acoustics: Number(formData.vibro_acoustics) || 0,
        led_intensity: Number(formData.led_intensity) || 0,
        led_color: Number(formData.led_color) || 0,
        infra_red_nea_ir: Number(formData.infra_red_nea_ir) || 0,
        infra_red_far_ir: Number(formData.infra_red_far_ir) || 0,
        uva: Number(formData.uva) || 0,
        uvb: Number(formData.uvb) || 0,
        uvc: Number(formData.uvc) || 0,
        pemf_value: Number(formData.pemf_value) || 0,
        order: Number(formData.order) || 1,
        duration: Number(formData.duration) || 20,
        scent: formData.scent || (formData.burst_time && formData.burst_time[0]?.scent) || 'lavender',
        burst_time: enableBurstSchedule ? formData.burst_time : [],
        generator_frequency: enableGenFreqSchedule ? formData.generator_frequency : [],
        nir_value: enableNirSchedule ? formData.nir_value : []
      };

      const payload = {
        detail_experience: [cleanItem],
        group_ids: formData.group_ids || []
      };

      if (isEdit) {
        await updateDetailExperienceApi(podSettingId, signatureId, payload);
        setSuccessMsg('Detail experience berhasil diperbarui!');
      } else {
        delete cleanItem.id;
        delete cleanItem.experience_id;
        await addDetailExperienceApi(podSettingId, signatureId, payload);
        setSuccessMsg('Detail experience baru berhasil ditambahkan!');
      }

      setTimeout(() => {
        if (onSuccess) onSuccess();
        onClose();
      }, 800);
    } catch (err) {
      console.error('Error saving detail experience:', err);
      setError(err.message || 'Gagal menyimpan detail experience ke Master API');
    } finally {
      setIsSaving(false);
    }
  };

  const filteredCatalog = useMemo(() => {
    return catalogItems
      .filter(item => {
        if (!catalogSearch) return true;
        const q = catalogSearch.toLowerCase();
        return (
          String(item.sound_scape).includes(q) ||
          (item.title && item.title.toLowerCase().includes(q)) ||
          (item.tittle && item.tittle.toLowerCase().includes(q)) ||
          (item.song && item.song.toLowerCase().includes(q)) ||
          (item.music && item.music.toLowerCase().includes(q)) ||
          (item.lamp && item.lamp.toLowerCase().includes(q)) ||
          (item.artist && item.artist.toLowerCase().includes(q)) ||
          (item.album && item.album.toLowerCase().includes(q))
        );
      })
      .sort((a, b) => {
        const dateA = new Date(a.created_date || a.created_at || 0).getTime();
        const dateB = new Date(b.created_date || b.created_at || 0).getTime();
        if (dateB !== dateA) return dateB - dateA;
        return (Number(b.sound_scape) || 0) - (Number(a.sound_scape) || 0);
      });
  }, [catalogItems, catalogSearch]);

  // Derived selected soundscape from Content Management catalog
  const selectedSoundscapeItem = useMemo(() => {
    if (!formData.sound_scape) return null;
    return catalogItems.find(c => String(c.sound_scape) === String(formData.sound_scape) || String(c.id) === String(formData.sound_scape)) || null;
  }, [formData.sound_scape, catalogItems]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-4xl bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden my-8 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700/60 bg-slate-800/40">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400">
              <Sparkles size={20} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                {isEdit ? 'Edit Detail Experience' : 'Tambah Detail Experience'}
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">
                  {targetSessionName}
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Konfigurasi terintegrasi SoundScape, modulasi terapi POD, dan dynamic time-series
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleExportJson}
              title="Download konfigurasi ini sebagai file template JSON"
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 text-xs flex items-center gap-1.5 transition"
            >
              <Download size={14} className="text-cyan-400" />
              Ekspor JSON
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-1 px-6 pt-3 border-b border-slate-800 bg-slate-950/40">
          <button
            onClick={() => setActiveTab('media')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-t-lg transition border-b-2 ${activeTab === 'media'
              ? 'border-cyan-400 text-cyan-300 bg-slate-800/60'
              : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/30'
              }`}
          >
            <Music size={15} />
            1. Media & SoundScape
          </button>
          <button
            onClick={() => setActiveTab('hardware')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-t-lg transition border-b-2 ${activeTab === 'hardware'
              ? 'border-amber-400 text-amber-300 bg-slate-800/60'
              : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/30'
              }`}
          >
            <Sliders size={15} />
            2. Hardware Therapy Controls
          </button>
          <button
            onClick={() => setActiveTab('schedules')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-t-lg transition border-b-2 ${activeTab === 'schedules'
              ? 'border-emerald-400 text-emerald-300 bg-slate-800/60'
              : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/30'
              }`}
          >
            <Clock size={15} />
            3. Dynamic Schedules (
            {[enableBurstSchedule, enableGenFreqSchedule, enableNirSchedule].filter(Boolean).length} Aktif)
          </button>
        </div>

        {/* Tab Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Notifications */}
          {error && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle size={16} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}
          {successMsg && (
            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
              <CheckCircle2 size={16} className="shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* TAB 1: MEDIA & SOUNDSCAPE */}
          {activeTab === 'media' && (
            <TabMediaSoundscape
              formData={formData}
              handleChange={handleChange}
              catalogItems={catalogItems}
              catalogSearch={catalogSearch}
              setCatalogSearch={setCatalogSearch}
              isCatalogOpen={isCatalogOpen}
              setIsCatalogOpen={setIsCatalogOpen}
              filteredCatalog={filteredCatalog}
              selectedSoundscapeItem={selectedSoundscapeItem}
              onSelectSoundscape={handleSelectSoundscape}
            />
          )}

          {/* TAB 2: HARDWARE THERAPY CONTROLS */}
          {activeTab === 'hardware' && (
            <TabHardwareControls
              formData={formData}
              handleChange={handleChange}
            />
          )}

          {/* TAB 3: DYNAMIC TIME-SERIES SCHEDULES */}
          {activeTab === 'schedules' && (
            <TabDynamicSchedules
              formData={formData}
              handleChange={handleChange}
              enableBurstSchedule={enableBurstSchedule}
              handleToggleBurstSchedule={handleToggleBurstSchedule}
              handleAddBurstTime={handleAddBurstTime}
              handleRemoveBurstTime={handleRemoveBurstTime}
              handleUpdateBurstTime={handleUpdateBurstTime}
              enableGenFreqSchedule={enableGenFreqSchedule}
              handleToggleGenFreqSchedule={handleToggleGenFreqSchedule}
              handleAddGenFreq={handleAddGenFreq}
              handleRemoveGenFreq={handleRemoveGenFreq}
              handleUpdateGenFreq={handleUpdateGenFreq}
              enableNirSchedule={enableNirSchedule}
              handleToggleNirSchedule={handleToggleNirSchedule}
              handleAddNirValue={handleAddNirValue}
              handleRemoveNirValue={handleRemoveNirValue}
              handleUpdateNirValue={handleUpdateNirValue}
            />
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-800 bg-slate-950/60">
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400">Order #{formData.order || 1}</span>
            <span className="text-slate-600">•</span>
            <span className="text-xs text-slate-400">SoundScape #{formData.sound_scape || '-'}</span>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition"
            >
              Batal
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving}
              className="px-5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs shadow-lg shadow-amber-500/20 transition flex items-center gap-2 disabled:opacity-50"
            >
              {isSaving ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin"></div>
                  <span>Menyimpan ke Master API...</span>
                </>
              ) : (
                <>
                  <Save size={15} />
                  <span>{isEdit ? 'Perbarui di POD' : 'Tambahkan ke POD'}</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
