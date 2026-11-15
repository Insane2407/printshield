import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, UserRole } from '../types';
import { currentUserCustomer, currentUserOperator } from '../data/sampleData';

interface AuthContextType {
  user: User | null;
  role: UserRole;
  isAuthenticated: boolean;
  login: (email: string, role: UserRole) => Promise<void>;
  register: (name: string, email: string, role: UserRole) => Promise<void>;
  logout: () => void;
  switchRole: (newRole: UserRole) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [role, setRole] = useState<UserRole>('customer');
  const [user, setUser] = useState<User | null>(currentUserCustomer);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(true);

  useEffect(() => {
    // Keep user aligned with role default when role changes
    if (role === 'operator') {
      setUser(currentUserOperator);
    } else {
      setUser(currentUserCustomer);
    }
  }, [role]);

  const login = async (email: string, selectedRole: UserRole) => {
    setRole(selectedRole);
    if (selectedRole === 'operator') {
      setUser({
        ...currentUserOperator,
        email: email || currentUserOperator.email
      });
    } else {
      setUser({
        ...currentUserCustomer,
        email: email || currentUserCustomer.email
      });
    }
    setIsAuthenticated(true);
  };

  const register = async (name: string, email: string, selectedRole: UserRole) => {
    setRole(selectedRole);
    const newUser: User = {
      id: `usr-${Date.now()}`,
      name,
      email,
      role: selectedRole,
      keyFingerprint: `SHA256:${Array.from({ length: 8 }, () => Math.floor(Math.random() * 256).toString(16).padStart(2, '0').toUpperCase()).join(':')}`,
      createdDate: new Date().toISOString().split('T')[0],
      ...(selectedRole === 'operator' ? { terminalId: 'TERM-CYBERHUB-NEW' } : {})
    };
    setUser(newUser);
    setIsAuthenticated(true);
  };

  const logout = () => {
    setIsAuthenticated(false);
    setUser(null);
  };

  const switchRole = (newRole: UserRole) => {
    setRole(newRole);
    setIsAuthenticated(true);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        role,
        isAuthenticated,
        login,
        register,
        logout,
        switchRole,
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
