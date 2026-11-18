export type Gender = 'male' | 'female' | 'non-binary' | 'other';

export type RolePermission = 'lead_genealogist' | 'contributing_researcher' | 'read_only_historian';

export interface ResearcherUser {
  id: string;
  name: string;
  email: string;
  role: RolePermission;
  avatarColor: string;
  institution?: string;
  isCurrentUser?: boolean;
}

export interface LifeEvent {
  id: string;
  year: number;
  date?: string;
  title: string;
  description: string;
  location?: string;
  category: 'birth' | 'death' | 'marriage' | 'education' | 'military' | 'migration' | 'award' | 'residence' | 'other';
  citation?: string;
}

export interface DocumentAttachment {
  id: string;
  title: string;
  type: 'census' | 'birth_cert' | 'death_cert' | 'marriage_cert' | 'military' | 'portrait' | 'letter' | 'newspaper' | 'award' | 'other';
  date?: string;
  sourceUrl?: string;
  archiveReference?: string;
  description?: string;
  transcription?: string;
}

export interface FamilyMember {
  id: string;
  firstName: string;
  lastName: string;
  firstNameNepali?: string;
  lastNameNepali?: string;
  maidenName?: string;
  gotra?: string;
  gender: Gender;
  birthYear: number;
  birthDate?: string;
  birthPlace?: string;
  deathYear?: number;
  deathDate?: string;
  deathPlace?: string;
  isLiving: boolean;
  avatarUrl?: string;
  avatarFallbackBg?: string;
  avatarFallbackIcon?: string;
  occupation?: string;
  bio?: string;
  parentIds: string[]; // ids of parents
  spouseIds: string[]; // ids of spouses/partners
  childrenIds: string[]; // ids of children
  events: LifeEvent[];
  documents: DocumentAttachment[];
  generation?: number;
  tags?: string[];
  notes?: string;
  lastEditedBy?: string;
  lastEditedAt?: string;
}

export interface VersionSnapshot {
  id: string;
  versionNumber: number;
  timestamp: string;
  author: string;
  authorRole: RolePermission;
  description: string;
  changeType: 'create' | 'update' | 'delete' | 'relationship' | 'restore';
  affectedMemberName?: string;
  state: FamilyMember[];
}

export interface TreeFilterOptions {
  searchQuery: string;
  selectedEra: [number, number]; // [minYear, maxYear]
  livingOnly: boolean;
  selectedBranch?: string;
  selectedGeneration?: number | 'all';
}
