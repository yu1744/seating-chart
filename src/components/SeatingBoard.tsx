"use client";
import React, { useCallback, useRef, useState } from "react";
import type { SeatingHook } from "@/app/useSeating";
import { seatKey } from "@/lib/seating";
import { CloseIcon, PinIcon } from "./ui/Icons";

interface SeatingBoardProps {
  s: SeatingHook;
}

/** 列数が多いときは名前を少し小さくして、カード内に収める。 */
function seatFontSize(cols: number): string {
  if (cols <= 5) return "14px";
  if (cols === 6) return "13px";
  if (cols <= 8) return "12px";
  if (cols <= 10) return "11px";
  return "10px";
}

/**
 * 席と席の間（境界）そのものをグリッドのトラックにしている。
 * 通常は席間の余白、通路が開いているときは広い余白になり、席の数は変わらない。
 * 先頭には通路ボタンを置くための細い操作トラックを 1 本だけ確保する。
 */
const SEAT_TRACK_OFFSET = 3;
const seatTrack = (index: number) => SEAT_TRACK_OFFSET + index * 2;
const gutterTrack = (boundary: number) => 2 + boundary * 2;

function buildTracks(count: number, aisles: readonly number[], seatSize: string): string {
  const tracks = ["var(--ctl)", "var(--ctl-gap)"];
  for (let i = 0; i < count; i++) {
    if (i > 0) tracks.push(aisles.includes(i) ? "var(--aisle)" : "var(--seat-gap)");
    tracks.push(seatSize);
  }
  return tracks.join(" ");
}

