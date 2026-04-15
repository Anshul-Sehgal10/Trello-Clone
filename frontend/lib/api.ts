import {
  BoardDetail,
  BoardSummary,
  Card,
  CardMutation,
  Id,
  Label,
  SearchFilters,
} from "@/lib/types";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000/api";

function normalizeCard(card: Card): Card {
  return {
    ...card,
    dueComplete: Boolean(card.dueComplete),
    archived: Boolean(card.archived),
    assignees: card.assignees ?? [],
    labels: card.labels ?? [],
    checklists: (card.checklists ?? []).map((checklist) => ({
      ...checklist,
      items: (checklist.items ?? []).map((item) => ({
        ...item,
        completed: Boolean(item.completed),
      })),
    })),
    comments: card.comments ?? [],
  };
}

function normalizeBoard(board: BoardDetail): BoardDetail {
  return {
    ...board,
    lists: (board.lists ?? [])
      .sort((a, b) => a.position - b.position)
      .map((list) => ({
        ...list,
        cards: (list.cards ?? [])
          .map((card) => normalizeCard(card))
          .sort((a, b) => a.position - b.position),
      })),
    members: board.members ?? [],
  };
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options?.headers ?? {}),
    },
    cache: "no-store",
  });

  if (!response.ok) {
    const fallback = `Request failed with ${response.status}`;
    const payload = await response.json().catch(() => null);
    const message = payload?.error ?? fallback;
    throw new Error(message);
  }

  return (await response.json()) as T;
}

export const api = {
  getBoards: () => request<BoardSummary[]>("/boards"),

  getCard: async (cardId: Id) => {
    const card = await request<Card>(`/cards/${cardId}`);
    return normalizeCard(card);
  },

  getBoard: async (boardId: Id) => {
    const board = await request<BoardDetail>(`/boards/${boardId}`);
    return normalizeBoard(board);
  },

  createBoard: (input: { title: string; description?: string }) =>
    request<BoardSummary>("/boards", {
      method: "POST",
      body: JSON.stringify(input),
    }),

  updateBoard: (
    boardId: Id,
    input: {
      title: string;
      description: string | null;
      color: string | null;
      background: string | null;
      position?: number;
    },
  ) =>
    request<BoardSummary>(`/boards/${boardId}`, {
      method: "PUT",
      body: JSON.stringify(input),
    }),

  deleteBoard: (boardId: Id) =>
    request<{ message: string }>(`/boards/${boardId}`, {
      method: "DELETE",
    }),

  createList: (input: { boardId: Id; title: string }) =>
    request<{ id: Id; boardId: Id; title: string; position: number }>("/lists", {
      method: "POST",
      body: JSON.stringify(input),
    }),

  updateList: (listId: Id, input: { title: string; position: number }) =>
    request<{ id: Id; title: string; position: number }>(`/lists/${listId}`, {
      method: "PUT",
      body: JSON.stringify(input),
    }),

  deleteList: (listId: Id) =>
    request<{ message: string }>(`/lists/${listId}`, {
      method: "DELETE",
    }),

  createCard: (input: { listId: Id; title: string; description?: string }) =>
    request<Card>("/cards", {
      method: "POST",
      body: JSON.stringify(input),
    }).then((card) => normalizeCard(card)),

  updateCard: (cardId: Id, input: CardMutation) =>
    request<Card>(`/cards/${cardId}`, {
      method: "PUT",
      body: JSON.stringify(input),
    }).then((card) => normalizeCard(card)),

  deleteCard: (cardId: Id) =>
    request<{ message: string }>(`/cards/${cardId}`, {
      method: "DELETE",
    }),

  createChecklist: (input: { cardId: Id; title: string }) =>
    request(`/checklists`, {
      method: "POST",
      body: JSON.stringify(input),
    }),

  updateChecklist: (checklistId: Id, input: { title: string }) =>
    request(`/checklists/${checklistId}`, {
      method: "PUT",
      body: JSON.stringify(input),
    }),

  deleteChecklist: (checklistId: Id) =>
    request(`/checklists/${checklistId}`, {
      method: "DELETE",
    }),

  createChecklistItem: (input: { checklistId: Id; title: string }) =>
    request(`/checklist-items`, {
      method: "POST",
      body: JSON.stringify(input),
    }),

  updateChecklistItem: (
    itemId: Id,
    input: { title: string; completed: boolean; position: number },
  ) =>
    request(`/checklist-items/${itemId}`, {
      method: "PUT",
      body: JSON.stringify(input),
    }),

  deleteChecklistItem: (itemId: Id) =>
    request(`/checklist-items/${itemId}`, {
      method: "DELETE",
    }),

  createComment: (input: { cardId: Id; memberId: Id; content: string }) =>
    request(`/comments`, {
      method: "POST",
      body: JSON.stringify(input),
    }),

  deleteComment: (commentId: Id) =>
    request(`/comments/${commentId}`, {
      method: "DELETE",
    }),

  getBoardLabels: (boardId: Id) => request<Label[]>(`/boards/${boardId}/labels`),

  createLabel: (input: { boardId: Id; title: string; color: string }) =>
    request<Label>("/labels", {
      method: "POST",
      body: JSON.stringify(input),
    }),

  attachLabelToCard: (cardId: Id, labelId: Id) =>
    request<Label[]>(`/cards/${cardId}/labels`, {
      method: "POST",
      body: JSON.stringify({ labelId }),
    }),

  detachLabelFromCard: (cardId: Id, labelId: Id) =>
    request<{ message: string }>(`/cards/${cardId}/labels/${labelId}`, {
      method: "DELETE",
    }),

  assignMemberToCard: (cardId: Id, memberId: Id) =>
    request(`/cards/${cardId}/assignees`, {
      method: "POST",
      body: JSON.stringify({ memberId }),
    }),

  removeMemberFromCard: (cardId: Id, memberId: Id) =>
    request(`/cards/${cardId}/assignees/${memberId}`, {
      method: "DELETE",
    }),

  searchBoardCards: (boardId: Id, filters: SearchFilters) => {
    const searchParams = new URLSearchParams();
    if (filters.query.trim()) searchParams.set("query", filters.query.trim());
    if (filters.labelId) searchParams.set("labelId", filters.labelId);
    if (filters.memberId) searchParams.set("memberId", filters.memberId);
    if (filters.dueDateFrom) searchParams.set("dueDateFrom", filters.dueDateFrom);
    if (filters.dueDateTo) searchParams.set("dueDateTo", filters.dueDateTo);

    return request<Card[]>(`/boards/${boardId}/search?${searchParams.toString()}`).then((cards) =>
      cards.map((card) => normalizeCard(card)),
    );
  },
};
