import React, { useState } from 'react';
import { Terminal, Check } from 'lucide-react';

const S3_DOMAIN = 'https://developerfile-084897310273.s3.ap-southeast-1.amazonaws.com';
const S3_BASE_URL = `${S3_DOMAIN}/media`;

/**
 * Build the full public download URL from AWS S3 media bucket
 * Supports:
 * - Bare filenames: "guidedbreathwork.jpg.webp" -> S3_BASE_URL/144411/guidedbreathwork.jpg.webp
 * - Paths with /media/: "/media/144411/guidedbreathwork.jpg.webp" -> S3_DOMAIN/media/144411/guidedbreathwork.jpg.webp
 * - Full URLs: "https://..." -> returns directly
 */
export function getFileDownloadUrl(soundScape, filename) {
  if (!filename) return '';
  const cleanFn = String(filename).trim();
  if (cleanFn.startsWith('http://') || cleanFn.startsWith('https://')) {
    return cleanFn;
  }
  if (cleanFn.startsWith('/media/') || cleanFn.startsWith('media/')) {
    const p = cleanFn.startsWith('/') ? cleanFn : '/' + cleanFn;
    return `${S3_DOMAIN}${p}`;
  }
  if (cleanFn.startsWith('/')) {
    return `${S3_DOMAIN}${cleanFn}`;
  }
  const cleanCode = String(soundScape || '').trim().replace(/^\/+|\/+$/g, '');
  return `${S3_BASE_URL}/${encodeURIComponent(cleanCode)}/${encodeURIComponent(cleanFn)}`;
}

/**
 * Robust cross-browser clipboard copy with fallback
 */
export async function copyTextToClipboard(text) {
  if (!text) return false;
  try {
    if (navigator?.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch (err) {
    console.warn('navigator.clipboard failed, fallback to execCommand:', err);
  }

  try {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '-999999px';
    textArea.style.top = '-999999px';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    const successful = document.execCommand('copy');
    document.body.removeChild(textArea);
    return successful;
  } catch (err) {
    console.error('Fallback execCommand failed:', err);
    return false;
  }
}

/**
 * Reusable Copy curl Command Button (Single 1-Click Terminal Ready)
 */
export default function DownloadUrlCopyButton({
  soundScape,
  filename,
  onToast = null,
  variant = 'compact', // 'compact' | 'detail'
  className = ''
}) {
  const [copied, setCopied] = useState(false);

  if (!filename) return null;

  const downloadUrl = getFileDownloadUrl(soundScape, filename);
  const curlCmd = `curl -O "${downloadUrl}"`;

  const handleCopy = async (e) => {
    e.stopPropagation();
    const ok = await copyTextToClipboard(curlCmd);
    if (ok) {
      setCopied(true);
      if (onToast) {
        onToast(`Perintah curl untuk "${filename}" tersalin! Tinggal paste di terminal.`);
      }
      setTimeout(() => {
        setCopied(false);
      }, 1800);
    }
  };

  // Detail variant (for modal popup)
  if (variant === 'detail') {
    return (
      <button
        type="button"
        onClick={handleCopy}
        className={`px-2.5 py-1 rounded-xl text-[10.5px] font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm active:scale-95 border ${
          copied
            ? 'bg-emerald-500/25 text-emerald-300 border-emerald-500/40 shadow-emerald-500/10'
            : 'bg-purple-500/15 hover:bg-purple-500/30 text-purple-300 hover:text-purple-100 border-purple-500/40'
        } ${className}`}
        title={`Salin perintah curl untuk ${filename} (tinggal paste di terminal)`}
      >
        {copied ? (
          <>
            <Check size={11} className="text-emerald-400 shrink-0" />
            <span>Tersalin!</span>
          </>
        ) : (
          <>
            <Terminal size={11} className="text-purple-400 shrink-0" />
            <span>Salin curl</span>
          </>
        )}
      </button>
    );
  }

  // Compact variant (Default: for file list rows & cards)
  return (
    <button
      type="button"
      onClick={handleCopy}
      className={`px-1.5 py-0.5 rounded-md text-[9px] font-mono font-bold flex items-center gap-1 transition-all cursor-pointer active:scale-95 border shrink-0 ${
        copied
          ? 'bg-emerald-500/25 text-emerald-300 border-emerald-500/50 shadow-sm shadow-emerald-500/10'
          : 'bg-slate-900/90 hover:bg-purple-500/20 text-purple-300 hover:text-purple-200 border-slate-700/80 hover:border-purple-500/40'
      } ${className}`}
      title={`Salin perintah curl untuk ${filename} (tinggal paste di terminal)`}
    >
      {copied ? (
        <>
          <Check size={9} className="text-emerald-400 shrink-0" />
          <span>Tersalin!</span>
        </>
      ) : (
        <>
          <Terminal size={9} className="text-purple-400 shrink-0" />
          <span>curl</span>
        </>
      )}
    </button>
  );
}

/**
 * Button to copy curl command for ALL files in a SoundScape track
 */
export function CopyAllTrackFilesButton({
  soundScape,
  files = [], // array of filenames or { filename, category, fullPath }
  onToast = null,
  className = ''
}) {
  const [copied, setCopied] = useState(false);

  // Normalize filenames
  const validFiles = (files || [])
    .map(f => (typeof f === 'string' ? f : f?.filename))
    .filter(Boolean);

  if (!soundScape || validFiles.length === 0) return null;

  const handleCopyAll = async (e) => {
    e.stopPropagation();
    const cmds = validFiles.map(fn => {
      const url = getFileDownloadUrl(soundScape, fn);
      return `curl -O "${url}"`;
    });
    const fullCmd = cmds.join(' && \\\n');

    const ok = await copyTextToClipboard(fullCmd);
    if (ok) {
      setCopied(true);
      if (onToast) {
        onToast(`Perintah curl untuk ${validFiles.length} berkas #${soundScape} tersalin! Tinggal paste di terminal.`);
      }
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <button
      type="button"
      onClick={handleCopyAll}
      className={`px-2.5 py-1 rounded-xl bg-purple-500/15 hover:bg-purple-500/25 text-purple-300 hover:text-purple-100 border border-purple-500/30 hover:border-purple-500/50 text-[11px] font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm active:scale-95 ${className}`}
      title={`Salin perintah curl untuk mendownload seluruh ${validFiles.length} berkas #${soundScape} di terminal`}
    >
      {copied ? (
        <>
          <Check size={12} className="text-emerald-400" />
          <span className="text-emerald-300">curl Semua Berkas Tersalin!</span>
        </>
      ) : (
        <>
          <Terminal size={12} className="text-purple-400" />
          <span>Salin curl ({validFiles.length} Berkas)</span>
        </>
      )}
    </button>
  );
}
