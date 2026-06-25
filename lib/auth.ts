import bcrypt from "bcryptjs";
import { eq, sql } from "drizzle-orm";
import { getDb } from "./db";
import { users } from "./schema";

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, 10);
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

// Case-insensitive lookup by display name.
export async function findUserByName(name: string) {
  const db = getDb();
  const rows = await db
    .select()
    .from(users)
    .where(sql`lower(${users.name}) = lower(${name})`)
    .limit(1);
  return rows[0] ?? null;
}

export async function createUser(name: string, password: string, slackId?: string | null) {
  const db = getDb();
  const passwordHash = await hashPassword(password);
  const rows = await db
    .insert(users)
    .values({ name, passwordHash, slackId: normalizeSlackId(slackId) })
    .returning();
  return rows[0];
}

export async function setSlackId(userId: number, slackId: string | null) {
  const db = getDb();
  await db.update(users).set({ slackId: normalizeSlackId(slackId) }).where(eq(users.id, userId));
}

export async function getUserById(userId: number) {
  const db = getDb();
  const rows = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  return rows[0] ?? null;
}

// Accept a raw Slack member ID or a pasted "<@U123>" mention; return the bare
// ID (uppercased) or null if blank. Returns undefined if the input is invalid
// so callers can surface an error.
export function normalizeSlackId(input: string | null | undefined): string | null {
  if (input == null) return null;
  let s = input.trim();
  if (s === "") return null;
  const m = s.match(/^<@([A-Za-z0-9]+)(\|[^>]*)?>$/); // "<@U123>" or "<@U123|name>"
  if (m) s = m[1];
  s = s.toUpperCase();
  return /^[UW][A-Z0-9]{6,}$/.test(s) ? s : null;
}

export async function listUserNames(): Promise<string[]> {
  const db = getDb();
  const rows = await db.select({ name: users.name }).from(users).orderBy(users.name);
  return rows.map((r) => r.name);
}

export { eq };
