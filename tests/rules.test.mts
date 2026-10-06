import { strict as assert } from "node:assert";
import { test } from "node:test";
import {
  buildNeighbours,
  emptyBoard,
  normalizeBoard,
  planSeating,
  seatKey,
  seatNumberMap,
} from "../src/lib/seating.ts";
import type { Board } from "../src/lib/types.ts";

const board = (over: Partial<Board> = {}, rows = 4, cols = 4): Board =>
  normalizeBoard({ ...emptyBoard(rows, cols), ...over });

const seatsOf = (layout: Record<string, string | null>, name: string) =>
  Object.entries(layout)
    .filter(([, v]) => v === name)
    .map(([k]) => k);

const rowOf = (key: string) => Number(/^r(\d+)/.exec(key)![1]);

test("隣の判定は上下左右のみで、斜めは隣としない", () => {
  const n = buildNeighbours(board({}, 3, 3));
  assert.deepEqual([...(n.get(seatKey(1, 1)) ?? [])].sort(), ["r0-c1", "r1-c0", "r1-c2", "r2-c1"]);
});

test("通路を挟んだ席は隣としない", () => {
  const n = buildNeighbours(board({ aisleCols: [1] }, 2, 3));
  // 0列目と1列目の間に通路 → r0-c0 の隣は右側（r0-c1）ではなくなる
  assert.deepEqual([...(n.get("r0-c0") ?? [])].sort(), ["r1-c0"]);
  assert.ok(!(n.get("r0-c1") ?? []).includes("r0-c0"));
  assert.ok((n.get("r0-c1") ?? []).includes("r0-c2"));
});

test("前方希望の人は前方の列に入る", () => {
  const names = Array.from({ length: 12 }, (_, i) => `生徒${i + 1}`);
  for (let i = 0; i < 10; i++) {
    const { board: next, report } = planSeating(board(), names, {
      front: ["生徒9", "生徒12"],
      frontRows: 2,
    });
    assert.deepEqual(report.unmetFront, [], "前方に置けなかった人がいる");
    for (const name of ["生徒9", "生徒12"]) {
      const seats = seatsOf(next.layout, name);
      assert.equal(seats.length, 1);
      assert.ok(rowOf(seats[0]) < 2, `${name} が前方にいない: ${seats[0]}`);
    }
  }
});

test("後方希望の人は後方の列に入る", () => {
  const names = Array.from({ length: 10 }, (_, i) => `生徒${i + 1}`);
  const { board: next, report } = planSeating(board(), names, {
    back: ["生徒1"],
    backRows: 2,
  });
  assert.deepEqual(report.unmetBack, []);
  const seat = seatsOf(next.layout, "生徒1")[0];
  assert.ok(rowOf(seat) >= 4 - 2, `後方にいない: ${seat}`);
});

test("前方希望と後方希望が同時にあっても両方満たす", () => {
  const names = Array.from({ length: 14 }, (_, i) => `生徒${i + 1}`);
  const { report } = planSeating(board(), names, {
    front: ["生徒1", "生徒2"],
    back: ["生徒13", "生徒14"],
  });
  assert.deepEqual(report.unmetFront, []);
  assert.deepEqual(report.unmetBack, []);
});

test("離す組は隣・前後にならない", () => {
  const names = Array.from({ length: 12 }, (_, i) => `生徒${i + 1}`);
  const pairs: [string, string][] = [
    ["生徒1", "生徒2"],
    ["生徒3", "生徒4"],
  ];
  for (let i = 0; i < 10; i++) {
    const { board: next, report } = planSeating(board(), names, { separate: pairs });
    assert.deepEqual(report.unmetSeparate, [], "離しきれていない組がある");
    const n = buildNeighbours(next);
    for (const [a, b] of pairs) {
      const ka = seatsOf(next.layout, a)[0];
      const kb = seatsOf(next.layout, b)[0];
      assert.ok(!(n.get(ka) ?? []).includes(kb), `${a} と ${b} が隣接している`);
    }
  }
});

