import React, { useState } from 'react';
import { FamilyMember, VersionSnapshot } from '../types/family';
import { exportToGEDCOM } from '../utils/genealogy';
import { X, Download, Upload, FileCode, RotateCcw, Check, AlertCircle } from 'lucide-react';

interface ExportImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  members: FamilyMember[];
  versionHistory: VersionSnapshot[];
  onImportData: (importedMembers: FamilyMember[]) => void;
  onResetDefault: () => void;
  isReadOnly: boolean;
}

export const ExportImportModal: React.FC<ExportImportModalProps> = ({
  isOpen,
  onClose,
  members,
  versionHistory,
  onImportData,
  onResetDefault,
  isReadOnly,
}) => {
  const [importStatus, setImportStatus] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleDownloadGEDCOM = () => {
    const gedcomText = exportToGEDCOM(members, 'Montgomery-Vance Dynasty Archive');
    const blob = new Blob([gedcomText], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `family_tree_${new Date().toISOString().split('T')[0]}.ged`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadJSON = () => {
    const data = {
      archiveTitle: 'Kinship Archive Family Tree',
      exportedAt: new Date().toISOString(),
      membersCount: members.length,
      members,
      versionHistory,
    };
    const jsonStr = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `kinship_archive_${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const parsed = JSON.parse(text);
        if (parsed.members && Array.isArray(parsed.members)) {
          onImportData(parsed.members);
          setImportStatus(`Successfully imported ${parsed.members.length} members!`);
          setTimeout(() => {
            onClose();
          }, 1200);
        } else if (Array.isArray(parsed)) {
          onImportData(parsed);
          setImportStatus(`Successfully imported ${parsed.length} members!`);
          setTimeout(() => {
            onClose();
          }, 1200);
        } else {
          setImportStatus('Error: JSON file missing valid "members" array.');
        }
      } catch (err) {
        setImportStatus('Failed to parse JSON file.');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white border border-stone-200 rounded-xl shadow-2xl w-full max-w-lg p-5 sm:p-6 space-y-5">
        <div className="flex items-center justify-between pb-3 border-b border-stone-200">
          <div>
            <h3 className="text-base font-serif font-bold text-stone-900">
              Genealogical Data Exchange
            </h3>
            <p className="text-xs text-stone-500 font-serif">
              Standard GEDCOM & JSON archival data portability
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-stone-500 hover:text-stone-900 rounded-md hover:bg-stone-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Status Message */}
        {importStatus && (
          <div
            className={`p-3 rounded-md text-xs flex items-center gap-2 ${
              importStatus.startsWith('Error') || importStatus.startsWith('Failed')
                ? 'bg-rose-50 text-rose-800 border border-rose-200'
                : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
            }`}
          >
            {importStatus.startsWith('Error') || importStatus.startsWith('Failed') ? (
              <AlertCircle className="w-4 h-4 shrink-0" />
            ) : (
              <Check className="w-4 h-4 shrink-0" />
            )}
            <span>{importStatus}</span>
          </div>
        )}

        {/* Export Section */}
        <div className="space-y-3">
          <h4 className="text-xs uppercase tracking-wider font-semibold text-stone-700">
            Export Genealogical Records
          </h4>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              onClick={handleDownloadGEDCOM}
              className="p-3 bg-stone-50 hover:bg-stone-100 border border-stone-200 rounded-lg text-left transition-colors group"
            >
              <div className="flex items-center gap-2 mb-1">
                <FileCode className="w-4 h-4 text-amber-800" />
                <span className="text-xs font-semibold text-stone-900">
                  Standard GEDCOM (.ged)
                </span>
              </div>
              <p className="text-[11px] text-stone-500 font-serif">
                Universal format compatible with Ancestry, FamilySearch & Gramps.
              </p>
            </button>

            <button
              onClick={handleDownloadJSON}
              className="p-3 bg-stone-50 hover:bg-stone-100 border border-stone-200 rounded-lg text-left transition-colors group"
            >
              <div className="flex items-center gap-2 mb-1">
                <Download className="w-4 h-4 text-sky-800" />
                <span className="text-xs font-semibold text-stone-900">
                  Full Archive (.json)
                </span>
              </div>
              <p className="text-[11px] text-stone-500 font-serif">
                Complete database backup including events, documents & audit history.
              </p>
            </button>
          </div>
        </div>

        {/* Import Section */}
        {!isReadOnly && (
          <div className="space-y-3 pt-3 border-t border-stone-200">
            <h4 className="text-xs uppercase tracking-wider font-semibold text-stone-700">
              Import Archive File
            </h4>

            <label className="p-4 border-2 border-dashed border-stone-300 hover:border-amber-700 rounded-lg flex flex-col items-center justify-center cursor-pointer transition-colors text-center bg-stone-50/50">
              <Upload className="w-6 h-6 text-stone-400 mb-1.5" />
              <span className="text-xs font-medium text-stone-700">
                Click to upload JSON file
              </span>
              <span className="text-[11px] text-stone-400 font-serif mt-0.5">
                Restores or replaces current tree dataset
              </span>
              <input
                type="file"
                accept=".json"
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>
          </div>
        )}

        {/* Reset to Sample Dynasty */}
        {!isReadOnly && (
          <div className="pt-2 border-t border-stone-200 flex items-center justify-between">
            <div>
              <span className="text-xs font-semibold text-stone-700 block">
                Reset Sample Dataset
              </span>
              <span className="text-[11px] text-stone-500 font-serif">
                Restores the 5-generation Montgomery-Vance dynasty
              </span>
            </div>

            <button
              onClick={() => {
                onResetDefault();
                onClose();
              }}
              className="px-3 py-1.5 text-xs text-stone-600 hover:text-stone-900 border border-stone-300 rounded hover:bg-stone-50 flex items-center gap-1.5 transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset Demo</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
