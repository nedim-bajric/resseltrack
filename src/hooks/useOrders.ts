import { useState, useEffect, useCallback } from 'react';
import type { Order, TimeRange } from '@/types';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { subDays, isAfter } from 'date-fns';

/* ── DB row type (snake_case) ────────────────────────────────────── */
interface DbOrder {
  id: string;
  product_id: string;
  product_name: string;
  option_id: string | null;
  option_name: string | null;
  quantity: number;
  sell_price: number;
  total_amount: number;
  platform: string;
  customer_name: string | null;
  notes: string | null;
  status: 'shipped' | 'done';
  date: string;
  created_at: string;
}

/* ── Mappers ──────────────────────────────────────────────────────── */
function mapOrder(db: DbOrder): Order {
  return {
    id: db.id,
    productId: db.product_id,
    productName: db.product_name,
    optionId: db.option_id ?? undefined,
    optionName: db.option_name ?? undefined,
    quantity: db.quantity,
    sellPrice: db.sell_price,
    totalAmount: db.total_amount,
    platform: db.platform,
    customerName: db.customer_name ?? undefined,
    notes: db.notes ?? undefined,
    status: db.status,
    date: db.date,
    createdAt: db.created_at,
  };
}

/* ── Hook ─────────────────────────────────────────────────────────── */
export function useOrders() {
  const { user } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchOrders = useCallback(async () => {
    if (!user) {
      setOrders([]);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setError(null);
    const { data, error: dbError } = await supabase
      .from('orders')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (dbError) {
      setError(dbError.message);
      setOrders([]);
    } else {
      setOrders((data as DbOrder[] | null)?.map(mapOrder) ?? []);
    }
    setIsLoading(false);
  }, [user]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const addOrder = useCallback(
    async (
      orderData: Omit<Order, 'id' | 'createdAt' | 'totalAmount' | 'status'> & { status?: 'shipped' | 'done' }
    ): Promise<Order | null> => {
      const totalAmount = orderData.sellPrice * orderData.quantity;
      const insertRow = {
        product_id: orderData.productId,
        product_name: orderData.productName,
        option_id: orderData.optionId ?? null,
        option_name: orderData.optionName ?? null,
        quantity: orderData.quantity,
        sell_price: orderData.sellPrice,
        total_amount: totalAmount,
        platform: orderData.platform,
        customer_name: orderData.customerName ?? null,
        notes: orderData.notes ?? null,
        status: 'shipped',
        date: orderData.date,
      };

      const { data, error: dbError } = await supabase
        .from('orders')
        .insert(insertRow)
        .select()
        .single();

      if (dbError || !data) {
        console.error('Failed to add order:', dbError);
        return null;
      }

      await fetchOrders();
      return mapOrder(data as DbOrder);
    },
    [fetchOrders]
  );

  const deleteOrder = useCallback(
    async (id: string) => {
      const { error: dbError } = await supabase.from('orders').delete().eq('id', id);
      if (dbError) {
        console.error('Failed to delete order:', dbError);
      }
      await fetchOrders();
    },
    [fetchOrders]
  );

  const updateOrderStatus = useCallback(
    async (id: string, status: 'shipped' | 'done') => {
      const { error: dbError } = await supabase
        .from('orders')
        .update({ status })
        .eq('id', id);
      if (dbError) {
        console.error('Failed to update order status:', dbError);
      }
      await fetchOrders();
    },
    [fetchOrders]
  );

  const getOrdersByTimeRange = useCallback(
    (range: TimeRange) => {
      if (range === 'all') return orders;
      const days = range === '7d' ? 7 : range === '30d' ? 30 : 90;
      const cutoff = subDays(new Date(), days);
      return orders.filter((o) => isAfter(new Date(o.date), cutoff));
    },
    [orders]
  );

  const getOrdersByProduct = useCallback(
    (productId: string) => {
      return orders.filter((o) => o.productId === productId);
    },
    [orders]
  );

  return {
    orders,
    isLoading,
    error,
    addOrder,
    deleteOrder,
    getOrdersByTimeRange,
    getOrdersByProduct,
    updateOrderStatus,
  };
}
