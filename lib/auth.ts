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

export async function createUser(name: string, password: string) {
  const db = getDb();
  const passwordHash = await hashPassword(password);
  const rows = await db
    .insert(users)
    .values({ name, passwordHash })
    .returning();
  return rows[0];
}

export async function listUserNames(): Promise<string[]> {
  const db = getDb();
  const rows = await db.select({ name: users.name }).from(users).orderBy(users.name);
  return rows.map((r) => r.name);
}

export { eq };
