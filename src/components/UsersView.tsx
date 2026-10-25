import React, { useState } from 'react';
import { 
  ShieldCheck, 
  KeyRound, 
  UserPlus, 
  Calculator, 
  Trash2, 
  RotateCcw, 
  Lock, 
  Sparkles,
  Percent,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.tsx';
import { useApp } from '../context/AppContext.tsx';
import { User, UserRole } from '../types/index.ts';
import { api } from '../utils/api.ts';
import { AdminConfirmModal } from './modals/AdminConfirmModal.tsx';
import { calculateDistributorPrice, getVolumeDiscountTier } from '../utils/pricing.ts';

const AVAILABLE_PERMISSIONS = [
  { id: 'all', label: 'Full System Access (Super Admin)' },
  { id: 'inventory_read', label: 'View Inventory & Lots' },
  { id: 'inventory_write', label: 'Add & Edit Spice Products' },
  { id: 'stock_adjust', label: 'Adjust Stock & Restock' },
  { id: 'barcode_print', label: 'Print Barcode & QR Stickers' },
  { id: 'sales_read', label: 'View Orders & Invoices' },
  { id: 'sales_write', label: 'Create & Issue Orders' },
  { id: 'customer_read', label: 'View Trade Accounts' },
  { id: 'customer_write', label: 'Create & Edit Customers' },
  { id: 'scanner', label: 'Use Hardware & Camera Scanner' },
  { id: 'accounting', label: 'Export QuickBooks / Xero & Sync' },
  { id: 'reports', label: 'View Financial P&L Analytics' },
];

export const UsersView: React.FC = () => {
  const { currentUser, users, refreshUsers, isAdmin } = useAuth();
  const { addToast } = useApp();

  // Password change state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordMsg, setPasswordMsg] = useState({ text: '', isError: false });

  // Create User state
  const [isCreatingUser, setIsCreatingUser] = useState(false);
  const [newUserName, setNewUserName] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserRole, setNewUserRole] = useState<UserRole>('sales_rep');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [resetPasswordUser, setResetPasswordUser] = useState<User | null>(null);
  const [resetPassword, setResetPassword] = useState('');
  const [resetPasswordConfirm, setResetPasswordConfirm] = useState('');
  const [resetPasswordError, setResetPasswordError] = useState('');
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([
    'sales_read',
    'sales_write',
    'customer_read',
  ]);

  // Product Price Simulator state
  const [simCostPrice, setSimCostPrice] = useState<number>(1000);
  const [simDistMarkup, setSimDistMarkup] = useState<number>(20);
  const [simTier, setSimTier] = useState<'Distributor' | 'Wholesale' | 'Retail' | 'Special'>('Distributor');
  const [simOrderScale, setSimOrderScale] = useState<number>(55000);

  // Admin confirm modal
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

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    if (newPassword !== confirmPassword) {
      setPasswordMsg({ text: 'New passwords do not match.', isError: true });
      return;
    }
    if (newPassword.length < 12) {
      setPasswordMsg({ text: 'Password must be at least 12 characters.', isError: true });
      return;
    }

    try {
      await api.changePassword(currentUser.id, currentPassword, newPassword);
      setPasswordMsg({ text: 'Password successfully changed!', isError: false });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      addToast({ type: 'success', title: 'Password Updated', message: 'Credentials saved securely' });
    } catch (err: any) {
      setPasswordMsg({ text: err.message || 'Failed to update password', isError: true });
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.createUser({
        name: newUserName.trim(),
        email: newUserEmail.trim(),
        role: newUserRole,
        permissions: newUserRole === 'admin' ? ['all'] : selectedPermissions,
        password: newUserPassword,
      });

      addToast({ type: 'success', title: 'User Created', message: `${newUserName} added to system` });
      setNewUserName('');
      setNewUserEmail('');
      setNewUserPassword('');
      setIsCreatingUser(false);
      refreshUsers();
    } catch (err: any) {
      addToast({ type: 'error', title: 'Error', message: err.message });
    }
  };

  const handleResetUserPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetPasswordUser) return;
    if (resetPassword.length < 12) {
      setResetPasswordError('Password must be at least 12 characters.');
      return;
    }
    if (resetPassword !== resetPasswordConfirm) {
      setResetPasswordError('Passwords do not match.');
      return;
    }
    try {
      await api.updateUser(resetPasswordUser.id, { password: resetPassword });
      addToast({ type: 'success', title: 'Password Reset', message: `Password updated for ${resetPasswordUser.name}` });
      setResetPasswordUser(null);
      setResetPassword('');
      setResetPasswordConfirm('');
      setResetPasswordError('');
    } catch (err: any) {
      setResetPasswordError(err.message || 'Failed to reset user password.');
    }
  };

  const handleDeleteUserPrompt = (userToDelete: any) => {
    setConfirmModalData({
      isOpen: true,
      title: `Delete User: ${userToDelete.name}?`,
      message: `Are you sure you want to remove ${userToDelete.name} (${userToDelete.email})?`,
      action: async (password: string) => {
        await api.deleteUser(userToDelete.id, password);
        addToast({ type: 'info', title: 'User Removed', message: `${userToDelete.name} deleted` });
        refreshUsers();
      },
    });
  };

  const handleResetSettingsPrompt = () => {
    setConfirmModalData({
      isOpen: true,
      title: 'Reset Company Settings to Defaults?',
      message: 'This will reset tier markup rules and company defaults back to initial presets.',
      action: async (password: string) => {
        const res = await fetch('/api/settings/reset-defaults', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ adminPassword: password }),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.message);
        addToast({ type: 'success', title: 'Reset Successful', message: json.message });
      },
    });
  };

  // Price simulator calculations
  const simDistributorPrice = calculateDistributorPrice(simCostPrice, simDistMarkup);
  const simWholesalePrice = Math.round(simCostPrice * 1.3);
  const simMrp = Math.round(simCostPrice * 1.6);
  const simBasePrice =
    simTier === 'Distributor'
      ? simDistributorPrice
      : simTier === 'Wholesale'
      ? simWholesalePrice
      : simTier === 'Retail'
      ? simMrp
      : Math.round(simDistributorPrice * 0.95);

  const activeVolTier = getVolumeDiscountTier(simOrderScale);
  const simDiscountAmt = (simOrderScale * activeVolTier.discountPercent) / 100;
  const simNetPayable = simOrderScale - simDiscountAmt;
  const simGrossProfit = simDistributorPrice - simCostPrice;
  const simMarginPercent = simDistributorPrice > 0 ? ((simGrossProfit / simDistributorPrice) * 100).toFixed(1) : '0';

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-gray-200 shadow-xs">
        <div>
          <h1 className="text-xl font-black text-gray-900 tracking-tight flex items-center space-x-2">
            <span>Users, Access & System Administration</span>
            <span className="text-xs bg-amber-100 text-amber-900 font-bold px-2 py-0.5 rounded-full">
              Enterprise RBAC
            </span>
          </h1>
          <p className="text-xs text-gray-500 mt-1">
            Role assignments, password credentials, simulation models, and protected administrative controls.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          {isAdmin && (
            <>
              <button
                onClick={handleResetSettingsPrompt}
                className="px-3.5 py-2 bg-gray-50 hover:bg-gray-100 text-gray-700 border border-gray-300 rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset Defaults</span>
              </button>

              <button
                onClick={() => setIsCreatingUser(true)}
                className="px-4 py-2 bg-amber-700 hover:bg-amber-800 text-white rounded-xl text-xs font-bold flex items-center space-x-1.5 shadow-sm transition"
              >
                <UserPlus className="w-4 h-4" />
                <span>+ Add User</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Current User Card & Switcher */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-xs p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-gray-100">
          <div className="flex items-center space-x-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-amber-800 to-amber-600 text-white flex items-center justify-center font-black text-xl shadow-md border-2 border-amber-900/20">
              {currentUser?.avatar || 'US'}
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-lg font-bold text-gray-900">{currentUser?.name}</h3>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase bg-amber-100 text-amber-900 border border-amber-300">
                  {currentUser?.role.replace('_', ' ')}
                </span>
              </div>
              <p className="text-xs text-gray-500 font-mono mt-0.5">{currentUser?.email}</p>
            </div>
          </div>

        </div>

        {/* Permissions assigned to active account */}
        <div className="pt-4">
          <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block mb-2">
            Active Permissions Assigned to Your Account:
          </span>
          <div className="flex flex-wrap gap-1.5">
            {currentUser?.permissions.includes('all') ? (
              <span className="px-2.5 py-1 bg-amber-100 text-amber-950 font-bold text-xs rounded-lg border border-amber-300">
                Full System Super Administrator (ALL permissions enabled)
              </span>
            ) : (
              currentUser?.permissions.map((p) => (
                <span
                  key={p}
                  className="px-2.5 py-1 bg-gray-100 text-gray-800 font-medium text-xs rounded-lg border border-gray-200"
                >
                  {p.replace('_', ' ')}
                </span>
              ))
            )}
          </div>
        </div>
      </div>

      {/* 2-Column: Change Password & Product Price Simulator */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Change Account Password */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-xs p-6 space-y-4">
          <div className="flex items-center space-x-2">
            <div className="p-2 bg-amber-100 text-amber-900 rounded-lg">
              <KeyRound className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-gray-900">Change Account Password</h3>
              <p className="text-[11px] text-gray-500">Update security login credentials for {currentUser?.name}</p>
            </div>
          </div>

          <form onSubmit={handlePasswordChange} className="space-y-3 pt-2">
            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                Current Password
              </label>
              <input
                type="password"
                required
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Enter your current password..."
                className="w-full px-3 py-2 border border-gray-300 rounded-xl text-xs focus:ring-2 focus:ring-amber-500 outline-hidden"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                  New Password
                </label>
                <input
                  type="password"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="At least 12 characters..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-xl text-xs focus:ring-2 focus:ring-amber-500 outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                  Confirm New Password
                </label>
                <input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repeat new password..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-xl text-xs focus:ring-2 focus:ring-amber-500 outline-hidden"
                />
              </div>
            </div>

            {passwordMsg.text && (
              <div
                className={`p-2.5 rounded-lg text-xs font-semibold ${
                  passwordMsg.isError
                    ? 'bg-red-50 text-red-700 border border-red-200'
                    : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                }`}
              >
                {passwordMsg.text}
              </div>
            )}

            <button
              type="submit"
              className="px-4 py-2 bg-amber-700 hover:bg-amber-800 text-white rounded-xl text-xs font-bold transition shadow-sm"
            >
              Update Password
            </button>
          </form>
        </div>

        {/* Product Price Simulator */}
        <div className="bg-gradient-to-br from-amber-50/80 via-orange-50/40 to-white rounded-2xl border border-amber-200 shadow-xs p-6 space-y-4">
          <div className="flex items-center space-x-2">
            <div className="p-2 bg-amber-200 text-amber-900 rounded-lg">
              <Calculator className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-amber-950">Product Price & Margin Simulator</h3>
              <p className="text-[11px] text-amber-800">Simulate cost, distributor markups, and order-volume discount impact</p>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs pt-1">
            <div>
              <label className="block text-gray-600 mb-1 font-medium">Base Cost (Rs.)</label>
              <input
                type="number"
                min="10"
                step="50"
                value={simCostPrice}
                onChange={(e) => setSimCostPrice(parseFloat(e.target.value) || 0)}
                className="w-full px-2.5 py-1.5 border border-amber-300 rounded-lg font-mono font-bold bg-white"
              />
            </div>

            <div>
              <label className="block text-gray-600 mb-1 font-medium">Distributor Markup %</label>
              <input
                type="number"
                min="0"
                max="200"
                value={simDistMarkup}
                onChange={(e) => setSimDistMarkup(parseFloat(e.target.value) || 0)}
                className="w-full px-2.5 py-1.5 border border-amber-300 rounded-lg font-mono font-bold bg-white"
              />
            </div>

            <div>
              <label className="block text-gray-600 mb-1 font-medium">Pricing Tier</label>
              <select
                value={simTier}
                onChange={(e) => setSimTier(e.target.value as any)}
                className="w-full px-2 py-1.5 border border-amber-300 rounded-lg font-semibold bg-white"
              >
                <option value="Distributor">Distributor</option>
                <option value="Wholesale">Wholesale</option>
                <option value="Retail">Retail (MRP)</option>
                <option value="Special">Special (-5%)</option>
              </select>
            </div>
          </div>

          <div className="p-3 bg-white rounded-xl border border-amber-200 text-xs space-y-1.5">
            <div className="flex justify-between">
              <span className="text-gray-600">Calculated Selling Unit Price:</span>
              <span className="font-mono font-bold text-gray-900">Rs. {simBasePrice.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Distributor Gross Profit per Unit:</span>
              <span className="font-mono font-bold text-amber-950">Rs. {simGrossProfit.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Gross Margin Percentage:</span>
              <span className="font-mono font-bold text-emerald-700">+{simMarginPercent}%</span>
            </div>
          </div>

          <div className="pt-1">
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="font-semibold text-gray-700">Test Order Scale (LKR):</span>
              <span className="font-mono font-bold text-amber-900">Rs. {simOrderScale.toLocaleString()}</span>
            </div>
            <input
              type="range"
              min="2000"
              max="150000"
              step="1000"
              value={simOrderScale}
              onChange={(e) => setSimOrderScale(parseInt(e.target.value, 10))}
              className="w-full accent-amber-700 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-gray-500 mt-0.5">
              <span>Rs. 2K (0%)</span>
              <span>Rs. 10K (3%)</span>
              <span>Rs. 50K (7%)</span>
              <span>Rs. 100K+ (10%)</span>
            </div>

            <div className="mt-2.5 p-2.5 bg-amber-100/60 rounded-lg text-xs font-medium text-amber-950 flex items-center justify-between">
              <span>
                Discount Qualified: <strong>{activeVolTier.discountPercent}%</strong> (-Rs. {simDiscountAmt.toLocaleString()})
              </span>
              <span className="font-mono font-bold">
                Net Order: Rs. {simNetPayable.toLocaleString()}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Users List & Role Permissions Table (Admin Only) */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-xs p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider">
              System User Directory ({users.length} Users)
            </h3>
            <p className="text-xs text-gray-500">Roles, access credentials, and department assignments</p>
          </div>
        </div>

        <div className="border border-gray-200 rounded-xl overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200 text-xs">
            <thead className="bg-gray-100 font-bold uppercase text-gray-700">
              <tr>
                <th className="px-4 py-3 text-left">User Name</th>
                <th className="px-4 py-3 text-left">Email Address</th>
                <th className="px-4 py-3 text-left">Assigned Role</th>
                <th className="px-4 py-3 text-left">Access Privileges</th>
                <th className="px-4 py-3 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-bold text-gray-900 flex items-center space-x-2">
                    <span className="w-6 h-6 rounded-md bg-amber-800 text-white flex items-center justify-center text-[10px]">
                      {u.avatar || u.name[0]}
                    </span>
                    <span>{u.name}</span>
                  </td>
                  <td className="px-4 py-3 font-mono text-gray-600">{u.email}</td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-amber-100 text-amber-900">
                      {u.role.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500">
                    {u.permissions.includes('all') ? 'Full Admin Access' : `${u.permissions.length} modules`}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {isAdmin && u.id !== currentUser?.id && (
                      <div className="inline-flex items-center gap-2">
                        <button
                          onClick={() => {
                            setResetPasswordUser(u);
                            setResetPassword('');
                            setResetPasswordConfirm('');
                            setResetPasswordError('');
                          }}
                          className="p-1 text-amber-700 hover:bg-amber-50 rounded"
                          title="Reset user password"
                        >
                          <KeyRound className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteUserPrompt(u)}
                          className="p-1 text-red-500 hover:bg-red-50 rounded"
                          title="Delete user"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create User Modal */}
      {isCreatingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full my-6 overflow-hidden border border-amber-200">
            <div className="bg-gradient-to-r from-amber-800 to-amber-950 px-6 py-4 flex items-center justify-between text-white">
              <h3 className="font-bold text-base">Create New System User</h3>
              <button onClick={() => setIsCreatingUser(false)} className="text-amber-200 hover:text-white p-1">
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  required
                  value={newUserName}
                  onChange={(e) => setNewUserName(e.target.value)}
                  placeholder="e.g. Sahan Wickramasinghe..."
                  className="w-full px-3 py-2 border rounded-lg text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                  Work Email Address
                </label>
                <input
                  type="email"
                  required
                  value={newUserEmail}
                  onChange={(e) => setNewUserEmail(e.target.value)}
                  placeholder="sahan@nadistributors.lk"
                  className="w-full px-3 py-2 border rounded-lg text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                    System Role
                  </label>
                  <select
                    value={newUserRole}
                    onChange={(e) => setNewUserRole(e.target.value as UserRole)}
                    className="w-full px-3 py-2 border rounded-lg text-sm bg-white"
                  >
                    <option value="sales_rep">Sales Representative</option>
                    <option value="inventory_manager">Inventory Manager</option>
                    <option value="accountant">Accountant</option>
                    <option value="admin">Administrator</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                    Initial Password
                  </label>
                  <input
                    type="password"
                    required
                    minLength={12}
                    value={newUserPassword}
                    onChange={(e) => setNewUserPassword(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg text-sm"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setIsCreatingUser(false)}
                  className="px-4 py-2 border rounded-lg text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-amber-700 text-white rounded-lg text-xs font-bold"
                >
                  Create User
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {resetPasswordUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <form onSubmit={handleResetUserPassword} className="w-full max-w-md space-y-4 rounded-2xl bg-white p-6 shadow-2xl">
            <div>
              <h3 className="text-base font-bold text-gray-900">Reset password</h3>
              <p className="mt-1 text-xs text-gray-500">Set a new password for {resetPasswordUser.name}.</p>
            </div>
            <input
              type="password"
              required
              minLength={12}
              value={resetPassword}
              onChange={(event) => setResetPassword(event.target.value)}
              placeholder="New password (at least 12 characters)"
              className="w-full rounded-lg border px-3 py-2 text-sm"
            />
            <input
              type="password"
              required
              minLength={12}
              value={resetPasswordConfirm}
              onChange={(event) => setResetPasswordConfirm(event.target.value)}
              placeholder="Confirm new password"
              className="w-full rounded-lg border px-3 py-2 text-sm"
            />
            {resetPasswordError && <p className="text-xs font-semibold text-red-600">{resetPasswordError}</p>}
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setResetPasswordUser(null)}
                className="rounded-lg border px-4 py-2 text-xs font-semibold"
              >
                Cancel
              </button>
              <button type="submit" className="rounded-lg bg-amber-700 px-4 py-2 text-xs font-semibold text-white">
                Reset password
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Admin confirm dialog */}
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
