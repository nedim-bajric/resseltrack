import React, { useState, useMemo, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronLeft,
  Package,
  AlertCircle,
  Check,
  Calculator,
} from 'lucide-react';
import { Toaster, toast } from 'sonner';
import { useProducts } from '@/hooks/useProducts';
import { useOrders } from '@/hooks/useOrders';
import { formatCurrency } from '@/lib/currency';
import type { Order } from '@/types';

type FormStep = 1 | 2 | 3 | 4;

interface FormData {
  productId: string;
  optionId: string;
  quantity: string;
  sellPrice: string;
  platform: string;
  customerName: string;
  date: string;
  notes: string;
}

interface FormErrors {
  productId?: string;
  optionId?: string;
  quantity?: string;
  sellPrice?: string;
  platform?: string;
}

const PLATFORMS = ['Instagram', 'Facebook', 'TikTok', 'Other'];

/* ─── Step Indicator ─── */
const StepIndicator: React.FC<{ steps: number; current: FormStep }> = ({ steps, current }) => (
  <div className="flex items-center gap-2 mb-8 overflow-x-auto">
    {Array.from({ length: steps }, (_, i) => i + 1).map((step) => (
      <React.Fragment key={step}>
        <div
          className="flex items-center justify-center rounded-full text-xs font-bold transition-all duration-200"
          style={{
            width: '28px',
            height: '28px',
            backgroundColor:
              step < current
                ? 'rgba(52,211,153,0.12)'
                : step === current
                ? '#6366F1'
                : '#1A1D26',
            color:
              step < current ? '#34D399' : step === current ? '#0B0D12' : '#5C6078',
            border: step === current ? 'none' : '1px solid #1E2130',
          }}
        >
          {step < current ? <Check size={14} /> : step}
        </div>
        {step < steps && (
          <div
            className="transition-colors duration-200"
            style={{
              width: '24px',
              height: '2px',
              backgroundColor: step < current ? 'rgba(52,211,153,0.3)' : '#1E2130',
            }}
          />
        )}
      </React.Fragment>
    ))}
  </div>
);

/* ─── Form Label ─── */
const FormLabel: React.FC<{ children: React.ReactNode; required?: boolean }> = ({
  children,
  required,
}) => (
  <label className="block text-xs font-medium mb-1.5" style={{ color: '#8B8FA3' }}>
    {children}
    {required && <span style={{ color: '#FB7185' }}> *</span>}
  </label>
);

/* ─── Select ─── */
const Select: React.FC<React.SelectHTMLAttributes<HTMLSelectElement> & { error?: string }> = ({
  className,
  error,
  children,
  ...props
}) => (
  <div>
    <select
      className={`w-full h-10 rounded-lg border text-sm outline-none px-3 transition-all duration-150 ${
        error ? 'border-[#FB7185]' : ''
      }`}
      style={{
        backgroundColor: '#0D0F14',
        borderColor: error ? '#FB7185' : '#1E2130',
        color: '#E8EAF0',
      }}
      onFocus={(e) => {
        if (!error) {
          e.currentTarget.style.borderColor = '#6366F1';
          e.currentTarget.style.boxShadow = '0 0 0 3px rgba(99,102,241,0.15)';
        }
      }}
      onBlur={(e) => {
        e.currentTarget.style.borderColor = error ? '#FB7185' : '#1E2130';
        e.currentTarget.style.boxShadow = 'none';
      }}
      {...props}
    >
      {children}
    </select>
    {error && (
      <div className="flex items-center gap-1 mt-1">
        <AlertCircle size={12} className="text-[#FB7185]" />
        <span className="text-xs text-[#FB7185]">{error}</span>
      </div>
    )}
  </div>
);

