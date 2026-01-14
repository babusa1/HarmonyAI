import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('API Error:', error.response?.data || error.message);
    return Promise.reject(error);
  }
);

export default api;

// API Functions

// Dashboard
export const fetchDashboardStats = () => api.get('/analytics/dashboard').then(r => r.data);

// Catalog
export const fetchCatalog = (params: any) => api.get('/catalog', { params }).then(r => r.data);
export const fetchBrands = () => api.get('/catalog/meta/brands').then(r => r.data);
export const fetchCategories = () => api.get('/catalog/meta/categories').then(r => r.data);

// Retailer Data
export const fetchRetailerData = (params: any) => api.get('/retailer', { params }).then(r => r.data);
export const fetchSources = () => api.get('/retailer/meta/sources').then(r => r.data);

// Mappings (HITL)
export const fetchPendingMappings = (params: any) => api.get('/mapping/pending', { params }).then(r => r.data);
export const fetchMappingStats = () => api.get('/mapping/stats').then(r => r.data);
export const approveMapping = (id: string, notes?: string) => 
  api.post(`/mapping/${id}/approve`, { notes }).then(r => r.data);
export const rejectMapping = (id: string, notes?: string, alternativeMasterId?: string) => 
  api.post(`/mapping/${id}/reject`, { notes, alternativeMasterId }).then(r => r.data);

// Analytics
export const fetchSalesData = (params: any) => api.get('/analytics/sales', { params }).then(r => r.data);
export const fetchBenchmark = (params: any) => api.get('/analytics/benchmark', { params }).then(r => r.data);
export const fetchMarketShare = (params: any) => api.get('/analytics/market-share', { params }).then(r => r.data);
export const fetchTrends = (params: any) => api.get('/analytics/trends', { params }).then(r => r.data);
export const fetchTopProducts = (params: any) => api.get('/analytics/top-products', { params }).then(r => r.data);

// Upload
export const uploadFile = (type: string, file: File, sourceSystem?: string) => {
  const formData = new FormData();
  formData.append('file', file);
  if (sourceSystem) {
    formData.append('sourceSystem', sourceSystem);
  }
  return api.post(`/upload/${type}`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }).then(r => r.data);
};

export const triggerProcessing = (batchSize?: number) => 
  api.post('/upload/process', { batchSize }).then(r => r.data);

export const fetchProcessingStatus = () => api.get('/upload/status').then(r => r.data);
