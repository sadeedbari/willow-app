export type Column<T> = { header: string; value: (row: T) => unknown };

// A cell that starts with = + - @ is read as a formula by Excel and Sheets, and
// client names, messages and notes are typed by other people. Prefixing a
// quote makes it plain text; things that are really numbers or phone numbers
// ("+1 416 555 0100", "-12.50") are left alone.
const FORMULA_START = /^[=+\-@\t\r]/;
const NUMBER_OR_PHONE = /^[+-]?[\d\s().,-]+$/;

function cell(value: unknown): string {
  if (value === null || value === undefined) return "";
  let text = typeof value === "string" ? value : String(value);
  if (typeof value === "string" && FORMULA_START.test(text) && !NUMBER_OR_PHONE.test(text)) {
    text = `'${text}`;
  }
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

// The leading BOM makes Excel open the file as UTF-8, so accented names and
// curly quotes in notes don't turn into garbage.
export function toCsv<T>(rows: T[], columns: Column<T>[]): string {
  const lines = [columns.map((c) => cell(c.header)).join(",")];
  for (const row of rows) {
    lines.push(columns.map((c) => cell(c.value(row))).join(","));
  }
  return "﻿" + lines.join("\r\n") + "\r\n";
}

export function dollars(cents: number | null | undefined): string {
  return cents === null || cents === undefined ? "" : (cents / 100).toFixed(2);
}
