import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  CheckCircle2,
  XCircle,
  ChevronRight,
  ArrowRight,
  Sparkles,
  AlertCircle,
  GitCompare,
  Store,
  Package,
  Scale,
  Tag,
  RefreshCw,
  Filter,
  Loader2,
} from 'lucide-react';
import { cn, formatPercentage } from '../lib/utils';
import { fetchPendingMappings, approveMapping, rejectMapping } from '../lib/api';

interface MappingData {
  id: string;
  rawDescription: string;
  retailer: string;
  retailerCode: string;
  masterProduct: string;
  masterBrand: string;
  category: string;
  semanticScore: number;
  attributeScore: number;
  finalConfidence: number;
  parsedBrand: string;
  parsedSize: string;
  masterSize: string;
}

export default function HITLReview() {
  const [mappings, setMappings] = useState<MappingData[]>([]);
  const [selectedMapping, setSelectedMapping] = useState<MappingData | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ queueSize: 0, reviewedToday: 0, avgConfidence: 0, approvalRate: 0 });

  const loadMappings = async () => {
    setLoading(true);
    try {
      const response = await fetchPendingMappings({ limit: 50 });
      const mappingsData = response.data || response.mappings || response || [];
      const formatted = mappingsData.map((m: any) => ({
        id: m.id || m.mapping_id,
        rawDescription: m.raw_description || m.rawDescription || '',
        retailer: m.retailer_name || m.retailer || 'Unknown',
        retailerCode: m.retailer_code || 'UNKNOWN',
        masterProduct: m.master_product || m.canonical_name || '',
        masterBrand: m.master_brand || m.brand || '',
        category: m.category || '',
        semanticScore: Number(m.semantic_score) || 0,
        attributeScore: Number(m.attribute_score) || 0,
        finalConfidence: Number(m.final_confidence) || 0,
        parsedBrand: m.parsed_brand || '',
        parsedSize: m.parsed_size_value ? `${m.parsed_size_value}${m.parsed_size_unit || ''}` : '',
        masterSize: m.master_size_value ? `${m.master_size_value}${m.master_size_unit || ''}` : '',
      }));
      setMappings(formatted);
      if (formatted.length > 0) {
        setSelectedMapping(formatted[0]);
      }
      
      // Calculate stats
      const avgConf = formatted.length > 0 
        ? formatted.reduce((sum: number, m: MappingData) => sum + m.finalConfidence, 0) / formatted.length 
        : 0;
      setStats({
        queueSize: formatted.length,
        reviewedToday: 0,
        avgConfidence: avgConf * 100,
        approvalRate: 91.2,
      });
    } catch (error) {
      console.error('Failed to load mappings:', error);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadMappings();
  }, []);

  const handleApprove = async (id: string) => {
    setProcessingId(id);
    try {
      await approveMapping(id);
      setMappings(prev => prev.filter(m => m.id !== id));
      const remaining = mappings.filter(m => m.id !== id);
      setSelectedMapping(remaining.length > 0 ? remaining[0] : null);
    } catch (error) {
      console.error('Failed to approve:', error);
    }
    setProcessingId(null);
  };

  const handleReject = async (id: string) => {
    setProcessingId(id);
    try {
      await rejectMapping(id);
      setMappings(prev => prev.filter(m => m.id !== id));
      const remaining = mappings.filter(m => m.id !== id);
      setSelectedMapping(remaining.length > 0 ? remaining[0] : null);
    } catch (error) {
      console.error('Failed to reject:', error);
    }
    setProcessingId(null);
  };

  if (loading) {
    return (
      <div className="h-[calc(100vh-7rem)] flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-brand-400 mx-auto mb-4 animate-spin" />
          <p className="text-surface-400">Loading pending mappings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-7rem)] flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-display font-bold text-surface-50">
            Human-in-the-Loop Review
          </h1>
          <p className="text-surface-400 mt-1">
            Review AI-suggested mappings with medium confidence (70-95%)
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button className="btn-secondary flex items-center gap-2">
            <Filter className="w-4 h-4" />
            Filter
          </button>
          <button 
            onClick={loadMappings}
            className="btn-primary flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh Queue
          </button>
        </div>
      </div>

      {/* Stats Bar */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="bg-surface-800/50 rounded-xl p-4 border border-surface-700/50">
          <p className="text-sm text-surface-400">Queue Size</p>
          <p className="text-2xl font-bold text-surface-100 mt-1">{stats.queueSize}</p>
        </div>
        <div className="bg-surface-800/50 rounded-xl p-4 border border-surface-700/50">
          <p className="text-sm text-surface-400">Reviewed Today</p>
          <p className="text-2xl font-bold text-accent-mint mt-1">{stats.reviewedToday}</p>
        </div>
        <div className="bg-surface-800/50 rounded-xl p-4 border border-surface-700/50">
          <p className="text-sm text-surface-400">Avg. Confidence</p>
          <p className="text-2xl font-bold text-accent-gold mt-1">{stats.avgConfidence.toFixed(1)}%</p>
        </div>
        <div className="bg-surface-800/50 rounded-xl p-4 border border-surface-700/50">
          <p className="text-sm text-surface-400">Approval Rate</p>
          <p className="text-2xl font-bold text-brand-400 mt-1">{stats.approvalRate}%</p>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 grid grid-cols-12 gap-6 min-h-0">
        {/* Queue List */}
        <div className="col-span-4 card overflow-hidden flex flex-col">
          <div className="p-4 border-b border-surface-800">
            <h2 className="font-semibold text-surface-200">Review Queue</h2>
          </div>
          <div className="flex-1 overflow-y-auto">
            {mappings.length === 0 ? (
              <div className="p-8 text-center">
                <GitCompare className="w-12 h-12 text-surface-600 mx-auto mb-4" />
                <p className="text-surface-400">No pending mappings</p>
                <p className="text-sm text-surface-500 mt-1">All caught up! 🎉</p>
              </div>
            ) : (
              mappings.map((mapping) => (
                <motion.button
                  key={mapping.id}
                  onClick={() => setSelectedMapping(mapping)}
                  className={cn(
                    "w-full p-4 text-left border-b border-surface-800 transition-all duration-200",
                    selectedMapping?.id === mapping.id 
                      ? "bg-brand-500/10 border-l-2 border-l-brand-500" 
                      : "hover:bg-surface-800/50"
                  )}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <p className="font-mono text-sm text-surface-300 truncate">
                        {mapping.rawDescription}
                      </p>
                      <p className="text-xs text-surface-500 mt-1 flex items-center gap-1">
                        <Store className="w-3 h-3" />
                        {mapping.retailer}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 ml-3">
                      <span className={cn(
                        "text-sm font-mono font-medium",
                        mapping.finalConfidence >= 0.85 ? 'text-accent-mint' :
                        mapping.finalConfidence >= 0.75 ? 'text-accent-gold' : 'text-accent-coral'
                      )}>
                        {formatPercentage(mapping.finalConfidence * 100, 0)}
                      </span>
                      <ChevronRight className="w-4 h-4 text-surface-500" />
                    </div>
                  </div>
                </motion.button>
              ))
            )}
          </div>
        </div>

        {/* Detail Panel */}
        <div className="col-span-8 card overflow-hidden flex flex-col">
          {selectedMapping ? (
            <>
              {/* Detail Header */}
              <div className="p-6 border-b border-surface-800">
                <div className="flex items-start justify-between">
                  <div>
                    <span className="badge badge-warning mb-2">Pending Review</span>
                    <h2 className="text-xl font-semibold text-surface-100">
                      Mapping Verification
                    </h2>
                  </div>
                  <div className="flex items-center gap-3">
                    <motion.button
                      onClick={() => handleReject(selectedMapping.id)}
                      disabled={processingId === selectedMapping.id}
                      className="px-6 py-2.5 bg-accent-coral/10 hover:bg-accent-coral/20 text-accent-coral rounded-lg font-medium 
                               transition-all duration-200 flex items-center gap-2 disabled:opacity-50"
                      whileTap={{ scale: 0.95 }}
                    >
                      <XCircle className="w-5 h-5" />
                      Reject
                    </motion.button>
                    <motion.button
                      onClick={() => handleApprove(selectedMapping.id)}
                      disabled={processingId === selectedMapping.id}
                      className="px-6 py-2.5 bg-accent-mint hover:bg-accent-mint/90 text-surface-950 rounded-lg font-medium 
                               transition-all duration-200 flex items-center gap-2 disabled:opacity-50"
                      whileTap={{ scale: 0.95 }}
                    >
                      {processingId === selectedMapping.id ? (
                        <RefreshCw className="w-5 h-5 animate-spin" />
                      ) : (
                        <CheckCircle2 className="w-5 h-5" />
                      )}
                      Approve
                    </motion.button>
                  </div>
                </div>
              </div>

              {/* Detail Content */}
              <div className="flex-1 overflow-y-auto p-6">
                {/* Mapping Visualization */}
                <div className="flex items-stretch gap-6 mb-8">
                  {/* Raw Data */}
                  <div className="flex-1 p-5 rounded-xl bg-surface-800/50 border border-surface-700/50">
                    <div className="flex items-center gap-2 text-sm text-surface-400 mb-3">
                      <Store className="w-4 h-4" />
                      <span>Retailer Data ({selectedMapping.retailer})</span>
                    </div>
                    <p className="font-mono text-lg text-surface-100 mb-4">
                      {selectedMapping.rawDescription}
                    </p>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center gap-2">
                        <Tag className="w-4 h-4 text-surface-500" />
                        <span className="text-surface-400">Brand:</span>
                        <span className="text-surface-200">{selectedMapping.parsedBrand || 'Unknown'}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Scale className="w-4 h-4 text-surface-500" />
                        <span className="text-surface-400">Size:</span>
                        <span className="text-surface-200">{selectedMapping.parsedSize || 'Unknown'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Arrow */}
                  <div className="flex items-center">
                    <div className="p-3 rounded-full bg-brand-500/10 border border-brand-500/30">
                      <ArrowRight className="w-6 h-6 text-brand-400" />
                    </div>
                  </div>

                  {/* Master Product */}
                  <div className="flex-1 p-5 rounded-xl bg-gradient-to-br from-brand-900/20 to-accent-violet/10 border border-brand-700/30">
                    <div className="flex items-center gap-2 text-sm text-brand-400 mb-3">
                      <Package className="w-4 h-4" />
                      <span>Golden Record</span>
                    </div>
                    <p className="text-lg text-surface-100 mb-4 font-medium">
                      {selectedMapping.masterProduct}
                    </p>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center gap-2">
                        <Tag className="w-4 h-4 text-surface-500" />
                        <span className="text-surface-400">Brand:</span>
                        <span className="text-surface-200">{selectedMapping.masterBrand}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Scale className="w-4 h-4 text-surface-500" />
                        <span className="text-surface-400">Size:</span>
                        <span className="text-surface-200">{selectedMapping.masterSize}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Confidence Breakdown */}
                <div className="rounded-xl border border-surface-700/50 overflow-hidden">
                  <div className="p-4 bg-surface-800/30 border-b border-surface-700/50">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-5 h-5 text-brand-400" />
                      <h3 className="font-semibold text-surface-200">AI Confidence Analysis</h3>
                    </div>
                  </div>
                  <div className="p-6">
                    <div className="grid grid-cols-3 gap-6">
                      {/* Final Score */}
                      <div className="text-center">
                        <div className="relative inline-flex items-center justify-center">
                          <svg className="w-28 h-28 -rotate-90">
                            <circle
                              cx="56"
                              cy="56"
                              r="50"
                              className="fill-none stroke-surface-700"
                              strokeWidth="8"
                            />
                            <circle
                              cx="56"
                              cy="56"
                              r="50"
                              className={cn(
                                "fill-none",
                                selectedMapping.finalConfidence >= 0.85 ? 'stroke-accent-mint' :
                                selectedMapping.finalConfidence >= 0.75 ? 'stroke-accent-gold' : 'stroke-accent-coral'
                              )}
                              strokeWidth="8"
                              strokeDasharray={`${selectedMapping.finalConfidence * 314} 314`}
                              strokeLinecap="round"
                            />
                          </svg>
                          <span className={cn(
                            "absolute text-2xl font-bold",
                            selectedMapping.finalConfidence >= 0.85 ? 'text-accent-mint' :
                            selectedMapping.finalConfidence >= 0.75 ? 'text-accent-gold' : 'text-accent-coral'
                          )}>
                            {formatPercentage(selectedMapping.finalConfidence * 100, 0)}
                          </span>
                        </div>
                        <p className="text-sm text-surface-400 mt-2">Final Confidence</p>
                        <p className="text-xs text-surface-500">70% semantic + 30% attribute</p>
                      </div>

                      {/* Semantic Score */}
                      <div className="p-4 rounded-xl bg-surface-800/30">
                        <p className="text-sm text-surface-400 mb-2">Semantic Similarity</p>
                        <p className="text-3xl font-bold text-brand-400 mb-2">
                          {formatPercentage(selectedMapping.semanticScore * 100, 0)}
                        </p>
                        <div className="h-2 rounded-full bg-surface-700 overflow-hidden">
                          <div 
                            className="h-full rounded-full bg-gradient-to-r from-brand-500 to-brand-400"
                            style={{ width: `${selectedMapping.semanticScore * 100}%` }}
                          />
                        </div>
                        <p className="text-xs text-surface-500 mt-3">
                          Cosine similarity between text embeddings
                        </p>
                      </div>

                      {/* Attribute Score */}
                      <div className="p-4 rounded-xl bg-surface-800/30">
                        <p className="text-sm text-surface-400 mb-2">Attribute Match</p>
                        <p className="text-3xl font-bold text-accent-violet mb-2">
                          {formatPercentage(selectedMapping.attributeScore * 100, 0)}
                        </p>
                        <div className="h-2 rounded-full bg-surface-700 overflow-hidden">
                          <div 
                            className="h-full rounded-full bg-gradient-to-r from-accent-violet to-brand-400"
                            style={{ width: `${selectedMapping.attributeScore * 100}%` }}
                          />
                        </div>
                        <p className="text-xs text-surface-500 mt-3">
                          Brand match + Size match
                        </p>
                      </div>
                    </div>

                    {/* Match Details */}
                    <div className="mt-6 p-4 rounded-xl bg-surface-800/30 border border-surface-700/50">
                      <h4 className="text-sm font-medium text-surface-300 mb-3">Match Details</h4>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div className="flex items-center gap-3">
                          {selectedMapping.parsedBrand?.toLowerCase() === selectedMapping.masterBrand?.toLowerCase() ? (
                            <CheckCircle2 className="w-5 h-5 text-accent-mint" />
                          ) : (
                            <AlertCircle className="w-5 h-5 text-accent-gold" />
                          )}
                          <span className="text-surface-400">Brand Match:</span>
                          <span className="text-surface-200">
                            "{selectedMapping.parsedBrand || '?'}" ≈ "{selectedMapping.masterBrand}"
                          </span>
                        </div>
                        <div className="flex items-center gap-3">
                          {selectedMapping.parsedSize === selectedMapping.masterSize ? (
                            <CheckCircle2 className="w-5 h-5 text-accent-mint" />
                          ) : (
                            <AlertCircle className="w-5 h-5 text-accent-gold" />
                          )}
                          <span className="text-surface-400">Size Match:</span>
                          <span className="text-surface-200">
                            "{selectedMapping.parsedSize || '?'}" = "{selectedMapping.masterSize || '?'}"
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <GitCompare className="w-16 h-16 text-surface-600 mx-auto mb-4" />
                <p className="text-lg text-surface-400">No mappings to review</p>
                <p className="text-sm text-surface-500 mt-1">All caught up! 🎉</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
