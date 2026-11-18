import React, { useState, useEffect } from 'react';
import { FamilyMember, Gender } from '../types/family';
import { transliterateRomanToNepali } from '../utils/nepaliTransliteration';
import { Language, t } from '../utils/i18n';
import {
  X,
  User,
  Calendar,
  MapPin,
  Briefcase,
  Tag,
  Heart,
  Baby,
  Users,
  Languages,
  Sparkles,
  AlertCircle,
} from 'lucide-react';

interface PersonFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (memberData: Omit<FamilyMember, 'id' | 'events' | 'documents'> & { id?: string }) => void;
  initialMember?: FamilyMember | null;
  allMembers: FamilyMember[];
  defaultRelation?: {
    targetMember: FamilyMember;
    relationType: 'parent' | 'child' | 'spouse';
  } | null;
  language?: Language;
}

export const PersonFormModal: React.FC<PersonFormModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialMember,
  allMembers,
  defaultRelation,
  language = 'en',
}) => {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [firstNameNepali, setFirstNameNepali] = useState('');
  const [lastNameNepali, setLastNameNepali] = useState('');
  const [gotra, setGotra] = useState('');
  const [maidenName, setMaidenName] = useState('');
  const [gender, setGender] = useState<Gender>('male');
  const [birthYear, setBirthYear] = useState<number>(1975);
  const [birthDate, setBirthDate] = useState('');
  const [birthPlace, setBirthPlace] = useState('');
  const [isLiving, setIsLiving] = useState(true);
  const [deathYear, setDeathYear] = useState<number | undefined>(undefined);
  const [deathDate, setDeathDate] = useState('');
  const [deathPlace, setDeathPlace] = useState('');
  const [occupation, setOccupation] = useState('');
  const [bio, setBio] = useState('');
  const [tagsStr, setTagsStr] = useState('');
  const [notes, setNotes] = useState('');

  // Romanized typing mode toggle
  const [autoTransliterate, setAutoTransliterate] = useState(true);

  // Kinship selections
  const [selectedParentIds, setSelectedParentIds] = useState<string[]>([]);
  const [selectedSpouseIds, setSelectedSpouseIds] = useState<string[]>([]);
  const [selectedChildrenIds, setSelectedChildrenIds] = useState<string[]>([]);

  useEffect(() => {
    if (initialMember) {
      setFirstName(initialMember.firstName);
      setLastName(initialMember.lastName);
      setFirstNameNepali(initialMember.firstNameNepali || '');
      setLastNameNepali(initialMember.lastNameNepali || '');
      setGotra(initialMember.gotra || '');
      setMaidenName(initialMember.maidenName || '');
      setGender(initialMember.gender);
      setBirthYear(initialMember.birthYear);
      setBirthDate(initialMember.birthDate || '');
      setBirthPlace(initialMember.birthPlace || '');
      setIsLiving(initialMember.isLiving);
      setDeathYear(initialMember.deathYear);
      setDeathDate(initialMember.deathDate || '');
      setDeathPlace(initialMember.deathPlace || '');
      setOccupation(initialMember.occupation || '');
      setBio(initialMember.bio || '');
      setTagsStr(initialMember.tags ? initialMember.tags.join(', ') : '');
      setNotes(initialMember.notes || '');
      setSelectedParentIds(initialMember.parentIds || []);
      setSelectedSpouseIds(initialMember.spouseIds || []);
      setSelectedChildrenIds(initialMember.childrenIds || []);
    } else {
      setFirstName('');
      setLastName(defaultRelation ? defaultRelation.targetMember.lastName : 'Shrestha');
      setFirstNameNepali('');
      setLastNameNepali(defaultRelation ? defaultRelation.targetMember.lastNameNepali || 'श्रेष्ठ' : 'श्रेष्ठ');
      setGotra(defaultRelation ? defaultRelation.targetMember.gotra || 'कश्यप' : 'कश्यप');
      setMaidenName('');
      setGender('male');
      setBirthYear(
        defaultRelation
          ? defaultRelation.relationType === 'child'
            ? defaultRelation.targetMember.birthYear + 25
            : defaultRelation.targetMember.birthYear - 25
          : 1980
      );
      setBirthDate('');
      setBirthPlace('Kathmandu, Nepal');
      setIsLiving(true);
      setDeathYear(undefined);
      setDeathDate('');
      setDeathPlace('');
      setOccupation('');
      setBio('');
      setTagsStr('');
      setNotes('');

      if (defaultRelation) {
        if (defaultRelation.relationType === 'parent') {
          setSelectedParentIds([]);
          setSelectedChildrenIds([defaultRelation.targetMember.id]);
          setSelectedSpouseIds(
            defaultRelation.targetMember.parentIds.filter((p) => p !== defaultRelation.targetMember.id)
          );
        } else if (defaultRelation.relationType === 'child') {
          setSelectedParentIds([defaultRelation.targetMember.id]);
          setSelectedChildrenIds([]);
          setSelectedSpouseIds([]);
        } else if (defaultRelation.relationType === 'spouse') {
          setSelectedSpouseIds([defaultRelation.targetMember.id]);
          setSelectedParentIds([]);
          setSelectedChildrenIds(defaultRelation.targetMember.childrenIds);
        }
      } else {
        setSelectedParentIds([]);
        setSelectedSpouseIds([]);
        setSelectedChildrenIds([]);
      }
    }
  }, [initialMember, defaultRelation, isOpen]);

  if (!isOpen) return null;

  // Auto-transliterate English input to Devanagari if enabled
  const handleFirstNameChange = (val: string) => {
    setFirstName(val);
    if (autoTransliterate && (!firstNameNepali || firstNameNepali === transliterateRomanToNepali(firstName))) {
      setFirstNameNepali(transliterateRomanToNepali(val));
    }
  };

  const handleLastNameChange = (val: string) => {
    setLastName(val);
    if (autoTransliterate && (!lastNameNepali || lastNameNepali === transliterateRomanToNepali(lastName))) {
      setLastNameNepali(transliterateRomanToNepali(val));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstName.trim() || !lastName.trim()) return;

    const tags = tagsStr
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);

    onSave({
      id: initialMember?.id,
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      firstNameNepali: firstNameNepali.trim() || transliterateRomanToNepali(firstName.trim()),
      lastNameNepali: lastNameNepali.trim() || transliterateRomanToNepali(lastName.trim()),
      gotra: gotra.trim() || undefined,
      maidenName: maidenName.trim() || undefined,
      gender,
      birthYear: Number(birthYear),
      birthDate: birthDate || undefined,
      birthPlace: birthPlace.trim() || undefined,
      isLiving,
      deathYear: !isLiving && deathYear ? Number(deathYear) : undefined,
      deathDate: !isLiving ? deathDate || undefined : undefined,
      deathPlace: !isLiving ? deathPlace.trim() || undefined : undefined,
      occupation: occupation.trim() || undefined,
      bio: bio.trim() || undefined,
      tags,
      notes: notes.trim() || undefined,
      parentIds: selectedParentIds,
      spouseIds: selectedSpouseIds,
      childrenIds: selectedChildrenIds,
    });

    onClose();
  };

  const eligibleForParent = allMembers.filter((m) => m.id !== initialMember?.id);
  const eligibleForSpouse = allMembers.filter((m) => m.id !== initialMember?.id);
  const eligibleForChild = allMembers.filter((m) => m.id !== initialMember?.id);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-stone-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white border border-stone-200 rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header with Romanized toggle */}
        <div className="p-4 sm:p-5 bg-stone-100 border-b border-stone-200 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="text-base sm:text-lg font-serif font-bold text-stone-900">
              {initialMember
                ? language === 'ne'
                  ? 'पारिवारिक विवरण सम्पादन गर्नुहोस्'
                  : 'Edit Genealogical Record'
                : language === 'ne'
                ? 'नयाँ पारिवारिक सदस्य दर्ता गर्नुहोस्'
                : 'Record New Family Member'}
            </h3>
            <p className="text-xs text-stone-500 font-serif">
              {defaultRelation
                ? `Adding ${defaultRelation.relationType} for ${defaultRelation.targetMember.firstName} ${defaultRelation.targetMember.lastName}`
                : language === 'ne'
                ? 'नेपाली तथा अंग्रेजी दुवै भाषामा सहज प्रविष्टि (Localization Support)'
                : 'Easy bilingual entry in English or Nepali with Romanized transliteration'}
            </p>
          </div>

          <div className="flex items-center gap-2">
            {/* Romanized to Devanagari Switcher */}
            <button
              type="button"
              onClick={() => setAutoTransliterate(!autoTransliterate)}
              className={`px-2.5 py-1 text-xs font-medium rounded-md border flex items-center gap-1.5 transition-colors shadow-2xs ${
                autoTransliterate
                  ? 'bg-amber-100 border-amber-300 text-amber-900'
                  : 'bg-white border-stone-300 text-stone-600'
              }`}
              title="Automatically convert Romanized English (e.g. ram) to Devanagari (राम)"
            >
              <Languages className="w-3.5 h-3.5 text-amber-800" />
              <span>[A → क] {autoTransliterate ? 'रोमनाइज्ड सक्रिय' : 'रोमनाइज्ड बन्द'}</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 text-stone-500 hover:text-stone-900 rounded-md hover:bg-stone-200"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5">
          {/* CRITICAL DEAD OR ALIVE SELECTOR (RED = DEAD, NORMAL = ALIVE) */}
          <div className="p-3.5 rounded-lg border-2 bg-stone-50 transition-colors space-y-2">
            <span className="text-xs uppercase tracking-wider font-bold text-stone-700 block">
              {language === 'ne' ? 'जीवित वा स्वर्गीय स्थिति (Dead or Alive Status)' : 'Vital Status: Dead (Red) or Alive (Normal)'} *
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Alive option */}
              <label
                className={`p-3 rounded-lg border-2 cursor-pointer transition-all flex items-center gap-3 ${
                  isLiving
                    ? 'border-emerald-600 bg-emerald-50 text-emerald-950 ring-1 ring-emerald-400'
                    : 'border-stone-200 bg-white hover:bg-stone-50 text-stone-700'
                }`}
              >
                <input
                  type="radio"
                  name="livingStatus"
                  checked={isLiving}
                  onChange={() => setIsLiving(true)}
                  className="text-emerald-600 focus:ring-emerald-500"
                />
                <div>
                  <div className="font-bold text-xs flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 inline-block"></span>
                    <span>{language === 'ne' ? 'जीवित (Living / Alive)' : 'Alive (Living)'}</span>
                  </div>
                  <span className="text-[11px] text-stone-500">
                    {language === 'ne' ? 'सामान्य हरियो रङ्गमा देखाइनेछ' : 'Displayed in normal theme color'}
                  </span>
                </div>
              </label>

              {/* Dead option (RED) */}
              <label
                className={`p-3 rounded-lg border-2 cursor-pointer transition-all flex items-center gap-3 ${
                  !isLiving
                    ? 'border-rose-600 bg-rose-50 text-rose-950 ring-1 ring-rose-400'
                    : 'border-stone-200 bg-white hover:bg-stone-50 text-stone-700'
                }`}
              >
                <input
                  type="radio"
                  name="livingStatus"
                  checked={!isLiving}
                  onChange={() => setIsLiving(false)}
                  className="text-rose-600 focus:ring-rose-500"
                />
                <div>
                  <div className="font-bold text-xs text-rose-800 flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-600 inline-block"></span>
                    <span>{language === 'ne' ? 'स्वर्गीय (Deceased / Dead)' : 'Dead (Deceased)'}</span>
                  </div>
                  <span className="text-[11px] text-rose-700 font-semibold">
                    {language === 'ne' ? 'ग्राफमा प्रष्ट रातो (Red) रङ्गमा देखाइनेछ' : 'Highlighted in RED on graph'}
                  </span>
                </div>
              </label>
            </div>
          </div>

          {/* Bilingual Names & Gotra */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs uppercase tracking-wider font-semibold text-stone-700">
                {language === 'ne' ? 'व्यक्तिगत नाम तथा परिचय (Names & Gotra)' : 'Personal Identity & Names'}
              </h4>
              <span className="text-[11px] text-stone-400 font-serif">
                English & नेपाली (रोमनाइज्ड टाइप गर्दा स्वतः नेपाली रूपान्तरण)
              </span>
            </div>

            {/* English Names */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-semibold text-stone-600 block mb-1">
                  First Name (English) *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Ram Krishna"
                  value={firstName}
                  onChange={(e) => handleFirstNameChange(e.target.value)}
                  className="w-full text-xs p-2 border border-stone-300 rounded bg-white focus:outline-none focus:ring-1 focus:ring-amber-800"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-stone-600 block mb-1">
                  Last Name (English) *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Shrestha"
                  value={lastName}
                  onChange={(e) => handleLastNameChange(e.target.value)}
                  className="w-full text-xs p-2 border border-stone-300 rounded bg-white focus:outline-none focus:ring-1 focus:ring-amber-800"
                />
              </div>
            </div>

            {/* Nepali Devanagari Names */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-amber-50/40 p-3 rounded-lg border border-amber-200/60">
              <div>
                <label className="text-[11px] font-semibold text-amber-900 block mb-1">
                  पहिलो नाम (नेपाली / देवनागरी)
                </label>
                <input
                  type="text"
                  placeholder="जस्तै: राम कृष्ण"
                  value={firstNameNepali}
                  onChange={(e) => setFirstNameNepali(e.target.value)}
                  className="w-full text-xs p-2 border border-amber-300 rounded bg-white font-medium focus:outline-none focus:ring-1 focus:ring-amber-800"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-amber-900 block mb-1">
                  थर / पदवी (नेपाली / देवनागरी)
                </label>
                <input
                  type="text"
                  placeholder="जस्तै: श्रेष्ठ"
                  value={lastNameNepali}
                  onChange={(e) => setLastNameNepali(e.target.value)}
                  className="w-full text-xs p-2 border border-amber-300 rounded bg-white font-medium focus:outline-none focus:ring-1 focus:ring-amber-800"
                />
              </div>
            </div>

            {/* Gotra & Maiden Name */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-[11px] font-semibold text-stone-600 block mb-1">
                  गोत्र (Gotra)
                </label>
                <input
                  type="text"
                  placeholder="e.g. कश्यप (Kashyap)"
                  value={gotra}
                  onChange={(e) => setGotra(e.target.value)}
                  className="w-full text-xs p-2 border border-stone-300 rounded bg-white focus:outline-none focus:ring-1 focus:ring-amber-800"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-stone-600 block mb-1">
                  माइती थर (Maiden Name)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Malla / मल्ल"
                  value={maidenName}
                  onChange={(e) => setMaidenName(e.target.value)}
                  className="w-full text-xs p-2 border border-stone-300 rounded bg-white focus:outline-none focus:ring-1 focus:ring-amber-800"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-stone-600 block mb-1">
                  लिङ्ग (Gender)
                </label>
                <select
                  value={gender}
                  onChange={(e) => setGender(e.target.value as Gender)}
                  className="w-full text-xs p-2 border border-stone-300 rounded bg-white focus:outline-none focus:ring-1 focus:ring-amber-800"
                >
                  <option value="male">पुरुष (Male)</option>
                  <option value="female">महिला (Female)</option>
                  <option value="non-binary">अन्य (Other)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Vitals: Birth & Death */}
          <div className="space-y-3 pt-3 border-t border-stone-200">
            <h4 className="text-xs uppercase tracking-wider font-semibold text-stone-700">
              {language === 'ne' ? 'जन्म तथा स्वर्गवास मिति' : 'Birth & Death Lifespan'}
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-[11px] font-semibold text-stone-600 block mb-1">
                  जन्म वर्ष (Birth Year) *
                </label>
                <input
                  type="number"
                  required
                  value={birthYear}
                  onChange={(e) => setBirthYear(Number(e.target.value))}
                  className="w-full text-xs p-2 border border-stone-300 rounded bg-white focus:outline-none focus:ring-1 focus:ring-amber-800"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-stone-600 block mb-1">
                  जन्म मिति (YYYY-MM-DD / B.S.)
                </label>
                <input
                  type="text"
                  placeholder="e.g. 1970-08-19 or 2027-05-04"
                  value={birthDate}
                  onChange={(e) => setBirthDate(e.target.value)}
                  className="w-full text-xs p-2 border border-stone-300 rounded bg-white"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-stone-600 block mb-1">
                  जन्म स्थान (Birth Place)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Kathmandu, Nepal"
                  value={birthPlace}
                  onChange={(e) => setBirthPlace(e.target.value)}
                  className="w-full text-xs p-2 border border-stone-300 rounded bg-white"
                />
              </div>
            </div>

            {/* If deceased, input death details */}
            {!isLiving && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 bg-rose-50/70 border border-rose-200 rounded-lg animate-in fade-in duration-150">
                <div>
                  <label className="text-[11px] font-semibold text-rose-900 block mb-1">
                    स्वर्गवास वर्ष (Death Year) *
                  </label>
                  <input
                    type="number"
                    value={deathYear || ''}
                    onChange={(e) => setDeathYear(e.target.value ? Number(e.target.value) : undefined)}
                    placeholder="e.g. 1948"
                    className="w-full text-xs p-2 border border-rose-300 rounded bg-white"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-rose-900 block mb-1">
                    स्वर्गवास मिति (Death Date)
                  </label>
                  <input
                    type="text"
                    placeholder="YYYY-MM-DD"
                    value={deathDate}
                    onChange={(e) => setDeathDate(e.target.value)}
                    className="w-full text-xs p-2 border border-rose-300 rounded bg-white"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-rose-900 block mb-1">
                    स्वर्गवास स्थान (Death Place)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Kathmandu, Nepal"
                    value={deathPlace}
                    onChange={(e) => setDeathPlace(e.target.value)}
                    className="w-full text-xs p-2 border border-rose-300 rounded bg-white"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Kinship Connections */}
          <div className="space-y-3 pt-3 border-t border-stone-200">
            <h4 className="text-xs uppercase tracking-wider font-semibold text-stone-700">
              {language === 'ne' ? 'नाता सम्बन्ध (बुबा/आमा, दम्पती, सन्तान)' : 'Kinship Links'}
            </h4>

            {/* Parents Multi-Select */}
            <div>
              <label className="text-[11px] font-semibold text-stone-600 block mb-1">
                {t('parents', language)}
              </label>
              <select
                multiple
                value={selectedParentIds}
                onChange={(e) => {
                  const opts = Array.from(e.target.selectedOptions).map((o) => o.value);
                  setSelectedParentIds(opts);
                }}
                className="w-full text-xs p-2 border border-stone-300 rounded bg-white h-24 focus:outline-none"
              >
                {eligibleForParent.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.firstNameNepali ? `${m.firstNameNepali} ${m.lastNameNepali || ''}` : `${m.firstName} ${m.lastName}`} ({m.birthYear}–{m.deathYear ?? 'Present'}, Gen {m.generation})
                  </option>
                ))}
              </select>
            </div>

            {/* Spouses Multi-Select */}
            <div>
              <label className="text-[11px] font-semibold text-stone-600 block mb-1">
                {t('spouse', language)}
              </label>
              <select
                multiple
                value={selectedSpouseIds}
                onChange={(e) => {
                  const opts = Array.from(e.target.selectedOptions).map((o) => o.value);
                  setSelectedSpouseIds(opts);
                }}
                className="w-full text-xs p-2 border border-stone-300 rounded bg-white h-20 focus:outline-none"
              >
                {eligibleForSpouse.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.firstNameNepali ? `${m.firstNameNepali} ${m.lastNameNepali || ''}` : `${m.firstName} ${m.lastName}`} ({m.birthYear}–{m.deathYear ?? 'Present'})
                  </option>
                ))}
              </select>
            </div>

            {/* Children Multi-Select */}
            <div>
              <label className="text-[11px] font-semibold text-stone-600 block mb-1">
                {t('children', language)}
              </label>
              <select
                multiple
                value={selectedChildrenIds}
                onChange={(e) => {
                  const opts = Array.from(e.target.selectedOptions).map((o) => o.value);
                  setSelectedChildrenIds(opts);
                }}
                className="w-full text-xs p-2 border border-stone-300 rounded bg-white h-20 focus:outline-none"
              >
                {eligibleForChild.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.firstNameNepali ? `${m.firstNameNepali} ${m.lastNameNepali || ''}` : `${m.firstName} ${m.lastName}`} ({m.birthYear}–{m.deathYear ?? 'Present'})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Profession & Bio */}
          <div className="space-y-3 pt-3 border-t border-stone-200">
            <div>
              <label className="text-[11px] font-semibold text-stone-600 block mb-1">
                {t('occupation', language)}
              </label>
              <input
                type="text"
                placeholder="e.g. Master Ayurvedic Physician, Engineer, Teacher"
                value={occupation}
                onChange={(e) => setOccupation(e.target.value)}
                className="w-full text-xs p-2 border border-stone-300 rounded bg-white"
              />
            </div>

            <div>
              <label className="text-[11px] font-semibold text-stone-600 block mb-1">
                {t('biography', language)}
              </label>
              <textarea
                rows={3}
                placeholder="संक्षिप्त जीवनी, योगदान तथा पारिवारिक इतिहास..."
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                className="w-full text-xs p-2 border border-stone-300 rounded bg-white font-serif leading-relaxed"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="pt-4 border-t border-stone-200 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-stone-600 hover:bg-stone-100 rounded-md transition-colors"
            >
              रद्द गर्नुहोस् (Cancel)
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-xs font-medium bg-amber-800 hover:bg-amber-900 text-stone-50 rounded-md transition-colors shadow-2xs"
            >
              {initialMember ? 'विवरण सुरक्षित गर्नुहोस् (Save)' : 'सदस्य दर्ता गर्नुहोस् (Create)'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
