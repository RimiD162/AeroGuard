import * as crypto from 'crypto';
import * as dotenv from 'dotenv';

dotenv.config();

/**
 * Verifies that the webhook request payload matches the provided signature.
 * Uses constant-time comparison to prevent timing attacks.
 * 
 * @param payload The raw string body of the incoming request
 * @param signatureHeader The hex signature string from the X-Signature header
 * @returns boolean representing if the signature is valid
 */
export function verifyWebhookSignature(payload: string, signatureHeader: string): boolean {
  const secret = process.env.R2_WEBHOOK_SECRET;
  
  if (!secret) {
    console.error('Webhook Verification Error: R2_WEBHOOK_SECRET is not configured in the environment.');
    return false;
  }

  if (!signatureHeader) {
    return false;
  }

  try {
    // 1. Compute HMAC-SHA256 hash from raw payload using secret
    const computedSignature = crypto
      .createHmac('sha256', secret)
      .update(payload)
      .digest('hex');

    // 2. Load both signatures into buffers
    const signatureBuffer = Buffer.from(signatureHeader, 'hex');
    const computedBuffer = Buffer.from(computedSignature, 'hex');

    // 3. Avoid timing attacks by checking length and using timingSafeEqual
    if (signatureBuffer.length !== computedBuffer.length) {
      return false;
    }

    return crypto.timingSafeEqual(signatureBuffer, computedBuffer);
  } catch (error) {
    console.error('Webhook Verification Error:', error);
    return false;
  }
}
