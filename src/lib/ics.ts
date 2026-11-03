/**
 * A single-event iCalendar file (RFC 5545) that Outlook, Google Calendar and Apple Calendar can import. Carries only
 * what's safe to leave in a third-party calendar: the round, role, company, time, place and a link back to Readyhire
 * (docs/architecture/hiring-coordination.md, rule R4).
 */
export type CalendarEvent = {
  uid: string;
  start: Date;
  durationMins: number;
  summary: string;
  location?: string | null;
  description: string;
  url: string;
  cancelled?: boolean;
  /** Bumped on every change so calendars replace their copy. */
  sequence?: number;
};

const stamp = (d: Date) =>
  d
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}/, "");

/** Escapes TEXT values: backslash, semicolon, comma and newlines. */
const text = (value: string) =>
  value.replace(/\\/g, "\\\\").replace(/;/g, "\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");

/** Folds lines longer than 75 octets, continuing them with a leading space. */
function fold(line: string) {
  const bytes = Buffer.from(line, "utf8");
  if (bytes.length <= 75) return line;
  const parts: string[] = [];
  let start = 0;
  while (start < bytes.length) {
    let end = Math.min(start + (parts.length ? 74 : 75), bytes.length);
    // Never split a multi-byte character.
    while (end < bytes.length && (bytes[end] & 0xc0) === 0x80) end -= 1;
    parts.push(bytes.subarray(start, end).toString("utf8"));
    start = end;
  }
  return parts.join("\r\n ");
}

export function buildIcs(event: CalendarEvent, now = new Date()) {
  const end = new Date(event.start.getTime() + event.durationMins * 60 * 1000);
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Readyhire//Interviews//EN",
    "CALSCALE:GREGORIAN",
    `METHOD:${event.cancelled ? "CANCEL" : "PUBLISH"}`,
    "BEGIN:VEVENT",
    `UID:${event.uid}`,
    `SEQUENCE:${event.sequence ?? 0}`,
    `DTSTAMP:${stamp(now)}`,
    `DTSTART:${stamp(event.start)}`,
    `DTEND:${stamp(end)}`,
    `SUMMARY:${text(event.summary)}`,
    ...(event.location ? [`LOCATION:${text(event.location)}`] : []),
    `DESCRIPTION:${text(`${event.description}\n\nDetails: ${event.url}`)}`,
    `URL:${event.url}`,
    `STATUS:${event.cancelled ? "CANCELLED" : "CONFIRMED"}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ];
  return lines.map(fold).join("\r\n") + "\r\n";
}
