"use client";
import { useCallback, useMemo, useState } from "react";

const HISTORY_LIMIT = 60;
/** 同じ操作（スライダー連続操作など）を 1 件の履歴にまとめる猶予時間。 */
const COALESCE_MS = 700;

interface Edits<T> {
  past: T[];
  present: T;
  future: T[];
  lastTag: string | null;
  lastAt: number;
}

export interface HistoryController<T> {
  state: T;
  /** 履歴に積んで更新する。同じ tag の連続操作は 1 件にまとめる。 */
  commit: (updater: T | ((prev: T) => T), options?: { tag?: string }) => void;
  /** 履歴を消して作り直す（読み込み・初期化など、やり直しの起点にしたいとき）。 */
  reset: (next: T) => void;
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  /** 一度も編集していない（base をそのまま表示している）状態かどうか。 */
  isPristine: boolean;
}

/**
 * base は「まだ編集していないときに表示する値」。
 * localStorage からの復元値のように描画後に確定する値を渡せるよう、
 * 最初の編集があるまでは base をそのまま使い、編集後は内部の履歴に切り替える。
 */
export function useHistoryState<T>(base: T): HistoryController<T> {
  const [edits, setEdits] = useState<Edits<T> | null>(null);
  const present = edits ? edits.present : base;

  const commit = useCallback(
    (updater: T | ((prev: T) => T), options?: { tag?: string }) => {
      setEdits(prev => {
        const current = prev ? prev.present : base;
        const next = typeof updater === "function" ? (updater as (p: T) => T)(current) : updater;
        if (next === current) return prev;
        const now = Date.now();
        const tag = options?.tag ?? null;
        const coalesce = !!prev && tag !== null && tag === prev.lastTag && now - prev.lastAt < COALESCE_MS;
        if (prev && coalesce) {
          return { ...prev, present: next, future: [], lastAt: now };
        }
        const past = [...(prev?.past ?? []), current];
        return {
          past: past.length > HISTORY_LIMIT ? past.slice(past.length - HISTORY_LIMIT) : past,
          present: next,
          future: [],
          lastTag: tag,
          lastAt: now,
        };
      });
    },
    [base]
  );

  const reset = useCallback((next: T) => {
    setEdits({ past: [], present: next, future: [], lastTag: null, lastAt: 0 });
  }, []);

  const undo = useCallback(() => {
    setEdits(prev => {
      if (!prev?.past.length) return prev;
      const present = prev.past[prev.past.length - 1];
      return {
        past: prev.past.slice(0, -1),
        present,
        future: [prev.present, ...prev.future],
        lastTag: null,
        lastAt: 0,
      };
    });
  }, []);

  const redo = useCallback(() => {
    setEdits(prev => {
      if (!prev?.future.length) return prev;
      const [next, ...future] = prev.future;
      return { past: [...prev.past, prev.present], present: next, future, lastTag: null, lastAt: 0 };
    });
  }, []);

  return useMemo(
    () => ({
      state: present,
      commit,
      reset,
      undo,
      redo,
      canUndo: !!edits && edits.past.length > 0,
      canRedo: !!edits && edits.future.length > 0,
      isPristine: edits === null,
    }),
    [present, edits, commit, reset, undo, redo]
  );
}
