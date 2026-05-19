"use client";
import React from "react";
import { SeatingHook } from "@/app/useSeating";

interface SizeControlsProps {
  s: SeatingHook;
}

export default function SizeControls({ s }: SizeControlsProps) {
  const { cols, setCols, rows, setRows, isShuffling } = s;

  return (
    <section className="flat-panel p-5">
      <h2 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
        </svg>
        席表のサイズ
      </h2>
      <div className="flex flex-col gap-4">
        <div>
          <div className="flex justify-between items-center mb-1.5">
            <label className="text-xs font-semibold text-slate-500">列数（横）</label>
            <span className="text-xs font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">{cols} 列</span>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setCols(p => Math.max(1, p - 1))}
              disabled={cols <= 1 || isShuffling}
              className="w-7 h-7 rounded bg-slate-100 hover:bg-slate-200 border border-slate-200 disabled:opacity-30 flex items-center justify-center text-slate-700 font-bold text-xs cursor-pointer select-none"
            >
              －
            </button>
            <input
              type="range"
              min="1"
              max="12"
              value={cols}
              disabled={isShuffling}
              onChange={e => setCols(parseInt(e.target.value))}
              className="flex-1 accent-slate-700 h-1.5 cursor-pointer bg-slate-200 rounded-lg"
            />
            <button
              onClick={() => setCols(p => Math.min(12, p + 1))}
              disabled={cols >= 12 || isShuffling}
              className="w-7 h-7 rounded bg-slate-100 hover:bg-slate-200 border border-slate-200 disabled:opacity-30 flex items-center justify-center text-slate-700 font-bold text-xs cursor-pointer select-none"
            >
              ＋
            </button>
          </div>
        </div>
        <div>
          <div className="flex justify-between items-center mb-1.5">
            <label className="text-xs font-semibold text-slate-500">行数（縦）</label>
            <span className="text-xs font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">{rows} 行</span>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setRows(p => Math.max(1, p - 1))}
              disabled={rows <= 1 || isShuffling}
              className="w-7 h-7 rounded bg-slate-100 hover:bg-slate-200 border border-slate-200 disabled:opacity-30 flex items-center justify-center text-slate-700 font-bold text-xs cursor-pointer select-none"
            >
              －
            </button>
            <input
              type="range"
              min="1"
              max="12"
              value={rows}
              disabled={isShuffling}
              onChange={e => setRows(parseInt(e.target.value))}
              className="flex-1 accent-slate-700 h-1.5 cursor-pointer bg-slate-200 rounded-lg"
            />
            <button
              onClick={() => setRows(p => Math.min(12, p + 1))}
              disabled={rows >= 12 || isShuffling}
              className="w-7 h-7 rounded bg-slate-100 hover:bg-slate-200 border border-slate-200 disabled:opacity-30 flex items-center justify-center text-slate-700 font-bold text-xs cursor-pointer select-none"
            >
              ＋
            </button>
          </div>
        </div>
      </div>
      <div className="mt-4 p-3 bg-slate-50 border border-slate-200 rounded">
        <p className="text-[11px] text-slate-500 leading-normal">
          💡 空いているマスをクリックすると、その席を<strong className="text-slate-800">無効（通路など）</strong>にできます。無効にした席にはシャッフル時に名前が配置されません。
        </p>
      </div>
    </section>
  );
}
