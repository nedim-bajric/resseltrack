import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ShoppingCart,
  Plus,
  Trash2,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  ArrowUpDown,
  Receipt,
  Package,
  TrendingUp,
  Calendar,
  CheckCircle2,
  Truck,
} from 'lucide-react';
import { Toaster, toast } from 'sonner';
import { formatCurrency } from '@/lib/currency';
import { useOrders } from '@/hooks/useOrders';

type SortField = 'date' | 'totalAmount' | 'quantity';
type SortDir = 'asc' | 'desc';
type TimeRange = '7d' | '30d' | '90d' | 'all';
type StatusFilter = 'all' | 'shipped' | 'done';

interface SortState {
  field: SortField;
  dir: SortDir;
}

const TIME_RANGES: { label: string; value: TimeRange }[] = [
  { label: '7d', value: '7d' },
  { label: '30d', value: '30d' },
  { label: '90d', value: '90d' },
  { label: 'All', value: 'all' },
];

const STATUS_FILTERS: { label: string; value: StatusFilter }[] = [
  { label: 'All', value: 'all' },
  { label: 'Shipped', value: 'shipped' },
  { label: 'Done', value: 'done' },
];

/* ─── Date filter helper ─── */
function isWithinTimeRange(orderDate: string, range: TimeRange): boolean {
  if (range === 'all') return true;
  const now = new Date();
  const date = new Date(orderDate);
  const days = range === '7d' ? 7 : range === '30d' ? 30 : 90;
  const cutoff = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
  return date >= cutoff;
}

/* ─── Stat Card Mini ─── */
const StatCardMini: React.FC<{
  label: string;
  value: string;
  icon: React.ElementType;
  iconColor: string;
  iconBg: string;
  delay: number;
}> = ({ label, value, icon: Icon, iconColor, iconBg, delay }) => (
  <motion.div
    initial={{ opacity: 0, y: 12 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.3, delay }}
    className="flex items-center gap-3 rounded-xl border p-4"
    style={{ backgroundColor: '#11131A', borderColor: '#1E2130' }}
  >
    <div
      className="flex items-center justify-center rounded-lg"
      style={{ width: '40px', height: '40px', backgroundColor: iconBg }}
    >
      <Icon size={20} style={{ color: iconColor }} />
    </div>
    <div>
      <p className="text-xs font-medium" style={{ color: '#8B8FA3' }}>
        {label}
      </p>
      <p
        className="text-lg font-semibold font-mono"
        style={{ color: '#E8EAF0', letterSpacing: '-0.01em' }}
      >
        {value}
      </p>
    </div>
  </motion.div>
);

