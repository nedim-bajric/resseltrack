import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Package,
  Receipt,
  ShoppingCart,
} from 'lucide-react';

const navItems = [
  { path: '/', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/inventory', label: 'Inventory', icon: Package },
  { path: '/orders', label: 'Orders', icon: ShoppingCart },
  { path: '/costs', label: 'Costs', icon: Receipt },
];

export const Sidebar: React.FC = () => {
  return (
    <aside
      className="fixed left-0 top-0 h-full w-[240px] z-[60] hidden md:flex flex-col"
      style={{
        backgroundColor: '#090A10',
        borderRight: '1px solid #1E2130',
      }}
    >
      {/* Logo */}
      <div
        className="flex items-center gap-3 px-6 font-semibold text-base"
        style={{ height: '64px', color: '#E8EAF0' }}
      >
        <Package size={22} className="text-[#6366F1]" />
        <span>ResellTrack</span>
      </div>

      {/* Nav Items */}
      <nav className="flex-1 px-3 mt-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === '/'}
              className={({ isActive }) =>
                `flex items-center gap-3 h-10 px-3 rounded-lg text-sm font-medium transition-all duration-150 ${
                  isActive
                    ? 'text-[#6366F1]'
                    : 'text-[#8B8FA3] hover:text-[#E8EAF0] hover:bg-[#1A1D26]'
                }`
              }
              style={({ isActive }) =>
                isActive
                  ? {
                      backgroundColor: 'rgba(99,102,241,0.12)',
                      borderLeft: '4px solid #6366F1',
                      paddingLeft: '8px',
                    }
                  : {}
              }
            >
              {({ isActive }) => (
                <>
                  <Icon size={20} />
                  <span
                    style={{
                      marginLeft: isActive ? '0px' : '4px',
                    }}
                  >
                    {item.label}
                  </span>
                </>
              )}
            </NavLink>
          );
        })}
      </nav>
    </aside>
  );
};
