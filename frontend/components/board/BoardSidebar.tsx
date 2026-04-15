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
import { restrictToWindowEdges } from "@dnd-kit/modifiers";
import { SortableContext, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import clsx from "clsx";
import { FormEvent, useState } from "react";
import {
  AlertTriangle,
  GripVertical,
  LayoutGrid,
  Plus,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { Modal } from "@/components/common/Modal";
import type { BoardSummary, Id } from "@/lib/types";

interface BoardSidebarProps {
  boards: BoardSummary[];
  selectedBoardId: Id | null;
  onSelectBoard: (boardId: Id) => void;
  onCreateBoard: (title: string, description: string) => Promise<void>;
  onDeleteBoard: (boardId: Id) => Promise<void>;
  onReorderBoards: (activeId: Id, overId: Id) => Promise<void>;
  loading?: boolean;
}

interface SortableBoardCardProps {
  board: BoardSummary;
  active: boolean;
  onSelectBoard: (boardId: Id) => void;
  onDeleteBoard: (board: BoardSummary) => void;
}

/* Deterministic gradient per board based on title */
function boardGradient(title: string) {
  const gradients = [
    "linear-gradient(135deg, #4f9cf9 0%, #7b5cf6 100%)",
    "linear-gradient(135deg, #f59e0b 0%, #f43f5e 100%)",
    "linear-gradient(135deg, #22c55e 0%, #4f9cf9 100%)",
    "linear-gradient(135deg, #a78bfa 0%, #ec4899 100%)",
    "linear-gradient(135deg, #14b8a6 0%, #4f9cf9 100%)",
    "linear-gradient(135deg, #f97316 0%, #f59e0b 100%)",
  ];
  const idx = title.charCodeAt(0) % gradients.length;
  return gradients[idx];
}

function SortableBoardCard({ board, active, onSelectBoard, onDeleteBoard }: SortableBoardCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: board.id,
    data: { type: "board" },
  });

  // Use Translate (not Transform) for smooth drag without scale distortion
  const style = {
    transform: CSS.Translate.toString(transform),
    transition: isDragging ? "none" : transition,
  };

  const gradient = boardGradient(board.title);

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={clsx(
        "group relative w-full overflow-hidden rounded-2xl border p-3 text-left transition-[border-color,background,box-shadow] duration-200",
        active
          ? "border-[#4f9cf9]/50 bg-[#1e3060]/80 shadow-[0_0_0_1px_rgba(79,156,249,0.2),0_8px_24px_-12px_rgba(79,156,249,0.3)]"
          : "border-white/8 bg-white/5 hover:border-white/15 hover:bg-white/8",
        isDragging ? "opacity-50" : "",
      )}
      title={board.title}
    >
      {/* Active indicator bar */}
      {active ? (
        <span
          className="absolute inset-y-0 left-0 w-[3px] rounded-r"
          style={{ background: gradient }}
        />
      ) : null}

      <div className="flex items-start gap-2.5 pl-1">
        {/* Drag handle */}
        <button
          className="mt-0.5 grid h-7 w-7 shrink-0 cursor-grab place-items-center rounded-lg active:cursor-grabbing transition duration-150"
          style={{
            border: "1px solid rgba(255,255,255,0.1)",
            background: "rgba(255,255,255,0.06)",
            color: "rgba(160,185,230,0.7)",
          }}
          type="button"
          aria-label={`Drag ${board.title}`}
          {...attributes}
          {...listeners}
        >
          <GripVertical className="h-3.5 w-3.5" />
        </button>

        {/* Board info */}
        <button className="min-w-0 flex-1 text-left" onClick={() => onSelectBoard(board.id)} type="button">
          <div className="flex items-center gap-2">
            <div
              className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md"
              style={{ background: gradient }}
            >
              <LayoutGrid className="h-3 w-3 text-white" />
            </div>
            <strong className="block truncate text-sm font-semibold text-[#dde8ff]">{board.title}</strong>
          </div>
          <p className="m-0 mt-1.5 line-clamp-2 max-h-8 overflow-hidden text-xs leading-relaxed text-[#8aabdb]">
            {board.description || "No description"}
          </p>
        </button>

        {/* Delete button */}
        <button
          className="shrink-0 rounded-lg p-1.5 transition duration-150"
          style={{
            border: "1px solid rgba(255,255,255,0.12)",
            background: "rgba(255,255,255,0.05)",
            color: "rgba(180,195,230,0.7)",
          }}
          onMouseEnter={(e) => {
            const el = e.currentTarget as HTMLButtonElement;
            el.style.background = "rgba(244, 63, 94, 0.15)";
            el.style.borderColor = "rgba(244, 63, 94, 0.4)";
            el.style.color = "#f87171";
          }}
          onMouseLeave={(e) => {
            const el = e.currentTarget as HTMLButtonElement;
            el.style.background = "rgba(255,255,255,0.05)";
            el.style.borderColor = "rgba(255,255,255,0.12)";
            el.style.color = "rgba(180,195,230,0.7)";
          }}
          type="button"
          aria-label={`Delete ${board.title}`}
          onClick={() => onDeleteBoard(board)}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Bottom shimmer line */}
      <span
        className={`pointer-events-none absolute inset-x-4 bottom-0 h-px transition-opacity ${
          active ? "opacity-60" : "opacity-0 group-hover:opacity-40"
        }`}
        style={{ background: "linear-gradient(to right, transparent, rgba(100,150,255,0.4), transparent)" }}
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

  /* Dark-theme input */
  const darkInput =
    "w-full rounded-xl px-3 py-2.5 text-sm text-[#dce8ff] outline-none transition duration-200 placeholder:text-[#5a7ab0] disabled:cursor-not-allowed disabled:opacity-60";
  const darkInputStyle = {
    background: "rgba(255,255,255,0.06)",
    border: "1px solid rgba(255,255,255,0.12)",
  };

  const filteredBoards = boards.filter((board) =>
    board.title.toLowerCase().includes(boardSearch.trim().toLowerCase()),
  );

  return (
    <aside
      className="flex h-full w-full min-h-0 min-w-0 flex-col gap-4 rounded-3xl p-4 text-[#ecf4ff]"
      style={{
        background: "linear-gradient(160deg, rgba(14,24,52,0.98) 0%, rgba(10,18,40,0.99) 100%)",
        border: "1px solid rgba(255,255,255,0.08)",
        boxShadow: "0 30px 80px -45px rgba(6, 12, 32, 0.85)",
        backdropFilter: "blur(20px)",
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <div
            className="h-4 w-1 rounded-full"
            style={{ background: "linear-gradient(to bottom, #4f9cf9, #7b5cf6)" }}
          />
          <h2 className="m-0 text-sm font-semibold uppercase tracking-[0.1em] text-[#c8d9f5]">
            Boards
          </h2>
        </div>
        <span
          className="rounded-full px-2 py-0.5 text-xs font-semibold text-[#8aaee0]"
          style={{ background: "rgba(79,156,249,0.1)", border: "1px solid rgba(79,156,249,0.2)" }}
        >
          {boards.length}
        </span>
      </div>

      {/* Search + New board */}
      <div className="flex flex-col gap-2">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#5a7ab0]" />
          <input
            className={`${darkInput} pl-9`}
            style={darkInputStyle}
            placeholder="Search boards…"
            value={boardSearch}
            onChange={(event) => setBoardSearch(event.target.value)}
          />
          {boardSearch ? (
            <button
              type="button"
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[#5a7ab0] transition hover:text-[#dce8ff]"
              onClick={() => setBoardSearch("")}
              aria-label="Clear search"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          ) : null}
        </div>
        <button
          type="button"
          onClick={() => setIsCreateModalOpen(true)}
          className="flex w-full items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-semibold text-white transition duration-200 hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
          style={{ background: "linear-gradient(135deg, #4f9cf9 0%, #7b5cf6 100%)" }}
          disabled={loading}
        >
          <Plus className="h-4 w-4" />
          New board
        </button>
      </div>

      {/* Board list */}
      <div className="hide-scrollbar min-h-0 flex-1 overflow-y-auto">
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
            <div className="flex min-h-0 flex-col gap-1.5">
              {filteredBoards.map((board) => (
                <SortableBoardCard
                  key={board.id}
                  board={board}
                  active={selectedBoardId === board.id}
                  onSelectBoard={onSelectBoard}
                  onDeleteBoard={setPendingDeleteBoard}
                />
              ))}
              {filteredBoards.length === 0 ? (
                <div className="mt-6 flex flex-col items-center gap-2 px-2 text-center">
                  <LayoutGrid className="h-8 w-8 text-[#8aaee0] opacity-20" />
                  <p className="m-0 text-xs text-[#5a7ab0]">No boards found.</p>
                </div>
              ) : null}
            </div>
          </SortableContext>

          <DragOverlay modifiers={[restrictToWindowEdges]}>
            {draggedBoard ? (
              <div
                className="w-[min(280px,calc(100vw-64px))] rounded-2xl p-3 text-white"
                style={{
                  background: "rgba(30,48,96,0.97)",
                  border: "1px solid rgba(79,156,249,0.4)",
                  boxShadow: "0 24px 55px -20px rgba(8,16,44,0.88)",
                  backdropFilter: "blur(12px)",
                }}
              >
                <div className="flex items-center gap-2">
                  <LayoutGrid className="h-4 w-4 shrink-0 text-[#4f9cf9]" />
                  <strong className="truncate text-sm font-semibold">{draggedBoard.title}</strong>
                </div>
                <p className="mt-1 truncate text-xs text-[#8aaee0]">
                  {draggedBoard.description || "No description"}
                </p>
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      </div>

      {/* Create board modal */}
      <Modal
        open={isCreateModalOpen}
        onClose={() => {
          if (isCreating) return;
          setIsCreateModalOpen(false);
        }}
        title="Create new board"
      >
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-1.5">
            <label htmlFor="new-board-title" className="text-xs font-semibold uppercase tracking-wider text-[#6b8abf]">
              Title
            </label>
            <input
              id="new-board-title"
              className="w-full rounded-xl px-3.5 py-2.5 text-sm text-[#dce8ff] outline-none transition duration-200 placeholder:text-[#3f5b8a] disabled:cursor-not-allowed disabled:opacity-60"
              style={{
                background: "rgba(255,255,255,0.06)",
                border: "1px solid rgba(255,255,255,0.12)",
              }}
              onFocus={(e) => (e.currentTarget.style.borderColor = "rgba(79,156,249,0.5)")}
              onBlur={(e) => (e.currentTarget.style.borderColor = "rgba(255,255,255,0.12)")}
              placeholder="My awesome project"
              value={newBoardTitle}
              onChange={(event) => setNewBoardTitle(event.target.value)}
              disabled={isCreating || loading}
              autoFocus
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="new-board-description" className="text-xs font-semibold uppercase tracking-wider text-[#6b8abf]">
              Description
            </label>
            <textarea
              id="new-board-description"
              className="w-full min-h-[80px] resize-none rounded-xl px-3.5 py-2.5 text-sm text-[#dce8ff] outline-none transition duration-200 placeholder:text-[#3f5b8a] disabled:cursor-not-allowed disabled:opacity-60"
              style={{
                background: "rgba(255,255,255,0.06)",
                border: "1px solid rgba(255,255,255,0.12)",
              }}
              onFocus={(e) => (e.currentTarget.style.borderColor = "rgba(79,156,249,0.5)")}
              onBlur={(e) => (e.currentTarget.style.borderColor = "rgba(255,255,255,0.12)")}
              placeholder="What is this board for? (optional)"
              value={newBoardDescription}
              onChange={(event) => setNewBoardDescription(event.target.value)}
              disabled={isCreating || loading}
              rows={3}
            />
          </div>

          <div className="flex justify-end gap-2.5 pt-1">
            <button
              type="button"
              onClick={() => setIsCreateModalOpen(false)}
              disabled={isCreating}
              className="rounded-xl px-4 py-2 text-sm font-medium text-[#8aaee0] transition duration-150 disabled:cursor-not-allowed disabled:opacity-60"
              style={{ border: "1px solid rgba(255,255,255,0.12)" }}
              onMouseEnter={(e) => ((e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.07)")}
              onMouseLeave={(e) => ((e.currentTarget as HTMLButtonElement).style.background = "transparent")}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isCreating || loading || !newBoardTitle.trim()}
              className="rounded-xl px-4 py-2 text-sm font-semibold text-white transition duration-200 hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
              style={{ background: "linear-gradient(135deg, #4f9cf9 0%, #7b5cf6 100%)" }}
            >
              {isCreating ? "Creating…" : "Create board"}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete confirmation modal */}
      <Modal
        open={pendingDeleteBoard !== null}
        onClose={() => {
          if (isDeletingBoard) return;
          setPendingDeleteBoard(null);
        }}
        title="Delete board?"
      >
        <div className="space-y-4">
          <div
            className="flex items-start gap-3 rounded-xl p-3.5"
            style={{ background: "rgba(244,63,94,0.08)", border: "1px solid rgba(244,63,94,0.2)" }}
          >
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-[#f87171]" />
            <p className="m-0 text-sm leading-relaxed text-[#c8d9f5]">
              This will permanently delete{" "}
              <span className="font-semibold text-white">{pendingDeleteBoard?.title}</span> and all its
              lists and cards. This action cannot be undone.
            </p>
          </div>
          <div className="flex justify-end gap-2.5">
            <button
              onClick={() => setPendingDeleteBoard(null)}
              disabled={isDeletingBoard}
              className="rounded-xl px-4 py-2 text-sm font-medium text-[#8aaee0] transition duration-150 disabled:cursor-not-allowed disabled:opacity-60"
              style={{ border: "1px solid rgba(255,255,255,0.12)" }}
              onMouseEnter={(e) => ((e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.07)")}
              onMouseLeave={(e) => ((e.currentTarget as HTMLButtonElement).style.background = "transparent")}
            >
              Cancel
            </button>
            <button
              onClick={handleConfirmDeleteBoard}
              disabled={isDeletingBoard}
              className="rounded-xl px-4 py-2 text-sm font-semibold text-white transition duration-200 hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
              style={{ background: "linear-gradient(135deg, #ef4444 0%, #be123c 100%)" }}
            >
              {isDeletingBoard ? "Deleting…" : "Delete board"}
            </button>
          </div>
        </div>
      </Modal>
    </aside>
  );
}
