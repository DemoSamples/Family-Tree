import { FamilyMember, LifeEvent, VersionSnapshot } from '../types/family';

/**
 * Returns a Set of member IDs representing all direct ancestors (parents, grandparents, etc.)
 */
export function findDirectAncestors(targetId: string, memberMap: Map<string, FamilyMember>): Set<string> {
  const ancestors = new Set<string>();
  const queue = [targetId];

  while (queue.length > 0) {
    const currentId = queue.shift()!;
    const member = memberMap.get(currentId);
    if (!member) continue;

    for (const parentId of member.parentIds) {
      if (!ancestors.has(parentId)) {
        ancestors.add(parentId);
        queue.push(parentId);
      }
    }
  }

  return ancestors;
}

/**
 * Returns a Set of member IDs representing all direct descendants (children, grandchildren, etc.)
 */
export function findDirectDescendants(targetId: string, memberMap: Map<string, FamilyMember>): Set<string> {
  const descendants = new Set<string>();
  const queue = [targetId];

  while (queue.length > 0) {
    const currentId = queue.shift()!;
    const member = memberMap.get(currentId);
    if (!member) continue;

    for (const childId of member.childrenIds) {
      if (!descendants.has(childId)) {
        descendants.add(childId);
        queue.push(childId);
      }
    }
  }

  return descendants;
}

/**
 * Computes all members that should remain highlighted when a node is selected:
 * Target node + all direct ancestors + all direct descendants + spouses of selected member
 */
export function getLineageHighlightIds(
  selectedId: string | null,
  members: FamilyMember[]
): {
  activeIds: Set<string>;
  ancestorIds: Set<string>;
  descendantIds: Set<string>;
  spouseIds: Set<string>;
} {
  const activeIds = new Set<string>();
  const ancestorIds = new Set<string>();
  const descendantIds = new Set<string>();
  const spouseIds = new Set<string>();

  if (!selectedId) {
    return { activeIds, ancestorIds, descendantIds, spouseIds };
  }

  const memberMap = new Map<string, FamilyMember>(members.map((m) => [m.id, m]));
  const target = memberMap.get(selectedId);
  if (!target) return { activeIds, ancestorIds, descendantIds, spouseIds };

  activeIds.add(selectedId);

  // 1. Ancestors
  const anc = findDirectAncestors(selectedId, memberMap);
  for (const id of anc) {
    ancestorIds.add(id);
    activeIds.add(id);
  }

  // 2. Descendants
  const desc = findDirectDescendants(selectedId, memberMap);
  for (const id of desc) {
    descendantIds.add(id);
    activeIds.add(id);
  }

  // 3. Spouses of selected member
  for (const spId of target.spouseIds) {
    spouseIds.add(spId);
    activeIds.add(spId);
  }

  return { activeIds, ancestorIds, descendantIds, spouseIds };
}

/**
 * Checks if a member was alive during a specified year range
 */
export function wasAliveInEra(member: FamilyMember, startYear: number, endYear: number): boolean {
  const birth = member.birthYear;
  const death = member.deathYear ?? (member.isLiving ? new Date().getFullYear() : 2026);
  return birth <= endYear && death >= startYear;
}

/**
 * Checks if a member had any recorded life event during a specified year range
 */
export function hasEventInEra(member: FamilyMember, startYear: number, endYear: number): boolean {
  if (wasAliveInEra(member, startYear, endYear)) return true;
  return member.events.some((ev) => ev.year >= startYear && ev.year <= endYear);
}

/**
 * Auto-calculates generational tier from root founders (Generation 1, 2, 3...)
 */
export function recalculateGenerations(members: FamilyMember[]): FamilyMember[] {
  const memberMap = new Map<string, FamilyMember>(members.map((m) => [m.id, { ...m }]));

  // Roots have no known parents in this tree
  const rootIds = members.filter((m) => m.parentIds.length === 0).map((m) => m.id);

  const generations = new Map<string, number>();

  // Assign 1 to roots
  for (const rid of rootIds) {
    generations.set(rid, 1);
  }

  let changed = true;
  let iterations = 0;
  while (changed && iterations < 50) {
    changed = false;
    iterations++;

    for (const member of memberMap.values()) {
      let maxParentGen = 0;
      for (const pid of member.parentIds) {
        const pGen = generations.get(pid);
        if (pGen !== undefined && pGen > maxParentGen) {
          maxParentGen = pGen;
        }
      }

      if (maxParentGen > 0) {
        const expectedGen = maxParentGen + 1;
        const currentGen = generations.get(member.id);
        if (currentGen !== expectedGen) {
          generations.set(member.id, expectedGen);
          changed = true;
        }
      } else if (!generations.has(member.id)) {
        generations.set(member.id, 1);
        changed = true;
      }

      // Also ensure spouses share generation if feasible
      const currentGen = generations.get(member.id) || 1;
      for (const spId of member.spouseIds) {
        if (!generations.has(spId)) {
          generations.set(spId, currentGen);
          changed = true;
        }
      }
    }
  }

  return members.map((m) => ({
    ...m,
    generation: generations.get(m.id) || 1,
  }));
}

