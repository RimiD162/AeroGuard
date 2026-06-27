import { Pool } from 'pg';
import * as dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false } // Required for Neon
});

async function runMigration() {
  const client = await pool.connect();
  try {
    console.log('Starting migration to add missing columns to jobs table...');
    
    // Use IF NOT EXISTS to avoid errors if they already exist
    await client.query(`
      ALTER TABLE jobs 
      ADD COLUMN IF NOT EXISTS aircraft_model TEXT,
      ADD COLUMN IF NOT EXISTS registration_number TEXT,
      ADD COLUMN IF NOT EXISTS tail_number TEXT,
      ADD COLUMN IF NOT EXISTS inspection_type TEXT,
      ADD COLUMN IF NOT EXISTS metadata JSONB;
    `);

    console.log('Migration completed successfully.');
  } catch (err) {
    console.error('Migration failed:', err);
  } finally {
    client.release();
    await pool.end();
  }
}

runMigration();
