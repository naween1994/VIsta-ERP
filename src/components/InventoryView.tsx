import React, { useState, useMemo } from 'react';
import { 
  Plus, 
  Search, 
  Filter, 
  Download, 
  Trash2, 
  Edit2, 
  RotateCcw, 
  AlertTriangle, 
  PackagePlus, 
  Sliders, 
  Barcode, 
  Boxes,
  CheckCircle2,
  Percent,
  X
} from 'lucide-react';
import { useApp } from '../context/AppContext.tsx';
import { useAuth } from '../context/AuthContext.tsx';
import { Product, SpiceCategory } from '../types/index.ts';
import { AdminConfirmModal } from './modals/AdminConfirmModal.tsx';
import { calculateDistributorPrice, calculateMarkupPercentage } from '../utils/pricing.ts';

const CATEGORIES: (SpiceCategory | 'All')[] = [
  'All',
  'Whole Spices',
  'Ground Spices',
  'Curry Powders',
  'Herbs & Seeds',
  'Specialty Blends',
  'Extracts & Oils',
  'Other',
];

export const InventoryView: React.FC = () => {
  const { 
    products, 
    setIsAddProductModalOpen, 
    setActiveProductForRestock, 
    setActiveProductForAdjust,
    setPrintStickerProducts,
    deleteProduct,
    resetCatalog,
    updateProduct
  } = useApp();
  const { isAdmin, isInventoryManager } = useAuth();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<SpiceCategory | 'All'>('All');
  const [selectedOrigin, setSelectedOrigin] = useState<string>('All');
  const [onlyLowStock, setOnlyLowStock] = useState(false);

  // Edit Product Modal
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  // Admin confirmation modal
  const [confirmModalData, setConfirmModalData] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    action: (password: string) => Promise<void>;
  }>({
    isOpen: false,
    title: '',
    message: '',
    action: async () => {},
  });

  // Extract unique origins from products
  const origins = useMemo(() => {
    const list = Array.from(new Set(products.map((p) => p.origin).filter(Boolean)));
    return ['All', ...list];
  }, [products]);

  // Filtered products list
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchSearch =
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.barcode.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.origin.toLowerCase().includes(searchTerm.toLowerCase());

      const matchCategory = selectedCategory === 'All' || p.category === selectedCategory;
      const matchOrigin = selectedOrigin === 'All' || p.origin === selectedOrigin;
      const matchLowStock = !onlyLowStock || p.stockOnHand <= p.reorderThreshold;

      return matchSearch && matchCategory && matchOrigin && matchLowStock;
    });
  }, [products, searchTerm, selectedCategory, selectedOrigin, onlyLowStock]);

  // Export to CSV
  const handleExportCsv = () => {
    if (products.length === 0) return;
    const headers = [
      'ID',
      'Name',
      'SKU',
      'Barcode',
      'Category',
      'Origin',
      'Grade',
      'PackageSize',
      'StockOnHand',
      'InitialStock',
      'ReorderThreshold',
      'BatchNumber',
      'CostPrice_LKR',
      'DistributorMarkup_Pct',
      'DistributorPrice_LKR',
      'WholesalePrice_LKR',
      'MRP_LKR',
      'LotValuation_LKR',
    ];

    const rows = products.map((p) => [
      p.id,
      `"${p.name.replace(/"/g, '""')}"`,
      p.sku,
      p.barcode,
      p.category,
      p.origin,
      p.grade || '',
      p.packageSize,
      p.stockOnHand,
      p.initialStock,
      p.reorderThreshold,
      p.batchNumber,
      p.costPrice,
      p.distributorMarkupPercent,
      p.distributorPrice,
      p.wholesalePrice,
      p.mrp,
      p.stockOnHand * p.costPrice,
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `spice_inventory_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDeleteProductPrompt = (product: Product) => {
    setConfirmModalData({
      isOpen: true,
      title: `Delete ${product.name}?`,
      message: `Are you sure you want to delete ${product.name} (${product.sku}) from catalog? This will permanently remove its inventory records.`,
      action: async (password: string) => {
        await deleteProduct(product.id, password);
      },
    });
  };

  const handleResetCatalogPrompt = () => {
    setConfirmModalData({
      isOpen: true,
      title: 'Reset Entire Spice Catalog?',
      message:
        'WARNING: This will completely erase all spice products and stock history from the database. This action is irreversible.',
      action: async (password: string) => {
        await resetCatalog(password);
      },
    });
  };

  const handleSaveEditedProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct) return;
    await updateProduct(editingProduct.id, editingProduct);
    setEditingProduct(null);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-gray-200 shadow-xs">
        <div>
          <h1 className="text-xl font-black text-gray-900 tracking-tight flex items-center space-x-2">
            <span>Spice Inventory Management</span>
            <span className="text-xs bg-amber-100 text-amber-900 font-bold px-2 py-0.5 rounded-full">
              {products.length} Spices
            </span>
          </h1>
          <p className="text-xs text-gray-500 mt-1">
            Track batches, lot valuations, reorder alerts, multi-tier pricing, and inventory adjustments.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {products.length > 0 && (
            <>
              <button
                onClick={() => setPrintStickerProducts(products)}
                className="px-3 py-2 bg-gray-50 hover:bg-gray-100 text-gray-700 border border-gray-300 rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition"
              >
                <Barcode className="w-4 h-4 text-amber-700" />
                <span>Print Barcodes</span>
              </button>

              <button
                onClick={handleExportCsv}
                className="px-3 py-2 bg-gray-50 hover:bg-gray-100 text-gray-700 border border-gray-300 rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition"
              >
                <Download className="w-4 h-4" />
                <span>Export CSV</span>
              </button>
            </>
          )}

          {isAdmin && products.length > 0 && (
            <button
              onClick={handleResetCatalogPrompt}
              className="px-3 py-2 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded-xl text-xs font-semibold flex items-center space-x-1 transition"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset Catalog</span>
            </button>
          )}

          <button
            onClick={() => setIsAddProductModalOpen(true)}
            className="px-4 py-2 bg-gradient-to-r from-amber-700 to-amber-800 hover:from-amber-800 hover:to-amber-900 text-white rounded-xl text-xs font-bold flex items-center space-x-1.5 shadow-sm transition active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>+ Add Spice Product</span>
          </button>
        </div>
      </div>

      {/* Search & Filter Toolbar */}
      <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Search box */}
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-gray-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by spice name, SKU, barcode, origin..."
              className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-xl text-xs focus:ring-2 focus:ring-amber-500 outline-hidden"
            />
          </div>

          {/* Category filter */}
          <div>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value as any)}
              className="w-full px-3 py-2 border border-gray-300 rounded-xl text-xs focus:ring-2 focus:ring-amber-500 outline-hidden bg-white font-medium"
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  Category: {c}
                </option>
              ))}
            </select>
          </div>

          {/* Origin filter */}
          <div>
            <select
              value={selectedOrigin}
              onChange={(e) => setSelectedOrigin(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-xl text-xs focus:ring-2 focus:ring-amber-500 outline-hidden bg-white font-medium"
            >
              {origins.map((o) => (
                <option key={o} value={o}>
                  Origin: {o}
                </option>
              ))}
            </select>
          </div>

          {/* Low stock toggle */}
          <div className="flex items-center">
            <label className="flex items-center space-x-2 text-xs font-semibold text-gray-700 cursor-pointer select-none bg-amber-50/60 p-2 rounded-xl border border-amber-200/60 w-full justify-center">
              <input
                type="checkbox"
                checked={onlyLowStock}
                onChange={(e) => setOnlyLowStock(e.target.checked)}
                className="rounded text-amber-700 focus:ring-amber-500"
              />
              <span className="flex items-center space-x-1">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                <span>Show Low-Stock Only</span>
              </span>
            </label>
          </div>
        </div>
      </div>

      {/* Products Table */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden">
        {products.length === 0 ? (
          <div className="p-12 text-center">
            <Boxes className="w-12 h-12 text-amber-400/80 mx-auto mb-3" />
            <h3 className="text-base font-bold text-gray-900">Inventory is Empty</h3>
            <p className="text-xs text-gray-500 max-w-md mx-auto mt-1">
              There are no spice products currently stored in the database. Add spices manually with specs,
              thresholds, and multi-tier pricing.
            </p>
            <button
              onClick={() => setIsAddProductModalOpen(true)}
              className="mt-4 px-5 py-2.5 bg-amber-700 hover:bg-amber-800 text-white rounded-xl text-xs font-bold shadow-md transition inline-flex items-center space-x-2"
            >
              <Plus className="w-4 h-4" />
              <span>Add First Spice Product</span>
            </button>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="p-8 text-center text-gray-500 text-xs">
            No products matched your search or filters.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 text-xs">
              <thead className="bg-gray-100 font-bold uppercase tracking-wider text-gray-700">
                <tr>
                  <th className="px-4 py-3 text-left">Spice & Specification</th>
                  <th className="px-4 py-3 text-left">SKU / Barcode</th>
                  <th className="px-4 py-3 text-left">Category & Origin</th>
                  <th className="px-4 py-3 text-left">Stock on Hand</th>
                  <th className="px-4 py-3 text-right">Cost Price</th>
                  <th className="px-4 py-3 text-right">Distributor (LKR)</th>
                  <th className="px-4 py-3 text-right">Wholesale / MRP</th>
                  <th className="px-4 py-3 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredProducts.map((product) => {
                  const isLow = product.stockOnHand <= product.reorderThreshold;
                  const isOut = product.stockOnHand === 0;

                  return (
                    <tr key={product.id} className="hover:bg-amber-50/30 transition">
                      {/* Name & Grade */}
                      <td className="px-4 py-3">
                        <div className="font-bold text-gray-900 text-sm">{product.name}</div>
                        <div className="text-[10px] text-gray-500 flex items-center space-x-2 mt-0.5">
                          <span>Pack: <strong>{product.packageSize}</strong></span>
                          <span>•</span>
                          <span>Grade: <strong>{product.grade || 'Std'}</strong></span>
                          <span>•</span>
                          <span>Lot: <strong className="font-mono">{product.batchNumber}</strong></span>
                        </div>
                      </td>

                      {/* SKU / Barcode */}
                      <td className="px-4 py-3 font-mono">
                        <div className="font-bold text-gray-800">{product.sku}</div>
                        <div className="text-[10px] text-gray-500">{product.barcode}</div>
                      </td>

                      {/* Category & Origin */}
                      <td className="px-4 py-3">
                        <span className="inline-block px-2 py-0.5 rounded-md text-[10px] font-semibold bg-gray-100 text-gray-800">
                          {product.category}
                        </span>
                        <div className="text-[10px] text-gray-500 mt-1">{product.origin}</div>
                      </td>

                      {/* Stock on Hand & Threshold */}
                      <td className="px-4 py-3">
                        <div className="flex items-center space-x-2">
                          <span
                            className={`px-2 py-0.5 rounded-full text-xs font-bold font-mono ${
                              isOut
                                ? 'bg-red-100 text-red-800'
                                : isLow
                                ? 'bg-amber-100 text-amber-800 border border-amber-300'
                                : 'bg-emerald-100 text-emerald-800'
                            }`}
                          >
                            {product.stockOnHand} units
                          </span>
                        </div>
                        <div className="text-[10px] text-gray-400 mt-0.5">
                          Alert at &le; {product.reorderThreshold} | Initial: {product.initialStock}
                        </div>
                      </td>

                      {/* Cost */}
                      <td className="px-4 py-3 text-right font-mono font-semibold text-gray-600">
                        Rs. {product.costPrice.toLocaleString('en-LK', { minimumFractionDigits: 2 })}
                        <div className="text-[9px] text-gray-400">
                          Lot: Rs. {(product.stockOnHand * product.costPrice).toLocaleString('en-LK', { maximumFractionDigits: 0 })}
                        </div>
                      </td>

                      {/* Distributor Price & Markup */}
                      <td className="px-4 py-3 text-right">
                        <div className="font-mono font-bold text-amber-950 text-sm">
                          Rs. {product.distributorPrice.toLocaleString('en-LK', { minimumFractionDigits: 2 })}
                        </div>
                        <div className="text-[10px] text-amber-800 font-semibold">
                          +{product.distributorMarkupPercent}% markup
                        </div>
                      </td>

                      {/* Wholesale / MRP */}
                      <td className="px-4 py-3 text-right font-mono text-[11px]">
                        <div className="text-gray-800 font-medium">
                          WS: Rs. {product.wholesalePrice.toLocaleString()}
                        </div>
                        <div className="text-gray-500">
                          MRP: Rs. {product.mrp.toLocaleString()}
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center space-x-1.5">
                          {/* Quick restock */}
                          <button
                            type="button"
                            onClick={() => setActiveProductForRestock(product)}
                            title="Quick Restock"
                            className="p-1.5 text-emerald-700 hover:bg-emerald-50 rounded-lg transition"
                          >
                            <PackagePlus className="w-4 h-4" />
                          </button>

                          {/* Adjust stock */}
                          <button
                            type="button"
                            onClick={() => setActiveProductForAdjust(product)}
                            title="Stock Adjustment (Audit note)"
                            className="p-1.5 text-blue-700 hover:bg-blue-50 rounded-lg transition"
                          >
                            <Sliders className="w-4 h-4" />
                          </button>

                          {/* Print single sticker */}
                          <button
                            type="button"
                            onClick={() => setPrintStickerProducts([product])}
                            title="Print Barcode & QR Label"
                            className="p-1.5 text-gray-600 hover:bg-gray-100 rounded-lg transition"
                          >
                            <Barcode className="w-4 h-4" />
                          </button>

                          {/* Edit product */}
                          <button
                            type="button"
                            onClick={() => setEditingProduct({ ...product })}
                            title="Edit Product Details"
                            className="p-1.5 text-amber-700 hover:bg-amber-50 rounded-lg transition"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>

                          {/* Delete (Admin protected) */}
                          {isAdmin && (
                            <button
                              type="button"
                              onClick={() => handleDeleteProductPrompt(product)}
                              title="Delete Product (Admin password required)"
                              className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Edit Product Modal */}
      {editingProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full my-6 overflow-hidden border border-amber-200">
            <div className="bg-gradient-to-r from-amber-800 to-amber-950 px-6 py-4 flex items-center justify-between text-white">
              <h3 className="font-bold text-base">Edit Spice Specifications</h3>
              <button
                onClick={() => setEditingProduct(null)}
                aria-label="Close edit"
                className="text-amber-200 hover:text-white p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEditedProduct} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                    Spice Name
                  </label>
                  <input
                    type="text"
                    required
                    value={editingProduct.name}
                    onChange={(e) => setEditingProduct({ ...editingProduct, name: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                    SKU Code
                  </label>
                  <input
                    type="text"
                    required
                    value={editingProduct.sku}
                    onChange={(e) => setEditingProduct({ ...editingProduct, sku: e.target.value.toUpperCase() })}
                    className="w-full px-3 py-2 border rounded-lg text-sm font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                    Barcode
                  </label>
                  <input
                    type="text"
                    value={editingProduct.barcode}
                    onChange={(e) => setEditingProduct({ ...editingProduct, barcode: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg text-sm font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                    Cost Price (Rs.)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={editingProduct.costPrice}
                    onChange={(e) => {
                      const cost = parseFloat(e.target.value) || 0;
                      const distPrice = calculateDistributorPrice(cost, editingProduct.distributorMarkupPercent);
                      setEditingProduct({
                        ...editingProduct,
                        costPrice: cost,
                        distributorPrice: distPrice,
                      });
                    }}
                    className="w-full px-3 py-2 border rounded-lg text-sm font-bold font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                    Distributor Markup %
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    value={editingProduct.distributorMarkupPercent}
                    onChange={(e) => {
                      const markup = parseFloat(e.target.value) || 0;
                      const distPrice = calculateDistributorPrice(editingProduct.costPrice, markup);
                      setEditingProduct({
                        ...editingProduct,
                        distributorMarkupPercent: markup,
                        distributorPrice: distPrice,
                      });
                    }}
                    className="w-full px-3 py-2 border rounded-lg text-sm font-bold font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                    Distributor Price (Rs.)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={editingProduct.distributorPrice}
                    onChange={(e) =>
                      setEditingProduct({ ...editingProduct, distributorPrice: parseFloat(e.target.value) || 0 })
                    }
                    className="w-full px-3 py-2 border rounded-lg text-sm font-bold font-mono bg-amber-50"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                    Reorder Threshold (Alert Level)
                  </label>
                  <input
                    type="number"
                    value={editingProduct.reorderThreshold}
                    onChange={(e) =>
                      setEditingProduct({
                        ...editingProduct,
                        reorderThreshold: parseInt(e.target.value, 10) || 10,
                      })
                    }
                    className="w-full px-3 py-2 border rounded-lg text-sm"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setEditingProduct(null)}
                  className="px-4 py-2 border rounded-lg text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-amber-700 text-white rounded-lg text-xs font-bold"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Admin Protected Action Confirmation Dialog */}
      <AdminConfirmModal
        isOpen={confirmModalData.isOpen}
        title={confirmModalData.title}
        message={confirmModalData.message}
        onConfirm={confirmModalData.action}
        onClose={() => setConfirmModalData((prev) => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
};
