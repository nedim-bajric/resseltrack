import { useState, useEffect, useCallback } from 'react';
import type { Product, ProductOption, ProductOptionBatch } from '@/types';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

/* ── DB row types (snake_case) ───────────────────────────────────── */
interface DbProductOption {
  id: string;
  product_id: string;
  name: string;
  color: string | null;
  size: string | null;
  quantity: number;
  sold_quantity: number;
  batches: unknown[] | null;
}

interface DbProduct {
  id: string;
  name: string;
  category: string;
  image_url: string | null;
  buy_price: number;
  original_price: number | null;
  target_price: number;
  sold_price: number | null;
  status: 'in_stock' | 'listed' | 'sold_out';
  total_quantity: number;
  total_sold: number;
  source: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
  product_options: DbProductOption[];
}

/* ── Helpers ──────────────────────────────────────────────────────── */
function normalizeBatches(
  raw: unknown,
  quantity: number,
  soldQuantity: number,
  productBuyPrice: number
): ProductOptionBatch[] {
  const parsed: ProductOptionBatch[] = [];
  if (Array.isArray(raw)) {
    for (const item of raw) {
      const record = item as Record<string, unknown>;
      const batchQty = Number(record.quantity ?? 0);
      if (batchQty <= 0) continue;
      parsed.push({
        id: String(record.id ?? `batch-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`),
        quantity: batchQty,
        remaining: Math.max(0, Math.min(batchQty, Number(record.remaining ?? batchQty))),
        buyPrice: Number(record.buyPrice ?? productBuyPrice),
      });
    }
  }
  if (parsed.length > 0) return parsed;
  return [
    {
      id: `batch-${Date.now()}`,
      quantity,
      remaining: Math.max(0, quantity - soldQuantity),
      buyPrice: productBuyPrice,
    },
  ];
}

export function getOptionAverageBuyPrice(option: ProductOption): number {
  const totalRemaining = option.batches.reduce((sum, b) => sum + b.remaining, 0);
  if (totalRemaining <= 0) return option.batches[0]?.buyPrice ?? 0;
  const weighted = option.batches.reduce((sum, b) => sum + b.remaining * b.buyPrice, 0);
  return weighted / totalRemaining;
}

export function consumeBatchesFIFO(
  batches: ProductOptionBatch[],
  quantity: number
): { cost: number; updatedBatches: ProductOptionBatch[] } {
  let remainingToConsume = quantity;
  let cost = 0;
  const updated = batches.map((b) => ({ ...b }));
  for (const batch of updated) {
    if (remainingToConsume <= 0) break;
    const take = Math.min(batch.remaining, remainingToConsume);
    batch.remaining -= take;
    cost += take * batch.buyPrice;
    remainingToConsume -= take;
  }
  return { cost, updatedBatches: updated };
}

/* ── Mappers ──────────────────────────────────────────────────────── */
function mapOption(db: DbProductOption, productBuyPrice: number): ProductOption {
  return {
    id: db.id,
    name: db.name,
    color: db.color ?? undefined,
    size: db.size ?? undefined,
    quantity: db.quantity,
    soldQuantity: db.sold_quantity,
    batches: normalizeBatches(db.batches, db.quantity, db.sold_quantity, productBuyPrice),
  };
}

function mapProduct(db: DbProduct): Product {
  return {
    id: db.id,
    name: db.name,
    category: db.category,
    imageUrl: db.image_url ?? undefined,
    buyPrice: db.buy_price,
    originalPrice: db.original_price ?? undefined,
    targetPrice: db.target_price,
    soldPrice: db.sold_price ?? undefined,
    status: db.status,
    totalQuantity: db.total_quantity,
    totalSold: db.total_sold,
    options: (db.product_options || []).map((o) => mapOption(o, db.buy_price)),
    source: db.source,
    notes: db.notes ?? undefined,
    createdAt: db.created_at,
    updatedAt: db.updated_at,
  };
}

function toDbProduct(p: Omit<Product, 'id' | 'createdAt' | 'updatedAt' | 'options'>) {
  return {
    name: p.name,
    category: p.category,
    image_url: p.imageUrl ?? null,
    buy_price: p.buyPrice,
    original_price: p.originalPrice ?? null,
    target_price: p.targetPrice,
    sold_price: p.soldPrice ?? null,
    status: p.status,
    total_quantity: p.totalQuantity,
    total_sold: p.totalSold,
    source: p.source,
    notes: p.notes ?? null,
  };
}

