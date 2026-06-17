import { db } from './db/client';
import { metrics as metricsTable } from './db/schema';
import { ExtractedMetric } from './types';

/**
 * Persists frame metrics to NeonDB.
 * Splits large batches into chunks of 1000 and inserts them sequentially.
 * 
 * @param jobId The database UUID of the video job
 * @param metrics List of metrics to insert
 */
export async function bulkInsertMetrics(jobId: string, metrics: ExtractedMetric[]): Promise<void> {
  if (metrics.length === 0) {
    console.log(`No metrics to persist for job: ${jobId}`);
    return;
  }

  const chunkSize = 1000;
  console.log(`Persisting ${metrics.length} metrics to database for job: ${jobId}...`);

  for (let i = 0; i < metrics.length; i += chunkSize) {
    const chunk = metrics.slice(i, i + chunkSize);
    
    // Perform database insertion for the current chunk
    await db.insert(metricsTable).values(chunk);
  }

  console.log(`Successfully persisted all ${metrics.length} metrics for job: ${jobId}`);
}
