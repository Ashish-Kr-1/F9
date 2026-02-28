const { Pool } = require('pg');

const poolConfig = process.env.DATABASE_URL
    ? {
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false },
    }
    : {
        host: process.env.DB_HOST || 'localhost',
        port: process.env.DB_PORT || 5432,
        user: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD || 'postgres',
        database: process.env.DB_NAME || 'xpclone',
    };

// Cloud Run best practices: limit pool size
poolConfig.max = parseInt(process.env.DB_POOL_MAX || '5', 10);
poolConfig.connectionTimeoutMillis = 10000;
poolConfig.idleTimeoutMillis = 30000;

const pool = new Pool(poolConfig);

pool.on('error', (err) => {
    console.error('❌ Unexpected idle client error:', err.message);
});

/**
 * Verify database connectivity on startup
 * @returns {Promise<{ok: boolean, latencyMs: number, version: string}>}
 */
const verify = async () => {
    const start = Date.now();
    try {
        const res = await pool.query('SELECT version() AS v');
        const latencyMs = Date.now() - start;
        const version = res.rows[0].v.split(',')[0]; // e.g. "PostgreSQL 15.x"
        console.log(`✅ Database connected (${latencyMs}ms) — ${version}`);
        return { ok: true, latencyMs, version };
    } catch (err) {
        const latencyMs = Date.now() - start;
        console.error(`❌ Database connection FAILED (${latencyMs}ms):`, err.message);
        return { ok: false, latencyMs, error: err.message };
    }
};

module.exports = {
    query: (text, params) => pool.query(text, params),
    pool,
    verify,
};
