import type { CalculationBreakdown, OrderItem, PricingTier, Product } from '../types/index.ts';

export const DEFAULT_VOLUME_DISCOUNT_TIERS = [
  { minTotal: 100000, discountPercent: 10, label: 'Mega Order Tier (Rs. 100,000+)' },
  { minTotal: 50000, discountPercent: 7, label: 'Bulk Wholesale Tier (Rs. 50,000+)' },
  { minTotal: 40000, discountPercent: 5, label: 'High Volume Tier (Rs. 40,000+)' },
  { minTotal: 20000, discountPercent: 4, label: 'Trade Tier (Rs. 20,000+)' },
  { minTotal: 10000, discountPercent: 3, label: 'Distributor Tier (Rs. 10,000+)' },
  { minTotal: 5000, discountPercent: 2, label: 'Standard Discount Tier (Rs. 5,000+)' },
];

/**
 * Returns the effective unit price of a product for a specific pricing tier.
 */
export function getProductTierPrice(product: Product, tier: PricingTier): number {
  switch (tier) {
    case 'Distributor':
      return product.distributorPrice || product.wholesalePrice || product.mrp;
    case 'Wholesale':
      return product.wholesalePrice || product.mrp;
    case 'Retail':
      return product.mrp;
    case 'Special':
      // 5% additional discount on distributor price or wholesale
      return Math.round((product.distributorPrice || product.wholesalePrice) * 0.95);
    default:
      return product.distributorPrice;
  }
}

/**
 * Calculates distributor markup rate from cost price.
 * distributorPrice = costPrice * (1 + markupPercent / 100)
 */
export function calculateDistributorPrice(costPrice: number, markupPercent: number): number {
  if (costPrice <= 0) return 0;
  return Math.round((costPrice * (1 + markupPercent / 100)) * 100) / 100;
}

/**
 * Calculates markup percentage from cost price and selling price.
 */
export function calculateMarkupPercentage(costPrice: number, sellingPrice: number): number {
  if (costPrice <= 0) return 0;
  const markup = ((sellingPrice - costPrice) / costPrice) * 100;
  return Math.round(markup * 10) / 10;
}

/**
 * Calculates gross profit margin percentage: ((sellingPrice - costPrice) / sellingPrice) * 100
 */
export function calculateProfitMargin(costPrice: number, sellingPrice: number): number {
  if (sellingPrice <= 0) return 0;
  const margin = ((sellingPrice - costPrice) / sellingPrice) * 100;
  return Math.round(margin * 10) / 10;
}

/**
 * Finds the volume discount tier matching the given order subtotal.
 */
export function getVolumeDiscountTier(subtotal: number, tiers = DEFAULT_VOLUME_DISCOUNT_TIERS) {
  // Sort descending by minTotal
  const sorted = [...tiers].sort((a, b) => b.minTotal - a.minTotal);
  for (const tier of sorted) {
    if (subtotal >= tier.minTotal) {
      return tier;
    }
  }
  return { minTotal: 0, discountPercent: 0, label: 'Standard (No volume discount below Rs. 5,000)' };
}

/**
 * Computes transparent step-by-step calculation breakdown for an order.
 * Shows exactly how each item is calculated and how total volume discount is deducted.
 */
export function computeOrderCalculation(
  items: OrderItem[],
  tiers = DEFAULT_VOLUME_DISCOUNT_TIERS
): CalculationBreakdown {
  const steps: string[] = [];

  let itemsSubtotal = 0;
  items.forEach((item, index) => {
    const itemTotal = Math.round(item.quantity * item.unitPrice * 100) / 100;
    itemsSubtotal += itemTotal;
    steps.push(
      `Item #${index + 1} (${item.productName} - ${item.packageSize}): ${item.quantity} units @ Rs. ${item.unitPrice.toLocaleString('en-LK', { minimumFractionDigits: 2 })} = Rs. ${itemTotal.toLocaleString('en-LK', { minimumFractionDigits: 2 })}`
    );
  });

  itemsSubtotal = Math.round(itemsSubtotal * 100) / 100;
  steps.push(`Gross Subtotal = Rs. ${itemsSubtotal.toLocaleString('en-LK', { minimumFractionDigits: 2 })}`);

  const activeTier = getVolumeDiscountTier(itemsSubtotal, tiers);
  const volumeDiscountAmount = Math.round((itemsSubtotal * (activeTier.discountPercent / 100)) * 100) / 100;

  if (activeTier.discountPercent > 0) {
    steps.push(
      `Volume Discount Qualified: ${activeTier.label} -> ${activeTier.discountPercent}% of Rs. ${itemsSubtotal.toLocaleString('en-LK', { minimumFractionDigits: 2 })} = -Rs. ${volumeDiscountAmount.toLocaleString('en-LK', { minimumFractionDigits: 2 })}`
    );
  } else {
    steps.push(`Order subtotal does not reach the Rs. 5,000 threshold for volume discount (0% applied)`);
  }

  const taxAmount = 0; // Tax is 0% as per requirements
  steps.push(`Tax Rate: 0.00% (No tax added to new orders)`);

  const netTotal = Math.round((itemsSubtotal - volumeDiscountAmount) * 100) / 100;
  steps.push(`Final Invoice Total = Rs. ${itemsSubtotal.toLocaleString('en-LK', { minimumFractionDigits: 2 })} - Rs. ${volumeDiscountAmount.toLocaleString('en-LK', { minimumFractionDigits: 2 })} = Rs. ${netTotal.toLocaleString('en-LK', { minimumFractionDigits: 2 })}`);

  return {
    itemsSubtotal,
    volumeTierName: activeTier.label,
    volumeDiscountPercent: activeTier.discountPercent,
    volumeDiscountAmount,
    manualDiscountPercent: 0,
    manualDiscountAmount: 0,
    taxAmount,
    netTotal,
    steps,
  };
}

