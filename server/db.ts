import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from '@shared/schema';

// Create the connection
const connectionString = process.env.DATABASE_URL!;
const client = postgres(connectionString);
export const db = drizzle(client, { schema });

/**
 * Run safe schema migrations on startup.
 * Uses IF NOT EXISTS so they're idempotent and safe to run every time.
 */
export async function runAutoMigrations() {
  try {
    await client`ALTER TABLE users ADD COLUMN IF NOT EXISTS has_seen_tutorial BOOLEAN DEFAULT false`;
    console.log('Auto-migrations completed');
  } catch (err) {
    console.error('Auto-migration warning:', err);
    // Don't crash the server — the column may already exist
  }
}