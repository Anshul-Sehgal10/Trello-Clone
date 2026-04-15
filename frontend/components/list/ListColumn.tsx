"use client";

import { CSS } from "@dnd-kit/utilities";
import { useDroppable } from "@dnd-kit/core";
import { useSortable, SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { FormEvent, useEffect, useRef, useState } from "react";
import { GripVertical, MoreHorizontal, Pencil, Plus, Trash2, X } from "lucide-react";
import { BoardList } from "@/lib/types";
import { CardItem } from "@/components/card/CardItem";

interface ListColumnProps {
  list: BoardList;
  visibleCardIds: Set<string> | null;
  onOpenCard: (cardId: string) => void;
  onCreateCard: (listId: string, title: string) => Promise<void>;
  onRenameList: (listId: string, title: string) => Promise<void>;
  onDeleteList: (listId: string) => Promise<void>;
}

const accentPalette = [
  { color: "#4f9cf9", glow: "rgba(79,156,249,0.4)" },
  { color: "#f59e0b", glow: "rgba(245,158,11,0.35)" },
  { color: "#22c55e", glow: "rgba(34,197,94,0.35)" },
  { color: "#f43f5e", glow: "rgba(244,63,94,0.35)" },
  { color: "#a78bfa", glow: "rgba(167,139,250,0.35)" },
  { color: "#14b8a6", glow: "rgba(20,184,166,0.35)" },
];

export function ListColumn({
  list,
  visibleCardIds,
  onOpenCard,
  onCreateCard,
  onRenameList,
  onDeleteList,
}: ListColumnProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: list.id,
    data: { type: "list", listId: list.id },
  });

  // Separate droppable registration for the cards area.
  // This makes the list column a valid drop zone for cards even when it's empty,
  // without conflicting with the list's own sortable registration.
  const { setNodeRef: setDroppableRef } = useDroppable({
    id: `droppable-list-${list.id}`,
    data: { type: "list", listId: list.id },
  });

  const [cardTitle, setCardTitle] = useState("");
  const [isAddingCard, setIsAddingCard] = useState(false);
  const [isCardComposerOpen, setIsCardComposerOpen] = useState(false);
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState(list.title);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const actionMenuRef = useRef<HTMLDivElement | null>(null);
  const cardComposerRef = useRef<HTMLFormElement | null>(null);

  const accentIdx = (Math.abs(list.position) || 0) % accentPalette.length;
  const accent = accentPalette[accentIdx];

  // Use Translate (not Transform) — no scale/rotation distortion during drag
  // Suppress transition while actively dragging for immediate, smooth movement
  const style = {
    transform: CSS.Translate.toString(transform),
    transition: isDragging ? "none" : transition,
  };

  const visibleCards =
    visibleCardIds == null
      ? list.cards
      : list.cards.filter((card) => visibleCardIds.has(card.id));

  useEffect(() => {
    const handlePointerDown = (event: PointerEvent) => {
      if (!actionMenuRef.current?.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
      if (!cardComposerRef.current?.contains(event.target as Node)) {
        setIsCardComposerOpen(false);
      }
    };

    window.addEventListener("pointerdown", handlePointerDown);
    return () => window.removeEventListener("pointerdown", handlePointerDown);
  }, []);

  const addCard = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const title = cardTitle.trim();
    if (!title) return;

    setIsAddingCard(true);
    try {
      await onCreateCard(list.id, title);
      setCardTitle("");
      setIsCardComposerOpen(false);
    } finally {
      setIsAddingCard(false);
    }
  };

  const submitRename = async () => {
    const title = titleDraft.trim();
    if (!title || title === list.title) {
      setTitleDraft(list.title);
      setEditingTitle(false);
      return;
    }
    await onRenameList(list.id, title);
    setEditingTitle(false);
  };

  return (
    <section
      ref={setNodeRef}
      className="relative flex max-h-[calc(100vh-210px)] w-[min(310px,calc(100vw-64px))] min-w-[min(310px,calc(100vw-64px))] flex-col gap-2 rounded-2xl max-[640px]:w-[88vw] max-[640px]:min-w-[88vw]"
      style={{
        ...style,
        background: "rgba(248, 251, 255, 0.94)",
        border: "1px solid rgba(190,210,245,0.7)",
        boxShadow: "0 20px 50px -28px rgba(14,28,70,0.5), 0 0 0 1px rgba(255,255,255,0.5) inset",
        backdropFilter: "blur(8px)",
        padding: "10px",
        overflow: "visible",
        // Hide the original while dragging — the DragOverlay provides the floating visual.
        // The element still occupies space (acts as placeholder for others to animate around).
        opacity: isDragging ? 0 : 1,
      }}
    >
      {/* Accent left stripe with glow */}
      <span
        className="absolute inset-y-0 left-0 w-[3px] rounded-r"
        style={{
          backgroundColor: accent.color,
          boxShadow: `2px 0 10px ${accent.glow}`,
        }}
      />

      {/* Column header */}
      <header className="relative flex min-w-0 items-center justify-between gap-2 pl-2">
        {editingTitle ? (
          <input
            className="w-full min-w-0 rounded-lg border border-[#4f9cf9]/50 bg-white px-2 py-1.5 text-sm font-semibold text-[#172b4d] outline-none ring-2 ring-[#4f9cf9]/15 transition"
            value={titleDraft}
            onChange={(event) => setTitleDraft(event.target.value)}
            onBlur={submitRename}
            autoFocus
            onKeyDown={(event) => {
              if (event.key === "Enter") void submitRename();
              if (event.key === "Escape") {
                setTitleDraft(list.title);
                setEditingTitle(false);
              }
            }}
          />
        ) : (
          <div
            className="flex min-w-0 flex-1 cursor-grab items-center gap-2 active:cursor-grabbing"
            {...attributes}
            {...listeners}
          >
            <GripVertical className="h-4 w-4 shrink-0 text-[#b0bfd8]" />
            <h3
              className="m-0 cursor-text overflow-hidden text-ellipsis whitespace-nowrap text-[0.93rem] font-semibold text-[#1a2f5e] select-none"
              onDoubleClick={() => setEditingTitle(true)}
            >
              {list.title}
            </h3>
            <span
              className="ml-auto shrink-0 rounded-full px-1.5 py-0.5 text-[0.68rem] font-bold"
              style={{
                background: `${accent.color}18`,
                color: accent.color,
                border: `1px solid ${accent.color}30`,
              }}
            >
              {visibleCards.length}
            </span>
          </div>
        )}

        {/* Action menu */}
        <div ref={actionMenuRef} className="relative shrink-0">
          <button
            className="grid h-7 w-7 place-items-center rounded-lg text-[#7a94ba] transition duration-150 hover:bg-[#eef3fb] hover:text-[#3a5a90]"
            style={{ border: "1px solid rgba(180,200,235,0.6)" }}
            onClick={() => setIsMenuOpen((v) => !v)}
            type="button"
            aria-label="List actions"
          >
            <MoreHorizontal className="h-3.5 w-3.5" />
          </button>

          <div
            className={`absolute right-0 top-9 z-20 min-w-[150px] rounded-xl p-1 shadow-xl transition duration-150 ${
              isMenuOpen ? "opacity-100 scale-100" : "pointer-events-none opacity-0 scale-95"
            }`}
            style={{
              background: "rgba(255,255,255,0.98)",
              border: "1px solid rgba(190,210,245,0.8)",
              boxShadow: "0 16px 40px -14px rgba(20,40,90,0.3)",
            }}
          >
            <button
              className="w-full rounded-lg px-3 py-2 text-left text-sm text-[#3a5a90] transition hover:bg-[#eef5ff]"
              type="button"
              onClick={() => {
                setIsMenuOpen(false);
                setEditingTitle(true);
              }}
            >
              <span className="inline-flex items-center gap-2">
                <Pencil className="h-3.5 w-3.5" />
                Rename list
              </span>
            </button>
            <button
              className="w-full rounded-lg px-3 py-2 text-left text-sm text-[#c0392b] transition hover:bg-[#fff1f0]"
              type="button"
              onClick={() => {
                setIsMenuOpen(false);
                void onDeleteList(list.id);
              }}
            >
              <span className="inline-flex items-center gap-2">
                <Trash2 className="h-3.5 w-3.5" />
                Delete list
              </span>
            </button>
          </div>
        </div>
      </header>

      {/* Cards - this div is also a droppable target for cards (especially when empty) */}
      <div
        ref={setDroppableRef}
        className="hide-scrollbar flex min-h-[40px] flex-1 flex-col gap-2 overflow-y-auto px-0.5"
      >
        <SortableContext items={visibleCards.map((card) => card.id)} strategy={verticalListSortingStrategy}>
          {visibleCards.map((card) => (
            <CardItem key={card.id} card={card} onOpen={onOpenCard} />
          ))}
        </SortableContext>

        {visibleCards.length === 0 && visibleCardIds != null ? (
          <p className="px-2 py-3 text-center text-xs text-[#a0b4d0]">No matching cards</p>
        ) : null}
      </div>

      {/* Add card */}
      {isCardComposerOpen ? (
        <form ref={cardComposerRef} className="mt-auto space-y-2 animate-fade-drop-in" onSubmit={addCard}>
          <input
            className="w-full rounded-xl border border-[#4f9cf9]/40 bg-white px-3 py-2.5 text-sm text-[#172b4d] outline-none ring-2 ring-[#4f9cf9]/15 transition placeholder:text-[#a0b4d0] disabled:cursor-not-allowed disabled:opacity-60"
            value={cardTitle}
            onChange={(event) => setCardTitle(event.target.value)}
            placeholder="Card title…"
            disabled={isAddingCard}
            autoFocus
          />
          <div className="flex gap-2">
            <button
              className="flex-1 rounded-xl py-2 text-sm font-semibold text-white transition duration-200 hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
              style={{ background: "linear-gradient(135deg, #4f9cf9 0%, #7b5cf6 100%)" }}
              type="submit"
              disabled={isAddingCard || !cardTitle.trim()}
            >
              {isAddingCard ? "Adding…" : "Add card"}
            </button>
            <button
              className="rounded-xl border border-[#c7d5ea] px-3 py-2 text-sm font-medium text-[#4d6186] transition duration-150 hover:bg-[#eef3ff]"
              type="button"
              onClick={() => {
                setIsCardComposerOpen(false);
                setCardTitle("");
              }}
              disabled={isAddingCard}
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </form>
      ) : (
        <button
          className="mt-auto flex items-center gap-2 rounded-xl border border-dashed px-3 py-2 text-sm font-medium text-[#6a8ab5] transition duration-200 hover:border-[#4f9cf9]/60 hover:bg-[#eef4ff] hover:text-[#4f9cf9]"
          style={{ borderColor: "rgba(130,165,220,0.5)" }}
          type="button"
          onClick={() => setIsCardComposerOpen(true)}
        >
          <Plus className="h-4 w-4" />
          Add a card
        </button>
      )}
    </section>
  );
}
