import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import type { 
  Product, 
  Customer, 
  Order, 
  AppNotification, 
  AccountingSyncLog, 
  AppSettings,
  StockAdjustment,
  DeliveryRoute,
  DeliveryStop
} from '../types/index.ts';
import { api } from '../utils/api.ts';

export type NavTab = 
  | 'dashboard' 
  | 'inventory' 
  | 'scanner' 
  | 'customers' 
  | 'orders' 
  | 'delivery' 
  | 'reports' 
  | 'users' 
  | 'notifications' 
  | 'accounting';

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info' | 'warning';
  title: string;
  message?: string;
}

interface AppContextType {
  // State
  products: Product[];
  customers: Customer[];
  orders: Order[];
  deliveryRoutes: DeliveryRoute[];
  notifications: AppNotification[];
  accountingLogs: AccountingSyncLog[];
  settings: AppSettings | null;
  activeTab: NavTab;
  setActiveTab: (tab: NavTab) => void;
  isLoading: boolean;
  isBackendConnected: boolean;
  isRealtimeActive: boolean;
  toasts: ToastMessage[];
  addToast: (toast: Omit<ToastMessage, 'id'>) => void;
  removeToast: (id: string) => void;

  // Refresh
  refreshData: () => Promise<void>;

  // Products actions
  createProduct: (data: Partial<Product>) => Promise<Product>;
  updateProduct: (id: string, data: Partial<Product>) => Promise<Product>;
  deleteProduct: (id: string, adminPassword?: string) => Promise<void>;
  quickRestock: (id: string, qty: number, note?: string, userName?: string) => Promise<Product>;
  adjustStock: (id: string, qty: number, reason: string, note?: string, userName?: string) => Promise<{ product: Product; adjustment: StockAdjustment }>;
  resetCatalog: (adminPassword?: string) => Promise<void>;

  // Customers actions
  createCustomer: (data: Partial<Customer>) => Promise<Customer>;
  updateCustomer: (id: string, data: Partial<Customer>) => Promise<Customer>;
  deleteCustomer: (id: string, adminPassword?: string) => Promise<void>;

  // Orders actions
  createOrder: (orderData: any) => Promise<Order>;
  updateOrder: (id: string, updates: Partial<Order>) => Promise<Order>;
  deleteOrder: (id: string, adminPassword?: string) => Promise<void>;

  // Delivery Route actions
  saveDeliveryRoute: (routeData: any) => Promise<DeliveryRoute>;
  updateDeliveryStopStatus: (routeId: string, stopNumber: number, status: string, notes?: string) => Promise<DeliveryRoute>;
  fetchDeliveryPending: (date?: string) => Promise<{
    success: boolean;
    warehouse: { name: string; address: string; latitude: number; longitude: number };
    stops: DeliveryStop[];
    count: number;
  }>;

  // Notifications
  unreadNotificationsCount: number;
  markNotificationRead: (id: string) => Promise<void>;
  markAllNotificationsRead: () => Promise<void>;

  // Accounting
  simulateAccountingSync: (target: 'QuickBooks' | 'Xero') => Promise<void>;

  // Settings
  updateSettings: (newSettings: Partial<AppSettings>) => Promise<void>;

  // Global UI Modals
  activeProductForRestock: Product | null;
  setActiveProductForRestock: (p: Product | null) => void;
  activeProductForAdjust: Product | null;
  setActiveProductForAdjust: (p: Product | null) => void;
  activeOrderForView: Order | null;
  setActiveOrderForView: (o: Order | null) => void;
  isNewOrderModalOpen: boolean;
  setIsNewOrderModalOpen: (open: boolean) => void;
  preselectedProductForOrder: Product | null;
  setPreselectedProductForOrder: (p: Product | null) => void;
  isAddProductModalOpen: boolean;
  setIsAddProductModalOpen: (open: boolean) => void;
  isAddCustomerModalOpen: boolean;
  setIsAddCustomerModalOpen: (open: boolean) => void;
  printStickerProducts: Product[];
  setPrintStickerProducts: (prods: Product[]) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [deliveryRoutes, setDeliveryRoutes] = useState<DeliveryRoute[]>([]);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [accountingLogs, setAccountingLogs] = useState<AccountingSyncLog[]>([]);
  const [settings, setSettings] = useState<AppSettings | null>(null);
  
