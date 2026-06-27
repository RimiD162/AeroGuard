import { Router, Request, Response } from 'express';
import { eq, desc, count, sql } from 'drizzle-orm';
import { QueueEvents } from 'bullmq';
import { db } from '../db/client';
import { jobs, metrics } from '../db/schema';
import { redisConnection } from '../lib/redis';
import { addVideoJob } from '../lib/queue';

const router = Router();

// 0a. GET /api/v1/jobs — List all jobs with metrics count
router.get('/', async (req: Request, res: Response) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.max(1, Math.min(100, parseInt(req.query.limit as string) || 50));
    const offset = (page - 1) * limit;

    const results = await db
      .select({
        id: jobs.id,
        r2ObjectKey: jobs.r2ObjectKey,
        originalFilename: jobs.originalFilename,
        fileSizeBytes: jobs.fileSizeBytes,
        status: jobs.status,
        errorMessage: jobs.errorMessage,
        createdAt: jobs.createdAt,
        updatedAt: jobs.updatedAt,
        completedAt: jobs.completedAt,
        purgedAt: jobs.purgedAt,
        aircraftModel: jobs.aircraftModel,
        registrationNumber: jobs.registrationNumber,
        tailNumber: jobs.tailNumber,
        inspectionType: jobs.inspectionType,
        metadata: jobs.metadata,
        metricsCount: count(metrics.id),
      })
      .from(jobs)
      .leftJoin(metrics, eq(metrics.jobId, jobs.id))
      .groupBy(jobs.id)
      .orderBy(desc(jobs.createdAt))
      .limit(limit)
      .offset(offset);

    return res.status(200).json(results);
  } catch (error) {
    console.error('Error listing jobs:', error);
    return res.status(500).json({ error: 'Failed to list jobs.' });
  }
});

// 0b. GET /api/v1/jobs/:jobId — Single job detail
router.get('/:jobId', async (req: Request, res: Response) => {
  const { jobId } = req.params;

  // Skip the SSE stream and metrics sub-routes
  if (jobId === 'stream' || req.path.includes('/stream') || req.path.includes('/metrics')) {
    return (req as any).next?.();
  }

  try {
    const results = await db
      .select({
        id: jobs.id,
        r2ObjectKey: jobs.r2ObjectKey,
        originalFilename: jobs.originalFilename,
        fileSizeBytes: jobs.fileSizeBytes,
        status: jobs.status,
        errorMessage: jobs.errorMessage,
        createdAt: jobs.createdAt,
        updatedAt: jobs.updatedAt,
        completedAt: jobs.completedAt,
        purgedAt: jobs.purgedAt,
        aircraftModel: jobs.aircraftModel,
        registrationNumber: jobs.registrationNumber,
        tailNumber: jobs.tailNumber,
        inspectionType: jobs.inspectionType,
        metadata: jobs.metadata,
        metricsCount: count(metrics.id),
      })
      .from(jobs)
      .leftJoin(metrics, eq(metrics.jobId, jobs.id))
      .where(eq(jobs.id, jobId))
      .groupBy(jobs.id)
      .limit(1);

    const job = results[0];
    if (!job) {
      return res.status(404).json({ error: 'Job not found.' });
    }

    return res.status(200).json(job);
  } catch (error) {
    console.error('Error fetching job:', error);
    return res.status(500).json({ error: 'Failed to fetch job.' });
  }
});

// 0c. POST /api/v1/jobs/:jobId/start — Start processing an uploaded video
router.post('/:jobId/start', async (req: Request, res: Response) => {
  const { jobId } = req.params;

  try {
    const existingJobs = await db.select().from(jobs).where(eq(jobs.id, jobId)).limit(1);
    const job = existingJobs[0];

    if (!job) {
      return res.status(404).json({ error: 'Job not found.' });
    }

    if (job.status !== 'uploaded' && job.status !== 'pending') {
      return res.status(400).json({ error: `Job is already in ${job.status} state.` });
    }

    // 1. Enqueue BullMQ Task
    await addVideoJob({
      jobId: job.id,
      r2ObjectKey: job.r2ObjectKey,
      fileSizeBytes: job.fileSizeBytes ?? 0,
      uploadedAt: new Date().toISOString(),
    });

    // 2. Update status to queued
    await db.update(jobs).set({ status: 'queued', updatedAt: new Date() }).where(eq(jobs.id, jobId));

    return res.status(200).json({
      jobId,
      status: 'queued',
      message: 'Successfully started analysis (queued).'
    });
  } catch (error) {
    console.error('Error starting job:', error);
    return res.status(500).json({ error: 'Failed to start job.' });
  }
});

