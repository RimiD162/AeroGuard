import { db } from '../src/db/client';
import { jobs } from '../src/db/schema';
import * as crypto from 'crypto';

async function testInsert() {
  try {
    const jobId = crypto.randomUUID();
    await db.insert(jobs).values({
      id: jobId,
      r2ObjectKey: `/tmp/${jobId}`,
      originalFilename: 'test_video.mp4',
      fileSizeBytes: 1024,
      status: 'uploaded',
      aircraftModel: 'Airbus A320',
      registrationNumber: 'VT-XXX',
      tailNumber: 'VT-XXX',
      inspectionType: 'Borescope',
      metadata: { foo: 'bar' },
    });
    console.log('Insert succeeded!');
  } catch (error) {
    console.error('Insert failed:', error);
  }
}

testInsert();
