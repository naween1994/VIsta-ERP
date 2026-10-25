import React, { useState, useEffect, useRef } from 'react';
import { 
  Camera, 
  CameraOff, 
  Barcode, 
  QrCode, 
  Search, 
  PackagePlus, 
  Sliders, 
  Receipt, 
  Printer, 
  CheckCircle2, 
  AlertCircle,
  Keyboard,
  Sparkles
} from 'lucide-react';
import { useApp } from '../context/AppContext.tsx';
import { Product } from '../types/index.ts';
import { generateBarcodeSvg, generateQrCodeSvg } from '../utils/barcode.ts';

export const ScannerView: React.FC = () => {
  const { 
    products, 
    setActiveProductForRestock, 
    setActiveProductForAdjust, 
    setIsNewOrderModalOpen, 
    setPreselectedProductForOrder,
    setPrintStickerProducts,
    addToast
  } = useApp();

  const [inputCode, setInputCode] = useState('');
  const [scannedProduct, setScannedProduct] = useState<Product | null>(null);
  const [notFoundCode, setNotFoundCode] = useState('');
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);

  // USB / Bluetooth barcode hardware keyboard scanner listener
  // Hardware scanners simulate rapid typing followed by Enter key!
  useEffect(() => {
    let buffer = '';
    let lastKeyTime = Date.now();

    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is actively typing in an input or textarea
      if (
        document.activeElement?.tagName === 'INPUT' ||
        document.activeElement?.tagName === 'TEXTAREA' ||
        document.activeElement?.tagName === 'SELECT'
      ) {
        return;
      }

      const currentTime = Date.now();
      const diff = currentTime - lastKeyTime;
      lastKeyTime = currentTime;

      if (e.key === 'Enter') {
        if (buffer.length >= 3) {
          lookupCode(buffer.trim());
          buffer = '';
        }
      } else if (e.key.length === 1) {
        // If keys arrive rapidly (< 70ms), it's a barcode scanner
        if (diff > 120 && buffer.length > 0) {
          buffer = ''; // timeout reset
        }
        buffer += e.key;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [products]);

  // Handle camera video stream
  useEffect(() => {
    if (isCameraActive) {
      startCamera();
    } else {
      stopCamera();
    }
    return () => {
      stopCamera();
    };
  }, [isCameraActive]);

  const startCamera = async () => {
    setCameraError('');
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera access is not supported by your browser.');
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
      });
      mediaStreamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
    } catch (err: any) {
      setCameraError(err.message || 'Unable to access device camera.');
      setIsCameraActive(false);
    }
  };

  const stopCamera = () => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }
  };

  const lookupCode = (codeToSearch: string) => {
    const clean = codeToSearch.trim().toLowerCase();
    if (!clean) return;

    // Remove any NADIST: prefix if scanned from internal QR
    const extractedCode = clean.startsWith('nadist:') ? clean.split(':')[1] : clean;

    const found = products.find(
      (p) =>
        p.barcode.toLowerCase() === clean ||
        p.sku.toLowerCase() === clean ||
        p.barcode.toLowerCase() === extractedCode ||
        p.sku.toLowerCase() === extractedCode
    );

    if (found) {
      setScannedProduct(found);
      setNotFoundCode('');
      addToast({ type: 'success', title: 'Barcode Recognized', message: `Found ${found.name}` });
    } else {
      setScannedProduct(null);
      setNotFoundCode(codeToSearch);
      addToast({
        type: 'warning',
        title: 'Unknown Code',
        message: `No product registered under barcode "${codeToSearch}"`,
      });
    }
  };

  const handleManualSearch = (e: React.FormEvent) => {
    e.preventDefault();
    lookupCode(inputCode);
  };

  const handleQuickAddOrder = (prod: Product) => {
    setPreselectedProductForOrder(prod);
    setIsNewOrderModalOpen(true);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-black text-gray-900 tracking-tight flex items-center space-x-2">
            <span>Barcode & QR Scanning Station</span>
            <span className="text-xs bg-amber-100 text-amber-900 font-bold px-2 py-0.5 rounded-full">
              USB & Camera Ready
            </span>
          </h1>
          <p className="text-xs text-gray-500 mt-1">
            Instant product lookup, live stock verification, rapid restocking, and order item dispatch.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          {products.length > 0 && (
            <button
              onClick={() => setPrintStickerProducts(products)}
              className="px-3.5 py-2 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition"
            >
              <Printer className="w-4 h-4" />
              <span>Print All Stickers</span>
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column: Scanning Interface & Inputs */}
        <div className="space-y-5">
          {/* Hardware Scanner & Manual Input Panel */}
          <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="p-2 bg-amber-100 text-amber-900 rounded-lg">
                  <Barcode className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-gray-900">Manual Entry & Hardware Scanner</h3>
                  <p className="text-[11px] text-gray-500">USB / Bluetooth barcode readers type automatically</p>
                </div>
              </div>
              <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold rounded-full">
                Auto-Listener Active
              </span>
            </div>

            <form onSubmit={handleManualSearch} className="flex space-x-2">
              <div className="relative flex-1">
                <input
                  type="text"
                  value={inputCode}
                  onChange={(e) => setInputCode(e.target.value)}
                  placeholder="Enter or scan SKU / Barcode..."
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-xl text-sm font-mono font-semibold focus:ring-2 focus:ring-amber-500 outline-hidden"
                />
              </div>
              <button
                type="submit"
                className="px-5 py-2.5 bg-amber-700 hover:bg-amber-800 text-white rounded-xl text-xs font-bold transition flex items-center space-x-1 shadow-sm"
              >
                <Search className="w-4 h-4" />
                <span>Lookup</span>
              </button>
            </form>

            {/* Quick Test Barcode Buttons */}
            {products.length > 0 && (
              <div className="pt-2 border-t border-gray-100">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1.5">
                  Click to simulate physical scanner input:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {products.slice(0, 6).map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => {
                        setInputCode(p.barcode || p.sku);
                        lookupCode(p.barcode || p.sku);
                      }}
                      className="px-2.5 py-1 bg-gray-50 hover:bg-amber-50 border border-gray-200 rounded-lg text-xs font-mono text-gray-700 hover:text-amber-900 transition flex items-center space-x-1"
                    >
                      <Sparkles className="w-3 h-3 text-amber-600" />
                      <span>{p.sku}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Camera Scanner Viewport */}
          <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="p-2 bg-blue-100 text-blue-900 rounded-lg">
                  <Camera className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-gray-900">Device Camera Scanner</h3>
                  <p className="text-[11px] text-gray-500">Scan packaging labels via webcam or mobile camera</p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsCameraActive(!isCameraActive)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center space-x-1.5 transition ${
                  isCameraActive
                    ? 'bg-red-50 text-red-700 border border-red-200 hover:bg-red-100'
                    : 'bg-blue-600 text-white hover:bg-blue-700 shadow-sm'
                }`}
              >
                {isCameraActive ? (
                  <>
                    <CameraOff className="w-3.5 h-3.5" />
                    <span>Stop Camera</span>
                  </>
                ) : (
                  <>
                    <Camera className="w-3.5 h-3.5" />
                    <span>Enable Camera</span>
                  </>
                )}
              </button>
            </div>

            {isCameraActive ? (
              <div className="relative rounded-xl overflow-hidden bg-black aspect-video flex items-center justify-center">
                <video ref={videoRef} className="w-full h-full object-cover" autoPlay playsInline muted />
                {/* Aiming Reticle */}
                <div className="absolute inset-0 border-2 border-amber-400/60 pointer-events-none flex items-center justify-center">
                  <div className="w-48 h-32 border-2 border-emerald-400 rounded-xl relative shadow-lg animate-pulse">
                    <div className="absolute top-1/2 left-2 right-2 h-0.5 bg-red-500/80 shadow-md" />
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-8 text-center bg-gray-50 border-2 border-dashed border-gray-200 rounded-xl">
                <Camera className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                <p className="text-xs font-semibold text-gray-700">Camera preview is currently inactive</p>
                <p className="text-[11px] text-gray-500 mt-0.5">Click 'Enable Camera' to scan physical stickers</p>
              </div>
            )}

            {cameraError && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-xs font-medium">
                {cameraError}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Scanned Product Inspection & Instant Actions */}
        <div>
          {scannedProduct ? (
            <div className="bg-white rounded-2xl border-2 border-amber-500/70 shadow-lg p-6 space-y-6">
              <div className="flex items-start justify-between border-b border-gray-100 pb-4">
                <div>
                  <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-bold rounded-full uppercase">
                    Recognized & Verified
                  </span>
                  <h2 className="text-xl font-black text-gray-900 mt-1">{scannedProduct.name}</h2>
                  <div className="text-xs text-gray-500 flex items-center space-x-2 mt-0.5 font-mono">
                    <span>SKU: {scannedProduct.sku}</span>
                    <span>•</span>
                    <span>Barcode: {scannedProduct.barcode}</span>
                  </div>
                </div>

                <div
                  className="p-1 bg-white border border-gray-200 rounded"
                  dangerouslySetInnerHTML={{
                    __html: generateQrCodeSvg(`NADIST:${scannedProduct.sku}:${scannedProduct.barcode}`, 50),
                  }}
                />
              </div>

              {/* Stock status banner */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-4 bg-amber-50/60 rounded-xl border border-amber-200 text-xs">
                <div>
                  <div className="text-gray-500">Stock on Hand:</div>
                  <div className="text-xl font-black text-gray-900 font-mono mt-0.5">
                    {scannedProduct.stockOnHand} units
                  </div>
                </div>
                <div>
                  <div className="text-gray-500">Alert Threshold:</div>
                  <div className="text-sm font-bold text-amber-900 font-mono mt-1">
                    &le; {scannedProduct.reorderThreshold} units
                  </div>
                </div>
                <div>
                  <div className="text-gray-500">Batch / Lot:</div>
                  <div className="text-xs font-bold text-gray-800 font-mono mt-1">
                    {scannedProduct.batchNumber}
                  </div>
                </div>
              </div>

              {/* Pricing breakdown */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs">
                <div className="p-2.5 bg-gray-50 rounded-xl border border-gray-200">
                  <div className="text-gray-400 text-[10px]">Cost Price</div>
                  <div className="font-mono font-bold text-gray-800 mt-0.5">
                    Rs. {scannedProduct.costPrice.toLocaleString()}
                  </div>
                </div>

                <div className="p-2.5 bg-amber-100/70 rounded-xl border border-amber-300">
                  <div className="text-amber-800 text-[10px] font-bold">Distributor</div>
                  <div className="font-mono font-black text-amber-950 mt-0.5">
                    Rs. {scannedProduct.distributorPrice.toLocaleString()}
                  </div>
                </div>

                <div className="p-2.5 bg-gray-50 rounded-xl border border-gray-200">
                  <div className="text-gray-400 text-[10px]">Wholesale</div>
                  <div className="font-mono font-bold text-gray-800 mt-0.5">
                    Rs. {scannedProduct.wholesalePrice.toLocaleString()}
                  </div>
                </div>

                <div className="p-2.5 bg-gray-50 rounded-xl border border-gray-200">
                  <div className="text-gray-400 text-[10px]">MRP</div>
                  <div className="font-mono font-bold text-gray-800 mt-0.5">
                    Rs. {scannedProduct.mrp.toLocaleString()}
                  </div>
                </div>
              </div>

              {/* Barcode graphic visualization */}
              <div className="p-4 bg-gray-50 rounded-xl border border-gray-200 flex flex-col items-center justify-center">
                <div
                  dangerouslySetInnerHTML={{
                    __html: generateBarcodeSvg(scannedProduct.barcode || scannedProduct.sku, 260, 60),
                  }}
                />
              </div>

              {/* Instant Actions */}
              <div className="space-y-2 pt-2">
                <span className="text-xs font-bold text-gray-700 uppercase tracking-wider block">
                  Scan Operations:
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <button
                    onClick={() => setActiveProductForRestock(scannedProduct)}
                    className="p-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center justify-center space-x-1.5 shadow-sm transition"
                  >
                    <PackagePlus className="w-4 h-4" />
                    <span>Quick Restock</span>
                  </button>

                  <button
                    onClick={() => setActiveProductForAdjust(scannedProduct)}
                    className="p-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center justify-center space-x-1.5 shadow-sm transition"
                  >
                    <Sliders className="w-4 h-4" />
                    <span>Adjust Stock</span>
                  </button>

                  <button
                    onClick={() => handleQuickAddOrder(scannedProduct)}
                    className="p-3 bg-amber-700 hover:bg-amber-800 text-white rounded-xl text-xs font-bold flex items-center justify-center space-x-1.5 shadow-sm transition"
                  >
                    <Receipt className="w-4 h-4" />
                    <span>Add to Order</span>
                  </button>
                </div>

                <button
                  onClick={() => setPrintStickerProducts([scannedProduct])}
                  className="w-full mt-2 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-xl text-xs font-semibold flex items-center justify-center space-x-1.5 transition"
                >
                  <Printer className="w-4 h-4" />
                  <span>Generate Printable Sticker Sheet for {scannedProduct.name}</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-gray-200 shadow-xs p-10 text-center flex flex-col items-center justify-center min-h-[400px]">
              <Barcode className="w-16 h-16 text-amber-300 mb-3" />
              <h3 className="text-base font-bold text-gray-900">Awaiting Barcode Scan</h3>
              <p className="text-xs text-gray-500 max-w-sm mt-1 leading-relaxed">
                Scan with a USB/Bluetooth handheld barcode scanner, use your webcam, or manually type the SKU
                code in the input field.
              </p>

              {notFoundCode && (
                <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-xl text-xs font-medium text-red-700">
                  No product was found matching: <strong>"{notFoundCode}"</strong>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
