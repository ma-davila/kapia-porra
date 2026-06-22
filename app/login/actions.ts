"use server";

import { redirect } from "next/navigation";
import { findUserByName, createUser, verifyPassword } from "@/lib/auth";
import { setSessionCookie } from "@/lib/session";

export type LoginState = { error?: string };

export async function loginOrRegister(
  _prev: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const name = String(formData.get("name") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const invite = String(formData.get("invite") ?? "").trim();

  if (!name || !password) {
    return { error: "Please enter your name and a password." };
  }
  if (password.length < 4) {
    return { error: "Password must be at least 4 characters." };
  }

  const existing = await findUserByName(name);

  if (existing) {
    const ok = await verifyPassword(password, existing.passwordHash);
    if (!ok) return { error: "Wrong password for this name." };
    await setSessionCookie({ uid: existing.id, name: existing.name });
  } else {
    // New account — gate registration behind the invite code.
    const expected = process.env.INVITE_CODE;
    if (!expected || invite !== expected) {
      return {
        error:
          "That name isn't registered yet. Enter the Kapia invite code to create your account.",
      };
    }
    let user;
    try {
      user = await createUser(name, password);
    } catch {
      return { error: "Could not create the account (name may already be taken)." };
    }
    await setSessionCookie({ uid: user.id, name: user.name });
  }

  redirect("/");
}
