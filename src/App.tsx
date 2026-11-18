import React, { useState, useEffect, useMemo } from 'react';
import {
  FamilyMember,
  ResearcherUser,
  VersionSnapshot,
  LifeEvent,
  DocumentAttachment,
} from './types/family';
import {
  INITIAL_FAMILY_MEMBERS,
  INITIAL_RESEARCHERS,
  INITIAL_VERSION_HISTORY,
} from './data/initialFamilyData';
import { recalculateGenerations, wasAliveInEra } from './utils/genealogy';
import { TopBar } from './components/TopBar';
import { TreeCanvas } from './components/TreeCanvas';
import { TimelineEraSlider } from './components/TimelineEraSlider';
import { TimelineView } from './components/TimelineView';
import { ListView } from './components/ListView';
import { CollaborationModal } from './components/CollaborationModal';
import { PersonDetailModal } from './components/PersonDetailModal';
import { PersonFormModal } from './components/PersonFormModal';
import { ExportImportModal } from './components/ExportImportModal';
import { ConfirmDeleteModal } from './components/ConfirmDeleteModal';

import { CanvasWorkspace } from './db/knowledgeGraphStore';
import { AIAssistantDrawer } from './components/AIAssistantDrawer';
import { Language, t } from './utils/i18n';

const STORAGE_MEMBERS_KEY = 'kinship_archive_members_v2';
const STORAGE_HISTORY_KEY = 'kinship_archive_history_v2';
const STORAGE_RESEARCHERS_KEY = 'kinship_archive_researchers_v1';
const STORAGE_WORKSPACES_KEY = 'kinship_archive_workspaces_v1';
const STORAGE_LANG_KEY = 'kinship_archive_lang_v1';

const DEFAULT_WORKSPACES: CanvasWorkspace[] = [
  {
    id: 'global',
    title: 'Global Knowledge Graph',
    description: 'Comprehensive canvas showing all family lineage clusters',
    includedNodeIds: [],
    isDefault: true,
    createdAt: '2026-09-30',
  },
];

