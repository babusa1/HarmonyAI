import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Search,
  Filter,
  Plus,
  Database,
  Tag,
  Scale,
  ChevronRight,
  MoreHorizontal,
  ExternalLink,
  Package,
  Loader2,
  CheckCircle2,
  Clock,
} from 'lucide-react';
import { cn, formatNumber } from '../lib/utils';
import { fetchCatalog, fetchBrands, fetchCategories } from '../lib/api';

interface CatalogProduct {
  id: string;
  gtin: string;
  name: string;
  brand: string;
  category: string;
  size: string;
  mappedCount: number;
  autoConfirmed: number;
  pending: number;
}

export default function Catalog() {
  const [products, setProducts] = useState<CatalogProduct[]>([]);
  const [brands, setBrands] = useState<string[]>(['All Brands']);
  const [categories, setCategories] = useState<string[]>(['All Categories']);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBrand, setSelectedBrand] = useState('All Brands');
  const [selectedCategory, setSelectedCategory] = useState('All Categories');
  const [selectedProduct, setSelectedProduct] = useState<CatalogProduct | null>(null);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const [catalogData, brandsData, categoriesData] = await Promise.all([
          fetchCatalog({ limit: 100 }),
          fetchBrands().catch(() => []),
          fetchCategories().catch(() => []),
        ]);

        const catalogItems = catalogData.data || catalogData || [];
        const formatted = catalogItems.map((p: any) => ({
          id: p.id,
          gtin: p.gtin || '',
          name: p.canonical_name || p.name || '',
          brand: p.brand_name || p.brand || '',
          category: p.category_name || p.category || '',
          size: p.size_value ? `${p.size_value}${p.size_unit || ''}` : '',
          mappedCount: Number(p.mapped_count) || 0,
          autoConfirmed: Number(p.auto_confirmed_count) || 0,
          pending: Number(p.pending_count) || 0,
        }));
        setProducts(formatted);

        const brandNames = (brandsData || []).map((b: any) => b.name || b);
        setBrands(['All Brands', ...brandNames]);

        const categoryNames = (categoriesData || []).map((c: any) => c.name || c);
        setCategories(['All Categories', ...categoryNames]);
      } catch (error) {
        console.error('Failed to load catalog:', error);
      }
      setLoading(false);
    };
    loadData();
  }, []);

  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          product.gtin.includes(searchQuery);
    const matchesBrand = selectedBrand === 'All Brands' || product.brand === selectedBrand;
    const matchesCategory = selectedCategory === 'All Categories' || product.category === selectedCategory;
    return matchesSearch && matchesBrand && matchesCategory;
  });

  if (loading) {
    return (
      <div className="h-[calc(100vh-7rem)] flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-brand-400 mx-auto mb-4 animate-spin" />
          <p className="text-surface-400">Loading catalog...</p>
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
            Manufacturer Catalog
          </h1>
          <p className="text-surface-400 mt-1">
            Golden Record - {formatNumber(products.length)} products
          </p>
        </div>
        <button className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" />
          Add Product
        </button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4 mb-6">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-500" />
          <input
            type="text"
            placeholder="Search by name or GTIN..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="input pl-10"
          />
        </div>
        <select
          value={selectedBrand}
          onChange={(e) => setSelectedBrand(e.target.value)}
          className="input w-48"
        >
          {brands.map(brand => (
            <option key={brand} value={brand}>{brand}</option>
          ))}
        </select>
        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          className="input w-48"
        >
          {categories.map(cat => (
            <option key={cat} value={cat}>{cat}</option>
          ))}
        </select>
        <button className="btn-secondary flex items-center gap-2">
          <Filter className="w-4 h-4" />
          More Filters
        </button>
      </div>

      {/* Main Content */}
      <div className="flex-1 grid grid-cols-12 gap-6 min-h-0">
        {/* Product List */}
        <div className="col-span-7 card overflow-hidden flex flex-col">
          <div className="p-4 border-b border-surface-800 flex items-center justify-between">
            <h2 className="font-semibold text-surface-200">Products</h2>
            <span className="text-sm text-surface-400">{filteredProducts.length} items</span>
          </div>
          <div className="flex-1 overflow-y-auto">
            {filteredProducts.length === 0 ? (
              <div className="p-8 text-center">
                <Database className="w-12 h-12 text-surface-600 mx-auto mb-4" />
                <p className="text-surface-400">No products found</p>
              </div>
            ) : (
              filteredProducts.map((product, index) => (
                <motion.button
                  key={product.id}
                  onClick={() => setSelectedProduct(product)}
                  className={cn(
                    "w-full p-4 text-left border-b border-surface-800 transition-all duration-200",
                    selectedProduct?.id === product.id
                      ? "bg-brand-500/10 border-l-2 border-l-brand-500"
                      : "hover:bg-surface-800/50"
                  )}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.02 }}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <p className="text-surface-200 font-medium truncate">{product.name}</p>
                      <div className="flex items-center gap-3 mt-1 text-xs text-surface-500">
                        <span className="flex items-center gap-1">
                          <Tag className="w-3 h-3" />
                          {product.brand || 'Unknown'}
                        </span>
                        <span className="flex items-center gap-1">
                          <Database className="w-3 h-3" />
                          {product.category || 'Unknown'}
                        </span>
                        {product.size && (
                          <span className="flex items-center gap-1">
                            <Scale className="w-3 h-3" />
                            {product.size}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 ml-3">
                      {product.mappedCount > 0 || product.autoConfirmed > 0 ? (
                        <span className="px-2 py-1 rounded-full bg-accent-mint/20 text-accent-mint text-xs font-medium">
                          {product.autoConfirmed || product.mappedCount} mapped
                        </span>
                      ) : product.pending > 0 ? (
                        <span className="px-2 py-1 rounded-full bg-accent-gold/20 text-accent-gold text-xs font-medium">
                          {product.pending} pending
                        </span>
                      ) : null}
                      <ChevronRight className="w-4 h-4 text-surface-500" />
                    </div>
                  </div>
                </motion.button>
              ))
            )}
          </div>
        </div>

        {/* Product Details */}
        <div className="col-span-5 card overflow-hidden flex flex-col">
          {selectedProduct ? (
            <>
              <div className="p-6 border-b border-surface-800">
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-xs text-surface-500 font-mono">{selectedProduct.gtin || 'No GTIN'}</span>
                    <h2 className="text-lg font-semibold text-surface-100 mt-1">
                      {selectedProduct.name}
                    </h2>
                  </div>
                  <button className="p-2 hover:bg-surface-800 rounded-lg">
                    <MoreHorizontal className="w-5 h-5 text-surface-400" />
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-6">
                {/* Attributes */}
                <div className="space-y-4 mb-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-brand-500/10">
                      <Tag className="w-4 h-4 text-brand-400" />
                    </div>
                    <div>
                      <p className="text-xs text-surface-500">Brand</p>
                      <p className="text-surface-200">{selectedProduct.brand || 'Unknown'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-accent-violet/10">
                      <Database className="w-4 h-4 text-accent-violet" />
                    </div>
                    <div>
                      <p className="text-xs text-surface-500">Category</p>
                      <p className="text-surface-200">{selectedProduct.category || 'Unknown'}</p>
                    </div>
                  </div>
                  {selectedProduct.size && (
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-accent-mint/10">
                        <Scale className="w-4 h-4 text-accent-mint" />
                      </div>
                      <div>
                        <p className="text-xs text-surface-500">Size</p>
                        <p className="text-surface-200">{selectedProduct.size}</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Mapping Status */}
                <div className="rounded-xl border border-surface-700/50 overflow-hidden">
                  <div className="p-4 bg-surface-800/30 border-b border-surface-700/50">
                    <h3 className="font-semibold text-surface-200 flex items-center gap-2">
                      <Package className="w-4 h-4" />
                      Retailer Mappings
                    </h3>
                  </div>
                  <div className="p-4 space-y-3">
                    <div className="flex items-center justify-between p-3 rounded-lg bg-accent-mint/5 border border-accent-mint/20">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-accent-mint" />
                        <span className="text-sm text-surface-300">Confirmed Mappings</span>
                      </div>
                      <span className="text-lg font-bold text-accent-mint">
                        {selectedProduct.autoConfirmed || selectedProduct.mappedCount || 0}
                      </span>
                    </div>
                    <div className="flex items-center justify-between p-3 rounded-lg bg-accent-gold/5 border border-accent-gold/20">
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-accent-gold" />
                        <span className="text-sm text-surface-300">Pending Review</span>
                      </div>
                      <span className="text-lg font-bold text-accent-gold">
                        {selectedProduct.pending || 0}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="mt-6 flex gap-3">
                  <button className="btn-secondary flex-1 flex items-center justify-center gap-2">
                    <ExternalLink className="w-4 h-4" />
                    View Mappings
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <Package className="w-16 h-16 text-surface-600 mx-auto mb-4" />
                <p className="text-lg text-surface-400">Select a product</p>
                <p className="text-sm text-surface-500 mt-1">View details and retailer mappings</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
