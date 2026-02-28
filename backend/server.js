const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

const db = require('./db');
const gcs = require('./storage');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// ─── Routes ──────────────────────────────────────
app.use('/api/auth', require('./routes/auth'));
app.use('/api/vfs', require('./routes/vfs'));
app.use('/api/files', require('./routes/files'));
app.use('/api/clippy', require('./routes/clippy'));
app.use('/api/scores', require('./routes/scores'));

// ─── Health Check (Cloud Run liveness probe) ─────
let startupStatus = { db: null, gcs: null };

app.get('/api/health', async (req, res) => {
    // Quick check — return cached startup status + live DB ping
    try {
        const dbPing = await db.query('SELECT 1');
        res.status(200).json({
            status: 'ok',
            uptime: Math.floor(process.uptime()) + 's',
            database: startupStatus.db?.ok ? 'connected' : 'error',
            gcs: startupStatus.gcs?.ok ? 'connected' : 'not configured',
            timestamp: new Date().toISOString(),
        });
    } catch (err) {
        res.status(503).json({
            status: 'unhealthy',
            database: 'disconnected',
            error: err.message,
        });
    }
});

// ─── Startup ─────────────────────────────────────
const PORT = process.env.PORT || 8000;

const startServer = async () => {
    console.log('─────────────────────────────────────');
    console.log('  Windows XP Web OS — Backend API');
    console.log('─────────────────────────────────────');
    console.log(`  NODE_ENV : ${process.env.NODE_ENV || 'development'}`);
    console.log(`  PORT     : ${PORT}`);
    console.log('');

    // Verify Database
    console.log('🔍 Verifying Database...');
    startupStatus.db = await db.verify();

    // Verify GCS
    console.log('🔍 Verifying GCS...');
    startupStatus.gcs = await gcs.verify();

    console.log('');

    // Start listening
    app.listen(PORT, '0.0.0.0', () => {
        console.log(`🚀 API server listening on 0.0.0.0:${PORT}`);
        console.log('─────────────────────────────────────');

        if (!startupStatus.db.ok) {
            console.warn('⚠️  Server started but DATABASE is unreachable!');
        }
        if (!startupStatus.gcs.ok) {
            console.warn('⚠️  Server started but GCS is not available — file storage disabled');
        }
    });
};

startServer().catch(err => {
    console.error('💥 Fatal startup error:', err);
    process.exit(1);
});
