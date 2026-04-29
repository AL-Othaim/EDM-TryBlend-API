require('dotenv').config();

const express = require('express');
const { getAllItems } = require('./businessCentral');
const { getToken } = require('./auth');

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.post('/tryblend/api/items', async (req, res) => {
  try {
    const result = await getAllItems(req);
    res.json(result.parsed);
  } catch (error) {
    res.status(500).json({
      error: 'Could not retrieve items',
      message: error.response?.data || error.message
    });
  }
});

app.get('/tryblend/api/items', async (req, res) => {
  try {
    const result = await getAllItems(req);
    res.json(result.parsed);
  } catch (error) {
    res.status(500).json({
      error: 'Could not retrieve items',
      message: error.response?.data || error.message
    });
  }
});

app.listen(port, () => {
  console.log(`API server running on http://localhost:${port}`);
});
