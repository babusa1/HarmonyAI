import { useState, useCallback, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Upload,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Database,
  Store,
  DollarSign,
  Play,
  RefreshCw,
  Download,
} from 'lucide-react';
import { cn } from '../lib/utils';
import { uploadFile, triggerProcessing as triggerProcessingAPI, fetchProcessingStatus } from '../lib/api';

interface UploadState {
  file: File | null;
  status: 'idle' | 'uploading' | 'success' | 'error' | 'partial';
  message: string;
  result?: {
    recordsProcessed: number;
    recordsCreated: number;
    recordsUpdated: number;
    errors?: string[];
  };
}

const uploadTypes = [
  {
    id: 'catalog',
    title: 'Manufacturer Catalog',
    description: 'Upload your product master data (Golden Record)',
    icon: Database,
    color: 'brand',
    template: 'gtin,canonical_name,brand,manufacturer,category,size_value,size_unit',
  },
  {
    id: 'retailer',
    title: 'Retailer Data',
    description: 'Upload raw retailer SKU descriptions',
    icon: Store,
    color: 'violet',
    template: 'external_sku,raw_description,unit_price',
  },
  {
    id: 'sales',
    title: 'Sales Transactions',
    description: 'Upload sales data for analytics',
    icon: DollarSign,
    color: 'mint',
    template: 'external_sku,transaction_date,units_sold,revenue,store_id',
  },
];

