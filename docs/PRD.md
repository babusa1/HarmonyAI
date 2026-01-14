# HarmonizeIQ - Product Requirements Document (PRD)

## Document Information

| Field | Value |
|-------|-------|
| Product Name | HarmonizeIQ |
| Version | 1.0 (MVP) |
| Author | Suresh Bharadwaj |
| Last Updated | January 2026 |
| Status | In Development |

---

## 1. Executive Summary

### 1.1 Vision Statement

HarmonizeIQ is an AI-powered platform that automates the identification, classification, and de-duplication of product data across disparate retail systems. By establishing product equivalence through advanced NLP and semantic matching, HarmonizeIQ enables FMCG/CPG companies to gain accurate competitive intelligence and make data-driven decisions.

### 1.2 Problem Statement

In today's hyper-connected retail environment:

- **Data Chaos**: Retailers use inconsistent product descriptions (e.g., "CR TP BK SDA" vs "Crest Baking Soda Toothpaste")
- **Manual Mapping is Costly**: Manual product matching is error-prone, slow, and expensive
- **Lost Competitive Insight**: Without harmonized data, companies cannot accurately benchmark against competitors
- **Fragmented Demand Planning**: SKU-level demand planning is impossible without unified product data

### 1.3 Solution

A platform that:
1. **Ingests** product data from multiple sources (manufacturers, retailers)
2. **Harmonizes** using AI-driven semantic similarity matching
3. **Enables** human-in-the-loop verification for edge cases
4. **Delivers** unified analytics and competitive benchmarking

### 1.4 Market Opportunity

| Metric | Value |
|--------|-------|
| Total Addressable Market (TAM) | $5,500B Global CPG |
| Serviceable Addressable Market (SAM) | $1,530B US CPG |
| Serviceable Obtainable Market (SOM) | $1,200B (Top FMCG Companies) |
| Estimated One-Time Opportunity | $15-20M |
| Recurring Revenue Potential | $1M+ annually |

---

## 2. Target Users

### 2.1 Primary Users

| Persona | Role | Pain Points | Goals |
|---------|------|-------------|-------|
| **Data Steward** | Maintain product master data | Manual mapping is tedious | Automate matching, reduce errors |
| **Category Manager** | Manage product categories | Can't compare to competitors | Accurate competitive analysis |
| **Demand Planner** | Forecast product demand | Fragmented SKU data | Unified SKU-level insights |

### 2.2 Secondary Users

| Persona | Role | Needs |
|---------|------|-------|
| Chief Data Officer | Data governance | Audit trails, accuracy metrics |
| Sales Director | Revenue optimization | Market share insights |
| IT Administrator | System management | API access, security controls |

---

## 3. Functional Requirements

### 3.1 Data Ingestion (P0 - Must Have)

| ID | Requirement | Description |
|----|-------------|-------------|
| DI-01 | CSV Upload | Support bulk CSV/Excel file uploads |
| DI-02 | Data Validation | Validate uploaded data for required fields |
| DI-03 | Source Tracking | Track which retailer/source data came from |
| DI-04 | Incremental Updates | Support updating existing records |

### 3.2 AI Matching Engine (P0 - Must Have)

| ID | Requirement | Description |
|----|-------------|-------------|
| ME-01 | Semantic Similarity | Calculate text similarity using embeddings |
| ME-02 | Attribute Matching | Match on brand, size, category |
| ME-03 | Confidence Scoring | Generate confidence score (0-1) for matches |
| ME-04 | Batch Processing | Process thousands of SKUs efficiently |
| ME-05 | Top-K Matches | Return top 5 potential matches per SKU |

**Matching Algorithm:**
```
Final Score = (0.70 × Semantic Similarity) + (0.30 × Attribute Match)

Where:
- Semantic Similarity = Cosine(embedding_A, embedding_B)
- Attribute Match = (0.60 × Brand Match) + (0.40 × Size Match)
```

### 3.3 Human-in-the-Loop (HITL) Review (P0 - Must Have)

| ID | Requirement | Description |
|----|-------------|-------------|
| HL-01 | Review Queue | Display pending matches sorted by confidence |
| HL-02 | Side-by-Side View | Show retailer description vs Golden Record |
| HL-03 | Approve Action | One-click approval of suggested match |
| HL-04 | Reject Action | Reject with option to suggest alternative |
| HL-05 | Confidence Display | Show semantic and attribute scores |

