import React, { useState } from 'react';
import { X, PackagePlus } from 'lucide-react';
import { useApp } from '../../context/AppContext.tsx';
import { useAuth } from '../../context/AuthContext.tsx';

export const QuickRestockModal: React.FC = () => {
  const { activeProductForRestock, setActiveProductForRestock, quickRestock } = useApp();
  const { currentUser } = useAuth();

  const [quantity, setQuantity] = useState<number>(50);
  const [note, setNote] = useState('Supplier batch intake');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  if (!activeProductForRestock) return null;

  const currentStock = activeProductForRestock.stockOnHand;
  const newStock = currentStock + quantity;

  const handleQuickAdd = (amount: number) => {
    setQuantity(amount);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (quantity <= 0) {
      setError('Please specify a positive restock quantity');
      return;
    }

    try {
      setIsSubmitting(true);
      setError('');
      await quickRestock(
        activeProductForRestock.id,
        quantity,
        note,
        currentUser?.name || 'Inventory Manager'
      );
      setActiveProductForRestock(null);
    } catch (err: any) {
      setError(err.message || 'Restock failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-amber-200">
        <div className="bg-gradient-to-r from-emerald-700 to-teal-800 px-6 py-4 flex items-center justify-between text-white">
          <div className="flex items-center space-x-2.5">
            <PackagePlus className="w-5 h-5 text-emerald-200" />
            <div>
              <h3 className="font-bold text-base">Quick Restock</h3>
              <p className="text-xs text-emerald-200">{activeProductForRestock.name}</p>
            </div>
          </div>
          <button
            onClick={() => setActiveProductForRestock(null)}
            aria-label="Close modal"
            className="text-emerald-200 hover:text-white p-1 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-2.5 bg-red-50 border border-red-200 text-xs font-semibold text-red-700 rounded-lg">
              {error}
            </div>
          )}

          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between text-xs">
            <div>
              <span className="text-gray-500">Current Stock: </span>
              <strong className="text-gray-900">{currentStock} units</strong>
            </div>
            <div>
              <span className="text-gray-500">After Restock: </span>
              <strong className="text-emerald-800 text-sm font-bold">{newStock} units</strong>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2">
              Preset Restock Quantities
            </label>
            <div className="grid grid-cols-4 gap-2">
              {[10, 25, 50, 100].map((amt) => (
                <button
                  key={amt}
                  type="button"
                  onClick={() => handleQuickAdd(amt)}
                  className={`py-2 px-2 text-xs font-bold rounded-lg border transition ${
                    quantity === amt
                      ? 'bg-emerald-700 text-white border-emerald-800 shadow-xs'
                      : 'bg-gray-50 text-gray-700 border-gray-300 hover:bg-gray-100'
                  }`}
                >
                  +{amt}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
              Custom Restock Quantity
            </label>
            <input
              type="number"
              min="1"
              required
              value={quantity}
              onChange={(e) => setQuantity(parseInt(e.target.value, 10) || 1)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-lg font-bold font-mono text-center focus:ring-2 focus:ring-emerald-500 outline-hidden"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
              Intake Note / Shipment Details
            </label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g. Received shipment lot #LK-2026-A"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs focus:ring-2 focus:ring-emerald-500 outline-hidden"
            />
          </div>

          <div className="flex justify-end space-x-3 pt-3 border-t border-gray-200">
            <button
              type="button"
              onClick={() => setActiveProductForRestock(null)}
              disabled={isSubmitting}
              className="px-4 py-2 border border-gray-300 rounded-lg text-xs font-semibold text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-bold shadow-sm disabled:opacity-50"
            >
              {isSubmitting ? 'Updating Stock...' : 'Confirm Restock'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