  const [activeTab, setActiveTab] = useState<NavTab>('dashboard');
  const [isLoading, setIsLoading] = useState(true);
  const [isBackendConnected, setIsBackendConnected] = useState(true);
  const [isRealtimeActive, setIsRealtimeActive] = useState(false);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  // Modals state
  const [activeProductForRestock, setActiveProductForRestock] = useState<Product | null>(null);
  const [activeProductForAdjust, setActiveProductForAdjust] = useState<Product | null>(null);
  const [activeOrderForView, setActiveOrderForView] = useState<Order | null>(null);
  const [isNewOrderModalOpen, setIsNewOrderModalOpen] = useState(false);
  const [preselectedProductForOrder, setPreselectedProductForOrder] = useState<Product | null>(null);
  const [isAddProductModalOpen, setIsAddProductModalOpen] = useState(false);
  const [isAddCustomerModalOpen, setIsAddCustomerModalOpen] = useState(false);
  const [printStickerProducts, setPrintStickerProducts] = useState<Product[]>([]);

  const isInitialLoadRef = useRef(true);

  const addToast = useCallback((toast: Omit<ToastMessage, 'id'>) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`;
    setToasts((prev) => [...prev, { ...toast, id }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4500);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const refreshData = useCallback(async () => {
    try {
      const state = await api.fetchFullState();
      setProducts(state.products || []);
      setCustomers(state.customers || []);
      setOrders(state.orders || []);
      setNotifications(state.notifications || []);
      setAccountingLogs(state.accountingLogs || []);
      setSettings(state.settings);
      
      // Also fetch delivery routes
      api.fetchDeliveryRoutes().then((routes) => {
        setDeliveryRoutes(routes);
      }).catch(() => {});

      setIsBackendConnected(true);
    } catch (err) {
      console.warn('Backend state fetch error, using local state:', err);
      setIsBackendConnected(false);
    } finally {
      if (isInitialLoadRef.current) {
        setIsLoading(false);
        isInitialLoadRef.current = false;
      }
    }
  }, []);

  // Initial fetch and Realtime SSE + Polling connection
  useEffect(() => {
    refreshData();

    // 1. Setup Server-Sent Events (SSE) for instant push updates
    let eventSource: EventSource | null = null;
    let reconnectTimeout: any = null;

    const setupSSE = () => {
      try {
        eventSource = new EventSource('/api/realtime/stream');
        
        eventSource.onopen = () => {
          setIsRealtimeActive(true);
        };

        eventSource.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            if (data.type === 'connected') {
              setIsRealtimeActive(true);
              return;
            }
            // Trigger instant real-time sync across web and database
            refreshData();
          } catch {
            // Heartbeat or parse ignore
          }
        };

        eventSource.onerror = () => {
          setIsRealtimeActive(false);
          eventSource?.close();
          // Attempt reconnection after 3 seconds
          reconnectTimeout = setTimeout(setupSSE, 3000);
        };
      } catch {
        setIsRealtimeActive(false);
      }
    };

    setupSSE();

    // 2. Fallback polling every 5 seconds to ensure absolute consistency
    const pollInterval = setInterval(() => {
      refreshData();
    }, 5000);

    // 3. Sync immediately when tab/window regains focus
    const handleFocus = () => {
      refreshData();
    };
    window.addEventListener('focus', handleFocus);

    return () => {
      if (eventSource) eventSource.close();
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
      clearInterval(pollInterval);
      window.removeEventListener('focus', handleFocus);
    };
  }, [refreshData]);

  // Product operations
  const createProduct = async (data: Partial<Product>) => {
    const newProd = await api.createProduct(data);
    setProducts((prev) => [...prev, newProd]);
    addToast({ type: 'success', title: 'Spice Added', message: `${newProd.name} added to inventory` });
    refreshData();
    return newProd;
  };

  const updateProduct = async (id: string, data: Partial<Product>) => {
    const updated = await api.updateProduct(id, data);
    setProducts((prev) => prev.map((p) => (p.id === id ? updated : p)));
    addToast({ type: 'success', title: 'Product Updated', message: `${updated.name} has been updated` });
    refreshData();
    return updated;
  };

  const deleteProduct = async (id: string, adminPassword?: string) => {
    await api.deleteProduct(id, adminPassword);
    setProducts((prev) => prev.filter((p) => p.id !== id));
    addToast({ type: 'info', title: 'Product Removed', message: 'Product removed from catalog' });
    refreshData();
  };

  const quickRestock = async (id: string, qty: number, note?: string, userName?: string) => {
    const updated = await api.quickRestock(id, qty, note, userName);
    setProducts((prev) => prev.map((p) => (p.id === id ? updated : p)));
    addToast({
      type: 'success',
      title: 'Stock Updated',
      message: `Restocked ${qty} units. New stock: ${updated.stockOnHand}`,
    });
    refreshData();
    return updated;
  };

  const adjustStock = async (id: string, qty: number, reason: string, note?: string, userName?: string) => {
    const res = await api.adjustStock(id, qty, reason, note, userName);
    setProducts((prev) => prev.map((p) => (p.id === id ? res.product : p)));
    addToast({
      type: 'success',
      title: 'Stock Adjusted',
      message: `${res.product.name} stock changed by ${qty > 0 ? '+' : ''}${qty} (${reason})`,
    });
    refreshData();
    return res;
  };

  const resetCatalog = async (adminPassword?: string) => {
    await api.resetCatalog(adminPassword);
    setProducts([]);
    addToast({ type: 'warning', title: 'Catalog Reset', message: 'All products cleared from database' });
    refreshData();
  };

  // Customer operations
  const createCustomer = async (data: Partial<Customer>) => {
    const newCust = await api.createCustomer(data);
    setCustomers((prev) => [...prev, newCust]);
    addToast({
      type: 'success',
      title: 'Customer Created',
      message: `${newCust.businessName || newCust.name} added to trade accounts`,
    });
    refreshData();
    return newCust;
  };

  const updateCustomer = async (id: string, data: Partial<Customer>) => {
    const updated = await api.updateCustomer(id, data);
    setCustomers((prev) => prev.map((c) => (c.id === id ? updated : c)));
    addToast({ type: 'success', title: 'Customer Updated', message: 'Account details and location saved' });
    refreshData();
    return updated;
  };

  const deleteCustomer = async (id: string, adminPassword?: string) => {
    await api.deleteCustomer(id, adminPassword);
    setCustomers((prev) => prev.filter((c) => c.id !== id));
    addToast({ type: 'info', title: 'Customer Removed', message: 'Account deleted' });
    refreshData();
  };

  // Orders operations
  const createOrder = async (orderData: any) => {
    const newOrder = await api.createOrder(orderData);
    setOrders((prev) => [newOrder, ...prev]);
    addToast({
      type: 'success',
      title: 'Order Created',
      message: `Invoice #${newOrder.invoiceNumber} created for Rs. ${newOrder.netTotal.toLocaleString()}`,
    });
    refreshData();
    return newOrder;
  };

  const updateOrder = async (id: string, updates: Partial<Order>) => {
    const updated = await api.updateOrder(id, updates);
    setOrders((prev) => prev.map((o) => (o.id === id ? updated : o)));
    addToast({ type: 'success', title: 'Order Updated', message: `Invoice #${updated.invoiceNumber} saved` });
    refreshData();
    return updated;
  };

  const deleteOrder = async (id: string, adminPassword?: string) => {
    await api.deleteOrder(id, adminPassword);
    setOrders((prev) => prev.filter((o) => o.id !== id));
    addToast({ type: 'info', title: 'Order Cancelled', message: 'Invoice removed' });
    refreshData();
  };

  // Delivery Routes operations
  const saveDeliveryRoute = async (routeData: any): Promise<DeliveryRoute> => {
    const saved = await api.saveDeliveryRoute(routeData);
    setDeliveryRoutes((prev) => {
      const idx = prev.findIndex((r) => r.id === saved.id);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = saved;
        return copy;
      }
      return [saved, ...prev];
    });
    addToast({
      type: 'success',
      title: 'Delivery Route Scheduled',
      message: `${saved.routeName} saved with ${saved.stops.length} delivery stops (${saved.totalDistanceKm} km)`,
    });
    refreshData();
    return saved;
  };

  const updateDeliveryStopStatus = async (
    routeId: string,
    stopNumber: number,
    status: string,
    notes?: string
  ): Promise<DeliveryRoute> => {
    const updated = await api.updateDeliveryStopStatus(routeId, stopNumber, status, notes);
    setDeliveryRoutes((prev) => prev.map((r) => (r.id === routeId ? updated : r)));
    addToast({
      type: 'info',
      title: 'Stop Status Updated',
      message: `Stop #${stopNumber} marked as ${status}`,
    });
    refreshData();
    return updated;
  };

  const fetchDeliveryPending = async (date?: string) => {
    return api.fetchDeliveryPending(date);
  };

  // Notifications
  const unreadNotificationsCount = notifications.filter((n) => !n.read).length;

  const markNotificationRead = async (id: string) => {
    await api.markNotificationRead(id);
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
  };

  const markAllNotificationsRead = async () => {
    await api.markAllNotificationsRead();
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    addToast({ type: 'info', title: 'Cleared', message: 'All notifications marked as read' });
  };

  // Accounting
  const simulateAccountingSync = async (target: 'QuickBooks' | 'Xero') => {
    const res = await api.simulateAccountingSync(target);
    addToast({
      type: 'success',
      title: `${target} Synced`,
      message: `${res.recordsSynced} invoices posted to accounting software`,
    });
    refreshData();
  };

  // Settings
  const updateSettings = async (newSettings: Partial<AppSettings>) => {
    const updated = await api.updateSettings(newSettings);
    setSettings(updated);
    addToast({ type: 'success', title: 'Settings Saved', message: 'System configurations updated' });
    refreshData();
  };

  return (
    <AppContext.Provider
      value={{
        products,
        customers,
        orders,
        deliveryRoutes,
        notifications,
        accountingLogs,
        settings,
        activeTab,
        setActiveTab,
        isLoading,
        isBackendConnected,
        isRealtimeActive,
        toasts,
        addToast,
        removeToast,
        refreshData,
        createProduct,
        updateProduct,
        deleteProduct,
        quickRestock,
        adjustStock,
        resetCatalog,
        createCustomer,
        updateCustomer,
        deleteCustomer,
        createOrder,
        updateOrder,
        deleteOrder,
        saveDeliveryRoute,
        updateDeliveryStopStatus,
        fetchDeliveryPending,
        unreadNotificationsCount,
        markNotificationRead,
        markAllNotificationsRead,
        simulateAccountingSync,
        updateSettings,
        activeProductForRestock,
        setActiveProductForRestock,
        activeProductForAdjust,
        setActiveProductForAdjust,
        activeOrderForView,
        setActiveOrderForView,
        isNewOrderModalOpen,
        setIsNewOrderModalOpen,
        preselectedProductForOrder,
        setPreselectedProductForOrder,
        isAddProductModalOpen,
        setIsAddProductModalOpen,
        isAddCustomerModalOpen,
        setIsAddCustomerModalOpen,
        printStickerProducts,
        setPrintStickerProducts,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
