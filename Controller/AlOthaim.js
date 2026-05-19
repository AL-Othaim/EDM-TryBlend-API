const axios = require('axios');
const crypto = require('crypto');
const { getToken } = require('./auth');
const OrderJson = require('../Models/Order.json');
const xml2js = require('xml-js');

const TOKEN_EXPIRES_IN_SECONDS = 24 * 60 * 60;

function base64UrlEncode(value) {
  return Buffer.from(value)
    .toString('base64url');
}

function base64UrlDecode(value) {
  return Buffer.from(value, 'base64url').toString('utf8');
}

function getJwtSecret() {
  return process.env.JWT_SECRET_KEY || process.env.TRYBLEND_PASSWORD;
}

function createJwt(payload) {
  const secret = getJwtSecret();

  if (!secret) {
    throw new Error('Missing JWT_SECRET_KEY in .env');
  }

  const now = Math.floor(Date.now() / 1000);
  const header = {
    alg: 'HS256',
    typ: 'JWT'
  };
  const body = {
    ...payload,
    iat: now,
    exp: now + TOKEN_EXPIRES_IN_SECONDS
  };

  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedBody = base64UrlEncode(JSON.stringify(body));
  const unsignedToken = `${encodedHeader}.${encodedBody}`;
  const signature = crypto
    .createHmac('sha256', secret)
    .update(unsignedToken)
    .digest('base64url');

  return `${unsignedToken}.${signature}`;
}

function verifyJwt(token) {
  const secret = getJwtSecret();

  if (!secret) {
    throw new Error('Missing JWT_SECRET_KEY in .env');
  }

  const [encodedHeader, encodedBody, signature] = token.split('.');

  if (!encodedHeader || !encodedBody || !signature) {
    throw new Error('Invalid token');
  }

  const unsignedToken = `${encodedHeader}.${encodedBody}`;
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(unsignedToken)
    .digest('base64url');
  const actualSignature = Buffer.from(signature);
  const validSignature = Buffer.from(expectedSignature);

  if (
    actualSignature.length !== validSignature.length ||
    !crypto.timingSafeEqual(actualSignature, validSignature)
  ) {
    throw new Error('Invalid token');
  }

  const payload = JSON.parse(base64UrlDecode(encodedBody));

  if (payload.exp && Math.floor(Date.now() / 1000) >= payload.exp) {
    throw new Error('Token expired');
  }

  return payload;
}

function generateGUID() {
  return crypto.randomUUID();
}




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
function generateTryblendToken(email) {
  return createJwt({
    sub: email,
    email
  });
}

function authMiddleware(req, res, next) {
  const authorization = req.headers.authorization || '';
  const [scheme, token] = authorization.split(' ');

  if (scheme !== 'Bearer' || !token) {
    return res.status(401).json({ error: 'Missing bearer token' });
  }

  try {
    req.user = verifyJwt(token);
  } catch (error) {
    return res.status(403).json({ error: error.message });
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

  let token;

  try {
    token = generateTryblendToken(email);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }

  return res.json({ access_token: `Bearer ${token}` });
}

const CreateTestOrder = async (req, res) => {
  try {
    const body = req.body
    const url = process.env.BUSINESS_CENTRAL_CREATE_TEXT_ORDER_URL;

    if (!url) {
      return res.status(400).json({ status: 'error', error: 'Missing url' });
    }

    // console.log('ALOthaim', body)
    const XmlText = ConvertJsonOrderToXml(body)

    // console.log('Request XML AlOthaim: ', XmlText)

    const token = await getToken()

    const { data } = await axios.post(url, XmlText, {
      headers: {
        SOAPAction: 'urn:microsoft-dynamics-schemas/codeunit/EDM_MobilePosSave',
        'Content-Type': 'application/xml',
        Authorization: `Bearer ${token}`
      }
    })

    const options = { compact: true, ignoreComment: true, spaces: 4, fullTagEmptyElement: true }; // Optional settings
    const responseJson = JSON.parse(xml2js.xml2json(data, options));

    const result =
      responseJson['Soap:Envelope']?.['Soap:Body']?.['MobilePosSave_Result']

    const responseCode = result?.responseCode?.['_text']
    const errorText = result?.errorText?.['_text'];

    if (responseCode != '0000' && errorText)
      return res.status(400).json({ status: "error", error: errorText });


    // console.log('Response XML PBCO: ', data)
    res.set('Content-Type', 'application/xml');
    return res.send(data);
  } catch (error) {
    // console.log('PBCO', error)
    if (error?.response?.data) {
      const options = { compact: true, ignoreComment: true, spaces: 4, fullTagEmptyElement: true }; // Optional settings
      const responseJson = JSON.parse(xml2js.xml2json(error.response.data, options));
      const errorText = responseJson['s:Envelope']?.['s:Body']?.['s:Fault']?.['detail']?.['string']?.['_text'] || error.response.data
      return res.status(400).json({ status: "error", error: errorText })
    }
    return res.status(error.status || 500).json({ status: "error", error: error.message })
  }

}
const ConvertJsonOrderToXml = (body) => {
  const dataJson = JSON.parse(JSON.stringify(OrderJson));

  const ID = generateGUID();
  const dateTime = new Date().toISOString();
  dataJson.Envelope.Body.MobilePosSave.mobileTransactionXML.MobileTransaction = {
    _attributes: {
      xmlns: "urn:microsoft-dynamics-nav/xmlports/x50300"
    },

    Id: ID,
    StoreId: body.branch_id,
    TerminalId: "DCT01",
    StaffId: "1",
    TransDate: dateTime,

    CurrencyCode: body.currency || "",
    CurrencyFactor: 1,
    GenBusPostingGroup: "",
    VATBusPostingGroup: "",
    PriceGroupCode: "",
    CustomerId: "",
    CustDiscGroup: "",
    MemberCardNo: "",
    MemberPriceGroupCode: "",
    ManualTotalDiscPercent: 0,
    ManualTotalDiscAmount: 0,
    SourceType: 0,
    NetAmount: body.subtotal || 0,
    GrossAmount: body.total || 0,
    Payment: 0,
    LineDiscount: 0,
    TotalDiscount: 0,
    IncomeExpAmount: 0,
    Prepayment: 0,
    SaleIsReturnSale: false
  };

  dataJson.Envelope.Body.MobilePosSave.mobileTransactionXML.MobileReceiptInfo = [
    {
      _attributes: {xmlns: "urn:microsoft-dynamics-nav/xmlports/x50300"},Id: ID,Value: body.note || ""}
  ];

  const subLines = [];

  body.products?.forEach((product, index) => {
    product.modifiers?.forEach((modifier, modIndex) => {
      subLines.push({
        _attributes: {
          xmlns: "urn:microsoft-dynamics-nav/xmlports/x50300"
        },

        Id: ID,
        LineNo: (index + 1) * 1000 + modIndex + 1,
        ParentLineNo: (index + 1) * 1000,
        Number: modifier.id || "",
        Quantity: modifier.quantity || 0,
        NetAmount: modifier.total || 0,
        Description: modifier.note || ""
      });
    });
  });

  dataJson.Envelope.Body.MobilePosSave.mobileTransactionXML.MobileTransactionSubLine = subLines;
  delete dataJson.Envelope.Body.MobilePosSave.mobileTransactionXML.MobileTransactionLine;
  const options = {
    compact: true,
    ignoreComment: true,
    spaces: 4,
    fullTagEmptyElement: true
  };

  return xml2js.json2xml(dataJson, options);
};

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
  CreateTestOrder,
  login
};
