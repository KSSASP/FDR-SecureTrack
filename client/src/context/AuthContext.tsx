import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '../types/index.js';
import { apiRequest } from '../api/client.js';

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (email: string, pass: string) => Promise<void>;
  logout: () => void;
  isSuperAdmin: boolean;
  isOfficer: boolean;
  isInstAdmin: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const savedToken = localStorage.getItem('fdr_token');
    const savedUser = localStorage.getItem('fdr_user');

    if (savedToken && savedUser) {
      try {
        setToken(savedToken);
        setUser(JSON.parse(savedUser));
        // Verify token with backend
        apiRequest<{ user: User }>('/auth/me')
          .then(data => {
            setUser(data.user);
            localStorage.setItem('fdr_user', JSON.stringify(data.user));
          })
          .catch(() => {
            logout();
          })
          .finally(() => setLoading(false));
      } catch (err) {
        logout();
        setLoading(false);
      }
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (email: string, pass: string) => {
    const res = await apiRequest<{ token: string; user: User }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password: pass })
    });

    setToken(res.token);
    setUser(res.user);
    localStorage.setItem('fdr_token', res.token);
    localStorage.setItem('fdr_user', JSON.stringify(res.user));
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('fdr_token');
    localStorage.removeItem('fdr_user');
  };

  const isSuperAdmin = user?.role === 'SUPER_ADMIN';
  const isOfficer = user?.role === 'REGULATION_OFFICER';
  const isInstAdmin = user?.role === 'INSTITUTION_ADMIN';

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        login,
        logout,
        isSuperAdmin,
        isOfficer,
        isInstAdmin
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
