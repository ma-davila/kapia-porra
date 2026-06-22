import { requireUser } from "@/lib/guard";
import { getGroupStandings } from "@/lib/standings";

export const dynamic = "force-dynamic";

export default async function GroupsPage() {
  await requireUser();
  const groups = await getGroupStandings();

  return (
    <div className="space-y-6">
      <div className="card flex flex-wrap items-center justify-between gap-2 p-4">
        <div>
          <h1 className="text-lg font-bold text-pitch">Groups</h1>
          <p className="text-sm text-slate-500">2026 FIFA World Cup · live group standings</p>
        </div>
        <div className="text-xs text-slate-500">
          Scoring: <strong>exact score = 3</strong> · <strong>right winner/draw = 1</strong>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {groups.map((g) => (
          <div key={g.letter} className="card overflow-hidden">
            <div className="bg-pitch px-3 py-2 text-sm font-bold text-white">
              Group {g.letter}
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-[11px] uppercase tracking-wide text-slate-400">
                  <th className="py-1.5 pl-3 text-left font-semibold">Team</th>
                  <th className="px-1 text-center font-semibold">P</th>
                  <th className="px-1 text-center font-semibold">GD</th>
                  <th className="px-1 pr-3 text-center font-semibold">Pts</th>
                </tr>
              </thead>
              <tbody>
                {g.rows.map((r, i) => (
                  <tr
                    key={r.team.code}
                    className={`border-b border-slate-100 last:border-0 ${
                      i < 2 ? "bg-zinc-100" : ""
                    }`}
                  >
                    <td className="py-1.5 pl-3">
                      <span className="mr-1.5">{r.team.flag}</span>
                      <span className="font-medium">{r.team.name}</span>
                    </td>
                    <td className="px-1 text-center text-slate-500">{r.pld}</td>
                    <td className="px-1 text-center text-slate-500">
                      {r.gd > 0 ? `+${r.gd}` : r.gd}
                    </td>
                    <td className="px-1 pr-3 text-center font-bold">{r.pts}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}
      </div>
      <p className="text-center text-xs text-slate-400">
        Top two of each group (highlighted) advance, plus the eight best third-placed teams.
      </p>
    </div>
  );
}
