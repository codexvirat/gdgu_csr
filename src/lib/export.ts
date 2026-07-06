import "server-only";
import ExcelJS from "exceljs";

function csvCell(value: unknown) {
  const str = value === null || value === undefined ? "" : String(value);
  return /[",\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
}

export function toCsv(headers: string[], rows: unknown[][]) {
  const lines = [headers.map(csvCell).join(","), ...rows.map((row) => row.map(csvCell).join(","))];
  return lines.join("\n");
}

export type XlsxImage = { row: number; col: number; buffer: Buffer; extension: "jpeg" | "png" };

/** `textColumnIndexes` marks columns (e.g. Aadhaar, mobile) that must stay text — otherwise Excel renders long
 * digit-only values in scientific notation and strips them back to a number when the user types into the column.
 * `images` embeds a picture anchored at a given data row/column (both 0-indexed, relative to `rows`). */
export async function toXlsxBuffer(
  sheetName: string,
  headers: string[],
  rows: unknown[][],
  textColumnIndexes: number[] = [],
  images: XlsxImage[] = []
) {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet(sheetName);
  sheet.addRow(headers).font = { bold: true };
  for (const row of rows) sheet.addRow(row.map((cell, i) => (textColumnIndexes.includes(i) && cell !== null && cell !== undefined ? String(cell) : cell)));
  sheet.columns.forEach((col, i) => {
    col.width = 18;
    if (textColumnIndexes.includes(i)) col.numFmt = "@";
  });
  for (const image of images) {
    sheet.getRow(image.row + 2).height = 60;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- exceljs's bundled Buffer type predates Node's newer generic Buffer<ArrayBufferLike>
    const imageId = workbook.addImage({ buffer: image.buffer as any, extension: image.extension });
    sheet.addImage(imageId, { tl: { col: image.col, row: image.row + 1 }, ext: { width: 60, height: 60 } });
  }
  return Buffer.from(await workbook.xlsx.writeBuffer());
}

/** Reads the first worksheet of an uploaded .xlsx file into plain string rows (including the header row). */
export async function readXlsxRows(buffer: Buffer): Promise<string[][]> {
  const workbook = new ExcelJS.Workbook();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- exceljs's bundled Buffer type predates Node's newer generic Buffer<ArrayBufferLike>
  await workbook.xlsx.load(buffer as any);
  const sheet = workbook.worksheets[0];
  if (!sheet) return [];

  const rows: string[][] = [];
  sheet.eachRow((row) => {
    const cells: string[] = [];
    row.eachCell({ includeEmpty: true }, (cell) => {
      cells.push(cell.value === null || cell.value === undefined ? "" : String(cell.value).trim());
    });
    rows.push(cells);
  });
  return rows;
}
