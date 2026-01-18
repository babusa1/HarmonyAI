"""
HarmonizeIQ NLP Service
========================
FastAPI service for semantic embeddings, text normalization, and product matching.

Services Architecture:
- BrandDictionaryService: FMCG brand/abbreviation knowledge base
- TextNormalizerService: Converts abbreviated text to normalized form
- AbbreviationExpanderService: Intelligent abbreviation expansion
- LearningService: Learns from HITL decisions to improve over time

Matching Algorithm:
- Pre-processing: Normalize both texts using abbreviation expansion
- Semantic Similarity (70% weight): Cosine similarity between embeddings
- Attribute Matching (30% weight): Brand, size, category matching
- Combined score determines confidence level:
  - > 0.90: Auto-confirm (tuned based on learning)
  - 0.60-0.90: Human review
  - < 0.60: Flag as low confidence
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
import numpy as np
from sentence_transformers import SentenceTransformer
import re
from rapidfuzz import fuzz
from unidecode import unidecode
import logging
import os

# Import our services
from services import (
    BrandDictionaryService,
    TextNormalizerService,
    AbbreviationExpanderService,
    LearningService
)

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize FastAPI app
app = FastAPI(
    title="HarmonizeIQ NLP Service",
    description="AI-powered semantic similarity with abbreviation intelligence for product data harmonization",
    version="2.0.0"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ============================================
# INITIALIZE SERVICES
# ============================================

logger.info("Initializing services...")

# Create data directory for persistence
os.makedirs("/app/data", exist_ok=True)

# Initialize services with dependency injection
brand_service = BrandDictionaryService()
text_normalizer = TextNormalizerService(brand_service=brand_service)
abbreviation_expander = AbbreviationExpanderService(brand_service=brand_service)
learning_service = LearningService(brand_service=brand_service, data_dir="/app/data")

logger.info("Services initialized!")

# Load the sentence transformer model
logger.info("Loading sentence transformer model...")
model = SentenceTransformer('all-MiniLM-L6-v2')
logger.info("Model loaded successfully!")

# ============================================
# DATA MODELS
# ============================================

class TextInput(BaseModel):
    text: str

class BatchTextInput(BaseModel):
    texts: List[str]

class SimilarityInput(BaseModel):
    text1: str
    text2: str

class SearchInput(BaseModel):
    query: str
    top_k: int = 5
    corpus: Optional[List[Dict[str, str]]] = None

class ParseInput(BaseModel):
    description: str

class CleanInput(BaseModel):
    description: str

class NormalizeInput(BaseModel):
    """Input for text normalization"""
    text: str
    retailer: Optional[str] = None

class NormalizeBatchInput(BaseModel):
    """Batch normalization input"""
    texts: List[str]
    retailer: Optional[str] = None

class MatchInput(BaseModel):
    """Input for calculating match score between master and raw product"""
    master_name: str
    master_brand: Optional[str] = None
    master_size_value: Optional[float] = None
    master_size_unit: Optional[str] = None
    raw_description: str
    raw_brand: Optional[str] = None
    raw_size_value: Optional[float] = None
    raw_size_unit: Optional[str] = None
    retailer: Optional[str] = None  # Added for learning

class EnhancedMatchInput(BaseModel):
    """Enhanced match input with normalization"""
    master_name: str
    master_brand: Optional[str] = None
    master_category: Optional[str] = None
    master_size_value: Optional[float] = None
    master_size_unit: Optional[str] = None
    raw_description: str
    retailer: Optional[str] = None
    normalize: bool = True  # Whether to normalize raw description first

class HITLDecisionInput(BaseModel):
    """Input for recording HITL decisions"""
    mapping_id: str
    raw_description: str
    master_product: str
    decision: str  # 'approved' or 'rejected'
    original_confidence: float
    retailer: str
    corrections: Optional[Dict] = None

class ExpandInput(BaseModel):
    """Input for abbreviation expansion"""
    text: str

# ============================================
# UTILITY FUNCTIONS (Enhanced)
# ============================================

def normalize_text_basic(text: str) -> str:
    """Basic text normalization for comparison"""
    text = unidecode(text.lower())
    text = re.sub(r'[^a-z0-9\s]', ' ', text)
    text = re.sub(r'\s+', ' ', text).strip()
    return text

def extract_size(text: str) -> tuple:
    """Extract size value and unit from text"""
    patterns = [
        r'(\d+\.?\d*)\s*(oz|fl\s*oz|ml|l|g|kg|lb|ct|count|pack)',
        r'(\d+\.?\d*)(oz|ml|l|g|kg|lb|ct)',
    ]
    
    text_lower = text.lower()
    for pattern in patterns:
        match = re.search(pattern, text_lower)
        if match:
            value = float(match.group(1))
            unit = match.group(2).replace(' ', '')
            return value, unit
    return None, None

def normalize_size_to_ml(value: float, unit: str) -> float:
    """Convert size to ml/g for comparison"""
    if value is None or unit is None:
        return None
    
    conversions = {
        'ml': 1.0, 'l': 1000.0, 'oz': 29.5735, 'floz': 29.5735,
        'g': 1.0, 'kg': 1000.0, 'lb': 453.592,
        'ct': 1.0, 'count': 1.0, 'pack': 1.0
    }
    
    unit_lower = unit.lower().replace(' ', '')
    multiplier = conversions.get(unit_lower, 1.0)
    return value * multiplier

def calculate_attribute_score(
    master_brand: str,
    raw_brand: str,
    master_size_ml: float,
    raw_size_ml: float,
    category_match: bool = False
) -> float:
    """Calculate attribute matching score (0-1)"""
    score = 0.0
    weights = {'brand': 0.5, 'size': 0.35, 'category': 0.15}
    
    # Brand matching
    if master_brand and raw_brand:
        brand_similarity = fuzz.ratio(
            normalize_text_basic(master_brand),
            normalize_text_basic(raw_brand)
        ) / 100.0
        score += weights['brand'] * brand_similarity
    elif not master_brand and not raw_brand:
        score += weights['brand'] * 0.5
    
    # Size matching
    if master_size_ml and raw_size_ml and master_size_ml > 0:
        size_diff = abs(master_size_ml - raw_size_ml) / max(master_size_ml, raw_size_ml)
        size_score = max(0, 1 - size_diff)
        score += weights['size'] * size_score
    elif not master_size_ml and not raw_size_ml:
        score += weights['size'] * 0.5
    
    # Category matching
    if category_match:
        score += weights['category']
    
    return score

def calculate_final_confidence(
    semantic_score: float,
    attribute_score: float,
    normalization_bonus: float = 0.0,
    semantic_weight: float = 0.70,
    attribute_weight: float = 0.30
) -> float:
    """Calculate final confidence with normalization bonus"""
    base_score = (semantic_weight * semantic_score) + (attribute_weight * attribute_score)
    # Add bonus for successful normalization (max 5% boost)
    return min(1.0, base_score + normalization_bonus)

# ============================================
# API ENDPOINTS - Core
# ============================================

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "service": "harmonizeiq-nlp",
        "version": "2.0.0",
        "model": "all-MiniLM-L6-v2",
        "embedding_dimension": 384,
        "features": [
            "text_normalization",
            "abbreviation_expansion",
            "brand_detection",
            "hitl_learning"
        ]
    }

@app.post("/embed")
async def generate_embedding(input: TextInput):
    """Generate embedding for a single text"""
    try:
        embedding = model.encode(input.text, convert_to_numpy=True)
        return {
            "text": input.text,
            "embedding": embedding.tolist(),
            "dimension": len(embedding)
        }
    except Exception as e:
        logger.error(f"Embedding generation failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/embed/batch")
async def generate_embeddings_batch(input: BatchTextInput):
    """Generate embeddings for multiple texts in batch"""
    try:
        embeddings = model.encode(input.texts, convert_to_numpy=True, show_progress_bar=False)
        return {
            "count": len(input.texts),
            "embeddings": [emb.tolist() for emb in embeddings],
            "dimension": embeddings.shape[1] if len(embeddings) > 0 else 384
        }
    except Exception as e:
        logger.error(f"Batch embedding generation failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# ============================================
# API ENDPOINTS - Normalization (NEW)
# ============================================

@app.post("/normalize")
async def normalize_text(input: NormalizeInput):
    """
    Normalize a product description by expanding abbreviations.
    
    Uses FMCG knowledge base to:
    - Identify and expand brand abbreviations
    - Expand common word abbreviations
    - Parse and standardize size information
    - Detect category hints
    """
    try:
        result = text_normalizer.normalize(input.text)
        
        return {
            "original": result.original,
            "normalized": result.normalized,
            "brand": result.brand,
            "brand_confidence": result.brand_confidence,
            "size": {
                "value": result.size_value,
                "unit": result.size_unit,
                "normalized_ml": result.size_normalized_ml
            } if result.size_value else None,
            "category_hint": result.category_hint,
            "expansions": [
                {"from": orig, "to": exp}
                for orig, exp in result.tokens_expanded
            ],
            "expansion_summary": text_normalizer.get_expansion_summary(result)
        }
    except Exception as e:
        logger.error(f"Normalization failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/normalize/batch")
async def normalize_batch(input: NormalizeBatchInput):
    """Normalize multiple texts in batch"""
    try:
        results = text_normalizer.normalize_batch(input.texts)
        
        return {
            "count": len(results),
            "results": [
                {
                    "original": r.original,
                    "normalized": r.normalized,
                    "brand": r.brand,
                    "brand_confidence": r.brand_confidence,
                    "category_hint": r.category_hint,
                    "expansions_count": len(r.tokens_expanded)
                }
                for r in results
            ]
        }
    except Exception as e:
        logger.error(f"Batch normalization failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/expand")
async def expand_abbreviation(input: ExpandInput):
    """
    Expand abbreviations in text using multiple strategies.
    
    Strategies:
    1. Dictionary lookup (highest confidence)
    2. Pattern-based (vowel removal detection)
    3. Fuzzy matching (similarity-based)
    """
    try:
        expanded_text, expansions = abbreviation_expander.expand_text(input.text)
        
        return {
            "original": input.text,
            "expanded": expanded_text,
            "expansions": [
                {
                    "original": e.original,
                    "expanded": e.expanded,
                    "confidence": e.confidence,
                    "method": e.method
                }
                for e in expansions
            ]
        }
    except Exception as e:
        logger.error(f"Expansion failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# ============================================
# API ENDPOINTS - Matching (Enhanced)
# ============================================

@app.post("/similarity")
async def calculate_similarity(input: SimilarityInput):
    """Calculate semantic similarity between two texts"""
    try:
        embeddings = model.encode([input.text1, input.text2], convert_to_numpy=True)
        
        dot_product = np.dot(embeddings[0], embeddings[1])
        norm1 = np.linalg.norm(embeddings[0])
        norm2 = np.linalg.norm(embeddings[1])
        semantic_score = float(dot_product / (norm1 * norm2))
        
        # Extract attributes
        brand1_match = brand_service.lookup_brand(input.text1.split()[0] if input.text1 else "")
        brand2_match = brand_service.lookup_brand(input.text2.split()[0] if input.text2 else "")
        brand1 = brand1_match.canonical_name if brand1_match else None
        brand2 = brand2_match.canonical_name if brand2_match else None
        
        size1_val, size1_unit = extract_size(input.text1)
        size2_val, size2_unit = extract_size(input.text2)
        size1_ml = normalize_size_to_ml(size1_val, size1_unit)
        size2_ml = normalize_size_to_ml(size2_val, size2_unit)
        
        attribute_score = calculate_attribute_score(brand1, brand2, size1_ml, size2_ml)
        final_score = calculate_final_confidence(semantic_score, attribute_score)
        
        return {
            "text1": input.text1,
            "text2": input.text2,
            "score": round(final_score, 4),
            "semantic_score": round(semantic_score, 4),
            "attribute_score": round(attribute_score, 4),
            "confidence_level": (
                "high" if final_score >= 0.90 else
                "medium" if final_score >= 0.60 else
                "low"
            ),
            "extracted": {
                "text1_brand": brand1,
                "text1_size": f"{size1_val}{size1_unit}" if size1_val else None,
                "text2_brand": brand2,
                "text2_size": f"{size2_val}{size2_unit}" if size2_val else None
            }
        }
    except Exception as e:
        logger.error(f"Similarity calculation failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/match")
async def calculate_match_score(input: MatchInput):
    """
    Calculate comprehensive match score for product mapping.
    
    This is the main matching endpoint used by the harmonization engine.
    """
    try:
        embeddings = model.encode(
            [input.master_name, input.raw_description],
            convert_to_numpy=True
        )
        
        semantic_score = float(np.dot(embeddings[0], embeddings[1]) / 
                              (np.linalg.norm(embeddings[0]) * np.linalg.norm(embeddings[1])))
        
        master_size_ml = normalize_size_to_ml(input.master_size_value, input.master_size_unit)
        raw_size_ml = normalize_size_to_ml(input.raw_size_value, input.raw_size_unit)
        
        if not master_size_ml:
            val, unit = extract_size(input.master_name)
            master_size_ml = normalize_size_to_ml(val, unit)
        if not raw_size_ml:
            val, unit = extract_size(input.raw_description)
            raw_size_ml = normalize_size_to_ml(val, unit)
        
        master_brand = input.master_brand
        raw_brand = input.raw_brand
        
        if not master_brand:
            match = brand_service.lookup_brand(input.master_name.split()[0])
            master_brand = match.canonical_name if match else None
        if not raw_brand:
            match = brand_service.lookup_brand(input.raw_description.split()[0])
            raw_brand = match.canonical_name if match else None
        
        attribute_score = calculate_attribute_score(
            master_brand, raw_brand,
            master_size_ml, raw_size_ml
        )
        
        final_confidence = calculate_final_confidence(semantic_score, attribute_score)
        
        # Get dynamic thresholds from learning service
        recommendations = learning_service.get_confidence_recommendations()
        auto_threshold = recommendations.get('auto_confirm_threshold', 0.90)
        review_threshold = recommendations.get('review_threshold', 0.60)
        
        if final_confidence >= auto_threshold:
            recommended_status = "auto_confirm"
        elif final_confidence >= review_threshold:
            recommended_status = "pending_review"
        else:
            recommended_status = "low_confidence"
        
        return {
            "semantic_score": round(semantic_score, 4),
            "attribute_score": round(attribute_score, 4),
            "final_confidence": round(final_confidence, 4),
            "recommended_status": recommended_status,
            "thresholds": {
                "auto_confirm": auto_threshold,
                "review": review_threshold
            },
            "matching_details": {
                "master_brand_detected": master_brand,
                "raw_brand_detected": raw_brand,
                "brand_match": master_brand and raw_brand and 
                              normalize_text_basic(master_brand) == normalize_text_basic(raw_brand),
                "master_size_ml": master_size_ml,
                "raw_size_ml": raw_size_ml,
                "size_match": master_size_ml and raw_size_ml and 
                             abs(master_size_ml - raw_size_ml) / max(master_size_ml, raw_size_ml) < 0.1
            }
        }
    except Exception as e:
        logger.error(f"Match calculation failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/match/enhanced")
async def calculate_enhanced_match(input: EnhancedMatchInput):
    """
    Enhanced matching with automatic normalization.
    
    This endpoint:
    1. Normalizes the raw description (expands abbreviations)
    2. Calculates semantic similarity
    3. Matches attributes
    4. Returns confidence with normalization details
    """
    try:
        # Step 1: Normalize raw description if requested
        raw_normalized = input.raw_description
        normalization_result = None
        normalization_bonus = 0.0
        
        if input.normalize:
            normalization_result = text_normalizer.normalize(input.raw_description)
            raw_normalized = normalization_result.normalized
            
            # Calculate bonus based on successful normalizations
            if normalization_result.tokens_expanded:
                # Up to 5% bonus for successful expansions
                normalization_bonus = min(0.05, len(normalization_result.tokens_expanded) * 0.01)
        
        # Step 2: Generate embeddings
        embeddings = model.encode(
            [input.master_name, raw_normalized],
            convert_to_numpy=True
        )
        
        # Step 3: Calculate semantic similarity
        semantic_score = float(np.dot(embeddings[0], embeddings[1]) / 
                              (np.linalg.norm(embeddings[0]) * np.linalg.norm(embeddings[1])))
        
        # Step 4: Extract and match attributes
        master_size_ml = normalize_size_to_ml(input.master_size_value, input.master_size_unit)
        raw_size_ml = None
        
        if normalization_result and normalization_result.size_value:
            raw_size_ml = normalization_result.size_normalized_ml
        else:
            val, unit = extract_size(raw_normalized)
            raw_size_ml = normalize_size_to_ml(val, unit)
        
        # Brand detection
        master_brand = input.master_brand
        raw_brand = normalization_result.brand if normalization_result else None
        
        if not raw_brand:
            first_word = raw_normalized.split()[0] if raw_normalized else ""
            match = brand_service.lookup_brand(first_word)
            raw_brand = match.canonical_name if match else None
        
        # Category matching
        category_match = False
        if input.master_category and normalization_result and normalization_result.category_hint:
            category_match = input.master_category.lower() == normalization_result.category_hint.lower()
        
        # Step 5: Calculate attribute score
        attribute_score = calculate_attribute_score(
            master_brand, raw_brand,
            master_size_ml, raw_size_ml,
            category_match
        )
        
        # Step 6: Calculate final confidence
        final_confidence = calculate_final_confidence(
            semantic_score, 
            attribute_score,
            normalization_bonus
        )
        
        # Get dynamic thresholds
        recommendations = learning_service.get_confidence_recommendations()
        auto_threshold = recommendations.get('auto_confirm_threshold', 0.90)
        review_threshold = recommendations.get('review_threshold', 0.60)
        
        if final_confidence >= auto_threshold:
            recommended_status = "auto_confirm"
        elif final_confidence >= review_threshold:
            recommended_status = "pending_review"
        else:
            recommended_status = "low_confidence"
        
        return {
            "original_description": input.raw_description,
            "normalized_description": raw_normalized,
            "semantic_score": round(semantic_score, 4),
            "attribute_score": round(attribute_score, 4),
            "normalization_bonus": round(normalization_bonus, 4),
            "final_confidence": round(final_confidence, 4),
            "recommended_status": recommended_status,
            "matching_details": {
                "master_brand": input.master_brand,
                "detected_brand": raw_brand,
                "brand_match": master_brand and raw_brand and 
                              normalize_text_basic(master_brand or "") == normalize_text_basic(raw_brand or ""),
                "master_size_ml": master_size_ml,
                "raw_size_ml": raw_size_ml,
                "size_match": master_size_ml and raw_size_ml and 
                             abs(master_size_ml - raw_size_ml) / max(master_size_ml, raw_size_ml) < 0.1,
                "category_match": category_match,
                "detected_category": normalization_result.category_hint if normalization_result else None
            },
            "normalization_details": {
                "expansions": [
                    {"from": orig, "to": exp}
                    for orig, exp in normalization_result.tokens_expanded
                ] if normalization_result else [],
                "expansion_summary": text_normalizer.get_expansion_summary(normalization_result) if normalization_result else None
            } if input.normalize else None
        }
    except Exception as e:
        logger.error(f"Enhanced match calculation failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# ============================================
# API ENDPOINTS - Learning (NEW)
# ============================================

@app.post("/learn/decision")
async def record_hitl_decision(input: HITLDecisionInput):
    """
    Record a HITL decision for learning.
    
    The learning service will:
    1. Store the decision
    2. Extract abbreviation patterns from approved matches
    3. Update retailer-specific statistics
    4. Adjust confidence thresholds based on accuracy
    """
    try:
        decision = learning_service.record_decision(
            mapping_id=input.mapping_id,
            raw_description=input.raw_description,
            master_product=input.master_product,
            decision=input.decision,
            original_confidence=input.original_confidence,
            retailer=input.retailer,
            corrections=input.corrections
        )
        
        return {
            "recorded": True,
            "mapping_id": input.mapping_id,
            "decision": input.decision,
            "message": "Decision recorded and patterns extracted" if input.decision == "approved" else "Decision recorded"
        }
    except Exception as e:
        logger.error(f"Failed to record decision: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/learn/patterns")
async def get_learned_patterns(min_occurrences: int = 1):
    """
    Get all learned abbreviation patterns.
    
    Returns patterns sorted by occurrence count.
    """
    try:
        patterns = learning_service.get_learned_patterns(min_occurrences)
        
        return {
            "count": len(patterns),
            "patterns": [
                {
                    "abbreviation": p.abbreviation,
                    "expansion": p.expansion,
                    "occurrences": p.occurrences,
                    "confidence": p.confidence,
                    "retailers": p.retailers,
                    "last_seen": p.last_seen
                }
                for p in patterns
            ]
        }
    except Exception as e:
        logger.error(f"Failed to get patterns: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/learn/stats")
async def get_learning_stats(retailer: Optional[str] = None):
    """
    Get learning statistics.
    
    Returns:
    - Decision counts and approval rates
    - Patterns learned
    - Retailer-specific statistics
    - Confidence threshold recommendations
    """
    try:
        if retailer:
            return {
                "retailer": retailer,
                "stats": learning_service.get_retailer_stats(retailer)
            }
        else:
            return learning_service.get_learning_summary()
    except Exception as e:
        logger.error(f"Failed to get stats: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/learn/recommendations")
async def get_threshold_recommendations():
    """
    Get recommended confidence thresholds based on HITL feedback.
    
    Analyzes historical decisions to find optimal thresholds for:
    - Auto-confirmation (minimize false positives)
    - Human review (minimize false negatives)
    """
    try:
        return learning_service.get_confidence_recommendations()
    except Exception as e:
        logger.error(f"Failed to get recommendations: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# ============================================
# API ENDPOINTS - Brand Dictionary
# ============================================

@app.get("/brands")
async def get_brands():
    """Get all known brands from the dictionary"""
    try:
        brands = brand_service.get_all_brands()
        return {
            "count": len(brands),
            "brands": sorted(brands)
        }
    except Exception as e:
        logger.error(f"Failed to get brands: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/brands/{brand_name}")
async def get_brand_info(brand_name: str):
    """Get detailed info for a specific brand"""
    try:
        info = brand_service.get_brand_info(brand_name)
        if not info:
            raise HTTPException(status_code=404, detail=f"Brand '{brand_name}' not found")
        return info
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get brand info: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/brands/lookup")
async def lookup_brand(input: TextInput):
    """Look up brand from text (handles abbreviations)"""
    try:
        match = brand_service.lookup_brand(input.text)
        if match:
            return {
                "found": True,
                "original": match.original,
                "canonical_name": match.canonical_name,
                "confidence": match.confidence,
                "category": match.category,
                "manufacturer": match.manufacturer
            }
        else:
            return {
                "found": False,
                "original": input.text,
                "message": "Brand not recognized"
            }
    except Exception as e:
        logger.error(f"Brand lookup failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# ============================================
# LEGACY ENDPOINTS (Maintained for compatibility)
# ============================================

@app.post("/parse")
async def parse_attributes(input: ParseInput):
    """Parse product attributes from description"""
    try:
        # Use new normalizer for parsing
        result = text_normalizer.normalize(input.description)
        
        return {
            "description": input.description,
            "attributes": {
                "brand": result.brand,
                "size_value": result.size_value,
                "size_unit": result.size_unit,
                "size_normalized_ml": result.size_normalized_ml,
                "variant": None,  # Could be extracted from normalized text
                "category_hint": result.category_hint
            },
            "normalized": result.normalized
        }
    except Exception as e:
        logger.error(f"Attribute parsing failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/clean")
async def clean_description(input: CleanInput):
    """Clean and normalize product description"""
    try:
        result = text_normalizer.normalize(input.description)
        
        return {
            "original": input.description,
            "cleaned": result.normalized,
            "expansions": [
                {"from": orig, "to": exp}
                for orig, exp in result.tokens_expanded
            ]
        }
    except Exception as e:
        logger.error(f"Description cleaning failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/search")
async def semantic_search(input: SearchInput):
    """Perform semantic search on a corpus of products"""
    try:
        if not input.corpus:
            return {"results": [], "message": "No corpus provided"}
        
        query_embedding = model.encode(input.query, convert_to_numpy=True)
        corpus_texts = [item.get('text', item.get('name', '')) for item in input.corpus]
        corpus_embeddings = model.encode(corpus_texts, convert_to_numpy=True)
        
        similarities = []
        for i, emb in enumerate(corpus_embeddings):
            score = float(np.dot(query_embedding, emb) / 
                         (np.linalg.norm(query_embedding) * np.linalg.norm(emb)))
            similarities.append({
                "index": i,
                "id": input.corpus[i].get('id', str(i)),
                "text": corpus_texts[i],
                "score": round(score, 4)
            })
        
        similarities.sort(key=lambda x: x['score'], reverse=True)
        
        return {
            "query": input.query,
            "results": similarities[:input.top_k]
        }
    except Exception as e:
        logger.error(f"Semantic search failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# ============================================
# STARTUP EVENT
# ============================================

@app.on_event("startup")
async def startup_event():
    """Warm up the model and services on startup"""
    logger.info("Warming up model...")
    _ = model.encode("warmup text for sentence transformer model", convert_to_numpy=True)
    
    # Test normalizer
    test_result = text_normalizer.normalize("CRST PRHLTH WHTN TP 4.2OZ")
    logger.info(f"Normalizer test: '{test_result.original}' -> '{test_result.normalized}'")
    
    logger.info(f"Loaded {len(brand_service.get_all_brands())} brands")
    logger.info("NLP Service v2.0 ready!")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
