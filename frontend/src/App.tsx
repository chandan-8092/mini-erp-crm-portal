import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import MainLayout from './layouts/MainLayout';

// Pages
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Customers from './pages/Customers';
import CustomerDetails from './pages/CustomerDetails';
import Products from './pages/Products';
import StockMovements from './pages/StockMovements';
import Challans from './pages/Challans';
import ChallanDetails from './pages/ChallanDetails';
import Unauthorized from './pages/Unauthorized';

const App: React.FC = () => {
  return (
    <Router>
      <AuthProvider>
        <Routes>
          {/* Public / Auth Page */}
          <Route path="/login" element={<Login />} />

          {/* Protected Main Panel Routes */}
          <Route element={<ProtectedRoute />}>
            <Route element={<MainLayout />}>
              {/* Dashboard available to all logged in roles */}
              <Route path="/dashboard" element={<Dashboard />} />

              {/* Customers CRM - Admin, Sales, Accounts */}
              <Route element={<ProtectedRoute allowedRoles={['ADMIN', 'SALES', 'ACCOUNTS']} />}>
                <Route path="/customers" element={<Customers />} />
                <Route path="/customers/:id" element={<CustomerDetails />} />
              </Route>

              {/* Products & Inventory - Admin, Sales, Warehouse, Accounts */}
              <Route path="/products" element={<Products />} />

              {/* Global Stock Movements Audit Log - Admin & Warehouse only */}
              <Route element={<ProtectedRoute allowedRoles={['ADMIN', 'WAREHOUSE']} />}>
                <Route path="/stock-movements" element={<StockMovements />} />
              </Route>

              {/* Sales Challans - Admin, Sales, Warehouse, Accounts */}
              <Route path="/challans" element={<Challans />} />
              <Route path="/challans/:id" element={<ChallanDetails />} />

              {/* Unauthorized Fallback */}
              <Route path="/unauthorized" element={<Unauthorized />} />
            </Route>
          </Route>

          {/* Root Redirects */}
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </AuthProvider>
    </Router>
  );
};

export default App;
