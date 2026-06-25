import { asc, eq } from "drizzle-orm";
import { getDb } from "./db";
import { matches, predictions, teams, users } from "./schema";
import type { Match, Team } from "./schema";
import { scorePrediction, isExact } from "./scoring";
import { madridDateStr, predictionWindow } from "./dates";

export async function getTeams(): Promise<Map<string, Team>> {
  const db = getDb();
  const rows = await db.select().from(teams);
  return new Map(rows.map((t) => [t.code, t]));
}

export async function getAllMatches(): Promise<Match[]> {
  const db = getDb();
  return db.select().from(matches).orderBy(asc(matches.kickoff), asc(matches.id));
}

export type GroupRow = {
  team: Team;
  pld: number;
  w: number;
  d: number;
  l: number;
  gf: number;
  ga: number;
  gd: number;
  pts: number;
};

export async function getGroupStandings(): Promise<
  { letter: string; rows: GroupRow[] }[]
> {
  const teamMap = await getTeams();
  const all = await getAllMatches();

  const byGroup = new Map<string, Map<string, GroupRow>>();
  for (const t of teamMap.values()) {
    if (!t.groupLetter) continue;
    if (!byGroup.has(t.groupLetter)) byGroup.set(t.groupLetter, new Map());
    byGroup.get(t.groupLetter)!.set(t.code, {
      team: t,
      pld: 0,
      w: 0,
      d: 0,
      l: 0,
      gf: 0,
      ga: 0,
      gd: 0,
      pts: 0,
    });
  }

  for (const m of all) {
    if (m.stage !== "group" || m.status !== "finished") continue;
    if (m.homeScore == null || m.awayScore == null) continue;
    if (!m.homeCode || !m.awayCode || !m.groupLetter) continue;
    const g = byGroup.get(m.groupLetter);
    if (!g) continue;
    const home = g.get(m.homeCode);
    const away = g.get(m.awayCode);
    if (!home || !away) continue;
    home.pld++; away.pld++;
    home.gf += m.homeScore; home.ga += m.awayScore;
    away.gf += m.awayScore; away.ga += m.homeScore;
    if (m.homeScore > m.awayScore) {
      home.w++; home.pts += 3; away.l++;
    } else if (m.homeScore < m.awayScore) {
      away.w++; away.pts += 3; home.l++;
    } else {
      home.d++; away.d++; home.pts++; away.pts++;
    }
  }

  const result: { letter: string; rows: GroupRow[] }[] = [];
  for (const [letter, g] of [...byGroup.entries()].sort()) {
    const rows = [...g.values()];
    for (const r of rows) r.gd = r.gf - r.ga;
    rows.sort(
      (a, b) =>
        b.pts - a.pts ||
        b.gd - a.gd ||
        b.gf - a.gf ||
        a.team.name.localeCompare(b.team.name),
    );
    result.push({ letter, rows });
  }
  return result;
}

export type LeaderRow = {
  userId: number;
  name: string;
  slackId: string | null;
  points: number;
  exact: number;
  correct: number;
  played: number;
};

export async function getLeaderboard(): Promise<LeaderRow[]> {
  const db = getDb();
  const us = await db.select().from(users);
  const preds = await db.select().from(predictions);

  const byUser = new Map<number, LeaderRow>();
  for (const u of us) {
    byUser.set(u.id, {
      userId: u.id,
      name: u.name,
      slackId: u.slackId,
      points: 0,
      exact: 0,
      correct: 0,
      played: 0,
    });
  }
  for (const p of preds) {
    const row = byUser.get(p.userId);
    if (!row || p.points == null) continue;
    row.points += p.points;
    row.played++;
    if (p.points === 3) row.exact++;
    if (p.points >= 1) row.correct++;
  }
  return [...byUser.values()].sort(
    (a, b) => b.points - a.points || b.exact - a.exact || a.name.localeCompare(b.name),
  );
}

export async function getUserPredictions(userId: number): Promise<Map<number, { homeScore: number; awayScore: number; points: number | null }>> {
  const db = getDb();
  const rows = await db.select().from(predictions).where(eq(predictions.userId, userId));
  return new Map(rows.map((r) => [r.matchId, { homeScore: r.homeScore, awayScore: r.awayScore, points: r.points }]));
}

