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
  return { rows, cols, layout, disabled: [], pinned: [], aisleCols: [], aisleRows: [] };
}

/** 通路の境界番号（1 以上 dim-1 以下）だけを残して並べ替える。 */
export function normalizeAisles(values: readonly unknown[] | undefined, dim: number): number[] {
  if (!values) return [];
  const seen = new Set<number>();
  for (const v of values) {
    const n = typeof v === "number" ? Math.round(v) : Number.NaN;
    if (Number.isFinite(n) && n >= 1 && n <= dim - 1) seen.add(n);
  }
  return [...seen].sort((a, b) => a - b);
}

/** 通路の有無を切り替えた配列を返す。 */
export const toggleAisle = (values: readonly number[], boundary: number): number[] =>
  values.includes(boundary)
    ? values.filter(v => v !== boundary)
    : [...values, boundary].sort((a, b) => a - b);

const withinBounds = (key: string, rows: number, cols: number) => {
  const p = parseSeatKey(key);
  return !!p && p.r < rows && p.c < cols;
};

/** normalizeBoard に渡せる、項目が欠けていてもよい席表。 */
export interface BoardLike {
  rows: number;
  cols: number;
  layout?: Record<string, string | null>;
  disabled?: string[];
  pinned?: string[];
  aisleCols?: number[];
  aisleRows?: number[];
}

/**
 * 寸法を有効範囲に収め、範囲外に取り残されたキーを落とし、
 * 全ての座席キーが layout に存在する状態へ整える。
 */
