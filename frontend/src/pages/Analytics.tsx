import { useState, useEffect } from 'react';
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
  Loader2,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';
import { cn, formatCurrency, formatNumber } from '../lib/utils';
import api, {
  fetchDashboardStats,
  fetchMarketShare,
  fetchTopProducts,
  fetchBenchmark,
} from '../lib/api';

// Chart colors
const COLORS = ['#06b6d4', '#845ef7', '#51cf66', '#fcc419', '#ff6b6b', '#64748b'];

interface AnalyticsSummary {
  overview: {
    totalMasterProducts: number;
    totalRetailerSKUs: number;
    totalMappings: number;
    pendingReview: number;
    autoConfirmRate: string;
    avgConfidence: string;
    retailerCount: number;
  };
  byRetailer: Array<{
    retailer: string;
    total_skus: string;
    mapped_skus: string;
    pending_skus: string;
    avg_confidence: string;
  }>;
}

interface MarketShareItem {
  brand: string;
  category: string;
  isCompetitor: boolean;
  revenue: number;
  units: number;
  marketShare: string;
}

interface TopProduct {
  rank: number;
  productId: string;
  productName: string;
  brand: string;
  category: string;
  isCompetitor: boolean;
  revenue: number;
  units: number;
  retailerCount: number;
}

interface BenchmarkData {
  category: string;
  month: string;
  our_revenue: number;
  competitor_revenue: number;
  our_units: number;
  competitor_units: number;
  our_market_share: number;
}

