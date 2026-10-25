import React, { useState, useEffect } from 'react';
import { 
  BarChart3, 
  Download, 
  Printer, 
  Calendar, 
  TrendingUp, 
  DollarSign, 
  PieChart, 
  Receipt,
  Clock,
  ArrowUpRight,
  Filter
} from 'lucide-react';
import { useApp } from '../context/AppContext.tsx';
import { api } from '../utils/api.ts';

type RangePreset = '7d' | '30d' | '90d' | 'all' | 'custom';

export const ReportsView: React.FC = () => {
  const { products, orders, customers } = useApp();

  const [rangePreset, setRangePreset] = useState<RangePreset>('30d');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [reportData, setReportData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [activeReportTab, setActiveReportTab] = useState<'overview' | 'bestsellers' | 'customers' | 'margins'>('overview');

  const fetchReport = async () => {
    try {
      setIsLoading(true);
      const data = await api.getReportSummary(rangePreset, startDate, endDate);
      setReportData(data);
    } catch (err) {
      console.error('Failed to load report:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, [rangePreset, startDate, endDate, orders, products]);

  const handleExportCsv = () => {
    if (!reportData || !reportData.topProducts) return;
    const headers = ['Metric', 'Value'];
    const rows = [
      ['DateRange', rangePreset],
      ['TotalOrders', reportData.summary.totalOrders],
      ['TotalRevenue_LKR', reportData.summary.totalRevenue],
      ['CostOfGoodsSold_LKR', reportData.summary.totalCogs],
      ['GrossProfit_LKR', reportData.summary.grossProfit],
      ['ProfitMargin_Pct', `${reportData.summary.profitMarginPercent}%`],
      ['CollectedPayments_LKR', reportData.summary.totalCollected],
      ['OutstandingBalance_LKR', reportData.summary.totalOutstanding],
      ['InventoryCostValuation_LKR', reportData.summary.totalInventoryCostValue],
      ['CatalogProductCount', reportData.summary.totalProductCount],
    ];

    const csvContent = headers.join(',') + '\n' + rows.map((r) => r.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `financial_report_${rangePreset}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrintStatement = () => {
    window.print();
  };

  const summary = reportData?.summary || {
    totalOrders: 0,
    totalRevenue: 0,
    totalCogs: 0,
    grossProfit: 0,
    profitMarginPercent: 0,
    totalCollected: 0,
    totalOutstanding: 0,
    totalInventoryCostValue: 0,
    totalProductCount: 0,
    lowStockCount: 0,
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header - Hidden in Print */}
      <div className="print:hidden flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-gray-200 shadow-xs">
        <div>
          <h1 className="text-xl font-black text-gray-900 tracking-tight flex items-center space-x-2">
            <span>Financial Reporting & Analytics</span>
            <span className="text-xs bg-amber-100 text-amber-900 font-bold px-2 py-0.5 rounded-full">
              P&L Auditing
            </span>
          </h1>
          <p className="text-xs text-gray-500 mt-1">
            Revenue, COGS, gross margin profitability, trade account receivables, and best-selling spices.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={handleExportCsv}
            className="px-3.5 py-2 bg-gray-50 hover:bg-gray-100 text-gray-700 border border-gray-300 rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition"
          >
            <Download className="w-4 h-4" />
            <span>Export CSV</span>
          </button>

          <button
            onClick={handlePrintStatement}
            className="px-4 py-2 bg-amber-700 hover:bg-amber-800 text-white rounded-xl text-xs font-bold flex items-center space-x-1.5 shadow-sm transition"
          >
            <Printer className="w-4 h-4" />
            <span>Generate Statement</span>
          </button>
        </div>
      </div>

      {/* Date Range Selector Toolbar - Hidden in Print */}
      <div className="print:hidden bg-white p-4 rounded-2xl border border-gray-200 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center space-x-1 bg-gray-100 p-1 rounded-xl text-xs font-bold">
          {(['7d', '30d', '90d', 'all', 'custom'] as RangePreset[]).map((preset) => (
            <button
              key={preset}
              onClick={() => setRangePreset(preset)}
              className={`px-3 py-1.5 rounded-lg transition uppercase tracking-wider ${
                rangePreset === preset
                  ? 'bg-amber-800 text-white shadow-xs'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200/60'
              }`}
            >
              {preset === '7d'
                ? 'Last 7 Days'
                : preset === '30d'
                ? 'Last 30 Days'
                : preset === '90d'
                ? 'Last 90 Days'
                : preset === 'all'
                ? 'All-Time'
                : 'Custom'}
            </button>
          ))}
        </div>

        {rangePreset === 'custom' && (
          <div className="flex items-center space-x-2 text-xs">
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="px-2.5 py-1.5 border border-gray-300 rounded-lg"
            />
            <span className="text-gray-400">to</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="px-2.5 py-1.5 border border-gray-300 rounded-lg"
            />
          </div>
        )}
      </div>

      {/* Printable Monthly Statement Header (Shown during print) */}
      <div className="hidden print:block p-4 border-b-2 border-amber-900 mb-6">
        <h1 className="text-2xl font-black text-amber-950 uppercase">NA Distributors</h1>
        <h2 className="text-sm font-bold text-gray-700">Monthly Financial Statement & Performance Audit</h2>
        <p className="text-xs text-gray-500">
          Generated on {new Date().toLocaleDateString()} | Preset Range: {rangePreset.toUpperCase()}
        </p>
      </div>

      {/* Financial KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Revenue */}
        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs">
          <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Gross Sales Revenue</div>
          <div className="text-2xl font-black text-gray-900 font-mono mt-1">
            Rs. {summary.totalRevenue.toLocaleString('en-LK', { minimumFractionDigits: 2 })}
          </div>
          <div className="text-[11px] text-gray-400 mt-1">{summary.totalOrders} completed orders</div>
        </div>

        {/* COGS */}
        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs">
          <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Cost of Goods Sold (COGS)</div>
          <div className="text-2xl font-black text-gray-700 font-mono mt-1">
            Rs. {summary.totalCogs.toLocaleString('en-LK', { minimumFractionDigits: 2 })}
          </div>
          <div className="text-[11px] text-gray-400 mt-1">Direct spice procurement cost</div>
        </div>

        {/* Gross Profit & Margin */}
        <div className="bg-gradient-to-br from-amber-50 to-orange-50/70 p-5 rounded-2xl border border-amber-200 shadow-xs">
          <div className="text-xs font-bold text-amber-900 uppercase tracking-wider">
            Gross Profit ({summary.profitMarginPercent}%)
          </div>
          <div className="text-2xl font-black text-amber-950 font-mono mt-1">
            Rs. {summary.grossProfit.toLocaleString('en-LK', { minimumFractionDigits: 2 })}
          </div>
          <div className="text-[11px] text-amber-800 mt-1 font-medium">
            Margin: {summary.profitMarginPercent}% on net sales
          </div>
        </div>

        {/* Receivables & Outstanding */}
        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs">
          <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Receivables & Balances</div>
          <div className="text-2xl font-black text-orange-900 font-mono mt-1">
            Rs. {summary.totalOutstanding.toLocaleString('en-LK', { minimumFractionDigits: 2 })}
          </div>
          <div className="text-[11px] text-emerald-700 mt-1 font-medium">
            Collected: Rs. {summary.totalCollected.toLocaleString()}
          </div>
        </div>
      </div>

      {/* Sub-report Tabs - Hidden in Print */}
      <div className="print:hidden flex space-x-2 border-b border-gray-200 pb-2">
        <button
          onClick={() => setActiveReportTab('overview')}
          className={`px-4 py-2 text-xs font-bold rounded-xl transition ${
            activeReportTab === 'overview'
              ? 'bg-amber-800 text-white shadow-xs'
              : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          Product Margin Matrix
        </button>
        <button
          onClick={() => setActiveReportTab('bestsellers')}
          className={`px-4 py-2 text-xs font-bold rounded-xl transition ${
            activeReportTab === 'bestsellers'
              ? 'bg-amber-800 text-white shadow-xs'
              : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          Top Selling Spices
        </button>
        <button
          onClick={() => setActiveReportTab('customers')}
          className={`px-4 py-2 text-xs font-bold rounded-xl transition ${
            activeReportTab === 'customers'
              ? 'bg-amber-800 text-white shadow-xs'
              : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          Customer Spend Breakdown
        </button>
      </div>

      {/* Active Tab Content */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden">
        {activeReportTab === 'overview' && (
          <div>
            <div className="p-4 bg-gray-50 border-b border-gray-200 flex justify-between items-center">
              <h3 className="font-bold text-xs uppercase tracking-wider text-gray-800">
                Catalog Product Margin Matrix (Cost vs. Multi-Tier Markup)
              </h3>
              <span className="text-xs text-gray-500">{products.length} Products audited</span>
            </div>

            {products.length === 0 ? (
              <p className="p-8 text-center text-xs text-gray-400">Inventory is currently empty.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 text-xs">
                  <thead className="bg-gray-100 font-bold uppercase text-gray-700">
                    <tr>
                      <th className="px-4 py-3 text-left">Spice & SKU</th>
                      <th className="px-4 py-3 text-right">Cost (LKR)</th>
                      <th className="px-4 py-3 text-right">Distributor (LKR)</th>
                      <th className="px-4 py-3 text-right">Dist Margin %</th>
                      <th className="px-4 py-3 text-right">Wholesale (LKR)</th>
                      <th className="px-4 py-3 text-right">MRP (LKR)</th>
                      <th className="px-4 py-3 text-right">Total Inventory Value</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {products.map((p) => {
                      const distMargin =
                        p.distributorPrice > 0
                          ? (((p.distributorPrice - p.costPrice) / p.distributorPrice) * 100).toFixed(1)
                          : '0';

                      return (
                        <tr key={p.id} className="hover:bg-gray-50">
                          <td className="px-4 py-2.5">
                            <div className="font-bold text-gray-900">{p.name}</div>
                            <div className="text-[10px] text-gray-500 font-mono">{p.sku} ({p.packageSize})</div>
                          </td>
                          <td className="px-4 py-2.5 text-right font-mono text-gray-600">
                            Rs. {p.costPrice.toFixed(2)}
                          </td>
                          <td className="px-4 py-2.5 text-right font-mono font-bold text-amber-950">
                            Rs. {p.distributorPrice.toFixed(2)}
                          </td>
                          <td className="px-4 py-2.5 text-right font-mono font-bold text-emerald-700">
                            +{distMargin}%
                          </td>
                          <td className="px-4 py-2.5 text-right font-mono text-gray-700">
                            Rs. {p.wholesalePrice.toFixed(2)}
                          </td>
                          <td className="px-4 py-2.5 text-right font-mono text-gray-500">
                            Rs. {p.mrp.toFixed(2)}
                          </td>
                          <td className="px-4 py-2.5 text-right font-mono font-bold text-gray-900">
                            Rs. {(p.stockOnHand * p.costPrice).toLocaleString()}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {activeReportTab === 'bestsellers' && (
          <div>
            <div className="p-4 bg-gray-50 border-b border-gray-200">
              <h3 className="font-bold text-xs uppercase tracking-wider text-gray-800">
                Top Grossing Products by Net Sales
              </h3>
            </div>

            {!reportData?.topProducts || reportData.topProducts.length === 0 ? (
              <p className="p-8 text-center text-xs text-gray-400">No sales transactions logged in selected period.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 text-xs">
                  <thead className="bg-gray-100 font-bold uppercase text-gray-700">
                    <tr>
                      <th className="px-4 py-3 text-left">Product Name</th>
                      <th className="px-4 py-3 text-left">SKU</th>
                      <th className="px-4 py-3 text-right">Units Sold</th>
                      <th className="px-4 py-3 text-right">Gross Sales (Rs.)</th>
                      <th className="px-4 py-3 text-right">COGS (Rs.)</th>
                      <th className="px-4 py-3 text-right">Gross Profit (Rs.)</th>
                      <th className="px-4 py-3 text-right">Margin %</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {reportData.topProducts.map((p: any, idx: number) => (
                      <tr key={idx} className="hover:bg-gray-50">
                        <td className="px-4 py-2.5 font-bold text-gray-900">{p.productName}</td>
                        <td className="px-4 py-2.5 font-mono text-gray-600">{p.sku}</td>
                        <td className="px-4 py-2.5 text-right font-mono font-bold">{p.quantitySold}</td>
                        <td className="px-4 py-2.5 text-right font-mono font-bold text-gray-900">
                          Rs. {p.revenue.toLocaleString()}
                        </td>
                        <td className="px-4 py-2.5 text-right font-mono text-gray-500">
                          Rs. {p.cogs.toLocaleString()}
                        </td>
                        <td className="px-4 py-2.5 text-right font-mono font-bold text-amber-950">
                          Rs. {p.grossProfit.toLocaleString()}
                        </td>
                        <td className="px-4 py-2.5 text-right font-mono font-bold text-emerald-700">
                          {p.marginPercent}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {activeReportTab === 'customers' && (
          <div>
            <div className="p-4 bg-gray-50 border-b border-gray-200">
              <h3 className="font-bold text-xs uppercase tracking-wider text-gray-800">
                Customer Account Purchase Volume
              </h3>
            </div>

            {!reportData?.topCustomers || reportData.topCustomers.length === 0 ? (
              <p className="p-8 text-center text-xs text-gray-400">No customer purchases logged in selected period.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 text-xs">
                  <thead className="bg-gray-100 font-bold uppercase text-gray-700">
                    <tr>
                      <th className="px-4 py-3 text-left">Enterprise Name</th>
                      <th className="px-4 py-3 text-left">Contact</th>
                      <th className="px-4 py-3 text-right">Orders Count</th>
                      <th className="px-4 py-3 text-right">Total Net Spend (Rs.)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {reportData.topCustomers.map((c: any, idx: number) => (
                      <tr key={idx} className="hover:bg-gray-50">
                        <td className="px-4 py-2.5 font-bold text-gray-900">{c.customerBusiness}</td>
                        <td className="px-4 py-2.5 text-gray-600">{c.customerName}</td>
                        <td className="px-4 py-2.5 text-right font-mono font-bold">{c.ordersCount}</td>
                        <td className="px-4 py-2.5 text-right font-mono font-bold text-amber-950">
                          Rs. {c.totalSpend.toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
