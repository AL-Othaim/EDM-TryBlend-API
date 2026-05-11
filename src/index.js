require('dotenv').config();

const express = require('express');
const { getAllItems,createOrder,updateOrderStatus ,generateTryblendToken,authMiddleware} = require('./businessCentral');

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.post('/tryblend/api/items',authMiddleware, async (req, res) => {
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

app.get('/tryblend/api/items',authMiddleware, async (req, res) => {
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
app.post('/tryblend/api/create-order',authMiddleware, async (req, res) => {
  try {
    const result = await createOrder(req);
    res.json(result.parsed);
  } catch (error) {
    res.status(500).json({
      error: 'Could not create order',
      message: error.response?.data || error.message
    });
  }
});
app.post('/tryblend/api/order-status',authMiddleware, async (req, res) => {
  try {
    const result = await updateOrderStatus(req);
    res.json(result.parsed);
  } catch (error) {
    res.status(500).json({
      error: 'Could not update order status',
      message: error.response?.data || error.message
    });
  }
});
app.post('/tryblend/api/login', async (req, res) => {
  const { email, password } = req.body || {};

  if (!email || !password) {
    return res.status(400).json({ error: 'Missing email or password' });
  }

  if (
    email != process.env.TRYBLEND_EMAIL ||
    password != process.env.TRYBLEND_PASSWORD
  ) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }

  const token = generateTryblendToken();
  res.json({ token: `Bearer ${token}` });
});

app.listen(port, () => {
  console.log(`API server running on http://localhost:${port}`);
});
