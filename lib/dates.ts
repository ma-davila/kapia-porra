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

// ---- Daily prediction window ----
// Predictions open in daily slates anchored at 09:00 Madrid (the same time the
// Slack reminder goes out). On a given day you can only predict that day's
// matches: the slate runs [today 09:00, tomorrow 09:00). Late-night matches
// (just after midnight Madrid) belong to the previous morning's slate, so there
// is never a gap where a match was never open.
export const RELEASE_HOUR = 9; // 09:00 Madrid
const DAY_MS = 24 * 60 * 60 * 1000;

// Minutes that `tz` is ahead of UTC at instant d.
function tzOffsetMinutes(d: Date, tz = TZ): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  })
    .formatToParts(d)
    .reduce<Record<string, string>>((a, p) => ((a[p.type] = p.value), a), {});
  const asUTC = Date.UTC(
    +parts.year,
    +parts.month - 1,
    +parts.day,
    +parts.hour,
    +parts.minute,
    +parts.second,
  );
  return (asUTC - d.getTime()) / 60000;
}

// The UTC instant when the Madrid wall clock reads (y-m-d) at `hour`:00.
function madridWallToUtc(y: number, m: number, d: number, hour: number): Date {
  const naive = Date.UTC(y, m - 1, d, hour, 0, 0);
  const off = tzOffsetMinutes(new Date(naive));
  return new Date(naive - off * 60000);
}

function madridHour(now: Date): number {
  return Number(
    new Intl.DateTimeFormat("en-GB", { timeZone: TZ, hour: "2-digit", hourCycle: "h23" }).format(now),
  );
}

// The active prediction slate for `now`.
export function predictionWindow(now = new Date()): { start: Date; end: Date } {
  const [y, m, d] = madridDateStr(now).split("-").map(Number);
  let start = madridWallToUtc(y, m, d, RELEASE_HOUR);
  if (madridHour(now) < RELEASE_HOUR) start = new Date(start.getTime() - DAY_MS);
  return { start, end: new Date(start.getTime() + DAY_MS) };
}

// When the slate containing `kickoff` opened (its 09:00 Madrid release).
export function predictionOpensAt(kickoff: Date): Date {
  return predictionWindow(kickoff).start;
}

// Is this match currently open for predictions (in today's slate, not started)?
export function isOpenForPrediction(kickoff: Date, now = new Date()): boolean {
  const w = predictionWindow(now);
  const k = kickoff.getTime();
  return k >= w.start.getTime() && k < w.end.getTime() && k > now.getTime();
}
