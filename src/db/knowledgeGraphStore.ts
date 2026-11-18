import { FamilyMember } from '../types/family';

export interface KGNode {
  id: string;
  type: 'person' | 'event' | 'cluster' | 'place';
  label: string;
  clusterId: string;
  clusterName: string;
  generation: number;
  properties: Record<string, any>;
  ragChunk: string; // Document chunk for RAG context
}

export interface KGEdge {
  id: string;
  source: string;
  target: string;
  predicate: 'PARENT_OF' | 'CHILD_OF' | 'SPOUSE_OF' | 'SIBLING_OF' | 'INVOLVED_IN' | 'LOCATED_IN';
  label: string;
  temporal?: string;
}

export interface KGCluster {
  id: string;
  name: string;
  description: string;
  color: string;
  accentColor: string;
  generation: number;
  nodeIds: string[];
}

export interface CanvasWorkspace {
  id: string;
  title: string;
  description: string;
  focalPersonId?: string;
  focalGenerations?: number[] | 'all';
  includedNodeIds: string[];
  isDefault?: boolean;
  createdAt: string;
}

export interface KnowledgeGraphData {
  nodes: KGNode[];
  edges: KGEdge[];
  clusters: KGCluster[];
}

/**
 * Derives cluster ID and name based on lineage branch and generation
 */
export function assignCluster(member: FamilyMember): { id: string; name: string; color: string; accentColor: string; desc: string } {
  const gen = member.generation || 1;
  const last = member.lastName.toLowerCase();
  const tags = (member.tags || []).join(' ').toLowerCase();

  if (gen === 1) {
    return {
      id: 'cluster-founders',
      name: 'Scottish Founders & Horological Guild',
      desc: '1870s Edinburgh emigration, guild establishment on Beacon Hill, and early botanical archives.',
      color: '#fef3c7', // amber-100
      accentColor: '#b45309', // amber-700
    };
  }

  if (last.includes('hastings') || tags.includes('london') || tags.includes('british')) {
    return {
      id: 'cluster-hastings',
      name: 'British Diplomatic & Cultural Branch',
      desc: 'Paris Conservatoire recitals, London diplomatic missions, and European cultural preservation.',
      color: '#f3e8ff', // purple-100
      accentColor: '#7e22ce', // purple-700
    };
  }

  if (last.includes('chen') || tags.includes('pacific') || tags.includes('seattle')) {
    return {
      id: 'cluster-chen',
      name: 'Pacific Northwest Ecological Branch',
      desc: 'Oceanographic explorations, environmental jurisprudence, and urban planning.',
      color: '#dcfce7', // emerald-100
      accentColor: '#15803d', // emerald-700
    };
  }

  if (gen === 2) {
    return {
      id: 'cluster-interwar',
      name: 'Interwar Scholars & Harvard Geologists',
      desc: '1920s–1940s Appalachian geology, architectural history, and wartime reconnaissance.',
      color: '#dbeafe', // blue-100
      accentColor: '#1d4ed8', // blue-700
    };
  }

  if (gen === 3) {
    return {
      id: 'cluster-spaceage',
      name: 'Space Age & MIT Systems Engineering',
      desc: 'Apollo 11 guidance development, Swedish Fulbright biochemical research, and avionics.',
      color: '#e0e7ff', // indigo-100
      accentColor: '#4338ca', // indigo-700
    };
  }

  if (gen === 4) {
    return {
      id: 'cluster-modern',
      name: 'Clean Tech & Clinical Genetics Dynasty',
      desc: 'Ocean renewable energy, pediatric genetics, and Peabody documentary histories.',
      color: '#fce7f3', // rose-100
      accentColor: '#be185d', // rose-700
    };
  }

  // Generation 5 (Youth)
  return {
    id: 'cluster-youth',
    name: '21st Century Computational Humanities & Arts',
    desc: 'Digital historical cartography, cello musicianship, and next-generation archival custodians.',
    color: '#ffedd5', // orange-100
    accentColor: '#c2410c', // orange-700
  };
}

/**
 * Builds Knowledge Graph database representation from family members
 */
