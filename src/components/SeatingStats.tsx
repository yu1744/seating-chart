"use client";
import React from "react";
import { SeatingHook } from "@/app/useSeating";

interface SeatingStatsProps {
  s: SeatingHook;
}

export default function SeatingStats({ s }: SeatingStatsProps) {
  const {
    activeSeatsCount,
    studentCount,
    seatDeficit,
    isShuffling,
    clearLayout,
    fullReset,
    startShuffle,
    parsedNames
  } = s;

  return (
    <div className="flat-panel p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 no-print">
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
        <div className="flex flex-col">
          <span className="text-[10px] uppercase tracking-wider font-bold text-slate-400">有効席数</span>
          <span className="text-xl font-bold text-slate-800">
            {activeSeatsCount} <span className="text-xs font-normal text-slate-500">席</span>
          </span>
        </div>
        <div className="w-px h-6 bg-slate-200 hidden sm:block" />
        <div className="flex flex-col">
          <span className="text-[10px] uppercase tracking-wider font-bold text-slate-400 font-medium">配置人数</span>
          <span className="text-xl font-bold text-slate-800">
            {studentCount} <span className="text-xs font-normal text-slate-500">人</span>
          </span>
        </div>
        <div className="w-px h-6 bg-slate-200 hidden sm:block" />
        <div className="flex flex-col">
          <span className="text-[10px] uppercase tracking-wider font-bold text-slate-400 font-medium">配置ステータス</span>
          <div className="mt-0.5">
            {seatDeficit > 0 ? (
              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                {seatDeficit}席不足しています
              </span>
            ) : studentCount === 0 ? (
              <span className="inline-flex items-center text-[11px] font-semibold text-slate-500 bg-slate-50 px-2 py-0.5 rounded border border-slate-200">
                名前が未入力です
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 animate-pulse-subtle">
                配置可能（空席: {activeSeatsCount - studentCount}）
              </span>
            )}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={clearLayout}
          disabled={isShuffling}
          className="px-3 py-1.5 text-xs font-bold rounded bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 disabled:opacity-30 cursor-pointer select-none transition-colors"
        >
          配置をクリア
        </button>
        <button
          type="button"
          onClick={fullReset}
          disabled={isShuffling}
          className="px-3 py-1.5 text-xs font-bold rounded bg-white border border-slate-200 hover:bg-slate-50 text-rose-600 disabled:opacity-30 cursor-pointer select-none transition-colors"
        >
          初期化
        </button>
        <button
          type="button"
          onClick={startShuffle}
          disabled={isShuffling || !parsedNames.length || seatDeficit > 0}
          className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-40 active:scale-[0.98] cursor-pointer select-none transition-all shadow-xs"
        >
          {isShuffling ? (
            <>
              <svg className="animate-spin h-3.5 w-3.5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              シャッフル中...
            </>
          ) : (
            "席替えを実行"
          )}
        </button>
      </div>
    </div>
  );
}
