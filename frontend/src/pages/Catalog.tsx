import { useState } from 'react';
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
} from 'lucide-react';
import { cn, formatNumber } from '../lib/utils';

// Mock catalog data
const catalogProducts = [
  { id: '1', gtin: '012345678901', name: 'Crest 3D White Radiant Mint 4.8oz', brand: 'Crest', category: 'Oral Care', size: '4.8oz', mappedCount: 4 },
  { id: '2', gtin: '012345678902', name: 'Crest Pro-Health Clean Mint 4.6oz', brand: 'Crest', category: 'Oral Care', size: '4.6oz', mappedCount: 3 },
  { id: '3', gtin: '012345678903', name: 'Colgate Total Whitening 5.1oz', brand: 'Colgate', category: 'Oral Care', size: '5.1oz', mappedCount: 5 },
  { id: '4', gtin: '012345678904', name: 'Pepsi Original 2000ml', brand: 'Pepsi', category: 'Beverages', size: '2000ml', mappedCount: 4 },
  { id: '5', gtin: '012345678905', name: 'Mountain Dew Original 591ml', brand: 'Mountain Dew', category: 'Beverages', size: '591ml', mappedCount: 3 },
  { id: '6', gtin: '012345678906', name: 'Coca-Cola Original 355ml', brand: 'Coca-Cola', category: 'Beverages', size: '355ml', mappedCount: 5 },
  { id: '7', gtin: '012345678907', name: 'Head & Shoulders Classic Clean 400ml', brand: 'Head & Shoulders', category: 'Personal Care', size: '400ml', mappedCount: 4 },
  { id: '8', gtin: '012345678908', name: 'Pantene Pro-V Daily Moisture 400ml', brand: 'Pantene', category: 'Personal Care', size: '400ml', mappedCount: 3 },
  { id: '9', gtin: '012345678909', name: 'Tide PODS Original 42ct', brand: 'Tide', category: 'Household', size: '42ct', mappedCount: 5 },
  { id: '10', gtin: '012345678910', name: "Lay's Classic 10oz", brand: "Lay's", category: 'Snacks', size: '10oz', mappedCount: 4 },
];

const brands = ['All Brands', 'Crest', 'Colgate', 'Pepsi', 'Coca-Cola', 'Tide', "Lay's", 'Head & Shoulders', 'Pantene'];
const categories = ['All Categories', 'Oral Care', 'Beverages', 'Personal Care', 'Household', 'Snacks'];

