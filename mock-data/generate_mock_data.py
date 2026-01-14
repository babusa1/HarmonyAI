"""
HarmonizeIQ Mock Data Generator
================================
Generates realistic FMCG product data for demonstration purposes.

This creates:
- 500 Manufacturer Catalog products (Golden Record)
- 2,500 Retailer SKU variations (messy descriptions)
- 50,000 Sales transactions across 12 months

Categories covered:
- Oral Care (Toothpaste, Mouthwash, Toothbrushes)
- Beverages (Soda, Water, Juice)
- Personal Care (Shampoo, Body Wash, Deodorant)
- Household (Detergent, Cleaning Products)
- Snacks (Chips, Cookies, Crackers)
"""

import json
import random
import uuid
from datetime import datetime, timedelta
from typing import List, Dict, Any
import csv
import os

# Seed for reproducibility
random.seed(42)

# ============================================
# PRODUCT DATA DEFINITIONS
# ============================================

MANUFACTURERS = {
    "P&G": ["Procter & Gamble", "P&G", "Procter and Gamble"],
    "Unilever": ["Unilever", "UL"],
    "Nestle": ["Nestle", "Nestlé", "NESTLE"],
    "PepsiCo": ["PepsiCo", "Pepsi Co", "PEPSICO"],
    "Coca-Cola": ["Coca-Cola Company", "Coca Cola", "TCCC"],
    "Colgate-Palmolive": ["Colgate-Palmolive", "Colgate Palmolive", "CP"],
    "Kellogg's": ["Kellogg's", "Kelloggs", "KELLOGG"],
    "General Mills": ["General Mills", "Gen Mills", "GM"],
    "Johnson & Johnson": ["Johnson & Johnson", "J&J", "JNJ"],
    "Mondelez": ["Mondelez", "Mondelēz", "MDLZ"]
}

CATEGORIES = {
    "oral_care": {
        "name": "Oral Care",
        "subcategories": ["Toothpaste", "Mouthwash", "Toothbrush", "Dental Floss"]
    },
    "beverages": {
        "name": "Beverages",
        "subcategories": ["Carbonated Soft Drinks", "Bottled Water", "Juice", "Sports Drinks"]
    },
    "personal_care": {
        "name": "Personal Care",
        "subcategories": ["Shampoo", "Conditioner", "Body Wash", "Deodorant", "Soap"]
    },
    "household": {
        "name": "Household",
        "subcategories": ["Laundry Detergent", "Dish Soap", "All-Purpose Cleaner", "Paper Towels"]
    },
    "snacks": {
        "name": "Snacks",
        "subcategories": ["Chips", "Cookies", "Crackers", "Chocolate"]
    }
}

