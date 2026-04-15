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
    "min-h-10 w-full rounded-xl px-2.5 py-2 text-sm text-[#1e3a6e] outline-none transition duration-200 placeholder:text-[#789ac4] disabled:cursor-not-allowed";
  const fieldStyle = {
    background: "rgba(255,255,255,0.82)",
    border: "1px solid rgba(180,210,250,0.7)",
    backdropFilter: "blur(8px)",
  };
  const fieldFocusHandler = (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) =>
    (e.currentTarget.style.border = "1px solid rgba(79,156,249,0.6)");
  const fieldBlurHandler = (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) =>
    (e.currentTarget.style.border = "1px solid rgba(180,210,250,0.7)");

  return (
    <section
      className="relative rounded-2xl p-3"
      style={{
        background: "rgba(220,236,255,0.42)",
        border: "1px solid rgba(180,210,255,0.55)",
        boxShadow: "0 12px 40px -24px rgba(14,32,78,0.45)",
        backdropFilter: "blur(14px)",
      }}
    >
      {/* Header row */}
      <div className="mb-2.5 flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <Filter className="h-3.5 w-3.5 text-[#3a6abf]" />
          <p className="m-0 text-xs font-semibold uppercase tracking-[0.1em] text-[#3a6abf]">
            Filter cards
          </p>
        </div>

        <div className="flex items-center gap-2">
          {hasFilters ? (
            <span
              className="flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold"
              style={{
                background: "rgba(79,156,249,0.15)",
                color: "#2563eb",
                border: "1px solid rgba(79,156,249,0.3)",
              }}
            >
              <span
                className="h-1.5 w-1.5 rounded-full bg-[#3b82f6]"
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
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#5270a7]" />
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
          <Tag className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#5270a7]" />
          <select
            className={`${fieldClass} pl-9 cursor-pointer appearance-none`}
            style={fieldStyle}
            onFocus={fieldFocusHandler}
            onBlur={fieldBlurHandler}
            value={filters.labelId}
            onChange={(event) => onChange({ labelId: event.target.value })}
          >
            <option value="">All labels</option>
            {labels.map((label) => (
              <option key={label.id} value={label.id}>
                {label.title || "Untitled label"}
              </option>
            ))}
          </select>
        </div>

        {/* Members */}
        <div className="relative">
          <UserRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#5270a7]" />
          <select
            className={`${fieldClass} pl-9 cursor-pointer appearance-none`}
            style={fieldStyle}
            onFocus={fieldFocusHandler}
            onBlur={fieldBlurHandler}
            value={filters.memberId}
            onChange={(event) => onChange({ memberId: event.target.value })}
          >
            <option value="">All members</option>
            {members.map((member) => (
              <option key={member.id} value={member.id}>
                {member.name}
              </option>
            ))}
          </select>
        </div>

        {/* Due from */}
        <div className="relative">
          <CalendarDays className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#5270a7]" />
          <input
            className={`${fieldClass} pl-9`}
            style={fieldStyle}
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
          <CalendarRange className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#5270a7]" />
          <input
            className={`${fieldClass} pl-9`}
            style={fieldStyle}
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
          className="flex min-h-10 items-center justify-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold transition duration-200 disabled:cursor-not-allowed disabled:opacity-50"
          style={{
            background: hasFilters
              ? "linear-gradient(135deg, #4f9cf9 0%, #7b5cf6 100%)"
              : "rgba(255,255,255,0.5)",
            color: hasFilters ? "#fff" : "#789ac4",
            border: hasFilters ? "none" : "1px solid rgba(180,210,250,0.6)",
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
