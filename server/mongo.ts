import { MongoClient } from 'mongodb';
import type { DatabaseState } from './db.ts';

export interface MongoTestResult {
  success: boolean;
  connected: boolean;
  message: string;
  latencyMs?: number;
  databaseName?: string;
  collections?: string[];
  stats?: {
    productsCount: number;
    customersCount: number;
    ordersCount: number;
  };
  error?: string;
}

export class MongoService {
  private activeClient: MongoClient | null = null;
  private activeUri: string | null = null;
  private isConnected: boolean = false;

  public getConnected(): boolean {
    return this.isConnected;
  }

  public getActiveUri(): string | null {
    return this.activeUri;
  }

  /**
   * Test connection to a MongoDB instance with timeout
   */
  public async testConnection(uri: string): Promise<MongoTestResult> {
    if (!uri || (!uri.startsWith('mongodb://') && !uri.startsWith('mongodb+srv://'))) {
      return {
        success: false,
        connected: false,
        message: 'Invalid MongoDB connection URI. Must begin with mongodb:// or mongodb+srv://',
        error: 'Invalid connection protocol',
      };
    }

    const startTime = Date.now();
    let tempClient: MongoClient | null = null;
    try {
      tempClient = new MongoClient(uri, {
        serverSelectionTimeoutMS: 5000,
        connectTimeoutMS: 5000,
      });

      await tempClient.connect();
      const pingResult = await tempClient.db().command({ ping: 1 });
      const latencyMs = Date.now() - startTime;

      const db = tempClient.db();
      const dbName = db.databaseName || 'na_distributors';

      let collectionNames: string[] = [];
      try {
        const collections = await db.listCollections().toArray();
        collectionNames = collections.map((c) => c.name);
      } catch {
        collectionNames = ['products', 'customers', 'orders', 'stock_adjustments'];
      }

      let productsCount = 0;
      let customersCount = 0;
      let ordersCount = 0;

      try {
        productsCount = await db.collection('products').countDocuments();
        customersCount = await db.collection('customers').countDocuments();
        ordersCount = await db.collection('orders').countDocuments();
      } catch {
        // collections might not exist yet
      }

      this.activeClient = tempClient;
      this.activeUri = uri;
      this.isConnected = true;

      return {
        success: true,
        connected: true,
        message: `Successfully connected to MongoDB (${dbName}) in ${latencyMs}ms. Cluster ping verified.`,
        latencyMs,
        databaseName: dbName,
        collections: collectionNames,
        stats: {
          productsCount,
          customersCount,
          ordersCount,
        },
      };
    } catch (err: any) {
      if (tempClient) {
        try {
          await tempClient.close();
        } catch {
          // ignore close error
        }
      }
      this.isConnected = false;
      return {
        success: false,
        connected: false,
        message: `Connection failed: ${err.message || 'Unable to connect to MongoDB cluster.'}`,
        error: err.message,
      };
    }
  }

  /**
   * Disconnect current active client
   */
  public async disconnect(): Promise<void> {
    if (this.activeClient) {
      try {
        await this.activeClient.close();
      } catch {
        // ignore
      }
      this.activeClient = null;
    }
    this.isConnected = false;
    this.activeUri = null;
  }

  /**
   * Push full local state into MongoDB collections
   */
  public async syncToMongo(uri: string, state: DatabaseState): Promise<{
    success: boolean;
    synced: {
      products: number;
      customers: number;
      orders: number;
      adjustments: number;
    };
    message: string;
  }> {
    let client = this.activeClient;
    let shouldClose = false;

    if (!client || this.activeUri !== uri) {
      client = new MongoClient(uri, {
        serverSelectionTimeoutMS: 5000,
        connectTimeoutMS: 5000,
      });
      await client.connect();
      shouldClose = true;
    }

    try {
      const db = client.db();

      // Sync Products
      if (state.products.length > 0) {
        const prodCol = db.collection('products');
        await prodCol.deleteMany({});
        await prodCol.insertMany(state.products.map((p) => ({ ...p })) as any);
      }

      // Sync Customers
      if (state.customers.length > 0) {
        const custCol = db.collection('customers');
        await custCol.deleteMany({});
        await custCol.insertMany(state.customers.map((c) => ({ ...c })) as any);
      }

      // Sync Orders
      if (state.orders.length > 0) {
        const orderCol = db.collection('orders');
        await orderCol.deleteMany({});
        await orderCol.insertMany(state.orders.map((o) => ({ ...o })) as any);
      }

      // Sync Stock Adjustments
      if (state.stockAdjustments.length > 0) {
        const adjCol = db.collection('stock_adjustments');
        await adjCol.deleteMany({});
        await adjCol.insertMany(state.stockAdjustments.map((a) => ({ ...a })) as any);
      }

      this.isConnected = true;
      this.activeUri = uri;

      return {
        success: true,
        synced: {
          products: state.products.length,
          customers: state.customers.length,
          orders: state.orders.length,
          adjustments: state.stockAdjustments.length,
        },
        message: `Successfully synchronized ${state.products.length} products, ${state.customers.length} customers, and ${state.orders.length} orders to MongoDB (${db.databaseName}).`,
      };
    } finally {
      if (shouldClose && client) {
        try {
          await client.close();
        } catch {
          // ignore
        }
      }
    }
  }

