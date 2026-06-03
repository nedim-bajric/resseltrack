import React, { useState, useMemo, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { toast, Toaster } from 'sonner';
import {
  ArrowLeft,
  Check,
  Cpu,
  Truck,
  Package,
  Megaphone,
  MoreHorizontal,
  ChevronDown,
} from 'lucide-react';
import { format, startOfMonth, parseISO } from 'date-fns';
import { useCosts } from '@/hooks/useCosts';
import { useDashboard } from '@/hooks/useDashboard';
import { formatCurrency } from '@/lib/currency';
import type { Cost } from '@/types';

/* ------------------------------------------------------------------ */
/*  Constants                                                         */
/* ------------------------------------------------------------------ */

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

const QUICK_FILL_CHIPS: { label: string; name: string; category: Cost['category'] }[] = [
  { label: 'ChatGPT', name: 'ChatGPT Plus Subscription', category: 'ai_tools' },
  { label: 'Midjourney', name: 'Midjourney Subscription', category: 'ai_tools' },
  { label: 'Shipping', name: 'Shipping Labels', category: 'shipping' },
  { label: 'Packaging', name: 'Packaging Materials', category: 'packaging' },
  { label: 'Instagram Ads', name: 'Instagram Ad Campaign', category: 'ads' },
];

const FREQUENCY_OPTIONS = ['Monthly', 'Yearly'];

/* ================================================================== */
/*  MAIN PAGE                                                         */
/* ================================================================== */

const AddCost: React.FC = () => {
  const navigate = useNavigate();
  const { addCost, costs } = useCosts();
  useDashboard(); // load dashboard data for impact preview calculations

  /* ---- form state ---- */
  const [name, setName] = useState('');
  const [category, setCategory] = useState<Cost['category'] | ''>('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [description, setDescription] = useState('');
  const [isRecurring, setIsRecurring] = useState(false);
  const [frequency, setFrequency] = useState('Monthly');
  const [notesExpanded, setNotesExpanded] = useState(false);
  const [errors, setErrors] = useState<Record<string, boolean>>({});
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);

  /* ---- current monthly costs for impact preview ---- */
  const currentMonthCosts = useMemo(() => {
    const monthStart = startOfMonth(new Date());
    return costs
      .filter((c) => new Date(c.date) >= monthStart)
      .reduce((sum, c) => sum + c.amount, 0);
  }, [costs]);

  const newAmount = parseFloat(amount) || 0;
  const afterCosts = currentMonthCosts + newAmount;
  const costIncrease = newAmount;

  /* ---- recent costs for sidebar ---- */
  const recentCosts = useMemo(() => {
    return [...costs]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 5);
  }, [costs]);

  /* ---- validation ---- */
  const validate = useCallback(() => {
    const errs: Record<string, boolean> = {};
    if (!name.trim()) errs.name = true;
    if (!category) errs.category = true;
    if (!amount || parseFloat(amount) <= 0) errs.amount = true;
    if (!date) errs.date = true;
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }, [name, category, amount, date]);

  /* ---- submit ---- */
  const handleSubmit = useCallback(
    async (stay = false) => {
      if (!validate()) {
        toast.error('Please fill in all required fields');
        return;
      }

      const costData: Omit<Cost, 'id' | 'createdAt'> = {
        name: name.trim(),
        category: category as Cost['category'],
        amount: parseFloat(parseFloat(amount).toFixed(2)),
        date: new Date(date).toISOString(),
        description: description.trim() || undefined,
        isRecurring,
      };

      await addCost(costData);
      toast.success(`Cost added: ${formatCurrency(parseFloat(amount))} for ${name.trim()}`);

      if (stay) {
        // Reset form for another entry
        setName('');
        setCategory('');
        setAmount('');
        setDate(format(new Date(), 'yyyy-MM-dd'));
        setDescription('');
        setIsRecurring(false);
        setFrequency('Monthly');
        setNotesExpanded(false);
        setErrors({});
      } else {
        navigate('/costs');
      }
    },
    [name, category, amount, date, description, isRecurring, validate, addCost, navigate]
  );

  /* ---- quick fill chip handler ---- */
  const applyQuickFill = useCallback((chip: (typeof QUICK_FILL_CHIPS)[number]) => {
    setName(chip.name);
    setCategory(chip.category);
    setErrors((prev) => ({ ...prev, name: false, category: false }));
  }, []);

  /* ---- category select display ---- */
  const selectedCategoryMeta = category ? CATEGORY_META[category] : null;

  return (
    <div className="flex gap-6">
      {/* ---- Main Content ---- */}
      <div className="flex-1 min-w-0">
        {/* Page Header */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.2 }}
          className="flex items-center gap-3 mb-8"
        >
          <Link
            to="/costs"
            className="w-9 h-9 rounded-lg flex items-center justify-center transition-colors duration-150"
            style={{ backgroundColor: '#11131A', border: '1px solid #1E2130' }}
          >
            <ArrowLeft size={20} style={{ color: '#E8EAF0' }} />
          </Link>
          <div>
            <h1
              className="text-[32px] font-bold tracking-[-0.02em]"
              style={{ color: '#E8EAF0' }}
            >
              Add Cost
            </h1>
            <p className="text-sm" style={{ color: '#8B8FA3' }}>
              Log an operational expense
            </p>
          </div>
        </motion.div>

        {/* ---- Form Card ---- */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            duration: 0.3,
            delay: 0.1,
            ease: [0.0, 0.0, 0.2, 1] as [number, number, number, number],
          }}
          className="mx-auto"
          style={{ maxWidth: '640px' }}
        >
          <div
            className="rounded-xl p-6 space-y-5"
            style={{ backgroundColor: '#11131A', border: '1px solid #1E2130' }}
          >
            {/* Field 1: Name */}
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2, delay: 0.15 }}
            >
              <label
                className="block text-xs font-medium mb-1.5"
                style={{ color: '#8B8FA3' }}
              >
                What is this cost for? <span style={{ color: '#FB7185' }}>*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  if (errors.name && e.target.value.trim()) {
                    setErrors((prev) => ({ ...prev, name: false }));
                  }
                }}
                placeholder="e.g., ChatGPT Subscription, Shipping Labels"
                maxLength={200}
                className="w-full h-12 rounded-lg border px-3 text-sm outline-none transition-all duration-150 placeholder:text-[#5C6078]"
                style={{
                  backgroundColor: '#0D0F14',
                  borderColor: errors.name ? '#FB7185' : '#1E2130',
                  color: '#E8EAF0',
                  boxShadow: errors.name ? '0 0 0 3px rgba(251,113,133,0.15)' : undefined,
                }}
              />
              <div className="flex items-center justify-between mt-1">
                <span className="text-[10px]" style={{ color: '#5C6078' }}>
                  {name.length}/200
                </span>
                {errors.name && (
                  <span className="text-[10px]" style={{ color: '#FB7185' }}>
                    Name is required
                  </span>
                )}
              </div>

              {/* Quick-fill chips */}
              <div className="flex flex-wrap items-center gap-2 mt-3">
                <span className="text-[11px]" style={{ color: '#5C6078' }}>
                  Quick fill:
                </span>
                {QUICK_FILL_CHIPS.map((chip, i) => (
                  <motion.button
                    key={chip.label}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.1, delay: 0.2 + i * 0.03 }}
                    onClick={() => applyQuickFill(chip)}
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium transition-all duration-150 hover:-translate-y-[1px]"
                    style={{
                      backgroundColor: '#1A1D26',
                      border: '1px solid #1E2130',
                      color: '#8B8FA3',
                      height: '28px',
                    }}
                  >
                    {chip.label}
                  </motion.button>
                ))}
              </div>
            </motion.div>

            {/* Field 2: Category */}
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2, delay: 0.2 }}
              className="relative"
            >
              <label
                className="block text-xs font-medium mb-1.5"
                style={{ color: '#8B8FA3' }}
              >
                Category <span style={{ color: '#FB7185' }}>*</span>
              </label>
              <button
                onClick={() => setShowCategoryDropdown((v) => !v)}
                className="w-full h-10 rounded-lg border px-3 text-sm flex items-center justify-between outline-none transition-all duration-150"
                style={{
                  backgroundColor: '#0D0F14',
                  borderColor: errors.category ? '#FB7185' : '#1E2130',
                  boxShadow: errors.category ? '0 0 0 3px rgba(251,113,133,0.15)' : undefined,
                  color: selectedCategoryMeta ? '#E8EAF0' : '#5C6078',
                }}
              >
                <span className="flex items-center gap-2">
                  {selectedCategoryMeta && (
                    <selectedCategoryMeta.icon
                      size={16}
                      style={{ color: selectedCategoryMeta.color }}
                    />
                  )}
                  {selectedCategoryMeta ? selectedCategoryMeta.label : 'Select category...'}
                </span>
                <ChevronDown size={16} style={{ color: '#5C6078' }} />
              </button>
              {errors.category && (
                <span className="text-[10px] mt-1 block" style={{ color: '#FB7185' }}>
                  Category is required
                </span>
              )}

              {/* Category Dropdown */}
              {showCategoryDropdown && (
                <motion.div
                  initial={{ opacity: 0, scaleY: 0.95 }}
                  animate={{ opacity: 1, scaleY: 1 }}
                  transition={{ duration: 0.15 }}
                  className="absolute left-0 right-0 top-full mt-1 rounded-lg overflow-hidden z-[100]"
                  style={{
                    backgroundColor: '#11131A',
                    border: '1px solid #1E2130',
                    boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
                    transformOrigin: 'top',
                  }}
                >
                  <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
                    {CATEGORY_KEYS.map((key) => {
                      const meta = CATEGORY_META[key];
                      const Icon = meta.icon;
                      return (
                        <button
                          key={key}
                          onClick={() => {
                            setCategory(key);
                            setShowCategoryDropdown(false);
                            setErrors((prev) => ({ ...prev, category: false }));
                          }}
                          className="w-full flex items-center gap-2.5 px-3 h-9 text-sm transition-colors duration-100 hover:bg-[#1A1D26]"
                          style={{ color: '#E8EAF0' }}
                        >
                          <Icon size={16} style={{ color: meta.color }} />
                          {meta.label}
                        </button>
                      );
                    })}
                  </div>
                </motion.div>
              )}
            </motion.div>

            {/* Field 3: Amount */}
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2, delay: 0.25 }}
            >
              <label
                className="block text-xs font-medium mb-1.5"
                style={{ color: '#8B8FA3' }}
              >
                Amount <span style={{ color: '#FB7185' }}>*</span>
              </label>
              <div className="flex items-center gap-3">
                <div className="relative" style={{ width: '200px' }}>
                  <span
                    className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none text-sm font-mono"
                    style={{ color: '#5C6078' }}
                  >
                    KM
                  </span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={amount}
                    onChange={(e) => {
                      setAmount(e.target.value);
                      if (errors.amount && parseFloat(e.target.value) > 0) {
                        setErrors((prev) => ({ ...prev, amount: false }));
                      }
                    }}
                    placeholder="0.00"
                    className="w-full h-10 rounded-lg border pl-10 pr-3 text-sm font-mono outline-none transition-all duration-150 placeholder:text-[#5C6078]"
                    style={{
                      backgroundColor: '#0D0F14',
                      borderColor: errors.amount ? '#FB7185' : '#1E2130',
                      color: '#E8EAF0',
                      boxShadow: errors.amount ? '0 0 0 3px rgba(251,113,133,0.15)' : undefined,
                    }}
                  />
                </div>
                <span className="text-xs" style={{ color: '#5C6078' }}>
                  This amount will be recorded as an expense affecting your total profit.
                </span>
              </div>
              {errors.amount && (
                <span className="text-[10px] mt-1 block" style={{ color: '#FB7185' }}>
                  Amount must be greater than 0
                </span>
              )}
            </motion.div>

            {/* Field 4: Date */}
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2, delay: 0.3 }}
            >
              <label
                className="block text-xs font-medium mb-1.5"
                style={{ color: '#8B8FA3' }}
              >
                Date <span style={{ color: '#FB7185' }}>*</span>
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => {
                  setDate(e.target.value);
                  if (errors.date && e.target.value) {
                    setErrors((prev) => ({ ...prev, date: false }));
                  }
                }}
                className="h-10 rounded-lg border px-3 text-sm outline-none transition-all duration-150"
                style={{
                  backgroundColor: '#0D0F14',
                  borderColor: errors.date ? '#FB7185' : '#1E2130',
                  color: '#E8EAF0',
                  width: '200px',
                  boxShadow: errors.date ? '0 0 0 3px rgba(251,113,133,0.15)' : undefined,
                }}
              />
              {errors.date && (
                <span className="text-[10px] mt-1 block" style={{ color: '#FB7185' }}>
                  Date is required
                </span>
              )}
            </motion.div>

            {/* Field 5: Notes (Optional, collapsible) */}
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2, delay: 0.35 }}
            >
              {!notesExpanded ? (
                <button
                  onClick={() => setNotesExpanded(true)}
                  className="text-xs font-medium transition-colors duration-150 hover:underline"
                  style={{ color: '#6366F1' }}
                >
                  + Add notes
                </button>
              ) : (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  transition={{ duration: 0.2 }}
                >
                  <label
                    className="block text-xs font-medium mb-1.5"
                    style={{ color: '#8B8FA3' }}
                  >
                    Notes (optional)
                  </label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Any extra details..."
                    rows={3}
                    className="w-full rounded-lg border px-3 py-2 text-sm outline-none transition-all duration-150 resize-none placeholder:text-[#5C6078]"
                    style={{
                      backgroundColor: '#0D0F14',
                      borderColor: '#1E2130',
                      color: '#E8EAF0',
                    }}
                  />
                </motion.div>
              )}
            </motion.div>

            {/* Field 6: Is Recurring Toggle */}
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2, delay: 0.4 }}
              className="flex items-center gap-4"
            >
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setIsRecurring((v) => !v)}
                  className="relative w-10 h-5 rounded-full transition-colors duration-150"
                  style={{
                    backgroundColor: isRecurring ? '#6366F1' : '#1E2130',
                  }}
                >
                  <div
                    className="absolute top-0.5 w-4 h-4 rounded-full transition-transform duration-150"
                    style={{
                      backgroundColor: '#E8EAF0',
                      left: isRecurring ? '22px' : '2px',
                    }}
                  />
                </button>
                <span className="text-sm" style={{ color: '#8B8FA3' }}>
                  Is Recurring
                </span>
              </div>

              {isRecurring && (
                <motion.div
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.15 }}
                  className="flex items-center gap-2"
                >
                  {FREQUENCY_OPTIONS.map((opt) => (
                    <button
                      key={opt}
                      onClick={() => setFrequency(opt)}
                      className="px-3 py-1 rounded-md text-xs font-medium transition-all duration-150"
                      style={{
                        backgroundColor: frequency === opt ? '#222633' : 'transparent',
                        color: frequency === opt ? '#E8EAF0' : '#5C6078',
                        border: frequency === opt ? '1px solid #2E3250' : '1px solid transparent',
                      }}
                    >
                      {opt}
                    </button>
                  ))}
                </motion.div>
              )}
            </motion.div>

            {/* ---- Live Impact Preview ---- */}
            <AnimatePresence>
              {newAmount > 0 && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.25 }}
                  className="overflow-hidden"
                >
                  <div
                    className="rounded-lg p-4 mt-2"
                    style={{
                      backgroundColor: '#11131A',
                      border: '1px solid #1E2130',
                      borderLeft: '3px solid rgba(251,113,133,0.5)',
                    }}
                  >
                    <h4
                      className="text-sm font-medium mb-3"
                      style={{ color: '#E8EAF0' }}
                    >
                      Impact on This Month
                    </h4>
                    <div className="flex items-center gap-4 flex-wrap">
                      <div>
                        <p className="text-[10px] uppercase tracking-wider" style={{ color: '#5C6078' }}>
                          Current
                        </p>
                        <p className="text-sm font-mono font-medium" style={{ color: '#8B8FA3' }}>
                          {formatCurrency(currentMonthCosts)}
                        </p>
                      </div>
                      <div style={{ color: '#5C6078' }}>→</div>
                      <div>
                        <p className="text-[10px] uppercase tracking-wider" style={{ color: '#5C6078' }}>
                          After this cost
                        </p>
                        <p className="text-sm font-mono font-medium" style={{ color: '#FB7185' }}>
                          {formatCurrency(afterCosts)}
                        </p>
                      </div>
                    </div>
                    <p className="text-xs mt-3" style={{ color: '#FB7185' }}>
                      This will increase your monthly costs by {formatCurrency(costIncrease)}
                    </p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>

        {/* ---- Sticky Bottom Actions ---- */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.45 }}
          className="mt-8 flex items-center justify-between"
        >
          <Link
            to="/costs"
            className="px-5 py-2.5 rounded-lg text-sm font-medium transition-all duration-150"
            style={{
              backgroundColor: '#11131A',
              border: '1px solid #1E2130',
              color: '#E8EAF0',
            }}
          >
            Cancel
          </Link>
          <div className="flex items-center gap-3">
            <button
              onClick={() => handleSubmit(true)}
              className="px-5 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 hover:-translate-y-[1px]"
              style={{
                backgroundColor: '#11131A',
                border: '1px solid #1E2130',
                color: '#E8EAF0',
              }}
            >
              Add Another
            </button>
            <button
              onClick={() => handleSubmit(false)}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 hover:-translate-y-[1px]"
              style={{ backgroundColor: '#6366F1', color: '#0B0D12' }}
            >
              <Check size={16} />
              Add Cost
            </button>
          </div>
        </motion.div>
      </div>

      {/* ---- Recent Costs Sidebar (Desktop Only, ≥1200px) ---- */}
      {recentCosts.length > 0 && (
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3, delay: 0.5 }}
          className="hidden xl:block shrink-0"
          style={{ width: '320px' }}
        >
          <div
            className="rounded-xl"
            style={{ backgroundColor: '#11131A', border: '1px solid #1E2130' }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 pt-5 pb-3">
              <h3 className="text-base font-medium" style={{ color: '#E8EAF0' }}>
                Recently Added
              </h3>
              <span className="text-xs" style={{ color: '#5C6078' }}>
                This Month
              </span>
            </div>

            {/* List */}
            <div>
              {recentCosts.map((cost, index) => {
                const meta = CATEGORY_META[cost.category];
                return (
                  <motion.div
                    key={cost.id}
                    initial={{ opacity: 0, x: 8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.15, delay: 0.55 + index * 0.04 }}
                    className="flex items-center justify-between px-5 transition-colors duration-100 hover:bg-[#1A1D26]"
                    style={{
                      height: '48px',
                      borderBottom:
                        index < recentCosts.length - 1 ? '1px solid #1E2130' : undefined,
                    }}
                  >
                    <div className="min-w-0">
                      <p
                        className="text-sm font-medium truncate"
                        style={{ color: '#E8EAF0', maxWidth: '200px' }}
                      >
                        {cost.name}
                      </p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <div
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: meta.color }}
                        />
                        <span className="text-[10px]" style={{ color: '#5C6078' }}>
                          {meta.label} · {format(parseISO(cost.date), 'MMM d')}
                        </span>
                      </div>
                    </div>
                    <span
                      className="text-sm font-mono font-medium shrink-0 ml-3"
                      style={{ color: '#E8EAF0' }}
                    >
                      {formatCurrency(cost.amount)}
                    </span>
                  </motion.div>
                );
              })}
            </div>

            {/* Footer */}
            <div className="px-5 py-3">
              <Link
                to="/costs"
                className="text-xs font-medium transition-colors duration-150 hover:underline"
                style={{ color: '#6366F1' }}
              >
                View All
              </Link>
            </div>
          </div>
        </motion.div>
      )}

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

export default AddCost;
