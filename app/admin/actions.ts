"use server";

import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getDb } from "@/lib/db";
import { matches } from "@/lib/schema";
import { getAllMatches, regradeAll, getDigestByDate, getDailyDigest } from "@/lib/standings";
import { updateResultsFromApi } from "@/lib/update";
import { buildDigestText, postToSlack } from "@/lib/slack";
import { setAdminCookie, isAdmin, clearAdminCookie } from "@/lib/session";

export async function adminLogin(_prev: { error?: string }, formData: FormData) {
  const pw = String(formData.get("password") ?? "");
  if (!process.env.ADMIN_PASSWORD || pw !== process.env.ADMIN_PASSWORD) {
    return { error: "Wrong admin password." };
  }
  await setAdminCookie();
  redirect("/admin");
}

export async function adminLogout() {
  await clearAdminCookie();
  redirect("/admin");
}

export type AdminMsg = { ok?: string; error?: string };

async function ensureAdmin() {
  if (!(await isAdmin())) throw new Error("not admin");
}

// Save manual score / knockout-team overrides for any match, then regrade.
export async function adminSaveOverrides(_prev: AdminMsg, formData: FormData): Promise<AdminMsg> {
  await ensureAdmin();
  const db = getDb();
  const all = await getAllMatches();
  let changed = 0;

  for (const m of all) {
    const set: Record<string, unknown> = {};

    // Knockout team assignment.
    if (m.stage !== "group") {
      const hc = String(formData.get(`team-home-${m.id}`) ?? "").trim();
      const ac = String(formData.get(`team-away-${m.id}`) ?? "").trim();
      if (hc && hc !== (m.homeCode ?? "")) set.homeCode = hc;
      if (ac && ac !== (m.awayCode ?? "")) set.awayCode = ac;
    }

    // Score override.
    const hs = String(formData.get(`score-home-${m.id}`) ?? "").trim();
    const as = String(formData.get(`score-away-${m.id}`) ?? "").trim();
    if (hs !== "" && as !== "") {
      const h = Number(hs);
      const a = Number(as);
      if (Number.isInteger(h) && Number.isInteger(a) && h >= 0 && a >= 0) {
        if (m.homeScore !== h || m.awayScore !== a || m.status !== "finished") {
          set.homeScore = h;
          set.awayScore = a;
          set.status = "finished";
        }
      }
    }

    if (Object.keys(set).length > 0) {
      await db.update(matches).set(set).where(eq(matches.id, m.id));
      changed++;
    }
  }

  await regradeAll();
  revalidatePath("/admin");
  revalidatePath("/");
  return { ok: `Updated ${changed} match(es) and regraded predictions.` };
}

export async function adminSyncResults(_prev: AdminMsg): Promise<AdminMsg> {
  await ensureAdmin();
  try {
    const r = await updateResultsFromApi();
    revalidatePath("/");
    return { ok: `Synced from API: ${r.updated} updated of ${r.fetched} fetched.` };
  } catch (e) {
    return { error: `Sync failed: ${String(e)}` };
  }
}

export async function adminSendDigest(_prev: AdminMsg, formData: FormData): Promise<AdminMsg> {
  await ensureAdmin();
  const date = String(formData.get("date") ?? "").trim();
  try {
    const digest = date ? await getDigestByDate(date) : await getDailyDigest();
    if (!process.env.SLACK_WEBHOOK_URL) {
      return { error: "SLACK_WEBHOOK_URL is not set." };
    }
    await postToSlack(buildDigestText(digest));
    return { ok: `Digest posted to Slack (${digest.dayMatches.length} matches).` };
  } catch (e) {
    return { error: `Slack post failed: ${String(e)}` };
  }
}