/* ─── Input ─── */
const Input: React.FC<React.InputHTMLAttributes<HTMLInputElement> & { error?: string }> = ({
  error,
  ...props
}) => (
  <div>
    <input
      className={`w-full h-10 rounded-lg border text-sm outline-none px-3 transition-all duration-150 ${
        error ? 'border-[#FB7185]' : ''
      }`}
      style={{
        backgroundColor: '#0D0F14',
        borderColor: error ? '#FB7185' : '#1E2130',
        color: '#E8EAF0',
      }}
      onFocus={(e) => {
        if (!error) {
          e.currentTarget.style.borderColor = '#6366F1';
          e.currentTarget.style.boxShadow = '0 0 0 3px rgba(99,102,241,0.15)';
        }
      }}
      onBlur={(e) => {
        e.currentTarget.style.borderColor = error ? '#FB7185' : '#1E2130';
        e.currentTarget.style.boxShadow = 'none';
      }}
      {...props}
    />
    {error && (
      <div className="flex items-center gap-1 mt-1">
        <AlertCircle size={12} className="text-[#FB7185]" />
        <span className="text-xs text-[#FB7185]">{error}</span>
      </div>
    )}
  </div>
);

/* ─── Textarea ─── */
const Textarea: React.FC<React.TextareaHTMLAttributes<HTMLTextAreaElement>> = (props) => (
  <textarea
    className="w-full rounded-lg border text-sm outline-none p-3 transition-all duration-150 resize-none"
    style={{
      backgroundColor: '#0D0F14',
      borderColor: '#1E2130',
      color: '#E8EAF0',
      minHeight: '80px',
    }}
    onFocus={(e) => {
      e.currentTarget.style.borderColor = '#6366F1';
      e.currentTarget.style.boxShadow = '0 0 0 3px rgba(99,102,241,0.15)';
    }}
    onBlur={(e) => {
      e.currentTarget.style.borderColor = '#1E2130';
      e.currentTarget.style.boxShadow = 'none';
    }}
    {...props}
  />
);

