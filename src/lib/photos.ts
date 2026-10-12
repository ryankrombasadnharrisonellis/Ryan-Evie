import { localDateStr } from "@/lib/time";

/** Photo-swap days follow the UK calendar day, like the daily question. */
export const PHOTO_TZ = "Europe/London";
export function todayPDate(now = new Date()) {
  return localDateStr(now, PHOTO_TZ);
}
