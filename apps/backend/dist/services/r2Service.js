"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.uploadToR2 = uploadToR2;
const client_s3_1 = require("@aws-sdk/client-s3");
const env_1 = require("../config/env");
const s3Client = new client_s3_1.S3Client({
    region: 'auto',
    endpoint: `https://${env_1.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
        accessKeyId: env_1.env.R2_ACCESS_KEY_ID,
        secretAccessKey: env_1.env.R2_SECRET_ACCESS_KEY,
    },
});
async function uploadToR2(fileBuffer, fileName, mimeType) {
    const uniqueKey = `${Date.now()}-${fileName.replace(/\s+/g, '_')}`;
    const bucketName = env_1.env.R2_BUCKET_NAME || 'vedaai-uploads';
    try {
        await s3Client.send(new client_s3_1.PutObjectCommand({
            Bucket: bucketName,
            Key: uniqueKey,
            Body: fileBuffer,
            ContentType: mimeType,
        }));
    }
    catch (err) {
        console.error('❌ Failed to upload to Cloudflare R2:', err);
        throw new Error(`Cloudflare R2 Upload failed: ${err instanceof Error ? err.message : String(err)}`);
    }
    // Construct standard R2 URL
    return `https://${env_1.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com/${bucketName}/${uniqueKey}`;
}
