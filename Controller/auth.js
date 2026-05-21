const axios = require('axios');

let cachedToken = null;
let tokenExpiresAt = 0;

async function getToken() {
  const tenantId = process.env.TENANT_ID;
  const clientId = process.env.CLIENT_ID;
  const clientSecret = process.env.CLIENT_SECRET;
  const scope = process.env.TOKEN_SCOPE || 'https://api.businesscentral.dynamics.com/.default';

  if (!tenantId || !clientId || !clientSecret) {
    throw new Error('Missing TENANT_ID, CLIENT_ID, or CLIENT_SECRET in .env');
  }

  const now = Date.now();

  if (cachedToken && now < tokenExpiresAt) {
    return cachedToken;
  }

  const tokenUrl = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`;

  const form = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    scope,
    grant_type: 'client_credentials'
  });

  const { data } = await axios.post(tokenUrl, form, {
    timeout: 10000,
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    }
  });

  if (!data.access_token) {
    throw new Error('Token response did not include access_token');
  }

  cachedToken = data.access_token;

  tokenExpiresAt = now + ((data.expires_in || 3600) - 60) * 1000;

  return cachedToken;
}

module.exports = {
  getToken
};