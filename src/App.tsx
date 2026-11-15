import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { JobProvider } from './context/JobContext';
import { NewJobModal } from './components/jobs/NewJobModal';

// Pages
import { LandingPage } from './pages/LandingPage';
import { CustomerDashboardPage } from './pages/CustomerDashboardPage';
import { OperatorDashboardPage } from './pages/OperatorDashboardPage';
import { JobDetailsPage } from './pages/JobDetailsPage';
import { ReceiptPage } from './pages/ReceiptPage';
import { ReceiptVerificationPage } from './pages/ReceiptVerificationPage';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { SettingsPage } from './pages/SettingsPage';

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <AuthProvider>
        <JobProvider>
          <Routes>
            {/* Landing */}
            <Route path="/" element={<LandingPage />} />

            {/* Customer Suite */}
            <Route path="/customer" element={<CustomerDashboardPage />} />
            <Route path="/customer/jobs/:jobId" element={<JobDetailsPage />} />
            <Route path="/customer/receipt/:receiptId" element={<ReceiptPage />} />
            <Route path="/customer/receipt/:receiptId/verify" element={<ReceiptVerificationPage />} />

            {/* Operator Kiosk Terminal */}
            <Route path="/operator" element={<OperatorDashboardPage />} />
            <Route path="/operator/jobs/:jobId" element={<JobDetailsPage />} />
            <Route path="/operator/receipt/:receiptId" element={<ReceiptPage />} />
            <Route path="/operator/receipt/:receiptId/verify" element={<ReceiptVerificationPage />} />

            {/* Public Cryptographic Receipt Verification */}
            <Route path="/verify-receipt" element={<ReceiptVerificationPage />} />

            {/* General Routes */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/settings" element={<SettingsPage />} />

            {/* 404 Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>

          {/* Global Encrypt & Print Modal */}
          <NewJobModal />
        </JobProvider>
      </AuthProvider>
    </BrowserRouter>
  );
};

export default App;
