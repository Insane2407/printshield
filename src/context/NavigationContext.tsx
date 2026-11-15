import React, { createContext, useContext, useState, useEffect } from 'react';

export type PageType = 
  | 'landing'
  | 'customer-dashboard'
  | 'operator-dashboard'
  | 'login'
  | 'register'
  | 'job-details'
  | 'receipt'
  | 'settings';

interface NavigationContextType {
  currentPage: PageType;
  selectedJobId: string | null;
  selectedReceiptId: string | null;
  navigate: (page: PageType, params?: { jobId?: string; receiptId?: string }) => void;
}

const NavigationContext = createContext<NavigationContextType | undefined>(undefined);

export const NavigationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentPage, setCurrentPage] = useState<PageType>('landing');
  const [selectedJobId, setSelectedJobId] = useState<string | null>('job-8041');
  const [selectedReceiptId, setSelectedReceiptId] = useState<string | null>('rcpt-8041');

  // Sync hash routing for easy browser navigation
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace('#', '').trim();
      if (!hash) {
        setCurrentPage('landing');
        return;
      }

      if (hash.startsWith('job/')) {
        const id = hash.replace('job/', '');
        setSelectedJobId(id);
        setCurrentPage('job-details');
      } else if (hash.startsWith('receipt/')) {
        const id = hash.replace('receipt/', '');
        setSelectedReceiptId(id);
        setCurrentPage('receipt');
      } else if (['landing', 'customer-dashboard', 'operator-dashboard', 'login', 'register', 'job-details', 'receipt', 'settings'].includes(hash)) {
        setCurrentPage(hash as PageType);
      }
    };

    handleHashChange();
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const navigate = (page: PageType, params?: { jobId?: string; receiptId?: string }) => {
    if (params?.jobId) {
      setSelectedJobId(params.jobId);
      window.location.hash = `job/${params.jobId}`;
    } else if (params?.receiptId) {
      setSelectedReceiptId(params.receiptId);
      window.location.hash = `receipt/${params.receiptId}`;
    } else {
      window.location.hash = page === 'landing' ? '' : page;
    }
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <NavigationContext.Provider
      value={{
        currentPage,
        selectedJobId,
        selectedReceiptId,
        navigate,
      }}
    >
      {children}
    </NavigationContext.Provider>
  );
};

export const useNavigation = () => {
  const context = useContext(NavigationContext);
  if (!context) {
    throw new Error('useNavigation must be used within a NavigationProvider');
  }
  return context;
};
