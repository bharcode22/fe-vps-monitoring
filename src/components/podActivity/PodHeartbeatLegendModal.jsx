import React from 'react';
import {
  X,
  HelpCircle,
  Clock,
  Zap,
  Activity,
  Cpu,
  RefreshCw,
  Sparkles,
  Info
} from 'lucide-react';

export const STATUS_LEGEND_CONFIGS = [
  {
    key: 'live',
    status: 'LIVE',
    colorName: 'Hijau (Emerald)',
    label: '🟢 ACTIVE / LIVE',
    badgeClass: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
    dotClass: 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,1)] animate-pulse',
    borderClass: 'border-emerald-500/30 bg-emerald-500/10',
    threshold: '<= 2 Detik',
    meaning: 'Modul hardware berdetak normal dan angka counter aktif bertambah.',
    cause: 'Komunikasi serial USB dan broker MQTT berjalan lancar tanpa kendala.',
    action: 'Tidak perlu tindakan apa pun. Sistem dalam kondisi prima.'
  },
  {
    key: 'delay',
    status: 'DELAY',
    colorName: 'Kuning (Amber)',
    label: '🟡 WARNING / DELAY',
    badgeClass: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
    dotClass: 'bg-amber-400 shadow-[0_0_6px_rgba(251,191,36,0.8)]',
    borderClass: 'border-amber-500/40 bg-amber-500/10',
    threshold: '2 - 3 Detik',
    meaning: 'Terjadi keterlambatan/latensi pengiriman paket heartbeat atau kenaikan counter.',
    cause: 'Beban jaringan LAN tinggi, traffic MQTT padat, atau modul sedikit lambat merespons.',
    action: 'Pantau terus. Jika kembali hijau secara otomatis, aman. Jika berlanjut, akan berubah menjadi Frozen atau Dead.'
  },
  {
    key: 'dead',
    status: 'DEAD',
    colorName: 'Merah (Rose)',
    label: '🔴 DEAD / TIMEOUT',
    badgeClass: 'bg-rose-500/20 text-rose-300 border-rose-500/40 animate-pulse',
    dotClass: 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,1)] animate-ping',
    borderClass: 'border-rose-500/50 bg-rose-500/15',
    threshold: '> 8 Detik / No Data',
    meaning: 'Modul mati total / tidak ada detak heartbeat masuk.',
    cause: 'Kabel USB serial kendor/terlepas, power supply modul mati, atau port ttyUSB crash.',
    action: '1. Klik tombol "Ping Status" / "Reset".\n2. Jika tetap merah, periksa fisik kabel USB / colokan hardware pada Pod.'
  },
  {
    key: 'frozen',
    status: 'FROZEN',
    colorName: 'Ungu (Purple)',
    label: '🟣 FROZEN / STALLED',
    badgeClass: 'bg-purple-500/20 text-purple-300 border-purple-500/40 animate-pulse',
    dotClass: 'bg-purple-400 shadow-[0_0_8px_rgba(192,132,252,1)]',
    borderClass: 'border-purple-500/50 bg-purple-500/15',
    threshold: '> 3 Detik (HB Macet)',
    meaning: 'Paket MQTT masuk, namun angka counter HB tidak bertambah sama sekali (stuck).',
    cause: 'Firmware microcontroller hang/freeze di loop serial program.',
    action: 'Kirim perintah "RESET" dari dashboard atau restart power board microcontroller.'
  },
  {
    key: 'flash',
    status: 'FLASH',
    colorName: 'Cyan (Biru Muda)',
    label: '⚡ PACKET FLASH',
    badgeClass: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40',
    dotClass: 'bg-cyan-400 animate-pulse',
    borderClass: 'border-cyan-400/80 ring-2 ring-cyan-400/50 bg-cyan-500/20',
    threshold: 'Realtime Flash (0.7s)',
    meaning: 'Animasi kilau penanda ada paket data baru yang baru saja diterima saat itu juga.',
    cause: 'Data MQTT baru saja mendarat di broker dan ditangkap dashboard.',
    action: 'Indikator visual bahwa aliran data realtime sedang berlangsung.'
  }
];

export const STATUS_LEGEND_ITEMS = STATUS_LEGEND_CONFIGS;

export default function PodHeartbeatLegendModal({ isOpen, onClose }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-150">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-800 bg-slate-950/80">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-gradient-to-br from-indigo-500/20 to-purple-500/20 text-indigo-400 rounded-2xl border border-indigo-500/30 shadow-lg shadow-indigo-500/10">
              <HelpCircle size={22} />
            </div>
            <div>
              <h3 className="text-base font-black text-white tracking-wide">
                Panduan Indikator & Keterangan Status Modul Heartbeat
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Arti warna, ambang batas waktu (threshold), penyebab, dan panduan penanganan
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
        <div className="p-6 overflow-y-auto flex flex-col gap-4 max-h-[calc(90vh-130px)]">
          {STATUS_LEGEND_CONFIGS.map((cfg, idx) => (
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
            💡 Tips: Anda dapat membunyikan alarm otomatis (*Sound Alarm*) saat status berubah menjadi merah.
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
export function InlineStatusLegendStrip({ onOpenFullGuide }) {
  return (
    <div className="flex items-center gap-3 bg-slate-950/80 px-3.5 py-1.5 rounded-xl border border-slate-800 text-[11px] font-mono flex-wrap">
      <div className="flex items-center gap-1.5 text-emerald-400 font-bold">
        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
        <span>Hijau: Live (≤2s)</span>
      </div>
      <span className="text-slate-700">•</span>
      <div className="flex items-center gap-1.5 text-amber-400 font-bold">
        <span className="w-2 h-2 rounded-full bg-amber-400" />
        <span>Kuning: Delay (2-3s)</span>
      </div>
      <span className="text-slate-700">•</span>
      <div className="flex items-center gap-1.5 text-rose-400 font-bold">
        <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
        <span>Merah: Dead (&gt;8s)</span>
      </div>
      <span className="text-slate-700">•</span>
      <div className="flex items-center gap-1.5 text-purple-400 font-bold">
        <span className="w-2 h-2 rounded-full bg-purple-400" />
        <span>Ungu: Frozen (&gt;3s Macet)</span>
      </div>
      {onOpenFullGuide && (
        <>
          <span className="text-slate-700">•</span>
          <button
            onClick={onOpenFullGuide}
            className="text-cyan-400 hover:text-cyan-300 underline underline-offset-2 font-bold cursor-pointer flex items-center gap-1"
          >
            <HelpCircle size={12} />
            <span>Lihat Panduan Lengkap</span>
          </button>
        </>
      )}
    </div>
  );
}
