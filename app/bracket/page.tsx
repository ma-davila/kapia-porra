import { requireUser } from "@/lib/guard";
import { getAllMatches, getTeams, getUserPredictions } from "@/lib/standings";
import { madridDayLabel, madridTime } from "@/lib/dates";
import type { Match, Team } from "@/lib/schema";

export const dynamic = "force-dynamic";

const ROUNDS: { key: string; title: string }[] = [
  { key: "r32", title: "Round of 32" },
  { key: "r16", title: "Round of 16" },
  { key: "qf", title: "Quarter-finals" },
  { key: "sf", title: "Semi-finals" },
  { key: "third", title: "Third place" },
  { key: "final", title: "Final" },
];

function side(m: Match, which: "home" | "away", teams: Map<string, Team>) {
  const code = which === "home" ? m.homeCode : m.awayCode;
  const label = which === "home" ? m.homeLabel : m.awayLabel;
  const t = code ? teams.get(code) : null;
  if (t) return `${t.flag} ${t.name}`;
  return label ?? "TBD";
}

export default async function BracketPage() {
  const session = await requireUser();
  const [all, teams, preds] = await Promise.all([
    getAllMatches(),
    getTeams(),
    getUserPredictions(session.uid),
  ]);

  const knockout = all.filter((m) => m.stage !== "group");

  return (
    <div className="space-y-6">
      <div className="card p-4">
        <h1 className="text-lg font-bold text-pitch">Knockout Bracket</h1>
        <p className="text-sm text-slate-500">
          Slots fill in as groups finish (June 27). Once both teams of a match are known, it opens on
          your <strong>Predictions</strong> page.
        </p>
      </div>

      {ROUNDS.map(({ key, title }) => {
        const ms = knockout.filter((m) => m.stage === key);
        if (ms.length === 0) return null;
        return (
          <section key={key}>
            <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-500">
              {title}
            </h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {ms.map((m) => {
                const finished = m.status === "finished" && m.homeScore != null;
                const pred = preds.get(m.id);
                return (
                  <div key={m.id} className="card p-3 text-sm">
                    <div className="mb-1 text-[11px] text-slate-400">
                      #{m.id} · {madridDayLabel(new Date(m.kickoff))} {madridTime(new Date(m.kickoff))}
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{side(m, "home", teams)}</span>
                      <span className="font-bold">{finished ? m.homeScore : ""}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{side(m, "away", teams)}</span>
                      <span className="font-bold">{finished ? m.awayScore : ""}</span>
                    </div>
                    {pred && (
                      <div className="mt-1 text-[11px] text-slate-400">
                        your bet: {pred.homeScore}-{pred.awayScore}
                        {pred.points != null && ` (+${pred.points})`}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}
