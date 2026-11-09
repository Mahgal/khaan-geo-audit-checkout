const test = require('node:test');
const assert = require('node:assert');
const { spawn } = require('node:child_process');

// We will spin up the server as a child process.
const PORT = 8081;
let serverProcess;

function startServer() {
  return new Promise((resolve, reject) => {
    serverProcess = spawn('node', ['server.js'], {
      env: { ...process.env, PORT: PORT },
    });

    serverProcess.stdout.on('data', (data) => {
      const msg = data.toString();
      if (msg.includes('listening on port')) {
        resolve();
      }
    });

    serverProcess.stderr.on('data', (data) => {
      console.error(`Server Error: ${data}`);
    });

    serverProcess.on('error', (err) => {
      reject(err);
    });
  });
}

function stopServer() {
  if (serverProcess) {
    serverProcess.kill();
  }
}

async function request(path, options = {}) {
  const url = `http://localhost:${PORT}${path}`;
  const res = await fetch(url, options);
  const data = await res.json().catch(() => ({}));
  return { status: res.status, data };
}

test('capture flow tests', async (t) => {
  t.before(startServer);
  t.after(stopServer);

  // 1. Successful capture
  await t.test('successful capture', async () => {
    const createRes = await request('/api/orders/create', {
      method: 'POST',
      body: JSON.stringify({ brand: 'Test Brand' })
    });
    assert.strictEqual(createRes.status, 200);
    const orderId = createRes.data.orderId;
    const paypalOrderId = createRes.data.paypalOrderId;

    const captureRes = await request('/api/orders/capture', {
      method: 'POST',
      body: JSON.stringify({ orderId, paypalOrderId })
    });
    assert.strictEqual(captureRes.status, 200);
    assert.strictEqual(captureRes.data.ok, true);
    assert.strictEqual(captureRes.data.order.status, 'PAID');

    // 2. Duplicate capture on a PAID order
    const duplicateRes = await request('/api/orders/capture', {
      method: 'POST',
      body: JSON.stringify({ orderId, paypalOrderId })
    });
    assert.strictEqual(duplicateRes.status, 200);
    assert.strictEqual(duplicateRes.data.ok, true);
    assert.strictEqual(duplicateRes.data.alreadyPaid, true);
  });

  // 3. Capture on a non-payable order (expects 422 mapped from demo mode)
  await t.test('non-payable capture (422)', async () => {
    // Write an order into the local store directly so we can hit capture
    const store = require('../lib/store');
    const orderId = store.newOrderId();
    store.put({
      id: orderId,
      status: 'CREATED',
      paypalOrderId: 'DEMO-NON-PAYABLE-123'
    });

    const captureRes = await request('/api/orders/capture', {
      method: 'POST',
      body: JSON.stringify({ orderId, paypalOrderId: 'DEMO-NON-PAYABLE-123' })
    });

    assert.strictEqual(captureRes.status, 422);
    assert.strictEqual(captureRes.data.error, 'PayPal API /v2/checkout/orders/DEMO-NON-PAYABLE-123/capture failed (422)');
    assert.strictEqual(captureRes.data.details.error, 'ORDER_NOT_APPROVED');
  });

  // 4. PayPal API failure (expects 500 mapped from demo mode)
  await t.test('api failure capture (500)', async () => {
    const store = require('../lib/store');
    const orderId = store.newOrderId();
    store.put({
      id: orderId,
      status: 'CREATED',
      paypalOrderId: 'DEMO-FAIL-API-123'
    });

    const captureRes = await request('/api/orders/capture', {
      method: 'POST',
      body: JSON.stringify({ orderId, paypalOrderId: 'DEMO-FAIL-API-123' })
    });

    // Unmapped unexpected errors (like 500) will be caught by the server's top-level error handler
    assert.strictEqual(captureRes.status, 500);
    assert.strictEqual(captureRes.data.error, 'PayPal API /v2/checkout/orders/DEMO-FAIL-API-123/capture failed (500)');
  });
});
