import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { env } from '../config/env';

const s3Client = new S3Client({
  region: 'auto',
  endpoint: `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: env.R2_ACCESS_KEY_ID,
    secretAccessKey: env.R2_SECRET_ACCESS_KEY,
  },
});

export async function uploadToR2(
  fileBuffer: Buffer,
  fileName: string,
  mimeType: string
): Promise<string> {
  const uniqueKey = `${Date.now()}-${fileName.replace(/\s+/g, '_')}`;
  const bucketName = env.R2_BUCKET_NAME || 'vedaai-uploads';

  try {
    await s3Client.send(
      new PutObjectCommand({
        Bucket: bucketName,
        Key: uniqueKey,
        Body: fileBuffer,
        ContentType: mimeType,
      })
    );
  } catch (err: unknown) {
    console.error('❌ Failed to upload to Cloudflare R2:', err);
    throw new Error(`Cloudflare R2 Upload failed: ${err instanceof Error ? err.message : String(err)}`);
  }

  // Construct standard R2 URL
  return `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com/${bucketName}/${uniqueKey}`;
}