export default function SeatingBoard({ s }: SeatingBoardProps) {
  const {
    rows,
    cols,
    disabledSeats,
    pinnedSeats,
    aisleCols,
    aisleRows,
    seatingLayout,
    isShuffling,
    dragPayload,
    dragOverSeatKey,
    selectedSeatKey,
    handleSeatActivate,
    toggleAisleCol,
    toggleAisleRow,
    togglePinned,
    removeFromSeat,
    handleDragStart,
    handleDragOver,
    handleDragLeave,
    handleDragEnd,
    handleDrop,
    getAvatarColors,
    getInitial,
  } = s;

  const boardRef = useRef<HTMLDivElement>(null);
  const [focusKey, setFocusKey] = useState(seatKey(0, 0));

  const moveFocus = useCallback(
    (r: number, c: number) => {
      const nr = Math.min(rows - 1, Math.max(0, r));
      const nc = Math.min(cols - 1, Math.max(0, c));
      const key = seatKey(nr, nc);
      setFocusKey(key);
      boardRef.current?.querySelector<HTMLElement>(`[data-seat="${key}"]`)?.focus();
    },
    [cols, rows]
  );

  const onSeatKeyDown = useCallback(
    (e: React.KeyboardEvent, r: number, c: number) => {
      const key = seatKey(r, c);
      switch (e.key) {
        case "ArrowUp":
          e.preventDefault();
          moveFocus(r - 1, c);
          break;
        case "ArrowDown":
          e.preventDefault();
          moveFocus(r + 1, c);
          break;
        case "ArrowLeft":
          e.preventDefault();
          moveFocus(r, c - 1);
          break;
        case "ArrowRight":
          e.preventDefault();
          moveFocus(r, c + 1);
          break;
        case "Home":
          e.preventDefault();
          moveFocus(r, 0);
          break;
        case "End":
          e.preventDefault();
          moveFocus(r, cols - 1);
          break;
        case "Enter":
        case " ":
          e.preventDefault();
          handleSeatActivate(key);
          break;
        case "Delete":
        case "Backspace":
          if (seatingLayout[key]) {
            e.preventDefault();
            removeFromSeat(key);
          }
          break;
        case "p":
        case "P":
          if (seatingLayout[key]) {
            e.preventDefault();
            togglePinned(key);
          }
          break;
        default:
          break;
      }
    },
    [cols, handleSeatActivate, moveFocus, removeFromSeat, seatingLayout, togglePinned]
  );

  const boundaries = (count: number) => Array.from({ length: Math.max(0, count - 1) }, (_, i) => i + 1);

  return (
    <div className="panel board-panel p-5 print:p-0">
      <div className="blackboard blackboard-align mb-5">黒 板</div>

      <div
        ref={boardRef}
        role="grid"
        aria-label="席表"
        aria-describedby="board-usage"
        className="board-grid"
        style={{
          gridTemplateColumns: buildTracks(cols, aisleCols, "minmax(0, 1fr)"),
          gridTemplateRows: buildTracks(rows, aisleRows, "auto"),
          ["--seat-font" as string]: seatFontSize(cols),
        }}
      >
        {/* 通路の開閉（マウス操作用の控えめな目印。キーボードからはサイズ欄の操作で行う） */}
        {boundaries(cols).map(i => (
          <button
            key={`ac-${i}`}
            type="button"
            tabIndex={-1}
            aria-hidden="true"
            className={`aisle-toggle is-col no-print ${aisleCols.includes(i) ? "is-open" : ""}`}
            style={{ gridColumn: gutterTrack(i), gridRow: 1 }}
            onClick={() => toggleAisleCol(i)}
            title={aisleCols.includes(i) ? "縦の通路を閉じる" : `${i}列目と${i + 1}列目の間に縦の通路を開く`}
          />
        ))}
        {boundaries(rows).map(i => (
          <button
            key={`ar-${i}`}
            type="button"
            tabIndex={-1}
            aria-hidden="true"
            className={`aisle-toggle is-row no-print ${aisleRows.includes(i) ? "is-open" : ""}`}
            style={{ gridColumn: 1, gridRow: gutterTrack(i) }}
            onClick={() => toggleAisleRow(i)}
            title={aisleRows.includes(i) ? "横の通路を閉じる" : `${i}行目と${i + 1}行目の間に横の通路を開く`}
          />
        ))}

        {/* 通路の区切り線（印刷でも出る） */}
        {aisleCols.map(i => (
          <div
            key={`lane-c-${i}`}
            aria-hidden="true"
            className="aisle-lane-v"
            style={{ gridColumn: gutterTrack(i), gridRow: `${seatTrack(0)} / -1` }}
          />
        ))}
        {aisleRows.map(i => (
          <div
            key={`lane-r-${i}`}
            aria-hidden="true"
            className="aisle-lane-h"
            style={{ gridRow: gutterTrack(i), gridColumn: `${seatTrack(0)} / -1` }}
          />
        ))}

        {Array.from({ length: rows }).map((_, r) => (
          // display:contents で、意味上の行を保ちながら 1 つのグリッドとして配置する。
          <div key={`row-${r}`} role="row" style={{ display: "contents" }}>
            {Array.from({ length: cols }).map((_, c) => {
              const key = seatKey(r, c);
              const name = seatingLayout[key] ?? null;
              const isDisabled = disabledSeats.includes(key);
              const isPinned = pinnedSeats.includes(key);
              const isSelected = selectedSeatKey === key;
              const isOver = dragOverSeatKey === key;
              const isDragging = dragPayload?.type === "seat" && dragPayload.key === key;

              const classes = [
                "seat",
                isDisabled ? "seat-disabled" : name ? "" : "seat-empty",
                isSelected ? "is-selected" : "",
                isOver ? "is-over" : "",
                isDragging ? "is-dragging" : "",
                isPinned ? "is-pinned" : "",
                isShuffling && name ? "is-shuffling" : "",
              ]
                .filter(Boolean)
                .join(" ");

              const title = isDisabled
                ? "クリックで有効な席に戻す"
                : name
                  ? selectedSeatKey
                    ? "クリックで選択中の席と入れ替え"
                    : "クリックで選択 / ドラッグで入れ替え"
                  : selectedSeatKey
                    ? "クリックでここへ移動"
                    : "クリックで無効席にする（教卓の位置など）";

              return (
                <div
                  key={key}
                  data-seat={key}
                  role="gridcell"
                  tabIndex={focusKey === key ? 0 : -1}
                  aria-label={`${r + 1}行${c + 1}列 ${name ?? (isDisabled ? "無効席" : "空席")}`}
                  aria-selected={isSelected}
                  aria-disabled={isDisabled}
                  draggable={!!name && !isShuffling}
                  onFocus={() => setFocusKey(key)}
                  onKeyDown={e => onSeatKeyDown(e, r, c)}
                  onClick={() => handleSeatActivate(key)}
                  onDragStart={e => handleDragStart(e, key)}
                  onDragEnd={handleDragEnd}
                  onDragOver={e => handleDragOver(e, key)}
                  onDragLeave={handleDragLeave}
                  onDrop={e => handleDrop(e, key)}
                  className={classes}
                  title={title}
                  style={{
                    gridColumn: seatTrack(c),
                    gridRow: seatTrack(r),
                    cursor: isShuffling ? "wait" : undefined,
                  }}
                >
                  {isDisabled ? (
                    <span className="seat-mark">有効化</span>
                  ) : name ? (
                    <>
                      <span className="seat-coord" aria-hidden="true">
                        {r + 1}-{c + 1}
                      </span>
                      {isPinned && (
                        <span className="seat-pin" aria-hidden="true">
                          <PinIcon />
                        </span>
                      )}
                      <span className="flex items-center gap-1.5 min-w-0">
                        {cols <= 8 && (
                          <span
                            aria-hidden="true"
                            className={`w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold shrink-0 ${getAvatarColors(name).bg} ${getAvatarColors(name).text}`}
                          >
                            {getInitial(name)}
                          </span>
                        )}
                        <span className="seat-name">{name}</span>
                      </span>
                      {!isShuffling && (
                        <span className="seat-tools no-print">
                          <button
                            type="button"
                            className="seat-tool is-pin"
                            aria-pressed={isPinned}
                            aria-label={isPinned ? "固定を解除" : "この席に固定（席替えしても動かさない）"}
                            title={isPinned ? "固定を解除" : "この席に固定"}
                            onClick={e => {
                              e.stopPropagation();
                              togglePinned(key);
                            }}
                          >
                            <PinIcon />
                          </button>
                          <button
                            type="button"
                            className="seat-tool is-danger"
                            aria-label={`${name} を席から外す`}
                            title="席から外す"
                            onClick={e => {
                              e.stopPropagation();
                              removeFromSeat(key);
                            }}
                          >
                            <CloseIcon />
                          </button>
                        </span>
                      )}
                    </>
                  ) : (
                    <span className="seat-mark">
                      {dragPayload || selectedSeatKey ? "ここへ" : "無効化"}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>

      <p id="board-usage" className="sr-only">
        矢印キーで席を移動、Enter で選択して別の席と入れ替え、Delete で席から外す、P で固定の切り替えができます。
      </p>
    </div>
  );
}
