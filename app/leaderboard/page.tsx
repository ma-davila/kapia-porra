import { requireUser } from "@/lib/guard";
import { getLeaderboard } from "@/lib/standings";

export const dynamic = "force-dynamic";

export default async function LeaderboardPage() {
  const session = await requireUser();
  const rows = await getLeaderboard();

  return (
    <div className="space-y-4">
      <div className="card p-4">
        <h1 className="text-lg font-bold text-pitch">Leaderboard</h1>
        <p className="text-sm text-slate-500">Total points across all graded matches.</p>
      </div>

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-[11px] uppercase tracking-wide text-slate-400">
              <th className="py-2 pl-4 text-left font-semibold">#</th>
              <th className="px-2 text-left font-semibold">Player</th>
              <th className="px-2 text-center font-semibold">Played</th>
              <th className="px-2 text-center font-semibold">Exact</th>
              <th className="px-2 text-center font-semibold">Correct</th>
              <th className="px-2 pr-4 text-center font-semibold">Points</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={6} className="py-6 text-center text-slate-400">
                  No players yet.
                </td>
              </tr>
            )}
            {rows.map((r, i) => (
              <tr
                key={r.userId}
                className={`border-b border-slate-100 last:border-0 ${
                  r.name === session.name ? "bg-green-50" : ""
                }`}
              >
                <td className="py-2 pl-4 font-bold text-slate-500">
                  {["🥇", "🥈", "🥉"][i] ?? i + 1}
                </td>
                <td className="px-2 font-medium">{r.name}</td>
                <td className="px-2 text-center text-slate-500">{r.played}</td>
                <td className="px-2 text-center text-slate-500">{r.exact}</td>
                <td className="px-2 text-center text-slate-500">{r.correct}</td>
                <td className="px-2 pr-4 text-center text-lg font-bold text-pitch">{r.points}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-center text-xs text-slate-400">
        Tie-break: more exact scores ranks higher.
      </p>
    </div>
  );
}
