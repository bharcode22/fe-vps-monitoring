import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  Wifi,
  WifiOff,
  Zap,
  Activity,
  ArrowDownToLine,
  Clock,
  RefreshCw,
  Info,
  ShieldCheck,
  Signal,
  CheckCircle2,
  HelpCircle,
  X,
  Globe,
  Radio,
  Sliders,
  Server
} from 'lucide-react';
import { useClientBandwidth } from '../../hooks/useClientBandwidth';

export default function NavbarBandwidthWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [showInfoModal, setShowInfoModal] = useState(false);
  const containerRef = useRef(null);

  const {
    downlinkMbps,
    pingMs,
    effectiveType,
    isOnline,
    connectionType,
    lastTestedAt,
    isTesting,
    quality,
    runSpeedTest,
    pingBackend
  } = useClientBandwidth();

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Theme & color tokens based on quality
  const getQualityTheme = () => {
    if (!isOnline) {
      return {
        dot: 'bg-rose-500',
        text: 'text-rose-400',
        border: 'border-rose-500/30',
        bg: 'bg-rose-500/10',
        badge: 'bg-rose-500/20 text-rose-300 border-rose-500/30',
        label: 'Terputus (Offline)',
        barsActive: 0
      };
    }
    switch (quality) {
      case 'EXCELLENT':
        return {
          dot: 'bg-emerald-400 animate-pulse',
          text: 'text-emerald-300',
          border: 'border-emerald-500/40',
          bg: 'bg-emerald-500/15',
          badge: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
          label: 'Sangat Cepat & Stabil',
          barsActive: 4
        };
      case 'GOOD':
        return {
          dot: 'bg-cyan-400',
          text: 'text-cyan-300',
          border: 'border-cyan-500/40',
          bg: 'bg-cyan-500/15',
          badge: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30',
          label: 'Bagus (Optimal)',
          barsActive: 3
        };
      case 'MODERATE':
        return {
          dot: 'bg-amber-400',
          text: 'text-amber-300',
          border: 'border-amber-500/40',
          bg: 'bg-amber-500/15',
          badge: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
          label: 'Sedang (Cukup)',
          barsActive: 2
        };
      case 'POOR':
      default:
        return {
          dot: 'bg-rose-400',
          text: 'text-rose-300',
          border: 'border-rose-500/40',
          bg: 'bg-rose-500/15',
          badge: 'bg-rose-500/20 text-rose-300 border-rose-500/30',
          label: 'Lambat / High Latency',
          barsActive: 1
        };
    }
  };

  const theme = getQualityTheme();

  return (
    <>
      <div className="relative" ref={containerRef}>
        {/* Navbar Trigger Pill */}
        <button
          onClick={() => setIsOpen(prev => !prev)}
          className={`group px-2.5 py-1.5 rounded-xl border flex items-center gap-2 transition-all duration-300 cursor-pointer shadow-sm ${
            isOpen
              ? `${theme.bg} ${theme.border} ring-2 ring-cyan-500/20 shadow-cyan-500/10`
              : 'bg-slate-950/70 border-slate-800/90 hover:border-slate-700 hover:bg-slate-900/80'
          }`}
          title="Klik untuk melihat detail kecepatan internet & latensi klien"
        >
          {/* Signal Strength 4-Bar Icon */}
          <div className="flex items-end gap-0.5 h-3.5 px-0.5" aria-hidden="true">
            {[1, 2, 3, 4].map((bar) => {
              const isActive = bar <= theme.barsActive;
              const heightClass =
                bar === 1 ? 'h-1.5' : bar === 2 ? 'h-2' : bar === 3 ? 'h-2.5' : 'h-3.5';
              return (
                <span
                  key={bar}
                  className={`w-0.5 rounded-full transition-all duration-300 ${heightClass} ${
                    isActive
                      ? quality === 'EXCELLENT'
                        ? 'bg-emerald-400 shadow-sm shadow-emerald-400/50'
                        : quality === 'GOOD'
                        ? 'bg-cyan-400 shadow-sm shadow-cyan-400/50'
                        : quality === 'MODERATE'
                        ? 'bg-amber-400'
                        : 'bg-rose-400'
                      : 'bg-slate-700/60'
                  }`}
                />
              );
            })}
          </div>

          {/* Speed & Latency Text */}
          <div className="flex items-center gap-1 font-mono text-xs font-bold leading-none">
            {isTesting ? (
              <span className="flex items-center gap-1 text-cyan-400">
                <RefreshCw size={11} className="animate-spin text-cyan-400" />
                <span className="text-[10px] text-cyan-300 font-bold">Test</span>
              </span>
            ) : !isOnline ? (
              <span className="text-rose-400 text-[11px] font-bold">Offline</span>
            ) : (
              <>
                <span className={`font-black ${theme.text}`}>
                  {downlinkMbps !== null ? `${downlinkMbps}` : '--'}
                  <span className="text-[9px] font-semibold text-slate-400 ml-0.5">M</span>
                </span>
                {pingMs !== null && (
                  <span className="hidden 2xl:inline text-[10px] text-slate-400 font-semibold border-l border-slate-800 pl-1">
                    {pingMs}<span className="text-[8px] text-slate-500">ms</span>
                  </span>
                )}
              </>
            )}
          </div>

          {/* Status Dot */}
          <span className={`w-1.5 h-1.5 rounded-full ${theme.dot}`} />
        </button>

        {/* Dropdown Popover */}
        {isOpen && (
          <div className="absolute right-0 top-full mt-3.5 sm:mt-4 w-72 sm:w-80 p-4 bg-slate-900/95 backdrop-blur-xl border border-slate-800/90 rounded-2xl shadow-2xl z-[60] animate-in fade-in slide-in-from-top-3 duration-200">
            {/* Pointer arrow */}
            <div className="absolute -top-1.5 right-6 w-3 h-3 bg-slate-900 border-t border-l border-slate-800/90 rotate-45" />

            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <div className={`p-2 rounded-xl border ${theme.badge}`}>
                  <Activity size={16} className={theme.text} />
                </div>
                <div>
                  <h4 className="text-xs font-black text-white tracking-wide">Client Bandwidth</h4>
                  <p className="text-[10px] text-slate-400 font-medium">Kecepatan Akses Perangkat Anda</p>
                </div>
              </div>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${theme.badge}`}>
                {theme.label}
              </span>
            </div>

            {/* Metrics Grid */}
            <div className="grid grid-cols-2 gap-2.5 my-3.5">
              {/* Download Speed */}
              <div className="flex flex-col justify-between p-3 bg-slate-950/70 rounded-xl border border-slate-800/80">
                <div className="flex items-center justify-between text-slate-400 mb-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider">Download</span>
                  <ArrowDownToLine size={13} className="text-cyan-400" />
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="text-2xl font-black font-mono text-white leading-none">
                    {downlinkMbps !== null ? downlinkMbps : '--'}
                  </span>
                  <span className="text-xs font-bold text-cyan-400">Mbps</span>
                </div>
                <span className="text-[9px] text-slate-500 mt-1">Bandwidth Riil</span>
              </div>

              {/* Latency / Ping */}
              <div className="flex flex-col justify-between p-3 bg-slate-950/70 rounded-xl border border-slate-800/80">
                <div className="flex items-center justify-between text-slate-400 mb-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider">Latensi (Ping)</span>
                  <Clock size={13} className="text-indigo-400" />
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="text-2xl font-black font-mono text-white leading-none">
                    {pingMs !== null ? pingMs : '--'}
                  </span>
                  <span className="text-xs font-bold text-indigo-400">ms</span>
                </div>
                <span className="text-[9px] text-slate-500 mt-1">Round-Trip Time</span>
              </div>
            </div>

            {/* Network Specs Breakdown */}
            <div className="p-2.5 bg-slate-950/50 rounded-xl border border-slate-800/60 space-y-1.5 text-[11px] mb-3">
              <div className="flex items-center justify-between">
                <span className="text-slate-400 font-medium">Tipe Jaringan:</span>
                <span className="font-bold text-slate-200 uppercase font-mono">{effectiveType} ({connectionType})</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400 font-medium">Status Internet:</span>
                <span className="flex items-center gap-1 font-bold text-emerald-400">
                  <CheckCircle2 size={11} /> {isOnline ? 'Online' : 'Offline'}
                </span>
              </div>
              {lastTestedAt && (
                <div className="flex items-center justify-between text-[10px] text-slate-500 pt-1 border-t border-slate-800/50">
                  <span>Pengujian Terakhir:</span>
                  <span className="font-mono">{new Date(lastTestedAt).toLocaleTimeString('id-ID')}</span>
                </div>
              )}
            </div>

            {/* Speedtest Action Button */}
            <button
              type="button"
              disabled={isTesting}
              onClick={() => runSpeedTest(400000)}
              className="w-full py-2 bg-gradient-to-r from-cyan-500/20 to-blue-500/20 hover:from-cyan-500/30 hover:to-blue-500/30 text-cyan-300 hover:text-white rounded-xl border border-cyan-500/40 text-xs font-bold tracking-wide uppercase transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md disabled:opacity-50"
            >
              <RefreshCw size={13} className={isTesting ? 'animate-spin text-cyan-400' : ''} />
              <span>{isTesting ? 'Menguji Kecepatan...' : '⚡ Uji Kecepatan Sekarang'}</span>
            </button>

            {/* Information Button */}
            <button
              type="button"
              onClick={() => {
                setShowInfoModal(true);
                setIsOpen(false);
              }}
              className="w-full mt-2 py-1.5 px-3 bg-slate-950/60 hover:bg-slate-800/80 text-slate-400 hover:text-slate-200 rounded-xl border border-slate-800/80 hover:border-slate-700 text-[11px] font-semibold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <HelpCircle size={13} className="text-cyan-400" />
              <span>Informasi &amp; Cara Hitung Bandwidth</span>
            </button>
          </div>
        )}
      </div>

      {/* Full Explanatory Information Modal */}
      {showInfoModal && (
        <BandwidthInfoModal onClose={() => setShowInfoModal(false)} />
      )}
    </>
  );
}

/**
 * Modal dialog explaining how client bandwidth & latency are calculated
 */
function BandwidthInfoModal({ onClose }) {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (typeof document === 'undefined') return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[99999] flex items-center justify-center p-3 sm:p-6 bg-slate-950/85 backdrop-blur-md overflow-y-auto animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-2xl bg-slate-900 border border-slate-800/90 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] sm:max-h-[88vh] my-auto animate-in fade-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Sticky Header */}
        <div className="flex items-center justify-between gap-3 p-4 sm:p-5 border-b border-slate-800 bg-slate-900/95 backdrop-blur-md shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-gradient-to-br from-cyan-500/20 to-blue-500/20 text-cyan-400 rounded-2xl border border-cyan-500/30 shadow-lg shadow-cyan-500/10 shrink-0">
              <Activity size={22} />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black text-white tracking-wide leading-tight">
                Informasi &amp; Sumber Data Bandwidth Klien
              </h3>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Metodologi pengukuran kecepatan internet dan latensi perangkat Anda
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white rounded-xl border border-slate-700/60 transition-all cursor-pointer shrink-0"
            title="Tutup Modal"
          >
            <X size={18} />
          </button>
        </div>

        {/* Scrollable Content Section */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-4">
          {/* Pillar 1: Active Speed Test */}
          <div className="p-4 bg-slate-950/70 rounded-2xl border border-cyan-500/30 space-y-2">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-cyan-500/20 text-cyan-300 rounded-lg border border-cyan-500/30">
                <Zap size={14} />
              </div>
              <h4 className="text-xs sm:text-sm font-extrabold text-white">
                1. Pengukuran Aktif Riil (Active Throughput Speed Test)
              </h4>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Frontend mengunduh payload uji sebesar <strong>~350 KB</strong> dari endpoint backend <code className="px-1.5 py-0.5 bg-slate-900 border border-slate-700 rounded text-cyan-300 font-mono text-[11px]">/api/speedtest-data</code> menggunakan timer presisi tinggi <code className="text-cyan-300 font-mono">performance.now()</code>.
            </p>
            <div className="bg-slate-900/90 p-2.5 rounded-xl border border-slate-800 font-mono text-[11px] text-slate-300 flex flex-col sm:flex-row sm:items-center justify-between gap-1">
              <span className="text-slate-400 font-sans font-semibold text-[10px]">Rumus Bandwidth:</span>
              <span className="text-cyan-300 font-bold text-[10px] sm:text-[11px]">Mbps = (Total Bytes × 8) / (Durasi Detik × 1.000.000)</span>
            </div>
          </div>

          {/* Pillar 2: Browser Network Information API */}
          <div className="p-4 bg-slate-950/70 rounded-2xl border border-indigo-500/30 space-y-2">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-indigo-500/20 text-indigo-300 rounded-lg border border-indigo-500/30">
                <Globe size={14} />
              </div>
              <h4 className="text-xs sm:text-sm font-extrabold text-white">
                2. Browser Native Network Information API
              </h4>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Membaca langsung dari API standar browser <code className="text-indigo-300 font-mono">navigator.connection</code>:
            </p>
            <ul className="text-xs text-slate-400 space-y-1 pl-4 list-disc">
              <li><strong className="text-slate-200">downlink</strong>: Estimasi bandwidth efektif kartu jaringan dalam Mbps.</li>
              <li><strong className="text-slate-200">rtt</strong>: Round-trip time jaringan dalam milidetik (ms).</li>
              <li><strong className="text-slate-200">effectiveType</strong>: Klasifikasi tipe jaringan (<code className="text-indigo-300">4g</code>, <code className="text-indigo-300">3g</code>, <code className="text-indigo-300">wifi</code>).</li>
              <li>Mendengarkan event <code className="text-indigo-300">change</code> saat koneksi internet Anda berganti secara instan.</li>
            </ul>
          </div>

          {/* Pillar 3: Latency & Ping Probe */}
          <div className="p-4 bg-slate-950/70 rounded-2xl border border-emerald-500/30 space-y-2">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-emerald-500/20 text-emerald-300 rounded-lg border border-emerald-500/30">
                <Clock size={14} />
              </div>
              <h4 className="text-xs sm:text-sm font-extrabold text-white">
                3. Probe Latensi &amp; Respon Server (Round-Trip Time)
              </h4>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Setiap <strong>15 detik</strong>, sistem mengirimkan *ping probe* ringan ke endpoint <code className="text-emerald-300 font-mono">/api/health</code> untuk mengukur seberapa cepat respon server ke browser Anda.
            </p>
          </div>

          {/* Standards Table */}
          <div className="p-4 bg-slate-950/70 rounded-2xl border border-slate-800 space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <ShieldCheck size={14} className="text-cyan-400" />
              <span>Standar Klasifikasi Kualitas Jaringan</span>
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-center">
                <span className="text-[10px] font-bold text-emerald-400 uppercase">Sangat Cepat</span>
                <p className="text-xs font-black text-white font-mono mt-0.5">≥ 25 Mbps</p>
                <span className="text-[9px] text-slate-400">Ping &lt; 40ms</span>
              </div>
              <div className="p-2.5 bg-cyan-500/10 border border-cyan-500/30 rounded-xl text-center">
                <span className="text-[10px] font-bold text-cyan-400 uppercase">Bagus / Optimal</span>
                <p className="text-xs font-black text-white font-mono mt-0.5">10 - 25 Mbps</p>
                <span className="text-[9px] text-slate-400">Ping 40-90ms</span>
              </div>
              <div className="p-2.5 bg-amber-500/10 border border-amber-500/30 rounded-xl text-center">
                <span className="text-[10px] font-bold text-amber-400 uppercase">Sedang / Cukup</span>
                <p className="text-xs font-black text-white font-mono mt-0.5">2 - 10 Mbps</p>
                <span className="text-[9px] text-slate-400">Ping 90-180ms</span>
              </div>
              <div className="p-2.5 bg-rose-500/10 border border-rose-500/30 rounded-xl text-center">
                <span className="text-[10px] font-bold text-rose-400 uppercase">Lambat</span>
                <p className="text-xs font-black text-white font-mono mt-0.5">&lt; 2 Mbps</p>
                <span className="text-[9px] text-slate-400">Ping &gt; 180ms</span>
              </div>
            </div>
          </div>
        </div>

        {/* Sticky Footer */}
        <div className="p-3.5 sm:p-4 border-t border-slate-800 bg-slate-950/70 shrink-0 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-black text-xs uppercase tracking-wider rounded-xl shadow-lg shadow-cyan-500/20 transition-all cursor-pointer"
          >
            Mengerti &amp; Tutup
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
