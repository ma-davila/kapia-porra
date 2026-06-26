import { NextResponse } from "next/server";
import { updateResultsFromApi } from "@/lib/update";
import { retry } from "@/lib/retry";
import { getDigestByDate, getDailyDigest, getMissingPredictors } from "@/lib/standings";
import { buildDigestText, buildReminderText, postToSlack } from "@/lib/slack";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

function authorized(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const auth = req.headers.get("authorization");
  if (auth === `Bearer ${secret}`) return true; // Vercel Cron sends this
  const url = new URL(req.url);
  return url.searchParams.get("secret") === secret; // for Upstash / manual calls
}

async function run(req: Request) {
  if (!authorized(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const mode = url.searchParams.get("mode"); // "remind" for the 5pm nudge
  const date = url.searchParams.get("date"); // YYYY-MM-DD (Madrid), optional
  const dry = url.searchParams.get("dry") === "1"; // skip Slack post

  if (mode === "remind") return runReminder(url, dry);

  const result: Record<string, unknown> = {};

  // 1. Pull fresh scores from the football API. Retried so a transient failure
  //    (Neon cold start, API hiccup) doesn't leave the digest with stale data.
  try {
    result.sync = await retry(() => updateResultsFromApi());
  } catch (e) {
    result.syncError = String(e);
  }

  // 2. Build the digest (specific Madrid date, or the daily 9am slate by default).
  const digest = date ? await getDigestByDate(date) : await getDailyDigest();
  result.matches = digest.dayMatches.length;
  result.players = digest.leaderboard.length;

  // 3. Post to Slack.
  if (!dry) {
    try {
      if (process.env.SLACK_WEBHOOK_URL) {
        await postToSlack(buildDigestText(digest));
        result.slack = "posted";
      } else {
        result.slack = "skipped (no SLACK_WEBHOOK_URL)";
      }
    } catch (e) {
      result.slackError = String(e);
    }
  } else {
    result.slack = "dry-run";
    result.preview = buildDigestText(digest);
  }

  return NextResponse.json({ ok: true, ...result });
}

// 5pm nudge: ping players who haven't predicted today's still-open matches.
// Sends nothing if nobody is missing.
async function runReminder(url: URL, dry: boolean) {
  // Best-effort results refresh too, so the standings stay current through the
  // day even if the morning sync hiccuped.
  try {
    await retry(() => updateResultsFromApi());
  } catch {
    // ignore — the reminder doesn't depend on fresh results
  }

  const { openMatchIds, missing } = await getMissingPredictors();
  const base: Record<string, unknown> = {
    ok: true,
    mode: "remind",
    openMatches: openMatchIds.length,
    missing: missing.length,
  };

  if (missing.length === 0) {
    return NextResponse.json({ ...base, slack: "skipped (nobody missing)" });
  }

  const text = buildReminderText(missing, openMatchIds.length);
  if (dry) return NextResponse.json({ ...base, slack: "dry-run", preview: text });

  try {
    if (process.env.SLACK_WEBHOOK_URL) {
      await postToSlack(text);
      return NextResponse.json({ ...base, slack: "posted" });
    }
    return NextResponse.json({ ...base, slack: "skipped (no SLACK_WEBHOOK_URL)" });
  } catch (e) {
    return NextResponse.json({ ...base, slackError: String(e) });
  }
}

export async function GET(req: Request) {
  return run(req);
}
export async function POST(req: Request) {
  return run(req);
}
