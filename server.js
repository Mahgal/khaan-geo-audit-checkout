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

function esc(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function sendHtml(res, status, title, inner) {
  const body = `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${esc(title)}</title><style>body{margin:0;background:#0a0a0c;color:#f2ead2;font-family:Georgia,'Times New Roman',serif}.wrap{max-width:680px;margin:0 auto;padding:56px 20px}.brand{color:#d4a017;letter-spacing:.35em;font-size:13px;text-transform:uppercase}h1{color:#f6dd8a;letter-spacing:.04em}.card{background:rgba(255,255,255,.06);border:1px solid rgba(212,160,23,.35);border-radius:14px;padding:22px;margin-top:20px}.row{display:flex;justify-content:space-between;gap:12px;padding:9px 0;border-bottom:1px dashed rgba(255,255,255,.12)}a{color:#f6dd8a}</style></head><body><div class="wrap"><div class="brand">Khaan Superintelligence</div>${inner}</div></body></html>`;
  res.writeHead(status, { 'Content-Type': 'text/html; charset=utf-8', 'Content-Length': Buffer.byteLength(body) });
  res.end(body);
}

/**
 * Shared capture flow used by POST /api/orders/capture and by the
 * /checkout/success return page. Idempotent: a PAID order is returned
 * as-is. Returns { httpStatus, payload } mirroring the API response.
 */
async function captureFlow(order) {
  if (order.status === 'PAID') return { httpStatus: 200, payload: { ok: true, alreadyPaid: true, order } };
  const paypalOrderId = String(order.paypalOrderId || '');
  let result;
  try {
    result = await paypal.captureOrder(paypalOrderId);
  } catch (err) {
    if (err.statusCode && err.statusCode >= 400 && err.statusCode < 500) {
      store.update(order.id, { status: 'CAPTURE_FAILED' });
      return { httpStatus: err.statusCode, payload: { error: err.message, details: err.details, orderId: order.id } };
    }
    throw err;
  }
  if (result.status !== 'COMPLETED') {
    // Ambiguous response — verify before declaring failure (INTEGRATION-TODO #5).
    const check = await paypal.getOrder(paypalOrderId);
    if (check.status === 'COMPLETED') result = check;
  }
  if (result.status !== 'COMPLETED') {
    store.update(order.id, { status: 'CAPTURE_FAILED' });
    return { httpStatus: 502, payload: { error: `capture did not complete (status: ${result.status})`, orderId: order.id } };
  }
  const capture = result.purchase_units?.[0]?.payments?.captures?.[0] || {};
  const paid = store.update(order.id, {
    status: 'PAID',
    paypalCaptureId: capture.id || null,
    payerEmail: result.payer?.email_address || order.email || null,
    paid_at: new Date().toISOString(),
  });
  return { httpStatus: 200, payload: { ok: true, order: paid } };
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
      const order = body.orderId
        ? store.get(String(body.orderId))
        : store.findByPaypalOrderId(String(body.paypalOrderId || ''));
      if (!order) return sendJson(res, 404, { error: 'order not found' });
      const { httpStatus, payload } = await captureFlow(order);
      return sendJson(res, httpStatus, payload);
    }

    // PayPal redirect-checkout return pages (URLs come from PUBLIC_BASE_URL).
    if (url.pathname === '/checkout/success' && req.method === 'GET') {
      const order = store.findByPaypalOrderId(url.searchParams.get('token') || '');
      if (!order) return sendHtml(res, 404, 'Order not found', '<h1>Order not found</h1><div class="card"><p>We could not match this PayPal return to an order. If you completed a payment, contact us with your PayPal receipt.</p></div>');
      const { payload } = await captureFlow(order);
      const o = payload.order || store.get(order.id);
      if (payload.ok && o) {
        return sendHtml(res, 200, 'Order confirmed — KHAAN GEO Audit', `<h1>Order confirmed</h1><div class="card">
          <div class="row"><span>Order</span><b>${esc(o.id)}</b></div>
          <div class="row"><span>PayPal order</span><b>${esc(o.paypalOrderId || '')}</b></div>
          <div class="row"><span>Item</span><span>GEO Visibility Audit — Founding</span></div>
          <div class="row"><span>Amount</span><b>$${esc(o.amount)} ${esc(o.currency)}${o.mode === 'demo' ? ' (simulated)' : ' (sandbox)'}</b></div>
          <p>Your full audit will be delivered to ${esc(o.payerEmail || o.email || 'your PayPal email')} within 2 business days.</p></div>`);
      }
      return sendHtml(res, 502, 'Payment not completed', `<h1>Payment did not complete</h1><div class="card"><p>${esc(payload.error || 'Capture failed.')} No charge was confirmed — you can safely try again from the <a href="/">checkout page</a>.</p></div>`);
    }

    if (url.pathname === '/checkout/cancel' && req.method === 'GET') {
      const order = store.findByPaypalOrderId(url.searchParams.get('token') || '');
      if (order && order.status === 'CREATED') store.update(order.id, { status: 'CANCELED' });
      return sendHtml(res, 200, 'Checkout canceled', '<h1>Checkout canceled</h1><div class="card"><p>No charge was made. You can return to the <a href="/">checkout page</a> whenever you are ready.</p></div>');
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

server.listen(PORT, process.env.HOST || undefined, () => {
  console.log(`KHAAN GEO Audit Checkout listening on port ${PORT} (PayPal mode: ${paypal.mode()})`);
});
