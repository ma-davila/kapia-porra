import { eq } from "drizzle-orm";
import { getDb } from "./db";
import { matches } from "./schema";
import { fetchResults } from "./football";
import { getAllMatches, regradeAll } from "./standings";

function utcDateStr(d: Date): string {
  return d.toISOString().slice(0, 10);
}

// Pull recent results from the football API and write scores onto our matches.
// Only matches a fixture when both team codes are known on our side (all group
// matches; knockout matches once an admin has filled in the qualified teams).
export async function updateResultsFromApi(): Promise<{ updated: number; fetched: number }> {
  const now = new Date();
  const from = utcDateStr(new Date(now.getTime() - 4 * 86400000));
  const to = utcDateStr(new Date(now.getTime() + 1 * 86400000));

  const api = await fetchResults(from, to);
  const all = await getAllMatches();
  const db = getDb();
  let updated = 0;

  for (const r of api) {
    if (!r.finished || r.homeScore == null || r.awayScore == null) continue;
    if (!r.homeCode || !r.awayCode) continue;

    const candidates = all.filter(
      (m) =>
        (m.homeCode === r.homeCode && m.awayCode === r.awayCode) ||
        (m.homeCode === r.awayCode && m.awayCode === r.homeCode),
    );
    if (candidates.length === 0) continue;

    const apiTime = new Date(r.utcDate).getTime();
    const m = candidates.sort(
      (a, b) =>
        Math.abs(new Date(a.kickoff).getTime() - apiTime) -
        Math.abs(new Date(b.kickoff).getTime() - apiTime),
    )[0];

    // Orient the score to our stored home/away.
    let hs = r.homeScore;
    let as = r.awayScore;
    if (m.homeCode === r.awayCode) {
      hs = r.awayScore;
      as = r.homeScore;
    }

    if (
      m.status === "finished" &&
      m.homeScore === hs &&
      m.awayScore === as &&
      m.apiFixtureId === r.apiId
    ) {
      continue;
    }

    await db
      .update(matches)
      .set({ homeScore: hs, awayScore: as, status: "finished", apiFixtureId: r.apiId })
      .where(eq(matches.id, m.id));
    updated++;
  }

  // Recompute everyone's points after writing new results.
  await regradeAll();

  return { updated, fetched: api.length };
}
