import React, { useState } from 'react';
import { 
  BellRing, 
  CheckCheck, 
  Mail, 
  MessageSquare, 
  Send, 
  Clock, 
  AlertTriangle, 
  Receipt, 
  Database, 
  ExternalLink,
  Sparkles,
  CheckCircle2
} from 'lucide-react';
import { useApp } from '../context/AppContext.tsx';
import { api } from '../utils/api.ts';

export const NotificationsView: React.FC = () => {
  const { 
    notifications, 
    markNotificationRead, 
    markAllNotificationsRead, 
    customers, 
    orders, 
    setActiveTab, 
    addToast 
  } = useApp();

  const [filterType, setFilterType] = useState<string>('all');
  
  // Payment Reminder Screen State
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [selectedChannel, setSelectedChannel] = useState<'email' | 'sms'>('email');
  const [templateMessage, setTemplateMessage] = useState<string>('');
  const [isSending, setIsSending] = useState(false);

  // Filter customers who have an outstanding balance
  const customersWithBalance = customers.filter((c) => c.currentBalance > 0);

  // Set default message when customer is picked
  const handleSelectCustomer = (custId: string) => {
    setSelectedCustomerId(custId);
    const cust = customers.find((c) => c.id === custId);
    if (!cust) return;

    // Find their latest unpaid order
    const unpaidOrder = orders.find((o) => o.customerId === custId && o.paymentStatus !== 'Paid');
    const invoiceNum = unpaidOrder ? unpaidOrder.invoiceNumber : 'RECENT-STATEMENT';
    const dueDate = unpaidOrder ? unpaidOrder.dueDate : 'Immediate';

    if (selectedChannel === 'email') {
      setTemplateMessage(
        `Dear ${cust.businessName} (${cust.name}),\n\n` +
        `This is a courteous payment reminder from NA Distributors regarding outstanding invoice #${invoiceNum} ` +
        `for the amount of Rs. ${cust.currentBalance.toLocaleString('en-LK')}. ` +
        `As per your trade account terms (${cust.paymentTerms}), this balance is scheduled for settlement by ${dueDate}.\n\n` +
        `Bank Transfer Details:\n` +
        `Bank: Commercial Bank of Ceylon PLC\n` +
        `Account Name: NA Distributors (Pvt) Ltd\n` +
        `Account Number: 1000-8472-9182\n` +
        `Branch: Colombo Head Office\n\n` +
        `Please forward the bank deposit slip to accounts@nadistributors.lk once processed.\n\n` +
        `Sincerely,\nFinance & Recovery Desk\nNA Distributors`
      );
    } else {
      setTemplateMessage(
        `[NA DISTRIBUTORS] Payment Reminder: Dear ${cust.businessName}, your account balance of Rs. ${cust.currentBalance.toLocaleString()} for Inv #${invoiceNum} is due. Please settle via Commercial Bank A/C 100084729182. Contact: 0112345678.`
      );
    }
  };

  const handleChannelSwitch = (channel: 'email' | 'sms') => {
    setSelectedChannel(channel);
    if (selectedCustomerId) {
      const cust = customers.find((c) => c.id === selectedCustomerId);
      if (cust) {
        const unpaidOrder = orders.find((o) => o.customerId === selectedCustomerId && o.paymentStatus !== 'Paid');
        const invoiceNum = unpaidOrder ? unpaidOrder.invoiceNumber : 'RECENT-STATEMENT';
        const dueDate = unpaidOrder ? unpaidOrder.dueDate : 'Immediate';

        if (channel === 'email') {
          setTemplateMessage(
            `Dear ${cust.businessName} (${cust.name}),\n\n` +
            `This is a courteous payment reminder from NA Distributors regarding outstanding invoice #${invoiceNum} ` +
            `for the amount of Rs. ${cust.currentBalance.toLocaleString('en-LK')}. ` +
            `As per your trade account terms (${cust.paymentTerms}), this balance is scheduled for settlement by ${dueDate}.\n\n` +
            `Bank Transfer Details:\n` +
            `Bank: Commercial Bank of Ceylon PLC\n` +
            `Account Name: NA Distributors (Pvt) Ltd\n` +
            `Account Number: 1000-8472-9182\n` +
            `Branch: Colombo Head Office\n\n` +
            `Please forward the bank deposit slip to accounts@nadistributors.lk once processed.\n\n` +
            `Sincerely,\nFinance & Recovery Desk\nNA Distributors`
          );
        } else {
          setTemplateMessage(
            `[NA DISTRIBUTORS] Payment Reminder: Dear ${cust.businessName}, your account balance of Rs. ${cust.currentBalance.toLocaleString()} for Inv #${invoiceNum} is due. Please settle via Commercial Bank A/C 100084729182. Contact: 0112345678.`
          );
        }
      }
    }
  };

  const handleSendReminder = async () => {
    if (!selectedCustomerId) {
      addToast({ type: 'warning', title: 'Customer Required', message: 'Please select a customer with an outstanding balance' });
      return;
    }

    const cust = customers.find((c) => c.id === selectedCustomerId);
    if (!cust) return;

    try {
      setIsSending(true);
      const recipientContact = selectedChannel === 'email' ? cust.email || 'accounts@client.lk' : cust.phone || '+94770000000';
      await api.sendPaymentReminder({
        customerId: cust.id,
        invoiceNumber: 'INV-STATEMENT',
        amountDue: cust.currentBalance,
        channel: selectedChannel,
        recipientContact,
        templateMessage,
      });

      addToast({
        type: 'success',
        title: 'Payment Reminder Logged',
        message: `${selectedChannel.toUpperCase()} template recorded for ${cust.businessName}`,
      });

      setSelectedCustomerId('');
      setTemplateMessage('');
    } catch (err: any) {
      addToast({ type: 'error', title: 'Error', message: err.message });
    } finally {
      setIsSending(false);
    }
  };

  const filteredNotifications = notifications.filter((n) => {
    if (filterType === 'all') return true;
    return n.type === filterType;
  });

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-gray-200 shadow-xs">
        <div>
          <h1 className="text-xl font-black text-gray-900 tracking-tight flex items-center space-x-2">
            <span>Alerts, Reminders & Communication Desk</span>
            <span className="text-xs bg-amber-100 text-amber-900 font-bold px-2 py-0.5 rounded-full">
              Live Feed
            </span>
          </h1>
          <p className="text-xs text-gray-500 mt-1">
            Low stock inventory flags, sales order logs, payment reminders, and accounting activity.
          </p>
        </div>

        {notifications.length > 0 && (
          <button
            onClick={markAllNotificationsRead}
            className="px-3.5 py-2 bg-gray-50 hover:bg-gray-100 text-gray-700 border border-gray-300 rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition"
          >
            <CheckCheck className="w-4 h-4" />
            <span>Mark All as Read</span>
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column: Notification Center Feed */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-xs p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-gray-100 pb-3">
            <div className="flex items-center space-x-2">
              <BellRing className="w-5 h-5 text-amber-800" />
              <h3 className="text-sm font-bold text-gray-900">Notification Center</h3>
            </div>

            <div className="flex space-x-1 text-xs">
              {['all', 'low_stock', 'order', 'payment', 'sync'].map((ft) => (
                <button
                  key={ft}
                  onClick={() => setFilterType(ft)}
                  className={`px-2 py-1 rounded-md capitalize font-medium transition ${
                    filterType === ft
                      ? 'bg-amber-100 text-amber-900 font-bold'
                      : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100'
                  }`}
                >
                  {ft === 'all' ? 'All' : ft.replace('_', ' ')}
                </button>
              ))}
            </div>
          </div>

          {filteredNotifications.length === 0 ? (
            <div className="p-12 text-center text-xs text-gray-400">
              <BellRing className="w-8 h-8 text-gray-300 mx-auto mb-2" />
              No notifications matching this filter.
            </div>
          ) : (
            <div className="space-y-3 max-h-[500px] overflow-y-auto">
              {filteredNotifications.map((notif) => {
                const isStock = notif.type === 'low_stock';
                const isOrder = notif.type === 'order';
                const isPayment = notif.type === 'payment';
                const isSync = notif.type === 'sync';

                return (
                  <div
                    key={notif.id}
                    onClick={() => markNotificationRead(notif.id)}
                    className={`p-3.5 rounded-xl border transition cursor-pointer ${
                      !notif.read
                        ? 'bg-amber-50/50 border-amber-200 shadow-xs'
                        : 'bg-white border-gray-100 opacity-80'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-start space-x-2.5">
                        <div
                          className={`p-1.5 rounded-lg shrink-0 mt-0.5 ${
                            isStock
                              ? 'bg-red-100 text-red-700'
                              : isOrder
                              ? 'bg-emerald-100 text-emerald-700'
                              : isPayment
                              ? 'bg-blue-100 text-blue-700'
                              : 'bg-purple-100 text-purple-700'
                          }`}
                        >
                          {isStock && <AlertTriangle className="w-4 h-4" />}
                          {isOrder && <Receipt className="w-4 h-4" />}
                          {isPayment && <Mail className="w-4 h-4" />}
                          {isSync && <Database className="w-4 h-4" />}
                        </div>
                        <div>
                          <h4 className="text-xs font-bold text-gray-900">{notif.title}</h4>
                          <p className="text-xs text-gray-600 mt-0.5 leading-relaxed">{notif.message}</p>
                          <div className="text-[10px] text-gray-400 mt-1 font-mono">
                            {new Date(notif.timestamp).toLocaleString()}
                          </div>
                        </div>
                      </div>

                      {notif.linkTab && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveTab(notif.linkTab as any);
                          }}
                          className="text-[11px] text-amber-800 hover:text-amber-950 font-bold shrink-0 underline"
                        >
                          View →
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Column: Payment Reminder Desk */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-xs p-6 space-y-4">
          <div className="flex items-center space-x-2 border-b border-gray-100 pb-3">
            <Mail className="w-5 h-5 text-amber-800" />
            <div>
              <h3 className="text-sm font-bold text-gray-900">Payment Reminder Screen</h3>
              <p className="text-[11px] text-gray-500">Draft and dispatch structured payment follow-ups</p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                Select Customer with Balance Due
              </label>
              {customersWithBalance.length === 0 ? (
                <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-semibold flex items-center space-x-2">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>All customer accounts are currently fully settled (Zero receivables).</span>
                </div>
              ) : (
                <select
                  value={selectedCustomerId}
                  onChange={(e) => handleSelectCustomer(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-xl text-xs focus:ring-2 focus:ring-amber-500 outline-hidden bg-white font-medium"
                >
                  <option value="">-- Choose Account with Outstanding Balance --</option>
                  {customersWithBalance.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.businessName} - Outstanding: Rs. {c.currentBalance.toLocaleString()} ({c.paymentTerms})
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Channel switch */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                Communication Format
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => handleChannelSwitch('email')}
                  className={`py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center space-x-1.5 border transition ${
                    selectedChannel === 'email'
                      ? 'bg-amber-800 text-white border-amber-900 shadow-xs'
                      : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
                  }`}
                >
                  <Mail className="w-4 h-4" />
                  <span>Email Statement</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleChannelSwitch('sms')}
                  className={`py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center space-x-1.5 border transition ${
                    selectedChannel === 'sms'
                      ? 'bg-amber-800 text-white border-amber-900 shadow-xs'
                      : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
                  }`}
                >
                  <MessageSquare className="w-4 h-4" />
                  <span>SMS Quick Notice</span>
                </button>
              </div>
            </div>

            {/* Editable Template Area */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Editable Message Template
                </label>
                <span className="text-[10px] text-gray-400">Customizable before recording</span>
              </div>
              <textarea
                rows={8}
                value={templateMessage}
                onChange={(e) => setTemplateMessage(e.target.value)}
                placeholder="Select a customer above to auto-populate statement template..."
                className="w-full p-3 border border-gray-300 rounded-xl text-xs font-mono leading-relaxed focus:ring-2 focus:ring-amber-500 outline-hidden bg-gray-50/60"
              />
            </div>

            <button
              type="button"
              onClick={handleSendReminder}
              disabled={isSending || !selectedCustomerId}
              className="w-full py-2.5 bg-gradient-to-r from-amber-700 to-amber-900 hover:from-amber-800 hover:to-amber-950 text-white rounded-xl text-xs font-bold flex items-center justify-center space-x-1.5 shadow-md transition disabled:opacity-40"
            >
              <Send className="w-4 h-4" />
              <span>{isSending ? 'Recording Dispatch...' : 'Dispatch Payment Reminder & Log Alert'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
