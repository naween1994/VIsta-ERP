import React, { useState, useEffect } from 'react';
import { 
  X, 
  Plus, 
  Trash2, 
  Calculator, 
  Receipt, 
  Sparkles, 
  AlertCircle,
  HelpCircle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  TrendingUp,
  ArrowRight
} from 'lucide-react';
import { useApp } from '../../context/AppContext.tsx';
import { useAuth } from '../../context/AuthContext.tsx';
import { PricingTier, PaymentMethod, PaymentTerms, OrderItem, Product } from '../../types/index.ts';
import { 
  getProductTierPrice, 
  computeOrderCalculation,
  calculateItemPricingBreakdown,
  calculateDistributorPrice 
} from '../../utils/pricing.ts';

const PRICING_TIERS: PricingTier[] = ['Distributor', 'Wholesale', 'Retail', 'Special'];
const PAYMENT_METHODS: PaymentMethod[] = ['Cash', 'Bank Transfer', 'Cheque', 'Credit', 'Online'];

interface OrderDraftItem {
  id: string;
  productId: string;
  quantity: number;
  unitPrice: number;
}

export const NewOrderModal: React.FC = () => {
  const { 
    isNewOrderModalOpen, 
    setIsNewOrderModalOpen, 
    customers, 
    products, 
    createOrder, 
    preselectedProductForOrder, 
    setPreselectedProductForOrder,
    setActiveTab
  } = useApp();
  const { currentUser } = useAuth();

  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [selectedTier, setSelectedTier] = useState<PricingTier>('Distributor');
  const [orderDate, setOrderDate] = useState(new Date().toISOString().split('T')[0]);
  const [dueDate, setDueDate] = useState(
    new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  );
  const [deliveryDate, setDeliveryDate] = useState(
    new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  );
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('Bank Transfer');
  const [paidAmount, setPaidAmount] = useState<number>(0);
  const [notes, setNotes] = useState('');
  
  const [draftItems, setDraftItems] = useState<OrderDraftItem[]>([]);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showCalculationDetails, setShowCalculationDetails] = useState(true);

  // Visual aid state for item pricing calculation before adding to order
  const [selectedProductForVisualAid, setSelectedProductForVisualAid] = useState<string>(
    products[0]?.id || ''
  );
  const [visualAidQuantity, setVisualAidQuantity] = useState<number>(1);
  const [showItemVisualAid, setShowItemVisualAid] = useState<boolean>(true);
  const [inspectedDraftItemId, setInspectedDraftItemId] = useState<string | null>(null);

  // Sync selectedProductForVisualAid with available products
  useEffect(() => {
    if (
      (!selectedProductForVisualAid || !products.some((p) => p.id === selectedProductForVisualAid)) &&
      products.length > 0
    ) {
      setSelectedProductForVisualAid(products[0].id);
    }
  }, [products, selectedProductForVisualAid]);

  // Sync customer's default tier when customer is picked
  useEffect(() => {
    if (selectedCustomerId) {
      const cust = customers.find((c) => c.id === selectedCustomerId);
      if (cust) {
        setSelectedTier(cust.pricingTier);
        // Calculate due date based on terms
        const days = cust.paymentTerms === 'Net 7' ? 7 : cust.paymentTerms === 'Net 15' ? 15 : cust.paymentTerms === 'Net 60' ? 60 : 30;
        setDueDate(new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);
      }
    }
  }, [selectedCustomerId, customers]);

  // Handle pre-selected product (e.g. from Barcode Scanner or Quick Action)
  useEffect(() => {
    if (preselectedProductForOrder && isNewOrderModalOpen) {
      const price = getProductTierPrice(preselectedProductForOrder, selectedTier);
      setDraftItems((prev) => {
        const existingIdx = prev.findIndex((i) => i.productId === preselectedProductForOrder.id);
        if (existingIdx >= 0) return prev;
        return [
          ...prev,
          {
            id: `draft-${Date.now()}`,
            productId: preselectedProductForOrder.id,
            quantity: 1,
            unitPrice: price,
          },
        ];
      });
      setPreselectedProductForOrder(null);
    }
  }, [preselectedProductForOrder, isNewOrderModalOpen, selectedTier, setPreselectedProductForOrder]);

  // If items exist and tier changes, recalculate item prices according to selected tier
  useEffect(() => {
    setDraftItems((prev) =>
      prev.map((item) => {
        const prod = products.find((p) => p.id === item.productId);
        if (prod) {
          return {
            ...item,
            unitPrice: getProductTierPrice(prod, selectedTier),
          };
        }
        return item;
      })
    );
  }, [selectedTier, products]);

  if (!isNewOrderModalOpen) return null;

  const handleAddItemFromVisualAid = () => {
    const product = products.find((p) => p.id === selectedProductForVisualAid);
    if (!product) return;

    if (visualAidQuantity <= 0) {
      setError(`Please specify a valid quantity for ${product.name}`);
      return;
    }

    if (visualAidQuantity > product.stockOnHand) {
      setError(
        `Insufficient stock for "${product.name}". Available on hand: ${product.stockOnHand}, requested: ${visualAidQuantity}`
      );
      return;
    }

    setError('');
    const price = getProductTierPrice(product, selectedTier);

    setDraftItems((prev) => {
      const existingIdx = prev.findIndex((i) => i.productId === product.id);
      if (existingIdx >= 0) {
        const next = [...prev];
        next[existingIdx] = {
          ...next[existingIdx],
          quantity: next[existingIdx].quantity + visualAidQuantity,
          unitPrice: price,
        };
        return next;
      }
      return [
        ...prev,
        {
          id: `draft-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
          productId: product.id,
          quantity: visualAidQuantity,
          unitPrice: price,
        },
      ];
    });

    setVisualAidQuantity(1);
  };

  const handleAddItem = (productId?: string) => {
    const defaultProduct = productId ? products.find((p) => p.id === productId) : products[0];
    if (!defaultProduct) return;

    const price = getProductTierPrice(defaultProduct, selectedTier);
    setDraftItems((prev) => [
      ...prev,
      {
        id: `draft-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
        productId: defaultProduct.id,
        quantity: 1,
        unitPrice: price,
      },
    ]);
  };

  const handleUpdateItem = (index: number, updates: Partial<OrderDraftItem>) => {
    setDraftItems((prev) => {
      const next = [...prev];
      const current = next[index];
      const updated = { ...current, ...updates };

      // If product changed, update unit price automatically based on tier
      if (updates.productId && updates.productId !== current.productId) {
        const prod = products.find((p) => p.id === updates.productId);
        if (prod) {
          updated.unitPrice = getProductTierPrice(prod, selectedTier);
        }
      }

      next[index] = updated;
      return next;
    });
  };

  const handleRemoveItem = (index: number) => {
    setDraftItems((prev) => prev.filter((_, idx) => idx !== index));
  };

  // Build validated order items for pricing calculation
  const computedItems: OrderItem[] = draftItems
    .map((draft) => {
      const prod = products.find((p) => p.id === draft.productId);
      if (!prod) return null;
      return {
        productId: prod.id,
        productName: prod.name,
        sku: prod.sku,
        packageSize: prod.packageSize,
        unitPrice: draft.unitPrice,
        quantity: draft.quantity,
        costPrice: prod.costPrice,
        lineTotal: Math.round(draft.quantity * draft.unitPrice * 100) / 100,
      };
    })
    .filter((item): item is OrderItem => item !== null);

  const breakdown = computeOrderCalculation(computedItems);

  // Check customer and credit limit
  const selectedCustomer = customers.find((c) => c.id === selectedCustomerId);
  const projectedBalance = selectedCustomer ? selectedCustomer.currentBalance + breakdown.netTotal : 0;
  const isOverCreditLimit = selectedCustomer && projectedBalance > selectedCustomer.creditLimit;

  // Active product and pricing breakdown for the pre-addition visual aid
  const activeVisualAidProduct =
    products.find((p) => p.id === selectedProductForVisualAid) || products[0];
  const activeVisualAidBreakdown = activeVisualAidProduct
    ? calculateItemPricingBreakdown(activeVisualAidProduct, selectedTier, visualAidQuantity)
    : null;

  const handleSubmitOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomerId) {
      setError('Please select a customer for this order');
      return;
    }
    if (draftItems.length === 0) {
      setError('Please add at least one spice item to the order');
      return;
    }

    // Validate quantities
    for (const draft of draftItems) {
      const prod = products.find((p) => p.id === draft.productId);
      if (!prod) {
        setError('Selected product not found in inventory');
        return;
      }
      if (draft.quantity <= 0) {
        setError(`Please specify a valid quantity for ${prod.name}`);
        return;
      }
      if (draft.quantity > prod.stockOnHand) {
        setError(
          `Insufficient stock for "${prod.name}". Available on hand: ${prod.stockOnHand}, requested: ${draft.quantity}`
        );
        return;
      }
    }

    try {
      setIsSubmitting(true);
      setError('');

      await createOrder({
        customerId: selectedCustomerId,
        orderDate,
        dueDate,
        deliveryDate,
        deliveryStatus: 'Scheduled',
        pricingTier: selectedTier,
        items: draftItems.map((d) => ({
          productId: d.productId,
          quantity: d.quantity,
          unitPrice: d.unitPrice,
        })),
        paidAmount: Number(paidAmount) || 0,
        paymentStatus: Number(paidAmount) >= breakdown.netTotal ? 'Paid' : Number(paidAmount) > 0 ? 'Partially Paid' : 'Pending',
        paymentMethod,
        notes,
        createdBy: currentUser?.name || 'Sales Rep',
      });

      // Clear & close
      setDraftItems([]);
      setSelectedCustomerId('');
      setPaidAmount(0);
      setNotes('');
      setIsNewOrderModalOpen(false);
    } catch (err: any) {
      setError(err.message || 'Failed to place order');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-5xl w-full my-6 overflow-hidden border border-amber-200">
        {/* Header */}
        <div className="bg-gradient-to-r from-amber-800 via-amber-900 to-amber-950 px-6 py-4 flex items-center justify-between text-white">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-amber-700/60 rounded-xl">
              <Receipt className="w-5 h-5 text-amber-200" />
            </div>
            <div>
              <h3 className="text-lg font-bold">Create Multi-Item Sales Order & Invoice</h3>
              <p className="text-xs text-amber-200">Live stock validation, multi-tier pricing, and transparent volume discounts</p>
            </div>
          </div>
          <button
            onClick={() => setIsNewOrderModalOpen(false)}
            aria-label="Close modal"
            className="text-amber-200 hover:text-white p-1 rounded-lg transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmitOrder} className="p-6 space-y-6 max-h-[82vh] overflow-y-auto">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs font-semibold text-red-700 flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Customer & Pricing Tier Selection */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-gray-50/80 p-4 rounded-xl border border-gray-200">
            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                Select Customer Account *
              </label>
              {customers.length === 0 ? (
                <div className="text-xs text-amber-800 p-2 bg-amber-50 rounded border border-amber-200">
                  No customers found.{' '}
                  <button
                    type="button"
                    onClick={() => {
                      setIsNewOrderModalOpen(false);
                      setActiveTab('customers');
                    }}
                    className="underline font-bold text-amber-900"
                  >
                    Create Customer First
                  </button>
                </div>
              ) : (
                <select
                  required
                  value={selectedCustomerId}
                  onChange={(e) => setSelectedCustomerId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium focus:ring-2 focus:ring-amber-500 outline-hidden bg-white"
                >
                  <option value="">-- Choose Customer --</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.businessName} ({c.name}) - {c.pricingTier} Tier
                    </option>
                  ))}
                </select>
              )}

              {selectedCustomer && (
                <div className="mt-2 text-xs space-y-0.5 text-gray-600 bg-white p-2 rounded border border-gray-200">
                  <p>
                    <span className="font-semibold text-gray-700">Default Tier:</span>{' '}
                    <span className="text-amber-800 font-bold">{selectedCustomer.pricingTier}</span> |{' '}
                    <span className="font-semibold text-gray-700">Terms:</span> {selectedCustomer.paymentTerms}
                  </p>
                  <p>
                    <span className="font-semibold text-gray-700">Credit Limit:</span> Rs. {selectedCustomer.creditLimit.toLocaleString()} |{' '}
                    <span className="font-semibold text-gray-700">Current Bal:</span> Rs. {selectedCustomer.currentBalance.toLocaleString()}
                  </p>
                  {isOverCreditLimit && (
                    <p className="text-amber-700 font-semibold flex items-center space-x-1 pt-1">
                      <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                      <span>Note: Order will exceed stated credit limit</span>
                    </p>
                  )}
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                Order Price Tier (Overrideable)
              </label>
              <select
                value={selectedTier}
                onChange={(e) => setSelectedTier(e.target.value as PricingTier)}
                className="w-full px-3 py-2 border border-amber-300 bg-amber-50/50 rounded-lg text-sm font-bold text-amber-950 focus:ring-2 focus:ring-amber-500 outline-hidden"
              >
                {PRICING_TIERS.map((tier) => (
                  <option key={tier} value={tier}>
                    {tier} Tier {selectedCustomer?.pricingTier === tier ? '(Customer Default)' : ''}
                  </option>
                ))}
              </select>
              <p className="text-[11px] text-gray-500 mt-1">
                Applies {selectedTier} unit pricing to all products in this order.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                  Order Date
                </label>
                <input
                  type="date"
                  value={orderDate}
                  onChange={(e) => setOrderDate(e.target.value)}
                  className="w-full px-2.5 py-1.5 border border-gray-300 rounded-lg text-xs font-medium focus:ring-2 focus:ring-amber-500 outline-hidden bg-white"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                  Due Date
                </label>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full px-2.5 py-1.5 border border-gray-300 rounded-lg text-xs font-medium focus:ring-2 focus:ring-amber-500 outline-hidden bg-white"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-amber-900 uppercase tracking-wider mb-1 flex items-center gap-1">
                  <span>Delivery Date</span>
                </label>
                <input
                  type="date"
                  value={deliveryDate}
                  onChange={(e) => setDeliveryDate(e.target.value)}
                  className="w-full px-2.5 py-1.5 border border-amber-300 bg-amber-50/50 rounded-lg text-xs font-bold text-amber-950 focus:ring-2 focus:ring-amber-500 outline-hidden"
                />
              </div>
            </div>
          </div>

          {/* Visual Aid: Item Pricing Calculation Breakdown (Before Adding to Order) */}
          {products.length > 0 && (
            <div className="bg-gradient-to-br from-amber-50/90 via-orange-50/40 to-amber-100/40 border-2 border-amber-300 rounded-2xl p-4 sm:p-5 shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-amber-200">
                <div className="flex items-center space-x-2.5">
                  <div className="p-2 bg-amber-700 text-white rounded-xl shadow-xs">
                    <Calculator className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <h4 className="text-sm font-bold text-amber-950 uppercase tracking-wide">
                        Item Pricing Calculation Breakdown (Visual Aid)
                      </h4>
                      <span className="px-2 py-0.5 bg-amber-200 text-amber-900 rounded-full text-[10px] font-bold">
                        Pre-Addition Breakdown
                      </span>
                    </div>
                    <p className="text-xs text-amber-800">
                      Audit base procurement cost, distributor markup, customer tier pricing, and final unit price before adding to order.
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-2 self-end sm:self-auto">
                  <button
                    type="button"
                    onClick={() => setShowItemVisualAid(!showItemVisualAid)}
                    className="px-2.5 py-1 text-xs font-semibold text-amber-900 hover:text-amber-950 bg-amber-200/70 hover:bg-amber-200 rounded-lg transition flex items-center space-x-1"
                  >
                    <span>{showItemVisualAid ? 'Collapse Visual Aid' : 'Expand Visual Aid'}</span>
                    {showItemVisualAid ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              {showItemVisualAid && (
                <div className="space-y-4">
                  {/* Product & Quantity Selector Controls */}
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end bg-white/90 p-3.5 rounded-xl border border-amber-200">
                    <div className="md:col-span-7">
                      <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1 flex items-center justify-between">
                        <span>Select Spice Product to Inspect</span>
                        {activeVisualAidProduct && (
                          <span className="text-[11px] font-normal text-gray-500">
                            SKU: {activeVisualAidProduct.sku} | Size: {activeVisualAidProduct.packageSize}
                          </span>
                        )}
                      </label>
                      <select
                        value={selectedProductForVisualAid}
                        onChange={(e) => setSelectedProductForVisualAid(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-semibold text-gray-900 bg-white focus:ring-2 focus:ring-amber-500 outline-hidden"
                      >
                        {products.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name} ({p.sku} - {p.packageSize}) — Stock: {p.stockOnHand} units
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                        Quantity
                      </label>
                      <input
                        type="number"
                        min="1"
                        max={activeVisualAidProduct?.stockOnHand || 1}
                        value={visualAidQuantity}
                        onChange={(e) => setVisualAidQuantity(Math.max(1, parseInt(e.target.value, 10) || 1))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-bold text-center font-mono focus:ring-2 focus:ring-amber-500 outline-hidden"
                      />
                    </div>

                    <div className="md:col-span-3">
                      <button
                        type="button"
                        onClick={handleAddItemFromVisualAid}
                        disabled={!activeVisualAidProduct || activeVisualAidProduct.stockOnHand <= 0}
                        className="w-full py-2.5 px-3 bg-gradient-to-r from-amber-700 to-amber-800 hover:from-amber-800 hover:to-amber-900 text-white rounded-lg text-xs font-bold shadow-md hover:shadow-lg transition flex items-center justify-center space-x-1.5 disabled:opacity-50"
                      >
                        <Plus className="w-4 h-4" />
                        <span>Add Item to Order</span>
                        {activeVisualAidBreakdown && (
                          <span className="ml-1 opacity-90 font-mono text-[11px]">
                            (Rs. {activeVisualAidBreakdown.lineTotal.toLocaleString()})
                          </span>
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Stock availability banner */}
                  {activeVisualAidProduct && (
                    <div className="flex flex-wrap items-center justify-between text-xs px-1 gap-2">
                      <div className="flex items-center space-x-2">
                        <span className="text-gray-600 font-medium">Stock Availability:</span>
                        <span
                          className={`font-bold px-2 py-0.5 rounded text-[11px] ${
                            activeVisualAidProduct.stockOnHand <= 0
                              ? 'bg-red-100 text-red-800'
                              : activeVisualAidProduct.stockOnHand <= (activeVisualAidProduct.reorderThreshold || 10)
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-emerald-100 text-emerald-800'
                          }`}
                        >
                          {activeVisualAidProduct.stockOnHand} units on hand
                        </span>
                        {visualAidQuantity > activeVisualAidProduct.stockOnHand && (
                          <span className="text-red-600 font-bold">
                            ⚠️ Requested quantity exceeds available stock ({activeVisualAidProduct.stockOnHand})!
                          </span>
                        )}
                      </div>
                      <div className="text-gray-600 text-[11px]">
                        Origin: <span className="font-semibold text-gray-800">{activeVisualAidProduct.origin}</span> | Grade: <span className="font-semibold text-gray-800">{activeVisualAidProduct.grade || 'Standard'}</span> | Lot/Batch: <span className="font-mono text-gray-800">{activeVisualAidProduct.batchNumber}</span>
                      </div>
                    </div>
                  )}

                  {/* The 4-Step Pricing Pipeline Visual Breakdown */}
                  {activeVisualAidBreakdown && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-1">
                      {/* Step 1: Base Procurement Cost */}
                      <div className="bg-white rounded-xl p-3.5 border border-amber-200/90 shadow-xs relative">
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Step 1: Procurement</span>
                          <span className="w-5 h-5 rounded-full bg-gray-100 text-gray-700 font-bold text-[11px] flex items-center justify-center">1</span>
                        </div>
                        <div className="text-xs text-gray-600 font-medium">Base Product Cost</div>
                        <div className="text-lg font-bold font-mono text-gray-900 mt-1">
                          Rs. {activeVisualAidBreakdown.baseCost.toLocaleString('en-LK', { minimumFractionDigits: 2 })}
                        </div>
                        <div className="text-[11px] text-gray-500 mt-1">
                          Direct raw spice procurement cost per unit
                        </div>
                      </div>

                      {/* Step 2: Distributor Markup */}
                      <div className="bg-white rounded-xl p-3.5 border border-amber-200/90 shadow-xs relative">
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700">Step 2: Markup</span>
                          <span className="w-5 h-5 rounded-full bg-amber-100 text-amber-800 font-bold text-[11px] flex items-center justify-center">2</span>
                        </div>
                        <div className="text-xs text-gray-600 font-medium">Distributor Markup</div>
                        <div className="text-lg font-bold font-mono text-amber-800 mt-1">
                          +{activeVisualAidBreakdown.distributorMarkupPercent}%
                          <span className="text-xs font-normal text-amber-700 ml-1">
                            (+Rs. {activeVisualAidBreakdown.markupAmount.toLocaleString('en-LK', { minimumFractionDigits: 2 })})
                          </span>
                        </div>
                        <div className="text-[11px] text-gray-500 mt-1">
                          Benchmark Dist. Rate: <span className="font-mono font-semibold text-gray-800">Rs. {activeVisualAidBreakdown.distributorPrice.toLocaleString('en-LK', { minimumFractionDigits: 2 })}</span>
                        </div>
                      </div>

                      {/* Step 3: Customer Pricing Tier */}
                      <div className="bg-white rounded-xl p-3.5 border border-amber-200/90 shadow-xs relative">
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-700">Step 3: Account Tier</span>
                          <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-800 font-bold text-[11px] flex items-center justify-center">3</span>
                        </div>
                        <div className="text-xs text-gray-600 font-medium flex items-center justify-between">
                          <span>Selected Tier Rate</span>
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-indigo-100 text-indigo-800">
                            {selectedTier}
                          </span>
                        </div>
                        <div className="text-lg font-bold font-mono text-indigo-900 mt-1">
                          Rs. {activeVisualAidBreakdown.finalUnitPrice.toLocaleString('en-LK', { minimumFractionDigits: 2 })}
                        </div>
                        <div className="text-[10px] text-gray-500 mt-1 space-y-0.5">
                          <div>Wholesale: Rs. {activeVisualAidBreakdown.wholesalePrice.toLocaleString()} | Retail/MRP: Rs. {activeVisualAidBreakdown.mrp.toLocaleString()}</div>
                          {selectedCustomer?.pricingTier === selectedTier && (
                            <div className="text-indigo-600 font-semibold">✓ Matches customer account default</div>
                          )}
                        </div>
                      </div>

                      {/* Step 4: Final Calculated Line Price */}
                      <div className="bg-gradient-to-br from-emerald-50 to-emerald-100/70 rounded-xl p-3.5 border-2 border-emerald-300 shadow-xs relative">
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800">Step 4: Final Calculated Price</span>
                          <span className="w-5 h-5 rounded-full bg-emerald-200 text-emerald-900 font-bold text-[11px] flex items-center justify-center">4</span>
                        </div>
                        <div className="text-xs text-emerald-900 font-medium">
                          {visualAidQuantity} unit{visualAidQuantity > 1 ? 's' : ''} × Rs. {activeVisualAidBreakdown.finalUnitPrice.toLocaleString('en-LK', { minimumFractionDigits: 2 })}
                        </div>
                        <div className="text-lg font-extrabold font-mono text-emerald-900 mt-1">
                          Rs. {activeVisualAidBreakdown.lineTotal.toLocaleString('en-LK', { minimumFractionDigits: 2 })}
                        </div>
                        <div className="text-[11px] text-emerald-800 font-semibold mt-1">
                          Unit Margin: +Rs. {activeVisualAidBreakdown.unitProfit.toLocaleString('en-LK', { minimumFractionDigits: 2 })} ({activeVisualAidBreakdown.marginPercent}%) | Total Margin: Rs. {activeVisualAidBreakdown.totalProfit.toLocaleString('en-LK', { minimumFractionDigits: 2 })}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Calculation audit trace list */}
                  {activeVisualAidBreakdown && (
                    <div className="bg-white/95 rounded-xl p-3.5 border border-amber-200 text-xs">
                      <div className="text-[11px] font-bold text-amber-950 uppercase tracking-wide mb-1.5 flex items-center space-x-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                        <span>Calculation Logic & Formula Trace</span>
                      </div>
                      <div className="space-y-1 font-mono text-[11px] text-gray-700">
                        {activeVisualAidBreakdown.calculationSteps.map((step, idx) => (
                          <div key={idx} className="flex items-start space-x-2">
                            <span className="text-amber-700 font-bold shrink-0">{idx + 1}.</span>
                            <span>{step}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Order Items Table & Selection */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-gray-800 uppercase tracking-wider flex items-center space-x-1.5">
                <span>Selected Spices & Order Line Items ({draftItems.length})</span>
              </h4>
              <button
                type="button"
                onClick={() => handleAddItem()}
                disabled={products.length === 0}
                className="px-3 py-1.5 bg-amber-700 hover:bg-amber-800 text-white rounded-lg text-xs font-semibold flex items-center space-x-1.5 shadow-xs transition disabled:opacity-40"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Quick Row</span>
              </button>
            </div>

            {products.length === 0 ? (
              <div className="p-6 text-center border-2 border-dashed border-gray-300 rounded-xl bg-gray-50/50">
                <p className="text-sm font-semibold text-gray-700">Inventory is currently empty.</p>
                <p className="text-xs text-gray-500 mt-1">Please add spices to your catalog first before placing an order.</p>
                <button
                  type="button"
                  onClick={() => {
                    setIsNewOrderModalOpen(false);
                    setActiveTab('inventory');
                  }}
                  className="mt-3 px-4 py-1.5 bg-amber-700 text-white text-xs font-semibold rounded-lg"
                >
                  Go to Spice Inventory
                </button>
              </div>
            ) : draftItems.length === 0 ? (
              <div className="p-6 text-center border-2 border-dashed border-amber-200 rounded-xl bg-amber-50/30">
                <p className="text-sm font-medium text-amber-900">No items added to this order yet.</p>
                <button
                  type="button"
                  onClick={() => handleAddItem()}
                  className="mt-2 px-4 py-1.5 bg-amber-700 text-white rounded-lg text-xs font-semibold inline-flex items-center space-x-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add First Item</span>
                </button>
              </div>
            ) : (
              <div className="border border-gray-200 rounded-xl overflow-hidden shadow-xs">
                <table className="min-w-full divide-y divide-gray-200 text-left text-xs">
                  <thead className="bg-gray-100/80 font-semibold text-gray-700">
                    <tr>
                      <th className="px-3 py-2.5">Spice Product</th>
                      <th className="px-3 py-2.5">Stock on Hand</th>
                      <th className="px-3 py-2.5">Unit Price ({selectedTier})</th>
                      <th className="px-3 py-2.5 w-28">Order Qty</th>
                      <th className="px-3 py-2.5 text-right">Line Total</th>
                      <th className="px-3 py-2.5 text-center w-12">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 bg-white">
                    {draftItems.map((item, index) => {
                      const product = products.find((p) => p.id === item.productId);
                      const stockAvailable = product?.stockOnHand || 0;
                      const isStockExceeded = item.quantity > stockAvailable;
                      const lineTotal = Math.round(item.quantity * item.unitPrice * 100) / 100;

                      return (
                        <tr key={item.id} className={isStockExceeded ? 'bg-red-50/50' : 'hover:bg-gray-50'}>
                          <td className="px-3 py-2">
                            <select
                              value={item.productId}
                              onChange={(e) => handleUpdateItem(index, { productId: e.target.value })}
                              className="w-full px-2 py-1 border border-gray-300 rounded text-xs focus:ring-1 focus:ring-amber-500 font-medium"
                            >
                              {products.map((p) => (
                                <option key={p.id} value={p.id}>
                                  {p.name} ({p.sku} - {p.packageSize})
                                </option>
                              ))}
                            </select>
                            {product && (
                              <div className="flex items-center justify-between text-[10px] text-gray-500 mt-0.5">
                                <span>Origin: {product.origin} | Lot: {product.batchNumber}</span>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSelectedProductForVisualAid(item.productId);
                                    setVisualAidQuantity(item.quantity);
                                    setShowItemVisualAid(true);
                                  }}
                                  className="text-amber-800 hover:text-amber-950 font-bold inline-flex items-center space-x-1 underline ml-1"
                                >
                                  <Calculator className="w-2.5 h-2.5" />
                                  <span>Inspect Calculation</span>
                                </button>
                              </div>
                            )}
                          </td>

                          <td className="px-3 py-2">
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold ${
                                stockAvailable === 0
                                  ? 'bg-red-100 text-red-800'
                                  : stockAvailable <= (product?.reorderThreshold || 10)
                                  ? 'bg-amber-100 text-amber-800'
                                  : 'bg-emerald-100 text-emerald-800'
                              }`}
                            >
                              {stockAvailable} units
                            </span>
                            {isStockExceeded && (
                              <div className="text-[10px] text-red-600 font-bold mt-0.5">
                                Exceeds stock! Max: {stockAvailable}
                              </div>
                            )}
                          </td>

                          <td className="px-3 py-2">
                            <div className="flex items-center space-x-1">
                              <span className="text-gray-500 text-[10px]">Rs.</span>
                              <input
                                type="number"
                                min="0"
                                step="0.01"
                                value={item.unitPrice}
                                onChange={(e) =>
                                  handleUpdateItem(index, { unitPrice: parseFloat(e.target.value) || 0 })
                                }
                                className="w-24 px-2 py-1 border border-gray-300 rounded text-xs font-mono font-semibold"
                              />
                            </div>
                          </td>

                          <td className="px-3 py-2">
                            <input
                              type="number"
                              min="1"
                              max={stockAvailable}
                              value={item.quantity}
                              onChange={(e) =>
                                handleUpdateItem(index, { quantity: parseInt(e.target.value, 10) || 1 })
                              }
                              className={`w-20 px-2 py-1 border rounded text-xs font-mono font-bold text-center ${
                                isStockExceeded ? 'border-red-500 bg-red-50' : 'border-gray-300'
                              }`}
                            />
                          </td>

                          <td className="px-3 py-2 text-right font-mono font-bold text-gray-900">
                            Rs. {lineTotal.toLocaleString('en-LK', { minimumFractionDigits: 2 })}
                          </td>

                          <td className="px-3 py-2 text-center">
                            <button
                              type="button"
                              onClick={() => handleRemoveItem(index)}
                              aria-label={`Remove item ${index + 1}`}
                              className="text-gray-400 hover:text-red-600 p-1 rounded transition"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Transparent Calculation Breakdown Section */}
          <div className="bg-gradient-to-br from-amber-50/70 via-orange-50/50 to-white rounded-xl p-5 border border-amber-200">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-2">
                <div className="p-1.5 bg-amber-200 text-amber-900 rounded-md">
                  <Calculator className="w-4 h-4" />
                </div>
                <h4 className="text-xs font-bold text-amber-950 uppercase tracking-wider">
                  Live Itemized Calculation & Volume Discount Breakdown
                </h4>
              </div>
              <button
                type="button"
                onClick={() => setShowCalculationDetails(!showCalculationDetails)}
                className="text-xs text-amber-800 hover:text-amber-950 underline font-medium"
              >
                {showCalculationDetails ? 'Hide Calculation Trace' : 'Show Calculation Trace'}
              </button>
            </div>

            {/* Step-by-step formula trace */}
            {showCalculationDetails && (
              <div className="mb-4 bg-white/90 p-3.5 rounded-lg border border-amber-200/80 space-y-1.5 text-xs text-gray-700 font-mono">
                <div className="text-[11px] font-bold text-amber-900 uppercase font-sans tracking-wider border-b border-gray-100 pb-1 flex items-center justify-between">
                  <span>How each order line item and discount is calculated:</span>
                  <span className="text-[10px] text-gray-500 font-normal">Deterministic rules</span>
                </div>
                {breakdown.steps.map((step, idx) => (
                  <div key={idx} className="flex items-start space-x-2">
                    <span className="text-amber-700 font-bold shrink-0">{idx + 1}.</span>
                    <span className={idx === breakdown.steps.length - 1 ? 'font-bold text-amber-950' : ''}>
                      {step}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* Volume discount tiers ladder status */}
            <div className="grid grid-cols-2 sm:grid-cols-6 gap-2 mb-4 text-center">
              {[
                { min: 5000, pct: 2, label: 'Rs. 5K (2%)' },
                { min: 10000, pct: 3, label: 'Rs. 10K (3%)' },
                { min: 20000, pct: 4, label: 'Rs. 20K (4%)' },
                { min: 40000, pct: 5, label: 'Rs. 40K (5%)' },
                { min: 50000, pct: 7, label: 'Rs. 50K (7%)' },
                { min: 100000, pct: 10, label: 'Rs. 100K (10%)' },
              ].map((tier) => {
                const isReached = breakdown.itemsSubtotal >= tier.min;
                const isCurrent = breakdown.volumeDiscountPercent === tier.pct;
                return (
                  <div
                    key={tier.min}
                    className={`p-2 rounded-lg border text-xs transition ${
                      isCurrent
                        ? 'bg-amber-600 text-white font-bold border-amber-700 shadow-xs'
                        : isReached
                        ? 'bg-amber-100 text-amber-900 border-amber-300 font-medium'
                        : 'bg-white/70 text-gray-400 border-gray-200'
                    }`}
                  >
                    <div>{tier.label}</div>
                    {isCurrent && <div className="text-[10px] text-amber-100 mt-0.5">Applied!</div>}
                  </div>
                );
              })}
            </div>

            {/* Summary total rows */}
            <div className="space-y-2 border-t border-amber-200/60 pt-3 text-sm">
              <div className="flex justify-between text-gray-700">
                <span>Items Gross Subtotal ({draftItems.length} items):</span>
                <span className="font-mono font-semibold">
                  Rs. {breakdown.itemsSubtotal.toLocaleString('en-LK', { minimumFractionDigits: 2 })}
                </span>
              </div>

              <div className="flex justify-between text-emerald-700 font-medium">
                <span className="flex items-center space-x-1">
                  <span>Volume Discount ({breakdown.volumeDiscountPercent}%):</span>
                  <span className="text-xs bg-emerald-100 px-1.5 py-0.2 rounded text-emerald-800">
                    {breakdown.volumeTierName}
                  </span>
                </span>
                <span className="font-mono font-bold">
                  - Rs. {breakdown.volumeDiscountAmount.toLocaleString('en-LK', { minimumFractionDigits: 2 })}
                </span>
              </div>

              <div className="flex justify-between text-gray-500 text-xs">
                <span>Value Added Tax (VAT):</span>
                <span>Rs. 0.00 (No tax applied to new orders)</span>
              </div>

              <div className="flex justify-between text-base font-bold text-gray-900 border-t border-amber-300 pt-2">
                <span>Final Net Total:</span>
                <span className="font-mono text-xl text-amber-900">
                  Rs. {breakdown.netTotal.toLocaleString('en-LK', { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>
          </div>

          {/* Payment Details & Notes */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                Payment Method
              </label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 outline-hidden bg-white"
              >
                {PAYMENT_METHODS.map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                Paid at Creation (Rs.)
              </label>
              <div className="flex space-x-2">
                <input
                  type="number"
                  min="0"
                  max={breakdown.netTotal}
                  step="0.01"
                  value={paidAmount}
                  onChange={(e) => setPaidAmount(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-semibold focus:ring-2 focus:ring-amber-500 outline-hidden"
                />
                <button
                  type="button"
                  onClick={() => setPaidAmount(breakdown.netTotal)}
                  className="px-2.5 py-1 text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-lg shrink-0"
                >
                  Full
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                Dispatch / Invoice Notes
              </label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Special delivery notes, lorry gate pass..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 outline-hidden"
              />
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex justify-end space-x-3 pt-3 border-t border-gray-200">
            <button
              type="button"
              onClick={() => setIsNewOrderModalOpen(false)}
              disabled={isSubmitting}
              className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || draftItems.length === 0}
              className="px-6 py-2.5 bg-gradient-to-r from-amber-700 to-amber-900 hover:from-amber-800 hover:to-amber-950 text-white rounded-lg text-sm font-bold shadow-md transition disabled:opacity-40 flex items-center space-x-2"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{isSubmitting ? 'Submitting to Database...' : 'Confirm Order & Issue Invoice'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
