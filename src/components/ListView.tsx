import React, { useState, useMemo } from 'react';
import { FamilyMember } from '../types/family';
import { getLineageHighlightIds, wasAliveInEra } from '../utils/genealogy';
import {
  Search,
  Filter,
  User,
  Eye,
  Edit2,
  Trash2,
  UserPlus,
  Sparkles,
  Heart,
  Baby,
  FileText,
  ArrowUpDown,
} from 'lucide-react';

interface ListViewProps {
  members: FamilyMember[];
  selectedMemberId: string | null;
  onSelectMember: (id: string | null) => void;
  onOpenDetails: (member: FamilyMember) => void;
  onEditMember: (member: FamilyMember) => void;
  onDeleteMember: (id: string) => void;
  onQuickAddRelation: (targetMember: FamilyMember, relationType: 'parent' | 'child' | 'spouse') => void;
  eraRange: [number, number];
  isReadOnly: boolean;
  language?: 'en' | 'ne';
}

export const ListView: React.FC<ListViewProps> = ({
  members,
  selectedMemberId,
  onSelectMember,
  onOpenDetails,
  onEditMember,
  onDeleteMember,
  onQuickAddRelation,
  eraRange,
  isReadOnly,
  language = 'en',
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [generationFilter, setGenerationFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'living' | 'deceased'>('all');
  const [sortField, setSortField] = useState<'birthYear' | 'name' | 'generation'>('birthYear');
  const [sortAsc, setSortAsc] = useState<boolean>(true);

  const lineage = useMemo(() => {
    return getLineageHighlightIds(selectedMemberId, members);
  }, [selectedMemberId, members]);

  // Unique generations
  const generations = useMemo(() => {
    const set = new Set<number>();
    members.forEach((m) => {
      if (m.generation) set.add(m.generation);
    });
    return Array.from(set).sort((a, b) => a - b);
  }, [members]);

  // Filtering
  const filteredMembers = useMemo(() => {
    return members
      .filter((m) => {
        // Search
        const full = `${m.firstName} ${m.lastName} ${m.maidenName || ''} ${m.occupation || ''} ${m.birthPlace || ''}`.toLowerCase();
        if (searchTerm && !full.includes(searchTerm.toLowerCase())) return false;

        // Generation
        if (generationFilter !== 'all' && m.generation !== Number(generationFilter)) return false;

        // Status
        if (statusFilter === 'living' && !m.isLiving) return false;
        if (statusFilter === 'deceased' && m.isLiving) return false;

        return true;
      })
      .sort((a, b) => {
        if (sortField === 'birthYear') {
          return sortAsc ? a.birthYear - b.birthYear : b.birthYear - a.birthYear;
        }
        if (sortField === 'generation') {
          const gA = a.generation || 1;
          const gB = b.generation || 1;
          return sortAsc ? gA - gB : gB - gA;
        }
        const nameA = `${a.lastName}, ${a.firstName}`;
        const nameB = `${b.lastName}, ${b.firstName}`;
        return sortAsc ? nameA.localeCompare(nameB) : nameB.localeCompare(nameA);
      });
  }, [members, searchTerm, generationFilter, statusFilter, sortField, sortAsc]);

  const toggleSort = (field: 'birthYear' | 'name' | 'generation') => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(true);
    }
  };

  return (
    <div className="space-y-4">
      {/* Search & Filter Bar */}
      <div className="bg-stone-100 border border-stone-200 rounded-lg p-3 lg:p-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex-1 flex flex-wrap items-center gap-2.5">
          {/* Search Input */}
          <div className="relative min-w-[240px] flex-1 max-w-sm">
            <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by name, maiden surname, occupation, or place..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-stone-300 rounded-md focus:outline-none focus:ring-1 focus:ring-amber-700"
            />
          </div>

          {/* Generation Filter */}
          <select
            value={generationFilter}
            onChange={(e) => setGenerationFilter(e.target.value)}
            className="text-xs bg-white border border-stone-300 rounded-md py-1.5 px-2.5 text-stone-700 focus:outline-none focus:ring-1 focus:ring-amber-700"
          >
            <option value="all">All Generations</option>
            {generations.map((g) => (
              <option key={g} value={g}>
                Generation {g}
              </option>
            ))}
          </select>

          {/* Living Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="text-xs bg-white border border-stone-300 rounded-md py-1.5 px-2.5 text-stone-700 focus:outline-none focus:ring-1 focus:ring-amber-700"
          >
            <option value="all">All Statuses</option>
            <option value="living">Living Members Only</option>
            <option value="deceased">Deceased Ancestors</option>
          </select>
        </div>

        <div className="text-xs text-stone-500 font-serif">
          Showing {filteredMembers.length} of {members.length} members
        </div>
      </div>

      {/* Directory Table */}
      <div className="bg-white border border-stone-200 rounded-lg overflow-hidden shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-stone-50 border-b border-stone-200 text-stone-600 uppercase tracking-wider font-semibold text-[11px]">
              <tr>
                <th className="py-3 px-4">
                  <button
                    onClick={() => toggleSort('name')}
                    className="flex items-center gap-1 hover:text-stone-900 transition-colors"
                  >
                    <span>Member Name</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </button>
                </th>
                <th className="py-3 px-4">
                  <button
                    onClick={() => toggleSort('birthYear')}
                    className="flex items-center gap-1 hover:text-stone-900 transition-colors"
                  >
                    <span>Lifespan / Era</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </button>
                </th>
                <th className="py-3 px-4">
                  <button
                    onClick={() => toggleSort('generation')}
                    className="flex items-center gap-1 hover:text-stone-900 transition-colors"
                  >
                    <span>Generation</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </button>
                </th>
                <th className="py-3 px-4">Immediate Kin</th>
                <th className="py-3 px-4">Records & Archive</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {filteredMembers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-stone-500">
                    No family records match the current search or filters.
                  </td>
                </tr>
              ) : (
                filteredMembers.map((member) => {
                  const isSelected = member.id === selectedMemberId;
                  const isAncestor = lineage.ancestorIds.has(member.id);
                  const isDescendant = lineage.descendantIds.has(member.id);
                  const isSpouse = lineage.spouseIds.has(member.id);
                  const isInEra = wasAliveInEra(member, eraRange[0], eraRange[1]);

                  return (
                    <tr
                      key={member.id}
                      className={`transition-colors ${
                        isSelected
                          ? 'bg-amber-50/80 font-medium'
                          : isAncestor
                          ? 'bg-blue-50/40'
                          : isDescendant
                          ? 'bg-emerald-50/40'
                          : isSpouse
                          ? 'bg-purple-50/40'
                          : 'hover:bg-stone-50'
                      }`}
                    >
                      {/* Name & Avatar */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2.5">
                          <div
                            className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold shrink-0 ${
                              member.gender === 'female'
                                ? 'bg-rose-100 text-rose-800'
                                : 'bg-sky-100 text-sky-800'
                            }`}
                          >
                            {member.firstName.charAt(0)}
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="font-semibold text-stone-900 text-sm">
                                {language === 'ne' && member.firstNameNepali
                                  ? `${member.firstNameNepali} ${member.lastNameNepali || ''}`
                                  : `${member.firstName} ${member.lastName}`}
                              </span>
                              {member.maidenName && (
                                <span className="text-stone-400 font-serif text-xs">
                                  (née {member.maidenName})
                                </span>
                              )}
                              {isSelected && (
                                <span className="text-[10px] bg-amber-800 text-amber-50 px-1.5 py-0.2 rounded font-sans">
                                  Focus
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-stone-500">
                              {language === 'ne' && member.firstNameNepali ? `${member.firstName} ${member.lastName} · ` : ''}
                              {member.occupation || 'No listed occupation'}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Lifespan with PROMINENT RED = DEAD, NORMAL = ALIVE BADGE */}
                      <td className="py-3 px-4 tabular-nums">
                        <div className="flex items-center gap-2">
                          <span className="text-stone-900 font-medium">
                            {member.birthYear} — {member.isLiving ? (language === 'ne' ? 'वर्तमान' : 'Present') : member.deathYear ?? '?'}
                          </span>
                          {!member.isLiving ? (
                            <span className="text-[10px] font-bold text-rose-700 bg-rose-100 border border-rose-300 px-1.5 py-0.2 rounded">
                              🔴 {language === 'ne' ? 'स्वर्गीय' : 'DEAD'}
                            </span>
                          ) : (
                            <span className="text-[10px] font-semibold text-emerald-800 bg-emerald-100 border border-emerald-300 px-1.5 py-0.2 rounded">
                              🟢 {language === 'ne' ? 'जीवित' : 'ALIVE'}
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-stone-500 font-serif">
                          {member.birthPlace ? member.birthPlace.split(',')[0] : 'Unknown origin'}
                        </div>
                      </td>

                      {/* Generation */}
                      <td className="py-3 px-4">
                        <span className="text-stone-700 font-medium">
                          Gen {member.generation || 1}
                        </span>
                        {isSelected ? (
                          <div className="text-[11px] text-amber-800 font-serif">Focal Root</div>
                        ) : isAncestor ? (
                          <div className="text-[11px] text-blue-700 font-serif">↑ Ancestor</div>
                        ) : isDescendant ? (
                          <div className="text-[11px] text-emerald-700 font-serif">↓ Descendant</div>
                        ) : isSpouse ? (
                          <div className="text-[11px] text-purple-700 font-serif">♥ Spouse</div>
                        ) : null}
                      </td>

                      {/* Immediate Kin */}
                      <td className="py-3 px-4 text-[11px] text-stone-600 space-y-0.5">
                        <div>
                          <span className="text-stone-400">Parents:</span>{' '}
                          {member.parentIds.length === 0 ? 'Root / Unknown' : `${member.parentIds.length} recorded`}
                        </div>
                        <div>
                          <span className="text-stone-400">Children:</span> {member.childrenIds.length}
                        </div>
                      </td>

                      {/* Records */}
                      <td className="py-3 px-4 text-[11px] text-stone-600">
                        <div className="flex items-center gap-1.5">
                          <FileText className="w-3 h-3 text-stone-400" />
                          <span>
                            {member.events.length} events · {member.documents.length} docs
                          </span>
                        </div>
                        {isInEra && (
                          <span className="text-[10px] text-amber-800 font-serif">
                            Active in {eraRange[0]}–{eraRange[1]}
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {/* Lineage highlight button */}
                          <button
                            onClick={() => onSelectMember(isSelected ? null : member.id)}
                            title={isSelected ? 'Clear highlight' : 'Highlight this lineage'}
                            className={`p-1.5 rounded transition-colors ${
                              isSelected
                                ? 'bg-amber-800 text-white'
                                : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
                            }`}
                          >
                            <Sparkles className="w-3.5 h-3.5" />
                          </button>

                          {/* Dossier button */}
                          <button
                            onClick={() => onOpenDetails(member)}
                            title="View Full Archival Dossier"
                            className="p-1.5 text-stone-600 hover:text-stone-900 hover:bg-stone-100 rounded transition-colors"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>

                          {!isReadOnly && (
                            <>
                              <button
                                onClick={() => onEditMember(member)}
                                title="Edit Record"
                                className="p-1.5 text-stone-600 hover:text-stone-900 hover:bg-stone-100 rounded transition-colors"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => onDeleteMember(member.id)}
                                title="Delete Member"
                                className="p-1.5 text-rose-600 hover:text-rose-900 hover:bg-rose-50 rounded transition-colors"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
