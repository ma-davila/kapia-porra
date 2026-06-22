"use client";

import { useActionState } from "react";
import {
  adminSaveOverrides,
  adminSyncResults,
  adminSendDigest,
  adminLogout,
  type AdminMsg,
} from "./actions";

export type AdminTeam = { code: string; name: string; flag: string };
export type AdminMatch = {
  id: number;
  stage: string;
  stageLabel: string;
  when: string;
  homeCode: string | null;
  awayCode: string | null;
  homeName: string;
  awayName: string;
  homeScore: number | null;
  awayScore: number | null;
  status: string;
};

const empty: AdminMsg = {};

function Banner({ msg }: { msg: AdminMsg }) {
  if (msg.ok) return <p className="text-sm text-green-700">{msg.ok}</p>;
  if (msg.error) return <p className="text-sm text-red-600">{msg.error}</p>;
  return null;
}

export default function AdminPanel({
  matches,
  teams,
}: {
  matches: AdminMatch[];
  teams: AdminTeam[];
}) {
  const [syncState, syncAction, syncPending] = useActionState(adminSyncResults, empty);
  const [digestState, digestAction, digestPending] = useActionState(adminSendDigest, empty);
  const [saveState, saveAction, savePending] = useActionState(adminSaveOverrides, empty);

  return (
    <div className="space-y-6">
      <div className="card flex flex-wrap items-center justify-between gap-3 p-4">
        <h1 className="text-lg font-bold text-pitch">Admin tools</h1>
        <form action={adminLogout}>
          <button className="btn-ghost">Log out of admin</button>
        </form>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="card space-y-2 p-4">
          <h2 className="font-semibold">Sync results from API</h2>
          <p className="text-sm text-slate-500">
            Pulls recent scores from football-data.org and regrades predictions.
          </p>
          <form action={syncAction}>
            <button disabled={syncPending} className="btn">
              {syncPending ? "Syncing..." : "Sync now"}
            </button>
          </form>
          <Banner msg={syncState} />
        </div>

        <div className="card space-y-2 p-4">
          <h2 className="font-semibold">Post Slack digest</h2>
          <p className="text-sm text-slate-500">
            Optional date (YYYY-MM-DD, Madrid). Blank = last 24h.
          </p>
          <form action={digestAction} className="flex items-center gap-2">
            <input
              name="date"
              placeholder="2026-06-23"
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
            <button disabled={digestPending} className="btn">
              {digestPending ? "Posting..." : "Post to Slack"}
            </button>
          </form>
          <Banner msg={digestState} />
        </div>
      </div>

      <form action={saveAction} className="card">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 p-4">
          <div>
            <h2 className="font-semibold">Manual overrides</h2>
            <p className="text-sm text-slate-500">
              Set scores (marks the match finished) or assign knockout teams. Then save to regrade.
            </p>
          </div>
          <button disabled={savePending} className="btn">
            {savePending ? "Saving..." : "Save overrides"}
          </button>
        </div>
        <div className="p-2">
          <Banner msg={saveState} />
        </div>
        <div className="max-h-[60vh] overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-white">
              <tr className="border-b border-slate-200 text-[11px] uppercase text-slate-400">
                <th className="px-2 py-2 text-left">#</th>
                <th className="px-2 text-left">Stage</th>
                <th className="px-2 text-left">When</th>
                <th className="px-2 text-left">Match</th>
                <th className="px-2 text-center">Score</th>
              </tr>
            </thead>
            <tbody>
              {matches.map((m) => (
                <tr key={m.id} className="border-b border-slate-100">
                  <td className="px-2 py-1.5 text-slate-400">{m.id}</td>
                  <td className="px-2 text-slate-500">{m.stageLabel}</td>
                  <td className="px-2 text-xs text-slate-400">{m.when}</td>
                  <td className="px-2">
                    {m.stage === "group" ? (
                      <span>
                        {m.homeName} <span className="text-slate-300">v</span> {m.awayName}
                      </span>
                    ) : (
                      <div className="flex items-center gap-1">
                        <select
                          name={`team-home-${m.id}`}
                          defaultValue={m.homeCode ?? ""}
                          className="rounded border border-slate-300 px-1 py-0.5 text-xs"
                        >
                          <option value="">{m.homeName}</option>
                          {teams.map((t) => (
                            <option key={t.code} value={t.code}>
                              {t.flag} {t.name}
                            </option>
                          ))}
                        </select>
                        <span className="text-slate-300">v</span>
                        <select
                          name={`team-away-${m.id}`}
                          defaultValue={m.awayCode ?? ""}
                          className="rounded border border-slate-300 px-1 py-0.5 text-xs"
                        >
                          <option value="">{m.awayName}</option>
                          {teams.map((t) => (
                            <option key={t.code} value={t.code}>
                              {t.flag} {t.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                  </td>
                  <td className="px-2">
                    <div className="flex items-center justify-center gap-1">
                      <input
                        name={`score-home-${m.id}`}
                        type="number"
                        min={0}
                        defaultValue={m.homeScore ?? ""}
                        className="w-10 rounded border border-slate-300 px-1 py-0.5 text-center"
                      />
                      <span className="text-slate-300">:</span>
                      <input
                        name={`score-away-${m.id}`}
                        type="number"
                        min={0}
                        defaultValue={m.awayScore ?? ""}
                        className="w-10 rounded border border-slate-300 px-1 py-0.5 text-center"
                      />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </form>
    </div>
  );
}
