import React from 'react';
import { useLocation } from 'react-router-dom';
import { Package, Receipt, LogOut } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

export const TopBar: React.FC = () => {
  const location = useLocation();
  const { signOut } = useAuth();
  const path = location.pathname;

  let pageTitle = 'Dashboard';
  let breadcrumb: string | null = null;

  if (path.startsWith('/inventory/add')) {
    pageTitle = 'Add Item';
    breadcrumb = 'Inventory / Add Item';
  } else if (path.startsWith('/inventory/')) {
    pageTitle = 'Item Details';
    breadcrumb = 'Inventory / Details';
  } else if (path === '/inventory') {
    pageTitle = 'Inventory';
  } else if (path.startsWith('/costs/add')) {
    pageTitle = 'Add Cost';
    breadcrumb = 'Costs / Add Cost';
  } else if (path === '/costs') {
    pageTitle = 'Costs';
  }

  return (
    <header
      className="fixed top-0 left-0 md:left-[240px] right-0 z-50 flex items-center justify-between px-4 md:px-8"
      style={{
        height: '56px',
        backgroundColor: 'rgba(11,13,18,0.8)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        borderBottom: '1px solid #1E2130',
      }}
    >
      {/* Left: Title + breadcrumb */}
      <div className="flex flex-col justify-center">
        <h1
          className="font-semibold text-xl leading-tight"
          style={{ color: '#E8EAF0', letterSpacing: '-0.01em' }}
        >
          {pageTitle}
        </h1>
        {breadcrumb && (
          <span className="text-[11px] text-[#5C6078] leading-tight mt-0.5">
            {breadcrumb}
          </span>
        )}
      </div>

      {/* Right: Action buttons */}
      <div className="flex items-center gap-2 md:gap-3">
        <Link
          to="/inventory/add"
          className="hidden md:inline-flex items-center gap-2 h-8 px-4 rounded-lg text-sm font-medium transition-all duration-150"
          style={{
            backgroundColor: '#6366F1',
            color: '#0B0D12',
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.backgroundColor = '#818CF8';
            (e.currentTarget as HTMLElement).style.transform = 'translateY(-1px)';
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.backgroundColor = '#6366F1';
            (e.currentTarget as HTMLElement).style.transform = 'translateY(0)';
          }}
        >
          <Package size={16} />
          <span>Add Item</span>
        </Link>
        <Link
          to="/costs/add"
          className="hidden md:inline-flex items-center gap-2 h-8 px-4 rounded-lg text-sm font-medium transition-all duration-150"
          style={{
            backgroundColor: '#11131A',
            color: '#E8EAF0',
            border: '1px solid #1E2130',
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.backgroundColor = '#1A1D26';
            (e.currentTarget as HTMLElement).style.borderColor = '#2E3250';
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.backgroundColor = '#11131A';
            (e.currentTarget as HTMLElement).style.borderColor = '#1E2130';
          }}
        >
          <Receipt size={16} />
          <span>Add Cost</span>
        </Link>

        {/* Logout */}
        <button
          onClick={() => signOut()}
          className="inline-flex items-center justify-center gap-1.5 h-8 w-8 md:w-auto md:px-3 rounded-lg text-sm font-medium transition-all duration-150"
          style={{
            backgroundColor: 'transparent',
            color: '#5C6078',
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.color = '#FB7185';
            (e.currentTarget as HTMLElement).style.backgroundColor = 'rgba(251,113,133,0.12)';
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.color = '#5C6078';
            (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent';
          }}
          title="Sign out"
        >
          <LogOut size={16} />
        </button>
      </div>
    </header>
  );
};
