import React from 'react';
import { Navbar } from './Navbar';
import { Sidebar } from './Sidebar';
import { ToastContainer } from '../common/ToastContainer';
import { SecurityIndicator } from '../common/SecurityIndicator';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export const DashboardLayout: React.FC<DashboardLayoutProps> = ({ children }) => {
  return (
    <div className="min-h-screen bg-[#060A12] flex flex-col text-slate-100">
      <Navbar />

      <div className="flex-1 flex max-w-[1600px] w-full mx-auto">
        {/* Persistent Desktop Sidebar */}
        <div className="hidden md:block">
          <Sidebar />
        </div>

        {/* Main Content Area */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 min-w-0 overflow-y-auto">
          <div className="max-w-7xl mx-auto space-y-6">
            <SecurityIndicator className="hidden sm:flex" />
            {children}
          </div>
        </main>
      </div>

      <ToastContainer />
    </div>
  );
};
