/**
 * Web Audio Engine for POD Session Simulator & Template Generator
 * Handles Spectrogram, Waveform, 19.2kHz Strobe Tone Extraction & Acoustic Filters
 * Enhanced with Streaming Download & PCM Decoding Progress Tracker
 */
import { BACKEND_URL } from '../../config';
import { getAuthHeaders } from '../../api/vpsApi';

export const STROBE_FREQ_TARGET = 19200;
export const SPEC_PIXELS_PER_SEC = 4; // Optimized: 4px/sec gives crisp display without 60,000px lag
export const LOGIC_SAMPLE_RATE = 500;

let sharedAudioContext = null;

export function getAudioContext() {
  if (!sharedAudioContext) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    sharedAudioContext = new AudioContextClass();
  }
  return sharedAudioContext;
}

export function ensureAudioContextRunning() {
  const ctx = getAudioContext();
  if (ctx.state === 'suspended') {
    return ctx.resume();
  }
  return Promise.resolve();
}

/**
 * Streaming fetch with real-time percentage and byte progress tracker
 */
export async function fetchArrayBufferWithProgress(url, options = {}, onProgress) {
  const { onConnected, ...fetchOptions } = options;
  const res = await fetch(url, fetchOptions);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);

  if (onConnected) {
    try {
      onConnected(res);
    } catch (e) { }
  }

  const contentLength = res.headers.get('content-length');
  const totalBytes = contentLength ? parseInt(contentLength, 10) : 0;

  // Immediately notify that connection is established & headers are received
  if (onProgress) {
    onProgress(totalBytes > 0 ? 0 : null, 0, totalBytes);
  }

  // Fallback to arrayBuffer only if response body is not streamable
  if (!res.body || typeof res.body.getReader !== 'function') {
    const ab = await res.arrayBuffer();
    if (onProgress) onProgress(100, ab.byteLength, ab.byteLength);
    return ab;
  }

  const reader = res.body.getReader();
  let receivedBytes = 0;
  const chunks = [];

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    receivedBytes += value.length;
    if (onProgress) {
      const pct = totalBytes > 0 ? Math.min(99, Math.round((receivedBytes / totalBytes) * 100)) : null;
      onProgress(pct, receivedBytes, totalBytes);
    }
  }

  const all = new Uint8Array(receivedBytes);
  let offset = 0;
  for (const chunk of chunks) {
    all.set(chunk, offset);
    offset += chunk.length;
  }

  if (onProgress) onProgress(100, receivedBytes, totalBytes || receivedBytes);
  return all.buffer;
}

/**
 * Extracts high-frequency envelope (19.2kHz strobe detection at 500Hz sampling)
 */
export function extractHighFreqEnvelope(buffer, channelIdx = 0) {
  if (!buffer) return new Float32Array(0);
  if (channelIdx >= buffer.numberOfChannels) channelIdx = 0;
  const data = buffer.getChannelData(channelIdx);
  const step = Math.floor(buffer.sampleRate / LOGIC_SAMPLE_RATE);
  const resultLength = Math.ceil(data.length / step);
  const result = new Float32Array(resultLength);

  for (let i = 0; i < resultLength; i++) {
    const start = i * step;
    let sum = 0;
    for (let j = 0; j < step - 1; j++) {
      if (start + j + 1 < data.length) {
        sum += Math.abs(data[start + j] - data[start + j + 1]);
      }
    }
    result[i] = Math.min(255, (sum / step) * 1000);
  }
  return result;
}

/**
 * Generates Spectrogram Offscreen Canvas for audio visualization (Optimized)
 */
