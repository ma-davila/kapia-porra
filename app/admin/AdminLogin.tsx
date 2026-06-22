"use client";

import { useActionState } from "react";
import { adminLogin } from "./actions";

export default function AdminLogin() {
  const [state, action, pending] = useActionState(adminLogin, {} as { error?: string });
  return (
    <div className="mx-auto max-w-sm">
      <div className="card p-6">
        <h1 className="mb-4 text-center text-lg font-bold text-pitch">Admin</h1>
        <form action={action} className="space-y-3">
          <input
            name="password"
            type="password"
            placeholder="Admin password"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-kapia focus:outline-none focus:ring-1 focus:ring-kapia"
          />
          {state.error && <p className="text-sm text-red-600">{state.error}</p>}
          <button disabled={pending} className="btn w-full">
            {pending ? "..." : "Enter admin"}
          </button>
        </form>
      </div>
    </div>
  );
}
