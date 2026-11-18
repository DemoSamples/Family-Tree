import React from 'react';
import { FamilyMember } from '../types/family';
import { Language, t } from '../utils/i18n';
import { AlertTriangle, Trash2, X, User } from 'lucide-react';

interface ConfirmDeleteModalProps {
  isOpen: boolean;
  type: 'member' | 'all';
  targetMember?: FamilyMember | null;
  totalCount?: number;
  language: Language;
  onConfirm: () => void;
  onClose: () => void;
}

export const ConfirmDeleteModal: React.FC<ConfirmDeleteModalProps> = ({
  isOpen,
  type,
  targetMember,
  totalCount = 0,
  language,
  onConfirm,
  onClose,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white border border-stone-200 rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-150">
        {/* Modal Header */}
        <div className="p-4 bg-rose-50 border-b border-rose-100 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-rose-100 text-rose-700 flex items-center justify-center">
              <AlertTriangle className="w-4 h-4 text-rose-600" />
            </div>
            <div>
              <h3 className="text-sm font-serif font-bold text-rose-900">
                {type === 'member'
                  ? language === 'ne'
                    ? 'सदस्य हटाउन पुष्टि गर्नुहोस्'
                    : 'Confirm Member Deletion'
                  : language === 'ne'
                  ? 'सबै अभिलेख हटाएर खाली क्यानभास बनाउनुहोस्'
                  : 'Clear All Records to Blank Canvas'}
              </h3>
              <p className="text-[11px] text-rose-700 font-serif">
                {type === 'member'
                  ? language === 'ne'
                    ? 'यो कार्य पूर्ववत गर्न सकिँदैन'
                    : 'This action will disconnect genealogical links'
                  : language === 'ne'
                  ? 'सबै पारिवारिक डाटा स्थायी रूपमा हटाइनेछ'
                  : 'Entire family tree database will be cleared'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-stone-400 hover:text-stone-700 rounded-md transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 space-y-4">
          {type === 'member' && targetMember ? (
            <div className="space-y-3">
              <div className="p-3 bg-stone-50 border border-stone-200 rounded-lg flex items-center gap-3">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${
                    targetMember.gender === 'female'
                      ? 'bg-rose-100 text-rose-800'
                      : 'bg-sky-100 text-sky-800'
                  }`}
                >
                  {targetMember.firstName.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-stone-900 text-sm truncate">
                    {language === 'ne' && targetMember.firstNameNepali
                      ? `${targetMember.firstNameNepali} ${targetMember.lastNameNepali || ''}`
                      : `${targetMember.firstName} ${targetMember.lastName}`}
                  </div>
                  <div className="text-xs text-stone-500 font-serif">
                    {targetMember.birthYear} – {targetMember.isLiving ? 'जीवित (Living)' : targetMember.deathYear || 'स्वर्गीय (Deceased)'} · पुस्ता {targetMember.generation}
                  </div>
                </div>
              </div>

              <p className="text-xs text-stone-600 leading-relaxed font-serif">
                {language === 'ne'
                  ? `के तपाईं साँच्चै ${targetMember.firstNameNepali || targetMember.firstName} लाई पारिवारिक वंशवृक्षबाट हटाउन चाहनुहुन्छ? सम्बन्धित बुबा/आमा, सन्तान र दम्पतीका लिङ्कहरू सुरक्षित रूपमा अलग गरिनेछन्।`
                  : `Are you sure you want to remove ${targetMember.firstName} ${targetMember.lastName} from the tree? Associated parent, child, and spouse connections will be unlinked safely.`}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="p-3.5 bg-rose-50/70 border border-rose-200 rounded-lg text-rose-900 text-xs leading-relaxed font-serif">
                {language === 'ne' ? (
                  <span>
                    तपाईं हाल दर्ता भएका <strong>{totalCount}</strong> जना सदस्यहरूको सम्पूर्ण विवरण हटाउँदै हुनुहुन्छ। यसपछि तपाईंलाई पूर्ण रूपमा <strong>नयाँ खाली क्यानभास (Blank Fresh Canvas)</strong> प्राप्त हुनेछ।
                  </span>
                ) : (
                  <span>
                    You are about to delete all <strong>{totalCount}</strong> family records. This will reset the application to a <strong>completely blank, fresh canvas</strong> for you to build a new genealogy archive.
                  </span>
                )}
              </div>
              <p className="text-xs text-stone-500 font-serif italic">
                {language === 'ne'
                  ? 'सुझाव: यदि तपाईंलाई पुरानो डाटा पछि चाहिन्छ भने, डाटा पोर्टेबिलिटीबाट JSON वा GEDCOM फाइल डाउनलोड गर्न सक्नुहुन्छ।'
                  : 'Tip: You can export a GEDCOM or JSON backup before clearing if you wish to retain previous records.'}
              </p>
            </div>
          )}
        </div>

        {/* Modal Actions */}
        <div className="p-4 bg-stone-50 border-t border-stone-200 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-1.5 text-xs font-medium text-stone-700 bg-white border border-stone-300 rounded-lg hover:bg-stone-100 transition-colors"
          >
            {language === 'ne' ? 'रद्द गर्नुहोस् (Cancel)' : 'Cancel'}
          </button>
          <button
            type="button"
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className="px-4 py-1.5 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 active:bg-rose-800 rounded-lg transition-colors flex items-center gap-1.5 shadow-sm"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>
              {type === 'member'
                ? language === 'ne'
                  ? 'हटाउनुहोस् (Delete Member)'
                  : 'Delete Member'
                : language === 'ne'
                ? 'हो, सबै मेटाउनुहोस् (Clear Canvas)'
                : 'Yes, Clear All Records'}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};
