/*
 * Apply migrations and import the course catalog.
 * Usage: npm run db:setup  (uses DATABASE_URL, or the local PGlite database)
 */
import { importCatalog } from "./catalog";
import { connect, migrate } from "./client";

async function main() {
  const db = await connect();
  await migrate(db);
  const n = await importCatalog(db);
  console.log(`Migrations applied. ${n} courses in the catalog.`);
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