  /**
   * Pull collections from MongoDB and return state slice
   */
  public async fetchFromMongo(uri: string): Promise<{
    success: boolean;
    data?: Partial<DatabaseState>;
    message: string;
  }> {
    let client = this.activeClient;
    let shouldClose = false;

    if (!client || this.activeUri !== uri) {
      client = new MongoClient(uri, {
        serverSelectionTimeoutMS: 5000,
        connectTimeoutMS: 5000,
      });
      await client.connect();
      shouldClose = true;
    }

    try {
      const db = client.db();
      const rawProducts = await db.collection('products').find({}).toArray();
      const rawCustomers = await db.collection('customers').find({}).toArray();
      const rawOrders = await db.collection('orders').find({}).toArray();
      const rawAdjustments = await db.collection('stock_adjustments').find({}).toArray();

      const sanitize = (docs: any[]) =>
        docs.map(({ _id, ...rest }) => ({
          ...rest,
          id: rest.id || _id?.toString(),
        }));

      this.isConnected = true;
      this.activeUri = uri;

      return {
        success: true,
        data: {
          products: sanitize(rawProducts) as any,
          customers: sanitize(rawCustomers) as any,
          orders: sanitize(rawOrders) as any,
          stockAdjustments: sanitize(rawAdjustments) as any,
        },
        message: `Fetched ${rawProducts.length} products, ${rawCustomers.length} customers, and ${rawOrders.length} orders from MongoDB.`,
      };
    } finally {
      if (shouldClose && client) {
        try {
          await client.close();
        } catch {
          // ignore
        }
      }
    }
  }

