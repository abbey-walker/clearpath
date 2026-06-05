# ClearPath — Backend Data Pipeline

AML & KYC risk intelligence engine for crypto exchanges and fintech platforms.

## Architecture

```
src/
├── api/
│   └── server.js              # Express REST API
├── pipeline/
│   ├── orchestrator.js        # Coordinates all layers, assembles final report
│   ├── layers/
│   │   ├── layer1-sanctions.js   # OFAC, UN, EU, HMT via OpenSanctions
│   │   ├── layer2-pep.js         # PEP screening via OpenSanctions + Wikidata
│   │   ├── layer3-adverseMedia.js # NewsAPI, FCA, SEC, Insolvency Register
│   │   ├── layer4-corporate.js   # Companies House, OpenCorporates
│   │   └── layer5-crypto.js      # Etherscan, Blockchair
│   └── resolvers/
│       └── entityResolution.js   # Name matching & confidence scoring
├── scoring/
│   └── scoringEngine.js       # Weighted composite risk score (0–100)
└── utils/
    ├── logger.js              # Winston structured logging
    └── schemas.js             # Zod input validation schemas
tests/
└── pipeline.test.js           # 21 unit tests — all passing
```

## Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Configure environment
cp .env.example .env
# Edit .env and add your API keys (see below)

# 3. Run tests
npm test

# 4. Start the server
npm start         # production
npm run dev       # development with --watch
```

Server runs on `http://localhost:3001`

## API

### Run a check
```
POST /api/checks
Content-Type: application/json

{
  "fullName": "John Smith",
  "dateOfBirth": "1975-03-15",       // recommended — improves accuracy
  "nationality": "GB",                // ISO 3166-1 alpha-2
  "walletAddress": "0xabc...",        // optional — triggers Layer 5
  "checkLayers": ["sanctions", "pep", "adverseMedia", "corporate", "crypto"]
}
```

**Response:** Full risk report with:
- `riskLevel`: LOW / MEDIUM / HIGH
- `score`: 0–100
- `hardStop`: true if sanctions match found
- `explanation`: plain-English explanation
- `recommendations`: list of compliance actions
- `layers`: full results from each layer

### Other endpoints
```
GET  /health               # Server health check
GET  /api/status/sources   # API key configuration status
```

## API Keys

| Key | Source | Tier |
|-----|--------|------|
| `OPEN_SANCTIONS_API_KEY` | opensanctions.org | Free for non-commercial; paid for SaaS |
| `NEWS_API_KEY` | newsapi.org | Free: 100 req/day |
| `COMPANIES_HOUSE_API_KEY` | developer.company-information.service.gov.uk | Free |
| `OPENCORPORATES_API_KEY` | opencorporates.com | Free tier available |
| `ETHERSCAN_API_KEY` | etherscan.io | Free: 5 req/sec |
| `BLOCKCHAIR_API_KEY` | blockchair.com | Free tier available |

The pipeline runs without any API keys (public/unauthenticated mode) but will be rate-limited.
**For production**, all keys are required.

## Scoring Model

| Signal | Score Impact |
|--------|-------------|
| Sanctions match | HARD STOP → automatic HIGH |
| PEP confirmed (Tier 1) | +35–40 pts |
| PEP confirmed (Tier 2) | +20–25 pts |
| Critical adverse media | +15–30 pts |
| Significant adverse media | +8–20 pts |
| Disqualified director | +25 pts |
| High-risk jurisdiction (corporate) | +5–15 pts |
| Crypto mixer exposure | +35 pts |
| Crypto sanctioned counterparty | +40 pts |

**Risk bands:** LOW: 0–30 · MEDIUM: 31–60 · HIGH: 61–100

## Phase 2 — Coming Next
- Layer 6: OSINT social media (Reddit, Telegram, Twitter/X)
- Continuous monitoring (re-screen on cron)
- PDF report generation
- Database persistence (PostgreSQL)
- Authentication & multi-tenant support

## Legal

This software is for compliance decision-support only. Results do not constitute legal advice. 
Users are responsible for all compliance decisions. See disclaimer in report `meta.disclaimer`.
