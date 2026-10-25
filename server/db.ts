import fs from 'node:fs';
import path from 'node:path';
import { randomBytes } from 'node:crypto';
import type { 
  User, 
  Product, 
  Customer, 
  Order, 
  StockAdjustment, 
  AppNotification, 
  AccountingSyncLog, 
  AppSettings,
  DeliveryRoute
} from '../src/types/index.ts';
import { mongoService } from './mongo.ts';
import { hashPassword, isPasswordHashed, verifyPassword } from './password.ts';

const DATA_DIR = path.resolve(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'db.json');

export type RealtimeCallback = (entity: string, action: string, data?: any) => void;
let realtimeListener: RealtimeCallback | null = null;

export function setRealtimeListener(cb: RealtimeCallback) {
  realtimeListener = cb;
}

function notifyRealtimeChange(entity: string, action: string, data?: any) {
  if (realtimeListener) {
    try {
      realtimeListener(entity, action, data);
    } catch {
      // ignore
    }
  }
}

export interface DatabaseState {
  users: User[];
  products: Product[];
  customers: Customer[];
  orders: Order[];
  stockAdjustments: StockAdjustment[];
  notifications: AppNotification[];
  accountingLogs: AccountingSyncLog[];
  settings: AppSettings;
  deliveryRoutes: DeliveryRoute[];
}

const INITIAL_USERS: User[] = [
  {
    id: 'user-1',
    name: 'Naween Samaranayaka',
    email: 'naween@nadistributors.lk',
    role: 'admin',
    permissions: ['all', 'admin', 'inventory_read', 'inventory_write', 'stock_adjust', 'sales_read', 'sales_write', 'customer_read', 'customer_write', 'accounting', 'reports'],
    password: 'password123',
    avatar: 'NS',
  },
  {
    id: 'user-2',
    name: 'Anura Gunasekara',
    email: 'anura@nadistributors.lk',
    role: 'inventory_manager',
    permissions: ['inventory_read', 'inventory_write', 'stock_adjust', 'barcode_print', 'reports'],
    password: 'password123',
    avatar: 'AG',
  },
  {
    id: 'user-3',
    name: 'Mangala Senarathna',
    email: 'mangala@nadistributors.lk',
    role: 'sales_rep',
    permissions: ['sales_read', 'sales_write', 'customer_read', 'customer_write', 'scanner', 'inventory_read'],
    password: 'password123',
    avatar: 'MS',
  },
];

const INITIAL_SETTINGS: AppSettings = {
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
  mongoDbUri: process.env.MONGODB_URI || 'mongodb+srv://admin:pass@cluster0.mongodb.net/na_distributors',
  enableSoundEffects: true,
};

