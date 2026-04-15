import { arrayMove } from "@dnd-kit/sortable";
import { BoardDetail, BoardList, Card, Id } from "@/lib/types";

export function reorderLists(board: BoardDetail, activeId: Id, overId: Id): BoardDetail {
  const oldIndex = board.lists.findIndex((list) => list.id === activeId);
  const newIndex = board.lists.findIndex((list) => list.id === overId);

  if (oldIndex === -1 || newIndex === -1 || oldIndex === newIndex) {
    return board;
  }

  const moved = arrayMove(board.lists, oldIndex, newIndex).map((list, index) => ({
    ...list,
    position: index,
  }));

  return {
    ...board,
    lists: moved,
  };
}

function locateCard(lists: BoardList[], cardId: Id) {
  for (let listIndex = 0; listIndex < lists.length; listIndex += 1) {
    const cardIndex = lists[listIndex].cards.findIndex((card) => card.id === cardId);
    if (cardIndex !== -1) {
      return { listIndex, cardIndex };
    }
  }
  return null;
}

export function moveCard(
  board: BoardDetail,
  activeCardId: Id,
  overId: Id,
  overType: "card" | "list",
): {
  nextBoard: BoardDetail;
  movedCard: Card;
  sourceList: BoardList;
  targetList: BoardList;
} | null {
  const sourceLoc = locateCard(board.lists, activeCardId);
  if (!sourceLoc) return null;

  const sourceListOriginal = board.lists[sourceLoc.listIndex];
  const sourceCards = [...sourceListOriginal.cards];
  const [movedCard] = sourceCards.splice(sourceLoc.cardIndex, 1);
  if (!movedCard) return null;

  let targetListIndex = sourceLoc.listIndex;
  let targetCardIndex = sourceLoc.cardIndex;

  if (overType === "list") {
    targetListIndex = board.lists.findIndex((list) => list.id === overId);
    if (targetListIndex === -1) return null;
    targetCardIndex = board.lists[targetListIndex].cards.length;
  } else {
    const overLoc = locateCard(board.lists, overId);
    if (!overLoc) return null;
    targetListIndex = overLoc.listIndex;
    targetCardIndex = overLoc.cardIndex;
  }

  const lists = board.lists.map((list) => ({ ...list, cards: [...list.cards] }));

  lists[sourceLoc.listIndex].cards = sourceCards;

  const targetCards = lists[targetListIndex].cards;
  const adjustedIndex =
    targetListIndex === sourceLoc.listIndex && sourceLoc.cardIndex < targetCardIndex
      ? targetCardIndex - 1
      : targetCardIndex;

  targetCards.splice(adjustedIndex, 0, {
    ...movedCard,
    listId: lists[targetListIndex].id,
  });

  const normalizedLists = lists.map((list) => ({
    ...list,
    cards: list.cards.map((card, index) => ({
      ...card,
      position: index,
      listId: list.id,
    })),
  }));

  const refreshedSource = normalizedLists[sourceLoc.listIndex];
  const refreshedTarget = normalizedLists[targetListIndex];
  const movedAfter = refreshedTarget.cards.find((card) => card.id === movedCard.id);

  if (!movedAfter) return null;

  return {
    nextBoard: {
      ...board,
      lists: normalizedLists,
    },
    movedCard: movedAfter,
    sourceList: refreshedSource,
    targetList: refreshedTarget,
  };
}
