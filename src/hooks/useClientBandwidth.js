import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * Custom hook to detect, measure, and monitor client network bandwidth and latency
 */
export function useClientBandwidth() {
  const [networkInfo, setNetworkInfo] = useState({
    downlinkMbps: null,     // Bandwidth in Mbps (e.g. 25.4)
    pingMs: null,           // Round trip latency to backend in ms (e.g. 15)
    effectiveType: '4g',    // '4g', '3g', '2g', 'slow-2g'
    isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
    connectionType: 'broadband', // 'wifi', 'ethernet', 'cellular', 'broadband'
    lastTestedAt: null,
    isTesting: false,
    quality: 'GOOD'         // 'EXCELLENT' | 'GOOD' | 'MODERATE' | 'POOR' | 'OFFLINE'
  });

  const isTestingRef = useRef(false);

  // Helper to determine network quality category
  const calculateQuality = (downlink, ping, isOnline) => {
    if (!isOnline) return 'OFFLINE';
    if (downlink === null && ping === null) return 'GOOD';

    const speed = downlink !== null ? downlink : 10;
    const latency = ping !== null ? ping : 30;

    if (speed >= 25 && latency < 40) return 'EXCELLENT';
    if (speed >= 10 && latency < 90) return 'GOOD';
    if (speed >= 2 && latency < 180) return 'MODERATE';
    return 'POOR';
  };

  // Perform a real active download throughput test against backend /api/speedtest-data
  const runSpeedTest = useCallback(async (customBytes = 350000) => {
    if (isTestingRef.current) return;
    isTestingRef.current = true;

    setNetworkInfo(prev => ({ ...prev, isTesting: true }));

    try {
      const startTime = performance.now();
      const testUrl = `/api/speedtest-data?bytes=${customBytes}&_t=${Date.now()}`;
      
      const response = await fetch(testUrl, {
        cache: 'no-store',
        headers: { 'Cache-Control': 'no-cache', 'Pragma': 'no-cache' }
      });

      if (!response.ok) throw new Error('Speedtest endpoint unavailable');

      const blob = await response.blob();
      const endTime = performance.now();
      const durationSec = Math.max(0.01, (endTime - startTime) / 1000);
      const totalBytes = blob.size || customBytes;

      // Calculate Mbps: (Bytes * 8 bits) / (duration in seconds) / 1,000,000
      const calculatedMbps = parseFloat(((totalBytes * 8) / (durationSec * 1000000)).toFixed(2));
      const calculatedPing = Math.max(1, Math.round(durationSec * 1000 / 3)); // Approximate RTT

      setNetworkInfo(prev => {
        const quality = calculateQuality(calculatedMbps, prev.pingMs || calculatedPing, true);
        return {
          ...prev,
          downlinkMbps: calculatedMbps,
          pingMs: prev.pingMs || calculatedPing,
          isTesting: false,
          isOnline: true,
          lastTestedAt: Date.now(),
          quality
        };
      });
    } catch (err) {
      // Fallback on Network Information API or existing value
      const navConn = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
      const fallbackDownlink = navConn?.downlink ? parseFloat(navConn.downlink.toFixed(2)) : (networkInfo.downlinkMbps || 10);
      
      setNetworkInfo(prev => ({
        ...prev,
        downlinkMbps: fallbackDownlink,
        isTesting: false,
        lastTestedAt: Date.now(),
        quality: calculateQuality(fallbackDownlink, prev.pingMs, prev.isOnline)
      }));
    } finally {
      isTestingRef.current = false;
    }
  }, [networkInfo.downlinkMbps]);

  // Lightweight Ping Probe to measure backend round-trip time
  const pingBackend = useCallback(async () => {
    if (isTestingRef.current) return;

    try {
      const t0 = performance.now();
      const res = await fetch(`/api/health?_t=${Date.now()}`, {
        method: 'GET',
        cache: 'no-store'
      });
      const t1 = performance.now();
      
      if (res.ok) {
        const latency = Math.max(1, Math.round(t1 - t0));
        setNetworkInfo(prev => {
          const quality = calculateQuality(prev.downlinkMbps, latency, true);
          return {
            ...prev,
            pingMs: latency,
            isOnline: true,
            quality
          };
        });
      }
    } catch (_) {
      setNetworkInfo(prev => ({
        ...prev,
        isOnline: navigator.onLine,
        quality: !navigator.onLine ? 'OFFLINE' : 'POOR'
      }));
    }
  }, []);

  // Initialize Network Information API & Event Listeners
  useEffect(() => {
    const updateFromNavConnection = () => {
      const navConn = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
      const isOnline = navigator.onLine;

      if (navConn) {
        const downlink = navConn.downlink ? parseFloat(navConn.downlink.toFixed(2)) : null;
        const rtt = navConn.rtt ? parseInt(navConn.rtt, 10) : null;
        const effectiveType = navConn.effectiveType || '4g';
        const type = navConn.type || (effectiveType === '4g' ? 'wifi' : 'cellular');

        setNetworkInfo(prev => ({
          ...prev,
          downlinkMbps: prev.downlinkMbps !== null ? prev.downlinkMbps : downlink,
          pingMs: prev.pingMs !== null ? prev.pingMs : rtt,
          effectiveType,
          connectionType: type,
          isOnline,
          quality: calculateQuality(prev.downlinkMbps || downlink, prev.pingMs || rtt, isOnline)
        }));
      } else {
        setNetworkInfo(prev => ({
          ...prev,
          isOnline,
          quality: calculateQuality(prev.downlinkMbps, prev.pingMs, isOnline)
        }));
      }
    };

    updateFromNavConnection();

    // Browser Online/Offline Handlers
    const handleOnline = () => {
      setNetworkInfo(prev => ({ ...prev, isOnline: true, quality: calculateQuality(prev.downlinkMbps, prev.pingMs, true) }));
      pingBackend();
    };

    const handleOffline = () => {
      setNetworkInfo(prev => ({ ...prev, isOnline: false, quality: 'OFFLINE' }));
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Network Information API change listener
    const navConn = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    if (navConn && navConn.addEventListener) {
      navConn.addEventListener('change', updateFromNavConnection);
    }

    // Lightweight initial ping probe on startup (full speedtest is user-triggered only)
    const timer = setTimeout(() => {
      pingBackend();
    }, 1500);

    // Periodic ping probe every 15 seconds
    const pingInterval = setInterval(pingBackend, 15000);

    return () => {
      clearTimeout(timer);
      clearInterval(pingInterval);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      if (navConn && navConn.removeEventListener) {
        navConn.removeEventListener('change', updateFromNavConnection);
      }
    };
  }, [pingBackend, runSpeedTest]);

  return {
    ...networkInfo,
    runSpeedTest,
    pingBackend
  };
}
