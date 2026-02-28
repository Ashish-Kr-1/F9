const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');

const path = require('path');
dotenv.config({ path: path.join(__dirname, '../.env') });

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Auth Routes
app.use('/api/auth', require('./routes/auth'));

// File Manager and Notepad
app.use('/api/vfs', require('./routes/vfs'));
app.use('/api/files', require('./routes/files'));

// Clippy AI Gateway — proxies to FastAPI internally
app.use('/api/clippy', require('./routes/clippy'));

// Game Scores
app.use('/api/scores', require('./routes/scores'));

// Add a simple health check route
app.get('/api/health', (req, res) => {
    res.status(200).json({ status: 'ok', message: 'API is running' });
});

const PORT = process.env.PORT || 8000;

app.listen(PORT, () => {
    console.log(`API server running at http://localhost:${PORT}`);
});
