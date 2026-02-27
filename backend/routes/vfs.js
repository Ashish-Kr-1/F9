// backend/routes/vfs.js
const express = require('express');
const db = require('../db');
const { verifyToken } = require('../middleware/authMiddleware');

const router = express.Router();

// Get root node for the logged‑in user
router.get('/root', verifyToken, async (req, res) => {
    try {
        let result = await db.query(
            "SELECT * FROM files WHERE user_id=$1 AND parent_id IS NULL AND is_deleted=false LIMIT 1",
            [req.userId]
        );
        if (result.rows.length === 0) {
            result = await db.query(
                "INSERT INTO files (user_id, name, type, parent_id) VALUES ($1, 'C:', 'folder', NULL) RETURNING *",
                [req.userId]
            );
        }
        const rootId = result.rows[0].id;

        // Auto-seed default folders if they don't exist
        const defaultFolders = ['Desktop', 'My Documents', 'My Pictures', 'My Music'];
        for (const folderName of defaultFolders) {
            const exists = await db.query(
                "SELECT id FROM files WHERE user_id=$1 AND parent_id=$2 AND name=$3 AND is_deleted=false",
                [req.userId, rootId, folderName]
            );
            if (exists.rows.length === 0) {
                await db.query(
                    "INSERT INTO files (user_id, name, type, parent_id) VALUES ($1, $2, 'folder', $3)",
                    [req.userId, folderName, rootId]
                );
            }
        }

        // Convert to frontend expected format
        const node = result.rows[0];
        res.json({
            id: node.id,
            name: node.name,
            node_type: node.type,
            parent_id: node.parent_id,
            path: '/' + node.name,
            created_at: node.created_at
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch root node' });
    }
});

// List children of a folder
router.get('/:nodeId/children', verifyToken, async (req, res) => {
    try {
        const result = await db.query(
            "SELECT * FROM files WHERE parent_id=$1 AND is_deleted=false ORDER BY type DESC, name",
            [req.params.nodeId]
        );
        const children = result.rows.map(node => ({
            id: node.id,
            name: node.name,
            node_type: node.type,
            parent_id: node.parent_id,
            path: '', // Not easily computable without recursion, Frontend can ignore or fetch path if needed
            size_bytes: node.size_bytes,
            created_at: node.created_at
        }));
        res.json(children);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to list children' });
    }
});

// Create a new file or folder
router.post('/create', verifyToken, async (req, res) => {
    const { name, type, parentId } = req.body; // type: 'file' or 'folder'
    if (!name || !type) {
        return res.status(400).json({ error: 'Missing name or type' });
    }
    try {
        const result = await db.query(
            `INSERT INTO files (user_id, name, type, parent_id)
       VALUES ($1, $2, $3, $4) RETURNING *`,
            [req.userId, name, type, parentId]
        );
        const node = result.rows[0];
        res.status(201).json({
            id: node.id,
            name: node.name,
            node_type: node.type,
            parent_id: node.parent_id,
            created_at: node.created_at
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to create node' });
    }
});

// Rename a node 
router.patch('/:nodeId/rename', verifyToken, async (req, res) => {
    const { newName } = req.body;
    if (!newName) return res.status(400).json({ error: 'Missing newName' });
    try {
        const result = await db.query('UPDATE files SET name=$1, updated_at=NOW() WHERE id=$2 AND user_id=$3 RETURNING *', [newName, req.params.nodeId, req.userId]);
        if (result.rows.length === 0) return res.status(404).json({ error: 'Node not found' });
        res.json({ message: 'Renamed successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Rename failed' });
    }
});

// Delete a node (soft delete)
router.delete('/:nodeId', verifyToken, async (req, res) => {
    try {
        await db.query('UPDATE files SET is_deleted=true, updated_at=NOW() WHERE id=$1 AND user_id=$2', [req.params.nodeId, req.userId]);
        res.json({ message: 'Deleted' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Delete failed' });
    }
});

// ─── Recycle Bin ─────────────────────────────────
// List all soft-deleted files for this user
router.get('/recycle-bin/list', verifyToken, async (req, res) => {
    try {
        const result = await db.query(
            "SELECT * FROM files WHERE user_id=$1 AND is_deleted=true ORDER BY updated_at DESC",
            [req.userId]
        );
        const items = result.rows.map(node => ({
            id: node.id,
            name: node.name,
            node_type: node.type,
            parent_id: node.parent_id,
            size_bytes: node.size_bytes,
            created_at: node.created_at,
            deleted_at: node.updated_at
        }));
        res.json(items);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to list recycle bin' });
    }
});

// Restore a file from recycle bin
router.patch('/:nodeId/restore', verifyToken, async (req, res) => {
    try {
        await db.query('UPDATE files SET is_deleted=false, updated_at=NOW() WHERE id=$1 AND user_id=$2', [req.params.nodeId, req.userId]);
        res.json({ message: 'Restored' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Restore failed' });
    }
});

// Permanently delete a file
router.delete('/:nodeId/permanent', verifyToken, async (req, res) => {
    try {
        await db.query('DELETE FROM files WHERE id=$1 AND user_id=$2', [req.params.nodeId, req.userId]);
        res.json({ message: 'Permanently deleted' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Permanent delete failed' });
    }
});

module.exports = router;
