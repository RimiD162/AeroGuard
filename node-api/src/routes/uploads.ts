import { Router, Request, Response } from 'express';
import { z } from 'zod';
import * as crypto from 'crypto';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { db } from '../db/client';
import { jobs } from '../db/schema';
import { r2Client } from '../lib/r2-client';
import { eq } from 'drizzle-orm';
import { addVideoJob, getExistingVideoJob } from '../lib/queue';

const router = Router();

// Constraints
const MAX_UPLOAD_SIZE_BYTES = 10 * 1024 * 1024 * 1024; // 10 GB
const ALLOWED_VIDEO_TYPES = ['video/mp4', 'video/quicktime', 'video/x-msvideo'];

// Zod validation schema
const presignRequestSchema = z.object({
  filename: z.string().min(1, 'filename must not be empty'),
  fileSizeBytes: z.number().int().positive('fileSizeBytes must be a positive integer'),
  contentType: z.string().min(1, 'contentType must not be empty'),
});

// Helper: Sanitize filename
function sanitizeFilename(filename: string): string {
  // Replace characters other than alphanumeric, dots, dashes, and underscores with underscores
  return filename.replace(/[^a-zA-Z0-9.\-_]/g, '_');
}

router.post('/presign', async (req: Request, res: Response) => {
  try {
    // 1. Zod request validation
    const parsed = presignRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        error: 'Missing or invalid fields.',
        details: parsed.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`),
      });
    }

    const { filename, fileSizeBytes, contentType } = parsed.data;

    // 2. Validate file size (<= 10GB)
    if (fileSizeBytes > MAX_UPLOAD_SIZE_BYTES) {
      return res.status(413).json({
        error: 'File size exceeds maximum upload limit of 10GB.',
      });
    }

    // 3. Validate content type (MP4, MOV, AVI)
    if (!ALLOWED_VIDEO_TYPES.includes(contentType)) {
      return res.status(415).json({
        error: 'Unsupported media type. Only MP4, MOV, and AVI videos are allowed.',
      });
    }

    // 4. Generate R2 object key
    const sanitizedName = sanitizeFilename(filename);
    const r2ObjectKey = `uploads/${crypto.randomUUID()}-${sanitizedName}`;
    const jobId = crypto.randomUUID();

    // 5. Insert pending job row via Drizzle
    await db.insert(jobs).values({
      id: jobId,
      r2ObjectKey,
      originalFilename: filename,
      fileSizeBytes,
      status: 'pending',
    });

    // 6. Generate S3 presigned PUT URL
    let bucketName = process.env.R2_BUCKET_NAME;
    if (!bucketName && process.env.CLOUDFLARE_R2_URL) {
      try {
        const parsedUrl = new URL(process.env.CLOUDFLARE_R2_URL);
        bucketName = parsedUrl.pathname.replace(/^\//, '');
      } catch (err) {
        console.error('Failed to parse CLOUDFLARE_R2_URL for R2_BUCKET_NAME:', err);
      }
    }
    bucketName = bucketName || 'aeroguard-videos';

    const command = new PutObjectCommand({
      Bucket: bucketName,
      Key: r2ObjectKey,
      ContentType: contentType,
    });

    const expirySeconds = Number(process.env.PRESIGNED_URL_EXPIRY_SECONDS || 900);
    const uploadUrl = await getSignedUrl(r2Client, command, { expiresIn: expirySeconds });
    const expiresAt = new Date(Date.now() + expirySeconds * 1000).toISOString();

    // 7. Return payload
    return res.status(200).json({
      uploadUrl,
      r2ObjectKey,
      jobId,
      expiresAt,
    });
  } catch (error) {
    // Log the actual error internally
    console.error('Error in /uploads/presign:', error);

    // Return safe 500 error without leaking internal details
    return res.status(500).json({
      error: 'Failed to generate presigned upload URL due to an internal server error.',
    });
  }
});

router.post('/upload-success', async (req: Request, res: Response) => {
  try {
    const { jobId } = req.body;
    if (!jobId) {
      console.warn('[upload-success] Request missing jobId.');
      return res.status(400).json({ error: 'jobId is required.' });
    }

    console.log(`[upload-success] Processing notification for job ${jobId}.`);

    const existingJobs = await db.select().from(jobs).where(eq(jobs.id, jobId)).limit(1);
    const job = existingJobs[0];

    if (!job) {
      console.warn(`[upload-success] Job ${jobId} not found in database.`);
      return res.status(404).json({ error: 'No matching job record found.' });
    }

    // Idempotency (DB-level): skip if already enqueued
    const queuedOrLater = ['queued', 'processing', 'completed', 'failed', 'purged'];
    if (queuedOrLater.includes(job.status)) {
      console.log(`[upload-success] Job ${jobId} already in state "${job.status}" (DB idempotency). Returning ok.`);
      return res.status(200).json({ status: 'ok', message: 'Job already enqueued.' });
    }

    // 1. Update Job: Status = 'uploaded'
    await db
      .update(jobs)
      .set({
        status: 'uploaded',
        updatedAt: new Date(),
      })
      .where(eq(jobs.id, job.id));

    console.log(`[upload-success] Job ${jobId} status updated to "uploaded".`);

    // 2. Pre-check: Detect if the webhook already enqueued this job into BullMQ.
    //    This handles the race where the R2 upload-complete webhook fires before
    //    the client-side upload-success notification arrives.
    const existingBullMQJob = await getExistingVideoJob(job.id);
    if (existingBullMQJob) {
      console.log(`[upload-success] Duplicate enqueue detected: job ${jobId} already exists in BullMQ (id: ${existingBullMQJob.id}). Skipping enqueue.`);
      // Still advance the DB status to 'queued' so downstream reads are consistent.
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
        message: 'Job already enqueued.',
      });
    }

    // 3. Enqueue BullMQ Task
    await addVideoJob({
      jobId: job.id,
      r2ObjectKey: job.r2ObjectKey,
      fileSizeBytes: job.fileSizeBytes ?? 0,
      uploadedAt: new Date().toISOString(),
    });

    console.log(`[upload-success] Job ${jobId} enqueued into BullMQ successfully.`);

    // 4. Update Job: Status = 'queued'
    await db
      .update(jobs)
      .set({
        status: 'queued',
        updatedAt: new Date(),
      })
      .where(eq(jobs.id, job.id));

    console.log(`[upload-success] Job ${jobId} status updated to "queued". Returning success.`);

    return res.status(200).json({
      status: 'ok',
      jobId: job.id,
      message: 'Successfully enqueued video processing task.',
    });
  } catch (error: any) {
    // Detect BullMQ duplicate-job errors that may surface at runtime.
    // BullMQ v5 handles duplicates silently via Lua scripts, but future
    // versions or edge-case connection errors could surface these.
    const msg: string = error?.message ?? '';
    if (
      msg.includes('already exists') ||
      msg.includes('duplicate') ||
      error?.code === 'JOB_EXISTS'
    ) {
      console.log(`[upload-success] Duplicate enqueue detected via BullMQ error for job ${req.body?.jobId}. Returning idempotent success.`);
      return res.status(200).json({
        status: 'ok',
        jobId: req.body?.jobId,
        message: 'Job already enqueued.',
      });
    }

    console.error('[upload-success] Unhandled error:', error);
    return res.status(500).json({ error: 'Internal server error.' });
  }
});

export default router;
