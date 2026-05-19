"use client";
import React from "react";
import { SeatingHook } from "@/app/useSeating";

interface PresetControlsProps {
  s: SeatingHook;
}

export default function PresetControls({ s }: PresetControlsProps) {
  const {
    presetName, setPresetName,
    rosterName, setRosterName,
    resultName, setResultName,
    savedPresets, savedRosters, savedResults,
    selectedResultId, setSelectedResultId,
    selectedRosterId, setSelectedRosterId,
    presetTab, setPresetTab,
    savePreset, loadPreset, deletePreset,
    saveRoster, updateRoster, loadRoster, deleteRoster,
    saveResult, updateResult, loadResult, deleteResult,
    isShuffling,
    namesText
  } = s;

  // Find currently selected items for visual feedback
  const activeResult = savedResults.find(r => r.id === selectedResultId);
  const activeRoster = savedRosters.find(r => r.id === selectedRosterId);

  return (
    <section className="flat-panel p-5">
      <div className="flex justify-between items-center mb-3">
        <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4.5 w-4.5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
          </svg>
          データの保存・管理
        </h2>
      </div>

      {/* Tab Switcher (3 Tabs) */}
      <div className="flex border-b border-slate-200 mb-4 select-none">
        <button
          onClick={() => setPresetTab("layout")}
          className={`flex-1 pb-2 text-xs font-bold transition-all border-b-2 cursor-pointer text-center ${
            presetTab === "layout"
              ? "border-slate-800 text-slate-800"
              : "border-transparent text-slate-400 hover:text-slate-600"
          }`}
        >
          レイアウト型紙
        </button>
        <button
          onClick={() => setPresetTab("roster")}
          className={`flex-1 pb-2 text-xs font-bold transition-all border-b-2 cursor-pointer text-center ${
            presetTab === "roster"
              ? "border-slate-800 text-slate-800"
              : "border-transparent text-slate-400 hover:text-slate-600"
          }`}
        >
          名簿リスト
        </button>
        <button
          onClick={() => setPresetTab("result")}
          className={`flex-1 pb-2 text-xs font-bold transition-all border-b-2 cursor-pointer text-center ${
            presetTab === "result"
              ? "border-slate-800 text-slate-800"
              : "border-transparent text-slate-400 hover:text-slate-600"
          }`}
        >
          配置結果
        </button>
      </div>

      {/* LocalStorage Cache Warning */}
      <p className="text-[10px] text-amber-600 bg-amber-50 border border-amber-200 rounded px-2 py-1.5 mb-4 select-none leading-normal">
        ⚠ ブラウザの一時保存領域（localStorage）を利用しています。キャッシュのクリアやブラウザの設定変更により、保存データが消える場合があります。
      </p>

      {/* Tab 1: Layout presets */}
      {presetTab === "layout" && (
        <div className="animate-fade-in">
          <p className="text-[11px] text-slate-500 mb-3 leading-normal">
            列数・行数と無効席（通路など）の設定のみを保存します（名前や席配置は保存されません）。別の席替えで同じ教室レイアウトを使い回す場合に便利です。
          </p>
          <div className="flex gap-2 mb-4">
            <input
              type="text"
              value={presetName}
              onChange={e => setPresetName(e.target.value)}
              className="flex-1 px-3 py-1.5 bg-white border border-slate-200 rounded text-slate-700 text-xs focus:outline-none focus:ring-1 focus:ring-slate-400 transition-all shadow-xs"
              placeholder="例: 6x6 通路あり"
            />
            <button
              onClick={savePreset}
              disabled={!presetName.trim() || isShuffling}
              className="px-3 py-1.5 text-xs font-bold rounded bg-slate-800 hover:bg-slate-900 text-white disabled:opacity-40 cursor-pointer select-none shadow-xs"
            >
              保存
            </button>
          </div>

          {savedPresets.length === 0 ? (
            <div className="text-center py-4 border border-dashed border-slate-200 rounded bg-slate-50">
              <p className="text-[11px] text-slate-400">保存されたレイアウトはありません</p>
            </div>
          ) : (
            <div className="flex flex-col gap-2 max-h-44 overflow-y-auto pr-1">
              {savedPresets.map(p => (
                <div
                  key={p.id}
                  onClick={() => loadPreset(p)}
                  className="flex items-center justify-between p-2.5 bg-white hover:bg-slate-50 border border-slate-200 rounded cursor-pointer transition-all group shadow-xxs hover:translate-x-0.5"
                >
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-slate-700 group-hover:text-slate-900 transition-colors">
                      {p.name}
                    </span>
                    <span className="text-[9px] text-slate-400 mt-0.5">
                      {p.cols}列×{p.rows}行 | {p.createdAt}
                    </span>
                  </div>
                  <button
                    onClick={e => deletePreset(p.id, p.name, e)}
                    className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-slate-100 transition-all cursor-pointer"
                    title="削除"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Student Rosters (名簿) */}
      {presetTab === "roster" && (
        <div className="animate-fade-in">
          <p className="text-[11px] text-slate-500 mb-3 leading-normal">
            入力された名前一覧（名簿）のみを保存します（サイズや席配置は保存されません）。別の席替えで同じクラスのメンバーリストを使い回す場合に便利です。
          </p>

          {/* Currently loaded roster indicator */}
          {activeRoster && (
            <div className="mb-4 p-3 bg-indigo-50 border border-indigo-200 rounded flex items-center justify-between gap-3 animate-fade-in no-print">
              <div className="flex flex-col min-w-0">
                <span className="text-[9px] text-indigo-600 font-bold uppercase tracking-wider">編集中の名簿</span>
                <span className="text-xs font-bold text-indigo-800 truncate block">{activeRoster.name}</span>
              </div>
              <div className="flex gap-1.5 shrink-0">
                <button
                  onClick={updateRoster}
                  disabled={isShuffling || !namesText.trim()}
                  className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-[10px] rounded transition-all cursor-pointer shadow-xs select-none"
                  title="現在の入力内容で名簿を上書き保存します"
                >
                  上書き更新
                </button>
                <button
                  onClick={() => setSelectedRosterId(null)}
                  className="px-2 py-1 bg-white hover:bg-slate-100 border border-slate-200 text-slate-500 font-semibold text-[10px] rounded transition-all cursor-pointer select-none"
                  title="新規保存モードに戻します"
                >
                  解除
                </button>
              </div>
            </div>
          )}

          <div className="flex gap-2 mb-4">
            <input
              type="text"
              value={rosterName}
              onChange={e => setRosterName(e.target.value)}
              className="flex-1 px-3 py-1.5 bg-white border border-slate-200 rounded text-slate-700 text-xs focus:outline-none focus:ring-1 focus:ring-slate-400 transition-all shadow-xs"
              placeholder={activeRoster ? "別名で名簿を保存" : "例: 1年A組 名簿"}
            />
            <button
              onClick={saveRoster}
              disabled={!rosterName.trim() || isShuffling || !namesText.trim()}
              className="px-3 py-1.5 text-xs font-bold rounded bg-slate-800 hover:bg-slate-900 text-white disabled:opacity-40 cursor-pointer select-none shadow-xs"
            >
              新規保存
            </button>
          </div>

          {savedRosters.length === 0 ? (
            <div className="text-center py-4 border border-dashed border-slate-200 rounded bg-slate-50">
              <p className="text-[11px] text-slate-400">保存された名簿リストはありません</p>
            </div>
          ) : (
            <div className="flex flex-col gap-2 max-h-44 overflow-y-auto pr-1">
              {savedRosters.map(r => (
                <div
                  key={r.id}
                  onClick={() => loadRoster(r)}
                  className={`flex items-center justify-between p-2.5 rounded cursor-pointer transition-all group shadow-xxs hover:translate-x-0.5 border ${
                    r.id === selectedRosterId
                      ? "bg-indigo-50/40 border-indigo-300 hover:bg-indigo-50/60"
                      : "bg-white border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  <div className="flex flex-col min-w-0 flex-1 pr-2">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold text-slate-700 group-hover:text-slate-900 transition-colors truncate">
                        {r.name}
                      </span>
                      {r.id === selectedRosterId && (
                        <span className="px-1 py-0.2 text-[8px] font-bold text-indigo-700 bg-indigo-100 rounded border border-indigo-200 shrink-0">
                          編集枠
                        </span>
                      )}
                    </div>
                    <span className="text-[9px] text-slate-400 mt-0.5 font-mono">
                      {r.namesText.split(/[\n,、\s]+/).filter(Boolean).length}名登録 | {r.createdAt}
                    </span>
                  </div>
                  <button
                    onClick={e => deleteRoster(r.id, r.name, e)}
                    className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-slate-100 transition-all cursor-pointer shrink-0"
                    title="削除"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 3: Seating Assignment Results */}
      {presetTab === "result" && (
        <div className="animate-fade-in">
          <p className="text-[11px] text-slate-500 mb-3 leading-normal">
            席表のサイズ、通路設定、入力した名前一覧、および<strong className="text-slate-800 font-semibold">現在の配置結果（だれがどこに座っているか）</strong>をすべて丸ごと保存します。
          </p>

          {/* Currently loaded assignment indicator */}
          {activeResult && (
            <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded flex items-center justify-between gap-3 animate-fade-in no-print">
              <div className="flex flex-col min-w-0">
                <span className="text-[9px] text-blue-600 font-bold uppercase tracking-wider">読み込み中の枠</span>
                <span className="text-xs font-bold text-blue-800 truncate block">{activeResult.name}</span>
              </div>
              <div className="flex gap-1.5 shrink-0">
                <button
                  onClick={updateResult}
                  disabled={isShuffling}
                  className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white font-bold text-[10px] rounded transition-all cursor-pointer shadow-xs select-none"
                  title="現在の座席変更をこの枠に上書き保存します"
                >
                  上書き更新
                </button>
                <button
                  onClick={() => setSelectedResultId(null)}
                  className="px-2 py-1 bg-white hover:bg-slate-100 border border-slate-200 text-slate-500 font-semibold text-[10px] rounded transition-all cursor-pointer select-none"
                  title="新規保存モードに切り替えます"
                >
                  解除
                </button>
              </div>
            </div>
          )}

          <div className="flex gap-2 mb-4">
            <input
              type="text"
              value={resultName}
              onChange={e => setResultName(e.target.value)}
              className="flex-1 px-3 py-1.5 bg-white border border-slate-200 rounded text-slate-700 text-xs focus:outline-none focus:ring-1 focus:ring-slate-400 transition-all shadow-xs"
              placeholder={activeResult ? "別名で新規保存" : "例: 1年A組 配置結果"}
            />
            <button
              onClick={saveResult}
              disabled={!resultName.trim() || isShuffling}
              className="px-3 py-1.5 text-xs font-bold rounded bg-slate-800 hover:bg-slate-900 text-white disabled:opacity-40 cursor-pointer select-none shadow-xs"
            >
              新規保存
            </button>
          </div>

          {savedResults.length === 0 ? (
            <div className="text-center py-4 border border-dashed border-slate-200 rounded bg-slate-50">
              <p className="text-[11px] text-slate-400">保存された配置結果はありません</p>
            </div>
          ) : (
            <div className="flex flex-col gap-2 max-h-44 overflow-y-auto pr-1">
              {savedResults.map(r => (
                <div
                  key={r.id}
                  onClick={() => loadResult(r)}
                  className={`flex items-center justify-between p-2.5 rounded cursor-pointer transition-all group shadow-xxs hover:translate-x-0.5 border ${
                    r.id === selectedResultId
                      ? "bg-blue-50/40 border-blue-300 hover:bg-blue-50/60"
                      : "bg-white border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  <div className="flex flex-col min-w-0 flex-1 pr-2">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold text-slate-700 group-hover:text-slate-900 transition-colors truncate">
                        {r.name}
                      </span>
                      {r.id === selectedResultId && (
                        <span className="px-1 py-0.2 text-[8px] font-bold text-blue-700 bg-blue-100 rounded border border-blue-200 shrink-0">
                          編集枠
                        </span>
                      )}
                    </div>
                    <span className="text-[9px] text-slate-400 mt-0.5">
                      {r.cols}列×{r.rows}行 | {r.createdAt}
                    </span>
                  </div>
                  <button
                    onClick={e => deleteResult(r.id, r.name, e)}
                    className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-slate-100 transition-all cursor-pointer shrink-0"
                    title="削除"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
