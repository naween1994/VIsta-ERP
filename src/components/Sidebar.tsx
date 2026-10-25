import React from 'react';
import { 
  LayoutDashboard, 
  Package, 
  QrCode, 
  Users, 
  Receipt, 
  Truck,
  BarChart3, 
  ShieldCheck, 
  BellRing, 
  Database,
  AlertCircle
} from 'lucide-react';
import { useApp, NavTab } from '../context/AppContext.tsx';

interface NavItem {
  id: NavTab;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: number;
}

export const Sidebar: React.FC = () => {
  const { activeTab, setActiveTab, products, unreadNotificationsCount } = useApp();

  const lowStockCount = products.filter((p) => p.stockOnHand <= p.reorderThreshold).length;

  const navItems: NavItem[] = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'inventory', label: 'Spice Inventory', icon: Package, badge: lowStockCount > 0 ? lowStockCount : undefined },
    { id: 'scanner', label: 'Barcode & QR Scanner', icon: QrCode },
    { id: 'customers', label: 'Customers & Accounts', icon: Users },
    { id: 'orders', label: 'Orders & Invoices', icon: Receipt },
    { id: 'delivery', label: 'Delivery Routes', icon: Truck },
    { id: 'reports', label: 'Reports & Analytics', icon: BarChart3 },
    { id: 'users', label: 'Users & Permissions', icon: ShieldCheck },
    { id: 'notifications', label: 'Alerts & Reminders', icon: BellRing, badge: unreadNotificationsCount > 0 ? unreadNotificationsCount : undefined },
    { id: 'accounting', label: 'Data & Accounting', icon: Database },
  ];

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex lg:flex-col w-64 bg-white border-r border-slate-200 min-h-[calc(100vh-4rem)] p-4 shrink-0">
        <div className="space-y-1">
          <p className="px-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
            Main Management
          </p>
          {navItems.slice(0, 6).map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition ${
                  isActive
                    ? 'bg-[#0B192C] text-white shadow-sm'
                    : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <Icon className={`w-4 h-4 ${isActive ? 'text-amber-400' : 'text-slate-500'}`} />
                  <span>{item.label}</span>
                </div>
                {item.badge !== undefined && (
                  <span
                    className={`px-1.5 py-0.5 rounded-full text-[10px] font-extrabold ${
                      isActive ? 'bg-amber-500 text-slate-950 font-black' : 'bg-amber-100 text-amber-900'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}

          <div className="pt-4 pb-1">
            <p className="px-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Administration & Integrations
            </p>
          </div>

          {navItems.slice(6).map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition ${
                  isActive
                    ? 'bg-[#0B192C] text-white shadow-sm'
                    : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <Icon className={`w-4 h-4 ${isActive ? 'text-amber-400' : 'text-slate-500'}`} />
                  <span>{item.label}</span>
                </div>
                {item.badge !== undefined && (
                  <span
                    className={`px-1.5 py-0.5 rounded-full text-[10px] font-extrabold ${
                      isActive ? 'bg-amber-500 text-slate-950 font-black' : 'bg-red-100 text-red-800'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Volume Discount Quick Guide in Sidebar */}
        <div className="mt-auto pt-6">
          <div className="p-3 bg-gradient-to-br from-[#0B192C]/5 to-[#163056]/10 rounded-xl border border-slate-200 text-[11px] text-slate-800">
            <div className="font-bold flex items-center space-x-1.5 mb-1.5 text-[#0B192C]">
              <span>Volume Discount Tiers</span>
            </div>
            <ul className="space-y-0.5 text-[10px] text-slate-600">
              <li>• Rs. 5K+ : 2% discount</li>
              <li>• Rs. 10K+ : 3% discount</li>
              <li>• Rs. 20K+ : 4% discount</li>
              <li>• Rs. 40K+ : 5% discount</li>
              <li>• Rs. 50K+ : 7% discount</li>
              <li>• Rs. 100K+ : 10% discount</li>
            </ul>
          </div>
        </div>
      </aside>

      {/* Mobile Bottom Navigation Bar */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-amber-200 px-2 py-1.5 flex justify-around items-center shadow-lg">
        {navItems.slice(0, 5).map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`flex flex-col items-center py-1 px-2 rounded-lg text-[10px] font-medium transition ${
                isActive ? 'text-amber-900 font-bold' : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              <div className="relative">
                <Icon className={`w-5 h-5 ${isActive ? 'text-amber-800' : 'text-gray-500'}`} />
                {item.badge !== undefined && (
                  <span className="absolute -top-1 -right-2 w-3.5 h-3.5 bg-red-600 text-white rounded-full text-[8px] flex items-center justify-center font-bold">
                    {item.badge}
                  </span>
                )}
              </div>
              <span className="truncate max-w-[64px] mt-0.5">{item.label.split(' ')[0]}</span>
            </button>
          );
        })}
        {/* Overflow "More" menu button on mobile */}
        <button
          onClick={() => setActiveTab('reports')}
          className={`flex flex-col items-center py-1 px-2 rounded-lg text-[10px] font-medium transition ${
            activeTab === 'reports' || activeTab === 'users' || activeTab === 'accounting' || activeTab === 'notifications'
              ? 'text-amber-900 font-bold'
              : 'text-gray-500 hover:text-gray-900'
          }`}
        >
          <BarChart3 className="w-5 h-5" />
          <span className="mt-0.5">More</span>
        </button>
      </nav>
    </>
  );
};
