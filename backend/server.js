const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');

dotenv.config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Auth Routes (to be implemented)
app.use('/api/auth', require('./routes/auth'));

// Add a simple health check route
app.get('/api/health', (req, res) => {
    res.status(200).json({ status: 'ok', message: 'API is running' });
});

const PORT = process.env.PORT || 8000;

app.listen(PORT, () => {
    console.log(`API server running at http://localhost:${PORT}`);
});
