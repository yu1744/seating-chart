"use client";
import React, { useRef } from "react";
import type { SeatingHook } from "@/app/useSeating";
import Panel from "./ui/Panel";
import { DownloadIcon, UploadIcon, UsersIcon } from "./ui/Icons";

interface NameInputControlsProps {
  s: SeatingHook;
}

export default function NameInputControls({ s }: NameInputControlsProps) {
  const {
    namesText,
    setNamesText,
    isShuffling,
    studentCount,
    duplicates,
    fillSampleNames,
    clearNames,
    exportNamesCsv,
    importNamesFile,
  } = s;

  const fileRef = useRef<HTMLInputElement>(null);

  return (
    <Panel
      icon={<UsersIcon />}
      title="名前の入力"
      aside={<span className="chip">{studentCount}名</span>}
      className="no-print"
    >
      <label htmlFor="names-input" className="sr-only">
        名前一覧（1行に1名）
      </label>
      <textarea
        id="names-input"
        value={namesText}
        onChange={e => setNamesText(e.target.value)}
        disabled={isShuffling}
        rows={9}
        className="field resize-y leading-relaxed"
        placeholder={"1行に1名ずつ\n佐藤 健\n鈴木 一郎"}
      />

      {duplicates.length > 0 && (
        <p className="hint mt-2 text-[var(--pin)]">
          同じ名前が複数あります（{duplicates.slice(0, 3).join("、")}
          {duplicates.length > 3 ? " …" : ""}）
        </p>
      )}

      <div className="flex flex-wrap gap-1.5 mt-3">
        <button
          type="button"
          className="btn btn-sm"
          onClick={() => fileRef.current?.click()}
          disabled={isShuffling}
          title="CSV / TSV / テキストから名前を読み込みます"
        >
          <UploadIcon className="w-3.5 h-3.5" />
          CSV読込
        </button>
        <button
          type="button"
          className="btn btn-sm"
          onClick={exportNamesCsv}
          disabled={!studentCount}
          title="名前一覧を CSV で書き出します（Excel 対応）"
        >
          <DownloadIcon className="w-3.5 h-3.5" />
          CSV書出
        </button>
        <button type="button" className="btn btn-sm" onClick={fillSampleNames} disabled={isShuffling}>
          サンプル
        </button>
        <button
          type="button"
          className="btn btn-sm btn-danger ml-auto"
          onClick={clearNames}
          disabled={isShuffling || !namesText}
        >
          消去
        </button>
      </div>

      <input
        ref={fileRef}
        type="file"
        accept=".csv,.tsv,.txt,text/csv,text/plain"
        className="hidden"
        onChange={e => {
          const file = e.target.files?.[0];
          if (file) importNamesFile(file);
          e.target.value = "";
        }}
      />
    </Panel>
  );
}
