export const TZ = "Europe/Madrid";

// YYYY-MM-DD for the given instant, in Madrid local time.
export function madridDateStr(d: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

// "Mon 22 Jun" style label, Madrid time.
export function madridDayLabel(d: Date): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: TZ,
    weekday: "short",
    day: "2-digit",
    month: "short",
  }).format(d);
}

// "20:00" Madrid time.
export function madridTime(d: Date): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: TZ,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(d);
}

// Today's date (Madrid) as YYYY-MM-DD.
export function todayMadrid(now = new Date()): string {
  return madridDateStr(now);
}

// Yesterday's date (Madrid) as YYYY-MM-DD.
export function yesterdayMadrid(now = new Date()): string {
  const d = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  return madridDateStr(d);
}
