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

// Cloud Run best practices: limit pool size to prevent connection overload
poolConfig.max = parseInt(process.env.DB_POOL_MAX || '5', 10);
poolConfig.connectionTimeoutMillis = 10000;  // 10s connect timeout
poolConfig.idleTimeoutMillis = 30000;        // 30s idle timeout

const pool = new Pool(poolConfig);

pool.on('connect', () => {
    console.log('✅ Connected to PostgreSQL (Cloud SQL)');
});

pool.on('error', (err) => {
    console.error('❌ Unexpected error on idle client', err);
    process.exit(-1);
});

module.exports = {
    query: (text, params) => pool.query(text, params),
    pool,
};
