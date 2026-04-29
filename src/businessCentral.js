const axios = require('axios');
const { getToken } = require('./auth');

function parseBusinessCentralResponse(data) {
  if (data && typeof data.value === 'string') {
    return JSON.parse(data.value);
  }

  return data;
}

async function getAllItems() {
  const url = process.env.BUSINESS_CENTRAL_URL;

  if (!url) {
    throw new Error('Missing BUSINESS_CENTRAL_URL in .env');
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

module.exports = {
  getAllItems,
  parseBusinessCentralResponse
};
