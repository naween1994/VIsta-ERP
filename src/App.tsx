/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { AuthProvider } from './context/AuthContext.tsx';
import { AppProvider, useApp } from './context/AppContext.tsx';
import { Navbar } from './components/Navbar.tsx';
import { Sidebar } from './components/Sidebar.tsx';

// Views
import { DashboardView } from './components/DashboardView.tsx';
import { InventoryView } from './components/InventoryView.tsx';
import { ScannerView } from './components/ScannerView.tsx';
import { CustomersView } from './components/CustomersView.tsx';
import { OrdersView } from './components/OrdersView.tsx';
import { ReportsView } from './components/ReportsView.tsx';
import { UsersView } from './components/UsersView.tsx';
import { NotificationsView } from './components/NotificationsView.tsx';
import { AccountingView } from './components/AccountingView.tsx';
import { DeliveryRoutePlanner } from './components/delivery/DeliveryRoutePlanner.tsx';

// Modals
import { NewOrderModal } from './components/modals/NewOrderModal.tsx';
import { AddProductModal } from './components/modals/AddProductModal.tsx';
import { AddCustomerModal } from './components/modals/AddCustomerModal.tsx';
import { StockAdjustModal } from './components/modals/StockAdjustModal.tsx';
import { QuickRestockModal } from './components/modals/QuickRestockModal.tsx';
import { InvoiceModal } from './components/modals/InvoiceModal.tsx';
import { BarcodePrintModal } from './components/modals/BarcodePrintModal.tsx';

import { useAuth } from './context/AuthContext.tsx';
import { LoginPage } from './components/LoginPage.tsx';

// Toast Notification component
const ToastContainer: React.FC = () => {
  const { toasts, removeToast } = useApp();
  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-16 sm:bottom-6 right-6 z-50 space-y-2 max-w-sm w-full pointer-events-none">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          onClick={() => removeToast(toast.id)}
          className={`pointer-events-auto p-3.5 rounded-xl shadow-lg border text-xs flex items-start space-x-2.5 transition transform translate-y-0 cursor-pointer ${
            toast.type === 'success'
              ? 'bg-emerald-800 text-white border-emerald-700'
              : toast.type === 'error'
              ? 'bg-red-800 text-white border-red-700'
              : toast.type === 'warning'
              ? 'bg-amber-800 text-white border-amber-700'
              : 'bg-gray-900 text-white border-gray-800'
          }`}
        >
          <div className="flex-1">
            <div className="font-bold">{toast.title}</div>
            {toast.message && <div className="text-[11px] opacity-90 mt-0.5">{toast.message}</div>}
          </div>
        </div>
      ))}
    </div>
  );
};

const MainContent: React.FC = () => {
  const { activeTab, isLoading } = useApp();

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-4 border-amber-700 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs font-semibold text-slate-500">Connecting to NA Distributors Database...</p>
        </div>
      </div>
    );
  }

  return (
    <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full">
      {activeTab === 'dashboard' && <DashboardView />}
      {activeTab === 'inventory' && <InventoryView />}
      {activeTab === 'scanner' && <ScannerView />}
      {activeTab === 'customers' && <CustomersView />}
      {activeTab === 'orders' && <OrdersView />}
      {activeTab === 'delivery' && <DeliveryRoutePlanner />}
      {activeTab === 'reports' && <ReportsView />}
      {activeTab === 'users' && <UsersView />}
      {activeTab === 'notifications' && <NotificationsView />}
      {activeTab === 'accounting' && <AccountingView />}
    </main>
  );
};

const AuthenticatedApp: React.FC = () => {
  const { currentUser, isLoading: authLoading } = useAuth();

  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#070D18] flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs font-semibold text-slate-400">Loading NA Distributors Portal...</p>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return <LoginPage />;
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col text-slate-900 antialiased selection:bg-amber-200">
      <Navbar />
      <div className="flex flex-1">
        <Sidebar />
        <MainContent />
      </div>

      {/* Global Modals */}
      <NewOrderModal />
      <AddProductModal />
      <AddCustomerModal />
      <StockAdjustModal />
      <QuickRestockModal />
      <InvoiceModal />
      <BarcodePrintModal />

      {/* Toast notifications */}
      <ToastContainer />
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <AppProvider>
        <AuthenticatedApp />
      </AppProvider>
    </AuthProvider>
  );
}
