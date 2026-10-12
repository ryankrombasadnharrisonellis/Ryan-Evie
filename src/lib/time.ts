// Time-zone helpers that work the same on the server and in the browser.

export type Parts = { year: number; month: number; day: number; hour: number; minute: number; second: number };

const fmtCache = new Map<string, Intl.DateTimeFormat>();
function fmt(tz: string) {
  let f = fmtCache.get(tz);
  if (!f) {
    f = new Intl.DateTimeFormat("en-GB", {
      timeZone: tz,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hourCycle: "h23",
    });
    fmtCache.set(tz, f);
  }
  return f;
}

export function isValidTimeZone(tz: string) {
  try {
    new Intl.DateTimeFormat("en-GB", { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

/** Wall-clock parts of `date` in time zone `tz`. */
export function tzParts(date: Date, tz: string): Parts {
  const out: Record<string, number> = {};
  for (const p of fmt(tz).formatToParts(date)) {
    if (p.type !== "literal") out[p.type] = Number(p.value);
  }
  return {
    year: out.year,
    month: out.month,
    day: out.day,
    hour: out.hour === 24 ? 0 : out.hour,
    minute: out.minute,
    second: out.second,
  };
}

function offsetMs(date: Date, tz: string) {
  const p = tzParts(date, tz);
  const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
  return asUtc - Math.floor(date.getTime() / 1000) * 1000;
}

/** A wall-clock time in `tz` → the real moment (Date). */
export function zonedToUtc(year: number, month: number, day: number, hour: number, minute: number, tz: string): Date {
  const guess = Date.UTC(year, month - 1, day, hour, minute);
  const off1 = offsetMs(new Date(guess), tz);
  let t = guess - off1;
  const off2 = offsetMs(new Date(t), tz);
  if (off2 !== off1) t = guess - off2;
  return new Date(t);
}

/** "YYYY-MM-DD" for `date` in `tz`. */
export function localDateStr(date: Date, tz: string) {
  const p = tzParts(date, tz);
  return `${p.year}-${String(p.month).padStart(2, "0")}-${String(p.day).padStart(2, "0")}`;
}

/** The moment today started in `tz`. */
export function startOfLocalDay(tz: string, now = new Date()) {
  const p = tzParts(now, tz);
  return zonedToUtc(p.year, p.month, p.day, 0, 0, tz);
}

function toMinutes(t: string) {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + (m || 0);
}

/** If `now` falls inside quiet hours (e.g. "23:00"–"08:00" in `tz`), the moment they end; otherwise null. */
export function quietUntil(now: Date, tz: string, start: string | null, end: string | null): Date | null {
  if (!start || !end) return null;
  const s = toMinutes(start);
  const e = toMinutes(end);
  if (s === e) return null;
  const p = tzParts(now, tz);
  const m = p.hour * 60 + p.minute;
  const inQuiet = s < e ? m >= s && m < e : m >= s || m < e;
  if (!inQuiet) return null;
  let end1 = zonedToUtc(p.year, p.month, p.day, Math.floor(e / 60), e % 60, tz);
  if (end1.getTime() <= now.getTime()) end1 = new Date(end1.getTime() + 24 * 3600 * 1000);
  return end1;
}

/** Whole days from today (in tz) until a "YYYY-MM-DD" date. */
export function daysUntil(dateStr: string, tz: string, now = new Date()) {
  const [y, m, d] = dateStr.split("-").map(Number);
  const today = tzParts(now, tz);
  const a = Date.UTC(today.year, today.month - 1, today.day);
  const b = Date.UTC(y, m - 1, d);
  return Math.round((b - a) / 86400000);
}

export function formatClock(date: Date, tz: string) {
  return new Intl.DateTimeFormat("en-GB", { timeZone: tz, hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(date);
}

export function formatWhen(date: Date, tz: string) {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: tz,
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(date);
}

export function timeAgo(date: Date, now = new Date()) {
  const s = Math.max(0, Math.round((now.getTime() - date.getTime()) / 1000));
  if (s < 60) return "just now";
  const m = Math.round(s / 60);
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.round(h / 24);
  return d === 1 ? "yesterday" : `${d} days ago`;
}

/** Short city label for a time zone, e.g. "Europe/London" → "London". */
export function tzCity(tz: string) {
  return tz.split("/").pop()!.replace(/_/g, " ");
}
