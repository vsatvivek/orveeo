import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const connectionString = process.env.DATABASE_URL!;

// For serverless (Vercel, Supabase): use connection pooler URL (port 6543) and limit connections
const isServerless = process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME;
const client = postgres(connectionString, {
  prepare: false,
  max: isServerless ? 1 : 10,
});

export const db = drizzle(client, { schema });