export const OFFICIAL_SPICES_CATALOG: Product[] = [
  {
    id: 'prod-sp-chilli-100g',
    name: 'Chilli Powder 100g',
    sku: 'CHP-100G',
    barcode: '4792001001018',
    category: 'Ground Spices',
    origin: 'Sri Lanka (Matale / Central Highlands)',
    grade: 'Grade A Hot',
    packageSize: '100g',
    stockOnHand: 280,
    initialStock: 300,
    reorderThreshold: 50,
    batchNumber: 'BATCH-CP100-2026',
    lotValuation: 61600,
    costPrice: 220,
    mrp: 330,
    wholesalePrice: 280,
    distributorPrice: 260,
    distributorMarkupPercent: 18.18,
    description: 'Premium ground red chilli powder with rich pungency and vibrant natural color.',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'prod-sp-chilli-50g',
    name: 'Chilli Powder 50g',
    sku: 'CHP-50G',
    barcode: '4792001001025',
    category: 'Ground Spices',
    origin: 'Sri Lanka (Matale / Central Highlands)',
    grade: 'Grade A Hot',
    packageSize: '50g',
    stockOnHand: 350,
    initialStock: 400,
    reorderThreshold: 60,
    batchNumber: 'BATCH-CP50-2026',
    lotValuation: 42000,
    costPrice: 120,
    mrp: 180,
    wholesalePrice: 155,
    distributorPrice: 145,
    distributorMarkupPercent: 20.83,
    description: 'Finely milled hot chilli powder, ideal for retail spice racks and food service.',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'prod-sp-curry-100g',
    name: 'Curry Powder 100g',
    sku: 'CUR-100G',
    barcode: '4792001002015',
    category: 'Curry Powders',
    origin: 'Sri Lanka (Ceylon Aromatic Blend)',
    grade: 'Traditional Raw Blend',
    packageSize: '100g',
    stockOnHand: 240,
    initialStock: 250,
    reorderThreshold: 45,
    batchNumber: 'BATCH-CU100-2026',
    lotValuation: 57600,
    costPrice: 240,
    mrp: 360,
    wholesalePrice: 310,
    distributorPrice: 285,
    distributorMarkupPercent: 18.75,
    description: 'Authentic Ceylon unroasted raw curry powder blended with coriander, cumin, fennel, and aromatic spices.',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'prod-sp-curry-50g',
    name: 'Curry Powder 50g',
    sku: 'CUR-50G',
    barcode: '4792001002022',
    category: 'Curry Powders',
    origin: 'Sri Lanka (Ceylon Aromatic Blend)',
    grade: 'Traditional Raw Blend',
    packageSize: '50g',
    stockOnHand: 320,
    initialStock: 350,
    reorderThreshold: 50,
    batchNumber: 'BATCH-CU50-2026',
    lotValuation: 41600,
    costPrice: 130,
    mrp: 200,
    wholesalePrice: 170,
    distributorPrice: 155,
    distributorMarkupPercent: 19.23,
    description: 'Authentic Ceylon raw curry powder 50g pouch, balanced recipe for meat, fish, and vegetarian curries.',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'prod-sp-turmeric-100g',
    name: 'Turmeric Powder 100g',
    sku: 'TUR-100G',
    barcode: '4792001003012',
    category: 'Ground Spices',
    origin: 'Sri Lanka (Kandy Highlands)',
    grade: 'High Curcumin Grade 1',
    packageSize: '100g',
    stockOnHand: 190,
    initialStock: 200,
    reorderThreshold: 40,
    batchNumber: 'BATCH-TU100-2026',
    lotValuation: 53200,
    costPrice: 280,
    mrp: 420,
    wholesalePrice: 360,
    distributorPrice: 330,
    distributorMarkupPercent: 17.86,
    description: '100% pure Ceylon ground turmeric rhizomes with high natural curcumin content and deep golden hue.',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'prod-sp-turmeric-50g',
    name: 'Turmeric Powder 50g',
    sku: 'TUR-50G',
    barcode: '4792001003029',
    category: 'Ground Spices',
    origin: 'Sri Lanka (Kandy Highlands)',
    grade: 'High Curcumin Grade 1',
    packageSize: '50g',
    stockOnHand: 260,
    initialStock: 300,
    reorderThreshold: 50,
    batchNumber: 'BATCH-TU50-2026',
    lotValuation: 39000,
    costPrice: 150,
    mrp: 230,
    wholesalePrice: 195,
    distributorPrice: 180,
    distributorMarkupPercent: 20.0,
    description: 'Pure ground turmeric 50g pack, no artificial colorings or additives.',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'prod-sp-turmeric-25g',
    name: 'Turmeric Powder 25g',
    sku: 'TUR-25G',
    barcode: '4792001003036',
    category: 'Ground Spices',
    origin: 'Sri Lanka (Kandy Highlands)',
    grade: 'High Curcumin Grade 1',
    packageSize: '25g',
    stockOnHand: 420,
    initialStock: 500,
    reorderThreshold: 80,
    batchNumber: 'BATCH-TU25-2026',
    lotValuation: 35700,
    costPrice: 85,
    mrp: 135,
    wholesalePrice: 115,
    distributorPrice: 105,
    distributorMarkupPercent: 23.53,
    description: 'Convenience 25g sachet pack of pure Ceylon turmeric powder.',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'prod-sp-pepper-100g',
    name: 'Pepper Powder 100g',
    sku: 'PEP-100G',
    barcode: '4792001004019',
    category: 'Ground Spices',
    origin: 'Sri Lanka (Matale Black Gold)',
    grade: '550 GL Bold Grade A',
    packageSize: '100g',
    stockOnHand: 160,
    initialStock: 180,
    reorderThreshold: 30,
    batchNumber: 'BATCH-PE100-2026',
    lotValuation: 56000,
    costPrice: 350,
    mrp: 540,
    wholesalePrice: 460,
    distributorPrice: 420,
    distributorMarkupPercent: 20.0,
    description: 'Pure Ceylon black pepper powder crushed from mature peppercorns for intense bite and aroma.',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'prod-sp-pepper-50g',
    name: 'Pepper Powder 50g',
    sku: 'PEP-50G',
    barcode: '4792001004026',
    category: 'Ground Spices',
    origin: 'Sri Lanka (Matale Black Gold)',
    grade: '550 GL Bold Grade A',
    packageSize: '50g',
    stockOnHand: 230,
    initialStock: 250,
    reorderThreshold: 45,
    batchNumber: 'BATCH-PE50-2026',
    lotValuation: 43700,
    costPrice: 190,
    mrp: 295,
    wholesalePrice: 250,
    distributorPrice: 230,
    distributorMarkupPercent: 21.05,
    description: 'Aromatic crushed black pepper 50g pack, pungent Sri Lankan harvest.',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'prod-sp-pepper-25g',
    name: 'Pepper Powder 25g',
    sku: 'PEP-25G',
    barcode: '4792001004033',
    category: 'Ground Spices',
    origin: 'Sri Lanka (Matale Black Gold)',
    grade: '550 GL Bold Grade A',
    packageSize: '25g',
    stockOnHand: 360,
    initialStock: 400,
    reorderThreshold: 70,
    batchNumber: 'BATCH-PE25-2026',
    lotValuation: 37800,
    costPrice: 105,
    mrp: 170,
    wholesalePrice: 145,
    distributorPrice: 130,
    distributorMarkupPercent: 23.81,
    description: 'Pocket/table size 25g pure black pepper powder.',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'prod-sp-rchilli-100g',
    name: 'Roasted Chilli Powder 100g',
    sku: 'RCH-100G',
    barcode: '4792001005016',
    category: 'Ground Spices',
    origin: 'Sri Lanka (Wood-fired Roasted)',
    grade: 'Dark Roast Badapu Miris',
    packageSize: '100g',
    stockOnHand: 210,
    initialStock: 220,
    reorderThreshold: 40,
    batchNumber: 'BATCH-RC100-2026',
    lotValuation: 50400,
    costPrice: 240,
    mrp: 360,
    wholesalePrice: 310,
    distributorPrice: 285,
    distributorMarkupPercent: 18.75,
    description: 'Traditional Badapu Miris Kudu, roasted over controlled flame for deep smoky heat and dark color.',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'prod-sp-rchilli-50g',
    name: 'Roasted Chilli Powder 50g',
    sku: 'RCH-50G',
    barcode: '4792001005023',
    category: 'Ground Spices',
    origin: 'Sri Lanka (Wood-fired Roasted)',
    grade: 'Dark Roast Badapu Miris',
    packageSize: '50g',
    stockOnHand: 290,
    initialStock: 300,
    reorderThreshold: 50,
    batchNumber: 'BATCH-RC50-2026',
    lotValuation: 37700,
    costPrice: 130,
    mrp: 200,
    wholesalePrice: 170,
    distributorPrice: 155,
    distributorMarkupPercent: 19.23,
    description: 'Slow-roasted Ceylon chilli powder 50g, gives signature dark color and rich aroma to curries.',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'prod-sp-rcurry-100g',
    name: 'Roasted Curry Powder 100g',
    sku: 'RCU-100G',
    barcode: '4792001006013',
    category: 'Curry Powders',
    origin: 'Sri Lanka (Traditional Jaffna & Southern)',
    grade: 'Supreme Roast Badapu Thuna Paha',
    packageSize: '100g',
    stockOnHand: 195,
    initialStock: 200,
    reorderThreshold: 35,
    batchNumber: 'BATCH-RU100-2026',
    lotValuation: 50700,
    costPrice: 260,
    mrp: 395,
    wholesalePrice: 340,
    distributorPrice: 310,
    distributorMarkupPercent: 19.23,
    description: 'Signature Sri Lankan Badapu Thuna Paha, hand-roasted coriander, cumin, sweet cumin, and spices.',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'prod-sp-rcurry-50g',
    name: 'Roasted Curry Powder 50g',
    sku: 'RCU-50G',
    barcode: '4792001006020',
    category: 'Curry Powders',
    origin: 'Sri Lanka (Traditional Jaffna & Southern)',
    grade: 'Supreme Roast Badapu Thuna Paha',
    packageSize: '50g',
    stockOnHand: 270,
    initialStock: 300,
    reorderThreshold: 50,
    batchNumber: 'BATCH-RU50-2026',
    lotValuation: 37800,
    costPrice: 140,
    mrp: 220,
    wholesalePrice: 185,
    distributorPrice: 170,
    distributorMarkupPercent: 21.43,
    description: 'Hand-roasted curry powder 50g packet, essential for authentic Sri Lankan meat and dark curries.',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'prod-sp-flakes-100g',
    name: 'Chilli Flakes 100g',
    sku: 'FLK-100G',
    barcode: '4792001007010',
    category: 'Ground Spices',
    origin: 'Sri Lanka (Sun-dried Anuradhapura)',
    grade: 'Coarse Cut Kabili Miris',
    packageSize: '100g',
    stockOnHand: 220,
    initialStock: 250,
    reorderThreshold: 45,
    batchNumber: 'BATCH-CF100-2026',
    lotValuation: 50600,
    costPrice: 230,
    mrp: 350,
    wholesalePrice: 300,
    distributorPrice: 275,
    distributorMarkupPercent: 19.57,
    description: 'Sun-dried coarse crushed chilli flakes (Kabili Miris), perfect for pol sambol, hoppers, and stir-fries.',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'prod-sp-flakes-50g',
    name: 'Chilli Flakes 50g',
    sku: 'FLK-50G',
    barcode: '4792001007027',
    category: 'Ground Spices',
    origin: 'Sri Lanka (Sun-dried Anuradhapura)',
    grade: 'Coarse Cut Kabili Miris',
    packageSize: '50g',
    stockOnHand: 310,
    initialStock: 350,
    reorderThreshold: 55,
    batchNumber: 'BATCH-CF50-2026',
    lotValuation: 38750,
    costPrice: 125,
    mrp: 195,
    wholesalePrice: 165,
    distributorPrice: 150,
    distributorMarkupPercent: 20.0,
    description: 'Crushed chilli flakes 50g pack with seeds and pods for sharp crunchy heat.',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'prod-sp-coriander-50g',
    name: 'Coriander 50g',
    sku: 'COR-50G',
    barcode: '4792001008017',
    category: 'Ground Spices',
    origin: 'Sri Lanka (Ceylon Selected)',
    grade: 'Aromatic Fine Milled Kottamalli',
    packageSize: '50g',
    stockOnHand: 250,
    initialStock: 280,
    reorderThreshold: 40,
    batchNumber: 'BATCH-CO50-2026',
    lotValuation: 27500,
    costPrice: 110,
    mrp: 175,
    wholesalePrice: 150,
    distributorPrice: 135,
    distributorMarkupPercent: 22.73,
    description: 'Pure ground coriander powder (Kottamalli), freshly milled with citrusy and herbal aroma.',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

export const INITIAL_CUSTOMERS: Customer[] = [
  {
    id: 'cust-colombo-wholesale',
    name: 'Bandara Senanayake',
    businessName: 'Lanka Super Wholesale - Pettah',
    email: 'pettah@lankasuper.lk',
    phone: '+94 11 234 5678',
    address: 'No. 82, 5th Cross Street, Pettah',
    city: 'Colombo 11',
    pricingTier: 'Distributor',
    paymentTerms: 'Net 30',
    creditLimit: 300000,
    currentBalance: 75000,
    referenceNumber: 'REF-LK-1001',
    coordinates: {
      latitude: 6.9388,
      longitude: 79.8542,
    },
    totalOrders: 14,
    totalSpent: 420000,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'cust-kollupitiya-royal',
    name: 'Mohamed Rizwan',
    businessName: 'Royal Spice Mart - Kollupitiya',
    email: 'rizwan@royalspices.lk',
    phone: '+94 11 257 8899',
    address: 'No. 412, Galle Road, Kollupitiya',
    city: 'Colombo 03',
    pricingTier: 'Wholesale',
    paymentTerms: 'Net 15',
    creditLimit: 200000,
    currentBalance: 32000,
    referenceNumber: 'REF-LK-1002',
    coordinates: {
      latitude: 6.9034,
      longitude: 79.8519,
    },
    totalOrders: 9,
    totalSpent: 185000,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'cust-nugegoda-grocery',
    name: 'Sunil Jayawardena',
    businessName: 'Jayawardena Stores - Nugegoda',
    email: 'sunil@jayawardenastores.lk',
    phone: '+94 11 281 9922',
    address: 'No. 125, Stanley Thilakarathne Mawatha',
    city: 'Nugegoda',
    pricingTier: 'Retail',
    paymentTerms: 'Immediate / COD',
    creditLimit: 50000,
    currentBalance: 0,
    referenceNumber: 'REF-LK-1003',
    coordinates: {
      latitude: 6.8722,
      longitude: 79.8997,
    },
    totalOrders: 6,
    totalSpent: 62000,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'cust-negombo-hub',
    name: 'Anthony Fernando',
    businessName: 'Negombo Coastal Spice Depot',
    email: 'anthony@negombospices.lk',
    phone: '+94 31 223 4455',
    address: 'No. 54, Main Street, Negombo',
    city: 'Negombo',
    pricingTier: 'Distributor',
    paymentTerms: 'Net 30',
    creditLimit: 250000,
    currentBalance: 58000,
    referenceNumber: 'REF-LK-1004',
    coordinates: {
      latitude: 7.2083,
      longitude: 79.8358,
    },
    totalOrders: 11,
    totalSpent: 310000,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'cust-gampaha-wholesale',
    name: 'Prasanna Wickramasinghe',
    businessName: 'Gampaha Central Trade Hub',
    email: 'prasanna@gampahatrade.lk',
    phone: '+94 33 222 7788',
    address: 'No. 18, Yakkala Road, Gampaha',
    city: 'Gampaha',
    pricingTier: 'Wholesale',
    paymentTerms: 'Net 15',
    creditLimit: 150000,
    currentBalance: 24500,
    referenceNumber: 'REF-LK-1005',
    coordinates: {
      latitude: 7.0917,
      longitude: 79.9998,
    },
    totalOrders: 8,
    totalSpent: 145000,
    createdAt: new Date().toISOString(),
  },
];

class Database {
  private state: DatabaseState;

  constructor() {
    this.state = {
      users: [...INITIAL_USERS],
      products: [...OFFICIAL_SPICES_CATALOG],
      customers: [...INITIAL_CUSTOMERS],
      orders: [],
      stockAdjustments: [],
      notifications: [],
      accountingLogs: [],
      settings: { ...INITIAL_SETTINGS },
      deliveryRoutes: [],
    };
    this.loadFromDisk();
  }

  private loadFromDisk() {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      if (fs.existsSync(DB_FILE)) {
        const raw = fs.readFileSync(DB_FILE, 'utf-8');
        const parsed = JSON.parse(raw);
        if (parsed.users && parsed.users.length > 0) {
          this.state.users = parsed.users;
          INITIAL_USERS.forEach((u) => {
            if (!this.state.users.some((x) => x.id === u.id || x.name === u.name)) {
              this.state.users.push(u);
            }
          });
        }
        this.state.products = parsed.products || [];
        // Ensure all official spice products are present
        OFFICIAL_SPICES_CATALOG.forEach((sp) => {
          if (!this.state.products.some((p) => p.sku === sp.sku || p.id === sp.id)) {
            this.state.products.push(sp);
          }
        });
        this.state.customers = parsed.customers && parsed.customers.length > 0 ? parsed.customers : [...INITIAL_CUSTOMERS];
        this.state.orders = parsed.orders || [];
        this.state.stockAdjustments = parsed.stockAdjustments || [];
        this.state.notifications = parsed.notifications || [];
        this.state.accountingLogs = parsed.accountingLogs || [];
        this.state.settings = parsed.settings || { ...INITIAL_SETTINGS };
        this.state.deliveryRoutes = parsed.deliveryRoutes || [];

        // If no orders exist, generate sample upcoming delivery orders for testing route planning
        if (this.state.orders.length === 0 && this.state.customers.length > 0) {
          const tomorrowStr = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0];
          const c1 = this.state.customers[0];
          const c2 = this.state.customers[1];
          const c3 = this.state.customers[2];

          this.state.orders = [
            {
              id: 'ord-demo-01',
              invoiceNumber: 'INV-2026-01001',
              customerId: c1.id,
              customerName: c1.name,
              customerBusiness: c1.businessName,
              orderDate: new Date().toISOString().split('T')[0],
              dueDate: tomorrowStr,
              deliveryDate: tomorrowStr,
              deliveryStatus: 'Scheduled',
              deliveryAddress: c1.address,
              deliveryCity: c1.city,
              deliveryCoordinates: c1.coordinates,
              deliveryStopNumber: 1,
              pricingTier: c1.pricingTier,
              items: [
                {
                  productId: 'prod-sp-chilli-100g',
                  productName: 'Chilli Powder 100g',
                  sku: 'CHP-100G',
                  packageSize: '100g',
                  unitPrice: 260,
                  quantity: 40,
                  costPrice: 220,
                  lineTotal: 10400,
                },
                {
                  productId: 'prod-sp-curry-100g',
                  productName: 'Curry Powder 100g',
                  sku: 'CUR-100G',
                  packageSize: '100g',
                  unitPrice: 275,
                  quantity: 30,
                  costPrice: 230,
                  lineTotal: 8250,
                },
              ],
              subtotal: 18650,
              volumeDiscountPercent: 4,
              volumeDiscountAmount: 746,
              netTotal: 17904,
              paidAmount: 0,
              paymentStatus: 'Pending',
              paymentMethod: 'Bank Transfer',
              notes: 'Deliver morning between 9 AM - 11 AM at rear entrance.',
              createdBy: 'Naween Samaranayaka',
              createdAt: new Date().toISOString(),
            },
            {
              id: 'ord-demo-02',
              invoiceNumber: 'INV-2026-01002',
              customerId: c2.id,
              customerName: c2.name,
              customerBusiness: c2.businessName,
              orderDate: new Date().toISOString().split('T')[0],
              dueDate: tomorrowStr,
              deliveryDate: tomorrowStr,
              deliveryStatus: 'Scheduled',
              deliveryAddress: c2.address,
              deliveryCity: c2.city,
              deliveryCoordinates: c2.coordinates,
              deliveryStopNumber: 2,
              pricingTier: c2.pricingTier,
              items: [
                {
                  productId: 'prod-sp-turmeric-100g',
                  productName: 'Turmeric Powder 100g',
                  sku: 'TUR-100G',
                  packageSize: '100g',
                  unitPrice: 320,
                  quantity: 25,
                  costPrice: 270,
                  lineTotal: 8000,
                },
                {
                  productId: 'prod-sp-pepper-100g',
                  productName: 'Pepper Powder 100g',
                  sku: 'PEP-100G',
                  packageSize: '100g',
                  unitPrice: 420,
                  quantity: 20,
                  costPrice: 360,
                  lineTotal: 8400,
                },
              ],
              subtotal: 16400,
              volumeDiscountPercent: 3,
              volumeDiscountAmount: 492,
              netTotal: 15908,
              paidAmount: 15908,
              paymentStatus: 'Paid',
              paymentMethod: 'Cash',
              notes: 'Customer paid upfront, receive sign-off receipt on delivery.',
              createdBy: 'Mangala Senarathna',
              createdAt: new Date().toISOString(),
            },
            {
              id: 'ord-demo-03',
              invoiceNumber: 'INV-2026-01003',
              customerId: c3.id,
              customerName: c3.name,
              customerBusiness: c3.businessName,
              orderDate: new Date().toISOString().split('T')[0],
              dueDate: tomorrowStr,
              deliveryDate: tomorrowStr,
              deliveryStatus: 'Scheduled',
              deliveryAddress: c3.address,
              deliveryCity: c3.city,
              deliveryCoordinates: c3.coordinates,
              deliveryStopNumber: 3,
              pricingTier: c3.pricingTier,
              items: [
                {
                  productId: 'prod-sp-flakes-100g',
                  productName: 'Chilli Flakes 100g',
                  sku: 'FLK-100G',
                  packageSize: '100g',
                  unitPrice: 350,
                  quantity: 15,
                  costPrice: 230,
                  lineTotal: 5250,
                },
                {
                  productId: 'prod-sp-rchilli-100g',
                  productName: 'Roasted Chilli Powder 100g',
                  sku: 'RCH-100G',
                  packageSize: '100g',
                  unitPrice: 360,
                  quantity: 15,
                  costPrice: 240,
                  lineTotal: 5400,
                },
              ],
              subtotal: 10650,
              volumeDiscountPercent: 3,
              volumeDiscountAmount: 319.5,
              netTotal: 10330.5,
              paidAmount: 0,
              paymentStatus: 'Pending',
              paymentMethod: 'Cash',
              notes: 'Collect Cash On Delivery (Rs. 10,330) at shop counter.',
              createdBy: 'Naween Samaranayaka',
              createdAt: new Date().toISOString(),
            },
          ];
        }

        this.saveToDisk();
      } else {
        this.saveToDisk();
      }
    } catch (err) {
      console.warn('Could not read existing database file, using in-memory store:', err);
    }
  }

  public saveToDisk() {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      fs.writeFileSync(DB_FILE, JSON.stringify(this.state, null, 2), 'utf-8');
    } catch (err) {
      console.warn('Could not write database file:', err);
    }
  }

  public getState(): DatabaseState {
    return this.state;
  }

  public loadFromPersistentState(state: Partial<DatabaseState>) {
    if (state.users) this.state.users = state.users;
    if (state.products) this.state.products = state.products;
    if (state.customers) this.state.customers = state.customers;
    if (state.orders) this.state.orders = state.orders;
    if (state.stockAdjustments) this.state.stockAdjustments = state.stockAdjustments;
    if (state.notifications) this.state.notifications = state.notifications;
    if (state.accountingLogs) this.state.accountingLogs = state.accountingLogs;
    if (state.settings) this.state.settings = { ...this.state.settings, ...state.settings };
    if (state.deliveryRoutes) this.state.deliveryRoutes = state.deliveryRoutes;
    this.saveToDisk();
  }

  public prepareForProduction(initialAdminPassword: string) {
    if (initialAdminPassword.length < 12) {
      throw new Error('INITIAL_ADMIN_PASSWORD must be at least 12 characters long.');
    }

    let changed = false;
    for (const user of this.state.users) {
      if (!isPasswordHashed(user.password)) {
        const usesDefaultPassword = !user.password || user.password === 'password123';
        const password = usesDefaultPassword
          ? user.role === 'admin'
            ? initialAdminPassword
            : randomBytes(32).toString('base64url')
          : user.password;
        if (password) user.password = hashPassword(password);
        changed = true;
      }
    }

    if (changed) {
      this.saveToDisk();
      for (const user of this.state.users) {
        mongoService.upsertDocument('users', user.id, user).catch((err) => {
          console.warn('[MongoDB User Password Migration Notice]', err.message);
        });
      }
    }
  }

  // Users
  public getUsers() {
    return this.state.users.map(({ password, ...rest }) => rest);
  }

  public getUserById(id: string) {
    return this.state.users.find((u) => u.id === id);
  }

  public authenticate(email: string, passwordAttempt: string) {
    const user = this.state.users.find((u) => u.email.toLowerCase() === email.toLowerCase());
    if (!user) return null;
    if (!verifyPassword(user.password, passwordAttempt)) return null;
    if (!isPasswordHashed(user.password)) {
      user.password = hashPassword(passwordAttempt);
      this.saveToDisk();
      mongoService.upsertDocument('users', user.id, user).catch((err) => {
        console.warn('[MongoDB User Password Upgrade Notice]', err.message);
      });
    }
    const { password, ...rest } = user;
    return rest;
  }

  public verifyUserPassword(id: string, passwordAttempt: string): boolean {
    const user = this.state.users.find((item) => item.id === id);
    return Boolean(user && verifyPassword(user.password, passwordAttempt));
  }

  public addUser(user: User) {
    if (user.password && !isPasswordHashed(user.password)) {
      user.password = hashPassword(user.password);
    }
    this.state.users.push(user);
    this.saveToDisk();
    mongoService.upsertDocument('users', user.id, user).catch((err) => {
      console.warn('[MongoDB User Save Notice]', err.message);
    });
    return user;
  }

  public updateUser(id: string, updates: Partial<User>) {
    const index = this.state.users.findIndex((u) => u.id === id);
    if (index === -1) return null;
    const normalizedUpdates = { ...updates };
    if (normalizedUpdates.password && !isPasswordHashed(normalizedUpdates.password)) {
      normalizedUpdates.password = hashPassword(normalizedUpdates.password);
    }
    this.state.users[index] = { ...this.state.users[index], ...normalizedUpdates };
    this.saveToDisk();
    mongoService.upsertDocument('users', id, this.state.users[index]).catch((err) => {
      console.warn('[MongoDB User Update Notice]', err.message);
    });
    const { password, ...rest } = this.state.users[index];
    return rest;
  }

  public deleteUser(id: string) {
    const initialLen = this.state.users.length;
    this.state.users = this.state.users.filter((u) => u.id !== id);
    this.saveToDisk();
    mongoService.deleteDocument('users', id).catch((err) => {
      console.warn('[MongoDB User Delete Notice]', err.message);
    });
    return this.state.users.length < initialLen;
  }

  // Products
  public getProducts() {
    return this.state.products;
  }

  public getProductById(id: string) {
    return this.state.products.find((p) => p.id === id);
  }

  public getProductByBarcodeOrSku(code: string) {
    const clean = code.trim().toLowerCase();
    return this.state.products.find(
      (p) => p.barcode.toLowerCase() === clean || p.sku.toLowerCase() === clean
    );
  }

  public addProduct(product: Product) {
    this.state.products.push(product);
    this.saveToDisk();
    mongoService.upsertDocument('products', product.id, product).catch(() => {});
    notifyRealtimeChange('products', 'create', product);
    return product;
  }

  public updateProduct(id: string, updates: Partial<Product>) {
    const index = this.state.products.findIndex((p) => p.id === id);
    if (index === -1) return null;
    this.state.products[index] = {
      ...this.state.products[index],
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    this.saveToDisk();
    const updated = this.state.products[index];
    mongoService.upsertDocument('products', id, updated).catch(() => {});
    notifyRealtimeChange('products', 'update', updated);
    return updated;
  }

  public deleteProduct(id: string) {
    const initialLen = this.state.products.length;
    this.state.products = this.state.products.filter((p) => p.id !== id);
    this.saveToDisk();
    mongoService.deleteDocument('products', id).catch(() => {});
    notifyRealtimeChange('products', 'delete', { id });
    return this.state.products.length < initialLen;
  }

  public resetProductsCatalog() {
    const products = this.state.products;
    const adjustments = this.state.stockAdjustments;
    this.state.products = [];
    this.state.stockAdjustments = [];
    this.saveToDisk();
    for (const product of products) {
      mongoService.deleteDocument('products', product.id).catch(() => {});
    }
    for (const adjustment of adjustments) {
      mongoService.deleteDocument('stock_adjustments', adjustment.id).catch(() => {});
    }
    notifyRealtimeChange('products', 'reset', {});
  }

  // Stock Adjustments
  public addStockAdjustment(adj: StockAdjustment) {
    this.state.stockAdjustments.unshift(adj);
    // Also update product stock
    const prod = this.getProductById(adj.productId);
    if (prod) {
      prod.stockOnHand = adj.newStock;
      prod.updatedAt = new Date().toISOString();
      mongoService.upsertDocument('products', prod.id, prod).catch(() => {});
      if (prod.stockOnHand <= prod.reorderThreshold) {
        this.addNotification({
          id: `notif-stock-${Date.now()}`,
          title: 'Low Stock Alert',
          message: `${prod.name} (${prod.sku}) is below reorder threshold (${prod.stockOnHand}/${prod.reorderThreshold} remaining).`,
          type: 'low_stock',
          timestamp: new Date().toISOString(),
          read: false,
          linkTab: 'inventory',
          actionId: prod.id,
        });
      }
    }
    this.saveToDisk();
    mongoService.upsertDocument('stock_adjustments', adj.id, adj).catch(() => {});
    notifyRealtimeChange('stock', 'adjust', adj);
    return adj;
  }

  public getStockAdjustments() {
    return this.state.stockAdjustments;
  }

  // Customers
  public getCustomers() {
    return this.state.customers;
  }

  public getCustomerById(id: string) {
    return this.state.customers.find((c) => c.id === id);
  }

  public addCustomer(customer: Customer) {
    this.state.customers.push(customer);
    this.saveToDisk();
    mongoService.upsertDocument('customers', customer.id, customer).catch(() => {});
    notifyRealtimeChange('customers', 'create', customer);
    return customer;
  }

  public updateCustomer(id: string, updates: Partial<Customer>) {
    const index = this.state.customers.findIndex((c) => c.id === id);
    if (index === -1) return null;
    this.state.customers[index] = { ...this.state.customers[index], ...updates };
    this.saveToDisk();
    const updated = this.state.customers[index];
    mongoService.upsertDocument('customers', id, updated).catch(() => {});
    notifyRealtimeChange('customers', 'update', updated);
    return updated;
  }

  public deleteCustomer(id: string) {
    const initialLen = this.state.customers.length;
    this.state.customers = this.state.customers.filter((c) => c.id !== id);
    this.saveToDisk();
    mongoService.deleteDocument('customers', id).catch(() => {});
    notifyRealtimeChange('customers', 'delete', { id });
    return this.state.customers.length < initialLen;
  }

  // Orders
  public getOrders() {
    return this.state.orders;
  }

  public getOrderById(id: string) {
    return this.state.orders.find((o) => o.id === id);
  }

  public addOrder(order: Order) {
    this.state.orders.unshift(order);
    // Deduct stock for each item in the order
    for (const item of order.items) {
      const prod = this.getProductById(item.productId);
      if (prod) {
        const prev = prod.stockOnHand;
        const newStock = Math.max(0, prev - item.quantity);
        prod.stockOnHand = newStock;
        prod.updatedAt = new Date().toISOString();

        const adj: StockAdjustment = {
          id: `adj-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          productId: prod.id,
          productName: prod.name,
          sku: prod.sku,
          previousStock: prev,
          adjustmentQty: -item.quantity,
          newStock,
          reason: 'Order deduction',
          note: `Invoice #${order.invoiceNumber}`,
          createdBy: order.createdBy,
          createdAt: new Date().toISOString(),
        };

        this.state.stockAdjustments.unshift(adj);
        mongoService.upsertDocument('stock_adjustments', adj.id, adj).catch(() => {});
        mongoService.upsertDocument('products', prod.id, prod).catch(() => {});

        if (newStock <= prod.reorderThreshold) {
          this.addNotification({
            id: `notif-stock-${Date.now()}-${prod.id}`,
            title: 'Low Stock Alert',
            message: `${prod.name} (${prod.sku}) dropped to ${newStock} units after order #${order.invoiceNumber}`,
            type: 'low_stock',
            timestamp: new Date().toISOString(),
            read: false,
            linkTab: 'inventory',
            actionId: prod.id,
          });
        }
      }
    }

    // Update customer stats
    const cust = this.getCustomerById(order.customerId);
    if (cust) {
      cust.totalOrders = (cust.totalOrders || 0) + 1;
      cust.totalSpent = (cust.totalSpent || 0) + order.netTotal;
      if (order.paymentStatus !== 'Paid') {
        const remaining = order.netTotal - (order.paidAmount || 0);
        cust.currentBalance = (cust.currentBalance || 0) + remaining;
      }
      mongoService.upsertDocument('customers', cust.id, cust).catch(() => {});
    }

    this.addNotification({
      id: `notif-order-${Date.now()}`,
      title: 'New Order Placed',
      message: `Invoice #${order.invoiceNumber} for ${order.customerBusiness || order.customerName} - Rs. ${order.netTotal.toLocaleString()}`,
      type: 'order',
      timestamp: new Date().toISOString(),
      read: false,
      linkTab: 'orders',
      actionId: order.id,
    });

    this.saveToDisk();
    mongoService.upsertDocument('orders', order.id, order).catch(() => {});
    notifyRealtimeChange('orders', 'create', order);
    return order;
  }

  public updateOrder(id: string, updates: Partial<Order>) {
    const index = this.state.orders.findIndex((o) => o.id === id);
    if (index === -1) return null;
    const prevOrder = this.state.orders[index];
    this.state.orders[index] = { ...prevOrder, ...updates };

    // Update customer balance if payment status or paidAmount changed
    if (updates.paymentStatus || updates.paidAmount !== undefined) {
      const cust = this.getCustomerById(prevOrder.customerId);
      if (cust) {
        const customerOrders = this.state.orders.filter(
          (o) => o.customerId === cust.id && o.paymentStatus !== 'Cancelled'
        );
        let balance = 0;
        customerOrders.forEach((o) => {
          if (o.paymentStatus !== 'Paid') {
            balance += o.netTotal - (o.paidAmount || 0);
          }
        });
        cust.currentBalance = Math.max(0, balance);
        mongoService.upsertDocument('customers', cust.id, cust).catch(() => {});
      }
    }

    this.saveToDisk();
    const updated = this.state.orders[index];
    mongoService.upsertDocument('orders', id, updated).catch(() => {});
    notifyRealtimeChange('orders', 'update', updated);
    return updated;
  }

  public deleteOrder(id: string) {
    const initialLen = this.state.orders.length;
    this.state.orders = this.state.orders.filter((o) => o.id !== id);
    this.saveToDisk();
    mongoService.deleteDocument('orders', id).catch(() => {});
    notifyRealtimeChange('orders', 'delete', { id });
    return this.state.orders.length < initialLen;
  }

  // Delivery Routes
  public getDeliveryRoutes(): DeliveryRoute[] {
    return this.state.deliveryRoutes || [];
  }

  public saveDeliveryRoute(route: DeliveryRoute): DeliveryRoute {
    if (!this.state.deliveryRoutes) {
      this.state.deliveryRoutes = [];
    }
    const idx = this.state.deliveryRoutes.findIndex((r) => r.id === route.id);
    if (idx >= 0) {
      this.state.deliveryRoutes[idx] = { ...route, updatedAt: new Date().toISOString() };
    } else {
      this.state.deliveryRoutes.unshift(route);
    }
    this.saveToDisk();
    mongoService.upsertDocument('delivery_routes', route.id, route).catch(() => {});
    notifyRealtimeChange('delivery_routes', 'save', route);
    return route;
  }

  public updateDeliveryStopStatus(
    routeId: string,
    stopNumber: number,
    status: 'Pending' | 'Scheduled' | 'Out for Delivery' | 'Delivered' | 'Failed',
    notes?: string
  ): DeliveryRoute | null {
    if (!this.state.deliveryRoutes) return null;
    const route = this.state.deliveryRoutes.find((r) => r.id === routeId);
    if (!route) return null;

    const stop = route.stops.find((s) => s.stopNumber === stopNumber);
    if (stop) {
      stop.deliveryStatus = status;
      if (status === 'Delivered') {
        stop.deliveredAt = new Date().toISOString();
      }
      if (notes) {
        stop.notes = notes;
      }

      this.updateOrder(stop.orderId, {
        deliveryStatus: status,
      });

      const allDelivered = route.stops.every((s) => s.deliveryStatus === 'Delivered');
      if (allDelivered) {
        route.status = 'Completed';
      } else if (route.stops.some((s) => s.deliveryStatus === 'Out for Delivery' || s.deliveryStatus === 'Delivered')) {
        route.status = 'In Progress';
      }

      route.updatedAt = new Date().toISOString();
      this.saveToDisk();
      mongoService.upsertDocument('delivery_routes', route.id, route).catch(() => {});
      notifyRealtimeChange('delivery_routes', 'update_stop', route);
    }

    return route;
  }

  // Notifications
  public getNotifications() {
    return this.state.notifications;
  }

  public addNotification(notif: AppNotification) {
    this.state.notifications.unshift(notif);
    if (this.state.notifications.length > 50) {
      this.state.notifications.pop();
    }
    this.saveToDisk();
    mongoService.upsertDocument('notifications', notif.id, notif).catch(() => {});
    notifyRealtimeChange('notifications', 'create', notif);
    return notif;
  }

  public markNotificationAsRead(id: string) {
    const n = this.state.notifications.find((notif) => notif.id === id);
    if (n) {
      n.read = true;
      this.saveToDisk();
      mongoService.upsertDocument('notifications', id, n).catch(() => {});
      notifyRealtimeChange('notifications', 'read', n);
    }
    return n;
  }

  public markAllNotificationsRead() {
    this.state.notifications.forEach((n) => (n.read = true));
    this.saveToDisk();
    for (const notification of this.state.notifications) {
      mongoService.upsertDocument('notifications', notification.id, notification).catch((err) => {
        console.warn('[MongoDB Notification Update Notice]', err.message);
      });
    }
    notifyRealtimeChange('notifications', 'mark_all_read', {});
  }

  // Accounting logs
  public getAccountingLogs() {
    return this.state.accountingLogs;
  }

  public addAccountingLog(log: AccountingSyncLog) {
    this.state.accountingLogs.unshift(log);
    this.saveToDisk();
    mongoService.upsertDocument('accounting_logs', log.id, log).catch(() => {});
    notifyRealtimeChange('accounting', 'log', log);
    return log;
  }

  // Settings
  public getSettings() {
    return this.state.settings;
  }

  public updateSettings(settings: Partial<AppSettings>) {
    this.state.settings = { ...this.state.settings, ...settings };
    this.saveToDisk();
    mongoService.upsertDocument('settings', 'current', this.state.settings).catch(() => {});
    notifyRealtimeChange('settings', 'update', this.state.settings);
    return this.state.settings;
  }
}

export const db = new Database();
