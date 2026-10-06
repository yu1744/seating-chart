/** Excel で開いても文字化けしないように BOM 付き UTF-8 で書き出す。 */
const BOM = "﻿";

const needsQuote = (v: string) => /[",\r\n]/.test(v);
const escapeCell = (v: string) => (needsQuote(v) ? `"${v.replace(/"/g, '""')}"` : v);

export const toCsv = (rows: (string | number)[][]): string =>
  BOM + rows.map(r => r.map(c => escapeCell(String(c ?? ""))).join(",")).join("\r\n");

/** カンマ／タブ区切りの表を解釈する（引用符・改行を含むセルにも対応）。 */
export function parseDelimited(text: string): string[][] {
  const src = text.replace(/^﻿/, "");
  const delimiter = pickDelimiter(src);
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;

  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (quoted) {
      if (ch === '"') {
        if (src[i + 1] === '"') {
          cell += '"';
          i++;
        } else quoted = false;
      } else cell += ch;
      continue;
    }
    if (ch === '"') {
      quoted = true;
    } else if (ch === delimiter) {
      row.push(cell);
      cell = "";
    } else if (ch === "\n") {
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else if (ch !== "\r") {
      cell += ch;
    }
  }
  row.push(cell);
  rows.push(row);
  return rows.map(r => r.map(c => c.trim())).filter(r => r.some(c => c.length > 0));
}

function pickDelimiter(text: string): string {
  const head = text.split(/\r?\n/).slice(0, 5).join("\n");
  const tabs = (head.match(/\t/g) ?? []).length;
  const commas = (head.match(/,/g) ?? []).length;
  return tabs > commas ? "\t" : ",";
}

const NAME_HEADER = /^(名前|氏名|生徒名|name|student)/i;
const NUMBER_HEADER = /^(番号|出席番号|no\.?|id|#)/i;

/**
 * 表から名前の列だけを取り出す。
 * ヘッダー行の「名前」「氏名」、なければ「番号+名前」の 2 列構成を推測する。
 */
export function extractNames(rows: string[][]): string[] {
  if (!rows.length) return [];
  const [first, ...rest] = rows;
  const headerIndex = first.findIndex(c => NAME_HEADER.test(c));
  if (headerIndex >= 0) {
    return rest.map(r => (r[headerIndex] ?? "").trim()).filter(Boolean);
  }
  const hasHeader = first.some(c => NUMBER_HEADER.test(c));
  const body = hasHeader ? rest : rows;
  const width = Math.max(...body.map(r => r.length), 0);
  // 1 列目がすべて数値なら、出席番号列と見なして 2 列目を名前として扱う。
  let column = 0;
  if (width > 1) {
    const firstColNumeric = body.every(r => /^\d+$/.test((r[0] ?? "").trim()));
    if (firstColNumeric) column = 1;
  }
  return body.map(r => (r[column] ?? "").trim()).filter(Boolean);
}

export function downloadTextFile(filename: string, content: string, type = "text/csv;charset=utf-8") {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export const fileStamp = () => {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}`;
};
