"use client";
import React from "react";
import { SeatingHook } from "@/app/useSeating";

interface SeatingBoardProps {
  s: SeatingHook;
}

export default function SeatingBoard({ s }: SeatingBoardProps) {
  const {
    rows,
    cols,
    disabledSeats,
    seatingLayout,
    setSeatingLayout,
    isShuffling,
    draggedSeatKey,
    dragOverSeatKey,
    toggleSeatDisabled,
    handleDragStart,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    getAvatarColors,
    getInitial
  } = s;

  return (
    <div className="flat-panel p-6 print:p-0 print:border-none print:shadow-none animate-fade-in">
      <div className="w-full py-1.5 bg-slate-100 border border-slate-200 rounded text-center text-xs font-bold text-slate-500 tracking-wider mb-6 select-none print:bg-slate-50 print:border-slate-300 print:text-slate-600">
        【 黒 板 】
      </div>
      <div
        className="grid gap-3 print-grid"
        style={{
          gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
          ["--print-cols" as string]: cols
        }}
      >
        {Array.from({ length: rows }).map((_, ri) =>
          Array.from({ length: cols }).map((_, ci) => {
            const key = `r${ri}-c${ci}`;
            const disabled = disabledSeats.includes(key);
            const name = seatingLayout[key];
            const isOver = dragOverSeatKey === key;
            const isDragging = draggedSeatKey === key;

            // Render Aisle (Disabled seat)
            if (disabled) return (
              <div
                key={key}
                onClick={() => toggleSeatDisabled(ri, ci)}
                title="クリックで有効な席に変更"
                className="aspect-[4/3] rounded flex items-center justify-center border border-dashed border-slate-200 bg-slate-50 cursor-pointer hover:bg-slate-100 transition-all select-none group print-desk-disabled"
              >
                <span className="opacity-0 group-hover:opacity-100 text-slate-400 text-[10px] transition-opacity">有効化</span>
              </div>
            );

            // Render Empty seat
            if (!name) return (
              <div
                key={key}
                onDragOver={e => handleDragOver(e, key)}
                onDragLeave={handleDragLeave}
                onDrop={e => handleDrop(e, key)}
                onClick={() => toggleSeatDisabled(ri, ci)}
                title="クリックで無効化（通路設定）"
                className={`aspect-[4/3] rounded flex flex-col items-center justify-center border border-dashed transition-all select-none cursor-pointer group print-desk ${
                  isOver ? "border-blue-500 bg-blue-50/50" : "border-slate-200 hover:border-rose-300 hover:bg-rose-50/30 bg-white"
                }`}
              >
                <span className="text-[11px] font-medium text-slate-400 group-hover:text-rose-500 group-hover:hidden print:group-hover:block">空席</span>
                <span className="hidden group-hover:inline text-[9px] font-bold text-rose-500 print:group-hover:hidden">無効化</span>
              </div>
            );

            // Render Occupied seat card
            const av = getAvatarColors(name);
            return (
              <div
                key={key}
                draggable={!isShuffling}
                onDragStart={e => handleDragStart(e, key)}
                onDragOver={e => handleDragOver(e, key)}
                onDragLeave={handleDragLeave}
                onDrop={e => handleDrop(e, key)}
                onDoubleClick={() => {
                  if (!isShuffling) setSeatingLayout(p => ({ ...p, [key]: null }));
                }}
                className={`aspect-[4/3] relative rounded border flex flex-col justify-between p-2 select-none transition-all group bg-white print-desk ${
                  isShuffling
                    ? "animate-shuffle-active border-slate-200"
                    : "hover:bg-slate-50 border-slate-200 hover:border-slate-300"
                } ${isDragging ? "opacity-30 scale-95 border-dashed border-blue-500" : ""} ${
                  isOver ? "border-blue-500 bg-blue-50/80" : ""
                }`}
                style={{ cursor: isShuffling ? "wait" : "grab" }}
                title="ドラッグで入れ替え / ダブルクリックで解除"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1">
                    <div className={`w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-extrabold shrink-0 ${av.bg} ${av.text}`}>
                      {getInitial(name)}
                    </div>
                  </div>
                  <span className="text-[8px] font-bold text-slate-300 font-mono">{ri + 1}-{ci + 1}</span>
                </div>
                <div className="flex-1 flex items-center justify-center min-w-0 px-0.5">
                  <p className="text-xs font-bold text-slate-800 truncate max-w-full">{name}</p>
                </div>
                <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity no-print">
                  <button
                    type="button"
                    onClick={e => {
                      e.stopPropagation();
                      if (!isShuffling) setSeatingLayout(p => ({ ...p, [key]: null }));
                    }}
                    className="p-0.5 rounded-full bg-slate-100 hover:bg-rose-100 text-slate-400 hover:text-rose-600 cursor-pointer animate-fade-in"
                    title="席から外す"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-2.5 w-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
