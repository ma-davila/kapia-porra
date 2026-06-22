import { isAdmin } from "@/lib/session";
import { getAllMatches, getTeams } from "@/lib/standings";
import { stageLabel } from "@/lib/labels";
import { madridDayLabel, madridTime } from "@/lib/dates";
import AdminLogin from "./AdminLogin";
import AdminPanel, { type AdminMatch, type AdminTeam } from "./AdminPanel";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  if (!(await isAdmin())) {
    return <AdminLogin />;
  }

  const [all, teamMap] = await Promise.all([getAllMatches(), getTeams()]);

  const teams: AdminTeam[] = [...teamMap.values()]
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((t) => ({ code: t.code, name: t.name, flag: t.flag }));

  const matches: AdminMatch[] = all.map((m) => {
    const home = m.homeCode ? teamMap.get(m.homeCode) : null;
    const away = m.awayCode ? teamMap.get(m.awayCode) : null;
    return {
      id: m.id,
      stage: m.stage,
      stageLabel: stageLabel(m),
      when: `${madridDayLabel(new Date(m.kickoff))} ${madridTime(new Date(m.kickoff))}`,
      homeCode: m.homeCode,
      awayCode: m.awayCode,
      homeName: home ? `${home.flag} ${home.name}` : m.homeLabel ?? "TBD",
      awayName: away ? `${away.flag} ${away.name}` : m.awayLabel ?? "TBD",
      homeScore: m.homeScore,
      awayScore: m.awayScore,
      status: m.status,
    };
  });

  return <AdminPanel matches={matches} teams={teams} />;
}
