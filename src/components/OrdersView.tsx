import React, { useState, useMemo } from 'react';
import { 
  Receipt, 
  Plus, 
  Search, 
  Filter, 
  Download, 
  Trash2, 
  Printer, 
  Eye, 
  CheckCircle, 
  Clock, 
  AlertCircle,
  FileText,
  Truck
} from 'lucide-react';
import { useApp } from '../context/AppContext.tsx';
import { useAuth } from '../context/AuthContext.tsx';
import { Order, OrderPaymentStatus } from '../types/index.ts';
import { AdminConfirmModal } from './modals/AdminConfirmModal.tsx';

export const OrdersView: React.FC = () => {
  const { 
    orders, 
    setIsNewOrderModalOpen, 
    setActiveOrderForView, 
    updateOrder, 
    deleteOrder,
    setActiveTab 
  } = useApp();
  const { isAdmin } = useAuth();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<OrderPaymentStatus | 'All'>('All');

  // Admin delete modal
  const [confirmModalData, setConfirmModalData] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    action: (password: string) => Promise<void>;
  }>({
    isOpen: false,
    title: '',
    message: '',
    action: async () => {},
  });

  const filteredOrders = useMemo(() => {
    return orders.filter((o) => {
      const matchSearch =
        o.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        o.customerBusiness.toLowerCase().includes(searchTerm.toLowerCase()) ||
        o.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        o.items.some((i) => i.productName.toLowerCase().includes(searchTerm.toLowerCase()) || i.sku.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchStatus = selectedStatus === 'All' || o.paymentStatus === selectedStatus;
      return matchSearch && matchStatus;
    });
  }, [orders, searchTerm, selectedStatus]);

  const handleExportCsv = () => {
    if (orders.length === 0) return;
    const headers = [
      'InvoiceNumber',
      'CustomerBusiness',
      'CustomerName',
      'OrderDate',
      'DueDate',
      'PricingTier',
      'ItemsCount',
      'Subtotal_LKR',
      'VolumeDiscountPercent',
      'VolumeDiscountAmount_LKR',
      'NetTotal_LKR',
      'PaidAmount_LKR',
      'PaymentStatus',
      'PaymentMethod',
      'CreatedBy',
    ];

    const rows = orders.map((o) => [
      o.invoiceNumber,
      `"${o.customerBusiness.replace(/"/g, '""')}"`,
      `"${o.customerName.replace(/"/g, '""')}"`,
      o.orderDate,
      o.dueDate,
      o.pricingTier,
      o.items.length,
      o.subtotal,
      o.volumeDiscountPercent,
      o.volumeDiscountAmount,
      o.netTotal,
      o.paidAmount,
      o.paymentStatus,
      o.paymentMethod,
      `"${o.createdBy}"`,
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `sales_orders_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDeleteOrderPrompt = (order: Order) => {
    setConfirmModalData({
      isOpen: true,
      title: `Delete Invoice #${order.invoiceNumber}?`,
      message: `Are you sure you want to delete order #${order.invoiceNumber} for ${order.customerBusiness}? Total: Rs. ${order.netTotal.toLocaleString()}`,
      action: async (password: string) => {
        await deleteOrder(order.id, password);
      },
    });
  };

  const handleQuickStatusChange = async (orderId: string, newStatus: OrderPaymentStatus) => {
    const order = orders.find((o) => o.id === orderId);
    if (!order) return;
    const paidAmount = newStatus === 'Paid' ? order.netTotal : newStatus === 'Pending' ? 0 : order.paidAmount;
    await updateOrder(orderId, { paymentStatus: newStatus, paidAmount });
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-gray-200 shadow-xs">
        <div>
          <h1 className="text-xl font-black text-gray-900 tracking-tight flex items-center space-x-2">
            <span>Sales Orders & Commercial Invoices</span>
            <span className="text-xs bg-amber-100 text-amber-900 font-bold px-2 py-0.5 rounded-full">
              {orders.length} Invoices
            </span>
          </h1>
          <p className="text-xs text-gray-500 mt-1">
            Deterministic volume discounting, real-time stock deductions, and commercial print-ready billing.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          {orders.length > 0 && (
            <button
              onClick={handleExportCsv}
              className="px-3.5 py-2 bg-gray-50 hover:bg-gray-100 text-gray-700 border border-gray-300 rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition"
            >
              <Download className="w-4 h-4" />
              <span>Export CSV</span>
            </button>
          )}

          <button
            onClick={() => setActiveTab('delivery')}
            className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-amber-300 border border-slate-700 rounded-xl text-xs font-bold flex items-center space-x-1.5 shadow-sm transition active:scale-95"
          >
            <Truck className="w-4 h-4 text-amber-400" />
            <span>Delivery Routes (Maps)</span>
          </button>

          <button
            onClick={() => setIsNewOrderModalOpen(true)}
            className="px-4 py-2 bg-gradient-to-r from-amber-700 to-amber-800 hover:from-amber-800 hover:to-amber-900 text-white rounded-xl text-xs font-bold flex items-center space-x-1.5 shadow-sm transition active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>+ Create Sales Order</span>
          </button>
        </div>
      </div>

      {/* Filter toolbar */}
      <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-gray-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by invoice #, customer name, spice product, or SKU..."
            className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-xl text-xs focus:ring-2 focus:ring-amber-500 outline-hidden"
          />
        </div>

        <div className="w-full sm:w-60">
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value as any)}
            className="w-full px-3 py-2 border border-gray-300 rounded-xl text-xs focus:ring-2 focus:ring-amber-500 outline-hidden bg-white font-medium"
          >
            <option value="All">All Payment Statuses</option>
            <option value="Paid">Paid</option>
            <option value="Partially Paid">Partially Paid</option>
            <option value="Pending">Pending</option>
            <option value="Overdue">Overdue</option>
            <option value="Cancelled">Cancelled</option>
          </select>
        </div>
      </div>

      {/* Orders Table */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden">
        {orders.length === 0 ? (
          <div className="p-12 text-center">
            <Receipt className="w-12 h-12 text-amber-400/80 mx-auto mb-3" />
            <h3 className="text-base font-bold text-gray-900">No Sales Orders Placed</h3>
            <p className="text-xs text-gray-500 max-w-md mx-auto mt-1">
              There are currently no sales orders or invoices issued. Create your first order to deduct stock
              and trigger automatic volume discount calculations.
            </p>
            <button
              onClick={() => setIsNewOrderModalOpen(true)}
              className="mt-4 px-5 py-2.5 bg-amber-700 hover:bg-amber-800 text-white rounded-xl text-xs font-bold shadow-md transition inline-flex items-center space-x-2"
            >
              <Plus className="w-4 h-4" />
              <span>Create First Sales Order</span>
            </button>
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="p-8 text-center text-gray-500 text-xs">
            No orders match your filter criteria.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 text-xs">
              <thead className="bg-gray-100 font-bold uppercase tracking-wider text-gray-700">
                <tr>
                  <th className="px-4 py-3 text-left">Invoice #</th>
                  <th className="px-4 py-3 text-left">Customer</th>
                  <th className="px-4 py-3 text-left">Order Date</th>
                  <th className="px-4 py-3 text-left">Tier & Items</th>
                  <th className="px-4 py-3 text-right">Gross Subtotal</th>
                  <th className="px-4 py-3 text-right">Volume Discount</th>
                  <th className="px-4 py-3 text-right">Net Payable</th>
                  <th className="px-4 py-3 text-center">Payment Status</th>
                  <th className="px-4 py-3 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredOrders.map((order) => {
                  return (
                    <tr key={order.id} className="hover:bg-amber-50/30 transition">
                      {/* Invoice */}
                      <td className="px-4 py-3 font-mono font-bold text-gray-900">
                        {order.invoiceNumber}
                        <div className="text-[10px] text-gray-400 font-sans font-normal">
                          By: {order.createdBy}
                        </div>
                      </td>

                      {/* Customer */}
                      <td className="px-4 py-3">
                        <div className="font-bold text-gray-900 text-sm">{order.customerBusiness}</div>
                        <div className="text-[11px] text-gray-500">{order.customerName}</div>
                      </td>

                      {/* Date */}
                      <td className="px-4 py-3 text-gray-600">
                        <div>{order.orderDate}</div>
                        <div className="text-[10px] text-gray-400">Due: {order.dueDate}</div>
                      </td>

                      {/* Tier & Items summary */}
                      <td className="px-4 py-3">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900">
                          {order.pricingTier}
                        </span>
                        <div className="text-[10px] text-gray-500 mt-1">
                          {order.items.length} item{order.items.length > 1 ? 's' : ''} (
                          {order.items.reduce((sum, i) => sum + i.quantity, 0)} units total)
                        </div>
                      </td>

                      {/* Subtotal */}
                      <td className="px-4 py-3 text-right font-mono text-gray-700">
                        Rs. {order.subtotal.toLocaleString('en-LK', { minimumFractionDigits: 2 })}
                      </td>

                      {/* Volume Discount */}
                      <td className="px-4 py-3 text-right font-mono">
                        {order.volumeDiscountAmount > 0 ? (
                          <div className="text-emerald-700 font-bold">
                            -{order.volumeDiscountPercent}% (Rs. {order.volumeDiscountAmount.toLocaleString()})
                          </div>
                        ) : (
                          <span className="text-gray-400">0%</span>
                        )}
                      </td>

                      {/* Net Payable */}
                      <td className="px-4 py-3 text-right font-mono font-extrabold text-amber-950 text-sm">
                        Rs. {order.netTotal.toLocaleString('en-LK', { minimumFractionDigits: 2 })}
                        {order.paidAmount > 0 && order.paidAmount < order.netTotal && (
                          <div className="text-[10px] text-gray-400 font-normal">
                            Paid: Rs. {order.paidAmount.toLocaleString()}
                          </div>
                        )}
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3 text-center">
                        <select
                          value={order.paymentStatus}
                          onChange={(e) =>
                            handleQuickStatusChange(order.id, e.target.value as OrderPaymentStatus)
                          }
                          className={`px-2 py-1 rounded-md text-[10px] font-bold border outline-hidden ${
                            order.paymentStatus === 'Paid'
                              ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                              : order.paymentStatus === 'Partially Paid'
                              ? 'bg-blue-100 text-blue-800 border-blue-300'
                              : order.paymentStatus === 'Overdue'
                              ? 'bg-red-100 text-red-800 border-red-300'
                              : 'bg-amber-100 text-amber-900 border-amber-300'
                          }`}
                        >
                          <option value="Pending">Pending</option>
                          <option value="Partially Paid">Partially Paid</option>
                          <option value="Paid">Paid</option>
                          <option value="Overdue">Overdue</option>
                          <option value="Cancelled">Cancelled</option>
                        </select>
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center space-x-1">
                          <button
                            onClick={() => setActiveOrderForView(order)}
                            title="View / Print Commercial Invoice"
                            className="px-2.5 py-1 bg-amber-700 hover:bg-amber-800 text-white rounded text-xs font-semibold flex items-center space-x-1 transition"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>Invoice</span>
                          </button>

                          {isAdmin && (
                            <button
                              onClick={() => handleDeleteOrderPrompt(order)}
                              title="Delete Order (Admin password required)"
                              className="p-1.5 text-red-500 hover:bg-red-50 rounded transition"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Admin confirm dialog */}
      <AdminConfirmModal
        isOpen={confirmModalData.isOpen}
        title={confirmModalData.title}
        message={confirmModalData.message}
        onConfirm={confirmModalData.action}
        onClose={() => setConfirmModalData((prev) => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
};
