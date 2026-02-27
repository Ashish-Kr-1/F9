// backend/routes/files.js
const express = require('express');
const db = require('../db');
const { verifyToken } = require('../middleware/authMiddleware');
const { Storage } = require('@google-cloud/storage');
const stream = require('stream');

const router = express.Router();

let storage;
let bucket;
try {
    // Try initializing GCS. Requires GOOGLE_APPLICATION_CREDENTIALS in env or running on GCP
    storage = new Storage();
    if (process.env.GCS_BUCKET_NAME) {
        bucket = storage.bucket(process.env.GCS_BUCKET_NAME);
    }
} catch (e) {
    console.warn("GCS not configured properly. Will fall back to DB if needed.", e);
}

// Helper to determine if we should use GCS
const useGCS = () => !!bucket;

// Save text content for a file node (from Notepad)
router.post('/:nodeId/content', verifyToken, async (req, res) => {
    const { nodeId } = req.params;
    const { text } = req.body;
    if (typeof text !== 'string') {
        return res.status(400).json({ error: 'Missing text content' });
    }

    try {
        // Check if file exists
        const fileRes = await db.query('SELECT * FROM files WHERE id=$1 AND user_id=$2', [nodeId, req.userId]);
        if (fileRes.rows.length === 0) return res.status(404).json({ error: 'File not found' });

        let gcsKey = `user_${req.userId}/file_${nodeId}.txt`;
        const size = Buffer.byteLength(text, 'utf8');

        if (useGCS()) {
            // Upload to GCS
            const file = bucket.file(gcsKey);
            await file.save(text, {
                contentType: 'text/plain',
                resumable: false
            });
        } else {
            // Fallback: We'll store it in DB (we'll add a 'content' column to file_versions if GCS is missing, 
            // but let's just stick to GCS priority).
            gcsKey = `db_fallback_${nodeId}`;
            await db.query(`ALTER TABLE file_versions ADD COLUMN IF NOT EXISTS fallback_content TEXT`);
        }

        // Determine new version number
        const verRes = await db.query('SELECT COALESCE(MAX(version_number), 0) + 1 AS next_ver FROM file_versions WHERE file_id=$1', [nodeId]);
        const versionNumber = verRes.rows[0].next_ver;

        // Insert into file_versions
        let insertQuery = `INSERT INTO file_versions (file_id, version_number, storage_key, size_bytes) VALUES ($1, $2, $3, $4)`;
        let insertValues = [nodeId, versionNumber, gcsKey, size];

        if (!useGCS()) {
            insertQuery = `INSERT INTO file_versions (file_id, version_number, storage_key, size_bytes, fallback_content) VALUES ($1, $2, $3, $4, $5)`;
            insertValues.push(text);
        }

        await db.query(insertQuery, insertValues);

        // Update files table with newest storage key / size
        await db.query(
            `UPDATE files SET storage_key=$1, size_bytes=$2, mime_type='text/plain', updated_at=NOW() WHERE id=$3`,
            [gcsKey, size, nodeId]
        );

        res.json({ message: 'Content saved', size, version: versionNumber, usedGCS: useGCS() });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to save content' });
    }
});

// Retrieve text content for a file node
router.get('/:nodeId/content', verifyToken, async (req, res) => {
    const { nodeId } = req.params;
    try {
        // Get latest version or just check files table
        const result = await db.query(
            `SELECT storage_key FROM files WHERE user_id=$1 AND id=$2`,
            [req.userId, nodeId]
        );
        if (result.rows.length === 0 || !result.rows[0].storage_key) {
            return res.json({ content: '' }); // Empty/new file
        }
        const { storage_key } = result.rows[0];

        if (useGCS() && !storage_key.startsWith('db_fallback_')) {
            const file = bucket.file(storage_key);
            const [exists] = await file.exists();
            if (!exists) return res.status(404).json({ error: 'File missing in GCS' });
            const [contents] = await file.download();
            res.json({ content: contents.toString('utf8') });
        } else {
            // Fallback DB fetch
            const fallbackRes = await db.query(`SELECT fallback_content FROM file_versions WHERE file_id=$1 ORDER BY version_number DESC LIMIT 1`, [nodeId]);
            const content = fallbackRes.rows.length > 0 ? fallbackRes.rows[0].fallback_content : '';
            res.json({ content: content || '' });
        }
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to retrieve content' });
    }
});

module.exports = router;
