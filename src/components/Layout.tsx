import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLocation, NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Package,
  Receipt,
  ShoppingCart,
} from 'lucide-react';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';

const mobileNavItems = [
  { path: '/', label: 'Dash', icon: LayoutDashboard },
  { path: '/inventory', label: 'Items', icon: Package },
  { path: '/orders', label: 'Orders', icon: ShoppingCart },
  { path: '/costs', label: 'Costs', icon: Receipt },
];

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const location = useLocation();

  return (
    <div className="min-h-[100dvh]" style={{ backgroundColor: '#0B0D12' }}>
      <Sidebar />
      <TopBar />

      {/* Main content area */}
      <main
        className="pt-[56px] pl-0 md:pl-[240px] pb-16 md:pb-0"
        style={{ minHeight: '100dvh' }}
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{
              duration: 0.2,
              ease: [0.0, 0.0, 0.2, 1] as [number, number, number, number],
            }}
            className="p-4 md:p-8"
          >
            {children}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Mobile bottom navigation */}
      <nav
        className="fixed bottom-0 left-0 right-0 z-[70] flex md:hidden items-center justify-around"
        style={{
          height: '64px',
          backgroundColor: 'rgba(9,10,16,0.95)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          borderTop: '1px solid #1E2130',
        }}
      >
        {mobileNavItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === '/'}
              className={({ isActive }) =>
                `flex flex-col items-center justify-center gap-0.5 w-16 h-full transition-colors duration-150 ${
                  isActive ? 'text-[#6366F1]' : 'text-[#5C6078]'
                }`
              }
            >
              <Icon size={22} />
              <span className="text-[10px] font-medium">{item.label}</span>
            </NavLink>
          );
        })}
      </nav>
    </div>
  );
};
