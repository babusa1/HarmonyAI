# HarmonizeIQ - Complete Demo Guide

## 🎯 What is HarmonizeIQ?

HarmonizeIQ solves the **product data harmonization problem** for FMCG companies:

**The Problem:**
- You sell "Crest 3D White Radiant Mint 4.1oz" 
- Walmart calls it: `CR 3DW RDNT MNT 4.1OZ`
- Target calls it: `Crest 3D White Radiant Mint 4.1 oz`
- Kroger calls it: `KR-5621 CREST 3D WHITE RADIANT MINT TOOTHPASTE`

**Without harmonization:** You can't track your sales across retailers!

---

## 📊 Data Flow Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                         DATA INGESTION                               │
├─────────────────┬─────────────────────┬─────────────────────────────┤
│                 │                     │                             │
│  1. MASTER      │  2. RETAILER DATA   │  3. SALES DATA              │
│  CATALOG        │  (messy SKUs)       │  (transactions)             │
│  (Golden Record)│                     │                             │
│                 │                     │                             │
│  Your official  │  Walmart, Target,   │  Units sold, revenue        │
│  product names  │  Kroger uploads     │  by retailer SKU            │
│                 │                     │                             │
└────────┬────────┴─────────┬───────────┴──────────────┬──────────────┘
         │                  │                          │
         ▼                  ▼                          │
┌─────────────────────────────────────────────────────────────────────┐
│                      NLP PROCESSING                                  │
│                                                                      │
│  • Generate embeddings (AI vectors) for each product description    │
│  • Find semantic matches between retailer SKUs and master catalog   │
│  • Calculate confidence scores (0-100%)                             │
└─────────────────────────────────────┬───────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      EQUIVALENCE MAP                                 │
│                                                                      │
│  Links: WMT-001234 ──(95% confidence)──► Crest 3D White 4.1oz       │
│         TGT-87001  ──(98% confidence)──► Crest 3D White 4.1oz       │
│         KR-5621    ──(92% confidence)──► Crest 3D White 4.1oz       │
└─────────────────────────────────────┬───────────────────────────────┘
                                      │
         ┌────────────────────────────┼────────────────────────────┐
         │                            │                            │
         ▼                            ▼                            ▼
┌─────────────────┐       ┌─────────────────────┐       ┌─────────────────┐
│   HITL REVIEW   │       │   UNIFIED CATALOG   │       │   ANALYTICS     │
│                 │       │                     │       │                 │
│  Review matches │       │  See all products   │       │  Cross-retailer │
│  <95% confidence│       │  across retailers   │       │  sales trends   │
└─────────────────┘       └─────────────────────┘       └─────────────────┘
```

---

## 🚀 Demo Workflow (Step by Step)

### Step 1: Upload Master Catalog (Golden Record)
**File:** `master_catalog.csv`
**What it contains:** Your official product names, GTINs, brands, categories, sizes

This is the "source of truth" - the canonical names you want ALL retailer data mapped to.

### Step 2: Upload Retailer Data
**Files:** `walmart_retailer_data.csv`, `target_retailer_data.csv`, `kroger_retailer_data.csv`
**What it contains:** Messy retailer SKUs and descriptions

Select the retailer (Walmart, Target, Kroger) from dropdown, then upload their data.

### Step 3: Click "Start Processing"
**What happens:**
1. NLP service generates AI embeddings for each description
2. System finds best matches from master catalog
3. Creates equivalence mappings with confidence scores
4. High confidence (≥95%) = auto-confirmed
5. Lower confidence = needs human review

### Step 4: Review Matches (HITL)
Go to **HITL Review** page to:
- Approve correct matches
- Reject incorrect matches
- Manually assign correct products

### Step 5: View Unified Catalog
Go to **Catalog** page to see:
- All products with retailer coverage
- Which retailers carry which products

### Step 6: Upload Sales Data (Optional)
**File:** `walmart_sales.csv`
After mapping is done, upload sales transactions to enable analytics.

### Step 7: View Analytics
Go to **Dashboard** / **Analytics** to see:
- Cross-retailer sales comparison
- Market share by category
- Price benchmarking

---

## 📁 Demo Files Summary

| File | Upload Section | Purpose |
|------|----------------|---------|
| `master_catalog.csv` | Manufacturer Catalog | Your official product names (Golden Record) |
| `walmart_retailer_data.csv` | Retailer Data (select Walmart) | Messy Walmart SKU data |
| `target_retailer_data.csv` | Retailer Data (select Target) | Messy Target SKU data |
| `kroger_retailer_data.csv` | Retailer Data (select Kroger) | Messy Kroger SKU data |
| `walmart_sales.csv` | Sales Transactions | Sales data for analytics |

---

## 🎤 Investor Pitch Script (5 minutes)

### Opening (30 sec)
> "Every FMCG company faces a nightmare: retailers describe products differently. 
> Walmart says 'CR 3DW RDNT MNT' while Target says 'Crest 3D White Radiant Mint'.
> They're the SAME product but companies can't track sales across retailers."

### Demo (3 min)
1. Show the messy data files
2. Upload master catalog
3. Upload Walmart retailer data  
4. Click "Start Processing" - watch AI match products
5. Show the matches with confidence scores
6. Show unified catalog view

### Value Prop (1 min)
> "HarmonizeIQ uses AI to automatically match products with 95%+ accuracy.
> What used to take weeks of manual work now happens in minutes.
> Companies can finally track market share across all retailers."

### Close (30 sec)
> "We're targeting $X billion FMCG data harmonization market.
> Current customers spending $X on manual processes.
> Our AI solution is 10x faster at 1/10th the cost."

---

## 🆘 Troubleshooting

**"Start Processing" not working?**
- Make sure you uploaded retailer data first
- Check that NLP service is running: `docker logs harmonizeiq-nlp`

**No matches found?**
- Upload master catalog first (it needs products to match against)
- Check backend logs: `docker logs harmonizeiq-backend`

**Services not running?**
```powershell
docker-compose ps
docker-compose up -d
```
