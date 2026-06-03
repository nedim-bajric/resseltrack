import React from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { formatCurrency } from '@/lib/currency';

interface StatCardProps {
  label: string;
  value: string | number;
  change?: string;
  isPositive?: boolean;
  icon: LucideIcon;
  iconColor: string;
  iconBg: string;
  accentColor: string;
  delay?: number;
  isCurrencyValue?: boolean;
}

export const StatCard: React.FC<StatCardProps> = ({
  label,
  value,
  change,
  isPositive = true,
  icon: Icon,
  iconColor,
  iconBg,
  accentColor,
  delay = 0,
  isCurrencyValue = false,
}) => {
  const displayValue = isCurrencyValue && typeof value === 'number' ? formatCurrency(value) : value;
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.25,
        delay,
        ease: [0.0, 0.0, 0.2, 1] as [number, number, number, number],
      }}
      className="relative bg-[#11131A] border border-[#1E2130] rounded-xl p-5 hover:border-[#2E3250] hover:-translate-y-[1px] transition-all duration-200 cursor-default"
    >
      {/* Accent dot */}
      <div
        className="absolute top-4 right-4 w-2 h-2 rounded-full"
        style={{ backgroundColor: accentColor }}
      />

      {/* Icon */}
      <div
        className="w-9 h-9 rounded-full flex items-center justify-center mb-3"
        style={{ backgroundColor: iconBg }}
      >
        <Icon size={20} style={{ color: iconColor }} />
      </div>

      {/* Label */}
      <p className="text-xs font-medium tracking-wide uppercase" style={{ color: '#5C6078' }}>
        {label}
      </p>

      {/* Value */}
      <p className="font-mono text-2xl font-semibold mt-1" style={{ color: '#E8EAF0' }}>
        {displayValue}
      </p>

      {/* Change indicator */}
      {change && (
        <div className="flex items-center gap-1 mt-2">
          {isPositive ? (
            <TrendingUp size={14} className="text-[#34D399]" />
          ) : (
            <TrendingDown size={14} className="text-[#FB7185]" />
          )}
          <span
            className="text-xs font-medium"
            style={{ color: isPositive ? '#34D399' : '#FB7185' }}
          >
            {change}
          </span>
        </div>
      )}
    </motion.div>
  );
};
