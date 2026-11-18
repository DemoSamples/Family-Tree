import React from 'react';
import { ResearcherUser, RolePermission } from '../types/family';
import { Network, History, Users, GitBranch, Plus, ShieldCheck, Download, Languages, Sparkles } from 'lucide-react';
import { Language, t } from '../utils/i18n';

interface TopBarProps {
  activeView: 'graph' | 'timeline' | 'directory' | 'collaboration';
  onSelectView: (view: 'graph' | 'timeline' | 'directory' | 'collaboration') => void;
  currentUser: ResearcherUser;
  allResearchers: ResearcherUser[];
  onSwitchUser: (user: ResearcherUser) => void;
  onOpenAddMember: () => void;
  onOpenExportImport: () => void;
  onToggleAIAssistant: () => void;
  isAIAssistantOpen: boolean;
  totalMembersCount: number;
  language: Language;
  onToggleLanguage: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({
  activeView,
  onSelectView,
  currentUser,
  allResearchers,
  onSwitchUser,
  onOpenAddMember,
  onOpenExportImport,
  onToggleAIAssistant,
  isAIAssistantOpen,
  totalMembersCount,
  language,
  onToggleLanguage,
}) => {
  const isReadOnly = currentUser.role === 'read_only_historian';

  return (
    <header className="sticky top-0 z-40 bg-stone-100/95 backdrop-blur-md border-b border-stone-200 px-3 lg:px-5 py-2 transition-colors">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
        {/* Zone 1: Single text element wordmark */}
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-md bg-stone-800 flex items-center justify-center text-amber-100 font-display font-bold text-sm shadow-xs">
            K
          </div>
          <a
            href="#root"
            className="text-base lg:text-lg font-display font-semibold tracking-tight text-stone-900 hover:text-stone-700 transition-colors whitespace-nowrap"
          >
            {language === 'ne' ? 'वंशवृक्ष अभिलेख' : 'Kinship Archive'}
          </a>
          <span className="hidden xl:inline-block text-[11px] font-serif text-stone-500">
            · {totalMembersCount} {t('recordsCount', language)}
          </span>
        </div>

        {/* Zone 2: Navigation Links */}
        <nav className="flex items-center gap-1">
          <button
            onClick={() => onSelectView('graph')}
            className={`px-2.5 py-1 text-xs font-medium rounded-md transition-all flex items-center gap-1.5 whitespace-nowrap ${
              activeView === 'graph'
                ? 'bg-stone-900 text-stone-50 shadow-xs'
                : 'text-stone-600 hover:text-stone-900 hover:bg-stone-200/60'
            }`}
          >
            <Network className="w-3.5 h-3.5" />
            <span>{t('interactiveGraph', language)}</span>
          </button>

          <button
            onClick={() => onSelectView('timeline')}
            className={`px-2.5 py-1 text-xs font-medium rounded-md transition-all flex items-center gap-1.5 whitespace-nowrap ${
              activeView === 'timeline'
                ? 'bg-stone-900 text-stone-50 shadow-xs'
                : 'text-stone-600 hover:text-stone-900 hover:bg-stone-200/60'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span>{t('chronologicalEra', language)}</span>
          </button>

          <button
            onClick={() => onSelectView('directory')}
            className={`px-2.5 py-1 text-xs font-medium rounded-md transition-all flex items-center gap-1.5 whitespace-nowrap ${
              activeView === 'directory'
                ? 'bg-stone-900 text-stone-50 shadow-xs'
                : 'text-stone-600 hover:text-stone-900 hover:bg-stone-200/60'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>{t('directory', language)}</span>
          </button>

          <button
            onClick={() => onSelectView('collaboration')}
            className={`px-2.5 py-1 text-xs font-medium rounded-md transition-all flex items-center gap-1.5 whitespace-nowrap ${
              activeView === 'collaboration'
                ? 'bg-stone-900 text-stone-50 shadow-xs'
                : 'text-stone-600 hover:text-stone-900 hover:bg-stone-200/60'
            }`}
          >
            <GitBranch className="w-3.5 h-3.5" />
            <span>{t('auditAndRoles', language)}</span>
          </button>
        </nav>

        {/* Zone 3: Language Toggle, AI Assistant & Actions */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Nepalese Localization Toggle Button */}
          <button
            onClick={onToggleLanguage}
            className="px-2.5 py-1 text-xs font-semibold rounded-md border border-stone-300 bg-white hover:bg-stone-50 text-stone-800 transition-colors flex items-center gap-1 shadow-2xs"
            title={language === 'en' ? 'नेपाली भाषामा स्विच गर्नुहोस्' : 'Switch to English'}
          >
            <Languages className="w-3.5 h-3.5 text-amber-800" />
            <span className="font-sans">{language === 'en' ? 'नेपाली' : 'English'}</span>
          </button>

          {/* AI Assistant Button */}
          <button
            onClick={onToggleAIAssistant}
            className={`px-2.5 py-1 text-xs font-medium rounded-md transition-all flex items-center gap-1.5 shadow-2xs whitespace-nowrap ${
              isAIAssistantOpen
                ? 'bg-amber-100 text-amber-950 border border-amber-300 ring-1 ring-amber-400'
                : 'bg-white text-stone-700 hover:bg-stone-50 border border-stone-300'
            }`}
            title="Chat with AI Genealogist"
          >
            <Sparkles className="w-3 h-3 text-amber-700" />
            <span className="font-serif hidden sm:inline">{t('aiAssistant', language)}</span>
          </button>

          {/* Export / Import Button */}
          <button
            onClick={onOpenExportImport}
            title={t('exportImport', language)}
            className="p-1.5 text-stone-700 bg-white border border-stone-300 hover:bg-stone-50 rounded-md transition-colors shadow-2xs"
          >
            <Download className="w-3.5 h-3.5" />
          </button>

          {/* Primary Action: Add Family Member */}
          <button
            onClick={onOpenAddMember}
            disabled={isReadOnly}
            title={isReadOnly ? 'Read-only role' : t('addMember', language)}
            className={`px-2.5 py-1 text-xs font-medium rounded-md flex items-center gap-1 transition-all shadow-xs whitespace-nowrap ${
              isReadOnly
                ? 'bg-stone-300 text-stone-500 cursor-not-allowed'
                : 'bg-amber-800 text-stone-50 hover:bg-amber-900 active:scale-[0.98]'
            }`}
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{t('addMember', language)}</span>
          </button>
        </div>
      </div>
    </header>
  );
};
