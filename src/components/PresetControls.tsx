"use client";
import React, { useRef } from "react";
import type { SeatingHook } from "@/app/useSeating";
import Panel from "./ui/Panel";
import { DatabaseIcon, DownloadIcon, SaveIcon, TrashIcon, UploadIcon } from "./ui/Icons";

interface PresetControlsProps {
  s: SeatingHook;
}

type TabId = "layout" | "roster" | "result" | "backup";

const TABS: { id: TabId; label: string; hint: string }[] = [
  { id: "layout", label: "レイアウト", hint: "サイズと無効席の設定だけを保存します。" },
  { id: "roster", label: "名簿", hint: "名前一覧だけを保存します。" },
  { id: "result", label: "配置", hint: "だれがどこに座るかを含めて保存します。" },
  { id: "backup", label: "データ", hint: "保存データをファイルに書き出し・読み込みします。" },
];

function SavedRow({
  name,
  meta,
  active,
  onLoad,
  onDelete,
}: {
  name: string;
  meta: string;
  active: boolean;
  onLoad: () => void;
  onDelete: (e: React.MouseEvent) => void;
}) {
  return (
    <div
      className={`group flex items-center gap-2 rounded-[var(--radius)] border px-2.5 py-2 transition-colors ${
        active
          ? "border-[#c7d9ff] bg-[var(--accent-soft)]"
          : "border-[var(--line)] bg-white hover:bg-[var(--surface-sunken)]"
      }`}
    >
      <button type="button" onClick={onLoad} className="flex-1 min-w-0 text-left cursor-pointer">
        <span className="block text-[12.5px] font-semibold truncate">{name}</span>
        <span className="block text-[10.5px] text-[var(--faint)] mt-0.5 tabular-nums">{meta}</span>
      </button>
      {active && <span className="chip chip-accent shrink-0">編集中</span>}
      <button
        type="button"
        onClick={onDelete}
        className="btn-icon shrink-0 w-6 h-6 border-0 bg-transparent opacity-0 group-hover:opacity-100 focus-visible:opacity-100"
        aria-label={`${name} を削除`}
        title="削除"
      >
        <TrashIcon className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <p className="text-[11px] text-[var(--faint)] text-center py-4 border border-dashed border-[var(--line)] rounded-[var(--radius)]">
      {text}
    </p>
  );
}

function SaveRow({
  value,
  onChange,
  onSave,
  placeholder,
  disabled,
  label,
}: {
  value: string;
  onChange: (v: string) => void;
  onSave: () => void;
  placeholder: string;
  disabled: boolean;
  label: string;
}) {
  return (
    <div className="flex gap-1.5 mb-3">
      <input
        type="text"
        value={value}
        onChange={e => onChange(e.target.value)}
        onKeyDown={e => {
          if (e.key === "Enter" && !disabled) onSave();
        }}
        className="field"
        placeholder={placeholder}
        aria-label={label}
      />
      <button type="button" className="btn shrink-0" onClick={onSave} disabled={disabled}>
        <SaveIcon className="w-3.5 h-3.5" />
        保存
      </button>
    </div>
  );
}

