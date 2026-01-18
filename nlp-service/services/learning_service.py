"""
Learning Service
Stores and learns from HITL decisions to improve matching over time.
Implements the feedback loop for continuous improvement.
"""

import json
import os
from typing import Dict, List, Optional, Tuple
from dataclasses import dataclass, asdict
from datetime import datetime
from collections import defaultdict

from .brand_dictionary import BrandDictionaryService


@dataclass
class HITLDecision:
    """Record of a human decision"""
    mapping_id: str
    raw_description: str
    master_product: str
    decision: str  # 'approved', 'rejected'
    original_confidence: float
    retailer: str
    timestamp: str
    corrections: Optional[Dict] = None  # Any corrections made


@dataclass
class LearnedPattern:
    """A pattern learned from HITL decisions"""
    abbreviation: str
    expansion: str
    occurrences: int
    confidence: float
    retailers: List[str]
    last_seen: str


class LearningService:
    """
    Service for learning from HITL decisions.
    
    Features:
    1. Store all HITL decisions for analysis
    2. Extract abbreviation patterns from approved matches
    3. Track confidence accuracy per retailer
    4. Provide recommendations for threshold tuning
    """
    
    def __init__(self, 
                 brand_service: Optional[BrandDictionaryService] = None,
                 data_dir: str = "/app/data"):
        self.brand_service = brand_service or BrandDictionaryService()
        self.data_dir = data_dir
        
        # In-memory stores
        self._decisions: List[HITLDecision] = []
        self._patterns: Dict[str, LearnedPattern] = {}
        self._retailer_stats: Dict[str, Dict] = defaultdict(lambda: {
            'total': 0, 'approved': 0, 'rejected': 0, 
            'avg_confidence_approved': 0, 'avg_confidence_rejected': 0
        })
        
        # Load existing data
        self._load_data()
    
    def _load_data(self):
        """Load persisted learning data"""
        os.makedirs(self.data_dir, exist_ok=True)
        
        # Load decisions
        decisions_path = os.path.join(self.data_dir, 'hitl_decisions.json')
        if os.path.exists(decisions_path):
            try:
                with open(decisions_path, 'r') as f:
                    data = json.load(f)
                    self._decisions = [HITLDecision(**d) for d in data]
            except Exception as e:
                print(f"Warning: Could not load decisions: {e}")
        
        # Load patterns
        patterns_path = os.path.join(self.data_dir, 'learned_patterns.json')
        if os.path.exists(patterns_path):
            try:
                with open(patterns_path, 'r') as f:
                    data = json.load(f)
                    self._patterns = {k: LearnedPattern(**v) for k, v in data.items()}
            except Exception as e:
                print(f"Warning: Could not load patterns: {e}")
        
        # Rebuild retailer stats
        for decision in self._decisions:
            self._update_retailer_stats(decision)
    
    def _save_data(self):
        """Persist learning data"""
        os.makedirs(self.data_dir, exist_ok=True)
        
        # Save decisions
        decisions_path = os.path.join(self.data_dir, 'hitl_decisions.json')
        with open(decisions_path, 'w') as f:
            json.dump([asdict(d) for d in self._decisions[-10000:]], f, indent=2)  # Keep last 10K
        
        # Save patterns
        patterns_path = os.path.join(self.data_dir, 'learned_patterns.json')
        with open(patterns_path, 'w') as f:
            json.dump({k: asdict(v) for k, v in self._patterns.items()}, f, indent=2)
    
    def record_decision(self, 
                       mapping_id: str,
                       raw_description: str,
                       master_product: str,
                       decision: str,
                       original_confidence: float,
                       retailer: str,
                       corrections: Optional[Dict] = None):
        """
        Record a HITL decision and learn from it.
        """
        hitl_decision = HITLDecision(
            mapping_id=mapping_id,
            raw_description=raw_description,
            master_product=master_product,
            decision=decision,
            original_confidence=original_confidence,
            retailer=retailer,
            timestamp=datetime.utcnow().isoformat(),
            corrections=corrections
        )
        
        self._decisions.append(hitl_decision)
        self._update_retailer_stats(hitl_decision)
        
        # Learn from approved matches
        if decision == 'approved':
            self._learn_from_approval(raw_description, master_product, retailer)
        
        # Persist
        self._save_data()
        
        return hitl_decision
    
    def _update_retailer_stats(self, decision: HITLDecision):
        """Update retailer-specific statistics"""
        stats = self._retailer_stats[decision.retailer]
        stats['total'] += 1
        
        if decision.decision == 'approved':
            stats['approved'] += 1
            # Update running average
            n = stats['approved']
            stats['avg_confidence_approved'] = (
                (stats['avg_confidence_approved'] * (n - 1) + decision.original_confidence) / n
            )
        else:
            stats['rejected'] += 1
            n = stats['rejected']
            stats['avg_confidence_rejected'] = (
                (stats['avg_confidence_rejected'] * (n - 1) + decision.original_confidence) / n
            )
    
    def _learn_from_approval(self, raw: str, master: str, retailer: str):
        """
        Extract and learn abbreviation patterns from an approved match.
        """
        raw_tokens = raw.upper().split()
        master_tokens = master.upper().split()
        
        # Try to align tokens and find abbreviations
        for raw_token in raw_tokens:
            # Skip if token is a number or size
            if any(c.isdigit() for c in raw_token):
                continue
            
            # Skip very short tokens
            if len(raw_token) < 2:
                continue
            
            # Check if this token is an abbreviation of any master token
            for master_token in master_tokens:
                if self._is_abbreviation_of(raw_token, master_token):
                    self._record_pattern(raw_token, master_token, retailer)
                    break
    
    def _is_abbreviation_of(self, abbrev: str, full: str) -> bool:
        """Check if abbrev is likely an abbreviation of full"""
        abbrev = abbrev.upper()
        full = full.upper()
        
        # Must be shorter
        if len(abbrev) >= len(full):
            return False
        
        # Check if consonants match (common abbreviation pattern)
        vowels = set('AEIOU')
        abbrev_consonants = ''.join(c for c in abbrev if c not in vowels)
        full_consonants = ''.join(c for c in full if c not in vowels)
        
        if abbrev_consonants and full_consonants.startswith(abbrev_consonants):
            return True
        
        # Check if abbreviation is prefix
        if full.startswith(abbrev) and len(abbrev) >= 2:
            return True
        
        return False
    
    def _record_pattern(self, abbreviation: str, expansion: str, retailer: str):
        """Record an abbreviation pattern"""
        key = abbreviation.upper()
        
        if key in self._patterns:
            pattern = self._patterns[key]
            pattern.occurrences += 1
            pattern.last_seen = datetime.utcnow().isoformat()
            if retailer not in pattern.retailers:
                pattern.retailers.append(retailer)
            # Increase confidence with more occurrences (max 0.95)
            pattern.confidence = min(0.95, 0.7 + (pattern.occurrences * 0.05))
        else:
            self._patterns[key] = LearnedPattern(
                abbreviation=abbreviation.upper(),
                expansion=expansion.capitalize(),
                occurrences=1,
                confidence=0.7,
                retailers=[retailer],
                last_seen=datetime.utcnow().isoformat()
            )
        
        # If pattern is confident enough, teach to brand service
        pattern = self._patterns[key]
        if pattern.confidence >= 0.8 and pattern.occurrences >= 3:
            self.brand_service.learn_abbreviation(abbreviation, expansion.capitalize())
    
    def get_learned_patterns(self, min_occurrences: int = 1) -> List[LearnedPattern]:
        """Get all learned patterns, optionally filtered by occurrences"""
        patterns = [p for p in self._patterns.values() if p.occurrences >= min_occurrences]
        return sorted(patterns, key=lambda p: p.occurrences, reverse=True)
    
    def get_retailer_stats(self, retailer: Optional[str] = None) -> Dict:
        """Get statistics for a retailer or all retailers"""
        if retailer:
            stats = dict(self._retailer_stats.get(retailer, {}))
            if stats.get('total', 0) > 0:
                stats['approval_rate'] = stats['approved'] / stats['total']
            return stats
        
        # All retailers
        result = {}
        for r, stats in self._retailer_stats.items():
            result[r] = dict(stats)
            if stats['total'] > 0:
                result[r]['approval_rate'] = stats['approved'] / stats['total']
        return result
    
    def get_confidence_recommendations(self) -> Dict:
        """
        Analyze decisions and recommend confidence thresholds.
        """
        if not self._decisions:
            return {
                'auto_confirm_threshold': 0.95,
                'review_threshold': 0.70,
                'message': 'No HITL data yet. Using defaults.'
            }
        
        # Analyze approved vs rejected by confidence
        approved_confidences = [d.original_confidence for d in self._decisions if d.decision == 'approved']
        rejected_confidences = [d.original_confidence for d in self._decisions if d.decision == 'rejected']
        
        if not approved_confidences:
            return {
                'auto_confirm_threshold': 0.95,
                'review_threshold': 0.70,
                'message': 'No approved matches yet.'
            }
        
        # Find threshold where 95% of approved matches would pass
        approved_confidences.sort()
        idx_95 = int(len(approved_confidences) * 0.05)  # Bottom 5%
        auto_confirm = approved_confidences[idx_95] if idx_95 < len(approved_confidences) else 0.95
        
        # Find threshold where most rejections would be caught
        review_threshold = 0.70
        if rejected_confidences:
            review_threshold = min(rejected_confidences) - 0.05
            review_threshold = max(0.50, review_threshold)  # Don't go below 50%
        
        return {
            'auto_confirm_threshold': round(auto_confirm, 2),
            'review_threshold': round(review_threshold, 2),
            'total_decisions': len(self._decisions),
            'approved': len(approved_confidences),
            'rejected': len(rejected_confidences),
            'approval_rate': len(approved_confidences) / len(self._decisions) if self._decisions else 0
        }
    
    def get_learning_summary(self) -> Dict:
        """Get summary of what the system has learned"""
        return {
            'total_decisions': len(self._decisions),
            'patterns_learned': len(self._patterns),
            'high_confidence_patterns': len([p for p in self._patterns.values() if p.confidence >= 0.8]),
            'retailers_seen': list(self._retailer_stats.keys()),
            'retailer_stats': self.get_retailer_stats(),
            'recommendations': self.get_confidence_recommendations()
        }