// 1. GET /api/v1/jobs/:jobId/stream (SSE stream)
router.get('/:jobId/stream', async (req: Request, res: Response) => {
  const { jobId } = req.params;

  // Set SSE response headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('Content-Encoding', 'none'); // Prevents chunk buffering by compression middleware
  res.flushHeaders();

  console.log(`SSE: Client connected to progress stream of job: ${jobId}`);

  const sendEvent = (type: string, data: any) => {
    res.write(`data: ${JSON.stringify({ type, ...data })}\n\n`);
  };

  try {
    // Check initial job status in NeonDB
    const existingJobs = await db.select().from(jobs).where(eq(jobs.id, jobId)).limit(1);
    const initialJob = existingJobs[0];

    if (!initialJob) {
      sendEvent('job_failed', { error: 'No matching job record found.' });
      res.end();
      return;
    }

    // Handle completed / purged jobs immediately on reload
    if (initialJob.status === 'completed' || initialJob.status === 'purged') {
      sendEvent('status_update', { status: initialJob.status });
      sendEvent('job_complete', { message: 'Video analysis completed successfully.' });
      res.end();
      return;
    }

    // Handle failed jobs immediately on reload
    if (initialJob.status === 'failed') {
      sendEvent('status_update', { status: 'failed' });
      sendEvent('job_failed', { error: initialJob.errorMessage || 'Job failed during execution.' });
      res.end();
      return;
    }

    // Otherwise, stream initial status
    sendEvent('status_update', { status: initialJob.status });

    // Initialize BullMQ QueueEvents listener for this specific job
    const queueEvents = new QueueEvents('video-inspection', {
      connection: (redisConnection as any).options,
    });

    const onActive = ({ jobId: activeId }: { jobId: string }) => {
      console.log(`[QueueEvents] active event: ${activeId} (expecting ${jobId})`);
      if (activeId === jobId) {
        sendEvent('status_update', { status: 'processing' });
      }
    };

    const onProgress = ({ jobId: progressId, data: progressVal }: { jobId: string; data: any }) => {
      console.log(`[QueueEvents] progress event: ${progressId} -> ${progressVal}`);
      if (progressId === jobId) {
        sendEvent('progress', { progress: progressVal });
      }
    };

    const onCompleted = ({ jobId: completedId }: { jobId: string }) => {
      console.log(`[QueueEvents] completed event: ${completedId} (expecting ${jobId})`);
      if (completedId === jobId) {
        sendEvent('status_update', { status: 'completed' });
        sendEvent('job_complete', { message: 'Inference completed. Persisting final metrics.' });
        cleanup();
        res.end();
      }
    };

    const onFailed = ({ jobId: failedId, failedReason }: { jobId: string; failedReason: string }) => {
      console.log(`[QueueEvents] failed event: ${failedId}. Reason: ${failedReason}`);
      if (failedId === jobId) {
        sendEvent('status_update', { status: 'failed' });
        sendEvent('job_failed', { error: failedReason || 'Job execution failed.' });
        cleanup();
        res.end();
      }
    };

    // Bind event handlers
    queueEvents.on('active', onActive);
    queueEvents.on('progress', onProgress);
    queueEvents.on('completed', onCompleted);
    queueEvents.on('failed', onFailed);

    const cleanup = () => {
      queueEvents.off('active', onActive);
      queueEvents.off('progress', onProgress);
      queueEvents.off('completed', onCompleted);
      queueEvents.off('failed', onFailed);
      queueEvents.close();
    };

    // Close listener if client closes connection
    req.on('close', () => {
      console.log(`SSE: Client disconnected from progress stream of job: ${jobId}`);
      cleanup();
    });

  } catch (error: any) {
    console.error('Error starting SSE stream:', error);
    sendEvent('job_failed', { error: 'Failed to establish event stream connection.' });
    res.end();
  }
});

// 2. GET /api/v1/jobs/:jobId/metrics (paginated select from metrics table)
router.get('/:jobId/metrics', async (req: Request, res: Response) => {
  const { jobId } = req.params;
  const page = Math.max(1, parseInt(req.query.page as string) || 1);
  const limit = Math.max(1, Math.min(100, parseInt(req.query.limit as string) || 100));
  const offset = (page - 1) * limit;

  try {
    // Query metrics records from the DB using pagination parameters
    const results = await db
      .select()
      .from(metrics)
      .where(eq(metrics.jobId, jobId))
      .limit(limit)
      .offset(offset);

    return res.status(200).json(results);
  } catch (error) {
    console.error('Error fetching job metrics:', error);
    return res.status(500).json({ error: 'Failed to fetch job metrics from database.' });
  }
});

export default router;
