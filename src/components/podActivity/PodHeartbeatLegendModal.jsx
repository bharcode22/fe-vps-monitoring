import React, { useState, useEffect } from 'react';
import {
  X,
  HelpCircle,
  Clock,
  Zap,
  Activity,
  Cpu,
  RefreshCw,
  Sparkles,
  Sliders,
  Save,
  CheckCircle2,
  AlertCircle,
  RotateCcw
} from 'lucide-react';
import {
  fetchHeartbeatThresholdsApi,
  saveHeartbeatThresholdsApi,
  resetHeartbeatThresholdsApi
} from '../../api/podActivityApi';
import {
  DEFAULT_HB_THRESHOLDS,
  getStoredHbThresholds,
  setStoredHbThresholds
} from '../../utils/heartbeatThresholds';

export function getStatusLegendConfigs(thresholds = DEFAULT_HB_THRESHOLDS) {
  const { delaySec, frozenSec, deadSec } = thresholds;

  return [
    {
      key: 'live',
      status: 'LIVE',
      colorName: 'Hijau (Emerald)',
      label: '🟢 ACTIVE / LIVE',
      badgeClass: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
      dotClass: 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,1)] animate-pulse',
      borderClass: 'border-emerald-500/30 bg-emerald-500/10',
      threshold: `≤ ${delaySec} Detik`,
      meaning: 'Modul hardware berdetak normal dan angka counter HB aktif bertambah secara real-time.',
      cause: 'Komunikasi serial USB dan broker MQTT berjalan lancar tanpa kendala.',
      action: 'Tidak perlu tindakan apa pun. Sistem dalam kondisi prima dan sehat.'
    },
    {
      key: 'delay',
      status: 'DELAY',
      colorName: 'Kuning (Amber)',
      label: '🟡 WARNING / DELAY',
      badgeClass: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
      dotClass: 'bg-amber-400 shadow-[0_0_6px_rgba(251,191,36,0.8)]',
      borderClass: 'border-amber-500/40 bg-amber-500/10',
      threshold: `${delaySec} - ${frozenSec} Detik`,
      meaning: `Terjadi keterlambatan/latensi pengiriman paket atau counter HB mulai tidak bertambah (>${delaySec}s). Warna hijau langsung padam.`,
      cause: 'Beban jaringan LAN tinggi, traffic MQTT padat, atau modul sedikit lambat merespons.',
      action: `Pantau terus. Jika kembali normal akan langsung kembali hijau. Jika tidak ada pergerakan hingga ${frozenSec}s akan berubah menjadi Frozen.`
    },
    {
      key: 'frozen',
      status: 'FROZEN',
      colorName: 'Ungu (Purple)',
      label: '🟣 FROZEN / STALLED',
      badgeClass: 'bg-purple-500/20 text-purple-300 border-purple-500/40 animate-pulse',
      dotClass: 'bg-purple-400 shadow-[0_0_8px_rgba(192,132,252,1)]',
      borderClass: 'border-purple-500/50 bg-purple-500/15',
      threshold: `${frozenSec} - ${deadSec} Detik (HB Macet)`,
      meaning: `Nilai counter HB macet / tidak bertambah sama sekali atau paket tertahan selama ≥ ${frozenSec} detik.`,
      cause: 'Firmware microcontroller hang/freeze di loop serial program atau proses IO modul terkunci.',
      action: 'Kirim perintah "RESET" modul dari dashboard atau restart power board microcontroller Pod.'
    },
    {
      key: 'dead',
      status: 'DEAD',
      colorName: 'Merah (Rose)',
      label: '🔴 DEAD / TIMEOUT',
      badgeClass: 'bg-rose-500/20 text-rose-300 border-rose-500/40 animate-pulse',
      dotClass: 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,1)] animate-ping',
      borderClass: 'border-rose-500/50 bg-rose-500/15',
      threshold: `≥ ${deadSec} Detik / No Data`,
      meaning: `Modul mati total / tidak ada detak heartbeat masuk selama ≥ ${deadSec} detik. Memicu Alarm Suara.`,
      cause: 'Kabel USB serial kendor/terlepas, power supply modul mati, atau port ttyUSB crash.',
      action: '1. Klik tombol "Ping Status" / "Reset".\n2. Jika tetap merah, periksa fisik kabel USB / colokan hardware pada Pod.'
    },
    {
      key: 'flash',
      status: 'FLASH',
      colorName: 'Cyan (Biru Muda)',
      label: '⚡ PACKET FLASH',
      badgeClass: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40',
      dotClass: 'bg-cyan-400 animate-pulse',
      borderClass: 'border-cyan-400/80 ring-2 ring-cyan-400/50 bg-cyan-500/20',
      threshold: 'Realtime Flash (0.6s)',
      meaning: 'Animasi kilau penanda ada kenaikan angka counter HB baru yang baru saja diterima.',
      cause: 'Nilai counter HB bertambah naik dan ditangkap secara real-time oleh dashboard.',
      action: 'Indikator visual bahwa aliran data counter hardware sedang aktif berjalan.'
    }
  ];
}

