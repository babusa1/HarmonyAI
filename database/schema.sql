-- HarmonizeIQ Database Schema
-- PostgreSQL 16+ with pgvector extension

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "vector";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";  -- For fuzzy text matching

-- ============================================
-- CORE TABLES
-- ============================================

-- Source Systems (Retailers, Manufacturers)
CREATE TABLE source_systems (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL CHECK (type IN ('manufacturer', 'retailer', 'distributor')),
    code VARCHAR(50) UNIQUE NOT NULL,
    is_active BOOLEAN DEFAULT true,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Categories (Product Hierarchy)
CREATE TABLE categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    parent_id UUID REFERENCES categories(id),
    level INTEGER NOT NULL DEFAULT 1,
    path VARCHAR(500), -- Materialized path for efficient queries
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Brands Dictionary
CREATE TABLE brands (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    manufacturer VARCHAR(255),
    aliases JSONB DEFAULT '[]', -- ["P&G", "Procter Gamble", "Procter & Gamble"]
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- MASTER DATA (Golden Record)
-- ============================================

CREATE TABLE manufacturer_catalog (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    gtin VARCHAR(14), -- Global Trade Item Number (UPC/EAN)
    canonical_name VARCHAR(500) NOT NULL,
    brand_id UUID REFERENCES brands(id),
    category_id UUID REFERENCES categories(id),
    
    -- Product Attributes
    size_value DECIMAL(10,2),
    size_unit VARCHAR(20), -- 'ml', 'g', 'oz', 'lb', 'ct'
    size_normalized_ml DECIMAL(10,2), -- Normalized to ml/g for comparison
    pack_count INTEGER DEFAULT 1,
    
    -- Additional Attributes (flexible)
    attributes JSONB DEFAULT '{}', -- {flavor: "mint", variant: "whitening", etc}
    
    -- Vector embedding for semantic search
    description_embedding vector(384), -- MiniLM dimension
    
    -- Metadata
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for manufacturer_catalog
CREATE INDEX idx_manufacturer_catalog_gtin ON manufacturer_catalog(gtin);
CREATE INDEX idx_manufacturer_catalog_brand ON manufacturer_catalog(brand_id);
CREATE INDEX idx_manufacturer_catalog_category ON manufacturer_catalog(category_id);
CREATE INDEX idx_manufacturer_catalog_embedding ON manufacturer_catalog 
    USING ivfflat (description_embedding vector_cosine_ops) WITH (lists = 100);

-- ============================================
-- RAW RETAILER DATA
-- ============================================

CREATE TABLE retailer_data_raw (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    source_system_id UUID NOT NULL REFERENCES source_systems(id),
    
    -- Raw data as received
    external_sku VARCHAR(100) NOT NULL,
    raw_description VARCHAR(1000) NOT NULL,
    
    -- Parsed/Cleaned data
    cleaned_description VARCHAR(1000),
    parsed_brand VARCHAR(255),
    parsed_size_value DECIMAL(10,2),
    parsed_size_unit VARCHAR(20),
    parsed_size_normalized_ml DECIMAL(10,2),
    
    -- Vector embedding
    description_embedding vector(384),
    
    -- Pricing (optional)
    unit_price DECIMAL(10,2),
    currency VARCHAR(3) DEFAULT 'USD',
    
    -- Processing status
    processing_status VARCHAR(50) DEFAULT 'pending' 
        CHECK (processing_status IN ('pending', 'processed', 'failed')),
    
    -- Metadata
    raw_attributes JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(source_system_id, external_sku)
);

-- Indexes for retailer_data_raw
CREATE INDEX idx_retailer_data_source ON retailer_data_raw(source_system_id);
CREATE INDEX idx_retailer_data_status ON retailer_data_raw(processing_status);
CREATE INDEX idx_retailer_data_embedding ON retailer_data_raw 
    USING ivfflat (description_embedding vector_cosine_ops) WITH (lists = 100);
CREATE INDEX idx_retailer_data_description_trgm ON retailer_data_raw 
    USING gin (raw_description gin_trgm_ops);

-- ============================================
-- EQUIVALENCE MAPPING (The Bridge)
-- ============================================

CREATE TABLE equivalence_map (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    master_id UUID NOT NULL REFERENCES manufacturer_catalog(id),
    raw_id UUID NOT NULL REFERENCES retailer_data_raw(id),
    
    -- Matching scores
    semantic_score DECIMAL(5,4), -- Cosine similarity (0-1)
    attribute_score DECIMAL(5,4), -- Attribute matching score (0-1)
    final_confidence DECIMAL(5,4) NOT NULL, -- Weighted combination
    
    -- Status workflow
    status VARCHAR(50) NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'auto_confirmed', 'verified', 'rejected', 'manual')),
    
    -- Audit trail
    reviewed_by UUID,
    reviewed_at TIMESTAMP WITH TIME ZONE,
    review_notes TEXT,
    
    -- For competitor tracking
    is_competitor BOOLEAN DEFAULT false,
    competitor_brand VARCHAR(255),
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(master_id, raw_id)
);

-- Indexes for equivalence_map
CREATE INDEX idx_equivalence_master ON equivalence_map(master_id);
CREATE INDEX idx_equivalence_raw ON equivalence_map(raw_id);
CREATE INDEX idx_equivalence_status ON equivalence_map(status);
CREATE INDEX idx_equivalence_confidence ON equivalence_map(final_confidence DESC);

-- ============================================
-- SALES TRANSACTIONS
-- ============================================

CREATE TABLE sales_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    raw_id UUID NOT NULL REFERENCES retailer_data_raw(id),
    source_system_id UUID NOT NULL REFERENCES source_systems(id),
    
    -- Transaction data
    transaction_date DATE NOT NULL,
    units_sold INTEGER NOT NULL,
    revenue DECIMAL(12,2) NOT NULL,
    
    -- Optional details
    store_id VARCHAR(50),
    promotion_flag BOOLEAN DEFAULT false,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for sales_transactions
CREATE INDEX idx_sales_raw ON sales_transactions(raw_id);
CREATE INDEX idx_sales_date ON sales_transactions(transaction_date);
CREATE INDEX idx_sales_source ON sales_transactions(source_system_id);

-- ============================================
-- AUDIT LOG
-- ============================================

CREATE TABLE audit_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    table_name VARCHAR(100) NOT NULL,
    record_id UUID NOT NULL,
    action VARCHAR(50) NOT NULL CHECK (action IN ('create', 'update', 'delete', 'review')),
    old_values JSONB,
    new_values JSONB,
    user_id UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_audit_table ON audit_log(table_name);
CREATE INDEX idx_audit_record ON audit_log(record_id);
CREATE INDEX idx_audit_date ON audit_log(created_at);

-- ============================================
-- USERS (for HITL Dashboard)
-- ============================================

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'reviewer'
        CHECK (role IN ('admin', 'reviewer', 'analyst', 'viewer')),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_login TIMESTAMP WITH TIME ZONE
);

