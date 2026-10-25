import express from 'express';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import dotenv from 'dotenv';

// Routes
import authRoutes from './server/routes/auth.ts';
import productRoutes from './server/routes/products.ts';
import customerRoutes from './server/routes/customers.ts';
import orderRoutes from './server/routes/orders.ts';
import deliveryRoutes from './server/routes/delivery.ts';
import reportRoutes from './server/routes/reports.ts';
import notificationRoutes from './server/routes/notifications.ts';
import accountingRoutes from './server/routes/accounting.ts';
import settingsRoutes from './server/routes/settings.ts';
import { db, setRealtimeListener } from './server/db.ts';
import { mongoService } from './server/mongo.ts';
import { apiAuth } from './server/api-auth.ts';

dotenv.config();

const distPath = path.resolve(process.cwd(), 'dist');
const hasDist = fs.existsSync(distPath) && fs.existsSync(path.join(distPath, 'index.html'));
const isProduction = process.env.NODE_ENV === 'production' || (!process.env.NODE_ENV && hasDist);
const envPort = process.env.PORT ? Number(process.env.PORT) : null;

// Track active real-time SSE stream clients
const sseClients = new Set<express.Response>();

function waitForPersistentWrites(
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
) {
  if (!isProduction) {
    next();
    return;
  }

  const sendJson = res.json.bind(res);
  res.json = ((body: unknown) => {
    mongoService.flushPendingWrites().then((successful) => {
      if (!successful) {
        res.status(503);
        sendJson({ success: false, message: 'The database write did not complete. Please retry.' });
        return;
      }
      sendJson(body);
    }).catch((err) => {
      console.error('[MongoDB] Failed waiting for database writes:', err);
      res.status(503);
      sendJson({ success: false, message: 'The database is unavailable. Please retry shortly.' });
    });
    return res;
  }) as express.Response['json'];
  next();
}

setRealtimeListener((entity, action, data) => {
  const payload = JSON.stringify({ entity, action, timestamp: Date.now(), data });
  for (const client of sseClients) {
    try {
      client.write(`data: ${payload}\n\n`);
    } catch {
      sseClients.delete(client);
    }
  }
});

function createServerListener(app: express.Application, port: number): Promise<http.Server | null> {
  return new Promise((resolve) => {
    const server = http.createServer(app);
    server.listen(port, '0.0.0.0', () => {
      console.log(`Enterprise Server listening on http://0.0.0.0:${port} [mode: ${isProduction ? 'production' : 'development'}]`);
      resolve(server);
    });
    server.on('error', (err: any) => {
      if (err.code === 'EADDRINUSE') {
        console.warn(`[Port ${port}] already bound, continuing startup.`);
        resolve(null);
      } else {
        console.error(`[Port ${port}] error:`, err);
        resolve(null);
      }
    });
  });
}

async function startServer() {
  const app = express();

  // Middleware
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Root health probe response for fast container checks
  app.get('/health', (req, res) => {
    res.status(200).json({ status: 'healthy', uptime: process.uptime(), liveClients: sseClients.size });
  });

  app.get('/api/config', (req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    res.json({
      googleMapsApiKey: process.env.GOOGLE_MAPS_API_KEY || process.env.VITE_GOOGLE_MAPS_API_KEY || '',
    });
  });

  app.use('/api', apiAuth);
  app.use('/api', waitForPersistentWrites);

  // Real-time Server-Sent Events (SSE) Stream
  app.get('/api/realtime/stream', (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders?.();

    // Initial connection acknowledge
    res.write(`data: ${JSON.stringify({ type: 'connected', timestamp: Date.now() })}\n\n`);
    sseClients.add(res);

    // Heartbeat every 15s to keep connection alive
    const heartbeat = setInterval(() => {
      try {
        res.write(`: heartbeat ${Date.now()}\n\n`);
      } catch {
        clearInterval(heartbeat);
        sseClients.delete(res);
      }
    }, 15000);

    req.on('close', () => {
      clearInterval(heartbeat);
      sseClients.delete(res);
    });
  });

  // API Routes
  app.use('/api/auth', authRoutes);
  app.use('/api/products', productRoutes);
  app.use('/api/customers', customerRoutes);
  app.use('/api/orders', orderRoutes);
  app.use('/api/delivery', deliveryRoutes);
  app.use('/api/reports', reportRoutes);
  app.use('/api/notifications', notificationRoutes);
  app.use('/api/accounting', accountingRoutes);
  app.use('/api/settings', settingsRoutes);

  // Full backup & state endpoint for instant sync
  app.get('/api/state', (req, res) => {
    const state = db.getState();
    const safeUsers = state.users.map(({ password, ...u }) => u);
    res.json({
      success: true,
      data: {
        ...state,
        users: safeUsers,
        settings: { ...state.settings, mongoDbUri: '' },
      },
    });
  });

  // Health check endpoint
  app.get('/api/health', (req, res) => {
    res.json({
      status: 'ok',
      service: 'NA Distributors API',
      timestamp: new Date().toISOString(),
      productsCount: db.getProducts().length,
      ordersCount: db.getOrders().length,
      customersCount: db.getCustomers().length,
      mongoDbConnected: db.getSettings().mongoDbConnected,
      realtimeActiveClients: sseClients.size,
    });
  });

  if (isProduction) {
    // Serve production static assets from dist
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  } else {
    // Lazy-load Vite in development mode
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  if (isProduction) {
    const mongoUri = process.env.MONGODB_URI;
    const initialAdminPassword = process.env.INITIAL_ADMIN_PASSWORD;
    if (!mongoUri || !mongoUri.startsWith('mongodb')) {
      throw new Error('MONGODB_URI must be configured for production.');
    }
    if (!initialAdminPassword) {
      throw new Error('INITIAL_ADMIN_PASSWORD must be configured for production.');
    }
    if (!process.env.SESSION_SECRET || process.env.SESSION_SECRET.length < 32) {
      throw new Error('SESSION_SECRET must be configured with at least 32 characters in production.');
    }

    db.prepareForProduction(initialAdminPassword);
    await mongoService.initializeDatabase(mongoUri, db.getState(), false);
    const persistentState = await mongoService.fetchFromMongo(mongoUri);
    if (!persistentState.success || !persistentState.data) {
      throw new Error(`Unable to load the production database: ${persistentState.message}`);
    }
    db.loadFromPersistentState(persistentState.data);
    db.prepareForProduction(initialAdminPassword);
    db.updateSettings({ mongoDbConnected: true, mongoDbUri: '' });
    if (!(await mongoService.flushPendingWrites())) {
      throw new Error('Failed to persist production user or settings migrations to MongoDB.');
    }
  }

  // Ensure port 3000 is always listening for AI Studio TCP probes
  await createServerListener(app, 3000);

  // If a separate PORT is specified (e.g. by Cloud Run 8080), also listen on that port
  if (envPort && envPort !== 3000) {
    await createServerListener(app, envPort);
  }

}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
