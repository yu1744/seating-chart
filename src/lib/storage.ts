import type {
  Accommodations,
  BackupFile,
  Board,
  RosterMeta,
  SeatingPreset,
  SeatingResult,
  SessionSnapshot,
  StudentRoster,
} from "./types";
import { clampDim, normalizeBoard } from "./seating";

export const STORAGE_KEYS = {
  presets: "seating-presets",
  rosters: "seating-rosters",
  results: "seating-results",
  session: "seating-session",
} as const;

export type SaveOutcome = { ok: true } | { ok: false; message: string };

const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);

const str = (v: unknown, fallback = ""): string => (typeof v === "string" ? v : fallback);
const num = (v: unknown, fallback: number): number => (typeof v === "number" && Number.isFinite(v) ? v : fallback);
const strArray = (v: unknown): string[] => (Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : []);
const numArray = (v: unknown): number[] =>
  Array.isArray(v) ? v.filter((x): x is number => typeof x === "number" && Number.isFinite(x)) : [];

/** 名簿の付加情報（番号・ふりがな・性別）。読めない値は落とす。 */
const metaOf = (v: unknown): RosterMeta => {
  if (!isRecord(v)) return {};
  const out: RosterMeta = {};
  for (const [name, raw] of Object.entries(v)) {
    if (!name || !isRecord(raw)) continue;
    const no = typeof raw.no === "number" && Number.isFinite(raw.no) ? raw.no : undefined;
    const kana = typeof raw.kana === "string" && raw.kana ? raw.kana : undefined;
    const gender = raw.gender === "m" || raw.gender === "f" ? raw.gender : undefined;
    if (no === undefined && kana === undefined && gender === undefined) continue;
    out[name] = { no, kana, gender };
  }
  return out;
};

/** 配慮事項。組は 2 名ぶん揃っているものだけ採用する。 */
const accommodationsOf = (v: unknown): Accommodations => {
  if (!isRecord(v)) return { front: [], back: [], left: [], right: [], separate: [] };
  const separate: [string, string][] = Array.isArray(v.separate)
    ? v.separate
        .filter(
          (p): p is [string, string] =>
            Array.isArray(p) && typeof p[0] === "string" && typeof p[1] === "string" && p[0] !== p[1]
        )
        .map(p => [p[0], p[1]] as [string, string])
    : [];
  return {
    front: strArray(v.front),
    back: strArray(v.back),
    left: strArray(v.left),
    right: strArray(v.right),
    separate,
  };
};

const layoutOf = (v: unknown): Record<string, string | null> => {
  if (!isRecord(v)) return {};
  const out: Record<string, string | null> = {};
  for (const [k, val] of Object.entries(v)) out[k] = typeof val === "string" && val ? val : null;
  return out;
};

function rawOf(key: string): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(key);
  } catch {
    // localStorage 自体が使えない環境（プライベートモード等）。
    return null;
  }
}

/**
 * localStorage は React の外にある状態なので、useSyncExternalStore から
 * 読めるように「同じ内容なら同じ参照を返す」キャッシュを挟む。
 */
const snapshotCache = new Map<string, { raw: string | null; value: unknown }>();

function readCached<T>(key: string, parse: (raw: unknown) => T): T {
  const raw = rawOf(key);
  const hit = snapshotCache.get(key);
  if (hit && hit.raw === raw) return hit.value as T;
  let value: T;
  try {
    value = parse(raw ? JSON.parse(raw) : null);
  } catch {
    // 壊れた JSON は空として扱う（アプリが起動しなくなるのを避ける）。
    value = parse(null);
  }
  snapshotCache.set(key, { raw, value });
  return value;
}

const listeners = new Set<() => void>();

/** 保存データの変更（別タブでの更新も含む）を購読する。 */
export function subscribeSaved(onChange: () => void): () => void {
  listeners.add(onChange);
  const onStorage = (e: StorageEvent) => {
    if (!e.key || e.key.startsWith("seating-")) onChange();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(onChange);
    window.removeEventListener("storage", onStorage);
  };
}

const emit = () => {
  for (const l of listeners) l();
};

function writeRaw(key: string, value: unknown): SaveOutcome {
  if (typeof window === "undefined") return { ok: false, message: "保存できませんでした。" };
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
    return { ok: true };
  } catch (e) {
    const quota =
      e instanceof DOMException &&
      (e.name === "QuotaExceededError" || e.name === "NS_ERROR_DOM_QUOTA_REACHED");
    return {
      ok: false,
      message: quota
        ? "ブラウザの保存容量がいっぱいです。不要な保存データを削除してから、もう一度お試しください。"
        : "ブラウザの設定により保存できませんでした（プライベートモードなどで保存が禁止されている可能性があります）。",
    };
  }
}

/** 壊れた要素は捨て、読める要素だけを返す（1 件の破損で全データを失わないため）。 */
function sanitizeList<T>(raw: unknown, pick: (item: Record<string, unknown>) => T | null): T[] {
  if (!Array.isArray(raw)) return [];
  const out: T[] = [];
  for (const item of raw) {
    if (!isRecord(item)) continue;
    const parsed = pick(item);
    if (parsed) out.push(parsed);
  }
  return out;
}

