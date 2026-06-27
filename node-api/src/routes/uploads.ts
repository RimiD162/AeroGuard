import { Router, Request, Response } from 'express';
import { z } from 'zod';
import * as crypto from 'crypto';
import * as path from 'path';
import * as fs from 'fs';
import multer from 'multer';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { db } from '../db/client';
import { jobs } from '../db/schema';
import { r2Client } from '../lib/r2-client';
import { eq } from 'drizzle-orm';
import { addVideoJob, getExistingVideoJob } from '../lib/queue';
import { validateIndianTailNumber } from '../utils/validation';

const router = Router();

// Constraints
const MAX_UPLOAD_SIZE_BYTES = 10 * 1024 * 1024 * 1024; // 10 GB
const ALLOWED_VIDEO_TYPES = ['video/mp4', 'video/quicktime', 'video/x-msvideo'];

const metadataSchema = z.object({
  aircraftMake: z.string().min(1, 'aircraftMake is required'),
  aircraftModel: z.string().min(1, 'aircraftModel is required'),
  airframeSerialNumber: z.string().min(1, 'airframeSerialNumber is required'),
  yearOfManufacture: z.string().refine((val) => {
    const yom = parseInt(val);
    return !isNaN(yom) && yom >= 1900 && yom <= new Date().getFullYear();
  }, 'Invalid year of manufacture'),
  engineMake: z.string().min(1, 'engineMake is required'),
  engineModel: z.string().min(1, 'engineModel is required'),
  engineSerialNumber: z.string().min(1, 'engineSerialNumber is required'),
  propellerMakeModel: z.string().optional(),
  propellerSerialNumber: z.string().optional(),
  totalAirframeTime: z.string().refine((val) => {
    const tat = parseFloat(val);
    return !isNaN(tat) && tat >= 0;
  }, 'Invalid total airframe time'),
  totalEngineHours: z.string().refine((val) => {
    const teh = parseFloat(val);
    return !isNaN(teh) && teh >= 0;
  }, 'Invalid total engine hours'),
});

const presignRequestSchema = z.object({
  filename: z.string().min(1, 'filename must not be empty'),
  fileSizeBytes: z.number().int().positive('fileSizeBytes must be a positive integer'),
  contentType: z.string().min(1, 'contentType must not be empty'),
  aircraftModel: z.string().min(1, 'aircraftModel is required'),
  registrationNumber: z.string().min(1, 'registrationNumber is required'),
  tailNumber: z.string().optional(),
  inspectionType: z.string().min(1, 'inspectionType is required'),
  metadata: z.any().optional(), // We'll parse this and validate it next
});

// Helper: Sanitize filename
function sanitizeFilename(filename: string): string {
  // Replace characters other than alphanumeric, dots, dashes, and underscores with underscores
  return filename.replace(/[^a-zA-Z0-9.\-_]/g, '_');
}

// Setup multer for local storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.resolve(__dirname, '../../../uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    cb(null, `${crypto.randomUUID()}-${sanitizeFilename(file.originalname)}`);
  }
});
const upload = multer({ storage, limits: { fileSize: MAX_UPLOAD_SIZE_BYTES } });

router.post('/direct', upload.single('file'), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded.' });
    }

    const file = req.file;
    if (!ALLOWED_VIDEO_TYPES.includes(file.mimetype)) {
      fs.unlinkSync(file.path);
      return res.status(415).json({ error: 'Unsupported media type. Only MP4, MOV, and AVI videos are allowed.' });
    }

    const { aircraftModel, registrationNumber, tailNumber, inspectionType, metadata } = req.body;

    if (!aircraftModel || !registrationNumber || !inspectionType || !metadata) {
      return res.status(400).json({ error: 'Missing required metadata fields.' });
    }

    if (!validateIndianTailNumber(registrationNumber)) {
      return res.status(400).json({ error: 'Invalid aircraft registration/tail number format. Must be an Indian format (e.g. VT-XXX) and not use prohibited codes.' });
    }

    let parsedMetadata;
    try {
      parsedMetadata = typeof metadata === 'string' ? JSON.parse(metadata) : metadata;
      metadataSchema.parse(parsedMetadata);
    } catch (e: any) {
      return res.status(400).json({ error: 'Invalid metadata fields', details: e.errors });
    }

    const jobId = crypto.randomUUID();
    
    // 1. Insert pending job row
    await db.insert(jobs).values({
      id: jobId,
      r2ObjectKey: file.path, // Store absolute local path for the inference worker
      originalFilename: file.originalname,
      fileSizeBytes: file.size,
      status: 'uploaded',
      aircraftModel: aircraftModel || null,
      registrationNumber: registrationNumber || null,
      tailNumber: tailNumber || null,
      inspectionType: inspectionType || null,
      metadata: parsedMetadata,
    });

    return res.status(200).json({
      jobId,
      status: 'uploaded',
      message: 'Successfully uploaded video.'
    });
  } catch (error) {
    console.error('Error in /uploads/direct:', error);
    return res.status(500).json({ error: 'Internal server error during upload.' });
  }
});

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

    const { filename, fileSizeBytes, contentType, aircraftModel, registrationNumber, tailNumber, inspectionType, metadata } = parsed.data;

    if (!validateIndianTailNumber(registrationNumber)) {
      return res.status(400).json({ error: 'Invalid aircraft registration/tail number format. Must be an Indian format (e.g. VT-XXX) and not use prohibited codes.' });
    }

    if (!metadata) {
      return res.status(400).json({ error: 'Missing metadata.' });
    }

    let parsedMetadata;
    try {
      parsedMetadata = typeof metadata === 'string' ? JSON.parse(metadata) : metadata;
      metadataSchema.parse(parsedMetadata);
    } catch (e: any) {
      return res.status(400).json({ error: 'Invalid metadata fields', details: e.errors });
    }

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
      aircraftModel: aircraftModel || null,
      registrationNumber: registrationNumber || null,
      tailNumber: tailNumber || null,
      inspectionType: inspectionType || null,
      metadata: parsedMetadata,
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

    console.log(`[upload-success] Job ${jobId} status updated to "uploaded". Returning success.`);

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
