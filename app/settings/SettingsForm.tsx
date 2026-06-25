"use client";

import { useActionState } from "react";
import { saveSlackId, type SettingsState } from "./actions";

const initial: SettingsState = {};

export default function SettingsForm({ current }: { current: string | null }) {
  const [state, action, pending] = useActionState(saveSlackId, initial);

  return (
    <form action={action} className="space-y-3">
      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700">Slack member ID</label>
        <input
          name="slackId"
          defaultValue={current ?? ""}
          className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-kapia focus:outline-none focus:ring-1 focus:ring-kapia"
          placeholder="U0123ABCD"
        />
        <p className="mt-1 text-xs text-slate-400">
          In Slack: click your profile → ⋮ More → <strong>Copy member ID</strong>. Leave blank to
          stop being mentioned.
        </p>
      </div>
      {state.error && <p className="text-sm text-red-600">{state.error}</p>}
      {state.ok && <p className="text-sm font-medium text-zinc-900">{state.ok}</p>}
      <button disabled={pending} className="btn">
        {pending ? "Saving..." : "Save"}
      </button>
    </form>
  );
}
