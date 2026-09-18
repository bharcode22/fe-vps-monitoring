import React from 'react';
import { VideoOff, Layers, Sparkles } from 'lucide-react';

export default function EnclosureVideoMonitor({
  videoRef,
  videoSrc,
  videoFit = 'width',
  onVideoLoadedMetadata,
  isScreenOverlayOpen = false,
  setIsScreenOverlayOpen
}) {
  return (
    <aside className="w-44 sm:w-48 md:w-52 lg:w-56 h-full bg-slate-950 border-r border-slate-800 flex flex-col shrink-0 relative overflow-hidden select-none z-10 shadow-2xl">
      {/* Enclosure Top Header */}
      <div className="h-8 px-2.5 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="w-2 h-2 rounded-full bg-purple-500 animate-pulse shrink-0" />
          <span className="font-bold text-[11px] text-white tracking-wide truncate">
            ENCLOSURE SCREEN
          </span>
        </div>

        {setIsScreenOverlayOpen && (
          <button
            type="button"
            onClick={() => setIsScreenOverlayOpen(!isScreenOverlayOpen)}
            className={`p-1 rounded-md text-[10px] transition border flex items-center gap-1 ${isScreenOverlayOpen
              ? 'bg-purple-600/30 text-purple-200 border-purple-500/50'
              : 'text-slate-400 hover:text-white border-slate-800 hover:bg-slate-800'
              }`}
            title="Toggle Sensor Cut-out Overlay"
          >
            <Layers size={11} />
            <span className="text-[8.5px] hidden sm:inline">Sensor</span>
          </button>
        )}
      </div>

      {/* Main Screen Container - Full Height down to bottom */}
      <div className="flex-1 flex items-center justify-center p-1.5 sm:p-2 overflow-hidden bg-black relative">
        {/* Background Dot Grid */}
        <div
          className="absolute inset-0 opacity-15 pointer-events-none"
          style={{
            backgroundImage: 'radial-gradient(#a855f7 1px, transparent 1px)',
            backgroundSize: '20px 20px'
          }}
        />

        {/* Physical Pod Bezel Frame */}
        <div
          className="relative rounded-2xl border-2 sm:border-[3px] border-slate-800 bg-black shadow-[0_0_25px_rgba(0,0,0,0.9)] overflow-hidden flex items-center justify-center self-center transition-all"
          style={{
            aspectRatio: '995 / 3840',
            maxHeight: '100%',
            height: '100%',
            width: 'auto'
          }}
        >
          {videoSrc ? (
            <video
              ref={videoRef}
              src={videoSrc}
              playsInline
              muted
              preload="auto"
              onLoadedMetadata={(e) => {
                if (onVideoLoadedMetadata && e.target?.duration) {
                  onVideoLoadedMetadata(e.target.duration);
                }
                try {
                  if (e.target) e.target.currentTime = 0.001;
                } catch (err) { }
              }}
              className={`transition-opacity duration-300 ${videoFit === 'cover'
                ? 'w-full h-full object-cover'
                : videoFit === 'height'
                  ? 'h-full w-auto max-w-none'
                  : videoFit === 'contain'
                    ? 'w-full h-full object-contain'
                    : 'w-full h-auto max-h-none'
                }`}
            />
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-700 pointer-events-none p-3 text-center">
              <VideoOff size={32} className="mb-2 opacity-50 text-slate-500" />
              <span className="text-[9.5px] font-mono uppercase tracking-wider text-slate-400 font-bold">
                NO VIDEO SIGNAL
              </span>
              <span className="text-[8.5px] text-slate-600 mt-1">
                Portret 995 × 3840
              </span>
              <span className="text-[8px] text-purple-400/80 mt-2 bg-purple-950/40 px-2 py-0.5 rounded border border-purple-800/40">
                Pilih MP4 di Tab Media
              </span>
            </div>
          )}

          {/* Sensor Zone Overlay (Simulating virtual physical sensor cut-outs) */}
          {isScreenOverlayOpen && (
            <div
              className="absolute inset-x-0 border-y-2 border-purple-400/70 bg-purple-500/15 pointer-events-none backdrop-blur-[1px] flex items-center justify-center"
              style={{ top: '22%', height: '8%' }}
            >
              <div className="text-[8px] font-mono text-purple-200 tracking-wider font-bold uppercase bg-black/60 px-2 py-0.5 rounded border border-purple-500/40">
                Sensor Zone
              </div>
            </div>
          )}

          {/* Glare Reflection overlay for realistic glass look */}
          <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/[0.02] to-white/[0.05] pointer-events-none" />
        </div>
      </div>

      {/* Enclosure Bottom Status Pill */}
      <div className="h-6 px-2.5 bg-slate-900/90 border-t border-slate-800 flex items-center justify-between text-[8.5px] font-mono text-slate-400 shrink-0">
        <span className="flex items-center gap-1">
          <Sparkles size={9} className="text-purple-400" />
          <span>PORTRAIT 1:3.86</span>
        </span>
        <span className={videoSrc ? 'text-emerald-400 font-bold' : 'text-slate-500'}>
          {videoSrc ? 'SYNCED' : 'STANDBY'}
        </span>
      </div>
    </aside>
  );
}
