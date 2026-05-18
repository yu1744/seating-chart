"use client";
import React from "react";
import { useSeating } from "./useSeating";

export default function SeatingArranger() {
  const s = useSeating();

  return (
    <main className="flex-1 w-full min-h-screen py-8 px-4 sm:px-6 lg:px-8 bg-slate-50 text-slate-900">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-6 mb-8 border-b border-slate-200 no-print">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">席替えシステム</h1>
            <p className="text-xs text-slate-500 mt-1.5 font-medium">席表のサイズと通路を設定し、名前を入力してシャッフルできます。配置後はドラッグ＆ドロップで調整も可能です。</p>
          </div>
          <div className="flex items-center gap-3">
            <input type="text" value={s.customTitle} onChange={e => s.setCustomTitle(e.target.value)}
              className="px-3 py-1.5 bg-white border border-slate-200 rounded text-slate-700 text-sm focus:outline-none focus:ring-1 focus:ring-slate-400 transition-all w-48 font-medium"
              placeholder="印刷タイトル" title="印刷時のヘッダーになります" />
            <button onClick={() => window.print()} disabled={s.isShuffling}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 hover:border-slate-300 transition-all cursor-pointer disabled:opacity-50">
              印刷
            </button>
          </div>
        </header>

        {/* Print Header */}
        <div className="hidden print:block mb-6 text-center">
          <h1 className="text-2xl font-bold text-slate-900">{s.customTitle}</h1>
          <p className="text-xs text-slate-500 mt-1">印刷日: {new Date().toLocaleDateString("ja-JP")} | {s.studentCount}名</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Sidebar */}
          <div className="lg:col-span-4 flex flex-col gap-5 no-print">
            {/* Size */}
            <section className="flat-panel p-5">
              <h2 className="text-sm font-bold text-slate-800 mb-4">席表のサイズ</h2>
              <div className="flex flex-col gap-4">
                <div>
                  <div className="flex justify-between items-center mb-1.5">
                    <label className="text-xs font-semibold text-slate-500">列数（横）</label>
                    <span className="text-xs font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">{s.cols} 列</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <button onClick={() => s.setCols(p => Math.max(1, p - 1))} disabled={s.cols <= 1 || s.isShuffling}
                      className="w-7 h-7 rounded bg-slate-100 hover:bg-slate-200 border border-slate-200 disabled:opacity-30 flex items-center justify-center text-slate-700 font-bold text-xs cursor-pointer select-none">－</button>
                    <input type="range" min="1" max="12" value={s.cols} disabled={s.isShuffling}
                      onChange={e => s.setCols(parseInt(e.target.value))} className="flex-1 accent-slate-700 h-1.5 cursor-pointer" />
                    <button onClick={() => s.setCols(p => Math.min(12, p + 1))} disabled={s.cols >= 12 || s.isShuffling}
                      className="w-7 h-7 rounded bg-slate-100 hover:bg-slate-200 border border-slate-200 disabled:opacity-30 flex items-center justify-center text-slate-700 font-bold text-xs cursor-pointer select-none">＋</button>
                  </div>
                </div>
                <div>
                  <div className="flex justify-between items-center mb-1.5">
                    <label className="text-xs font-semibold text-slate-500">行数（縦）</label>
                    <span className="text-xs font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">{s.rows} 行</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <button onClick={() => s.setRows(p => Math.max(1, p - 1))} disabled={s.rows <= 1 || s.isShuffling}
                      className="w-7 h-7 rounded bg-slate-100 hover:bg-slate-200 border border-slate-200 disabled:opacity-30 flex items-center justify-center text-slate-700 font-bold text-xs cursor-pointer select-none">－</button>
                    <input type="range" min="1" max="12" value={s.rows} disabled={s.isShuffling}
                      onChange={e => s.setRows(parseInt(e.target.value))} className="flex-1 accent-slate-700 h-1.5 cursor-pointer" />
                    <button onClick={() => s.setRows(p => Math.min(12, p + 1))} disabled={s.rows >= 12 || s.isShuffling}
                      className="w-7 h-7 rounded bg-slate-100 hover:bg-slate-200 border border-slate-200 disabled:opacity-30 flex items-center justify-center text-slate-700 font-bold text-xs cursor-pointer select-none">＋</button>
                  </div>
                </div>
              </div>
              <div className="mt-4 p-3 bg-slate-50 border border-slate-200 rounded">
                <p className="text-[11px] text-slate-500">💡 空いているマスをクリックすると、その席を<strong className="text-slate-800">無効（通路など）</strong>にできます。無効にした席にはシャッフル時に名前が配置されません。</p>
              </div>
            </section>

            {/* Names */}
            <section className="flat-panel p-5">
              <div className="flex justify-between items-center mb-3">
                <h2 className="text-sm font-bold text-slate-800">名前の入力</h2>
                <span className="text-[11px] px-2 py-0.5 bg-slate-100 border border-slate-200 text-slate-700 rounded-full font-bold">{s.studentCount}名</span>
              </div>
              <textarea value={s.namesText} onChange={e => s.setNamesText(e.target.value)} disabled={s.isShuffling}
                className="w-full h-44 px-3 py-2 bg-white border border-slate-200 rounded text-slate-700 text-xs focus:outline-none focus:ring-1 focus:ring-slate-400 transition-all placeholder:text-slate-400 resize-none"
                placeholder={"名前を改行・カンマ・スペース区切りで入力\n例:\n佐藤 健\n鈴木 一郎"} />
              <div className="flex gap-2 mt-3">
                <button onClick={s.fillSampleNames} disabled={s.isShuffling}
                  className="flex-1 py-2 text-xs font-bold rounded bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 cursor-pointer disabled:opacity-50 select-none">サンプル入力</button>
                <button onClick={() => s.setNamesText("")} disabled={s.isShuffling || !s.namesText}
                  className="px-3 py-2 text-xs font-bold rounded bg-white border border-slate-200 hover:bg-slate-50 text-rose-600 cursor-pointer disabled:opacity-50 select-none">クリア</button>
              </div>
            </section>

            {/* Presets */}
            <section className="flat-panel p-5">
              <h2 className="text-sm font-bold text-slate-800 mb-2">レイアウトの保存</h2>
              <p className="text-[10px] text-amber-600 bg-amber-50 border border-amber-200 rounded px-2 py-1 mb-3">
                ⚠ ブラウザの一時保存領域（localStorage）を利用しています。キャッシュのクリアやブラウザの設定変更により、保存データが消える場合があります。
              </p>
              <div className="flex gap-2 mb-4">
                <input type="text" value={s.presetName} onChange={e => s.setPresetName(e.target.value)}
                  className="flex-1 px-3 py-1.5 bg-white border border-slate-200 rounded text-slate-700 text-xs focus:outline-none focus:ring-1 focus:ring-slate-400 transition-all"
                  placeholder="例: 1年A組" />
                <button onClick={s.savePreset} disabled={!s.presetName.trim()}
                  className="px-3 py-1.5 text-xs font-bold rounded bg-slate-800 hover:bg-slate-900 text-white disabled:opacity-40 cursor-pointer select-none">保存</button>
              </div>
              {s.savedPresets.length === 0 ? (
                <div className="text-center py-4 border border-dashed border-slate-200 rounded bg-slate-50">
                  <p className="text-[11px] text-slate-400">保存されたレイアウトはありません</p>
                </div>
              ) : (
                <div className="flex flex-col gap-2 max-h-44 overflow-y-auto pr-1">
                  {s.savedPresets.map(p => (
                    <div key={p.id} onClick={() => s.loadPreset(p)}
                      className="flex items-center justify-between p-2.5 bg-white hover:bg-slate-50 border border-slate-200 rounded cursor-pointer transition-all group">
                      <div className="flex flex-col">
                        <span className="text-xs font-bold text-slate-700 group-hover:text-slate-900">{p.name}</span>
                        <span className="text-[9px] text-slate-400 mt-0.5">{p.cols}列×{p.rows}行 | {p.createdAt}</span>
                      </div>
                      <button onClick={e => s.deletePreset(p.id, e)}
                        className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-slate-100 cursor-pointer" title="削除">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>

          {/* Main Area */}
          <div className="lg:col-span-8 flex flex-col gap-5 print-area">
            {/* Stats Bar */}
            <div className="flat-panel p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 no-print">
              <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
                <div className="flex flex-col">
                  <span className="text-[10px] uppercase tracking-wider font-bold text-slate-400">有効席数</span>
                  <span className="text-xl font-bold text-slate-800">{s.activeSeatsCount} <span className="text-xs font-normal text-slate-500">席</span></span>
                </div>
                <div className="w-px h-6 bg-slate-200 hidden sm:block" />
                <div className="flex flex-col">
                  <span className="text-[10px] uppercase tracking-wider font-bold text-slate-400">入力人数</span>
                  <span className="text-xl font-bold text-slate-800">{s.studentCount} <span className="text-xs font-normal text-slate-500">人</span></span>
                </div>
                <div className="w-px h-6 bg-slate-200 hidden sm:block" />
                <div className="flex flex-col">
                  <span className="text-[10px] uppercase tracking-wider font-bold text-slate-400">状況</span>
                  <div className="mt-0.5">
                    {s.seatDeficit > 0 ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">{s.seatDeficit}席不足</span>
                    ) : s.studentCount === 0 ? (
                      <span className="inline-flex items-center text-[11px] font-semibold text-slate-500 bg-slate-50 px-2 py-0.5 rounded border border-slate-200">名前未入力</span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">配置可能（空き: {s.activeSeatsCount - s.studentCount}）</span>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={s.clearLayout} disabled={s.isShuffling}
                  className="px-3 py-1.5 text-xs font-bold rounded bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 disabled:opacity-30 cursor-pointer select-none">配置をクリア</button>
                <button onClick={s.fullReset} disabled={s.isShuffling}
                  className="px-3 py-1.5 text-xs font-bold rounded bg-white border border-slate-200 hover:bg-slate-50 text-rose-600 disabled:opacity-30 cursor-pointer select-none">初期化</button>
                <button onClick={s.startShuffle} disabled={s.isShuffling || !s.parsedNames.length || s.seatDeficit > 0}
                  className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-40 active:scale-[0.98] cursor-pointer select-none">
                  {s.isShuffling ? (
                    <><svg className="animate-spin h-3.5 w-3.5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" /></svg>シャッフル中...</>
                  ) : "席替えを実行"}
                </button>
              </div>
            </div>

            {/* Grid */}
            <div className="flat-panel p-6 print:p-0 print:border-none print:shadow-none">
              <div className="w-full py-1.5 bg-slate-100 border border-slate-200 rounded text-center text-xs font-bold text-slate-500 tracking-wider mb-6 select-none print:bg-slate-50 print:border-slate-300 print:text-slate-600">
                【 黒 板 】
              </div>
              <div className="grid gap-3 print-grid" style={{ gridTemplateColumns: `repeat(${s.cols}, minmax(0, 1fr))`, ["--print-cols" as string]: s.cols }}>
                {Array.from({ length: s.rows }).map((_, ri) =>
                  Array.from({ length: s.cols }).map((_, ci) => {
                    const key = `r${ri}-c${ci}`;
                    const disabled = s.disabledSeats.includes(key);
                    const name = s.seatingLayout[key];
                    const isOver = s.dragOverSeatKey === key;
                    const isDragging = s.draggedSeatKey === key;

                    if (disabled) return (
                      <div key={key} onClick={() => s.toggleSeatDisabled(ri, ci)} title="クリックで有効化"
                        className="aspect-[4/3] rounded flex items-center justify-center border border-dashed border-slate-200 bg-slate-50 cursor-pointer hover:bg-slate-100 transition-all select-none group print-desk-disabled">
                        <span className="opacity-0 group-hover:opacity-100 text-slate-400 text-[10px]">有効化</span>
                      </div>
                    );

                    if (!name) return (
                      <div key={key} onDragOver={e => s.handleDragOver(e, key)} onDragLeave={s.handleDragLeave} onDrop={e => s.handleDrop(e, key)}
                        onClick={() => s.toggleSeatDisabled(ri, ci)} title="クリックで無効化（通路設定）"
                        className={`aspect-[4/3] rounded flex flex-col items-center justify-center border border-dashed transition-all select-none cursor-pointer group print-desk ${isOver ? "border-blue-500 bg-blue-50/50" : "border-slate-200 hover:border-rose-300 hover:bg-rose-50/30 bg-white"}`}>
                        <span className="text-[11px] font-medium text-slate-400 group-hover:text-rose-500 group-hover:hidden print:group-hover:block">空席</span>
                        <span className="hidden group-hover:inline text-[9px] font-bold text-rose-500 print:group-hover:hidden">無効化</span>
                      </div>
                    );

                    const av = s.getAvatarColors(name);
                    return (
                      <div key={key} draggable={!s.isShuffling}
                        onDragStart={e => s.handleDragStart(e, key)} onDragOver={e => s.handleDragOver(e, key)}
                        onDragLeave={s.handleDragLeave} onDrop={e => s.handleDrop(e, key)}
                        onDoubleClick={() => { if (!s.isShuffling) s.setSeatingLayout(p => ({ ...p, [key]: null })); }}
                        className={`aspect-[4/3] relative rounded border flex flex-col justify-between p-2 select-none transition-all group bg-white print-desk ${
                          s.isShuffling ? "animate-shuffle-active border-slate-200" : "hover:bg-slate-50 border-slate-200 hover:border-slate-300"
                        } ${isDragging ? "opacity-30 scale-95 border-dashed border-blue-500" : ""} ${isOver ? "border-blue-500 bg-blue-50/80" : ""}`}
                        style={{ cursor: s.isShuffling ? "wait" : "grab" }} title="ドラッグで入れ替え / ダブルクリックで解除">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1">
                            <div className={`w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-extrabold shrink-0 ${av.bg} ${av.text}`}>{s.getInitial(name)}</div>
                          </div>
                          <span className="text-[8px] font-bold text-slate-300 font-mono">{ri+1}-{ci+1}</span>
                        </div>
                        <div className="flex-1 flex items-center justify-center">
                          <p className="text-xs font-bold text-slate-800 truncate max-w-full">{name}</p>
                        </div>
                        <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity no-print">
                          <button onClick={e => { e.stopPropagation(); if (!s.isShuffling) s.setSeatingLayout(p => ({ ...p, [key]: null })); }}
                            className="p-0.5 rounded-full bg-slate-100 hover:bg-rose-100 text-slate-400 hover:text-rose-600 cursor-pointer" title="外す">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-2.5 w-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Help */}
            <div className="flat-panel p-5 no-print">
              <h3 className="text-xs font-bold text-slate-700 mb-2">使い方</h3>
              <ul className="text-[11px] text-slate-500 space-y-1.5 list-disc pl-5">
                <li>左側のパネルで<strong className="text-slate-700">行数・列数</strong>をスライダーで変更し、席表のサイズを決めます。</li>
                <li>名前を入力して<strong className="text-slate-700">「席替えを実行」</strong>を押すと、ランダムに配置されます。</li>
                <li>配置後、席のカードを<strong className="text-slate-700">ドラッグ＆ドロップ</strong>して手動で入れ替えができます。</li>
                <li><strong className="text-slate-700">空席をクリック</strong>すると、その席を無効（通路など）に設定できます。再度クリックで元に戻ります。</li>
                <li>配置済みのカードを<strong className="text-slate-700">ダブルクリック</strong>するか、ホバー時の「✕」で個別に外せます。</li>
                <li>レイアウト（サイズと通路設定）は名前をつけてブラウザに保存できます。ただしキャッシュクリア時に削除される場合があります。</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