export default function PresetControls({ s }: PresetControlsProps) {
  const {
    presetName, setPresetName,
    rosterName, setRosterName,
    resultName, setResultName,
    savedPresets, savedRosters, savedResults, savedTotal,
    selectedResultId, setSelectedResultId,
    selectedRosterId, setSelectedRosterId,
    presetTab, setPresetTab,
    savePreset, loadPreset, deletePreset,
    saveRoster, updateRoster, loadRoster, deleteRoster,
    saveResult, updateResult, loadResult, deleteResult,
    exportBackup, importBackup, clearAllSavedData, exportSeatingCsv,
    isShuffling, namesText, formatStamp, parsedNames,
  } = s;

  const fileRef = useRef<HTMLInputElement>(null);
  const activeRoster = savedRosters.find(r => r.id === selectedRosterId);
  const activeResult = savedResults.find(r => r.id === selectedResultId);
  const hint = TABS.find(t => t.id === presetTab)?.hint ?? "";

  return (
    <Panel
      icon={<DatabaseIcon />}
      title="保存データ"
      aside={savedTotal > 0 ? <span className="chip">{savedTotal}件</span> : undefined}
      className="no-print"
    >
      <div className="seg mb-3" role="tablist" aria-label="保存データの種類">
        {TABS.map(t => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={presetTab === t.id}
            className="seg-item"
            onClick={() => setPresetTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>
      <p className="hint mb-3">{hint}</p>

      {/* 編集中の枠（名簿・配置のみ） */}
      {presetTab === "roster" && activeRoster && (
        <div className="flex items-center gap-2 mb-3 animate-fade-in">
          <span className="flex-1 min-w-0 text-[11.5px] font-semibold truncate">
            {activeRoster.name}
          </span>
          <button
            type="button"
            className="btn btn-sm"
            onClick={updateRoster}
            disabled={isShuffling || !namesText.trim()}
          >
            上書き
          </button>
          <button type="button" className="btn btn-sm" onClick={() => setSelectedRosterId(null)}>
            解除
          </button>
        </div>
      )}
      {presetTab === "result" && activeResult && (
        <div className="flex items-center gap-2 mb-3 animate-fade-in">
          <span className="flex-1 min-w-0 text-[11.5px] font-semibold truncate">
            {activeResult.name}
          </span>
          <button type="button" className="btn btn-sm" onClick={updateResult} disabled={isShuffling}>
            上書き
          </button>
          <button type="button" className="btn btn-sm" onClick={() => setSelectedResultId(null)}>
            解除
          </button>
        </div>
      )}

      {presetTab === "layout" && (
        <div className="animate-fade-in">
          <SaveRow
            value={presetName}
            onChange={setPresetName}
            onSave={savePreset}
            placeholder="例: 6×6 中央通路"
            disabled={!presetName.trim() || isShuffling}
            label="レイアウト名"
          />
          {savedPresets.length === 0 ? (
            <EmptyState text="保存したレイアウトはまだありません" />
          ) : (
            <div className="flex flex-col gap-1.5 max-h-52 overflow-y-auto">
              {savedPresets.map(p => (
                <SavedRow
                  key={p.id}
                  name={p.name}
                  meta={`${p.cols}列 × ${p.rows}行 ・ ${formatStamp(p.createdAt)}`}
                  active={false}
                  onLoad={() => loadPreset(p)}
                  onDelete={e => deletePreset(p.id, p.name, e)}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {presetTab === "roster" && (
        <div className="animate-fade-in">
          <SaveRow
            value={rosterName}
            onChange={setRosterName}
            onSave={saveRoster}
            placeholder={activeRoster ? "別名で保存" : "例: 1年A組"}
            disabled={!rosterName.trim() || isShuffling || !namesText.trim()}
            label="名簿名"
          />
          {savedRosters.length === 0 ? (
            <EmptyState text="保存した名簿はまだありません" />
          ) : (
            <div className="flex flex-col gap-1.5 max-h-52 overflow-y-auto">
              {savedRosters.map(r => (
                <SavedRow
                  key={r.id}
                  name={r.name}
                  meta={`${r.namesText.split(/\r?\n/).filter(x => x.trim()).length}名 ・ ${formatStamp(r.createdAt)}`}
                  active={r.id === selectedRosterId}
                  onLoad={() => loadRoster(r)}
                  onDelete={e => deleteRoster(r.id, r.name, e)}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {presetTab === "result" && (
        <div className="animate-fade-in">
          <SaveRow
            value={resultName}
            onChange={setResultName}
            onSave={saveResult}
            placeholder={activeResult ? "別名で保存" : "例: 1学期の席"}
            disabled={!resultName.trim() || isShuffling}
            label="配置結果名"
          />
          {savedResults.length === 0 ? (
            <EmptyState text="保存した配置はまだありません" />
          ) : (
            <div className="flex flex-col gap-1.5 max-h-52 overflow-y-auto">
              {savedResults.map(r => (
                <SavedRow
                  key={r.id}
                  name={r.name}
                  meta={`${r.cols}列 × ${r.rows}行 ・ ${formatStamp(r.createdAt)}`}
                  active={r.id === selectedResultId}
                  onLoad={() => loadResult(r)}
                  onDelete={e => deleteResult(r.id, r.name, e)}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {presetTab === "backup" && (
        <div className="animate-fade-in flex flex-col gap-2">
          <div className="grid grid-cols-2 gap-1.5">
            <button type="button" className="btn btn-sm" onClick={exportBackup} disabled={!savedTotal}>
              <DownloadIcon className="w-3.5 h-3.5" />
              書き出し
            </button>
            <button type="button" className="btn btn-sm" onClick={() => fileRef.current?.click()}>
              <UploadIcon className="w-3.5 h-3.5" />
              読み込み
            </button>
          </div>
          <button
            type="button"
            className="btn btn-sm"
            onClick={exportSeatingCsv}
            disabled={!parsedNames.length}
            title="いまの席表を Excel で開ける CSV にします"
          >
            <DownloadIcon className="w-3.5 h-3.5" />
            席表を CSV で書き出し
          </button>
          <div className="divider my-1" />
          <p className="hint">
            保存先はこのブラウザ内（localStorage）です。キャッシュ削除や別の端末では読めないため、ときどき書き出して保管してください。
          </p>
          <button
            type="button"
            className="btn btn-sm btn-danger"
            onClick={clearAllSavedData}
            disabled={!savedTotal}
          >
            <TrashIcon className="w-3.5 h-3.5" />
            保存データをすべて削除
          </button>
          <input
            ref={fileRef}
            type="file"
            accept=".json,application/json"
            className="hidden"
            onChange={e => {
              const file = e.target.files?.[0];
              if (file) importBackup(file);
              e.target.value = "";
            }}
          />
        </div>
      )}
    </Panel>
  );
}