**Confidence Thresholds:**
| Range | Action |
|-------|--------|
| ≥ 95% | Auto-confirm (no review needed) |
| 70-95% | Send to HITL review queue |
| < 70% | Flag as potential new product |

### 3.4 Golden Record Management (P0 - Must Have)

| ID | Requirement | Description |
|----|-------------|-------------|
| GR-01 | Product Catalog | Maintain canonical product master |
| GR-02 | GTIN Support | Store UPC/EAN barcodes |
| GR-03 | Brand Hierarchy | Organize products by brand |
| GR-04 | Category Taxonomy | Support category classification |
| GR-05 | Size Normalization | Standardize units (oz→ml, etc.) |

### 3.5 Analytics & Reporting (P1 - Should Have)

| ID | Requirement | Description |
|----|-------------|-------------|
| AR-01 | Dashboard | Overview of KPIs and match rates |
| AR-02 | Sales by Product | Revenue and units for mapped products |
| AR-03 | Competitor Benchmark | Our products vs competitor products |
| AR-04 | Market Share | Share of category by brand |
| AR-05 | Export | Download reports as CSV/Excel |

### 3.6 API Access (P2 - Nice to Have)

| ID | Requirement | Description |
|----|-------------|-------------|
| AP-01 | REST API | Programmatic access to all functions |
| AP-02 | Real-time Matching | API to match single product in real-time |
| AP-03 | Webhook Notifications | Notify external systems of new matches |

---

## 4. Non-Functional Requirements

### 4.1 Performance

| Metric | Requirement |
|--------|-------------|
| Embedding Generation | ≥ 100 products/second |
| API Response Time | < 500ms (p95) |
| Page Load Time | < 2 seconds |
| Batch Processing | 10,000 SKUs in < 5 minutes |

### 4.2 Scalability

| Metric | MVP Target | Scale Target |
|--------|------------|--------------|
| Products in Catalog | 10,000 | 1,000,000 |
| Retailer SKUs | 50,000 | 10,000,000 |
| Concurrent Users | 10 | 100 |
| Monthly Transactions | 100,000 | 10,000,000 |

### 4.3 Reliability

| Metric | Target |
|--------|--------|
| Uptime | 99.5% |
| Data Durability | 99.999% |
| Backup Frequency | Daily |
| Recovery Time Objective (RTO) | 4 hours |

### 4.4 Security

| Requirement | Implementation |
|-------------|----------------|
| Authentication | JWT-based (future) |
| Authorization | Role-Based Access Control |
| Data Encryption | TLS 1.3 in transit, AES-256 at rest |
| Audit Logging | All data changes tracked |

### 4.5 Accuracy

| Metric | Target |
|--------|--------|
| Auto-Match Accuracy | ≥ 95% |
| False Positive Rate | < 2% |
| Human Review Rate | < 20% of total matches |

---

## 5. User Stories

### 5.1 Data Steward Stories

| ID | Story | Acceptance Criteria |
|----|-------|---------------------|
| US-01 | As a data steward, I want to upload a CSV of retailer products so that they can be matched to our catalog | CSV uploads successfully, validation errors displayed |
| US-02 | As a data steward, I want to review AI-suggested matches so that I can verify accuracy | Queue shows pending matches with confidence scores |
| US-03 | As a data steward, I want to approve or reject matches with one click so that I can work efficiently | Approve/reject buttons update status immediately |

### 5.2 Category Manager Stories

| ID | Story | Acceptance Criteria |
|----|-------|---------------------|
| US-04 | As a category manager, I want to see our sales vs competitors so that I can identify market opportunities | Chart shows our revenue vs competitor revenue |
| US-05 | As a category manager, I want to see market share by brand so that I can track competitive position | Pie chart shows share percentages |

### 5.3 Demand Planner Stories

| ID | Story | Acceptance Criteria |
|----|-------|---------------------|
| US-06 | As a demand planner, I want to see sales trends over time so that I can forecast demand | Line chart shows 12-month trend |
| US-07 | As a demand planner, I want to export data to Excel so that I can use it in my planning models | Export button downloads formatted CSV |

---

## 6. Data Model

### 6.1 Core Entities

