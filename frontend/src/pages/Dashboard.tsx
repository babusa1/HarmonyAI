import { motion } from 'framer-motion';
import {
  Database,
  GitCompare,
  TrendingUp,
  CheckCircle2,
  Clock,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownRight,
  Zap,
  Target,
  BarChart3,
  Package,
} from 'lucide-react';
import { cn, formatNumber, formatCurrency, formatPercentage } from '../lib/utils';

// Mock data for demo
const dashboardData = {
  catalog: { totalProducts: 487, change: 12 },
  retailer: { totalRecords: 2384, change: 156 },
  mappings: {
    total: 2156,
    pending: 234,
    confirmed: 1892,
    matchRate: 87.6,
  },
  sales: {
    last30Days: {
      revenue: 4523000,
      units: 152340,
      growth: 12.4,
    },
  },
  activity: { last24h: 89, last7d: 456 },
};

const recentMappings = [
  { raw: 'CR 3DW RAD MNT 4.8OZ', master: 'Crest 3D White Radiant Mint 4.8oz', confidence: 0.96, status: 'auto_confirmed', retailer: 'Walmart' },
  { raw: 'CG TTL WHTN 5.1', master: 'Colgate Total Whitening 5.1oz', confidence: 0.82, status: 'pending', retailer: 'Target' },
  { raw: 'PEP ORIG 2L', master: 'Pepsi Original 2000ml', confidence: 0.98, status: 'auto_confirmed', retailer: 'Kroger' },
  { raw: 'TD PODS ORIG 42CT', master: 'Tide PODS Original 42ct', confidence: 0.71, status: 'pending', retailer: 'Costco' },
  { raw: 'H&S CLS CLN 400ML', master: 'Head & Shoulders Classic Clean 400ml', confidence: 0.94, status: 'verified', retailer: 'CVS' },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

export default function Dashboard() {
  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-6"
    >
      {/* Page Header */}
      <motion.div variants={itemVariants} className="flex items-end justify-between">
        <div>
          <h1 className="text-3xl font-display font-bold text-surface-50">
            Welcome to <span className="text-gradient">HarmonizeIQ</span>
          </h1>
          <p className="mt-1 text-surface-400">
            AI-powered product data harmonization platform
          </p>
        </div>
        <div className="flex items-center gap-2 text-sm text-surface-400">
          <div className="w-2 h-2 rounded-full bg-accent-mint animate-pulse" />
          <span>Last updated: Just now</span>
        </div>
      </motion.div>

      {/* Stats Grid */}
      <motion.div variants={itemVariants} className="grid grid-cols-4 gap-4">
        {/* Golden Record */}
        <div className="stat-card group hover:border-brand-500/30 transition-all duration-300">
          <div className="flex items-start justify-between">
            <div className="p-2.5 rounded-xl bg-brand-500/10 group-hover:bg-brand-500/20 transition-colors">
              <Database className="w-5 h-5 text-brand-400" />
            </div>
            <span className="flex items-center gap-1 text-xs text-accent-mint">
              <ArrowUpRight className="w-3 h-3" />
              +{dashboardData.catalog.change}
            </span>
          </div>
          <div className="mt-4">
            <p className="text-3xl font-bold text-surface-50">
              {formatNumber(dashboardData.catalog.totalProducts)}
            </p>
            <p className="text-sm text-surface-400 mt-1">Golden Record Products</p>
          </div>
        </div>

        {/* Retailer SKUs */}
        <div className="stat-card group hover:border-accent-violet/30 transition-all duration-300">
          <div className="flex items-start justify-between">
            <div className="p-2.5 rounded-xl bg-accent-violet/10 group-hover:bg-accent-violet/20 transition-colors">
              <Package className="w-5 h-5 text-accent-violet" />
            </div>
            <span className="flex items-center gap-1 text-xs text-accent-mint">
              <ArrowUpRight className="w-3 h-3" />
              +{dashboardData.retailer.change}
            </span>
          </div>
          <div className="mt-4">
            <p className="text-3xl font-bold text-surface-50">
              {formatNumber(dashboardData.retailer.totalRecords)}
            </p>
            <p className="text-sm text-surface-400 mt-1">Retailer SKUs Mapped</p>
          </div>
        </div>

        {/* Match Rate */}
        <div className="stat-card group hover:border-accent-mint/30 transition-all duration-300">
          <div className="flex items-start justify-between">
            <div className="p-2.5 rounded-xl bg-accent-mint/10 group-hover:bg-accent-mint/20 transition-colors">
              <Target className="w-5 h-5 text-accent-mint" />
            </div>
            <span className="flex items-center gap-1 text-xs text-accent-mint">
              <TrendingUp className="w-3 h-3" />
              +2.3%
            </span>
          </div>
          <div className="mt-4">
            <p className="text-3xl font-bold text-surface-50">
              {formatPercentage(dashboardData.mappings.matchRate)}
            </p>
            <p className="text-sm text-surface-400 mt-1">Auto-Match Rate</p>
          </div>
        </div>

        {/* Revenue Impact */}
        <div className="stat-card group hover:border-accent-gold/30 transition-all duration-300">
          <div className="flex items-start justify-between">
            <div className="p-2.5 rounded-xl bg-accent-gold/10 group-hover:bg-accent-gold/20 transition-colors">
              <BarChart3 className="w-5 h-5 text-accent-gold" />
            </div>
            <span className="flex items-center gap-1 text-xs text-accent-mint">
              <ArrowUpRight className="w-3 h-3" />
              +{dashboardData.sales.last30Days.growth}%
            </span>
          </div>
          <div className="mt-4">
            <p className="text-3xl font-bold text-surface-50">
              {formatCurrency(dashboardData.sales.last30Days.revenue)}
            </p>
            <p className="text-sm text-surface-400 mt-1">Harmonized Revenue (30d)</p>
          </div>
        </div>
      </motion.div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-3 gap-6">
        {/* Mapping Status */}
        <motion.div variants={itemVariants} className="col-span-2 card p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-surface-100">Mapping Pipeline</h2>
            <button className="btn-ghost text-sm">View All</button>
          </div>

          {/* Pipeline Stats */}
          <div className="grid grid-cols-4 gap-4 mb-6">
            <div className="p-4 rounded-xl bg-surface-800/50 border border-surface-700/50">
              <div className="flex items-center gap-2 text-accent-mint mb-2">
                <CheckCircle2 className="w-4 h-4" />
                <span className="text-sm font-medium">Auto-Confirmed</span>
              </div>
              <p className="text-2xl font-bold text-surface-100">
                {formatNumber(1456)}
              </p>
            </div>
            <div className="p-4 rounded-xl bg-surface-800/50 border border-surface-700/50">
              <div className="flex items-center gap-2 text-brand-400 mb-2">
                <CheckCircle2 className="w-4 h-4" />
                <span className="text-sm font-medium">Verified</span>
              </div>
              <p className="text-2xl font-bold text-surface-100">
                {formatNumber(436)}
              </p>
            </div>
            <div className="p-4 rounded-xl bg-surface-800/50 border border-surface-700/50">
              <div className="flex items-center gap-2 text-accent-gold mb-2">
                <Clock className="w-4 h-4" />
                <span className="text-sm font-medium">Pending Review</span>
              </div>
              <p className="text-2xl font-bold text-surface-100">
                {formatNumber(dashboardData.mappings.pending)}
              </p>
            </div>
            <div className="p-4 rounded-xl bg-surface-800/50 border border-surface-700/50">
              <div className="flex items-center gap-2 text-accent-coral mb-2">
                <AlertTriangle className="w-4 h-4" />
                <span className="text-sm font-medium">Low Confidence</span>
              </div>
              <p className="text-2xl font-bold text-surface-100">
                {formatNumber(64)}
              </p>
            </div>
          </div>

          {/* Recent Mappings Table */}
          <div className="rounded-xl border border-surface-700/50 overflow-hidden">
            <table className="w-full">
              <thead className="bg-surface-800/50">
                <tr>
                  <th className="text-left text-xs font-medium text-surface-400 px-4 py-3">Retailer Description</th>
                  <th className="text-left text-xs font-medium text-surface-400 px-4 py-3">→</th>
                  <th className="text-left text-xs font-medium text-surface-400 px-4 py-3">Master Product</th>
                  <th className="text-left text-xs font-medium text-surface-400 px-4 py-3">Confidence</th>
                  <th className="text-left text-xs font-medium text-surface-400 px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-800">
                {recentMappings.map((mapping, i) => (
                  <tr key={i} className="hover:bg-surface-800/30 transition-colors">
                    <td className="px-4 py-3">
                      <div>
                        <p className="font-mono text-sm text-surface-300">{mapping.raw}</p>
                        <p className="text-xs text-surface-500 mt-0.5">{mapping.retailer}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <GitCompare className="w-4 h-4 text-surface-500" />
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-sm text-surface-200">{mapping.master}</p>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-1.5 rounded-full bg-surface-700 overflow-hidden">
                          <div 
                            className={cn(
                              "h-full rounded-full",
                              mapping.confidence >= 0.95 ? 'bg-accent-mint' :
                              mapping.confidence >= 0.70 ? 'bg-accent-gold' : 'bg-accent-coral'
                            )}
                            style={{ width: `${mapping.confidence * 100}%` }}
                          />
                        </div>
                        <span className={cn(
                          "text-sm font-mono",
                          mapping.confidence >= 0.95 ? 'text-accent-mint' :
                          mapping.confidence >= 0.70 ? 'text-accent-gold' : 'text-accent-coral'
                        )}>
                          {(mapping.confidence * 100).toFixed(0)}%
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={cn(
                        "badge",
                        mapping.status === 'auto_confirmed' || mapping.status === 'verified' ? 'badge-success' :
                        mapping.status === 'pending' ? 'badge-warning' : 'badge-danger'
                      )}>
                        {mapping.status.replace('_', ' ')}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>

        {/* Right Column */}
        <motion.div variants={itemVariants} className="space-y-6">
          {/* Activity Feed */}
          <div className="card p-6">
            <h2 className="text-lg font-semibold text-surface-100 mb-4">Activity</h2>
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-accent-mint/10">
                  <Zap className="w-4 h-4 text-accent-mint" />
                </div>
                <div>
                  <p className="text-sm text-surface-200">89 mappings auto-confirmed</p>
                  <p className="text-xs text-surface-500 mt-0.5">Last 24 hours</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-brand-500/10">
                  <CheckCircle2 className="w-4 h-4 text-brand-400" />
                </div>
                <div>
                  <p className="text-sm text-surface-200">156 SKUs uploaded from Walmart</p>
                  <p className="text-xs text-surface-500 mt-0.5">2 hours ago</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-accent-gold/10">
                  <Clock className="w-4 h-4 text-accent-gold" />
                </div>
                <div>
                  <p className="text-sm text-surface-200">23 mappings awaiting review</p>
                  <p className="text-xs text-surface-500 mt-0.5">Requires attention</p>
                </div>
              </div>
            </div>
          </div>

          {/* AI Performance */}
          <div className="card p-6">
            <h2 className="text-lg font-semibold text-surface-100 mb-4">AI Performance</h2>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-surface-400">Accuracy Rate</span>
                  <span className="text-accent-mint font-medium">95.2%</span>
                </div>
                <div className="h-2 rounded-full bg-surface-700 overflow-hidden">
                  <div className="h-full w-[95.2%] rounded-full bg-gradient-to-r from-accent-mint to-brand-400" />
                </div>
              </div>
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-surface-400">Semantic Score Avg</span>
                  <span className="text-brand-400 font-medium">0.87</span>
                </div>
                <div className="h-2 rounded-full bg-surface-700 overflow-hidden">
                  <div className="h-full w-[87%] rounded-full bg-gradient-to-r from-brand-500 to-accent-violet" />
                </div>
              </div>
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-surface-400">Processing Speed</span>
                  <span className="text-accent-gold font-medium">1,240/min</span>
                </div>
                <div className="h-2 rounded-full bg-surface-700 overflow-hidden">
                  <div className="h-full w-[78%] rounded-full bg-gradient-to-r from-accent-gold to-accent-coral" />
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}