const pickPreset = (o: Record<string, unknown>): SeatingPreset | null => {
  const id = str(o.id);
  const name = str(o.name);
  if (!id || !name) return null;
  return {
    id,
    name,
    rows: clampDim(num(o.rows, 6)),
    cols: clampDim(num(o.cols, 6)),
    disabledSeats: strArray(o.disabledSeats),
    aisleCols: numArray(o.aisleCols),
    aisleRows: numArray(o.aisleRows),
    createdAt: str(o.createdAt),
  };
};

const pickRoster = (o: Record<string, unknown>): StudentRoster | null => {
  const id = str(o.id);
  const name = str(o.name);
  if (!id || !name) return null;
  return {
    id,
    name,
    namesText: str(o.namesText),
    meta: metaOf(o.meta),
    accommodations: accommodationsOf(o.accommodations),
    createdAt: str(o.createdAt),
  };
};

const pickResult = (o: Record<string, unknown>): SeatingResult | null => {
  const id = str(o.id);
  const name = str(o.name);
  if (!id || !name) return null;
  return {
    id,
    name,
    rows: clampDim(num(o.rows, 6)),
    cols: clampDim(num(o.cols, 6)),
    disabledSeats: strArray(o.disabledSeats),
    pinnedSeats: strArray(o.pinnedSeats),
    aisleCols: numArray(o.aisleCols),
    aisleRows: numArray(o.aisleRows),
    meta: metaOf(o.meta),
    accommodations: accommodationsOf(o.accommodations),
    seatingLayout: layoutOf(o.seatingLayout),
    namesText: str(o.namesText),
    customTitle: str(o.customTitle, "本日の席替え"),
    createdAt: str(o.createdAt),
  };
};

/** サーバー描画時に使う空の値（参照を固定して不要な再描画を防ぐ）。 */
export const EMPTY_PRESETS: SeatingPreset[] = [];
export const EMPTY_ROSTERS: StudentRoster[] = [];
export const EMPTY_RESULTS: SeatingResult[] = [];

export const snapshotPresets = (): SeatingPreset[] =>
  readCached(STORAGE_KEYS.presets, raw => sanitizeList(raw, pickPreset));
export const snapshotRosters = (): StudentRoster[] =>
  readCached(STORAGE_KEYS.rosters, raw => sanitizeList(raw, pickRoster));
export const snapshotResults = (): SeatingResult[] =>
  readCached(STORAGE_KEYS.results, raw => sanitizeList(raw, pickResult));

const writeAndEmit = (key: string, value: unknown): SaveOutcome => {
  const outcome = writeRaw(key, value);
  emit();
  return outcome;
};

export const savePresets = (v: SeatingPreset[]) => writeAndEmit(STORAGE_KEYS.presets, v);
export const saveRosters = (v: StudentRoster[]) => writeAndEmit(STORAGE_KEYS.rosters, v);
export const saveResults = (v: SeatingResult[]) => writeAndEmit(STORAGE_KEYS.results, v);

const parseSession = (raw: unknown): SessionSnapshot | null => {
  if (!isRecord(raw) || !isRecord(raw.board)) return null;
  const b = raw.board;
  const board: Board = normalizeBoard({
    rows: clampDim(num(b.rows, 6)),
    cols: clampDim(num(b.cols, 6)),
    layout: layoutOf(b.layout),
    disabled: strArray(b.disabled),
    pinned: strArray(b.pinned),
    aisleCols: numArray(b.aisleCols),
    aisleRows: numArray(b.aisleRows),
  });
  const namesText = str(raw.namesText);
  const hasContent =
    namesText.trim().length > 0 ||
    Object.values(board.layout).some(Boolean) ||
    board.disabled.length > 0;
  if (!hasContent) return null;
  return {
    board,
    namesText,
    customTitle: str(raw.customTitle, "本日の席替え"),
    meta: metaOf(raw.meta),
    accommodations: accommodationsOf(raw.accommodations),
    savedAt: str(raw.savedAt),
  };
};

export const snapshotSession = (): SessionSnapshot | null =>
  readCached(STORAGE_KEYS.session, parseSession);

export const serverSnapshotSession = (): SessionSnapshot | null => null;

/** 作業内容の自動保存。描画中の購読者には通知しない（書き込みのみ）。 */
export const saveSession = (v: SessionSnapshot) => writeRaw(STORAGE_KEYS.session, v);

export function clearSession() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(STORAGE_KEYS.session);
  } catch {
    // 保存領域が使えない環境では何もしない。
  }
}

/** 読み込んだバックアップファイルを検証する。形式が違えば null。 */
export function parseBackup(raw: unknown): Omit<BackupFile, "app" | "version" | "exportedAt"> | null {
  if (!isRecord(raw)) return null;
  if (raw.app !== "seating-chart") return null;
  return {
    presets: sanitizeList(raw.presets, pickPreset),
    rosters: sanitizeList(raw.rosters, pickRoster),
    results: sanitizeList(raw.results, pickResult),
  };
}
