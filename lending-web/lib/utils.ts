import { clsx, type ClassValue } from "clsx";
import {
  endOfDay,
  format,
  startOfDay,
  subDays,
} from "date-fns";

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

export function formatMoney(n: number) {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);
}

export function parseRange(
  preset: "7d" | "30d" | "custom",
  customStart?: Date | null,
  customEnd?: Date | null
): { start: Date; end: Date } {
  const end = endOfDay(new Date());
  if (preset === "7d") {
    return { start: startOfDay(subDays(end, 6)), end };
  }
  if (preset === "30d") {
    return { start: startOfDay(subDays(end, 29)), end };
  }
  const start = customStart
    ? startOfDay(customStart)
    : startOfDay(subDays(end, 29));
  const e = customEnd ? endOfDay(customEnd) : end;
  return { start, end: e };
}

export function toISODate(d: Date) {
  return format(d, "yyyy-MM-dd");
}

export function exportKpiCsv(rows: Record<string, string | number>[]) {
  if (!rows.length) return;
  const keys = Object.keys(rows[0]);
  const esc = (v: string | number) => {
    const s = String(v);
    if (s.includes(",") || s.includes('"')) {
      return `"${s.replace(/"/g, '""')}"`;
    }
    return s;
  };
  const header = keys.join(",");
  const body = rows.map((r) => keys.map((k) => esc(r[k] ?? "")).join(","));
  const csv = [header, ...body].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `lending-kpi-${format(new Date(), "yyyy-MM-dd")}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
