import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Database,
  GitCompare,
  TrendingUp,
  CheckCircle2,
  Clock,
  AlertTriangle,
  ArrowUpRight,
  Zap,
  Target,
  BarChart3,
  Package,
  RefreshCw,
  Loader2,
} from 'lucide-react';
import { cn, formatNumber, formatCurrency, formatPercentage } from '../lib/utils';
import { fetchDashboardStats, fetchPendingMappings } from '../lib/api';

interface DashboardStats {
  catalog: { totalProducts: number };
  retailer: { totalRecords: number };
  mappings: {
    total: number;
    pending: number;
    autoConfirmed: number;
    verified: number;
    rejected: number;
    manual: number;
    confirmed: number;
    avgConfidence: number;
    avgConfirmedConfidence: number;
    matchRate: string;
    autoMatchRate: string;
    approvalRate: string;
  };
  sales: {
    last30Days: {
      revenue: number;
      units: number;
      daysWithData: number;
    };
  };
  sources: {
    total: number;
    breakdown: Array<{
      code: string;
      name: string;
      skuCount: number;
      mappingCount: number;
      confirmedCount: number;
      matchRate: string;
    }>;
  };
  activity: { last24h: number; last7d: number };
  processing: {
    total: number;
    pending: number;
    processed: number;
    failed: number;
    progress: string;
  };
  confidence: {
    high: number;
    medium: number;
    low: number;
  };
}

