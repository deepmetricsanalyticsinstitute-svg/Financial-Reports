import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface User {
  username: string;
  role: 'admin' | 'user';
}

interface AuthContextType {
  user: User | null;
  login: (username: string, password?: string) => boolean;
  signup: (username: string, password?: string) => boolean;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check localStorage for existing session
    const storedUser = localStorage.getItem('financial_user');
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch (e) {
        console.error('Failed to parse user from local storage', e);
        localStorage.removeItem('financial_user');
      }
    }
    setLoading(false);
  }, []);

  const login = (username: string, password?: string): boolean => {
    // Check against stored users
    const usersJson = localStorage.getItem('financial_users_db');
    const users = usersJson ? JSON.parse(usersJson) : {};

    // If no users exist yet, allow admin login or if password matches
    // For prototype: if user exists, check password. If not, fail.
    if (users[username]) {
      if (users[username] === password) {
        const newUser: User = { username, role: 'admin' };
        setUser(newUser);
        localStorage.setItem('financial_user', JSON.stringify(newUser));
        return true;
      } else {
        return false;
      }
    } else {
      // Allow legacy "admin123" bypass if user doesn't exist in DB (optional, but cleaner to enforce signup)
      // Let's enforce signup for new users, but keep a backdoor for demo if needed? 
      // No, let's be strict: must exist in DB.
      // EXCEPT: If the DB is empty, maybe allow a default admin?
      // Let's just return false if user not found.
      return false;
    }
  };

  const signup = (username: string, password?: string): boolean => {
    const usersJson = localStorage.getItem('financial_users_db');
    const users = usersJson ? JSON.parse(usersJson) : {};

    if (users[username]) {
      return false; // User already exists
    }

    users[username] = password;
    localStorage.setItem('financial_users_db', JSON.stringify(users));
    
    // Auto login after signup
    const newUser: User = { username, role: 'user' };
    setUser(newUser);
    localStorage.setItem('financial_user', JSON.stringify(newUser));
    
    return true;
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('financial_user');
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-slate-50">Loading...</div>;
  }

  return (
    <AuthContext.Provider value={{ user, login, signup, logout, isAuthenticated: !!user }}>
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
