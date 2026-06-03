import { useState, useEffect, useCallback } from 'react';
import type { Product, ProductOption } from '@/types';
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

/* ── Mappers ──────────────────────────────────────────────────────── */
function mapOption(db: DbProductOption): ProductOption {
  return {
    id: db.id,
    name: db.name,
    color: db.color ?? undefined,
    size: db.size ?? undefined,
    quantity: db.quantity,
    soldQuantity: db.sold_quantity,
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
    options: (db.product_options || []).map(mapOption),
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
        // Delete old options and re-insert
        await supabase.from('product_options').delete().eq('product_id', id);
        if (updates.options.length > 0) {
          const opts = updates.options.map((o) => ({
            product_id: id,
            name: o.name,
            color: o.color ?? null,
            size: o.size ?? null,
            quantity: o.quantity,
            sold_quantity: o.soldQuantity,
          }));
          await supabase.from('product_options').insert(opts);
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

      // Update option sold_quantity directly (avoid delete+reinsert in updateProduct)
      if (optionId) {
        const option = product.options.find((o) => o.id === optionId);
        if (option) {
          const { error: optError } = await supabase
            .from('product_options')
            .update({ sold_quantity: option.soldQuantity + quantity })
            .eq('id', optionId);
          if (optError) {
            console.error('Failed to update option quantity:', optError);
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
