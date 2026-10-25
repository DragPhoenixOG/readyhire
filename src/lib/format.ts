import { APP_TIMEZONE } from "@/lib/constants";

const DAY_MS = 24 * 60 * 60 * 1000;

const dateFmt = new Intl.DateTimeFormat("en-IN", {
  timeZone: APP_TIMEZONE,
  day: "numeric",
  month: "short",
  year: "numeric",
});

const dateTimeFmt = new Intl.DateTimeFormat("en-IN", {
  timeZone: APP_TIMEZONE,
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
});

// en-CA formats as YYYY-MM-DD, which is what <input type="date"> expects.
const isoDateFmt = new Intl.DateTimeFormat("en-CA", {
  timeZone: APP_TIMEZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

export function formatDate(value: Date | null | undefined) {
  return value ? dateFmt.format(value) : "—";
}

export function formatDateTime(value: Date | null | undefined) {
  return value ? `${dateTimeFmt.format(value)} IST` : "—";
}

export function toDateInputValue(value: Date | null | undefined) {
  return value ? isoDateFmt.format(value) : "";
}

/** Parses a YYYY-MM-DD form value as a calendar day in IST. */
export function parseDateInput(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const date = new Date(`${value}T00:00:00+05:30`);
  return Number.isNaN(date.getTime()) ? null : date;
}

/** Parses a YYYY-MM-DDTHH:mm form value as IST wall-clock time. */
export function parseDateTimeInput(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) return null;
  const date = new Date(`${value}:00+05:30`);
  return Number.isNaN(date.getTime()) ? null : date;
}

/** Whole calendar days from today (IST) until the given day; negative when in the past. */
export function daysFromToday(value: Date, now = new Date()) {
  const target = parseDateInput(toDateInputValue(value))!;
  const today = parseDateInput(toDateInputValue(now))!;
  return Math.round((target.getTime() - today.getTime()) / DAY_MS);
}

export function addDays(value: Date, days: number) {
  return new Date(value.getTime() + days * DAY_MS);
}

export function hoursSince(value: Date, now = new Date()) {
  return (now.getTime() - value.getTime()) / (60 * 60 * 1000);
}

export function timeAgo(value: Date, now = new Date()) {
  const minutes = Math.round((now.getTime() - value.getTime()) / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days}d ago`;
  return formatDate(value);
}

export function formatHours(hours: number) {
  if (hours < 1) return `${Math.max(1, Math.round(hours * 60))} min`;
  if (hours < 48) return `${Math.round(hours)} h`;
  const total = Math.round(hours);
  const days = Math.floor(total / 24);
  const rest = total % 24;
  return rest ? `${days} d ${rest} h` : `${days} days`;
}

export function formatLpa(value: number | null | undefined) {
  if (value == null) return null;
  return `₹${Number.isInteger(value) ? value : value.toFixed(1)} LPA`;
}

export function formatCtcRange(min: number | null | undefined, max: number | null | undefined) {
  if (min == null && max == null) return "Not disclosed";
  if (min != null && max != null) return `₹${min}–${max} LPA`;
  return formatLpa(min ?? max);
}

export function splitList(value: string | null | undefined) {
  return (value ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

export function pluralize(count: number, singular: string, plural = `${singular}s`) {
  return `${count} ${count === 1 ? singular : plural}`;
}

export function percent(numerator: number, denominator: number) {
  if (denominator === 0) return "—";
  return `${Math.round((numerator / denominator) * 100)}%`;
}
