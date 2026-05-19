const axios = require('axios');
const crypto = require('crypto');
const { getToken } = require('./auth');

const issuedTokens = new Set();

function parseBusinessCentralResponse(data) {
  if (data && typeof data.value === 'string') {
    try {
      return JSON.parse(data.value);
    } catch (e) {
      return data.value;
    }
  }

  return data;
}

async function getAllItems() {
  const url = process.env.BUSINESS_CENTRAL_GET_ITEMS_URL;

  if (!url) {
    throw new Error('Missing BUSINESS_CENTRAL_GET_ITEMS_URL in .env');
  }

  const token = await getToken();
  const { data } = await axios.post(url, null, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json'
    }
  });

  return {
    raw: data,
    parsed: parseBusinessCentralResponse(data)
  };
}
async function createOrder() {
  const url = process.env.BUSINESS_CENTRAL_CREATE_ORDER_URL;

  if (!url) {
    throw new Error('Missing BUSINESS_CENTRAL_CREATE_ORDER_URL in .env');
  }

  const token = await getToken();
  const { data } = await axios.post(url, null, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json'
    }
  });

  return {
    raw: data,
    parsed: parseBusinessCentralResponse(data)
  };
}
async function updateOrderStatus() {
  const url = process.env.BUSINESS_CENTRAL_UPDATE_ORDER_STATUS_URL;

  if (!url) {
    throw new Error('Missing BUSINESS_CENTRAL_UPDATE_ORDER_STATUS_URL in .env');
  }

  const token = await getToken();
  const { data } = await axios.post(url, null, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json'
    }
  });

  return {
    raw: data,
    parsed: parseBusinessCentralResponse(data)
  };
}
function generateTryblendToken() {
  const token = crypto.randomBytes(32).toString('hex');
  issuedTokens.add(token);
  return token;
}

function authMiddleware(req, res, next) {
  const authorization = req.headers.authorization || '';
  const [scheme, token] = authorization.split(' ');

  if (scheme !== 'Bearer' || !token) {
    return res.status(401).json({ error: 'Missing bearer token' });
  }

  if (!issuedTokens.has(token)) {
    return res.status(403).json({ error: 'Invalid bearer token' });
  }

  next();
}

function getErrorMessage(error) {
  return error.response?.data || error.message;
}

async function getItems(req, res) {
  try {
    const result = await getAllItems();
    res.json(result.parsed);
  } catch (error) {
    res.status(500).json({
      error: 'Could not retrieve items',
      message: getErrorMessage(error)
    });
  }
}

async function createSalesOrder(req, res) {
  try {
    const result = await createOrder();
    res.json(result.parsed);
  } catch (error) {
    res.status(500).json({
      error: 'Could not create order',
      message: getErrorMessage(error)
    });
  }
}

async function setOrderStatus(req, res) {
  try {
    const result = await updateOrderStatus();
    res.json(result.parsed);
  } catch (error) {
    res.status(500).json({
      error: 'Could not update order status',
      message: getErrorMessage(error)
    });
  }
}

function login(req, res) {
  const { email, password } = req.body || {};

  if (!email || !password) {
    return res.status(400).json({ error: 'Missing email or password' });
  }

  if (
    email !== process.env.TRYBLEND_EMAIL ||
    password !== process.env.TRYBLEND_PASSWORD
  ) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }

  const token = generateTryblendToken();
  return res.json({ access_token: `Bearer ${token}` });
}

module.exports = {
  getAllItems,
  parseBusinessCentralResponse,
  createOrder,
  updateOrderStatus,
  generateTryblendToken,
  authMiddleware,
  getItems,
  createSalesOrder,
  setOrderStatus,
  login
};
