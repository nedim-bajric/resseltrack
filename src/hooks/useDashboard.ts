import { useMemo } from 'react';
import type {
  DashboardStats,
  ChartDataPoint,
  CategoryBreakdown,
  CostBreakdownItem,
  RecentActivity,
} from '@/types';
import { useProducts } from './useProducts';
import { useCosts } from './useCosts';
import { useOrders } from './useOrders';
import { format, eachMonthOfInterval, subMonths } from 'date-fns';

// ── Platform colours for charts ────────────────────────────────────
const PLATFORM_COLORS: Record<string, string> = {
  Instagram: '#E4405F',
  Facebook: '#1877F2',
  TikTok: '#A855F7',
  Other: '#5C6078',
};

// ═══════════════════════════════════════════════════════════════════
//  useDashboard
// ═══════════════════════════════════════════════════════════════════
export function useDashboard() {
  const { products } = useProducts();
  const { costs, getCostsByCategory } = useCosts();
  const { orders } = useOrders();

  // ── Separate done vs shipped orders ─────────────────────────────
  const doneOrders = useMemo(() => orders.filter((o) => o.status === 'done'), [orders]);
  const shippedOrders = useMemo(() => orders.filter((o) => o.status === 'shipped'), [orders]);

  // ── Stats (order-based, only 'done' orders count as real revenue) ─
  const stats: DashboardStats & {
    totalOrders: number;
    avgOrderValue: number;
    pendingOrders: number;
    pendingRevenue: number;
  } = useMemo(() => {
    const totalRevenue = doneOrders.reduce((sum, o) => sum + o.totalAmount, 0);
    const totalCost = costs.reduce((sum, c) => sum + c.amount, 0);

    const totalProfit = doneOrders.reduce((sum, o) => {
      const product = products.find((p) => p.id === o.productId);
      const costPerUnit = product ? product.buyPrice : 0;
      return sum + (o.sellPrice - costPerUnit) * o.quantity;
    }, 0);

    const inventoryValue = products.reduce((sum, p) => {
      const remaining = p.totalQuantity - p.totalSold;
      return sum + remaining * p.buyPrice;
    }, 0);

    const totalItems = products.length;
    const soldItems = doneOrders.reduce((sum, o) => sum + o.quantity, 0);
    const profitMargin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;
    const totalOrders = doneOrders.length;
    const avgOrderValue = doneOrders.length > 0 ? totalRevenue / doneOrders.length : 0;
    const pendingOrders = shippedOrders.length;
    const pendingRevenue = shippedOrders.reduce((sum, o) => sum + o.totalAmount, 0);

    return {
      totalRevenue,
      totalCost,
      totalProfit,
      inventoryValue,
      totalItems,
      soldItems,
      profitMargin,
      totalOrders,
      avgOrderValue,
      pendingOrders,
      pendingRevenue,
    };
  }, [doneOrders, shippedOrders, costs, products]);

  // ── Monthly chart data (from done orders only) ──────────────────
  const chartData: ChartDataPoint[] = useMemo(() => {
    const months = eachMonthOfInterval({
      start: subMonths(new Date(), 5),
      end: new Date(),
    });

    return months.map((month) => {
      const monthKey = format(month, 'yyyy-MM');
      const monthOrders = doneOrders.filter((o) => o.date.startsWith(monthKey));
      const monthCosts = costs.filter((c) => c.date.startsWith(monthKey));

      const revenue = monthOrders.reduce((sum, o) => sum + o.totalAmount, 0);
      const cost = monthCosts.reduce((sum, c) => sum + c.amount, 0);
      const profit = revenue - cost;

      return {
        date: format(month, 'MMM yyyy'),
        profit: Math.max(0, profit),
        revenue: Math.max(0, revenue),
        cost: Math.max(0, cost),
      };
    });
  }, [doneOrders, costs]);

  // ── Inventory category breakdown ────────────────────────────────
  const categoryBreakdown: CategoryBreakdown[] = useMemo(() => {
    const sold = stats.soldItems;
    const totalListed = products.reduce((sum, p) => sum + p.totalQuantity, 0);
    const pending = products.reduce((sum, p) => {
      return p.status === 'listed' ? sum + (p.totalQuantity - p.totalSold) : sum;
    }, 0);
    const unsold = totalListed - sold - pending;

    return [
      { name: 'Sold', value: sold, color: '#34D399' },
      { name: 'Unsold', value: Math.max(0, unsold), color: '#FBBF24' },
      { name: 'Pending', value: pending, color: '#38BDF8' },
    ];
  }, [products, stats]);

  // ── Cost breakdown ──────────────────────────────────────────────
  const costBreakdown: CostBreakdownItem[] = useMemo(() => {
    const categoryColors: Record<string, string> = {
      ai_tools: '#6366F1',
      shipping: '#38BDF8',
      packaging: '#FBBF24',
      ads: '#FB7185',
      other: '#5C6078',
    };
    const categoryLabels: Record<string, string> = {
      ai_tools: 'AI Tools',
      shipping: 'Shipping',
      packaging: 'Packaging',
      ads: 'Platform Fees',
      other: 'Other',
    };

    const grouped = getCostsByCategory();
    return Object.entries(grouped)
      .map(([category, amount]) => ({
        category: categoryLabels[category] || category,
        amount,
        color: categoryColors[category] || '#5C6078',
      }))
      .sort((a, b) => b.amount - a.amount);
  }, [getCostsByCategory]);

  // ── Recent activity (done orders + costs + products) ────────────
  const recentActivity: RecentActivity[] = useMemo(() => {
    // Order activities (only done orders)
    const orderActivities: RecentActivity[] = doneOrders.slice(0, 5).map((o) => ({
      id: `act-order-${o.id}`,
      type: 'product_sold' as const,
      title: o.productName,
      description: `Sold ${o.quantity}x to ${o.customerName ?? 'customer'} on ${o.platform}`,
      amount: o.totalAmount,
      date: o.createdAt,
    }));

    const costActivities: RecentActivity[] = costs
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 3)
      .map((c) => ({
        id: `act-cost-${c.id}`,
        type: 'cost_added' as const,
        title: c.name,
        description: 'Operational cost',
        amount: -c.amount,
        date: c.createdAt,
      }));

    const productActivities: RecentActivity[] = products
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 3)
      .map((p) => ({
        id: `act-add-${p.id}`,
        type: 'product_added' as const,
        title: p.name,
        description: 'Added to inventory',
        amount: -(p.buyPrice * p.totalQuantity),
        date: p.createdAt,
      }));

    const all = [...orderActivities, ...costActivities, ...productActivities];
    all.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return all.slice(0, 8);
  }, [orders, costs, products]);

  // ── Platform breakdown for pie chart (done orders only) ─────────
  const platformBreakdown = useMemo(() => {
    const grouped = doneOrders.reduce<Record<string, number>>((acc, o) => {
      acc[o.platform] = (acc[o.platform] || 0) + o.totalAmount;
      return acc;
    }, {});

    return Object.entries(grouped).map(([platform, revenue]) => ({
      name: platform,
      value: revenue,
      color: PLATFORM_COLORS[platform] || '#5C6078',
    }));
  }, [doneOrders]);

  return {
    stats,
    chartData,
    categoryBreakdown,
    costBreakdown,
    recentActivity,
    platformBreakdown,
    orders: doneOrders,
    pendingOrders: shippedOrders,
  };
}
