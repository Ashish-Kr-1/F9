const express = require('express');
const router = express.Router();

// Internal URL of the FastAPI AI service — never exposed to the browser
const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:5001';

/**
 * POST /api/clippy
 * Gateway: Receives request from React frontend and proxies it to
 * the Python FastAPI service internally. Frontend only ever talks to Node.
 */
router.post('/', async (req, res) => {
    const { message } = req.body;

    if (!message || typeof message !== 'string') {
        return res.status(400).json({ error: 'Message is required.' });
    }

    try {
        // Dynamic import of node-fetch or use built-in fetch (Node 18+)
        const response = await fetch(`${AI_SERVICE_URL}/clippy`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message }),
        });

        if (!response.ok) {
            throw new Error(`AI service responded with status ${response.status}`);
        }

        const data = await response.json();
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
