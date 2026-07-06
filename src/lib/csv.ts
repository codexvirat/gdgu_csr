import "server-only";

/** Minimal CSV parser: handles quoted fields and escaped quotes ("") but not multi-line cells.
 * Sufficient for the simple, controlled participant-import template — not a general-purpose CSV library. */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  const lines = text.replace(/\r\n/g, "\n").split("\n");

  for (const line of lines) {
    if (line.trim() === "") continue;
    const cells: string[] = [];
    let current = "";
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (inQuotes) {
        if (char === '"' && line[i + 1] === '"') {
          current += '"';
          i++;
        } else if (char === '"') {
          inQuotes = false;
        } else {
          current += char;
        }
      } else if (char === '"') {
        inQuotes = true;
      } else if (char === ",") {
        cells.push(current.trim());
        current = "";
      } else {
        current += char;
      }
    }
    cells.push(current.trim());
    rows.push(cells);
  }

  return rows;
}
