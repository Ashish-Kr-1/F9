const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const db = require('./db');

async function initializeDatabase() {
    console.log('🚀 Starting Database Initialization...');

    try {
        const schemaPath = path.join(__dirname, '../database/schema.sql');
        const schema = fs.readFileSync(schemaPath, 'utf8');

        console.log('--- Executing Schema ---');
        await db.query(schema);
        console.log('✅ Schema applied successfully!');

        process.exit(0);
    } catch (error) {
        console.error('❌ Failed to initialize database:', error);
        process.exit(1);
    }
}

initializeDatabase();
