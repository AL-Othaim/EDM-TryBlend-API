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

const createtestOrder = async (req, res) => {

  try {
    const body = req.body
    console.log('ALOthaim', body)
    const XmlText = ConvertJsonOrderToXml(body)

    console.log('Request XML PBCO: ', XmlText)

    const url = BUSINESS_CENTRAL_CREATE_ORDER_URL

    const { url, username, password } = pbcoStores?.[body.posLocationId.toLowerCase()]?.connection

    console.log(pbcoStores?.[body.posLocationId.toLowerCase()]?.connection)

    const token = Buffer.from(`${username}:${password}`).toString('base64')
    const { data } = await axios.post(url, XmlText, {
      headers: {
        Authorization: `Basic ${token}`,
        SOAPAction: 'urn:microsoft-dynamics-schemas/codeunit/EDM_MobilePosSave',
        'Content-Type': 'application/xml'
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


    console.log('Response XML PBCO: ', data)
    res.set('Content-Type', 'application/xml');
    return res.send(data);
  } catch (error) {
    console.log('PBCO', error)
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

  const transactionTemplate =
    dataJson.Envelope.Body.MobilePosSave
      .mobileTransactionXML.MobileTransaction;

  // ------------------------
  // STATUS MAPPING
  // ------------------------
  const statusMap = {
    PENDING: 2,
    ACCEPTED: 2,
    PREPARING: 2,
    CANCELED: 8,
    REJECTED: 8,
    TIME_OUT: 8,
  };

  // ------------------------
  // MOBILE TRANSACTION
  // ------------------------
  dataJson.Envelope.Body.MobilePosSave.mobileTransactionXML.MobileTransaction = {
    ...transactionTemplate,

    Id: ID,
    StoreId: body.branch_id,
    TransDate: dateTime,

    DeliverECTTransId: body.partner_reference,
    AggregatorOrderID: body.partner_reference,

    TransactionType: statusMap[body.status] || 2,

    ManualTotalDiscAmount: 0,

    NetAmount: body.subtotal,
    GrossAmount: body.total,
    TAXAmount: body.tax,

    Comment: body.note || "",

    PaymentType: "cash",

    MemberMobNo: body.customer?.phone || "",
    MemberName: body.customer?.name || "",
    MemberEmail: "",

    Channel: body.brand_id,
  };

  // ------------------------
  // LINE TEMPLATE
  // ------------------------
  const lineTemplate =
    dataJson.Envelope.Body.MobilePosSave
      .mobileTransactionXML.MobileTransactionLine[0];

  const lines = [];

  body.products?.forEach((product, index) => {

    // MAIN PRODUCT LINE
    lines.push({
      ...lineTemplate,

      Id: ID,
      StoreId: body.branch_id,

      LineNo: (index + 1) * 1000,

      Number: product.id,

      Quantity: product.quantity,

      ManualPrice:
        product.quantity > 0
          ? product.total / product.quantity
          : product.total,

      NetAmount: product.total,

      TransDate: dateTime,

      LineComment: product.note || "",
    });

    // ------------------------
    // MODIFIERS
    // ------------------------
    product.modifiers?.forEach((modifier, modIndex) => {
      lines.push({
        ...lineTemplate,

        Id: ID,
        StoreId: body.branch_id,

        LineNo: ((index + 1) * 1000) + (modIndex + 1),

        Number: modifier.id,

        Quantity: modifier.quantity,

        ManualPrice:
          modifier.quantity > 0
            ? modifier.total / modifier.quantity
            : modifier.total,

        NetAmount: modifier.total,

        TransDate: dateTime,

        LineComment: modifier.note || "",

        // Optional:
        // Mark modifier as comment/addon
        LineType: 0,
      });
    });
  });

  dataJson.Envelope.Body.MobilePosSave
    .mobileTransactionXML.MobileTransactionLine = lines;

  // ------------------------
  // XML OPTIONS
  // ------------------------
  const options = {
    compact: true,
    ignoreComment: true,
    spaces: 4,
    fullTagEmptyElement: true,
  };

  const xml = xml2js.json2xml(dataJson, options);

  return xml;
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
  login
};
