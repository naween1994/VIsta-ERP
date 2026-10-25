import { 
  Product, 
  Customer, 
  Order, 
  User, 
  StockAdjustment, 
  AppNotification, 
  AccountingSyncLog, 
  AppSettings,
  DeliveryRoute,
  DeliveryStop
} from '../types/index.ts';

const API_BASE = '/api';

export const api = {
  // State
  async fetchFullState(): Promise<{
    users: User[];
    products: Product[];
    customers: Customer[];
    orders: Order[];
    stockAdjustments: StockAdjustment[];
    notifications: AppNotification[];
    accountingLogs: AccountingSyncLog[];
    settings: AppSettings;
  }> {
    const res = await fetch(`${API_BASE}/state`);
    if (!res.ok) throw new Error('Failed to fetch application state');
    const json = await res.json();
    return json.data;
  },

  // Auth & Users
  async getSession(): Promise<User | null> {
    const res = await fetch(`${API_BASE}/auth/session`);
    const json = await res.json();
    return json.user || null;
  },

  async getUsers(): Promise<User[]> {
    const res = await fetch(`${API_BASE}/auth/users`);
    const json = await res.json();
    return json.users || [];
  },

  async login(email: string, password?: string): Promise<User> {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const json = await res.json();
    if (!res.ok || !json.success) throw new Error(json.message || 'Login failed');
    return json.user;
  },

  async logout(): Promise<void> {
    const res = await fetch(`${API_BASE}/auth/logout`, { method: 'POST' });
    if (!res.ok) throw new Error('Failed to end the session.');
  },

  async changePassword(userId: string, currentPassword: string, newPassword: string): Promise<void> {
    const res = await fetch(`${API_BASE}/auth/change-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, currentPassword, newPassword }),
    });
    const json = await res.json();
    if (!res.ok || !json.success) throw new Error(json.message || 'Failed to change password');
  },

  async createUser(userData: Partial<User> & { password?: string }): Promise<User> {
    const res = await fetch(`${API_BASE}/auth/users`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userData),
    });
    const json = await res.json();
    if (!res.ok || !json.success) throw new Error(json.message || 'Failed to create user');
    return json.user;
  },

  async updateUser(userId: string, updates: Partial<User>): Promise<User> {
    const res = await fetch(`${API_BASE}/auth/users/${userId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    const json = await res.json();
    if (!res.ok || !json.success) throw new Error(json.message || 'Failed to update user');
    return json.user;
  },

  async deleteUser(userId: string, adminPassword?: string): Promise<void> {
    const res = await fetch(`${API_BASE}/auth/users/${userId}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ adminPassword }),
    });
    const json = await res.json();
    if (!res.ok || !json.success) throw new Error(json.message || 'Failed to delete user');
  },

  // Products
  async getProducts(): Promise<Product[]> {
    const res = await fetch(`${API_BASE}/products`);
    const json = await res.json();
    return json.products || [];
  },

  async lookupProduct(code: string): Promise<Product | null> {
    const res = await fetch(`${API_BASE}/products/lookup?code=${encodeURIComponent(code)}`);
    if (res.status === 404) return null;
    const json = await res.json();
    if (!res.ok || !json.success) throw new Error(json.message || 'Lookup failed');
    return json.product;
  },

  async createProduct(productData: Partial<Product>): Promise<Product> {
    const res = await fetch(`${API_BASE}/products`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(productData),
    });
    const json = await res.json();
    if (!res.ok || !json.success) throw new Error(json.message || 'Failed to create product');
    return json.product;
  },

  async updateProduct(id: string, updates: Partial<Product>): Promise<Product> {
    const res = await fetch(`${API_BASE}/products/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    const json = await res.json();
    if (!res.ok || !json.success) throw new Error(json.message || 'Failed to update product');
    return json.product;
  },

  async quickRestock(id: string, quantity: number, note?: string, userName?: string): Promise<Product> {
    const res = await fetch(`${API_BASE}/products/${id}/quick-restock`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ quantity, note, userName }),
    });
    const json = await res.json();
    if (!res.ok || !json.success) throw new Error(json.message || 'Restock failed');
    return json.product;
  },

  async adjustStock(
    id: string,
    adjustmentQty: number,
    reason: string,
    note?: string,
    userName?: string
  ): Promise<{ product: Product; adjustment: StockAdjustment }> {
    const res = await fetch(`${API_BASE}/products/${id}/adjust-stock`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ adjustmentQty, reason, note, userName }),
    });
    const json = await res.json();
    if (!res.ok || !json.success) throw new Error(json.message || 'Stock adjustment failed');
    return { product: json.product, adjustment: json.adjustment };
  },

  async deleteProduct(id: string, adminPassword?: string): Promise<void> {
    const res = await fetch(`${API_BASE}/products/${id}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ adminPassword }),
    });
    const json = await res.json();
    if (!res.ok || !json.success) throw new Error(json.message || 'Failed to delete product');
  },

  async resetCatalog(adminPassword?: string): Promise<void> {
    const res = await fetch(`${API_BASE}/products/reset-catalog`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ adminPassword }),
    });
    const json = await res.json();
    if (!res.ok || !json.success) throw new Error(json.message || 'Failed to reset catalog');
  },

  // Customers
  async getCustomers(): Promise<Customer[]> {
    const res = await fetch(`${API_BASE}/customers`);
    const json = await res.json();
    return json.customers || [];
  },

  async createCustomer(customerData: Partial<Customer>): Promise<Customer> {
    const res = await fetch(`${API_BASE}/customers`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(customerData),
    });
    const json = await res.json();
    if (!res.ok || !json.success) throw new Error(json.message || 'Failed to create customer');
    return json.customer;
  },

  async updateCustomer(id: string, updates: Partial<Customer>): Promise<Customer> {
    const res = await fetch(`${API_BASE}/customers/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    const json = await res.json();
    if (!res.ok || !json.success) throw new Error(json.message || 'Failed to update customer');
    return json.customer;
  },

  async deleteCustomer(id: string, adminPassword?: string): Promise<void> {
    const res = await fetch(`${API_BASE}/customers/${id}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ adminPassword }),
    });
    const json = await res.json();
    if (!res.ok || !json.success) throw new Error(json.message || 'Failed to delete customer');
  },

  // Orders
  async getOrders(): Promise<Order[]> {
    const res = await fetch(`${API_BASE}/orders`);
    const json = await res.json();
    return json.orders || [];
  },

  async createOrder(orderData: any): Promise<Order> {
    const res = await fetch(`${API_BASE}/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(orderData),
    });
    const json = await res.json();
    if (!res.ok || !json.success) throw new Error(json.message || 'Failed to create order');
    return json.order;
  },

  async updateOrder(id: string, updates: Partial<Order>): Promise<Order> {
    const res = await fetch(`${API_BASE}/orders/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    const json = await res.json();
    if (!res.ok || !json.success) throw new Error(json.message || 'Failed to update order');
    return json.order;
  },

  async deleteOrder(id: string, adminPassword?: string): Promise<void> {
    const res = await fetch(`${API_BASE}/orders/${id}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ adminPassword }),
    });
    const json = await res.json();
    if (!res.ok || !json.success) throw new Error(json.message || 'Failed to delete order');
  },

  // Reports
  async getReportSummary(range = '30d', startDate?: string, endDate?: string) {
    let url = `${API_BASE}/reports/summary?range=${range}`;
    if (startDate) url += `&startDate=${startDate}`;
    if (endDate) url += `&endDate=${endDate}`;
    const res = await fetch(url);
    const json = await res.json();
    return json;
  },

  // Notifications
  async getNotifications(): Promise<{ notifications: AppNotification[]; unreadCount: number }> {
    const res = await fetch(`${API_BASE}/notifications`);
    const json = await res.json();
    return json;
  },

  async markNotificationRead(id: string): Promise<void> {
    await fetch(`${API_BASE}/notifications/${id}/read`, { method: 'PATCH' });
  },

  async markAllNotificationsRead(): Promise<void> {
    await fetch(`${API_BASE}/notifications/mark-all-read`, { method: 'POST' });
  },

  async sendPaymentReminder(payload: {
    customerId: string;
    invoiceNumber: string;
    amountDue: number;
    channel: 'email' | 'sms';
    recipientContact: string;
    templateMessage: string;
  }): Promise<any> {
    const res = await fetch(`${API_BASE}/notifications/payment-reminders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return res.json();
  },

  // Accounting
  async getAccountingLogs(): Promise<AccountingSyncLog[]> {
    const res = await fetch(`${API_BASE}/accounting/logs`);
    const json = await res.json();
    return json.logs || [];
  },

  async simulateAccountingSync(target: 'QuickBooks' | 'Xero', userName?: string): Promise<AccountingSyncLog> {
    const res = await fetch(`${API_BASE}/accounting/sync`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ target, userName }),
    });
    const json = await res.json();
    return json.log;
  },

  // Settings
  async getSettings(): Promise<AppSettings> {
    const res = await fetch(`${API_BASE}/settings`);
    const json = await res.json();
    return json.settings;
  },

  async updateSettings(settings: Partial<AppSettings>): Promise<AppSettings> {
    const res = await fetch(`${API_BASE}/settings`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settings),
    });
    const json = await res.json();
    return json.settings;
  },

  async testMongoConnection(uri: string): Promise<{ success: boolean; message: string; connected: boolean; latencyMs?: number; stats?: any }> {
    const res = await fetch(`${API_BASE}/settings/mongodb/test`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ uri }),
    });
    return res.json();
  },

  async syncToMongo(uri?: string): Promise<{ success: boolean; message: string; synced?: any }> {
    const res = await fetch(`${API_BASE}/settings/mongodb/sync`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ uri }),
    });
    return res.json();
  },

  async fetchFromMongo(uri?: string): Promise<{ success: boolean; message: string; data?: any }> {
    const res = await fetch(`${API_BASE}/settings/mongodb/import`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ uri }),
    });
    return res.json();
  },

  async initMongoDatabase(uri?: string, forceReseed: boolean = false): Promise<{
    success: boolean;
    message: string;
    connected?: boolean;
    databaseName?: string;
    collectionsCreated?: string[];
    indexesCreated?: string[];
    seededCounts?: { products: number; customers: number; orders: number; users: number };
  }> {
    const res = await fetch(`${API_BASE}/settings/mongodb/init`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ uri, forceReseed }),
    });
    return res.json();
  },

  async disconnectMongo(): Promise<any> {
    const res = await fetch(`${API_BASE}/settings/mongodb/disconnect`, { method: 'POST' });
    return res.json();
  },

  // Delivery Routes & Scheduling
  async fetchDeliveryPending(date?: string): Promise<{
    success: boolean;
    warehouse: { name: string; address: string; latitude: number; longitude: number };
    stops: DeliveryStop[];
    count: number;
  }> {
    const q = date ? `?date=${encodeURIComponent(date)}` : '';
    const res = await fetch(`${API_BASE}/delivery/pending${q}`);
    const json = await res.json();
    return json;
  },

  async fetchDeliveryRoutes(): Promise<DeliveryRoute[]> {
    const res = await fetch(`${API_BASE}/delivery/routes`);
    const json = await res.json();
    return json.routes || [];
  },

  async saveDeliveryRoute(routeData: any): Promise<DeliveryRoute> {
    const res = await fetch(`${API_BASE}/delivery/routes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(routeData),
    });
    const json = await res.json();
    if (!res.ok || !json.success) throw new Error(json.message || 'Failed to save delivery route');
    return json.route;
  },

  async updateDeliveryStopStatus(
    routeId: string,
    stopNumber: number,
    status: string,
    notes?: string
  ): Promise<DeliveryRoute> {
    const res = await fetch(`${API_BASE}/delivery/routes/${routeId}/stop/${stopNumber}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status, notes }),
    });
    const json = await res.json();
    if (!res.ok || !json.success) throw new Error(json.message || 'Failed to update delivery stop');
    return json.route;
  },
};
