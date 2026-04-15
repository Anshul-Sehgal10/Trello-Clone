"use client";

import { CheckCircle2, Info, X, XCircle } from "lucide-react";

export interface ToastItem {
  id: string;
  tone: "success" | "error" | "info";
  message: string;
}

interface ToastStackProps {
  items: ToastItem[];
  onDismiss: (id: string) => void;
}

const toneConfig: Record<
  ToastItem["tone"],
  { border: string; bg: string; text: string; iconColor: string; Icon: typeof CheckCircle2 }
> = {
  success: {
    border: "rgba(34, 197, 94, 0.35)",
    bg: "linear-gradient(135deg, rgba(10, 35, 20, 0.97) 0%, rgba(8, 28, 18, 0.98) 100%)",
    text: "#86efac",
    iconColor: "#4ade80",
    Icon: CheckCircle2,
  },
  error: {
    border: "rgba(244, 63, 94, 0.35)",
    bg: "linear-gradient(135deg, rgba(40, 10, 18, 0.97) 0%, rgba(30, 8, 15, 0.98) 100%)",
    text: "#fca5a5",
    iconColor: "#f87171",
    Icon: XCircle,
  },
  info: {
    border: "rgba(96, 165, 250, 0.35)",
    bg: "linear-gradient(135deg, rgba(8, 22, 52, 0.97) 0%, rgba(6, 16, 40, 0.98) 100%)",
    text: "#93c5fd",
    iconColor: "#60a5fa",
    Icon: Info,
  },
};

export function ToastStack({ items, onDismiss }: ToastStackProps) {
  return (
    <div
      className="fixed bottom-4 right-4 z-[9000] flex flex-col gap-2.5 max-[640px]:left-3 max-[640px]:right-3"
      aria-live="polite"
      aria-atomic="true"
    >
      {items.map((toast) => {
        const cfg = toneConfig[toast.tone];
        const { Icon } = cfg;
        return (
          <div
            key={toast.id}
            className="animate-slide-up flex min-w-[260px] max-w-[380px] items-start gap-3 rounded-[14px] px-3.5 py-3 max-[640px]:min-w-0 max-[640px]:max-w-none"
            style={{
              background: cfg.bg,
              border: `1px solid ${cfg.border}`,
              boxShadow: `0 16px 40px -16px rgba(0,0,0,0.7), inset 0 1px 0 rgba(255,255,255,0.05)`,
              backdropFilter: "blur(16px)",
            }}
          >
            <Icon
              className="mt-0.5 h-4 w-4 shrink-0"
              style={{ color: cfg.iconColor }}
            />
            <p className="m-0 flex-1 text-[0.875rem] font-medium leading-snug" style={{ color: cfg.text }}>
              {toast.message}
            </p>
            <button
              className="mt-0.5 shrink-0 rounded-md p-0.5 transition duration-150"
              style={{ color: `${cfg.text}88` }}
              onMouseEnter={(e) => ((e.currentTarget as HTMLButtonElement).style.color = cfg.text)}
              onMouseLeave={(e) =>
                ((e.currentTarget as HTMLButtonElement).style.color = `${cfg.text}88`)
              }
              type="button"
              onClick={() => onDismiss(toast.id)}
              aria-label="Dismiss notification"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
