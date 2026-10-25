import { Router } from 'express';
import { db } from '../db.ts';

const router = Router();

// Get all notifications
router.get('/', (req, res) => {
  const notifs = db.getNotifications();
  const unreadCount = notifs.filter((n) => !n.read).length;
  res.json({ success: true, notifications: notifs, unreadCount });
});

// Mark single notification as read
router.patch('/:id/read', (req, res) => {
  const notif = db.markNotificationAsRead(req.params.id);
  if (!notif) {
    return res.status(404).json({ success: false, message: 'Notification not found' });
  }
  res.json({ success: true, notification: notif });
});

// Mark all as read
router.post('/mark-all-read', (req, res) => {
  db.markAllNotificationsRead();
  res.json({ success: true, message: 'All notifications marked as read' });
});

// Send payment reminder simulated message
router.post('/payment-reminders', (req, res) => {
  const { customerId, invoiceNumber, amountDue, channel, recipientContact, templateMessage } = req.body;
  
  const customer = db.getCustomerById(customerId);
  const custName = customer?.businessName || customer?.name || 'Customer';

  db.addNotification({
    id: `notif-remind-${Date.now()}`,
    title: `Payment Reminder Sent (${channel.toUpperCase()})`,
    message: `Payment reminder of Rs. ${Number(amountDue).toLocaleString()} sent to ${custName} (${recipientContact}) for ${invoiceNumber}.`,
    type: 'payment',
    timestamp: new Date().toISOString(),
    read: false,
    linkTab: 'notifications',
  });

  res.json({
    success: true,
    message: `Payment reminder recorded via ${channel} to ${recipientContact}`,
    sentAt: new Date().toISOString(),
    preview: templateMessage,
  });
});

export default router;