export const STATUS_LEGEND_CONFIGS = getStatusLegendConfigs(DEFAULT_HB_THRESHOLDS);
export const STATUS_LEGEND_ITEMS = STATUS_LEGEND_CONFIGS;

export default function PodHeartbeatLegendModal({
  isOpen,
  onClose,
  thresholds: propThresholds,
  onThresholdsUpdated
}) {
  const [activeThresholds, setActiveThresholds] = useState(() => {
    return propThresholds || getStoredHbThresholds();
  });

  const [editDelay, setEditDelay] = useState(activeThresholds.delaySec || 2);
  const [editFrozen, setEditFrozen] = useState(activeThresholds.frozenSec || 10);
  const [editDead, setEditDead] = useState(activeThresholds.deadSec || 30);

  const [isSaving, setIsSaving] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [feedbackToast, setFeedbackToast] = useState(null);

  // Sync state if prop changes or when modal opens
  useEffect(() => {
    if (isOpen) {
      const current = propThresholds || getStoredHbThresholds();
      setActiveThresholds(current);
      setEditDelay(current.delaySec);
      setEditFrozen(current.frozenSec);
      setEditDead(current.deadSec);
    }
  }, [isOpen, propThresholds]);

  if (!isOpen) return null;

  const currentLegendConfigs = getStatusLegendConfigs({
    delaySec: editDelay,
    frozenSec: editFrozen,
    deadSec: editDead
  });

  // Handle Save to JSON backend file
  const handleSaveThresholds = async () => {
    if (editDelay >= editFrozen) {
      alert('Ambang batas Delay harus lebih kecil dari Frozen.');
      return;
    }
    if (editFrozen >= editDead) {
      alert('Ambang batas Frozen harus lebih kecil dari Dead.');
      return;
    }

    setIsSaving(true);
    try {
      const payload = {
        delaySec: Number(editDelay),
        frozenSec: Number(editFrozen),
        deadSec: Number(editDead)
      };

      const res = await saveHeartbeatThresholdsApi(payload);
      const updated = res.data || payload;

      setStoredHbThresholds(updated);
      setActiveThresholds(updated);
      if (onThresholdsUpdated) {
        onThresholdsUpdated(updated);
      }

      setFeedbackToast({
        type: 'success',
        message: 'Ambang batas berhasil disimpan ke file JSON backend!'
      });
      setTimeout(() => setFeedbackToast(null), 3500);
    } catch (err) {
      alert(`Gagal menyimpan ambang batas: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  // Handle Reset to default 2s / 10s / 30s
  const handleResetThresholds = async () => {
    if (!confirm('Kembalikan ambang batas waktu ke default (Delay: 2s, Frozen: 10s, Dead: 30s)?')) return;

    setIsResetting(true);
    try {
      const res = await resetHeartbeatThresholdsApi();
      const updated = res.data || DEFAULT_HB_THRESHOLDS;

      setEditDelay(updated.delaySec);
      setEditFrozen(updated.frozenSec);
      setEditDead(updated.deadSec);
      setStoredHbThresholds(updated);
      setActiveThresholds(updated);

      if (onThresholdsUpdated) {
        onThresholdsUpdated(updated);
      }

      setFeedbackToast({
        type: 'success',
        message: 'Ambang batas berhasil direset ke default (2s / 10s / 30s)!'
      });
      setTimeout(() => setFeedbackToast(null), 3500);
    } catch (err) {
      alert(`Gagal mereset ambang batas: ${err.message}`);
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-150">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-800 bg-slate-950/80">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-gradient-to-br from-indigo-500/20 to-purple-500/20 text-indigo-400 rounded-2xl border border-indigo-500/30 shadow-lg shadow-indigo-500/10">
              <HelpCircle size={22} />
            </div>
            <div>
              <h3 className="text-base font-black text-white tracking-wide">
                Panduan Indikator & Pengaturan Ambang Batas Status Heartbeat
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Sesuaikan durasi batas waktu langsung dari UI — Disimpan ke file JSON di backend (<code>backend/src/data/heartbeat_thresholds_config.json</code>)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto flex flex-col gap-5 max-h-[calc(92vh-140px)]">
          
          {/* Toast Notification */}
          {feedbackToast && (
            <div className="p-3.5 bg-emerald-500/90 text-white text-xs font-bold rounded-xl shadow-xl flex items-center gap-2 animate-in fade-in duration-150 backdrop-blur-md">
              <CheckCircle2 size={16} />
              <span>{feedbackToast.message}</span>
            </div>
          )}

          {/* 1. INTERACTIVE THRESHOLDS CONFIGURATION CARD */}
          <div className="p-5 rounded-2xl bg-gradient-to-br from-slate-950 to-slate-900 border border-cyan-500/30 shadow-lg flex flex-col gap-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800/80 pb-3">
              <div className="flex items-center gap-2 text-white font-black text-xs uppercase tracking-wider">
                <Sliders size={16} className="text-cyan-400" />
                <span>Atur Ambang Batas Waktu (*Thresholds Adjustment*)</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleResetThresholds}
                  disabled={isSaving || isResetting}
                  className="px-3 py-1.5 rounded-xl text-[11px] font-bold text-slate-400 hover:text-amber-300 hover:bg-amber-500/10 border border-slate-800 hover:border-amber-500/30 transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  title="Kembalikan ke nilai bawaan sistem (2s / 10s / 30s)"
                >
                  <RotateCcw size={12} className={isResetting ? 'animate-spin' : ''} />
                  <span>Reset Default</span>
                </button>
                <button
                  type="button"
                  onClick={handleSaveThresholds}
                  disabled={isSaving || isResetting}
                  className="px-4 py-1.5 rounded-xl text-xs font-bold bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white shadow-md shadow-cyan-500/20 transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {isSaving ? <RefreshCw size={13} className="animate-spin" /> : <Save size={13} />}
                  <span>Simpan ke JSON Backend</span>
                </button>
              </div>
            </div>

            {/* Inputs & Sliders Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              
              {/* 1. Delay Threshold */}
              <div className="p-3.5 bg-slate-900/90 border border-amber-500/30 rounded-xl flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-amber-400" />
                    <span>Batas Delay (🟡)</span>
                  </span>
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      min="1"
                      max="15"
                      value={editDelay}
                      onChange={(e) => setEditDelay(Math.max(1, Number(e.target.value)))}
                      className="w-14 bg-slate-950 border border-slate-700 focus:border-amber-400 text-amber-300 font-mono font-black text-center text-xs rounded-lg py-1 px-1 outline-none"
                    />
                    <span className="text-[10px] font-bold text-slate-400">detik</span>
                  </div>
                </div>
                <input
                  type="range"
                  min="1"
                  max="15"
                  value={editDelay}
                  onChange={(e) => setEditDelay(Number(e.target.value))}
                  className="w-full accent-amber-400 cursor-pointer h-1.5 bg-slate-950 rounded-lg mt-1"
                />
                <p className="text-[10px] text-slate-400 leading-tight">
                  Waktu &gt; <strong className="text-amber-300">{editDelay}s</strong> mulai masuk status Delay (warna hijau padam).
                </p>
              </div>

              {/* 2. Frozen Threshold */}
              <div className="p-3.5 bg-slate-900/90 border border-purple-500/30 rounded-xl flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-purple-300 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-purple-400" />
                    <span>Batas Frozen (🟣)</span>
                  </span>
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      min={editDelay + 1}
                      max="60"
                      value={editFrozen}
                      onChange={(e) => setEditFrozen(Math.max(editDelay + 1, Number(e.target.value)))}
                      className="w-14 bg-slate-950 border border-slate-700 focus:border-purple-400 text-purple-300 font-mono font-black text-center text-xs rounded-lg py-1 px-1 outline-none"
                    />
                    <span className="text-[10px] font-bold text-slate-400">detik</span>
                  </div>
                </div>
                <input
                  type="range"
                  min={editDelay + 1}
                  max="60"
                  value={editFrozen}
                  onChange={(e) => setEditFrozen(Number(e.target.value))}
                  className="w-full accent-purple-400 cursor-pointer h-1.5 bg-slate-950 rounded-lg mt-1"
                />
                <p className="text-[10px] text-slate-400 leading-tight">
                  Waktu &ge; <strong className="text-purple-300">{editFrozen}s</strong> HB macet berubah menjadi Frozen (stuck).
                </p>
              </div>

              {/* 3. Dead Threshold */}
              <div className="p-3.5 bg-slate-900/90 border border-rose-500/30 rounded-xl flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-rose-300 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                    <span>Batas Dead (🔴)</span>
                  </span>
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      min={editFrozen + 1}
                      max="180"
                      value={editDead}
                      onChange={(e) => setEditDead(Math.max(editFrozen + 1, Number(e.target.value)))}
                      className="w-14 bg-slate-950 border border-slate-700 focus:border-rose-400 text-rose-300 font-mono font-black text-center text-xs rounded-lg py-1 px-1 outline-none"
                    />
                    <span className="text-[10px] font-bold text-slate-400">detik</span>
                  </div>
                </div>
                <input
                  type="range"
                  min={editFrozen + 1}
                  max="180"
                  value={editDead}
                  onChange={(e) => setEditDead(Number(e.target.value))}
                  className="w-full accent-rose-500 cursor-pointer h-1.5 bg-slate-950 rounded-lg mt-1"
                />
                <p className="text-[10px] text-slate-400 leading-tight">
                  Waktu &ge; <strong className="text-rose-300">{editDead}s</strong> tanpa data modul mati &amp; alarm bunyi.
                </p>
              </div>

            </div>
          </div>

          {/* 2. DYNAMIC VISUAL PROGRESSION TIMELINE BAR */}
          <div className="p-4.5 rounded-2xl bg-slate-950/70 border border-slate-800 flex flex-col gap-2.5">
            <div className="flex items-center justify-between text-xs font-bold text-slate-300">
              <span className="flex items-center gap-1.5 text-cyan-400">
                <Clock size={14} />
                <span>Simulasi Garis Waktu Real-Time (*Live Timeline Preview*)</span>
              </span>
              <span className="text-[10px] font-mono text-slate-500">Otomatis Terkalkulasi</span>
            </div>

            {/* Timeline Steps */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex flex-col items-center text-center">
                <span className="text-[11px] font-black text-emerald-400 font-mono">0s — {editDelay}s</span>
                <span className="text-xs font-bold text-white mt-0.5">🟢 LIVE</span>
                <span className="text-[9.5px] text-emerald-300/80 mt-0.5">HB Aktif Berdetak</span>
              </div>
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 flex flex-col items-center text-center">
                <span className="text-[11px] font-black text-amber-400 font-mono">{editDelay}s — {editFrozen}s</span>
                <span className="text-xs font-bold text-white mt-0.5">🟡 DELAY</span>
                <span className="text-[9.5px] text-amber-300/80 mt-0.5">Latensi / Terlambat</span>
              </div>
              <div className="p-3 rounded-xl bg-purple-500/10 border border-purple-500/30 flex flex-col items-center text-center">
                <span className="text-[11px] font-black text-purple-400 font-mono">{editFrozen}s — {editDead}s</span>
                <span className="text-xs font-bold text-white mt-0.5">🟣 FROZEN</span>
                <span className="text-[9.5px] text-purple-300/80 mt-0.5">HB Macet / Stuck</span>
              </div>
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 flex flex-col items-center text-center">
                <span className="text-[11px] font-black text-rose-400 font-mono">≥ {editDead}s</span>
                <span className="text-xs font-bold text-white mt-0.5">🔴 DEAD</span>
                <span className="text-[9.5px] text-rose-300/80 mt-0.5">Mati / Alarm Bunyi</span>
              </div>
            </div>
          </div>

          {/* 3. DETAILED CARDS PER STATUS */}
          {currentLegendConfigs.map((cfg, idx) => (
            <div
              key={idx}
              className={`p-4.5 rounded-2xl border ${cfg.borderClass} flex flex-col gap-3 transition-all`}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800/80 pb-2.5">
                <div className="flex items-center gap-2.5">
                  <span className={`w-3 h-3 rounded-full ${cfg.dotClass}`} />
                  <span className={`px-2.5 py-0.5 rounded-lg text-xs font-mono font-black border ${cfg.badgeClass}`}>
                    {cfg.label}
                  </span>
                  <span className="text-xs font-bold text-slate-400">
                    ({cfg.colorName})
                  </span>
                </div>
                <div className="flex items-center gap-1.5 font-mono text-[11px] font-bold text-slate-300 bg-slate-950/70 px-2.5 py-1 rounded-lg border border-slate-800">
                  <Clock size={12} className="text-cyan-400" />
                  <span>Ambang Batas: <span className="text-white font-black">{cfg.threshold}</span></span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                {/* Arti */}
                <div className="flex flex-col gap-1 bg-slate-950/50 p-2.5 rounded-xl border border-slate-800/60">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                    📖 Artinya
                  </span>
                  <p className="text-slate-200 font-medium leading-relaxed">
                    {cfg.meaning}
                  </p>
                </div>

                {/* Penyebab */}
                <div className="flex flex-col gap-1 bg-slate-950/50 p-2.5 rounded-xl border border-slate-800/60">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                    🔍 Penyebab Umum
                  </span>
                  <p className="text-slate-300 leading-relaxed">
                    {cfg.cause}
                  </p>
                </div>

                {/* Tindakan */}
                <div className="flex flex-col gap-1 bg-slate-950/50 p-2.5 rounded-xl border border-slate-800/60">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                    🛠️ Tindakan Teknisi
                  </span>
                  <p className="text-cyan-300 font-medium whitespace-pre-line leading-relaxed">
                    {cfg.action}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-800 bg-slate-950/80">
          <span className="text-xs text-slate-400 font-medium">
            💡 Tips: Alarm suara (*Sound Alarm*) hanya berbunyi saat status modul menjadi <span className="text-rose-400 font-bold">DEAD (≥ {editDead}s)</span>.
          </span>
          <button
            onClick={onClose}
            className="px-5 py-2 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-xl border border-slate-700 transition cursor-pointer"
          >
            Tutup Panduan
          </button>
        </div>
      </div>
    </div>
  );
}

// Inline Mini-Strip Legend for quick glance in toolbars
export function InlineStatusLegendStrip({ onOpenFullGuide, thresholds = DEFAULT_HB_THRESHOLDS }) {
  const { delaySec, frozenSec, deadSec } = thresholds;

  return (
    <div className="flex items-center gap-3 bg-slate-950/80 px-3.5 py-1.5 rounded-xl border border-slate-800 text-[11px] font-mono flex-wrap">
      <div className="flex items-center gap-1.5 text-emerald-400 font-bold">
        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
        <span>Hijau: Live (≤{delaySec}s)</span>
      </div>
      <span className="text-slate-700">•</span>
      <div className="flex items-center gap-1.5 text-amber-400 font-bold">
        <span className="w-2 h-2 rounded-full bg-amber-400" />
        <span>Kuning: Delay ({delaySec}-{frozenSec}s)</span>
      </div>
      <span className="text-slate-700">•</span>
      <div className="flex items-center gap-1.5 text-purple-400 font-bold">
        <span className="w-2 h-2 rounded-full bg-purple-400" />
        <span>Ungu: Frozen (≥{frozenSec}s Macet)</span>
      </div>
      <span className="text-slate-700">•</span>
      <div className="flex items-center gap-1.5 text-rose-400 font-bold">
        <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
        <span>Merah: Dead (≥{deadSec}s)</span>
      </div>
      {onOpenFullGuide && (
        <>
          <span className="text-slate-700">•</span>
          <button
            onClick={onOpenFullGuide}
            className="text-cyan-400 hover:text-cyan-300 underline underline-offset-2 font-bold cursor-pointer flex items-center gap-1"
          >
            <Sliders size={12} />
            <span>Atur Ambang Batas / Panduan</span>
          </button>
        </>
      )}
    </div>
  );
}
