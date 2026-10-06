"use client";
import React, { useSyncExternalStore } from "react";
import type { SeatingHook } from "@/app/useSeating";
import { PrintIcon } from "./ui/Icons";

interface AppHeaderProps {
  s: SeatingHook;
}

const noSubscribe = () => () => {};
/** 印刷日はクライアントで決める（サーバー描画との不一致を避ける）。 */
const useToday = () =>
  useSyncExternalStore(
    noSubscribe,
    () => new Date().toLocaleDateString("ja-JP"),
    () => ""
  );

export default function AppHeader({ s }: AppHeaderProps) {
  const printedOn = useToday();

  return (
    <>
      <header className="flex flex-wrap items-center justify-between gap-3 mb-5 no-print">
        <div className="flex items-center gap-2.5">
          <h1 className="text-[18px] font-semibold tracking-[-0.01em]">席替えシステム</h1>
          {s.isRestored && (
            <span className="chip" title="前回の作業内容をそのまま表示しています">
              前回の内容を復元
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <div className="seg w-[164px]" role="radiogroup" aria-label="席表の向き">
            <button
              type="button"
              role="radio"
              className="seg-item"
              aria-checked={s.viewMode === "student"}
              onClick={() => s.setViewMode("student")}
              title="黒板が上。配付・掲示用の向きです"
            >
              配付用
            </button>
            <button
              type="button"
              role="radio"
              className="seg-item"
              aria-checked={s.viewMode === "teacher"}
              onClick={() => s.setViewMode("teacher")}
              title="教室の前から見た向き（黒板が下、左右が反転）"
            >
              前から
            </button>
          </div>
          <button
            type="button"
            className="chip-toggle"
            aria-pressed={s.showSeatNumbers}
            onClick={() => s.setShowSeatNumbers(v => !v)}
            title="席に通し番号を振って表示します（くじ引きで席を指定するとき）"
          >
            席番号
          </button>
          <label htmlFor="print-title" className="sr-only">
            印刷時のタイトル
          </label>
          <input
            id="print-title"
            type="text"
            value={s.customTitle}
            onChange={e => s.setCustomTitle(e.target.value)}
            className="field w-44"
            placeholder="印刷タイトル"
            title="印刷したときに上に出る見出しです"
          />
          <button
            type="button"
            className="btn"
            onClick={() => window.print()}
            disabled={s.isShuffling}
          >
            <PrintIcon className="w-4 h-4" />
            印刷 / PDF
          </button>
        </div>
      </header>

      {/* 印刷時だけ出る見出し */}
      <div className="hidden print:block mb-5 text-center">
        <h2 className="text-xl font-bold">{s.customTitle}</h2>
        <p className="text-[11px] text-slate-500 mt-1">
          {printedOn} ・ {s.placedCount}名
        </p>
      </div>
    </>
  );
}
