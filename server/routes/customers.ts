import { Router } from 'express';
import { db } from '../db.ts';
import type { Customer } from '../../src/types/index.ts';

const router = Router();

// Get all customers
router.get('/', (req, res) => {
  const customers = db.getCustomers();
  res.json({ success: true, count: customers.length, customers });
});

// Get customer by ID with their full order history
router.get('/:id', (req, res) => {
  const customer = db.getCustomerById(req.params.id);
  if (!customer) {
    return res.status(404).json({ success: false, message: 'Customer not found' });
  }

  const customerOrders = db.getOrders().filter((o) => o.customerId === customer.id);
  res.json({ success: true, customer, orders: customerOrders });
});

// Create customer
router.post('/', (req, res) => {
  const data = req.body;
  if (!data.name || !data.businessName) {
    return res.status(400).json({ success: false, message: 'Contact Name and Business Name are required' });
  }

  const newCustomer: Customer = {
    id: `cust-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    name: data.name.trim(),
    businessName: data.businessName.trim(),
    email: data.email?.trim() || '',
    phone: data.phone?.trim() || '',
    address: data.address?.trim() || '',
    city: data.city?.trim() || 'Colombo',
    pricingTier: data.pricingTier || 'Distributor',
    paymentTerms: data.paymentTerms || 'Net 30',
    creditLimit: Number(data.creditLimit) || 100000,
    currentBalance: 0,
    referenceNumber: data.referenceNumber || `REF-${Math.floor(10000 + Math.random() * 90000)}`,
    notes: data.notes || '',
    coordinates: data.coordinates || {
      latitude: 6.9271, // Colombo default
      longitude: 79.8612,
    },
    totalOrders: 0,
    totalSpent: 0,
    createdAt: new Date().toISOString(),
  };

  db.addCustomer(newCustomer);
  res.status(201).json({ success: true, customer: newCustomer });
});

// Update customer
router.put('/:id', (req, res) => {
  const updated = db.updateCustomer(req.params.id, req.body);
  if (!updated) {
    return res.status(404).json({ success: false, message: 'Customer not found' });
  }
  res.json({ success: true, customer: updated });
});

// Delete customer
router.delete('/:id', (req, res) => {
  const { adminPassword } = req.body;
  const admin = db.getState().users.find((u) => u.role === 'admin');
  if (!admin || !db.verifyUserPassword(admin.id, adminPassword)) {
    return res.status(403).json({ success: false, message: 'Invalid admin confirmation password' });
  }

  const deleted = db.deleteCustomer(req.params.id);
  if (!deleted) {
    return res.status(404).json({ success: false, message: 'Customer not found' });
  }
  res.json({ success: true, message: 'Customer removed' });
});

export default router;
