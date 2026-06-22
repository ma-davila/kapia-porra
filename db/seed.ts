import { readFileSync } from "node:fs";
import { resolve } from "node:path";

// Minimal .env loader so `npm run db:seed` works locally without extra flags.
function loadEnv() {
  if (process.env.DATABASE_URL) return;
  try {
    const txt = readFileSync(resolve(process.cwd(), ".env"), "utf8");
    for (const line of txt.split("\n")) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/i);
      if (!m) continue;
      let v = m[2].trim();
      if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
        v = v.slice(1, -1);
      }
      if (!process.env[m[1]]) process.env[m[1]] = v;
    }
  } catch {
    // no .env file; rely on real env vars
  }
}
loadEnv();

import { seedDatabase } from "../lib/seed-core";

async function main() {
  console.log("Seeding teams and matches...");
  const r = await seedDatabase();
  console.log(`Done. ${r.teams} teams, ${r.matches} matches (${r.finished} already played).`);
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
