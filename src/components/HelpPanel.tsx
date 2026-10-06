"use client";
import React from "react";
import { ChevronIcon, QuestionIcon } from "./ui/Icons";

const ROWS: [string, string][] = [
  ["名前をクリック", "選んでから別の席をクリックで入れ替え"],
  ["ドラッグ", "席を入れ替える（未配置の名前も置ける）"],
  ["空席をクリック", "無効席にする（教卓など・もう一度で戻す）"],
  ["席表の上・左の ▾", "列（行）の間に通路を開く"],
  ["ピン", "席替えしても動かさない（固定席）"],
  ["Delete キー", "選んだ席から名前を外す"],
  ["Ctrl + Z", "元に戻す / Ctrl + Shift + Z でやり直す"],
];

export default function HelpPanel() {
  return (
    <details className="panel group no-print">
      <summary className="flex items-center gap-2 px-4 py-3 cursor-pointer list-none select-none">
        <QuestionIcon className="w-[15px] h-[15px] text-[var(--faint)]" />
        <span className="text-[12.5px] font-semibold">操作の方法</span>
        <ChevronIcon className="w-3.5 h-3.5 text-[var(--faint)] ml-auto transition-transform group-open:rotate-90" />
      </summary>
      <dl className="px-4 pb-4 grid sm:grid-cols-2 gap-x-6 gap-y-2">
        {ROWS.map(([key, value]) => (
          <div key={key} className="flex items-baseline gap-2.5 min-w-0">
            <dt className="text-[11px] font-semibold text-[var(--text)] whitespace-nowrap">{key}</dt>
            <dd className="hint truncate">{value}</dd>
          </div>
        ))}
      </dl>
    </details>
  );
}
