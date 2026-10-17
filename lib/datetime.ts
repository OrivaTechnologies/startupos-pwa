import { toZonedTime, fromZonedTime } from "date-fns-tz";

// The backend stores every timestamp in UTC; the product only has one
// audience timezone today, so IST is hardcoded rather than per-user.
export const IST_TIMEZONE = "Asia/Kolkata";

// Returns a Date whose local getters (and anything date-fns does with them,
// e.g. `format`) read as IST wall-clock time, regardless of the system
// timezone the server or browser happens to be running in.
export function toIST(date: Date | string): Date {
  return toZonedTime(date, IST_TIMEZONE);
}

// Inverse of toIST: given a wall-clock time meant as IST (e.g. a user-picked
// "yyyy-MM-dd" date boundary), returns the corresponding UTC instant.
export function fromIST(dateTimeLocal: Date | string): Date {
  return fromZonedTime(dateTimeLocal, IST_TIMEZONE);
}

// Start of an IST calendar day, as a UTC Date — for filtering date_time
// columns that are stored in UTC against a user-picked "yyyy-MM-dd" bound.
export function istDayStartUtc(dateStr: string): Date {
  return fromIST(`${dateStr}T00:00:00.000`);
}

export function istDayEndUtc(dateStr: string): Date {
  return fromIST(`${dateStr}T23:59:59.999`);
}

// "2026-10-17" — the IST calendar date of a UTC instant.
export function istDateKey(date: Date | string): string {
  const zoned = toIST(date);
  const year = zoned.getFullYear();
  const month = String(zoned.getMonth() + 1).padStart(2, "0");
  const day = String(zoned.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

// Due dates are a calendar day. Persist the end of that IST day as UTC so the
// task stays due through the whole day in this region.
export function dueAtEndOfIstDay(value: string): string | null {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return istDayEndUtc(istDateKey(parsed)).toISOString();
}

function istParts(date: Date | string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: IST_TIMEZONE,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  }).formatToParts(new Date(date));
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  return {
    day: get("day"),
    month: get("month"),
    year: get("year"),
    hour: get("hour"),
    minute: get("minute"),
    period: get("dayPeriod").toUpperCase(),
  };
}

// "28-09-2026"
export function formatISTDate(date: Date | string): string {
  const p = istParts(date);
  return `${p.day}-${p.month}-${p.year}`;
}

// "11:36 PM"
export function formatISTTime(date: Date | string): string {
  const p = istParts(date);
  return `${p.hour}:${p.minute} ${p.period}`;
}
