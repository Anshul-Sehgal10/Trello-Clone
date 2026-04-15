"use client";

import { FormEvent, useEffect, useState } from "react";
import { CheckSquare, MessageSquare, Tag, Users } from "lucide-react";
import { Modal } from "@/components/common/Modal";
import { Card, Label, Member } from "@/lib/types";

interface CardDetailModalProps {
  card: Card | null;
  open: boolean;
  boardMembers: Member[];
  boardLabels: Label[];
  onClose: () => void;
  onSave: (input: { title: string; description: string; dueDate: string | null; archived: boolean }) => Promise<void>;
  onDelete: () => Promise<void>;
  onToggleAssignee: (memberId: string, assigned: boolean) => Promise<void>;
  onToggleLabel: (labelId: string, attached: boolean) => Promise<void>;
  onCreateChecklist: (title: string) => Promise<void>;
  onAddChecklistItem: (checklistId: string, title: string) => Promise<void>;
  onToggleChecklistItem: (
    checklistId: string,
    itemId: string,
    current: { title: string; completed: boolean; position: number },
  ) => Promise<void>;
  onDeleteChecklistItem: (itemId: string) => Promise<void>;
  onAddComment: (content: string) => Promise<void>;
  onDeleteComment: (commentId: string) => Promise<void>;
}

/* Member avatar gradient seeded by name */
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

function SectionHeader({ icon: Icon, label }: { icon: typeof CheckSquare; label: string }) {
  return (
    <div className="mb-3 flex items-center gap-2">
      <div
        className="h-5 w-[3px] rounded-full"
        style={{ background: "linear-gradient(to bottom, #4f9cf9, #7b5cf6)" }}
      />
      <Icon className="h-4 w-4 text-[#6b8abf]" />
      <h4 className="m-0 text-xs font-semibold uppercase tracking-[0.1em] text-[#6b8abf]">{label}</h4>
    </div>
  );
}

