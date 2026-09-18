import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import {
  Wind,
  Zap,
  Sun,
  Volume2,
  Activity,
  Terminal,
  Sparkles,
  Loader2
} from 'lucide-react';

// 12 High-Power LED Domes mapped directly from physical LIGHTING STROBE BOARD V2.0 (from MediaPreviewModal.jsx)
const STROBE_BOARD_LEDS = [
  // 6 COOL LEDs (Perimeter & Cardinal Points - Pale Clear Glass Domes)
  { id: 'cool-top', label: 'LED1', type: 'cool', cx: 130, cy: 38 },
  { id: 'cool-left-top', label: 'LED2', type: 'cool', cx: 50, cy: 98 },
  { id: 'cool-left-bottom', label: 'LED3', type: 'cool', cx: 50, cy: 162 },
  { id: 'cool-right-top', label: 'LED4', type: 'cool', cx: 210, cy: 98 },
  { id: 'cool-right-bottom', label: 'LED5', type: 'cool', cx: 210, cy: 162 },
  { id: 'cool-bottom', label: 'LED6', type: 'cool', cx: 130, cy: 222 },

  // 6 WARM LEDs (Inner Solar Cluster - Golden Amber Domes)
  { id: 'warm-upper-left', label: 'LED7', type: 'warm', cx: 96, cy: 90 },
  { id: 'warm-upper-center', label: 'LED8', type: 'warm', cx: 130, cy: 100 },
  { id: 'warm-upper-right', label: 'LED9', type: 'warm', cx: 164, cy: 90 },
  { id: 'warm-lower-left', label: 'LED10', type: 'warm', cx: 110, cy: 156 },
  { id: 'warm-lower-right', label: 'LED11', type: 'warm', cx: 150, cy: 156 },
  { id: 'warm-inner-bottom', label: 'LED12', type: 'warm', cx: 130, cy: 180 }
];

// Helper to find first active pulse timestamp (seconds)
function findFirstPulseTime(envL, envR, thresh = 40) {
  if (!envL && !envR) return null;
  const len = Math.max(envL?.length || 0, envR?.length || 0);
  for (let i = 0; i < len; i++) {
    const l = envL && i < envL.length ? envL[i] : 0;
    const r = envR && i < envR.length ? envR[i] : 0;
    if (l > thresh || r > thresh) {
      return i / 500; // 500Hz sampling rate
    }
  }
  return null;
}

