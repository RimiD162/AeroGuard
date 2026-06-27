import { neon, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from './schema';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config();
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

// Ensure Neon serverless is configured for HTTP requests
const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error('DATABASE_URL is not defined in environment variables.');
}

const sql = neon(databaseUrl);
export const db = drizzle(sql, { schema });
export type DatabaseClient = typeof db;
