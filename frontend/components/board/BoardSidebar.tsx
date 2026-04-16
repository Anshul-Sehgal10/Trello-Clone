"use client";

import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { snapCenterToCursor } from "@dnd-kit/modifiers";
import { SortableContext, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import clsx from "clsx";
import { FormEvent, useEffect, useRef, useState } from "react";
import { ChevronsLeft, ChevronsRight, GripVertical, LayoutGrid, Plus, Search, Trash2, X } from "lucide-react";
import { Modal } from "@/components/common/Modal";
import type { BoardSummary, Id } from "@/lib/types";

interface BoardSidebarProps {
  boards: BoardSummary[];
  selectedBoardId: Id | null;
  onSelectBoard: (boardId: Id) => void;
  onCreateBoard: (title: string, description: string) => Promise<void>;
  onDeleteBoard: (boardId: Id) => Promise<void>;
  onReorderBoards: (activeId: Id, overId: Id) => Promise<void>;
  collapsed: boolean;
  onToggleCollapsed: () => void;
  loading?: boolean;
}

interface SortableBoardCardProps {
  board: BoardSummary;
  active: boolean;
  compact: boolean;
  onSelectBoard: (boardId: Id) => void;
  onDeleteBoard: (board: BoardSummary) => void;
}

function SortableBoardCard({ board, active, compact, onSelectBoard, onDeleteBoard }: SortableBoardCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: board.id,
    data: { type: "board" },
  });

  const initials = board.title
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  const dragProps = compact ? { ...attributes, ...listeners } : {};

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...dragProps}
      className={clsx(
        `group relative w-full overflow-hidden rounded-2xl border p-3 text-left transition duration-200 ${
          active
            ? "border-[#85b6ff]/40 bg-[#2b3b5f] text-white"
            : "border-white/10 bg-white/5 text-[#e4efff] hover:border-white/20 hover:bg-white/10"
        }`,
        { "cursor-grab px-1.5 py-1.5 active:cursor-grabbing": compact },
        { "opacity-70": isDragging },
      )}
      title={board.title}
    >
      {compact ? (
        <button
          className={clsx(
            "mx-auto flex h-10 w-10 items-center justify-center rounded-xl border text-xs font-semibold transition",
            active
              ? "border-[#9bc1ff] bg-[#3563ad] text-white"
              : "border-white/20 bg-white/10 text-[#dce9ff] hover:bg-white/20",
          )}
          onClick={() => onSelectBoard(board.id)}
          type="button"
          aria-label={board.title}
          title={board.title}
        >
          {initials}
        </button>
      ) : (
        <>
          {active ? <span className="absolute inset-y-2 left-0 w-1 rounded-r bg-[#4f9cf9]" /> : null}
          <div className="flex items-start gap-2.5 pl-1">
            <button
              className="mt-0.5 grid h-7 w-7 shrink-0 cursor-grab place-items-center rounded-lg border border-white/15 bg-white/10 text-xs active:cursor-grabbing"
              type="button"
              aria-label={`Drag ${board.title}`}
              {...attributes}
              {...listeners}
            >
              <GripVertical className="h-4 w-4" />
            </button>

            <button className="min-w-0 flex-1 text-left" onClick={() => onSelectBoard(board.id)} type="button">
              <div className="flex items-center gap-2">
                <LayoutGrid className="h-4 w-4 shrink-0" />
                <strong className="block truncate text-sm font-semibold">{board.title}</strong>
              </div>
              <p className="m-0 mt-1 max-h-9 overflow-hidden wrap-break-word text-xs text-[#c6d7f5]">
                {board.description || "No description"}
              </p>
            </button>

            <button
              className="rounded-lg border border-white/20 bg-white/10 p-1.5 text-white/85 transition hover:bg-white/20 hover:text-white"
              type="button"
              aria-label={`Delete ${board.title}`}
              onClick={() => onDeleteBoard(board)}
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </>
      )}

      <span
        className={`pointer-events-none absolute inset-x-4 bottom-0 h-px bg-linear-to-r from-transparent via-white/20 to-transparent transition-opacity ${
          active ? "opacity-80" : "opacity-0 group-hover:opacity-70"
        }`}
      />
    </div>
  );
}

