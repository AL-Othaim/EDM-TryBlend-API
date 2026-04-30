const axios = require('axios');
const { getToken } = require('./auth');

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
function authMiddleware(req, res, next) {
  const apiKey = req.headers['x-api-key'];

  if (!apiKey) {
    return res.status(401).json({ error: 'Missing API key' });
  }

  if (apiKey !== process.env.API_SECRET) {
    return res.status(403).json({ error: 'Invalid API key' });
  }

  next();
}

module.exports = {
  getAllItems,
  parseBusinessCentralResponse,
  createOrder,
  updateOrderStatus,
  authMiddleware
};
