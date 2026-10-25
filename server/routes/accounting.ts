import { Router } from 'express';
import { db } from '../db.ts';

const router = Router();

// Get sync history logs
router.get('/logs', (req, res) => {
  res.json({ success: true, logs: db.getAccountingLogs() });
});

// Export QuickBooks-style JSON
router.get('/export/quickbooks', (req, res) => {
  const orders = db.getOrders();
  const customers = db.getCustomers();
  const products = db.getProducts();

  const qbInvoices = orders.map((order) => ({
    DocNumber: order.invoiceNumber,
    TxnDate: order.orderDate,
    DueDate: order.dueDate,
    CustomerRef: {
      value: order.customerId,
      name: order.customerBusiness || order.customerName,
    },
    Line: order.items.map((item, idx) => ({
      LineNum: idx + 1,
      Description: `${item.productName} (${item.sku} - ${item.packageSize})`,
      Amount: item.lineTotal,
      DetailType: 'SalesItemLineDetail',
      SalesItemLineDetail: {
        ItemRef: { value: item.productId, name: item.productName },
        UnitPrice: item.unitPrice,
        Qty: item.quantity,
      },
    })),
    TotalAmt: order.netTotal,
    DiscountAmt: order.volumeDiscountAmount,
    Balance: Math.max(0, order.netTotal - (order.paidAmount || 0)),
  }));

  const payload = {
    exportType: 'QuickBooks Online Sales Batch',
    generatedAt: new Date().toISOString(),
    company: 'NA Distributors',
    currency: 'LKR',
    InvoiceCount: qbInvoices.length,
    CustomersCount: customers.length,
    ProductsCount: products.length,
    Invoices: qbInvoices,
  };

  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Content-Disposition', 'attachment; filename=quickbooks_na_distributors.json');
  res.send(JSON.stringify(payload, null, 2));
});

// Export Xero-compatible CSV
router.get('/export/xero', (req, res) => {
  const orders = db.getOrders();

  const headers = [
    '*ContactName',
    'EmailAddress',
    'POAddressLine1',
    '*InvoiceNumber',
    'Reference',
    '*InvoiceDate',
    '*DueDate',
    'Total',
    'InventoryItemCode',
    '*Description',
    '*Quantity',
    '*UnitAmount',
    '*AccountCode',
    '*TaxType',
  ];

  const rows: string[] = [headers.join(',')];

  for (const order of orders) {
    const cust = db.getCustomerById(order.customerId);
    const contactName = `"${(order.customerBusiness || order.customerName || '').replace(/"/g, '""')}"`;
    const email = `"${cust?.email || ''}"`;
    const address = `"${(cust?.address || '').replace(/"/g, '""')}"`;

    if (order.items.length === 0) {
      rows.push([
        contactName,
        email,
        address,
        order.invoiceNumber,
        '',
        order.orderDate,
        order.dueDate,
        order.netTotal.toFixed(2),
        '',
        '"Invoice Total"',
        '1',
        order.netTotal.toFixed(2),
        '200', // Sales Revenue account
        'NONE',
      ].join(','));
    } else {
      order.items.forEach((item) => {
        rows.push([
          contactName,
          email,
          address,
          order.invoiceNumber,
          '',
          order.orderDate,
          order.dueDate,
          order.netTotal.toFixed(2),
          `"${item.sku}"`,
          `"${(item.productName || '').replace(/"/g, '""')} (${item.packageSize})"`,
          item.quantity,
          item.unitPrice.toFixed(2),
          '200',
          'NONE',
        ].join(','));
      });
    }
  }

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename=xero_sales_na_distributors.csv');
  res.send(rows.join('\n'));
});

// Simulate sync to accounting software
router.post('/sync', (req, res) => {
  const { target, userName } = req.body; // 'QuickBooks' | 'Xero'
  const orders = db.getOrders();

  const log = db.addAccountingLog({
    id: `sync-${Date.now()}`,
    timestamp: new Date().toISOString(),
    target: target === 'Xero' ? 'Xero' : 'QuickBooks',
    recordsSynced: orders.length,
    status: 'Simulated',
    details: `Simulated sync completed. Exported ${orders.length} orders & invoices matching ${target} ledger chart of accounts.`,
    user: userName || 'Admin',
  });

  db.addNotification({
    id: `notif-sync-${Date.now()}`,
    title: `${target} Sync Completed`,
    message: `Batch sync executed: ${orders.length} transaction records processed.`,
    type: 'sync',
    timestamp: new Date().toISOString(),
    read: false,
    linkTab: 'accounting',
  });

  res.json({ success: true, log });
});

export default router;
