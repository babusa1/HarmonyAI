"""
HarmonizeIQ NLP Service
========================
FastAPI service for semantic embeddings and product matching.

Uses Sentence Transformers (all-MiniLM-L6-v2) for generating embeddings
and calculating semantic similarity between product descriptions.

Matching Algorithm:
- Semantic Similarity (70% weight): Cosine similarity between embeddings
- Attribute Matching (30% weight): Brand, size, category matching
- Combined score determines confidence level:
  - > 0.95: Auto-confirm
  - 0.70-0.95: Human review
  - < 0.70: Flag as new/unmatched
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

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize FastAPI app
app = FastAPI(
    title="HarmonizeIQ NLP Service",
    description="AI-powered semantic similarity for product data harmonization",
    version="1.0.0"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Load the sentence transformer model
# all-MiniLM-L6-v2: Good balance of speed and accuracy, 384 dimensions
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

# ============================================
# UTILITY FUNCTIONS
# ============================================

def normalize_text(text: str) -> str:
    """Normalize text for comparison"""
    # Convert to lowercase and remove accents
    text = unidecode(text.lower())
    # Remove special characters but keep spaces
    text = re.sub(r'[^a-z0-9\s]', ' ', text)
    # Collapse multiple spaces
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
        'ml': 1.0,
        'l': 1000.0,
        'oz': 29.5735,
        'floz': 29.5735,
        'g': 1.0,
        'kg': 1000.0,
        'lb': 453.592,
        'ct': 1.0,
        'count': 1.0,
        'pack': 1.0
    }
    
    unit_lower = unit.lower().replace(' ', '')
    multiplier = conversions.get(unit_lower, 1.0)
    return value * multiplier

def extract_brand(text: str, known_brands: List[str] = None) -> Optional[str]:
    """Extract brand from product description"""
    known_brands = known_brands or [
        'crest', 'colgate', 'sensodyne', 'oral-b', 'oralb',
        'pepsi', 'coca-cola', 'coca cola', 'coke', 'sprite', 'fanta', 'mountain dew',
        'head & shoulders', 'head and shoulders', 'pantene', 'dove', 'old spice',
        'tide', 'gain', 'dawn', 'persil', 'all',
        "lay's", 'lays', 'doritos', 'pringles', 'oreo',
        'gatorade', 'aquafina', 'dasani', 'listerine'
    ]
    
    text_lower = text.lower()
    for brand in known_brands:
        if brand in text_lower:
            return brand.title()
    return None

def calculate_attribute_score(
    master_brand: str,
    raw_brand: str,
    master_size_ml: float,
    raw_size_ml: float
) -> float:
    """
    Calculate attribute matching score (0-1)
    
    Components:
    - Brand match: 60% of attribute score
    - Size match: 40% of attribute score
    """
    score = 0.0
    weights = {'brand': 0.6, 'size': 0.4}
    
    # Brand matching
    if master_brand and raw_brand:
        brand_similarity = fuzz.ratio(
            normalize_text(master_brand),
            normalize_text(raw_brand)
        ) / 100.0
        score += weights['brand'] * brand_similarity
    elif not master_brand and not raw_brand:
        score += weights['brand'] * 0.5  # Neutral if both missing
    
    # Size matching
    if master_size_ml and raw_size_ml and master_size_ml > 0:
        # Calculate percentage difference
        size_diff = abs(master_size_ml - raw_size_ml) / max(master_size_ml, raw_size_ml)
        size_score = max(0, 1 - size_diff)  # 1 if identical, decreases with difference
        score += weights['size'] * size_score
    elif not master_size_ml and not raw_size_ml:
        score += weights['size'] * 0.5  # Neutral if both missing
    
    return score

def calculate_final_confidence(
    semantic_score: float,
    attribute_score: float,
    semantic_weight: float = 0.70,
    attribute_weight: float = 0.30
) -> float:
    """
    Calculate final confidence score using weighted combination.
    
    Formula:
    Final Score = (0.70 × Semantic Similarity) + (0.30 × Attribute Match)
    
    Args:
        semantic_score: Cosine similarity between embeddings (0-1)
        attribute_score: Attribute matching score (0-1)
        semantic_weight: Weight for semantic similarity (default: 0.70)
        attribute_weight: Weight for attribute matching (default: 0.30)
    
    Returns:
        Final confidence score (0-1)
    """
    return (semantic_weight * semantic_score) + (attribute_weight * attribute_score)

# ============================================
# API ENDPOINTS
# ============================================

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "service": "harmonizeiq-nlp",
        "model": "all-MiniLM-L6-v2",
        "embedding_dimension": 384
    }

@app.post("/embed")
async def generate_embedding(input: TextInput):
    """
    Generate embedding for a single text.
    
    Returns a 384-dimensional vector representation.
    """
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
    """
    Generate embeddings for multiple texts in batch.
    
    More efficient than individual calls for bulk processing.
    """
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

@app.post("/similarity")
async def calculate_similarity(input: SimilarityInput):
    """
    Calculate semantic similarity between two texts.
    
    Returns:
        - score: Combined final score (weighted)
        - semantic_score: Raw cosine similarity
        - attribute_score: Attribute matching score
    """
    try:
        # Generate embeddings
        embeddings = model.encode([input.text1, input.text2], convert_to_numpy=True)
        
        # Calculate cosine similarity
        # Formula: cos(θ) = (A · B) / (||A|| × ||B||)
        dot_product = np.dot(embeddings[0], embeddings[1])
        norm1 = np.linalg.norm(embeddings[0])
        norm2 = np.linalg.norm(embeddings[1])
        semantic_score = float(dot_product / (norm1 * norm2))
        
        # Extract attributes for attribute matching
        brand1 = extract_brand(input.text1)
        brand2 = extract_brand(input.text2)
        size1_val, size1_unit = extract_size(input.text1)
        size2_val, size2_unit = extract_size(input.text2)
        size1_ml = normalize_size_to_ml(size1_val, size1_unit)
        size2_ml = normalize_size_to_ml(size2_val, size2_unit)
        
        # Calculate attribute score
        attribute_score = calculate_attribute_score(brand1, brand2, size1_ml, size2_ml)
        
        # Calculate final confidence
        final_score = calculate_final_confidence(semantic_score, attribute_score)
        
        return {
            "text1": input.text1,
            "text2": input.text2,
            "score": round(final_score, 4),
            "semantic_score": round(semantic_score, 4),
            "attribute_score": round(attribute_score, 4),
            "confidence_level": (
                "high" if final_score >= 0.95 else
                "medium" if final_score >= 0.70 else
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
    
    Algorithm:
    1. Generate embeddings for both descriptions
    2. Calculate cosine similarity (semantic score)
    3. Calculate attribute match score (brand + size)
    4. Combine with weights: 70% semantic + 30% attribute
    """
    try:
        # Generate embeddings
        embeddings = model.encode(
            [input.master_name, input.raw_description],
            convert_to_numpy=True
        )
        
        # Semantic similarity (cosine)
        semantic_score = float(np.dot(embeddings[0], embeddings[1]) / 
                              (np.linalg.norm(embeddings[0]) * np.linalg.norm(embeddings[1])))
        
        # Normalize sizes for comparison
        master_size_ml = normalize_size_to_ml(input.master_size_value, input.master_size_unit)
        raw_size_ml = normalize_size_to_ml(input.raw_size_value, input.raw_size_unit)
        
        # If sizes not provided, try to extract from descriptions
        if not master_size_ml:
            val, unit = extract_size(input.master_name)
            master_size_ml = normalize_size_to_ml(val, unit)
        if not raw_size_ml:
            val, unit = extract_size(input.raw_description)
            raw_size_ml = normalize_size_to_ml(val, unit)
        
        # Get brands
        master_brand = input.master_brand or extract_brand(input.master_name)
        raw_brand = input.raw_brand or extract_brand(input.raw_description)
        
        # Calculate attribute score
        attribute_score = calculate_attribute_score(
            master_brand, raw_brand,
            master_size_ml, raw_size_ml
        )
        
        # Final confidence (weighted)
        final_confidence = calculate_final_confidence(semantic_score, attribute_score)
        
        # Determine status
        if final_confidence >= 0.95:
            recommended_status = "auto_confirm"
        elif final_confidence >= 0.70:
            recommended_status = "pending_review"
        else:
            recommended_status = "low_confidence"
        
        return {
            "semantic_score": round(semantic_score, 4),
            "attribute_score": round(attribute_score, 4),
            "final_confidence": round(final_confidence, 4),
            "recommended_status": recommended_status,
            "matching_details": {
                "master_brand_detected": master_brand,
                "raw_brand_detected": raw_brand,
                "brand_match": master_brand and raw_brand and 
                              normalize_text(master_brand) == normalize_text(raw_brand),
                "master_size_ml": master_size_ml,
                "raw_size_ml": raw_size_ml,
                "size_match": master_size_ml and raw_size_ml and 
                             abs(master_size_ml - raw_size_ml) / max(master_size_ml, raw_size_ml) < 0.1
            }
        }
    except Exception as e:
        logger.error(f"Match calculation failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/parse")
