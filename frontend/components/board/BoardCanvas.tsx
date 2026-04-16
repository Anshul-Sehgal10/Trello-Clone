"use client";

import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  pointerWithin,
  closestCenter,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import type { CollisionDetection } from "@dnd-kit/core";
import { SortableContext, horizontalListSortingStrategy } from "@dnd-kit/sortable";
import { FormEvent, useEffect, useRef, useState } from "react";
import { Layers, LayoutGrid, Plus, Settings2, X } from "lucide-react";
import { BoardDetail, BoardList, Card } from "@/lib/types";
import { ListColumn } from "@/components/list/ListColumn";
import { CardItemVisual } from "@/components/card/CardItem";

interface BoardCanvasProps {
  board: BoardDetail;
  visibleCardIds: Set<string> | null;
  isFiltering: boolean;
  onCreateList: (title: string) => Promise<void>;
  onCreateCard: (listId: string, title: string) => Promise<void>;
  onOpenCard: (cardId: string) => void;
  onRenameList: (listId: string, title: string) => Promise<void>;
  onDeleteList: (listId: string) => Promise<void>;
  onUpdateBoardStyle: (input: { color: string | null; background: string | null }) => Promise<void>;
  onDragStart: (event: DragStartEvent) => void;
  onDragEnd: (event: DragEndEvent) => Promise<void>;
  filterBar: React.ReactNode;
}

