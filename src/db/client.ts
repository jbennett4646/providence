import { mkdirSync } from "node:fs";
import path from "node:path";
import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";
import * as schema from "./schema";

/** Either driver: node-postgres in production, PGlite for local development and tests. */
export type Db = PgDatabase<PgQueryResultHKT, typeof schema>;

const drivers = new WeakMap<Db, "pg" | "pglite">();

export const MIGRATIONS_DIR = path.join(process.cwd(), "drizzle");

/** Default PGlite data directory when DATABASE_URL is not set. */
export const LOCAL_DATA_DIR = path.join(process.cwd(), ".data", "pglite");

/**
 * Connect to Postgres at DATABASE_URL. Without it, outside production, use an
 * embedded PGlite database under .data/ so the app runs with no setup.
 */
export async function connect(url = process.env.DATABASE_URL): Promise<Db> {
  if (url) {
    const { drizzle } = await import("drizzle-orm/node-postgres");
    const db = drizzle(url, { schema }) as unknown as Db;
    drivers.set(db, "pg");
    return db;
  }
  if (process.env.NODE_ENV === "production") {
    throw new Error("DATABASE_URL must be set in production");
  }
  return connectPglite(LOCAL_DATA_DIR);
}

/** An embedded PGlite database: on disk at `dataDir`, or in memory if omitted. */
export async function connectPglite(dataDir?: string): Promise<Db> {
  const { PGlite } = await import("@electric-sql/pglite");
  if (dataDir) mkdirSync(dataDir, { recursive: true });
  const { drizzle } = await import("drizzle-orm/pglite");
  const db = drizzle(new PGlite(dataDir), { schema }) as unknown as Db;
  drivers.set(db, "pglite");
  return db;
}

/** Apply pending migrations from drizzle/. */
export async function migrate(db: Db): Promise<void> {
  if (drivers.get(db) === "pglite") {
    const { migrate: run } = await import("drizzle-orm/pglite/migrator");
    await run(db as never, { migrationsFolder: MIGRATIONS_DIR });
  } else {
    const { migrate: run } = await import("drizzle-orm/node-postgres/migrator");
    await run(db as never, { migrationsFolder: MIGRATIONS_DIR });
  }
}

let shared: Promise<Db> | undefined;

/** The app's shared connection, opened on first use. */
export function getDb(): Promise<Db> {
  shared ??= connect();
  return shared;
}
