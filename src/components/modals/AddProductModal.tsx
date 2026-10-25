import React, { useState } from 'react';
import { X, Sparkles, AlertCircle } from 'lucide-react';
import { useApp } from '../../context/AppContext.tsx';
import { SpiceCategory } from '../../types/index.ts';

const CATEGORIES: SpiceCategory[] = [
  'Whole Spices',
  'Ground Spices',
  'Curry Powders',
  'Herbs & Seeds',
  'Specialty Blends',
  'Extracts & Oils',
  'Other',
];

const COMMON_ORIGINS = [
  'Sri Lanka (Ceylon)',
  'India (Malabar / Kerala)',
  'Madagascar',
  'Indonesia',
  'Vietnam',
  'Guatemala',
  'Zanzibar',
  'Other',
];

const COMMON_PACKAGE_SIZES = [
  '50g Pouch',
  '100g Pouch',
  '250g Pack',
  '500g Pack',
  '1kg Pack',
  '5kg Bulk Box',
  '25kg Burlap Sack',
];

export const AddProductModal: React.FC = () => {
  const { isAddProductModalOpen, setIsAddProductModalOpen, createProduct } = useApp();

  const [name, setName] = useState('');
  const [sku, setSku] = useState('');
  const [barcode, setBarcode] = useState('');
  const [category, setCategory] = useState<SpiceCategory>('Whole Spices');
  const [origin, setOrigin] = useState('Sri Lanka (Ceylon)');
  const [grade, setGrade] = useState('Standard');
  const [packageSize, setPackageSize] = useState('100g Pouch');
  const [costPrice, setCostPrice] = useState<number>(1000);
  const [distributorMarkupPercent, setDistributorMarkupPercent] = useState<number>(20);
  const [wholesalePrice, setWholesalePrice] = useState<number>(1300);
  const [mrp, setMrp] = useState<number>(1600);
  const [stockOnHand, setStockOnHand] = useState<number>(100);
  const [reorderThreshold, setReorderThreshold] = useState<number>(20);
  const [batchNumber, setBatchNumber] = useState(`BATCH-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`);
  const [description, setDescription] = useState('');
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  if (!isAddProductModalOpen) return null;

  // Auto calculate distributor price
  const distributorPrice = Math.round(costPrice * (1 + distributorMarkupPercent / 100));

  const handleCostChange = (newCost: number) => {
    setCostPrice(newCost);
    setWholesalePrice(Math.round(newCost * 1.3));
    setMrp(Math.round(newCost * 1.6));
  };

  const handleGenerateSku = () => {
    const prefix = name ? name.substring(0, 3).toUpperCase() : 'SPC';
    const sizePart = packageSize.split(' ')[0].toUpperCase();
    const randomNum = Math.floor(100 + Math.random() * 900);
    const newSku = `${prefix}-${sizePart}-${randomNum}`;
    setSku(newSku);
    if (!barcode) setBarcode(`893${Math.floor(100000000 + Math.random() * 900000000)}`);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Product spice name is required');
      return;
    }
    if (!sku.trim()) {
      setError('SKU is required');
      return;
    }

    try {
      setIsSubmitting(true);
      setError('');
      await createProduct({
        name: name.trim(),
        sku: sku.trim().toUpperCase(),
        barcode: (barcode || sku).trim().toUpperCase(),
        category,
        origin,
        grade,
        packageSize,
        costPrice: Number(costPrice) || 0,
        distributorMarkupPercent: Number(distributorMarkupPercent) || 20,
        distributorPrice,
        wholesalePrice: Number(wholesalePrice) || distributorPrice,
        mrp: Number(mrp) || Math.round(distributorPrice * 1.25),
        stockOnHand: Number(stockOnHand) || 0,
        initialStock: Number(stockOnHand) || 0,
        reorderThreshold: Number(reorderThreshold) || 10,
        batchNumber,
        lotValuation: (Number(stockOnHand) || 0) * (Number(costPrice) || 0),
        description,
      });

      // Reset and close
      setName('');
      setSku('');
      setBarcode('');
      setDescription('');
      setIsAddProductModalOpen(false);
    } catch (err: any) {
      setError(err.message || 'Failed to save spice product');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full my-8 overflow-hidden border border-amber-200">
        <div className="bg-gradient-to-r from-amber-700 via-amber-800 to-amber-900 px-6 py-4 flex items-center justify-between text-white">
          <div>
            <h3 className="text-lg font-bold">Add New Spice to Inventory</h3>
            <p className="text-xs text-amber-200">Create product specifications, multi-tier pricing, and stock limits</p>
          </div>
          <button
            onClick={() => setIsAddProductModalOpen(false)}
            aria-label="Close modal"
            className="text-amber-200 hover:text-white p-1 rounded-lg transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5 max-h-[80vh] overflow-y-auto">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs font-medium text-red-700 flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Basic identification */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                Spice Product Name *
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Ceylon Cinnamon Sticks (Alba Grade), Ceylon Cardamom Special..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-hidden"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  SKU Code *
                </label>
                <button
                  type="button"
                  onClick={handleGenerateSku}
                  className="text-xs text-amber-700 hover:text-amber-900 flex items-center space-x-1 font-medium"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Auto-Gen</span>
                </button>
              </div>
              <input
                type="text"
                required
                value={sku}
                onChange={(e) => setSku(e.target.value)}
                placeholder="e.g. CIN-ALB-100G"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono uppercase focus:ring-2 focus:ring-amber-500 outline-hidden"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                Barcode / EAN-13
              </label>
              <input
                type="text"
                value={barcode}
                onChange={(e) => setBarcode(e.target.value)}
                placeholder="e.g. 8931234567890 (or leave blank to match SKU)"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono focus:ring-2 focus:ring-amber-500 outline-hidden"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                Spice Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as SpiceCategory)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 outline-hidden bg-white"
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                Origin
              </label>
              <select
                value={origin}
                onChange={(e) => setOrigin(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 outline-hidden bg-white"
              >
                {COMMON_ORIGINS.map((o) => (
                  <option key={o} value={o}>{o}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                Spice Grade / Quality
              </label>
              <input
                type="text"
                value={grade}
                onChange={(e) => setGrade(e.target.value)}
                placeholder="e.g. Alba, C5 Extra, Special, Grade 1, Standard"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 outline-hidden"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                Package Size / Unit
              </label>
              <select
                value={packageSize}
                onChange={(e) => setPackageSize(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 outline-hidden bg-white"
              >
                {COMMON_PACKAGE_SIZES.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Pricing & Markup Section */}
          <div className="bg-amber-50/60 p-4 rounded-xl border border-amber-200">
            <h4 className="text-xs font-bold text-amber-900 uppercase tracking-wider mb-3">
              Cost & Multi-Tier Pricing Configuration (LKR / Rs.)
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Cost Price (Rs.) *
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  required
                  value={costPrice}
                  onChange={(e) => handleCostChange(parseFloat(e.target.value) || 0)}
                  className="w-full px-2.5 py-1.5 border border-gray-300 rounded-md text-sm font-semibold focus:ring-2 focus:ring-amber-500 outline-hidden bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-amber-900 mb-1">
                  Distributor Markup %
                </label>
                <input
                  type="number"
                  min="0"
                  max="500"
                  step="0.5"
                  value={distributorMarkupPercent}
                  onChange={(e) => setDistributorMarkupPercent(parseFloat(e.target.value) || 0)}
                  className="w-full px-2.5 py-1.5 border border-amber-300 rounded-md text-sm font-semibold text-amber-900 focus:ring-2 focus:ring-amber-500 outline-hidden bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Distributor Price (Rs.)
                </label>
                <div className="px-2.5 py-1.5 bg-amber-100/70 border border-amber-300 rounded-md text-sm font-bold text-amber-950">
                  Rs. {distributorPrice.toLocaleString()}
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Wholesale Price (Rs.)
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={wholesalePrice}
                  onChange={(e) => setWholesalePrice(parseFloat(e.target.value) || 0)}
                  className="w-full px-2.5 py-1.5 border border-gray-300 rounded-md text-sm font-semibold focus:ring-2 focus:ring-amber-500 outline-hidden bg-white"
                />
              </div>

              <div className="col-span-2 sm:col-span-2">
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Maximum Retail Price (MRP in Rs.)
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={mrp}
                  onChange={(e) => setMrp(parseFloat(e.target.value) || 0)}
                  className="w-full px-2.5 py-1.5 border border-gray-300 rounded-md text-sm font-semibold focus:ring-2 focus:ring-amber-500 outline-hidden bg-white"
                />
              </div>

              <div className="col-span-2 sm:col-span-2 flex items-center text-xs text-amber-800">
                <div className="bg-white/80 p-2 rounded-lg border border-amber-200 w-full">
                  <span>Gross Margin on Distributor Price: </span>
                  <strong className="text-amber-900">
                    {distributorPrice > 0 ? (((distributorPrice - costPrice) / distributorPrice) * 100).toFixed(1) : 0}%
                  </strong>
                </div>
              </div>
            </div>
          </div>

          {/* Stock tracking */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                Initial Stock on Hand *
              </label>
              <input
                type="number"
                min="0"
                required
                value={stockOnHand}
                onChange={(e) => setStockOnHand(parseInt(e.target.value, 10) || 0)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-semibold focus:ring-2 focus:ring-amber-500 outline-hidden"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                Reorder Threshold (Alert Level)
              </label>
              <input
                type="number"
                min="0"
                value={reorderThreshold}
                onChange={(e) => setReorderThreshold(parseInt(e.target.value, 10) || 0)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 outline-hidden"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                Batch / Lot Number
              </label>
              <input
                type="text"
                value={batchNumber}
                onChange={(e) => setBatchNumber(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono focus:ring-2 focus:ring-amber-500 outline-hidden"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
              Product Description / Harvest Notes
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. 100% pure Ceylon true cinnamon quills sourced from southern plantations..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 outline-hidden"
            />
          </div>

          <div className="flex justify-end space-x-3 pt-3 border-t border-gray-200">
            <button
              type="button"
              onClick={() => setIsAddProductModalOpen(false)}
              disabled={isSubmitting}
              className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2 bg-amber-700 hover:bg-amber-800 text-white rounded-lg text-sm font-semibold shadow-md transition disabled:opacity-50"
            >
              {isSubmitting ? 'Saving to Database...' : 'Add Spice to Inventory'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
