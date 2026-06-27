import { db } from './db/client';
import { jobs } from './db/schema';
import { eq } from 'drizzle-orm';
import * as fs from 'fs';
import * as path from 'path';

const API_URL = 'http://localhost:3001';
const VIDEO_PATH = 'c:/Users/ishit/AeroGuard-1/test_video.mp4';

async function runTest() {
  console.log('--- Step 1: Requesting Presigned URL from API ---');
  let jobId = '';
  let uploadUrl = '';
  try {
    const stats = fs.statSync(VIDEO_PATH);
    const fileSizeBytes = stats.size;
    const filename = path.basename(VIDEO_PATH);
    const contentType = 'video/mp4';

    const res = await fetch(`${API_URL}/api/v1/uploads/presign`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ filename, fileSizeBytes, contentType })
    });

    if (!res.ok) {
      throw new Error(`Failed to get presigned URL: ${res.statusText}`);
    }

    const data = await res.json() as any;
    jobId = data.jobId;
    uploadUrl = data.uploadUrl;
    console.log(`Success! Generated Job ID: ${jobId}`);
    console.log(`Presigned URL: ${uploadUrl}\n`);
  } catch (err: any) {
    console.error(`Step 1 FAILED: ${err.message}`);
    process.exit(1);
  }

  console.log('--- Step 2: Verifying Job Record created in NeonDB ---');
  try {
    const jobRecords = await db.select().from(jobs).where(eq(jobs.id, jobId)).limit(1);
    if (jobRecords.length === 0) {
      throw new Error('No job record found in NeonDB.');
    }
    const job = jobRecords[0];
    console.log(`Success! Job record found with status: ${job.status}\n`);
  } catch (err: any) {
    console.error(`Step 2 FAILED: ${err.message}`);
    process.exit(1);
  }

  console.log('--- Step 3: Attempting PUT upload to Cloudflare R2 ---');
  try {
    const fileBuffer = fs.readFileSync(VIDEO_PATH);
    const putRes = await fetch(uploadUrl, {
      method: 'PUT',
      headers: { 'Content-Type': 'video/mp4' },
      body: fileBuffer
    });

    if (putRes.ok) {
      console.log(`Success! File uploaded successfully (Status ${putRes.status}).`);
    } else {
      const text = await putRes.text();
      throw new Error(`HTTP ${putRes.status} ${putRes.statusText}\nError Details: ${text}`);
    }
  } catch (err: any) {
    console.error(`Step 3 FAILED: Browser PUT upload failed.`);
    console.error(`Error details:\n${err.message}\n`);
  }

  process.exit(0);
}

runTest();
