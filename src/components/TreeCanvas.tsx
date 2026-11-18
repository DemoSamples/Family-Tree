import React, { useEffect, useRef, useState, useMemo } from 'react';
import * as d3 from 'd3';
import { FamilyMember } from '../types/family';
import { getLineageHighlightIds, wasAliveInEra } from '../utils/genealogy';
import {
  buildKnowledgeGraph,
  KGNode,
  KGCluster,
  CanvasWorkspace,
} from '../db/knowledgeGraphStore';
import { Language, t } from '../utils/i18n';
import {
  ZoomIn,
  ZoomOut,
  Maximize2,
  Sparkles,
  Layers,
  Plus,
  Compass,
  X,
  Trash2,
  Eye,
  Heart,
  Baby,
  Users,
  Edit2,
  SlidersHorizontal,
  RotateCcw,
  UserPlus,
  MousePointer,
} from 'lucide-react';

interface TreeCanvasProps {
  members: FamilyMember[];
  selectedMemberId: string | null;
  onSelectMember: (id: string | null) => void;
  onOpenDetails: (member: FamilyMember) => void;
  onQuickAddRelation: (targetMember: FamilyMember, relationType: 'parent' | 'child' | 'spouse') => void;
  onEditMember?: (member: FamilyMember) => void;
  onDeleteMember?: (id: string) => void;
  onClearAllRecords?: () => void;
  onLoadSampleData?: () => void;
  onOpenAddMember?: () => void;
  eraRange: [number, number];
  isReadOnly: boolean;
  workspaces: CanvasWorkspace[];
  activeWorkspaceId: string;
  onSelectWorkspace: (id: string) => void;
  onCreateWorkspace: (workspace: Omit<CanvasWorkspace, 'id' | 'createdAt'>) => void;
  onDeleteWorkspace: (id: string) => void;
  language?: Language;
  onToggleEraBar?: () => void;
  isEraBarOpen?: boolean;
}

interface SimNode extends d3.SimulationNodeDatum {
  id: string;
  member: FamilyMember;
  cluster: KGCluster;
  generation: number;
  x?: number;
  y?: number;
  vx?: number;
  vy?: number;
}

interface SimLink extends d3.SimulationLinkDatum<SimNode> {
  id: string;
  source: string | SimNode;
  target: string | SimNode;
  predicate: string;
}

