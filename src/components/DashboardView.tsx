import React, { useMemo } from 'react';
import { 
  TrendingUp, 
  DollarSign, 
  CreditCard, 
  AlertTriangle, 
  Package, 
  Boxes, 
  Receipt, 
  Plus, 
  PackagePlus, 
  BarChart3, 
  ArrowUpRight,
  ExternalLink,
  CheckCircle2,
  Clock
} from 'lucide-react';
import { useApp } from '../context/AppContext.tsx';
import { Product } from '../types/index.ts';

export const DashboardView: React.FC = () => {
  const { 
    products, 
    orders, 
    customers, 
    setActiveTab, 
    setIsNewOrderModalOpen, 
    setIsAddProductModalOpen,
    setActiveProductForRestock,
    setActiveOrderForView
  } = useApp();

  // Financial and Inventory Metrics calculations
  const metrics = useMemo(() => {
    let salesRevenue = 0;
    let collectedPayments = 0;
    let balancesDue = 0;

    orders.forEach((o) => {
      if (o.paymentStatus !== 'Cancelled') {
        salesRevenue += o.netTotal;
        collectedPayments += o.paidAmount || 0;
        balancesDue += Math.max(0, o.netTotal - (o.paidAmount || 0));
      }
    });

    let inventoryCostValuation = 0;
    let inventoryMrpValuation = 0;
    let lowStockCount = 0;

    products.forEach((p) => {
      inventoryCostValuation += p.stockOnHand * p.costPrice;
      inventoryMrpValuation += p.stockOnHand * p.mrp;
      if (p.stockOnHand <= p.reorderThreshold) {
        lowStockCount++;
      }
    });

    // Top selling products by revenue
    const productSoldMap = new Map<string, { product: Product | undefined; quantity: number; revenue: number }>();
    orders.forEach((o) => {
      if (o.paymentStatus !== 'Cancelled') {
        o.items.forEach((item) => {
          const current = productSoldMap.get(item.productId) || {
            product: products.find((p) => p.id === item.productId),
            quantity: 0,
            revenue: 0,
          };
          current.quantity += item.quantity;
          current.revenue += item.lineTotal;
          productSoldMap.set(item.productId, current);
        });
      }
    });

    const topProducts = Array.from(productSoldMap.values())
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);

    return {
      salesRevenue,
      collectedPayments,
      balancesDue,
      inventoryCostValuation,
      inventoryMrpValuation,
      totalProducts: products.length,
      lowStockCount,
      topProducts,
      recentOrders: orders.slice(0, 6),
    };
  }, [orders, products]);

  return (
    <div className="space-y-6 pb-12">
      {/* Top Banner / Welcome */}
      <div className="bg-gradient-to-r from-amber-900 via-amber-800 to-amber-950 rounded-2xl p-6 text-white shadow-md relative overflow-hidden">
        <div className="relative z-10 max-w-2xl">
          <span className="px-2.5 py-1 bg-amber-700/60 text-amber-200 text-xs font-bold rounded-lg uppercase tracking-wider">
            Ceylon Spice Distribution Operations
          </span>
          <h1 className="text-2xl sm:text-3xl font-black mt-2 tracking-tight">
            NA Distributors Central Dashboard
          </h1>
          <p className="text-sm text-amber-200/90 mt-1 leading-relaxed">
            Real-time multi-tier pricing, instant stock allocation, and trade invoice settlement.
          </p>

          {/* Shortcuts */}
          <div className="flex flex-wrap gap-2.5 mt-5">
            <button
              onClick={() => setIsNewOrderModalOpen(true)}
              className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-amber-950 rounded-xl text-xs font-bold flex items-center space-x-1.5 shadow-sm transition active:scale-95"
            >
              <Receipt className="w-4 h-4" />
              <span>Create an Order</span>
            </button>

            <button
              onClick={() => setIsAddProductModalOpen(true)}
              className="px-4 py-2 bg-amber-800/80 hover:bg-amber-700 text-white border border-amber-600 rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>Add New Spice</span>
            </button>

            <button
              onClick={() => setActiveTab('inventory')}
              className="px-4 py-2 bg-amber-800/80 hover:bg-amber-700 text-white border border-amber-600 rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition active:scale-95"
            >
              <Boxes className="w-4 h-4" />
              <span>Browse Inventory</span>
            </button>

            <button
              onClick={() => setActiveTab('reports')}
              className="px-4 py-2 bg-amber-800/80 hover:bg-amber-700 text-white border border-amber-600 rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition active:scale-95"
            >
              <BarChart3 className="w-4 h-4" />
              <span>View Reports</span>
            </button>
          </div>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {/* Sales Revenue */}
        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-gray-500 text-xs font-semibold">
            <span>Sales Revenue</span>
            <div className="p-2 bg-amber-50 text-amber-800 rounded-lg">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-xl font-black text-gray-900 font-mono">
              Rs. {metrics.salesRevenue.toLocaleString('en-LK', { maximumFractionDigits: 0 })}
            </div>
            <div className="text-[11px] text-gray-500 mt-0.5">{orders.length} total orders placed</div>
          </div>
        </div>

        {/* Collected Payments */}
        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-gray-500 text-xs font-semibold">
            <span>Collected Payments</span>
            <div className="p-2 bg-emerald-50 text-emerald-700 rounded-lg">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-xl font-black text-emerald-800 font-mono">
              Rs. {metrics.collectedPayments.toLocaleString('en-LK', { maximumFractionDigits: 0 })}
            </div>
            <div className="text-[11px] text-emerald-600 mt-0.5">
              {metrics.salesRevenue > 0
                ? `${Math.round((metrics.collectedPayments / metrics.salesRevenue) * 100)}% recovery rate`
                : 'Zero receivables'}
            </div>
          </div>
        </div>

        {/* Balances Due */}
        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-gray-500 text-xs font-semibold">
            <span>Balances Due</span>
            <div className="p-2 bg-orange-50 text-orange-700 rounded-lg">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-xl font-black text-amber-900 font-mono">
              Rs. {metrics.balancesDue.toLocaleString('en-LK', { maximumFractionDigits: 0 })}
            </div>
            <div className="text-[11px] text-gray-500 mt-0.5">Pending trade credit</div>
          </div>
        </div>

        {/* Inventory Value */}
        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-gray-500 text-xs font-semibold">
            <span>Inventory Value (Cost)</span>
            <div className="p-2 bg-blue-50 text-blue-700 rounded-lg">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-xl font-black text-blue-900 font-mono">
              Rs. {metrics.inventoryCostValuation.toLocaleString('en-LK', { maximumFractionDigits: 0 })}
            </div>
            <div className="text-[11px] text-blue-600 mt-0.5">
              MRP: Rs. {metrics.inventoryMrpValuation.toLocaleString('en-LK', { maximumFractionDigits: 0 })}
            </div>
          </div>
        </div>

        {/* Product Count */}
        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-gray-500 text-xs font-semibold">
            <span>Catalog Items</span>
            <div className="p-2 bg-purple-50 text-purple-700 rounded-lg">
              <Package className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-xl font-black text-gray-900 font-mono">{metrics.totalProducts} Spices</div>
            <div className="text-[11px] text-gray-500 mt-0.5">{customers.length} Trade accounts</div>
          </div>
        </div>

        {/* Low-Stock Warnings */}
        <div
          onClick={() => setActiveTab('inventory')}
          className={`p-4 rounded-2xl border shadow-xs flex flex-col justify-between cursor-pointer transition ${
            metrics.lowStockCount > 0
              ? 'bg-amber-50/70 border-amber-300 hover:bg-amber-100/70'
              : 'bg-white border-gray-200'
          }`}
        >
          <div className="flex items-center justify-between text-xs font-semibold">
            <span className={metrics.lowStockCount > 0 ? 'text-amber-950 font-bold' : 'text-gray-500'}>
              Low-Stock Warnings
            </span>
            <div
              className={`p-2 rounded-lg ${
                metrics.lowStockCount > 0 ? 'bg-amber-200 text-amber-900' : 'bg-gray-100 text-gray-500'
              }`}
            >
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <div
              className={`text-xl font-black font-mono ${
                metrics.lowStockCount > 0 ? 'text-amber-950' : 'text-gray-900'
              }`}
            >
              {metrics.lowStockCount} Items
            </div>
            <div className="text-[11px] text-amber-800 mt-0.5 font-medium flex items-center space-x-1">
              <span>{metrics.lowStockCount > 0 ? 'Action required in Inventory' : 'Stock levels optimal'}</span>
              <ArrowUpRight className="w-3 h-3" />
            </div>
          </div>
        </div>
      </div>

      {/* Main Grid: Recent Orders & Top Selling Spices */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Orders Table (2 Cols) */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-200 shadow-xs p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider">Recent Sales Orders</h2>
              <p className="text-xs text-gray-500">Live invoices deducted from inventory</p>
            </div>
            <button
              onClick={() => setActiveTab('orders')}
              className="text-xs text-amber-700 hover:text-amber-900 font-semibold flex items-center space-x-1"
            >
              <span>View All Orders</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {orders.length === 0 ? (
            <div className="text-center py-12 border-2 border-dashed border-gray-200 rounded-xl bg-gray-50/50">
              <Receipt className="w-10 h-10 text-gray-300 mx-auto mb-2" />
              <p className="text-sm font-semibold text-gray-700">No sales orders created yet</p>
              <p className="text-xs text-gray-400 mt-1">Create your first customer order to start tracking revenue</p>
              <button
                onClick={() => setIsNewOrderModalOpen(true)}
                className="mt-3 px-4 py-2 bg-amber-700 hover:bg-amber-800 text-white rounded-lg text-xs font-bold shadow-xs transition"
              >
                + Create New Order
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-100 text-xs">
                <thead>
                  <tr className="text-gray-400 font-bold uppercase tracking-wider text-left">
                    <th className="pb-3">Invoice</th>
                    <th className="pb-3">Customer</th>
                    <th className="pb-3">Date</th>
                    <th className="pb-3 text-right">Net Total</th>
                    <th className="pb-3 text-center">Status</th>
                    <th className="pb-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {metrics.recentOrders.map((order) => (
                    <tr key={order.id} className="hover:bg-gray-50/80 transition">
                      <td className="py-3 font-mono font-bold text-gray-900">{order.invoiceNumber}</td>
                      <td className="py-3">
                        <div className="font-semibold text-gray-800">{order.customerBusiness}</div>
                        <div className="text-[10px] text-gray-400">{order.customerName}</div>
                      </td>
                      <td className="py-3 text-gray-500">{order.orderDate}</td>
                      <td className="py-3 text-right font-mono font-bold text-gray-900">
                        Rs. {order.netTotal.toLocaleString('en-LK', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3 text-center">
                        <span
                          className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            order.paymentStatus === 'Paid'
                              ? 'bg-emerald-100 text-emerald-800'
                              : order.paymentStatus === 'Partially Paid'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {order.paymentStatus}
                        </span>
                      </td>
                      <td className="py-3 text-right">
                        <button
                          onClick={() => setActiveOrderForView(order)}
                          className="text-amber-800 hover:text-amber-950 font-semibold underline text-xs"
                        >
                          Invoice
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Top Selling Spices & Quick Restock */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-xs p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider">Top Selling Spices</h2>
                <p className="text-xs text-gray-500">Highest grossing catalog items</p>
              </div>
              <button
                onClick={() => setActiveTab('reports')}
                className="text-xs text-amber-700 hover:text-amber-900 font-semibold flex items-center space-x-1"
              >
                <span>Analytics</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {metrics.topProducts.length === 0 ? (
              <div className="text-center py-8 border border-dashed border-gray-200 rounded-xl bg-gray-50/50">
                <Package className="w-8 h-8 text-gray-300 mx-auto mb-1.5" />
                <p className="text-xs font-semibold text-gray-600">No sales transactions logged</p>
                <p className="text-[11px] text-gray-400">Top selling spices will populate automatically</p>
              </div>
            ) : (
              <div className="space-y-3">
                {metrics.topProducts.map((item, idx) => (
                  <div
                    key={idx}
                    className="p-3 bg-gray-50 hover:bg-amber-50/40 rounded-xl border border-gray-100 transition flex items-center justify-between text-xs"
                  >
                    <div>
                      <div className="font-bold text-gray-900">{item.product?.name || 'Spice Product'}</div>
                      <div className="text-[10px] text-gray-500">
                        {item.quantity} units sold | Stock on hand: {item.product?.stockOnHand || 0}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-mono font-bold text-amber-950">
                        Rs. {item.revenue.toLocaleString('en-LK', { maximumFractionDigits: 0 })}
                      </div>
                      {item.product && (
                        <button
                          onClick={() => setActiveProductForRestock(item.product!)}
                          className="text-[10px] text-emerald-700 hover:text-emerald-900 font-bold underline"
                        >
                          Quick Restock
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Quick restock reminder block */}
          <div className="mt-5 p-3.5 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-950">
            <div className="font-bold mb-1 flex items-center justify-between">
              <span>Inventory Reorder Status</span>
              <span className="font-mono font-bold text-amber-800">
                {metrics.lowStockCount} below threshold
              </span>
            </div>
            <p className="text-[11px] text-amber-900/80">
              Low-stock items trigger automatic alerts and require purchase orders or batch restock.
            </p>
            <button
              onClick={() => setActiveTab('inventory')}
              className="mt-2 text-xs font-bold text-amber-800 hover:text-amber-950 underline"
            >
              Filter Low Stock Spices →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
