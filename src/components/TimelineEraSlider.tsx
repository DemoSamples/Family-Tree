import React from 'react';
import { SlidersHorizontal, ChevronLeft, ChevronRight, RotateCcw } from 'lucide-react';
import { Language, t } from '../utils/i18n';

interface TimelineEraSliderProps {
  eraRange: [number, number];
  onEraChange: (range: [number, number]) => void;
  minYear: number;
  maxYear: number;
  activeMemberCount: number;
  totalMembersCount: number;
  language?: Language;
  compact?: boolean;
}

const HISTORICAL_PRESETS: { labelEn: string; labelNe: string; period: [number, number] }[] = [
  { labelEn: 'All Eras', labelNe: 'सबै कालखण्ड', period: [1870, 2026] },
  { labelEn: 'Late 19th Century', labelNe: '१९औं शताब्दी (१९५० वि.सं.)', period: [1870, 1900] },
  { labelEn: 'Early 20th Century', labelNe: 'प्रारम्भिक २०औं शताब्दी', period: [1901, 1945] },
  { labelEn: 'Mid 20th Century', labelNe: 'मध्य २०औं शताब्दी', period: [1946, 1980] },
  { labelEn: 'Late 20th Century', labelNe: 'उत्तर २०औं शताब्दी', period: [1981, 2000] },
  { labelEn: '21st Century (Modern)', labelNe: '२१औं शताब्दी (वर्तमान)', period: [2001, 2026] },
];

