import { Client } from 'pg';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

async function runMigration() {
  const connectionString = process.env.DATABASE_URL;
  
  let client: Client;

  if (connectionString) {
    console.log('Connecting to database using DATABASE_URL...');
    client = new Client({
      connectionString,
      ssl: {
        rejectUnauthorized: false, // Required for NeonDB connection
      },
    });
  } else {
    console.log('DATABASE_URL not found, falling back to individual PG_* variables...');
    client = new Client({
      host: process.env.PG_HOST || 'localhost',
      database: process.env.PG_DATABASE || 'aeroguard_db',
      user: process.env.PG_USER || 'postgres',
      password: process.env.PG_PASSWORD || 'postgres',
      port: parseInt(process.env.PG_PORT || '5432'),
      ssl: process.env.PG_HOST && !process.env.PG_HOST.includes('localhost') 
        ? { rejectUnauthorized: false } 
        : undefined,
    });
  }

  try {
    await client.connect();
    console.log('Successfully connected to database.');

    const schemaPath = path.join(__dirname, 'schema.sql');
    console.log(`Reading schema DDL from: ${schemaPath}`);
    const schemaSql = fs.readFileSync(schemaPath, 'utf8');

    console.log('Applying DDL schema to database...');
    await client.query(schemaSql);
    console.log('Schema migration completed successfully!');
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

runMigration();
