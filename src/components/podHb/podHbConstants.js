import {
  Activity,
  AlertTriangle,
  Flame,
  Radio,
  ShieldAlert,
  Zap,
  CheckCircle2,
} from 'lucide-react';

// Fallback module definitions if API is loading
export const DEFAULT_MODULES = [
  { id: 501, name: 'Manual Control', port: 'ttyUSB0' },
  { id: 502, name: 'Chair Module', port: 'ttyUSB1' },
  { id: 503, name: 'Lighting Module', port: 'ttyUSB4' },
  { id: 504, name: 'Olfactory Module', port: 'ttyUSB5' },
  { id: 505, name: 'Door Module', port: null },
  { id: 506, name: 'AirCon Module', port: null },
  { id: 507, name: 'Audio Module', port: 'ttyUSB2' },
  { id: 508, name: 'Power Module', port: 'ttyUSB3' }
];

// Helper: Get today's local date string in WITA (Asia/Makassar)
export const getTodayLocalDate = () => {
  try {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Makassar',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).format(new Date());
  } catch (_) {
    return new Date().toLocaleDateString('sv-SE');
  }
};

// Helper: Get current time string in WITA (Asia/Makassar)
export const getCurrentWitaTime = () => {
  try {
    return new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Asia/Makassar',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    }).format(new Date());
  } catch (_) {
    const now = new Date();
    const h = String(now.getHours()).padStart(2, '0');
    const m = String(now.getMinutes()).padStart(2, '0');
    const s = String(now.getSeconds()).padStart(2, '0');
    return `${h}:${m}:${s}`;
  }
};

// Diagnosis Card Color & Theme Mapping
export const getDiagnosisTheme = (patternType) => {
  switch (patternType) {
    case 'TRANSIENT_IO_LAG':
      return {
        bg: 'bg-amber-950/30 border-amber-500/40 text-amber-200',
        badgeBg: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
        icon: AlertTriangle,
        iconColor: 'text-amber-400',
        gradient: 'from-amber-500/20 to-transparent'
      };
    case 'HARDWARE_REBOOT':
      return {
        bg: 'bg-rose-950/30 border-rose-500/40 text-rose-200',
        badgeBg: 'bg-rose-500/20 text-rose-300 border-rose-500/30',
        icon: Flame,
        iconColor: 'text-rose-400',
        gradient: 'from-rose-500/20 to-transparent'
      };
    case 'PACKET_DROP':
      return {
        bg: 'bg-blue-950/30 border-blue-500/40 text-blue-200',
        badgeBg: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
        icon: Radio,
        iconColor: 'text-blue-400',
        gradient: 'from-blue-500/20 to-transparent'
      };
    case 'FROZEN_STUCK':
      return {
        bg: 'bg-purple-950/30 border-purple-500/40 text-purple-200',
        badgeBg: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
        icon: ShieldAlert,
        iconColor: 'text-purple-400',
        gradient: 'from-purple-500/20 to-transparent'
      };
    case 'BURST_FLUSH':
      return {
        bg: 'bg-cyan-950/30 border-cyan-500/40 text-cyan-200',
        badgeBg: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30',
        icon: Zap,
        iconColor: 'text-cyan-400',
        gradient: 'from-cyan-500/20 to-transparent'
      };
    case 'HEALTHY_NORMAL':
      return {
        bg: 'bg-emerald-950/30 border-emerald-500/40 text-emerald-200',
        badgeBg: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
        icon: CheckCircle2,
        iconColor: 'text-emerald-400',
        gradient: 'from-emerald-500/20 to-transparent'
      };
    default:
      return {
        bg: 'bg-slate-900/60 border-slate-800 text-slate-300',
        badgeBg: 'bg-slate-800 text-slate-300 border-slate-700',
        icon: Activity,
        iconColor: 'text-cyan-400',
        gradient: 'from-slate-800/20 to-transparent'
      };
  }
};

