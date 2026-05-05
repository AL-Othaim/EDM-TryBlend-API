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

module.exports = {
  getAllItems,
  parseBusinessCentralResponse,
  createOrder,
  updateOrderStatus,
  generateTryblendToken,
  authMiddleware
};