```
┌─────────────────────┐
│ Manufacturer Catalog│ (Golden Record)
├─────────────────────┤
│ id (PK)             │
│ gtin                │
│ canonical_name      │
│ brand_id (FK)       │
│ category_id (FK)    │
│ size_value          │
│ size_unit           │
│ embedding           │
└─────────────────────┘
         │
         │ 1:N
         ▼
┌─────────────────────┐
│   Equivalence Map   │ (The Bridge)
├─────────────────────┤
│ master_id (FK)      │
│ raw_id (FK)         │
│ semantic_score      │
│ attribute_score     │
│ final_confidence    │
│ status              │
│ is_competitor       │
└─────────────────────┘
         │
         │ N:1
         ▼
┌─────────────────────┐
│  Retailer Data Raw  │ (Messy Input)
├─────────────────────┤
│ id (PK)             │
│ source_system_id    │
│ external_sku        │
│ raw_description     │
│ embedding           │
└─────────────────────┘
```

### 6.2 Mapping Statuses

| Status | Description |
|--------|-------------|
| `pending` | Awaiting human review |
| `auto_confirmed` | Auto-approved (≥95% confidence) |
| `verified` | Human-approved |
| `rejected` | Human-rejected |
| `manual` | Manually created mapping |

---

## 7. Success Metrics

### 7.1 Product Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Match Accuracy | ≥ 95% | Verified matches / Total matches |
| Auto-Confirm Rate | ≥ 80% | Auto-confirmed / Total |
| Time to Match | < 1 min per SKU | Average processing time |
| User Satisfaction | ≥ 4.5/5 | NPS survey |

### 7.2 Business Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Cost Reduction | 80%+ | Manual cost vs platform cost |
| ROI | 79x | Value delivered / Platform cost |
| Time Savings | 90%+ | Manual time vs automated time |

---

## 8. MVP Scope

### 8.1 In Scope (MVP)

- ✅ CSV data upload
- ✅ AI matching with confidence scores
- ✅ HITL review dashboard
- ✅ Product catalog management
- ✅ Basic analytics (sales, benchmark)
- ✅ Docker deployment
- ✅ AWS deployment scripts

### 8.2 Out of Scope (Future)

- ❌ Real-time API integration
- ❌ Multi-tenant support
- ❌ SSO/SAML authentication
- ❌ Custom ML model training
- ❌ Mobile application
- ❌ Webhooks/notifications

---

## 9. Timeline

### 9.1 MVP Roadmap

| Phase | Duration | Deliverables |
|-------|----------|--------------|
| Phase 1 | Week 1-2 | Database schema, backend API |
| Phase 2 | Week 3-4 | NLP service, matching engine |
| Phase 3 | Week 5-6 | Frontend dashboard, HITL workflow |
| Phase 4 | Week 7-8 | Analytics, deployment, polish |

### 9.2 Post-MVP Roadmap

| Version | Target | Features |
|---------|--------|----------|
| v1.1 | Q2 2026 | Real-time API, improved matching |
| v1.2 | Q3 2026 | Multi-tenant, SSO |
| v2.0 | Q4 2026 | ML retraining, advanced analytics |

---

## 10. Risks & Mitigations

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| AI accuracy below target | High | Medium | Human review as fallback |
| Data quality issues | Medium | High | Validation and cleaning |
| Scaling bottlenecks | Medium | Medium | Cloud-native architecture |
| Competitor launches similar | High | Low | First-mover advantage |

---

## 11. Open Questions

1. **Pricing Model**: Per-SKU, per-retailer, or subscription?
2. **Data Ownership**: Who owns the harmonized data?
3. **Integration**: Priority integrations (SAP, Salesforce, etc.)?
4. **Languages**: Multi-language support needed?

---

## 12. Appendix

### 12.1 Glossary

| Term | Definition |
|------|------------|
| Golden Record | The authoritative, canonical product master |
| HITL | Human-in-the-Loop - human verification of AI decisions |
| Embedding | Numerical vector representation of text |
| Semantic Similarity | Meaning-based similarity (not just text matching) |
| SKU | Stock Keeping Unit - unique product identifier |
| GTIN | Global Trade Item Number (UPC/EAN barcode) |

### 12.2 References

- [Sentence Transformers](https://www.sbert.net/)
- [pgvector](https://github.com/pgvector/pgvector)
- [FMCG Industry Report](https://example.com)

---

*Document Version: 1.0*  
*Status: Approved for MVP Development*  
*Last Updated: January 2026*