/* ─── Main Page ─── */
const Orders: React.FC = () => {
  const { orders, deleteOrder, updateOrderStatus } = useOrders();
  const [timeRange, setTimeRange] = useState<TimeRange>('30d');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [sort, setSort] = useState<SortState>({ field: 'date', dir: 'desc' });
  const [deleteOrderId, setDeleteOrderId] = useState<string | null>(null);

  /* Filtered orders */
  const filteredOrders = useMemo(() => {
    return orders
      .filter((o) => isWithinTimeRange(o.date, timeRange))
      .filter((o) => statusFilter === 'all' || o.status === statusFilter);
  }, [orders, timeRange, statusFilter]);

  /* Sorted orders */
  const sortedOrders = useMemo(() => {
    const list = [...filteredOrders].sort((a, b) => {
      const { field, dir } = sort;
      let comparison = 0;
      if (field === 'date') {
        comparison = new Date(a.date).getTime() - new Date(b.date).getTime();
      } else {
        comparison = (a[field] as number) - (b[field] as number);
      }
      return dir === 'asc' ? comparison : -comparison;
    });
    return list;
  }, [filteredOrders, sort]);

  /* Stats */
  const stats = useMemo(() => {
    const totalOrders = filteredOrders.length;
    const totalRevenue = filteredOrders.reduce((sum, o) => sum + o.totalAmount, 0);
    const totalItems = filteredOrders.reduce((sum, o) => sum + o.quantity, 0);
    const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;
    const shippedCount = filteredOrders.filter((o) => o.status === 'shipped').length;
    const doneCount = filteredOrders.filter((o) => o.status === 'done').length;
    return { totalOrders, totalRevenue, totalItems, avgOrderValue, shippedCount, doneCount };
  }, [filteredOrders]);

  /* Sorting */
  const handleSort = (field: SortField) => {
    setSort((prev) => {
      if (prev.field === field) {
        return { field, dir: prev.dir === 'asc' ? 'desc' : 'asc' };
      }
      return { field, dir: 'desc' };
    });
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sort.field !== field) return <ArrowUpDown size={14} className="text-[#5C6078]" />;
    return sort.dir === 'asc' ? (
      <ChevronUp size={14} className="text-[#6366F1]" />
    ) : (
      <ChevronDown size={14} className="text-[#6366F1]" />
    );
  };

  /* Delete */
  const confirmDelete = async () => {
    if (deleteOrderId) {
      await deleteOrder(deleteOrderId);
      toast.success('Order deleted successfully');
      setDeleteOrderId(null);
    }
  };

  /* Totals row */
  const totalQuantity = sortedOrders.reduce((sum, o) => sum + o.quantity, 0);
  const totalAmount = sortedOrders.reduce((sum, o) => sum + o.totalAmount, 0);

  return (
    <div className="space-y-6">
      <Toaster theme="dark" position="top-right" />

      {/* ====== PAGE HEADER ====== */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
        className="flex flex-col md:flex-row md:items-center md:justify-between gap-3"
        style={{ minHeight: '48px', marginBottom: '24px' }}
      >
        {/* Left: Title + count */}
        <div>
          <h1
            className="font-bold text-2xl md:text-[32px]"
            style={{ lineHeight: 1.1, letterSpacing: '-0.02em', color: '#E8EAF0' }}
          >
            Orders
          </h1>
          <p className="mt-1 text-sm" style={{ color: '#8B8FA3' }}>
            {filteredOrders.length} {filteredOrders.length === 1 ? 'order' : 'orders'}
            {timeRange !== 'all' && (
              <span> in the last {timeRange === '7d' ? '7 days' : timeRange === '30d' ? '30 days' : '90 days'}</span>
            )}
          </p>
        </div>

        {/* Right: Time Range + New Order */}
        <motion.div
          initial={{ opacity: 0, x: 12 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.25, delay: 0.1 }}
          className="flex flex-wrap items-center gap-2 md:gap-3"
        >
          {/* Status filter toggle */}
          <div
            className="flex items-center rounded-md p-0.5"
            style={{ backgroundColor: '#0D0F14' }}
          >
            {STATUS_FILTERS.map((s) => (
              <button
                key={s.value}
                onClick={() => setStatusFilter(s.value)}
                className="px-3 py-1 rounded-md text-xs font-medium transition-all duration-150"
                style={{
                  backgroundColor: statusFilter === s.value ? '#222633' : 'transparent',
                  color: statusFilter === s.value ? '#E8EAF0' : '#5C6078',
                }}
              >
                {s.label}
              </button>
            ))}
          </div>

          {/* Time range toggle */}
          <div
            className="flex items-center rounded-md p-0.5"
            style={{ backgroundColor: '#0D0F14' }}
          >
            {TIME_RANGES.map((range) => (
              <button
                key={range.value}
                onClick={() => setTimeRange(range.value)}
                className="px-3 py-1 rounded-md text-xs font-medium transition-all duration-150"
                style={{
                  backgroundColor: timeRange === range.value ? '#222633' : 'transparent',
                  color: timeRange === range.value ? '#E8EAF0' : '#5C6078',
                }}
              >
                {range.label}
              </button>
            ))}
          </div>

          {/* New Order button */}
          <Link
            to="/orders/create"
            className="inline-flex items-center gap-2 h-9 px-5 rounded-lg text-sm font-medium transition-all duration-150"
            style={{ backgroundColor: '#6366F1', color: '#0B0D12' }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.backgroundColor = '#818CF8';
              (e.currentTarget as HTMLElement).style.transform = 'translateY(-1px)';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.backgroundColor = '#6366F1';
              (e.currentTarget as HTMLElement).style.transform = 'translateY(0)';
            }}
          >
            <Plus size={16} />
            <span>New Order</span>
          </Link>
        </motion.div>
      </motion.div>

      {/* ====== STATS CARDS ====== */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        <StatCardMini
          label="Total Orders"
          value={stats.totalOrders.toLocaleString('bs-BA')}
          icon={Receipt}
          iconColor="#6366F1"
          iconBg="rgba(99,102,241,0.12)"
          delay={0}
        />
        <StatCardMini
          label="Total Revenue"
          value={formatCurrency(stats.totalRevenue)}
          icon={TrendingUp}
          iconColor="#34D399"
          iconBg="rgba(52,211,153,0.12)"
          delay={0.06}
        />
        <StatCardMini
          label="Items Sold"
          value={stats.totalItems.toLocaleString('bs-BA')}
          icon={Package}
          iconColor="#38BDF8"
          iconBg="rgba(56,189,248,0.12)"
          delay={0.12}
        />
        <StatCardMini
          label="Avg Order Value"
          value={formatCurrency(stats.avgOrderValue)}
          icon={ShoppingCart}
          iconColor="#FBBF24"
          iconBg="rgba(251,191,36,0.12)"
          delay={0.18}
        />
      </div>

      {/* ====== ORDERS TABLE ====== */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.2, delay: 0.15 }}
        className="rounded-xl overflow-hidden"
        style={{ backgroundColor: '#11131A', border: '1px solid #1E2130' }}
      >
        <div className="overflow-x-auto">
          <div className="min-w-[700px]">
            {/* Table Header */}
        <div
          className="flex items-center"
          style={{
            backgroundColor: '#090A10',
            height: '40px',
            borderBottom: '1px solid #1E2130',
          }}
        >
          {[
            { key: 'date' as SortField, header: 'Date', width: '100px' },
            { key: null as SortField | null, header: 'Product', width: undefined, flex: 1 },
            { key: null as SortField | null, header: 'Option', width: '100px' },
            { key: 'quantity' as SortField, header: 'Qty', width: '60px' },
            { key: null as SortField | null, header: 'Sell Price', width: '100px' },
            { key: 'totalAmount' as SortField, header: 'Total', width: '100px' },
            { key: null as SortField | null, header: 'Platform', width: '100px' },
            { key: null as SortField | null, header: 'Status', width: '90px' },
            { key: null as SortField | null, header: 'Customer', width: '110px' },
            { key: null as SortField | null, header: 'Notes', width: '120px' },
            { key: null as SortField | null, header: '', width: '80px' },
          ].map((col) => (
            <div
              key={col.header || 'actions'}
              className={`flex items-center gap-1 px-3 text-xs font-medium uppercase tracking-wider ${col.key ? 'cursor-pointer select-none' : ''}`}
              style={{
                width: col.width,
                flex: col.flex,
                color: '#5C6078',
              }}
              onClick={col.key ? () => handleSort(col.key!) : undefined}
            >
              {col.header}
              {col.key && <SortIcon field={col.key} />}
            </div>
          ))}
        </div>

        {/* Table Rows */}
        {sortedOrders.length > 0 ? (
          <>
            {sortedOrders.map((order, index) => (
              <motion.div
                key={order.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  duration: 0.15,
                  delay: index * 0.03,
                  ease: [0.0, 0.0, 0.2, 1] as [number, number, number, number],
                }}
                className="flex items-center transition-colors duration-100"
                style={{
                  height: '52px',
                  borderBottom: index < sortedOrders.length - 1 ? '1px solid #1E2130' : undefined,
                }}
                onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#1A1D26'; }}
                onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
              >
                {/* Date */}
                <div className="px-3 text-xs font-mono" style={{ width: '100px', color: '#8B8FA3' }}>
                  <div className="flex items-center gap-1.5">
                    <Calendar size={12} className="text-[#5C6078]" />
                    {new Date(order.date).toLocaleDateString('bs-BA', {
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric',
                    })}
                  </div>
                </div>

                {/* Product Name */}
                <div className="flex items-center gap-2.5 px-3" style={{ flex: 1, minWidth: '160px' }}>
                  <div
                    className="flex items-center justify-center flex-shrink-0 rounded-md"
                    style={{ width: '32px', height: '32px', backgroundColor: '#1A1D26' }}
                  >
                    <Package size={14} className="text-[#6366F1]" />
                  </div>
                  <span className="text-sm font-medium truncate" style={{ color: '#E8EAF0' }}>
                    {order.productName}
                  </span>
                </div>

                {/* Option */}
                <div className="px-3 text-xs" style={{ width: '100px', color: '#8B8FA3' }}>
                  {order.optionName || '—'}
                </div>

                {/* Quantity */}
                <div className="px-3 text-right text-sm font-mono" style={{ width: '60px', color: '#E8EAF0' }}>
                  {order.quantity}
                </div>

                {/* Sell Price */}
                <div className="px-3 text-right text-sm font-mono" style={{ width: '100px', color: '#8B8FA3' }}>
                  {formatCurrency(order.sellPrice)}
                </div>

                {/* Total */}
                <div
                  className="px-3 text-right text-sm font-semibold font-mono"
                  style={{ width: '100px', color: '#34D399' }}
                >
                  {formatCurrency(order.totalAmount)}
                </div>

                {/* Platform */}
                <div className="px-3" style={{ width: '100px' }}>
                  <PlatformBadge platform={order.platform} />
                </div>

                {/* Status */}
                <div className="px-3" style={{ width: '90px' }}>
                  <StatusBadge status={order.status} />
                </div>

                {/* Customer */}
                <div className="px-3 text-sm truncate" style={{ width: '110px', color: '#8B8FA3' }}>
                  {order.customerName || '—'}
                </div>

                {/* Notes */}
                <div className="px-3 text-xs truncate" style={{ width: '120px', color: '#5C6078' }}>
                  {order.notes || '—'}
                </div>

                {/* Actions */}
                <div className="flex items-center justify-center gap-1" style={{ width: '80px' }}>
                  {order.status === 'shipped' && (
                    <button
                      onClick={() => {
                        updateOrderStatus(order.id, 'done');
                        toast.success('Marked as done');
                      }}
                      className="flex items-center justify-center rounded-md transition-colors duration-150"
                      style={{ width: '28px', height: '28px', color: '#5C6078' }}
                      onMouseEnter={(e) => {
                        (e.currentTarget as HTMLElement).style.backgroundColor = 'rgba(52,211,153,0.12)';
                        (e.currentTarget as HTMLElement).style.color = '#34D399';
                      }}
                      onMouseLeave={(e) => {
                        (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent';
                        (e.currentTarget as HTMLElement).style.color = '#5C6078';
                      }}
                      title="Mark as done"
                    >
                      <CheckCircle2 size={14} />
                    </button>
                  )}
                  <button
                    onClick={() => setDeleteOrderId(order.id)}
                    className="flex items-center justify-center rounded-md transition-colors duration-150"
                    style={{ width: '28px', height: '28px', color: '#5C6078' }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLElement).style.backgroundColor = 'rgba(251,113,133,0.12)';
                      (e.currentTarget as HTMLElement).style.color = '#FB7185';
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent';
                      (e.currentTarget as HTMLElement).style.color = '#5C6078';
                    }}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </motion.div>
            ))}

            {/* Totals Row */}
            <div
              className="flex items-center font-semibold"
              style={{
                height: '44px',
                backgroundColor: '#090A10',
                borderTop: '2px solid #1E2130',
              }}
            >
              <div className="px-3 text-xs uppercase tracking-wider" style={{ width: '100px', color: '#5C6078' }}>
                Total
              </div>
              <div style={{ flex: 1 }} />
              <div style={{ width: '100px' }} />
              <div className="px-3 text-right text-sm font-mono" style={{ width: '60px', color: '#E8EAF0' }}>
                {totalQuantity}
              </div>
              <div style={{ width: '100px' }} />
              <div
                className="px-3 text-right text-sm font-semibold font-mono"
                style={{ width: '100px', color: '#34D399' }}
              >
                {formatCurrency(totalAmount)}
              </div>
              <div style={{ width: '100px' }} />
              <div style={{ width: '90px' }} />
              <div style={{ width: '110px' }} />
              <div style={{ width: '120px' }} />
              <div style={{ width: '80px' }} />
            </div>
          </>
        ) : (
          /* Empty State */
          <div className="flex flex-col items-center justify-center py-16">
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.3 }}
              className="flex items-center justify-center mb-4"
              style={{
                width: '80px',
                height: '80px',
                borderRadius: '50%',
                backgroundColor: '#1A1D26',
              }}
            >
              <Receipt size={40} className="text-[#5C6078]" />
            </motion.div>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.2, delay: 0.2 }}
              className="text-base font-medium mb-1"
              style={{ color: '#E8EAF0' }}
            >
              {timeRange !== 'all' ? 'No orders in this period' : 'No orders yet'}
            </motion.p>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.2, delay: 0.3 }}
              className="text-sm text-center mb-5 max-w-[360px]"
              style={{ color: '#8B8FA3' }}
            >
              {timeRange !== 'all'
                ? 'Try changing the time range or create a new order.'
                : 'Start selling! Create your first order to see it here.'}
            </motion.p>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.2, delay: 0.4 }}
            >
              <Link
                to="/orders/create"
                className="inline-flex items-center gap-2 h-9 px-5 rounded-lg text-sm font-medium transition-all duration-150"
                style={{ backgroundColor: '#6366F1', color: '#0B0D12' }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.backgroundColor = '#818CF8';
                  (e.currentTarget as HTMLElement).style.transform = 'translateY(-1px)';
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.backgroundColor = '#6366F1';
                  (e.currentTarget as HTMLElement).style.transform = 'translateY(0)';
                }}
              >
                <Plus size={16} />
                <span>Create your first order</span>
              </Link>
            </motion.div>
          </div>
        )}
          </div>
        </div>
      </motion.div>

      {/* ====== DELETE CONFIRMATION DIALOG ====== */}
      <AnimatePresence>
        {deleteOrderId && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="absolute inset-0"
              style={{ backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
              onClick={() => setDeleteOrderId(null)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.15 }}
              className="relative z-10 rounded-xl p-6 max-w-[400px] w-full mx-4"
              style={{ backgroundColor: '#11131A', border: '1px solid #1E2130' }}
            >
              <div className="flex flex-col items-center text-center">
                <div
                  className="flex items-center justify-center mb-4"
                  style={{
                    width: '48px',
                    height: '48px',
                    borderRadius: '50%',
                    backgroundColor: 'rgba(251,191,36,0.12)',
                  }}
                >
                  <AlertTriangle size={24} className="text-[#FBBF24]" />
                </div>
                <h3 className="text-base font-semibold mb-1" style={{ color: '#E8EAF0' }}>
                  Delete Order?
                </h3>
                <p className="text-sm mb-6" style={{ color: '#8B8FA3' }}>
                  Are you sure you want to delete this order? This action cannot be undone.
                </p>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setDeleteOrderId(null)}
                    className="h-10 px-5 rounded-lg text-sm font-medium transition-all duration-150"
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
                    Cancel
                  </button>
                  <button
                    onClick={confirmDelete}
                    className="inline-flex items-center gap-2 h-10 px-5 rounded-lg text-sm font-medium transition-all duration-150"
                    style={{
                      backgroundColor: 'rgba(251,113,133,0.12)',
                      color: '#FB7185',
                      border: '1px solid rgba(251,113,133,0.25)',
                    }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLElement).style.backgroundColor = 'rgba(251,113,133,0.2)';
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLElement).style.backgroundColor = 'rgba(251,113,133,0.12)';
                    }}
                  >
                    <Trash2 size={16} />
                    <span>Delete</span>
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