export default function App() {
  // Language State: 'ne' (Nepali) or 'en' (English)
  const [language, setLanguage] = useState<Language>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_LANG_KEY);
      if (saved === 'en' || saved === 'ne') return saved;
    } catch (e) {}
    return 'ne'; // Default to Nepali localization
  });

  const [isEraBarOpen, setIsEraBarOpen] = useState(false);

  // Status Notification Toast
  const [toastMessage, setToastMessage] = useState<{
    text: string;
    type: 'success' | 'info' | 'error';
  } | null>(null);

  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => setToastMessage(null), 3500);
      return () => clearTimeout(timer);
    }
  }, [toastMessage]);

  // Delete & Clear Confirmation Modal State
  const [deleteModalState, setDeleteModalState] = useState<{
    isOpen: boolean;
    type: 'member' | 'all';
    targetMember?: FamilyMember | null;
  }>({
    isOpen: false,
    type: 'member',
  });

  // Members State: Defaults to empty [] to ensure a fresh blank canvas as requested
  const [members, setMembers] = useState<FamilyMember[]>(() => {
    try {
      // Clear legacy sample keys
      localStorage.removeItem('kinship_archive_members_v1');
      const saved = localStorage.getItem(STORAGE_MEMBERS_KEY);
      if (saved !== null) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (e) {
      console.error('Failed to load saved members', e);
    }
    return []; // Blank fresh canvas by default!
  });

  // Workspaces State
  const [workspaces, setWorkspaces] = useState<CanvasWorkspace[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_WORKSPACES_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      console.error('Failed to load saved workspaces', e);
    }
    return DEFAULT_WORKSPACES;
  });

  const [activeWorkspaceId, setActiveWorkspaceId] = useState<string>('global');
  const [isAIAssistantOpen, setIsAIAssistantOpen] = useState(false);

  // Version History State
  const [versionHistory, setVersionHistory] = useState<VersionSnapshot[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_HISTORY_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      console.error('Failed to load saved history', e);
    }
    return INITIAL_VERSION_HISTORY;
  });

  // Researchers State
  const [researchers, setResearchers] = useState<ResearcherUser[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_RESEARCHERS_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      console.error('Failed to load saved researchers', e);
    }
    return INITIAL_RESEARCHERS;
  });

  // Active Researcher
  const [currentUser, setCurrentUser] = useState<ResearcherUser>(researchers[0]);

  // Active View Tab: 'graph' | 'timeline' | 'directory' | 'collaboration'
  const [activeView, setActiveView] = useState<'graph' | 'timeline' | 'directory' | 'collaboration'>('graph');

  // Selected Member for Lineage Highlighting
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);

  // Era Range Slider: [startYear, endYear]
  const [eraRange, setEraRange] = useState<[number, number]>([1870, 2026]);

  // Modals State
  const [dossierMember, setDossierMember] = useState<FamilyMember | null>(null);
  const [formModalOpen, setFormModalOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<FamilyMember | null>(null);
  const [defaultRelation, setDefaultRelation] = useState<{
    targetMember: FamilyMember;
    relationType: 'parent' | 'child' | 'spouse';
  } | null>(null);
  const [exportImportOpen, setExportImportOpen] = useState(false);

  // Synchronize to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_MEMBERS_KEY, JSON.stringify(members));
    } catch (e) {
      console.error('Error saving members', e);
    }
  }, [members]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_HISTORY_KEY, JSON.stringify(versionHistory));
    } catch (e) {
      console.error('Error saving history', e);
    }
  }, [versionHistory]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_WORKSPACES_KEY, JSON.stringify(workspaces));
    } catch (e) {
      console.error('Error saving workspaces', e);
    }
  }, [workspaces]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_RESEARCHERS_KEY, JSON.stringify(researchers));
    } catch (e) {
      console.error('Error saving researchers', e);
    }
  }, [researchers]);

  // Keep dossier member synchronized if members array updates
  useEffect(() => {
    if (dossierMember) {
      const refreshed = members.find((m) => m.id === dossierMember.id);
      if (refreshed) {
        setDossierMember(refreshed);
      }
    }
  }, [members]);

  const isReadOnly = currentUser.role === 'read_only_historian';

  // Workspace Handlers
  const handleCreateWorkspace = (newWs: Omit<CanvasWorkspace, 'id' | 'createdAt'>) => {
    const ws: CanvasWorkspace = {
      id: `ws-${Date.now()}`,
      createdAt: new Date().toISOString().split('T')[0],
      ...newWs,
    };
    const updated = [...workspaces, ws];
    setWorkspaces(updated);
    setActiveWorkspaceId(ws.id);
  };

  const handleDeleteWorkspace = (id: string) => {
    if (id === 'global') return;
    const remaining = workspaces.filter((w) => w.id !== id);
    setWorkspaces(remaining);
    if (activeWorkspaceId === id) {
      setActiveWorkspaceId('global');
    }
  };

  // Link Relationship between two members
  const handleLinkRelationship = (personAId: string, personBId: string, relType: string) => {
    const pA = members.find((m) => m.id === personAId);
    const pB = members.find((m) => m.id === personBId);
    if (!pA || !pB) return;

    let updated = members.map((m) => {
      if (relType === 'parent_of' || relType === 'parent') {
        // personA is parent of personB
        if (m.id === personBId && !m.parentIds.includes(personAId)) {
          return { ...m, parentIds: [...m.parentIds, personAId] };
        }
        if (m.id === personAId && !m.childrenIds.includes(personBId)) {
          return { ...m, childrenIds: [...m.childrenIds, personBId] };
        }
      } else if (relType === 'spouse_of' || relType === 'spouse') {
        if (m.id === personAId && !m.spouseIds.includes(personBId)) {
          return { ...m, spouseIds: [...m.spouseIds, personBId] };
        }
        if (m.id === personBId && !m.spouseIds.includes(personAId)) {
          return { ...m, spouseIds: [...m.spouseIds, personAId] };
        }
      }
      return m;
    });

    updated = recalculateGenerations(updated);
    setMembers(updated);
    appendVersion(
      updated,
      `Linked ${pA.firstName} ${pA.lastName} and ${pB.firstName} ${pB.lastName} as ${relType}.`,
      'relationship',
      `${pA.firstName} & ${pB.firstName}`
    );
  };

  // Helper to append version snapshot
  const appendVersion = (
    updatedMembers: FamilyMember[],
    description: string,
    changeType: VersionSnapshot['changeType'],
    affectedName?: string
  ) => {
    const nextVerNumber = (versionHistory[0]?.versionNumber || 1) + 1;
    const now = new Date();
    const timestamp = `${now.toISOString().split('T')[0]} ${now.toTimeString().slice(0, 5)}`;

    const newSnapshot: VersionSnapshot = {
      id: `ver-${Date.now()}`,
      versionNumber: nextVerNumber,
      timestamp,
      author: currentUser.name,
      authorRole: currentUser.role,
      description,
      changeType,
      affectedMemberName: affectedName,
      state: updatedMembers,
    };

    setVersionHistory([newSnapshot, ...versionHistory]);
  };

  // Add or Edit Member with bidirectional link sync
  const handleSaveMember = (
    memberData: Omit<FamilyMember, 'id' | 'events' | 'documents'> & { id?: string }
  ) => {
    let targetId = memberData.id;
    const isNew = !targetId;

    if (!targetId) {
      targetId = `mem-${Date.now()}`;
    }

    const now = new Date();
    const nowStr = `${now.toISOString().split('T')[0]} ${now.toTimeString().slice(0, 5)}`;

    // Build the updated or new member object
    const existing = members.find((m) => m.id === targetId);
    const newMemberRecord: FamilyMember = {
      id: targetId,
      firstName: memberData.firstName,
      lastName: memberData.lastName,
      maidenName: memberData.maidenName,
      gender: memberData.gender,
      birthYear: memberData.birthYear,
      birthDate: memberData.birthDate,
      birthPlace: memberData.birthPlace,
      isLiving: memberData.isLiving,
      deathYear: memberData.deathYear,
      deathDate: memberData.deathDate,
      deathPlace: memberData.deathPlace,
      occupation: memberData.occupation,
      bio: memberData.bio,
      tags: memberData.tags,
      notes: memberData.notes,
      parentIds: memberData.parentIds,
      spouseIds: memberData.spouseIds,
      childrenIds: memberData.childrenIds,
      events: existing ? existing.events : [
        {
          id: `ev-${Date.now()}`,
          year: memberData.birthYear,
          date: memberData.birthDate,
          title: `Birth of ${memberData.firstName} ${memberData.lastName}`,
          description: `Recorded birth in ${memberData.birthPlace || 'unspecified location'}.`,
          location: memberData.birthPlace,
          category: 'birth',
        },
      ],
      documents: existing ? existing.documents : [],
      lastEditedBy: currentUser.name,
      lastEditedAt: nowStr,
    };

    // Update list with this member first
    let updatedList = isNew
      ? [...members, newMemberRecord]
      : members.map((m) => (m.id === targetId ? newMemberRecord : m));

    // Maintain bidirectional connections across all other members
    const newParentSet = new Set(newMemberRecord.parentIds);
    const newSpouseSet = new Set(newMemberRecord.spouseIds);
    const newChildrenSet = new Set(newMemberRecord.childrenIds);

    updatedList = updatedList.map((m) => {
      if (m.id === targetId) return m;

      let cIds = [...m.childrenIds];
      let pIds = [...m.parentIds];
      let sIds = [...m.spouseIds];

      // 1. If m is marked as a parent of newMemberRecord, ensure newMemberRecord is in m.childrenIds
      if (newParentSet.has(m.id)) {
        if (!cIds.includes(targetId!)) cIds.push(targetId!);
      } else {
        // If m was previously a parent, remove targetId
        cIds = cIds.filter((cid) => cid !== targetId);
      }

      // 2. If m is marked as spouse of newMemberRecord
      if (newSpouseSet.has(m.id)) {
        if (!sIds.includes(targetId!)) sIds.push(targetId!);
      } else {
        sIds = sIds.filter((sid) => sid !== targetId);
      }

      // 3. If m is marked as child of newMemberRecord
      if (newChildrenSet.has(m.id)) {
        if (!pIds.includes(targetId!)) pIds.push(targetId!);
      } else {
        pIds = pIds.filter((pid) => pid !== targetId);
      }

      return {
        ...m,
        childrenIds: cIds,
        parentIds: pIds,
        spouseIds: sIds,
      };
    });

    // Recalculate generational depth
    updatedList = recalculateGenerations(updatedList);
    setMembers(updatedList);

    // Append version
    const desc = isNew
      ? `Added new genealogical record for ${newMemberRecord.firstName} ${newMemberRecord.lastName}.`
      : `Updated record and vital details for ${newMemberRecord.firstName} ${newMemberRecord.lastName}.`;

    appendVersion(
      updatedList,
      desc,
      isNew ? 'create' : 'update',
      `${newMemberRecord.firstName} ${newMemberRecord.lastName}`
    );

    setEditingMember(null);
    setDefaultRelation(null);
  };

  // Delete Member Request (Opens in-app Confirmation Dialog)
  const handleRequestDeleteMember = (memberId: string) => {
    const target = members.find((m) => m.id === memberId);
    if (!target) return;
    setDeleteModalState({
      isOpen: true,
      type: 'member',
      targetMember: target,
    });
  };

  // Clear Entire Canvas Request (Opens in-app Confirmation Dialog)
  const handleRequestClearAll = () => {
    setDeleteModalState({
      isOpen: true,
      type: 'all',
      targetMember: null,
    });
  };

  // Execute single member deletion after confirmation
  const executeDeleteMember = (memberId: string) => {
    const target = members.find((m) => m.id === memberId);
    if (!target) return;

    // Clean references across remaining members
    let updatedList = members
      .filter((m) => m.id !== memberId)
      .map((m) => ({
        ...m,
        parentIds: m.parentIds.filter((id) => id !== memberId),
        spouseIds: m.spouseIds.filter((id) => id !== memberId),
        childrenIds: m.childrenIds.filter((id) => id !== memberId),
      }));

    updatedList = recalculateGenerations(updatedList);
    setMembers(updatedList);

    if (selectedMemberId === memberId) setSelectedMemberId(null);
    if (dossierMember?.id === memberId) setDossierMember(null);

    appendVersion(
      updatedList,
      `Removed family record for ${target.firstName} ${target.lastName}.`,
      'delete',
      `${target.firstName} ${target.lastName}`
    );

    setToastMessage({
      text: language === 'ne'
        ? `सदस्य "${target.firstNameNepali || target.firstName}" सफलतापूर्वक हटाइयो।`
        : `Record for "${target.firstName} ${target.lastName}" removed.`,
      type: 'success',
    });
  };

  // Execute clear all records to create a blank fresh canvas
  const executeClearAllRecords = () => {
    setMembers([]);
    setSelectedMemberId(null);
    setDossierMember(null);
    try {
      localStorage.setItem(STORAGE_MEMBERS_KEY, JSON.stringify([]));
    } catch (e) {}

    appendVersion(
      [],
      'Cleared all genealogical records to create a blank fresh canvas.',
      'delete',
      'Entire Tree'
    );

    setToastMessage({
      text: language === 'ne'
        ? 'सबै पारिवारिक अभिलेखहरू सफलतापूर्वक हटाइयो। खाली क्यानभास तयार छ।'
        : 'All records deleted. Fresh blank canvas ready.',
      type: 'info',
    });
  };

  // Load sample Montgomery-Vance dynasty
  const handleLoadSampleDynasty = () => {
    const sample = recalculateGenerations(INITIAL_FAMILY_MEMBERS);
    setMembers(sample);
    try {
      localStorage.setItem(STORAGE_MEMBERS_KEY, JSON.stringify(sample));
    } catch (e) {}

    appendVersion(
      sample,
      'Restored sample Montgomery-Vance dynasty dataset.',
      'restore',
      'Sample Dynasty'
    );

    setToastMessage({
      text: language === 'ne'
        ? '५ पुस्ताको ऐतिहासिक नमूना वंशवृक्ष लोड गरियो।'
        : 'Sample genealogical dynasty dataset loaded.',
      type: 'success',
    });
  };

  // Add Event to Member
  const handleAddEvent = (memberId: string, eventData: Omit<LifeEvent, 'id'>) => {
    const target = members.find((m) => m.id === memberId);
    if (!target) return;

    const newEvent: LifeEvent = {
      id: `ev-${Date.now()}`,
      ...eventData,
    };

    const updatedList = members.map((m) =>
      m.id === memberId ? { ...m, events: [...m.events, newEvent] } : m
    );

    setMembers(updatedList);
    appendVersion(
      updatedList,
      `Recorded "${eventData.title}" milestone for ${target.firstName} ${target.lastName}.`,
      'update',
      `${target.firstName} ${target.lastName}`
    );
  };

  // Add Document to Member
  const handleAddDocument = (memberId: string, docData: Omit<DocumentAttachment, 'id'>) => {
    const target = members.find((m) => m.id === memberId);
    if (!target) return;

    const newDoc: DocumentAttachment = {
      id: `doc-${Date.now()}`,
      ...docData,
    };

    const updatedList = members.map((m) =>
      m.id === memberId ? { ...m, documents: [...m.documents, newDoc] } : m
    );

    setMembers(updatedList);
    appendVersion(
      updatedList,
      `Attached archival document "${docData.title}" to ${target.firstName} ${target.lastName}.`,
      'update',
      `${target.firstName} ${target.lastName}`
    );
  };

  // Version Rollback
  const handleRollbackVersion = (snapshot: VersionSnapshot) => {
    if (currentUser.role !== 'lead_genealogist') {
      setToastMessage({
        text: 'Only Lead Genealogists have authorization to rollback versions.',
        type: 'error',
      });
      return;
    }

    const restoredState = recalculateGenerations(snapshot.state);
    setMembers(restoredState);
    setSelectedMemberId(null);
    setDossierMember(null);

    appendVersion(
      restoredState,
      `Restored tree archive to Version ${snapshot.versionNumber}.0 (${snapshot.timestamp}).`,
      'restore',
      'Entire Tree'
    );

    setToastMessage({
      text: `Restored tree archive to Version ${snapshot.versionNumber}.0`,
      type: 'success',
    });
  };

  // Quick Add Relation from node or dossier
  const handleQuickAddRelation = (
    targetMember: FamilyMember,
    relationType: 'parent' | 'child' | 'spouse'
  ) => {
    setDefaultRelation({ targetMember, relationType });
    setEditingMember(null);
    setFormModalOpen(true);
  };

  // Reset to default sample dynasty
  const handleResetDefault = () => {
    const refreshed = recalculateGenerations(INITIAL_FAMILY_MEMBERS);
    setMembers(refreshed);
    setVersionHistory(INITIAL_VERSION_HISTORY);
    setSelectedMemberId(null);
    setDossierMember(null);
    localStorage.removeItem(STORAGE_MEMBERS_KEY);
    localStorage.removeItem(STORAGE_HISTORY_KEY);
  };

  // Active in era count
  const activeInEraCount = useMemo(() => {
    return members.filter((m) => wasAliveInEra(m, eraRange[0], eraRange[1])).length;
  }, [members, eraRange]);

  return (
    <div className="min-h-screen bg-stone-50 flex flex-col font-sans">
      {/* Universal Top Bar */}
      <TopBar
        activeView={activeView}
        onSelectView={setActiveView}
        currentUser={currentUser}
        allResearchers={researchers}
        onSwitchUser={setCurrentUser}
        onOpenAddMember={() => {
          setEditingMember(null);
          setDefaultRelation(null);
          setFormModalOpen(true);
        }}
        onOpenExportImport={() => setExportImportOpen(true)}
        onToggleAIAssistant={() => setIsAIAssistantOpen(!isAIAssistantOpen)}
        isAIAssistantOpen={isAIAssistantOpen}
        totalMembersCount={members.length}
        language={language}
        onToggleLanguage={() => {
          const next = language === 'en' ? 'ne' : 'en';
          setLanguage(next);
          try {
            localStorage.setItem(STORAGE_LANG_KEY, next);
          } catch (e) {}
        }}
      />

      {/* Main Content Area - Maximized Screen for Canvas */}
      {activeView === 'graph' ? (
        <div className="flex-1 w-full relative flex flex-col p-1.5 sm:p-2 overflow-hidden h-[calc(100vh-56px)]">
          {/* Collapsible Era Slider Overlay if toggled */}
          {isEraBarOpen && (
            <div className="absolute top-16 left-4 right-4 z-40 max-w-2xl mx-auto shadow-2xl animate-in slide-in-from-top-3 duration-200">
              <TimelineEraSlider
                eraRange={eraRange}
                onEraChange={setEraRange}
                minYear={1870}
                maxYear={2026}
                activeMemberCount={activeInEraCount}
                totalMembersCount={members.length}
                language={language}
              />
            </div>
          )}

          <TreeCanvas
            members={members}
            selectedMemberId={selectedMemberId}
            onSelectMember={setSelectedMemberId}
            onOpenDetails={setDossierMember}
            onQuickAddRelation={handleQuickAddRelation}
            onEditMember={(m) => {
              setEditingMember(m);
              setDefaultRelation(null);
              setFormModalOpen(true);
            }}
            onDeleteMember={handleRequestDeleteMember}
            onClearAllRecords={handleRequestClearAll}
            onLoadSampleData={handleResetDefault}
            onOpenAddMember={() => {
              setEditingMember(null);
              setDefaultRelation(null);
              setFormModalOpen(true);
            }}
            eraRange={eraRange}
            isReadOnly={isReadOnly}
            workspaces={workspaces}
            activeWorkspaceId={activeWorkspaceId}
            onSelectWorkspace={setActiveWorkspaceId}
            onCreateWorkspace={handleCreateWorkspace}
            onDeleteWorkspace={handleDeleteWorkspace}
            language={language}
            onToggleEraBar={() => setIsEraBarOpen(!isEraBarOpen)}
            isEraBarOpen={isEraBarOpen}
          />
        </div>
      ) : (
        <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 flex flex-col gap-6">
          {/* Historical Era Range Slider Bar for non-canvas views */}
          <TimelineEraSlider
            eraRange={eraRange}
            onEraChange={setEraRange}
            minYear={1870}
            maxYear={2026}
            activeMemberCount={activeInEraCount}
            totalMembersCount={members.length}
            language={language}
          />

          {/* View 2: Chronological Ancestry Timeline */}
          {activeView === 'timeline' && (
            <TimelineView
              members={members}
              selectedMemberId={selectedMemberId}
              onSelectMember={setSelectedMemberId}
              onOpenDetails={setDossierMember}
              eraRange={eraRange}
              isReadOnly={isReadOnly}
            />
          )}

          {/* View 3: List & Table Directory */}
          {activeView === 'directory' && (
            <ListView
              members={members}
              selectedMemberId={selectedMemberId}
              onSelectMember={setSelectedMemberId}
              onOpenDetails={setDossierMember}
              onEditMember={(m) => {
                setEditingMember(m);
                setDefaultRelation(null);
                setFormModalOpen(true);
              }}
              onDeleteMember={handleRequestDeleteMember}
              onQuickAddRelation={handleQuickAddRelation}
              eraRange={eraRange}
              isReadOnly={isReadOnly}
              language={language}
            />
          )}

          {/* View 4: Researcher Collaboration, Audit Log & Permissions */}
          {activeView === 'collaboration' && (
            <CollaborationModal
              versionHistory={versionHistory}
              currentUser={currentUser}
              allResearchers={researchers}
              onSwitchUser={setCurrentUser}
              onRollbackVersion={handleRollbackVersion}
              onAddResearcher={(newRes) => {
                const resWithId: ResearcherUser = {
                  id: `res-${Date.now()}`,
                  ...newRes,
                };
                setResearchers([...researchers, resWithId]);
              }}
            />
          )}
        </main>
      )}

      {/* Footer */}
      <footer className="border-t border-stone-200 bg-stone-100/80 py-4 px-6 mt-auto text-xs text-stone-500">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="font-serif font-semibold text-stone-700">Kinship Archive</span>
            <span>·</span>
            <span>Genealogical lineage mapping and chronological research archive</span>
          </div>
          <div className="flex items-center gap-3 text-[11px] font-serif">
            <span>{members.length} Kinship records</span>
            <span>·</span>
            <span>v{versionHistory[0]?.versionNumber || 1}.0 current revision</span>
          </div>
        </div>
      </footer>

      {/* Modal 1: Individual Biographical Dossier & Primary Sources */}
      <PersonDetailModal
        member={dossierMember}
        allMembers={members}
        onClose={() => setDossierMember(null)}
        onSelectMember={(id) => {
          setSelectedMemberId(id);
          const next = members.find((m) => m.id === id);
          if (next) setDossierMember(next);
        }}
        onEditMember={(m) => {
          setEditingMember(m);
          setDossierMember(null);
          setFormModalOpen(true);
        }}
        onDeleteMember={handleRequestDeleteMember}
        onQuickAddRelation={handleQuickAddRelation}
        onAddEvent={handleAddEvent}
        onAddDocument={handleAddDocument}
        isReadOnly={isReadOnly}
      />

      {/* Modal 2: Add or Edit Family Member */}
      <PersonFormModal
        isOpen={formModalOpen}
        onClose={() => {
          setFormModalOpen(false);
          setEditingMember(null);
          setDefaultRelation(null);
        }}
        onSave={handleSaveMember}
        initialMember={editingMember}
        allMembers={members}
        defaultRelation={defaultRelation}
        language={language}
      />

      {/* Modal 3: Export & Import GEDCOM / JSON */}
      <ExportImportModal
        isOpen={exportImportOpen}
        onClose={() => setExportImportOpen(false)}
        members={members}
        versionHistory={versionHistory}
        onImportData={(imported) => {
          const recalculated = recalculateGenerations(imported);
          setMembers(recalculated);
          appendVersion(recalculated, `Imported dataset of ${imported.length} members.`, 'create', 'Dataset Import');
        }}
        onResetDefault={handleResetDefault}
        isReadOnly={isReadOnly}
      />

      {/* AI Assistant Conversational Drawer */}
      <AIAssistantDrawer
        isOpen={isAIAssistantOpen}
        onClose={() => setIsAIAssistantOpen(false)}
        members={members}
        onAddMember={(data) => {
          handleSaveMember(data);
        }}
        onEditMember={(data) => {
          const target = members.find((m) => m.id === data.memberId);
          if (target) {
            handleSaveMember({
              ...target,
              ...data,
              id: target.id,
            });
          }
        }}
        onLinkRelationship={handleLinkRelationship}
        onCreateWorkspace={(ws) => {
          handleCreateWorkspace(ws);
          setActiveView('graph');
        }}
        onAddLifeEvent={handleAddEvent}
        onSelectMember={(id) => {
          setSelectedMemberId(id);
          setActiveView('graph');
        }}
        onDeleteMember={handleRequestDeleteMember}
        onClearAllRecords={executeClearAllRecords}
        isReadOnly={isReadOnly}
      />

      {/* In-App Confirmation Modal for Deleting Member or Clearing All Records */}
      <ConfirmDeleteModal
        isOpen={deleteModalState.isOpen}
        type={deleteModalState.type}
        targetMember={deleteModalState.targetMember}
        totalCount={members.length}
        language={language}
        onConfirm={() => {
          if (deleteModalState.type === 'member' && deleteModalState.targetMember) {
            executeDeleteMember(deleteModalState.targetMember.id);
          } else if (deleteModalState.type === 'all') {
            executeClearAllRecords();
          }
        }}
        onClose={() => setDeleteModalState({ isOpen: false, type: 'member' })}
      />

      {/* Floating Status Notification Toast */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 animate-in fade-in slide-in-from-bottom-3 duration-200 pointer-events-none">
          <div
            className={`px-4 py-2.5 rounded-xl shadow-xl border text-xs font-serif flex items-center gap-2.5 pointer-events-auto ${
              toastMessage.type === 'error'
                ? 'bg-rose-50 text-rose-900 border-rose-200'
                : toastMessage.type === 'info'
                ? 'bg-amber-50 text-amber-900 border-amber-200'
                : 'bg-emerald-50 text-emerald-900 border-emerald-200'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-current"></span>
            <span>{toastMessage.text}</span>
          </div>
        </div>
      )}
    </div>
  );
}