/**
 * Standard genealogical GEDCOM 5.5.1 exporter
 */
export function exportToGEDCOM(members: FamilyMember[], treeTitle = 'Family Archive'): string {
  const dateStr = new Date().toISOString().split('T')[0].replace(/-/g, ' ');
  let out = '';
  out += '0 HEAD\n';
  out += '1 SOUR KINSHIP_ARCHIVE\n';
  out += '2 VERS 1.0\n';
  out += `2 NAME ${treeTitle}\n`;
  out += `1 DATE ${dateStr}\n`;
  out += '1 GEDC\n';
  out += '2 VERS 5.5.1\n';
  out += '2 FORM LINEAGE-LINKED\n';
  out += '1 CHAR UTF-8\n';

  // Individual Records (INDI)
  for (const m of members) {
    out += `0 @I${m.id}@ INDI\n`;
    out += `1 NAME ${m.firstName} /${m.lastName}/\n`;
    if (m.maidenName) {
      out += `2 _MARNM ${m.lastName}\n`;
      out += `2 SURN ${m.maidenName}\n`;
    }
    const sex = m.gender === 'male' ? 'M' : m.gender === 'female' ? 'F' : 'U';
    out += `1 SEX ${sex}\n`;

    if (m.birthYear || m.birthDate) {
      out += '1 BIRT\n';
      if (m.birthDate) out += `2 DATE ${m.birthDate}\n`;
      else if (m.birthYear) out += `2 DATE ${m.birthYear}\n`;
      if (m.birthPlace) out += `2 PLAC ${m.birthPlace}\n`;
    }

    if (!m.isLiving && (m.deathYear || m.deathDate)) {
      out += '1 DEAT\n';
      if (m.deathDate) out += `2 DATE ${m.deathDate}\n`;
      else if (m.deathYear) out += `2 DATE ${m.deathYear}\n`;
      if (m.deathPlace) out += `2 PLAC ${m.deathPlace}\n`;
    }

    if (m.occupation) {
      out += `1 OCCU ${m.occupation}\n`;
    }

    if (m.bio) {
      out += `1 NOTE ${m.bio.replace(/\n/g, ' ')}\n`;
    }

    for (const ev of m.events) {
      if (ev.category !== 'birth' && ev.category !== 'death') {
        out += `1 EVEN\n`;
        out += `2 TYPE ${ev.title}\n`;
        out += `2 DATE ${ev.date || ev.year}\n`;
        if (ev.location) out += `2 PLAC ${ev.location}\n`;
        out += `2 NOTE ${ev.description}\n`;
      }
    }
  }

  // Family Records (FAM)
  const processedFamilies = new Set<string>();
  let famIndex = 1;

  for (const m of members) {
    if (m.spouseIds.length > 0) {
      for (const spId of m.spouseIds) {
        const pairKey = [m.id, spId].sort().join('___');
        if (!processedFamilies.has(pairKey)) {
          processedFamilies.add(pairKey);
          const husb = m.gender === 'male' ? m.id : spId;
          const wife = m.gender === 'male' ? spId : m.id;
          out += `0 @F${famIndex}@ FAM\n`;
          out += `1 HUSB @I${husb}@\n`;
          out += `1 WIFE @I${wife}@\n`;

          // Common children
          const commonChildren = m.childrenIds.filter((cid) => {
            const child = members.find((x) => x.id === cid);
            return child && child.parentIds.includes(spId);
          });

          for (const cid of commonChildren) {
            out += `1 CHIL @I${cid}@\n`;
          }
          famIndex++;
        }
      }
    }
  }

  out += '0 TRLR\n';
  return out;
}

/**
 * Truncate long text gracefully
 */
export function truncate(text: string, maxLen = 60): string {
  if (!text) return '';
  return text.length > maxLen ? text.slice(0, maxLen - 1) + '…' : text;
}
