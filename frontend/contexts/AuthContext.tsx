import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export interface User {
  userId: string;
  username: string;
  role: string;
  email?: string;
  token: string;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (credentials: { username: string; password: string }) => Promise<void>;
  logout: () => void;
  error: string | null;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const API_BASE = '';

// Check if running on static hosting (GitHub Pages only)
// Note: Does NOT flag localhost - allows online mode with backend API
const isStaticHosting = (): boolean => {
  if (typeof window === 'undefined') return false;
  const hostname = window.location.hostname;
  // Only detect actual static hosting platforms (no backend possible)
  return hostname.includes('github.') || 
         hostname.includes('.github.io') || 
         hostname.includes('pages.');
};

// Static users for GitHub Pages (offline authentication)
const STATIC_USERS: Record<string, { password: string; user: User }> = {
  'sre-admin': {
    password: 'password$$',
    user: {
      userId: 'sre-admin-001',
      username: 'sre-admin',
      role: 'admin',
      email: 'sre-admin@cisco.com',
      token: 'static-token-sre-admin'
    }
  },
  'admin': {
    password: 'admin123',
    user: {
      userId: 'admin-001',
      username: 'admin',
      role: 'admin',
      email: 'admin@cisco.com',
      token: 'static-token-admin'
    }
  },
  'viewer': {
    password: 'viewer123',
    user: {
      userId: 'viewer-001',
      username: 'viewer',
      role: 'viewer',
      email: 'viewer@cisco.com',
      token: 'static-token-viewer'
    }
  }
};

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Check for existing session on mount
  useEffect(() => {
    const checkAuth = async () => {
      const storedToken = localStorage.getItem('authToken');
      const storedUser = localStorage.getItem('authUser');

      if (storedToken && storedUser) {
        // For static hosting, just restore from localStorage
        if (isStaticHosting()) {
          try {
            const parsedUser = JSON.parse(storedUser);
            setUser({ ...parsedUser, token: storedToken });
          } catch {
            localStorage.removeItem('authToken');
            localStorage.removeItem('authUser');
          }
          setIsLoading(false);
          return;
        }

        try {
          // Verify token is still valid
          const response = await fetch(`${API_BASE}/api/auth/me`, {
            headers: {
              'Authorization': `Bearer ${storedToken}`,
            },
          });

          if (response.ok) {
            const userData = await response.json();
            setUser({ ...userData, token: storedToken });
          } else {
            // Token invalid, clear storage
            localStorage.removeItem('authToken');
            localStorage.removeItem('authUser');
          }
        } catch (err) {
          // Network error, but keep local session
          try {
            const parsedUser = JSON.parse(storedUser);
            setUser({ ...parsedUser, token: storedToken });
          } catch {
            localStorage.removeItem('authToken');
            localStorage.removeItem('authUser');
          }
        }
      }
      setIsLoading(false);
    };

    checkAuth();
  }, []);

  const login = async (credentials: { username: string; password: string }) => {
    setIsLoading(true);
    setError(null);

    // Static hosting authentication (GitHub Pages)
    if (isStaticHosting()) {
      const staticUser = STATIC_USERS[credentials.username];
      if (staticUser && staticUser.password === credentials.password) {
        const userData = staticUser.user;
        localStorage.setItem('authToken', userData.token);
        localStorage.setItem('authUser', JSON.stringify(userData));
        setUser(userData);
        setIsLoading(false);
        return;
      } else {
        setError('Invalid username or password');
        setIsLoading(false);
        throw new Error('Invalid username or password');
      }
    }

    try {
      const response = await fetch(`${API_BASE}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(credentials),
      });

      if (!response.ok) {
        let errorMsg = 'Login failed';
        try {
          const errorData = await response.json();
          errorMsg = errorData.error || errorData.message || errorMsg;
        } catch {
          // Server returned non-JSON error body (e.g. empty 500)
        }
        throw new Error(errorMsg);
      }

      const data = await response.json();

      const userData: User = {
        userId: data.userId,
        username: data.username,
        role: data.role,
        email: data.email,
        token: data.token,
      };

      // Store in localStorage
      localStorage.setItem('authToken', data.token);
      localStorage.setItem('authUser', JSON.stringify(userData));

      setUser(userData);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Login failed';
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('authToken');
    localStorage.removeItem('authUser');
    setError(null);
  };

  const clearError = () => setError(null);

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        logout,
        error,
        clearError,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;
