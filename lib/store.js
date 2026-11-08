'use strict';
/** Minimal JSON-file order store. Production swaps this for Cloudflare KV
 *  with the same record shape (see docs/INTEGRATION-TODO.md §4). */
const fs = require('node:fs');
const path = require('node:path');

const DATA_DIR = path.join(__dirname, '..', 'data');
const FILE = path.join(DATA_DIR, 'orders.json');

function load() {
  try {
    return JSON.parse(fs.readFileSync(FILE, 'utf8'));
  } catch {
    return {};
  }
}

function save(db) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(FILE, JSON.stringify(db, null, 2));
}

function newOrderId() {
  return `KGEO-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;
}

function put(order) {
  const db = load();
  db[order.id] = order;
  save(db);
  return order;
}

function get(id) {
  return load()[id] || null;
}

function update(id, patch) {
  const db = load();
  if (!db[id]) return null;
  db[id] = { ...db[id], ...patch };
  save(db);
  return db[id];
}

module.exports = { newOrderId, put, get, update };
