import React, { useState, useMemo } from 'react';
import { 
  Plus, 
  Search, 
  MapPin, 
  Phone, 
  Mail, 
  Receipt, 
  Download, 
  ExternalLink, 
  Edit2, 
  Trash2, 
  Building2,
  Users,
  CreditCard,
  X
} from 'lucide-react';
import { useApp } from '../context/AppContext.tsx';
import { useAuth } from '../context/AuthContext.tsx';
import { Customer, PricingTier, PaymentTerms } from '../types/index.ts';
import { AdminConfirmModal } from './modals/AdminConfirmModal.tsx';

export const CustomersView: React.FC = () => {
  const { 
    customers, 
    orders, 
    setIsAddCustomerModalOpen, 
    updateCustomer, 
    deleteCustomer, 
    setActiveOrderForView,
    setIsNewOrderModalOpen
  } = useApp();
  const { isAdmin } = useAuth();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTier, setSelectedTier] = useState<PricingTier | 'All'>('All');
  const [selectedCustomerForDetail, setSelectedCustomerForDetail] = useState<Customer | null>(null);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);

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

  const filteredCustomers = useMemo(() => {
    return customers.filter((c) => {
      const matchSearch =
        c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.businessName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.city.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.phone.toLowerCase().includes(searchTerm.toLowerCase());
      const matchTier = selectedTier === 'All' || c.pricingTier === selectedTier;
      return matchSearch && matchTier;
    });
  }, [customers, searchTerm, selectedTier]);

  const handleExportCsv = () => {
    if (customers.length === 0) return;
    const headers = [
      'ID',
      'BusinessName',
      'ContactName',
      'Email',
      'Phone',
      'Address',
      'City',
      'PricingTier',
      'PaymentTerms',
      'CreditLimit_LKR',
      'CurrentBalance_LKR',
      'TotalOrders',
      'TotalSpent_LKR',
      'GPS_Latitude',
      'GPS_Longitude',
    ];

    const rows = customers.map((c) => [
      c.id,
      `"${c.businessName.replace(/"/g, '""')}"`,
      `"${c.name.replace(/"/g, '""')}"`,
      c.email,
      c.phone,
      `"${c.address.replace(/"/g, '""')}"`,
      c.city,
      c.pricingTier,
      c.paymentTerms,
      c.creditLimit,
      c.currentBalance,
      c.totalOrders,
      c.totalSpent,
      c.coordinates?.latitude || '',
      c.coordinates?.longitude || '',
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `customers_trade_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDeleteCustomerPrompt = (customer: Customer) => {
    setConfirmModalData({
      isOpen: true,
      title: `Delete Account: ${customer.businessName}?`,
      message: `Are you sure you want to remove customer ${customer.businessName} (${customer.name})? Current balance: Rs. ${customer.currentBalance.toLocaleString()}`,
      action: async (password: string) => {
        await deleteCustomer(customer.id, password);
        if (selectedCustomerForDetail?.id === customer.id) {
          setSelectedCustomerForDetail(null);
        }
      },
    });
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCustomer) return;
    await updateCustomer(editingCustomer.id, editingCustomer);
    setEditingCustomer(null);
  };

  // Orders for selected customer
  const customerOrders = useMemo(() => {
    if (!selectedCustomerForDetail) return [];
    return orders.filter((o) => o.customerId === selectedCustomerForDetail.id);
  }, [orders, selectedCustomerForDetail]);

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-gray-200 shadow-xs">
        <div>
          <h1 className="text-xl font-black text-gray-900 tracking-tight flex items-center space-x-2">
            <span>Customer & Trade Accounts</span>
            <span className="text-xs bg-amber-100 text-amber-900 font-bold px-2 py-0.5 rounded-full">
              {customers.length} Accounts
            </span>
          </h1>
          <p className="text-xs text-gray-500 mt-1">
            Commercial terms, GPS route dispatch coordinates, pricing tier assignments, and lifetime spend history.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          {customers.length > 0 && (
            <button
              onClick={handleExportCsv}
              className="px-3.5 py-2 bg-gray-50 hover:bg-gray-100 text-gray-700 border border-gray-300 rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition"
            >
              <Download className="w-4 h-4" />
              <span>Export CSV</span>
            </button>
          )}

          <button
            onClick={() => setIsAddCustomerModalOpen(true)}
            className="px-4 py-2 bg-gradient-to-r from-amber-700 to-amber-800 hover:from-amber-800 hover:to-amber-900 text-white rounded-xl text-xs font-bold flex items-center space-x-1.5 shadow-sm transition active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>+ New Trade Account</span>
          </button>
        </div>
      </div>

      {/* Search & Filter */}
      <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-gray-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search customer business, contact name, city, phone..."
            className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-xl text-xs focus:ring-2 focus:ring-amber-500 outline-hidden"
          />
        </div>

        <div className="w-full sm:w-60">
          <select
            value={selectedTier}
            onChange={(e) => setSelectedTier(e.target.value as any)}
            className="w-full px-3 py-2 border border-gray-300 rounded-xl text-xs focus:ring-2 focus:ring-amber-500 outline-hidden bg-white font-medium"
          >
            <option value="All">All Pricing Tiers</option>
            <option value="Distributor">Distributor Tier</option>
            <option value="Wholesale">Wholesale Tier</option>
            <option value="Retail">Retail Tier</option>
            <option value="Special">Special Tier</option>
          </select>
        </div>
      </div>

      {/* Customers Table */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden">
        {customers.length === 0 ? (
          <div className="p-12 text-center">
            <Users className="w-12 h-12 text-amber-400/80 mx-auto mb-3" />
            <h3 className="text-base font-bold text-gray-900">No Customer Accounts</h3>
            <p className="text-xs text-gray-500 max-w-md mx-auto mt-1">
              There are no trade accounts saved in the database. Add your first customer with pricing tier,
              payment terms, and GPS dispatch coordinates.
            </p>
            <button
              onClick={() => setIsAddCustomerModalOpen(true)}
              className="mt-4 px-5 py-2.5 bg-amber-700 hover:bg-amber-800 text-white rounded-xl text-xs font-bold shadow-md transition inline-flex items-center space-x-2"
            >
              <Plus className="w-4 h-4" />
              <span>Create Customer Account</span>
            </button>
          </div>
        ) : filteredCustomers.length === 0 ? (
          <div className="p-8 text-center text-gray-500 text-xs">
            No customers match your search criteria.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 text-xs">
              <thead className="bg-gray-100 font-bold uppercase tracking-wider text-gray-700">
                <tr>
                  <th className="px-4 py-3 text-left">Enterprise / Contact</th>
                  <th className="px-4 py-3 text-left">Location / GPS</th>
                  <th className="px-4 py-3 text-left">Pricing Tier</th>
                  <th className="px-4 py-3 text-left">Payment Terms</th>
                  <th className="px-4 py-3 text-right">Credit Limit</th>
                  <th className="px-4 py-3 text-right">Outstanding Bal</th>
                  <th className="px-4 py-3 text-right">Lifetime Spend</th>
                  <th className="px-4 py-3 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredCustomers.map((cust) => {
                  const mapUrl = cust.coordinates
                    ? `https://www.google.com/maps/search/?api=1&query=${cust.coordinates.latitude},${cust.coordinates.longitude}`
                    : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                        `${cust.address} ${cust.city} Sri Lanka`
                      )}`;

                  return (
                    <tr key={cust.id} className="hover:bg-amber-50/30 transition">
                      {/* Name & Business */}
                      <td className="px-4 py-3">
                        <div className="font-bold text-gray-900 text-sm">{cust.businessName}</div>
                        <div className="text-[11px] text-gray-600 mt-0.5">{cust.name}</div>
                        <div className="text-[10px] text-gray-400 font-mono mt-0.5">{cust.phone}</div>
                      </td>

                      {/* Location & Maps */}
                      <td className="px-4 py-3">
                        <div className="text-gray-800 font-medium">{cust.city}</div>
                        <div className="text-[10px] text-gray-500 line-clamp-1">{cust.address}</div>
                        <a
                          href={mapUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center space-x-1 text-[10px] text-amber-800 hover:text-amber-950 font-semibold underline mt-1"
                        >
                          <MapPin className="w-3 h-3 text-amber-600" />
                          <span>Open in Google Maps</span>
                        </a>
                      </td>

                      {/* Pricing tier */}
                      <td className="px-4 py-3">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                          {cust.pricingTier}
                        </span>
                      </td>

                      {/* Terms */}
                      <td className="px-4 py-3">
                        <span className="text-gray-700 font-medium">{cust.paymentTerms}</span>
                      </td>

                      {/* Credit limit */}
                      <td className="px-4 py-3 text-right font-mono text-gray-700">
                        Rs. {cust.creditLimit.toLocaleString()}
                      </td>

                      {/* Balance */}
                      <td className="px-4 py-3 text-right font-mono font-bold">
                        <span className={cust.currentBalance > 0 ? 'text-amber-900' : 'text-emerald-700'}>
                          Rs. {cust.currentBalance.toLocaleString()}
                        </span>
                      </td>

                      {/* Lifetime spend */}
                      <td className="px-4 py-3 text-right font-mono font-bold text-gray-900">
                        Rs. {cust.totalSpent.toLocaleString()}
                        <div className="text-[10px] text-gray-400 font-sans font-normal">
                          {cust.totalOrders} orders
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center space-x-1.5">
                          <button
                            onClick={() => setSelectedCustomerForDetail(cust)}
                            className="px-2 py-1 bg-amber-50 hover:bg-amber-100 text-amber-900 rounded text-xs font-semibold"
                          >
                            History
                          </button>

                          <button
                            onClick={() => setEditingCustomer({ ...cust })}
                            className="p-1.5 text-gray-600 hover:bg-gray-100 rounded transition"
                            title="Edit Account"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>

                          {isAdmin && (
                            <button
                              onClick={() => handleDeleteCustomerPrompt(cust)}
                              className="p-1.5 text-red-500 hover:bg-red-50 rounded transition"
                              title="Delete Account (Admin password required)"
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

      {/* Customer Detail & Order History Slide-over/Modal */}
      {selectedCustomerForDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full my-6 overflow-hidden border border-amber-200">
            <div className="bg-gradient-to-r from-amber-800 to-amber-950 px-6 py-4 flex items-center justify-between text-white">
              <div>
                <h3 className="font-bold text-base">{selectedCustomerForDetail.businessName}</h3>
                <p className="text-xs text-amber-200">Trade Ledger & Order History</p>
              </div>
              <button
                onClick={() => setSelectedCustomerForDetail(null)}
                aria-label="Close"
                className="text-amber-200 hover:text-white p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
              {/* Account Quick Stats */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div className="p-3 bg-gray-50 rounded-xl border border-gray-200">
                  <div className="text-gray-400">Total Lifetime Orders</div>
                  <div className="text-lg font-black text-gray-900 mt-0.5">
                    {selectedCustomerForDetail.totalOrders}
                  </div>
                </div>
                <div className="p-3 bg-gray-50 rounded-xl border border-gray-200">
                  <div className="text-gray-400">Lifetime Revenue</div>
                  <div className="text-lg font-black text-gray-900 font-mono mt-0.5">
                    Rs. {selectedCustomerForDetail.totalSpent.toLocaleString()}
                  </div>
                </div>
                <div className="p-3 bg-amber-50 rounded-xl border border-amber-200">
                  <div className="text-amber-800 font-bold">Outstanding Balance</div>
                  <div className="text-lg font-black text-amber-950 font-mono mt-0.5">
                    Rs. {selectedCustomerForDetail.currentBalance.toLocaleString()}
                  </div>
                </div>
                <div className="p-3 bg-gray-50 rounded-xl border border-gray-200">
                  <div className="text-gray-400">Credit Limit</div>
                  <div className="text-lg font-black text-gray-900 font-mono mt-0.5">
                    Rs. {selectedCustomerForDetail.creditLimit.toLocaleString()}
                  </div>
                </div>
              </div>

              {/* Order History */}
              <div>
                <h4 className="text-xs font-bold text-gray-800 uppercase tracking-wider mb-2">
                  Customer Order History ({customerOrders.length})
                </h4>
                {customerOrders.length === 0 ? (
                  <p className="p-6 text-center text-xs text-gray-500 bg-gray-50 rounded-xl border">
                    No orders placed yet for this account.
                  </p>
                ) : (
                  <div className="border border-gray-200 rounded-xl overflow-hidden">
                    <table className="min-w-full divide-y divide-gray-200 text-xs">
                      <thead className="bg-gray-50 font-bold uppercase text-gray-600">
                        <tr>
                          <th className="px-3 py-2 text-left">Invoice</th>
                          <th className="px-3 py-2 text-left">Date</th>
                          <th className="px-3 py-2 text-right">Items</th>
                          <th className="px-3 py-2 text-right">Net Total</th>
                          <th className="px-3 py-2 text-center">Status</th>
                          <th className="px-3 py-2 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {customerOrders.map((o) => (
                          <tr key={o.id} className="hover:bg-gray-50">
                            <td className="px-3 py-2 font-mono font-bold">{o.invoiceNumber}</td>
                            <td className="px-3 py-2 text-gray-500">{o.orderDate}</td>
                            <td className="px-3 py-2 text-right font-mono">{o.items.length}</td>
                            <td className="px-3 py-2 text-right font-mono font-bold">
                              Rs. {o.netTotal.toLocaleString()}
                            </td>
                            <td className="px-3 py-2 text-center">
                              <span
                                className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                  o.paymentStatus === 'Paid'
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : 'bg-amber-100 text-amber-800'
                                }`}
                              >
                                {o.paymentStatus}
                              </span>
                            </td>
                            <td className="px-3 py-2 text-right">
                              <button
                                onClick={() => setActiveOrderForView(o)}
                                className="text-amber-800 hover:text-amber-950 font-semibold underline text-xs"
                              >
                                View Invoice
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Customer Modal */}
      {editingCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full my-6 overflow-hidden border border-amber-200">
            <div className="bg-gradient-to-r from-amber-800 to-amber-950 px-6 py-4 flex items-center justify-between text-white">
              <h3 className="font-bold text-base">Edit Customer: {editingCustomer.businessName}</h3>
              <button
                onClick={() => setEditingCustomer(null)}
                aria-label="Close edit"
                className="text-amber-200 hover:text-white p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                    Business Name
                  </label>
                  <input
                    type="text"
                    required
                    value={editingCustomer.businessName}
                    onChange={(e) =>
                      setEditingCustomer({ ...editingCustomer, businessName: e.target.value })
                    }
                    className="w-full px-3 py-2 border rounded-lg text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                    Contact Person
                  </label>
                  <input
                    type="text"
                    required
                    value={editingCustomer.name}
                    onChange={(e) => setEditingCustomer({ ...editingCustomer, name: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                    Phone
                  </label>
                  <input
                    type="text"
                    value={editingCustomer.phone}
                    onChange={(e) => setEditingCustomer({ ...editingCustomer, phone: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                    Pricing Tier
                  </label>
                  <select
                    value={editingCustomer.pricingTier}
                    onChange={(e) =>
                      setEditingCustomer({ ...editingCustomer, pricingTier: e.target.value as PricingTier })
                    }
                    className="w-full px-3 py-2 border rounded-lg text-sm bg-white"
                  >
                    <option value="Distributor">Distributor</option>
                    <option value="Wholesale">Wholesale</option>
                    <option value="Retail">Retail</option>
                    <option value="Special">Special</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                    Credit Limit (Rs.)
                  </label>
                  <input
                    type="number"
                    value={editingCustomer.creditLimit}
                    onChange={(e) =>
                      setEditingCustomer({
                        ...editingCustomer,
                        creditLimit: parseFloat(e.target.value) || 0,
                      })
                    }
                    className="w-full px-3 py-2 border rounded-lg text-sm font-mono font-bold"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setEditingCustomer(null)}
                  className="px-4 py-2 border rounded-lg text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-amber-700 text-white rounded-lg text-xs font-bold"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

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