function formatDuration(sec) {
  if (!sec || isNaN(sec)) return '0:00';
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s < 10 ? '0' : ''}${s}`;
}

export default function VirtualPodSimulator({
  isStrobeWarmOn = false,
  isStrobeCoolOn = false,
  strobeEnvelopeL = null,
  strobeEnvelopeR = null,
  strobeThreshold = 40,
  setStrobeThreshold,
  currentTime = 0,
  isPlaying = false,
  isStrobeAnalyzing = false,
  isStrobeActive = false,
  strobeFile = null,
  mediaLoadProgress = null,
  audioLoadProgress = null,
  strobeLoadProgress = null,
  onSeek = null,
  olfActive = false,
  olfLabel = 'idle',
  pemfActive = false,
  pemfLabel = 'idle',
  nirActive = false,
  nirLabel = 'idle',
  speakerActivity = 0,
  transducerActivity = 0,
  subwooferActivity = 0,
  systemLogs = [],
  isLogOpen = false,
  setIsLogOpen
}) {
  const logicCanvasRef = useRef(null);
  const speakerCanvasRef = useRef(null);
  const transducerCanvasRef = useRef(null);
  const subwooferCanvasRef = useRef(null);

  const [logicHoverX, setLogicHoverX] = useState(null);
  const [logicHoverTime, setLogicHoverTime] = useState(null);

  // Detect first pulse timestamp for quick jump
  const firstPulseTime = useMemo(() => {
    return findFirstPulseTime(strobeEnvelopeL, strobeEnvelopeR, strobeThreshold);
  }, [strobeEnvelopeL, strobeEnvelopeR, strobeThreshold]);

  // Draw 500Hz Realtime Logic Wave Canvas (Top: L/Warm, Bottom: R/Cool, Center Playhead)
  const drawLogicWave = useCallback(() => {
    const canvas = logicCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;
    const laneH = h / 2;
    const winSize = 10; // 10 seconds window around playhead
    const startTime = currentTime - (winSize / 2);
    const endTime = currentTime + (winSize / 2);

    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = '#020617';
    ctx.fillRect(0, 0, w, h);

    // Subtle vertical grid lines
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 1;
    for (let i = 0; i < w; i += w / 10) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i, h);
      ctx.stroke();
    }

    // Lane divider
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, laneH);
    ctx.lineTo(w, laneH);
    ctx.stroke();

    // Check if envelopes exist
    if (!strobeEnvelopeL && !strobeEnvelopeR) {
      ctx.fillStyle = '#475569';
      ctx.font = '11px monospace';
      ctx.textAlign = 'center';
      const sProg = strobeLoadProgress || (mediaLoadProgress?.type === 'strobe' ? mediaLoadProgress : null);
      const aProg = audioLoadProgress || (mediaLoadProgress?.type === 'audio' ? mediaLoadProgress : null);

      let statusText = 'Menunggu Audio / Strobe Track (.wav)...';
      if (sProg || isStrobeAnalyzing) {
        if (sProg?.stage === 'downloading') {
          statusText = `[2/2] Mengunduh Berkas Strobe (${sProg.pct}% - ${sProg.mbText})...`;
        } else if (sProg?.stage === 'decoding') {
          statusText = `[2/2] Mendekode Audio PCM (${sProg.mbText})...`;
        } else {
          statusText = '[2/2] Mendekode Sinyal Strobe 19.2kHz (500Hz Engine)...';
        }
      } else if (aProg) {
        if (aProg?.stage === 'downloading') {
          statusText = `[1/2] Mengunduh Berkas Audio (${aProg.pct}% - ${aProg.mbText})...`;
        } else if (aProg?.stage === 'decoding') {
          statusText = `[1/2] Mendekode Audio PCM (${aProg.mbText})...`;
        } else {
          statusText = '[1/2] Menghitung Waveform & FFT Audio...';
        }
      }
      ctx.fillText(statusText, w / 2, laneH + 4);

      // Playhead in center
      ctx.strokeStyle = '#facc15';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(w / 2, 0);
      ctx.lineTo(w / 2, h);
      ctx.stroke();
      return;
    }

    const LOGIC_SAMPLE_RATE = 500;
    const startIdx = Math.floor(startTime * LOGIC_SAMPLE_RATE);
    const endIdx = Math.floor(endTime * LOGIC_SAMPLE_RATE);
    const pxPerIdx = w / (endIdx - startIdx);

    // Draw Warm (Left) Logic Output (Top Lane - Amber)
    if (strobeEnvelopeL) {
      ctx.fillStyle = '#fdba74';
      for (let i = startIdx; i < endIdx; i++) {
        if (i >= 0 && i < strobeEnvelopeL.length && strobeEnvelopeL[i] > strobeThreshold) {
          ctx.fillRect((i - startIdx) * pxPerIdx, 2, Math.max(1, pxPerIdx + 1), laneH - 4);
        }
      }
    }

    // Draw Cool (Right) Logic Output (Bottom Lane - Sky)
    if (strobeEnvelopeR) {
      ctx.fillStyle = '#7dd3fc';
      for (let i = startIdx; i < endIdx; i++) {
        if (i >= 0 && i < strobeEnvelopeR.length && strobeEnvelopeR[i] > strobeThreshold) {
          ctx.fillRect((i - startIdx) * pxPerIdx, laneH + 2, Math.max(1, pxPerIdx + 1), laneH - 4);
        }
      }
    }

    // Center Yellow Playhead with Glow
    ctx.strokeStyle = '#facc15';
    ctx.lineWidth = 2;
    ctx.shadowBlur = 8;
    ctx.shadowColor = '#facc15';
    ctx.beginPath();
    ctx.moveTo(w / 2, 0);
    ctx.lineTo(w / 2, h);
    ctx.stroke();
    ctx.shadowBlur = 0;
  }, [currentTime, strobeEnvelopeL, strobeEnvelopeR, strobeThreshold, isStrobeAnalyzing]);

  // Click on logic track to scrub / jump time
  const handleCanvasClick = (e) => {
    if (!onSeek) return;
    const canvas = logicCanvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const ratio = clickX / rect.width;
    // 10s window (-5s to +5s)
    const clickedTime = currentTime - 5 + ratio * 10;
    onSeek(Math.max(0, clickedTime));
  };

  const handleCanvasMouseMove = (e) => {
    const canvas = logicCanvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const clickX = Math.max(0, Math.min(rect.width, e.clientX - rect.left));
    const ratio = clickX / rect.width;
    const hoverTime = currentTime - 5 + ratio * 10;
    setLogicHoverX(clickX);
    setLogicHoverTime(Math.max(0, hoverTime));
  };

  const handleCanvasMouseLeave = () => {
    setLogicHoverX(null);
    setLogicHoverTime(null);
  };

  // Draw mini audio oscilloscope waves
  const drawMiniWave = (canvas, activity, color) => {
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, w, h);

    ctx.strokeStyle = color;
    ctx.lineWidth = 1.5;
    ctx.beginPath();

    const midY = h / 2;
    const amp = Math.min(midY - 2, activity * (midY - 2));

    for (let x = 0; x < w; x += 3) {
      const freq = (x / w) * Math.PI * 4;
      const y = midY + Math.sin(freq + Date.now() * 0.008) * amp;
      if (x === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
  };

  useEffect(() => {
    drawLogicWave();
  }, [drawLogicWave]);

  useEffect(() => {
    drawMiniWave(speakerCanvasRef.current, speakerActivity, '#facc15');
    drawMiniWave(transducerCanvasRef.current, transducerActivity, '#38bdf8');
    drawMiniWave(subwooferCanvasRef.current, subwooferActivity, '#34d399');
  }, [speakerActivity, transducerActivity, subwooferActivity]);

  return (
    <section className="relative flex-1 bg-gradient-to-b from-slate-950 via-[#070d19] to-slate-950 flex flex-col p-3 sm:p-4 overflow-y-auto overflow-x-hidden min-h-0 h-full scrollbar-thin select-none">
      {/* Background Dot Grid */}
      <div
        className="absolute inset-0 opacity-10 pointer-events-none"
        style={{
          backgroundImage: 'radial-gradient(#fb923c 1px, transparent 1px)',
          backgroundSize: '24px 24px'
        }}
      />

      {/* Cockpit Header: Title, Telemetry, Jump Button, System Log Toggle */}
      <div className="relative flex items-center justify-between gap-2 pb-2.5 mb-2.5 border-b border-slate-800/80 shrink-0">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="p-1.5 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/30 shrink-0 shadow-md shadow-amber-500/10">
            <Zap size={15} className={isStrobeWarmOn || isStrobeCoolOn ? 'animate-pulse text-amber-400' : ''} />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-black text-white tracking-wide">REGENESIS STROBE V2.0</span>
              <span className="px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[9.5px] font-mono font-bold">
                19.2kHz (500Hz Engine)
              </span>
            </div>
            <p className="text-[10px] text-slate-400 font-mono truncate">Physical Circular PCB Disc & Telemetry</p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {/* Quick Jump to First Pulse Button */}
          {firstPulseTime !== null && firstPulseTime > 0.5 && onSeek && (
            <button
              type="button"
              onClick={() => onSeek(firstPulseTime)}
              className="px-2.5 py-1 rounded-lg bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-black text-[10px] flex items-center gap-1.5 shadow-md shadow-amber-500/25 transition cursor-pointer active:scale-95 animate-pulse"
              title={`Lompat langsung ke detik ${formatDuration(firstPulseTime)} saat strobe mulai aktif`}
            >
              <Zap size={11} className="fill-slate-950 text-slate-950" />
              <span>Lompat ({formatDuration(firstPulseTime)})</span>
            </button>
          )}

          {/* System Log Button */}
          {setIsLogOpen && (
            <button
              type="button"
              onClick={() => setIsLogOpen(!isLogOpen)}
              className={`text-[10px] font-semibold px-2 py-1 rounded-lg border transition flex items-center gap-1 cursor-pointer ${isLogOpen
                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-400 border-slate-700'
                }`}
            >
              <Terminal size={11} />
              <span>{isLogOpen ? 'CLOSE LOG' : 'LOG'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Cockpit Side-by-Side Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 sm:gap-4 items-stretch flex-1 min-h-0">

        {/* 1. Left Column (5 Cols): Circular Strobe PCB Disc Simulator (Identical to MediaPreviewModal.jsx) */}
        <div className="lg:col-span-5 xl:col-span-5 flex flex-col items-center justify-center p-3 sm:p-4 bg-slate-900/60 rounded-2xl border border-slate-800/80 shadow-inner relative">
          <div className="relative w-44 h-44 sm:w-52 sm:h-52 md:w-56 md:h-56 xl:w-60 xl:h-60 rounded-full p-2 bg-gradient-to-br from-slate-800 via-slate-900 to-black border-4 border-slate-700 shadow-[0_0_45px_rgba(0,0,0,0.95)] flex items-center justify-center overflow-hidden shrink-0">
            <svg viewBox="0 0 260 260" className="w-full h-full drop-shadow-2xl select-none">
              <defs>
                {/* Warm Active Glow Radial Flare */}
                <radialGradient id="warm-glow-flare" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="#ffffff" stopOpacity="1" />
                  <stop offset="30%" stopColor="#fbbf24" stopOpacity="0.95" />
                  <stop offset="65%" stopColor="#f59e0b" stopOpacity="0.5" />
                  <stop offset="100%" stopColor="#d97706" stopOpacity="0" />
                </radialGradient>

                {/* Cool Active Glow Radial Flare */}
                <radialGradient id="cool-glow-flare" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="#ffffff" stopOpacity="1" />
                  <stop offset="30%" stopColor="#7dd3fc" stopOpacity="0.95" />
                  <stop offset="65%" stopColor="#0284c7" stopOpacity="0.5" />
                  <stop offset="100%" stopColor="#0369a1" stopOpacity="0" />
                </radialGradient>

                {/* Warm Active Bulb Grad */}
                <radialGradient id="warm-active-bulb" cx="35%" cy="35%" r="65%">
                  <stop offset="0%" stopColor="#ffffff" />
                  <stop offset="40%" stopColor="#fef08a" />
                  <stop offset="75%" stopColor="#f59e0b" />
                  <stop offset="100%" stopColor="#b45309" />
                </radialGradient>
                {/* Warm Idle Bulb Grad */}
                <radialGradient id="warm-idle-bulb" cx="35%" cy="35%" r="65%">
                  <stop offset="0%" stopColor="#fde68a" />
                  <stop offset="60%" stopColor="#d97706" />
                  <stop offset="100%" stopColor="#451a03" />
                </radialGradient>

                {/* Cool Active Bulb Grad */}
                <radialGradient id="cool-active-bulb" cx="35%" cy="35%" r="65%">
                  <stop offset="0%" stopColor="#ffffff" />
                  <stop offset="40%" stopColor="#e0f2fe" />
                  <stop offset="75%" stopColor="#38bdf8" />
                  <stop offset="100%" stopColor="#0369a1" />
                </radialGradient>
                {/* Cool Idle Bulb Grad */}
                <radialGradient id="cool-idle-bulb" cx="35%" cy="35%" r="65%">
                  <stop offset="0%" stopColor="#f1f5f9" />
                  <stop offset="60%" stopColor="#64748b" />
                  <stop offset="100%" stopColor="#1e293b" />
                </radialGradient>
              </defs>

              {/* Dark Charcoal PCB Circular Base Plate */}
              <circle cx="130" cy="130" r="127" fill="#090d16" stroke="#334155" strokeWidth="2.5" />
              <circle cx="130" cy="130" r="122" fill="#0f172a" stroke="#1e293b" strokeWidth="1.5" strokeDasharray="4 2" />

              {/* Silkscreen Sunburst Ray Lines */}
              <g stroke="#334155" strokeWidth="1.8" strokeLinecap="round">
                <path d="M 120 70 L 130 55 L 140 70 Z" fill="none" strokeWidth="1.5" />
                <path d="M 112 72 L 130 55 L 148 72" fill="none" strokeWidth="1.5" />
                <path d="M 104 74 L 130 55 L 156 74" fill="none" strokeWidth="1.5" />
                <line x1="130" y1="6" x2="130" y2="20" />
                <line x1="100" y1="12" x2="108" y2="28" />
                <line x1="160" y1="12" x2="152" y2="28" />
                <line x1="72" y1="26" x2="84" y2="40" />
                <line x1="188" y1="26" x2="176" y2="40" />
                <line x1="46" y1="50" x2="62" y2="62" />
                <line x1="214" y1="50" x2="198" y2="62" />
                <line x1="24" y1="84" x2="42" y2="92" />
                <line x1="236" y1="84" x2="218" y2="92" />
                <line x1="20" y1="130" x2="36" y2="130" />
                <line x1="240" y1="130" x2="224" y2="130" />
                <line x1="24" y1="176" x2="42" y2="168" />
                <line x1="236" y1="176" x2="218" y2="168" />
                <line x1="46" y1="210" x2="62" y2="198" />
                <line x1="214" y1="210" x2="198" y2="198" />
                <line x1="72" y1="234" x2="84" y2="220" />
                <line x1="188" y1="234" x2="176" y2="220" />
                <line x1="100" y1="248" x2="108" y2="232" />
                <line x1="160" y1="248" x2="152" y2="232" />
              </g>

              {/* Black Wire Cathode Traces (Left) */}
              <g stroke="#020617" strokeWidth="3" fill="none" strokeLinecap="round">
                <path d="M 80 120 Q 105 125 124 128" />
                <path d="M 80 128 Q 105 130 124 130" />
                <path d="M 80 136 Q 105 133 124 132" />
                <path d="M 80 144 Q 105 136 124 134" />
              </g>

              {/* White Wire Anode Traces (Right) */}
              <g stroke="#cbd5e1" strokeWidth="2.5" fill="none" strokeLinecap="round">
                <path d="M 180 120 Q 155 125 136 128" />
                <path d="M 180 128 Q 155 130 136 130" />
                <path d="M 180 136 Q 155 133 136 132" />
                <path d="M 180 144 Q 155 136 136 134" />
              </g>

              {/* Center Wire Hub Hole */}
              <circle cx="130" cy="130" r="11" fill="#020617" stroke="#334155" strokeWidth="2" />
              <circle cx="130" cy="130" r="6" fill="#000000" />

              {/* 4 PCB Mounting Screws */}
              <circle cx="130" cy="10" r="3.5" fill="#475569" stroke="#1e293b" strokeWidth="1" />
              <circle cx="250" cy="130" r="3.5" fill="#475569" stroke="#1e293b" strokeWidth="1" />
              <circle cx="130" cy="250" r="3.5" fill="#475569" stroke="#1e293b" strokeWidth="1" />
              <circle cx="10" cy="130" r="3.5" fill="#475569" stroke="#1e293b" strokeWidth="1" />

              {/* 12 HIGH POWER LED BULBS */}
              {STROBE_BOARD_LEDS.map(led => {
                const isActive = (led.type === 'warm' && isStrobeWarmOn) || (led.type === 'cool' && isStrobeCoolOn);
                return (
                  <g key={led.id} className="transition-all duration-75">
                    {isActive && (
                      <circle
                        cx={led.cx}
                        cy={led.cy}
                        r="32"
                        fill={led.type === 'warm' ? 'url(#warm-glow-flare)' : 'url(#cool-glow-flare)'}
                        className="animate-pulse"
                      />
                    )}
                    <rect
                      x={led.cx - 16}
                      y={led.cy - 4}
                      width="32"
                      height="8"
                      rx="2"
                      fill="#475569"
                      stroke="#1e293b"
                      strokeWidth="1"
                    />
                    <circle
                      cx={led.cx}
                      cy={led.cy}
                      r="13"
                      fill="#1e293b"
                      stroke="#475569"
                      strokeWidth="1.5"
                    />
                    <circle
                      cx={led.cx}
                      cy={led.cy}
                      r="11"
                      fill={
                        led.type === 'warm'
                          ? isActive ? 'url(#warm-active-bulb)' : 'url(#warm-idle-bulb)'
                          : isActive ? 'url(#cool-active-bulb)' : 'url(#cool-idle-bulb)'
                      }
                      stroke={isActive ? '#ffffff' : 'rgba(255,255,255,0.4)'}
                      strokeWidth={isActive ? '2.5' : '1'}
                      filter={isActive ? (led.type === 'warm' ? 'drop-shadow(0 0 16px #f59e0b)' : 'drop-shadow(0 0 16px #38bdf8)') : 'none'}
                    />
                    <ellipse
                      cx={led.cx - 3.5}
                      cy={led.cy - 3.5}
                      rx="3.5"
                      ry="2"
                      fill="#ffffff"
                      opacity={isActive ? 0.95 : 0.65}
                    />
                    <text
                      x={led.cx}
                      y={led.cy + (led.cy > 130 ? 18 : -14)}
                      textAnchor="middle"
                      fontSize="5.5"
                      fontFamily="monospace"
                      fontWeight="bold"
                      fill="#64748b"
                    >
                      {led.label}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>

          {/* Dual Channel Status Badges */}
          <div className="flex items-center justify-center gap-4 mt-2.5 font-mono text-[10px]">
            <span className={`flex items-center gap-1.5 font-bold transition-colors ${isStrobeWarmOn ? 'text-amber-400' : 'text-slate-500'}`}>
              <span className={`w-2 h-2 rounded-full transition-all ${isStrobeWarmOn ? 'bg-amber-400 shadow-[0_0_10px_#f59e0b] scale-125' : 'bg-slate-700'}`} />
              <span>CH-L WARM (6x)</span>
            </span>
            <span className={`flex items-center gap-1.5 font-bold transition-colors ${isStrobeCoolOn ? 'text-sky-400' : 'text-slate-500'}`}>
              <span className={`w-2 h-2 rounded-full transition-all ${isStrobeCoolOn ? 'bg-sky-400 shadow-[0_0_10px_#38bdf8] scale-125' : 'bg-slate-700'}`} />
              <span>CH-R COOL (6x)</span>
            </span>
          </div>

          {/* Threshold Sensitivity Setting */}
          {setStrobeThreshold && (
            <div className="flex items-center gap-2 mt-2 w-full max-w-[220px] px-1 bg-slate-950/50 py-1 rounded-lg border border-slate-800/80">
              <span className="text-[9px] font-mono text-slate-400 shrink-0">Threshold:</span>
              <input
                type="range"
                min="10"
                max="100"
                value={strobeThreshold}
                onChange={(e) => setStrobeThreshold(Number(e.target.value))}
                className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-400"
              />
              <span className="text-[9.5px] font-mono text-amber-300 font-bold w-6 text-right">{strobeThreshold}</span>
            </div>
          )}
        </div>

        {/* 2. Right Column (7 Cols): Dual-Lane Logic Track Canvas + Modalities & Audio Oscilloscopes */}
        <div className="lg:col-span-7 xl:col-span-7 flex flex-col justify-between gap-2.5 h-full min-h-0">

          {/* Logic Output Track Hero Canvas */}
          <div className="flex flex-col gap-1 bg-slate-900/50 p-2.5 rounded-2xl border border-slate-800 shadow-inner">
            <div className="flex items-center justify-between text-[10.5px] text-slate-400 font-mono px-1">
              <span className="text-cyan-300 font-bold flex items-center gap-1.5">
                <Zap size={11} className="text-amber-400" />
                <span>Logic Output Track (Top: L/Warm, Bottom: R/Cool)</span>
              </span>
              <span className="text-amber-400 text-[9.5px] font-bold">500Hz Realtime Envelope (&plusmn;5s)</span>
            </div>

            <div
              className="w-full h-24 sm:h-28 bg-black rounded-xl border border-slate-800 p-1 relative shadow-inner overflow-hidden flex items-center justify-center cursor-crosshair group"
              onClick={handleCanvasClick}
              onMouseMove={handleCanvasMouseMove}
              onMouseLeave={handleCanvasMouseLeave}
              title="Klik di mana saja pada track sinyal untuk scrub / lompat waktu"
            >
              <canvas
                ref={logicCanvasRef}
                width={560}
                height={110}
                className="w-full h-full object-contain"
              />

              {/* Interactive Hover Guideline */}
              {logicHoverX !== null && (
                <div
                  className="absolute top-0 bottom-0 w-px bg-cyan-400/80 border-r border-dashed border-cyan-300 pointer-events-none shadow-[0_0_8px_rgba(34,211,238,0.8)] z-20"
                  style={{ left: `${logicHoverX}px` }}
                >
                  <div className="w-2.5 h-2.5 bg-cyan-400 rotate-45 -translate-x-[4.5px] -translate-y-1 shadow-[0_0_6px_rgba(34,211,238,0.9)]" />
                  <div
                    className="absolute top-1 px-1.5 py-0.5 rounded-md bg-slate-950/95 border border-cyan-400 text-cyan-300 font-mono text-[8.5px] font-extrabold shadow-lg whitespace-nowrap flex items-center gap-1 backdrop-blur-sm"
                    style={{
                      left: logicHoverX > 400 ? 'auto' : '6px',
                      right: logicHoverX > 400 ? '6px' : 'auto'
                    }}
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping shrink-0" />
                    <span>{formatDuration(logicHoverTime)}</span>
                    <span className="text-[7.5px] font-sans font-semibold text-slate-400 border-l border-slate-700 pl-1">
                      Klik untuk pindah
                    </span>
                  </div>
                </div>
              )}

              {/* Scrub Tooltip Overlay */}
              <div className="absolute bottom-1 right-2 opacity-0 group-hover:opacity-90 transition text-[9px] font-mono text-slate-300 bg-slate-900/90 px-2 py-0.5 rounded border border-slate-700 pointer-events-none shadow-md">
                Klik track untuk scrub playhead
              </div>
            </div>
          </div>

          {/* Lower Grid: Acoustic Oscilloscopes & Modalities */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 flex-1 min-h-0">

            {/* Left Sub-card: 3-Band Audio Acoustic Oscilloscopes */}
            <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-2.5 shadow-sm space-y-1.5 flex flex-col justify-between">
              <div className="flex items-center justify-between px-0.5">
                <span className="text-[10px] font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1">
                  <Volume2 size={12} className="text-amber-400" />
                  <span>Acoustics</span>
                </span>
                <span className="text-[8.5px] font-mono text-slate-500">Live 3-Band</span>
              </div>

              {/* Speaker */}
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold text-slate-300 w-16 shrink-0 truncate">Speaker</span>
                <div className="h-4 flex-1 bg-slate-950 rounded overflow-hidden border border-slate-800">
                  <canvas ref={speakerCanvasRef} width={180} height={16} className="w-full h-full block" />
                </div>
              </div>

              {/* Transducer */}
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold text-slate-300 w-16 shrink-0 truncate">Transducer</span>
                <div className="h-4 flex-1 bg-slate-950 rounded overflow-hidden border border-slate-800">
                  <canvas ref={transducerCanvasRef} width={180} height={16} className="w-full h-full block" />
                </div>
              </div>

              {/* Subwoofer */}
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold text-slate-300 w-16 shrink-0 truncate">Subwoofer</span>
                <div className="h-4 flex-1 bg-slate-950 rounded overflow-hidden border border-slate-800">
                  <canvas ref={subwooferCanvasRef} width={180} height={16} className="w-full h-full block" />
                </div>
              </div>
            </div>

            {/* Right Sub-card: Modalities Hardware Badges (Aroma, PEMF, NIR) */}
            <div className="grid grid-cols-1 gap-1.5 flex-1">
              {/* Aroma (OLF) */}
              <div
                className={`flex items-center justify-between rounded-xl px-2.5 py-1.5 border transition-all ${olfActive
                  ? 'bg-purple-600/30 border-purple-400 text-white shadow-[0_0_12px_rgba(168,85,247,0.5)]'
                  : 'bg-slate-900/60 border-slate-800/80 text-slate-500'
                  }`}
              >
                <div className="flex items-center gap-1.5 min-w-0">
                  <Wind size={12} className={olfActive ? 'text-purple-300 shrink-0' : 'text-slate-500 shrink-0'} />
                  <span className="font-bold uppercase tracking-wider text-[9px] truncate">Aroma (OLF)</span>
                </div>
                <span className="text-[9.5px] font-mono truncate text-slate-300 font-semibold max-w-[120px] ml-1">
                  {olfLabel}
                </span>
              </div>

              {/* PEMF */}
              <div
                className={`flex items-center justify-between rounded-xl px-2.5 py-1.5 border transition-all ${pemfActive
                  ? 'bg-sky-600/30 border-sky-400 text-white shadow-[0_0_12px_rgba(56,189,248,0.5)]'
                  : 'bg-slate-900/60 border-slate-800/80 text-slate-500'
                  }`}
              >
                <div className="flex items-center gap-1.5 min-w-0">
                  <Zap size={12} className={pemfActive ? 'text-sky-300 shrink-0' : 'text-slate-500 shrink-0'} />
                  <span className="font-bold uppercase tracking-wider text-[9px] truncate">PEMF</span>
                </div>
                <span className="text-[9.5px] font-mono truncate text-slate-300 font-semibold max-w-[120px] ml-1">
                  {pemfLabel}
                </span>
              </div>

              {/* NIR */}
              <div
                className={`flex items-center justify-between rounded-xl px-2.5 py-1.5 border transition-all ${nirActive
                  ? 'bg-rose-600/30 border-rose-400 text-white shadow-[0_0_12px_rgba(244,63,94,0.5)]'
                  : 'bg-slate-900/60 border-slate-800/80 text-slate-500'
                  }`}
              >
                <div className="flex items-center gap-1.5 min-w-0">
                  <Sun size={12} className={nirActive ? 'text-rose-300 shrink-0' : 'text-slate-500 shrink-0'} />
                  <span className="font-bold uppercase tracking-wider text-[9px] truncate">NIR Light</span>
                </div>
                <span className="text-[9.5px] font-mono truncate text-slate-300 font-semibold max-w-[120px] ml-1">
                  {nirLabel}
                </span>
              </div>
            </div>

          </div>

        </div>

      </div>

      {/* System Log Overlay Drawer */}
      {isLogOpen && (
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-11/12 max-w-xl bg-slate-950/95 border border-slate-800 rounded-xl p-3 shadow-2xl z-40 backdrop-blur-md">
          <div className="flex items-center justify-between border-b border-slate-800 pb-1.5 mb-1.5">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-400">
              <Terminal size={13} className="text-emerald-400" />
              <span>SIMULATOR EVENT LOG</span>
            </div>
            <span className="text-[10px] font-mono text-slate-500">Live Telemetry</span>
          </div>
          <div className="max-h-28 overflow-y-auto space-y-1 font-mono text-[10px] text-emerald-400 scrollbar-thin">
            {systemLogs.length === 0 ? (
              <span className="text-slate-600">No events logged yet.</span>
            ) : (
              systemLogs.map((log, idx) => (
                <div key={idx} className="leading-tight">
                  <span className="text-slate-500">[{log.time}]</span> {log.message}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </section>
  );
}
