"use client";
import React from "react";
import { SeatingHook } from "@/app/useSeating";

interface HeaderControlsProps {
  s: SeatingHook;
}

export default function HeaderControls({ s }: HeaderControlsProps) {
  return (
    <>
      {/* Header */}
      <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-6 mb-8 border-b border-slate-200 no-print">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">席替えシステム</h1>
          <p className="text-xs text-slate-500 mt-1.5 font-medium">席表のサイズと通路を設定し、名前を入力してシャッフルできます。配置後はドラッグ＆ドロップで調整も可能です。</p>
        </div>
        <div className="flex items-center gap-3">
          <input
            type="text"
            value={s.customTitle}
            onChange={e => s.setCustomTitle(e.target.value)}
            className="px-3 py-1.5 bg-white border border-slate-200 rounded text-slate-700 text-sm focus:outline-none focus:ring-1 focus:ring-slate-400 transition-all w-48 font-medium shadow-xs"
            placeholder="印刷タイトル"
            title="印刷時のヘッダータイトルになります"
          />
          <button
            onClick={() => window.print()}
            disabled={s.isShuffling}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 hover:border-slate-300 transition-all cursor-pointer disabled:opacity-50 select-none shadow-xxs"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
            印刷・PDF出力
          </button>
        </div>
      </header>

      {/* Print Header */}
      <div className="hidden print:block mb-6 text-center">
        <h1 className="text-2xl font-bold text-slate-900">{s.customTitle}</h1>
        <p className="text-xs text-slate-500 mt-1">印刷日: {new Date().toLocaleDateString("ja-JP")} | 配置人数: {s.studentCount}名</p>
      </div>
    </>
  );
}
