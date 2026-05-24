const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const LOG_DIR = process.env.LOG_DIR || 'C:\\inetpub\\wwwroot\\Webhooks\\EDM-Othaim-Webhook\\logs';

function ensureLogDir() {
  if (!fs.existsSync(LOG_DIR)) {
    fs.mkdirSync(LOG_DIR, { recursive: true });
  }
}

function getLogFileName() {
  const now = new Date();
  const date = now.toISOString().slice(0, 10); // YYYY-MM-DD
  return path.join(LOG_DIR, `${date}.log.json`);
}

function writeLog(entry) {
  try {
    ensureLogDir();

    const filePath = getLogFileName();
    const line = JSON.stringify(entry) + '\n';

    fs.appendFileSync(filePath, line, 'utf8');
  } catch (err) {
    console.error('[Logger] Failed to write log:', err.message);
  }
}

/**
 * Express middleware that logs every request and its response body.
 * Usage: app.use(requestLogger) or router.use(requestLogger)
 */
function requestLogger(req, res, next) {
  const requestId = crypto.randomUUID();
  const startedAt = new Date().toISOString();

  // Capture the raw response body by monkey-patching res.json and res.send
  const originalJson = res.json.bind(res);
  const originalSend = res.send.bind(res);

  let responseBody = null;

  res.json = function (body) {
    responseBody = body;
    return originalJson(body);
  };

  res.send = function (body) {
    // Only capture if it's a string (e.g. XML responses)
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
 * Remove sensitive headers like Authorization before logging.
 */
function sanitizeHeaders(headers) {
  const safe = { ...headers };
  if (safe.authorization) {
    safe.authorization = '[REDACTED]';
  }
  return safe;
}

module.exports = { requestLogger };
