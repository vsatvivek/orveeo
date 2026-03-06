#!/usr/bin/env node
import { config } from "dotenv";
import postgres from "postgres";
import { spawnSync } from "child_process";

config({ path: ".env.local" });

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("\x1b[31mError:\x1b[0m DATABASE_URL is not set in .env.local");
  process.exit(1);
}

// Parse database name from URL: postgresql://user:pass@host:port/dbname
let dbName;
try {
  const url = new URL(DATABASE_URL.replace(/^postgresql:\/\//, "postgres://"));
  dbName = (url.pathname.slice(1) || "orveeo").split("?")[0];
} catch {
  console.error("\x1b[31mError:\x1b[0m Invalid DATABASE_URL format");
  process.exit(1);
}

if (!/^[a-zA-Z0-9_]+$/.test(dbName)) {
  console.error("\x1b[31mError:\x1b[0m Invalid database name (use only letters, numbers, underscore)");
  process.exit(1);
}

// Admin connection: connect to 'postgres' database to drop/create target db
const adminUrl = DATABASE_URL.replace(/\/([^/?]+)(\?.*)?$/, "/postgres$2");

async function reset() {
  const sql = postgres(adminUrl, { max: 1 });

  try {
    console.log(`\x1b[33mResetting database\x1b[0m: ${dbName}`);
    await sql.unsafe(`SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '${dbName}' AND pid <> pg_backend_pid()`);
    await sql.unsafe(`DROP DATABASE IF EXISTS "${dbName}"`);
    await sql.unsafe(`CREATE DATABASE "${dbName}"`);
    await sql.end();
    console.log("\x1b[32mDatabase reset complete.\x1b[0m\n");
  } catch (err) {
    await sql.end();
    console.error("\x1b[31mReset failed:\x1b[0m", err.message);
    if (err.message?.includes("password authentication failed")) {
      console.error("\n  Check DATABASE_URL credentials in .env.local");
    } else if (err.message?.includes("connect") || err.message?.includes("ECONNREFUSED")) {
      console.error("\n  Ensure PostgreSQL is running and reachable.");
    }
    process.exit(1);
  }

  const result = spawnSync("npx", ["drizzle-kit", "migrate"], {
    encoding: "utf8",
    stdio: ["inherit", "pipe", "pipe"],
    shell: true,
    env: process.env,
  });

  console.log(result.stdout || "");
  if (result.stderr) console.error(result.stderr);

  if (result.status !== 0) {
    console.error("\x1b[31mMigration failed after reset.\x1b[0m Run \x1b[1mnpm run db:generate\x1b[0m if needed.");
    process.exit(result.status);
  }
  console.log("\x1b[32mMigrations applied successfully.\x1b[0m");
}

reset();
