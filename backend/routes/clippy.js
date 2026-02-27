const express = require('express');
const router = express.Router();
const db = require('../db');
const { verifyToken } = require('../middleware/authMiddleware');

// Internal URL of the FastAPI AI service — never exposed to the browser
const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:5001';

/**
 * POST /api/clippy
 * Gateway: Receives request from React frontend and proxies it to
 * the Python FastAPI service internally, then saves the history to DB.
 */
router.post('/', verifyToken, async (req, res) => {
    const { message, context } = req.body;

    if (!message && !context) {
        return res.status(400).json({ error: 'Message or context is required.' });
    }

    try {
        // Dynamic import of node-fetch or use built-in fetch (Node 18+)
        const response = await fetch(`${AI_SERVICE_URL}/clippy`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: message || '', context: context || '' }),
        });

        if (!response.ok) {
            throw new Error(`AI service responded with status ${response.status}`);
        }

        const data = await response.json();

        // Capture session ID returned from python or create one
        const sessionId = data.session_id;

        // Save conversation asynchronously so as not to block response
        try {
            if (message || context) {
                await db.query(`
                    INSERT INTO clippy_history (user_id, session_id, role, content, related_app)
                    VALUES ($1, $2, 'user', $3, $4)
                 `, [req.userId, sessionId, message || `[Context] ${context}`, context ? 'OS Event' : null]);
            }
            if (data.reply) {
                await db.query(`
                    INSERT INTO clippy_history (user_id, session_id, role, content)
                    VALUES ($1, $2, 'ai', $3)
                 `, [req.userId, sessionId, data.reply]);
            }
        } catch (dbErr) {
            console.error('Failed to log clippy history:', dbErr.message);
        }

        res.json(data); // { reply: "..." }

    } catch (error) {
        console.error('❌ Clippy gateway error:', error.message);
        res.status(502).json({
            error: 'AI service unavailable',
            reply: "Oops! My neural paperclips are tangled. Try again in a moment."
        });
    }
});

module.exports = router;
