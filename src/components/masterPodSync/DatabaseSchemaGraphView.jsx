import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import {
  ReactFlow,
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  MarkerType
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import {
  Maximize2,
  Minimize2,
  Search,
  Filter,
  RotateCcw,
  Sparkles,
  GitFork,
  Link,
  ShieldCheck,
  Eye,
  Layers,
  Wand2,
  X,
  ArrowDown
} from 'lucide-react';
import TableSchemaNode from './TableSchemaNode';

const nodeTypes = {
  tableSchema: TableSchemaNode
};

export default function DatabaseSchemaGraphView({
  tables = [],
  masterInfo,
  onSelectTableForDetail
}) {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const [selectedClusterIndex, setSelectedClusterIndex] = useState(() => {
    try {
      return localStorage.getItem(`masterPodSync_selectedClusterIndex_${masterInfo?.id || 'default'}`) || 'all';
    } catch (e) {
      return 'all';
    }
  });

  const [selectedFocusTable, setSelectedFocusTable] = useState(() => {
    try {
      return localStorage.getItem(`masterPodSync_selectedFocusTable_${masterInfo?.id || 'default'}`) || 'all';
    } catch (e) {
      return 'all';
    }
  });

  const handleSetFocusTable = useCallback((tableName) => {
    setSelectedFocusTable(tableName);
    try {
      localStorage.setItem(`masterPodSync_selectedFocusTable_${masterInfo?.id || 'default'}`, tableName);
      if (tableName !== 'all') {
        setSelectedClusterIndex('all');
        localStorage.setItem(`masterPodSync_selectedClusterIndex_${masterInfo?.id || 'default'}`, 'all');
      }
    } catch (e) { }
  }, [masterInfo?.id]);

  const handleSetClusterIndex = useCallback((clusterIdx) => {
    setSelectedClusterIndex(clusterIdx);
    try {
      localStorage.setItem(`masterPodSync_selectedClusterIndex_${masterInfo?.id || 'default'}`, String(clusterIdx));
      if (clusterIdx !== 'all') {
        setSelectedFocusTable('all');
        localStorage.setItem(`masterPodSync_selectedFocusTable_${masterInfo?.id || 'default'}`, 'all');
      }
    } catch (e) { }
  }, [masterInfo?.id]);

  // Helper to load persisted positions from localStorage
  const getStoredPositions = useCallback(() => {
    try {
      const saved = localStorage.getItem(`masterPodSync_schemaGraphPositions_${masterInfo?.id || 'default'}`);
      return saved ? JSON.parse(saved) : {};
    } catch (e) {
      return {};
    }
  }, [masterInfo?.id]);

  // Store user-dragged custom positions so nodes NEVER reset unexpectedly across navigation & reloads
  const savedPositionsRef = useRef(getStoredPositions());

  // Reload saved positions, focus table & cluster whenever master DB changes
  useEffect(() => {
    savedPositionsRef.current = getStoredPositions();
    try {
      const savedFocus = localStorage.getItem(`masterPodSync_selectedFocusTable_${masterInfo?.id || 'default'}`) || 'all';
      setSelectedFocusTable(savedFocus);
      const savedCluster = localStorage.getItem(`masterPodSync_selectedClusterIndex_${masterInfo?.id || 'default'}`) || 'all';
      setSelectedClusterIndex(savedCluster);
    } catch (e) { }
  }, [masterInfo?.id, getStoredPositions]);

  const reactFlowInstanceRef = useRef(null);
  const graphContainerRef = useRef(null);

  // Native Browser Fullscreen Toggle
  const toggleBrowserFullscreen = useCallback(() => {
    const elem = graphContainerRef.current;
    if (!elem) return;

    if (!document.fullscreenElement && !document.webkitFullscreenElement) {
      if (elem.requestFullscreen) {
        elem.requestFullscreen().catch(() => { });
      } else if (elem.webkitRequestFullscreen) {
        elem.webkitRequestFullscreen();
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(() => { });
      } else if (document.webkitExitFullscreen) {
        document.webkitExitFullscreen();
      }
    }
  }, []);

  // Listen for native fullscreen change events
  useEffect(() => {
    const handleFullscreenChange = () => {
      const isFs = Boolean(document.fullscreenElement || document.webkitFullscreenElement);
      setIsFullscreen(isFs);
      setTimeout(() => {
        if (reactFlowInstanceRef.current) {
          reactFlowInstanceRef.current.fitView({ duration: 400, padding: 0.1 });
        }
      }, 150);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
    };
  }, []);

  // 1. Compute Connected Relation Clusters (Sub-graphs) using BFS
  const relationClusters = useMemo(() => {
    if (!tables || tables.length === 0) return [];

    const tableMap = new Map(tables.map(t => [t.tableName, t]));
    const visited = new Set();
    const clusters = [];

    // Adjacency graph
    const adj = new Map();
    tables.forEach(t => {
      if (!adj.has(t.tableName)) adj.set(t.tableName, new Set());
      (t.parents || []).forEach(p => {
        if (!adj.has(p.foreignTableName)) adj.set(p.foreignTableName, new Set());
        adj.get(t.tableName).add(p.foreignTableName);
        adj.get(p.foreignTableName).add(t.tableName);
      });
    });

    tables.forEach(t => {
      const isConnected = (t.parents || []).length > 0 || (t.children || []).length > 0;
      if (!isConnected || visited.has(t.tableName)) return;

      // BFS to find all members of this cluster
      const clusterMembers = [];
      const queue = [t.tableName];
      visited.add(t.tableName);

      while (queue.length > 0) {
        const curr = queue.shift();
        const currTableObj = tableMap.get(curr);
        if (currTableObj) clusterMembers.push(currTableObj);

        const neighbors = adj.get(curr) || new Set();
        neighbors.forEach(neighbor => {
          if (!visited.has(neighbor)) {
            visited.add(neighbor);
            queue.push(neighbor);
          }
        });
      }

      if (clusterMembers.length > 0) {
        // Pick primary table name as cluster title (root parent with most children)
        const primaryTable = clusterMembers.reduce((best, cur) =>
          ((cur.children || []).length > (best.children || []).length ? cur : best),
          clusterMembers[0]
        );
        clusters.push({
          id: clusters.length,
          name: primaryTable.tableName,
          count: clusterMembers.length,
          tables: clusterMembers
        });
      }
    });

    return clusters.sort((a, b) => b.count - a.count);
  }, [tables]);

  // 2. Build Top-to-Bottom Layered Layout & Edges
  // Layer 0 (Top): Root Parents (Induk Utama, has children, no parents)
  // Layer 1 (Middle): Intermediates (Perantara, has both parents & children)
  // Layer 2 (Bottom): Leaf Children (Anak, has parents, no children)
  const buildGraphElements = useCallback((forceResetPositions = false) => {
    if (!tables || tables.length === 0) {
      return { initialNodes: [], initialEdges: [] };
    }

    if (forceResetPositions) {
      savedPositionsRef.current = {};
      try {
        localStorage.removeItem(`masterPodSync_schemaGraphPositions_${masterInfo?.id || 'default'}`);
      } catch (e) { }
    }

    // Determine active tables based on Cluster / Focus / Search
    let activeTables = [];

    if (selectedFocusTable !== 'all') {
      // Focus on 1 table and its direct parents and children
      const target = tables.find(t => t.tableName === selectedFocusTable);
      if (target) {
        const parentNames = (target.parents || []).map(p => p.foreignTableName);
        const childNames = (target.children || []).map(c => c.tableName);
        const relatedNames = new Set([selectedFocusTable, ...parentNames, ...childNames]);
        activeTables = tables.filter(t => relatedNames.has(t.tableName));
      }
    } else if (selectedClusterIndex !== 'all') {
      const selectedCluster = relationClusters.find(c => String(c.id) === String(selectedClusterIndex));
      activeTables = selectedCluster ? selectedCluster.tables : [];
    } else {
      // Default: Show all connected tables
      activeTables = tables.filter(t => (t.parents || []).length > 0 || (t.children || []).length > 0);
    }

    // Search query filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      activeTables = activeTables.filter(t =>
        t.tableName.toLowerCase().includes(q) ||
        (t.parents || []).some(p => p.foreignTableName.toLowerCase().includes(q)) ||
        (t.children || []).some(c => c.tableName.toLowerCase().includes(q))
      );
    }

    // Classify into Top-to-Bottom Rows:
    // row0: Top (Root Parents)
    // row1: Middle (Intermediates)
    // row2: Bottom (Leaf Children)
    const row0 = [];
    const row1 = [];
    const row2 = [];

    activeTables.forEach(t => {
      const hasParents = (t.parents || []).length > 0;
      const hasChildren = (t.children || []).length > 0;
      if (!hasParents && hasChildren) row0.push(t);
      else if (hasParents && hasChildren) row1.push(t);
      else row2.push(t);
    });

    const NODE_WIDTH = 340;
    const NODE_HEIGHT = 140;
    const HORIZONTAL_GAP = 60;
    const VERTICAL_GAP = 130; // Generous height for downward arrows

    const newNodes = [];
    const newEdges = [];

    const placeRow = (rowTables, rowIndex) => {
      rowTables.forEach((tbl, colIndex) => {
        const autoX = colIndex * (NODE_WIDTH + HORIZONTAL_GAP) + 60;
        const autoY = rowIndex * (NODE_HEIGHT + VERTICAL_GAP) + 60;

        // Use saved user position if available, otherwise auto position
        const savedPos = savedPositionsRef.current[tbl.tableName];
        const position = savedPos ? savedPos : { x: autoX, y: autoY };

        const isSelectedTarget = selectedFocusTable === tbl.tableName;

        newNodes.push({
          id: tbl.tableName,
          type: 'tableSchema',
          position,
          selected: isSelectedTarget,
          data: {
            tableName: tbl.tableName,
            rowCount: tbl.rowCount,
            columnCount: tbl.columnCount,
            parents: tbl.parents || [],
            children: tbl.children || [],
            relationType: tbl.relationType,
            isSelected: isSelectedTarget,
            onSelectTable: (targetTableName) => {
              handleSetFocusTable(targetTableName);
              if (onSelectTableForDetail) {
                onSelectTableForDetail(targetTableName);
              }
            }
          }
        });
      });
    };

    placeRow(row0, 0); // Row 0: Top (Induk Paling Atas)
    placeRow(row1, 1); // Row 1: Middle (Perantara)
    placeRow(row2, 2); // Row 2: Bottom (Anak Paling Bawah)

    // Build Downward Connecting Edges (From Top Parent ➔ To Bottom Child)
    const activeTableSet = new Set(activeTables.map(t => t.tableName));

    activeTables.forEach(tbl => {
      (tbl.parents || []).forEach((p, idx) => {
        const sourceTable = p.foreignTableName; // Parent (Top)
        const targetTable = tbl.tableName;       // Child (Bottom)

        if (activeTableSet.has(sourceTable) && activeTableSet.has(targetTable)) {
          const edgeId = `edge_${sourceTable}_to_${targetTable}_${p.columnName}_${idx}`;
          const isHighlighted = selectedFocusTable !== 'all' && (selectedFocusTable === sourceTable || selectedFocusTable === targetTable);

          newEdges.push({
            id: edgeId,
            source: sourceTable,
            target: targetTable,
            type: 'smoothstep',
            animated: isHighlighted || selectedFocusTable === 'all',
            label: `1:N (${p.columnName})`,
            style: {
              stroke: isHighlighted ? '#38bdf8' : '#818cf8',
              strokeWidth: isHighlighted ? 2.5 : 1.6,
              opacity: 0.8
            },
            labelStyle: {
              fill: isHighlighted ? '#38bdf8' : '#cbd5e1',
              fontSize: 10,
              fontFamily: 'monospace',
              fontWeight: 700
            },
            labelBgStyle: {
              fill: '#090d16',
              fillOpacity: 0.95,
              rx: 4,
              ry: 4
            },
            markerEnd: {
              type: MarkerType.ArrowClosed,
              width: 15,
              height: 15,
              color: isHighlighted ? '#38bdf8' : '#818cf8'
            }
          });
        }
      });
    });

    return { initialNodes: newNodes, initialEdges: newEdges };
  }, [tables, relationClusters, selectedClusterIndex, selectedFocusTable, searchQuery, onSelectTableForDetail]);

  // Sync Graph Elements only when data or primary filters change
  useEffect(() => {
    const { initialNodes, initialEdges } = buildGraphElements(false);
    setNodes(initialNodes);
    setEdges(initialEdges);
  }, [buildGraphElements, setNodes, setEdges]);

  // Handle Fullscreen transitions & auto-fit view
  useEffect(() => {
    const timer = setTimeout(() => {
      if (reactFlowInstanceRef.current) {
        reactFlowInstanceRef.current.fitView({ duration: 400, padding: 0.12 });
      }
    }, 100);
    return () => clearTimeout(timer);
  }, [isFullscreen, selectedClusterIndex, selectedFocusTable]);

  // Capture Dragged Positions so they NEVER reset across navigation & reloads
  const handleNodeDragStop = useCallback((event, node) => {
    savedPositionsRef.current[node.id] = { x: node.position.x, y: node.position.y };
    try {
      localStorage.setItem(
        `masterPodSync_schemaGraphPositions_${masterInfo?.id || 'default'}`,
        JSON.stringify(savedPositionsRef.current)
      );
    } catch (e) { }
  }, [masterInfo?.id]);

  // Button to reset / auto-align layout
  const handleAutoAlign = () => {
    savedPositionsRef.current = {};
    try {
      localStorage.removeItem(`masterPodSync_schemaGraphPositions_${masterInfo?.id || 'default'}`);
    } catch (e) { }
    const { initialNodes, initialEdges } = buildGraphElements(true);
    setNodes(initialNodes);
    setEdges(initialEdges);
    setTimeout(() => {
      reactFlowInstanceRef.current?.fitView({ duration: 400, padding: 0.12 });
    }, 50);
  };

  const allConnectedTableNames = useMemo(() => {
    return tables
      .filter(t => (t.parents || []).length > 0 || (t.children || []).length > 0)
      .map(t => t.tableName)
      .sort();
  }, [tables]);

  return (
    <div
      ref={graphContainerRef}
      className={`relative flex flex-col bg-slate-950 shadow-2xl backdrop-blur-xl overflow-hidden transition-all duration-300 ${isFullscreen
          ? 'fixed inset-0 z-[99999] w-screen h-screen rounded-none border-none'
          : 'h-[80vh] min-h-[720px] w-full rounded-3xl border border-cyan-500/40'
        }`}
    >
      {/* Top Controls Toolbar */}
      <div className="bg-slate-900/95 border-b border-slate-800 px-5 py-3.5 flex flex-wrap items-center justify-between gap-3 z-10 shrink-0">
        <div className="flex items-center gap-3 flex-wrap">
          {isFullscreen && (
            <button
              onClick={toggleBrowserFullscreen}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Keluar dari Layar Penuh"
            >
              <X size={15} />
              <span>Keluar Layar Penuh</span>
            </button>
          )}

          <div className="flex items-center gap-2.5">
            <span className="p-2 rounded-xl bg-cyan-500/15 text-cyan-400 border border-cyan-500/30">
              <GitFork size={16} />
            </span>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-sm font-black text-white flex items-center gap-2">
                  <span>Diagram Alur Skema Relasi (Top-to-Bottom ER Flow)</span>
                </h3>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
                  {masterInfo?.name || 'Master DB'}: {nodes.length} Tabel &bull; {edges.length} Relasi Garis
                </span>
                {isFullscreen && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                    Mode Layar Penuh (ESC untuk keluar)
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Alur relasi berjenjang: <strong className="text-emerald-300">Tabel Induk (Atas)</strong> ⬇️ ke <strong className="text-purple-300">Tabel Anak (Bawah)</strong>.
              </p>
            </div>
          </div>
        </div>

        {/* Filters & Actions */}
        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Cluster Selector Dropdown */}
          <div className="flex items-center gap-1.5 bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800 text-xs shadow-inner">
            <Layers size={13} className="text-purple-400" />
            <span className="text-slate-400 font-bold text-[11px]">Klaster:</span>
            <select
              value={selectedClusterIndex}
              onChange={(e) => handleSetClusterIndex(e.target.value)}
              className="bg-transparent text-purple-300 font-mono text-xs outline-none cursor-pointer max-w-[180px]"
            >
              <option value="all" className="bg-slate-900 text-white">Semua Klaster ({relationClusters.length} Grup)</option>
              {relationClusters.map(c => (
                <option key={c.id} value={c.id} className="bg-slate-900 text-white font-mono">
                  Klaster: {c.name} ({c.count} tabel)
                </option>
              ))}
            </select>
          </div>

          {/* Focus Table Selector */}
          <div className="flex items-center gap-1.5 bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800 text-xs shadow-inner">
            <Eye size={13} className="text-cyan-400" />
            <span className="text-slate-400 font-bold text-[11px]">Fokus:</span>
            <select
              value={selectedFocusTable}
              onChange={(e) => handleSetFocusTable(e.target.value)}
              className="bg-transparent text-white font-mono text-xs outline-none cursor-pointer max-w-[150px]"
            >
              <option value="all" className="bg-slate-900 text-white">Pilih Tabel Fokus...</option>
              {allConnectedTableNames.map(name => (
                <option key={name} value={name} className="bg-slate-900 text-white font-mono">
                  {name}
                </option>
              ))}
            </select>
            {selectedFocusTable !== 'all' && (
              <button
                onClick={() => handleSetFocusTable('all')}
                className="text-slate-400 hover:text-rose-400 text-xs px-1 cursor-pointer font-bold transition-colors"
                title="Hapus fokus (Tampilkan semua)"
              >
                ✕
              </button>
            )}
          </div>

          {/* Search Box */}
          <div className="relative w-40">
            <Search size={13} className="absolute left-2.5 top-2.5 text-slate-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari tabel..."
              className="w-full pl-7 pr-2 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-cyan-500 font-mono"
            />
          </div>

          {/* Auto Align Layout Button */}
          <button
            onClick={handleAutoAlign}
            className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Rapikan posisi tabel ke susunan berjenjang otomatis"
          >
            <Wand2 size={13} />
            <span>Rapikan Posisi</span>
          </button>

          {/* Fullscreen Toggle (Native HTML5 Fullscreen API) */}
          <button
            onClick={toggleBrowserFullscreen}
            className={`px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm ${isFullscreen
                ? 'bg-rose-500/20 text-rose-300 border-rose-500/40 hover:bg-rose-500/30'
                : 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40 hover:bg-cyan-500/30'
              }`}
            title={isFullscreen ? 'Keluar Fullscreen (ESC)' : 'Buka Layar Penuh Browser'}
          >
            {isFullscreen ? (
              <>
                <Minimize2 size={14} />
                <span>Tutup Layar Penuh (ESC)</span>
              </>
            ) : (
              <>
                <Maximize2 size={14} />
                <span>Layar Penuh (Browser)</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Legend & Help Info Bar */}
      <div className="bg-slate-950/90 px-5 py-2 border-b border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400 flex-wrap gap-2 shrink-0">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400"></span>
            <span className="font-bold text-emerald-300">Tabel Induk (Atas / 1)</span>
          </span>
          <span className="flex items-center gap-1.5">
            <ArrowDown size={12} className="text-cyan-400" />
            <span>Relasi 1 : N (One-to-Many)</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-purple-400"></span>
            <span className="font-bold text-purple-300">Tabel Anak (Bawah / N)</span>
          </span>
        </div>
        <span className="text-[10px] text-slate-500">
          💡 Tips: Garis panah mengalir dari <strong>Tabel Induk (1)</strong> di atas menuju ke <strong>Tabel Anak (N)</strong> di bawah.
        </span>
      </div>

      {/* React Flow Canvas */}
      <div className="flex-1 w-full h-full bg-slate-950 relative">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onInit={(instance) => {
            reactFlowInstanceRef.current = instance;
          }}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onNodeDragStop={handleNodeDragStop}
          nodeTypes={nodeTypes}
          fitView
          minZoom={0.15}
          maxZoom={1.8}
          proOptions={{ hideAttribution: true }}
        >
          <Background color="#334155" gap={24} size={1.2} />
          <Controls className="!bg-slate-900 !border-slate-700 !fill-slate-300" />
          <MiniMap
            nodeColor={(n) => {
              if (n.data?.relationType === 'parent') return '#10b981';
              if (n.data?.relationType === 'child') return '#a855f7';
              if (n.data?.relationType === 'complex') return '#ec4899';
              return '#64748b';
            }}
            className="!bg-slate-900 !border-slate-800 rounded-xl"
            maskColor="rgba(15, 23, 42, 0.75)"
          />
        </ReactFlow>
      </div>
    </div>
  );
}
