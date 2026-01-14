import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  Area,
  AreaChart,
} from 'recharts';
import {
  TrendingUp,
  TrendingDown,
  Target,
  Users,
  DollarSign,
  Package,
  Filter,
  Download,
  Calendar,
} from 'lucide-react';
import { cn, formatCurrency, formatNumber } from '../lib/utils';

// Mock data
const salesTrends = [
  { month: 'Jan', ourRevenue: 380000, competitorRevenue: 420000 },
  { month: 'Feb', ourRevenue: 395000, competitorRevenue: 410000 },
  { month: 'Mar', ourRevenue: 420000, competitorRevenue: 405000 },
  { month: 'Apr', ourRevenue: 445000, competitorRevenue: 430000 },
  { month: 'May', ourRevenue: 460000, competitorRevenue: 445000 },
  { month: 'Jun', ourRevenue: 510000, competitorRevenue: 460000 },
  { month: 'Jul', ourRevenue: 485000, competitorRevenue: 475000 },
  { month: 'Aug', ourRevenue: 520000, competitorRevenue: 490000 },
  { month: 'Sep', ourRevenue: 495000, competitorRevenue: 485000 },
  { month: 'Oct', ourRevenue: 530000, competitorRevenue: 510000 },
  { month: 'Nov', ourRevenue: 580000, competitorRevenue: 545000 },
  { month: 'Dec', ourRevenue: 620000, competitorRevenue: 590000 },
];

const marketShareData = [
  { name: 'Crest', value: 28, color: '#06b6d4' },
  { name: 'Colgate', value: 24, color: '#845ef7' },
  { name: 'Sensodyne', value: 18, color: '#51cf66' },
  { name: 'Oral-B', value: 15, color: '#fcc419' },
  { name: 'Others', value: 15, color: '#64748b' },
];

const categoryPerformance = [
  { category: 'Oral Care', ourSales: 2400000, competitorSales: 2100000, growth: 14.2 },
  { category: 'Beverages', ourSales: 3200000, competitorSales: 2800000, growth: 8.5 },
  { category: 'Personal Care', ourSales: 1800000, competitorSales: 1650000, growth: 12.1 },
  { category: 'Household', ourSales: 2100000, competitorSales: 1900000, growth: 6.8 },
  { category: 'Snacks', ourSales: 1500000, competitorSales: 1400000, growth: 10.3 },
];

const topProducts = [
  { rank: 1, name: 'Crest 3D White Radiant Mint 4.8oz', revenue: 245000, units: 48500, growth: 15.2 },
  { rank: 2, name: 'Pepsi Original 2000ml', revenue: 198000, units: 82000, growth: 8.4 },
  { rank: 3, name: 'Tide PODS Original 42ct', revenue: 187000, units: 12500, growth: 22.1 },
  { rank: 4, name: 'Head & Shoulders Classic 400ml', revenue: 156000, units: 31200, growth: 5.8 },
  { rank: 5, name: "Lay's Classic 10oz", revenue: 142000, units: 47300, growth: 11.3 },
];

const retailerComparison = [
  { retailer: 'Walmart', revenue: 1850000, share: 32 },
  { retailer: 'Target', revenue: 1240000, share: 21 },
  { retailer: 'Kroger', revenue: 980000, share: 17 },
  { retailer: 'Costco', revenue: 1120000, share: 19 },
  { retailer: 'CVS', revenue: 640000, share: 11 },
];