export default function Catalog() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBrand, setSelectedBrand] = useState('All Brands');
  const [selectedCategory, setSelectedCategory] = useState('All Categories');
  const [selectedProduct, setSelectedProduct] = useState<typeof catalogProducts[0] | null>(null);

  const filteredProducts = catalogProducts.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          product.gtin.includes(searchQuery);
    const matchesBrand = selectedBrand === 'All Brands' || product.brand === selectedBrand;
    const matchesCategory = selectedCategory === 'All Categories' || product.category === selectedCategory;
    return matchesSearch && matchesBrand && matchesCategory;
  });

  return (
    <div className="h-[calc(100vh-7rem)] flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-display font-bold text-surface-50">
            Manufacturer Catalog
          </h1>
          <p className="text-surface-400 mt-1">
            Golden Record - {formatNumber(catalogProducts.length)} products
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
      </div>

      {/* Content */}
      <div className="flex-1 grid grid-cols-12 gap-6 min-h-0">
        {/* Product List */}
        <div className="col-span-7 card overflow-hidden flex flex-col">
          <div className="p-4 border-b border-surface-800 bg-surface-800/30">
            <div className="grid grid-cols-12 text-xs font-medium text-surface-400">
              <div className="col-span-5">Product</div>
              <div className="col-span-2">Brand</div>
              <div className="col-span-2">Category</div>
              <div className="col-span-2">Size</div>
              <div className="col-span-1 text-center">Mapped</div>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto">
            {filteredProducts.map((product, index) => (
              <motion.button
                key={product.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: index * 0.03 }}
                onClick={() => setSelectedProduct(product)}
                className={cn(
                  "w-full grid grid-cols-12 items-center p-4 text-left text-sm border-b border-surface-800 transition-all duration-200",
                  selectedProduct?.id === product.id
                    ? "bg-brand-500/10"
                    : "hover:bg-surface-800/30"
                )}
              >
                <div className="col-span-5">
                  <p className="font-medium text-surface-200 truncate">{product.name}</p>
                  <p className="text-xs text-surface-500 font-mono mt-0.5">{product.gtin}</p>
                </div>
                <div className="col-span-2">
                  <span className="badge badge-info">{product.brand}</span>
                </div>
                <div className="col-span-2">
                  <span className="text-surface-400">{product.category}</span>
                </div>
                <div className="col-span-2">
                  <span className="text-surface-400">{product.size}</span>
                </div>
                <div className="col-span-1 text-center">
                  <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-accent-mint/10 text-accent-mint text-xs font-medium">
                    {product.mappedCount}
                  </span>
                </div>
              </motion.button>
            ))}
          </div>
        </div>

        {/* Product Detail */}
        <div className="col-span-5 card overflow-hidden flex flex-col">
          {selectedProduct ? (
            <>
              <div className="p-6 border-b border-surface-800">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-3 rounded-xl bg-brand-500/10">
                      <Package className="w-6 h-6 text-brand-400" />
                    </div>
                    <div>
                      <h2 className="text-lg font-semibold text-surface-100">Product Details</h2>
                      <p className="text-sm text-surface-400">Golden Record Entry</p>
                    </div>
                  </div>
                  <button className="p-2 rounded-lg hover:bg-surface-800 transition-colors">
                    <MoreHorizontal className="w-5 h-5 text-surface-400" />
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-6">
                {/* Product Name */}
                <div className="mb-6">
                  <label className="block text-xs text-surface-500 mb-1">Canonical Name</label>
                  <p className="text-lg font-medium text-surface-100">{selectedProduct.name}</p>
                </div>

                {/* Details Grid */}
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="p-4 rounded-xl bg-surface-800/50 border border-surface-700/50">
                    <label className="block text-xs text-surface-500 mb-1">GTIN / UPC</label>
                    <p className="font-mono text-surface-200">{selectedProduct.gtin}</p>
                  </div>
                  <div className="p-4 rounded-xl bg-surface-800/50 border border-surface-700/50">
                    <label className="block text-xs text-surface-500 mb-1">Brand</label>
                    <p className="text-surface-200">{selectedProduct.brand}</p>
                  </div>
                  <div className="p-4 rounded-xl bg-surface-800/50 border border-surface-700/50">
                    <label className="block text-xs text-surface-500 mb-1">Category</label>
                    <p className="text-surface-200">{selectedProduct.category}</p>
                  </div>
                  <div className="p-4 rounded-xl bg-surface-800/50 border border-surface-700/50">
                    <label className="block text-xs text-surface-500 mb-1">Size</label>
                    <p className="text-surface-200">{selectedProduct.size}</p>
                  </div>
                </div>

                {/* Mapped Retailers */}
                <div>
                  <h3 className="text-sm font-medium text-surface-300 mb-3">Mapped Retailer SKUs</h3>
                  <div className="space-y-2">
                    {[
                      { retailer: 'Walmart', sku: 'WMT-487291', desc: 'CR 3DW RAD MNT 4.8OZ' },
                      { retailer: 'Target', sku: 'TGT-938472', desc: 'CREST 3D WHITE RADIANT 4.8' },
                      { retailer: 'Kroger', sku: 'KRG-174829', desc: 'CREST-TP-RAD-4.8OZ-2847' },
                      { retailer: 'CVS', sku: 'CVS-928374', desc: 'Crest 3DW Radiant Mint' },
                    ].slice(0, selectedProduct.mappedCount).map((mapping, i) => (
                      <div
                        key={i}
                        className="p-3 rounded-lg bg-surface-800/30 border border-surface-700/50 flex items-center justify-between"
                      >
                        <div>
                          <p className="text-xs text-surface-500">{mapping.retailer}</p>
                          <p className="font-mono text-sm text-surface-300">{mapping.desc}</p>
                        </div>
                        <span className="badge badge-success">Verified</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <Database className="w-16 h-16 text-surface-600 mx-auto mb-4" />
                <p className="text-lg text-surface-400">Select a product</p>
                <p className="text-sm text-surface-500 mt-1">View details and mappings</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