export function generateSpectrogramCache(buffer, channelIdx = 0) {
  if (!buffer) return Promise.resolve(null);
  if (channelIdx >= buffer.numberOfChannels) channelIdx = 0;

  // Cap width to max 2400px (fast generation & prevents 60,000px GPU texture lag)
  const width = Math.max(10, Math.min(2400, Math.ceil(buffer.duration * SPEC_PIXELS_PER_SEC)));
  const height = 128;
  const offCanvas = document.createElement('canvas');
  offCanvas.width = width;
  offCanvas.height = height;
  const ctx = offCanvas.getContext('2d');
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, width, height);

  const data = buffer.getChannelData(channelIdx);
  const samplesPerPixel = Math.floor(data.length / width);

  return new Promise((resolve) => {
    const chunkSize = 600;
    let currentPixel = 0;

    function process() {
      const end = Math.min(currentPixel + chunkSize, width);
      for (let x = currentPixel; x < end; x++) {
        const start = x * samplesPerPixel;
        let maxAmp = 0;
        let zeroCross = 0;
        let last = 0;
        const step = Math.max(1, Math.floor(samplesPerPixel / 64));
        for (let i = 0; i < samplesPerPixel; i += step) {
          if (start + i >= data.length) break;
          const val = data[start + i];
          if (Math.abs(val) > maxAmp) maxAmp = Math.abs(val);
          if ((last > 0 && val <= 0) || (last <= 0 && val > 0)) zeroCross++;
          last = val;
        }
        if (maxAmp > 0.001) {
          const zcrNorm = zeroCross / (samplesPerPixel / (step * 2));
          const centerY = height - (zcrNorm * height * 2);
          const hBar = maxAmp * height;
          const hue = 240 - (zcrNorm * 240 * 2);
          ctx.fillStyle = `hsla(${hue}, 80%, 50%, ${maxAmp * 3})`;
          ctx.fillRect(x, centerY - hBar / 2, 1, hBar);
        }
      }
      currentPixel = end;
      if (currentPixel < width) {
        setTimeout(process, 0);
      } else {
        resolve(offCanvas);
      }
    }
    process();
  });
}

/**
 * Generates Waveform Offscreen Canvas (Optimized)
 */
