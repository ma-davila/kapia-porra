import { getDb } from "./db";
import { teams, matches } from "./schema";
import data from "../db/data/seed-data.json";

type SeedTeam = { code: string; name: string; flag: string; group: string | null };
type SeedMatch = {
  matchNo: number;
  stage: string;
  groupLetter: string | null;
  matchday: number | null;
  homeCode: string | null;
  awayCode: string | null;
  homeLabel: string | null;
  awayLabel: string | null;
  kickoff: string;
  ground: string | null;
  homeScore: number | null;
  awayScore: number | null;
  status: string;
};

// Idempotent seed: refreshes teams + match fixtures. Live scores/status are
// preserved on re-seed (only descriptive fields update for existing matches).
export async function seedDatabase(): Promise<{ teams: number; matches: number; finished: number }> {
  const db = getDb();
  const seedTeams = data.teams as SeedTeam[];
  const seedMatches = data.matches as SeedMatch[];

  for (const t of seedTeams) {
    await db
      .insert(teams)
      .values({ code: t.code, name: t.name, flag: t.flag, groupLetter: t.group })
      .onConflictDoUpdate({
        target: teams.code,
        set: { name: t.name, flag: t.flag, groupLetter: t.group },
      });
  }

  for (const m of seedMatches) {
    await db
      .insert(matches)
      .values({
        id: m.matchNo,
        stage: m.stage,
        groupLetter: m.groupLetter,
        matchday: m.matchday,
        homeCode: m.homeCode,
        awayCode: m.awayCode,
        homeLabel: m.homeLabel,
        awayLabel: m.awayLabel,
        kickoff: new Date(m.kickoff),
        ground: m.ground,
        homeScore: m.homeScore,
        awayScore: m.awayScore,
        status: m.status,
      })
      .onConflictDoUpdate({
        target: matches.id,
        set: {
          stage: m.stage,
          groupLetter: m.groupLetter,
          matchday: m.matchday,
          homeCode: m.homeCode,
          awayCode: m.awayCode,
          homeLabel: m.homeLabel,
          awayLabel: m.awayLabel,
          kickoff: new Date(m.kickoff),
          ground: m.ground,
        },
      });
  }

  return {
    teams: seedTeams.length,
    matches: seedMatches.length,
    finished: seedMatches.filter((m) => m.status === "finished").length,
  };
}
