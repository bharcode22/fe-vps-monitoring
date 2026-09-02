import React, { createContext, useContext, useState, useRef, useCallback } from 'react';
import {
  getDirectS3PresignedUrlsApi,
  saveDirectS3MultimediaMetadataApi
} from '../api/vpsApi';

const DirectS3UploadContext = createContext(null);

function formatBytes(bytes, decimals = 2) {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

export function generateRandomSoundScapeCode() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

// Native high-speed SHA-256 calculation in browser using Web Crypto API
async function calculateSha256(file) {
  const buffer = await file.arrayBuffer();
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

export function DirectS3UploadProvider({ children }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);

  // Form Metadata State
  const [metadata, setMetadata] = useState({
    sound_scape: generateRandomSoundScapeCode(),
    title: '',
    artist: 'Regenesis',
    album: '',
    duration: '',
    isShowAtCustom: 'show'
  });

  // Selected File Slots with SHA-256
  const [files, setFiles] = useState({
    music: { file: null, sha256: null, isHashing: false, progress: 0, status: 'idle', loadedBytes: 0 },
    video: { file: null, sha256: null, isHashing: false, progress: 0, status: 'idle', loadedBytes: 0 },
    lamp: { file: null, sha256: null, isHashing: false, progress: 0, status: 'idle', loadedBytes: 0 },
    coverAlbum: { file: null, sha256: null, isHashing: false, progress: 0, status: 'idle', loadedBytes: 0 }
  });

  // Upload Engine State
  const [isUploading, setIsUploading] = useState(false);
  const [uploadPhase, setUploadPhase] = useState('idle'); // 'idle' | 'presigning' | 'uploading_s3' | 'saving_db' | 'completed' | 'error'
  const [errorMessage, setErrorMessage] = useState('');
  const [successToast, setSuccessToast] = useState('');
  const [uploadStats, setUploadStats] = useState({
    totalBytes: 0,
    loadedBytes: 0,
    speedMBs: '0 MB/s',
    bandwidthMbps: '0.0 Mbps',
    eta: 'Menghitung...',
    startTime: 0
  });

  const activeXhrsRef = useRef({});

  // Open full modal dialog
  const openDirectS3Modal = useCallback(() => {
    setIsOpen(true);
    setIsMinimized(false);
    // If opening afresh and not uploading/completed, generate new code
    if (!isUploading && uploadPhase !== 'uploading_s3' && uploadPhase !== 'presigning' && uploadPhase !== 'saving_db') {
      if (uploadPhase === 'completed') {
        setMetadata({
          sound_scape: generateRandomSoundScapeCode(),
          title: '',
          artist: 'Regenesis',
          album: '',
          duration: '',
          isShowAtCustom: 'show'
        });
        setFiles({
          music: { file: null, sha256: null, isHashing: false, progress: 0, status: 'idle', loadedBytes: 0 },
          video: { file: null, sha256: null, isHashing: false, progress: 0, status: 'idle', loadedBytes: 0 },
          lamp: { file: null, sha256: null, isHashing: false, progress: 0, status: 'idle', loadedBytes: 0 },
          coverAlbum: { file: null, sha256: null, isHashing: false, progress: 0, status: 'idle', loadedBytes: 0 }
        });
        setUploadPhase('idle');
        setErrorMessage('');
      }
    }
  }, [isUploading, uploadPhase]);

  // Close or Minimize
  const closeDirectS3Modal = useCallback(() => {
    if (isUploading) {
      setIsMinimized(true);
      setIsOpen(false);
    } else {
      setIsOpen(false);
      setIsMinimized(false);
    }
  }, [isUploading]);

  const minimizeDirectS3Modal = useCallback(() => {
    setIsMinimized(true);
  }, []);

  const restoreDirectS3Modal = useCallback(() => {
    setIsOpen(true);
    setIsMinimized(false);
  }, []);

  const handleFileChange = useCallback(async (slotKey, selectedFile) => {
    if (!selectedFile) return;

    // Auto duration detection for audio/video
    if ((slotKey === 'music' || slotKey === 'video') && !metadata.duration) {
      const url = URL.createObjectURL(selectedFile);
      const audio = new Audio();
      audio.src = url;
      audio.onloadedmetadata = () => {
        if (audio.duration && !metadata.duration) {
          const m = Math.floor(audio.duration / 60);
          const s = Math.floor(audio.duration % 60);
          setMetadata(prev => ({ ...prev, duration: `${m}m ${s > 0 ? `${s}s` : ''}`.trim() }));
        }
        URL.revokeObjectURL(url);
      };
    }

    setFiles(prev => ({
      ...prev,
      [slotKey]: {
        ...prev[slotKey],
        file: selectedFile,
        sha256: null,
        isHashing: true,
        progress: 0,
        status: 'idle',
        loadedBytes: 0
      }
    }));

    try {
      const sha256Hex = await calculateSha256(selectedFile);
      setFiles(prev => ({
        ...prev,
        [slotKey]: {
          ...prev[slotKey],
          sha256: sha256Hex,
          isHashing: false
        }
      }));
    } catch (err) {
      console.warn('Gagal menghitung SHA-256:', err);
      setFiles(prev => ({
        ...prev,
        [slotKey]: {
          ...prev[slotKey],
          isHashing: false
        }
      }));
    }
  }, [metadata.duration]);

  const handleRemoveFile = useCallback((slotKey) => {
    if (isUploading) return;
    setFiles(prev => ({
      ...prev,
      [slotKey]: { file: null, sha256: null, isHashing: false, progress: 0, status: 'idle', loadedBytes: 0 }
    }));
  }, [isUploading]);

  const uploadFileToS3 = (slotKey, file, presignedUrl, onProgress) => {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      activeXhrsRef.current[slotKey] = xhr;

      xhr.open('PUT', presignedUrl, true);
      xhr.setRequestHeader('Content-Type', file.type || 'application/octet-stream');

      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable && onProgress) {
          onProgress(e.loaded, e.total);
        }
      };

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve(true);
        } else {
          reject(new Error(`S3 upload error ${xhr.status}`));
        }
      };

      xhr.onerror = () => reject(new Error('Koneksi upload ke S3 gagal'));
      xhr.onabort = () => reject(new Error('Upload dibatalkan'));

      xhr.send(file);
    });
  };

  const startUpload = useCallback(async (onSuccessCallback) => {
    const soundScape = metadata.sound_scape.trim();
    if (!soundScape) {
      setErrorMessage('Kode SoundScape (#) wajib diisi');
      return;
    }

    const activeSlots = Object.keys(files).filter(k => files[k].file);
    if (activeSlots.length === 0) {
      setErrorMessage('Pilih setidaknya 1 berkas untuk diunggah');
      return;
    }

    const isAnyHashing = activeSlots.some(k => files[k].isHashing);
    if (isAnyHashing) {
      setErrorMessage('Sedang menghitung hash SHA-256. Mohon tunggu sebentar...');
      return;
    }

    setIsUploading(true);
    setUploadPhase('presigning');
    setErrorMessage('');

    const grandTotal = activeSlots.reduce((acc, k) => acc + (files[k].file?.size || 0), 0);
    const startTime = Date.now();
    setUploadStats({
      totalBytes: grandTotal,
      loadedBytes: 0,
      speedMBs: '0 MB/s',
      bandwidthMbps: '0.0 Mbps',
      eta: 'Menghitung...',
      startTime
    });

    try {
      // Step 1: Request Presigned PUT URLs
      const filesPayload = activeSlots.map(k => ({
        slotKey: k,
        filename: files[k].file.name,
        contentType: files[k].file.type || 'application/octet-stream'
      }));

      const presignedRes = await getDirectS3PresignedUrlsApi(soundScape, filesPayload);
      if (!presignedRes.files || presignedRes.files.length === 0) {
        throw new Error('Gagal mendapatkan tiket upload S3');
      }

      setUploadPhase('uploading_s3');

      // Step 2: Upload all files in parallel
      const uploadPromises = presignedRes.files.map(async (slotData) => {
        const k = slotData.slotKey;
        const fileObj = files[k].file;
        if (!fileObj) return;

        setFiles(prev => ({
          ...prev,
          [k]: { ...prev[k], status: 'uploading' }
        }));

        await uploadFileToS3(k, fileObj, slotData.uploadUrl, (loaded, total) => {
          const pct = Math.round((loaded / total) * 100);
          setFiles(prev => ({
            ...prev,
            [k]: { ...prev[k], progress: pct, loadedBytes: loaded }
          }));

          const now = Date.now();
          const elapsedSec = Math.max(0.2, (now - startTime) / 1000);
          setFiles(latestFiles => {
            const currentGrandLoaded = Object.values(latestFiles).reduce((sum, f) => sum + (f.loadedBytes || 0), 0);
            const speedBytes = currentGrandLoaded / elapsedSec;
            const bandwidthMbps = ((speedBytes * 8) / (1024 * 1024)).toFixed(1);
            const remainingBytes = Math.max(0, grandTotal - currentGrandLoaded);
            const etaSec = speedBytes > 0 ? Math.ceil(remainingBytes / speedBytes) : 0;
            const etaStr = etaSec <= 0 ? 'Selesai' : etaSec < 60 ? `~${etaSec} dtk` : `~${Math.floor(etaSec / 60)}m ${etaSec % 60}s`;

            setUploadStats(prev => ({
              ...prev,
              loadedBytes: currentGrandLoaded,
              speedMBs: `${formatBytes(speedBytes)}/s`,
              bandwidthMbps: `${bandwidthMbps} Mbps`,
              eta: etaStr
            }));
            return latestFiles;
          });
        });

        setFiles(prev => ({
          ...prev,
          [k]: { ...prev[k], progress: 100, status: 'completed' }
        }));
      });

      await Promise.all(uploadPromises);

      // Step 3: Save metadata to Master Database
      setUploadPhase('saving_db');

      const savePayload = {
        sound_scape: soundScape,
        title: metadata.title || files.music.file?.name || `Track #${soundScape}`,
        artist: metadata.artist || 'Regenesis',
        album: metadata.album || 'SoundScape',
        duration: metadata.duration || '',
        isShowAtCustom: metadata.isShowAtCustom || 'show',
        files: presignedRes.files.map(slotData => {
          const k = slotData.slotKey;
          return {
            slotKey: k,
            name: slotData.filename,
            path: slotData.relativePath,
            s3Url: slotData.finalPublicUrl,
            sha256: files[k].sha256
          };
        })
      };

      await saveDirectS3MultimediaMetadataApi(savePayload);

      setUploadPhase('completed');
      setIsUploading(false);
      setSuccessToast(`Upload #${soundScape} berhasil disimpan ke AWS S3 & Master DB!`);

      if (onSuccessCallback) {
        onSuccessCallback(soundScape);
      }
    } catch (err) {
      console.error('Direct S3 Upload error:', err);
      setErrorMessage(err.message || 'Terjadi kesalahan saat upload langsung ke S3');
      setUploadPhase('error');
      setIsUploading(false);
    }
  }, [metadata, files]);

  const abortUpload = useCallback(() => {
    if (window.confirm('Yakin ingin membatalkan proses upload langsung ke S3?')) {
      Object.values(activeXhrsRef.current).forEach(xhr => {
        try { xhr.abort(); } catch (_) { }
      });
      setIsUploading(false);
      setUploadPhase('idle');
      setIsMinimized(false);
    }
  }, []);

  const resetForm = useCallback(() => {
    setMetadata({
      sound_scape: generateRandomSoundScapeCode(),
      title: '',
      artist: 'Regenesis',
      album: '',
      duration: '',
      isShowAtCustom: 'show'
    });
    setFiles({
      music: { file: null, sha256: null, isHashing: false, progress: 0, status: 'idle', loadedBytes: 0 },
      video: { file: null, sha256: null, isHashing: false, progress: 0, status: 'idle', loadedBytes: 0 },
      lamp: { file: null, sha256: null, isHashing: false, progress: 0, status: 'idle', loadedBytes: 0 },
      coverAlbum: { file: null, sha256: null, isHashing: false, progress: 0, status: 'idle', loadedBytes: 0 }
    });
    setIsUploading(false);
    setIsMinimized(false);
    setUploadPhase('idle');
    setErrorMessage('');
    setUploadStats({
      totalBytes: 0,
      loadedBytes: 0,
      speedMBs: '0 MB/s',
      bandwidthMbps: '0.0 Mbps',
      eta: 'Menghitung...',
      startTime: 0
    });
  }, []);

  const grandProgress = uploadStats.totalBytes > 0
    ? Math.min(100, Math.round((uploadStats.loadedBytes / uploadStats.totalBytes) * 100))
    : 0;

  return (
    <DirectS3UploadContext.Provider
      value={{
        isOpen,
        isMinimized,
        metadata,
        setMetadata,
        files,
        isUploading,
        uploadPhase,
        errorMessage,
        uploadStats,
        grandProgress,
        successToast,
        setSuccessToast,
        openDirectS3Modal,
        closeDirectS3Modal,
        minimizeDirectS3Modal,
        restoreDirectS3Modal,
        handleFileChange,
        handleRemoveFile,
        startUpload,
        abortUpload,
        resetForm
      }}
    >
      {children}
    </DirectS3UploadContext.Provider>
  );
}

export function useDirectS3Upload() {
  const context = useContext(DirectS3UploadContext);
  if (!context) {
    throw new Error('useDirectS3Upload must be used within a DirectS3UploadProvider');
  }
  return context;
}
