import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useEffect, createContext, useContext } from 'react';
import { useAuth } from './store/authStore';
import Login from './pages/Login';
import MainLayout from './layouts/MainLayout';
import Dashboard from './pages/Dashboard';
import ProcessingOrders from './pages/orders/ProcessingOrders';
import ProcessingOrderDetail from './pages/orders/ProcessingOrderDetail';
import MaterialOrders from './pages/orders/MaterialOrders';
import MaterialOrderDetail from './pages/orders/MaterialOrderDetail';
import Payments from './pages/finance/Payments';
import PaymentDetail from './pages/finance/PaymentDetail';
import Invoices from './pages/finance/Invoices';
import InvoiceDetail from './pages/finance/InvoiceDetail';
import LogisticsList from './pages/logistics/LogisticsList';
import LogisticsDetail from './pages/logistics/LogisticsDetail';
import Suppliers from './pages/suppliers/Suppliers';
import SupplierDetail from './pages/suppliers/SupplierDetail';
import PriceCompare from './pages/suppliers/PriceCompare';
import OperationLogs from './pages/system/OperationLogs';
import Notifications from './pages/system/Notifications';

const AuthContext = createContext<any>(null);

export const useAuthContext = () => useContext(AuthContext);

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <div style={{ padding: 50, textAlign: 'center' }}>加载中...</div>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
}

function App() {
  const auth = useAuth();

  return (
    <AuthContext.Provider value={auth}>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <MainLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="orders/processing" element={<ProcessingOrders />} />
          <Route path="orders/processing/:id" element={<ProcessingOrderDetail />} />
          <Route path="orders/material" element={<MaterialOrders />} />
          <Route path="orders/material/:id" element={<MaterialOrderDetail />} />
          <Route path="finance/payments" element={<Payments />} />
          <Route path="finance/payments/:id" element={<PaymentDetail />} />
          <Route path="finance/invoices" element={<Invoices />} />
          <Route path="finance/invoices/:id" element={<InvoiceDetail />} />
          <Route path="logistics" element={<LogisticsList />} />
          <Route path="logistics/:id" element={<LogisticsDetail />} />
          <Route path="suppliers" element={<Suppliers />} />
          <Route path="suppliers/:id" element={<SupplierDetail />} />
          <Route path="suppliers/price-compare" element={<PriceCompare />} />
          <Route path="system/logs" element={<OperationLogs />} />
          <Route path="system/notifications" element={<Notifications />} />
        </Route>
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </AuthContext.Provider>
  );
}

export default App;