export function CardDetailModal({
  card,
  open,
  boardMembers,
  boardLabels,
  onClose,
  onSave,
  onDelete,
  onToggleAssignee,
  onToggleLabel,
  onCreateChecklist,
  onAddChecklistItem,
  onToggleChecklistItem,
  onDeleteChecklistItem,
  onAddComment,
  onDeleteComment,
}: CardDetailModalProps) {
  const [saving, setSaving] = useState(false);

  const [title, setTitle] = useState(card?.title ?? "");
  const [description, setDescription] = useState(card?.description ?? "");
  const [dueDate, setDueDate] = useState(card?.dueDate ? card.dueDate.slice(0, 10) : "");
  const [archived, setArchived] = useState(card?.archived ?? false);
  const [newChecklist, setNewChecklist] = useState("");
  const [newComment, setNewComment] = useState("");
  const [newItemByChecklist, setNewItemByChecklist] = useState<Record<string, string>>({});

  useEffect(() => {
    setTitle(card?.title ?? "");
    setDescription(card?.description ?? "");
    setDueDate(card?.dueDate ? card.dueDate.slice(0, 10) : "");
    setArchived(card?.archived ?? false);
  }, [card?.id, card?.title, card?.description, card?.dueDate, card?.archived]);

  if (!card) return null;

  const assignedIds = new Set(card.assignees.map((member) => member.id));
  const labelIds = new Set(card.labels.map((label) => label.id));

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    try {
      await onSave({
        title: title.trim(),
        description,
        dueDate: dueDate ? new Date(dueDate).toISOString() : null,
        archived,
      });
    } finally {
      setSaving(false);
    }
  };

  /* Shared dark-glass input style */
  const inputStyle = {
    background: "rgba(255,255,255,0.06)",
    border: "1px solid rgba(255,255,255,0.12)",
    color: "#d4e4ff",
  };
  const inputClass =
    "w-full rounded-xl px-3.5 py-2.5 text-sm outline-none transition duration-200 placeholder:text-[#3f5b8a] disabled:cursor-not-allowed disabled:opacity-60";

  const sectionStyle = {
    background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: "14px",
    padding: "14px",
  };

  const subtleButtonStyle = {
    background: "rgba(255,255,255,0.07)",
    border: "1px solid rgba(255,255,255,0.12)",
    color: "#8aaee0",
    borderRadius: "10px",
    padding: "6px 14px",
    fontSize: "0.875rem",
    transition: "all 0.15s",
    cursor: "pointer",
    whiteSpace: "nowrap" as const,
  };

  return (
    <Modal title="Card details" open={open} onClose={onClose}>
      <form className="grid min-w-0 gap-4" onSubmit={submit}>
        {/* Title */}
        <div className="grid gap-1.5">
          <label className="text-xs font-semibold uppercase tracking-wider text-[#6b8abf]">Title</label>
          <input
            className={inputClass}
            style={inputStyle}
            onFocus={(e) => (e.currentTarget.style.borderColor = "rgba(79,156,249,0.5)")}
            onBlur={(e) => (e.currentTarget.style.borderColor = "rgba(255,255,255,0.12)")}
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            required
          />
        </div>

        {/* Description */}
        <div className="grid gap-1.5">
          <label className="text-xs font-semibold uppercase tracking-wider text-[#6b8abf]">Description</label>
          <textarea
            className={inputClass}
            style={{ ...inputStyle, resize: "none" }}
            onFocus={(e) => (e.currentTarget.style.borderColor = "rgba(79,156,249,0.5)")}
            onBlur={(e) => (e.currentTarget.style.borderColor = "rgba(255,255,255,0.12)")}
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            rows={4}
            placeholder="Add a description…"
          />
        </div>

        {/* Due date + Archive row */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="grid gap-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-[#6b8abf]">Due date</label>
            <input
              className={inputClass}
              style={inputStyle}
              onFocus={(e) => (e.currentTarget.style.borderColor = "rgba(79,156,249,0.5)")}
              onBlur={(e) => (e.currentTarget.style.borderColor = "rgba(255,255,255,0.12)")}
              type="date"
              value={dueDate}
              onChange={(event) => setDueDate(event.target.value)}
            />
          </div>

          <label
            className="flex cursor-pointer items-center gap-3 rounded-xl px-4 py-3 text-sm text-[#a8c4ef] transition hover:text-[#c8d9f5]"
            style={sectionStyle}
          >
            <input
              className="custom-checkbox"
              type="checkbox"
              checked={archived}
              onChange={(event) => setArchived(event.target.checked)}
            />
            <span className="font-medium">Archive this card</span>
          </label>
        </div>

        {/* Members + Labels */}
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          <div style={sectionStyle}>
            <SectionHeader icon={Users} label="Members" />
            <div className="grid gap-2">
              {boardMembers.map((member) => {
                const checked = assignedIds.has(member.id);
                const initials = member.name
                  .split(" ")
                  .map((p) => p[0])
                  .join("")
                  .slice(0, 2)
                  .toUpperCase();
                return (
                  <label
                    key={member.id}
                    className="flex cursor-pointer items-center gap-3 rounded-lg px-2 py-1.5 text-sm text-[#a8c4ef] transition duration-150 hover:bg-white/5"
                  >
                    <input
                      className="custom-checkbox"
                      type="checkbox"
                      checked={checked}
                      onChange={(event) => onToggleAssignee(member.id, event.target.checked)}
                    />
                    <span
                      className="inline-grid h-6 w-6 shrink-0 place-items-center rounded-full text-[0.6rem] font-bold text-white"
                      style={{ background: memberGradient(member.name) }}
                    >
                      {initials}
                    </span>
                    <span className="font-medium text-[#c8d9f5]">{member.name}</span>
                  </label>
                );
              })}
              {boardMembers.length === 0 ? (
                <p className="m-0 text-xs text-[#4a6290]">No members on this board</p>
              ) : null}
            </div>
          </div>

          <div style={sectionStyle}>
            <SectionHeader icon={Tag} label="Labels" />
            <div className="grid gap-2">
              {boardLabels.map((label) => {
                const checked = labelIds.has(label.id);
                return (
                  <label
                    key={label.id}
                    className="flex cursor-pointer items-center gap-3 rounded-lg px-2 py-1.5 text-sm transition duration-150 hover:bg-white/5"
                  >
                    <input
                      className="custom-checkbox"
                      type="checkbox"
                      checked={checked}
                      onChange={(event) => onToggleLabel(label.id, event.target.checked)}
                    />
                    <span
                      className="h-4 w-4 shrink-0 rounded"
                      style={{ backgroundColor: label.color, boxShadow: `0 0 0 1px ${label.color}55` }}
                    />
                    <span className="font-medium text-[#c8d9f5]">{label.title || "Untitled"}</span>
                  </label>
                );
              })}
              {boardLabels.length === 0 ? (
                <p className="m-0 text-xs text-[#4a6290]">No labels on this board</p>
              ) : null}
            </div>
          </div>
        </div>

        {/* Checklists */}
        <div style={sectionStyle}>
          <SectionHeader icon={CheckSquare} label="Checklist" />

          {/* Add checklist */}
          <div className="mb-3 flex gap-2">
            <input
              className={`flex-1 ${inputClass}`}
              style={inputStyle}
              onFocus={(e) => (e.currentTarget.style.borderColor = "rgba(79,156,249,0.5)")}
              onBlur={(e) => (e.currentTarget.style.borderColor = "rgba(255,255,255,0.12)")}
              placeholder="New checklist title"
              value={newChecklist}
              onChange={(event) => setNewChecklist(event.target.value)}
            />
            <button
              style={subtleButtonStyle}
              type="button"
              onClick={() => {
                const t = newChecklist.trim();
                if (!t) return;
                void onCreateChecklist(t).then(() => setNewChecklist(""));
              }}
              disabled={!newChecklist.trim()}
            >
              Add
            </button>
          </div>

          {card.checklists.length > 0 ? (
            <div className="grid gap-3">
              {card.checklists.map((checklist) => {
                const total = checklist.items.length;
                const done = checklist.items.filter((i) => i.completed).length;
                const pct = total === 0 ? 0 : Math.round((done / total) * 100);

                return (
                  <div
                    key={checklist.id}
                    className="rounded-xl p-3"
                    style={{
                      background: "rgba(255,255,255,0.04)",
                      border: "1px solid rgba(255,255,255,0.07)",
                    }}
                  >
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <strong className="text-sm font-semibold text-[#c8d9f5]">{checklist.title}</strong>
                      <small
                        className="rounded-full px-2 py-0.5 text-[0.72rem] font-semibold"
                        style={
                          pct === 100
                            ? { background: "rgba(34,197,94,0.12)", color: "#4ade80" }
                            : { background: "rgba(79,156,249,0.1)", color: "#93c5fd" }
                        }
                      >
                        {done}/{total}
                      </small>
                    </div>

                    {/* Progress bar */}
                    <div
                      className="mt-2 h-2 overflow-hidden rounded-full"
                      style={{ background: "rgba(255,255,255,0.08)" }}
                      role="progressbar"
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-valuenow={pct}
                      aria-label={`${checklist.title} completion`}
                    >
                      <span
                        className="block h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${pct}%`,
                          background: pct === 100
                            ? "linear-gradient(90deg, #22c55e, #4ade80)"
                            : "linear-gradient(90deg, #4f9cf9, #a78bfa)",
                        }}
                      />
                    </div>

                    {/* Items */}
                    <div className="my-2.5 grid gap-1.5">
                      {checklist.items.map((item) => (
                        <div key={item.id} className="flex flex-wrap items-start justify-between gap-2">
                          <label className="flex min-w-0 flex-1 cursor-pointer items-start gap-2.5">
                            <input
                              className="custom-checkbox mt-0.5"
                              type="checkbox"
                              checked={item.completed}
                              onChange={() =>
                                void onToggleChecklistItem(checklist.id, item.id, {
                                  title: item.title,
                                  completed: item.completed,
                                  position: item.position,
                                })
                              }
                            />
                            <span
                              className="text-sm leading-relaxed text-[#a8c4ef]"
                              style={{
                                textDecoration: item.completed ? "line-through" : "none",
                                opacity: item.completed ? 0.6 : 1,
                                wordBreak: "break-word",
                              }}
                            >
                              {item.title}
                            </span>
                          </label>
                          <button
                            style={subtleButtonStyle}
                            type="button"
                            onClick={() => void onDeleteChecklistItem(item.id)}
                          >
                            Remove
                          </button>
                        </div>
                      ))}
                    </div>

                    {/* Add item */}
                    <div className="flex gap-2">
                      <input
                        className={`flex-1 ${inputClass}`}
                        style={{ ...inputStyle, paddingTop: "6px", paddingBottom: "6px" }}
                        onFocus={(e) => (e.currentTarget.style.borderColor = "rgba(79,156,249,0.5)")}
                        onBlur={(e) => (e.currentTarget.style.borderColor = "rgba(255,255,255,0.12)")}
                        placeholder="Add item…"
                        value={newItemByChecklist[checklist.id] ?? ""}
                        onChange={(event) =>
                          setNewItemByChecklist((prev) => ({
                            ...prev,
                            [checklist.id]: event.target.value,
                          }))
                        }
                      />
                      <button
                        style={subtleButtonStyle}
                        type="button"
                        onClick={() => {
                          const t = (newItemByChecklist[checklist.id] ?? "").trim();
                          if (!t) return;
                          void onAddChecklistItem(checklist.id, t).then(() =>
                            setNewItemByChecklist((prev) => ({ ...prev, [checklist.id]: "" })),
                          );
                        }}
                        disabled={!(newItemByChecklist[checklist.id] ?? "").trim()}
                      >
                        Add
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : null}
        </div>

        {/* Comments */}
        <div style={sectionStyle}>
          <SectionHeader icon={MessageSquare} label="Comments" />

          {/* Add comment */}
          <div className="mb-3 flex gap-2 max-[640px]:flex-col">
            <textarea
              className={`flex-1 ${inputClass}`}
              style={{ ...inputStyle, resize: "none" }}
              onFocus={(e) => (e.currentTarget.style.borderColor = "rgba(79,156,249,0.5)")}
              onBlur={(e) => (e.currentTarget.style.borderColor = "rgba(255,255,255,0.12)")}
              rows={3}
              placeholder="Write a comment…"
              value={newComment}
              onChange={(event) => setNewComment(event.target.value)}
            />
            <button
              style={subtleButtonStyle}
              type="button"
              onClick={() => {
                const c = newComment.trim();
                if (!c) return;
                void onAddComment(c).then(() => setNewComment(""));
              }}
              disabled={!newComment.trim()}
            >
              Post
            </button>
          </div>

          {/* Comment list */}
          {(card.comments ?? []).length > 0 ? (
            <div className="grid gap-2.5">
              {(card.comments ?? []).map((comment) => {
                const name = comment.name ?? "Member";
                const initials = name
                  .split(" ")
                  .map((p: string) => p[0])
                  .join("")
                  .slice(0, 2)
                  .toUpperCase();
                return (
                  <div
                    key={comment.id}
                    className="flex gap-3 rounded-xl p-3"
                    style={{
                      background: "rgba(255,255,255,0.04)",
                      border: "1px solid rgba(255,255,255,0.07)",
                    }}
                  >
                    <span
                      className="mt-0.5 inline-grid h-7 w-7 shrink-0 place-items-center rounded-full text-[0.62rem] font-bold text-white"
                      style={{ background: memberGradient(name) }}
                    >
                      {initials}
                    </span>
                    <div className="min-w-0 flex-1">
                      <strong className="text-xs font-semibold text-[#93c5fd]">{name}</strong>
                      <p
                        className="mt-1 text-sm leading-relaxed text-[#a8c4ef]"
                        style={{ wordBreak: "break-word" }}
                      >
                        {comment.content}
                      </p>
                    </div>
                    <button
                      style={{ ...subtleButtonStyle, padding: "4px 10px", fontSize: "0.78rem" }}
                      type="button"
                      onClick={() => void onDeleteComment(comment.id)}
                    >
                      Delete
                    </button>
                  </div>
                );
              })}
            </div>
          ) : null}
        </div>

        {/* Footer actions */}
        <div
          className="sticky bottom-0 -mx-5 -mb-5 flex flex-wrap items-center justify-between gap-2.5 px-5 py-4"
          style={{
            background: "rgba(10,18,46,0.97)",
            borderTop: "1px solid rgba(255,255,255,0.07)",
            backdropFilter: "blur(12px)",
            borderRadius: "0 0 20px 20px",
          }}
        >
          <button
            className="rounded-xl px-4 py-2.5 text-sm font-semibold transition duration-150"
            style={{
              background: "rgba(244,63,94,0.1)",
              border: "1px solid rgba(244,63,94,0.3)",
              color: "#f87171",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background = "rgba(244,63,94,0.18)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background = "rgba(244,63,94,0.1)";
            }}
            type="button"
            onClick={() => void onDelete()}
          >
            Delete card
          </button>
          <button
            className="rounded-xl px-4 py-2.5 text-sm font-semibold text-white transition duration-200 hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
            style={{ background: "linear-gradient(135deg, #4f9cf9 0%, #7b5cf6 100%)" }}
            type="submit"
            disabled={saving || !title.trim()}
          >
            {saving ? "Saving…" : "Save changes"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
