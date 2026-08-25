# Token Insight & Analytics API

A complete, production-grade backend service built for cryptocurrency analytics, combining **CoinGecko Market Data + Pluggable AI Insights** with **HyperLiquid Wallet Daily PnL Tracking**.

---

## Features

- **Task 1 — Token Insight API** (`POST /api/token/:id/insight`):
  - Fetches token metadata and real-time market metrics from CoinGecko.
  - Generates AI market analysis (`reasoning` + `sentiment`) using pluggable AI providers (OpenAI `gpt-4o-mini`, Hugging Face, or local Llama.cpp).
  - Retries malformed AI responses once and gracefully falls back to deterministic rule-based analysis if keys are missing or provider fails.
  - Strict JSON validation ensuring exact output shape specs.

- **Task 2 — HyperLiquid Wallet Daily PnL API** (`GET /api/hyperliquid/:wallet/pnl`):
  - Fetches historical user fills, funding payments, fees, and open position state from HyperLiquid's public API.
  - Computes daily `realized_pnl_usd`, `unrealized_pnl_usd`, `fees_usd`, `funding_usd`, `net_pnl_usd`, and running `equity_usd`.
  - Fills empty days with zeros seamlessly without server crashes.

- **DevOps & Architecture**:
  - Clean TypeScript codebase with modular layer structure (`controllers/`, `services/`, `middleware/`, `utils/`).
  - Exponential backoff retry logic for external APIs (CoinGecko & HyperLiquid) with rate-limit (429) handling.
  - Fully Dockerized setup with multi-stage `Dockerfile` and `docker-compose.yml`.
  - Comprehensive unit test suite with Jest testing core PnL calculator logic and AI fallback mechanisms.

---

## Tech Stack

- **Runtime**: Node.js v20+ with TypeScript
- **Framework**: Express.js
- **HTTP Client**: Axios with retry wrappers
- **Configuration**: Dotenv
- **Testing**: Jest + Supertest (`ts-jest`)
- **Containerization**: Docker & Docker Compose

---

## Project Structure

```
.
├── src/
│   ├── config/
│   │   └── env.ts                 # Environment configuration loader
│   ├── controllers/
│   │   ├── token.controller.ts    # Token insight route controller
│   │   └── hyperliquid.controller.ts # HyperLiquid PnL route controller
│   ├── middleware/
│   │   ├── errorHandler.ts        # Centralized Express error handler
│   │   └── validate.middleware.ts # Input validation middleware
│   ├── routes/
│   │   ├── token.routes.ts        # Token router
│   │   ├── hyperliquid.routes.ts  # HyperLiquid router
│   │   └── index.ts               # Main router index
│   ├── services/
│   │   ├── ai/
│   │   │   ├── ai.interface.ts    # AI Provider interface
│   │   │   ├── openai.provider.ts # OpenAI GPT provider implementation
│   │   │   ├── huggingface.provider.ts # HuggingFace provider implementation
│   │   │   ├── llamacpp.provider.ts    # Local Llama.cpp provider implementation
│   │   │   └── ai.service.ts      # AI selector, JSON parser, retry & fallback engine
│   │   ├── coingecko.service.ts   # CoinGecko REST client with retries
│   │   ├── hyperliquid.service.ts # HyperLiquid public info REST client
│   │   └── pnl.calculator.ts     # Pure PnL calculation engine
│   ├── utils/
│   │   ├── dateUtils.ts           # Date manipulation & range utilities
│   │   └── retry.ts               # Exponential backoff retry helper
│   ├── app.ts                     # Express app setup
│   └── server.ts                  # Server entry point
├── tests/
│   ├── unit/
│   │   ├── pnl.calculator.test.ts # Unit tests for pure PnL calculation engine
│   │   └── ai.service.test.ts     # Unit tests for AI service & fallback
│   └── integration/
│       └── api.test.ts           # Integration tests for Express routes
├── .env.example
├── .env
├── Dockerfile
├── docker-compose.yml
├── jest.config.js
├── package.json
├── postman_collection.json
├── tsconfig.json
└── README.md
```

---

## Getting Started

### 1. Local Installation

```bash
# Install dependencies
npm install

# Create environment file from template
cp .env.example .env
```

### 2. Configure Environment Variables

Edit `.env` to configure server port and AI provider credentials:

```env
PORT=3000
NODE_ENV=development

# AI Provider selection: "openai" | "huggingface" | "llamacpp"
AI_PROVIDER=openai

# OpenAI settings
OPENAI_API_KEY=your_openai_api_key_here
OPENAI_MODEL=gpt-4o-mini
```

> **Note on AI Fallback:** If `OPENAI_API_KEY` is not provided or the AI provider fails, the API will smoothly transition to a safe rule-based fallback without throwing errors or crashing.

