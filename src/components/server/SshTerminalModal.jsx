import React, { useState, useEffect, useRef } from 'react';
import { Terminal as TerminalIcon, X, Maximize2, Minimize2, RefreshCw, Trash2, ShieldCheck, Check, Copy, Wifi, WifiOff } from 'lucide-react';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import '@xterm/xterm/css/xterm.css';
import { io } from 'socket.io-client';
import { SOCKET_URL } from '../../config';

export default function SshTerminalModal({ isOpen, onClose, server }) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [status, setStatus] = useState('connecting'); // 'connecting' | 'connected' | 'disconnected' | 'error'
  const [errorMessage, setErrorMessage] = useState('');
  const [copied, setCopied] = useState(false);

  const terminalContainerRef = useRef(null);
  const termRef = useRef(null);
  const fitAddonRef = useRef(null);
  const socketRef = useRef(null);

  useEffect(() => {
    if (!isOpen || !server) return;

    let isSubscribed = true;
    setStatus('connecting');
    setErrorMessage('');

    // Wait for DOM container render
    const initTimer = setTimeout(() => {
      if (!terminalContainerRef.current || !isSubscribed) return;

      // 1. Initialize xterm instance
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

      term.write('\x1b[36m[Menghubungkan ke SSH ' + (server.username || 'root') + '@' + server.host + '...]\x1b[0m\r\n');

      // 2. Connect Socket.io
      const socket = io(SOCKET_URL, { transports: ['websocket', 'polling'] });
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
        term.focus();
        // Resize sync
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
        setErrorMessage(err?.error || 'Koneksi SSH gagal.');
        term.write(`\r\n\x1b[31;1m[ERROR] ${err?.error || 'Koneksi SSH gagal'}\x1b[0m\r\n`);
      });

      socket.on('terminal:closed', () => {
        if (!isSubscribed) return;
        setStatus('disconnected');
        term.write('\r\n\x1b[33m[Sesi SSH telah terputus / ditutup]\x1b[0m\r\n');
      });

      term.onData((data) => {
        if (socket.connected) {
          socket.emit('terminal:input', { data });
        }
      });

      // 3. Resize listener with ResizeObserver
      const resizeObserver = new ResizeObserver(() => {
        if (fitAddonRef.current && termRef.current) {
          try {
            fitAddonRef.current.fit();
            const dims = fitAddonRef.current.proposeDimensions();
            if (dims && socketRef.current && socketRef.current.connected) {
              socketRef.current.emit('terminal:resize', { cols: dims.cols, rows: dims.rows });
            }
          } catch (_) {}
        }
      });

      if (terminalContainerRef.current) {
        resizeObserver.observe(terminalContainerRef.current);
      }

      // Store cleanup function in ref
      terminalContainerRef.current._cleanupObserver = () => resizeObserver.disconnect();
    }, 50);

    return () => {
      isSubscribed = false;
      clearTimeout(initTimer);

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
  }, [isOpen, server?.id]);

  const handleReconnect = () => {
    if (!socketRef.current || !termRef.current || !fitAddonRef.current) return;
    setStatus('connecting');
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

  const handleClearScreen = () => {
    if (termRef.current) {
      termRef.current.clear();
      if (socketRef.current && socketRef.current.connected) {
        // Send Ctrl+L to redraw shell prompt
        socketRef.current.emit('terminal:input', { data: '\x0c' });
      }
    }
  };

  const handleCopySelection = () => {
    if (termRef.current && termRef.current.hasSelection()) {
      const selectedText = termRef.current.getSelection();
      navigator.clipboard.writeText(selectedText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (!isOpen || !server) return null;

  const isConnected = status === 'connected';
  const isConnecting = status === 'connecting';

  return (
    <div className="fixed inset-0 z-[1050] bg-black/85 backdrop-blur-md flex items-center justify-center p-2 sm:p-4" onClick={onClose}>
      <div
        className={`bg-slate-950 border border-cyan-500/40 rounded-3xl shadow-2xl shadow-black flex flex-col overflow-hidden transition-all duration-200 ${
          isFullscreen
            ? 'w-full h-full rounded-none border-none'
            : 'w-[96vw] max-w-6xl h-[88vh] max-h-[850px]'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Toolbar */}
        <div className="bg-slate-900/90 border-b border-slate-800 px-4 py-3 flex items-center justify-between gap-3 flex-wrap">
          {/* Server Info */}
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-cyan-500/20 to-blue-500/20 text-cyan-400 border border-cyan-500/30 rounded-xl">
              <TerminalIcon size={18} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-white tracking-wide">{server.name}</h3>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 bg-slate-800 text-slate-300 border border-slate-700 rounded-md">
                  {server.username || 'root'}@{server.host}:{server.port || 22}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-1.5">
                <span className={`w-2 h-2 rounded-full ${
                  isConnected ? 'bg-emerald-400 animate-pulse' : isConnecting ? 'bg-amber-400 animate-ping' : 'bg-red-400'
                }`}></span>
                <span className="font-mono uppercase font-bold text-[10px]">
                  {isConnected ? 'SSH CONNECTED' : isConnecting ? 'CONNECTING...' : 'DISCONNECTED'}
                </span>
              </p>
            </div>
          </div>

          {/* Action Toolbar */}
          <div className="flex items-center gap-2">
            {/* Copy Button */}
            <button
              onClick={handleCopySelection}
              className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors border border-slate-700 cursor-pointer"
              title="Salin Teks yang Dipilih"
            >
              {copied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
              <span className="hidden sm:inline">{copied ? 'Tersalin' : 'Copy'}</span>
            </button>

            {/* Clear Screen */}
            <button
              onClick={handleClearScreen}
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
              {isFullscreen ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
            </button>

            {/* Close Button */}
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-red-400 transition-colors cursor-pointer rounded-lg hover:bg-slate-800 ml-1"
              title="Tutup Terminal"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Error Banner */}
        {errorMessage && status === 'error' && (
          <div className="bg-red-500/15 border-b border-red-500/30 text-red-300 px-4 py-2 text-xs flex items-center justify-between">
            <span>{errorMessage}</span>
            <button onClick={handleReconnect} className="underline hover:text-white font-bold ml-2">Coba Lagi</button>
          </div>
        )}

        {/* Terminal Container */}
        <div className="flex-1 bg-[#090d16] p-3 overflow-hidden relative">
          <div
            ref={terminalContainerRef}
            className="w-full h-full"
            style={{ minHeight: '300px' }}
          />
        </div>

        {/* Footer Shortcut Hints */}
        <div className="bg-slate-900/60 border-t border-slate-800/80 px-4 py-2 text-[11px] text-slate-400 flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-4 font-mono text-[10px]">
            <span><kbd className="px-1.5 py-0.5 bg-slate-800 rounded border border-slate-700 text-slate-300">Tab</kbd> Autocomplete</span>
            <span><kbd className="px-1.5 py-0.5 bg-slate-800 rounded border border-slate-700 text-slate-300">Ctrl+C</kbd> Cancel</span>
            <span><kbd className="px-1.5 py-0.5 bg-slate-800 rounded border border-slate-700 text-slate-300">Ctrl+L</kbd> Clear</span>
            <span><kbd className="px-1.5 py-0.5 bg-slate-800 rounded border border-slate-700 text-slate-300">↑ / ↓</kbd> History</span>
          </div>
          <div className="flex items-center gap-1.5 text-slate-500 text-[10px]">
            <ShieldCheck size={12} className="text-emerald-400" />
            <span>Interactive PTY Shell via SSH2</span>
          </div>
        </div>
      </div>
    </div>
  );
}
