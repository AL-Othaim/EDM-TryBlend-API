const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const LOG_DIR = process.env.LOG_DIR || 'C:\\inetpub\\wwwroot\\Webhooks\\EDM-Othaim-Webhook\\logs';
const PAYLOAD_DIR = path.join(LOG_DIR, 'payloads');

function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function getLogFileName() {
  const date = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  return path.join(LOG_DIR, `${date}.log.json`);
}

function writeLog(entry) {
  try {
    ensureDir(LOG_DIR);
    const line = JSON.stringify(entry) + '\n';
    fs.appendFileSync(getLogFileName(), line, 'utf8');
  } catch (err) {
    console.error('[Logger] Failed to write log:', err.message);
  }
}

/**
 * Writes the raw incoming JSON body to its own file under logs/payloads/
 * Filename: payloads/YYYY-MM-DD_HH-MM-SS_<requestId>.json
 */
function writePayload(requestId, timestamp, body) {
  try {
    if (!body || Object.keys(body).length === 0) return;

    ensureDir(PAYLOAD_DIR);

    const safeTimestamp = timestamp.replace(/:/g, '-').replace(/\..+/, '');
    const fileName = `${safeTimestamp}_${requestId}.json`;
    const filePath = path.join(PAYLOAD_DIR, fileName);

    fs.writeFileSync(filePath, JSON.stringify(body, null, 2), 'utf8');
  } catch (err) {
    console.error('[Logger] Failed to write payload file:', err.message);
  }
}

/**
 * Express middleware that logs every request and its response.
 * Also writes a dedicated pretty-printed JSON file for each incoming payload.
 */
function requestLogger(req, res, next) {
  const requestId = crypto.randomUUID();
  const startedAt = new Date().toISOString();

  // Write incoming payload immediately (don't wait for response)
  writePayload(requestId, startedAt, req.body);

  // Capture response body
  const originalJson = res.json.bind(res);
  const originalSend = res.send.bind(res);
  let responseBody = null;

  res.json = function (body) {
    responseBody = body;
    return originalJson(body);
  };

  res.send = function (body) {
    if (typeof body === 'string') {
      responseBody = body;
    }
    return originalSend(body);
  };

  res.on('finish', () => {
    const entry = {
      requestId,
      timestamp: startedAt,
      completedAt: new Date().toISOString(),
      request: {
        method: req.method,
        url: req.originalUrl,
        headers: sanitizeHeaders(req.headers),
        body: req.body ?? null
      },
      response: {
        statusCode: res.statusCode,
        body: responseBody
      }
    };

    writeLog(entry);
  });

  next();
}

/**
 * Redact sensitive headers before logging.
 */
function sanitizeHeaders(headers) {
  const safe = { ...headers };
  if (safe.authorization) {
    safe.authorization = '[REDACTED]';
  }
  return safe;
}

module.exports = { requestLogger };
