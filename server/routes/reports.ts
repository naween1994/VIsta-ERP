import { Router } from 'express';
import { db } from '../db.ts';

const router = Router();

router.get('/summary', (req, res) => {
  const range = (req.query.range as string) || '30d'; // '7d' | '30d' | '90d' | 'all' | 'custom'
  const startDateStr = req.query.startDate as string;
  const endDateStr = req.query.endDate as string;

  const now = new Date();
  let filterStart: Date;

  if (range === '7d') {
    filterStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  } else if (range === '90d') {
    filterStart = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
  } else if (range === 'custom' && startDateStr) {
    filterStart = new Date(startDateStr);
  } else if (range === 'all') {
    filterStart = new Date(0);
  } else {
    // 30d default
    filterStart = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  }

  const filterEnd = range === 'custom' && endDateStr ? new Date(endDateStr) : now;

  const allOrders = db.getOrders();
  const filteredOrders = allOrders.filter((order) => {
    if (order.paymentStatus === 'Cancelled') return false;
    const orderDate = new Date(order.orderDate);
    return orderDate >= filterStart && orderDate <= filterEnd;
  });

  let totalRevenue = 0;
  let totalCogs = 0;
  let totalCollected = 0;
  let totalOutstanding = 0;

  const productSalesMap = new Map<string, {
    productId: string;
    productName: string;
    sku: string;
    quantitySold: number;
    revenue: number;
    cogs: number;
  }>();

  const customerSpendMap = new Map<string, {
    customerId: string;
    customerName: string;
    customerBusiness: string;
    ordersCount: number;
    totalSpend: number;
  }>();

  for (const order of filteredOrders) {
    totalRevenue += order.netTotal;
    totalCollected += order.paidAmount || 0;
    totalOutstanding += Math.max(0, order.netTotal - (order.paidAmount || 0));

    // Order items
    for (const item of order.items) {
      const itemCostTotal = (item.costPrice || 0) * item.quantity;
      totalCogs += itemCostTotal;

      const existingProd = productSalesMap.get(item.productId) || {
        productId: item.productId,
        productName: item.productName,
        sku: item.sku,
        quantitySold: 0,
        revenue: 0,
        cogs: 0,
      };

      existingProd.quantitySold += item.quantity;
      existingProd.revenue += item.lineTotal;
      existingProd.cogs += itemCostTotal;
      productSalesMap.set(item.productId, existingProd);
    }

    // Customer
    const existingCust = customerSpendMap.get(order.customerId) || {
      customerId: order.customerId,
      customerName: order.customerName,
      customerBusiness: order.customerBusiness,
      ordersCount: 0,
      totalSpend: 0,
    };
    existingCust.ordersCount += 1;
    existingCust.totalSpend += order.netTotal;
    customerSpendMap.set(order.customerId, existingCust);
  }

  const grossProfit = Math.round((totalRevenue - totalCogs) * 100) / 100;
  const profitMarginPercent = totalRevenue > 0 ? Math.round((grossProfit / totalRevenue) * 1000) / 10 : 0;

  // Best selling products
  const topProducts = Array.from(productSalesMap.values())
    .map((p) => {
      const profit = p.revenue - p.cogs;
      const margin = p.revenue > 0 ? Math.round((profit / p.revenue) * 1000) / 10 : 0;
      return {
        ...p,
        grossProfit: Math.round(profit * 100) / 100,
        marginPercent: margin,
      };
    })
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 10);

  // Top customers
  const topCustomers = Array.from(customerSpendMap.values())
    .sort((a, b) => b.totalSpend - a.totalSpend)
    .slice(0, 10);

  // Inventory valuation
  const products = db.getProducts();
  let totalInventoryCostValue = 0;
  let totalInventoryMrpValue = 0;
  let lowStockCount = 0;

  products.forEach((p) => {
    totalInventoryCostValue += p.stockOnHand * p.costPrice;
    totalInventoryMrpValue += p.stockOnHand * p.mrp;
    if (p.stockOnHand <= p.reorderThreshold) {
      lowStockCount++;
    }
  });

  res.json({
    success: true,
    range,
    summary: {
      totalOrders: filteredOrders.length,
      totalRevenue: Math.round(totalRevenue * 100) / 100,
      totalCogs: Math.round(totalCogs * 100) / 100,
      grossProfit,
      profitMarginPercent,
      totalCollected: Math.round(totalCollected * 100) / 100,
      totalOutstanding: Math.round(totalOutstanding * 100) / 100,
      totalInventoryCostValue: Math.round(totalInventoryCostValue * 100) / 100,
      totalInventoryMrpValue: Math.round(totalInventoryMrpValue * 100) / 100,
      totalProductCount: products.length,
      lowStockCount,
    },
    topProducts,
    topCustomers,
    recentOrders: filteredOrders.slice(0, 5),
  });
});

export default router;
