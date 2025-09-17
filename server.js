const http = require('http');
const fs = require('fs');
const path = require('path');
const { URL } = require('url');

const DEFAULT_PORT = Number.parseInt(process.env.PORT, 10) || 3000;
const HTTP_PROTOCOL = process.env.RABBITMQ_HTTP_PROTOCOL || 'http';
const RABBIT_HOST = process.env.RABBITMQ_HOST || process.env.RABBITMQ_HTTP_HOST || '10.101.1.35';
const RABBIT_PORT = Number.parseInt(process.env.RABBITMQ_HTTP_PORT, 10) || 15672;
const RABBIT_USER = process.env.RABBITMQ_USER || 'administrator';
const RABBIT_PASS = process.env.RABBITMQ_PASSWORD || process.env.RABBITMQ_PASS || 'EVEFT@tc';
const RABBIT_EXCHANGE = process.env.RABBITMQ_EXCHANGE || 'evmswss_command';
const RABBIT_VHOST = process.env.RABBITMQ_VHOST || '/';

const PUBLIC_DIR = path.join(__dirname, 'public');
const ALLOWED_KEY_NAMES = new Set([
  'G_ChargerMode',
  'G_ServerURL',
  'G_ServerURL2',
  'G_MaxCurrent',
  'G_MaxCurrentC',
  'G_MaxCurrentD',
  'G_ChargerID',
  'G_ChargerRate',
  'G_CardPin',
  'G_ChargerLanguage',
  'G_MaxPower',
  'G_MaxPowerA',
  'G_MaxPowerB',
  'G_MaxPowerC',
  'G_MaxPowerD',
  'G_MaxPowerE',
  'G_MaxPowerF',
  'G_MaxPowerG',
  'G_MaxPowerH',
  'G_ChargerNetIP',
  'G_ChargerNetGateway',
  'G_ChargerNetMac',
  'G_ChargerNetMask',
  'G_ChargerNetDNS',
  'G_Authentication',
  'G_MaxTemperature',
  'G_ChargerType',
  'UserPassword',
  'UserPassword2',
  'G_ChargerSN',
  'G_DSPVerA',
  'G_DSPVerB',
  'G_SECCVerA',
  'G_SECCVerB',
  'G_LCD_SCREEN',
  'EvccMacB',
  'EvccMacA',
  'G_HearbeatInterval',
  'G_WebSocketPingInterval',
  'G_MeterValueInterval',
  'AdminPassword',
  'G_LowTemperature',
  'G_InsInChargingEnable',
  'G_RemoteControlGroup',
  'G_RemoteStartGroup',
]);

function isValidIpAddress(value) {
  if (typeof value !== 'string') {
    return false;
  }
  const pattern = /^(25[0-5]|2[0-4]\d|[0-1]?\d?\d)(\.(25[0-5]|2[0-4]\d|[0-1]?\d?\d)){3}$/;
  return pattern.test(value);
}

function validateCommand(command) {
  return command === 'get_config' || command === 'set_config';
}

function buildPayloadFromFields(fields) {
  const errors = [];
  const { ipaddress, command, key_name: keyName, key_value: keyValue } = fields || {};

  if (!isValidIpAddress(ipaddress)) {
    errors.push('IP address is invalid.');
  }

  if (!validateCommand(command)) {
    errors.push('Command must be either "get_config" or "set_config".');
  }

  if (!ALLOWED_KEY_NAMES.has(keyName)) {
    errors.push('Key name is not in the allowed list.');
  }

  if (command === 'set_config' && (keyValue === undefined || keyValue === null || String(keyValue).trim() === '')) {
    errors.push('Key value is required when using set_config.');
  }

  if (errors.length > 0) {
    return { errors };
  }

  const payload = {
    charger: {
      ipaddress,
      command,
      key_name: keyName,
    },
  };

  if (command === 'set_config') {
    payload.charger.key_value = keyValue;
  }

  return { payload };
}

function isObject(value) {
  return Object.prototype.toString.call(value) === '[object Object]';
}

function validatePayloadStructure(data) {
  if (!isObject(data) || !isObject(data.charger)) {
    return 'Payload must be a JSON object with a "charger" object.';
  }
  const { charger } = data;
  const { ipaddress, command, key_name: keyName } = charger;

  if (!isValidIpAddress(ipaddress)) {
    return 'Invalid IP address in payload.';
  }
  if (!validateCommand(command)) {
    return 'Invalid command in payload.';
  }
  if (!ALLOWED_KEY_NAMES.has(keyName)) {
    return 'Invalid key name in payload.';
  }
  if (command === 'set_config') {
    if (!('key_value' in charger) || String(charger.key_value).trim() === '') {
      return 'Payload for set_config must include a non-empty key_value.';
    }
  }
  return null;
}

function readRequestBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (chunk) => {
      chunks.push(chunk);
      if (Buffer.concat(chunks).length > 1_000_000) {
        reject(new Error('Payload too large.'));
        req.destroy();
      }
    });
    req.on('end', () => {
      resolve(Buffer.concat(chunks).toString('utf8'));
    });
    req.on('error', reject);
  });
}

function sendJson(res, statusCode, data) {
  const body = JSON.stringify(data);
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(body),
  });
  res.end(body);
}

function sendNotFound(res) {
  res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
  res.end('Not found');
}

function getContentType(extension) {
  switch (extension) {
    case '.html':
      return 'text/html; charset=utf-8';
    case '.css':
      return 'text/css; charset=utf-8';
    case '.js':
      return 'text/javascript; charset=utf-8';
    case '.png':
      return 'image/png';
    case '.jpg':
    case '.jpeg':
      return 'image/jpeg';
    case '.svg':
      return 'image/svg+xml';
    case '.ico':
      return 'image/x-icon';
    default:
      return 'application/octet-stream';
  }
}

async function publishToRabbit(payload) {
  const url = `${HTTP_PROTOCOL}://${RABBIT_HOST}:${RABBIT_PORT}/api/exchanges/${encodeURIComponent(RABBIT_VHOST)}/${encodeURIComponent(RABBIT_EXCHANGE)}/publish`;
  const body = {
    routing_key: '',
    payload: JSON.stringify(payload),
    payload_encoding: 'string',
    properties: {
      content_type: 'application/json',
    },
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${Buffer.from(`${RABBIT_USER}:${RABBIT_PASS}`).toString('base64')}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`RabbitMQ publish failed: ${response.status} ${response.statusText} - ${text}`);
  }

  const result = await response.json();
  return result;
}

async function handleSendCommand(req, res) {
  try {
    const rawBody = await readRequestBody(req);
    let body;
    try {
      body = JSON.parse(rawBody);
    } catch (error) {
      return sendJson(res, 400, { error: 'Request body must be valid JSON.' });
    }

    const { mode, payload, fields } = body || {};

    let message;

    if (mode === 'custom') {
      if (typeof payload !== 'string') {
        return sendJson(res, 400, { error: 'Custom payload must be a JSON string.' });
      }
      let parsed;
      try {
        parsed = JSON.parse(payload);
      } catch (error) {
        return sendJson(res, 400, { error: 'Custom payload is not valid JSON.' });
      }
      const validationError = validatePayloadStructure(parsed);
      if (validationError) {
        return sendJson(res, 400, { error: validationError });
      }
      message = parsed;
    } else {
      const { payload: builtPayload, errors } = buildPayloadFromFields(fields);
      if (errors && errors.length > 0) {
        return sendJson(res, 400, { error: errors.join(' ') });
      }
      message = builtPayload;
    }

    const publishResult = await publishToRabbit(message);

    return sendJson(res, 200, {
      success: true,
      routed: publishResult.routed,
      payload: message,
    });
  } catch (error) {
    console.error('Failed to send command:', error);
    return sendJson(res, 500, { error: 'Failed to send command to RabbitMQ.', detail: error.message });
  }
}

function serveStaticFile(res, filePath) {
  fs.readFile(filePath, (err, data) => {
    if (err) {
      if (err.code === 'ENOENT') {
        return sendNotFound(res);
      }
      res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Internal Server Error');
      return;
    }
    const extension = path.extname(filePath);
    res.writeHead(200, { 'Content-Type': getContentType(extension) });
    res.end(data);
  });
}

const server = http.createServer((req, res) => {
  const parsedUrl = new URL(req.url, `${req.headers['x-forwarded-proto'] || 'http'}://${req.headers.host}`);

  if (req.method === 'POST' && parsedUrl.pathname === '/api/send-command') {
    handleSendCommand(req, res);
    return;
  }

  if (req.method === 'GET') {
    let relativePath = decodeURIComponent(parsedUrl.pathname);
    if (relativePath === '/') {
      relativePath = '/index.html';
    }

    const sanitizedPath = path.normalize(relativePath).replace(/^\.\.(\/|\\|$)/, '');
    const filePath = path.join(PUBLIC_DIR, sanitizedPath);

    if (!filePath.startsWith(PUBLIC_DIR)) {
      sendNotFound(res);
      return;
    }

    serveStaticFile(res, filePath);
    return;
  }

  res.writeHead(405, { 'Content-Type': 'text/plain; charset=utf-8' });
  res.end('Method Not Allowed');
});

server.listen(DEFAULT_PORT, () => {
  console.log(`Server listening on http://localhost:${DEFAULT_PORT}`);
});
