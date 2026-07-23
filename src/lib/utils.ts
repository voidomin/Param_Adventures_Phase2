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