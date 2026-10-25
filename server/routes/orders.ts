import { Router } from 'express';
import { db } from '../db.ts';
import type { Order, OrderItem } from '../../src/types/index.ts';
import { computeOrderCalculation } from '../../src/utils/pricing.ts';

const router = Router();

// Get all orders
router.get('/', (req, res) => {
  const orders = db.getOrders();
  res.json({ success: true, count: orders.length, orders });
});

// Get order by ID
router.get('/:id', (req, res) => {
  const order = db.getOrderById(req.params.id);
  if (!order) {
    return res.status(404).json({ success: false, message: 'Order not found' });
  }
  res.json({ success: true, order });
});

// Create new sales order and invoice
router.post('/', (req, res) => {
  const data = req.body;
  if (!data.customerId || !data.items || !Array.isArray(data.items) || data.items.length === 0) {
    return res.status(400).json({ success: false, message: 'Customer and at least one item are required' });
  }

  const customer = db.getCustomerById(data.customerId);
  if (!customer) {
    return res.status(404).json({ success: false, message: 'Customer not found' });
  }

  // Validate quantities against stock
  const validatedItems: OrderItem[] = [];
  for (const rawItem of data.items) {
    const product = db.getProductById(rawItem.productId);
    if (!product) {
      return res.status(400).json({ success: false, message: `Product ${rawItem.productId} not found` });
    }

    const requestedQty = Number(rawItem.quantity);
    if (isNaN(requestedQty) || requestedQty <= 0) {
      return res.status(400).json({ success: false, message: `Invalid quantity for ${product.name}` });
    }

    if (requestedQty > product.stockOnHand) {
      return res.status(400).json({
        success: false,
        message: `Insufficient stock for "${product.name}". Requested: ${requestedQty}, Available on hand: ${product.stockOnHand}`,
      });
    }

    const unitPrice = Number(rawItem.unitPrice) || product.distributorPrice;
    validatedItems.push({
      productId: product.id,
      productName: product.name,
      sku: product.sku,
      packageSize: product.packageSize,
      unitPrice,
      quantity: requestedQty,
      costPrice: product.costPrice,
      lineTotal: Math.round(unitPrice * requestedQty * 100) / 100,
    });
  }

  // Compute calculation breakdown and volume discount
  const breakdown = computeOrderCalculation(validatedItems);

  // Auto-generate invoice number
  const existingOrdersCount = db.getOrders().length;
  const invoiceNumber = `INV-${new Date().getFullYear()}-${String(existingOrdersCount + 1001).padStart(5, '0')}`;

  const todayStr = new Date().toISOString().split('T')[0];
  const dueDate = data.dueDate || todayStr;

  const newOrder: Order = {
    id: `ord-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    invoiceNumber,
    customerId: customer.id,
    customerName: customer.name,
    customerBusiness: customer.businessName,
    orderDate: data.orderDate || todayStr,
    dueDate,
    pricingTier: data.pricingTier || customer.pricingTier,
    items: validatedItems,
    subtotal: breakdown.itemsSubtotal,
    volumeDiscountPercent: breakdown.volumeDiscountPercent,
    volumeDiscountAmount: breakdown.volumeDiscountAmount,
    netTotal: breakdown.netTotal,
    paidAmount: Number(data.paidAmount) || 0,
    paymentStatus: data.paymentStatus || (Number(data.paidAmount) >= breakdown.netTotal ? 'Paid' : 'Pending'),
    paymentMethod: data.paymentMethod || 'Bank Transfer',
    notes: data.notes || '',
    calculationBreakdown: breakdown,
    createdBy: data.createdBy || 'Sales Rep',
    createdAt: new Date().toISOString(),
  };

  db.addOrder(newOrder);
  res.status(201).json({ success: true, order: newOrder });
});

// Update order (e.g. payment status, notes, paid amount)
router.put('/:id', (req, res) => {
  const updated = db.updateOrder(req.params.id, req.body);
  if (!updated) {
    return res.status(404).json({ success: false, message: 'Order not found' });
  }
  res.json({ success: true, order: updated });
});

// Delete order (Admin only)
router.delete('/:id', (req, res) => {
  const { adminPassword } = req.body;
  const admin = db.getState().users.find((u) => u.role === 'admin');
  if (!admin || !db.verifyUserPassword(admin.id, adminPassword)) {
    return res.status(403).json({ success: false, message: 'Invalid admin confirmation password' });
  }

  const deleted = db.deleteOrder(req.params.id);
  if (!deleted) {
    return res.status(404).json({ success: false, message: 'Order not found' });
  }
  res.json({ success: true, message: 'Order removed' });
});

export default router;
