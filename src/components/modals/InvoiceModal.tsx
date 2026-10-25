import React, { useState } from 'react';
import { X, Printer, MapPin, CheckCircle, Clock, AlertCircle } from 'lucide-react';
import { useApp } from '../../context/AppContext.tsx';
import { OrderPaymentStatus } from '../../types/index.ts';

export const InvoiceModal: React.FC = () => {
  const { activeOrderForView, setActiveOrderForView, updateOrder, customers } = useApp();
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  if (!activeOrderForView) return null;

  const order = activeOrderForView;
  const customer = customers.find((c) => c.id === order.customerId);

  const handlePrint = () => {
    window.print();
  };

  const handleUpdatePaymentStatus = async (status: OrderPaymentStatus) => {
    try {
      setIsUpdatingStatus(true);
      const paidAmt = status === 'Paid' ? order.netTotal : status === 'Pending' ? 0 : order.paidAmount;
      const updated = await updateOrder(order.id, {
        paymentStatus: status,
        paidAmount: paidAmt,
      });
      setActiveOrderForView(updated);
    } catch (err) {
      console.error('Failed to update status:', err);
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const mapLink = customer?.coordinates
    ? `https://www.google.com/maps/search/?api=1&query=${customer.coordinates.latitude},${customer.coordinates.longitude}`
    : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
        `${customer?.address || ''} ${customer?.city || ''} Sri Lanka`
      )}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full my-6 overflow-hidden border border-amber-200">
        {/* Modal Controls Bar (Hidden during print) */}
        <div className="print:hidden bg-amber-900 px-6 py-3.5 flex items-center justify-between text-white">
          <div className="flex items-center space-x-2">
            <span className="font-bold text-sm tracking-wide">Commercial Invoice #{order.invoiceNumber}</span>
            <span
              className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                order.paymentStatus === 'Paid'
                  ? 'bg-emerald-500 text-white'
                  : order.paymentStatus === 'Partially Paid'
                  ? 'bg-blue-500 text-white'
                  : 'bg-amber-500 text-white'
              }`}
            >
              {order.paymentStatus}
            </span>
          </div>

          <div className="flex items-center space-x-2">
            {/* Quick status dropdown */}
            <select
              disabled={isUpdatingStatus}
              value={order.paymentStatus}
              onChange={(e) => handleUpdatePaymentStatus(e.target.value as OrderPaymentStatus)}
              className="bg-amber-800 text-white text-xs border border-amber-700 rounded-lg px-2 py-1 outline-hidden"
            >
              <option value="Pending">Mark Pending</option>
              <option value="Partially Paid">Mark Partially Paid</option>
              <option value="Paid">Mark Paid</option>
              <option value="Overdue">Mark Overdue</option>
              <option value="Cancelled">Mark Cancelled</option>
            </select>

            <button
              onClick={handlePrint}
              className="px-3 py-1 bg-amber-700 hover:bg-amber-600 rounded-lg text-xs font-semibold flex items-center space-x-1 transition"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print / Save PDF</span>
            </button>

            <button
              onClick={() => setActiveOrderForView(null)}
              aria-label="Close invoice"
              className="p-1 text-amber-200 hover:text-white rounded-lg transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Invoice Container */}
        <div id="invoice-sheet" className="p-8 space-y-6 text-gray-900 bg-white">
          {/* Header */}
          <div className="flex justify-between items-start border-b-2 border-amber-900 pb-5">
            <div>
              <div className="flex items-center space-x-2">
                <div className="w-9 h-9 rounded-lg bg-amber-800 text-white flex items-center justify-center font-bold text-lg shadow-sm">
                  NA
                </div>
                <div>
                  <h1 className="text-xl font-black tracking-tight text-amber-950 uppercase">NA Distributors</h1>
                  <p className="text-xs text-amber-800 font-medium">Wholesale & Export Quality Ceylon Spices</p>
                </div>
              </div>
              <div className="text-xs text-gray-600 mt-2 space-y-0.5">
                <p>No. 45, Temple Road, Colombo 03, Sri Lanka</p>
                <p>Hotline: +94 11 234 5678 | info@nadistributors.lk</p>
                <p className="font-mono text-[11px]">VAT / Business Reg: PV-98745-LKR</p>
              </div>
            </div>

            <div className="text-right">
              <h2 className="text-2xl font-black text-amber-950 uppercase tracking-wide">INVOICE</h2>
              <div className="mt-1 text-xs space-y-1">
                <p>
                  <span className="text-gray-500 font-semibold">Invoice No: </span>
                  <span className="font-mono font-bold text-gray-900">{order.invoiceNumber}</span>
                </p>
                <p>
                  <span className="text-gray-500 font-semibold">Invoice Date: </span>
                  <span className="font-medium text-gray-900">{order.orderDate}</span>
                </p>
                <p>
                  <span className="text-gray-500 font-semibold">Due Date: </span>
                  <span className="font-medium text-gray-900">{order.dueDate}</span>
                </p>
                <p>
                  <span className="text-gray-500 font-semibold">Pricing Tier: </span>
                  <span className="font-bold text-amber-900">{order.pricingTier}</span>
                </p>
              </div>
            </div>
          </div>

          {/* Bill To */}
          <div className="grid grid-cols-2 gap-6 bg-amber-50/40 p-4 rounded-xl border border-amber-200/60 text-xs">
            <div>
              <h3 className="font-bold text-amber-950 uppercase tracking-wider mb-1.5">Billed To</h3>
              <p className="text-sm font-bold text-gray-900">{order.customerBusiness || order.customerName}</p>
              <p className="text-gray-700">Attn: {order.customerName}</p>
              <p className="text-gray-600">{customer?.address || 'Market District'}</p>
              <p className="text-gray-600">{customer?.city || 'Colombo'}, Sri Lanka</p>
              {customer?.phone && <p className="text-gray-600">Tel: {customer.phone}</p>}
            </div>

            <div className="text-right flex flex-col justify-between">
              <div>
                <h3 className="font-bold text-amber-950 uppercase tracking-wider mb-1.5">Payment Status</h3>
                <span
                  className={`inline-block px-2.5 py-1 rounded-md font-bold text-xs ${
                    order.paymentStatus === 'Paid'
                      ? 'bg-emerald-100 text-emerald-800'
                      : order.paymentStatus === 'Partially Paid'
                      ? 'bg-blue-100 text-blue-800'
                      : 'bg-amber-100 text-amber-900'
                  }`}
                >
                  {order.paymentStatus.toUpperCase()}
                </span>
                <p className="text-gray-500 mt-1">Method: {order.paymentMethod}</p>
              </div>

              {customer?.coordinates && (
                <div className="pt-2">
                  <a
                    href={mapLink}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center space-x-1 text-amber-800 hover:text-amber-950 underline font-semibold"
                  >
                    <MapPin className="w-3.5 h-3.5" />
                    <span>View Customer GPS on Google Maps</span>
                  </a>
                </div>
              )}
            </div>
          </div>

          {/* Items Table */}
          <div className="border border-gray-200 rounded-xl overflow-hidden shadow-xs">
            <table className="min-w-full divide-y divide-gray-200 text-xs">
              <thead className="bg-gray-100 text-gray-700 font-bold uppercase tracking-wider">
                <tr>
                  <th className="px-4 py-3 text-left">#</th>
                  <th className="px-4 py-3 text-left">Item Description</th>
                  <th className="px-4 py-3 text-left">SKU / Pack</th>
                  <th className="px-4 py-3 text-right">Unit Price</th>
                  <th className="px-4 py-3 text-right">Qty</th>
                  <th className="px-4 py-3 text-right">Amount (Rs.)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {order.items.map((item, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-4 py-2.5 text-gray-400 font-mono">{index + 1}</td>
                    <td className="px-4 py-2.5 font-semibold text-gray-900">{item.productName}</td>
                    <td className="px-4 py-2.5 text-gray-600 font-mono">
                      {item.sku} ({item.packageSize})
                    </td>
                    <td className="px-4 py-2.5 text-right font-mono">
                      Rs. {item.unitPrice.toLocaleString('en-LK', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-4 py-2.5 text-right font-mono font-bold text-gray-900">{item.quantity}</td>
                    <td className="px-4 py-2.5 text-right font-mono font-bold text-gray-900">
                      Rs. {item.lineTotal.toLocaleString('en-LK', { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Financial Calculation Breakdown */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
            <div className="text-xs text-gray-600 bg-gray-50 p-4 rounded-xl border border-gray-200 space-y-1.5">
              <h4 className="font-bold text-gray-900 uppercase tracking-wider mb-2">Order Terms & Notes</h4>
              <p>• Goods received in good condition. Return claims accepted within 48 hours of delivery.</p>
              <p>• Volume discount automatically applied based on total gross order scale.</p>
              {order.notes && <p className="pt-1 italic text-gray-800">Note: "{order.notes}"</p>}
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between text-gray-600">
                <span>Gross Items Subtotal:</span>
                <span className="font-mono font-semibold">
                  Rs. {order.subtotal.toLocaleString('en-LK', { minimumFractionDigits: 2 })}
                </span>
              </div>

              {order.volumeDiscountAmount > 0 && (
                <div className="flex justify-between text-emerald-700 font-medium">
                  <span>Volume Discount ({order.volumeDiscountPercent}%):</span>
                  <span className="font-mono font-bold">
                    - Rs. {order.volumeDiscountAmount.toLocaleString('en-LK', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              )}

              <div className="flex justify-between text-gray-500">
                <span>Value Added Tax (0.00%):</span>
                <span className="font-mono">Rs. 0.00</span>
              </div>

              <div className="flex justify-between text-base font-extrabold text-amber-950 border-t-2 border-amber-800 pt-2">
                <span>Total Net Payable:</span>
                <span className="font-mono text-lg">
                  Rs. {order.netTotal.toLocaleString('en-LK', { minimumFractionDigits: 2 })}
                </span>
              </div>

              {order.paidAmount > 0 && (
                <div className="flex justify-between text-emerald-800 font-semibold pt-1">
                  <span>Amount Paid:</span>
                  <span className="font-mono">
                    Rs. {order.paidAmount.toLocaleString('en-LK', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              )}

              {order.netTotal - order.paidAmount > 0 && (
                <div className="flex justify-between text-amber-900 font-bold pt-1">
                  <span>Balance Outstanding:</span>
                  <span className="font-mono">
                    Rs. {(order.netTotal - order.paidAmount).toLocaleString('en-LK', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Signatures */}
          <div className="grid grid-cols-2 gap-8 pt-8 border-t border-gray-200 text-xs">
            <div className="text-center pt-8 border-t border-gray-400">
              <p className="font-semibold text-gray-900">Customer Receiver Signature & Stamp</p>
              <p className="text-gray-500 text-[10px]">Date: ____________________</p>
            </div>
            <div className="text-center pt-8 border-t border-gray-400">
              <p className="font-semibold text-gray-900">For NA Distributors (Authorized Officer)</p>
              <p className="text-gray-500 text-[10px]">{order.createdBy || 'Authorized Rep'}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
