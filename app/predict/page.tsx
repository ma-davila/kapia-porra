import { requireUser } from "@/lib/guard";
import { getAllMatches, getTeams, getUserPredictions } from "@/lib/standings";
import { madridDayLabel, madridTime } from "@/lib/dates";
import { stageShort, stageLabel } from "@/lib/labels";
import PredictForm, { type EditableMatch } from "./PredictForm";

export const dynamic = "force-dynamic";

export default async function PredictPage() {
  const session = await requireUser();
  const [all, teamMap, preds] = await Promise.all([
    getAllMatches(),
    getTeams(),
    getUserPredictions(session.uid),
  ]);
  const now = Date.now();

  const editable: EditableMatch[] = [];
  const past = [];

  for (const m of all) {
    const kickoff = new Date(m.kickoff).getTime();
    const home = m.homeCode ? teamMap.get(m.homeCode) : null;
    const away = m.awayCode ? teamMap.get(m.awayCode) : null;
    const pred = preds.get(m.id);

    if (home && away && kickoff > now) {
      editable.push({
        id: m.id,
        dayLabel: madridDayLabel(new Date(m.kickoff)),
        time: madridTime(new Date(m.kickoff)),
        stageLabel: stageShort(m),
        homeFlag: home.flag,
        homeName: home.name,
        awayFlag: away.flag,
        awayName: away.name,
        predHome: pred?.homeScore ?? null,
        predAway: pred?.awayScore ?? null,
      });
    } else if (kickoff <= now && home && away) {
      past.push({ m, home, away, pred });
    }
  }

  // Most recent first for the history list.
  past.reverse();

  return (
    <div className="space-y-6">
      <div className="card p-4">
        <h1 className="text-lg font-bold text-pitch">My Predictions</h1>
        <p className="text-sm text-slate-500">
          Predict the scoreline of every upcoming match. Predictions lock at kick-off (Madrid time).
          Exact score = <strong>3 pts</strong>, correct winner/draw = <strong>1 pt</strong>.
        </p>
      </div>

      <section>
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-500">
          Open for predictions
        </h2>
        <PredictForm matches={editable} />
      </section>

      {past.length > 0 && (
        <section>
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-500">
            Played &amp; locked
          </h2>
          <div className="card divide-y divide-slate-100">
            {past.map(({ m, home, away, pred }) => {
              const finished = m.status === "finished" && m.homeScore != null;
              return (
                <div key={m.id} className="flex items-center gap-3 px-4 py-3 text-sm">
                  <div className="w-16 shrink-0 text-xs text-slate-400">
                    {madridDayLabel(new Date(m.kickoff))}
                    <div className="text-[10px] uppercase">{stageLabel(m)}</div>
                  </div>
                  <div className="flex flex-1 items-center justify-center gap-2">
                    <span className="text-right font-medium">
                      {home.flag} {home.name}
                    </span>
                    <span className="rounded bg-slate-100 px-2 py-0.5 font-bold">
                      {finished ? `${m.homeScore} : ${m.awayScore}` : "–"}
                    </span>
                    <span className="font-medium">
                      {away.name} {away.flag}
                    </span>
                  </div>
                  <div className="w-28 shrink-0 text-right">
                    {pred ? (
                      <span className="text-slate-500">
                        you: {pred.homeScore}-{pred.awayScore}
                        {pred.points != null && (
                          <span
                            className={`ml-1 rounded px-1.5 py-0.5 text-xs font-bold ${
                              pred.points === 3
                                ? "bg-green-100 text-green-700"
                                : pred.points === 1
                                  ? "bg-amber-100 text-amber-700"
                                  : "bg-slate-100 text-slate-400"
                            }`}
                          >
                            +{pred.points}
                          </span>
                        )}
                      </span>
                    ) : (
                      <span className="text-slate-300">no bet</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
