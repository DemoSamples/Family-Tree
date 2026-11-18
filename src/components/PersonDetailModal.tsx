import React, { useState } from 'react';
import { FamilyMember, LifeEvent, DocumentAttachment } from '../types/family';
import {
  X,
  User,
  Heart,
  Baby,
  Users,
  MapPin,
  Calendar,
  Briefcase,
  FileText,
  Sparkles,
  Plus,
  Trash2,
  Edit2,
  ExternalLink,
  Shield,
  Clock,
  BookOpen,
  Image,
} from 'lucide-react';

interface PersonDetailModalProps {
  member: FamilyMember | null;
  allMembers: FamilyMember[];
  onClose: () => void;
  onSelectMember: (id: string | null) => void;
  onEditMember: (member: FamilyMember) => void;
  onDeleteMember: (id: string) => void;
  onQuickAddRelation: (targetMember: FamilyMember, relationType: 'parent' | 'child' | 'spouse') => void;
  onAddEvent: (memberId: string, event: Omit<LifeEvent, 'id'>) => void;
  onAddDocument: (memberId: string, doc: Omit<DocumentAttachment, 'id'>) => void;
  isReadOnly: boolean;
}

export const PersonDetailModal: React.FC<PersonDetailModalProps> = ({
  member,
  allMembers,
  onClose,
  onSelectMember,
  onEditMember,
  onDeleteMember,
  onQuickAddRelation,
  onAddEvent,
  onAddDocument,
  isReadOnly,
}) => {
  const [activeTab, setActiveTab] = useState<'bio' | 'kinship' | 'events' | 'documents'>('bio');
  const [showAddEventForm, setShowAddEventForm] = useState(false);
  const [showAddDocForm, setShowAddDocForm] = useState(false);

  // New Event Form State
  const [newEvYear, setNewEvYear] = useState<number>(1950);
  const [newEvTitle, setNewEvTitle] = useState('');
  const [newEvDesc, setNewEvDesc] = useState('');
  const [newEvLoc, setNewEvLoc] = useState('');
  const [newEvCat, setNewEvCat] = useState<LifeEvent['category']>('other');
  const [newEvCitation, setNewEvCitation] = useState('');

  // New Doc Form State
  const [newDocTitle, setNewDocTitle] = useState('');
  const [newDocType, setNewDocType] = useState<DocumentAttachment['type']>('census');
  const [newDocRef, setNewDocRef] = useState('');
  const [newDocDesc, setNewDocDesc] = useState('');
  const [newDocTranscription, setNewDocTranscription] = useState('');

  if (!member) return null;

  // Kin lookup
  const parents = allMembers.filter((m) => member.parentIds.includes(m.id));
  const spouses = allMembers.filter((m) => member.spouseIds.includes(m.id));
  const children = allMembers.filter((m) => member.childrenIds.includes(m.id));

  // Derived siblings (share at least one parent)
  const siblings = allMembers.filter(
    (m) =>
      m.id !== member.id &&
      m.parentIds.some((pId) => member.parentIds.includes(pId))
  );

  const handleCreateEvent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEvTitle.trim()) return;
    onAddEvent(member.id, {
      year: Number(newEvYear),
      title: newEvTitle,
      description: newEvDesc,
      location: newEvLoc,
      category: newEvCat,
      citation: newEvCitation,
    });
    setNewEvTitle('');
    setNewEvDesc('');
    setNewEvLoc('');
    setNewEvCitation('');
    setShowAddEventForm(false);
  };

  const handleCreateDocument = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDocTitle.trim()) return;
    onAddDocument(member.id, {
      title: newDocTitle,
      type: newDocType,
      archiveReference: newDocRef,
      description: newDocDesc,
      transcription: newDocTranscription,
    });
    setNewDocTitle('');
    setNewDocRef('');
    setNewDocDesc('');
    setNewDocTranscription('');
    setShowAddDocForm(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-stone-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white border border-stone-200 rounded-xl shadow-xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Modal Header */}
        <div className="p-4 sm:p-6 bg-stone-100 border-b border-stone-200 relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 text-stone-500 hover:text-stone-900 rounded-md hover:bg-stone-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            {/* Portrait Silhouette */}
            <div
              className={`w-16 h-16 sm:w-20 sm:h-20 rounded-lg flex items-center justify-center text-2xl font-serif font-bold shrink-0 border-2 shadow-sm ${
                member.gender === 'female'
                  ? 'bg-rose-50 text-rose-800 border-rose-200'
                  : 'bg-sky-50 text-sky-800 border-sky-200'
              }`}
            >
              {member.firstName.charAt(0)}
            </div>

            <div className="flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs uppercase tracking-widest font-mono text-stone-500">
                  Gen {member.generation || 1} · Record #{member.id.replace('mem-', '')}
                </span>
                <span className="text-stone-300">·</span>
                {/* PROMINENT RED = DEAD, NORMAL = ALIVE BADGE */}
                {!member.isLiving ? (
                  <span className="text-xs font-bold text-rose-700 bg-rose-100 border border-rose-300 px-2 py-0.5 rounded flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-rose-600 inline-block animate-pulse"></span>
                    <span>🔴 स्वर्गीय (Deceased / Dead)</span>
                  </span>
                ) : (
                  <span className="text-xs font-semibold text-emerald-800 bg-emerald-100 border border-emerald-300 px-2 py-0.5 rounded flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-600 inline-block"></span>
                    <span>🟢 जीवित (Living / Alive)</span>
                  </span>
                )}
                {member.gotra && (
                  <>
                    <span className="text-stone-300">·</span>
                    <span className="text-xs text-amber-900 font-serif bg-amber-50 border border-amber-200 px-2 py-0.5 rounded">
                      गोत्र: {member.gotra}
                    </span>
                  </>
                )}
              </div>

              <h2 className="text-xl sm:text-2xl font-serif font-bold text-stone-900 mt-1">
                {member.firstNameNepali ? `${member.firstNameNepali} ${member.lastNameNepali || ''} · ` : ''}
                {member.firstName} {member.lastName}
                {member.maidenName && (
                  <span className="text-stone-500 font-normal ml-1.5 text-base">
                    (née {member.maidenName})
                  </span>
                )}
              </h2>

              <div className="flex flex-wrap items-center gap-3 text-xs text-stone-600 mt-1.5 font-serif">
                <div className="flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-stone-400" />
                  <span>
                    {member.birthYear} — {member.isLiving ? 'Present' : member.deathYear ?? '?'}
                  </span>
                </div>
                {member.birthPlace && (
                  <div className="flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-stone-400" />
                    <span>{member.birthPlace}</span>
                  </div>
                )}
                {member.occupation && (
                  <div className="flex items-center gap-1">
                    <Briefcase className="w-3.5 h-3.5 text-stone-400" />
                    <span>{member.occupation}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Quick Actions in Header */}
            <div className="flex items-center gap-2 mt-2 sm:mt-0">
              <button
                onClick={() => {
                  onSelectMember(member.id);
                  onClose();
                }}
                className="px-3 py-1.5 bg-stone-900 hover:bg-stone-800 text-stone-50 rounded-md text-xs font-medium flex items-center gap-1.5 shadow-2xs transition-colors whitespace-nowrap"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                <span>Focus Lineage</span>
              </button>

              {!isReadOnly && (
                <button
                  onClick={() => onEditMember(member)}
                  className="p-1.5 text-stone-700 bg-white border border-stone-300 hover:bg-stone-50 rounded-md transition-colors"
                  title="Edit member details"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex items-center gap-2 mt-5 border-t border-stone-200/80 pt-3">
            {[
              { id: 'bio', label: 'Biography & Story', icon: BookOpen },
              { id: 'kinship', label: `Kinship & Links (${parents.length + spouses.length + children.length})`, icon: Users },
              { id: 'events', label: `Life Milestones (${member.events.length})`, icon: Clock },
              { id: 'documents', label: `Archival Sources (${member.documents.length})`, icon: FileText },
            ].map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors flex items-center gap-1.5 ${
                    activeTab === tab.id
                      ? 'bg-stone-900 text-white shadow-2xs'
                      : 'text-stone-600 hover:text-stone-900 hover:bg-stone-200/60'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Modal Scrollable Content Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6">
          {/* TAB 1: BIOGRAPHY */}
          {activeTab === 'bio' && (
            <div className="space-y-6">
              <div>
                <h4 className="text-xs uppercase tracking-wider font-semibold text-stone-500 mb-2">
                  Biographical Overview
                </h4>
                <p className="text-stone-800 text-sm leading-relaxed font-serif bg-stone-50 p-4 rounded-lg border border-stone-200 first-letter:text-3xl first-letter:font-serif first-letter:font-bold first-letter:float-left first-letter:mr-2">
                  {member.bio || 'No biographical overview recorded yet. Researchers may add notes and oral histories.'}
                </p>
              </div>

              {/* Tags & Subject Descriptors */}
              {member.tags && member.tags.length > 0 && (
                <div>
                  <h4 className="text-xs uppercase tracking-wider font-semibold text-stone-500 mb-2">
                    Lineage Historical Descriptors
                  </h4>
                  <div className="flex items-center gap-2 text-xs text-stone-600">
                    {member.tags.map((tag, idx) => (
                      <React.Fragment key={tag}>
                        {idx > 0 && <span aria-hidden="true" className="text-stone-300">·</span>}
                        <span>{tag}</span>
                      </React.Fragment>
                    ))}
                  </div>
                </div>
              )}

              {/* Researcher Notes */}
              {member.notes && (
                <div>
                  <h4 className="text-xs uppercase tracking-wider font-semibold text-stone-500 mb-2">
                    Archival & Provenance Notes
                  </h4>
                  <div className="p-3 bg-amber-50/60 border border-amber-200/80 rounded-lg text-xs text-stone-700 font-serif italic">
                    {member.notes}
                  </div>
                </div>
              )}

              {/* Vital Statistics Details Grid */}
              <div>
                <h4 className="text-xs uppercase tracking-wider font-semibold text-stone-500 mb-2">
                  Vital Statistics
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="p-3 bg-white border border-stone-200 rounded-md">
                    <span className="text-stone-400 block font-serif">Birth</span>
                    <span className="font-semibold text-stone-800">
                      {member.birthDate || member.birthYear}
                    </span>
                    <span className="text-stone-500 block">{member.birthPlace || 'Location not recorded'}</span>
                  </div>

                  <div className="p-3 bg-white border border-stone-200 rounded-md">
                    <span className="text-stone-400 block font-serif">Death</span>
                    <span className="font-semibold text-stone-800">
                      {member.isLiving ? 'Living' : member.deathDate || member.deathYear || 'Unknown date'}
                    </span>
                    <span className="text-stone-500 block">
                      {member.isLiving ? 'Current generation' : member.deathPlace || 'Location not recorded'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Curator stamp */}
              <div className="text-[11px] text-stone-400 font-serif pt-4 border-t border-stone-200 flex items-center justify-between">
                <span>
                  Last modified by {member.lastEditedBy || 'Genealogy Lead'} ({member.lastEditedAt || 'Recent'})
                </span>
                {!isReadOnly && (
                  <button
                    onClick={() => onDeleteMember(member.id)}
                    className="text-rose-600 hover:text-rose-800 flex items-center gap-1 text-xs"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete Record</span>
                  </button>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: KINSHIP & CONNECTIONS */}
          {activeTab === 'kinship' && (
            <div className="space-y-6">
              {/* Parents Section */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-xs uppercase tracking-wider font-semibold text-stone-700 flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-stone-500" />
                    <span>Parents ({parents.length})</span>
                  </h4>
                  {!isReadOnly && (
                    <button
                      onClick={() => onQuickAddRelation(member, 'parent')}
                      className="text-xs text-amber-800 hover:text-amber-950 font-medium flex items-center gap-1"
                    >
                      <Plus className="w-3 h-3" />
                      <span>Add Parent</span>
                    </button>
                  )}
                </div>

                {parents.length === 0 ? (
                  <div className="p-3 bg-stone-50 rounded-lg text-xs text-stone-500 font-serif border border-stone-200">
                    No parents currently linked (Lineage Root).
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {parents.map((p) => (
                      <div
                        key={p.id}
                        onClick={() => onSelectMember(p.id)}
                        className="p-2.5 rounded-lg border border-stone-200 hover:border-amber-600 bg-white cursor-pointer transition-colors flex items-center justify-between group"
                      >
                        <div>
                          <div className="font-semibold text-stone-900 text-xs">
                            {p.firstName} {p.lastName}
                          </div>
                          <div className="text-[11px] text-stone-500 font-serif">
                            {p.birthYear} — {p.isLiving ? 'Present' : p.deathYear ?? '?'}
                          </div>
                        </div>
                        <span className="text-[11px] text-amber-800 opacity-0 group-hover:opacity-100 transition-opacity">
                          View →
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Spouses Section */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-xs uppercase tracking-wider font-semibold text-stone-700 flex items-center gap-1.5">
                    <Heart className="w-3.5 h-3.5 text-rose-500" />
                    <span>Spouse & Partners ({spouses.length})</span>
                  </h4>
                  {!isReadOnly && (
                    <button
                      onClick={() => onQuickAddRelation(member, 'spouse')}
                      className="text-xs text-amber-800 hover:text-amber-950 font-medium flex items-center gap-1"
                    >
                      <Plus className="w-3 h-3" />
                      <span>Add Spouse</span>
                    </button>
                  )}
                </div>

                {spouses.length === 0 ? (
                  <div className="p-3 bg-stone-50 rounded-lg text-xs text-stone-500 font-serif border border-stone-200">
                    No spouse or partner records registered.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {spouses.map((sp) => (
                      <div
                        key={sp.id}
                        onClick={() => onSelectMember(sp.id)}
                        className="p-2.5 rounded-lg border border-stone-200 hover:border-amber-600 bg-white cursor-pointer transition-colors flex items-center justify-between group"
                      >
                        <div>
                          <div className="font-semibold text-stone-900 text-xs">
                            {sp.firstName} {sp.lastName}
                          </div>
                          <div className="text-[11px] text-stone-500 font-serif">
                            {sp.birthYear} — {sp.isLiving ? 'Present' : sp.deathYear ?? '?'}
                          </div>
                        </div>
                        <span className="text-[11px] text-amber-800 opacity-0 group-hover:opacity-100 transition-opacity">
                          View →
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Children Section */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-xs uppercase tracking-wider font-semibold text-stone-700 flex items-center gap-1.5">
                    <Baby className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Children ({children.length})</span>
                  </h4>
                  {!isReadOnly && (
                    <button
                      onClick={() => onQuickAddRelation(member, 'child')}
                      className="text-xs text-amber-800 hover:text-amber-950 font-medium flex items-center gap-1"
                    >
                      <Plus className="w-3 h-3" />
                      <span>Add Child</span>
                    </button>
                  )}
                </div>

                {children.length === 0 ? (
                  <div className="p-3 bg-stone-50 rounded-lg text-xs text-stone-500 font-serif border border-stone-200">
                    No recorded children.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {children.map((c) => (
                      <div
                        key={c.id}
                        onClick={() => onSelectMember(c.id)}
                        className="p-2.5 rounded-lg border border-stone-200 hover:border-amber-600 bg-white cursor-pointer transition-colors flex items-center justify-between group"
                      >
                        <div>
                          <div className="font-semibold text-stone-900 text-xs">
                            {c.firstName} {c.lastName}
                          </div>
                          <div className="text-[11px] text-stone-500 font-serif">
                            {c.birthYear} — {c.isLiving ? 'Present' : c.deathYear ?? '?'}
                          </div>
                        </div>
                        <span className="text-[11px] text-amber-800 opacity-0 group-hover:opacity-100 transition-opacity">
                          View →
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Derived Siblings */}
              {siblings.length > 0 && (
                <div>
                  <h4 className="text-xs uppercase tracking-wider font-semibold text-stone-700 mb-2">
                    Siblings ({siblings.length})
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {siblings.map((sib) => (
                      <div
                        key={sib.id}
                        onClick={() => onSelectMember(sib.id)}
                        className="p-2.5 rounded-lg border border-stone-200 hover:border-amber-600 bg-white cursor-pointer transition-colors flex items-center justify-between group"
                      >
                        <div>
                          <div className="font-semibold text-stone-900 text-xs">
                            {sib.firstName} {sib.lastName}
                          </div>
                          <div className="text-[11px] text-stone-500 font-serif">
                            {sib.birthYear} — {sib.isLiving ? 'Present' : sib.deathYear ?? '?'}
                          </div>
                        </div>
                        <span className="text-[11px] text-amber-800 opacity-0 group-hover:opacity-100 transition-opacity">
                          View →
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: LIFE MILESTONES */}
          {activeTab === 'events' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs text-stone-500 font-serif">
                  Chronological life sequence for {member.firstName}
                </span>
                {!isReadOnly && (
                  <button
                    onClick={() => setShowAddEventForm(!showAddEventForm)}
                    className="text-xs text-amber-800 hover:text-amber-950 font-medium flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>{showAddEventForm ? 'Cancel' : 'Add Milestone'}</span>
                  </button>
                )}
              </div>

              {/* Add Event Inline Form */}
              {showAddEventForm && (
                <form
                  onSubmit={handleCreateEvent}
                  className="p-3 bg-stone-50 border border-stone-200 rounded-lg space-y-3 animate-in fade-in duration-150"
                >
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <div>
                      <label className="text-[11px] font-semibold text-stone-600 block mb-1">
                        Year *
                      </label>
                      <input
                        type="number"
                        value={newEvYear}
                        onChange={(e) => setNewEvYear(Number(e.target.value))}
                        className="w-full text-xs p-1.5 border border-stone-300 rounded bg-white"
                        required
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-semibold text-stone-600 block mb-1">
                        Category
                      </label>
                      <select
                        value={newEvCat}
                        onChange={(e) => setNewEvCat(e.target.value as any)}
                        className="w-full text-xs p-1.5 border border-stone-300 rounded bg-white"
                      >
                        <option value="birth">Birth</option>
                        <option value="marriage">Marriage</option>
                        <option value="education">Education</option>
                        <option value="military">Military</option>
                        <option value="migration">Migration</option>
                        <option value="award">Honor / Award</option>
                        <option value="death">Death</option>
                        <option value="other">Other Milestone</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-[11px] font-semibold text-stone-600 block mb-1">
                        Location
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Boston, MA"
                        value={newEvLoc}
                        onChange={(e) => setNewEvLoc(e.target.value)}
                        className="w-full text-xs p-1.5 border border-stone-300 rounded bg-white"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-stone-600 block mb-1">
                      Event Title *
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Conferred Master's Degree"
                      value={newEvTitle}
                      onChange={(e) => setNewEvTitle(e.target.value)}
                      className="w-full text-xs p-1.5 border border-stone-300 rounded bg-white"
                      required
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-stone-600 block mb-1">
                      Description
                    </label>
                    <textarea
                      rows={2}
                      placeholder="Historical contextual details..."
                      value={newEvDesc}
                      onChange={(e) => setNewEvDesc(e.target.value)}
                      className="w-full text-xs p-1.5 border border-stone-300 rounded bg-white"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-stone-600 block mb-1">
                      Citation / Evidence Source
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Harvard University Alumni Records Vol. 12"
                      value={newEvCitation}
                      onChange={(e) => setNewEvCitation(e.target.value)}
                      className="w-full text-xs p-1.5 border border-stone-300 rounded bg-white"
                    />
                  </div>

                  <div className="flex justify-end gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setShowAddEventForm(false)}
                      className="px-2.5 py-1 text-xs text-stone-600 hover:bg-stone-200 rounded"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-3 py-1 text-xs bg-amber-800 text-white rounded font-medium hover:bg-amber-900"
                    >
                      Save Milestone
                    </button>
                  </div>
                </form>
              )}

              {/* Events List */}
              <div className="space-y-3">
                {member.events.length === 0 ? (
                  <p className="text-xs text-stone-500 font-serif p-4 text-center">
                    No milestone events recorded for this individual yet.
                  </p>
                ) : (
                  member.events
                    .sort((a, b) => a.year - b.year)
                    .map((ev) => (
                      <div
                        key={ev.id}
                        className="p-3 bg-stone-50 border border-stone-200 rounded-lg flex items-start gap-3"
                      >
                        <div className="text-xs font-mono font-bold text-amber-900 bg-amber-100/70 px-2 py-1 rounded shrink-0">
                          {ev.year}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <h5 className="text-xs font-semibold text-stone-900">
                              {ev.title}
                            </h5>
                            <span className="text-[10px] text-stone-400 capitalize">
                              {ev.category}
                            </span>
                          </div>
                          <p className="text-xs text-stone-600 mt-0.5">{ev.description}</p>
                          {ev.location && (
                            <div className="text-[11px] text-stone-500 mt-1 flex items-center gap-1">
                              <MapPin className="w-3 h-3 text-stone-400" />
                              <span>{ev.location}</span>
                            </div>
                          )}
                          {ev.citation && (
                            <div className="text-[11px] text-stone-400 font-serif italic mt-0.5">
                              Source: {ev.citation}
                            </div>
                          )}
                        </div>
                      </div>
                    ))
                )}
              </div>
            </div>
          )}

          {/* TAB 4: ARCHIVAL DOCUMENTS & MEDIA */}
          {activeTab === 'documents' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs text-stone-500 font-serif">
                  Primary historical sources and media evidence
                </span>
                {!isReadOnly && (
                  <button
                    onClick={() => setShowAddDocForm(!showAddDocForm)}
                    className="text-xs text-amber-800 hover:text-amber-950 font-medium flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>{showAddDocForm ? 'Cancel' : 'Attach Document'}</span>
                  </button>
                )}
              </div>

              {/* Add Document Inline Form */}
              {showAddDocForm && (
                <form
                  onSubmit={handleCreateDocument}
                  className="p-3 bg-stone-50 border border-stone-200 rounded-lg space-y-3 animate-in fade-in duration-150"
                >
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div>
                      <label className="text-[11px] font-semibold text-stone-600 block mb-1">
                        Document Title *
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. 1920 Federal Census Return"
                        value={newDocTitle}
                        onChange={(e) => setNewDocTitle(e.target.value)}
                        className="w-full text-xs p-1.5 border border-stone-300 rounded bg-white"
                        required
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-semibold text-stone-600 block mb-1">
                        Type
                      </label>
                      <select
                        value={newDocType}
                        onChange={(e) => setNewDocType(e.target.value as any)}
                        className="w-full text-xs p-1.5 border border-stone-300 rounded bg-white"
                      >
                        <option value="census">Census Record</option>
                        <option value="birth_cert">Birth Certificate</option>
                        <option value="death_cert">Death Certificate</option>
                        <option value="marriage_cert">Marriage Certificate</option>
                        <option value="military">Military Service Record</option>
                        <option value="portrait">Photograph / Portrait</option>
                        <option value="letter">Letter / Diary</option>
                        <option value="newspaper">Newspaper Clipping</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-stone-600 block mb-1">
                      Archive Accession Reference
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. NARA Microfilm Roll 1204, Sheet 4B"
                      value={newDocRef}
                      onChange={(e) => setNewDocRef(e.target.value)}
                      className="w-full text-xs p-1.5 border border-stone-300 rounded bg-white"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-stone-600 block mb-1">
                      Document Description / Context
                    </label>
                    <textarea
                      rows={2}
                      placeholder="Summary of provenance and record content..."
                      value={newDocDesc}
                      onChange={(e) => setNewDocDesc(e.target.value)}
                      className="w-full text-xs p-1.5 border border-stone-300 rounded bg-white"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-stone-600 block mb-1">
                      Exact Transcription (Optional)
                    </label>
                    <textarea
                      rows={2}
                      placeholder="Verbatim text extracted from historical document..."
                      value={newDocTranscription}
                      onChange={(e) => setNewDocTranscription(e.target.value)}
                      className="w-full text-xs p-1.5 border border-stone-300 rounded bg-white font-mono"
                    />
                  </div>

                  <div className="flex justify-end gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setShowAddDocForm(false)}
                      className="px-2.5 py-1 text-xs text-stone-600 hover:bg-stone-200 rounded"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-3 py-1 text-xs bg-amber-800 text-white rounded font-medium hover:bg-amber-900"
                    >
                      Save Document
                    </button>
                  </div>
                </form>
              )}

              {/* Documents List */}
              <div className="space-y-3">
                {member.documents.length === 0 ? (
                  <p className="text-xs text-stone-500 font-serif p-4 text-center">
                    No primary archival documents attached to this profile yet.
                  </p>
                ) : (
                  member.documents.map((doc) => (
                    <div
                      key={doc.id}
                      className="p-4 bg-stone-50 border border-stone-200 rounded-lg space-y-2"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2">
                          <FileText className="w-4 h-4 text-amber-800" />
                          <h5 className="text-xs font-semibold text-stone-900">
                            {doc.title}
                          </h5>
                        </div>
                        <span className="text-[10px] uppercase tracking-wider font-semibold text-stone-500 bg-white border border-stone-200 px-1.5 py-0.5 rounded">
                          {doc.type.replace('_', ' ')}
                        </span>
                      </div>

                      {doc.archiveReference && (
                        <div className="text-[11px] font-mono text-stone-500">
                          Ref: {doc.archiveReference}
                        </div>
                      )}

                      {doc.description && (
                        <p className="text-xs text-stone-600 leading-relaxed font-serif">
                          {doc.description}
                        </p>
                      )}

                      {doc.transcription && (
                        <div className="p-2.5 bg-white border border-stone-200 rounded text-[11px] font-mono text-stone-700 whitespace-pre-wrap">
                          <span className="text-[10px] text-stone-400 block font-sans uppercase mb-1">
                            Verbatim Transcription:
                          </span>
                          {doc.transcription}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
