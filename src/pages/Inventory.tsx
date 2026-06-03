import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  Filter,
  Package,
  Plus,
  MoreVertical,
  Eye,
  Pencil,
  Trash2,
  AlertTriangle,
  X,
  ChevronDown,
  ChevronUp,
  ArrowUpDown,
  ShoppingBag,
} from 'lucide-react';
import { Toaster, toast } from 'sonner';
import { useProducts } from '@/hooks/useProducts';
import { StatusBadge } from '@/components/StatusBadge';
import { formatCurrency } from '@/lib/currency';
import type { Product } from '@/types';

type SortField = 'name' | 'category' | 'totalQuantity' | 'totalSold' | 'buyPrice' | 'targetPrice' | 'status';
type SortDir = 'asc' | 'desc';

interface SortState {
  field: SortField;
  dir: SortDir;
}

const CATEGORIES = ['All', 'Clothing', 'Accessories', 'Home', 'Electronics', 'Other'];
const STATUSES = [
  { value: 'all', label: 'All' },
  { value: 'in_stock', label: 'In Stock' },
  { value: 'listed', label: 'Listed' },
  { value: 'sold_out', label: 'Sold Out' },
];

/* ------------------------------------------------------------------ */
/*  Inventory Page                                                    */
/* ------------------------------------------------------------------ */

