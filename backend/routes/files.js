// backend/routes/files.js — GCS-only file storage
const express = require('express');
const db = require('../db');
const { verifyToken } = require('../middleware/authMiddleware');
const { Storage } = require('@google-cloud/storage');

const router = express.Router();

// Initialize GCS — uses default credentials on Cloud Run (IAM), or GOOGLE_APPLICATION_CREDENTIALS locally
const storage = new Storage();
const bucketName = process.env.GCS_BUCKET_NAME;

if (!bucketName) {
    console.warn('⚠️  GCS_BUCKET_NAME not set — file storage will fail');
}

const bucket = bucketName ? storage.bucket(bucketName) : null;

/**
 * Build a structured GCS storage key
 */
const buildStorageKey = (userId, nodeId) => `user_${userId}/file_${nodeId}.txt`;

// ─── Save text content for a file node ──────────────────────────
router.post('/:nodeId/content', verifyToken, async (req, res) => {
    const { nodeId } = req.params;
    const { text } = req.body;

    if (typeof text !== 'string') {
        return res.status(400).json({ error: 'Missing text content' });
    }
    if (!bucket) {
        return res.status(503).json({ error: 'File storage not configured' });
    }

    try {
        // Verify ownership
        const fileRes = await db.query(
            'SELECT id FROM vfs_nodes WHERE id=$1 AND user_id=$2',
            [nodeId, req.userId]
        );
        if (fileRes.rows.length === 0) {
            return res.status(404).json({ error: 'File not found' });
        }

        const gcsKey = buildStorageKey(req.userId, nodeId);
        const size = Buffer.byteLength(text, 'utf8');

        // Upload to GCS
        const file = bucket.file(gcsKey);
        await file.save(text, {
            contentType: 'text/plain',
            resumable: false,
        });

        // Determine new version number
        const verRes = await db.query(
            'SELECT COALESCE(MAX(version_number), 0) + 1 AS next_ver FROM file_versions WHERE file_id=$1',
            [nodeId]
        );
        const versionNumber = verRes.rows[0].next_ver;

        // Record version
        await db.query(
            `INSERT INTO file_versions (file_id, version_number, storage_key, size_bytes)
             VALUES ($1, $2, $3, $4)`,
            [nodeId, versionNumber, gcsKey, size]
        );

        // Update vfs_nodes with latest storage info
        await db.query(
            `UPDATE vfs_nodes SET storage_key=$1, size_bytes=$2, mime_type='text/plain', updated_at=NOW()
             WHERE id=$3 AND user_id=$4`,
            [gcsKey, size, nodeId, req.userId]
        );

        res.json({ message: 'Content saved', size, version: versionNumber });
    } catch (err) {
        console.error('File save error:', err);
        res.status(500).json({ error: 'Failed to save content' });
    }
});

// ─── Retrieve text content for a file node ──────────────────────
router.get('/:nodeId/content', verifyToken, async (req, res) => {
    const { nodeId } = req.params;

    if (!bucket) {
        return res.status(503).json({ error: 'File storage not configured' });
    }

    try {
        // Verify ownership and get storage key
        const result = await db.query(
            'SELECT storage_key FROM vfs_nodes WHERE id=$1 AND user_id=$2',
            [nodeId, req.userId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'File not found' });
        }

        const { storage_key } = result.rows[0];
        if (!storage_key) {
            return res.json({ content: '' }); // New/empty file
        }

        // Download from GCS
        const file = bucket.file(storage_key);
        const [exists] = await file.exists();
        if (!exists) {
            return res.json({ content: '' }); // File deleted from GCS, return empty
        }

        const [contents] = await file.download();
        res.json({ content: contents.toString('utf8') });
    } catch (err) {
        console.error('File read error:', err);
        res.status(500).json({ error: 'Failed to retrieve content' });
    }
});

module.exports = router;
