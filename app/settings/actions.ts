"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/guard";
import { setSlackId, normalizeSlackId } from "@/lib/auth";

export type SettingsState = { ok?: string; error?: string };

export async function saveSlackId(
  _prev: SettingsState,
  formData: FormData,
): Promise<SettingsState> {
  const session = await requireUser();
  const raw = String(formData.get("slackId") ?? "").trim();

  if (raw && normalizeSlackId(raw) === null) {
    return { error: "That Slack member ID doesn't look right (it should look like U0123ABCD)." };
  }

  await setSlackId(session.uid, raw === "" ? null : raw);
  revalidatePath("/settings");
  return {
    ok: raw === "" ? "Slack mention removed." : "Saved — the daily digest will @-mention you.",
  };
}
