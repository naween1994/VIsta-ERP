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

dotenv.config();

const distPath = path.resolve(process.cwd(), 'dist');
const hasDist = fs.existsSync(distPath) && fs.existsSync(path.join(distPath, 'index.html'));
const isProduction = process.env.NODE_ENV === 'production' || hasDist;
const envPort = process.env.PORT ? Number(process.env.PORT) : null;

// Track active real-time SSE stream clients
const sseClients = new Set<express.Response>();

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

  // Ensure port 3000 is always listening for AI Studio TCP probes
  await createServerListener(app, 3000);

  // If a separate PORT is specified (e.g. by Cloud Run 8080), also listen on that port
  if (envPort && envPort !== 3000) {
    await createServerListener(app, envPort);
  }

  // If MONGODB_URI is provided, initialize database in background
  const mongoUriEnv = process.env.MONGODB_URI;
  if (mongoUriEnv && (mongoUriEnv.startsWith('mongodb://') || mongoUriEnv.startsWith('mongodb+srv://'))) {
    console.log('[MongoDB] Auto-connecting to configured MONGODB_URI...');
    mongoService.testConnection(mongoUriEnv).then(async (res) => {
      if (res.success) {
        console.log('[MongoDB] Connected! Initializing database collections & indexes...');
        mongoService.initializeDatabase(mongoUriEnv, db.getState(), false)
          .then((initRes) => {
            console.log('[MongoDB]', initRes.message);
            db.updateSettings({ mongoDbConnected: true, mongoDbUri: mongoUriEnv });
          })
          .catch((err) => console.warn('[MongoDB Init Notice]', err.message));
      }
    }).catch((err) => console.warn('[MongoDB Connect Notice]', err.message));
  }
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