# Detailed product definitions for each category
PRODUCTS = {
    "oral_care": [
        # Crest (P&G)
        {"brand": "Crest", "manufacturer": "P&G", "line": "3D White", "variants": ["Radiant Mint", "Arctic Fresh", "Brilliance", "Glamorous White"], "sizes_oz": [4.1, 4.8, 5.4, 6.4], "is_competitor": False},
        {"brand": "Crest", "manufacturer": "P&G", "line": "Pro-Health", "variants": ["Clean Mint", "Gum Protection", "Sensitivity"], "sizes_oz": [4.0, 4.6, 6.0], "is_competitor": False},
        {"brand": "Crest", "manufacturer": "P&G", "line": "Complete", "variants": ["Whitening + Scope", "Extra Whitening", "Deep Clean"], "sizes_oz": [5.4, 6.2], "is_competitor": False},
        # Colgate (Competitor)
        {"brand": "Colgate", "manufacturer": "Colgate-Palmolive", "line": "Total", "variants": ["Whitening", "Fresh Stripe", "Advanced Clean", "Gum Health"], "sizes_oz": [4.8, 5.1, 6.0], "is_competitor": True},
        {"brand": "Colgate", "manufacturer": "Colgate-Palmolive", "line": "Optic White", "variants": ["Advanced", "Stain Fighter", "Renewal"], "sizes_oz": [3.0, 4.2, 5.0], "is_competitor": True},
        {"brand": "Colgate", "manufacturer": "Colgate-Palmolive", "line": "Max Fresh", "variants": ["Cool Mint", "Clean Mint", "Knockout"], "sizes_oz": [6.0, 6.3], "is_competitor": True},
        # Sensodyne (GSK - Competitor)
        {"brand": "Sensodyne", "manufacturer": "GSK", "line": "Pronamel", "variants": ["Gentle Whitening", "Daily Protection", "Intensive Enamel"], "sizes_oz": [4.0, 4.8], "is_competitor": True},
        # Oral-B (P&G)
        {"brand": "Oral-B", "manufacturer": "P&G", "line": "Gum Care", "variants": ["Mint", "Fresh Mint"], "sizes_oz": [4.1, 4.7], "is_competitor": False},
        # Mouthwash
        {"brand": "Listerine", "manufacturer": "Johnson & Johnson", "line": "Total Care", "variants": ["Fresh Mint", "Zero Alcohol", "Whitening"], "sizes_ml": [500, 1000, 1500], "type": "mouthwash", "is_competitor": True},
        {"brand": "Crest", "manufacturer": "P&G", "line": "Pro-Health", "variants": ["Multi-Protection", "Advanced"], "sizes_ml": [500, 1000], "type": "mouthwash", "is_competitor": False},
    ],
    "beverages": [
        # Pepsi (PepsiCo)
        {"brand": "Pepsi", "manufacturer": "PepsiCo", "line": "", "variants": ["Original", "Zero Sugar", "Wild Cherry", "Mango"], "sizes_ml": [355, 500, 591, 2000], "type": "soda", "is_competitor": False},
        {"brand": "Mountain Dew", "manufacturer": "PepsiCo", "line": "", "variants": ["Original", "Code Red", "Voltage", "Zero Sugar"], "sizes_ml": [355, 500, 591, 2000], "type": "soda", "is_competitor": False},
        {"brand": "Gatorade", "manufacturer": "PepsiCo", "line": "", "variants": ["Lemon Lime", "Orange", "Fruit Punch", "Cool Blue"], "sizes_ml": [355, 591, 946, 1000], "type": "sports_drink", "is_competitor": False},
        # Coca-Cola (Competitor)
        {"brand": "Coca-Cola", "manufacturer": "Coca-Cola", "line": "", "variants": ["Original", "Zero Sugar", "Cherry", "Vanilla"], "sizes_ml": [355, 500, 591, 2000], "type": "soda", "is_competitor": True},
        {"brand": "Sprite", "manufacturer": "Coca-Cola", "line": "", "variants": ["Original", "Zero Sugar", "Cherry"], "sizes_ml": [355, 500, 591, 2000], "type": "soda", "is_competitor": True},
        {"brand": "Fanta", "manufacturer": "Coca-Cola", "line": "", "variants": ["Orange", "Grape", "Strawberry", "Pineapple"], "sizes_ml": [355, 500, 591, 2000], "type": "soda", "is_competitor": True},
        # Water
        {"brand": "Aquafina", "manufacturer": "PepsiCo", "line": "", "variants": ["Pure Water", "Sparkling"], "sizes_ml": [500, 591, 1000, 1500], "type": "water", "is_competitor": False},
        {"brand": "Dasani", "manufacturer": "Coca-Cola", "line": "", "variants": ["Purified", "Sparkling", "Lemon"], "sizes_ml": [500, 591, 1000, 1500], "type": "water", "is_competitor": True},
    ],
    "personal_care": [
        # Head & Shoulders (P&G)
        {"brand": "Head & Shoulders", "manufacturer": "P&G", "line": "Classic Clean", "variants": ["Original", "2-in-1", "Dry Scalp Care"], "sizes_ml": [250, 400, 700, 1000], "type": "shampoo", "is_competitor": False},
        {"brand": "Head & Shoulders", "manufacturer": "P&G", "line": "Clinical", "variants": ["Strength", "Dandruff Defense"], "sizes_ml": [250, 400], "type": "shampoo", "is_competitor": False},
        # Pantene (P&G)
        {"brand": "Pantene", "manufacturer": "P&G", "line": "Pro-V", "variants": ["Daily Moisture Renewal", "Sheer Volume", "Color Preserve"], "sizes_ml": [250, 400, 750], "type": "shampoo", "is_competitor": False},
        # Dove (Unilever - Competitor)
        {"brand": "Dove", "manufacturer": "Unilever", "line": "", "variants": ["Daily Moisture", "Intensive Repair", "Oxygen Moisture"], "sizes_ml": [250, 355, 400, 750], "type": "shampoo", "is_competitor": True},
        # Body Wash
        {"brand": "Old Spice", "manufacturer": "P&G", "line": "", "variants": ["Swagger", "Fiji", "Bearglove", "Pure Sport"], "sizes_ml": [473, 532, 650, 887], "type": "body_wash", "is_competitor": False},
        {"brand": "Dove Men+Care", "manufacturer": "Unilever", "line": "", "variants": ["Clean Comfort", "Extra Fresh", "Sport Care"], "sizes_ml": [400, 532, 695], "type": "body_wash", "is_competitor": True},
        {"brand": "Axe", "manufacturer": "Unilever", "line": "", "variants": ["Apollo", "Phoenix", "Dark Temptation"], "sizes_ml": [400, 473], "type": "body_wash", "is_competitor": True},
        # Deodorant
        {"brand": "Secret", "manufacturer": "P&G", "line": "Clinical", "variants": ["Completely Clean", "Light & Fresh", "Powder Fresh"], "sizes_oz": [1.6, 2.6, 2.7], "type": "deodorant", "is_competitor": False},
        {"brand": "Degree", "manufacturer": "Unilever", "line": "Motion Sense", "variants": ["Cool Rush", "Sport Defense", "Extreme Blast"], "sizes_oz": [2.6, 2.7, 3.8], "type": "deodorant", "is_competitor": True},
    ],
    "household": [
        # Tide (P&G)
        {"brand": "Tide", "manufacturer": "P&G", "line": "", "variants": ["Original", "Free & Gentle", "Plus Febreze", "PODS"], "sizes_oz": [46, 92, 138, 150], "type": "detergent", "is_competitor": False},
        {"brand": "Tide", "manufacturer": "P&G", "line": "Ultra Oxi", "variants": ["Liquid", "PODS"], "sizes_oz": [59, 92], "type": "detergent", "is_competitor": False},
        # Gain (P&G)
        {"brand": "Gain", "manufacturer": "P&G", "line": "", "variants": ["Original", "Moonlight Breeze", "Island Fresh"], "sizes_oz": [46, 92, 154], "type": "detergent", "is_competitor": False},
        # Persil (Henkel - Competitor)
        {"brand": "Persil", "manufacturer": "Henkel", "line": "ProClean", "variants": ["Original", "Sensitive Skin", "Stain Fighter"], "sizes_oz": [40, 100, 150], "type": "detergent", "is_competitor": True},
        # All (Unilever - Competitor)
        {"brand": "All", "manufacturer": "Unilever", "line": "", "variants": ["Free Clear", "Stainlifter", "Fresh Clean"], "sizes_oz": [36, 88, 141], "type": "detergent", "is_competitor": True},
        # Dawn (P&G) Dish Soap
        {"brand": "Dawn", "manufacturer": "P&G", "line": "Ultra", "variants": ["Original", "Antibacterial", "Platinum"], "sizes_oz": [16.2, 24, 38], "type": "dish_soap", "is_competitor": False},
        {"brand": "Palmolive", "manufacturer": "Colgate-Palmolive", "line": "Ultra", "variants": ["Original", "Oxy Plus", "Soft Touch"], "sizes_oz": [20, 32.5, 46], "type": "dish_soap", "is_competitor": True},
    ],
    "snacks": [
        # Lay's (PepsiCo/Frito-Lay)
        {"brand": "Lay's", "manufacturer": "PepsiCo", "line": "", "variants": ["Classic", "Sour Cream & Onion", "BBQ", "Salt & Vinegar", "Cheddar"], "sizes_oz": [1.0, 2.625, 7.75, 10.0, 13.0], "type": "chips", "is_competitor": False},
        {"brand": "Doritos", "manufacturer": "PepsiCo", "line": "", "variants": ["Nacho Cheese", "Cool Ranch", "Spicy Nacho", "Flamin Hot"], "sizes_oz": [1.0, 2.75, 9.25, 11.0, 14.5], "type": "chips", "is_competitor": False},
        {"brand": "Tostitos", "manufacturer": "PepsiCo", "line": "", "variants": ["Original", "Scoops", "Hint of Lime", "Cantina"], "sizes_oz": [10.0, 13.0, 15.0], "type": "chips", "is_competitor": False},
        # Pringles (Kellogg's - Competitor)
        {"brand": "Pringles", "manufacturer": "Kellogg's", "line": "", "variants": ["Original", "Sour Cream & Onion", "BBQ", "Cheddar Cheese", "Pizza"], "sizes_oz": [1.3, 2.5, 5.2, 5.5], "type": "chips", "is_competitor": True},
        # Oreo (Mondelez - Competitor)
        {"brand": "Oreo", "manufacturer": "Mondelez", "line": "", "variants": ["Original", "Double Stuf", "Golden", "Mint", "Peanut Butter"], "sizes_oz": [5.25, 10.1, 14.3, 15.35, 20.0], "type": "cookies", "is_competitor": True},
        # Chips Ahoy (Mondelez - Competitor)
        {"brand": "Chips Ahoy!", "manufacturer": "Mondelez", "line": "", "variants": ["Original", "Chewy", "Chunky"], "sizes_oz": [7.0, 11.75, 13.0], "type": "cookies", "is_competitor": True},
    ]
}