### 3. Run Development Server

```bash
npm run dev
```

The server will be available at `http://localhost:3000`.

### 4. Run Unit & Integration Tests

```bash
npm test
```

---

## Docker Support

Run the application inside containerized Docker environment:

```bash
# Build and start container in foreground
docker-compose up --build

# Or start in detached mode
docker-compose up -d --build
```

Test health check endpoint:
```bash
curl http://localhost:3000/health
```

---

## AI Provider Configuration Guide

The service supports a **Pluggable AI Architecture**. You can easily switch AI providers by changing `AI_PROVIDER` in your `.env` file:

### Option A: OpenAI (Default)
```env
AI_PROVIDER=openai
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4o-mini
```

### Option B: Hugging Face
```env
AI_PROVIDER=huggingface
HUGGINGFACE_API_KEY=hf_...
HUGGINGFACE_MODEL=mistralai/Mixtral-8x7B-Instruct-v0.1
```

### Option C: Local Llama.cpp Endpoint
```env
AI_PROVIDER=llamacpp
LLAMACPP_URL=http://localhost:8080/v1/chat/completions
```

---

## API Documentation & Example Curl Requests

### 1. Token Insight API

- **Endpoint**: `POST /api/token/:id/insight`
- **Headers**: `Content-Type: application/json`
- **Request Body (Optional)**:
  ```json
  {
    "vs_currency": "usd",
    "history_days": 30
  }
  ```

#### Example Curl:
```bash
curl -X POST http://localhost:3000/api/token/chainlink/insight \
  -H "Content-Type: application/json" \
  -d '{"vs_currency": "usd", "history_days": 30}'
```

#### Example Response (200 OK):
```json
{
  "source": "coingecko",
  "token": {
    "id": "chainlink",
    "symbol": "link",
    "name": "Chainlink",
    "market_data": {
      "current_price_usd": 7.23,
      "market_cap_usd": 3500000000,
      "total_volume_usd": 120000000,
      "price_change_percentage_24h": -1.2
    }
  },
  "insight": {
    "reasoning": "Chainlink shows slight consolidation with healthy market volume.",
    "sentiment": "Neutral"
  },
  "model": {
    "provider": "openai",
    "model": "gpt-4o-mini"
  }
}
```

---

### 2. HyperLiquid Wallet Daily PnL API

- **Endpoint**: `GET /api/hyperliquid/:wallet/pnl?start=YYYY-MM-DD&end=YYYY-MM-DD`

#### Example Curl:
```bash
curl "http://localhost:3000/api/hyperliquid/0x0000000000000000000000000000000000000000/pnl?start=2025-08-01&end=2025-08-03"
```

#### Example Response (200 OK):
```json
{
  "wallet": "0x0000000000000000000000000000000000000000",
  "start": "2025-08-01",
  "end": "2025-08-03",
  "daily": [
    {
      "date": "2025-08-01",
      "realized_pnl_usd": 120.5,
      "unrealized_pnl_usd": -15.3,
      "fees_usd": 2.1,
      "funding_usd": -0.5,
      "net_pnl_usd": 102.6,
      "equity_usd": 10102.6
    },
    {
      "date": "2025-08-02",
      "realized_pnl_usd": 0,
      "unrealized_pnl_usd": 0,
      "fees_usd": 0,
      "funding_usd": 0,
      "net_pnl_usd": 0,
      "equity_usd": 10102.6
    },
    {
      "date": "2025-08-03",
      "realized_pnl_usd": 0,
      "unrealized_pnl_usd": 0,
      "fees_usd": 0,
      "funding_usd": 0,
      "net_pnl_usd": 0,
      "equity_usd": 10102.6
    }
  ],
  "summary": {
    "total_realized_usd": 120.5,
    "total_unrealized_usd": 0,
    "total_fees_usd": 2.1,
    "total_funding_usd": -0.5,
    "net_pnl_usd": 102.6
  },
  "diagnostics": {
    "data_source": "hyperliquid_api",
    "last_api_call": "2026-08-25T03:34:00.000Z",
    "notes": "PnL calculated using daily close prices"
  }
}
```

---

## Postman Collection

Import `postman_collection.json` into Postman to quickly test all endpoints with pre-configured request payloads and saved response examples.

---

## Deliverables Checklist

- [x] Express server in TypeScript with both required endpoints
- [x] `.env.example` provided (no secret keys hardcoded)
- [x] Multi-stage `Dockerfile` and `docker-compose.yml`
- [x] Pluggable AI provider configuration documentation
- [x] Postman collection (`postman_collection.json`)
- [x] Jest Unit tests for PnL business logic and AI fallback
- [x] Graceful error handling for CoinGecko 404, rate limits (429), and invalid wallet input
