"use client";
import React from "react";
import { SeatingHook } from "@/app/useSeating";

interface NameInputControlsProps {
  s: SeatingHook;
}

export default function NameInputControls({ s }: NameInputControlsProps) {
  const { namesText, setNamesText, isShuffling, studentCount, fillSampleNames } = s;

  return (
    <section className="flat-panel p-5">
      <div className="flex justify-between items-center mb-3">
        <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4.5 w-4.5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
          名前の入力
        </h2>
        <span className="text-[11px] px-2 py-0.5 bg-slate-100 border border-slate-200 text-slate-700 rounded-full font-bold">
          {studentCount}名
        </span>
      </div>
      <textarea
        value={namesText}
        onChange={e => setNamesText(e.target.value)}
        disabled={isShuffling}
        className="w-full h-44 px-3 py-2 bg-white border border-slate-200 rounded text-slate-700 text-xs focus:outline-none focus:ring-1 focus:ring-slate-400 transition-all placeholder:text-slate-400 resize-none font-sans"
        placeholder={"名前を改行・カンマ・スペース区切りで入力してください。\n例:\n佐藤 健\n鈴木 一郎\n高橋 美咲"}
      />
      <div className="flex gap-2 mt-3">
        <button
          type="button"
          onClick={fillSampleNames}
          disabled={isShuffling}
          className="flex-1 py-2 text-xs font-bold rounded bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 cursor-pointer disabled:opacity-50 select-none"
        >
          サンプル名を入力
        </button>
        <button
          type="button"
          onClick={() => setNamesText("")}
          disabled={isShuffling || !namesText}
          className="px-3 py-2 text-xs font-bold rounded bg-white border border-slate-200 hover:bg-slate-50 text-rose-600 cursor-pointer disabled:opacity-50 select-none"
        >
          クリア
        </button>
      </div>
    </section>
  );
}