/* ─── Status Badge ─── */
const STATUS_COLORS: Record<string, { bg: string; text: string; icon: React.ElementType }> = {
  shipped: { bg: 'rgba(56,189,248,0.12)', text: '#38BDF8', icon: Truck },
  done: { bg: 'rgba(52,211,153,0.12)', text: '#34D399', icon: CheckCircle2 },
};

const StatusBadge: React.FC<{ status: 'shipped' | 'done' }> = ({ status }) => {
  const config = STATUS_COLORS[status];
  const Icon = config.icon;
  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-[5px] text-[11px] font-medium"
      style={{ backgroundColor: config.bg, color: config.text }}
    >
      <Icon size={10} />
      {status === 'shipped' ? 'Shipped' : 'Done'}
    </span>
  );
};

/* ─── Platform Badge ─── */
const PLATFORM_COLORS: Record<string, { bg: string; text: string }> = {
  Instagram: { bg: 'rgba(225,48,108,0.12)', text: '#E1306C' },
  Facebook: { bg: 'rgba(24,119,242,0.12)', text: '#1877F2' },
  TikTok: { bg: 'rgba(254,44,85,0.12)', text: '#FE2C55' },
  Other: { bg: 'rgba(99,102,241,0.12)', text: '#6366F1' },
};

const PlatformBadge: React.FC<{ platform: string }> = ({ platform }) => {
  const colors = PLATFORM_COLORS[platform] || PLATFORM_COLORS.Other;
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded-[5px] text-[11px] font-medium"
      style={{ backgroundColor: colors.bg, color: colors.text }}
    >
      {platform}
    </span>
  );
};

export default Orders;
