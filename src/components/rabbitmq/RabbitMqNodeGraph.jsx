import React, { useState, useEffect } from 'react';
import {
  ReactFlow,
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  Panel
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Maximize, Minimize, Search, Download, Upload, RotateCcw, FileJson } from 'lucide-react';
import PublisherNode from './PublisherNode';
import SubscriberNode from './SubscriberNode';
import FullscreenOverlayPanel from './FullscreenOverlayPanel';

const nodeTypes = {
  publisher: PublisherNode,
  subscriber: SubscriberNode,
};

export default function RabbitMqNodeGraph({
  liveStatus,
  serverConfig,
  vpsServers,
  onRestartPm2,
  onRestartDocker,
  onOpenServerDetail
}) {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [activePodIds, setActivePodIds] = useState([]);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [podSearchQuery, setPodSearchQuery] = useState('');
  const [savedPositions, setSavedPositions] = useState({});

  // 1. Load layout from localStorage when serverConfig changes
  useEffect(() => {
    if (!serverConfig?.id) return;
    const storageKey = `rabbitmq_layout_${serverConfig.id}`;
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed) {
          if (Array.isArray(parsed.activePodIds) && parsed.activePodIds.length > 0) {
            setActivePodIds(parsed.activePodIds.map(id => String(id)));
          }
          if (parsed.positions) {
            setSavedPositions(parsed.positions);
          }
        }
      }
    } catch (err) {
      console.error('Failed to load node layout from localStorage:', err);
    }
  }, [serverConfig?.id]);

  // Helper to persist layout to localStorage
  const saveLayoutToLocalStorage = (currentPodIds, currentPositions) => {
    if (!serverConfig?.id) return;
    const storageKey = `rabbitmq_layout_${serverConfig.id}`;
    try {
      const layoutData = {
        version: '1.0',
        serverId: serverConfig.id,
        serverName: serverConfig.name,
        updatedAt: new Date().toISOString(),
        activePodIds: currentPodIds,
        positions: currentPositions
      };
      localStorage.setItem(storageKey, JSON.stringify(layoutData));
    } catch (err) {
      console.error('Failed to save node layout to localStorage:', err);
    }
  };

  // Auto-detect connected Pods from liveStatus
  useEffect(() => {
    if (!liveStatus?.queues || !vpsServers) return;

    const detectedIPs = new Set();
    liveStatus.queues.forEach((q) => {
      if (q.consumers) {
        q.consumers.forEach((c) => {
          if (c.peerHost) detectedIPs.add(c.peerHost);
        });
      }
    });

    // Find matching Pod IDs from vpsServers based on IP
    const podServers = vpsServers.filter(s => s.type === 'pod');
    const detectedPodIds = podServers
      .filter(s => detectedIPs.has(s.host))
      .map(s => String(s.id)); // Ensure ID is stored as string

    // Merge with existing activePodIds (only add new ones)
    setActivePodIds(prev => {
      const newSet = new Set(prev.map(id => String(id)));
      let changed = false;
      detectedPodIds.forEach(id => {
        if (!newSet.has(id)) {
          newSet.add(id);
          changed = true;
        }
      });
      if (changed) {
        const updatedPodIds = Array.from(newSet);
        saveLayoutToLocalStorage(updatedPodIds, savedPositions);
        return updatedPodIds;
      }
      return prev;
    });
  }, [liveStatus, vpsServers]);

  // Generate nodes based on activePodIds and config
  useEffect(() => {
    if (!serverConfig) return;

    const newNodes = [];
    const newEdges = [];

    // 1. Admin/Publisher Node
    const pubSavedPos = savedPositions['publisher-node'] || { x: 50, y: 150 };
    newNodes.push({
      id: 'publisher-node',
      type: 'publisher',
      position: pubSavedPos,
      data: {
        label: `Publisher: ${serverConfig.name}`,
        host: serverConfig.host,
        status: liveStatus?.status === 'online' ? 'online' : 'offline',
        publishRate: liveStatus?.totals?.publishRate?.toFixed(1) || 0,
        totalQueues: liveStatus?.queues?.length || 0,
        vpsList: vpsServers || [],
        onRestartPm2: onRestartPm2,
        onRestartDocker: onRestartDocker,
        onOpenServerDetail: (explicitVpsId) => {
          console.log('[DEBUG NodeGraph Publisher] onOpenServerDetail dipanggil. explicitVpsId:', explicitVpsId);
          let matchingVps = null;
          if (explicitVpsId) {
            matchingVps = (vpsServers || []).find(s => String(s.id) === String(explicitVpsId));
          }
          if (!matchingVps) {
            matchingVps = (vpsServers || []).find(s => s.host === serverConfig.host) || (vpsServers || [])[0];
          }
          console.log('[DEBUG NodeGraph Publisher] Hasil pencarian VPS:', matchingVps);
          if (onOpenServerDetail && matchingVps) {
            onOpenServerDetail(matchingVps);
          } else {
            console.warn('[DEBUG NodeGraph Publisher] Tidak ada server VPS yang dapat dibuka!');
          }
        }
      },
    });

    // 2. Subscriber Nodes
    if (activePodIds.length === 0) {
      newNodes.push({
        id: 'mock-subscriber',
        type: 'subscriber',
        position: { x: 500, y: 150 },
        data: {
          label: 'Belum Ada Subscriber',
          status: 'offline',
          peerHost: 'N/A',
          details: 'Pilih Pod dari panel kanan atas, atau tunggu koneksi otomatis.',
        },
      });

      newEdges.push({
        id: 'edge-pub-sub-mock',
        source: 'publisher-node',
        target: 'mock-subscriber',
        animated: false,
        style: { stroke: '#475569', strokeWidth: 2 },
      });
    } else {
      const podServers = vpsServers ? vpsServers.filter(s => s.type === 'pod') : [];
      let yOffset = 50;

      activePodIds.forEach((podId) => {
        const pod = podServers.find(p => String(p.id) === String(podId));
        if (!pod) return; // Pod deleted or not found

        const subId = `subscriber-${pod.id}`;
        const defaultYPos = yOffset;
        const subSavedPos = savedPositions[subId] || { x: 500, y: defaultYPos };

        // Check if this pod is actually connected right now in liveStatus
        let isConnected = false;
        if (liveStatus?.queues) {
          isConnected = liveStatus.queues.some(q =>
            q.consumers && q.consumers.some(c => c.peerHost === pod.host)
          );
        }

        newNodes.push({
          id: subId,
          type: 'subscriber',
          position: subSavedPos,
          data: {
            label: pod.name,
            peerHost: pod.host,
            status: isConnected ? 'online' : 'offline',
            active: isConnected,
            podId: pod.id,
            onRestartDocker: onRestartDocker,
            onRemoveNode: (id) => setActivePodIds(prev => prev.filter(pid => String(pid) !== String(id))),
            onOpenServerDetail: (explicitPodId) => {
              console.log('[DEBUG NodeGraph Subscriber] onOpenServerDetail dipanggil. explicitPodId:', explicitPodId);
              const target = (vpsServers || []).find(s => String(s.id) === String(explicitPodId || pod.id));
              console.log('[DEBUG NodeGraph Subscriber] Hasil pencarian Pod VPS:', target);
              if (onOpenServerDetail && target) {
                onOpenServerDetail(target);
              } else {
                console.warn('[DEBUG NodeGraph Subscriber] Target Pod VPS tidak ditemukan!');
              }
            }
          },
        });

        // Add edge
        const isDataFlowing = isConnected && (liveStatus?.totals?.publishRate > 0);

        newEdges.push({
          id: `edge-${subId}`,
          source: 'publisher-node',
          target: subId,
          animated: isDataFlowing,
          style: { stroke: isDataFlowing ? '#06b6d4' : '#475569', strokeWidth: 2 },
        });

        yOffset += 280;
      });
    }

    setNodes((nds) => {
      return newNodes.map((newNode) => {
        const existingNode = nds.find((n) => n.id === newNode.id);
        if (existingNode) {
          return { ...existingNode, data: newNode.data };
        }
        return newNode;
      });
    });

    setEdges((eds) => {
      return newEdges.map((newEdge) => {
        const existingEdge = eds.find((e) => e.id === newEdge.id);
        if (existingEdge) {
          return { ...existingEdge, animated: newEdge.animated, style: newEdge.style };
        }
        return newEdge;
      });
    });
  }, [liveStatus, serverConfig, onRestartPm2, onRestartDocker, vpsServers, activePodIds, savedPositions, setNodes, setEdges]);

  // Handle Node Drag End to update savedPositions
  const handleNodeDragStop = (event, node) => {
    setSavedPositions(prev => {
      const updated = {
        ...prev,
        [node.id]: { x: node.position.x, y: node.position.y }
      };
      saveLayoutToLocalStorage(activePodIds, updated);
      return updated;
    });
  };

  // Export JSON Handler
  const handleExportJson = () => {
    if (!serverConfig) return;
    const currentPositions = {};
    nodes.forEach(n => {
      currentPositions[n.id] = { x: n.position.x, y: n.position.y };
    });

    const exportData = {
      version: '1.0',
      serverId: serverConfig.id,
      serverName: serverConfig.name,
      exportedAt: new Date().toISOString(),
      activePodIds,
      positions: currentPositions
    };

    const jsonString = JSON.stringify(exportData, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `rabbitmq-layout-${(serverConfig.name || 'config').toLowerCase().replace(/\s+/g, '-')}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Import JSON Handler
  const handleImportJson = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const imported = JSON.parse(event.target.result);
        if (imported && imported.positions) {
          if (Array.isArray(imported.activePodIds)) {
            const importedPods = imported.activePodIds.map(id => String(id));
            setActivePodIds(importedPods);
            setSavedPositions(imported.positions);
            saveLayoutToLocalStorage(importedPods, imported.positions);
          } else {
            setSavedPositions(imported.positions);
            saveLayoutToLocalStorage(activePodIds, imported.positions);
          }
          // Force apply positions to nodes
          setNodes(prev =>
            prev.map(n => {
              if (imported.positions[n.id]) {
                return { ...n, position: imported.positions[n.id] };
              }
              return n;
            })
          );
        }
      } catch (err) {
        alert('File JSON tidak valid!');
      }
    };
    reader.readAsText(file);
    e.target.value = ''; // Reset input
  };

  // Reset Layout Handler
  const handleResetLayout = () => {
    if (serverConfig?.id) {
      localStorage.removeItem(`rabbitmq_layout_${serverConfig.id}`);
    }
    setSavedPositions({});
    setActivePodIds([]);
  };

  const activePodIdsStr = activePodIds.map(id => String(id));
  const unselectedPods = (vpsServers || []).filter(s => s.type === 'pod' && !activePodIdsStr.includes(String(s.id)));
  const filteredUnselectedPods = unselectedPods.filter(pod =>
    pod.name.toLowerCase().includes(podSearchQuery.toLowerCase()) ||
    pod.host.toLowerCase().includes(podSearchQuery.toLowerCase())
  );

  return (
    <div className={isFullscreen 
      ? "fixed inset-0 z-[100] bg-slate-950 w-screen h-screen flex flex-col" 
      : "relative w-full h-[600px] border border-slate-800 rounded-xl overflow-hidden bg-slate-950/50 resize-y min-h-[400px]"
    }>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeDragStop={handleNodeDragStop}
        nodeTypes={nodeTypes}
        fitView
        className="bg-slate-950"
      >
        <Panel position="top-right" className="bg-slate-900/90 border border-slate-800 rounded-xl p-3 shadow-xl backdrop-blur-md">
          <div className="flex flex-col gap-2 w-56">
            <div className="flex items-center justify-between">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Tambah Pod Subscriber</label>
              {unselectedPods.length > 0 && (
                <span className="text-[9px] font-bold text-cyan-400 font-mono">({unselectedPods.length})</span>
              )}
            </div>

            {/* Search Input */}
            <div className="relative">
              <input
                type="text"
                placeholder="Cari Nama / IP Pod..."
                value={podSearchQuery}
                onChange={(e) => setPodSearchQuery(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1 pl-7 text-xs text-white outline-none focus:border-cyan-500 font-mono"
              />
              <Search size={12} className="absolute left-2.5 top-2 text-slate-500" />
              {podSearchQuery && (
                <button
                  onClick={() => setPodSearchQuery('')}
                  className="absolute right-2 top-1 text-slate-500 hover:text-slate-300 text-xs"
                >
                  ×
                </button>
              )}
            </div>

            {/* Dropdown Select */}
            <select
              className="bg-slate-950 border border-slate-800 rounded-lg px-2 py-1.5 text-xs text-white outline-none focus:border-cyan-500 w-full"
              value=""
              onChange={(e) => {
                if (e.target.value) {
                  const newPodId = e.target.value;
                  setActivePodIds(prev => {
                    const updated = [...prev, newPodId];
                    saveLayoutToLocalStorage(updated, savedPositions);
                    return updated;
                  });
                  setPodSearchQuery('');
                }
              }}
            >
              <option value="" disabled>
                {filteredUnselectedPods.length === 0 
                  ? (unselectedPods.length === 0 ? 'Semua Pod sudah ditambahkan' : '-- Pod Tidak Ditemukan --') 
                  : '-- Pilih Hasil Pencarian --'}
              </option>
              {filteredUnselectedPods.map(pod => (
                <option key={pod.id} value={pod.id}>{pod.name} ({pod.host})</option>
              ))}
            </select>
          </div>
        </Panel>

        {/* Toolbar Top Left: Fullscreen & Layout Actions */}
        <Panel position="top-left" className="m-3 flex items-center gap-2">
          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="bg-slate-900/90 hover:bg-slate-800 border border-slate-700 text-slate-300 p-2.5 rounded-lg shadow-xl backdrop-blur-md transition-colors flex items-center justify-center cursor-pointer pointer-events-auto"
            title={isFullscreen ? "Keluar Fullscreen" : "Masuk Fullscreen"}
          >
            {isFullscreen ? <Minimize size={18} /> : <Maximize size={18} />}
          </button>

          <div className="flex items-center gap-1 bg-slate-900/90 border border-slate-800 rounded-lg p-1 shadow-xl backdrop-blur-md">
            <button
              onClick={handleExportJson}
              className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-cyan-400 border border-cyan-500/30 rounded-md text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer"
              title="Export Layout ke File JSON"
            >
              <Download size={14} />
              <span>Export JSON</span>
            </button>

            <label
              className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-emerald-400 border border-emerald-500/30 rounded-md text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer"
              title="Import Layout dari File JSON"
            >
              <Upload size={14} />
              <span>Import JSON</span>
              <input
                type="file"
                accept=".json"
                onChange={handleImportJson}
                className="hidden"
              />
            </label>

            <button
              onClick={handleResetLayout}
              className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-red-400 rounded-md transition-colors cursor-pointer"
              title="Reset Layout ke Default"
            >
              <RotateCcw size={15} />
            </button>
          </div>
        </Panel>

        <Controls className="!bg-slate-900/90 !border !border-slate-800 !rounded-xl !overflow-hidden !shadow-xl !backdrop-blur-md [&>button]:!bg-slate-900/80 [&>button]:!border-b [&>button]:!border-slate-800/80 [&>button:hover]:!bg-slate-800 [&>button]:!fill-slate-300 [&>button]:!text-slate-300" />
        <MiniMap
          position="bottom-right"
          nodeColor={(node) => {
            if (node.type === 'publisher') return '#f59e0b';
            return '#10b981';
          }}
          nodeStrokeColor={(node) => {
            if (node.type === 'publisher') return '#fbbf24';
            return '#34d399';
          }}
          nodeStrokeWidth={3}
          nodeBorderRadius={6}
          className="!bg-slate-950/90 !border-2 !border-slate-800/90 !rounded-2xl !overflow-hidden !shadow-2xl !backdrop-blur-md"
          maskColor="rgba(2, 6, 23, 0.8)"
        />
        <Background color="#334155" gap={20} size={1} />
      </ReactFlow>

      {/* Floating Bottom Dock Panel outside ReactFlow tree */}
      {isFullscreen && (
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 z-[120] pointer-events-auto">
          <FullscreenOverlayPanel 
            selectedServerId={serverConfig?.id} 
            liveStatus={liveStatus} 
            vpsServers={vpsServers}
            onOpenServerDetail={onOpenServerDetail}
          />
        </div>
      )}
    </div>
  );
}
