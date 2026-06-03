import React, { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  Pencil,
  ShoppingBag,
  MoreVertical,
  Copy,
  Trash2,
  AlertTriangle,
  Layers,
  ShoppingCart,
  Tag,
  TrendingUp,
  Package,
  Plus,
  Check,
} from 'lucide-react';
import { Toaster, toast } from 'sonner';
import { useProducts } from '@/hooks/useProducts';
import { StatusBadge } from '@/components/StatusBadge';
import { formatCurrency } from '@/lib/currency';
import type { Product, ProductOption } from '@/types';
const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

/* ------------------------------------------------------------------ */
/*  Inventory Detail Page                                             */
/* ------------------------------------------------------------------ */

const InventoryDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { products, updateProduct, deleteProduct } = useProducts();

  const product = useMemo(() => products.find((p) => p.id === id), [products, id]);

  /* -- Edit mode state -- */
  const [editMode, setEditMode] = useState(false);
  const [editName, setEditName] = useState('');
  const [editBuyPrice, setEditBuyPrice] = useState('');
  const [editOriginalPrice, setEditOriginalPrice] = useState('');
  const [editTargetPrice, setEditTargetPrice] = useState('');
  const [editSoldPrice, setEditSoldPrice] = useState('');
  const [editStatus, setEditStatus] = useState<Product['status']>('in_stock');
  const [editNotes, setEditNotes] = useState('');
  const [editOptions, setEditOptions] = useState<ProductOption[]>([]);

  /* -- Delete dialog -- */
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  /* -- More menu -- */
  const [showMoreMenu, setShowMoreMenu] = useState(false);

  /* -- Add variant inline form -- */
  const [showAddVariant, setShowAddVariant] = useState(false);
  const [newVariant, setNewVariant] = useState({ color: '', size: '', quantity: 1 });

  /* -- Enter edit mode -- */
  const enterEditMode = () => {
    if (!product) return;
    setEditName(product.name);
    setEditBuyPrice(String(product.buyPrice));
    setEditOriginalPrice(product.originalPrice ? String(product.originalPrice) : '');
    setEditTargetPrice(String(product.targetPrice));
    setEditSoldPrice(product.soldPrice ? String(product.soldPrice) : '');
    setEditStatus(product.status);
    setEditNotes(product.notes || '');
    setEditOptions(product.options.map((o) => ({ ...o })));
    setEditMode(true);
  };

  /* -- Save edits -- */
  const saveEdits = async () => {
    if (!product || !id) return;

    const buyPriceNum = parseFloat(editBuyPrice) || product.buyPrice;
    const originalPriceNum = editOriginalPrice ? parseFloat(editOriginalPrice) : undefined;
    const targetPriceNum = parseFloat(editTargetPrice) || product.targetPrice;
    const soldPriceNum = editSoldPrice ? parseFloat(editSoldPrice) : undefined;

    const totalQty = editOptions.reduce((sum, o) => sum + o.quantity, 0);
    const totalSold = editOptions.reduce((sum, o) => sum + o.soldQuantity, 0);

    await updateProduct(id, {
      name: editName.trim() || product.name,
      buyPrice: buyPriceNum,
      originalPrice: originalPriceNum,
      targetPrice: targetPriceNum,
      soldPrice: soldPriceNum,
      status: editStatus,
      notes: editNotes.trim() || undefined,
      options: editOptions,
      totalQuantity: totalQty,
      totalSold: totalSold,
    });

    toast.success('Item updated successfully');
    setEditMode(false);
  };

  /* -- Cancel edits -- */
  const cancelEdits = () => {
    setEditMode(false);
  };

  /* -- Delete -- */
  const handleDelete = async () => {
    if (!id) return;
    await deleteProduct(id);
    toast.success('Item deleted');
    navigate('/inventory');
  };

  /* -- Update option quantity inline -- */
  const updateOptionQty = (optionId: string, newQty: number) => {
    if (!editMode) return;
    setEditOptions((prev) =>
      prev.map((o) => (o.id === optionId ? { ...o, quantity: Math.max(0, newQty) } : o))
    );
  };

  /* -- Update option sold inline -- */
  const updateOptionSold = (optionId: string, newSold: number) => {
    if (!editMode) return;
    setEditOptions((prev) =>
      prev.map((o) => (o.id === optionId ? { ...o, soldQuantity: Math.max(0, Math.min(newSold, o.quantity)) } : o))
    );
  };

  /* -- Add variant -- */
  const handleAddVariant = async () => {
    if (!product || !id) return;
    const variant: ProductOption = {
      id: `opt-${Date.now()}`,
      name: `${newVariant.color || ''} ${newVariant.size || ''}`.trim() || 'Default',
      color: newVariant.color || undefined,
      size: newVariant.size || undefined,
      quantity: newVariant.quantity,
      soldQuantity: 0,
    };
    const newOptions = [...product.options, variant];
    const totalQty = newOptions.reduce((sum, o) => sum + o.quantity, 0);
    await updateProduct(id, {
      options: newOptions,
      totalQuantity: totalQty,
    });
    toast.success('Variant added');
    setShowAddVariant(false);
    setNewVariant({ color: '', size: '', quantity: 1 });
  };

  /* -- Delete variant: handled inline via updateProduct -- */

  /* -- Duplicate item -- */
  const duplicateItem = () => {
    if (!product) return;
    // Handled via useProducts which is not exposed, just show toast
    toast.info('Duplicate feature coming soon');
    setShowMoreMenu(false);
  };

  /* -- Computed values for display -- */
  const displayOptions = editMode ? editOptions : (product?.options || []);

  const profitPerUnit = product ? (product.soldPrice || product.targetPrice) - product.buyPrice : 0;
  const marginPercent = product && product.buyPrice > 0 ? (profitPerUnit / product.buyPrice) * 100 : 0;
  const discountPercent = product && product.originalPrice && product.originalPrice > 0
    ? ((product.originalPrice - product.targetPrice) / product.originalPrice) * 100
    : 0;
  const totalCost = product ? product.buyPrice * product.totalQuantity : 0;
  const totalRevenue = product ? (product.soldPrice || product.targetPrice) * product.totalSold : 0;
  const potentialRevenue = product ? product.targetPrice * (product.totalQuantity - product.totalSold) : 0;
  const totalPotentialProfit = product ? profitPerUnit * product.totalQuantity : 0;

  /* -- Price history timeline data -- */
  const timelineItems = useMemo(() => {
    if (!product) return [];
    const items: { type: 'gray' | 'green' | 'red'; title: string; date: string }[] = [
      {
        type: 'gray',
        title: `Item added — Buy price ${formatCurrency(product.buyPrice)}, Target ${formatCurrency(product.targetPrice)}`,
        date: formatDate(product.createdAt),
      },
    ];
    if (product.soldPrice && product.totalSold > 0) {
      items.push({
        type: 'green',
        title: `First sale — 1 unit at ${formatCurrency(product.soldPrice)}`,
        date: formatDate(product.updatedAt),
      });
    }
    if (product.status === 'sold_out') {
      items.push({
        type: 'green',
        title: `All ${product.totalQuantity} units sold out`,
        date: formatDate(product.updatedAt),
      });
    }
    return items;
  }, [product]);

  /* -- Not found state -- */
  if (!product) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <div
          className="flex items-center justify-center mb-4"
          style={{
            width: '80px',
            height: '80px',
            borderRadius: '50%',
            backgroundColor: '#1A1D26',
          }}
        >
          <Package size={48} className="text-[#5C6078]" />
        </div>
        <p className="text-base font-medium mb-1" style={{ color: '#E8EAF0' }}>Item not found</p>
        <p className="text-sm mb-5" style={{ color: '#8B8FA3' }}>This item may have been deleted.</p>
        <button
          onClick={() => navigate('/inventory')}
          className="inline-flex items-center gap-2 h-9 px-5 rounded-lg text-sm font-medium transition-all duration-150"
          style={{ backgroundColor: '#6366F1', color: '#0B0D12' }}
          onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#818CF8'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#6366F1'; e.currentTarget.style.transform = 'translateY(0)'; }}
        >
          <ArrowLeft size={16} />
          <span>Back to Inventory</span>
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Toaster theme="dark" position="top-right" />

      {/* ====== PAGE HEADER ====== */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.2 }}
        className="flex items-center justify-between"
        style={{ minHeight: '56px' }}
      >
        {/* Left: Back + Title + Status */}
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

          {editMode ? (
            <input
              type="text"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              className="rounded-lg border text-xl font-bold outline-none px-3"
              style={{
                backgroundColor: '#0D0F14',
                borderColor: '#6366F1',
                color: '#E8EAF0',
                height: '44px',
                letterSpacing: '-0.02em',
                boxShadow: '0 0 0 3px rgba(99,102,241,0.15)',
              }}
            />
          ) : (
            <>
              <motion.h1
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.15, delay: 0.05 }}
                className="font-bold"
                style={{ fontSize: '28px', lineHeight: 1.1, letterSpacing: '-0.02em', color: '#E8EAF0' }}
              >
                {product.name}
              </motion.h1>
              <StatusBadge status={product.status} />
            </>
          )}
        </div>

        {/* Right: Actions */}
        <motion.div
          initial={{ x: 8, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ duration: 0.2, delay: 0.05 }}
          className="flex items-center gap-3"
        >
          {editMode ? (
            <>
              <button
                onClick={cancelEdits}
                className="h-9 px-4 rounded-lg text-sm font-medium transition-all duration-150"
                style={{
                  backgroundColor: '#11131A',
                  color: '#E8EAF0',
                  border: '1px solid #1E2130',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#1A1D26'; e.currentTarget.style.borderColor = '#2E3250'; }}
                onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#11131A'; e.currentTarget.style.borderColor = '#1E2130'; }}
              >
                Cancel
              </button>
              <button
                onClick={saveEdits}
                className="inline-flex items-center gap-2 h-9 px-4 rounded-lg text-sm font-medium transition-all duration-150"
                style={{ backgroundColor: '#6366F1', color: '#0B0D12' }}
                onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#818CF8'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#6366F1'; e.currentTarget.style.transform = 'translateY(0)'; }}
              >
                <Check size={16} />
                <span>Save</span>
              </button>
            </>
          ) : (
            <>
              <button
                onClick={enterEditMode}
                className="inline-flex items-center gap-2 h-9 px-4 rounded-lg text-sm font-medium transition-all duration-150"
                style={{
                  backgroundColor: '#11131A',
                  color: '#E8EAF0',
                  border: '1px solid #1E2130',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#1A1D26'; e.currentTarget.style.borderColor = '#2E3250'; }}
                onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#11131A'; e.currentTarget.style.borderColor = '#1E2130'; }}
              >
                <Pencil size={14} />
                <span>Edit</span>
              </button>
              {product.status !== 'sold_out' && (
                <button
                  onClick={() => {
                    if (id) {
                      updateProduct(id, { status: 'sold_out' });
                      toast.success('Marked as sold out');
                    }
                  }}
                  className="inline-flex items-center gap-2 h-9 px-4 rounded-lg text-sm font-medium transition-all duration-150"
                  style={{ backgroundColor: '#6366F1', color: '#0B0D12' }}
                  onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#818CF8'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#6366F1'; e.currentTarget.style.transform = 'translateY(0)'; }}
                >
                  <ShoppingBag size={14} />
                  <span>Mark as Sold</span>
                </button>
              )}
              {/* More menu */}
              <div className="relative">
                <button
                  onClick={() => setShowMoreMenu(!showMoreMenu)}
                  className="flex items-center justify-center rounded-lg transition-colors duration-150"
                  style={{ width: '36px', height: '36px', backgroundColor: '#11131A', border: '1px solid #1E2130', color: '#E8EAF0' }}
                  onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#1A1D26'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#11131A'; }}
                >
                  <MoreVertical size={18} />
                </button>
                <AnimatePresence>
                  {showMoreMenu && (
                    <>
                      <div className="fixed inset-0 z-10" onClick={() => setShowMoreMenu(false)} />
                      <motion.div
                        initial={{ opacity: 0, scaleY: 0.95 }}
                        animate={{ opacity: 1, scaleY: 1 }}
                        exit={{ opacity: 0, scaleY: 0.95 }}
                        transition={{ duration: 0.15 }}
                        className="absolute right-0 top-10 z-20 rounded-lg border py-1 origin-top"
                        style={{
                          width: '160px',
                          backgroundColor: '#11131A',
                          borderColor: '#1E2130',
                          boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
                        }}
                      >
                        <button
                          onClick={() => { duplicateItem(); setShowMoreMenu(false); }}
                          className="flex items-center gap-2 w-full px-3 py-2 text-sm transition-colors duration-100"
                          style={{ color: '#E8EAF0' }}
                          onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#1A1D26'; }}
                          onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
                        >
                          <Copy size={14} />
                          Duplicate Item
                        </button>
                        <button
                          onClick={() => { setShowDeleteDialog(true); setShowMoreMenu(false); }}
                          className="flex items-center gap-2 w-full px-3 py-2 text-sm transition-colors duration-100"
                          style={{ color: '#FB7185' }}
                          onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'rgba(251,113,133,0.12)'; }}
                          onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
                        >
                          <Trash2 size={14} />
                          Delete Item
                        </button>
                      </motion.div>
                    </>
                  )}
                </AnimatePresence>
              </div>
            </>
          )}
        </motion.div>
      </motion.div>

      {/* ====== OVERVIEW CARDS ====== */}
      <div className="grid grid-cols-5 gap-4">
        {[
          {
            label: 'Total Quantity',
            value: String(editMode ? editOptions.reduce((s, o) => s + o.quantity, 0) : product.totalQuantity),
            sub: 'across all variants',
            icon: <Layers size={20} className="text-[#38BDF8]" />,
            iconBg: 'rgba(56,189,248,0.12)',
          },
          {
            label: 'Buy Price',
            value: formatCurrency(editMode ? (parseFloat(editBuyPrice) || 0) : product.buyPrice),
            sub: `per unit on ${product.source}`,
            icon: <ShoppingCart size={20} className="text-[#FB7185]" />,
            iconBg: 'rgba(251,113,133,0.12)',
          },
          {
            label: 'Original Price',
            value: formatCurrency(editMode ? (parseFloat(editOriginalPrice) || 0) : (product.originalPrice || product.targetPrice)),
            sub: product.originalPrice && product.originalPrice > product.targetPrice
              ? `${discountPercent.toFixed(0)}% discount`
              : 'per unit',
            icon: <Tag size={20} className="text-[#818CF8]" />,
            iconBg: 'rgba(99,102,241,0.12)',
          },
          {
            label: 'Target Resell Price',
            value: formatCurrency(editMode ? (parseFloat(editTargetPrice) || 0) : product.targetPrice),
            sub: 'discounted price',
            icon: <Tag size={20} className="text-[#6366F1]" />,
            iconBg: 'rgba(99,102,241,0.12)',
          },
          {
            label: 'Profit per Unit',
            value: `${profitPerUnit >= 0 ? '+' : ''}${formatCurrency(profitPerUnit)}`,
            sub: `${marginPercent.toFixed(0)}% margin`,
            icon: <TrendingUp size={20} className="text-[#34D399]" />,
            iconBg: 'rgba(52,211,153,0.12)',
            valueColor: profitPerUnit >= 0 ? '#34D399' : '#FB7185',
          },
        ].map((card, i) => (
          <motion.div
            key={card.label}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              duration: 0.25,
              delay: 0.07 * i,
              ease: [0.0, 0.0, 0.2, 1] as [number, number, number, number],
            }}
            className="rounded-xl p-5 transition-all duration-200"
            style={{
              backgroundColor: '#11131A',
              border: '1px solid #1E2130',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#2E3250'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#1E2130'; e.currentTarget.style.transform = 'translateY(0)'; }}
          >
            <div className="flex items-start justify-between mb-3">
              <span className="text-xs font-medium uppercase tracking-wider" style={{ color: '#5C6078' }}>{card.label}</span>
              <div
                className="flex items-center justify-center rounded-full"
                style={{ width: '32px', height: '32px', backgroundColor: card.iconBg }}
              >
                {card.icon}
              </div>
            </div>
            <p
              className="font-mono font-semibold text-2xl mb-1"
              style={{ color: (card as Record<string, unknown>).valueColor as string || '#E8EAF0', letterSpacing: '-0.02em' }}
            >
              {card.value}
            </p>
            <p className="text-xs" style={{ color: '#5C6078' }}>{card.sub}</p>
          </motion.div>
        ))}
      </div>

      {/* ====== OPTIONS MATRIX TABLE ====== */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.25, ease: [0.0, 0.0, 0.2, 1] as [number, number, number, number] }}
        className="rounded-xl overflow-hidden"
        style={{ backgroundColor: '#11131A', border: '1px solid #1E2130' }}
      >
        {/* Card Header */}
        <div className="flex items-center justify-between px-5" style={{ height: '48px', borderBottom: '1px solid #1E2130' }}>
          <h2 className="text-base font-medium" style={{ color: '#E8EAF0' }}>Inventory Breakdown</h2>
          <button
            onClick={() => setShowAddVariant(true)}
            className="text-xs font-medium transition-colors duration-150"
            style={{ color: '#6366F1' }}
            onMouseEnter={(e) => { e.currentTarget.style.color = '#818CF8'; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = '#6366F1'; }}
          >
            + Add Variant
          </button>
        </div>

        {/* Table */}
        {displayOptions.length > 0 ? (
          <div>
            {/* Table Header */}
            <div className="flex items-center px-4" style={{ height: '36px', backgroundColor: '#090A10' }}>
              <span className="text-xs font-medium uppercase tracking-wider" style={{ color: '#5C6078', flex: '0 0 100px' }}>Color</span>
              <span className="text-xs font-medium uppercase tracking-wider" style={{ color: '#5C6078', flex: '0 0 80px' }}>Size</span>
              <span className="text-xs font-medium uppercase tracking-wider text-right" style={{ color: '#5C6078', flex: '0 0 80px' }}>Qty</span>
              <span className="text-xs font-medium uppercase tracking-wider text-right" style={{ color: '#5C6078', flex: '0 0 100px' }}>Buy KM</span>
              <span className="text-xs font-medium uppercase tracking-wider text-right" style={{ color: '#5C6078', flex: '0 0 100px' }}>Target KM</span>
              <span className="text-xs font-medium uppercase tracking-wider text-center" style={{ color: '#5C6078', flex: '0 0 80px' }}>Sold</span>
              <span className="text-xs font-medium uppercase tracking-wider text-center" style={{ color: '#5C6078', flex: '0 0 80px' }}>Remaining</span>
              {editMode && (
                <span className="text-xs font-medium uppercase tracking-wider text-center" style={{ color: '#5C6078', flex: '0 0 60px' }}>Actions</span>
              )}
            </div>

            {/* Rows */}
            {displayOptions.map((option, idx) => {
              const remaining = option.quantity - option.soldQuantity;
              return (
                <motion.div
                  key={option.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{
                    duration: 0.12,
                    delay: idx * 0.025,
                    ease: [0.0, 0.0, 0.2, 1] as [number, number, number, number],
                  }}
                  className="flex items-center px-4 transition-colors duration-100"
                  style={{
                    height: '44px',
                    borderBottom: idx < displayOptions.length - 1 ? '1px solid #1E2130' : undefined,
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#1A1D26'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
                >
                  {/* Color */}
                  <div className="flex items-center gap-2" style={{ flex: '0 0 100px' }}>
                    {option.color ? (
                      <>
                        <span
                          className="inline-block rounded-full flex-shrink-0"
                          style={{
                            width: '14px',
                            height: '14px',
                            backgroundColor: option.color.toLowerCase() === 'white' ? '#f0f0f0' : option.color.toLowerCase(),
                            border: option.color.toLowerCase() === 'white' ? '1px solid #1E2130' : 'none',
                          }}
                        />
                        <span className="text-sm truncate" style={{ color: '#E8EAF0' }}>{option.color}</span>
                      </>
                    ) : (
                      <span className="text-sm" style={{ color: '#5C6078' }}>—</span>
                    )}
                  </div>

                  {/* Size */}
                  <span className="text-sm" style={{ color: '#E8EAF0', flex: '0 0 80px' }}>
                    {option.size || '—'}
                  </span>

                  {/* Quantity */}
                  <div style={{ flex: '0 0 80px' }} className="text-right">
                    {editMode ? (
                      <input
                        type="number"
                        min="0"
                        value={option.quantity}
                        onChange={(e) => updateOptionQty(option.id, parseInt(e.target.value) || 0)}
                        className="rounded-md border text-sm outline-none px-2 text-right font-mono"
                        style={{
                          backgroundColor: '#0D0F14',
                          borderColor: '#1E2130',
                          color: '#E8EAF0',
                          height: '30px',
                          width: '60px',
                        }}
                        onFocus={(e) => { e.currentTarget.style.borderColor = '#6366F1'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(99,102,241,0.15)'; }}
                        onBlur={(e) => { e.currentTarget.style.borderColor = '#1E2130'; e.currentTarget.style.boxShadow = 'none'; }}
                      />
                    ) : (
                      <span className="text-sm font-mono" style={{ color: '#E8EAF0' }}>{option.quantity}</span>
                    )}
                  </div>

                  {/* Buy Price */}
                  <span className="text-sm font-mono text-right" style={{ color: '#8B8FA3', flex: '0 0 100px' }}>
                    {formatCurrency(editMode ? (parseFloat(editBuyPrice) || 0) : product.buyPrice)}/unit
                  </span>

                  {/* Target Price */}
                  <span className="text-sm font-mono text-right" style={{ color: '#E8EAF0', flex: '0 0 100px' }}>
                    {formatCurrency(editMode ? (parseFloat(editTargetPrice) || 0) : product.targetPrice)}/unit
                  </span>

                  {/* Sold */}
                  <div style={{ flex: '0 0 80px' }} className="text-center">
                    {editMode ? (
                      <input
                        type="number"
                        min="0"
                        max={option.quantity}
                        value={option.soldQuantity}
                        onChange={(e) => updateOptionSold(option.id, parseInt(e.target.value) || 0)}
                        className="rounded-md border text-sm outline-none px-2 text-center font-mono"
                        style={{
                          backgroundColor: '#0D0F14',
                          borderColor: '#1E2130',
                          color: '#E8EAF0',
                          height: '30px',
                          width: '50px',
                        }}
                        onFocus={(e) => { e.currentTarget.style.borderColor = '#6366F1'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(99,102,241,0.15)'; }}
                        onBlur={(e) => { e.currentTarget.style.borderColor = '#1E2130'; e.currentTarget.style.boxShadow = 'none'; }}
                      />
                    ) : (
                      <span className="text-sm font-mono" style={{ color: '#8B8FA3' }}>{option.soldQuantity}</span>
                    )}
                  </div>

                  {/* Remaining */}
                  <span className="text-sm font-mono text-center" style={{
                    color: remaining === 0 ? '#34D399' : '#FBBF24',
                    flex: '0 0 80px',
                  }}>
                    {remaining}
                  </span>

                  {/* Actions */}
                  {editMode && (
                    <div style={{ flex: '0 0 60px' }} className="flex items-center justify-center">
                      <button
                        onClick={() => setEditOptions((prev) => prev.filter((o) => o.id !== option.id))}
                        className="flex items-center justify-center rounded-md transition-colors duration-100"
                        style={{ width: '28px', height: '28px', color: '#5C6078' }}
                        onMouseEnter={(e) => { e.currentTarget.style.color = '#FB7185'; e.currentTarget.style.backgroundColor = 'rgba(251,113,133,0.12)'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.color = '#5C6078'; e.currentTarget.style.backgroundColor = 'transparent'; }}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  )}
                </motion.div>
              );
            })}

            {/* Add Variant Inline Form */}
            <AnimatePresence>
              {showAddVariant && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.2 }}
                  className="flex items-center gap-2 px-4 overflow-hidden"
                  style={{ borderTop: '1px solid #1E2130', backgroundColor: '#090A10' }}
                >
                  <div className="flex items-center gap-2 py-2">
                    <input
                      type="text"
                      placeholder="Color"
                      value={newVariant.color}
                      onChange={(e) => setNewVariant((p) => ({ ...p, color: e.target.value }))}
                      className="rounded-md border text-sm outline-none px-2"
                      style={{ backgroundColor: '#0D0F14', borderColor: '#1E2130', color: '#E8EAF0', height: '32px', width: '100px' }}
                    />
                    <input
                      type="text"
                      placeholder="Size"
                      value={newVariant.size}
                      onChange={(e) => setNewVariant((p) => ({ ...p, size: e.target.value }))}
                      className="rounded-md border text-sm outline-none px-2"
                      style={{ backgroundColor: '#0D0F14', borderColor: '#1E2130', color: '#E8EAF0', height: '32px', width: '80px' }}
                    />
                    <input
                      type="number"
                      min="1"
                      value={newVariant.quantity}
                      onChange={(e) => setNewVariant((p) => ({ ...p, quantity: parseInt(e.target.value) || 0 }))}
                      className="rounded-md border text-sm outline-none px-2 text-right font-mono"
                      style={{ backgroundColor: '#0D0F14', borderColor: '#1E2130', color: '#E8EAF0', height: '32px', width: '60px' }}
                    />
                    <button
                      onClick={handleAddVariant}
                      className="inline-flex items-center gap-1 h-8 px-3 rounded-md text-xs font-medium transition-all duration-150"
                      style={{ backgroundColor: '#6366F1', color: '#0B0D12' }}
                    >
                      <Check size={12} />
                      Save
                    </button>
                    <button
                      onClick={() => { setShowAddVariant(false); setNewVariant({ color: '', size: '', quantity: 1 }); }}
                      className="h-8 px-3 rounded-md text-xs font-medium transition-all duration-150"
                      style={{ backgroundColor: '#11131A', color: '#8B8FA3', border: '1px solid #1E2130' }}
                    >
                      Cancel
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-8">
            <p className="text-sm italic mb-3" style={{ color: '#5C6078' }}>No variants defined.</p>
            {!showAddVariant && (
              <button
                onClick={() => setShowAddVariant(true)}
                className="inline-flex items-center gap-2 h-8 px-3 rounded-lg text-xs font-medium transition-all duration-150"
                style={{ backgroundColor: '#6366F1', color: '#0B0D12' }}
              >
                <Plus size={14} />
                Add First Variant
              </button>
            )}
            {showAddVariant && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="flex items-center gap-2"
              >
                <input
                  type="text"
                  placeholder="Color"
                  value={newVariant.color}
                  onChange={(e) => setNewVariant((p) => ({ ...p, color: e.target.value }))}
                  className="rounded-md border text-sm outline-none px-2"
                  style={{ backgroundColor: '#0D0F14', borderColor: '#1E2130', color: '#E8EAF0', height: '32px', width: '100px' }}
                />
                <input
                  type="text"
                  placeholder="Size"
                  value={newVariant.size}
                  onChange={(e) => setNewVariant((p) => ({ ...p, size: e.target.value }))}
                  className="rounded-md border text-sm outline-none px-2"
                  style={{ backgroundColor: '#0D0F14', borderColor: '#1E2130', color: '#E8EAF0', height: '32px', width: '80px' }}
                />
                <input
                  type="number"
                  min="1"
                  value={newVariant.quantity}
                  onChange={(e) => setNewVariant((p) => ({ ...p, quantity: parseInt(e.target.value) || 0 }))}
                  className="rounded-md border text-sm outline-none px-2 text-right font-mono"
                  style={{ backgroundColor: '#0D0F14', borderColor: '#1E2130', color: '#E8EAF0', height: '32px', width: '60px' }}
                />
                <button
                  onClick={handleAddVariant}
                  className="inline-flex items-center gap-1 h-8 px-3 rounded-md text-xs font-medium"
                  style={{ backgroundColor: '#6366F1', color: '#0B0D12' }}
                >
                  <Check size={12} />
                  Save
                </button>
                <button
                  onClick={() => { setShowAddVariant(false); }}
                  className="h-8 px-3 rounded-md text-xs font-medium"
                  style={{ backgroundColor: '#11131A', color: '#8B8FA3', border: '1px solid #1E2130' }}
                >
                  Cancel
                </button>
              </motion.div>
            )}
          </div>
        )}
      </motion.div>

      {/* ====== PROFIT ANALYSIS + PRICE HISTORY ====== */}
      <div className="grid grid-cols-2 gap-4">
        {/* Profit Analysis */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.32, ease: [0.0, 0.0, 0.2, 1] as [number, number, number, number] }}
          className="rounded-xl p-5"
          style={{ backgroundColor: '#11131A', border: '1px solid #1E2130' }}
        >
          <h2 className="text-base font-medium mb-4" style={{ color: '#E8EAF0' }}>Profit Analysis</h2>
          <div className="space-y-3">
            {[
              { label: 'Total units purchased', value: String(editMode ? editOptions.reduce((s, o) => s + o.quantity, 0) : product.totalQuantity), color: '#E8EAF0' },
              { label: 'Total buy cost', value: formatCurrency(totalCost), color: '#FB7185' },
              ...(product.originalPrice ? [{ label: 'Original price', value: formatCurrency(product.originalPrice), color: '#818CF8' }] : []),
              { label: 'Target price', value: formatCurrency(editMode ? (parseFloat(editTargetPrice) || 0) : product.targetPrice), color: '#6366F1' },
              ...(product.originalPrice && product.originalPrice > product.targetPrice ? [{ label: 'Discount', value: `${discountPercent.toFixed(0)}%`, color: '#FBBF24' }] : []),
              { label: 'Units sold', value: String(editMode ? editOptions.reduce((s, o) => s + o.soldQuantity, 0) : product.totalSold), color: '#34D399' },
              { label: 'Revenue from sales', value: formatCurrency(totalRevenue), color: '#34D399' },
              { label: 'Units remaining', value: String((editMode ? editOptions.reduce((s, o) => s + o.quantity, 0) : product.totalQuantity) - (editMode ? editOptions.reduce((s, o) => s + o.soldQuantity, 0) : product.totalSold)), color: '#FBBF24' },
              { label: 'Potential revenue (if all sold)', value: formatCurrency(potentialRevenue + totalRevenue), color: '#34D399' },
            ].map((row, i) => (
              <motion.div
                key={row.label}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.15, delay: 0.35 + i * 0.05 }}
                className="flex items-center justify-between"
              >
                <span className="text-sm" style={{ color: '#8B8FA3' }}>{row.label}</span>
                <span className="text-sm font-mono font-medium" style={{ color: row.color }}>{row.value}</span>
              </motion.div>
            ))}
            <div style={{ height: '1px', backgroundColor: '#1E2130', margin: '12px 0' }} />
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold" style={{ color: '#E8EAF0' }}>Total potential profit</span>
              <span className="text-lg font-mono font-semibold" style={{ color: '#34D399' }}>+{formatCurrency(totalPotentialProfit)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold" style={{ color: '#E8EAF0' }}>Profit margin</span>
              <span className="text-sm font-mono font-semibold" style={{ color: '#34D399' }}>{marginPercent.toFixed(1)}%</span>
            </div>
          </div>
        </motion.div>

        {/* Price History */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.4, ease: [0.0, 0.0, 0.2, 1] as [number, number, number, number] }}
          className="rounded-xl p-5"
          style={{ backgroundColor: '#11131A', border: '1px solid #1E2130' }}
        >
          <h2 className="text-base font-medium mb-4" style={{ color: '#E8EAF0' }}>Price History</h2>
          <div className="space-y-0">
            {timelineItems.map((item, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: 12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.25, delay: 0.42 + i * 0.08, ease: [0.0, 0.0, 0.2, 1] as [number, number, number, number] }}
                className="flex items-start gap-3"
                style={{ minHeight: '56px' }}
              >
                {/* Timeline line + dot */}
                <div className="flex flex-col items-center" style={{ width: '32px', flexShrink: 0 }}>
                  {i > 0 && <div style={{ width: '2px', height: '16px', backgroundColor: '#1E2130' }} />}
                  <div
                    className="rounded-full"
                    style={{
                      width: '8px',
                      height: '8px',
                      backgroundColor: item.type === 'green' ? '#34D399' : item.type === 'red' ? '#FB7185' : '#5C6078',
                      marginTop: i === 0 ? '16px' : '0',
                    }}
                  />
                  {i < timelineItems.length - 1 && <div style={{ width: '2px', flex: 1, backgroundColor: '#1E2130' }} />}
                </div>
                {/* Content */}
                <div className="pt-2 pb-1">
                  <p className="text-sm" style={{ color: '#E8EAF0' }}>{item.title}</p>
                  <p className="text-xs mt-0.5" style={{ color: '#5C6078' }}>{item.date}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* ====== NOTES SECTION ====== */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.2, delay: 0.5 }}
        className="rounded-xl p-5"
        style={{ backgroundColor: '#11131A', border: '1px solid #1E2130' }}
      >
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-medium" style={{ color: '#E8EAF0' }}>Notes</h2>
          {editMode && (
            <button
              onClick={saveEdits}
              className="inline-flex items-center gap-1 h-7 px-3 rounded-md text-xs font-medium transition-all duration-150"
              style={{ backgroundColor: '#6366F1', color: '#0B0D12' }}
            >
              <Check size={12} />
              Save
            </button>
          )}
        </div>
        {editMode ? (
          <textarea
            value={editNotes}
            onChange={(e) => setEditNotes(e.target.value)}
            placeholder="Add notes about this item — supplier info, customer feedback, restocking reminders..."
            className="w-full rounded-lg border text-sm outline-none p-3 transition-all duration-150"
            style={{
              backgroundColor: '#0D0F14',
              borderColor: '#1E2130',
              color: '#E8EAF0',
              minHeight: '120px',
              resize: 'vertical',
            }}
            onFocus={(e) => { e.currentTarget.style.borderColor = '#6366F1'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(99,102,241,0.15)'; }}
            onBlur={(e) => { e.currentTarget.style.borderColor = '#1E2130'; e.currentTarget.style.boxShadow = 'none'; }}
          />
        ) : (
          <div
            className="rounded-lg border p-3 text-sm"
            style={{
              backgroundColor: '#0D0F14',
              borderColor: '#1E2130',
              color: product.notes ? '#E8EAF0' : '#5C6078',
              minHeight: '80px',
            }}
          >
            {product.notes || 'No notes added yet.'}
          </div>
        )}
        <div className="flex items-center justify-between mt-2">
          <p className="text-xs" style={{ color: '#5C6078' }}>
            Last edited {formatDate(product.updatedAt)}
          </p>
          {editMode && (
            <div className="flex items-center gap-2">
              <label className="text-xs" style={{ color: '#8B8FA3' }}>Status:</label>
              <select
                value={editStatus}
                onChange={(e) => setEditStatus(e.target.value as Product['status'])}
                className="rounded-md border text-xs outline-none px-2 h-7"
                style={{ backgroundColor: '#0D0F14', borderColor: '#1E2130', color: '#E8EAF0' }}
              >
                <option value="in_stock">In Stock</option>
                <option value="listed">Listed</option>
                <option value="sold_out">Sold Out</option>
              </select>
            </div>
          )}
        </div>
      </motion.div>

      {/* ====== DELETE CONFIRMATION MODAL ====== */}
      <AnimatePresence>
        {showDeleteDialog && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="absolute inset-0"
              style={{ backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
              onClick={() => setShowDeleteDialog(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.15 }}
              className="relative z-10 rounded-xl p-6 max-w-[480px] w-full mx-4"
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
                  Delete Item?
                </h3>
                <p className="text-sm mb-6" style={{ color: '#8B8FA3' }}>
                  Are you sure you want to delete &ldquo;{product.name}&rdquo;? This action cannot be undone.
                </p>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setShowDeleteDialog(false)}
                    className="h-10 px-5 rounded-lg text-sm font-medium transition-all duration-150"
                    style={{
                      backgroundColor: '#11131A',
                      color: '#E8EAF0',
                      border: '1px solid #1E2130',
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#1A1D26'; e.currentTarget.style.borderColor = '#2E3250'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#11131A'; e.currentTarget.style.borderColor = '#1E2130'; }}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleDelete}
                    className="inline-flex items-center gap-2 h-10 px-5 rounded-lg text-sm font-medium transition-all duration-150"
                    style={{
                      backgroundColor: 'rgba(251,113,133,0.12)',
                      color: '#FB7185',
                      border: '1px solid rgba(251,113,133,0.25)',
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'rgba(251,113,133,0.2)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'rgba(251,113,133,0.12)'; }}
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

export default InventoryDetail;
