import React, { useState, useEffect } from 'react';
import { Send, BellOff, Loader2 } from 'lucide-react';
import {
  getStoredTelegramConfig,
  setStoredTelegramConfig,
  EVENT_TELEGRAM_CONFIG_UPDATED
} from '../../utils/telegramAlert';
import { fetchTelegramConfigApi, saveTelegramConfigApi } from '../../api/podActivityApi';

export default function PodTelegramAlertToggle({ compact = false, className = '' }) {
  const [config, setConfig] = useState(getStoredTelegramConfig);
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    // 1. Fetch latest state from backend
    fetchTelegramConfigApi()
      .then((data) => {
        if (data && typeof data === 'object') {
          setConfig(data);
          setStoredTelegramConfig(data);
        }
      })
      .catch(() => { });

    // 2. Listen to real-time custom event (triggered by WebSocket or other components)
    const handleUpdated = (e) => {
      if (e.detail && typeof e.detail === 'object') {
        setConfig(e.detail);
      }
    };
    window.addEventListener(EVENT_TELEGRAM_CONFIG_UPDATED, handleUpdated);
    return () => window.removeEventListener(EVENT_TELEGRAM_CONFIG_UPDATED, handleUpdated);
  }, []);

  const handleToggle = async (e) => {
    e.stopPropagation();
    if (isUpdating) return;

    const nextState = !config.enabled;
    const nextConfig = { ...config, enabled: nextState };

    // Optimistic UI update
    setConfig(nextConfig);
    setStoredTelegramConfig(nextConfig);
    setIsUpdating(true);

    try {
      const res = await saveTelegramConfigApi(nextConfig);
      const saved = res.data || nextConfig;
      setConfig(saved);
      setStoredTelegramConfig(saved);
    } catch (err) {
      console.error('Gagal mengubah pengaturan Telegram:', err.message);
      // Revert on error
      const reverted = { ...config, enabled: !nextState };
      setConfig(reverted);
      setStoredTelegramConfig(reverted);
      alert(`Gagal mengubah status Telegram: ${err.message}`);
    } finally {
      setIsUpdating(false);
    }
  };

  const isEnabled = Boolean(config.enabled);

  if (compact) {
    return (
      <button
        onClick={handleToggle}
        disabled={isUpdating}
        className={`p-2 rounded-xl border transition cursor-pointer flex items-center justify-center ${
          isEnabled
            ? 'bg-sky-500/20 text-sky-300 border-sky-500/40 hover:bg-sky-500/30'
            : 'bg-slate-800/80 text-slate-400 border-slate-700 hover:text-slate-200'
        } ${className}`}
        title={
          isEnabled
            ? "Notifikasi Telegram ke grup 'HB monitor' AKTIF (Khusus status DEAD). Klik untuk MATIKAN selama develop di local."
            : "Notifikasi Telegram MATI (tidak ada pesan yang dikirim ke grup). Klik untuk AKTIFKAN."
        }
      >
        {isUpdating ? (
          <Loader2 size={14} className="animate-spin text-sky-400" />
        ) : isEnabled ? (
          <Send size={14} className="text-sky-400" />
        ) : (
          <BellOff size={14} className="text-slate-400" />
        )}
      </button>
    );
  }

  return (
    <button
      onClick={handleToggle}
      disabled={isUpdating}
      className={`px-3 py-1.5 rounded-xl border flex items-center gap-1.5 text-xs font-bold transition cursor-pointer select-none active:scale-95 ${
        isEnabled
          ? 'bg-sky-500/20 text-sky-200 border-sky-500/40 hover:bg-sky-500/30 shadow-sm shadow-sky-500/10'
          : 'bg-slate-800/80 text-slate-400 border-slate-700 hover:text-slate-200 hover:bg-slate-800'
      } ${className}`}
      title={
        isEnabled
          ? "Notifikasi Telegram ke grup 'HB monitor' AKTIF (Khusus status DEAD). Klik untuk MATIKAN selama develop di local."
          : "Notifikasi Telegram MATI (tidak ada pesan yang dikirim ke grup). Klik untuk AKTIFKAN."
      }
    >
      {isUpdating ? (
        <Loader2 size={13} className="animate-spin text-sky-400 shrink-0" />
      ) : isEnabled ? (
        <>
          <Send size={13} className="text-sky-400 shrink-0" />
          <span className="w-1.5 h-1.5 rounded-full bg-sky-400 animate-pulse shrink-0" />
          <span>Telegram ON</span>
        </>
      ) : (
        <>
          <BellOff size={13} className="text-slate-400 shrink-0" />
          <span>Telegram OFF</span>
        </>
      )}
    </button>
  );
}
