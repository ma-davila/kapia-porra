import { redirect } from "next/navigation";
import { getSession, type Session } from "./session";

// Use in server components/pages to require a logged-in user.
export async function requireUser(): Promise<Session> {
  const session = await getSession();
  if (!session) redirect("/login");
  return session;
}