-- ============================================
-- VIEWS FOR REPORTING
-- ============================================

-- View: Harmonized Sales with Golden Record
CREATE OR REPLACE VIEW v_harmonized_sales AS
SELECT 
    mc.id AS master_id,
    mc.canonical_name AS product_name,
    b.name AS brand,
    c.name AS category,
    ss.name AS retailer,
    em.is_competitor,
    em.competitor_brand,
    st.transaction_date,
    st.units_sold,
    st.revenue,
    em.final_confidence AS match_confidence
FROM sales_transactions st
JOIN retailer_data_raw rdr ON st.raw_id = rdr.id
JOIN equivalence_map em ON rdr.id = em.raw_id
JOIN manufacturer_catalog mc ON em.master_id = mc.id
LEFT JOIN brands b ON mc.brand_id = b.id
LEFT JOIN categories c ON mc.category_id = c.id
JOIN source_systems ss ON st.source_system_id = ss.id
WHERE em.status IN ('auto_confirmed', 'verified', 'manual');

-- View: Pending Reviews
CREATE OR REPLACE VIEW v_pending_reviews AS
SELECT 
    em.id AS mapping_id,
    mc.canonical_name AS master_product,
    b.name AS master_brand,
    rdr.raw_description AS retailer_description,
    ss.name AS retailer,
    em.semantic_score,
    em.attribute_score,
    em.final_confidence,
    em.created_at
FROM equivalence_map em
JOIN manufacturer_catalog mc ON em.master_id = mc.id
JOIN retailer_data_raw rdr ON em.raw_id = rdr.id
JOIN source_systems ss ON rdr.source_system_id = ss.id
LEFT JOIN brands b ON mc.brand_id = b.id
WHERE em.status = 'pending'
ORDER BY em.final_confidence DESC;

