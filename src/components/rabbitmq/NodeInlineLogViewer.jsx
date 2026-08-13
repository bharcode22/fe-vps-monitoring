import React, { useState, useEffect, useRef } from 'react';
import { Terminal, Play, Square, ChevronDown, ChevronUp } from 'lucide-react';
import io from 'socket.io-client';
import { SOCKET_URL } from '../../config';

export default function NodeInlineLogViewer({ type = 'docker', serverId, targetName, title, onToggleOpen }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [logs, setLogs] = useState([]);
  const socketRef = useRef(null);
  const terminalRef = useRef(null);

  // Auto scroll to bottom
  useEffect(() => {
    if (isOpen && terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [logs, isOpen]);

  // Clean socket disconnect on unmount
  useEffect(() => {
    return () => {
      stopStream();
    };
  }, []);

  const startStream = () => {
    if (!serverId || !targetName) return;
    stopStream();

    const token = localStorage.getItem('vps_monitoring_token') || localStorage.getItem('token') || '';
    const socket = io(SOCKET_URL);
    socketRef.current = socket;

    const startEvent = type === 'docker' ? 'docker:start-stream' : 'pm2:start-stream';
    const dataEvent = type === 'docker' ? 'docker:stream-data' : 'pm2:stream-data';
    const errorEvent = type === 'docker' ? 'docker:stream-error' : 'pm2:stream-error';
    const payload = type === 'docker'
      ? { serverId, containerName: targetName, token }
      : { serverId, appName: targetName, token };

    socket.on('connect', () => {
      setIsStreaming(true);
      setLogs((prev) => [...prev, `=== Memulai streaming log [${targetName}]... ===\n`]);
      socket.emit(startEvent, payload);
    });

    socket.on(dataEvent, (data) => {
      if (data && data.chunk) {
        setLogs((prev) => [...prev.slice(-200), data.chunk]);
      }
    });

    socket.on(errorEvent, (err) => {
      setLogs((prev) => [...prev, `\n❌ ERROR: ${err.error || 'Terputus dari stream'}\n`]);
      setIsStreaming(false);
    });

    socket.on('disconnect', () => {
      setIsStreaming(false);
    });
  };

  const stopStream = () => {
    if (socketRef.current) {
      const stopEvent = type === 'docker' ? 'docker:stop-stream' : 'pm2:stop-stream';
      socketRef.current.emit(stopEvent);
      socketRef.current.disconnect();
      socketRef.current = null;
    }
    setIsStreaming(false);
  };

  const toggleOpen = () => {
    const nextState = !isOpen;
    setIsOpen(nextState);
    if (onToggleOpen) onToggleOpen(nextState);
    if (nextState && !isStreaming) {
      startStream();
    }
  };

  return (
    <div
      className="nodrag nopan bg-slate-955/90 border border-slate-800/90 rounded-xl overflow-hidden mt-3"
      onMouseDown={(e) => e.stopPropagation()}
    >
      {/* Header bar */}
      <div className="px-3 py-2 bg-slate-900/80 border-b border-slate-800/80 flex items-center justify-between">
        <div
          onClick={toggleOpen}
          className="flex items-center gap-2 cursor-pointer hover:text-white transition-colors"
        >
          <Terminal size={12} className={type === 'docker' ? 'text-cyan-400' : 'text-amber-400'} />
          <span className="text-[10px] font-bold text-slate-300 uppercase tracking-wider">
            {title || `Live Log ${targetName}`}
          </span>
          {isStreaming && (
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {isOpen && (
            <>
              {isStreaming ? (
                <button
                  onClick={stopStream}
                  className="text-red-400 hover:text-red-300 text-[9px] font-bold uppercase flex items-center gap-1 cursor-pointer"
                  title="Stop Log Stream"
                >
                  <Square size={9} fill="currentColor" /> Stop
                </button>
              ) : (
                <button
                  onClick={startStream}
                  className="text-emerald-400 hover:text-emerald-300 text-[9px] font-bold uppercase flex items-center gap-1 cursor-pointer"
                  title="Start Log Stream"
                >
                  <Play size={9} fill="currentColor" /> Start
                </button>
              )}
              <button
                onClick={() => setLogs([])}
                className="text-slate-500 hover:text-slate-300 text-[9px] font-bold uppercase cursor-pointer"
              >
                Clear
              </button>
            </>
          )}

          <button
            onClick={toggleOpen}
            className="text-slate-500 hover:text-slate-300 cursor-pointer p-0.5"
          >
            {isOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
        </div>
      </div>

      {/* Terminal log body */}
      {isOpen && (
        <div
          ref={terminalRef}
          onWheel={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
          className="nowheel nopan nodrag bg-black/95 p-3 h-72 overflow-y-auto font-mono text-[11.5px] leading-relaxed text-slate-200 select-text whitespace-pre-wrap break-all custom-scrollbar border-t border-slate-900"
        >
          {logs.length === 0 ? (
            <div className="text-slate-600 text-center py-12 italic text-xs">
              Mengisi buffer log...
            </div>
          ) : (
            logs.join('')
          )}
        </div>
      )}
    </div>
  );
}
