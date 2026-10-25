import fs from 'node:fs';
import path from 'node:path';
import { randomBytes } from 'node:crypto';
import { MongoClient } from 'mongodb';
import type { DatabaseState } from '../server/db.ts';
import { hashPassword, isPasswordHashed } from '../server/password.ts';

const uri = process.env.MONGODB_URI;
const initialAdminPassword = process.env.INITIAL_ADMIN_PASSWORD;

if (!uri || (!uri.startsWith('mongodb://') && !uri.startsWith('mongodb+srv://'))) {
  throw new Error('MONGODB_URI must be configured with a MongoDB connection string.');
}
if (!initialAdminPassword || initialAdminPassword.length < 12) {
  throw new Error('INITIAL_ADMIN_PASSWORD must be configured and at least 12 characters long.');
}

const databasePath = path.resolve(process.cwd(), 'data', 'db.json');
if (!fs.existsSync(databasePath)) {
  throw new Error(`Import source file was not found: ${databasePath}`);
}

const state = JSON.parse(fs.readFileSync(databasePath, 'utf8')) as DatabaseState;
if (!Array.isArray(state.users) || !state.users.some((user) => user.role === 'admin')) {
  throw new Error('The import source must contain at least one administrator account.');
}

const admin = state.users.find((user) => user.role === 'admin');
if (admin) admin.password = hashPassword(initialAdminPassword);
for (const user of state.users) {
  if (user.password && !isPasswordHashed(user.password)) {
    user.password = hashPassword(user.password === 'password123'
      ? randomBytes(32).toString('base64url')
      : user.password);
  }
}
state.settings = { ...state.settings, mongoDbUri: '', mongoDbConnected: true };

const collections: Array<[string, Array<{ id: string }>]> = [
  ['products', state.products],
  ['customers', state.customers],
  ['orders', state.orders],
  ['stock_adjustments', state.stockAdjustments],
  ['users', state.users],
  ['notifications', state.notifications],
  ['accounting_logs', state.accountingLogs],
  ['delivery_routes', state.deliveryRoutes],
];

const client = new MongoClient(uri, {
  serverSelectionTimeoutMS: 10000,
  connectTimeoutMS: 10000,
});

try {
  await client.connect();
  const database = client.db();
  for (const name of [...collections.map(([name]) => name), 'settings']) {
    const existingCount = await database.collection(name).countDocuments();
    if (existingCount > 0) {
      throw new Error(`Import stopped: collection '${name}' already contains data.`);
    }
  }

  for (const [name, records] of collections) {
    if (records.length > 0) {
      await database.collection(name).insertMany(records.map((record) => ({ ...record })));
    }
  }
  await database.collection('settings').replaceOne(
    { id: 'current' },
    { ...state.settings, id: 'current', initializedAt: new Date().toISOString() },
    { upsert: true }
  );
  console.log(`Imported ${state.products.length} products, ${state.customers.length} customers, ${state.orders.length} orders, and ${state.users.length} users.`);
} finally {
  await client.close();
}
