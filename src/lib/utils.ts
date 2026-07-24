import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Formats an arbitrary cell value (from an export row) as a display string,
 * without producing a meaningless "[object Object]" for non-primitive values.
 */
export function formatCellForExport(value: unknown, options?: { includeTime?: boolean }): string {
  if (value === null || value === undefined) {
    return "";
  }
  if (value instanceof Date) {
    return options?.includeTime
      ? value.toISOString().replace("T", " ").substring(0, 19)
      : value.toISOString().split("T")[0];
  }
  if (typeof value === "object") {
    return JSON.stringify(value);
  }
  const primitive = value as string | number | boolean | bigint | symbol;
  return String(primitive);
}

/**
 * Builds an auto-fit-width Excel worksheet from row objects and downloads it.
 * Column widths are sized from the longest formatted cell in each column.
 */
export async function exportRowsToExcel(
  rows: Record<string, unknown>[],
  sheetName: string,
  filename: string,
): Promise<void> {
  const XLSX = await import("xlsx");
  const worksheet = XLSX.utils.json_to_sheet(rows, { cellDates: true, dateNF: "yyyy-mm-dd" });
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);

  const maxLens = Object.keys(rows[0]).reduce((acc, key) => {
    acc[key] = key.length;
    return acc;
  }, {} as Record<string, number>);

  rows.forEach((row) => {
    Object.keys(row).forEach((key) => {
      const valStr = formatCellForExport(row[key]);
      if (valStr.length > maxLens[key]) {
        maxLens[key] = valStr.length;
      }
    });
  });

  worksheet["!cols"] = Object.keys(maxLens).map((key) => ({
    wch: Math.max(maxLens[key] + 3, 10),
  }));

  XLSX.writeFile(workbook, filename);
}

export function calculateAge(dob: string | Date): number {
  const birthDate = new Date(dob);
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const m = today.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
}