-- View: Competitor Benchmark Summary
CREATE OR REPLACE VIEW v_competitor_benchmark AS
SELECT 
    c.name AS category,
    b.name AS our_brand,
    em.competitor_brand,
    DATE_TRUNC('month', st.transaction_date) AS month,
    SUM(CASE WHEN em.is_competitor = false THEN st.revenue ELSE 0 END) AS our_revenue,
    SUM(CASE WHEN em.is_competitor = true THEN st.revenue ELSE 0 END) AS competitor_revenue,
    SUM(CASE WHEN em.is_competitor = false THEN st.units_sold ELSE 0 END) AS our_units,
    SUM(CASE WHEN em.is_competitor = true THEN st.units_sold ELSE 0 END) AS competitor_units
FROM sales_transactions st
JOIN retailer_data_raw rdr ON st.raw_id = rdr.id
JOIN equivalence_map em ON rdr.id = em.raw_id
JOIN manufacturer_catalog mc ON em.master_id = mc.id
LEFT JOIN brands b ON mc.brand_id = b.id
LEFT JOIN categories c ON mc.category_id = c.id
WHERE em.status IN ('auto_confirmed', 'verified', 'manual')
GROUP BY c.name, b.name, em.competitor_brand, DATE_TRUNC('month', st.transaction_date);

-- ============================================
-- FUNCTIONS
-- ============================================

-- Function: Calculate similarity between two products
CREATE OR REPLACE FUNCTION calculate_product_similarity(
    master_embedding vector(384),
    raw_embedding vector(384),
    master_size_ml DECIMAL,
    raw_size_ml DECIMAL
) RETURNS DECIMAL AS $$
DECLARE
    semantic_score DECIMAL;
    size_score DECIMAL;
    final_score DECIMAL;
BEGIN
    -- Cosine similarity (converted from distance)
    semantic_score := 1 - (master_embedding <=> raw_embedding);
    
    -- Size matching score
    IF master_size_ml IS NOT NULL AND raw_size_ml IS NOT NULL AND master_size_ml > 0 THEN
        size_score := 1 - ABS(master_size_ml - raw_size_ml) / GREATEST(master_size_ml, raw_size_ml);
        size_score := GREATEST(0, size_score); -- Clamp to 0-1
    ELSE
        size_score := 0.5; -- Neutral if missing
    END IF;
    
    -- Weighted combination: 70% semantic, 30% attributes
    final_score := (0.70 * semantic_score) + (0.30 * size_score);
    
    RETURN ROUND(final_score, 4);
END;
$$ LANGUAGE plpgsql;

-- Function: Find top matches for a raw product
CREATE OR REPLACE FUNCTION find_top_matches(
    p_raw_id UUID,
    p_limit INTEGER DEFAULT 5
) RETURNS TABLE (
    master_id UUID,
    canonical_name VARCHAR,
    semantic_score DECIMAL,
    attribute_score DECIMAL,
    final_confidence DECIMAL
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        mc.id,
        mc.canonical_name,
        ROUND((1 - (mc.description_embedding <=> rdr.description_embedding))::DECIMAL, 4) AS sem_score,
        CASE 
            WHEN mc.size_normalized_ml IS NOT NULL AND rdr.parsed_size_normalized_ml IS NOT NULL 
            THEN ROUND((1 - ABS(mc.size_normalized_ml - rdr.parsed_size_normalized_ml) / 
                   GREATEST(mc.size_normalized_ml, rdr.parsed_size_normalized_ml))::DECIMAL, 4)
            ELSE 0.5
        END AS attr_score,
        ROUND((
            0.70 * (1 - (mc.description_embedding <=> rdr.description_embedding)) +
            0.30 * CASE 
                WHEN mc.size_normalized_ml IS NOT NULL AND rdr.parsed_size_normalized_ml IS NOT NULL 
                THEN (1 - ABS(mc.size_normalized_ml - rdr.parsed_size_normalized_ml) / 
                       GREATEST(mc.size_normalized_ml, rdr.parsed_size_normalized_ml))
                ELSE 0.5
            END
        )::DECIMAL, 4) AS confidence
    FROM manufacturer_catalog mc
    CROSS JOIN retailer_data_raw rdr
    WHERE rdr.id = p_raw_id
      AND mc.description_embedding IS NOT NULL
      AND rdr.description_embedding IS NOT NULL
    ORDER BY mc.description_embedding <=> rdr.description_embedding
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- TRIGGERS
-- ============================================

-- Trigger: Update timestamp on modification
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_manufacturer_catalog_updated
    BEFORE UPDATE ON manufacturer_catalog
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_retailer_data_raw_updated
    BEFORE UPDATE ON retailer_data_raw
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_equivalence_map_updated
    BEFORE UPDATE ON equivalence_map
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