test("全員がちょうど1席に座り、固定席は動かない", () => {
  const pinned = seatKey(3, 3);
  const base = board({ layout: { [pinned]: "固定さん" }, pinned: [pinned] });
  const names = ["固定さん", ...Array.from({ length: 11 }, (_, i) => `生徒${i + 1}`)];
  const { board: next } = planSeating(base, names, {
    front: ["生徒1"],
    separate: [["生徒2", "生徒3"]],
    avoidSame: true,
  });
  assert.equal(next.layout[pinned], "固定さん");
  const seated = Object.values(next.layout).filter(Boolean);
  assert.equal(seated.length, names.length);
  assert.deepEqual([...seated].sort(), [...names].sort());
});

test("満たせない条件は黙って捨てずに report で返す", () => {
  // 前方 2 行 = 4 席しかないのに 6 人が前方希望
  const names = Array.from({ length: 16 }, (_, i) => `生徒${i + 1}`);
  const front = names.slice(0, 6);
  const { report } = planSeating(board(), names, { front, frontRows: 1 });
  assert.ok(report.unmetFront.length > 0, "満たせない希望が報告されていない");
  assert.equal(report.satisfied, false);
  // 報告されるのは前方希望の人だけ
  for (const name of report.unmetFront) assert.ok(front.includes(name));
});

test("配慮事項が無ければ、ただのランダム配置として全員座る", () => {
  const names = Array.from({ length: 16 }, (_, i) => `生徒${i + 1}`);
  const { board: next, report } = planSeating(board(), names);
  assert.equal(report.satisfied, true);
  assert.equal(Object.values(next.layout).filter(Boolean).length, 16);
});

test("前と同じ席を避ける条件も配慮事項と同時に効く", () => {
  const names = Array.from({ length: 14 }, (_, i) => `生徒${i + 1}`);
  let current = planSeating(board(), names, { front: ["生徒1"] }).board;
  for (let i = 0; i < 10; i++) {
    const { board: next, report } = planSeating(current, names, {
      front: ["生徒1"],
      avoidSame: true,
    });
    assert.equal(report.sameSeat, 0, "前と同じ席の人が残っている");
    assert.deepEqual(report.unmetFront, [], "前方希望が崩れている");
    current = next;
  }
});

test("通路があると離す条件を満たしやすい（通路越しは隣でない）", () => {
  // 2×2 の 4 席、中央に縦の通路 → 横並びは隣ではない
  const small = board({ aisleCols: [1] }, 2, 2);
  const { report } = planSeating(small, ["A", "B", "C", "D"], {
    separate: [["A", "B"]],
  });
  assert.deepEqual(report.unmetSeparate, []);
});

test("左側・右側の希望も満たす（窓側・廊下側の指定に使う）", () => {
  const names = Array.from({ length: 12 }, (_, i) => `生徒${i + 1}`);
  const colOf = (key: string) => Number(/c(\d+)$/.exec(key)![1]);
  for (let i = 0; i < 10; i++) {
    const { board: next, report } = planSeating(board(), names, {
      left: ["生徒1"],
      right: ["生徒2"],
      sideCols: 1,
    });
    assert.deepEqual(report.unmetLeft, []);
    assert.deepEqual(report.unmetRight, []);
    assert.equal(colOf(seatsOf(next.layout, "生徒1")[0]), 0);
    assert.equal(colOf(seatsOf(next.layout, "生徒2")[0]), 3);
  }
});

test("前方かつ左側の希望は、両方を満たす席に入る", () => {
  const names = Array.from({ length: 10 }, (_, i) => `生徒${i + 1}`);
  const { board: next, report } = planSeating(board(), names, {
    front: ["生徒5"],
    left: ["生徒5"],
    frontRows: 2,
    sideCols: 2,
  });
  assert.deepEqual(report.unmetFront, []);
  assert.deepEqual(report.unmetLeft, []);
  const seat = seatsOf(next.layout, "生徒5")[0];
  assert.ok(rowOf(seat) < 2 && Number(/c(\d+)$/.exec(seat)![1]) < 2, `席が希望外: ${seat}`);
});

test("席の通し番号は有効な席だけに前から振られる", () => {
  const withGap = board({ disabled: ["r0-c1"] }, 2, 3);
  const numbers = seatNumberMap(withGap);
  assert.equal(numbers["r0-c0"], 1);
  assert.equal(numbers["r0-c1"], undefined);
  assert.equal(numbers["r0-c2"], 2);
  assert.equal(numbers["r1-c0"], 3);
  assert.equal(numbers["r1-c2"], 5);
});