RETAILERS = [
    {"code": "WALMART", "name": "Walmart US", "style": "abbreviated"},
    {"code": "TARGET", "name": "Target", "style": "clean"},
    {"code": "KROGER", "name": "Kroger", "style": "internal_code"},
    {"code": "COSTCO", "name": "Costco Wholesale", "style": "descriptive"},
    {"code": "CVS", "name": "CVS Pharmacy", "style": "mixed"},
]

# ============================================
# MESSY DESCRIPTION GENERATORS
# ============================================

def generate_abbreviated(product: Dict) -> str:
    """Generate Walmart-style abbreviated description"""
    brand_abbrev = {
        "Crest": "CR", "Colgate": "CG", "Sensodyne": "SN", "Oral-B": "OB",
        "Pepsi": "PEP", "Coca-Cola": "CC", "Mountain Dew": "MTN", "Sprite": "SPR",
        "Head & Shoulders": "H&S", "Pantene": "PAN", "Dove": "DV", "Old Spice": "OS",
        "Tide": "TD", "Gain": "GN", "Dawn": "DWN", "Persil": "PRS",
        "Lay's": "LAY", "Doritos": "DOR", "Pringles": "PRG", "Oreo": "ORO",
        "Listerine": "LST", "Gatorade": "GAT", "Aquafina": "AQF", "Dasani": "DAS",
        "Secret": "SCR", "Degree": "DEG", "Axe": "AXE", "Fanta": "FNT",
        "Tostitos": "TOS", "Chips Ahoy!": "CHP", "Palmolive": "PLM", "All": "ALL"
    }.get(product["brand"], product["brand"][:3].upper())
    
    line_abbrev = product.get("line", "")[:3].upper() if product.get("line") else ""
    variant_abbrev = product["variant"][:3].upper().replace(" ", "")
    
    size_str = product.get("size_display", "")
    
    parts = [brand_abbrev]
    if line_abbrev:
        parts.append(line_abbrev)
    parts.append(variant_abbrev)
    if size_str:
        # Abbreviate size
        size_str = size_str.replace(" ", "").replace("oz", "OZ").replace("ml", "ML")
        parts.append(size_str)
    
    return " ".join(parts)