export function BoardSidebar({
  boards,
  selectedBoardId,
  onSelectBoard,
  onCreateBoard,
  onDeleteBoard,
  onReorderBoards,
  collapsed,
  onToggleCollapsed,
  loading = false,
}: BoardSidebarProps) {
  const [newBoardTitle, setNewBoardTitle] = useState("");
  const [newBoardDescription, setNewBoardDescription] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [pendingDeleteBoard, setPendingDeleteBoard] = useState<BoardSummary | null>(null);
  const [isDeletingBoard, setIsDeletingBoard] = useState(false);
  const [draggedBoard, setDraggedBoard] = useState<BoardSummary | null>(null);
  const [boardSearch, setBoardSearch] = useState("");
  const [isCompactSearchOpen, setIsCompactSearchOpen] = useState(false);
  const compactSearchRef = useRef<HTMLDivElement | null>(null);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const title = newBoardTitle.trim();
    const description = newBoardDescription.trim();
    if (!title) return;

    setIsCreating(true);
    try {
      await onCreateBoard(title, description);
      setNewBoardTitle("");
      setNewBoardDescription("");
      setIsCreateModalOpen(false);
    } finally {
      setIsCreating(false);
    }
  };

  const handleConfirmDeleteBoard = async () => {
    if (!pendingDeleteBoard || isDeletingBoard) return;

    try {
      setIsDeletingBoard(true);
      await onDeleteBoard(pendingDeleteBoard.id);
      setPendingDeleteBoard(null);
    } finally {
      setIsDeletingBoard(false);
    }
  };

  const inputBase =
    "w-full rounded-xl border border-white/15 bg-white/10 px-3 py-2 text-sm text-white outline-none transition duration-200 placeholder:text-white/60 focus:border-[#5fa8ff] focus:ring-2 focus:ring-[#5fa8ff]/25 disabled:cursor-not-allowed disabled:opacity-60";
  const buttonBase =
    "w-full rounded-xl border border-transparent bg-gradient-to-r from-[#4f9cf9] to-[#7b8dff] px-3 py-2 text-sm font-semibold text-white transition duration-200 hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60";
  const filteredBoards = boards.filter((board) => board.title.toLowerCase().includes(boardSearch.trim().toLowerCase()));

  useEffect(() => {
    if (!collapsed) {
      setIsCompactSearchOpen(false);
      return;
    }

    const handlePointerDown = (event: PointerEvent) => {
      if (!compactSearchRef.current?.contains(event.target as Node)) {
        setIsCompactSearchOpen(false);
      }
    };

    window.addEventListener("pointerdown", handlePointerDown);
    return () => window.removeEventListener("pointerdown", handlePointerDown);
  }, [collapsed]);

  return (
    <aside
      className={clsx(
        "flex h-full w-full min-h-0 min-w-0 flex-col gap-4 rounded-3xl border border-white/10 bg-[#1f2943]/95 p-4 text-[#ecf4ff] shadow-[0_30px_80px_-45px_rgba(9,19,44,0.8)] backdrop-blur-xl",
        collapsed ? "items-center p-2.5" : "",
      )}
    >
      <div className="flex items-center justify-between px-1">
        {collapsed ? null : (
          <h2 className="m-0 text-sm font-semibold uppercase tracking-[0.08em] text-[#d7e5ff]">Boards</h2>
        )}
        <div className="flex items-center gap-2">
          {collapsed ? null : (
            <span className="rounded-full border border-white/15 bg-white/10 px-2 py-0.5 text-xs text-[#d9e7ff]">
              {boards.length}
            </span>
          )}
          {collapsed ? (
            <div ref={compactSearchRef} className="relative">
              <button
                type="button"
                onClick={() => setIsCompactSearchOpen((value) => !value)}
                className="grid h-8 w-8 place-items-center rounded-lg border border-white/15 bg-white/10 text-white/90 transition hover:bg-white/20"
                aria-label="Search boards"
                title="Search boards"
              >
                <Search className="h-4 w-4" />
              </button>

              <div
                className={`absolute left-full top-0 z-30 ml-2 w-56 rounded-xl border border-white/20 bg-[#1f2943]/95 p-2 shadow-lg backdrop-blur transition ${
                  isCompactSearchOpen ? "opacity-100" : "pointer-events-none opacity-0"
                }`}
              >
                <div className="relative">
                  <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#9fbbeb]" />
                  <input
                    className="w-full rounded-lg border border-white/15 bg-white/10 py-1.5 pl-8 pr-7 text-xs text-white outline-none placeholder:text-white/60 focus:border-[#5fa8ff]"
                    placeholder="Search boards"
                    value={boardSearch}
                    onChange={(event) => setBoardSearch(event.target.value)}
                    autoFocus
                  />
                  {boardSearch ? (
                    <button
                      type="button"
                      onClick={() => setBoardSearch("")}
                      className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded p-1 text-white/70 hover:text-white"
                      aria-label="Clear search"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  ) : null}
                </div>
              </div>
            </div>
          ) : null}
          <button
            type="button"
            onClick={onToggleCollapsed}
            className="grid h-8 w-8 place-items-center rounded-lg border border-white/15 bg-white/10 text-white/90 transition hover:bg-white/20"
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? <ChevronsRight className="h-4 w-4" /> : <ChevronsLeft className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {collapsed ? (
        <button
          type="button"
          onClick={() => setIsCreateModalOpen(true)}
          className="grid h-10 w-10 place-items-center rounded-xl border border-white/20 bg-gradient-to-r from-[#4f9cf9] to-[#7b8dff] text-white transition hover:brightness-110"
          aria-label="New board"
          title="New board"
        >
          <Plus className="h-4 w-4" />
        </button>
      ) : (
        <div className="flex flex-col gap-2">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-white/60" />
            <input
              className={`${inputBase} pl-8`}
              placeholder="Search boards"
              value={boardSearch}
              onChange={(event) => setBoardSearch(event.target.value)}
            />
          </div>
          <button
            type="button"
            onClick={() => setIsCreateModalOpen(true)}
            className={buttonBase}
            disabled={loading}
          >
            <span className="inline-flex items-center justify-center gap-2">
              <Plus className="h-4 w-4" />
              New board
            </span>
          </button>
        </div>
      )}

      <div className="hide-scrollbar min-h-0 overflow-y-auto pr-1">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={(event: DragStartEvent) => {
            const board = boards.find((entry) => entry.id === String(event.active.id)) ?? null;
            setDraggedBoard(board);
          }}
          onDragCancel={() => setDraggedBoard(null)}
          onDragEnd={(event: DragEndEvent) => {
            setDraggedBoard(null);
            const { active, over } = event;
            if (!over || active.id === over.id) return;
            void onReorderBoards(String(active.id), String(over.id));
          }}
        >
          <SortableContext items={filteredBoards.map((board) => board.id)} strategy={verticalListSortingStrategy}>
            <div className="flex min-h-0 flex-col gap-2">
              {filteredBoards.map((board) => (
                <SortableBoardCard
                  key={board.id}
                  board={board}
                  active={selectedBoardId === board.id}
                  compact={collapsed}
                  onSelectBoard={onSelectBoard}
                  onDeleteBoard={setPendingDeleteBoard}
                />
              ))}
              {filteredBoards.length === 0 ? (
                <p className="m-0 px-2 py-1 text-xs text-[#c6d7f5]/80">No boards found.</p>
              ) : null}
            </div>
          </SortableContext>

          <DragOverlay dropAnimation={null} modifiers={[snapCenterToCursor]}>
            {draggedBoard ? (
              <div className="w-[min(320px,calc(100vw-64px))] rounded-2xl border border-[#85b6ff]/45 bg-[#2b3b5f]/95 p-3 text-white shadow-[0_20px_50px_-24px_rgba(11,23,51,0.85)] backdrop-blur">
                <div className="flex items-center gap-2">
                  <LayoutGrid className="h-4 w-4 shrink-0" />
                  <strong className="truncate text-sm font-semibold">{draggedBoard.title}</strong>
                </div>
                <p className="mt-1 truncate text-xs text-[#d7e5ff]">{draggedBoard.description || "No description"}</p>
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      </div>

      <Modal
        open={isCreateModalOpen}
        onClose={() => {
          if (isCreating) return;
          setIsCreateModalOpen(false);
        }}
        title="New board"
      >
        <form className="space-y-3" onSubmit={handleSubmit}>
          <div className="space-y-1.5">
            <label htmlFor="new-board-title" className="text-sm font-medium text-slate-700">
              Title
            </label>
            <input
              id="new-board-title"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-800 outline-none transition focus:border-[#5fa8ff] focus:ring-2 focus:ring-[#5fa8ff]/25"
              placeholder="Board title"
              value={newBoardTitle}
              onChange={(event) => setNewBoardTitle(event.target.value)}
              disabled={isCreating || loading}
              autoFocus
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="new-board-description" className="text-sm font-medium text-slate-700">
              Description
            </label>
            <textarea
              id="new-board-description"
              className="w-full min-h-20 resize-none rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-800 outline-none transition focus:border-[#5fa8ff] focus:ring-2 focus:ring-[#5fa8ff]/25"
              placeholder="Description (optional)"
              value={newBoardDescription}
              onChange={(event) => setNewBoardDescription(event.target.value)}
              disabled={isCreating || loading}
              rows={3}
            />
          </div>

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsCreateModalOpen(false)}
              disabled={isCreating}
              className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isCreating || loading || !newBoardTitle.trim()}
              className="rounded-lg border border-[#4f9cf9] bg-[#4f9cf9] px-3 py-1.5 text-sm font-semibold text-white transition hover:bg-[#3f8ff2] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isCreating ? "Creating..." : "Create board"}
            </button>
          </div>
        </form>
      </Modal>

      <Modal
        open={pendingDeleteBoard !== null}
        onClose={() => {
          if (isDeletingBoard) return;
          setPendingDeleteBoard(null);
        }}
        title="Delete board?"
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-700">
            This will permanently delete
            <span className="font-semibold text-slate-900"> {pendingDeleteBoard?.title}</span>.
            This action cannot be undone.
          </p>
          <div className="flex justify-end gap-2">
            <button
              onClick={() => setPendingDeleteBoard(null)}
              disabled={isDeletingBoard}
              className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirmDeleteBoard}
              disabled={isDeletingBoard}
              className="rounded-lg border border-rose-700 bg-rose-600 px-3 py-1.5 text-sm font-semibold text-white transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isDeletingBoard ? "Deleting..." : "Delete board"}
            </button>
          </div>
        </div>
      </Modal>
    </aside>
  );
}
