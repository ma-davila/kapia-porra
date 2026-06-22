import { NextResponse } from "next/server";
import { updateResultsFromApi } from "@/lib/update";
import { getDigestByDate, getDailyDigest } from "@/lib/standings";
import { buildDigestText, postToSlack } from "@/lib/slack";

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
  const date = url.searchParams.get("date"); // YYYY-MM-DD (Madrid), optional
  const dry = url.searchParams.get("dry") === "1"; // skip Slack post

  const result: Record<string, unknown> = {};

  // 1. Pull fresh scores from the football API (best effort).
  try {
    result.sync = await updateResultsFromApi();
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

export async function GET(req: Request) {
  return run(req);
}
export async function POST(req: Request) {
  return run(req);
}