def generate_clean(product: Dict) -> str:
    """Generate Target-style clean but slightly different description"""
    brand = product["brand"]
    line = product.get("line", "")
    variant = product["variant"]
    size = product.get("size_display", "")
    
    # Small variations
    if random.random() < 0.3:
        brand = brand.upper()
    if random.random() < 0.2 and line:
        line = line.replace("-", " ")
    
    parts = [brand]
    if line:
        parts.append(line)
    parts.append(variant)
    if size:
        parts.append(size)
    
    return " ".join(parts)

def generate_internal_code(product: Dict) -> str:
    """Generate Kroger-style internal code description"""
    prefix = random.choice(["KR", "SKU", "ITM", ""])
    brand = product["brand"].upper().replace(" ", "").replace("&", "")[:6]
    
    type_code = {
        "toothpaste": "TP", "mouthwash": "MW", "shampoo": "SH", "body_wash": "BW",
        "deodorant": "DEO", "detergent": "DET", "dish_soap": "DS", "chips": "SNK",
        "cookies": "COO", "soda": "BEV", "water": "WTR", "sports_drink": "SPD"
    }.get(product.get("type", ""), "GEN")
    
    variant_code = "".join([w[0] for w in product["variant"].split()])[:4].upper()
    size_code = product.get("size_display", "").replace(" ", "").replace(".", "")
    
    num = random.randint(1000, 9999)
    
    return f"{prefix}{brand}-{type_code}-{variant_code}-{size_code}-{num}".replace("--", "-").strip("-")

