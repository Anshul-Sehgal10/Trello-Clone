"use client";

import { DragEndEvent } from "@dnd-kit/core";
import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { arrayMove } from "@dnd-kit/sortable";
import { BoardCanvas } from "@/components/board/BoardCanvas";
import { BoardSidebar } from "@/components/board/BoardSidebar";
import { CardDetailModal } from "@/components/card/CardDetailModal";
import { ToastItem, ToastStack } from "@/components/common/ToastStack";
import { SearchFilterBar } from "@/components/filters/SearchFilterBar";
import { api } from "@/lib/api";
import { moveCard, reorderLists } from "@/lib/board-utils";
import { BoardDetail, BoardSummary, Card, CardMutation, Id, Label, SearchFilters } from "@/lib/types";

const EMPTY_FILTERS: SearchFilters = {
  query: "",
  labelId: "",
  memberId: "",
  dueDateFrom: "",
  dueDateTo: "",
};

function toCardMutation(card: Card): CardMutation {
  return {
    id: card.id,
    listId: card.listId,
    title: card.title,
    description: card.description,
    position: card.position,
    dueDate: card.dueDate,
    dueComplete: card.dueComplete,
    archived: card.archived,
    cover: card.cover,
    createdAt: card.createdAt,
    updatedAt: card.updatedAt,
  };
}

function hasActiveFilters(filters: SearchFilters) {
  return Boolean(
    filters.query.trim() ||
      filters.labelId ||
      filters.memberId ||
      filters.dueDateFrom ||
      filters.dueDateTo,
  );
}

