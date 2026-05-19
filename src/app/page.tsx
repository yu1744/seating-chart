"use client";
import React from "react";
import { useSeating } from "./useSeating";
import HeaderControls from "@/components/HeaderControls";
import SizeControls from "@/components/SizeControls";
import NameInputControls from "@/components/NameInputControls";
import PresetControls from "@/components/PresetControls";
import SeatingStats from "@/components/SeatingStats";
import SeatingBoard from "@/components/SeatingBoard";
import CustomDialogs from "@/components/CustomDialogs";

export default function SeatingArranger() {
  const s = useSeating();

  return (
    <main className="flex-1 w-full min-h-screen py-8 px-4 sm:px-6 lg:px-8 bg-slate-50 text-slate-900">
      <div className="max-w-7xl mx-auto">
        {/* Header and Print Header */}
        <HeaderControls s={s} />

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Sidebar (Controls) */}
          <div className="lg:col-span-4 flex flex-col gap-5 no-print">
            <SizeControls s={s} />
            <NameInputControls s={s} />
            <PresetControls s={s} />
          </div>

          {/* Main Content (Seating Board & Status) */}
          <div className="lg:col-span-8 flex flex-col gap-5 print-area">
            <SeatingStats s={s} />
            <SeatingBoard s={s} />

            {/* Interactive Help Panel */}
            <div className="flat-panel p-5 no-print">
              <h3 className="text-xs font-bold text-slate-700 mb-2">使い方</h3>
              <ul className="text-[11px] text-slate-500 space-y-1.5 list-disc pl-5">
                <li>左側のパネルで<strong className="text-slate-700">行数・列数</strong>をスライダーで変更し、席表のサイズを決めます。</li>
                <li>名前を入力して<strong className="text-slate-700">「席替えを実行」</strong>を押すと、ランダムに配置されます。</li>
                <li>配置後、席のカードを<strong className="text-slate-700">ドラッグ＆ドロップ</strong>して手動で入れ替えができます。</li>
                <li><strong className="text-slate-700">空席をクリック</strong>すると、その席を無効（通路など）に設定できます。再度クリックで元に戻ります。</li>
                <li>配置済みのカードを<strong className="text-slate-700">ダブルクリック</strong>するか、ホバー時の「✕」で個別に外せます。</li>
                <li>「型紙（サイズ・通路設定）」と「配置結果（席配置）」は、名前をつけて保存し、いつでも読み込みや上書き更新が可能です（※ブラウザのキャッシュ領域に保存されます）。</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Elegant Custom Dialogs (Modal Alert/Confirm) */}
      <CustomDialogs s={s} />
    </main>
  );
}