def generate_descriptive(product: Dict) -> str:
    """Generate Costco-style verbose description"""
    brand = product["brand"]
    line = product.get("line", "")
    variant = product["variant"]
    size = product.get("size_display", "")
    
    descriptor = random.choice(["Premium", "Value Pack", "Kirkland Signature", "Bulk", ""])
    
    parts = []
    if descriptor and random.random() < 0.4:
        parts.append(descriptor)
    parts.append(brand)
    if line:
        parts.append(line)
    parts.append(variant)
    
    # Add extra descriptive text
    extras = ["Formula", "Enhanced", "Professional", "Multi-Pack", "Family Size", ""]
    extra = random.choice(extras)
    if extra and random.random() < 0.3:
        parts.append(extra)
    
    if size:
        parts.append(f"({size})")
    
    return " ".join(parts)

def generate_mixed(product: Dict) -> str:
    """Generate CVS-style mixed description with some noise"""
    brand = product["brand"]
    variant = product["variant"]
    size = product.get("size_display", "")
    
    # Sometimes add promotional text
    promo = random.choice(["NEW!", "SALE", "BOGO", "CVS Brand", "Gold Emblem", ""])
    
    # Random casing
    if random.random() < 0.3:
        brand = brand.upper()
    if random.random() < 0.2:
        variant = variant.lower()
    
    parts = []
    if promo and random.random() < 0.2:
        parts.append(promo)
    parts.append(brand)
    parts.append(variant)
    if size:
        parts.append(size)
    
    return " ".join(parts)

STYLE_GENERATORS = {
    "abbreviated": generate_abbreviated,
    "clean": generate_clean,
    "internal_code": generate_internal_code,
    "descriptive": generate_descriptive,
    "mixed": generate_mixed,
}

# ============================================
# DATA GENERATION FUNCTIONS
# ============================================

def generate_gtin() -> str:
    """Generate a realistic GTIN/UPC"""
    return "0" + "".join([str(random.randint(0, 9)) for _ in range(12)])

def convert_to_ml(value: float, unit: str) -> float:
    """Convert various units to ml/g for normalization"""
    conversions = {
        "oz": 29.5735,  # fluid oz to ml
        "ml": 1.0,
        "L": 1000.0,
    }
    return round(value * conversions.get(unit, 1.0), 2)

def generate_manufacturer_catalog() -> List[Dict]:
    """Generate the Golden Record manufacturer catalog"""
    catalog = []
    product_id = 0
    
    for category_key, products in PRODUCTS.items():
        category_info = CATEGORIES[category_key]
        
        for product_def in products:
            brand = product_def["brand"]
            manufacturer = product_def["manufacturer"]
            line = product_def.get("line", "")
            variants = product_def["variants"]
            is_competitor = product_def["is_competitor"]
            
            # Determine sizes and unit
            if "sizes_oz" in product_def:
                sizes = product_def["sizes_oz"]
                unit = "oz"
            elif "sizes_ml" in product_def:
                sizes = product_def["sizes_ml"]
                unit = "ml"
            else:
                sizes = [1]
                unit = "ct"
            
            for variant in variants:
                for size in sizes:
                    product_id += 1
                    
                    canonical_name = f"{brand} {line} {variant} {size}{unit}".replace("  ", " ").strip()
                    
                    catalog.append({
                        "id": str(uuid.uuid4()),
                        "gtin": generate_gtin(),
                        "canonical_name": canonical_name,
                        "brand": brand,
                        "manufacturer": manufacturer,
                        "category": category_info["name"],
                        "subcategory": product_def.get("type", category_info["subcategories"][0]),
                        "line": line,
                        "variant": variant,
                        "size_value": size,
                        "size_unit": unit,
                        "size_normalized_ml": convert_to_ml(size, unit),
                        "is_competitor": is_competitor,
                        "attributes": {
                            "variant": variant,
                            "line": line,
                            "type": product_def.get("type", "")
                        }
                    })
    
    return catalog

