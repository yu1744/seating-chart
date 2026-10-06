"use client";
import React from "react";
import type { SeatingHook } from "@/app/useSeating";
import { CloseIcon } from "./ui/Icons";

interface RevealBarProps {
  s: SeatingHook;
}

/**
 * 発表モードの操作バー。くじ引きのように 1 人ずつ席を明かしていく。
 * 投影しても見えるよう、名前は大きく出す。
 */
export default function RevealBar({ s }: RevealBarProps) {
  const { reveal, revealCurrentName, revealNext, revealAll, endReveal, seatNumbers, revealCurrentKey } = s;

  if (!reveal) return null;

  const total = reveal.order.length;
  const done = reveal.index + 1;
  const finished = done >= total;
  const seatNo = revealCurrentKey ? seatNumbers[revealCurrentKey] : undefined;

  return (
    <div className="reveal-bar no-print" role="region" aria-label="発表モード">
      <div className="flex items-center gap-3 min-w-0">
        <span className="reveal-count tabular-nums">
          {done} / {total}
        </span>
        <div className="min-w-0">
          {revealCurrentName ? (
            <>
              <p className="reveal-name truncate" aria-live="polite">
                {revealCurrentName}
              </p>
              {seatNo !== undefined && <p className="reveal-seat">席 {seatNo}</p>}
            </>
          ) : (
            <p className="reveal-name text-[var(--faint)]">「次へ」で発表を始めます</p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {!finished && (
          <button type="button" className="btn btn-sm" onClick={revealAll}>
            すべて表示
          </button>
        )}
        <button
          type="button"
          className="btn btn-primary"
          onClick={finished ? endReveal : revealNext}
          autoFocus
        >
          {finished ? "終わる" : "次へ"}
        </button>
        <button
          type="button"
          className="btn-icon"
          onClick={endReveal}
          aria-label="発表モードを終了"
          title="終了（Esc）"
        >
          <CloseIcon />
        </button>
      </div>
    </div>
  );
}
