import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '../types/index.ts';
import { api } from '../utils/api.ts';

interface AuthContextType {
  currentUser: User | null;
  users: User[];
  isLoading: boolean;
  login: (email: string, password?: string) => Promise<User>;
  logout: () => void;
  hasPermission: (permission: string) => boolean;
  isAdmin: boolean;
  isInventoryManager: boolean;
  isSalesRep: boolean;
  refreshUsers: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const refreshUsers = async () => {
    try {
      const sessionUser = await api.getSession();
      setCurrentUser(sessionUser);
      if (sessionUser?.role === 'admin' || sessionUser?.permissions.includes('all')) {
        setUsers(await api.getUsers());
      } else {
        setUsers([]);
      }
    } catch (err) {
      console.warn('Failed to load users from backend:', err);
      setUsers([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refreshUsers();
  }, []);

  const login = async (email: string, password?: string): Promise<User> => {
    const user = await api.login(email, password);
    setCurrentUser(user);
    if (user.role === 'admin' || user.permissions.includes('all')) {
      try {
        setUsers(await api.getUsers());
      } catch (err) {
        console.warn('Failed to load the administrator user directory:', err);
        setUsers([]);
      }
    } else {
      setUsers([]);
    }
    return user;
  };

  const logout = () => {
    setCurrentUser(null);
    setUsers([]);
    api.logout().catch((err) => console.warn('Failed to end server session:', err));
  };

  const hasPermission = (permission: string): boolean => {
    if (!currentUser) return false;
    if (currentUser.role === 'admin' || currentUser.permissions.includes('all')) return true;
    return currentUser.permissions.includes(permission);
  };

  const isAdmin = currentUser?.role === 'admin';
  const isInventoryManager = currentUser?.role === 'inventory_manager' || isAdmin;
  const isSalesRep = currentUser?.role === 'sales_rep' || isAdmin;

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        users,
        isLoading,
        login,
        logout,
        hasPermission,
        isAdmin,
        isInventoryManager,
        isSalesRep,
        refreshUsers,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