def generate_retailer_raw_data(catalog: List[Dict]) -> List[Dict]:
    """Generate messy retailer SKU data from the catalog"""
    raw_data = []
    
    for retailer in RETAILERS:
        # Each retailer carries 70-90% of products
        coverage = random.uniform(0.7, 0.9)
        retailer_products = random.sample(catalog, int(len(catalog) * coverage))
        
        for product in retailer_products:
            # Create the product dict for generator
            prod_for_gen = {
                "brand": product["brand"],
                "line": product["line"],
                "variant": product["variant"],
                "type": product.get("subcategory", ""),
                "size_display": f"{product['size_value']}{product['size_unit']}"
            }
            
            # Generate messy description based on retailer style
            generator = STYLE_GENERATORS[retailer["style"]]
            raw_description = generator(prod_for_gen)
            
            raw_data.append({
                "id": str(uuid.uuid4()),
                "source_system_code": retailer["code"],
                "source_system_name": retailer["name"],
                "external_sku": f"{retailer['code']}-{random.randint(100000, 999999)}",
                "raw_description": raw_description,
                "master_product_id": product["id"],  # For creating equivalence map later
                "master_canonical_name": product["canonical_name"],
                "is_competitor": product["is_competitor"],
                "parsed_brand": product["brand"] if random.random() > 0.3 else None,
                "parsed_size_value": product["size_value"] if random.random() > 0.2 else None,
                "parsed_size_unit": product["size_unit"] if random.random() > 0.2 else None,
                "parsed_size_normalized_ml": product["size_normalized_ml"] if random.random() > 0.2 else None,
                "unit_price": round(random.uniform(2.99, 29.99), 2)
            })
    
    return raw_data

def generate_sales_transactions(raw_data: List[Dict], months: int = 12) -> List[Dict]:
    """Generate sales transaction data"""
    transactions = []
    
    # Generate dates for the past N months
    end_date = datetime.now()
    start_date = end_date - timedelta(days=months * 30)
    
    for raw_item in raw_data:
        # Each product gets 3-20 transactions per month
        transactions_per_month = random.randint(3, 20)
        
        for month_offset in range(months):
            month_start = start_date + timedelta(days=month_offset * 30)
            
            for _ in range(transactions_per_month):
                tx_date = month_start + timedelta(days=random.randint(0, 29))
                
                # Units sold varies by product price (inverse relationship)
                base_units = random.randint(10, 500)
                price_factor = 15 / max(raw_item["unit_price"], 1)
                units_sold = int(base_units * price_factor)
                
                # Seasonal adjustment
                month = tx_date.month
                if month in [11, 12]:  # Holiday boost
                    units_sold = int(units_sold * random.uniform(1.2, 1.5))
                elif month in [6, 7, 8] and "beverage" in raw_item.get("source_system_code", "").lower():
                    units_sold = int(units_sold * random.uniform(1.1, 1.3))
                
                revenue = round(units_sold * raw_item["unit_price"], 2)
                
                transactions.append({
                    "id": str(uuid.uuid4()),
                    "raw_id": raw_item["id"],
                    "source_system_code": raw_item["source_system_code"],
                    "transaction_date": tx_date.strftime("%Y-%m-%d"),
                    "units_sold": units_sold,
                    "revenue": revenue,
                    "store_id": f"STORE-{random.randint(1, 500)}",
                    "promotion_flag": random.random() < 0.15
                })
    
    return transactions

def save_to_csv(data: List[Dict], filename: str) -> None:
    """Save data to CSV file"""
    if not data:
        return
    
    os.makedirs(os.path.dirname(filename) if os.path.dirname(filename) else ".", exist_ok=True)
    
    with open(filename, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=data[0].keys())
        writer.writeheader()
        writer.writerows(data)

