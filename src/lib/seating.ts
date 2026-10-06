import type { Board } from "./types";

export const MIN_DIM = 1;
export const MAX_DIM = 12;
export const DEFAULT_DIM = 6;

export const seatKey = (r: number, c: number) => `r${r}-c${c}`;

export function parseSeatKey(key: string): { r: number; c: number } | null {
  const m = /^r(\d+)-c(\d+)$/.exec(key);
  return m ? { r: parseInt(m[1], 10), c: parseInt(m[2], 10) } : null;
}

export function clampDim(v: number): number {
  if (!Number.isFinite(v)) return DEFAULT_DIM;
  return Math.min(MAX_DIM, Math.max(MIN_DIM, Math.round(v)));
}

export function allSeatKeys(rows: number, cols: number): string[] {
  const keys: string[] = [];
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) keys.push(seatKey(r, c));
  return keys;
}

export function emptyBoard(rows = DEFAULT_DIM, cols = DEFAULT_DIM): Board {
  const layout: Record<string, string | null> = {};
  for (const k of allSeatKeys(rows, cols)) layout[k] = null;
  return { rows, cols, layout, disabled: [], pinned: [] };
}

const withinBounds = (key: string, rows: number, cols: number) => {
  const p = parseSeatKey(key);
  return !!p && p.r < rows && p.c < cols;
};

/**
 * 寸法を有効範囲に収め、範囲外に取り残されたキーを落とし、
 * 全ての座席キーが layout に存在する状態へ整える。
 */
export function normalizeBoard(board: Board): Board {
  const rows = clampDim(board.rows);
  const cols = clampDim(board.cols);
  const layout: Record<string, string | null> = {};
  for (const k of allSeatKeys(rows, cols)) {
    const v = board.layout?.[k];
    layout[k] = typeof v === "string" && v.length > 0 ? v : null;
  }
  const disabled = uniq(board.disabled ?? []).filter(k => withinBounds(k, rows, cols));
  // 無効席・空席は固定できない（固定は「この人をここに留める」という意味のため）。
  const pinned = uniq(board.pinned ?? []).filter(
    k => withinBounds(k, rows, cols) && !disabled.includes(k) && !!layout[k]
  );
  // 無効席に人が残らないようにする。
  for (const k of disabled) layout[k] = null;
  return { rows, cols, layout, disabled, pinned };
}

const uniq = <T,>(arr: T[]): T[] => Array.from(new Set(arr));

/** 偏りのない乱数（利用できる環境では暗号論的乱数を使う）。 */
function randomInt(maxExclusive: number): number {
  if (maxExclusive <= 1) return 0;
  const g = typeof globalThis !== "undefined" ? globalThis.crypto : undefined;
  if (g?.getRandomValues) {
    // 剰余による偏りを避けるため、範囲を超えた値は捨てて引き直す。
    const limit = Math.floor(0x100000000 / maxExclusive) * maxExclusive;
    const buf = new Uint32Array(1);
    for (let i = 0; i < 64; i++) {
      g.getRandomValues(buf);
      if (buf[0] < limit) return buf[0] % maxExclusive;
    }
  }
  return Math.floor(Math.random() * maxExclusive);
}

export function shuffleArray<T>(arr: readonly T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** 名前入力欄の文字列を 1 行 1 名として解釈する。 */
export function parseNames(namesText: string): string[] {
  if (!namesText.trim()) return [];
  return namesText
    .split(/\r?\n/)
    .map(n => n.trim())
    .filter(n => n.length > 0);
}

/** 多重集合としての差分（同姓同名があっても件数で正しく引く）。 */
export function subtractNames(all: readonly string[], remove: readonly string[]): string[] {
  const counts = new Map<string, number>();
  for (const n of remove) counts.set(n, (counts.get(n) ?? 0) + 1);
  const rest: string[] = [];
  for (const n of all) {
    const c = counts.get(n) ?? 0;
    if (c > 0) counts.set(n, c - 1);
    else rest.push(n);
  }
  return rest;
}

/** 2 件以上現れる名前（同姓同名の注意喚起に使う）。 */
export function duplicateNames(names: readonly string[]): string[] {
  const counts = new Map<string, number>();
  for (const n of names) counts.set(n, (counts.get(n) ?? 0) + 1);
  return [...counts.entries()].filter(([, c]) => c > 1).map(([n]) => n);
}

export const occupiedSeatKeys = (board: Board): string[] =>
  allSeatKeys(board.rows, board.cols).filter(k => !!board.layout[k]);

export const placedNames = (board: Board): string[] =>
  occupiedSeatKeys(board).map(k => board.layout[k] as string);

/** シャッフル対象（無効でも固定でもない）の座席キー。 */
export const shuffleTargetKeys = (board: Board): string[] =>
  allSeatKeys(board.rows, board.cols).filter(
    k => !board.disabled.includes(k) && !board.pinned.includes(k)
  );

/** 固定席に座っている名前（シャッフル対象から除外される）。 */
export const pinnedNames = (board: Board): string[] =>
  board.pinned.map(k => board.layout[k]).filter((n): n is string => !!n);

/** 空いている（有効かつ無人の）座席キー。 */
export const vacantSeatKeys = (board: Board): string[] =>
  allSeatKeys(board.rows, board.cols).filter(k => !board.disabled.includes(k) && !board.layout[k]);

/** 固定席を保ったまま、残りの名前をランダムに配置した新しい board を返す。 */
export function assignRandomly(board: Board, names: readonly string[]): Board {
  const targets = shuffleTargetKeys(board);
  const pool = shuffleArray(subtractNames(names, pinnedNames(board)));
  const layout: Record<string, string | null> = {};
  for (const k of allSeatKeys(board.rows, board.cols)) {
    layout[k] = board.pinned.includes(k) ? board.layout[k] ?? null : null;
  }
  const slots = shuffleArray(targets);
  pool.forEach((name, i) => {
    const k = slots[i];
    if (k) layout[k] = name;
  });
  return { ...board, layout };
}

/** 席替え前後で席が変わらなかった人数（連続実行時の体感に使う）。 */
export function sameSeatCount(before: Board, after: Board): number {
  let n = 0;
  for (const k of allSeatKeys(after.rows, after.cols)) {
    const a = before.layout[k];
    if (a && a === after.layout[k] && !after.pinned.includes(k)) n++;
  }
  return n;
}

const AVATAR_COLORS = [
  { bg: "bg-blue-100", text: "text-blue-700" },
  { bg: "bg-indigo-100", text: "text-indigo-700" },
  { bg: "bg-emerald-100", text: "text-emerald-700" },
  { bg: "bg-violet-100", text: "text-violet-700" },
  { bg: "bg-amber-100", text: "text-amber-700" },
  { bg: "bg-sky-100", text: "text-sky-700" },
  { bg: "bg-rose-100", text: "text-rose-700" },
] as const;

export function getAvatarColors(name: string): { bg: string; text: string } {
  if (!name) return { bg: "bg-slate-100", text: "text-slate-700" };
  let h = 0;
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length];
}

export const getInitial = (name: string) => (name ? name.replace(/\s+/g, "").charAt(0) : "");

/** 保存日時の表示。ISO 文字列も、旧データの整形済み文字列もそのまま扱える。 */
export function formatStamp(value: string): string {
  if (!value) return "";
  if (!/^\d{4}-\d{2}-\d{2}T/.test(value)) return value;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString("ja-JP", {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export const nowStamp = () => new Date().toISOString();

export function createId(): string {
  const g = typeof globalThis !== "undefined" ? globalThis.crypto : undefined;
  if (g?.randomUUID) return g.randomUUID();
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}
