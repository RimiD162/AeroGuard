import { S3Client } from '@aws-sdk/client-s3';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config();
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

let accountId = process.env.R2_ACCOUNT_ID;
const accessKeyId = process.env.R2_ACCESS_KEY_ID;
const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;

if (!accountId && process.env.CLOUDFLARE_R2_URL) {
  try {
    const parsedUrl = new URL(process.env.CLOUDFLARE_R2_URL);
    accountId = parsedUrl.hostname.split('.')[0];
  } catch (err) {
    console.error('Failed to parse CLOUDFLARE_R2_URL for R2_ACCOUNT_ID:', err);
  }
}

if (!accountId || !accessKeyId || !secretAccessKey) {
  console.warn(
    'Warning: Cloudflare R2 credentials (R2_ACCOUNT_ID/CLOUDFLARE_R2_URL, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY) are not fully configured.'
  );
}

export const r2Client = new S3Client({
  region: 'auto',
  endpoint: `https://${accountId || 'dummy-account'}.r2.cloudflarestorage.com`,
  forcePathStyle: true,
  requestChecksumCalculation: 'WHEN_REQUIRED',
  responseChecksumValidation: 'WHEN_REQUIRED',
  credentials: {
    accessKeyId: accessKeyId || 'dummy-key',
    secretAccessKey: secretAccessKey || 'dummy-secret',
  },
});
