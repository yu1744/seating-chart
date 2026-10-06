"use client";
import React from "react";
import type { SeatingHook } from "@/app/useSeating";
import Panel from "./ui/Panel";
import { UsersIcon } from "./ui/Icons";

interface UnassignedNamesProps {
  s: SeatingHook;
}

export default function UnassignedNames({ s }: UnassignedNamesProps) {
  const {
    unassignedNames,
    strayNames,
    placeNameInFirstVacancy,
    handleNameDragStart,
    handleDragEnd,
    removeStrayNames,
    isShuffling,
  } = s;

  if (!unassignedNames.length && !strayNames.length) return null;

  return (
    <Panel
      icon={<UsersIcon />}
      title="未配置の名前"
      aside={<span className="chip chip-accent">{unassignedNames.length}名</span>}
      className="no-print animate-fade-in"
    >
      {unassignedNames.length > 0 ? (
        <>
          <div className="flex flex-wrap gap-1.5">
            {unassignedNames.map((name, i) => (
              <button
                key={`${name}-${i}`}
                type="button"
                className="chip-btn"
                draggable={!isShuffling}
                onDragStart={e => handleNameDragStart(e, name)}
                onDragEnd={handleDragEnd}
                onClick={() => placeNameInFirstVacancy(name)}
                title="クリックで空席に配置 / 席へドラッグ"
              >
                {name}
              </button>
            ))}
          </div>
          <p className="hint mt-2.5">クリックで空席へ、ドラッグで好きな席へ配置できます。</p>
        </>
      ) : null}

      {strayNames.length > 0 && (
        <div className={unassignedNames.length ? "mt-4 pt-3.5 border-t border-[var(--line)]" : ""}>
          <div className="flex items-center justify-between gap-3">
            <span className="label">名簿にない名前が {strayNames.length}名 座っています</span>
            <button type="button" className="btn btn-sm" onClick={removeStrayNames}>
              席から外す
            </button>
          </div>
          <p className="hint mt-1.5">{strayNames.join("、")}</p>
        </div>
      )}
    </Panel>
  );
}
