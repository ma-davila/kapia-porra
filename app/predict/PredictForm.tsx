"use client";

import { useActionState } from "react";
import { savePredictions, type SaveState } from "./actions";

export type EditableMatch = {
  id: number;
  dayLabel: string;
  time: string;
  stageLabel: string;
  homeFlag: string;
  homeName: string;
  awayFlag: string;
  awayName: string;
  predHome: number | null;
  predAway: number | null;
};

const initial: SaveState = {};

export default function PredictForm({ matches }: { matches: EditableMatch[] }) {
  const [state, formAction, pending] = useActionState(savePredictions, initial);

  // Group by day for display.
  const byDay = new Map<string, EditableMatch[]>();
  for (const m of matches) {
    if (!byDay.has(m.dayLabel)) byDay.set(m.dayLabel, []);
    byDay.get(m.dayLabel)!.push(m);
  }

  if (matches.length === 0) {
    return (
      <div className="card p-6 text-center text-sm text-slate-500">
        No upcoming matches are open for predictions right now.
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-5">
      {[...byDay.entries()].map(([day, list]) => (
        <div key={day} className="card overflow-hidden">
          <div className="bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700">{day}</div>
          <ul className="divide-y divide-slate-100">
            {list.map((m) => (
              <li key={m.id} className="flex items-center gap-2 px-4 py-3">
                <div className="w-14 shrink-0 text-xs text-slate-400">
                  {m.time}
                  <div className="text-[10px] uppercase">{m.stageLabel}</div>
                </div>
                <div className="flex flex-1 items-center justify-end gap-2 text-sm">
                  <span className="text-right font-medium">{m.homeName}</span>
                  <span>{m.homeFlag}</span>
                </div>
                <input
                  name={`home-${m.id}`}
                  type="number"
                  min={0}
                  max={99}
                  defaultValue={m.predHome ?? ""}
                  className="score-input"
                  aria-label={`${m.homeName} score`}
                />
                <span className="text-slate-300">:</span>
                <input
                  name={`away-${m.id}`}
                  type="number"
                  min={0}
                  max={99}
                  defaultValue={m.predAway ?? ""}
                  className="score-input"
                  aria-label={`${m.awayName} score`}
                />
                <div className="flex flex-1 items-center gap-2 text-sm">
                  <span>{m.awayFlag}</span>
                  <span className="font-medium">{m.awayName}</span>
                </div>
              </li>
            ))}
          </ul>
        </div>
      ))}

      <div className="sticky bottom-4 z-10 flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white/95 px-4 py-3 shadow-lg backdrop-blur">
        <div className="text-sm">
          {state.error && <span className="text-red-600">{state.error}</span>}
          {state.saved != null && !state.error && (
            <span className="text-green-700">Saved {state.saved} prediction(s). ✅</span>
          )}
          {state.saved == null && !state.error && (
            <span className="text-slate-400">Fill in scores and save. Locks at kick-off.</span>
          )}
        </div>
        <button type="submit" disabled={pending} className="btn">
          {pending ? "Saving..." : "Save predictions"}
        </button>
      </div>
    </form>
  );
}
