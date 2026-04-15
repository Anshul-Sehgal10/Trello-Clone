export type Id = string;

export interface Member {
  id: Id;
  name: string;
  email: string;
  avatar: string | null;
  createdAt?: string;
}

export interface Label {
  id: Id;
  boardId: Id;
  title: string;
  color: string;
  createdAt?: string;
}

export interface ChecklistItem {
  id: Id;
  checklistId: Id;
  title: string;
  completed: boolean;
  position: number;
  createdAt?: string;
}

export interface Checklist {
  id: Id;
  cardId: Id;
  title: string;
  position: number;
  items: ChecklistItem[];
  createdAt?: string;
}

export interface CardComment {
  id: Id;
  cardId: Id;
  memberId: Id;
  content: string;
  name?: string;
  avatar?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface Card {
  id: Id;
  listId: Id;
  title: string;
  description: string;
  position: number;
  dueDate: string | null;
  dueComplete: boolean;
  archived: boolean;
  cover: string | null;
  createdAt?: string;
  updatedAt?: string;
  assignees: Member[];
  labels: Label[];
  checklists: Checklist[];
  comments?: CardComment[];
}

export interface BoardList {
  id: Id;
  boardId: Id;
  title: string;
  position: number;
  createdAt?: string;
  updatedAt?: string;
  cards: Card[];
}

export interface BoardSummary {
  id: Id;
  title: string;
  description: string | null;
  position: number;
  color: string | null;
  background: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface BoardDetail extends BoardSummary {
  lists: BoardList[];
  members: Member[];
}

export interface SearchFilters {
  query: string;
  labelId: string;
  memberId: string;
  dueDateFrom: string;
  dueDateTo: string;
}

export type CardMutation = Omit<Card, "assignees" | "labels" | "checklists" | "comments">;
