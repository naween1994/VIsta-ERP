import { Router } from 'express';
import { db } from '../db.ts';
import type { DeliveryRoute, DeliveryStop } from '../../src/types/index.ts';

const router = Router();

// Default central spice distribution warehouse in Colombo
const DEFAULT_WAREHOUSE = {
  name: 'NA Distributors Main Hub',
  address: 'No. 45, Temple Road, Colombo 03, Sri Lanka',
  latitude: 6.9271,
  longitude: 79.8612,
};

// Calculate Haversine distance in km between two lat/lng pairs
function haversineDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth radius in km
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

// Get pending delivery orders (invoices scheduled for future delivery or awaiting dispatch)
router.get('/pending', (req, res) => {
  const targetDate = req.query.date as string; // Optional YYYY-MM-DD
  const orders = db.getOrders();
  const customers = db.getCustomers();

  // Filter orders that need delivery
  const deliveryOrders = orders.filter((o) => {
    if (o.paymentStatus === 'Cancelled') return false;
    if (targetDate) {
      return (o.deliveryDate === targetDate) || (o.dueDate === targetDate && o.deliveryStatus !== 'Delivered');
    }
    return o.deliveryStatus !== 'Delivered';
  });

  const enrichedStops: DeliveryStop[] = deliveryOrders.map((order, index) => {
    const customer = customers.find((c) => c.id === order.customerId);
    const coordinates = order.deliveryCoordinates || customer?.coordinates || {
      latitude: 6.9271 + (Math.random() - 0.5) * 0.08,
      longitude: 79.8612 + (Math.random() - 0.5) * 0.08,
    };

    const itemsSummary = order.items.map((i) => `${i.productName} (${i.quantity}x)`).join(', ');
    const totalWeightKg = order.items.reduce((acc, i) => {
      // Estimate weight from package size
      const sizeStr = (i.packageSize || '').toLowerCase();
      let weightInKg = 0.1;
      if (sizeStr.includes('100g')) weightInKg = 0.1;
      else if (sizeStr.includes('50g')) weightInKg = 0.05;
      else if (sizeStr.includes('25g')) weightInKg = 0.025;
      else if (sizeStr.includes('250g')) weightInKg = 0.25;
      else if (sizeStr.includes('500g')) weightInKg = 0.5;
      else if (sizeStr.includes('1kg')) weightInKg = 1.0;
      else if (sizeStr.includes('25kg')) weightInKg = 25.0;
      return acc + weightInKg * i.quantity;
    }, 0);

    return {
      stopNumber: index + 1,
      orderId: order.id,
      invoiceNumber: order.invoiceNumber,
      customerId: order.customerId,
      customerName: order.customerName,
      customerBusiness: order.customerBusiness || customer?.businessName || '',
      phone: customer?.phone || '',
      address: order.deliveryAddress || customer?.address || 'Colombo, Sri Lanka',
      city: order.deliveryCity || customer?.city || 'Colombo',
      coordinates,
      itemsCount: order.items.reduce((sum, item) => sum + item.quantity, 0),
      itemsSummary,
      totalWeightKg: Math.round(totalWeightKg * 10) / 10,
      invoiceAmount: order.netTotal,
      paymentStatus: order.paymentStatus,
      deliveryStatus: order.deliveryStatus || 'Scheduled',
      notes: order.driverNotes || order.notes || '',
    };
  });

  res.json({
    success: true,
    warehouse: DEFAULT_WAREHOUSE,
    stops: enrichedStops,
    count: enrichedStops.length,
  });
});

// Get all saved delivery routes
router.get('/routes', (req, res) => {
  res.json({
    success: true,
    routes: db.getDeliveryRoutes(),
  });
});

// Save or plan a delivery route
router.post('/routes', (req, res) => {
  const data = req.body;
  if (!data.routeDate || !data.stops || !Array.isArray(data.stops)) {
    return res.status(400).json({ success: false, message: 'Route date and stops array are required' });
  }

  const warehouse = data.warehouseOrigin || DEFAULT_WAREHOUSE;
  let totalDist = 0;
  let currLat = warehouse.latitude;
  let currLng = warehouse.longitude;

  // Calculate cumulative distance across sequenced stops
  data.stops.forEach((stop: DeliveryStop, idx: number) => {
    stop.stopNumber = idx + 1;
    if (stop.coordinates) {
      totalDist += haversineDistanceKm(currLat, currLng, stop.coordinates.latitude, stop.coordinates.longitude);
      currLat = stop.coordinates.latitude;
      currLng = stop.coordinates.longitude;
    }
  });

  // Return to warehouse
  totalDist += haversineDistanceKm(currLat, currLng, warehouse.latitude, warehouse.longitude);
  totalDist = Math.round(totalDist * 10) / 10;

  // Average 25 km/h in city traffic + 15 mins delivery buffer per stop
  const estimatedDurationMins = Math.round((totalDist / 25) * 60 + data.stops.length * 15);
  const totalRevenue = data.stops.reduce((sum: number, s: DeliveryStop) => sum + (s.invoiceAmount || 0), 0);

  const newRoute: DeliveryRoute = {
    id: data.id || `route-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    routeDate: data.routeDate,
    routeName: data.routeName || `Delivery Dispatch - ${data.routeDate}`,
    driverName: data.driverName || 'Kamal Perera',
    vehicleNumber: data.vehicleNumber || 'WP CAC-4892 (Toyota HiAce)',
    warehouseOrigin: warehouse,
    stops: data.stops,
    totalDistanceKm: totalDist,
    estimatedDurationMins,
    totalInvoices: data.stops.length,
    totalRevenue,
    status: data.status || 'Planned',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const saved = db.saveDeliveryRoute(newRoute);

  // Update corresponding orders with their delivery stop number and route status
  data.stops.forEach((stop: DeliveryStop, idx: number) => {
    db.updateOrder(stop.orderId, {
      deliveryDate: data.routeDate,
      deliveryStatus: 'Scheduled',
      deliveryStopNumber: idx + 1,
    });
  });

  res.status(201).json({ success: true, route: saved });
});

// Update status of a specific stop on a delivery route (e.g. Delivered, Failed)
router.patch('/routes/:id/stop/:stopNumber/status', (req, res) => {
  const { id, stopNumber } = req.params;
  const { status, notes } = req.body;

  if (!status) {
    return res.status(400).json({ success: false, message: 'Status is required' });
  }

  const updatedRoute = db.updateDeliveryStopStatus(id, Number(stopNumber), status, notes);
  if (!updatedRoute) {
    return res.status(404).json({ success: false, message: 'Delivery route or stop not found' });
  }

  res.json({ success: true, route: updatedRoute });
});

export default router;