export function BoardCanvas({
  board,
  visibleCardIds,
  isFiltering,
  onCreateList,
  onCreateCard,
  onOpenCard,
  onRenameList,
  onDeleteList,
  onUpdateBoardStyle,
  onDragStart,
  onDragEnd,
  filterBar,
}: BoardCanvasProps) {
  const [listTitle, setListTitle] = useState("");
  const [isAddingList, setIsAddingList] = useState(false);
  const [color, setColor] = useState(board.color ?? "#0b5da8");
  const [backgroundUrl, setBackgroundUrl] = useState(board.background ?? "");
  const [isSavingStyle, setIsSavingStyle] = useState(false);
  const [isStylePopoverOpen, setIsStylePopoverOpen] = useState(false);
  const [isAddListOpen, setIsAddListOpen] = useState(false);
  const [dragPreview, setDragPreview] = useState<
    | { type: "list"; list: BoardList }
    | { type: "card"; card: Card }
    | null
  >(null);
  const stylePopoverRef = useRef<HTMLDivElement | null>(null);
  const addListPopoverRef = useRef<HTMLDivElement | null>(null);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  /**
   * Custom collision detection for a Kanban board.
   * 1. Try pointerWithin first — if pointer is inside a droppable, use it.
   *    This handles hovering over a list column (to drop at end) and hovering
   *    over a card (to drop before/after it).
   * 2. Fall back to closestCenter for the rare gap cases.
   */
  const collisionDetection: CollisionDetection = (args) => {
    // If we're dragging a list, only collide with other lists
    if (args.active.data.current?.type === "list") {
      return closestCenter({
        ...args,
        droppableContainers: args.droppableContainers.filter(
          (c) => c.data.current?.type === "list",
        ),
      });
    }
    // For cards: first try pointerWithin (most precise \u2014 pointer must be inside the droppable rect)
    const within = pointerWithin(args);
    if (within.length > 0) {
      return within;
    }
    // Fall back to closestCenter for gaps between droppables
    return closestCenter(args);
  };

  useEffect(() => {
    setColor(board.color ?? "#0b5da8");
    setBackgroundUrl(board.background ?? "");
  }, [board.id, board.color, board.background]);

  useEffect(() => {
    const handlePointerDown = (event: PointerEvent) => {
      if (!stylePopoverRef.current?.contains(event.target as Node)) {
        setIsStylePopoverOpen(false);
      }
      if (!addListPopoverRef.current?.contains(event.target as Node)) {
        setIsAddListOpen(false);
      }
    };

    window.addEventListener("pointerdown", handlePointerDown);
    return () => window.removeEventListener("pointerdown", handlePointerDown);
  }, []);

  const addList = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const title = listTitle.trim();
    if (!title) return;

    setIsAddingList(true);
    try {
      await onCreateList(title);
      setListTitle("");
      setIsAddListOpen(false);
    } finally {
      setIsAddingList(false);
    }
  };

  const saveStyle = async () => {
    setIsSavingStyle(true);
    try {
      await onUpdateBoardStyle({
        color: color || null,
        background: backgroundUrl.trim() || null,
      });
    } finally {
      setIsSavingStyle(false);
    }
  };

  const darkInput =
    "w-full min-h-10 rounded-xl px-3 py-2.5 text-sm outline-none transition duration-200 placeholder:text-[#4a6290] disabled:cursor-not-allowed disabled:opacity-60";
  const darkInputStyle = {
    background: "rgba(255,255,255,0.07)",
    border: "1px solid rgba(255,255,255,0.14)",
    color: "#d4e4ff",
  };

  const handleDragStartInternal = (event: DragStartEvent) => {
    const activeType = event.active.data.current?.type;
    const activeId = String(event.active.id);

    if (activeType === "list") {
      const list = board.lists.find((entry) => entry.id === activeId);
      setDragPreview(list ? { type: "list", list } : null);
    } else if (activeType === "card") {
      const card = board.lists
        .flatMap((list) => list.cards)
        .find((card) => card.id === activeId);
      setDragPreview(card ? { type: "card", card } : null);
    } else {
      setDragPreview(null);
    }

    onDragStart(event);
  };

  const handleDragEndInternal = async (event: DragEndEvent) => {
    setDragPreview(null);
    await onDragEnd(event);
  };

  return (
    <div className="relative flex h-full min-h-0 min-w-0 flex-col gap-3 overflow-hidden">
      {/* ── Board Header ── */}
      <header
        className="relative z-30 mx-4 mt-4 rounded-2xl px-5 py-4 text-[#f0f6ff]"
        style={{
          background: "linear-gradient(120deg, rgba(10,25,65,0.92) 0%, rgba(20,55,130,0.85) 50%, rgba(80,50,200,0.75) 100%)",
          border: "1px solid rgba(255,255,255,0.15)",
          boxShadow: "0 24px 55px -28px rgba(6,14,42,0.9)",
          backdropFilter: "blur(16px)",
        }}
      >
        {/* Subtle radial glow */}
        <div
          className="pointer-events-none absolute right-0 top-0 h-40 w-40 rounded-full opacity-30"
          style={{ background: "radial-gradient(circle, rgba(124,58,237,0.6), transparent 70%)" }}
        />

        <div className="flex flex-wrap items-start justify-between gap-4 pr-2">
          {/* Title & description */}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2.5">
              <div
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl"
                style={{ background: "rgba(255,255,255,0.12)", border: "1px solid rgba(255,255,255,0.2)" }}
              >
                <LayoutGrid className="h-4.5 w-4.5 text-white/90" />
              </div>
              <h1 className="m-0 truncate text-xl font-bold tracking-tight text-white">
                {board.title}
              </h1>
            </div>
            <p className="mt-2 max-w-2xl text-[0.84rem] leading-relaxed text-[#a8c4ef]">
              {board.description || "No description — click the settings icon to edit"}
            </p>
          </div>

          {/* Right controls */}
          <div className="flex shrink-0 items-center gap-2">
            {/* Lists count chip */}
            <div
              className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold text-[#93c5fd]"
              style={{ background: "rgba(79,156,249,0.12)", border: "1px solid rgba(79,156,249,0.25)" }}
            >
              <Layers className="h-3.5 w-3.5" />
              {board.lists.length} {board.lists.length === 1 ? "list" : "lists"}
            </div>

            {/* Style popover */}
            <div ref={stylePopoverRef} className="relative">
              <button
                className="grid h-9 w-9 place-items-center rounded-full text-white transition duration-200"
                style={{
                  background: isStylePopoverOpen
                    ? "rgba(79,156,249,0.25)"
                    : "rgba(255,255,255,0.12)",
                  border: "1px solid rgba(255,255,255,0.2)",
                  boxShadow: "0 4px 14px -6px rgba(0,0,0,0.5)",
                }}
                type="button"
                onClick={() => setIsStylePopoverOpen((v) => !v)}
                aria-label="Open board style settings"
              >
                <Settings2 className="h-4 w-4" />
              </button>

              {/* Style popover panel */}
              <div
                className={`absolute right-0 z-50 mt-2.5 w-[280px] rounded-2xl p-4 transition duration-200 origin-top-right ${
                  isStylePopoverOpen
                    ? "pointer-events-auto scale-100 opacity-100"
                    : "pointer-events-none scale-95 opacity-0"
                }`}
                style={{
                  background: "linear-gradient(160deg, rgba(14,26,58,0.99) 0%, rgba(10,18,44,0.99) 100%)",
                  border: "1px solid rgba(255,255,255,0.12)",
                  boxShadow: "0 30px 60px -20px rgba(4,8,28,0.9)",
                  backdropFilter: "blur(20px)",
                }}
              >
                <p
                  className="m-0 mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.1em]"
                  style={{ color: "#6b8abf" }}
                >
                  <Settings2 className="h-3.5 w-3.5" />
                  Board style
                </p>

                <div className="space-y-3">
                  <label className="flex items-center gap-3 text-sm text-[#a8c4ef]">
                    <span className="w-20 shrink-0 text-xs font-medium text-[#6b8abf]">Background</span>
                    <div
                      className="relative flex h-9 w-12 cursor-pointer items-center justify-center overflow-hidden rounded-lg"
                      style={{ border: "1px solid rgba(255,255,255,0.15)" }}
                    >
                      <input
                        className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                        type="color"
                        value={color}
                        onChange={(event) => setColor(event.target.value)}
                      />
                      <div className="h-5 w-5 rounded-md" style={{ backgroundColor: color }} />
                    </div>
                  </label>

                  <label className="block">
                    <span className="mb-1.5 block text-xs font-medium text-[#6b8abf]">Background image URL</span>
                    <input
                      className={darkInput}
                      style={darkInputStyle}
                      onFocus={(e) => (e.currentTarget.style.borderColor = "rgba(79,156,249,0.5)")}
                      onBlur={(e) => (e.currentTarget.style.borderColor = "rgba(255,255,255,0.14)")}
                      placeholder="https://images.unsplash.com/…"
                      value={backgroundUrl}
                      onChange={(event) => setBackgroundUrl(event.target.value)}
                    />
                  </label>

                  <button
                    className="w-full rounded-xl py-2.5 text-sm font-semibold text-white transition duration-200 hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
                    style={{ background: "linear-gradient(135deg, #4f9cf9 0%, #7b5cf6 100%)" }}
                    type="button"
                    onClick={() => void saveStyle()}
                    disabled={isSavingStyle}
                  >
                    {isSavingStyle ? "Saving…" : "Apply changes"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* ── Filter bar ── */}
      <div className="relative z-10 mx-4 shrink-0">{filterBar}</div>

      {/* ── Active filter banner ── */}
      {isFiltering ? (
        <div className="mx-4 shrink-0">
          <span
            className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold text-[#93c5fd]"
            style={{ background: "rgba(79,156,249,0.12)", border: "1px solid rgba(79,156,249,0.25)" }}
          >
            <span
              className="h-1.5 w-1.5 rounded-full bg-[#60a5fa]"
              style={{ animation: "pulseDot 1.6s ease-in-out infinite" }}
            />
            Showing filtered results
          </span>
        </div>
      ) : null}

      {/* ── Board canvas (DnD) ── */}
      <DndContext
        sensors={sensors}
        collisionDetection={collisionDetection}
        onDragStart={handleDragStartInternal}
        onDragCancel={() => setDragPreview(null)}
        onDragEnd={(event) => {
          void handleDragEndInternal(event);
        }}
      >
        <section className="styled-scrollbar flex min-h-0 flex-1 items-start gap-3 overflow-auto px-4 pb-4 pt-1">
          <SortableContext items={board.lists.map((list) => list.id)} strategy={horizontalListSortingStrategy}>
            {board.lists.map((list) => (
              <ListColumn
                key={list.id}
                list={list}
                visibleCardIds={visibleCardIds}
                onOpenCard={onOpenCard}
                onCreateCard={onCreateCard}
                onRenameList={onRenameList}
                onDeleteList={onDeleteList}
              />
            ))}
          </SortableContext>
        </section>

        {/*
          DragOverlay renders once, floating above all content.
          Rendering the exact same components ensures 100% pixel-perfect sizing,
          preventing any cursor offset when matched against the original element.
        */}
        <DragOverlay dropAnimation={null}>
          {dragPreview?.type === "list" ? (
            <ListColumn
              list={dragPreview.list}
              visibleCardIds={visibleCardIds}
              onOpenCard={() => {}}
              onCreateCard={async () => {}}
              onRenameList={async () => {}}
              onDeleteList={async () => {}}
              isOverlay
            />
          ) : dragPreview?.type === "card" ? (
            <CardItemVisual card={dragPreview.card} onOpen={() => {}} isOverlay />
          ) : null}
        </DragOverlay>
      </DndContext>

      {/* ── Add list FAB ── */}
      <div
        ref={addListPopoverRef}
        className="pointer-events-none absolute bottom-5 right-5 z-10 flex flex-col items-end gap-2.5"
      >
        {isAddListOpen ? (
          <form
            className="pointer-events-auto w-[min(300px,calc(100vw-2.5rem))] animate-fade-drop-in rounded-2xl p-3.5"
            style={{
              background: "linear-gradient(160deg, rgba(14,26,58,0.99) 0%, rgba(10,18,44,0.99) 100%)",
              border: "1px solid rgba(255,255,255,0.14)",
              boxShadow: "0 28px 60px -24px rgba(4,8,28,0.92)",
              backdropFilter: "blur(20px)",
            }}
            onSubmit={addList}
          >
            <p className="mb-2.5 text-xs font-semibold uppercase tracking-wider text-[#6b8abf]">
              New list
            </p>
            <input
              className={darkInput}
              style={darkInputStyle}
              onFocus={(e) => (e.currentTarget.style.borderColor = "rgba(79,156,249,0.5)")}
              onBlur={(e) => (e.currentTarget.style.borderColor = "rgba(255,255,255,0.14)")}
              placeholder="List title…"
              value={listTitle}
              onChange={(event) => setListTitle(event.target.value)}
              disabled={isAddingList}
              autoFocus
            />
            <div className="mt-2.5 flex gap-2">
              <button
                className="flex-1 rounded-xl py-2 text-sm font-semibold text-white transition duration-200 hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
                style={{ background: "linear-gradient(135deg, #4f9cf9 0%, #7b5cf6 100%)" }}
                type="submit"
                disabled={isAddingList || !listTitle.trim()}
              >
                {isAddingList ? "Adding…" : "Add list"}
              </button>
              <button
                className="rounded-xl px-3 py-2 text-sm font-medium text-[#8aaee0] transition duration-150"
                style={{ border: "1px solid rgba(255,255,255,0.12)" }}
                onMouseEnter={(e) => ((e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.07)")}
                onMouseLeave={(e) => ((e.currentTarget as HTMLButtonElement).style.background = "transparent")}
                type="button"
                onClick={() => {
                  setIsAddListOpen(false);
                  setListTitle("");
                }}
                disabled={isAddingList}
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </form>
        ) : null}

        <button
          className="pointer-events-auto flex items-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-semibold text-white shadow-xl transition duration-200 hover:-translate-y-0.5 hover:brightness-110"
          style={{
            background: "linear-gradient(135deg, rgba(79,156,249,0.75) 0%, rgba(123,92,246,0.75) 100%)",
            border: "1px solid rgba(255,255,255,0.25)",
            backdropFilter: "blur(12px)",
            boxShadow: "0 16px 40px -16px rgba(15,30,80,0.8), inset 0 1px 0 rgba(255,255,255,0.15)",
          }}
          type="button"
          onClick={() => setIsAddListOpen(true)}
        >
          <Plus className="h-4 w-4" />
          Add list
        </button>
      </div>
    </div>
  );
}
