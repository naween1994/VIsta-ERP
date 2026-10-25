import React, { useState } from 'react';
import { X, ArrowDown, ArrowUp, AlertTriangle } from 'lucide-react';
import { useApp } from '../../context/AppContext.tsx';
import { useAuth } from '../../context/AuthContext.tsx';

const REASONS = [
  'Cycle Count Correction',
  'Restock from Supplier',
  'Damaged in Transit',
  'Quality Rejection / Spoiled',
  'Customer Sample',
  'Packaging Leakage',
  'Return to Vendor',
  'Other',
];

export const StockAdjustModal: React.FC = () => {
  const { activeProductForAdjust, setActiveProductForAdjust, adjustStock } = useApp();
  const { currentUser } = useAuth();

  const [direction, setDirection] = useState<'add' | 'deduct'>('add');
  const [quantity, setQuantity] = useState<number>(10);
  const [reason, setReason] = useState(REASONS[0]);
  const [note, setNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  if (!activeProductForAdjust) return null;

  const currentStock = activeProductForAdjust.stockOnHand;
  const adjustmentQty = direction === 'add' ? quantity : -quantity;
  const projectedStock = Math.max(0, currentStock + adjustmentQty);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (quantity <= 0) {
      setError('Please enter a valid positive quantity');
      return;
    }

    try {
      setIsSubmitting(true);
      setError('');
      await adjustStock(
        activeProductForAdjust.id,
        adjustmentQty,
        reason,
        note,
        currentUser?.name || 'Staff'
      );
      setActiveProductForAdjust(null);
    } catch (err: any) {
      setError(err.message || 'Failed to adjust stock');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-amber-200">
        <div className="bg-gradient-to-r from-amber-700 to-amber-900 px-6 py-4 flex items-center justify-between text-white">
          <div>
            <h3 className="font-bold text-base">Adjust Stock: {activeProductForAdjust.name}</h3>
            <p className="text-xs text-amber-200">SKU: {activeProductForAdjust.sku} | Batch: {activeProductForAdjust.batchNumber}</p>
          </div>
          <button
            onClick={() => setActiveProductForAdjust(null)}
            aria-label="Close modal"
            className="text-amber-200 hover:text-white p-1 rounded-lg"
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

          {/* Current vs Projected */}
          <div className="grid grid-cols-2 gap-3 p-3 bg-amber-50/70 border border-amber-200 rounded-xl text-center">
            <div>
              <div className="text-xs text-gray-500">Current Stock</div>
              <div className="text-xl font-bold text-gray-900">{currentStock} units</div>
            </div>
            <div>
              <div className="text-xs text-gray-500">Projected Stock</div>
              <div className={`text-xl font-bold ${projectedStock <= activeProductForAdjust.reorderThreshold ? 'text-amber-700' : 'text-emerald-700'}`}>
                {projectedStock} units
              </div>
            </div>
          </div>

          {/* Direction toggle */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
              Adjustment Type
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setDirection('add')}
                className={`py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center space-x-1.5 border transition ${
                  direction === 'add'
                    ? 'bg-emerald-600 text-white border-emerald-700 shadow-xs'
                    : 'bg-gray-100 text-gray-700 border-gray-300 hover:bg-gray-200'
                }`}
              >
                <ArrowUp className="w-4 h-4" />
                <span>Increase Stock (+)</span>
              </button>
              <button
                type="button"
                onClick={() => setDirection('deduct')}
                className={`py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center space-x-1.5 border transition ${
                  direction === 'deduct'
                    ? 'bg-red-600 text-white border-red-700 shadow-xs'
                    : 'bg-gray-100 text-gray-700 border-gray-300 hover:bg-gray-200'
                }`}
              >
                <ArrowDown className="w-4 h-4" />
                <span>Deduct Stock (-)</span>
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
              Quantity to {direction === 'add' ? 'Add' : 'Deduct'}
            </label>
            <input
              type="number"
              min="1"
              required
              value={quantity}
              onChange={(e) => setQuantity(parseInt(e.target.value, 10) || 1)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-base font-bold font-mono text-center focus:ring-2 focus:ring-amber-500 outline-hidden"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
              Reason for Adjustment *
            </label>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs font-medium focus:ring-2 focus:ring-amber-500 outline-hidden bg-white"
            >
              {REASONS.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
              Audit Note / Reference (Optional)
            </label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g. Physical inventory count verified by warehouse manager"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs focus:ring-2 focus:ring-amber-500 outline-hidden"
            />
          </div>

          <div className="flex justify-end space-x-3 pt-3 border-t border-gray-200">
            <button
              type="button"
              onClick={() => setActiveProductForAdjust(null)}
              disabled={isSubmitting}
              className="px-4 py-2 border border-gray-300 rounded-lg text-xs font-semibold text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 bg-amber-700 hover:bg-amber-800 text-white rounded-lg text-xs font-bold shadow-sm disabled:opacity-50"
            >
              {isSubmitting ? 'Recording Adjustment...' : 'Record Adjustment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
