import React from 'react';
import type { Product } from '@/types';

interface StatusBadgeProps {
  status: Product['status'] | 'cost';
}

const statusConfig: Record<string, { label: string; className: string }> = {
  in_stock: {
    label: 'In Stock',
    className: 'text-[#34D399] bg-[rgba(52,211,153,0.12)]',
  },
  listed: {
    label: 'Listed',
    className: 'text-[#38BDF8] bg-[rgba(56,189,248,0.12)]',
  },
  sold_out: {
    label: 'Sold Out',
    className: 'text-[#FB7185] bg-[rgba(251,113,133,0.12)]',
  },
  cost: {
    label: 'Cost',
    className: 'text-[#FB7185] bg-[rgba(251,113,133,0.12)]',
  },
};

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
  const config = statusConfig[status] || statusConfig.in_stock;

  return (
    <span
      className={`inline-flex items-center px-[10px] py-1 rounded-[6px] text-xs font-medium ${config.className}`}
    >
      {config.label}
    </span>
  );
};
