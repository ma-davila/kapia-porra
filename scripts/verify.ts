// End-to-end verification against an embedded Postgres (PGlite) — exercises the
// REAL app code paths (seed, scoring, standings, digest). Run: npx tsx scripts/verify.ts
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import * as schema from "../lib/schema";
import { setDbForTesting, getDb } from "../lib/db";
import { predictions } from "../lib/schema";
import { seedDatabase } from "../lib/seed-core";
import { createUser } from "../lib/auth";
import {
  getGroupStandings,
  getLeaderboard,
  getUserPredictions,
  regradeAll,
  getDigestByDate,
  getAllMatches,
} from "../lib/standings";
import { buildDigestText } from "../lib/slack";
import { scorePrediction } from "../lib/scoring";
import { codeForName } from "../lib/football";
import { updateResultsFromApi } from "../lib/update";

let failures = 0;
function check(name: string, cond: boolean, detail = "") {
  if (cond) {
    console.log(`  ✓ ${name}`);
  } else {
    failures++;
    console.log(`  ✗ ${name} ${detail}`);
  }
}

async function main() {
  const client = new PGlite();
  const db = drizzle(client, { schema });
  setDbForTesting(db as any);

  await client.exec(`
    CREATE TABLE teams (code text PRIMARY KEY, name text NOT NULL, flag text NOT NULL, group_letter text);
    CREATE TABLE users (id serial PRIMARY KEY, name text NOT NULL UNIQUE, password_hash text NOT NULL, created_at timestamptz NOT NULL DEFAULT now());
    CREATE TABLE matches (
      id integer PRIMARY KEY, stage text NOT NULL, group_letter text, matchday integer,
      home_code text, away_code text, home_label text, away_label text,
      kickoff timestamptz NOT NULL, ground text, home_score integer, away_score integer,
      status text NOT NULL DEFAULT 'scheduled', api_fixture_id integer);
    CREATE TABLE predictions (
      id serial PRIMARY KEY, user_id integer NOT NULL, match_id integer NOT NULL,
      home_score integer NOT NULL, away_score integer NOT NULL, points integer,
      updated_at timestamptz NOT NULL DEFAULT now(), CONSTRAINT uniq_user_match UNIQUE (user_id, match_id));
  `);

  console.log("\n[1] Scoring unit");
  check("exact -> 3", scorePrediction(2, 1, 2, 1) === 3);
  check("right winner -> 1", scorePrediction(3, 0, 2, 1) === 1);
  check("right draw -> 1", scorePrediction(1, 1, 2, 2) === 1);
  check("wrong -> 0", scorePrediction(0, 1, 2, 1) === 0);

  console.log("\n[2] Football name mapping");
  check("Spain->ESP", codeForName("Spain") === "ESP");
  check("Korea Republic->KOR", codeForName("Korea Republic") === "KOR");
  check("IR Iran->IRN", codeForName("IR Iran") === "IRN");
  check("Türkiye->TUR", codeForName("Türkiye") === "TUR");
  check("unknown->null", codeForName("Atlantis") === null);

  console.log("\n[3] Seed");
  const r = await seedDatabase();
  check("48 teams", r.teams === 48, `got ${r.teams}`);
  check("104 matches", r.matches === 104, `got ${r.matches}`);
  check("40 finished", r.finished === 40, `got ${r.finished}`);
  const all = await getAllMatches();
  check("DB has 104 matches", all.length === 104, `got ${all.length}`);

  console.log("\n[4] Group standings");
  const groups = await getGroupStandings();
  check("12 groups", groups.length === 12, `got ${groups.length}`);
  check("each group 4 teams", groups.every((g) => g.rows.length === 4));
  const A = groups.find((g) => g.letter === "A")!;
  const mex = A.rows.find((x) => x.team.code === "MEX")!;
  check("Mexico 2 played, 6 pts (won both)", mex.pld === 2 && mex.pts === 6, `pld=${mex.pld} pts=${mex.pts}`);
  const H = groups.find((g) => g.letter === "H")!;
  const esp = H.rows.find((x) => x.team.code === "ESP")!;
  check("Spain 2 played, 4 pts (W+D)", esp.pld === 2 && esp.pts === 4, `pld=${esp.pld} pts=${esp.pts}`);
  check("Group A leader is Mexico", A.rows[0].team.code === "MEX");

  console.log("\n[5] Predictions + regrade");
  const user = await createUser("Test Player", "secret");
  const m1 = all.find((m) => m.id === 1)!; // MEX 2-0 RSA
  // exact, outcome, wrong against three real finished matches
  const finished = all.filter((m) => m.status === "finished").slice(0, 3);
  // Build deliberate predictions: exact for #1, then derived for others
  await db.insert(predictions).values([
    { userId: user.id, matchId: finished[0].id, homeScore: finished[0].homeScore!, awayScore: finished[0].awayScore! }, // exact
    { userId: user.id, matchId: finished[1].id, homeScore: 9, awayScore: 0 }, // home win guess
    { userId: user.id, matchId: finished[2].id, homeScore: 0, awayScore: 9 }, // away win guess
  ]);
  const updated = await regradeAll();
  check("regrade touched 3 predictions", updated === 3, `got ${updated}`);

  const preds = await getUserPredictions(user.id);
  let crossOk = true;
  for (const f of finished) {
    const p = preds.get(f.id)!;
    const expected = scorePrediction(p.homeScore, p.awayScore, f.homeScore!, f.awayScore!);
    if (p.points !== expected) {
      crossOk = false;
      console.log(`    mismatch match#${f.id}: stored ${p.points} expected ${expected}`);
    }
  }
  check("stored points match scorePrediction for all", crossOk);
  check("exact prediction scored 3", preds.get(finished[0].id)!.points === 3);

  console.log("\n[6] Leaderboard");
  const lb = await getLeaderboard();
  check("one player", lb.length === 1, `got ${lb.length}`);
  const expectedTotal = finished.reduce((acc, f) => {
    const p = preds.get(f.id)!;
    return acc + scorePrediction(p.homeScore, p.awayScore, f.homeScore!, f.awayScore!);
  }, 0);
  check("leaderboard total matches sum", lb[0].points === expectedTotal, `got ${lb[0].points} exp ${expectedTotal}`);
  check("at least 1 exact counted", lb[0].exact >= 1);

  console.log("\n[7] Digest + Slack text");
  const dateStr = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Madrid",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(m1.kickoff));
  const digest = await getDigestByDate(dateStr);
  check("digest has matches that day", digest.dayMatches.length >= 1, `got ${digest.dayMatches.length}`);
  const text = buildDigestText(digest);
  check("slack text mentions a team", /Mexico|South Africa|Korea/.test(text));
  check("slack text has standings header", text.includes("Overall standings"));

  console.log("\n[8] API update path runs without a key (no crash)");
  const upd = await updateResultsFromApi();
  check("updateResultsFromApi returns shape", typeof upd.updated === "number" && upd.fetched === 0);

  console.log("\n--- Slack digest preview ---\n");
  console.log(text);

  console.log(`\n${failures === 0 ? "✅ ALL CHECKS PASSED" : `❌ ${failures} CHECK(S) FAILED`}`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