export interface ItemPricingBreakdown {
  productId: string;
  productName: string;
  sku: string;
  packageSize: string;
  baseCost: number;
  distributorMarkupPercent: number;
  markupAmount: number;
  distributorPrice: number;
  wholesalePrice: number;
  mrp: number;
  appliedTier: PricingTier;
  finalUnitPrice: number;
  quantity: number;
  lineTotal: number;
  unitProfit: number;
  marginPercent: number;
  totalProfit: number;
  calculationSteps: string[];
}

/**
 * Computes individual item pricing lineage from base cost through markup,
 * customer tier adjustment, and line quantity.
 */
export function calculateItemPricingBreakdown(
  product: Product,
  tier: PricingTier,
  quantity: number = 1
): ItemPricingBreakdown {
  const baseCost = product.costPrice || 0;
  const markupPercent = product.distributorMarkupPercent || 20;
  const markupAmount = Math.round((baseCost * (markupPercent / 100)) * 100) / 100;
  const distPrice = product.distributorPrice || calculateDistributorPrice(baseCost, markupPercent);
  const wholesalePrice = product.wholesalePrice || Math.round(baseCost * 1.3);
  const mrp = product.mrp || Math.round(baseCost * 1.6);
  const finalUnitPrice = getProductTierPrice(product, tier);
  const safeQty = Math.max(1, quantity);
  const lineTotal = Math.round(finalUnitPrice * safeQty * 100) / 100;
  const unitProfit = Math.round((finalUnitPrice - baseCost) * 100) / 100;
  const marginPercent =
    finalUnitPrice > 0 ? Math.round(((finalUnitPrice - baseCost) / finalUnitPrice) * 1000) / 10 : 0;
  const totalProfit = Math.round(unitProfit * safeQty * 100) / 100;

  const calculationSteps = [
    `Base Product Cost: Rs. ${baseCost.toLocaleString('en-LK', { minimumFractionDigits: 2 })}`,
    `Distributor Markup (+${markupPercent}%): +Rs. ${markupAmount.toLocaleString('en-LK', { minimumFractionDigits: 2 })} -> Benchmark: Rs. ${distPrice.toLocaleString('en-LK', { minimumFractionDigits: 2 })}`,
    `Tier Selected: ${tier} -> Final Unit Price: Rs. ${finalUnitPrice.toLocaleString('en-LK', { minimumFractionDigits: 2 })} (Wholesale: Rs. ${wholesalePrice.toLocaleString()}, MRP: Rs. ${mrp.toLocaleString()})`,
    `Line Math: ${safeQty} units × Rs. ${finalUnitPrice.toLocaleString('en-LK', { minimumFractionDigits: 2 })} = Line Total: Rs. ${lineTotal.toLocaleString('en-LK', { minimumFractionDigits: 2 })}`,
    `Unit Margin: Rs. ${unitProfit.toLocaleString('en-LK', { minimumFractionDigits: 2 })} (${marginPercent}%) | Total Net Margin: Rs. ${totalProfit.toLocaleString('en-LK', { minimumFractionDigits: 2 })}`,
  ];

  return {
    productId: product.id,
    productName: product.name,
    sku: product.sku,
    packageSize: product.packageSize,
    baseCost,
    distributorMarkupPercent: markupPercent,
    markupAmount,
    distributorPrice: distPrice,
    wholesalePrice,
    mrp,
    appliedTier: tier,
    finalUnitPrice,
    quantity: safeQty,
    lineTotal,
    unitProfit,
    marginPercent,
    totalProfit,
    calculationSteps,
  };
}
