import { daysUntil, tzParts } from "@/lib/time";

/** Great-circle distance in km between two points. */
export function distanceKm(a: { lat: number; lon: number }, b: { lat: number; lon: number }) {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lon - a.lon);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLon / 2) ** 2;
  return Math.round(2 * R * Math.asin(Math.sqrt(h)));
}

/** Day number together (day 1 = the start date). */
export function dayTogether(since: string, tz: string, now = new Date()) {
  return -daysUntil(since, tz, now) + 1;
}

/** Next anniversary of `since` (same month/day), and how many days until it. Feb 29 falls back to Feb 28. */
export function nextAnniversary(since: string, tz: string, now = new Date()) {
  const [y, m, d] = since.split("-").map(Number);
  const today = tzParts(now, tz);
  let year = today.year;
  const make = (yy: number) => {
    const isLeap = (yy % 4 === 0 && yy % 100 !== 0) || yy % 400 === 0;
    const day = m === 2 && d === 29 && !isLeap ? 28 : d;
    return `${yy}-${String(m).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  };
  let date = make(year);
  if (daysUntil(date, tz, now) < 0) date = make(++year);
  return { date, years: year - y, days: daysUntil(date, tz, now) };
}

/** Fun milestones for the day counter (100, 365, 500, 1000…). */
export function nextMilestone(day: number) {
  const marks = [100, 200, 365, 500, 730, 1000, 1095, 1461, 1500, 1826, 2000, 2500, 3000];
  return marks.find((m) => m > day) ?? Math.ceil((day + 1) / 1000) * 1000;
}
