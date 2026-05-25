const axios = require('axios');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const { getToken } = require('./auth');
const OrderJson = require('../Models/Order.json');
const xml2js = require('xml-js');

const TOKEN_EXPIRES_IN_SECONDS = 10 * 60;
const TRYBLEND_TOKEN_USE = 'tryblend_access';
const AUTH_ERROR_MESSAGE = 'Invalid authorization token';
const JWT_OPTIONS = {
  issuer: 'tryblend-api',
  audience: 'tryblend-client'
};
const activeTokenIdsByEmail = new Map();

function getJwtSecret() {
  const secret = process.env.JWT_SECRET_KEY;

  if (!secret) {
    throw new Error('Missing JWT_SECRET_KEY in .env');
  }

  return secret;
}

function generateGuid() {
  return crypto.randomUUID();
}

function createJwt(payload) {
  return jwt.sign(payload, getJwtSecret(), {
    expiresIn: TOKEN_EXPIRES_IN_SECONDS,
    ...JWT_OPTIONS
  });
}

function verifyJwt(token) {
  const payload = jwt.verify(token, getJwtSecret(), JWT_OPTIONS);

  if (!isActiveTryblendToken(payload)) {
    throw new Error(AUTH_ERROR_MESSAGE);
  }

  return payload;
}

function isActiveTryblendToken(payload) {
  return (
    payload.token_use === TRYBLEND_TOKEN_USE &&
    Boolean(payload.email) &&
    Boolean(payload.jti) &&
    activeTokenIdsByEmail.get(payload.email) === payload.jti
  );
}

function generateTryblendToken(email) {
  const tokenId = generateGuid();

  const token = createJwt({
    sub: email,
    email,
    jti: tokenId,
    token_use: TRYBLEND_TOKEN_USE
  });

  activeTokenIdsByEmail.set(email, tokenId);

  return token;
}

function getAuthorizationToken(req) {
  const authorization = req.headers.authorization || '';
  const [scheme, bearerToken] = authorization.split(' ');

  return scheme === 'Bearer' ? bearerToken : authorization;
}

function authMiddleware(req, res, next) {
  try {
    const token = getAuthorizationToken(req);

    if (!token) {
      return res.status(401).json({
        error: 'Missing authorization token'
      });
    }

    req.user = verifyJwt(token);

    next();
  } catch (error) {
    return res.status(401).json({
      error: AUTH_ERROR_MESSAGE
    });
  }
}

function getErrorMessage(error) {
  if (error.response?.data) {
    return error.response.data;
  }

  return error.message;
}

function parseBusinessCentralResponse(data) {
  if (data && typeof data.value === 'string') {
    try {
      return JSON.parse(data.value);
    } catch {
      return data.value;
    }
  }

  return data;
}

async function makeBusinessCentralRequest(url, body = null, extraHeaders = {}) {
  if (!url) {
    throw new Error('Missing Business Central URL');
  }

  const token = await getToken();

  const { data } = await axios.post(url, body, {
    timeout: 15000,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
      ...extraHeaders
    }
  });

  return {
    raw: data,
    parsed: parseBusinessCentralResponse(data)
  };
}

async function getAllItems() {
  return makeBusinessCentralRequest(
    process.env.BUSINESS_CENTRAL_GET_ITEMS_URL
  );
}

/* async function createOrder() {
  return makeBusinessCentralRequest(
    process.env.BUSINESS_CENTRAL_CREATE_ORDER_URL
  );
} */

async function updateOrderStatus() {
  return makeBusinessCentralRequest(
    process.env.BUSINESS_CENTRAL_UPDATE_ORDER_STATUS_URL
  );
}

