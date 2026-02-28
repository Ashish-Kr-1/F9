// backend/routes/files.js — File content API using GCS storage service
const express = require('express');
const db = require('../db');
const { verifyToken } = require('../middleware/authMiddleware');
const gcs = require('../storage');

const router = express.Router();

// ─── Save text content for a file node ──────────────────────────
router.post('/:nodeId/content', verifyToken, async (req, res) => {
    const { nodeId } = req.params;
    const { text } = req.body;

    if (typeof text !== 'string') {
        return res.status(400).json({ error: 'Missing text content' });
    }
    if (!gcs.isConfigured()) {
        return res.status(503).json({ error: 'File storage not configured (GCS_BUCKET_NAME missing)' });
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

        // Upload to GCS
        const { storageKey, sizeBytes } = await gcs.uploadFile(req.userId, nodeId, text);

        // Record version
        const verRes = await db.query(
            'SELECT COALESCE(MAX(version_number), 0) + 1 AS next_ver FROM file_versions WHERE file_id=$1',
            [nodeId]
        );
        const versionNumber = verRes.rows[0].next_ver;

        await db.query(
            `INSERT INTO file_versions (file_id, version_number, storage_key, size_bytes)
             VALUES ($1, $2, $3, $4)`,
            [nodeId, versionNumber, storageKey, sizeBytes]
        );

        // Update vfs_nodes metadata
        await db.query(
            `UPDATE vfs_nodes SET storage_key=$1, size_bytes=$2, mime_type='text/plain', updated_at=NOW()
             WHERE id=$3 AND user_id=$4`,
            [storageKey, sizeBytes, nodeId, req.userId]
        );

        res.json({ message: 'Content saved', size: sizeBytes, version: versionNumber });
    } catch (err) {
        console.error('File save error:', err);
        res.status(500).json({ error: 'Failed to save content' });
    }
});

// ─── Retrieve text content for a file node ──────────────────────
router.get('/:nodeId/content', verifyToken, async (req, res) => {
    const { nodeId } = req.params;

    if (!gcs.isConfigured()) {
        return res.status(503).json({ error: 'File storage not configured (GCS_BUCKET_NAME missing)' });
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
        const content = await gcs.downloadFile(storage_key);
        res.json({ content });
    } catch (err) {
        console.error('File read error:', err);
        res.status(500).json({ error: 'Failed to retrieve content' });
    }
});

module.exports = router;
