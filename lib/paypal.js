'use strict';
/**
 * PayPal Orders v2 client (server-side only).
 *
 * Credentials come from env: PAYPAL_CLIENT_ID / PAYPAL_CLIENT_SECRET.
 * When they are absent the module runs in DEMO MODE: it returns simulated
 * order objects with clearly fake ids (prefix "DEMO-") so the whole product
 * flow can be run and judged without any PayPal account. Demo mode is always
 * surfaced to the frontend via /api/config — it is never silent.
 *
 * Integration points are listed in docs/INTEGRATION-TODO.md.
 */

const API_BASE = process.env.PAYPAL_API_BASE || 'https://api-m.sandbox.paypal.com';
const CLIENT_ID = process.env.PAYPAL_CLIENT_ID || '';
const CLIENT_SECRET = process.env.PAYPAL_CLIENT_SECRET || '';

// Public base URL of this deployment (e.g. https://geo-demo.khaan.si).
// When set, PayPal's redirect checkout returns the buyer to
// <base>/checkout/success (or /checkout/cancel). When unset, no return
// URLs are sent at all — the historical local behavior is unchanged.
const PUBLIC_BASE_URL = (process.env.PUBLIC_BASE_URL || '').replace(/\/+$/, '');

// The one and only SKU. Price lives here, server-side, never from the client.
const PRODUCT = {
  name: 'GEO Visibility Audit — Founding (KHAAN.SI)',
  amount: '299.00',
  currency: 'USD',
};

function isConfigured() {
  return Boolean(CLIENT_ID && CLIENT_SECRET);
}

function mode() {
  if (!isConfigured()) return 'demo';
  return (process.env.PAYPAL_ENV || 'sandbox').toLowerCase() === 'live' ? 'live' : 'sandbox';
}

let tokenCache = { value: '', expiresAt: 0 };

async function getAccessToken() {
  if (!isConfigured()) throw new Error('PayPal is not configured (demo mode)');
  if (tokenCache.value && Date.now() < tokenCache.expiresAt - 30_000) return tokenCache.value;
  const basic = Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString('base64');
  const res = await fetch(`${API_BASE}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${basic}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`PayPal OAuth failed (${res.status}): ${text.slice(0, 300)}`);
  }
  const data = await res.json();
  tokenCache = { value: data.access_token, expiresAt: Date.now() + data.expires_in * 1000 };
  return tokenCache.value;
}

async function paypalFetch(path, options = {}) {
  const token = await getAccessToken();
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });
  const text = await res.text();
  let data;
  try { data = JSON.parse(text); } catch { data = { raw: text }; }
  if (!res.ok) {
    const err = new Error(`PayPal API ${path} failed (${res.status})`);
    err.details = data;
    throw err;
  }
  return data;
}

/** Create an order for the fixed SKU. `referenceId` is our own order id. */
async function createOrder(referenceId) {
  if (!isConfigured()) {
    return {
      id: `DEMO-${referenceId}`,
      status: 'CREATED',
      demo: true,
      purchase_units: [{ amount: { value: PRODUCT.amount, currency_code: PRODUCT.currency } }],
    };
  }
  return paypalFetch('/v2/checkout/orders', {
    method: 'POST',
    headers: { 'PayPal-Request-Id': `create-${referenceId}` },
    body: JSON.stringify({
      intent: 'CAPTURE',
      purchase_units: [
        {
          reference_id: referenceId,
          custom_id: referenceId,
          description: PRODUCT.name,
          amount: { currency_code: PRODUCT.currency, value: PRODUCT.amount },
        },
      ],
      application_context: {
        brand_name: 'KHAAN.SI',
        user_action: 'PAY_NOW',
        shipping_preference: 'NO_SHIPPING',
        ...(PUBLIC_BASE_URL
          ? {
              return_url: `${PUBLIC_BASE_URL}/checkout/success`,
              cancel_url: `${PUBLIC_BASE_URL}/checkout/cancel`,
            }
          : {}),
      },
    }),
  });
}

/** Capture a previously approved order. */
async function captureOrder(paypalOrderId) {
  if (!isConfigured()) {
    return {
      id: paypalOrderId,
      status: 'COMPLETED',
      demo: true,
      payer: { email_address: 'demo-buyer@example.com' },
      purchase_units: [
        {
          payments: {
            captures: [
              { id: `DEMO-CAPTURE-${Date.now()}`, status: 'COMPLETED', amount: { value: PRODUCT.amount, currency_code: PRODUCT.currency } },
            ],
          },
        },
      ],
    };
  }
  return paypalFetch(`/v2/checkout/orders/${encodeURIComponent(paypalOrderId)}/capture`, {
    method: 'POST',
    headers: { 'PayPal-Request-Id': `capture-${paypalOrderId}` },
    body: JSON.stringify({}),
  });
}

/** Fallback verification when a capture response is ambiguous. */
async function getOrder(paypalOrderId) {
  if (!isConfigured()) return { id: paypalOrderId, status: 'COMPLETED', demo: true };
  return paypalFetch(`/v2/checkout/orders/${encodeURIComponent(paypalOrderId)}`, { method: 'GET' });
}

module.exports = { PRODUCT, API_BASE, isConfigured, mode, createOrder, captureOrder, getOrder };
