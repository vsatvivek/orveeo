#!/usr/bin/env node
/**
 * Check if a user exists in DB.
 * Usage: node scripts/check-user.mjs your@email.com
 * Requires: DATABASE_URL in .env.local
 */

import { config } from "dotenv";
import postgres from "postgres";

config({ path: ".env.local" });

const email = process.argv[2]?.trim()?.toLowerCase();
if (!email) {
  console.log("Usage: node scripts/check-user.mjs your@email.com");
  process.exit(1);
}

const dbUrl = process.env.DATABASE_URL;
if (!dbUrl) {
  console.error("DATABASE_URL not set in .env.local");
  process.exit(1);
}

const sql = postgres(dbUrl);

console.log(`\nChecking for: ${email}\n`);

try {
  const dbUsers = await sql`SELECT id, email, created_at FROM users WHERE LOWER(email) = ${email}`;
  console.log("Database (users table):", dbUsers.length > 0 ? "FOUND" : "not found");
  if (dbUsers.length > 0) {
    console.log("  User ID:", dbUsers[0].id);
    const accounts = await sql`SELECT * FROM accounts WHERE user_id = ${dbUsers[0].id}`;
    console.log("  Accounts:", accounts.length);
  }
} catch (e) {
  console.error("DB Error:", e.message);
}

await sql.end();
console.log("\nIf DB shows FOUND: DELETE FROM users WHERE LOWER(email) = 'your@email.com';");
console.log("Also check Firebase Console > Authentication > Users\n");