function sanitizeXmlValue(value) {
  if (value === null || value === undefined) {
    return '';
  }

  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

const ConvertJsonOrderToXml = (body) => {
  const dataJson = OrderJson
  const ID = generateGuid()
  const dateTime = new Date().toISOString();

  const header = dataJson.Envelope.Body.MobilePosSave.mobileTransactionXML.MobileTransaction

  dataJson.Envelope.Body.MobilePosSave.mobileTransactionXML.MobileTransaction = {
    ...header,
    Id: ID,
    StoreId: 'DC001',
    TerminalId: 'DCT01',
    StaffId: '1',
    TransDate: dateTime,
    NetAmount: body.subtotal || 0,
    GrossAmount: body.total || 0,
  }

  const Line = dataJson.Envelope.Body.MobilePosSave.mobileTransactionXML.MobileTransactionLine[0]

  dataJson.Envelope.Body.MobilePosSave.mobileTransactionXML.MobileTransactionLine =
    body.products?.map((product, index) => ({
      ...Line,
      Id: ID,
      StoreId: 'DC001',
      LineNo: (index + 1) * 1000,
      LineType: 0,
      Number: sanitizeXmlValue(product.id || ''),
      Quantity: product.quantity || 0,
      NetAmount: product.total || 0,
      VatBusPostingGroup: 'VAT',
      GenBusPostingGroup: 'RETAIL',
      TransDate: dateTime,
      RecommendedItem: false,
    }))

  const options = { compact: true, ignoreComment: true, spaces: 4, fullTagEmptyElement: true }; // Optional settings
  const xml = xml2js.json2xml(dataJson, options);
  return xml
}

const createSalesOrder = async (req, res) => {
  try {
    const body = req.body;
    console.log('Al Othaim', body);

    const url = process.env.BUSINESS_CENTRAL_CREATE_TEST_ORDER_URL;

    if (!url) {
      return res.status(400).json({
        status: 'error',
        error: 'Missing URL'
      });
    }
    console.log('AL Othaim', body)
    const xmlText = ConvertJsonOrderToXml(body);
    console.log('Request XML Al Othaim: ', xmlText);

    const result = await makeBusinessCentralRequest(
      url,
      xmlText,
      {
        SOAPAction: 'urn:microsoft-dynamics-schemas/codeunit/EDM_MobilePosSave',
        'Content-Type': 'application/xml'
      }
    );

    const options = { compact: true, ignoreComment: true, spaces: 4, fullTagEmptyElement: true };
    const responseJson = JSON.parse(xml2js.xml2json(result.raw, options));

    const soapResult =
      responseJson['Soap:Envelope']?.['Soap:Body']?.['MobilePosSave_Result'];

    const responseCode = soapResult?.responseCode?.['_text'];
    const errorText = soapResult?.errorText?.['_text'];

    if (responseCode !== '0000' && errorText)
      return res.status(400).json({ status: 'error', error: errorText });

    console.log('Response XML Al Othaim: ', result.raw);
    res.set('Content-Type', 'application/xml');
    return res.send(result.raw);
  } catch (error) {
    console.log('Al Othaim', error);
    if (error?.response?.data) {
      const options = { compact: true, ignoreComment: true, spaces: 4, fullTagEmptyElement: true };
      const responseJson = JSON.parse(xml2js.xml2json(error.response.data, options));
      const errorText = responseJson['s:Envelope']?.['s:Body']?.['s:Fault']?.['detail']?.['string']?.['_text'] || error.response.data;
      return res.status(400).json({ status: 'error', error: errorText });
    }
    return res.status(error.status || 500).json({ status: 'error', error: error.message });
  }
};


async function getItems(req, res) {
  try {
    const result = await getAllItems();

    return res.json(result.parsed);
  } catch (error) {
    return res.status(500).json({
      error: 'Could not retrieve items',
      message: getErrorMessage(error)
    });
  }
}

/* async function createSalesOrder(req, res) {
  try {
    const result = await createOrder();

    return res.json(result.parsed);
  } catch (error) {
    return res.status(500).json({
      error: 'Could not create order',
      message: getErrorMessage(error)
    });
  }
} */

async function setOrderStatus(req, res) {
  try {
    const result = await updateOrderStatus();

    return res.json(result.parsed);
  } catch (error) {
    return res.status(500).json({
      error: 'Could not update order status',
      message: getErrorMessage(error)
    });
  }
}

function isTryblendLoginValid(email, password) {
  return (
    email === process.env.TRYBLEND_EMAIL &&
    password === process.env.TRYBLEND_PASSWORD
  );
}

function login(req, res) {
  const { email, password } = req.body || {};

  if (!email || !password) {
    return res.status(400).json({
      error: 'Missing email or password'
    });
  }

  if (!isTryblendLoginValid(email, password)) {
    return res.status(401).json({
      error: 'Invalid email or password'
    });
  }

  const token = generateTryblendToken(email);

  return res.json({
    access_token: token,
    token_type: 'Bearer',
    expires_in: TOKEN_EXPIRES_IN_SECONDS
  });
}

module.exports = {
  getAllItems,
  parseBusinessCentralResponse,
  // createOrder,
  updateOrderStatus,
  generateTryblendToken,
  authMiddleware,
  getItems,
  // createSalesOrder,
  setOrderStatus,
  createSalesOrder,
  login
};
