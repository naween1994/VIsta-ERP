import { Router } from 'express';
import { db } from '../db.ts';

const router = Router();

// Get current users list (passwords omitted)
router.get('/users', (req, res) => {
  res.json({ success: true, users: db.getUsers() });
});

// Authenticate / Login
router.post('/login', (req, res) => {
  const { email, password } = req.body;
  if (!email) {
    return res.status(400).json({ success: false, message: 'Email is required' });
  }

  const user = db.authenticate(email, password || 'password123');
  if (!user) {
    return res.status(401).json({ success: false, message: 'Invalid credentials or user not found' });
  }

  res.json({ success: true, user });
});

// Switch active user by ID
router.post('/switch-user', (req, res) => {
  const { userId } = req.body;
  const user = db.getUserById(userId);
  if (!user) {
    return res.status(404).json({ success: false, message: 'User not found' });
  }
  const { password, ...safeUser } = user;
  res.json({ success: true, user: safeUser });
});

// Change user password
router.post('/change-password', (req, res) => {
  const { userId, currentPassword, newPassword } = req.body;
  const user = db.getUserById(userId);
  if (!user) {
    return res.status(404).json({ success: false, message: 'User not found' });
  }

  if (user.password && user.password !== currentPassword) {
    return res.status(403).json({ success: false, message: 'Incorrect current password' });
  }

  db.updateUser(userId, { password: newPassword });
  res.json({ success: true, message: 'Password updated successfully' });
});

// Create user (Admin only)
router.post('/users', (req, res) => {
  const { name, email, role, permissions, password } = req.body;
  if (!name || !email || !role) {
    return res.status(400).json({ success: false, message: 'Name, email, and role are required' });
  }

  const newUser = {
    id: `user-${Date.now()}`,
    name,
    email,
    role,
    permissions: permissions || ['sales_read', 'customer_read'],
    password: password || 'password123',
    avatar: name.split(' ').map((n: string) => n[0]).join('').toUpperCase().substring(0, 2),
  };

  db.addUser(newUser);
  const { password: _, ...safeUser } = newUser;
  res.status(201).json({ success: true, user: safeUser });
});

// Update user
router.put('/users/:id', (req, res) => {
  const { id } = req.params;
  const updated = db.updateUser(id, req.body);
  if (!updated) {
    return res.status(404).json({ success: false, message: 'User not found' });
  }
  res.json({ success: true, user: updated });
});

// Delete user with admin check
router.delete('/users/:id', (req, res) => {
  const { id } = req.params;
  const { adminPassword } = req.body;

  // Verify admin password
  const admin = db.getState().users.find((u) => u.role === 'admin');
  if (admin?.password && admin.password !== adminPassword) {
    return res.status(403).json({ success: false, message: 'Invalid admin confirmation password' });
  }

  const success = db.deleteUser(id);
  if (!success) {
    return res.status(404).json({ success: false, message: 'User not found or cannot delete' });
  }
  res.json({ success: true, message: 'User removed' });
});

export default router;
