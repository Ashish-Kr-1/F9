// backend/routes/scores.js
const express = require('express');
const db = require('../db');
const { verifyToken } = require('../middleware/authMiddleware');

const router = express.Router();

// Submit a score
router.post('/', verifyToken, async (req, res) => {
    const { game_name, score } = req.body;
    if (!game_name || score === undefined) {
        return res.status(400).json({ error: 'Missing game_name or score' });
    }
    try {
        await db.query(
            'INSERT INTO game_scores (user_id, game_name, score) VALUES ($1, $2, $3)',
            [req.userId, game_name, score]
        );
        res.status(201).json({ message: 'Score saved' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to save score' });
    }
});

// Get leaderboard for a specific game (top 10)
router.get('/:gameName', verifyToken, async (req, res) => {
    const { gameName } = req.params;
    try {
        // For minesweeper, lower is better (time). For others, higher is better.
        const orderDir = gameName === 'minesweeper' ? 'ASC' : 'DESC';
        const result = await db.query(
            `SELECT gs.score, gs.created_at, u.username, u.email
             FROM game_scores gs
             JOIN users u ON gs.user_id = u.id
             WHERE gs.game_name = $1
             ORDER BY gs.score ${orderDir}
             LIMIT 10`,
            [gameName]
        );
        const leaderboard = result.rows.map(r => ({
            username: r.username || r.email?.split('@')[0] || 'User',
            score: r.score,
            created_at: r.created_at
        }));
        res.json(leaderboard);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch leaderboard' });
    }
});

// Get personal best for a user for a specific game
router.get('/:gameName/me', verifyToken, async (req, res) => {
    const { gameName } = req.params;
    try {
        const orderDir = gameName === 'minesweeper' ? 'ASC' : 'DESC';
        const result = await db.query(
            `SELECT score, created_at FROM game_scores
             WHERE user_id = $1 AND game_name = $2
             ORDER BY score ${orderDir} LIMIT 1`,
            [req.userId, gameName]
        );
        res.json(result.rows[0] || null);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch personal best' });
    }
});

module.exports = router;