export default function DataUpload() {
  const [activeUpload, setActiveUpload] = useState<string | null>(null);
  const [uploadStates, setUploadStates] = useState<Record<string, UploadState>>({});
  const [selectedSource, setSelectedSource] = useState('WALMART');
  const [processingStatus, setProcessingStatus] = useState({
    isProcessing: false,
    processed: 0,
    remaining: 0,
    progress: 0,
    lastResult: null as { processed: number; autoConfirmed: number; pendingReview: number; failed: number } | null,
    message: '',
  });

  // Fetch initial processing status on mount
  useEffect(() => {
    const loadStatus = async () => {
      try {
        const status = await fetchProcessingStatus();
        setProcessingStatus(prev => ({
          ...prev,
          isProcessing: false,
          processed: Number(status.processed) || 0,
          remaining: Number(status.pending) || 0,
          progress: Number(status.progress) || 0,
        }));
      } catch (error) {
        console.log('Could not fetch processing status');
      }
    };
    loadStatus();
  }, []);

  const handleDrop = useCallback((e: React.DragEvent, uploadId: string) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file && (file.name.endsWith('.csv') || file.name.endsWith('.xlsx'))) {
      setUploadStates(prev => ({
        ...prev,
        [uploadId]: { file, status: 'idle', message: '' }
      }));
    }
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>, uploadId: string) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploadStates(prev => ({
        ...prev,
        [uploadId]: { file, status: 'idle', message: '' }
      }));
    }
  };

  const handleUpload = async (uploadId: string) => {
    const state = uploadStates[uploadId];
    if (!state?.file) return;

    setUploadStates(prev => ({
      ...prev,
      [uploadId]: { ...prev[uploadId], status: 'uploading', message: 'Uploading...' }
    }));

    try {
      // Call actual API - both retailer and sales need sourceSystem
      const needsSourceSystem = uploadId === 'retailer' || uploadId === 'sales';
      const result = await uploadFile(
        uploadId, 
        state.file, 
        needsSourceSystem ? selectedSource : undefined
      );

      // Check if there were partial errors
      const hasErrors = result.errors && result.errors.length > 0;
      const status = hasErrors ? 'partial' : 'success';
      const message = hasErrors 
        ? `Completed with ${result.errors.length} errors` 
        : 'Upload successful!';

      setUploadStates(prev => ({
        ...prev,
        [uploadId]: {
          ...prev[uploadId],
          status,
          message,
          result: {
            recordsProcessed: result.recordsProcessed || result.count || 0,
            recordsCreated: result.recordsCreated || result.count || 0,
            recordsUpdated: result.recordsUpdated || 0,
            errors: result.errors || [],
          }
        }
      }));
    } catch (error: any) {
      console.error('Upload error:', error);
      setUploadStates(prev => ({
        ...prev,
        [uploadId]: {
          ...prev[uploadId],
          status: 'error',
          message: error.response?.data?.error || error.message || 'Upload failed. Please check file format.',
        }
      }));
    }
  };

  const handleTriggerProcessing = async () => {
    setProcessingStatus(prev => ({ ...prev, isProcessing: true, message: 'Starting AI processing...' }));
    
    try {
      // Call actual processing API
      setProcessingStatus(prev => ({ ...prev, message: 'Generating embeddings and finding matches...' }));
      const result = await triggerProcessingAPI(50);
      
      // Store the result
      const lastResult = {
        processed: result.processed || 0,
        autoConfirmed: result.autoConfirmed || 0,
        pendingReview: result.pendingReview || 0,
        failed: result.failed || 0,
      };

      // Fetch updated status
      const status = await fetchProcessingStatus();
      setProcessingStatus({
        isProcessing: false,
        processed: Number(status.processed) || 0,
        remaining: Number(status.pending) || 0,
        progress: Number(status.progress) || 0,
        lastResult,
        message: lastResult.processed > 0 
          ? `✓ Processed ${lastResult.processed} records: ${lastResult.autoConfirmed} auto-confirmed, ${lastResult.pendingReview} pending review`
          : 'No pending records to process',
      });
    } catch (error: any) {
      console.error('Processing error:', error);
      setProcessingStatus(prev => ({ 
        ...prev, 
        isProcessing: false, 
        message: `Error: ${error.response?.data?.error || error.message || 'Processing failed'}`,
        lastResult: null,
      }));
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold text-surface-50">
            Data Ingestion
          </h1>
          <p className="text-surface-400 mt-1">
            Upload CSV files to import product catalogs, retailer data, and sales transactions
          </p>
        </div>
      </div>

      {/* Upload Order Info */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="p-4 rounded-xl bg-brand-500/10 border border-brand-500/30"
      >
        <div className="flex items-start gap-3">
          <RefreshCw className="w-5 h-5 text-brand-400 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-brand-400">Recommended Upload Order:</p>
            <p className="text-xs text-surface-400 mt-1">
              <span className="text-brand-400">1.</span> Upload <strong>Manufacturer Catalog</strong> (your master products) → 
              <span className="text-brand-400"> 2.</span> Upload <strong>Retailer Data</strong> (SKU descriptions) → 
              <span className="text-brand-400"> 3.</span> Click <strong>Start Processing</strong> (generates AI matches) → 
              <span className="text-brand-400"> 4.</span> Upload <strong>Sales Transactions</strong> (links to existing SKUs)
            </p>
          </div>
        </div>
      </motion.div>

      {/* Processing Status Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="card p-6"
      >
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold text-surface-100">Processing Pipeline</h2>
            <p className="text-sm text-surface-400 mt-1">
              Generate embeddings and find matches for uploaded data
            </p>
          </div>
          <button
            onClick={handleTriggerProcessing}
            disabled={processingStatus.isProcessing}
            className="btn-primary flex items-center gap-2"
          >
            {processingStatus.isProcessing ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Play className="w-4 h-4" />
            )}
            {processingStatus.isProcessing ? 'Processing...' : 'Start Processing'}
          </button>
        </div>

        <div className="grid grid-cols-3 gap-4 mb-4">
          <div className="p-4 rounded-xl bg-surface-800/50 border border-surface-700/50">
            <p className="text-sm text-surface-400">Processed</p>
            <p className="text-2xl font-bold text-accent-mint mt-1">{processingStatus.processed}</p>
          </div>
          <div className="p-4 rounded-xl bg-surface-800/50 border border-surface-700/50">
            <p className="text-sm text-surface-400">Remaining</p>
            <p className="text-2xl font-bold text-accent-gold mt-1">{processingStatus.remaining}</p>
          </div>
          <div className="p-4 rounded-xl bg-surface-800/50 border border-surface-700/50">
            <p className="text-sm text-surface-400">Progress</p>
            <p className="text-2xl font-bold text-brand-400 mt-1">{Number(processingStatus.progress || 0).toFixed(1)}%</p>
          </div>
        </div>

        <div className="h-3 rounded-full bg-surface-700 overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-brand-500 to-accent-mint"
            initial={{ width: 0 }}
            animate={{ width: `${processingStatus.progress}%` }}
            transition={{ duration: 0.5 }}
          />
        </div>

        {/* Processing Status Message */}
        {processingStatus.message && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={cn(
              "mt-4 p-3 rounded-lg text-sm",
              processingStatus.message.startsWith('✓') 
                ? "bg-accent-mint/10 border border-accent-mint/30 text-accent-mint"
                : processingStatus.message.startsWith('Error')
                  ? "bg-accent-coral/10 border border-accent-coral/30 text-accent-coral"
                  : "bg-brand-500/10 border border-brand-500/30 text-brand-400"
            )}
          >
            {processingStatus.isProcessing && (
              <Loader2 className="w-4 h-4 animate-spin inline mr-2" />
            )}
            {processingStatus.message}
          </motion.div>
        )}

        {/* Processing Result Summary */}
        {processingStatus.lastResult && !processingStatus.isProcessing && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-4 grid grid-cols-4 gap-2"
          >
            <div className="p-3 rounded-lg bg-surface-800/50 border border-surface-700/50 text-center">
              <p className="text-xs text-surface-400">Processed</p>
              <p className="text-lg font-bold text-surface-100">{processingStatus.lastResult.processed}</p>
            </div>
            <div className="p-3 rounded-lg bg-accent-mint/10 border border-accent-mint/30 text-center">
              <p className="text-xs text-surface-400">Auto-Confirmed</p>
              <p className="text-lg font-bold text-accent-mint">{processingStatus.lastResult.autoConfirmed}</p>
            </div>
            <div className="p-3 rounded-lg bg-accent-gold/10 border border-accent-gold/30 text-center">
              <p className="text-xs text-surface-400">Pending Review</p>
              <p className="text-lg font-bold text-accent-gold">{processingStatus.lastResult.pendingReview}</p>
            </div>
            <div className="p-3 rounded-lg bg-accent-coral/10 border border-accent-coral/30 text-center">
              <p className="text-xs text-surface-400">Failed</p>
              <p className="text-lg font-bold text-accent-coral">{processingStatus.lastResult.failed}</p>
            </div>
          </motion.div>
        )}
      </motion.div>

      {/* Upload Cards */}
      <div className="grid grid-cols-3 gap-6">
        {uploadTypes.map((type, index) => {
          const state = uploadStates[type.id];
          const Icon = type.icon;
          
          return (
            <motion.div
              key={type.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="card overflow-hidden"
            >
              {/* Header */}
              <div className={cn(
                "p-4 border-b border-surface-800",
                type.color === 'brand' && "bg-brand-500/5",
                type.color === 'violet' && "bg-accent-violet/5",
                type.color === 'mint' && "bg-accent-mint/5",
              )}>
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "p-2.5 rounded-xl",
                    type.color === 'brand' && "bg-brand-500/10",
                    type.color === 'violet' && "bg-accent-violet/10",
                    type.color === 'mint' && "bg-accent-mint/10",
                  )}>
                    <Icon className={cn(
                      "w-5 h-5",
                      type.color === 'brand' && "text-brand-400",
                      type.color === 'violet' && "text-accent-violet",
                      type.color === 'mint' && "text-accent-mint",
                    )} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-surface-100">{type.title}</h3>
                    <p className="text-xs text-surface-400">{type.description}</p>
                  </div>
                </div>
              </div>

              {/* Upload Area */}
              <div className="p-4">
                {(type.id === 'retailer' || type.id === 'sales') && (
                  <div className="mb-4">
                    <label className="block text-sm text-surface-400 mb-2">Source System (Retailer)</label>
                    <select
                      value={selectedSource}
                      onChange={(e) => setSelectedSource(e.target.value)}
                      className="input"
                    >
                      <option value="WALMART">Walmart US</option>
                      <option value="TARGET">Target</option>
                      <option value="KROGER">Kroger</option>
                      <option value="COSTCO">Costco Wholesale</option>
                      <option value="CVS">CVS Pharmacy</option>
                    </select>
                  </div>
                )}

                {/* Drop Zone */}
                <div
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => handleDrop(e, type.id)}
                  onClick={() => document.getElementById(`file-input-${type.id}`)?.click()}
                  className={cn(
                    "relative border-2 border-dashed rounded-xl p-6 text-center transition-all duration-200 cursor-pointer",
                    state?.file 
                      ? "border-accent-mint/50 bg-accent-mint/5" 
                      : "border-surface-700 hover:border-surface-500 hover:bg-surface-800/30"
                  )}
                >
                  {state?.file ? (
                    <div>
                      <FileSpreadsheet className="w-10 h-10 text-accent-mint mx-auto mb-3" />
                      <p className="text-sm text-surface-200 font-medium">{state.file.name}</p>
                      <p className="text-xs text-surface-400 mt-1">
                        {(state.file.size / 1024).toFixed(1)} KB
                      </p>
                    </div>
                  ) : (
                    <div>
                      <Upload className="w-10 h-10 text-surface-500 mx-auto mb-3" />
                      <p className="text-sm text-surface-300">
                        Drag & drop your CSV file here
                      </p>
                      <p className="text-xs text-surface-500 mt-1">or click to browse</p>
                    </div>
                  )}
                  
                  <input
                    id={`file-input-${type.id}`}
                    type="file"
                    accept=".csv,.xlsx"
                    onChange={(e) => handleFileSelect(e, type.id)}
                    className="hidden"
                  />
                </div>

                {/* Status */}
                {(state?.status === 'success' || state?.status === 'partial') && state.result && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={cn(
                      "mt-4 p-3 rounded-lg",
                      state.status === 'success' 
                        ? "bg-accent-mint/10 border border-accent-mint/30"
                        : "bg-accent-gold/10 border border-accent-gold/30"
                    )}
                  >
                    <div className={cn(
                      "flex items-center gap-2 mb-2",
                      state.status === 'success' ? "text-accent-mint" : "text-accent-gold"
                    )}>
                      {state.status === 'success' ? (
                        <CheckCircle2 className="w-4 h-4" />
                      ) : (
                        <AlertCircle className="w-4 h-4" />
                      )}
                      <span className="text-sm font-medium">{state.message}</span>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-xs">
                      <div>
                        <p className="text-surface-400">Processed</p>
                        <p className="text-surface-200 font-medium">{state.result.recordsProcessed}</p>
                      </div>
                      <div>
                        <p className="text-surface-400">Created</p>
                        <p className="text-surface-200 font-medium">{state.result.recordsCreated}</p>
                      </div>
                      <div>
                        <p className="text-surface-400">Updated</p>
                        <p className="text-surface-200 font-medium">{state.result.recordsUpdated}</p>
                      </div>
                    </div>
                    {/* Show errors if partial */}
                    {state.result.errors && state.result.errors.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-surface-700/50">
                        <p className="text-xs text-accent-coral mb-1">Errors ({state.result.errors.length}):</p>
                        <div className="max-h-24 overflow-y-auto">
                          {state.result.errors.slice(0, 5).map((err, i) => (
                            <p key={i} className="text-xs text-surface-400 truncate">{err}</p>
                          ))}
                          {state.result.errors.length > 5 && (
                            <p className="text-xs text-surface-500">...and {state.result.errors.length - 5} more</p>
                          )}
                        </div>
                      </div>
                    )}
                  </motion.div>
                )}

                {state?.status === 'error' && (
                  <div className="mt-4 p-3 rounded-lg bg-accent-coral/10 border border-accent-coral/30">
                    <div className="flex items-center gap-2 text-accent-coral">
                      <AlertCircle className="w-4 h-4" />
                      <span className="text-sm">{state.message}</span>
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="mt-4 flex items-center gap-2">
                  <button
                    onClick={() => handleUpload(type.id)}
                    disabled={!state?.file || state?.status === 'uploading'}
                    className="btn-primary flex-1 flex items-center justify-center gap-2"
                  >
                    {state?.status === 'uploading' ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Upload className="w-4 h-4" />
                    )}
                    Upload
                  </button>
                  <button className="btn-ghost p-2">
                    <Download className="w-4 h-4" />
                  </button>
                </div>

                {/* Template Preview */}
                <div className="mt-4 p-3 rounded-lg bg-surface-800/50 border border-surface-700/50">
                  <p className="text-xs text-surface-400 mb-2">Expected columns:</p>
                  <code className="text-xs text-brand-400 font-mono break-all">
                    {type.template}
                  </code>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
