"use client";
import React from "react";
import type { SeatingHook } from "@/app/useSeating";
import { CloseIcon } from "./ui/Icons";

interface ToastsProps {
  s: SeatingHook;
}

export default function Toasts({ s }: ToastsProps) {
  const { toasts, dismissToast } = s;

  return (
    <div
      className="fixed bottom-4 right-4 z-40 flex flex-col gap-2 items-end no-print"
      role="status"
      aria-live="polite"
    >
      {toasts.map(t => (
        <div key={t.id} className={`toast toast-${t.kind} animate-slide-up`}>
          <span className="toast-dot" aria-hidden="true" />
          <span className="flex-1">{t.message}</span>
          <button
            type="button"
            onClick={() => dismissToast(t.id)}
            className="text-[var(--faint)] hover:text-[var(--text)] cursor-pointer shrink-0 mt-0.5"
            aria-label="閉じる"
          >
            <CloseIcon className="w-3 h-3" />
          </button>
        </div>
      ))}
    </div>
  );
}
