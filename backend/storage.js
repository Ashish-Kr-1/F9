// backend/storage.js — Google Cloud Storage service
const { Storage } = require('@google-cloud/storage');

// Uses Application Default Credentials on Cloud Run (via IAM)
// Locally: set GOOGLE_APPLICATION_CREDENTIALS or run `gcloud auth application-default login`
const storage = new Storage();

const bucketName = process.env.GCS_BUCKET_NAME;
if (!bucketName) {
    console.warn('⚠️  GCS_BUCKET_NAME is not set — file storage will be unavailable');
}

const bucket = bucketName ? storage.bucket(bucketName) : null;

/**
 * Build a structured GCS object key
 * Format: user_{userId}/file_{nodeId}.txt
 */
const buildStorageKey = (userId, nodeId) => `user_${userId}/file_${nodeId}.txt`;

/**
 * Upload text content to GCS
 */
const uploadFile = async (userId, nodeId, content) => {
    if (!bucket) throw new Error('GCS not configured');

    const storageKey = buildStorageKey(userId, nodeId);
    const sizeBytes = Buffer.byteLength(content, 'utf8');

    const file = bucket.file(storageKey);
    await file.save(content, {
        contentType: 'text/plain',
        resumable: false,
        metadata: { userId, nodeId },
    });

    return { storageKey, sizeBytes };
};

/**
 * Download file content from GCS
 */
const downloadFile = async (storageKey) => {
    if (!bucket) throw new Error('GCS not configured');

    const file = bucket.file(storageKey);
    const [exists] = await file.exists();
    if (!exists) return '';

    const [contents] = await file.download();
    return contents.toString('utf8');
};

/**
 * Delete a file from GCS
 */
const deleteFile = async (storageKey) => {
    if (!bucket) return;
    const file = bucket.file(storageKey);
    const [exists] = await file.exists();
    if (exists) await file.delete();
};

/**
 * Check if GCS is properly configured
 */
const isConfigured = () => !!bucket;

/**
 * Verify GCS connectivity — write and read a test object
 * @returns {Promise<{ok: boolean, bucket: string, latencyMs: number}>}
 */
const verify = async () => {
    if (!bucket) {
        console.warn('⚠️  GCS verification skipped — bucket not configured');
        return { ok: false, error: 'GCS_BUCKET_NAME not set' };
    }

    const testKey = '_health/test.txt';
    const testContent = `health-check-${Date.now()}`;
    const start = Date.now();

    try {
        // Write test
        const file = bucket.file(testKey);
        await file.save(testContent, { contentType: 'text/plain', resumable: false });

        // Read back
        const [contents] = await file.download();
        const readBack = contents.toString('utf8');

        // Cleanup
        await file.delete();

        const latencyMs = Date.now() - start;
        const match = readBack === testContent;

        if (match) {
            console.log(`✅ GCS verified — bucket "${bucketName}" (${latencyMs}ms)`);
        } else {
            console.error(`❌ GCS read-back mismatch`);
        }

        return { ok: match, bucket: bucketName, latencyMs };
    } catch (err) {
        const latencyMs = Date.now() - start;
        console.error(`❌ GCS verification FAILED (${latencyMs}ms):`, err.message);
        return { ok: false, bucket: bucketName, latencyMs, error: err.message };
    }
};

module.exports = {
    uploadFile,
    downloadFile,
    deleteFile,
    buildStorageKey,
    isConfigured,
    verify,
};