// Recompute points for every prediction whose match is finished. Returns count updated.
export async function regradeAll(): Promise<number> {
  const db = getDb();
  const all = await getAllMatches();
  const finished = new Map(
    all
      .filter((m) => m.status === "finished" && m.homeScore != null && m.awayScore != null)
      .map((m) => [m.id, m]),
  );
  const preds = await db.select().from(predictions);
  let updated = 0;
  for (const p of preds) {
    const m = finished.get(p.matchId);
    const pts = m
      ? scorePrediction(p.homeScore, p.awayScore, m.homeScore!, m.awayScore!)
      : null;
    if (pts !== p.points) {
      await db.update(predictions).set({ points: pts }).where(eq(predictions.id, p.id));
      updated++;
    }
  }
  return updated;
}

// Digest data for a Madrid calendar day (YYYY-MM-DD).
export type DigestMatch = {
  match: Match;
  home: Team | null;
  away: Team | null;
};
export type DigestUser = { name: string; slackId: string | null; dayPoints: number; exact: number };

export type Digest = {
  title: string;
  dayMatches: DigestMatch[]; // results to report (yesterday's slate)
  upcoming: DigestMatch[]; // today's matches, still open to predict
  perUser: DigestUser[];
  leaderboard: LeaderRow[];
};

// The daily digest used by the cron: yesterday's results + today's open matches.
export async function getDailyDigest(now = new Date()): Promise<Digest> {
  const w = predictionWindow(now);
  const prevStart = new Date(w.start.getTime() - 24 * 3600000);
  const inResults = (m: Match) => {
    const k = new Date(m.kickoff).getTime();
    return k >= prevStart.getTime() && k < w.start.getTime();
  };
  const inToday = (m: Match) => {
    const k = new Date(m.kickoff).getTime();
    return k >= w.start.getTime() && k < w.end.getTime();
  };
  return buildDigest(inResults, inToday, "Latest results");
}

// Admin-only: digest centred on a specific Madrid calendar day.
export async function getDigestByDate(dateStr: string): Promise<Digest> {
  const sameDay = (m: Match) => madridDateStr(new Date(m.kickoff)) === dateStr;
  return buildDigest(sameDay, sameDay, dateStr);
}

async function buildDigest(
  resultsFilter: (m: Match) => boolean,
  todayFilter: (m: Match) => boolean,
  title: string,
): Promise<Digest> {
  const db = getDb();
  const teamMap = await getTeams();
  const all = await getAllMatches();
  const withTeams = (m: Match): DigestMatch => ({
    match: m,
    home: m.homeCode ? teamMap.get(m.homeCode) ?? null : null,
    away: m.awayCode ? teamMap.get(m.awayCode) ?? null : null,
  });

  const dayMatches = all.filter(
    (m) => m.status === "finished" && m.homeScore != null && m.awayScore != null && resultsFilter(m),
  );
  const dayIds = new Set(dayMatches.map((m) => m.id));

  const upcoming = all.filter(
    (m) => m.status === "scheduled" && m.homeCode && m.awayCode && todayFilter(m),
  );

  const us = await db.select().from(users);
  const preds = await db.select().from(predictions);
  const userById = new Map(us.map((u) => [u.id, u.name]));

  const perUserMap = new Map<number, DigestUser>();
  for (const u of us) perUserMap.set(u.id, { name: u.name, slackId: u.slackId, dayPoints: 0, exact: 0 });
  for (const p of preds) {
    if (!dayIds.has(p.matchId) || p.points == null) continue;
    const row = perUserMap.get(p.userId);
    if (!row) continue;
    row.dayPoints += p.points;
    if (p.points === 3) row.exact++;
  }

  const perUser = [...perUserMap.values()]
    .filter(() => userById.size > 0)
    .sort((a, b) => b.dayPoints - a.dayPoints || b.exact - a.exact || a.name.localeCompare(b.name));

  return {
    title,
    dayMatches: dayMatches.map(withTeams),
    upcoming: upcoming.map(withTeams),
    perUser,
    leaderboard: await getLeaderboard(),
  };
}
