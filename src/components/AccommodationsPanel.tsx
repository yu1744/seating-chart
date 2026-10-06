"use client";
import React, { useState } from "react";
import type { SeatingHook } from "@/app/useSeating";
import type { SeatZone } from "@/lib/types";
import Panel from "./ui/Panel";
import { CloseIcon, HeartIcon } from "./ui/Icons";

interface AccommodationsPanelProps {
  s: SeatingHook;
}

const ZONES: { zone: SeatZone; label: string; hint: string }[] = [
  { zone: "front", label: "前", hint: "前方の席にする（黒板が見えにくい・聞こえにくいとき）" },
  { zone: "back", label: "後", hint: "後方の席にする（背が高いときなど）" },
  { zone: "left", label: "左", hint: "左側の席にする（窓側・廊下側は教室によります）" },
  { zone: "right", label: "右", hint: "右側の席にする" },
];

export default function AccommodationsPanel({ s }: AccommodationsPanelProps) {
  const {
    parsedNames,
    activeAccommodations,
    accommodationCount,
    toggleZone,
    addSeparatePair,
    removeSeparatePair,
    clearAccommodations,
    isShuffling,
  } = s;

  const [pairA, setPairA] = useState("");
  const [pairB, setPairB] = useState("");

  const zoneOf = (name: string): SeatZone[] =>
    ZONES.map(z => z.zone).filter(z => activeAccommodations[z].includes(name));

  // 希望が設定されている人（設定順ではなく名簿順に並べる）
  const withZone = parsedNames.filter(n => zoneOf(n).length > 0);
  const withoutZone = parsedNames.filter(n => zoneOf(n).length === 0);

  return (
    <Panel
      icon={<HeartIcon />}
      title="配慮事項"
      aside={
        accommodationCount > 0 ? (
          <button
            type="button"
            className="btn btn-sm"
            onClick={clearAccommodations}
            disabled={isShuffling}
          >
            消去
          </button>
        ) : undefined
      }
      className="no-print"
    >
      {parsedNames.length === 0 ? (
        <p className="hint">名前を入力すると、席の希望や離す組を設定できます。</p>
      ) : (
        <>
          {/* 希望の席 */}
          <div className="flex items-center justify-between mb-2">
            <span className="label">席の希望</span>
            <select
              className="field w-[128px] py-1"
              value=""
              disabled={isShuffling || withoutZone.length === 0}
              onChange={e => {
                if (e.target.value) toggleZone(e.target.value, "front");
              }}
              aria-label="席の希望を追加する人"
            >
              <option value="">＋ 人を追加</option>
              {withoutZone.map(n => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </div>

          {withZone.length === 0 ? (
            <p className="hint mb-3">まだありません。右上から人を選んで設定します。</p>
          ) : (
            <div className="flex flex-col gap-1.5 mb-4 max-h-44 overflow-y-auto">
              {withZone.map(name => {
                const zones = zoneOf(name);
                return (
                  <div key={name} className="flex items-center gap-1.5">
                    <span className="text-[11.5px] font-medium truncate flex-1 min-w-0">{name}</span>
                    {ZONES.map(({ zone, label, hint }) => (
                      <button
                        key={zone}
                        type="button"
                        className={`zone-chip ${zones.includes(zone) ? "is-on" : ""}`}
                        aria-pressed={zones.includes(zone)}
                        aria-label={`${name}: ${hint}`}
                        title={hint}
                        disabled={isShuffling}
                        onClick={() => toggleZone(name, zone)}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                );
              })}
            </div>
          )}

          {/* 離す組 */}
          <div className="divider mb-3" />
          <span className="label block mb-2">離す組（隣・前後にしない）</span>
          <div className="flex items-center gap-1.5 mb-2">
            <select
              className="field flex-1 py-1"
              value={pairA}
              disabled={isShuffling}
              onChange={e => setPairA(e.target.value)}
              aria-label="離す組の1人目"
            >
              <option value="">1人目</option>
              {parsedNames.map(n => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
            <select
              className="field flex-1 py-1"
              value={pairB}
              disabled={isShuffling}
              onChange={e => setPairB(e.target.value)}
              aria-label="離す組の2人目"
            >
              <option value="">2人目</option>
              {parsedNames.filter(n => n !== pairA).map(n => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
            <button
              type="button"
              className="btn btn-sm shrink-0"
              disabled={isShuffling || !pairA || !pairB || pairA === pairB}
              onClick={() => {
                addSeparatePair(pairA, pairB);
                setPairA("");
                setPairB("");
              }}
            >
              追加
            </button>
          </div>

          {activeAccommodations.separate.length === 0 ? (
            <p className="hint">まだありません。</p>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {activeAccommodations.separate.map(([a, b]) => (
                <span key={`${a}-${b}`} className="chip">
                  {a} ↔ {b}
                  <button
                    type="button"
                    onClick={() => removeSeparatePair(a, b)}
                    className="text-[var(--faint)] hover:text-[var(--danger)] cursor-pointer ml-0.5"
                    aria-label={`${a} と ${b} の組を外す`}
                    title="外す"
                  >
                    <CloseIcon className="w-2.5 h-2.5" />
                  </button>
                </span>
              ))}
            </div>
          )}
        </>
      )}
    </Panel>
  );
}
