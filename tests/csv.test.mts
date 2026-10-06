import { strict as assert } from "node:assert";
import { test } from "node:test";
import { extractNames, extractStudents, parseDelimited, toCsv } from "../src/lib/csv.ts";

test("toCsv adds a BOM so Excel reads Japanese correctly", () => {
  const csv = toCsv([["名前"], ["佐藤 健"]]);
  assert.equal(csv.charCodeAt(0), 0xfeff);
  assert.ok(csv.includes("佐藤 健"));
});

test("toCsv quotes cells containing commas, quotes or newlines", () => {
  const csv = toCsv([["a,b", 'say "hi"', "line1\nline2"]]);
  assert.ok(csv.includes('"a,b"'));
  assert.ok(csv.includes('"say ""hi"""'));
  assert.ok(csv.includes('"line1\nline2"'));
});

test("parseDelimited reads quoted cells and skips blank rows", () => {
  const rows = parseDelimited('番号,名前\r\n1,"佐藤, 健"\r\n\r\n2,鈴木 一郎\r\n');
  assert.deepEqual(rows, [
    ["番号", "名前"],
    ["1", "佐藤, 健"],
    ["2", "鈴木 一郎"],
  ]);
});

test("parseDelimited detects tab-separated text (Excel copy & paste)", () => {
  const rows = parseDelimited("1\t佐藤 健\n2\t鈴木 一郎");
  assert.deepEqual(rows, [
    ["1", "佐藤 健"],
    ["2", "鈴木 一郎"],
  ]);
});

test("extractNames reads a plain one-name-per-line list", () => {
  assert.deepEqual(extractNames(parseDelimited("佐藤 健\n鈴木 一郎")), ["佐藤 健", "鈴木 一郎"]);
});

test("extractNames uses the 名前 column when a header row exists", () => {
  const rows = parseDelimited("クラス,番号,氏名\n1A,1,佐藤 健\n1A,2,鈴木 一郎");
  assert.deepEqual(extractNames(rows), ["佐藤 健", "鈴木 一郎"]);
});

test("extractNames skips a leading attendance-number column", () => {
  assert.deepEqual(extractNames(parseDelimited("1,佐藤 健\n2,鈴木 一郎")), ["佐藤 健", "鈴木 一郎"]);
});

test("extractNames keeps names that merely look numeric-adjacent", () => {
  // 1 列目が数字でなければ、そのまま名前として扱う。
  assert.deepEqual(extractNames(parseDelimited("佐藤 健,1組\n鈴木 一郎,2組")), [
    "佐藤 健",
    "鈴木 一郎",
  ]);
});

test("extractNames returns nothing for an empty file", () => {
  assert.deepEqual(extractNames(parseDelimited("")), []);
  assert.deepEqual(extractNames(parseDelimited("\n\n")), []);
});

test("extractStudents reads 番号・氏名・ふりがな・性別 columns", () => {
  const rows = parseDelimited(
    "番号,氏名,ふりがな,性別\n1,佐藤 健,さとう けん,男\n2,高橋 美咲,たかはし みさき,女"
  );
  assert.deepEqual(extractStudents(rows), [
    { name: "佐藤 健", no: 1, kana: "さとう けん", gender: "m" },
    { name: "高橋 美咲", no: 2, kana: "たかはし みさき", gender: "f" },
  ]);
});

test("extractStudents understands 学籍番号 and full-width digits", () => {
  const rows = parseDelimited("学籍番号,学生名\n１０,鈴木 一郎\n11,渡辺 翔");
  const students = extractStudents(rows);
  assert.equal(students[0].no, 10);
  assert.equal(students[1].no, 11);
  assert.equal(students[0].name, "鈴木 一郎");
});

test("extractStudents leaves gender undefined when the value is unknown", () => {
  const rows = parseDelimited("氏名,性別\n佐藤 健,未回答");
  assert.deepEqual(extractStudents(rows), [{ name: "佐藤 健", gender: undefined }]);
});

test("extractStudents falls back to a plain name list without a header", () => {
  assert.deepEqual(extractStudents(parseDelimited("佐藤 健\n鈴木 一郎")), [
    { name: "佐藤 健" },
    { name: "鈴木 一郎" },
  ]);
});