interface RecentMapping {
  id: string;
  raw_description: string;
  master_product: string;
  final_confidence: number;
  status: string;
  retailer_name: string;
  retailer_code: string;
}

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
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentMappings, setRecentMappings] = useState<RecentMapping[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  const loadData = async () => {
    setLoading(true);
    try {
      const [dashboardData, pendingData] = await Promise.all([
        fetchDashboardStats(),
        fetchPendingMappings({ page: 1, limit: 5 })
      ]);
      setStats(dashboardData);
      setRecentMappings(pendingData.data || []);
      setLastUpdated(new Date());
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // Auto-refresh every 30 seconds
    const interval = setInterval(loadData, 30000);
    return () => clearInterval(interval);
  }, []);

  if (loading && !stats) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-brand-500" />
          <p className="text-surface-400">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  // Use real data or fallback to defaults
  const data = stats || {
    catalog: { totalProducts: 0 },
    retailer: { totalRecords: 0 },
    mappings: {
      total: 0, pending: 0, autoConfirmed: 0, verified: 0, rejected: 0, manual: 0,
      confirmed: 0, avgConfidence: 0, avgConfirmedConfidence: 0,
      matchRate: '0', autoMatchRate: '0', approvalRate: '0'
    },
    sales: { last30Days: { revenue: 0, units: 0, daysWithData: 0 } },
    sources: { total: 0, breakdown: [] },
    activity: { last24h: 0, last7d: 0 },
    processing: { total: 0, pending: 0, processed: 0, failed: 0, progress: '0' },
    confidence: { high: 0, medium: 0, low: 0 }
  };

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
        <div className="flex items-center gap-4">
          <button 
            onClick={loadData}
            disabled={loading}
            className="btn-ghost text-sm flex items-center gap-2"
          >
            <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
            Refresh
          </button>
          <div className="flex items-center gap-2 text-sm text-surface-400">
            <div className="w-2 h-2 rounded-full bg-accent-mint animate-pulse" />
            <span>Updated: {lastUpdated.toLocaleTimeString()}</span>
          </div>
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
            {data.catalog.totalProducts > 0 && (
              <span className="flex items-center gap-1 text-xs text-accent-mint">
                <ArrowUpRight className="w-3 h-3" />
                Active
              </span>
            )}
          </div>
          <div className="mt-4">
            <p className="text-3xl font-bold text-surface-50">
              {formatNumber(data.catalog.totalProducts)}
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
            {data.sources.total > 0 && (
              <span className="text-xs text-surface-400">
                {data.sources.total} retailer{data.sources.total > 1 ? 's' : ''}
              </span>
            )}
          </div>
          <div className="mt-4">
            <p className="text-3xl font-bold text-surface-50">
              {formatNumber(data.retailer.totalRecords)}
            </p>
            <p className="text-sm text-surface-400 mt-1">Retailer SKUs Processed</p>
          </div>
        </div>

        {/* Auto-Match Rate */}
        <div className="stat-card group hover:border-accent-mint/30 transition-all duration-300">
          <div className="flex items-start justify-between">
            <div className="p-2.5 rounded-xl bg-accent-mint/10 group-hover:bg-accent-mint/20 transition-colors">
              <Target className="w-5 h-5 text-accent-mint" />
            </div>
            {parseFloat(data.mappings.autoMatchRate) > 80 && (
              <span className="flex items-center gap-1 text-xs text-accent-mint">
                <TrendingUp className="w-3 h-3" />
                Strong
              </span>
            )}
          </div>
          <div className="mt-4">
            <p className="text-3xl font-bold text-surface-50">
              {formatPercentage(parseFloat(data.mappings.autoMatchRate))}
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
            {data.sales.last30Days.daysWithData > 0 && (
              <span className="text-xs text-surface-400">
                {data.sales.last30Days.daysWithData} days
              </span>
            )}
          </div>
          <div className="mt-4">
            <p className="text-3xl font-bold text-surface-50">
              {formatCurrency(data.sales.last30Days.revenue)}
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
            <a href="/hitl" className="btn-ghost text-sm">View All Pending</a>
          </div>

          {/* Pipeline Stats */}
          <div className="grid grid-cols-4 gap-4 mb-6">
            <div className="p-4 rounded-xl bg-surface-800/50 border border-surface-700/50">
              <div className="flex items-center gap-2 text-accent-mint mb-2">
                <CheckCircle2 className="w-4 h-4" />
                <span className="text-sm font-medium">Auto-Confirmed</span>
              </div>
              <p className="text-2xl font-bold text-surface-100">
                {formatNumber(data.mappings.autoConfirmed)}
              </p>
            </div>
            <div className="p-4 rounded-xl bg-surface-800/50 border border-surface-700/50">
              <div className="flex items-center gap-2 text-brand-400 mb-2">
                <CheckCircle2 className="w-4 h-4" />
                <span className="text-sm font-medium">Verified</span>
              </div>
              <p className="text-2xl font-bold text-surface-100">
                {formatNumber(data.mappings.verified)}
              </p>
            </div>
            <div className="p-4 rounded-xl bg-surface-800/50 border border-surface-700/50">
              <div className="flex items-center gap-2 text-accent-gold mb-2">
                <Clock className="w-4 h-4" />
                <span className="text-sm font-medium">Pending Review</span>
              </div>
              <p className="text-2xl font-bold text-surface-100">
                {formatNumber(data.mappings.pending)}
              </p>
            </div>
            <div className="p-4 rounded-xl bg-surface-800/50 border border-surface-700/50">
              <div className="flex items-center gap-2 text-accent-coral mb-2">
                <AlertTriangle className="w-4 h-4" />
                <span className="text-sm font-medium">Low Confidence</span>
              </div>
              <p className="text-2xl font-bold text-surface-100">
                {formatNumber(data.confidence.low)}
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
                {recentMappings.length > 0 ? (
                  recentMappings.map((mapping, i) => (
                    <tr key={mapping.id || i} className="hover:bg-surface-800/30 transition-colors">
                      <td className="px-4 py-3">
                        <div>
                          <p className="font-mono text-sm text-surface-300">{mapping.raw_description}</p>
                          <p className="text-xs text-surface-500 mt-0.5">{mapping.retailer_name}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <GitCompare className="w-4 h-4 text-surface-500" />
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-sm text-surface-200">{mapping.master_product}</p>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-1.5 rounded-full bg-surface-700 overflow-hidden">
                            <div 
                              className={cn(
                                "h-full rounded-full",
                                mapping.final_confidence >= 0.90 ? 'bg-accent-mint' :
                                mapping.final_confidence >= 0.60 ? 'bg-accent-gold' : 'bg-accent-coral'
                              )}
                              style={{ width: `${Number(mapping.final_confidence) * 100}%` }}
                            />
                          </div>
                          <span className={cn(
                            "text-sm font-mono",
                            mapping.final_confidence >= 0.90 ? 'text-accent-mint' :
                            mapping.final_confidence >= 0.60 ? 'text-accent-gold' : 'text-accent-coral'
                          )}>
                            {(Number(mapping.final_confidence) * 100).toFixed(0)}%
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
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-surface-400">
                      No pending mappings. Upload retailer data to start matching!
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </motion.div>

        {/* Right Column */}
        <motion.div variants={itemVariants} className="space-y-6">
          {/* Retailer Breakdown */}
          {data.sources.breakdown.length > 0 && (
            <div className="card p-6">
              <h2 className="text-lg font-semibold text-surface-100 mb-4">Retailers</h2>
              <div className="space-y-3">
                {data.sources.breakdown.map((retailer) => (
                  <div key={retailer.code} className="flex items-center justify-between p-3 rounded-lg bg-surface-800/50">
                    <div>
                      <p className="text-sm font-medium text-surface-200">{retailer.name}</p>
                      <p className="text-xs text-surface-500">{retailer.skuCount} SKUs</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-accent-mint">{retailer.matchRate}%</p>
                      <p className="text-xs text-surface-500">matched</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Activity Feed */}
          <div className="card p-6">
            <h2 className="text-lg font-semibold text-surface-100 mb-4">Activity</h2>
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-accent-mint/10">
                  <Zap className="w-4 h-4 text-accent-mint" />
                </div>
                <div>
                  <p className="text-sm text-surface-200">{formatNumber(data.activity.last24h)} mappings processed</p>
                  <p className="text-xs text-surface-500 mt-0.5">Last 24 hours</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-brand-500/10">
                  <CheckCircle2 className="w-4 h-4 text-brand-400" />
                </div>
                <div>
                  <p className="text-sm text-surface-200">{formatNumber(data.mappings.autoConfirmed)} auto-confirmed</p>
                  <p className="text-xs text-surface-500 mt-0.5">High confidence matches</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-accent-gold/10">
                  <Clock className="w-4 h-4 text-accent-gold" />
                </div>
                <div>
                  <p className="text-sm text-surface-200">{formatNumber(data.mappings.pending)} awaiting review</p>
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
                  <span className="text-surface-400">Approval Rate</span>
                  <span className="text-accent-mint font-medium">{data.mappings.approvalRate}%</span>
                </div>
                <div className="h-2 rounded-full bg-surface-700 overflow-hidden">
                  <div 
                    className="h-full rounded-full bg-gradient-to-r from-accent-mint to-brand-400" 
                    style={{ width: `${parseFloat(data.mappings.approvalRate)}%` }}
                  />
                </div>
              </div>
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-surface-400">Avg Confidence</span>
                  <span className="text-brand-400 font-medium">{(data.mappings.avgConfidence * 100).toFixed(0)}%</span>
                </div>
                <div className="h-2 rounded-full bg-surface-700 overflow-hidden">
                  <div 
                    className="h-full rounded-full bg-gradient-to-r from-brand-500 to-accent-violet" 
                    style={{ width: `${data.mappings.avgConfidence * 100}%` }}
                  />
                </div>
              </div>
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-surface-400">High Confidence</span>
                  <span className="text-accent-gold font-medium">
                    {formatNumber(data.confidence.high)} / {formatNumber(data.mappings.total)}
                  </span>
                </div>
                <div className="h-2 rounded-full bg-surface-700 overflow-hidden">
                  <div 
                    className="h-full rounded-full bg-gradient-to-r from-accent-gold to-accent-coral" 
                    style={{ width: `${data.mappings.total > 0 ? (data.confidence.high / data.mappings.total) * 100 : 0}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}