const Inventory: React.FC = () => {
  const navigate = useNavigate();
  const { products, deleteProduct } = useProducts();

  /* -- local state -- */
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sort, setSort] = useState<SortState>({ field: 'name', dir: 'asc' });
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [deleteItem, setDeleteItem] = useState<Product | null>(null);
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [filterDropdownOpen, setFilterDropdownOpen] = useState(false);

  /* -- derived: filtered + sorted products -- */
  const filteredProducts = useMemo(() => {
    let list = products.filter((p) => {
      const matchSearch =
        !search ||
        p.name.toLowerCase().includes(search.toLowerCase());
      const matchCategory = categoryFilter === 'All' || p.category === categoryFilter;
      const matchStatus = statusFilter === 'all' || p.status === statusFilter;
      return matchSearch && matchCategory && matchStatus;
    });

    list = [...list].sort((a, b) => {
      const { field, dir } = sort;
      let comparison = 0;
      if (field === 'name' || field === 'category' || field === 'status') {
        comparison = (a[field] as string).localeCompare(b[field] as string);
      } else {
        comparison = (a[field] as number) - (b[field] as number);
      }
      return dir === 'asc' ? comparison : -comparison;
    });

    return list;
  }, [products, search, categoryFilter, statusFilter, sort]);

  /* -- active filter tags -- */
  const activeFilters = useMemo(() => {
    const tags: { label: string; onClear: () => void }[] = [];
    if (categoryFilter !== 'All') tags.push({ label: `Category: ${categoryFilter}`, onClear: () => setCategoryFilter('All') });
    if (statusFilter !== 'all') {
      const label = STATUSES.find((s) => s.value === statusFilter)?.label || statusFilter;
      tags.push({ label: `Status: ${label}`, onClear: () => setStatusFilter('all') });
    }
    return tags;
  }, [categoryFilter, statusFilter]);

  const clearAllFilters = () => {
    setSearch('');
    setCategoryFilter('All');
    setStatusFilter('all');
  };

  /* -- sorting -- */
  const handleSort = (field: SortField) => {
    setSort((prev) => {
      if (prev.field === field) {
        if (prev.dir === 'asc') return { field, dir: 'desc' };
        return { field, dir: 'asc' };
      }
      return { field, dir: 'asc' };
    });
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sort.field !== field) return <ArrowUpDown size={14} className="text-[#5C6078]" />;
    return sort.dir === 'asc'
      ? <ChevronUp size={14} className="text-[#6366F1]" />
      : <ChevronDown size={14} className="text-[#6366F1]" />;
  };

  /* -- selection -- */
  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredProducts.length && filteredProducts.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredProducts.map((p) => p.id)));
    }
  };

  /* -- delete handlers -- */
  const handleDelete = (item: Product) => {
    setDeleteItem(item);
  };

  const confirmDelete = async () => {
    if (deleteItem) {
      await deleteProduct(deleteItem.id);
      toast.success('Item deleted successfully');
      setDeleteItem(null);
      setSelectedIds((prev) => {
        const next = new Set(prev);
        next.delete(deleteItem.id);
        return next;
      });
    }
  };

  const confirmBulkDelete = async () => {
    for (const id of selectedIds) {
      await deleteProduct(id);
    }
    toast.success(`${selectedIds.size} items deleted`);
    setSelectedIds(new Set());
    setBulkDeleteOpen(false);
  };

  const hasActiveFilters = search !== '' || categoryFilter !== 'All' || statusFilter !== 'all';

  /* -- render -- */
  return (
    <div className="space-y-6">
      <Toaster theme="dark" position="top-right" />

      {/* ====== PAGE HEADER ====== */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, ease: [0.0, 0.0, 0.2, 1] as [number, number, number, number] }}
        className="flex flex-col md:flex-row md:items-center md:justify-between gap-3"
        style={{ minHeight: '48px', marginBottom: '24px' }}
      >
        {/* Left: Title + count */}
        <div>
          <h1
            className="font-bold text-2xl md:text-[32px]"
            style={{ lineHeight: 1.1, letterSpacing: '-0.02em', color: '#E8EAF0' }}
          >
            Inventory
          </h1>
          <p className="mt-1 text-sm" style={{ color: '#8B8FA3' }}>
            {filteredProducts.length} {filteredProducts.length === 1 ? 'item' : 'items'}
          </p>
        </div>

        {/* Right: Search + Filter + Add */}
        <motion.div
          initial={{ opacity: 0, x: 12 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.25, delay: 0.1, ease: [0.0, 0.0, 0.2, 1] as [number, number, number, number] }}
          className="flex flex-wrap items-center gap-2 md:gap-3"
        >
          {/* Search */}
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#5C6078]" />
            <input
              type="text"
              placeholder="Search items..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-9 rounded-lg border text-sm outline-none focus:ring-[3px] transition-all duration-150 w-full md:w-auto"
              style={{
                width: '240px',
                backgroundColor: '#0D0F14',
                borderColor: '#1E2130',
                color: '#E8EAF0',
                padding: '0 12px 0 36px',
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = '#6366F1';
                e.currentTarget.style.boxShadow = '0 0 0 3px rgba(99,102,241,0.15)';
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = '#1E2130';
                e.currentTarget.style.boxShadow = 'none';
              }}
            />
          </div>

          {/* Filter dropdown */}
          <div className="relative">
            <button
              onClick={() => setFilterDropdownOpen(!filterDropdownOpen)}
              className="inline-flex items-center gap-2 h-9 px-4 rounded-lg text-sm font-medium transition-all duration-150"
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
              <Filter size={16} />
              <span>Filter</span>
            </button>

            <AnimatePresence>
              {filterDropdownOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setFilterDropdownOpen(false)} />
                  <motion.div
                    initial={{ opacity: 0, scaleY: 0.95 }}
                    animate={{ opacity: 1, scaleY: 1 }}
                    exit={{ opacity: 0, scaleY: 0.95 }}
                    transition={{ duration: 0.15 }}
                    className="absolute right-0 top-10 z-20 rounded-lg border p-3 space-y-3 origin-top"
                    style={{
                      width: '220px',
                      backgroundColor: '#11131A',
                      borderColor: '#1E2130',
                      boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
                    }}
                  >
                    {/* Category filter */}
                    <div>
                      <label className="text-xs font-medium uppercase tracking-wider text-[#5C6078] mb-1.5 block">Category</label>
                      <select
                        value={categoryFilter}
                        onChange={(e) => setCategoryFilter(e.target.value)}
                        className="w-full h-8 rounded-md border text-sm outline-none px-2"
                        style={{ backgroundColor: '#0D0F14', borderColor: '#1E2130', color: '#E8EAF0' }}
                      >
                        {CATEGORIES.map((c) => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </select>
                    </div>

                    {/* Status filter */}
                    <div>
                      <label className="text-xs font-medium uppercase tracking-wider text-[#5C6078] mb-1.5 block">Status</label>
                      <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="w-full h-8 rounded-md border text-sm outline-none px-2"
                        style={{ backgroundColor: '#0D0F14', borderColor: '#1E2130', color: '#E8EAF0' }}
                      >
                        {STATUSES.map((s) => (
                          <option key={s.value} value={s.value}>{s.label}</option>
                        ))}
                      </select>
                    </div>
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>

          {/* Add Item button */}
          <button
            onClick={() => navigate('/inventory/add')}
            className="inline-flex items-center gap-2 h-9 px-5 rounded-lg text-sm font-medium transition-all duration-150"
            style={{ backgroundColor: '#6366F1', color: '#0B0D12' }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#818CF8';
              e.currentTarget.style.transform = 'translateY(-1px)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#6366F1';
              e.currentTarget.style.transform = 'translateY(0)';
            }}
          >
            <Plus size={16} />
            <span>Add Item</span>
          </button>
        </motion.div>
        </motion.div>

      {/* ====== FILTER TAGS ====== */}
      <AnimatePresence>
        {activeFilters.length > 0 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.15 }}
            className="flex items-center gap-2 flex-wrap"
          >
            {activeFilters.map((tag, i) => (
              <span
                key={i}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium"
                style={{
                  backgroundColor: 'rgba(99,102,241,0.12)',
                  color: '#6366F1',
                }}
              >
                {tag.label}
                <button onClick={tag.onClear} className="hover:opacity-70 transition-opacity">
                  <X size={12} />
                </button>
              </span>
            ))}
            <button
              onClick={clearAllFilters}
              className="text-xs underline transition-colors duration-150 ml-1"
              style={{ color: '#8B8FA3' }}
              onMouseEnter={(e) => { e.currentTarget.style.color = '#E8EAF0'; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = '#8B8FA3'; }}
            >
              Clear All
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ====== BULK ACTIONS BAR ====== */}
      <AnimatePresence>
        {selectedIds.size > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2, ease: [0.0, 0.0, 0.2, 1] as [number, number, number, number] }}
            className="flex items-center justify-between px-4 rounded-lg"
            style={{
              height: '44px',
              backgroundColor: '#222633',
            }}
          >
            <span className="text-sm" style={{ color: '#E8EAF0' }}>
              {selectedIds.size} {selectedIds.size === 1 ? 'item' : 'items'} selected
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setBulkDeleteOpen(true)}
                className="inline-flex items-center gap-1.5 h-8 px-3 rounded-md text-sm font-medium transition-all duration-150"
                style={{
                  backgroundColor: 'rgba(251,113,133,0.12)',
                  color: '#FB7185',
                  border: '1px solid rgba(251,113,133,0.25)',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'rgba(251,113,133,0.2)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'rgba(251,113,133,0.12)'; }}
              >
                <Trash2 size={14} />
                <span>Delete</span>
              </button>
              <button
                onClick={() => setSelectedIds(new Set())}
                className="h-8 px-3 rounded-md text-sm font-medium transition-colors duration-150"
                style={{ color: '#8B8FA3' }}
                onMouseEnter={(e) => { e.currentTarget.style.color = '#E8EAF0'; }}
                onMouseLeave={(e) => { e.currentTarget.style.color = '#8B8FA3'; }}
              >
                Cancel
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ====== DATA TABLE ====== */}
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
          {/* Checkbox */}
          <div className="flex items-center justify-center" style={{ width: '40px' }}>
            <input
              type="checkbox"
              checked={filteredProducts.length > 0 && selectedIds.size === filteredProducts.length}
              onChange={toggleSelectAll}
              className="cursor-pointer"
              style={{ accentColor: '#6366F1' }}
            />
          </div>

          {/* Columns */}
          {[
            { key: 'name' as SortField, header: 'Item Name', width: undefined, flex: 1 },
            { key: 'category' as SortField, header: 'Category', width: '120px' },
            { key: 'totalQuantity' as SortField, header: 'Qty', width: '70px' },
            { key: 'totalSold' as SortField, header: 'Sold', width: '60px' },
            { key: 'buyPrice' as SortField, header: 'Buy Price', width: '90px' },
            { key: 'targetPrice' as SortField, header: 'Target', width: '90px' },
            { key: 'status' as SortField, header: 'Status', width: '100px' },
          ].map((col) => (
            <div
              key={col.key}
              className="flex items-center gap-1 px-4 text-xs font-medium uppercase tracking-wider cursor-pointer select-none"
              style={{
                width: col.width,
                flex: col.flex,
                color: '#5C6078',
              }}
              onClick={() => handleSort(col.key)}
            >
              {col.header}
              <SortIcon field={col.key} />
            </div>
          ))}

          <div className="px-4 text-center text-xs font-medium uppercase tracking-wider" style={{ width: '48px', color: '#5C6078' }}>
            ⋮
          </div>
        </div>

        {/* Table Rows */}
        {filteredProducts.length > 0 ? (
          filteredProducts.map((product, index) => (
            <motion.div
              key={product.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                duration: 0.15,
                delay: index * 0.03,
                ease: [0.0, 0.0, 0.2, 1] as [number, number, number, number],
              }}
              className="flex items-center transition-colors duration-100 cursor-pointer"
              style={{
                height: '52px',
                borderBottom: index < filteredProducts.length - 1 ? '1px solid #1E2130' : undefined,
              }}
              onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#1A1D26'; }}
              onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
              onClick={() => navigate(`/inventory/${product.id}`)}
            >
              {/* Checkbox */}
              <div
                className="flex items-center justify-center"
                style={{ width: '40px' }}
                onClick={(e) => e.stopPropagation()}
              >
                <input
                  type="checkbox"
                  checked={selectedIds.has(product.id)}
                  onChange={() => toggleSelect(product.id)}
                  style={{ accentColor: '#6366F1' }}
                />
              </div>

              {/* Name */}
              <div className="flex items-center gap-3 px-4" style={{ flex: 1, minWidth: '200px' }}>
                <div
                  className="flex items-center justify-center flex-shrink-0"
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '6px',
                    backgroundColor: '#1A1D26',
                  }}
                >
                  <Package size={16} className="text-[#5C6078]" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate" style={{ color: '#E8EAF0' }}>
                    {product.name}
                  </p>
                  {product.options.length > 0 && (
                    <p className="text-xs truncate" style={{ color: '#5C6078' }}>
                      {Array.from(new Set(product.options.map((o) => o.color).filter(Boolean))).length} colors
                      {' · '}
                      {Array.from(new Set(product.options.map((o) => o.size).filter(Boolean))).length} sizes
                    </p>
                  )}
                </div>
              </div>

              {/* Category */}
              <div className="px-4 text-sm" style={{ width: '120px', color: '#8B8FA3' }}>
                {product.category}
              </div>

              {/* Quantity */}
              <div className="px-4 text-right text-sm font-mono" style={{ width: '70px', color: '#E8EAF0' }}>
                {product.totalQuantity}
              </div>

              {/* Sold */}
              <div className="px-4 text-right text-sm font-mono" style={{ width: '60px', color: '#8B8FA3' }}>
                {product.totalSold}
              </div>

              {/* Buy Price */}
              <div className="px-4 text-right text-sm font-mono" style={{ width: '90px', color: '#8B8FA3' }}>
                {formatCurrency(product.buyPrice)}
              </div>

              {/* Target Price */}
              <div className="px-4 text-right text-sm font-mono" style={{ width: '90px', color: '#E8EAF0' }}>
                {formatCurrency(product.targetPrice)}
              </div>

              {/* Status */}
              <div className="flex items-center justify-center" style={{ width: '100px' }}>
                <StatusBadge status={product.status} />
              </div>

              {/* Actions */}
              <div className="flex items-center justify-center" style={{ width: '48px' }} onClick={(e) => e.stopPropagation()}>
                <RowActionsMenu
                  product={product}
                  onView={() => navigate(`/inventory/${product.id}`)}
                  onEdit={() => navigate(`/inventory/${product.id}`)}
                  onDelete={() => handleDelete(product)}
                />
              </div>
            </motion.div>
          ))
        ) : (
          /* Empty State */
          <div className="flex flex-col items-center justify-center py-16">
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.3, ease: [0.0, 0.0, 0.2, 1] as [number, number, number, number] }}
              className="flex items-center justify-center mb-4"
              style={{
                width: '80px',
                height: '80px',
                borderRadius: '50%',
                backgroundColor: '#1A1D26',
              }}
            >
              <Package size={48} className="text-[#5C6078]" />
            </motion.div>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.2, delay: 0.2 }}
              className="text-base font-medium mb-1"
              style={{ color: '#E8EAF0' }}
            >
              {hasActiveFilters ? 'No items found' : 'No items yet'}
            </motion.p>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.2, delay: 0.3 }}
              className="text-sm text-center mb-5 max-w-[360px]"
              style={{ color: '#8B8FA3' }}
            >
              {hasActiveFilters
                ? 'Try adjusting your search or filters to find what you are looking for.'
                : 'Start tracking your reselling inventory. Add your first item to see it here.'}
            </motion.p>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.2, delay: 0.4 }}
            >
              {hasActiveFilters ? (
                <button
                  onClick={clearAllFilters}
                  className="inline-flex items-center gap-2 h-9 px-5 rounded-lg text-sm font-medium transition-all duration-150"
                  style={{ backgroundColor: '#6366F1', color: '#0B0D12' }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#818CF8';
                    e.currentTarget.style.transform = 'translateY(-1px)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = '#6366F1';
                    e.currentTarget.style.transform = 'translateY(0)';
                  }}
                >
                  <X size={16} />
                  <span>Clear Filters</span>
                </button>
              ) : (
                <button
                  onClick={() => navigate('/inventory/add')}
                  className="inline-flex items-center gap-2 h-9 px-5 rounded-lg text-sm font-medium transition-all duration-150"
                  style={{ backgroundColor: '#6366F1', color: '#0B0D12' }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#818CF8';
                    e.currentTarget.style.transform = 'translateY(-1px)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = '#6366F1';
                    e.currentTarget.style.transform = 'translateY(0)';
                  }}
                >
                  <Plus size={16} />
                  <span>Add First Item</span>
                </button>
              )}
            </motion.div>
          </div>
        )}
          </div>
        </div>
      </motion.div>

      {/* ====== DELETE CONFIRMATION MODAL ====== */}
      <AnimatePresence>
        {deleteItem && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="absolute inset-0"
              style={{ backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
              onClick={() => setDeleteItem(null)}
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
                  Are you sure you want to delete &ldquo;{deleteItem.name}&rdquo;? This action cannot be undone.
                </p>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setDeleteItem(null)}
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
                  <button
                    onClick={confirmDelete}
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

      {/* ====== BULK DELETE MODAL ====== */}
      <AnimatePresence>
        {bulkDeleteOpen && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="absolute inset-0"
              style={{ backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
              onClick={() => setBulkDeleteOpen(false)}
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
                  Delete {selectedIds.size} Items?
                </h3>
                <p className="text-sm mb-6" style={{ color: '#8B8FA3' }}>
                  Are you sure you want to delete these {selectedIds.size} items? This action cannot be undone.
                </p>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setBulkDeleteOpen(false)}
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
                  <button
                    onClick={confirmBulkDelete}
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

/* ------------------------------------------------------------------ */
/*  Row Actions Menu (inline to avoid extra files)                    */
/* ------------------------------------------------------------------ */

const RowActionsMenu: React.FC<{
  product: Product;
  onView: () => void;
  onEdit: () => void;
  onDelete: () => void;
}> = ({ product, onView, onEdit, onDelete }) => {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center justify-center rounded-md transition-colors duration-150"
        style={{ width: '28px', height: '28px', color: '#5C6078' }}
        onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#1A1D26'; e.currentTarget.style.color = '#E8EAF0'; }}
        onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = '#5C6078'; }}
      >
        <MoreVertical size={16} />
      </button>

      <AnimatePresence>
        {open && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
            <motion.div
              initial={{ opacity: 0, scaleY: 0.95 }}
              animate={{ opacity: 1, scaleY: 1 }}
              exit={{ opacity: 0, scaleY: 0.95 }}
              transition={{ duration: 0.15 }}
              className="absolute right-0 top-8 z-20 rounded-lg border py-1 origin-top"
              style={{
                width: '160px',
                backgroundColor: '#11131A',
                borderColor: '#1E2130',
                boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
              }}
            >
              <button
                onClick={() => { onView(); setOpen(false); }}
                className="flex items-center gap-2 w-full px-3 py-2 text-sm transition-colors duration-100"
                style={{ color: '#E8EAF0' }}
                onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#1A1D26'; }}
                onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
              >
                <Eye size={14} />
                View Details
              </button>
              <button
                onClick={() => { onEdit(); setOpen(false); }}
                className="flex items-center gap-2 w-full px-3 py-2 text-sm transition-colors duration-100"
                style={{ color: '#E8EAF0' }}
                onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#1A1D26'; }}
                onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
              >
                <Pencil size={14} />
                Edit Item
              </button>
              {product.status !== 'sold_out' && (
                <button
                  onClick={() => { setOpen(false); }}
                  className="flex items-center gap-2 w-full px-3 py-2 text-sm transition-colors duration-100"
                  style={{ color: '#E8EAF0' }}
                  onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#1A1D26'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
                >
                  <ShoppingBag size={14} />
                  Mark as Sold
                </button>
              )}
              <button
                onClick={() => { onDelete(); setOpen(false); }}
                className="flex items-center gap-2 w-full px-3 py-2 text-sm transition-colors duration-100"
                style={{ color: '#FB7185' }}
                onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'rgba(251,113,133,0.12)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
              >
                <Trash2 size={14} />
                Delete
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Inventory;
