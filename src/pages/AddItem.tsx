import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  Package,
  Plus,
  Trash2,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import { Toaster, toast } from 'sonner';
import { useProducts } from '@/hooks/useProducts';
import { formatCurrency } from '@/lib/currency';
import type { ProductOption } from '@/types';

const CATEGORIES = ['Clothing', 'Accessories', 'Home', 'Electronics', 'Other'];
const SOURCES = ['Temu', 'AliExpress', 'Amazon', 'Local Store', 'Other'];

interface OptionBatchRow {
  id: string;
  quantity: number;
  buyPrice: string;
}

interface OptionRow {
  id: string;
  color: string;
  size: string;
  batches: OptionBatchRow[];
}

const optionTotalQuantity = (o: OptionRow) =>
  o.batches.reduce((sum, b) => sum + (parseInt(String(b.quantity)) || 0), 0);

const batchTotalCost = (o: OptionRow, fallbackBuyPrice: number) =>
  o.batches.reduce((sum, b) => {
    const price = b.buyPrice ? parseFloat(b.buyPrice) || fallbackBuyPrice : fallbackBuyPrice;
    return sum + price * (parseInt(String(b.quantity)) || 0);
  }, 0);

/* ------------------------------------------------------------------ */
/*  Add Item Page                                                     */
/* ------------------------------------------------------------------ */

