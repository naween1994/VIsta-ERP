import React, { useState } from 'react';
import { 
  Bell, 
  Plus, 
  Sparkles, 
  ChevronDown, 
  Wifi, 
  WifiOff, 
  Barcode, 
  PackagePlus, 
  Receipt,
  LogOut,
  ShieldAlert
} from 'lucide-react';
import { useApp } from '../context/AppContext.tsx';
import { useAuth } from '../context/AuthContext.tsx';

export const Navbar: React.FC = () => {
  const { 
    setIsNewOrderModalOpen, 
    setIsAddProductModalOpen, 
    setActiveTab, 
    unreadNotificationsCount, 
    notifications, 
    markNotificationRead,
    isBackendConnected,
    isRealtimeActive,
    settings
  } = useApp();
  const { currentUser, logout } = useAuth();

  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isNotifMenuOpen, setIsNotifMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-xs">
      <div className="h-0.5 bg-gradient-to-r from-[#0B192C] via-[#163056] to-amber-600 w-full" />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand */}
          <div className="flex items-center space-x-3 cursor-pointer" onClick={() => setActiveTab('dashboard')}>
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#0B192C] to-[#163056] flex items-center justify-center text-amber-400 font-black text-xl shadow-md border border-slate-700">
              NA
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-extrabold text-slate-900 tracking-tight text-lg">NA Distributors</span>
                <span className="text-[10px] font-bold uppercase tracking-wider bg-[#0B192C] text-amber-300 px-2 py-0.5 rounded shadow-xs">
                  Enterprise
                </span>
              </div>
              <p className="text-[11px] text-slate-500 hidden sm:block">Spice Distribution & Inventory ERP</p>
            </div>
          </div>

          {/* Quick Actions Shortcuts */}
          <div className="hidden md:flex items-center space-x-2">
            <button
              onClick={() => setIsNewOrderModalOpen(true)}
              className="px-3 py-1.5 bg-gradient-to-r from-amber-700 to-amber-800 hover:from-amber-800 hover:to-amber-900 text-white rounded-lg text-xs font-bold flex items-center space-x-1.5 shadow-sm transition active:scale-95"
            >
              <Receipt className="w-3.5 h-3.5" />
              <span>+ New Order</span>
            </button>

            <button
              onClick={() => setIsAddProductModalOpen(true)}
              className="px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition active:scale-95"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>+ Add Spice</span>
            </button>

            <button
              onClick={() => setActiveTab('scanner')}
              className="px-3 py-1.5 bg-gray-50 hover:bg-gray-100 text-gray-700 border border-gray-300 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition active:scale-95"
            >
              <Barcode className="w-3.5 h-3.5 text-amber-700" />
              <span>Scanner</span>
            </button>
          </div>

          {/* Right side: Backend status, Notifications, User Switcher */}
          <div className="flex items-center space-x-3">
            {/* Realtime DB & Mongo connection badge */}
            <div
              onClick={() => setActiveTab('accounting')}
              title={
                isRealtimeActive
                  ? `Real-time synchronization active: ${settings?.mongoDbConnected ? 'Connected to MongoDB & Server' : 'Live server sync active'}`
                  : 'Connecting to live database stream...'
              }
              className={`hidden sm:flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border cursor-pointer transition ${
                isRealtimeActive
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
                  : 'bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100'
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${isRealtimeActive ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
              <span>{settings?.mongoDbConnected ? 'MongoDB Live' : 'Realtime Sync'}</span>
            </div>

            {/* Notifications Menu */}
            <div className="relative">
              <button
                onClick={() => setIsNotifMenuOpen(!isNotifMenuOpen)}
                className="relative p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition"
                aria-label="Notifications"
              >
                <Bell className="w-5 h-5" />
                {unreadNotificationsCount > 0 && (
                  <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-red-600 text-white text-[9px] font-extrabold flex items-center justify-center animate-bounce">
                    {unreadNotificationsCount > 9 ? '9+' : unreadNotificationsCount}
                  </span>
                )}
              </button>

              {isNotifMenuOpen && (
                <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-xl border border-gray-200 py-2 z-50">
                  <div className="px-4 py-2 border-b border-gray-100 flex items-center justify-between">
                    <span className="font-bold text-xs text-gray-900">Notifications</span>
                    <button
                      onClick={() => {
                        setIsNotifMenuOpen(false);
                        setActiveTab('notifications');
                      }}
                      className="text-[11px] text-amber-700 hover:text-amber-900 font-semibold"
                    >
                      View All
                    </button>
                  </div>
                  <div className="max-h-64 overflow-y-auto divide-y divide-gray-100">
                    {notifications.length === 0 ? (
                      <p className="p-4 text-center text-xs text-gray-400">No notifications yet</p>
                    ) : (
                      notifications.slice(0, 5).map((n) => (
                        <div
                          key={n.id}
                          onClick={() => {
                            markNotificationRead(n.id);
                            if (n.linkTab) setActiveTab(n.linkTab as any);
                            setIsNotifMenuOpen(false);
                          }}
                          className={`p-3 text-xs cursor-pointer hover:bg-amber-50/50 transition ${
                            !n.read ? 'bg-amber-50/30 font-medium' : 'text-gray-600'
                          }`}
                        >
                          <div className="font-semibold text-gray-900">{n.title}</div>
                          <div className="text-[11px] text-gray-600 line-clamp-2 mt-0.5">{n.message}</div>
                          <div className="text-[9px] text-gray-400 mt-1">
                            {new Date(n.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* User Switcher / Profile Badge */}
            <div className="relative">
              <button
                onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                className="flex items-center space-x-2 pl-2 pr-3 py-1.5 bg-[#0B192C]/5 hover:bg-[#0B192C]/10 border border-slate-300 rounded-xl transition"
              >
                <div className="w-7 h-7 rounded-lg bg-[#0B192C] text-amber-400 flex items-center justify-center text-xs font-bold shadow-xs">
                  {currentUser?.avatar || 'U'}
                </div>
                <div className="text-left hidden sm:block">
                  <div className="text-xs font-bold text-slate-900 leading-tight">
                    {currentUser?.name || 'User'}
                  </div>
                  <div className="text-[10px] text-[#163056] font-semibold capitalize">
                    {currentUser?.role.replace('_', ' ') || 'Staff'}
                  </div>
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
              </button>

              {isUserMenuOpen && (
                <div className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-xl border border-slate-200 py-2 z-50">
                  <div className="px-4 py-2 border-b border-slate-100">
                    <p className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">Current Account</p>
                    <p className="text-xs font-bold text-slate-900">{currentUser?.name}</p>
                    <p className="text-[11px] text-slate-500">{currentUser?.email}</p>
                    <span className="inline-block mt-1 text-[10px] font-bold uppercase bg-[#0B192C] text-amber-300 px-2 py-0.5 rounded">
                      Role: {currentUser?.role.replace('_', ' ')}
                    </span>
                  </div>


                  <div className="border-t border-slate-100 pt-1 space-y-0.5">
                    <button
                      onClick={() => {
                        setIsUserMenuOpen(false);
                        setActiveTab('users');
                      }}
                      className="w-full px-4 py-2 text-left text-xs text-slate-700 hover:bg-slate-50 flex items-center space-x-2"
                    >
                      <ShieldAlert className="w-3.5 h-3.5 text-slate-500" />
                      <span>Users & Permissions</span>
                    </button>
                    <button
                      onClick={() => {
                        setIsUserMenuOpen(false);
                        logout();
                      }}
                      className="w-full px-4 py-2 text-left text-xs text-red-600 hover:bg-red-50 flex items-center space-x-2 font-semibold"
                    >
                      <LogOut className="w-3.5 h-3.5 text-red-500" />
                      <span>Log Out & Lock Portal</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
