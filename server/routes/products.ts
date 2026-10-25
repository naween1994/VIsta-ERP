import { Router } from 'express';
import { db } from '../db.ts';
import type { Product } from '../../src/types/index.ts';

const router = Router();

// Get all products
router.get('/', (req, res) => {
  const products = db.getProducts();
  res.json({ success: true, count: products.length, products });
});

// Lookup product by barcode or SKU
router.get('/lookup', (req, res) => {
  const code = (req.query.code as string) || '';
  if (!code) {
    return res.status(400).json({ success: false, message: 'Scan or code parameter required' });
  }

  const product = db.getProductByBarcodeOrSku(code);
  if (!product) {
    return res.status(404).json({ success: false, message: `No product found matching code: "${code}"` });
  }

  res.json({ success: true, product });
});

// Get product by id
router.get('/:id', (req, res) => {
  const product = db.getProductById(req.params.id);
  if (!product) {
    return res.status(404).json({ success: false, message: 'Product not found' });
  }
  res.json({ success: true, product });
});

// Create new product
router.post('/', (req, res) => {
  const data = req.body;
  if (!data.name || !data.sku) {
    return res.status(400).json({ success: false, message: 'Name and SKU are required' });
  }

  // Check unique SKU
  const existingSku = db.getProducts().find((p) => p.sku.toLowerCase() === data.sku.toLowerCase());
  if (existingSku) {
    return res.status(400).json({ success: false, message: `SKU "${data.sku}" already exists` });
  }

  const initialStock = Number(data.initialStock) || Number(data.stockOnHand) || 0;
  const costPrice = Number(data.costPrice) || 0;
  const distributorMarkupPercent = Number(data.distributorMarkupPercent) || 20;
  const calculatedDistributorPrice = data.distributorPrice 
    ? Number(data.distributorPrice) 
    : Math.round(costPrice * (1 + distributorMarkupPercent / 100));

  const newProduct: Product = {
    id: `prod-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    name: data.name.trim(),
    sku: data.sku.trim().toUpperCase(),
    barcode: (data.barcode || data.sku).trim().toUpperCase(),
    category: data.category || 'Whole Spices',
    origin: data.origin || 'Sri Lanka',
    grade: data.grade || 'Standard',
    packageSize: data.packageSize || '100g',
    stockOnHand: initialStock,
    initialStock,
    reorderThreshold: Number(data.reorderThreshold) || 10,
    batchNumber: data.batchNumber || `BATCH-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
    lotValuation: Number(data.lotValuation) || (initialStock * costPrice),
    costPrice,
    mrp: Number(data.mrp) || Math.round(costPrice * 1.5),
    wholesalePrice: Number(data.wholesalePrice) || Math.round(costPrice * 1.3),
    distributorPrice: calculatedDistributorPrice,
    distributorMarkupPercent,
    description: data.description || '',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  db.addProduct(newProduct);
  res.status(201).json({ success: true, product: newProduct });
});

// Update product
router.put('/:id', (req, res) => {
  const updated = db.updateProduct(req.params.id, req.body);
  if (!updated) {
    return res.status(404).json({ success: false, message: 'Product not found' });
  }
  res.json({ success: true, product: updated });
});

// Quick restock product
router.post('/:id/quick-restock', (req, res) => {
  const { quantity, note, userName } = req.body;
  const addQty = Number(quantity);
  if (isNaN(addQty) || addQty <= 0) {
    return res.status(400).json({ success: false, message: 'Valid positive restock quantity required' });
  }

  const product = db.getProductById(req.params.id);
  if (!product) {
    return res.status(404).json({ success: false, message: 'Product not found' });
  }

  const prevStock = product.stockOnHand;
  const newStock = prevStock + addQty;

  db.addStockAdjustment({
    id: `adj-${Date.now()}`,
    productId: product.id,
    productName: product.name,
    sku: product.sku,
    previousStock: prevStock,
    adjustmentQty: addQty,
    newStock,
    reason: 'Restock',
    note: note || 'Quick restock',
    createdBy: userName || 'Inventory Manager',
    createdAt: new Date().toISOString(),
  });

  const updated = db.getProductById(product.id);
  res.json({ success: true, product: updated, previousStock: prevStock, newStock });
});

// Custom stock adjustment (add or deduct with reason)
router.post('/:id/adjust-stock', (req, res) => {
  const { adjustmentQty, reason, note, userName } = req.body;
  const qty = Number(adjustmentQty);
  if (isNaN(qty) || qty === 0) {
    return res.status(400).json({ success: false, message: 'Adjustment quantity cannot be 0' });
  }

  const product = db.getProductById(req.params.id);
  if (!product) {
    return res.status(404).json({ success: false, message: 'Product not found' });
  }

  const prevStock = product.stockOnHand;
  const newStock = Math.max(0, prevStock + qty);

  const adjustment = db.addStockAdjustment({
    id: `adj-${Date.now()}`,
    productId: product.id,
    productName: product.name,
    sku: product.sku,
    previousStock: prevStock,
    adjustmentQty: qty,
    newStock,
    reason: reason || 'Cycle Count',
    note: note || '',
    createdBy: userName || 'Staff',
    createdAt: new Date().toISOString(),
  });

  const updated = db.getProductById(product.id);
  res.json({ success: true, product: updated, adjustment });
});

// Get stock adjustment history
router.get('/history/adjustments', (req, res) => {
  res.json({ success: true, adjustments: db.getStockAdjustments() });
});

// Delete product (Protected with admin password)
router.delete('/:id', (req, res) => {
  const { adminPassword } = req.body;
  const admin = db.getState().users.find((u) => u.role === 'admin');
  if (admin?.password && admin.password !== adminPassword) {
    return res.status(403).json({ success: false, message: 'Invalid admin confirmation password' });
  }

  const deleted = db.deleteProduct(req.params.id);
  if (!deleted) {
    return res.status(404).json({ success: false, message: 'Product not found' });
  }
  res.json({ success: true, message: 'Product deleted' });
});

// Reset entire catalog (Admin only)
router.post('/reset-catalog', (req, res) => {
  const { adminPassword } = req.body;
  const admin = db.getState().users.find((u) => u.role === 'admin');
  if (admin?.password && admin.password !== adminPassword) {
    return res.status(403).json({ success: false, message: 'Invalid admin confirmation password' });
  }

  db.resetProductsCatalog();
  res.json({ success: true, message: 'Product catalog reset successfully. Inventory is now empty.' });
});

export default router;
