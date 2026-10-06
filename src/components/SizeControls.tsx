"use client";
import React from "react";
import type { SeatingHook } from "@/app/useSeating";
import Panel from "./ui/Panel";
import { GridIcon } from "./ui/Icons";

interface SizeControlsProps {
  s: SeatingHook;
}

interface DimRowProps {
  id: string;
  label: string;
  unit: string;
  value: number;
  min: number;
  max: number;
  disabled: boolean;
  onChange: (updater: number | ((prev: number) => number)) => void;
}

function DimRow({ id, label, unit, value, min, max, disabled, onChange }: DimRowProps) {
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <label htmlFor={id} className="label">
          {label}
        </label>
        <span className="chip">
          {value} {unit}
        </span>
      </div>
      <div className="flex items-center gap-2.5">
        <button
          type="button"
          className="btn-icon shrink-0"
          onClick={() => onChange(p => p - 1)}
          disabled={disabled || value <= min}
          aria-label={`${label}を減らす`}
        >
          <span aria-hidden="true" className="text-sm leading-none">
            −
          </span>
        </button>
        <input
          id={id}
          type="range"
          min={min}
          max={max}
          value={value}
          disabled={disabled}
          onChange={e => onChange(parseInt(e.target.value, 10))}
          className="flex-1 h-1.5 accent-[var(--accent)] cursor-pointer"
          aria-valuetext={`${value} ${unit}`}
        />
        <button
          type="button"
          className="btn-icon shrink-0"
          onClick={() => onChange(p => p + 1)}
          disabled={disabled || value >= max}
          aria-label={`${label}を増やす`}
        >
          <span aria-hidden="true" className="text-sm leading-none">
            ＋
          </span>
        </button>
      </div>
    </div>
  );
}

interface AisleRowProps {
  label: string;
  direction: "col" | "row";
  count: number;
  open: readonly number[];
  disabled: boolean;
  onToggle: (boundary: number) => void;
}

/** 席と席の間に通路を開けるトグル。席の数は変わらない。 */
function AisleRow({ label, direction, count, open, disabled, onToggle }: AisleRowProps) {
  const boundaries = Array.from({ length: Math.max(0, count - 1) }, (_, i) => i + 1);
  const unit = direction === "col" ? "列" : "行";

  return (
    <div className="flex items-center gap-2">
      <span className="label shrink-0 w-14">{label}</span>
      {boundaries.length === 0 ? (
        <span className="hint">—</span>
      ) : (
        <div className="flex flex-wrap gap-1">
          {boundaries.map(i => {
            const isOpen = open.includes(i);
            return (
              <button
                key={i}
                type="button"
                onClick={() => onToggle(i)}
                disabled={disabled}
                aria-pressed={isOpen}
                aria-label={`${i}${unit}目と${i + 1}${unit}目の間の通路`}
                title={`${i}${unit}目と${i + 1}${unit}目の間の通路`}
                className={`aisle-chip ${direction === "col" ? "is-col" : "is-row"} ${isOpen ? "is-open" : ""}`}
              >
                <span aria-hidden="true">{i}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function SizeControls({ s }: SizeControlsProps) {
  const {
    cols,
    setCols,
    rows,
    setRows,
    isShuffling,
    totalSeats,
    aisleCols,
    aisleRows,
    toggleAisleCol,
    toggleAisleRow,
    clearAisles,
    MIN_DIM,
    MAX_DIM,
  } = s;
  const hasAisle = aisleCols.length > 0 || aisleRows.length > 0;

  return (
    <Panel
      icon={<GridIcon />}
      title="席表のサイズ"
      aside={<span className="chip">全 {totalSeats} マス</span>}
      className="no-print"
    >
      <div className="flex flex-col gap-4">
        <DimRow
          id="dim-cols"
          label="列（横）"
          unit="列"
          value={cols}
          min={MIN_DIM}
          max={MAX_DIM}
          disabled={isShuffling}
          onChange={setCols}
        />
        <DimRow
          id="dim-rows"
          label="行（縦）"
          unit="行"
          value={rows}
          min={MIN_DIM}
          max={MAX_DIM}
          disabled={isShuffling}
          onChange={setRows}
        />
      </div>
      <div className="divider my-4" />

      <div className="flex items-center justify-between mb-2.5">
        <span className="panel-title text-[12px]">通路</span>
        {hasAisle && (
          <button type="button" className="btn btn-sm" onClick={clearAisles} disabled={isShuffling}>
            すべて閉じる
          </button>
        )}
      </div>
      <div className="flex flex-col gap-2">
        <AisleRow
          label="縦（列間）"
          direction="col"
          count={cols}
          open={aisleCols}
          disabled={isShuffling}
          onToggle={toggleAisleCol}
        />
        <AisleRow
          label="横（行間）"
          direction="row"
          count={rows}
          open={aisleRows}
          disabled={isShuffling}
          onToggle={toggleAisleRow}
        />
      </div>

      <p className="hint mt-3.5">
        通路は席の数を変えません。席表の上や左の目印からも開閉できます。使わないマスは空席をクリックして無効席に。
      </p>
    </Panel>
  );
}