def save_to_json(data: Any, filename: str) -> None:
    """Save data to JSON file"""
    os.makedirs(os.path.dirname(filename) if os.path.dirname(filename) else ".", exist_ok=True)
    
    with open(filename, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, default=str)

# ============================================
# MAIN EXECUTION
# ============================================

def main():
    print("🚀 HarmonizeIQ Mock Data Generator")
    print("=" * 50)
    
    # Generate manufacturer catalog (Golden Record)
    print("\n📦 Generating Manufacturer Catalog (Golden Record)...")
    catalog = generate_manufacturer_catalog()
    print(f"   Generated {len(catalog)} products")
    
    # Generate retailer raw data
    print("\n🏪 Generating Retailer Raw Data...")
    raw_data = generate_retailer_raw_data(catalog)
    print(f"   Generated {len(raw_data)} retailer SKUs across {len(RETAILERS)} retailers")
    
    # Generate sales transactions
    print("\n💰 Generating Sales Transactions...")
    transactions = generate_sales_transactions(raw_data, months=12)
    print(f"   Generated {len(transactions)} transactions")
    
    # Generate source systems
    source_systems = [
        {"id": str(uuid.uuid4()), "code": r["code"], "name": r["name"], "type": "retailer"}
        for r in RETAILERS
    ]
    
    # Generate categories
    categories_data = [
        {"id": str(uuid.uuid4()), "name": cat["name"], "level": 1}
        for cat in CATEGORIES.values()
    ]
    
    # Generate brands
    brands_seen = set()
    brands_data = []
    for product in catalog:
        if product["brand"] not in brands_seen:
            brands_seen.add(product["brand"])
            brands_data.append({
                "id": str(uuid.uuid4()),
                "name": product["brand"],
                "manufacturer": product["manufacturer"],
                "aliases": json.dumps(MANUFACTURERS.get(product["manufacturer"], []))
            })
    
    # Save all data
    print("\n💾 Saving data files...")
    
    output_dir = os.path.dirname(os.path.abspath(__file__))
    
    save_to_csv(catalog, os.path.join(output_dir, "output", "manufacturer_catalog.csv"))
    save_to_csv(raw_data, os.path.join(output_dir, "output", "retailer_raw_data.csv"))
    save_to_csv(transactions, os.path.join(output_dir, "output", "sales_transactions.csv"))
    save_to_csv(source_systems, os.path.join(output_dir, "output", "source_systems.csv"))
    save_to_csv(categories_data, os.path.join(output_dir, "output", "categories.csv"))
    save_to_csv(brands_data, os.path.join(output_dir, "output", "brands.csv"))
    
    # Also save as JSON for easy loading
    save_to_json({
        "manufacturer_catalog": catalog,
        "retailer_raw_data": raw_data,
        "sales_transactions": transactions[:1000],  # Sample for JSON
        "source_systems": source_systems,
        "categories": categories_data,
        "brands": brands_data,
        "metadata": {
            "generated_at": datetime.now().isoformat(),
            "catalog_count": len(catalog),
            "raw_data_count": len(raw_data),
            "transactions_count": len(transactions),
            "retailers": [r["name"] for r in RETAILERS]
        }
    }, os.path.join(output_dir, "output", "all_data.json"))
    
    print(f"\n✅ Data saved to {os.path.join(output_dir, 'output')}/")
    
    # Print summary
    print("\n" + "=" * 50)
    print("📊 SUMMARY")
    print("=" * 50)
    print(f"   Manufacturer Catalog:  {len(catalog):,} products")
    print(f"   Retailer SKUs:         {len(raw_data):,} items")
    print(f"   Sales Transactions:    {len(transactions):,} records")
    print(f"   Source Systems:        {len(source_systems)} retailers")
    print(f"   Brands:                {len(brands_data)} brands")
    print(f"   Categories:            {len(categories_data)} categories")
    
    # Show sample mappings
    print("\n📋 SAMPLE DATA MAPPINGS")
    print("-" * 50)
    for i, raw in enumerate(random.sample(raw_data, 5)):
        print(f"\n   Retailer ({raw['source_system_code']}): {raw['raw_description']}")
        print(f"   → Master: {raw['master_canonical_name']}")

if __name__ == "__main__":
    main()
