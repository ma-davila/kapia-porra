import type { Digest } from "./standings";

function medal(i: number): string {
  return ["🥇", "🥈", "🥉"][i] ?? `${i + 1}.`;
}

export function buildDigestText(opts: Digest): string {
  const { dayMatches, perUser, leaderboard } = opts;

  const lines: string[] = [];
  lines.push(`⚽ *Kapia's World Cup Porra — ${opts.title}*`);
  lines.push("");

  if (dayMatches.length === 0) {
    lines.push("_No matches finished on this day._");
  } else {
    lines.push("*Results*");
    for (const dm of dayMatches) {
      const h = dm.home ? `${dm.home.flag} ${dm.home.name}` : dm.match.homeLabel ?? "?";
      const a = dm.away ? `${dm.away.name} ${dm.away.flag}` : dm.match.awayLabel ?? "?";
      lines.push(`• ${h} *${dm.match.homeScore}–${dm.match.awayScore}* ${a}`);
    }
    lines.push("");
    lines.push("*Points earned today*");
    const scored = perUser.filter((u) => u.dayPoints > 0);
    if (scored.length === 0) {
      lines.push("_Nobody scored today._");
    } else {
      for (const u of scored) {
        const ex = u.exact > 0 ? ` (${u.exact} exact)` : "";
        lines.push(`• ${u.name}: *${u.dayPoints}* pts${ex}`);
      }
    }
  }

  lines.push("");
  lines.push("*🏆 Overall standings*");
  if (leaderboard.length === 0) {
    lines.push("_No players yet._");
  } else {
    leaderboard.forEach((r, i) => {
      lines.push(`${medal(i)} ${r.name} — *${r.points}* pts (${r.exact} exact)`);
    });
  }

  return lines.join("\n");
}

export async function postToSlack(text: string): Promise<void> {
  const url = process.env.SLACK_WEBHOOK_URL;
  if (!url) throw new Error("SLACK_WEBHOOK_URL is not set");
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text }),
  });
  if (!res.ok) {
    throw new Error(`Slack webhook ${res.status}: ${await res.text()}`);
  }
}
