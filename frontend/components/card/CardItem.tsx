"use client";

import { CSS } from "@dnd-kit/utilities";
import { useSortable } from "@dnd-kit/sortable";
import clsx from "clsx";
import { CalendarClock, CheckSquare } from "lucide-react";
import { Card } from "@/lib/types";

interface CardItemProps {
  card: Card;
  onOpen: (cardId: string) => void;
  isOverlay?: boolean;
}

/* Deterministic gradient avatar bg seeded from name */
function memberGradient(name: string) {
  const gradients = [
    "linear-gradient(135deg, #4f9cf9 0%, #7b5cf6 100%)",
    "linear-gradient(135deg, #f59e0b 0%, #ef4444 100%)",
    "linear-gradient(135deg, #22c55e 0%, #14b8a6 100%)",
    "linear-gradient(135deg, #ec4899 0%, #a78bfa 100%)",
    "linear-gradient(135deg, #f97316 0%, #f59e0b 100%)",
    "linear-gradient(135deg, #06b6d4 0%, #4f9cf9 100%)",
  ];
  const idx = (name.charCodeAt(0) + (name.charCodeAt(1) || 0)) % gradients.length;
  return gradients[idx];
}

// Visual component without hooks for DragOverlay
export function CardItemVisual({
  card,
  onOpen,
  isOverlay,
  setNodeRef,
  attributes,
  listeners,
  style,
  isDragging,
}: CardItemProps & {
  setNodeRef?: (node: HTMLElement | null) => void;
  attributes?: any;
  listeners?: any;
  style?: React.CSSProperties;
  isDragging?: boolean;
}) {

  const due = card.dueDate ? new Date(card.dueDate) : null;
  const now = new Date();
  const overdue = Boolean(due && !card.dueComplete && due.getTime() < now.getTime());
  const dueComplete = Boolean(due && card.dueComplete);

  /* Checklist progress */
  const totalChecklistItems = card.checklists?.reduce((sum, cl) => sum + cl.items.length, 0) ?? 0;
  const completedChecklistItems =
    card.checklists?.reduce((sum, cl) => sum + cl.items.filter((i) => i.completed).length, 0) ?? 0;

  /* Label swatches — show real ones or placeholders */
  const labelSwatches =
    card.labels.length > 0
      ? card.labels.slice(0, 4).map((label) => ({ id: label.id, color: label.color, title: label.title }))
      : null;

  return (
    <article
      ref={setNodeRef}
      className={clsx(
        "group relative flex flex-col gap-2.5 rounded-xl bg-white p-3",
        isOverlay ? "cursor-grabbing opacity-80 shadow-[0_20px_48px_-18px_rgba(15,30,75,0.6)]" : "cursor-grab shadow-[0_2px_8px_-4px_rgba(14,30,70,0.2)] hover:shadow-[0_8px_24px_-10px_rgba(14,30,70,0.3)]",
        "transition-[box-shadow,opacity] duration-150",
        isDragging && !isOverlay ? "opacity-0" : "opacity-100",
      )}
      style={{
        ...style,
        border: "1px solid rgba(190,210,245,0.8)",
        boxShadow: "0 2px 8px -4px rgba(14,30,70,0.2)",
      }}
      onClick={() => onOpen(card.id)}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onOpen(card.id);
        }
      }}
      // spread attributes (role, tabIndex, aria-*) and listeners (onPointerDown etc) last
      // so dnd-kit's event handlers are not overridden
      {...attributes}
      {...listeners}
    >
      {/* Label pills */}
      {labelSwatches ? (
        <div className="flex flex-wrap gap-1.5">
          {labelSwatches.map((label) => (
            <span
              key={label.id}
              className="h-2 w-10 rounded-full opacity-90 transition-opacity group-hover:opacity-100"
              style={{ backgroundColor: label.color }}
              title={label.title}
            />
          ))}
        </div>
      ) : null}

      {/* Title */}
      <h4 className="m-0 text-[0.9rem] font-semibold leading-snug text-[#1a2f5e]" style={{ wordBreak: "break-word" }}>
        {card.title}
      </h4>

      {/* Footer row */}
      <footer className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-1.5">
          {/* Due date badge */}
          {card.dueDate ? (
            <span
              className="flex items-center gap-1 rounded-full px-2 py-0.5 text-[0.72rem] font-semibold"
              style={
                dueComplete
                  ? { background: "rgba(34,197,94,0.12)", color: "#16a34a", border: "1px solid rgba(34,197,94,0.25)" }
                  : overdue
                  ? { background: "rgba(244,63,94,0.1)", color: "#dc2626", border: "1px solid rgba(244,63,94,0.25)" }
                  : { background: "rgba(79,156,249,0.1)", color: "#2563eb", border: "1px solid rgba(79,156,249,0.22)" }
              }
            >
              <CalendarClock className="h-3 w-3" />
              {new Date(card.dueDate).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
            </span>
          ) : null}

          {/* Checklist progress badge */}
          {totalChecklistItems > 0 ? (
            <span
              className="flex items-center gap-1 rounded-full px-2 py-0.5 text-[0.72rem] font-semibold"
              style={
                completedChecklistItems === totalChecklistItems
                  ? { background: "rgba(34,197,94,0.12)", color: "#16a34a", border: "1px solid rgba(34,197,94,0.25)" }
                  : { background: "rgba(100,130,200,0.1)", color: "#4a6290", border: "1px solid rgba(100,130,200,0.2)" }
              }
            >
              <CheckSquare className="h-3 w-3" />
              {completedChecklistItems}/{totalChecklistItems}
            </span>
          ) : null}
        </div>

        {/* Assignee avatars */}
        {card.assignees.length > 0 ? (
          <div className="flex items-center -space-x-1.5">
            {card.assignees.slice(0, 4).map((member) => {
              const initials = member.name
                .split(" ")
                .map((p) => p[0])
                .join("")
                .slice(0, 2)
                .toUpperCase();
              return (
                <span
                  key={member.id}
                  className="inline-grid h-6 w-6 place-items-center rounded-full text-[0.6rem] font-bold text-white ring-2 ring-white"
                  style={{ background: memberGradient(member.name) }}
                  title={member.name}
                >
                  {initials}
                </span>
              );
            })}
            {card.assignees.length > 4 ? (
              <span
                className="inline-grid h-6 w-6 place-items-center rounded-full text-[0.6rem] font-bold ring-2 ring-white"
                style={{ background: "#e2eaf8", color: "#4a6290" }}
              >
                +{card.assignees.length - 4}
              </span>
            ) : null}
          </div>
        ) : null}
      </footer>

      {/* Archived ribbon */}
      {card.archived ? (
        <div
          className="absolute right-0 top-0 overflow-hidden rounded-tr-xl"
          style={{ width: 0, height: 0, borderTop: "28px solid rgba(245,158,11,0.85)", borderLeft: "28px solid transparent" }}
        >
          <span className="sr-only">Archived</span>
        </div>
      ) : null}
    </article>
  );
}

// Wrapper component with hooks for normal rendering
export function CardItem(props: CardItemProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: props.card.id,
    data: {
      type: "card",
      listId: props.card.listId,
    },
  });

  const style = {
    transform: CSS.Translate.toString(transform),
    transition: isDragging ? "none" : transition,
  };

  return (
    <CardItemVisual
      {...props}
      setNodeRef={setNodeRef}
      attributes={attributes}
      listeners={listeners}
      style={style}
      isDragging={isDragging}
    />
  );
}


