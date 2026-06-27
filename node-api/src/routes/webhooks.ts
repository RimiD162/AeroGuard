import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { db } from '../db/client';
import { jobs } from '../db/schema';
import { verifyWebhookSignature } from '../lib/webhook-verify';
import { addVideoJob } from '../lib/queue';

const router = Router();

// Zod schema to handle both flat webhooks and nested S3/R2 event notification structures
const webhookPayloadSchema = z.union([
  z.object({
    bucket: z.string(),
    key: z.string(),
    size: z.number(),
    eventTime: z.string(),
  }),
  z.object({
    bucket: z.string(),
    object: z.object({
      key: z.string(),
      size: z.number(),
      eTag: z.string().optional(),
    }),
    eventTime: z.string(),
    eventType: z.string().optional(),
  }),
]);

router.post('/upload-complete', async (req: Request, res: Response) => {
  // We wrap the entire execution in a try-catch, but return 200 for internal errors
  // to avoid causing webhook retry storming from Cloudflare R2. Only signature mismatches return 401.
  try {
    // 1. Signature Verification
    const signature = req.headers['x-signature'] as string;
    const rawBody = (req as any).rawBody || '';

    if (!verifyWebhookSignature(rawBody, signature)) {
      console.warn('Unauthorized Webhook Access: Invalid signature provided.');
      return res.status(401).json({ error: 'Unauthorized. Invalid signature.' });
    }

    // 2. Parse Event Payload
    const parsed = webhookPayloadSchema.safeParse(req.body);
    if (!parsed.success) {
      console.warn('Webhook Parsing Error: Invalid payload structure.', parsed.error.issues);
      // Return 200 as per R2 fault tolerance design
      return res.status(200).json({ status: 'ignored', error: 'Invalid payload structure.' });
    }

    // Extract unified properties based on payload format
    const payload = parsed.data;
    const bucket = 'object' in payload ? payload.bucket : payload.bucket;
    const key = 'object' in payload ? payload.object.key : payload.key;
    const size = 'object' in payload ? payload.object.size : payload.size;
    const eventTime = payload.eventTime;

    console.log(`Received upload-complete webhook for bucket: ${bucket}, key: ${key}, size: ${size} bytes`);

    // 3. Query Jobs Table
    const existingJobs = await db.select().from(jobs).where(eq(jobs.r2ObjectKey, key)).limit(1);
    const job = existingJobs[0];

    if (!job) {
      console.warn(`Webhook Anomaly: Received notification for unknown R2 key: ${key}. Stale or deleted job?`);
      return res.status(200).json({ status: 'ignored', message: 'No matching job record found.' });
    }

    // 4. Idempotency Check
    const queuedOrLater = ['queued', 'processing', 'completed', 'failed', 'purged'];
    if (queuedOrLater.includes(job.status)) {
      console.log(`Webhook Idempotency: Job ${job.id} is already in state "${job.status}". Skipping.`);
      return res.status(200).json({ status: 'ok', message: 'Job already enqueued or processed.' });
    }

    // 5. Validate file size tolerance (warn on mismatch larger than 5%)
    if (job.fileSizeBytes) {
      const expectedSize = job.fileSizeBytes;
      const difference = Math.abs(expectedSize - size);
      const maxDiff = expectedSize * 0.05; // 5% tolerance
      
      if (difference > maxDiff) {
        console.warn(
          `Webhook Warning: File size mismatch for job ${job.id}. Presigned expected: ${expectedSize} bytes, Webhook uploaded: ${size} bytes.`
        );
      }
    }

    // 6. Update Job: Status = "uploaded"
    await db
      .update(jobs)
      .set({
        status: 'uploaded',
        updatedAt: new Date(),
      })
      .where(eq(jobs.id, job.id));

    // 7. Enqueue BullMQ Task
    await addVideoJob({
      jobId: job.id,
      r2ObjectKey: key,
      fileSizeBytes: size,
      uploadedAt: eventTime,
    });

    // 8. Update Job: Status = "queued"
    await db
      .update(jobs)
      .set({
        status: 'queued',
        updatedAt: new Date(),
      })
      .where(eq(jobs.id, job.id));

    return res.status(200).json({
      status: 'ok',
      jobId: job.id,
      message: 'Successfully queued video processing task.',
    });
  } catch (error) {
    console.error('Fatal Webhook Error:', error);
    // Always return 200 to R2 on internal errors to prevent infinite webhook retries
    return res.status(200).json({
      status: 'error',
      message: 'Internal processing failure logged successfully.',
    });
  }
});

export default router;
