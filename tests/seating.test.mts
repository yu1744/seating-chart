import { strict as assert } from "node:assert";
import { test } from "node:test";
import {
  assignRandomly,
  clampDim,
  duplicateNames,
  emptyBoard,
  normalizeBoard,
  parseNames,
  seatKey,
  shuffleArray,
  subtractNames,
  vacantSeatKeys,
} from "../src/lib/seating.ts";
import type { Board } from "../src/lib/types.ts";

const boardWith = (over: Partial<Board>): Board => normalizeBoard({ ...emptyBoard(3, 3), ...over });

test("clampDim keeps the grid within 1〜12", () => {
  assert.equal(clampDim(0), 1);
  assert.equal(clampDim(99), 12);
  assert.equal(clampDim(7.4), 7);
  assert.equal(clampDim(Number.NaN), 6);
});

test("normalizeBoard drops entries left outside the grid after shrinking", () => {
  const board = normalizeBoard({
    rows: 2,
    cols: 2,
    layout: { "r0-c0": "あ", "r5-c5": "はみ出し" },
    disabled: ["r1-c1", "r9-c9"],
    pinned: ["r9-c9"],
  });
  assert.deepEqual(Object.keys(board.layout).sort(), ["r0-c0", "r0-c1", "r1-c0", "r1-c1"]);
  assert.equal(board.layout["r0-c0"], "あ");
  assert.deepEqual(board.disabled, ["r1-c1"]);
  assert.deepEqual(board.pinned, []);
});

test("normalizeBoard clears anyone sitting on a disabled seat", () => {
  const board = boardWith({ layout: { "r0-c0": "通路の人" }, disabled: ["r0-c0"] });
  assert.equal(board.layout["r0-c0"], null);
});

test("normalizeBoard refuses to pin an empty seat", () => {
  const board = boardWith({ pinned: ["r0-c0"] });
  assert.deepEqual(board.pinned, []);
});

test("parseNames treats one line as one person, even with spaces in the name", () => {
  assert.deepEqual(parseNames(" 佐藤 健 \n\n鈴木 一郎\r\n"), ["佐藤 健", "鈴木 一郎"]);
  assert.deepEqual(parseNames("   "), []);
});

test("subtractNames works as a multiset difference for identical names", () => {
  assert.deepEqual(subtractNames(["A", "A", "B"], ["A"]), ["A", "B"]);
  assert.deepEqual(subtractNames(["A", "B"], ["C"]), ["A", "B"]);
  assert.deepEqual(subtractNames(["A", "A"], ["A", "A"]), []);
});

test("duplicateNames reports only names appearing twice or more", () => {
  assert.deepEqual(duplicateNames(["A", "B", "A", "C", "C"]), ["A", "C"]);
  assert.deepEqual(duplicateNames(["A", "B"]), []);
});

test("shuffleArray returns a permutation and leaves the input untouched", () => {
  const input = Array.from({ length: 50 }, (_, i) => i);
  const frozen = [...input];
  const out = shuffleArray(input);
  assert.deepEqual(input, frozen);
  assert.deepEqual([...out].sort((a, b) => a - b), frozen);
});

test("shuffleArray does not keep returning the same order", () => {
  const input = Array.from({ length: 10 }, (_, i) => i);
  const seen = new Set(Array.from({ length: 40 }, () => shuffleArray(input).join(",")));
  assert.ok(seen.size > 20, `並びが偏っています: ${seen.size} 種類`);
});

test("assignRandomly seats everyone exactly once, skipping disabled seats", () => {
  const names = ["A", "B", "C", "D"];
  const board = assignRandomly(boardWith({ disabled: ["r2-c2"] }), names);
  const seated = Object.entries(board.layout).filter(([, v]) => v);
  assert.equal(seated.length, names.length);
  assert.deepEqual(seated.map(([, v]) => v).sort(), [...names].sort());
  assert.equal(board.layout["r2-c2"], null);
});

test("assignRandomly keeps pinned people in their seats and shuffles the rest", () => {
  const pinnedKey = seatKey(0, 0);
  const base = boardWith({ layout: { [pinnedKey]: "固定さん" }, pinned: [pinnedKey] });
  assert.deepEqual(base.pinned, [pinnedKey]);

  const names = ["固定さん", "A", "B", "C"];
  for (let i = 0; i < 20; i++) {
    const next = assignRandomly(base, names);
    assert.equal(next.layout[pinnedKey], "固定さん");
    const seated = Object.values(next.layout).filter(Boolean);
    assert.equal(seated.length, names.length, "全員がちょうど 1 席ずつ座る");
    assert.deepEqual([...seated].sort(), [...names].sort());
  }
});

test("assignRandomly places nobody twice when a name is duplicated", () => {
  const names = ["同 姓同名", "同 姓同名", "B"];
  const board = assignRandomly(boardWith({}), names);
  const seated = Object.values(board.layout).filter(Boolean);
  assert.equal(seated.length, 3);
  assert.equal(seated.filter(n => n === "同 姓同名").length, 2);
});

test("assignRandomly spreads people around rather than always filling the same seats", () => {
  const board = boardWith({});
  const hits = new Map<string, number>();
  for (let i = 0; i < 200; i++) {
    const next = assignRandomly(board, ["A"]);
    const key = Object.entries(next.layout).find(([, v]) => v === "A")?.[0] ?? "";
    hits.set(key, (hits.get(key) ?? 0) + 1);
  }
  assert.ok(hits.size >= 8, `9 席のうち ${hits.size} 席にしか座っていません`);
});

test("avoidSame keeps nobody in the seat they already had", () => {
  const names = ["A", "B", "C", "D", "E", "F", "G", "H", "I"];
  let board = assignRandomly(boardWith({}), names);
  for (let i = 0; i < 30; i++) {
    const before = board;
    board = assignRandomly(before, names, { avoidSame: true });
    const stuck = Object.entries(board.layout).filter(
      ([k, v]) => v && v === before.layout[k]
    );
    assert.deepEqual(stuck, [], `同じ席に残った人がいます: ${JSON.stringify(stuck)}`);
    assert.deepEqual(Object.values(board.layout).filter(Boolean).sort(), [...names].sort());
  }
});

test("avoidSame still seats everyone when a full swap is impossible", () => {
  // 1 人 1 席では避けようがない。落ちずに、人を失わないことだけを保証する。
  const single = normalizeBoard({ ...emptyBoard(1, 1), layout: { "r0-c0": "A" } });
  const next = assignRandomly(single, ["A"], { avoidSame: true });
  assert.equal(next.layout["r0-c0"], "A");
});

test("avoidSame leaves pinned people alone even though they keep their seat", () => {
  const pinned = seatKey(1, 1);
  const base = normalizeBoard({
    ...emptyBoard(3, 3),
    layout: { [pinned]: "固定さん", "r0-c0": "A", "r0-c1": "B" },
    pinned: [pinned],
  });
  const names = ["固定さん", "A", "B"];
  const next = assignRandomly(base, names, { avoidSame: true });
  assert.equal(next.layout[pinned], "固定さん");
  assert.deepEqual(Object.values(next.layout).filter(Boolean).sort(), [...names].sort());
});

test("vacantSeatKeys lists only seats that are empty and enabled", () => {
  const board = boardWith({ layout: { "r0-c0": "A" }, disabled: ["r0-c1"] });
  const vacant = vacantSeatKeys(board);
  assert.ok(!vacant.includes("r0-c0"));
  assert.ok(!vacant.includes("r0-c1"));
  assert.equal(vacant.length, 7);
});
