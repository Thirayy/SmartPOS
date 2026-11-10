const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;
const HAS_TIMEZONE = /(?:z|[+-]\d{2}:?\d{2})$/i;

/**
 * Backend mengirim datetime tanpa zona waktu (UTC). `new Date()` akan
 * menganggapnya waktu lokal, sehingga jam bergeser. Tambahkan "Z" bila string
 * belum punya zona waktu, lalu format sesuai zona waktu perangkat pengguna.
 */
export function parseApiDateTime(value: string | null | undefined): Date | null {
  if (!value) return null;

  const trimmed = value.trim();
  if (!trimmed) return null;

  const normalized = DATE_ONLY.test(trimmed) || HAS_TIMEZONE.test(trimmed)
    ? trimmed
    : `${trimmed}Z`;

  const date = new Date(normalized);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function formatDateTime(value: string | null | undefined): string {
  const date = parseApiDateTime(value);
  if (!date) return value?.trim() ? value : "—";

  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function formatTime(value: string | null | undefined): string {
  const date = parseApiDateTime(value);
  if (!date) return "—";

  return new Intl.DateTimeFormat("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}