/* ── Hook ─────────────────────────────────────────────────────────── */
export function useProducts() {
  const { user } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProducts = useCallback(async () => {
    if (!user) {
      setProducts([]);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setError(null);
    const { data, error: dbError } = await supabase
      .from('products')
      .select('*, product_options(*)')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (dbError) {
      setError(dbError.message);
      setProducts([]);
    } else {
      setProducts((data as DbProduct[] | null)?.map(mapProduct) ?? []);
    }
    setIsLoading(false);
  }, [user]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const addProduct = useCallback(
    async (product: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>) => {
      const { data: prodData, error: prodError } = await supabase
        .from('products')
        .insert({ ...toDbProduct(product), user_id: user?.id })
        .select()
        .single();

      if (prodError || !prodData) {
        console.error('Failed to add product:', prodError);
        return null;
      }

      const productId = prodData.id;

      if (product.options.length > 0) {
        const opts = product.options.map((o) => ({
          product_id: productId,
          name: o.name,
          color: o.color ?? null,
          size: o.size ?? null,
          quantity: o.quantity,
          sold_quantity: o.soldQuantity,
          batches: o.batches,
        }));
        const { error: optsError } = await supabase.from('product_options').insert(opts);
        if (optsError) {
          console.error('Failed to add options:', optsError);
        }
      }

      await fetchProducts();
      return mapProduct({ ...prodData, product_options: [] } as DbProduct);
    },
    [fetchProducts]
  );

  const updateProduct = useCallback(
    async (id: string, updates: Partial<Product>) => {
      const dbUpdates: Record<string, unknown> = {};
      if (updates.name !== undefined) dbUpdates.name = updates.name;
      if (updates.category !== undefined) dbUpdates.category = updates.category;
      if (updates.imageUrl !== undefined) dbUpdates.image_url = updates.imageUrl ?? null;
      if (updates.buyPrice !== undefined) dbUpdates.buy_price = updates.buyPrice;
      if (updates.originalPrice !== undefined) dbUpdates.original_price = updates.originalPrice ?? null;
      if (updates.targetPrice !== undefined) dbUpdates.target_price = updates.targetPrice;
      if (updates.soldPrice !== undefined) dbUpdates.sold_price = updates.soldPrice ?? null;
      if (updates.status !== undefined) dbUpdates.status = updates.status;
      if (updates.totalQuantity !== undefined) dbUpdates.total_quantity = updates.totalQuantity;
      if (updates.totalSold !== undefined) dbUpdates.total_sold = updates.totalSold;
      if (updates.source !== undefined) dbUpdates.source = updates.source;
      if (updates.notes !== undefined) dbUpdates.notes = updates.notes ?? null;
      if (updates.options !== undefined) {
        // Fetch existing option IDs so we can update in-place instead of delete+reinsert.
        const { data: existingOptions, error: fetchError } = await supabase
          .from('product_options')
          .select('id')
          .eq('product_id', id);

        if (fetchError) {
          console.error('Failed to fetch existing options:', fetchError);
        }

        const existingIds = new Set((existingOptions || []).map((o) => o.id));

        // Update existing options (preserve their DB IDs / FK relationships).
        const optionsToUpdate = updates.options.filter((o) => existingIds.has(o.id));
        for (const o of optionsToUpdate) {
          const { error: optionUpdateError } = await supabase
            .from('product_options')
            .update({
              name: o.name,
              color: o.color ?? null,
              size: o.size ?? null,
              quantity: o.quantity,
              sold_quantity: o.soldQuantity,
              batches: o.batches,
            })
            .eq('id', o.id);

          if (optionUpdateError) {
            console.error('Failed to update option:', optionUpdateError);
          }
        }

        // Insert brand-new options (their IDs are temp strings like opt-...).
        const optionsToInsert = updates.options.filter((o) => !existingIds.has(o.id));
        if (optionsToInsert.length > 0) {
          const opts = optionsToInsert.map((o) => ({
            product_id: id,
            name: o.name,
            color: o.color ?? null,
            size: o.size ?? null,
            quantity: o.quantity,
            sold_quantity: o.soldQuantity,
            batches: o.batches,
          }));
          const { error: insertError } = await supabase.from('product_options').insert(opts);
          if (insertError) {
            console.error('Failed to insert options:', insertError);
          }
        }

        // Delete options that were removed, but only if they have no linked orders.
        const incomingIds = new Set(updates.options.map((o) => o.id).filter(Boolean));
        const idsToDelete = [...existingIds].filter((existingId) => !incomingIds.has(existingId));

        if (idsToDelete.length > 0) {
          const { data: linkedOrders, error: ordersError } = await supabase
            .from('orders')
            .select('option_id')
            .in('option_id', idsToDelete);

          if (ordersError) {
            console.error('Failed to check linked orders:', ordersError);
          }

          const linkedOptionIds = new Set((linkedOrders || []).map((o) => o.option_id));
          const deletableIds = idsToDelete.filter((optionId) => !linkedOptionIds.has(optionId));

          if (deletableIds.length > 0) {
            const { error: deleteError } = await supabase
              .from('product_options')
              .delete()
              .in('id', deletableIds);

            if (deleteError) {
              console.error('Failed to delete options:', deleteError);
            }
          }

          if (linkedOptionIds.size > 0) {
            console.warn('Cannot delete options with linked orders:', [...linkedOptionIds]);
          }
        }
      }

      dbUpdates.updated_at = new Date().toISOString();

      const { error: updError } = await supabase.from('products').update(dbUpdates).eq('id', id);
      if (updError) {
        console.error('Failed to update product:', updError);
      }

      await fetchProducts();
    },
    [fetchProducts]
  );

  const deleteProduct = useCallback(
    async (id: string) => {
      const { error: delError } = await supabase.from('products').delete().eq('id', id);
      if (delError) {
        console.error('Failed to delete product:', delError);
      }
      await fetchProducts();
    },
    [fetchProducts]
  );

  const getProductById = useCallback(
    (id: string) => {
      return products.find((p) => p.id === id);
    },
    [products]
  );

  const getFilteredProducts = useCallback(
    (search?: string, category?: string, status?: string) => {
      return products.filter((p) => {
        const matchesSearch =
          !search ||
          p.name.toLowerCase().includes(search.toLowerCase()) ||
          p.category.toLowerCase().includes(search.toLowerCase());
        const matchesCategory = !category || p.category === category;
        const matchesStatus = !status || p.status === status;
        return matchesSearch && matchesCategory && matchesStatus;
      });
    },
    [products]
  );

  const sellProductQuantity = useCallback(
    async (productId: string, quantity: number, optionId?: string) => {
      const product = products.find((p) => p.id === productId);
      if (!product) return;

      const newTotalSold = product.totalSold + quantity;
      const remaining = product.totalQuantity - newTotalSold;

      let newStatus: Product['status'] = product.status;
      if (remaining <= 0) {
        newStatus = 'sold_out';
      } else if (newTotalSold > 0) {
        newStatus = 'listed';
      }

      // Update option batches using FIFO (avoid delete+reinsert in updateProduct)
      if (optionId) {
        const option = product.options.find((o) => o.id === optionId);
        if (option) {
          const { updatedBatches } = consumeBatchesFIFO(option.batches, quantity);
          const { error: optError } = await supabase
            .from('product_options')
            .update({
              sold_quantity: option.soldQuantity + quantity,
              batches: updatedBatches,
            })
            .eq('id', optionId);
          if (optError) {
            console.error('Failed to update option batches:', optError);
          }
        }
      }

      // Update product totalSold and status only (no options array)
      await updateProduct(productId, {
        totalSold: newTotalSold,
        status: newStatus,
      });
    },
    [products, updateProduct]
  );

  const getAvailableOptions = useCallback(
    (productId: string) => {
      const product = products.find((p) => p.id === productId);
      if (!product) return [];
      return product.options.filter((opt) => opt.quantity - opt.soldQuantity > 0);
    },
    [products]
  );

  return {
    products,
    isLoading,
    error,
    addProduct,
    updateProduct,
    deleteProduct,
    getProductById,
    getFilteredProducts,
    sellProductQuantity,
    getAvailableOptions,
  };
}