// Generate Markdown report content focusing on incident rows
export const generateMarkdownReport = (analysisData, incidentTicks, targetTimeStr, selectedDate, windowMinutes, selectedPodId, selectedModuleId) => {
  if (!analysisData) return '';
  const meta = analysisData.meta || {};
  const diag = analysisData.diagnosis || {};
  const thresholds = meta.thresholds || {};

  let md = `# LAPORAN ANALISA INSIDEN DETAK MODUL (HEARTBEAT REPORT)\n\n`;
  try {
    const nowFormatted = new Intl.DateTimeFormat('id-ID', { timeZone: 'Asia/Makassar', dateStyle: 'full', timeStyle: 'medium' }).format(new Date());
    md += `**Tanggal Cetak Laporan**: ${nowFormatted} WITA\n`;
  } catch (_) {
    md += `**Tanggal Cetak Laporan**: ${new Date().toLocaleString()} WITA\n`;
  }
  md += `**Target Server / POD**: ${meta.serverName || `POD ${selectedPodId}`} (ID: ${meta.podId || selectedPodId})\n`;
  md += `**Modul Hardware**: ${meta.moduleName || `Modul ${selectedModuleId}`} (ID: ${meta.moduleId || selectedModuleId})\n`;
  md += `**Waktu Target Analisis**: ${meta.targetTime || targetTimeStr} WITA (${meta.resolvedDate || selectedDate})\n`;
  md += `**Jendela Pemantauan**: ±${meta.windowMinutes || windowMinutes} Menit (Total ${analysisData.ticks?.length || 0} Data Ticks)\n`;
  md += `**Ambang Batas**: Dead Gap ≥ ${thresholds.deadSec || 15}s | Frozen ≥ ${thresholds.frozenSec || 10}s | Lag ≥ 3s\n\n`;

  md += `---\n\n`;
  md += `## 1. RINGKASAN EKSEKUTIF & DIAGNOSA ROOT CAUSE\n\n`;
  md += `- **Klasifikasi Pola**: ${diag.patternTitle || 'NORMAL'}\n`;
  md += `- **Tingkat Keparahan (Severity)**: ${diag.severity || 'INFO'}\n`;
  md += `- **Tipe Pasca-Jeda**: ${diag.postDeadLabel || diag.postDeadType || '—'}\n`;
  md += `- **Ringkasan Kejadian**: ${diag.summary || 'Detak beroperasi normal tanpa jeda signifikan.'}\n\n`;
  md += `### Detail Akar Masalah Teknis:\n${diag.rootCauseDetails || 'Tidak ditemukan anomali atau kegagalan perangkat.'}\n\n`;
  md += `### Rekomendasi Tindakan Teknis:\n${diag.recommendedAction || 'Sistem beroperasi normal, tidak ada tindakan perbaikan yang diperlukan.'}\n\n`;

  md += `---\n\n`;
  md += `## 2. STATISTIK ANOMALI & INSIDEN\n\n`;
  md += `- **Total Baris Insiden Terdeteksi**: ${incidentTicks.length} baris\n`;
  md += `- **Jeda Mati Terpanjang (Max Dead Gap)**: ${meta.stats?.maxDeltaSec ? meta.stats.maxDeltaSec.toFixed(2) : 0} detik\n`;
  md += `- **Rata-rata Interval Pengiriman**: ${meta.stats?.avgDeltaSec ? meta.stats.avgDeltaSec.toFixed(2) : 0} detik\n`;
  md += `- **Total Kejadian Dead Gap (≥${thresholds.deadSec || 15}s)**: ${analysisData.gaps?.length || 0} kali\n\n`;

  md += `---\n\n`;
  md += `## 3. TABEL FOKUS BARIS DATA INSIDEN\n\n`;
  if (incidentTicks.length === 0) {
    md += `*Tidak ada baris data yang mengalami anomali pada jendela pemantauan ini. Seluruh detak modul beroperasi stabil dan berkelanjutan.*\n`;
  } else {
    md += `| No | Waktu (WITA) | Timestamp | Counter (#hb) | Selisih (ΔHB) | Jeda (Δt) | Status Insiden | Port | Keterangan Implikasi |\n`;
    md += `|---|---|---|---|---|---|---|---|---|\n`;
    incidentTicks.forEach((t, idx) => {
      const prevTick = t.index > 1 ? analysisData.ticks[t.index - 2] : null;
      const prevHb = prevTick?.hb !== undefined ? prevTick.hb : null;
      const hbFlow = prevHb !== null ? `#${prevHb} -> #${t.hb}` : `#${t.hb}`;
      const deltaHbStr = t.deltaHb !== null ? (t.deltaHb > 0 ? `+${t.deltaHb}` : `${t.deltaHb}`) : '—';
      const deltaSecStr = t.deltaSec !== null ? `${t.deltaSec.toFixed(2)}s` : '—';
      const typeStr = t.postDeadLabel || t.status || 'INSIDEN';

      let desc = 'Anomali transmisi detak.';
      if (t.postDeadType === 'LOMPAT' || t.deltaHb > 5) {
        desc = `Counter melompat (+${t.deltaHb} detak hilang di perjalanan jaringan/broker). Hardware tetap hidup.`;
      } else if (t.postDeadType === 'RESET' || t.status === 'RESET') {
        desc = 'Counter reset kembali ke awal (Modul MCU restart / catu daya drop).';
      } else if (t.status === 'GAP_DEAD') {
        desc = `Jeda mati hening ${deltaSecStr} melebihi ambang batas.`;
      } else if (t.status === 'GAP_LAG') {
        desc = `Lag spike keterlambatan pengiriman (${deltaSecStr}).`;
      } else if (t.status === 'FROZEN') {
        desc = 'Counter membeku / tidak bertambah.';
      }

      md += `| ${idx + 1} | ${t.time || t.date} | ${t.ts} | ${hbFlow} | ${deltaHbStr} | ${deltaSecStr} | ${typeStr} | ${t.port || 'serial'} | ${desc} |\n`;
    });
  }

  md += `\n---\n*Dokumen ini dibuat otomatis oleh Sistem Monitoring Server & Heartbeat Analyzer.*\n`;
  return md;
};

