import { db } from '../src/db/client';
import { jobs } from '../src/db/schema';
import { eq, inArray } from 'drizzle-orm';

async function clearPending() {
  try {
    console.log('Clearing pending jobs from DB...');
    await db.delete(jobs).where(inArray(jobs.status, ['pending', 'uploaded', 'processing']));
    console.log('Successfully deleted all pending/uploaded/processing jobs.');
  } catch (error) {
    console.error('Failed to delete pending jobs:', error);
  }
}

clearPending();
