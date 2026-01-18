"""
Text Normalizer Service
Normalizes retailer product descriptions by expanding abbreviations,
standardizing sizes, and cleaning text.
"""

import re
from typing import Dict, List, Optional, Tuple
from dataclasses import dataclass

from .brand_dictionary import BrandDictionaryService


@dataclass
class NormalizedText:
    """Result of text normalization"""
    original: str
    normalized: str
    brand: Optional[str]
    brand_confidence: float
    size_value: Optional[float]
    size_unit: Optional[str]
    size_normalized_ml: Optional[float]
    tokens_expanded: List[Tuple[str, str]]  # (original, expanded)
    category_hint: Optional[str]


class TextNormalizerService:
    """
    Service for normalizing retailer product descriptions.
    Transforms messy abbreviated text into clean, matchable descriptions.
    """
    
    def __init__(self, brand_service: Optional[BrandDictionaryService] = None):
        self.brand_service = brand_service or BrandDictionaryService()
        
        # Size unit conversions to ml/g
        self._unit_conversions = {
            'ml': 1.0,
            'l': 1000.0,
            'ltr': 1000.0,
            'liter': 1000.0,
            'litre': 1000.0,
            'oz': 29.5735,
            'fl oz': 29.5735,
            'floz': 29.5735,
            'g': 1.0,
            'gm': 1.0,
            'gram': 1.0,
            'kg': 1000.0,
            'lb': 453.592,
            'lbs': 453.592,
            'ct': 1.0,
            'count': 1.0,
            'pk': 1.0,
            'pack': 1.0,
        }
        
        # Size pattern regex
        self._size_pattern = re.compile(
            r'(\d+(?:\.\d+)?)\s*(ml|l|ltr|liter|litre|oz|fl\s*oz|floz|g|gm|gram|kg|lb|lbs|ct|count|pk|pack)',
            re.IGNORECASE
        )
    
    def normalize(self, text: str) -> NormalizedText:
        """
        Normalize a product description.
        
        Steps:
        1. Clean and tokenize
        2. Extract and parse size
        3. Identify brand
        4. Expand abbreviations
        5. Reconstruct normalized text
        """
        original = text.strip()
        tokens_expanded = []
        
        # Step 1: Clean text
        cleaned = self._clean_text(original)
        
        # Step 2: Extract size
        size_value, size_unit, size_normalized = self._extract_size(cleaned)
        
        # Remove size from text for further processing
        text_without_size = self._size_pattern.sub('', cleaned).strip()
        
        # Step 3: Tokenize
        tokens = self._tokenize(text_without_size)
        
        # Step 4: Identify brand (check first few tokens)
        brand = None
        brand_confidence = 0.0
        category_hint = None
        brand_tokens_used = 0
        
        # Try multi-token brand first (e.g., "MTN DEW")
        for i in range(min(3, len(tokens)), 0, -1):
            potential_brand = ' '.join(tokens[:i])
            brand_match = self.brand_service.lookup_brand(potential_brand)
            if brand_match:
                brand = brand_match.canonical_name
                brand_confidence = brand_match.confidence
                category_hint = brand_match.category
                brand_tokens_used = i
                tokens_expanded.append((potential_brand, brand))
                break
        
        # Step 5: Expand remaining tokens
        normalized_tokens = []
        
        if brand:
            normalized_tokens.append(brand)
        
        for i, token in enumerate(tokens):
            if i < brand_tokens_used:
                continue  # Skip tokens used for brand
            
            # Try to expand abbreviation
            expanded = self.brand_service.expand_abbreviation(token)
            if expanded:
                normalized_tokens.append(expanded)
                tokens_expanded.append((token, expanded))
            else:
                # Keep original (capitalized)
                normalized_tokens.append(token.capitalize())
        
        # Step 6: Reconstruct normalized text
        normalized = ' '.join(normalized_tokens)
        
        # Add size back
        if size_value and size_unit:
            normalized = f"{normalized} {size_value}{size_unit}"
        
        return NormalizedText(
            original=original,
            normalized=normalized,
            brand=brand,
            brand_confidence=brand_confidence,
            size_value=size_value,
            size_unit=size_unit,
            size_normalized_ml=size_normalized,
            tokens_expanded=tokens_expanded,
            category_hint=category_hint
        )
    
    def _clean_text(self, text: str) -> str:
        """Clean and standardize text"""
        # Remove special characters except alphanumeric, spaces, and common punctuation
        cleaned = re.sub(r'[^\w\s\-&\.\']', ' ', text)
        # Normalize whitespace
        cleaned = ' '.join(cleaned.split())
        return cleaned
    
    def _tokenize(self, text: str) -> List[str]:
        """Split text into tokens"""
        # Split on whitespace and common separators
        tokens = re.split(r'[\s\-_]+', text)
        # Filter empty tokens
        return [t for t in tokens if t.strip()]
    
    def _extract_size(self, text: str) -> Tuple[Optional[float], Optional[str], Optional[float]]:
        """
        Extract size information from text.
        Returns (value, unit, normalized_ml)
        """
        match = self._size_pattern.search(text)
        if not match:
            return None, None, None
        
        value = float(match.group(1))
        unit = match.group(2).lower().replace(' ', '')
        
        # Normalize to ml/g
        conversion = self._unit_conversions.get(unit, 1.0)
        normalized = round(value * conversion, 2)
        
        # Standardize unit display
        unit_display = unit
        if unit in ['floz', 'fl oz']:
            unit_display = 'oz'
        elif unit in ['ltr', 'liter', 'litre']:
            unit_display = 'L'
        elif unit == 'gm':
            unit_display = 'g'
        
        return value, unit_display, normalized
    
    def normalize_batch(self, texts: List[str]) -> List[NormalizedText]:
        """Normalize multiple texts"""
        return [self.normalize(text) for text in texts]
    
    def get_expansion_summary(self, normalized: NormalizedText) -> str:
        """Get a human-readable summary of expansions made"""
        if not normalized.tokens_expanded:
            return "No expansions made"
        
        expansions = [f"'{orig}' → '{exp}'" for orig, exp in normalized.tokens_expanded]
        return ", ".join(expansions)