/* ─── Main Component ─── */
const CreateOrder: React.FC = () => {
  const navigate = useNavigate();
  const { products, getProductById, sellProductQuantity } = useProducts();
  const { addOrder } = useOrders();

  const [step, setStep] = useState<FormStep>(1);
  const [errors, setErrors] = useState<FormErrors>({});
  const [form, setForm] = useState<FormData>({
    productId: '',
    optionId: '',
    quantity: '',
    sellPrice: '',
    platform: '',
    customerName: '',
    date: new Date().toISOString().split('T')[0],
    notes: '',
  });

  /* Available products — for products with options, at least one option must have stock */
  const availableProducts = useMemo(
    () =>
      products.filter((p) => {
        const aggregateAvailable = p.totalQuantity - p.totalSold > 0;
        if (!aggregateAvailable) return false;
        if (p.options.length > 0) {
          return p.options.some((o) => o.quantity - o.soldQuantity > 0);
        }
        return true;
      }),
    [products]
  );

  const selectedProduct = useMemo(
    () => (form.productId ? getProductById(form.productId) : undefined),
    [form.productId, getProductById]
  );

  const selectedOption = useMemo(
    () => selectedProduct?.options.find((o) => o.id === form.optionId),
    [selectedProduct, form.optionId]
  );

  /* Available options for the selected product */
  const availableOptions = useMemo(() => {
    if (!selectedProduct) return [];
    return selectedProduct.options.filter((o) => o.quantity - o.soldQuantity > 0);
  }, [selectedProduct]);

  /* Available quantity for selected product/option */
  const availableQuantity = useMemo(() => {
    if (!selectedProduct) return 0;
    if (selectedOption) {
      return selectedOption.quantity - selectedOption.soldQuantity;
    }
    // Product without options: use total available
    return selectedProduct.totalQuantity - selectedProduct.totalSold;
  }, [selectedProduct, selectedOption]);

  /* Buy price per unit */
  const buyPrice = selectedProduct?.buyPrice ?? 0;

  /* Form change handler */
  const updateField = useCallback(
    <K extends keyof FormData>(field: K, value: FormData[K]) => {
      setForm((prev) => ({ ...prev, [field]: value }));
      // Clear error for this field
      if (field in errors) {
        setErrors((prev) => {
          const next = { ...prev };
          delete (next as Record<string, string>)[field];
          return next;
        });
      }
    },
    [errors]
  );

  /* When product changes, reset option and quantity */
  const handleProductChange = (productId: string) => {
    setForm((prev) => ({
      ...prev,
      productId,
      optionId: '',
      quantity: '',
    }));
    setErrors((prev) => {
      const next = { ...prev };
      delete next.productId;
      delete next.optionId;
      return next;
    });
    setStep(1);
  };

  /* When option changes, reset quantity */
  const handleOptionChange = (optionId: string) => {
    setForm((prev) => ({
      ...prev,
      optionId,
      quantity: '',
    }));
    setErrors((prev) => {
      const next = { ...prev };
      delete next.optionId;
      return next;
    });
  };

  /* ─── Validation ─── */
  const validateStep1 = (): boolean => {
    if (!form.productId) {
      setErrors({ productId: 'Please select a product' });
      return false;
    }
    return true;
  };

  const validateStep2 = (): boolean => {
    const product = getProductById(form.productId);
    if (product && product.options.length > 0 && !form.optionId) {
      toast.error('Please select an option for this product');
      return false;
    }
    return true;
  };

  const validateStep3 = (): boolean => {
    const newErrors: FormErrors = {};

    if (!form.quantity || parseInt(form.quantity, 10) <= 0) {
      newErrors.quantity = 'Quantity must be greater than 0';
    } else if (parseInt(form.quantity, 10) > availableQuantity) {
      newErrors.quantity = `Maximum available is ${availableQuantity}`;
    }

    if (!form.sellPrice || parseFloat(form.sellPrice) <= 0) {
      newErrors.sellPrice = 'Sell price must be greater than 0';
    }

    if (!form.platform) {
      newErrors.platform = 'Please select a platform';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  /* ─── Navigation ─── */
  const goNext = () => {
    if (step === 1) {
      if (!validateStep1()) return;
      const product = getProductById(form.productId);
      if (product && product.options.length > 0) {
        setStep(2);
      } else {
        setStep(3);
      }
    } else if (step === 2) {
      if (!validateStep2()) return;
      setStep(3);
    } else if (step === 3) {
      if (validateStep3()) {
        setStep(4);
      }
    }
  };

  const goBack = () => {
    if (step === 4) {
      setStep(3);
    } else if (step === 3) {
      const product = getProductById(form.productId);
      if (product && product.options.length > 0) {
        setStep(2);
      } else {
        setStep(1);
      }
    } else if (step === 2) {
      setStep(1);
    }
  };

  /* ─── Submit ─── */
  const handleSubmit = async () => {
    if (!selectedProduct) return;

    const quantity = parseInt(form.quantity, 10);
    const sellPrice = parseFloat(form.sellPrice);

    // 1. Add order
    const orderData: Omit<Order, 'id' | 'createdAt' | 'totalAmount' | 'status'> = {
      productId: form.productId,
      productName: selectedProduct.name,
      optionId: form.optionId || undefined,
      optionName: selectedOption?.name || undefined,
      quantity,
      sellPrice,
      platform: form.platform,
      customerName: form.customerName || undefined,
      notes: form.notes || undefined,
      date: form.date,
    };

    const newOrder = await addOrder(orderData);
    if (!newOrder) {
      toast.error('Failed to create order');
      return;
    }

    // 2. Decrease inventory
    await sellProductQuantity(form.productId, quantity, form.optionId || undefined);

    // 3. Toast
    toast.success('Order created successfully');

    // 4. Navigate
    navigate('/orders');
  };

  /* Summary calculations */
  const quantityNum = parseInt(form.quantity, 10) || 0;
  const sellPriceNum = parseFloat(form.sellPrice) || 0;
  const totalRevenue = quantityNum * sellPriceNum;
  const totalCost = quantityNum * buyPrice;
  const profit = totalRevenue - totalCost;
  const profitMargin = totalRevenue > 0 ? (profit / totalRevenue) * 100 : 0;

  const totalSteps = selectedProduct && selectedProduct.options.length > 0 ? 4 : 3;

  return (
    <div className="max-w-[680px] mx-auto w-full">
      <Toaster theme="dark" position="top-right" />

      {/* ─── Header ─── */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
        className="mb-8"
      >
        <Link
          to="/orders"
          className="inline-flex items-center gap-1.5 text-xs font-medium mb-4 transition-colors duration-150"
          style={{ color: '#8B8FA3' }}
          onMouseEnter={(e) => { e.currentTarget.style.color = '#E8EAF0'; }}
          onMouseLeave={(e) => { e.currentTarget.style.color = '#8B8FA3'; }}
        >
          <ChevronLeft size={14} />
          Back to Orders
        </Link>
        <h1
          className="font-bold"
          style={{ fontSize: '32px', lineHeight: 1.1, letterSpacing: '-0.02em', color: '#E8EAF0' }}
        >
          New Order
        </h1>
        <p className="mt-1 text-sm" style={{ color: '#8B8FA3' }}>
          Create a new sales order from your inventory
        </p>
      </motion.div>

      {/* ─── Step Indicator ─── */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.2, delay: 0.1 }}
      >
        <StepIndicator steps={totalSteps} current={step === 4 ? totalSteps : step === 1 ? 1 : step === 2 ? 2 : 3} />
      </motion.div>

      {/* ─── Step Content ─── */}
      <AnimatePresence mode="wait">
        {/* ═════ STEP 1: Product Selection ═════ */}
        {step === 1 && (
          <motion.div
            key="step1"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
          >
            <div
              className="rounded-xl border p-6"
              style={{ backgroundColor: '#11131A', borderColor: '#1E2130' }}
            >
              <h2 className="text-base font-semibold mb-1" style={{ color: '#E8EAF0' }}>
                Select Product
              </h2>
              <p className="text-sm mb-5" style={{ color: '#8B8FA3' }}>
                Choose a product from your inventory that you want to sell.
              </p>

              <FormLabel required>Product</FormLabel>
              <Select
                value={form.productId}
                onChange={(e) => handleProductChange(e.target.value)}
                error={errors.productId}
              >
                <option value="">Select a product...</option>
                {availableProducts.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} — {formatCurrency(p.buyPrice)} buy — {p.totalQuantity - p.totalSold} available
                  </option>
                ))}
              </Select>

              {/* Product details preview */}
              <AnimatePresence>
                {selectedProduct && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.2 }}
                    className="mt-4 rounded-lg border overflow-hidden"
                    style={{ backgroundColor: '#0D0F14', borderColor: '#1E2130' }}
                  >
                    <div className="flex items-center gap-3 p-3">
                      <div
                        className="flex items-center justify-center rounded-lg"
                        style={{ width: '40px', height: '40px', backgroundColor: '#1A1D26' }}
                      >
                        <Package size={18} className="text-[#6366F1]" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium" style={{ color: '#E8EAF0' }}>
                          {selectedProduct.name}
                        </p>
                        <p className="text-xs" style={{ color: '#5C6078' }}>
                          {selectedProduct.category} · Buy: {formatCurrency(selectedProduct.buyPrice)} · Available: {selectedProduct.totalQuantity - selectedProduct.totalSold}
                        </p>
                      </div>
                      {selectedProduct.options.length > 0 && (
                        <span
                          className="text-[11px] px-2 py-0.5 rounded-md font-medium"
                          style={{ backgroundColor: 'rgba(99,102,241,0.12)', color: '#6366F1' }}
                        >
                          {selectedProduct.options.length} options
                        </span>
                      )}
                    </div>

                    {/* Options list */}
                    {selectedProduct.options.length > 0 && (
                      <div
                        className="border-t px-3 py-2"
                        style={{ borderColor: '#1E2130' }}
                      >
                        <p className="text-[11px] font-medium uppercase tracking-wider mb-1.5" style={{ color: '#5C6078' }}>
                          Available options
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {selectedProduct.options
                            .filter((o) => o.quantity - o.soldQuantity > 0)
                            .map((o) => (
                              <span
                                key={o.id}
                                className="inline-flex items-center px-2 py-0.5 rounded-[5px] text-[11px]"
                                style={{
                                  backgroundColor: '#1A1D26',
                                  color: '#8B8FA3',
                                  border: '1px solid #1E2130',
                                }}
                              >
                                {o.name} ({o.quantity - o.soldQuantity})
                              </span>
                            ))}
                        </div>
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <div className="flex justify-end mt-6">
              <button
                onClick={goNext}
                className="inline-flex items-center gap-2 h-10 px-6 rounded-lg text-sm font-medium transition-all duration-150"
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
                Next
                <ChevronLeft size={14} className="rotate-180" />
              </button>
            </div>
          </motion.div>
        )}

        {/* ═════ STEP 2: Option Selection ═════ */}
        {step === 2 && selectedProduct && selectedProduct.options.length > 0 && (
          <motion.div
            key="step2"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
          >
            <div
              className="rounded-xl border p-6"
              style={{ backgroundColor: '#11131A', borderColor: '#1E2130' }}
            >
              <h2 className="text-base font-semibold mb-1" style={{ color: '#E8EAF0' }}>
                Select Option
              </h2>
              <p className="text-sm mb-5" style={{ color: '#8B8FA3' }}>
                Choose a variant for <strong style={{ color: '#E8EAF0' }}>{selectedProduct.name}</strong>
              </p>

              {availableOptions.length === 0 ? (
                <div className="rounded-lg p-4 border" style={{ backgroundColor: '#0D0F14', borderColor: '#1E2130' }}>
                  <p className="text-sm" style={{ color: '#FB7185' }}>
                    All variants of this product are sold out.
                  </p>
                </div>
              ) : (
                <>
                  <FormLabel required>Option</FormLabel>
                  <Select
                    value={form.optionId}
                    onChange={(e) => handleOptionChange(e.target.value)}
                    error={errors.optionId}
                  >
                    <option value="">Select an option...</option>
                    {availableOptions.map((o) => (
                      <option key={o.id} value={o.id}>
                        {o.name} — {o.quantity - o.soldQuantity} available
                      </option>
                    ))}
                  </Select>

                  {/* Selected option preview */}
                  {selectedOption && (
                    <motion.div
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="mt-4 rounded-lg p-3 border"
                      style={{ backgroundColor: '#0D0F14', borderColor: '#1E2130' }}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium" style={{ color: '#E8EAF0' }}>
                            {selectedOption.name}
                          </p>
                          <p className="text-xs" style={{ color: '#8B8FA3' }}>
                            Available: {selectedOption.quantity - selectedOption.soldQuantity}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-mono" style={{ color: '#5C6078' }}>
                            Buy price
                          </p>
                          <p className="text-sm font-mono" style={{ color: '#E8EAF0' }}>
                            {formatCurrency(buyPrice)}
                          </p>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </>
              )}
            </div>

            <div className="flex justify-between mt-6">
              <button
                onClick={goBack}
                className="inline-flex items-center gap-1.5 h-10 px-5 rounded-lg text-sm font-medium transition-all duration-150"
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
                <ChevronLeft size={14} />
                Back
              </button>
              <button
                onClick={goNext}
                disabled={availableOptions.length === 0}
                className="inline-flex items-center gap-2 h-10 px-6 rounded-lg text-sm font-medium transition-all duration-150"
                style={{
                  backgroundColor: availableOptions.length === 0 ? '#1A1D26' : '#6366F1',
                  color: availableOptions.length === 0 ? '#5C6078' : '#0B0D12',
                }}
                onMouseEnter={(e) => {
                  if (availableOptions.length > 0) {
                    (e.currentTarget as HTMLElement).style.backgroundColor = '#818CF8';
                    (e.currentTarget as HTMLElement).style.transform = 'translateY(-1px)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (availableOptions.length > 0) {
                    (e.currentTarget as HTMLElement).style.backgroundColor = '#6366F1';
                    (e.currentTarget as HTMLElement).style.transform = 'translateY(0)';
                  }
                }}
              >
                Next
                <ChevronLeft size={14} className="rotate-180" />
              </button>
            </div>
          </motion.div>
        )}

        {/* ═════ STEP 3: Order Details ═════ */}
        {step === 3 && (
          <motion.div
            key="step3"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
          >
            <div
              className="rounded-xl border p-6"
              style={{ backgroundColor: '#11131A', borderColor: '#1E2130' }}
            >
              <h2 className="text-base font-semibold mb-1" style={{ color: '#E8EAF0' }}>
                Order Details
              </h2>
              <p className="text-sm mb-5" style={{ color: '#8B8FA3' }}>
                {selectedProduct?.name}
                {selectedOption ? ` — ${selectedOption.name}` : ''}
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                {/* Quantity */}
                <div>
                  <FormLabel required>
                    Quantity
                    <span className="font-normal" style={{ color: '#5C6078' }}>
                      {' '}
                      (max {availableQuantity})
                    </span>
                  </FormLabel>
                  <Input
                    type="number"
                    min={1}
                    max={availableQuantity}
                    value={form.quantity}
                    onChange={(e) => updateField('quantity', e.target.value)}
                    error={errors.quantity}
                    placeholder="1"
                  />
                </div>

                {/* Sell Price */}
                <div>
                  <FormLabel required>Sell Price (KM)</FormLabel>
                  <Input
                    type="number"
                    min={0.01}
                    step={0.01}
                    value={form.sellPrice}
                    onChange={(e) => updateField('sellPrice', e.target.value)}
                    error={errors.sellPrice}
                    placeholder="0.00"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                {/* Platform */}
                <div>
                  <FormLabel required>Platform</FormLabel>
                  <Select
                    value={form.platform}
                    onChange={(e) => updateField('platform', e.target.value)}
                    error={errors.platform}
                  >
                    <option value="">Select platform...</option>
                    {PLATFORMS.map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </Select>
                </div>

                {/* Date */}
                <div>
                  <FormLabel required>Date</FormLabel>
                  <Input
                    type="date"
                    value={form.date}
                    onChange={(e) => updateField('date', e.target.value)}
                  />
                </div>
              </div>

              {/* Customer Name */}
              <div className="mb-4">
                <FormLabel>Customer Name (optional)</FormLabel>
                <Input
                  type="text"
                  value={form.customerName}
                  onChange={(e) => updateField('customerName', e.target.value)}
                  placeholder="Enter customer name..."
                />
              </div>

              {/* Notes */}
              <div>
                <FormLabel>Notes (optional)</FormLabel>
                <Textarea
                  value={form.notes}
                  onChange={(e) => updateField('notes', e.target.value)}
                  placeholder="Add any notes..."
                />
              </div>
            </div>

            <div className="flex justify-between mt-6">
              <button
                onClick={goBack}
                className="inline-flex items-center gap-1.5 h-10 px-5 rounded-lg text-sm font-medium transition-all duration-150"
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
                <ChevronLeft size={14} />
                Back
              </button>
              <button
                onClick={goNext}
                className="inline-flex items-center gap-2 h-10 px-6 rounded-lg text-sm font-medium transition-all duration-150"
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
                <Calculator size={14} />
                Review Order
              </button>
            </div>
          </motion.div>
        )}

        {/* ═════ STEP 4: Summary ═════ */}
        {step === 4 && (
          <motion.div
            key="step4"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
          >
            <div
              className="rounded-xl border p-6"
              style={{ backgroundColor: '#11131A', borderColor: '#1E2130' }}
            >
              <h2 className="text-base font-semibold mb-1" style={{ color: '#E8EAF0' }}>
                Order Summary
              </h2>
              <p className="text-sm mb-5" style={{ color: '#8B8FA3' }}>
                Review the details before creating the order
              </p>

              {/* Summary Card */}
              <div
                className="rounded-lg border overflow-hidden"
                style={{ backgroundColor: '#0D0F14', borderColor: '#1E2130' }}
              >
                {/* Product header */}
                <div className="p-4 border-b" style={{ borderColor: '#1E2130' }}>
                  <div className="flex items-center gap-3">
                    <div
                      className="flex items-center justify-center rounded-lg"
                      style={{ width: '40px', height: '40px', backgroundColor: '#1A1D26' }}
                    >
                      <Package size={18} className="text-[#6366F1]" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold" style={{ color: '#E8EAF0' }}>
                        {selectedProduct?.name}
                      </p>
                      {selectedOption && (
                        <p className="text-xs" style={{ color: '#8B8FA3' }}>
                          {selectedOption.name}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Details grid */}
                <div className="p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm" style={{ color: '#8B8FA3' }}>Quantity</span>
                    <span className="text-sm font-mono font-medium" style={{ color: '#E8EAF0' }}>
                      {quantityNum}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm" style={{ color: '#8B8FA3' }}>Sell Price</span>
                    <span className="text-sm font-mono font-medium" style={{ color: '#E8EAF0' }}>
                      {formatCurrency(sellPriceNum)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm" style={{ color: '#8B8FA3' }}>Platform</span>
                    <PlatformBadge platform={form.platform} />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm" style={{ color: '#8B8FA3' }}>Date</span>
                    <span className="text-sm" style={{ color: '#E8EAF0' }}>
                      {new Date(form.date).toLocaleDateString('bs-BA', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                      })}
                    </span>
                  </div>
                  {form.customerName && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm" style={{ color: '#8B8FA3' }}>Customer</span>
                      <span className="text-sm" style={{ color: '#E8EAF0' }}>{form.customerName}</span>
                    </div>
                  )}
                </div>

                {/* Divider */}
                <div className="border-t" style={{ borderColor: '#1E2130' }} />

                {/* Totals */}
                <div className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm" style={{ color: '#8B8FA3' }}>Total Revenue</span>
                    <span className="text-base font-semibold font-mono" style={{ color: '#E8EAF0' }}>
                      {formatCurrency(totalRevenue)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm" style={{ color: '#8B8FA3' }}>Total Cost</span>
                    <span className="text-sm font-mono" style={{ color: '#FB7185' }}>
                      {formatCurrency(totalCost)}
                    </span>
                  </div>
                  <div
                    className="flex items-center justify-between pt-2 mt-2 border-t"
                    style={{ borderColor: '#1E2130' }}
                  >
                    <span className="text-sm font-medium" style={{ color: '#34D399' }}>
                      Your Profit
                    </span>
                    <span className="text-lg font-bold font-mono" style={{ color: '#34D399' }}>
                      {formatCurrency(profit)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-xs" style={{ color: '#5C6078' }}>Profit Margin</span>
                    <span className="text-xs font-mono font-medium" style={{ color: '#34D399' }}>
                      {profitMargin.toFixed(1)}%
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-between mt-6">
              <button
                onClick={goBack}
                className="inline-flex items-center gap-1.5 h-10 px-5 rounded-lg text-sm font-medium transition-all duration-150"
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
                <ChevronLeft size={14} />
                Back
              </button>
              <button
                onClick={handleSubmit}
                className="inline-flex items-center gap-2 h-10 px-6 rounded-lg text-sm font-medium transition-all duration-150"
                style={{ backgroundColor: '#34D399', color: '#0B0D12' }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.backgroundColor = '#4ADE80';
                  (e.currentTarget as HTMLElement).style.transform = 'translateY(-1px)';
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.backgroundColor = '#34D399';
                  (e.currentTarget as HTMLElement).style.transform = 'translateY(0)';
                }}
              >
                <Check size={16} />
                Create Order
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
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

export default CreateOrder;
