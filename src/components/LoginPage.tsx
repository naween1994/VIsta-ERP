import React, { useState } from 'react';
import { 
  Lock, 
  Mail, 
  Eye, 
  EyeOff, 
  Database, 
  CheckCircle2, 
  AlertCircle, 
  Layers, 
  ArrowRight,
  ShieldCheck,
  Server,
  Sparkles,
  Flame,
  Check
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.tsx';
import { api } from '../utils/api.ts';
import { User } from '../types/index.ts';

export const LoginPage: React.FC = () => {
  const { login, loginDirect, users } = useAuth();

  const [email, setEmail] = useState('naween@nadistributors.lk');
  const [password, setPassword] = useState('password123');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // MongoDB Init state in Login
  const [isMongoModalOpen, setIsMongoModalOpen] = useState(false);
  const [mongoUri, setMongoUri] = useState('mongodb+srv://admin:pass@cluster0.mongodb.net/na_distributors');
  const [isInitializingMongo, setIsInitializingMongo] = useState(false);
  const [mongoResult, setMongoResult] = useState<{
    success: boolean;
    message: string;
    databaseName?: string;
    collectionsCreated?: string[];
    indexesCreated?: string[];
    seededCounts?: { products: number; customers: number; orders: number; users: number };
  } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setIsSubmitting(true);
    try {
      await login(email, password);
    } catch (err: any) {
      setErrorMsg(err.message || 'Login failed. Please verify your email and password.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleQuickLogin = async (user: User) => {
    setEmail(user.email);
    setPassword('password123');
    setErrorMsg(null);
    setIsSubmitting(true);
    try {
      await login(user.email, 'password123');
    } catch {
      // Direct in-memory login fallback
      loginDirect(user);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInitMongo = async () => {
    setIsInitializingMongo(true);
    setMongoResult(null);
    try {
      const res = await api.initMongoDatabase(mongoUri, false);
      setMongoResult(res);
    } catch (err: any) {
      setMongoResult({
        success: false,
        message: err.message || 'Connection or initialization failed. Check your MongoDB connection string.',
      });
    } finally {
      setIsInitializingMongo(false);
    }
  };

  const spicesSummary = [
    { name: 'Chilli Powder', sizes: '100g, 50g' },
    { name: 'Curry Powder', sizes: '100g, 50g' },
    { name: 'Turmeric Powder', sizes: '100g, 50g, 25g' },
    { name: 'Pepper Powder', sizes: '100g, 50g, 25g' },
    { name: 'Roasted Chilli Powder', sizes: '100g, 50g' },
    { name: 'Roasted Curry Powder', sizes: '100g, 50g' },
    { name: 'Chilli Flakes', sizes: '100g, 50g' },
    { name: 'Coriander', sizes: '50g' },
  ];

  return (
    <div className="min-h-screen bg-[#070D18] flex flex-col justify-between text-slate-100 font-sans selection:bg-amber-500 selection:text-white relative overflow-hidden">
      {/* Background Dark Blue Gradients & Sri Lankan Spice Glow */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-blue-900/25 rounded-full blur-3xl" />
        <div className="absolute top-1/3 -right-32 w-80 h-80 bg-amber-600/15 rounded-full blur-3xl" />
        <div className="absolute -bottom-32 left-1/3 w-96 h-96 bg-blue-800/20 rounded-full blur-3xl" />
        {/* Subtle geometric grid */}
        <div 
          className="absolute inset-0 opacity-[0.03]" 
          style={{ backgroundImage: 'radial-gradient(#ffffff 1px, transparent 1px)', backgroundSize: '24px 24px' }} 
        />
      </div>

      {/* Top Bar with Enterprise Branding & MongoDB status */}
      <header className="relative z-10 border-b border-slate-800/80 bg-[#0B192C]/80 backdrop-blur-md px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-600 to-amber-500 flex items-center justify-center text-white font-black text-xl shadow-lg shadow-amber-900/30 border border-amber-400/30">
              NA
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-extrabold text-white tracking-tight text-lg">NA Distributors</span>
                <span className="text-[10px] font-bold uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded-full">
                  Ceylon Spices ERP
                </span>
              </div>
              <p className="text-[11px] text-slate-400">Direct Distribution</p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={() => setIsMongoModalOpen(true)}
              className="px-3 py-1.5 rounded-lg bg-[#0F223D] hover:bg-[#163056] border border-blue-500/30 text-blue-300 text-xs font-semibold flex items-center space-x-2 transition shadow-sm"
            >
              <Database className="w-3.5 h-3.5 text-blue-400" />
              <span>MongoDB Setup & Init</span>
            </button>
            <div className="hidden sm:flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-emerald-950/60 text-emerald-400 border border-emerald-800/50">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>API Gateway Online</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="relative z-10 flex-1 flex items-center justify-center p-4 sm:p-6 lg:p-8">
        <div className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          
          {/* Left Column: Enterprise Spice Catalog & Dist System Info */}
          <div className="lg:col-span-6 space-y-6">
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-blue-950/70 border border-blue-800/60 text-blue-300 text-xs font-medium">
              <Flame className="w-3.5 h-3.5 text-amber-500" />
              <span>Official 17 Ceylon Spice SKUs Preloaded</span>
            </div>

            <div className="space-y-2">
              <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight leading-tight">
                Distribution & Warehouse Inventory
              </h1>
              <p className="text-sm text-slate-300 leading-relaxed">
                Integrated wholesale sales order processing, barcode scanning, tiered volume discounts, and MongoDB cloud persistence for Sri Lanka&apos;s leading spice distributor.
              </p>
            </div>

            {/* Official Spice Catalog Card */}
            <div className="bg-[#0B192C]/90 border border-slate-800/90 rounded-2xl p-5 shadow-xl backdrop-blur-md space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <div className="flex items-center space-x-2">
                  <Layers className="w-4 h-4 text-amber-500" />
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-200">
                    Official Spice Categories & SKUs (17 Total)
                  </span>
                </div>
                <span className="text-[10px] font-bold text-amber-400 bg-amber-950/50 px-2 py-0.5 rounded border border-amber-800/40">
                  SL Barcodes 479...
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                {spicesSummary.map((sp, idx) => (
                  <div key={idx} className="p-2 rounded-lg bg-[#0F223D]/60 border border-slate-800 flex flex-col justify-between">
                    <span className="font-semibold text-slate-200 text-[11px] truncate">{sp.name}</span>
                    <span className="text-[10px] text-amber-400/90 font-mono mt-0.5">Sizes: {sp.sizes}</span>
                  </div>
                ))}
              </div>

              <div className="pt-1 flex items-center justify-between text-[11px] text-slate-400">
                <span>Tier Pricing: Retail (MRP) • Wholesale • Distributor</span>
                <span className="text-emerald-400 font-medium">✓ Volume Tiers (2% - 10%)</span>
              </div>
            </div>

            {/* Security badges */}
            <div className="flex items-center space-x-4 text-xs text-slate-400">
              <div className="flex items-center space-x-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>Role-Based Access Control</span>
              </div>
              <div className="flex items-center space-x-1.5">
                <Database className="w-4 h-4 text-blue-400" />
                <span>MongoDB / High-Speed Cache</span>
              </div>
            </div>
          </div>

          {/* Right Column: Sign In Card */}
          <div className="lg:col-span-6">
            <div className="bg-[#0B192C] border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-xl relative">
              <div className="mb-6 space-y-1">
                <h2 className="text-xl font-bold text-white tracking-tight">Sign In to Staff Portal</h2>
                <p className="text-xs text-slate-400">
                  Enter your assigned credentials or choose a role demo profile below.
                </p>
              </div>

              {errorMsg && (
                <div className="mb-4 p-3.5 rounded-xl bg-red-950/50 border border-red-800/80 text-red-300 text-xs flex items-center space-x-2">
                  <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {/* Login Form */}
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Staff Email Address
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="e.g. naween@nadistributors.lk"
                      className="w-full pl-10 pr-4 py-2.5 bg-[#070D18] border border-slate-700/80 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 transition"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-semibold text-slate-300">
                      Password
                    </label>
                    <span className="text-[10px] text-slate-500">Default demo: password123</span>
                  </div>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••••••"
                      className="w-full pl-10 pr-10 py-2.5 bg-[#070D18] border border-slate-700/80 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 transition font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-white font-bold text-xs shadow-lg shadow-amber-900/30 flex items-center justify-center space-x-2 transition transform active:scale-[0.98] disabled:opacity-50 cursor-pointer"
                >
                  {isSubmitting ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <span>Sign In to ERP Portal</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>

              {/* Quick Login Profiles */}
              <div className="mt-6 pt-5 border-t border-slate-800">
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2.5">
                  1-Click Demo Profiles
                </p>
                <div className="space-y-2">
                  {users.slice(0, 3).map((u) => (
                    <button
                      key={u.id}
                      type="button"
                      onClick={() => handleQuickLogin(u)}
                      className="w-full p-2.5 rounded-xl bg-[#0F223D]/70 hover:bg-[#163056] border border-slate-700/80 text-left flex items-center justify-between transition group"
                    >
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-blue-700 to-blue-500 text-white flex items-center justify-center font-bold text-xs shadow-sm group-hover:from-amber-600 group-hover:to-amber-500 transition">
                          {u.avatar || u.name.substring(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <div className="text-xs font-bold text-white leading-snug">{u.name}</div>
                          <div className="text-[10px] text-amber-400 font-medium capitalize">
                            {u.role.replace('_', ' ')}
                          </div>
                        </div>
                      </div>
                      <span className="text-[10px] text-slate-400 group-hover:text-white font-medium flex items-center space-x-1">
                        <span>Sign In</span>
                        <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition" />
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Quick MongoDB Status Footnote */}
              <div className="mt-4 pt-3 flex items-center justify-between text-[11px] text-slate-400">
                <span>Database: MongoDB Ready</span>
                <button
                  type="button"
                  onClick={() => setIsMongoModalOpen(true)}
                  className="text-blue-400 hover:text-blue-300 font-semibold underline underline-offset-2"
                >
                  Configure / Init Database
                </button>
              </div>
            </div>
          </div>

        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t border-slate-800/80 bg-[#070D18]/90 py-4 px-6 text-center text-[11px] text-slate-500">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>© 2026 NA Distributors (Pvt) Ltd. All Rights Reserved. Colombo, Sri Lanka.</span>
          <div className="flex items-center space-x-3">
            <span>Official Sri Lanka Spice Barcodes Standard</span>
            <span>•</span>
            <span className="text-amber-500">Pure Ceylon Spices</span>
          </div>
        </div>
      </footer>

      {/* MongoDB Database Initializer Modal */}
      {isMongoModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="bg-[#0B192C] border border-slate-700 rounded-2xl w-full max-w-xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center space-x-2.5">
                <div className="w-9 h-9 rounded-xl bg-blue-600/20 text-blue-400 border border-blue-500/30 flex items-center justify-center">
                  <Database className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Initialize MongoDB Database</h3>
                  <p className="text-xs text-slate-400">
                    Provision collections, create indexes, and seed the 17 official spice SKUs
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsMongoModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  MongoDB Connection URI
                </label>
                <input
                  type="text"
                  value={mongoUri}
                  onChange={(e) => setMongoUri(e.target.value)}
                  placeholder="mongodb+srv://<username>:<password>@cluster.mongodb.net/na_distributors"
                  className="w-full px-3.5 py-2.5 bg-[#070D18] border border-slate-700 rounded-xl text-xs text-slate-200 font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-[10px] text-slate-500 mt-1">
                  Leave default or provide your MongoDB Atlas / local connection string.
                </p>
              </div>

              <div className="p-3.5 bg-[#0F223D]/60 rounded-xl border border-slate-800 space-y-2 text-xs">
                <span className="font-bold text-slate-200">What initialization does:</span>
                <ul className="space-y-1 text-slate-300 text-[11px]">
                  <li className="flex items-center space-x-1.5">
                    <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span>Creates collections: <code className="text-amber-400">products</code>, <code className="text-amber-400">customers</code>, <code className="text-amber-400">orders</code>, <code className="text-amber-400">users</code>, <code className="text-amber-400">settings</code></span>
                  </li>
                  <li className="flex items-center space-x-1.5">
                    <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span>Builds unique barcode & SKU indexes for instant barcode scanner lookups</span>
                  </li>
                  <li className="flex items-center space-x-1.5">
                    <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span>Seeds all 17 official Ceylon spice products with barcodes and pricing</span>
                  </li>
                </ul>
              </div>

              {mongoResult && (
                <div
                  className={`p-3.5 rounded-xl border text-xs ${
                    mongoResult.success
                      ? 'bg-emerald-950/60 border-emerald-800 text-emerald-200'
                      : 'bg-red-950/60 border-red-800 text-red-200'
                  }`}
                >
                  <div className="font-bold flex items-center space-x-1.5">
                    {mongoResult.success ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-red-400" />
                    )}
                    <span>{mongoResult.success ? 'MongoDB Initialized' : 'Initialization Error'}</span>
                  </div>
                  <p className="mt-1 text-[11px] leading-relaxed">{mongoResult.message}</p>
                  {mongoResult.seededCounts && (
                    <div className="mt-2 pt-2 border-t border-emerald-800/40 grid grid-cols-4 gap-2 text-[10px] text-center font-semibold">
                      <div className="p-1 rounded bg-emerald-900/40">
                        {mongoResult.seededCounts.products} Spices
                      </div>
                      <div className="p-1 rounded bg-emerald-900/40">
                        {mongoResult.seededCounts.customers} Customers
                      </div>
                      <div className="p-1 rounded bg-emerald-900/40">
                        {mongoResult.seededCounts.orders} Orders
                      </div>
                      <div className="p-1 rounded bg-emerald-900/40">
                        {mongoResult.seededCounts.users} Users
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="pt-2 flex items-center justify-end space-x-2">
              <button
                type="button"
                onClick={() => setIsMongoModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition"
              >
                Close
              </button>
              <button
                type="button"
                onClick={handleInitMongo}
                disabled={isInitializingMongo}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white text-xs font-bold flex items-center space-x-1.5 shadow-md shadow-blue-900/40 transition disabled:opacity-50 cursor-pointer"
              >
                {isInitializingMongo ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Initializing Collections...</span>
                  </>
                ) : (
                  <>
                    <Database className="w-3.5 h-3.5" />
                    <span>⚡ Run MongoDB Initialization</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
