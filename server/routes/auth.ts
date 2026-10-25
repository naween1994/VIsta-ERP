import { Router } from 'express';
import { db } from '../db.ts';
import { clearSessionCookie, setSessionCookie } from '../session.ts';

const router = Router();

// User records are available only after authentication middleware validates the session.
router.get('/users', (req, res) => {
  res.json({ success: true, users: db.getUsers() });
});

router.get('/session', (req, res) => {
  const user = res.locals.user;
  if (!user) {
    res.json({ success: true, user: null });
    return;
  }
  const { password, ...safeUser } = user;
  res.json({ success: true, user: safeUser });
});

// Authenticate / Login
router.post('/login', (req, res) => {
  const { email, password } = req.body;
  if (typeof email !== 'string' || !email || typeof password !== 'string' || !password) {
    return res.status(400).json({ success: false, message: 'Email and password are required.' });
  }

  const user = db.authenticate(email, password);
  if (!user) {
    return res.status(401).json({ success: false, message: 'Invalid credentials or user not found' });
  }

  const storedUser = db.getState().users.find((item) => item.id === user.id);
  if (!storedUser) {
    return res.status(401).json({ success: false, message: 'Invalid credentials or user not found' });
  }
  setSessionCookie(res, storedUser.id);
  res.json({ success: true, user });
});

router.post('/logout', (_req, res) => {
  clearSessionCookie(res);
  res.json({ success: true });
});

// Change user password
router.post('/change-password', (req, res) => {
  const { userId, currentPassword, newPassword } = req.body;
  const sessionUser = res.locals.user;
  if (!sessionUser || sessionUser.id !== userId) {
    return res.status(403).json({ success: false, message: 'You can only change your own password.' });
  }
  if (typeof newPassword !== 'string' || newPassword.length < 12) {
    return res.status(400).json({ success: false, message: 'New password must be at least 12 characters long.' });
  }
  const user = db.getUserById(userId);
  if (!user) {
    return res.status(404).json({ success: false, message: 'User not found' });
  }

  if (!db.verifyUserPassword(userId, currentPassword)) {
    return res.status(403).json({ success: false, message: 'Incorrect current password' });
  }

  db.updateUser(userId, { password: newPassword });
  res.json({ success: true, message: 'Password updated successfully' });
});

// Create user (Admin only)
router.post('/users', (req, res) => {
  const { name, email, role, permissions, password } = req.body;
  if (!name || !email || !role || typeof password !== 'string' || password.length < 12) {
    return res.status(400).json({
      success: false,
      message: 'Name, email, role, and a password of at least 12 characters are required.',
    });
  }

  const newUser = {
    id: `user-${Date.now()}`,
    name,
    email,
    role,
    permissions: permissions || ['sales_read', 'customer_read'],
    password,
    avatar: name.split(' ').map((n: string) => n[0]).join('').toUpperCase().substring(0, 2),
  };

  db.addUser(newUser);
  const { password: _, ...safeUser } = newUser;
  res.status(201).json({ success: true, user: safeUser });
});

// Update user
router.put('/users/:id', (req, res) => {
  const { id } = req.params;
  if (req.body.password !== undefined && (
    typeof req.body.password !== 'string' || req.body.password.length < 12
  )) {
    return res.status(400).json({
      success: false,
      message: 'Password must be at least 12 characters long.',
    });
  }
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
  if (!admin || !db.verifyUserPassword(admin.id, adminPassword)) {
    return res.status(403).json({ success: false, message: 'Invalid admin confirmation password' });
  }

  const success = db.deleteUser(id);
  if (!success) {
    return res.status(404).json({ success: false, message: 'User not found or cannot delete' });
  }
  res.json({ success: true, message: 'User removed' });
});

export default router;