export function buildKnowledgeGraph(members: FamilyMember[]): KnowledgeGraphData {
  const nodes: KGNode[] = [];
  const edges: KGEdge[] = [];
  const clusterMap = new Map<string, KGCluster>();

  // Process nodes
  for (const m of members) {
    const cluster = assignCluster(m);

    if (!clusterMap.has(cluster.id)) {
      clusterMap.set(cluster.id, {
        id: cluster.id,
        name: cluster.name,
        description: cluster.desc,
        color: cluster.color,
        accentColor: cluster.accentColor,
        generation: m.generation || 1,
        nodeIds: [],
      });
    }

    clusterMap.get(cluster.id)!.nodeIds.push(m.id);

    // Build dense RAG document chunk
    const parentNames = m.parentIds
      .map((pId) => {
        const p = members.find((x) => x.id === pId);
        return p ? `${p.firstName} ${p.lastName}` : null;
      })
      .filter(Boolean)
      .join(', ');

    const spouseNames = m.spouseIds
      .map((spId) => {
        const sp = members.find((x) => x.id === spId);
        return sp ? `${sp.firstName} ${sp.lastName}` : null;
      })
      .filter(Boolean)
      .join(', ');

    const childNames = m.childrenIds
      .map((cId) => {
        const c = members.find((x) => x.id === cId);
        return c ? `${c.firstName} ${c.lastName}` : null;
      })
      .filter(Boolean)
      .join(', ');

    const eventSummaries = m.events
      .map((ev) => `[${ev.year}: ${ev.title} - ${ev.description}]`)
      .join(' ');

    const docSummaries = m.documents
      .map((doc) => `[Source Document: ${doc.title} (${doc.type}) - ${doc.description || ''}]`)
      .join(' ');

    const ragChunk = `
Entity: ${m.firstName} ${m.lastName}${m.maidenName ? ` (maiden name: ${m.maidenName})` : ''}
ID: ${m.id}
Gender: ${m.gender}
Generation: Generation ${m.generation || 1}
Cluster: ${cluster.name}
Lifespan: Born in ${m.birthYear} at ${m.birthPlace || 'unknown place'}. ${
      m.isLiving ? 'Currently living.' : `Deceased in ${m.deathYear || '?'} at ${m.deathPlace || 'unknown place'}.`
    }
Occupation: ${m.occupation || 'Not specified'}
Biography: ${m.bio || 'No bio provided'}
Kinship:
  - Parents: ${parentNames || 'None recorded (lineage founder)'}
  - Spouse(s): ${spouseNames || 'None recorded'}
  - Children: ${childNames || 'None recorded'}
Milestone Events: ${eventSummaries || 'None'}
Archival Evidence: ${docSummaries || 'None'}
Historical Tags: ${(m.tags || []).join(', ') || 'None'}
Notes: ${m.notes || 'None'}
`.trim();

    nodes.push({
      id: m.id,
      type: 'person',
      label: `${m.firstName} ${m.lastName}`,
      clusterId: cluster.id,
      clusterName: cluster.name,
      generation: m.generation || 1,
      properties: {
        firstName: m.firstName,
        lastName: m.lastName,
        birthYear: m.birthYear,
        deathYear: m.deathYear,
        isLiving: m.isLiving,
        occupation: m.occupation,
        bio: m.bio,
        gender: m.gender,
      },
      ragChunk,
    });
  }

  // Process edges (relationships)
  const processedSpousePairs = new Set<string>();

  for (const m of members) {
    // Parent -> Child
    for (const pId of m.parentIds) {
      if (members.some((x) => x.id === pId)) {
        edges.push({
          id: `edge-${pId}-${m.id}-parent`,
          source: pId,
          target: m.id,
          predicate: 'PARENT_OF',
          label: 'parent of',
        });
      }
    }

    // Spouse <-> Spouse
    for (const spId of m.spouseIds) {
      const pairKey = [m.id, spId].sort().join('___');
      if (!processedSpousePairs.has(pairKey) && members.some((x) => x.id === spId)) {
        processedSpousePairs.add(pairKey);
        edges.push({
          id: `edge-${pairKey}-spouse`,
          source: m.id,
          target: spId,
          predicate: 'SPOUSE_OF',
          label: 'spouse of',
        });
      }
    }
  }

  return {
    nodes,
    edges,
    clusters: Array.from(clusterMap.values()),
  };
}

/**
 * Lightweight RAG Search over knowledge graph nodes
 */
export function queryKnowledgeGraphRAG(
  query: string,
  kg: KnowledgeGraphData,
  topK = 5
): { node: KGNode; score: number }[] {
  const qTokens = query.toLowerCase().split(/\s+/).filter((t) => t.length > 2);
  if (qTokens.length === 0) {
    return kg.nodes.slice(0, topK).map((node) => ({ node, score: 1 }));
  }

  const scored = kg.nodes.map((node) => {
    let score = 0;
    const chunkLower = node.ragChunk.toLowerCase();
    const labelLower = node.label.toLowerCase();

    for (const token of qTokens) {
      if (labelLower.includes(token)) score += 10;
      if (chunkLower.includes(token)) score += 3;
    }

    // Boost if token matches occupation, place, or era
    if (node.properties.occupation && query.toLowerCase().includes(node.properties.occupation.toLowerCase())) {
      score += 8;
    }

    return { node, score };
  });

  return scored
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, topK);
}
