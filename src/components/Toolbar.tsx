"use client";
import React from "react";
import type { SeatingHook } from "@/app/useSeating";
import { OrderIcon, RedoIcon, ShuffleIcon, UndoIcon } from "./ui/Icons";

interface ToolbarProps {
  s: SeatingHook;
}

function Stat({ label, value, unit }: { label: string; value: number; unit: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="stat-label">{label}</span>
      <span className="stat-value">
        {value}
        <span className="stat-unit ml-0.5">{unit}</span>
      </span>
    </div>
  );
}

export default function Toolbar({ s }: ToolbarProps) {
  const {
    activeSeatsCount,
    studentCount,
    placedCount,
    pinnedCount,
    seatDeficit,
    unassignedNames,
    avoidSameSeat,
    setAvoidSameSeat,
    isShuffling,
    clearLayout,
    fullReset,
    startShuffle,
    assignInOrder,
    undo,
    redo,
    canUndo,
    canRedo,
  } = s;

  const status =
    seatDeficit > 0
      ? { tone: "chip-danger", text: `席が${seatDeficit}足りません` }
      : studentCount === 0
        ? { tone: "", text: "名前が未入力" }
        : unassignedNames.length > 0
          ? { tone: "chip-accent", text: `未配置 ${unassignedNames.length}名` }
          : { tone: "chip-ok", text: "全員配置済み" };

  return (
    <div className="panel px-4 py-3 flex flex-wrap items-center justify-between gap-y-3 gap-x-5 no-print">
      <div className="flex items-center gap-5">
        <Stat label="有効席" value={activeSeatsCount} unit="席" />
        <div className="w-px h-7 bg-[var(--line)]" aria-hidden="true" />
        <Stat label="名前" value={studentCount} unit="名" />
        <div className="w-px h-7 bg-[var(--line)]" aria-hidden="true" />
        <Stat label="配置済" value={placedCount} unit="名" />
        <div className="flex flex-col items-start gap-1 pl-1">
          <span className={`chip ${status.tone}`} aria-live="polite">
            {status.text}
          </span>
          {pinnedCount > 0 && <span className="chip chip-pin">固定 {pinnedCount}席</span>}
        </div>
      </div>

      <div className="flex items-center gap-1.5 ml-auto">
        <label
          className="flex items-center gap-1.5 mr-1 text-[11.5px] font-medium text-[var(--muted)] cursor-pointer select-none"
          title="席替え後に前と同じ席になる人を、できるだけ減らします"
        >
          <input
            type="checkbox"
            checked={avoidSameSeat}
            onChange={e => setAvoidSameSeat(e.target.checked)}
            disabled={isShuffling}
            className="accent-[var(--accent)] cursor-pointer"
          />
          前と同じ席を避ける
        </label>
        <button
          type="button"
          className="btn-icon"
          onClick={undo}
          disabled={!canUndo}
          title="元に戻す（Ctrl+Z）"
          aria-label="元に戻す"
        >
          <UndoIcon />
        </button>
        <button
          type="button"
          className="btn-icon"
          onClick={redo}
          disabled={!canRedo}
          title="やり直す（Ctrl+Shift+Z）"
          aria-label="やり直す"
        >
          <RedoIcon />
        </button>
        <div className="w-px h-6 bg-[var(--line)] mx-1" aria-hidden="true" />
        <button
          type="button"
          className="btn btn-sm"
          onClick={assignInOrder}
          disabled={isShuffling || !studentCount}
          title="入力した順（出席番号順）に前から配置します"
        >
          <OrderIcon className="w-3.5 h-3.5" />
          順に配置
        </button>
        <button type="button" className="btn btn-sm" onClick={clearLayout} disabled={isShuffling}>
          配置クリア
        </button>
        <button
          type="button"
          className="btn btn-sm btn-danger"
          onClick={fullReset}
          disabled={isShuffling}
        >
          初期化
        </button>
        <button
          type="button"
          className="btn btn-primary"
          onClick={startShuffle}
          disabled={isShuffling || !studentCount || seatDeficit > 0}
        >
          <ShuffleIcon className={`w-3.5 h-3.5 ${isShuffling ? "animate-spin" : ""}`} />
          {isShuffling ? "シャッフル中" : "席替えを実行"}
        </button>
      </div>
    </div>
  );
}
