import React, { useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Package,
  Warehouse,
  ShoppingBag,
  Receipt,
  PackageOpen,
  Banknote,
  ClipboardList,
  BarChart3,
  ShoppingCart,
  Upload,
  FileJson,
  FileSpreadsheet,
  Truck,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
} from 'recharts';
import { useDashboard } from '@/hooks/useDashboard';
import { useProducts } from '@/hooks/useProducts';
import { useCosts } from '@/hooks/useCosts';
import { StatCard } from '@/components/StatCard';
import { formatCurrency, formatCurrencyShort } from '@/lib/currency';
import { exportToCSV, exportToJSON, importFromJSON } from '@/lib/export';
import type { TimeRange } from '@/types';

const timeRanges: { label: string; value: TimeRange }[] = [
  { label: '7D', value: '7d' },
  { label: '30D', value: '30d' },
  { label: '90D', value: '90d' },
  { label: 'All', value: 'all' },
];

const formatNumber = (value: number) => value.toLocaleString('bs-BA');

export const Dashboard: React.FC = () => {
  const {
    stats,
    chartData,
    categoryBreakdown,
    costBreakdown,
    recentActivity,
    platformBreakdown,
    orders,
  } = useDashboard();
  const { products } = useProducts();
  const { costs } = useCosts();

  const [selectedTimeRange, setSelectedTimeRange] = useState<TimeRange>('30d');
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const recentOrders = orders.slice(0, 8);

  const handleExportCSV = () => {
    exportToCSV(products, costs, orders);
  };

  const handleExportJSON = () => {
    exportToJSON(products, costs, orders);
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsImporting(true);
    try {
      await importFromJSON(file);
      window.location.reload();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Import failed');
      setIsImporting(false);
    }
    e.target.value = '';
  };

  return (
    <div className="space-y-6 pb-24">
      {/* ═══════════════════ Export / Import Actions ═══════════════════ */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
        className="flex items-center gap-2"
      >
        <button
          onClick={handleExportCSV}
          className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg text-xs font-medium transition-all duration-150"
          style={{ backgroundColor: '#11131A', color: '#E8EAF0', border: '1px solid #1E2130' }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#1A1D26';
            e.currentTarget.style.borderColor = '#2E3250';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = '#11131A';
            e.currentTarget.style.borderColor = '#1E2130';
          }}
        >
          <FileSpreadsheet size={14} />
          Export CSV
        </button>
        <button
          onClick={handleExportJSON}
          className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg text-xs font-medium transition-all duration-150"
          style={{ backgroundColor: '#11131A', color: '#E8EAF0', border: '1px solid #1E2130' }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#1A1D26';
            e.currentTarget.style.borderColor = '#2E3250';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = '#11131A';
            e.currentTarget.style.borderColor = '#1E2130';
          }}
        >
          <FileJson size={14} />
          Export JSON
        </button>
        <button
          onClick={handleImportClick}
          disabled={isImporting}
          className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg text-xs font-medium transition-all duration-150"
          style={{
            backgroundColor: '#11131A',
            color: '#E8EAF0',
            border: '1px solid #1E2130',
            opacity: isImporting ? 0.6 : 1,
          }}
          onMouseEnter={(e) => {
            if (!isImporting) {
              e.currentTarget.style.backgroundColor = '#1A1D26';
              e.currentTarget.style.borderColor = '#2E3250';
            }
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = '#11131A';
            e.currentTarget.style.borderColor = '#1E2130';
          }}
        >
          <Upload size={14} />
          {isImporting ? 'Importing...' : 'Import JSON'}
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".json"
          onChange={handleFileChange}
          className="hidden"
        />
      </motion.div>

      {/* ═══════════════════ KPI Cards Row (6 cards) ═══════════════════ */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3 md:gap-4">
        <StatCard
          label="Total Profit"
          value={stats.totalProfit}
          isCurrencyValue={true}
          change={`${stats.profitMargin.toFixed(1)}% margin`}
          isPositive={true}
          icon={Package}
          iconColor="#34D399"
          iconBg="rgba(52,211,153,0.12)"
          accentColor="#34D399"
          delay={0}
        />
        <StatCard
          label="Total Revenue"
          value={stats.totalRevenue}
          isCurrencyValue={true}
          change={`${formatNumber(stats.totalOrders)} orders`}
          isPositive={true}
          icon={Banknote}
          iconColor="#6366F1"
          iconBg="rgba(99,102,241,0.12)"
          accentColor="#6366F1"
          delay={0.05}
        />
        <StatCard
          label="Total Orders"
          value={stats.totalOrders}
          change={`${formatNumber(stats.soldItems)} items sold`}
          isPositive={true}
          icon={ClipboardList}
          iconColor="#38BDF8"
          iconBg="rgba(56,189,248,0.12)"
          accentColor="#38BDF8"
          delay={0.08}
        />
        <StatCard
          label="Avg Order Value"
          value={stats.avgOrderValue}
          isCurrencyValue={true}
          change="per order"
          isPositive={true}
          icon={BarChart3}
          iconColor="#FBBF24"
          iconBg="rgba(251,191,36,0.12)"
          accentColor="#FBBF24"
          delay={0.11}
        />
        <StatCard
          label="Pending"
          value={stats.pendingRevenue}
          isCurrencyValue={true}
          change={`${formatNumber(stats.pendingOrders)} shipped`}
          isPositive={true}
          icon={Truck}
          iconColor="#FB7185"
          iconBg="rgba(251,113,133,0.12)"
          accentColor="#FB7185"
          delay={0.14}
        />
        <StatCard
          label="Inventory Value"
          value={stats.inventoryValue}
          isCurrencyValue={true}
          change="unsold stock"
          isPositive={true}
          icon={Warehouse}
          iconColor="#38BDF8"
          iconBg="rgba(56,189,248,0.12)"
          accentColor="#38BDF8"
          delay={0.17}
        />
      </div>

      {/* ═══════════════ Charts Row: Profit + Inventory ═══════════════ */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        {/* ── Profit Over Time (area chart) ── */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.22 }}
          className="lg:col-span-2 bg-[#11131A] border border-[#1E2130] rounded-xl p-5"
        >
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-base font-medium" style={{ color: '#E8EAF0' }}>
              Profit Over Time
            </h3>
            <div
              className="flex items-center rounded-md p-0.5"
              style={{ backgroundColor: '#0D0F14' }}
            >
              {timeRanges.map((range) => (
                <button
                  key={range.value}
                  onClick={() => setSelectedTimeRange(range.value)}
                  className="px-3 py-1 rounded-md text-xs font-medium transition-all duration-150"
                  style={{
                    backgroundColor:
                      selectedTimeRange === range.value ? '#222633' : 'transparent',
                    color:
                      selectedTimeRange === range.value ? '#E8EAF0' : '#5C6078',
                  }}
                >
                  {range.label}
                </button>
              ))}
            </div>
          </div>

          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="profitGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#34D399" stopOpacity={0.4} />
                  <stop offset="100%" stopColor="#34D399" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#6366F1" stopOpacity={0.2} />
                  <stop offset="100%" stopColor="#6366F1" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1E2130" vertical={false} />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 11, fill: '#5C6078' }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 11, fill: '#5C6078', fontFamily: 'JetBrains Mono' }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v: number) => formatCurrencyShort(v)}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#11131A',
                  border: '1px solid #1E2130',
                  borderRadius: '8px',
                  color: '#E8EAF0',
                  fontFamily: 'JetBrains Mono',
                }}
                formatter={(value: number, name: string) => [
                  formatCurrency(value),
                  name.charAt(0).toUpperCase() + name.slice(1),
                ]}
              />
              <Area
                type="monotone"
                dataKey="revenue"
                stroke="#6366F1"
                strokeWidth={1.5}
                fill="url(#revenueGradient)"
                dot={false}
              />
              <Area
                type="monotone"
                dataKey="profit"
                stroke="#34D399"
                strokeWidth={2}
                fill="url(#profitGradient)"
                dot={false}
                activeDot={{
                  r: 6,
                  stroke: '#FFFFFF',
                  strokeWidth: 2,
                  fill: '#34D399',
                }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </motion.div>

        {/* ── Inventory Status (donut) ── */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.30 }}
          className="bg-[#11131A] border border-[#1E2130] rounded-xl p-5"
        >
          <h3 className="text-base font-medium mb-4" style={{ color: '#E8EAF0' }}>
            Inventory Status
          </h3>

          <div className="flex flex-col items-center">
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={categoryBreakdown}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={2}
                  dataKey="value"
                  animationBegin={0}
                  animationDuration={500}
                >
                  {categoryBreakdown.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <text
                  x="50%"
                  y="45%"
                  textAnchor="middle"
                  dominantBaseline="central"
                  fill="#E8EAF0"
                  style={{ fontFamily: 'JetBrains Mono', fontSize: '24px', fontWeight: 600 }}
                >
                  {stats.totalItems}
                </text>
                <text
                  x="50%"
                  y="60%"
                  textAnchor="middle"
                  dominantBaseline="central"
                  fill="#5C6078"
                  style={{ fontFamily: 'Inter', fontSize: '11px', fontWeight: 500 }}
                >
                  Total Items
                </text>
              </PieChart>
            </ResponsiveContainer>

            <div className="flex flex-wrap items-center justify-center gap-5 mt-2">
              {categoryBreakdown.map((item) => (
                <div key={item.name} className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }} />
                  <span className="text-xs text-[#8B8FA3]">
                    {item.name} ({item.value})
                  </span>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      </div>

      {/* ═════════ Recent Orders Table + Sales by Platform ═════════ */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        {/* ── Recent Orders (table) ── */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.36 }}
          className="lg:col-span-2 bg-[#11131A] border border-[#1E2130] rounded-xl overflow-hidden"
        >
          <div className="flex items-center justify-between px-5 pt-5 pb-3">
            <h3 className="text-base font-medium" style={{ color: '#E8EAF0' }}>
              Recent Orders
            </h3>
            <Link
              to="/orders"
              className="text-xs font-medium transition-colors duration-150 hover:underline"
              style={{ color: '#6366F1' }}
            >
              View All Orders
            </Link>
          </div>

          <div className="overflow-x-auto -mx-5 px-5">
            <table className="w-full min-w-[600px]">
              <thead>
                <tr style={{ borderBottom: '1px solid #1E2130' }}>
                  <th
                    className="text-left text-xs font-medium uppercase tracking-wider px-5 py-2"
                    style={{ color: '#5C6078' }}
                  >
                    Date
                  </th>
                  <th
                    className="text-left text-xs font-medium uppercase tracking-wider px-4 py-2"
                    style={{ color: '#5C6078' }}
                  >
                    Product
                  </th>
                  <th
                    className="text-center text-xs font-medium uppercase tracking-wider px-4 py-2"
                    style={{ color: '#5C6078' }}
                  >
                    Qty
                  </th>
                  <th
                    className="text-right text-xs font-medium uppercase tracking-wider px-4 py-2"
                    style={{ color: '#5C6078' }}
                  >
                    Sell Price
                  </th>
                  <th
                    className="text-right text-xs font-medium uppercase tracking-wider px-4 py-2"
                    style={{ color: '#5C6078' }}
                  >
                    Total
                  </th>
                  <th
                    className="text-right text-xs font-medium uppercase tracking-wider px-5 py-2"
                    style={{ color: '#5C6078' }}
                  >
                    Platform
                  </th>
                </tr>
              </thead>
              <tbody>
                {recentOrders.map((order, index) => (
                  <motion.tr
                    key={order.id}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.15, delay: 0.40 + index * 0.03 }}
                    className="transition-colors duration-100 hover:bg-[#1A1D26]"
                    style={{
                      borderBottom:
                        index < recentOrders.length - 1 ? '1px solid #1E2130' : undefined,
                    }}
                  >
                    <td className="px-5 py-3 text-xs font-mono" style={{ color: '#5C6078' }}>
                      {new Date(order.date).toLocaleDateString('bs-BA')}
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm font-medium" style={{ color: '#E8EAF0' }}>
                        {order.productName}
                      </span>
                      {order.optionName && (
                        <span className="text-xs ml-1" style={{ color: '#5C6078' }}>
                          ({order.optionName})
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="text-sm font-mono" style={{ color: '#E8EAF0' }}>
                        {order.quantity}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-sm" style={{ color: '#E8EAF0' }}>
                      {formatCurrency(order.sellPrice)}
                    </td>
                    <td
                      className="px-4 py-3 text-right font-mono text-sm font-medium"
                      style={{ color: '#34D399' }}
                    >
                      {formatCurrency(order.totalAmount)}
                    </td>
                    <td className="px-5 py-3 text-right">
                      <span
                        className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium"
                        style={{
                          backgroundColor:
                            order.platform === 'Instagram'
                              ? 'rgba(228,64,95,0.15)'
                              : order.platform === 'Facebook'
                                ? 'rgba(24,119,242,0.15)'
                                : order.platform === 'TikTok'
                                  ? 'rgba(168,85,247,0.15)'
                                  : 'rgba(92,96,120,0.15)',
                          color:
                            order.platform === 'Instagram'
                              ? '#E4405F'
                              : order.platform === 'Facebook'
                                ? '#1877F2'
                                : order.platform === 'TikTok'
                                  ? '#A855F7'
                                  : '#5C6078',
                        }}
                      >
                        {order.platform}
                      </span>
                    </td>
                  </motion.tr>
                ))}
                {recentOrders.length === 0 && (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-5 py-8 text-center text-sm"
                      style={{ color: '#5C6078' }}
                    >
                      No orders yet
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </motion.div>

        {/* ── Sales by Platform (pie chart) ── */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.42 }}
          className="bg-[#11131A] border border-[#1E2130] rounded-xl p-5"
        >
          <h3 className="text-base font-medium mb-4" style={{ color: '#E8EAF0' }}>
            Sales by Platform
          </h3>

          <div className="flex flex-col items-center">
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={platformBreakdown}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={75}
                  paddingAngle={2}
                  dataKey="value"
                  animationBegin={0}
                  animationDuration={500}
                >
                  {platformBreakdown.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#11131A',
                    border: '1px solid #1E2130',
                    borderRadius: '8px',
                    color: '#E8EAF0',
                    fontFamily: 'JetBrains Mono',
                  }}
                  formatter={(value: number) => [formatCurrency(value), 'Revenue']}
                />
              </PieChart>
            </ResponsiveContainer>

            <div className="flex flex-wrap items-center justify-center gap-4 mt-2">
              {platformBreakdown.map((item) => (
                <div key={item.name} className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }} />
                  <span className="text-xs text-[#8B8FA3]">{item.name}</span>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      </div>

      {/* ═══════════════════ Recent Activity Feed ═══════════════════ */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.48 }}
        className="bg-[#11131A] border border-[#1E2130] rounded-xl"
      >
        <div className="flex items-center justify-between px-5 pt-5 pb-3">
          <h3 className="text-base font-medium" style={{ color: '#E8EAF0' }}>
            Recent Activity
          </h3>
          <Link
            to="/inventory"
            className="text-xs font-medium transition-colors duration-150 hover:underline"
            style={{ color: '#6366F1' }}
          >
            View All
          </Link>
        </div>

        <div>
          {recentActivity.map((activity, index) => (
            <motion.div
              key={activity.id}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{
                duration: 0.15,
                delay: 0.52 + index * 0.04,
                ease: [0.0, 0.0, 0.2, 1] as [number, number, number, number],
              }}
              className="flex items-center gap-4 px-5 transition-colors duration-100 hover:bg-[#1A1D26]"
              style={{
                height: '56px',
                borderBottom:
                  index < recentActivity.length - 1 ? '1px solid #1E2130' : undefined,
              }}
            >
              {/* Icon */}
              <div
                className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: '#1A1D26' }}
              >
                {activity.id.startsWith('act-order-') ? (
                  <ShoppingBag size={18} className="text-[#34D399]" />
                ) : activity.type === 'product_added' ? (
                  <Package size={18} className="text-[#6366F1]" />
                ) : activity.type === 'product_sold' ? (
                  <ShoppingBag size={18} className="text-[#34D399]" />
                ) : activity.type === 'cost_added' ? (
                  <Receipt size={18} className="text-[#FB7185]" />
                ) : activity.type === 'price_updated' ? (
                  <Receipt size={18} className="text-[#FBBF24]" />
                ) : activity.type === 'product_restocked' ? (
                  <PackageOpen size={18} className="text-[#6366F1]" />
                ) : null}
              </div>

              {/* Description */}
              <div className="flex-1 min-w-0">
                <span className="text-sm font-medium" style={{ color: '#E8EAF0' }}>
                  {activity.title}
                </span>
                <span className="text-sm" style={{ color: '#8B8FA3' }}>
                  {' '}
                  / {activity.description}
                </span>
              </div>

              {/* Amount */}
              {activity.amount !== undefined && (
                <span
                  className="font-mono text-sm flex-shrink-0"
                  style={{
                    color: activity.amount >= 0 ? '#34D399' : '#FB7185',
                  }}
                >
                  {activity.amount >= 0 ? '+' : ''}
                  {formatCurrency(activity.amount)}
                </span>
              )}

              {/* Timestamp */}
              <span
                className="text-xs flex-shrink-0"
                style={{ color: '#5C6078', minWidth: '50px', textAlign: 'right' }}
              >
                {activity.date}
              </span>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* ══════════════════ Cost Breakdown Bar Chart ══════════════════ */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.54 }}
        className="bg-[#11131A] border border-[#1E2130] rounded-xl p-5"
      >
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-base font-medium" style={{ color: '#E8EAF0' }}>
            Cost Breakdown This Month
          </h3>
          <Link
            to="/costs"
            className="text-xs font-medium transition-colors duration-150 hover:underline"
            style={{ color: '#6366F1' }}
          >
            View All Costs
          </Link>
        </div>

        <ResponsiveContainer width="100%" height={220}>
          <BarChart
            data={costBreakdown}
            layout="vertical"
            margin={{ top: 0, right: 30, left: 20, bottom: 0 }}
            barCategoryGap={12}
          >
            <XAxis type="number" hide />
            <YAxis
              dataKey="category"
              type="category"
              tick={{ fontSize: 12, fill: '#8B8FA3' }}
              axisLine={false}
              tickLine={false}
              width={90}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#11131A',
                border: '1px solid #1E2130',
                borderRadius: '8px',
                color: '#E8EAF0',
                fontFamily: 'JetBrains Mono',
              }}
              formatter={(value: number) => [formatCurrency(value)]}
            />
            <Bar
              dataKey="amount"
              radius={[0, 8, 8, 0]}
              animationDuration={400}
              animationEasing="ease-out"
            >
              {costBreakdown.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </motion.div>

      {/* ═════════════════════ Quick Actions Bar ══════════════════════ */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.6 }}
        className="fixed bottom-4 right-4 hidden md:flex items-center gap-3 z-[300]"
      >
        <Link
          to="/orders/create"
          className="inline-flex items-center gap-2 h-11 px-5 rounded-lg text-sm font-medium transition-all duration-150 shadow-lg"
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
          <ShoppingCart size={16} />
          <span>New Order</span>
        </Link>
        <Link
          to="/inventory/add"
          className="inline-flex items-center gap-2 h-11 px-5 rounded-lg text-sm font-medium transition-all duration-150 shadow-lg"
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
          <Package size={16} />
          <span>Add Item</span>
        </Link>
        <Link
          to="/costs/add"
          className="inline-flex items-center gap-2 h-11 px-5 rounded-lg text-sm font-medium transition-all duration-150 shadow-lg"
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
          <Receipt size={16} />
          <span>Add Cost</span>
        </Link>
      </motion.div>
    </div>
  );
};

export default Dashboard;
