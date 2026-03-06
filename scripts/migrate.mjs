#!/usr/bin/env node
import { config } from "dotenv";
import { spawnSync } from "child_process";
import { existsSync } from "fs";
import { join } from "path";

config({ path: ".env.local" });

if (!process.env.DATABASE_URL) {
  console.error("\x1b[31mError:\x1b[0m DATABASE_URL is not set in .env.local");
  process.exit(1);
}

// Auto-generate migrations if journal is missing
const journalPath = join(process.cwd(), "drizzle", "meta", "_journal.json");
if (!existsSync(journalPath)) {
  console.log("\x1b[33mNo migrations found. Generating...\x1b[0m\n");
  const gen = spawnSync("npx", ["drizzle-kit", "generate"], {
    encoding: "utf8",
    stdio: "inherit",
    shell: true,
    env: process.env,
  });
  if (gen.status !== 0) {
    console.error("\x1b[31mError:\x1b[0m Failed to generate migrations.");
    process.exit(gen.status);
  }
  console.log("");
}

const result = spawnSync("npx", ["drizzle-kit", "migrate"], {
  encoding: "utf8",
  stdio: ["inherit", "pipe", "pipe"],
  shell: true,
  env: process.env,
});

const output = (result.stdout || "") + (result.stderr || "");
console.log(result.stdout || "");
if (result.stderr) console.error(result.stderr);

if (result.status !== 0) {
  const err = formatMigrationError(output);
  if (err) {
    console.error("\n\x1b[31mMigration failed.\x1b[0m\n");
    console.error(err);
  }
  process.exit(result.status ?? 1);
}

function formatMigrationError(output) {
  const lines = [];

  if (output.includes("already exists") || output.includes("42P07")) {
    lines.push("\x1b[33mTables already exist\x1b[0m — Database has schema from a previous setup.");
    lines.push("");
    lines.push("  Fix: Reset the database, then migrate:");
    lines.push("    \x1b[1mnpm run db:reset\x1b[0m");
    lines.push("");
    lines.push("  Or manually:");
    lines.push('    psql -U postgres -c "DROP DATABASE orveeo;"');
    lines.push('    psql -U postgres -c "CREATE DATABASE orveeo;"');
    lines.push("    npm run db:migrate");
    return lines.join("\n");
  }

  if (output.includes("meta/_journal.json") || output.includes("_journal.json")) {
    lines.push("\x1b[33mNo migrations found\x1b[0m — Run db:generate first.");
    lines.push("");
    lines.push("  Fix: \x1b[1mnpm run db:generate\x1b[0m");
    return lines.join("\n");
  }

  if (output.includes("cannot be cast") || output.includes("42804")) {
    lines.push("\x1b[33mSchema drift\x1b[0m — Existing column type differs from migration.");
    lines.push("");
    lines.push("  Fix: Reset the database: \x1b[1mnpm run db:reset\x1b[0m");
    lines.push("  Or add a migration with USING clause for the type change.");
    return lines.join("\n");
  }

  if (output.includes("password authentication failed") || output.includes("28P01")) {
    lines.push("\x1b[33mAuthentication failed\x1b[0m — Invalid database credentials.");
    lines.push("");
    lines.push("  Fix: Check DATABASE_URL in .env.local (username and password).");
    return lines.join("\n");
  }

  if (output.includes("ECONNREFUSED") || output.includes("connection refused") || output.includes("connect")) {
    lines.push("\x1b[33mConnection refused\x1b[0m — Cannot reach PostgreSQL.");
    lines.push("");
    lines.push("  Fix: Ensure PostgreSQL is running and DATABASE_URL host/port are correct.");
    return lines.join("\n");
  }

  if (output.includes("does not exist") || output.includes("3D000")) {
    lines.push("\x1b[33mDatabase does not exist\x1b[0m — Create it first.");
    lines.push("");
    lines.push("  Fix: psql -U postgres -c \"CREATE DATABASE orveeo;\"");
    return lines.join("\n");
  }

  // Generic fallback
  lines.push("Common fixes:");
  lines.push("  • Tables exist? Run \x1b[1mnpm run db:reset\x1b[0m");
  lines.push("  • No migrations? Run \x1b[1mnpm run db:generate\x1b[0m first");
  lines.push("  • Wrong credentials? Check DATABASE_URL in .env.local");
  return lines.join("\n");
}