  /**
   * Initialize MongoDB Database:
   * Creates collections, sets up high-performance indexes, and seeds official spice catalog & base data.
   */
  public async initializeDatabase(
    uri: string,
    state: DatabaseState,
    forceReseed: boolean = false
  ): Promise<{
    success: boolean;
    connected: boolean;
    databaseName: string;
    collectionsCreated: string[];
    indexesCreated: string[];
    seededCounts: {
      products: number;
      customers: number;
      orders: number;
      users: number;
    };
    message: string;
  }> {
    const client = new MongoClient(uri, {
      serverSelectionTimeoutMS: 6000,
      connectTimeoutMS: 6000,
    });

    await client.connect();
    this.activeClient = client;
    this.activeUri = uri;
    this.isConnected = true;

    try {
      const db = client.db();
      const dbName = db.databaseName || 'na_distributors';

      // 1. Ensure required collections
      const existingCols = await db.listCollections().toArray();
      const existingNames = new Set(existingCols.map((c) => c.name));
      const requiredCols = [
        'products',
        'customers',
        'orders',
        'stock_adjustments',
        'users',
        'notifications',
        'accounting_logs',
        'settings',
      ];

      const collectionsCreated: string[] = [];
      for (const colName of requiredCols) {
        if (!existingNames.has(colName)) {
          await db.createCollection(colName);
          collectionsCreated.push(colName);
        }
      }

      // 2. Create optimized enterprise indexes
      const indexesCreated: string[] = [];
      try {
        await db.collection('products').createIndex({ barcode: 1 }, { unique: true, sparse: true });
        await db.collection('products').createIndex({ sku: 1 }, { unique: true, sparse: true });
        await db.collection('products').createIndex({ category: 1 });
        indexesCreated.push('products: barcode_1 (unique), sku_1 (unique), category_1');

        await db.collection('customers').createIndex({ phone: 1 });
        await db.collection('customers').createIndex({ customerTier: 1 });
        indexesCreated.push('customers: phone_1, customerTier_1');

        await db.collection('orders').createIndex({ orderNumber: 1 }, { unique: true, sparse: true });
        await db.collection('orders').createIndex({ createdAt: -1 });
        indexesCreated.push('orders: orderNumber_1, createdAt_-1');

        await db.collection('users').createIndex({ email: 1 }, { unique: true, sparse: true });
        indexesCreated.push('users: email_1 (unique)');

        await db.collection('stock_adjustments').createIndex({ productId: 1, createdAt: -1 });
        indexesCreated.push('stock_adjustments: productId_1_createdAt_-1');
      } catch (idxErr: any) {
        console.warn('Index creation notice:', idxErr.message);
      }

      // 3. Seed data if collection is empty or forceReseed is requested
      const prodCol = db.collection('products');
      const custCol = db.collection('customers');
      const ordCol = db.collection('orders');
      const usrCol = db.collection('users');
      const settCol = db.collection('settings');

      const existingProdCount = await prodCol.countDocuments();
      let seededProducts = 0;
      let seededCustomers = 0;
      let seededOrders = 0;
      let seededUsers = 0;

      if (existingProdCount === 0 || forceReseed) {
        if (forceReseed) {
          await prodCol.deleteMany({});
          await custCol.deleteMany({});
          await ordCol.deleteMany({});
          await usrCol.deleteMany({});
          await settCol.deleteMany({});
        }

        // Seed 17 official spices
        if (state.products && state.products.length > 0) {
          await prodCol.insertMany(state.products.map((p) => ({ ...p })) as any);
          seededProducts = state.products.length;
        }

        // Seed customers
        if (state.customers && state.customers.length > 0) {
          await custCol.insertMany(state.customers.map((c) => ({ ...c })) as any);
          seededCustomers = state.customers.length;
        }

        // Seed orders
        if (state.orders && state.orders.length > 0) {
          await ordCol.insertMany(state.orders.map((o) => ({ ...o })) as any);
          seededOrders = state.orders.length;
        }

        // Seed users
        if (state.users && state.users.length > 0) {
          await usrCol.insertMany(state.users.map((u) => ({ ...u })) as any);
          seededUsers = state.users.length;
        }

        // Seed settings
        await settCol.insertOne({
          ...state.settings,
          mongoDbConnected: true,
          mongoDbUri: uri,
          initializedAt: new Date().toISOString(),
        } as any);
      } else {
        seededProducts = existingProdCount;
        seededCustomers = await custCol.countDocuments();
        seededOrders = await ordCol.countDocuments();
        seededUsers = await usrCol.countDocuments();
      }

      return {
        success: true,
        connected: true,
        databaseName: dbName,
        collectionsCreated,
        indexesCreated,
        seededCounts: {
          products: seededProducts,
          customers: seededCustomers,
          orders: seededOrders,
          users: seededUsers,
        },
        message: `MongoDB database '${dbName}' successfully initialized! ${seededProducts} spice products, ${seededCustomers} customer profiles, and collections ready.`,
      };
    } catch (err: any) {
      this.isConnected = false;
      throw new Error(`Failed to initialize MongoDB database: ${err.message}`);
    }
  }

  /**
   * Real-time upsert for a single document to keep MongoDB immediately in sync
   */
  public async upsertDocument(collectionName: string, id: string, doc: any): Promise<boolean> {
    if (!this.isConnected || !this.activeClient) {
      return false;
    }
    try {
      const db = this.activeClient.db();
      const { id: docId, ...rest } = doc;
      await db.collection(collectionName).updateOne(
        { id },
        { $set: { ...rest, id, updatedAt: new Date().toISOString() } },
        { upsert: true }
      );
      return true;
    } catch (err: any) {
      console.warn(`[MongoDB Realtime ${collectionName} Upsert Notice]`, err.message);
      return false;
    }
  }

  /**
   * Real-time delete for a document from MongoDB
   */
  public async deleteDocument(collectionName: string, id: string): Promise<boolean> {
    if (!this.isConnected || !this.activeClient) {
      return false;
    }
    try {
      const db = this.activeClient.db();
      await db.collection(collectionName).deleteOne({ id });
      return true;
    } catch (err: any) {
      console.warn(`[MongoDB Realtime ${collectionName} Delete Notice]`, err.message);
      return false;
    }
  }
}

export const mongoService = new MongoService();
