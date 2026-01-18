"""
Abbreviation Expander Service
Intelligent expansion of abbreviations using multiple strategies.
"""

import re
from typing import Dict, List, Optional, Tuple
from dataclasses import dataclass
from difflib import SequenceMatcher

from .brand_dictionary import BrandDictionaryService


@dataclass
class ExpansionResult:
    """Result of abbreviation expansion"""
    original: str
    expanded: str
    confidence: float
    method: str  # 'dictionary', 'learned', 'pattern', 'fuzzy'


class AbbreviationExpanderService:
    """
    Service for expanding abbreviations using multiple strategies:
    1. Dictionary lookup (known abbreviations)
    2. Learned patterns (from HITL feedback)
    3. Pattern-based expansion (common patterns like removing vowels)
    4. Fuzzy matching (similarity to known words)
    """
    
    def __init__(self, brand_service: Optional[BrandDictionaryService] = None):
        self.brand_service = brand_service or BrandDictionaryService()
        
        # Common words for fuzzy matching
        self._common_words = self._init_common_words()
        
        # Vowel removal patterns (common abbreviation method)
        self._vowel_pattern = re.compile(r'[AEIOU]', re.IGNORECASE)
    
    def _init_common_words(self) -> Dict[str, str]:
        """Initialize dictionary of common product words"""
        words = [
            "Original", "White", "Whitening", "Clean", "Fresh", "Advanced",
            "Ultra", "Gentle", "Radiant", "Pro", "Health", "Total", "Clinical",
            "Daily", "Moisture", "Renewal", "Classic", "Comfort", "Cool", "Rush",
            "Motion", "Sense", "Arctic", "Mint", "Lemon", "Lime", "Orange",
            "Zero", "Sugar", "Free", "Purified", "Water", "Swagger", "Fiji",
            "Apollo", "Complete", "Cream", "Onion", "Nacho", "Cheese", "Ranch",
            "Double", "Stuf", "Platinum", "Liquid", "Red", "Blue", "Green",
            "Mountain", "Spring", "Berry", "Tropical", "Vanilla", "Chocolate",
            "Strawberry", "Cherry", "Grape", "Apple", "Peach", "Mango"
        ]
        # Create lookup dict with uppercase keys
        return {w.upper(): w for w in words}
    
    def expand(self, abbrev: str) -> ExpansionResult:
        """
        Expand an abbreviation using the best available method.
        """
        abbrev_clean = abbrev.strip().upper()
        
        # Strategy 1: Dictionary lookup
        dict_result = self.brand_service.expand_abbreviation(abbrev_clean)
        if dict_result:
            return ExpansionResult(
                original=abbrev,
                expanded=dict_result,
                confidence=1.0,
                method='dictionary'
            )
        
        # Strategy 2: Check if it's already a full word
        if abbrev_clean in self._common_words:
            return ExpansionResult(
                original=abbrev,
                expanded=self._common_words[abbrev_clean],
                confidence=1.0,
                method='dictionary'
            )
        
        # Strategy 3: Pattern-based (vowel removal detection)
        pattern_result = self._try_vowel_pattern(abbrev_clean)
        if pattern_result:
            return ExpansionResult(
                original=abbrev,
                expanded=pattern_result,
                confidence=0.85,
                method='pattern'
            )
        
        # Strategy 4: Fuzzy matching
        fuzzy_result, fuzzy_score = self._fuzzy_match(abbrev_clean)
        if fuzzy_result and fuzzy_score >= 0.6:
            return ExpansionResult(
                original=abbrev,
                expanded=fuzzy_result,
                confidence=fuzzy_score,
                method='fuzzy'
            )
        
        # No expansion found - return original
        return ExpansionResult(
            original=abbrev,
            expanded=abbrev.capitalize(),
            confidence=0.0,
            method='none'
        )
    
    def _try_vowel_pattern(self, abbrev: str) -> Optional[str]:
        """
        Try to match abbreviation to word by re-inserting vowels.
        E.g., 'WHTN' could match 'WHITENING' (W_H_T_N)
        """
        abbrev_consonants = self._vowel_pattern.sub('', abbrev)
        
        for word, canonical in self._common_words.items():
            word_consonants = self._vowel_pattern.sub('', word)
            if abbrev_consonants == word_consonants and len(abbrev) < len(word):
                return canonical
        
        return None
    
    def _fuzzy_match(self, abbrev: str) -> Tuple[Optional[str], float]:
        """
        Find best fuzzy match for abbreviation.
        Uses prefix matching and sequence similarity.
        """
        best_match = None
        best_score = 0.0
        
        for word, canonical in self._common_words.items():
            # Check if abbreviation is prefix
            if word.startswith(abbrev) and len(abbrev) >= 2:
                score = len(abbrev) / len(word) + 0.3  # Bonus for prefix match
                if score > best_score:
                    best_score = min(score, 1.0)
                    best_match = canonical
            
            # Sequence similarity
            similarity = SequenceMatcher(None, abbrev, word).ratio()
            if similarity > best_score and similarity >= 0.6:
                best_score = similarity
                best_match = canonical
        
        return best_match, best_score
    
    def expand_text(self, text: str) -> Tuple[str, List[ExpansionResult]]:
        """
        Expand all abbreviations in a text.
        Returns (expanded_text, list of expansions)
        """
        tokens = text.split()
        expanded_tokens = []
        expansions = []
        
        for token in tokens:
            result = self.expand(token)
            expanded_tokens.append(result.expanded)
            if result.method != 'none' and result.original.upper() != result.expanded.upper():
                expansions.append(result)
        
        return ' '.join(expanded_tokens), expansions
    
    def learn_expansion(self, abbreviation: str, full_text: str):
        """
        Learn a new abbreviation expansion.
        Delegates to brand service for persistence.
        """
        self.brand_service.learn_abbreviation(abbreviation, full_text)