export default function Analytics() {
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [dateRange, setDateRange] = useState('12m');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold text-surface-50">
            Sales Analytics & Benchmarking
          </h1>
          <p className="text-surface-400 mt-1">
            Competitor insights powered by harmonized data
          </p>
        </div>
        <div className="flex items-center gap-3">
          <select 
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            className="input w-36"
          >
            <option value="3m">Last 3 months</option>
            <option value="6m">Last 6 months</option>
            <option value="12m">Last 12 months</option>
          </select>
          <button className="btn-secondary flex items-center gap-2">
            <Filter className="w-4 h-4" />
            Filters
          </button>
          <button className="btn-primary flex items-center gap-2">
            <Download className="w-4 h-4" />
            Export
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-4 gap-4">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="stat-card"
        >
          <div className="flex items-center justify-between">
            <div className="p-2.5 rounded-xl bg-brand-500/10">
              <DollarSign className="w-5 h-5 text-brand-400" />
            </div>
            <span className="flex items-center gap-1 text-xs text-accent-mint">
              <TrendingUp className="w-3 h-3" /> +12.4%
            </span>
          </div>
          <p className="text-3xl font-bold text-surface-50 mt-4">{formatCurrency(5840000)}</p>
          <p className="text-sm text-surface-400 mt-1">Total Revenue (Our Products)</p>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="stat-card"
        >
          <div className="flex items-center justify-between">
            <div className="p-2.5 rounded-xl bg-accent-coral/10">
              <Users className="w-5 h-5 text-accent-coral" />
            </div>
            <span className="flex items-center gap-1 text-xs text-accent-coral">
              <TrendingUp className="w-3 h-3" /> +8.2%
            </span>
          </div>
          <p className="text-3xl font-bold text-surface-50 mt-4">{formatCurrency(4890000)}</p>
          <p className="text-sm text-surface-400 mt-1">Competitor Revenue</p>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="stat-card"
        >
          <div className="flex items-center justify-between">
            <div className="p-2.5 rounded-xl bg-accent-mint/10">
              <Target className="w-5 h-5 text-accent-mint" />
            </div>
            <span className="flex items-center gap-1 text-xs text-accent-mint">
              <TrendingUp className="w-3 h-3" /> +2.1%
            </span>
          </div>
          <p className="text-3xl font-bold text-surface-50 mt-4">54.4%</p>
          <p className="text-sm text-surface-400 mt-1">Market Share</p>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="stat-card"
        >
          <div className="flex items-center justify-between">
            <div className="p-2.5 rounded-xl bg-accent-gold/10">
              <Package className="w-5 h-5 text-accent-gold" />
            </div>
            <span className="flex items-center gap-1 text-xs text-accent-mint">
              <TrendingUp className="w-3 h-3" /> +4.2%
            </span>
          </div>
          <p className="text-3xl font-bold text-surface-50 mt-4">{formatNumber(487)}</p>
          <p className="text-sm text-surface-400 mt-1">Products Tracked</p>
        </motion.div>
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-3 gap-6">
        {/* Sales Trend */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="col-span-2 card p-6"
        >
          <h2 className="text-lg font-semibold text-surface-100 mb-4">Revenue Trend: Us vs Competition</h2>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={salesTrends}>
                <defs>
                  <linearGradient id="ourGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#06b6d4" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="competitorGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#845ef7" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#845ef7" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="month" stroke="#64748b" fontSize={12} />
                <YAxis stroke="#64748b" fontSize={12} tickFormatter={(v) => `$${(v/1000)}K`} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#1e293b', 
                    border: '1px solid #334155',
                    borderRadius: '8px',
                    color: '#f1f5f9'
                  }}
                  formatter={(value: number) => formatCurrency(value)}
                />
                <Legend />
                <Area 
                  type="monotone" 
                  dataKey="ourRevenue" 
                  stroke="#06b6d4" 
                  fill="url(#ourGradient)"
                  strokeWidth={2}
                  name="Our Products"
                />
                <Area 
                  type="monotone" 
                  dataKey="competitorRevenue" 
                  stroke="#845ef7" 
                  fill="url(#competitorGradient)"
                  strokeWidth={2}
                  name="Competitors"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* Market Share Pie */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="card p-6"
        >
          <h2 className="text-lg font-semibold text-surface-100 mb-4">Market Share (Oral Care)</h2>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={marketShareData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={2}
                  dataKey="value"
                  label={({ name, value }) => `${name}: ${value}%`}
                  labelLine={false}
                >
                  {marketShareData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#1e293b', 
                    border: '1px solid #334155',
                    borderRadius: '8px'
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </motion.div>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-2 gap-6">
        {/* Category Performance */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="card p-6"
        >
          <h2 className="text-lg font-semibold text-surface-100 mb-4">Performance by Category</h2>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={categoryPerformance} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis type="number" stroke="#64748b" fontSize={12} tickFormatter={(v) => `$${(v/1000000)}M`} />
                <YAxis type="category" dataKey="category" stroke="#64748b" fontSize={12} width={100} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#1e293b', 
                    border: '1px solid #334155',
                    borderRadius: '8px'
                  }}
                  formatter={(value: number) => formatCurrency(value)}
                />
                <Legend />
                <Bar dataKey="ourSales" fill="#06b6d4" name="Our Products" radius={[0, 4, 4, 0]} />
                <Bar dataKey="competitorSales" fill="#845ef7" name="Competitors" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* Retailer Distribution */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          className="card p-6"
        >
          <h2 className="text-lg font-semibold text-surface-100 mb-4">Revenue by Retailer</h2>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={retailerComparison}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="retailer" stroke="#64748b" fontSize={12} />
                <YAxis stroke="#64748b" fontSize={12} tickFormatter={(v) => `$${(v/1000)}K`} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#1e293b', 
                    border: '1px solid #334155',
                    borderRadius: '8px'
                  }}
                  formatter={(value: number) => formatCurrency(value)}
                />
                <Bar dataKey="revenue" fill="#06b6d4" radius={[4, 4, 0, 0]}>
                  {retailerComparison.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={`hsl(${190 + index * 20}, 70%, 50%)`} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>
      </div>

      {/* Top Products Table */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.8 }}
        className="card"
      >
        <div className="p-6 border-b border-surface-800">
          <h2 className="text-lg font-semibold text-surface-100">Top Performing Products</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-surface-800/50">
              <tr>
                <th className="text-left text-xs font-medium text-surface-400 px-6 py-4">Rank</th>
                <th className="text-left text-xs font-medium text-surface-400 px-6 py-4">Product</th>
                <th className="text-right text-xs font-medium text-surface-400 px-6 py-4">Revenue</th>
                <th className="text-right text-xs font-medium text-surface-400 px-6 py-4">Units Sold</th>
                <th className="text-right text-xs font-medium text-surface-400 px-6 py-4">Growth</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-800">
              {topProducts.map((product) => (
                <tr key={product.rank} className="hover:bg-surface-800/30 transition-colors">
                  <td className="px-6 py-4">
                    <span className={cn(
                      "w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold",
                      product.rank === 1 ? 'bg-accent-gold/20 text-accent-gold' :
                      product.rank === 2 ? 'bg-surface-400/20 text-surface-300' :
                      product.rank === 3 ? 'bg-accent-coral/20 text-accent-coral' :
                      'bg-surface-700 text-surface-400'
                    )}>
                      {product.rank}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-surface-200 font-medium">{product.name}</p>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <p className="text-surface-100 font-mono">{formatCurrency(product.revenue)}</p>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <p className="text-surface-300 font-mono">{formatNumber(product.units)}</p>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <span className={cn(
                      "inline-flex items-center gap-1 font-medium",
                      product.growth > 10 ? 'text-accent-mint' : 
                      product.growth > 5 ? 'text-accent-gold' : 'text-surface-400'
                    )}>
                      <TrendingUp className="w-4 h-4" />
                      +{product.growth}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </motion.div>
    </div>
  );
}