export const TimelineEraSlider: React.FC<TimelineEraSliderProps> = ({
  eraRange,
  onEraChange,
  minYear = 1870,
  maxYear = 2026,
  activeMemberCount,
  totalMembersCount,
  language = 'en',
  compact = false,
}) => {
  const [startYear, endYear] = eraRange;

  const handleStartChange = (val: number) => {
    const clamped = Math.max(minYear, Math.min(val, endYear - 1));
    onEraChange([clamped, endYear]);
  };

  const handleEndChange = (val: number) => {
    const clamped = Math.min(maxYear, Math.max(val, startYear + 1));
    onEraChange([startYear, clamped]);
  };

  const stepStart = (delta: number) => {
    handleStartChange(startYear + delta);
  };

  const stepEnd = (delta: number) => {
    handleEndChange(endYear + delta);
  };

  return (
    <div className="bg-stone-100/95 backdrop-blur-md border border-stone-200 rounded-lg p-3 shadow-xs space-y-2.5">
      {/* Top Header & Inputs */}
      <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-amber-800 text-amber-50 rounded-md">
            <SlidersHorizontal className="w-3.5 h-3.5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-stone-900 text-xs font-serif">
                {t('eraNavigator', language)}
              </span>
              <span className="text-stone-300">·</span>
              <span className="font-mono font-bold text-amber-900 text-xs">
                {startYear} — {endYear}
              </span>
            </div>
            <div className="text-[11px] text-stone-500 font-serif">
              {activeMemberCount} / {totalMembersCount} {t('showingEra', language)}
            </div>
          </div>
        </div>

        {/* Dual Direct Number Controls with Steppers */}
        <div className="flex items-center gap-3 bg-white p-1.5 rounded-md border border-stone-300 shadow-2xs">
          {/* Start Year Control */}
          <div className="flex items-center gap-1">
            <span className="text-[11px] text-stone-500 font-medium mr-0.5">Start:</span>
            <button
              onClick={() => stepStart(-10)}
              disabled={startYear <= minYear}
              className="p-1 text-stone-600 hover:text-stone-900 hover:bg-stone-100 rounded disabled:opacity-30"
              title="Minus 10 years"
            >
              <ChevronLeft className="w-3 h-3" />
            </button>
            <input
              type="number"
              min={minYear}
              max={endYear - 1}
              value={startYear}
              onChange={(e) => handleStartChange(Number(e.target.value))}
              className="w-14 text-center font-mono font-bold text-xs p-1 border border-stone-200 rounded focus:outline-none focus:ring-1 focus:ring-amber-800"
            />
            <button
              onClick={() => stepStart(10)}
              disabled={startYear >= endYear - 1}
              className="p-1 text-stone-600 hover:text-stone-900 hover:bg-stone-100 rounded disabled:opacity-30"
              title="Plus 10 years"
            >
              <ChevronRight className="w-3 h-3" />
            </button>
          </div>

          <span className="text-stone-300 font-bold">|</span>

          {/* End Year Control */}
          <div className="flex items-center gap-1">
            <span className="text-[11px] text-stone-500 font-medium mr-0.5">End:</span>
            <button
              onClick={() => stepEnd(-10)}
              disabled={endYear <= startYear + 1}
              className="p-1 text-stone-600 hover:text-stone-900 hover:bg-stone-100 rounded disabled:opacity-30"
              title="Minus 10 years"
            >
              <ChevronLeft className="w-3 h-3" />
            </button>
            <input
              type="number"
              min={startYear + 1}
              max={maxYear}
              value={endYear}
              onChange={(e) => handleEndChange(Number(e.target.value))}
              className="w-14 text-center font-mono font-bold text-xs p-1 border border-stone-200 rounded focus:outline-none focus:ring-1 focus:ring-amber-800"
            />
            <button
              onClick={() => stepEnd(10)}
              disabled={endYear >= maxYear}
              className="p-1 text-stone-600 hover:text-stone-900 hover:bg-stone-100 rounded disabled:opacity-30"
              title="Plus 10 years"
            >
              <ChevronRight className="w-3 h-3" />
            </button>
          </div>

          {/* Reset button */}
          <button
            onClick={() => onEraChange([minYear, maxYear])}
            className="p-1 text-stone-500 hover:text-stone-900 hover:bg-stone-100 rounded"
            title="Reset to all eras"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Dual Sliders Track */}
      <div className="relative pt-1 pb-1">
        <div className="relative h-5 flex items-center">
          {/* Base background bar */}
          <div className="absolute w-full h-2 bg-stone-300 rounded-full" />

          {/* Highlighted active range bar */}
          <div
            className="absolute h-2 bg-amber-800 rounded-full pointer-events-none"
            style={{
              left: `${((startYear - minYear) / (maxYear - minYear)) * 100}%`,
              right: `${100 - ((endYear - minYear) / (maxYear - minYear)) * 100}%`,
            }}
          />

          {/* Left Handle (Start Year) */}
          <input
            type="range"
            min={minYear}
            max={maxYear}
            value={startYear}
            onChange={(e) => handleStartChange(Number(e.target.value))}
            className="absolute w-full appearance-none bg-transparent pointer-events-auto cursor-ew-resize accent-amber-800"
          />

          {/* Right Handle (End Year) */}
          <input
            type="range"
            min={minYear}
            max={maxYear}
            value={endYear}
            onChange={(e) => handleEndChange(Number(e.target.value))}
            className="absolute w-full appearance-none bg-transparent pointer-events-auto cursor-ew-resize accent-amber-800"
          />
        </div>

        <div className="flex items-center justify-between text-[10px] text-stone-400 font-mono mt-0.5">
          <span>{minYear}</span>
          <span className="font-serif italic text-stone-500">
            {language === 'ne' ? 'दुवै छेउबाट वर्ष परिवर्तन गर्न सकिन्छ' : 'Adjust both start and end handles independently'}
          </span>
          <span>{maxYear}</span>
        </div>
      </div>

      {/* Preset Buttons */}
      {!compact && (
        <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 scrollbar-none text-xs">
          {HISTORICAL_PRESETS.map((p) => {
            const isActive = p.period[0] === startYear && p.period[1] === endYear;
            return (
              <button
                key={p.labelEn}
                onClick={() => onEraChange(p.period)}
                className={`px-2.5 py-1 text-[11px] font-medium rounded-md whitespace-nowrap transition-colors border ${
                  isActive
                    ? 'bg-stone-900 text-stone-50 border-stone-900 shadow-2xs'
                    : 'bg-white text-stone-700 hover:bg-stone-50 border-stone-200'
                }`}
              >
                {language === 'ne' ? p.labelNe : p.labelEn} ({p.period[0]}–{p.period[1]})
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
