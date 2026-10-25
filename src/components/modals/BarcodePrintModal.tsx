import React, { useState } from 'react';
import { X, Printer, QrCode, Barcode, CheckSquare, Square } from 'lucide-react';
import { useApp } from '../../context/AppContext.tsx';
import { generateBarcodeSvg, generateQrCodeSvg, getSvgDataUrl } from '../../utils/barcode.ts';
import { Product } from '../../types/index.ts';

export const BarcodePrintModal: React.FC = () => {
  const { printStickerProducts, setPrintStickerProducts, products } = useApp();
  const [copies, setCopies] = useState<number>(4);
  const [includeQr, setIncludeQr] = useState(true);
  const [includeMrp, setIncludeMrp] = useState(true);
  const [includeBatch, setIncludeBatch] = useState(true);
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);

  React.useEffect(() => {
    if (printStickerProducts.length > 0) {
      setSelectedProductIds(printStickerProducts.map((p) => p.id));
    }
  }, [printStickerProducts]);

  if (printStickerProducts.length === 0) return null;

  const activeProducts = products.filter((p) => selectedProductIds.includes(p.id));

  const toggleProduct = (id: string) => {
    setSelectedProductIds((prev) =>
      prev.includes(id) ? prev.filter((pId) => pId !== id) : [...prev, id]
    );
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full my-6 overflow-hidden border border-amber-200">
        {/* Header - Hidden in Print */}
        <div className="print:hidden bg-gradient-to-r from-amber-800 to-amber-950 px-6 py-4 flex items-center justify-between text-white">
          <div className="flex items-center space-x-2.5">
            <Barcode className="w-5 h-5 text-amber-200" />
            <div>
              <h3 className="font-bold text-base">Barcode & QR Sticker Printing Studio</h3>
              <p className="text-xs text-amber-200">Generate retail labels, shelf tags & thermal stickers</p>
            </div>
          </div>
          <button
            onClick={() => setPrintStickerProducts([])}
            aria-label="Close studio"
            className="text-amber-200 hover:text-white p-1 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Studio Controls - Hidden in Print */}
        <div className="print:hidden p-5 bg-gray-50 border-b border-gray-200 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center space-x-4 text-xs font-semibold text-gray-700">
              <label className="flex items-center space-x-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeQr}
                  onChange={(e) => setIncludeQr(e.target.checked)}
                  className="rounded text-amber-600 focus:ring-amber-500"
                />
                <span>Include QR Code</span>
              </label>

              <label className="flex items-center space-x-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeMrp}
                  onChange={(e) => setIncludeMrp(e.target.checked)}
                  className="rounded text-amber-600 focus:ring-amber-500"
                />
                <span>Show MRP & Wholesale</span>
              </label>

              <label className="flex items-center space-x-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeBatch}
                  onChange={(e) => setIncludeBatch(e.target.checked)}
                  className="rounded text-amber-600 focus:ring-amber-500"
                />
                <span>Show Batch & Origin</span>
              </label>
            </div>

            <div className="flex items-center space-x-3">
              <div className="flex items-center space-x-1.5 text-xs text-gray-700">
                <span>Stickers per Spice:</span>
                <input
                  type="number"
                  min="1"
                  max="50"
                  value={copies}
                  onChange={(e) => setCopies(parseInt(e.target.value, 10) || 1)}
                  className="w-16 px-2 py-1 border border-gray-300 rounded font-bold text-center"
                />
              </div>

              <button
                onClick={handlePrint}
                className="px-4 py-2 bg-amber-700 hover:bg-amber-800 text-white rounded-lg text-xs font-bold flex items-center space-x-1.5 shadow-sm transition"
              >
                <Printer className="w-4 h-4" />
                <span>Print Sticker Sheet</span>
              </button>
            </div>
          </div>

          {/* Product selector pills */}
          <div>
            <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block mb-1.5">
              Select Spices to Print ({activeProducts.length} selected):
            </span>
            <div className="flex flex-wrap gap-2 max-h-24 overflow-y-auto">
              {products.map((p) => {
                const isSelected = selectedProductIds.includes(p.id);
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => toggleProduct(p.id)}
                    className={`px-2.5 py-1 rounded-md text-xs font-medium flex items-center space-x-1.5 border transition ${
                      isSelected
                        ? 'bg-amber-100 text-amber-900 border-amber-300'
                        : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-100'
                    }`}
                  >
                    {isSelected ? <CheckSquare className="w-3.5 h-3.5 text-amber-700" /> : <Square className="w-3.5 h-3.5 text-gray-400" />}
                    <span>{p.name} ({p.sku})</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Sticker Sheet Preview & Printable Surface */}
        <div className="p-6 max-h-[60vh] overflow-y-auto bg-gray-100 print:bg-white print:p-0 print:max-h-none">
          {activeProducts.length === 0 ? (
            <p className="text-center text-gray-500 text-sm py-8">No products selected for printing.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 gap-4 print:grid-cols-2 print:gap-3">
              {activeProducts.flatMap((prod) =>
                Array.from({ length: copies }).map((_, cIdx) => (
                  <div
                    key={`${prod.id}-${cIdx}`}
                    className="bg-white border-2 border-dashed border-gray-300 print:border-solid print:border-gray-800 rounded-xl p-3 shadow-xs flex flex-col justify-between text-xs"
                    style={{ minHeight: '170px' }}
                  >
                    {/* Top label row */}
                    <div className="border-b border-gray-200 pb-1.5 flex justify-between items-start">
                      <div>
                        <div className="font-extrabold text-amber-950 text-xs uppercase tracking-tight">
                          NA Distributors
                        </div>
                        <h4 className="font-bold text-gray-900 text-sm leading-tight line-clamp-1">{prod.name}</h4>
                        <div className="text-[10px] text-gray-500">
                          {prod.packageSize} | Grade: {prod.grade || 'Std'}
                        </div>
                      </div>

                      {includeMrp && (
                        <div className="text-right">
                          <div className="text-[10px] text-gray-500">MRP</div>
                          <div className="font-black font-mono text-gray-900 text-sm">
                            Rs. {prod.mrp.toLocaleString()}
                          </div>
                          <div className="text-[9px] text-amber-800 font-medium">
                            Dist: Rs. {prod.distributorPrice.toLocaleString()}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Barcode & QR Center */}
                    <div className="flex items-center justify-between py-2 gap-2">
                      <div className="flex-1 overflow-hidden flex flex-col items-center">
                        <div
                          dangerouslySetInnerHTML={{
                            __html: generateBarcodeSvg(prod.barcode || prod.sku, 200, 50),
                          }}
                        />
                      </div>

                      {includeQr && (
                        <div
                          className="shrink-0 p-1 bg-white border border-gray-200 rounded"
                          dangerouslySetInnerHTML={{
                            __html: generateQrCodeSvg(`NADIST:${prod.sku}:${prod.barcode}`, 55),
                          }}
                        />
                      )}
                    </div>

                    {/* Bottom Metadata */}
                    {includeBatch && (
                      <div className="border-t border-gray-100 pt-1 flex justify-between text-[9px] text-gray-500 font-mono">
                        <span>SKU: {prod.sku}</span>
                        <span>Lot: {prod.batchNumber}</span>
                        <span>Origin: {prod.origin}</span>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
