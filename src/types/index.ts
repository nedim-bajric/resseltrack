export interface ProductOption {
  id: string;
  name: string;
  color?: string;
  size?: string;
  quantity: number;
  soldQuantity: number;
}

export interface Product {
  id: string;
  name: string;
  category: string;
  imageUrl?: string;
  buyPrice: number;
  originalPrice?: number;
  targetPrice: number;
  soldPrice?: number;
  status: 'in_stock' | 'listed' | 'sold_out';
  totalQuantity: number;
  totalSold: number;
  options: ProductOption[];
  source: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Cost {
  id: string;
  name: string;
  category: 'ai_tools' | 'shipping' | 'packaging' | 'ads' | 'other';
  amount: number;
  date: string;
  description?: string;
  isRecurring: boolean;
  createdAt: string;
}

export interface Order {
  id: string;
  productId: string;
  productName: string;
  optionId?: string;
  optionName?: string;
  quantity: number;
  sellPrice: number;
  totalAmount: number;
  platform: string;
  customerName?: string;
  notes?: string;
  status: 'shipped' | 'done';
  date: string;
  createdAt: string;
}

export type TimeRange = '7d' | '30d' | '90d' | 'all';

export interface DashboardStats {
  totalRevenue: number;
  totalCost: number;
  totalProfit: number;
  inventoryValue: number;
  totalItems: number;
  soldItems: number;
  profitMargin: number;
}

export interface ChartDataPoint {
  date: string;
  profit: number;
  revenue: number;
  cost: number;
}

export interface CategoryBreakdown {
  name: string;
  value: number;
  color: string;
}

export interface CostBreakdownItem {
  category: string;
  amount: number;
  color: string;
}

export interface RecentActivity {
  id: string;
  type: 'product_added' | 'product_sold' | 'cost_added' | 'price_updated' | 'product_restocked' | 'order_created';
  title: string;
  description: string;
  amount?: number;
  date: string;
}
