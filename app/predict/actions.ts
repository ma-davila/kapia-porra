"use server";

import { getDb } from "@/lib/db";
import { predictions } from "@/lib/schema";
import { getAllMatches } from "@/lib/standings";
import { requireUser } from "@/lib/guard";
import { revalidatePath } from "next/cache";

export type SaveState = { saved?: number; error?: string };

export async function savePredictions(
  _prev: SaveState,
  formData: FormData,
): Promise<SaveState> {
  const session = await requireUser();
  const db = getDb();
  const all = await getAllMatches();
  const byId = new Map(all.map((m) => [m.id, m]));
  const now = Date.now();

  let saved = 0;
  // Inputs come as home-<id> / away-<id>.
  const ids = new Set<number>();
  for (const key of formData.keys()) {
    const m = key.match(/^(home|away)-(\d+)$/);
    if (m) ids.add(Number(m[2]));
  }

  for (const id of ids) {
    const match = byId.get(id);
    if (!match) continue;
    // Editable only if both teams known and not yet kicked off.
    if (!match.homeCode || !match.awayCode) continue;
    if (new Date(match.kickoff).getTime() <= now) continue;

    const hRaw = String(formData.get(`home-${id}`) ?? "").trim();
    const aRaw = String(formData.get(`away-${id}`) ?? "").trim();
    if (hRaw === "" || aRaw === "") continue; // leave blank = no prediction

    const h = Number(hRaw);
    const a = Number(aRaw);
    if (!Number.isInteger(h) || !Number.isInteger(a) || h < 0 || a < 0 || h > 99 || a > 99) {
      return { error: "Scores must be whole numbers between 0 and 99." };
    }

    await db
      .insert(predictions)
      .values({ userId: session.uid, matchId: id, homeScore: h, awayScore: a })
      .onConflictDoUpdate({
        target: [predictions.userId, predictions.matchId],
        set: { homeScore: h, awayScore: a, updatedAt: new Date() },
      });
    saved++;
  }

  revalidatePath("/predict");
  return { saved };
}
