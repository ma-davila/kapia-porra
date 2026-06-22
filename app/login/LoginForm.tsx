"use client";

import { useActionState } from "react";
import { loginOrRegister, type LoginState } from "./actions";

const initial: LoginState = {};

export default function LoginForm() {
  const [state, formAction, pending] = useActionState(loginOrRegister, initial);

  return (
    <form action={formAction} className="space-y-4">
      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700">Your name</label>
        <input
          name="name"
          autoComplete="username"
          required
          className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-kapia focus:outline-none focus:ring-1 focus:ring-kapia"
          placeholder="e.g. Miguel Ángel"
        />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700">Password</label>
        <input
          name="password"
          type="password"
          autoComplete="current-password"
          required
          className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-kapia focus:outline-none focus:ring-1 focus:ring-kapia"
          placeholder="Set it on first login, reuse after"
        />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700">
          Invite code <span className="font-normal text-slate-400">(first time only)</span>
        </label>
        <input
          name="invite"
          className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-kapia focus:outline-none focus:ring-1 focus:ring-kapia"
          placeholder="Kapia invite code"
        />
      </div>

      {state.error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>
      )}

      <button type="submit" disabled={pending} className="btn w-full">
        {pending ? "..." : "Enter"}
      </button>
      <p className="text-center text-xs text-slate-500">
        New here? Pick your name, choose a password, and enter the invite code to register.
      </p>
    </form>
  );
}