const AddItem: React.FC = () => {
  const navigate = useNavigate();
  const { addProduct } = useProducts();

  /* -- Form state -- */
  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [source, setSource] = useState('Temu');
  const [imageUrl, setImageUrl] = useState('');
  const [notes, setNotes] = useState('');

  const [buyPrice, setBuyPrice] = useState('');
  const [originalPrice, setOriginalPrice] = useState('');
  const [targetPrice, setTargetPrice] = useState('');
  const [baseQuantity, setBaseQuantity] = useState('1');

  const [hasOptions, setHasOptions] = useState(false);
  const [options, setOptions] = useState<OptionRow[]>([]);

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [shake, setShake] = useState(false);

  /* -- Computed values -- */
  const buyPriceNum = parseFloat(buyPrice) || 0;
  const originalPriceNum = parseFloat(originalPrice) || 0;
  const targetPriceNum = parseFloat(targetPrice) || 0;
  const baseQtyNum = parseInt(baseQuantity) || 0;

  const totalQuantity = useMemo(() => {
    if (hasOptions && options.length > 0) {
      return options.reduce((sum, o) => sum + optionTotalQuantity(o), 0);
    }
    return baseQtyNum;
  }, [hasOptions, options, baseQtyNum]);

  const totalCost = useMemo(() => {
    if (hasOptions && options.length > 0) {
      return options.reduce((sum, o) => sum + batchTotalCost(o, buyPriceNum), 0);
    }
    return buyPriceNum * totalQuantity;
  }, [hasOptions, options, buyPriceNum, totalQuantity]);
  const totalRevenue = targetPriceNum * totalQuantity;
  const totalProfit = totalRevenue - totalCost;
  const avgCost = totalQuantity > 0 ? totalCost / totalQuantity : 0;
  const profitPerUnit = targetPriceNum - avgCost;
  const marginPercent = avgCost > 0 ? (profitPerUnit / avgCost) * 100 : 0;
  const discountPercent = originalPriceNum > 0 ? ((originalPriceNum - targetPriceNum) / originalPriceNum) * 100 : 0;

  /* -- Options management -- */
  const makeBatch = (): OptionBatchRow => ({
    id: `batch-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    quantity: 1,
    buyPrice: buyPrice,
  });

  const addOption = () => {
    const newOption: OptionRow = {
      id: `opt-${Date.now()}`,
      color: '',
      size: '',
      batches: [makeBatch()],
    };
    setOptions((prev) => [...prev, newOption]);
  };

  const removeOption = (id: string) => {
    setOptions((prev) => prev.filter((o) => o.id !== id));
  };

  const updateOptionColor = (id: string, color: string) => {
    setOptions((prev) => prev.map((o) => (o.id === id ? { ...o, color } : o)));
  };

  const updateOptionSize = (id: string, size: string) => {
    setOptions((prev) => prev.map((o) => (o.id === id ? { ...o, size } : o)));
  };

  const addBatch = (optionId: string) => {
    setOptions((prev) =>
      prev.map((o) => (o.id === optionId ? { ...o, batches: [...o.batches, makeBatch()] } : o))
    );
  };

  const removeBatch = (optionId: string, batchId: string) => {
    setOptions((prev) =>
      prev.map((o) =>
        o.id === optionId
          ? { ...o, batches: o.batches.filter((b) => b.id !== batchId) }
          : o
      )
    );
  };

  const updateBatch = (optionId: string, batchId: string, field: keyof OptionBatchRow, value: string | number) => {
    setOptions((prev) =>
      prev.map((o) =>
        o.id === optionId
          ? {
              ...o,
              batches: o.batches.map((b) => (b.id === batchId ? { ...b, [field]: value } : b)),
            }
          : o
      )
    );
  };

  /* -- Validation -- */
  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!name.trim()) newErrors.name = 'Item name is required';
    if (!category) newErrors.category = 'Category is required';
    if (!buyPrice || parseFloat(buyPrice) <= 0) newErrors.buyPrice = 'Buy price must be greater than 0';
    if (!targetPrice || parseFloat(targetPrice) <= 0) newErrors.targetPrice = 'Target price must be greater than 0';
    if (!baseQuantity || parseInt(baseQuantity) < 1) newErrors.baseQuantity = 'Quantity must be at least 1';

    if (hasOptions && options.length > 0) {
      const allHaveBatches = options.every((o) => o.batches.length > 0 && o.batches.every((b) => (parseInt(String(b.quantity)) || 0) > 0));
      if (!allHaveBatches) newErrors.options = 'Every variant must have at least one batch with quantity greater than 0';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  /* -- Submit -- */
  const handleSubmit = async () => {
    if (!validate()) {
      setShake(true);
      setTimeout(() => setShake(false), 400);
      return;
    }

    setIsSubmitting(true);

    // Build options
    let productOptions: ProductOption[] = [];
    if (hasOptions && options.length > 0) {
      productOptions = options.map((o) => {
        const batches = o.batches.map((b) => {
          const qty = parseInt(String(b.quantity)) || 0;
          return {
            id: b.id,
            quantity: qty,
            remaining: qty,
            buyPrice: b.buyPrice ? parseFloat(b.buyPrice) || buyPriceNum : buyPriceNum,
          };
        });
        const qty = batches.reduce((sum, b) => sum + b.quantity, 0);
        return {
          id: o.id,
          name: `${o.color || ''} ${o.size || ''}`.trim() || 'Default',
          color: o.color || undefined,
          size: o.size || undefined,
          quantity: qty,
          soldQuantity: 0,
          batches,
        };
      });
    } else {
      // Single item - create one default option
      productOptions = [{
        id: `opt-${Date.now()}`,
        name: 'Default',
        quantity: baseQtyNum,
        soldQuantity: 0,
        batches: [
          {
            id: `batch-${Date.now()}`,
            quantity: baseQtyNum,
            remaining: baseQtyNum,
            buyPrice: buyPriceNum,
          },
        ],
      }];
    }

    await addProduct({
      name: name.trim(),
      category,
      imageUrl: imageUrl.trim() || undefined,
      buyPrice: buyPriceNum,
      originalPrice: originalPriceNum > 0 ? originalPriceNum : undefined,
      targetPrice: targetPriceNum,
      status: 'in_stock',
      totalQuantity,
      totalSold: 0,
      options: productOptions,
      source,
      notes: notes.trim() || undefined,
    });

    setIsSubmitting(false);
    toast.success('Item added successfully');
    navigate('/inventory');
  };

  /* -- Section Number helper -- */
  const SectionNum = ({ num }: { num: number }) => (
    <div
      className="flex items-center justify-center flex-shrink-0 rounded-full text-sm font-semibold"
      style={{
        width: '28px',
        height: '28px',
        backgroundColor: '#6366F1',
        color: '#0B0D12',
      }}
    >
      {num}
    </div>
  );

  /* -- Common input styles -- */
  const inputBaseClass = 'w-full rounded-lg border text-sm outline-none transition-all duration-150';
  const inputStyle = (hasError: boolean): React.CSSProperties => ({
    backgroundColor: '#0D0F14',
    borderColor: hasError ? '#FB7185' : '#1E2130',
    color: '#E8EAF0',
    height: '40px',
    padding: '0 12px',
  });

  const labelClass = 'text-xs font-medium mb-1 block';
  const labelStyle: React.CSSProperties = { color: '#8B8FA3' };

  const errorClass = 'flex items-center gap-1 mt-1 text-xs';
  const errorStyle: React.CSSProperties = { color: '#FB7185' };

  return (
    <div className={shake ? 'animate-shake' : ''}>
      <Toaster theme="dark" position="top-right" />

      {/* ====== PAGE HEADER ====== */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.2 }}
        className="flex items-center justify-between mb-8"
        style={{ minHeight: '56px' }}
      >
        <div className="flex items-center gap-3">
          <motion.button
            initial={{ x: -8, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ duration: 0.2 }}
            onClick={() => navigate('/inventory')}
            className="flex items-center justify-center rounded-lg transition-colors duration-150"
            style={{ width: '36px', height: '36px', backgroundColor: '#11131A', border: '1px solid #1E2130' }}
            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#1A1D26'; }}
            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#11131A'; }}
          >
            <ArrowLeft size={20} style={{ color: '#E8EAF0' }} />
          </motion.button>
          <div>
            <h1
              className="font-bold"
              style={{ fontSize: '32px', lineHeight: 1.1, letterSpacing: '-0.02em', color: '#E8EAF0' }}
            >
              Add New Item
            </h1>
            <p className="mt-1 text-sm" style={{ color: '#8B8FA3' }}>
              Log a new product from {source}
            </p>
          </div>
        </div>
      </motion.div>

      {/* ====== FORM ====== */}
      <div className="max-w-[720px] mx-auto space-y-8">

        {/* Section 1: Basic Info */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2, delay: 0.05, ease: [0.0, 0.0, 0.2, 1] as [number, number, number, number] }}
        >
          <div className="flex items-center gap-3 mb-5">
            <SectionNum num={1} />
            <div>
              <h2 className="text-base font-medium" style={{ color: '#E8EAF0' }}>Basic Information</h2>
              <p className="text-sm" style={{ color: '#8B8FA3' }}>What are you selling?</p>
            </div>
          </div>

          <div className="space-y-4 ml-10">
            {/* Name */}
            <div>
              <label className={labelClass} style={labelStyle}>Item Name *</label>
              <input
                type="text"
                placeholder="e.g., iPhone 15 Pro Case"
                value={name}
                onChange={(e) => { setName(e.target.value); if (errors.name) setErrors((p) => { const n = { ...p }; delete n.name; return n; }); }}
                className={inputBaseClass}
                style={inputStyle(!!errors.name)}
                maxLength={120}
                onFocus={(e) => { if (!errors.name) { e.currentTarget.style.borderColor = '#6366F1'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(99,102,241,0.15)'; } }}
                onBlur={(e) => { e.currentTarget.style.borderColor = errors.name ? '#FB7185' : '#1E2130'; e.currentTarget.style.boxShadow = 'none'; }}
              />
              {errors.name && (
                <span className={errorClass} style={errorStyle}><AlertCircle size={14} /> {errors.name}</span>
              )}
            </div>

            {/* Category */}
            <div>
              <label className={labelClass} style={labelStyle}>Category *</label>
              <select
                value={category}
                onChange={(e) => { setCategory(e.target.value); if (errors.category) setErrors((p) => { const n = { ...p }; delete n.category; return n; }); }}
                className={inputBaseClass}
                style={inputStyle(!!errors.category)}
                onFocus={(e) => { if (!errors.category) { e.currentTarget.style.borderColor = '#6366F1'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(99,102,241,0.15)'; } }}
                onBlur={(e) => { e.currentTarget.style.borderColor = errors.category ? '#FB7185' : '#1E2130'; e.currentTarget.style.boxShadow = 'none'; }}
              >
                <option value="">Select category...</option>
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
              {errors.category && (
                <span className={errorClass} style={errorStyle}><AlertCircle size={14} /> {errors.category}</span>
              )}
            </div>

            {/* Source */}
            <div>
              <label className={labelClass} style={labelStyle}>Source</label>
              <select
                value={source}
                onChange={(e) => setSource(e.target.value)}
                className={inputBaseClass}
                style={inputStyle(false)}
                onFocus={(e) => { e.currentTarget.style.borderColor = '#6366F1'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(99,102,241,0.15)'; }}
                onBlur={(e) => { e.currentTarget.style.borderColor = '#1E2130'; e.currentTarget.style.boxShadow = 'none'; }}
              >
                {SOURCES.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>

            {/* Image URL */}
            <div>
              <label className={labelClass} style={labelStyle}>Image URL (optional)</label>
              <input
                type="text"
                placeholder="https://..."
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                className={inputBaseClass}
                style={inputStyle(false)}
                onFocus={(e) => { e.currentTarget.style.borderColor = '#6366F1'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(99,102,241,0.15)'; }}
                onBlur={(e) => { e.currentTarget.style.borderColor = '#1E2130'; e.currentTarget.style.boxShadow = 'none'; }}
              />
            </div>

            {/* Notes */}
            <div>
              <label className={labelClass} style={labelStyle}>Notes (optional)</label>
              <textarea
                placeholder="Brief description for your reference..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className={inputBaseClass}
                style={{
                  backgroundColor: '#0D0F14',
                  borderColor: '#1E2130',
                  color: '#E8EAF0',
                  minHeight: '80px',
                  padding: '10px 12px',
                  resize: 'vertical',
                }}
                onFocus={(e) => { e.currentTarget.style.borderColor = '#6366F1'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(99,102,241,0.15)'; }}
                onBlur={(e) => { e.currentTarget.style.borderColor = '#1E2130'; e.currentTarget.style.boxShadow = 'none'; }}
              />
            </div>
          </div>
        </motion.div>

        {/* Section 2: Pricing */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2, delay: 0.1, ease: [0.0, 0.0, 0.2, 1] as [number, number, number, number] }}
        >
          <div className="flex items-center gap-3 mb-5">
            <SectionNum num={2} />
            <div>
              <h2 className="text-base font-medium" style={{ color: '#E8EAF0' }}>Pricing</h2>
              <p className="text-sm" style={{ color: '#8B8FA3' }}>What did you pay and what do you want to sell it for?</p>
            </div>
          </div>

          <div className="space-y-4 ml-10">
            {/* Buy Price */}
            <div>
              <label className={labelClass} style={labelStyle}>Buy Price per Unit *</label>
              <div className="relative" style={{ width: '200px' }}>
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-mono" style={{ color: '#5C6078' }}>KM</span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={buyPrice}
                  onChange={(e) => { setBuyPrice(e.target.value); if (errors.buyPrice) setErrors((p) => { const n = { ...p }; delete n.buyPrice; return n; }); }}
                  className={inputBaseClass}
                  style={{ ...inputStyle(!!errors.buyPrice), paddingLeft: '36px' }}
                  onFocus={(e) => { if (!errors.buyPrice) { e.currentTarget.style.borderColor = '#6366F1'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(99,102,241,0.15)'; } }}
                  onBlur={(e) => { e.currentTarget.style.borderColor = errors.buyPrice ? '#FB7185' : '#1E2130'; e.currentTarget.style.boxShadow = 'none'; }}
                />
              </div>
              {errors.buyPrice && (
                <span className={errorClass} style={errorStyle}><AlertCircle size={14} /> {errors.buyPrice}</span>
              )}
              {buyPriceNum > 0 && targetPriceNum > 0 && (
                <p className="mt-1 text-xs font-medium" style={{ color: profitPerUnit >= 0 ? '#34D399' : '#FB7185' }}>
                  Profit per unit: {profitPerUnit >= 0 ? '+' : ''}{formatCurrency(profitPerUnit)} ({marginPercent.toFixed(0)}% margin)
                </p>
              )}
            </div>

            {/* Original Price (Before Discount) */}
            <div>
              <label className={labelClass} style={labelStyle}>Original Price (before discount)</label>
              <div className="relative" style={{ width: '200px' }}>
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-mono" style={{ color: '#5C6078' }}>KM</span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={originalPrice}
                  onChange={(e) => { setOriginalPrice(e.target.value); if (errors.originalPrice) setErrors((p) => { const n = { ...p }; delete n.originalPrice; return n; }); }}
                  className={inputBaseClass}
                  style={{ ...inputStyle(!!errors.originalPrice), paddingLeft: '36px' }}
                  onFocus={(e) => { e.currentTarget.style.borderColor = '#6366F1'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(99,102,241,0.15)'; }}
                  onBlur={(e) => { e.currentTarget.style.borderColor = '#1E2130'; e.currentTarget.style.boxShadow = 'none'; }}
                />
              </div>
              {originalPriceNum > 0 && targetPriceNum > 0 && (
                <p className="mt-1 text-xs font-medium" style={{ color: '#FBBF24' }}>
                  Discount: {discountPercent.toFixed(0)}% off ({formatCurrency(originalPriceNum - targetPriceNum)} saved)
                </p>
              )}
            </div>

            {/* Target Price */}
            <div>
              <label className={labelClass} style={labelStyle}>Target Resell Price *</label>
              <div className="relative" style={{ width: '200px' }}>
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-mono" style={{ color: '#5C6078' }}>KM</span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={targetPrice}
                  onChange={(e) => { setTargetPrice(e.target.value); if (errors.targetPrice) setErrors((p) => { const n = { ...p }; delete n.targetPrice; return n; }); }}
                  className={inputBaseClass}
                  style={{ ...inputStyle(!!errors.targetPrice), paddingLeft: '36px' }}
                  onFocus={(e) => { if (!errors.targetPrice) { e.currentTarget.style.borderColor = '#6366F1'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(99,102,241,0.15)'; } }}
                  onBlur={(e) => { e.currentTarget.style.borderColor = errors.targetPrice ? '#FB7185' : '#1E2130'; e.currentTarget.style.boxShadow = 'none'; }}
                />
              </div>
              {errors.targetPrice && (
                <span className={errorClass} style={errorStyle}><AlertCircle size={14} /> {errors.targetPrice}</span>
              )}
            </div>

            {/* Quantity (only when no options) */}
            <div>
              <label className={labelClass} style={labelStyle}>Total Quantity *</label>
              <input
                type="number"
                min="1"
                step="1"
                placeholder="1"
                value={baseQuantity}
                onChange={(e) => { setBaseQuantity(e.target.value); if (errors.baseQuantity) setErrors((p) => { const n = { ...p }; delete n.baseQuantity; return n; }); }}
                className={inputBaseClass}
                style={{ ...inputStyle(!!errors.baseQuantity), width: '120px' }}
                onFocus={(e) => { if (!errors.baseQuantity) { e.currentTarget.style.borderColor = '#6366F1'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(99,102,241,0.15)'; } }}
                onBlur={(e) => { e.currentTarget.style.borderColor = errors.baseQuantity ? '#FB7185' : '#1E2130'; e.currentTarget.style.boxShadow = 'none'; }}
              />
              {errors.baseQuantity && (
                <span className={errorClass} style={errorStyle}><AlertCircle size={14} /> {errors.baseQuantity}</span>
              )}
            </div>

            {/* Live Summary Bar */}
            <AnimatePresence>
              {buyPriceNum > 0 && targetPriceNum > 0 && totalQuantity > 0 && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.25, ease: [0.0, 0.0, 0.2, 1] as [number, number, number, number] }}
                  className="rounded-lg p-4 overflow-hidden"
                  style={{ backgroundColor: '#1A1D26' }}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs mb-0.5" style={{ color: '#5C6078' }}>Total Investment</p>
                      <p className="text-sm font-mono font-medium" style={{ color: '#FB7185' }}>{formatCurrency(totalCost)}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs mb-0.5" style={{ color: '#5C6078' }}>Potential Revenue</p>
                      <p className="text-sm font-mono font-medium" style={{ color: '#34D399' }}>{formatCurrency(totalRevenue)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs mb-0.5" style={{ color: '#5C6078' }}>Potential Profit</p>
                      <p className="text-base font-mono font-semibold" style={{ color: '#34D399' }}>+{formatCurrency(totalProfit)}</p>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>

        {/* Section 3: Options Builder */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2, delay: 0.15, ease: [0.0, 0.0, 0.2, 1] as [number, number, number, number] }}
        >
          <div className="flex items-center gap-3 mb-5">
            <SectionNum num={3} />
            <div className="flex-1">
              <h2 className="text-base font-medium" style={{ color: '#E8EAF0' }}>Options</h2>
              <p className="text-sm" style={{ color: '#8B8FA3' }}>Does this item come in different colors or sizes?</p>
            </div>
            {/* Toggle */}
            <button
              onClick={() => setHasOptions(!hasOptions)}
              className="relative inline-flex h-5 w-9 items-center rounded-full transition-colors duration-150"
              style={{ backgroundColor: hasOptions ? '#6366F1' : '#1E2130' }}
            >
              <span
                className="inline-block h-4 w-4 rounded-full transition-transform duration-150"
                style={{
                  backgroundColor: hasOptions ? '#E8EAF0' : '#5C6078',
                  transform: hasOptions ? 'translateX(18px)' : 'translateX(2px)',
                }}
              />
            </button>
          </div>

          <div className="ml-10">
            <AnimatePresence>
              {hasOptions ? (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.3, ease: [0.0, 0.0, 0.2, 1] as [number, number, number, number] }}
                  className="overflow-hidden"
                >
                  {options.length === 0 ? (
                    <div className="text-center py-6">
                      <p className="text-sm italic" style={{ color: '#5C6078' }}>No options added yet. Click the button below to add variants.</p>
                    </div>
                  ) : (
                    <div className="rounded-lg overflow-hidden mb-3" style={{ border: '1px solid #1E2130' }}>
                      {/* Options list */}
                      {options.map((option, idx) => (
                        <motion.div
                          key={option.id}
                          initial={{ opacity: 0, scale: 0.98 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ duration: 0.15, delay: idx * 0.03 }}
                          className="p-3"
                          style={{
                            backgroundColor: '#11131A',
                            borderTop: '1px solid #1E2130',
                          }}
                        >
                          {/* Variant header */}
                          <div className="flex items-center gap-2 mb-2">
                            <input
                              type="text"
                              placeholder="Color"
                              value={option.color}
                              onChange={(e) => updateOptionColor(option.id, e.target.value)}
                              className="rounded-md border text-sm outline-none px-2"
                              style={{
                                backgroundColor: '#0D0F14',
                                borderColor: '#1E2130',
                                color: '#E8EAF0',
                                height: '32px',
                                flex: '0 0 120px',
                              }}
                              onFocus={(e) => { e.currentTarget.style.borderColor = '#6366F1'; }}
                              onBlur={(e) => { e.currentTarget.style.borderColor = '#1E2130'; }}
                            />
                            <input
                              type="text"
                              placeholder="Size"
                              value={option.size}
                              onChange={(e) => updateOptionSize(option.id, e.target.value)}
                              className="rounded-md border text-sm outline-none px-2"
                              style={{
                                backgroundColor: '#0D0F14',
                                borderColor: '#1E2130',
                                color: '#E8EAF0',
                                height: '32px',
                                flex: '0 0 100px',
                              }}
                              onFocus={(e) => { e.currentTarget.style.borderColor = '#6366F1'; }}
                              onBlur={(e) => { e.currentTarget.style.borderColor = '#1E2130'; }}
                            />
                            <span className="text-xs" style={{ color: '#8B8FA3' }}>
                              Total: <span className="font-mono" style={{ color: '#E8EAF0' }}>{optionTotalQuantity(option)}</span>
                            </span>
                            <div className="flex justify-end" style={{ flex: 1 }}>
                              <button
                                onClick={() => removeOption(option.id)}
                                className="flex items-center justify-center rounded-md transition-colors duration-100"
                                style={{ width: '28px', height: '28px', color: '#5C6078' }}
                                onMouseEnter={(e) => { e.currentTarget.style.color = '#FB7185'; e.currentTarget.style.backgroundColor = 'rgba(251,113,133,0.12)'; }}
                                onMouseLeave={(e) => { e.currentTarget.style.color = '#5C6078'; e.currentTarget.style.backgroundColor = 'transparent'; }}
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </div>

                          {/* Batches */}
                          <div className="space-y-2 pl-1">
                            {option.batches.map((batch) => (
                              <div key={batch.id} className="flex items-center gap-2">
                                <input
                                  type="number"
                                  min="1"
                                  step="1"
                                  placeholder="Qty"
                                  value={batch.quantity}
                                  onChange={(e) => updateBatch(option.id, batch.id, 'quantity', parseInt(e.target.value) || 0)}
                                  className="rounded-md border text-sm outline-none px-2 text-right font-mono"
                                  style={{
                                    backgroundColor: '#0D0F14',
                                    borderColor: '#1E2130',
                                    color: '#E8EAF0',
                                    height: '30px',
                                    width: '70px',
                                  }}
                                  onFocus={(e) => { e.currentTarget.style.borderColor = '#6366F1'; }}
                                  onBlur={(e) => { e.currentTarget.style.borderColor = '#1E2130'; }}
                                />
                                <input
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  placeholder="Buy KM"
                                  value={batch.buyPrice}
                                  onChange={(e) => updateBatch(option.id, batch.id, 'buyPrice', e.target.value)}
                                  className="rounded-md border text-sm outline-none px-2 text-right font-mono"
                                  style={{
                                    backgroundColor: '#0D0F14',
                                    borderColor: '#1E2130',
                                    color: '#E8EAF0',
                                    height: '30px',
                                    width: '100px',
                                  }}
                                  onFocus={(e) => { e.currentTarget.style.borderColor = '#6366F1'; }}
                                  onBlur={(e) => { e.currentTarget.style.borderColor = '#1E2130'; }}
                                />
                                <button
                                  onClick={() => removeBatch(option.id, batch.id)}
                                  className="flex items-center justify-center rounded-md transition-colors duration-100"
                                  style={{ width: '26px', height: '26px', color: '#5C6078' }}
                                  onMouseEnter={(e) => { e.currentTarget.style.color = '#FB7185'; e.currentTarget.style.backgroundColor = 'rgba(251,113,133,0.12)'; }}
                                  onMouseLeave={(e) => { e.currentTarget.style.color = '#5C6078'; e.currentTarget.style.backgroundColor = 'transparent'; }}
                                >
                                  <Trash2 size={13} />
                                </button>
                              </div>
                            ))}
                            <button
                              onClick={() => addBatch(option.id)}
                              className="inline-flex items-center gap-1 text-xs font-medium transition-colors duration-150"
                              style={{ color: '#6366F1' }}
                              onMouseEnter={(e) => { e.currentTarget.style.color = '#818CF8'; }}
                              onMouseLeave={(e) => { e.currentTarget.style.color = '#6366F1'; }}
                            >
                              <Plus size={12} />
                              Add batch
                            </button>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  )}

                  {errors.options && (
                    <span className={errorClass} style={errorStyle}><AlertCircle size={14} /> {errors.options}</span>
                  )}

                  {/* Total from options */}
                  {options.length > 0 && (
                    <p className="text-xs mb-3" style={{ color: '#8B8FA3' }}>
                      Total quantity from options: <span className="font-mono font-medium" style={{ color: '#E8EAF0' }}>{totalQuantity}</span>
                    </p>
                  )}

                  <button
                    onClick={addOption}
                    className="inline-flex items-center gap-2 h-8 px-3 rounded-lg text-sm font-medium transition-all duration-150"
                    style={{
                      backgroundColor: '#11131A',
                      color: '#E8EAF0',
                      border: '1px solid #1E2130',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = '#1A1D26';
                      e.currentTarget.style.borderColor = '#2E3250';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = '#11131A';
                      e.currentTarget.style.borderColor = '#1E2130';
                    }}
                  >
                    <Plus size={14} />
                    <span>Add Option</span>
                  </button>
                </motion.div>
              ) : (
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="text-sm italic py-3"
                  style={{ color: '#5C6078' }}
                >
                  No options — item has single variant
                </motion.p>
              )}
            </AnimatePresence>
          </div>
        </motion.div>

        {/* Section 4: Summary */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2, delay: 0.2, ease: [0.0, 0.0, 0.2, 1] as [number, number, number, number] }}
          className="rounded-xl p-5"
          style={{ backgroundColor: '#11131A', border: '1px solid #1E2130' }}
        >
          <h2 className="text-base font-medium mb-4" style={{ color: '#E8EAF0' }}>Summary</h2>

          <div className="grid grid-cols-2 gap-4 mb-5">
            <div>
              <p className="text-xs mb-1" style={{ color: '#5C6078' }}>Item Name</p>
              <p className="text-sm font-medium" style={{ color: '#E8EAF0' }}>{name || '—'}</p>
            </div>
            <div>
              <p className="text-xs mb-1" style={{ color: '#5C6078' }}>Category</p>
              <p className="text-sm font-medium" style={{ color: '#E8EAF0' }}>{category || '—'}</p>
            </div>
            <div>
              <p className="text-xs mb-1" style={{ color: '#5C6078' }}>Total Quantity</p>
              <p className="text-sm font-mono font-medium" style={{ color: '#E8EAF0' }}>{totalQuantity}</p>
            </div>
            <div>
              <p className="text-xs mb-1" style={{ color: '#5C6078' }}>Total Investment</p>
              <p className="text-sm font-mono font-medium" style={{ color: '#FB7185' }}>{formatCurrency(totalCost)}</p>
            </div>
            <div>
              <p className="text-xs mb-1" style={{ color: '#5C6078' }}>Expected Profit / Unit</p>
              <p className="text-sm font-mono font-medium" style={{ color: '#34D399' }}>
                {profitPerUnit >= 0 ? '+' : ''}{formatCurrency(profitPerUnit)}
              </p>
            </div>
            <div>
              <p className="text-xs mb-1" style={{ color: '#5C6078' }}>Expected Total Profit</p>
              <p className="text-sm font-mono font-semibold" style={{ color: '#34D399' }}>
                +{formatCurrency(totalProfit)}
              </p>
            </div>
          </div>
        </motion.div>
      </div>

      {/* ====== STICKY BOTTOM ACTIONS ====== */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.25, ease: [0.0, 0.0, 0.2, 1] as [number, number, number, number] }}
        className="fixed bottom-0 left-[240px] right-0 z-50 flex items-center justify-between px-8"
        style={{
          height: '64px',
          backgroundColor: '#0B0D12',
          borderTop: '1px solid #1E2130',
        }}
      >
        <button
          onClick={() => navigate('/inventory')}
          className="h-10 px-5 rounded-lg text-sm font-medium transition-all duration-150"
          style={{
            backgroundColor: '#11131A',
            color: '#E8EAF0',
            border: '1px solid #1E2130',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#1A1D26';
            e.currentTarget.style.borderColor = '#2E3250';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = '#11131A';
            e.currentTarget.style.borderColor = '#1E2130';
          }}
        >
          Cancel
        </button>

        <div className="flex items-center gap-3">
          <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="inline-flex items-center gap-2 h-10 px-5 rounded-lg text-sm font-medium transition-all duration-150"
            style={{
              backgroundColor: '#6366F1',
              color: '#0B0D12',
              opacity: isSubmitting ? 0.7 : 1,
            }}
            onMouseEnter={(e) => {
              if (!isSubmitting) {
                e.currentTarget.style.backgroundColor = '#818CF8';
                e.currentTarget.style.transform = 'translateY(-1px)';
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#6366F1';
              e.currentTarget.style.transform = 'translateY(0)';
            }}
          >
            {isSubmitting ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                <span>Adding...</span>
              </>
            ) : (
              <>
                <Package size={16} />
                <span>Add to Inventory</span>
              </>
            )}
          </button>
        </div>
      </motion.div>

      {/* Spacer for sticky bar */}
      <div style={{ height: '64px' }} />
    </div>
  );
};

export default AddItem;