export const TreeCanvas: React.FC<TreeCanvasProps> = ({
  members,
  selectedMemberId,
  onSelectMember,
  onOpenDetails,
  onQuickAddRelation,
  onEditMember,
  onDeleteMember,
  onClearAllRecords,
  onLoadSampleData,
  onOpenAddMember,
  eraRange,
  isReadOnly,
  workspaces,
  activeWorkspaceId,
  onSelectWorkspace,
  onCreateWorkspace,
  onDeleteWorkspace,
  language = 'en',
  onToggleEraBar,
  isEraBarOpen,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const zoomBehaviorRef = useRef<d3.ZoomBehavior<SVGSVGElement, unknown> | null>(null);
  const simulationRef = useRef<d3.Simulation<SimNode, SimLink> | null>(null);

  // Quick Action Popover state for clicked node
  const [contextNode, setContextNode] = useState<{
    member: FamilyMember;
    screenX: number;
    screenY: number;
  } | null>(null);

  // Custom Canvas Background Context Menu
  const [canvasContextMenu, setCanvasContextMenu] = useState<{
    x: number;
    y: number;
  } | null>(null);

  // Custom Node Context Menu
  const [nodeContextMenu, setNodeContextMenu] = useState<{
    member: FamilyMember;
    x: number;
    y: number;
  } | null>(null);

  const openCanvasContextMenu = (clientX: number, clientY: number) => {
    setContextNode(null);
    setNodeContextMenu(null);
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const menuW = 240;
    const menuH = 340;
    const x = Math.min(Math.max(10, clientX - rect.left), rect.width - menuW);
    const y = Math.min(Math.max(10, clientY - rect.top), rect.height - menuH);
    setCanvasContextMenu({ x, y });
  };

  const openNodeContextMenu = (clientX: number, clientY: number, member: FamilyMember) => {
    setContextNode(null);
    setCanvasContextMenu(null);
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const menuW = 260;
    const menuH = 380;
    const x = Math.min(Math.max(10, clientX - rect.left), rect.width - menuW);
    const y = Math.min(Math.max(10, clientY - rect.top), rect.height - menuH);
    setNodeContextMenu({ member, x, y });
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setCanvasContextMenu(null);
        setNodeContextMenu(null);
        setContextNode(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const [showWorkspaceModal, setShowWorkspaceModal] = useState(false);
  const [newWsTitle, setNewWsTitle] = useState('');
  const [newWsFocalId, setNewWsFocalId] = useState<string>(members[0]?.id || '');
  const [newWsScope, setNewWsScope] = useState<'all' | 'descendants' | 'ancestors'>('all');

  // Build the Knowledge Graph Database Model
  const kgData = useMemo(() => {
    return buildKnowledgeGraph(members);
  }, [members]);

  // Active Workspace
  const activeWorkspace = useMemo(() => {
    return workspaces.find((w) => w.id === activeWorkspaceId) || workspaces[0];
  }, [workspaces, activeWorkspaceId]);

  // Filtered members for current workspace
  const workspaceMembers = useMemo(() => {
    if (!activeWorkspace || activeWorkspace.id === 'global') {
      return members;
    }
    const idSet = new Set(activeWorkspace.includedNodeIds);
    return members.filter((m) => idSet.has(m.id));
  }, [members, activeWorkspace]);

  // Lineage calculation
  const lineage = useMemo(() => {
    return getLineageHighlightIds(selectedMemberId, members);
  }, [selectedMemberId, members]);

  const selectedMember = useMemo(() => {
    return members.find((m) => m.id === selectedMemberId) || null;
  }, [selectedMemberId, members]);

  // Handle Create Workspace Submit
  const handleCreateWorkspaceSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWsTitle.trim() || !newWsFocalId) return;

    const focal = members.find((m) => m.id === newWsFocalId);
    if (!focal) return;

    const focalLineage = getLineageHighlightIds(newWsFocalId, members);
    let includedIds: string[] = [];

    if (newWsScope === 'all') {
      includedIds = Array.from(focalLineage.activeIds);
    } else if (newWsScope === 'ancestors') {
      includedIds = [newWsFocalId, ...Array.from(focalLineage.ancestorIds)];
    } else {
      includedIds = [newWsFocalId, ...Array.from(focalLineage.descendantIds)];
    }

    for (const spId of focal.spouseIds) {
      if (!includedIds.includes(spId)) includedIds.push(spId);
    }

    onCreateWorkspace({
      title: newWsTitle.trim(),
      description: `Lineage workspace for ${focal.firstName} ${focal.lastName}`,
      focalPersonId: newWsFocalId,
      includedNodeIds: includedIds,
      isDefault: false,
    });

    setNewWsTitle('');
    setShowWorkspaceModal(false);
  };

  // Node Dimensions
  const cardW = 196;
  const cardH = 66;

  // Custom Strict Non-Overlapping Rectangular Force
  const rectCollideForce = (nodes: SimNode[], padding = 28) => {
    for (let i = 0; i < nodes.length; ++i) {
      for (let j = i + 1; j < nodes.length; ++j) {
        const a = nodes[i];
        const b = nodes[j];
        if (a.x === undefined || a.y === undefined || b.x === undefined || b.y === undefined) continue;

        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const minX = cardW + padding;
        const minY = cardH + padding;

        const overlapX = minX - Math.abs(dx);
        const overlapY = minY - Math.abs(dy);

        // If both axes overlap, push apart along the axis of minimum intrusion
        if (overlapX > 0 && overlapY > 0) {
          if (overlapX < overlapY) {
            const sx = dx > 0 ? 1 : -1;
            const shift = (overlapX / 2) * sx;
            a.x -= shift;
            b.x += shift;
          } else {
            const sy = dy > 0 ? 1 : -1;
            const shift = (overlapY / 2) * sy;
            a.y -= shift;
            b.y += shift;
          }
        }
      }
    }
  };

  // D3 Knowledge Graph Canvas Rendering
  useEffect(() => {
    if (!svgRef.current || !containerRef.current) return;

    const width = containerRef.current.clientWidth || window.innerWidth || 1200;
    const height = containerRef.current.clientHeight || window.innerHeight || 800;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    // Defs: shadows, arrow markers
    const defs = svg.append('defs');

    // Arrow marker
    defs.append('marker')
      .attr('id', 'kg-arrow')
      .attr('viewBox', '0 0 10 10')
      .attr('refX', 22)
      .attr('refY', 5)
      .attr('markerWidth', 6)
      .attr('markerHeight', 6)
      .attr('orient', 'auto')
      .append('path')
      .attr('d', 'M 0 1 L 9 5 L 0 9 z')
      .attr('fill', '#94a3b8');

    // Drop shadow filter
    const filter = defs.append('filter')
      .attr('id', 'node-shadow')
      .attr('x', '-20%')
      .attr('y', '-20%')
      .attr('width', '140%')
      .attr('height', '140%');
    filter.append('feDropShadow')
      .attr('dx', '0')
      .attr('dy', '2')
      .attr('stdDeviation', '4')
      .attr('flood-color', '#0f172a')
      .attr('flood-opacity', '0.14');

    const g = svg.append('g').attr('class', 'kg-viewport');

    // Zoom setup
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.15, 3])
      .on('zoom', (event) => {
        g.attr('transform', event.transform);
        setContextNode(null);
        setCanvasContextMenu(null);
        setNodeContextMenu(null);
      });

    svg.call(zoom);
    zoomBehaviorRef.current = zoom;

    // Canvas background custom context menu & click-to-close
    svg
      .on('contextmenu', (event) => {
        event.preventDefault();
        event.stopPropagation();
        openCanvasContextMenu(event.clientX, event.clientY);
      })
      .on('click', () => {
        setCanvasContextMenu(null);
        setNodeContextMenu(null);
        setContextNode(null);
      });

    const visibleMembers = workspaceMembers;
    const clusterMap = new Map<string, KGCluster>(kgData.clusters.map((c) => [c.id, c]));

    // Cluster Centers layout
    const clusterCenters = new Map<string, { x: number; y: number }>();
    const clustersInUse = Array.from(
      new Set(visibleMembers.map((m) => kgData.nodes.find((n) => n.id === m.id)?.clusterId || 'cluster-founders'))
    );

    const clusterCount = clustersInUse.length;
    const cols = clusterCount <= 3 ? clusterCount : Math.ceil(Math.sqrt(clusterCount));
    const spacingX = 420;
    const spacingY = 360;

    clustersInUse.forEach((cId, idx) => {
      const col = idx % cols;
      const row = Math.floor(idx / cols);
      clusterCenters.set(cId, {
        x: (col - (cols - 1) / 2) * spacingX + width / 2,
        y: (row - 0.5) * spacingY + height / 2,
      });
    });

    // Prepare simulation nodes
    const simNodes: SimNode[] = visibleMembers.map((m) => {
      const kgNode = kgData.nodes.find((n) => n.id === m.id);
      const clusterId = kgNode?.clusterId || 'cluster-founders';
      const cluster = clusterMap.get(clusterId)!;
      const center = clusterCenters.get(clusterId) || { x: width / 2, y: height / 2 };

      return {
        id: m.id,
        member: m,
        cluster,
        generation: m.generation || 1,
        x: center.x + (Math.random() - 0.5) * 160,
        y: center.y + (Math.random() - 0.5) * 160,
      };
    });

    const nodeLookup = new Map<string, SimNode>(simNodes.map((n) => [n.id, n]));

    // Prepare simulation links
    const simLinks: SimLink[] = [];
    const processedSpouses = new Set<string>();

    for (const m of visibleMembers) {
      for (const pId of m.parentIds) {
        if (nodeLookup.has(pId)) {
          simLinks.push({
            id: `link-${pId}-${m.id}`,
            source: pId,
            target: m.id,
            predicate: 'PARENT_OF',
          });
        }
      }

      for (const spId of m.spouseIds) {
        const pair = [m.id, spId].sort().join('___');
        if (!processedSpouses.has(pair) && nodeLookup.has(spId)) {
          processedSpouses.add(pair);
          simLinks.push({
            id: `link-${pair}-spouse`,
            source: m.id,
            target: spId,
            predicate: 'SPOUSE_OF',
          });
        }
      }
    }

    // Force Simulation with Cluster Gravity and Collision Prevention
    const simulation = d3.forceSimulation<SimNode, SimLink>(simNodes)
      .force(
        'link',
        d3.forceLink<SimNode, SimLink>(simLinks)
          .id((d) => d.id)
          .distance((d) => (d.predicate === 'SPOUSE_OF' ? 105 : 160))
          .strength(0.5)
      )
      .force('charge', d3.forceManyBody().strength(-700))
      .force('circleCollide', d3.forceCollide().radius(115).iterations(4))
      .force(
        'clusterX',
        d3.forceX<SimNode>((d) => clusterCenters.get(d.cluster.id)?.x || width / 2).strength(0.3)
      )
      .force(
        'clusterY',
        d3.forceY<SimNode>((d) => clusterCenters.get(d.cluster.id)?.y || height / 2).strength(0.3)
      );

    simulationRef.current = simulation;

    // Cluster Background Hull Layer
    const clusterHullLayer = g.append('g').attr('class', 'cluster-hulls');

    // Links Layer
    const linkLayer = g.append('g').attr('class', 'links-layer');

    const linkLines = linkLayer
      .selectAll('line')
      .data(simLinks)
      .enter()
      .append('line')
      .attr('stroke', (d) => {
        const sId = typeof d.source === 'string' ? d.source : d.source.id;
        const tId = typeof d.target === 'string' ? d.target : d.target.id;
        if (selectedMemberId) {
          if (lineage.activeIds.has(sId) && lineage.activeIds.has(tId)) {
            return d.predicate === 'SPOUSE_OF' ? '#a855f7' : '#b45309';
          }
          return '#e2e8f0';
        }
        return d.predicate === 'SPOUSE_OF' ? '#cbd5e1' : '#94a3b8';
      })
      .attr('stroke-width', (d) => {
        const sId = typeof d.source === 'string' ? d.source : d.source.id;
        const tId = typeof d.target === 'string' ? d.target : d.target.id;
        if (selectedMemberId && lineage.activeIds.has(sId) && lineage.activeIds.has(tId)) {
          return 2.5;
        }
        return d.predicate === 'SPOUSE_OF' ? 1.75 : 1.5;
      })
      .attr('stroke-dasharray', (d) => (d.predicate === 'SPOUSE_OF' ? '4,4' : 'none'))
      .attr('opacity', (d) => {
        const sId = typeof d.source === 'string' ? d.source : d.source.id;
        const tId = typeof d.target === 'string' ? d.target : d.target.id;
        if (!selectedMemberId) return 0.8;
        return lineage.activeIds.has(sId) && lineage.activeIds.has(tId) ? 1 : 0.15;
      })
      .attr('marker-end', (d) => (d.predicate === 'PARENT_OF' ? 'url(#kg-arrow)' : null));

    // Link Predicate Labels
    const linkLabels = linkLayer
      .selectAll('text.link-label')
      .data(simLinks)
      .enter()
      .append('text')
      .attr('class', 'link-label pointer-events-none select-none')
      .attr('font-size', '8px')
      .attr('font-family', 'sans-serif')
      .attr('font-weight', '500')
      .attr('fill', '#94a3b8')
      .attr('text-anchor', 'middle')
      .attr('opacity', (d) => {
        const sId = typeof d.source === 'string' ? d.source : d.source.id;
        const tId = typeof d.target === 'string' ? d.target : d.target.id;
        if (!selectedMemberId) return 0.7;
        return lineage.activeIds.has(sId) && lineage.activeIds.has(tId) ? 1 : 0.1;
      })
      .text((d) => (d.predicate === 'SPOUSE_OF' ? (language === 'ne' ? 'दम्पती' : 'spouse') : (language === 'ne' ? 'अभिभावक' : 'parent')));

    // Nodes Layer
    const nodeLayer = g.append('g').attr('class', 'nodes-layer');

    const nodeGroups = nodeLayer
      .selectAll('g.kg-node')
      .data(simNodes)
      .enter()
      .append('g')
      .attr('class', 'kg-node cursor-pointer select-none')
      .attr('opacity', (d) => {
        if (!selectedMemberId) return 1;
        return lineage.activeIds.has(d.id) ? 1 : 0.2;
      })
      .call(
        d3.drag<SVGGElement, SimNode>()
          .on('start', (event, d) => {
            if (!event.active) simulation.alphaTarget(0.3).restart();
            d.fx = d.x;
            d.fy = d.y;
          })
          .on('drag', (event, d) => {
            d.fx = event.x;
            d.fy = event.y;
          })
          .on('end', (event, d) => {
            if (!event.active) simulation.alphaTarget(0);
            d.fx = null;
            d.fy = null;
          })
      )
      .on('contextmenu', (event, d) => {
        event.preventDefault();
        event.stopPropagation();
        openNodeContextMenu(event.clientX, event.clientY, d.member);
      })
      .on('click', (event, d) => {
        event.stopPropagation();
        setCanvasContextMenu(null);
        setNodeContextMenu(null);
        onSelectMember(d.id === selectedMemberId ? null : d.id);
        // Show Contextual popover near clicked position
        const rect = containerRef.current?.getBoundingClientRect();
        if (rect) {
          setContextNode({
            member: d.member,
            screenX: Math.min(event.clientX - rect.left, rect.width - 240),
            screenY: Math.max(10, event.clientY - rect.top - 80),
          });
        }
      })
      .on('dblclick', (event, d) => {
        event.stopPropagation();
        onOpenDetails(d.member);
      });

    // Node Background Box
    // CRITICAL USER REQUIREMENT: Red = Dead, Normal for Alive
    nodeGroups
      .append('rect')
      .attr('x', -cardW / 2)
      .attr('y', -cardH / 2)
      .attr('width', cardW)
      .attr('height', cardH)
      .attr('rx', 8)
      .attr('ry', 8)
      .attr('filter', 'url(#node-shadow)')
      .attr('fill', (d) => {
        const isDead = !d.member.isLiving;
        if (d.id === selectedMemberId) return '#fffbeb'; // amber focus
        if (isDead) {
          // RED TINT FOR DEAD
          return '#fef2f2'; // red-50
        }
        // NORMAL TINT FOR ALIVE
        if (lineage.ancestorIds.has(d.id)) return '#eff6ff';
        if (lineage.descendantIds.has(d.id)) return '#f0fdf4';
        return '#ffffff';
      })
      .attr('stroke', (d) => {
        const isDead = !d.member.isLiving;
        if (d.id === selectedMemberId) return '#b45309'; // focal amber
        if (isDead) {
          // PROMINENT RED BORDER FOR DEAD
          return '#ef4444'; // red-500
        }
        // NORMAL BORDER FOR ALIVE
        return '#10b981'; // emerald-500 / normal
      })
      .attr('stroke-width', (d) => {
        const isDead = !d.member.isLiving;
        if (d.id === selectedMemberId) return 2.8;
        return isDead ? 2.2 : 1.5;
      });

    // Left Status Color Strip (RED for Dead, GREEN for Alive)
    nodeGroups
      .append('rect')
      .attr('x', -cardW / 2)
      .attr('y', -cardH / 2)
      .attr('width', 5)
      .attr('height', cardH)
      .attr('rx', 2.5)
      .attr('fill', (d) => (!d.member.isLiving ? '#dc2626' : '#10b981'));

    // Avatar Initial Circle
    const avatar = nodeGroups
      .append('g')
      .attr('transform', `translate(${-cardW / 2 + 24}, 0)`);

    avatar
      .append('circle')
      .attr('r', 15)
      .attr('fill', (d) => (!d.member.isLiving ? '#fee2e2' : d.member.gender === 'female' ? '#fce7f3' : '#e0f2fe'))
      .attr('stroke', (d) => (!d.member.isLiving ? '#ef4444' : '#cbd5e1'))
      .attr('stroke-width', 1.5);

    avatar
      .append('text')
      .attr('text-anchor', 'middle')
      .attr('dominant-baseline', 'central')
      .attr('font-size', '10px')
      .attr('font-weight', '700')
      .attr('font-family', 'sans-serif')
      .attr('fill', (d) => (!d.member.isLiving ? '#b91c1c' : d.member.gender === 'female' ? '#be185d' : '#0369a1'))
      .text((d) => {
        if (language === 'ne' && d.member.firstNameNepali) {
          return d.member.firstNameNepali.charAt(0);
        }
        return d.member.firstName.charAt(0);
      });

    // Dead / Alive Indicator Badge on Node
    nodeGroups
      .append('rect')
      .attr('x', cardW / 2 - 50)
      .attr('y', -cardH / 2 + 6)
      .attr('width', 44)
      .attr('height', 15)
      .attr('rx', 3)
      .attr('fill', (d) => (!d.member.isLiving ? '#fee2e2' : '#dcfce7'))
      .attr('stroke', (d) => (!d.member.isLiving ? '#fca5a5' : '#86efac'))
      .attr('stroke-width', 0.8);

    nodeGroups
      .append('text')
      .attr('x', cardW / 2 - 28)
      .attr('y', -cardH / 2 + 14)
      .attr('text-anchor', 'middle')
      .attr('dominant-baseline', 'central')
      .attr('font-size', '8px')
      .attr('font-weight', '700')
      .attr('font-family', 'sans-serif')
      .attr('fill', (d) => (!d.member.isLiving ? '#b91c1c' : '#15803d'))
      .text((d) => (!d.member.isLiving ? (language === 'ne' ? 'स्वर्गीय' : 'DEAD') : (language === 'ne' ? 'जीवित' : 'ALIVE')));

    // Member Label (FULL UNTRIMMED NAME)
    nodeGroups
      .append('text')
      .attr('x', -cardW / 2 + 45)
      .attr('y', -7)
      .attr('font-size', (d) => {
        const full = language === 'ne' && d.member.firstNameNepali
          ? `${d.member.firstNameNepali} ${d.member.lastNameNepali || ''}`.trim()
          : `${d.member.firstName} ${d.member.lastName}`.trim();
        return full.length > 22 ? '9.5px' : full.length > 16 ? '10.5px' : '11.5px';
      })
      .attr('font-weight', '600')
      .attr('font-family', 'sans-serif')
      .attr('fill', (d) => (!d.member.isLiving ? '#991b1b' : '#0f172a'))
      .text((d) => {
        if (language === 'ne' && d.member.firstNameNepali) {
          return `${d.member.firstNameNepali} ${d.member.lastNameNepali || ''}`.trim();
        }
        return `${d.member.firstName} ${d.member.lastName}`.trim();
      });

    // Lifespan text
    nodeGroups
      .append('text')
      .attr('x', -cardW / 2 + 45)
      .attr('y', 8)
      .attr('font-size', '9.5px')
      .attr('font-family', 'serif')
      .attr('fill', (d) => (!d.member.isLiving ? '#b91c1c' : '#64748b'))
      .text((d) => {
        const b = d.member.birthYear;
        const de = d.member.isLiving ? (language === 'ne' ? 'वर्तमान' : 'Pres.') : d.member.deathYear ?? '?';
        return `${b} – ${de}`;
      });

    // Role / Generation / Lineage Kicker
    nodeGroups
      .append('text')
      .attr('x', -cardW / 2 + 45)
      .attr('y', 20)
      .attr('font-size', '8.5px')
      .attr('font-family', 'sans-serif')
      .attr('fill', (d) => {
        if (d.id === selectedMemberId) return '#b45309';
        if (lineage.ancestorIds.has(d.id)) return '#2563eb';
        if (lineage.descendantIds.has(d.id)) return '#059669';
        return '#94a3b8';
      })
      .text((d) => {
        if (d.id === selectedMemberId) return language === 'ne' ? '★ मुख्य छनोट' : '★ Selected';
        if (lineage.ancestorIds.has(d.id)) return language === 'ne' ? '↑ पुर्खा' : '↑ Ancestor';
        if (lineage.descendantIds.has(d.id)) return language === 'ne' ? '↓ सन्तान' : '↓ Descendant';
        return `${t('generation', language)} ${d.generation}`;
      });

    // Deselect click
    svg.on('click', () => {
      onSelectMember(null);
      setContextNode(null);
    });

    // Simulation Tick: Update positions, execute anti-overlap, and draw cluster hulls
    simulation.on('tick', () => {
      // STRICT ANTI-OVERLAP FORCE PASS
      rectCollideForce(simNodes, 24);

      linkLines
        .attr('x1', (d: any) => d.source.x)
        .attr('y1', (d: any) => d.source.y)
        .attr('x2', (d: any) => d.target.x)
        .attr('y2', (d: any) => d.target.y);

      linkLabels
        .attr('x', (d: any) => (d.source.x + d.target.x) / 2)
        .attr('y', (d: any) => (d.source.y + d.target.y) / 2 - 4);

      nodeGroups.attr('transform', (d) => `translate(${d.x || 0}, ${d.y || 0})`);

      // Draw cluster background hulls
      const clusterPoints = new Map<string, [number, number][]>();
      simNodes.forEach((n) => {
        if (!clusterPoints.has(n.cluster.id)) clusterPoints.set(n.cluster.id, []);
        const x = n.x || 0;
        const y = n.y || 0;
        clusterPoints.get(n.cluster.id)!.push(
          [x - 90, y - 45],
          [x + 90, y - 45],
          [x + 90, y + 45],
          [x - 90, y + 45]
        );
      });

      const hullData: { id: string; cluster: KGCluster; hull: [number, number][] }[] = [];
      clusterPoints.forEach((pts, cId) => {
        const hull = d3.polygonHull(pts);
        const cluster = clusterMap.get(cId);
        if (hull && cluster) {
          hullData.push({ id: cId, cluster, hull });
        }
      });

      const hulls = clusterHullLayer.selectAll('path.cluster-hull').data(hullData, (d: any) => d.id);

      hulls
        .enter()
        .append('path')
        .attr('class', 'cluster-hull')
        .attr('fill', (d) => d.cluster.color)
        .attr('fill-opacity', 0.45)
        .attr('stroke', (d) => d.cluster.accentColor)
        .attr('stroke-width', 1.5)
        .attr('stroke-dasharray', '5,5')
        .merge(hulls as any)
        .attr('d', (d) => {
          const lineGen = d3.line().curve(d3.curveCatmullRomClosed);
          return lineGen(d.hull);
        });

      hulls.exit().remove();
    });

    // Center view
    const initialTransform = d3.zoomIdentity.translate(width / 2 - 450, 40).scale(0.85);
    svg.call(zoom.transform, initialTransform);

    return () => {
      simulation.stop();
    };
  }, [workspaceMembers, kgData, selectedMemberId, lineage, language]);

  const handleZoomIn = () => {
    if (svgRef.current && zoomBehaviorRef.current) {
      d3.select(svgRef.current).transition().duration(250).call(zoomBehaviorRef.current.scaleBy, 1.25);
    }
  };

  const handleZoomOut = () => {
    if (svgRef.current && zoomBehaviorRef.current) {
      d3.select(svgRef.current).transition().duration(250).call(zoomBehaviorRef.current.scaleBy, 0.8);
    }
  };

  const handleResetZoom = () => {
    if (svgRef.current && zoomBehaviorRef.current && containerRef.current) {
      const w = containerRef.current.clientWidth || 1000;
      const h = containerRef.current.clientHeight || 700;
      d3.select(svgRef.current)
        .transition()
        .duration(400)
        .call(zoomBehaviorRef.current.transform, d3.zoomIdentity.translate(w / 2 - 450, 40).scale(0.85));
    }
  };

  return (
    <div className="relative w-full h-[calc(100vh-140px)] min-h-[640px] bg-stone-50 border border-stone-200 rounded-xl overflow-hidden flex flex-col shadow-xs">
      {/* Immersive Floating Header Toolbar */}
      <div className="absolute top-3 left-3 right-3 z-30 flex flex-wrap items-center justify-between gap-2 pointer-events-none">
        {/* Workspace Switcher & Status (Pointer-events-auto) */}
        <div className="flex items-center gap-1.5 p-1 bg-stone-100/95 backdrop-blur-md rounded-lg border border-stone-200 shadow-sm pointer-events-auto text-xs">
          <span className="text-[11px] font-semibold text-stone-600 px-2 flex items-center gap-1">
            <Layers className="w-3.5 h-3.5 text-stone-500" />
            <span>{t('workspace', language)}:</span>
          </span>

          {workspaces.map((ws) => (
            <button
              key={ws.id}
              onClick={() => onSelectWorkspace(ws.id)}
              className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors flex items-center gap-1.5 ${
                ws.id === activeWorkspaceId
                  ? 'bg-stone-900 text-stone-50 shadow-2xs'
                  : 'text-stone-700 hover:bg-stone-200/80'
              }`}
            >
              <span>{ws.title}</span>
              {ws.id !== 'global' && !isReadOnly && (
                <span
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteWorkspace(ws.id);
                  }}
                  className="hover:text-rose-400 p-0.5 rounded cursor-pointer"
                  title="Delete custom workspace"
                >
                  ×
                </span>
              )}
            </button>
          ))}

          {!isReadOnly && (
            <button
              onClick={() => setShowWorkspaceModal(true)}
              className="px-2 py-1 text-xs text-amber-900 hover:text-amber-950 hover:bg-stone-200/80 rounded transition-colors flex items-center gap-1 font-medium"
              title="Create a new generational workspace"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{t('newWorkspace', language)}</span>
            </button>
          )}
        </div>

        {/* Floating Controls: Era Toggle & Zoom */}
        <div className="flex items-center gap-1.5 bg-stone-100/95 backdrop-blur-md p-1 rounded-lg border border-stone-200 shadow-sm pointer-events-auto text-xs">
          {onToggleEraBar && (
            <button
              onClick={onToggleEraBar}
              className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors flex items-center gap-1.5 ${
                isEraBarOpen
                  ? 'bg-amber-800 text-amber-50 shadow-2xs'
                  : 'bg-white text-stone-700 hover:bg-stone-50 border border-stone-200'
              }`}
              title="Toggle historical era slider"
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>
                {eraRange[0]}–{eraRange[1]}
              </span>
            </button>
          )}

          <button
            onClick={handleZoomIn}
            className="p-1.5 text-stone-600 hover:text-stone-900 bg-white border border-stone-200 rounded hover:bg-stone-50 transition-colors"
            title="Zoom In"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={handleZoomOut}
            className="p-1.5 text-stone-600 hover:text-stone-900 bg-white border border-stone-200 rounded hover:bg-stone-50 transition-colors"
            title="Zoom Out"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={handleResetZoom}
            className="px-2.5 py-1 text-stone-600 hover:text-stone-900 bg-white border border-stone-200 rounded hover:bg-stone-50 transition-colors flex items-center gap-1"
            title="Fit to view"
          >
            <Maximize2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Fit</span>
          </button>

          {!isReadOnly && onClearAllRecords && members.length > 0 && (
            <button
              onClick={onClearAllRecords}
              className="px-2.5 py-1 text-rose-700 hover:text-rose-900 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded transition-colors flex items-center gap-1 font-medium"
              title={language === 'ne' ? 'सबै अभिलेख हटाएर खाली क्यानभास बनाउनुहोस्' : 'Clear all records to a blank canvas'}
            >
              <Trash2 className="w-3.5 h-3.5 text-rose-600" />
              <span className="hidden sm:inline">
                {language === 'ne' ? 'खाली क्यानभास' : 'Clear Canvas'}
              </span>
            </button>
          )}
        </div>
      </div>

      {/* Floating Quick Action Popover (Left-click on any node) */}
      {contextNode && (
        <div
          className="absolute z-40 bg-white/95 backdrop-blur-md border border-stone-200 rounded-lg shadow-xl p-2.5 text-xs animate-in fade-in zoom-in-95 duration-150"
          style={{
            left: `${contextNode.screenX}px`,
            top: `${contextNode.screenY}px`,
          }}
        >
          <div className="flex items-center justify-between gap-3 pb-1.5 mb-1.5 border-b border-stone-200">
            <div>
              <div className="font-bold text-stone-900 text-xs">
                {language === 'ne' && contextNode.member.firstNameNepali
                  ? `${contextNode.member.firstNameNepali} ${contextNode.member.lastNameNepali || ''}`
                  : `${contextNode.member.firstName} ${contextNode.member.lastName}`}
              </div>
              <div className="text-[10px] text-stone-500 font-serif">
                {contextNode.member.isLiving ? '🟢 ' + t('living', language) : '🔴 ' + t('deceased', language)} · Gen{' '}
                {contextNode.member.generation}
              </div>
            </div>
            <button
              onClick={() => setContextNode(null)}
              className="p-0.5 text-stone-400 hover:text-stone-700"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="flex flex-col gap-1">
            <button
              onClick={() => {
                onOpenDetails(contextNode.member);
                setContextNode(null);
              }}
              className="px-2 py-1 text-left hover:bg-stone-100 rounded text-stone-700 flex items-center gap-2"
            >
              <Eye className="w-3.5 h-3.5 text-amber-800" />
              <span>{t('inspectProfile', language)}</span>
            </button>

            <button
              onClick={() => {
                onSelectMember(contextNode.member.id);
                setContextNode(null);
              }}
              className="px-2 py-1 text-left hover:bg-stone-100 rounded text-stone-700 flex items-center gap-2"
            >
              <Sparkles className="w-3.5 h-3.5 text-blue-600" />
              <span>{t('focusLineage', language)}</span>
            </button>

            {!isReadOnly && (
              <>
                <div className="border-t border-stone-100 my-0.5" />
                <button
                  onClick={() => {
                    onQuickAddRelation(contextNode.member, 'parent');
                    setContextNode(null);
                  }}
                  className="px-2 py-1 text-left hover:bg-stone-100 rounded text-stone-700 flex items-center gap-2"
                >
                  <Users className="w-3.5 h-3.5 text-stone-500" />
                  <span>+ {t('parents', language)}</span>
                </button>
                <button
                  onClick={() => {
                    onQuickAddRelation(contextNode.member, 'spouse');
                    setContextNode(null);
                  }}
                  className="px-2 py-1 text-left hover:bg-stone-100 rounded text-stone-700 flex items-center gap-2"
                >
                  <Heart className="w-3.5 h-3.5 text-rose-500" />
                  <span>+ {t('spouse', language)}</span>
                </button>
                <button
                  onClick={() => {
                    onQuickAddRelation(contextNode.member, 'child');
                    setContextNode(null);
                  }}
                  className="px-2 py-1 text-left hover:bg-stone-100 rounded text-stone-700 flex items-center gap-2"
                >
                  <Baby className="w-3.5 h-3.5 text-emerald-600" />
                  <span>+ {t('children', language)}</span>
                </button>
                {onEditMember && (
                  <button
                    onClick={() => {
                      onEditMember(contextNode.member);
                      setContextNode(null);
                    }}
                    className="px-2 py-1 text-left hover:bg-stone-100 rounded text-stone-700 flex items-center gap-2"
                  >
                    <Edit2 className="w-3.5 h-3.5 text-stone-500" />
                    <span>{language === 'ne' ? 'सम्पादन / Edit' : 'Edit Details'}</span>
                  </button>
                )}
                {onDeleteMember && (
                  <button
                    onClick={() => {
                      onDeleteMember(contextNode.member.id);
                      setContextNode(null);
                    }}
                    className="px-2 py-1 text-left hover:bg-rose-50 rounded text-rose-700 flex items-center gap-2 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                    <span>{language === 'ne' ? 'हटाउनुहोस् (Delete)' : 'Delete Member'}</span>
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {/* SVG Canvas Container */}
      <div
        ref={containerRef}
        onContextMenu={(e) => {
          e.preventDefault();
          openCanvasContextMenu(e.clientX, e.clientY);
        }}
        className="flex-1 w-full h-full relative cursor-grab active:cursor-grabbing select-none"
      >
        <svg ref={svgRef} className="w-full h-full block" />

        {/* Blank Fresh Canvas Empty State Overlay */}
        {workspaceMembers.length === 0 && (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center p-6 text-center bg-stone-50/90 pointer-events-auto">
            <div className="max-w-md p-6 bg-white border border-stone-200 rounded-2xl shadow-xl space-y-4 animate-in fade-in zoom-in-95 duration-200">
              <div className="w-14 h-14 mx-auto rounded-full bg-amber-50 text-amber-800 border border-amber-200 flex items-center justify-center shadow-xs">
                <Compass className="w-7 h-7" />
              </div>
              <div>
                <h3 className="text-lg font-serif font-bold text-stone-900">
                  {language === 'ne' ? 'खाली क्यानभास (Blank Fresh Canvas)' : 'Blank Fresh Canvas'}
                </h3>
                <p className="text-xs text-stone-600 font-serif mt-1.5 leading-relaxed">
                  {language === 'ne'
                    ? 'हाल क्यानभासमा कुनै पारिवारिक अभिलेख छैन। पारिवारिक वंशवृक्ष सुरु गर्न पहिलो सदस्य थप्नुहोस् वा एआई सहायकसँग कुरा गर्नुहोस्।'
                    : 'The canvas is currently blank with zero records. Add your first family member to begin building your lineage knowledge graph, or chat with the AI Genealogist.'}
                </p>
              </div>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-2.5 pt-2">
                {onOpenAddMember && (
                  <button
                    onClick={onOpenAddMember}
                    className="w-full sm:w-auto px-4 py-2 bg-amber-800 hover:bg-amber-900 active:scale-[0.98] text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-2 shadow-sm transition-all"
                  >
                    <Plus className="w-4 h-4" />
                    <span>{language === 'ne' ? 'पहिलो सदस्य थप्नुहोस्' : 'Add First Member'}</span>
                  </button>
                )}
                {onLoadSampleData && (
                  <button
                    onClick={onLoadSampleData}
                    className="w-full sm:w-auto px-3.5 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 transition-colors border border-stone-200"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-amber-700" />
                    <span>{language === 'ne' ? 'नमूना वंशवृक्ष लोड गर्नुहोस्' : 'Load Sample Dynasty'}</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Custom Canvas Background Operations Menu (Right Click on Canvas) */}
        {canvasContextMenu && (
          <div
            className="absolute z-50 bg-white/95 backdrop-blur-md border border-stone-200 rounded-xl shadow-2xl p-1.5 text-xs w-60 animate-in fade-in zoom-in-95 duration-100 divide-y divide-stone-100 pointer-events-auto"
            style={{
              left: `${canvasContextMenu.x}px`,
              top: `${canvasContextMenu.y}px`,
            }}
          >
            <div className="px-2.5 py-1.5 font-bold font-serif text-stone-800 flex items-center justify-between text-[11px]">
              <span className="flex items-center gap-1.5">
                <Compass className="w-3.5 h-3.5 text-amber-800" />
                <span>{language === 'ne' ? 'क्यानभास कार्यहरू' : 'Canvas Operations'}</span>
              </span>
              <button
                onClick={() => setCanvasContextMenu(null)}
                className="text-stone-400 hover:text-stone-700 p-0.5"
              >
                <X className="w-3 h-3" />
              </button>
            </div>

            <div className="py-1 flex flex-col gap-0.5">
              {!isReadOnly && onOpenAddMember && (
                <button
                  onClick={() => {
                    onOpenAddMember();
                    setCanvasContextMenu(null);
                  }}
                  className="w-full px-2.5 py-1.5 text-left hover:bg-stone-100 rounded-lg text-stone-700 flex items-center gap-2 transition-colors"
                >
                  <UserPlus className="w-3.5 h-3.5 text-amber-800" />
                  <span>{language === 'ne' ? 'नयाँ सदस्य थप्नुहोस्' : 'Add Family Member'}</span>
                </button>
              )}

              <button
                onClick={() => {
                  handleResetZoom();
                  setCanvasContextMenu(null);
                }}
                className="w-full px-2.5 py-1.5 text-left hover:bg-stone-100 rounded-lg text-stone-700 flex items-center gap-2 transition-colors"
              >
                <Maximize2 className="w-3.5 h-3.5 text-stone-500" />
                <span>{language === 'ne' ? 'दृष्य केन्द्रित गर्नुहोस् (Fit)' : 'Fit & Center Graph'}</span>
              </button>

              <button
                onClick={() => {
                  handleZoomIn();
                  setCanvasContextMenu(null);
                }}
                className="w-full px-2.5 py-1.5 text-left hover:bg-stone-100 rounded-lg text-stone-700 flex items-center gap-2 transition-colors"
              >
                <ZoomIn className="w-3.5 h-3.5 text-stone-500" />
                <span>{language === 'ne' ? 'जुम इन (+२५%)' : 'Zoom In (+25%)'}</span>
              </button>

              <button
                onClick={() => {
                  handleZoomOut();
                  setCanvasContextMenu(null);
                }}
                className="w-full px-2.5 py-1.5 text-left hover:bg-stone-100 rounded-lg text-stone-700 flex items-center gap-2 transition-colors"
              >
                <ZoomOut className="w-3.5 h-3.5 text-stone-500" />
                <span>{language === 'ne' ? 'जुम आउट (-२५%)' : 'Zoom Out (-25%)'}</span>
              </button>

              {selectedMemberId && (
                <button
                  onClick={() => {
                    onSelectMember(null);
                    setCanvasContextMenu(null);
                  }}
                  className="w-full px-2.5 py-1.5 text-left hover:bg-stone-100 rounded-lg text-stone-700 flex items-center gap-2 transition-colors"
                >
                  <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                  <span>{language === 'ne' ? 'वंश रेखा हाइलाइट हटाउनुहोस्' : 'Clear Lineage Highlight'}</span>
                </button>
              )}

              {onToggleEraBar && (
                <button
                  onClick={() => {
                    onToggleEraBar();
                    setCanvasContextMenu(null);
                  }}
                  className="w-full px-2.5 py-1.5 text-left hover:bg-stone-100 rounded-lg text-stone-700 flex items-center gap-2 transition-colors"
                >
                  <SlidersHorizontal className="w-3.5 h-3.5 text-amber-800" />
                  <span>{language === 'ne' ? 'कालक्रम स्लाइडर टगल' : 'Toggle Era Slider'}</span>
                </button>
              )}

              {!isReadOnly && (
                <button
                  onClick={() => {
                    setShowWorkspaceModal(true);
                    setCanvasContextMenu(null);
                  }}
                  className="w-full px-2.5 py-1.5 text-left hover:bg-stone-100 rounded-lg text-stone-700 flex items-center gap-2 transition-colors"
                >
                  <Layers className="w-3.5 h-3.5 text-purple-600" />
                  <span>{language === 'ne' ? 'नयाँ कार्यक्षेत्र सिर्जना' : 'New Canvas Workspace'}</span>
                </button>
              )}
            </div>

            <div className="pt-1 flex flex-col gap-0.5">
              {!isReadOnly && onClearAllRecords && members.length > 0 && (
                <button
                  onClick={() => {
                    onClearAllRecords();
                    setCanvasContextMenu(null);
                  }}
                  className="w-full px-2.5 py-1.5 text-left hover:bg-rose-50 rounded-lg text-rose-700 flex items-center gap-2 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                  <span>{language === 'ne' ? 'खाली क्यानभास बनाउनुहोस्' : 'Clear to Blank Canvas'}</span>
                </button>
              )}

              {onLoadSampleData && (
                <button
                  onClick={() => {
                    onLoadSampleData();
                    setCanvasContextMenu(null);
                  }}
                  className="w-full px-2.5 py-1.5 text-left hover:bg-stone-100 rounded-lg text-stone-600 flex items-center gap-2 transition-colors text-[11px]"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-stone-500" />
                  <span>{language === 'ne' ? 'नमूना वंशवृक्ष लोड गर्नुहोस्' : 'Load Sample Dynasty'}</span>
                </button>
              )}
            </div>
          </div>
        )}

        {/* Custom Node Operations Menu (Right Click on Node) */}
        {nodeContextMenu && (
          <div
            className="absolute z-50 bg-white/95 backdrop-blur-md border border-stone-200 rounded-xl shadow-2xl p-2.5 text-xs w-64 animate-in fade-in zoom-in-95 duration-100 pointer-events-auto"
            style={{
              left: `${nodeContextMenu.x}px`,
              top: `${nodeContextMenu.y}px`,
            }}
          >
            {/* Header with untrimmed name */}
            <div className="flex items-center justify-between pb-2 mb-1.5 border-b border-stone-200">
              <div className="flex items-center gap-2 min-w-0">
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                    nodeContextMenu.member.gender === 'female'
                      ? 'bg-rose-100 text-rose-800'
                      : 'bg-sky-100 text-sky-800'
                  }`}
                >
                  {nodeContextMenu.member.firstName.charAt(0)}
                </div>
                <div className="min-w-0">
                  <div className="font-bold text-stone-900 text-xs truncate">
                    {language === 'ne' && nodeContextMenu.member.firstNameNepali
                      ? `${nodeContextMenu.member.firstNameNepali} ${nodeContextMenu.member.lastNameNepali || ''}`.trim()
                      : `${nodeContextMenu.member.firstName} ${nodeContextMenu.member.lastName}`.trim()}
                  </div>
                  <div className="text-[10px] text-stone-500 font-serif">
                    {nodeContextMenu.member.isLiving ? '🟢 ' + t('living', language) : '🔴 ' + t('deceased', language)} · Gen {nodeContextMenu.member.generation || 1}
                  </div>
                </div>
              </div>
              <button
                onClick={() => setNodeContextMenu(null)}
                className="text-stone-400 hover:text-stone-700 p-0.5"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="flex flex-col gap-0.5">
              <button
                onClick={() => {
                  onOpenDetails(nodeContextMenu.member);
                  setNodeContextMenu(null);
                }}
                className="px-2 py-1.5 text-left hover:bg-stone-100 rounded-lg text-stone-700 flex items-center gap-2 transition-colors"
              >
                <Eye className="w-3.5 h-3.5 text-amber-800" />
                <span>{language === 'ne' ? 'विस्तृत विवरण हेर्नुहोस् (Dossier)' : 'View Archival Dossier'}</span>
              </button>

              <button
                onClick={() => {
                  onSelectMember(nodeContextMenu.member.id);
                  setNodeContextMenu(null);
                }}
                className="px-2 py-1.5 text-left hover:bg-stone-100 rounded-lg text-stone-700 flex items-center gap-2 transition-colors"
              >
                <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                <span>{language === 'ne' ? 'वंश रेखा केन्द्रित गर्नुहोस्' : 'Focus Lineage Trace'}</span>
              </button>

              {!isReadOnly && (
                <>
                  <div className="border-t border-stone-100 my-1" />
                  <button
                    onClick={() => {
                      onQuickAddRelation(nodeContextMenu.member, 'parent');
                      setNodeContextMenu(null);
                    }}
                    className="px-2 py-1.5 text-left hover:bg-stone-100 rounded-lg text-stone-700 flex items-center gap-2 transition-colors"
                  >
                    <Users className="w-3.5 h-3.5 text-stone-500" />
                    <span>+ {t('parents', language)}</span>
                  </button>

                  <button
                    onClick={() => {
                      onQuickAddRelation(nodeContextMenu.member, 'spouse');
                      setNodeContextMenu(null);
                    }}
                    className="px-2 py-1.5 text-left hover:bg-stone-100 rounded-lg text-stone-700 flex items-center gap-2 transition-colors"
                  >
                    <Heart className="w-3.5 h-3.5 text-rose-500" />
                    <span>+ {t('spouse', language)}</span>
                  </button>

                  <button
                    onClick={() => {
                      onQuickAddRelation(nodeContextMenu.member, 'child');
                      setNodeContextMenu(null);
                    }}
                    className="px-2 py-1.5 text-left hover:bg-stone-100 rounded-lg text-stone-700 flex items-center gap-2 transition-colors"
                  >
                    <Baby className="w-3.5 h-3.5 text-emerald-600" />
                    <span>+ {t('children', language)}</span>
                  </button>

                  {onEditMember && (
                    <button
                      onClick={() => {
                        onEditMember(nodeContextMenu.member);
                        setNodeContextMenu(null);
                      }}
                      className="px-2 py-1.5 text-left hover:bg-stone-100 rounded-lg text-stone-700 flex items-center gap-2 transition-colors"
                    >
                      <Edit2 className="w-3.5 h-3.5 text-stone-500" />
                      <span>{language === 'ne' ? 'विवरण सम्पादन गर्नुहोस्' : 'Edit Member Details'}</span>
                    </button>
                  )}

                  <button
                    onClick={() => {
                      setNewWsFocalId(nodeContextMenu.member.id);
                      setNewWsTitle(`${nodeContextMenu.member.firstName} Generational Workspace`);
                      setShowWorkspaceModal(true);
                      setNodeContextMenu(null);
                    }}
                    className="px-2 py-1.5 text-left hover:bg-stone-100 rounded-lg text-stone-700 flex items-center gap-2 transition-colors"
                  >
                    <Layers className="w-3.5 h-3.5 text-purple-600" />
                    <span>{language === 'ne' ? 'यस पुस्ताको कार्यक्षेत्र' : 'Create Lineage Workspace'}</span>
                  </button>

                  {onDeleteMember && (
                    <>
                      <div className="border-t border-stone-100 my-1" />
                      <button
                        onClick={() => {
                          onDeleteMember(nodeContextMenu.member.id);
                          setNodeContextMenu(null);
                        }}
                        className="px-2 py-1.5 text-left hover:bg-rose-50 rounded-lg text-rose-700 flex items-center gap-2 transition-colors font-medium"
                      >
                        <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                        <span>{language === 'ne' ? 'अभिलेख हटाउनुहोस् (Delete)' : 'Delete Member Record'}</span>
                      </button>
                    </>
                  )}
                </>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Bottom Floating Legend Bar (DEAD = RED, ALIVE = NORMAL) */}
      <div className="absolute bottom-3 left-3 right-3 z-30 pointer-events-none flex flex-wrap items-center justify-between gap-2">
        <div className="bg-stone-100/95 backdrop-blur-md px-3.5 py-1.5 rounded-lg border border-stone-200 shadow-sm pointer-events-auto flex items-center gap-4 text-[11px]">
          <span className="font-serif font-bold text-stone-700">{t('legend', language)}:</span>
          {/* DEAD = RED */}
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-rose-600 ring-2 ring-rose-200 inline-block"></span>
            <span className="font-bold text-rose-800">
              {language === 'ne' ? 'रातो = स्वर्गीय (Dead)' : 'Red = Dead (Deceased)'}
            </span>
          </div>
          {/* ALIVE = NORMAL */}
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-emerald-600 ring-2 ring-emerald-200 inline-block"></span>
            <span className="font-medium text-emerald-800">
              {language === 'ne' ? 'सामान्य = जीवित (Alive)' : 'Normal = Alive (Living)'}
            </span>
          </div>
        </div>

        <div className="bg-stone-100/95 backdrop-blur-md px-3 py-1.5 rounded-lg border border-stone-200 shadow-sm pointer-events-auto text-[11px] text-stone-500 font-serif hidden md:block">
          {language === 'ne'
            ? 'कुनै पनि सदस्यमा क्लिक गरेर वंश रेखा र विकल्पहरू हेर्नुहोस् · कहिल्यै नओभरल्याप हुने प्रविधि'
            : 'Left-click node for quick actions & lineage trace · Zero overlap collision guarantee'}
        </div>
      </div>

      {/* Modal: Create New Generational Canvas Workspace */}
      {showWorkspaceModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white border border-stone-200 rounded-xl shadow-2xl w-full max-w-md p-5 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-stone-200">
              <div>
                <h4 className="text-base font-serif font-bold text-stone-900">
                  {t('createWorkspace', language)}
                </h4>
                <p className="text-xs text-stone-500 font-serif">
                  {language === 'ne'
                    ? 'कुनै एक पुर्खा वा सदस्यको सम्पूर्ण पुस्ताको संजाल हेर्नुहोस्'
                    : 'Isolate a specific person and their ancestral/descendant generations'}
                </p>
              </div>
              <button
                onClick={() => setShowWorkspaceModal(false)}
                className="p-1 text-stone-500 hover:text-stone-900"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateWorkspaceSubmit} className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-stone-700 block mb-1">
                  {language === 'ne' ? 'कार्यक्षेत्रको नाम *' : 'Workspace Title *'}
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. राम कृष्ण श्रेष्ठ - ५ पुस्ता कार्यक्षेत्र"
                  value={newWsTitle}
                  onChange={(e) => setNewWsTitle(e.target.value)}
                  className="w-full text-xs p-2 border border-stone-300 rounded bg-white"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-stone-700 block mb-1">
                  {t('focalPerson', language)} *
                </label>
                <select
                  value={newWsFocalId}
                  onChange={(e) => setNewWsFocalId(e.target.value)}
                  className="w-full text-xs p-2 border border-stone-300 rounded bg-white"
                >
                  {members.map((m) => (
                    <option key={m.id} value={m.id}>
                      {language === 'ne' && m.firstNameNepali
                        ? `${m.firstNameNepali} ${m.lastNameNepali || ''}`
                        : `${m.firstName} ${m.lastName}`}{' '}
                      ({t('generation', language)} {m.generation || 1})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-stone-700 block mb-1">
                  {language === 'ne' ? 'पुस्ता दायरा (Scope)' : 'Generational Scope'}
                </label>
                <select
                  value={newWsScope}
                  onChange={(e) => setNewWsScope(e.target.value as any)}
                  className="w-full text-xs p-2 border border-stone-300 rounded bg-white"
                >
                  <option value="all">
                    {language === 'ne' ? 'सम्पूर्ण वंश (पुर्खा तथा सन्तान दुवै)' : 'Complete Lineage (Ancestors & Descendants)'}
                  </option>
                  <option value="descendants">
                    {language === 'ne' ? 'सन्तान मात्र (Descendants Only)' : 'Descendants Only'}
                  </option>
                  <option value="ancestors">
                    {language === 'ne' ? 'पुर्खा मात्र (Ancestors Pedigree)' : 'Ancestors Pedigree Only'}
                  </option>
                </select>
              </div>

              <div className="pt-3 border-t border-stone-200 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowWorkspaceModal(false)}
                  className="px-3 py-1.5 text-xs text-stone-600 hover:bg-stone-100 rounded"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs bg-amber-800 hover:bg-amber-900 text-white rounded font-medium shadow-2xs"
                >
                  {t('createWorkspace', language)}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
