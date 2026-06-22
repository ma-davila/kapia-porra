import { NextResponse } from "next/server";
import { seedDatabase } from "@/lib/seed-core";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// One-time (idempotent) seed, protected by ADMIN_PASSWORD.
// Call: /api/seed?secret=YOUR_ADMIN_PASSWORD
async function run(req: Request) {
  const secret = process.env.ADMIN_PASSWORD;
  const url = new URL(req.url);
  if (!secret || url.searchParams.get("secret") !== secret) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  try {
    const r = await seedDatabase();
    return NextResponse.json({ ok: true, ...r });
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e) }, { status: 500 });
  }
}

export async function GET(req: Request) {
  return run(req);
}
export async function POST(req: Request) {
  return run(req);
}
