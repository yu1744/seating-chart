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
          className="range flex-1"
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

export default function SizeControls({ s }: SizeControlsProps) {
  const { cols, setCols, rows, setRows, isShuffling, totalSeats, MIN_DIM, MAX_DIM } = s;

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
      <p className="hint mt-3.5">
        席表の上・左の ▾ で列（行）の間に通路を開けます。使わないマスは空席をクリックして無効席に。
      </p>
    </Panel>
  );
}
