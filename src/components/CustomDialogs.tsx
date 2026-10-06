"use client";
import React, { useEffect, useRef } from "react";
import type { SeatingHook } from "@/app/useSeating";
import { AlertIcon, QuestionIcon } from "./ui/Icons";

interface CustomDialogsProps {
  s: SeatingHook;
}

interface DialogShellProps {
  icon: React.ReactNode;
  title: string;
  message: string;
  onClose: () => void;
  children: React.ReactNode;
}

function DialogShell({ icon, title, message, onClose, children }: DialogShellProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // 開いた時点で主ボタンに焦点を移し、Esc で閉じられるようにする。
    panelRef.current?.querySelector<HTMLButtonElement>("[data-autofocus]")?.focus();
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 no-print animate-fade-in"
      style={{ background: "rgba(17,24,42,0.32)", backdropFilter: "blur(2px)" }}
      onClick={e => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="dialog-title"
        className="w-full max-w-sm bg-white rounded-[var(--radius-panel)] p-5 animate-pop-in"
        style={{ boxShadow: "var(--shadow-lg)" }}
      >
        <div className="flex items-start gap-2.5 mb-2">
          {icon}
          <h3 id="dialog-title" className="text-[13.5px] font-semibold leading-5">
            {title}
          </h3>
        </div>
        <p className="text-[12.5px] leading-relaxed text-[var(--muted)] whitespace-pre-wrap mb-4">
          {message}
        </p>
        <div className="flex justify-end gap-2">{children}</div>
      </div>
    </div>
  );
}

export default function CustomDialogs({ s }: CustomDialogsProps) {
  const { alertMessage, closeAlert, confirmConfig, closeConfirm } = s;

  if (alertMessage) {
    return (
      <DialogShell
        icon={<AlertIcon className="w-[18px] h-[18px] text-[var(--pin)] shrink-0 mt-px" />}
        title="確認してください"
        message={alertMessage}
        onClose={closeAlert}
      >
        <button type="button" className="btn btn-primary" onClick={closeAlert} data-autofocus>
          閉じる
        </button>
      </DialogShell>
    );
  }

  if (confirmConfig) {
    const danger = confirmConfig.tone === "danger";
    const cancel = () => {
      confirmConfig.onCancel?.();
      closeConfirm();
    };
    return (
      <DialogShell
        icon={
          danger ? (
            <AlertIcon className="w-[18px] h-[18px] text-[var(--danger)] shrink-0 mt-px" />
          ) : (
            <QuestionIcon className="w-[18px] h-[18px] text-[var(--accent)] shrink-0 mt-px" />
          )
        }
        title={confirmConfig.title ?? "確認"}
        message={confirmConfig.message}
        onClose={cancel}
      >
        <button type="button" className="btn" onClick={cancel}>
          キャンセル
        </button>
        <button
          type="button"
          className={danger ? "btn btn-danger" : "btn btn-primary"}
          data-autofocus
          onClick={() => {
            confirmConfig.onConfirm();
            closeConfirm();
          }}
        >
          {confirmConfig.confirmLabel ?? "実行する"}
        </button>
      </DialogShell>
    );
  }

  return null;
}
