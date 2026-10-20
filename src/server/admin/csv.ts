/** CSV with formula-injection protection (cells starting with = + - @ are prefixed so spreadsheets never execute them). */
export function csvCell(value: unknown): string {
  if (value === null || value === undefined) return ""
  let s = value instanceof Date ? value.toISOString() : String(value)
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

export function toCsv(headers: string[], rows: unknown[][]): string {
  return "﻿" + [headers, ...rows].map((r) => r.map(csvCell).join(",")).join("\r\n") + "\r\n"
}
