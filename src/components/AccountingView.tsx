import React, { useState } from 'react';
import { 
  Database, 
  Download, 
  RotateCw, 
  Smartphone, 
  QrCode, 
  Server, 
  FileJson, 
  FileSpreadsheet, 
  CheckCircle2, 
  AlertCircle,
  Copy,
  ExternalLink
} from 'lucide-react';
import { useApp } from '../context/AppContext.tsx';
import { useAuth } from '../context/AuthContext.tsx';
import { api } from '../utils/api.ts';
import { generateQrCodeSvg } from '../utils/barcode.ts';

export const AccountingView: React.FC = () => {
  const { accountingLogs, simulateAccountingSync, settings, updateSettings, addToast, refreshData } = useApp();
  const { currentUser } = useAuth();

  const [isSyncing, setIsSyncing] = useState(false);
  const [mongoUri, setMongoUri] = useState(settings?.mongoDbUri || 'mongodb+srv://admin:pass@cluster0.mongodb.net/na_distributors');
  const [isTestingMongo, setIsTestingMongo] = useState(false);
  const [mongoStatusMsg, setMongoStatusMsg] = useState<{ text: string; isError: boolean } | null>(null);

  // Mobile App Configuration
  const [backendUrl, setBackendUrl] = useState(window.location.origin);
  const [isCopied, setIsCopied] = useState(false);

  const handleSimulateSync = async (target: 'QuickBooks' | 'Xero') => {
    try {
      setIsSyncing(true);
      await simulateAccountingSync(target);
    } catch (err: any) {
      addToast({ type: 'error', title: 'Sync Error', message: err.message });
    } finally {
      setIsSyncing(false);
    }
  };

  const handleTestMongo = async () => {
    try {
      setIsTestingMongo(true);
      setMongoStatusMsg(null);
      const res = await api.testMongoConnection(mongoUri);
      if (res.success) {
        setMongoStatusMsg({ text: res.message, isError: false });
        addToast({ type: 'success', title: 'MongoDB Online', message: 'Database connection verified' });
      } else {
        setMongoStatusMsg({ text: res.message, isError: true });
      }
    } catch (err: any) {
      setMongoStatusMsg({ text: err.message || 'Connection test failed', isError: true });
    } finally {
      setIsTestingMongo(false);
    }
  };

  const handleDisconnectMongo = async () => {
    try {
      await api.disconnectMongo();
      setMongoStatusMsg({ text: 'MongoDB disconnected. Active mode: In-Memory + Disk store.', isError: false });
      addToast({ type: 'info', title: 'MongoDB Disconnected', message: 'Switched to local database' });
    } catch (err: any) {
      addToast({ type: 'error', title: 'Error', message: err.message });
    }
  };

  const handleCopyUrl = () => {
    navigator.clipboard.writeText(backendUrl);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
    addToast({ type: 'info', title: 'Copied', message: 'URL copied to clipboard' });
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-gray-200 shadow-xs">
        <div>
          <h1 className="text-xl font-black text-gray-900 tracking-tight flex items-center space-x-2">
            <span>Accounting Connections & Mobile Deployment</span>
            <span className="text-xs bg-amber-100 text-amber-900 font-bold px-2 py-0.5 rounded-full">
              ERP Bridges
            </span>
          </h1>
          <p className="text-xs text-gray-500 mt-1">
            Export standardized ledger feeds for QuickBooks and Xero, configure MongoDB clustering, and access mobile PWA/APK.
          </p>
        </div>
      </div>

      {/* Grid: Accounting Integration & MongoDB Connection */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Accounting Bridges (QuickBooks & Xero) */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-xs p-6 space-y-5">
          <div className="flex items-center space-x-2 border-b border-gray-100 pb-3">
            <div className="p-2 bg-emerald-100 text-emerald-800 rounded-lg">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-gray-900">General Ledger & Accounting Sync</h3>
              <p className="text-[11px] text-gray-500">QuickBooks Online & Xero compatibility exports</p>
            </div>
          </div>

          <p className="text-xs text-gray-600 leading-relaxed">
            Generate standardized export batches mapping NA Distributors invoice sales, customer accounts,
            and spice line items into your general ledger software.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* QuickBooks */}
            <div className="p-4 bg-gray-50 rounded-xl border border-gray-200 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="font-bold text-xs text-emerald-800">QuickBooks Online</span>
                  <FileJson className="w-4 h-4 text-emerald-700" />
                </div>
                <p className="text-[11px] text-gray-500">
                  Full nested sales batch JSON with customer reference IDs and line item amounts.
                </p>
              </div>

              <div className="mt-4 space-y-1.5">
                <a
                  href="/api/accounting/export/quickbooks"
                  download="quickbooks_na_distributors.json"
                  className="w-full py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-semibold flex items-center justify-center space-x-1 transition shadow-xs"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download JSON</span>
                </a>

                <button
                  type="button"
                  disabled={isSyncing}
                  onClick={() => handleSimulateSync('QuickBooks')}
                  className="w-full py-1.5 bg-white border border-gray-300 hover:bg-gray-100 text-gray-700 rounded-lg text-xs font-semibold flex items-center justify-center space-x-1 transition"
                >
                  <RotateCw className={`w-3 h-3 ${isSyncing ? 'animate-spin' : ''}`} />
                  <span>Simulate Sync</span>
                </button>
              </div>
            </div>

            {/* Xero */}
            <div className="p-4 bg-gray-50 rounded-xl border border-gray-200 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="font-bold text-xs text-blue-800">Xero Accounting</span>
                  <FileSpreadsheet className="w-4 h-4 text-blue-700" />
                </div>
                <p className="text-[11px] text-gray-500">
                  Official Xero Sales Invoice CSV import format matching chart-of-accounts #200.
                </p>
              </div>

              <div className="mt-4 space-y-1.5">
                <a
                  href="/api/accounting/export/xero"
                  download="xero_sales_na_distributors.csv"
                  className="w-full py-1.5 bg-blue-700 hover:bg-blue-800 text-white rounded-lg text-xs font-semibold flex items-center justify-center space-x-1 transition shadow-xs"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download CSV</span>
                </a>

                <button
                  type="button"
                  disabled={isSyncing}
                  onClick={() => handleSimulateSync('Xero')}
                  className="w-full py-1.5 bg-white border border-gray-300 hover:bg-gray-100 text-gray-700 rounded-lg text-xs font-semibold flex items-center justify-center space-x-1 transition"
                >
                  <RotateCw className={`w-3 h-3 ${isSyncing ? 'animate-spin' : ''}`} />
                  <span>Simulate Sync</span>
                </button>
              </div>
            </div>
          </div>

          {/* Sync History Audit Log */}
          <div>
            <h4 className="text-xs font-bold text-gray-800 uppercase tracking-wider mb-2">
              Recent Sync Audit History ({accountingLogs.length})
            </h4>
            {accountingLogs.length === 0 ? (
              <p className="p-4 text-center text-xs text-gray-400 bg-gray-50 rounded-xl border">
                No sync batches run yet. Click 'Simulate Sync' to test ledger transmission.
              </p>
            ) : (
              <div className="border border-gray-200 rounded-xl overflow-hidden max-h-48 overflow-y-auto">
                <table className="min-w-full divide-y divide-gray-100 text-[11px]">
                  <thead className="bg-gray-50 font-bold uppercase text-gray-600">
                    <tr>
                      <th className="px-3 py-2 text-left">Platform</th>
                      <th className="px-3 py-2 text-left">Timestamp</th>
                      <th className="px-3 py-2 text-right">Records</th>
                      <th className="px-3 py-2 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {accountingLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-gray-50">
                        <td className="px-3 py-2 font-bold text-gray-900">{log.target}</td>
                        <td className="px-3 py-2 text-gray-500 font-mono">
                          {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </td>
                        <td className="px-3 py-2 text-right font-mono font-bold">{log.recordsSynced}</td>
                        <td className="px-3 py-2 text-center">
                          <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-100 text-emerald-800">
                            {log.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* MongoDB Database Connection & Clustering */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-xs p-6 space-y-5">
          <div className="flex items-center space-x-2 border-b border-gray-100 pb-3">
            <div className="p-2 bg-purple-100 text-purple-800 rounded-lg">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-gray-900">MongoDB Database Integration</h3>
              <p className="text-[11px] text-gray-500">Official MongoDB driver with dual-mode cloud replication and local fallback</p>
            </div>
          </div>

          <div
            className={`p-4 rounded-xl border flex items-center justify-between text-xs ${
              settings?.mongoDbConnected
                ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                : 'bg-amber-50 border-amber-200 text-amber-900'
            }`}
          >
            <div>
              <div className="font-bold text-sm flex items-center space-x-2">
                <span>Status: {settings?.mongoDbConnected ? 'MongoDB Cloud Cluster Online' : 'Local High-Speed Storage Active'}</span>
                {settings?.mongoDbConnected && (
                  <span className="text-[10px] bg-emerald-200 text-emerald-900 px-2 py-0.5 rounded-full font-bold">
                    Connected
                  </span>
                )}
              </div>
              <div className="text-[11px] opacity-80 mt-0.5">
                {settings?.mongoDbConnected
                  ? 'Real-time MongoDB driver connection verified. Collections: products, customers, orders, stock_adjustments.'
                  : 'Standalone persistent disk store active (/data/db.json). Zero external dependency required.'}
              </div>
            </div>

            <span
              className={`w-3.5 h-3.5 rounded-full ${
                settings?.mongoDbConnected ? 'bg-emerald-500 animate-pulse ring-4 ring-emerald-200' : 'bg-amber-500'
              }`}
            />
          </div>

          <div className="space-y-3">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  MongoDB Connection String (URI)
                </label>
                <span className="text-[10px] text-gray-400 font-mono">MONGODB_URI</span>
              </div>
              <input
                type="text"
                value={mongoUri}
                onChange={(e) => setMongoUri(e.target.value)}
                placeholder="mongodb+srv://user:password@cluster0.mongodb.net/na_distributors"
                className="w-full px-3 py-2 border border-gray-300 rounded-xl text-xs font-mono focus:ring-2 focus:ring-amber-500 outline-hidden"
              />
              <p className="text-[10px] text-gray-400 mt-1">
                Enter your MongoDB Atlas cluster URI or configure <code>MONGODB_URI</code> in <code>.env</code>.
              </p>
            </div>

            {mongoStatusMsg && (
              <div
                className={`p-3 rounded-xl text-xs font-medium flex items-start space-x-2 ${
                  mongoStatusMsg.isError
                    ? 'bg-red-50 text-red-700 border border-red-200'
                    : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                }`}
              >
                {mongoStatusMsg.isError ? (
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-600" />
                ) : (
                  <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600" />
                )}
                <span>{mongoStatusMsg.text}</span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <button
                type="button"
                onClick={handleTestMongo}
                disabled={isTestingMongo}
                className="py-2 px-3 bg-[#0B192C] hover:bg-[#163056] text-white rounded-xl text-xs font-bold transition flex items-center justify-center space-x-1.5 shadow-xs disabled:opacity-50"
              >
                <Server className="w-4 h-4 text-blue-300" />
                <span>{isTestingMongo ? 'Testing...' : 'Test Connection'}</span>
              </button>

              <button
                type="button"
                disabled={isTestingMongo}
                onClick={async () => {
                  try {
                    setIsTestingMongo(true);
                    setMongoStatusMsg(null);
                    const res = await api.initMongoDatabase(mongoUri, false);
                    if (res.success) {
                      setMongoStatusMsg({ text: res.message, isError: false });
                      addToast({ type: 'success', title: 'MongoDB Initialized', message: `${res.databaseName} collections & indexes ready` });
                      await refreshData();
                    } else {
                      setMongoStatusMsg({ text: res.message, isError: true });
                    }
                  } catch (err: any) {
                    setMongoStatusMsg({ text: err.message || 'Initialization failed', isError: true });
                  } finally {
                    setIsTestingMongo(false);
                  }
                }}
                className="py-2 px-3 bg-gradient-to-r from-blue-700 to-blue-900 hover:from-blue-800 hover:to-blue-950 text-white rounded-xl text-xs font-bold transition flex items-center justify-center space-x-1.5 shadow-xs disabled:opacity-50"
              >
                <Database className="w-4 h-4 text-amber-400" />
                <span>⚡ Initialize DB in MongoDB</span>
              </button>

              <button
                type="button"
                disabled={isTestingMongo}
                onClick={async () => {
                  try {
                    setIsTestingMongo(true);
                    setMongoStatusMsg(null);
                    const res = await api.syncToMongo(mongoUri);
                    if (res.success) {
                      setMongoStatusMsg({ text: res.message, isError: false });
                      addToast({ type: 'success', title: 'MongoDB Synchronized', message: 'All products & orders uploaded' });
                    } else {
                      setMongoStatusMsg({ text: res.message, isError: true });
                    }
                  } catch (err: any) {
                    setMongoStatusMsg({ text: err.message || 'Sync failed', isError: true });
                  } finally {
                    setIsTestingMongo(false);
                  }
                }}
                className="py-2 px-3 bg-amber-700 hover:bg-amber-800 text-white rounded-xl text-xs font-bold transition flex items-center justify-center space-x-1.5 shadow-xs disabled:opacity-50"
              >
                <RotateCw className={`w-3.5 h-3.5 ${isTestingMongo ? 'animate-spin' : ''}`} />
                <span>Push Data to MongoDB</span>
              </button>
            </div>

            <div className="flex space-x-2">
              <button
                type="button"
                disabled={isTestingMongo}
                onClick={async () => {
                  try {
                    setIsTestingMongo(true);
                    setMongoStatusMsg(null);
                    const res = await api.fetchFromMongo(mongoUri);
                    if (res.success) {
                      setMongoStatusMsg({ text: res.message, isError: false });
                      addToast({ type: 'success', title: 'Data Fetched', message: 'Loaded products from MongoDB' });
                      window.location.reload();
                    } else {
                      setMongoStatusMsg({ text: res.message, isError: true });
                    }
                  } catch (err: any) {
                    setMongoStatusMsg({ text: err.message || 'Fetch failed', isError: true });
                  } finally {
                    setIsTestingMongo(false);
                  }
                }}
                className="flex-1 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-xl text-xs font-semibold transition"
              >
                Pull Data from MongoDB
              </button>

              {settings?.mongoDbConnected && (
                <button
                  type="button"
                  onClick={handleDisconnectMongo}
                  className="px-4 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-semibold transition"
                >
                  Disconnect
                </button>
              )}
            </div>
          </div>

          <div className="p-3 bg-gray-50 rounded-xl border border-gray-200 text-[11px] text-gray-600 space-y-1">
            <strong className="text-gray-800">MongoDB Architecture Highlights:</strong>
            <ul className="list-disc list-inside space-y-0.5 text-gray-600">
              <li>Configurable with MongoDB Atlas, Docker MongoDB, or local instances.</li>
              <li>Dual-mode persistence: cloud cluster storage with seamless local fallback to disk storage.</li>
              <li>Auto-syncs 17 official spice products, distributor tiers, order calculations, and stock adjustments.</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Mobile Support, PWA, QR Code & APK Build Instructions */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-xs p-6 space-y-6">
        <div className="flex items-center space-x-2 border-b border-gray-100 pb-3">
          <div className="p-2 bg-blue-100 text-blue-800 rounded-lg">
            <Smartphone className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-gray-900">Mobile Support & Android APK Build Guide</h3>
            <p className="text-[11px] text-gray-500">
              Run on smartphones, install as Progressive Web App (PWA), or wrap for Android APK
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
          {/* QR Code to scan on mobile device */}
          <div className="flex flex-col items-center justify-center p-4 bg-gray-50 rounded-2xl border border-gray-200 text-center">
            <div
              className="p-3 bg-white border border-gray-200 rounded-xl shadow-xs"
              dangerouslySetInnerHTML={{
                __html: generateQrCodeSvg(backendUrl, 160),
              }}
            />
            <p className="text-xs font-bold text-gray-900 mt-3">Scan with Phone Camera</p>
            <p className="text-[10px] text-gray-500 max-w-[200px] mt-0.5">
              Instantly opens NA Distributors on your mobile device browser.
            </p>
          </div>

          {/* Configurable backend URL & PWA Installation */}
          <div className="md:col-span-2 space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                Configurable Backend Server URL
              </label>
              <div className="flex space-x-2">
                <input
                  type="text"
                  value={backendUrl}
                  onChange={(e) => setBackendUrl(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-xl text-xs font-mono focus:ring-2 focus:ring-amber-500 outline-hidden"
                />
                <button
                  type="button"
                  onClick={handleCopyUrl}
                  className="px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-semibold flex items-center space-x-1 shrink-0 transition"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>{isCopied ? 'Copied!' : 'Copy'}</span>
                </button>
              </div>
              <p className="text-[11px] text-gray-500 mt-1">
                Mobile clients and barcode scanners query this API root for real-time inventory updates.
              </p>
            </div>

            {/* Android APK Build Instructions */}
            <div className="p-4 bg-gray-900 text-gray-100 rounded-xl font-mono text-xs space-y-2">
              <div className="flex items-center justify-between text-amber-400 font-sans font-bold text-xs">
                <span>Android APK Packaging Commands (Capacitor wrapper)</span>
                <span className="text-[10px] text-gray-400">Terminal</span>
              </div>
              <div className="space-y-1 text-gray-300 text-[11px]">
                <p>1. npm run build</p>
                <p>2. npx @capacitor/cli create "NA Distributors" com.nadistributors.app</p>
                <p>3. npx cap add android</p>
                <p>4. npx cap sync android</p>
                <p>5. npx cap open android &gt; Build &gt; Generate Signed Bundle / APK</p>
              </div>
            </div>

            <div className="flex items-center space-x-4 text-xs text-gray-600">
              <span className="flex items-center space-x-1.5 font-medium text-emerald-800">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>PWA Manifest Registered</span>
              </span>
              <span className="flex items-center space-x-1.5 font-medium text-emerald-800">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Mobile Responsive Viewports</span>
              </span>
              <span className="flex items-center space-x-1.5 font-medium text-emerald-800">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Offline Cache Resilience</span>
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
