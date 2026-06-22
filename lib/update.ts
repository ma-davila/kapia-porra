import { eq } from "drizzle-orm";
import { getDb } from "./db";
import { matches } from "./schema";
import type { Match } from "./schema";
import { fetchMatches, type ApiResult } from "./football";
import { getAllMatches, regradeAll } from "./standings";

// How close (ms) an API knockout fixture's kickoff must be to one of our empty
// bracket slots to be considered the same match. Slots have distinct kickoff
// times, so this only needs to absorb minor schedule/rounding differences.
const KNOCKOUT_TOLERANCE_MS = 8 * 60 * 60 * 1000; // 8h

export type MatchUpdate = {
  id: number;
  set: Partial<{
    homeCode: string;
    awayCode: string;
    homeScore: number;
    awayScore: number;
    status: string;
    apiFixtureId: number;
  }>;
};

function nearest(cands: Match[], apiTime: number, tol?: number): Match | null {
  let best: Match | null = null;
  let bestDiff = Infinity;
  for (const m of cands) {
    const diff = Math.abs(new Date(m.kickoff).getTime() - apiTime);
    if (diff < bestDiff) {
      best = m;
      bestDiff = diff;
    }
  }
  if (best && tol != null && bestDiff > tol) return null;
  return best;
}

// Pure matcher: given our matches and the API's matches, decide what to write.
// - Group matches: matched by team-code pair (closest kickoff).
// - Knockout matches: matched to an empty bracket slot by nearest kickoff, and
//   the qualified teams are filled in automatically. Once a slot is bound to an
//   API fixture id, that binding is reused on later runs.
export function computeUpdates(ours: Match[], results: ApiResult[]): MatchUpdate[] {
  const updates: MatchUpdate[] = [];
  const usedSlots = new Set<number>();
  const boundByApi = new Map<number, Match>();
  for (const m of ours) if (m.apiFixtureId != null) boundByApi.set(m.apiFixtureId, m);

  for (const r of results) {
    if (!r.homeCode || !r.awayCode) continue; // teams not resolved yet

    // 1. Resolve which of our matches this API fixture refers to.
    let target: Match | null = boundByApi.get(r.apiId) ?? null;

    if (!target) {
      const byCodes = ours.filter(
        (m) =>
          (m.homeCode === r.homeCode && m.awayCode === r.awayCode) ||
          (m.homeCode === r.awayCode && m.awayCode === r.homeCode),
      );
      if (byCodes.length > 0) target = nearest(byCodes, new Date(r.utcDate).getTime());
    }

    if (!target && !r.isGroup) {
      // Empty knockout slot — match by kickoff time and adopt the teams.
      const slots = ours.filter(
        (m) =>
          m.stage !== "group" &&
          !m.homeCode &&
          !m.awayCode &&
          m.apiFixtureId == null &&
          !usedSlots.has(m.id),
      );
      target = nearest(slots, new Date(r.utcDate).getTime(), KNOCKOUT_TOLERANCE_MS);
    }

    if (!target) continue;
    usedSlots.add(target.id);

    // 2. Build the field changes.
    const set: MatchUpdate["set"] = {};

    // Assign teams to an unfilled knockout slot (adopt the API's orientation).
    const assigning = target.stage !== "group" && (!target.homeCode || !target.awayCode);
    if (assigning) {
      set.homeCode = r.homeCode;
      set.awayCode = r.awayCode;
    }
    if (target.apiFixtureId !== r.apiId) set.apiFixtureId = r.apiId;

    // Score (orient to the target's home/away).
    if (r.finished && r.homeScore != null && r.awayScore != null) {
      const tHome = set.homeCode ?? target.homeCode;
      const tAway = set.awayCode ?? target.awayCode;
      let hs = r.homeScore;
      let as = r.awayScore;
      if (tHome === r.awayCode && tAway === r.homeCode) {
        hs = r.awayScore;
        as = r.homeScore;
      }
      if (target.homeScore !== hs || target.awayScore !== as || target.status !== "finished") {
        set.homeScore = hs;
        set.awayScore = as;
        set.status = "finished";
      }
    }

    if (Object.keys(set).length > 0) updates.push({ id: target.id, set });
  }

  return updates;
}

// Pull all results from the API, apply them, and regrade predictions.
export async function updateResultsFromApi(): Promise<{ updated: number; fetched: number }> {
  const results = await fetchMatches();
  const ours = await getAllMatches();
  const updates = computeUpdates(ours, results);

  const db = getDb();
  for (const u of updates) {
    await db.update(matches).set(u.set).where(eq(matches.id, u.id));
  }

  await regradeAll();
  return { updated: updates.length, fetched: results.length };
}
