import React, { useState, useEffect, useRef } from 'react';
import {
  Terminal as TerminalIcon,
  Plus,
  X,
  Maximize2,
  Minimize2,
  RefreshCw,
  Trash2,
  ShieldCheck,
  Check,
  Copy,
  Sliders,
  Server
} from 'lucide-react';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import '@xterm/xterm/css/xterm.css';
import { io } from 'socket.io-client';
import { SOCKET_URL } from '../../config';

/**
 * Single SSH Terminal Session Instance
 * Keeps its own xterm.js instance and Socket.IO connection alive even when backgrounded.
 */
function SshTerminalInstance({
  session,
  server,
  isActive,
  onStatusChange,
  sessionRef
}) {
  const terminalContainerRef = useRef(null);
  const termRef = useRef(null);
  const fitAddonRef = useRef(null);
  const socketRef = useRef(null);
  const [status, setStatus] = useState('connecting'); // 'connecting' | 'connected' | 'disconnected' | 'error'
  const [errorMessage, setErrorMessage] = useState('');

  // Expose controls to parent tab
  useEffect(() => {
    if (sessionRef) {
      sessionRef.current = {
        reconnect: () => handleReconnect(),
        clear: () => handleClear(),
        copy: () => handleCopy(),
        status
      };
    }
  }, [sessionRef, status]);

  const handleReconnect = () => {
    if (!socketRef.current || !termRef.current || !fitAddonRef.current) return;
    setStatus('connecting');
    onStatusChange?.('connecting');
    setErrorMessage('');
    termRef.current.reset();
    termRef.current.write('\x1b[36m[Mengkoneksikan ulang ke ' + (server.username || 'root') + '@' + server.host + '...]\x1b[0m\r\n');

    const token = localStorage.getItem('vps_monitoring_token') || '';
    const dims = fitAddonRef.current.proposeDimensions() || { cols: 80, rows: 24 };

    socketRef.current.emit('terminal:init', {
      serverId: server.id,
      cols: dims.cols || 80,
      rows: dims.rows || 24,
      token
    });
  };

  const handleClear = () => {
    if (termRef.current) {
      termRef.current.clear();
      if (socketRef.current && socketRef.current.connected) {
        socketRef.current.emit('terminal:input', { data: '\x0c' });
      }
    }
  };

  const handleCopy = () => {
    if (termRef.current && termRef.current.hasSelection()) {
      const selected = termRef.current.getSelection();
      navigator.clipboard.writeText(selected);
      return true;
    }
    return false;
  };

  // Initialize terminal and socket
  useEffect(() => {
    if (!server?.id) return;
    let isSubscribed = true;
    setStatus('connecting');
    onStatusChange?.('connecting');

    const timer = setTimeout(() => {
      if (!terminalContainerRef.current || !isSubscribed) return;

      const term = new Terminal({
        cursorBlink: true,
        cursorStyle: 'block',
        fontFamily: 'Menlo, Monaco, Consolas, "Fira Code", monospace',
        fontSize: 13,
        letterSpacing: 0,
        lineHeight: 1.25,
        theme: {
          background: '#090d16',
          foreground: '#e2e8f0',
          cursor: '#22d3ee',
          cursorAccent: '#090d16',
          selectionBackground: 'rgba(34, 211, 238, 0.3)',
          black: '#1e293b',
          red: '#f87171',
          green: '#4ade80',
          yellow: '#facc15',
          blue: '#38bdf8',
          magenta: '#c084fc',
          cyan: '#22d3ee',
          white: '#f8fafc',
          brightBlack: '#475569',
          brightRed: '#ef4444',
          brightGreen: '#22c55e',
          brightYellow: '#eab308',
          brightBlue: '#0ea5e9',
          brightMagenta: '#a855f7',
          brightCyan: '#06b6d4',
          brightWhite: '#ffffff'
        }
      });

      const fitAddon = new FitAddon();
      term.loadAddon(fitAddon);
      term.open(terminalContainerRef.current);
      fitAddon.fit();

      termRef.current = term;
      fitAddonRef.current = fitAddon;

      term.write(`\x1b[36m[Memulai sesi terminal: ${session.title}]\x1b[0m\r\n`);
      term.write(`\x1b[36m[Menghubungkan ke SSH ${server.username || 'root'}@${server.host}:${server.port || 22}...]\x1b[0m\r\n`);

      const socket = io(SOCKET_URL, {
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionDelay: 2000
      });
      socketRef.current = socket;

      socket.on('connect', () => {
        if (!isSubscribed) return;
        const token = localStorage.getItem('vps_monitoring_token') || '';
        const dims = fitAddon.proposeDimensions() || { cols: 80, rows: 24 };

        socket.emit('terminal:init', {
          serverId: server.id,
          cols: dims.cols || 80,
          rows: dims.rows || 24,
          token
        });
      });

      socket.on('terminal:ready', () => {
        if (!isSubscribed) return;
        setStatus('connected');
        onStatusChange?.('connected');
        term.focus();
        const dims = fitAddon.proposeDimensions();
        if (dims && dims.cols && dims.rows) {
          socket.emit('terminal:resize', { cols: dims.cols, rows: dims.rows });
        }
      });

      socket.on('terminal:data', (data) => {
        if (!isSubscribed) return;
        term.write(data);
      });

      socket.on('terminal:error', (err) => {
        if (!isSubscribed) return;
        setStatus('error');
        onStatusChange?.('error');
        setErrorMessage(err?.error || 'Koneksi SSH gagal.');
        term.write(`\r\n\x1b[31;1m[ERROR] ${err?.error || 'Koneksi SSH gagal'}\x1b[0m\r\n`);
      });

      socket.on('terminal:closed', () => {
        if (!isSubscribed) return;
        setStatus('disconnected');
        onStatusChange?.('disconnected');
        term.write('\r\n\x1b[33m[Sesi SSH telah terputus / ditutup]\x1b[0m\r\n');
      });

      term.onData((data) => {
        if (socket.connected) {
          socket.emit('terminal:input', { data });
        }
      });

      // Resize observer
      const resizeObserver = new ResizeObserver(() => {
        if (fitAddonRef.current && termRef.current) {
          try {
            fitAddonRef.current.fit();
            const dims = fitAddonRef.current.proposeDimensions();
            if (dims && socketRef.current && socketRef.current.connected) {
              socketRef.current.emit('terminal:resize', { cols: dims.cols, rows: dims.rows });
            }
          } catch (_) { }
        }
      });

      if (terminalContainerRef.current) {
        resizeObserver.observe(terminalContainerRef.current);
      }

      terminalContainerRef.current._cleanupObserver = () => resizeObserver.disconnect();
    }, 40);

    return () => {
      isSubscribed = false;
      clearTimeout(timer);

      if (terminalContainerRef.current && terminalContainerRef.current._cleanupObserver) {
        terminalContainerRef.current._cleanupObserver();
      }

      if (socketRef.current) {
        socketRef.current.emit('terminal:close');
        socketRef.current.disconnect();
        socketRef.current = null;
      }

      if (termRef.current) {
        termRef.current.dispose();
        termRef.current = null;
      }
    };
  }, [server?.id]);

  // Fit & focus when becoming active
  useEffect(() => {
    if (isActive && fitAddonRef.current && termRef.current) {
      setTimeout(() => {
        try {
          fitAddonRef.current.fit();
          termRef.current.focus();
        } catch (_) { }
      }, 50);
    }
  }, [isActive]);

  return (
    <div className={`w-full h-full flex flex-col ${isActive ? 'flex' : 'hidden'}`}>
      {/* Error banner if connection fails */}
      {errorMessage && status === 'error' && (
        <div className="bg-red-500/15 border-b border-red-500/30 text-red-300 px-4 py-2 text-xs flex items-center justify-between">
          <span>{errorMessage}</span>
          <button onClick={handleReconnect} className="underline hover:text-white font-bold ml-2 cursor-pointer">
            Coba Lagi
          </button>
        </div>
      )}

      {/* Terminal Viewport */}
      <div className="flex-1 bg-[#090d16] p-3 overflow-hidden relative min-h-[350px]">
        <div ref={terminalContainerRef} className="w-full h-full" style={{ minHeight: '350px' }} />
      </div>
    </div>
  );
}

