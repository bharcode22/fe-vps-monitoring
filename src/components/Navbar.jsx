import React from 'react';
import { Server, Plus, Activity, RefreshCw, Cpu, HardDrive, Tv, Monitor } from 'lucide-react';

export default function Navbar({ onOpenAddModal, totalServers, isConnected, onRefresh, isTvMode, onToggleTvMode }) {
  return (
    <header className="glass-card" style={{ borderRadius: '0 0 20px 20px', padding: '16px 28px', marginBottom: '28px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
        
        {/* Logo & Title */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{
            background: 'linear-gradient(135deg, rgba(0, 242, 254, 0.2) 0%, rgba(79, 172, 254, 0.2) 100%)',
            border: '1px solid rgba(0, 242, 254, 0.4)',
            padding: '10px',
            borderRadius: '12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <Activity color="#00f2fe" size={26} />
          </div>
          <div>
            <h1 className="gradient-text" style={{ fontSize: '1.5rem', fontWeight: 700, letterSpacing: '-0.5px' }}>
              VPS & POD Monitor
            </h1>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
              Real-time Server Bandwidth, CPU & RAM Monitoring
            </p>
          </div>
        </div>

        {/* Live Status Indicators & Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          
          {/* TV / NOC Wall Display Mode Toggle */}
          <button
            onClick={onToggleTvMode}
            className="btn-secondary"
            style={{
              borderColor: isTvMode ? '#00f2fe' : 'var(--border-color)',
              background: isTvMode ? 'rgba(0, 242, 254, 0.15)' : 'rgba(255, 255, 255, 0.06)',
              color: isTvMode ? '#00f2fe' : 'var(--text-main)'
            }}
            title="Toggle TV / Wall Monitor Full View"
          >
            <Tv size={16} />
            <span>{isTvMode ? 'Normal View' : 'TV Monitor Mode'}</span>
          </button>

          {/* Socket status indicator */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            background: 'rgba(255, 255, 255, 0.05)',
            padding: '8px 14px',
            borderRadius: '10px',
            border: '1px solid var(--border-color)',
            fontSize: '0.85rem'
          }}>
            <span className={`live-dot ${isConnected ? 'online' : 'offline'}`}></span>
            <span style={{ color: isConnected ? 'var(--status-online)' : 'var(--status-danger)', fontWeight: 500 }}>
              {isConnected ? 'Realtime Connected' : 'Connecting...'}
            </span>
          </div>

          {/* Server Count Badge */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            background: 'rgba(255, 255, 255, 0.05)',
            padding: '8px 14px',
            borderRadius: '10px',
            border: '1px solid var(--border-color)',
            fontSize: '0.85rem',
            color: 'var(--text-muted)'
          }}>
            <Server size={16} color="var(--primary-blue)" />
            <span>Total VPS: <strong style={{ color: '#fff' }}>{totalServers}</strong></span>
          </div>

          {/* Refresh Button */}
          <button onClick={onRefresh} className="btn-secondary" title="Refresh metrics">
            <RefreshCw size={16} />
          </button>

          {/* Add VPS Button */}
          <button onClick={onOpenAddModal} className="btn-primary">
            <Plus size={18} />
            <span>Tambah VPS</span>
          </button>
        </div>

      </div>
    </header>
  );
}
