const express = require('express');
const cors = require('cors');
const { getTopTokensData } = require('./services/binanceService');

const app = express();
const PORT = 4000;

app.use(cors());

// Main endpoint to get token data
app.get('/api/tokens', async (req, res) => {
    try {
        const tokens = await getTopTokensData();
        res.json(tokens);
    } catch (error) {
        console.error('Error fetching token data:', error);
        res.status(500).json({
            error: 'Failed to fetch token data',
            message: error.message
        });
    }
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ status: 'ok' });
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});