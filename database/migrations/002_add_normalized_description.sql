-- Migration: Add normalized_description column to retailer_data_raw
-- This stores the expanded/normalized version of the raw description

ALTER TABLE retailer_data_raw 
ADD COLUMN IF NOT EXISTS normalized_description VARCHAR(1000);

-- Add comment for documentation
COMMENT ON COLUMN retailer_data_raw.normalized_description IS 
'Normalized description with abbreviations expanded (e.g., "CR PRHLTH 4.8OZ" -> "Crest Pro-Health 4.8oz")';

-- Update v_pending_reviews to include normalized description
CREATE OR REPLACE VIEW v_pending_reviews AS
SELECT 
    em.id AS mapping_id,
    mc.canonical_name AS master_product,
    b.name AS master_brand,
    rdr.raw_description AS retailer_description,
    rdr.normalized_description,
    ss.name AS retailer,
    ss.code AS retailer_code,
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
