import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  Maximize2,
  Globe,
  Radio,
  Copy,
  Check
} from 'lucide-react';

export default function PodGeoMap({
  servers = [],
  selectedPodId = null,
  onSelectPod = null
}) {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersLayerRef = useRef(null);
  const markersMapRef = useRef(new Map()); // Map<serverIdStr, LeafletMarker>
  const serverDisplayCoordsRef = useRef(new Map()); // Map<serverIdStr, {lat, lng}>
  const hasInitialFitRef = useRef(false);
  const lastFlownPodIdRef = useRef(null);
  const [copiedMac, setCopiedMac] = useState(null);
  const [filterOnlineOnly, setFilterOnlineOnly] = useState(false);

  // Filter servers with valid latitude and longitude
  const locatedPods = servers.filter(s => {
    if (!s.latitude || !s.longitude) return false;
    const lat = parseFloat(s.latitude);
    const lng = parseFloat(s.longitude);
    if (isNaN(lat) || isNaN(lng)) return false;
    const isOnline = s.currentMetrics?.status === 'online' || s.status === 'online';
    if (filterOnlineOnly && !isOnline) return false;
    return true;
  });

  const handleCopyMac = (mac) => {
    if (!mac) return;
    navigator.clipboard.writeText(mac);
    setCopiedMac(mac);
    setTimeout(() => setCopiedMac(null), 2000);
  };

  // Initialize Leaflet Map Instance (Runs ONCE on Mount)
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      // Create map centered around Indonesia / Global default
      const map = L.map(mapContainerRef.current, {
        center: [-2.5489, 118.0149],
        zoom: 4,
        minZoom: 2,
        maxZoom: 18,
        zoomControl: false,
        attributionControl: false
      });

      // Add Dark Matter Tile Layer (CartoDB)
      L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        subdomains: 'abcd',
        maxZoom: 19
      }).addTo(map);

      // Add Zoom Control to bottom-right
      L.control.zoom({ position: 'bottomright' }).addTo(map);

      // Group layer for markers
      const markersLayer = L.layerGroup().addTo(map);
      markersLayerRef.current = markersLayer;
      mapInstanceRef.current = map;

      // Invalidate size after layout rendering
      setTimeout(() => map.invalidateSize(), 100);
      setTimeout(() => map.invalidateSize(), 400);
    }

    // Set up ResizeObserver to auto-adjust map canvas on container dimension changes
    let resizeObserver = null;
    if (window.ResizeObserver && mapContainerRef.current) {
      resizeObserver = new ResizeObserver(() => {
        if (mapInstanceRef.current) {
          mapInstanceRef.current.invalidateSize();
        }
      });
      resizeObserver.observe(mapContainerRef.current);
    }

    return () => {
      if (resizeObserver) {
        resizeObserver.disconnect();
      }
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
        hasInitialFitRef.current = false;
        lastFlownPodIdRef.current = null;
        markersMapRef.current.clear();
      }
    };
  }, []);

  // Update Markers IN-PLACE whenever locatedPods changes
  useEffect(() => {
    const map = mapInstanceRef.current;
    const markersLayer = markersLayerRef.current;
    if (!map || !markersLayer) return;

    // Detect coordinate overlap and compute subtle micro-offsets so identical pins don't cover each other
    const coordGroups = new Map();
    locatedPods.forEach(server => {
      const rawLat = parseFloat(server.latitude);
      const rawLng = parseFloat(server.longitude);
      const key = `${rawLat.toFixed(4)},${rawLng.toFixed(4)}`;
      if (!coordGroups.has(key)) {
        coordGroups.set(key, []);
      }
      coordGroups.get(key).push(server);
    });

    const displayCoords = new Map();
    coordGroups.forEach((group) => {
      if (group.length === 1) {
        const s = group[0];
        displayCoords.set(String(s.id), {
          lat: parseFloat(s.latitude),
          lng: parseFloat(s.longitude)
        });
      } else {
        // Offset multiple PODs at identical coordinates (~35m micro-displacement)
        const count = group.length;
        const radius = 0.00035;
        group.forEach((s, idx) => {
          const origLat = parseFloat(s.latitude);
          const origLng = parseFloat(s.longitude);
          const angle = (2 * Math.PI * idx) / count + Math.PI / 4;
          const offsetLat = radius * Math.cos(angle);
          const cosLat = Math.cos((origLat * Math.PI) / 180) || 1;
          const offsetLng = (radius * Math.sin(angle)) / cosLat;

          displayCoords.set(String(s.id), {
            lat: origLat + offsetLat,
            lng: origLng + offsetLng,
            origLat,
            origLng
          });
        });
      }
    });

    serverDisplayCoordsRef.current = displayCoords;

    const currentServerIds = new Set();
    const latLngBounds = [];

    locatedPods.forEach(server => {
      const serverIdStr = String(server.id);
      currentServerIds.add(serverIdStr);

      const origLat = parseFloat(server.latitude);
      const origLng = parseFloat(server.longitude);
      const coords = displayCoords.get(serverIdStr) || { lat: origLat, lng: origLng };
      const lat = coords.lat;
      const lng = coords.lng;

      const isOnline = server.currentMetrics?.status === 'online' || server.status === 'online';

      // Prefer number in server name (e.g. "POD 23" -> "23", "POD 33" -> "33")
      const numberFromName = server.name ? server.name.replace(/[^0-9]/g, '') : '';
      const podCode = numberFromName
        || server.code
        || (server.name ? server.name.replace(/^POD\s*/i, '').substring(0, 3).toUpperCase() : '')
        || String(server.id);

      const isSelected = selectedPodId && (String(selectedPodId) === String(server.id) || String(selectedPodId) === String(server.code));

      latLngBounds.push([lat, lng]);

      // Custom Neon Pulse Marker HTML - Pixel-perfect centered at exact GPS coordinates
      const markerHtml = `
        <div class="relative w-8 h-8 flex items-center justify-center cursor-pointer group">
          ${isSelected ? `
            <span class="absolute w-9 h-9 rounded-2xl bg-amber-400/40 animate-ping"></span>
            <span class="absolute w-8 h-8 rounded-xl bg-amber-500/50"></span>
          ` : isOnline ? `
            <span class="absolute w-8 h-8 rounded-full bg-emerald-400/35 animate-ping"></span>
            <span class="absolute w-6 h-6 rounded-full bg-emerald-500/40"></span>
          ` : `
            <span class="absolute w-7 h-7 rounded-xl bg-rose-500/25 border border-rose-500/40"></span>
          `}
          <div class="relative z-10 flex items-center justify-center min-w-[28px] h-7 px-1 rounded-xl shadow-2xl border text-[11px] font-black transition-transform duration-200 group-hover:scale-125 ${isSelected
          ? 'bg-gradient-to-br from-amber-400 to-orange-500 text-slate-950 border-amber-200 ring-4 ring-amber-400/40 shadow-amber-500/50'
          : isOnline
            ? 'bg-gradient-to-br from-emerald-400 to-cyan-500 text-slate-950 border-emerald-200 shadow-emerald-500/40'
            : 'bg-gradient-to-br from-slate-900 to-rose-950 text-rose-300 border-rose-500/80 shadow-rose-950/70 ring-1 ring-rose-500/40'
        }">
            <span class="truncate max-w-[42px] text-center">${podCode}</span>
          </div>
        </div>
      `;

      const customIcon = L.divIcon({
        className: 'custom-geo-marker',
        html: markerHtml,
        iconSize: [32, 32],
        iconAnchor: [16, 16],
        popupAnchor: [0, -18]
      });

      const cpuUsage = server.currentMetrics?.cpu_usage !== undefined ? server.currentMetrics.cpu_usage : 0;
      const ramUsage = server.currentMetrics?.ram_usage !== undefined ? server.currentMetrics.ram_usage : 0;

      // Clean header without duplication
      const displayName = server.name || 'Server Node';
      const showCodeBadge = server.code && !displayName.toLowerCase().includes(String(server.code).toLowerCase());

      // Interactive Popup with Modern Dark Glassmorphism Styling
      const popupContent = `
        <div style="font-family: inherit;" class="p-1 min-w-[250px] text-slate-200">
          <div class="flex items-center justify-between gap-2 pb-2 border-b border-cyan-500/20 mb-2.5">
            <div class="flex items-center gap-2">
              ${showCodeBadge ? `
                <span class="px-2 py-0.5 rounded-md bg-cyan-500/20 text-cyan-400 text-[11px] font-extrabold border border-cyan-500/30">
                  POD ${server.code}
                </span>
              ` : ''}
              <span class="text-xs font-black text-white">${displayName}</span>
              ${server.pod_version ? `
                <span class="px-1.5 py-0.5 rounded text-[10px] font-extrabold bg-purple-500/20 text-purple-300 border border-purple-500/30">
                  ${server.pod_version.toUpperCase()}
                </span>
              ` : ''}
            </div>
            <span class="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${isOnline ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40' : 'bg-rose-500/20 text-rose-400 border border-rose-500/40'
        }">
              <span class="w-1.5 h-1.5 rounded-full ${isOnline ? 'bg-emerald-400 animate-pulse' : 'bg-rose-400'}"></span>
              ${isOnline ? 'ONLINE' : 'OFFLINE'}
            </span>
          </div>

          <div class="flex flex-col gap-1.5 text-[11px]">
            <div class="flex items-center justify-between text-slate-400">
              <span>Host IP:</span>
              <span class="font-mono text-slate-200 font-bold">${server.host || '-'}</span>
            </div>

            <div class="flex items-center justify-between text-slate-400">
              <span>MAC Address:</span>
              <span class="font-mono text-cyan-300 font-bold tracking-wider">${server.mac_address || 'N/A'}</span>
            </div>

            ${isOnline ? `
              <div class="flex items-center justify-between text-slate-400">
                <span>CPU Load:</span>
                <span class="font-mono text-slate-200 font-semibold">${cpuUsage}%</span>
              </div>
              <div class="flex items-center justify-between text-slate-400">
                <span>RAM Usage:</span>
                <span class="font-mono text-slate-200 font-semibold">${ramUsage}%</span>
              </div>
            ` : ''}

            <div class="flex items-center justify-between text-slate-400">
              <span>Koordinat GPS:</span>
              <span class="font-mono text-slate-300">${origLat.toFixed(4)}, ${origLng.toFixed(4)}</span>
            </div>
          </div>
        </div>
      `;

      // Check if marker already exists for this server ID -> Update in-place
      let marker = markersMapRef.current.get(serverIdStr);
      if (marker) {
        marker.setLatLng([lat, lng]);
        marker.setIcon(customIcon);
        marker.setPopupContent(popupContent);
      } else {
        // Create new marker
        marker = L.marker([lat, lng], { icon: customIcon }).addTo(markersLayer);
        marker.bindPopup(popupContent, {
          className: 'custom-dark-popup',
          maxWidth: 290
        });

        marker.on('click', () => {
          lastFlownPodIdRef.current = serverIdStr;
          if (onSelectPod) onSelectPod(server);
        });

        markersMapRef.current.set(serverIdStr, marker);
      }
    });

    // Remove only markers whose server ID is no longer in locatedPods
    for (const [id, marker] of markersMapRef.current.entries()) {
      if (!currentServerIds.has(id)) {
        markersLayer.removeLayer(marker);
        markersMapRef.current.delete(id);
      }
    }

    // Auto fit bounds ONCE when data first arrives
    if (!hasInitialFitRef.current && latLngBounds.length > 0) {
      if (latLngBounds.length === 1) {
        map.setView(latLngBounds[0], 10);
      } else {
        map.fitBounds(latLngBounds, { padding: [50, 50], maxZoom: 12 });
      }
      hasInitialFitRef.current = true;
    }
  }, [locatedPods]);

  // Smoothly Fly to and Open Popup ONLY when selectedPodId changes to a NEW ID
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !selectedPodId) return;

    const currentSelectedStr = String(selectedPodId);
    if (lastFlownPodIdRef.current === currentSelectedStr) {
      return;
    }
    lastFlownPodIdRef.current = currentSelectedStr;

    const targetServer = locatedPods.find(s => String(s.id) === currentSelectedStr || String(s.code) === currentSelectedStr);
    if (targetServer) {
      const serverIdStr = String(targetServer.id);
      const coords = serverDisplayCoordsRef.current?.get(serverIdStr) || {
        lat: parseFloat(targetServer.latitude),
        lng: parseFloat(targetServer.longitude)
      };

      map.flyTo([coords.lat, coords.lng], 13, {
        duration: 1.2,
        easeLinearity: 0.25
      });

      const marker = markersMapRef.current.get(serverIdStr);
      if (marker) {
        setTimeout(() => {
          marker.openPopup();
        }, 600);
      }
    }
  }, [selectedPodId]);

  const handleResetView = () => {
    const map = mapInstanceRef.current;
    if (!map) return;
    lastFlownPodIdRef.current = null;
    if (locatedPods.length > 0) {
      const bounds = Array.from(serverDisplayCoordsRef.current?.values() || []).map(p => [p.lat, p.lng]);
      map.fitBounds(bounds.length > 0 ? bounds : locatedPods.map(p => [parseFloat(p.latitude), parseFloat(p.longitude)]), { padding: [50, 50], maxZoom: 10 });
    } else {
      map.setView([-2.5489, 118.0149], 4);
    }
  };

  return (
    <div className="relative rounded-3xl overflow-hidden border border-cyan-500/25 bg-slate-950 shadow-2xl">
      {/* Map Header Toolbar */}
      <div className="absolute top-4 left-4 right-4 z-[400] flex items-center justify-between gap-3 pointer-events-none">
        {/* Title Badge */}
        <div className="pointer-events-auto flex items-center gap-2.5 px-3.5 py-2 rounded-2xl bg-slate-900/90 border border-cyan-500/30 backdrop-blur-xl shadow-xl">
          <div className="p-1.5 rounded-lg bg-cyan-500/20 text-cyan-400">
            <Globe size={16} />
          </div>
          <div>
            <div className="text-xs font-black text-white flex items-center gap-1.5">
              <span>Peta Geografis POD Aktif & Offline</span>
              <span className="px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 text-[10px] font-bold border border-cyan-500/30">
                {locatedPods.length} Terpetakan
              </span>
            </div>
            <div className="text-[10px] text-slate-400">Lokasi GPS & status pemantauan live</div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="pointer-events-auto flex items-center gap-2">
          {/* Online Only Filter Toggle */}
          <button
            onClick={() => setFilterOnlineOnly(!filterOnlineOnly)}
            className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer backdrop-blur-xl border shadow-lg ${filterOnlineOnly
              ? 'bg-emerald-500/25 text-emerald-300 border-emerald-500/40'
              : 'bg-slate-900/90 text-slate-300 border-slate-800 hover:text-white hover:bg-slate-800'
              }`}
            title="Filter POD yang sedang aktif online saja"
          >
            <Radio size={14} className={filterOnlineOnly ? 'text-emerald-400 animate-pulse' : 'text-slate-400'} />
            <span>{filterOnlineOnly ? 'Online Saja' : 'Semua Lokasi'}</span>
          </button>

          {/* Reset View Button */}
          <button
            onClick={handleResetView}
            className="p-2 rounded-xl bg-slate-900/90 hover:bg-slate-800 text-cyan-400 border border-cyan-500/30 backdrop-blur-xl transition-all cursor-pointer shadow-lg"
            title="Reset Zoom & Pusatkan Peta"
          >
            <Maximize2 size={16} />
          </button>
        </div>
      </div>

      {/* Map Canvas Container */}
      <div
        ref={mapContainerRef}
        className="w-full h-[420px] sm:h-[480px] lg:h-[520px] z-0"
      />

      {/* Custom Styles for Leaflet Dark Popup & Markers */}
      <style>{`
        .leaflet-div-icon,
        .custom-geo-marker {
          background: transparent !important;
          border: none !important;
          box-shadow: none !important;
        }
        .custom-dark-popup .leaflet-popup-content-wrapper {
          background: rgba(15, 23, 42, 0.94) !important;
          backdrop-filter: blur(16px) !important;
          border: 1px solid rgba(6, 182, 212, 0.35) !important;
          border-radius: 16px !important;
          box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.7), 0 8px 10px -6px rgba(0, 0, 0, 0.6) !important;
          padding: 8px !important;
        }
        .custom-dark-popup .leaflet-popup-tip {
          background: rgba(15, 23, 42, 0.94) !important;
          border-top: 1px solid rgba(6, 182, 212, 0.35) !important;
          border-left: 1px solid rgba(6, 182, 212, 0.35) !important;
        }
        .custom-dark-popup .leaflet-popup-close-button {
          color: #94a3b8 !important;
          padding: 6px !important;
        }
        .custom-dark-popup .leaflet-popup-close-button:hover {
          color: #22d3ee !important;
        }
      `}</style>
    </div>
  );
}
