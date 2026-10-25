import React, { useState, useEffect, useMemo } from 'react';
import { 
  Map, 
  AdvancedMarker, 
  Pin, 
  InfoWindow 
} from '@vis.gl/react-google-maps';
import { 
  Truck, 
  Calendar, 
  MapPin, 
  Navigation, 
  CheckCircle2, 
  Clock, 
  ExternalLink, 
  Printer, 
  RefreshCw, 
  ArrowUpDown, 
  Phone, 
  Package, 
  AlertCircle,
  FileText,
  User,
  ShieldCheck,
  ChevronRight,
  Sparkles
} from 'lucide-react';
import { useApp } from '../../context/AppContext.tsx';
import type { DeliveryStop, DeliveryRoute, Order } from '../../types/index.ts';
import { GoogleMapWrapper } from '../maps/GoogleMapWrapper.tsx';

// Central Warehouse in Colombo, Sri Lanka
const DEFAULT_ORIGIN = {
  name: 'NA Distributors Main Hub',
  address: 'No. 45, Temple Road, Colombo 03, Sri Lanka',
  lat: 6.9271,
  lng: 79.8612,
};

// Calculate Haversine distance in km
function calculateDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10;
}

export const DeliveryRoutePlanner: React.FC = () => {
  const { 
    orders, 
    customers, 
    deliveryRoutes, 
    saveDeliveryRoute, 
    updateDeliveryStopStatus, 
    fetchDeliveryPending, 
    setActiveOrderForView 
  } = useApp();

  // Target delivery date: default to tomorrow
  const getTomorrowStr = () => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().split('T')[0];
  };

  const [deliveryDate, setDeliveryDate] = useState<string>(getTomorrowStr());
  const [driverName, setDriverName] = useState('Kamal Perera');
  const [vehicleNumber, setVehicleNumber] = useState('WP CAC-4892 (Toyota HiAce 1.2T)');
  const [stops, setStops] = useState<DeliveryStop[]>([]);
  const [selectedStop, setSelectedStop] = useState<DeliveryStop | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'map' | 'manifest' | 'history'>('map');

  // Center map on warehouse initially
  const [mapCenter, setMapCenter] = useState({ lat: DEFAULT_ORIGIN.lat, lng: DEFAULT_ORIGIN.lng });
  const [mapZoom, setMapZoom] = useState(11);

  // Load pending invoices for the selected delivery date
  const loadDeliveryOrders = async () => {
    setIsLoading(true);
    try {
      const res = await fetchDeliveryPending(deliveryDate);
      if (res.stops && res.stops.length > 0) {
        setStops(res.stops);
        // Center map to encompass stops
        if (res.stops[0]?.coordinates) {
          setMapCenter({
            lat: res.stops[0].coordinates.latitude,
            lng: res.stops[0].coordinates.longitude,
          });
        }
      } else {
        // Fallback: build stops from current state orders that are scheduled for this date or not cancelled
        const matchingOrders = orders.filter((o) => {
          if (o.paymentStatus === 'Cancelled') return false;
          return o.deliveryDate === deliveryDate || o.dueDate === deliveryDate || !o.deliveryDate;
        });

        const fallbackStops: DeliveryStop[] = matchingOrders.map((order, idx) => {
          const cust = customers.find((c) => c.id === order.customerId);
          const coords = order.deliveryCoordinates || cust?.coordinates || {
            latitude: DEFAULT_ORIGIN.lat + (Math.random() - 0.5) * 0.09,
            longitude: DEFAULT_ORIGIN.lng + (Math.random() - 0.5) * 0.09,
          };

          const totalWeightKg = order.items.reduce((acc, i) => {
            const size = (i.packageSize || '').toLowerCase();
            let wt = 0.1;
            if (size.includes('100g')) wt = 0.1;
            else if (size.includes('50g')) wt = 0.05;
            else if (size.includes('25g')) wt = 0.025;
            else if (size.includes('250g')) wt = 0.25;
            else if (size.includes('500g')) wt = 0.5;
            else if (size.includes('1kg')) wt = 1.0;
            return acc + wt * i.quantity;
          }, 0);

          return {
            stopNumber: idx + 1,
            orderId: order.id,
            invoiceNumber: order.invoiceNumber,
            customerId: order.customerId,
            customerName: order.customerName,
            customerBusiness: order.customerBusiness || cust?.businessName || '',
            phone: cust?.phone || '+94 11 234 5678',
            address: order.deliveryAddress || cust?.address || 'Colombo, Sri Lanka',
            city: order.deliveryCity || cust?.city || 'Colombo',
            coordinates: coords,
            itemsCount: order.items.reduce((sum, item) => sum + item.quantity, 0),
            itemsSummary: order.items.map((i) => `${i.productName} (${i.quantity}x)`).join(', '),
            totalWeightKg: Math.round(totalWeightKg * 10) / 10,
            invoiceAmount: order.netTotal,
            paymentStatus: order.paymentStatus,
            deliveryStatus: order.deliveryStatus || 'Scheduled',
            notes: order.driverNotes || order.notes || '',
          };
        });

        setStops(fallbackStops);
      }
    } catch (err) {
      console.warn('Error fetching pending delivery orders:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadDeliveryOrders();
  }, [deliveryDate]);

  // Route metrics calculation
  const routeMetrics = useMemo(() => {
    if (stops.length === 0) {
      return { totalDistanceKm: 0, estimatedMins: 0, totalRevenue: 0, totalWeightKg: 0 };
    }

    let dist = 0;
    let curLat = DEFAULT_ORIGIN.lat;
    let curLng = DEFAULT_ORIGIN.lng;

    stops.forEach((s) => {
      dist += calculateDistanceKm(curLat, curLng, s.coordinates.latitude, s.coordinates.longitude);
      curLat = s.coordinates.latitude;
      curLng = s.coordinates.longitude;
    });

    // Return trip back to central hub
    dist += calculateDistanceKm(curLat, curLng, DEFAULT_ORIGIN.lat, DEFAULT_ORIGIN.lng);
    dist = Math.round(dist * 10) / 10;

    // Traffic calculation: 25 km/h urban delivery speed + 15 mins unload buffer per store
    const mins = Math.round((dist / 25) * 60 + stops.length * 15);
    const revenue = stops.reduce((sum, s) => sum + (s.invoiceAmount || 0), 0);
    const weight = Math.round(stops.reduce((sum, s) => sum + (s.totalWeightKg || 0), 0) * 10) / 10;

    return { totalDistanceKm: dist, estimatedMins: mins, totalRevenue: revenue, totalWeightKg: weight };
  }, [stops]);

  // Optimize stops order using Nearest-Neighbor heuristic from Warehouse origin
  const handleOptimizeStops = () => {
    if (stops.length <= 1) return;

    const remaining = [...stops];
    const optimized: DeliveryStop[] = [];
    let curLat = DEFAULT_ORIGIN.lat;
    let curLng = DEFAULT_ORIGIN.lng;

    while (remaining.length > 0) {
      let nearestIdx = 0;
      let minDistance = Infinity;

      for (let i = 0; i < remaining.length; i++) {
        const d = calculateDistanceKm(
          curLat,
          curLng,
          remaining[i].coordinates.latitude,
          remaining[i].coordinates.longitude
        );
        if (d < minDistance) {
          minDistance = d;
          nearestIdx = i;
        }
      }

      const nextStop = remaining.splice(nearestIdx, 1)[0];
      optimized.push(nextStop);
      curLat = nextStop.coordinates.latitude;
      curLng = nextStop.coordinates.longitude;
    }

    // Re-index stop numbers
    const reindexed = optimized.map((s, idx) => ({ ...s, stopNumber: idx + 1 }));
    setStops(reindexed);
  };

  // Move stop up or down in manual sequence
  const handleMoveStop = (index: number, direction: 'up' | 'down') => {
    if ((direction === 'up' && index === 0) || (direction === 'down' && index === stops.length - 1)) {
      return;
    }
    const newStops = [...stops];
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    const temp = newStops[index];
    newStops[index] = newStops[targetIdx];
    newStops[targetIdx] = temp;

    const reindexed = newStops.map((s, idx) => ({ ...s, stopNumber: idx + 1 }));
    setStops(reindexed);
  };

  // Save / Dispatch delivery route
  const handleSaveRoute = async () => {
    if (stops.length === 0) return;
    setIsSaving(true);
    try {
      await saveDeliveryRoute({
        routeDate: deliveryDate,
        routeName: `Spice Dispatch - ${deliveryDate}`,
        driverName,
        vehicleNumber,
        warehouseOrigin: {
          name: DEFAULT_ORIGIN.name,
          address: DEFAULT_ORIGIN.address,
          latitude: DEFAULT_ORIGIN.lat,
          longitude: DEFAULT_ORIGIN.lng,
        },
        stops,
        totalDistanceKm: routeMetrics.totalDistanceKm,
        estimatedDurationMins: routeMetrics.estimatedMins,
        totalRevenue: routeMetrics.totalRevenue,
      });
    } catch (err: any) {
      alert(err.message || 'Failed to save delivery route');
    } finally {
      setIsSaving(false);
    }
  };

  // Mark single stop status (Delivered, Out for Delivery, Failed)
  const handleUpdateStopStatus = async (
    stopNumber: number,
    status: 'Scheduled' | 'Out for Delivery' | 'Delivered' | 'Failed'
  ) => {
    // Update local state first
    setStops((prev) =>
      prev.map((s) => (s.stopNumber === stopNumber ? { ...s, deliveryStatus: status } : s))
    );

    // If an active route exists in database, persist update
    const activeRoute = deliveryRoutes.find((r) => r.routeDate === deliveryDate);
    if (activeRoute) {
      try {
        await updateDeliveryStopStatus(activeRoute.id, stopNumber, status);
      } catch (err) {
        console.warn('Could not sync status to server route:', err);
      }
    }
  };

  // Generate driver Google Maps turn-by-turn navigation URL
  const generateGoogleMapsNavUrl = () => {
    if (stops.length === 0) return '#';
    const originStr = `${DEFAULT_ORIGIN.lat},${DEFAULT_ORIGIN.lng}`;
    const destinationStr = originStr; // Loop back to warehouse
    const waypointsStr = stops
      .map((s) => `${s.coordinates.latitude},${s.coordinates.longitude}`)
      .join('|');

    return `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(
      originStr
    )}&destination=${encodeURIComponent(destinationStr)}&waypoints=${encodeURIComponent(
      waypointsStr
    )}&travelmode=driving`;
  };

  // Print delivery manifest sheet
  const handlePrintManifest = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-amber-950 to-slate-900 rounded-2xl p-6 text-white shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4 border border-amber-900/50">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="px-2.5 py-0.5 bg-amber-500/20 text-amber-300 border border-amber-400/30 rounded-full text-xs font-semibold flex items-center gap-1.5">
              <Truck className="w-3.5 h-3.5" />
              <span>Smart Delivery Logistics</span>
            </span>
            <span className="px-2.5 py-0.5 bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 rounded-full text-xs font-semibold flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Google Maps Grounded</span>
            </span>
          </div>
          <h1 className="text-2xl font-black tracking-tight text-white">
            Delivery Route Setup & Dispatch
          </h1>
          <p className="text-xs text-amber-200/80 mt-1 max-w-2xl">
            Automatically group invoices finished on a specific day, map customer shop coordinates, sequence delivery waypoints, and dispatch turn-by-turn routes to drivers.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={loadDeliveryOrders}
            className="px-3.5 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition border border-white/10"
            title="Refresh Invoices"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Sync Orders</span>
          </button>

          <a
            href={generateGoogleMapsNavUrl()}
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-lg shadow-amber-500/20 transition cursor-pointer"
          >
            <Navigation className="w-3.5 h-3.5" />
            <span>Open in Google Maps</span>
            <ExternalLink className="w-3 h-3 ml-0.5" />
          </a>

          <button
            onClick={handlePrintManifest}
            className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-amber-200 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition border border-amber-800/40"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print Manifest</span>
          </button>
        </div>
      </div>

      {/* Date & Logistics Configuration Bar */}
      <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1 flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-amber-600" />
            <span>Target Delivery Day</span>
          </label>
          <input
            type="date"
            value={deliveryDate}
            onChange={(e) => setDeliveryDate(e.target.value)}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-semibold text-slate-800 focus:ring-2 focus:ring-amber-500 outline-none"
          />
        </div>

        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1 flex items-center gap-1.5">
            <User className="w-3.5 h-3.5 text-amber-600" />
            <span>Assigned Driver</span>
          </label>
          <input
            type="text"
            value={driverName}
            onChange={(e) => setDriverName(e.target.value)}
            placeholder="Driver Name"
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-medium text-slate-800 focus:ring-2 focus:ring-amber-500 outline-none"
          />
        </div>

        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1 flex items-center gap-1.5">
            <Truck className="w-3.5 h-3.5 text-amber-600" />
            <span>Delivery Vehicle</span>
          </label>
          <input
            type="text"
            value={vehicleNumber}
            onChange={(e) => setVehicleNumber(e.target.value)}
            placeholder="Vehicle Plate & Model"
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-medium text-slate-800 focus:ring-2 focus:ring-amber-500 outline-none"
          />
        </div>

        <div className="flex items-end">
          <button
            onClick={handleSaveRoute}
            disabled={isSaving || stops.length === 0}
            className="w-full py-2.5 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 text-white rounded-lg text-xs font-bold shadow-md transition disabled:opacity-50 flex items-center justify-center gap-1.5"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>{isSaving ? 'Scheduling...' : 'Save & Confirm Dispatch'}</span>
          </button>
        </div>
      </div>

      {/* Metrics Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs mb-1">
            <span>Stops & Invoices</span>
            <Package className="w-4 h-4 text-amber-600" />
          </div>
          <p className="text-2xl font-black text-slate-900">{stops.length}</p>
          <p className="text-[11px] text-slate-500 mt-0.5">Customer trade drops</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs mb-1">
            <span>Est. Route Distance</span>
            <Navigation className="w-4 h-4 text-amber-600" />
          </div>
          <p className="text-2xl font-black text-slate-900">{routeMetrics.totalDistanceKm} km</p>
          <p className="text-[11px] text-slate-500 mt-0.5">Round trip from Colombo Hub</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs mb-1">
            <span>Total Weight</span>
            <Truck className="w-4 h-4 text-amber-600" />
          </div>
          <p className="text-2xl font-black text-slate-900">{routeMetrics.totalWeightKg} kg</p>
          <p className="text-[11px] text-slate-500 mt-0.5">Packaged Ceylon spices</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs mb-1">
            <span>Invoice Total</span>
            <FileText className="w-4 h-4 text-amber-600" />
          </div>
          <p className="text-2xl font-black text-amber-900">
            Rs. {routeMetrics.totalRevenue.toLocaleString()}
          </p>
          <p className="text-[11px] text-slate-500 mt-0.5">To collect or verify</p>
        </div>
      </div>

      {/* Main Layout: Google Map & Delivery Stops Sequence */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Interactive Map View */}
        <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
          <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-amber-500 animate-pulse" />
              <h2 className="text-sm font-bold text-slate-800">
                Delivery Route Map (Google Maps)
              </h2>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleOptimizeStops}
                disabled={stops.length <= 1}
                className="px-3 py-1 bg-amber-100 hover:bg-amber-200 text-amber-900 border border-amber-300 rounded-lg text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
                title="Automatically calculate the shortest sequence of customer stops"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-700" />
                <span>Optimize Sequence</span>
              </button>
            </div>
          </div>

          {/* Interactive Google Map with explicit height */}
          <div className="relative w-full h-[450px] sm:h-[520px] bg-slate-100">
            <GoogleMapWrapper>
              <Map
                center={mapCenter}
                zoom={mapZoom}
                mapId="DEMO_MAP_ID"
                internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}
                style={{ width: '100%', height: '100%' }}
                gestureHandling="greedy"
              >
                {/* 1. Origin Central Warehouse Marker */}
                <AdvancedMarker
                  position={{ lat: DEFAULT_ORIGIN.lat, lng: DEFAULT_ORIGIN.lng }}
                  title="Central Distribution Warehouse"
                >
                  <Pin
                    background="#0F172A"
                    borderColor="#000000"
                    glyphColor="#F59E0B"
                    scale={1.3}
                  />
                </AdvancedMarker>

                {/* 2. Customer Delivery Stops Numbered Markers */}
                {stops.map((stop) => {
                  const isDelivered = stop.deliveryStatus === 'Delivered';
                  const isOut = stop.deliveryStatus === 'Out for Delivery';
                  const pinBg = isDelivered ? '#10B981' : isOut ? '#3B82F6' : '#D97706';
                  const pinBorder = isDelivered ? '#047857' : isOut ? '#1D4ED8' : '#78350F';

                  return (
                    <AdvancedMarker
                      key={stop.orderId}
                      position={{ lat: stop.coordinates.latitude, lng: stop.coordinates.longitude }}
                      title={`Stop #${stop.stopNumber}: ${stop.customerBusiness || stop.customerName}`}
                      onClick={() => setSelectedStop(stop)}
                    >
                      <Pin
                        background={pinBg}
                        borderColor={pinBorder}
                        glyphColor="#FFFFFF"
                        scale={1.15}
                      />
                    </AdvancedMarker>
                  );
                })}

                {/* InfoWindow for selected stop */}
                {selectedStop && (
                  <InfoWindow
                    position={{
                      lat: selectedStop.coordinates.latitude,
                      lng: selectedStop.coordinates.longitude,
                    }}
                    onCloseClick={() => setSelectedStop(null)}
                  >
                    <div className="p-2 max-w-xs text-xs text-slate-800">
                      <div className="flex items-center justify-between gap-2 border-b border-slate-200 pb-1 mb-1">
                        <span className="font-bold text-amber-900">
                          Stop #{selectedStop.stopNumber}: {selectedStop.customerBusiness || selectedStop.customerName}
                        </span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-100 font-mono">
                          {selectedStop.invoiceNumber}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-600 mb-1">{selectedStop.address}, {selectedStop.city}</p>
                      <p className="text-[11px] text-slate-700 font-medium mb-1">
                        📦 Spices: {selectedStop.itemsSummary}
                      </p>
                      <div className="flex items-center justify-between text-[11px] font-bold text-slate-900 border-t border-slate-100 pt-1">
                        <span>Invoice Amount:</span>
                        <span className="text-amber-800">Rs. {selectedStop.invoiceAmount.toLocaleString()}</span>
                      </div>
                      <div className="mt-2 flex gap-1">
                        <button
                          type="button"
                          onClick={() => handleUpdateStopStatus(selectedStop.stopNumber, 'Delivered')}
                          className="w-full py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-[10px] font-bold"
                        >
                          Mark Delivered
                        </button>
                      </div>
                    </div>
                  </InfoWindow>
                )}
              </Map>
            </GoogleMapWrapper>

            {/* Map Legend Overlay */}
            <div className="absolute bottom-3 left-3 bg-white/95 backdrop-blur-xs p-2.5 rounded-xl border border-slate-200 shadow-md text-[11px] space-y-1.5">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-slate-900" />
                <span className="text-slate-700 font-semibold">Warehouse Origin (Colombo 03)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-amber-500" />
                <span className="text-slate-700">Scheduled Delivery Stop</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-emerald-500" />
                <span className="text-slate-700">Delivered & Signed</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Ordered Stops & Manifest Dispatch */}
        <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
          <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
            <div>
              <h2 className="text-sm font-bold text-slate-800">
                Delivery Waypoint Sequence
              </h2>
              <p className="text-[11px] text-slate-500">
                {stops.length} scheduled drop-offs for {deliveryDate}
              </p>
            </div>
            <span className="px-2.5 py-1 bg-amber-100 text-amber-900 text-xs font-bold rounded-lg">
              Est. {Math.round(routeMetrics.estimatedMins / 60)}h {routeMetrics.estimatedMins % 60}m
            </span>
          </div>

          <div className="p-4 divide-y divide-slate-100 max-h-[580px] overflow-y-auto space-y-3">
            {stops.length === 0 ? (
              <div className="py-12 text-center text-slate-400">
                <Truck className="w-10 h-10 mx-auto mb-2 text-slate-300" />
                <p className="text-sm font-semibold text-slate-600">No Orders for this Delivery Date</p>
                <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto">
                  Select a different date or create an invoice with delivery date scheduled for {deliveryDate}.
                </p>
              </div>
            ) : (
              stops.map((stop, idx) => (
                <div
                  key={stop.orderId}
                  className={`pt-3 first:pt-0 rounded-xl p-3 border transition ${
                    stop.deliveryStatus === 'Delivered'
                      ? 'bg-emerald-50/50 border-emerald-200'
                      : stop.deliveryStatus === 'Out for Delivery'
                      ? 'bg-blue-50/50 border-blue-200'
                      : 'bg-white border-slate-200 hover:border-amber-300'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-2.5">
                      <div
                        className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 ${
                          stop.deliveryStatus === 'Delivered'
                            ? 'bg-emerald-600 text-white'
                            : stop.deliveryStatus === 'Out for Delivery'
                            ? 'bg-blue-600 text-white'
                            : 'bg-amber-600 text-white'
                        }`}
                      >
                        {stop.stopNumber}
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-slate-900">
                          {stop.customerBusiness || stop.customerName}
                        </h4>
                        <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-0.5">
                          <span className="font-mono text-amber-900 font-semibold">{stop.invoiceNumber}</span>
                          <span>•</span>
                          <span className="flex items-center gap-1">
                            <Phone className="w-3 h-3 text-slate-400" />
                            <a href={`tel:${stop.phone}`} className="hover:underline">{stop.phone}</a>
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Sequence reorder buttons */}
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleMoveStop(idx, 'up')}
                        disabled={idx === 0}
                        className="p-1 hover:bg-slate-100 rounded text-slate-400 hover:text-slate-700 disabled:opacity-20"
                        title="Move Stop Earlier"
                      >
                        ▲
                      </button>
                      <button
                        type="button"
                        onClick={() => handleMoveStop(idx, 'down')}
                        disabled={idx === stops.length - 1}
                        className="p-1 hover:bg-slate-100 rounded text-slate-400 hover:text-slate-700 disabled:opacity-20"
                        title="Move Stop Later"
                      >
                        ▼
                      </button>
                    </div>
                  </div>

                  {/* Address and Spices summary */}
                  <div className="mt-2.5 pl-9 space-y-1.5 text-xs">
                    <div className="flex items-start gap-1.5 text-slate-600">
                      <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                      <span className="text-[11px] leading-tight">{stop.address}, {stop.city}</span>
                    </div>

                    <div className="flex items-start gap-1.5 text-slate-700 bg-amber-50/60 p-2 rounded-lg border border-amber-100/80">
                      <Package className="w-3.5 h-3.5 text-amber-700 shrink-0 mt-0.5" />
                      <div className="text-[11px]">
                        <span className="font-medium">{stop.itemsSummary}</span>
                        <span className="text-slate-500 ml-1.5">({stop.totalWeightKg} kg total)</span>
                      </div>
                    </div>

                    {stop.notes && (
                      <p className="text-[11px] text-amber-900 italic bg-amber-100/50 px-2 py-1 rounded">
                        Note: {stop.notes}
                      </p>
                    )}

                    {/* Price & Delivery Status Action */}
                    <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                      <div>
                        <span className="text-[10px] text-slate-500 uppercase tracking-wider block">
                          {stop.paymentStatus === 'Paid' ? 'Paid Upfront' : 'Collect COD'}
                        </span>
                        <span className="text-xs font-bold text-slate-900">
                          Rs. {stop.invoiceAmount.toLocaleString()}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <select
                          value={stop.deliveryStatus}
                          onChange={(e) =>
                            handleUpdateStopStatus(
                              stop.stopNumber,
                              e.target.value as any
                            )
                          }
                          className={`text-xs font-bold rounded-lg px-2.5 py-1.5 border transition outline-none cursor-pointer ${
                            stop.deliveryStatus === 'Delivered'
                              ? 'bg-emerald-600 text-white border-emerald-700'
                              : stop.deliveryStatus === 'Out for Delivery'
                              ? 'bg-blue-600 text-white border-blue-700'
                              : 'bg-amber-100 text-amber-900 border-amber-300'
                          }`}
                        >
                          <option value="Scheduled">Scheduled</option>
                          <option value="Out for Delivery">Out for Delivery</option>
                          <option value="Delivered">Delivered</option>
                          <option value="Failed">Failed / Reschedule</option>
                        </select>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
