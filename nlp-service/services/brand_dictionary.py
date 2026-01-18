"""
Brand Dictionary Service
Maps abbreviations and codes to canonical brand names.
Built from FMCG industry knowledge.
"""

import re
from typing import Dict, List, Optional, Tuple
from dataclasses import dataclass
import json
import os


@dataclass
class BrandMatch:
    """Result of brand lookup"""
    original: str
    canonical_name: str
    confidence: float
    category: Optional[str] = None
    manufacturer: Optional[str] = None


class BrandDictionaryService:
    """
    Service for looking up and matching brand abbreviations.
    Supports learning new abbreviations over time.
    """
    
    def __init__(self, custom_dict_path: Optional[str] = None):
        self._brand_dict: Dict[str, dict] = {}
        self._abbreviation_dict: Dict[str, str] = {}
        self._learned_mappings: Dict[str, str] = {}
        
        # Initialize with FMCG knowledge
        self._init_fmcg_brands()
        self._init_common_abbreviations()
        
        # Load custom dictionary if provided
        if custom_dict_path and os.path.exists(custom_dict_path):
            self._load_custom_dict(custom_dict_path)
        
        # Load learned mappings
        self._load_learned_mappings()
    
    def _init_fmcg_brands(self):
        """Initialize brand dictionary with FMCG knowledge"""
        
        # Format: abbreviations -> {name, category, manufacturer}
        brands = {
            # BEVERAGES - PepsiCo
            "PEPSI": {"name": "Pepsi", "category": "Beverages", "manufacturer": "PepsiCo"},
            "PEP": {"name": "Pepsi", "category": "Beverages", "manufacturer": "PepsiCo"},
            "MOUNTAIN DEW": {"name": "Mountain Dew", "category": "Beverages", "manufacturer": "PepsiCo"},
            "MTN DEW": {"name": "Mountain Dew", "category": "Beverages", "manufacturer": "PepsiCo"},
            "MTN": {"name": "Mountain", "category": "Beverages", "manufacturer": "PepsiCo"},
            "DEW": {"name": "Dew", "category": "Beverages", "manufacturer": "PepsiCo"},
            "GATORADE": {"name": "Gatorade", "category": "Beverages", "manufacturer": "PepsiCo"},
            "GAT": {"name": "Gatorade", "category": "Beverages", "manufacturer": "PepsiCo"},
            "AQUAFINA": {"name": "Aquafina", "category": "Beverages", "manufacturer": "PepsiCo"},
            "AQF": {"name": "Aquafina", "category": "Beverages", "manufacturer": "PepsiCo"},
            
            # BEVERAGES - Coca-Cola
            "COCA-COLA": {"name": "Coca-Cola", "category": "Beverages", "manufacturer": "The Coca-Cola Company"},
            "COCA COLA": {"name": "Coca-Cola", "category": "Beverages", "manufacturer": "The Coca-Cola Company"},
            "COKE": {"name": "Coca-Cola", "category": "Beverages", "manufacturer": "The Coca-Cola Company"},
            "CC": {"name": "Coca-Cola", "category": "Beverages", "manufacturer": "The Coca-Cola Company"},
            "SPRITE": {"name": "Sprite", "category": "Beverages", "manufacturer": "The Coca-Cola Company"},
            "SPR": {"name": "Sprite", "category": "Beverages", "manufacturer": "The Coca-Cola Company"},
            "FANTA": {"name": "Fanta", "category": "Beverages", "manufacturer": "The Coca-Cola Company"},
            "FNT": {"name": "Fanta", "category": "Beverages", "manufacturer": "The Coca-Cola Company"},
            "DASANI": {"name": "Dasani", "category": "Beverages", "manufacturer": "The Coca-Cola Company"},
            "DAS": {"name": "Dasani", "category": "Beverages", "manufacturer": "The Coca-Cola Company"},
            
            # ORAL CARE - P&G
            "CREST": {"name": "Crest", "category": "Oral Care", "manufacturer": "Procter & Gamble"},
            "CR": {"name": "Crest", "category": "Oral Care", "manufacturer": "Procter & Gamble"},
            "CRST": {"name": "Crest", "category": "Oral Care", "manufacturer": "Procter & Gamble"},
            
            # ORAL CARE - Colgate-Palmolive
            "COLGATE": {"name": "Colgate", "category": "Oral Care", "manufacturer": "Colgate-Palmolive"},
            "CG": {"name": "Colgate", "category": "Oral Care", "manufacturer": "Colgate-Palmolive"},
            "CLG": {"name": "Colgate", "category": "Oral Care", "manufacturer": "Colgate-Palmolive"},
            
            # ORAL CARE - GSK
            "SENSODYNE": {"name": "Sensodyne", "category": "Oral Care", "manufacturer": "GSK"},
            "SN": {"name": "Sensodyne", "category": "Oral Care", "manufacturer": "GSK"},
            "SENS": {"name": "Sensodyne", "category": "Oral Care", "manufacturer": "GSK"},
            
            # ORAL CARE - J&J
            "LISTERINE": {"name": "Listerine", "category": "Oral Care", "manufacturer": "Johnson & Johnson"},
            "LST": {"name": "Listerine", "category": "Oral Care", "manufacturer": "Johnson & Johnson"},
            "LSTR": {"name": "Listerine", "category": "Oral Care", "manufacturer": "Johnson & Johnson"},
            
            # PERSONAL CARE - P&G
            "HEAD & SHOULDERS": {"name": "Head & Shoulders", "category": "Personal Care", "manufacturer": "Procter & Gamble"},
            "HEAD AND SHOULDERS": {"name": "Head & Shoulders", "category": "Personal Care", "manufacturer": "Procter & Gamble"},
            "H&S": {"name": "Head & Shoulders", "category": "Personal Care", "manufacturer": "Procter & Gamble"},
            "HS": {"name": "Head & Shoulders", "category": "Personal Care", "manufacturer": "Procter & Gamble"},
            "PANTENE": {"name": "Pantene", "category": "Personal Care", "manufacturer": "Procter & Gamble"},
            "PAN": {"name": "Pantene", "category": "Personal Care", "manufacturer": "Procter & Gamble"},
            "PANT": {"name": "Pantene", "category": "Personal Care", "manufacturer": "Procter & Gamble"},
            "OLD SPICE": {"name": "Old Spice", "category": "Personal Care", "manufacturer": "Procter & Gamble"},
            "OS": {"name": "Old Spice", "category": "Personal Care", "manufacturer": "Procter & Gamble"},
            "SECRET": {"name": "Secret", "category": "Personal Care", "manufacturer": "Procter & Gamble"},
            "SCR": {"name": "Secret", "category": "Personal Care", "manufacturer": "Procter & Gamble"},
            "SCRT": {"name": "Secret", "category": "Personal Care", "manufacturer": "Procter & Gamble"},
            
            # PERSONAL CARE - Unilever
            "DOVE": {"name": "Dove", "category": "Personal Care", "manufacturer": "Unilever"},
            "DV": {"name": "Dove", "category": "Personal Care", "manufacturer": "Unilever"},
            "DOV": {"name": "Dove", "category": "Personal Care", "manufacturer": "Unilever"},
            "AXE": {"name": "Axe", "category": "Personal Care", "manufacturer": "Unilever"},
            "DEGREE": {"name": "Degree", "category": "Personal Care", "manufacturer": "Unilever"},
            "DEG": {"name": "Degree", "category": "Personal Care", "manufacturer": "Unilever"},
            
            # HOUSEHOLD - P&G
            "TIDE": {"name": "Tide", "category": "Household", "manufacturer": "Procter & Gamble"},
            "TD": {"name": "Tide", "category": "Household", "manufacturer": "Procter & Gamble"},
            "TDE": {"name": "Tide", "category": "Household", "manufacturer": "Procter & Gamble"},
            "GAIN": {"name": "Gain", "category": "Household", "manufacturer": "Procter & Gamble"},
            "GN": {"name": "Gain", "category": "Household", "manufacturer": "Procter & Gamble"},
            "DAWN": {"name": "Dawn", "category": "Household", "manufacturer": "Procter & Gamble"},
            "DWN": {"name": "Dawn", "category": "Household", "manufacturer": "Procter & Gamble"},
            
            # HOUSEHOLD - Colgate-Palmolive
            "PALMOLIVE": {"name": "Palmolive", "category": "Household", "manufacturer": "Colgate-Palmolive"},
            "PLM": {"name": "Palmolive", "category": "Household", "manufacturer": "Colgate-Palmolive"},
            
            # HOUSEHOLD - Henkel
            "PERSIL": {"name": "Persil", "category": "Household", "manufacturer": "Henkel"},
            "PRS": {"name": "Persil", "category": "Household", "manufacturer": "Henkel"},
            
            # SNACKS - PepsiCo/Frito-Lay
            "LAYS": {"name": "Lay's", "category": "Snacks", "manufacturer": "PepsiCo"},
            "LAY'S": {"name": "Lay's", "category": "Snacks", "manufacturer": "PepsiCo"},
            "LAY": {"name": "Lay's", "category": "Snacks", "manufacturer": "PepsiCo"},
            "DORITOS": {"name": "Doritos", "category": "Snacks", "manufacturer": "PepsiCo"},
            "DOR": {"name": "Doritos", "category": "Snacks", "manufacturer": "PepsiCo"},
            "TOSTITOS": {"name": "Tostitos", "category": "Snacks", "manufacturer": "PepsiCo"},
            "TOS": {"name": "Tostitos", "category": "Snacks", "manufacturer": "PepsiCo"},
            
            # SNACKS - Kellogg's
            "PRINGLES": {"name": "Pringles", "category": "Snacks", "manufacturer": "Kellogg's"},
            "PRG": {"name": "Pringles", "category": "Snacks", "manufacturer": "Kellogg's"},
            
            # SNACKS - Mondelez
            "OREO": {"name": "Oreo", "category": "Snacks", "manufacturer": "Mondelez"},
            "ORO": {"name": "Oreo", "category": "Snacks", "manufacturer": "Mondelez"},
            "CHIPS AHOY": {"name": "Chips Ahoy!", "category": "Snacks", "manufacturer": "Mondelez"},
            "CHIPS AHOY!": {"name": "Chips Ahoy!", "category": "Snacks", "manufacturer": "Mondelez"},
            "CHP": {"name": "Chips Ahoy!", "category": "Snacks", "manufacturer": "Mondelez"},
        }
        
        for abbrev, info in brands.items():
            self._brand_dict[abbrev.upper()] = info
    
    def _init_common_abbreviations(self):
        """Initialize common word abbreviations used in retail"""
        
        self._abbreviation_dict = {
            # Product descriptors
            "ORIG": "Original",
            "ORG": "Original",
            "ORGNL": "Original",
            "WHT": "White",
            "WHTN": "Whitening",
            "WHTNG": "Whitening",
            "CLN": "Clean",
            "FRSH": "Fresh",
            "FRS": "Fresh",
            "ADV": "Advanced",
            "ADVNC": "Advanced",
            "ULT": "Ultra",
            "ULTR": "Ultra",
            "GNTL": "Gentle",
            "GNT": "Gentle",
            "RDNT": "Radiant",
            "RAD": "Radiant",
            "PRO": "Pro",
            "PRHLTH": "Pro-Health",
            "PROHLTH": "Pro-Health",
            "TOTL": "Total",
            "TTL": "Total",
            "TOT": "Total",
            "CLNC": "Clinical",
            "CLNCL": "Clinical",
            "DLY": "Daily",
            "MSTR": "Moisture",
            "MOIST": "Moisture",
            "RNWL": "Renewal",
            "RENWL": "Renewal",
            "CLS": "Classic",
            "CLSC": "Classic",
            "CMFRT": "Comfort",
            "COMF": "Comfort",
            "CL": "Cool",
            "RSH": "Rush",
            "MTN SNS": "Motion Sense",
            "ARCT": "Arctic",
            "ARCTC": "Arctic",
            "MNT": "Mint",
            "MINT": "Mint",
            "LMN": "Lemon",
            "LIME": "Lime",
            "ORNG": "Orange",
            "ORN": "Orange",
            "ZRO": "Zero",
            "ZERO": "Zero",
            "SGR": "Sugar",
            "SGAR": "Sugar",
            "FRE": "Free",
            "FREE": "Free",
            "GNTL": "Gentle",
            "PRFD": "Purified",
            "PURE": "Purified",
            "WTR": "Water",
            "2IN1": "2-in-1",
            "2N1": "2-in-1",
            "PROV": "Pro-V",
            "PRV": "Pro-V",
            "SWGR": "Swagger",
            "FJI": "Fiji",
            "APLL": "Apollo",
            "APLO": "Apollo",
            "CMPL": "Complete",
            "COMPLT": "Complete",
            "BBQ": "BBQ",
            "SR CRM": "Sour Cream",
            "SRCM": "Sour Cream",
            "SR": "Sour",
            "CRM": "Cream",
            "ONION": "Onion",
            "ONIN": "Onion",
            "NCH": "Nacho",
            "NCHO": "Nacho",
            "CHS": "Cheese",
            "CHSE": "Cheese",
            "RNCH": "Ranch",
            "RANCH": "Ranch",
            "DBL": "Double",
            "DBLE": "Double",
            "STF": "Stuf",
            "STUF": "Stuf",
            "PLTNM": "Platinum",
            "PLAT": "Platinum",
            "LQD": "Liquid",
            "OXI": "Oxi",
            "PROCLN": "ProClean",
            "PROCLEAN": "ProClean",
            "CODE": "Code",
            "RED": "Red",
            "BLU": "Blue",
            "GRN": "Green",
            "3D": "3D",
            "3DW": "3D White",
        }
    
    def _load_custom_dict(self, path: str):
        """Load custom brand dictionary from JSON file"""
        try:
            with open(path, 'r') as f:
                custom = json.load(f)
                for abbrev, info in custom.get('brands', {}).items():
                    self._brand_dict[abbrev.upper()] = info
                for abbrev, full in custom.get('abbreviations', {}).items():
                    self._abbreviation_dict[abbrev.upper()] = full
        except Exception as e:
            print(f"Warning: Could not load custom dictionary: {e}")
    
    def _load_learned_mappings(self):
        """Load previously learned mappings from file"""
        learned_path = "/app/data/learned_mappings.json"
        if os.path.exists(learned_path):
            try:
                with open(learned_path, 'r') as f:
                    data = json.load(f)
                    self._learned_mappings = data.get('abbreviations', {})
                    # Merge learned brands
                    for abbrev, info in data.get('brands', {}).items():
                        self._brand_dict[abbrev.upper()] = info
            except Exception as e:
                print(f"Warning: Could not load learned mappings: {e}")
    
    def save_learned_mappings(self):
        """Save learned mappings to file for persistence"""
        learned_path = "/app/data/learned_mappings.json"
        os.makedirs(os.path.dirname(learned_path), exist_ok=True)
        try:
            with open(learned_path, 'w') as f:
                json.dump({
                    'abbreviations': self._learned_mappings,
                    'brands': {}  # Could extract learned brands here
                }, f, indent=2)
        except Exception as e:
            print(f"Warning: Could not save learned mappings: {e}")
    
    def lookup_brand(self, text: str) -> Optional[BrandMatch]:
        """
        Look up a brand from text.
        Returns BrandMatch if found, None otherwise.
        """
        text_upper = text.upper().strip()
        
        # Direct lookup
        if text_upper in self._brand_dict:
            info = self._brand_dict[text_upper]
            return BrandMatch(
                original=text,
                canonical_name=info['name'],
                confidence=1.0,
                category=info.get('category'),
                manufacturer=info.get('manufacturer')
            )
        
        # Check learned mappings
        if text_upper in self._learned_mappings:
            learned = self._learned_mappings[text_upper]
            if learned.upper() in self._brand_dict:
                info = self._brand_dict[learned.upper()]
                return BrandMatch(
                    original=text,
                    canonical_name=info['name'],
                    confidence=0.95,  # Slightly lower for learned
                    category=info.get('category'),
                    manufacturer=info.get('manufacturer')
                )
        
        return None
    
    def expand_abbreviation(self, abbrev: str) -> Optional[str]:
        """
        Expand a single abbreviation.
        Returns expanded text if found, None otherwise.
        """
        abbrev_upper = abbrev.upper().strip()
        
        # Check standard abbreviations
        if abbrev_upper in self._abbreviation_dict:
            return self._abbreviation_dict[abbrev_upper]
        
        # Check learned abbreviations
        if abbrev_upper in self._learned_mappings:
            return self._learned_mappings[abbrev_upper]
        
        return None
    
    def learn_abbreviation(self, abbreviation: str, full_text: str):
        """
        Learn a new abbreviation mapping.
        Called when human approves a match in HITL.
        """
        abbrev_upper = abbreviation.upper().strip()
        self._learned_mappings[abbrev_upper] = full_text
        self.save_learned_mappings()
    
    def get_all_brands(self) -> List[str]:
        """Get list of all known brand names"""
        return list(set(info['name'] for info in self._brand_dict.values()))
    
    def get_brand_info(self, brand_name: str) -> Optional[dict]:
        """Get full info for a brand by canonical name"""
        for info in self._brand_dict.values():
            if info['name'].lower() == brand_name.lower():
                return info
        return None