async def parse_attributes(input: ParseInput):
    """
    Parse product attributes from description.
    
    Extracts:
    - Brand name
    - Size value and unit
    - Normalized size in ml/g
    """
    try:
        text = input.description
        
        brand = extract_brand(text)
        size_value, size_unit = extract_size(text)
        size_normalized = normalize_size_to_ml(size_value, size_unit)
        
        # Try to extract variant/flavor
        variant_patterns = [
            r'(mint|fresh|clean|original|cherry|vanilla|lemon|lime|orange|grape)',
            r'(whitening|sensitive|protection|deep clean|advanced)',
        ]
        variant = None
        for pattern in variant_patterns:
            match = re.search(pattern, text.lower())
            if match:
                variant = match.group(1).title()
                break
        
        return {
            "description": text,
            "attributes": {
                "brand": brand,
                "size_value": size_value,
                "size_unit": size_unit,
                "size_normalized_ml": size_normalized,
                "variant": variant
            }
        }
    except Exception as e:
        logger.error(f"Attribute parsing failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/clean")
async def clean_description(input: CleanInput):
    """
    Clean and normalize product description.
    
    - Removes promotional text
    - Normalizes spacing
    - Standardizes abbreviations
    """
    try:
        text = input.description
        
        # Remove common promotional text
        promo_patterns = [
            r'\b(new|sale|bogo|clearance|special offer|limited time)\b',
            r'\b(buy \d+ get \d+)\b',
            r'[!\*#]+',
        ]
        for pattern in promo_patterns:
            text = re.sub(pattern, '', text, flags=re.IGNORECASE)
        
        # Expand common abbreviations
        abbreviations = {
            r'\btp\b': 'toothpaste',
            r'\bmw\b': 'mouthwash',
            r'\bsda\b': 'soda',
            r'\bbev\b': 'beverage',
            r'\bdet\b': 'detergent',
            r'\bsh\b': 'shampoo',
            r'\bcond\b': 'conditioner',
        }
        for abbrev, expanded in abbreviations.items():
            text = re.sub(abbrev, expanded, text, flags=re.IGNORECASE)
        
        # Normalize spacing
        text = re.sub(r'\s+', ' ', text).strip()
        
        return {
            "original": input.description,
            "cleaned": text
        }
    except Exception as e:
        logger.error(f"Description cleaning failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/search")
async def semantic_search(input: SearchInput):
    """
    Perform semantic search on a corpus of products.
    
    Returns top-k most similar items.
    """
    try:
        if not input.corpus:
            return {"results": [], "message": "No corpus provided"}
        
        # Generate query embedding
        query_embedding = model.encode(input.query, convert_to_numpy=True)
        
        # Generate corpus embeddings
        corpus_texts = [item.get('text', item.get('name', '')) for item in input.corpus]
        corpus_embeddings = model.encode(corpus_texts, convert_to_numpy=True)
        
        # Calculate similarities
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
        
        # Sort by score and return top-k
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
    """Warm up the model on startup"""
    logger.info("Warming up model...")
    _ = model.encode("warmup text", convert_to_numpy=True)
    logger.info("NLP Service ready!")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
