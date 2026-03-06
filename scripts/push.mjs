#!/usr/bin/env node
import { config } from "dotenv";
import { spawnSync } from "child_process";

config({ path: ".env.local" });

if (!process.env.DATABASE_URL) {
  console.error("\x1b[31mError:\x1b[0m DATABASE_URL is not set in .env.local");
  process.exit(1);
}

const result = spawnSync("npx", ["drizzle-kit", "push"], {
  encoding: "utf8",
  stdio: ["inherit", "pipe", "pipe"],
  shell: true,
  env: process.env,
});

const output = (result.stdout || "") + (result.stderr || "");
console.log(result.stdout || "");
if (result.stderr) console.error(result.stderr);

if (result.status !== 0) {
  const err = formatPushError(output);
  if (err) {
    console.error("\n\x1b[31mPush failed.\x1b[0m\n");
    console.error(err);
  }
  process.exit(result.status ?? 1);
}

function formatPushError(output) {
  const lines = [];

  if (output.includes("cannot be cast") || output.includes("42804") || output.includes("USING")) {
    lines.push("\x1b[33mColumn type mismatch\x1b[0m — Existing column cannot be cast to new type.");
    lines.push("");
    lines.push("  Fix: Reset the database: \x1b[1mnpm run db:reset\x1b[0m");
    lines.push("  Or manually alter the column in PostgreSQL.");
    return lines.join("\n");
  }

  if (output.includes("password authentication failed") || output.includes("28P01")) {
    lines.push("\x1b[33mAuthentication failed\x1b[0m — Invalid database credentials.");
    lines.push("");
    lines.push("  Fix: Check DATABASE_URL in .env.local (username and password).");
    return lines.join("\n");
  }

  if (output.includes("ECONNREFUSED") || output.includes("connection refused")) {
    lines.push("\x1b[33mConnection refused\x1b[0m — Cannot reach PostgreSQL.");
    lines.push("");
    lines.push("  Fix: Ensure PostgreSQL is running.");
    return lines.join("\n");
  }

  if (output.includes("ENOTFOUND") || output.includes("getaddrinfo")) {
    lines.push("\x1b[33mHost not found (ENOTFOUND)\x1b[0m — Cannot resolve database hostname.");
    lines.push("");
    lines.push("  For Supabase: Use the \x1b[1mpooler\x1b[0m URL, not the direct connection.");
    lines.push("  Dashboard → Settings → Database → Connection string → URI");
    lines.push("  Choose \x1b[1mTransaction pooler\x1b[0m (port 6543):");
    lines.push("  postgresql://postgres.[PROJECT_REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres");
    lines.push("");
    lines.push("  If the project is paused (free tier), unpause it in the dashboard.");
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
  lines.push("  • Type mismatch? Run \x1b[1mnpm run db:reset\x1b[0m to start fresh");
  lines.push("  • Wrong credentials? Check DATABASE_URL in .env.local");
  return lines.join("\n");
}
