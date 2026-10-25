import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '../types/index.ts';
import { api } from '../utils/api.ts';

interface AuthContextType {
  currentUser: User | null;
  users: User[];
  isLoading: boolean;
  login: (email: string, password?: string) => Promise<User>;
  loginDirect: (user: User) => void;
  logout: () => void;
  switchUser: (userId: string) => Promise<void>;
  hasPermission: (permission: string) => boolean;
  isAdmin: boolean;
  isInventoryManager: boolean;
  isSalesRep: boolean;
  refreshUsers: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const SESSION_STORAGE_KEY = 'na_dist_session_user_id';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const refreshUsers = async () => {
    try {
      const userList = await api.getUsers();
      setUsers(userList);

      // Only restore user if they explicitly had an active session stored
      const savedUserId = localStorage.getItem(SESSION_STORAGE_KEY);
      if (savedUserId && userList.length > 0) {
        const found = userList.find((u) => u.id === savedUserId);
        if (found) {
          setCurrentUser(found);
        }
      }
    } catch (err) {
      console.warn('Failed to load users from backend:', err);
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
    localStorage.setItem(SESSION_STORAGE_KEY, user.id);
    return user;
  };

  const loginDirect = (user: User) => {
    setCurrentUser(user);
    localStorage.setItem(SESSION_STORAGE_KEY, user.id);
  };

  const logout = () => {
    setCurrentUser(null);
    localStorage.removeItem(SESSION_STORAGE_KEY);
  };

  const switchUser = async (userId: string) => {
    try {
      const user = await api.switchUser(userId);
      setCurrentUser(user);
      localStorage.setItem(SESSION_STORAGE_KEY, user.id);
    } catch (err: any) {
      // Fallback in-memory switch
      const found = users.find((u) => u.id === userId);
      if (found) {
        setCurrentUser(found);
        localStorage.setItem(SESSION_STORAGE_KEY, found.id);
      }
    }
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
        loginDirect,
        logout,
        switchUser,
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