export function normalizeBoard(board: BoardLike): Board {
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
  return {
    rows,
    cols,
    layout,
    disabled,
    pinned,
    aisleCols: normalizeAisles(board.aisleCols, cols),
    aisleRows: normalizeAisles(board.aisleRows, rows),
  };
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

export interface AssignOptions {
  /** できるだけ前回と同じ席にならないようにする。 */
  avoidSame?: boolean;
}

/** 固定席を保ったまま、残りの名前をランダムに配置した新しい board を返す。 */
export function assignRandomly(
  board: Board,
  names: readonly string[],
  options: AssignOptions = {}
): Board {
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
  if (options.avoidSame) repairSameSeats(layout, targets, board.layout);
  return { ...board, layout };
}

/**
 * 前回と同じ席になってしまった人を、別の席の人と入れ替えて解消する。
 * 席数が少ない場合など解消しきれないこともあるため、残りは呼び出し側で伝える。
 */
function repairSameSeats(
  layout: Record<string, string | null>,
  targets: readonly string[],
  before: Record<string, string | null>
) {
  for (let pass = 0; pass < 8; pass++) {
    const stuck = targets.filter(k => layout[k] && layout[k] === before[k]);
    if (!stuck.length) return;
    let swapped = false;
    for (const k of stuck) {
      if (layout[k] !== before[k]) continue; // 直前の入れ替えで解消済み
      for (const t of shuffleArray(targets)) {
        if (t === k) continue;
        const a = layout[k];
        const b = layout[t];
        // 入れ替えによって、どちらの席も「前回と同じ」にならない組み合わせだけ選ぶ。
        if (a === before[t]) continue;
        if (b !== null && b === before[k]) continue;
        layout[k] = b;
        layout[t] = a;
        swapped = true;
        break;
      }
    }
    if (!swapped) return;
  }
}

/** 前方・後方とみなす既定の行数。 */
export const DEFAULT_EDGE_ROWS = 2;
/** 左側・右側とみなす既定の列数。 */
export const DEFAULT_EDGE_COLS = 2;

export interface SeatingRules {
  /** 前方の席にしたい人（視力・聴力など）。 */
  front: readonly string[];
  /** 後方の席にしたい人（身長など）。 */
  back: readonly string[];
  /** 左側の席にしたい人。 */
  left: readonly string[];
  /** 右側の席にしたい人。 */
  right: readonly string[];
  /** 隣・前後にしたくない組。 */
  separate: readonly (readonly [string, string])[];
  /** できるだけ前回と同じ席にしない。 */
  avoidSame: boolean;
  frontRows: number;
  backRows: number;
  /** 左右の希望で「端」とみなす列数。 */
  sideCols: number;
}

export interface SeatingReport {
  /** 前方に置けなかった人。 */
  unmetFront: string[];
  /** 後方に置けなかった人。 */
  unmetBack: string[];
  /** 左側に置けなかった人。 */
  unmetLeft: string[];
  /** 右側に置けなかった人。 */
  unmetRight: string[];
  /** 離しきれなかった組。 */
  unmetSeparate: [string, string][];
  /** 前と同じ席になった人数。 */
  sameSeat: number;
  /** すべての配慮事項を満たせたか。 */
  satisfied: boolean;
}

const defaultRules = (rules: Partial<SeatingRules>): SeatingRules => ({
  front: rules.front ?? [],
  back: rules.back ?? [],
  left: rules.left ?? [],
  right: rules.right ?? [],
  separate: rules.separate ?? [],
  avoidSame: rules.avoidSame ?? false,
  frontRows: rules.frontRows ?? DEFAULT_EDGE_ROWS,
  backRows: rules.backRows ?? DEFAULT_EDGE_ROWS,
  sideCols: rules.sideCols ?? DEFAULT_EDGE_COLS,
});

/**
 * 上下左右のうち、通路をまたがない席だけを「隣」とみなす。
 * 通路を挟んでいれば話しづらいので、離す条件の判定でも隣扱いしない。
 */
export function buildNeighbours(board: Board): Map<string, string[]> {
  const map = new Map<string, string[]>();
  for (let r = 0; r < board.rows; r++) {
    for (let c = 0; c < board.cols; c++) {
      const key = seatKey(r, c);
      const list: string[] = [];
      if (c + 1 < board.cols && !board.aisleCols.includes(c + 1)) list.push(seatKey(r, c + 1));
      if (c - 1 >= 0 && !board.aisleCols.includes(c)) list.push(seatKey(r, c - 1));
      if (r + 1 < board.rows && !board.aisleRows.includes(r + 1)) list.push(seatKey(r + 1, c));
      if (r - 1 >= 0 && !board.aisleRows.includes(r)) list.push(seatKey(r - 1, c));
      map.set(key, list);
    }
  }
  return map;
}

const rowOfKey = (key: string) => parseSeatKey(key)?.r ?? 0;
const colOfKey = (key: string) => parseSeatKey(key)?.c ?? 0;

/** 配慮事項の違反を数え上げる。 */
function inspect(
  board: Board,
  layout: Record<string, string | null>,
  rules: SeatingRules,
  neighbours: Map<string, string[]>,
  before: Record<string, string | null>
): SeatingReport {
  const seatOf = new Map<string, string[]>();
  for (const [k, v] of Object.entries(layout)) {
    if (!v) continue;
    const list = seatOf.get(v);
    if (list) list.push(k);
    else seatOf.set(v, [k]);
  }

  const frontLimit = rules.frontRows;
  const backStart = board.rows - rules.backRows;
  const leftLimit = rules.sideCols;
  const rightStart = board.cols - rules.sideCols;

  // 固定席に座っている人は「先生が意図して置いた」ものとして判定から外す。
  const isPinned = (k: string) => board.pinned.includes(k);
  const unmetFront = rules.front.filter(name => {
    const seats = seatOf.get(name);
    return !!seats && seats.every(k => !isPinned(k) && rowOfKey(k) >= frontLimit);
  });
  const unmetBack = rules.back.filter(name => {
    const seats = seatOf.get(name);
    return !!seats && seats.every(k => !isPinned(k) && rowOfKey(k) < backStart);
  });
  const unmetLeft = rules.left.filter(name => {
    const seats = seatOf.get(name);
    return !!seats && seats.every(k => !isPinned(k) && colOfKey(k) >= leftLimit);
  });
  const unmetRight = rules.right.filter(name => {
    const seats = seatOf.get(name);
    return !!seats && seats.every(k => !isPinned(k) && colOfKey(k) < rightStart);
  });

  const unmetSeparate: [string, string][] = [];
  for (const [a, b] of rules.separate) {
    const seatsA = seatOf.get(a);
    const seatsB = seatOf.get(b);
    if (!seatsA || !seatsB) continue;
    const adjacent = seatsA.some(ka => (neighbours.get(ka) ?? []).some(n => seatsB.includes(n)));
    if (adjacent) unmetSeparate.push([a, b]);
  }

  let sameSeat = 0;
  if (rules.avoidSame) {
    for (const [k, v] of Object.entries(layout)) {
      if (v && v === before[k] && !isPinned(k)) sameSeat++;
    }
  }

  return {
    unmetFront,
    unmetBack,
    unmetLeft,
    unmetRight,
    unmetSeparate,
    sameSeat,
    satisfied:
      unmetFront.length === 0 &&
      unmetBack.length === 0 &&
      unmetLeft.length === 0 &&
      unmetRight.length === 0 &&
      unmetSeparate.length === 0 &&
      sameSeat === 0,
  };
}

const scoreOf = (report: SeatingReport): number =>
  10 *
    (report.unmetFront.length +
      report.unmetBack.length +
      report.unmetLeft.length +
      report.unmetRight.length +
      report.unmetSeparate.length) +
  3 * report.sameSeat;

const RESTARTS = 8;
const ITERATIONS = 1200;

/**
 * 配慮事項を考慮して席を決める。
 * 希望の席から埋めたうえで、違反が減る方向に席を交換していく（局所探索）。
 * どうしても満たせない条件は report で返し、呼び出し側が利用者に伝える。
 */
export function planSeating(
  board: Board,
  names: readonly string[],
  rulesInput: Partial<SeatingRules> = {}
): { board: Board; report: SeatingReport } {
  const rules = defaultRules(rulesInput);
  const neighbours = buildNeighbours(board);
  const before = board.layout;
  const movable = shuffleTargetKeys(board);
  const pool = subtractNames(names, pinnedNames(board));
  // 希望のある人ごとに「入ってよい席」の条件を作る。
  const zoneOf = new Map<string, (k: string) => boolean>();
  const backStart = board.rows - rules.backRows;
  const rightStart = board.cols - rules.sideCols;
  for (const n of rules.front) zoneOf.set(n, k => rowOfKey(k) < rules.frontRows);
  for (const n of rules.back) zoneOf.set(n, k => rowOfKey(k) >= backStart);
  for (const n of rules.left) {
    const rowRule = zoneOf.get(n);
    zoneOf.set(n, k => colOfKey(k) < rules.sideCols && (!rowRule || rowRule(k)));
  }
  for (const n of rules.right) {
    const rowRule = zoneOf.get(n);
    zoneOf.set(n, k => colOfKey(k) >= rightStart && (!rowRule || rowRule(k)));
  }

  const baseLayout: Record<string, string | null> = {};
  for (const k of allSeatKeys(board.rows, board.cols)) {
    baseLayout[k] = board.pinned.includes(k) ? board.layout[k] ?? null : null;
  }

  /** 希望のある人を希望の区画から埋め、残りを空いた席に配る。 */
  const seed = (): Record<string, string | null> => {
    const layout = { ...baseLayout };
    const free = new Set(shuffleArray(movable));
    const take = (candidates: string[]): string | undefined => {
      for (const k of candidates) if (free.has(k)) return k;
      return undefined;
    };
    const wants = shuffleArray(pool.filter(n => zoneOf.has(n)));
    const rest = shuffleArray(pool.filter(n => !zoneOf.has(n)));
    for (const name of wants) {
      const matches = zoneOf.get(name);
      const seat =
        (matches ? take(shuffleArray(movable.filter(matches))) : undefined) ??
        take(shuffleArray(movable));
      if (seat) {
        layout[seat] = name;
        free.delete(seat);
      }
    }
    for (const name of rest) {
      const seat = take(shuffleArray([...free]));
      if (seat) {
        layout[seat] = name;
        free.delete(seat);
      }
    }
    return layout;
  };

  const evaluate = (layout: Record<string, string | null>) =>
    inspect(board, layout, rules, neighbours, before);

  let best = seed();
  let bestReport = evaluate(best);
  let bestScore = scoreOf(bestReport);

  for (let restart = 0; restart < RESTARTS && bestScore > 0; restart++) {
    const layout = restart === 0 ? { ...best } : seed();
    let report = evaluate(layout);
    let score = scoreOf(report);

    for (let i = 0; i < ITERATIONS && score > 0; i++) {
      // 違反に関係している席を優先して動かす（やみくもな交換よりも早く収束する）
      const hot = hotSeats(layout, report, neighbours, board, rules);
      const a = hot.length ? hot[Math.floor(Math.random() * hot.length)] : pick(movable);
      const b = pick(movable);
      if (!a || !b || a === b) continue;
      const tmp = layout[a];
      layout[a] = layout[b];
      layout[b] = tmp;
      const nextReport = evaluate(layout);
      const nextScore = scoreOf(nextReport);
      if (nextScore <= score) {
        report = nextReport;
        score = nextScore;
      } else {
        const back = layout[a];
        layout[a] = layout[b];
        layout[b] = back;
      }
    }

    if (score < bestScore) {
      best = { ...layout };
      bestReport = report;
      bestScore = score;
    }
  }

  return { board: { ...board, layout: best }, report: bestReport };
}

const pick = <T,>(arr: readonly T[]): T | undefined =>
  arr.length ? arr[Math.floor(Math.random() * arr.length)] : undefined;

/** いま違反している（動かす価値がある）席。 */
function hotSeats(
  layout: Record<string, string | null>,
  report: SeatingReport,
  neighbours: Map<string, string[]>,
  board: Board,
  rules: SeatingRules
): string[] {
  const wanted = new Set<string>([
    ...report.unmetFront,
    ...report.unmetBack,
    ...report.unmetLeft,
    ...report.unmetRight,
    ...report.unmetSeparate.flat(),
  ]);
  const seats: string[] = [];
  for (const [k, v] of Object.entries(layout)) {
    if (!v || board.pinned.includes(k) || board.disabled.includes(k)) continue;
    if (wanted.has(v)) {
      seats.push(k);
      // 離す組は、相手の隣の席を空ける方向でも解消できる
      for (const n of neighbours.get(k) ?? []) if (layout[n]) seats.push(n);
    }
  }
  if (!seats.length && rules.avoidSame) {
    for (const [k, v] of Object.entries(layout)) {
      if (v && v === board.layout[k] && !board.pinned.includes(k)) seats.push(k);
    }
  }
  return seats;
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

/**
 * 席に通し番号を振る（有効な席だけを前から順に数える）。
 * くじ引きのように「番号で席を指定する」運用に使う。
 */
export function seatNumberMap(board: Board): Record<string, number> {
  const map: Record<string, number> = {};
  let n = 0;
  for (const k of allSeatKeys(board.rows, board.cols)) {
    if (board.disabled.includes(k)) continue;
    map[k] = ++n;
  }
  return map;
}