/**
 * Main SSH Terminal Tab in ServerDetailModal
 * Supports multiple concurrent terminal sessions (tabs) to the same server.
 */
export default function SshTerminalTab({ server }) {
  const [sessions, setSessions] = useState([
    { id: 'term-1', title: 'Terminal 1', createdAt: Date.now() }
  ]);
  const [activeSessionId, setActiveSessionId] = useState('term-1');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [statuses, setStatuses] = useState({ 'term-1': 'connecting' });

  const activeControlRef = useRef(null);

  // Add new terminal session tab
  const handleAddTerminal = () => {
    if (sessions.length >= 8) {
      alert('Batas maksimal 8 sesi terminal SSH telah tercapai.');
      return;
    }
    const newIndex = sessions.length + 1;
    const newId = `term-${Date.now()}`;
    const newSession = {
      id: newId,
      title: `Terminal ${newIndex}`,
      createdAt: Date.now()
    };
    setSessions((prev) => [...prev, newSession]);
    setActiveSessionId(newId);
  };

  // Close terminal session tab
  const handleCloseTerminal = (e, sessionIdToClose) => {
    e.stopPropagation();
    if (sessions.length <= 1) {
      // Reconnect/reset if only 1 terminal
      activeControlRef.current?.reconnect?.();
      return;
    }

    const updated = sessions.filter((s) => s.id !== sessionIdToClose);
    setSessions(updated);

    if (activeSessionId === sessionIdToClose) {
      setActiveSessionId(updated[updated.length - 1].id);
    }
  };

  // Copy selection from active terminal
  const handleCopy = () => {
    const success = activeControlRef.current?.copy?.();
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // Clear active terminal
  const handleClear = () => {
    activeControlRef.current?.clear?.();
  };

  // Reconnect active terminal
  const handleReconnect = () => {
    activeControlRef.current?.reconnect?.();
  };

  const activeStatus = statuses[activeSessionId] || 'connecting';
  const isConnected = activeStatus === 'connected';
  const isConnecting = activeStatus === 'connecting';

  return (
    <div
      className={`transition-all duration-200 ${isFullscreen
          ? 'fixed inset-0 z-[1050] bg-slate-950 p-4 flex flex-col'
          : 'flex flex-col bg-slate-950 border border-slate-800/80 rounded-2xl overflow-hidden shadow-2xl h-[580px] min-h-[500px]'
        }`}
    >
      {/* Top Header & Session Tabs */}
      <div className="bg-slate-900/90 border-b border-slate-800 px-3 py-2 flex items-center justify-between gap-3 flex-wrap">
        {/* Terminal Sessions Bar */}
        <div className="flex items-center gap-1.5 flex-wrap overflow-x-auto">
          {sessions.map((session) => {
            const isActive = session.id === activeSessionId;
            const termStatus = statuses[session.id] || 'connecting';
            const isTermConnected = termStatus === 'connected';

            return (
              <div
                key={session.id}
                onClick={() => setActiveSessionId(session.id)}
                className={`group px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer border ${isActive
                    ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300 shadow-sm shadow-emerald-500/10'
                    : 'bg-white/5 border-transparent text-slate-400 hover:text-slate-200 hover:bg-white/10'
                  }`}
              >
                <span
                  className={`w-2 h-2 rounded-full ${isTermConnected
                      ? 'bg-emerald-400 animate-pulse'
                      : termStatus === 'connecting'
                        ? 'bg-amber-400 animate-ping'
                        : 'bg-red-400'
                    }`}
                />
                <TerminalIcon size={13} className={isActive ? 'text-emerald-400' : 'text-slate-500'} />
                <span>{session.title}</span>

                {/* Close Button if more than 1 tab */}
                {sessions.length > 1 && (
                  <button
                    onClick={(e) => handleCloseTerminal(e, session.id)}
                    className="p-0.5 text-slate-500 hover:text-red-400 transition-colors rounded hover:bg-slate-800 cursor-pointer ml-1"
                    title="Tutup Terminal Ini"
                  >
                    <X size={12} />
                  </button>
                )}
              </div>
            );
          })}

          {/* Add New Terminal Tab Button */}
          <button
            onClick={handleAddTerminal}
            className="px-3 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-dashed border-emerald-500/30 hover:border-emerald-500/60 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
            title="Tambah Sesi Terminal SSH Baru"
          >
            <Plus size={14} />
            <span>Tambah Terminal</span>
          </button>
        </div>

        {/* Action Controls for Current Terminal */}
        <div className="flex items-center gap-2">
          {/* Server Info Chip */}
          <span className="hidden md:inline-flex items-center gap-1.5 text-[11px] font-mono font-semibold px-2.5 py-1 bg-slate-800 text-slate-300 border border-slate-700 rounded-lg">
            <Server size={12} className="text-cyan-400" />
            <span>{server.username || 'root'}@{server.host}:{server.port || 22}</span>
          </span>

          {/* Copy Button */}
          <button
            onClick={handleCopy}
            className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors border border-slate-700 cursor-pointer"
            title="Salin Teks Seleksi"
          >
            {copied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
            <span className="hidden sm:inline">{copied ? 'Tersalin' : 'Copy'}</span>
          </button>

          {/* Clear Screen */}
          <button
            onClick={handleClear}
            className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors border border-slate-700 cursor-pointer"
            title="Bersihkan Layar Terminal (Ctrl+L)"
          >
            <Trash2 size={14} />
            <span className="hidden sm:inline">Clear</span>
          </button>

          {/* Reconnect */}
          <button
            onClick={handleReconnect}
            disabled={isConnecting}
            className="px-2.5 py-1.5 bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-400 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors border border-cyan-500/30 cursor-pointer"
            title="Koneksikan Ulang SSH"
          >
            <RefreshCw size={14} className={isConnecting ? 'animate-spin' : ''} />
            <span className="hidden sm:inline">Reconnect</span>
          </button>

          {/* Fullscreen Toggle */}
          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="p-1.5 text-slate-400 hover:text-white transition-colors cursor-pointer rounded-lg hover:bg-slate-800"
            title={isFullscreen ? 'Keluar dari Layar Penuh' : 'Layar Penuh'}
          >
            {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
          </button>
        </div>
      </div>

      {/* Sessions Container */}
      <div className="flex-1 overflow-hidden relative flex flex-col">
        {sessions.map((session) => (
          <SshTerminalInstance
            key={session.id}
            session={session}
            server={server}
            isActive={session.id === activeSessionId}
            sessionRef={session.id === activeSessionId ? activeControlRef : null}
            onStatusChange={(newStatus) =>
              setStatuses((prev) => ({ ...prev, [session.id]: newStatus }))
            }
          />
        ))}
      </div>

      {/* Footer Shortcut Hints */}
      <div className="bg-slate-900/70 border-t border-slate-800 px-4 py-2 text-[11px] text-slate-400 flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-3 font-mono text-[10px]">
          <span><kbd className="px-1.5 py-0.5 bg-slate-800 rounded border border-slate-700 text-slate-300">Tab</kbd> Autocomplete</span>
          <span><kbd className="px-1.5 py-0.5 bg-slate-800 rounded border border-slate-700 text-slate-300">Ctrl+C</kbd> Cancel</span>
          <span><kbd className="px-1.5 py-0.5 bg-slate-800 rounded border border-slate-700 text-slate-300">Ctrl+L</kbd> Clear</span>
          <span><kbd className="px-1.5 py-0.5 bg-slate-800 rounded border border-slate-700 text-slate-300">↑ / ↓</kbd> History</span>
        </div>
        <div className="flex items-center gap-1.5 text-slate-500 text-[10px]">
          <ShieldCheck size={12} className="text-emerald-400" />
          <span>Interactive SSH2 PTY Shell</span>
        </div>
      </div>
    </div>
  );
}
