import { Router, type Response } from 'express';
import { db } from '../db.ts';

const router = Router();

function safeSettings() {
  return { ...db.getSettings(), mongoDbUri: '' };
}

function blockProductionDatabaseManagement(res: Response): boolean {
  if (process.env.NODE_ENV !== 'production') return false;
  res.status(409).json({
    success: false,
    message: 'Production database configuration is managed through GCP Secret Manager.',
  });
  return true;
}

// Get settings
router.get('/', (req, res) => {
  res.json({ success: true, settings: safeSettings() });
});

// Update settings
router.put('/', (req, res) => {
  const { mongoDbUri, ...updates } = req.body;
  const updated = db.updateSettings({ ...updates, mongoDbUri: '' });
  res.json({ success: true, settings: { ...updated, mongoDbUri: '' } });
});

import { mongoService } from '../mongo.ts';

// Get MongoDB status
router.get('/mongodb/status', (req, res) => {
  const settings = db.getSettings();
  res.json({
    success: true,
    connected: mongoService.getConnected() || settings.mongoDbConnected,
    configured: Boolean(process.env.MONGODB_URI),
  });
});

// Test MongoDB connection
router.post('/mongodb/test', async (req, res) => {
  if (blockProductionDatabaseManagement(res)) return;
  const { uri } = req.body;
  const targetUri = uri || process.env.MONGODB_URI || db.getSettings().mongoDbUri;

  if (!targetUri || (!targetUri.startsWith('mongodb://') && !targetUri.startsWith('mongodb+srv://'))) {
    return res.status(400).json({
      success: false,
      connected: false,
      message: 'Invalid MongoDB connection URI. Must begin with mongodb:// or mongodb+srv://',
    });
  }

  try {
    const result = await mongoService.testConnection(targetUri);
    if (result.success) {
      db.updateSettings({ mongoDbConnected: true, mongoDbUri: '' });
    }
    res.json(result);
  } catch (err: any) {
    res.status(500).json({
      success: false,
      connected: false,
      message: err.message || 'Failed to connect to MongoDB',
    });
  }
});

// Sync local data to MongoDB
router.post('/mongodb/sync', async (req, res) => {
  if (blockProductionDatabaseManagement(res)) return;
  const { uri } = req.body;
  const targetUri = uri || db.getSettings().mongoDbUri || process.env.MONGODB_URI;

  if (!targetUri) {
    return res.status(400).json({ success: false, message: 'No MongoDB URI configured.' });
  }

  try {
    const result = await mongoService.syncToMongo(targetUri, db.getState());
    db.updateSettings({ mongoDbConnected: true, mongoDbUri: '' });
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message || 'Sync to MongoDB failed' });
  }
});

// Import data from MongoDB
router.post('/mongodb/import', async (req, res) => {
  if (blockProductionDatabaseManagement(res)) return;
  const { uri } = req.body;
  const targetUri = uri || db.getSettings().mongoDbUri || process.env.MONGODB_URI;

  if (!targetUri) {
    return res.status(400).json({ success: false, message: 'No MongoDB URI configured.' });
  }

  try {
    const result = await mongoService.fetchFromMongo(targetUri);
    if (result.success && result.data) {
      db.loadFromPersistentState(result.data);
    }
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message || 'Import from MongoDB failed' });
  }
});

// Initialize MongoDB database and seed collections
router.post('/mongodb/init', async (req, res) => {
  if (blockProductionDatabaseManagement(res)) return;
  const { uri, forceReseed } = req.body;
  const targetUri = uri || db.getSettings().mongoDbUri || process.env.MONGODB_URI;

  if (!targetUri || (!targetUri.startsWith('mongodb://') && !targetUri.startsWith('mongodb+srv://'))) {
    return res.status(400).json({
      success: false,
      message: 'Invalid MongoDB connection URI. Must begin with mongodb:// or mongodb+srv://',
    });
  }

  try {
    const result = await mongoService.initializeDatabase(targetUri, db.getState(), Boolean(forceReseed));
    db.updateSettings({ mongoDbConnected: true, mongoDbUri: '' });
    res.json(result);
  } catch (err: any) {
    res.status(500).json({
      success: false,
      message: err.message || 'MongoDB database initialization failed',
    });
  }
});

// Disconnect MongoDB
router.post('/mongodb/disconnect', async (req, res) => {
  if (process.env.NODE_ENV === 'production') {
    return res.status(409).json({
      success: false,
      message: 'MongoDB is the configured production database and cannot be disconnected from the app.',
    });
  }
  await mongoService.disconnect();
  db.updateSettings({ mongoDbConnected: false });
  res.json({
    success: true,
    connected: false,
    message: 'MongoDB disconnected. Active mode switched to standalone high-speed local disk storage.',
  });
});

// Reset settings to defaults
router.post('/reset-defaults', (req, res) => {
  const { adminPassword } = req.body;
  const admin = db.getState().users.find((u) => u.role === 'admin');
  if (!admin || !db.verifyUserPassword(admin.id, adminPassword)) {
    return res.status(403).json({ success: false, message: 'Invalid admin confirmation password' });
  }

  const defaults = {
    companyName: 'NA Distributors',
    companyAddress: 'No. 45, Temple Road, Colombo 03, Sri Lanka',
    companyPhone: '+94 11 234 5678',
    companyEmail: 'info@nadistributors.lk',
    currency: 'Rs.',
    volumeDiscounts: [
      { minTotal: 100000, discountPercent: 10 },
      { minTotal: 50000, discountPercent: 7 },
      { minTotal: 40000, discountPercent: 5 },
      { minTotal: 20000, discountPercent: 4 },
      { minTotal: 10000, discountPercent: 3 },
      { minTotal: 5000, discountPercent: 2 },
    ],
    mongoDbConnected: false,
    enableSoundEffects: true,
  };

  db.updateSettings(defaults);
  res.json({ success: true, settings: db.getSettings(), message: 'Settings reset to factory defaults' });
});

export default router;
