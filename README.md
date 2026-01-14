# HarmonizeIQ 🎯

<div align="center">

![HarmonizeIQ Logo](frontend/public/favicon.svg)

**AI-Powered Product Data Harmonization Platform**

*Transform messy retail data into actionable competitive intelligence*

[![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue?logo=typescript)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-18-61dafb?logo=react)](https://react.dev/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.109-009688?logo=fastapi)](https://fastapi.tiangolo.com/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-336791?logo=postgresql)](https://www.postgresql.org/)
[![Docker](https://img.shields.io/badge/Docker-Ready-2496ED?logo=docker)](https://www.docker.com/)

</div>

---

## 🎯 What is HarmonizeIQ?

HarmonizeIQ solves a **$15-20M problem** in the FMCG/CPG industry: **product data chaos**.

Retailers describe products inconsistently:

| Source | Description |
|--------|-------------|
| Manufacturer | `"Crest 3D White Toothpaste Mint 4.8oz"` |
| Walmart | `"CR TP 3DW MNT 4.8"` |
| Target | `"CREST WHITENING PASTE 136G"` |
| Kroger | `"CREST-TP-WHT-4.8OZ-2847"` |

Our **AI engine automatically maps** these to a **Golden Record**, enabling:

- ✅ Accurate competitor sales benchmarking
- ✅ Demand planning at SKU level  
- ✅ **80%+ cost reduction** vs manual mapping
- ✅ **79x ROI** on harmonization investment

---

## 🚀 Quick Start

### Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) installed
- 8GB RAM available
- 5GB disk space

### Run Locally (One Command!)

```bash
# Clone the repository
git clone https://github.com/YOUR_USERNAME/harmonizeiq.git
cd harmonizeiq

# Start all services
docker-compose up -d

# Wait ~2-3 minutes for first build, then open:
# http://localhost:9000
```

### Port Configuration

| Service | URL |
|---------|-----|
| 🌐 **Frontend** | http://localhost:9000 |
| 🔌 **Backend API** | http://localhost:9001 |
| 🧠 **NLP Service** | http://localhost:9002 |
| 🐘 **PostgreSQL** | localhost:9432 |

---

## 📊 Features

### 1. Dashboard
Real-time KPIs showing products, mappings, and match rates.

### 2. Human-in-the-Loop (HITL) Review
AI suggests matches, humans verify edge cases (70-95% confidence).

### 3. Analytics & Benchmarking
Compare your products vs competitors with rich visualizations.

### 4. Data Upload
Drag-and-drop CSV ingestion for catalogs, retailer data, and sales.

### 5. Catalog Browser
Explore the Golden Record and view mapped retailer SKUs.

---

## 🧠 AI Matching Algorithm

```
┌─────────────────────────────────────────────────────────────┐
│  Final Score = (0.70 × Semantic) + (0.30 × Attribute)       │
├─────────────────────────────────────────────────────────────┤
│  Semantic Score:                                            │
│  • Cosine similarity of embeddings (all-MiniLM-L6-v2)       │
│  • Captures meaning: "Sparkling Water" ≈ "Carbonated H2O"   │
├─────────────────────────────────────────────────────────────┤
│  Attribute Score:                                           │
│  • Brand match (60% weight)                                 │
│  • Size/Volume match (40% weight)                           │
├─────────────────────────────────────────────────────────────┤
│  Confidence Thresholds:                                     │
│  • > 95%: Auto-confirm ✅                                   │
│  • 70-95%: Human review ⚠️                                  │
│  • < 70%: Flag for attention ❓                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    HARMONIZEIQ PLATFORM                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │   Frontend   │  │  Backend API │  │  NLP Engine  │          │
│  │   React 18   │◄─┤  Node.js/TS  │◄─┤   FastAPI    │          │
│  │  Port: 9000  │  │  Port: 9001  │  │  Port: 9002  │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
│         │                 │                 │                   │
│         └────────────────┼─────────────────┘                   │
│                          ▼                                      │
│                  ┌──────────────┐                               │
│                  │  PostgreSQL  │                               │
│                  │  + pgvector  │                               │
│                  │  Port: 9432  │                               │
│                  └──────────────┘                               │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 📁 Project Structure

```
harmonizeiq/
├── frontend/          # React 18 + TypeScript + Tailwind CSS
├── backend/           # Node.js + Express + TypeScript  
├── nlp-service/       # Python + FastAPI + Sentence Transformers
├── database/          # PostgreSQL schemas + migrations
├── mock-data/         # Realistic FMCG data generator
├── aws/               # AWS CloudFormation deployment
├── docs/              # Documentation
│   ├── ARCHITECTURE.md
│   ├── AWS_DEPLOYMENT.md
│   ├── DEVELOPER_GUIDE.md
│   └── PRD.md
├── docker-compose.yml # One-command local deployment
└── README.md          # You are here!
```

---

## 📚 Documentation

| Document | Description |
|----------|-------------|
| [Architecture](docs/ARCHITECTURE.md) | System design & data flow |
| [AWS Deployment](docs/AWS_DEPLOYMENT.md) | Production deployment guide |
| [Developer Guide](docs/DEVELOPER_GUIDE.md) | Setup & contribution guide |
| [PRD](docs/PRD.md) | Product Requirements Document |

---

## 💼 Business Value

| Metric | Value |
|--------|-------|
| Target Market | $1.2T US FMCG Industry |
| Cost Savings | 80%+ vs manual mapping |
| ROI | 79x per SKU-Retailer combination |
| Accuracy | 95%+ automated matching |
| Opportunity | $15-20M one-time + $1M ARR |

---

## 🛣️ Roadmap

- [x] **MVP** - Core matching engine + HITL dashboard
- [ ] **v1.1** - Real-time API integration
- [ ] **v1.2** - Multi-tenant support
- [ ] **v2.0** - ML model retraining from feedback
- [ ] **v3.0** - Service industry expansion

---

## 🤝 Team

| Role | Name |
|------|------|
| Idea Owner & Advisor | Suresh Bharadwaj |
| Product Manager | TBD |
| Tech Architect / AI Engineer | TBD |
| Business Development | TBD |

---

## 📄 License

Proprietary - All Rights Reserved

---

<div align="center">

**Built with ❤️ for the FMCG/CPG Industry**

[View Demo](http://localhost:9000) · [Documentation](docs/) · [Report Issue](https://github.com/YOUR_USERNAME/harmonizeiq/issues)

</div>
