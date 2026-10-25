import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateDistributorPrice,
  calculateMarkupPercentage,
  calculateProfitMargin,
  getVolumeDiscountTier,
  computeOrderCalculation,
  calculateItemPricingBreakdown,
} from './pricing.ts';
import type { OrderItem } from '../types/index.ts';

test('Distributor price calculation from cost and markup percentage', () => {
  const cost = 1000;
  const markup = 25; // 25% markup
  const distributorPrice = calculateDistributorPrice(cost, markup);
  assert.equal(distributorPrice, 1250);
});

test('Markup percentage calculation from cost and selling price', () => {
  const cost = 800;
  const selling = 1000;
  const markup = calculateMarkupPercentage(cost, selling);
  assert.equal(markup, 25);
});

test('Profit margin calculation', () => {
  const cost = 750;
  const selling = 1000;
  const margin = calculateProfitMargin(cost, selling);
  assert.equal(margin, 25);
});

test('Volume discount tier thresholds match requirements', () => {
  // < 5000 -> 0%
  assert.equal(getVolumeDiscountTier(4999).discountPercent, 0);
  // Rs. 5,000 -> 2%
  assert.equal(getVolumeDiscountTier(5000).discountPercent, 2);
  assert.equal(getVolumeDiscountTier(9999).discountPercent, 2);
  // Rs. 10,000 -> 3%
  assert.equal(getVolumeDiscountTier(10000).discountPercent, 3);
  assert.equal(getVolumeDiscountTier(19999).discountPercent, 3);
  // Rs. 20,000 -> 4%
  assert.equal(getVolumeDiscountTier(20000).discountPercent, 4);
  assert.equal(getVolumeDiscountTier(39999).discountPercent, 4);
  // Rs. 40,000 -> 5%
  assert.equal(getVolumeDiscountTier(40000).discountPercent, 5);
  assert.equal(getVolumeDiscountTier(49999).discountPercent, 5);
  // Rs. 50,000 -> 7%
  assert.equal(getVolumeDiscountTier(50000).discountPercent, 7);
  assert.equal(getVolumeDiscountTier(99999).discountPercent, 7);
  // Rs. 100,000 -> 10%
  assert.equal(getVolumeDiscountTier(100000).discountPercent, 10);
  assert.equal(getVolumeDiscountTier(250000).discountPercent, 10);
});

test('Order calculation breakdown provides line totals, volume discounts and net total with steps', () => {
  const sampleItems: OrderItem[] = [
    {
      productId: 'p1',
      productName: 'Ceylon Cinnamon Alba',
      sku: 'CIN-ALB-100G',
      packageSize: '100g',
      unitPrice: 1200,
      quantity: 5,
      costPrice: 900,
      lineTotal: 6000,
    },
    {
      productId: 'p2',
      productName: 'Black Pepper Special',
      sku: 'PEP-BLK-500G',
      packageSize: '500g',
      unitPrice: 2000,
      quantity: 3,
      costPrice: 1500,
      lineTotal: 6000,
    },
  ];

  // Subtotal = 5*1200 + 3*2000 = 6000 + 6000 = 12,000
  // Subtotal 12,000 qualifies for Rs. 10,000 tier (3%)
  // 3% of 12,000 = 360
  // Net Total = 12,000 - 360 = 11,640
  const breakdown = computeOrderCalculation(sampleItems);
  assert.equal(breakdown.itemsSubtotal, 12000);
  assert.equal(breakdown.volumeDiscountPercent, 3);
  assert.equal(breakdown.volumeDiscountAmount, 360);
  assert.equal(breakdown.taxAmount, 0);
  assert.equal(breakdown.netTotal, 11640);
  assert.ok(breakdown.steps.length >= 4);
});

test('calculateItemPricingBreakdown calculates base cost, markup, tier price, and margin steps', () => {
  const sampleProduct = {
    id: 'p1',
    name: 'Ceylon Cardamom Special',
    sku: 'CAR-SPC-100G',
    barcode: '89300000001',
    category: 'Whole Spices' as const,
    origin: 'Sri Lanka (Ceylon)',
    packageSize: '100g Pouch',
    stockOnHand: 50,
    initialStock: 50,
    reorderThreshold: 10,
    batchNumber: 'BATCH-2026-01',
    costPrice: 2000,
    distributorMarkupPercent: 25, // 25% markup on 2000 = 2500
    distributorPrice: 2500,
    wholesalePrice: 2700,
    mrp: 3200,
    createdAt: '',
    updatedAt: '',
  };

  const itemBreakdown = calculateItemPricingBreakdown(sampleProduct, 'Distributor', 4);
  assert.equal(itemBreakdown.baseCost, 2000);
  assert.equal(itemBreakdown.markupAmount, 500);
  assert.equal(itemBreakdown.finalUnitPrice, 2500);
  assert.equal(itemBreakdown.quantity, 4);
  assert.equal(itemBreakdown.lineTotal, 10000);
  assert.equal(itemBreakdown.unitProfit, 500);
  assert.equal(itemBreakdown.marginPercent, 20); // (500/2500)*100 = 20%
  assert.equal(itemBreakdown.totalProfit, 2000); // 4 * 500 = 2000
  assert.equal(itemBreakdown.calculationSteps.length, 5);
});