export default function Home() {
  const router = useRouter();
  const pathname = usePathname();

  const [boards, setBoards] = useState<BoardSummary[]>([]);
  const [selectedBoardId, setSelectedBoardId] = useState<Id | null>(null);
  const [board, setBoard] = useState<BoardDetail | null>(null);
  const [labels, setLabels] = useState<Label[]>([]);
  const [filters, setFilters] = useState<SearchFilters>(EMPTY_FILTERS);
  const [visibleCardIds, setVisibleCardIds] = useState<Set<string> | null>(null);
  const [selectedCardId, setSelectedCardId] = useState<Id | null>(null);
  const [selectedCardDetail, setSelectedCardDetail] = useState<Card | null>(null);
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  const [loadingBoards, setLoadingBoards] = useState(true);
  const [loadingBoard, setLoadingBoard] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedCard = useMemo(() => {
    if (!board || !selectedCardId) return null;
    for (const list of board.lists) {
      const card = list.cards.find((entry) => entry.id === selectedCardId);
      if (card) return card;
    }
    return null;
  }, [board, selectedCardId]);

  const activeCard = selectedCardDetail ?? selectedCard;

  const activeBoardIdFromRoute = useMemo(() => {
    const match = pathname.match(/^\/boards\/([^/]+)$/);
    return match?.[1] ?? null;
  }, [pathname]);

  const pushToast = (tone: ToastItem["tone"], message: string) => {
    const id = crypto.randomUUID();
    setToasts((prev) => [...prev, { id, tone, message }]);
    window.setTimeout(() => {
      setToasts((prev) => prev.filter((toast) => toast.id !== id));
    }, 2800);
  };

  const loadBoards = async () => {
    setLoadingBoards(true);
    setError(null);
    try {
      const fetchedBoards = await api.getBoards();
      setBoards(fetchedBoards);

      if (fetchedBoards.length === 0) {
        setSelectedBoardId(null);
        return;
      }

      if (activeBoardIdFromRoute && fetchedBoards.some((entry) => entry.id === activeBoardIdFromRoute)) {
        setSelectedBoardId(activeBoardIdFromRoute);
        return;
      }

      if (!selectedBoardId) {
        const fallbackBoard = fetchedBoards[0].id;
        setSelectedBoardId(fallbackBoard);
        router.replace(`/boards/${fallbackBoard}`);
      }
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Failed to load boards");
    } finally {
      setLoadingBoards(false);
    }
  };

  const loadBoardData = async (boardId: Id) => {
    setLoadingBoard(true);
    setError(null);
    try {
      const [boardDetail, boardLabels] = await Promise.all([
        api.getBoard(boardId),
        api.getBoardLabels(boardId),
      ]);
      setBoard(boardDetail);
      setLabels(boardLabels);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Failed to load board data");
    } finally {
      setLoadingBoard(false);
    }
  };

  useEffect(() => {
    void loadBoards();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!activeBoardIdFromRoute) return;
    if (activeBoardIdFromRoute !== selectedBoardId) {
      setSelectedBoardId(activeBoardIdFromRoute);
    }
  }, [activeBoardIdFromRoute, selectedBoardId]);

  useEffect(() => {
    if (!selectedBoardId) {
      setBoard(null);
      return;
    }
    setFilters(EMPTY_FILTERS);
    setVisibleCardIds(null);
    setSelectedCardId(null);
    setSelectedCardDetail(null);
    void loadBoardData(selectedBoardId);
  }, [selectedBoardId]);

  useEffect(() => {
    if (!selectedCardId) {
      setSelectedCardDetail(null);
      return;
    }

    void api
      .getCard(selectedCardId)
      .then((cardDetail) => setSelectedCardDetail(cardDetail))
      .catch(() => {
        pushToast("error", "Failed to load card details");
      });
  }, [selectedCardId]);

  useEffect(() => {
    if (!selectedBoardId || !hasActiveFilters(filters)) {
      setVisibleCardIds(null);
      return;
    }

    const timer = setTimeout(() => {
      void api
        .searchBoardCards(selectedBoardId, filters)
        .then((cards) => setVisibleCardIds(new Set(cards.map((card) => card.id))))
        .catch((requestError) => {
          setError(requestError instanceof Error ? requestError.message : "Failed to filter cards");
        });
    }, 250);

    return () => clearTimeout(timer);
  }, [selectedBoardId, filters]);

  useEffect(() => {
    if (selectedCardId && !selectedCard) {
      setSelectedCardId(null);
    }
  }, [selectedCardId, selectedCard]);

  const refreshCurrentBoard = async () => {
    if (!selectedBoardId) return;
    await loadBoardData(selectedBoardId);
  };

  const handleCreateBoard = async (title: string, description: string) => {
    const created = await api.createBoard({ title, description });
    setBoards((prev) => [created, ...prev]);
    setSelectedBoardId(created.id);
    router.push(`/boards/${created.id}`);
    pushToast("success", "Board created");
  };

  const handleSelectBoard = (boardId: Id) => {
    setSelectedBoardId(boardId);
    router.push(`/boards/${boardId}`);
  };

  const handleDeleteBoard = async (boardId: Id) => {
    const remainingBoards = boards.filter((entry) => entry.id !== boardId);
    setBoards(remainingBoards);

    const isDeletingActive = selectedBoardId === boardId;
    if (isDeletingActive) {
      setSelectedBoardId(remainingBoards[0]?.id ?? null);
      setBoard(null);
      if (remainingBoards.length > 0) {
        router.push(`/boards/${remainingBoards[0].id}`);
      } else {
        router.push(`/`);
      }
    }

    try {
      await api.deleteBoard(boardId);
      pushToast("info", "Board deleted");
    } catch (err) {
      await loadBoards();
      pushToast("error", err instanceof Error ? err.message : "Failed to delete board");
    }
  };

  const handleReorderBoards = async (activeId: Id, overId: Id) => {
    const oldIndex = boards.findIndex((entry) => entry.id === activeId);
    const newIndex = boards.findIndex((entry) => entry.id === overId);
    if (oldIndex === -1 || newIndex === -1 || oldIndex === newIndex) return;

    const reordered = arrayMove(boards, oldIndex, newIndex).map((entry, index) => ({
      ...entry,
      position: index,
    }));

    setBoards(reordered);

    try {
      await Promise.all(
        reordered.map((entry) =>
          api.updateBoard(entry.id, {
            title: entry.title,
            description: entry.description,
            color: entry.color,
            background: entry.background,
            position: entry.position,
          }),
        ),
      );
    } catch (err) {
      await loadBoards();
      pushToast("error", err instanceof Error ? err.message : "Failed to reorder boards");
    }
  };

  const handleCreateList = async (title: string) => {
    if (!selectedBoardId || !board) return;
    const created = await api.createList({ boardId: selectedBoardId, title });
    setBoard({
      ...board,
      lists: [...board.lists, { ...created, cards: [] }],
    });
    pushToast("success", "List added");
  };

  const handleRenameList = async (listId: Id, title: string) => {
    if (!board) return;

    setBoard({
      ...board,
      lists: board.lists.map((list) => (list.id === listId ? { ...list, title } : list)),
    });

    const target = board.lists.find((list) => list.id === listId);
    await api.updateList(listId, { title, position: target?.position ?? 0 });
    pushToast("success", "List updated");
  };

  const handleDeleteList = async (listId: Id) => {
    if (!board) return;
    setBoard({
      ...board,
      lists: board.lists.filter((list) => list.id !== listId),
    });
    await api.deleteList(listId);
    pushToast("info", "List deleted");
  };

  const handleCreateCard = async (listId: Id, title: string) => {
    if (!board) return;
    const created = await api.createCard({ listId, title, description: "" });

    setBoard({
      ...board,
      lists: board.lists.map((list) =>
        list.id === listId
          ? {
              ...list,
              cards: [...list.cards, created],
            }
          : list,
      ),
    });
    pushToast("success", "Card added");
  };

  const handleSaveCard = async (input: {
    title: string;
    description: string;
    dueDate: string | null;
    archived: boolean;
  }) => {
    if (!selectedCard) return;
    const mutation = toCardMutation({
      ...selectedCard,
      title: input.title,
      description: input.description,
      dueDate: input.dueDate,
      archived: input.archived,
    });

    await api.updateCard(selectedCard.id, mutation);
    await refreshCurrentBoard();
    if (selectedCard.id) {
      const cardDetail = await api.getCard(selectedCard.id);
      setSelectedCardDetail(cardDetail);
    }
    pushToast("success", "Card saved");
  };

  const handleDeleteCard = async () => {
    if (!selectedCard || !board) return;

    setBoard({
      ...board,
      lists: board.lists.map((list) => ({
        ...list,
        cards: list.cards.filter((card) => card.id !== selectedCard.id),
      })),
    });
    setSelectedCardId(null);
    setSelectedCardDetail(null);
    await api.deleteCard(selectedCard.id);
    pushToast("info", "Card deleted");
  };

  const handleToggleAssignee = async (memberId: Id, assigned: boolean) => {
    if (!selectedCard) return;
    if (assigned) {
      await api.assignMemberToCard(selectedCard.id, memberId);
      pushToast("success", "Member assigned");
    } else {
      await api.removeMemberFromCard(selectedCard.id, memberId);
      pushToast("info", "Member removed");
    }
    await refreshCurrentBoard();
    const cardDetail = await api.getCard(selectedCard.id);
    setSelectedCardDetail(cardDetail);
  };

  const handleToggleLabel = async (labelId: Id, attached: boolean) => {
    if (!selectedCard) return;
    if (attached) {
      await api.attachLabelToCard(selectedCard.id, labelId);
      pushToast("success", "Label added");
    } else {
      await api.detachLabelFromCard(selectedCard.id, labelId);
      pushToast("info", "Label removed");
    }
    await refreshCurrentBoard();
    const cardDetail = await api.getCard(selectedCard.id);
    setSelectedCardDetail(cardDetail);
  };

  const handleUpdateBoardStyle = async (input: { color: string | null; background: string | null }) => {
    if (!board) return;
    const optimistic = {
      ...board,
      color: input.color,
      background: input.background,
    };
    setBoard(optimistic);

    try {
      const updated = await api.updateBoard(board.id, {
        title: board.title,
        description: board.description,
        color: input.color,
        background: input.background,
      });

      setBoard((prev) => (prev ? { ...prev, ...updated } : prev));
      setBoards((prev) => prev.map((entry) => (entry.id === updated.id ? { ...entry, ...updated } : entry)));
      pushToast("success", "Board style updated");
    } catch (err) {
      await refreshCurrentBoard();
      pushToast("error", err instanceof Error ? err.message : "Failed to update board style");
    }
  };

  const handleCreateChecklist = async (title: string) => {
    if (!activeCard) return;
    await api.createChecklist({ cardId: activeCard.id, title });
    const refreshedCard = await api.getCard(activeCard.id);
    setSelectedCardDetail(refreshedCard);
    await refreshCurrentBoard();
    pushToast("success", "Checklist created");
  };

  const handleAddChecklistItem = async (checklistId: Id, title: string) => {
    if (!activeCard) return;
    await api.createChecklistItem({ checklistId, title });
    const refreshedCard = await api.getCard(activeCard.id);
    setSelectedCardDetail(refreshedCard);
    await refreshCurrentBoard();
    pushToast("success", "Checklist item added");
  };

  const handleToggleChecklistItem = async (
    _checklistId: Id,
    itemId: Id,
    current: { title: string; completed: boolean; position: number },
  ) => {
    if (!activeCard) return;
    await api.updateChecklistItem(itemId, {
      title: current.title,
      completed: !current.completed,
      position: current.position,
    });
    const refreshedCard = await api.getCard(activeCard.id);
    setSelectedCardDetail(refreshedCard);
    await refreshCurrentBoard();
  };

  const handleDeleteChecklistItem = async (itemId: Id) => {
    if (!activeCard) return;
    await api.deleteChecklistItem(itemId);
    const refreshedCard = await api.getCard(activeCard.id);
    setSelectedCardDetail(refreshedCard);
    await refreshCurrentBoard();
    pushToast("info", "Checklist item removed");
  };

  const handleAddComment = async (content: string) => {
    if (!activeCard || !board?.members.length) return;
    const defaultMember = board.members[0];
    await api.createComment({
      cardId: activeCard.id,
      memberId: defaultMember.id,
      content,
    });
    const refreshedCard = await api.getCard(activeCard.id);
    setSelectedCardDetail(refreshedCard);
    pushToast("success", "Comment added");
  };

  const handleDeleteComment = async (commentId: Id) => {
    if (!activeCard) return;
    await api.deleteComment(commentId);
    const refreshedCard = await api.getCard(activeCard.id);
    setSelectedCardDetail(refreshedCard);
    pushToast("info", "Comment deleted");
  };

  const handleDragStart = () => {};

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!board || !over || active.id === over.id) return;

    const activeId = String(active.id);
    const overId = String(over.id);
    const activeTypeRaw = active.data.current?.type as "list" | "card" | undefined;
    const activeType: "list" | "card" | undefined =
      activeTypeRaw ?? (board.lists.some((list) => list.id === activeId) ? "list" : "card");

    if (activeType === "list") {
      const overDataType = over.data.current?.type as "list" | "card" | undefined;
      const overListId =
        overDataType === "list"
          ? overId
          : overDataType === "card"
            ? String(over.data.current?.listId ?? "")
            : board.lists.some((list) => list.id === overId)
              ? overId
              : (board.lists.find((list) => list.cards.some((card) => card.id === overId))?.id ?? "");

      if (!overListId) return;

      const nextBoard = reorderLists(board, activeId, overListId);
      if (nextBoard === board) return;

      setBoard(nextBoard);

      try {
        await Promise.all(
          nextBoard.lists.map((list) =>
            api.updateList(list.id, {
              title: list.title,
              position: list.position,
            }),
          ),
        );
      } catch {
        await refreshCurrentBoard();
      }
      return;
    }

    if (activeType === "card") {
      const inferredOverType =
        (over.data.current?.type as "list" | "card" | undefined) ??
        (board.lists.some((list) => list.id === overId) ? "list" : "card");

      const moved = moveCard(board, activeId, overId, inferredOverType);
      if (!moved) return;

      setBoard(moved.nextBoard);

      const listsToPersist = [moved.sourceList];
      if (moved.sourceList.id !== moved.targetList.id) {
        listsToPersist.push(moved.targetList);
      }

      try {
        await Promise.all(
          listsToPersist.flatMap((list) =>
            list.cards.map((card) =>
              api.updateCard(card.id, {
                ...toCardMutation(card),
                listId: list.id,
                position: card.position,
              }),
            ),
          ),
        );
      } catch {
        await refreshCurrentBoard();
      }
    }
  };

  return (
    <div className="flex h-dvh max-h-dvh flex-col gap-3.5 overflow-hidden p-2.5 sm:p-3.5 lg:flex-row lg:items-stretch">
      <div
        className={`relative min-w-0 shrink-0 self-stretch overflow-hidden origin-left transition-[width,flex-basis,max-width] duration-300 ease-out will-change-[width] ${
          isSidebarCollapsed
            ? "w-full lg:basis-[84px] lg:w-[84px] lg:max-w-[84px]"
            : "w-full lg:basis-[300px] lg:w-[300px] lg:max-w-[300px]"
        }`}
      >
        <BoardSidebar
          boards={boards}
          selectedBoardId={selectedBoardId}
          onSelectBoard={handleSelectBoard}
          onCreateBoard={handleCreateBoard}
          onDeleteBoard={handleDeleteBoard}
          onReorderBoards={handleReorderBoards}
          collapsed={isSidebarCollapsed}
          onToggleCollapsed={() => setIsSidebarCollapsed((value) => !value)}
          loading={loadingBoards}
        />
      </div>

      <main className="relative flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-3xl border border-white/35 shadow-[0_38px_90px_-42px_rgba(8,16,40,0.92)]">
        <div
          className="absolute inset-0 -z-10 bg-white/10 backdrop-blur-xl"
          style={{
            backgroundColor: board?.color ?? "#275fa5",
            backgroundImage: board?.background ? `url(${board.background})` : undefined,
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        />
        {error ? <p className="m-0 bg-[#b42318] px-3.5 py-2.5 text-sm text-white">{error}</p> : null}

        {loadingBoard ? (
          <div className="grid min-h-[80vh] place-items-center text-base text-[#f7fbff]">Loading board...</div>
        ) : board ? (
          <>
            <BoardCanvas
              board={board}
              visibleCardIds={visibleCardIds}
              isFiltering={hasActiveFilters(filters)}
              onCreateList={handleCreateList}
              onCreateCard={handleCreateCard}
              onOpenCard={setSelectedCardId}
              onRenameList={handleRenameList}
              onDeleteList={handleDeleteList}
              onUpdateBoardStyle={handleUpdateBoardStyle}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
              filterBar={
                <SearchFilterBar
                  filters={filters}
                  labels={labels}
                  members={board.members}
                  onChange={(patch) => setFilters((prev) => ({ ...prev, ...patch }))}
                  onClear={() => setFilters(EMPTY_FILTERS)}
                />
              }
            />

            <CardDetailModal
              open={Boolean(activeCard)}
              card={activeCard}
              boardMembers={board.members}
              boardLabels={labels}
              onClose={() => setSelectedCardId(null)}
              onSave={handleSaveCard}
              onDelete={handleDeleteCard}
              onToggleAssignee={handleToggleAssignee}
              onToggleLabel={handleToggleLabel}
              onCreateChecklist={handleCreateChecklist}
              onAddChecklistItem={handleAddChecklistItem}
              onToggleChecklistItem={handleToggleChecklistItem}
              onDeleteChecklistItem={handleDeleteChecklistItem}
              onAddComment={handleAddComment}
              onDeleteComment={handleDeleteComment}
            />
          </>
        ) : (
          <div className="grid min-h-[80vh] place-items-center text-base text-[#f7fbff]">Create a board to get started.</div>
        )}

        <ToastStack items={toasts} onDismiss={(id) => setToasts((prev) => prev.filter((item) => item.id !== id))} />
      </main>
    </div>
  );
}