// Generate Incident Rows CSV Content
export const generateIncidentCsv = (analysisData, incidentTicks, selectedPodId, selectedModuleId, selectedDate) => {
  if (!analysisData || incidentTicks.length === 0) return null;
  const meta = analysisData.meta || {};
  const headers = ['No', 'Baris_Log', 'Date_WITA', 'Time_WITA', 'Timestamp_MS', 'Counter_Sebelum', 'Counter_Sesudah', 'Delta_HB', 'Delta_Sec', 'Status', 'Tipe_Pasca_Jeda', 'Port', 'Penjelasan_Implikasi'];
  const rows = incidentTicks.map((t, idx) => {
    const prevTick = t.index > 1 ? analysisData.ticks[t.index - 2] : null;
    const prevHb = prevTick?.hb !== undefined ? prevTick.hb : '';
    const deltaHbStr = t.deltaHb !== null ? String(t.deltaHb) : '';
    const deltaSecStr = t.deltaSec !== null ? t.deltaSec.toFixed(2) : '';

    let desc = 'Anomali transmisi detak';
    if (t.postDeadType === 'LOMPAT' || t.deltaHb > 5) {
      desc = `Counter melompat (+${t.deltaHb} detak hilang di perjalanan)`;
    } else if (t.postDeadType === 'RESET' || t.status === 'RESET') {
      desc = 'Counter reset mulai dari awal (Modul MCU restart)';
    } else if (t.status === 'GAP_DEAD') {
      desc = `Dead gap hening selama ${deltaSecStr}s`;
    } else if (t.status === 'GAP_LAG') {
      desc = `Lag spike keterlambatan pengiriman selama ${deltaSecStr}s`;
    } else if (t.status === 'FROZEN') {
      desc = 'Counter membeku / tidak bertambah';
    }

    return [
      idx + 1,
      t.index,
      `"${t.date || ''}"`,
      `"${t.time || ''}"`,
      t.ts,
      prevHb !== '' ? prevHb : '',
      t.hb !== null ? t.hb : '',
      deltaHbStr,
      deltaSecStr,
      `"${t.status || ''}"`,
      `"${t.postDeadLabel || t.postDeadType || ''}"`,
      `"${t.port || ''}"`,
      `"${desc}"`
    ].join(',');
  });

  const csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\n');
  const filename = `baris_insiden_pod${meta.podId || selectedPodId}_mod${meta.moduleId || selectedModuleId}_${meta.resolvedDate || selectedDate}.csv`;
  return { csvContent, filename };
};
