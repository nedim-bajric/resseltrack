import { useState, useEffect, useCallback } from 'react';
import type { Cost, TimeRange } from '@/types';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { subDays, isAfter } from 'date-fns';

/* ── DB row type (snake_case) ────────────────────────────────────── */
interface DbCost {
  id: string;
  name: string;
  category: 'ai_tools' | 'shipping' | 'packaging' | 'ads' | 'other';
  amount: number;
  date: string;
  description: string | null;
  is_recurring: boolean;
  created_at: string;
}

/* ── Mappers ──────────────────────────────────────────────────────── */
function mapCost(db: DbCost): Cost {
  return {
    id: db.id,
    name: db.name,
    category: db.category,
    amount: db.amount,
    date: db.date,
    description: db.description ?? undefined,
    isRecurring: db.is_recurring,
    createdAt: db.created_at,
  };
}

/* ── Hook ─────────────────────────────────────────────────────────── */
export function useCosts() {
  const { user } = useAuth();
  const [costs, setCosts] = useState<Cost[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCosts = useCallback(async () => {
    if (!user) {
      setCosts([]);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setError(null);
    const { data, error: dbError } = await supabase
      .from('costs')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (dbError) {
      setError(dbError.message);
      setCosts([]);
    } else {
      setCosts((data as DbCost[] | null)?.map(mapCost) ?? []);
    }
    setIsLoading(false);
  }, [user]);

  useEffect(() => {
    fetchCosts();
  }, [fetchCosts]);

  const addCost = useCallback(
    async (cost: Omit<Cost, 'id' | 'createdAt'>): Promise<Cost | null> => {
      const insertRow = {
        name: cost.name,
        category: cost.category,
        amount: cost.amount,
        date: cost.date,
        description: cost.description ?? null,
        is_recurring: cost.isRecurring,
        user_id: user?.id,
      };

      const { data, error: dbError } = await supabase
        .from('costs')
        .insert(insertRow)
        .select()
        .single();

      if (dbError || !data) {
        console.error('Failed to add cost:', dbError);
        return null;
      }

      await fetchCosts();
      return mapCost(data as DbCost);
    },
    [fetchCosts]
  );

  const updateCost = useCallback(
    async (id: string, updates: Partial<Cost>) => {
      const dbUpdates: Record<string, unknown> = {};
      if (updates.name !== undefined) dbUpdates.name = updates.name;
      if (updates.category !== undefined) dbUpdates.category = updates.category;
      if (updates.amount !== undefined) dbUpdates.amount = updates.amount;
      if (updates.date !== undefined) dbUpdates.date = updates.date;
      if (updates.description !== undefined) dbUpdates.description = updates.description ?? null;
      if (updates.isRecurring !== undefined) dbUpdates.is_recurring = updates.isRecurring;

      const { error: dbError } = await supabase.from('costs').update(dbUpdates).eq('id', id);
      if (dbError) {
        console.error('Failed to update cost:', dbError);
      }

      await fetchCosts();
    },
    [fetchCosts]
  );

  const deleteCost = useCallback(
    async (id: string) => {
      const { error: dbError } = await supabase.from('costs').delete().eq('id', id);
      if (dbError) {
        console.error('Failed to delete cost:', dbError);
      }
      await fetchCosts();
    },
    [fetchCosts]
  );

  const getCostsByCategory = useCallback(() => {
    const grouped: Record<string, number> = {};
    costs.forEach((c) => {
      grouped[c.category] = (grouped[c.category] || 0) + c.amount;
    });
    return grouped;
  }, [costs]);

  const getCostsByTimeRange = useCallback(
    (range: TimeRange) => {
      if (range === 'all') return costs;
      const days = range === '7d' ? 7 : range === '30d' ? 30 : 90;
      const cutoff = subDays(new Date(), days);
      return costs.filter((c) => isAfter(new Date(c.date), cutoff));
    },
    [costs]
  );

  return {
    costs,
    isLoading,
    error,
    addCost,
    updateCost,
    deleteCost,
    getCostsByCategory,
    getCostsByTimeRange,
  };
}
