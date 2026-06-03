import React, { useState, useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { toast, Toaster } from 'sonner';
import {
  Cpu,
  Truck,
  Package,
  Megaphone,
  MoreHorizontal,
  Plus,
  ChevronUp,
  ChevronDown,
  Trash2,
  Pencil,
  X,
  Check,
  Filter,
  ReceiptText,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { format, parseISO, startOfMonth, subMonths } from 'date-fns';
import { useCosts } from '@/hooks/useCosts';
import { useDashboard } from '@/hooks/useDashboard';
import { formatCurrency } from '@/lib/currency';
import type { Cost, TimeRange } from '@/types';

/* ------------------------------------------------------------------ */
/*  Constants                                                         */
/* ------------------------------------------------------------------ */

const TIME_RANGES: { label: string; value: TimeRange }[] = [
  { label: '7d', value: '7d' },
  { label: '30d', value: '30d' },
  { label: '90d', value: '90d' },
  { label: 'All', value: 'all' },
];

const CATEGORY_META: Record<
  string,
  { label: string; icon: React.ElementType; color: string; bg: string }
> = {
  ai_tools:   { label: 'AI Tools',   icon: Cpu,            color: '#6366F1', bg: 'rgba(99,102,241,0.12)' },
  shipping:   { label: 'Shipping',   icon: Truck,          color: '#38BDF8', bg: 'rgba(56,189,248,0.12)' },
  packaging:  { label: 'Packaging',  icon: Package,        color: '#FBBF24', bg: 'rgba(251,191,36,0.12)' },
  ads:        { label: 'Ads',        icon: Megaphone,      color: '#FB7185', bg: 'rgba(251,113,133,0.12)' },
  other:      { label: 'Other',      icon: MoreHorizontal, color: '#5C6078', bg: 'rgba(92,96,120,0.12)' },
};

const CATEGORY_KEYS = Object.keys(CATEGORY_META) as Cost['category'][];

/* ------------------------------------------------------------------ */
/*  Sort helpers                                                      */
/* ------------------------------------------------------------------ */

type SortField = 'date' | 'amount' | 'name';
type SortDir = 'asc' | 'desc';

/* ------------------------------------------------------------------ */
/*  Monthly chart data helper                                         */
/* ------------------------------------------------------------------ */

function getMonthlyChartData(costs: Cost[]) {
  const months: { label: string; total: number }[] = [];
  for (let i = 5; i >= 0; i--) {
    const m = startOfMonth(subMonths(new Date(), i));
    months.push({ label: format(m, 'MMM yyyy'), total: 0 });
  }

  costs.forEach((c) => {
    const d = parseISO(c.date);
    const monthLabel = format(startOfMonth(d), 'MMM yyyy');
    const found = months.find((m) => m.label === monthLabel);
    if (found) found.total += c.amount;
  });

  return months;
}

/* ================================================================== */
/*  MAIN PAGE                                                         */
/* ================================================================== */

const Costs: React.FC = () => {
  const { costs, updateCost, deleteCost, getCostsByTimeRange } = useCosts();
  useDashboard(); // ensure dashboard data is loaded for calculations

  /* ---- state ---- */
  const [timeRange, setTimeRange] = useState<TimeRange>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [sortField, setSortField] = useState<SortField>('date');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<Cost>>({});
  const [deleteId, setDeleteId] = useState<string | null>(null);

  /* ---- filtered costs ---- */
  const timeFiltered = useMemo(
    () => getCostsByTimeRange(timeRange),
    [getCostsByTimeRange, timeRange]
  );

  const filtered = useMemo(() => {
    let list = [...timeFiltered];
    if (categoryFilter !== 'all') {
      list = list.filter((c) => c.category === categoryFilter);
    }
    return list;
  }, [timeFiltered, categoryFilter]);

  /* ---- sorting ---- */
  const sorted = useMemo(() => {
    const list = [...filtered];
    list.sort((a, b) => {
      let cmp = 0;
      if (sortField === 'date') {
        cmp = new Date(a.date).getTime() - new Date(b.date).getTime();
      } else if (sortField === 'amount') {
        cmp = a.amount - b.amount;
      } else if (sortField === 'name') {
        cmp = a.name.localeCompare(b.name);
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return list;
  }, [filtered, sortField, sortDir]);

  /* ---- totals ---- */
  const totalAmount = useMemo(
    () => filtered.reduce((sum, c) => sum + c.amount, 0),
    [filtered]
  );

  /* ---- category summary ---- */
  const categorySummary = useMemo(() => {
    const summary: Record<string, { total: number; count: number }> = {};
    CATEGORY_KEYS.forEach((k) => (summary[k] = { total: 0, count: 0 }));
    timeFiltered.forEach((c) => {
      if (summary[c.category]) {
        summary[c.category].total += c.amount;
        summary[c.category].count += 1;
      }
    });
    return summary;
  }, [timeFiltered]);

  /* ---- monthly chart data ---- */
  const monthlyData = useMemo(() => getMonthlyChartData(timeFiltered), [timeFiltered]);

  /* ---- handlers ---- */
  const toggleSort = useCallback(
    (field: SortField) => {
      if (sortField === field) {
        setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
      } else {
        setSortField(field);
        setSortDir('desc');
      }
    },
    [sortField]
  );

  const startEdit = useCallback((cost: Cost) => {
    setEditingId(cost.id);
    setEditForm({
      name: cost.name,
      category: cost.category,
      amount: cost.amount,
      date: cost.date.split('T')[0],
      description: cost.description,
    });
  }, []);

  const cancelEdit = useCallback(() => {
    setEditingId(null);
    setEditForm({});
  }, []);

  const saveEdit = useCallback(
    async (id: string) => {
      if (!editForm.name || !editForm.amount || !editForm.date) {
        toast.error('Please fill in all required fields');
        return;
      }
      await updateCost(id, {
        ...editForm,
        amount: Number(editForm.amount),
      });
      toast.success('Cost updated');
      setEditingId(null);
      setEditForm({});
    },
    [editForm, updateCost]
  );

  const confirmDelete = useCallback(
    async (id: string) => {
      await deleteCost(id);
      toast.success('Cost deleted');
      setDeleteId(null);
    },
    [deleteCost]
  );

  /* ---- empty state ---- */
  if (costs.length === 0) {
    return (
      <div className="flex items-center justify-center" style={{ minHeight: '60vh' }}>
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="text-center"
        >
          <div
            className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-5"
            style={{ backgroundColor: '#1A1D26' }}
          >
            <ReceiptText size={48} style={{ color: '#5C6078' }} />
          </div>
          <h2 className="text-xl font-semibold" style={{ color: '#E8EAF0' }}>
            No costs recorded
          </h2>
          <p className="text-sm mt-2" style={{ color: '#8B8FA3' }}>
            Start tracking your operational expenses to get a complete picture of your business.
          </p>
          <Link
            to="/costs/add"
            className="inline-flex items-center gap-2 mt-6 px-5 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 hover:-translate-y-[1px]"
            style={{ backgroundColor: '#6366F1', color: '#0B0D12' }}
          >
            <Plus size={16} />
            Add your first cost
          </Link>
        </motion.div>
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              background: '#11131A',
              border: '1px solid #1E2130',
              color: '#E8EAF0',
            },
          }}
        />
      </div>
    );
  }

  /* ================================================================= */
  /*  RENDER                                                           */
  /* ================================================================= */

  return (
    <div className="space-y-6">
      {/* ---- Page Header ---- */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.2 }}
        className="flex flex-col md:flex-row md:items-center md:justify-between gap-4"
      >
        <div>
          <h1 className="text-2xl md:text-[32px] font-bold tracking-[-0.02em]" style={{ color: '#E8EAF0' }}>
            Operational Costs
          </h1>
          <p className="text-sm mt-1" style={{ color: '#8B8FA3' }}>
            {format(new Date(), 'MMMM yyyy')} — {formatCurrency(totalAmount)} total
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Time Range Segmented Control */}
          <div
            className="flex items-center rounded-md p-0.5"
            style={{ backgroundColor: '#0D0F14' }}
          >
            {TIME_RANGES.map((r) => (
              <button
                key={r.value}
                onClick={() => setTimeRange(r.value)}
                className="px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-150"
                style={{
                  backgroundColor: timeRange === r.value ? '#222633' : 'transparent',
                  color: timeRange === r.value ? '#E8EAF0' : '#5C6078',
                }}
              >
                {r.label}
              </button>
            ))}
          </div>

          {/* Add Cost button */}
          <Link
            to="/costs/add"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-150 hover:-translate-y-[1px]"
            style={{ backgroundColor: '#6366F1', color: '#0B0D12' }}
          >
            <Plus size={16} />
            Add Cost
          </Link>
        </div>
      </motion.div>

      {/* ---- Category Summary Cards ---- */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        {CATEGORY_KEYS.map((key, i) => {
          const meta = CATEGORY_META[key];
          const Icon = meta.icon;
          const { total, count } = categorySummary[key];
          return (
            <motion.div
              key={key}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                duration: 0.2,
                delay: i * 0.05,
                ease: [0.0, 0.0, 0.2, 1] as [number, number, number, number],
              }}
              className="flex items-center gap-3 rounded-[10px] p-3 border transition-all duration-200 hover:border-[#2E3250] hover:-translate-y-[1px]"
              style={{ backgroundColor: '#11131A', borderColor: '#1E2130', height: '72px' }}
            >
              <div
                className="w-9 h-9 rounded-full flex items-center justify-center shrink-0"
                style={{ backgroundColor: meta.bg }}
              >
                <Icon size={18} style={{ color: meta.color }} />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-medium" style={{ color: '#5C6078' }}>
                  {meta.label}
                </p>
                <p
                  className="font-mono text-base font-semibold truncate"
                  style={{ color: '#E8EAF0' }}
                >
                  {formatCurrency(total)}
                </p>
                <p className="text-[10px]" style={{ color: '#5C6078' }}>
                  {count} item{count !== 1 ? 's' : ''}
                </p>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* ---- Category Filter Bar ---- */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2, delay: 0.25 }}
        className="flex items-center gap-3"
      >
        <div className="flex items-center gap-2">
          <Filter size={14} style={{ color: '#5C6078' }} />
          <span className="text-xs font-medium" style={{ color: '#5C6078' }}>
            Filter:
          </span>
        </div>
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="h-8 rounded-md border px-3 py-1 text-xs transition-all duration-150 outline-none"
          style={{
            backgroundColor: '#0D0F14',
            borderColor: '#1E2130',
            color: '#E8EAF0',
          }}
        >
          <option value="all">All Categories</option>
          {CATEGORY_KEYS.map((k) => (
            <option key={k} value={k}>
              {CATEGORY_META[k].label}
            </option>
          ))}
        </select>
        {categoryFilter !== 'all' && (
          <button
            onClick={() => setCategoryFilter('all')}
            className="text-xs transition-colors duration-150 hover:underline"
            style={{ color: '#6366F1' }}
          >
            Clear
          </button>
        )}
      </motion.div>

      {/* ---- Costs Data Table ---- */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.15 }}
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
          {/* Date */}
          <button
            onClick={() => toggleSort('date')}
            className="flex items-center gap-1 px-4 text-xs font-medium uppercase tracking-wider transition-colors duration-100 hover:text-[#E8EAF0]"
            style={{ width: '120px', color: '#5C6078' }}
          >
            Date
            {sortField === 'date' ? (
              sortDir === 'asc' ? (
                <ChevronUp size={14} />
              ) : (
                <ChevronDown size={14} />
              )
            ) : (
              <ChevronUp size={14} className="opacity-30" />
            )}
          </button>
          {/* Name */}
          <button
            onClick={() => toggleSort('name')}
            className="flex items-center gap-1 px-4 text-xs font-medium uppercase tracking-wider transition-colors duration-100 hover:text-[#E8EAF0]"
            style={{ flex: 1, color: '#5C6078', minWidth: '180px' }}
          >
            Name
            {sortField === 'name' ? (
              sortDir === 'asc' ? (
                <ChevronUp size={14} />
              ) : (
                <ChevronDown size={14} />
              )
            ) : (
              <ChevronUp size={14} className="opacity-30" />
            )}
          </button>
          {/* Category */}
          <div
            className="px-4 text-xs font-medium uppercase tracking-wider"
            style={{ width: '140px', color: '#5C6078' }}
          >
            Category
          </div>
          {/* Amount */}
          <button
            onClick={() => toggleSort('amount')}
            className="flex items-center gap-1 px-4 text-xs font-medium uppercase tracking-wider transition-colors duration-100 hover:text-[#E8EAF0]"
            style={{ width: '100px', color: '#5C6078' }}
          >
            Amount
            {sortField === 'amount' ? (
              sortDir === 'asc' ? (
                <ChevronUp size={14} />
              ) : (
                <ChevronDown size={14} />
              )
            ) : (
              <ChevronUp size={14} className="opacity-30" />
            )}
          </button>
          {/* Description */}
          <div
            className="hidden lg:block px-4 text-xs font-medium uppercase tracking-wider"
            style={{ flex: 1, color: '#5C6078' }}
          >
            Description
          </div>
          {/* Recurring */}
          <div
            className="hidden md:block px-4 text-xs font-medium uppercase tracking-wider text-center"
            style={{ width: '80px', color: '#5C6078' }}
          >
            Type
          </div>
          {/* Actions */}
          <div
            className="px-4 text-xs font-medium uppercase tracking-wider text-center"
            style={{ width: '80px', color: '#5C6078' }}
          >
            Actions
          </div>
        </div>

        {/* Table Rows */}
        <AnimatePresence>
          {sorted.map((cost, index) => {
            const meta = CATEGORY_META[cost.category];
            const CatIcon = meta.icon;
            const isEditing = editingId === cost.id;

            return (
              <motion.div
                key={cost.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  duration: 0.13,
                  delay: index * 0.025,
                  ease: [0.0, 0.0, 0.2, 1] as [number, number, number, number],
                }}
                className="flex items-center transition-colors duration-100 hover:bg-[#1A1D26]"
                style={{
                  minHeight: '52px',
                  borderBottom:
                    index < sorted.length - 1 ? '1px solid #1E2130' : undefined,
                }}
              >
                {isEditing ? (
                  /* ---- Inline Edit Row ---- */
                  <>
                    <div className="px-4" style={{ width: '120px' }}>
                      <input
                        type="date"
                        value={String(editForm.date ?? '')}
                        onChange={(e) =>
                          setEditForm((f) => ({ ...f, date: e.target.value }))
                        }
                        className="w-full h-8 rounded-md border px-2 text-xs outline-none"
                        style={{
                          backgroundColor: '#0D0F14',
                          borderColor: '#1E2130',
                          color: '#E8EAF0',
                        }}
                      />
                    </div>
                    <div className="px-4" style={{ flex: 1, minWidth: '180px' }}>
                      <input
                        type="text"
                        value={String(editForm.name ?? '')}
                        onChange={(e) =>
                          setEditForm((f) => ({ ...f, name: e.target.value }))
                        }
                        className="w-full h-8 rounded-md border px-2 text-xs outline-none"
                        style={{
                          backgroundColor: '#0D0F14',
                          borderColor: '#1E2130',
                          color: '#E8EAF0',
                        }}
                      />
                    </div>
                    <div className="px-4" style={{ width: '140px' }}>
                      <select
                        value={String(editForm.category ?? '')}
                        onChange={(e) =>
                          setEditForm((f) => ({ ...f, category: e.target.value as Cost['category'] }))
                        }
                        className="w-full h-8 rounded-md border px-2 text-xs outline-none"
                        style={{
                          backgroundColor: '#0D0F14',
                          borderColor: '#1E2130',
                          color: '#E8EAF0',
                        }}
                      >
                        {CATEGORY_KEYS.map((k) => (
                          <option key={k} value={k}>
                            {CATEGORY_META[k].label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="px-4" style={{ width: '100px' }}>
                      <input
                        type="number"
                        step="0.01"
                        value={String(editForm.amount ?? '')}
                        onChange={(e) =>
                          setEditForm((f) => ({ ...f, amount: parseFloat(e.target.value) }))
                        }
                        className="w-full h-8 rounded-md border px-2 text-xs outline-none font-mono"
                        style={{
                          backgroundColor: '#0D0F14',
                          borderColor: '#1E2130',
                          color: '#E8EAF0',
                        }}
                      />
                    </div>
                    <div className="hidden lg:block px-4" style={{ flex: 1 }}>
                      <input
                        type="text"
                        value={String(editForm.description ?? '')}
                        onChange={(e) =>
                          setEditForm((f) => ({ ...f, description: e.target.value }))
                        }
                        className="w-full h-8 rounded-md border px-2 text-xs outline-none"
                        style={{
                          backgroundColor: '#0D0F14',
                          borderColor: '#1E2130',
                          color: '#E8EAF0',
                        }}
                      />
                    </div>
                    <div className="hidden md:block px-4" style={{ width: '80px' }} />
                    <div className="px-4 flex items-center justify-center gap-1" style={{ width: '80px' }}>
                      <button
                        onClick={() => saveEdit(cost.id)}
                        className="w-7 h-7 rounded-md flex items-center justify-center transition-colors duration-100"
                        style={{ backgroundColor: 'rgba(52,211,153,0.12)' }}
                      >
                        <Check size={14} style={{ color: '#34D399' }} />
                      </button>
                      <button
                        onClick={cancelEdit}
                        className="w-7 h-7 rounded-md flex items-center justify-center transition-colors duration-100"
                        style={{ backgroundColor: 'rgba(251,113,133,0.12)' }}
                      >
                        <X size={14} style={{ color: '#FB7185' }} />
                      </button>
                    </div>
                  </>
                ) : (
                  /* ---- Display Row ---- */
                  <>
                    {/* Date */}
                    <div className="px-4 text-sm" style={{ width: '120px', color: '#8B8FA3' }}>
                      {format(parseISO(cost.date), 'MMM d, yyyy')}
                    </div>
                    {/* Name */}
                    <div className="px-4 text-sm font-medium truncate" style={{ flex: 1, minWidth: '180px', color: '#E8EAF0' }}>
                      {cost.name}
                    </div>
                    {/* Category Badge */}
                    <div className="px-4" style={{ width: '140px' }}>
                      <span
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium"
                        style={{ backgroundColor: meta.bg, color: meta.color }}
                      >
                        <CatIcon size={12} />
                        {meta.label}
                      </span>
                    </div>
                    {/* Amount */}
                    <div
                      className="px-4 text-sm font-mono font-medium text-right"
                      style={{ width: '100px', color: '#E8EAF0' }}
                    >
                      {formatCurrency(cost.amount)}
                    </div>
                    {/* Description */}
                    <div
                      className="hidden lg:block px-4 text-sm truncate"
                      style={{ flex: 1, color: '#5C6078' }}
                    >
                      {cost.description || '—'}
                    </div>
                    {/* Recurring */}
                    <div className="hidden md:flex px-4 justify-center" style={{ width: '80px' }}>
                      {cost.isRecurring ? (
                        <span
                          className="text-[10px] font-medium px-2 py-0.5 rounded"
                          style={{ backgroundColor: 'rgba(99,102,241,0.12)', color: '#6366F1' }}
                        >
                          Recurring
                        </span>
                      ) : (
                        <span className="text-[10px]" style={{ color: '#5C6078' }}>
                          One-time
                        </span>
                      )}
                    </div>
                    {/* Actions */}
                    <div className="px-4 flex items-center justify-center gap-1" style={{ width: '80px' }}>
                      <button
                        onClick={() => startEdit(cost)}
                        className="w-7 h-7 rounded-md flex items-center justify-center transition-colors duration-100 hover:bg-[#1A1D26]"
                        title="Edit"
                      >
                        <Pencil size={14} style={{ color: '#8B8FA3' }} />
                      </button>
                      <button
                        onClick={() => setDeleteId(cost.id)}
                        className="w-7 h-7 rounded-md flex items-center justify-center transition-colors duration-100 hover:bg-[rgba(251,113,133,0.12)]"
                        title="Delete"
                      >
                        <Trash2 size={14} style={{ color: '#FB7185' }} />
                      </button>
                    </div>
                  </>
                )}
              </motion.div>
            );
          })}
        </AnimatePresence>

        {/* Total Row */}
        {sorted.length > 0 && (
          <div
            className="flex items-center"
            style={{
              backgroundColor: '#090A10',
              height: '44px',
              borderTop: '1px solid #1E2130',
            }}
          >
            <div className="px-4 text-xs font-medium" style={{ width: '120px', color: '#5C6078' }} />
            <div className="px-4 text-xs font-semibold" style={{ flex: 1, minWidth: '180px', color: '#8B8FA3' }}>
              Total ({sorted.length} item{sorted.length !== 1 ? 's' : ''})
            </div>
            <div className="px-4" style={{ width: '140px' }} />
            <div
              className="px-4 text-sm font-mono font-semibold text-right"
              style={{ width: '100px', color: '#E8EAF0' }}
            >
              {formatCurrency(totalAmount)}
            </div>
            <div className="hidden lg:block" style={{ flex: 1 }} />
            <div className="hidden md:block" style={{ width: '80px' }} />
            <div style={{ width: '80px' }} />
          </div>
        )}

        {/* Filtered empty state */}
        {sorted.length === 0 && (
          <div
            className="flex items-center justify-center text-sm"
            style={{ height: '120px', color: '#5C6078' }}
          >
            No costs match the selected filters.
          </div>
        )}
          </div>
        </div>
      </motion.div>

      {/* ---- Monthly Summary Bar Chart ---- */}
      {timeFiltered.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.35 }}
          className="bg-[#11131A] border border-[#1E2130] rounded-xl p-5"
        >
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-base font-medium" style={{ color: '#E8EAF0' }}>
              Monthly Costs
            </h3>
            <span className="text-xs" style={{ color: '#5C6078' }}>
              Last 6 months
            </span>
          </div>

          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={monthlyData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1E2130" vertical={false} />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 11, fill: '#5C6078' }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 11, fill: '#5C6078', fontFamily: 'JetBrains Mono' }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v: number) => formatCurrency(v)}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#11131A',
                  border: '1px solid #1E2130',
                  borderRadius: '8px',
                  color: '#E8EAF0',
                  fontFamily: 'JetBrains Mono',
                  fontSize: '12px',
                }}
                formatter={(value: number) => [formatCurrency(value), 'Costs']}
              />
              <Bar
                dataKey="total"
                fill="#FB7185"
                fillOpacity={0.7}
                radius={[2, 2, 0, 0]}
                barSize={32}
              />
            </BarChart>
          </ResponsiveContainer>
        </motion.div>
      )}

      {/* ---- Delete Confirmation Modal ---- */}
      <AnimatePresence>
        {deleteId && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-[200] flex items-center justify-center"
            style={{ backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
            onClick={() => setDeleteId(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.15 }}
              className="rounded-xl p-6 w-full max-w-sm"
              style={{ backgroundColor: '#11131A', border: '1px solid #1E2130' }}
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-base font-semibold" style={{ color: '#E8EAF0' }}>
                Delete Cost
              </h3>
              <p className="text-sm mt-2" style={{ color: '#8B8FA3' }}>
                Are you sure you want to delete this cost? This action cannot be undone.
              </p>
              <div className="flex items-center justify-end gap-3 mt-5">
                <button
                  onClick={() => setDeleteId(null)}
                  className="px-4 py-2 rounded-lg text-sm font-medium transition-all duration-150"
                  style={{
                    backgroundColor: '#11131A',
                    border: '1px solid #1E2130',
                    color: '#E8EAF0',
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={() => confirmDelete(deleteId)}
                  className="px-4 py-2 rounded-lg text-sm font-medium transition-all duration-150 hover:-translate-y-[1px]"
                  style={{
                    backgroundColor: 'rgba(251,113,133,0.12)',
                    border: '1px solid rgba(251,113,133,0.25)',
                    color: '#FB7185',
                  }}
                >
                  Delete
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ---- Toaster ---- */}
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: '#11131A',
            border: '1px solid #1E2130',
            color: '#E8EAF0',
          },
        }}
      />
    </div>
  );
};

export default Costs;