export function generateWaveformCache(buffer, channelIdx = 0) {
  if (!buffer) return Promise.resolve(null);
  if (channelIdx >= buffer.numberOfChannels) channelIdx = 0;

  // Cap width to max 2400px
  const width = Math.max(10, Math.min(2400, Math.ceil(buffer.duration * SPEC_PIXELS_PER_SEC)));
  const height = 64;
  const offCanvas = document.createElement('canvas');
  offCanvas.width = width;
  offCanvas.height = height;
  const ctx = offCanvas.getContext('2d');
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(0, 0, width, height);
  ctx.strokeStyle = '#34d399';
  ctx.lineWidth = 1;
  ctx.beginPath();

  const data = buffer.getChannelData(channelIdx);
  const step = Math.floor(data.length / width);
  const yMid = height / 2;

  for (let x = 0; x < width; x++) {
    const idx = x * step;
    if (idx < data.length) {
      const y = yMid + (data[idx] * yMid * 0.9);
      if (x === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
  }
  ctx.stroke();
  return Promise.resolve(offCanvas);
}

/**
 * Creates Multi-Band Analyser Filters (Speaker, Transducer, Subwoofer)
 */
export function createAcousticFilters(audioContext, sourceNode) {
  if (!audioContext || !sourceNode) return null;

  // 1. Speaker Filter (Highpass 110Hz)
  const speakerFilter = audioContext.createBiquadFilter();
  speakerFilter.type = 'highpass';
  speakerFilter.frequency.value = 110;
  const speakerAnalyser = audioContext.createAnalyser();
  speakerAnalyser.fftSize = 256;
  sourceNode.connect(speakerFilter);
  speakerFilter.connect(speakerAnalyser);

  // 2. Transducer Filter (Bandpass 20Hz - 200Hz, Vibro Body Bass)
  const transducerFilter = audioContext.createBiquadFilter();
  transducerFilter.type = 'bandpass';
  transducerFilter.frequency.value = 100;
  transducerFilter.Q.value = 1.0;
  const transducerAnalyser = audioContext.createAnalyser();
  transducerAnalyser.fftSize = 256;
  sourceNode.connect(transducerFilter);
  transducerFilter.connect(transducerAnalyser);

  // 3. Subwoofer Filter (Lowpass 150Hz)
  const subFilter = audioContext.createBiquadFilter();
  subFilter.type = 'lowpass';
  subFilter.frequency.value = 150;
  const subAnalyser = audioContext.createAnalyser();
  subAnalyser.fftSize = 256;
  sourceNode.connect(subFilter);
  subFilter.connect(subAnalyser);

  return {
    speakerAnalyser,
    transducerAnalyser,
    subAnalyser
  };
}

/**
 * Idempotent URI encoder that safely handles both raw filenames with spaces
 * and already percent-encoded URLs without creating invalid %2520 tokens.
 */
export function safeEncodeURI(url) {
  if (!url) return '';
  try {
    return encodeURI(decodeURI(String(url)));
  } catch (e) {
    return encodeURI(String(url));
  }
}

/**
 * Fetch and decode an AudioBuffer from an S3 or remote URL with streaming progress tracking.
 * Automatically tries direct fetch first, and falls back to backend proxy for CORS resilience.
 * onProgress?: ({ stage: 'downloading'|'decoding'|'ready', pct: number, receivedBytes: number, totalBytes: number, mbText: string }) => void
 */
export async function fetchAudioBufferFromUrl(url, onProgress = null, externalSignal = null) {
  if (!url) return null;
  if (externalSignal?.aborted) throw new Error('Aborted');

  const cleanUrl = url.startsWith('http')
    ? url
    : `https://developerfile-084897310273.s3.ap-southeast-1.amazonaws.com/${String(url).replace(/^\/+/, '')}`;
  const directUrl = safeEncodeURI(cleanUrl);
  const proxyUrl = `${BACKEND_URL}/api/vps/content/s3/proxy-file?url=${encodeURIComponent(directUrl)}`;

  const handleDownloadProgress = (pct, received, total) => {
    if (onProgress && (!externalSignal || !externalSignal.aborted)) {
      const recMB = (received / (1024 * 1024)).toFixed(1);
      const totMB = total > 0 ? (total / (1024 * 1024)).toFixed(1) : null;
      onProgress({
        stage: 'downloading',
        pct,
        receivedBytes: received,
        totalBytes: total,
        mbText: totMB ? `${recMB} / ${totMB} MB` : `${recMB} MB`
      });
    }
  };

  let arrayBuffer;
  const directController = new AbortController();
  if (externalSignal) {
    if (externalSignal.aborted) {
      directController.abort();
      throw new Error('Aborted');
    }
    externalSignal.addEventListener('abort', () => directController.abort(), { once: true });
  }

  // Connection timeout: only abort if initial connection/headers take > 5s
  let directTimeout = setTimeout(() => directController.abort(), 5000);

  try {
    arrayBuffer = await fetchArrayBufferWithProgress(
      directUrl,
      {
        signal: directController.signal,
        onConnected: () => {
          if (directTimeout) {
            clearTimeout(directTimeout);
            directTimeout = null;
          }
        }
      },
      handleDownloadProgress
    );
    if (directTimeout) {
      clearTimeout(directTimeout);
      directTimeout = null;
    }
  } catch (directErr) {
    if (directTimeout) {
      clearTimeout(directTimeout);
      directTimeout = null;
    }
    if (externalSignal?.aborted) {
      throw new Error('Aborted');
    }
    console.warn('Direct fetch failed or timed out, falling back to backend proxy:', directErr.message);
    if (onProgress) {
      onProgress({
        stage: 'downloading',
        pct: 0,
        receivedBytes: 0,
        totalBytes: 0,
        mbText: 'Menghubungkan via Proxy...'
      });
    }
    arrayBuffer = await fetchArrayBufferWithProgress(
      proxyUrl,
      { signal: externalSignal || directController.signal },
      handleDownloadProgress
    );
  }

  if (externalSignal?.aborted) {
    throw new Error('Aborted');
  }

  if (onProgress) {
    const sizeMB = (arrayBuffer.byteLength / (1024 * 1024)).toFixed(1);
    onProgress({
      stage: 'decoding',
      pct: 100,
      receivedBytes: arrayBuffer.byteLength,
      totalBytes: arrayBuffer.byteLength,
      mbText: `${sizeMB} MB (Mendekode...)`
    });
  }

  const ctx = getAudioContext();
  if (ctx.state === 'suspended') {
    await ctx.resume();
  }

  return new Promise((resolve, reject) => {
    ctx.decodeAudioData(
      arrayBuffer.slice(0),
      (buffer) => {
        if (onProgress && (!externalSignal || !externalSignal.aborted)) {
          onProgress({ stage: 'ready', pct: 100, mbText: 'Selesai' });
        }
        resolve(buffer);
      },
      (err) => reject(new Error(err?.message || 'Gagal decode audio stream'))
    );
  });
}
