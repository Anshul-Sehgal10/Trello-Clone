"use client";

import { CalendarDays, CalendarRange, Filter, Search, Tag, UserRound, X } from "lucide-react";
import { Label, Member, SearchFilters } from "@/lib/types";

interface SearchFilterBarProps {
  filters: SearchFilters;
  labels: Label[];
  members: Member[];
  onChange: (patch: Partial<SearchFilters>) => void;
  onClear: () => void;
}

export function SearchFilterBar({
  filters,
  labels,
  members,
  onChange,
  onClear,
}: SearchFilterBarProps) {
  const activeFilterCount = [
    Boolean(filters.query.trim()),
    Boolean(filters.labelId),
    Boolean(filters.memberId),
    Boolean(filters.dueDateFrom),
    Boolean(filters.dueDateTo),
  ].filter(Boolean).length;
  const hasFilters = activeFilterCount > 0;

  const fieldClass =
    "min-h-10 w-full rounded-xl px-2.5 py-2 text-sm text-white outline-none transition duration-200 placeholder:text-white/60 disabled:cursor-not-allowed";
  const fieldStyle = {
    background: "rgba(255,255,255,0.08)",
    border: "1px solid rgba(255,255,255,0.18)",
  };
  const fieldFocusHandler = (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) =>
    (e.currentTarget.style.border = "1px solid rgba(255,255,255,0.5)");
  const fieldBlurHandler = (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) =>
    (e.currentTarget.style.border = "1px solid rgba(255,255,255,0.18)");

  return (
    <section
      className="relative rounded-2xl p-3.5"
      style={{
        background: "rgba(31, 41, 67, 0.95)", // Matches #1f2943
        border: "1px solid rgba(255,255,255,0.12)",
        boxShadow: "0 12px 40px -24px rgba(0,0,0,0.5)",
        backdropFilter: "blur(14px)",
      }}
    >
      {/* Header row */}
      <div className="mb-3 flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-white/80" />
          <p className="m-0 text-xs font-semibold uppercase tracking-[0.1em] text-white/80">
            Filter cards
          </p>
        </div>

        <div className="flex items-center gap-2">
          {hasFilters ? (
            <span
              className="flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold"
              style={{
                background: "rgba(255,255,255,0.12)",
                color: "#e2e8f0",
                border: "1px solid rgba(255,255,255,0.2)",
              }}
            >
              <span
                className="h-1.5 w-1.5 rounded-full bg-white"
                style={{ animation: "pulseDot 1.5s ease-in-out infinite" }}
              />
              {activeFilterCount} active
            </span>
          ) : null}
        </div>
      </div>

      {/* Filter controls */}
      <div className="grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
        {/* Search */}
        <div className="relative md:col-span-2 2xl:col-span-2">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/50" />
          <input
            className={`${fieldClass} pl-9`}
            style={fieldStyle}
            onFocus={fieldFocusHandler}
            onBlur={fieldBlurHandler}
            value={filters.query}
            onChange={(event) => onChange({ query: event.target.value })}
            placeholder="Search cards by title or description"
          />
        </div>

        {/* Labels */}
        <div className="relative">
          <Tag className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/50" />
          <select
            className={`${fieldClass} pl-9 cursor-pointer appearance-none`}
            style={fieldStyle}
            onFocus={fieldFocusHandler}
            onBlur={fieldBlurHandler}
            value={filters.labelId}
            onChange={(event) => onChange({ labelId: event.target.value })}
          >
            <option value="" className="text-gray-900">All labels</option>
            {labels.map((label) => (
              <option key={label.id} value={label.id} className="text-gray-900">
                {label.title || "Untitled label"}
              </option>
            ))}
          </select>
        </div>

        {/* Members */}
        <div className="relative">
          <UserRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/50" />
          <select
            className={`${fieldClass} pl-9 cursor-pointer appearance-none`}
            style={fieldStyle}
            onFocus={fieldFocusHandler}
            onBlur={fieldBlurHandler}
            value={filters.memberId}
            onChange={(event) => onChange({ memberId: event.target.value })}
          >
            <option value="" className="text-gray-900">All members</option>
            {members.map((member) => (
              <option key={member.id} value={member.id} className="text-gray-900">
                {member.name}
              </option>
            ))}
          </select>
        </div>

        {/* Due from */}
        <div className="relative">
          <CalendarDays className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/50" />
          <div className="pointer-events-none absolute left-9 top-1/2 -translate-y-1/2 text-[0.65rem] font-bold uppercase tracking-wider text-[#6484bc]">From</div>
          <input
            className={`${fieldClass} pl-20`}
            style={{ ...fieldStyle, colorScheme: "dark" }}
            onFocus={fieldFocusHandler}
            onBlur={fieldBlurHandler}
            type="date"
            value={filters.dueDateFrom}
            onChange={(event) => onChange({ dueDateFrom: event.target.value })}
            title="Due from"
          />
        </div>

        {/* Due to */}
        <div className="relative">
          <CalendarRange className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/50" />
          <div className="pointer-events-none absolute left-9 top-1/2 -translate-y-1/2 text-[0.65rem] font-bold uppercase tracking-wider text-[#6484bc]">To</div>
          <input
            className={`${fieldClass} pl-[3.7rem]`}
            style={{ ...fieldStyle, colorScheme: "dark" }}
            onFocus={fieldFocusHandler}
            onBlur={fieldBlurHandler}
            type="date"
            value={filters.dueDateTo}
            onChange={(event) => onChange({ dueDateTo: event.target.value })}
            title="Due to"
          />
        </div>

        {/* Clear */}
        <button
          className="flex min-h-10 items-center justify-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold transition duration-200 disabled:cursor-not-allowed disabled:opacity-40"
          style={{
            background: hasFilters ? "rgba(244,63,94,0.85)" : "rgba(255,255,255,0.05)",
            color: hasFilters ? "#fff" : "rgba(255,255,255,0.4)",
            border: hasFilters ? "1px solid rgba(244,63,94,0.6)" : "1px solid rgba(255,255,255,0.1)",
          }}
          type="button"
          onClick={onClear}
          disabled={!hasFilters}
        >
          <X className="h-4 w-4" />
          Clear
        </button>
      </div>
    </section>
  );
}
