import type { Digest } from "./standings";
import { madridTime } from "./dates";

function medal(i: number): string {
  return ["🥇", "🥈", "🥉"][i] ?? `${i + 1}.`;
}

// Render a player as a Slack @-mention if they've set their member ID, else
// just their name.
function who(p: { name: string; slackId: string | null }): string {
  return p.slackId ? `<@${p.slackId}>` : p.name;
}

// Public base URL of the app, for links in the Slack message.
export function appBaseUrl(): string | null {
  if (process.env.APP_URL) return process.env.APP_URL.replace(/\/$/, "");
  const v = process.env.VERCEL_PROJECT_PRODUCTION_URL || process.env.VERCEL_URL;
  return v ? `https://${v}` : null;
}

export function buildDigestText(opts: Digest): string {
  const { dayMatches, upcoming, perUser, leaderboard } = opts;
  const base = appBaseUrl();

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
        lines.push(`• ${who(u)}: *${u.dayPoints}* pts${ex}`);
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

  // Today's matches — still open to predict.
  lines.push("");
  if (upcoming.length === 0) {
    lines.push("_No more matches to predict today._");
  } else {
    lines.push("*📋 Today's matches — predict before kick-off:*");
    for (const dm of upcoming) {
      const h = dm.home ? `${dm.home.flag} ${dm.home.name}` : dm.match.homeLabel ?? "?";
      const a = dm.away ? `${dm.away.name} ${dm.away.flag}` : dm.match.awayLabel ?? "?";
      lines.push(`• ${madridTime(new Date(dm.match.kickoff))}  ${h} v ${a}`);
    }
    if (base) {
      lines.push("");
      lines.push(`👉 Make your predictions: ${base}/predict`);
    }
  }

  return lines.join("\n");
}

// "Last call" reminder pinging players who haven't predicted today's still-open
// matches. Players with a Slack ID get an @-mention; others show their name.
export function buildReminderText(
  missing: { name: string; slackId: string | null }[],
  openCount: number,
): string {
  const base = appBaseUrl();
  const lines: string[] = [];
  lines.push("⏰ *Kapia's World Cup Porra — last call!*");
  lines.push("");
  lines.push(
    `${openCount} match${openCount === 1 ? "" : "es"} still open today, and you haven't predicted yet:`,
  );
  lines.push(missing.map(who).join("  "));
  if (base) {
    lines.push("");
    lines.push(`👉 Predict before kick-off: ${base}/predict`);
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
