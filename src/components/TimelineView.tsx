import React, { useState, useMemo } from 'react';
import { FamilyMember, LifeEvent } from '../types/family';
import { getLineageHighlightIds } from '../utils/genealogy';
import {
  Calendar,
  MapPin,
  FileText,
  Heart,
  Baby,
  Skull,
  GraduationCap,
  Shield,
  Plane,
  Award,
  Filter,
  Plus,
  ArrowRight,
} from 'lucide-react';

interface TimelineViewProps {
  members: FamilyMember[];
  selectedMemberId: string | null;
  onSelectMember: (id: string | null) => void;
  onOpenDetails: (member: FamilyMember) => void;
  eraRange: [number, number];
  isReadOnly: boolean;
}

interface TimelineItem {
  event: LifeEvent;
  member: FamilyMember;
}

export const TimelineView: React.FC<TimelineViewProps> = ({
  members,
  selectedMemberId,
  onSelectMember,
  onOpenDetails,
  eraRange,
  isReadOnly,
}) => {
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [lineageOnly, setLineageOnly] = useState<boolean>(false);

  const lineage = useMemo(() => {
    return getLineageHighlightIds(selectedMemberId, members);
  }, [selectedMemberId, members]);

  // Aggregate all events with their member
  const allEvents = useMemo(() => {
    const list: TimelineItem[] = [];
    members.forEach((m) => {
      // If lineageOnly is checked and a member is selected, filter
      if (lineageOnly && selectedMemberId && !lineage.activeIds.has(m.id)) {
        return;
      }

      m.events.forEach((ev) => {
        // Era check
        if (ev.year >= eraRange[0] && ev.year <= eraRange[1]) {
          // Category check
          if (filterCategory === 'all' || ev.category === filterCategory) {
            list.push({ event: ev, member: m });
          }
        }
      });
    });

    return list.sort((a, b) => a.event.year - b.event.year);
  }, [members, selectedMemberId, lineageOnly, lineage, eraRange, filterCategory]);

  // Group events by decade
  const groupedByDecade = useMemo(() => {
    const map = new Map<number, TimelineItem[]>();
    allEvents.forEach((item) => {
      const decade = Math.floor(item.event.year / 10) * 10;
      if (!map.has(decade)) map.set(decade, []);
      map.get(decade)!.push(item);
    });
    return Array.from(map.entries()).sort((a, b) => a[0] - b[0]);
  }, [allEvents]);

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'birth':
        return <Baby className="w-4 h-4 text-sky-700" />;
      case 'death':
        return <Skull className="w-4 h-4 text-stone-600" />;
      case 'marriage':
        return <Heart className="w-4 h-4 text-rose-600" />;
      case 'education':
        return <GraduationCap className="w-4 h-4 text-indigo-700" />;
      case 'military':
        return <Shield className="w-4 h-4 text-amber-800" />;
      case 'migration':
        return <Plane className="w-4 h-4 text-emerald-700" />;
      case 'award':
        return <Award className="w-4 h-4 text-amber-600" />;
      default:
        return <Calendar className="w-4 h-4 text-stone-600" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Timeline Controls & Filter Strip */}
      <div className="bg-stone-100 border border-stone-200 rounded-lg p-3 lg:p-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold text-stone-700 uppercase tracking-wider mr-1">
            Category:
          </span>
          {['all', 'birth', 'marriage', 'education', 'military', 'migration', 'award', 'death'].map((cat) => (
            <button
              key={cat}
              onClick={() => setFilterCategory(cat)}
              className={`px-2.5 py-1 text-xs font-medium rounded-md capitalize transition-colors ${
                filterCategory === cat
                  ? 'bg-stone-900 text-stone-100 shadow-2xs'
                  : 'bg-white text-stone-700 hover:bg-stone-200 border border-stone-200'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Selected Lineage Filter Toggle */}
        <div className="flex items-center gap-3">
          {selectedMemberId && (
            <label className="flex items-center gap-2 text-xs font-medium text-stone-700 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={lineageOnly}
                onChange={(e) => setLineageOnly(e.target.checked)}
                className="rounded border-stone-300 text-amber-800 focus:ring-amber-700"
              />
              <span>Focus on selected lineage only</span>
            </label>
          )}

          <div className="text-xs text-stone-500 font-serif">
            {allEvents.length} recorded events in {eraRange[0]}–{eraRange[1]}
          </div>
        </div>
      </div>

      {/* Main Chronological History Flow */}
      {groupedByDecade.length === 0 ? (
        <div className="bg-white border border-stone-200 rounded-lg p-12 text-center">
          <Calendar className="w-10 h-10 text-stone-400 mx-auto mb-3" />
          <h3 className="text-base font-serif font-semibold text-stone-800">
            No milestones found for this era window
          </h3>
          <p className="text-sm text-stone-500 mt-1 max-w-md mx-auto">
            Adjust the historical era slider above to expand the timeframe, or clear category filters to view genealogical records.
          </p>
        </div>
      ) : (
        <div className="relative pl-6 sm:pl-8 border-l-2 border-stone-200 ml-4 sm:ml-8 space-y-10 my-4">
          {groupedByDecade.map(([decade, items]) => (
            <div key={decade} className="relative">
              {/* Decade Marker Badge */}
              <div className="absolute -left-[35px] sm:-left-[43px] top-0 w-8 h-8 rounded-full bg-amber-800 text-amber-50 flex items-center justify-center font-display font-semibold text-[11px] shadow-sm">
                {decade.toString().slice(2)}s
              </div>

              <div className="mb-4">
                <h3 className="text-base font-display font-bold text-stone-900 tracking-tight">
                  The {decade}s
                </h3>
                <span className="text-xs text-stone-500 font-serif italic">
                  {items.length} family event{items.length > 1 ? 's' : ''} recorded
                </span>
              </div>

              {/* Event Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {items.map(({ event, member }) => {
                  const isCurrentSelected = member.id === selectedMemberId;
                  return (
                    <div
                      key={event.id}
                      className={`p-4 rounded-lg bg-white border transition-all hover:shadow-sm ${
                        isCurrentSelected
                          ? 'border-amber-600 ring-1 ring-amber-600 bg-amber-50/20'
                          : 'border-stone-200 hover:border-stone-300'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <div className="flex items-center gap-2">
                          <div className="p-1.5 rounded-md bg-stone-100">
                            {getCategoryIcon(event.category)}
                          </div>
                          <div>
                            <span className="text-xs font-mono font-bold text-stone-900">
                              {event.year}
                              {event.date && event.date.length > 4 ? ` · ${event.date}` : ''}
                            </span>
                            <h4 className="text-sm font-semibold text-stone-900">
                              {event.title}
                            </h4>
                          </div>
                        </div>

                        <span className="text-[11px] uppercase tracking-wider font-semibold text-stone-500 bg-stone-100 px-2 py-0.5 rounded">
                          {event.category}
                        </span>
                      </div>

                      <p className="text-xs text-stone-600 leading-relaxed mb-3">
                        {event.description}
                      </p>

                      {/* Location & Citation */}
                      <div className="text-[11px] text-stone-500 space-y-1 mb-3 pt-2 border-t border-stone-100">
                        {event.location && (
                          <div className="flex items-center gap-1.5">
                            <MapPin className="w-3 h-3 text-stone-400 shrink-0" />
                            <span>{event.location}</span>
                          </div>
                        )}
                        {event.citation && (
                          <div className="flex items-center gap-1.5 italic font-serif text-stone-500">
                            <FileText className="w-3 h-3 text-stone-400 shrink-0" />
                            <span>Source: {event.citation}</span>
                          </div>
                        )}
                      </div>

                      {/* Associated Family Member Link */}
                      <div className="flex items-center justify-between pt-2 border-t border-stone-100">
                        <button
                          onClick={() => {
                            onSelectMember(member.id);
                            onOpenDetails(member);
                          }}
                          className="text-xs font-medium text-amber-800 hover:text-amber-950 flex items-center gap-1 transition-colors group"
                        >
                          <span>
                            {member.firstName} {member.lastName}
                          </span>
                          <span className="text-[10px] text-stone-400 font-normal">
                            (Gen {member.generation})
                          </span>
                          <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                        </button>

                        <button
                          onClick={() => onSelectMember(member.id)}
                          className="text-[11px] text-stone-500 hover:text-stone-800 underline transition-colors"
                        >
                          Highlight Lineage
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
