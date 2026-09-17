import ExcelJS from "exceljs";
import type { RawRow } from "./catalogue-import.ts";

/** Splits one CSV line, honouring quoted fields and "" escapes. */
export function splitCsvLine(line: string): string[] {
  const cells: string[] = [];
  let cell = "";
  let quoted = false;
  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    if (quoted) {
      if (char === '"') {
        if (line[i + 1] === '"') {
          cell += '"';
          i += 1;
        } else quoted = false;
      } else cell += char;
    } else if (char === '"') {
      quoted = true;
    } else if (char === ",") {
      cells.push(cell);
      cell = "";
    } else cell += char;
  }
  cells.push(cell);
  return cells;
}

export function parseCsv(text: string): RawRow[] {
  // Split on newlines that aren't inside quotes.
  const lines: string[] = [];
  let current = "";
  let quoted = false;
  for (const char of text.replace(/\r\n?/g, "\n")) {
    if (char === '"') quoted = !quoted;
    if (char === "\n" && !quoted) {
      lines.push(current);
      current = "";
    } else current += char;
  }
  if (current.trim() !== "") lines.push(current);
  if (lines.length === 0) return [];

  const header = splitCsvLine(lines[0]).map((h) => h.trim().toLowerCase().replace(/\s+/g, "_"));
  return lines
    .slice(1)
    .filter((line) => line.trim() !== "")
    .map((line) => {
      const cells = splitCsvLine(line);
      const row: RawRow = {};
      header.forEach((key, i) => {
        row[key] = cells[i]?.trim() ?? "";
      });
      return row;
    });
}

export async function parseXlsx(buffer: ArrayBuffer): Promise<RawRow[]> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);
  const sheet = workbook.worksheets[0];
  if (!sheet) return [];

  const header: string[] = [];
  sheet.getRow(1).eachCell((cell, col) => {
    header[col] = String(cell.value ?? "").trim().toLowerCase().replace(/\s+/g, "_");
  });

  const rows: RawRow[] = [];
  sheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;
    const item: RawRow = {};
    let hasValue = false;
    header.forEach((key, col) => {
      if (!key) return;
      const raw = row.getCell(col).value;
      const value =
        raw !== null && typeof raw === "object" && "result" in raw ? (raw as { result: unknown }).result : raw;
      if (value !== null && value !== undefined && value !== "") hasValue = true;
      item[key] = value as unknown;
    });
    if (hasValue) rows.push(item);
  });
  return rows;
}

export async function rowsFromUpload(file: File): Promise<RawRow[]> {
  const isCsv = file.name.toLowerCase().endsWith(".csv") || file.type === "text/csv";
  if (isCsv) return parseCsv(await file.text());
  return parseXlsx(await file.arrayBuffer());
}

export function toCsv(header: string[], rows: (string | number | null)[][]): string {
  const cell = (value: string | number | null) => {
    const text = value === null || value === undefined ? "" : String(value);
    return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
  };
  return [header.map(cell).join(","), ...rows.map((row) => row.map(cell).join(","))].join("\n");
}

export async function toXlsx(
  sheetName: string,
  header: string[],
  rows: (string | number | null)[][],
): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet(sheetName);
  sheet.addRow(header);
  sheet.getRow(1).font = { bold: true };
  rows.forEach((row) => sheet.addRow(row));
  sheet.columns.forEach((column) => {
    const widest = (column.values ?? []).reduce((w: number, v) => Math.max(w, String(v ?? "").length + 2), 12);
    column.width = Math.min(40, Math.max(12, widest));
  });
  return Buffer.from(await workbook.xlsx.writeBuffer());
}
