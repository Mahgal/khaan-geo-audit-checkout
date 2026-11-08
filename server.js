'use strict';
/**
 * KHAAN GEO Audit Checkout — single-file app server (zero dependencies).
 *
 * Serves the storefront (public/) and the JSON API:
 *   GET  /api/health          liveness
 *   GET  /api/config          PayPal mode + public client id (never the secret)
 *   POST /api/preview         { brand, url?, category } -> visibility preview
 *   POST /api/orders/create   { brand, category, email? } -> { orderId, paypalOrderId, mode }
 *   POST /api/orders/capture  { orderId, paypalOrderId }  -> order confirmation
 *
 * Run:  cp .env.example .env (optional) ; node server.js
 * Without PayPal credentials the app runs in DEMO MODE (see lib/paypal.js):
 * the checkout flow works end-to-end with simulated PayPal responses and is
 * labeled as such in the UI and API responses.
 */
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');

// Tiny .env loader (no dependencies): KEY=VALUE lines.
const envFile = path.join(__dirname, '.env');
if (fs.existsSync(envFile)) {
  for (const line of fs.readFileSync(envFile, 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/i);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
  }
}

const paypal = require('./lib/paypal');
const store = require('./lib/store');
const { generatePreview, CATEGORIES } = require('./lib/preview');

const PORT = Number(process.env.PORT || 8080);
const PUBLIC_DIR = path.join(__dirname, 'public');
const MIME = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.svg': 'image/svg+xml', '.png': 'image/png', '.ico': 'image/x-icon' };

// Crude per-IP rate limit for the two expensive endpoints.
const hits = new Map();
function rateLimited(ip, limit = 30, windowMs = 60_000) {
  const now = Date.now();
  const arr = (hits.get(ip) || []).filter((t) => now - t < windowMs);
  arr.push(now);
  hits.set(ip, arr);
  return arr.length > limit;
}

function sendJson(res, status, obj) {
  const body = JSON.stringify(obj);
  res.writeHead(status, { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) });
  res.end(body);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (c) => {
      data += c;
      if (data.length > 64 * 1024) reject(new Error('body too large'));
    });
    req.on('end', () => {
      try { resolve(data ? JSON.parse(data) : {}); } catch { reject(new Error('invalid JSON')); }
    });
    req.on('error', reject);
  });
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'local';
  try {
    if (url.pathname === '/api/health') return sendJson(res, 200, { ok: true, service: 'khaan-geo-checkout', mode: paypal.mode() });

    if (url.pathname === '/api/config') {
      return sendJson(res, 200, {
        mode: paypal.mode(),
        clientId: paypal.isConfigured() ? process.env.PAYPAL_CLIENT_ID : null,
        currency: paypal.PRODUCT.currency,
        amount: paypal.PRODUCT.amount,
        categories: Object.entries(CATEGORIES).map(([key, v]) => ({ key, label: v.label })),
      });
    }

    if (url.pathname === '/api/preview' && req.method === 'POST') {
      if (rateLimited(ip)) return sendJson(res, 429, { error: 'rate limited, try again in a minute' });
      const body = await readBody(req);
      const brand = String(body.brand || '').trim();
      if (!brand) return sendJson(res, 400, { error: 'brand is required' });
      const preview = await generatePreview({ brand, url: String(body.url || '').trim(), category: String(body.category || 'ai-video') });
      return sendJson(res, 200, preview);
    }

    if (url.pathname === '/api/orders/create' && req.method === 'POST') {
      if (rateLimited(ip)) return sendJson(res, 429, { error: 'rate limited, try again in a minute' });
      const body = await readBody(req);
      const orderId = store.newOrderId();
      const order = store.put({
        id: orderId,
        brand: String(body.brand || '').trim(),
        category: String(body.category || ''),
        email: String(body.email || '').trim(),
        amount: paypal.PRODUCT.amount,
        currency: paypal.PRODUCT.currency,
        status: 'CREATED',
        mode: paypal.mode(),
        paypalOrderId: null,
        created_at: new Date().toISOString(),
      });
      const pp = await paypal.createOrder(orderId);
      store.update(orderId, { paypalOrderId: pp.id });
      return sendJson(res, 200, { orderId, paypalOrderId: pp.id, mode: paypal.mode() });
    }

    if (url.pathname === '/api/orders/capture' && req.method === 'POST') {
      const body = await readBody(req);
      const order = store.get(String(body.orderId || ''));
      if (!order) return sendJson(res, 404, { error: 'order not found' });
      if (order.status === 'PAID') return sendJson(res, 200, { ok: true, alreadyPaid: true, order });
      const paypalOrderId = String(body.paypalOrderId || order.paypalOrderId || '');
      let result = await paypal.captureOrder(paypalOrderId);
      if (result.status !== 'COMPLETED') {
        // Ambiguous response — verify before declaring failure (INTEGRATION-TODO #5).
        const check = await paypal.getOrder(paypalOrderId);
        if (check.status === 'COMPLETED') result = check;
      }
      if (result.status !== 'COMPLETED') {
        store.update(order.id, { status: 'CAPTURE_FAILED' });
        return sendJson(res, 502, { error: `capture did not complete (status: ${result.status})`, orderId: order.id });
      }
      const capture = result.purchase_units?.[0]?.payments?.captures?.[0] || {};
      const paid = store.update(order.id, {
        status: 'PAID',
        paypalCaptureId: capture.id || null,
        payerEmail: result.payer?.email_address || order.email || null,
        paid_at: new Date().toISOString(),
      });
      return sendJson(res, 200, { ok: true, order: paid });
    }

    // Static files
    const rel = url.pathname === '/' ? 'index.html' : url.pathname.slice(1);
    const file = path.join(PUBLIC_DIR, rel);
    if (!file.startsWith(PUBLIC_DIR) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      return res.end('not found');
    }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream' });
    fs.createReadStream(file).pipe(res);
  } catch (err) {
    console.error(err);
    return sendJson(res, 500, { error: err.message || 'internal error' });
  }
});

server.listen(PORT, () => {
  console.log(`KHAAN GEO Audit Checkout listening on http://localhost:${PORT} (PayPal mode: ${paypal.mode()})`);
});
