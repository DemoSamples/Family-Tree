import React, { useState } from 'react';
import { ResearcherUser, RolePermission, VersionSnapshot, FamilyMember } from '../types/family';
import {
  History,
  Shield,
  UserCheck,
  RotateCcw,
  CheckCircle2,
  XCircle,
  Plus,
  Clock,
  Sparkles,
  GitCommit,
  Users,
} from 'lucide-react';

interface CollaborationModalProps {
  versionHistory: VersionSnapshot[];
  currentUser: ResearcherUser;
  allResearchers: ResearcherUser[];
  onSwitchUser: (user: ResearcherUser) => void;
  onRollbackVersion: (snapshot: VersionSnapshot) => void;
  onAddResearcher: (user: Omit<ResearcherUser, 'id'>) => void;
}

export const CollaborationModal: React.FC<CollaborationModalProps> = ({
  versionHistory,
  currentUser,
  allResearchers,
  onSwitchUser,
  onRollbackVersion,
  onAddResearcher,
}) => {
  const [activeTab, setActiveTab] = useState<'versions' | 'permissions'>('versions');
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [inviteName, setInviteName] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<RolePermission>('contributing_researcher');
  const [inviteInstitution, setInviteInstitution] = useState('');

  const canRollback = currentUser.role === 'lead_genealogist';

  const handleInvite = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteName.trim() || !inviteEmail.trim()) return;

    onAddResearcher({
      name: inviteName.trim(),
      email: inviteEmail.trim(),
      role: inviteRole,
      institution: inviteInstitution.trim() || undefined,
      avatarColor: inviteRole === 'lead_genealogist' ? '#b45309' : inviteRole === 'contributing_researcher' ? '#1d4ed8' : '#047857',
    });

    setInviteName('');
    setInviteEmail('');
    setInviteInstitution('');
    setShowInviteForm(false);
  };

  const PERMISSION_MATRIX = [
    { action: 'View tree, search & highlight lineages', lead: true, editor: true, viewer: true },
    { action: 'Export genealogical data (GEDCOM & JSON)', lead: true, editor: true, viewer: true },
    { action: 'Add new family members & relatives', lead: true, editor: true, viewer: false },
    { action: 'Edit biographical details, vitals & citations', lead: true, editor: true, viewer: false },
    { action: 'Attach primary source documents & certificates', lead: true, editor: true, viewer: false },
    { action: 'Create milestone life events', lead: true, editor: true, viewer: false },
    { action: 'Delete members or disconnect lineages', lead: true, editor: false, viewer: false },
    { action: 'Rollback tree version history to prior snapshots', lead: true, editor: false, viewer: false },
    { action: 'Manage collaborator roles & permissions', lead: true, editor: false, viewer: false },
  ];

  return (
    <div className="space-y-6">
      {/* Collaboration Hub Top Header */}
      <div className="bg-stone-100 border border-stone-200 rounded-lg p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-base sm:text-lg font-serif font-bold text-stone-900">
              Researcher Collaboration & Governance
            </h3>
            <span className="text-xs uppercase tracking-wider font-mono text-stone-500 bg-stone-200 px-2 py-0.5 rounded">
              Multi-Curator
            </span>
          </div>
          <p className="text-xs text-stone-500 font-serif mt-0.5">
            Audit changes with point-in-time version rollback and enforce role-based archival controls.
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center p-1 bg-stone-200/80 rounded-md self-start md:self-auto">
          <button
            onClick={() => setActiveTab('versions')}
            className={`px-3 py-1.5 text-xs font-medium rounded transition-colors flex items-center gap-1.5 ${
              activeTab === 'versions'
                ? 'bg-stone-900 text-stone-100 shadow-2xs'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span>Version Audit Log ({versionHistory.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('permissions')}
            className={`px-3 py-1.5 text-xs font-medium rounded transition-colors flex items-center gap-1.5 ${
              activeTab === 'permissions'
                ? 'bg-stone-900 text-stone-100 shadow-2xs'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            <Shield className="w-3.5 h-3.5" />
            <span>Permission Matrix & Team ({allResearchers.length})</span>
          </button>
        </div>
      </div>

      {/* Current Researcher Session Banner */}
      <div className="bg-white border border-stone-200 rounded-lg p-3.5 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2.5">
          <div
            className="w-7 h-7 rounded-full text-white flex items-center justify-center font-bold text-xs"
            style={{ backgroundColor: currentUser.avatarColor }}
          >
            {currentUser.name.charAt(0)}
          </div>
          <div>
            <div className="font-semibold text-stone-900 flex items-center gap-1.5">
              <span>Current Session: {currentUser.name}</span>
              <span className="text-[11px] text-stone-500 font-serif">
                ({currentUser.email})
              </span>
            </div>
            <div className="text-[11px] text-stone-500">
              Role:{' '}
              <strong className="text-amber-900 capitalize">
                {currentUser.role.replace('_', ' ')}
              </strong>{' '}
              · {currentUser.institution || 'Independent Researcher'}
            </div>
          </div>
        </div>

        {/* Quick Role Switcher */}
        <div className="flex items-center gap-2">
          <span className="text-stone-500 font-serif">Test role perspective:</span>
          <select
            value={currentUser.id}
            onChange={(e) => {
              const u = allResearchers.find((r) => r.id === e.target.value);
              if (u) onSwitchUser(u);
            }}
            className="p-1.5 text-xs bg-stone-50 border border-stone-300 rounded font-medium text-stone-800"
          >
            {allResearchers.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name} ({r.role.replace('_', ' ')})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* TAB 1: VERSION HISTORY LOG */}
      {activeTab === 'versions' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-xs uppercase tracking-wider font-semibold text-stone-700">
              Version Timeline & Rollback Snapshots
            </h4>
            <span className="text-xs text-stone-500 font-serif">
              {canRollback
                ? 'Lead Genealogist permission active: rollback enabled'
                : 'Rollback requires Lead Genealogist permission'}
            </span>
          </div>

          <div className="bg-white border border-stone-200 rounded-lg overflow-hidden shadow-2xs divide-y divide-stone-100">
            {versionHistory.map((ver, idx) => {
              const isLatest = idx === 0;
              return (
                <div
                  key={ver.id}
                  className={`p-4 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                    isLatest ? 'bg-amber-50/40' : 'hover:bg-stone-50'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={`p-2 rounded-md shrink-0 mt-0.5 ${
                        isLatest
                          ? 'bg-amber-800 text-amber-50'
                          : 'bg-stone-100 text-stone-600'
                      }`}
                    >
                      <GitCommit className="w-4 h-4" />
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono font-bold text-stone-900">
                          v{ver.versionNumber}.0
                        </span>
                        {isLatest && (
                          <span className="text-[10px] bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded font-sans font-semibold">
                            Current Live State
                          </span>
                        )}
                        <span className="text-stone-300">·</span>
                        <span className="text-xs text-stone-500 font-mono">
                          {ver.timestamp}
                        </span>
                      </div>

                      <p className="text-xs text-stone-800 font-medium mt-1">
                        {ver.description}
                      </p>

                      <div className="text-[11px] text-stone-500 font-serif mt-0.5 flex items-center gap-2">
                        <span>Curated by: {ver.author}</span>
                        <span>·</span>
                        <span className="capitalize">
                          {ver.authorRole.replace('_', ' ')}
                        </span>
                        <span>·</span>
                        <span>{ver.state.length} members in tree</span>
                      </div>
                    </div>
                  </div>

                  {/* Rollback Action */}
                  <div>
                    {!isLatest && (
                      <button
                        onClick={() => onRollbackVersion(ver)}
                        disabled={!canRollback}
                        className={`px-3 py-1.5 text-xs font-medium rounded-md flex items-center gap-1.5 transition-colors whitespace-nowrap ${
                          canRollback
                            ? 'bg-white border border-stone-300 hover:bg-stone-100 text-stone-800 shadow-2xs'
                            : 'bg-stone-100 text-stone-400 cursor-not-allowed border border-stone-200'
                        }`}
                        title={
                          canRollback
                            ? `Revert tree to state at v${ver.versionNumber}.0`
                            : 'Requires Lead Genealogist role to rollback'
                        }
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>Revert to this Version</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 2: PERMISSION SETTINGS & TEAM */}
      {activeTab === 'permissions' && (
        <div className="space-y-6">
          {/* Active Researchers List */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs uppercase tracking-wider font-semibold text-stone-700">
                Authorized Genealogical Researchers
              </h4>
              <button
                onClick={() => setShowInviteForm(!showInviteForm)}
                className="text-xs text-amber-800 hover:text-amber-950 font-medium flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>{showInviteForm ? 'Cancel' : 'Invite Researcher'}</span>
              </button>
            </div>

            {/* Invite Form */}
            {showInviteForm && (
              <form
                onSubmit={handleInvite}
                className="p-4 bg-stone-50 border border-stone-200 rounded-lg space-y-3 animate-in fade-in duration-150"
              >
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="text-[11px] font-semibold text-stone-600 block mb-1">
                      Full Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={inviteName}
                      onChange={(e) => setInviteName(e.target.value)}
                      placeholder="e.g. Dr. Julian Vance"
                      className="w-full text-xs p-1.5 border border-stone-300 rounded bg-white"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-stone-600 block mb-1">
                      Email Address *
                    </label>
                    <input
                      type="email"
                      required
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      placeholder="e.g. j.vance@archival.org"
                      className="w-full text-xs p-1.5 border border-stone-300 rounded bg-white"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-stone-600 block mb-1">
                      Permission Role
                    </label>
                    <select
                      value={inviteRole}
                      onChange={(e) => setInviteRole(e.target.value as RolePermission)}
                      className="w-full text-xs p-1.5 border border-stone-300 rounded bg-white"
                    >
                      <option value="lead_genealogist">Lead Genealogist (Full)</option>
                      <option value="contributing_researcher">Contributing Researcher (Edit)</option>
                      <option value="read_only_historian">Read-Only Historian (View)</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-stone-600 block mb-1">
                    Affiliated Institution or Archive (Optional)
                  </label>
                  <input
                    type="text"
                    value={inviteInstitution}
                    onChange={(e) => setInviteInstitution(e.target.value)}
                    placeholder="e.g. Library of Congress, Family Historian"
                    className="w-full text-xs p-1.5 border border-stone-300 rounded bg-white"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setShowInviteForm(false)}
                    className="px-2.5 py-1 text-xs text-stone-600 hover:bg-stone-200 rounded"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-3 py-1 text-xs bg-amber-800 text-white rounded font-medium hover:bg-amber-900"
                  >
                    Authorize Collaborator
                  </button>
                </div>
              </form>
            )}

            {/* Researcher Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {allResearchers.map((res) => (
                <div
                  key={res.id}
                  className="p-3.5 bg-white border border-stone-200 rounded-lg space-y-2"
                >
                  <div className="flex items-center gap-2.5">
                    <div
                      className="w-8 h-8 rounded-full text-white flex items-center justify-center font-bold text-xs shrink-0"
                      style={{ backgroundColor: res.avatarColor }}
                    >
                      {res.name.charAt(0)}
                    </div>
                    <div>
                      <h5 className="text-xs font-semibold text-stone-900">
                        {res.name}
                      </h5>
                      <span className="text-[11px] text-stone-500 font-serif block">
                        {res.email}
                      </span>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-stone-100 flex items-center justify-between text-[11px]">
                    <span className="font-semibold text-amber-900 capitalize">
                      {res.role.replace('_', ' ')}
                    </span>
                    <span className="text-stone-400 font-serif">
                      {res.institution || 'Archivist'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Role-Based Permissions Matrix */}
          <div className="space-y-3">
            <h4 className="text-xs uppercase tracking-wider font-semibold text-stone-700">
              Role Capabilities & Access Control Matrix
            </h4>

            <div className="bg-white border border-stone-200 rounded-lg overflow-hidden shadow-2xs">
              <table className="w-full text-left text-xs">
                <thead className="bg-stone-50 border-b border-stone-200 text-stone-600 font-semibold text-[11px]">
                  <tr>
                    <th className="py-2.5 px-4">Archival Operation / Capability</th>
                    <th className="py-2.5 px-4 text-center">Lead Genealogist</th>
                    <th className="py-2.5 px-4 text-center">Contributing Researcher</th>
                    <th className="py-2.5 px-4 text-center">Read-Only Historian</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100 text-stone-700">
                  {PERMISSION_MATRIX.map((row, i) => (
                    <tr key={i} className="hover:bg-stone-50">
                      <td className="py-2.5 px-4 font-medium text-stone-900">
                        {row.action}
                      </td>
                      <td className="py-2.5 px-4 text-center">
                        {row.lead ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 mx-auto" />
                        ) : (
                          <XCircle className="w-4 h-4 text-stone-300 mx-auto" />
                        )}
                      </td>
                      <td className="py-2.5 px-4 text-center">
                        {row.editor ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 mx-auto" />
                        ) : (
                          <XCircle className="w-4 h-4 text-stone-300 mx-auto" />
                        )}
                      </td>
                      <td className="py-2.5 px-4 text-center">
                        {row.viewer ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 mx-auto" />
                        ) : (
                          <XCircle className="w-4 h-4 text-stone-300 mx-auto" />
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
