"use client";

import { ReactNode, useEffect } from "react";
import { X } from "lucide-react";

interface ModalProps {
  title: string;
  open: boolean;
  onClose: () => void;
  children: ReactNode;
}

export function Modal({ title, open, onClose, children }: ModalProps) {
  useEffect(() => {
    if (!open) return;

    const onEsc = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    window.addEventListener("keydown", onEsc);
    return () => window.removeEventListener("keydown", onEsc);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="animate-backdrop fixed inset-0 z-[1000] flex items-center justify-center p-4 sm:p-6"
      style={{ background: "rgba(5, 10, 24, 0.75)", backdropFilter: "blur(6px)" }}
      onClick={onClose}
      role="presentation"
    >
      <div
        className="animate-fade-drop-in hide-scrollbar relative z-[1001] max-h-[92vh] w-[min(860px,96vw)] overflow-y-auto"
        style={{
          background: "linear-gradient(160deg, rgba(18,30,62,0.98) 0%, rgba(12,20,45,0.99) 100%)",
          border: "1px solid rgba(255,255,255,0.1)",
          borderRadius: "20px",
          boxShadow:
            "0 40px 90px -30px rgba(4, 9, 28, 0.9), inset 0 1px 0 rgba(255,255,255,0.07)",
        }}
        onClick={(event) => event.stopPropagation()}
      >
        {/* Header */}
        <header
          className="sticky top-0 z-10 flex items-center justify-between px-5 py-4"
          style={{
            background: "rgba(12, 22, 50, 0.95)",
            borderBottom: "1px solid rgba(255,255,255,0.07)",
            backdropFilter: "blur(12px)",
          }}
        >
          <div className="flex items-center gap-2.5">
            <div
              className="h-4 w-1 rounded-full"
              style={{ background: "linear-gradient(to bottom, #4f9cf9, #7b5cf6)" }}
            />
            <h3 className="m-0 text-base font-semibold text-[#e4eeff]">{title}</h3>
          </div>
          <button
            className="grid h-8 w-8 place-items-center rounded-full transition duration-200"
            style={{
              border: "1px solid rgba(255,255,255,0.12)",
              background: "rgba(255,255,255,0.05)",
              color: "rgba(180, 200, 240, 0.85)",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.12)";
              (e.currentTarget as HTMLButtonElement).style.color = "#fff";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.05)";
              (e.currentTarget as HTMLButtonElement).style.color = "rgba(180, 200, 240, 0.85)";
            }}
            onClick={onClose}
            type="button"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        {/* Body */}
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}
