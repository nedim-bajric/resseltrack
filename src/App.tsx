import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { Layout } from '@/components/Layout';
import { Dashboard } from '@/pages/Dashboard';
import Inventory from '@/pages/Inventory';
import AddItem from '@/pages/AddItem';
import InventoryDetail from '@/pages/InventoryDetail';
import Costs from '@/pages/Costs';
import AddCost from '@/pages/AddCost';
import Orders from '@/pages/Orders';
import CreateOrder from '@/pages/CreateOrder';
import Login from '@/pages/Login';

function AppRoutes() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[100dvh]" style={{ backgroundColor: '#0B0D12' }}>
        <div className="flex flex-col items-center gap-3">
          <div
            className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin"
            style={{ borderColor: '#6366F1', borderTopColor: 'transparent' }}
          />
          <span className="text-xs" style={{ color: '#5C6078' }}>Loading...</span>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Login />;
  }

  return (
    <HashRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/inventory" element={<Inventory />} />
          <Route path="/inventory/add" element={<AddItem />} />
          <Route path="/inventory/:id" element={<InventoryDetail />} />
          <Route path="/orders" element={<Orders />} />
          <Route path="/orders/create" element={<CreateOrder />} />
          <Route path="/costs" element={<Costs />} />
          <Route path="/costs/add" element={<AddCost />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Layout>
    </HashRouter>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  );
}

export default App;
