import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { api, getStoredToken, getStoredUser, setStoredSession, clearStoredSession } from '../lib/api.ts';
import type { AuthSession, AppNotification } from '../shared/types.ts';

interface AuthContextType {
  user: AuthSession['user'] | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
  isStudent: boolean;
  isLoading: boolean;
  login: (identifier: string, password: string, role?: 'student' | 'admin') => Promise<void>;
  register: (payload: {
    fullName: string;
    collegeName: string;
    department: string;
    academicYear: string;
    phoneNumber: string;
    email: string;
    password: string;
    confirmPassword: string;
  }) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  notifications: AppNotification[];
  unreadNotifsCount: number;
  refreshNotifications: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthSession['user'] | null>(getStoredUser());
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);

  const refreshUser = useCallback(async () => {
    const token = getStoredToken();
    if (!token) {
      setUser(null);
      setIsLoading(false);
      return;
    }
    try {
      const res = await api.getCurrentUser();
      setUser(res.user);
      localStorage.setItem('lexora_auth_user', JSON.stringify(res.user));
    } catch (err) {
      console.warn('Session verification failed, logging out:', err);
      clearStoredSession();
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const refreshNotifications = useCallback(async () => {
    if (!user) return;
    try {
      const notifs = await api.getNotifications();
      setNotifications(notifs);
    } catch {
      // quiet fail
    }
  }, [user]);

  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  useEffect(() => {
    if (user) {
      refreshNotifications();
      const interval = setInterval(refreshNotifications, 20000);
      return () => clearInterval(interval);
    }
  }, [user, refreshNotifications]);

  const login = async (identifier: string, password: string, role?: 'student' | 'admin') => {
    const session = await api.login({ identifier, password, role });
    setStoredSession(session);
    setUser(session.user);
    await refreshNotifications();
  };

  const register = async (payload: {
    fullName: string;
    collegeName: string;
    department: string;
    academicYear: string;
    phoneNumber: string;
    email: string;
    password: string;
    confirmPassword: string;
  }) => {
    const session = await api.register(payload);
    setStoredSession(session);
    setUser(session.user);
    await refreshNotifications();
  };

  const logout = async () => {
    try {
      await api.logout();
    } catch {
      // ignore
    } finally {
      clearStoredSession();
      setUser(null);
      setNotifications([]);
    }
  };

  const unreadNotifsCount = notifications.filter((n) => !n.isRead).length;

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isAdmin: user?.role === 'admin',
        isStudent: user?.role === 'student',
        isLoading,
        login,
        register,
        logout,
        refreshUser,
        notifications,
        unreadNotifsCount,
        refreshNotifications,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
