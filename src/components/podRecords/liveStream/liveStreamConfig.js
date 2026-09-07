// Channel color mapping for telemetry signals
export const CHANNEL_COLORS = {
  EE_12V: '#06b6d4',   // Cyan
  EE_5V: '#f59e0b',    // Amber
  VAC_220: '#f43f5e',  // Rose / Red
  JAB5_A: '#10b981',   // Emerald
  JAB5_B: '#8b5cf6',   // Purple
  SUB_12V: '#f97316',  // Orange
  voltage: '#38bdf8',  // Sky Blue
  current: '#fbbf24',  // Amber
  power: '#34d399',    // Emerald
  pob_raw: '#a78bfa',  // Violet
  HM_CUR: '#06b6d4',   // Cyan
  PEMF_CUR: '#f43f5e', // Rose
  temp: '#fb7185',     // Rose
  humi: '#2dd4bf',     // Teal
  COMP_OLFA: '#6366f1',// Indigo
  OLFA_0: '#06b6d4',
  OLFA_1: '#3b82f6',
  OLFA_2: '#8b5cf6',
  OLFA_3: '#ec4899',
  OLFA_4: '#f97316',
  OLFA_5: '#f59e0b',
  OLFA_6: '#10b981',
  'Warm Strobe 1': '#f59e0b',
  'Warm Strobe 2': '#fbbf24',
  'Cool Strobe 1': '#38bdf8',
  'Cool Strobe 2': '#06b6d4',
  hb: '#38bdf8'        // Sky Blue for heartbeat counter
};

export const FALLBACK_COLORS = [
  '#06b6d4', '#f59e0b', '#f43f5e', '#10b981', '#8b5cf6',
  '#f97316', '#3b82f6', '#ec4899', '#14b8a6', '#eab308'
];

export function getChannelUnit(ch) {
  if (!ch) return '';
  if (ch === 'power') return 'W';
  if (ch === 'voltage') return 'V';
  if (ch === 'pob_raw') return 'Raw';
  if (ch === 'temp') return '°C';
  if (ch === 'humi') return '%';
  if (ch === 'hb') return 'Detak';
  if (
    ch === 'current' ||
    ch.includes('CUR') ||
    ch.startsWith('EE_') ||
    ch === 'VAC_220' ||
    ch.startsWith('JAB') ||
    ch.startsWith('SUB') ||
    ch.startsWith('OLFA') ||
    ch === 'COMP_OLFA' ||
    ch.includes('Strobe') ||
    ch === 'PC_12V' ||
    ch === 'LIGHT_24V' ||
    ch === 'AUDIO_12V' ||
    ch === 'LED_5V'
  ) {
    return 'mA';
  }
  return '';
}

export const WINDOW_PRESETS = [
  { sec: 30, label: '30s', desc: '30 Detik' },
  { sec: 60, label: '1m', desc: '1 Menit' },
  { sec: 300, label: '5m', desc: '5 Menit' },
  { sec: 900, label: '15m', desc: '15 Menit' },
  { sec: 1800, label: '30m', desc: '30 Menit' },
  { sec: 3600, label: '1j', desc: '1 Jam' },
  { sec: 7200, label: '2j', desc: '2 Jam' },
  { sec: 10800, label: '3j', desc: '3 Jam' }
];

export function formatWindowLabel(sec) {
  const matched = WINDOW_PRESETS.find((p) => p.sec === sec);
  if (matched) return matched.label;
  if (!sec || sec < 60) return `${sec || 0}s`;
  if (sec % 3600 === 0) return `${sec / 3600}j`;
  if (sec >= 3600) return `${(sec / 3600).toFixed(1)}j`;
  return `${Math.round(sec / 60)}m`;
}

export function formatWindowDesc(sec) {
  if (!sec || sec < 60) return `${sec || 0} detik`;
  if (sec % 3600 === 0) return `${sec / 3600} jam`;
  if (sec >= 3600) {
    const hours = Math.floor(sec / 3600);
    const mins = Math.round((sec % 3600) / 60);
    return mins > 0 ? `${hours} jam ${mins} menit` : `${hours} jam`;
  }
  return `${Math.round(sec / 60)} menit`;
}

/**
 * Determine if a channel name strictly represents electrical current (mA)
 */
export function isCurrentChannel(ch) {
  if (!ch) return false;
  const c = String(ch).toUpperCase();
  if (
    c === 'TEMP' ||
    c === 'HUMI' ||
    c === 'POB_RAW' ||
    c === 'HB' ||
    c === 'VOLTAGE' ||
    c === 'POWER' ||
    c === 'TIME' ||
    c === 'TIMESTAMP'
  ) {
    return false;
  }
  if (
    c === 'CURRENT' ||
    c.includes('CUR') || // HM_CUR, PEMF_CUR
    c.startsWith('EE_') || // EE_12V, EE_5V
    c === 'VAC_220' ||
    c.startsWith('JAB') ||
    c.startsWith('SUB') ||
    c.startsWith('OLFA') || // OLFA_0..6
    c === 'COMP_OLFA' ||
    c.includes('STROBE') || // Warm Strobe 1, Cool Strobe 1, etc.
    c === 'PC_12V' ||
    c === 'LIGHT_24V' ||
    c === 'AUDIO_12V' ||
    c === 'LED_5V'
  ) {
    return true;
  }
  return false;
}