export default function Analytics() {
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState('12m');
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [marketShare, setMarketShare] = useState<MarketShareItem[]>([]);
  const [topProducts, setTopProducts] = useState<TopProduct[]>([]);
  const [benchmark, setBenchmark] = useState<BenchmarkData[]>([]);
  const [dashboardStats, setDashboardStats] = useState<any>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const periodMap: Record<string, string> = {
        '3m': 'last_3_months',
        '6m': 'last_6_months',
        '12m': 'last_12_months',
      };

      const [summaryRes, marketShareRes, topProductsRes, benchmarkRes, dashboardRes] = await Promise.all([
        api.get('/export/analytics/summary').then(r => r.data).catch(() => null),
        fetchMarketShare({ period: periodMap[dateRange] }).catch(() => []),
        fetchTopProducts({ limit: 10, includeCompetitors: true }).catch(() => []),
        fetchBenchmark({}).catch(() => []),
        fetchDashboardStats().catch(() => null),
      ]);

      setSummary(summaryRes);
      setMarketShare(marketShareRes);
      setTopProducts(topProductsRes);
      setBenchmark(benchmarkRes);
      setDashboardStats(dashboardRes);
    } catch (error) {
      console.error('Failed to load analytics data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [dateRange]);

  // Transform data for charts
  const marketShareChartData = marketShare.length > 0 
    ? marketShare.slice(0, 5).map((item, index) => ({
        name: item.brand || 'Unknown',
        value: parseFloat(item.marketShare) || 0,
        color: COLORS[index % COLORS.length],
      }))
    : [
        { name: 'No Data', value: 100, color: '#64748b' }
      ];

  const retailerChartData = summary?.byRetailer?.map((r, index) => ({
    retailer: r.retailer,
    skus: parseInt(r.total_skus),
    mapped: parseInt(r.mapped_skus),
    pending: parseInt(r.pending_skus),
  })) || [];

  // Transform benchmark data for trend chart
  const trendData = benchmark.length > 0
    ? benchmark.map(b => ({
        month: b.month,
        ourRevenue: b.our_revenue,
        competitorRevenue: b.competitor_revenue,
      }))
    : [];

  // Category performance from market share
  const categoryData = marketShare.reduce((acc: any[], item) => {
    const existing = acc.find(a => a.category === item.category);
    if (existing) {
      if (item.isCompetitor) {
        existing.competitorSales += item.revenue;
      } else {
        existing.ourSales += item.revenue;
      }
    } else {
      acc.push({
        category: item.category || 'Other',
        ourSales: item.isCompetitor ? 0 : item.revenue,
        competitorSales: item.isCompetitor ? item.revenue : 0,
      });
    }
    return acc;
  }, []);

  const handleExport = async () => {
    try {
      const response = await api.get('/export/mappings?format=csv', { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'harmonized_data.csv');
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error('Export failed:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-brand-500" />
          <p className="text-surface-400">Loading analytics...</p>
        </div>
      </div>
    );
  }

  // Calculate KPIs from real data
  const totalMasterProducts = summary?.overview?.totalMasterProducts || dashboardStats?.catalog?.totalProducts || 0;
  const totalRetailerSKUs = summary?.overview?.totalRetailerSKUs || dashboardStats?.retailer?.totalRecords || 0;
  const totalMappings = summary?.overview?.totalMappings || dashboardStats?.mappings?.confirmed || 0;
  const pendingReview = summary?.overview?.pendingReview || dashboardStats?.mappings?.pending || 0;
  const avgConfidence = summary?.overview?.avgConfidence || 
    (dashboardStats?.mappings?.avgConfidence ? `${(dashboardStats.mappings.avgConfidence * 100).toFixed(1)}%` : 'N/A');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold text-surface-50">
            Sales Analytics & Benchmarking
          </h1>
          <p className="text-surface-400 mt-1">
            Real-time insights from harmonized data
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={loadData}
            className="btn-ghost text-sm flex items-center gap-2"
          >
            <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
            Refresh
          </button>
          <select 
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            className="input w-36"
          >
            <option value="3m">Last 3 months</option>
            <option value="6m">Last 6 months</option>
            <option value="12m">Last 12 months</option>
          </select>
          <button onClick={handleExport} className="btn-primary flex items-center gap-2">
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
              <Package className="w-5 h-5 text-brand-400" />
            </div>
          </div>
          <p className="text-3xl font-bold text-surface-50 mt-4">{formatNumber(totalMasterProducts)}</p>
          <p className="text-sm text-surface-400 mt-1">Master Products</p>
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
          </div>
          <p className="text-3xl font-bold text-surface-50 mt-4">{formatNumber(totalRetailerSKUs)}</p>
          <p className="text-sm text-surface-400 mt-1">Retailer SKUs</p>
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
            <span className="text-xs text-surface-400">
              {pendingReview} pending
            </span>
          </div>
          <p className="text-3xl font-bold text-surface-50 mt-4">{formatNumber(totalMappings)}</p>
          <p className="text-sm text-surface-400 mt-1">Confirmed Mappings</p>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="stat-card"
        >
          <div className="flex items-center justify-between">
            <div className="p-2.5 rounded-xl bg-accent-gold/10">
              <TrendingUp className="w-5 h-5 text-accent-gold" />
            </div>
          </div>
          <p className="text-3xl font-bold text-surface-50 mt-4">{avgConfidence}</p>
          <p className="text-sm text-surface-400 mt-1">Avg Confidence</p>
        </motion.div>
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-3 gap-6">
        {/* Revenue by Retailer */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="col-span-2 card p-6"
        >
          <h2 className="text-lg font-semibold text-surface-100 mb-4">SKU Distribution by Retailer</h2>
          {retailerChartData.length > 0 ? (
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={retailerChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis dataKey="retailer" stroke="#64748b" fontSize={12} />
                  <YAxis stroke="#64748b" fontSize={12} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#1e293b', 
                      border: '1px solid #334155',
                      borderRadius: '8px',
                      color: '#f1f5f9'
                    }}
                  />
                  <Legend />
                  <Bar dataKey="mapped" fill="#06b6d4" name="Mapped SKUs" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="pending" fill="#845ef7" name="Pending Review" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-80 flex items-center justify-center text-surface-400">
              <div className="text-center">
                <AlertCircle className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>No retailer data available</p>
                <p className="text-sm">Upload retailer data to see distribution</p>
              </div>
            </div>
          )}
        </motion.div>

        {/* Market Share Pie */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="card p-6"
        >
          <h2 className="text-lg font-semibold text-surface-100 mb-4">Market Share by Brand</h2>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={marketShareChartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={2}
                  dataKey="value"
                  label={({ name, value }) => `${name}: ${value.toFixed(1)}%`}
                  labelLine={false}
                >
                  {marketShareChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#1e293b', 
                    border: '1px solid #334155',
                    borderRadius: '8px'
                  }}
                  formatter={(value: number) => `${value.toFixed(1)}%`}
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
          {categoryData.length > 0 ? (
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={categoryData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis type="number" stroke="#64748b" fontSize={12} tickFormatter={(v) => formatCurrency(v)} />
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
          ) : (
            <div className="h-72 flex items-center justify-center text-surface-400">
              <div className="text-center">
                <AlertCircle className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>No sales data available</p>
                <p className="text-sm">Upload sales data to see category performance</p>
              </div>
            </div>
          )}
        </motion.div>

        {/* Confidence Distribution */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          className="card p-6"
        >
          <h2 className="text-lg font-semibold text-surface-100 mb-4">Confidence Distribution</h2>
          {dashboardStats?.confidence ? (
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={[
                      { name: 'High (≥90%)', value: dashboardStats.confidence.high, color: '#51cf66' },
                      { name: 'Medium (60-90%)', value: dashboardStats.confidence.medium, color: '#fcc419' },
                      { name: 'Low (<60%)', value: dashboardStats.confidence.low, color: '#ff6b6b' },
                    ]}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={90}
                    paddingAngle={2}
                    dataKey="value"
                    label={({ name, value }) => `${name}: ${value}`}
                    labelLine={false}
                  >
                    <Cell fill="#51cf66" />
                    <Cell fill="#fcc419" />
                    <Cell fill="#ff6b6b" />
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
          ) : (
            <div className="h-72 flex items-center justify-center text-surface-400">
              <div className="text-center">
                <AlertCircle className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>No confidence data available</p>
                <p className="text-sm">Process data to see confidence distribution</p>
              </div>
            </div>
          )}
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
          <h2 className="text-lg font-semibold text-surface-100">Top Mapped Products</h2>
        </div>
        {topProducts.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-surface-800/50">
                <tr>
                  <th className="text-left text-xs font-medium text-surface-400 px-6 py-4">Rank</th>
                  <th className="text-left text-xs font-medium text-surface-400 px-6 py-4">Product</th>
                  <th className="text-left text-xs font-medium text-surface-400 px-6 py-4">Brand</th>
                  <th className="text-left text-xs font-medium text-surface-400 px-6 py-4">Category</th>
                  <th className="text-right text-xs font-medium text-surface-400 px-6 py-4">Revenue</th>
                  <th className="text-right text-xs font-medium text-surface-400 px-6 py-4">Units</th>
                  <th className="text-center text-xs font-medium text-surface-400 px-6 py-4">Retailers</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-800">
                {topProducts.map((product) => (
                  <tr key={product.productId} className="hover:bg-surface-800/30 transition-colors">
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
                      <p className="text-surface-200 font-medium">{product.productName}</p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-surface-300">{product.brand || 'N/A'}</p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-surface-300">{product.category || 'N/A'}</p>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <p className="text-surface-100 font-mono">{formatCurrency(product.revenue)}</p>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <p className="text-surface-300 font-mono">{formatNumber(product.units)}</p>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="px-2 py-1 bg-brand-500/20 text-brand-400 rounded-full text-xs">
                        {product.retailerCount}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-12 text-center text-surface-400">
            <AlertCircle className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>No product data available</p>
            <p className="text-sm">Upload and process data to see top products</p>
          </div>
        )}
      </motion.div>
    </div>
  );
}
